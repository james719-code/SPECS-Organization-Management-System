import './dashboardAdmin.scss';
import '../guard/auth.js';
import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from "../shared/constants.js";
import { cache } from "../shared/cache.js";
import { prefetchModule } from "../shared/lazyLoadHelper.js";
import { chartManager } from "../shared/utils.js";
import { Offcanvas } from 'bootstrap';
import { setCurrentUser, logActivity } from './views/activity-logs.js';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

cache.init();

const viewModules = {
  dashboard: () => import('./views/dashboard.js'),
  accounts: () => import('./views/accounts.js'),
  events: () => import('./views/events.js'),
  files: () => import('./views/files.js'),
  payments: () => import('./views/payments.js'),
  students: () => import('./views/students.js'),
  volunteers: () => import('../dashboard-officer/views/volunteers.js'),
  stories: () => import('../dashboard-officer/views/stories.js'),
  attendance: () => import('./views/attendance.js'),
  finance: () => import('./views/finance.js'),
  settings: () => import('../dashboard-officer/views/settings.js')
};

const loadedModules = new Map();

function prefetchCommonViews() {
  // Prefetch most commonly used views after initial load
  prefetchModule(viewModules.accounts);
  prefetchModule(viewModules.events);
  prefetchModule(viewModules.students);
  prefetchModule(viewModules.payments);
}

import shieldLockFill from 'bootstrap-icons/icons/shield-lock-fill.svg';
import grid1x2Fill from 'bootstrap-icons/icons/grid-1x2-fill.svg';
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import folderFill from 'bootstrap-icons/icons/folder-fill.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg';
import creditCardFill from 'bootstrap-icons/icons/credit-card-fill.svg';
import personBadgeFill from 'bootstrap-icons/icons/person-badge-fill.svg';
import personHeartsFill from 'bootstrap-icons/icons/person-hearts.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';
import gearFill from 'bootstrap-icons/icons/gear-fill.svg';
import calendarCheckFill from 'bootstrap-icons/icons/calendar-check-fill.svg';
import cashStack from 'bootstrap-icons/icons/cash-stack.svg';

function closeSidebar(sidebarEl) {
  if (!sidebarEl) return;
  if (window.innerWidth >= 992) return;

  const instance = Offcanvas.getInstance(sidebarEl);
  if (instance) instance.hide();
}

