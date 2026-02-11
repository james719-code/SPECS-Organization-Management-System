
import './dashboardOfficer.scss';
import '../guard/auth.js';

import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_EVENTS, COLLECTION_ID_FILES } from "../shared/constants.js";
import { cache } from "../shared/cache.js";
import { prefetchModule } from "../shared/lazyLoadHelper.js";
import { Query } from "appwrite";
import { Offcanvas, Dropdown } from 'bootstrap';
import { setCurrentUser } from '../dashboard-admin/views/activity-logs.js';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

cache.init();

const viewModules = {
  finance: () => import("./views/finance.js"),
  files: () => import("./views/files.js"),
  events: () => import("./views/events.js"),
  settings: () => import("./views/settings.js"),
  students: () => import("./views/students.js"),
  payments: () => import("./views/payments.js"),
  volunteers: () => import("./views/volunteers.js"),
  stories: () => import("./views/stories.js")
};

const loadedModules = new Map();

function prefetchCommonViews() {
  prefetchModule(viewModules.files);
  prefetchModule(viewModules.events);
}

import folderFill from 'bootstrap-icons/icons/folder-fill.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import personBadgeFill from 'bootstrap-icons/icons/person-badge-fill.svg';
import creditCardFill from 'bootstrap-icons/icons/credit-card-fill.svg';
import cashStack from 'bootstrap-icons/icons/cash-stack.svg';
import gearFill from 'bootstrap-icons/icons/gear-fill.svg';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg';
import personHeartsFill from 'bootstrap-icons/icons/person-hearts.svg';
import fileTextFill from 'bootstrap-icons/icons/file-text-fill.svg';

const FILES_PAGE_LIMIT = 10;

function closeSidebar(sidebarEl) {
  if (!sidebarEl) return;
  if (!sidebarEl.classList.contains('show')) return;

  const closeBtn = sidebarEl.querySelector('[data-bs-dismiss="offcanvas"]');
  if (closeBtn) closeBtn.click();
}

