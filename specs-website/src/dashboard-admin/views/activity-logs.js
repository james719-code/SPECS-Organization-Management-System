import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import clockHistory from 'bootstrap-icons/icons/clock-history.svg';
import personFill from 'bootstrap-icons/icons/person-fill.svg';
import calendarEvent from 'bootstrap-icons/icons/calendar-event.svg';
import filterIcon from 'bootstrap-icons/icons/funnel.svg';
import downloadIcon from 'bootstrap-icons/icons/download.svg';
import trashIcon from 'bootstrap-icons/icons/trash.svg';
import infoCircle from 'bootstrap-icons/icons/info-circle.svg';

/**
 * Activity Logs View - Frontend tracking of admin actions
 * Stores logs in localStorage for demonstration purposes
 */

const LOG_STORAGE_KEY = 'admin_activity_logs';
const MAX_LOGS = 500;

// Current user context (set when dashboard loads)
let currentUserContext = null;

/**
 * Set the current user context for activity logging
 * @param {Object} user - User object with name/username
 * @param {Object} profile - Profile object with username
 */
export function setCurrentUser(user, profile) {
    currentUserContext = {
        id: user?.$id || profile?.$id,
        name: profile?.username || user?.name || 'Unknown User'
    };
}

/**
 * Get the current user's display name
 */
function getCurrentUserName() {
    return currentUserContext?.name || 'Unknown User';
}

// Activity types with icons and colors
const ACTIVITY_TYPES = {
    account_created: { icon: 'bi-person-plus', color: 'success', label: 'Account Created' },
    account_verified: { icon: 'bi-check-circle', color: 'success', label: 'Account Verified' },
    account_promoted: { icon: 'bi-arrow-up-circle', color: 'info', label: 'Promoted to Officer' },
    account_demoted: { icon: 'bi-arrow-down-circle', color: 'warning', label: 'Demoted to Student' },
    account_deactivated: { icon: 'bi-person-slash', color: 'secondary', label: 'Account Deactivated' },
    account_reactivated: { icon: 'bi-person-check', color: 'success', label: 'Account Reactivated' },
    account_deleted: { icon: 'bi-trash', color: 'danger', label: 'Account Deleted' },
    password_reset: { icon: 'bi-key', color: 'warning', label: 'Password Reset' },
    event_created: { icon: 'bi-calendar-plus', color: 'primary', label: 'Event Created' },
    event_deleted: { icon: 'bi-calendar-x', color: 'danger', label: 'Event Deleted' },
    file_uploaded: { icon: 'bi-file-arrow-up', color: 'primary', label: 'File Uploaded' },
    file_deleted: { icon: 'bi-file-minus', color: 'danger', label: 'File Deleted' },
    payment_created: { icon: 'bi-cash-coin', color: 'success', label: 'Payment Created' },
    payment_marked_paid: { icon: 'bi-check2-square', color: 'success', label: 'Payment Marked Paid' },
    bulk_action: { icon: 'bi-collection', color: 'info', label: 'Bulk Action' },
    login: { icon: 'bi-box-arrow-in-right', color: 'primary', label: 'Login' },
    logout: { icon: 'bi-box-arrow-right', color: 'secondary', label: 'Logout' },
    export_data: { icon: 'bi-download', color: 'info', label: 'Data Exported' },
    other: { icon: 'bi-activity', color: 'secondary', label: 'Other Activity' }
};

/**
 * Log an activity (call this from other parts of the admin dashboard)
 */
export function logActivity(type, description, metadata = {}) {
    try {
        const logs = getActivityLogs();
        const newLog = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            type,
            description,
            metadata,
            timestamp: new Date().toISOString(),
            user: getCurrentUserName()
        };

        logs.unshift(newLog);

        // Keep only the latest MAX_LOGS entries
        if (logs.length > MAX_LOGS) {
            logs.splice(MAX_LOGS);
        }

        localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch (error) {
        console.error('Failed to log activity:', error);
    }
}

