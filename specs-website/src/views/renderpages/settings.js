// renderpages/settings.js
import { databases, storage, account } from "../../appwrite.js";
import {ID} from "appwrite";

const DATABASE_ID = "685399d600072f4385eb";
const COLLECTION_ID_STUDENTS = "685767a8002f47cbef39";
const BUCKET_ID_RESUMES = '68579d2d001dce6f7ae7';     // <--- REPLACE THIS
const BUCKET_ID_SCHEDULES = '68579d3c0030b9e663d8'; // <--- REPLACE THIS
/**
 * Returns the HTML for the settings page.
 * @param {object} user - The Appwrite user object.
 * @param {object} profile - The user's profile document.
 * @returns {string} HTML string for the view.
 */
function getSettingsHTML(user, profile) {
    const currentUserId = user.$id;

    // --- Dynamic Content for Resume Upload Section ---
    const hasResume = profile.haveResume && profile.resumeId;
    const resumeButtonText = hasResume ? 'Update Resume' : 'Upload Resume';
    const resumeViewLink = hasResume 
        ? `<p class="current-file-link">Current file: <a href="${storage.getFileView(BUCKET_ID_RESUMES, profile.resumeId)}" target="_blank" rel="noopener noreferrer">View Resume</a></p>` 
        : '';

    // --- Dynamic Content for Schedule Upload Section ---
    const hasSchedule = profile.haveSchedule && profile.scheduleId;
    const scheduleButtonText = hasSchedule ? 'Update Schedule' : 'Upload Schedule';
    const scheduleViewLink = hasSchedule 
        ? `<p class="current-file-link">Current file: <a href="${storage.getFileView(BUCKET_ID_SCHEDULES, profile.scheduleId)}" target="_blank" rel="noopener noreferrer">View Schedule</a></p>` 
        : '';

    return `
    <style>
        /* --- SETTINGS-SPECIFIC STYLES --- */
        .settings-container h1 { 
          font-size: 1.75rem; font-weight: 700; margin-bottom: 2rem; 
          padding-bottom: 1rem; border-bottom: 1px solid var(--border-dark); 
        }
        .settings-section {
          background-color: var(--surface-dark); border: 1px solid var(--border-dark);
          border-radius: 8px; padding: 2rem; margin-bottom: 2rem;
        }
        .settings-section h3 { 
          font-size: 1.25rem; font-weight: 600; margin-top: 0; 
          margin-bottom: 1.5rem; color: var(--text-primary); 
        }
        .settings-section p {
            margin-top: -1rem; margin-bottom: 1.5rem; color: var(--text-secondary);
        }

        /* --- FORM STYLES --- */
        .form-grid {
          display: grid; grid-template-columns: repeat(2, 1fr); gap: 1.5rem;
        }
        .form-grid.single-column { grid-template-columns: 1fr; }
        .form-group { display: flex; flex-direction: column; }
        .form-group label {
            color: var(--text-secondary); font-weight: 500; 
            margin-bottom: 0.5rem; font-size: 0.9rem;
        }
        .form-group input, .form-group select {
            background-color: var(--bg-dark); color: var(--text-primary); 
            border: 1px solid var(--border-dark);
            padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem;
            transition: border-color 0.2s, box-shadow 0.2s;
        }
        .form-group input:focus, .form-group select:focus {
            outline: none; border-color: var(--accent-blue);
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.3);
        }
        .form-group input[type="file"] { padding: 0; }
        .form-group input[type="file"]::file-selector-button {
            background-color: var(--accent-blue); color: var(--text-primary); font-weight: 600;
            padding: 0.75rem 1rem; border: none; border-right: 1px solid var(--border-dark);
            margin-right: 1rem; cursor: pointer; transition: background-color 0.2s;
        }
        .form-group input[type="file"]::file-selector-button:hover { 
            background-color: var(--accent-blue-hover); 
        }

        /* --- BUTTON & ACTION STYLES --- */
        .settings-actions { margin-top: 2rem; }
        .btn {
            display: inline-flex; align-items: center; justify-content: center;
            font-weight: 600; font-size: 0.9rem; padding: 0.75rem 1.5rem;
            border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s;
        }
        .primary-btn { background-color: var(--accent-blue); color: var(--text-primary); }
        .primary-btn:hover { background-color: var(--accent-blue-hover); }
        .danger-btn { background-color: var(--status-red); color: var(--text-primary); }
        .danger-btn:hover { background-color: #B91C1C; }
        .danger-zone { border-color: var(--status-red); }
        .danger-zone h3 { color: var(--status-red); }

        @media (max-width: 768px) {
          .form-grid { grid-template-columns: 1fr; }
        }
    </style>
    <div class="settings-container">
        <h1>Account Settings</h1>

        <!-- Edit Profile Section -->
        <div class="settings-section">
            <h3>Edit Profile</h3>
            <form id="editProfileForm">
                <input type="hidden" name="accountId" value="${currentUserId}">
                <div class="form-grid">
                    <div class="form-group">
                        <label for="profileUsername">Username</label>
                        <input type="text" id="profileUsername" name="username" value="${profile.username || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profileFullName">Full Name</label>
                        <input type="text" id="profileFullName" name="fullname" value="${profile.fullname || ''}" required>
                    </div>
                    <div class="form-group">
                        <label for="profileYearLevel">Year / Section</label>
                        <input type="text" id="profileYearLevel" name="yearLevel" value="${profile.yearLevel || ''}" required>
                    </div>
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
        
        <div class="settings-section">
            <h3>Upload Resume</h3>
            ${resumeViewLink} 
            <p>Keep your professional profile up-to-date. Accepted formats: PDF, DOC, DOCX.</p>
            <form id="uploadResumeForm">
                <div class="form-group">
                    <label for="resumeFile">${hasResume ? 'Upload New Resume (Replaces Current)' : 'Resume File'}</label>
                    <input type="file" id="resumeFile" name="resumeFile" accept=".pdf,.doc,.docx" required>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">${resumeButtonText}</button>
                </div>
            </form>
        </div>
        
        <div class="settings-section">
            <h3>Upload Class Schedule</h3>
            ${scheduleViewLink} 
            <p>Provide your latest class schedule. Accepted formats: PDF, PNG, JPG.</p>
            <form id="uploadScheduleForm">
                <div class="form-group">
                    <label for="scheduleFile">${hasSchedule ? 'Upload New Schedule (Replaces Current)' : 'Schedule File'}</label>
                    <input type="file" id="scheduleFile" name="scheduleFile" accept=".pdf,.png,.jpg,.jpeg" required>
                </div>
                <div class="settings-actions">
                    <button type="submit" class="btn primary-btn">${scheduleButtonText}</button>
                </div>
            </form>
        </div>


        <!-- Change Password Section -->
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

        <!-- Danger Zone Section -->
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
 */
function attachEventListeners(user, profile) {
    const editProfileForm = document.getElementById('editProfileForm');
    if (editProfileForm) {
        editProfileForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = editProfileForm.querySelector('button[type="submit"]');
            
            const formData = new FormData(editProfileForm);
            const data = Object.fromEntries(formData.entries());

            // Disable button to prevent multiple submissions
            submitBtn.disabled = true;
            submitBtn.textContent = 'Saving...';

            try {
                // Remove the accountId from the data object as it's not a database attribute
                delete data.accountId; 

                // Call the Appwrite SDK to update the document
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID_STUDENTS,
                    user.$id, // The document ID is the user's ID
                    data      // The object with the fields to update
                );

                alert('Profile updated successfully!');
                window.location.reload(); // Reload to see the changes reflected

            } catch (error) {
                console.error('Failed to update profile:', error);
                alert('An error occurred while updating your profile. Please try again.');
            } finally {
                // Re-enable the button regardless of success or failure
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save Profile Changes';
            }
        });
    }

    const changePasswordForm = document.getElementById('changePasswordForm');
    if (changePasswordForm) {
        changePasswordForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = changePasswordForm.querySelector('button[type="submit"]');

            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmNewPassword').value;

            if (!currentPassword || !newPassword) {
                alert('Please fill in all password fields.');
                return;
            }

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
                // Call the Appwrite SDK to update the password
                await account.updatePassword(newPassword, currentPassword);

                alert('Password updated successfully!');
                changePasswordForm.reset(); // Clear the form fields for security

            } catch (error) {
                console.error('Failed to update password:', error);
                alert('Failed to update password. Please check if your "Current Password" is correct.');
            } finally {
                // Re-enable the button and reset its text
                submitBtn.disabled = false;
                submitBtn.textContent = 'Update Password';
            }
        });
    }

    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', () => {
            const isConfirmed = confirm('ARE YOU ABSOLUTELY SURE?\nThis action cannot be undone and will permanently delete your account and all associated data.');
            if (isConfirmed) {
                console.log('Account Deletion Confirmed.');
                // TODO: Add Appwrite account.delete call here, then logout/redirect.
                alert('Account deletion initiated!');
            }
        });
    }

    //Upload Implementation
    const uploadResumeForm = document.getElementById('uploadResumeForm');
    if (uploadResumeForm) {
        uploadResumeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadResumeForm.querySelector('button[type="submit"]');
            const file = document.getElementById('resumeFile').files[0];
            if (!file) { alert('Please select a file to upload.'); return; }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';

            try {
                // Step 1 (Optional but Recommended): Delete the old file if it exists
                if (profile.haveResume && profile.resumeId) {
                    await storage.deleteFile(BUCKET_ID_RESUMES, profile.resumeId);
                }

                // Step 2: Upload the new file
                const uploadedFile = await storage.createFile(BUCKET_ID_RESUMES, ID.unique(), file);
                
                // Step 3: Update the user's document in the database
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID_STUDENTS,
                    user.$id,
                    { haveResume: true, resumeId: uploadedFile.$id }
                );

                alert('Resume updated successfully! The page will refresh to show the changes.');
                window.location.reload(); // Refresh to show the new "View" link and updated state
            } catch (error) {
                console.error('Resume upload failed:', error);
                alert('Failed to upload resume. Please try again.');
            } finally {
                submitBtn.disabled = false;
                // Text content will be updated on page reload
            }
        });
    }

    // --- UPLOAD SCHEDULE LOGIC ---
    const uploadScheduleForm = document.getElementById('uploadScheduleForm');
    if (uploadScheduleForm) {
        uploadScheduleForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = uploadScheduleForm.querySelector('button[type="submit"]');
            const file = document.getElementById('scheduleFile').files[0];
            if (!file) { alert('Please select a file to upload.'); return; }

            submitBtn.disabled = true;
            submitBtn.textContent = 'Uploading...';

            try {
                // Step 1: Delete the old file if it exists
                if (profile.haveSchedule && profile.scheduleId) {
                    await storage.deleteFile(BUCKET_ID_SCHEDULES, profile.scheduleId);
                }

                // Step 2: Upload the new file
                const uploadedFile = await storage.createFile(BUCKET_ID_SCHEDULES, ID.unique(), file);

                // Step 3: Update the user's document
                await databases.updateDocument(
                    DATABASE_ID,
                    COLLECTION_ID_STUDENTS,
                    user.$id,
                    { haveSchedule: true, scheduleId: uploadedFile.$id }
                );

                alert('Schedule updated successfully! The page will refresh to show the changes.');
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
 * Renders the settings view and provides a function to attach its events.
 * @param {object} user - The Appwrite user object.
 * @param {object} profile - The user's profile document.
 * @returns {{html: string, afterRender: function}}
 */
export default function renderSettingsView(user, profile) {
    return {
        html: getSettingsHTML(user, profile),
        afterRender: () => attachEventListeners(user, profile)
    };
}