import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_STUDENTS } from '../../shared/constants.js';
import { Query } from 'appwrite';
import { Modal } from 'bootstrap';
import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import funnelIcon from 'bootstrap-icons/icons/funnel.svg';
import searchIcon from 'bootstrap-icons/icons/search.svg';
import envelopeIcon from 'bootstrap-icons/icons/envelope.svg';
import mortarboardIcon from 'bootstrap-icons/icons/mortarboard.svg';
import geoAltIcon from 'bootstrap-icons/icons/geo-alt.svg';
import sortAlphaDown from 'bootstrap-icons/icons/sort-alpha-down.svg';
import sortNumericDown from 'bootstrap-icons/icons/sort-numeric-down.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';
import trashIcon from 'bootstrap-icons/icons/trash3.svg';
import checkAllIcon from 'bootstrap-icons/icons/check2-all.svg';
import xCircleIcon from 'bootstrap-icons/icons/x-circle.svg';

/**
 * Generate skeleton loading cards for students
 */
function getSkeletonCards(count = 8) {
    const skeletonCard = `
        <div class="col">
            <div class="skeleton-card" style="background: #fff; border-radius: 16px; padding: 1.5rem; border: 1px solid #e5e7eb;">
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

function createStudentCardHTML(student, isSelected = false) {
    const name = student.name || 'Unknown';
    const email = student.email || 'No email';
    const section = student.section || 'No Section';
    const yearLevel = student.yearLevel || null;
    const address = student.address || 'No address';
    const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    // Assign avatar colors based on first letter
    const avatarColors = [
        { bg: '#e8f0fe', text: '#1a73e8' },
        { bg: '#fce8e6', text: '#d93025' },
        { bg: '#e6f4ea', text: '#188038' },
        { bg: '#fef7e0', text: '#e37400' },
        { bg: '#f3e8fd', text: '#8430ce' },
        { bg: '#e8eaed', text: '#5f6368' },
    ];
    const colorIdx = (name.charCodeAt(0) || 0) % avatarColors.length;
    const avatarColor = avatarColors[colorIdx];

    return `
        <div class="col student-col">
            <div class="card student-card h-100 border-0 ${isSelected ? 'student-card--selected' : ''}" data-student-id="${student.$id}" style="border-radius: 16px; overflow: hidden;">
                <!-- Selection checkbox -->
                <div class="student-card__checkbox position-absolute" style="top: 12px; left: 12px; z-index: 2;">
                    <input type="checkbox" class="form-check-input student-select-checkbox shadow-sm" data-student-id="${student.$id}" ${isSelected ? 'checked' : ''} style="width: 20px; height: 20px; cursor: pointer; border-radius: 6px;">
                </div>
                <!-- Delete button -->
                <button class="btn btn-link student-card__delete position-absolute p-0 d-flex align-items-center justify-content-center" data-student-id="${student.$id}" data-student-name="${name}" title="Delete student" style="top: 12px; right: 12px; z-index: 2; width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.9); backdrop-filter: blur(4px);">
                    <img src="${trashIcon}" width="14" style="opacity: 0.5;">
                </button>

                <div class="card-body p-0 d-flex flex-column student-card__body" role="button" data-student-id="${student.$id}">
                    <!-- Header with gradient accent -->
                    <div class="position-relative" style="padding: 20px 20px 0;">
                        <div class="d-flex align-items-center gap-3">
                            <div class="rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 52px; height: 52px; font-weight: 700; font-size: 1.1rem; background: ${avatarColor.bg}; color: ${avatarColor.text};">
                                ${initials}
                            </div>
                            <div class="min-width-0 flex-grow-1">
                                <h6 class="fw-bold text-dark mb-1 text-truncate" style="font-size: 0.95rem;" title="${name}">${name}</h6>
                                <div class="d-flex align-items-center gap-2 flex-wrap">
                                    <span class="badge bg-primary-subtle text-primary border border-primary-subtle px-2 py-1" style="font-size: 0.7rem; border-radius: 6px;">${section}</span>
                                    ${yearLevel ? `<span class="badge bg-light text-secondary border px-2 py-1" style="font-size: 0.7rem; border-radius: 6px;">Year ${yearLevel}</span>` : ''}
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <!-- Divider -->
                    <div class="mx-3 my-0"><hr class="my-3" style="opacity: 0.08;"></div>
                    
                    <!-- Details -->
                    <div class="d-flex flex-column gap-2 px-3 pb-3" style="padding-top: 0;">
                        <div class="d-flex align-items-center gap-2 text-secondary" title="${email}">
                            <img src="${envelopeIcon}" width="13" style="opacity: 0.4; flex-shrink: 0;">
                            <span class="small text-truncate" style="font-size: 0.82rem;">${email}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${mortarboardIcon}" width="13" style="opacity: 0.4; flex-shrink: 0;">
                            <span class="small text-truncate" style="font-size: 0.82rem;">${yearLevel ? 'Year ' + yearLevel : 'Year not set'}</span>
                        </div>
                        <div class="d-flex align-items-center gap-2 text-secondary">
                            <img src="${geoAltIcon}" width="13" style="opacity: 0.4; flex-shrink: 0;">
                            <span class="small text-truncate" style="font-size: 0.82rem;" title="${address}">${address}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

function getStudentHTML() {
    return `
        <div class="student-directory-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-4 gy-3">
                <div class="col-12 col-lg-4">
                    <h1 class="display-6 fw-bold text-dark mb-1">Student Directory</h1>
                    <p class="text-muted mb-0">Browse and manage student records</p>
                </div>
                <div class="col-12 col-lg-8">
                    <div class="d-flex flex-column flex-sm-row gap-2 justify-content-lg-end flex-wrap align-items-sm-center">
                        <button id="refreshStudentsBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-3 px-3 border" title="Refresh students" style="height: 38px;">
                            <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                        </button>
                        <select id="yearFilterSelect" class="form-select border shadow-sm bg-white ps-3" style="max-width: 150px; cursor: pointer; height: 38px; font-size: 0.875rem; border-radius: 10px;">
                            <option value="all">All Years</option>
                            <option value="1">Year 1</option>
                            <option value="2">Year 2</option>
                            <option value="3">Year 3</option>
                            <option value="4">Year 4</option>
                        </select>
                        <div class="dropdown">
                            <button class="btn bg-white border shadow-sm dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" style="height: 38px; font-size: 0.875rem; border-radius: 10px;">
                                <img src="${sortAlphaDown}" style="width: 1em; opacity: 0.6;"> Sort
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow-lg border-0 rounded-3" style="min-width: 180px;">
                                <li><h6 class="dropdown-header small text-uppercase text-muted" style="font-size: 0.7rem; letter-spacing: 0.5px;">Sort by</h6></li>
                                <li><a class="dropdown-item active rounded-2 mx-1 px-3 py-2" href="#" data-sort="name_asc"><img src="${sortAlphaDown}" class="me-2" style="width:1em;">Name (A-Z)</a></li>
                                <li><a class="dropdown-item rounded-2 mx-1 px-3 py-2" href="#" data-sort="date_desc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Newest First</a></li>
                                <li><a class="dropdown-item rounded-2 mx-1 px-3 py-2" href="#" data-sort="date_asc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Oldest First</a></li>
                            </ul>
                        </div>
                        <div class="input-group border rounded-3 overflow-hidden bg-white" style="max-width: 280px; height: 38px;">
                            <span class="input-group-text bg-white border-0 ps-3 pe-0">
                                <img src="${searchIcon}" width="15" style="opacity:0.35">
                            </span>
                            <input type="search" id="studentSearchInput" class="form-control border-0 shadow-none ps-2" placeholder="Search students..." style="font-size: 0.875rem;">
                        </div>
                    </div>
                </div>
            </header>

            <!-- Bulk action bar -->
            <div id="bulkActionBar" class="bulk-action-bar bg-white border rounded-3 shadow-sm px-3 py-2 mb-3 d-none align-items-center gap-3" style="border-left: 3px solid var(--bs-primary) !important;">
                <div class="d-flex align-items-center gap-2">
                    <input type="checkbox" class="form-check-input" id="selectAllStudents" style="width: 18px; height: 18px; cursor: pointer; border-radius: 5px;">
                    <label for="selectAllStudents" class="form-check-label small fw-semibold text-dark mb-0" style="cursor: pointer;">Select All</label>
                </div>
                <div class="vr mx-1" style="height: 24px;"></div>
                <span id="selectedCountLabel" class="small text-muted fw-medium">0 selected</span>
                <div class="ms-auto d-flex align-items-center gap-2">
                    <button id="cancelSelectionBtn" class="btn btn-sm btn-outline-secondary d-flex align-items-center gap-1 rounded-pill px-3" style="font-size: 0.8rem;">
                        <img src="${xCircleIcon}" width="14" style="opacity: 0.6;"> Cancel
                    </button>
                    <button id="bulkDeleteBtn" class="btn btn-sm btn-danger d-flex align-items-center gap-1 rounded-pill px-3" disabled style="font-size: 0.8rem;">
                        <img src="${trashIcon}" width="14" style="filter: brightness(10);"> Delete Selected
                    </button>
                </div>
            </div>
            
            <div class="d-flex align-items-center justify-content-between mb-3">
                <div class="text-muted small" id="studentResultsCount"></div>
            </div>
            
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
                    <div class="modal-body pt-3 pb-4 px-4" id="studentDetailsModalBody">
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
                border-radius: 8px;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            #refreshStudentsBtn.refreshing img { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

            /* Student card styles */
            .student-card {
                transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
                background: #fff;
                box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 1px 2px rgba(0,0,0,0.06);
            }
            .student-card:hover {
                transform: translateY(-3px);
                box-shadow: 0 10px 25px rgba(0,0,0,0.08), 0 4px 10px rgba(0,0,0,0.04) !important;
            }
            .student-card--selected {
                outline: 2px solid var(--bs-primary);
                outline-offset: -2px;
                background: #f0f5ff !important;
            }

            /* Checkbox & delete visibility */
            .student-card__checkbox,
            .student-card__delete {
                opacity: 0;
                transition: opacity 0.2s ease;
            }
            .student-card:hover .student-card__checkbox,
            .student-card:hover .student-card__delete,
            .student-card--selected .student-card__checkbox {
                opacity: 1;
            }
            .student-card__delete:hover {
                background: rgba(220, 53, 69, 0.1) !important;
            }
            .student-card__delete:hover img {
                opacity: 0.9 !important;
                filter: hue-rotate(330deg) saturate(5) brightness(0.6);
            }

            /* Bulk action bar */
            .bulk-action-bar {
                animation: slideDown 0.25s ease;
            }
            @keyframes slideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
            }

            /* Bulk select mode — always show checkboxes */
            .bulk-select-mode .student-card__checkbox {
                opacity: 1 !important;
            }

            /* Delete progress overlay */
            .delete-overlay {
                position: fixed; inset: 0; z-index: 9999;
                background: rgba(255,255,255,0.85);
                backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 1rem;
            }
            .delete-overlay__progress {
                width: 280px; height: 6px; background: #e5e7eb; border-radius: 100px; overflow: hidden;
            }
            .delete-overlay__bar {
                height: 100%; background: var(--bs-danger); border-radius: 100px;
                transition: width 0.3s ease;
            }
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
    const bulkActionBar = document.getElementById('bulkActionBar');
    const selectAllCheckbox = document.getElementById('selectAllStudents');
    const selectedCountLabel = document.getElementById('selectedCountLabel');
    const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
    const cancelSelectionBtn = document.getElementById('cancelSelectionBtn');

    const studentDetailsModalEl = document.getElementById('studentDetailsModal');
    const studentDetailsModal = new Modal(studentDetailsModalEl);
    const studentDetailsModalBody = document.getElementById('studentDetailsModalBody');

    let allStudents = [];
    let currentSort = 'name_asc';
    let searchTimeout;
    let selectedStudentIds = new Set();

    // ----- Selection helpers -----
    const updateSelectionUI = () => {
        const count = selectedStudentIds.size;
        const isActive = count > 0;

        bulkActionBar.classList.toggle('d-none', !isActive);
        bulkActionBar.classList.toggle('d-flex', isActive);
        cardsContainer.classList.toggle('bulk-select-mode', isActive);

        selectedCountLabel.textContent = `${count} selected`;
        bulkDeleteBtn.disabled = count === 0;

        // Sync individual checkboxes
        cardsContainer.querySelectorAll('.student-select-checkbox').forEach(cb => {
            const id = cb.dataset.studentId;
            cb.checked = selectedStudentIds.has(id);
            const card = cb.closest('.student-card');
            if (card) card.classList.toggle('student-card--selected', selectedStudentIds.has(id));
        });

        // Sync "select all" checkbox
        const visibleCheckboxes = cardsContainer.querySelectorAll('.student-select-checkbox');
        if (visibleCheckboxes.length > 0 && count === visibleCheckboxes.length) {
            selectAllCheckbox.checked = true;
            selectAllCheckbox.indeterminate = false;
        } else if (count > 0) {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = true;
        } else {
            selectAllCheckbox.checked = false;
            selectAllCheckbox.indeterminate = false;
        }
    };

    const clearSelection = () => {
        selectedStudentIds.clear();
        updateSelectionUI();
    };

    // ----- Delete helpers -----
    const deleteStudent = async (studentId) => {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
    };

    const handleSingleDelete = async (studentId, studentName) => {
        const confirmed = await confirmAction(
            'Delete Student',
            `Are you sure you want to delete "${studentName}"? This action cannot be undone.`,
            'Delete',
            'danger'
        );
        if (!confirmed) return;

        try {
            await deleteStudent(studentId);
            allStudents = allStudents.filter(s => s.$id !== studentId);
            selectedStudentIds.delete(studentId);
            applyFilters();
            updateSelectionUI();
            toast.success(`"${studentName}" has been deleted`);
        } catch (err) {
            console.error('Delete student error:', err);
            toast.error(`Failed to delete "${studentName}"`);
        }
    };

    const handleBulkDelete = async () => {
        const count = selectedStudentIds.size;
        if (count === 0) return;

        const confirmed = await confirmAction(
            'Delete Students',
            `Are you sure you want to delete ${count} student${count !== 1 ? 's' : ''}? This action cannot be undone.`,
            `Delete ${count} Student${count !== 1 ? 's' : ''}`,
            'danger'
        );
        if (!confirmed) return;

        // Show progress overlay
        const overlay = document.createElement('div');
        overlay.className = 'delete-overlay';
        overlay.innerHTML = `
            <div class="text-center">
                <div class="spinner-border text-danger mb-3" role="status"></div>
                <h6 class="fw-bold text-dark mb-1">Deleting students...</h6>
                <p class="text-muted small mb-3" id="deleteProgressText">0 / ${count}</p>
                <div class="delete-overlay__progress mx-auto">
                    <div class="delete-overlay__bar" id="deleteProgressBar" style="width: 0%;"></div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const progressText = overlay.querySelector('#deleteProgressText');
        const progressBar = overlay.querySelector('#deleteProgressBar');

        const idsToDelete = [...selectedStudentIds];
        let deleted = 0;
        let failed = 0;

        // Delete in batches of 5 for parallel execution
        const BATCH_SIZE = 5;
        for (let i = 0; i < idsToDelete.length; i += BATCH_SIZE) {
            const batch = idsToDelete.slice(i, i + BATCH_SIZE);
            const results = await Promise.allSettled(batch.map(id => deleteStudent(id)));

            results.forEach((result, idx) => {
                if (result.status === 'fulfilled') {
                    deleted++;
                    allStudents = allStudents.filter(s => s.$id !== batch[idx]);
                } else {
                    failed++;
                    console.error(`Failed to delete student ${batch[idx]}:`, result.reason);
                }
            });

            const progress = Math.round(((deleted + failed) / count) * 100);
            progressText.textContent = `${deleted + failed} / ${count}`;
            progressBar.style.width = `${progress}%`;
        }

        overlay.remove();
        selectedStudentIds.clear();
        applyFilters();
        updateSelectionUI();

        if (failed === 0) {
            toast.success(`Successfully deleted ${deleted} student${deleted !== 1 ? 's' : ''}`);
        } else {
            toast.warning(`Deleted ${deleted} student${deleted !== 1 ? 's' : ''}, ${failed} failed`);
        }
    };

    // ----- Sort / Filter -----
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
                <h5 class="fw-bold text-dark mb-1">No students found</h5>
                <p class="text-muted small">Try adjusting your filters or search terms.</p>
            `;
        } else {
            const sorted = sortStudents(data, currentSort);
            cardsContainer.className = "row row-cols-1 row-cols-md-2 row-cols-xl-3 row-cols-xxl-4 g-4 pb-5";
            cardsContainer.innerHTML = sorted.map(s => createStudentCardHTML(s, selectedStudentIds.has(s.$id))).join('');

            // Re-apply bulk-select-mode class if selection is active
            if (selectedStudentIds.size > 0) {
                cardsContainer.classList.add('bulk-select-mode');
            }
        }
    };

    const applyFilters = () => {
        const yearFilter = yearFilterSelect.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allStudents;

        if (yearFilter !== 'all') {
            filtered = filtered.filter(s => String(s.yearLevel) === yearFilter);
        }

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

    // ----- Data Loading -----
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
            clearSelection();
            applyFilters();

            if (isRefresh) {
                toast.success('Students refreshed successfully');
            }
        } catch (err) {
            console.error(err);
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger d-flex align-items-center justify-content-between rounded-3">
                        <span>Failed to load students.</span>
                        <button class="btn btn-sm btn-outline-danger rounded-pill" onclick="location.reload()">Retry</button>
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

    // ----- Event Listeners -----

    // Refresh
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadData(true));
    }

    // Year filter
    yearFilterSelect.addEventListener('change', applyFilters);

    // Debounced search
    searchInput.addEventListener('input', () => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(applyFilters, 300);
    });

    // Sort
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            sortOptions.forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSort = e.currentTarget.dataset.sort;
            applyFilters();
        });
    });

    // Bulk actions: select all
    selectAllCheckbox.addEventListener('change', () => {
        const allVisible = cardsContainer.querySelectorAll('.student-select-checkbox');
        if (selectAllCheckbox.checked) {
            allVisible.forEach(cb => selectedStudentIds.add(cb.dataset.studentId));
        } else {
            allVisible.forEach(cb => selectedStudentIds.delete(cb.dataset.studentId));
        }
        updateSelectionUI();
    });

    // Bulk actions: cancel selection
    cancelSelectionBtn.addEventListener('click', clearSelection);

    // Bulk actions: delete selected
    bulkDeleteBtn.addEventListener('click', handleBulkDelete);

    // Card container delegated events
    cardsContainer.addEventListener('click', async (e) => {
        // Handle checkbox click
        const checkbox = e.target.closest('.student-select-checkbox');
        if (checkbox) {
            e.stopPropagation();
            const id = checkbox.dataset.studentId;
            if (checkbox.checked) {
                selectedStudentIds.add(id);
            } else {
                selectedStudentIds.delete(id);
            }
            updateSelectionUI();
            return;
        }

        // Handle inline delete button
        const deleteBtn = e.target.closest('.student-card__delete');
        if (deleteBtn) {
            e.stopPropagation();
            const studentId = deleteBtn.dataset.studentId;
            const studentName = deleteBtn.dataset.studentName;
            await handleSingleDelete(studentId, studentName);
            return;
        }

        // Handle card click — view details
        const cardBody = e.target.closest('.student-card__body');
        if (cardBody) {
            const studentId = cardBody.dataset.studentId;
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
                    <h5 class="fw-bold mb-1">${name}</h5>
                    <p class="text-muted mb-2 small">${student.yearLevel ? 'Year ' + student.yearLevel : 'Year not set'}</p>
                    <div class="d-flex gap-2 justify-content-center flex-wrap">
                        ${volunteerBadge}
                        ${requestBadge}
                    </div>
                </div>
                <div class="list-group list-group-flush">
                    <div class="list-group-item d-flex justify-content-between px-0 py-2">
                        <span class="text-muted small">Student ID</span>
                        <span class="fw-medium font-monospace small">${student.student_id || student.$id.substring(0, 12)}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0 py-2">
                        <span class="text-muted small">Email</span>
                        <span class="fw-medium small">${student.email || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0 py-2">
                        <span class="text-muted small">Section</span>
                        <span class="fw-medium small">${student.section || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0 py-2">
                        <span class="text-muted small">Address</span>
                        <span class="fw-medium text-end small" style="max-width: 200px;">${student.address || 'N/A'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between px-0 py-2">
                        <span class="text-muted small">Added</span>
                        <span class="fw-medium small">${joinedDate}</span>
                    </div>
                </div>
                <div class="d-flex gap-2 mt-4">
                    <button class="btn btn-outline-primary btn-sm rounded-pill flex-grow-1 view-payments-btn" data-student-name="${name}">
                        View Payments
                    </button>
                    <button class="btn btn-outline-danger btn-sm rounded-pill flex-grow-1 modal-delete-btn" data-student-id="${student.$id}" data-student-name="${name}">
                        <img src="${trashIcon}" width="13" class="me-1" style="opacity: 0.7;"> Delete
                    </button>
                </div>
            `;

            studentDetailsModal.show();
        }
    });

    // Modal delegated events
    studentDetailsModalBody.addEventListener('click', async (e) => {
        // View Payments
        const paymentsBtn = e.target.closest('.view-payments-btn');
        if (paymentsBtn) {
            studentDetailsModal.hide();
            const paymentsLink = document.querySelector('#adminSidebar [data-view="payments"]');
            if (paymentsLink) paymentsLink.click();
            return;
        }

        // Delete from modal
        const deleteBtn = e.target.closest('.modal-delete-btn');
        if (deleteBtn) {
            const studentId = deleteBtn.dataset.studentId;
            const studentName = deleteBtn.dataset.studentName;
            studentDetailsModal.hide();
            await handleSingleDelete(studentId, studentName);
        }
    });
}

export default function renderStudentsView() {
    return {
        html: getStudentHTML(),
        afterRender: attachEventListeners
    };
}
