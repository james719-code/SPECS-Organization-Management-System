import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { account, databases, storage } from '../shared/appwrite';
import { Sun, Moon, Menu, LogOut, Upload, Loader2, Camera } from 'lucide-react';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_OFFICERS, BUCKET_ID_PICTURES } from '../shared/constants';
import { ID } from 'appwrite';

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
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDateTime = currentTime.toLocaleString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  const handleLogout = async () => {
    try {
      await account.deleteSession('current');
      localStorage.removeItem('appwrite_session');
    } catch (e) {
      console.error(e);
    }
    navigate('/login');
  };

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [officerDoc, setOfficerDoc] = useState<any>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (role === 'Officer') {
      const checkProfilePicture = async () => {
        try {
          const user = await account.get();
          // Fetch account doc
          const accDoc = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_ACCOUNTS,
            user.$id
          );
          
          let offId = accDoc.officers;
          if (offId && typeof offId === 'object') {
            offId = offId.$id;
          }
          
          if (offId) {
            const offDoc = await databases.getDocument(
              DATABASE_ID,
              COLLECTION_ID_OFFICERS,
              offId
            );
            setOfficerDoc(offDoc);
            
            // If pictureId is null or empty, trigger the modal!
            if (!offDoc.pictureId) {
              setShowUploadModal(true);
            }
          }
        } catch (err) {
          console.error('Failed to check officer profile picture:', err);
        }
      };
      
      checkProfilePicture();
    }
  }, [role]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setUploadError('');
    }
  };

  const handleUploadPicture = async () => {
    if (!uploadFile || !officerDoc) return;
    setUploadLoading(true);
    setUploadError('');
    
    try {
      const position = officerDoc.position || 'officer';
      const originalName = uploadFile.name;
      const extension = originalName.substring(originalName.lastIndexOf('.'));
      const newFileName = `${position}${extension}`;
      
      // Rename Javascript File object
      const renamedFile = new File([uploadFile], newFileName, { type: uploadFile.type });
      
      // Upload to bucket BUCKET_ID_PICTURES
      const BUCKET_ID = BUCKET_ID_PICTURES || '688643030009e8bbf324';
      const uploadedFile = await storage.createFile(BUCKET_ID, ID.unique(), renamedFile);
      
      // Update officer document in databases
      const updatedDoc = await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID_OFFICERS,
        officerDoc.$id,
        { pictureId: uploadedFile.$id }
      );
      
      setOfficerDoc(updatedDoc);
      setShowUploadModal(false);
      setUploadFile(null);
      setPreviewUrl(null);
    } catch (err: any) {
      console.error('Failed to upload profile picture:', err);
      setUploadError(err.message || 'Failed to upload profile picture. Please try again.');
    } finally {
      setUploadLoading(false);
    }
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
                  {group.items.map((link, linkIdx) => {
                    const isParentActive = location.pathname.startsWith(link.to);
                    const isCreatePath = isParentActive && location.pathname === `${link.to}/create`;
                    const isDetailsPath = isParentActive && location.pathname.startsWith(`${link.to}/details`);
                    const showSubLink = isCreatePath || isDetailsPath;

                    let subLinkLabel = "Create Due";
                    if (isDetailsPath) {
                      const parts = location.pathname.split('/');
                      const encodedName = parts[parts.length - 1];
                      try {
                        subLinkLabel = decodeURIComponent(encodedName) || "Details";
                      } catch {
                        subLinkLabel = "Details";
                      }
                      if (subLinkLabel.length > 20) {
                        subLinkLabel = subLinkLabel.substring(0, 18) + "...";
                      }
                    }

                    return (
                      <div key={linkIdx} className="space-y-0.5">
                        <NavLink
                          to={link.to}
                          end={link.to === `/dashboard/${role.toLowerCase()}`}
                          onClick={() => setSidebarOpen(false)}
                          className={({ isActive }) =>
                            `flex items-center gap-3 rounded-lg px-3 py-2 text-xs font-semibold transition-all duration-150 ${
                              isActive || (isParentActive && link.to !== `/dashboard/${role.toLowerCase()}`)
                                ? 'bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-white'
                            }`
                          }
                        >
                          {link.icon && <span className="flex-shrink-0 text-slate-400">{link.icon}</span>}
                          <span>{link.label}</span>
                        </NavLink>

                        {showSubLink && (
                          <NavLink
                            to={location.pathname}
                            onClick={() => setSidebarOpen(false)}
                            className="flex items-center gap-3 rounded-lg pl-9 pr-3 py-1.5 text-[11px] font-semibold text-[#0d6b66] dark:text-teal-400 bg-[#0d6b66]/5 dark:bg-teal-500/5 transition-all duration-150"
                          >
                            <span className="text-slate-400 dark:text-slate-500 font-normal">↳</span>
                            <span>{subLinkLabel}</span>
                          </NavLink>
                        )}
                      </div>
                    );
                  })}
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
            
            {/* Realtime Date & Time Clock */}
            <div className="hidden sm:flex items-center rounded-xl bg-slate-100/50 dark:bg-slate-800/40 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors shadow-xs">
              <span>{formattedDateTime}</span>
            </div>
            <div className="flex sm:hidden items-center rounded-xl bg-slate-100/50 dark:bg-slate-800/40 px-2 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 transition-colors">
              <span>{currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </header>

        {/* Page content via Outlet */}
        <div className="flex-1 overflow-y-auto">
          {officerDoc && !officerDoc.pictureId && (
            <div className="mx-4 sm:mx-6 lg:mx-8 mt-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 p-4 rounded-xl flex items-center justify-between gap-4 shadow-sm animate-in slide-in-from-top duration-200">
              <div className="flex items-center gap-3">
                <Camera className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0" />
                <div className="text-left">
                  <span className="text-sm font-semibold text-amber-800 dark:text-amber-300 block">Complete Officer Profile</span>
                  <span className="text-xs text-amber-600 dark:text-amber-400">Please upload your official profile picture to complete your profile registration.</span>
                </div>
              </div>
              <button
                onClick={() => setShowUploadModal(true)}
                className="rounded-lg bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 text-xs font-semibold shadow-xs transition-colors whitespace-nowrap"
              >
                Upload Picture
              </button>
            </div>
          )}
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </div>
      </main>

      {/* Upload Profile Picture Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/55 backdrop-blur-xs p-4 animate-in fade-in">
          <div
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 border dark:border-slate-800"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="h-16 w-16 rounded-full bg-teal-50 dark:bg-teal-950/30 flex items-center justify-center border border-teal-100 dark:border-teal-900/50 text-[#0d6b66] dark:text-[#149a93]">
                <Camera className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">Officer Profile Picture</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                  As an active SPECS Officer ({officerDoc?.position ? officerDoc.position.replace(/-/g, ' ').toUpperCase() : 'OFFICER'}), please upload your profile picture.
                </p>
              </div>

              {previewUrl ? (
                <div className="relative group h-32 w-32 rounded-full overflow-hidden border border-slate-200 shadow-inner">
                  <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                  <button
                    onClick={() => {
                      setUploadFile(null);
                      setPreviewUrl(null);
                    }}
                    className="absolute inset-0 bg-black/40 flex items-center justify-center text-white text-xs font-semibold opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    Change Image
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center h-32 w-full rounded-xl border border-dashed border-slate-300 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors cursor-pointer p-4">
                  <Upload className="h-6 w-6 text-slate-400 mb-2 font-normal" />
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Choose a File</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">PNG, JPG or WEBP</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
                </label>
              )}

              {uploadError && (
                <p className="text-xs font-medium text-red-500 leading-tight">{uploadError}</p>
              )}

              <div className="flex gap-3 w-full pt-2">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Later
                </button>
                <button
                  type="button"
                  onClick={handleUploadPicture}
                  disabled={!uploadFile || uploadLoading}
                  className="flex-1 rounded-lg bg-[#0d6b66] text-white py-2.5 text-sm font-semibold hover:bg-[#0b5c58] transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
                >
                  {uploadLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Picture'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardLayout;
