
import './dashboardOfficer.scss';
import '../guard/auth.js';

import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_EVENTS, COLLECTION_ID_FILES } from "../shared/constants.js";
import { cache } from "../shared/cache.js";
import { prefetchModule } from "../shared/lazyLoadHelper.js";
import { Query } from "appwrite";
import { Offcanvas, Dropdown } from 'bootstrap';

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

import wallet from 'bootstrap-icons/icons/wallet.svg';
import folder from 'bootstrap-icons/icons/folder.svg';
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import personBadgeFill from 'bootstrap-icons/icons/person-badge-fill.svg';
import creditCardFill from 'bootstrap-icons/icons/credit-card-fill.svg';
import gear from 'bootstrap-icons/icons/gear.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import gearFill from 'bootstrap-icons/icons/gear-fill.svg';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg';
import personHearts from 'bootstrap-icons/icons/person-hearts.svg';
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

    app.innerHTML = `
      <div class="d-flex" style="min-height: 100vh;">
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3" style="width: 260px; background-color: #fff; border-right: 1px solid #e5e7eb;" tabindex="-1" id="sidebar">
          <a href="#" class="d-flex align-items-center mb-3 me-md-auto text-decoration-none">
            <span class="fs-5 fw-bold text-dark">SPECS</span>
          </a>
          <hr class="my-2" style="border-color: #e5e7eb;">
          <ul class="nav nav-pills flex-column">
            <li><a href="#" class="nav-link" data-view="finance"><img src="${wallet}" alt="Finance" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Finance</a></li>
            <li><a href="#" class="nav-link" data-view="files"><img src="${folder}" alt="Files" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Files</a></li>
            <li><a href="#" class="nav-link" data-view="events"><img src="${calendarEvent}" alt="Events" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Events</a></li>
            <li><a href="#" class="nav-link" data-view="students"><img src="${personBadgeFill}" alt="Students" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Students</a></li>
            <li><a href="#" class="nav-link" data-view="payments"><img src="${creditCardFill}" alt="Payments" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Payments</a></li>
            <li><a href="#" class="nav-link" data-view="volunteers"><img src="${personHearts}" alt="Volunteers" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Volunteers</a></li>
            <li><a href="#" class="nav-link" data-view="stories"><img src="${fileTextFill}" alt="Stories" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Stories</a></li>
            <li><a href="#" class="nav-link" data-view="settings"><img src="${gear}" alt="Settings" class="me-2" style="width:1.1em; height:1.1em; opacity: 0.6;">Settings</a></li>
          </ul>
          
          <div class="dropdown mt-auto">
            <hr class="my-2" style="border-color: #e5e7eb;">
            <a href="#" class="d-flex align-items-center text-dark text-decoration-none dropdown-toggle p-2 rounded-2" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="${personCircle}" alt="User" class="me-2" style="width: 28px; height: 28px; opacity: 0.7;">
              <strong class="small">${profile.username || 'User'}</strong>
            </a>
            <ul class="dropdown-menu text-small shadow-sm border">
              <li><a class="dropdown-item" href="#" data-view="settings"><img src="${gearFill}" alt="Settings" class="me-2" style="width: 1em; height: 1em; opacity: 0.6;">Settings</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger fw-medium" href="#" id="logout-btn"><img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 1em; height: 1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">Sign out</a></li>
            </ul>
          </div>
        </aside>

        <div class="flex-grow-1" style="overflow-y: auto; height: 100vh; background-color: #f9fafb;">
          <header class="navbar d-lg-none bg-white border-bottom">
            <div class="container-fluid">
              <a class="navbar-brand fw-semibold" href="#">Dashboard</a>
              <button class="navbar-toggler border-0" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar">
                <span class="navbar-toggler-icon"></span>
              </button>
            </div>
          </header>
          
          <main id="dashboard-content" class="p-4"></main>
        </div>
      </div>
    `;

    const contentEl = document.getElementById("dashboard-content");
    const viewLinks = document.querySelectorAll('#sidebar [data-view]');
    const sidebar = document.getElementById('sidebar');
    const sidebarInstance = Offcanvas.getOrCreateInstance(sidebar);

    const userDropdown = new Dropdown(document.querySelector('.dropdown-toggle'));

    const renderContent = async (viewName) => {
      contentEl.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

      viewLinks.forEach((link) => {
        link.classList.remove("active");
      });

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
      } catch (error) {
        console.error(`Error rendering ${viewName} view:`, error);
        contentEl.innerHTML = `<div class="alert alert-danger mx-4"><h4>Error</h4><p>Could not load the ${viewName} page.</p></div>`;
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
