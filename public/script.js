const API_URL = 'http://localhost:3000/api';

document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'dark'; // Default to Dark for best 3D effect
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
    loadInventory();
});

// Helper to get cool 3D Emoji based on category
function getIcon(category) {
    const cat = category.toLowerCase();
    if (cat.includes('microcontroller') || cat.includes('arduino') || cat.includes('pi')) return '🤖';
    if (cat.includes('sensor')) return '📡';
    if (cat.includes('motor')) return '⚙️';
    if (cat.includes('wire') || cat.includes('cable')) return '🔌';
    if (cat.includes('display') || cat.includes('screen')) return '🖥️';
    return '📦'; // Default box
}

async function loadInventory() {
    const grid = document.getElementById('inventory-grid');
    if (!grid) return console.error("Grid missing");

    grid.innerHTML = '<p style="text-align:center; color:var(--text-muted);">🔄 Syncing with Lab Server...</p>';

    try {
        const response = await fetch(`${API_URL}/components`);
        if (!response.ok) throw new Error("Server Error");
        const data = await response.json();
        renderGrid(data);
    } catch (error) {
        grid.innerHTML = `<p style="text-align:center; color:#ef4444;">⚠️ Connection Failed. Check Server.</p>`;
    }
}

function renderGrid(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = ''; 

    if (!items || items.length === 0) {
        grid.innerHTML = '<p style="text-align:center; color:var(--text-muted);">No items found.</p>';
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const isOutOfStock = item.qty === 0;
        const icon = getIcon(item.category);

        card.innerHTML = `
            <div class="card-icon">${icon}</div>
            <h3>${item.name}</h3>
            <span class="qty-badge ${isOutOfStock ? 'out-stock' : ''}">
                ${isOutOfStock ? 'Out of Stock' : item.qty + ' Available'}
            </span>
            <button class="action-btn" onclick="openRequestModal(${item.id}, '${item.name}')" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? "Unavailable" : "Request Item"}
            </button>
        `;
        grid.appendChild(card);
    });
}

// ... (Keep your existing modal/request functions here unchanged) ...
// COPY-PASTE the rest of your modal logic below from the previous file
function openRequestModal(id, name) {
    document.getElementById('requestModal').classList.add('active');
    document.getElementById('modalItemName').innerText = `Requesting: ${name}`;
    document.getElementById('selectedItemId').value = id;
}
function closeModal() { document.getElementById('requestModal').classList.remove('active'); }
function openStatusModal() { document.getElementById('statusModal').classList.add('active'); }
function closeStatusModal() { document.getElementById('statusModal').classList.remove('active'); }

async function submitRequest() {
    const itemId = document.getElementById('selectedItemId').value;
    const name = document.getElementById('studentName').value;
    const regNo = document.getElementById('regNo').value;
    const returnDate = document.getElementById('returnDate').value;
    if (!name || !regNo || !returnDate) return alert("Please fill all fields");

    await fetch(`${API_URL}/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemId: parseInt(itemId), studentName: name, regNo, returnDate })
    });
    alert("✅ Request Sent!");
    closeModal();
}

async function checkMyStatus() {
    const regNo = document.getElementById('statusRegNo').value.trim();
    if (!regNo) return alert("Enter Reg No");
    const resultsDiv = document.getElementById('statusResults');
    resultsDiv.innerHTML = 'Searching...';
    
    const res = await fetch(`${API_URL}/student-history?regNo=${regNo}`);
    const data = await res.json();
    resultsDiv.innerHTML = ''; 
    
    if(data.approved.length) resultsDiv.innerHTML += `<h4 style="color:#22c55e">✅ Active Loans</h4>` + data.approved.map(i => `<div>${i.itemName}</div>`).join('');
    if(data.pending.length) resultsDiv.innerHTML += `<h4 style="color:#fbbf24">⏳ Pending</h4>` + data.pending.map(i => `<div>${i.itemName}</div>`).join('');
    if(data.rejected.length) resultsDiv.innerHTML += `<h4 style="color:#ef4444">❌ Rejected</h4>` + data.rejected.map(i => `<div>${i.itemName}</div>`).join('');
    
    if(!resultsDiv.innerHTML) resultsDiv.innerHTML = "No records found.";
}

function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('theme', next);
    updateThemeIcon(next);
}
function updateThemeIcon(theme) {
    document.getElementById('themeIcon').innerText = theme === 'dark' ? '🌙' : '☀️';
}