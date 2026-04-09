document.addEventListener('DOMContentLoaded', () => {

const API_URL = 'http://localhost:3000/orders';

// ---- STATE ----
let orders = [];
let orderToDelete = null;

// ---- DOM ----
const ordersTableBody = document.getElementById('ordersTableBody');
const emptyState = document.getElementById('emptyState');
const ordersTable = document.getElementById('ordersTable');

// ---- TOAST ----
const showToast = (msg) => {
    const toast = document.getElementById('toast');
    toast.textContent = msg;
    toast.classList.remove('hidden');
    setTimeout(() => toast.classList.add('active'), 10);
    setTimeout(() => {
        toast.classList.remove('active');
        setTimeout(() => toast.classList.add('hidden'), 300);
    }, 3000);
};

// ---- API ----
const loadOrders = async () => {
    try {
        const res = await fetch(API_URL);
        orders = await res.json();
        renderOrders();
    } catch (err) {
        showToast('Error loading orders');
    }
};

const addOrder = async (data) => {
    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    loadOrders();
};

const updateOrder = async (id, data) => {
    await fetch(`${API_URL}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    loadOrders();
};

const deleteOrder = async (id) => {
    await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
    loadOrders();
};

// ---- RENDER ----
const renderOrders = () => {
    ordersTableBody.innerHTML = '';

    if (!orders.length) {
        emptyState.classList.remove('hidden');
        ordersTable.classList.add('hidden');
        return;
    }

    emptyState.classList.add('hidden');
    ordersTable.classList.remove('hidden');

    orders.forEach(order => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>#${order.listNumber || '-'}</td>
            <td>${order.senderName || '-'}</td>
            <td>${order.receiverName || '-'}</td>
            <td>${order.pickupLocation || '-'}</td>
            <td>${order.deliveryLocation || '-'}</td>
            <td>$${parseFloat(order.finalCharge || 0).toFixed(2)}</td>
            <td>${order.driverName || '-'}</td>
            <td>${order.status || 'Pending'}</td>
            <td>
                <button onclick="completeOrder('${order._id}')">✔</button>
                <button onclick="deleteOrderUI('${order._id}')">🗑</button>
            </td>
        `;

        ordersTableBody.appendChild(tr);
    });
};

// ---- ACTIONS ----
window.completeOrder = async (id) => {
    const order = orders.find(o => o._id === id);
    if (!order) return;

    order.status = 'Completed';
    await updateOrder(id, order);
};

window.deleteOrderUI = (id) => {
    orderToDelete = id;
    if (confirm('Delete this order?')) {
        deleteOrder(id);
    }
};

// ---- FORM ----
const orderForm = document.getElementById('orderForm');

orderForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const data = {
        listNumber: document.getElementById('listNumber').value,
        senderName: document.getElementById('senderName').value,
        receiverName: document.getElementById('receiverName').value,
        pickupLocation: document.getElementById('pickupLocation').value,
        deliveryLocation: document.getElementById('deliveryLocation').value,
        finalCharge: document.getElementById('finalChargeValue').value,
        driverName: document.getElementById('driverName').value,
        status: document.getElementById('status').value
    };

    await addOrder(data);
    orderForm.reset();
});

// ---- INIT ----
loadOrders();

});
