// landing.js
import './landing.scss';
import { Collapse, Dropdown } from 'bootstrap';

import { renderHeader, renderFooter, updateActiveNavLink, setupNavbarToggler } from '../shared/utils.js';
import { cache } from '../shared/cache.js';

// Import cache dev tools for debugging (only in development)
if (import.meta.env.DEV) {
    import('../shared/cache-tools.js');
}

// Import page rendering functions from view modules
import { renderHomePage } from './views/home.js';
import { renderEventsPage } from './views/events.js';
import { renderAboutUsPage } from './views/about_us.js';
import { renderResourcesPage } from './views/resources.js';
import { renderStoriesPage } from './views/stories.js';
import { renderLoginPage, renderForgotPasswordPage, renderResetPasswordPage } from './views/login.js';
import { renderSignupPage, renderVerifyEmailPage, renderPendingVerificationPage, renderCheckEmailPage } from './views/signup.js';
import { renderHighlightDetailsPage } from "./views/highlights_details.js";

// Initialize cache system on app start
cache.init();

export const app = document.getElementById('app');

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
    'check-email': renderCheckEmailPage,
    'forgot-password': renderForgotPasswordPage,
    'reset-password': renderResetPasswordPage
};

function initializeLayout() {
    app.innerHTML = `
        ${renderHeader()}
        <main id="main-content" class="main-container"></main>
        ${renderFooter()}
    `;

    setupNavbarToggler();
}

function router() {
    const [path, queryString] = (window.location.hash || '#').split('?');
    const pathKey = path.replace(/^#\/?/, '') || 'home';

    const params = new URLSearchParams(queryString || '');
    const page = parseInt(params.get('page')) || 1; // Get page number, default to 1

    const storyDetailsMatch = pathKey.match(/^stories\/([\w-]+)$/);
    const standardRenderFn = standardRoutes[pathKey];
    const fullPageRenderFn = fullPageRoutes[pathKey];

    if (storyDetailsMatch) {
        const storyId = storyDetailsMatch[1];

        if (!document.getElementById('main-content')) {
            initializeLayout();
        }

        const contentContainer = document.getElementById('main-content');
        renderHighlightDetailsPage(contentContainer, storyId);
        updateActiveNavLink('#stories'); // Keep the 'Stories' nav link active

    } else if (fullPageRenderFn) {
        fullPageRenderFn(app);

    } else if (standardRenderFn) {
        if (!document.getElementById('main-content')) {
            initializeLayout();
        }
        const contentContainer = document.getElementById('main-content');

        if (pathKey === 'stories') {
            standardRenderFn(contentContainer, page);
        } else {
            standardRenderFn(contentContainer);
        }

        updateActiveNavLink(path || '#home');
    } else {
        if (!document.getElementById('main-content')) {
            initializeLayout();
        }
        document.getElementById('main-content').innerHTML = `
            <div class="container text-center py-5" style="padding-top: 8rem !important; padding-bottom: 8rem !important;">
                <div class="d-inline-flex align-items-center justify-content-center rounded-circle mb-4" style="width: 80px; height: 80px; background: rgba(13,107,102,0.06);">
                    <span class="display-4 fw-bold" style="color: #0d6b66;">?</span>
                </div>
                <h1 class="display-1 fw-bold" style="color: #264653; letter-spacing: -2px;">404</h1>
                <h2 class="fw-semibold text-dark">Page Not Found</h2>
                <p class="lead text-muted mb-4">Sorry, the page you are looking for does not exist.</p>
                <a href="#home" class="btn btn-primary mt-3 rounded-pill px-5 fw-bold" style="background: linear-gradient(135deg, #0d6b66, #2a9d8f); border: none;">Go to Homepage</a>
            </div>
        `;
        updateActiveNavLink('');
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);