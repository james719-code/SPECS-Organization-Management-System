import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Home, ArrowLeft, Sun, Moon } from 'lucide-react';

interface NotFoundPageProps {
  theme?: 'light' | 'dark';
  toggleTheme?: () => void;
}

const NotFoundPage: React.FC<NotFoundPageProps> = ({ theme = 'light', toggleTheme }) => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen w-screen flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors duration-200">
      
      {/* Official SPECS Navbar Header */}
      <header className="backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <Link to="/" className="flex items-center gap-3">
          <img src="/logo.webp" alt="SPECS Logo" className="h-10 w-10 object-contain rounded-xl shadow-md" />
          <div className="flex flex-col text-left">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">SPECS Portal</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">College of Engineering and Computational Sciences</span>
          </div>
        </Link>

        {toggleTheme && (
          <button
            onClick={toggleTheme}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-450 transition-all shadow-sm"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-500" /> : <Moon className="h-4.5 w-4.5 text-indigo-650" />}
          </button>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 max-w-lg mx-auto space-y-6">
        
        {/* Visual 404 Illustration with premium gradient */}
        <div className="relative select-none pointer-events-none">
          <span className="text-[10rem] sm:text-[12rem] font-black bg-gradient-to-b from-slate-300 to-slate-200 dark:from-slate-700 dark:to-slate-800 bg-clip-text text-transparent tracking-tighter leading-none select-none block">
            404
          </span>
        </div>

        <div className="space-y-3">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">
            Lost in Space?
          </h2>
          <p className="text-sm sm:text-base text-slate-500 dark:text-slate-400 leading-relaxed max-w-md">
            The page you're trying to access doesn't exist, has been archived, or was moved. Double check the address bar or use the actions below.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 w-full justify-center pt-4">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 px-6 py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.98] shadow-sm"
          >
            <ArrowLeft className="h-4 w-4" />
            Go Back
          </button>
          
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-6 py-3 text-sm font-semibold shadow-md shadow-teal-900/10 transition-all duration-150 hover:scale-[1.02] active:scale-[0.98]"
          >
            <Home className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center border-t border-slate-100 dark:border-slate-900/50 bg-white/20 dark:bg-slate-950/20">
        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
          SPECS Organization Management System
        </span>
      </footer>

    </div>
  );
};

export default NotFoundPage;
