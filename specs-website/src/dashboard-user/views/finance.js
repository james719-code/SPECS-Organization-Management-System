// --- IMPORTS ---
import { databases } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
// Import required components from libraries
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

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_REVENUE = import.meta.env.VITE_COLLECTION_ID_REVENUE;
const COLLECTION_ID_EXPENSES = import.meta.env.VITE_COLLECTION_ID_EXPENSES;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;

// --- STATE MANAGEMENT & HELPERS ---
let financeChart = null;
const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

const STORAGE_KEY_DATE_RANGE = 'finance_date_range_v2';

/**
 * Gets the stored date range from localStorage.
 * Defaults to the last 12 months if nothing is stored.
 * @returns {{startYear: number, startMonth: number, endYear: number, endMonth: number}}
 */
function getStoredDateRange() {
    const stored = localStorage.getItem(STORAGE_KEY_DATE_RANGE);
    if (stored) {
        try {
            return JSON.parse(stored);
        } catch (e) { /* Fallback to default */ }
    }
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 11);

    return {
        startYear: startDate.getFullYear(),
        startMonth: startDate.getMonth(),
        endYear: endDate.getFullYear(),
        endMonth: endDate.getMonth()
    };
}

/**
 * Saves the selected date range to localStorage.
 * @param {number} startYear
 * @param {number} startMonth
 * @param {number} endYear
 * @param {number} endMonth
 */
function setStoredDateRange(startYear, startMonth, endYear, endMonth) {
    const data = JSON.stringify({ startYear, startMonth, endYear, endMonth });
    localStorage.setItem(STORAGE_KEY_DATE_RANGE, data);
}


// --- HTML TEMPLATE: Detail View (with CRUD) ---
function getDetailViewHTML(groupName, revenues, expenses) {
    const createRow = (item, type) => {
        const collectionId = type === 'revenue' ? COLLECTION_ID_REVENUE : COLLECTION_ID_EXPENSES;
        const date = new Date(type === 'revenue' ? item.date_earned : item.date_buy).toLocaleDateString();
        const originalDateValue = type === 'revenue' ? item.date_earned : item.date_buy;
        const btnIconStyle = "width: 1em; height: 1em;";

        return `
        <tr data-doc-id="${item.$id}" data-collection-id="${collectionId}">
            <td data-field="date" data-original-value="${originalDateValue}"><span>${date}</span></td>
            <td data-field="name" data-original-value="${item.name}"><span>${item.name}</span></td>
            <td data-field="quantity" data-original-value="${item.quantity}"><span>${item.quantity}</span></td>
            <td data-field="price" data-original-value="${item.price}"><span>${formatCurrency(item.price)}</span></td>
            <td>${formatCurrency(item.price * item.quantity)}</td>
            <td class="actions">
                <button class="btn btn-sm btn-outline-primary edit-btn" title="Edit Item"><img src="${pencilSquare}" alt="Edit" style="${btnIconStyle} filter: var(--bs-btn-color-filter);"></button>
                <button class="btn btn-sm btn-outline-danger delete-btn" title="Delete Item"><img src="${trash}" alt="Delete" style="${btnIconStyle} filter: var(--bs-btn-color-filter-danger);"></button>
                <button class="btn btn-sm btn-primary save-btn" style="display:none;" title="Save Changes"><img src="${checkLg}" alt="Save" style="${btnIconStyle} filter: invert(1);"></button>
                <button class="btn btn-sm btn-secondary cancel-btn" style="display:none;" title="Cancel Edit"><img src="${xLg}" alt="Cancel" style="${btnIconStyle} filter: invert(1);"></button>
            </td>
        </tr>
        `;
    };

    return `
        <div class="finance-detail-view">
            <button id="backToFinanceMainBtn" class="btn btn-primary mb-4">← Back to Overview</button>
            <h2 class="mb-3">Details for: ${groupName}</h2>
            <div class="card mb-4">
                <div class="card-header"><h3 class="h5 mb-0">Revenues</h3></div>
                <div class="card-body"><div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead><tr><th>Date</th><th>Name</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${revenues.length > 0 ? revenues.map(r => createRow(r, 'revenue')).join('') : '<tr><td colspan="6" class="text-center text-muted py-3">No revenues for this activity.</td></tr>'}
                        </tbody>
                    </table>
                </div></div>
            </div>
            <div class="card">
                <div class="card-header"><h3 class="h5 mb-0">Expenses</h3></div>
                <div class="card-body"><div class="table-responsive">
                    <table class="table table-striped table-hover">
                        <thead><tr><th>Date</th><th>Name</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${expenses.length > 0 ? expenses.map(e => createRow(e, 'expense')).join('') : '<tr><td colspan="6" class="text-center text-muted py-3">No expenses for this activity.</td></tr>'}
                        </tbody>
                    </table>
                </div></div>
            </div>
        </div>
    `;
}


