import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { account, databases } from '../../shared/appwrite';
import { 
  DATABASE_ID, 
  COLLECTION_ID_ACCOUNTS, 
  COLLECTION_ID_ADMINS 
} from '../../shared/constants';
import { User, Server, Loader2 } from 'lucide-react';

interface AdminProfile {
  $id: string;
  fullName: string;
  email: string;
  contactNumber: string;
}

interface SystemMetadata {
  $id: string;
  ismaintenance: boolean;
  ishiddenofficer: boolean;
  schoolYear: string;
}

const AdminSettings: React.FC = () => {
  const { addToast } = useToast();

  // Admin Profile State
  const [profile, setProfile] = useState<AdminProfile>({
    $id: '',
    fullName: '',
    email: '',
    contactNumber: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // System Configurations State
  const [metadata, setMetadata] = useState<SystemMetadata>({
    $id: 'new',
    ismaintenance: false,
    ishiddenofficer: false,
    schoolYear: ''
  });
  const [loadingMetadata, setLoadingMetadata] = useState(true);
  const [savingMetadata, setSavingMetadata] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setLoadingProfile(true);
        const currentUser = await account.get();
        const accDoc = await databases.getDocument(
          DATABASE_ID,
          COLLECTION_ID_ACCOUNTS,
          currentUser.$id
        );
        
        let adminData = accDoc.admins;
        if (typeof adminData === 'string') {
          adminData = await databases.getDocument(
            DATABASE_ID,
            COLLECTION_ID_ADMINS || 'admins',
            adminData
          );
        }
        
        if (adminData) {
          setProfile({
            $id: adminData.$id,
            fullName: adminData.fullName || '',
            email: adminData.email || '',
            contactNumber: adminData.contactNumber || ''
          });
        }
      } catch (err: any) {
        console.error('Failed to load admin profile:', err);
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load profile details.' });
      } finally {
        setLoadingProfile(false);
      }
    };

    const fetchMetadata = async () => {
      try {
        setLoadingMetadata(true);
        const result = await databases.listDocuments(
          DATABASE_ID,
          'metadata'
        );
        if (result.documents.length > 0) {
          const doc = result.documents[0];
          setMetadata({
            $id: doc.$id,
            ismaintenance: !!doc.ismaintenance,
            ishiddenofficer: !!doc.ishiddenofficer,
            schoolYear: doc.schoolYear || ''
          });
        }
      } catch (err: any) {
        console.error('Failed to load system metadata:', err);
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load system configurations.' });
      } finally {
        setLoadingMetadata(false);
      }
    };

    fetchAdminProfile();
    fetchMetadata();
  }, []);

  const handleSaveProfile = async () => {
    if (!profile.$id) {
      addToast({ type: 'error', title: 'Error', message: 'No admin profile document link found.' });
      return;
    }
    if (!profile.fullName.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Full name is required.' });
      return;
    }

    try {
      setSavingProfile(true);
      await databases.updateDocument(
        DATABASE_ID,
        COLLECTION_ID_ADMINS || 'admins',
        profile.$id,
        {
          fullName: profile.fullName.trim(),
          contactNumber: profile.contactNumber.trim()
        }
      );
      addToast({ type: 'success', title: 'Profile Saved', message: 'Your administrative profile has been updated.' });
    } catch (err: any) {
      console.error('Failed to update admin profile:', err);
      addToast({ type: 'error', title: 'Update Failed', message: err.message || 'Failed to sync modifications.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveMetadata = async () => {
    try {
      setSavingMetadata(true);
      if (metadata.$id === 'new') {
        const doc = await databases.createDocument(
          DATABASE_ID,
          'metadata',
          'unique()',
          {
            ismaintenance: metadata.ismaintenance,
            ishiddenofficer: metadata.ishiddenofficer,
            schoolYear: metadata.schoolYear.trim()
          }
        );
        setMetadata(prev => ({ ...prev, $id: doc.$id }));
      } else {
        await databases.updateDocument(
          DATABASE_ID,
          'metadata',
          metadata.$id,
          {
            ismaintenance: metadata.ismaintenance,
            ishiddenofficer: metadata.ishiddenofficer,
            schoolYear: metadata.schoolYear.trim()
          }
        );
      }
      addToast({ type: 'success', title: 'Configurations Saved', message: 'System metadata parameters updated successfully.' });
    } catch (err: any) {
      console.error('Failed to save system metadata:', err);
      addToast({ type: 'error', title: 'Save Failed', message: err.message || 'Failed to update configurations.' });
    } finally {
      setSavingMetadata(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Admin Settings</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">
          Manage your administrative credentials and configure global SPECS portal parameters.
        </p>
      </div>

      {/* Main Settings Forms Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 w-full items-start">
        {/* Profile Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6 transition-all duration-300">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <User className="h-5 w-5 text-slate-400" />
            Administrative Profile
          </h3>

          {loadingProfile ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#0d6b66]" />
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Full Name
                </label>
                <input
                  type="text"
                  value={profile.fullName}
                  onChange={e => setProfile(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                  placeholder="Enter full name"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  value={profile.email}
                  disabled
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none transition-colors"
                  placeholder="Email cannot be changed"
                  title="Email address is linked to your authentication account and cannot be modified."
                />
                <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Email addresses are linked to authentication and cannot be edited.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={profile.contactNumber}
                  onChange={e => setProfile(prev => ({ ...prev, contactNumber: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                  placeholder="Enter contact number"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                  className="flex items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50"
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile Details'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* System Settings Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6 transition-all duration-300">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Server className="h-5 w-5 text-slate-400" />
            System Configurations
          </h3>

          {loadingMetadata ? (
            <div className="flex justify-center items-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-[#0d6b66]" />
            </div>
          ) : (
            <div className="space-y-5">
              {/* Maintenance Mode Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="pr-4">
                  <span className="text-sm font-bold text-slate-800 dark:text-white block">Maintenance Mode</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block leading-relaxed">
                    Enable maintenance block. Restricts access for students, officers, and guests site-wide.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={metadata.ismaintenance}
                    onChange={e => setMetadata(prev => ({ ...prev, ismaintenance: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                </label>
              </div>

              {/* Hide Officers Toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 transition-colors">
                <div className="pr-4">
                  <span className="text-sm font-bold text-slate-800 dark:text-white block">Hide Officers Control</span>
                  <span className="text-xs text-slate-400 dark:text-slate-500 mt-1 block leading-relaxed">
                    Toggle to hide the officer profiles section from students and guests.
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={metadata.ishiddenofficer}
                    onChange={e => setMetadata(prev => ({ ...prev, ishiddenofficer: e.target.checked }))}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0d6b66]"></div>
                </label>
              </div>

              {/* School Year Setting */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Current Academic School Year
                </label>
                <input
                  type="text"
                  value={metadata.schoolYear}
                  onChange={e => setMetadata(prev => ({ ...prev, schoolYear: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                  placeholder="e.g. 2025 - 2026"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveMetadata}
                  disabled={savingMetadata}
                  className="flex items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50"
                >
                  {savingMetadata ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Configurations'
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminSettings;