export default async function renderDashboardAdmin() {
  const app = document.getElementById("app");

  try {
    let user, profile;

    // Use mock data in dev mode
    if (DEV_BYPASS) {
      const { getDevUser } = await import('../shared/mock/devUtils.js');
      const mockUser = getDevUser('admin');
      user = { $id: mockUser.$id, email: mockUser.email, name: mockUser.name };
      profile = mockUser;
      console.log('[DEV] Using mock admin user:', mockUser.email);
    } else {
      user = await account.get();
      profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
    }

    if (profile.type !== 'admin') {
      console.error("Access Denied: User is not an admin.");
      window.location.href = "/landing/#login";
      return;
    }

    // Initialize the current user context for activity logging
    setCurrentUser(user, profile);
    logActivity('login', `${profile.username || user.name || 'Admin'} logged into the system`);

    app.innerHTML = `
      <div class="d-flex" style="height: 100vh; overflow: hidden;">
        <!-- Sidebar -->
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3" style="width: 260px; height: 100vh; background-color: #fff; border-right: 1px solid #e5e7eb;" tabindex="-1" id="adminSidebar">
          <a href="#" class="d-flex align-items-center mb-3 me-md-auto text-decoration-none" style="flex-shrink: 0;">
            <img src="${shieldLockFill}" alt="Admin" class="me-2" style="width: 1.25rem; height: 1.25rem; filter: invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%);">
            <span class="fs-5 fw-bold text-dark">Admin Panel</span>
          </a>
          <hr class="my-2" style="border-color: #e5e7eb; flex-shrink: 0;">
          <div class="sidebar-nav-scroll" style="flex: 1 1 0%; min-height: 0; overflow-y: auto;">
            <ul class="nav nav-pills flex-column">
              <li class="nav-item">
                <a href="#" class="nav-link" data-view="dashboard">
                  <img src="${grid1x2Fill}" alt="Dashboard" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Dashboard
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="accounts">
                  <img src="${peopleFill}" alt="Accounts" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Accounts
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="events">
                  <img src="${calendarEventFill}" alt="Events" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Events
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="attendance">
                  <img src="${calendarCheckFill}" alt="Attendance" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Attendance
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="payments">
                  <img src="${creditCardFill}" alt="Payments" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Payments
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="finance">
                  <img src="${cashStack}" alt="Finance" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Finance
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="students">
                  <img src="${personBadgeFill}" alt="Students" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Students
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="files">
                  <img src="${folderFill}" alt="Files" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Files
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="volunteers">
                  <img src="${personHeartsFill}" alt="Volunteers" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Volunteers
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="stories">
                  <img src="${fileTextFill}" alt="Stories" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Stories
                </a>
              </li>
              <li class="nav-item mt-3">
                <small class="text-muted text-uppercase px-3 fw-bold" style="font-size: 0.75rem;">Account</small>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="settings">
                  <img src="${gearFill}" alt="Settings" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Settings
                </a>
              </li>
            </ul>
          </div>
          
          <!-- User Info & Logout -->
          <div style="flex-shrink: 0;">
            <hr class="my-2" style="border-color: #e5e7eb;">
            <div class="d-flex align-items-center text-dark p-2 rounded-2">
              <img src="${personCircle}" alt="User" class="me-2" style="width: 28px; height: 28px; opacity: 0.7;">
              <strong class="small">${profile.username || 'Admin'}</strong>
            </div>
            <a href="#" class="d-flex align-items-center text-danger text-decoration-none p-2 rounded-2 mt-1" id="logout-btn" style="transition: background 0.15s;">
              <img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 1em; height: 1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">
              <span class="small fw-medium">Sign out</span>
            </a>
          </div>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="flex-grow-1" style="overflow-y: auto; height: 100%; background-color: #f9fafb;">
          <header class="navbar d-lg-none bg-white border-bottom">
            <div class="container-fluid">
              <a class="navbar-brand fw-semibold" href="#">Admin Panel</a>
              <button class="navbar-toggler border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#adminSidebar" aria-controls="adminSidebar">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </header>
          
          <main id="admin-content" class="p-4"></main>
        </div>
      </div>
    `;

    const contentEl = document.getElementById("admin-content");
    const viewLinks = document.querySelectorAll('#adminSidebar [data-view]');
    const sidebar = document.getElementById('adminSidebar');
    const sidebarInstance = Offcanvas.getOrCreateInstance(sidebar);



    /**
     * Renders the content for a given view name into the main content area.
     * Uses dynamic imports for lazy loading.
     * @param {string} viewName - The name of the view to render (e.g., 'dashboard', 'accounts').
     */
    const renderContent = async (viewName) => {
      // Clean up any existing chart instances before switching views
      chartManager.destroyAll();
      
      // Fade out current content and show loading spinner
      contentEl.style.opacity = '0.5';
      contentEl.innerHTML = `
        <div class="d-flex justify-content-center align-items-center" style="height: 70vh;">
          <div class="spinner-border text-primary" style="width: 2rem; height: 2rem;" role="status"></div>
        </div>
      `;
      contentEl.style.opacity = '1';

      viewLinks.forEach(link => link.classList.remove("active", "bg-primary"));
      const activeLink = document.querySelector(`#adminSidebar [data-view="${viewName}"]`);
      if (activeLink) {
        activeLink.classList.add("active", "bg-primary");
      }

      try {
        // Use cached module or load dynamically
        let module;
        if (loadedModules.has(viewName)) {
          module = loadedModules.get(viewName);
        } else {
          const importFn = viewModules[viewName] || viewModules.dashboard;
          module = await importFn();
          loadedModules.set(viewName, module);
        }

        // Get the render function
        const renderFn = module.default;

        let view;
        switch (viewName) {
          case "dashboard":
          case "payments":
          case "volunteers":
          case "stories":
          case "settings":
            view = renderFn(user, profile);
            break;
          default:
            view = renderFn();
        }

        // Render the HTML and then run the associated JavaScript logic (afterRender)
        contentEl.innerHTML = view.html;
        if (view.afterRender && typeof view.afterRender === 'function') {
          await view.afterRender();
        }

      } catch (error) {
        console.error(`Error rendering '${viewName}' view:`, error);
        contentEl.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center" style="height: 60vh;">
            <div class="text-center">
              <div class="error-icon mb-4">
                <svg width="64" height="64" fill="currentColor" viewBox="0 0 16 16" class="text-danger opacity-75">
                  <path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/>
                </svg>
              </div>
              <h4 class="fw-bold text-dark mb-2">Unable to load ${viewName}</h4>
              <p class="text-muted mb-4">Something went wrong while loading this page.</p>
              <div class="d-flex gap-2 justify-content-center">
                <button class="btn btn-primary" onclick="location.reload()">
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16" class="me-1">
                    <path fill-rule="evenodd" d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/>
                    <path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/>
                  </svg>
                  Reload Page
                </button>
                <button class="btn btn-outline-secondary" onclick="document.querySelector('[data-view=dashboard]').click()">
                  Go to Dashboard
                </button>
              </div>
              <details class="mt-4 text-start" style="max-width: 500px;">
                <summary class="text-muted small" style="cursor: pointer;">Technical details</summary>
                <pre class="small bg-light p-3 rounded mt-2 text-wrap">${error.message}</pre>
              </details>
            </div>
          </div>
        `;
      }
    };

    // Attach event listeners to all sidebar view links
    viewLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        renderContent(view);
        closeSidebar(sidebar);
      });
    });

    // Attach logout functionality
    document.getElementById("logout-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (!DEV_BYPASS) {
          await account.deleteSession("current");
        }
        window.location.href = "/landing/#login";
      } catch (err) {
        console.error("Failed to log out:", err);
        alert("Logout failed. Please try again.");
      }
    });

    await renderContent("dashboard");

    // Prefetch common views after initial render
    prefetchCommonViews();

    // Remove loading placeholder
    const loading = document.getElementById('loading-placeholder');
    if (loading) {
      loading.style.opacity = '0';
      setTimeout(() => loading.remove(), 300);
    }

  } catch (err) {
    console.error("Failed to render admin dashboard:", err);
    if (!DEV_BYPASS) {
      await account.deleteSession("current").catch(() => { });
    }
    window.location.href = "/landing/#login";
  }
}

// Initialize the dashboard
renderDashboardAdmin();