export default async function renderDashboard() {
  const app = document.getElementById("app");

  try {
    let user, profile, initialFilesData, initialEventsData, userLookup;

    // Use mock data in dev mode
    if (DEV_BYPASS) {
      const { getDevUser } = await import('../shared/mock/devUtils.js');
      const { mockEvents, mockFiles, mockUsers } = await import('../shared/mock/mockData.js');
      const mockUser = getDevUser('officer');
      user = { $id: mockUser.$id, email: mockUser.email, name: mockUser.name };
      profile = mockUser;
      initialFilesData = { files: mockFiles, total: mockFiles.length };
      initialEventsData = mockEvents;
      userLookup = mockUsers.reduce((map, u) => {
        map[u.$id] = u.name || u.username;
        return map;
      }, {});
      console.log('[DEV] Using mock officer user:', mockUser.email);
    } else {
      user = await account.get();
      // Use ACCOUNTS collection
      profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);

      const [filesResponse, eventsResponse, accountsResponse] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.orderDesc('$createdAt'), Query.limit(FILES_PAGE_LIMIT)]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.orderDesc('date_to_held')]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(5000)])
      ]);

      initialFilesData = { files: filesResponse.documents, total: filesResponse.total };
      initialEventsData = eventsResponse.documents;
      userLookup = accountsResponse.documents.reduce((map, acc) => {
        const name = (acc.students && acc.students.name) ? acc.students.name : acc.username;
        map[acc.$id] = name;
        return map;
      }, {});
    }

    // Initialize the current user context for activity logging
    setCurrentUser(user, profile);

    const displayName = profile.username || profile.fullname || 'Officer';
    const initials = displayName.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();

    app.innerHTML = `
      <div class="officer-dashboard d-flex" style="height: 100vh; overflow: hidden;">
        <!-- Sidebar -->
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0" style="width: 280px; height: 100vh;" tabindex="-1" id="sidebar">
          
          <!-- Sidebar Header / Branding -->
          <div class="sidebar-header" style="flex-shrink: 0;">
            <a href="#" class="sidebar-brand text-decoration-none">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M10.125 7.125L12 3.375L13.875 7.125M12 3.375V10.875M16.875 13.875L20.625 12L16.875 10.125M20.625 12H13.125M7.125 10.125L3.375 12L7.125 13.875M3.375 12H10.875M13.875 16.875L12 20.625L10.125 16.875M12 20.625V13.125" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              SPECS
            </a>
            <div class="sidebar-subtitle">Officer Dashboard</div>
          </div>
          
          <!-- Scrollable Navigation -->
          <div class="sidebar-nav-scroll" style="flex: 1 1 0%; min-height: 0; overflow-y: auto;">
            <div class="nav-section-label">Management</div>
            <ul class="nav nav-pills flex-column">
              <li class="nav-item">
                <a href="#" class="nav-link" data-view="finance">
                  <img src="${cashStack}" alt="Finance">Finance
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="payments">
                  <img src="${creditCardFill}" alt="Payments">Payments
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="students">
                  <img src="${personBadgeFill}" alt="Students">Students
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="volunteers">
                  <img src="${personHeartsFill}" alt="Volunteers">Volunteers
                </a>
              </li>
            </ul>
            
            <div class="nav-section-label">Content</div>
            <ul class="nav nav-pills flex-column">
              <li>
                <a href="#" class="nav-link" data-view="events">
                  <img src="${calendarEventFill}" alt="Events">Events
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="files">
                  <img src="${folderFill}" alt="Files">Files
                </a>
              </li>
              <li>
                <a href="#" class="nav-link" data-view="stories">
                  <img src="${fileTextFill}" alt="Stories">Stories
                </a>
              </li>
            </ul>
            
            <div class="nav-section-label">Account</div>
            <ul class="nav nav-pills flex-column">
              <li>
                <a href="#" class="nav-link" data-view="settings">
                  <img src="${gearFill}" alt="Settings">Settings
                </a>
              </li>
            </ul>
          </div>
          
          <!-- User Profile Area -->
          <div class="sidebar-user-area" style="flex-shrink: 0;">
            <div class="dropdown w-100">
              <a href="#" class="d-flex align-items-center gap-3 text-decoration-none p-2 rounded-3 dropdown-toggle" data-bs-toggle="dropdown" aria-expanded="false" style="transition: background 0.15s;">
                <div class="user-avatar">${initials}</div>
                <div class="user-info flex-grow-1">
                  <div class="user-name">${displayName}</div>
                  <div class="user-role">Officer</div>
                </div>
              </a>
              <ul class="dropdown-menu dropdown-menu-end text-small shadow border-0 w-100">
                <li>
                  <a class="dropdown-item py-2" href="#" data-view="settings">
                    <img src="${gearFill}" alt="Settings" class="me-2" style="width: 16px; opacity: 0.5;">Settings
                  </a>
                </li>
                <li><hr class="dropdown-divider my-1"></li>
                <li>
                  <a class="dropdown-item text-danger fw-medium py-2" href="#" id="logout-btn">
                    <img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 16px; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">Sign out
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </aside>

        <!-- Main Content Wrapper -->
        <div class="flex-grow-1 d-flex flex-column" style="overflow-y: auto; height: 100%; background-color: var(--officer-content-bg, #f9fafb);">
          <!-- Mobile Header -->
          <header class="officer-mobile-header d-lg-none d-flex align-items-center justify-content-between">
            <span class="mobile-brand">SPECS</span>
            <button class="btn btn-link p-0 border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar">
              <svg width="24" height="24" viewBox="0 0 16 16" fill="currentColor"><path fill-rule="evenodd" d="M2.5 12a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5zm0-4a.5.5 0 0 1 .5-.5h10a.5.5 0 0 1 0 1H3a.5.5 0 0 1-.5-.5z"/></svg>
            </button>
          </header>
          
          <main id="dashboard-content" class="flex-grow-1"></main>
        </div>
      </div>
    `;

    const contentEl = document.getElementById("dashboard-content");
    const viewLinks = document.querySelectorAll('#sidebar [data-view]');
    const sidebar = document.getElementById('sidebar');

    // Initialize Bootstrap components that require it.
    new Dropdown(document.querySelector('.dropdown-toggle'));

    const renderContent = async (viewName) => {
      // Fade out current content and show loading spinner
      contentEl.style.opacity = '0';
      contentEl.style.transition = 'opacity 0.15s ease';
      contentEl.innerHTML = `
        <div class="officer-loading">
          <div class="spinner-ring"></div>
          <span class="loading-text">Loading ${viewName}...</span>
        </div>
      `;
      contentEl.style.opacity = '1';

      viewLinks.forEach(link => link.classList.remove("active"));

      const activeLink = document.querySelector(`#sidebar [data-view="${viewName}"]`);
      if (activeLink) {
        activeLink.classList.add("active");
      }

      try {
        // Use cached module or load dynamically
        let module;
        if (loadedModules.has(viewName)) {
          module = loadedModules.get(viewName);
        } else {
          const importFn = viewModules[viewName] || viewModules.finance;
          module = await importFn();
          loadedModules.set(viewName, module);
        }

        const renderFn = module.default;
        let view;

        // Fade transition: hide, render, then animate in
        contentEl.style.opacity = '0';

        switch (viewName) {
          case "finance":
            await renderFn(userLookup, user);
            break;
          case "files":
            view = renderFn(initialFilesData, userLookup, user);
            contentEl.innerHTML = view.html;
            view.afterRender();
            break;
          case "events":
            view = renderFn(initialEventsData, user, userLookup);
            contentEl.innerHTML = view.html;
            view.afterRender();
            break;
          case "students":
            view = renderFn(user, profile);
            contentEl.innerHTML = view.html;
            await view.afterRender();
            break;
          case "payments":
            view = renderFn(user, profile);
            contentEl.innerHTML = view.html;
            await view.afterRender();
            break;
          case "settings":
            view = renderFn(user, profile);
            contentEl.innerHTML = view.html;
            view.afterRender();
            break;
          case "volunteers":
            view = renderFn(user, profile);
            contentEl.innerHTML = view.html;
            await view.afterRender();
            break;
          case "stories":
            view = renderFn(user, profile);
            contentEl.innerHTML = view.html;
            await view.afterRender();
            break;
          default:
            await renderFn(userLookup, user);
        }

        // Animate content in smoothly
        requestAnimationFrame(() => {
          contentEl.style.opacity = '1';
          contentEl.style.transition = 'opacity 0.25s ease';
        });
      } catch (error) {
        console.error(`Error rendering ${viewName} view:`, error);
        contentEl.style.opacity = '1';
        contentEl.innerHTML = `
          <div class="d-flex flex-column align-items-center justify-content-center" style="min-height: 60vh;">
            <div class="text-center">
              <div class="bg-danger-subtle rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 64px; height: 64px;">
                <svg width="28" height="28" fill="currentColor" class="text-danger" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg>
              </div>
              <h5 class="fw-bold text-dark mb-2">Failed to load ${viewName}</h5>
              <p class="text-muted small mb-3">Something went wrong. Please try again.</p>
              <button class="btn btn-sm btn-primary rounded-pill px-4" onclick="location.reload()">Reload Page</button>
            </div>
          </div>`;
      }
    };

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

    document.getElementById("logout-btn").addEventListener("click", async (e) => {
      e.preventDefault();
      try {
        if (!DEV_BYPASS) {
          await account.deleteSession("current");
        }
        window.location.href = "/landing/#login";
      } catch (err) {
        console.error("Failed to log out:", err);
        window.location.href = "/landing/#login";
      }
    });

    await renderContent("finance");

    // Prefetch common views after initial render
    prefetchCommonViews();

  } catch (err) {
    console.error("Failed to render dashboard:", err);
    await account.deleteSession("current").catch(() => { });
    window.location.href = "/landing/#login";
  }
}

renderDashboard();
