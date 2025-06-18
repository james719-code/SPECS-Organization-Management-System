import { account } from '../appwrite.js';

export default async function renderDashboard() {
  const app = document.getElementById('app');

  try {
    const user = await account.get(); // Fetch current user info

    app.innerHTML = `
      <main class="dashboard-page" style="text-align: center;">
        <h1>Welcome to Your Dashboard</h1>
        <p>You are logged in as:</p>
        <strong>User ID: ${user.$id}</strong>
        <br /><br />
        <a href="#" id="logout-link">Log Out</a>
      </main>
    `;

    document.getElementById('logout-link').addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await account.deleteSession('current');
        window.location.hash = 'login';
      } catch (err) {
        alert('Logout failed: ' + err.message);
      }
    });

  } catch (err) {
    // If no user is logged in, redirect to login
    window.location.hash = 'login';
  }
}