// --- HTML TEMPLATE: Activity Card ---
function createActivityCard(activity) {
    const net = activity.totalRevenue - activity.totalExpense;
    const netClass = net >= 0 ? 'text-success' : 'text-danger';
    const badgeClass = activity.isEvent ? 'bg-info' : 'bg-secondary';

    return `
        <div class="col">
            <div class="card h-100 finance-activity-card" data-group-key="${activity.key}" data-group-name="${activity.name}" data-is-event="${activity.isEvent}" style="cursor:pointer;">
                <div class="card-header">
                    <span class="badge ${badgeClass}">${activity.isEvent ? 'Event' : 'Activity'}</span>
                    <h5 class="card-title mt-2 mb-0">${activity.name}</h5>
                </div>
                <div class="card-body d-flex flex-column justify-content-center">
                    <div class="d-flex justify-content-around text-center py-2">
                        <div><small class="text-body-secondary">REVENUE</small><p class="h5 fw-bold">${formatCurrency(activity.totalRevenue)}</p></div>
                        <div><small class="text-body-secondary">EXPENSE</small><p class="h5 fw-bold">${formatCurrency(activity.totalExpense)}</p></div>
                        <div><small class="text-body-secondary">NET</small><p class="h5 fw-bold ${netClass}">${formatCurrency(net)}</p></div>
                    </div>
                </div>
                <div class="card-footer text-end"><small class="text-body-secondary">Last update: ${new Date(activity.lastDate).toLocaleDateString()}</small></div>
            </div>
        </div>
    `;
}


// --- DATA PROCESSING & RENDERING LOGIC ---
function processDataForChart(revenues, expenses, firstDayOfRange, lastDayOfRange) {
    const monthlyNet = {};
    const cursorDate = new Date(firstDayOfRange);

    // Initialize all months in the range with 0
    while (cursorDate <= lastDayOfRange) {
        const key = `${cursorDate.getFullYear()}-${String(cursorDate.getMonth()).padStart(2, '0')}`;
        monthlyNet[key] = 0;
        cursorDate.setMonth(cursorDate.getMonth() + 1);
    }

    // Helper to process an item
    const processItem = (item, multiplier) => {
        const date = new Date(item.date_earned || item.date_buy);
        const key = `${date.getFullYear()}-${String(date.getMonth()).padStart(2, '0')}`;
        if (monthlyNet[key] !== undefined) {
            monthlyNet[key] += (item.price * item.quantity) * multiplier;
        }
    };

    revenues.forEach(r => processItem(r, 1));
    expenses.forEach(e => processItem(e, -1));

    return { labels: Object.keys(monthlyNet), data: Object.values(monthlyNet) };
}

