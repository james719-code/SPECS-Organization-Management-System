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

// --- HTML TEMPLATE FUNCTIONS ---

/**
 * Creates the HTML for a single, redesigned student payment card.
 * Includes a conditional delete button for students who are fully paid up.
 */
function createStudentPaymentCardHTML(student, paymentsForStudent) {
    const pendingPayments = paymentsForStudent.filter(p => !p.isPaid);
    const hasPaidRecords = paymentsForStudent.some(p => p.isPaid);
    const totalDue = pendingPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const hasDues = totalDue > 0;
    const statusClass = hasDues ? 'has-dues' : 'paid-up';
    const statusText = hasDues ? `Due: ${formatCurrency(totalDue)}` : 'All Paid Up';
    const studentName = student.fullname || student.name;

    return `
        <div class="col">
            <div class="card student-payment-card h-100 ${statusClass}" role="button" data-student-id="${student.$id}">
                <div class="card-body">
                    ${!hasDues && hasPaidRecords ? `
                        <button class="btn btn-sm btn-light clear-student-records-btn" 
                                title="Clear all paid records for ${studentName}" 
                                data-student-id="${student.$id}" 
                                data-student-name="${studentName}">
                            <img src="${trashIcon}" alt="Clear Records" style="width: 1em; height: 1em;">
                        </button>
                    ` : ''}
                    <div class="d-flex align-items-center">
                         <div class="student-avatar">
                            <img src="${personCircleIcon}" alt="Avatar">
                        </div>
                        <div class="student-info">
                            <h6 class="card-title mb-0" title="${studentName}">${studentName}</h6>
                            <p class="card-text small text-body-secondary mb-0">${student.yearLevel || student.section}</p>
                        </div>
                    </div>
                </div>
                <div class="card-footer payment-status">
                    <span class="status-badge">${statusText}</span>
                </div>
            </div>
        </div>
    `;
}

/**
 * Returns the main HTML structure for the initial view, including all modals and styles.
 */
