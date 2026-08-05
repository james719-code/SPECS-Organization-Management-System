import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { AuthGuard } from './guard/auth';
import { useGlobalLoading } from './shared/pendingTracker';
import {
  LayoutDashboard, User, Calendar, CreditCard, CheckSquare, FileText, Settings,
  Users, Award, FileSpreadsheet, Activity, Bell, Landmark, UserCheck, Loader2, BookOpen, ScrollText, Printer
} from 'lucide-react';

// Core imports
import { cachedApi } from './shared/api';
import { setGlobalNavigate } from './shared/errors';

// Import Layout
import DashboardLayout from './components/DashboardLayout';
import ErrorBoundary from './components/ErrorBoundary';

// Static import for LandingPage to optimize critical render path
import LandingPage from './pages/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import CookieBanner from './components/CookieBanner';

// Lazy-load Pages
const LoginPage = lazy(() => import('./pages/LoginPage'));
const SignupPage = lazy(() => import('./pages/SignupPage'));
const PendingVerificationPage = lazy(() => import('./pages/PendingVerificationPage'));
const StoryPage = lazy(() => import('./pages/StoryPage'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'));
const MaintenancePage = lazy(() => import('./pages/MaintenancePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));

// Student Pages
const StudentProfile = lazy(() => import('./pages/student/StudentProfile'));
const StudentAttendance = lazy(() => import('./pages/student/StudentAttendance'));
const StudentEvents = lazy(() => import('./pages/student/StudentEvents'));
const StudentPayments = lazy(() => import('./pages/student/StudentPayments'));
const StudentPosts = lazy(() => import('./pages/student/StudentPosts'));

// Admin / Officer Shared Pages
const VolunteersManagement = lazy(() => import('./pages/shared/VolunteersManagement'));
const StudentConstitution = lazy(() => import('./pages/student/StudentConstitution'));
const OfficerConstitution = lazy(() => import('./pages/shared/OfficerConstitution'));

// Admin Pages
const AdminOverview = lazy(() => import('./pages/admin/AdminOverview'));
const AdminAccounts = lazy(() => import('./pages/admin/AdminAccounts'));
const AdminStudents = lazy(() => import('./pages/admin/AdminStudents'));
const AdminEvents = lazy(() => import('./pages/admin/AdminEvents'));
const AdminAttendance = lazy(() => import('./pages/admin/AdminAttendance'));
const AdminPayments = lazy(() => import('./pages/admin/AdminPayments'));
const AdminFinance = lazy(() => import('./pages/admin/AdminFinance'));
const AdminFiles = lazy(() => import('./pages/admin/AdminFiles'));
const AdminAnnouncements = lazy(() => import('./pages/admin/AdminAnnouncements'));
const AdminStories = lazy(() => import('./pages/admin/AdminStories'));
const AdminSettings = lazy(() => import('./pages/admin/AdminSettings'));
const AdminOfficers = lazy(() => import('./pages/admin/AdminOfficers'));
const AdminTasks = lazy(() => import('./pages/admin/AdminTasks'));
const AdminFileExports = lazy(() => import('./pages/admin/AdminFileExports'));
import { useAuth } from './shared/AuthContext';

const AdminNonOrgEvents = lazy(() => import('./pages/admin/AdminNonOrgEvents'));
const StudentTutorials = lazy(() => import('./pages/student/StudentTutorials'));
const OfficerTutorials = lazy(() => import('./pages/shared/OfficerTutorials'));

export default function App() {
  const navigate = useNavigate();
  const isPending = useGlobalLoading();
  const { profile, status } = useAuth();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);

  const userRole = profile?.type || null;

  useEffect(() => {
    setGlobalNavigate(navigate);
  }, [navigate]);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        const meta = await cachedApi.metadata.get();
        setIsMaintenance(!!meta?.ismaintenance);
      } catch (err) {
        console.warn('Failed to load system metadata collection:', err);
        setIsMaintenance(false);
      } finally {
        setLoadingMaintenance(false);
      }
    };

    checkMaintenance();
  }, []);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  const fallbackSpinner = (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
      <Loader2 className="h-8 w-8 animate-spin text-[#0d6b66]" />
    </div>
  );

  if (loadingMaintenance || status === 'loading') {
    return fallbackSpinner;
  }

  if (isMaintenance && userRole !== 'admin') {
    return (
      <Suspense fallback={fallbackSpinner}>
        <Routes>
          <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
          <Route path="*" element={<MaintenancePage theme={theme} toggleTheme={toggleTheme} isLoggedIn={!!userRole} />} />
        </Routes>
      </Suspense>
    );
  }

  return (
    <ErrorBoundary>
      <Suspense fallback={fallbackSpinner}>
      <Routes>
      <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/story/:id" element={<StoryPage />} />
      <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/signup" element={<SignupPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/privacy" element={<PrivacyPolicyPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/terms" element={<TermsOfServicePage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/pending" element={<PendingVerificationPage />} />

      {/* Role-Guarded Student Routes */}
      <Route 
        path="/dashboard/student" 
        element={
          <AuthGuard allowedRoles={['student']}>
            <DashboardLayout 
              title="Student Dashboard" 
              role="Student"
              theme={theme}
              toggleTheme={toggleTheme}
              links={[
                {
                  groupName: 'General',
                  items: [
                    { to: '/dashboard/student', label: 'My Profile', icon: <User className="h-4 w-4" /> },
                    { to: '/dashboard/student/tutorials', label: 'Student Tutorials', icon: <ScrollText className="h-4 w-4" /> },
                    { to: '/dashboard/student/constitution', label: 'Constitution & By-Laws', icon: <BookOpen className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Activities',
                  items: [
                    { to: '/dashboard/student/events', label: 'Event Calendar', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/dashboard/student/attendance', label: 'My Attendance', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/student/posts', label: 'My Stories', icon: <FileText className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Financials',
                  items: [
                    { to: '/dashboard/student/payments', label: 'My Payments', icon: <CreditCard className="h-4 w-4" /> }
                  ]
                }
              ]} 
            />
          </AuthGuard>
        } 
      >
        <Route index element={<StudentProfile />} />
        <Route path="events" element={<StudentEvents />} />
        <Route path="payments" element={<StudentPayments />} />
        <Route path="attendance" element={<StudentAttendance />} />
        <Route path="posts" element={<StudentPosts />} />
        <Route path="constitution" element={<StudentConstitution />} />
        <Route path="tutorials" element={<StudentTutorials />} />
        <Route path="profile" element={<Navigate to="/dashboard/student" replace />} />
      </Route>

      {/* Role-Guarded Officer Routes */}
      <Route 
        path="/dashboard/officer" 
        element={
          <AuthGuard allowedRoles={['officer']}>
            <DashboardLayout 
              title="Officer Dashboard" 
              role="Officer"
              theme={theme}
              toggleTheme={toggleTheme}
              links={[
                {
                  groupName: 'General',
                  items: [
                    { to: '/dashboard/officer', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/dashboard/officer/profile', label: 'My Profile', icon: <User className="h-4 w-4" /> },
                    { to: '/dashboard/officer/my-attendance', label: 'My Attendance', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/officer/constitution', label: 'Constitution & By-Laws', icon: <BookOpen className="h-4 w-4" /> },
                    { to: '/dashboard/officer/tutorials', label: 'Officer Tutorials', icon: <ScrollText className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Operations',
                  items: [
                    { to: '/dashboard/officer/students', label: 'Students', icon: <UserCheck className="h-4 w-4" /> },
                    { to: '/dashboard/officer/volunteers', label: 'Volunteers', icon: <Users className="h-4 w-4" /> },
                    { to: '/dashboard/officer/events', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/dashboard/officer/attendance', label: 'Attendance logs', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/officer/non-org-events', label: 'Non-Org Events', icon: <ScrollText className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Communication',
                  items: [
                    { to: '/dashboard/officer/stories', label: 'Stories', icon: <Award className="h-4 w-4" /> },
                    { to: '/dashboard/officer/files', label: 'Files', icon: <FileText className="h-4 w-4" /> },
                    { to: '/dashboard/officer/tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/officer/file-exports', label: 'File Exports', icon: <Printer className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Financials',
                  items: [
                    { to: '/dashboard/officer/finance', label: 'Finance Summary', icon: <Landmark className="h-4 w-4" /> },
                    { to: '/dashboard/officer/payments', label: 'Payments Tracker', icon: <CreditCard className="h-4 w-4" /> }
                  ]
                }
              ]} 
            />
          </AuthGuard>
        } 
      >
        <Route index element={<AdminOverview />} />
        <Route path="profile" element={<StudentProfile />} />
        <Route path="my-attendance" element={<StudentAttendance />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="finance/details/:name" element={<AdminFinance isDetailsView={true} />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="payments/create" element={<AdminPayments isCreateView={true} />} />
        <Route path="payments/outside" element={<AdminPayments isOutsideView={true} />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="volunteers" element={<VolunteersManagement />} />
        <Route path="files" element={<AdminFiles />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="stories" element={<AdminStories />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="file-exports" element={<AdminFileExports />} />
        <Route path="non-org-events" element={<AdminNonOrgEvents />} />
        <Route path="constitution" element={<OfficerConstitution />} />
        <Route path="tutorials" element={<OfficerTutorials />} />
      </Route>

      {/* Role-Guarded Admin Routes */}
      <Route 
        path="/dashboard/admin" 
        element={
          <AuthGuard allowedRoles={['admin']}>
            <DashboardLayout 
              title="Admin Panel" 
              role="Admin"
              theme={theme}
              toggleTheme={toggleTheme}
              links={[
                {
                  groupName: 'General',
                  items: [
                    { to: '/dashboard/admin', label: 'Stats Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/dashboard/admin/tutorials', label: 'Admin Tutorials', icon: <ScrollText className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'User Management',
                  items: [
                    { to: '/dashboard/admin/accounts', label: 'System Accounts', icon: <Users className="h-4 w-4" /> },
                    { to: '/dashboard/admin/students', label: 'Student Profiles', icon: <UserCheck className="h-4 w-4" /> },
                    { to: '/dashboard/admin/officers', label: 'Officers Control', icon: <Users className="h-4 w-4" /> },
                    { to: '/dashboard/admin/volunteers', label: 'Volunteers Control', icon: <Users className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Operations',
                  items: [
                    { to: '/dashboard/admin/events', label: 'Events Manager', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/dashboard/admin/attendance', label: 'Attendance logs', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/admin/non-org-events', label: 'Non-Org Events', icon: <ScrollText className="h-4 w-4" /> },
                    { to: '/dashboard/admin/announcements', label: 'Announcements', icon: <Bell className="h-4 w-4" /> },
                    { to: '/dashboard/admin/tasks', label: 'Tasks Manager', icon: <CheckSquare className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Financials',
                  items: [
                    { to: '/dashboard/admin/payments', label: 'Payments Ledger', icon: <CreditCard className="h-4 w-4" /> },
                    { to: '/dashboard/admin/finance', label: 'Finance Audit', icon: <Landmark className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Auditing & System',
                  items: [
                    { to: '/dashboard/admin/files', label: 'Document Files', icon: <FileText className="h-4 w-4" /> },
                    { to: '/dashboard/admin/file-exports', label: 'File Exports', icon: <Printer className="h-4 w-4" /> },
                    { to: '/dashboard/admin/stories', label: 'Student Stories', icon: <Award className="h-4 w-4" /> },
                    { to: '/dashboard/admin/constitution', label: 'Constitution & By-Laws', icon: <BookOpen className="h-4 w-4" /> },
                    { to: '/dashboard/admin/settings', label: 'System Settings', icon: <Settings className="h-4 w-4" /> }
                  ]
                }
              ]} 
            />
          </AuthGuard>
        } 
      >
        <Route index element={<AdminOverview />} />
        <Route path="accounts" element={<AdminAccounts />} />
        <Route path="students" element={<AdminStudents />} />
        <Route path="officers" element={<AdminOfficers />} />
        <Route path="events" element={<AdminEvents />} />
        <Route path="attendance" element={<AdminAttendance />} />
        <Route path="payments" element={<AdminPayments />} />
        <Route path="payments/create" element={<AdminPayments isCreateView={true} />} />
        <Route path="payments/outside" element={<AdminPayments isOutsideView={true} />} />
        <Route path="finance" element={<AdminFinance />} />
        <Route path="finance/details/:name" element={<AdminFinance isDetailsView={true} />} />
        <Route path="files" element={<AdminFiles />} />
        <Route path="volunteers" element={<VolunteersManagement />} />
        <Route path="stories" element={<AdminStories />} />
        <Route path="tasks" element={<AdminTasks />} />
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="file-exports" element={<AdminFileExports />} />
        <Route path="non-org-events" element={<AdminNonOrgEvents />} />
        <Route path="settings" element={<AdminSettings />} />
        <Route path="constitution" element={<OfficerConstitution />} />
        <Route path="tutorials" element={<OfficerTutorials />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<NotFoundPage theme={theme} toggleTheme={toggleTheme} />} />
    </Routes>
      </Suspense>
      <CookieBanner />
      {isPending && (
        <>
          {/* Top progress line */}
          <div className="fixed top-0 left-0 right-0 h-1 z-[9999] bg-gradient-to-r from-teal-500 via-[#0d6b66] to-teal-500 animate-shimmer-loading" />
          
          {/* Corner glassmorphic status indicator */}
          <div className="fixed bottom-4 right-4 z-[9999] pointer-events-none animate-slide-up">
            <div className="flex items-center gap-3 p-3 bg-white/85 dark:bg-slate-900/85 backdrop-blur-md rounded-xl border border-slate-200/50 dark:border-slate-800/50 shadow-lg max-w-xs pointer-events-auto">
              <Loader2 className="h-4 w-4 animate-spin text-[#0d6b66] dark:text-teal-500 shrink-0" />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">Saving Changes</span>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">Updating database...</span>
              </div>
            </div>
          </div>
        </>
      )}
    </ErrorBoundary>
  );
}
