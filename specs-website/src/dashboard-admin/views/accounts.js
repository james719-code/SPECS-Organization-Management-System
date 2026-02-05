import { databases, storage, functions } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_STUDENTS,
    BUCKET_ID_RESUMES,
    BUCKET_ID_SCHEDULES,
    FUNCTION_PROMOTE_OFFICER,
    FUNCTION_ACCEPT_STUDENT
} from '../../shared/constants.js';
import { Query } from 'appwrite';
import { Modal, Dropdown } from 'bootstrap';
import toast from '../../shared/toast.js';

import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import threeDotsVertical from 'bootstrap-icons/icons/three-dots-vertical.svg';
import person from 'bootstrap-icons/icons/person.svg';
import mortarboard from 'bootstrap-icons/icons/mortarboard.svg';
import fileEarmarkPerson from 'bootstrap-icons/icons/file-earmark-person.svg';
import calendarWeek from 'bootstrap-icons/icons/calendar-week.svg';
import funnelFill from 'bootstrap-icons/icons/funnel-fill.svg';
import sortAlphaDown from 'bootstrap-icons/icons/sort-alpha-down.svg';
import sortNumericDown from 'bootstrap-icons/icons/sort-numeric-down.svg';
import award from 'bootstrap-icons/icons/award.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';

const ACCOUNTS_PER_PAGE = 12;

const acceptIconHTML = `<img src="${checkCircle}" alt="Accept" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);">Accept Student`;
const promoteIconHTML = `<img src="${award}" alt="Promote" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; opacity: 0.6;">Promote to Officer`;
const deleteIconHTML = `<img src="${trash}" alt="Delete" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; filter: invert(21%) sepia(30%) saturate(7469%) hue-rotate(348deg) brightness(98%) contrast(92%);">Delete User`;

