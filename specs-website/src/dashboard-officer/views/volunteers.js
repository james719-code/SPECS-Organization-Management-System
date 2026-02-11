import { databases, functions } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_STUDENTS,
    FUNCTION_ID
} from '../../shared/constants.js';
import { Query } from 'appwrite';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import personHearts from 'bootstrap-icons/icons/person-hearts.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import envelopeIcon from 'bootstrap-icons/icons/envelope.svg';
import mortarboardIcon from 'bootstrap-icons/icons/mortarboard.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

function createVolunteerRequestCardHTML(student) {
    const initials = student.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const requestDate = student.requestDate || student.$updatedAt;
    const formattedDate = new Date(requestDate).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });

    const isBackoutRequest = student.volunteer_request_status === 'backout_pending';
    const badgeClass = isBackoutRequest ? 'bg-info-subtle text-info border-info-subtle' : 'bg-warning-subtle text-warning border-warning-subtle';
    const badgeText = isBackoutRequest ? 'Backout Request' : 'Pending';

    const actionButtons = isBackoutRequest ? `
        <button class="btn btn-sm btn-danger flex-fill approve-backout-btn" data-student-id="${student.$id}">
            <img src="${checkCircleFill}" width="14" class="me-1" style="filter: brightness(0) invert(1);">
            Approve Leave
        </button>
        <button class="btn btn-sm btn-outline-secondary flex-fill reject-backout-btn" data-student-id="${student.$id}">
            <img src="${xCircleFill}" width="14" class="me-1">
            Deny Leave
        </button>
    ` : `
        <button class="btn btn-sm btn-success flex-fill approve-volunteer-btn" data-student-id="${student.$id}">
            <img src="${checkCircleFill}" width="14" class="me-1" style="filter: brightness(0) invert(1);">
            Approve
        </button>
        <button class="btn btn-sm btn-outline-danger flex-fill reject-volunteer-btn" data-student-id="${student.$id}">
            <img src="${xCircleFill}" width="14" class="me-1">
            Reject
        </button>
    `;

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm volunteer-card">
                <div class="card-body p-4 position-relative">
                    <div class="position-absolute top-0 end-0 m-3">
                        <span class="badge ${badgeClass} border px-2 py-1">
                            ${badgeText}
                        </span>
                    </div>
                    
                    <div class="d-flex align-items-center mb-4">
                        <div class="file-icon-wrapper bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 56px; height: 56px; font-weight: 700; font-size: 1.2rem;">
                            ${initials}
                        </div>
                        <div style="max-width: calc(100% - 80px);">
                            <h6 class="fw-bold text-dark mb-1 text-truncate" title="${student.name}">${student.name}</h6>
                            <span class="badge bg-light text-secondary border px-2 py-1" style="font-size: 0.75rem;">${student.section || 'No Section'}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex flex-column gap-2 border-top border-light pt-3">
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${student.email}">
                            <img src="${envelopeIcon}" width="14" style="opacity: 0.6;">
                            <span class="small text-truncate">${student.email || 'No email'}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${mortarboardIcon}" width="14" style="opacity: 0.6;">
                            <span class="small">Year ${student.yearLevel || 'N/A'}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${calendarIcon}" width="14" style="opacity: 0.6;">
                            <span class="small">Requested: ${formattedDate}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex gap-2 mt-4">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        </div>`;
}

