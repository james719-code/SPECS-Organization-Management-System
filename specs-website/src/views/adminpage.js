// views/adminpage.js
import { account, databases } from '../appwrite.js';
import renderSettingsView from './renderpages/settings.js';
import renderAccountsView from './renderAdmin/accounts.js'; // <-- Import the new component

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

// --- MAIN ADMIN PAGE RENDER FUNCTION ---
export default async function renderAdminPage() {
    const app = document.getElementById('app');

    try {
        const adminUser = await account.get();
        const adminProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, adminUser.$id);

        // --- Render the main responsive layout shell ---
        app.innerHTML = `
            <style>
                /* --- SHARED LAYOUT & THEME STYLES (from dashboard.js) --- */
                :root {
                  --bg-dark: #111827; --surface-dark: #1F2937; --border-dark: #374151;
                  --text-primary: #F9FAFB; --text-secondary: #9CA3AF;
                  --accent-blue: #3B82F6; --accent-blue-hover: #2563EB;
                  --status-red: #EF4444; --status-red-hover: #B91C1C;
                  --status-green: #22C55E; --status-green-hover: #16A34A;
                }
                .admin-layout, .admin-layout * { box-sizing: border-box; font-family: 'Inter', sans-serif; }
                .admin-layout { display: grid; grid-template-columns: 250px 1fr; grid-template-rows: auto 1fr; grid-template-areas: "drawer header" "drawer content"; min-height: 100vh; color: var(--text-primary); height: 100vh; overflow: hidden; }
                .dashboard-header { grid-area: header; display: flex; align-items: center; gap: 1rem; padding: 1rem 1.5rem; background-color: var(--surface-dark); border-bottom: 1px solid var(--border-dark); }
                .dashboard-header h1 { margin: 0; font-size: 1.25rem; font-weight: 600; }
                #mobile-menu-toggle { display: none; background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer; }
                #logout-btn { background-color: transparent; color: var(--text-secondary); border: none; padding: 0.5rem; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: background-color 0.2s, color 0.2s; margin-left: auto; }
                #logout-btn:hover { background-color: var(--border-dark); color: var(--text-primary); }
                #logout-btn svg { width: 22px; height: 22px; }
                .nav-drawer { grid-area: drawer; background-color: var(--surface-dark); padding: 1rem 0; border-right: 1px solid var(--border-dark); display: flex; flex-direction: column; }
                .nav-drawer .nav-title { padding: 0.5rem 1.5rem; font-size: 1.5rem; font-weight: 700; margin-bottom: 1rem; }
                .nav-drawer ul { list-style: none; padding: 0; margin: 0; }
                .nav-drawer a { display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1.5rem; color: var(--text-secondary); text-decoration: none; font-weight: 500; border-left: 3px solid transparent; transition: all 0.2s ease; }
                .nav-drawer a:hover { background-color: var(--bg-dark); color: var(--text-primary); }
                .nav-drawer a.active { border-left-color: var(--accent-blue); background-color: var(--bg-dark); color: var(--text-primary); }
                .nav-drawer svg { width: 20px; height: 20px; }
                #admin-content { grid-area: content; padding: 2rem; overflow-y: auto; }

                /* --- ADMIN-SPECIFIC STYLES FOR SUB-VIEWS --- */
                .admin-controls { margin-bottom: 1.5rem; }
                #userSearchInput { width: 100%; max-width: 400px; padding: 0.8rem 1.2rem; font-size: 1rem; background-color: var(--bg-dark); border: 1px solid var(--border-dark); color: var(--text-primary); border-radius: 6px; }
                .table-container { overflow-x: auto; border: 1px solid var(--border-dark); border-radius: 8px; background-color: var(--surface-dark); }
                table { width: 100%; border-collapse: collapse; text-align: left; }
                th, td { padding: 1rem; border-bottom: 1px solid var(--border-dark); }
                tr:last-child td { border-bottom: none; }
                th { background-color: var(--bg-dark); }
                .btn { display: inline-flex; align-items: center; justify-content: center; font-weight: 600; font-size: 0.8rem; padding: 0.5rem 1rem; border-radius: 6px; border: none; cursor: pointer; transition: all 0.2s; }
                .success-btn { background-color: var(--status-green); color: white; }
                .danger-btn { background-color: var(--status-red); color: white; }
                .btn:disabled { background-color: #6c757d; cursor: not-allowed; opacity: 0.7; }
                .status-verified { color: var(--status-green); font-weight: bold; }
                .action-cell { display: flex; gap: 0.5rem; }
                
                /* --- MOBILE RESPONSIVENESS --- */
                @media (max-width: 768px) {
                  .admin-layout { grid-template-columns: 1fr; grid-template-areas: "header" "content"; }
                  #mobile-menu-toggle { display: block; }
                  .nav-drawer { position: fixed; top: 0; left: 0; bottom: 0; width: 250px; transform: translateX(-100%); transition: transform 0.3s ease-in-out; z-index: 1000; }
                  .admin-layout.drawer-open .nav-drawer { transform: translateX(0); }
                  .admin-layout.drawer-open::before { content: ''; position: fixed; inset: 0; background-color: rgba(0,0,0,0.5); z-index: 999; }
                }
            </style>

            <div class="admin-layout">
                <nav class="nav-drawer">
                    <div class="nav-title">ADMIN</div>
                    <ul>
                        <li><a href="#" data-view="accounts" class="active">
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21a6 6 0 00-9-5.197m0 0A5.995 5.995 0 0012 12a5.995 5.995 0 00-3-5.197M15 21a2 2 0 002-2v-1a2 2 0 00-2-2h-2a2 2 0 00-2 2v1a2 2 0 002 2h2zm-3-9a2 2 0 00-2 2v1a2 2 0 002 2h2a2 2 0 002-2v-1a2 2 0 00-2-2h-2z"/></svg>
                            <span>Accounts</span>
                        </a></li>
                        <li><a href="#" data-view="settings">
                             <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <span>Settings</span>
                        </a></li>
                    </ul>
                </nav>
                <header class="dashboard-header">
                    <button id="mobile-menu-toggle">☰</button>
                    <h1>Admin Panel</h1>
                    <button id="logout-btn" title="Logout">
                        <svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                    </button>
                </header>
                <main id="admin-content"></main>
            </div>
        `;

        const contentEl = document.getElementById('admin-content');
        const navLinks = document.querySelectorAll('.nav-drawer a');
        const layoutEl = document.querySelector('.admin-layout');
        const mobileMenuToggle = document.getElementById('mobile-menu-toggle');

        const renderContent = (viewName) => {
            navLinks.forEach(link => link.classList.remove('active'));
            document.querySelector(`.nav-drawer a[data-view="${viewName}"]`)?.classList.add('active');

            switch (viewName) {
                case 'accounts':
                    const accountsView = renderAccountsView();
                    contentEl.innerHTML = accountsView.html;
                    accountsView.afterRender();
                    break;
                case 'settings':
                    const settingsView = renderSettingsView(adminUser, adminProfile);
                    contentEl.innerHTML = settingsView.html;
                    settingsView.afterRender();
                    break;
                default:
                    const defaultView = renderAccountsView();
                    contentEl.innerHTML = defaultView.html;
                    defaultView.afterRender();
            }
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                renderContent(e.currentTarget.dataset.view);
                layoutEl.classList.remove('drawer-open'); // Close drawer on selection
            });
        });

        mobileMenuToggle.addEventListener('click', () => layoutEl.classList.toggle('drawer-open'));
        document.getElementById('logout-btn').addEventListener('click', async () => {
            await account.deleteSession('current');
            window.location.hash = 'login';
        });

        renderContent('accounts'); // Initial render

    } catch (err) {
        console.error("Failed to render admin page:", err);
        app.innerHTML = `<h1>Access Denied</h1><p>You do not have permission to view this page. Redirecting...</p>`;
        await account.deleteSession('current').catch(() => {});
        setTimeout(() => { window.location.hash = 'login'; }, 2000);
    }
}