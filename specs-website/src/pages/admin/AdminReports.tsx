import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi } from '../../shared/api';
import { databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_STORIES } from '../../shared/constants';
import { Query } from 'appwrite';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonChart } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';

type ReportType = 'accounts' | 'students' | 'payments' | 'events';
type ChartType = 'bar' | 'pie' | 'line';

const CHART_COLORS = ['#0d6b66', '#149a93', '#2a9d8f', '#3d8b7a', '#5a9e8f', '#74b3a5', '#094d4a', '#264653'];

const AdminReports: React.FC = () => {
  const [reportType, setReportType] = useState<ReportType>('accounts');
  
  // Date range filters
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Account dynamic filters
  const [accountType, setAccountType] = useState('all');
  const [verificationStatus, setVerificationStatus] = useState('all');
  const [activeStatus, setActiveStatus] = useState('all');

  // Generator states
  const [loading, setLoading] = useState(false);
  const [reportResults, setReportResults] = useState<{
    total: number;
    data: Record<string, any>[];
    charts: Record<string, { labels: string[]; data: number[] }>;
    chartOptions: { value: string; label: string }[];
  } | null>(null);

  const [activeChartOption, setActiveChartOption] = useState('');
  const [chartType, setChartType] = useState<ChartType>('bar');
  const { addToast } = useToast();

  const handleExportCSV = () => {
    if (!reportResults || reportResults.data.length === 0) {
      addToast({ type: 'warning', title: 'Export Failed', message: 'No report data available to export.' });
      return;
    }
    try {
      const data = reportResults.data;
      const headers = Object.keys(data[0]);
      const rows = data.map(row =>
        headers.map(header => `"${String(row[header] || '').replace(/"/g, '""')}"`).join(',')
      );

      const csv = [headers.join(','), ...rows].join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);

      link.setAttribute('href', url);
      link.setAttribute('download', `${reportType}-report-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addToast({ type: 'success', title: 'Exported', message: 'CSV file downloaded successfully.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Export Failed', message: 'Could not export dataset to CSV.' });
    }
  };

  const getMonthlyGrowth = (items: any[], dateField = '$createdAt') => {
    const monthlyData: Record<string, number> = {};
    const now = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(now.getMonth() - 6);

    items.forEach(item => {
      const date = new Date(item[dateField]);
      if (date >= sixMonthsAgo) {
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        monthlyData[monthKey] = (monthlyData[monthKey] || 0) + 1;
      }
    });

    const labels: string[] = [];
    const data: number[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      labels.push(d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }));
      data.push(monthlyData[monthKey] || 0);
    }
    return { labels, data };
  };

  const getDistribution = (items: any[], field: string) => {
    const distribution = items.reduce((acc, item) => {
      const val = item[field] || 'Unknown';
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      labels: Object.keys(distribution),
      data: Object.values(distribution)
    };
  };

  const handleGenerateReport = async () => {
    setLoading(true);
    setReportResults(null);
    try {
      if (reportType === 'accounts') {
        const response = await cachedApi.users.listAllAccounts({}, 0);
        let filtered = response.documents.filter(acc => acc.type !== 'admin');

        if (accountType !== 'all') {
          filtered = filtered.filter(acc => acc.type === accountType);
        }
        if (verificationStatus !== 'all') {
          filtered = verificationStatus === 'verified'
            ? filtered.filter(acc => acc.verified)
            : filtered.filter(acc => !acc.verified);
        }
        if (activeStatus !== 'all') {
          filtered = activeStatus === 'active'
            ? filtered.filter(acc => !acc.deactivated)
            : filtered.filter(acc => acc.deactivated);
        }
        if (dateFrom) filtered = filtered.filter(acc => new Date(acc.$createdAt) >= new Date(dateFrom));
        if (dateTo) filtered = filtered.filter(acc => new Date(acc.$createdAt) <= new Date(dateTo));

        const typeDistribution = getDistribution(filtered, 'type');
        const verified = filtered.filter(acc => acc.verified).length;
        const pending = filtered.filter(acc => !acc.verified).length;

        const results = {
          total: filtered.length,
          data: filtered.map(acc => {
            const studentData = (acc.students || {}) as any;
            return {
              'Username': acc.username || '',
              'Name': studentData.name || '',
              'Email': studentData.email || '',
              'Type': acc.type || '',
              'Year': studentData.yearLevel || '',
              'Section': studentData.section || '',
              'Verified': acc.verified ? 'Yes' : 'No',
              'Active': acc.deactivated ? 'No' : 'Yes',
              'Joined': new Date(acc.$createdAt).toLocaleDateString()
            };
          }),
          charts: {
            typeDistribution,
            verificationStats: { labels: ['Verified', 'Pending'], data: [verified, pending] },
            monthlyGrowth: getMonthlyGrowth(filtered)
          },
          chartOptions: [
            { value: 'typeDistribution', label: 'Account Type Distribution' },
            { value: 'verificationStats', label: 'Verification Status' },
            { value: 'monthlyGrowth', label: 'Monthly Growth (6 months)' }
          ]
        };

        setReportResults(results);
        setActiveChartOption('typeDistribution');

      } else if (reportType === 'students') {
        const response = await cachedApi.students.listAllProfiles({}, 0);
        let filtered = response.documents;

        if (dateFrom) filtered = filtered.filter(s => new Date(s.$createdAt) >= new Date(dateFrom));
        if (dateTo) filtered = filtered.filter(s => new Date(s.$createdAt) <= new Date(dateTo));

        const yearDistribution = getDistribution(filtered, 'yearLevel');
        const sectionDistribution = getDistribution(filtered, 'section');
        const volunteerDist = getDistribution(filtered, 'volunteer_request_status');

        const results = {
          total: filtered.length,
          data: filtered.map(s => ({
            'Name': s.name || '',
            'Email': s.email || '',
            'Year Level': s.yearLevel || '',
            'Section': s.section || '',
            'Address': s.address || '',
            'Volunteer Status': s.volunteer_request_status || 'none',
            'Added Date': new Date(s.$createdAt).toLocaleDateString()
          })),
          charts: {
            yearDistribution,
            sectionDistribution,
            volunteerDistribution: volunteerDist,
            monthlyGrowth: getMonthlyGrowth(filtered)
          },
          chartOptions: [
            { value: 'yearDistribution', label: 'Year Level Distribution' },
            { value: 'sectionDistribution', label: 'Section Distribution' },
            { value: 'volunteerDistribution', label: 'Volunteer Status' },
            { value: 'monthlyGrowth', label: 'Monthly Growth (6 months)' }
          ]
        };

        setReportResults(results);
        setActiveChartOption('yearDistribution');

      } else if (reportType === 'payments') {
        const response = await cachedApi.payments.listAll({}, 0);
        let filtered = response.documents;

        if (dateFrom) filtered = filtered.filter(p => new Date(p.$createdAt) >= new Date(dateFrom));
        if (dateTo) filtered = filtered.filter(p => new Date(p.$createdAt) <= new Date(dateTo));

        const paidCount = filtered.filter(p => p.is_paid).length;
        const unpaidCount = filtered.filter(p => !p.is_paid).length;
        const totalCollected = filtered.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
        const totalOutstanding = filtered.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);

        const results = {
          total: filtered.length,
          data: filtered.map(p => ({
            'Item': p.item_name || '',
            'Price': p.price || 0,
            'Quantity': p.quantity || 1,
            'Total': (p.price || 0) * (p.quantity || 1),
            'Status': p.is_paid ? 'Paid' : 'Unpaid',
            'Activity': p.activity || '',
            'Is Event': p.is_event ? 'Yes' : 'No',
            'Date': new Date(p.$createdAt).toLocaleDateString()
          })),
          charts: {
            paidVsUnpaid: { labels: ['Paid', 'Unpaid'], data: [paidCount, unpaidCount] },
            amountBreakdown: { labels: ['Collected', 'Outstanding'], data: [totalCollected, totalOutstanding] },
            monthlyGrowth: getMonthlyGrowth(filtered)
          },
          chartOptions: [
            { value: 'paidVsUnpaid', label: 'Paid vs Unpaid Count' },
            { value: 'amountBreakdown', label: 'Amount Collected vs Outstanding' },
            { value: 'monthlyGrowth', label: 'Monthly Payments (6 months)' }
          ]
        };

        setReportResults(results);
        setActiveChartOption('paidVsUnpaid');

      } else if (reportType === 'events') {
        const response = await cachedApi.events.listAll({ orderDesc: 'date_to_held' }, 0);
        let filtered = response.documents;

        if (dateFrom) filtered = filtered.filter(e => new Date(e.date_to_held || '') >= new Date(dateFrom));
        if (dateTo) filtered = filtered.filter(e => new Date(e.date_to_held || '') <= new Date(dateTo));

        const now = new Date();
        const upcoming = filtered.filter(e => !e.event_ended && new Date(e.date_to_held || '') >= now).length;
        const ended = filtered.filter(e => e.event_ended).length;
        const past = filtered.filter(e => !e.event_ended && new Date(e.date_to_held || '') < now).length;

        const results = {
          total: filtered.length,
          data: filtered.map(e => ({
            'Event Name': e.event_name || '',
            'Description': e.description || '',
            'Date': new Date(e.date_to_held || '').toLocaleDateString(),
            'Status': e.event_ended ? 'Ended' : (new Date(e.date_to_held || '') < now ? 'Past' : 'Upcoming'),
            'Created': new Date(e.$createdAt).toLocaleDateString()
          })),
          charts: {
            statusDistribution: { labels: ['Upcoming', 'Past', 'Ended'], data: [upcoming, past, ended] },
            monthlyEvents: getMonthlyGrowth(filtered, 'date_to_held')
          },
          chartOptions: [
            { value: 'statusDistribution', label: 'Event Status Distribution' },
            { value: 'monthlyEvents', label: 'Events by Month (6 months)' }
          ]
        };

        setReportResults(results);
        setActiveChartOption('statusDistribution');
      }

      addToast({ type: 'success', title: 'Report Generated', message: 'Report generated successfully.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Generation Failed', message: err.message || 'Could not compile report.' });
    } finally {
      setLoading(false);
    }
  };

  // Transform chart data for Recharts
  const rechartsData = useMemo(() => {
    if (!reportResults || !activeChartOption) return [];
    const currentChartData = reportResults.charts[activeChartOption];
    if (!currentChartData) return [];
    return currentChartData.labels.map((label, idx) => ({
      name: label,
      value: currentChartData.data[idx]
    }));
  }, [reportResults, activeChartOption]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Reports Generator</h1>
        <p className="text-sm text-slate-500 mt-1">Compile custom metrics and export data logs.</p>
      </div>

      {/* Filter panel */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Report Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Report Type</label>
            <select
              value={reportType}
              onChange={e => setReportType(e.target.value as ReportType)}
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
            >
              <option value="accounts">Accounts Summary</option>
              <option value="students">Students Report</option>
              <option value="payments">Payments Report</option>
              <option value="events">Events Report</option>
            </select>
          </div>

          {reportType === 'accounts' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Account Role</label>
                <select
                  value={accountType}
                  onChange={e => setAccountType(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="student">Students Only</option>
                  <option value="officer">Officers Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Verification</label>
                <select
                  value={verificationStatus}
                  onChange={e => setVerificationStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                >
                  <option value="all">All Verification</option>
                  <option value="verified">Verified Only</option>
                  <option value="pending">Pending Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Active Status</label>
                <select
                  value={activeStatus}
                  onChange={e => setActiveStatus(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Only</option>
                  <option value="deactivated">Deactivated Only</option>
                </select>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
            />
          </div>

          <div className="flex gap-2 lg:col-span-2">
            <button
              onClick={handleGenerateReport}
              disabled={loading}
              className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm py-2 shadow-sm transition-colors flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
              )}
              {loading ? 'Compiling...' : 'Generate Report'}
            </button>
            
            <button
              onClick={handleExportCSV}
              disabled={!reportResults}
              className="flex-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-sm py-2 shadow-sm transition-colors disabled:opacity-50"
            >
              Export CSV
            </button>
          </div>
        </div>
      </div>

      {/* Report Results */}
      {loading ? (
        <SkeletonChart />
      ) : reportResults ? (
        <div className="space-y-6">
          {/* Chart Display card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Report Analytics</h3>
                <select
                  value={activeChartOption}
                  onChange={e => setActiveChartOption(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-600 focus:border-[#0d6b66] outline-none"
                >
                  {reportResults.chartOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                {(['bar', 'pie', 'line'] as ChartType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold uppercase ${
                      chartType === type
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-500 hover:text-slate-900'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-72 w-full relative flex items-center justify-center">
              {chartType === 'bar' && (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={rechartsData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(13, 107, 102, 0.04)' }} contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Bar dataKey="value" fill="#0d6b66" radius={[4, 4, 0, 0]} barSize={40} />
                  </BarChart>
                </ResponsiveContainer>
              )}

              {chartType === 'line' && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={rechartsData} margin={{ top: 20, right: 20, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <YAxis stroke="#94a3b8" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Line type="monotone" dataKey="value" stroke="#0d6b66" strokeWidth={2.5} activeDot={{ r: 6 }} dot={{ strokeWidth: 2, r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}

              {chartType === 'pie' && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={rechartsData}
                      cx="50%"
                      cy="45%"
                      labelLine={false}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {rechartsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                    <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px' }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Raw Grid Table */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/50 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Detailed Data</h3>
              <span className="inline-flex items-center rounded-full bg-slate-50 border px-2.5 py-0.5 text-xs font-semibold text-slate-500">
                {reportResults.total} records found
              </span>
            </div>
            
            <div className="overflow-x-auto max-h-96">
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider sticky top-0">
                    {Object.keys(reportResults.data[0] || {}).map(head => (
                      <th key={head} className="px-6 py-3 text-left bg-slate-50">{head}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {reportResults.data.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      {Object.values(row).map((val, cellIdx) => (
                        <td key={cellIdx} className="px-6 py-3">{String(val ?? '')}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <EmptyState
          title="No Report Compiled"
          description="Select parameters and configure report filters above to generate visual metrics."
        />
      )}
    </div>
  );
};

export default AdminReports;