function getVolunteersHTML() {
    return `
        <div class="volunteers-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <div class="officer-page-header mb-0">
                        <h1 class="page-title mb-1">Volunteer Requests</h1>
                        <p class="page-subtitle mb-0">Review and manage student volunteer applications.</p>
                    </div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <select id="volunteerFilterSelect" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px; cursor: pointer;">
                            <option value="pending" selected>Pending Requests</option>
                            <option value="backout_pending">Backout Requests</option>
                            <option value="approved">Approved</option>
                            <option value="rejected">Rejected</option>
                            <option value="all">All Students</option>
                        </select>
                        <div class="officer-search-bar d-flex align-items-center" style="max-width: 300px;">
                            <span class="input-group-text bg-transparent border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="volunteerSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search students...">
                        </div>
                    </div>
                </div>
            </header>
            
            <!-- Stats Row -->
            <div class="row g-4 mb-5">
                <div class="col-6 col-lg">
                    <div class="card officer-stat-card border-0 shadow-sm h-100">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-warning mb-1" id="stat-pending">-</div>
                            <div class="text-muted small">Pending Requests</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg">
                    <div class="card officer-stat-card border-0 shadow-sm h-100">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-info mb-1" id="stat-backout">-</div>
                            <div class="text-muted small">Backout Requests</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg">
                    <div class="card officer-stat-card border-0 shadow-sm h-100">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-success mb-1" id="stat-approved">-</div>
                            <div class="text-muted small">Active Volunteers</div>
                        </div>
                    </div>
                </div>
                <div class="col-6 col-lg">
                    <div class="card officer-stat-card border-0 shadow-sm h-100">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-danger mb-1" id="stat-rejected">-</div>
                            <div class="text-muted small">Rejected</div>
                        </div>
                    </div>
                </div>
                <div class="col-12 col-lg">
                    <div class="card officer-stat-card border-0 shadow-sm h-100">
                        <div class="card-body text-center py-4">
                            <div class="display-6 fw-bold text-primary mb-1" id="stat-total">-</div>
                            <div class="text-muted small">Total Students</div>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="volunteer-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5" style="min-height: 300px;">
                <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
            </div>
        </div>
    `;
}

