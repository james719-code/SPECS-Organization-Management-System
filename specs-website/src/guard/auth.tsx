import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { cachedApi } from '../shared/api.js';

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: ('student' | 'officer' | 'admin')[];
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children, allowedRoles }) => {
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const location = useLocation();

  useEffect(() => {
    let active = true;

    async function checkAuth() {
      try {
        // 1. Get current authenticated user
        const user = await cachedApi.users.getCurrent();
        if (!user) {
          if (active) {
            setAuthenticated(false);
            setLoading(false);
          }
          return;
        }

        // 2. Fetch user profile role and status
        const profile = await cachedApi.users.getAccount(user.$id);
        
        if (active) {
          if (profile && !profile.deactivated) {
            setAuthenticated(true);
            setUserProfile(profile);
          } else {
            setAuthenticated(false);
          }
          setLoading(false);
        }
      } catch (error) {
        console.error('[AuthGuard] Auth check failed:', error);
        if (active) {
          setAuthenticated(false);
          setLoading(false);
        }
      }
    }

    checkAuth();

    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-2">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
          <p className="text-sm font-medium text-slate-600">Checking credentials...</p>
        </div>
      </div>
    );
  }

  if (!authenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  const isVerified = userProfile?.verified;
  const userType = userProfile?.type;

  // Unverified check (admins are pre-verified)
  if (!isVerified && userType !== 'admin') {
    return <Navigate to="/pending" replace />;
  }

  // Role validation
  if (allowedRoles && !allowedRoles.includes(userType)) {
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
