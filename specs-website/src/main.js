import './style.css';

// --- 1. Imports ---
// Import all necessary components and Appwrite services
import { account, databases } from './appwrite.js'; // Make sure to import 'databases'
import renderLanding from './views/landing.js';
import renderLogin from './views/login.js';
import renderSignup from './views/signup.js';
import renderDashboard from './views/dashboard.js';
import renderAdminPage from './views/adminpage.js';
import renderCheckEmailPage from './views/checkEmail.js';
import renderVerifyPage from './views/verifyEmail.js';
import renderPendingVerification from './views/pendingVerification.js';

// --- 2. Configuration ---
// Centralize your Appwrite IDs for easy management
const COLLECTION_ID_STUDENTS = '685767a8002f47cbef39';
const DATABASE_ID = '685399d600072f4385eb';

const app = document.getElementById('app');

/**
 * Route Configuration
 * Defines all possible pages in the application.
 */
const routes = [
  // Public routes (anyone can see)
  { path: '', component: renderLanding, requiresAuth: false, redirectIfAuth: false },
  { path: 'home', component: renderLanding, requiresAuth: false, redirectIfAuth: false },
  { path: 'check-email', component: renderCheckEmailPage, requiresAuth: false, redirectIfAuth: false },
  { path: 'verify-email', component: renderVerifyPage, requiresAuth: false, redirectIfAuth: false },

  // Guest-only routes (only logged-out users can see)
  { path: 'login', component: renderLogin, requiresAuth: false, redirectIfAuth: true },
  { path: 'signup', component: renderSignup, requiresAuth: false, redirectIfAuth: true },

  // Private routes (must be logged in)
  { path: 'dashboard', component: renderDashboard, requiresAuth: true, redirectIfAuth: false },
  { path: 'adminpage', component: renderAdminPage, requiresAuth: true, redirectIfAuth: false },
  { path: 'pending-verification', component: renderPendingVerification, requiresAuth: true, redirectIfAuth: false },
];

/**
 * The main application router.
 * Handles navigation, authentication, and authorization for all pages.
 */
async function router() {
  const path = window.location.hash.slice(1) || 'home';
  const route = routes.find(r => r.path === path);

  // 1. Handle 404 - Page Not Found
  if (!route) {
    app.innerHTML = '<h1>404 - Page Not Found</h1>';
    return;
  }

  // 2. Check the user's current session status
  let currentUser = null;
  try {
    currentUser = await account.get();
  } catch (error) {
    currentUser = null;
  }
  
  // 3. Handle Guest-Only Routes (e.g., Login, Signup)
  if (route.redirectIfAuth && currentUser) {
    // If a logged-in user tries to access a guest-only page, redirect them.
    // We need to fetch their profile to know WHERE to send them.
    try {
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, currentUser.$id);
      window.location.hash = profile.type === 'admin' ? 'adminpage' : 'dashboard';
    } catch (e) {
      // This might happen for an admin who doesn't have a profile doc.
      // Default to a safe page.
      window.location.hash = 'adminpage';
    }
    return;
  }

  // 4. Handle Protected Routes
  if (route.requiresAuth) {
    if (!currentUser) {
      // If a route requires login and the user is logged out, send them to the login page.
      window.location.hash = 'login';
      return;
    }

    // --- **NEW AUTHORIZATION LOGIC** ---
    // User is logged in. Now, we check if they are *authorized* to see the page.
    try {
      // Fetch the user's profile from the database
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, currentUser.$id);
      
      if (profile.type === 'student' && !profile.verified) {
        // This is a student who is NOT verified by an admin.
        // If they are trying to access any protected page other than the 'pending' page,
        // we must redirect them.
        if (path !== 'pending-verification') {
            window.location.hash = 'pending-verification';
            return; // Stop further rendering
        }
      }
      
      if (profile.type === 'admin' && path === 'dashboard') {
        // Prevent admins from accidentally going to the student dashboard
        window.location.hash = 'adminpage';
        return;
      }

    } catch (dbError) {
      // Handle cases where the profile document might not exist (e.g., for an admin)
      // or if there's a database error.
      if (dbError.code === 404) {
          // This is likely an admin without a profile document. We can let them pass
          // if they are trying to access the admin page.
          if (path !== 'adminpage') {
              console.warn("User has no profile document. Redirecting to safety.");
              window.location.hash = 'login'; // A safe fallback
              await account.deleteSession('current');
              return;
          }
      } else {
        console.error("Database error in router:", dbError);
        app.innerHTML = '<h1>Error loading your profile. Please try again.</h1>';
        return;
      }
    }
  }
  
  // 5. If all checks pass, render the requested component
  route.component();
}

// Listen for page load and hash changes to trigger the router
window.addEventListener('load', router);
window.addEventListener('hashchange', router);