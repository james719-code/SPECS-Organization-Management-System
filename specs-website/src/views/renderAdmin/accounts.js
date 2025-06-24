// views/renderpages/accounts.js
import { databases } from '../../appwrite.js';
import { Query } from 'appwrite';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

// --- HTML TEMPLATE ---
function getAccountsViewHTML() {
    return `
        <div class="accounts-view-container">
            <h2>User Management</h2>
            <div class="admin-controls">
                <input type="search" id="userSearchInput" placeholder="Search by name, username, or email...">
            </div>
            <div class="table-container">
                <table>
                    <thead>
                        <tr>
                            <th>Full Name</th>
                            <th>Username</th>
                            <th>Email</th>
                            <th>Gender</th>
                            <th>Type</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="user-list-body">
                        <tr><td colspan="7" id="loading-message">Loading users...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachAccountsViewListeners() {
    const userListBody = document.getElementById('user-list-body');
    const searchInput = document.getElementById('userSearchInput');
    let allUsers = []; // To store the fetched users for client-side search

    // --- Renders the list of users into the table ---
    const renderUserList = (users) => {
        userListBody.innerHTML = '';
        if (users.length === 0) {
            userListBody.innerHTML = '<tr><td colspan="7">No users found.</td></tr>';
            return;
        }
        users.forEach(profile => {
            if (profile.type === 'admin') return; // Don't show other admins in the list
            const isVerified = profile.verified === true;
            const statusText = isVerified ? '<span class="status-verified">✅ Accepted</span>' : 'Pending';
            const acceptButton = !isVerified ? `<button class="btn success-btn accept-btn" data-docid="${profile.$id}">Accept</button>` : '';
            const deleteButton = `<button class="btn danger-btn delete-btn" data-docid="${profile.$id}">Delete</button>`;
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${profile.fullname}</td>
                <td>${profile.username}</td>
                <td>${profile.email || 'N/A'}</td>
                <td>${profile.gender}</td>
                <td>${profile.type}</td>
                <td>${statusText}</td>
                <td class="action-cell">${acceptButton}${deleteButton}</td>
            `;
            userListBody.appendChild(tr);
        });
    };

    // --- Fetches users from the database ---
    try {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]);
        allUsers = response.documents;
        renderUserList(allUsers);
    } catch (error) {
        console.error("Failed to load users:", error);
        userListBody.innerHTML = `<tr><td colspan="7" style="color:var(--status-red);">Error loading users.</td></tr>`;
    }

    // --- Search functionality ---
    searchInput.addEventListener('input', (e) => {
        const searchTerm = e.target.value.toLowerCase().trim();
        const filteredUsers = allUsers.filter(user =>
            user.fullname.toLowerCase().includes(searchTerm) ||
            (user.username && user.username.toLowerCase().includes(searchTerm)) ||
            (user.email && user.email.toLowerCase().includes(searchTerm))
        );
        renderUserList(filteredUsers);
    });

    // --- Event delegation for Accept/Delete buttons ---
    userListBody.addEventListener('click', async (e) => {
        const button = e.target.closest('button');
        if (!button) return;
        const docId = button.dataset.docid;
        
        if (button.classList.contains('accept-btn')) {
            button.disabled = true; button.textContent = '...';
            try {
                await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, docId, { verified: true });
                const statusCell = button.parentElement.previousElementSibling;
                statusCell.innerHTML = '<span class="status-verified">✅ Accepted</span>';
                button.remove();
            } catch (error) {
                alert('Failed to accept user: ' + error.message);
                button.disabled = false; button.textContent = 'Accept';
            }
        }

        if (button.classList.contains('delete-btn')) {
            if (!confirm(`Are you sure you want to delete this user's profile?`)) return;
            button.disabled = true; button.textContent = '...';
            try {
                await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, docId);
                button.closest('tr').remove();
                alert('User profile deleted.');
            } catch (error) {
                alert('Failed to delete user profile: ' + error.message);
                button.disabled = false; button.textContent = 'Delete';
            }
        }
    });
}

// --- Main export for the Accounts component ---
export default function renderAccountsView() {
    return {
        html: getAccountsViewHTML(),
        afterRender: attachAccountsViewListeners
    };
}