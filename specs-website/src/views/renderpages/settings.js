import { databases, storage, account } from "../../appwrite.js";
import { ID } from "appwrite";

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const BUCKET_ID_SCHEDULES = import.meta.env.VITE_BUCKET_ID_SCHEDULES;

function getSettingsHTML(user, profile) {
    const isStudent = profile.type === 'student';

    const yearLevelOptions = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
        .map(section => {
            const value = `BSCS ${section}`;
            const selected = profile.yearLevel === value ? 'selected' : '';
            return `<option value="${value}" ${selected}>${value}</option>`;
        }).join('');

    // --- Create conditional sections for student-only features ---
    const scheduleSection = isStudent ? `
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title">Upload Class Schedule</h5>
                <p class="card-subtitle mb-3 text-body-secondary">Provide your latest class schedule from SIAS/COE. Only PDF format is accepted.</p>
                <div id="schedule-feedback">
                    ${profile.haveSchedule && profile.scheduleId ? `<div class="alert alert-success">Current file: <a href="${storage.getFileView(BUCKET_ID_SCHEDULES, profile.scheduleId)}" target="_blank" class="alert-link">View Schedule</a></div>` : ''}
                </div>
                <form id="uploadScheduleForm">
                    <div class="mb-3">
                        <label for="scheduleFile" class="form-label">${profile.haveSchedule ? 'Upload New Schedule (Replaces Current)' : 'Schedule File (PDF Only)'}</label>
                        <input type="file" class="form-control" id="scheduleFile" name="scheduleFile" accept=".pdf" required>
                    </div>
                    <button type="submit" class="btn btn-primary"><i class="bi-upload me-2"></i>${profile.haveSchedule ? 'Update Schedule' : 'Upload Schedule'}</button>
                </form>
            </div>
        </div>
    ` : '';

    return `
    <div class="settings-container">
        <h1 class="mb-4">Account Settings</h1>

        <!-- Edit Profile Section -->
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title mb-4">Edit Profile</h5>
                <form id="editProfileForm">
                    <div class="row g-3">
                        <div class="col-md-6"><label for="profileUsername" class="form-label">Username</label><input type="text" class="form-control" id="profileUsername" name="username" value="${profile.username || ''}" required></div>
                        <div class="col-md-6"><label for="profileFullName" class="form-label">Full Name</label><input type="text" class="form-control" id="profileFullName" name="fullname" value="${profile.fullname || ''}" required></div>
                        
                        ${isStudent ? `
                        <div class="col-md-6">
                            <label for="profileYearLevel" class="form-label">Year & Section</label>
                            <select id="profileYearLevel" name="yearLevel" class="form-select" required>
                                <option value="" disabled>-- Select your section --</option>
                                ${yearLevelOptions}
                            </select>
                        </div>
                        ` : ''}
                        
                        <div class="col-md-6"><label for="profileGender" class="form-label">Gender</label><select class="form-select" id="profileGender" name="gender" required><option value="">Select Gender</option><option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Male</option><option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Female</option><option value="other" ${profile.gender === 'other' ? 'selected' : ''}>Other</option></select></div>
                    </div>
                    <div class="mt-4"><button type="submit" class="btn btn-primary">Save Profile Changes</button></div>
                </form>
            </div>
        </div>
        
        ${scheduleSection}

        <!-- Change Password Section -->
        <div class="card mb-4">
            <div class="card-body">
                <h5 class="card-title mb-4">Change Password</h5>
                <form id="changePasswordForm">
                    <div class="row g-3">
                        <div class="col-md-12"><label for="currentPassword" class="form-label">Current Password</label><input type="password" class="form-control" id="currentPassword" name="currentPassword" required autocomplete="current-password" placeholder="Enter your current password"></div>
                        <div class="col-md-6"><label for="newPassword" class="form-label">New Password</label><input type="password" class="form-control" id="newPassword" name="newPassword" required autocomplete="new-password" placeholder="At least 8 characters"></div>
                        <div class="col-md-6"><label for="confirmNewPassword" class="form-label">Confirm New Password</label><input type="password" class="form-control" id="confirmNewPassword" name="confirmNewPassword" required autocomplete="new-password" placeholder="Confirm your new password"></div>
                    </div>
                    <div class="mt-4"><button type="submit" class="btn btn-primary">Update Password</button></div>
                </form>
            </div>
        </div>

        <!-- Danger Zone Section -->
        <div class="card border-danger mb-4">
            <div class="card-header bg-danger text-white">
                <h5 class="mb-0">Danger Zone</h5>
            </div>
            <div class="card-body">
                <p>This action is permanent and cannot be undone. Proceed with caution.</p>
                <button type="button" id="deleteAccountBtn" class="btn btn-danger"><i class="bi-exclamation-octagon me-2"></i>Delete My Account</button>
            </div>
        </div>
    </div>
    `;
}