function createAccountCardHTML(account) {
    const isVerified = account.verified === true;
    const isOfficer = account.type === 'officer';
    const isStudent = account.type === 'student';

    let statusBadge = '';
    if (isOfficer) {
        statusBadge = `<span class="badge bg-info-subtle text-info-emphasis rounded-pill px-3 py-2 border border-info-subtle"><i class="bi bi-person-badge me-1"></i> Officer</span>`;
    } else if (isVerified) {
        statusBadge = `<span class="badge bg-success-subtle text-success-emphasis rounded-pill px-3 py-2 border border-success-subtle"><i class="bi bi-check-circle-fill me-1"></i> Student (Verified)</span>`;
    } else {
        statusBadge = `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill px-3 py-2 border border-warning-subtle"><i class="bi bi-exclamation-circle-fill me-1"></i> Pending</span>`;
    }

    const joinedDate = new Date(account.$createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    let actions = '';

    // Accept (only for unverified students)
    if (!isVerified && isStudent) {
        actions += `<li><a class="dropdown-item accept-btn fw-medium text-success" href="#" data-docid="${account.$id}">${acceptIconHTML}</a></li>`;
    }

    // Promote (only for verified students who are not officers)
    if (isVerified && isStudent) {
        actions += `<li><a class="dropdown-item promote-btn fw-medium text-primary" href="#" data-docid="${account.$id}">${promoteIconHTML}</a></li>`;
    }

    // Delete (always available)
    actions += `<li><a class="dropdown-item delete-btn fw-medium text-danger" href="#" data-docid="${account.$id}">${deleteIconHTML}</a></li>`;

    const studentData = (account.students && typeof account.students === 'object') ? account.students : {};
    const displayName = studentData.name || account.username;
    const displayEmail = studentData.email || 'No email linked';
    const displayYear = studentData.yearLevel ? `Year ${studentData.yearLevel}` : 'Year not set';

    return `
        <div class="col">
            <div class="card h-100 shadow-sm account-card border-0" data-docid="${account.$id}">
                <div class="card-body d-flex flex-column p-4">
                    <!-- Card Header: Name, Email, and Actions Menu -->
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div class="d-flex align-items-center" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                            <div class="avatar-placeholder bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-3 fw-bold fs-5 shadow-sm" style="width: 48px; height: 48px;">
                                ${displayName.charAt(0).toUpperCase()}
                            </div>
                            <div>
                                <h6 class="card-title fw-bold mb-0 text-dark">${displayName}</h6>
                                <small class="text-muted d-block text-truncate" style="max-width: 150px;">${displayEmail}</small>
                            </div>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-link text-secondary p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More options">
                                <img src="${threeDotsVertical}" alt="Options" style="width: 1.25rem; height: 1.25rem;">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end shadow border-0 rounded-3">
                                ${actions}
                            </ul>
                        </div>
                    </div>

                    <!-- Card Content: Metadata -->
                    <div class="py-2 mb-2" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                         <div class="d-flex align-items-center mb-2 text-secondary small">
                            <img src="${person}" class="me-2 opacity-50" style="width: 1rem;"> 
                            <span class="text-dark fw-medium">@${account.username}</span>
                        </div>
                        <div class="d-flex align-items-center mb-2 text-secondary small">
                            <img src="${mortarboard}" class="me-2 opacity-50" style="width: 1rem;"> 
                            <span>${displayYear}</span>
                        </div>
                        <div class="d-flex align-items-center text-secondary small">
                            <i class="bi bi-clock me-2 opacity-50" style="font-size: 1rem;"></i>
                            <span>Joined: ${joinedDate}</span>
                        </div>
                    </div>

                    <!-- Card Footer: Status Badge -->
                    <div class="mt-auto pt-3 border-top border-light" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                        <div class="d-flex justify-content-between align-items-center">
                            ${statusBadge}
                            <small class="text-primary fw-bold" style="font-size: 0.8rem;">View Details &rarr;</small>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAccountsHTML() {
    return `
        <div class="admin-accounts-container">
            <div class="d-flex flex-column flex-lg-row justify-content-between align-items-lg-center mb-4 gap-3">
                <div>
                    <h2 class="fw-bold m-0">Account Management</h2>
                    <p class="text-muted m-0 small">Manage accounts, verifications, and officer promotions</p>
                </div>
                
                <div class="d-flex flex-wrap gap-2">
                    <button id="refreshAccountsBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh accounts">
                        <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                    </button>
                    <div class="input-group">
                        <span class="input-group-text bg-white border-end-0"><i class="bi bi-search text-muted"></i></span>
                        <input type="search" id="userSearchInput" class="form-control border-start-0 ps-0" style="max-width: 300px;" placeholder="Search name or email...">
                    </div>
                    
                    <div class="dropdown">
                        <button class="btn btn-white bg-white border dropdown-toggle d-flex align-items-center gap-2" type="button" data-bs-toggle="dropdown" aria-expanded="false">
                            <img src="${funnelFill}" style="width: 1em; opacity: 0.6;"> Sort
                        </button>
                        <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                            <li><h6 class="dropdown-header">Sort by</h6></li>
                            <li><a class="dropdown-item active" href="#" data-sort="name_asc"><img src="${sortAlphaDown}" class="me-2" style="width:1em;">Name (A-Z)</a></li>
                            <li><a class="dropdown-item" href="#" data-sort="date_desc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Newest First</a></li>
                            <li><a class="dropdown-item" href="#" data-sort="date_asc"><img src="${sortNumericDown}" class="me-2" style="width:1em;">Oldest First</a></li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <!-- Filter Tabs -->
            <div class="mb-4">
                <ul class="nav nav-pills gap-2" id="accountFilterTabs">
                    <li class="nav-item">
                        <button class="nav-link active px-3 py-2 rounded-pill" data-filter="all">
                            All <span class="badge bg-white text-dark ms-1" id="count-all">-</span>
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link px-3 py-2 rounded-pill" data-filter="pending">
                            Pending <span class="badge bg-white text-warning ms-1" id="count-pending">-</span>
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link px-3 py-2 rounded-pill" data-filter="verified">
                            Verified <span class="badge bg-white text-success ms-1" id="count-verified">-</span>
                        </button>
                    </li>
                    <li class="nav-item">
                        <button class="nav-link px-3 py-2 rounded-pill" data-filter="officer">
                            Officers <span class="badge bg-white text-info ms-1" id="count-officers">-</span>
                        </button>
                    </li>
                </ul>
            </div>
            
            <div id="user-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                ${getSkeletonCards(6)}
            </div>
            
            <!-- Pagination -->
            <nav id="accountsPagination" class="mt-4 d-flex justify-content-center" style="display: none !important;">
                <ul class="pagination pagination-sm mb-0">
                </ul>
            </nav>

            <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4">
                  <div class="modal-header border-0 pb-0"><h5 class="modal-title fw-bold" id="userDetailsModalLabel">User Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                  <div class="modal-body pt-4 pb-4" id="userDetailsModalBody">
                      <div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"></div></div>
                  </div>
              </div></div>
            </div>
        </div>
        
        <style>
            #accountFilterTabs .nav-link {
                background-color: #f8f9fa;
                color: #6c757d;
                border: 1px solid #e9ecef;
                transition: all 0.2s ease;
            }
            #accountFilterTabs .nav-link:hover {
                background-color: #e9ecef;
            }
            #accountFilterTabs .nav-link.active {
                background-color: #0d6b66;
                color: white;
                border-color: #0d6b66;
            }
            #accountFilterTabs .nav-link.active .badge {
                background-color: rgba(255,255,255,0.2) !important;
                color: white !important;
            }
            .skeleton-card {
                background: #fff;
                border-radius: 12px;
                padding: 1.5rem;
                border: 1px solid #e5e7eb;
            }
            .skeleton-loader {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            #refreshAccountsBtn.refreshing img {
                animation: spin 1s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            .account-card {
                transition: transform 0.2s, box-shadow 0.2s;
            }
            .account-card:hover {
                transform: translateY(-4px);
                box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important;
            }
        </style>
    `;
}

/**
 * Generate skeleton loading cards
 */
function getSkeletonCards(count = 6) {
    const skeletonCard = `
        <div class="col">
            <div class="skeleton-card">
                <div class="d-flex align-items-center mb-3">
                    <div class="skeleton-loader rounded-circle me-3" style="width: 48px; height: 48px;"></div>
                    <div class="flex-grow-1">
                        <div class="skeleton-loader mb-2" style="width: 70%; height: 16px;"></div>
                        <div class="skeleton-loader" style="width: 50%; height: 12px;"></div>
                    </div>
                </div>
                <div class="skeleton-loader mb-2" style="width: 60%; height: 14px;"></div>
                <div class="skeleton-loader mb-2" style="width: 45%; height: 14px;"></div>
                <div class="skeleton-loader" style="width: 55%; height: 14px;"></div>
                <hr class="my-3">
                <div class="d-flex justify-content-between">
                    <div class="skeleton-loader" style="width: 80px; height: 28px; border-radius: 20px;"></div>
                    <div class="skeleton-loader" style="width: 100px; height: 14px;"></div>
                </div>
            </div>
        </div>
    `;
    return Array(count).fill(skeletonCard).join('');
}

async function attachAccountsListeners() {
    const cardsContainer = document.getElementById('user-cards-container');
    const searchInput = document.getElementById('userSearchInput');
    const sortOptions = document.querySelectorAll('[data-sort]');
    const filterTabs = document.querySelectorAll('#accountFilterTabs [data-filter]');
    const paginationContainer = document.getElementById('accountsPagination');
    const refreshBtn = document.getElementById('refreshAccountsBtn');

    const userDetailsModalEl = document.getElementById('userDetailsModal');
    const userDetailsModal = new Modal(userDetailsModalEl);
    const userDetailsModalBody = document.getElementById('userDetailsModalBody');

    let allAccounts = [];
    let currentSort = 'name_asc';
    let currentFilter = 'all';
    let currentPage = 1;
    let searchTimeout;

    /**
     * Update filter counts in tabs
     */
    const updateFilterCounts = (accounts) => {
        const nonAdmins = accounts.filter(acc => acc.type !== 'admin');
        const pending = nonAdmins.filter(acc => !acc.verified && acc.type === 'student');
        const verified = nonAdmins.filter(acc => acc.verified && acc.type === 'student');
        const officers = nonAdmins.filter(acc => acc.type === 'officer');

        document.getElementById('count-all').textContent = nonAdmins.length;
        document.getElementById('count-pending').textContent = pending.length;
        document.getElementById('count-verified').textContent = verified.length;
        document.getElementById('count-officers').textContent = officers.length;
    };

    const sortUsers = (accounts, criteria) => {
        const sorted = [...accounts];
        const getName = (a) => (a.students && a.students.name) ? a.students.name : a.username;

        if (criteria === 'name_asc') {
            sorted.sort((a, b) => getName(a).localeCompare(getName(b)));
        } else if (criteria === 'date_desc') {
            sorted.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
        } else if (criteria === 'date_asc') {
            sorted.sort((a, b) => new Date(a.$createdAt) - new Date(b.$createdAt));
        }
        return sorted;
    };

    /**
     * Filter accounts based on current filter and search
     */
    const filterAccounts = (accounts, filter, searchTerm = '') => {
        let filtered = accounts.filter(acc => acc.type !== 'admin');

        // Apply filter
        switch (filter) {
            case 'pending':
                filtered = filtered.filter(acc => !acc.verified && acc.type === 'student');
                break;
            case 'verified':
                filtered = filtered.filter(acc => acc.verified && acc.type === 'student');
                break;
            case 'officer':
                filtered = filtered.filter(acc => acc.type === 'officer');
                break;
        }

        // Apply search
        if (searchTerm) {
            filtered = filtered.filter(acc => {
                const studentData = acc.students || {};
                const name = studentData.name || acc.username;
                const email = studentData.email || '';
                return name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm);
            });
        }

        return filtered;
    };

    /**
     * Render pagination controls
     */
    const renderPagination = (totalItems, currentPage) => {
        const totalPages = Math.ceil(totalItems / ACCOUNTS_PER_PAGE);
        
        if (totalPages <= 1) {
            paginationContainer.style.display = 'none';
            return;
        }

        paginationContainer.style.display = 'flex';
        const ul = paginationContainer.querySelector('ul');
        
        let html = `
            <li class="page-item ${currentPage === 1 ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage - 1}">Previous</a>
            </li>
        `;

        // Show max 5 page numbers
        const startPage = Math.max(1, currentPage - 2);
        const endPage = Math.min(totalPages, startPage + 4);

        for (let i = startPage; i <= endPage; i++) {
            html += `
                <li class="page-item ${i === currentPage ? 'active' : ''}">
                    <a class="page-link" href="#" data-page="${i}">${i}</a>
                </li>
            `;
        }

        html += `
            <li class="page-item ${currentPage === totalPages ? 'disabled' : ''}">
                <a class="page-link" href="#" data-page="${currentPage + 1}">Next</a>
            </li>
        `;

        ul.innerHTML = html;
    };

    const renderUserList = (accounts, page = 1) => {
        const filtered = filterAccounts(accounts, currentFilter, searchInput.value.toLowerCase().trim());
        const sorted = sortUsers(filtered, currentSort);
        
        // Pagination
        const startIndex = (page - 1) * ACCOUNTS_PER_PAGE;
        const paginatedAccounts = sorted.slice(startIndex, startIndex + ACCOUNTS_PER_PAGE);

        if (filtered.length === 0) {
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="card card-body text-center border-0 bg-transparent py-5">
                        <div class="mb-3 opacity-25"><i class="bi bi-people-fill display-1"></i></div>
                        <h5 class="text-muted">No users found</h5>
                        <p class="text-secondary small">Try adjusting your search criteria or filter.</p>
                    </div>
                </div>`;
            paginationContainer.style.display = 'none';
            return;
        }

        cardsContainer.innerHTML = paginatedAccounts.map(createAccountCardHTML).join('');

        // Render pagination
        renderPagination(filtered.length, page);

        document.querySelectorAll('.dropdown-toggle').forEach(dd => new Dropdown(dd));
    };

    /**
     * Load accounts with retry logic
     */
    const loadAccounts = async (isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        if (!isRefresh) {
            cardsContainer.innerHTML = getSkeletonCards(6);
        }

        try {
            const response = await databases.listDocuments(
                DATABASE_ID,
                COLLECTION_ID_ACCOUNTS,
                [Query.limit(500)]
            );
            allAccounts = response.documents;
            updateFilterCounts(allAccounts);
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
            
            if (isRefresh) {
                toast.success('Accounts refreshed successfully');
            }
        } catch (error) {
            console.error("Failed to load accounts:", error);
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="alert alert-danger shadow-sm border-0 d-flex align-items-center justify-content-between">
                        <span>Error loading users. Please try again.</span>
                        <button class="btn btn-sm btn-outline-danger" onclick="location.reload()">Retry</button>
                    </div>
                </div>`;
            toast.error('Failed to load accounts');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    // Initial load
    await loadAccounts();

    // Refresh button
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadAccounts(true));
    }

    // Search Listener (debounced)
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        }, 300);
    });

    // Filter Tabs
    filterTabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            filterTabs.forEach(t => t.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentFilter = e.currentTarget.dataset.filter;
            currentPage = 1;
            renderUserList(allAccounts, currentPage);
        });
    });

    // Sort Listener
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            sortOptions.forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            currentSort = e.currentTarget.dataset.sort;
            renderUserList(allAccounts, currentPage);
        });
    });

    // Pagination click handler
    paginationContainer.addEventListener('click', (e) => {
        e.preventDefault();
        const pageLink = e.target.closest('[data-page]');
        if (!pageLink) return;
        
        const newPage = parseInt(pageLink.dataset.page);
        if (newPage < 1) return;
        
        currentPage = newPage;
        renderUserList(allAccounts, currentPage);
        
        // Scroll to top of cards
        cardsContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    cardsContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const acceptBtn = target.closest('.accept-btn');
        const promoteBtn = target.closest('.promote-btn');
        const deleteBtn = target.closest('.delete-btn');
        const card = target.closest('.account-card');

        if (acceptBtn) {
            e.preventDefault();
            const docId = acceptBtn.dataset.docid;
            const originalHTML = acceptBtn.innerHTML;
            acceptBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Accepting...`;
            acceptBtn.classList.add('disabled');

            try {
                const userId = docId;

                const execution = await functions.createExecution(
                    FUNCTION_ACCEPT_STUDENT,
                    JSON.stringify({ userId: userId, accountDocId: docId }),
                    false
                );

                if (execution.status === 'completed') {
                    // Update local state optimistically
                    const acc = allAccounts.find(u => u.$id === docId);
                    if (acc) acc.verified = true;
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                    toast.success('Student accepted successfully!', { title: 'Verified' });
                } else {
                    console.error('Function execution status:', execution.status, execution.response);
                    toast.info('Acceptance processed. Refreshing list...');
                    // Refetch
                    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
                    allAccounts = res.documents;
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                }

            } catch (error) {
                console.error('Failed to accept user:', error);
                toast.error('Failed to accept user: ' + error.message);
                acceptBtn.innerHTML = originalHTML;
                acceptBtn.classList.remove('disabled');
            }
            return;
        }

        if (promoteBtn) {
            e.preventDefault();
            if (!confirm("Are you sure you want to promote this student to Officer? They will gain access to the Officer Dashboard.")) return;

            const docId = promoteBtn.dataset.docid;
            const originalHTML = promoteBtn.innerHTML;
            promoteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Promoting...`;
            promoteBtn.classList.add('disabled');

            try {
                const userId = docId;
                const execution = await functions.createExecution(
                    FUNCTION_PROMOTE_OFFICER,
                    JSON.stringify({ userId: userId, accountDocId: docId }),
                    false
                );

                // Refetch to show changes
                toast.info('Promoting user...', { duration: 1500 });
                setTimeout(async () => {
                    try {
                        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(500)]);
                        allAccounts = res.documents;
                        updateFilterCounts(allAccounts);
                        renderUserList(allAccounts, currentPage);
                        toast.success('User promoted to Officer successfully!', { title: 'Promoted' });
                    } catch (err) {
                        toast.error('Failed to refresh list');
                    }
                }, 1000);

            } catch (error) {
                console.error('Failed to promote user:', error);
                toast.error('Failed to promote user: ' + error.message);
                promoteBtn.innerHTML = originalHTML;
                promoteBtn.classList.remove('disabled');
            }
            return;
        }

        if (deleteBtn) {
            e.preventDefault();
            if (!confirm(`Are you sure you want to permanently delete this user's profile? This cannot be undone.`)) return;
            
            const docId = deleteBtn.dataset.docid;
            const card = deleteBtn.closest('.col');
            const originalHTML = deleteBtn.innerHTML;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;
            deleteBtn.classList.add('disabled');
            
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, docId);
                
                // Animate card removal
                if (card) {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.9)';
                    
                    setTimeout(() => {
                        allAccounts = allAccounts.filter(u => u.$id !== docId);
                        updateFilterCounts(allAccounts);
                        renderUserList(allAccounts, currentPage);
                    }, 300);
                } else {
                    allAccounts = allAccounts.filter(u => u.$id !== docId);
                    updateFilterCounts(allAccounts);
                    renderUserList(allAccounts, currentPage);
                }
                
                toast.success('User profile deleted successfully');
            } catch (error) {
                console.error('Failed to delete user:', error);
                toast.error('Failed to delete user profile: ' + error.message);
                deleteBtn.innerHTML = originalHTML;
                deleteBtn.classList.remove('disabled');
            }
            return;
        }

        if (target.closest('.dropdown-toggle') || target.closest('.dropdown-menu')) {
            return;
        }

        if (card) {
            const docId = card.dataset.docid;
            const account = allAccounts.find(u => u.$id === docId);
            if (!account) return;

            const student = account.students || {};
            const name = student.name || account.username;

            document.getElementById('userDetailsModalLabel').textContent = name;

            // Build modal content
            let detailsHTML = `
                <div class="text-center mb-4">
                    <div class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow" style="width: 80px; height: 80px; font-size: 2rem; font-weight: bold;">
                            ${name.charAt(0).toUpperCase()}
                    </div>
                    <h5 class="fw-bold">${name}</h5>
                    <p class="text-muted">${student.yearLevel ? 'Year ' + student.yearLevel : 'No Year Level'}</p>
                </div>
                <div class="list-group list-group-flush">
                    <div class="list-group-item d-flex justify-content-between">
                        <span class="text-muted">Username</span>
                        <span class="fw-medium">@${account.username}</span>
                    </div>
                     <div class="list-group-item d-flex justify-content-between">
                        <span class="text-muted">Email</span>
                        <span class="fw-medium">${student.email || 'N/A'}</span>
                    </div>
                     <div class="list-group-item d-flex justify-content-between">
                        <span class="text-muted">Status</span>
                        <span class="fw-medium">${account.verified ? 'Verified' : 'Pending'}</span>
                    </div>
                    <div class="list-group-item d-flex justify-content-between">
                        <span class="text-muted">Role</span>
                        <span class="fw-medium text-uppercase">${account.type}</span>
                    </div>
                </div>
            `;

            userDetailsModalBody.innerHTML = detailsHTML;
        }
    });
}

export default function renderAccountsView() {
    return {
        html: getAccountsHTML(),
        afterRender: attachAccountsListeners
    };
}
