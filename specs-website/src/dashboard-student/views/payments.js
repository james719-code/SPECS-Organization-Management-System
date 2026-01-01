import { api } from '../../shared/api.js';

function getPaymentsHTML() {
    return `
        <div class="container-fluid py-4 px-md-5">
            <header class="mb-4 mb-md-5">
                <h1 class="display-6 fw-bold text-dark mb-1">Transaction History</h1>
                <p class="text-muted mb-0">Overview of your payments and dues.</p>
            </header>

            <!-- Desktop Table View -->
            <div class="card border-0 shadow-sm overflow-hidden rounded-4 desktop-table">
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light text-secondary small text-uppercase">
                            <tr>
                                <th class="ps-4 py-3">Date</th>
                                <th class="py-3">Item / Event</th>
                                <th class="text-end py-3">Amount</th>
                                <th class="text-center py-3">Status</th>
                                <th class="text-end pe-4 py-3">Method</th>
                            </tr>
                        </thead>
                        <tbody id="payments-table-body">
                            <tr><td colspan="5" class="text-center py-5 text-muted"><div class="spinner-border spinner-border-sm text-primary"></div> Loading...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
            
            <!-- Mobile Card View -->
            <div class="mobile-card-list" id="payments-mobile-cards">
                <div class="text-center py-4"><div class="spinner-border spinner-border-sm text-primary"></div> Loading...</div>
            </div>
        </div>
    `;
}

async function attachPaymentsListeners(studentDoc) {
    const tbody = document.getElementById('payments-table-body');
    const mobileCards = document.getElementById('payments-mobile-cards');
    
    try {
        if (!studentDoc || !studentDoc.$id) {
             tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Student profile not loaded.</td></tr>';
             mobileCards.innerHTML = '<div class="mobile-data-card"><div class="text-center py-3 text-muted">Student profile not loaded.</div></div>';
             return;
        }

        const response = await api.payments.listForStudent(studentDoc.$id);

        if (response.documents.length === 0) {
             tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">No payment records found.</td></tr>';
             mobileCards.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><img src="" alt="" style="opacity:0;"></div>
                    <h5>No Payments</h5>
                    <p>You have no payment records yet.</p>
                </div>
             `;
             return;
        }

        // Desktop table rendering
        tbody.innerHTML = response.documents.map(payment => {
            const date = new Date(payment.date_paid).toLocaleDateString();
            const isPaid = payment.is_paid;
            const statusBadge = isPaid 
                ? `<span class="badge bg-success-subtle text-success rounded-pill px-3 py-2 border border-success-subtle">Paid</span>` 
                : `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-2 border border-warning-subtle">Pending</span>`;
            
            return `
                <tr>
                    <td class="ps-4 text-secondary fw-medium small">${date}</td>
                    <td>
                        <div class="fw-bold text-dark">${payment.item_name}</div>
                        ${payment.is_event ? '<small class="text-muted"><i class="bi bi-calendar-event me-1"></i>Event Linked</small>' : ''}
                    </td>
                    <td class="text-end fw-bold text-dark">₱${payment.price.toFixed(2)}</td>
                    <td class="text-center">${statusBadge}</td>
                    <td class="text-end pe-4"><small class="text-muted">${payment.modal_paid || '-'}</small></td>
                </tr>
            `;
        }).join('');

        // Mobile cards rendering
        mobileCards.innerHTML = response.documents.map(payment => {
            const date = new Date(payment.date_paid).toLocaleDateString();
            const isPaid = payment.is_paid;
            const statusBadge = isPaid 
                ? `<span class="badge bg-success-subtle text-success rounded-pill px-2 py-1 border border-success-subtle" style="font-size: 0.7rem;">Paid</span>` 
                : `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill px-2 py-1 border border-warning-subtle" style="font-size: 0.7rem;">Pending</span>`;
            
            return `
                <div class="mobile-data-card">
                    <div class="mobile-card-header">
                        <h6 class="mobile-card-title">${payment.item_name}</h6>
                        <div class="mobile-card-badge">${statusBadge}</div>
                    </div>
                    <div class="mobile-card-body">
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Date</span>
                            <span class="mobile-data-value">${date}</span>
                        </div>
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Amount</span>
                            <span class="mobile-data-value fw-bold" style="color: var(--bs-dark);">₱${payment.price.toFixed(2)}</span>
                        </div>
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Method</span>
                            <span class="mobile-data-value">${payment.modal_paid || '-'}</span>
                        </div>
                        ${payment.is_event ? `
                        <div class="mobile-data-row">
                            <span class="mobile-data-label">Type</span>
                            <span class="mobile-data-value"><i class="bi bi-calendar-event me-1"></i>Event Linked</span>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading payments:", error);
         tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-danger">Failed to load payment history.</td></tr>';
    }
}

export default function renderPaymentsView(studentDoc) {
    return {
        html: getPaymentsHTML(),
        afterRender: () => attachPaymentsListeners(studentDoc)
    };
}
