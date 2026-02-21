import { databases } from '../../shared/appwrite.js';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS, COLLECTION_ID_PAYMENTS, COLLECTION_ID_EVENTS } from '../../shared/constants.js';
import { Query } from 'appwrite';
import toast from '../../shared/toast.js';
import Chart from 'chart.js/auto';

import fileText from 'bootstrap-icons/icons/file-text.svg';
import download from 'bootstrap-icons/icons/download.svg';
import graph from 'bootstrap-icons/icons/graph-up.svg';

const IS_DEV = import.meta.env.DEV;
const USE_MOCK_DATA = import.meta.env.VITE_USE_MOCK_DATA === 'true';
const DEV_BYPASS = IS_DEV && USE_MOCK_DATA;

let reportChart = null;

const CHART_COLORS = ['#0d6b66', '#149a93', '#2a9d8f', '#3d8b7a', '#5a9e8f', '#74b3a5', '#094d4a', '#264653'];

// --- CSV EXPORT ---

function exportReportToCSV(data, reportName) {
    if (!data || data.length === 0) {
        toast.warning('No data to export');
        return;
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
        headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
    );

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${reportName}-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Report exported successfully');
}

// --- CHART HELPERS ---

function getMonthlyGrowth(items, dateField = '$createdAt') {
    const monthlyData = {};
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    items.forEach(item => {
        const date = new Date(item[dateField]);
        if (date >= sixMonthsAgo) {
            const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
            monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
        }
    });

    const labels = [];
    const data = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setMonth(now.getMonth() - i);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
        data.push(monthlyData[monthKey] || 0);
    }

    return { labels, data };
}

function getDistribution(items, field) {
    const distribution = items.reduce((acc, item) => {
        const val = item[field] || 'Unknown';
        acc[val] = (acc[val] || 0) + 1;
        return acc;
    }, {});

    return {
        labels: Object.keys(distribution),
        data: Object.values(distribution)
    };
}

// --- REPORT GENERATORS ---

async function generateAccountsReport(filters) {
    let accounts = [];

    if (DEV_BYPASS) {
        const { mockUsers } = await import('../../shared/mock/mockData.js');
        accounts = mockUsers;
    } else {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [Query.limit(5000)]);
        accounts = response.documents;
    }

    let filtered = accounts.filter(acc => acc.type !== 'admin');

    if (filters.accountType && filters.accountType !== 'all') {
        filtered = filtered.filter(acc => acc.type === filters.accountType);
    }
    if (filters.verificationStatus && filters.verificationStatus !== 'all') {
        filtered = filters.verificationStatus === 'verified'
            ? filtered.filter(acc => acc.verified === true)
            : filtered.filter(acc => acc.verified !== true);
    }
    if (filters.activeStatus && filters.activeStatus !== 'all') {
        filtered = filters.activeStatus === 'active'
            ? filtered.filter(acc => !acc.deactivated)
            : filtered.filter(acc => acc.deactivated === true);
    }
    if (filters.dateFrom) filtered = filtered.filter(acc => new Date(acc.$createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo) filtered = filtered.filter(acc => new Date(acc.$createdAt) <= new Date(filters.dateTo));

    const typeDistribution = getDistribution(filtered, 'type');
    const verified = filtered.filter(acc => acc.verified === true).length;
    const pending = filtered.filter(acc => acc.verified !== true).length;

    return {
        total: filtered.length,
        data: filtered.map(acc => {
            const studentData = acc.students || {};
            return {
                'Username': acc.username,
                'Name': studentData.name || '',
                'Email': studentData.email || '',
                'Type': acc.type,
                'Year Level': studentData.yearLevel || '',
                'Section': studentData.section || '',
                'Verified': acc.verified ? 'Yes' : 'No',
                'Active': acc.deactivated ? 'No' : 'Yes',
                'Joined Date': new Date(acc.$createdAt).toLocaleDateString()
            };
        }),
        charts: {
            typeDistribution,
            verificationStats: { labels: ['Verified', 'Pending'], data: [verified, pending] },
            monthlyGrowth: getMonthlyGrowth(filtered)
        },
        chartOptions: [
            { value: 'typeDistribution', label: 'Account Type Distribution' },
            { value: 'verificationStats', label: 'Verification Status' },
            { value: 'monthlyGrowth', label: 'Monthly Growth (6 months)' }
        ]
    };
}

