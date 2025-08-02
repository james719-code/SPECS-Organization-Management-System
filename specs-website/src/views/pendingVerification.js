import {account} from "../appwrite.js";

export default function renderPendingVerification() {
    const app = document.getElementById('app');
    app.innerHTML = `
        <div class="container d-flex flex-column justify-content-center align-items-center min-vh-100 text-center text-light">
            <div class="card bg-light p-5 shadow-lg" style="max-width: 600px;">
                <h2 class="mb-3"><span class="spinner-border spinner-border-sm text-warning me-2"></span>Account Pending Approval</h2>
                <p class="mb-4">
                    Thank you for signing up and verifying your email.<br/>
                    Your account is now waiting to be verified by an administrator.<br/>
                    You will be able to access the dashboard once your account is approved.
                </p>
                <button id="logout-btn-pending" class="btn btn-secondary w-100 mt-3 text-white" >Logout</button>
            </div>
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
