import { databases, storage } from '../../shared/appwrite.js';
import { Query } from 'appwrite';
import Chart from 'chart.js/auto';
import toast from '../../shared/toast.js';

import peopleFill from 'bootstrap-icons/icons/people-fill.svg';
import personExclamation from 'bootstrap-icons/icons/person-exclamation.svg';
import calendarEventFill from 'bootstrap-icons/icons/calendar-event-fill.svg';
import fileEarmarkArrowUpFill from 'bootstrap-icons/icons/file-earmark-arrow-up-fill.svg';
import arrowUpShort from 'bootstrap-icons/icons/arrow-up-short.svg';
import arrowDownShort from 'bootstrap-icons/icons/arrow-down-short.svg';
import arrowRepeat from 'bootstrap-icons/icons/arrow-repeat.svg';

const DATABASE_ID = import.meta.env.VITE_DATABASE_ID;
const COLLECTION_ID_STUDENTS = import.meta.env.VITE_COLLECTION_ID_STUDENTS;
const COLLECTION_ID_EVENTS = import.meta.env.VITE_COLLECTION_ID_EVENTS;
const COLLECTION_ID_FILES = import.meta.env.VITE_COLLECTION_ID_FILES;

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

let accountChart = null;
let userTypeChart = null;
let refreshIntervalId = null;

function getDashboardHTML() {
    return `
        <div class="admin-dashboard-container animate-fade-in-up">
            <div class="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4">
                <div class="mb-2 mb-md-0">
                    <h2 class="fw-bold m-0 text-primary">Dashboard Overview</h2>
                    <p class="text-muted m-0 small">Welcome back, Admin</p>
                </div>
                <div class="d-flex align-items-center gap-3">
                    <button id="refreshDashboardBtn" class="btn btn-light btn-sm d-flex align-items-center gap-2 rounded-pill shadow-sm px-3" title="Refresh data">
                        <img src="${arrowRepeat}" alt="Refresh" style="width: 1rem; opacity: 0.6;">
                        <span class="d-none d-sm-inline">Refresh</span>
                    </button>
                    <div class="date text-muted small bg-light px-3 py-2 rounded-pill shadow-sm">
                        ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </div>
                </div>
            </div>

            <div class="row g-4 mb-4">
                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift stat-card" data-stat="accounts">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Total Accounts</h6>
                                <div class="icon-shape bg-primary-subtle text-primary rounded-3 p-2">
                                    <img src="${peopleFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="total-accounts-stat">
                                <div class="skeleton-loader" style="width: 60px; height: 32px;"></div>
                            </h3>
                            <div class="d-flex align-items-center gap-1">
                                <span class="growth-indicator text-success small fw-medium" id="growth-container">
                                    <img src="${arrowUpShort}" style="width:1em;"> 
                                    <span id="growth-stat">--</span>%
                                </span>
                                <span class="text-muted small">since last month</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift stat-card" data-stat="pending">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Pending Approval</h6>
                                <div class="icon-shape bg-warning-subtle text-warning rounded-3 p-2">
                                    <img src="${personExclamation}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="pending-verifications-stat">
                                <div class="skeleton-loader" style="width: 50px; height: 32px;"></div>
                            </h3>
                            <span class="text-muted small" id="pending-status">Needs attention</span>
                        </div>
                    </div>
                </div>

                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift stat-card" data-stat="events">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Upcoming Events</h6>
                                <div class="icon-shape bg-info-subtle text-info rounded-3 p-2">
                                    <img src="${calendarEventFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="upcoming-events-stat">
                                <div class="skeleton-loader" style="width: 40px; height: 32px;"></div>
                            </h3>
                            <span class="text-muted small">Scheduled</span>
                        </div>
                    </div>
                </div>

                <div class="col-sm-6 col-xl-3">
                    <div class="card h-100 border-0 shadow-sm hover-lift stat-card" data-stat="files">
                        <div class="card-body">
                            <div class="d-flex align-items-center justify-content-between mb-3">
                                <h6 class="card-subtitle text-muted text-uppercase fw-semibold" style="font-size: 0.75rem;">Files Uploaded</h6>
                                <div class="icon-shape bg-secondary-subtle text-secondary rounded-3 p-2">
                                    <img src="${fileEarmarkArrowUpFill}" alt="Icon" style="width: 1.25rem; height: 1.25rem;">
                                </div>
                            </div>
                            <h3 class="card-title fw-bold mb-1" id="total-files-stat">
                                <div class="skeleton-loader" style="width: 50px; height: 32px;"></div>
                            </h3>
                            <span class="text-muted small">Total documents</span>
                        </div>
                    </div>
                </div>
            </div>

            <div class="row g-4">
                <div class="col-lg-8">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white py-3 border-0 d-flex justify-content-between align-items-center">
                            <h6 class="m-0 fw-bold text-primary">Account Growth Analysis</h6>
                            <span class="badge bg-light text-muted small">Last 30 Days</span>
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
            
            <div class="text-center mt-3">
                <small class="text-muted" id="last-updated-time">Last updated: Just now</small>
            </div>
        </div>
        <style>
            .hover-lift { transition: transform 0.2s, box-shadow 0.2s; }
            .hover-lift:hover { transform: translateY(-5px); box-shadow: 0 8px 25px rgba(0,0,0,0.1) !important; }
            .animate-fade-in-up { animation: fadeInUp 0.5s ease-out forwards; opacity: 0; transform: translateY(20px); }
            @keyframes fadeInUp { to { opacity: 1; transform: translateY(0); } }
            .skeleton-loader {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 200% 100%;
                animation: skeleton-loading 1.5s infinite;
                border-radius: 4px;
            }
            @keyframes skeleton-loading {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
            }
            .stat-card .card-title { min-height: 32px; display: flex; align-items: center; }
            .stat-card.loading .card-title { color: transparent; }
            #refreshDashboardBtn:hover { background-color: #e9ecef; }
            #refreshDashboardBtn.refreshing img { animation: spin 1s linear infinite; }
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        </style>
    `;
}

