// views/adminpage.js

// --- IMPORTS ---
import { account, databases } from '../appwrite.js';
import { Offcanvas, Dropdown } from 'bootstrap';

// Import all admin sub-views
import renderAdminDashboardView from './renderAdmin/dashboard.js';
import renderAccountsView from './renderAdmin/accounts.js';
import renderEventsTimelineView from './renderAdmin/events.js';
import renderUploadedFilesView from './renderAdmin/files.js';
import renderSettingsView from './renderpages/settings.js';

// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

// --- MAIN ADMIN PAGE RENDER FUNCTION ---
export default async function renderAdminPage() {
    const app = document.getElementById('app');

    try {
        const adminUser = await account.get();
        const adminProfile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, adminUser.$id);

        app.innerHTML = `
            <div class="d-flex" style="min-height: 100vh;">
                <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3 bg-primary" style="width: 280px;" tabindex="-1" id="admin-sidebar">
                    <div class="d-flex align-items-center mb-3 me-md-auto text-white text-decoration-none">
                        <i class="bi-shield-lock-fill fs-4 me-2"></i>
                        <span class="fs-4 fw-bold">ADMIN PANEL</span>
                    </div>
                    <hr>
                    <ul class="nav nav-pills flex-column">
                        <li><a href="#" class="nav-link" data-view="dashboard"><i class="bi-grid-1x2-fill me-2"></i>Dashboard</a></li>
                        <li><a href="#" class="nav-link" data-view="accounts"><i class="bi-people-fill me-2"></i>Accounts</a></li>
                        <li><a href="#" class="nav-link" data-view="events"><i class="bi-calendar3 me-2"></i>Events Timeline</a></li>
                        <li><a href="#" class="nav-link" data-view="files"><i class="bi-file-earmark-arrow-up-fill me-2"></i>Uploaded Files</a></li>
                        <li><a href="#" class="nav-link" data-view="settings"><i class="bi-gear-fill me-2"></i>Settings</a></li>
                    </ul>
                    
                    <!-- Admin User Menu -->
                    <div class="dropdown mt-auto">
                        <hr>
                        <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle p-2 rounded-2" data-bs-toggle="dropdown" aria-expanded="false">
                          <i class="bi-person-circle fs-4 me-2"></i>
                          <strong>${adminProfile.username || 'Admin'}</strong>
                        </a>
                        <ul class="dropdown-menu dropdown-menu-dark text-small shadow">
                          <li><a class="dropdown-item" href="#" data-view="settings"><i class="bi-gear-fill me-2"></i>Settings</a></li>
                          <li><hr class="dropdown-divider"></li>
                          <li><a class="dropdown-item text-danger fw-bold" href="#" id="logout-btn"><i class="bi-box-arrow-right me-2"></i>Sign out</a></li>
                        </ul>
                    </div>
                </aside>

                <!-- Main Content Wrapper -->
                <div class="flex-grow-1" style="overflow-y: auto; height: 100vh;">
                    <header class="navbar d-lg-none">
                        <div class="container-fluid"><a class="navbar-brand" href="#">Admin Panel</a><button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#admin-sidebar" aria-controls="admin-sidebar"><span class="navbar-toggler-icon"></span></button></div>
                    </header>
                    <main id="admin-content" class="p-4" style="background-color: var(--bs-body-bg);"></main>
                </div>
            </div>
        `;

        const contentEl = document.getElementById('admin-content');
        const navLinks = document.querySelectorAll('#admin-sidebar [data-view]');
        const sidebar = document.getElementById('admin-sidebar');
        const sidebarInstance = Offcanvas.getOrCreateInstance(sidebar);
        const adminDropdown = new Dropdown(document.querySelector('.dropdown-toggle'));

        navLinks.forEach(link => link.classList.add('text-white'));

        const renderContent = (viewName) => {
            contentEl.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

            navLinks.forEach((link) => {
                link.classList.remove("active");
                if (link.classList.contains('nav-link')) {
                    link.style.backgroundColor = 'transparent';
                }
            });
            const activeLink = document.querySelector(`#admin-sidebar [data-view="${viewName}"]`);
            if (activeLink) {
                activeLink.classList.add("active");
                if (activeLink.classList.contains('nav-link')) {
                    activeLink.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
            }

            switch (viewName) {
                case 'dashboard':
                    const dashboardView = renderAdminDashboardView();
                    contentEl.innerHTML = dashboardView.html;
                    dashboardView.afterRender();
                    break;
                case 'accounts':
                    const accountsView = renderAccountsView();
                    contentEl.innerHTML = accountsView.html;
                    accountsView.afterRender();
                    break;
                case 'events':
                    const eventsView = renderEventsTimelineView();
                    contentEl.innerHTML = eventsView.html;
                    eventsView.afterRender();
                    break;
                case 'files':
                    const filesView = renderUploadedFilesView();
                    contentEl.innerHTML = filesView.html;
                    filesView.afterRender();
                    break;
                case 'settings':
                    const settingsView = renderSettingsView(adminUser, adminProfile);
                    contentEl.innerHTML = settingsView.html;
                    settingsView.afterRender();
                    break;
                default:
                    const defaultView = renderAdminDashboardView(); // Default to dashboard
                    contentEl.innerHTML = defaultView.html;
                    defaultView.afterRender();
            }
        };

        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                renderContent(e.currentTarget.dataset.view);
                if (sidebar.classList.contains('show')) {
                    sidebarInstance.hide();
                }
            });
        });

        document.getElementById('logout-btn').addEventListener('click', async (e) => {
            e.preventDefault();
            await account.deleteSession('current');
            window.location.hash = 'login';
        });

        renderContent('dashboard');

    } catch (err) {
        // ... (error handling is unchanged)
    }
}