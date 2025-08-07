// dashboard.js

import './dashboardUser.scss';
import '../guard/auth.js';

import { account, databases } from "../shared/appwrite.js";
import { Query } from "appwrite";
import { Offcanvas, Dropdown } from 'bootstrap';

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

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const FILES_PAGE_LIMIT = 10;

export default async function renderDashboard() {
    const app = document.getElementById("app");

    try {
        // --- DATA FETCHING ---
        const user = await account.get();
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);

        const [filesResponse, eventsResponse, studentsResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.orderDesc('$createdAt'), Query.limit(FILES_PAGE_LIMIT)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.orderDesc('date_to_held')]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)])
        ]);

        const initialFilesData = { files: filesResponse.documents, total: filesResponse.total };
        const initialEventsData = eventsResponse.documents;
        const userLookup = studentsResponse.documents.reduce((map, student) => {
            map[student.$id] = student.fullname || student.username;
            return map;
        }, {});
        app.innerHTML = `
      <div class="d-flex" style="min-height: 100vh;">
        <aside class="offcanvas-lg offcanvas-start d-flex flex-column flex-shrink-0 p-3 bg-primary" style="width: 280px;" tabindex="-1" id="sidebar">
          <a href="#" class="d-flex align-items-center mb-3 me-md-auto text-white text-decoration-none">
            <span class="fs-4 fw-bold">SPECS</span>
          </a>
          <hr>
          <ul class="nav nav-pills flex-column">
            <li><a href="#" class="nav-link" data-view="finance"><img src="${wallet}" alt="Finance" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Finance</a></li>
            <li><a href="#" class="nav-link" data-view="files"><img src="${folder}" alt="Files" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Files</a></li>
            <li><a href="#" class="nav-link" data-view="events"><img src="${calendarEvent}" alt="Events" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Events</a></li>
            <li><a href="#" class="nav-link" data-view="students"><img src="${personBadgeFill}" alt="Students" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Students</a></li>
            <li><a href="#" class="nav-link" data-view="payments"><img src="${creditCardFill}" alt="Payments" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Payments</a></li>
            <li><a href="#" class="nav-link" data-view="settings"><img src="${gear}" alt="Settings" class="me-2" style="width:1.2em; height:1.2em; filter: invert(1);">Settings</a></li>
          </ul>
          
          <div class="dropdown mt-auto">
            <hr>
            <a href="#" class="d-flex align-items-center text-white text-decoration-none dropdown-toggle p-2 rounded-2" data-bs-toggle="dropdown" aria-expanded="false">
              <img src="${personCircle}" alt="User" class="me-2" style="width: 32px; height: 32px; filter: invert(1);">
              <strong>${profile.username || 'User'}</strong>
            </a>
            <ul class="dropdown-menu dropdown-menu-dark text-small shadow">
              <li><a class="dropdown-item" href="#" data-view="settings"><img src="${gearFill}" alt="Settings" class="me-2" style="width: 1em; height: 1em; filter: invert(1);">Settings</a></li>
              <li><hr class="dropdown-divider"></li>
              <li><a class="dropdown-item text-danger fw-bold" href="#" id="logout-btn"><img src="${boxArrowRight}" alt="Sign out" class="me-2" style="width: 1em; height: 1em; filter: invert(27%) sepia(52%) saturate(5458%) hue-rotate(341deg) brightness(89%) contrast(97%);">Sign out</a></li>
            </ul>
          </div>
        </aside>

        <div class="flex-grow-1" style="overflow-y: auto; height: 100vh;">
          <header class="navbar d-lg-none">
            <div class="container-fluid">
              <a class="navbar-brand" href="#">Dashboard</a>
              <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebar" aria-controls="sidebar">
                <span class="navbar-toggler-icon navbar-dark"></span>
              </button>
            </div>
          </header>
          
          <main id="dashboard-content" class="p-4" style="background-color: var(--bs-body-bg);"></main>
        </div>
      </div>
    `;

        const contentEl = document.getElementById("dashboard-content");
        const viewLinks = document.querySelectorAll('#sidebar [data-view]');
        const sidebar = document.getElementById('sidebar');
        const sidebarInstance = Offcanvas.getOrCreateInstance(sidebar);

        const userDropdown = new Dropdown(document.querySelector('.dropdown-toggle'));

        viewLinks.forEach(link => link.classList.add('text-white'));

        const renderContent = async (viewName) => {
            contentEl.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>`;

            viewLinks.forEach((link) => {
                link.classList.remove("active");
                if (link.classList.contains('nav-link')) {
                    link.style.backgroundColor = 'transparent';
                }
            });

            const activeLink = document.querySelector(`#sidebar [data-view="${viewName}"]`);
            if (activeLink) {
                activeLink.classList.add("active");
                if (activeLink.classList.contains('nav-link')) {
                    activeLink.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
                }
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
                if (sidebar.classList.contains('show')) {
                    sidebarInstance.hide();
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