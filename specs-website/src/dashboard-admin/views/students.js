import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_STUDENTS } from '../../shared/constants.js';
import { Query } from 'appwrite';
import { Modal, Dropdown } from 'bootstrap';
import toast from '../../shared/toast.js';

import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import envelopeIcon from 'bootstrap-icons/icons/envelope.svg';
import mortarboardIcon from 'bootstrap-icons/icons/mortarboard.svg';
import geoAltIcon from 'bootstrap-icons/icons/geo-alt.svg';
import sortAlphaDown from 'bootstrap-icons/icons/sort-alpha-down.svg';
import sortNumericDown from 'bootstrap-icons/icons/sort-numeric-down.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';

/**
 * Generate skeleton loading cards for students
 */
function getSkeletonCards(count = 8) {
    const skeletonCard = `
        <div class="col">
            <div class="skeleton-card" style="background: #fff; border-radius: 12px; padding: 1.5rem; border: 1px solid #e5e7eb;">
                <div class="d-flex align-items-center mb-4">
                    <div class="skeleton-loader rounded-circle me-3" style="width: 56px; height: 56px;"></div>
                    <div class="flex-grow-1">
                        <div class="skeleton-loader mb-2" style="width: 70%; height: 16px;"></div>
                        <div class="skeleton-loader" style="width: 40%; height: 12px;"></div>
                    </div>
                </div>
                <div class="skeleton-loader mb-2" style="width: 80%; height: 14px;"></div>
                <div class="skeleton-loader mb-2" style="width: 50%; height: 14px;"></div>
                <div class="skeleton-loader" style="width: 65%; height: 14px;"></div>
            </div>
        </div>
    `;
    return Array(count).fill(skeletonCard).join('');
}

