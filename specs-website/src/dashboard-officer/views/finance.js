// --- IMPORTS ---
import { databases } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';
import Chart from 'chart.js/auto';

// --- SVG ICON IMPORTS ---
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import inbox from 'bootstrap-icons/icons/inbox.svg';
import calendarRange from 'bootstrap-icons/icons/calendar-range.svg';
import pencilSquare from 'bootstrap-icons/icons/pencil-square.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import checkLg from 'bootstrap-icons/icons/check-lg.svg';
import xLg from 'bootstrap-icons/icons/x-lg.svg';
import arrowUp from 'bootstrap-icons/icons/arrow-up.svg';
import arrowDown from 'bootstrap-icons/icons/arrow-down.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import wallet2 from 'bootstrap-icons/icons/wallet2.svg';
import graphUpArrow from 'bootstrap-icons/icons/graph-up-arrow.svg';
import graphDownArrow from 'bootstrap-icons/icons/graph-down-arrow.svg';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_REVENUE = import.meta.env.VITE_COLLECTION_ID_REVENUE;
const COLLECTION_ID_EXPENSES = import.meta.env.VITE_COLLECTION_ID_EXPENSES;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const STORAGE_KEY_DATE_RANGE = 'finance_date_range_v2';

// --- STATE MANAGEMENT ---
let financeChart = null;

// --- HELPERS ---
const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

function getStoredDateRange() {
    const stored = localStorage.getItem(STORAGE_KEY_DATE_RANGE);
    if (stored) { try { return JSON.parse(stored); } catch (e) {} }
    const end = new Date();
    const start = new Date();
    start.setMonth(start.getMonth() - 11); // Default last 12 months
    return { startYear: start.getFullYear(), startMonth: start.getMonth(), endYear: end.getFullYear(), endMonth: end.getMonth() };
}

function setStoredDateRange(sY, sM, eY, eM) {
    localStorage.setItem(STORAGE_KEY_DATE_RANGE, JSON.stringify({ startYear: sY, startMonth: sM, endYear: eY, endMonth: eM }));
}

// --- TEMPLATES ---

