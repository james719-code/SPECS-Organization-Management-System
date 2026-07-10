import React, { useState, useEffect } from 'react';
import { cachedApi } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import StatsCard from '../../components/ui/StatsCard';
import { SkeletonCard, SkeletonChart } from '../../components/ui/SkeletonLoader';
import { databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_OFFICERS } from '../../shared/constants';
import { Mail, X, ChevronRight } from 'lucide-react';

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

const getStartingBalanceDocId = (sy: string): string => {
  return sy.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 36);
};

const AdminOverview: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [schoolYear, setSchoolYear] = useState<string>('');

  // SMTP reminder state (officer only)
  const [showSmtpReminder, setShowSmtpReminder] = useState(false);
  const [smtpReminderDismissed, setSmtpReminderDismissed] = useState(false);

  const { yearLevelCounts, totalStudentsWithYear, sectionCounts, totalStudentsWithSection } = React.useMemo(() => {
    if (!stats?.accounts) {
      return { yearLevelCounts: {}, totalStudentsWithYear: 0, sectionCounts: [], totalStudentsWithSection: 0 };
    }
    
    const yearCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0 };
    
    // Initialize the 8 standard BSCS sections with 0 to ensure they are always displayed
    const secCounts: Record<string, number> = {
      'BSCS 1A': 0,
      'BSCS 1B': 0,
      'BSCS 2A': 0,
      'BSCS 2B': 0,
      'BSCS 3A': 0,
      'BSCS 3B': 0,
      'BSCS 4A': 0,
      'BSCS 4B': 0
    };

    const getYearSectionLabel = (year: number | null | undefined, section: string | null | undefined): string => {
      if (!section) return '';
      const cleanSection = section.trim();
      
      const match = cleanSection.match(/(?:BSCS|CS|IT|-)?\s*([1-4])\s*([A-Za-z]+)/i);
      if (match) {
        return `BSCS ${match[1]}${match[2].toUpperCase()}`;
      }
      
      if (year && year >= 1 && year <= 4) {
        if (!cleanSection.startsWith(String(year))) {
          return `BSCS ${year}${cleanSection.toUpperCase()}`;
        }
      }

      if (/^[1-4][A-Za-z]+$/i.test(cleanSection)) {
        return `BSCS ${cleanSection.toUpperCase()}`;
      }
      
      return cleanSection.toUpperCase();
    };

    stats.accounts.forEach((acc: any) => {
      if (acc.type !== 'admin' && acc.students) {
        const student = acc.students;
        const year = student.yearLevel;
        if (year && year >= 1 && year <= 4) {
          yearCounts[year] = (yearCounts[year] || 0) + 1;
        }

        const section = student.section;
        const label = getYearSectionLabel(year, section);
        if (label) {
          secCounts[label] = (secCounts[label] || 0) + 1;
        }
      }
    });

    const totalYear = Object.values(yearCounts).reduce((a, b) => a + b, 0);
    const sortedSections = Object.entries(secCounts)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
    const totalSec = sortedSections.reduce((sum, item) => sum + item.count, 0);

    return {
      yearLevelCounts: yearCounts,
      totalStudentsWithYear: totalYear,
      sectionCounts: sortedSections,
      totalStudentsWithSection: totalSec
    };
  }, [stats]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);

        // Fetch active school year from metadata first
        const metadata = await cachedApi.metadata.get();
        let activeYear = '';
        let startSchoolYearDate: string | null = null;
        let endSchoolYearDate: string | null = null;

        if (metadata?.schoolYear) {
          activeYear = metadata.schoolYear;
          setSchoolYear(activeYear);

          // Retrieve starting balance config to get date boundaries
          try {
            const startingDoc = await cachedApi.startingBalances.get(getStartingBalanceDocId(activeYear));
            if (startingDoc) {
              startSchoolYearDate = startingDoc.start_first_sem || null;
              endSchoolYearDate = startingDoc.end_second_sem || null;
            }
          } catch (startingErr) {
            console.warn('[AdminOverview] Failed to load starting balance config:', startingErr);
          }
        }

        const data = await cachedApi.dashboard.getStats({
          startDate: startSchoolYearDate || undefined,
          endDate: endSchoolYearDate || undefined
        });
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

  // Check SMTP credentials for officer users
  useEffect(() => {
    const checkSmtp = async () => {
      try {
        const user = await cachedApi.users.getCurrent();
        const accDoc = await cachedApi.users.getAccount(user.$id);
        if (accDoc.type !== 'officer') return;
        // Check if dismissed this session
        if (sessionStorage.getItem('specs_smtp_reminder_dismissed') === '1') {
          setSmtpReminderDismissed(true);
          return;
        }
        if (accDoc.officers) {
          let offId = accDoc.officers;
          if (typeof offId === 'object' && offId.$id) offId = offId.$id;
          const offDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_OFFICERS, offId);
          if (!offDoc.email || !offDoc.token_email) {
            setShowSmtpReminder(true);
          }
        }
      } catch {
        // Silently fail — SMTP reminder is non-critical
      }
    };
    checkSmtp();
  }, []);

  const dismissSmtpReminder = () => {
    setShowSmtpReminder(false);
    setSmtpReminderDismissed(true);
    sessionStorage.setItem('specs_smtp_reminder_dismissed', '1');
  };


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
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Overview</h1>
          {schoolYear && (
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-teal-50 text-[#0d6b66] border border-teal-100 dark:bg-[#0d6b66]/10 dark:text-emerald-400 dark:border-[#0d6b66]/20">
              A.Y. {schoolYear}
            </span>
          )}
        </div>
        <p className="text-sm text-slate-500 mt-1">Welcome back! Here's what's happening with your organization.</p>
      </div>

      {/* SMTP Reminder Banner (officer only, when credentials missing) */}
      {showSmtpReminder && !smtpReminderDismissed && (
        <div className="rounded-xl border-2 border-amber-400 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-md animate-in fade-in slide-in-from-top-2">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white shadow-sm">
              <Mail className="h-5 w-5" />
            </div>
            <div className="flex-1 space-y-2">
              <h3 className="text-sm font-bold text-amber-900">Configure Your Email Credentials</h3>
              <p className="text-xs text-amber-700 leading-relaxed">
                To send official SPECS emails using your officer account, you need to configure your Google App Passkey.
                Without this, email functions (attendance notifications, announcements, etc.) will not be available.
              </p>
              <div className="flex items-center gap-3 pt-1">
                <a
                  href="/dashboard/officer/profile"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors shadow-sm"
                >
                  Set Up Now
                  <ChevronRight className="h-3.5 w-3.5" />
                </a>
                <button
                  onClick={dismissSmtpReminder}
                  className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-800 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                  Remind Me Later
                </button>
              </div>
            </div>
            <button
              onClick={dismissSmtpReminder}
              className="shrink-0 p-1.5 rounded-lg text-amber-400 hover:text-amber-600 hover:bg-amber-100 transition-colors"
              title="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

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
          {/* Student Breakdown */}
          <div className="rounded-xl border border-slate-200 bg-white p-6">
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Student Breakdown</h3>
            {sectionCounts.length === 0 ? (
              <p className="text-xs text-slate-400 italic py-4">No section data available</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 pr-1">
                {sectionCounts.map((sec) => {
                  const pct = totalStudentsWithSection > 0 ? Math.round((sec.count / totalStudentsWithSection) * 100) : 0;
                  return (
                    <div key={sec.name}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-semibold text-slate-700">{sec.name}</span>
                        <span className="text-sm text-slate-500 font-medium">{sec.count} ({pct}%)</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-slate-100 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-teal-600 transition-all duration-700 ease-out"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
            {[...stats.accounts]
              .sort((a: any, b: any) => new Date(b.$createdAt).getTime() - new Date(a.$createdAt).getTime())
              .slice(0, 5)
              .map((acc: any) => (
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
