import './dashboardAdmin.scss';
import '../guard/auth.js';
import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from "../shared/constants.js";
import { cache } from "../shared/cache.js";
import { prefetchModule } from "../shared/lazyLoadHelper.js";
import { Offcanvas, Dropdown } from 'bootstrap';

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
  students: () => import('./views/students.js')
};

const loadedModules = new Map();

function prefetchCommonViews() {
  prefetchModule(viewModules.accounts);
  prefetchModule(viewModules.events);
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

function closeSidebar(sidebarEl) {
  if (!sidebarEl) return;
  if (!sidebarEl.classList.contains('show')) return;

  const closeBtn = sidebarEl.querySelector('[data-bs-dismiss="offcanvas"]');
  if (closeBtn) closeBtn.click();
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

    app.innerHTML = `
      <div class="d-flex" style="min-height: 100vh;">
        <!-- Sidebar -->
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3" style="width: 260px; background-color: #fff; border-right: 1px solid #e5e7eb;" tabindex="-1" id="adminSidebar">
          <a href="#" class="d-flex align-items-center mb-3 me-md-auto text-decoration-none">
            <img src="${shieldLockFill}" alt="Admin" class="me-2" style="width: 1.25rem; height: 1.25rem; filter: invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%);">
            <span class="fs-5 fw-bold text-dark">Admin Panel</span>
          </a>
          <hr class="my-2" style="border-color: #e5e7eb;">
          <ul class="nav nav-pills flex-column mb-auto">
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
              <a href="#" class="nav-link" data-view="payments">
                <img src="${creditCardFill}" alt="Payments" class="me-2" style="width: 1.1em; height: 1.1em; opacity: 0.6;">Payments
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
          </ul>
          
          <!-- User Menu Dropdown -->
          <div class="dropdown mt-auto">
            <hr class="my-2" style="border-color: #e5e7eb;">
            <a href="#" class="d-flex align-items-center text-dark text-decoration-none dropdown-toggle p-2 rounded-2" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="${personCircle}" alt="User" class="me-2" style="width: 28px; height: 28px; opacity: 0.7;">
              <strong class="small">${profile.username || 'Admin'}</strong>
            </a>
            <ul class="dropdown-menu text-small shadow-sm border">
              <li>
                <a class="dropdown-item text-danger fw-medium" href="#" id="logout-btn">
                  <img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 1em; height: 1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">Sign out
                </a>
              </li>
            </ul>
          </div>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="flex-grow-1" style="overflow-y: auto; height: 100vh; background-color: #f9fafb;">
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

    // Initialize Bootstrap components that require it.
    new Dropdown(document.querySelector('.dropdown-toggle'));

    /**
     * Renders the content for a given view name into the main content area.
     * Uses dynamic imports for lazy loading.
     * @param {string} viewName - The name of the view to render (e.g., 'dashboard', 'accounts').
     */
    const renderContent = async (viewName) => {
      contentEl.innerHTML = `<div class="d-flex justify-content-center align-items-center" style="height: 80vh;"><div class="spinner-border text-primary" style="width: 3rem; height: 3rem;" role="status"><span class="visually-hidden"></span></div></div>`;

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
          case "payments":
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
        contentEl.innerHTML = `<div class="alert alert-danger mx-4"><h4><i class="bi-exclamation-triangle-fill me-2"></i>Error</h4><p>Could not load the ${viewName} page.</p><pre class="small">${error.message}</pre></div>`;
      }
    };

    // Attach event listeners to all sidebar view links
    viewLinks.forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault();
        const view = e.currentTarget.dataset.view;
        renderContent(view);
        // Close sidebar on mobile
        if (window.innerWidth < 992) {
          closeSidebar(sidebar);
        }
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
