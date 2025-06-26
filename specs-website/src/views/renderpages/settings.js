// renderpages/settings.js
import { databases, storage, account } from "../../appwrite.js";
import { ID } from "appwrite";

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const BUCKET_ID_RESUMES = import.meta.env.VITE_BUCKET_ID_RESUMES;
const BUCKET_ID_SCHEDULES = import.meta.env.VITE_BUCKET_ID_SCHEDULES;

function getSettingsHTML(user, profile) {
    const isStudent = profile.type === 'student';

    // --- Create conditional sections for student-only features ---
    const resumeSection = isStudent ? `
        <div class="settings-section">
            <h3>Upload Resume</h3>
            ${profile.haveResume && profile.resumeId ? `<p class="current-file-link">Current file: <a href="${storage.getFileView(BUCKET_ID_RESUMES, profile.resumeId)}" target="_blank">View Resume</a></p>` : ''}
            <p>Keep your professional profile up-to-date. Accepted formats: PDF, DOC, DOCX.</p>
            <form id="uploadResumeForm">
                <div class="form-group">
                    <label for="resumeFile">${profile.haveResume ? 'Upload New Resume (Replaces Current)' : 'Resume File'}</label>
                    <input type="file" id="resumeFile" name="resumeFile" accept=".pdf,.doc,.docx" required>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">${profile.haveResume ? 'Update Resume' : 'Upload Resume'}</button>
                </div>
            </form>
        </div>
    ` : '';

    const scheduleSection = isStudent ? `
        <div class="settings-section">
            <h3>Upload Class Schedule</h3>
            ${profile.haveSchedule && profile.scheduleId ? `<p class="current-file-link">Current file: <a href="${storage.getFileView(BUCKET_ID_SCHEDULES, profile.scheduleId)}" target="_blank">View Schedule</a></p>` : ''}
            <p>Provide your latest class schedule. Accepted formats: PDF, PNG, JPG.</p>
            <form id="uploadScheduleForm">
                <div class="form-group">
                    <label for="scheduleFile">${profile.haveSchedule ? 'Upload New Schedule (Replaces Current)' : 'Schedule File'}</label>
                    <input type="file" id="scheduleFile" name="scheduleFile" accept=".pdf,.png,.jpg,.jpeg" required>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">${profile.haveSchedule ? 'Update Schedule' : 'Upload Schedule'}</button>
                </div>
            </form>
        </div>
    ` : '';

    return `
    <style>
        .settings-container h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem; padding-bottom: 1rem; border-bottom: 1px solid var(--border-dark); }
        .settings-section { background-color: var(--surface-dark); border: 1px solid var(--border-dark); border-radius: 8px; padding: 2rem; margin-bottom: 2rem; }
        .settings-section h3 { font-size: 1.25rem; font-weight: 600; margin-top: 0; margin-bottom: 1.5rem; color: var(--text-primary); }
        .settings-section p { margin-top: -1rem; margin-bottom: 1.5rem; color: var(--text-secondary); }
        .form-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 1.5rem; }
        .form-grid.single-column { grid-template-columns: 1fr; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label { color: var(--text-secondary); font-weight: 500; margin-bottom: 0.5rem; font-size: 0.9rem; }
        .form-group input, .form-group select { background-color: var(--bg-dark); color: var(--text-primary); border: 1px solid var(--border-dark); padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; transition: border-color 0.2s, box-shadow 0.2s; }
        .form-group input:focus, .form-group select:focus { outline: none; border-color: var(--accent-blue); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3); }
        .settings-actions { margin-top: 2rem; }
        .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.9rem; padding: 0.75rem 1.5rem; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
        .primary-btn { background-color: var(--accent-blue); color: var(--text-primary); }
        .danger-btn { background-color: var(--status-red); color: var(--text-primary); }
    </style>
    <div class="settings-container">
        <h1>Account Settings</h1>

        <!-- Edit Profile Section -->
        <div class="settings-section">
            <h3>Edit Profile</h3>
            <form id="editProfileForm">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="profileUsername">Username</label>
                        <input type="text" id="profileUsername" name="username" value="${profile.username || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profileFullName">Full Name</label>
                        <input type="text" id="profileFullName" name="fullname" value="${profile.fullname || ''}" required>
                    </div>

                    <!-- CORRECTED: Conditionally render Year/Section only for students -->
                    ${isStudent ? `
                    <div class="form-group">
                        <label for="profileYearLevel">Year / Section</label>
                        <input type="text" id="profileYearLevel" name="yearLevel" value="${profile.yearLevel || ''}" required>
                    </div>
                    ` : ''}
                    
                    <div class="form-group">
                        <label for="profileGender">Gender</label>
                        <select id="profileGender" name="gender" required>
                            <option value="">Select Gender</option>
                            <option value="male" ${profile.gender === 'male' ? 'selected' : ''}>Male</option>
                            <option value="female" ${profile.gender === 'female' ? 'selected' : ''}>Female</option>
                            <option value="other" ${profile.gender === 'other' ? 'selected' : ''}>Other</option>
                        </select>
                    </div>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">Save Profile Changes</button>
                </div>
            </form>
        </div>
        
        <!-- CORRECTED: Render the conditional file upload sections here -->
        ${resumeSection}
        ${scheduleSection}

        <!-- Change Password Section (For Everyone) -->
        <div class="settings-section">
            <h3>Change Password</h3>
            <form id="changePasswordForm">
                <div class="form-grid single-column">
                    <div class="form-group">
                        <label for="currentPassword">Current Password</label>
                        <input type="password" id="currentPassword" name="currentPassword" required autocomplete="current-password" placeholder="Enter your current password">
                    </div>
                    <div class="form-group">
                        <label for="newPassword">New Password</label>
                        <input type="password" id="newPassword" name="newPassword" required autocomplete="new-password" placeholder="Enter a strong new password">
                    </div>
                    <div class="form-group">
                        <label for="confirmNewPassword">Confirm New Password</label>
                        <input type="password" id="confirmNewPassword" name="confirmNewPassword" required autocomplete="new-password" placeholder="Confirm your new password">
                    </div>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">Update Password</button>
                </div>
            </form>
        </div>

        <!-- Danger Zone Section (For Everyone) -->
        <div class="settings-section danger-zone">
            <h3>Danger Zone</h3>
            <p>These actions are permanent and cannot be undone. Proceed with caution.</p>
            <div class="settings-actions">
                <button type="button" id="deleteAccountBtn" class="btn danger-btn">Delete My Account</button>
            </div>
        </div>
    </div>
    `;
}

