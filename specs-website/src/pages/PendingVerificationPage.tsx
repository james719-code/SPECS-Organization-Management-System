import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import { usePageMeta } from '../shared/seo';
import { account } from '../shared/appwrite';
import { authErrorMessage, needsVerification } from '../shared/registration';
import { useAuth } from '../shared/AuthContext';

const PendingVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const { logout, user, profile, status, refreshAuth } = useAuth();
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const sending = useRef(false);
  useEffect(() => {
    if (status === 'unauthenticated') navigate('/login', { replace: true });
    if (status === 'authenticated' && profile && !needsVerification(user, profile)) navigate(`/dashboard/${profile.type}`, { replace: true });
  }, [status, user, profile, navigate]);
  useEffect(() => {
    if (!cooldown) return;
    const timer = setTimeout(() => setCooldown(false), 60_000);
    return () => clearTimeout(timer);
  }, [cooldown]);

  const resend = async () => {
    if (sending.current || cooldown) return;
    sending.current = true;
    setBusy(true); setError(''); setMessage('');
    try {
      await account.createVerification(`${window.location.origin}${import.meta.env.VITE_AUTH_PROVIDER === 'firebase' ? '/login?verified=1' : '/verify'}`, user?.$id);
      setMessage('Verification email sent. Check your inbox and spam folder.');
      setCooldown(true);
    } catch (err) { setError(authErrorMessage(err)); } finally { sending.current = false; setBusy(false); }
  };

  usePageMeta({
    title: 'Verification Pending',
    description: 'Your SPECS Portal account is pending verification. Await approval from an officer or administrator to access your dashboard.',
  });

  const handleLogout = async () => {
    try {
      await logout();
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 mx-auto mb-4 border border-amber-100 dark:border-amber-900/30">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verification Pending</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          {user?.emailVerification !== true
            ? 'Verify your email address using the link in your inbox. Your account also needs approval from an officer or administrator.'
            : 'Your email is verified. Your account needs approval from an officer or administrator before you can access the dashboard.'}
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          Please check back later or contact your class representative/officer.
        </p>
        {message && <p role="status" className="mt-4 text-sm text-emerald-700 dark:text-emerald-400">{message}</p>}
        {error && <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">{error}</p>}
        {user?.emailVerification !== true && <button type="button" onClick={resend} disabled={busy || cooldown}
          className="mt-5 w-full rounded-xl bg-[#0d6b66] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">
          {cooldown ? 'Email sent — wait a minute to resend' : busy ? 'Sending...' : 'Resend verification email'}
        </button>}
        <button type="button" onClick={async () => { setBusy(true); try { await refreshAuth(); } finally { setBusy(false); } }} disabled={busy}
          className="mt-3 w-full rounded-xl border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-200 disabled:opacity-50">
          {busy ? 'Please wait...' : 'I verified my email — check my status'}
        </button>
        <button 
          onClick={handleLogout}
          className="mt-6 w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm"
        >
          Sign Out & Return
        </button>
      </div>
    </div>
  );
};

export default PendingVerificationPage;