/**
 * Get all activity logs from localStorage
 */
function getActivityLogs() {
    try {
        const stored = localStorage.getItem(LOG_STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    } catch (error) {
        console.error('Failed to retrieve activity logs:', error);
        return [];
    }
}

/**
 * Clear all activity logs
 */
function clearActivityLogs() {
    localStorage.removeItem(LOG_STORAGE_KEY);
    toast.success('Activity logs cleared');
}

/**
 * Export logs to CSV
 */
function exportLogsToCSV(logs) {
    const headers = ['Timestamp', 'Type', 'Description', 'User'];
    const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        ACTIVITY_TYPES[log.type]?.label || log.type,
        log.description,
        log.user
    ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('Activity logs exported to CSV');
}

/**
 * Create log entry HTML
 */
function createLogEntryHTML(log) {
    const activityType = ACTIVITY_TYPES[log.type] || ACTIVITY_TYPES.other;
    const timeAgo = getTimeAgo(new Date(log.timestamp));
    const fullDate = new Date(log.timestamp).toLocaleString();

    return `
        <div class="log-entry card border-0 shadow-sm mb-3 hover-shadow" data-log-id="${log.id}">
            <div class="card-body p-3">
                <div class="d-flex align-items-start gap-3">
                    <div class="log-icon bg-${activityType.color}-subtle text-${activityType.color} rounded-circle d-flex align-items-center justify-content-center flex-shrink-0" style="width: 40px; height: 40px;">
                        <i class="bi ${activityType.icon}" style="font-size: 1.1rem;"></i>
                    </div>
                    <div class="flex-grow-1">
                        <div class="d-flex justify-content-between align-items-start mb-1">
                            <h6 class="mb-0 fw-bold text-dark">${activityType.label}</h6>
                            <span class="badge bg-light text-muted small">${timeAgo}</span>
                        </div>
                        <p class="mb-2 text-secondary small">${log.description}</p>
                        <div class="d-flex align-items-center gap-3 text-muted small">
                            <span><i class="bi bi-person me-1"></i>${log.user}</span>
                            <span title="${fullDate}"><i class="bi bi-clock me-1"></i>${fullDate}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Get human-readable time ago
 */
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval !== 1 ? 's' : ''} ago`;
        }
    }

    return 'Just now';
}

/**
 * Get main HTML template
 */
function getActivityLogsHTML() {
    return `
        <div class="activity-logs-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5 gy-4">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">Activity Logs</h1>
                    <p class="text-muted mb-0">Track and monitor admin actions and system events</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                        <button id="exportLogsBtn" class="btn btn-outline-primary btn-sm rounded-pill px-4 d-flex align-items-center gap-2">
                            <img src="${downloadIcon}" style="width: 1rem; opacity: 0.7;"> Export CSV
                        </button>
                        <button id="clearLogsBtn" class="btn btn-outline-danger btn-sm rounded-pill px-4 d-flex align-items-center gap-2">
                            <img src="${trashIcon}" style="width: 1rem; opacity: 0.7;"> Clear All
                        </button>
                    </div>
                </div>
            </header>

            <div class="row mb-4">
                <div class="col-12">
                    <div class="card border-0 shadow-sm">
                        <div class="card-body p-4">
                            <div class="row g-3">
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted">FILTER BY TYPE</label>
                                    <select id="typeFilter" class="form-select">
                                        <option value="all">All Activities</option>
                                        <option value="account_created">Account Created</option>
                                        <option value="account_verified">Account Verified</option>
                                        <option value="account_promoted">Promoted to Officer</option>
                                        <option value="account_demoted">Demoted to Student</option>
                                        <option value="account_deactivated">Account Deactivated</option>
                                        <option value="account_reactivated">Account Reactivated</option>
                                        <option value="account_deleted">Account Deleted</option>
                                        <option value="event_created">Event Created</option>
                                        <option value="event_deleted">Event Deleted</option>
                                        <option value="file_uploaded">File Uploaded</option>
                                        <option value="file_deleted">File Deleted</option>
                                        <option value="payment_created">Payment Created</option>
                                        <option value="payment_marked_paid">Payment Marked Paid</option>
                                        <option value="bulk_action">Bulk Action</option>
                                        <option value="export_data">Data Exported</option>
                                    </select>
                                </div>
                                <div class="col-md-6">
                                    <label class="form-label small fw-bold text-muted">SEARCH</label>
                                    <input type="search" id="searchLogs" class="form-control" placeholder="Search descriptions...">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div id="logsContainer" class="logs-list">
                <div class="text-center py-5">
                    <div class="spinner-border text-primary" role="status"></div>
                </div>
            </div>

            <div id="emptyState" class="text-center py-5" style="display: none;">
                <div class="bg-light rounded-circle d-inline-flex align-items-center justify-content-center mb-3" style="width: 100px; height: 100px;">
                    <img src="${clockHistory}" style="width: 50px; opacity: 0.2;">
                </div>
                <h4 class="fw-bold text-dark">No Activity Logs</h4>
                <p class="text-muted">Admin actions will appear here once logged.</p>
            </div>
        </div>

        <style>
            .log-entry {
                transition: all 0.2s ease;
            }
            .log-entry:hover {
                transform: translateY(-2px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
            }
            .hover-shadow {
                transition: box-shadow 0.2s ease;
            }
        </style>
    `;
}