async function generateStudentsReport(filters) {
    let students = [];

    if (DEV_BYPASS) {
        const { mockStudents } = await import('../../shared/mock/mockData.js');
        students = mockStudents || [];
    } else {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [Query.limit(5000)]);
        students = response.documents;
    }

    if (filters.dateFrom) students = students.filter(s => new Date(s.$createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo) students = students.filter(s => new Date(s.$createdAt) <= new Date(filters.dateTo));

    const yearDistribution = getDistribution(students, 'yearLevel');
    const sectionDistribution = getDistribution(students, 'section');
    const volunteerDist = getDistribution(students, 'volunteer_status');

    return {
        total: students.length,
        data: students.map(s => ({
            'Name': s.name || '',
            'Email': s.email || '',
            'Year Level': s.yearLevel || '',
            'Section': s.section || '',
            'Address': s.address || '',
            'Volunteer Status': s.volunteer_status || 'none',
            'Added Date': new Date(s.$createdAt).toLocaleDateString()
        })),
        charts: {
            yearDistribution,
            sectionDistribution,
            volunteerDistribution: volunteerDist,
            monthlyGrowth: getMonthlyGrowth(students)
        },
        chartOptions: [
            { value: 'yearDistribution', label: 'Year Level Distribution' },
            { value: 'sectionDistribution', label: 'Section Distribution' },
            { value: 'volunteerDistribution', label: 'Volunteer Status' },
            { value: 'monthlyGrowth', label: 'Monthly Growth (6 months)' }
        ]
    };
}

async function generatePaymentsReport(filters) {
    let payments = [];

    if (DEV_BYPASS) {
        const { mockPayments } = await import('../../shared/mock/mockData.js');
        payments = mockPayments || [];
    } else {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_PAYMENTS, [Query.limit(5000)]);
        payments = response.documents;
    }

    if (filters.dateFrom) payments = payments.filter(p => new Date(p.$createdAt) >= new Date(filters.dateFrom));
    if (filters.dateTo) payments = payments.filter(p => new Date(p.$createdAt) <= new Date(filters.dateTo));

    const paidCount = payments.filter(p => p.is_paid).length;
    const unpaidCount = payments.filter(p => !p.is_paid).length;
    const totalCollected = payments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalOutstanding = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);

    return {
        total: payments.length,
        data: payments.map(p => ({
            'Item': p.item_name || '',
            'Price': p.price || 0,
            'Quantity': p.quantity || 1,
            'Total': (p.price || 0) * (p.quantity || 1),
            'Status': p.is_paid ? 'Paid' : 'Unpaid',
            'Activity': p.activity || '',
            'Is Event': p.is_event ? 'Yes' : 'No',
            'Date': new Date(p.$createdAt).toLocaleDateString()
        })),
        charts: {
            paidVsUnpaid: { labels: ['Paid', 'Unpaid'], data: [paidCount, unpaidCount] },
            amountBreakdown: { labels: ['Collected', 'Outstanding'], data: [totalCollected, totalOutstanding] },
            monthlyGrowth: getMonthlyGrowth(payments)
        },
        chartOptions: [
            { value: 'paidVsUnpaid', label: 'Paid vs Unpaid Count' },
            { value: 'amountBreakdown', label: 'Amount Collected vs Outstanding' },
            { value: 'monthlyGrowth', label: 'Monthly Payments (6 months)' }
        ]
    };
}