function getInitialPaymentViewHTML(sectionOptionsHTML) {
    const eventOptions = events.map(event => `<option value="${event.event_name}">${event.event_name}</option>`).join('');
    return `
        <style>
            .student-payment-card { border-radius: .75rem; border: 1px solid var(--bs-border-color-translucent); transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease; overflow: hidden; }
            .student-payment-card:hover { transform: translateY(-5px); box-shadow: var(--bs-card-box-shadow); }
            .student-payment-card .card-body { padding: 1rem; position: relative; }
            .student-payment-card .student-avatar img { width: 2.5rem; height: 2.5rem; margin-right: 1rem; filter: opacity(0.5); }
            .student-payment-card .student-info .card-title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px; }
            .student-payment-card .payment-status { text-align: center; font-weight: 500; padding: 0.5rem 0.75rem; border-top: 1px solid var(--bs-border-color-translucent); transition: background-color 0.2s ease; }
            .student-payment-card.has-dues { border-left: 4px solid var(--bs-danger); }
            .student-payment-card.has-dues .student-avatar img { filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%); } /* Red */
            .student-payment-card.has-dues .payment-status { background-color: var(--bs-danger-bg-subtle); color: var(--bs-danger-text-emphasis); }
            .student-payment-card.paid-up { border-left: 4px solid var(--bs-success); }
            .student-payment-card.paid-up .student-avatar img { filter: invert(54%) sepia(55%) saturate(511%) hue-rotate(85deg) brightness(96%) contrast(88%); } /* Green */
            .student-payment-card.paid-up .payment-status { background-color: var(--bs-success-bg-subtle); color: var(--bs-success-text-emphasis); }
            .clear-student-records-btn { position: absolute; top: .5rem; right: .5rem; z-index: 5; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items-center; justify-content: center; opacity: 0.6; }
            .student-payment-card:hover .clear-student-records-btn { opacity: 1; }
            .clear-student-records-btn:hover { background-color: var(--bs-danger-bg-subtle); color: var(--bs-danger-text-emphasis); }
        </style>
        <div class="admin-payments-container d-flex flex-column" style="min-height: calc(100vh - 120px);">
            <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4">
                <h1 class="mb-3 mb-md-0">Student Payments</h1>
                <div class="d-flex flex-column flex-sm-row gap-2">
                    <select id="sectionFilter" class="form-select" style="min-width: 200px;"><option value="all">All Sections</option>${sectionOptionsHTML}</select>
                    <input type="search" id="studentSearchInput" class="form-control" style="max-width: 400px;" placeholder="Search by student name...">
                </div>
            </div>
            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4 flex-grow-1"></div>
        </div>
        <button class="btn btn-primary rounded-circle position-fixed bottom-0 end-0 m-4 shadow-lg d-flex align-items-center justify-content-center" style="width: 56px; height: 56px; z-index: 1050;" type="button" data-bs-toggle="modal" data-bs-target="#addPaymentModal" title="Add New Payment">
             <img src="${plusLgIcon}" alt="Add" style="width: 1.5rem; height: 1.5rem; filter: invert(1);">
        </button>
        
        <!-- Add Payment Modal -->
        <div class="modal fade" id="addPaymentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="addPaymentForm">
            <div class="modal-header"><h5 class="modal-title">Create New Payment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <div class="mb-3"><label for="itemName" class="form-label">Item / Fee Name</label><input type="text" id="itemName" class="form-control" required></div>
                <div class="row g-3 mb-3"><div class="col-sm-6"><label for="price" class="form-label">Price (PHP)</label><input type="number" id="price" class="form-control" min="0" step="0.01" required></div><div class="col-sm-6"><label for="quantity" class="form-label">Quantity</label><input type="number" id="quantity" class="form-control" value="1" min="1" required></div></div>
                <div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="isEventCheckbox"><label class="form-check-label" for="isEventCheckbox">This is for an event</label></div>
                <div id="activity-group" class="mb-3"><label for="activityName" class="form-label">Activity Name</label><input type="text" id="activityName" class="form-control"></div>
                <div id="event-group" class="mb-3 d-none"><label for="eventName" class="form-label">Select Event</label><select id="eventName" class="form-select">${eventOptions}</select></div>
                <hr>
                <div class="form-check form-switch mb-3"><input class="form-check-input" type="checkbox" role="switch" id="allStudentsCheckbox"><label class="form-check-label" for="allStudentsCheckbox">Apply to all non-officer students</label></div>
                <div id="single-student-group" class="position-relative"><label for="studentName" class="form-label">Assign to Student</label><input type="text" id="studentName" class="form-control" autocomplete="off" required><div id="autocomplete-results" class="list-group position-absolute w-100" style="z-index: 1060;"></div></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Add Payment</button></div>
        </form></div></div></div>
    `;
}

/**
 * Returns the HTML for the student's detailed payment view.
 */
