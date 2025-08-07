import { account, databases } from '../shared/appwrite.js';

const ROUTES = {
    ADMIN_DASHBOARD: '/dashboard-admin/',
    USER_DASHBOARD: '/dashboard-user/',
    LANDING_PAGE: '/landing/',
    LOGIN_PAGE: '/landing/#login'
};

// Get required IDs from environment variables
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

(async () => {
    const currentPath = window.location.pathname;

    try {
        const user = await account.get();

        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);
        const userIsAdmin = profile.type === 'admin';
        const userIsVerifiedStudent = profile.type === 'student' && profile.verified;

        if (currentPath.includes(ROUTES.ADMIN_DASHBOARD)) {
            if (!userIsAdmin) {
                console.warn('Auth Guard: Non-admin user denied access to admin dashboard. Redirecting...');
                window.location.replace(ROUTES.USER_DASHBOARD);
                return;
            }
        }

        if (currentPath.includes(ROUTES.USER_DASHBOARD)) {
            if (userIsAdmin) {
                console.warn('Auth Guard: Admin user redirected from user dashboard.');
                window.location.replace(ROUTES.ADMIN_DASHBOARD);
                return;
            }
            if (!userIsVerifiedStudent) {
                console.warn('Auth Guard: Unverified student denied access. Redirecting...');
                window.location.replace(ROUTES.LANDING_PAGE);
                return;
            }
        }

    } catch (error) {
        window.location.replace(ROUTES.LOGIN_PAGE);
    }
})();