/**
 * Attach event listeners and load logs
 */
async function attachActivityLogsListeners() {
    const logsContainer = document.getElementById('logsContainer');
    const emptyState = document.getElementById('emptyState');
    const exportBtn = document.getElementById('exportLogsBtn');
    const clearBtn = document.getElementById('clearLogsBtn');
    const typeFilter = document.getElementById('typeFilter');
    const searchInput = document.getElementById('searchLogs');

    let allLogs = [];
    let searchTimeout;

    // Load existing logs
    const existingLogs = getActivityLogs();

    const renderLogs = (logs) => {
        if (logs.length === 0) {
            logsContainer.style.display = 'none';
            emptyState.style.display = 'block';
        } else {
            logsContainer.style.display = 'block';
            emptyState.style.display = 'none';
            logsContainer.innerHTML = logs.map(createLogEntryHTML).join('');
        }
    };

    const applyFilters = () => {
        const typeValue = typeFilter.value;
        const searchTerm = searchInput.value.toLowerCase().trim();

        let filtered = allLogs;

        // Filter by type
        if (typeValue !== 'all') {
            filtered = filtered.filter(log => log.type === typeValue);
        }

        // Filter by search term
        if (searchTerm) {
            filtered = filtered.filter(log =>
                log.description.toLowerCase().includes(searchTerm) ||
                log.user.toLowerCase().includes(searchTerm)
            );
        }

        renderLogs(filtered);
    };

    const loadLogs = () => {
        allLogs = getActivityLogs();
        applyFilters();
    };

    // Initial load
    loadLogs();

    // Export logs
    if (exportBtn) {
        exportBtn.addEventListener('click', () => {
            if (allLogs.length === 0) {
                toast.info('No logs to export');
                return;
            }
            exportLogsToCSV(allLogs);
        });
    }

    // Clear logs
    if (clearBtn) {
        clearBtn.addEventListener('click', async () => {
            if (allLogs.length === 0) {
                toast.info('No logs to clear');
                return;
            }

            if (!await confirmAction('Clear Activity Logs', 'Are you sure you want to clear all activity logs? This action cannot be undone.', 'Clear All', 'danger')) return;
            clearActivityLogs();
            loadLogs();
        });
    }

    // Filter listeners
    if (typeFilter) {
        typeFilter.addEventListener('change', applyFilters);
    }

    if (searchInput) {
        searchInput.addEventListener('input', () => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(applyFilters, 300);
        });
    }
}

export default function renderActivityLogsView() {
    return {
        html: getActivityLogsHTML(),
        afterRender: attachActivityLogsListeners
    };
}
