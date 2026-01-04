// views/login.js
import { app } from '../landing.js';
import { account, databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../../shared/constants.js';

// Check for dev mode
const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

export function renderLoginPage() {
    // Dev mode test accounts panel
    const devPanel = DEV_BYPASS ? `
        <div class="card border-warning mt-4">
            <div class="card-header bg-warning text-dark fw-bold small">
                Dev Test Accounts (Mock Mode)
            </div>
            <div class="card-body p-3">
                <table class="table table-sm table-borderless mb-0 small">
                    <thead>
                        <tr>
                            <th>Role</th>
                            <th>Email</th>
                            <th>Password</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td><span class="badge bg-danger">Admin</span></td>
                            <td>admin@specs.org</td>
                            <td>admin123</td>
                            <td><button type="button" class="btn btn-xs btn-outline-secondary dev-fill-btn" data-email="admin@specs.org" data-password="admin123">Fill</button></td>
                        </tr>
                        <tr>
                            <td><span class="badge bg-primary">Officer</span></td>
                            <td>maria.santos@student.edu</td>
                            <td>officer123</td>
                            <td><button type="button" class="btn btn-xs btn-outline-secondary dev-fill-btn" data-email="maria.santos@student.edu" data-password="officer123">Fill</button></td>
                        </tr>
                        <tr>
                            <td><span class="badge bg-success">Student (Volunteer)</span></td>
                            <td>john.doe@student.edu</td>
                            <td>student123</td>
                            <td><button type="button" class="btn btn-xs btn-outline-secondary dev-fill-btn" data-email="john.doe@student.edu" data-password="student123">Fill</button></td>
                        </tr>
                        <tr>
                            <td><span class="badge bg-secondary">Student (Non-Volunteer)</span></td>
                            <td>mike.johnson@student.edu</td>
                            <td>student456</td>
                            <td><button type="button" class="btn btn-xs btn-outline-secondary dev-fill-btn" data-email="mike.johnson@student.edu" data-password="student456">Fill</button></td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    ` : '';

    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <form id="login-form" novalidate>
                            <div class="text-center mb-4">
                                <h2 class="fw-bold mb-2">Welcome Back</h2>
                                <p class="text-muted small">Sign in to your account</p>
                            </div>
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="email" class="form-label fw-semibold">Email Address</label>
                                    <input id="email" name="email" type="email" class="form-control form-control-lg" placeholder="your-id@parsu.edu.ph" required />
                                </div>
                                <div class="col-12">
                                    <div class="d-flex justify-content-between align-items-center mb-2">
                                        <label for="password" class="form-label fw-semibold mb-0">Password</label>
                                        <a href="#forgot-password" class="small text-decoration-none">Forgot password?</a>
                                    </div>
                                    <input id="password" name="password" type="password" class="form-control form-control-lg" placeholder="Enter your password" required />
                                </div>
                            </div>
                            <div id="status-message" class="text-center small text-danger mt-3" aria-live="polite"></div>
                            <div class="d-grid mt-4">
                               <button type="submit" class="btn btn-primary btn-lg">
                                    <span class="button-text">Sign In</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                               </button>
                            </div>
                            <div class="text-center mt-4">
                                <p class="text-muted small mb-2">Don't have an account? <a href="#signup" class="fw-semibold">Sign up</a></p>
                                <a href="#home" class="text-muted small text-decoration-none">← Back to Home</a>
                            </div>
                        </form>
                        ${devPanel}
                    </div>
                </div>
            </div>
        </div>
    </div>
  `;

    const loginForm = document.getElementById('login-form');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const statusMessageDiv = document.getElementById('status-message');

    // Dev mode fill credentials handlers
    if (DEV_BYPASS) {
        document.querySelectorAll('.dev-fill-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const email = e.target.dataset.email;
                const password = e.target.dataset.password;
                document.getElementById('email').value = email;
                document.getElementById('password').value = password;
                console.log(`[DEV] Filled credentials for ${email}`);
            });
        });
    }

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        submitButton.disabled = true;
        buttonText.textContent = 'Signing in...';
        buttonSpinner.classList.remove('d-none');
        statusMessageDiv.textContent = '';

        try {
            // 1. Create Session (uses mock or real Appwrite based on DEV_BYPASS)
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();

            // 2. Check Email Verification (skip in dev mode - mock users are pre-verified)
            if (!DEV_BYPASS && !user.emailVerification) {
                await account.deleteSession('current');
                throw new Error("Your email has not been verified. Please check your inbox.");
            }

            // 3. Get user type from the user object (mock API returns full user with type)
            const userType = user.type;

            // 4. Route based on user type
            if (userType === 'admin') {
                window.location.href = '/dashboard-admin/';
            } else if (userType === 'officer') {
                window.location.href = '/dashboard-officer/';
            } else if (userType === 'student') {
                window.location.href = '/dashboard-student/';
            } else {
                window.location.hash = 'pending-verification';
            }
        } catch (err) {
            console.error("Login Error:", err);
            statusMessageDiv.textContent = err.message || "Login failed.";

            submitButton.disabled = false;
            buttonText.textContent = 'Sign In';
            buttonSpinner.classList.add('d-none');
        }
    };
}

export function renderForgotPasswordPage() {
    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <form id="forgot-password-form" novalidate>
                            <div class="text-center mb-4">
                                <h2 class="fw-bold mb-2">Reset Password</h2>
                                <p class="text-muted small">Enter your email to receive a password reset link</p>
                            </div>
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="email" class="form-label fw-semibold">Email Address</label>
                                    <input id="email" name="email" type="email" class="form-control form-control-lg" placeholder="your-id@parsu.edu.ph" required />
                                </div>
                            </div>
                            <div id="status-message" class="text-center small mt-3" aria-live="polite"></div>
                            <div class="d-grid mt-4">
                               <button type="submit" class="btn btn-primary btn-lg">
                                    <span class="button-text">Send Reset Link</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                               </button>
                            </div>
                            <div class="text-center mt-4">
                                <p class="text-muted small mb-2">Remember your password? <a href="#login" class="fw-semibold">Sign in</a></p>
                                <a href="#home" class="text-muted small text-decoration-none">← Back to Home</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const forgotForm = document.getElementById('forgot-password-form');
    const submitButton = forgotForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const statusMessageDiv = document.getElementById('status-message');

    forgotForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;

        submitButton.disabled = true;
        buttonText.textContent = 'Sending...';
        buttonSpinner.classList.remove('d-none');
        statusMessageDiv.textContent = '';
        statusMessageDiv.classList.remove('text-danger', 'text-success');

        try {
            const resetUrl = `${window.location.origin}/landing/#reset-password`;
            await account.createRecovery(email, resetUrl);

            statusMessageDiv.classList.add('text-success');
            statusMessageDiv.textContent = 'Password reset link sent! Check your email.';

            setTimeout(() => {
                window.location.hash = 'login';
            }, 3000);
        } catch (err) {
            console.error("Password reset error:", err);
            statusMessageDiv.classList.add('text-danger');
            statusMessageDiv.textContent = err.message || "Failed to send reset link.";

            submitButton.disabled = false;
            buttonText.textContent = 'Send Reset Link';
            buttonSpinner.classList.add('d-none');
        }
    };
}

