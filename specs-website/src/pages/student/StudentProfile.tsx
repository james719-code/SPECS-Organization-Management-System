import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { showToast } from '../../shared/toast';
import { account, databases, Query } from '../../shared/appwrite';
import { 
  Loader2, Heart, Award, CheckCircle2, XCircle, Clock, Send, PenTool, ShieldAlert,
  BookOpen, Globe, LayoutGrid, CreditCard, FileText, User as UserIcon, Trash2
} from 'lucide-react';
import { DATABASE_ID, COLLECTION_ID_STUDENTS, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_OFFICERS } from '../../shared/constants';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { IDCardExportModal } from '../../components/id/IDCardExportModal';

import { useAuth } from '../../shared/AuthContext';

const StudentProfile: React.FC = () => {
  const { logout } = useAuth();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [accountType, setAccountType] = useState<string>('student');
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editStudentIdNum, setEditStudentIdNum] = useState('');
  const [editSection, setEditSection] = useState('');
  const [editYear, setEditYear] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Delete account states
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deletingAccount, setDeletingAccount] = useState(false);

  // QR enlargement state
  const [isQrOpen, setIsQrOpen] = useState(false);

  // Volunteer status states
  const [submittingVolunteerAction, setSubmittingVolunteerAction] = useState(false);

  // Account credentials states
  const [accountData, setAccountData] = useState<any>(null);
  const [editUsername, setEditUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [updatingAccount, setUpdatingAccount] = useState(false);

  // SMTP Credentials & Officer position states (officer only)
  const [officerEmail, setOfficerEmail] = useState('');
  const [officerToken, setOfficerToken] = useState('');
  const [officerPosition, setOfficerPosition] = useState('');
  const [officerDocId, setOfficerDocId] = useState<string | null>(null);
  const [savingSmtp, setSavingSmtp] = useState(false);
  const [showSmtpTutorial, setShowSmtpTutorial] = useState(false);

  // ID Card modal state
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadProfile = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setCurrentUser(user);

      // Fetch account link document
      const accountDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
      setAccountData(accountDoc);
      setEditUsername(accountDoc.username || '');
      setAccountType(accountDoc.type || 'student');
      if (accountDoc.students) {
        let studentDoc = null;
        if (typeof accountDoc.students === 'object' && accountDoc.students.$id && accountDoc.students.name) {
          studentDoc = accountDoc.students;
        } else {
          const studentId = typeof accountDoc.students === 'object' ? accountDoc.students.$id : accountDoc.students;
          studentDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentId);
        }
        setStudentData(studentDoc);
      } else {
        addToast({ type: 'error', title: 'Data Missing', message: 'No student record linked to this account.' });
      }

      // Fetch officer SMTP credentials if user is an officer
      if (accountDoc.type === 'officer' && accountDoc.officers) {
        try {
          let offId = accountDoc.officers;
          if (typeof offId === 'object' && offId.$id) offId = offId.$id;
          const offDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_OFFICERS, offId);
          setOfficerDocId(offDoc.$id);
          setOfficerEmail(offDoc.email || '');
          setOfficerToken(offDoc.token_email || '');
          setOfficerPosition(offDoc.position || '');
        } catch (err) {
          console.warn('Could not fetch officer SMTP credentials:', err);
        }
      }
    } catch (err: any) {
      console.error('Failed to load profile:', err);
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load profile details.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleEditOpen = () => {
    if (!studentData) return;
    setEditName(studentData.name || '');
    setEditStudentIdNum(String(studentData.student_id || ''));
    setEditSection(studentData.section || '');
    setEditYear(String(studentData.yearLevel || ''));
    setEditAddress(studentData.address || '');
    setIsEditOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentData) return;

    setSavingProfile(true);
    try {
      const parsedId = parseInt(editStudentIdNum.trim(), 10);
      const updated: any = {
        name: editName.trim(),
        section: editSection.trim(),
        yearLevel: editYear ? parseInt(editYear, 10) : null,
        address: editAddress.trim()
      };
      if (!isNaN(parsedId) && parsedId > 0) {
        updated.student_id = parsedId;
      }

      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id, updated);
      setStudentData((prev: any) => ({ ...prev, ...updated }));
      setIsEditOpen(false);
      addToast({ type: 'success', title: 'Success', message: 'Profile updated successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return;
    setDeletingAccount(true);
    try {
      if (studentData) {
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id);
      }
      await logout();
      addToast({ type: 'info', title: 'Account deleted', message: 'Your account has been permanently deleted.' });
      navigate('/login');
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete account.' });
    } finally {
      setDeletingAccount(false);
    }
  };

  const handleAccountUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser || !accountData) return;

    setUpdatingAccount(true);
    try {
      const usernameTrimmed = editUsername.trim();
      if (!usernameTrimmed) {
        throw new Error('Username cannot be empty.');
      }

      // 1. Update username in accounts collection if changed
      if (usernameTrimmed !== accountData.username) {
        await databases.updateDocument(
          DATABASE_ID,
          COLLECTION_ID_ACCOUNTS,
          currentUser.$id,
          { username: usernameTrimmed }
        );

        setAccountData((prev: any) => ({ ...prev, username: usernameTrimmed }));
        addToast({ type: 'success', title: 'Success', message: 'Username updated successfully!' });
      }

      // 2. Update password if provided
      if (newPassword) {
        if (newPassword.length < 8) {
          throw new Error('Password must be at least 8 characters long.');
        }
        await account.updatePassword(newPassword);
        setNewPassword('');
        addToast({ type: 'success', title: 'Success', message: 'Password updated successfully!' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update credentials.' });
    } finally {
      setUpdatingAccount(false);
    }
  };

  const handleSmtpSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!officerDocId) return;
    setSavingSmtp(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_OFFICERS, officerDocId, {
        email: officerEmail.trim() || null,
        token_email: officerToken.trim() || null
      });
      addToast({ type: 'success', title: 'Saved', message: 'SMTP credentials updated successfully!' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to save SMTP credentials.' });
    } finally {
      setSavingSmtp(false);
    }
  };

  const handleRequestVolunteer = async () => {
    if (!studentData) return;
    setSubmittingVolunteerAction(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id, {
        volunteer_request_status: 'pending'
      });
      setStudentData((prev: any) => ({ ...prev, volunteer_request_status: 'pending' }));
      addToast({ type: 'success', title: 'Submitted', message: 'Volunteer request submitted! An officer will review it.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to submit request.' });
    } finally {
      setSubmittingVolunteerAction(false);
    }
  };

  const handleRequestLeaveVolunteer = async () => {
    if (!studentData) return;
    if (!window.confirm('Are you sure you want to leave the volunteer program? Your pending posts may be removed.')) {
      return;
    }
    setSubmittingVolunteerAction(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id, {
        volunteer_request_status: 'backout_pending'
      });
      setStudentData((prev: any) => ({ ...prev, volunteer_request_status: 'backout_pending' }));
      addToast({ type: 'success', title: 'Submitted', message: 'Leave request submitted for review.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to submit leave request.' });
    } finally {
      setSubmittingVolunteerAction(false);
    }
  };

  const handleCancelVolunteerRequest = async () => {
    if (!studentData) return;
    if (!window.confirm('Are you sure you want to cancel your volunteer request?')) {
      return;
    }
    setSubmittingVolunteerAction(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id, {
        volunteer_request_status: 'none'
      });
      setStudentData((prev: any) => ({ ...prev, volunteer_request_status: 'none' }));
      addToast({ type: 'success', title: 'Cancelled', message: 'Volunteer request cancelled.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to cancel request.' });
    } finally {
      setSubmittingVolunteerAction(false);
    }
  };

  const handleCancelLeaveRequest = async () => {
    if (!studentData) return;
    if (!window.confirm('Are you sure you want to cancel your request to leave the volunteer program?')) {
      return;
    }
    setSubmittingVolunteerAction(true);
    try {
      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, studentData.$id, {
        volunteer_request_status: 'approved'
      });
      setStudentData((prev: any) => ({ ...prev, volunteer_request_status: 'approved' }));
      addToast({ type: 'success', title: 'Cancelled', message: 'Leave request cancelled. You remain an active volunteer.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to cancel leave request.' });
    } finally {
      setSubmittingVolunteerAction(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d6b66]" />
      </div>
    );
  }

  const name = studentData?.name || currentUser?.name || 'User';
  const initials = name
    .split(' ')
    .map((n: string) => n[0])
    .filter(Boolean)
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'U';

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase">My Profile</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">View and manage your account information and membership badge.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Avatar Card */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
          <div className="h-24 bg-gradient-to-r from-[#0d6b66] to-[#149a93]" />
          <div className="px-6 pb-6 text-center relative -mt-12 space-y-3">
            <div className="h-20 w-20 rounded-full border-4 border-white bg-slate-100 flex items-center justify-center mx-auto text-slate-700 font-bold text-xl shadow-md">
              {initials}
            </div>
            <div>
              <h3 className="text-lg font-bold text-slate-900">{studentData?.name || currentUser?.name}</h3>
              <p className="text-xs text-slate-500 font-medium">{studentData?.email || currentUser?.email}</p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {accountType === 'officer' ? 'Active Officer' : accountType === 'admin' ? 'Active Admin' : 'Active Student'}
            </span>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-3">
              <button
                type="button"
                onClick={handleEditOpen}
                className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-3.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <UserIcon className="h-3.5 w-3.5" />
                Edit Profile
              </button>

              <button
                type="button"
                onClick={() => setIsIdModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-3.5 text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <CreditCard className="h-3.5 w-3.5 text-teal-400" />
                Export ID Card
              </button>

              <button
                type="button"
                onClick={() => {
                  setDeleteConfirmText('');
                  setIsDeleteOpen(true);
                }}
                className="inline-flex items-center justify-center gap-1.5 h-9 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 px-3.5 text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5 text-red-500" />
                Delete Account
              </button>
            </div>

            {studentData?.$id && (
              <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col items-center space-y-2">
                <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">My Attendance QR</span>
                <button 
                  onClick={() => setIsQrOpen(true)}
                  className="p-2 border border-slate-200 dark:border-slate-700 rounded-xl bg-white shadow-xs hover:border-[#0d6b66] dark:hover:border-[#0d6b66] transition-colors cursor-pointer group relative"
                  title="Click to enlarge"
                >
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`specs-member:${currentUser.$id}`)}`}
                    alt="Attendance QR Code"
                    className="w-32 h-32 aspect-square object-contain shrink-0 transition-transform duration-200 group-hover:scale-98"
                  />
                  <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center">
                    <svg className="h-6 w-6 text-white drop-shadow-md animate-in zoom-in-50 duration-150" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                    </svg>
                  </div>
                </button>
                <button
                  onClick={() => setIsQrOpen(true)}
                  className="inline-flex items-center gap-1 text-[10px] text-[#0d6b66] dark:text-[#10857f] font-bold hover:underline"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v6m3-3H7" />
                  </svg>
                  Tap to Enlarge
                </button>
                <p className="text-[10px] text-slate-400 dark:text-slate-500">Present this QR to check-in</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Info Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* SPECS Attendance & Event Pass Guide Card */}
          <div className="rounded-xl border border-teal-200/90 dark:border-teal-900/50 bg-teal-50/70 dark:bg-teal-950/20 p-5 shadow-xs space-y-2 text-left">
            <h3 className="text-sm font-black text-[#0d6b66] dark:text-teal-400 uppercase tracking-wider flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-[#0d6b66] dark:text-teal-400 shrink-0" />
              SPECS Organization Pass & Attendance Guide
            </h3>
            <p className="text-xs text-slate-700 dark:text-slate-300 font-medium leading-relaxed">
              Your SPECS Member Badge is a <strong>Horizontal 50/50 Attendance Pass</strong> designed for fast check-in at organization events:
            </p>
            <ul className="text-xs text-slate-700 dark:text-slate-300 space-y-1.5 font-medium leading-relaxed list-disc pl-4 pt-1">
              <li><strong>Left Half (Member Details)</strong>: Displays your name, photo container, student ID, and course section.</li>
              <li><strong>Right Half (Attendance QR)</strong>: Displays a large, high-contrast QR code for instant scanning at SPECS workshops, assemblies, and hackathons.</li>
              <li><strong>Policy & Usage Disclaimer (Card Back)</strong>: Explicitly notes that this pass is an internal organization event badge and <em>not an official University ID Card</em>.</li>
            </ul>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 014 0" />
              </svg>
              {accountType === 'officer' ? 'Officer & Student Information' : 'Student Information'}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Student ID Number</span>
                <span className="text-base font-semibold text-slate-900 block mt-1">{studentData?.student_id || 'N/A'}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Course Section</span>
                <span className="text-base font-semibold text-slate-900 block mt-1">{studentData?.section || 'N/A'}</span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Year Level</span>
                <span className="text-base font-semibold text-slate-900 block mt-1">
                  {studentData?.yearLevel ? `Year ${studentData.yearLevel}` : 'N/A'}
                </span>
              </div>
              <div className="p-4 bg-slate-50 border border-slate-100 rounded-lg">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Residential Address</span>
                <span className="text-base font-semibold text-slate-900 block mt-1 truncate" title={studentData?.address || ''}>
                  {studentData?.address || 'N/A'}
                </span>
              </div>
            </div>
          </div>

          {/* Account Credentials Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              Account Credentials
            </h3>

            <form onSubmit={handleAccountUpdate} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={e => setEditUsername(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">New Password (Optional)</label>
                  <input
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-955 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updatingAccount}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {updatingAccount && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Update Credentials
                </button>
              </div>
            </form>
          </div>
        </div>

        {/* SMTP Credentials Card (officer only) */}
        {accountType === 'officer' && officerDocId && (
          <div className="col-span-1 lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              SMTP Email Credentials
            </h3>

            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg p-3">
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                To send official emails using your account, configure your Google App Passkey here.
                <button
                  type="button"
                  onClick={() => setShowSmtpTutorial(true)}
                  className="ml-1 text-[#0d6b66] dark:text-teal-400 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Learn how
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </button>
              </p>
            </div>

            <form onSubmit={handleSmtpSave} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Officer Email</label>
                  <input
                    type="email"
                    required
                    value={officerEmail}
                    onChange={e => setOfficerEmail(e.target.value)}
                    placeholder="your.email@gmail.com"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">App Passkey (Token)</label>
                  <input
                    type="password"
                    value={officerToken}
                    onChange={e => setOfficerToken(e.target.value)}
                    placeholder="16-character Google App Password"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-950 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={savingSmtp}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {savingSmtp && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  Save SMTP Credentials
                </button>
              </div>
            </form>
          </div>
        )}

        {/* App Passkey Tutorial Dialog */}
        {showSmtpTutorial && createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setShowSmtpTutorial(false)}>
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
              <div className="px-6 py-4 border-b flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Google App Passkey Setup</h2>
                <button onClick={() => setShowSmtpTutorial(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="p-6 space-y-4 text-sm text-slate-700 leading-relaxed">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">1</span>
                    <div>
                      <p className="font-semibold text-slate-900">Enable 2-Step Verification</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Go to <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-[#0d6b66] hover:underline font-medium">myaccount.google.com/security</a> &rarr;
                        Sign in to Google &rarr; 2-Step Verification &rarr; Get Started. Follow the prompts to turn it on.
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">2</span>
                    <div>
                      <p className="font-semibold text-slate-900">Generate an App Password</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        In the same Google Account security page, search for "App passwords" or go to{' '}
                        <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[#0d6b66] hover:underline font-medium">myaccount.google.com/apppasswords</a>.
                        Select <strong>Mail</strong> as the app and <strong>Other</strong> as the device (name it "SPECS Portal").
                      </p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">3</span>
                    <div>
                      <p className="font-semibold text-slate-900">Copy &amp; Paste the 16-Character Password</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Google will display a yellow bar with a 16-character password (no spaces). Copy it and paste it into the <strong>App Passkey (Token)</strong> field above. Then enter your Gmail address in the <strong>Officer Email</strong> field and save.
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-500">
                  <strong className="text-slate-700">Note:</strong> App Passwords are only available when 2-Step Verification is enabled. The password shown by Google will never be displayed again &mdash; if lost, simply generate a new one.
                </div>
              </div>
              <div className="px-6 py-3 border-t bg-slate-50 flex justify-end">
                <button
                  onClick={() => setShowSmtpTutorial(false)}
                  className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors"
                >
                  Got it, Thanks!
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Volunteer program info card */}
        {accountType === 'student' && (
          <div className="col-span-1 lg:col-span-3 rounded-2xl border border-slate-200/80 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-6 shadow-xs hover:shadow-md transition-all duration-300 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800/80">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wider flex items-center gap-2">
                <Heart className="h-5 w-5 text-rose-500 fill-rose-500/10 animate-pulse animate-duration-1000" />
                SPECS Volunteer Program
              </h3>
              {studentData?.is_volunteer && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  Active Writer
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
              {/* Feature/Intro Column */}
              <div className="lg:col-span-3 space-y-4">
                <div className="space-y-1">
                  <h4 className="text-base font-bold text-slate-800 dark:text-slate-100">Join the SPECS Volunteer Team</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-xl">
                    Contribute to the SPECS community by creating, editing, and sharing stories, event highlights, and achievements directly on the student portal's public landing page.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 shadow-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0d6b66]/10 text-[#0d6b66] dark:text-[#128a83]">
                      <PenTool className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Create Posts</p>
                      <p className="text-[10px] text-slate-400">Write drafts</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 shadow-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400">
                      <Globe className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Share Stories</p>
                      <p className="text-[10px] text-slate-400">Publish online</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800/60 hover:scale-[1.02] hover:bg-white dark:hover:bg-slate-900 transition-all duration-200 shadow-xs">
                    <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-50 dark:bg-purple-950/20 text-purple-600 dark:text-purple-400">
                      <Award className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Build Portfolio</p>
                      <p className="text-[10px] text-slate-400">Gain experience</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Display Panel */}
              <div className="lg:col-span-2 flex flex-col justify-center w-full">
                {studentData?.is_volunteer && studentData?.volunteer_request_status === 'backout_pending' ? (
                  <div className="flex flex-col space-y-4 w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Resignation Progress</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        <Clock className="h-3 w-3" />
                        Leave Pending
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm shadow-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Resignation Submitted</p>
                          <p className="text-[10px] text-slate-400">Request to leave has been logged</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm shadow-amber-500/20">
                          <Loader2 className="h-3 w-3 animate-spin" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Officer Verification</p>
                          <p className="text-[10px] text-slate-400">An officer is checking your draft assignments</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex gap-2">
                      <button
                        onClick={handleCancelLeaveRequest}
                        disabled={submittingVolunteerAction}
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-350 py-2 text-xs font-bold transition-all duration-200 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                      >
                        Cancel Leave Request
                      </button>
                    </div>
                  </div>
                ) : studentData?.is_volunteer ? (
                  <div className="flex flex-col space-y-4 w-full bg-emerald-50/20 dark:bg-emerald-950/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-900/20 shadow-xs animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm shadow-emerald-500/30">
                        <Award className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-emerald-850 dark:text-emerald-450">Active Volunteer Writer</p>
                        <p className="text-[10px] text-emerald-600 dark:text-emerald-500/80">You can now compile stories for the landing page!</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={() => navigate('/dashboard/student/posts')}
                        className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <PenTool className="h-3.5 w-3.5" />
                        Create Story Post
                      </button>
                      <button
                        onClick={handleRequestLeaveVolunteer}
                        disabled={submittingVolunteerAction}
                        className="w-full text-[10px] text-red-500 hover:text-red-650 hover:underline py-1 mt-1 text-center font-bold bg-transparent border-0 cursor-pointer transition-colors"
                      >
                        Leave Volunteer Program
                      </button>
                    </div>
                  </div>
                ) : studentData?.volunteer_request_status === 'pending' ? (
                  <div className="flex flex-col space-y-4 w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs animate-in fade-in zoom-in-95">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Application Progress</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-xs font-semibold text-amber-600 dark:text-amber-400 border border-amber-500/20 animate-pulse">
                        <Clock className="h-3 w-3" />
                        Awaiting Review
                      </span>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold shadow-sm shadow-emerald-500/20">
                          <CheckCircle2 className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Application Submitted</p>
                          <p className="text-[10px] text-slate-400">Your request to join has been logged</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white text-[10px] font-bold shadow-sm shadow-amber-500/20">
                          <Loader2 className="h-3 w-3 animate-spin text-white" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200">Officer Verification</p>
                          <p className="text-[10px] text-slate-400">An officer is reviewing your credentials</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 opacity-40">
                        <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[10px] font-bold">
                          <Award className="h-3 w-3" />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-600 dark:text-slate-450">Access Granted</p>
                          <p className="text-[10px] text-slate-400">Unlock volunteer writing tools</p>
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/50 dark:border-slate-800/50 flex gap-2">
                      <button
                        onClick={handleCancelVolunteerRequest}
                        disabled={submittingVolunteerAction}
                        className="w-full rounded-lg border border-red-200 dark:border-red-900/30 bg-red-50 hover:bg-red-100 text-red-650 dark:bg-red-950/20 dark:text-red-400 py-2 text-xs font-bold transition-all duration-200 hover:scale-[1.02] cursor-pointer disabled:opacity-50"
                      >
                        Cancel Request
                      </button>
                    </div>
                  </div>
                ) : studentData?.volunteer_request_status === 'rejected' ? (
                  <div className="flex flex-col space-y-4 w-full bg-red-50/20 dark:bg-red-950/5 p-4 rounded-xl border border-red-100 dark:border-red-900/20 shadow-xs animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-450 shadow-sm shadow-red-500/20">
                        <XCircle className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Request Declined</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">Your application to join was declined.</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={handleRequestVolunteer}
                        disabled={submittingVolunteerAction}
                        className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Reapply to Join
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col space-y-4 w-full bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200/60 dark:border-slate-800/60 shadow-xs animate-in fade-in zoom-in-95">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border dark:border-slate-700 shadow-xs">
                        <Heart className="h-5 w-5 text-[#0d6b66]" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200">Become a Volunteer</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">Submit application for posting privileges</p>
                      </div>
                    </div>
                    
                    <div className="flex flex-col gap-2 pt-1">
                      <button
                        onClick={handleRequestVolunteer}
                        disabled={submittingVolunteerAction}
                        className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2.5 text-xs font-bold transition-all duration-200 hover:scale-[1.02] shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Send className="h-3.5 w-3.5" />
                        Apply to Join
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Edit Profile Modal */}
      {isEditOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsEditOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit Profile Details</h2>
              <button onClick={() => setIsEditOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Student ID Number</label>
                <input
                  type="number"
                  required
                  value={editStudentIdNum}
                  onChange={e => setEditStudentIdNum(e.target.value)}
                  placeholder="e.g. 20240001"
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Year Level</label>
                  <select
                    value={editYear}
                    onChange={e => setEditYear(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] bg-white outline-none"
                  >
                    <option value="1">1st Year</option>
                    <option value="2">2nd Year</option>
                    <option value="3">3rd Year</option>
                    <option value="4">4th Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Section</label>
                  <input
                    type="text"
                    required
                    value={editSection}
                    onChange={e => setEditSection(e.target.value)}
                    placeholder="e.g. BSCS-3A"
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Address</label>
                <textarea
                  required
                  value={editAddress}
                  onChange={e => setEditAddress(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsEditOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {savingProfile && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete Account Modal Dialog */}
      {isDeleteOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsDeleteOpen(false)}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-red-50">
              <h2 className="text-base font-bold text-red-700 uppercase tracking-wide">Delete Student Profile</h2>
              <button onClick={() => setIsDeleteOpen(false)} className="text-slate-400 hover:text-slate-700 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="p-3 bg-red-50/70 border border-red-200 text-red-755 text-xs font-semibold rounded-lg text-red-700">
                Warning: This action cannot be undone! This completely removes your student profile record and deletes current session credentials.
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                  Type <strong className="text-red-600">DELETE</strong> to confirm
                </label>
                <input
                  type="text"
                  placeholder="DELETE"
                  value={deleteConfirmText}
                  onChange={e => setDeleteConfirmText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsDeleteOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmText !== 'DELETE' || deletingAccount}
                  className="rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-semibold text-xs px-5 py-2 shadow-xs transition-colors flex items-center gap-1.5"
                >
                  {deletingAccount && (
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Permanently Delete Account
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Enlarged QR Modal */}
      {isQrOpen && studentData && createPortal(
        <div 
          className="fixed inset-0 z-55 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in" 
          onClick={() => setIsQrOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-2xl p-6 flex flex-col items-center space-y-4 animate-in zoom-in-95" 
            onClick={e => e.stopPropagation()}
          >
            <div className="w-full flex justify-between items-center border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">My Attendance QR</h3>
              <button 
                onClick={() => setIsQrOpen(false)} 
                className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white shadow-md flex items-center justify-center aspect-square">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`specs-member:${currentUser.$id}`)}`}
                alt="Enlarged Attendance QR Code"
                className="w-64 h-64 max-w-full max-h-full aspect-square object-contain shrink-0"
              />
            </div>
            <div className="text-center space-y-1">
              <p className="text-sm font-bold text-slate-900 dark:text-white">{studentData.name}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Student ID: {studentData.student_id}</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2">Present this code clearly to the scanner</p>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* ID Card Export Modal */}
      <IDCardExportModal
        isOpen={isIdModalOpen}
        onClose={() => setIsIdModalOpen(false)}
        data={currentUser ? {
          id: currentUser.$id,
          name: name,
          studentId: studentData?.student_id || currentUser?.$id,
          role: accountType === 'officer' ? 'officer' : 'student',
          position: officerPosition || (studentData?.position || ''),
          section: studentData?.section,
          yearLevel: studentData?.yearLevel,
          email: studentData?.email || currentUser?.email,
          address: studentData?.address
        } : null}
      />
    </div>
  );
};

export default StudentProfile;
