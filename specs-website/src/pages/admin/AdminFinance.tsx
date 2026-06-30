import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatCurrency, formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { useNavigate, useParams } from 'react-router-dom';
import { databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_REVENUE, COLLECTION_ID_EXPENSES, COLLECTION_ID_EVENTS } from '../../shared/constants';
import { ID, Query } from 'appwrite';
import type { RevenueDoc, ExpenseDoc, PaymentDoc, EventDoc } from '../../types/database';
import { RotateCw, Trash2, Loader2, ArrowLeft } from 'lucide-react';
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend
} from 'recharts';

interface AdminFinanceProps {
  isDetailsView?: boolean;
}

const AdminFinance: React.FC<AdminFinanceProps> = ({ isDetailsView = false }) => {
  const { name } = useParams<{ name: string }>();
  const decodedName = name ? decodeURIComponent(name) : '';
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
  const [eventsList, setEventsList] = useState<EventDoc[]>([]);
  const [expenseRelType, setExpenseRelType] = useState<'event' | 'activity'>('activity');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [selectedActivityName, setSelectedActivityName] = useState('General');
  const [customActivityName, setCustomActivityName] = useState('');

  // Add Revenue form states
  const [revenueDesc, setRevenueDesc] = useState('');
  const [revenueQty, setRevenueQuantity] = useState<number>(1);
  const [revenuePrice, setRevenuePrice] = useState<number>(0);
  const [revenueDate, setRevenueDate] = useState(new Date().toISOString().split('T')[0]);
  const [submittingRevenue, setSubmittingRevenue] = useState(false);
  const [revenueRelType, setRevenueRelType] = useState<'event' | 'activity'>('activity');
  const [selectedRevEventId, setSelectedRevEventId] = useState('');
  const [selectedRevActivityName, setSelectedRevActivityName] = useState('General');
  const [customRevActivityName, setCustomRevActivityName] = useState('');

  // Delete Action states
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [revenueRes, expensesRes, paymentsRes, eventsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_REVENUE, [
          Query.orderDesc('$createdAt'),
          Query.limit(500)
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_EXPENSES, [
          Query.orderDesc('$createdAt'),
          Query.limit(500)
        ]),
        cachedApi.payments.listAll({}, isRefresh ? 0 : 2 * 60 * 1000),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_EVENTS, [
          Query.orderAsc('event_name'),
          Query.limit(100)
        ])
      ]);

      setRevenue(revenueRes.documents as RevenueDoc[]);
      setExpenses(expensesRes.documents as ExpenseDoc[]);
      setPendingPayments((paymentsRes.documents as PaymentDoc[]).filter(p => !p.is_paid));
      setEventsList(eventsRes.documents as EventDoc[]);

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
    
    if (expenseRelType === 'event' && !selectedEventId) {
      addToast({ type: 'warning', title: 'Missing Event', message: 'Please select an event for this expense.' });
      return;
    }
    
    if (expenseRelType === 'activity' && selectedActivityName === 'Custom' && !customActivityName.trim()) {
      addToast({ type: 'warning', title: 'Missing Activity', message: 'Please provide a custom activity name.' });
      return;
    }

    setSubmittingExpense(true);
    try {
      const payload: any = {
        name: expenseDesc,
        quantity: expenseQty,
        price: expensePrice,
        date_buy: new Date(expenseDate).toISOString(),
        isEvent: expenseRelType === 'event'
      };

      if (expenseRelType === 'event') {
        payload.events = selectedEventId;
        payload.activity_name = null;
      } else {
        payload.events = null;
        payload.activity_name = selectedActivityName === 'Custom' ? customActivityName : selectedActivityName;
      }

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, ID.unique(), payload);

      addToast({ type: 'success', title: 'Expense Added', message: `Expense recorded successfully.` });
      setExpenseDesc('');
      setExpenseQuantity(1);
      setExpensePrice(0);
      setExpenseDate(new Date().toISOString().split('T')[0]);
      setSelectedEventId('');
      setCustomActivityName('');

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to add expense record.' });
    } finally {
      setSubmittingExpense(false);
    }
  };

  // Form revenue submit
  const handleAddRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueDesc.trim() || revenuePrice < 0 || revenueQty < 1) {
      addToast({ type: 'warning', title: 'Invalid Inputs', message: 'Please check revenue parameters.' });
      return;
    }
    
    if (revenueRelType === 'event' && !selectedRevEventId) {
      addToast({ type: 'warning', title: 'Missing Event', message: 'Please select an event for this revenue.' });
      return;
    }
    
    if (revenueRelType === 'activity' && selectedRevActivityName === 'Custom' && !customRevActivityName.trim()) {
      addToast({ type: 'warning', title: 'Missing Activity', message: 'Please provide a custom activity name.' });
      return;
    }

    setSubmittingRevenue(true);
    try {
      const payload: any = {
        name: revenueDesc,
        quantity: revenueQty,
        price: revenuePrice,
        date_earned: new Date(revenueDate).toISOString(),
        isEvent: revenueRelType === 'event'
      };

      if (revenueRelType === 'event') {
        payload.event = selectedRevEventId;
        payload.activity = null;
      } else {
        payload.event = null;
        payload.activity = selectedRevActivityName === 'Custom' ? customRevActivityName : selectedRevActivityName;
      }

      await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), payload);

      addToast({ type: 'success', title: 'Revenue Recorded', message: `Revenue record created successfully.` });
      setRevenueDesc('');
      setRevenueQuantity(1);
      setRevenuePrice(0);
      setRevenueDate(new Date().toISOString().split('T')[0]);
      setSelectedRevEventId('');
      setCustomRevActivityName('');

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to record revenue.' });
    } finally {
      setSubmittingRevenue(false);
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

  // Grouping Revenue by Event / Activity Name
  const groupedRevenue = useMemo(() => {
    const groups: { [key: string]: { name: string; isEvent: boolean; items: RevenueDoc[]; total: number } } = {};
    revenue.forEach(r => {
      let groupName = 'General Revenue';
      
      if (r.isEvent && r.event) {
        const matchedEvent = eventsList.find(e => e.$id === r.event);
        if (matchedEvent && matchedEvent.event_name) {
          groupName = matchedEvent.event_name;
        } else if (r.name) {
          const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
          groupName = match ? match[1].trim() : r.name;
        } else {
          groupName = 'Event Payments';
        }
      } else if (r.activity) {
        groupName = r.activity;
      } else if (r.name) {
        const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
        groupName = match ? match[1].trim() : r.name;
      }
      
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          isEvent: r.isEvent,
          items: [],
          total: 0
        };
      }
      groups[groupName].items.push(r);
      groups[groupName].total += (r.price || 0) * (r.quantity || 1);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [revenue, eventsList]);

  // Grouping Expenses by Event / Activity Name
  const groupedExpenses = useMemo(() => {
    const groups: { [key: string]: { name: string; isEvent: boolean; items: ExpenseDoc[]; total: number } } = {};
    expenses.forEach(e => {
      let groupName = 'General Expenses';
      if (e.isEvent) {
        if (e.events && typeof e.events === 'object' && (e.events as any).event_name) {
          groupName = (e.events as any).event_name;
        } else if (e.events && typeof e.events === 'string') {
          const matchedEvent = eventsList.find(ev => ev.$id === e.events);
          if (matchedEvent && matchedEvent.event_name) {
            groupName = matchedEvent.event_name;
          } else {
            groupName = 'Event Expenses';
          }
        } else {
          groupName = 'Event Expenses';
        }
      } else if (e.activity_name) {
        groupName = e.activity_name;
      } else if (e.name) {
        groupName = e.name;
      }
      
      if (!groups[groupName]) {
        groups[groupName] = {
          name: groupName,
          isEvent: e.isEvent,
          items: [],
          total: 0
        };
      }
      groups[groupName].items.push(e);
      groups[groupName].total += (e.price || 0) * (e.quantity || 1);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [expenses, eventsList]);

  const detailsData = useMemo(() => {
    if (!isDetailsView || !decodedName) return null;

    const matchedRevenues = revenue.filter(r => {
      let groupName = 'General Revenue';
      if (r.isEvent && r.event) {
        const matchedEvent = eventsList.find(e => e.$id === r.event);
        if (matchedEvent && matchedEvent.event_name) {
          groupName = matchedEvent.event_name;
        } else if (r.name) {
          const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
          groupName = match ? match[1].trim() : r.name;
        } else {
          groupName = 'Event Payments';
        }
      } else if (r.activity) {
        groupName = r.activity;
      } else if (r.name) {
        const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
        groupName = match ? match[1].trim() : r.name;
      }
      return groupName === decodedName;
    });

    const matchedExpenses = expenses.filter(e => {
      let groupName = 'General Expenses';
      if (e.isEvent) {
        if (e.events && typeof e.events === 'object' && (e.events as any).event_name) {
          groupName = (e.events as any).event_name;
        } else if (e.events && typeof e.events === 'string') {
          const matchedEvent = eventsList.find(ev => ev.$id === e.events);
          if (matchedEvent && matchedEvent.event_name) {
            groupName = matchedEvent.event_name;
          } else {
            groupName = 'Event Expenses';
          }
        } else {
          groupName = 'Event Expenses';
        }
      } else if (e.activity_name) {
        groupName = e.activity_name;
      } else if (e.name) {
        groupName = e.name;
      }
      return groupName === decodedName;
    });

    const totalRev = matchedRevenues.reduce((sum, r) => sum + ((r.price || 0) * (r.quantity || 1)), 0);
    const totalExp = matchedExpenses.reduce((sum, e) => sum + ((e.price || 0) * (e.quantity || 1)), 0);
    const netBalance = totalRev - totalExp;

    return {
      revenues: matchedRevenues,
      expenses: matchedExpenses,
      totalRev,
      totalExp,
      netBalance,
      isEvent: matchedRevenues[0]?.isEvent || matchedExpenses[0]?.isEvent || false
    };
  }, [isDetailsView, decodedName, revenue, expenses, eventsList]);

  const comparisonData = useMemo(() => {
    if (!detailsData) return [];
    const data = [];
    if (detailsData.totalRev > 0) {
      data.push({ name: 'Revenue', value: detailsData.totalRev });
    }
    if (detailsData.totalExp > 0) {
      data.push({ name: 'Expenses', value: detailsData.totalExp });
    }
    return data;
  }, [detailsData]);

  const revenueBreakdown = useMemo(() => {
    if (!detailsData) return [];
    const itemGroups: Record<string, number> = {};
    detailsData.revenues.forEach(r => {
      const label = r.name || 'Unnamed Revenue';
      itemGroups[label] = (itemGroups[label] || 0) + (r.price || 0) * (r.quantity || 1);
    });
    return Object.entries(itemGroups).map(([name, value]) => ({ name, value }));
  }, [detailsData]);

  const expensesBreakdown = useMemo(() => {
    if (!detailsData) return [];
    const itemGroups: Record<string, number> = {};
    detailsData.expenses.forEach(e => {
      const label = e.name || 'Unnamed Expense';
      itemGroups[label] = (itemGroups[label] || 0) + (e.price || 0) * (e.quantity || 1);
    });
    return Object.entries(itemGroups).map(([name, value]) => ({ name, value }));
  }, [detailsData]);

  const CHART_COLORS = ['#0d6b66', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  if (isDetailsView) {
    if (!detailsData) {
      return (
        <div className="flex flex-col items-center justify-center p-12 bg-white rounded-2xl border border-slate-200 shadow-sm text-center">
          <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
            <ArrowLeft className="h-6 w-6 text-slate-400" />
          </div>
          <h2 className="font-bold text-slate-800 text-lg">No details found</h2>
          <p className="text-sm text-slate-500 mt-1">We couldn't retrieve financial data for "{decodedName}".</p>
          <button
            onClick={() => navigate(window.location.pathname.split('/details')[0])}
            className="mt-4 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2 text-sm font-semibold transition-colors"
          >
            Back to Finance
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Detail Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(window.location.pathname.split('/details')[0])}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
              title="Back to Finance Overview"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 leading-snug">{decodedName}</h1>
              <p className="text-sm text-slate-500 mt-0.5">
                Financial analytics and logs for this {detailsData.isEvent ? 'event' : 'activity'}
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Revenue</span>
            <span className="text-2xl font-bold text-emerald-600 block">{formatCurrency(detailsData.totalRev)}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">{detailsData.revenues.length} collection records</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Total Expenses</span>
            <span className="text-2xl font-bold text-red-600 block">{formatCurrency(detailsData.totalExp)}</span>
            <span className="text-[10px] text-slate-400 mt-1 block">{detailsData.expenses.length} purchase records</span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Net Balance</span>
            <span className={`text-2xl font-bold block ${detailsData.netBalance >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
              {detailsData.netBalance >= 0 ? '+' : ''}{formatCurrency(detailsData.netBalance)}
            </span>
            <span className="text-[10px] text-slate-400 mt-1 block">Net financial return</span>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Charts Column (Left - 5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Pie Chart Card */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Financial Split</h3>
              
              {comparisonData.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400">
                  <span className="text-xs">No transaction records to display chart.</span>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={comparisonData}
                          cx="50%"
                          cy="50%"
                          innerRadius={60}
                          outerRadius={80}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {comparisonData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.name === 'Revenue' ? '#0d6b66' : '#ef4444'} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any) => [formatCurrency(Number(value)), 'Total']}
                          contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0' }}
                        />
                        <Legend verticalAlign="bottom" height={36} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  
                  {/* Custom percentages labels for elegance */}
                  <div className="grid grid-cols-2 gap-4 border-t pt-4">
                    {comparisonData.map((item, idx) => {
                      const pct = ((item.value / (detailsData.totalRev + detailsData.totalExp)) * 100).toFixed(1);
                      return (
                        <div key={idx} className="text-center">
                          <span className={`text-[10px] font-bold uppercase tracking-wider ${item.name === 'Revenue' ? 'text-[#0d6b66]' : 'text-red-500'}`}>
                            {item.name}
                          </span>
                          <p className="text-xl font-bold text-slate-800 mt-0.5">{pct}%</p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Breakdown Cards */}
            {revenueBreakdown.length > 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue Breakdown</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={revenueBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {revenueBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {expensesBreakdown.length > 1 && (
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Expenses Breakdown</h3>
                <div className="h-56 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={expensesBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={2}
                        dataKey="value"
                      >
                        {expensesBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => formatCurrency(Number(value))} />
                      <Legend layout="horizontal" verticalAlign="bottom" align="center" wrapperStyle={{ fontSize: '10px' }} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </div>

          {/* Ledger Lists (Right - 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Revenue List */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Revenue Collections</h3>
              {detailsData.revenues.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">No revenue logs for this event.</div>
              ) : (
                <div className="overflow-x-auto text-nowrap">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {detailsData.revenues.map(item => (
                        <tr key={item.$id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400">{item.date_earned ? formatDate(item.date_earned) : 'N/A'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-normal">{item.name}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.price || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{item.quantity || 1}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-emerald-600">
                            {formatCurrency((item.price || 0) * (item.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Expenses List */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Expense Purchases</h3>
              {detailsData.expenses.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400">No expense records for this event.</div>
              ) : (
                <div className="overflow-x-auto text-nowrap">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                        <th className="py-2.5 px-3">Date</th>
                        <th className="py-2.5 px-3">Description</th>
                        <th className="py-2.5 px-3 text-right">Unit Price</th>
                        <th className="py-2.5 px-3 text-right">Qty</th>
                        <th className="py-2.5 px-3 text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {detailsData.expenses.map(item => (
                        <tr key={item.$id} className="hover:bg-slate-50/50">
                          <td className="py-2.5 px-3 text-slate-400">{item.date_buy ? formatDate(item.date_buy) : 'N/A'}</td>
                          <td className="py-2.5 px-3 font-semibold text-slate-700 whitespace-normal">{item.name}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{formatCurrency(item.price || 0)}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{item.quantity || 1}</td>
                          <td className="py-2.5 px-3 text-right font-bold text-red-600">
                            {formatCurrency((item.price || 0) * (item.quantity || 1))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

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
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
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
        /* Grouped Revenue Cards and Form */
        <div className="space-y-6">
          {/* Add Revenue form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Record New Revenue</h3>
            <form onSubmit={handleAddRevenue} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description / Source</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. BSCS-3A T-Shirt Payments / Sponsorship"
                    value={revenueDesc}
                    onChange={e => setRevenueDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={revenueQty}
                    onChange={e => setRevenueQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
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
                    value={revenuePrice || ''}
                    onChange={e => setRevenuePrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date Received</label>
                  <input
                    type="date"
                    required
                    value={revenueDate}
                    onChange={e => setRevenueDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Relates To</label>
                  <select
                    value={revenueRelType}
                    onChange={e => setRevenueRelType(e.target.value as 'event' | 'activity')}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  >
                    <option value="activity">General Activity</option>
                    <option value="event">Official Event</option>
                  </select>
                </div>

                {revenueRelType === 'event' ? (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event</label>
                    <select
                      value={selectedRevEventId}
                      onChange={e => setSelectedRevEventId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                    >
                      <option value="">-- Choose Event --</option>
                      {eventsList.map(ev => (
                        <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2 lg:col-span-2 flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Activity</label>
                      <select
                        value={selectedRevActivityName}
                        onChange={e => setSelectedRevActivityName(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                      >
                        <option value="General">General Operations</option>
                        <option value="Membership Fee">Membership Fees</option>
                        <option value="T-Shirt Payment">T-Shirt Payments</option>
                        <option value="Donation / Sponsorship">Donation & Sponsorships</option>
                        <option value="Merchandise Sales">Merchandise Sales</option>
                        <option value="Custom">Custom Activity Name...</option>
                      </select>
                    </div>
                    {selectedRevActivityName === 'Custom' && (
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Custom Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Contribution"
                          value={customRevActivityName}
                          onChange={e => setCustomRevActivityName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingRevenue}
                className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm py-2.5 shadow-sm transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {submittingRevenue && <Loader2 className="h-4 w-4 animate-spin" />}
                Record Revenue Entry
              </button>
            </form>
          </div>

          {/* Grouped Revenue Cards */}
          <div className="space-y-4">
            {groupedRevenue.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              No revenue collections logged.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {groupedRevenue.map((group, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`details/${encodeURIComponent(group.name)}`)}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-snug">{group.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                          group.isEvent 
                            ? 'bg-blue-50 text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-900/30' 
                            : 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700'
                        }`}>
                          {group.isEvent ? 'Event Payments' : 'General Activity'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-emerald-600 dark:text-emerald-500 block">
                          + {formatCurrency(group.total)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {group.items.length} payments
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {group.items.map(item => (
                        <div key={item.$id} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0 text-xs">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={item.name || ''}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.date_earned ? formatDate(item.date_earned) : 'N/A'}</p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="font-bold text-slate-900 dark:text-white">{formatCurrency((item.price || 0) * (item.quantity || 1))}</p>
                            <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity || 1} × {formatCurrency(item.price || 0)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    ) : (
        /* Expense Logs Panel (Includes Form + logs list) */
        <div className="space-y-6">
          {/* Add Expense form */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider mb-4">Record New Expense</h3>
            <form onSubmit={handleAddExpense} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Printer inks / Office supplies"
                    value={expenseDesc}
                    onChange={e => setExpenseDesc(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
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
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
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
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date Purchased</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={e => setExpenseDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Relates To</label>
                  <select
                    value={expenseRelType}
                    onChange={e => setExpenseRelType(e.target.value as 'event' | 'activity')}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                  >
                    <option value="activity">General Activity</option>
                    <option value="event">Official Event</option>
                  </select>
                </div>

                {expenseRelType === 'event' ? (
                  <div className="sm:col-span-2 lg:col-span-2">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event</label>
                    <select
                      value={selectedEventId}
                      onChange={e => setSelectedEventId(e.target.value)}
                      required
                      className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                    >
                      <option value="">-- Choose Event --</option>
                      {eventsList.map(ev => (
                        <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="sm:col-span-2 lg:col-span-2 flex gap-3">
                    <div className="flex-1">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Activity</label>
                      <select
                        value={selectedActivityName}
                        onChange={e => setSelectedActivityName(e.target.value)}
                        required
                        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                      >
                        <option value="General">General Operations</option>
                        <option value="Marketing">Marketing / Publicity</option>
                        <option value="Office Supplies">Office Supplies</option>
                        <option value="Logistics">Logistics / Transportation</option>
                        <option value="Food & Catering">Food & Catering</option>
                        <option value="Prizes & Awards">Prizes & Awards</option>
                        <option value="Custom">Custom Activity Name...</option>
                      </select>
                    </div>
                    {selectedActivityName === 'Custom' && (
                      <div className="flex-1">
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Custom Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Workshop"
                          value={customActivityName}
                          onChange={e => setCustomActivityName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] dark:bg-slate-900"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={submittingExpense}
                className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm py-2.5 shadow-sm transition-colors flex items-center justify-center gap-2 mt-4"
              >
                {submittingExpense && <Loader2 className="h-4 w-4 animate-spin" />}
                Save Expense Record
              </button>
            </form>
          </div>

          {/* Grouped Expenses Cards */}
          {groupedExpenses.length === 0 ? (
            <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-400">
              No expense records found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              {groupedExpenses.map((group, idx) => (
                <div
                  key={idx}
                  onClick={() => navigate(`details/${encodeURIComponent(group.name)}`)}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs flex flex-col justify-between cursor-pointer hover:shadow-md hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-slate-800 text-base leading-snug">{group.name}</h3>
                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider mt-1.5 ${
                          group.isEvent 
                            ? 'bg-amber-50 text-amber-700 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30' 
                            : 'bg-slate-50 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-350 dark:border-slate-700'
                        }`}>
                          {group.isEvent ? 'Event Expense' : 'General Activity'}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-bold text-red-600 dark:text-red-500 block">
                          - {formatCurrency(group.total)}
                        </span>
                        <span className="text-[10px] text-slate-400 block mt-0.5">
                          {group.items.length} items
                        </span>
                      </div>
                    </div>
                    
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-3 space-y-2.5 max-h-48 overflow-y-auto pr-1">
                      {group.items.map(item => (
                        <div key={item.$id} className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/40 last:border-0 text-xs">
                          <div>
                            <p className="font-semibold text-slate-800 dark:text-slate-200 truncate max-w-[180px]" title={item.name || ''}>
                              {item.name}
                            </p>
                            <p className="text-[10px] text-slate-400 mt-0.5">{item.date_buy ? formatDate(item.date_buy) : 'N/A'}</p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-right">
                              <p className="font-bold text-slate-900 dark:text-white">{formatCurrency((item.price || 0) * (item.quantity || 1))}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5">Qty: {item.quantity || 1} × {formatCurrency(item.price || 0)}</p>
                            </div>
                            <button
                              onClick={() => setDeleteConfirm({ open: true, id: item.$id })}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 p-1.5 rounded-lg transition-colors border border-transparent hover:border-red-100 dark:hover:border-red-900/30"
                              title="Delete record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
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
