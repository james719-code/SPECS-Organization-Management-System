// We now import 'databases' to interact with our collection.
import { account, databases } from '../appwrite.js';

// It's best practice to keep these IDs in a central config, but here is fine for now.
const DATABASE_ID = 'YOUR_DATABASE_ID';
const COLLECTION_ID_STUDENTS = 'student_profiles';

export default function renderAdminPage() {
  const app = document.getElementById('app');
  app.innerHTML = `
    <style>
      #admin-page {
        padding: 1rem 1rem 4rem 1rem; /* Added bottom padding */
        max-width: 1200px;
        margin: 0 auto;
        color: white;
      }
      #admin-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 2rem;
        flex-wrap: wrap;
        gap: 1rem;
      }
      #admin-header h1 {
        margin: 0;
        font-size: 1.8rem;
      }
      #logout-btn {
        padding: 0.6rem 1.2rem;
        font-size: 1rem;
        background-color: #dc3545;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      #logout-btn:hover {
        background-color: #c82333;
      }
      .table-container {
        overflow-x: auto; /* Makes table responsive on mobile */
        border: 1px solid #444;
        border-radius: 8px;
      }
      table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
      }
      th, td {
        padding: 1rem;
        border-bottom: 1px solid #444;
      }
      tr:last-child td {
        border-bottom: none;
      }
      th {
        background-color: #2f2f2f;
      }
      .verify-btn {
        padding: 0.4rem 0.8rem;
        background-color: #28a745;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
        transition: background-color 0.2s;
      }
      .verify-btn:hover {
        background-color: #218838;
      }
      .verify-btn:disabled {
        background-color: #6c757d;
        cursor: not-allowed;
      }
      .status-verified {
        color: #28a745;
        font-weight: bold;
      }
    </style>

    <div id="admin-page">
      <header id="admin-header">
        <h1 id="admin-welcome">Welcome, Admin!</h1>
        <button id="logout-btn">Logout</button>
      </header>

      <h2>User Management</h2>
      <div class="table-container">
        <table>
          <thead>
            <tr>
              <th>Full Name</th>
              <th>Email</th>
              <th>Year/Section</th>
              <th>Gender</th>
              <th>Admin Verified</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody id="user-list-body">
            <!-- User data will be dynamically inserted here -->
          </tbody>
        </table>
      </div>
      <p id="loading-message">Loading users...</p>
    </div>
  `;

  // --- LOGIC ---

  const logoutBtn = document.getElementById('logout-btn');
  const userListBody = document.getElementById('user-list-body');
  const loadingMessage = document.getElementById('loading-message');
  const adminWelcome = document.getElementById('admin-welcome');

  // Fetch current admin's name
  account.get().then(adminUser => {
    adminWelcome.textContent = `Welcome, ${adminUser.name}!`;
  });

  // Logout functionality
  logoutBtn.onclick = async () => {
    try {
      await account.deleteSession('current');
      window.location.hash = 'login';
    } catch (error) {
      alert('Failed to log out: ' + error.message);
    }
  };

  // --- ADJUSTED: Fetch and display all users from the database collection ---
  const loadUsers = async () => {
    try {
      // Use the databases service to list documents from your collection
      const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS);
      
      userListBody.innerHTML = ''; // Clear the table body

      if (response.documents.length === 0) {
        loadingMessage.textContent = 'No student profiles found.';
        return;
      }

      response.documents.forEach(studentProfile => {
        const tr = document.createElement('tr');
        
        // Access data directly from the document attributes
        const isVerified = studentProfile.verified === true;
        const statusText = isVerified ? '<span class="status-verified">✅ Verified</span>' : 'Not Verified';
        const actionButton = isVerified 
          ? '' // If verified, show no button
          : `<button class="verify-btn" data-docid="${studentProfile.$id}">Verify</button>`; // Use document ID

        tr.innerHTML = `
          <td>${studentProfile.fullName}</td>
          <td>${studentProfile.email || 'N/A'}</td>
          <td>${studentProfile.yearLevel}</td>
          <td>${studentProfile.gender}</td>
          <td>${statusText}</td>
          <td>${actionButton}</td>
        `;
        userListBody.appendChild(tr);
      });

      loadingMessage.style.display = 'none';
    } catch (error)
      {
      loadingMessage.textContent = 'Error loading users: ' + error.message;
      console.error(error);
    }
  };

  // --- ADJUSTED: Handle "Verify" button clicks using Event Delegation ---
  userListBody.addEventListener('click', async (e) => {
    if (e.target && e.target.classList.contains('verify-btn')) {
      const button = e.target;
      const docId = button.dataset.docid; // Get the document ID from the button

      button.disabled = true;
      button.textContent = 'Verifying...';

      try {
        // Use the databases service to update the document
        await databases.updateDocument(
            DATABASE_ID, 
            COLLECTION_ID_STUDENTS, 
            docId, 
            { verified: true } // The data payload to update the 'verified' field
        );
        
        // Update the UI without a full reload
        const statusCell = button.parentElement.previousElementSibling;
        statusCell.innerHTML = '<span class="status-verified">✅ Verified</span>';
        button.remove(); // Remove the button after successful verification

      } catch (error) {
        alert('Failed to verify user: ' + error.message);
        button.disabled = false;
        button.textContent = 'Verify';
      }
    }
  });

  // Initial load of users when the page renders
  loadUsers();
}