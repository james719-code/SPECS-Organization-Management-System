// views/signup.js
import { app } from '../landing.js';
import { account, databases, ID } from '../../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_STUDENTS
} from '../../shared/constants.js';

import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import hourglassSplit from 'bootstrap-icons/icons/hourglass-split.svg';
import envelopeCheckFill from 'bootstrap-icons/icons/envelope-check-fill.svg';

export function renderSignupPage() {
    const sectionOptions = ['A', 'B']
        .map(section => `<option value="${section}">${section}</option>`).join('');
    
    const yearOptions = [1, 2, 3, 4]
        .map(year => `<option value="${year}">${year}</option>`).join('');

    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-10 col-lg-8 col-xl-7">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <form id="signup-form" novalidate>
                            <div class="text-center mb-4">
                                <h2 class="fw-bold mb-2">Create Account</h2>
                                <p class="text-muted small">Join SPECS and start your journey</p>
                            </div>
                            <div id="form-error-message" class="alert alert-danger d-none" role="alert"></div>
                            
                            <div class="row g-3">
                                <!-- Personal Information -->
                                <div class="col-12">
                                    <h6 class="text-muted mb-3 fw-semibold">Personal Information</h6>
                                </div>
                                <div class="col-md-6">
                                    <label for="name" class="form-label fw-semibold">Full Name <span class="text-danger">*</span></label>
                                    <input id="name" name="name" type="text" class="form-control" placeholder="e.g., Juan Dela Cruz" required />
                                </div>
                                <div class="col-md-6">
                                    <label for="username" class="form-label fw-semibold">Username <span class="text-danger">*</span></label>
                                    <input id="username" name="username" type="text" class="form-control" placeholder="e.g., juan23" required />
                                </div>
                                <div class="col-12">
                                    <label for="email" class="form-label fw-semibold">University Email <span class="text-danger">*</span></label>
                                    <input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required pattern=".+@parsu\\.edu\\.ph$" title="Please use your @parsu.edu.ph email address."/>
                                    <div class="form-text">Use your official ParSU email address</div>
                                </div>

                                <!-- Academic Information -->
                                <div class="col-12 mt-4">
                                    <h6 class="text-muted mb-3 fw-semibold">Academic Information</h6>
                                </div>
                                <div class="col-md-4">
                                    <label for="studentId" class="form-label fw-semibold">Student ID <span class="text-danger">*</span></label>
                                    <input id="studentId" name="studentId" type="number" class="form-control" placeholder="e.g., 20230001" required />
                                </div>
                                <div class="col-md-4">
                                    <label for="yearNum" class="form-label fw-semibold">Year Level <span class="text-danger">*</span></label>
                                    <select id="yearNum" name="yearNum" class="form-select" required>
                                        <option value="" disabled selected>Select Year</option>
                                        ${yearOptions}
                                    </select>
                                </div>
                                <div class="col-md-4">
                                    <label for="section" class="form-label fw-semibold">Section <span class="text-danger">*</span></label>
                                    <select id="section" name="section" class="form-select" required>
                                        <option value="" disabled selected>Select Section</option>
                                        ${sectionOptions}
                                    </select>
                                </div>
                                <div class="col-12">
                                    <label for="address" class="form-label fw-semibold">Address <span class="text-danger">*</span></label>
                                    <input id="address" name="address" type="text" class="form-control" placeholder="Enter your complete address" required />
                                </div>

                                <!-- Security -->
                                <div class="col-12 mt-4">
                                    <h6 class="text-muted mb-3 fw-semibold">Security</h6>
                                </div>
                                <div class="col-md-6">
                                    <label for="password" class="form-label fw-semibold">Password <span class="text-danger">*</span></label>
                                    <input id="password" name="password" type="password" class="form-control" placeholder="At least 8 characters" required minlength="8" />
                                </div>
                                <div class="col-md-6">
                                    <label for="password2" class="form-label fw-semibold">Confirm Password <span class="text-danger">*</span></label>
                                    <input id="password2" name="password2" type="password" class="form-control" placeholder="Retype your password" required />
                                </div>
                            </div>
                            
                            <div class="d-grid mt-4">
                                <button type="submit" class="btn btn-primary btn-lg">
                                    <span class="button-text">Create Account</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                </button>
                            </div>
                            
                            <div class="text-center mt-4">
                                <p class="text-muted small mb-2">Already have an account? <a href="#login" class="fw-semibold">Sign in</a></p>
                                <a href="#home" class="text-muted small text-decoration-none">← Back to Home</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

    const signupForm = document.getElementById('signup-form');
    const submitButton = signupForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const formErrorDiv = document.getElementById('form-error-message');

    const showFormError = (message) => {
        formErrorDiv.textContent = message;
        formErrorDiv.classList.remove('d-none');
    };

    signupForm.onsubmit = async (e) => {
        e.preventDefault();

        // 1. Safe Data Extraction (Fixes "Invalid Structure" error)
        const formData = {
            name: e.target.elements['name'].value,
            username: e.target.elements['username'].value,
            email: e.target.elements['email'].value,
            section: e.target.elements['section'].value,
            yearNum: e.target.elements['yearNum'].value,
            address: e.target.elements['address'].value,
            studentId: e.target.elements['studentId'].value,
            password: e.target.elements['password'].value,
            password2: e.target.elements['password2'].value,
        };

        formErrorDiv.classList.add('d-none');
        if (formData.password.length < 8) { showFormError("Password must be at least 8 characters long."); return; }
        if (formData.password !== formData.password2) { showFormError("Passwords do not match."); return; }
        if (!formData.email.endsWith('@parsu.edu.ph')) { showFormError("Invalid email domain."); return; }
        if (!signupForm.checkValidity()) { showFormError("Please fill out all required fields."); return; }

        submitButton.disabled = true;
        buttonText.textContent = 'Creating account...';
        buttonSpinner.classList.remove('d-none');

        try {
            // 2. Create User & Session
            const user = await account.create(ID.unique(), formData.email, formData.password, formData.name);
            await account.createEmailPasswordSession(formData.email, formData.password);

            // 3. Create Student Profile with combined section
            const combinedSection = `BSCS ${formData.yearNum}${formData.section}`;
            const studentDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                ID.unique(),
                {
                    student_id: parseInt(formData.studentId),
                    name: formData.name,
                    email: formData.email,
                    section: combinedSection,
                    yearLevel: parseInt(formData.yearNum),
                    address: formData.address,
                    is_volunteer: false
                }
            );

            // 4. Create Account Document
            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_ACCOUNTS,
                user.$id,
                {
                    username: formData.username,
                    type: 'student',
                    verified: false,
                    students: studentDoc.$id
                }
            );

            // 5. Send Verification & LOGOUT
            const verificationUrl = `${window.location.origin}/landing/#verify-email`;
            await account.createVerification(verificationUrl);

            await account.deleteSession('current');

            window.location.hash = 'check-email';
        } catch (err) {
            console.error(err);
            showFormError(`Signup failed: ${err.message}`);
        } finally {
            if (!window.location.hash.includes('check-email')) {
                submitButton.disabled = false;
                buttonText.textContent = 'Create Account';
                buttonSpinner.classList.add('d-none');
            }
        }
    };
}

