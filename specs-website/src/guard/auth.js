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

/**
 * Check if an error indicates an expired or invalid session
 * @param {Error} error - The error to check
 * @returns {boolean} True if session is expired/invalid
 */
function isSessionExpiredError(error) {
    // Appwrite returns 401 for unauthorized/expired sessions
    if (error?.code === 401) return true;
    if (error?.type === 'user_unauthorized') return true;
    if (error?.type === 'general_unauthorized_scope') return true;
    
    // Check error message as fallback
    const message = error?.message?.toLowerCase() || '';
    return message.includes('unauthorized') || 
           message.includes('session') || 
           message.includes('expired') ||
           message.includes('not authenticated');
}

/**
 * Clear any local session data and redirect to login
 * @param {string} reason - Reason for logout (for logging)
 */
function handleSessionExpiry(reason = 'session_expired') {
    console.warn(`[Auth] Session invalid: ${reason}. Redirecting to login.`);
    
    // Clear any cached session data
    try {
        sessionStorage.removeItem('mock_user_email');
        // Clear any other session-related storage
        localStorage.removeItem('appwrite_session');
    } catch (e) {
        // Storage might be blocked
    }
    
    window.location.replace(ROUTES.LOGIN_PAGE);
}

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
        // Check Session - this will throw if session is expired/invalid
        let user;
        try {
            user = await account.get();
        } catch (sessionError) {
            // Specific handling for session errors
            if (isSessionExpiredError(sessionError)) {
                if (currentPath.includes('dashboard')) {
                    handleSessionExpiry('get_user_failed');
                }
                // Allow public pages even without session
                return;
            }
            throw sessionError; // Re-throw non-session errors
        }

        // Fetch User Role & Status
        let profile;
        try {
            profile = await databases.getDocument(
                DATABASE_ID,
                COLLECTION_ID_ACCOUNTS,
                user.$id
            );
        } catch (profileError) {
            console.error('[Auth] Failed to fetch user profile:', profileError);
            
            // If profile fetch fails due to auth, treat as session expired
            if (isSessionExpiredError(profileError)) {
                if (currentPath.includes('dashboard')) {
                    handleSessionExpiry('profile_fetch_unauthorized');
                }
                return;
            }
            
            // For other errors (e.g., profile not found), redirect to login
            if (currentPath.includes('dashboard')) {
                console.warn('[Auth] Profile not found or error. Redirecting.');
                window.location.replace(ROUTES.LOGIN_PAGE);
            }
            return;
        }

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
        // RULE 3: Handle unexpected errors
        console.error('[Auth] Unexpected error during authentication:', error);
        
        if (currentPath.includes('dashboard')) {
            // Check if it's a session-related error
            if (isSessionExpiredError(error)) {
                handleSessionExpiry('unexpected_session_error');
            } else {
                // For other errors, still redirect to login as a safety measure
                console.warn('[Auth] Unauthorized access attempt. Redirecting to login.');
                window.location.replace(ROUTES.LOGIN_PAGE);
            }
        }
    }
})();

/**
 * SECURITY NOTE:
 * This client-side authentication guard is for UX convenience only.
 * All sensitive operations MUST be protected by Appwrite's server-side
 * collection permissions and document-level security rules.
 * 
 * Client-side routing can be bypassed by disabling JavaScript.
 * Never rely solely on this guard for security.
 */