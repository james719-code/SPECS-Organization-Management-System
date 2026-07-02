import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { showToast } from '../../shared/toast';
import { account, databases, Query } from '../../shared/appwrite';
import { Loader2 } from 'lucide-react';
import { DATABASE_ID, COLLECTION_ID_STUDENTS, COLLECTION_ID_ACCOUNTS } from '../../shared/constants';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';

const StudentProfile: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [accountType, setAccountType] = useState<string>('student');
  const [loading, setLoading] = useState(true);

  // Edit profile states
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
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
      const updated = {
        name: editName.trim(),
        section: editSection.trim(),
        yearLevel: editYear ? parseInt(editYear, 10) : null,
        address: editAddress.trim()
      };

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
      await account.deleteSession('current');
      localStorage.removeItem('appwrite_session');
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
  const initials = name.split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My Profile</h1>
        <p className="text-sm text-slate-500 mt-1">View and manage your student information.</p>
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
              <h3 className="text-lg font-bold text-slate-900">{name}</h3>
              <p className="text-xs text-slate-500 font-medium">{studentData?.email || currentUser?.email}</p>
            </div>

            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              {accountType === 'officer' ? 'Active Officer' : accountType === 'admin' ? 'Active Admin' : 'Active Student'}
            </span>

            <div className="flex gap-2 justify-center pt-3">
              <button
                onClick={handleEditOpen}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-3.5 py-1.5 text-xs font-semibold transition-colors"
              >
                Edit Profile
              </button>
              <button
                onClick={() => {
                  setDeleteConfirmText('');
                  setIsDeleteOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 px-3.5 py-1.5 text-xs font-semibold transition-colors"
              >
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
                    className="w-32 h-32 transition-transform duration-200 group-hover:scale-98"
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

        {/* Volunteer program info card */}
        {accountType === 'student' && (
          <div className="col-span-1 lg:col-span-3 rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider pb-2 border-b border-slate-100 flex items-center gap-2">
              <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              Volunteer Program
            </h3>

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-slate-800">Join the SPECS Volunteer Team</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Contribute to the SPECS community by creating/sharing stories and experiences with fellow student portals.
                </p>
                
                <div className="flex flex-wrap gap-1.5 pt-2">
                  <span className="inline-flex items-center rounded-full bg-[#0d6b66]/10 px-2 py-0.5 text-[9px] font-bold text-[#0d6b66]">
                    Create Posts
                  </span>
                  <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-bold text-blue-700">
                    Share Stories
                  </span>
                  <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-0.5 text-[9px] font-bold text-purple-700">
                    Build Portfolio
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 shrink-0 w-full md:w-auto mt-2 md:mt-0">
                {/* Volunteer status badges & actions */}
                {studentData?.is_volunteer && studentData?.volunteer_request_status === 'backout_pending' ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Leave Request Pending
                    </span>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button disabled className="w-full md:w-auto rounded-lg bg-slate-100 text-slate-400 py-1.5 px-4 text-xs font-semibold border">
                        Awaiting Review
                      </button>
                      <button
                        onClick={handleCancelLeaveRequest}
                        disabled={submittingVolunteerAction}
                        className="w-full md:w-auto rounded-lg border border-slate-200 bg-white hover:bg-slate-50 dark:bg-slate-900 dark:border-slate-800 text-slate-600 dark:text-slate-300 py-1.5 px-4 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : studentData?.is_volunteer ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                      Active Volunteer
                    </span>
                    <button
                      onClick={handleRequestLeaveVolunteer}
                      disabled={submittingVolunteerAction}
                      className="w-full md:w-auto rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-4 text-xs font-semibold transition-colors"
                    >
                      Leave Volunteer Program
                    </button>
                  </>
                ) : studentData?.volunteer_request_status === 'pending' ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                      Request Pending
                    </span>
                    <div className="flex gap-2 w-full md:w-auto">
                      <button disabled className="w-full md:w-auto rounded-lg bg-slate-100 text-slate-400 py-1.5 px-4 text-xs font-semibold border">
                        Awaiting Review
                      </button>
                      <button
                        onClick={handleCancelVolunteerRequest}
                        disabled={submittingVolunteerAction}
                        className="w-full md:w-auto rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 px-4 text-xs font-semibold transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </>
                ) : studentData?.volunteer_request_status === 'rejected' ? (
                  <>
                    <span className="inline-flex items-center rounded-full bg-red-50 border border-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                      Request Declined
                    </span>
                    <button
                      onClick={handleRequestVolunteer}
                      disabled={submittingVolunteerAction}
                      className="w-full md:w-auto rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-1.5 px-4 text-xs font-semibold transition-colors shadow-sm"
                    >
                      Request to Join Again
                    </button>
                  </>
                ) : (
                  <>
                    <span className="badge bg-slate-50 border text-slate-500 rounded-pill px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5">
                      Not a Volunteer
                    </span>
                    <button
                      onClick={handleRequestVolunteer}
                      disabled={submittingVolunteerAction}
                      className="w-full md:w-auto rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-1.5 px-4 text-xs font-semibold transition-colors shadow-sm"
                    >
                      Request to Join
                    </button>
                  </>
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
            <div className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl bg-white shadow-md">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(`specs-member:${currentUser.$id}`)}`}
                alt="Enlarged Attendance QR Code"
                className="w-64 h-64"
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
    </div>
  );
};

export default StudentProfile;
