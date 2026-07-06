import React, { useState, useEffect } from 'react';
import { useToast } from '../../components/ui/Toast';
import { account } from '../../shared/appwrite';
import { api, cachedApi } from '../../shared/api';
import { User, Server, Loader2, Calendar, Edit, CheckCircle, Trash2 } from 'lucide-react';

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

const getStartingBalanceDocId = (sy: string): string => {
  return sy.trim().replace(/[^a-zA-Z0-9_]/g, '_').replace(/_+/g, '_').slice(0, 36);
};

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

  // Independent form states for managing a school year's carryover budget
  const [formStartingBalance, setFormStartingBalance] = useState<number>(0);
  const [savingSchoolYear, setSavingSchoolYear] = useState(false);
  const [formComputedSchoolYear, setFormComputedSchoolYear] = useState<string>('');

  // Semester date ranges states
  const [formFirstSemStart, setFormFirstSemStart] = useState<string>('');
  const [formFirstSemEnd, setFormFirstSemEnd] = useState<string>('');
  const [formSecondSemStart, setFormSecondSemStart] = useState<string>('');
  const [formSecondSemEnd, setFormSecondSemEnd] = useState<string>('');

  const [schoolYearsList, setSchoolYearsList] = useState<any[]>([]);
  const [loadingList, setLoadingList] = useState(true);

  // Automatically calculate form computed school year based on chosen semester dates
  useEffect(() => {
    if (formFirstSemStart && formSecondSemEnd) {
      const startD = new Date(formFirstSemStart);
      const endD = new Date(formSecondSemEnd);
      if (!isNaN(startD.getTime()) && !isNaN(endD.getTime())) {
        const startYear = startD.getFullYear();
        const endYear = endD.getFullYear();
        const syString = startYear === endYear ? `${startYear}` : `${startYear} - ${endYear}`;
        setFormComputedSchoolYear(syString);
      } else {
        setFormComputedSchoolYear('');
      }
    } else {
      setFormComputedSchoolYear('');
    }
  }, [formFirstSemStart, formSecondSemEnd]);


  const fetchSchoolYearsList = async () => {
    try {
      setLoadingList(true);
      const res = await api.startingBalances.list();
      setSchoolYearsList(res.documents || []);
    } catch (err) {
      console.error('Failed to load school years list:', err);
    } finally {
      setLoadingList(false);
    }
  };


  useEffect(() => {
    const fetchAdminProfile = async () => {
      try {
        setLoadingProfile(true);
        const currentUser = await cachedApi.users.getCurrent();
        const accDoc = await cachedApi.users.getAccount(currentUser.$id);
        
        const adminId = typeof accDoc.admins === 'object' ? accDoc.admins?.$id : accDoc.admins;
        
        if (adminId) {
          const adminData = await api.admins.get(adminId);
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
        const doc = await cachedApi.metadata.get();
        if (doc) {
          setMetadata({
            $id: doc.$id,
            ismaintenance: !!doc.ismaintenance,
            ishiddenofficer: !!doc.ishiddenofficer,
            schoolYear: doc.schoolYear || ''
          });

          // Fetch starting balance for this school year
          const sy = doc.schoolYear || '';
          if (sy) {
            try {
              const startingDoc = await api.startingBalances.get(getStartingBalanceDocId(sy));
              if (startingDoc) {
                setFormStartingBalance(startingDoc.amount || 0);
                setFormFirstSemStart(startingDoc.start_first_sem ? startingDoc.start_first_sem.split('T')[0] : '');
                setFormFirstSemEnd(startingDoc.end_first_sem ? startingDoc.end_first_sem.split('T')[0] : '');
                setFormSecondSemStart(startingDoc.start_second_sem ? startingDoc.start_second_sem.split('T')[0] : '');
                setFormSecondSemEnd(startingDoc.end_second_sem ? startingDoc.end_second_sem.split('T')[0] : '');
              } else {
                setFormStartingBalance(0);
                setFormFirstSemStart('');
                setFormFirstSemEnd('');
                setFormSecondSemStart('');
                setFormSecondSemEnd('');
              }
            } catch (err) {
              console.warn('Failed to load starting balance configuration:', err);
            }
          }


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
    fetchSchoolYearsList();
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
      await api.admins.update(
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
    if (!metadata.schoolYear.trim()) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Active School Year is required.' });
      return;
    }

    try {
      setSavingMetadata(true);
      const sy = metadata.schoolYear.trim();

      // Save metadata configurations
      if (metadata.$id === 'new') {
        const doc = await api.metadata.create(
          {
            ismaintenance: metadata.ismaintenance,
            ishiddenofficer: metadata.ishiddenofficer,
            schoolYear: sy
          }
        );
        setMetadata(prev => ({ ...prev, $id: doc.$id }));
      } else {
        await api.metadata.update(
          metadata.$id,
          {
            ismaintenance: metadata.ismaintenance,
            ishiddenofficer: metadata.ishiddenofficer,
            schoolYear: sy
          }
        );
      }

      // Invalidate finance and dashboard caches since active school year changed
      api.cache.clearTags(['finance', 'dashboard']);

      addToast({ type: 'success', title: 'Configurations Saved', message: 'System configurations updated successfully.' });
    } catch (err: any) {
      console.error('Failed to save system metadata:', err);
      addToast({ type: 'error', title: 'Save Failed', message: err.message || 'Failed to update system configurations.' });
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleSaveSchoolYear = async () => {
    if (!formComputedSchoolYear) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Please select valid 1st Sem Start and 2nd Sem End dates to compute the school year.' });
      return;
    }
    if (formStartingBalance < 0) {
      addToast({ type: 'error', title: 'Validation Error', message: 'Starting Balance cannot be negative.' });
      return;
    }
    if (!formFirstSemStart || !formFirstSemEnd || !formSecondSemStart || !formSecondSemEnd) {
      addToast({ type: 'error', title: 'Validation Error', message: 'All semester start and end dates are required.' });
      return;
    }

    const sem1Start = new Date(formFirstSemStart);
    const sem1End = new Date(formFirstSemEnd);
    const sem2Start = new Date(formSecondSemStart);
    const sem2End = new Date(formSecondSemEnd);

    if (sem1Start >= sem1End) {
      addToast({ type: 'error', title: 'Validation Error', message: '1st Semester Start date must be before End date.' });
      return;
    }
    if (sem2Start >= sem2End) {
      addToast({ type: 'error', title: 'Validation Error', message: '2nd Semester Start date must be before End date.' });
      return;
    }
    if (sem1End >= sem2Start) {
      addToast({ type: 'error', title: 'Validation Error', message: '1st Semester must end before 2nd Semester starts.' });
      return;
    }

    try {
      setSavingSchoolYear(true);
      const sy = formComputedSchoolYear;
      const docId = getStartingBalanceDocId(sy);

      // Save starting balance carryover configuration in a single document
      await api.startingBalances.updateOrCreate(docId, {
        amount: formStartingBalance,
        start_first_sem: sem1Start.toISOString(),
        end_first_sem: sem1End.toISOString(),
        start_second_sem: sem2Start.toISOString(),
        end_second_sem: sem2End.toISOString()
      });

      // Invalidate starting balance, finance, and dashboard caches since configurations changed
      api.cache.clearTags(['finance', 'dashboard', 'starting_balances']);

      // Refresh registry list
      await fetchSchoolYearsList();

      addToast({ type: 'success', title: 'School Year Saved', message: `School year "${sy}" starting parameters saved successfully.` });
    } catch (err: any) {
      console.error('Failed to save school year parameters:', err);
      addToast({ type: 'error', title: 'Save Failed', message: err.message || 'Failed to update configurations.' });
    } finally {
      setSavingSchoolYear(false);
    }
  };



  const handleClearSchoolYearForm = () => {
    setFormStartingBalance(0);
    setFormComputedSchoolYear('');
    setFormFirstSemStart('');
    setFormFirstSemEnd('');
    setFormSecondSemStart('');
    setFormSecondSemEnd('');
    addToast({ type: 'info', title: 'Form Cleared', message: 'Inputs reset. You can now register a new school year.' });
  };


  const handleMakeYearActive = async (schoolYear: string) => {
    try {
      setSavingMetadata(true);
      if (!metadata.$id || metadata.$id === 'new') {
        addToast({ type: 'error', title: 'Error', message: 'No metadata document loaded to update.' });
        return;
      }
      await api.metadata.update(metadata.$id, {
        ismaintenance: metadata.ismaintenance,
        ishiddenofficer: metadata.ishiddenofficer,
        schoolYear: schoolYear
      });
      setMetadata(prev => ({ ...prev, schoolYear }));
      
      // Fetch and load the active year's parameters into editing form inputs
      const startingDoc = await api.startingBalances.get(getStartingBalanceDocId(schoolYear));
      if (startingDoc) {
        setFormStartingBalance(startingDoc.amount || 0);
        setFormFirstSemStart(startingDoc.start_first_sem ? startingDoc.start_first_sem.split('T')[0] : '');
        setFormFirstSemEnd(startingDoc.end_first_sem ? startingDoc.end_first_sem.split('T')[0] : '');
        setFormSecondSemStart(startingDoc.start_second_sem ? startingDoc.start_second_sem.split('T')[0] : '');
        setFormSecondSemEnd(startingDoc.end_second_sem ? startingDoc.end_second_sem.split('T')[0] : '');
      }

      api.cache.clearTags(['finance', 'dashboard', 'starting_balances']);
      addToast({ type: 'success', title: 'Academic Year Set', message: `School year ${schoolYear} is now the active academic period.` });
    } catch (err: any) {
      console.error('Failed to change active school year:', err);
      addToast({ type: 'error', title: 'Update Failed', message: err.message || 'Failed to update configurations.' });
    } finally {
      setSavingMetadata(false);
    }
  };

  const handleLoadYearForEdit = (sy: any) => {
    const yearString = sy.$id; // Document ID is the school year string
    setFormStartingBalance(sy.amount || 0);
    setFormFirstSemStart(sy.start_first_sem ? sy.start_first_sem.split('T')[0] : '');
    setFormFirstSemEnd(sy.end_first_sem ? sy.end_first_sem.split('T')[0] : '');
    setFormSecondSemStart(sy.start_second_sem ? sy.start_second_sem.split('T')[0] : '');
    setFormSecondSemEnd(sy.end_second_sem ? sy.end_second_sem.split('T')[0] : '');
    setFormComputedSchoolYear(yearString);
    addToast({ type: 'info', title: 'Loaded for Edit', message: `School year ${yearString} parameters loaded to the form below.` });
  };

  const handleDeleteSchoolYear = async (schoolYear: string) => {
    if (schoolYear === metadata.schoolYear) {
      addToast({ type: 'error', title: 'Action Denied', message: 'You cannot delete the active school year. Please switch the active year first.' });
      return;
    }
    
    const confirmDelete = window.confirm(`Are you sure you want to remove school year "${schoolYear}" and its starting balance configuration?`);
    if (!confirmDelete) return;

    try {
      setSavingMetadata(true);
      const docId = getStartingBalanceDocId(schoolYear);
      await api.startingBalances.delete(docId);
      // Also delete semester sub-documents if they exist
      try { await api.startingBalances.delete(`${docId}_1st_sem`); } catch {}
      try { await api.startingBalances.delete(`${docId}_2nd_sem`); } catch {}
      api.cache.clearTags(['finance', 'dashboard', 'starting_balances']);
      await fetchSchoolYearsList();
      addToast({ type: 'success', title: 'Year Deleted', message: `School year ${schoolYear} has been removed from the registry.` });
    } catch (err: any) {
      console.error('Failed to delete school year:', err);
      addToast({ type: 'error', title: 'Delete Failed', message: err.message || 'Failed to remove school year.' });
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

              {/* Active School Year Dropdown */}
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800">
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                  Active Academic School Year
                </label>
                <select
                  value={metadata.schoolYear}
                  onChange={e => setMetadata(prev => ({ ...prev, schoolYear: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                >
                  <option value="" disabled>Select active school year...</option>
                  {schoolYearsList.map((sy: any) => (
                    <option key={sy.$id} value={sy.$id}>{sy.$id}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                  Select which school year is active system-wide.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
                <button
                  onClick={handleSaveMetadata}
                  disabled={savingMetadata || !metadata.schoolYear.trim()}
                  className="flex items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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

        {/* Configure / Register School Year Card */}
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6 transition-all duration-300">
          <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
            <Calendar className="h-5 w-5 text-slate-400" />
            Configure School Year Budget
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Computed Academic School Year
              </label>
              <input
                type="text"
                value={formComputedSchoolYear || 'Please select 1st Sem Start & 2nd Sem End dates...'}
                disabled
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 px-4 py-2.5 text-sm text-slate-400 dark:text-slate-500 cursor-not-allowed outline-none font-bold"
                placeholder="e.g. 2025 - 2026"
              />
              <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                Automatically computed from the semester boundaries.
              </span>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">
                Starting Balance (PHP)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={formStartingBalance || ''}
                onChange={e => setFormStartingBalance(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                placeholder="0.00"
              />

            </div>

            {/* Semester Date Ranges */}
            <div className="pt-4 border-t border-slate-100 dark:border-slate-800">

              <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-3">
                Semester Date Ranges (Required)
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">1st Semester</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Start</label>
                      <input
                        type="date"
                        value={formFirstSemStart}
                        onChange={e => setFormFirstSemStart(e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">End</label>
                      <input
                        type="date"
                        value={formFirstSemEnd}
                        onChange={e => setFormFirstSemEnd(e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3">
                  <span className="block text-[11px] font-bold text-slate-600 dark:text-slate-300 mb-2">2nd Semester</span>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Start</label>
                      <input
                        type="date"
                        value={formSecondSemStart}
                        onChange={e => setFormSecondSemStart(e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">End</label>
                      <input
                        type="date"
                        value={formSecondSemEnd}
                        onChange={e => setFormSecondSemEnd(e.target.value)}
                        className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none transition-colors"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between gap-2">
              <button
                type="button"
                onClick={handleClearSchoolYearForm}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Clear / Add New
              </button>

              <button
                onClick={handleSaveSchoolYear}
                disabled={
                  savingSchoolYear ||
                  !formComputedSchoolYear ||
                  formStartingBalance < 0 ||
                  isNaN(formStartingBalance) ||
                  !formFirstSemStart ||
                  !formFirstSemEnd ||
                  !formSecondSemStart ||
                  !formSecondSemEnd ||
                  new Date(formFirstSemStart) >= new Date(formFirstSemEnd) ||
                  new Date(formSecondSemStart) >= new Date(formSecondSemEnd) ||
                  new Date(formFirstSemEnd) >= new Date(formSecondSemStart)
                }
                className="flex items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-5 py-2.5 text-sm font-semibold transition-all shadow-md shadow-teal-500/10 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingSchoolYear ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving Year...
                  </>
                ) : (
                  'Save School Year'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>


      {/* School Years Registry Card */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs space-y-6 transition-all duration-300">
        <h3 className="text-base font-bold text-slate-800 dark:text-white flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-slate-800">
          <Calendar className="h-5 w-5 text-slate-400" />
          School Years & Starting Balances Registry
        </h3>

        {loadingList ? (
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-[#0d6b66]" />
          </div>
        ) : schoolYearsList.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 py-4 text-center">No school years registered. Use the configuration form above to add your first school year.</p>
        ) : (
          <div className="overflow-x-auto text-nowrap">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                  <th className="py-3 px-4">School Year</th>
                  <th className="py-3 px-4">Start Date</th>
                  <th className="py-3 px-4">End Date</th>
                  <th className="py-3 px-4 text-right">Starting Balance</th>
                  <th className="py-3 px-4 text-center">Status</th>
                  <th className="py-3 px-4 text-center w-24">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-medium">
                {schoolYearsList.map((sy: any) => {
                  const isActive = sy.$id === metadata.schoolYear;
                  const formattedBalance = (sy.amount || 0).toLocaleString('en-US', { minimumFractionDigits: 2 });
                  const formattedStart = sy.start_first_sem ? new Date(sy.start_first_sem).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
                  const formattedEnd = sy.end_second_sem ? new Date(sy.end_second_sem).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';

                  return (
                    <tr key={sy.$id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300">
                      <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-white">{sy.$id}</td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formattedStart}</td>
                      <td className="py-3.5 px-4 text-slate-500 dark:text-slate-400">{formattedEnd}</td>
                      <td className="py-3.5 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">₱{formattedBalance}</td>
                      <td className="py-3.5 px-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
                            <CheckCircle className="h-3 w-3" />
                            Active Year
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-950/20 px-2 py-1 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-slate-100 dark:border-slate-800">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleLoadYearForEdit(sy)}
                            className="inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2 py-1 text-[10px] font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                            title="Load values into form above to edit"
                          >
                            <Edit className="h-2.5 w-2.5" />
                            Edit
                          </button>
                          
                          {!isActive ? (
                            <button
                              onClick={() => handleDeleteSchoolYear(sy.$id)}
                              className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white dark:bg-slate-950 px-2 py-1 text-[10px] font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer"
                              title="Delete this school year configuration"
                            >
                              <Trash2 className="h-2.5 w-2.5" />
                              Delete
                            </button>
                          ) : (
                            <span 
                              className="inline-flex items-center gap-1 rounded-md border border-slate-100 bg-slate-50 dark:bg-slate-900/20 px-2 py-1 text-[10px] font-medium text-slate-400 cursor-not-allowed"
                              title="Cannot delete the active school year"
                            >
                              <Trash2 className="h-2.5 w-2.5 text-slate-300" />
                              Delete
                            </span>
                          )}

                          {!isActive && (
                            <button
                              onClick={() => handleMakeYearActive(sy.$id)}
                              className="inline-flex items-center rounded-md bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-2 py-1 text-[10px] font-bold transition-all shadow-xs cursor-pointer"
                              title="Set as global system active school year"
                            >
                              Make Active
                            </button>
                          )}
                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>

  );
};

export default AdminSettings;
