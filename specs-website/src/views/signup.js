// renderpages/signup.js

import { account, databases } from '../appwrite.js';
import { ID } from "appwrite";

const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;

export default function renderSignup() {
    const app = document.getElementById('app');

    const yearLevelOptions = ['1A', '1B', '2A', '2B', '3A', '3B', '4A', '4B']
        .map(section => `<option value="BSCS ${section}">BSCS ${section}</option>`)
        .join('');

    app.innerHTML = `
    <div class="container d-flex flex-column justify-content-center py-5">
        <div class="row justify-content-center">
            <div class="col-md-8 col-lg-7 col-xl-6">
                
                <div class="card shadow-lg">
                    <div class="card-body p-4 p-md-5">
                        <form id="signup-form" novalidate>
                            <h2 class="text-center fw-bold mb-4">Create Account</h2>
                            
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label for="name" class="form-label">Full Name</label>
                                    <input id="name" name="name" type="text" class="form-control" placeholder="e.g., Juan Dela Cruz" required />
                                </div>

                                <div class="col-md-6">
                                    <label for="username" class="form-label">Username</label>
                                    <input id="username" name="username" type="text" class="form-control" placeholder="e.g., juan23" required />
                                </div>

                                <div class="col-12">
                                    <label for="email" class="form-label">University Email</label>
                                    <input 
                                        id="email" 
                                        name="email" 
                                        type="email" 
                                        class="form-control"
                                        placeholder="your-id@parsu.edu.ph" 
                                        required 
                                        pattern=".+@parsu\\.edu\\.ph$"
                                        title="Please use your @parsu.edu.ph email address."
                                    />
                                </div>

                                <div class="col-md-6">
                                    <label for="yearLevel" class="form-label">Year & Section</label>
                                    <select id="yearLevel" name="yearLevel" class="form-select" required>
                                        <option value="" disabled selected>-- Select your section --</option>
                                        ${yearLevelOptions}
                                    </select>
                                </div>

                                <div class="col-md-6">
                                    <label for="gender" class="form-label">Gender</label>
                                    <select id="gender" name="gender" class="form-select" required>
                                        <option value="" disabled selected>-- Select Gender --</option>
                                        <option value="male">Male</option>
                                        <option value="female">Female</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>

                                <div class="col-md-6">
                                    <label for="password" class="form-label">Password</label>
                                    <input id="password" name="password" type="password" class="form-control" placeholder="At least 8 characters" required minlength="8" />
                                </div>

                                <div class="col-md-6">
                                    <label for="password2" class="form-label">Retype Password</label>
                                    <input id="password2" name="password2" type="password" class="form-control" placeholder="Confirm your password" required />
                                </div>
                            </div>

                            <div class="d-grid mt-4">
                                <button type="submit" class="btn btn-primary">Sign Up</button>
                            </div>

                            <p class="text-center small mt-4 mb-0">Already have an account? <a href="#login">Login here</a></p>
                        </form>
                    </div>
                </div>

            </div>
        </div>
    </div>
  `;

    const signupForm = document.getElementById('signup-form');
    const submitButton = signupForm.querySelector('button[type="submit"]');

    signupForm.onsubmit = async (e) => {
        e.preventDefault();

        const fullname = e.target.name.value;
        const username = e.target.username.value;
        const email = e.target.email.value;
        const yearLevel = e.target.yearLevel.value;
        const gender = e.target.gender.value;
        const password = e.target.password.value;
        const password2 = e.target.password2.value;

        if (password.length < 8) {
            alert("Password must be at least 8 characters long.");
            return;
        }
        if (password !== password2) {
            alert("Passwords do not match. Please try again.");
            return;
        }
        if (!email.endsWith('@parsu.edu.ph')) {
            alert("Invalid email. Please use your official @parsu.edu.ph email address.");
            return;
        }

        submitButton.disabled = true;
        submitButton.innerHTML = `<span class="spinner-border spinner-border-sm me-2"></span>Signing Up...`;

        try {
            const user = await account.create(ID.unique(), email, password, fullname);
            await account.createEmailPasswordSession(email, password);

            await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID_STUDENTS,
                user.$id,
                {
                    username,
                    fullname,
                    yearLevel,
                    gender,
                    verified: false,
                    type: 'student',
                    haveResume: false,
                    resumeId: '',
                    haveSchedule: false,
                    scheduleId: ''
                }
            );

            const verificationUrl = `${window.location.origin}/#verify-email`;
            await account.createVerification(verificationUrl);

            window.location.hash = 'check-email';

        } catch (err) {
            alert(`Signup failed: ${err.message}`);
        } finally {
            submitButton.disabled = false;
            submitButton.innerHTML = 'Sign Up';
        }
    };
}