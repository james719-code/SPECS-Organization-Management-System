// dashboardStudent.js
import { account, client, databases } from '../shared/appwrite.js';
import {
    DATABASE_ID,
    COLLECTION_ID_ACCOUNTS,
    COLLECTION_ID_STUDENTS
} from '../shared/constants.js';

import 'bootstrap/dist/js/bootstrap.bundle.min.js';
import '../shared/styles.scss';

// --- VIEW IMPORTS ---
import renderEventsView from './views/events.js';
import renderProfileView from './views/profile.js';
import renderPaymentsView from './views/payments.js';

// --- CONFIGURATION ---
const MAIN_CONTENT_ID = 'main-content';

// --- STATE ---
let currentUser = null;   // Appwrite Auth User
let accountDoc = null;    // Identity Document (Collection: Accounts)
let studentDoc = null;    // Profile Document (Collection: Students)

// --- ROUTING MAP ---
const views = {
    '#events': { render: renderEventsView, title: 'Events' },
    '#profile': { render: renderProfileView, title: 'My Profile' },
    '#payments': { render: renderPaymentsView, title: 'My Payments' },
    // Default
    '': { render: renderEventsView, title: 'Events' }
};

// --- INIT ---
async function init() {
    try {
        // 1. Get Auth User
        currentUser = await account.get();

        // 2. Get Account Identity
        accountDoc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_ACCOUNTS,
            currentUser.$id
        );

        // Security Check: Ensure user is actually a student and verified
        if (accountDoc.type !== 'student' || !accountDoc.verified) {
            window.location.replace('/landing/#pending-verification');
            return;
        }

        // 3. Get Linked Student Profile (FIXED LOGIC)
        // ---------------------------------------------------------
        // Appwrite might return the relationship as:
        // A. An ID string: "688..."
        // B. An Object: { $id: "688...", name: "..." }
        // C. An Array: [{ $id: "688..." }] or ["688..."]
        // ---------------------------------------------------------
        let rawStudentData = accountDoc.students;
        console.log(rawStudentData);

        // Handle Array case first
        if (Array.isArray(rawStudentData)) {
            // If empty array, we have no link
            if (rawStudentData.length === 0) throw new Error("Student link is empty.");
            rawStudentData = rawStudentData[0];
        }

        // Handle Object vs String
        const linkedStudentId = (rawStudentData && typeof rawStudentData === 'object')
            ? rawStudentData.$id
            : rawStudentData;

        if (!linkedStudentId) {
            throw new Error("No linked student profile found.");
        }

        // Fetch the full student document using the resolved ID
        studentDoc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_STUDENTS,
            linkedStudentId
        );
        // ---------------------------------------------------------

        // 4. Setup UI
        setupNavigation();
        handleRoute();
        window.addEventListener('hashchange', handleRoute);

        const displayName = studentDoc.name || accountDoc.username;
        document.getElementById('user-name-display').textContent = displayName;

    } catch (error) {
        console.error("Dashboard Init Error:", error);

        // If it's a permission/auth error, go to landing.
        // If it's a data error (missing student link), we might want to stay to debug,
        // but for production, redirecting is safer.
        window.location.replace('/landing/');
    }
}

function setupNavigation() {
    const navLinks = document.querySelectorAll('.sidebar-link');
    navLinks.forEach(link => {
        link.addEventListener('click', () => {
            // UI update handled by hashchange
        });
    });

    document.getElementById('logout-btn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await account.deleteSession('current');
            window.location.href = '/landing/';
        } catch (error) {
            console.error('Logout failed:', error);
        }
    });
}

async function handleRoute() {
    const hash = window.location.hash || '';
    const viewConfig = views[hash] || views[''];

    // Update Sidebar UI
    document.querySelectorAll('.sidebar-link').forEach(link => {
        if (link.getAttribute('href') === hash || (hash === '' && link.getAttribute('href') === '#events')) {
            link.classList.add('active', 'bg-primary', 'text-white');
        } else {
            link.classList.remove('active', 'bg-primary', 'text-white');
        }
    });

    // Render View
    const mainContent = document.getElementById(MAIN_CONTENT_ID);
    mainContent.innerHTML = `<div class="d-flex justify-content-center p-5"><div class="spinner-border text-primary" role="status"></div></div>`;

    document.getElementById('page-title').textContent = viewConfig.title;

    try {
        const view = viewConfig.render(studentDoc, currentUser);

        if (view instanceof Promise) {
            const rendered = await view;
            mainContent.innerHTML = rendered.html;
            if (rendered.afterRender) {
                rendered.afterRender();
            }
        } else {
            mainContent.innerHTML = view.html;
            if (view.afterRender) {
                view.afterRender();
            }
        }
    } catch (error) {
        console.error("Render Error:", error);
        mainContent.innerHTML = `<div class="alert alert-danger">
            <strong>Error loading view:</strong><br>
            ${error.message}
        </div>`;
    }
}

// Start
init();