/**
 * Development Mode Utilities
 * Only included in development builds, stripped from production
 */

import { mockUsers } from './mockData.js';
import { mockApi } from './mockApiService.js';

// Check if in development mode
const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';

/**
 * Development credentials for quick login
 * These are only available in development mode
 */
export const devCredentials = {
    admin: {
        email: 'admin@specs.org',
        password: 'dev-admin-123',
        description: 'Admin Dashboard Access'
    },
    officer: {
        email: 'officer@specs.org',
        password: 'dev-officer-123',
        description: 'Officer Dashboard Access'
    },
    student: {
        email: 'john.doe@student.edu',
        password: 'dev-student-123',
        description: 'Student Dashboard Access'
    }
};

/**
 * Auto-login for development mode
 * Automatically logs in as specified user type without requiring credentials
 * @param {string} userType - 'admin', 'officer', or 'student'
 * @returns {Object} - User object
 */
export async function devAutoLogin(userType = 'admin') {
    if (!IS_DEV) {
        console.warn('devAutoLogin is only available in development mode');
        return null;
    }

    const user = mockUsers.find(u => u.type === userType);
    if (!user) {
        throw new Error(`No mock user of type: ${userType}`);
    }

    // Set the current user in mock API
    mockApi.currentUser = user;
    mockApi.currentSession = {
        $id: `dev-session-${Date.now()}`,
        userId: user.$id,
        expire: new Date(Date.now() + 86400000).toISOString()
    };

    console.log(`[DEV] Auto-logged in as ${userType}:`, user.email);
    return user;
}

/**
 * Get mock user by type
 * @param {string} userType - 'admin', 'officer', or 'student'
 * @returns {Object|null} - User object or null
 */
export function getDevUser(userType) {
    if (!IS_DEV) return null;
    return mockUsers.find(u => u.type === userType) || null;
}

/**
 * Check if should use dev bypass
 * @returns {boolean}
 */
export function shouldUseDevBypass() {
    return IS_DEV && USE_MOCK_DATA;
}

/**
 * Create dev login panel HTML
 * Shows quick login buttons for each user type
 * @returns {string} - HTML string
 */
export function createDevLoginPanel() {
    if (!IS_DEV) return '';

    return `
    <div id="dev-login-panel" style="
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
      border: 1px solid #475569;
      border-radius: 12px;
      padding: 16px;
      box-shadow: 0 10px 25px rgba(0,0,0,0.3);
      font-family: system-ui, -apple-system, sans-serif;
      max-width: 280px;
    ">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <span style="color: #f1f5f9; font-weight: 600; font-size: 14px;">Dev Quick Login</span>
        <button id="dev-panel-close" style="
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 18px;
          line-height: 1;
          padding: 0;
        ">x</button>
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px;">
        <button class="dev-login-btn" data-type="admin" style="
          background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: transform 0.1s, box-shadow 0.1s;
        ">Admin Dashboard</button>
        <button class="dev-login-btn" data-type="officer" style="
          background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: transform 0.1s, box-shadow 0.1s;
        ">Officer Dashboard</button>
        <button class="dev-login-btn" data-type="student" style="
          background: linear-gradient(135deg, #059669 0%, #047857 100%);
          color: white;
          border: none;
          padding: 10px 16px;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          font-size: 13px;
          transition: transform 0.1s, box-shadow 0.1s;
        ">Student Dashboard</button>
      </div>
      <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #475569;">
        <p style="color: #94a3b8; font-size: 11px; margin: 0; text-align: center;">
          Mock Mode: ${USE_MOCK_DATA ? 'ON' : 'OFF'}
        </p>
      </div>
    </div>
  `;
}

/**
 * Initialize dev login panel with event handlers
 */
export function initDevLoginPanel() {
    if (!IS_DEV) return;

    // Insert panel if not exists
    if (!document.getElementById('dev-login-panel')) {
        document.body.insertAdjacentHTML('beforeend', createDevLoginPanel());
    }

    // Close button
    const closeBtn = document.getElementById('dev-panel-close');
    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            const panel = document.getElementById('dev-login-panel');
            if (panel) panel.remove();
        });
    }

    // Login buttons
    document.querySelectorAll('.dev-login-btn').forEach(btn => {
        btn.addEventListener('click', async (e) => {
            const userType = e.target.dataset.type;

            try {
                await devAutoLogin(userType);

                // Redirect to appropriate dashboard
                const redirectMap = {
                    admin: '/dashboard-admin/',
                    officer: '/dashboard-officer/',
                    student: '/dashboard-student/'
                };

                window.location.href = redirectMap[userType] || '/landing/';
            } catch (error) {
                console.error('Dev login failed:', error);
                alert('Dev login failed: ' + error.message);
            }
        });

        // Hover effects
        btn.addEventListener('mouseenter', () => {
            btn.style.transform = 'translateY(-2px)';
            btn.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        });
        btn.addEventListener('mouseleave', () => {
            btn.style.transform = '';
            btn.style.boxShadow = '';
        });
    });
}

/**
 * Log dev mode status to console
 */
export function logDevStatus() {
    if (!IS_DEV) return;

    console.log('%c SPECS Dev Mode ', 'background: #1e293b; color: #22c55e; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
    console.log('%c Mock Data: ' + (USE_MOCK_DATA ? 'ENABLED' : 'DISABLED'),
        `color: ${USE_MOCK_DATA ? '#22c55e' : '#ef4444'}; font-weight: bold;`);
    console.log('%c Available Dev Logins:', 'color: #3b82f6; font-weight: bold;');
    console.table(Object.entries(devCredentials).map(([type, creds]) => ({
        Type: type,
        Email: creds.email,
        Description: creds.description
    })));
}

// Auto-initialize if in dev mode
if (IS_DEV) {
    // Log status when module loads
    logDevStatus();
}
