// landing.js
import './landing.scss';
import { Collapse, Dropdown } from 'bootstrap';

import { renderHeader, renderFooter, updateActiveNavLink, setupNavbarToggler } from '../shared/utils.js';

// Import page rendering functions from view modules
import { renderHomePage } from './views/home.js';
import { renderEventsPage } from './views/events.js';
import { renderAboutUsPage } from './views/about_us.js';
import { renderResourcesPage } from './views/resources.js';
import { renderStoriesPage } from './views/stories.js';
import { renderLoginPage } from './views/login.js';
import { renderSignupPage, renderVerifyEmailPage, renderPendingVerificationPage, renderCheckEmailPage } from './views/signup.js';
import { renderHighlightDetailsPage } from "./views/highlights_details.js";

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
    'check-email': renderCheckEmailPage
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
            <div class="container text-center py-5" style="padding-top: 6rem !important; padding-bottom: 6rem !important;">
                <h1 class="display-1 fw-bold">404</h1>
                <h2 class="fw-semibold">Page Not Found</h2>
                <p class="lead text-muted">Sorry, the page you are looking for does not exist.</p>
                <a href="#home" class="btn btn-primary mt-3">Go to Homepage</a>
            </div>
        `;
        updateActiveNavLink('');
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', router);