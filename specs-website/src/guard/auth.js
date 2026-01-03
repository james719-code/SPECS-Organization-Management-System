import { account, databases } from '../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../shared/constants.js';

// Check for dev mode bypass
const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS_AUTH = IS_DEV && USE_MOCK_DATA;

// Centralized Route Configuration
const ROUTES = {
    ADMIN_DASHBOARD: '/dashboard-admin/',
    OFFICER_DASHBOARD: '/dashboard-officer/',
    STUDENT_DASHBOARD: '/dashboard-student/',
    LANDING_PAGE: '/landing/',
    LOGIN_PAGE: '/landing/#login',
    PENDING_PAGE: '/landing/#pending-verification'
};

(async () => {
    const currentPath = window.location.pathname;

    // DEV MODE: Skip auth checks if using mock data
    if (DEV_BYPASS_AUTH) {
        console.log('[DEV] Auth bypass enabled - skipping authentication checks');

        // Import dev utilities dynamically
        const { devAutoLogin, initDevLoginPanel } = await import('../shared/mock/devUtils.js');

        // Auto-login based on current dashboard
        if (currentPath.includes('/dashboard-admin/')) {
            await devAutoLogin('admin');
        } else if (currentPath.includes('/dashboard-officer/')) {
            await devAutoLogin('officer');
        } else if (currentPath.includes('/dashboard-student/')) {
            await devAutoLogin('student');
        }

        // Show dev panel on landing page
        if (currentPath.includes('/landing') || currentPath === '/') {
            setTimeout(() => initDevLoginPanel(), 500);
        }

        return; // Skip normal auth flow
    }

    // PRODUCTION MODE: Normal authentication flow
    const isPublicPage = currentPath.includes('/landing') || currentPath === '/';

    try {
        // Check Session
        const user = await account.get();

        // Fetch User Role & Status
        const profile = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_ACCOUNTS,
            user.$id
        );

        const type = profile.type;
        const isVerified = profile.verified;

        // RULE 1: Unverified Users
        if (!isVerified && type !== 'admin') {
            if (currentPath.includes('dashboard')) {
                window.location.replace(ROUTES.PENDING_PAGE);
                return;
            }
            return;
        }

        // RULE 2: Role-Based Routing

        // If user is ADMIN
        if (type === 'admin') {
            if (currentPath.includes(ROUTES.OFFICER_DASHBOARD) || currentPath.includes(ROUTES.STUDENT_DASHBOARD)) {
                window.location.replace(ROUTES.ADMIN_DASHBOARD);
                return;
            }
            if (isPublicPage) {
                window.location.replace(ROUTES.ADMIN_DASHBOARD);
                return;
            }
        }

        // If user is OFFICER
        else if (type === 'officer') {
            if (currentPath.includes(ROUTES.ADMIN_DASHBOARD) || currentPath.includes(ROUTES.STUDENT_DASHBOARD)) {
                window.location.replace(ROUTES.OFFICER_DASHBOARD);
                return;
            }
            if (isPublicPage) {
                window.location.replace(ROUTES.OFFICER_DASHBOARD);
                return;
            }
        }

        // If user is STUDENT
        else if (type === 'student') {
            if (currentPath.includes(ROUTES.ADMIN_DASHBOARD) || currentPath.includes(ROUTES.OFFICER_DASHBOARD)) {
                window.location.replace(ROUTES.STUDENT_DASHBOARD);
                return;
            }
            if (isPublicPage) {
                window.location.replace(ROUTES.STUDENT_DASHBOARD);
                return;
            }
        }

    } catch (error) {
        // RULE 3: Not Logged In
        if (currentPath.includes('dashboard')) {
            console.warn("Unauthorized access attempt. Redirecting to login.");
            window.location.replace(ROUTES.LOGIN_PAGE);
        }
    }
})();