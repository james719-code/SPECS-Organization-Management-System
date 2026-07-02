import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RotateCw, Loader2, Check, Camera, Search } from 'lucide-react';
import { cachedApi, api } from '../../shared/api';
import { formatDateTime, formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc, AttendanceDoc, AccountDoc } from '../../types/database';
import { functions } from '../../shared/appwrite';
import { EMAIL_FUNCTION_ID } from '../../shared/constants';
import { getAttendanceHtml } from '../../shared/emailTemplates';
import { Html5Qrcode } from 'html5-qrcode';

const AdminAttendance: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [students, setStudents] = useState<AccountDoc[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDoc[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // QR Scan vs Manual states
  const [attendanceMode, setAttendanceMode] = useState<'manual' | 'qr'>('manual');
  const [scanCooldown, setScanCooldown] = useState<boolean>(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<AccountDoc | null>(null);

  // Student search autocomplete states
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [attendanceLabel, setAttendanceLabel] = useState('Morning Check-in');
  const [notifyViaEmail, setNotifyViaEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Search filter on records
  const [recordFilterQuery, setRecordFilterQuery] = useState('');

  // Delete Action states
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadInitialData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setInitialLoading(true);

      const [eventsRes, studentsRes, officersRes] = await Promise.all([
        cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'student' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'officer' }, isRefresh ? 0 : 5 * 60 * 1000)
      ]);

      setEvents(eventsRes.documents);
      
      // Combine students and officers as eligible attendees
      const combinedAttendees = [...studentsRes.documents, ...officersRes.documents];
      setStudents(combinedAttendees);

      // Load logged-in user profile
      try {
        const currentUser = await cachedApi.users.getCurrent();
        const userProfile = await api.users.getAccount(currentUser.$id);
        setCurrentUserProfile(userProfile);
      } catch (profileErr: any) {
        console.warn('Failed to load current user profile:', profileErr);
      }

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Data fetched successfully.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load initial data.' });
    } finally {
      setInitialLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadAttendanceRecords = async (eventId: string) => {
    if (!eventId) {
      setAttendanceRecords([]);
      return;
    }
    setLoadingRecords(true);
    try {
      const res = await api.attendance.listForEvent(eventId, { limit: 500 });
      setAttendanceRecords(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load attendance records.' });
    } finally {
      setLoadingRecords(false);
    }
  };

  useEffect(() => {
    loadAttendanceRecords(selectedEventId);
  }, [selectedEventId]);

  // Autocomplete change
  const handleStudentSearchChange = (val: string) => {
    setStudentSearchTerm(val);
    setSelectedStudent(null);
    
    if (val.trim().length < 2) {
      setAutocompleteResults([]);
      return;
    }

    const matches = students
      .filter(acc => {
        const profile = acc.students as any;
        const name = profile?.name || acc.username || '';
        return name.toLowerCase().includes(val.toLowerCase());
      })
      .map(acc => {
        const profile = acc.students as any;
        return {
          id: profile?.$id || acc.$id,
          name: profile?.name || acc.username || 'Unknown Student',
          email: profile?.email || ''
        };
      })
      .slice(0, 5);

    setAutocompleteResults(matches);
  };

  const handleSelectAutocomplete = (id: string, name: string, email?: string) => {
    setSelectedStudent({ id, name, email });
    setStudentSearchTerm(name);
    setAutocompleteResults([]);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalCount = students.length;
    const uniquePresent = new Set(
      attendanceRecords
        .map(record => {
          const profile = record.students as any;
          return profile?.$id || record.students;
        })
        .filter(Boolean)
    );
    const presentCount = uniquePresent.size;
    const absentCount = Math.max(0, totalCount - presentCount);
    const rate = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
    return { totalCount, presentCount, absentCount, rate };
  }, [students, attendanceRecords]);

  // Submit attendance record
  const handleAddAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      addToast({ type: 'warning', title: 'Event Required', message: 'Please select an event first.' });
      return;
    }
    if (!selectedStudent) {
      addToast({ type: 'warning', title: 'Student Required', message: 'Please select a student from the search autocomplete.' });
      return;
    }

    setSubmitting(true);
    try {
      // Determine recorder ID: if logged in as officer, pass officer ID. Otherwise null
      const recorderId = currentUserProfile && currentUserProfile.type === 'officer'
        ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
        : null;

      await api.attendance.create(selectedEventId, selectedStudent.id, recorderId, attendanceLabel);
      addToast({ type: 'success', title: 'Recorded', message: `Attendance marked for ${selectedStudent.name}.` });
      
      // Dispatch email notification if toggled and email is present (Background)
      if (notifyViaEmail && selectedStudent.email) {
        const studentEmail = selectedStudent.email;
        const studentName = selectedStudent.name;
        (async () => {
          try {
            const selectedEvent = events.find(ev => ev.$id === selectedEventId);
            const dateStr = selectedEvent?.date_to_held 
              ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                })
              : new Date().toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric'
                });

            const timeStr = new Date().toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit'
            });

            const htmlBody = getAttendanceHtml(
              studentName,
              selectedEvent?.event_name || 'Organization Event',
              dateStr,
              'Present',
              timeStr,
              window.location.origin
            );

            await functions.createExecution(
              EMAIL_FUNCTION_ID,
              JSON.stringify({
                action: 'send_email',
                payload: {
                  to: studentEmail,
                  subject: `Attendance Recorded: ${selectedEvent?.event_name || 'Event'}`,
                  body: htmlBody,
                  html: true
                }
              })
            );
            addToast({ type: 'info', title: 'Notification Sent', message: `Attendance email sent to ${studentEmail}.` });
          } catch (emailErr: any) {
            console.error('[AdminAttendance] Failed to send email notification:', emailErr);
            addToast({ type: 'warning', title: 'Notification Failed', message: `Recorded, but failed to send email to ${studentEmail}.` });
          }
        })();
      }

      // Reset form
      setStudentSearchTerm('');
      setSelectedStudent(null);

      // Refresh listing
      loadAttendanceRecords(selectedEventId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to record attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const playBeep = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(800, audioCtx.currentTime); // 800 Hz beep
      gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime); // low volume
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.start();
      setTimeout(() => {
        oscillator.stop();
        audioCtx.close();
      }, 150);
    } catch (e) {
      console.warn('AudioContext beep failed:', e);
    }
  };

  const handleQrScanned = async (decodedText: string) => {
    if (scanCooldown) return;
    
    if (!decodedText.startsWith('specs-member:')) {
      addToast({ type: 'warning', title: 'Invalid QR Code', message: 'Scanned QR code is not a valid SPECS member code.' });
      return;
    }
    
    const scannedStudentId = decodedText.split(':')[1];
    if (!scannedStudentId) return;

    // Resolve scanned student profile ID and account document (since QR encodes account ID)
    let studentProfileId = scannedStudentId;
    let attendeeAccount = students.find(acc => acc.$id === scannedStudentId);

    if (attendeeAccount) {
      // Scanned ID is an Account ID
      const profile = attendeeAccount.students as any;
      studentProfileId = profile?.$id || attendeeAccount.students;
    } else {
      // Look up by student profile ID for backwards compatibility
      attendeeAccount = students.find(acc => {
        const profile = acc.students as any;
        const profileId = profile?.$id || acc.students;
        return profileId === scannedStudentId;
      });
    }

    if (!studentProfileId) {
      addToast({ type: 'error', title: 'Invalid Scan', message: 'Could not resolve student profile from this QR code.' });
      return;
    }

    // Check for duplicate scan using 1-day localStorage cache
    const cacheKey = 'specs_scanned_qrs';
    const oneDayMs = 24 * 60 * 60 * 1000;
    const now = Date.now();
    let cache: Record<string, number> = {};
    let isChanged = false;
    try {
      const raw = localStorage.getItem(cacheKey);
      if (raw) {
        const tempCache = JSON.parse(raw);
        for (const [k, v] of Object.entries(tempCache)) {
          if (now - (v as number) < oneDayMs) {
            cache[k] = v as number;
          } else {
            isChanged = true;
          }
        }
      }
    } catch (e) {}

    if (isChanged) {
      try {
        localStorage.setItem(cacheKey, JSON.stringify(cache));
      } catch (e) {}
    }

    const scanKey = `${selectedEventId}:${studentProfileId}:${attendanceLabel.trim()}`;
    if (cache[scanKey]) {
      addToast({ 
        type: 'warning', 
        title: 'Duplicate Scan', 
        message: `This member has already been recorded for "${attendanceLabel}" in this event.` 
      });
      return;
    }

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 2500); // 2.5 second cooldown

    // Prevent officer from scanning themselves
    const currentStudentId = currentUserProfile?.students 
      ? (typeof currentUserProfile.students === 'object' ? currentUserProfile.students?.$id : currentUserProfile.students)
      : null;

    if (currentStudentId && studentProfileId === currentStudentId) {
      addToast({ type: 'error', title: 'Invalid Scan', message: 'An officer cannot record their own attendance.' });
      return;
    }

    const attendeeName = attendeeAccount ? (attendeeAccount.students as any)?.name || attendeeAccount.username : 'Unknown Member';
    const attendeeEmail = attendeeAccount ? (attendeeAccount.students as any)?.email : '';

    try {
      const recorderId = currentUserProfile && currentUserProfile.type === 'officer'
        ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
        : null;

      await api.attendance.create(selectedEventId, studentProfileId, recorderId, attendanceLabel);
      
      // Cache successful scan
      try {
        const raw = localStorage.getItem(cacheKey);
        const currentCache = raw ? JSON.parse(raw) : {};
        currentCache[scanKey] = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(currentCache));
      } catch (e) {}

      playBeep();
      addToast({ type: 'success', title: 'Recorded via QR', message: `Attendance marked for ${attendeeName}.` });

      if (notifyViaEmail && attendeeEmail) {
        (async () => {
          try {
            const selectedEvent = events.find(ev => ev.$id === selectedEventId);
            const dateStr = selectedEvent?.date_to_held 
              ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const timeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const htmlBody = getAttendanceHtml(
              attendeeName,
              selectedEvent?.event_name || 'Organization Event',
              dateStr,
              'Present',
              timeStr,
              window.location.origin
            );

            await functions.createExecution(
              EMAIL_FUNCTION_ID,
              JSON.stringify({
                action: 'send_email',
                payload: {
                  to: attendeeEmail,
                  subject: `Attendance Recorded: ${selectedEvent?.event_name || 'Event'}`,
                  body: htmlBody,
                  html: true
                }
              })
            );
            addToast({ type: 'info', title: 'Notification Sent', message: `Attendance email sent to ${attendeeEmail}.` });
          } catch (emailErr) {
            console.error('[AdminAttendance QR] Failed to send email:', emailErr);
            addToast({ type: 'warning', title: 'Notification Failed', message: `Attendance recorded, but email to ${attendeeEmail} failed.` });
          }
        })();
      }

      loadAttendanceRecords(selectedEventId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to record attendance.' });
    }
  };

  const scanHandlerRef = useRef(handleQrScanned);
  useEffect(() => {
    scanHandlerRef.current = handleQrScanned;
  }, [handleQrScanned, scanCooldown]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (attendanceMode === 'qr' && selectedEventId) {
      const elementId = "qr-reader-el";
      
      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode(elementId);
          await html5QrCode.start(
            { facingMode: "environment" },
            {
              fps: 10,
              qrbox: (width, height) => {
                const size = Math.min(width, height) * 0.7;
                return { width: size, height: size };
              }
            },
            (decodedText) => {
              scanHandlerRef.current(decodedText);
            },
            () => {
              // Ignore frame scan errors
            }
          );

          // Optimize focus constraints and exposure settings for scanning screens
          try {
            let capabilities: any = {};
            if (typeof html5QrCode.getRunningTrackCapabilities === 'function') {
              capabilities = html5QrCode.getRunningTrackCapabilities();
            } else {
              const track = typeof html5QrCode.getRunningTrack === 'function' 
                ? html5QrCode.getRunningTrack() 
                : null;
              if (track && typeof track.getCapabilities === 'function') {
                capabilities = track.getCapabilities();
              }
            }

            const advancedConstraints: any = {};

            // Request continuous focus if supported
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
            }

            // Request continuous exposure if supported
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
              advancedConstraints.exposureMode = 'continuous';
            }

            // Request negative exposure compensation to reduce brightness of screen emission
            if (capabilities.exposureCompensation) {
              const minExp = capabilities.exposureCompensation.min || -2.0;
              advancedConstraints.exposureCompensation = Math.max(minExp, -1.5);
            }

            if (Object.keys(advancedConstraints).length > 0) {
              await html5QrCode.applyVideoConstraints({
                advanced: [advancedConstraints]
              });
              console.log("[AdminAttendance QR] Camera optimized for screens:", advancedConstraints);
            }
          } catch (constErr) {
            console.warn("[AdminAttendance QR] Failed to apply advanced camera optimization:", constErr);
          }
        } catch (err) {
          console.error("Failed to start QR scanner:", err);
          addToast({ type: 'error', title: 'Camera Error', message: 'Could not access camera for QR scanning.' });
          setAttendanceMode('manual');
        }
      };

      const timer = setTimeout(startScanner, 250);
      return () => {
        clearTimeout(timer);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              html5QrCode?.clear();
            }).catch(e => console.error("Error stopping scanner:", e));
          }
        }
      };
    }
  }, [attendanceMode, selectedEventId]);

  const handleDeleteRecord = async () => {
    if (!deleteConfirm.id) return;
    setActionLoading(true);
    try {
      await api.attendance.delete(deleteConfirm.id);
      addToast({ type: 'success', title: 'Removed', message: 'Attendance record deleted.' });
      setDeleteConfirm({ open: false, id: null });
      loadAttendanceRecords(selectedEventId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete record.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Group attendance records by student to prevent duplicate rows in the log sheet
  const groupedRecords = useMemo(() => {
    const groups: Record<string, {
      studentId: string;
      studentName: string;
      records: { id: string; sessionLabel: string; createdAt: string }[];
    }> = {};

    attendanceRecords.forEach(record => {
      const profile = record.students as any;
      const studentId = profile?.$id || record.students;
      const studentName = profile?.name || 'Unknown Student';

      if (!studentId) return;

      if (!groups[studentId]) {
        groups[studentId] = {
          studentId,
          studentName,
          records: []
        };
      }

      groups[studentId].records.push({
        id: record.$id,
        sessionLabel: record.name_attendance || 'Attendance',
        createdAt: record.$createdAt
      });
    });

    // Sort records inside each group by createdAt (oldest first)
    Object.values(groups).forEach(g => {
      g.records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    // Sort groups alphabetically by student name
    return Object.values(groups).sort((a, b) => a.studentName.localeCompare(b.studentName));
  }, [attendanceRecords]);

  // Filtered grouped records based on query
  const filteredGroupedRecords = useMemo(() => {
    if (!recordFilterQuery.trim()) return groupedRecords;
    const q = recordFilterQuery.toLowerCase();
    return groupedRecords.filter(group => {
      if (group.studentName.toLowerCase().includes(q)) return true;
      return group.records.some(r => r.sessionLabel.toLowerCase().includes(q));
    });
  }, [groupedRecords, recordFilterQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Attendance Management</h1>
          <p className="text-sm text-slate-500 mt-1">Track and manage event attendance sheets</p>
        </div>
        <button
          onClick={() => loadInitialData(true)}
          disabled={refreshing}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm self-start sm:self-auto"
        >
          <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Select Event */}
      <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide flex items-center gap-2">
            <span>Select Event</span>
            {attendanceMode === 'qr' && (
              <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 dark:text-amber-500 font-semibold normal-case bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 px-2 py-0.5 rounded-full animate-pulse">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Locked in QR Scan Mode
              </span>
            )}
          </label>
          <span className="text-xs text-slate-400 font-medium">{events.length} events available</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No events found. Please add events first.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto pr-1">
            {events.map(event => {
              const isSelected = selectedEventId === event.$id;
              const isDisabled = attendanceMode === 'qr';
              return (
                <button
                  key={event.$id}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => setSelectedEventId(event.$id)}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-left transition-all duration-200 ${
                    isDisabled
                      ? (isSelected
                          ? 'border-[#0d6b66]/60 bg-[#0d6b66]/60 text-white/80 cursor-not-allowed opacity-90'
                          : 'border-slate-200/40 bg-slate-50/20 text-slate-400 cursor-not-allowed opacity-50')
                      : (isSelected
                          ? 'border-[#0d6b66] bg-[#0d6b66] text-white shadow-sm shadow-[#0d6b66]/10 active:scale-[0.98]'
                          : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-50 active:scale-[0.98]')
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'bg-white text-[#0d6b66]'
                        : `bg-white border border-slate-300 text-transparent ${isDisabled ? '' : 'group-hover:border-slate-400'}`
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 stroke-[3]" />
                    ) : (
                      <div className={`h-1.5 w-1.5 rounded-full bg-slate-300 ${isDisabled ? '' : 'group-hover:bg-slate-400'}`} />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs font-semibold truncate max-w-[180px] sm:max-w-[240px] leading-tight transition-colors ${
                      isSelected 
                        ? (isDisabled ? 'text-white/80' : 'text-white') 
                        : (isDisabled ? 'text-slate-400' : 'text-slate-700 group-hover:text-slate-900')
                    }`}>
                      {event.event_name}
                    </span>
                    <span className={`text-[9px] mt-0.5 transition-colors ${
                      isSelected 
                        ? (isDisabled ? 'text-white/70' : 'text-white/80') 
                        : 'text-slate-400'
                    }`}>
                      {formatDate(event.date_to_held || '')}
                      {event.location && ` • ${event.location}`}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedEventId ? (
        <>
          {/* Metrics Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Students</span>
              <p className="text-2xl font-bold text-slate-900 mt-1">{metrics.totalCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Present</span>
              <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.presentCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Absent</span>
              <p className="text-2xl font-bold text-red-600 mt-1">{metrics.absentCount}</p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Attendance Rate</span>
              <p className="text-2xl font-bold text-blue-600">{metrics.rate}%</p>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 rounded-full" style={{ width: `${metrics.rate}%` }} />
              </div>
            </div>
          </div>

          {/* Form and List Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Record Attendance Box */}
            <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-4 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Attendance</h3>
                <div className="flex gap-1 bg-slate-100 p-0.5 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setAttendanceMode('manual')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                      attendanceMode === 'manual'
                        ? 'bg-white text-[#0d6b66] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Search className="h-3 w-3" />
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => setAttendanceMode('qr')}
                    className={`flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold rounded-md transition-colors ${
                      attendanceMode === 'qr'
                        ? 'bg-white text-[#0d6b66] shadow-xs'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    <Camera className="h-3 w-3" />
                    Scan QR
                  </button>
                </div>
              </div>

              {attendanceMode === 'manual' ? (
                <form onSubmit={handleAddAttendance} className="space-y-4">
                  <div className="relative">
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Attendee</label>
                    <input
                      type="text"
                      required
                      placeholder="Search member name..."
                      value={studentSearchTerm}
                      onChange={e => handleStudentSearchChange(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                    />
                    {autocompleteResults.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 rounded-lg border border-slate-200 bg-white shadow-xl max-h-48 overflow-y-auto z-20">
                        {autocompleteResults.map(match => (
                          <button
                            key={match.id}
                            type="button"
                            onClick={() => handleSelectAutocomplete(match.id, match.name, match.email)}
                            className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b last:border-b-0"
                          >
                            {match.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Attendance Session Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Morning Check-in"
                      value={attendanceLabel}
                      onChange={e => setAttendanceLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="notifyViaEmailCheck"
                      checked={notifyViaEmail}
                      onChange={e => setNotifyViaEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                    />
                    <label htmlFor="notifyViaEmailCheck" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      Notify attendee via email
                    </label>
                  </div>

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] py-2.5 font-semibold text-sm text-white shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    {submitting && (
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    )}
                    Add Record
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Attendance Session Name</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Morning Check-in"
                      value={attendanceLabel}
                      onChange={e => setAttendanceLabel(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                    />
                  </div>

                  <div className="flex items-center gap-2 py-1">
                    <input
                      type="checkbox"
                      id="notifyViaEmailCheckQr"
                      checked={notifyViaEmail}
                      onChange={e => setNotifyViaEmail(e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                    />
                    <label htmlFor="notifyViaEmailCheckQr" className="text-xs font-semibold text-slate-600 cursor-pointer select-none">
                      Notify attendee via email
                    </label>
                  </div>

                  {/* QR webcam reader container */}
                  <div className="relative aspect-square w-full rounded-xl overflow-hidden bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-inner flex flex-col items-center justify-center">
                    <div id="qr-reader-el" className="absolute inset-0 w-full h-full object-cover" />
                    
                    {/* Floating targeting scan overlay */}
                    <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10 bg-transparent">
                      <div className="w-44 h-44 border-4 border-dashed border-[#0d6b66] rounded-xl relative shadow-md">
                        {/* Red scan line */}
                        <div className="absolute left-0 right-0 h-0.5 bg-red-500 opacity-60 animate-pulse top-1/2" />
                      </div>
                      <p className="text-[10px] text-white/90 font-bold uppercase mt-4 tracking-wider bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                        Align QR code inside box
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Attendance Logs sheet */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Attendance Logs</h3>
                  <div className="relative w-full sm:max-w-xs">
                    <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="Search logs..."
                      value={recordFilterQuery}
                      onChange={e => setRecordFilterQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-950 focus:border-[#0d6b66] outline-none"
                    />
                  </div>
                </div>

                {loadingRecords ? (
                  <SkeletonTable rows={4} cols={2} />
                ) : filteredGroupedRecords.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No matching attendance records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-3 text-left w-1/3">Student</th>
                          <th className="px-6 py-3 text-left">Sessions Attended</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredGroupedRecords.map(group => {
                          return (
                            <tr key={group.studentId} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-slate-900">{group.studentName}</td>
                              <td className="px-6 py-3.5">
                                <div className="flex flex-wrap gap-1.5">
                                  {group.records.map(r => {
                                    const timeStr = new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                    return (
                                      <span 
                                        key={r.id} 
                                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1 text-xs text-slate-700 font-medium"
                                      >
                                        <span className="font-semibold text-slate-800">{r.sessionLabel}</span>
                                        <span className="text-[10px] text-slate-400 font-mono">({timeStr})</span>
                                        <button
                                          onClick={() => setDeleteConfirm({ open: true, id: r.id })}
                                          className="text-slate-400 hover:text-red-500 rounded-full hover:bg-slate-200/50 p-0.5 transition-colors cursor-pointer"
                                          title={`Remove ${r.sessionLabel}`}
                                        >
                                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                          </svg>
                                        </button>
                                      </span>
                                    );
                                  })}
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
          </div>
        </>
      ) : (
        <EmptyState
          title="Choose an Event"
          description="Please choose a scheduled event from the dropdown selector above to manage and examine sheets."
        />
      )}

      {/* Delete Record Confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteRecord}
        title="Remove Attendance Record"
        message="Are you sure you want to delete this recorded attendance line? This action will adjust event metrics."
        confirmLabel="Remove"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminAttendance;
