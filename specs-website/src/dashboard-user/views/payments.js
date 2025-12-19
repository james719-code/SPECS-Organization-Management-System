// --- IMPORTS ---
import { databases } from '../../shared/appwrite.js';
import { Query, ID } from 'appwrite';
import { Modal } from 'bootstrap';

// --- SVG ICON IMPORTS ---
import trashIcon from 'bootstrap-icons/icons/trash.svg';
import personCircleIcon from 'bootstrap-icons/icons/person-circle.svg';
import plusLgIcon from 'bootstrap-icons/icons/plus-lg.svg';
import arrowLeftIcon from 'bootstrap-icons/icons/arrow-left.svg';
import threeDotsIcon from 'bootstrap-icons/icons/three-dots.svg';
import checkCircleFillIcon from 'bootstrap-icons/icons/check-circle-fill.svg';
import pencilFillIcon from 'bootstrap-icons/icons/pencil-fill.svg';
import trashFillIcon from 'bootstrap-icons/icons/trash-fill.svg';
import eraserIcon from 'bootstrap-icons/icons/eraser.svg';
import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import peopleIcon from 'bootstrap-icons/icons/people.svg';
import personXIcon from 'bootstrap-icons/icons/person-x.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import wallet2Icon from 'bootstrap-icons/icons/wallet2.svg';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_PAYMENTS = import.meta.env.VITE_COLLECTION_ID_PAYMENTS;
const COLLECTION_ID_REVENUE = import.meta.env.VITE_COLLECTION_ID_REVENUE;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_NON_OFFICER_STUDENT = import.meta.env.VITE_COLLECTION_NON_OFFICER_STUDENT;

// --- HELPERS ---
const formatCurrency = (value) => new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(value);

// --- STATE MANAGEMENT ---
let nonOfficerStudents = [];
let allPayments = [];
let events = [];
let currentStudent = null;
let addPaymentModalInstance, editPaymentModalInstance;

// --- TEMPLATES ---

/**
 * Modern Card for Student Payment Status
 */
