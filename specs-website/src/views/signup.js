import { account, databases } from '../appwrite.js';
import { ID } from "appwrite"; // Make sure you're using the Web SDK

const COLLECTION_ID_STUDENTS = '685767a8002f47cbef39';
const DATABASE_ID = '685399d600072f4385eb';

export default function renderSignup() {
  const app = document.getElementById('app');

  // The form's inner fields are now wrapped in a div for responsive grid layout
  app.innerHTML = `
    <style>
      /* --- Proper Mobile-First Responsive CSS --- */
      
      /* Apply a universal box-sizing rule for easier layout management */
      #signup-form, #signup-form * {
        box-sizing: border-box;
      }

      /* Base styles for the form container (Mobile View) */
      #signup-form {
        max-width: 500px; /* A fixed max-width is better than a percentage */
        width: 95%;
        margin: 2rem auto;
        padding: 1.5rem;
      }

      #signup-form h1 {
        text-align: center;
        margin-top: 0;
        margin-bottom: 2rem;
      }
      
      /* The grid container's direct children (the input wrappers) */
      .form-grid > div {
        margin-bottom: 1.25rem;
        text-align: left;
      }

      #signup-form label {
        display: block;
        margin-bottom: 0.5rem;
        font-weight: 600;
        color: white;
      }
      
      /* Style all inputs and select boxes consistently */
      #signup-form input, #signup-form select {
        width: 100%; /* Use 100% to fill the container */
        padding: 0.75rem;
        border: 1px solid #ccc;
        border-radius: 4px;
        font-size: 1rem;
      }

      #signup-form input:focus, #signup-form select:focus {
        outline: none;
        border-color: #007bff;
        box-shadow: 0 0 0 3px rgba(0, 123, 255, 0.2);
      }
      
      #signup-form button[type="submit"] {
        width: 100%;
        padding: 0.8rem;
        font-size: 1.1rem;
        font-weight: bold;
        color: white;
        background-color: #007bff;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        margin-top: 1rem;
        transition: background-color 0.2s;
      }
      
      #signup-form button[type="submit"]:hover {
        background-color: #0056b3;
      }

      #signup-form p {
        text-align: center;
        margin-top: 1.5rem;
        font-weight: normal; /* Resetting p to normal weight */
      }

      /* --- Media Query for Desktop View --- */
      /* These styles only apply when the screen width is 768px or more */
      @media (min-width: 768px) {
        #signup-form {
            max-width: 800px; /* Allow the form to be wider on desktops */
            padding: 2.5rem;
            border-radius: 8px;
            background-color: #2f2f2f;
            border: 1px solid #444;
            color: white;
        }

        .container {
          display: flex;
          justify-content: center; /* Center the form horizontally */
          align-items: center; /* Center the form vertically */
          min-height: 100vh; /* Full viewport height */
        }

        .form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr; /* Create two equal-width columns */
          gap: 1.5rem; /* Space between columns and rows */
        }
        
        .form-grid > div {
          margin-bottom: 0; /* The 'gap' property now handles spacing */
        }
      }
    </style>

    <div class="container">

    <form id="signup-form">
      <h1>Create Account</h1>

      <!-- This container will manage the responsive layout -->
      <div class="form-grid">
        <div>
          <label for="name">Full Name</label>
          <input id="name" name="name" type="text" placeholder="e.g., Juan Dela Cruz" required />
        </div>

        <div>
          <label for="username">Username</label>
          <input id="username" name="username" type="text" placeholder="e.g., juan23" required />
        </div>

        <div>
          <label for="email">University Email</label>
          <input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="your-id@parsu.edu.ph" 
            required 
            pattern=".+@parsu\\.edu\\.ph$"
            title="Please use your @parsu.edu.ph email address."
          />
        </div>

        <div>
          <label for="yearLevel">Year / Grade / Section</label>
          <input id="yearLevel" name="yearLevel" type="text" placeholder="e.g., BSIT 4A" required />
        </div>

        <div>
          <!-- ACCESSIBILITY FIX: Changed <p> to <label for="gender"> -->
          <label for="gender">Gender</label>
          <select id="gender" name="gender" required>
            <option value="" disabled selected>-- Select Gender --</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </div>

        <div>
          <label for="password">Password</label>
          <input id="password" name="password" type="password" placeholder="Choose a strong password" required minlength="8" />
        </div>

        <div>
          <label for="password2">Retype Password</label>
          <input id="password2" name="password2" type="password" placeholder="Confirm your password" required />
        </div>
      </div>

      <button type="submit">Sign Up</button>
      <p>Already have an account? <a href="#login">Login</a></p>
    </form>

    </div>
  `;

  const signupForm = document.getElementById('signup-form');
  const submitButton = signupForm.querySelector('button[type="submit"]');

  document.getElementById('signup-form').onsubmit = async (e) => {
    e.preventDefault();

    // Get all form values
    const fullname = e.target.name.value;
    const username = e.target.username.value;
    const email = e.target.email.value;
    const yearLevel = e.target.yearLevel.value;
    const gender = e.target.gender.value;
    const password = e.target.password.value;
    const password2 = e.target.password2.value;

    // --- Start Validation ---
    if (password.length < 8) {
      alert("Password must be at least 8 characters long.");
      return;
    }

    if (password !== password2) {
      alert("Passwords do not match. Please try again.");
      return; // Stop the function execution
    }

    if (!email.endsWith('@parsu.edu.ph')) {
      alert("Invalid email. Please use your official @parsu.edu.ph email.");
      return; // Stop the function execution
    }
    // --- End Validation ---

    submitButton.disabled = true;
    submitButton.textContent = 'Signing Up...';

    //change this later to use the Database Service
    try {
      // 1. Create the user account. We pass 'fullname' here for the account's root name.
      const user = await account.create(ID.unique(), email, password, fullname);

      // 2. Create a session to confirm the user is logged in
      await account.createEmailPasswordSession(email, password);

      // 3. Create a profile document in the 'Student Profiles' collection.
      // The Document ID will be the same as the User's Account ID for easy linking.
      await databases.createDocument(
        DATABASE_ID,
        COLLECTION_ID_STUDENTS,
        user.$id, // Use the new user's ID as the document ID
        {
          // The data payload must match your attributes
          username,
          fullname, // Storing it here in the profile document as well
          yearLevel,
          gender,   // This string value ('male'/'female') matches the Enum
          // We don't need to send 'type' or 'verified' because the database
          // will apply the default values ('student' and false) automatically.
        }
      );

      // 4. Send verification email (this flow remains the same)
      const verificationUrl = window.location.origin + '/#verify-email';
      await account.createVerification(verificationUrl);
      window.location.hash = 'check-email';

    } catch (err) {
      alert(`Signup failed: ${err.message}`);
    }finally{
      submitButton.disabled = false;
      submitButton.textContent = 'Sign Up';
    }
  };
}