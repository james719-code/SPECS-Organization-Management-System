import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../shared/AuthContext';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'officer' | 'admin')[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const { profile, status } = useAuth();
  const location = useLocation();

  if (status === 'loading') {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-950">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600 dark:text-slate-400">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (status === 'unauthenticated' || !profile) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isVerified = profile?.verified;
  const userType = profile?.type;

  // Unverified check (admins are pre-verified)
  if (!isVerified && userType !== 'admin') {
    return <Navigate to="/pending" replace />;
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(userType as any)) {
    // If unauthorized, redirect to their designated dashboard
    if (userType === 'admin') {
      return <Navigate to="/dashboard/admin" replace />;
    } else if (userType === 'officer') {
      return <Navigate to="/dashboard/officer" replace />;
    } else if (userType === 'student') {
      return <Navigate to="/dashboard/student" replace />;
    }
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

