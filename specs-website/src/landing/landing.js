import './landing.scss';
import { Collapse, Dropdown } from 'bootstrap';

import { renderHeader, renderFooter, updateActiveNavLink, setupNavbarToggler } from '../shared/utils.js';
import { cache } from '../shared/cache.js';
import { prefetchModule } from '../shared/lazyLoadHelper.js';

if (import.meta.env.DEV) {
    import('../shared/cache-tools.js');
}

cache.init();

export const app = document.getElementById('app');

const viewModules = {
    home: () => import('./views/home.js'),
    events: () => import('./views/events.js'),
    about: () => import('./views/about_us.js'),
    resources: () => import('./views/resources.js'),
    stories: () => import('./views/stories.js'),
    login: () => import('./views/login.js'),
    signup: () => import('./views/signup.js'),
    highlights: () => import('./views/highlights_details.js')
};

const loadedModules = new Map();

function prefetchCommonViews() {
    prefetchModule(viewModules.login);
    prefetchModule(viewModules.signup);
}

const standardRoutes = ['', 'home', 'events', 'about', 'resources', 'stories'];

const fullPageRoutes = ['login', 'signup', 'verify-email', 'pending-verification', 'check-email', 'forgot-password', 'reset-password'];

const routeModuleMap = {
    '': 'home',
    'home': 'home',
    'events': 'events',
    'about': 'about',
    'resources': 'resources',
    'stories': 'stories',
    'login': 'login',
    'signup': 'signup',
    'verify-email': 'login',
    'forgot-password': 'login',
    'reset-password': 'login',
    'pending-verification': 'signup',
    'check-email': 'signup'
};

const viewExportMap = {
    '': 'renderHomePage',
    'home': 'renderHomePage',
    'events': 'renderEventsPage',
    'about': 'renderAboutUsPage',
    'resources': 'renderResourcesPage',
    'stories': 'renderStoriesPage',
    'login': 'renderLoginPage',
    'signup': 'renderSignupPage',
    'verify-email': 'renderVerifyEmailPage',
    'pending-verification': 'renderPendingVerificationPage',
    'check-email': 'renderCheckEmailPage',
    'forgot-password': 'renderForgotPasswordPage',
    'reset-password': 'renderResetPasswordPage'
};

function initializeLayout() {
    app.innerHTML = `
        ${renderHeader()}
        <main id="main-content" class="main-container"></main>
        ${renderFooter()}
    `;

    setupNavbarToggler();
}

async function router() {
    const [path, queryString] = (window.location.hash || '#').split('?');
    const pathKey = path.replace(/^#\/?/, '') || 'home';

    const params = new URLSearchParams(queryString || '');
    const page = parseInt(params.get('page')) || 1;

    const storyDetailsMatch = pathKey.match(/^stories\/([\w-]+)$/);
    const isStandardRoute = standardRoutes.includes(pathKey);
    const isFullPageRoute = fullPageRoutes.includes(pathKey);

    try {
        if (storyDetailsMatch) {
            const storyId = storyDetailsMatch[1];

            if (!document.getElementById('main-content')) {
                initializeLayout();
            }

            const contentContainer = document.getElementById('main-content');

            // Load highlights module
            let module;
            if (loadedModules.has('highlights')) {
                module = loadedModules.get('highlights');
            } else {
                module = await viewModules.highlights();
                loadedModules.set('highlights', module);
            }

            module.renderHighlightDetailsPage(contentContainer, storyId);
            updateActiveNavLink('#stories');

        } else if (isFullPageRoute) {
            const moduleKey = routeModuleMap[pathKey];
            const exportName = viewExportMap[pathKey];

            let module;
            if (loadedModules.has(moduleKey)) {
                module = loadedModules.get(moduleKey);
            } else {
                module = await viewModules[moduleKey]();
                loadedModules.set(moduleKey, module);
            }

            const renderFn = module[exportName];
            renderFn(app);

        } else if (isStandardRoute) {
            if (!document.getElementById('main-content')) {
                initializeLayout();
            }
            const contentContainer = document.getElementById('main-content');

            const moduleKey = routeModuleMap[pathKey] || 'home';
            const exportName = viewExportMap[pathKey] || 'renderHomePage';

            let module;
            if (loadedModules.has(moduleKey)) {
                module = loadedModules.get(moduleKey);
            } else {
                module = await viewModules[moduleKey]();
                loadedModules.set(moduleKey, module);
            }

            const renderFn = module[exportName];

            if (pathKey === 'stories') {
                renderFn(contentContainer, page);
            } else {
                renderFn(contentContainer);
            }

            updateActiveNavLink(path || '#home');
        } else {
            // 404 page
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
    } catch (error) {
        console.error('Error loading view:', error);
        if (!document.getElementById('main-content')) {
            initializeLayout();
        }
        document.getElementById('main-content').innerHTML = `
            <div class="container text-center py-5">
                <h1 class="display-4 fw-bold text-danger">Error</h1>
                <p class="lead text-muted">Failed to load the page. Please try again.</p>
                <a href="#home" class="btn btn-primary mt-3">Go to Homepage</a>
            </div>
        `;
    }
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
    router();
    // Prefetch common views after initial load
    prefetchCommonViews();
});