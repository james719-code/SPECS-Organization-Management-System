import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert, Sun, Moon, LogOut, Loader2 } from 'lucide-react';

interface MaintenancePageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  isLoggedIn?: boolean;
}

const MaintenancePage: React.FC<MaintenancePageProps> = ({ theme, toggleTheme, isLoggedIn }) => {
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    try {
      setLoggingOut(true);
      const { account } = await import('../shared/appwrite');
      await account.deleteSession('current');
      localStorage.removeItem('appwrite_session');
      // Reload the application to reset state and re-trigger check
      window.location.reload();
    } catch (e) {
      console.error('Failed to log out:', e);
      setLoggingOut(false);
    }
  };

  return (
    <div 
      className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300 relative overflow-hidden"
      style={{
        backgroundImage: theme === 'dark' 
          ? 'radial-gradient(circle at 25% 25%, rgba(20, 184, 166, 0.08), transparent 45%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.06), transparent 45%)' 
          : 'radial-gradient(circle at 25% 25%, rgba(20, 184, 166, 0.05), transparent 45%), radial-gradient(circle at 75% 75%, rgba(16, 185, 129, 0.04), transparent 45%)'
      }}
    >
      {/* Floating Theme Toggler */}
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 transition-colors backdrop-blur-xs"
        aria-label="Toggle theme"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5 text-amber-400" /> : <Moon className="h-5 w-5 text-indigo-600" />}
      </button>

      <div className="w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/75 dark:bg-slate-900/75 p-10 shadow-2xl backdrop-blur-md relative text-center flex flex-col items-center animate-fade-in">
        {/* Animated SVG Gears */}
        <div className="relative h-32 w-32 mb-8 text-teal-600 dark:text-teal-400">
          <svg className="w-full h-full" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Big Gear */}
            <g className="origin-[50px_50px] animate-[spin_10s_linear_infinite]">
              <circle cx="50" cy="50" r="20" stroke="currentColor" strokeWidth="4" strokeDasharray="6 3" />
              <path d="M50 20V12M50 88V80M20 50H12M88 50H80M28.78 28.78l-5.65-5.65M76.87 76.87l-5.65-5.65M28.78 71.22l-5.65 5.65M76.87 23.13l-5.65 5.65" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
            </g>
          </svg>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-10 w-10 bg-white/90 dark:bg-slate-900/90 rounded-full shadow-inner flex items-center justify-center">
            <ShieldAlert className="h-5 w-5 text-teal-600 dark:text-teal-400" />
          </div>
        </div>

        <h1 className="text-3xl font-extrabold tracking-tight text-slate-950 dark:text-white mb-3">
          System Maintenance
        </h1>
        
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-sm mb-8 leading-relaxed">
          The SPECS portal is currently undergoing scheduled optimization. We will restore full service operations shortly.
        </p>

        <div className="w-full border-t border-slate-200 dark:border-slate-800 pt-6 flex flex-col items-center gap-3">
          {isLoggedIn ? (
            <>
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                Account Options
              </span>
              <button
                onClick={handleLogout}
                disabled={loggingOut}
                className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 px-6 py-2.5 text-sm font-semibold transition-all shadow-sm cursor-pointer disabled:opacity-50"
              >
                {loggingOut ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <LogOut className="h-4 w-4" />
                )}
                Sign Out
              </button>
            </>
          ) : (
            <>
              <span className="text-xs font-semibold text-slate-400 tracking-wide uppercase">
                Authorized Personnel
              </span>
              <Link
                to="/login"
                className="rounded-xl bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-6 py-2.5 text-sm font-semibold transition-all shadow-md shadow-teal-500/10 hover:shadow-teal-500/20"
              >
                Admin Sign In
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default MaintenancePage;
