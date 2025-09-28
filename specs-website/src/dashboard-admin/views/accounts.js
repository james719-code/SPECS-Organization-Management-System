// views/renderAdmin/accounts.js
import { databases, storage, functions } from '../../shared/appwrite.js';
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

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const BUCKET_ID_RESUMES = import.meta.env.VITE_BUCKET_ID_RESUMES;
const BUCKET_ID_SCHEDULES = import.meta.env.VITE_BUCKET_ID_SCHEDULES;
const FUNCTION_ID = import.meta.env.VITE_FUNCTION_ID;

// --- Reusable Icon HTML strings ---
const acceptIconHTML = `<img src="${checkCircle}" alt="Accept" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em;">Accept User`;
const deleteIconHTML = `<img src="${trash}" alt="Delete" class="me-2" style="width: 1em; height: 1em; vertical-align: -0.125em;">Delete User`;

// --- HTML TEMPLATE FUNCTIONS ---

function createAccountCardHTML(profile) {
    const isVerified = profile.verified === true;
    const statusBadge = isVerified
        ? `<span class="badge bg-success-subtle text-success-emphasis rounded-pill">Verified</span>`
        : `<span class="badge bg-warning-subtle text-warning-emphasis rounded-pill">Pending</span>`;

    // Actions are now inside a Bootstrap dropdown (kebab menu)
    const acceptActionItem = !isVerified
        ? `<li><a class="dropdown-item accept-btn" href="#" data-docid="${profile.$id}">${acceptIconHTML}</a></li>`
        : '';
    const deleteActionItem = `<li><a class="dropdown-item text-danger delete-btn" href="#" data-docid="${profile.$id}">${deleteIconHTML}</a></li>`;

    return `
        <div class="col">
            <div class="card h-100 shadow-sm account-card" data-docid="${profile.$id}">
                <div class="card-body d-flex flex-column">
                    <!-- Card Header: Name, Email, and Actions Menu -->
                    <div class="d-flex justify-content-between align-items-start mb-3">
                        <div style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                            <h5 class="card-title mb-0">${profile.fullname}</h5>
                            <small class="text-muted">${profile.email || 'No email'}</small>
                        </div>
                        <div class="dropdown">
                            <button class="btn btn-link text-secondary p-0" type="button" data-bs-toggle="dropdown" aria-expanded="false" title="More options">
                                <img src="${threeDotsVertical}" alt="Options" style="width: 1.25rem; height: 1.25rem;">
                            </button>
                            <ul class="dropdown-menu dropdown-menu-end">
                                ${acceptActionItem}
                                ${deleteActionItem}
                            </ul>
                        </div>
                    </div>

                    <!-- Card Content: Metadata -->
                    <div class="py-2" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                        <p class="card-text small text-body-secondary mb-1">
                            <img src="${person}" alt="Username" title="Username" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;"> ${profile.username}
                        </p>
                        <p class="card-text small text-body-secondary">
                            <img src="${mortarboard}" alt="Year/Section" title="Year/Section" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;"> ${profile.yearLevel}
                        </p>
                    </div>

                    <!-- Card Footer: Status Badge -->
                    <div class="mt-auto pt-3" style="cursor: pointer;" data-bs-toggle="modal" data-bs-target="#userDetailsModal">
                        ${statusBadge}
                    </div>
                </div>
            </div>
        </div>
    `;
}

