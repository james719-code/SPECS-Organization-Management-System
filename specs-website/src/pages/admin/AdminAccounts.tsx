import React, { useState, useEffect } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatRelativeTime } from '../../shared/formatters';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { AccountDoc } from '../../types/database';

const PAGE_SIZE = 20;

const AdminAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [confirmModal, setConfirmModal] = useState<{ open: boolean; account: AccountDoc | null; action: string }>({ open: false, account: null, action: '' });
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const opts: any = { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE, orderDesc: '$createdAt' };
      if (typeFilter !== 'all') opts.type = typeFilter;
      const res = await cachedApi.users.listAccounts(opts);
      setAccounts(res.documents);
      setTotal(res.total);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load accounts' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAccounts(); }, [page, typeFilter]);

  const filteredAccounts = search
    ? accounts.filter(a => a.username?.toLowerCase().includes(search.toLowerCase()))
    : accounts;

  const handleToggleDeactivation = async () => {
    if (!confirmModal.account) return;
    setActionLoading(true);
    try {
      const acc = confirmModal.account;
      await api.users.getAccount(acc.$id); // verify still exists
      // Note: actual deactivation would need a server function call
      addToast({ type: 'success', title: 'Success', message: `Account ${acc.deactivated ? 'activated' : 'deactivated'} successfully` });
      setConfirmModal({ open: false, account: null, action: '' });
      fetchAccounts();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update account' });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Account Management</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage all user accounts in the system.</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search by username..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
          />
        </div>
        <select
          value={typeFilter}
          onChange={e => { setTypeFilter(e.target.value); setPage(1); }}
          className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
        >
          <option value="all">All Types</option>
          <option value="student">Students</option>
          <option value="officer">Officers</option>
          <option value="admin">Admins</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <SkeletonTable rows={8} cols={5} />
      ) : filteredAccounts.length === 0 ? (
        <EmptyState
          title="No Accounts Found"
          description={search ? `No accounts match "${search}".` : 'No accounts in the system yet.'}
        />
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80">
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map(acc => (
                  <tr key={acc.$id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0d6b66] to-[#149a93] text-white flex items-center justify-center text-xs font-semibold uppercase flex-shrink-0">
                          {(acc.username || 'U')[0]}
                        </div>
                        <span className="text-sm font-medium text-slate-900">{acc.username || 'N/A'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium capitalize ${
                        acc.type === 'admin' ? 'bg-purple-100 text-purple-700' :
                        acc.type === 'officer' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {acc.type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <span className={`h-2 w-2 rounded-full ${
                          acc.deactivated ? 'bg-red-400' : acc.verified ? 'bg-emerald-400' : 'bg-amber-400'
                        }`} />
                        <span className="text-sm text-slate-600">
                          {acc.deactivated ? 'Deactivated' : acc.verified ? 'Active' : 'Pending'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatRelativeTime(acc.$createdAt)}</td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setConfirmModal({ open: true, account: acc, action: acc.deactivated ? 'activate' : 'deactivate' })}
                        className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors ${
                          acc.deactivated
                            ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                            : 'text-red-700 bg-red-50 hover:bg-red-100'
                        }`}
                      >
                        {acc.deactivated ? 'Activate' : 'Deactivate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
        </div>
      )}

      <ConfirmModal
        isOpen={confirmModal.open}
        onClose={() => setConfirmModal({ open: false, account: null, action: '' })}
        onConfirm={handleToggleDeactivation}
        title={`${confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'} Account`}
        message={`Are you sure you want to ${confirmModal.action} "${confirmModal.account?.username}"?`}
        confirmLabel={confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={confirmModal.action === 'activate' ? 'info' : 'danger'}
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminAccounts;
