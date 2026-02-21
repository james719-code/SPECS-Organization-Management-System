import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_REVENUE, COLLECTION_ID_EXPENSES, COLLECTION_ID_PAYMENTS } from '../../shared/constants.js';
import { Query, ID } from 'appwrite';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import { logActivity } from './activity-logs.js';
import { formatCurrency, formatDate } from '../../shared/formatters.js';

import cashStackIcon from 'bootstrap-icons/icons/cash-stack.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';
import graphUpArrow from 'bootstrap-icons/icons/graph-up-arrow.svg';
import graphDownArrow from 'bootstrap-icons/icons/graph-down-arrow.svg';
import walletIcon from 'bootstrap-icons/icons/wallet2.svg';
import plusLg from 'bootstrap-icons/icons/plus-lg.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import linkIcon from 'bootstrap-icons/icons/link-45deg.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';
import creditCardIcon from 'bootstrap-icons/icons/credit-card.svg';

let allRevenue = [];
let allPayments = [];
let allExpenses = [];

function getFinanceHTML() {
    return `
        <div class="finance-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Finance Overview</h1>
                    <p class="text-muted mb-0">Track revenue and expenses for the organization</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                        <button id="goToPaymentsBtn" class="btn btn-outline-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2" title="Manage Payments">
                            <img src="${creditCardIcon}" style="width: 1rem;"> Payments
                        </button>
                        <button id="exportFinanceBtn" class="btn btn-outline-success btn-sm rounded-pill px-3 d-flex align-items-center gap-2">
                            <img src="${downloadIcon}" style="width: 1rem;"> Export
                        </button>
                        <button id="refreshFinanceBtn" class="btn btn-light btn-sm rounded-pill shadow-sm px-3 d-flex align-items-center gap-2">
                            <img src="${arrowRepeat}" style="width: 1rem; opacity: 0.6;"> Refresh
                        </button>
                    </div>
                </div>
            </header>

            <!-- Summary Cards -->
            <div class="row g-4 mb-4" id="financeSummaryCards">
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 text-center">
                            <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 48px; height: 48px; background: rgba(25,135,84,0.1);">
                                <img src="${graphUpArrow}" style="width: 1.3rem; filter: invert(36%) sepia(73%) saturate(468%) hue-rotate(101deg) brightness(92%) contrast(90%);">
                            </div>
                            <div class="text-muted small fw-bold text-uppercase">Total Revenue</div>
                            <div class="h3 fw-bold text-success mb-0" id="totalRevenue">--</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 text-center">
                            <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 48px; height: 48px; background: rgba(220,53,69,0.1);">
                                <img src="${graphDownArrow}" style="width: 1.3rem; filter: invert(23%) sepia(93%) saturate(3851%) hue-rotate(342deg) brightness(85%) contrast(95%);">
                            </div>
                            <div class="text-muted small fw-bold text-uppercase">Total Expenses</div>
                            <div class="h3 fw-bold text-danger mb-0" id="totalExpenses">--</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 text-center">
                            <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 48px; height: 48px; background: rgba(13,110,253,0.1);">
                                <img src="${walletIcon}" style="width: 1.3rem; filter: invert(28%) sepia(93%) saturate(1637%) hue-rotate(206deg) brightness(97%) contrast(97%);">
                            </div>
                            <div class="text-muted small fw-bold text-uppercase">Net Balance</div>
                            <div class="h3 fw-bold mb-0" id="netBalance">--</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg-3">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-body p-4 text-center">
                            <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-2" style="width: 48px; height: 48px; background: rgba(255,193,7,0.1);">
                                <img src="${creditCardIcon}" style="width: 1.3rem; filter: invert(76%) sepia(53%) saturate(1000%) hue-rotate(358deg) brightness(98%) contrast(105%);">
                            </div>
                            <div class="text-muted small fw-bold text-uppercase">Pending Payments</div>
                            <div class="h4 fw-bold text-warning mb-0" id="pendingPaymentsCount">--</div>
                            <small class="text-muted" id="pendingPaymentsAmount">--</small>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tabs -->
            <ul class="nav nav-pills mb-4 gap-2" id="financeTabs">
                <li class="nav-item">
                    <button class="nav-link active rounded-pill px-4" data-tab="revenue">Revenue</button>
                </li>
                <li class="nav-item">
                    <button class="nav-link rounded-pill px-4" data-tab="expenses">Expenses</button>
                </li>
            </ul>

            <!-- Revenue Tab -->
            <div id="revenueTab">
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 py-3 px-4">
                        <h6 class="fw-bold mb-0">Revenue Records</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0 align-middle">
                                <thead class="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th class="ps-4 py-3">Description</th>
                                        <th class="py-3">Source</th>
                                        <th class="py-3">Qty</th>
                                        <th class="py-3">Price</th>
                                        <th class="py-3">Total</th>
                                        <th class="py-3">Date</th>
                                        <th class="py-3">Linked</th>
                                    </tr>
                                </thead>
                                <tbody id="revenueTableBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Expenses Tab -->
            <div id="expensesTab" style="display: none;">
                <!-- Add Expense Form -->
                <div class="card border-0 shadow-sm mb-4">
                    <div class="card-body p-4">
                        <h6 class="fw-bold mb-3">Add Expense</h6>
                        <form id="addExpenseForm">
                            <div class="row g-3 align-items-end">
                                <div class="col-md-4">
                                    <label class="form-label small fw-bold text-muted">DESCRIPTION</label>
                                    <input type="text" id="expenseName" class="form-control" placeholder="e.g. Venue rental" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold text-muted">QUANTITY</label>
                                    <input type="number" id="expenseQuantity" class="form-control" value="1" min="1" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold text-muted">PRICE</label>
                                    <input type="number" id="expensePrice" class="form-control" placeholder="0.00" min="0" step="0.01" required>
                                </div>
                                <div class="col-md-2">
                                    <label class="form-label small fw-bold text-muted">DATE</label>
                                    <input type="date" id="expenseDate" class="form-control" required>
                                </div>
                                <div class="col-md-2">
                                    <button type="submit" id="addExpenseBtn" class="btn btn-primary w-100 d-flex align-items-center justify-content-center gap-2">
                                        <img src="${plusLg}" style="width: 1rem; filter: invert(1);"> Add
                                    </button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>

                <!-- Expenses Table -->
                <div class="card border-0 shadow-sm">
                    <div class="card-header bg-white border-0 py-3 px-4">
                        <h6 class="fw-bold mb-0">Expense Records</h6>
                    </div>
                    <div class="card-body p-0">
                        <div class="table-responsive">
                            <table class="table table-hover mb-0 align-middle">
                                <thead class="bg-light text-secondary small text-uppercase">
                                    <tr>
                                        <th class="ps-4 py-3">Description</th>
                                        <th class="py-3">Qty</th>
                                        <th class="py-3">Price</th>
                                        <th class="py-3">Total</th>
                                        <th class="py-3">Date</th>
                                        <th class="text-end pe-4 py-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody id="expensesTableBody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <style>
            #refreshFinanceBtn.refreshing img { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .revenue-link { cursor: pointer; transition: background 0.2s; }
            .revenue-link:hover { background: rgba(13,110,253,0.05); }
        </style>
    `;
}

