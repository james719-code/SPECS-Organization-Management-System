import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw } from 'lucide-react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { databases, functions } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, FUNCTION_ID } from '../../shared/constants';
import { Query } from 'appwrite';
import type { StudentDoc, AccountDoc } from '../../types/database';

const PAGE_SIZE = 12;

const avatarColors = [
  { bg: 'bg-blue-50 text-blue-600', border: 'border-blue-100' },
  { bg: 'bg-red-50 text-red-600', border: 'border-red-100' },
  { bg: 'bg-emerald-50 text-emerald-600', border: 'border-emerald-100' },
  { bg: 'bg-amber-50 text-amber-600', border: 'border-amber-100' },
  { bg: 'bg-purple-50 text-purple-600', border: 'border-purple-100' },
  { bg: 'bg-slate-100 text-slate-600', border: 'border-slate-200' },
];

const AdminStudents: React.FC = () => {
  const [students, setStudents] = useState<StudentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [sortOrder, setSortOrder] = useState<string>('name_asc');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [detailStudent, setDetailStudent] = useState<StudentDoc | null>(null);
  const [linkedAccount, setLinkedAccount] = useState<AccountDoc | null>(null);
  const [loadingAccount, setLoadingAccount] = useState(false);
  
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; student: StudentDoc | null }>({ open: false, student: null });
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  // Fetch linked account when student drawer details open
  useEffect(() => {
    if (!detailStudent) {
      setLinkedAccount(null);
      return;
    }
    const fetchLinkedAccount = async () => {
      setLoadingAccount(true);
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_ACCOUNTS, [
          Query.equal('students', detailStudent.$id)
        ]);
        if (res.documents.length > 0) {
          setLinkedAccount(res.documents[0] as AccountDoc);
        } else {
          setLinkedAccount(null);
        }
      } catch (err) {
        console.error('Failed to load linked account:', err);
        setLinkedAccount(null);
      } finally {
        setLoadingAccount(false);
      }
    };
    fetchLinkedAccount();
  }, [detailStudent]);

  const handlePromoteOfficer = async () => {
    if (!linkedAccount) return;
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();
      await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'promote_officer',
          payload: { userId: linkedAccount.$id },
          requestingUserId: currentUser?.$id
        }),
        false
      );
      addToast({ type: 'success', title: 'Promoted', message: `"${detailStudent?.name}" has been promoted to Officer.` });
      setLinkedAccount(prev => prev ? { ...prev, type: 'officer' } : null);
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchStudents(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to promote student.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDemoteOfficer = async () => {
    if (!linkedAccount) return;
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();
      await functions.createExecution(
        FUNCTION_ID,
        JSON.stringify({
          action: 'demote_officer',
          payload: { userId: linkedAccount.$id },
          requestingUserId: currentUser?.$id
        }),
        false
      );
      addToast({ type: 'success', title: 'Demoted', message: `"${detailStudent?.name}" has been demoted back to Student.` });
      setLinkedAccount(prev => prev ? { ...prev, type: 'student' } : null);
      api.cache.clearTags(['accounts', 'students', 'dashboard']);
      fetchStudents(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to demote officer.' });
    } finally {
      setActionLoading(false);
    }
  };

  const fetchStudents = async (isRefresh = false) => {
    try {
      if (!isRefresh) setLoading(true);
      const res = await cachedApi.students.listAllProfiles({ orderDesc: '$createdAt' }, isRefresh ? 0 : 2 * 60 * 1000);
      setStudents(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load students' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const getAvatarStyle = (name: string) => {
    const code = name.charCodeAt(0) || 0;
    return avatarColors[code % avatarColors.length];
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  };

  // Filter & Sort Logic
  const processedStudents = useMemo(() => {
    let result = [...students];

    // Filter by Year
    if (yearFilter !== 'all') {
      result = result.filter(s => String(s.yearLevel) === yearFilter);
    }

    // Filter by Search
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        s.name?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q) ||
        s.section?.toLowerCase().includes(q)
      );
    }

    // Sort
    if (sortOrder === 'name_asc') {
      result.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
    } else if (sortOrder === 'date_desc') {
      result.sort((a, b) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime());
    } else if (sortOrder === 'date_asc') {
      result.sort((a, b) => new Date(a.$createdAt).getTime() - new Date(b.$createdAt).getTime());
    }

    return result;
  }, [students, search, yearFilter, sortOrder]);

  // Pagination Logic
  const totalItems = processedStudents.length;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const paginatedStudents = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return processedStudents.slice(start, start + PAGE_SIZE);
  }, [processedStudents, currentPage]);

  const handleSelectOne = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const allIds = paginatedStudents.map(s => s.$id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const deleteStudent = async (studentId: string) => {
    await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
  };

  const handleSingleDelete = async () => {
    if (!deleteConfirm.student) return;
    const student = deleteConfirm.student;
    setActionLoading(true);
    try {
      await deleteStudent(student.$id);
      api.cache.clearTags(['students', 'accounts', 'dashboard']);
      setStudents(prev => prev.filter(s => s.$id !== student.$id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(student.$id);
        return next;
      });
      addToast({ type: 'success', title: 'Deleted', message: `"${student.name}" has been deleted.` });
      setDeleteConfirm({ open: false, student: null });
      setDetailStudent(null);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete student.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkDelete = async () => {
    setActionLoading(true);
    try {
      const ids = Array.from(selectedIds);
      await Promise.all(ids.map(id => deleteStudent(id)));
      api.cache.clearTags(['students', 'accounts', 'dashboard']);
      setStudents(prev => prev.filter(s => !selectedIds.has(s.$id)));
      setSelectedIds(new Set());
      addToast({ type: 'success', title: 'Success', message: `Deleted ${ids.length} student records.` });
      setBulkDeleteConfirm(false);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete some records.' });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
          <p className="text-sm text-slate-500 mt-1">Browse and manage student records</p>
        </div>
        <button
          onClick={() => fetchStudents(true)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RotateCw className={`h-4 w-4 text-slate-500 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Filter / Sort bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search students..."
            value={search}
            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
            className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
          />
        </div>
        
        <div className="flex gap-2">
          <select
            value={yearFilter}
            onChange={e => { setYearFilter(e.target.value); setCurrentPage(1); }}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
          >
            <option value="all">All Years</option>
            <option value="1">Year 1</option>
            <option value="2">Year 2</option>
            <option value="3">Year 3</option>
            <option value="4">Year 4</option>
          </select>

          <select
            value={sortOrder}
            onChange={e => setSortOrder(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
          >
            <option value="name_asc">Sort: A-Z</option>
            <option value="date_desc">Newest First</option>
            <option value="date_asc">Oldest First</option>
          </select>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="flex items-center justify-between rounded-lg border border-l-4 border-l-[#0d6b66] border-slate-200 bg-white px-4 py-3 shadow-sm animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={paginatedStudents.length > 0 && paginatedStudents.every(s => selectedIds.has(s.$id))}
              ref={el => {
                if (el) {
                  const some = paginatedStudents.some(s => selectedIds.has(s.$id));
                  const all = paginatedStudents.every(s => selectedIds.has(s.$id));
                  el.indeterminate = some && !all;
                }
              }}
              onChange={e => handleSelectAll(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
            />
            <span className="text-sm font-semibold text-slate-700">{selectedIds.size} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedIds(new Set())}
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors shadow-sm"
            >
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Grid of Cards */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : paginatedStudents.length === 0 ? (
        <EmptyState
          title="No Students Found"
          description={search ? `No student profiles match "${search}"` : 'The student directory is empty.'}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {paginatedStudents.map(student => {
              const selected = selectedIds.has(student.$id);
              const name = student.name || 'Unknown';
              const style = getAvatarStyle(name);
              return (
                <div
                  key={student.$id}
                  onClick={() => setDetailStudent(student)}
                  className={`group relative rounded-xl border bg-white p-5 cursor-pointer transition-all duration-200 hover:-translate-y-1 hover:shadow-md ${
                    selected ? 'border-[#0d6b66] ring-1 ring-[#0d6b66] bg-emerald-50/20' : 'border-slate-200'
                  }`}
                >
                  {/* Select Checkbox */}
                  <div
                    className="absolute top-4 left-4 z-10"
                    onClick={e => {
                      e.stopPropagation();
                      handleSelectOne(student.$id);
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={selected}
                      onChange={() => {}} // handled by click
                      className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                    />
                  </div>

                  {/* Inline delete */}
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      setDeleteConfirm({ open: true, student });
                    }}
                    className="absolute top-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-lg border border-slate-100 bg-white shadow-sm hover:bg-red-50 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Delete record"
                  >
                    <svg className="h-4 w-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>

                  <div className="flex flex-col items-center text-center mt-2">
                    <div className={`flex h-14 w-14 items-center justify-center rounded-full font-bold text-lg ${style.bg} border ${style.border} mb-3 shadow-inner`}>
                      {getInitials(name)}
                    </div>
                    <h3 className="font-bold text-slate-900 group-hover:text-[#0d6b66] transition-colors line-clamp-1">{name}</h3>
                    <p className="text-xs text-slate-400 mt-0.5 font-medium tracking-wide">ID: {student.student_id}</p>

                    <div className="flex flex-wrap gap-1.5 justify-center mt-3">
                      {student.section && (
                        <span className="inline-flex items-center rounded-full bg-slate-50 border border-slate-200 px-2.5 py-0.5 text-[10px] font-semibold text-slate-600">
                          {student.section}
                        </span>
                      )}
                      {student.yearLevel && (
                        <span className="inline-flex items-center rounded-full bg-[#0d6b66]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#0d6b66]">
                          Year {student.yearLevel}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={PAGE_SIZE} />
        </>
      )}

      {/* Details Side-Drawer / Modal */}
      {detailStudent && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs animate-in fade-in" onClick={() => setDetailStudent(null)}>
          <div
            className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-250"
            onClick={e => e.stopPropagation()}
          >
            <div>
              {/* Drawer header */}
              <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-lg font-bold text-slate-900">Student Details</h2>
                <button onClick={() => setDetailStudent(null)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>


              {/* Data list */}
              <div className="space-y-4">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Student ID Number</span>
                  <span className="text-sm font-semibold text-slate-900">{detailStudent.student_id}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Year Level & Course</span>
                  <span className="text-sm font-semibold text-slate-900">BSCS - Year {detailStudent.yearLevel || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Section</span>
                  <span className="text-sm font-semibold text-slate-900">{detailStudent.section || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-start py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Address</span>
                  <span className="text-sm font-semibold text-slate-900 text-right max-w-[200px] break-words">{detailStudent.address || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Registered On</span>
                  <span className="text-sm font-semibold text-slate-900">{formatDate(detailStudent.$createdAt)}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-sm text-slate-500">Account Role</span>
                  {loadingAccount ? (
                    <span className="text-xs text-slate-400">Loading role...</span>
                  ) : linkedAccount ? (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize ${
                      linkedAccount.type === 'admin' ? 'bg-purple-100 text-purple-700' :
                      linkedAccount.type === 'officer' ? 'bg-blue-100 text-blue-700' :
                      'bg-slate-100 text-slate-700'
                    }`}>
                      {linkedAccount.type}
                    </span>
                  ) : (
                    <span className="text-xs font-semibold text-slate-400">No Account Linked</span>
                  )}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-6 border-t mt-8">
              {linkedAccount && (
                <>
                  {linkedAccount.type === 'student' && linkedAccount.verified && (
                    <button
                      type="button"
                      onClick={handlePromoteOfficer}
                      disabled={actionLoading}
                      className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      Promote to Officer
                    </button>
                  )}
                  {linkedAccount.type === 'officer' && (
                    <button
                      type="button"
                      onClick={handleDemoteOfficer}
                      disabled={actionLoading}
                      className="w-full rounded-lg bg-amber-600 hover:bg-amber-700 text-white py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50"
                    >
                      Demote to Student
                    </button>
                  )}
                </>
              )}
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setDetailStudent(null);
                    navigate('/dashboard/admin/payments');
                  }}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
                >
                  View Payments
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirm({ open: true, student: detailStudent })}
                  className="flex-1 rounded-lg bg-red-50 border border-red-200 py-2.5 text-sm font-medium text-red-600 hover:bg-red-100 transition-colors shadow-sm"
                >
                  Delete Record
                </button>
              </div>
            </div>
          </div>
        </div>
      , document.body)}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, student: null })}
        onConfirm={handleSingleDelete}
        title="Delete Student Record"
        message={`Are you sure you want to delete student profile for "${deleteConfirm.student?.name}"? All associated attendance records and settings for this student will be affected.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={bulkDeleteConfirm}
        onClose={() => setBulkDeleteConfirm(false)}
        onConfirm={handleBulkDelete}
        title="Bulk Delete Records"
        message={`Are you sure you want to delete the selected ${selectedIds.size} student profile(s)? This action cannot be undone.`}
        confirmLabel={`Delete ${selectedIds.size} Records`}
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminStudents;
