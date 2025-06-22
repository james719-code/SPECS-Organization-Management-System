import { account, databases } from '../appwrite.js'; // Make sure this uses the Web SDK

const COLLECTION_ID_STUDENTS = '685767a8002f47cbef39';
const DATABASE_ID = '685399d600072f4385eb';

export default function renderLogin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <style>
      /* --- Login Form Styles (Mobile First) --- */
      
      #login-form-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-height: 90vh; /* Changed from 100vh for a bit of space */
        padding: 1rem;
      }

      #login-form {
        max-width: 420px;
        width: 100%;
        padding: 1.5rem;
        border-radius: 8px;
        box-sizing: border-box;
      }
      
      #login-form h2 {
        text-align: center;
        margin-top: 0;
        margin-bottom: 2rem;
        font-size: 1.8rem;
        color: white;
      }
      
      .form-field {
        margin-bottom: 1.5rem;
      }

      #login-form label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: #e0e0e0;
      }
      
      #login-form input {
        width: 100%;
        padding: 0.75rem;
        border-radius: 4px;
        font-size: 1rem;
        box-sizing: border-box;
        background-color: #3a3a3a;
        border: 1px solid #555;
        color: white;
      }

      #login-form input:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
      }
      
      #login-form button[type="submit"] {
        width: 100%;
        padding: 0.8rem;
        font-size: 1.1rem;
        font-weight: bold;
        color: white;
        background-color: #007bff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      
      #login-form button[type="submit"]:hover:not(:disabled) {
        background-color: #0056b3;
      }

      #login-form button[type="submit"]:disabled {
        background-color: #007bff;
        opacity: 0.7;
        cursor: not-allowed;
      }

      #login-form p {
        text-align: center;
        margin-top: 1.5rem;
        color: #ccc;
      }

      #error-message {
        color: #ff4d4d; /* A brighter red for dark backgrounds */
        text-align: center;
        margin-top: 1rem;
        min-height: 1.2rem;
        font-weight: bold;
      }

      /* --- MEDIA QUERY FOR LARGER SCREENS --- */
      @media (min-width: 768px) {
        #login-form {
            padding: 2.5rem;
            background-color: #2f2f2f;
            border: 1px solid #444;
        }

        #login-form h2 {
            font-size: 2.2rem;
        }
      }
    </style>

    <main id="login-form-container">
      <form id="login-form">
        <h2>Login</h2>
        <div class="form-field">
          <label for="email">Email</label>
          <input id="email" name="email" type="email" placeholder="your-id@parsu.edu.ph" required />
        </div>
        <div class="form-field">
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Enter your password" required />
        </div>
        
        <button type="submit">Login</button>

        <div id="error-message"></div>

        <p>Don't have an account? <a href="#signup">Sign up</a></p>
      </form>
    </main>
  `;

  // --- Form Handler with Conditional Redirection ---
  
  const loginForm = document.getElementById('login-form');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const errorMessageDiv = document.getElementById('error-message');

  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    
    errorMessageDiv.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';

    try {
      // 1. Log in the user to create a session
      await account.createEmailPasswordSession(email, password);
      
      // 2. Get the current user's data to check their email verification status
      const user = await account.get();

      // 3. IMPORTANT: Check if the user's *email* is verified
      if (!user.emailVerification) {
        await account.deleteSession('current'); 
        throw new Error("Your email has not been verified. Please check your inbox for the verification link.");
      }

      // 4. *** NEW LOGIC: Check admin verification status from the database ***
      // We fetch the user's corresponding profile document.
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);
      
      // 5. Redirect based on type and verification status
      if (profile.type === 'admin') {
        // Admins can go directly to their page
        window.location.hash = 'adminpage';
      } else if (profile.type === 'student' && profile.verified) {
        // A student who HAS been verified by an admin
        window.location.hash = 'dashboard';
      } else {
        // Any other case (e.g., a student who is NOT verified by an admin)
        window.location.hash = 'pending-verification';
      }

    } catch (err) {
      errorMessageDiv.textContent = err.message;
      // It's good practice to ensure the session is cleared if any error occurs after login
      if (err.code !== 401) { // 401 is a login failure, no session was created
          try { await account.deleteSession('current'); } catch (_) {}
      }
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
  };
}