function getStudentDetailsPageHTML(student, paymentsForStudent) {
    const pending = paymentsForStudent.filter(p => !p.isPaid);
    const paid = paymentsForStudent.filter(p => p.isPaid);
    const totalDue = pending.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const eventOptions = events.map(event => `<option value="${event.event_name}">${event.event_name}</option>`).join('');

    // --- Icon styles for reuse ---
    const iconStyle = "width: 1.1em; height: 1.1em;";
    const successStyle = `${iconStyle} filter: invert(54%) sepia(55%) saturate(511%) hue-rotate(85deg) brightness(96%) contrast(88%);`;
    const defaultStyle = `${iconStyle} filter: var(--bs-dropdown-link-color-filter);`;
    const dangerStyle = `${iconStyle} filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);`;
    const secondaryStyle = `${iconStyle} filter: var(--bs-btn-color-filter);`;


    return `
        <div class="student-payment-details-page">
            <div class="d-flex align-items-center mb-4">
                <button id="backToPaymentsBtn" class="btn btn-light me-3" title="Back to all students"><img src="${arrowLeftIcon}" alt="Back"></button>
                <div><h1 class="mb-0">${student.fullname || student.name}'s Payments</h1><p class="text-muted mb-0">${student.yearLevel || student.section}</p></div>
            </div>
            <div class="card mb-4">
                <div class="card-header"><h5>Pending Payments</h5></div>
                <div class="card-body">
                    <p class="${totalDue > 0 ? 'text-danger' : 'text-success'} fs-5"><strong>Total Due:</strong> ${formatCurrency(totalDue)}</p>
                    <div class="table-responsive"><table class="table table-striped align-middle">
                        <thead><tr><th>Item</th><th>For</th><th class="text-end">Total</th><th class="text-center">Actions</th></tr></thead>
                        <tbody>${pending.length > 0 ? pending.map(p => { const paymentData = JSON.stringify(p).replace(/'/g, "\\'"); return `<tr><td>${p.item_name}</td><td>${p.is_event ? p.event : p.activity}</td><td class="text-end">${formatCurrency(p.price * p.quantity)}</td><td class="text-center"><div class="dropdown"><button class="btn btn-sm btn-light" type="button" data-bs-toggle="dropdown"><img src="${threeDotsIcon}" alt="Actions"></button><ul class="dropdown-menu dropdown-menu-end">
                            <li><button class="dropdown-item d-flex align-items-center gap-2 paid-payment-btn" type="button" data-payment='${paymentData}'><img src="${checkCircleFillIcon}" alt="Paid" style="${successStyle}">Mark as Paid</button></li>
                            <li><button class="dropdown-item d-flex align-items-center gap-2 edit-payment-btn" type="button" data-payment='${paymentData}'><img src="${pencilFillIcon}" alt="Edit" style="${defaultStyle}">Edit</button></li>
                            <li><hr class="dropdown-divider"></li>
                            <li><button class="dropdown-item d-flex align-items-center gap-2 delete-payment-btn text-danger" type="button" data-payment-id="${p.$id}" data-payment-name="${p.item_name}"><img src="${trashFillIcon}" alt="Delete" style="${dangerStyle}">Delete</button></li>
                        </ul></div></td></tr>`}).join('') : '<tr><td colspan="4" class="text-center text-muted p-4">No pending payments.</td></tr>'}
                        </tbody>
                    </table></div>
                </div>
            </div>
            <div class="card">
                <div class="card-header d-flex justify-content-between align-items-center">
                    <h5>Payment History</h5>
                    ${(totalDue === 0 && paid.length > 0) ? `<button class="btn btn-sm btn-outline-secondary clear-paid-records-btn d-flex align-items-center gap-2" data-student-id="${student.$id}" data-student-name="${student.fullname || student.name}" title="Delete all paid records for this student"><img src="${eraserIcon}" alt="Clear" style="${secondaryStyle}">Clear Paid Records</button>` : ''}
                </div>
                <div class="card-body">
                    <div class="table-responsive"><table class="table table-hover align-middle">
                        <thead><tr><th>Item</th><th>For</th><th class="text-end">Total</th><th class="text-center">Status</th></tr></thead>
                        <tbody>${paid.length > 0 ? paid.map(p => `<tr><td>${p.item_name}</td><td>${p.is_event ? p.event : p.activity}</td><td class="text-end">${formatCurrency(p.price * p.quantity)}</td><td class="text-center"><span class="badge bg-success-subtle text-success-emphasis rounded-pill">Paid</span></td></tr>`).join('') : '<tr><td colspan="4" class="text-center text-muted p-4">No payment history.</td></tr>'}</tbody>
                    </table></div>
                </div>
            </div>
        </div>
        
        <!-- Edit Payment Modal -->
        <div class="modal fade" id="editPaymentModal" tabindex="-1"><div class="modal-dialog modal-dialog-centered"><div class="modal-content"><form id="editPaymentForm">
            <div class="modal-header"><h5 class="modal-title">Edit Payment</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body">
                <input type="hidden" id="editPaymentId">
                <div class="mb-3"><label for="editItemName" class="form-label">Item / Fee Name</label><input type="text" id="editItemName" class="form-control" required></div>
                <div class="row g-3 mb-3"><div class="col-sm-6"><label for="editPrice" class="form-label">Price (PHP)</label><input type="number" id="editPrice" class="form-control" min="0" step="0.01" required></div><div class="col-sm-6"><label for="editQuantity" class="form-label">Quantity</label><input type="number" id="editQuantity" class="form-control" value="1" min="1" required></div></div>
                <div class="form-check mb-3"><input class="form-check-input" type="checkbox" id="editIsEventCheckbox"><label class="form-check-label" for="editIsEventCheckbox">This is for an event</label></div>
                <div id="edit-activity-group" class="mb-3"><label for="editActivityName" class="form-label">Activity Name</label><input type="text" id="editActivityName" class="form-control"></div>
                <div id="edit-event-group" class="mb-3 d-none"><label for="editEventName" class="form-label">Select Event</label><select id="editEventName" class="form-select">${eventOptions}</select></div>
            </div>
            <div class="modal-footer"><button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button><button type="submit" class="btn btn-primary">Save Changes</button></div>
        </form></div></div></div>
    `;
}

