import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { account } from '../shared/appwrite';
import { Mail, Lock, Eye, EyeOff, Sun, Moon, AlertCircle, CheckCircle2, ArrowLeft, Sparkles } from 'lucide-react';

interface ForgotPasswordPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({ theme, toggleTheme }) => {
  const [searchParams] = useSearchParams();
  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Status states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [countdown, setCountdown] = useState(0);

  const navigate = useNavigate();
  const isMock = import.meta.env.DEV && import.meta.env.VITE_USE_MOCK_DATA === 'true';

  // If already logged in, redirect to dashboard or home
  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const user = await account.get();
        if (user) {
          // Fetch user profile to route appropriately
          const { databases } = await import('../shared/appwrite');
          const { DATABASE_ID, COLLECTION_ID_ACCOUNTS } = await import('../shared/constants');
          const profile = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
          if (!profile.deactivated) {
            if (!profile.verified && profile.type !== 'admin') {
              navigate('/pending');
            } else {
              navigate(`/dashboard/${profile.type}`);
            }
          }
        }
      } catch (err) {
        // No active session, ignore
      }
    };
    checkActiveSession();
  }, [navigate]);

  // Rate limiting resend timer effect
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => {
        setCountdown(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [countdown]);

  const handleRequestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      const redirectUrl = `${window.location.origin}/forgot-password`;
      await account.createRecovery(email, redirectUrl);
      
      setSuccess(true);
      setSuccessMessage(
        isMock
          ? 'Mock reset link generated. Check the box below or check the console log to copy the reset URL.'
          : 'Check your email! We have sent a secure recovery link to reset your password.'
      );
      setCountdown(30);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to send recovery email. Please check the email address.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      setLoading(false);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      if (!userId || !secret) {
        throw new Error('Invalid recovery parameters in URL.');
      }
      await account.updateRecovery(userId, secret, password);
      setSuccess(true);
      setSuccessMessage('Password reset successfully! You can now log in with your new password.');
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to update password. The link may have expired.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown > 0 || !email) return;
    setLoading(true);
    setError('');

    try {
      const redirectUrl = `${window.location.origin}/forgot-password`;
      await account.createRecovery(email, redirectUrl);
      setSuccessMessage(
        isMock
          ? 'Mock reset link re-generated. Check the box below or check the console log to copy the reset URL.'
          : 'A new recovery link has been sent to your email.'
      );
      setCountdown(30);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Failed to resend recovery email.');
    } finally {
      setLoading(false);
    }
  };

  const isResetting = !!(userId && secret);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 h-[250px] w-[250px] rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-[90px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-md relative animate-fade-in">
        {/* Floating Theme Toggler */}
        <button 
          type="button"
          onClick={toggleTheme}
          className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          aria-label="Toggle theme"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4 text-amber-400" /> : <Moon className="h-4 w-4 text-indigo-600" />}
        </button>

        <div className="flex flex-col items-center mb-8">
          <Link to="/">
            <img src="/logo.webp" alt="SPECS Logo" className="h-12 w-12 object-contain rounded-xl shadow-md mb-4" />
          </Link>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            {isResetting ? 'Create New Password' : 'Reset Password'}
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 text-center px-4">
            {isResetting 
              ? 'Choose a strong, unique password for your account' 
              : 'Enter your email address to receive a secure recovery link'}
          </p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-950/20 p-4 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-2 animate-slide-up">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="space-y-6 text-center animate-slide-up">
            <div className="rounded-xl bg-emerald-50 dark:bg-emerald-950/20 p-5 text-sm font-medium text-emerald-800 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30 flex flex-col items-center gap-3">
              <CheckCircle2 className="h-8 w-8 text-emerald-500 dark:text-emerald-400" />
              <span>{successMessage}</span>
            </div>

            {isResetting ? (
              <Link 
                to="/login"
                className="block w-full rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all text-center animate-pulse"
              >
                Go to Sign In
              </Link>
            ) : (
              <div className="space-y-3">
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={countdown > 0 || loading}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 py-3 text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {countdown > 0 
                    ? `Resend Link in ${countdown}s` 
                    : loading 
                      ? 'Resending...' 
                      : 'Resend Link'}
                </button>
                <button
                  type="button"
                  onClick={() => { setSuccess(false); setCountdown(0); }}
                  className="block text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-[#0d6b66] dark:hover:text-teal-400 mx-auto"
                >
                  Change email address
                </button>
                <div className="pt-2">
                  <Link
                    to="/login"
                    className="block text-xs font-semibold text-[#0d6b66] dark:text-teal-400 hover:underline"
                  >
                    Return to Sign In
                  </Link>
                </div>
              </div>
            )}
          </div>
        ) : (
          <form onSubmit={isResetting ? handleConfirmReset : handleRequestReset} className="space-y-5">
            {!isResetting ? (
              <div>
                <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Email Address</label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                    <Mail className="h-4.5 w-4.5" />
                  </span>
                  <input 
                    type="email" 
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@student.psu.edu.ph"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 pl-11 pr-4 py-3 text-sm focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                    required 
                  />
                </div>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">New Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4.5 w-4.5" />
                    </span>
                    <input 
                      type={showPassword ? "text" : "password"} 
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 pl-11 pr-11 py-3 text-sm focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350"
                    >
                      {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Confirm Password</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                      <Lock className="h-4.5 w-4.5" />
                    </span>
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/40 pl-11 pr-11 py-3 text-sm focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                      required 
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-350"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            <button 
              type="submit" 
              disabled={loading}
              className="w-full rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
            >
              {loading 
                ? 'Processing...' 
                : isResetting 
                  ? 'Update Password' 
                  : 'Send Reset Link'}
            </button>

            <div className="text-center pt-2">
              <Link 
                to="/login"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-[#0d6b66] dark:hover:text-teal-400 transition-colors"
              >
                <ArrowLeft className="h-3 w-3" />
                Back to Sign In
              </Link>
            </div>
          </form>
        )}

        {/* Mock Mode Helper Box */}
        {isMock && !success && (
          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 bg-teal-500/5 dark:bg-teal-500/5 rounded-xl p-4 border border-teal-500/10 flex flex-col gap-2">
            <span className="font-bold text-[#0d6b66] dark:text-teal-400 flex items-center gap-1">
              <Sparkles className="h-3.5 w-3.5 text-amber-500" />
              Developer Mock Environment
            </span>
            <p className="text-[11px] leading-relaxed">
              No recovery email will be sent. Click the simulation link below to act as if you just clicked the email recovery link:
            </p>
            <Link 
              to="/forgot-password?userId=mockUser123&secret=mockSecret456" 
              className="text-[#0d6b66] dark:text-teal-400 font-bold hover:underline"
            >
              Simulate Password Recovery Link →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