function createSummaryCard(title, value, type) {
    let icon, colorClass, bgClass;
    if (type === 'revenue') { icon = graphUpArrow; colorClass = 'text-success'; bgClass = 'bg-success-subtle'; }
    else if (type === 'expense') { icon = graphDownArrow; colorClass = 'text-danger'; bgClass = 'bg-danger-subtle'; }
    else { icon = wallet2; colorClass = value >= 0 ? 'text-primary' : 'text-danger'; bgClass = value >= 0 ? 'bg-primary-subtle' : 'bg-danger-subtle'; }

    return `
        <div class="col-md-4">
            <div class="card border-0 shadow-sm h-100">
                <div class="card-body p-4 d-flex align-items-center">
                    <div class="${bgClass} ${colorClass} rounded-circle p-3 me-3 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px;">
                        <img src="${icon}" style="width: 1.5rem; height: 1.5rem;" class="${type === 'net' && value < 0 ? 'text-danger' : colorClass}">
                    </div>
                    <div>
                        <h6 class="text-muted text-uppercase small fw-bold mb-1" style="letter-spacing: 0.5px;">${title}</h6>
                        <h3 class="fw-bold mb-0 ${colorClass}">${formatCurrency(value)}</h3>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function createActivityCard(activity) {
    const net = activity.totalRevenue - activity.totalExpense;
    const isPositive = net >= 0;
    const badgeClass = activity.isEvent ? 'bg-primary-subtle text-primary border-primary-subtle' : 'bg-info-subtle text-info border-info-subtle';
    const netClass = isPositive ? 'text-success' : 'text-danger';

    return `
        <div class="col">
            <div class="card h-100 border-0 shadow-sm hover-lift finance-activity-card group" data-group-key="${activity.key}" data-group-name="${activity.name}" data-is-event="${activity.isEvent}" style="cursor:pointer; transition: all 0.2s;">
                <div class="card-body p-4 d-flex flex-column">
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <span class="badge ${badgeClass} border px-3 py-2 rounded-pill fw-bold text-uppercase" style="font-size: 0.65rem; letter-spacing: 0.5px;">
                            ${activity.isEvent ? 'Event' : 'Activity'}
                        </span>
                        <small class="text-muted fw-medium" style="font-size: 0.75rem;">${new Date(activity.lastDate).toLocaleDateString()}</small>
                    </div>
                    
                    <h5 class="card-title fw-bold text-dark mb-4 text-truncate" title="${activity.name}">${activity.name}</h5>
                    
                    <div class="mt-auto">
                        <div class="d-flex justify-content-between mb-2 small">
                            <span class="text-muted">Revenue</span>
                            <span class="fw-bold text-success">+${formatCurrency(activity.totalRevenue)}</span>
                        </div>
                         <div class="d-flex justify-content-between mb-3 small">
                            <span class="text-muted">Expense</span>
                            <span class="fw-bold text-danger">-${formatCurrency(activity.totalExpense)}</span>
                        </div>
                        <div class="pt-3 border-top border-light d-flex justify-content-between align-items-center">
                            <span class="small fw-bold text-uppercase text-muted" style="letter-spacing: 0.5px;">Net</span>
                            <span class="h6 mb-0 fw-bold ${netClass}">${isPositive ? '+' : ''}${formatCurrency(net)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * UPDATED: Force Scroll on Mobile with Card Alternative
 */
function getDetailViewHTML(groupName, revenues, expenses) {
    const createRow = (item, type) => {
        const collectionId = type === 'revenue' ? COLLECTION_ID_REVENUE : COLLECTION_ID_EXPENSES;
        const date = new Date(type === 'revenue' ? item.date_earned : item.date_buy).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const isRev = type === 'revenue';

        return `
        <tr data-doc-id="${item.$id}" data-collection-id="${collectionId}" class="align-middle">
            <td data-field="date" data-original-value="${isRev ? item.date_earned : item.date_buy}" class="text-secondary ps-4 py-3">${date}</td>
            <td data-field="name" data-original-value="${item.name}" class="fw-semibold text-dark py-3 text-truncate" style="max-width: 150px;">${item.name}</td>
            <td data-field="quantity" data-original-value="${item.quantity}" class="text-secondary py-3">${item.quantity}</td>
            <td data-field="price" data-original-value="${item.price}" class="text-secondary py-3">${formatCurrency(item.price)}</td>
            <td class="${isRev ? 'text-success' : 'text-danger'} fw-bold text-end pe-4 py-3">${isRev ? '+' : '-'}${formatCurrency(item.price * item.quantity)}</td>
            <td class="text-end pe-4 py-3">
                <div class="action-buttons opacity-50 group-hover-opacity-100 transition-all">
                    <button class="btn btn-sm btn-link text-primary p-0 me-2 edit-btn"><img src="${pencilSquare}" width="14"></button>
                    <button class="btn btn-sm btn-link text-danger p-0 delete-btn"><img src="${trash}" width="14"></button>
                </div>
                <div class="edit-actions gap-1 justify-content-end" style="display:none;">
                    <button class="btn btn-sm btn-success p-1 save-btn"><img src="${checkLg}" width="14" style="filter: invert(1)"></button>
                    <button class="btn btn-sm btn-secondary p-1 cancel-btn"><img src="${xLg}" width="14" style="filter: invert(1)"></button>
                </div>
            </td>
        </tr>`;
    };
    
    // Mobile card for finance items
    const createMobileCard = (item, type) => {
        const collectionId = type === 'revenue' ? COLLECTION_ID_REVENUE : COLLECTION_ID_EXPENSES;
        const date = new Date(type === 'revenue' ? item.date_earned : item.date_buy).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        const isRev = type === 'revenue';
        const total = item.price * item.quantity;
        
        return `
        <div class="mobile-payment-item" data-doc-id="${item.$id}" data-collection-id="${collectionId}">
            <div class="item-header">
                <span class="item-name">${item.name}</span>
                <span class="item-amount ${isRev ? 'text-success' : 'text-danger'}">${isRev ? '+' : '-'}${formatCurrency(total)}</span>
            </div>
            <div class="item-details">
                <div class="detail-row">
                    <span class="label">Date</span>
                    <span class="value">${date}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Price</span>
                    <span class="value">${formatCurrency(item.price)}</span>
                </div>
                <div class="detail-row">
                    <span class="label">Qty</span>
                    <span class="value">${item.quantity}</span>
                </div>
            </div>
            <div class="item-actions">
                <button class="btn btn-outline-primary btn-sm edit-btn flex-grow-1">
                    <img src="${pencilSquare}" width="12" class="me-1"> Edit
                </button>
                <button class="btn btn-outline-danger btn-sm delete-btn">
                    <img src="${trash}" width="12">
                </button>
            </div>
        </div>`;
    };

    return `
        <div class="finance-detail-view animate-fade-in-up container-fluid px-0">
            <div class="d-flex align-items-center gap-3 mb-4 mb-md-5">
                <button id="backToFinanceMainBtn" class="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-scale" style="width: 42px; height: 42px;">
                    <img src="${arrowUp}" style="transform: rotate(-90deg); width: 1rem; opacity: 0.6;">
                </button>
                <div>
                     <h2 class="h4 fw-bold m-0 text-dark">${groupName}</h2>
                     <p class="text-muted m-0 small">Transaction Breakdown</p>
                </div>
            </div>
            
            <div class="d-flex flex-column gap-4 pb-5">
                <!-- Revenue Section -->
                <div class="card border-0 shadow-sm overflow-hidden">
                    <div class="card-header bg-success-subtle border-0 py-3 px-4 d-flex align-items-center justify-content-between">
                        <div class="d-flex align-items-center gap-2">
                            <div class="bg-white rounded-circle p-2 d-flex"><img src="${arrowUp}" class="text-success" width="14"></div>
                            <h6 class="fw-bold m-0 text-success-emphasis">Revenue</h6>
                        </div>
                        <span class="badge bg-success text-white rounded-pill px-2 py-1" style="font-size: 0.7rem;">${revenues.length} Items</span>
                    </div>
                    
                    <!-- Desktop Table -->
                    <div class="card-body p-0 table-responsive desktop-table" style="overflow-x: auto;">
                        <table class="table table-sm table-hover mb-0 align-middle text-nowrap" style="min-width: 800px; font-size: 0.85rem;">
                            <thead class="bg-light text-secondary text-uppercase">
                                <tr>
                                    <th class="ps-4 py-3 fw-bold" style="width: 15%">Date</th>
                                    <th class="py-3 fw-bold" style="width: 30%">Item Name</th>
                                    <th class="py-3 fw-bold" style="width: 10%">Qty</th>
                                    <th class="py-3 fw-bold" style="width: 15%">Price</th>
                                    <th class="text-end pe-4 py-3 fw-bold" style="width: 15%">Total</th>
                                    <th class="text-end pe-4 py-3 fw-bold" style="width: 15%">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="border-top-0">
                                ${revenues.length ? revenues.map(r => createRow(r, 'revenue')).join('') : '<tr><td colspan="6" class="text-center text-muted py-4 small">No revenue records found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Mobile Cards -->
                    <div class="mobile-officer-card-list p-3">
                        ${revenues.length 
                            ? revenues.map(r => createMobileCard(r, 'revenue')).join('') 
                            : '<div class="text-center text-muted py-4 small">No revenue records found.</div>'}
                    </div>
                </div>

                <!-- Expense Section -->
                <div class="card border-0 shadow-sm overflow-hidden">
                    <div class="card-header bg-danger-subtle border-0 py-3 px-4 d-flex align-items-center justify-content-between">
                         <div class="d-flex align-items-center gap-2">
                            <div class="bg-white rounded-circle p-2 d-flex"><img src="${arrowDown}" class="text-danger" width="14"></div>
                            <h6 class="fw-bold m-0 text-danger-emphasis">Expense</h6>
                        </div>
                        <span class="badge bg-danger text-white rounded-pill px-2 py-1" style="font-size: 0.7rem;">${expenses.length} Items</span>
                    </div>
                    
                    <!-- Desktop Table -->
                    <div class="card-body p-0 table-responsive desktop-table" style="overflow-x: auto;">
                         <table class="table table-sm table-hover mb-0 align-middle text-nowrap" style="min-width: 800px; font-size: 0.85rem;">
                            <thead class="bg-light text-secondary text-uppercase">
                                <tr>
                                    <th class="ps-4 py-3 fw-bold" style="width: 15%">Date</th>
                                    <th class="py-3 fw-bold" style="width: 30%">Item Name</th>
                                    <th class="py-3 fw-bold" style="width: 10%">Qty</th>
                                    <th class="py-3 fw-bold" style="width: 15%">Price</th>
                                    <th class="text-end pe-4 py-3 fw-bold" style="width: 15%">Total</th>
                                    <th class="text-end pe-4 py-3 fw-bold" style="width: 15%">Actions</th>
                                </tr>
                            </thead>
                            <tbody class="border-top-0">
                                ${expenses.length ? expenses.map(e => createRow(e, 'expense')).join('') : '<tr><td colspan="6" class="text-center text-muted py-4 small">No expense records found.</td></tr>'}
                            </tbody>
                        </table>
                    </div>
                    
                    <!-- Mobile Cards -->
                    <div class="mobile-officer-card-list p-3">
                        ${expenses.length 
                            ? expenses.map(e => createMobileCard(e, 'expense')).join('') 
                            : '<div class="text-center text-muted py-4 small">No expense records found.</div>'}
                    </div>
                </div>
            </div>
        </div>`;
}

// --- LOGIC ---

function processDataForChart(revenues, expenses, start, end) {
    const data = {};
    let cursor = new Date(start);
    while (cursor <= end) {
        data[`${cursor.getFullYear()}-${String(cursor.getMonth()).padStart(2,'0')}`] = 0;
        cursor.setMonth(cursor.getMonth() + 1);
    }
    const add = (items, mult) => items.forEach(i => {
        const d = new Date(i.date_earned || i.date_buy);
        const k = `${d.getFullYear()}-${String(d.getMonth()).padStart(2,'0')}`;
        if (data[k] !== undefined) data[k] += (i.price * i.quantity) * mult;
    });
    add(revenues, 1); add(expenses, -1);
    return { labels: Object.keys(data), data: Object.values(data) };
}

function renderChart(chartData) {
    const ctx = document.getElementById('financeChart')?.getContext('2d');
    if (!ctx) return;
    if (financeChart) financeChart.destroy();

    financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels.map(l => new Date(...l.split('-')).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })),
            datasets: [{
                label: 'Net Income',
                data: chartData.data,
                backgroundColor: chartData.data.map(d => d >= 0 ? '#10b981' : '#ef4444'),
                borderRadius: 4,
                borderSkipped: false,
                barThickness: 20
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: '#1f2937',
                    padding: 10,
                    titleFont: { family: "'Poppins', sans-serif", size: 12 },
                    bodyFont: { family: "'Poppins', sans-serif", size: 13, weight: 'bold' },
                    cornerRadius: 6,
                    displayColors: false,
                    callbacks: { label: (c) => formatCurrency(c.raw) }
                }
            },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [4, 4], color: '#f3f4f6' }, ticks: { font: { family: "'Poppins', sans-serif", size: 10 }, color: '#9ca3af', callback: v => v >= 1000 ? v/1000 + 'k' : v } },
                x: { grid: { display: false }, ticks: { font: { family: "'Poppins', sans-serif", size: 10 }, color: '#9ca3af' } }
            }
        }
    });
}

