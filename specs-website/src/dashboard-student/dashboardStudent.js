
import { api } from '../shared/api.js';
import { account } from '../shared/appwrite.js';
import { prefetchModule } from '../shared/lazyLoadHelper.js';
import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import { Offcanvas, Tooltip } from 'bootstrap';
import './dashboardStudent.scss';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

const viewModules = {
    events: () => import('./views/events.js'),
    profile: () => import('./views/profile.js'),
    payments: () => import('./views/payments.js'),
    posts: () => import('./views/posts.js'),
    attendance: () => import('./views/attendance.js')
};

const loadedModules = new Map();

function prefetchCommonViews() {
    prefetchModule(viewModules.profile);
    prefetchModule(viewModules.payments);
}

import logo from '/logo.webp';
import calendarIcon from 'bootstrap-icons/icons/calendar-event.svg';
import personIcon from 'bootstrap-icons/icons/person.svg';
import walletIcon from 'bootstrap-icons/icons/wallet2.svg';
import boxArrowRightIcon from 'bootstrap-icons/icons/box-arrow-right.svg';
import listIcon from 'bootstrap-icons/icons/list.svg';
import bellIcon from 'bootstrap-icons/icons/bell.svg';
import globeIcon from 'bootstrap-icons/icons/globe.svg';
import fileTextIcon from 'bootstrap-icons/icons/file-text.svg';
import clipboardCheckIcon from 'bootstrap-icons/icons/clipboard-check.svg';

const MAIN_CONTENT_ID = 'dashboard-content';

let currentUser = null;
let accountDoc = null;
let studentDoc = null;

const viewMeta = {
    '#events': { moduleKey: 'events', title: 'Events', icon: calendarIcon },
    '#profile': { moduleKey: 'profile', title: 'My Profile', icon: personIcon },
    '#payments': { moduleKey: 'payments', title: 'My Payments', icon: walletIcon },
    '#attendance': { moduleKey: 'attendance', title: 'Attendance', icon: clipboardCheckIcon },
    '#posts': { moduleKey: 'posts', title: 'My Posts', icon: fileTextIcon },
    '': { moduleKey: 'events', title: 'Events', icon: calendarIcon }
};

async function init() {
    try {
        // 0. Clean up any zombie backdrops from previous sessions/reloads
        cleanupBootstrapEffects();

        // Use mock data in dev mode
        if (DEV_BYPASS) {
            const { getDevUser } = await import('../shared/mock/devUtils.js');
            const { mockStudents } = await import('../shared/mock/mockData.js');
            const mockUser = getDevUser('student');
            currentUser = { $id: mockUser.$id, email: mockUser.email, name: mockUser.name };
            accountDoc = mockUser;
            // Find the matching student document based on the user's linked student ID
            const linkedStudentId = mockUser.students?.$id;
            studentDoc = mockStudents.find(s => s.$id === linkedStudentId) || mockStudents[0];
            console.log('[DEV] Using mock student user:', mockUser.email, '-> studentDoc:', studentDoc?.name);
        } else {
            // 1. Get Auth User
            currentUser = await api.users.getCurrent();

            // 2. Get Account Identity
            accountDoc = await api.users.getAccount(currentUser.$id);

            // Security Check
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

            if (!linkedStudentId) throw new Error("No linked student profile found.");

            studentDoc = await api.users.getStudentProfile(linkedStudentId);
        }

        // 4. Setup Layout & UI (for both dev and production)
        setupLayout();
        setupNavigation();
        handleRoute();
        window.addEventListener('hashchange', handleRoute);

        // Remove loading screen
        const loading = document.getElementById('loading-placeholder');
        if (loading) loading.style.opacity = 0;
        setTimeout(() => { if (loading) loading.remove(); }, 300);

        // Prefetch common views after initial render
        prefetchCommonViews();

    } catch (error) {
        console.error("Dashboard Init Error:", error);
        window.location.replace('/landing/');
    }
}

function closeSidebar() {
    const sidebarEl = document.getElementById('sidebarMenu');
    if (!sidebarEl) return;

    if (!sidebarEl.classList.contains('show')) return;

    const closeBtn = sidebarEl.querySelector('[data-bs-dismiss="offcanvas"]');
    if (closeBtn) closeBtn.click();
}

function cleanupBootstrapEffects() {
    const backdrops = document.querySelectorAll('.offcanvas-backdrop');
    if (backdrops.length > 1) {
        for (let i = 1; i < backdrops.length; i++) {
            backdrops[i].remove();
        }
    }
}