function createStudentPaymentCardHTML(student, paymentsForStudent) {
    const pendingPayments = paymentsForStudent.filter(p => !p.isPaid);
    const hasPaidRecords = paymentsForStudent.some(p => p.isPaid);
    const totalDue = pendingPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const hasDues = totalDue > 0;

    // Status Logic
    const statusBadge = hasDues
        ? `<span class="badge bg-danger-subtle text-danger border border-danger-subtle rounded-pill px-3 py-2">Due: ${formatCurrency(totalDue)}</span>`
        : `<span class="badge bg-success-subtle text-success border border-success-subtle rounded-pill px-3 py-2"><i class="bi bi-check-circle-fill me-1"></i> Paid</span>`;

    const initials = (student.fullname || student.name).split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm student-payment-card" role="button" data-student-id="${student.$id}">
                <div class="card-body p-4 position-relative">
                    ${!hasDues && hasPaidRecords ? `
                        <button class="btn btn-sm btn-light rounded-circle shadow-sm position-absolute top-0 end-0 m-3 clear-student-records-btn" 
                                title="Clear History" 
                                data-student-id="${student.$id}" 
                                data-student-name="${student.fullname || student.name}"
                                style="width: 32px; height: 32px;">
                            <img src="${eraserIcon}" style="width: 14px; opacity: 0.6;">
                        </button>
                    ` : ''}
                    
                    <div class="d-flex align-items-center mb-4">
                        <div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold fs-5" style="width: 50px; height: 50px;">
                            ${initials}
                        </div>
                        <div>
                            <h6 class="fw-bold text-dark mb-0 text-truncate" style="max-width: 140px;" title="${student.fullname || student.name}">${student.fullname || student.name}</h6>
                            <small class="text-muted">${student.yearLevel || student.section}</small>
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

function getInitialPaymentViewHTML(sectionOptionsHTML) {
    const eventOptions = events.map(event => `<option value="${event.event_name}">${event.event_name}</option>`).join('');

    return `
        <div class="admin-payments-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Student Payments</h1>
                    <p class="text-muted mb-0">Track dues, collect payments, and manage records.</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <select id="sectionFilter" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px;">
                            <option value="all">All Sections</option>
                            ${sectionOptionsHTML}
                        </select>
                        <div class="input-group shadow-sm rounded-3 overflow-hidden bg-white border-0" style="max-width: 300px;">
                            <span class="input-group-text bg-white border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search student...">
                        </div>
                    </div>
                </div>
            </header>

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
                    <div class="col-7"><label class="form-label small fw-bold text-muted">PRICE</label><input type="number" id="price" class="form-control" min="0" step="0.01" required></div>
                    <div class="col-5"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" id="quantity" class="form-control" value="1" min="1" required></div>
                </div>
                
                <div class="form-check form-switch mb-3 p-3 bg-light rounded-3 border">
                    <input class="form-check-input ms-0 me-2" type="checkbox" id="isEventCheckbox" style="float:none;">
                    <label class="form-check-label fw-medium" for="isEventCheckbox">Link to an Event</label>
                </div>

                <div id="activity-group" class="mb-3"><label class="form-label small fw-bold text-muted">ACTIVITY NAME</label><input type="text" id="activityName" class="form-control" placeholder="e.g. 1st Semester Collection"></div>
                <div id="event-group" class="mb-3 d-none"><label class="form-label small fw-bold text-muted">SELECT EVENT</label><select id="eventName" class="form-select">${eventOptions}</select></div>
                
                <hr class="my-4 text-muted opacity-25">
                
                <div class="form-check form-switch mb-3">
                    <input class="form-check-input" type="checkbox" id="allStudentsCheckbox">
                    <label class="form-check-label" for="allStudentsCheckbox">Assign to all non-officers</label>
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
    const pending = paymentsForStudent.filter(p => !p.isPaid);
    const paid = paymentsForStudent.filter(p => p.isPaid);
    const totalDue = pending.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const eventOptions = events.map(event => `<option value="${event.event_name}">${event.event_name}</option>`).join('');

    return `
        <div class="student-payment-details-page container-fluid py-4 px-md-5">
            <div class="d-flex align-items-center gap-3 mb-5">
                <button id="backToPaymentsBtn" class="btn btn-light rounded-circle shadow-sm d-flex align-items-center justify-content-center hover-scale" style="width: 48px; height: 48px;">
                    <img src="${arrowLeftIcon}" width="20" style="opacity: 0.6;">
                </button>
                <div>
                     <h2 class="h3 fw-bold m-0 text-dark">${student.fullname || student.name}</h2>
                     <p class="text-muted m-0 small">${student.yearLevel || student.section}</p>
                </div>
            </div>

            <div class="card border-0 shadow-sm mb-4 overflow-hidden">
                <div class="card-header bg-warning-subtle border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold m-0 text-warning-emphasis d-flex align-items-center gap-2"><i class="bi bi-hourglass-split"></i> Pending Payments</h6>
                    <span class="badge bg-warning text-dark rounded-pill px-3">${formatCurrency(totalDue)} Due</span>
                </div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="bg-light text-secondary small text-uppercase"><tr><th class="ps-4 py-3">Item</th><th class="py-3">For</th><th class="text-end py-3">Total</th><th class="text-end pe-4 py-3">Actions</th></tr></thead>
                        <tbody>${pending.length > 0 ? pending.map(p => {
        const paymentData = JSON.stringify(p).replace(/'/g, "\\'");
        return `<tr>
                                <td class="ps-4 fw-medium text-dark">${p.item_name}</td>
                                <td class="text-muted small">${p.is_event ? p.event : p.activity}</td>
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
                            </tr>`}).join('') : '<tr><td colspan="4" class="text-center text-muted py-5 small">No pending payments. Good job!</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>

            <div class="card border-0 shadow-sm overflow-hidden">
                <div class="card-header bg-light border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                    <h6 class="fw-bold m-0 text-secondary d-flex align-items-center gap-2"><i class="bi bi-clock-history"></i> Payment History</h6>
                    ${(totalDue === 0 && paid.length > 0) ? `<button class="btn btn-sm btn-outline-danger border-0 clear-paid-records-btn" data-student-id="${student.$id}" data-student-name="${student.fullname || student.name}"><i class="bi bi-trash me-1"></i> Clear History</button>` : ''}
                </div>
                <div class="card-body p-0 table-responsive">
                    <table class="table table-hover mb-0 align-middle">
                        <thead class="bg-white text-secondary small text-uppercase"><tr><th class="ps-4 py-3">Item</th><th class="py-3">For</th><th class="text-end py-3">Total</th><th class="text-end pe-4 py-3">Status</th></tr></thead>
                        <tbody>${paid.length > 0 ? paid.map(p => `<tr><td class="ps-4 text-muted">${p.item_name}</td><td class="text-muted small">${p.is_event ? p.event : p.activity}</td><td class="text-end text-muted">${formatCurrency(p.price * p.quantity)}</td><td class="text-end pe-4"><span class="badge bg-success-subtle text-success rounded-pill px-2">Paid</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted py-5 small">No payment history yet.</td></tr>'}</tbody>
                    </table>
                </div>
            </div>
        </div>
        
        <div class="modal fade" id="editPaymentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4"><form id="editPaymentForm">
            <div class="modal-header border-0 pt-4 px-4"><h5 class="modal-title fw-bold">Edit Payment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body p-4">
                <input type="hidden" id="editPaymentId">
                <div class="mb-3"><label class="form-label small fw-bold text-muted">ITEM NAME</label><input type="text" id="editItemName" class="form-control" required></div>
                <div class="row g-3 mb-3"><div class="col-7"><label class="form-label small fw-bold text-muted">PRICE</label><input type="number" id="editPrice" class="form-control" min="0" step="0.01" required></div><div class="col-5"><label class="form-label small fw-bold text-muted">QTY</label><input type="number" id="editQuantity" class="form-control" value="1" min="1" required></div></div>
                <div class="form-check form-switch mb-3 p-3 bg-light rounded-3 border">
                    <input class="form-check-input ms-0 me-2" type="checkbox" id="editIsEventCheckbox" style="float:none;">
                    <label class="form-check-label fw-medium" for="editIsEventCheckbox">Link to Event</label>
                </div>
                <div id="edit-activity-group" class="mb-3"><label class="form-label small fw-bold text-muted">ACTIVITY NAME</label><input type="text" id="editActivityName" class="form-control"></div>
                <div id="edit-event-group" class="mb-3 d-none"><label class="form-label small fw-bold text-muted">SELECT EVENT</label><select id="editEventName" class="form-select">${eventOptions}</select></div>
            </div>
            <div class="modal-footer border-0 pb-4 px-4"><button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary rounded-pill px-4 fw-bold">Save</button></div>
        </form></div></div></div>
    `;
}

// --- LOGIC ---

const renderStudentCards = (studentsToRender, reason = 'initial') => {
    const cardsContainer = document.getElementById('student-cards-container');
    if (!cardsContainer) return;

    if (studentsToRender.length > 0) {
        cardsContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5';
        const paymentsByStudent = allPayments.reduce((acc, p) => {
            (acc[p.student_id] = acc[p.student_id] || []).push(p);
            return acc;
        }, {});
        cardsContainer.innerHTML = studentsToRender.map(student => createStudentPaymentCardHTML(student, paymentsByStudent[student.$id] || [])).join('');
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
            text = 'No non-officer students found.';
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

const renderInitialView = () => {
    currentStudent = null;
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper) return;
    const sections = ['BSCS 1A', 'BSCS 1B', 'BSCS 2A', 'BSCS 2B', 'BSCS 3A', 'BSCS 3B', 'BSCS 4A', 'BSCS 4B'];
    const sectionOptionsHTML = sections.map(s => `<option value="${s}">${s}</option>`).join('');
    wrapper.innerHTML = getInitialPaymentViewHTML(sectionOptionsHTML);
    initializeModals();
};

const refreshStudentDetailsView = async (studentId) => {
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper || !studentId) return;
    wrapper.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-50 p-5"><div class="spinner-border text-primary"></div></div>`;
    try {
        const [paymentsRes, studentRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(5000), Query.equal('student_id', studentId)]),
            databases.getDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, studentId)
        ]);
        currentStudent = studentRes;
        wrapper.innerHTML = getStudentDetailsPageHTML(studentRes, paymentsRes.documents);
        initializeModals();
    } catch (error) {
        renderInitialView();
    }
};

function initializeModals() {
    const addModalEl = document.getElementById('addPaymentModal');
    const editModalEl = document.getElementById('editPaymentModal');
    if (addModalEl && !Modal.getInstance(addModalEl)) addPaymentModalInstance = new Modal(addModalEl);
    if (editModalEl && !Modal.getInstance(editModalEl)) editPaymentModalInstance = new Modal(editModalEl);
}

// --- MAIN LISTENER ---

async function attachEventListeners(currentUser, profile) {
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `<div class="d-flex justify-content-center align-items-center vh-50 p-5"><div class="spinner-border text-primary"></div></div>`;
    try {
        const [paymentsRes, eventsRes, nonOfficersRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.equal('event_ended', false), Query.orderAsc('date_to_held')]),
            databases.listDocuments(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, [Query.limit(5000), Query.orderAsc('name')])
        ]);
        allPayments = paymentsRes.documents;
        events = eventsRes.documents;
        nonOfficerStudents = nonOfficersRes.documents;

        if (nonOfficerStudents.length === 0) {
            wrapper.innerHTML = `<div class="flex-grow-1 d-flex align-items-center justify-content-center text-center text-muted"><div><img src="${personXIcon}" style="width: 60px; opacity: 0.2;"><h4 class="fw-bold mt-3">No Data</h4><p>No students available.</p></div></div>`;
            return;
        }

        renderInitialView();
        let selectedStudentId = null;

        const applyFilters = () => {
            const sectionFilter = document.getElementById('sectionFilter');
            const searchInput = document.getElementById('studentSearchInput');
            if (!sectionFilter || !searchInput) return;

            const selectedSection = sectionFilter.value;
            const searchTerm = searchInput.value.toLowerCase().trim();

            let filteredStudents = nonOfficerStudents; // Show all by default, filter if needed
            // Optional: Filter to only those with records if desired, currently showing all student cards is standard for a directory view

            if (selectedSection !== 'all') filteredStudents = filteredStudents.filter(s => s.section === selectedSection);
            if (searchTerm) filteredStudents = filteredStudents.filter(s => (s.fullname || s.name).toLowerCase().includes(searchTerm));

            renderStudentCards(filteredStudents, (filteredStudents.length === 0) ? 'filter' : 'initial');
        };

        const refreshDataAndRender = async () => {
            if (currentStudent) {
                await refreshStudentDetailsView(currentStudent.$id);
            } else {
                const paymentsRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(5000)]);
                allPayments = paymentsRes.documents;
                applyFilters();
            }
        };

        const sectionFilter = document.getElementById('sectionFilter');
        if (sectionFilter && profile && profile.yearLevel && sectionFilter.querySelector(`[value="${profile.yearLevel}"]`)) {
            sectionFilter.value = profile.yearLevel;
        }
        applyFilters();

        wrapper.addEventListener('click', async (e) => {
            const clearStudentBtn = e.target.closest('.clear-student-records-btn');
            if (clearStudentBtn) {
                e.stopPropagation();
                if (confirm(`Clear paid records history for ${clearStudentBtn.dataset.studentName}?`)) {
                    clearStudentBtn.disabled = true;
                    try {
                        const paidRecords = allPayments.filter(p => p.student_id === clearStudentBtn.dataset.studentId && p.isPaid);
                        if (paidRecords.length > 0) {
                            await Promise.all(paidRecords.map(p => databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, p.$id)));
                            allPayments = allPayments.filter(p => !(p.student_id === clearStudentBtn.dataset.studentId && p.isPaid));
                            applyFilters();
                        }
                    } catch (error) { alert(`Error: ${error.message}`); } finally { clearStudentBtn.disabled = false; }
                }
                return;
            }

            const card = e.target.closest('.student-payment-card');
            if (card) { await refreshStudentDetailsView(card.dataset.studentId); return; }

            const backBtn = e.target.closest('#backToPaymentsBtn');
            if (backBtn) {
                renderInitialView();
                const newFilter = document.getElementById('sectionFilter');
                if (newFilter && profile?.yearLevel) newFilter.value = profile.yearLevel;
                applyFilters();
                return;
            }

            const autocompleteLink = e.target.closest('#autocomplete-results a');
            if (autocompleteLink) {
                e.preventDefault();
                selectedStudentId = autocompleteLink.dataset.id;
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
                if (payment.is_event) form.querySelector('#editEventName').value = payment.event;
                else form.querySelector('#editActivityName').value = payment.activity;
                editPaymentModalInstance.show();
                return;
            }

            const paidBtn = e.target.closest('.paid-payment-btn');
            if (paidBtn) {
                const payment = JSON.parse(paidBtn.dataset.payment.replace(/\\'/g, "'"));
                if (confirm(`Mark "${payment.item_name}" as Paid?`)) {
                    try {
                        await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), {
                            name: `${payment.item_name} (Paid by ${currentStudent.name})`,
                            isEvent: payment.is_event,
                            event: events.find(ev => ev.event_name === payment.event)?.$id || null,
                            activity: payment.is_event ? null : payment.activity,
                            quantity: payment.quantity,
                            price: payment.price,
                            date_earned: new Date().toISOString(),
                            recorder: currentUser.$id
                        });
                        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, payment.$id, { isPaid: true, date_paid: new Date().toISOString() });
                        await refreshDataAndRender();
                    } catch (error) { alert(`Error: ${error.message}`); }
                }
                return;
            }

            const deleteBtn = e.target.closest('.delete-payment-btn');
            if (deleteBtn && confirm(`Delete "${deleteBtn.dataset.paymentName}"?`)) {
                try {
                    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, deleteBtn.dataset.paymentId);
                    await refreshDataAndRender();
                } catch (error) { alert(`Error: ${error.message}`); }
            }

            const clearPaidBtn = e.target.closest('.clear-paid-records-btn');
            if(clearPaidBtn && confirm('Clear all paid history for this student?')) {
                try {
                    const paid = allPayments.filter(p => p.student_id === currentStudent.$id && p.isPaid);
                    await Promise.all(paid.map(p => databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, p.$id)));
                    await refreshDataAndRender();
                } catch(err) { alert('Failed.'); }
            }
        });

        wrapper.addEventListener('input', e => {
            if (e.target.id === 'studentSearchInput' || e.target.id === 'sectionFilter') {
                applyFilters();
            } else if (e.target.id === 'studentName') {
                const results = document.getElementById('autocomplete-results');
                const searchTerm = e.target.value.toLowerCase();
                if (searchTerm.length < 2) { results.innerHTML = ''; return; }
                results.innerHTML = nonOfficerStudents.filter(s => (s.fullname || s.name).toLowerCase().includes(searchTerm))
                    .slice(0, 5)
                    .map(s => `<a href="#" class="list-group-item list-group-item-action" data-id="${s.$id}" data-name="${s.fullname || s.name}">${s.fullname || s.name}</a>`)
                    .join('');
            }
        });

        wrapper.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            btn.disabled = true; btn.innerHTML = 'Processing...';
            try {
                if (e.target.id === 'addPaymentForm') {
                    const isForAll = document.getElementById('allStudentsCheckbox').checked;
                    const base = {
                        item_name: document.getElementById('itemName').value,
                        price: parseFloat(document.getElementById('price').value),
                        quantity: parseInt(document.getElementById('quantity').value, 10),
                        is_event: document.getElementById('isEventCheckbox').checked,
                        event: document.getElementById('eventName').value,
                        activity: document.getElementById('activityName').value,
                        isPaid: false
                    };

                    if (isForAll) {
                        if (confirm(`Assign to all ${nonOfficerStudents.length} students?`)) {
                            await Promise.all(nonOfficerStudents.map(s => databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), { ...base, student_id: s.$id })));
                        }
                    } else {
                        if (!selectedStudentId) throw new Error("Select a student.");
                        await databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), { ...base, student_id: selectedStudentId });
                    }
                    addPaymentModalInstance.hide();
                    e.target.reset();
                } else if (e.target.id === 'editPaymentForm') {
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, document.getElementById('editPaymentId').value, {
                        item_name: document.getElementById('editItemName').value,
                        price: parseFloat(document.getElementById('editPrice').value),
                        quantity: parseInt(document.getElementById('editQuantity').value, 10),
                        is_event: document.getElementById('editIsEventCheckbox').checked,
                        event: document.getElementById('editEventName').value,
                        activity: document.getElementById('editActivityName').value
                    });
                    editPaymentModalInstance.hide();
                }
                await refreshDataAndRender();
            } catch (err) { alert(err.message); } finally { btn.disabled = false; btn.innerHTML = 'Save'; }
        });

        wrapper.addEventListener('change', e => {
            if(e.target.id === 'sectionFilter') applyFilters();
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
                if(e.target.checked) { inp.value = ''; selectedStudentId = null; }
            }
        });

    } catch (error) { wrapper.innerHTML = `<div class="alert alert-danger">Error loading module.</div>`; }
}

export default function renderPaymentView(currentUser, profile) {
    return {
        html: `<div class="admin-payments-container-wrapper d-flex flex-column" style="min-height: 100vh;"></div>`,
        afterRender: () => attachEventListeners(currentUser, profile)
    };
}