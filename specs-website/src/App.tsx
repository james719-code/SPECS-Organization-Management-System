import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthGuard } from './guard/auth';
import { 
  LayoutDashboard, User, Calendar, CreditCard, CheckSquare, FileText, Settings, 
  Users, Award, FileSpreadsheet, Activity, Bell, Landmark, UserCheck, Loader2
} from 'lucide-react';

// Import Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PendingVerificationPage from './pages/PendingVerificationPage';
import StoryPage from './pages/StoryPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import MaintenancePage from './pages/MaintenancePage';

// Import Layout
import DashboardLayout from './components/DashboardLayout';

// Student Pages
import StudentProfile from './pages/student/StudentProfile';
import StudentAttendance from './pages/student/StudentAttendance';
import StudentEvents from './pages/student/StudentEvents';
import StudentPayments from './pages/student/StudentPayments';
import StudentPosts from './pages/student/StudentPosts';

// Admin / Officer Shared Pages
import VolunteersManagement from './pages/shared/VolunteersManagement';

// Admin Pages
import AdminOverview from './pages/admin/AdminOverview';
import AdminAccounts from './pages/admin/AdminAccounts';
import AdminStudents from './pages/admin/AdminStudents';
import AdminEvents from './pages/admin/AdminEvents';
import AdminAttendance from './pages/admin/AdminAttendance';
import AdminPayments from './pages/admin/AdminPayments';
import AdminFinance from './pages/admin/AdminFinance';
import AdminFiles from './pages/admin/AdminFiles';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminStories from './pages/admin/AdminStories';
import AdminReports from './pages/admin/AdminReports';
import AdminSettings from './pages/admin/AdminSettings';
import AdminOfficers from './pages/admin/AdminOfficers';
import AdminTasks from './pages/admin/AdminTasks';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  const location = useLocation();
  const [isMaintenance, setIsMaintenance] = useState(false);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [userRole, setUserRole] = useState<string | null>(() => {
    try {
      const stored = localStorage.getItem('appwrite_session');
      if (stored) {
        return JSON.parse(stored).role || null;
      }
    } catch (e) {}
    return null;
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const checkMaintenanceAndRole = async () => {
      try {
        const { databases, account } = await import('./shared/appwrite');
        const { DATABASE_ID, COLLECTION_ID_ACCOUNTS } = await import('./shared/constants');

        // Check if user is logged in
        let loggedInUser: any = null;
        try {
          loggedInUser = await account.get();
        } catch (e) {
          // not logged in
        }

        // Fetch user role if logged in
        if (loggedInUser) {
          // Initial sync from localStorage if present to prevent flashes
          const stored = localStorage.getItem('appwrite_session');
          if (stored) {
            try {
              const parsed = JSON.parse(stored);
              if (parsed.userId === loggedInUser.$id && parsed.role) {
                setUserRole(parsed.role);
              }
            } catch (e) {}
          }

          try {
            const accDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, loggedInUser.$id);
            const role = accDoc.type || null;
            setUserRole(role);
            localStorage.setItem('appwrite_session', JSON.stringify({
              userId: loggedInUser.$id,
              role: role,
              username: accDoc.username || ''
            }));
          } catch (err) {
            console.warn('Fallback: Failed to fetch account profile for role lookup, using local session:', err);
            // Fallback to localStorage if document fetch fails due to collection permissions
            const storedFallback = localStorage.getItem('appwrite_session');
            if (storedFallback) {
              try {
                setUserRole(JSON.parse(storedFallback).role || null);
              } catch (e) {
                setUserRole(null);
              }
            } else {
              setUserRole(null);
            }
          }
        } else {
          setUserRole(null);
          localStorage.removeItem('appwrite_session');
        }

        // Fetch maintenance mode state
        try {
          const metaRes = await databases.listDocuments(DATABASE_ID, 'metadata');
          if (metaRes.documents.length > 0) {
            setIsMaintenance(!!metaRes.documents[0].ismaintenance);
          } else {
            setIsMaintenance(false);
          }
        } catch (err) {
          console.warn('Failed to load system metadata collection:', err);
          setIsMaintenance(false);
        }
      } catch (err) {
        console.error('State load error:', err);
      } finally {
        setLoadingMaintenance(false);
      }
    };

    checkMaintenanceAndRole();
  }, [location.pathname]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  if (loadingMaintenance) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#0d6b66]" />
      </div>
    );
  }

  if (isMaintenance && userRole !== 'admin') {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
        <Route path="*" element={<MaintenancePage theme={theme} toggleTheme={toggleTheme} isLoggedIn={!!userRole} />} />
      </Routes>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<LandingPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/story/:id" element={<StoryPage />} />
      <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/signup" element={<SignupPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage theme={theme} toggleTheme={toggleTheme} />} />
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
                    { to: '/dashboard/student', label: 'My Profile', icon: <User className="h-4 w-4" /> }
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
                    { to: '/dashboard/officer/profile', label: 'My Profile', icon: <User className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Operations',
                  items: [
                    { to: '/dashboard/officer/students', label: 'Students', icon: <UserCheck className="h-4 w-4" /> },
                    { to: '/dashboard/officer/volunteers', label: 'Volunteers', icon: <Users className="h-4 w-4" /> },
                    { to: '/dashboard/officer/events', label: 'Events', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/dashboard/officer/attendance', label: 'Attendance logs', icon: <CheckSquare className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Communication',
                  items: [
                    { to: '/dashboard/officer/stories', label: 'Stories', icon: <Award className="h-4 w-4" /> },
                    { to: '/dashboard/officer/files', label: 'Files', icon: <FileText className="h-4 w-4" /> },
                    { to: '/dashboard/officer/tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" /> }
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
                    { to: '/dashboard/admin', label: 'Stats Overview', icon: <LayoutDashboard className="h-4 w-4" /> }
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
                    { to: '/dashboard/admin/stories', label: 'Student Stories', icon: <Award className="h-4 w-4" /> },
                    { to: '/dashboard/admin/reports', label: 'Reports Generator', icon: <FileSpreadsheet className="h-4 w-4" /> },
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
        <Route path="reports" element={<AdminReports />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