async function generateEventsReport(filters) {
    let events = [];

    if (DEV_BYPASS) {
        const { mockEvents } = await import('../../shared/mock/mockData.js');
        events = mockEvents || [];
    } else {
        const response = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [Query.limit(5000)]);
        events = response.documents;
    }

    if (filters.dateFrom) events = events.filter(e => new Date(e.date_to_held) >= new Date(filters.dateFrom));
    if (filters.dateTo) events = events.filter(e => new Date(e.date_to_held) <= new Date(filters.dateTo));

    const now = new Date();
    const upcoming = events.filter(e => !e.event_ended && new Date(e.date_to_held) >= now).length;
    const ended = events.filter(e => e.event_ended).length;
    const past = events.filter(e => !e.event_ended && new Date(e.date_to_held) < now).length;

    return {
        total: events.length,
        data: events.map(e => ({
            'Event Name': e.event_name || '',
            'Description': e.description || '',
            'Date': new Date(e.date_to_held).toLocaleDateString(),
            'Status': e.event_ended ? 'Ended' : (new Date(e.date_to_held) < now ? 'Past' : 'Upcoming'),
            'Created': new Date(e.$createdAt).toLocaleDateString()
        })),
        charts: {
            statusDistribution: { labels: ['Upcoming', 'Past (Not Ended)', 'Ended'], data: [upcoming, past, ended] },
            monthlyEvents: getMonthlyGrowth(events, 'date_to_held')
        },
        chartOptions: [
            { value: 'statusDistribution', label: 'Event Status Distribution' },
            { value: 'monthlyEvents', label: 'Events by Month (6 months)' }
        ]
    };
}

// --- CHART RENDERING ---

