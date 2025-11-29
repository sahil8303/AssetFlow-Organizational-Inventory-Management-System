const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const sqlite3 = require('sqlite3').verbose();
const app = express();
// OLD: const PORT = 3000;
const PORT = process.env.PORT || 3000; // NEW: Uses Cloud Port OR 3000 locally
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 📧 EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        // We will set these "variables" in the Render Dashboard later!
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS
    }
});

// --- 🗄️ SQLITE DATABASE SETUP ---
// Connects to a file named 'assetflow.db'. If it doesn't exist, it creates it.
const db = new sqlite3.Database('./assetflow.db', (err) => {
    if (err) console.error("Database Error:", err.message);
    else console.log("✅ Connected to SQLite Database.");
});

// Initialize Tables (Runs only once)
db.serialize(() => {
    // 1. Inventory Table
    db.run(`CREATE TABLE IF NOT EXISTS inventory (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT,
        category TEXT,
        qty INTEGER
    )`);

    // 2. Requests Table
    db.run(`CREATE TABLE IF NOT EXISTS requests (
        requestId INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId INTEGER,
        itemName TEXT,
        studentName TEXT,
        regNo TEXT,
        returnDate TEXT,
        status TEXT,
        requestDate TEXT
    )`);

    // 3. Active Loans Table
    db.run(`CREATE TABLE IF NOT EXISTS active_loans (
        loanId INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId INTEGER,
        itemName TEXT,
        studentName TEXT,
        regNo TEXT,
        returnDate TEXT,
        status TEXT,
        requestDate TEXT,
        approvedDate TEXT
    )`);

    // 4. Rejected Loans Table
    db.run(`CREATE TABLE IF NOT EXISTS rejected_loans (
        rejectionId INTEGER PRIMARY KEY AUTOINCREMENT,
        itemId INTEGER,
        itemName TEXT,
        studentName TEXT,
        regNo TEXT,
        returnDate TEXT,
        status TEXT,
        requestDate TEXT,
        rejectedDate TEXT
    )`);

    // OPTIONAL: Add Default Items if Empty
    db.get("SELECT count(*) as count FROM inventory", (err, row) => {
        if (row.count === 0) {
            console.log("🌱 Seeding initial data...");
            const stmt = db.prepare("INSERT INTO inventory (name, category, qty) VALUES (?, ?, ?)");
            stmt.run("Arduino Uno", "Microcontroller", 10);
            stmt.run("Ultrasonic Sensor", "Sensor", 25);
            stmt.run("Jumper Wires", "Wiring", 100);
            stmt.run("Raspberry Pi 4", "Microcontroller", 5);
            stmt.finalize();
        }
    });
});

// --- API ROUTES (Using SQL) ---

