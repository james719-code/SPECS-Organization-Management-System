/**
 * Shared payment card component
 * Extracted from dashboard-admin and dashboard-officer payment views
 */

import { formatCurrency } from '../formatters.js';

/**
 * Creates HTML for a student payment card
 * @param {Object} student - Student account object with students property
 * @param {Array} paymentsForStudent - Array of payment objects for this student
 * @param {Object} options - Optional configuration
 * @param {string} options.eraserIcon - SVG path for eraser icon (for clear history button)
 * @returns {string} HTML string for the payment card
 */
export function createStudentPaymentCardHTML(student, paymentsForStudent, options = {}) {
    const { eraserIcon = '' } = options;
    
    const pendingPayments = paymentsForStudent.filter(p => !p.is_paid);
    const hasPaidRecords = paymentsForStudent.some(p => p.is_paid);
    const totalDue = pendingPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const hasDues = totalDue > 0;

    const statusBadge = hasDues
        ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-2">Due: ${formatCurrency(totalDue)}</span>`
        : `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2"><i class="bi bi-check-circle-fill me-1"></i> Paid</span>`;

    const studentData = student.students || {};
    const displayName = studentData.name || student.username;
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const displayMeta = studentData.yearLevel ? `Year ${studentData.yearLevel}` : 'Student';

    const clearButton = (!hasDues && hasPaidRecords && eraserIcon) ? `
        <button class="btn btn-sm btn-light rounded-circle shadow-sm position-absolute top-0 end-0 m-3 clear-student-records-btn" 
                title="Clear History" 
                data-student-id="${student.$id}" 
                data-student-name="${displayName}"
                style="width: 32px; height: 32px;">
            <img src="${eraserIcon}" style="width: 14px; opacity: 0.6;">
        </button>
    ` : '';

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm student-payment-card" role="button" data-student-id="${student.$id}">
                <div class="card-body p-4 position-relative">
                    ${clearButton}
                    
                    <div class="d-flex align-items-center mb-4">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold fs-5" style="width: 50px; height: 50px;">
                            ${initials}
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark mb-0 text-truncate" style="max-width: 140px;" title="${displayName}">${displayName}</h6>
                            <small class="text-muted">${displayMeta}</small>
                        </div>
                    </div>
                    
                    <div class="pt-3 border-top border-light d-flex justify-content-between align-items-center">
                        <span class="small fw-bold text-muted text-uppercase" style="letter-spacing: 0.5px;">Status</span>
                        ${statusBadge}
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Calculate payment summary for a student
 * @param {Array} payments - Array of payment objects
 * @returns {Object} Summary with totalDue, paidCount, pendingCount
 */
export function calculatePaymentSummary(payments) {
    const pendingPayments = payments.filter(p => !p.is_paid);
    const paidPayments = payments.filter(p => p.is_paid);
    const totalDue = pendingPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalPaid = paidPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    return {
        totalDue,
        totalPaid,
        pendingCount: pendingPayments.length,
        paidCount: paidPayments.length,
        hasDues: totalDue > 0,
        hasPaidRecords: paidPayments.length > 0
    };
}