function renderChart(chartData, type = 'bar') {
    const canvas = document.getElementById('reportChart');
    if (!canvas) return;

    if (reportChart) reportChart.destroy();

    reportChart = new Chart(canvas, {
        type: type,
        data: {
            labels: chartData.labels,
            datasets: [{
                label: 'Count',
                data: chartData.data,
                backgroundColor: type === 'pie' || type === 'doughnut'
                    ? CHART_COLORS.slice(0, chartData.labels.length)
                    : 'rgba(13, 107, 102, 0.8)',
                borderColor: '#0d6b66',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: type === 'pie' || type === 'doughnut',
                    position: 'bottom'
                }
            },
            scales: type === 'pie' || type === 'doughnut' ? {} : {
                y: {
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// --- FILTER HTML FOR EACH REPORT TYPE ---

const filterSections = {
    accounts: `
        <div class="col-md-6 col-xl-3">
            <label class="form-label small fw-bold text-muted">ACCOUNT TYPE</label>
            <select id="accountTypeFilter" class="form-select">
                <option value="all">All Types</option>
                <option value="student">Students Only</option>
                <option value="officer">Officers Only</option>
            </select>
        </div>
        <div class="col-md-6 col-xl-3">
            <label class="form-label small fw-bold text-muted">VERIFICATION STATUS</label>
            <select id="verificationFilter" class="form-select">
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
            </select>
        </div>
        <div class="col-md-6 col-xl-3">
            <label class="form-label small fw-bold text-muted">ACTIVE STATUS</label>
            <select id="activeStatusFilter" class="form-select">
                <option value="all">All</option>
                <option value="active">Active Only</option>
                <option value="deactivated">Deactivated Only</option>
            </select>
        </div>
    `,
    students: `
        <div class="col-md-6 col-xl-3">
            <span class="form-label small fw-bold text-muted d-block">FILTERS</span>
            <p class="text-muted small mb-0">Use date range to filter student records</p>
        </div>
    `,
    payments: `
        <div class="col-md-6 col-xl-3">
            <span class="form-label small fw-bold text-muted d-block">FILTERS</span>
            <p class="text-muted small mb-0">Use date range to filter payment records</p>
        </div>
    `,
    events: `
        <div class="col-md-6 col-xl-3">
            <span class="form-label small fw-bold text-muted d-block">FILTERS</span>
            <p class="text-muted small mb-0">Use date range to filter events</p>
        </div>
    `
};

// --- MAIN HTML ---

function getReportsHTML() {
    return `
        <div class="reports-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Reports Generator</h1>
                    <p class="text-muted mb-0">Create custom reports with advanced filtering</p>
                </div>
            </header>

            <div class="row g-4 mb-5">
                <!-- Report Filters -->
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h5 class="mb-0 fw-bold">Report Filters</h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="row g-3">
                                <div class="col-md-6 col-xl-3">
                                    <label class="form-label small fw-bold text-muted">REPORT TYPE</label>
                                    <select id="reportType" class="form-select">
                                        <option value="accounts">Accounts Summary</option>
                                        <option value="students">Students Report</option>
                                        <option value="payments">Payments Report</option>
                                        <option value="events">Events Report</option>
                                    </select>
                                </div>
                                <div id="dynamicFilters">
                                    ${filterSections.accounts}
                                </div>
                                <div class="col-md-6 col-xl-3">
                                    <label class="form-label small fw-bold text-muted">DATE FROM</label>
                                    <input type="date" id="dateFromFilter" class="form-control">
                                </div>
                                <div class="col-md-6 col-xl-3">
                                    <label class="form-label small fw-bold text-muted">DATE TO</label>
                                    <input type="date" id="dateToFilter" class="form-control">
                                </div>
                                <div class="col-md-6 col-xl-3 d-flex align-items-end">
                                    <button id="generateReportBtn" class="btn btn-primary w-100">
                                        <img src="${graph}" style="width: 1rem; filter: brightness(0) invert(1);"> Generate Report
                                    </button>
                                </div>
                                <div class="col-md-6 col-xl-3 d-flex align-items-end">
                                    <button id="exportReportBtn" class="btn btn-outline-success w-100" disabled>
                                        <img src="${download}" style="width: 1rem; opacity: 0.7;"> Export CSV
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Report Results -->
                <div class="col-12" id="reportResultsSection" style="display: none;">
                    <div class="card border-0 shadow-sm">
                        <div class="card-header bg-white border-0 py-3 px-4 d-flex justify-content-between align-items-center">
                            <h5 class="mb-0 fw-bold">Report Results</h5>
                            <span class="badge bg-primary px-3 py-2" id="totalRecordsBadge">0 records</span>
                        </div>
                        <div class="card-body p-4">
                            <!-- Chart View -->
                            <div class="mb-4">
                                <div class="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                                    <div class="d-flex align-items-center gap-2">
                                        <h6 class="fw-bold mb-0">Data Visualization</h6>
                                        <select id="chartDataSelector" class="form-select form-select-sm" style="width: auto;"></select>
                                    </div>
                                    <div class="btn-group btn-group-sm" role="group">
                                        <input type="radio" class="btn-check" name="chartType" id="chartBar" value="bar" checked>
                                        <label class="btn btn-outline-primary" for="chartBar">Bar</label>
                                        <input type="radio" class="btn-check" name="chartType" id="chartPie" value="pie">
                                        <label class="btn btn-outline-primary" for="chartPie">Pie</label>
                                        <input type="radio" class="btn-check" name="chartType" id="chartLine" value="line">
                                        <label class="btn btn-outline-primary" for="chartLine">Line</label>
                                    </div>
                                </div>
                                <div style="height: 300px; position: relative;">
                                    <canvas id="reportChart"></canvas>
                                </div>
                            </div>

                            <!-- Data Table Preview -->
                            <div>
                                <h6 class="fw-bold mb-3">Data Preview (First 10 records)</h6>
                                <div class="table-responsive">
                                    <table class="table table-hover table-sm" id="reportDataTable">
                                        <thead class="table-light">
                                            <tr></tr>
                                        </thead>
                                        <tbody></tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Empty State -->
                <div class="col-12" id="emptyReportState">
                    <div class="text-center py-5">
                        <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                            <img src="${fileText}" style="width: 50px; opacity: 0.2;">
                        </div>
                        <h5 class="fw-bold text-dark">No Report Generated</h5>
                        <p class="text-muted">Configure filters above and click "Generate Report" to create a custom report.</p>
                    </div>
                </div>
            </div>
        </div>
    `;
}

// --- EVENT LISTENERS ---

async function attachReportsListeners() {
    const generateBtn = document.getElementById('generateReportBtn');
    const exportBtn = document.getElementById('exportReportBtn');
    const resultsSection = document.getElementById('reportResultsSection');
    const emptyState = document.getElementById('emptyReportState');
    const totalRecordsBadge = document.getElementById('totalRecordsBadge');
    const dataTable = document.getElementById('reportDataTable');
    const reportTypeSelect = document.getElementById('reportType');
    const dynamicFilters = document.getElementById('dynamicFilters');
    const chartDataSelector = document.getElementById('chartDataSelector');

    let currentReportData = null;

    // Update filters when report type changes
    reportTypeSelect.addEventListener('change', () => {
        const type = reportTypeSelect.value;
        dynamicFilters.innerHTML = filterSections[type] || '';
    });

    // Chart type radio buttons
    const chartTypeInputs = document.querySelectorAll('input[name="chartType"]');

    // Chart data selector change
    chartDataSelector.addEventListener('change', () => {
        if (currentReportData && currentReportData.charts) {
            const selectedChart = currentReportData.charts[chartDataSelector.value];
            const chartType = document.querySelector('input[name="chartType"]:checked').value;
            if (selectedChart) renderChart(selectedChart, chartType);
        }
    });

    // Generate report
    generateBtn.addEventListener('click', async () => {
        generateBtn.disabled = true;
        generateBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Generating...';

        try {
            const reportType = reportTypeSelect.value;
            const filterValues = {
                accountType: document.getElementById('accountTypeFilter')?.value,
                verificationStatus: document.getElementById('verificationFilter')?.value,
                activeStatus: document.getElementById('activeStatusFilter')?.value,
                dateFrom: document.getElementById('dateFromFilter')?.value,
                dateTo: document.getElementById('dateToFilter')?.value
            };

            let reportData;
            switch (reportType) {
                case 'accounts': reportData = await generateAccountsReport(filterValues); break;
                case 'students': reportData = await generateStudentsReport(filterValues); break;
                case 'payments': reportData = await generatePaymentsReport(filterValues); break;
                case 'events': reportData = await generateEventsReport(filterValues); break;
                default: throw new Error('Unknown report type');
            }

            currentReportData = reportData;

            // Update UI
            totalRecordsBadge.textContent = `${reportData.total} record${reportData.total !== 1 ? 's' : ''}`;
            emptyState.style.display = 'none';
            resultsSection.style.display = 'block';
            exportBtn.disabled = false;

            // Populate chart data selector
            chartDataSelector.innerHTML = (reportData.chartOptions || []).map(opt =>
                `<option value="${opt.value}">${opt.label}</option>`
            ).join('');

            // Render first chart
            const firstChartKey = reportData.chartOptions?.[0]?.value;
            if (firstChartKey && reportData.charts[firstChartKey]) {
                renderChart(reportData.charts[firstChartKey], 'bar');
            }

            // Render table
            if (reportData.data.length > 0) {
                const headers = Object.keys(reportData.data[0]);
                const thead = dataTable.querySelector('thead tr');
                const tbody = dataTable.querySelector('tbody');

                thead.innerHTML = headers.map(h => `<th>${h}</th>`).join('');
                tbody.innerHTML = reportData.data.slice(0, 10).map(row =>
                    `<tr>${headers.map(h => `<td>${row[h]}</td>`).join('')}</tr>`
                ).join('');
            }

            toast.success('Report generated successfully');
        } catch (error) {
            console.error('Failed to generate report:', error);
            toast.error('Failed to generate report');
        } finally {
            generateBtn.disabled = false;
            generateBtn.innerHTML = `<img src="${graph}" style="width: 1rem; filter: brightness(0) invert(1);"> Generate Report`;
        }
    });

    // Export report
    exportBtn.addEventListener('click', () => {
        if (currentReportData && currentReportData.data) {
            const reportName = `${reportTypeSelect.value}-report`;
            exportReportToCSV(currentReportData.data, reportName);
        }
    });

    // Chart type change
    chartTypeInputs.forEach(input => {
        input.addEventListener('change', () => {
            if (currentReportData && currentReportData.charts) {
                const selectedChart = currentReportData.charts[chartDataSelector.value];
                if (selectedChart) renderChart(selectedChart, input.value);
            }
        });
    });
}

export default function renderReportsView() {
    return {
        html: getReportsHTML(),
        afterRender: attachReportsListeners
    };
}