async function attachFinanceListeners() {
    const refreshBtn = document.getElementById('refreshFinanceBtn');
    const exportBtn = document.getElementById('exportFinanceBtn');
    const goToPaymentsBtn = document.getElementById('goToPaymentsBtn');
    const totalRevenueEl = document.getElementById('totalRevenue');
    const totalExpensesEl = document.getElementById('totalExpenses');
    const netBalanceEl = document.getElementById('netBalance');
    const pendingPaymentsCountEl = document.getElementById('pendingPaymentsCount');
    const pendingPaymentsAmountEl = document.getElementById('pendingPaymentsAmount');
    const revenueTableBody = document.getElementById('revenueTableBody');
    const expensesTableBody = document.getElementById('expensesTableBody');
    const revenueTab = document.getElementById('revenueTab');
    const expensesTab = document.getElementById('expensesTab');
    const tabButtons = document.querySelectorAll('#financeTabs [data-tab]');
    const addExpenseForm = document.getElementById('addExpenseForm');
    const expenseDateInput = document.getElementById('expenseDate');

    // Default expense date to today
    expenseDateInput.value = new Date().toISOString().split('T')[0];

    const loadData = async () => {
        revenueTableBody.innerHTML = `<tr><td colspan="7" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;
        expensesTableBody.innerHTML = `<tr><td colspan="6" class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div></td></tr>`;

        try {
            const [revenueRes, expensesRes, paymentsRes] = await Promise.all([
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(500)
                ]),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [
                    Query.orderDesc('$createdAt'),
                    Query.limit(500)
                ]),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [
                    Query.equal('is_paid', false),
                    Query.limit(1000)
                ])
            ]);

            allRevenue = revenueRes.documents;
            allExpenses = expensesRes.documents;
            allPayments = paymentsRes.documents;

            updateSummary();
            renderRevenueTable();
            renderExpensesTable();
        } catch (error) {
            console.error('Failed to load finance data:', error);
            toast.error('Failed to load finance data');
            revenueTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger py-4">Failed to load data</td></tr>`;
            expensesTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-danger py-4">Failed to load data</td></tr>`;
        }
    };

    const updateSummary = () => {
        const totalRev = allRevenue.reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 1)), 0);
        const totalExp = allExpenses.reduce((sum, e) => sum + ((e.price || 0) * (e.quantity || 1)), 0);
        const net = totalRev - totalExp;

        // Calculate pending payments
        const pendingCount = allPayments.length;
        const pendingAmount = allPayments.reduce((sum, p) => sum + ((p.price || 0) * (p.quantity || 1)), 0);

        totalRevenueEl.textContent = formatCurrency(totalRev);
        totalExpensesEl.textContent = formatCurrency(totalExp);
        netBalanceEl.textContent = formatCurrency(net);
        netBalanceEl.className = `h3 fw-bold mb-0 ${net >= 0 ? 'text-success' : 'text-danger'}`;

        // Update pending payments card
        pendingPaymentsCountEl.textContent = pendingCount;
        pendingPaymentsAmountEl.textContent = pendingCount > 0 ? formatCurrency(pendingAmount) + ' outstanding' : 'All collected';
        pendingPaymentsAmountEl.className = pendingCount > 0 ? 'text-warning small' : 'text-success small';
    };

    const renderRevenueTable = () => {
        if (allRevenue.length === 0) {
            revenueTableBody.innerHTML = `<tr><td colspan="7" class="text-center text-muted py-5">No revenue records yet. Revenue is automatically recorded when payments are marked as paid.</td></tr>`;
            return;
        }

        const linkHTML = `<img src="${linkIcon}" style="width: 0.9rem; opacity: 0.6;">`;
        revenueTableBody.innerHTML = allRevenue.map(r => {
            const total = (r.price || 0) * (r.quantity || 1);
            const date = r.date_earned ? formatDate(new Date(r.date_earned), { month: 'short', day: 'numeric', year: 'numeric' }) : formatDate(new Date(r.$createdAt), { month: 'short', day: 'numeric', year: 'numeric' });
            const sourceBadge = r.isEvent
                ? '<span class="badge bg-primary-subtle text-primary rounded-pill">Event</span>'
                : '<span class="badge bg-info-subtle text-info rounded-pill">Activity</span>';
            
            // Check if linked to event or activity
            const linkedInfo = r.isEvent && r.event 
                ? `<span class="d-flex align-items-center gap-1">${linkHTML} Event</span>`
                : r.activity 
                    ? `<span class="text-muted small">${r.activity}</span>` 
                    : '<span class="text-muted">-</span>';

            return `
                <tr class="revenue-link" title="Click to view details">
                    <td class="ps-4 fw-medium">${r.name || 'Unnamed'}</td>
                    <td>${sourceBadge}</td>
                    <td class="text-muted">${r.quantity || 1}</td>
                    <td class="text-muted">${formatCurrency(r.price || 0)}</td>
                    <td class="fw-semibold text-success">${formatCurrency(total)}</td>
                    <td class="text-muted small">${date}</td>
                    <td>${linkedInfo}</td>
                </tr>
            `;
        }).join('');
    };

    const renderExpensesTable = () => {
        if (allExpenses.length === 0) {
            expensesTableBody.innerHTML = `<tr><td colspan="6" class="text-center text-muted py-5">No expense records yet. Add expenses using the form above.</td></tr>`;
            return;
        }

        const trashHTML = `<img src="${trash}" style="width: 0.9em; pointer-events: none;">`;
        expensesTableBody.innerHTML = allExpenses.map(e => {
            const total = (e.price || 0) * (e.quantity || 1);
            const date = e.date_spent ? formatDate(new Date(e.date_spent), { month: 'short', day: 'numeric', year: 'numeric' }) : formatDate(new Date(e.$createdAt), { month: 'short', day: 'numeric', year: 'numeric' });

            return `
                <tr>
                    <td class="ps-4 fw-medium">${e.name || 'Unnamed'}</td>
                    <td class="text-muted">${e.quantity || 1}</td>
                    <td class="text-muted">${formatCurrency(e.price || 0)}</td>
                    <td class="fw-semibold text-danger">${formatCurrency(total)}</td>
                    <td class="text-muted small">${date}</td>
                    <td class="text-end pe-4">
                        <button class="btn btn-sm btn-outline-danger delete-expense-btn rounded-circle p-2" style="width: 32px; height: 32px;" data-id="${e.$id}" title="Delete">
                            ${trashHTML}
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    };

    // Tab switching
    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const tab = btn.dataset.tab;
            revenueTab.style.display = tab === 'revenue' ? 'block' : 'none';
            expensesTab.style.display = tab === 'expenses' ? 'block' : 'none';
        });
    });

    // Refresh
    refreshBtn.addEventListener('click', async () => {
        refreshBtn.classList.add('refreshing');
        refreshBtn.disabled = true;
        await loadData();
        refreshBtn.classList.remove('refreshing');
        refreshBtn.disabled = false;
        toast.success('Finance data refreshed');
    });

    // Add expense
    addExpenseForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = document.getElementById('expenseName').value.trim();
        const quantity = parseInt(document.getElementById('expenseQuantity').value) || 1;
        const price = parseFloat(document.getElementById('expensePrice').value) || 0;
        const dateSpent = document.getElementById('expenseDate').value;

        if (!name || price <= 0) {
            toast.warning('Please fill in a description and valid price');
            return;
        }

        const addBtn = document.getElementById('addExpenseBtn');
        addBtn.disabled = true;
        addBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, ID.unique(), {
                name,
                quantity,
                price,
                date_spent: new Date(dateSpent).toISOString()
            });

            toast.success('Expense added');
            logActivity('expense_created', `Added expense: ${name} (${formatCurrency(price * quantity)})`);

            addExpenseForm.reset();
            document.getElementById('expenseDate').value = new Date().toISOString().split('T')[0];

            await loadData();
        } catch (error) {
            console.error('Failed to add expense:', error);
            toast.error('Failed to add expense');
        } finally {
            addBtn.disabled = false;
            addBtn.innerHTML = `<img src="${plusLg}" style="width: 1rem; filter: invert(1);"> Add`;
        }
    });

    // Delete expense
    expensesTableBody.addEventListener('click', async (e) => {
        const deleteBtn = e.target.closest('.delete-expense-btn');
        if (!deleteBtn) return;

        if (!await confirmAction('Delete Expense', 'Are you sure you want to delete this expense record?', 'Delete', 'danger')) return;

        const expenseId = deleteBtn.dataset.id;
        deleteBtn.disabled = true;
        deleteBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

        try {
            await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, expenseId);
            toast.success('Expense deleted');
            logActivity('expense_deleted', `Deleted expense record`);
            await loadData();
        } catch (error) {
            console.error('Failed to delete expense:', error);
            toast.error('Failed to delete expense');
        }
    });

    // Navigate to Payments page
    goToPaymentsBtn.addEventListener('click', () => {
        const paymentsLink = document.querySelector('#adminSidebar [data-view="payments"]');
        if (paymentsLink) paymentsLink.click();
    });

    // Export finance data to CSV
    exportBtn.addEventListener('click', () => {
        if (allRevenue.length === 0 && allExpenses.length === 0) {
            toast.warning('No data to export');
            return;
        }

        // Build CSV content
        let csv = 'Type,Description,Quantity,Unit Price,Total,Date,Category\n';
        
        // Add revenue records
        allRevenue.forEach(r => {
            const total = (r.price || 0) * (r.quantity || 1);
            const date = r.date_earned ? new Date(r.date_earned).toISOString().split('T')[0] : new Date(r.$createdAt).toISOString().split('T')[0];
            const category = r.isEvent ? 'Event' : (r.activity || 'Activity');
            csv += `Revenue,"${(r.name || 'Unnamed').replace(/"/g, '""')}",${r.quantity || 1},${r.price || 0},${total},${date},"${category}"\n`;
        });

        // Add expense records
        allExpenses.forEach(e => {
            const total = (e.price || 0) * (e.quantity || 1);
            const date = e.date_spent ? new Date(e.date_spent).toISOString().split('T')[0] : new Date(e.$createdAt).toISOString().split('T')[0];
            csv += `Expense,"${(e.name || 'Unnamed').replace(/"/g, '""')}",${e.quantity || 1},${e.price || 0},${total},${date},"Expense"\n`;
        });

        // Add summary
        const totalRev = allRevenue.reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 1)), 0);
        const totalExp = allExpenses.reduce((sum, e) => sum + ((e.price || 0) * (e.quantity || 1)), 0);
        csv += '\n,,,SUMMARY,,\n';
        csv += `,Total Revenue,,,${totalRev},\n`;
        csv += `,Total Expenses,,,${totalExp},\n`;
        csv += `,Net Balance,,,${totalRev - totalExp},\n`;

        // Download
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `SPECS_Finance_Report_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        URL.revokeObjectURL(link.href);

        toast.success('Finance report exported');
        logActivity('export_data', 'Exported finance report to CSV');
    });

    await loadData();
}

export default function renderFinanceView() {
    return {
        html: getFinanceHTML(),
        afterRender: attachFinanceListeners
    };
}
