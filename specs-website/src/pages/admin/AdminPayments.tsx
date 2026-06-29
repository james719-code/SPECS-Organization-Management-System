import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc, PaymentDoc, AccountDoc } from '../../types/database';
import { ArrowLeft, RotateCw, Search, Plus, Edit, Trash2, X, Loader2 } from 'lucide-react';

const AdminPayments: React.FC = () => {
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

  // Add Payment Modal State
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [itemName, setItemName] = useState('');
  const [price, setPrice] = useState<number>(0);
  const [quantity, setQuantity] = useState<number>(1);
  const [isEventLink, setIsEventLink] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [assignAll, setAssignAll] = useState(false);
  const [assignStudentQuery, setAssignStudentQuery] = useState('');
  const [selectedAssignee, setSelectedAssignee] = useState<{ id: string; name: string } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<{ id: string; name: string }[]>([]);
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

  // Autocomplete change
  const handleAssigneeSearch = (val: string) => {
    setAssignStudentQuery(val);
    setSelectedAssignee(null);

    if (val.trim().length < 2) {
      setAutocompleteResults([]);
      return;
    }

    const matches = students
      .filter(acc => {
        const profile = acc.students as any;
        const name = profile?.name || acc.username || '';
        return name.toLowerCase().includes(val.toLowerCase());
      })
      .map(acc => {
        const profile = acc.students as any;
        return {
          id: profile?.$id || acc.$id,
          name: profile?.name || acc.username || 'Unknown Student'
        };
      })
      .slice(0, 5);

    setAutocompleteResults(matches);
  };

  const handleSelectAssignee = (id: string, name: string) => {
    setSelectedAssignee({ id, name });
    setAssignStudentQuery(name);
    setAutocompleteResults([]);
  };

  // Assign payment logic
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!itemName.trim() || price < 0 || quantity < 1) {
      addToast({ type: 'warning', title: 'Invalid inputs', message: 'Please review payment details.' });
      return;
    }

    if (!assignAll && !selectedAssignee) {
      addToast({ type: 'warning', title: 'Assignee needed', message: 'Select a student or check assign to all.' });
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
      } else if (selectedAssignee) {
        await api.payments.create({ ...payload, students: selectedAssignee.id });
        addToast({ type: 'success', title: 'Assigned', message: `Outstanding due assigned to ${selectedAssignee.name}.` });
      }

      setIsAddOpen(false);
      setItemName('');
      setPrice(0);
      setQuantity(1);
      setIsEventLink(false);
      setActivityName('');
      setSelectedEventId('');
      setAssignAll(false);
      setAssignStudentQuery('');
      setSelectedAssignee(null);

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
    return students.map(std => {
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
  }, [students, payments]);

  // Filter student ledger items
  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return studentLedger;
    const q = searchQuery.toLowerCase();
    return studentLedger.filter(l => l.name.toLowerCase().includes(q));
  }, [studentLedger, searchQuery]);

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
          {selectedStudent && (
            <button
              onClick={() => setSelectedStudent(null)}
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
      {!selectedStudent ? (
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {filteredLedger.map(ledgerItem => (
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
          )}

          {/* Add Dues FAB */}
          <button
            onClick={() => setIsAddOpen(true)}
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

      {/* Add Payment Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsAddOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">New Payment Due Entry</h2>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Membership Fee 2026"
                  value={itemName}
                  onChange={e => setItemName(e.target.value)}
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
                    placeholder="0.00"
                    value={price || ''}
                    onChange={e => setPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={quantity}
                    onChange={e => setQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="linkEventCheck"
                  checked={isEventLink}
                  onChange={e => setIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                />
                <label htmlFor="linkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {isEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event</label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
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
                    placeholder="e.g. 1st Semester Collection"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              )}

              <hr className="my-4 border-slate-100" />

              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="assignAllCheck"
                  checked={assignAll}
                  onChange={e => setAssignAll(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                />
                <label htmlFor="assignAllCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Assign to all members directory
                </label>
              </div>

              {!assignAll && (
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Search assignee</label>
                  <input
                    type="text"
                    placeholder="Type name..."
                    value={assignStudentQuery}
                    onChange={e => handleAssigneeSearch(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                  {autocompleteResults.length > 0 && (
                    <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl max-h-40 overflow-y-auto z-20">
                      {autocompleteResults.map(match => (
                        <button
                          key={match.id}
                          type="button"
                          onClick={() => handleSelectAssignee(match.id, match.name)}
                          className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b last:border-b-0"
                        >
                          {match.name}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Due
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
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
        </div>
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
