import { api } from '../../shared/api.js';
import { Modal } from 'bootstrap';
import { formatCurrency } from '../../shared/formatters.js';
import { createStudentPaymentCardHTML } from '../../shared/components/paymentCard.js';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import plusLgIcon from 'bootstrap-icons/icons/plus-lg.svg';
import arrowLeftIcon from 'bootstrap-icons/icons/arrow-left.svg';
import threeDotsIcon from 'bootstrap-icons/icons/three-dots.svg';
import eraserIcon from 'bootstrap-icons/icons/eraser.svg';
import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import peopleIcon from 'bootstrap-icons/icons/people.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';

let allStudents = [];
let allPayments = [];
let events = [];
let currentStudent = null;
let addPaymentModalInstance, editPaymentModalInstance;

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Debounce helper – returns a wrapper that delays `fn` by `ms` */
function debounce(fn, ms = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => fn(...args), ms);
    };
}

/** Resolve a human-readable name for what a payment is "for" */
function resolvePaymentForName(payment) {
    if (payment.is_event && payment.events) {
        if (payment.events.event_name) return payment.events.event_name;
        const evId = payment.events.$id || payment.events;
        const ev = events.find(e => e.$id === evId);
        return ev ? ev.event_name : 'Linked Event';
    }
    return payment.activity || '-';
}

