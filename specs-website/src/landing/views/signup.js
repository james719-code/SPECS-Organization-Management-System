// views/signup.js

// Added import for 'app' from the main landing module.
import { app } from '../landing.js';
import { account, databases, ID } from '../../shared/appwrite.js';
import checkCircleFill from 'bootstrap-icons/icons/check-circle-fill.svg';
import xCircleFill from 'bootstrap-icons/icons/x-circle-fill.svg';
import hourglassSplit from 'bootstrap-icons/icons/hourglass-split.svg';
import envelopeCheckFill from 'bootstrap-icons/icons/envelope-check-fill.svg';

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

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

                                <!-- MODIFICATION: Changed grid from col-md-6 to col-md-4 to fit the new field -->
                                <div class="col-md-4"><label for="yearLevel" class="form-label">Year & Section</label><select id="yearLevel" name="yearLevel" class="form-select" required><option value="" disabled selected>-- Select --</option>${yearLevelOptions}</select></div>
                                <div class="col-md-4"><label for="gender" class="form-label">Gender</label><select id="gender" name="gender" class="form-select" required><option value="" disabled selected>-- Select --</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></div>

                                <!-- NEW FEATURE: "Registering as" dropdown added -->
                                <div class="col-md-4"><label for="role" class="form-label">Registering as</label><select id="role" name="role" class="form-select" required><option value="media">Media</option><option value="officer">Officer</option></select></div>

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
        // MODIFICATION: Added 'role' to the destructured elements
        const { name, username, email, yearLevel, gender, role, password, password2 } = e.target.elements;

        formErrorDiv.classList.add('d-none');
        if (password.value.length < 8) { showFormError("Password must be at least 8 characters long."); return; }
        if (password.value !== password2.value) { showFormError("Passwords do not match. Please try again."); return; }
        if (!email.value.endsWith('@parsu.edu.ph')) { showFormError("Invalid email. Please use your official @parsu.edu.ph email address."); return; }
        if (!signupForm.checkValidity()) { showFormError("Please fill out all required fields."); return; }

        submitButton.disabled = true;
        buttonText.textContent = 'Signing Up...';
        buttonSpinner.classList.remove('d-none');

        try {
            const user = await account.create(ID.unique(), email.value, password.value, name.value);
            await account.createEmailPasswordSession(email.value, password.value);

            // MODIFICATION: The 'type' field now uses the value from the new 'role' dropdown
            await databases.createDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id, {
                username: username.value,
                fullname: name.value,
                yearLevel: yearLevel.value,
                gender: gender.value,
                verified: false,
                type: role.value, // Changed from hardcoded 'student'
                haveResume: false,
                resumeId: '',
                haveSchedule: false,
                scheduleId: ''
            });

            const verificationUrl = `${window.location.origin}/landing/#verify-email`;
            await account.createVerification(verificationUrl);
            window.location.hash = 'check-email';
        } catch (err) {
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

// --- No changes are needed for the functions below ---

export function renderVerifyEmailPage() {
    app.innerHTML = `
    <div class="container auth-container">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5"><div class="card shadow-lg text-center"><div class="card-body p-4 p-md-5">
            <div id="verify-icon" class="mb-4"><div class="spinner-border text-primary" style="width: 5rem; height: 5rem;" role="status"></div></div>
            <h2 id="verify-status" class="card-title h3 fw-bold">Verifying Email...</h2>
            <p id="verify-message" class="card-text text-body-secondary">Please wait a moment while we confirm your verification link.</p>
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

            if (!userId || !secret) {
                throw new Error("Verification link is invalid or incomplete.");
            }

            await account.updateVerification(userId, secret);

            iconEl.innerHTML = `<img src="${checkCircleFill}" alt="Success" class="text-success" style="width: 5rem; height: 5rem;">`;
            statusEl.textContent = "Email Verified!";
            messageEl.innerHTML = `Thank you! Your account is now active. You will be redirected to the login page shortly.`;
            actionBtn.classList.remove('d-none');
            await account.deleteSession('current');
            // After successful verification, clear the URL and redirect to login
            setTimeout(() => {
                window.location.href = `${window.location.origin}/#login`;
            }, 4000);

        } catch (err) {
            iconEl.innerHTML = `<img src="${xCircleFill}" alt="Failure" class="text-danger" style="width: 5rem; height: 5rem;">`;
            statusEl.textContent = "Verification Failed";
            messageEl.textContent = err.message + ". The link may have expired, has already been used, or is invalid.";
            actionBtn.classList.remove('d-none');
        }
    };
    handleVerification();
}

export function renderPendingVerificationPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${hourglassSplit}" alt="Pending approval" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(75%) sepia(50%) saturate(1) hue-rotate(5deg) brightness(1.2);">
                        <h2 class="mt-3 fw-bold">Account Pending Approval</h2>
                        <p class="mb-4 lead">Thank you for signing up and verifying your email. Your account is now waiting to be verified by an administrator. You will be able to access the dashboard once your account is approved.</p>
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
            const container = document.querySelector('.card');
            if (container) {
                container.innerHTML += `<p class="text-danger small mt-3">Failed to log out: ${error.message}</p>`;
            }
        }
    };
}

export function renderCheckEmailPage() {
    app.innerHTML = `
        <div class="container auth-container text-center">
            <div class="row justify-content-center">
                 <div class="col-lg-8 col-xl-7">
                    <div class="card bg-light p-5 shadow-lg">
                        <img src="${envelopeCheckFill}" alt="Check email" class="mx-auto" style="width: 4rem; height: 4rem; filter: invert(48%) sepia(61%) saturate(2371%) hue-rotate(120deg) brightness(94%) contrast(101%);">
                        <h2 class="mt-3 fw-bold">Check Your Inbox!</h2>
                        <p class="mb-4 lead">A verification link has been sent to your @parsu.edu.ph email address. Please click the link inside to activate your account.</p>
                        <a href="#login" class="btn btn-primary" id="buttonBack">Logout</a>
                    </div>
                </div>
            </div>
        </div>`;
    document.getElementById("buttonBack").onclick = async () => {
        try {
            await account.deleteSession('current');
            window.location.hash = 'login';
        } catch (error) {
            const container = document.querySelector('.card');
            if (container) {
                container.innerHTML += `<p class="text-danger small mt-3">Failed to log out: ${error.message}</p>`;
            }
        }
    }
}