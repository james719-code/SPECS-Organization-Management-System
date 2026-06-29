import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthGuard } from './guard/auth';

// Import Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import PendingVerificationPage from './pages/PendingVerificationPage';

// Import Components / Layouts
import DashboardLayout from './components/DashboardLayout';

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
      <Route path="/login" element={<LoginPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/signup" element={<SignupPage theme={theme} toggleTheme={toggleTheme} />} />
      <Route path="/pending" element={<PendingVerificationPage />} />

      {/* Role-Guarded Student Routes */}
      <Route 
        path="/dashboard/student/*" 
        element={
          <AuthGuard allowedRoles={['student']}>
            <DashboardLayout 
              title="Student Dashboard" 
              role="Student"
              links={[
                { to: '/dashboard/student', label: 'Overview' },
                { to: '/dashboard/student/events', label: 'Event Calendar' },
                { to: '/dashboard/student/payments', label: 'My Payments' },
                { to: '/dashboard/student/attendance', label: 'My Attendance' },
                { to: '/dashboard/student/profile', label: 'My Profile' }
              ]} 
            />
          </AuthGuard>
        } 
      />

      {/* Role-Guarded Officer Routes */}
      <Route 
        path="/dashboard/officer/*" 
        element={
          <AuthGuard allowedRoles={['officer']}>
            <DashboardLayout 
              title="Officer Dashboard" 
              role="Officer"
              links={[
                { to: '/dashboard/officer', label: 'Overview' },
                { to: '/dashboard/officer/finance', label: 'Finance' },
                { to: '/dashboard/officer/payments', label: 'Payments' },
                { to: '/dashboard/officer/students', label: 'Students' },
                { to: '/dashboard/officer/volunteers', label: 'Volunteers' },
                { to: '/dashboard/officer/files', label: 'Files' },
                { to: '/dashboard/officer/events', label: 'Events' },
                { to: '/dashboard/officer/stories', label: 'Stories' }
              ]} 
            />
          </AuthGuard>
        } 
      />

      {/* Role-Guarded Admin Routes */}
      <Route 
        path="/dashboard/admin/*" 
        element={
          <AuthGuard allowedRoles={['admin']}>
            <DashboardLayout 
              title="Admin Panel" 
              role="Admin"
              links={[
                { to: '/dashboard/admin', label: 'Stats Overview' },
                { to: '/dashboard/admin/accounts', label: 'Accounts' },
                { to: '/dashboard/admin/students', label: 'Students' },
                { to: '/dashboard/admin/events', label: 'Events' },
                { to: '/dashboard/admin/attendance', label: 'Attendance' },
                { to: '/dashboard/admin/payments', label: 'Payments' },
                { to: '/dashboard/admin/finance', label: 'Finance' },
                { to: '/dashboard/admin/files', label: 'Files' },
                { to: '/dashboard/admin/volunteers', label: 'Volunteers' },
                { to: '/dashboard/admin/stories', label: 'Stories' },
                { to: '/dashboard/admin/announcements', label: 'Announcements' },
                { to: '/dashboard/admin/reports', label: 'Reports' },
                { to: '/dashboard/admin/activity-logs', label: 'Activity Logs' },
                { to: '/dashboard/admin/settings', label: 'Settings' }
              ]} 
            />
          </AuthGuard>
        } 
      />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
