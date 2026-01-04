import { databases, account } from '../../shared/appwrite.js';
import { Modal } from 'bootstrap';
import {
    DATABASE_ID,
    COLLECTION_ID_STUDENTS
} from '../../shared/constants.js';

import personBadge from 'bootstrap-icons/icons/person-badge.svg';
import envelope from 'bootstrap-icons/icons/envelope.svg';
import geoAlt from 'bootstrap-icons/icons/geo-alt.svg';
import mortarboard from 'bootstrap-icons/icons/mortarboard.svg';
import cardList from 'bootstrap-icons/icons/card-list.svg';
import calendar from 'bootstrap-icons/icons/calendar.svg';
import pencilSquare from 'bootstrap-icons/icons/pencil-square.svg';
import trash from 'bootstrap-icons/icons/trash.svg';
import exclamationTriangle from 'bootstrap-icons/icons/exclamation-triangle.svg';
import personHearts from 'bootstrap-icons/icons/person-hearts.svg';
import checkCircle from 'bootstrap-icons/icons/check-circle.svg';
import clockHistory from 'bootstrap-icons/icons/clock-history.svg';
import xCircle from 'bootstrap-icons/icons/x-circle.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

function getProfileHTML() {
    return `
        <div class="container-fluid py-4 px-md-5">
            <header class="mb-5">
                <h1 class="display-6 fw-bold text-dark mb-1">My Profile</h1>
                <p class="text-muted mb-0">View and manage your student information.</p>
            </header>
            
            <div class="row g-4">
                <!-- Profile Card -->
                <div class="col-lg-4">
                    <div class="card border-0 shadow-sm rounded-4 overflow-hidden h-100">
                        <div class="profile-header-bg" style="height: 100px; background: linear-gradient(135deg, #0d6b66 0%, #0a5651 100%);"></div>
                        <div class="card-body text-center position-relative" style="margin-top: -50px;">
                            <div id="profile-avatar" class="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3 shadow-lg border border-4 border-white" style="width: 100px; height: 100px; font-size: 2.5rem; font-weight: bold;">
                                ?
                            </div>
                            <h4 id="profile-name" class="fw-bold mb-1">Loading...</h4>
                            <p id="profile-email-display" class="text-muted small mb-3">
                                <img src="${envelope}" width="14" style="opacity: 0.5;" class="me-1">
                                <span>...</span>
                            </p>
                            <span id="profile-status" class="badge bg-success-subtle text-success rounded-pill px-3 py-2 border border-success-subtle">
                                <span class="d-inline-block rounded-circle bg-success me-1" style="width: 8px; height: 8px;"></span>
                                Active Student
                            </span>
                            
                            <!-- Action Buttons -->
                            <div class="d-flex gap-2 justify-content-center mt-4">
                                <button id="edit-profile-btn" class="btn btn-primary btn-sm rounded-pill px-3 d-flex align-items-center gap-2">
                                    <img src="${pencilSquare}" width="14" style="filter: invert(1);">
                                    <span>Edit Profile</span>
                                </button>
                                <button id="delete-account-btn" class="btn btn-outline-danger btn-sm rounded-pill px-3 d-flex align-items-center gap-2">
                                    <img src="${trash}" width="14" class="status-rejected-filter">
                                    <span>Delete</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Details Card -->
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm rounded-4 h-100">
                        <div class="card-header bg-white border-bottom py-3 px-4 rounded-top-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <img src="${cardList}" width="20" class="icon-primary-filter">
                                Student Information
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="row g-4">
                                <div class="col-sm-6">
                                    <div class="info-item p-3 rounded-3 bg-light h-100">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <img src="${personBadge}" width="18" class="icon-primary-filter">
                                            <label class="small text-muted fw-bold text-uppercase">Student ID</label>
                                        </div>
                                        <p id="profile-student-id" class="fs-5 text-dark fw-medium mb-0">--</p>
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="info-item p-3 rounded-3 bg-light h-100">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <img src="${calendar}" width="18" class="icon-primary-filter">
                                            <label class="small text-muted fw-bold text-uppercase">Section</label>
                                        </div>
                                        <p id="profile-section" class="fs-5 text-dark fw-medium mb-0">--</p>
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="info-item p-3 rounded-3 bg-light h-100">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <img src="${mortarboard}" width="18" class="icon-primary-filter">
                                            <label class="small text-muted fw-bold text-uppercase">Year Level</label>
                                        </div>
                                        <p id="profile-year" class="fs-5 text-dark fw-medium mb-0">--</p>
                                    </div>
                                </div>
                                <div class="col-sm-6">
                                    <div class="info-item p-3 rounded-3 bg-light h-100">
                                        <div class="d-flex align-items-center gap-2 mb-2">
                                            <img src="${geoAlt}" width="18" class="icon-primary-filter">
                                            <label class="small text-muted fw-bold text-uppercase">Address</label>
                                        </div>
                                        <p id="profile-address" class="fs-5 text-dark fw-medium mb-0">--</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Volunteer Program Card -->
                <div class="col-12">
                    <div class="card border-0 shadow-sm rounded-4">
                        <div class="card-header bg-white border-bottom py-3 px-4 rounded-top-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <img src="${personHearts}" width="20" class="icon-primary-filter">
                                Volunteer Program
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="row align-items-start">
                                <div class="col-md-8">
                                    <h6 class="fw-bold mb-2">Join the SPECS Volunteer Team</h6>
                                    <p class="text-muted small mb-3">Contribute to the SPECS community by sharing your experiences, achievements, and insights with fellow students.</p>
                                    <div class="mb-3">
                                        <span class="badge bg-primary-subtle text-primary me-2 mb-1">Create Posts</span>
                                        <span class="badge bg-success-subtle text-success me-2 mb-1">Share Stories</span>
                                        <span class="badge bg-info-subtle text-info mb-1">Build Portfolio</span>
                                    </div>
                                    <div id="volunteer-status-container">
                                        <!-- Status will be dynamically inserted here -->
                                    </div>
                                </div>
                                <div class="col-md-4 text-md-end mt-3 mt-md-0">
                                    <div id="volunteer-action-container">
                                        <!-- Action button will be dynamically inserted here -->
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <!-- Edit Profile Modal -->
        <div class="modal fade" id="editProfileModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold">Edit Profile</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <form id="edit-profile-form">
                        <div class="modal-body p-4">
                            <div class="mb-3">
                                <label for="edit-name" class="form-label small fw-bold text-muted text-uppercase">Full Name</label>
                                <input type="text" class="form-control rounded-3 py-2" id="edit-name" required>
                            </div>
                            <div class="mb-3">
                                <label for="edit-section" class="form-label small fw-bold text-muted text-uppercase">Section</label>
                                <input type="text" class="form-control rounded-3 py-2" id="edit-section">
                            </div>
                            <div class="mb-3">
                                <label for="edit-year" class="form-label small fw-bold text-muted text-uppercase">Year Level</label>
                                <select class="form-select rounded-3 py-2" id="edit-year">
                                    <option value="">Select Year Level</option>
                                    <option value="1st Year">1st Year</option>
                                    <option value="2nd Year">2nd Year</option>
                                    <option value="3rd Year">3rd Year</option>
                                    <option value="4th Year">4th Year</option>
                                </select>
                            </div>
                            <div class="mb-3">
                                <label for="edit-address" class="form-label small fw-bold text-muted text-uppercase">Address</label>
                                <textarea class="form-control rounded-3 py-2" id="edit-address" rows="2"></textarea>
                            </div>
                        </div>
                        <div class="modal-footer border-0 pt-0">
                            <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                            <button type="submit" class="btn btn-primary rounded-pill px-4" id="save-profile-btn">
                                Save Changes
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
        
        <!-- Delete Account Modal -->
        <div class="modal fade" id="deleteAccountModal" tabindex="-1" aria-hidden="true">
            <div class="modal-dialog modal-dialog-centered">
                <div class="modal-content border-0 shadow-lg rounded-4">
                    <div class="modal-header border-0 pb-0">
                        <h5 class="modal-title fw-bold text-danger d-flex align-items-center gap-2">
                            <img src="${exclamationTriangle}" width="24" class="status-rejected-filter">
                            Delete Account
                        </h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button>
                    </div>
                    <div class="modal-body p-4">
                        <div class="alert alert-danger border-0 rounded-3 mb-3">
                            <strong>Warning:</strong> This action cannot be undone!
                        </div>
                        <p class="text-muted mb-3">
                            Deleting your account will permanently remove all your data including:
                        </p>
                        <ul class="text-muted small mb-4">
                            <li>Your profile information</li>
                            <li>Payment history</li>
                            <li>Attendance records</li>
                            <li>Access to the student portal</li>
                        </ul>
                        <div class="mb-3">
                            <label for="delete-confirm" class="form-label small fw-bold text-muted">
                                Type <strong class="text-danger">DELETE</strong> to confirm
                            </label>
                            <input type="text" class="form-control rounded-3 py-2" id="delete-confirm" placeholder="Type DELETE here">
                        </div>
                    </div>
                    <div class="modal-footer border-0 pt-0">
                        <button type="button" class="btn btn-light rounded-pill px-4" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-danger rounded-pill px-4" id="confirm-delete-btn" disabled>
                            Delete My Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function attachProfileListeners(studentDoc, currentUser) {
    console.log("[Profile] Loading student data", studentDoc?.$id);

    let studentData = null;

    try {
        // Use passed studentDoc for DEV_BYPASS mode, otherwise fetch from DB
        if (DEV_BYPASS && studentDoc) {
            studentData = studentDoc;
            console.log("[DEV] Using passed student document");
        } else {
            studentData = await databases.getDocument(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                currentUser.$id
            );
        }

        console.log("✅ [Profile] Student Document Found:", studentData);

        const name = studentData.name || currentUser.name || "User";

        document.getElementById('profile-name').textContent = name;
        document.getElementById('profile-avatar').textContent = name.charAt(0).toUpperCase();

        const emailDisplay = document.getElementById('profile-email-display');
        if (emailDisplay) {
            emailDisplay.querySelector('span').textContent = studentData.email || currentUser.email;
        }

        // Update status badge
        const statusEl = document.getElementById('profile-status');
        if (statusEl) {
            statusEl.innerHTML = `
                <span class="d-inline-block rounded-circle bg-success me-1" style="width: 8px; height: 8px;"></span>
                Active Student
            `;
        }

        // Fill in Student Details
        document.getElementById('profile-student-id').textContent = studentData.student_id || 'N/A';
        document.getElementById('profile-section').textContent = studentData.section || 'N/A';
        document.getElementById('profile-year').textContent = studentData.yearLevel || 'N/A';
        document.getElementById('profile-address').textContent = studentData.address || 'N/A';

        // Update Volunteer Status Section
        updateVolunteerStatus(studentData);

    } catch (error) {
        console.error("❌ [Profile] Error:", error);

        if (error.code === 404) {
            document.getElementById('profile-name').innerHTML = "<span class='text-danger'>Profile Not Found</span>";
            document.getElementById('profile-student-id').innerHTML =
                "<span class='text-danger small'>No student document matches your Login ID.</span>";

            const statusEl = document.getElementById('profile-status');
            if (statusEl) {
                statusEl.className = 'badge bg-danger-subtle text-danger rounded-pill px-3 py-2 border border-danger-subtle';
                statusEl.innerHTML = `
                    <span class="d-inline-block rounded-circle bg-danger me-1" style="width: 8px; height: 8px;"></span>
                    Profile Missing
                `;
            }
        } else {
            document.getElementById('profile-name').textContent = "Error loading data";
        }
    }

    const editBtn = document.getElementById('edit-profile-btn');
    const editModal = new Modal(document.getElementById('editProfileModal'));
    const editForm = document.getElementById('edit-profile-form');

    editBtn?.addEventListener('click', () => {
        if (studentData) {
            // Pre-fill form with current data
            document.getElementById('edit-name').value = studentData.name || '';
            document.getElementById('edit-section').value = studentData.section || '';
            document.getElementById('edit-year').value = studentData.yearLevel || '';
            document.getElementById('edit-address').value = studentData.address || '';
        }
        editModal.show();
    });

    editForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const saveBtn = document.getElementById('save-profile-btn');
        const originalText = saveBtn.innerHTML;

        try {
            saveBtn.disabled = true;
            saveBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

            const updatedData = {
                name: document.getElementById('edit-name').value.trim(),
                section: document.getElementById('edit-section').value.trim(),
                yearLevel: document.getElementById('edit-year').value,
                address: document.getElementById('edit-address').value.trim()
            };

            // Update database
            await databases.updateDocument(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                currentUser.$id,
                updatedData
            );

            // Update UI immediately
            document.getElementById('profile-name').textContent = updatedData.name;
            document.getElementById('profile-avatar').textContent = updatedData.name.charAt(0).toUpperCase();
            document.getElementById('profile-section').textContent = updatedData.section || 'N/A';
            document.getElementById('profile-year').textContent = updatedData.yearLevel || 'N/A';
            document.getElementById('profile-address').textContent = updatedData.address || 'N/A';

            // Update local studentData
            studentData = { ...studentData, ...updatedData };

            editModal.hide();

            // Show success toast/feedback
            showToast('Profile updated successfully!', 'success');

        } catch (error) {
            console.error('Error updating profile:', error);
            showToast('Failed to update profile. Please try again.', 'error');
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = originalText;
        }
    });

    const deleteBtn = document.getElementById('delete-account-btn');
    const deleteModal = new Modal(document.getElementById('deleteAccountModal'));
    const deleteConfirmInput = document.getElementById('delete-confirm');
    const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

    deleteBtn?.addEventListener('click', () => {
        deleteConfirmInput.value = '';
        confirmDeleteBtn.disabled = true;
        deleteModal.show();
    });

    deleteConfirmInput?.addEventListener('input', (e) => {
        confirmDeleteBtn.disabled = e.target.value !== 'DELETE';
    });

    confirmDeleteBtn?.addEventListener('click', async () => {
        const originalText = confirmDeleteBtn.innerHTML;

        try {
            confirmDeleteBtn.disabled = true;
            confirmDeleteBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;

            // Delete student document first
            if (studentData) {
                await databases.deleteDocument(
                    DATABASE_ID,
                    COLLECTION_ID_STUDENTS,
                    currentUser.$id
                );
            }

            // Delete the user's identity (this will log them out)
            await account.deleteIdentity(currentUser.$id);

            // Redirect to landing page
            window.location.href = '/landing/';

        } catch (error) {
            console.error('Error deleting account:', error);

            // If identity deletion fails, still try to sign out and redirect
            try {
                await account.deleteSession('current');
            } catch (e) {
                // Ignore session deletion errors
            }

            showToast('Account deletion encountered an issue. Please contact support.', 'error');
            confirmDeleteBtn.disabled = false;
            confirmDeleteBtn.innerHTML = originalText;
        }
    });
}

// Update volunteer status section based on student data
function updateVolunteerStatus(studentData) {
    const statusContainer = document.getElementById('volunteer-status-container');
    const actionContainer = document.getElementById('volunteer-action-container');

    if (!statusContainer || !actionContainer) return;

    const isVolunteer = studentData.is_volunteer === true;
    const requestStatus = studentData.volunteer_request_status || 'none';

    let statusHTML = '';
    let actionHTML = '';

    if (isVolunteer && requestStatus === 'backout_pending') {
        // Volunteer with backout request pending
        statusHTML = `
            <span class="badge bg-warning-subtle text-warning rounded-pill px-3 py-2 border border-warning-subtle">
                <img src="${clockHistory}" width="14" class="me-1" style="opacity: 0.8;">
                Backout Request Pending
            </span>
            <p class="text-muted small mt-2 mb-0">Your request to leave the volunteer program is being reviewed.</p>
        `;
        actionHTML = `
            <button class="btn btn-secondary btn-sm rounded-pill px-4" disabled>
                Awaiting Review
            </button>
        `;
    } else if (isVolunteer) {
        // Active volunteer
        statusHTML = `
            <span class="badge bg-success-subtle text-success rounded-pill px-3 py-2 border border-success-subtle">
                <img src="${checkCircle}" width="14" class="me-1" style="opacity: 0.8;">
                Active Volunteer
            </span>
        `;
        actionHTML = `
            <div class="d-flex gap-2 flex-wrap justify-content-md-end">
                <a href="#posts" class="btn btn-outline-primary btn-sm rounded-pill px-4">
                    View My Posts
                </a>
                <button id="request-backout-btn" class="btn btn-outline-danger btn-sm rounded-pill px-4">
                    Leave Program
                </button>
            </div>
        `;
    } else if (requestStatus === 'pending') {
        // Request pending
        statusHTML = `
            <span class="badge bg-warning-subtle text-warning rounded-pill px-3 py-2 border border-warning-subtle">
                <img src="${clockHistory}" width="14" class="me-1" style="opacity: 0.8;">
                Request Pending
            </span>
            <p class="text-muted small mt-2 mb-0">Your request is being reviewed by an officer.</p>
        `;
        actionHTML = `
            <button class="btn btn-secondary btn-sm rounded-pill px-4" disabled>
                Awaiting Review
            </button>
        `;
    } else if (requestStatus === 'rejected') {
        // Request was rejected
        statusHTML = `
            <span class="badge bg-danger-subtle text-danger rounded-pill px-3 py-2 border border-danger-subtle">
                <img src="${xCircle}" width="14" class="me-1" style="opacity: 0.8;">
                Request Denied
            </span>
            <p class="text-muted small mt-2 mb-0">Your previous request was not approved. You may request again.</p>
        `;
        actionHTML = `
            <button id="request-volunteer-btn" class="btn btn-primary btn-sm rounded-pill px-4">
                Request Again
            </button>
        `;
    } else {
        // Not a volunteer, no pending request
        statusHTML = `
            <span class="badge bg-light text-secondary rounded-pill px-3 py-2 border">
                Not a Volunteer
            </span>
        `;
        actionHTML = `
            <button id="request-volunteer-btn" class="btn btn-primary btn-sm rounded-pill px-4">
                Request to Join
            </button>
        `;
    }

    statusContainer.innerHTML = statusHTML;
    actionContainer.innerHTML = actionHTML;

    // Attach event listener to join request button
    const requestBtn = document.getElementById('request-volunteer-btn');
    if (requestBtn) {
        requestBtn.addEventListener('click', async () => {
            requestBtn.disabled = true;
            requestBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.requestVolunteerStatus(studentData.$id);
                } else {
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTION_ID_STUDENTS,
                        studentData.$id,
                        { volunteer_request_status: 'pending' }
                    );
                }

                // Update local state and UI
                studentData.volunteer_request_status = 'pending';
                updateVolunteerStatus(studentData);
                showToast('Volunteer request submitted! An officer will review your request.', 'success');
            } catch (error) {
                console.error('Error requesting volunteer status:', error);
                showToast('Failed to submit request. Please try again.', 'error');
                requestBtn.disabled = false;
                requestBtn.innerHTML = 'Request to Join';
            }
        });
    }

    // Attach event listener to backout request button
    const backoutBtn = document.getElementById('request-backout-btn');
    if (backoutBtn) {
        backoutBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to leave the volunteer program? Your pending posts may be removed.')) {
                return;
            }

            backoutBtn.disabled = true;
            backoutBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Submitting...';

            try {
                if (DEV_BYPASS) {
                    const { mockApi } = await import('../../shared/mock/mockApiService.js');
                    await mockApi.requestVolunteerBackout(studentData.$id);
                } else {
                    await databases.updateDocument(
                        DATABASE_ID,
                        COLLECTION_ID_STUDENTS,
                        studentData.$id,
                        { volunteer_request_status: 'backout_pending' }
                    );
                }

                // Update local state and UI
                studentData.volunteer_request_status = 'backout_pending';
                updateVolunteerStatus(studentData);
                showToast('Backout request submitted. An officer will review your request.', 'success');
            } catch (error) {
                console.error('Error requesting volunteer backout:', error);
                showToast('Failed to submit request. Please try again.', 'error');
                backoutBtn.disabled = false;
                backoutBtn.innerHTML = 'Leave Program';
            }
        });
    }
}

// Helper function to show toast notifications
function showToast(message, type = 'info') {
    // Create toast container if it doesn't exist - place inside #app
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        toastContainer.className = 'position-fixed bottom-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        const appDiv = document.getElementById('app');
        (appDiv || document.body).appendChild(toastContainer);
    }

    const bgClass = type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-primary';

    const toastHTML = `
        <div class="toast align-items-center text-white ${bgClass} border-0 show" role="alert">
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        </div>
    `;

    const toastWrapper = document.createElement('div');
    toastWrapper.innerHTML = toastHTML;
    const toastEl = toastWrapper.firstElementChild;
    toastContainer.appendChild(toastEl);

    // Auto remove after 4 seconds
    setTimeout(() => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.remove(), 300);
    }, 4000);

    // Handle manual close
    toastEl.querySelector('.btn-close')?.addEventListener('click', () => {
        toastEl.classList.remove('show');
        setTimeout(() => toastEl.remove(), 300);
    });
}

export default function renderProfileView(studentDoc, currentUser) {
    return {
        html: getProfileHTML(),
        afterRender: () => attachProfileListeners(studentDoc, currentUser)
    };
}