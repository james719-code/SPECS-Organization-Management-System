import { databases, storage, account, functions } from "../../shared/appwrite.js";
import { ID } from "appwrite";
import { showToast } from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_STUDENTS,
    BUCKET_ID_SCHEDULES,
    FUNCTION_ID
} from '../../shared/constants.js';

import uploadIcon from 'bootstrap-icons/icons/upload.svg';
import exclamationOctagonIcon from 'bootstrap-icons/icons/exclamation-octagon.svg';
import personGear from 'bootstrap-icons/icons/person-gear.svg';
import lock from 'bootstrap-icons/icons/lock.svg';
import shieldExclamation from 'bootstrap-icons/icons/shield-exclamation.svg';
import calendarWeek from 'bootstrap-icons/icons/calendar-week.svg';

function getSettingsHTML(user, profile) {
    const isStudent = profile.type === 'student';

    const currentYearLevel = (profile.students && profile.students.yearLevel) || profile.yearLevel;
    const yearLevelOptions = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
        .map(section => {
            const value = `BSCS ${section}`;
            const selected = currentYearLevel === value ? 'selected' : '';
            return `<option value="${value}" ${selected}>${value}</option>`;
        }).join('');

    const btnIconStyle = "width: 1.1em; height: 1.1em; filter: invert(1);";

    // UPDATED SCHEDULE SECTION: Better Grid Layout
    const scheduleSection = isStudent ? `
        <div class="card border-0 shadow-sm mb-4 overflow-hidden">
            <div class="card-header bg-white border-bottom-0 pt-4 px-4 d-flex align-items-center">
                <div class="bg-info-subtle text-info p-2 rounded me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                    <img src="${calendarWeek}" style="width: 1.2rem; filter: invert(39%) sepia(9%) saturate(4900%) hue-rotate(167deg) brightness(96%) contrast(101%);">
                </div>
                <div>
                    <h5 class="fw-bold m-0 text-dark">Class Schedule</h5>
                    <small class="text-muted">Manage your class schedule document</small>
                </div>
            </div>
            <div class="card-body p-4">
                <div id="schedule-feedback" class="mb-4">
                    ${profile.haveSchedule && profile.scheduleId ? `
                        <div class="d-flex align-items-center p-3 bg-success-subtle text-success rounded-3 border border-success-subtle">
                            <i class="bi bi-check-circle-fill fs-4 me-3"></i>
                            <div>
                                <h6 class="fw-bold mb-0">Schedule Uploaded</h6>
                                <a href="${storage.getFileView(BUCKET_ID_SCHEDULES, profile.scheduleId)}" target="_blank" class="small text-success text-decoration-underline">View Current PDF</a>
                            </div>
                        </div>`
            : `
                        <div class="alert alert-light border text-muted d-flex align-items-center mb-0">
                            <i class="bi bi-info-circle me-2"></i>
                            <span class="small">Please upload your latest COE/Schedule (PDF) for verification.</span>
                        </div>
                    `}
                </div>
                
                <form id="uploadScheduleForm" class="row g-3 align-items-end">
                    <div class="col-md-8">
                        <label for="scheduleFile" class="form-label small fw-bold text-secondary text-uppercase">Select PDF File</label>
                        <input type="file" class="form-control" id="scheduleFile" name="scheduleFile" accept=".pdf" required>
                    </div>
                    <div class="col-md-4">
                        <button type="submit" class="btn btn-primary w-100 rounded-pill fw-bold d-flex align-items-center justify-content-center gap-2">
                            <img src="${uploadIcon}" alt="Upload" style="${btnIconStyle}">
                            <span>${profile.haveSchedule ? 'Update File' : 'Upload'}</span>
                        </button>
                    </div>
                </form>
            </div>
        </div>
    ` : '';

    return `
    <div class="settings-container container-fluid py-4 px-md-5 animate-fade-in-up">
        <header class="mb-5">
            <h1 class="display-6 fw-bold text-dark mb-1">Settings</h1>
            <p class="text-muted mb-0">Manage your profile details and security preferences.</p>
        </header>

        <div class="row g-4">
            <div class="col-lg-8">
                <div class="card border-0 shadow-sm mb-4 overflow-hidden">
                    <div class="card-header bg-white border-bottom-0 pt-4 px-4 d-flex align-items-center">
                         <div class="bg-primary-subtle text-primary p-2 rounded me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            <img src="${personGear}" style="width: 1.25rem;">
                         </div>
                        <h5 class="fw-bold m-0 text-dark">Personal Information</h5>
                    </div>
                    <div class="card-body p-4">
                        <form id="editProfileForm">
                            <div class="row g-3">
                                <div class="${isStudent ? 'col-md-6' : 'col-12'}">
                                    <label for="profileUsername" class="form-label small fw-bold text-secondary text-uppercase">Username</label>
                                    <input type="text" class="form-control bg-light border-0" id="profileUsername" name="username" value="${profile.username || ''}" required>
                                </div>
                                
                                ${isStudent ? `
                                <div class="col-md-6">
                                    <label for="profileFullName" class="form-label small fw-bold text-secondary text-uppercase">Full Name</label>
                                    <input type="text" class="form-control bg-light border-0" id="profileFullName" name="name" value="${(profile.students && profile.students.name) || ''}" required>
                                </div>
                                <div class="col-md-6">
                                    <label for="profileYearLevel" class="form-label small fw-bold text-secondary text-uppercase">Year & Section</label>
                                    <select id="profileYearLevel" name="yearLevel" class="form-select bg-light border-0" required>
                                        <option value="" disabled>-- Select --</option>
                                        ${yearLevelOptions}
                                    </select>
                                </div>
                                ` : `
                                <div class="col-12">
                                    <label class="form-label small fw-bold text-secondary text-uppercase">Email</label>
                                    <input type="email" class="form-control bg-light border-0 text-muted" value="${user.email || ''}" disabled>
                                    <div class="form-text">Email cannot be changed from here.</div>
                                </div>
                                `}
                            </div>
                            <div class="mt-4 pt-3 border-top d-flex justify-content-end">
                                <button type="submit" class="btn btn-primary px-4 rounded-pill fw-bold">Save Changes</button>
                            </div>
                        </form>
                    </div>
                </div>
                
                ${scheduleSection}

                <div class="card border-0 shadow-sm mb-4 overflow-hidden">
                    <div class="card-header bg-white border-bottom-0 pt-4 px-4 d-flex align-items-center">
                        <div class="bg-warning-subtle text-warning p-2 rounded me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            <img src="${lock}" style="width: 1.2rem;">
                        </div>
                        <h5 class="fw-bold m-0 text-dark">Password & Security</h5>
                    </div>
                    <div class="card-body p-4">
                        <form id="changePasswordForm">
                            <div class="mb-3">
                                <label for="currentPassword" class="form-label small fw-bold text-secondary text-uppercase">Current Password</label>
                                <input type="password" class="form-control bg-light border-0" id="currentPassword" name="currentPassword" required autocomplete="current-password">
                            </div>
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label for="newPassword" class="form-label small fw-bold text-secondary text-uppercase">New Password</label>
                                    <input type="password" class="form-control bg-light border-0" id="newPassword" name="newPassword" required autocomplete="new-password" placeholder="Min. 8 characters">
                                </div>
                                <div class="col-md-6">
                                    <label for="confirmNewPassword" class="form-label small fw-bold text-secondary text-uppercase">Confirm Password</label>
                                    <input type="password" class="form-control bg-light border-0" id="confirmNewPassword" name="confirmNewPassword" required autocomplete="new-password">
                                </div>
                            </div>
                            <div class="mt-4 pt-3 border-top d-flex justify-content-end">
                                <button type="submit" class="btn btn-warning text-white px-4 rounded-pill fw-bold">Update Password</button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>

            <div class="col-lg-4">
                <div class="card border-0 shadow-sm border-start border-danger border-4">
                    <div class="card-header bg-white border-bottom-0 pt-4 px-4 d-flex align-items-center">
                         <div class="bg-danger-subtle text-danger p-2 rounded me-3 d-flex align-items-center justify-content-center" style="width: 40px; height: 40px;">
                            <img src="${shieldExclamation}" style="width: 1.25rem;">
                         </div>
                        <h5 class="fw-bold m-0 text-danger">Danger Zone</h5>
                    </div>
                    <div class="card-body p-4">
                        <p class="text-secondary small mb-4">Deleting your account is permanent. All your data will be wiped immediately. Proceed with caution.</p>
                        <button type="button" id="deleteAccountBtn" class="btn btn-outline-danger w-100 d-flex align-items-center justify-content-center gap-2 py-2 fw-bold">
                            <img src="${exclamationOctagonIcon}" alt="Warning" style="width: 1.1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">
                            Delete Account
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;
}

function attachEventListeners(user, profile) {

    const setupForm = (formId, onSubmit) => {
        const form = document.getElementById(formId);
        if (!form) return;

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = form.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;

            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Processing...`;

            try {
                await onSubmit(new FormData(form), form);
                // Success State
                btn.classList.replace('btn-primary', 'btn-success');
                btn.classList.replace('btn-warning', 'btn-success');
                btn.innerHTML = `<i class="bi bi-check-lg me-2"></i>Saved`;

                setTimeout(() => {
                    btn.classList.replace('btn-success', formId === 'changePasswordForm' ? 'btn-warning' : 'btn-primary');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            } catch (error) {
                console.error(error);
                btn.classList.replace('btn-primary', 'btn-danger');
                btn.classList.replace('btn-warning', 'btn-danger');
                btn.innerHTML = `<i class="bi bi-exclamation-triangle me-2"></i>Error`;
                showToast(error.message || "An unexpected error occurred.", 'error');

                setTimeout(() => {
                    btn.classList.replace('btn-danger', formId === 'changePasswordForm' ? 'btn-warning' : 'btn-primary');
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                }, 2000);
            }
        });
    };

    // 1. Edit Profile
    setupForm('editProfileForm', async (formData) => {
        const data = Object.fromEntries(formData.entries());

        if (profile.type === 'student') {
            // Students collection: map 'fullname' form field → 'name' attribute
            const studentData = {};
            if (data.name) studentData.name = data.name;
            if (data.yearLevel) studentData.yearLevel = data.yearLevel;
            const studentDocId = (profile.students && profile.students.$id) ? profile.students.$id : user.$id;
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentDocId, studentData);
            // Also update username on accounts
            if (data.username) {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id, { username: data.username });
            }
        } else {
            // Officers/admins: accounts collection only supports 'username'
            await databases.updateDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id, { username: data.username });
        }
    });

    // 2. Change Password
    setupForm('changePasswordForm', async (formData, form) => {
        const current = formData.get('currentPassword');
        const newPass = formData.get('newPassword');
        const confirmPass = formData.get('confirmNewPassword');

        if (newPass !== confirmPass) throw new Error("Passwords do not match.");
        if (newPass.length < 8) throw new Error("Password too short (min 8 chars).");

        await account.updatePassword(newPass, current);
        form.reset();
    });

    // 3. Schedule Upload
    setupForm('uploadScheduleForm', async (formData, form) => {
        const file = formData.get('scheduleFile');
        if (!file || file.size === 0) throw new Error("Please select a valid PDF.");

        if (profile.haveSchedule && profile.scheduleId) {
            try { await storage.deleteFile(BUCKET_ID_SCHEDULES, profile.scheduleId); } catch (e) { console.warn("Old file delete failed", e); }
        }

        const uploaded = await storage.createFile(BUCKET_ID_SCHEDULES, ID.unique(), file);
        const studentDocId = (profile.students && profile.students.$id) ? profile.students.$id : user.$id;
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentDocId, {
            haveSchedule: true,
            scheduleId: uploaded.$id
        });

        // Update UI immediately
        profile.haveSchedule = true;
        profile.scheduleId = uploaded.$id;
        document.getElementById('schedule-feedback').innerHTML = `
            <div class="d-flex align-items-center p-3 bg-success-subtle text-success rounded-3 border border-success-subtle animate-fade-in-up">
                <i class="bi bi-check-circle-fill fs-4 me-3"></i>
                <div><h6 class="fw-bold mb-0">Schedule Uploaded</h6><a href="${storage.getFileView(BUCKET_ID_SCHEDULES, uploaded.$id)}" target="_blank" class="small text-success text-decoration-underline">View Current PDF</a></div>
            </div>`;
        form.reset();
    });

    // 4. Delete Account
    const delBtn = document.getElementById('deleteAccountBtn');
    if (delBtn) {
        delBtn.addEventListener('click', async () => {
            const confirmed = await confirmAction(
                'Delete Account',
                'This action is permanent. All your data will be wiped immediately.',
                'Delete Account',
                'danger'
            );
            if (!confirmed) return;

            delBtn.disabled = true;
            delBtn.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Deleting...`;

            try {
                if (FUNCTION_ID) {
                    await functions.createExecution(
                        FUNCTION_ID,
                        JSON.stringify({ action: 'delete_account', userId: user.$id }),
                        false
                    );
                }
                await account.deleteSession('current');
                window.location.href = '/landing/';
            } catch (err) {
                showToast('Delete failed: ' + err.message, 'error');
                delBtn.disabled = false;
                delBtn.innerHTML = 'Delete Account';
            }
        });
    }
}

export default function renderSettingsView(user, profile) {
    return {
        html: getSettingsHTML(user, profile),
        afterRender: () => attachEventListeners(user, profile)
    };
}