import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { account } from '../shared/appwrite';

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
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ title, role, links }) => {
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
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50 text-slate-800">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 border-r bg-white flex flex-col justify-between transform transition-transform duration-200 ease-in-out
        lg:relative lg:translate-x-0
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* Brand */}
          <div className="border-b px-6 py-4 flex items-center gap-3 flex-shrink-0">
            <img src="/logo.webp" alt="SPECS Logo" className="h-9 w-9 object-contain rounded-lg shadow-xs" />
            <div>
              <span className="font-bold block tracking-tight leading-none text-slate-900">SPECS Portal</span>
              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mt-0.5 block">{role} Panel</span>
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
                            ? 'bg-[#0d6b66]/10 text-[#0d6b66] shadow-xs'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
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
            className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 hover:border-red-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            Log Out
          </button>
        </div>
      </aside>

      {/* Main Panel */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <header className="border-b bg-white px-4 sm:px-8 py-3 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center gap-3">
            {/* Mobile hamburger */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden flex items-center justify-center h-9 w-9 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h2 className="text-lg font-bold tracking-tight text-slate-900">{title}</h2>
          </div>
          <div className="flex items-center gap-3">
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
