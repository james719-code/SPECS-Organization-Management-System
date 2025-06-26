// views/verifyEmail.js

import { account } from '../appwrite.js';

export default function renderVerifyEmail() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <style>
      .status-container {
        text-align: center;
        padding: 4rem 1rem;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 80vh;
      }
      .status-container h2 {
        font-size: 2rem;
        margin-bottom: 1rem;
      }
      .status-container p {
        font-size: 1.2rem;
        max-width: 500px;
      }
    </style>
    <div class="status-container">
      <h2 id="verify-status">Verifying your email...</h2>
      <p id="verify-message">Please wait a moment.</p>
    </div>
  `;

  const statusEl = document.getElementById('verify-status');
  const messageEl = document.getElementById('verify-message');

  // This function runs automatically when the page loads
  const handleVerification = async () => {
    try {
      
      const urlParams = new URLSearchParams(window.location.search);
      const userId = urlParams.get('userId');
      const secret = urlParams.get('secret');

      if (!userId || !secret) {
        throw new Error("Verification link is invalid or incomplete.");
      }

      await account.updateVerification(userId, secret);
      
      statusEl.textContent = "✅ Email Verified Successfully!";
      messageEl.innerHTML = `Thank you for verifying your email. You will be redirected to the login page shortly.`;
      
      setTimeout(() => {
        window.location.hash = 'login';
      }, 4000);

    } catch (err) {
      statusEl.textContent = "❌ Verification Failed";
      messageEl.textContent = err.message + ". The link may have expired or already been used. Please try logging in.";
    }
  };
  
  handleVerification();
}