// --- RENDERING LOGIC ---

const renderStudentCards = (studentsToRender, reason = 'initial') => {
    const cardsContainer = document.getElementById('student-cards-container');
    if (!cardsContainer) return;

    if (studentsToRender.length > 0) {
        cardsContainer.className = 'row row-cols-1 row-cols-md-2 row-cols-xl-4 g-4';
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
            title = 'No Students Found';
            text = 'Your search or section filter did not match any students.';
        } else {
            icon = peopleIcon;
            title = 'No Student Data';
            text = 'There are no non-officer students in the system to manage payments for.';
        }
        cardsContainer.innerHTML = `<div class="col-12"><div class="text-center text-muted py-5"><div class="mb-3"><img src="${icon}" alt="${title}" style="width: 5rem; height: 5rem; opacity: 0.5;"></div><h4 class="fw-light">${title}</h4><p>${text}</p></div></div>`;
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
    wrapper.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"></div></div>`;
    try {
        const [paymentsRes, studentRes] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(5000), Query.equal('student_id', studentId)]),
            databases.getDocument(DATABASE_ID, COLLECTION_NON_OFFICER_STUDENT, studentId)
        ]);
        currentStudent = studentRes;
        wrapper.innerHTML = getStudentDetailsPageHTML(studentRes, paymentsRes.documents);
        initializeModals();
    } catch (error) {
        console.error("Error refreshing student details:", error);
        renderInitialView();
    }
};

function initializeModals() {
    const addModalEl = document.getElementById('addPaymentModal');
    const editModalEl = document.getElementById('editPaymentModal');
    if (addModalEl && !Modal.getInstance(addModalEl)) addPaymentModalInstance = new Modal(addModalEl);
    if (editModalEl && !Modal.getInstance(editModalEl)) editPaymentModalInstance = new Modal(editModalEl);
}

// --- EVENT HANDLING ---

