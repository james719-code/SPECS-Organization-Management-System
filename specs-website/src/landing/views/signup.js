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
    const yearLevelOptions = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
        .map(section => `<option value="BSCS ${section}">BSCS ${section}</option>`).join('');

    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-8 col-xl-7">
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="signup-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Create Account</h2>
                            <div id="form-error-message" class="alert alert-danger d-none" role="alert"></div>
                            <div class="row g-3">
                                <div class="col-md-6"><label for="name" class="form-label">Full Name</label><input id="name" name="name" type="text" class="form-control" placeholder="e.g., Juan Dela Cruz" required /></div>
                                <div class="col-md-6"><label for="username" class="form-label">Username</label><input id="username" name="username" type="text" class="form-control" placeholder="e.g., juan23" required /></div>
                                <div class="col-12"><label for="email" class="form-label">University Email</label><input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required pattern=".+@parsu\\.edu\\.ph$" title="Please use your @parsu.edu.ph email address."/></div>

                                <div class="col-md-4"><label for="yearLevel" class="form-label">Section</label><select id="yearLevel" name="yearLevel" class="form-select" required><option value="" disabled selected>-- Select --</option>${yearLevelOptions}</select></div>
                                <div class="col-md-4"><label for="yearNum" class="form-label">Year Level</label><select id="yearNum" name="yearNum" class="form-select" required><option value="" disabled selected>-- Select --</option><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></div>

                                <div class="col-md-4"><label for="role" class="form-label">Registering as</label><select id="role" name="role" class="form-select" required><option value="student" selected>Student</option></select></div>

                                <div class="col-md-12"><label for="address" class="form-label">Address</label><input id="address" name="address" type="text" class="form-control" required /></div>
                                <div class="col-md-6"><label for="studentId" class="form-label">Student ID</label><input id="studentId" name="studentId" type="number" class="form-control" required /></div>

                                <div class="col-md-6"><label for="password" class="form-label">Password</label><input id="password" name="password" type="password" class="form-control" placeholder="At least 8 characters" required minlength="8" /></div>
                                <div class="col-md-6"><label for="password2" class="form-label">Retype Password</label><input id="password2" name="password2" type="password" class="form-control" placeholder="Confirm your password" required /></div>
                            </div>
                            <div class="d-grid mt-4">
                                <button type="submit" class="btn btn-primary">
                                    <span class="button-text">Sign Up</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                                </button>
                            </div>
                            <p class="text-center small mt-4 mb-0">Already have an account? <a href="#login">Login here</a></p>
                            <p class="text-center small mt-2 mb-0"><a href="#home">Back to Home</a></p>
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
            yearLevel: e.target.elements['yearLevel'].value,
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
        buttonText.textContent = 'Signing Up...';
        buttonSpinner.classList.remove('d-none');

        try {
            // 2. Create User & Session
            const user = await account.create(ID.unique(), formData.email, formData.password, formData.name);
            await account.createEmailPasswordSession(formData.email, formData.password);

            // 3. Create Student Profile
            const studentDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                ID.unique(),
                {
                    student_id: parseInt(formData.studentId),
                    name: formData.name,
                    email: formData.email,
                    section: formData.yearLevel,
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

            // FIX: Kill the session immediately so it doesn't duplicate later
            await account.deleteSession('current');

            window.location.hash = 'check-email';
        } catch (err) {
            console.error(err);
            showFormError(`Signup failed: ${err.message}`);
        } finally {
            if (!window.location.hash.includes('check-email')) {
                submitButton.disabled = false;
                buttonText.textContent = 'Sign Up';
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

            // FIX: Try to delete session ONLY if it exists (avoids error on mobile)
            try { await account.deleteSession('current'); } catch (e) { /* ignore */ }

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
    // FIX: Removed "Logout" button, added "Back to Login" link since user is already logged out
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