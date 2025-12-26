// dashboardStudent.js
import { api } from '../shared/api.js';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Offcanvas } from 'bootstrap';
import './dashboardStudent.scss';

// --- VIEW IMPORTS ---
import renderEventsView from './views/events.js';
import renderProfileView from './views/profile.js';
import renderPaymentsView from './views/payments.js';
import renderAttendanceView from './views/attendance.js';

// --- ASSETS ---
import logo from '/logo.webp';
import calendarIcon from 'bootstrap-icons/icons/calendar-event.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import walletIcon from 'bootstrap-icons/icons/wallet2.svg';
import clockIcon from 'bootstrap-icons/icons/clock-history.svg';
import boxArrowRightIcon from 'bootstrap-icons/icons/box-arrow-right.svg';
import listIcon from 'bootstrap-icons/icons/list.svg';

// --- CONFIGURATION ---
const MAIN_CONTENT_ID = 'dashboard-content';

// --- STATE ---
let currentUser = null;   // Appwrite Auth User
let accountDoc = null;    // Identity Document (Collection: Accounts)
let studentDoc = null;    // Profile Document (Collection: Students)

// --- ROUTING MAP ---
const views = {
    '#events': { render: renderEventsView, title: 'Events', icon: calendarIcon },
    '#profile': { render: renderProfileView, title: 'My Profile', icon: personIcon },
    '#payments': { render: renderPaymentsView, title: 'My Payments', icon: walletIcon },
    '#attendance': { render: renderAttendanceView, title: 'My Attendance', icon: clockIcon },
    // Default
    '': { render: renderEventsView, title: 'Events', icon: calendarIcon }
};

// --- INIT ---
async function init() {
    try {
        // 1. Get Auth User
        currentUser = await api.users.getCurrent();

        // 2. Get Account Identity
        accountDoc = await api.users.getAccount(currentUser.$id);

        // Security Check: Ensure user is actually a student and verified
        if (accountDoc.type !== 'student' || !accountDoc.verified) {
            window.location.replace('/landing/#pending-verification');
            return;
        }

        // 3. Get Linked Student Profile
        let rawStudentData = accountDoc.students;
        
        if (Array.isArray(rawStudentData)) {
            if (rawStudentData.length === 0) throw new Error("Student link is empty.");
            rawStudentData = rawStudentData[0];
        }

        const linkedStudentId = (rawStudentData && typeof rawStudentData === 'object')
            ? rawStudentData.$id
            : rawStudentData;

        if (!linkedStudentId) {
            throw new Error("No linked student profile found.");
        }

        studentDoc = await api.users.getStudentProfile(linkedStudentId);

        // 4. Setup Layout & UI
        setupLayout();
        setupNavigation();
        handleRoute();
        window.addEventListener('hashchange', handleRoute);

        // Remove loading screen
        const loading = document.getElementById('loading-placeholder');
        if (loading) loading.style.opacity = 0;
        setTimeout(() => { if (loading) loading.remove(); }, 300);

    } catch (error) {
        console.error("Dashboard Init Error:", error);
        window.location.replace('/landing/');
    }
}

