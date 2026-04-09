document.addEventListener('DOMContentLoaded', () => {
    // ---- DOM Elements ----
    const loginScreen = document.getElementById('loginScreen');
    const dashboard = document.getElementById('dashboard');
    const loginForm = document.getElementById('loginForm');
    const logoutBtn = document.getElementById('logoutBtn');
    
    const addOrderBtn = document.getElementById('addOrderBtn');
    const driversBtn = document.getElementById('driversBtn');
    const orderModal = document.getElementById('orderModal');
    const driverModal = document.getElementById('driverModal');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const cancelModalBtn = document.getElementById('cancelModalBtn');
    const closeDriverModalBtn = document.getElementById('closeDriverModalBtn');
    const expensesModal = document.getElementById('expensesModal');
    const closeExpensesModalBtn = document.getElementById('closeExpensesModalBtn');
    const cancelExpensesBtn = document.getElementById('cancelExpensesBtn');
    const orderForm = document.getElementById('orderForm');
    const driverForm = document.getElementById('driverForm');
    const expensesForm = document.getElementById('expensesForm');
    const entityForm = document.getElementById('entityForm');
    const entityModal = document.getElementById('entityModal');
    const closeEntityModalBtn = document.getElementById('closeEntityModalBtn');
    
    const calculateTotal = () => {
        const boxes = parseFloat(document.getElementById('numberOfBoxes').value) || 0;
        const boxPrice = parseFloat(document.getElementById('pricePerBox').value) || 0;
        const boxTotal = boxes * boxPrice;

        const l = parseFloat(document.getElementById('dimLength').value) || 0;
        const w = parseFloat(document.getElementById('dimWidth').value) || 0;
        const h = parseFloat(document.getElementById('dimHeight').value) || 0;
        const cubicPrice = parseFloat(document.getElementById('pricePerCubic').value) || 0;
        const cubicTotal = l * w * h * cubicPrice;

        document.getElementById('displayBoxTotal').textContent = `$${boxTotal.toFixed(2)}`;
        document.getElementById('displayCubicTotal').textContent = `$${cubicTotal.toFixed(2)}`;

        let finalCharge = 0;
        let method = '';

        if (boxTotal > 0 && cubicTotal === 0) {
            finalCharge = boxTotal;
            method = 'Boxes';
        } else if (cubicTotal > 0 && boxTotal === 0) {
            finalCharge = cubicTotal;
            method = 'Cubic Meter';
        } else if (boxTotal > 0 && cubicTotal > 0) {
            if (boxTotal >= cubicTotal) {
                finalCharge = boxTotal;
                method = 'Boxes';
            } else {
                finalCharge = cubicTotal;
                method = 'Cubic Meter';
            }
        } else {
            finalCharge = 0;
            method = '';
        }

        document.getElementById('displayFinalCharge').textContent = `$${finalCharge.toFixed(2)}`;
        if (finalCharge > 0) {
            document.getElementById('displayFinalCharge').style.color = 'var(--success)';
        } else {
            document.getElementById('displayFinalCharge').style.color = 'var(--text-muted)';
        }
        
        document.getElementById('finalChargeValue').value = finalCharge.toFixed(2);
        document.getElementById('selectedMethodValue').value = method;

        const badge = document.getElementById('selectedMethodBadge');
        if (method) {
            badge.textContent = method;
            badge.style.display = 'inline-block';
        } else {
            badge.style.display = 'none';
        }

        document.getElementById('displayBoxTotal').style.color = (method === 'Boxes' && finalCharge > 0) ? '#fff' : 'var(--text-muted)';
        document.getElementById('displayCubicTotal').style.color = (method === 'Cubic Meter' && finalCharge > 0) ? '#fff' : 'var(--text-muted)';
    };

    ['numberOfBoxes', 'pricePerBox', 'dimLength', 'dimWidth', 'dimHeight', 'pricePerCubic'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calculateTotal);
    });
    
    const deleteModal = document.getElementById('deleteModal');
    const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
    const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
    
    const ordersTableBody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('emptyState');
    const ordersTable = document.getElementById('ordersTable');
    const modalTitle = document.getElementById('modalTitle');
    
    // ---- State ----
    let orders = JSON.parse(localStorage.getItem('transportOrders')) || [];
    let drivers = JSON.parse(localStorage.getItem('transportDrivers')) || [];
    let entities = JSON.parse(localStorage.getItem('transportEntities')) || { senders: [], receivers: [] };
    let orderToDelete = null;
    let listCounter = parseInt(localStorage.getItem('listCounter')) || 1;

    // Toast functionality
    const showToast = (message) => {
        const toast = document.getElementById('toast');
        toast.textContent = message;
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('active'), 10);
        setTimeout(() => {
            toast.classList.remove('active');
            setTimeout(() => toast.classList.add('hidden'), 300);
        }, 3000);
    };

    // ---- Authentication ----
    // Simple mock authentication
    const checkAuth = () => {
        const user = sessionStorage.getItem('transpoUser');
        if (user) {
            loginScreen.classList.remove('active');
            setTimeout(() => {
                loginScreen.classList.add('hidden');
                dashboard.classList.remove('hidden');
            }, 300); // Wait for fade out
            renderOrders();
        } else {
            dashboard.classList.add('hidden');
            loginScreen.classList.remove('hidden');
            setTimeout(() => loginScreen.classList.add('active'), 10);
        }
    };

    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const user = document.getElementById('username').value;
        if(user.trim() !== '') {
            sessionStorage.setItem('transpoUser', user);
            checkAuth();
        }
    });

    logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('transpoUser');
        checkAuth();
    });

    // ---- Orders Logic ----

    const saveOrders = () => {
        localStorage.setItem('transportOrders', JSON.stringify(orders));
        renderOrders();
        if(driverModal && driverModal.classList.contains('active')) {
            renderDrivers(); // Update driver stats behind if ordering/completing
        }
    };
    
    const saveDrivers = () => {
        localStorage.setItem('transportDrivers', JSON.stringify(drivers));
        renderDrivers();
        populateDriverDropdown();
    };

    const getStatusClass = (status) => {
        switch(status.toLowerCase()) {
            case 'completed': return 'status-completed';
            case 'in progress': return 'status-in-progress';
            default: return 'status-pending';
        }
    };

    const renderOrders = () => {
        ordersTableBody.innerHTML = '';
        
        if (orders.length === 0) {
            emptyState.classList.remove('hidden');
            ordersTable.classList.add('hidden');
            return;
        }

        emptyState.classList.add('hidden');
        ordersTable.classList.remove('hidden');

        orders.forEach(order => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>#${order.listNumber || '-'}</strong></td>
                <td>
                    <strong>${order.senderName || '-'}</strong><br>
                    <small style="color: var(--text-muted);">${order.senderPhone || '-'}</small>
                </td>
                <td>
                    <strong>${order.receiverName || '-'}</strong><br>
                    <small style="color: var(--text-muted);">${order.receiverPhone || '-'}</small>
                </td>
                <td>${order.pickupLocation}</td>
                <td>${order.deliveryLocation}</td>
                <td>${order.numberOfBoxes || '-'}</td>
                <td>${(order.dimLength && order.dimWidth && order.dimHeight) ? `${order.dimLength}×${order.dimWidth}×${order.dimHeight}` : '-'}</td>
                <td>$${parseFloat(order.finalCharge || order.totalPrice || 0).toFixed(2)} <span style="font-size:0.75rem; color:var(--text-muted)">${order.selectedMethod ? `(${order.selectedMethod})` : ''}</span></td>
                <td>${order.driverName}</td>
                <td>${order.date || '-'}</td>
                <td><span class="status-badge ${getStatusClass(order.status)}">${order.status}</span></td>
                <td class="actions-col">
                    <div class="actions-cell">
                        ${order.status !== 'Completed' ? 
                            `<button class="btn-action complete" onclick="completeOrder('${order.id}')" title="Complete Order">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
                            </button>` : ''
                        }
                        <button class="btn-action" onclick="editOrder('${order.id}')" title="Edit Order">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                        </button>
                        <button class="btn-action whatsapp" onclick="printList('${order.listNumber}')" title="Print List">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>
                        </button>
                        <button class="btn-action delete" onclick="confirmDelete('${order.id}')" title="Delete Order">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            `;
            ordersTableBody.appendChild(tr);
        });
    };

    // Global functions for inline onclick handlers
    window.completeOrder = (id) => {
        const orderIndex = orders.findIndex(o => o.id === id);
        if(orderIndex > -1) {
            orders[orderIndex].status = 'Completed';
            saveOrders();
        }
    };

    window.editOrder = (id) => {
        const order = orders.find(o => o.id === id);
        if(order) {
            document.getElementById('orderId').value = order.id;
            
            populateEntityDropdowns(); // Ensure inputs have options available
            
            document.getElementById('listNumber').value = order.listNumber || '';
            document.getElementById('senderName').value = order.senderName || '';
            document.getElementById('receiverName').value = order.receiverName || '';
            document.getElementById('senderPhone').value = order.senderPhone || '';
            document.getElementById('receiverPhone').value = order.receiverPhone || '';
            document.getElementById('pickupLocation').value = order.pickupLocation || '';
            document.getElementById('deliveryLocation').value = order.deliveryLocation || '';
            document.getElementById('numberOfBoxes').value = order.numberOfBoxes || '';
            document.getElementById('pricePerBox').value = order.pricePerBox || '';
            document.getElementById('dimLength').value = order.dimLength || '';
            document.getElementById('dimWidth').value = order.dimWidth || '';
            document.getElementById('dimHeight').value = order.dimHeight || '';
            document.getElementById('pricePerCubic').value = order.pricePerCubic || '';
            calculateTotal();
            
            // Populate dropdown first to ensure the option exists before setting value
            populateDriverDropdown();
            document.getElementById('driverName').value = order.driverName || '';
            document.getElementById('date').value = order.date || '';
            document.getElementById('status').value = order.status;
            
            modalTitle.textContent = 'Edit Order';
            openModal(orderModal);
        }
    };

    window.confirmDelete = (id) => {
        orderToDelete = id;
        openModal(deleteModal);
    };

    window.printList = (listNumber) => {
        const relatedOrders = orders.filter(o => String(o.listNumber) === String(listNumber));
        if (relatedOrders.length === 0) return;

        const baseOrder = relatedOrders[0];

        document.getElementById('printInfo').innerHTML = `
            <div>
                <p style="margin: 5px 0;"><strong>List Number:</strong> #${baseOrder.listNumber}</p>
                <p style="margin: 5px 0;"><strong>Driver Name:</strong> ${baseOrder.driverName}</p>
            </div>
            <div style="text-align: right;">
                <p style="margin: 5px 0;"><strong>Date:</strong> ${baseOrder.date || '-'}</p>
                <p style="margin: 5px 0;"><strong>Status:</strong> ${baseOrder.status}</p>
            </div>
        `;

        let tBodyHtml = '';
        let grandTotal = 0;

        relatedOrders.forEach(o => {
            const rowTotal = parseFloat(o.finalCharge || o.totalPrice || 0);
            grandTotal += rowTotal;

            tBodyHtml += `
                <tr>
                    <td>${o.senderName}<br><small style="color:#555;">${o.senderPhone || '-'}</small></td>
                    <td>${o.receiverName}<br><small style="color:#555;">${o.receiverPhone || '-'}</small></td>
                    <td>${o.pickupLocation}</td>
                    <td>${o.deliveryLocation}</td>
                    <td>${o.numberOfBoxes || '-'}</td>
                    <td>${(o.dimLength && o.dimWidth && o.dimHeight) ? `${o.dimLength}×${o.dimWidth}×${o.dimHeight}` : '-'}</td>
                    <td>$${rowTotal.toFixed(2)}</td>
                </tr>
            `;
        });

        document.getElementById('printTableBody').innerHTML = tBodyHtml;
        document.getElementById('printFooter').innerHTML = `Grand Total: $${grandTotal.toFixed(2)}`;

        setTimeout(() => {
            window.print();
        }, 100);
    };

    // ---- Modal Logic ----

    const openModal = (modal) => {
        modal.classList.remove('hidden');
        // Small delay to allow display block to apply before animating opacity
        setTimeout(() => modal.classList.add('active'), 10);
    };

    const closeModal = (modal) => {
        modal.classList.remove('active');
        setTimeout(() => {
            modal.classList.add('hidden');
            if(modal === orderModal) {
                orderForm.reset();
                document.getElementById('orderId').value = '';
            }
        }, 300);
    };

    addOrderBtn.addEventListener('click', () => {
        modalTitle.textContent = 'Add New Order';
        orderForm.reset();
        document.getElementById('orderId').value = '';
        document.getElementById('listNumber').value = listCounter;
        populateDriverDropdown();
        populateEntityDropdowns();
        calculateTotal();
        openModal(orderModal);
    });

    driversBtn.addEventListener('click', () => {
        renderDrivers();
        openModal(driverModal);
    });

    closeDriverModalBtn.addEventListener('click', () => closeModal(driverModal));
    closeModalBtn.addEventListener('click', () => closeModal(orderModal));
    cancelModalBtn.addEventListener('click', () => closeModal(orderModal));
    closeExpensesModalBtn.addEventListener('click', () => closeModal(expensesModal));
    cancelExpensesBtn.addEventListener('click', () => closeModal(expensesModal));
    closeEntityModalBtn.addEventListener('click', () => closeModal(entityModal));
    
    cancelDeleteBtn.addEventListener('click', () => {
        orderToDelete = null;
        closeModal(deleteModal);
    });

    confirmDeleteBtn.addEventListener('click', () => {
        if(orderToDelete) {
            orders = orders.filter(o => o.id !== orderToDelete);
            saveOrders();
            orderToDelete = null;
            closeModal(deleteModal);
        }
    });

    // Form Submission
    orderForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const sPhone = document.getElementById('senderPhone').value.trim();
        const rPhone = document.getElementById('receiverPhone').value.trim();

        if (sPhone && !/^\d{8,15}$/.test(sPhone)) {
            showToast("Sender Phone must be 8 to 15 digits.");
            return;
        }

        if (rPhone && !/^\d{8,15}$/.test(rPhone)) {
            showToast("Receiver Phone must be 8 to 15 digits.");
            return;
        }

        const id = document.getElementById('orderId').value;
        const orderData = {
            id: id || Date.now().toString(),
            listNumber: document.getElementById('listNumber').value,
            senderName: document.getElementById('senderName').value,
            receiverName: document.getElementById('receiverName').value,
            senderPhone: document.getElementById('senderPhone').value,
            receiverPhone: document.getElementById('receiverPhone').value,
            pickupLocation: document.getElementById('pickupLocation').value,
            deliveryLocation: document.getElementById('deliveryLocation').value,
            numberOfBoxes: document.getElementById('numberOfBoxes').value,
            pricePerBox: document.getElementById('pricePerBox').value,
            dimLength: document.getElementById('dimLength').value,
            dimWidth: document.getElementById('dimWidth').value,
            dimHeight: document.getElementById('dimHeight').value,
            pricePerCubic: document.getElementById('pricePerCubic').value,
            finalCharge: document.getElementById('finalChargeValue').value,
            selectedMethod: document.getElementById('selectedMethodValue').value,
            totalPrice: document.getElementById('finalChargeValue').value, // Used securely for summary loops
            driverName: document.getElementById('driverName').value,
            date: document.getElementById('date').value,
            status: document.getElementById('status').value
        };

        if (id) {
            // Edit
            const index = orders.findIndex(o => o.id === id);
            if(index > -1) {
                orderData.listNumber = orders[index].listNumber; // Safe preservation from edits
                orders[index] = orderData;
            }
        } else {
            // Add
            orders.push(orderData);
            listCounter++;
            localStorage.setItem('listCounter', listCounter);
        }

        saveOrders();
        closeModal(orderModal);
    });

    // ---- WhatsApp Logic ----
    window.sendWhatsApp = (recipientType) => {
        const phone = recipientType === 'sender' ? document.getElementById('senderPhone').value.trim() : document.getElementById('receiverPhone').value.trim();

        if (!phone || !/^\d{8,15}$/.test(phone)) {
            showToast(`Invalid ${recipientType} phone number! Must be 8-15 digits.`);
            return;
        }

        const listNumber = document.getElementById('listNumber').value || '-';
        const senderName = document.getElementById('senderName').value || '-';
        const receiverName = document.getElementById('receiverName').value || '-';
        const senderPhone = document.getElementById('senderPhone').value.trim() || '-';
        const receiverPhone = document.getElementById('receiverPhone').value.trim() || '-';
        const pickupLocation = document.getElementById('pickupLocation').value || '-';
        const deliveryLocation = document.getElementById('deliveryLocation').value || '-';
        const numberOfBoxes = document.getElementById('numberOfBoxes').value || '0';
        const pricePerBox = document.getElementById('pricePerBox').value || '0';
        const dimLength = document.getElementById('dimLength').value || '0';
        const dimWidth = document.getElementById('dimWidth').value || '0';
        const dimHeight = document.getElementById('dimHeight').value || '0';
        const pricePerCubic = document.getElementById('pricePerCubic').value || '0';
        const displayBoxTotal = document.getElementById('displayBoxTotal').textContent;
        const displayCubicTotal = document.getElementById('displayCubicTotal').textContent;
        const selectedMethod = document.getElementById('selectedMethodValue').value || 'None';
        const finalCharge = document.getElementById('displayFinalCharge').textContent;
        const driverName = document.getElementById('driverName').value || '-';
        const status = document.getElementById('status').value || '-';

        const message = `*Order Details - #${listNumber}*

*Sender:* ${senderName} (${senderPhone})
*Receiver:* ${receiverName} (${receiverPhone})
*Pickup:* ${pickupLocation}
*Delivery:* ${deliveryLocation}

*Boxes Info:* ${numberOfBoxes} Boxes ($${pricePerBox}/ea)
*Box Total:* ${displayBoxTotal}

*Cubic Info:* ${dimLength}L × ${dimWidth}W × ${dimHeight}H ($${pricePerCubic}/m³)
*Cubic Total:* ${displayCubicTotal}

*Method Selected:* ${selectedMethod}
*Final Charge:* ${finalCharge}

*Driver:* ${driverName}
*Status:* ${status}`;

        const encodedMsg = encodeURIComponent(message);
        const waUrl = `https://wa.me/${phone}?text=${encodedMsg}`;
        window.open(waUrl, '_blank');
    };

    document.getElementById('sendSenderWhBtn').addEventListener('click', () => sendWhatsApp('sender'));
    document.getElementById('sendReceiverWhBtn').addEventListener('click', () => sendWhatsApp('receiver'));

    // ---- Drivers Logic ----
    
    driverForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('newDriverName').value.trim();
        const vehicle = document.getElementById('newVehicleNumber').value.trim();
        
        // Prevent Duplicates Check
        const isDuplicate = drivers.some(d => d.name.toLowerCase() === name.toLowerCase() && d.vehicle.toLowerCase() === vehicle.toLowerCase());
        if (isDuplicate) {
            showToast("This Driver and Vehicle combination already exists!");
            return;
        }

        drivers.push({
            id: Date.now().toString(),
            name: name,
            vehicle: vehicle,
            expenses: { fuel: '', repair: '', oil: '', salary: '', total: '' } // init expenses
        });

        saveDrivers();
        driverForm.reset();
    });

    const populateDriverDropdown = () => {
        const select = document.getElementById('driverName');
        // Keep the first placeholder but remove others
        select.innerHTML = '<option value="">Select a driver...</option>';
        drivers.forEach(driver => {
            const opt = document.createElement('option');
            const descriptor = `${driver.name} (${driver.vehicle})`;
            opt.value = descriptor;
            opt.textContent = descriptor;
            select.appendChild(opt);
        });
    };

    const renderDrivers = () => {
        const tbody = document.getElementById('driversTableBody');
        const dEmptyState = document.getElementById('emptyDriverState');
        const table = document.getElementById('driversTable');
        
        tbody.innerHTML = '';
        
        if(drivers.length === 0) {
            dEmptyState.classList.remove('hidden');
            table.classList.add('hidden');
            return;
        }
        
        dEmptyState.classList.add('hidden');
        table.classList.remove('hidden');

        drivers.forEach(driver => {
            const descriptor = `${driver.name} (${driver.vehicle})`;
            // Compute Summary stats
            let completedOrders = 0;
            let totalEarned = 0;

            orders.forEach(order => {
                if (order.driverName === descriptor && order.status === 'Completed') {
                    completedOrders++;
                    totalEarned += parseFloat(order.totalPrice || 0);
                }
            });

            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${driver.name}</strong></td>
                <td>${driver.vehicle}</td>
                <td>${completedOrders}</td>
                <td>$${totalEarned.toFixed(2)}</td>
                <td>$${parseFloat((driver.expenses && driver.expenses.total) || 0).toFixed(2)}</td>
                <td><strong style="color: ${(totalEarned - parseFloat((driver.expenses && driver.expenses.total) || 0)) >= 0 ? 'var(--success)' : 'var(--danger)'}">$${(totalEarned - parseFloat((driver.expenses && driver.expenses.total) || 0)).toFixed(2)}</strong></td>
                <td class="actions-col">
                    <div class="actions-cell">
                        <button class="btn-action complete" onclick="openExpenses('${driver.id}')" title="View Expenses">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
                        </button>
                        <button class="btn-action delete" onclick="deleteDriver('${driver.id}')" title="Delete Driver">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    window.deleteDriver = (id) => {
        drivers = drivers.filter(d => d.id !== id);
        saveDrivers();
    };

    // Expenses Modal Logic
    const calculateDriverExpenses = () => {
        const fuel = parseFloat(document.getElementById('expFuel').value) || 0;
        const repair = parseFloat(document.getElementById('expRepair').value) || 0;
        const oil = parseFloat(document.getElementById('expOil').value) || 0;
        const salary = parseFloat(document.getElementById('expSalary').value) || 0;
        
        const totalExp = fuel + repair + oil + salary;
        document.getElementById('expTotal').value = totalExp.toFixed(2);

        // Update live summary
        const id = document.getElementById('expenseDriverId').value;
        const driver = drivers.find(d => d.id === id);
        if (driver) {
            const descriptor = `${driver.name} (${driver.vehicle})`;
            let totalEarned = 0;
            orders.forEach(order => {
                if (order.driverName === descriptor && order.status === 'Completed') {
                    totalEarned += parseFloat(order.totalPrice || 0);
                }
            });
            const netProfit = totalEarned - totalExp;
            
            document.getElementById('summaryIncome').textContent = `$${totalEarned.toFixed(2)}`;
            document.getElementById('summaryExpenses').textContent = `$${totalExp.toFixed(2)}`;
            document.getElementById('summaryNetProfit').textContent = `$${netProfit.toFixed(2)}`;
            document.getElementById('summaryNetProfit').style.color = netProfit >= 0 ? 'var(--success)' : 'var(--danger)';
        }
    };

    ['expFuel', 'expRepair', 'expOil', 'expSalary'].forEach(id => {
        const el = document.getElementById(id);
        if(el) el.addEventListener('input', calculateDriverExpenses);
    });

    expensesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const id = document.getElementById('expenseDriverId').value;
        const driverIndex = drivers.findIndex(d => d.id === id);
        
        if (driverIndex > -1) {
            drivers[driverIndex].expenses = {
                fuel: document.getElementById('expFuel').value,
                repair: document.getElementById('expRepair').value,
                oil: document.getElementById('expOil').value,
                salary: document.getElementById('expSalary').value,
                total: document.getElementById('expTotal').value
            };
            saveDrivers();
            showToast("Expenses saved successfully!");
            closeModal(expensesModal);
        }
    });

    window.openExpenses = (id) => {
        const driver = drivers.find(d => d.id === id);
        if (driver) {
            document.getElementById('expenseDriverId').value = driver.id;
            document.getElementById('expensesModalTitle').textContent = `${driver.name} - Expenses`;
            
            const exp = driver.expenses || { fuel: '', repair: '', oil: '', salary: '', total: '' };
            
            document.getElementById('expFuel').value = exp.fuel;
            document.getElementById('expRepair').value = exp.repair;
            document.getElementById('expOil').value = exp.oil;
            document.getElementById('expSalary').value = exp.salary;
            document.getElementById('expTotal').value = exp.total;
            
            calculateDriverExpenses();
            openModal(expensesModal);
        }
    };

    // ---- Entity Management Logic ----

    const saveEntities = () => {
        localStorage.setItem('transportEntities', JSON.stringify(entities));
        populateEntityDropdowns();
    };

    const populateEntityDropdowns = () => {
        const populateSelect = (selectId, dataArray, placeholderText) => {
            const select = document.getElementById(selectId);
            if (!select) return;
            select.innerHTML = `<option value="">${placeholderText}</option>`;
            dataArray.forEach(item => {
                const name = typeof item === 'object' ? item.name : item;
                const opt = document.createElement('option');
                opt.value = name;
                opt.textContent = name;
                select.appendChild(opt);
            });
        };

        populateSelect('senderName', entities.senders, 'Select a sender...');
        populateSelect('receiverName', entities.receivers, 'Select a receiver...');
    };

    document.getElementById('senderName').addEventListener('change', (e) => {
        const val = e.target.value;
        const entity = entities.senders.find(x => (typeof x === 'object' ? x.name : x) === val);
        document.getElementById('senderPhone').value = (entity && entity.phone) ? entity.phone : '';
    });

    document.getElementById('receiverName').addEventListener('change', (e) => {
        const val = e.target.value;
        const entity = entities.receivers.find(x => (typeof x === 'object' ? x.name : x) === val);
        document.getElementById('receiverPhone').value = (entity && entity.phone) ? entity.phone : '';
    });

    window.openEntityModal = (type, displayName) => {
        document.getElementById('currentEntityType').value = type;
        document.getElementById('entityModalTitle').textContent = `Manage ${displayName}`;
        document.getElementById('entityInputLabel').textContent = `New ${displayName.slice(0, -1)} Name`;
        renderEntitiesForm(type);
        openModal(entityModal);
    };

    const renderEntitiesForm = (type) => {
        const tbody = document.getElementById('entitiesTableBody');
        const eEmptyState = document.getElementById('emptyEntityState');
        const table = document.getElementById('entitiesTable');
        
        tbody.innerHTML = '';
        
        const data = entities[type] || [];
        
        if(data.length === 0) {
            eEmptyState.classList.remove('hidden');
            table.classList.add('hidden');
            return;
        }
        
        eEmptyState.classList.add('hidden');
        table.classList.remove('hidden');

        data.forEach((item, index) => {
            const name = typeof item === 'object' ? item.name : item;
            const phone = typeof item === 'object' && item.phone ? item.phone : '-';
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><strong>${name}</strong></td>
                <td>${phone}</td>
                <td class="actions-col">
                    <div class="actions-cell">
                        <button class="btn-action delete" onclick="deleteEntity('${type}', ${index})" title="Delete Name">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                        </button>
                    </div>
                </td>
            `;
            tbody.appendChild(tr);
        });
    };

    entityForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const type = document.getElementById('currentEntityType').value;
        const nameInput = document.getElementById('newEntityName');
        const phoneInput = document.getElementById('newEntityPhone');
        const name = nameInput.value.trim();
        const phone = phoneInput.value.trim();
        
        if (!/^\d{8,15}$/.test(phone)) {
            showToast("Phone must be 8 to 15 digits.");
            return;
        }

        const isDuplicate = entities[type].some(x => (typeof x === 'object' ? x.name : x) === name);
        if (isDuplicate) {
            showToast("This name already exists in the list!");
            return;
        }

        entities[type].push({ name, phone });
        saveEntities();
        renderEntitiesForm(type); // Live update current visible table
        nameInput.value = ''; 
        phoneInput.value = '';
    });

    window.deleteEntity = (type, index) => {
        entities[type].splice(index, 1);
        saveEntities();
        renderEntitiesForm(type); // Live update view post-deletion
    };

    // Initialization
    populateDriverDropdown();
    populateEntityDropdowns();
    checkAuth();
});
