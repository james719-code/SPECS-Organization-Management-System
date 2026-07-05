import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
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
import { RotateCw, Trash2, Loader2, ArrowLeft, Printer } from 'lucide-react';
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
  const [officersList, setOfficersList] = useState<any[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSignatory, setPrintSignatory] = useState<'treasurer' | 'asst-treasurer'>('treasurer');
  const [printScope, setPrintScope] = useState<string>('all');

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
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; type: 'revenue' | 'expense' | null }>({ open: false, id: null, type: null });
  const [actionLoading, setActionLoading] = useState(false);

  const getRevenueGroupName = (r: RevenueDoc) => {
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
    }
    return groupName;
  };

  const getExpenseGroupName = (e: ExpenseDoc) => {
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
    }
    return groupName;
  };

  const financeGroupsList = useMemo(() => {
    const groups = new Set<string>();
    revenue.forEach(r => {
      groups.add(getRevenueGroupName(r));
    });
    expenses.forEach(e => {
      groups.add(getExpenseGroupName(e));
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [revenue, expenses, eventsList]);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [revenueRes, expensesRes, paymentsRes, eventsRes, officersRes] = await Promise.all([
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
        ]),
        cachedApi.officers.listAll(isRefresh ? 0 : 5 * 60 * 1000)
      ]);

      setRevenue(revenueRes.documents as RevenueDoc[]);
      setExpenses(expensesRes.documents as ExpenseDoc[]);
      setPendingPayments((paymentsRes.documents as PaymentDoc[]).filter(p => !p.is_paid));
      setEventsList(eventsRes.documents as EventDoc[]);
      setOfficersList(officersRes.documents as any);

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

  // Delete finance record (revenue/expense)
  const handleDeleteConfirm = async () => {
    if (!deleteConfirm.id || !deleteConfirm.type) return;
    const { id, type } = deleteConfirm;
    
    // Close modal immediately to avoid UI blocking
    setDeleteConfirm({ open: false, id: null, type: null });
    addToast({ 
      type: 'info', 
      title: type === 'revenue' ? 'Deleting Revenue' : 'Deleting Expense', 
      message: 'Removing transaction entry in the background...' 
    });

    (async () => {
      try {
        if (type === 'revenue') {
          await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_REVENUE, id);
          addToast({ type: 'success', title: 'Success', message: 'Revenue entry deleted successfully.' });
        } else {
          await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_EXPENSES, id);
          addToast({ type: 'success', title: 'Success', message: 'Expense entry deleted successfully.' });
        }
        loadData(true);
      } catch (err: any) {
        addToast({ 
          type: 'error', 
          title: 'Error', 
          message: err.message || `Failed to delete ${type} entry.` 
        });
      }
    })();
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

  const getActivityStartDate = (gName: string) => {
    let earliestDate: Date | null = null;
    revenue.forEach(r => {
      let groupName = 'General Revenue';
      if (r.isEvent && r.event) {
        const matchedEvent = eventsList.find(e => e.$id === r.event);
        if (matchedEvent && matchedEvent.event_name) {
          groupName = matchedEvent.event_name;
        } else if (r.name) {
          const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
          groupName = match ? match[1].trim() : r.name;
        }
      } else if (r.activity) {
        groupName = r.activity;
      } else if (r.name) {
        const match = r.name.match(/^(.*?)\s*\(Paid by.*\)$/i);
        groupName = match ? match[1].trim() : r.name;
      }
      
      if (groupName === gName && r.date_earned) {
        const d = new Date(r.date_earned);
        if (!earliestDate || d < earliestDate) earliestDate = d;
      }
    });

    expenses.forEach(e => {
      let groupName = 'General Expense';
      if (e.isEvent && e.events) {
        const matchedEvent = eventsList.find(ev => ev.$id === (typeof e.events === 'string' ? e.events : (e.events as any).$id));
        if (matchedEvent && matchedEvent.event_name) {
          groupName = matchedEvent.event_name;
        } else if (e.name) {
          groupName = e.name;
        }
      } else if (e.activity_name) {
        groupName = e.activity_name;
      } else if (e.name) {
        groupName = e.name;
      }

      if (groupName === gName && e.date_buy) {
        const d = new Date(e.date_buy);
        if (!earliestDate || d < earliestDate) earliestDate = d;
      }
    });

    return earliestDate;
  };

  const getOrgBalanceBefore = (date: Date | null) => {
    if (!date) return 0;
    let totalRevBefore = 0;
    let totalExpBefore = 0;

    revenue.forEach(r => {
      if (r.date_earned) {
        const d = new Date(r.date_earned);
        if (d.getTime() < date.getTime()) {
          totalRevBefore += (r.price || 0) * (r.quantity || 1);
        }
      }
    });

    expenses.forEach(e => {
      if (e.date_buy) {
        const d = new Date(e.date_buy);
        if (d.getTime() < date.getTime()) {
          totalExpBefore += (e.price || 0) * (e.quantity || 1);
        }
      }
    });

    return totalRevBefore - totalExpBefore;
  };

  const handlePrintCombinedReport = async (selectedRole: 'treasurer' | 'asst-treasurer', selectedScope: string) => {
    const origin = window.location.origin;

    const groups: Record<string, {
      name: string;
      isEvent: boolean;
      revenues: RevenueDoc[];
      expenses: ExpenseDoc[];
      totalRev: number;
      totalExp: number;
      netBalance: number;
    }> = {};

    revenue.forEach(r => {
      const gName = getRevenueGroupName(r);
      if (!groups[gName]) {
        groups[gName] = { name: gName, isEvent: r.isEvent || false, revenues: [], expenses: [], totalRev: 0, totalExp: 0, netBalance: 0 };
      }
      groups[gName].revenues.push(r);
      groups[gName].totalRev += (r.price || 0) * (r.quantity || 1);
    });

    expenses.forEach(e => {
      const gName = getExpenseGroupName(e);
      if (!groups[gName]) {
        groups[gName] = { name: gName, isEvent: e.isEvent || false, revenues: [], expenses: [], totalRev: 0, totalExp: 0, netBalance: 0 };
      }
      groups[gName].expenses.push(e);
      groups[gName].totalExp += (e.price || 0) * (e.quantity || 1);
    });

    Object.keys(groups).forEach(gName => {
      const g = groups[gName];
      g.netBalance = g.totalRev - g.totalExp;
    });

    const groupsList = Object.values(groups).sort((a, b) => b.totalRev + b.totalExp - (a.totalRev + a.totalExp));

    const overallRev = summaryMetrics.totalRev;
    const overallExp = summaryMetrics.totalExp;
    const overallBal = summaryMetrics.netBal;
    
    const totalTransactions = overallRev + overallExp;
    const revPercent = totalTransactions > 0 ? Math.round((overallRev / totalTransactions) * 100) : 0;
    const expPercent = totalTransactions > 0 ? 100 - revPercent : 0;

    // Build timeline points for line graph
    const allTransactions: { date: Date; amount: number; type: 'revenue' | 'expense' }[] = [];
    
    revenue.forEach(r => {
      if (r.date_earned) {
        allTransactions.push({
          date: new Date(r.date_earned),
          amount: (r.price || 0) * (r.quantity || 1),
          type: 'revenue'
        });
      }
    });
    
    expenses.forEach(e => {
      if (e.date_buy) {
        allTransactions.push({
          date: new Date(e.date_buy),
          amount: (e.price || 0) * (e.quantity || 1),
          type: 'expense'
        });
      }
    });

    allTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());

    let running = 0;
    const historyPoints = allTransactions.map(t => {
      if (t.type === 'revenue') running += t.amount;
      else running -= t.amount;
      return {
        dateStr: t.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        runningBal: running
      };
    });

    const generateSVGPieChart = (slices: { name: string; value: number }[]) => {
      const total = slices.reduce((sum, s) => sum + s.value, 0);
      if (total === 0) {
        return `<div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 50px 0;">No expenditures logged</div>`;
      }
      
      const colors = ['#0d6b66', '#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#8b5cf6'];
      let cumulativeAngle = 0;
      let content = '';
      
      slices.forEach((slice, idx) => {
        const percentage = (slice.value / total) * 100;
        const angle = (slice.value / total) * 360;
        
        // Arc coordinates
        const r = 50;
        const cx = 80;
        const cy = 70;
        
        const x1 = cx + r * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
        const y1 = cy + r * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
        
        cumulativeAngle += angle;
        
        const x2 = cx + r * Math.cos((cumulativeAngle - 90) * Math.PI / 180);
        const y2 = cy + r * Math.sin((cumulativeAngle - 90) * Math.PI / 180);
        
        const largeArc = angle > 180 ? 1 : 0;
        
        const pathData = angle === 360
          ? `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="${colors[idx % colors.length]}" stroke-width="12" />`
          : `<path d="M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}" fill="none" stroke="${colors[idx % colors.length]}" stroke-width="12" />`;
          
        content += pathData;
      });

      let legendHtml = '<div style="display: flex; flex-direction: column; gap: 6px; font-size: 9px; font-weight: 700; color: #334155; margin-left: 20px; justify-content: center;">';
      slices.forEach((slice, idx) => {
        const pct = ((slice.value / total) * 100).toFixed(1);
        legendHtml += `
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="display: inline-block; width: 8px; height: 8px; background-color: ${colors[idx % colors.length]}; border-radius: 2px;"></span>
            <span style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 140px;">${slice.name}</span>
            <span style="color: #64748b; margin-left: auto;">₱${slice.value.toLocaleString()} (${pct}%)</span>
          </div>
        `;
      });
      legendHtml += '</div>';

      return `
        <div style="display: flex; align-items: center; justify-content: center; height: 140px;">
          <svg width="160px" height="140px" style="transform: rotate(0deg); overflow: visible;">
            ${content}
          </svg>
          ${legendHtml}
        </div>
      `;
    };

    const generateSVGBarChart = (activities: typeof groupsList) => {
      const width = 500, height = 150, padding = 20;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      
      const maxVal = Math.max(...activities.map(a => Math.max(a.totalRev, a.totalExp)), 100);
      
      const barGroupWidth = chartWidth / (activities.length || 1);
      const barWidth = Math.max(barGroupWidth * 0.3, 4);
      
      let content = '';
      
      activities.forEach((act, idx) => {
        const x = padding + idx * barGroupWidth;
        
        // Revenue bar
        const revHeight = (act.totalRev / maxVal) * chartHeight;
        const revY = padding + chartHeight - revHeight;
        const revBarX = x + (barGroupWidth - barWidth * 2 - 2) / 2;
        
        // Expense bar
        const expHeight = (act.totalExp / maxVal) * chartHeight;
        const expY = padding + chartHeight - expHeight;
        const expBarX = revBarX + barWidth + 2;
        
        content += `
          <rect x="${revBarX}" y="${revY}" width="${barWidth}" height="${revHeight}" fill="#0d6b66" rx="1.5" />
          <rect x="${expBarX}" y="${expY}" width="${barWidth}" height="${expHeight}" fill="#ef4444" rx="1.5" />
          
          <text x="${x + barGroupWidth / 2}" y="${height - padding + 12}" font-size="7" font-weight="700" fill="#334155" text-anchor="middle">
            ${act.name.length > 10 ? act.name.slice(0, 8) + '..' : act.name}
          </text>
        `;
      });
      
      return `<svg width="100%" height="140px" viewBox="0 0 ${width} ${height}">${content}</svg>`;
    };

    const generateSVGLineChart = (pointsList: typeof historyPoints) => {
      const width = 500, height = 180, padding = 35;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;
      
      if (pointsList.length === 0) {
        return `<div style="text-align: center; color: #94a3b8; font-size: 11px; padding: 50px 0;">No cash trend data available</div>`;
      }
      
      const values = pointsList.map(t => t.runningBal);
      const minVal = Math.min(...values, 0);
      const maxVal = Math.max(...values, 100);
      const range = maxVal - minVal;
      
      let content = '';
      
      // Draw grid lines
      for (let i = 0; i <= 3; i++) {
        const y = padding + chartHeight * (1 - i / 3);
        const val = minVal + (range * i) / 3;
        content += `
          <line x1="${padding}" y1="${y}" x2="${width - padding}" y2="${y}" stroke="#e2e8f0" stroke-width="0.8" />
          <text x="${padding - 6}" y="${y + 3}" font-size="7" fill="#64748b" text-anchor="end">₱${Math.round(val).toLocaleString()}</text>
        `;
      }
      
      const points = pointsList.map((t, idx) => {
        const x = padding + (idx / (pointsList.length - 1 || 1)) * chartWidth;
        const y = padding + chartHeight * (1 - (t.runningBal - minVal) / range);
        return { x, y, date: t.dateStr, val: t.runningBal };
      });
      
      const pathD = points.map((p, idx) => `${idx === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
      const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;
      
      content += `
        <path d="${areaD}" fill="url(#printLineGrad)" opacity="0.1" />
        <path d="${pathD}" fill="none" stroke="#0d6b66" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
      `;
      
      const labelInterval = Math.max(Math.ceil(points.length / 5), 1);
      points.forEach((p, idx) => {
        content += `<circle cx="${p.x}" cy="${p.y}" r="2.5" fill="#0d6b66" stroke="#ffffff" stroke-width="1" />`;
        
        if (idx % labelInterval === 0 || idx === points.length - 1) {
          content += `
            <text x="${p.x}" y="${height - padding + 12}" font-size="7" fill="#64748b" text-anchor="middle">${p.date}</text>
            <line x1="${p.x}" y1="${p.y}" x2="${p.x}" y2="${height - padding}" stroke="#cbd5e1" stroke-width="0.6" stroke-dasharray="2,2" opacity="0.5" />
          `;
        }
      });
      
      return `
        <svg width="100%" height="180px" viewBox="0 0 ${width} ${height}">
          <defs>
            <linearGradient id="printLineGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#0d6b66" />
              <stop offset="100%" stop-color="#0d6b66" stop-opacity="0" />
            </linearGradient>
          </defs>
          ${content}
        </svg>
      `;
    };

    const getOfficerDetails = (posKey: string, fallbackTitle: string) => {
      const match = officersList.find(o => o.position === posKey);
      if (match && match.students) {
        return {
          name: match.students.name || '_______________________',
          title: match.position_title || match.position || fallbackTitle
        };
      }
      return {
        name: '_______________________',
        title: match?.position_title || fallbackTitle
      };
    };

    const presidentDetails = getOfficerDetails('president', 'President');
    const auditorDetails = getOfficerDetails('auditor', 'Auditor');
    
    const treasurerDetails = selectedRole === 'treasurer'
      ? getOfficerDetails('treasurer', 'Treasurer')
      : getOfficerDetails('asst-treasurer', 'Assistant Treasurer');
      
    const adviserDetails = {
      name: 'NICOLAS A. PURA',
      title: 'Adviser, SPECS'
    };

    const signatureHtml = `
      <div style="page-break-inside: avoid; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px 80px; text-align: left;">
          <div>
            <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">PREPARED BY:</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${treasurerDetails.name.toUpperCase()}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${treasurerDetails.title.toUpperCase()}</p>
          </div>
          <div>
            <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">AUDITED BY:</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${auditorDetails.name.toUpperCase()}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${auditorDetails.title.toUpperCase()}</p>
          </div>
          <div>
            <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">ATTESTED BY:</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${presidentDetails.name.toUpperCase()}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${presidentDetails.title.toUpperCase()}</p>
          </div>
          <div>
            <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">NOTED BY:</p>
            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${adviserDetails.name.toUpperCase()}</p>
            <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${adviserDetails.title.toUpperCase()}</p>
          </div>
        </div>
      </div>
    `;

    const expenseSlices = groupsList
      .filter(g => g.totalExp > 0)
      .map(g => ({ name: g.name, value: g.totalExp }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const barChartActivities = groupsList.slice(0, 6);

    const filteredGroupsList = selectedScope === 'all'
      ? groupsList
      : groupsList.filter(g => g.name === selectedScope);

    const perEventHtml = filteredGroupsList.map((g, idx) => {
      const eventStartDate = getActivityStartDate(g.name);
      const standingFunds = getOrgBalanceBefore(eventStartDate);

      const revRows = g.revenues.map((item, rIdx) => `
        <tr>
          <td>${rIdx + 1}</td>
          <td>${item.date_earned ? formatDate(item.date_earned) : '—'}</td>
          <td style="font-weight: bold;">${item.name}</td>
          <td style="text-align: right;">₱${(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${item.quantity || 1}</td>
          <td style="text-align: right; font-weight: bold; color: #059669;">₱${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      const expRows = g.expenses.map((item, eIdx) => `
        <tr>
          <td>${eIdx + 1}</td>
          <td>${item.date_buy ? formatDate(item.date_buy) : '—'}</td>
          <td style="font-weight: bold;">${item.name}</td>
          <td style="text-align: right;">₱${(item.price || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
          <td style="text-align: right;">${item.quantity || 1}</td>
          <td style="text-align: right; font-weight: bold; color: #dc2626;">₱${((item.price || 0) * (item.quantity || 1)).toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
        </tr>
      `).join('');

      return `
        <div class="activity-section-page">
          <h2 class="report-title">Financial Report</h2>
          <h3 style="text-align: center; color: #475569; margin-top: -5px; font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
            ${g.name}
          </h3>

          <!-- Standing Funds & Balance Summary Box -->
          <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 15px; margin-bottom: 25px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; font-size: 12px; text-align: center;">
            <div style="border-right: 1px solid #e2e8f0; padding-right: 10px;">
              <span style="font-weight: 700; color: #475569; display: block; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; margin-bottom: 5px;">Standing Funds</span>
              <span style="font-weight: 800; color: #0f172a; font-size: 13px;">₱${standingFunds.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="border-right: 1px solid #e2e8f0; padding-right: 10px; padding-left: 10px;">
              <span style="font-weight: 700; color: #475569; display: block; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; margin-bottom: 5px;">Event Revenue</span>
              <span style="font-weight: 800; color: #059669; font-size: 13px;">+ ₱${g.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="border-right: 1px solid #e2e8f0; padding-right: 10px; padding-left: 10px;">
              <span style="font-weight: 700; color: #475569; display: block; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; margin-bottom: 5px;">Event Expenditures</span>
              <span style="font-weight: 800; color: #dc2626; font-size: 13px;">- ₱${g.totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span>
            </div>
            <div style="padding-left: 10px;">
              <span style="font-weight: 800; color: #334155; display: block; text-transform: uppercase; font-size: 8px; letter-spacing: 0.5px; margin-bottom: 5px;">Current Balance</span>
              <span style="font-weight: 900; ${standingFunds + g.totalRev - g.totalExp >= 0 ? 'color: #059669;' : 'color: #dc2626;'} font-size: 13px;">
                ₱${(standingFunds + g.totalRev - g.totalExp).toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </span>
            </div>
          </div>
 
          <h4 class="table-group-header">Revenue Logs</h4>
          <table class="report-table" style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 5%;">No.</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 45%;">Description / Source</th>
                <th style="width: 12%; text-align: right;">Unit Price</th>
                <th style="width: 8%; text-align: right;">Qty</th>
                <th style="width: 15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${revRows || '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No revenue records for this activity.</td></tr>'}
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="5" style="text-align: right; border-top: 1.5px solid #cbd5e1; font-size: 10px; color: #475569;">Total Revenue:</td>
                <td style="text-align: right; border-top: 1.5px solid #cbd5e1; color: #059669; font-size: 10px; font-weight: 800;">₱${g.totalRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
 
          <h4 class="table-group-header">Expense Logs</h4>
          <table class="report-table" style="margin-bottom: 20px;">
            <thead>
              <tr>
                <th style="width: 5%;">No.</th>
                <th style="width: 15%;">Date</th>
                <th style="width: 45%;">Description / Source</th>
                <th style="width: 12%; text-align: right;">Unit Price</th>
                <th style="width: 8%; text-align: right;">Qty</th>
                <th style="width: 15%; text-align: right;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${expRows || '<tr><td colspan="6" style="text-align: center; color: #94a3b8;">No expense records for this activity.</td></tr>'}
              <tr style="background-color: #f8fafc; font-weight: bold;">
                <td colspan="5" style="text-align: right; border-top: 1.5px solid #cbd5e1; font-size: 10px; color: #475569;">Total Expenditures:</td>
                <td style="text-align: right; border-top: 1.5px solid #cbd5e1; color: #dc2626; font-size: 10px; font-weight: 800;">₱${g.totalExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
 
          ${signatureHtml}
        </div>
        ${idx < filteredGroupsList.length - 1 ? '<div class="page-break"></div>' : ''}
      `;
    }).join('');

    const summaryPageHtml = selectedScope === 'all'
      ? `
          <div class="activity-section-page">
            <h2 class="report-title">SPECS Financial Report</h2>
            <h3 style="text-align: center; color: #475569; margin-top: -4px; font-size: 13px; font-weight: bold; text-transform: uppercase; margin-bottom: 15px;">
              Annual Statement & Graphical Overview
            </h3>

            <div class="meta-section">
              <p class="meta-item"><strong>Standing Funds (Total Revenue):</strong> <span style="color: #059669; font-weight: bold;">₱${overallRev.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
              <p class="meta-item"><strong>Total Expenditures:</strong> <span style="color: #dc2626; font-weight: bold;">₱${overallExp.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
              <p class="meta-item"><strong>Current Cash Balance:</strong> <span style="font-weight: bold; ${overallBal >= 0 ? 'color: #059669;' : 'color: #dc2626;'}">₱${overallBal.toLocaleString('en-US', { minimumFractionDigits: 2 })}</span></p>
            </div>

            <!-- Visual Dashboard Grid -->
            <div class="visuals-grid" style="grid-template-columns: 1fr; gap: 15px; flex-grow: 1; justify-content: center;">
              <!-- Chart: Expense Categories Allocation (Pie Chart) -->
              <div class="chart-card" style="padding: 15px;">
                <div class="chart-title" style="font-size: 11px; padding-bottom: 6px; margin-bottom: 12px;">Expense Distribution Share</div>
                ${generateSVGPieChart(expenseSlices)}
              </div>

              <!-- Chart: Revenue vs Expense per Activity (Bar Chart) -->
              <div class="chart-card" style="padding: 15px;">
                <div class="chart-title" style="font-size: 11px; padding-bottom: 6px; margin-bottom: 12px;">Revenue vs Expense per Activity</div>
                ${generateSVGBarChart(barChartActivities)}
                <div style="display: flex; justify-content: center; gap: 15px; font-size: 8px; font-weight: bold; margin-top: 6px;">
                  <span style="color: #0d6b66;">■ Revenue</span>
                  <span style="color: #ef4444;">■ Expenses</span>
                </div>
              </div>

              <!-- Chart: Cumulative Cash Balance Trend (Line Chart) -->
              <div class="chart-card" style="padding: 15px;">
                <div class="chart-title" style="font-size: 11px; padding-bottom: 6px; margin-bottom: 12px;">Cumulative Cash Flow Trend</div>
                ${generateSVGLineChart(historyPoints)}
              </div>
            </div>

            ${signatureHtml}
          </div>
          ${perEventHtml ? '<div class="page-break"></div>' : ''}
        `
      : '';

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SPECS Financial Report</title>
          <style>
            @page {
              size: 8.5in 13in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              line-height: 1.5;
            }
            .activity-section-page {
              width: 100%;
            }
            .print-header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 5cm;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              z-index: 1000;
            }
            .print-header img {
              width: 100%;
              height: auto;
              max-height: 5cm;
              object-fit: contain;
              display: block;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3cm;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              z-index: 1000;
            }
            .print-footer img {
              width: 100%;
              height: auto;
              max-height: 3cm;
              object-fit: contain;
              display: block;
            }
            .print-layout-table {
              width: 100%;
              border-collapse: collapse;
              border: none !important;
            }
            .print-layout-table > thead > tr > td,
            .print-layout-table > tbody > tr > td,
            .print-layout-table > tfoot > tr > td {
              padding-left: 2.54cm;
              padding-right: 2.54cm;
              border: none !important;
              background: transparent !important;
            }
            .header-spacer {
              height: 5cm;
            }
            .footer-spacer {
              height: 3cm;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            .report-title {
              text-align: center;
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            .meta-section {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 24px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px 30px;
              font-size: 13px;
            }
            .meta-item {
              margin: 0;
            }
            .visuals-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .chart-card {
              border: 1px solid #e2e8f0;
              background-color: #ffffff;
              border-radius: 8px;
              padding: 15px;
            }
            .chart-title {
              font-weight: bold;
              font-size: 11px;
              text-transform: uppercase;
              color: #475569;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 4px;
              margin-bottom: 10px;
            }
            .table-group-header {
              font-size: 13px;
              font-weight: bold;
              color: #0d6b66;
              text-transform: uppercase;
              margin-top: 15px;
              margin-bottom: 8px;
              border-left: 3px solid #0d6b66;
              padding-left: 8px;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 12px;
            }
            .report-table th, .report-table td {
              border: 1px solid #e2e8f0;
              padding: 8px 10px;
              text-align: left;
              font-size: 11px;
            }
            .report-table th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              font-size: 10px;
              letter-spacing: 0.5px;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }
            .page-break {
              page-break-after: always;
              break-after: page;
            }
            @media print {
              body {
                margin: 0;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img src="${origin}/header.png" alt="Header" />
          </div>
          <div class="print-footer">
            <img src="${origin}/footer.png" alt="Footer" />
          </div>

          <table class="print-layout-table">
            <thead>
              <tr>
                <td>
                  <div class="header-spacer"></div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  ${summaryPageHtml}
                  ${perEventHtml}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="footer-spacer"></div>
                </td>
              </tr>
            </tfoot>
          </table>
          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { downloadPdfFromHtml } = await import('../../shared/utils');
      await downloadPdfFromHtml(htmlContent, `Finance_Report_${selectedScope === 'all' ? 'All_Activities' : selectedScope.replace(/\s+/g, '_')}.pdf`, addToast);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Pop-up Blocked', message: 'Please allow pop-ups for this website to print reports.' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
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
                        <th className="py-2.5 px-3 text-center w-10">Actions</th>
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
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setDeleteConfirm({ open: true, id: item.$id, type: 'revenue' })}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors border border-transparent hover:border-red-100"
                              title="Delete revenue record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
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
                        <th className="py-2.5 px-3 text-center w-10">Actions</th>
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
                          <td className="py-2.5 px-3 text-center">
                            <button
                              onClick={() => setDeleteConfirm({ open: true, id: item.$id, type: 'expense' })}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg p-1.5 transition-colors border border-transparent hover:border-red-100"
                              title="Delete expense record"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
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
        </div>

        {/* Delete Expense/Revenue record confirmation */}
        <ConfirmModal
          isOpen={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, id: null, type: null })}
          onConfirm={handleDeleteConfirm}
          title={deleteConfirm.type === 'revenue' ? 'Delete Revenue Entry' : 'Delete Expense Entry'}
          message={deleteConfirm.type === 'revenue'
            ? "Are you sure you want to delete this recorded revenue line? This adjustment modifies net balancing reports."
            : "Are you sure you want to delete this recorded expense line? This adjustment modifies net balancing reports."}
          confirmLabel="Remove"
          variant="danger"
          loading={actionLoading}
        />
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
            onClick={() => setPrintModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-[#0d6b66] bg-emerald-50/10 dark:bg-[#0d6b66]/10 text-[#0d6b66] dark:text-emerald-400 px-3.5 py-2 text-sm font-bold hover:bg-emerald-50 dark:hover:bg-[#0d6b66]/20 transition-colors shadow-sm"
            title="Print Financial Statements & Detailed Breakdown"
          >
            <Printer className="h-4 w-4" />
            {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Report'}
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
      )}

      {/* Delete Expense record confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, type: null })}
        onConfirm={handleDeleteConfirm}
        title={deleteConfirm.type === 'revenue' ? 'Delete Revenue Entry' : 'Delete Expense Entry'}
        message={deleteConfirm.type === 'revenue'
          ? "Are you sure you want to delete this recorded revenue line? This adjustment modifies net balancing reports."
          : "Are you sure you want to delete this recorded expense line? This adjustment modifies net balancing reports."}
        confirmLabel="Remove"
        variant="danger"
        loading={actionLoading}
      />

      {printModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in zoom-in-95">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0d6b66] border border-teal-100 mb-4">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Print Report Options</h3>
              <p className="text-sm text-slate-500 text-center mb-5">Configure the report scope and preparer signatory before printing.</p>
              
              <div className="w-full space-y-4 mb-6">
                {/* Scope Selection */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Report Scope</label>
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  >
                    <option value="all">All Activities & Events</option>
                    {financeGroupsList.map(actName => (
                      <option key={actName} value={actName}>{actName}</option>
                    ))}
                  </select>
                </div>

                {/* Signatory Selection */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Prepared By Signatory</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrintSignatory('treasurer')}
                      className={`rounded-lg py-2.5 text-xs font-semibold border transition-all ${
                        printSignatory === 'treasurer'
                          ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Treasurer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintSignatory('asst-treasurer')}
                      className={`rounded-lg py-2.5 text-xs font-semibold border transition-all ${
                        printSignatory === 'asst-treasurer'
                          ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Asst. Treasurer
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setPrintModalOpen(false);
                    setTimeout(() => {
                      handlePrintCombinedReport(printSignatory, printScope);
                    }, 50);
                  }}
                  className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors"
                >
                  {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Report'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminFinance;
