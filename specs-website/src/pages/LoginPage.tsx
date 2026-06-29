import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account } from '../shared/appwrite';
import { Mail, Lock, Eye, EyeOff, Sun, Moon, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ theme, toggleTheme }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveSession = async () => {
      try {
        const user = await account.get();
        if (user) {
          const profile = await apiGetAccountProfile(user.$id);
          if (profile.deactivated) {
            await account.deleteSession('current');
            return;
          }
          if (!profile.verified && profile.type !== 'admin') {
            navigate('/pending');
          } else {
            navigate(`/dashboard/${profile.type}`);
          }
        }
      } catch (err) {
        // No active session, ignore
      }
    };
    checkActiveSession();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await account.createEmailPasswordSession(email, password);
      // Fetch user profile to route appropriately
      const user = await account.get();
      const profile = await apiGetAccountProfile(user.$id);
      
      if (profile.deactivated) {
        throw new Error('This account has been deactivated.');
      }

      if (!profile.verified && profile.type !== 'admin') {
        navigate('/pending');
      } else {
        navigate(`/dashboard/${profile.type}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Invalid email or password.');
      setLoading(false);
    }
  };

  // Quick helper to fetch account profile manually
  const apiGetAccountProfile = async (userId: string) => {
    const { databases } = await import('../shared/appwrite');
    const { DATABASE_ID, COLLECTION_ID_ACCOUNTS } = await import('../shared/constants');
    return await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, userId);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-955 dark:bg-slate-950 px-4 transition-colors duration-300 relative overflow-hidden">
      {/* Background Blobs */}
      <div className="absolute top-1/4 left-1/4 h-[250px] w-[250px] rounded-full bg-teal-500/5 dark:bg-teal-500/10 blur-[90px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 h-[200px] w-[200px] rounded-full bg-emerald-500/5 dark:bg-emerald-500/10 blur-[80px] pointer-events-none"></div>

      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 p-8 shadow-xl backdrop-blur-md relative animate-fade-in">
        {/* Floating Theme Toggler inside LoginPage */}
        <button 
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
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Welcome Back</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5 text-center">Sign in to your SPECS student or officer dashboard</p>
        </div>

        {error && (
          <div className="mb-6 rounded-xl bg-red-50 dark:bg-red-955/20 p-4 text-xs font-semibold text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-500 dark:text-red-450" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
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
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-955/40 pl-11 pr-4 py-3 text-sm focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
                required 
              />
            </div>
          </div>
          
          <div>
            <div className="flex justify-between items-center mb-2">
              <label className="block text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Password</label>
              <span className="text-[11px] font-semibold text-[#0d6b66] dark:text-teal-400 hover:underline cursor-pointer">Forgot?</span>
            </div>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400 dark:text-slate-500">
                <Lock className="h-4.5 w-4.5" />
              </span>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-955/40 pl-11 pr-11 py-3 text-sm focus:border-[#0d6b66] dark:focus:border-teal-500 focus:outline-none transition-all dark:text-white"
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

          <button 
            type="submit" 
            disabled={loading}
            className="w-full rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] py-3.5 text-sm font-bold text-white shadow-lg shadow-teal-900/10 hover:shadow-teal-900/20 hover:-translate-y-0.5 transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {loading ? 'Verifying Identity...' : 'Sign In'}
          </button>
        </form>

        <div className="mt-8 border-t border-slate-100 dark:border-slate-800 pt-6 text-center text-xs">
          <span className="text-slate-500 dark:text-slate-400">New student? </span>
          <Link to="/signup" className="font-bold text-[#0d6b66] dark:text-teal-400 hover:underline">
            Register Account
          </Link>
        </div>

        <div className="mt-4 text-center">
          <Link to="/" className="text-xs font-semibold text-slate-400 dark:text-slate-500 hover:text-[#0d6b66] dark:hover:text-teal-400">
            ← Back to home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
