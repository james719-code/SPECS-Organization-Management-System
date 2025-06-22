// This component doesn't need any Appwrite services, it's purely informational.

export default function renderCheckEmailPage() {
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
        color: white;
      }
      .status-container h2 {
        font-size: 2.2rem;
        margin-bottom: 1.5rem;
      }
      .status-container .icon {
          font-size: 4rem;
          margin-bottom: 2rem;
          color: #007bff;
      }
      .status-container p {
        font-size: 1.2rem;
        max-width: 600px;
        line-height: 1.6;
        color: #ccc;
      }
      .status-container a {
        margin-top: 2rem;
        display: inline-block;
        padding: 0.8rem 1.5rem;
        background-color: #007bff;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        font-weight: bold;
        transition: background-color 0.2s;
      }
      .status-container a:hover {
          background-color: #0056b3;
      }
    </style>
    <div class="status-container">
        <div class="icon">📧</div>
        <h2>Check Your Inbox!</h2>
        <p>
            We've sent a verification link to your email address.
        </p>
        <p>
            Please click the link in that email to activate your account. If you don't see it, be sure to check your spam or junk folder.
        </p>
        <a href="#login">Return to Login</a>
    </div>
  `;
}