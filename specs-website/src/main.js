// main.js
// Import our custom CSS
import './main.scss'

// Import all of Bootstrap’s JS
import * as bootstrap from 'bootstrap'

import { account, databases } from './appwrite.js';
import renderLanding from './views/landing.js';
import renderLogin from './views/login.js';
import renderSignup from './views/signup.js';
import renderDashboard from './views/dashboard.js';
import renderAdminPage from './views/adminpage.js';
import renderCheckEmailPage from './views/checkEmail.js';
import renderVerifyPage from './views/verifyEmail.js';
import renderPendingVerification from './views/pendingVerification.js';

const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;

const app = document.getElementById('app');

/**
 * Route Configuration
 */
const routes = {
  '': { component: renderLanding, requiresAuth: false },
  'home': { component: renderLanding, requiresAuth: false },
  'check-email': { component: renderCheckEmailPage, requiresAuth: false },
  'verify-email': { component: renderVerifyPage, requiresAuth: false },

  // Guest-only routes
  'login': { component: renderLogin, requiresAuth: false, redirectIfAuth: true },
  'signup': { component: renderSignup, requiresAuth: false, redirectIfAuth: true },

  // Private routes that require authentication and authorization
  'dashboard': { component: renderDashboard, requiresAuth: true },
  'adminpage': { component: renderAdminPage, requiresAuth: true },
  'pending-verification': { component: renderPendingVerification, requiresAuth: true },
};

/**
 * The main application router.
 */
async function router() {
  const path = window.location.hash.slice(1) || 'home';
  const route = routes[path];

  if (!route) {
    app.innerHTML = '<h1>404 - Page Not Found</h1>';
    return;
  }

  // Simplified public route handling ---
  if (!route.requiresAuth && !route.redirectIfAuth) {
    route.component();
    return;
  }

  let currentUser;
  try {
    currentUser = await account.get();
  } catch (error) {
    currentUser = null;
  }

  //Handle Guest Only Routes
  if (route.redirectIfAuth && currentUser) {
    try {
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, currentUser.$id);
      window.location.hash = profile.type === 'admin' ? 'adminpage' : 'dashboard';
    } catch (e) {
      window.location.hash = 'adminpage';
    }
    return;
  }

  // Handle Protected Routes
  if (route.requiresAuth) {
    if (!currentUser) {
      window.location.hash = 'login';
      return;
    }

    try {
      const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, currentUser.$id);
      
      if (profile.type === 'student' && !profile.verified && path !== 'pending-verification') {
        window.location.hash = 'pending-verification';
        return;
      }
      
      if (profile.type === 'admin' && path === 'dashboard') {
        window.location.hash = 'adminpage';
        return;
      }

    } catch (dbError) {
      if (dbError.code === 404 && path !== 'adminpage') {
        console.warn("User has no profile document. Redirecting to safety.");
        window.location.hash = 'login';
        await account.deleteSession('current').catch(() => {});
        return;
      } else if (dbError.code !== 404) {
        console.error("Database error in router:", dbError);
        app.innerHTML = '<h1>Error loading your profile. Please try again.</h1>';
        return;
      }
    }
    
    route.component();
  } else {
    route.component();
  }
}

// Listen for page load and hash changes to trigger the router
window.addEventListener('load', router);
window.addEventListener('hashchange', router);