function groupTransactions(revs, exps, eventMap) {
    const acts = {};
    const proc = (arr, type) => arr.forEach(i => {
        const isEv = i.isEvent;
        const k = isEv ? i.event : (i.activity_name || i.activity);
        if (!k) return;
        if (!acts[k]) acts[k] = { key: k, name: isEv ? (eventMap[i.event] || 'Unknown Event') : k, isEvent: isEv, totalRevenue: 0, totalExpense: 0, lastDate: new Date(0) };

        const d = new Date(type === 'rev' ? i.date_earned : i.date_buy);
        if (d > acts[k].lastDate) acts[k].lastDate = d;
        acts[k][type === 'rev' ? 'totalRevenue' : 'totalExpense'] += i.price * i.quantity;
    });
    proc(revs, 'rev'); proc(exps, 'exp');
    return Object.values(acts).sort((a, b) => b.lastDate - a.lastDate);
}

// --- EVENT LISTENERS ---

function attachDetailViewListeners(user, userLookup) {
    const view = document.querySelector('.finance-detail-view');
    if (!view) return;

    view.addEventListener('click', async (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;
        const row = btn.closest('tr');
        if (!row) return;

        const { docId, collectionId } = row.dataset;

        if (btn.classList.contains('delete-btn')) {
            if (confirm('Permanently delete this item?')) {
                try { await databases.deleteDocument(DATABASE_ID, collectionId, docId); row.remove(); }
                catch (err) { alert('Delete failed.'); }
            }
        } else if (btn.classList.contains('edit-btn')) {
            row.classList.add('table-active'); // Highlight
            row.querySelectorAll('td[data-field]').forEach(td => {
                const val = td.dataset.originalValue;
                const field = td.dataset.field;
                const type = field === 'date' ? 'datetime-local' : (field === 'name' ? 'text' : 'number');
                const v = field === 'date' ? new Date(val).toISOString().slice(0, 16) : val;
                td.innerHTML = `<input type="${type}" class="form-control form-control-sm border-secondary-subtle" value="${v}" ${field !== 'name' ? 'min="0.01"' : ''}>`;
            });
            row.querySelector('.action-buttons').style.display = 'none';
            row.querySelector('.edit-actions').style.display = 'flex';
        } else if (btn.classList.contains('cancel-btn')) {
            row.classList.remove('table-active');
            row.querySelectorAll('td[data-field]').forEach(td => {
                const val = td.dataset.originalValue;
                const field = td.dataset.field;
                if(field === 'date') td.innerHTML = new Date(val).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
                else if(field === 'price') td.innerHTML = formatCurrency(val);
                else td.textContent = val;
            });
            row.querySelector('.action-buttons').style.display = 'block';
            row.querySelector('.edit-actions').style.display = 'none';
        } else if (btn.classList.contains('save-btn')) {
            btn.disabled = true;
            const updates = {};
            row.querySelectorAll('td[data-field]').forEach(td => {
                const val = td.querySelector('input').value;
                const field = td.dataset.field;
                updates[field === 'date' ? (collectionId === COLLECTION_ID_REVENUE ? 'date_earned' : 'date_buy') : field] = (field === 'price') ? parseFloat(val) : (field === 'quantity' ? parseInt(val) : val);
            });
            try {
                await databases.updateDocument(DATABASE_ID, collectionId, docId, updates);
                Object.entries(updates).forEach(([k, v]) => {
                    const f = k === 'date_earned' || k === 'date_buy' ? 'date' : k;
                    const cell = row.querySelector(`td[data-field="${f}"]`);
                    if(cell) cell.dataset.originalValue = v;
                });
                row.querySelector('.cancel-btn').click();
            } catch (err) { alert('Update failed.'); } finally { btn.disabled = false; }
        }
    });
}