async function attachEventListeners(currentUser, profile) {
    const cardsContainer = document.getElementById('volunteer-cards-container');
    const filterSelect = document.getElementById('volunteerFilterSelect');
    const searchInput = document.getElementById('volunteerSearchInput');

    let allStudents = [];

    const updateStats = () => {
        const pending = allStudents.filter(s => s.volunteer_request_status === 'pending').length;
        const backoutPending = allStudents.filter(s => s.volunteer_request_status === 'backout_pending').length;
        const approved = allStudents.filter(s => s.is_volunteer === true).length;
        const rejected = allStudents.filter(s => s.volunteer_request_status === 'rejected').length;

        document.getElementById('stat-pending').textContent = pending;
        document.getElementById('stat-backout').textContent = backoutPending;
        document.getElementById('stat-approved').textContent = approved;
        document.getElementById('stat-rejected').textContent = rejected;
        document.getElementById('stat-total').textContent = allStudents.length;
    };

    const updateGridState = (data) => {
        if (data.length === 0) {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${personHearts}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No volunteer requests</h4>
                <p class="text-muted">There are no pending volunteer requests at this time.</p>
            `;
        } else {
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5";
            cardsContainer.innerHTML = data.map(createVolunteerRequestCardHTML).join('');
        }
    };

    const applyFilters = () => {
        const filterVal = filterSelect.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = [...allStudents];

        // Status Filter
        if (filterVal === 'pending') {
            filtered = filtered.filter(s => s.volunteer_request_status === 'pending');
        } else if (filterVal === 'backout_pending') {
            filtered = filtered.filter(s => s.volunteer_request_status === 'backout_pending');
        } else if (filterVal === 'approved') {
            filtered = filtered.filter(s => s.is_volunteer === true);
        } else if (filterVal === 'rejected') {
            filtered = filtered.filter(s => s.volunteer_request_status === 'rejected');
        }

        // Search Filter
        if (searchTerm) {
            filtered = filtered.filter(s => {
                const name = s.name || '';
                const email = s.email || '';
                return name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm);
            });
        }

        updateGridState(filtered);
    };

    const loadData = async () => {
        try {
            if (DEV_BYPASS) {
                const { mockStudents } = await import('../../shared/mock/mockData.js');
                allStudents = [...mockStudents];
            } else {
                const res = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTION_ID_STUDENTS,
                    [Query.limit(500), Query.orderDesc('$updatedAt')]
                );
                allStudents = res.documents;
            }
            updateStats();
            applyFilters();
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load volunteer requests.</div></div>`;
        }
    };

    await loadData();

    // Listeners
    filterSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    // Approve Button Action
    cardsContainer.addEventListener('click', async (e) => {
        const approveBtn = e.target.closest('.approve-volunteer-btn');
        if (approveBtn) {
            const studentId = approveBtn.dataset.studentId;
            approveBtn.disabled = true;
            approveBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.approveVolunteerRequest(studentId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'approve_volunteer',
                            payload: { student_id: studentId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Update local state
                const student = allStudents.find(s => s.$id === studentId);
                if (student) {
                    student.is_volunteer = true;
                    student.volunteer_request_status = 'approved';
                }
                updateStats();
                applyFilters();
                showToast('Volunteer request approved!', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                approveBtn.disabled = false;
                approveBtn.innerHTML = `<img src="${checkCircleFill}" width="14" class="me-1" style="filter: brightness(0) invert(1);"> Approve`;
            }
        }

        const rejectBtn = e.target.closest('.reject-volunteer-btn');
        if (rejectBtn) {
            const studentId = rejectBtn.dataset.studentId;

            const confirmed = await confirmAction('Reject Volunteer', 'Are you sure you want to reject this volunteer request?', 'Reject', 'warning');
            if (!confirmed) {
                return;
            }

            rejectBtn.disabled = true;
            rejectBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.rejectVolunteerRequest(studentId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'reject_volunteer',
                            payload: { student_id: studentId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Update local state
                const student = allStudents.find(s => s.$id === studentId);
                if (student) {
                    student.volunteer_request_status = 'rejected';
                }
                updateStats();
                applyFilters();
                showToast('Volunteer request rejected.', 'warning');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                rejectBtn.disabled = false;
                rejectBtn.innerHTML = `<img src="${xCircleFill}" width="14" class="me-1"> Reject`;
            }
        }

        // Approve Backout Button Action
        const approveBackoutBtn = e.target.closest('.approve-backout-btn');
        if (approveBackoutBtn) {
            const studentId = approveBackoutBtn.dataset.studentId;

            const confirmed = await confirmAction('Approve Leave', 'Are you sure you want to approve this volunteer leaving the program?', 'Approve Leave', 'danger');
            if (!confirmed) {
                return;
            }

            approveBackoutBtn.disabled = true;
            approveBackoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.approveVolunteerBackout(studentId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'approve_volunteer_backout',
                            payload: { student_id: studentId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Update local state
                const student = allStudents.find(s => s.$id === studentId);
                if (student) {
                    student.is_volunteer = false;
                    student.volunteer_request_status = 'none';
                }
                updateStats();
                applyFilters();
                showToast('Volunteer has been removed from the program.', 'success');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                approveBackoutBtn.disabled = false;
                approveBackoutBtn.innerHTML = `<img src="${checkCircleFill}" width="14" class="me-1" style="filter: brightness(0) invert(1);"> Approve Leave`;
            }
        }

        // Reject Backout Button Action
        const rejectBackoutBtn = e.target.closest('.reject-backout-btn');
        if (rejectBackoutBtn) {
            const studentId = rejectBackoutBtn.dataset.studentId;

            const confirmed = await confirmAction('Deny Leave', 'Are you sure you want to deny this volunteer\'s leave request?', 'Deny Leave', 'warning');
            if (!confirmed) {
                return;
            }

            rejectBackoutBtn.disabled = true;
            rejectBackoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.rejectVolunteerBackout(studentId, currentUser.$id);
                } else {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({
                            action: 'reject_volunteer_backout',
                            payload: { student_id: studentId },
                            requestingUserId: currentUser.$id
                        }),
                        false
                    );
                }

                // Update local state
                const student = allStudents.find(s => s.$id === studentId);
                if (student) {
                    student.volunteer_request_status = 'approved';
                }
                updateStats();
                applyFilters();
                showToast('Backout request denied - volunteer remains active.', 'info');
            } catch (err) {
                console.error(err);
                showToast('Error: ' + err.message, 'error');
                rejectBackoutBtn.disabled = false;
                rejectBackoutBtn.innerHTML = `<img src="${xCircleFill}" width="14" class="me-1"> Deny Leave`;
            }
        }
    });
}

export default function renderVolunteersView(user, profile) {
    return {
        html: getVolunteersHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}
