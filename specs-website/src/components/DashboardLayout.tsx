import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { account } from '../shared/appwrite';

interface DashboardLayoutProps {
  title: string;
  role: string;
  links: { to: string; label: string }[];
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, role, links }) => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      localStorage.removeItem('appwrite_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Sidebar */}
      <aside className="w-64 border-r bg-white flex flex-col justify-between">
        <div>
          <div className="border-b px-6 py-4 flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-[#0d6b66] text-white font-bold">S</div>
            <div>
              <span className="font-bold block tracking-tight leading-none text-slate-900">SPECS Portal</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-1 block">{role} Panel</span>
            </div>
          </div>
          <nav className="p-4 space-y-1">
            {links.map((link, idx) => (
              <Link 
                key={idx}
                to={link.to} 
                className="flex items-center rounded-md px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 hover:text-[#0d6b66] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="p-4 border-t">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center justify-center rounded-md border border-slate-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-100 transition-colors"
          >
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel Content */}
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="border-b bg-white px-8 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">{title}</h2>
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-full bg-[#0d6b66] text-white flex items-center justify-center text-xs font-semibold uppercase">U</div>
          </div>
        </header>
        <div className="p-8">
          <div className="rounded-lg border border-dashed border-slate-300 p-8 text-center bg-white">
            <h3 className="text-lg font-bold text-slate-900">Dashboard Workspace</h3>
            <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">
              This is the barebones workspace for your shadcn react implementation. Start editing <code className="bg-slate-100 px-1 py-0.5 rounded text-[#0d6b66]">src/App.tsx</code> to customize this view.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
