import toast from '../../shared/toast.js';
import { confirmAction } from '../../shared/confirmModal.js';

import gearFill from 'bootstrap-icons/icons/gear-fill.svg';
import toggleOn from 'bootstrap-icons/icons/toggle-on.svg';
import palette from 'bootstrap-icons/icons/palette.svg';
import bell from 'bootstrap-icons/icons/bell.svg';

/**
 * System Settings View - Frontend configuration management
 * Stores settings in localStorage. Other views consume these via getSettings().
 */

const SETTINGS_STORAGE_KEY = 'admin_system_settings';

const DEFAULT_SETTINGS = {
    // General Settings
    organizationName: 'SPECS Organization',
    timezone: 'Asia/Manila',
    dateFormat: 'MM/DD/YYYY',
    itemsPerPage: 12,

    // Email Settings
    emailSignature: 'Best regards,\nSPECS Admin Team',

    // Dashboard Settings
    showWelcomeMessage: true,
    defaultView: 'dashboard',
    compactMode: false,

    // Data Management
    exportFormat: 'csv'
};

/**
 * Get current settings - exported for use by other views
 */
export function getSettings() {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        return stored ? { ...DEFAULT_SETTINGS, ...JSON.parse(stored) } : DEFAULT_SETTINGS;
    } catch (error) {
        console.error('Failed to retrieve settings:', error);
        return DEFAULT_SETTINGS;
    }
}

/**
 * Save settings
 */
function saveSettings(settings) {
    try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
        toast.success('Settings saved successfully');
        return true;
    } catch (error) {
        console.error('Failed to save settings:', error);
        toast.error('Failed to save settings');
        return false;
    }
}

/**
 * Reset settings to defaults
 */
function resetSettings() {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
    toast.success('Settings reset to defaults');
}

/**
 * Get main HTML template
 */