/**
 * Attaches event listeners for the forms on the settings page.
 */
function attachEventListeners(user, profile) {
    const showFeedback = (button, message, isSuccess) => {
        const originalText = button.innerHTML;
        button.innerHTML = isSuccess ? `<i class="bi-check-circle me-2"></i> ${message}` : `<i class="bi-x-circle me-2"></i> ${message}`;
        button.disabled = true;

        setTimeout(() => {
            button.innerHTML = originalText;
            button.disabled = false;
        }, 3000);
    };

    // --- EDIT PROFILE ---
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = editProfileForm.querySelector('button[type="submit"]');
            const formData = new FormData(editProfileForm);
            const data = Object.fromEntries(formData.entries());
            const originalButtonText = submitBtn.innerHTML;

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Saving...`;

            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, data);
                showFeedback(submitBtn, 'Profile Saved!', true);
            } catch (error) {
                console.error('Failed to update profile:', error);
                showFeedback(submitBtn, 'Save Failed!', false);
            } finally {
                setTimeout(() => {
                    submitBtn.innerHTML = originalButtonText;
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    }

    // --- CHANGE PASSWORD ---
    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = changePasswordForm.querySelector('button[type="submit"]');
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;
            const originalButtonText = submitBtn.innerHTML;

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            if (newPassword.length < 8) {
                alert('New password must be at least 8 characters long.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Updating...`;

            try {
                await account.updatePassword(newPassword, currentPassword);
                showFeedback(submitBtn, 'Password Updated!', true);
                changePasswordForm.reset();
            } catch (error) {
                console.error('Failed to update password:', error);
                showFeedback(submitBtn, 'Update Failed!', false);
                alert('Failed to update password. Please check if your "Current Password" is correct.');
            } finally {
                setTimeout(() => {
                    submitBtn.innerHTML = originalButtonText;
                    submitBtn.disabled = false;
                }, 3000);
            }
        });
    }

    // --- SCHEDULE FILE UPLOAD ---
    const uploadScheduleForm = document.getElementById('uploadScheduleForm');
    if (uploadScheduleForm) {
        uploadScheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadScheduleForm.querySelector('button[type="submit"]');
            const file = document.getElementById('scheduleFile').files[0];
            const originalButtonText = submitBtn.innerHTML;

            if (!file) {
                alert('Please select a PDF file to upload.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Uploading...`;

            try {
                if (profile.haveSchedule && profile.scheduleId) {
                    await storage.deleteFile(BUCKET_ID_SCHEDULES, profile.scheduleId);
                }

                const uploadedFile = await storage.createFile(BUCKET_ID_SCHEDULES, ID.unique(), file);

                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, {
                    haveSchedule: true,
                    scheduleId: uploadedFile.$id,
                });

                profile.haveSchedule = true;
                profile.scheduleId = uploadedFile.$id;

                const feedbackContainer = document.getElementById('schedule-feedback');
                const fileViewUrl = storage.getFileView(BUCKET_ID_SCHEDULES, uploadedFile.$id);
                feedbackContainer.innerHTML = `<div class="alert alert-success">New schedule uploaded! <a href="${fileViewUrl}" target="_blank" class="alert-link">View Schedule</a></div>`;
                showFeedback(submitBtn, 'Uploaded!', true);

            } catch (error) {
                console.error('Schedule upload failed:', error);
                showFeedback(submitBtn, 'Upload Failed!', false);
                alert('Failed to upload schedule. Please try again.');
            } finally {
                setTimeout(() => {
                    submitBtn.innerHTML = originalButtonText;
                    submitBtn.disabled = false;
                    uploadScheduleForm.reset(); // Clear the file input
                }, 3000);
            }
        });
    }
}

/**
 * Renders the settings view.
 */
export default function renderSettingsView(user, profile) {
    return {
        html: getSettingsHTML(user, profile),
        afterRender: () => attachEventListeners(user, profile)
    };
}