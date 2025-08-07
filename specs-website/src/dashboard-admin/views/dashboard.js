// views/renderAdmin/dashboard.js
import { databases, storage } from '../../shared/appwrite.js';
import { Query } from 'appwrite';
import Chart from 'chart.js/auto';

// --- SVG Icon Imports ---
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import personExclamation from 'bootstrap-icons/icons/person-exclamation.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import fileEarmarkArrowUpFill from 'bootstrap-icons/icons/file-earmark-arrow-up-fill.svg';


// --- CONFIGURATION ---
const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;

// To hold the chart instances
let accountChart = null;
let userTypeChart = null;

// --- HTML TEMPLATE ---
function getDashboardHTML() {
    return `
        <div class="admin-dashboard-container">
            <h2 class="mb-4">Admin Dashboard</h2>
            <div class="row g-4">
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100"><div class="card-body d-flex align-items-center">
                        <div class="flex-shrink-0 me-3"><div class="bg-primary-subtle text-primary rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;"><img src="${peopleFill}" alt="Total Accounts" style="width: 2rem; height: 2rem;"></div></div>
                        <div class="flex-grow-1"><h5 class="card-title text-muted">Total Accounts</h5><p id="total-accounts-stat" class="card-text display-5 fw-bold"><span class="spinner-border spinner-border-sm"></span></p></div>
                    </div></div>
                </div>
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100"><div class="card-body d-flex align-items-center">
                        <div class="flex-shrink-0 me-3"><div class="bg-warning-subtle text-warning-emphasis rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;"><img src="${personExclamation}" alt="Pending Verifications" style="width: 2rem; height: 2rem;"></div></div>
                        <div class="flex-grow-1"><h5 class="card-title text-muted">Pending</h5><p id="pending-verifications-stat" class="card-text display-5 fw-bold"><span class="spinner-border spinner-border-sm"></span></p></div>
                    </div></div>
                </div>
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100"><div class="card-body d-flex align-items-center">
                        <div class="flex-shrink-0 me-3"><div class="bg-info-subtle text-info-emphasis rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;"><img src="${calendarEventFill}" alt="Upcoming Events" style="width: 2rem; height: 2rem;"></div></div>
                        <div class="flex-grow-1"><h5 class="card-title text-muted">Upcoming Events</h5><p id="upcoming-events-stat" class="card-text display-5 fw-bold"><span class="spinner-border spinner-border-sm"></span></p></div>
                    </div></div>
                </div>
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100"><div class="card-body d-flex align-items-center">
                        <div class="flex-shrink-0 me-3"><div class="bg-secondary-subtle text-secondary-emphasis rounded-circle d-flex align-items-center justify-content-center" style="width: 50px; height: 50px;"><img src="${fileEarmarkArrowUpFill}" alt="Total Files" style="width: 2rem; height: 2rem;"></div></div>
                        <div class="flex-grow-1"><h5 class="card-title text-muted">Total Files</h5><p id="total-files-stat" class="card-text display-5 fw-bold"><span class="spinner-border spinner-border-sm"></span></p></div>
                    </div></div>
                </div>

                <!-- Chart Cards -->
                <div class="col-lg-7">
                     <div class="card"><div class="card-header">Account Growth (Last 30 Days)</div><div class="card-body" style="height: 300px;"><canvas id="accountGrowthChart"></canvas></div></div>
                </div>
                <div class="col-lg-5">
                     <div class="card"><div class="card-header">User Roles</div><div class="card-body" style="height: 300px;"><canvas id="userTypeChart"></canvas></div></div>
                </div>
            </div>
        </div>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachDashboardListeners() {
    const totalAccountsEl = document.getElementById('total-accounts-stat');
    const pendingVerificationsEl = document.getElementById('pending-verifications-stat');
    const upcomingEventsEl = document.getElementById('upcoming-events-stat');
    const totalFilesEl = document.getElementById('total-files-stat');
    const growthChartCanvas = document.getElementById('accountGrowthChart');
    const typeChartCanvas = document.getElementById('userTypeChart');

    try {
        const [usersResponse, eventsResponse, filesResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.greaterThan('date_to_held', new Date().toISOString())]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.limit(1)])
        ]);

        const allAccounts = usersResponse.documents;
        const studentAccounts = allAccounts.filter(u => u.type !== 'admin');
        const pendingVerifications = studentAccounts.filter(u => !u.verified).length;

        totalAccountsEl.textContent = allAccounts.length;
        pendingVerificationsEl.textContent = pendingVerifications;
        upcomingEventsEl.textContent = eventsResponse.total;
        totalFilesEl.textContent = filesResponse.total;

        if (accountChart) accountChart.destroy();
        if (userTypeChart) userTypeChart.destroy();

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const recentSignups = allAccounts.filter(u => new Date(u.$createdAt) > thirtyDaysAgo);
        const signupsByDate = recentSignups.reduce((acc, user) => {
            const date = new Date(user.$createdAt).toISOString().split('T')[0];
            acc[date] = (acc[date] || 0) + 1;
            return acc;
        }, {});

        const chartLabels = [];
        const chartData = [];
        for (let i = 29; i >= 0; i--) {
            const d = new Date();
            d.setDate(d.getDate() - i);
            const dateString = d.toISOString().split('T')[0];
            chartLabels.push(new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
            chartData.push(signupsByDate[dateString] || 0);
        }

        accountChart = new Chart(growthChartCanvas, {
            type: 'line', data: { labels: chartLabels, datasets: [{
                    label: 'New Accounts', data: chartData, fill: true,
                    backgroundColor: 'rgba(13, 107, 102, 0.2)', borderColor: 'rgb(13, 107, 102)',
                    tension: 0.3, pointBackgroundColor: 'rgb(13, 107, 102)'
                }]},
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, ticks: { stepSize: 1 }}}, plugins: { legend: { display: false }}}
        });

        const adminCount = allAccounts.length - studentAccounts.length;
        const studentCount = studentAccounts.length;
        userTypeChart = new Chart(typeChartCanvas, {
            type: 'doughnut',
            data: {
                labels: ['Students', 'Admins'],
                datasets: [{
                    label: 'User Roles',
                    data: [studentCount, adminCount],
                    backgroundColor: ['rgb(13, 107, 102)', 'rgb(255, 159, 64)'],
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' }}}
        });

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        totalAccountsEl.textContent = 'Error';
        pendingVerificationsEl.textContent = 'Error';
        upcomingEventsEl.textContent = 'Error';
        totalFilesEl.textContent = 'Error';
        growthChartCanvas.parentElement.innerHTML = `<p class="text-danger">Could not load chart data.</p>`;
        typeChartCanvas.parentElement.innerHTML = `<p class="text-danger">Could not load chart data.</p>`;
    }
}

// --- Main export ---
export default function renderAdminDashboardView() {
    return {
        html: getDashboardHTML(),
        afterRender: attachDashboardListeners
    };
}