async function attachDashboardListeners() {
    const totalAccountsEl = document.getElementById('total-accounts-stat');
    const pendingVerificationsEl = document.getElementById('pending-verifications-stat');
    const upcomingEventsEl = document.getElementById('upcoming-events-stat');
    const totalFilesEl = document.getElementById('total-files-stat');
    const growthStatEl = document.getElementById('growth-stat');
    const growthContainer = document.getElementById('growth-container');
    const pendingStatusEl = document.getElementById('pending-status');
    const lastUpdatedEl = document.getElementById('last-updated-time');
    const refreshBtn = document.getElementById('refreshDashboardBtn');

    const growthChartCanvas = document.getElementById('accountGrowthChart');
    const typeChartCanvas = document.getElementById('userTypeChart');

    /**
     * Update the "last updated" timestamp
     */
    const updateTimestamp = () => {
        if (lastUpdatedEl) {
            lastUpdatedEl.textContent = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    };

    /**
     * Animate number counting effect
     */
    const animateNumber = (element, targetValue, duration = 600) => {
        const startValue = 0;
        const startTime = performance.now();
        
        const animate = (currentTime) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            
            // Easing function for smooth animation
            const easeOutQuart = 1 - Math.pow(1 - progress, 4);
            const currentValue = Math.round(startValue + (targetValue - startValue) * easeOutQuart);
            
            element.textContent = currentValue.toLocaleString();
            
            if (progress < 1) {
                requestAnimationFrame(animate);
            }
        };
        
        requestAnimationFrame(animate);
    };

    /**
     * Load dashboard data with retry logic
     */
    const loadDashboardData = async (isRefresh = false) => {
        if (isRefresh && refreshBtn) {
            refreshBtn.classList.add('refreshing');
            refreshBtn.disabled = true;
        }

        try {
            let allAccounts, upcomingEventsCount, filesCount;

            if (DEV_BYPASS) {
                const { mockUsers, mockEvents, mockFiles, getMockDashboardStats } = await import('../../shared/mock/mockData.js');
                const stats = getMockDashboardStats();
                allAccounts = mockUsers;
                upcomingEventsCount = stats.upcomingEvents;
                filesCount = stats.totalFiles;
                console.log('[DEV] Using mock dashboard data');
            } else {
                const [usersResponse, eventsResponse, filesResponse] = await Promise.all([
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.greaterThan('date_to_held', new Date().toISOString())]),
                    databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [Query.limit(1)])
                ]);
                allAccounts = usersResponse.documents;
                upcomingEventsCount = eventsResponse.total;
                filesCount = filesResponse.total;
            }

            const studentAccounts = allAccounts.filter(u => u.type !== 'admin');
            const pendingVerifications = studentAccounts.filter(u => !u.verified).length;

            const now = new Date();
            const thirtyDaysAgo = new Date();
            thirtyDaysAgo.setDate(now.getDate() - 30);

            const newUsersLast30Days = allAccounts.filter(u => new Date(u.$createdAt) > thirtyDaysAgo).length;
            const totalUsers = allAccounts.length;
            const previousTotal = totalUsers - newUsersLast30Days;
            const growthPercentage = previousTotal > 0 ? ((newUsersLast30Days / previousTotal) * 100).toFixed(1) : 100;
            const isPositiveGrowth = parseFloat(growthPercentage) >= 0;

            // Animate stat updates
            animateNumber(totalAccountsEl, totalUsers);
            animateNumber(pendingVerificationsEl, pendingVerifications);
            animateNumber(upcomingEventsEl, upcomingEventsCount);
            animateNumber(totalFilesEl, filesCount);
            
            // Update growth indicator
            growthStatEl.textContent = Math.abs(growthPercentage);
            if (growthContainer) {
                growthContainer.className = `growth-indicator ${isPositiveGrowth ? 'text-success' : 'text-danger'} small fw-medium`;
                growthContainer.innerHTML = `
                    <img src="${isPositiveGrowth ? arrowUpShort : arrowDownShort}" style="width:1em;"> 
                    <span id="growth-stat">${Math.abs(growthPercentage)}</span>%
                `;
            }
            
            // Update pending status text
            if (pendingStatusEl) {
                if (pendingVerifications === 0) {
                    pendingStatusEl.textContent = 'All caught up!';
                    pendingStatusEl.className = 'text-success small';
                } else if (pendingVerifications > 5) {
                    pendingStatusEl.textContent = 'Needs urgent attention';
                    pendingStatusEl.className = 'text-warning small fw-medium';
                } else {
                    pendingStatusEl.textContent = 'Needs attention';
                    pendingStatusEl.className = 'text-muted small';
                }
            }

            updateTimestamp();

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
                        pointHoverRadius: 6,
                        pointHoverBackgroundColor: '#0d6b66',
                        pointHoverBorderColor: '#ffffff',
                        pointHoverBorderWidth: 2
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        intersect: false,
                        mode: 'index'
                    },
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
                            padding: 12,
                            cornerRadius: 8,
                            displayColors: false,
                            titleFont: { weight: 'bold' },
                            callbacks: {
                                label: (context) => `${context.parsed.y} new account${context.parsed.y !== 1 ? 's' : ''}`
                            }
                        }
                    }
                }
            });

            const adminCount = allAccounts.length - studentAccounts.length;
            const officerCount = studentAccounts.filter(u => u.type === 'officer').length;
            const studentCount = studentAccounts.length - officerCount;
            
            userTypeChart = new Chart(typeChartCanvas, {
                type: 'doughnut',
                data: {
                    labels: ['Students', 'Officers', 'Admins'],
                    datasets: [{
                        label: 'User Roles',
                        data: [studentCount, officerCount, adminCount],
                        backgroundColor: ['#0d6b66', '#14b8a6', '#f4a261'],
                        hoverBackgroundColor: ['#0a5450', '#0d9488', '#e8923d'],
                        hoverOffset: 8,
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { 
                            position: 'bottom', 
                            labels: { 
                                usePointStyle: true, 
                                padding: 20,
                                font: { size: 12 }
                            } 
                        },
                        tooltip: {
                            backgroundColor: '#1e293b',
                            padding: 12,
                            cornerRadius: 8,
                            callbacks: {
                                label: (context) => {
                                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                                    const percentage = ((context.parsed / total) * 100).toFixed(1);
                                    return `${context.label}: ${context.parsed} (${percentage}%)`;
                                }
                            }
                        }
                    },
                    cutout: '70%'
                }
            });

            if (isRefresh) {
                toast.success('Dashboard data refreshed successfully');
            }

        } catch (error) {
            console.error("Failed to load dashboard data:", error);
            
            totalAccountsEl.textContent = '-';
            pendingVerificationsEl.textContent = '-';
            upcomingEventsEl.textContent = '-';
            totalFilesEl.textContent = '-';
            
            growthChartCanvas.parentElement.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <i class="bi bi-exclamation-triangle display-6 mb-2 opacity-50"></i>
                    <p class="mb-2">Could not load chart data</p>
                    <button class="btn btn-sm btn-outline-primary" onclick="location.reload()">Retry</button>
                </div>
            `;
            typeChartCanvas.parentElement.innerHTML = `
                <div class="d-flex flex-column align-items-center justify-content-center h-100 text-muted">
                    <i class="bi bi-exclamation-triangle display-6 mb-2 opacity-50"></i>
                    <p class="mb-0">Could not load chart data</p>
                </div>
            `;
            
            toast.error('Failed to load dashboard data. Please try again.');
        } finally {
            if (refreshBtn) {
                refreshBtn.classList.remove('refreshing');
                refreshBtn.disabled = false;
            }
        }
    };

    // Initial load
    await loadDashboardData();

    // Refresh button handler
    if (refreshBtn) {
        refreshBtn.addEventListener('click', () => loadDashboardData(true));
    }

    // Auto-refresh every 5 minutes (optional - can be disabled)
    // refreshIntervalId = setInterval(() => loadDashboardData(false), 5 * 60 * 1000);
}

export default function renderAdminDashboardView() {
    return {
        html: getDashboardHTML(),
        afterRender: attachDashboardListeners
    };
}
