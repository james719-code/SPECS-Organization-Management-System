import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw } from 'lucide-react';
import { databases, functions } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_STUDENTS, FUNCTION_ID } from '../../shared/constants';
import { Query } from 'appwrite';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { cachedApi } from '../../shared/api';
import type { StudentDoc } from '../../types/database';

const VolunteersManagement: React.FC = () => {
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [tabFilter, setTabFilter] = useState<'pending' | 'active' | 'rejected' | 'all'>('pending');

  // Action confirmations
  const [actionConfirm, setActionConfirm] = useState<{
    open: boolean;
    student: StudentDoc | null;
    action: 'approve' | 'reject' | 'approve_leave' | 'reject_leave';
  }>({ open: false, student: null, action: 'approve' });
  
  const [actionLoading, setActionLoading] = useState(false);
  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const ttl = isRefresh ? 0 : 2 * 60 * 1000;
      const res = await cachedApi.students.listAllProfiles({ orderDesc: '$updatedAt' }, ttl);

      setStudents(res.documents as StudentDoc[]);
      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Volunteer listings synchronized.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to sync volunteer records.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleActionConfirm = async () => {
    if (!actionConfirm.student) return;
    const student = actionConfirm.student;
    const action = actionConfirm.action;
    setActionLoading(true);

    try {
      // Map UI actions to backend function action strings
      const actionMap: Record<typeof action, string> = {
        approve:       'approve_volunteer',
        reject:        'reject_volunteer',
        approve_leave: 'approve_volunteer_backout',
        reject_leave:  'reject_volunteer_backout',
      };
      const successMsgMap: Record<typeof action, string> = {
        approve:       `Approved volunteer request for ${student.name}.`,
        reject:        `Rejected volunteer request for ${student.name}.`,
        approve_leave: `Approved leave/backout for ${student.name}.`,
        reject_leave:  `Denied leave request — ${student.name} remains a volunteer.`,
      };

      if (FUNCTION_ID) {
        const currentUser = await cachedApi.users.getCurrent();
        const execution = await functions.createExecution(
          FUNCTION_ID,
          JSON.stringify({
            action: actionMap[action],
            payload: { student_id: student.$id },
            requestingUserId: currentUser?.$id,
          }),
          false
        );
        let result: any = {};
        try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
        if (result.success === false) {
          throw new Error(result.error || 'Backend function returned an error');
        }
      } else {
        // Fallback: direct DB write when function not configured
        const fallbackPayloads: Record<typeof action, Partial<StudentDoc>> = {
          approve:       { is_volunteer: true,  volunteer_request_status: 'approved' },
          reject:        { is_volunteer: false, volunteer_request_status: 'rejected' },
          approve_leave: { is_volunteer: false, volunteer_request_status: 'none' },
          reject_leave:  { is_volunteer: true,  volunteer_request_status: 'approved' },
        };
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, student.$id, fallbackPayloads[action]);
      }

      addToast({ type: 'success', title: 'Success', message: successMsgMap[action] });
      setActionConfirm({ open: false, student: null, action: 'approve' });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Action execution failed.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter logs
  const filteredVolunteers = useMemo(() => {
    return students.filter(s => {
      const isVol = s.is_volunteer;
      const status = s.volunteer_request_status || 'none';

      let matchesTab = true;
      if (tabFilter === 'pending') {
        matchesTab = status === 'pending' || status === 'backout_pending';
      } else if (tabFilter === 'active') {
        matchesTab = isVol === true && status !== 'backout_pending';
      } else if (tabFilter === 'rejected') {
        matchesTab = status === 'rejected';
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q ? s.name?.toLowerCase().includes(q) : true;

      return matchesTab && matchesSearch;
    });
  }, [students, tabFilter, searchQuery]);

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Volunteer Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Approve signups, leave requests, and track volunteers.</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-0.5 shadow-xs">
            <button
              onClick={() => setTabFilter('pending')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${tabFilter === 'pending' ? 'bg-[#0d6b66] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Pending Requests
            </button>
            <button
              onClick={() => setTabFilter('active')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${tabFilter === 'active' ? 'bg-[#0d6b66] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Active
            </button>
            <button
              onClick={() => setTabFilter('rejected')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${tabFilter === 'rejected' ? 'bg-[#0d6b66] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              Declined
            </button>
            <button
              onClick={() => setTabFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-bold transition-all cursor-pointer ${tabFilter === 'all' ? 'bg-[#0d6b66] text-white shadow-xs' : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}
            >
              All
            </button>
          </div>

          <div className="relative max-w-xs w-full sm:w-auto">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search volunteers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-8 pr-3 py-2 text-xs text-slate-950 dark:text-white focus:border-[#0d6b66] outline-none placeholder:text-slate-400"
            />
          </div>

          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-705 dark:text-slate-200 hover:bg-slate-55 dark:hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <EmptyState
          title="No Volunteers Logged"
          description="There are currently no volunteer applications matching this filter."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredVolunteers.map(student => {
            const status = student.volunteer_request_status || 'none';
            const isVol = student.is_volunteer;

            return (
              <div key={student.$id} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col justify-between hover:shadow-lg dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-50 dark:bg-slate-950/60 border dark:border-slate-800 font-black uppercase text-slate-700 dark:text-slate-300">
                      {student.name?.substring(0, 2) || 'US'}
                    </div>

                    {/* Status badges */}
                    {status === 'backout_pending' ? (
                      <span className="inline-flex items-center rounded-full bg-red-50 dark:bg-red-950/20 border border-red-100 dark:border-red-900/30 px-2.5 py-0.5 text-[10px] font-extrabold text-red-700 dark:text-red-400 uppercase tracking-wide">
                        Leave Pending
                      </span>
                    ) : status === 'pending' ? (
                      <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 uppercase tracking-wide">
                        Pending Application
                      </span>
                    ) : isVol ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[10px] font-extrabold text-emerald-700 dark:text-emerald-400 uppercase tracking-wide">
                        Active Volunteer
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-950/20 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 text-[10px] font-extrabold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                        Declined / Inactive
                      </span>
                    )}
                  </div>

                  <h3 className="font-bold text-slate-800 dark:text-white text-base leading-snug">{student.name}</h3>
                  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">Year {student.yearLevel || 'N/A'} — Section {student.section || 'N/A'}</p>
                  
                  <div className="space-y-1.5 mt-4 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400 dark:text-slate-500">Email:</span>
                      <span className="font-medium text-slate-800 dark:text-slate-300 truncate max-w-[200px]" title={student.email || ''}>{student.email || 'N/A'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="font-semibold text-slate-400 dark:text-slate-500">Updated:</span>
                      <span className="font-medium text-slate-700 dark:text-slate-350">{new Date(student.$updatedAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                {/* Actions row */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-850 flex gap-2">
                  {status === 'pending' && (
                    <>
                      <button
                        onClick={() => setActionConfirm({ open: true, student, action: 'approve' })}
                        className="flex-1 rounded-lg bg-[#0d6b66] dark:bg-teal-600 hover:bg-[#0b5c58] dark:hover:bg-teal-700 text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Approve
                      </button>
                      <button
                        onClick={() => setActionConfirm({ open: true, student, action: 'reject' })}
                        className="flex-1 rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 py-2 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Decline
                      </button>
                    </>
                  )}

                  {status === 'backout_pending' && (
                    <>
                      <button
                        onClick={() => setActionConfirm({ open: true, student, action: 'approve_leave' })}
                        className="flex-1 rounded-lg bg-red-600 hover:bg-red-700 text-white py-2 text-xs font-bold shadow-xs transition-colors cursor-pointer"
                      >
                        Approve Leave
                      </button>
                      <button
                        onClick={() => setActionConfirm({ open: true, student, action: 'reject_leave' })}
                        className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 py-2 text-xs font-bold transition-colors cursor-pointer"
                      >
                        Deny Leave
                      </button>
                    </>
                  )}

                  {status !== 'pending' && status !== 'backout_pending' && isVol && (
                    <button
                      onClick={() => setActionConfirm({ open: true, student, action: 'approve_leave' })}
                      className="w-full rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 py-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Revoke Volunteer Status
                    </button>
                  )}

                  {status !== 'pending' && status !== 'backout_pending' && !isVol && (
                    <button
                      onClick={() => setActionConfirm({ open: true, student, action: 'approve' })}
                      className="w-full rounded-lg bg-[#0d6b66] dark:bg-teal-600 hover:bg-[#0b5c58] dark:hover:bg-teal-700 text-white py-2 text-xs font-bold transition-colors cursor-pointer"
                    >
                      Make Volunteer
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Dialog Modal */}
      <ConfirmModal
        isOpen={actionConfirm.open}
        onClose={() => setActionConfirm({ open: false, student: null, action: 'approve' })}
        onConfirm={handleActionConfirm}
        title={
          actionConfirm.action === 'approve' ? 'Approve Volunteer' :
          actionConfirm.action === 'reject' ? 'Reject Volunteer Request' :
          actionConfirm.action === 'approve_leave' ? 'Approve Program Leave' : 'Deny Leave Request'
        }
        message={
          actionConfirm.action === 'approve' ? `Approve volunteer application for "${actionConfirm.student?.name}"?` :
          actionConfirm.action === 'reject' ? `Decline volunteer application for "${actionConfirm.student?.name}"?` :
          actionConfirm.action === 'approve_leave' ? `Remove "${actionConfirm.student?.name}" from active volunteer roster?` : `Deny leave application for "${actionConfirm.student?.name}"?`
        }
        confirmLabel={
          actionConfirm.action === 'approve' ? 'Approve' :
          actionConfirm.action === 'reject' ? 'Decline' :
          actionConfirm.action === 'approve_leave' ? 'Remove / Leave' : 'Deny Leave'
        }
        variant={actionConfirm.action === 'reject' || actionConfirm.action === 'approve_leave' ? 'danger' : 'info'}
        loading={actionLoading}
      />
    </div>
  );
};

export default VolunteersManagement;
