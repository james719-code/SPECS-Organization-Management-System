import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { account } from '../shared/appwrite';
import { Sun, Moon, Menu, LogOut } from 'lucide-react';

interface LinkItem {
  to: string;
  label: string;
  icon?: React.ReactNode;
}

interface LinkGroup {
  groupName: string;
  items: LinkItem[];
}

interface DashboardLayoutProps {
  title: string;
  role: string;
  links: LinkGroup[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, role, links, theme, toggleTheme }) => {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r dark:border-slate-800 bg-white dark:bg-slate-900 flex flex-col justify-between transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand */}
          <div className="border-b dark:border-slate-800 px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <img src="/logo.webp" alt="SPECS Logo" className="h-9 w-9 object-contain rounded-lg shadow-xs" />
            <div>
              <span className="font-bold block tracking-tight leading-none text-slate-900 dark:text-white">SPECS Portal</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500 uppercase tracking-wider font-semibold mt-0.5 block">{role} Panel</span>
            </div>
          </div>

          {/* Nav links */}
          <nav className="flex-1 overflow-y-auto p-3 space-y-4">
            {links.map((group, groupIdx) => (
              <div key={groupIdx} className="space-y-1">
                {group.groupName && (
                  <h4 className="px-3 text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                    {group.groupName}
                  </h4>
                )}
                <div className="space-y-0.5">
                  {group.items.map((link, linkIdx) => (
                    <NavLink
                      key={linkIdx}
                      to={link.to}
                      end={link.to === `/dashboard/${role.toLowerCase()}`}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                          isActive
                            ? 'bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                        }`
                      }
                    >
                      {link.icon && <span className="flex-shrink-0 text-slate-400">{link.icon}</span>}
                      <span>{link.label}</span>
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </div>

        {/* Logout */}
        <div className="p-3 border-t flex-shrink-0">
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 hover:border-red-200 dark:hover:border-red-900/50 transition-colors"
          >
            <LogOut className="h-4 w-4 text-red-600 dark:text-red-400 flex-shrink-0" />
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="border-b dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-8 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className="p-2 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-center"
              aria-label="Toggle theme"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5 text-amber-400" /> : <Moon className="h-4.5 w-4.5 text-[#0d6b66]" />}
            </button>
            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-[#0d6b66] to-[#149a93] text-white flex items-center justify-center text-xs font-semibold uppercase shadow-sm">
              U
            </div>
          </div>
        </header>

        {/* Page content via Outlet */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
