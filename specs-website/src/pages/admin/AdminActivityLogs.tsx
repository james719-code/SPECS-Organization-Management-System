import React, { useState, useEffect, useMemo } from 'react';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import { useToast } from '../../components/ui/Toast';
import { formatDate } from '../../shared/formatters';

interface ActivityLog {
  id: string;
  type: string;
  description: string;
  metadata?: Record<string, any>;
  timestamp: string;
  user: string;
}

const STORAGE_KEY = 'admin_activity_logs';
const PAGE_SIZE = 15;

const ACTIVITY_TYPES: Record<string, { label: string; color: string }> = {
  account_created: { label: 'Account Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  account_verified: { label: 'Account Verified', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  account_promoted: { label: 'Promoted to Officer', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  account_demoted: { label: 'Demoted to Student', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  account_deactivated: { label: 'Account Deactivated', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  account_reactivated: { label: 'Account Reactivated', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  account_deleted: { label: 'Account Deleted', color: 'bg-red-50 text-red-700 border-red-100' },
  password_reset: { label: 'Password Reset', color: 'bg-amber-50 text-amber-700 border-amber-100' },
  event_created: { label: 'Event Created', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  event_deleted: { label: 'Event Deleted', color: 'bg-red-50 text-red-700 border-red-100' },
  file_uploaded: { label: 'File Uploaded', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  file_deleted: { label: 'File Deleted', color: 'bg-red-50 text-red-700 border-red-100' },
  payment_created: { label: 'Payment Created', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  payment_marked_paid: { label: 'Payment Marked Paid', color: 'bg-emerald-50 text-emerald-700 border-emerald-100' },
  bulk_action: { label: 'Bulk Action', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  login: { label: 'Login', color: 'bg-blue-50 text-blue-700 border-blue-100' },
  logout: { label: 'Logout', color: 'bg-slate-50 text-slate-700 border-slate-200' },
  export_data: { label: 'Data Exported', color: 'bg-purple-50 text-purple-700 border-purple-100' },
  other: { label: 'Other Activity', color: 'bg-slate-50 text-slate-700 border-slate-200' }
};

const AdminActivityLogs: React.FC = () => {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);

  const [clearConfirmOpen, setClearConfirmOpen] = useState(false);
  const { addToast } = useToast();

  const loadLogs = () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      setLogs(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error('Failed to load activity logs:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, []);

  const handleClearLogs = () => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      setLogs([]);
      setClearConfirmOpen(false);
      addToast({ type: 'success', title: 'Cleared', message: 'Activity logs cleared successfully.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to clear activity logs.' });
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) {
      addToast({ type: 'warning', title: 'Export Failed', message: 'No logs available to export.' });
      return;
    }
    try {
      const headers = ['Timestamp', 'Type', 'Description', 'User'];
      const rows = logs.map(log => [
        new Date(log.timestamp).toLocaleString(),
        ACTIVITY_TYPES[log.type]?.label || log.type,
        log.description,
        log.user
      ].map(field => `"${String(field).replace(/"/g, '""')}"`).join(','));

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');

      link.setAttribute('href', url);
      link.setAttribute('download', `activity-logs-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({ type: 'success', title: 'Export Complete', message: 'CSV file downloaded successfully.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Failed to write CSV stream.' });
    }
  };

  // Filter logs
  const filteredLogs = useMemo(() => {
    let result = [...logs];

    if (typeFilter !== 'all') {
      result = result.filter(l => l.type === typeFilter);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(l =>
        l.description.toLowerCase().includes(q) ||
        l.user.toLowerCase().includes(q)
      );
    }

    return result;
  }, [logs, searchQuery, typeFilter]);

  // Paginated logs
  const totalItems = filteredLogs.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedLogs = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLogs.slice(start, start + PAGE_SIZE);
  }, [filteredLogs, currentPage]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Activity Logs</h1>
          <p className="text-sm text-slate-500 mt-1">Audit administrative actions and user logs.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => setClearConfirmOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2 text-sm font-semibold text-red-650 hover:bg-red-100 transition-colors shadow-sm"
          >
            Clear logs
          </button>
        </div>
      </div>

      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search description or user..."
            value={searchQuery}
            onChange={e => { setSearchQuery(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
          />
        </div>

        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setCurrentPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
        >
          <option value="all">All Action Types</option>
          {Object.entries(ACTIVITY_TYPES).map(([key, item]) => (
            <option key={key} value={key}>{item.label}</option>
          ))}
        </select>
      </div>

      {/* Tabular logs display */}
      {loading ? (
        <div className="animate-pulse space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-10 bg-slate-100 rounded-lg w-full" />
          ))}
        </div>
      ) : paginatedLogs.length === 0 ? (
        <EmptyState
          title="No Logs Available"
          description={searchQuery ? 'Adjust your search fields.' : 'No audit entries logged.'}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-slate-750">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="px-6 py-3 text-left">Time stamp</th>
                  <th className="px-6 py-3 text-left">Action</th>
                  <th className="px-6 py-3 text-left">Description</th>
                  <th className="px-6 py-3 text-left">User context</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedLogs.map(log => {
                  const item = ACTIVITY_TYPES[log.type] || { label: log.type, color: 'bg-slate-50 text-slate-700 border-slate-200' };
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="px-6 py-3.5">
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-semibold border ${item.color}`}>
                          {item.label}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-medium text-slate-900 leading-relaxed">{log.description}</td>
                      <td className="px-6 py-3.5 text-slate-550 font-semibold">{log.user}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={PAGE_SIZE}
          />
        </div>
      )}

      {/* Clear Logs Confirm Dialog */}
      <ConfirmModal
        isOpen={clearConfirmOpen}
        onClose={() => setClearConfirmOpen(false)}
        onConfirm={handleClearLogs}
        title="Clear Audit Logs"
        message="Are you sure you want to delete all activity logs from local storage? This action cannot be undone."
        confirmLabel="Clear Logs"
        variant="danger"
      />
    </div>
  );
};

export default AdminActivityLogs;
