// renderpages/finance.js
import { databases } from '../../appwrite.js';
import { Query, ID } from 'appwrite';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_REVENUE = import.meta.env.VITE_COLLECTION_ID_REVENUE;
const COLLECTION_ID_EXPENSES = import.meta.env.VITE_COLLECTION_ID_EXPENSES;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;

// --- STATE MANAGEMENT & HELPERS ---
let financeChart = null;
const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

// --- SCRIPT LOADING HELPER ---
function loadScript(src) {
    return new Promise((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
            return resolve();
        }
        const script = document.createElement('script');
        script.src = src;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
        document.head.appendChild(script);
    });
}

// --- HTML TEMPLATE: Detail View (with CRUD) ---
function getDetailViewHTML(groupName, revenues, expenses) {
    const createRow = (item, type) => {
        const collectionId = type === 'revenue' ? COLLECTION_ID_REVENUE : COLLECTION_ID_EXPENSES;
        const date = new Date(type === 'revenue' ? item.date_earned : item.date_buy).toLocaleDateString();
        const originalDateValue = type === 'revenue' ? item.date_earned : item.date_buy;

        return `
        <tr data-doc-id="${item.$id}" data-collection-id="${collectionId}">
            <td data-field="date" data-original-value="${originalDateValue}"><span>${date}</span></td>
            <td data-field="name" data-original-value="${item.name}"><span>${item.name}</span></td>
            <td data-field="quantity" data-original-value="${item.quantity}"><span>${item.quantity}</span></td>
            <td data-field="price" data-original-value="${item.price}"><span>${formatCurrency(item.price)}</span></td>
            <td>${formatCurrency(item.price * item.quantity)}</td>
            <td class="actions">
                <button class="btn action-btn edit-btn" title="Edit Item">Edit</button>
                <button class="btn danger-btn action-btn delete-btn" title="Delete Item">Delete</button>
                <button class="btn save-btn action-btn" style="display:none;" title="Save Changes">Save</button>
                <button class="btn cancel-btn action-btn" style="display:none;" title="Cancel Edit">Cancel</button>
            </td>
        </tr>
        `;
    };

    return `
        <div class="finance-detail-view">
            <button id="backToFinanceMainBtn" class="btn primary-btn">← Back to Overview</button>
            <h2>Details for: ${groupName}</h2>
            
            <div class="details-section">
                <h3>Revenues</h3>
                <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Date</th><th>Name</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
                        <tbody>
                            ${revenues.length > 0 ? revenues.map(r => createRow(r, 'revenue')).join('') : '<tr><td colspan="6">No revenues for this activity.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="details-section">
                <h3>Expenses</h3>
                 <div class="table-wrapper">
                    <table>
                        <thead><tr><th>Date</th><th>Name</th><th>Qty</th><th>Price</th><th>Total</th><th>Actions</th></tr></thead>
                        <tbody>
                             ${expenses.length > 0 ? expenses.map(e => createRow(e, 'expense')).join('') : '<tr><td colspan="6">No expenses for this activity.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

// --- HTML TEMPLATE: Activity Card ---
function createActivityCard(activity) {
    const net = activity.totalRevenue - activity.totalExpense;
    const netClass = net >= 0 ? 'positive' : 'negative';

    return `
        <div class="finance-activity-card" data-group-key="${activity.key}" data-group-name="${activity.name}" data-is-event="${activity.isEvent}">
            <div class="card-header">
                <span class="activity-type-badge ${activity.isEvent ? 'event' : 'activity'}">${activity.isEvent ? 'Event' : 'Activity'}</span>
                <h3 class="activity-name">${activity.name}</h3>
            </div>
            <div class="card-body">
                <div class="financial-summary">
                    <div class="summary-item revenue">
                        <span>Revenue</span>
                        <strong>${formatCurrency(activity.totalRevenue)}</strong>
                    </div>
                    <div class="summary-item expense">
                        <span>Expense</span>
                        <strong>${formatCurrency(activity.totalExpense)}</strong>
                    </div>
                    <div class="summary-item net">
                        <span>Net</span>
                        <strong class="${netClass}">${formatCurrency(net)}</strong>
                    </div>
                </div>
            </div>
            <div class="card-footer">
                <span>Last update: ${new Date(activity.lastDate).toLocaleDateString()}</span>
            </div>
        </div>
    `;
}

// --- HTML TEMPLATE: Main Finance View Structure ---
function getFinanceHTMLShell() {
    return `
    <style>
        /* --- SHARED STYLES --- */
        .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
        .primary-btn { background-color: var(--accent-blue); color: var(--text-primary); }
        .primary-btn:hover { background-color: var(--accent-blue-hover); }
        .danger-btn { background-color: var(--status-red); color: white; }
        .danger-btn:hover { background-color: #B91C1C; }
        .form-group { display: flex; flex-direction: column; margin-bottom: 1rem; }
        .form-group label { color: var(--text-secondary); font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input, .form-group select { background-color: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border-dark); padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }

        /* --- FINANCE VIEW CONTAINER --- */
        #finance-view-container { width: 100%; }
        .finance-overview-container h1, .finance-detail-view h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem; }
        .chart-container { background-color: var(--surface-dark); padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; }
        .finance-controls { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; gap: 1rem; flex-wrap: wrap; }
        #financeSearchInput { flex-grow: 1; min-width: 250px; padding: 0.8rem 1.2rem; font-size: 1rem; background-color: var(--surface-dark); border: 1px solid var(--border-dark); color: var(--text-primary); border-radius: 6px; }
        
        /* --- ACTIVITY CARD GRID --- */
        #finance-cards-container { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 1.5rem; }
        .finance-activity-card { cursor: pointer; background-color: var(--surface-dark); border: 1px solid var(--border-dark); border-radius: 8px; overflow: hidden; display: flex; flex-direction: column; transition: transform 0.2s, box-shadow 0.2s; }
        .finance-activity-card:hover { transform: translateY(-5px); box-shadow: 0 5px 15px rgba(0,0,0,0.2); }
        .card-header { padding: 1rem 1.5rem; border-bottom: 1px solid var(--border-dark); }
        .activity-type-badge { font-size: 0.75rem; font-weight: 600; padding: 0.25rem 0.6rem; border-radius: 12px; text-transform: uppercase; }
        .activity-type-badge.event { background-color: var(--accent-blue); color: white; }
        .activity-type-badge.activity { background-color: #4B5563; color: white; }
        .activity-name { font-size: 1.2rem; margin: 0.5rem 0 0 0; }
        .card-body { padding: 1.5rem; flex-grow: 1; }
        .financial-summary { display: flex; justify-content: space-between; text-align: center; }
        .summary-item span { font-size: 0.8rem; color: var(--text-secondary); display: block; margin-bottom: 0.25rem; }
        .summary-item strong { font-size: 1.1rem; }
        .summary-item .positive { color: #22C55E; }
        .summary-item .negative { color: var(--status-red); }
        .card-footer { background-color: var(--bg-dark); padding: 0.75rem 1.5rem; font-size: 0.8rem; color: var(--text-secondary); text-align: right; }

        /* --- ENHANCED DETAIL VIEW STYLES --- */
        .finance-detail-view #backToFinanceMainBtn { margin-bottom: 2rem; }
        .finance-detail-view h2 { margin-top: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-dark); }
        .details-section { margin-top: 2rem; background-color: var(--surface-dark); padding: 1.5rem; border-radius: 8px; }
        .details-section h3 { font-size: 1.25rem; margin-top: 0; margin-bottom: 1rem; color: var(--accent-blue); }
        .table-wrapper { overflow-x: auto; }
        table { width: 100%; border-collapse: collapse; }
        th, td { padding: 0.8rem 1rem; text-align: left; border-bottom: 1px solid var(--border-dark); vertical-align: middle; }
        th { background-color: var(--bg-dark); font-weight: 600; color: var(--text-secondary); }
        tbody tr:nth-child(even) { background-color: var(--bg-dark); }
        tbody tr:hover { background-color: #374151; }
        td.actions { display: flex; gap: 0.5rem; }
        .action-btn { font-size: 0.8rem; padding: 0.4rem 0.8rem; }
        td input { width: 95%; background-color: #374151; border: 1px solid var(--accent-blue); color: white; padding: 0.5rem; border-radius: 4px;}
        tr.editing-row td > span { display: none; }
        
        /* --- MODAL & FAB --- */
        .fab { position: fixed; bottom: 2rem; right: 2rem; width: 56px; height: 56px; border-radius: 50%; background-color: var(--accent-blue); color: white; border: none; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3); cursor: pointer; z-index: 999; }
        .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background-color: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 1000; opacity: 0; visibility: hidden; transition: opacity 0.3s ease; }
        .modal-overlay.open { opacity: 1; visibility: visible; }
        .modal-content { background-color: var(--surface-dark); padding: 2.5rem 2rem 2rem 2rem; border-radius: 8px; max-width: 500px; width: 90%; }
        .modal-content h3 { margin-top: 0; }
        /* .form-row { display: flex; gap: 1rem; } --- REMOVED this class as it's no longer used */
        /* .form-row .form-group { flex: 1; } --- REMOVED this class as it's no longer used */
        .hidden { display: none; }
    </style>
    <div id="finance-view-container">
        <!-- Main content (overview or detail) will be rendered here -->
    </div>
    <div id="finance-modal-fab-container">
        <!-- Modals and FABs go here so they don't get wiped out -->
    </div>
    `;
}

// --- DATA PROCESSING & RENDERING LOGIC ---
function processDataForChart(revenues, expenses) {
    const dailyNet = {};
    const today = new Date();
    const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
        dailyNet[d.toISOString().split('T')[0]] = 0;
    }

    revenues.forEach(r => {
        const day = new Date(r.date_earned).toISOString().split('T')[0];
        if (dailyNet[day] !== undefined) { dailyNet[day] += r.price * r.quantity; }
    });

    expenses.forEach(e => {
        const day = new Date(e.date_buy).toISOString().split('T')[0];
        if (dailyNet[day] !== undefined) { dailyNet[day] -= e.price * e.quantity; }
    });

    return { labels: Object.keys(dailyNet), data: Object.values(dailyNet) };
}

function renderChart(chartData) {
    const ctx = document.getElementById('financeChart')?.getContext('2d');
    if (!ctx) return;
    if (financeChart) { financeChart.destroy(); }

    financeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: chartData.labels.map(l => new Date(l).toLocaleDateString('en-US', { day: 'numeric', month: 'short' })),
            datasets: [{
                label: `Daily Net (${formatCurrency(0).replace(/0\.00/g, '')})`,
                data: chartData.data,
                backgroundColor: chartData.data.map(d => d >= 0 ? 'rgba(59, 130, 246, 0.6)' : 'rgba(239, 68, 68, 0.6)'),
                borderColor: chartData.data.map(d => d >= 0 ? 'rgba(59, 130, 246, 1)' : 'rgba(239, 68, 68, 1)'),
                borderWidth: 1
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
                key,
                name: isEvent ? (eventLookup[item.event] || 'Unknown Event') : key,
                isEvent,
                totalRevenue: 0,
                totalExpense: 0,
                lastDate: new Date(0),
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
        const target = e.target;
        const row = target.closest('tr');
        if (!row || !row.dataset.docId) return;

        const docId = row.dataset.docId;
        const collectionId = row.dataset.collectionId;

        // DELETE
        if (target.classList.contains('delete-btn')) {
            if (!confirm('Are you sure you want to permanently delete this item?')) return;
            try {
                await databases.deleteDocument(DATABASE_ID, collectionId, docId);
                row.remove();
                alert('Item deleted.');
            } catch (error) { console.error('Delete failed:', error); alert('Could not delete item.'); }
        }
        // EDIT
        else if (target.classList.contains('edit-btn')) {
            row.classList.add('editing-row');
            row.querySelectorAll('td[data-field]').forEach(cell => {
                const field = cell.dataset.field;
                const originalValue = cell.dataset.originalValue;
                const inputType = (field === 'price' || field === 'quantity') ? 'number' : (field === 'date' ? 'datetime-local' : 'text');
                const value = field === 'date' ? new Date(originalValue).toISOString().slice(0, 16) : originalValue;
                
                // --- MODIFIED: Add min="1" attribute for price and quantity inputs ---
                const minAttribute = (field === 'price' || field === 'quantity') ? 'min="1"' : '';

                cell.innerHTML = `<input type="${inputType}" value="${value}" step="${field === 'price' ? '0.01' : '1'}" ${minAttribute} />`;
            });
            row.querySelector('.edit-btn, .delete-btn').style.display = 'none';
            row.querySelector('.save-btn, .cancel-btn').style.display = 'inline-flex';
        }
        // CANCEL
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
        // SAVE
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
                    value = (field === 'price') ? parseFloat(value) : parseInt(value);
                    if (isNaN(value) || value < 1) hasError = true; // Check if less than 1
                }
                const dateKey = collectionId === COLLECTION_ID_REVENUE ? 'date_earned' : 'date_buy';
                dataToUpdate[field === 'date' ? dateKey : field] = value;
            });

            if (hasError) {
                alert('Invalid number format. Price and quantity must be at least 1.');
                target.disabled = false;
                target.textContent = 'Save';
                return;
            }

            try {
                await databases.updateDocument(DATABASE_ID, collectionId, docId, dataToUpdate);
                alert('Update successful!');
                row.querySelectorAll('td[data-field]').forEach(cell => {
                    const field = cell.dataset.field;
                    const dateKey = collectionId === COLLECTION_ID_REVENUE ? 'date_earned' : 'date_buy';
                    const key = field === 'date' ? dateKey : field;
                    cell.dataset.originalValue = dataToUpdate[key];
                });
                row.querySelector('.cancel-btn').click(); // Programmatically click cancel to revert UI
            } catch (error) {
                console.error('Update failed:', error);
                alert('Update failed.');
            } finally {
                target.disabled = false;
                target.textContent = 'Save';
            }
        }
    });
}

function attachOverviewListeners(currentUser, userLookup, initialData) {
    const mainContainer = document.getElementById('finance-view-container');
    const modalFabContainer = document.getElementById('finance-modal-fab-container');
    if (!mainContainer || !modalFabContainer) return;

    // --- MODIFIED: Removed .form-row and added min="1" to inputs ---
    modalFabContainer.innerHTML = `
        <button id="showAddTransactionModalBtn" class="fab" title="Add Transaction">+</button>
        <div id="addTransactionModal" class="modal-overlay">
            <div class="modal-content">
                <button class="modal-close-btn" style="position:absolute; top:1rem; right:1rem; background:none; border:none; color:white; font-size:1.5rem; cursor:pointer;">×</button>
                <h3>Add New Transaction</h3>
                <form id="addTransactionForm">
                    <div class="form-group"><label for="transactionType">Type</label><select id="transactionType" required><option value="expense">Expense</option><option value="revenue">Revenue</option></select></div>
                    <div class="form-group"><label for="transactionName">Item Name</label><input type="text" id="transactionName" placeholder="e.g., T-Shirt Printing" required></div>
                    <div class="form-group"><label for="transactionPrice">Price (per item)</label><input type="number" id="transactionPrice" min="1" step="0.01" required></div>
                    <div class="form-group"><label for="transactionQuantity">Quantity</label><input type="number" id="transactionQuantity" min="1" value="1" required></div>
                    <div class="form-group"><label for="transactionDate">Date</label><input type="datetime-local" id="transactionDate" required></div>
                    <div class="form-group"><label><input type="checkbox" id="isEventCheckbox" style="margin-right: 0.5rem;">For an official Event?</label></div>
                    <div id="activityNameGroup" class="form-group"><label for="activityName">Activity Name (if not an event)</label><input type="text" id="activityName" placeholder="e.g., Fundraiser 2024" required></div>
                    <div id="eventNameGroup" class="form-group hidden"><label for="eventName">Select Event</label><select id="eventName">${initialData.events.map(event => `<option value="${event.$id}">${event.event_name}</option>`).join('')}</select></div>
                    <button type="submit" class="btn primary-btn">Add Transaction</button>
                </form>
            </div>
        </div>`;

    // Modal Logic
    const modal = document.getElementById('addTransactionModal');
    document.getElementById('showAddTransactionModalBtn').addEventListener('click', () => modal.classList.add('open'));
    modal.querySelector('.modal-close-btn').addEventListener('click', () => modal.classList.remove('open'));
    document.getElementById('isEventCheckbox').addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        document.getElementById('activityNameGroup').classList.toggle('hidden', isChecked);
        document.getElementById('eventNameGroup').classList.toggle('hidden', !isChecked);
        document.getElementById('activityName').required = !isChecked;
        document.getElementById('eventName').required = isChecked;
    });

    // Form Submission
    document.getElementById('addTransactionForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = e.target.querySelector('button[type="submit"]');
        submitBtn.disabled = true;
        submitBtn.textContent = 'Saving...';
        try {
            const type = e.target.transactionType.value;
            const isEvent = e.target.isEventCheckbox.checked;
            const data = {
                name: e.target.transactionName.value,
                price: parseFloat(e.target.transactionPrice.value),
                quantity: parseInt(e.target.transactionQuantity.value),
                isEvent,
                recorder: currentUser.$id,
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
            alert('Transaction saved!');
            renderFinanceView(userLookup, currentUser);
        } catch (error) {
            console.error('Failed to save transaction:', error);
            alert(`Error: ${error.message}`);
        } finally {
            submitBtn.disabled = false;
            submitBtn.textContent = 'Add Transaction';
            modal.classList.remove('open');
        }
    });

    // Search Logic
    const allActivities = groupTransactions(initialData.revenues, initialData.expenses, initialData.eventLookup);
    document.getElementById('financeSearchInput').addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase();
        const filtered = allActivities.filter(act => act.name.toLowerCase().includes(searchTerm));
        const cardsContainer = document.getElementById('finance-cards-container');
        cardsContainer.innerHTML = filtered.length > 0 ? filtered.map(createActivityCard).join('') : '<p>No activities found matching your search.</p>';
    });

    // Card Click to Detail View
    mainContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.finance-activity-card');
        if (!card) return;
        mainContainer.innerHTML = '<p>Loading details...</p>';
        try {
            const groupKey = card.dataset.groupKey;
            const isEvent = card.dataset.isEvent === 'true';
            const [revenueDetails, expenseDetails] = await Promise.all([
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [Query.equal(isEvent ? 'event' : 'activity', groupKey), Query.limit(200)]),
                databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [Query.equal(isEvent ? 'event' : 'activity_name', groupKey), Query.limit(200)])
            ]);
            mainContainer.innerHTML = getDetailViewHTML(card.dataset.groupName, revenueDetails.documents, expenseDetails.documents);
            attachDetailViewListeners(currentUser, userLookup);
            document.getElementById('backToFinanceMainBtn').addEventListener('click', () => renderFinanceView(userLookup, currentUser));
        } catch (error) {
            console.error('Failed to load details:', error);
            mainContainer.innerHTML = `<p>Error loading details: ${error.message}</p>`;
        }
    });
}

/**
 * Main render function for the Finance view.
 */
export default async function renderFinanceView(userLookup, currentUser) {
    const contentEl = document.getElementById("dashboard-content");
    contentEl.innerHTML = getFinanceHTMLShell();
    const mainContainer = document.getElementById('finance-view-container');
    mainContainer.innerHTML = `<p>Loading financial data...</p>`;

    try {
        await loadScript("https://cdn.jsdelivr.net/npm/chart.js");

        const today = new Date();
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const [revenueRes, expenseRes, eventRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [Query.greaterThanEqual('date_earned', firstDayOfMonth), Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [Query.greaterThanEqual('date_buy', firstDayOfMonth), Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.limit(500)])
        ]);

        const eventLookup = eventRes.documents.reduce((acc, event) => ({ ...acc, [event.$id]: event.event_name }), {});
        const initialData = { revenues: revenueRes.documents, expenses: expenseRes.documents, events: eventRes.documents, eventLookup };
        const groupedActivities = groupTransactions(initialData.revenues, initialData.expenses, initialData.eventLookup);

        mainContainer.innerHTML = `
            <div class="finance-overview-container">
                <h1>Finance Overview</h1>
                <div class="chart-container"><canvas id="financeChart" style="min-height: 250px;"></canvas></div>
                <div class="finance-controls"><input type="search" id="financeSearchInput" placeholder="Search activities or events..."></div>
                <div id="finance-cards-container">
                    ${groupedActivities.length > 0 ? groupedActivities.map(act => createActivityCard(act)).join('') : '<p>No financial activities recorded yet. Click the (+) button to add one.</p>'}
                </div>
            </div>`;

        renderChart(processDataForChart(initialData.revenues, initialData.expenses));
        attachOverviewListeners(currentUser, userLookup, initialData);
    } catch (error) {
        console.error("Failed to render finance view:", error);
        mainContainer.innerHTML = `<p style="color:red;">Error: Could not load financial data. ${error.message}</p>`;
    }
}