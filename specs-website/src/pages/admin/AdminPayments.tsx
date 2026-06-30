import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cachedApi, api } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc, PaymentDoc, AccountDoc } from '../../types/database';
import { ArrowLeft, RotateCw, Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';

interface AdminPaymentsProps {
  isCreateView?: boolean;
}

const AdminPayments: React.FC<AdminPaymentsProps> = ({ isCreateView = false }) => {
  const navigate = useNavigate();
  // Navigation / View state
  const [selectedStudent, setSelectedStudent] = useState<AccountDoc | null>(null);

  // Data state
  const [students, setStudents] = useState<AccountDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Add Payment View State
  const isAddView = isCreateView;
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isEventLink, setIsEventLink] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [assignAll, setAssignAll] = useState(false);
  const [assignStudentQuery, setAssignStudentQuery] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState<PaymentDoc | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editIsEventLink, setEditIsEventLink] = useState(false);
  const [editActivityName, setEditActivityName] = useState('');
  const [editSelectedEventId, setEditSelectedEventId] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Actions confirmations
  const [paidConfirm, setPaidConfirm] = useState<{ open: boolean; payment: PaymentDoc | null }>({ open: false, payment: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; payment: PaymentDoc | null }>({ open: false, payment: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [studentsRes, officersRes, paymentsRes, eventsRes] = await Promise.all([
        cachedApi.users.listAllAccounts({ type: 'student' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'officer' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.payments.listAll({}, isRefresh ? 0 : 1 * 60 * 1000),
        cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000)
      ]);

      const combined = [...studentsRes.documents, ...officersRes.documents];
      setStudents(combined);
      setPayments(paymentsRes.documents);
      setEvents(eventsRes.documents);

      if (selectedStudent) {
        // Refresh current student doc
        const refreshedStudent = studentsRes.documents.find(s => s.$id === selectedStudent.$id);
        if (refreshedStudent) setSelectedStudent(refreshedStudent);
      }

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Payments ledger updated.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load payments ledger.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter list of assignees for the check-list
  const filteredAssignees = useMemo(() => {
    const q = assignStudentQuery.trim().toLowerCase();
    const list = students.map(std => {
      const profile = std.students as any;
      return {
        id: profile?.$id || std.$id,
        name: profile?.name || std.username || 'Unknown Member',
        yearLevel: profile?.yearLevel || 0
      };
    });
    if (!q) return list;
    return list.filter(item => item.name.toLowerCase().includes(q));
  }, [students, assignStudentQuery]);

  // Assign payment logic
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || price < 0 || quantity < 1) {
      addToast({ type: 'warning', title: 'Invalid inputs', message: 'Please review payment details.' });
      return;
    }

    if (!assignAll && selectedAssigneeIds.length === 0) {
      addToast({ type: 'warning', title: 'Assignees needed', message: 'Select at least one student or check assign to all.' });
      return;
    }

    setSubmitting(true);
    try {
      const payload: Partial<PaymentDoc> = {
        item_name: itemName,
        price,
        quantity,
        is_event: isEventLink,
        events: isEventLink ? selectedEventId : null,
        activity: isEventLink ? null : activityName,
        is_paid: false,
        date_paid: new Date(0).toISOString(),
        is_outside_bscs: false
      };

      if (assignAll) {
        // Create payment document for all students
        await Promise.all(
          students.map(async (std) => {
            const profile = std.students as any;
            const pId = profile?.$id || std.$id;
            await api.payments.create({ ...payload, students: pId });
          })
        );
        addToast({ type: 'success', title: 'Assigned All', message: `Outstanding dues assigned to ${students.length} students.` });
      } else if (selectedAssigneeIds.length > 0) {
        await Promise.all(
          selectedAssigneeIds.map(async (id) => {
            await api.payments.create({ ...payload, students: id });
          })
        );
        addToast({ type: 'success', title: 'Assigned', message: `Outstanding dues assigned to ${selectedAssigneeIds.length} students.` });
      }

      navigate(window.location.pathname.split('/create')[0]);
      setItemName('');
      setPrice(0);
      setQuantity(1);
      setIsEventLink(false);
      setActivityName('');
      setSelectedEventId('');
      setAssignAll(false);
      setAssignStudentQuery('');
      setSelectedAssigneeIds([]);

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create payment due.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit payment due logic
  const handleOpenEdit = (p: PaymentDoc) => {
    setEditingPayment(p);
    setEditItemName(p.item_name || '');
    setEditPrice(p.price || 0);
    setEditQuantity(p.quantity || 1);
    setEditIsEventLink(p.is_event || false);
    setEditActivityName(p.activity || '');
    
    const evId = p.events ? (typeof p.events === 'object' ? p.events.$id : p.events) : '';
    setEditSelectedEventId(evId);
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    setEditSubmitting(true);
    try {
      await api.payments.update(editingPayment.$id, {
        item_name: editItemName,
        price: editPrice,
        quantity: editQuantity,
        is_event: editIsEventLink,
        events: editIsEventLink ? editSelectedEventId : null,
        activity: editIsEventLink ? null : editActivityName
      });

      addToast({ type: 'success', title: 'Success', message: 'Payment record details modified.' });
      setEditingPayment(null);
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to save changes.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Mark Paid due
  const handleMarkPaid = async () => {
    if (!paidConfirm.payment) return;
    const payment = paidConfirm.payment;
    setActionLoading(true);
    try {
      const studentProfile = selectedStudent?.students as any;
      const sName = studentProfile?.name || selectedStudent?.username || 'Student';
      await api.payments.markPaid(payment, 'admin', sName);
      addToast({ type: 'success', title: 'Paid', message: `Outstanding due marked as paid.` });
      setPaidConfirm({ open: false, payment: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to process payment.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Delete payment due
  const handleDeletePayment = async () => {
    if (!deleteConfirm.payment) return;
    const payment = deleteConfirm.payment;
    setActionLoading(true);
    try {
      await api.payments.delete(payment.$id);
      addToast({ type: 'success', title: 'Deleted', message: 'Dues item removed from logs.' });
      setDeleteConfirm({ open: false, payment: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete record.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Metrics computation
  const summary = useMemo(() => {
    const totalPaid = payments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalOutstanding = payments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const completionRate = payments.length > 0 ? Math.round((payments.filter(p => p.is_paid).length / payments.length) * 100) : 0;
    return { totalPaid, totalOutstanding, completionRate };
  }, [payments]);

  // Aggregate student & officer payments for list grid
  const studentLedger = useMemo(() => {
    const list = students.map(std => {
      const profile = std.students as any;
      const sId = profile?.$id || std.$id;
      const stdPayments = payments.filter(p => {
        const pStdId = p.students ? (typeof p.students === 'object' ? p.students.$id : p.students) : '';
        return pStdId === sId;
      });

      const outstanding = stdPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const paid = stdPayments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);

      return {
        studentDoc: std,
        sId,
        name: profile?.name || std.username || 'Unknown Member',
        role: std.type,
        yearLevel: profile?.yearLevel || 0,
        outstanding,
        paid,
        paymentsCount: stdPayments.length
      };
    });

    // Sort: 1. outstanding > 0 first, sorted by outstanding desc, but only keep top 20 with dues.
    // The rest with dues + those without dues are sorted by name.
    const withDues = list.filter(item => item.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
    const withoutDues = list.filter(item => item.outstanding === 0);

    const top20WithDues = withDues.slice(0, 20);
    const restWithDues = withDues.slice(20);

    const remainingList = [...withoutDues, ...restWithDues].sort((a, b) => a.name.localeCompare(b.name));

    return [...top20WithDues, ...remainingList];
  }, [students, payments]);

  // Filter student ledger items
  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return studentLedger;
    const q = searchQuery.toLowerCase();
    return studentLedger.filter(l => l.name.toLowerCase().includes(q));
  }, [studentLedger, searchQuery]);

  // Reset pagination to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Slice paginated items
  const paginatedLedger = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredLedger.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredLedger, currentPage]);

  // Specific student payments details
  const currentStudentPayments = useMemo(() => {
    if (!selectedStudent) return [];
    const profile = selectedStudent.students as any;
    const sId = profile?.$id || selectedStudent.$id;
    return payments.filter(p => {
      const pStdId = p.students ? (typeof p.students === 'object' ? p.students.$id : p.students) : '';
      return pStdId === sId;
    });
  }, [payments, selectedStudent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-500 mt-1">Assign dues, collect payments, and manage student and officer accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {(selectedStudent || isAddView) && (
            <button
              onClick={() => {
                if (isCreateView) {
                  navigate(window.location.pathname.split('/create')[0]);
                } else {
                  setSelectedStudent(null);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" />
              Back to List
            </button>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Ledger List State */}
      {isAddView ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">New Payment Due Entry</h2>
            <p className="text-sm text-slate-500 mt-1">Fill out the due parameters and select who should receive this charge.</p>
          </div>

          <form onSubmit={handleCreatePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-5 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Membership Fee 2026"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Price (PHP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={price || ''}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="linkEventCheck"
                  checked={isEventLink}
                  onChange={e => setIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                />
                <label htmlFor="linkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {isEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Event</label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none transition-colors"
                  >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                      <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Semester Collection"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                  />
                </div>
              )}

              <hr className="border-slate-100 my-2" />

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="assignAllCheck"
                  checked={assignAll}
                  onChange={e => setAssignAll(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                />
                <label htmlFor="assignAllCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Assign to all members directory
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t justify-start lg:hidden">
                <button
                  type="button"
                  onClick={() => navigate(window.location.pathname.split('/create')[0])}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#0d6b66] py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Due
                </button>
              </div>
            </div>

            {/* Right Column - Assignees selection or all info */}
            <div className="lg:col-span-7 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 min-h-[300px]">
              <div className="space-y-4 flex-1">
                {!assignAll ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Assignees ({selectedAssigneeIds.length} selected)</label>
                      {selectedAssigneeIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedAssigneeIds([])}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student directories..."
                        value={assignStudentQuery}
                        onChange={e => setAssignStudentQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 max-h-[350px] overflow-y-auto space-y-1.5">
                      {filteredAssignees.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400 font-medium">No students matched the query</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {filteredAssignees.map(student => {
                            const isChecked = selectedAssigneeIds.includes(student.id);
                            return (
                              <label
                                key={student.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'border-[#0d6b66] ring-1 ring-[#0d6b66]/20 bg-[#0d6b66]/5' 
                                    : 'border-slate-200 hover:bg-slate-50/80'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedAssigneeIds(prev => prev.filter(id => id !== student.id));
                                    } else {
                                      setSelectedAssigneeIds(prev => [...prev, student.id]);
                                    }
                                  }}
                                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                                />
                                <div className="text-xs">
                                  <span className="font-bold text-slate-800 block truncate">{student.name}</span>
                                  {student.yearLevel > 0 && (
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Year {student.yearLevel}</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-teal-50/40 border border-teal-100 rounded-xl h-full min-h-[250px]">
                    <div className="h-12 w-12 rounded-full bg-teal-100 text-[#0d6b66] flex items-center justify-center mb-3">
                      <Plus className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-900">Assigning to all members</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Every member currently registered in the database directory ({students.length} people) will be assigned this outstanding due item.
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop Submit Row */}
              <div className="hidden lg:flex gap-3 pt-6 border-t border-slate-100 justify-end w-full">
                <button
                  type="button"
                  onClick={() => navigate(window.location.pathname.split('/create')[0])}
                  className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Due Entry
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : !selectedStudent ? (
        <>
          {/* General Summary Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.totalPaid)}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ledger Completion</span>
              <p className="text-2xl font-bold text-[#0d6b66]">{summary.completionRate}%</p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-[#0d6b66] rounded-full" style={{ width: `${summary.completionRate}%` }} />
              </div>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search ledger..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
            />
          </div>

          {/* Student Grid */}
          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : filteredLedger.length === 0 ? (
            <EmptyState title="No Records found" description="Adjust your filters or add payments dues first." />
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {paginatedLedger.map(ledgerItem => (
                  <div
                    key={ledgerItem.sId}
                    onClick={() => setSelectedStudent(ledgerItem.studentDoc)}
                    className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold uppercase">
                          {ledgerItem.name.substring(0, 2)}
                        </div>
                        <div>
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-bold text-slate-800 line-clamp-1">{ledgerItem.name}</h4>
                            {ledgerItem.role === 'officer' && (
                              <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                Officer
                              </span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-400 font-semibold uppercase">Year {ledgerItem.yearLevel || 'N/A'}</p>
                        </div>
                      </div>
                      
                      <hr className="my-3 text-slate-100" />

                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Outstanding:</span>
                          <span className="font-bold text-red-500">{formatCurrency(ledgerItem.outstanding)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-400">Collected:</span>
                          <span className="font-bold text-emerald-600">{formatCurrency(ledgerItem.paid)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-3 text-right">
                      {ledgerItem.paymentsCount} total records
                    </div>
                  </div>
                ))}
              </div>

              <Pagination
                currentPage={currentPage}
                totalPages={Math.ceil(filteredLedger.length / PAGE_SIZE)}
                onPageChange={setCurrentPage}
                totalItems={filteredLedger.length}
                pageSize={PAGE_SIZE}
              />
            </>
          )}

          {/* Add Dues FAB */}
          <button
            onClick={() => navigate('create')}
            className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
            title="Create Payment Entry"
          >
            <Plus className="h-6 w-6" />
          </button>
        </>
      ) : (
        /* Specific Student Dues Sub-View */
        <div className="space-y-6">
          {/* Student Profile summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-100 font-bold text-lg text-[#0d6b66] uppercase shadow-inner">
                {selectedStudent.username?.substring(0, 2) || 'MB'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{(selectedStudent.students as any)?.name || selectedStudent.username}</h3>
                  {selectedStudent.type === 'officer' && (
                    <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Officer
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">BSCS — Year {(selectedStudent.students as any)?.yearLevel || 'N/A'}</p>
              </div>
            </div>

            <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2 text-right">
              <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wide">Total Outstanding Due</span>
              <span className="text-xl font-bold text-red-700">
                {formatCurrency(
                  currentStudentPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0)
                )}
              </span>
            </div>
          </div>

          {/* Dues Cards/Tables split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Dues */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="border-b border-slate-200 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Dues</span>
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {currentStudentPayments.filter(p => !p.is_paid).length} pending
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {currentStudentPayments.filter(p => !p.is_paid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">All caught up! No outstanding dues.</div>
                ) : (
                  currentStudentPayments.filter(p => !p.is_paid).map(p => {
                    const linkedEvent = p.is_event && p.events
                      ? (events.find(e => e.$id === p.events || e.$id === (p.events as any).$id)?.event_name || 'Linked Event')
                      : p.activity;

                    return (
                      <div key={p.$id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{p.item_name}</h4>
                          <span className="text-xs text-slate-400 mt-0.5 block">{linkedEvent || 'General Collection'}</span>
                          <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Qty: {p.quantity} x {formatCurrency(p.price)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => setPaidConfirm({ open: true, payment: p })}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1.5 shadow-xs transition-colors"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                            title="Edit due"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, payment: p })}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete due"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Collected History */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="border-b border-slate-200 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collected Dues</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  {currentStudentPayments.filter(p => p.is_paid).length} paid
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {currentStudentPayments.filter(p => p.is_paid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">No paid history available.</div>
                ) : (
                  currentStudentPayments.filter(p => p.is_paid).map(p => {
                    const linkedEvent = p.is_event && p.events
                      ? (events.find(e => e.$id === p.events || e.$id === (p.events as any).$id)?.event_name || 'Linked Event')
                      : p.activity;

                    return (
                      <div key={p.$id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{p.item_name}</h4>
                          <span className="text-xs text-slate-400 mt-0.5 block">{linkedEvent || 'General Collection'}</span>
                          <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Qty: {p.quantity} x {formatCurrency(p.price)}</span>
                        </div>
                        <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                          Paid
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Edit Payment Modal */}
      {editingPayment && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setEditingPayment(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Modify Outstanding Dues</h2>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={e => setEditItemName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Price (PHP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={e => setEditPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editQuantity}
                    onChange={e => setEditQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="editLinkEventCheck"
                  checked={editIsEventLink}
                  onChange={e => setEditIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                />
                <label htmlFor="editLinkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {editIsEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event</label>
                  <select
                    required
                    value={editSelectedEventId}
                    onChange={e => setEditSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                  >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                      <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Activity Name</label>
                  <input
                    type="text"
                    value={editActivityName}
                    onChange={e => setEditActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {editSubmitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Action Modals */}
      <ConfirmModal
        isOpen={paidConfirm.open}
        onClose={() => setPaidConfirm({ open: false, payment: null })}
        onConfirm={handleMarkPaid}
        title="Mark Dues as Paid"
        message={`Confirm collection of ${paidConfirm.payment ? formatCurrency(paidConfirm.payment.price * paidConfirm.payment.quantity) : ''} for "${paidConfirm.payment?.item_name}". This logs revenue and clears outstanding dues.`}
        confirmLabel="Record Collection"
        variant="info"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, payment: null })}
        onConfirm={handleDeletePayment}
        title="Delete Dues Entry"
        message={`Are you sure you want to delete outstanding due "${deleteConfirm.payment?.item_name}"? This removes the entry from the student's ledger. This action is irreversible.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminPayments;
