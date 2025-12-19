// views/renderAdmin/dashboard.js
import { databases, storage } from '../../shared/appwrite.js';
import { Query } from 'appwrite';
import Chart from 'chart.js/auto';

// --- SVG Icon Imports ---
import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import personExclamation from 'bootstrap-icons/icons/person-exclamation.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import fileEarmarkArrowUpFill from 'bootstrap-icons/icons/file-earmark-arrow-up-fill.svg';
import arrowUpShort from 'bootstrap-icons/icons/arrow-up-short.svg';


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
        <div class="admin-dashboard-container animate-fade-in-up">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
                <div class="mb-2 mb-md-0">
                    <h2 class="fw-bold m-0 text-primary">Dashboard Overview</h2>
                    <p class="text-muted m-0 small">Welcome back, Admin</p>
                </div>
                <div class="date text-muted small bg-light px-3 py-2 rounded-pill shadow-sm">
                    ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
            </div>

            <div class="row g-4 mb-4">
                <!-- Stat Card 1 -->
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Total Accounts</h6>
                                <div class="icon-shape bg-primary-subtle text-primary rounded-3 p-2">
                                    <img src="${peopleFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="total-accounts-stat"><span class="spinner-border spinner-border-sm text-primary"></span></h3>
                            <span class="text-success small fw-medium"><img src="${arrowUpShort}" style="width:1em;"> <span id="growth-stat">--</span>%</span> <span class="text-muted small">since last month</span>
                        </div>
                    </div>
                </div>

                <!-- Stat Card 2 -->
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift">
                         <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Pending Approval</h6>
                                <div class="icon-shape bg-warning-subtle text-warning rounded-3 p-2">
                                    <img src="${personExclamation}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="pending-verifications-stat"><span class="spinner-border spinner-border-sm text-warning"></span></h3>
                            <span class="text-muted small">Needs attention</span>
                        </div>
                    </div>
                </div>

                <!-- Stat Card 3 -->
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift">
                         <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Upcoming Events</h6>
                                <div class="icon-shape bg-info-subtle text-info rounded-3 p-2">
                                    <img src="${calendarEventFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="upcoming-events-stat"><span class="spinner-border spinner-border-sm text-info"></span></h3>
                             <span class="text-muted small">Scheduled</span>
                        </div>
                    </div>
                </div>

                <!-- Stat Card 4 -->
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift">
                         <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Files Uploaded</h6>
                                <div class="icon-shape bg-secondary-subtle text-secondary rounded-3 p-2">
                                    <img src="${fileEarmarkArrowUpFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="total-files-stat"><span class="spinner-border spinner-border-sm text-secondary"></span></h3>
                            <span class="text-muted small">Total documents</span>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Charts Row -->
            <div class="row g-4">
                <div class="col-lg-8">
                     <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 border-0">
                            <h6 class="m-0 fw-bold text-primary">Account Growth Analysis</h6>
                        </div>
                        <div class="card-body pt-0" style="height: 350px; position: relative;">
                            <canvas id="accountGrowthChart"></canvas>
                        </div>
                    </div>
                </div>
                <div class="col-lg-4">
                     <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 border-0">
                            <h6 class="m-0 fw-bold text-primary">User Distribution</h6>
                        </div>
                        <div class="card-body pt-0 d-flex justify-content-center align-items-center" style="height: 350px;">
                            <canvas id="userTypeChart"></canvas>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <style>
            .hover-lift { transition: transform 0.2s; }
            .hover-lift:hover { transform: translateY(-5px); }
            .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
            @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
        </style>
    `;
}

// --- LOGIC AND EVENT LISTENERS ---
async function attachDashboardListeners() {
    const totalAccountsEl = document.getElementById('total-accounts-stat');
    const pendingVerificationsEl = document.getElementById('pending-verifications-stat');
    const upcomingEventsEl = document.getElementById('upcoming-events-stat');
    const totalFilesEl = document.getElementById('total-files-stat');
    const growthStatEl = document.getElementById('growth-stat');
    
    const growthChartCanvas = document.getElementById('accountGrowthChart');
    const typeChartCanvas = document.getElementById('userTypeChart');

    try {
        const [usersResponse, eventsResponse, filesResponse] = await Promise.all([
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.greaterThan('date_to_held', new Date().toISOString())]),
            databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.limit(1)]) // Just need count
        ]);

        const allAccounts = usersResponse.documents;
        const studentAccounts = allAccounts.filter(u => u.type !== 'admin');
        const pendingVerifications = studentAccounts.filter(u => !u.verified).length;

        // Calculate generic growth (this month vs last month simple approx)
        const now = new Date();
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(now.getDate() - 30);
        
        const newUsersLast30Days = allAccounts.filter(u => new Date(u.$createdAt) > thirtyDaysAgo).length;
        const totalUsers = allAccounts.length;
        // Avoid division by zero
        const previousTotal = totalUsers - newUsersLast30Days;
        const growthPercentage = previousTotal > 0 ? ((newUsersLast30Days / previousTotal) * 100).toFixed(1) : 100;

        totalAccountsEl.textContent = totalUsers;
        growthStatEl.textContent = growthPercentage;
        pendingVerificationsEl.textContent = pendingVerifications;
        upcomingEventsEl.textContent = eventsResponse.total;
        totalFilesEl.textContent = filesResponse.total;

        if (accountChart) accountChart.destroy();
        if (userTypeChart) userTypeChart.destroy();

        // Line Chart Data Preparation
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

        // --- Chart Styling Config ---
        Chart.defaults.font.family = "'Poppins', 'Segoe UI', sans-serif";
        Chart.defaults.color = '#64748b';

        accountChart = new Chart(growthChartCanvas, {
            type: 'line', 
            data: { 
                labels: chartLabels, 
                datasets: [{
                    label: 'New Accounts', 
                    data: chartData, 
                    fill: true,
                    backgroundColor: (context) => {
                        const ctx = context.chart.ctx;
                        const gradient = ctx.createLinearGradient(0, 0, 0, 300);
                        gradient.addColorStop(0, 'rgba(13, 107, 102, 0.2)');
                        gradient.addColorStop(1, 'rgba(13, 107, 102, 0.0)');
                        return gradient;
                    },
                    borderColor: '#0d6b66',
                    borderWidth: 2,
                    tension: 0.4, 
                    pointBackgroundColor: '#ffffff',
                    pointBorderColor: '#0d6b66',
                    pointBorderWidth: 2,
                    pointRadius: 3,
                    pointHoverRadius: 5
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                scales: { 
                    y: { 
                        beginAtZero: true, 
                        grid: { borderDash: [5, 5], color: '#f1f5f9' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        grid: { display: false }
                    }
                }, 
                plugins: { 
                    legend: { display: false },
                    tooltip: {
                        backgroundColor: '#1e293b',
                        padding: 10,
                        cornerRadius: 8,
                        displayColors: false
                    }
                }
            }
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
                    backgroundColor: ['#0d6b66', '#f4a261'],
                    hoverOffset: 4,
                    borderWidth: 0
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                plugins: { 
                    legend: { position: 'bottom', labels: { usePointStyle: true, padding: 20 } }
                },
                cutout: '70%'
            }
        });

    } catch (error) {
        console.error("Failed to load dashboard data:", error);
        totalAccountsEl.textContent = '-';
        pendingVerificationsEl.textContent = '-';
        upcomingEventsEl.textContent = '-';
        totalFilesEl.textContent = '-';
        growthChartCanvas.parentElement.innerHTML = `<p class="text-danger text-center">Could not load chart data.</p>`;
        typeChartCanvas.parentElement.innerHTML = `<p class="text-danger text-center">Could not load chart data.</p>`;
    }
}

// --- Main export ---
export default function renderAdminDashboardView() {
    return {
        html: getDashboardHTML(),
        afterRender: attachDashboardListeners
    };
}