function setupLayout() {
    const app = document.getElementById('app');
    const userName = studentDoc.name || accountDoc.username || 'Student';
    const userInitial = userName.charAt(0).toUpperCase();
    const greeting = getGreeting();

    // Construct Sidebar HTML (Minimal Light Theme)
    const sidebar = `
        <div class="offcanvas-lg offcanvas-start sidebar-gradient" tabindex="-1" id="sidebarMenu" aria-labelledby="sidebarMenuLabel" style="width: 260px;">
            <div class="offcanvas-header border-bottom py-3" style="border-color: #e5e7eb !important; flex-shrink: 0;">
                <h5 class="offcanvas-title fw-bold d-flex align-items-center gap-2" id="sidebarMenuLabel">
                    <div class="logo-wrapper">
                        <img src="${logo}" alt="SPECS" width="32" height="32" class="bg-primary rounded p-1" style="filter: brightness(0) invert(1);">
                    </div>
                    <span class="brand-text">SPECS Portal</span>
                </h5>
                <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#sidebarMenu" aria-label="Close"></button>
            </div>
            <div class="offcanvas-body d-flex flex-column p-0" style="height: calc(100vh - 65px); overflow: hidden;">
                <div class="user-welcome-section px-3 py-3 border-bottom" style="border-color: #e5e7eb !important; flex-shrink: 0;">
                    <div class="d-flex align-items-center gap-3">
                        <div class="user-avatar-ring">
                            <div class="user-avatar">${userInitial}</div>
                        </div>
                        <div class="overflow-hidden">
                            <p class="mb-0 text-muted small">${greeting}</p>
                            <p class="mb-0 fw-semibold text-dark text-truncate" style="max-width: 140px;">${userName}</p>
                        </div>
                    </div>
                </div>
                
                <div class="sidebar-nav-scroll px-3 py-3" style="flex: 1 1 0%; min-height: 0; overflow-y: auto;">
                    <div class="mb-2 px-2">
                        <small class="text-uppercase fw-bold nav-section-title">Navigation</small>
                    </div>
                    <nav class="nav nav-pills flex-column gap-1">
                        ${Object.entries(viewMeta).filter(([k]) => k !== '').map(([hash, config]) => `
                            <a href="${hash}" class="nav-link d-flex align-items-center gap-3 sidebar-link">
                                <div class="nav-icon-wrapper">
                                    <img src="${config.icon}" width="16" style="opacity: 0.6;">
                                </div>
                                <span>${config.title}</span>
                            </a>
                        `).join('')}
                    </nav>

                    <div class="mt-4 mb-2 px-2">
                        <small class="text-uppercase fw-bold nav-section-title">External</small>
                    </div>
                    <nav class="nav nav-pills flex-column gap-1">
                        <a href="/landing/" class="nav-link d-flex align-items-center gap-3 sidebar-link">
                            <div class="nav-icon-wrapper">
                                <img src="${globeIcon}" width="16" style="opacity: 0.6;">
                            </div>
                            <span>Main Website</span>
                        </a>
                    </nav>
                </div>
                
                <div class="border-top p-3" style="border-color: #e5e7eb !important; flex-shrink: 0;">
                    <button id="logout-btn" class="btn btn-logout w-100 d-flex align-items-center justify-content-center gap-2">
                        <img src="${boxArrowRightIcon}" width="16" style="opacity: 0.6;">
                        <span>Sign Out</span>
                    </button>
                </div>
            </div>
        </div>
    `;

    // Construct Main Content Area
    const mainHTML = `
        <div class="d-flex dashboard-wrapper">
            ${sidebar}
            <div class="flex-grow-1 d-flex flex-column min-vh-100 main-content-area">
                <nav class="mobile-navbar d-lg-none sticky-top">
                    <div class="mobile-navbar-inner">
                        <button class="menu-toggle-btn" type="button" data-bs-toggle="offcanvas" data-bs-target="#sidebarMenu">
                            <img src="${listIcon}" width="22">
                        </button>
                        <div class="mobile-brand">
                            <img src="${logo}" alt="SPECS" width="32" height="32">
                            <div class="brand-info">
                                <span class="brand-name">SPECS</span>
                                <span class="brand-subtitle">Student Portal</span>
                            </div>
                        </div>
                        <div class="mobile-user-avatar">${userInitial}</div>
                    </div>
                </nav>
                
                <header class="desktop-topbar d-none d-lg-flex align-items-center justify-content-between px-4 py-3 bg-white border-bottom sticky-top">
                    <div class="d-flex align-items-center gap-4">
                        <h4 id="page-title" class="mb-0 fw-bold text-dark">Dashboard</h4>
                        <div class="d-none d-xl-block border-start ps-4">
                            <div class="text-muted small fw-medium">${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
                        </div>
                    </div>
                    <div class="d-flex align-items-center gap-3">
                        <button class="btn btn-light rounded-circle p-2 position-relative shadow-sm border" data-bs-toggle="tooltip" title="Notifications">
                            <img src="${bellIcon}" width="18" class="icon-primary-filter">
                            <span class="position-absolute top-1 start-100 translate-middle p-1 bg-danger border border-light rounded-circle">
                                <span class="visually-hidden">New alerts</span>
                            </span>
                        </button>
                        <div class="user-info d-flex align-items-center gap-2 px-3 py-2 rounded-pill bg-light border shadow-sm">
                            <div class="user-avatar-small bg-primary text-white">${userInitial}</div>
                            <span class="fw-medium text-dark small">${userName}</span>
                        </div>
                    </div>
                </header>
                
                <main id="${MAIN_CONTENT_ID}" class="flex-grow-1 position-relative">
                    </main>
            </div>
        </div>
    `;

    app.innerHTML = mainHTML;

    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    tooltipTriggerList.forEach(el => new Tooltip(el));
}

