// views/pendingVerification.js

import { account } from "../appwrite.js";

export default function renderPendingVerification() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <style>
            .pending-container {
                text-align: center;
                padding: 4rem 1rem;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                min-height: 80vh;
                color: white;
            }
            .pending-container h2 {
                font-size: 2rem;
                margin-bottom: 1rem;
            }
            .pending-container p {
                font-size: 1.2rem;
                max-width: 600px;
                line-height: 1.6;
            }
            .logout-btn-pending {
                margin-top: 2rem;
                padding: 0.8rem 1.5rem;
                font-size: 1rem;
                background-color: #6c757d;
                color: white;
                border: none;
                border-radius: 6px;
                cursor: pointer;
            }
        </style>
        <div class="pending-container">
            <h2>⏳ Account Pending Approval</h2>
            <p>
                Thank you for signing up and verifying your email.
                Your account is now waiting to be verified by an administrator.
                You will be able to access the dashboard once your account is approved.
            </p>
            <button id="logout-btn-pending" class="logout-btn-pending">Logout</button>
        </div>
    `;

    document.getElementById('logout-btn-pending').onclick = async () => {
        try {
            await account.deleteSession('current');
            window.location.hash = 'login';
        } catch (error) {
            alert('Failed to log out: ' + error.message);
        }
    };
}