async function attachEventListeners(currentUser, profile) {
    const wrapper = document.querySelector('.admin-payments-container-wrapper');
    if (!wrapper) return;

    wrapper.innerHTML = `<div class="flex-grow-1 d-flex justify-content-center align-items-center p-5"><div class="spinner-border text-primary" role="status"></div></div>`;
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
            wrapper.innerHTML = `<div class="flex-grow-1 d-flex align-items-center justify-content-center text-center text-muted"><div><img src="${personXIcon}" alt="No students" style="width: 5rem; height: 5rem; opacity: 0.5;"><h4 class="fw-light mt-3">Payments Module Unavailable</h4><p>There are no non-officer students currently in the system.</p></div></div>`;
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

            let filteredStudents = nonOfficerStudents.filter(student => {
                const hasRecords = allPayments.some(p => p.student_id === student.$id);
                return hasRecords;
            });

            if (selectedSection !== 'all') {
                filteredStudents = filteredStudents.filter(s => s.section === selectedSection);
            }
            if (searchTerm) {
                filteredStudents = filteredStudents.filter(s => (s.fullname || s.name).toLowerCase().includes(searchTerm));
            }
            renderStudentCards(filteredStudents, (filteredStudents.length === 0 && (selectedSection !== 'all' || searchTerm)) ? 'filter' : 'initial');
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
                e.stopPropagation(); // Stop card click-through
                const studentId = clearStudentBtn.dataset.studentId;
                const studentName = clearStudentBtn.dataset.studentName;
                if (confirm(`Are you sure you want to delete all paid records for ${studentName}? This cannot be undone.`)) {
                    clearStudentBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span>`;
                    clearStudentBtn.disabled = true;
                    try {
                        const paidRecords = allPayments.filter(p => p.student_id === studentId && p.isPaid);
                        if (paidRecords.length > 0) {
                            const deletePromises = paidRecords.map(p => databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, p.$id));
                            await Promise.all(deletePromises);
                            alert(`${paidRecords.length} paid record(s) for ${studentName} have been deleted.`);

                            allPayments = allPayments.filter(p => !(p.student_id === studentId && p.isPaid));
                            if (currentStudent) {
                                await refreshStudentDetailsView(currentStudent.$id)
                            } else {
                                applyFilters();
                            }
                        } else {
                            alert(`No paid records found for ${studentName} to delete.`);
                            clearStudentBtn.innerHTML = `<img src="${trashIcon}" alt="Clear Records" style="width: 1em; height: 1em;">`;
                            clearStudentBtn.disabled = false;
                        }
                    } catch (error) {
                        console.error("Failed to clear student records:", error);
                        alert(`Error: ${error.message}`);
                        clearStudentBtn.innerHTML = `<img src="${trashIcon}" alt="Clear Records" style="width: 1em; height: 1em;">`;
                        clearStudentBtn.disabled = false;
                    }
                }
                return;
            }

            const card = e.target.closest('.student-payment-card');
            if (card) {
                await refreshStudentDetailsView(card.dataset.studentId);
                return;
            }

            const backBtn = e.target.closest('#backToPaymentsBtn');
            if (backBtn) {
                renderInitialView();
                const newFilter = document.getElementById('sectionFilter');
                if (newFilter && profile && profile.yearLevel && newFilter.querySelector(`[value="${profile.yearLevel}"]`)) {
                    newFilter.value = profile.yearLevel;
                }
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
                if (editPaymentModalInstance) editPaymentModalInstance.show();
                return;
            }

            const paidBtn = e.target.closest('.paid-payment-btn');
            if (paidBtn) {
                const payment = JSON.parse(paidBtn.dataset.payment.replace(/\\'/g, "'"));
                if (confirm(`Mark "${payment.item_name || 'item'}" as paid?`)) {
                    paidBtn.disabled = true;
                    paidBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processing...`;
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
                    } catch (error) {
                        console.error("Payment failed:", error);
                        alert(`Error: ${error.message}`);
                        await refreshDataAndRender();
                    }
                }
                return;
            }

            const deleteBtn = e.target.closest('.delete-payment-btn');
            if (deleteBtn) {
                if(confirm(`Delete payment for "${deleteBtn.dataset.paymentName}"? This cannot be undone.`)) {
                    try {
                        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, deleteBtn.dataset.paymentId);
                        await refreshDataAndRender();
                    } catch (error) {
                        console.error("Delete failed:", error);
                        alert(`Error: ${error.message}`);
                    }
                }
            }
        });

        wrapper.addEventListener('input', e => {
            if (e.target.id === 'studentSearchInput' || e.target.id === 'sectionFilter') {
                applyFilters();
            } else if (e.target.id === 'studentName') {
                const results = document.getElementById('autocomplete-results');
                const searchTerm = e.target.value.toLowerCase();
                if (searchTerm.length < 2) {
                    results.innerHTML = '';
                    return;
                }
                results.innerHTML = nonOfficerStudents.filter(s => (s.fullname || s.name).toLowerCase().includes(searchTerm))
                    .slice(0, 5)
                    .map(s => `<a href="#" class="list-group-item list-group-item-action" data-id="${s.$id}" data-name="${s.fullname || s.name}">${s.fullname || s.name}</a>`)
                    .join('');
            }
        });

        wrapper.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formId = e.target.id;
            const submitBtn = e.target.querySelector('button[type="submit"]');
            if (!submitBtn) return;
            const originalBtnText = submitBtn.innerHTML;
            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm"></span> Processing...`;
            try {
                if (formId === 'addPaymentForm') {
                    const isForAll = document.getElementById('allStudentsCheckbox').checked;
                    const basePaymentData = {
                        item_name: document.getElementById('itemName').value,
                        price: parseFloat(document.getElementById('price').value),
                        quantity: parseInt(document.getElementById('quantity').value, 10),
                        is_event: document.getElementById('isEventCheckbox').checked,
                        event: document.getElementById('eventName').value,
                        activity: document.getElementById('activityName').value,
                        isPaid: false
                    };
                    if (isForAll) {
                        if (!confirm(`Create payment for all ${nonOfficerStudents.length} students?`)) throw new Error("Cancelled by user.");
                        const createPromises = nonOfficerStudents.map(s => databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), { ...basePaymentData, student_id: s.$id }));
                        await Promise.all(createPromises);
                        alert(`Payment created for ${nonOfficerStudents.length} students.`);
                    } else {
                        if (!selectedStudentId) throw new Error("Please select a student.");
                        await databases.createDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, ID.unique(), { ...basePaymentData, student_id: selectedStudentId });
                        alert('Payment created.');
                    }
                    if (addPaymentModalInstance) addPaymentModalInstance.hide();
                    e.target.reset();
                    document.getElementById('autocomplete-results').innerHTML = '';
                    selectedStudentId = null;
                } else if (formId === 'editPaymentForm') {
                    const paymentId = document.getElementById('editPaymentId').value;
                    const updatedData = {
                        item_name: document.getElementById('editItemName').value,
                        price: parseFloat(document.getElementById('editPrice').value),
                        quantity: parseInt(document.getElementById('editQuantity').value, 10),
                        is_event: document.getElementById('editIsEventCheckbox').checked,
                        event: document.getElementById('editEventName').value,
                        activity: document.getElementById('editActivityName').value
                    };
                    await databases.updateDocument(DATABASE_ID, COLLECTION_ID_PAYMENTS, paymentId, updatedData);
                    if (editPaymentModalInstance) editPaymentModalInstance.hide();
                }
                await refreshDataAndRender();
            } catch (error) {
                if (error.message !== "Cancelled by user.") alert(`Error: ${error.message}`);
            } finally {
                submitBtn.disabled = false;
                submitBtn.innerHTML = originalBtnText;
            }
        });

        wrapper.addEventListener('change', e => {
            const target = e.target;
            if (target.id === 'sectionFilter') {
                applyFilters();
                return;
            }

            const form = target.closest('form');
            if (!form) return;

            if (target.id === 'isEventCheckbox' || target.id === 'editIsEventCheckbox') {
                const isEdit = target.id.startsWith('edit');
                const activityGroup = form.querySelector(isEdit ? '#edit-activity-group' : '#activity-group');
                const eventGroup = form.querySelector(isEdit ? '#edit-event-group' : '#event-group');
                if (activityGroup && eventGroup) {
                    activityGroup.classList.toggle('d-none', target.checked);
                    eventGroup.classList.toggle('d-none', !target.checked);
                }
            } else if (target.id === 'allStudentsCheckbox') {
                const studentNameInput = form.querySelector('#studentName');
                if (studentNameInput) {
                    studentNameInput.disabled = target.checked;
                    studentNameInput.required = !target.checked;
                    if (target.checked) {
                        studentNameInput.value = '';
                        document.getElementById('autocomplete-results').innerHTML = '';
                        selectedStudentId = null;
                    }
                }
            }
        });

    } catch (error) {
        console.error("Failed to load initial data:", error);
        wrapper.innerHTML = `<div class="alert alert-danger">Could not load the payments module. Please try refreshing the page.</div>`;
    }
}

// --- Main export ---
export default function renderPaymentView(currentUser, profile) {
    return {
        html: `<div class="admin-payments-container-wrapper d-flex flex-column" style="min-height: calc(100vh - 120px);"></div>`,
        afterRender: () => attachEventListeners(currentUser, profile)
    };
}