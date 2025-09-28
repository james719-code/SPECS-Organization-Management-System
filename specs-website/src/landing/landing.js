// landing.js
import './landing.scss';
import { Collapse, Dropdown } from 'bootstrap';

// Import shared layout components and utilities
import { renderHeader, renderFooter, updateActiveNavLink, setupNavbarToggler } from '../shared/utils.js';

// Import page rendering functions from view modules
import { renderHomePage } from './views/home.js';
import { renderEventsPage } from './views/events.js';
import { renderAboutUsPage } from './views/about_us.js';
import { renderResourcesPage } from './views/resources.js';
import { renderStoriesPage } from './views/stories.js';
import { renderLoginPage } from './views/login.js';
import { renderSignupPage, renderVerifyEmailPage, renderPendingVerificationPage, renderCheckEmailPage } from './views/signup.js';

// The main application container in index.html
export const app = document.getElementById('app');

// --- Routes Definition ---

const standardRoutes = {
    '': renderHomePage,
    'home': renderHomePage,
    'events': renderEventsPage,
    'about': renderAboutUsPage,
    'resources': renderResourcesPage,
    'stories': renderStoriesPage,
};

const fullPageRoutes = {
    'login': renderLoginPage,
    'signup': renderSignupPage,
    'verify-email': renderVerifyEmailPage,
    'pending-verification': renderPendingVerificationPage,
    'check-email': renderCheckEmailPage
};

/**
 * Initializes the main application layout and sets up its interactive components.
 * This is only called for standard routes on the initial load.
 */
function initializeLayout() {
    // Step 1: Render the static layout HTML
    app.innerHTML = `
        ${renderHeader()}
        <main id="main-content" class="main-container"></main>
        ${renderFooter()}
    `;

    // --- THE FIX ---
    // Step 2: Run post-render setup scripts for the layout components.
    // This attaches the event listeners to make the mobile navbar close on click.
    setupNavbarToggler();
}

/**
 * The main router function.
 */
function router() {
    const path = (window.location.hash || '#').split('?')[0];
    const pathKey = path.replace('#', '') || 'home';

    const standardRenderFn = standardRoutes[pathKey];
    const fullPageRenderFn = fullPageRoutes[pathKey];

    if (fullPageRenderFn) {
        fullPageRenderFn();

    } else if (standardRenderFn) {
        // If the main layout isn't on the page yet, create it.
        if (!document.getElementById('main-content')) {
            initializeLayout();
        }

        const contentContainer = document.getElementById('main-content');
        standardRenderFn(contentContainer);
        updateActiveNavLink(path || '#home');

    } else {
        if (!document.getElementById('main-content')) {
            initializeLayout();
        }
        document.getElementById('main-content').innerHTML = `
            <div class="container text-center py-5">
                <h1 class="display-1">404</h1>
                <h2>Page Not Found</h2>
                <p class="lead">Sorry, the page you are looking for does not exist.</p>
                <a href="#home" class="btn btn-primary mt-3">Go to Homepage</a>
            </div>
        `;
    }
}

// Listen for hash changes to navigate between pages
window.addEventListener('hashchange', router);

// Render the initial page on load
window.addEventListener('load', router);