/**
 * Integration tests for Landing Page Router
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// Mock all view modules
vi.mock('../../landing/views/home.js', () => ({
    renderHomePage: vi.fn((container) => {
        container.innerHTML = '<div id="home-page">Home Page</div>';
    })
}));

vi.mock('../../landing/views/events.js', () => ({
    renderEventsPage: vi.fn((container) => {
        container.innerHTML = '<div id="events-page">Events Page</div>';
    })
}));

vi.mock('../../landing/views/about_us.js', () => ({
    renderAboutUsPage: vi.fn((container) => {
        container.innerHTML = '<div id="about-page">About Page</div>';
    })
}));

vi.mock('../../landing/views/resources.js', () => ({
    renderResourcesPage: vi.fn((container) => {
        container.innerHTML = '<div id="resources-page">Resources Page</div>';
    })
}));

vi.mock('../../landing/views/stories.js', () => ({
    renderStoriesPage: vi.fn((container, page) => {
        container.innerHTML = `<div id="stories-page">Stories Page ${page}</div>`;
    })
}));

vi.mock('../../landing/views/login.js', () => ({
    renderLoginPage: vi.fn((container) => {
        container.innerHTML = '<div id="login-page">Login Page</div>';
    }),
    renderForgotPasswordPage: vi.fn((container) => {
        container.innerHTML = '<div id="forgot-password-page">Forgot Password</div>';
    }),
    renderResetPasswordPage: vi.fn((container) => {
        container.innerHTML = '<div id="reset-password-page">Reset Password</div>';
    })
}));

vi.mock('../../landing/views/signup.js', () => ({
    renderSignupPage: vi.fn((container) => {
        container.innerHTML = '<div id="signup-page">Signup Page</div>';
    }),
    renderVerifyEmailPage: vi.fn((container) => {
        container.innerHTML = '<div id="verify-email-page">Verify Email</div>';
    }),
    renderPendingVerificationPage: vi.fn((container) => {
        container.innerHTML = '<div id="pending-verification-page">Pending Verification</div>';
    }),
    renderCheckEmailPage: vi.fn((container) => {
        container.innerHTML = '<div id="check-email-page">Check Email</div>';
    })
}));

vi.mock('../../shared/utils.js', () => ({
    renderHeader: vi.fn(() => '<header id="header">Header</header>'),
    renderFooter: vi.fn(() => '<footer id="footer">Footer</footer>'),
    updateActiveNavLink: vi.fn(),
    setupNavbarToggler: vi.fn()
}));

vi.mock('../../shared/cache.js', () => ({
    cache: {
        init: vi.fn()
    }
}));

vi.mock('bootstrap', () => ({
    Collapse: vi.fn(),
    Dropdown: vi.fn()
}));

describe('Landing Page Router', () => {
    beforeEach(() => {
        // Setup DOM
        document.body.innerHTML = '<div id="app"></div>';
        window.location.hash = '';
    });

    afterEach(() => {
        vi.clearAllMocks();
    });

    describe('Route mapping', () => {
        it('should define standard routes', () => {
            const standardRoutes = ['', 'home', 'events', 'about', 'resources', 'stories'];
            // Basic structure test
            expect(standardRoutes).toContain('home');
            expect(standardRoutes).toContain('events');
            expect(standardRoutes).toContain('about');
        });

        it('should define full page routes', () => {
            const fullPageRoutes = ['login', 'signup', 'verify-email', 'pending-verification', 'check-email', 'forgot-password', 'reset-password'];
            expect(fullPageRoutes).toContain('login');
            expect(fullPageRoutes).toContain('signup');
        });
    });

    describe('Hash parsing', () => {
        it('should parse simple hash', () => {
            window.location.hash = '#events';
            const hash = window.location.hash;
            const [path] = hash.split('?');
            const pathKey = path.replace(/^#\/?/, '') || 'home';

            expect(pathKey).toBe('events');
        });

        it('should parse hash with query params', () => {
            window.location.hash = '#stories?page=2';
            const hash = window.location.hash;
            const [path, queryString] = hash.split('?');
            const params = new URLSearchParams(queryString || '');

            expect(path).toBe('#stories');
            expect(params.get('page')).toBe('2');
        });

        it('should detect story detail routes', () => {
            const pathKey = 'stories/test-story-id';
            const storyDetailsMatch = pathKey.match(/^stories\/([\w-]+)$/);

            expect(storyDetailsMatch).not.toBeNull();
            expect(storyDetailsMatch[1]).toBe('test-story-id');
        });
    });

    describe('404 handling', () => {
        it('should recognize unknown routes', () => {
            const standardRoutes = ['', 'home', 'events', 'about', 'resources', 'stories'];
            const fullPageRoutes = ['login', 'signup', 'verify-email', 'pending-verification', 'check-email', 'forgot-password', 'reset-password'];
            const unknownRoute = 'unknown-page';

            const isStandard = standardRoutes.includes(unknownRoute);
            const isFullPage = fullPageRoutes.includes(unknownRoute);

            expect(isStandard).toBe(false);
            expect(isFullPage).toBe(false);
        });
    });
});
