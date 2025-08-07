// =================================================================
// AUTHENTICATION & ROLE GUARD (IMPROVED & FINAL)
// =================================================================
// This script runs in the <head> of a protected page. It verifies the user's
// session and their role, redirecting them immediately if they lack access.
// =================================================================

import { account, databases } from '../shared/appwrite.js';

// --- 1. CONFIGURATION: Centralize all paths for easy maintenance ---
const ROUTES = {
    ADMIN_DASHBOARD: '/dashboard-admin/',
    USER_DASHBOARD: '/dashboard-user/',
    LANDING_PAGE: '/landing/',
    LOGIN_PAGE: '/landing/#login' // A more direct redirect for unauthenticated users
};

// Get required IDs from environment variables
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;

/**
 * An immediately-invoked async function to protect the current page.
 */
(async () => {
    const currentPath = window.location.pathname;

    try {
        // --- 1. VERIFY SESSION ---
        // If this fails, the catch block will handle redirection immediately.
        const user = await account.get();

        // --- 2. VERIFY PROFILE & ROLE ---
        // Fetch the user's profile from the database to check their role ('type').
        const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, user.$id);
        const userIsAdmin = profile.type === 'admin';
        const userIsVerifiedStudent = profile.type === 'student' && profile.verified;

        // --- 3. APPLY ROLE-BASED ACCESS RULES ---
        // Rule A: Is a user trying to access the admin dashboard?
        if (currentPath.includes(ROUTES.ADMIN_DASHBOARD)) {
            if (!userIsAdmin) {
                console.warn('Auth Guard: Non-admin user denied access to admin dashboard. Redirecting...');
                window.location.replace(ROUTES.USER_DASHBOARD); // Send them to their correct dashboard
                return;
            }
        }

        // Rule B: Is an admin trying to access the user dashboard?
        if (currentPath.includes(ROUTES.USER_DASHBOARD)) {
            if (userIsAdmin) {
                console.warn('Auth Guard: Admin user redirected from user dashboard.');
                window.location.replace(ROUTES.ADMIN_DASHBOARD); // Send them to their correct dashboard
                return;
            }
            // Rule C: Is a student not yet verified by an admin?
            if (!userIsVerifiedStudent) {
                console.warn('Auth Guard: Unverified student denied access. Redirecting...');
                window.location.replace(ROUTES.LANDING_PAGE); // Send to landing, which will show "pending" state
                return;
            }
        }

        // --- 4. ACCESS GRANTED ---
        // If we reach this point, the user is authenticated and has the correct role.
        console.log(`✅ Auth Guard: Access granted for ${profile.type} '${user.name}' to ${currentPath}`);

    } catch (error) {
        // --- CATCH: USER IS NOT LOGGED IN ---
        console.error('Auth Guard: User is not authenticated. Redirecting to login page...');
        window.location.replace(ROUTES.LOGIN_PAGE);
    }
})();