// dashboardAdmin.js

import './dashboardAdmin.scss';
import '../guard/auth.js';

// Appwrite SDK and Bootstrap components
import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from "../shared/constants.js";
import { Offcanvas, Dropdown } from 'bootstrap';

// --- Admin View Modules ---
import renderAdminDashboardView from './views/dashboard.js';
import renderAccountsView from './views/accounts.js';
import renderEventsTimelineView from './views/events.js';
import renderUploadedFilesView from './views/files.js';

// --- SVG Icon Imports ---
import shieldLockFill from 'bootstrap-icons/icons/shield-lock-fill.svg';
import grid1x2Fill from 'bootstrap-icons/icons/grid-1x2-fill.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import folderFill from 'bootstrap-icons/icons/folder-fill.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg';

export default async function renderDashboardAdmin() {
    const app = document.getElementById("app");

    try {
        const user = await account.get();
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);

        if (profile.type !== 'admin') {
            console.error("Access Denied: User is not an admin.");
            window.location.href = "/landing/#login";
            return;
        }

        app.innerHTML = `
      <div class="d-flex" style="min-height: 100vh;">
        <!-- Sidebar -->
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3 bg-dark text-white" style="width: 280px;" tabindex="-1" id="adminSidebar">
          <a href="#" class="d-flex align-items-center mb-3 me-md-auto text-white text-decoration-none">
            <img src="${shieldLockFill}" alt="Admin" class="me-2" style="width: 1.5rem; height: 1.5rem; filter: invert(1);">
            <span class="fs-4 fw-bold">Admin Panel</span>
          </a>
          <hr>
          <ul class="nav nav-pills flex-column mb-auto">
            <li class="nav-item">
              <a href="#" class="nav-link text-white" data-view="dashboard">
                <img src="${grid1x2Fill}" alt="Dashboard" class="me-2" style="width: 1.2em; height: 1.2em; filter: invert(1);">Dashboard
              </a>
            </li>
            <li>
              <a href="#" class="nav-link text-white" data-view="accounts">
                <img src="${peopleFill}" alt="Accounts" class="me-2" style="width: 1.2em; height: 1.2em; filter: invert(1);">Accounts
              </a>
            </li>
            <li>
              <a href="#" class="nav-link text-white" data-view="events">
                <img src="${calendarEventFill}" alt="Events" class="me-2" style="width: 1.2em; height: 1.2em; filter: invert(1);">Events
              </a>
            </li>
            <li>
              <a href="#" class="nav-link text-white" data-view="files">
                <img src="${folderFill}" alt="Files" class="me-2" style="width: 1.2em; height: 1.2em; filter: invert(1);">Files
              </a>
            </li>
          </ul>
          
          <!-- User Menu Dropdown -->
          <div class="dropdown mt-auto">
            <hr>
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle p-2 rounded-2" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="${personCircle}" alt="User" class="me-2" style="width: 32px; height: 32px; filter: invert(1);">
              <strong>${profile.username || 'Admin'}</strong>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow">
              <li>
                <a class="dropdown-item text-danger fw-bold" href="#" id="logout-btn">
                  <img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 1em; height: 1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">Sign out
                </a>
              </li>
            </ul>
          </div>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="flex-grow-1" style="overflow-y: auto; height: 100vh; background-color: #f8f9fa;">
          <header class="navbar d-lg-none bg-dark navbar-dark">
            <div class="container-fluid">
              <a class="navbar-brand" href="#">Admin Panel</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#adminSidebar" aria-controls="adminSidebar">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </header>
          
          <main id="admin-content" class="p-4"></main>
        </div>
      </div>
    `;

        // --- LOGIC AND EVENT HANDLING ---
        const contentEl = document.getElementById("admin-content");
        const viewLinks = document.querySelectorAll('#adminSidebar [data-view]');
        const sidebar = document.getElementById('adminSidebar');
        const sidebarInstance = Offcanvas.getOrCreateInstance(sidebar);

        // Initialize Bootstrap components that require it.
        new Dropdown(document.querySelector('.dropdown-toggle'));

        /**
         * Renders the content for a given view name into the main content area.
         * This acts as a simple client-side router.
         * @param {string} viewName - The name of the view to render (e.g., 'dashboard', 'accounts').
         */
        const renderContent = async (viewName) => {
            contentEl.innerHTML = `<div class="d-flex justify-content-center align-items-center" style="height: 80vh;"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"><span class="visually-hidden"></span></div></div>`;

            viewLinks.forEach(link => link.classList.remove("active", "bg-primary"));
            const activeLink = document.querySelector(`#adminSidebar [data-view="${viewName}"]`);
            if (activeLink) {
                activeLink.classList.add("active", "bg-primary");
            }

            // The core rendering logic using a switch statement
            try {
                let view;
                switch (viewName) {
                    case "dashboard":
                        view = renderAdminDashboardView();
                        break;
                    case "accounts":
                        view = renderAccountsView();
                        break;
                    case "events":
                        view = renderEventsTimelineView();
                        break;
                    case "files":
                        view = renderUploadedFilesView();
                        break;
                    default:
                        // Fallback to the dashboard view if the name is unknown
                        console.warn(`Unknown view: '${viewName}'. Falling back to dashboard.`);
                        view = renderAdminDashboardView();
                }

                // Render the HTML and then run the associated JavaScript logic (afterRender)
                contentEl.innerHTML = view.html;
                if (view.afterRender && typeof view.afterRender === 'function') {
                    await view.afterRender();
                }

            } catch (error) {
                console.error(`Error rendering '${viewName}' view:`, error);
                contentEl.innerHTML = `<div class="alert alert-danger mx-4"><h4><i class="bi-exclamation-triangle-fill me-2"></i>Error</h4><p>Could not load the ${viewName} page.</p><pre class="small">${error.message}</pre></div>`;
            }
        };

        // Attach event listeners to all sidebar view links
        viewLinks.forEach((link) => {
            link.addEventListener("click", (e) => {
                e.preventDefault();
                const view = e.currentTarget.dataset.view;
                renderContent(view);
                // Hide the offcanvas sidebar on mobile after a link is clicked
                if (sidebar.classList.contains('show')) {
                    sidebarInstance.hide();
                }
            });
        });

        // Attach logout functionality
        document.getElementById("logout-btn").addEventListener("click", async (e) => {
            e.preventDefault();
            try {
                await account.deleteSession("current");
                window.location.href = "/landing/#login"; // Redirect to login page
            } catch (err) {
                console.error("Failed to log out:", err);
                alert("Logout failed. Please try again.");
            }
        });

        // --- INITIAL RENDER ---
        // Load the dashboard view by default when the page first loads.
        await renderContent("dashboard");

    } catch (err) {
        console.error("Failed to render admin dashboard:", err);
        await account.deleteSession("current").catch(() => {});
        window.location.href = "/landing/#login";
    }
}
