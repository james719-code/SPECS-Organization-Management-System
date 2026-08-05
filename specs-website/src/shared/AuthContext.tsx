import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { api, cachedApi } from './api';
import { account } from './appwrite';
import { AccountDoc } from '../types/database';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: any | null;
  profile: AccountDoc | null;
  status: AuthStatus;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ user: any; profile: AccountDoc }>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<AccountDoc | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');

  const fetchAuth = useCallback(async () => {
    try {
      // Check Remember Me preference
      const rememberFlag = localStorage.getItem('specs_remember');
      const sessionActive = sessionStorage.getItem('specs_session');

      // If user opted out of Remember Me ("0") and this is a fresh browser session (no specs_session in sessionStorage),
      // clear the session to enforce logout on browser restart.
      if (rememberFlag === '0' && !sessionActive) {
        try {
          await account.deleteSession('current');
        } catch (e) {
          // ignore session delete error
        }
        cachedApi.users.invalidateAuth();
        setUser(null);
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      const currentUser = await cachedApi.users.getCurrent();
      if (!currentUser) {
        setUser(null);
        setProfile(null);
        setStatus('unauthenticated');
        return;
      }

      const userProfile = await cachedApi.users.getAccount(currentUser.$id);

      if (userProfile && !userProfile.deactivated) {
        setUser(currentUser);
        setProfile(userProfile);
        setStatus('authenticated');
        // Keep session active flag in sessionStorage
        sessionStorage.setItem('specs_session', '1');
      } else {
        try {
          await account.deleteSession('current');
        } catch (e) {
          // ignore
        }
        cachedApi.users.invalidateAuth();
        setUser(null);
        setProfile(null);
        setStatus('unauthenticated');
      }
    } catch (error) {
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
    }
  }, []);

  useEffect(() => {
    fetchAuth();

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'specs_auth_event' || e.key === 'specs_remember') {
        cachedApi.users.invalidateAuth();
        fetchAuth();
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('storage', handleStorageChange);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('storage', handleStorageChange);
      }
    };
  }, [fetchAuth]);

  const login = async (email: string, password: string, rememberMe: boolean = false) => {
    // Create Appwrite session
    await account.createEmailPasswordSession(email, password);

    // Update remember me storage flags
    localStorage.setItem('specs_remember', rememberMe ? '1' : '0');
    localStorage.setItem('specs_auth_event', JSON.stringify({ type: 'login', t: Date.now() }));
    sessionStorage.setItem('specs_session', '1');

    // Invalidate stale user cache so fresh user data is fetched
    cachedApi.users.invalidateAuth();

    // Direct API fetch to get immediate fresh profile data
    const currentUser = await api.users.getCurrent();
    const userProfile = await api.users.getAccount(currentUser.$id);

    if (userProfile.deactivated) {
      try {
        await account.deleteSession('current');
      } catch (e) {
        // ignore
      }
      cachedApi.users.invalidateAuth();
      localStorage.removeItem('specs_remember');
      localStorage.setItem('specs_auth_event', JSON.stringify({ type: 'logout', t: Date.now() }));
      sessionStorage.removeItem('specs_session');
      setUser(null);
      setProfile(null);
      setStatus('unauthenticated');
      throw new Error('This account has been deactivated.');
    }

    setUser(currentUser);
    setProfile(userProfile);
    setStatus('authenticated');

    return { user: currentUser, profile: userProfile };
  };

  const logout = async () => {
    try {
      await account.deleteSession('current');
    } catch (err) {
      console.warn('[AuthContext] Failed to delete session on logout:', err);
    }
    cachedApi.users.invalidateAuth();
    localStorage.removeItem('specs_remember');
    localStorage.setItem('specs_auth_event', JSON.stringify({ type: 'logout', t: Date.now() }));
    sessionStorage.removeItem('specs_session');
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  };

  const refreshAuth = async () => {
    cachedApi.users.invalidateAuth();
    await fetchAuth();
  };

  return (
    <AuthContext.Provider value={{ user, profile, status, login, logout, refreshAuth }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