/** Build a sanitised JSON string safe for embedding in data-attributes */
function safePaymentData(payment) {
    return JSON.stringify(payment).replace(/'/g, "\\'");
}

// ---------------------------------------------------------------------------
// Summary cards (overview statistics)
// ---------------------------------------------------------------------------

function getPaymentSummaryHTML() {
    const totalStudents = allStudents.length;
    const totalPaid = allPayments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalOutstanding = allPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalPayments = allPayments.length;
    const paidCount = allPayments.filter(p => p.is_paid).length;
    const completionRate = totalPayments > 0 ? Math.round((paidCount / totalPayments) * 100) : 0;

    return `
        <div class="row g-3 mb-4" id="paymentSummaryCards">
            <div class="col-6 col-lg-3">
                <div class="card officer-stat-card border-0 shadow-sm h-100">
                    <div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">STUDENTS</div>
                        <div class="h4 fw-bold text-dark mb-0">${totalStudents}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="card officer-stat-card border-0 shadow-sm h-100">
                    <div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">OUTSTANDING</div>
                        <div class="h4 fw-bold text-danger mb-0">${formatCurrency(totalOutstanding)}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="card officer-stat-card border-0 shadow-sm h-100">
                    <div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">COLLECTED</div>
                        <div class="h4 fw-bold text-success mb-0">${formatCurrency(totalPaid)}</div>
                    </div>
                </div>
            </div>
            <div class="col-6 col-lg-3">
                <div class="card officer-stat-card border-0 shadow-sm h-100">
                    <div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">COMPLETION</div>
                        <div class="h4 fw-bold text-primary mb-0">${completionRate}%</div>
                        <div class="progress mt-1" style="height: 4px;">
                            <div class="progress-bar bg-primary" style="width: ${completionRate}%"></div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// ---------------------------------------------------------------------------
// Main list view
// ---------------------------------------------------------------------------

function getInitialPaymentViewHTML() {
    const eventOptions = events.map(event => `<option value="${event.$id}">${event.event_name}</option>`).join('');

    return `
        <div class="admin-payments-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                        <h1 class="display-6 fw-bold text-dark mb-1">Student Payments</h1>
                        <p class="text-muted mb-0">Track dues, collect payments, and manage records.</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <div class="officer-search-bar d-flex align-items-center" style="max-width: 300px;">
                            <span class="input-group-text bg-transparent border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search student...">
                        </div>
                    </div>
                </div>
            </header>

            ${getPaymentSummaryHTML()}

            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5" style="min-height: 300px;">
                </div>
        </div>

        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg hover-scale d-flex align-items-center justify-content-center" style="width: 60px; height: 60px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addPaymentModal" title="Add Payment">
             <img src="${plusLgIcon}" style="width: 1.5rem; filter: invert(1);">
        </button>
        
        <div class="modal fade" id="addPaymentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4"><form id="addPaymentForm">
            <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">New Payment Record</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body p-4">
                <div class="mb-3"><label class="form-label small fw-bold text-muted">ITEM NAME</label><input type="text" id="itemName" class="form-control" required placeholder="e.g. Membership Fee"></div>
                <div class="row g-3 mb-3">
                    <div class="col-7"><label class="form-label small fw-bold text-muted">PRICE</label><input type="number" id="price" class="form-control" min="0.01" step="0.01" required></div>
                    <div class="col-5"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" id="quantity" class="form-control" value="1" min="1" required></div>
                </div>
                
                <div class="form-check form-switch mb-3 p-3 bg-light rounded-3 border">
                    <input class="form-check-input ms-0 me-2" type="checkbox" id="isEventCheckbox" style="float:none;">
                    <label class="form-check-label fw-medium" for="isEventCheckbox">Link to an Event</label>
                </div>

                <div id="activity-group" class="mb-3"><label class="form-label small fw-bold text-muted">ACTIVITY NAME</label><input type="text" id="activityName" class="form-control" placeholder="e.g. 1st Semester Collection"></div>
                <div id="event-group" class="mb-3 d-none"><label class="form-label small fw-bold text-muted">SELECT EVENT</label><select id="eventId" class="form-select">${eventOptions}</select></div>
                
                <hr class="my-4 text-muted opacity-25">
                
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="allStudentsCheckbox">
                    <label class="form-check-label" for="allStudentsCheckbox">Assign to all students</label>
                </div>
                
                <div id="single-student-group" class="position-relative">
                    <label class="form-label small fw-bold text-muted">ASSIGN TO</label>
                    <input type="text" id="studentName" class="form-control" autocomplete="off" required placeholder="Search student name...">
                    <div id="autocomplete-results" class="list-group position-absolute w-100 shadow-sm mt-1" style="z-index: 1060; max-height: 200px; overflow-y: auto;"></div>
                </div>
            </div>
            <div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Create Payment</button></div>
        </form></div></div></div>
    `;
}

function getStudentDetailsPageHTML(student, paymentsForStudent) {
    const pending = paymentsForStudent.filter(p => !p.is_paid);
    const paid = paymentsForStudent.filter(p => p.is_paid);
    const totalDue = pending.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalPaid = paid.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const eventOptions = events.map(event => `<option value="${event.$id}">${event.event_name}</option>`).join('');

    const studentData = student.students || {};
    const displayName = studentData.name || student.username;

    // Helper to generate mobile card for payment
    const createMobilePaymentCard = (p, isPending = true) => {
        const paymentData = safePaymentData(p);
        const forName = resolvePaymentForName(p);

        return `
            <div class="mobile-payment-item">
                <div class="item-header">
                    <span class="item-name">${p.item_name}</span>
                    <span class="item-amount ${isPending ? 'text-dark' : 'text-muted'}">${formatCurrency(p.price * p.quantity)}</span>
                </div>
                <div class="item-details">
                    <div class="detail-row">
                        <span class="label">For</span>
                        <span class="value">${forName}</span>
                    </div>
                    <div class="detail-row">
                        <span class="label">Status</span>
                        <span class="value">${isPending
                ? '<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill px-2 py-1">Pending</span>'
                : '<span class="badge bg-success-subtle text-success rounded-pill px-2 py-1">Paid</span>'}</span>
                    </div>
                </div>
                ${isPending ? `
                <div class="item-actions">
                    <button class="btn btn-success btn-sm paid-payment-btn" data-payment='${paymentData}'>
                        <i class="bi bi-check-circle-fill me-1"></i> Mark Paid
                    </button>
                    <button class="btn btn-outline-secondary btn-sm edit-payment-btn" data-payment='${paymentData}'>
                        <i class="bi bi-pencil-fill"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm delete-payment-btn" data-payment-id="${p.$id}" data-payment-name="${p.item_name}">
                        <i class="bi bi-trash-fill"></i>
                    </button>
                </div>
                ` : ''}
            </div>
        `;
    };

    return `
        <div class="student-payment-details-page container-fluid py-4 px-md-5">
            <div class="d-flex align-items-center gap-3 mb-4 mb-md-5">
                <button id="backToPaymentsBtn" class="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-scale" style="width: 48px; height: 48px;">
                    <img src="${arrowLeftIcon}" width="20" style="opacity: 0.6;">
                </button>
                <div>
                     <h2 class="h3 fw-bold m-0 text-dark">${displayName}</h2>
                     <p class="text-muted m-0 small">${studentData.yearLevel ? 'Year ' + studentData.yearLevel : 'Student'}</p>
                </div>
            </div>

            <!-- Student Summary -->
            <div class="row g-3 mb-4">
                <div class="col-6">
                    <div class="card border-0 shadow-sm"><div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">PENDING</div>
                        <div class="h5 fw-bold text-danger mb-0">${formatCurrency(totalDue)}</div>
                        <small class="text-muted">${pending.length} item${pending.length !== 1 ? 's' : ''}</small>
                    </div></div>
                </div>
                <div class="col-6">
                    <div class="card border-0 shadow-sm"><div class="card-body p-3">
                        <div class="text-muted small fw-bold mb-1">PAID</div>
                        <div class="h5 fw-bold text-success mb-0">${formatCurrency(totalPaid)}</div>
                        <small class="text-muted">${paid.length} item${paid.length !== 1 ? 's' : ''}</small>
                    </div></div>
                </div>
            </div>

            <!-- Pending Payments Section -->
            <div class="card border-0 shadow-sm mb-4 overflow-hidden">
                <div class="card-header bg-warning-subtle border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="fw-bold m-0 text-warning-emphasis d-flex align-items-center gap-2"><i class="bi bi-hourglass-split"></i> Pending</h6>
                    <span class="badge bg-warning text-dark rounded-pill px-3">${formatCurrency(totalDue)} Due</span>
                </div>
                
                <!-- Desktop Table -->
                <div class="card-body p-0 table-responsive desktop-table">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="bg-light text-secondary small text-uppercase"><tr><th class="ps-4 py-3">Item</th><th class="py-3">For</th><th class="text-end py-3">Total</th><th class="text-end pe-4 py-3">Actions</th></tr></thead>
                        <tbody>${pending.length > 0 ? pending.map(p => {
        const paymentData = safePaymentData(p);
        const forName = resolvePaymentForName(p);

        return `<tr>
                                <td class="ps-4 fw-medium text-dark">${p.item_name}</td>
                                <td class="text-muted small">${forName}</td>
                                <td class="text-end fw-bold text-dark">${formatCurrency(p.price * p.quantity)}</td>
                                <td class="text-end pe-4">
                                    <div class="dropdown">
                                        <button class="btn btn-sm btn-light rounded-circle" data-bs-toggle="dropdown"><img src="${threeDotsIcon}" width="16" style="opacity:0.5"></button>
                                        <ul class="dropdown-menu dropdown-menu-end shadow-sm border-0">
                                            <li><button class="dropdown-item d-flex gap-2 align-items-center paid-payment-btn text-success" data-payment='${paymentData}'><i class="bi bi-check-circle-fill"></i> Mark Paid</button></li>
                                            <li><button class="dropdown-item d-flex gap-2 align-items-center edit-payment-btn" data-payment='${paymentData}'><i class="bi bi-pencil-fill text-muted"></i> Edit</button></li>
                                            <li><hr class="dropdown-divider"></li>
                                            <li><button class="dropdown-item d-flex gap-2 align-items-center delete-payment-btn text-danger" data-payment-id="${p.$id}" data-payment-name="${p.item_name}"><i class="bi bi-trash-fill"></i> Delete</button></li>
                                        </ul>
                                    </div>
                                </td>
                            </tr>`}).join('') : '<tr><td colspan="4" class="text-center text-muted py-5 small">No pending payments.</td></tr>'}
                        </tbody>
                    </table>
                </div>
                
                <!-- Mobile Cards -->
                <div class="mobile-officer-card-list p-3">
                    ${pending.length > 0
            ? pending.map(p => createMobilePaymentCard(p, true)).join('')
            : '<div class="text-center text-muted py-4 small">No pending payments.</div>'}
                </div>
            </div>

            <!-- Payment History Section -->
            <div class="card border-0 shadow-sm overflow-hidden">
                <div class="card-header bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center flex-wrap gap-2">
                    <h6 class="fw-bold m-0 text-secondary d-flex align-items-center gap-2"><i class="bi bi-clock-history"></i> History</h6>
                    ${(totalDue === 0 && paid.length > 0) ? `<button class="btn btn-sm btn-outline-danger border-0 clear-paid-records-btn" data-student-id="${student.$id}" data-student-name="${displayName}"><i class="bi bi-trash me-1"></i> Clear</button>` : ''}
                </div>
                
                <!-- Desktop Table -->
                <div class="card-body p-0 table-responsive desktop-table">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="bg-white text-secondary small text-uppercase"><tr><th class="ps-4 py-3">Item</th><th class="py-3">For</th><th class="text-end py-3">Total</th><th class="text-end pe-4 py-3">Status</th></tr></thead>
                        <tbody>${paid.length > 0 ? paid.map(p => {
                const forName = resolvePaymentForName(p);
                return `<tr><td class="ps-4 text-muted">${p.item_name}</td><td class="text-muted small">${forName}</td><td class="text-end text-muted">${formatCurrency(p.price * p.quantity)}</td><td class="text-end pe-4"><span class="badge bg-success-subtle text-success rounded-pill px-2">Paid</span></td></tr>`;
            }).join('') : '<tr><td colspan="4" class="text-center text-muted py-5 small">No payment history yet.</td></tr>'}</tbody>
                    </table>
                </div>
                
                <!-- Mobile Cards -->
                <div class="mobile-officer-card-list p-3">
                    ${paid.length > 0
            ? paid.map(p => createMobilePaymentCard(p, false)).join('')
            : '<div class="text-center text-muted py-4 small">No payment history yet.</div>'}
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="editPaymentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4"><form id="editPaymentForm">
            <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">Edit Payment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body p-4">
                <input type="hidden" id="editPaymentId">
                <div class="mb-3"><label class="form-label small fw-bold text-muted">ITEM NAME</label><input type="text" id="editItemName" class="form-control" required></div>
                <div class="row g-3 mb-3"><div class="col-7"><label class="form-label small fw-bold text-muted">PRICE</label><input type="number" id="editPrice" class="form-control" min="0.01" step="0.01" required></div><div class="col-5"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" id="editQuantity" class="form-control" value="1" min="1" required></div></div>
                <div class="form-check form-switch mb-3 p-3 bg-light rounded-3 border">
                    <input class="form-check-input ms-0 me-2" type="checkbox" id="editIsEventCheckbox" style="float:none;">
                    <label class="form-check-label fw-medium" for="editIsEventCheckbox">Link to Event</label>
                </div>
                <div id="edit-activity-group" class="mb-3"><label class="form-label small fw-bold text-muted">ACTIVITY NAME</label><input type="text" id="editActivityName" class="form-control"></div>
                <div id="edit-event-group" class="mb-3 d-none"><label class="form-label small fw-bold text-muted">SELECT EVENT</label><select id="editEventId" class="form-select">${eventOptions}</select></div>
            </div>
            <div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Save</button></div>
        </form></div></div></div>
    `;
}

const renderStudentCards = (studentsToRender, reason = 'initial') => {
    const cardsContainer = document.getElementById('student-cards-container');
    if (!cardsContainer) return;

    if (studentsToRender.length > 0) {
        cardsContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5';

        const paymentsByStudent = allPayments.reduce((acc, p) => {
            const sId = (p.students && p.students.$id) ? p.students.$id : p.students;
            if (sId) {
                (acc[sId] = acc[sId] || []).push(p);
            }
            return acc;
        }, {});

        cardsContainer.innerHTML = studentsToRender.map(student => {
            const studentDocId = (student.students && student.students.$id) ? student.students.$id : student.students;
            return createStudentPaymentCardHTML(student, paymentsByStudent[studentDocId] || [], { eraserIcon });
        }).join('');
    } else {
        cardsContainer.className = 'row flex-grow-1 align-items-center justify-content-center';
        let icon, title, text;
        if (reason === 'filter') {
            icon = funnelIcon;
            title = 'No Matches Found';
            text = 'Try adjusting your filters or search terms.';
        } else {
            icon = peopleIcon;
            title = 'Directory Empty';
            text = 'No students found.';
        }
        cardsContainer.innerHTML = `
            <div class="col-12"><div class="text-center text-muted py-5">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${icon}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">${title}</h4>
                <p class="text-muted">${text}</p>
            </div></div>`;
    }
};

/** Update just the summary cards without re-rendering the whole view */
function refreshSummaryCards() {
    const existing = document.getElementById('paymentSummaryCards');
    if (!existing) return;
    const tmp = document.createElement('div');
    tmp.innerHTML = getPaymentSummaryHTML();
    existing.replaceWith(tmp.firstElementChild);
}

const renderInitialView = () => {
    currentStudent = null;
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper) return;
    wrapper.innerHTML = getInitialPaymentViewHTML();
    initializeModals();
};

const refreshStudentDetailsView = async (accountId) => {
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper || !accountId) return;
    wrapper.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-50 p-5"><div class="spinner-border text-primary"></div></div>`;
    try {
        const studentAccount = await api.users.getAccount(accountId);
        const studentDocId = (studentAccount.students && studentAccount.students.$id) ? studentAccount.students.$id : studentAccount.students;

        if (!studentDocId) throw new Error("No linked student profile found.");

        const paymentsRes = await api.payments.listForStudent(studentDocId);

        currentStudent = studentAccount;
        wrapper.innerHTML = getStudentDetailsPageHTML(studentAccount, paymentsRes.documents);
        initializeModals();
    } catch (error) {
        console.error(error);
        showToast('Failed to load student details', 'error');
        renderInitialView();
    }
};

function initializeModals() {
    const addModalEl = document.getElementById('addPaymentModal');
    const editModalEl = document.getElementById('editPaymentModal');
    if (addModalEl && !Modal.getInstance(addModalEl)) addPaymentModalInstance = new Modal(addModalEl);
    if (editModalEl && !Modal.getInstance(editModalEl)) editPaymentModalInstance = new Modal(editModalEl);

    // Fix aria-hidden focus issue: blur active element before modal hides
    [addModalEl, editModalEl].forEach(el => {
        if (el) {
            el.addEventListener('hide.bs.modal', () => {
                if (el.contains(document.activeElement)) {
                    document.activeElement.blur();
                }
            });
        }
    });
}

// ---------------------------------------------------------------------------
// Validation helpers
// ---------------------------------------------------------------------------

function validatePaymentForm(data) {
    const errors = [];
    if (!data.item_name || !data.item_name.trim()) errors.push('Item name is required.');
    if (typeof data.price !== 'number' || isNaN(data.price) || data.price <= 0) errors.push('Price must be greater than 0.');
    if (typeof data.quantity !== 'number' || isNaN(data.quantity) || data.quantity < 1) errors.push('Quantity must be at least 1.');
    if (!data.is_event && !data.activity?.trim()) errors.push('Activity name is required when not linked to an event.');
    if (data.is_event && !data.events) errors.push('Please select an event.');
    return errors;
}

// ---------------------------------------------------------------------------
// Main event wiring
// ---------------------------------------------------------------------------

async function attachEventListeners(currentUser, profile) {
    // Reset module-level state to prevent stale data from previous renders
    allStudents = [];
    allPayments = [];
    events = [];
    currentStudent = null;

    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-50 p-5"><div class="spinner-border text-primary"></div></div>`;
    try {
        const [paymentsRes, eventsRes, accountsRes] = await Promise.all([
            api.payments.list(),
            api.events.list({ limit: 500, orderDesc: false }),
            api.users.listStudents()
        ]);
        allPayments = paymentsRes.documents;
        events = eventsRes.documents.filter(e => !e.event_ended);
        allStudents = accountsRes.documents;

        renderInitialView();
        let selectedStudentDocId = null;

        // Debounced search filters
        const applyFilters = () => {
            const searchInput = document.getElementById('studentSearchInput');
            if (!searchInput) return;

            const searchTerm = searchInput.value.toLowerCase().trim();
            let filtered = allStudents;

            if (searchTerm) {
                filtered = filtered.filter(s => {
                    const name = (s.students && s.students.name) ? s.students.name : s.username;
                    return name.toLowerCase().includes(searchTerm);
                });
            }

            renderStudentCards(filtered, (filtered.length === 0) ? 'filter' : 'initial');
        };

        const debouncedApplyFilters = debounce(applyFilters, 250);
        const debouncedAutocomplete = debounce((searchTerm) => {
            const results = document.getElementById('autocomplete-results');
            if (!results) return;
            if (searchTerm.length < 2) { results.innerHTML = ''; return; }

            const matches = allStudents.filter(s => {
                const name = (s.students && s.students.name) ? s.students.name : s.username;
                return name.toLowerCase().includes(searchTerm);
            }).slice(0, 5);

            results.innerHTML = matches.map(s => {
                const name = (s.students && s.students.name) ? s.students.name : s.username;
                const sDocId = (s.students && s.students.$id) ? s.students.$id : s.students;
                return `<a href="#" class="list-group-item list-group-item-action" data-studentdocid="${sDocId}" data-name="${name}">${name}</a>`;
            }).join('');
        }, 200);

        const refreshDataAndRender = async () => {
            if (currentStudent) {
                await refreshStudentDetailsView(currentStudent.$id);
            } else {
                const paymentsRes = await api.payments.list();
                allPayments = paymentsRes.documents;
                refreshSummaryCards();
                applyFilters();
            }
        };

        applyFilters();

        // Reset selected student when add-payment modal closes
        const addModalEl = document.getElementById('addPaymentModal');
        if (addModalEl) {
            addModalEl.addEventListener('hidden.bs.modal', () => {
                selectedStudentDocId = null;
                const nameInput = document.getElementById('studentName');
                if (nameInput) { nameInput.value = ''; nameInput.disabled = false; nameInput.required = true; }
                const allCb = document.getElementById('allStudentsCheckbox');
                if (allCb) allCb.checked = false;
                const results = document.getElementById('autocomplete-results');
                if (results) results.innerHTML = '';
            });
        }

        // ---------------------------------------------------------------
        // Click delegation
        // ---------------------------------------------------------------
        wrapper.addEventListener('click', async (e) => {
            const card = e.target.closest('.student-payment-card');
            if (card) { await refreshStudentDetailsView(card.dataset.studentId); return; }

            const backBtn = e.target.closest('#backToPaymentsBtn');
            if (backBtn) {
                // Refresh global payment data so summary cards update
                const paymentsRes = await api.payments.list();
                allPayments = paymentsRes.documents;
                renderInitialView();
                applyFilters();
                return;
            }

            const autocompleteLink = e.target.closest('#autocomplete-results a');
            if (autocompleteLink) {
                e.preventDefault();
                selectedStudentDocId = autocompleteLink.dataset.studentdocid;
                document.getElementById('studentName').value = autocompleteLink.dataset.name;
                document.getElementById('autocomplete-results').innerHTML = '';
                return;
            }

            const editBtn = e.target.closest('.edit-payment-btn');
            if (editBtn) {
                const payment = JSON.parse(editBtn.dataset.payment.replace(/\\'/g, "'"));
                const form = document.getElementById('editPaymentForm');
                form.querySelector('#editPaymentId').value = payment.$id;
                form.querySelector('#editItemName').value = payment.item_name;
                form.querySelector('#editPrice').value = payment.price;
                form.querySelector('#editQuantity').value = payment.quantity;
                form.querySelector('#editIsEventCheckbox').checked = payment.is_event;
                form.querySelector('#edit-activity-group').classList.toggle('d-none', payment.is_event);
                form.querySelector('#edit-event-group').classList.toggle('d-none', !payment.is_event);

                if (payment.is_event) {
                    const evId = (payment.events && payment.events.$id) ? payment.events.$id : payment.events;
                    form.querySelector('#editEventId').value = evId || '';
                } else {
                    form.querySelector('#editActivityName').value = payment.activity;
                }

                editPaymentModalInstance.show();
                return;
            }

            // --- Mark Paid (with loading state) ---
            const paidBtn = e.target.closest('.paid-payment-btn');
            if (paidBtn) {
                const payment = JSON.parse(paidBtn.dataset.payment.replace(/\\'/g, "'"));
                const confirmed = await confirmAction('Mark as Paid', `Mark "${payment.item_name}" as Paid?`, 'Mark Paid', 'success');
                if (confirmed) {
                    paidBtn.disabled = true;
                    paidBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Saving…';
                    try {
                        const sData = currentStudent.students || {};
                        const sName = sData.name || currentStudent.username;

                        await api.payments.markPaid(payment, currentUser.$id, sName);
                        showToast(`"${payment.item_name}" marked as paid`, 'success');
                        await refreshDataAndRender();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        paidBtn.disabled = false;
                        paidBtn.innerHTML = '<i class="bi bi-check-circle-fill me-1"></i> Mark Paid';
                    }
                }
                return;
            }

            // --- Delete (with loading state) ---
            const deleteBtn = e.target.closest('.delete-payment-btn');
            if (deleteBtn) {
                const confirmed = await confirmAction('Delete Payment', `Delete "${deleteBtn.dataset.paymentName}"? This cannot be undone.`, 'Delete', 'danger');
                if (confirmed) {
                    deleteBtn.disabled = true;
                    try {
                        await api.payments.delete(deleteBtn.dataset.paymentId);
                        showToast('Payment deleted', 'success');
                        await refreshDataAndRender();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        deleteBtn.disabled = false;
                    }
                }
                return;
            }

            // --- Clear paid records for a student ---
            const clearBtn = e.target.closest('.clear-paid-records-btn');
            if (clearBtn) {
                const studentId = clearBtn.dataset.studentId;
                const studentName = clearBtn.dataset.studentName;
                const confirmed = await confirmAction(
                    'Clear Paid Records',
                    `Delete all paid payment records for "${studentName}"? This cannot be undone.`,
                    'Clear All',
                    'danger'
                );
                if (confirmed) {
                    clearBtn.disabled = true;
                    clearBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Clearing…';
                    try {
                        const studentDocId = (currentStudent.students && currentStudent.students.$id) ? currentStudent.students.$id : currentStudent.students;
                        const paidRes = await api.payments.listForStudent(studentDocId);
                        const paidPayments = paidRes.documents.filter(p => p.is_paid);

                        if (paidPayments.length === 0) {
                            showToast('No paid records to clear', 'info');
                        } else {
                            await Promise.all(paidPayments.map(p => api.payments.delete(p.$id)));
                            showToast(`Cleared ${paidPayments.length} paid record${paidPayments.length !== 1 ? 's' : ''}`, 'success');
                        }
                        await refreshDataAndRender();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        clearBtn.disabled = false;
                        clearBtn.innerHTML = '<i class="bi bi-trash me-1"></i> Clear';
                    }
                }
                return;
            }

            // --- Clear student records from the card list ---
            const clearCardBtn = e.target.closest('.clear-student-records-btn');
            if (clearCardBtn) {
                const accountId = clearCardBtn.dataset.studentId;
                const studentName = clearCardBtn.dataset.studentName;
                const confirmed = await confirmAction(
                    'Clear Paid Records',
                    `Delete all paid payment records for "${studentName}"?`,
                    'Clear',
                    'danger'
                );
                if (confirmed) {
                    clearCardBtn.disabled = true;
                    try {
                        const acc = await api.users.getAccount(accountId);
                        const sDocId = (acc.students && acc.students.$id) ? acc.students.$id : acc.students;
                        const paidRes = await api.payments.listForStudent(sDocId);
                        const paidPayments = paidRes.documents.filter(p => p.is_paid);
                        if (paidPayments.length > 0) {
                            await Promise.all(paidPayments.map(p => api.payments.delete(p.$id)));
                            showToast(`Cleared ${paidPayments.length} record${paidPayments.length !== 1 ? 's' : ''} for ${studentName}`, 'success');
                        }
                        const paymentsRes = await api.payments.list();
                        allPayments = paymentsRes.documents;
                        refreshSummaryCards();
                        applyFilters();
                    } catch (error) {
                        showToast(`Error: ${error.message}`, 'error');
                        clearCardBtn.disabled = false;
                    }
                }
            }
        });

        // ---------------------------------------------------------------
        // Input delegation (with debounce)
        // ---------------------------------------------------------------
        wrapper.addEventListener('input', e => {
            if (e.target.id === 'studentSearchInput') {
                debouncedApplyFilters();
            } else if (e.target.id === 'studentName') {
                debouncedAutocomplete(e.target.value.toLowerCase());
            }
        });

        // ---------------------------------------------------------------
        // Form submissions
        // ---------------------------------------------------------------
        wrapper.addEventListener('submit', async (e) => {
            e.preventDefault();
            const form = e.target;
            const btn = form.querySelector('button[type="submit"]');
            const originalBtnText = btn.innerHTML;
            btn.disabled = true;
            btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Processing…';

            try {
                if (form.id === 'addPaymentForm') {
                    const isForAll = document.getElementById('allStudentsCheckbox').checked;
                    const isEvent = document.getElementById('isEventCheckbox').checked;

                    const base = {
                        item_name: document.getElementById('itemName').value.trim(),
                        price: parseFloat(document.getElementById('price').value),
                        quantity: parseInt(document.getElementById('quantity').value, 10),
                        is_event: isEvent,
                        events: isEvent ? document.getElementById('eventId').value : null,
                        activity: isEvent ? null : document.getElementById('activityName').value.trim(),
                        is_paid: false
                    };

                    // --- Validation ---
                    const errors = validatePaymentForm(base);
                    if (!isForAll && !selectedStudentDocId) errors.push('Please select a student.');
                    if (errors.length > 0) {
                        showToast(errors[0], 'warning');
                        return; // finally block re-enables button
                    }

                    if (isForAll) {
                        const confirmed = await confirmAction('Assign to All', `Assign "${base.item_name}" to all ${allStudents.length} students?`, 'Assign All', 'primary');
                        if (!confirmed) return;

                        const ids = allStudents.map(s => (s.students && s.students.$id) ? s.students.$id : s.students).filter(Boolean);
                        // Batch in chunks of 20 to avoid overwhelming the API
                        const CHUNK = 20;
                        let created = 0;
                        for (let i = 0; i < ids.length; i += CHUNK) {
                            const chunk = ids.slice(i, i + CHUNK);
                            await Promise.all(chunk.map(id => api.payments.create({ ...base, students: id })));
                            created += chunk.length;
                            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-1"></span> ${created}/${ids.length}`;
                        }
                        showToast(`Payment assigned to ${created} students`, 'success');
                    } else {
                        await api.payments.create({ ...base, students: selectedStudentDocId });
                        showToast(`Payment "${base.item_name}" created`, 'success');
                    }
                    addPaymentModalInstance.hide();
                    form.reset();
                    selectedStudentDocId = null;
                } else if (form.id === 'editPaymentForm') {
                    const isEvent = document.getElementById('editIsEventCheckbox').checked;
                    const updateData = {
                        item_name: document.getElementById('editItemName').value.trim(),
                        price: parseFloat(document.getElementById('editPrice').value),
                        quantity: parseInt(document.getElementById('editQuantity').value, 10),
                        is_event: isEvent,
                        events: isEvent ? document.getElementById('editEventId').value : null,
                        activity: isEvent ? null : document.getElementById('editActivityName').value.trim()
                    };

                    const errors = validatePaymentForm(updateData);
                    if (errors.length > 0) {
                        showToast(errors[0], 'warning');
                        return;
                    }

                    await api.payments.update(document.getElementById('editPaymentId').value, updateData);
                    showToast('Payment updated', 'success');
                    editPaymentModalInstance.hide();
                }
                await refreshDataAndRender();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = originalBtnText;
            }
        });

        // ---------------------------------------------------------------
        // Change delegation
        // ---------------------------------------------------------------
        wrapper.addEventListener('change', e => {
            if (e.target.id.includes('IsEventCheckbox')) {
                const isEdit = e.target.id.includes('edit');
                const form = e.target.closest('form');
                form.querySelector(isEdit ? '#edit-activity-group' : '#activity-group').classList.toggle('d-none', e.target.checked);
                form.querySelector(isEdit ? '#edit-event-group' : '#event-group').classList.toggle('d-none', !e.target.checked);
            }
            if (e.target.id === 'allStudentsCheckbox') {
                const inp = document.getElementById('studentName');
                inp.disabled = e.target.checked;
                inp.required = !e.target.checked;
                if (e.target.checked) { inp.value = ''; selectedStudentDocId = null; }
            }
        });

    } catch (error) {
        console.error(error);
        wrapper.innerHTML = `<div class="alert alert-danger m-4">Error loading payment module. Please try refreshing the page.</div>`;
    }
}

export default function renderPaymentView(currentUser, profile) {
    return {
        html: `<div class="admin-payments-container-wrapper d-flex flex-column" style="min-height: 100vh;"></div>`,
        afterRender: () => attachEventListeners(currentUser, profile)
    };
}
