// renderpages/login.js

import {account, databases} from '../appwrite.js';

const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;

export default function renderLogin() {
    const app = document.getElementById('app');

    app.innerHTML = `
    <div class="container d-flex flex-column justify-content-center" style="min-height: 100vh;">
        <div class="row justify-content-center">
            <div class="col-md-7 col-lg-5 col-xl-4">
                
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="login-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Account Login</h2>
                            
                            <div class="mb-3">
                                <label for="email" class="form-label">Email Address</label>
                                <input id="email" name="email" type="email" class="form-control" placeholder="your-id@parsu.edu.ph" required />
                            </div>
                            
                            <div class="mb-4">
                                <label for="password" class="form-label">Password</label>
                                <input id="password" name="password" type="password" class="form-control" placeholder="Enter your password" required />
                            </div>
                            
                            <div class="d-grid">
                               <button type="submit" class="btn btn-primary">Login</button>
                            </div>

                            <div id="status-message" class="text-center mt-3 text-body-secondary" style="min-height: 5rem; font-family: monospace; white-space: pre; line-height: 1.2;"></div>
                            <p class="text-center small mt-3 mb-0">Don't have an account? <a href="#signup">Sign up</a></p>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    </div>
  `;

    // --- Form Handler with Music Graph Loader ---
    const loginForm = document.getElementById('login-form');
    const submitButton = loginForm.querySelector('button[type="submit"]');
    const statusMessageDiv = document.getElementById('status-message');
    let loaderInterval = null;

    // --- ASCII Music Graph Loader Function ---
    const startLoader = () => {
        const numBars = 20, maxHeight = 4, barChar = '█', emptyChar = ' ';
        statusMessageDiv.classList.remove('text-danger');
        statusMessageDiv.classList.add('text-body-secondary');
        statusMessageDiv.style.whiteSpace = 'pre';

        loaderInterval = setInterval(() => {
            const heights = Array.from({length: numBars}, () => Math.floor(Math.random() * (maxHeight + 1)));
            let output = "Authenticating...\n";
            for (let y = maxHeight; y >= 1; y--) {
                let rowString = "";
                for (let x = 0; x < numBars; x++) {
                    rowString += (heights[x] >= y) ? barChar : emptyChar;
                }
                output += rowString + '\n';
            }
            statusMessageDiv.textContent = output;
        }, 100);
    };

    const stopLoader = () => {
        clearInterval(loaderInterval);
    };

    loginForm.onsubmit = async (e) => {
        e.preventDefault();
        const email = e.target.email.value;
        const password = e.target.password.value;

        statusMessageDiv.textContent = '';
        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Logging in...`;
        startLoader();

        try {
            await account.createEmailPasswordSession(email, password);
            const user = await account.get();

            if (!user.emailVerification) {
                await account.deleteSession('current');
                throw new Error("Your email has not been verified. Please check your inbox for the verification link.");
            }

            const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);

            if (profile.type === 'admin') {
                window.location.hash = 'adminpage';
            } else if (profile.type === 'student' && profile.verified) {
                window.location.hash = 'dashboard';
            } else {
                window.location.hash = 'pending-verification';
            }

        } catch (err) {
            stopLoader();
            statusMessageDiv.textContent = err.message;
            statusMessageDiv.classList.add('text-danger');
            statusMessageDiv.classList.remove('text-body-secondary');
            statusMessageDiv.style.whiteSpace = 'pre-wrap';

            if (err.code !== 401) {
                try {
                    await account.deleteSession('current');
                } catch (_) {
                }
            }
        } finally {
            stopLoader();
            submitButton.disabled = false;
            submitButton.textContent = 'Login';
        }
    };
}