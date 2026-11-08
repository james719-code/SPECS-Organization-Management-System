import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { api, cachedApi } from './api';
import { account } from './appwrite';
import { AccountDoc } from '../types/database';
import { registerStudent, type RegistrationInput, type RegistrationResult } from './registration';

export type AuthStatus = 'loading' | 'authenticated' | 'unauthenticated';

interface AuthContextType {
  user: any | null;
  profile: AccountDoc | null;
  status: AuthStatus;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<{ user: any; profile: AccountDoc }>;
  register: (input: RegistrationInput) => Promise<RegistrationResult>;
  logout: () => Promise<void>;
  refreshAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<any | null>(null);
  const [profile, setProfile] = useState<AccountDoc | null>(null);
  const [status, setStatus] = useState<AuthStatus>('loading');
  const generation = useRef(0);
  const mutating = useRef(false);
  const pendingMutation = useRef<Promise<void>>(Promise.resolve());

  const clearAuthCaches = useCallback(() => {
    api.cache.clearAll();
    cachedApi.users.invalidateAuth();
  }, []);

  const reset = useCallback(() => {
    setUser(null);
    setProfile(null);
    setStatus('unauthenticated');
  }, []);

  const fetchAuth = useCallback(async (refresh = false) => {
    if (mutating.current) return;
    const request = ++generation.current;
    try {
      // Cached display data must never determine the current session/role.
      const currentUser = await account.get(refresh);
      if (request !== generation.current) return;
      if (!currentUser) { clearAuthCaches(); reset(); return; }
      const userProfile = await api.users.getAccount(currentUser.$id, true);
      if (request !== generation.current) return;
      if (userProfile.deactivated) {
        await account.deleteSession('current');
        if (request !== generation.current) return;
        clearAuthCaches(); reset(); return;
      }
      setUser(currentUser);
      setProfile(userProfile);
      setStatus('authenticated');
    } catch {
      if (request !== generation.current) return;
      // A transient read failure must not delete a recoverable signup session.
      clearAuthCaches(); reset();
    }
  }, [clearAuthCaches, reset]);

  useEffect(() => {
    let active = true;
    let unsubscribe: (() => void) | undefined;
    void fetchAuth();
    if (account.subscribe) {
      void account.subscribe(() => { if (active && !mutating.current) void fetchAuth(); })
        .then((stop: () => void) => { if (active) unsubscribe = stop; else stop(); })
        .catch(() => { /* explicit login/refresh still reports provider failures */ });
    }
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'specs_auth_event' && !mutating.current) {
        clearAuthCaches();
        void fetchAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => {
      active = false;
      generation.current++;
      unsubscribe?.();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [fetchAuth, clearAuthCaches]);

  const beginMutation = () => {
    if (mutating.current) throw new Error('An account request is already in progress. Please wait.');
    mutating.current = true;
    clearAuthCaches();
    const request = ++generation.current;
    let release!: () => void;
    pendingMutation.current = new Promise<void>((resolve) => { release = resolve; });
    return { request, finish: () => {
      if (request === generation.current) mutating.current = false;
      release();
    } };
  };

  const login = async (email: string, password: string, rememberMe = false) => {
    const { request, finish } = beginMutation();
    try {
      const session = await account.createEmailPasswordSession(email.trim().toLowerCase(), password, rememberMe);
      const currentUser = await account.get();
      if (!currentUser) throw new Error('Your session changed. Please sign in again.');
      if (session?.userId && currentUser.$id !== session.userId) throw new Error('Your session changed. Please sign in again.');
      let userProfile: AccountDoc;
      try { userProfile = await api.users.getAccount(currentUser.$id, true); } catch (error: any) {
        if (error.code === 'NOT_FOUND') throw Object.assign(new Error('Finish registration with the same email and password.'), { code: 'REGISTRATION_INCOMPLETE' });
        throw error;
      }
      if (request !== generation.current) throw new Error('Your session changed. Please sign in again.');
      if ((await account.get())?.$id !== currentUser.$id || request !== generation.current) throw new Error('Your session changed. Please sign in again.');
      if (userProfile.deactivated) {
        await account.deleteSession('current');
        throw new Error('This account has been deactivated.');
      }
      setUser(currentUser); setProfile(userProfile); setStatus('authenticated');
      localStorage.setItem('specs_auth_event', JSON.stringify({ type: 'login', t: Date.now() }));
      localStorage.removeItem('specs_remember');
      sessionStorage.removeItem('specs_session');
      return { user: currentUser, profile: userProfile };
    } catch (error) {
      if (request === generation.current) reset();
      throw error;
    } finally { finish(); }
  };

  const register = async (input: RegistrationInput) => {
    const { request, finish } = beginMutation();
    try { return await registerStudent(input); } finally {
      if (request === generation.current) { clearAuthCaches(); reset(); }
      finish();
    }
  };

  const logout = async () => {
    // Invalidate pending reads before sign-out completes.
    const previous = pendingMutation.current;
    const request = ++generation.current;
    mutating.current = true;
    let release!: () => void;
    pendingMutation.current = new Promise<void>((resolve) => { release = resolve; });
    clearAuthCaches(); reset();
    // A sign-in already sent to Firebase cannot be cancelled. Wait for it,
    // then sign out, so it cannot restore the underlying session after logout.
    try { await previous; await account.deleteSession('current'); } finally {
      localStorage.removeItem('specs_remember');
      sessionStorage.removeItem('specs_session');
      localStorage.setItem('specs_auth_event', JSON.stringify({ type: 'logout', t: Date.now() }));
      if (request === generation.current) mutating.current = false;
      release();
    }
  };

  const refreshAuth = async () => { clearAuthCaches(); await fetchAuth(true); };

  return <AuthContext.Provider value={{ user, profile, status, login, register, logout, refreshAuth }}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