function setupLayout() {
    const app = document.getElementById('app');
    
    // Construct Sidebar HTML
    const sidebar = `
        <div class="offcanvas-lg offcanvas-start bg-primary text-white" tabindex="-1" id="sidebarMenu" aria-labelledby="sidebarMenuLabel" style="width: 280px;">
            <div class="offcanvas-header border-bottom border-white border-opacity-10">
                <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2" id="sidebarMenuLabel">
                    <img src="${logo}" alt="SPECS" width="32" height="32" class="bg-white rounded-circle p-1">
                    SPECS Portal
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body d-flex flex-column h-100 p-3">
                <div class="mb-4 px-2">
                    <small class="text-uppercase text-white-50 fw-bold" style="font-size: 0.75rem; letter-spacing: 1px;">Menu</small>
                </div>
                <nav class="nav nav-pills flex-column gap-2 mb-auto">
                    ${Object.entries(views).filter(([k]) => k !== '').map(([hash, config]) => `
                        <a href="${hash}" class="nav-link text-white d-flex align-items-center gap-3 sidebar-link">
                            <img src="${config.icon}" width="20" style="filter: invert(1);">
                            ${config.title}
                        </a>
                    `).join('')}
                </nav>
                <div class="mt-auto border-top border-white border-opacity-10 pt-3">
                    <div class="d-flex align-items-center gap-3 px-2 mb-3">
                        <div class="bg-white rounded-circle d-flex align-items-center justify-content-center text-primary fw-bold" style="width: 40px; height: 40px;">
                            ${(studentDoc.name || accountDoc.username).charAt(0).toUpperCase()}
                        </div>
                        <div class="overflow-hidden">
                            <p class="mb-0 fw-bold text-truncate" style="max-width: 160px;">${studentDoc.name || accountDoc.username}</p>
                            <small class="text-white-50">Student</small>
                        </div>
                    </div>
                    <button id="logout-btn" class="btn btn-outline-light w-100 d-flex align-items-center justify-content-center gap-2">
                        <img src="${boxArrowRightIcon}" width="18" style="filter: invert(1);">
                        Sign Out
                    </button>
                </div>
            </div>
        </div>
    `;

    // Construct Main Content Area
    const mainHTML = `
        <div class="d-flex">
            ${sidebar}
            <div class="flex-grow-1 d-flex flex-column min-vh-100" style="background-color: #f8f9fa;">
                <nav class="navbar navbar-light bg-white border-bottom shadow-sm d-lg-none px-3 sticky-top" style="height: 60px;">
                    <button class="btn btn-link p-0 text-dark" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebarMenu">
                        <img src="${listIcon}" width="28">
                    </button>
                    <span class="navbar-brand mb-0 h1 fw-bold text-primary">SPECS</span>
                    <div style="width: 28px;"></div> <!-- Spacer -->
                </nav>
                <main id="${MAIN_CONTENT_ID}" class="flex-grow-1 position-relative">
                    <!-- Dynamic View Content -->
                </main>
            </div>
        </div>
    `;

    app.innerHTML = mainHTML;
}

function setupNavigation() {
    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await api.users.getCurrent().then(() => account.deleteSession('current'));
            window.location.href = '/landing/';
        } catch (error) {
             // If creating session fails (unlikely if we are here), force redirect
             window.location.href = '/landing/';
        }
    });
}

async function handleRoute() {
    const hash = window.location.hash || '#events';
    const viewConfig = views[hash] || views['#events'];

    // Update Sidebar Active State
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const linkHash = link.getAttribute('href');
        if (linkHash === hash) {
            link.classList.add('active', 'bg-white', 'text-primary');
            link.classList.remove('text-white');
            link.querySelector('img').style.filter = 'invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%)'; // Deep Teal
        } else {
            link.classList.remove('active', 'bg-white', 'text-primary');
            link.classList.add('text-white');
            link.querySelector('img').style.filter = 'invert(1)'; // White
        }
    });

    // Close offcanvas on mobile if open
    const sidebarEl = document.getElementById('sidebarMenu');
    const bsOffcanvas = Offcanvas.getInstance(sidebarEl);
    if (bsOffcanvas && window.innerWidth < 992) bsOffcanvas.hide();

    // Render View
    const mainContent = document.getElementById(MAIN_CONTENT_ID);
    mainContent.innerHTML = `<div class="d-flex justify-content-center p-5 mt-5"><div class="spinner-border text-primary" role="status"></div></div>`;

    try {
        // Pass the STUDENT profile doc and the current account user
        // We pass studentDoc (profile) as first arg because views rely on it more.
        const view = viewConfig.render(studentDoc, currentUser);

        if (view instanceof Promise) {
            const rendered = await view;
            mainContent.innerHTML = rendered.html;
            if (rendered.afterRender) {
                rendered.afterRender();
            }
        } else {
            mainContent.innerHTML = view.html;
            if (view.afterRender) {
                view.afterRender();
            }
        }
    } catch (error) {
        console.error("Render Error:", error);
        mainContent.innerHTML = `<div class="container p-5"><div class="alert alert-danger shadow-sm border-0 rounded-3">
            <h5 class="fw-bold"><i class="bi bi-exclamation-triangle-fill me-2"></i>Error loading view</h5>
            <p class="mb-0">${error.message}</p>
        </div></div>`;
    }
}

// Start
init();
