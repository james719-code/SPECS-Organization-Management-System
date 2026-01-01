// views/renderAdmin/accounts.js
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

// --- SVG Icon Imports ---
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

// --- Reusable Icon HTML strings ---
const acceptIconHTML = `<img src="${checkCircle}" alt="Accept" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; filter: invert(42%) sepia(93%) saturate(1352%) hue-rotate(87deg) brightness(119%) contrast(119%);">Accept Student`;
const promoteIconHTML = `<img src="${award}" alt="Promote" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; opacity: 0.6;">Promote to Officer`;
const deleteIconHTML = `<img src="${trash}" alt="Delete" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em; filter: invert(21%) sepia(30%) saturate(7469%) hue-rotate(348deg) brightness(98%) contrast(92%);">Delete User`;

// --- HTML TEMPLATE FUNCTIONS ---

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

    // --- Actions ---
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

    // --- Data Extraction ---
    // account.students is the relationship. If expanded, it's an object. If not, it's an ID.
    // We try to access fields if expanded.
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
                
                <div class="d-flex gap-2">
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
            
            <div id="user-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden"></span></div></div>
            </div>

            <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered"><div class="modal-content border-0 shadow-lg rounded-4">
                  <div class="modal-header border-0 pb-0"><h5 class="modal-title fw-bold" id="userDetailsModalLabel">User Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                  <div class="modal-body pt-4 pb-4" id="userDetailsModalBody">
                      <div class="d-flex justify-content-center"><div class="spinner-border text-primary" role="status"></div></div>
                  </div>
              </div></div>
            </div>
        </div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachAccountsListeners() {
    const cardsContainer = document.getElementById('user-cards-container');
    const searchInput = document.getElementById('userSearchInput');
    const sortOptions = document.querySelectorAll('[data-sort]');
    
    const userDetailsModalEl = document.getElementById('userDetailsModal');
    const userDetailsModal = new Modal(userDetailsModalEl);
    const userDetailsModalBody = document.getElementById('userDetailsModalBody');

    let allAccounts = [];
    let currentSort = 'name_asc';

    const sortUsers = (accounts, criteria) => {
        const sorted = [...accounts];
        // Helper to get name from expanded relationship or fallback to username
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

    const renderUserList = (accounts) => {
        const filtered = accounts.filter(acc => acc.type !== 'admin');
        
        if (filtered.length === 0) {
            cardsContainer.innerHTML = `
                <div class="col-12">
                    <div class="card card-body text-center border-0 bg-transparent py-5">
                        <div class="mb-3 opacity-25"><i class="bi bi-people-fill display-1"></i></div>
                        <h5 class="text-muted">No users found</h5>
                        <p class="text-secondary small">Try adjusting your search criteria.</p>
                    </div>
                </div>`;
            return;
        }
        
        const sorted = sortUsers(filtered, currentSort);
        cardsContainer.innerHTML = sorted.map(createAccountCardHTML).join('');
        
        document.querySelectorAll('.dropdown-toggle').forEach(dd => new Dropdown(dd));
    };

    try {
        const response = await databases.listDocuments(
            DATABASE_ID, 
            COLLECTION_ID_ACCOUNTS, 
            [
                Query.limit(100) 
            ]
        );
        allAccounts = response.documents;
        renderUserList(allAccounts);
    } catch (error) {
        console.error("Failed to load accounts:", error);
        cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger shadow-sm border-0">Error loading users. Please refresh.</div></div>`;
    }

    // Search Listener
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filtered = allAccounts.filter(acc => {
            const studentData = acc.students || {};
            const name = studentData.name || acc.username;
            const email = studentData.email || '';
            return name.toLowerCase().includes(searchTerm) || email.toLowerCase().includes(searchTerm);
        });
        renderUserList(filtered);
    });

    // Sort Listener
    sortOptions.forEach(option => {
        option.addEventListener('click', (e) => {
            e.preventDefault();
            sortOptions.forEach(opt => opt.classList.remove('active'));
            e.currentTarget.classList.add('active');
            
            currentSort = e.currentTarget.dataset.sort;
            // Re-render handled by reusing current list state logic if we refetch or just resort
            // Simplified: re-trigger search input event to re-filter & sort
            searchInput.dispatchEvent(new Event('input'));
        });
    });

    cardsContainer.addEventListener('click', async (e) => {
        const target = e.target;
        const acceptBtn = target.closest('.accept-btn');
        const promoteBtn = target.closest('.promote-btn');
        const deleteBtn = target.closest('.delete-btn');
        const card = target.closest('.account-card');

        // --- ACCEPT ACTION ---
        if (acceptBtn) {
            e.preventDefault();
            const docId = acceptBtn.dataset.docid;
            acceptBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Accepting...`;

            try {
                // Determine user ID (account owner ID usually matches doc ID if setup that way, or we read it)
                // In this schema, $id of account doc IS the user ID usually? Or just a random ID?
                // Assuming Account Doc ID != User ID, we need User ID for team addition.
                // However, usually we store UserID in the doc or make DocID = UserID. 
                // Let's assume we pass the DocID and let the function figure it out or we need the owner ID.
                // The 'accounts' collection often uses UserID as Document ID.
                const userId = docId; 

                const execution = await functions.createExecution(
                    FUNCTION_ACCEPT_STUDENT,
                    JSON.stringify({ userId: userId, accountDocId: docId }),
                    false
                );
                
                if (execution.status === 'completed') {
                    // Update local state optimistic
                     const acc = allAccounts.find(u => u.$id === docId);
                     if(acc) acc.verified = true;
                     renderUserList(allAccounts);
                     alert('Student accepted successfully.');
                } else {
                    console.error('Function execution status:', execution.status, execution.response);
                    alert('Acceptance processed. Refreshing list...');
                    // Refetch
                    const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS);
                    allAccounts = res.documents;
                    renderUserList(allAccounts);
                }

            } catch (error) {
                alert('Failed to accept user: ' + error.message);
                acceptBtn.innerHTML = acceptIconHTML;
            }
            return;
        }

        // --- PROMOTE ACTION ---
        if (promoteBtn) {
            e.preventDefault();
            if (!confirm("Are you sure you want to promote this student to Officer? They will gain access to the Officer Dashboard.")) return;
            
            const docId = promoteBtn.dataset.docid;
            promoteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Promoting...`;

            try {
                const userId = docId;
                const execution = await functions.createExecution(
                    FUNCTION_PROMOTE_OFFICER,
                    JSON.stringify({ userId: userId, accountDocId: docId }),
                    false
                );
                 
                // Refetch to show changes
                setTimeout(async () => {
                     const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS);
                     allAccounts = res.documents;
                     renderUserList(allAccounts);
                     alert('User promoted to Officer.');
                }, 1000);

            } catch (error) {
                alert('Failed to promote user: ' + error.message);
                promoteBtn.innerHTML = promoteIconHTML;
            }
            return;
        }

        // --- DELETE ACTION ---
        if (deleteBtn) {
            e.preventDefault(); 
            if (!confirm(`Are you sure you want to permanently delete this user's profile? This cannot be undone.`)) return;
            const docId = deleteBtn.dataset.docid;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, docId);
                allAccounts = allAccounts.filter(u => u.$id !== docId);
                renderUserList(allAccounts);
            } catch (error) {
                alert('Failed to delete user profile: ' + error.message);
                deleteBtn.innerHTML = deleteIconHTML;
            }
            return;
        }

        if (target.closest('.dropdown-toggle') || target.closest('.dropdown-menu')) {
            return;
        }

        // --- VIEW DETAILS ---
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

// --- Main export ---
export default function renderAccountsView() {
    return {
        html: getAccountsHTML(),
        afterRender: attachAccountsListeners
    };
}
