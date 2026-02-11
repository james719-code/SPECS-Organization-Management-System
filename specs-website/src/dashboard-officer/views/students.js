import { databases, functions, account } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    FUNCTION_ID
} from '../../shared/constants.js';
import { Query } from 'appwrite';
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import xCircle from 'bootstrap-icons/icons/x-circle.svg';
import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import envelopeIcon from 'bootstrap-icons/icons/envelope.svg';
import mortarboardIcon from 'bootstrap-icons/icons/mortarboard.svg';
import calendarIcon from 'bootstrap-icons/icons/calendar3.svg';


function createStudentCardHTML(account) {
    const isVerified = account.verified === true;
    const studentData = account.students || {};
    // Fallback if 'students' is just an ID string (not expanded)
    const isExpanded = typeof studentData === 'object' && studentData !== null;

    const name = isExpanded ? (studentData.name || account.username) : account.username;
    const email = isExpanded ? (studentData.email || 'No email') : 'No email';
    const section = isExpanded ? (studentData.section || 'No Section') : 'No Section';
    const yearLevel = isExpanded ? studentData.yearLevel : null;
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    const requestedDate = new Date(account.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const statusBadge = isVerified
        ? '<span class="badge bg-success-subtle text-success border border-success-subtle px-2 py-1" style="font-size: 0.7rem;">Verified</span>'
        : '<span class="badge bg-warning-subtle text-warning border border-warning-subtle px-2 py-1" style="font-size: 0.7rem;">Pending</span>';

    const actionButtons = !isVerified
        ? `<div class="d-flex gap-2 mt-auto pt-3 border-top border-light">
                <button class="btn btn-success btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 accept-btn" data-docid="${account.$id}">
                    <img src="${checkCircle}" width="14" style="filter: brightness(0) invert(1);">
                    <span>Approve</span>
                </button>
                <button class="btn btn-outline-danger btn-sm flex-fill d-flex align-items-center justify-content-center gap-1 reject-btn" data-docid="${account.$id}">
                    <img src="${xCircle}" width="14">
                    <span>Reject</span>
                </button>
            </div>`
        : `<div class="mt-auto pt-3 border-top border-light">
                <div class="d-flex align-items-center justify-content-center gap-1 text-success small fw-semibold py-1">
                    <img src="${checkCircle}" width="14" style="filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);">
                    <span>Verified Student</span>
                </div>
            </div>`;

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm student-card" style="border-radius: 12px; overflow: hidden;">
                <div class="card-body p-0 d-flex flex-column">
                    <!-- Header -->
                    <div class="d-flex align-items-center gap-3 p-3 pb-0">
                        <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0 shadow-sm" style="width: 48px; height: 48px; font-weight: 700; font-size: 1.1rem; background: ${isVerified ? '#d1fae5' : '#fef3c7'}; color: ${isVerified ? '#059669' : '#d97706'};">
                            ${initials}
                        </div>
                        <div class="min-width-0 flex-grow-1">
                            <div class="d-flex align-items-center gap-2 mb-1">
                                <h6 class="fw-bold text-dark mb-0 text-truncate" style="font-size: 0.95rem;" title="${name}">${name}</h6>
                                ${statusBadge}
                            </div>
                            <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style="font-size: 0.7rem;">${section}</span>
                        </div>
                    </div>
                    
                    <!-- Details -->
                    <div class="d-flex flex-column gap-2 px-3 pt-3 pb-3">
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${email}">
                            <img src="${envelopeIcon}" width="13" style="opacity: 0.5; flex-shrink: 0;">
                            <span class="small text-truncate">${email}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${mortarboardIcon}" width="13" style="opacity: 0.5; flex-shrink: 0;">
                            <span class="small">${yearLevel ? 'Year ' + yearLevel : 'Year not set'}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${calendarIcon}" width="13" style="opacity: 0.5; flex-shrink: 0;">
                            <span class="small">Requested: ${requestedDate}</span>
                        </div>
                    </div>

                    <!-- Actions -->
                    <div class="px-3 pb-3">
                        ${actionButtons}
                    </div>
                </div>
            </div>
        </div>`;
}

function getStudentHTML() {
    return `
        <div class="student-directory-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <div class="officer-page-header mb-0">
                        <h1 class="page-title mb-1">Student Directory</h1>
                        <p class="page-subtitle mb-0">View student records and accept pending signups.</p>
                    </div>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end">
                        <select id="filterSelect" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 200px; cursor: pointer;">
                            <option value="all">All Students</option>
                            <option value="pending" selected>Pending Verification</option>
                            <option value="verified">Verified</option>
                        </select>
                        <div class="officer-search-bar d-flex align-items-center" style="max-width: 300px;">
                            <span class="input-group-text bg-transparent border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search...">
                        </div>
                    </div>
                </div>
            </header>
            
            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5" style="min-height: 300px;">
                 <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"></div></div>
            </div>
        </div>
    `;
}

async function attachEventListeners(currentUser, profile) {
    const cardsContainer = document.getElementById('student-cards-container');
    const filterSelect = document.getElementById('filterSelect');
    const searchInput = document.getElementById('studentSearchInput');

    let allAccounts = [];

    const updateGridState = (data) => {
        if (data.length === 0) {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${funnelIcon}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No students found</h4>
                <p class="text-muted">Try adjusting your filters.</p>
            `;
        } else {
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5";
            cardsContainer.innerHTML = data.map(createStudentCardHTML).join('');
        }
    };

    const applyFilters = () => {
        const filterVal = filterSelect.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allAccounts;

        // Type Filter (only students)
        filtered = filtered.filter(acc => acc.type === 'student');

        // Status Filter
        if (filterVal === 'pending') {
            filtered = filtered.filter(acc => !acc.verified);
        } else if (filterVal === 'verified') {
            filtered = filtered.filter(acc => acc.verified);
        }

        // Search Filter
        if (searchTerm) {
            filtered = filtered.filter(acc => {
                const s = (acc.students && typeof acc.students === 'object') ? acc.students : {};
                const name = s.name || acc.username;
                const email = s.email || '';
                return name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm);
            });
        }

        updateGridState(filtered);
    };

    const loadData = async () => {
        try {
            const res = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_ACCOUNTS,
                [Query.limit(5000), Query.orderDesc('$createdAt')]
            );
            allAccounts = res.documents;
            applyFilters();
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Failed to load students.</div></div>`;
        }
    };

    await loadData();

    // Listeners
    filterSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', applyFilters);

    // Accept Button Action
    cardsContainer.addEventListener('click', async (e) => {
        const acceptBtn = e.target.closest('.accept-btn');
        if (acceptBtn) {
            const docId = acceptBtn.dataset.docid;
            acceptBtn.disabled = true;
            acceptBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (!FUNCTION_ID) {
                    throw new Error('Account management function not configured. Please set VITE_FUNCTION_ID in environment.');
                }
                
                const execution = await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'accept_student', userId: docId, accountDocId: docId, requestingUserId: currentUser.$id }),
                    false
                );

                if (execution.status === 'completed' || execution.status === 'processing') {
                    // Optimistic update
                    const acc = allAccounts.find(a => a.$id === docId);
                    if (acc) acc.verified = true;
                    applyFilters();
                    showToast('Student approved!', 'success');
                } else {
                    showToast('Verification initiated. Refresh shortly.', 'info');
                    loadData();
                }
            } catch (err) {
                console.error(err);
                showToast('Error approving student: ' + err.message, 'error');
                acceptBtn.disabled = false;
                acceptBtn.innerHTML = `<img src="${checkCircle}" width="14" style="filter: brightness(0) invert(1);"> <span>Approve</span>`;
            }
        }

        // Reject Button Action
        const rejectBtn = e.target.closest('.reject-btn');
        if (rejectBtn) {
            const docId = rejectBtn.dataset.docid;

            const confirmed = await confirmAction(
                'Reject Student',
                'Are you sure you want to reject this student request? This will remove their pending account.',
                'Reject',
                'danger'
            );
            if (!confirmed) return;

            rejectBtn.disabled = true;
            rejectBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';

            try {
                if (!FUNCTION_ID) {
                    throw new Error('Account management function not configured.');
                }

                await functions.createExecution(
                    FUNCTION_ID,
                    JSON.stringify({ action: 'reject_student', userId: docId, accountDocId: docId, requestingUserId: currentUser.$id }),
                    false
                );

                allAccounts = allAccounts.filter(a => a.$id !== docId);
                applyFilters();
                showToast('Student request rejected.', 'warning');
            } catch (err) {
                console.error(err);
                showToast('Error rejecting student: ' + err.message, 'error');
                rejectBtn.disabled = false;
                rejectBtn.innerHTML = `<img src="${xCircle}" width="14"> <span>Reject</span>`;
            }
        }
    });
}

export default function renderStudentView(user, profile) {
    return {
        html: getStudentHTML(),
        afterRender: () => attachEventListeners(user, profile)
    };
}