export function renderResetPasswordPage() {
    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-lg border-0">
                    <div class="card-body p-4 p-md-5">
                        <form id="reset-password-form" novalidate>
                            <div class="text-center mb-4">
                                <h2 class="fw-bold mb-2">Create New Password</h2>
                                <p class="text-muted small">Enter your new password below</p>
                            </div>
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="password" class="form-label fw-semibold">New Password</label>
                                    <input id="password" name="password" type="password" class="form-control form-control-lg" placeholder="At least 8 characters" required minlength="8" />
                                </div>
                                <div class="col-12">
                                    <label for="password2" class="form-label fw-semibold">Confirm Password</label>
                                    <input id="password2" name="password2" type="password" class="form-control form-control-lg" placeholder="Retype your password" required />
                                </div>
                            </div>
                            <div id="status-message" class="text-center small mt-3" aria-live="polite"></div>
                            <div class="d-grid mt-4">
                               <button type="submit" class="btn btn-primary btn-lg">
                                    <span class="button-text">Reset Password</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                               </button>
                            </div>
                            <div class="text-center mt-4">
                                <a href="#login" class="text-muted small text-decoration-none">← Back to Login</a>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    </div>
    `;

    const resetForm = document.getElementById('reset-password-form');
    const submitButton = resetForm.querySelector('button[type="submit"]');
    const buttonText = submitButton.querySelector('.button-text');
    const buttonSpinner = submitButton.querySelector('.spinner-border');
    const statusMessageDiv = document.getElementById('status-message');

    resetForm.onsubmit = async (e) => {
        e.preventDefault();
        const password = e.target.password.value;
        const password2 = e.target.password2.value;

        statusMessageDiv.textContent = '';
        statusMessageDiv.classList.remove('text-danger', 'text-success');

        if (password.length < 8) {
            statusMessageDiv.classList.add('text-danger');
            statusMessageDiv.textContent = "Password must be at least 8 characters long.";
            return;
        }

        if (password !== password2) {
            statusMessageDiv.classList.add('text-danger');
            statusMessageDiv.textContent = "Passwords do not match.";
            return;
        }

        submitButton.disabled = true;
        buttonText.textContent = 'Resetting...';
        buttonSpinner.classList.remove('d-none');

        try {
            const url = new URL(window.location.href);
            const userId = url.searchParams.get('userId');
            const secret = url.searchParams.get('secret');

            if (!userId || !secret) {
                throw new Error("Invalid reset link.");
            }

            await account.updateRecovery(userId, secret, password);

            statusMessageDiv.classList.add('text-success');
            statusMessageDiv.textContent = 'Password reset successful! Redirecting to login...';

            setTimeout(() => {
                window.location.hash = 'login';
            }, 2000);
        } catch (err) {
            console.error("Reset password error:", err);
            statusMessageDiv.classList.add('text-danger');
            statusMessageDiv.textContent = err.message || "Failed to reset password.";

            submitButton.disabled = false;
            buttonText.textContent = 'Reset Password';
            buttonSpinner.classList.add('d-none');
        }
    };
}