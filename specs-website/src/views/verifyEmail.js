// views/verifyEmail.js

import { account } from '../appwrite.js';

export default function renderVerifyEmail() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="container d-flex flex-column justify-content-center" style="min-height: 100vh;">
      <div class="row justify-content-center">
        <div class="col-md-7 col-lg-5">
          <div class="card shadow-lg text-center">
            <div class="card-body p-4 p-md-5">
              
              <!-- This div will hold the dynamic icon -->
              <div id="verify-icon" class="mb-4">
                 <div class="spinner-border text-primary" style="width: 3.5rem; height: 3.5rem;" role="status">
                    <span class="visually-hidden">Loading...</span>
                 </div>
              </div>

              <h2 id="verify-status" class="card-title h3 fw-bold">Verifying Email...</h2>
              <p id="verify-message" class="card-text text-body-secondary">
                Please wait a moment while we confirm your verification link.
              </p>
              
              <div class="d-grid mt-4">
                <a href="#login" id="verify-action-btn" class="btn btn-primary d-none">Proceed to Login</a>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  const statusEl = document.getElementById('verify-status');
  const messageEl = document.getElementById('verify-message');
  const iconEl = document.getElementById('verify-icon');
  const actionBtn = document.getElementById('verify-action-btn');

  // This function runs automatically when the page loads
  const handleVerification = async () => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');
      const secret = urlParams.get('secret');

      if (!userId || !secret) {
        throw new Error("Verification link is invalid or incomplete. Please try signing up again.");
      }

      await account.updateVerification(userId, secret);

      iconEl.innerHTML = `<i class="bi-check-circle-fill text-success" style="font-size: 4rem;"></i>`;
      statusEl.textContent = "Email Verified!";
      messageEl.innerHTML = `Thank you! Your account is now active. You will be redirected to the login page shortly.`;
      actionBtn.classList.remove('d-none'); // Show the login button

      setTimeout(() => {
        window.location.hash = 'login';
      }, 4000);

    } catch (err) {
      iconEl.innerHTML = `<i class="bi-x-circle-fill text-danger" style="font-size: 4rem;"></i>`;
      statusEl.textContent = "Verification Failed";
      messageEl.textContent = err.message + ". The link may have expired or has already been used. Please try logging in to see if your account is already active.";
      actionBtn.classList.remove('d-none'); // Show the login button
    }
  };

  // Run the verification logic as soon as the component renders
  handleVerification();
}