function attachMainListeners(currentUser, userLookup, data) {
    const container = document.getElementById('finance-view-container');
    const modalContainer = document.getElementById('finance-modal-fab-container');

    // 1. Render Modal & FAB
    const years = Array.from({length: 6}, (_, i) => new Date().getFullYear() - 5 + i).map(y => `<option value="${y}">${y}</option>`).join('');
    const months = Array.from({length: 12}, (_, i) => `<option value="${i}">${new Date(0, i).toLocaleString('default', {month:'long'})}</option>`).join('');
    const eventOptions = data.events.map(e => `<option value="${e.$id}">${e.event_name}</option>`).join('');

    modalContainer.innerHTML = `
        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg hover-scale d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1040;" data-bs-toggle="modal" data-bs-target="#addTxnModal">
            <img src="${plusLg}" style="width: 1.5rem; filter: invert(1);">
        </button>

        <div class="modal fade" id="addTxnModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <form id="addTxnForm">
                        <div class="modal-header border-0 pb-0 pt-4 px-4"><h5 class="modal-title fw-bold">New Transaction</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body p-4">
                            <div class="bg-light rounded-3 p-3 mb-3 border d-flex gap-3 justify-content-center">
                                <div class="form-check"><input class="form-check-input" type="radio" name="type" id="tExp" value="expense" checked><label class="form-check-label fw-medium" for="tExp">Expense</label></div>
                                <div class="form-check"><input class="form-check-input" type="radio" name="type" id="tRev" value="revenue"><label class="form-check-label fw-medium" for="tRev">Revenue</label></div>
                            </div>
                            <div class="mb-3"><label class="form-label small fw-bold text-muted">ITEM NAME</label><input type="text" name="name" class="form-control" required placeholder="e.g. Venue Rental"></div>
                            <div class="row g-3 mb-3">
                                <div class="col-7"><label class="form-label small fw-bold text-muted">PRICE</label><input type="number" name="price" class="form-control" step="0.01" min="0" required></div>
                                <div class="col-5"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" name="qty" class="form-control" value="1" min="1" required></div>
                            </div>
                            <div class="mb-3"><label class="form-label small fw-bold text-muted">DATE</label><input type="datetime-local" name="date" class="form-control" required></div>
                            <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" id="isEvent"><label class="form-check-label" for="isEvent">Linked to Event</label></div>
                            <div id="actGroup" class="mb-3"><label class="form-label small fw-bold text-muted">ACTIVITY NAME</label><input type="text" id="actName" class="form-control" placeholder="e.g. General Assembly"></div>
                            <div id="evtGroup" class="mb-3 d-none"><label class="form-label small fw-bold text-muted">SELECT EVENT</label><select id="evtSelect" class="form-select">${eventOptions}</select></div>
                        </div>
                        <div class="modal-footer border-0 pt-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Save</button></div>
                    </form>
                </div>
            </div>
        </div>

        <div class="modal fade" id="dateFilterModal" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-sm">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <form id="dateFilterForm">
                        <div class="modal-header border-0 pb-0 pt-4 px-4"><h5 class="modal-title fw-bold">Filter Period</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
                        <div class="modal-body p-4">
                            <div class="mb-3"><label class="small fw-bold text-primary mb-1">FROM</label><div class="d-flex gap-2"><select id="sM" class="form-select">${months}</select><select id="sY" class="form-select">${years}</select></div></div>
                            <div class="mb-0"><label class="small fw-bold text-primary mb-1">TO</label><div class="d-flex gap-2"><select id="eM" class="form-select">${months}</select><select id="eY" class="form-select">${years}</select></div></div>
                        </div>
                        <div class="modal-footer border-0 pt-0 pb-4 px-4"><button type="submit" class="btn btn-primary w-100 rounded-pill fw-bold">Apply</button></div>
                    </form>
                </div>
            </div>
        </div>
    `;

    // 2. Event Handlers
    const addModal = new Modal(document.getElementById('addTxnModal'));
    const dateModal = new Modal(document.getElementById('dateFilterModal'));

    // Date Filter Setup
    document.getElementById('dateFilterModal').addEventListener('show.bs.modal', () => {
        const { startYear, startMonth, endYear, endMonth } = getStoredDateRange();
        document.getElementById('sY').value = startYear; document.getElementById('sM').value = startMonth;
        document.getElementById('eY').value = endYear; document.getElementById('eM').value = endMonth;
    });

    document.getElementById('dateFilterForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const sY = parseInt(document.getElementById('sY').value), sM = parseInt(document.getElementById('sM').value);
        const eY = parseInt(document.getElementById('eY').value), eM = parseInt(document.getElementById('eM').value);
        if (new Date(eY, eM) < new Date(sY, sM)) return alert('End date cannot be before start date.');
        setStoredDateRange(sY, sM, eY, eM);
        dateModal.hide();
        renderFinanceView(userLookup, currentUser);
    });

    // Add Transaction Logic
    document.getElementById('isEvent').addEventListener('change', (e) => {
        document.getElementById('actGroup').classList.toggle('d-none', e.target.checked);
        document.getElementById('evtGroup').classList.toggle('d-none', !e.target.checked);
        document.getElementById('actName').required = !e.target.checked;
        document.getElementById('evtSelect').required = e.target.checked;
    });

    document.getElementById('addTxnForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        btn.disabled = true; btn.textContent = 'Saving...';

        try {
            const formData = new FormData(e.target);
            const isEvent = document.getElementById('isEvent').checked;
            const payload = {
                name: formData.get('name'), price: parseFloat(formData.get('price')), quantity: parseInt(formData.get('qty')),
                isEvent, recorder: currentUser.$id,
                [formData.get('type') === 'revenue' ? 'date_earned' : 'date_buy']: formData.get('date'),
                [isEvent ? 'event' : (formData.get('type') === 'revenue' ? 'activity' : 'activity_name')]: isEvent ? document.getElementById('evtSelect').value : document.getElementById('actName').value
            };

            await databases.createDocument(DATABASE_ID, formData.get('type') === 'revenue' ? COLLECTION_ID_REVENUE : COLLECTION_ID_EXPENSES, ID.unique(), payload);
            addModal.hide();
            renderFinanceView(userLookup, currentUser);
        } catch (err) { alert('Error: ' + err.message); } finally { btn.disabled = false; btn.textContent = 'Save'; }
    });

    // Search
    const allActs = groupTransactions(data.revenues, data.expenses, data.eventLookup);
    document.getElementById('finSearch')?.addEventListener('input', (e) => {
        const term = e.target.value.toLowerCase();
        const filtered = allActs.filter(a => a.name.toLowerCase().includes(term));
        const grid = document.getElementById('finance-cards-container');
        grid.innerHTML = filtered.length ? filtered.map(createActivityCard).join('') : '<div class="col-12 py-5 text-center text-muted">No matching activities found.</div>';
    });

    // Navigation
    container.addEventListener('click', async (e) => {
        const card = e.target.closest('.finance-activity-card');
        if (!card) return;

        container.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-50 py-5"><div class="spinner-border text-primary"></div></div>`;
        try {
            const { groupKey, isEvent, groupName } = card.dataset;
            const isEv = isEvent === 'true';

            const [revs, exps] = await Promise.all([
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [Query.equal(isEv ? 'event' : 'activity', groupKey), Query.limit(500)]),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [Query.equal(isEv ? 'event' : 'activity_name', groupKey), Query.limit(500)])
            ]);

            container.innerHTML = getDetailViewHTML(groupName, revs.documents, exps.documents);
            attachDetailViewListeners(currentUser, userLookup);
            document.getElementById('backToFinanceMainBtn').addEventListener('click', () => renderFinanceView(userLookup, currentUser));
        } catch (err) { alert('Error loading details.'); renderFinanceView(userLookup, currentUser); }
    });
}