/**
 * Attaches event listeners for the forms on the settings page.
 * This logic correctly handles both student and admin forms.
 */
function attachEventListeners(user, profile) {
    // --- EDIT PROFILE ---
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = editProfileForm.querySelector('button[type="submit"]');
            const formData = new FormData(editProfileForm);
            const data = Object.fromEntries(formData.entries());

            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, data);
                alert('Profile updated successfully!');
                window.location.reload();
            } catch (error) {
                console.error('Failed to update profile:', error);
                alert('An error occurred while updating your profile.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Profile Changes';
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

            if (newPassword !== confirmPassword) {
                alert('New passwords do not match!');
                return;
            }
            if (newPassword.length < 8) {
                alert('New password must be at least 8 characters long.');
                return;
            }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Updating...';
            try {
                await account.updatePassword(newPassword, currentPassword);
                alert('Password updated successfully!');
                changePasswordForm.reset();
            } catch (error) {
                console.error('Failed to update password:', error);
                alert('Failed to update password. Please check if your "Current Password" is correct.');
            } finally {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
            }
        });
    }

    // --- DELETE ACCOUNT ---
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            if (confirm('ARE YOU ABSOLUTELY SURE?\nThis will permanently delete your account.')) {
                // TODO: Add account deletion logic here
                alert('Account deletion initiated!');
            }
        });
    }

    // --- UPLOAD RESUME (Attaches only if the form exists for a student) ---
    const uploadResumeForm = document.getElementById('uploadResumeForm');
    if (uploadResumeForm) {
        uploadResumeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadResumeForm.querySelector('button[type="submit"]');
            const file = document.getElementById('resumeFile').files[0];
            if (!file) { alert('Please select a file to upload.'); return; }

            submitBtn.disabled = true; submitBtn.textContent = 'Uploading...';
            try {
                if (profile.haveResume && profile.resumeId) {
                    await storage.deleteFile(BUCKET_ID_RESUMES, profile.resumeId);
                }
                const uploadedFile = await storage.createFile(BUCKET_ID_RESUMES, ID.unique(), file);
                await databases.updateDocument(
                    DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id,
                    { haveResume: true, resumeId: uploadedFile.$id }
                );
                alert('Resume updated successfully!');
                window.location.reload();
            } catch (error) {
                console.error('Resume upload failed:', error);
                alert('Failed to upload resume. Please try again.');
            } finally {
                submitBtn.disabled = false;
            }
        });
    }

    // --- UPLOAD SCHEDULE (Attaches only if the form exists for a student) ---
    const uploadScheduleForm = document.getElementById('uploadScheduleForm');
    if (uploadScheduleForm) {
        uploadScheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadScheduleForm.querySelector('button[type="submit"]');
            const file = document.getElementById('scheduleFile').files[0];
            if (!file) { alert('Please select a file to upload.'); return; }
            
            submitBtn.disabled = true; submitBtn.textContent = 'Uploading...';
            try {
                if (profile.haveSchedule && profile.scheduleId) {
                    await storage.deleteFile(BUCKET_ID_SCHEDULES, profile.scheduleId);
                }
                const uploadedFile = await storage.createFile(BUCKET_ID_SCHEDULES, ID.unique(), file);
                await databases.updateDocument(
                    DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id,
                    { haveSchedule: true, scheduleId: uploadedFile.$id }
                );
                alert('Schedule updated successfully!');
                window.location.reload();
            } catch (error) {
                console.error('Schedule upload failed:', error);
                alert('Failed to upload schedule. Please try again.');
            } finally {
                submitBtn.disabled = false;
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