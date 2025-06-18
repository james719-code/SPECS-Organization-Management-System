import { account } from '../appwrite.js'; // Make sure this uses the Web SDK

export default function renderLogin() {
  const app = document.getElementById('app');

  app.innerHTML = `
    <main class="login-page">
      <h2>Login to SPECS</h2>
      <form id="login-form">
        <input name="email" type="email" placeholder="Email" required />
        <input name="password" type="password" placeholder="Password" required />
        <button type="submit">Login</button>
        <p>Don't have an account? <a href="#signup">Sign up</a></p>
      </form>
    </main>
  `;

  // Login form handler
  document.getElementById('login-form').onsubmit = async (e) => {
    e.preventDefault();

    const email = e.target.email.value;
    const password = e.target.password.value;

    try {
      // Log in user (create session)
      await account.createEmailPasswordSession(email, password);
      // Redirect to dashboard or home
      window.location.hash = 'dashboard';
    } catch (err) {
      alert(`Login failed: ${err.message}`);
    }
  };
}
