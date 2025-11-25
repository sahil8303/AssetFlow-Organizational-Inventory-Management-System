const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    loadRequests();
    loadActiveLoans();
    loadAdminInventory(); // NEW FUNCTION
});

function logout() {
    localStorage.removeItem('adminToken');
    window.location.href = 'login.html';
}

// ... (Keep loadRequests and handleRequest same as before) ...
async function loadRequests() {
    const response = await fetch(`${API_URL}/requests`);
    const data = await response.json();
    const tbody = document.getElementById('requests-body');
    tbody.innerHTML = '';

    if(data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;">No pending requests</td></tr>';
        return;
    }

    data.forEach(req => {
        const row = `
            <tr>
                <td><strong>${req.studentName}</strong><br><small>${req.regNo}</small></td>
                <td>${req.itemName}</td>
                <td style="color: #d97706;">${req.returnDate}</td>
                <td>
                    <button class="approve-btn" onclick="handleRequest(${req.requestId}, 'approve')">✅</button>
                    <button class="reject-btn" onclick="handleRequest(${req.requestId}, 'reject')">❌</button>
                </td>
            </tr>`;
        tbody.innerHTML += row;
    });
}

async function handleRequest(requestId, action) {
    if(!confirm(`Confirm ${action}?`)) return;
    await fetch(`${API_URL}/handle-request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requestId, action })
    });
    loadRequests();
    loadActiveLoans();
}

async function loadActiveLoans() {
    const response = await fetch(`${API_URL}/loans`);
    const data = await response.json();
    const list = document.getElementById('active-loans-list');
    list.innerHTML = '';
    data.forEach(loan => {
        list.innerHTML += `<li><strong>${loan.studentName}</strong> (${loan.itemName})<br><small style="color: #fbbf24;">Due: ${loan.returnDate}</small></li>`;
    });
}

async function addNewItem() {
    const name = document.getElementById('newName').value;
    const category = document.getElementById('newCategory').value;
    const qty = document.getElementById('newQty').value;

    await fetch(`${API_URL}/add`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, category, qty })
    });
    alert("Item Added!");
    document.getElementById('newName').value = '';
    loadAdminInventory(); // Refresh list immediately
}

// --- NEW FUNCTIONS FOR DELETING ---

// 1. Load Inventory for Admin Table
async function loadAdminInventory() {
    const response = await fetch(`${API_URL}/components`);
    const data = await response.json();
    const tbody = document.getElementById('inventory-list-body');
    tbody.innerHTML = '';

    data.forEach(item => {
        tbody.innerHTML += `
            <tr>
                <td>${item.name}</td>
                <td>${item.category}</td>
                <td>${item.qty}</td>
                <td>
                    <button class="reject-btn" onclick="deleteItem(${item.id})" style="width:auto; padding:5px 10px;">🗑️ Delete</button>
                </td>
            </tr>
        `;
    });
}

// 2. Delete Logic
async function deleteItem(id) {
    if(!confirm("Are you sure you want to delete this item permanently?")) return;

    const response = await fetch(`${API_URL}/delete-item/${id}`, {
        method: 'DELETE'
    });

    const result = await response.json();
    if(result.success) {
        alert("Item Deleted!");
        loadAdminInventory(); // Refresh table
    } else {
        alert("Error: " + result.message);
    }
}