// Helper function to get time-based greeting
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning,';
    if (hour < 18) return 'Good afternoon,';
    return 'Good evening,';
}

function setupNavigation() {
    // Handle sidebar link clicks - close sidebar on mobile
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', () => {
            if (window.innerWidth < 992) {
                closeSidebar();
            }
        });
    });

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        const btn = e.currentTarget;
        const originalContent = btn.innerHTML;

        try {
            btn.disabled = true;
            btn.innerHTML = `<span class="spinner-border spinner-border-sm" role="status"></span> Signing out...`;
            await account.deleteSession('current');
            window.location.href = '/landing/';
        } catch (error) {
            console.error('Logout error:', error);
            btn.disabled = false;
            btn.innerHTML = originalContent;
            window.location.href = '/landing/';
        }
    });
}

async function handleRoute() {
    window.scrollTo(0, 0);
    // Sidebar closing is now handled by click handler in setupNavigation()
    // No need to close here - it causes double-close issues

    const hash = window.location.hash || '#events';
    const viewConfig = viewMeta[hash] || viewMeta['#events'];

    // Update page title
    const pageTitle = document.getElementById('page-title');
    if (pageTitle) pageTitle.textContent = viewConfig.title;
    document.title = `${viewConfig.title} | SPECS Student Portal`;

    // Update Sidebar Active State
    document.querySelectorAll('.sidebar-link').forEach(link => {
        const linkHash = link.getAttribute('href');
        const icon = link.querySelector('img');

        if (linkHash === hash) {
            link.classList.add('active');
            if (icon) {
                icon.style.filter = 'invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%)';
                icon.style.opacity = '1';
            }
        } else {
            link.classList.remove('active');
            if (icon) {
                icon.style.filter = '';
                icon.style.opacity = '0.6';
            }
        }
    });

    // Render View
    const mainContent = document.getElementById(MAIN_CONTENT_ID);

    mainContent.innerHTML = `
        <div class="d-flex flex-column align-items-center justify-content-center p-5 mt-5">
            <div class="spinner-border text-primary mb-3" role="status" style="width: 2rem; height: 2rem;">
                <span class="visually-hidden">Loading...</span>
            </div>
            <p class="text-muted small">Loading...</p>
        </div>
    `;

    try {
        // Use cached module or load dynamically
        let module;
        const moduleKey = viewConfig.moduleKey;

        if (loadedModules.has(moduleKey)) {
            module = loadedModules.get(moduleKey);
        } else {
            const importFn = viewModules[moduleKey];
            module = await importFn();
            loadedModules.set(moduleKey, module);
        }

        const renderFn = module.default;
        const view = renderFn(studentDoc, currentUser);

        if (view instanceof Promise) {
            const rendered = await view;
            mainContent.innerHTML = rendered.html;
            if (rendered.afterRender) rendered.afterRender();
        } else {
            mainContent.innerHTML = view.html;
            if (view.afterRender) view.afterRender();
        }

        // Re-initialize tooltips for any new content
        const tooltipTriggerList = mainContent.querySelectorAll('[data-bs-toggle="tooltip"]');
        tooltipTriggerList.forEach(el => new Tooltip(el));
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