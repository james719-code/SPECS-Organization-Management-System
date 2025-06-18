import { account } from '../appwrite.js';
import { ID } from "appwrite" // Make sure you're using the Web SDK

export default function renderSignup() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <h1>Signup Page</h1>
    <form id="signup-form">
      <input name="username" type="text" placeholder="Username" required />
      <input name="email" type="email" placeholder="Email" required />
      <input name="password" type="password" placeholder="Password" required />
      <button type="submit">Sign Up</button>
      <p>Already have an account? <a href="#login">Login</a></p>
    </form>
  `;

  document.getElementById('signup-form').onsubmit = async (e) => {
    e.preventDefault();

    const name = e.target.username.value;
    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      // 1. Create user account
      await account.create(ID.unique(), email, password, name);

      // 2. Auto-login user
      await account.createEmailPasswordSession(email, password);

      // 3. Redirect to dashboard
      window.location.hash = 'dashboard';
    } catch (err) {
      alert(`Signup failed: ${err.message}`);
    }
  };
}