function renderChart(chartData) {
    const ctx = document.getElementById('financeChart')?.getContext('2d');
    if (!ctx) return;
    if (financeChart) { financeChart.destroy(); }

    financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels.map(l => {
                const [year, month] = l.split('-');
                return new Date(year, month).toLocaleString('en-US', { month: 'short', year: '2-digit' });
            }),
            datasets: [{
                label: `Monthly Net (${formatCurrency(0).replace(/0\.00/g, '')})`,
                data: chartData.data,
                backgroundColor: chartData.data.map(d => d >= 0 ? 'rgba(16, 185, 129, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: chartData.data.map(d => d >= 0 ? 'rgba(16, 185, 129, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: { scales: { y: { beginAtZero: false } }, responsive: true, maintainAspectRatio: false }
    });
}

function groupTransactions(revenues, expenses, eventLookup) {
    const activities = {};
    const processItem = (item, type) => {
        const isEvent = item.isEvent;
        const key = isEvent ? item.event : item.activity_name || item.activity;
        if (!key) return;

        if (!activities[key]) {
            activities[key] = {
                key, name: isEvent ? (eventLookup[item.event] || 'Unknown Event') : key, isEvent,
                totalRevenue: 0, totalExpense: 0, lastDate: new Date(0),
            };
        }
        const date = new Date(type === 'revenue' ? item.date_earned : item.date_buy);
        if (date > activities[key].lastDate) { activities[key].lastDate = date; }
        if (type === 'revenue') { activities[key].totalRevenue += item.price * item.quantity; }
        else { activities[key].totalExpense += item.price * item.quantity; }
    };
    revenues.forEach(r => processItem(r, 'revenue'));
    expenses.forEach(e => processItem(e, 'expense'));
    return Object.values(activities).sort((a, b) => b.lastDate - a.lastDate);
}

// --- EVENT LISTENERS & MAIN LOGIC ---
function attachDetailViewListeners(currentUser, userLookup) {
    const detailView = document.querySelector('.finance-detail-view');
    if (!detailView) return;

    detailView.addEventListener('click', async (e) => {
        const target = e.target.closest('button');
        if (!target) return;

        const row = target.closest('tr');
        if (!row || !row.dataset.docId) return;

        const docId = row.dataset.docId;
        const collectionId = row.dataset.collectionId;

        if (target.classList.contains('delete-btn')) {
            if (!confirm('Are you sure you want to permanently delete this item?')) return;
            try {
                await databases.deleteDocument(DATABASE_ID, collectionId, docId);
                row.remove();
            } catch (error) { console.error('Delete failed:', error); alert('Could not delete item.'); }
        }
        else if (target.classList.contains('edit-btn')) {
            row.classList.add('editing-row');
            row.querySelectorAll('td[data-field]').forEach(cell => {
                const field = cell.dataset.field;
                const originalValue = cell.dataset.originalValue;
                const inputType = (field === 'price' || field === 'quantity') ? 'number' : (field === 'date' ? 'datetime-local' : 'text');
                const value = field === 'date' ? new Date(originalValue).toISOString().slice(0, 16) : originalValue;
                cell.innerHTML = `<input type="${inputType}" class="form-control form-control-sm" value="${value}" step="${field === 'price' ? '0.01' : '1'}" min="1" />`;
            });
            row.querySelector('.edit-btn, .delete-btn').style.display = 'none';
            row.querySelector('.save-btn, .cancel-btn').style.display = 'inline-flex';
        }
        else if (target.classList.contains('cancel-btn')) {
            row.classList.remove('editing-row');
            row.querySelectorAll('td[data-field]').forEach(cell => {
                const originalValue = cell.dataset.originalValue;
                const field = cell.dataset.field;
                const displayValue = field === 'price' ? formatCurrency(originalValue) : (field === 'date' ? new Date(originalValue).toLocaleDateString() : originalValue);
                cell.innerHTML = `<span>${displayValue}</span>`;
            });
            row.querySelector('.edit-btn, .delete-btn').style.display = 'inline-flex';
            row.querySelector('.save-btn, .cancel-btn').style.display = 'none';
        }
        else if (target.classList.contains('save-btn')) {
            target.disabled = true;
            target.textContent = 'Saving...';
            const dataToUpdate = {};
            let hasError = false;

            row.querySelectorAll('td[data-field]').forEach(cell => {
                const input = cell.querySelector('input');
                const field = cell.dataset.field;
                let value = input.value;
                if (field === 'price' || field === 'quantity') {
                    value = (field === 'price') ? parseFloat(value) : parseInt(value, 10);
                    if (isNaN(value) || value < 1) hasError = true;
                }
                const dateKey = collectionId === COLLECTION_ID_REVENUE ? 'date_earned' : 'date_buy';
                dataToUpdate[field === 'date' ? dateKey : field] = value;
            });

            if (hasError) {
                alert('Invalid number. Price and quantity must be at least 1.');
                target.disabled = false; target.textContent = 'Save';
                return;
            }

            try {
                await databases.updateDocument(DATABASE_ID, collectionId, docId, dataToUpdate);
                row.querySelectorAll('td[data-field]').forEach(cell => {
                    const key = cell.dataset.field === 'date' ? (collectionId === COLLECTION_ID_REVENUE ? 'date_earned' : 'date_buy') : cell.dataset.field;
                    cell.dataset.originalValue = dataToUpdate[key];
                });
                row.querySelector('.cancel-btn').click(); // Simulate cancel to restore view
            } catch (error) {
                console.error('Update failed:', error);
                alert('Update failed.');
            } finally {
                target.disabled = false; target.textContent = 'Save';
            }
        }
    });
}


function attachOverviewListeners(currentUser, userLookup, initialData) {
    const mainContainer = document.getElementById('finance-view-container');
    const modalFabContainer = document.getElementById('finance-modal-fab-container');
    if (!mainContainer || !modalFabContainer) return;

    const currentYear = new Date().getFullYear();
    const yearOptions = Array.from({ length: 10 }, (_, i) => currentYear - 5 + i)
        .map(y => `<option value="${y}">${y}</option>`).join('');
    const monthOptions = Array.from({ length: 12 }, (_, i) => new Date(0, i))
        .map((d, i) => `<option value="${i}">${d.toLocaleString('en-US', { month: 'long' })}</option>`).join('');

    modalFabContainer.innerHTML = `
        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addTransactionModal" title="Add Transaction">
            <img src="${plusLg}" alt="Add Transaction" style="width: 1.5rem; height: 1.5rem; filter: invert(1);">
        </button>
        <div class="modal fade" id="addTransactionModal" tabindex="-1" aria-labelledby="addTransactionModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <form id="addTransactionForm">
                    <div class="modal-header"><h5 class="modal-title" id="addTransactionModalLabel">Add New Transaction</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                    <div class="modal-body"><!-- ... form fields ... --></div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button><button type="submit" class="btn btn-primary">Add Transaction</button></div>
                </form>
            </div></div>
        </div>
        
        <div class="modal fade" id="timeRangeModal" tabindex="-1" aria-labelledby="timeRangeModalLabel" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                <form id="timeRangeForm">
                    <div class="modal-header"><h5 class="modal-title" id="timeRangeModalLabel">Select Custom Date Range</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                    <div class="modal-body">
                        <div class="alert alert-info alert-dismissible fade show" role="alert" id="timeRangeValidationAlert" style="display: none;">
                            End date cannot be earlier than the start date.
                        </div>
                        <div class="row g-3">
                            <div class="col-12"><strong class="text-body-secondary">START DATE</strong></div>
                            <div class="col-md-6"><label for="timeRangeStartMonth" class="form-label">Month</label><select id="timeRangeStartMonth" class="form-select">${monthOptions}</select></div>
                            <div class="col-md-6"><label for="timeRangeStartYear" class="form-label">Year</label><select id="timeRangeStartYear" class="form-select">${yearOptions}</select></div>
                            <div class="col-12 mt-4"><strong class="text-body-secondary">END DATE</strong></div>
                            <div class="col-md-6"><label for="timeRangeEndMonth" class="form-label">Month</label><select id="timeRangeEndMonth" class="form-select">${monthOptions}</select></div>
                            <div class="col-md-6"><label for="timeRangeEndYear" class="form-label">Year</label><select id="timeRangeEndYear" class="form-select">${yearOptions}</select></div>
                        </div>
                    </div>
                    <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button><button type="submit" class="btn btn-primary">Apply</button></div>
                </form>
            </div></div>
        </div>`;

    document.querySelector("#addTransactionModal .modal-body").innerHTML = `
        <div class="mb-3"><label for="transactionType" class="form-label">Type</label><select id="transactionType" class="form-select" required><option value="expense">Expense</option><option value="revenue">Revenue</option></select></div>
        <div class="mb-3"><label for="transactionName" class="form-label">Item Name</label><input type="text" id="transactionName" class="form-control" placeholder="e.g., T-Shirt Printing" required></div>
        <div class="mb-3"><label for="transactionPrice" class="form-label">Price (per item)</label><input type="number" id="transactionPrice" class="form-control" min="1" step="0.01" required></div>
        <div class="mb-3"><label for="transactionQuantity" class="form-label">Quantity</label><input type="number" id="transactionQuantity" class="form-control" min="1" value="1" required></div>
        <div class="mb-3"><label for="transactionDate" class="form-label">Date</label><input type="datetime-local" id="transactionDate" class="form-control" required></div>
        <div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="isEventCheckbox"><label class="form-check-label" for="isEventCheckbox">For an official Event?</label></div>
        <div id="activityNameGroup" class="mb-3"><label for="activityName" class="form-label">Activity Name (if not an event)</label><input type="text" class="form-control" id="activityName" placeholder="e.g., Fundraiser 2024" required></div>
        <div id="eventNameGroup" class="mb-3 d-none"><label for="eventName" class="form-label">Select Event</label><select id="eventName" class="form-select">${initialData.events.map(event => `<option value="${event.$id}">${event.event_name}</option>`).join('')}</select></div>`;


    // --- Modal Instantiation & Logic ---
    const addTransactionModal = new Modal(document.getElementById('addTransactionModal'));
    const timeRangeModalEl = document.getElementById('timeRangeModal');
    const timeRangeModal = new Modal(timeRangeModalEl);
    const timeRangeForm = document.getElementById('timeRangeForm');

    timeRangeModalEl.addEventListener('show.bs.modal', () => {
        const { startYear, startMonth, endYear, endMonth } = getStoredDateRange();
        document.getElementById('timeRangeStartYear').value = startYear;
        document.getElementById('timeRangeStartMonth').value = startMonth;
        document.getElementById('timeRangeEndYear').value = endYear;
        document.getElementById('timeRangeEndMonth').value = endMonth;
        document.getElementById('timeRangeValidationAlert').style.display = 'none';
    });

    timeRangeForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const startYear = parseInt(document.getElementById('timeRangeStartYear').value, 10);
        const startMonth = parseInt(document.getElementById('timeRangeStartMonth').value, 10);
        const endYear = parseInt(document.getElementById('timeRangeEndYear').value, 10);
        const endMonth = parseInt(document.getElementById('timeRangeEndMonth').value, 10);

        // Validation
        if (new Date(endYear, endMonth) < new Date(startYear, startMonth)) {
            document.getElementById('timeRangeValidationAlert').style.display = 'block';
            return;
        }

        setStoredDateRange(startYear, startMonth, endYear, endMonth);
        timeRangeModal.hide();
        renderFinanceView(userLookup, currentUser); // Re-render with new date range
    });

    document.getElementById('isEventCheckbox').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.getElementById('activityNameGroup').classList.toggle('d-none', isChecked);
        document.getElementById('eventNameGroup').classList.toggle('d-none', !isChecked);
        document.getElementById('activityName').required = !isChecked;
        document.getElementById('eventName').required = isChecked;
    });

    document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span> Saving...';
        try {
            const type = e.target.transactionType.value;
            const isEvent = e.target.isEventCheckbox.checked;
            const data = {
                name: e.target.transactionName.value, price: parseFloat(e.target.transactionPrice.value),
                quantity: parseInt(e.target.transactionQuantity.value, 10), isEvent, recorder: currentUser.$id,
            };
            if (type === 'revenue') {
                data.date_earned = e.target.transactionDate.value;
                data.activity = isEvent ? null : e.target.activityName.value;
                data.event = isEvent ? e.target.eventName.value : null;
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), data);
            } else {
                data.date_buy = e.target.transactionDate.value;
                data.activity_name = isEvent ? null : e.target.activityName.value;
                data.event = isEvent ? e.target.eventName.value : null;
                await databases.createDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, ID.unique(), data);
            }
            addTransactionModal.hide();
            await renderFinanceView(userLookup, currentUser); // Re-render the view
        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false; submitBtn.textContent = 'Add Transaction';
        }
    });

    const allActivities = groupTransactions(initialData.revenues, initialData.expenses, initialData.eventLookup);
    document.getElementById('financeSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allActivities.filter(act => act.name.toLowerCase().includes(searchTerm));
        const cardsContainer = document.getElementById('finance-cards-container');
        cardsContainer.innerHTML = filtered.length > 0 ? filtered.map(createActivityCard).join('') : '<p class="text-muted text-center w-100">No activities found matching your search.</p>';
    });

    mainContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.finance-activity-card');
        if (!card) return;
        mainContainer.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"><span class="visually-hidden">Loading...</span></div></div>`;
        try {
            const groupKey = card.dataset.groupKey;
            const isEvent = card.dataset.isEvent === 'true';
            const [revenueDetails, expenseDetails] = await Promise.all([
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [Query.equal(isEvent ? 'event' : 'activity', groupKey), Query.limit(500)]),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [Query.equal(isEvent ? 'event' : 'activity_name', groupKey), Query.limit(500)])
            ]);
            mainContainer.innerHTML = getDetailViewHTML(card.dataset.groupName, revenueDetails.documents, expenseDetails.documents);
            attachDetailViewListeners(currentUser, userLookup);
            document.getElementById('backToFinanceMainBtn').addEventListener('click', () => renderFinanceView(userLookup, currentUser));
        } catch (error) {
            console.error('Failed to load details:', error);
            mainContainer.innerHTML = `<p class="text-danger text-center">Error loading details: ${error.message}</p>`;
        }
    });
}

