import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatCurrency, formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_REVENUE, COLLECTION_ID_EXPENSES } from '../../shared/constants';
import { ID, Query } from 'appwrite';
import type { RevenueDoc, ExpenseDoc, PaymentDoc } from '../../types/database';

const AdminFinance: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'revenue' | 'expenses'>('revenue');
  const [revenue, setRevenue] = useState<RevenueDoc[]>([]);
  const [expenses, setExpenses] = useState<ExpenseDoc[]>([]);
  const [pendingPayments, setPendingPayments] = useState<PaymentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Add Expense form states
  const [expenseDesc, setExpenseDesc] = useState('');
  const [expenseQty, setExpenseQuantity] = useState<number>(1);
  const [expensePrice, setExpensePrice] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingExpense, setSubmittingExpense] = useState(false);

  // Delete Action states
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [revenueRes, expensesRes, paymentsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [
          Query.orderDesc('$createdAt'),
          Query.limit(500)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [
          Query.orderDesc('$createdAt'),
          Query.limit(500)
        ]),
        cachedApi.payments.listAll({}, isRefresh ? 0 : 2 * 60 * 1000)
      ]);

      setRevenue(revenueRes.documents as RevenueDoc[]);
      setExpenses(expensesRes.documents as ExpenseDoc[]);
      setPendingPayments((paymentsRes.documents as PaymentDoc[]).filter(p => !p.is_paid));

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Finance logs synchronized successfully.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to sync finance logs.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Form expense submit
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseDesc.trim() || expensePrice < 0 || expenseQty < 1) {
      addToast({ type: 'warning', title: 'Invalid Inputs', message: 'Please check expense parameters.' });
      return;
    }

    setSubmittingExpense(true);
    try {
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, ID.unique(), {
        name: expenseDesc,
        quantity: expenseQty,
        price: expensePrice,
        date_buy: new Date(expenseDate).toISOString(),
        isEvent: false
      });

      addToast({ type: 'success', title: 'Expense Added', message: `Expense recorded successfully.` });
      setExpenseDesc('');
      setExpenseQuantity(1);
      setExpensePrice(0);
      setExpenseDate(new Date().toISOString().split('T')[0]);

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to add expense record.' });
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Delete expense record
  const handleDeleteExpense = async () => {
    if (!deleteConfirm.id) return;
    setActionLoading(true);
    try {
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, deleteConfirm.id);
      addToast({ type: 'success', title: 'Success', message: 'Expense entry deleted successfully.' });
      setDeleteConfirm({ open: false, id: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete expense entry.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Export finance stats to CSV
  const handleExportCSV = () => {
    try {
      let csvContent = 'data:text/csv;charset=utf-8,';
      
      if (activeTab === 'revenue') {
        csvContent += 'Description,Quantity,Price,Total,Date,Source\n';
        revenue.forEach(r => {
          csvContent += `"${r.name || ''}",${r.quantity || 1},${r.price || 0},${(r.price || 0) * (r.quantity || 1)},"${r.date_earned ? formatDate(r.date_earned) : ''}","${r.isEvent ? 'Event linked' : 'General'}"\n`;
        });
      } else {
        csvContent += 'Description,Quantity,Price,Total,Date\n';
        expenses.forEach(e => {
          csvContent += `"${e.name || ''}",${e.quantity || 1},${e.price || 0},${(e.price || 0) * (e.quantity || 1)},"${e.date_buy ? formatDate(e.date_buy) : ''}"\n`;
        });
      }

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `SPECS_Finance_${activeTab.toUpperCase()}_Export.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({ type: 'success', title: 'Export Complete', message: 'Ledger exported successfully.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not export finance logs.' });
    }
  };

  // Metrics computation
  const summaryMetrics = useMemo(() => {
    const totalRev = revenue.reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 1)), 0);
    const totalExp = expenses.reduce((sum, e) => sum + ((e.price || 0) * (e.quantity || 1)), 0);
    const netBal = totalRev - totalExp;

    const pendingCount = pendingPayments.length;
    const pendingSum = pendingPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);

    return { totalRev, totalExp, netBal, pendingCount, pendingSum };
  }, [revenue, expenses, pendingPayments]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Finance Overview</h1>
          <p className="text-sm text-slate-500 mt-1">Track organization revenues and expenses</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/dashboard/admin/payments')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Manage Payments
          </button>
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
          >
            Export CSV
          </button>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <svg className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
            </svg>
            Refresh
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Revenue</span>
          <span className="text-2xl font-bold text-emerald-600 block">{formatCurrency(summaryMetrics.totalRev)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Expenses</span>
          <span className="text-2xl font-bold text-red-600 block">{formatCurrency(summaryMetrics.totalExp)}</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Balance</span>
          <span className={`text-2xl font-bold block ${summaryMetrics.netBal >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
            {formatCurrency(summaryMetrics.netBal)}
          </span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Pending Dues</span>
          <span className="text-2xl font-bold text-amber-500 block">{summaryMetrics.pendingCount} pending</span>
          <span className="text-[10px] text-slate-400 mt-1 block">Value: {formatCurrency(summaryMetrics.pendingSum)}</span>
        </div>
      </div>

      {/* Tab select bar */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveTab('revenue')}
          className={`rounded-full px-5 py-2 text-xs font-semibold shadow-xs transition-colors border ${
            activeTab === 'revenue'
              ? 'bg-[#0d6b66] border-[#0d6b66] text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Revenue Logs
        </button>
        <button
          onClick={() => setActiveTab('expenses')}
          className={`rounded-full px-5 py-2 text-xs font-semibold shadow-xs transition-colors border ${
            activeTab === 'expenses'
              ? 'bg-[#0d6b66] border-[#0d6b66] text-white'
              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          Expense Logs
        </button>
      </div>

      {/* Tables section */}
      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : activeTab === 'revenue' ? (
        /* Revenue Logs Panel */
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collected Revenue</h3>
          </div>
          {revenue.length === 0 ? (
            <div className="p-8 text-center text-sm text-slate-400">No revenue collections logged.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Description</th>
                    <th className="px-6 py-3 text-left">Source type</th>
                    <th className="px-6 py-3 text-left">Quantity</th>
                    <th className="px-6 py-3 text-left">Unit Price</th>
                    <th className="px-6 py-3 text-left">Total</th>
                    <th className="px-6 py-3 text-left">Date logged</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {revenue.map(r => (
                    <tr key={r.$id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-3.5 font-medium text-slate-900">{r.name || 'General Earnings'}</td>
                      <td className="px-6 py-3.5 text-slate-500">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          r.isEvent ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-50 text-slate-700 border border-slate-200'
                        }`}>
                          {r.isEvent ? 'Event payment' : 'General'}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">{r.quantity || 1}</td>
                      <td className="px-6 py-3.5 text-slate-500">{formatCurrency(r.price || 0)}</td>
                      <td className="px-6 py-3.5 font-bold text-slate-900">{formatCurrency((r.price || 0) * (r.quantity || 1))}</td>
                      <td className="px-6 py-3.5 text-xs text-slate-400">{r.date_earned ? formatDate(r.date_earned) : 'N/A'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Expense Logs Panel (Includes Form + logs list) */
        <div className="space-y-6">
          {/* Add Expense form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Record New Expense</h3>
            <form onSubmit={handleAddExpense} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
              <div className="lg:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Printer inks / Office supplies"
                  value={expenseDesc}
                  onChange={e => setExpenseDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={expenseQty}
                  onChange={e => setExpenseQuantity(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Unit Price (PHP)</label>
                <input
                  type="number"
                  required
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={expensePrice || ''}
                  onChange={e => setExpensePrice(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date Purchased</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={e => setExpenseDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66]"
                />
              </div>
              <button
                type="submit"
                disabled={submittingExpense}
                className="lg:col-span-5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm py-2.5 shadow-sm transition-colors flex items-center justify-center gap-2"
              >
                {submittingExpense && (
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                )}
                Save Expense Record
              </button>
            </form>
          </div>

          {/* Expenses Table list */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Expense Logs</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="p-8 text-center text-sm text-slate-400">No expense records found.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-slate-700">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="px-6 py-3 text-left">Description</th>
                      <th className="px-6 py-3 text-left">Quantity</th>
                      <th className="px-6 py-3 text-left">Unit Price</th>
                      <th className="px-6 py-3 text-left">Total</th>
                      <th className="px-6 py-3 text-left">Date bought</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map(e => (
                      <tr key={e.$id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 font-medium text-slate-900">{e.name || 'General Expense'}</td>
                        <td className="px-6 py-3.5 text-slate-500">{e.quantity || 1}</td>
                        <td className="px-6 py-3.5 text-slate-500">{formatCurrency(e.price || 0)}</td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{formatCurrency((e.price || 0) * (e.quantity || 1))}</td>
                        <td className="px-6 py-3.5 text-xs text-slate-400">{e.date_buy ? formatDate(e.date_buy) : 'N/A'}</td>
                        <td className="px-6 py-3.5 text-right">
                          <button
                            onClick={() => setDeleteConfirm({ open: true, id: e.$id })}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                            title="Delete record"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Expense record confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteExpense}
        title="Delete Expense Entry"
        message="Are you sure you want to delete this recorded expense line? This adjustment modifies net balancing reports."
        confirmLabel="Remove"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminFinance;