function createStudentCardHTML(student) {
    const name = student.name || 'Unknown';
    const email = student.email || 'No email';
    const section = student.section || 'No Section';
    const yearLevel = student.yearLevel || null;
    const address = student.address || 'No address';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    return `
        <div class="col">
            <div class="card dashboard-card h-100 transition-all border-0 shadow-sm student-card" role="button" data-student-id="${student.$id}">
                <div class="card-body p-4 position-relative">
                    <div class="d-flex align-items-center mb-4">
                        <div class="file-icon-wrapper bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center me-3 shadow-sm" style="width: 56px; height: 56px; font-weight: 700; font-size: 1.2rem;">
                            ${initials}
                        </div>
                        <div style="max-width: calc(100% - 80px);">
                            <h6 class="fw-bold text-dark mb-1 text-truncate" title="${name}">${name}</h6>
                            <span class="badge bg-light text-secondary border px-2 py-1" style="font-size: 0.75rem;">${section}</span>
                        </div>
                    </div>
                    
                    <div class="d-flex flex-column gap-2 border-top border-light pt-3">
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${email}">
                            <img src="${envelopeIcon}" width="14" style="opacity: 0.6;">
                            <span class="small text-truncate">${email}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                             <img src="${mortarboardIcon}" width="14" style="opacity: 0.6;">
                            <span class="small text-truncate">${yearLevel ? 'Year ' + yearLevel : 'Year not set'}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                             <img src="${geoAltIcon}" width="14" style="opacity: 0.6;">
                            <span class="small text-truncate" title="${address}">${address}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function getStudentHTML() {
    return `
        <div class="student-directory-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-4">
                    <h1 class="display-6 fw-bold text-dark mb-1">Student Directory</h1>
                    <p class="text-muted mb-0">Browse and manage general student records.</p>
                </div>
                <div class="col-12 col-lg-8">
                    <div class="d-flex flex-column flex-sm-row gap-3 justify-content-lg-end flex-wrap">
                        <button id="refreshStudentsBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh students">
                            <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                        </button>
                        <select id="yearFilterSelect" class="form-select border-0 shadow-sm bg-white py-2 ps-3" style="max-width: 160px; cursor: pointer;">
                            <option value="all">All Years</option>
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                        </select>
                        <div class="dropdown">
                            <button class="btn btn-white bg-white border shadow-sm dropdown-toggle d-flex align-items-center gap-2 py-2" type="button" data-bs-toggle="dropdown">
                                <img src="${sortAlphaDown}" style="width: 1em; opacity: 0.6;"> Sort
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                                <li><h6 class="dropdown-header">Sort by</h6></li>
                                <li><a class="dropdown-item active" href="#" data-sort="name_asc"><img src="${sortAlphaDown}" class="me-2" style="width:1em;">Name (A-Z)</a></li>
                                <li><a class="dropdown-item" href="#" data-sort="date_desc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Newest First</a></li>
                                <li><a class="dropdown-item" href="#" data-sort="date_asc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Oldest First</a></li>
                            </ul>
                        </div>
                        <div class="input-group shadow-sm rounded-3 overflow-hidden bg-white border-0" style="max-width: 300px;">
                            <span class="input-group-text bg-white border-0 ps-3">
                                <img src="${searchIcon}" width="16" style="opacity:0.4">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 py-2 ps-2 shadow-none" placeholder="Search name, email, section...">
                        </div>
                    </div>
                </div>
            </header>
            
            <div class="mb-3 text-muted small" id="studentResultsCount"></div>
            
            <div id="student-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5" style="min-height: 300px;">
                ${getSkeletonCards(8)}
            </div>
        </div>

        <!-- Student Details Modal -->
        <div class="modal fade" id="studentDetailsModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pb-0 pt-4 px-4">
                        <h5 class="modal-title fw-bold" id="studentDetailsModalLabel">Student Details</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body pt-4 pb-4 px-4" id="studentDetailsModalBody">
                        <div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"></div></div>
                    </div>
                </div>
            </div>
        </div>
        
        <style>
            .skeleton-loader {
                background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite ease-in-out;
                border-radius: 6px;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            #refreshStudentsBtn.refreshing img { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
            .student-card { transition: all 0.3s ease; }
            .student-card:hover { transform: translateY(-4px); box-shadow: 0 12px 30px rgba(0,0,0,0.1) !important; }
        </style>
    `;
}

async function attachEventListeners() {
    const cardsContainer = document.getElementById('student-cards-container');
    const yearFilterSelect = document.getElementById('yearFilterSelect');
    const searchInput = document.getElementById('studentSearchInput');
    const sortOptions = document.querySelectorAll('[data-sort]');
    const refreshBtn = document.getElementById('refreshStudentsBtn');
    const resultsCountEl = document.getElementById('studentResultsCount');

    const studentDetailsModalEl = document.getElementById('studentDetailsModal');
    const studentDetailsModal = new Modal(studentDetailsModalEl);
    const studentDetailsModalBody = document.getElementById('studentDetailsModalBody');

    let allStudents = [];
    let currentSort = 'name_asc';
    let searchTimeout;

    const sortStudents = (students, criteria) => {
        const sorted = [...students];
        if (criteria === 'name_asc') {
            sorted.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        } else if (criteria === 'date_desc') {
            sorted.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        } else if (criteria === 'date_asc') {
            sorted.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
        }
        return sorted;
    };

    const updateGridState = (data) => {
        // Update results count
        if (resultsCountEl) {
            resultsCountEl.textContent = data.length > 0 
                ? `Showing ${data.length} student${data.length !== 1 ? 's' : ''}` 
                : '';
        }

        if (data.length === 0) {
            cardsContainer.className = "d-flex flex-column align-items-center justify-content-center py-5 text-center";
            cardsContainer.innerHTML = `
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${funnelIcon}" style="width: 40px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No students found</h4>
                <p class="text-muted">Try adjusting your filters or search terms.</p>
            `;
        } else {
            const sorted = sortStudents(data, currentSort);
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5";
            cardsContainer.innerHTML = sorted.map(createStudentCardHTML).join('');
        }
    };

    const applyFilters = () => {
        const yearFilter = yearFilterSelect.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allStudents;

        // Year Filter
        if (yearFilter !== 'all') {
            filtered = filtered.filter(s => s.yearLevel === yearFilter);
        }

        // Search Filter
        if (searchTerm) {
            filtered = filtered.filter(s => {
                const name = s.name || '';
                const email = s.email || '';
                const section = s.section || '';
                return name.toLowerCase().includes(searchTerm) ||
                    email.toLowerCase().includes(searchTerm) ||
                    section.toLowerCase().includes(searchTerm);
            });
        }

        updateGridState(filtered);
    };

    const loadData = async (isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        if (!isRefresh) {
            cardsContainer.innerHTML = getSkeletonCards(8);
        }

        try {
            const res = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                [Query.limit(5000), Query.orderDesc('$createdAt')]
            );
            allStudents = res.documents;
            applyFilters();
            
            if (isRefresh) {
                toast.success('Students refreshed successfully');
            }
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger d-flex align-items-center justify-content-between">
                        <span>Failed to load students.</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Retry</button>
                    </div>
                </div>`;
            toast.error('Failed to load students');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    await loadData();

    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadData(true));
    }

    // Listeners (debounced search)
    yearFilterSelect.addEventListener('change', applyFilters);
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    // Sort Listener
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            sortOptions.forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSort = e.currentTarget.dataset.sort;
            applyFilters();
        });
    });

    // Card Click - View Details
    cardsContainer.addEventListener('click', async (e) => {
        const card = e.target.closest('.student-card');
        if (card) {
            const studentId = card.dataset.studentId;
            const student = allStudents.find(s => s.$id === studentId);
            if (!student) return;

            const name = student.name || 'Unknown';
            const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
            const joinedDate = new Date(student.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

            document.getElementById('studentDetailsModalLabel').textContent = name;

            const volunteerStatus = student.volunteer_status || 'none';
            const volunteerRequestStatus = student.volunteer_request_status || 'none';

            const volunteerBadge = volunteerStatus === 'active'
                ? '<span class="badge bg-success-subtle text-success rounded-pill">Active Volunteer</span>'
                : volunteerStatus === 'inactive'
                    ? '<span class="badge bg-secondary-subtle text-secondary rounded-pill">Inactive Volunteer</span>'
                    : '<span class="badge bg-light text-muted rounded-pill border">Not a Volunteer</span>';

            const requestBadge = volunteerRequestStatus === 'pending'
                ? '<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill">Request Pending</span>'
                : volunteerRequestStatus === 'approved'
                    ? '<span class="badge bg-success-subtle text-success rounded-pill">Approved</span>'
                    : volunteerRequestStatus === 'rejected'
                        ? '<span class="badge bg-danger-subtle text-danger rounded-pill">Rejected</span>'
                        : '';

            studentDetailsModalBody.innerHTML = `
                <div class="text-center mb-4">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow" style="width: 80px; height: 80px; font-size: 2rem; font-weight: bold;">
                        ${initials}
                    </div>
                    <h5 class="fw-bold">${name}</h5>
                    <p class="text-muted mb-2">${student.yearLevel ? 'Year ' + student.yearLevel : 'Year not set'}</p>
                    <div class="d-flex gap-2 justify-content-center flex-wrap">
                        ${volunteerBadge}
                        ${requestBadge}
                    </div>
                </div>
                <div class="list-group list-group-flush">
                    <div class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted">Student ID</span>
                        <span class="fw-medium font-monospace small">${student.student_id || student.$id.substring(0, 12)}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted">Email</span>
                        <span class="fw-medium">${student.email || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted">Section</span>
                        <span class="fw-medium">${student.section || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted">Address</span>
                        <span class="fw-medium text-end" style="max-width: 200px;">${student.address || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0">
                        <span class="text-muted">Added</span>
                        <span class="fw-medium">${joinedDate}</span>
                    </div>
                </div>
                <div class="mt-3 d-grid">
                    <button class="btn btn-outline-primary btn-sm rounded-pill view-payments-btn" data-student-name="${name}">
                        View Payments
                    </button>
                </div>
            `;

            studentDetailsModal.show();
        }
    });

    // View Payments button in modal - navigate to payments view
    studentDetailsModalBody.addEventListener('click', (e) => {
        const btn = e.target.closest('.view-payments-btn');
        if (!btn) return;
        studentDetailsModal.hide();
        const paymentsLink = document.querySelector('#adminSidebar [data-view="payments"]');
        if (paymentsLink) paymentsLink.click();
    });
}

export default function renderStudentsView() {
    return {
        html: getStudentHTML(),
        afterRender: attachEventListeners
    };
}
