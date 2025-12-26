import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_PAYMENTS, COLLECTION_ID_STUDENTS } from '../../shared/constants.js';
import { Query } from 'appwrite';

function getPaymentsHTML() {
    return `
        <div class="container-fluid">
            <div class="card border-0 shadow-sm">
                <div class="card-header bg-white border-0 py-3">
                    <h5 class="fw-bold m-0 text-primary">Transaction History</h5>
                </div>
                <div class="table-responsive">
                    <table class="table table-hover align-middle mb-0">
                        <thead class="bg-light">
                            <tr>
                                <th class="ps-4">Date</th>
                                <th>Item / Event</th>
                                <th>Amount</th>
                                <th>Status</th>
                                <th>Details</th>
                            </tr>
                        </thead>
                        <tbody id="payments-table-body">
                            <tr><td colspan="5" class="text-center py-5 text-muted">Loading payments...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    `;
}

async function attachPaymentsListeners(accountProfile) {
    const tbody = document.getElementById('payments-table-body');
    
    try {
        // We need the student ID to filter payments
        let studentId = null;
        if (accountProfile.students && typeof accountProfile.students === 'string') {
            studentId = accountProfile.students;
        } else if (accountProfile.students && accountProfile.students.$id) {
            studentId = accountProfile.students.$id;
        } else if (accountProfile.students) {
             // Fallback if it's an object but ID logic is different (unlikely)
             studentId = accountProfile.students; 
        }
        
        if (!studentId) {
             tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No student profile found. Cannot fetch payments.</td></tr>';
             return;
        }

        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID_PAYMENTS,
            [
                Query.equal('students', studentId), // Filter by relationship attribute
                Query.orderDesc('date_paid')
            ]
        );

        if (response.documents.length === 0) {
             tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-muted">No payment records found.</td></tr>';
             return;
        }

        tbody.innerHTML = response.documents.map(payment => {
            const date = new Date(payment.date_paid).toLocaleDateString();
            const isPaid = payment.is_paid;
            const statusBadge = isPaid 
                ? `<span class="badge bg-success-subtle text-success">Paid</span>` 
                : `<span class="badge bg-warning-subtle text-warning-emphasis">Pending</span>`;
            
            return `
                <tr>
                    <td class="ps-4 text-secondary">${date}</td>
                    <td class="fw-medium text-dark">${payment.item_name}</td>
                    <td class="fw-bold text-dark">₱${payment.price.toFixed(2)}</td>
                    <td>${statusBadge}</td>
                    <td><small class="text-muted">${payment.modal_paid || '-'}</small></td>
                </tr>
            `;
        }).join('');

    } catch (error) {
        console.error("Error loading payments:", error);
         tbody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-danger">Error loading payments.</td></tr>';
    }
}

export default function renderPaymentsView(accountProfile) {
    return {
        html: getPaymentsHTML(),
        afterRender: () => attachPaymentsListeners(accountProfile)
    };
}