// 1. GET ALL COMPONENTS
app.get('/api/components', (req, res) => {
    db.all("SELECT * FROM inventory", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. GET REQUESTS & LOANS
app.get('/api/requests', (req, res) => {
    db.all("SELECT * FROM requests", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

app.get('/api/loans', (req, res) => {
    db.all("SELECT * FROM active_loans", [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 3. STUDENT HISTORY (Complex Query)
app.get('/api/student-history', (req, res) => {
    const { regNo } = req.query;
    if (!regNo) return res.status(400).json({ message: "Reg No required" });

    const history = { pending: [], approved: [], rejected: [] };

    // We use Promises to handle multiple queries cleanly
    const p1 = new Promise((resolve) => {
        db.all("SELECT * FROM requests WHERE regNo = ?", [regNo], (err, rows) => resolve(rows || []));
    });
    const p2 = new Promise((resolve) => {
        db.all("SELECT * FROM active_loans WHERE regNo = ?", [regNo], (err, rows) => resolve(rows || []));
    });
    const p3 = new Promise((resolve) => {
        db.all("SELECT * FROM rejected_loans WHERE regNo = ?", [regNo], (err, rows) => resolve(rows || []));
    });

    Promise.all([p1, p2, p3]).then(([pending, approved, rejected]) => {
        res.json({ pending, approved, rejected });
    });
});

// 4. NEW REQUEST
app.post('/api/request', (req, res) => {
    const { itemId, studentName, regNo, returnDate } = req.body;
    
    // First, get item details
    db.get("SELECT * FROM inventory WHERE id = ?", [itemId], (err, item) => {
        if (!item) return res.status(404).json({ message: "Item invalid" });

        const requestDate = new Date().toLocaleDateString();
        
        db.run(
            `INSERT INTO requests (itemId, itemName, studentName, regNo, returnDate, status, requestDate) 
             VALUES (?, ?, ?, ?, ?, 'Pending', ?)`,
            [itemId, item.name, studentName, regNo, returnDate, requestDate],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });

                // Send Email
                transporter.sendMail({
                    from: '"AssetFlow" <no-reply@lablink.com>',
                    to: 'sahilk832003@gmail.com', 
                    subject: `🔔 New Request: ${studentName}`,
                    text: `Student ${studentName} (${regNo}) wants ${item.name}. Return by: ${returnDate}`
                }, (e) => { if(e) console.log("Email Error:", e); });

                res.json({ success: true, message: "Request Sent!" });
            }
        );
    });
});

// 5. HANDLE REQUEST (APPROVE/REJECT) - The Critical Logic
app.post('/api/handle-request', (req, res) => {
    const { requestId, action } = req.body;

    // 1. Find the Request
    db.get("SELECT * FROM requests WHERE requestId = ?", [requestId], (err, request) => {
        if (!request) return res.status(404).json({ message: "Request not found" });

        if (action === 'approve') {
            // 2. Check Stock
            db.get("SELECT qty FROM inventory WHERE id = ?", [request.itemId], (err, item) => {
                if (!item || item.qty <= 0) {
                    return res.status(400).json({ message: "Out of Stock!" });
                }

                // 3. Transaction: Reduce Stock -> Move to Active -> Delete Request
                db.serialize(() => {
                    db.run("UPDATE inventory SET qty = qty - 1 WHERE id = ?", [request.itemId]);
                    
                    db.run(`INSERT INTO active_loans (itemId, itemName, studentName, regNo, returnDate, status, requestDate, approvedDate)
                            VALUES (?, ?, ?, ?, ?, 'Approved', ?, ?)`,
                            [request.itemId, request.itemName, request.studentName, request.regNo, request.returnDate, request.requestDate, new Date().toLocaleDateString()]);
                    
                    db.run("DELETE FROM requests WHERE requestId = ?", [requestId]);
                });
                res.json({ success: true, message: "Request Approved" });
            });

        } else {
            // REJECT LOGIC
            db.serialize(() => {
                db.run(`INSERT INTO rejected_loans (itemId, itemName, studentName, regNo, returnDate, status, requestDate, rejectedDate)
                        VALUES (?, ?, ?, ?, ?, 'Rejected', ?, ?)`,
                        [request.itemId, request.itemName, request.studentName, request.regNo, request.returnDate, request.requestDate, new Date().toLocaleDateString()]);
                
                db.run("DELETE FROM requests WHERE requestId = ?", [requestId]);
            });
            res.json({ success: true, message: "Request Rejected" });
        }
    });
});

// 6. ADD ITEM
app.post('/api/add', (req, res) => {
    const { name, category, qty } = req.body;
    db.run("INSERT INTO inventory (name, category, qty) VALUES (?, ?, ?)", [name, category, qty], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true, message: "Item Added" });
    });
});

// 7. DELETE ITEM
app.delete('/api/delete-item/:id', (req, res) => {
    const id = req.params.id;
    db.run("DELETE FROM inventory WHERE id = ?", [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ message: "Item not found" });
        res.json({ success: true, message: "Item Deleted" });
    });
});

// 8. ADMIN LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@lab.com" && password === "admin123") {
        res.json({ success: true, token: "secure-token-12345" });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 AssetFlow Server (SQLite) running at http://localhost:${PORT}`);
});