import React from 'react';
import { useNavigate } from 'react-router-dom';
import { account } from '../shared/appwrite';
import { AlertTriangle } from 'lucide-react';

const PendingVerificationPage: React.FC = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-950 px-4 transition-colors duration-300">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 dark:border-slate-850 bg-white dark:bg-slate-900 p-8 text-center shadow-xl">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-955/20 text-amber-600 dark:text-amber-400 mx-auto mb-4 border border-amber-100 dark:border-amber-900/30">
          <AlertTriangle className="h-6 w-6" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Verification Pending</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
          Your account has been registered successfully. However, it requires approval from an officer or administrator before you can access the system dashboard.
        </p>
        <p className="text-xs text-slate-400 dark:text-slate-500 mt-4">
          Please check back later or contact your class representative/officer.
        </p>
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
