# ⚡ AssetFlow – Organizational Inventory System
Live website-> https://assetflow-app.onrender.com/index.html

AssetFlow is a smart, full-stack inventory management system built for **Technical Clubs, Engineering Labs, and Student Organizations**.
It eliminates messy spreadsheets by providing a centralized, automated, and role-based platform for tracking resources.

---

## 🌟 Features

### 🔐 Role-Based Access Control (RBAC)

* **Student Portal:** Browse inventory, view availability, and submit item requests.
* **Admin Dashboard:** Secure login (`admin@lab.com`), handle requests (approve/reject), and manage stock.

### 📩 Automated Email Notifications

* Integrated with **Nodemailer**.
* Admins receive instant emails for new item requests.

### 💾 Persistent JSON Database

* Uses a **local JSON file** as a NoSQL-style database.
* No external setup (MongoDB/SQL) required.
* Data persists even after server restarts.

### 📊 Real-Time Request Tracking

Students can track request status (`Pending / Approved / Rejected`) on their **My Dashboard**.

### 🛠️ Tech Stack

* **Frontend:** HTML5, CSS3 (Flexbox/Grid), Vanilla JavaScript
* **Backend:** Node.js, Express.js
* **Database:** JSON File System (`fs` module)
* **Utilities:** Nodemailer (SMTP), REST APIs

---

## 🚀 Installation & Setup

Follow the steps to set up the project locally:

### 1️⃣ Clone the Repository

```bash
git clone https://github.com/YOUR_USERNAME/AssetFlow.git
cd AssetFlow
```

### 2️⃣ Install Dependencies

```bash
npm install
```

### 3️⃣ Configure Email (Important)

Open **server.js**, find the Nodemailer transporter, and update:

```js
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'YOUR_EMAIL@gmail.com',
    pass: 'YOUR_APP_PASSWORD', // Google > Security > App Passwords
  },
});
```

### 4️⃣ Start the Server

```bash
node server.js
```

### 5️⃣ Open in Browser

Visit:
👉 **[http://localhost:3000](http://localhost:3000)**

---

## 🔑 Default Credentials (Admin)

* **Email:** `admin@lab.com`
* **Password:** `admin123`
* Accessible via the **Admin Login** button on the homepage.

---

## 📂 Project Structure

```
AssetFlow/
│
├── public/              # Frontend Files
│   ├── index.html       # Student Portal
│   ├── admin.html       # Admin Dashboard
│   ├── login.html       # Admin Login Page
│   ├── style.css        # Global Styles
│   └── script.js        # Client Logic
│
├── database.json        # JSON Database (Inventory + Requests)
├── server.js            # Backend Server & API Logic
├── package.json         # Dependencies
└── README.md            # Documentation
```

---

## 🛡️ Future Enhancements

* [ ] QR Code scanning for faster checkout.
* [ ] MongoDB integration for scalable deployments.
* [ ] Overdue alerts for items not returned on time.

---

## 🤝 Contributing

1. Fork this repo
2. Create a new branch

   ```bash
   git checkout -b feature-branch
   ```
3. Commit your changes
4. Push and open a Pull Request

---

Made with ❤️ by Sahil Kawadse
