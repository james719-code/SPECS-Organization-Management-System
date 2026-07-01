import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './guard/auth';
import { 
  LayoutDashboard, User, Calendar, CreditCard, CheckSquare, FileText, Settings, 
  Users, Award, FileSpreadsheet, Activity, Bell, Landmark, UserCheck
} from 'lucide-react';

// Import Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PendingVerificationPage from './pages/PendingVerificationPage';
import StoryPage from './pages/StoryPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';

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
import AdminActivityLogs from './pages/admin/AdminActivityLogs';
import AdminSettings from './pages/admin/AdminSettings';

export default function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

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
                    { to: '/dashboard/student', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
                    { to: '/dashboard/student/profile', label: 'My Profile', icon: <User className="h-4 w-4" /> }
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
        <Route path="profile" element={<StudentProfile />} />
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
                    { to: '/dashboard/officer/files', label: 'Files', icon: <FileText className="h-4 w-4" /> }
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
                    { to: '/dashboard/admin/volunteers', label: 'Volunteers Control', icon: <Users className="h-4 w-4" /> }
                  ]
                },
                {
                  groupName: 'Operations',
                  items: [
                    { to: '/dashboard/admin/events', label: 'Events Manager', icon: <Calendar className="h-4 w-4" /> },
                    { to: '/dashboard/admin/attendance', label: 'Attendance logs', icon: <CheckSquare className="h-4 w-4" /> },
                    { to: '/dashboard/admin/announcements', label: 'Announcements', icon: <Bell className="h-4 w-4" /> }
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
                    { to: '/dashboard/admin/activity-logs', label: 'Activity Logs', icon: <Activity className="h-4 w-4" /> },
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
        <Route path="announcements" element={<AdminAnnouncements />} />
        <Route path="reports" element={<AdminReports />} />
        <Route path="activity-logs" element={<AdminActivityLogs />} />
        <Route path="settings" element={<AdminSettings />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
