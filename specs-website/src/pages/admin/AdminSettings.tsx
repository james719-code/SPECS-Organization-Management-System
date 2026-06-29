import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';

interface SystemSettings {
  organizationName: string;
  timezone: string;
  dateFormat: string;
  itemsPerPage: number;
  emailSignature: string;
  showWelcomeMessage: boolean;
  compactMode: boolean;
  defaultView: string;
  exportFormat: string;
}

const STORAGE_KEY = 'admin_system_settings';

const DEFAULT_SETTINGS: SystemSettings = {
  organizationName: 'SPECS Organization',
  timezone: 'Asia/Manila',
  dateFormat: 'MM/DD/YYYY',
  itemsPerPage: 12,
  emailSignature: 'Best regards,\nSPECS Admin Team',
  showWelcomeMessage: true,
  compactMode: false,
  defaultView: 'dashboard',
  exportFormat: 'csv'
};

const AdminSettings: React.FC = () => {
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const { addToast } = useToast();

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setSettings({ ...DEFAULT_SETTINGS, ...JSON.parse(stored) });
      }
    } catch (e) {
      console.error('Failed to load settings:', e);
    }
  }, []);

  const handleSave = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
      addToast({ type: 'success', title: 'Settings Saved', message: 'System preferences updated successfully.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Save Failed', message: 'Failed to write configurations to storage.' });
    }
  };

  const handleReset = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      setSettings(DEFAULT_SETTINGS);
      addToast({ type: 'info', title: 'Settings Reset', message: 'Preferences set back to default parameters.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Reset Failed', message: 'Failed to restore default configurations.' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">System Settings</h1>
          <p className="text-sm text-slate-500 mt-1">Configure workspace parameters and preferences.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-4 py-2 text-sm font-semibold transition-colors"
          >
            Reset to Defaults
          </button>
          <button
            onClick={handleSave}
            className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-sm font-semibold transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
            General Settings
          </h3>
          
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Organization Name</label>
            <input
              type="text"
              value={settings.organizationName}
              onChange={e => setSettings(prev => ({ ...prev, organizationName: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Timezone</label>
              <select
                value={settings.timezone}
                onChange={e => setSettings(prev => ({ ...prev, timezone: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
              >
                <option value="Asia/Manila">Asia/Manila (PHT)</option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">America/New York (EST)</option>
                <option value="Europe/London">Europe/London (GMT)</option>
                <option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date Format</label>
              <select
                value={settings.dateFormat}
                onChange={e => setSettings(prev => ({ ...prev, dateFormat: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Items Per Page</label>
            <input
              type="number"
              min={6}
              max={50}
              step={6}
              value={settings.itemsPerPage}
              onChange={e => setSettings(prev => ({ ...prev, itemsPerPage: Number(e.target.value) }))}
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Maximum listings displayed in grid lists.</span>
          </div>
        </div>

        {/* Preferences */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
            </svg>
            Preferences
          </h3>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border">
              <div>
                <span className="text-sm font-bold text-slate-700 block">Show Welcome Message</span>
                <span className="text-xs text-slate-400 mt-0.5 block">Show warm welcome banners at overview page launch.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.showWelcomeMessage}
                onChange={e => setSettings(prev => ({ ...prev, showWelcomeMessage: e.target.checked }))}
                className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-3.5 bg-slate-50 rounded-lg border">
              <div>
                <span className="text-sm font-bold text-slate-700 block">Compact Layout</span>
                <span className="text-xs text-slate-400 mt-0.5 block">Decrease list spacing to compress dashboard widgets.</span>
              </div>
              <input
                type="checkbox"
                checked={settings.compactMode}
                onChange={e => setSettings(prev => ({ ...prev, compactMode: e.target.checked }))}
                className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Default Workspace View</label>
              <select
                value={settings.defaultView}
                onChange={e => setSettings(prev => ({ ...prev, defaultView: e.target.value }))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
              >
                <option value="dashboard">Dashboard Overview</option>
                <option value="accounts">Accounts Directory</option>
                <option value="events">Events Timeline</option>
                <option value="students">Students List</option>
              </select>
            </div>
          </div>
        </div>

        {/* Email configurations */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            Email Settings
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Signature</label>
            <textarea
              rows={3}
              value={settings.emailSignature}
              onChange={e => setSettings(prev => ({ ...prev, emailSignature: e.target.value }))}
              placeholder="e.g. Best regards, SPECS Org Board"
              className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
            />
            <span className="text-[10px] text-slate-400 mt-1 block">Appended to announcements composed inside the dashboard client.</span>
          </div>
        </div>

        {/* Data formats */}
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Data Management
          </h3>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Default Export Format</label>
            <select
              value={settings.exportFormat}
              onChange={e => setSettings(prev => ({ ...prev, exportFormat: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
            >
              <option value="csv">CSV (Comma-Separated Values)</option>
              <option value="json">JSON (JavaScript Object Notation)</option>
            </select>
          </div>
        </div>
      </div>

      {/* Warning info disclaimer */}
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
        <svg className="h-4.5 w-4.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>These settings are stored locally in your browser. For production configurations, integrate database APIs.</span>
      </div>
    </div>
  );
};

export default AdminSettings;
export { DEFAULT_SETTINGS };
