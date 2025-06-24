import { account, databases } from '../appwrite.js'; // Make sure this uses the Web SDK

const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;

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
        min-height: 90vh;
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

      /* --- UPDATED: Status message for loader and errors --- */
      #status-message {
        color: #9CA3AF; /* Default color for loader text */
        text-align: center;
        margin-top: 1rem;
        min-height: 5rem; /* Reserve space for the loader */
        font-weight: bold;
        font-family: monospace; /* Essential for ASCII art */
        font-size: 1rem;
        line-height: 1.1; /* Make the bars look tighter */
        white-space: pre; /* CRITICAL: Respects newlines and spaces */
      }

      #status-message.error {
        color: #ff4d4d; /* A brighter red for dark backgrounds */
        min-height: 1.2rem; /* Revert height for simple error text */
        white-space: normal; /* Allow error text to wrap */
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

        <div id="status-message"></div>

        <p>Don't have an account? <a href="#signup">Sign up</a></p>
      </form>
    </main>
  `;

  // --- Form Handler with Music Graph Loader ---
  
  const loginForm = document.getElementById('login-form');
  const submitButton = loginForm.querySelector('button[type="submit"]');
  const statusMessageDiv = document.getElementById('status-message');
  let loaderInterval = null;

  // --- ASCII Music Graph Loader Function ---
  const startLoader = () => {
    // --- Configurable Parameters ---
    const numBars = 20;    // How many bars in the visualizer
    const maxHeight = 4;   // Max height of a bar in characters
    const barChar = '█';   // The character used to draw the bar
    const emptyChar = ' '; // The character for empty space above the bar

    // --- Prepare the container ---
    statusMessageDiv.classList.remove('error'); // Ensure it's not styled as an error
    
    loaderInterval = setInterval(() => {
      // 1. Generate an array of random heights for the current animation frame
      const heights = Array.from({ length: numBars }, () => Math.floor(Math.random() * (maxHeight + 1)));

      let output = "Authenticating...\n"; // The text to display above the visualizer

      // 2. Build the visualizer string from the top row down
      for (let y = maxHeight; y >= 1; y--) {
        let rowString = "";
        for (let x = 0; x < numBars; x++) {
          // If the bar at this position is tall enough to reach the current row, draw it
          rowString += (heights[x] >= y) ? barChar : emptyChar;
        }
        output += rowString + '\n'; // Add the completed row and a newline
      }

      // 3. Update the DOM with the new frame
      statusMessageDiv.textContent = output;
      
    }, 100); // Animation speed (100ms = 10 frames per second)
  };

  // --- Stop Loader and Clear ---
  const stopLoader = () => {
    clearInterval(loaderInterval);
  };

  loginForm.onsubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;
    
    // --- Start UI loading state ---
    statusMessageDiv.textContent = '';
    submitButton.disabled = true;
    submitButton.textContent = 'Logging in...';
    startLoader(); // Start the ASCII animation

    try {
      // 1. Login user
      await account.createEmailPasswordSession(email, password);
      
      // 2. Get user data
      const user = await account.get();

      // 3. Check email verification
      if (!user.emailVerification) {
        await account.deleteSession('current'); 
        throw new Error("Your email has not been verified. Please check your inbox.");
      }

      // 4. Check admin verification status from profile
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);
      
      // 5. Redirect based on profile status
      if (profile.type === 'admin') {
        window.location.hash = 'adminpage';
      } else if (profile.type === 'student' && profile.verified) {
        window.location.hash = 'dashboard';
      } else {
        window.location.hash = 'pending-verification';
      }

    } catch (err) {
      stopLoader(); // Stop animation before showing error
      statusMessageDiv.textContent = err.message;
      statusMessageDiv.classList.add('error'); 

      if (err.code !== 401) {
          try { await account.deleteSession('current'); } catch (_) {}
      }
    } finally {
      // This will only fully run if an error occurs, otherwise the redirect happens first.
      // But it's good practice to have it.
      stopLoader(); 
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
  };
}