// --- MAIN EXPORT ---

export default async function renderFinanceView(userLookup, currentUser) {
    const main = document.getElementById("dashboard-content");
    main.innerHTML = `<div id="finance-view-container" class="container-fluid py-4 px-md-5"></div><div id="finance-modal-fab-container"></div>`;

    const container = document.getElementById('finance-view-container');
    container.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary"></div></div>`;

    try {
        const { startYear, startMonth, endYear, endMonth } = getStoredDateRange();
        const start = new Date(startYear, startMonth, 1);
        const end = new Date(endYear, endMonth + 1, 0, 23, 59, 59);

        const [rRes, eRes, evRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [Query.greaterThanEqual('date_earned', start.toISOString()), Query.lessThanEqual('date_earned', end.toISOString()), Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [Query.greaterThanEqual('date_buy', start.toISOString()), Query.lessThanEqual('date_buy', end.toISOString()), Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.limit(500)])
        ]);

        const eventLookup = evRes.documents.reduce((a, e) => ({...a, [e.$id]: e.event_name}), {});
        const acts = groupTransactions(rRes.documents, eRes.documents, eventLookup);

        // Calculate Totals
        const totalRev = rRes.documents.reduce((s, i) => s + (i.price * i.quantity), 0);
        const totalExp = eRes.documents.reduce((s, i) => s + (i.price * i.quantity), 0);

        container.innerHTML = `
            <div class="finance-overview animate-fade-in-up">
                <div class="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-5 gap-3">
                    <div><h1 class="display-6 fw-bold text-dark mb-1">Financial Overview</h1><p class="text-muted m-0">Performance summary from ${start.toLocaleDateString(undefined, {month:'short', year:'numeric'})} to ${end.toLocaleDateString(undefined, {month:'short', year:'numeric'})}</p></div>
                    <div class="d-flex gap-2">
                        <div class="input-group shadow-sm bg-white rounded-3 border-0" style="width: 250px;">
                            <span class="input-group-text bg-white border-0 ps-3"><img src="${searchIcon}" width="16" class="opacity-50"></span>
                            <input type="search" id="finSearch" class="form-control border-0 shadow-none ps-2" placeholder="Search activities...">
                        </div>
                        <button class="btn btn-light shadow-sm d-flex align-items-center justify-content-center" style="width: 42px;" data-bs-toggle="modal" data-bs-target="#dateFilterModal" title="Filter Date"><img src="${calendarRange}" width="18" class="opacity-75"></button>
                    </div>
                </div>

                <div class="row g-4 mb-5">
                    ${createSummaryCard('Total Revenue', totalRev, 'revenue')}
                    ${createSummaryCard('Total Expenses', totalExp, 'expense')}
                    ${createSummaryCard('Net Income', totalRev - totalExp, 'net')}
                </div>

                <div class="card border-0 shadow-sm mb-5 overflow-hidden">
                    <div class="card-header bg-white border-0 pt-4 px-4"><h6 class="fw-bold text-uppercase text-secondary small m-0" style="letter-spacing:1px">Income Trends</h6></div>
                    <div class="card-body p-4"><div style="height: 320px;"><canvas id="financeChart"></canvas></div></div>
                </div>

                <h5 class="fw-bold text-dark mb-4">Recent Activities</h5>
                <div id="finance-cards-container" class="row row-cols-1 row-cols-lg-2 row-cols-xxl-3 g-4 pb-5">
                    ${acts.length ? acts.map(createActivityCard).join('') : `
                        <div class="col-12"><div class="text-center py-5 bg-light rounded-4 border border-dashed"><img src="${inbox}" width="48" class="opacity-25 mb-3"><h6 class="text-muted">No transactions found for this period.</h6></div></div>
                    `}
                </div>
            </div>`;

        renderChart(processDataForChart(rRes.documents, eRes.documents, start, end));
        attachMainListeners(currentUser, userLookup, { revenues: rRes.documents, expenses: eRes.documents, events: evRes.documents, eventLookup });

    } catch (e) { console.error(e); container.innerHTML = `<div class="alert alert-danger">Failed to load financial data.</div>`; }
}