function getAccountsHTML() {
    return `
        <div class="admin-accounts-container">
            <div class="d-flex flex-column flex-md-row justify-content-md-between align-items-md-center mb-4">
                <h2 class="mb-3 mb-md-0">Account Management</h2>
                <input type="search" id="userSearchInput" class="form-control" style="max-width: 400px;" placeholder="Search by name or email...">
            </div>
            
            <div id="user-cards-container" class="row row-cols-1 row-cols-md-2 row-cols-xl-3 g-4">
                <div class="col-12 text-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden"></span></div></div>
            </div>

            <div class="modal fade" id="userDetailsModal" tabindex="-1" aria-labelledby="userDetailsModalLabel" aria-hidden="true">
              <div class="modal-dialog modal-dialog-centered"><div class="modal-content">
                  <div class="modal-header"><h5 class="modal-title" id="userDetailsModalLabel">User Details</h5><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div>
                  <div class="modal-body" id="userDetailsModalBody"><p>Loading details...</p></div>
              </div></div>
            </div>
        </div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachAccountsListeners() {
    const cardsContainer = document.getElementById('user-cards-container');
    const searchInput = document.getElementById('userSearchInput');
    const userDetailsModal = new Modal(document.getElementById('userDetailsModal'));
    const userDetailsModalBody = document.getElementById('userDetailsModalBody');

    let allUsers = [];

    const renderUserList = (users) => {
        const studentUsers = users.filter(user => user.type !== 'admin');
        if (studentUsers.length === 0) {
            cardsContainer.innerHTML = '<div class="col-12"><div class="card card-body text-center text-muted">No users found.</div></div>';
            return;
        }
        cardsContainer.innerHTML = studentUsers.map(createAccountCardHTML).join('');
        document.querySelectorAll('.dropdown-toggle').forEach(dd => new Dropdown(dd));
    };

    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]);
        allUsers = response.documents.sort((a, b) => a.fullname.localeCompare(b.fullname));
        renderUserList(allUsers);
    } catch (error) {
        console.error("Failed to load users:", error);
        cardsContainer.innerHTML = `<div class="col-12"><div class="alert alert-danger">Error loading users.</div></div>`;
    }

    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filteredUsers = allUsers.filter(user =>
            user.fullname.toLowerCase().includes(searchTerm) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
        renderUserList(filteredUsers);
    });

    cardsContainer.addEventListener('click', async (e) => {
        const target = e.target;

        const acceptBtn = target.closest('.accept-btn');
        const deleteBtn = target.closest('.delete-btn');

        if (acceptBtn) {
            e.preventDefault();
            const docId = acceptBtn.dataset.docid;
            acceptBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Accepting...`;

            try {
                // --- STEP 1: Update the document to set 'verified: true' ---
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, docId, { verified: true });

                const userToUpdate = allUsers.find(u => u.$id === docId);
                if (userToUpdate) {
                    userToUpdate.verified = true;
                }

                // --- STEP 2: Explicitly execute the back-end function ---
                console.log(`Executing function '${FUNCTION_ID}' for user ${docId}...`);
                try {
                    // We pass the entire user object as a JSON string in the body.
                    const execution = await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify(userToUpdate), // The body of the request
                        false // 'async' execution: false means we wait for the result
                    );

                    console.log("Function execution successful:", execution);
                } catch (functionError) {
                    // Important: The user is already verified. We just log the error
                    // for the admin to see, without stopping the UI update.
                    console.error("Failed to execute team assignment function:", functionError);
                    alert("User was verified, but the team assignment failed. Please check the function logs.");
                }

                // --- STEP 3: Update the UI ---
                renderUserList(allUsers); // Re-render the user list to show the "Verified" badge

            } catch (error) {
                alert('Failed to accept user: ' + error.message);
                acceptBtn.innerHTML = acceptIconHTML;
            }
            return;
        }

        if (deleteBtn) {
            e.preventDefault(); // Prevent link navigation
            if (!confirm(`Are you sure you want to permanently delete this user's profile? This cannot be undone.`)) return;
            const docId = deleteBtn.dataset.docid;
            deleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, docId);
                allUsers = allUsers.filter(u => u.$id !== docId);
                renderUserList(allUsers.filter(u => searchInput.value ? u.fullname.toLowerCase().includes(searchInput.value.toLowerCase()) : true));
            } catch (error) {
                alert('Failed to delete user profile: ' + error.message);
                deleteBtn.innerHTML = deleteIconHTML;
            }
            return;
        }

        if (target.closest('.dropdown-toggle') || target.closest('.dropdown-menu')) {
            return;
        }

        const card = target.closest('.account-card');
        if (card) {
            const docId = card.dataset.docid;
            const userProfile = allUsers.find(u => u.$id === docId);
            if (!userProfile) return;

            document.getElementById('userDetailsModalLabel').textContent = userProfile.fullname;
            if (userProfile.type === 'student' && userProfile.verified) {
                const resumeHTML = userProfile.haveResume ? `<a href="${storage.getFileView(BUCKET_ID_RESUMES, userProfile.resumeId)}" target="_blank" class="btn btn-primary w-100"><img src="${fileEarmarkPerson}" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;">View Resume</a>` : `<p class="text-muted text-center">No resume uploaded.</p>`;
                const scheduleHTML = userProfile.haveSchedule ? `<a href="${storage.getFileView(BUCKET_ID_SCHEDULES, userProfile.scheduleId)}" target="_blank" class="btn btn-info w-100"><img src="${calendarWeek}" class="me-2" style="width: 1.1em; height: 1.1em; vertical-align: -0.125em;">View Class Schedule</a>` : `<p class="text-muted text-center">No schedule uploaded.</p>`;
                userDetailsModalBody.innerHTML = `<div class="d-grid gap-3">${resumeHTML}${scheduleHTML}</div>`;
            } else if (userProfile.type === 'student' && !userProfile.verified) {
                userDetailsModalBody.innerHTML = `<p class="text-center text-warning-emphasis">This student's account is still pending verification. Uploaded documents will be visible here once they are accepted.</p>`;
            } else {
                userDetailsModalBody.innerHTML = `<p class="text-center">Details for this user type are not applicable.</p>`;
            }
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