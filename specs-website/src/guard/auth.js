import { account, databases } from '../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../shared/constants.js';

// Centralized Route Configuration
const ROUTES = {
    ADMIN_DASHBOARD: '/dashboard-admin/',
    OFFICER_DASHBOARD: '/dashboard-officer/',   // Assuming you have this
    STUDENT_DASHBOARD: '/dashboard-user/',      // Your student dashboard path
    LANDING_PAGE: '/landing/',
    LOGIN_PAGE: '/landing/#login',
    PENDING_PAGE: '/landing/#pending-verification'
};

(async () => {
    const currentPath = window.location.pathname;

    // 1. Identify if we are on a "Public" page (Landing, Login, Signup)
    // We generally don't want to kick people off these pages unless they are already logged in
    const isPublicPage = currentPath.includes('/landing') || currentPath === '/';

    try {
        // 2. Check Session
        const user = await account.get();

        // 3. Fetch User Role & Status
        const profile = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_ACCOUNTS,
            user.$id
        );

        const type = profile.type; // 'admin', 'officer', 'student'
        const isVerified = profile.verified;

        // --- RULE 1: Unverified Users ---
        // If account exists but is not verified, strict quarantine.
        // They are ONLY allowed on the pending page or to logout.
        if (!isVerified && type !== 'admin') {
            // If they are inside ANY dashboard, kick them out to pending
            if (currentPath.includes('dashboard')) {
                window.location.replace(ROUTES.PENDING_PAGE);
                return;
            }
            // If they are on the landing page but NOT on pending, suggest pending
            // (Optional: usually we just let them be on landing, but ensure they can't go further)
            return;
        }

        // --- RULE 2: Role-Based Routing (The Traffic Cop) ---

        // If user is ADMIN
        if (type === 'admin') {
            // If trying to access Officer or Student dashboards -> Go to Admin
            if (currentPath.includes(ROUTES.OFFICER_DASHBOARD) || currentPath.includes(ROUTES.STUDENT_DASHBOARD)) {
                window.location.replace(ROUTES.ADMIN_DASHBOARD);
                return;
            }
            // If on Public page (Landing) -> Auto-redirect to Dashboard (Convenience)
            if (isPublicPage) {
                window.location.replace(ROUTES.ADMIN_DASHBOARD);
                return;
            }
        }

        // If user is OFFICER
        else if (type === 'officer') {
            // If trying to access Admin or Student dashboards -> Go to Officer
            if (currentPath.includes(ROUTES.ADMIN_DASHBOARD) || currentPath.includes(ROUTES.STUDENT_DASHBOARD)) {
                window.location.replace(ROUTES.OFFICER_DASHBOARD);
                return;
            }
            // If on Public page -> Auto-redirect
            if (isPublicPage) {
                window.location.replace(ROUTES.OFFICER_DASHBOARD);
                return;
            }
        }

        // If user is STUDENT
        else if (type === 'student') {
            // If trying to access Admin or Officer dashboards -> Go to Student
            if (currentPath.includes(ROUTES.ADMIN_DASHBOARD) || currentPath.includes(ROUTES.OFFICER_DASHBOARD)) {
                window.location.replace(ROUTES.STUDENT_DASHBOARD);
                return;
            }
            // If on Public page -> Auto-redirect
            if (isPublicPage) {
                window.location.replace(ROUTES.STUDENT_DASHBOARD);
                return;
            }
        }

    } catch (error) {
        // --- RULE 3: Not Logged In ---

        // If check session failed (user is guest)
        // AND they are trying to access a restricted page (Dashboards)
        if (currentPath.includes('dashboard')) {
            console.warn("Unauthorized access attempt. Redirecting to login.");
            window.location.replace(ROUTES.LOGIN_PAGE);
        }

        // If they are on public pages, do nothing (let them view the landing page)
    }
})();