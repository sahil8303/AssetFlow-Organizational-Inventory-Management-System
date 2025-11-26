const express = require('express');
const cors = require('cors');
const nodemailer = require('nodemailer');
const fs = require('fs'); 
const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// --- 📧 EMAIL CONFIGURATION ---
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'sahilk832003@gmail.com',  // ✅ Your Email
        pass: 'moiu atnm njio nqxr'      // ✅ Your App Password
    }
});

// --- 💾 DATA PERSISTENCE ---
const DB_FILE = './database.json';

function loadData() {
    try {
        if (fs.existsSync(DB_FILE)) {
            const data = fs.readFileSync(DB_FILE, 'utf8');
            return JSON.parse(data);
        }
    } catch (err) { console.error("Error reading DB:", err); }
    // Default structure if file is new or broken
    return { inventory: [], requests: [], activeLoans: [], rejected: [] }; 
}

function saveData(data) {
    try {
        fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
    } catch (err) { console.error("Error saving DB:", err); }
}

let db = loadData();
// Safety check: Ensure all arrays exist
if (!db.rejected) db.rejected = [];
if (!db.activeLoans) db.activeLoans = [];
if (!db.requests) db.requests = [];

// --- ROUTES ---

// 1. GET DATA
app.get('/api/components', (req, res) => res.json(db.inventory));
app.get('/api/requests', (req, res) => res.json(db.requests));
app.get('/api/loans', (req, res) => res.json(db.activeLoans));

// 2. STUDENT HISTORY (Pending + Approved + Rejected)
app.get('/api/student-history', (req, res) => {
    const { regNo } = req.query;
    if (!regNo) return res.status(400).json({ message: "Reg No required" });

    const myRequests = db.requests.filter(r => r.regNo === regNo);
    const myLoans = db.activeLoans.filter(l => l.regNo === regNo);
    const myRejected = db.rejected.filter(r => r.regNo === regNo); 

    res.json({ pending: myRequests, approved: myLoans, rejected: myRejected });
});

// 3. STUDENT REQUEST (+ Email)
app.post('/api/request', (req, res) => {
    const { itemId, studentName, regNo, returnDate } = req.body;
    const item = db.inventory.find(i => i.id === itemId);
    if (!item) return res.status(404).json({ message: "Item invalid" });

    const newRequest = {
        requestId: Date.now(),
        itemId, itemName: item.name, studentName, regNo, returnDate,
        status: "Pending", requestDate: new Date().toLocaleDateString()
    };
    db.requests.push(newRequest);
    saveData(db);

    // Send Email
    transporter.sendMail({
        from: '"LabLink" <no-reply@lablink.com>',
        to: 'sahilk832003@gmail.com', 
        subject: `🔔 New Request: ${studentName}`,
        text: `Student ${studentName} (${regNo}) wants ${item.name}. Return by: ${returnDate}`
    }, (err) => { if(err) console.log("Email Error:", err); });
    
    res.json({ success: true, message: "Request Sent!" });
});

// 4. ADMIN ACTIONS (Approve / Reject)
app.post('/api/handle-request', (req, res) => {
    const { requestId, action } = req.body;
    const reqIndex = db.requests.findIndex(r => r.requestId === requestId);
    if (reqIndex === -1) return res.status(404).json({ message: "Request not found" });

    const request = db.requests[reqIndex];

    if (action === 'approve') {
        const item = db.inventory.find(i => i.id === request.itemId);
        if (item && item.qty > 0) {
            item.qty -= 1;
            request.status = "Approved";
            db.activeLoans.push({ ...request, loanId: Date.now(), approvedDate: new Date().toLocaleDateString() });
        } else {
            return res.status(400).json({ message: "Out of Stock!" });
        }
    } else {
        // Rejection Logic
        request.status = "Rejected";
        db.rejected.push({ ...request, rejectedDate: new Date().toLocaleDateString() });
    }

    db.requests.splice(reqIndex, 1); // Remove from Pending list
    saveData(db);

    res.json({ success: true, message: `Request ${action}d` });
});

// 5. ADD ITEM
app.post('/api/add', (req, res) => {
    const { name, category, qty } = req.body;
    db.inventory.push({ id: Date.now(), name, category, qty: parseInt(qty) });
    saveData(db);
    res.json({ success: true, message: "Item Added" });
});

// 6. DELETE ITEM (Robust Version)
app.delete('/api/delete-item/:id', (req, res) => {
    const idToDelete = parseInt(req.params.id);
    const initialLength = db.inventory.length;
    
    db.inventory = db.inventory.filter(item => item.id !== idToDelete);

    if (db.inventory.length === initialLength) {
        return res.status(404).json({ message: "Item not found" });
    }

    saveData(db);
    res.json({ success: true, message: "Item Deleted" });
});

// 7. LOGIN
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    if (email === "admin@lab.com" && password === "admin123") {
        res.json({ success: true, token: "secure-token-12345" });
    } else {
        res.status(401).json({ success: false, message: "Invalid Credentials" });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 LabLink Server running at http://localhost:${PORT}`);
});