/**
 * Main render function for the Finance view.
 */
export default async function renderFinanceView(userLookup, currentUser) {
    const contentEl = document.getElementById("dashboard-content");
    contentEl.innerHTML = `
        <div id="finance-view-container"></div>
        <div id="finance-modal-fab-container"></div>
    `;
    const mainContainer = document.getElementById('finance-view-container');
    mainContainer.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

    try {
        // Fetch data based on the stored start/end date range.
        const { startYear, startMonth, endYear, endMonth } = getStoredDateRange();
        const firstDayOfRange = new Date(startYear, startMonth, 1);
        const lastDayOfRange = new Date(endYear, endMonth + 1, 0);
        lastDayOfRange.setHours(23, 59, 59, 999);

        const firstDayISO = firstDayOfRange.toISOString();
        const lastDayISO = lastDayOfRange.toISOString();

        const [revenueRes, expenseRes, eventRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [
                Query.greaterThanEqual('date_earned', firstDayISO),
                Query.lessThanEqual('date_earned', lastDayISO),
                Query.limit(5000)
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [
                Query.greaterThanEqual('date_buy', firstDayISO),
                Query.lessThanEqual('date_buy', lastDayISO),
                Query.limit(5000)
            ]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.limit(500)])
        ]);

        const eventLookup = eventRes.documents.reduce((acc, event) => ({ ...acc, [event.$id]: event.event_name }), {});
        const initialData = { revenues: revenueRes.documents, expenses: expenseRes.documents, events: eventRes.documents, eventLookup };
        const groupedActivities = groupTransactions(initialData.revenues, initialData.expenses, initialData.eventLookup);

        const startRangeStr = firstDayOfRange.toLocaleString('default', { month: 'long', year: 'numeric' });
        const endRangeStr = new Date(endYear, endMonth).toLocaleString('default', { month: 'long', year: 'numeric' });
        const chartTitle = `Net Income (${startRangeStr} - ${endRangeStr})`;

        let activitiesContent;
        if (groupedActivities.length > 0) {
            activitiesContent = `
                <div id="finance-cards-container" class="row row-cols-1 row-cols-lg-2 row-cols-xxl-3 g-4">
                    ${groupedActivities.map(act => createActivityCard(act)).join('')}
                </div>`;
        } else {
            activitiesContent = `
                <div class="text-center text-muted py-5">
                    <div class="mb-3">
                        <img src="${inbox}" alt="No activities" style="width: 4rem; height: 4rem; opacity: 0.5;">
                    </div>
                    <h4 class="fw-light">No Financial Activities Found</h4>
                    <p>There are no recorded transactions for the selected period.</p>
                    <p>Click the <span class="btn btn-sm btn-primary pe-none rounded-circle d-inline-flex align-items-center justify-content-center" style="width:1.5rem; height:1.5rem;"><img src="${plusLg}" alt="Add" style="width:0.8rem; height:0.8rem; filter:invert(1);"></span> button to add a new transaction.</p>
                </div>
            `;
        }

        mainContainer.innerHTML = `
            <div class="finance-overview-container">
                <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4 gap-2">
                    <h1 class="mb-3 mb-md-0">Finance Overview</h1>
                    <div class="d-flex gap-2">
                        <input type="search" id="financeSearchInput" class="form-control" style="max-width: 320px;" placeholder="Search activities or events...">
                        <button class="btn btn-outline-secondary d-flex align-items-center justify-content-center" type="button" data-bs-toggle="modal" data-bs-target="#timeRangeModal" title="Change Time Range">
                            <img src="${calendarRange}" alt="Change Time Range" style="width: 1.2em; height: 1.2em; filter: var(--bs-btn-color-filter);">
                        </button>
                    </div>
                </div>
                <div class="card mb-4">
                    <div class="card-header"><h5 class="mb-0" id="finance-chart-title">${chartTitle}</h5></div>
                    <div class="card-body">
                         <canvas id="financeChart" style="min-height: 300px;"></canvas>
                    </div>
                </div>
                ${activitiesContent}
            </div>`;

        renderChart(processDataForChart(initialData.revenues, initialData.expenses, firstDayOfRange, lastDayOfRange));
        attachOverviewListeners(currentUser, userLookup, initialData);

    } catch (error) {
        console.error("Failed to render finance view:", error);
        mainContainer.innerHTML = `<div class="alert alert-danger" role="alert"><strong>Error:</strong> Could not load financial data. ${error.message}</div>`;
    }
}