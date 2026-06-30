import React, { useState, useEffect } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatRelativeTime } from '../../shared/formatters';
import Pagination from '../../components/ui/Pagination';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { functions } from '../../shared/appwrite';
import { FUNCTION_ID } from '../../shared/constants';
import type { AccountDoc } from '../../types/database';

const PAGE_SIZE = 20;

const AdminAccounts: React.FC = () => {
  const [accounts, setAccounts] = useState<AccountDoc[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
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

  /** Calls deactivate_account or reactivate_account on the backend function */
  const handleToggleDeactivation = async () => {
    if (!confirmModal.account) return;
    setActionLoading(true);
    try {
      const acc = confirmModal.account;
      const currentUser = await cachedApi.users.getCurrent();
      const action = acc.deactivated ? 'reactivate_account' : 'deactivate_account';

      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action,
          payload: { userId: acc.$id },
          requestingUserId: currentUser?.$id,
        }),
        false
      );

      // Parse the function response to surface backend errors
      let result: any = {};
      try {
        result = JSON.parse(execution?.responseBody || '{}');
      } catch { /* ignore */ }

      if (result.success === false) {
        throw new Error(result.error || `Failed to ${action.replace('_', ' ')}`);
      }

      addToast({
        type: 'success',
        title: 'Success',
        message: `Account "${acc.username}" ${acc.deactivated ? 'activated' : 'deactivated'} successfully`,
      });
      setConfirmModal({ open: false, account: null, action: '' });
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchAccounts();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update account' });
    } finally {
      setActionLoading(false);
    }
  };

  /** Calls delete_account on the backend for full cascade deletion */
  const handleDeleteAccount = async () => {
    if (!confirmModal.account) return;
    setActionLoading(true);
    try {
      const acc = confirmModal.account;
      const currentUser = await cachedApi.users.getCurrent();

      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'delete_account',
          payload: { userId: acc.$id },
          requestingUserId: currentUser?.$id,
        }),
        false
      );

      let result: any = {};
      try {
        result = JSON.parse(execution?.responseBody || '{}');
      } catch { /* ignore */ }

      if (result.success === false) {
        throw new Error(result.error || 'Failed to delete account');
      }

      addToast({
        type: 'success',
        title: 'Deleted',
        message: `Account "${acc.username}" and all related data have been permanently deleted.`,
      });
      setConfirmModal({ open: false, account: null, action: '' });
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchAccounts();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete account' });
    } finally {
      setActionLoading(false);
    }
  };

  /** Calls accept_student on the backend — verifies the account and adds to students team */
  const handleAcceptStudent = async (acc: AccountDoc) => {
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'accept_student',
          payload: { userId: acc.$id },
          requestingUserId: currentUser?.$id,
        }),
        false
      );
      let result: any = {};
      try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
      if (result.success === false) throw new Error(result.error || 'Failed to accept student');
      addToast({ type: 'success', title: 'Accepted', message: `"${acc.username}" has been verified and added to the students team.` });
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchAccounts();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to accept student' });
    } finally {
      setActionLoading(false);
    }
  };

  /** Calls bulk_accept_students for all selected pending accounts */
  const handleBulkAccept = async () => {
    const ids = Array.from(selectedIds);
    if (!ids.length) return;
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();
      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'bulk_accept_students',
          payload: { userIds: ids },
          requestingUserId: currentUser?.$id,
        }),
        false
      );
      let result: any = {};
      try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
      if (result.success === false) throw new Error(result.error || 'Bulk accept failed');
      const accepted = result.accepted_count ?? ids.length;
      const failed = result.failed_ids?.length ?? 0;
      addToast({
        type: failed > 0 ? 'error' : 'success',
        title: failed > 0 ? 'Partial Success' : 'Bulk Accepted',
        message: `Accepted ${accepted} of ${ids.length} accounts.${ failed > 0 ? ` ${failed} failed.` : '' }`,
      });
      setSelectedIds(new Set());
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchAccounts();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Bulk accept failed' });
    } finally {
      setActionLoading(false);
    }
  };

  /** Calls reset_password on the backend to send a password-reset email */
  const handleResetPassword = async () => {
    if (!confirmModal.account) return;
    const acc = confirmModal.account;
    // We need the student's email — try to get it from the linked student doc
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();
      // Resolve email from the account's students relationship if present
      const studentRel = (acc as any).students;
      const email: string | undefined =
        typeof studentRel === 'object' && studentRel?.email
          ? studentRel.email
          : undefined;

      if (!email) {
        throw new Error('Could not resolve email for this account. Open the student profile to find the email.');
      }

      const execution = await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'reset_password',
          payload: { userId: acc.$id, email },
          requestingUserId: currentUser?.$id,
        }),
        false
      );
      let result: any = {};
      try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
      if (result.success === false) throw new Error(result.error || 'Failed to send reset email');
      addToast({ type: 'success', title: 'Email Sent', message: `Password reset email sent to ${email}.` });
      setConfirmModal({ open: false, account: null, action: '' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to send password reset' });
    } finally {
      setActionLoading(false);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // Pending (unverified, non-admin) accounts among the current filtered page
  const pendingOnPage = filteredAccounts.filter(a => !a.verified && a.type !== 'admin');

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
      {/* Bulk Accept bar — shown when pending accounts are selected */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-l-4 border-l-emerald-500 border-slate-200 bg-white px-4 py-3 shadow-sm">
          <span className="text-sm font-semibold text-slate-700">{selectedIds.size} pending account{selectedIds.size > 1 ? 's' : ''} selected</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleBulkAccept}
              disabled={actionLoading}
              className="rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
            >
              Accept All Selected
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <SkeletonTable rows={8} cols={6} />
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
                  <th className="px-4 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={pendingOnPage.length > 0 && pendingOnPage.every(a => selectedIds.has(a.$id))}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedIds(prev => new Set([...prev, ...pendingOnPage.map(a => a.$id)]));
                        } else {
                          setSelectedIds(prev => {
                            const next = new Set(prev);
                            pendingOnPage.forEach(a => next.delete(a.$id));
                            return next;
                          });
                        }
                      }}
                      className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                      title="Select all pending on this page"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Type</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Joined</th>
                  <th className="px-6 py-3 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredAccounts.map(acc => {
                  const isPending = !acc.verified && acc.type !== 'admin';
                  return (
                  <tr key={acc.$id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-4 py-4">
                      {isPending ? (
                        <input
                          type="checkbox"
                          checked={selectedIds.has(acc.$id)}
                          onChange={e => {
                            setSelectedIds(prev => {
                              const next = new Set(prev);
                              e.target.checked ? next.add(acc.$id) : next.delete(acc.$id);
                              return next;
                            });
                          }}
                          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                        />
                      ) : <span className="block w-4" />}
                    </td>
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
                      <div className="flex items-center justify-end gap-2">
                        {/* Accept: only for pending/unverified non-admin accounts */}
                        {isPending && (
                          <button
                            onClick={() => handleAcceptStudent(acc)}
                            disabled={actionLoading}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors text-emerald-700 bg-emerald-50 hover:bg-emerald-100 disabled:opacity-50"
                          >
                            Accept
                          </button>
                        )}
                        {/* Reset Password: only for verified active accounts */}
                        {acc.verified && !acc.deactivated && acc.type !== 'admin' && (
                          <button
                            onClick={() => setConfirmModal({ open: true, account: acc, action: 'reset_password' })}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors text-slate-600 bg-slate-100 hover:bg-slate-200"
                          >
                            Reset PW
                          </button>
                        )}
                        <button
                          onClick={() => setConfirmModal({ open: true, account: acc, action: acc.deactivated ? 'activate' : 'deactivate' })}
                          disabled={acc.type === 'admin'}
                          className={`text-xs font-medium px-3 py-1.5 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                            acc.deactivated
                              ? 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100'
                              : 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                          }`}
                        >
                          {acc.deactivated ? 'Activate' : 'Deactivate'}
                        </button>
                        {acc.type !== 'admin' && (
                          <button
                            onClick={() => setConfirmModal({ open: true, account: acc, action: 'delete' })}
                            className="text-xs font-medium px-3 py-1.5 rounded-md transition-colors text-red-700 bg-red-50 hover:bg-red-100"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} totalItems={total} pageSize={PAGE_SIZE} />
        </div>
      )}

      {/* Activate / Deactivate confirm */}
      <ConfirmModal
        isOpen={confirmModal.open && !['delete', 'reset_password'].includes(confirmModal.action)}
        onClose={() => setConfirmModal({ open: false, account: null, action: '' })}
        onConfirm={handleToggleDeactivation}
        title={`${confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'} Account`}
        message={`Are you sure you want to ${confirmModal.action} the account "${confirmModal.account?.username}"?${
          confirmModal.action === 'deactivate'
            ? ' This will block the user from logging in and remove them from all teams.'
            : ' This will restore the user\'s access and add them back to their appropriate team.'
        }`}
        confirmLabel={confirmModal.action === 'activate' ? 'Activate' : 'Deactivate'}
        variant={confirmModal.action === 'activate' ? 'info' : 'danger'}
        loading={actionLoading}
      />

      {/* Permanent delete confirm */}
      <ConfirmModal
        isOpen={confirmModal.open && confirmModal.action === 'delete'}
        onClose={() => setConfirmModal({ open: false, account: null, action: '' })}
        onConfirm={handleDeleteAccount}
        title="Delete Account Permanently"
        message={`Are you sure you want to permanently delete the account "${confirmModal.account?.username}"? This will remove their student/officer records, team memberships, and auth credentials. This action cannot be undone.`}
        confirmLabel="Delete Permanently"
        variant="danger"
        loading={actionLoading}
      />

      {/* Reset Password confirm */}
      <ConfirmModal
        isOpen={confirmModal.open && confirmModal.action === 'reset_password'}
        onClose={() => setConfirmModal({ open: false, account: null, action: '' })}
        onConfirm={handleResetPassword}
        title="Send Password Reset Email"
        message={`Send a password reset email to "${confirmModal.account?.username}"? They will receive a link to set a new password.`}
        confirmLabel="Send Reset Email"
        variant="info"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminAccounts;
