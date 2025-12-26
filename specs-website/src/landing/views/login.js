// views/login.js
import { app } from '../landing.js';
import { account, databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../../shared/constants.js';

export function renderLoginPage() {
    app.innerHTML = `
    <div class="container auth-container">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="login-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Login Account</h2>
                            <div class="row g-3">
                                <div class="col-12">
                                    <label for="email" class="form-label">Email Address</label>
                                    <input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required />
                                </div>
                                <div class="col-12">
                                    <label for="password" class="form-label">Password</label>
                                    <input id="password" name="password" type="password" class="form-control" placeholder="Enter your password" required />
                                </div>
                            </div>
                            <div id="status-message" class="text-center small text-danger mt-3" aria-live="polite"></div>
                            <div class="d-grid mt-4">
                               <button type="submit" class="btn btn-primary">
                                    <span class="button-text">Login</span>
                                    <span class="spinner-border spinner-border-sm d-none" role="status" aria-hidden="true"></span>
                               </button>
                            </div>
                            <p class="text-center small mt-4 mb-0">Don't have an account? <a href="#signup">Sign up</a></p>
                            <p class="text-center small mt-2 mb-0"><a href="#home">Back to Home</a></p>
                        </form>
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

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        submitButton.disabled = true;
        buttonText.textContent = 'Authenticating...';
        buttonSpinner.classList.remove('d-none');
        statusMessageDiv.textContent = '';

        try {
            // 1. Create Session
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();

            // 2. Check Email Verification
            if (!user.emailVerification) {
                // If email isn't verified, we MUST logout immediately
                await account.deleteSession('current');
                throw new Error("Your email has not been verified. Please check your inbox.");
            }

            // 3. Get User Profile Role
            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);

            // 4. Route based on status
            if (profile.type === 'admin') {
                window.location.href = '/dashboard-admin/';
            }else if(profile.type === 'officer'){
                window.location.href = '/dashboard-officer/';
            }else if (profile.type === 'student' && profile.verified) {
                window.location.href = '/dashboard-student/';
            } else {
                window.location.hash = 'pending-verification';
            }
        } catch (err) {
            console.error("Login Error:", err);
            statusMessageDiv.textContent = err.message || "Login failed.";

            // Only reset button if we aren't redirecting
            if (!window.location.hash.includes('pending-verification') && !window.location.href.includes('dashboard')) {
                submitButton.disabled = false;
                buttonText.textContent = 'Login';
                buttonSpinner.classList.add('d-none');
            }
        }
    };
}