export function renderVerifyEmailPage() {
    app.innerHTML = `
    <div class="container auth-container">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5"><div class="card shadow-lg text-center"><div class="card-body p-4 p-md-5">
            <div id="verify-icon" class="mb-4"><div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status"></div></div>
            <h2 id="verify-status" class="card-title h3 fw-bold">Verifying Email...</h2>
            <p id="verify-message" class="card-text text-body-secondary">Please wait...</p>
            <div class="d-grid mt-4"><a href="#login" id="verify-action-btn" class="btn btn-primary d-none">Proceed to Login</a></div>
        </div></div></div>
      </div>
    </div>`;

    const handleVerification = async () => {
        const statusEl = document.getElementById('verify-status');
        const messageEl = document.getElementById('verify-message');
        const iconEl = document.getElementById('verify-icon');
        const actionBtn = document.getElementById('verify-action-btn');

        try {
            const url = new URL(window.location.href);
            const userId = url.searchParams.get('userId');
            const secret = url.searchParams.get('secret');

            if (!userId || !secret) throw new Error("Invalid link.");

            await account.updateVerification(userId, secret);

            try { await account.deleteSession('current'); } catch (e) { }

            iconEl.innerHTML = `<img src="${checkCircleFill}" class="text-success" style="width: 5rem; height: 5rem;">`;
            statusEl.textContent = "Email Verified!";
            messageEl.textContent = "Your account is active. Redirecting...";
            actionBtn.classList.remove('d-none');

            setTimeout(() => { window.location.hash = 'login'; }, 3000);

        } catch (err) {
            iconEl.innerHTML = `<img src="${xCircleFill}" class="text-danger" style="width: 5rem; height: 5rem;">`;
            statusEl.textContent = "Verification Failed";
            messageEl.textContent = err.message;
            actionBtn.classList.remove('d-none');
        }
    };
    handleVerification();
}

export function renderCheckEmailPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                 <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${envelopeCheckFill}" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(48%) sepia(61%) saturate(2371%) hue-rotate(120deg) brightness(94%) contrast(101%);">
                        <h2 class="mt-3 fw-bold">Check Your Inbox!</h2>
                        <p class="mb-4 lead">A verification link has been sent to your email. Click it to activate your account.</p>
                        <a href="#login" class="btn btn-primary">Back to Login</a>
                    </div>
                </div>
            </div>
        </div>`;
}

export function renderPendingVerificationPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${hourglassSplit}" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(75%) sepia(50%) saturate(1) hue-rotate(5deg) brightness(1.2);">
                        <h2 class="mt-3 fw-bold">Account Pending Approval</h2>
                        <p class="mb-4 lead">Your email is verified, but an admin must approve your account.</p>
                        <button id="logout-btn-pending" class="btn btn-secondary w-100 mt-3">Logout</button>
                    </div>
                </div>
            </div>
        </div>`;

    document.getElementById('logout-btn-pending').onclick = async () => {
        try {
            await account.deleteSession('current');
            window.location.hash = 'login';
        } catch (error) {
            console.error("Logout failed", error);
            window.location.hash = 'login'; // Force redirect anyway
        }
    };
}