// dashboard.js

import './dashboardOfficer.scss';
import '../guard/auth.js';

import { account, databases } from "../shared/appwrite.js";
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_EVENTS, COLLECTION_ID_FILES } from "../shared/constants.js";
import { cache } from "../shared/cache.js";
import { Query } from "appwrite";
import { Offcanvas, Dropdown } from 'bootstrap';

// Initialize cache system
cache.init();

import renderFinanceView from "./views/finance.js";
import renderFilesView from "./views/files.js";
import renderEventsView from "./views/events.js";
import renderSettingsView from "./views/settings.js";
import renderStudentView from "./views/students.js";
import renderPaymentView from "./views/payments.js";

import wallet from 'bootstrap-icons/icons/wallet.svg';
import folder from 'bootstrap-icons/icons/folder.svg';
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import personBadgeFill from 'bootstrap-icons/icons/person-badge-fill.svg';
import creditCardFill from 'bootstrap-icons/icons/credit-card-fill.svg';
import gear from 'bootstrap-icons/icons/gear.svg';
import personCircle from 'bootstrap-icons/icons/person-circle.svg';
import gearFill from 'bootstrap-icons/icons/gear-fill.svg';
import boxArrowRight from 'bootstrap-icons/icons/box-arrow-right.svg';

const FILES_PAGE_LIMIT = 10;

// --- SIMPLE SIDEBAR CLOSE ---
function closeSidebar(sidebarEl) {
    if (!sidebarEl) return;
    if (!sidebarEl.classList.contains('show')) return;
    
    // Use Bootstrap's dismiss button to trigger proper close
    const closeBtn = sidebarEl.querySelector('[data-bs-dismiss="offcanvas"]');
    if (closeBtn) {
        closeBtn.click();
    }
}

export default async function renderDashboard() {
    const app = document.getElementById("app");

    try {
        // --- DATA FETCHING ---
        const user = await account.get();
        // Use ACCOUNTS collection
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);

        const [filesResponse, eventsResponse, accountsResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.orderDesc('$createdAt'), Query.limit(FILES_PAGE_LIMIT)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.orderDesc('date_to_held')]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(5000)])
        ]);

        const initialFilesData = { files: filesResponse.documents, total: filesResponse.total };
        const initialEventsData = eventsResponse.documents;
        const userLookup = accountsResponse.documents.reduce((map, acc) => {
            const name = (acc.students && acc.students.name) ? acc.students.name : acc.username;
            map[acc.$id] = name;
            return map;
        }, {});
        
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
                switch (viewName) {
                    case "finance": await renderFinanceView(userLookup, user); break;
                    case "files":
                        const filesView = renderFilesView(initialFilesData, userLookup, user);
                        contentEl.innerHTML = filesView.html; filesView.afterRender(); break;
                    case "events":
                        const eventsView = renderEventsView(initialEventsData, user, userLookup);
                        contentEl.innerHTML = eventsView.html; eventsView.afterRender(); break;
                    case "students":
                        const studentView = renderStudentView(user, profile);
                        contentEl.innerHTML = studentView.html;
                        await studentView.afterRender();
                        break;
                    case "payments":
                        const paymentView = renderPaymentView(user, profile);
                        contentEl.innerHTML = paymentView.html;
                        await paymentView.afterRender();
                        break;
                    case "settings":
                        const settingsView = renderSettingsView(user, profile);
                        contentEl.innerHTML = settingsView.html; settingsView.afterRender(); break;
                    default: await renderFinanceView(userLookup, user);
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
            await account.deleteSession("current");
            window.location.href = "/landing/#login";
        });
        await renderContent("finance");

    } catch (err) {
        console.error("Failed to render dashboard:", err);
        await account.deleteSession("current").catch(() => { });
        window.location.href = "/landing/#login";
    }
}

renderDashboard();
