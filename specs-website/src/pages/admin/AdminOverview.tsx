import React, { useState, useEffect } from 'react';
import { cachedApi } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import StatsCard from '../../components/ui/StatsCard';
import { SkeletonCard, SkeletonChart } from '../../components/ui/SkeletonLoader';

// Icons as inline SVGs
const UsersIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const PendingIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);
const EventsIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
  </svg>
);
const FilesIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
  </svg>
);
const WalletIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
  </svg>
);
const ExpenseIcon = () => (
  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
  </svg>
);

interface DashboardStats {
  totalUsers: number;
  pendingVerifications: number;
  upcomingEventsCount: number;
  filesCount: number;
  totalRevenue: number;
  totalExpenses: number;
  newUsersLast30Days: number;
  growthPercentage: number;
  accounts: any[];
}

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await cachedApi.dashboard.getStats();
        setStats(data);
      } catch (err: any) {
        console.error('[AdminOverview] Failed to load stats:', err);
        setError(err.message || 'Failed to load dashboard data');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 mb-4">
          <svg className="h-8 w-8 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        </div>
        <h3 className="text-lg font-semibold text-slate-900 mb-1">Failed to Load Dashboard</h3>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-lg bg-[#0d6b66] px-4 py-2 text-sm font-medium text-white hover:bg-[#0b5c58] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
        <p className="text-sm text-slate-500 mt-1">Welcome back! Here's what's happening with your organization.</p>
      </div>

      {/* Stats Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <StatsCard
            title="Total Members"
            value={stats.totalUsers}
            icon={<UsersIcon />}
            color="teal"
            trend={{
              value: stats.growthPercentage,
              label: 'last 30 days',
              direction: stats.growthPercentage > 0 ? 'up' : stats.growthPercentage < 0 ? 'down' : 'neutral',
            }}
          />
          <StatsCard
            title="Pending Verification"
            value={stats.pendingVerifications}
            icon={<PendingIcon />}
            color="amber"
          />
          <StatsCard
            title="Upcoming Events"
            value={stats.upcomingEventsCount}
            icon={<EventsIcon />}
            color="blue"
          />
          <StatsCard
            title="Total Files"
            value={stats.filesCount}
            icon={<FilesIcon />}
            color="purple"
          />
          <StatsCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={<WalletIcon />}
            color="emerald"
          />
          <StatsCard
            title="Total Expenses"
            value={formatCurrency(stats.totalExpenses)}
            icon={<ExpenseIcon />}
            color="red"
          />
        </div>
      )}

      {/* Quick Insights */}
      {!loading && stats && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* User Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">User Breakdown</h3>
            <div className="space-y-3">
              {(() => {
                const types = ['student', 'officer', 'admin'];
                const colors = ['bg-[#0d6b66]', 'bg-blue-500', 'bg-purple-500'];
                return types.map((type, idx) => {
                  const count = stats.accounts.filter((a: any) => a.type === type).length;
                  const pct = stats.totalUsers > 0 ? Math.round((count / stats.totalUsers) * 100) : 0;
                  return (
                    <div key={type}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-slate-700 capitalize">{type}s</span>
                        <span className="text-sm text-slate-500">{count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[idx]} transition-all duration-700 ease-out`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>

          {/* Financial Summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Financial Summary</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7 11l5-5m0 0l5 5m-5-5v12" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-emerald-800">Revenue</span>
                </div>
                <span className="text-lg font-bold text-emerald-700">{formatCurrency(stats.totalRevenue)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-red-50">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-red-500 text-white flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17 13l-5 5m0 0l-5-5m5 5V6" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-red-800">Expenses</span>
                </div>
                <span className="text-lg font-bold text-red-700">{formatCurrency(stats.totalExpenses)}</span>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
                <span className="text-sm font-semibold text-slate-700">Net Balance</span>
                <span className={`text-lg font-bold ${stats.totalRevenue - stats.totalExpenses >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(stats.totalRevenue - stats.totalExpenses)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Recent Activity placeholder */}
      {!loading && stats && (
        <div className="rounded-xl border border-slate-200 bg-white p-6">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Recent Members</h3>
          <div className="divide-y divide-slate-100">
            {stats.accounts.slice(0, 5).map((acc: any) => (
              <div key={acc.$id} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#0d6b66] to-[#149a93] text-white flex items-center justify-center text-xs font-semibold uppercase">
                    {(acc.username || 'U')[0]}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-900">{acc.username || 'Unknown'}</p>
                    <p className="text-xs text-slate-400 capitalize">{acc.type}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                    acc.verified ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {acc.verified ? 'Verified' : 'Pending'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOverview;
