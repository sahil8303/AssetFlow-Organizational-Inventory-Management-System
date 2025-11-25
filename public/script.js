const API_URL = 'http://localhost:3000/api';

// 1. STARTUP: Load items when page opens
document.addEventListener('DOMContentLoaded', () => {
    loadInventory();
});

// 2. FETCH INVENTORY
async function loadInventory() {
    try {
        const response = await fetch(`${API_URL}/components`);
        const data = await response.json();
        renderGrid(data);
    } catch (error) {
        console.error("Error loading inventory:", error);
    }
}

// 3. RENDER CARDS (Now with BUTTONS!)
function renderGrid(items) {
    const grid = document.getElementById('inventory-grid');
    grid.innerHTML = ''; // Clear existing items

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'card';
        const isOutOfStock = item.qty === 0;

        // 👇 THIS IS THE PART YOU WERE MISSING 👇
        card.innerHTML = `
            <div>
                <h3>${item.name}</h3>
                <span class="qty-badge ${isOutOfStock ? 'out-stock' : ''}">
                    ${isOutOfStock ? 'Out of Stock' : item.qty + ' Available'}
                </span>
                <p style="color: #64748b; font-size: 0.9rem; margin-bottom:1rem;">Category: ${item.category}</p>
            </div>
            
            <button class="action-btn" onclick="openRequestModal(${item.id}, '${item.name}')" ${isOutOfStock ? 'disabled' : ''}>
                ${isOutOfStock ? "Unavailable" : "Request Item"}
            </button>
        `;
        grid.appendChild(card);
    });
}

// 4. MODAL FUNCTIONS (To open/close popups)
function openRequestModal(id, name) {
    document.getElementById('requestModal').classList.add('active');
    document.getElementById('modalItemName').innerText = `Requesting: ${name}`;
    document.getElementById('selectedItemId').value = id;
}

function closeModal() {
    document.getElementById('requestModal').classList.remove('active');
}

function openStatusModal() {
    document.getElementById('statusModal').classList.add('active');
}

function closeStatusModal() {
    document.getElementById('statusModal').classList.remove('active');
}

// 5. SEND REQUEST TO SERVER
async function submitRequest() {
    const itemId = document.getElementById('selectedItemId').value;
    const name = document.getElementById('studentName').value;
    const regNo = document.getElementById('regNo').value;
    const returnDate = document.getElementById('returnDate').value;

    if (!name || !regNo || !returnDate) {
        alert("Please fill in ALL details!");
        return;
    }

    try {
        const response = await fetch(`${API_URL}/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ itemId: parseInt(itemId), studentName: name, regNo, returnDate })
        });

        const result = await response.json();
        if (result.success) {
            alert("✅ " + result.message);
            closeModal();
        } else {
            alert("❌ Error: " + result.message);
        }
    } catch (error) {
        console.error("Request failed:", error);
    }
}

// 6. CHECK STATUS
async function checkMyStatus() {
    const regNo = document.getElementById('statusRegNo').value.trim();
    if (!regNo) return alert("Please enter Reg No!");

    const resultsDiv = document.getElementById('statusResults');
    resultsDiv.innerHTML = '<p style="text-align:center; color:#64748b;">Searching...</p>';

    try {
        const response = await fetch(`${API_URL}/student-history?regNo=${regNo}`);
        const data = await response.json();
        
        resultsDiv.innerHTML = ''; 

        if (data.pending.length === 0 && data.approved.length === 0) {
            resultsDiv.innerHTML = '<p style="text-align:center; color:#ef4444;">No records found.</p>';
            return;
        }

        if (data.approved.length > 0) {
            resultsDiv.innerHTML += `<h4 style="color:#16a34a; margin:10px 0 5px;">✅ Active Loans</h4>`;
            data.approved.forEach(item => {
                resultsDiv.innerHTML += `
                    <div style="background:#dcfce7; padding:10px; border-radius:8px; margin-bottom:5px; font-size:0.9rem;">
                        <strong>${item.itemName}</strong> <br> <span style="font-size:0.8rem">Return by: ${item.returnDate}</span>
                    </div>`;
            });
        }

        if (data.pending.length > 0) {
            resultsDiv.innerHTML += `<h4 style="color:#d97706; margin:15px 0 5px;">⏳ Pending Approval</h4>`;
            data.pending.forEach(item => {
                resultsDiv.innerHTML += `
                    <div style="background:#fef3c7; padding:10px; border-radius:8px; margin-bottom:5px; font-size:0.9rem;">
                        <strong>${item.itemName}</strong>
                    </div>`;
            });
        }

    } catch (error) {
        resultsDiv.innerHTML = '<p style="color:red; text-align:center;">Connection Error.</p>';
    }
}