function getSettingsHTML() {
    return `
        <div class="settings-container container-fluid py-4 px-md-5">
            <header class="row align-items-center mb-5">
                <div class="col-12 col-lg-6">
                    <h1 class="display-6 fw-bold text-dark mb-1">
                        <img src="${gearFill}" alt="Settings" class="me-2" style="width: 2rem; filter: invert(31%) sepia(19%) saturate(2256%) hue-rotate(128deg) brightness(96%) contrast(89%);">
                        System Settings
                    </h1>
                    <p class="text-muted mb-0">Configure system preferences and options</p>
                </div>
                <div class="col-12 col-lg-6">
                    <div class="d-flex flex-wrap gap-3 justify-content-lg-end">
                        <button id="resetSettingsBtn" class="btn btn-outline-danger rounded-pill px-4">
                            <i class="bi bi-arrow-counterclockwise me-2"></i>Reset to Defaults
                        </button>
                        <button id="saveSettingsBtn" class="btn btn-primary rounded-pill px-4">
                            <i class="bi bi-floppy me-2"></i>Save Changes
                        </button>
                    </div>
                </div>
            </header>

            <div class="row g-4">
                <!-- General Settings -->
                <div class="col-12 col-xl-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <img src="${toggleOn}" style="width: 1.5rem; opacity: 0.7;"> General Settings
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="mb-4">
                                <label class="form-label small fw-bold text-muted">ORGANIZATION NAME</label>
                                <input type="text" id="organizationName" class="form-control" placeholder="Enter organization name">
                            </div>
                            <div class="mb-4">
                                <label class="form-label small fw-bold text-muted">TIMEZONE</label>
                                <select id="timezone" class="form-select">
                                    <option value="Asia/Manila">Asia/Manila (PHT)</option>
                                    <option value="UTC">UTC</option>
                                    <option value="America/New_York">America/New York (EST)</option>
                                    <option value="Europe/London">Europe/London (GMT)</option>
                                    <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
                                </select>
                            </div>
                            <div class="mb-4">
                                <label class="form-label small fw-bold text-muted">DATE FORMAT</label>
                                <select id="dateFormat" class="form-select">
                                    <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                                    <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                                    <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                                </select>
                            </div>
                            <div class="mb-0">
                                <label class="form-label small fw-bold text-muted">ITEMS PER PAGE</label>
                                <input type="number" id="itemsPerPage" class="form-control" min="6" max="50" step="6">
                                <div class="form-text">Number of items to display in lists and grids</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Email Settings -->
                <div class="col-12 col-xl-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <img src="${bell}" style="width: 1.5rem; opacity: 0.7;"> Email Settings
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="mb-0">
                                <label class="form-label small fw-bold text-muted">EMAIL SIGNATURE</label>
                                <textarea id="emailSignature" class="form-control" rows="3" placeholder="Enter default email signature"></textarea>
                                <div class="form-text">Used when composing announcements via the email client</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Dashboard Settings -->
                <div class="col-12 col-xl-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <img src="${palette}" style="width: 1.5rem; opacity: 0.7;"> Dashboard Preferences
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="mb-4">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="showWelcomeMessage">
                                    <label class="form-check-label" for="showWelcomeMessage">
                                        <strong>Show Welcome Message</strong>
                                        <div class="text-muted small">Display welcome banner on dashboard</div>
                                    </label>
                                </div>
                            </div>
                            <div class="mb-4">
                                <div class="form-check form-switch">
                                    <input class="form-check-input" type="checkbox" id="compactMode">
                                    <label class="form-check-label" for="compactMode">
                                        <strong>Compact Mode</strong>
                                        <div class="text-muted small">Reduce spacing and padding for more content</div>
                                    </label>
                                </div>
                            </div>
                            <div class="mb-0">
                                <label class="form-label small fw-bold text-muted">DEFAULT VIEW</label>
                                <select id="defaultView" class="form-select">
                                    <option value="dashboard">Dashboard</option>
                                    <option value="accounts">Accounts</option>
                                    <option value="events">Events</option>
                                    <option value="students">Students</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Data Export Settings -->
                <div class="col-12 col-xl-6">
                    <div class="card border-0 shadow-sm h-100">
                        <div class="card-header bg-white border-0 py-3 px-4">
                            <h5 class="mb-0 fw-bold d-flex align-items-center gap-2">
                                <i class="bi bi-download" style="font-size: 1.2rem; opacity: 0.7;"></i> Data Export
                            </h5>
                        </div>
                        <div class="card-body p-4">
                            <div class="mb-0">
                                <label class="form-label small fw-bold text-muted">DEFAULT EXPORT FORMAT</label>
                                <select id="exportFormat" class="form-select">
                                    <option value="csv">CSV</option>
                                    <option value="json">JSON</option>
                                </select>
                                <div class="form-text">Default format when exporting reports</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- About Section -->
            <div class="row mt-4">
                <div class="col-12">
                    <div class="card border-0 shadow-sm bg-light">
                        <div class="card-body p-4 text-center">
                            <p class="text-muted small mb-0">
                                <i class="bi bi-info-circle me-2"></i>
                                These settings are stored locally in your browser. For production use, integrate with backend API for persistent storage.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

/**
 * Attach event listeners
 */
async function attachSettingsListeners() {
    const saveBtn = document.getElementById('saveSettingsBtn');
    const resetBtn = document.getElementById('resetSettingsBtn');

    // Form fields
    const fields = {
        organizationName: document.getElementById('organizationName'),
        timezone: document.getElementById('timezone'),
        dateFormat: document.getElementById('dateFormat'),
        itemsPerPage: document.getElementById('itemsPerPage'),
        emailSignature: document.getElementById('emailSignature'),
        showWelcomeMessage: document.getElementById('showWelcomeMessage'),
        defaultView: document.getElementById('defaultView'),
        compactMode: document.getElementById('compactMode'),
        exportFormat: document.getElementById('exportFormat')
    };

    // Load current settings
    const loadSettings = () => {
        const settings = getSettings();

        Object.keys(fields).forEach(key => {
            const field = fields[key];
            if (!field) return;

            if (field.type === 'checkbox') {
                field.checked = settings[key];
            } else {
                field.value = settings[key];
            }
        });
    };

    // Load settings on init
    loadSettings();

    // Save settings
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            const settings = {};

            Object.keys(fields).forEach(key => {
                const field = fields[key];
                if (!field) return;

                if (field.type === 'checkbox') {
                    settings[key] = field.checked;
                } else if (field.type === 'number') {
                    settings[key] = parseInt(field.value, 10);
                } else {
                    settings[key] = field.value;
                }
            });

            saveSettings(settings);
        });
    }

    // Reset settings
    if (resetBtn) {
        resetBtn.addEventListener('click', async () => {
            if (!await confirmAction('Reset Settings', 'Reset all settings to defaults? This action cannot be undone.', 'Reset', 'danger')) return;
            resetSettings();
            loadSettings();
        });
    }
}

export default function renderSettingsView() {
    return {
        html: getSettingsHTML(),
        afterRender: attachSettingsListeners
    };
}
