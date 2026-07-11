import React, { useState, useEffect, useMemo, useRef } from 'react';
import { RotateCw, Loader2, Check, Camera, Search, Printer, GripVertical, X, ChevronUp, ChevronDown, Plus, Trash2 } from 'lucide-react';
import { cachedApi, api } from '../../shared/api';
import { formatDateTime, formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc, AttendanceDoc, AccountDoc, OfficerDoc, StudentDoc } from '../../types/database';
import { createPortal } from 'react-dom';
import { functions } from '../../shared/appwrite';
import { EMAIL_FUNCTION_ID } from '../../shared/constants';
import { getAttendanceHtml } from '../../shared/emailTemplates';
import { Html5Qrcode } from 'html5-qrcode';

interface SignatoryRow {
  left: string | null;
  right: string | null;
}
interface SignatoryLayout {
  rows: SignatoryRow[];
}
type DropTarget = 'available' | { row: number; side: 'left' | 'right' };
interface Signatory {
  $id: string;
  name_officer: string;
  notation_line?: string;
  position?: string;
}

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
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email?: string; type: 'student' | 'officer' } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<{ id: string; name: string; email?: string; type: 'student' | 'officer' }[]>([]);
  const [attendanceLabel, setAttendanceLabel] = useState('Morning Check-in');
  const [notifyViaEmail, setNotifyViaEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Tab & non-member states
  const [activeTab, setActiveTab] = useState<'member' | 'non-member'>('member');
  const [nonMemberName, setNonMemberName] = useState('');
  const [nonMemberEmail, setNonMemberEmail] = useState('');

  // Search filter on records
  const [recordFilterQuery, setRecordFilterQuery] = useState('');

  // Signatory & Fullscreen Scanner states
  const [officersList, setOfficersList] = useState<OfficerDoc[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSignatory, setPrintSignatory] = useState<'secretary' | 'asst-secretary'>('secretary');
  
  // Custom Signatories
  const [signatories, setSignatories] = useState<any[]>([]);
  const [printPreparedBy, setPrintPreparedBy] = useState<string>('default');
  const [printAttestedBy, setPrintAttestedBy] = useState<string>('default');
  const [printNotedBy, setPrintNotedBy] = useState<string>('default');

  // Drag-and-drop Signatory Layout states
  const [layout, setLayout] = useState<SignatoryLayout>({ rows: [] });
  const [showSignatorySection, setShowSignatorySection] = useState(false);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const STORAGE_KEY = 'specs_signatory_layout_v2_attendance';

  const loadLayout = () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed.rows)) {
          setLayout(parsed);
          return;
        }
      }
    } catch {}
    setLayout({ rows: [] });
  };

  const saveLayout = (newLayout: SignatoryLayout) => {
    const cleaned = { ...newLayout };
    while (cleaned.rows.length > 0 && !cleaned.rows[cleaned.rows.length - 1].left && !cleaned.rows[cleaned.rows.length - 1].right) {
      cleaned.rows = cleaned.rows.slice(0, -1);
    }
    setLayout(cleaned);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    } catch {}
  };

  useEffect(() => {
    loadLayout();
  }, []);

  const getById = (id: string | null): Signatory | null =>
    signatories.find(s => s.$id === id) || null;

  const availableSignatories = useMemo(() => {
    const placed = new Set<string>();
    layout.rows.forEach(r => {
      if (r.left) placed.add(r.left);
      if (r.right) placed.add(r.right);
    });
    return signatories.filter(s => !placed.has(s.$id));
  }, [signatories, layout]);

  const handleDragStart = (e: React.DragEvent, signatoryId: string, source: { type: 'available' } | { type: 'row'; row: number; side: 'left' | 'right' }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ signatoryId, source }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnSlot = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    setDragOverId(null);
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    let data: { signatoryId: string; source: any };
    try { data = JSON.parse(raw); } catch { return; }

    const { signatoryId, source } = data;
    const newRows = layout.rows.map(r => ({ left: r.left, right: r.right }));

    if (source.type === 'row') {
      if (source.side === 'left' && newRows[source.row]?.left === signatoryId) {
        newRows[source.row].left = null;
      } else if (source.side === 'right' && newRows[source.row]?.right === signatoryId) {
        newRows[source.row].right = null;
      }
    }

    newRows.forEach(r => {
      if (r.left === signatoryId) r.left = null;
      if (r.right === signatoryId) r.right = null;
    });

    if (target === 'available') {
      // just removed — nothing to do
    } else if (typeof target === 'object' && 'row' in target) {
      while (newRows.length <= target.row) {
        newRows.push({ left: null, right: null });
      }
      if (target.side === 'left') {
        if (newRows[target.row].left && newRows[target.row].left !== signatoryId) {
          const displaced = newRows[target.row].left;
          newRows[target.row].left = signatoryId;
          newRows.splice(target.row + 1, 0, { left: displaced, right: null });
        } else {
          newRows[target.row].left = signatoryId;
        }
      } else {
        if (newRows[target.row].right && newRows[target.row].right !== signatoryId) {
          const displaced = newRows[target.row].right;
          newRows[target.row].right = signatoryId;
          newRows.splice(target.row + 1, 0, { left: null, right: displaced });
        } else {
          newRows[target.row].right = signatoryId;
        }
      }
    }

    saveLayout({ rows: newRows });
  };

  const removeFromSlot = (rowIdx: number, side: 'left' | 'right') => {
    const newRows = layout.rows.map((r, i) =>
      i === rowIdx ? { ...r, [side]: null } : { ...r }
    );
    saveLayout({ rows: newRows });
  };

  const addRow = () => {
    const newRows = [...layout.rows, { left: null, right: null }];
    setLayout({ rows: newRows });
  };

  const removeRow = (rowIdx: number) => {
    const newRows = layout.rows.filter((_, i) => i !== rowIdx);
    saveLayout({ rows: newRows });
  };

  // --- Draggable chip for available signatories ---
  const DraggableChip = ({ signatory }: { signatory: Signatory }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, signatory.$id, { type: 'available' })}
      className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#0d6b66] hover:shadow-md transition-all group"
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <div>
        {signatory.notation_line && <p className="text-[10px] text-slate-500 italic">{signatory.notation_line}</p>}
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{signatory.name_officer}</p>
        {signatory.position && <p className="text-[10px] text-slate-500">{signatory.position}</p>}
      </div>
    </div>
  );

  // --- Draggable placed signatory in a slot ---
  const DraggableSlotChip = ({ signatory, rowIdx, side }: { signatory: Signatory; rowIdx: number; side: 'left' | 'right' }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, signatory.$id, { type: 'row', row: rowIdx, side })}
      className="flex items-center gap-2 p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#0d6b66] hover:shadow-md transition-all group"
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {signatory.notation_line && <p className="text-[10px] text-slate-500 italic truncate">{signatory.notation_line}</p>}
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{signatory.name_officer}</p>
        {signatory.position && <p className="text-[10px] text-slate-500 truncate">{signatory.position}</p>}
      </div>
      <button
        type="button"
        onClick={() => removeFromSlot(rowIdx, side)}
        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove from this slot"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  // --- Drop-zone for a single slot ---
  const SlotDropZone = ({ rowIdx, side, signatory }: { rowIdx: number; side: 'left' | 'right'; signatory: Signatory | null }) => {
    const zoneId = `row-${rowIdx}-${side}`;
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(zoneId); }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => handleDropOnSlot(e, { row: rowIdx, side })}
        className={`rounded-lg border-2 border-dashed p-2 min-h-[60px] flex items-center justify-center transition-colors ${
          dragOverId === zoneId
            ? 'border-emerald-400 bg-emerald-50 dark:bg-emerald-950/20'
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        {signatory ? (
          <DraggableSlotChip signatory={signatory} rowIdx={rowIdx} side={side} />
        ) : (
          <p className="text-[10px] text-slate-400 italic text-center">Drop here</p>
        )}
      </div>
    );
  };
  const [isFullScreenScan, setIsFullScreenScan] = useState(false);
  const [fullscreenLogs, setFullscreenLogs] = useState<{ id: string; name: string; time: string; status: 'success' | 'error' | 'warning'; message: string }[]>([]);
  const [scanFlash, setScanFlash] = useState<'success' | 'error' | 'warning' | null>(null);

  // Manual Camera Control states & refs
  const qrScannerRef = useRef<Html5Qrcode | null>(null);
  const [brightness, setBrightness] = useState<number>(0);
  const [focusMode, setFocusMode] = useState<string>('continuous');
  const [exposureCapabilities, setExposureCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [focusCapabilities, setFocusCapabilities] = useState<string[]>([]);
  const [hardwareBrightnessSupported, setHardwareBrightnessSupported] = useState(false);
  const [brightnessMode, setBrightnessMode] = useState<'exposureCompensation' | 'brightness' | 'none'>('none');
  const [focusDistance, setFocusDistance] = useState<number>(0.2);
  const [focusDistanceCapabilities, setFocusDistanceCapabilities] = useState<{ min: number; max: number; step: number } | null>(null);
  const [hardwareFocusSupported, setHardwareFocusSupported] = useState(false);
  const [showCameraControls, setShowCameraControls] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 768 : false);
  const [isLiveFeedCollapsed, setIsLiveFeedCollapsed] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : true);

  // Delete Action states
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadInitialData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setInitialLoading(true);

      const [eventsRes, studentsRes, officersRes, activeOfficersRes, signatoriesRes] = await Promise.all([
        cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'student' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'officer' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.officers.listAll(isRefresh ? 0 : 5 * 60 * 1000),
        api.signatories.list()
      ]);

      setEvents(eventsRes.documents);
      setOfficersList(activeOfficersRes.documents);
      setSignatories(signatoriesRes.documents);
      
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
    setPrintPreparedBy(localStorage.getItem('specs_attendance_print_prepared_by') || 'default');
    setPrintAttestedBy(localStorage.getItem('specs_attendance_print_attested_by') || 'default');
    setPrintNotedBy(localStorage.getItem('specs_attendance_print_noted_by') || 'default');
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
          email: profile?.email || '',
          type: acc.type as 'student' | 'officer'
        };
      })
      .slice(0, 5);

    setAutocompleteResults(matches);
  };

  const handleSelectAutocomplete = (id: string, name: string, email?: string, type?: 'student' | 'officer') => {
    setSelectedStudent({ id, name, email, type: type || 'student' });
    setStudentSearchTerm(name);
    setAutocompleteResults([]);
  };

  // Metrics calculation
  const metrics = useMemo(() => {
    const totalCount = students.length;
    const uniquePresent = new Set(
      attendanceRecords
        .filter(record => (record.attendee_type || 'student') !== 'non-member')
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

    if (activeTab === 'member' && !selectedStudent) {
      addToast({ type: 'warning', title: 'Student Required', message: 'Please select a student from the search autocomplete.' });
      return;
    }

    if (activeTab === 'non-member' && !nonMemberName.trim()) {
      addToast({ type: 'warning', title: 'Name Required', message: 'Please enter the non-member name.' });
      return;
    }

    setSubmitting(true);
    try {
      // Determine recorder ID: if logged in as officer, pass officer ID. Otherwise null
      const recorderId = currentUserProfile && currentUserProfile.type === 'officer'
        ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
        : null;

      if (activeTab === 'member' && selectedStudent) {
        const attendeeType = selectedStudent.type || 'student';
        await api.attendance.create(selectedEventId, attendeeType, selectedStudent.id, null, recorderId, attendanceLabel);
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
            }
          })();
        }

        // Reset form
        setStudentSearchTerm('');
        setSelectedStudent(null);
      } else if (activeTab === 'non-member') {
        const name = nonMemberName.trim();
        const email = nonMemberEmail.trim();

        await api.attendance.create(selectedEventId, 'non-member', null, { name, email }, recorderId, attendanceLabel);
        addToast({ type: 'success', title: 'Recorded', message: `Non-Member: ${name} is marked present.` });

        // Dispatch email notification if toggled and email is present (Background)
        if (notifyViaEmail && email) {
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
                name,
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
                    to: email,
                    subject: `Attendance Recorded: ${selectedEvent?.event_name || 'Event'}`,
                    body: htmlBody,
                    html: true
                  }
                })
              );
              addToast({ type: 'info', title: 'Notification Sent', message: `Attendance email sent to ${email}.` });
            } catch (emailErr: any) {
              console.error('[AdminAttendance] Failed to send email notification to non-member:', emailErr);
            }
          })();
        }

        // Reset form
        setNonMemberName('');
        setNonMemberEmail('');
      }

      // Refresh listing
      loadAttendanceRecords(selectedEventId);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to record attendance.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleExportNonMemberQr = async () => {
    if (!nonMemberName.trim()) {
      addToast({ type: 'warning', title: 'Name Required', message: 'Please enter a name to generate a QR code.' });
      return;
    }
    
    try {
      const name = nonMemberName.trim();
      const email = nonMemberEmail.trim();
      const payload = { name, email };
      const b64Payload = btoa(JSON.stringify(payload));
      const qrData = `specs-nonmember:${b64Payload}`;
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;
      
      addToast({ type: 'info', title: 'Generating Pass', message: 'Creating guest pass card...' });
      
      // Create an image element to load the QR code
      const img = new Image();
      img.crossOrigin = 'anonymous'; // critical for canvas exporting cross-origin images
      
      img.onload = () => {
        try {
          // Create canvas
          const canvas = document.createElement('canvas');
          canvas.width = 400;
          canvas.height = 560;
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Could not get canvas context');
          
          // Draw white card background
          ctx.fillStyle = '#ffffff';
          const radius = 24;
          
          // Draw card with rounded corners
          ctx.beginPath();
          ctx.moveTo(radius, 0);
          ctx.lineTo(400 - radius, 0);
          ctx.quadraticCurveTo(400, 0, 400, radius);
          ctx.lineTo(400, 560 - radius);
          ctx.quadraticCurveTo(400, 560, 400 - radius, 560);
          ctx.lineTo(radius, 560);
          ctx.quadraticCurveTo(0, 560, 0, 560 - radius);
          ctx.lineTo(0, radius);
          ctx.quadraticCurveTo(0, 0, radius, 0);
          ctx.closePath();
          ctx.fill();
          
          // Draw a subtle border
          ctx.strokeStyle = '#e2e8f0';
          ctx.lineWidth = 4;
          ctx.stroke();

          // Top banner accent
          ctx.fillStyle = '#0d6b66';
          ctx.fillRect(2, 2, 396, 12); // subtle header bar
          
          // Draw Pass Title
          ctx.fillStyle = '#0d6b66';
          ctx.font = 'bold 18px "Inter", "Segoe UI", sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText('SPECS GUEST PASS', 200, 50);
          
          // Draw generic SPECS tagline
          ctx.fillStyle = '#64748b';
          ctx.font = '500 11px "Inter", "Segoe UI", sans-serif';
          ctx.fillText('EVENT ATTENDANCE CODE', 200, 75);
          
          // Draw the QR Code
          ctx.drawImage(img, 60, 100, 280, 280);
          
          // Draw attendee name (with auto-fontsize scaling to prevent overflow)
          ctx.fillStyle = '#0f172a';
          let fontSize = 24;
          ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`;
          
          // Scale down font size if name is too long
          while (ctx.measureText(name).width > 340 && fontSize > 14) {
            fontSize -= 2;
            ctx.font = `bold ${fontSize}px "Inter", "Segoe UI", sans-serif`;
          }
          ctx.fillText(name, 200, 435);
          
          // Draw role / badge
          ctx.fillStyle = '#64748b';
          ctx.font = '600 13px "Inter", "Segoe UI", sans-serif';
          ctx.fillText('NON-MEMBER / GUEST', 200, 470);
          
          // Draw email if present
          if (email) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = 'normal 11px "Inter", "Segoe UI", sans-serif';
            ctx.fillText(email, 200, 495);
          }
          
          // Draw footer separator line
          ctx.strokeStyle = '#f1f5f9';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(40, 515);
          ctx.lineTo(360, 515);
          ctx.stroke();
          
          ctx.fillStyle = '#cbd5e1';
          ctx.font = '500 9px "Inter", "Segoe UI", sans-serif';
          ctx.fillText('POWERED BY SPECS PORTAL', 200, 538);
          
          // Download the image
          canvas.toBlob((blob) => {
            if (!blob) throw new Error('Failed to generate image blob');
            const blobUrl = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `GUEST_PASS_${name.replace(/\s+/g, '_')}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(blobUrl);
            
            addToast({ type: 'success', title: 'Card Exported', message: `Guest Pass downloaded for ${name}.` });
          }, 'image/png');
        } catch (canvasErr: any) {
          console.error('Canvas draw/export error:', canvasErr);
          addToast({ type: 'error', title: 'Export Failed', message: 'Failed to generate guest pass image.' });
        }
      };
      
      img.onerror = () => {
        addToast({ type: 'error', title: 'Export Failed', message: 'Failed to retrieve QR code image from server.' });
      };
      
      // Trigger image loading
      img.src = qrUrl;
      
    } catch (err: any) {
      console.error('QR Export Error:', err);
      addToast({ type: 'error', title: 'Export Failed', message: 'Failed to download QR code image.' });
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
    
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

    // --- CHECK FOR NON-MEMBER QR CODE ---
    if (decodedText.startsWith('specs-nonmember:')) {
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);

      try {
        const base64Data = decodedText.split(':')[1];
        if (!base64Data) throw new Error('Empty payload');
        
        // Decode base64 safely
        const decodedJson = atob(base64Data);
        const { name, email } = JSON.parse(decodedJson);

        if (!name) throw new Error('Missing name');

        const scanKey = `${selectedEventId}:non-member:${name}:${email || ''}:${attendanceLabel.trim()}`;
        
        // Check duplicate
        const cacheKey = 'specs_scanned_qrs';
        const oneDayMs = 24 * 60 * 60 * 1000;
        const now = Date.now();
        let cache: Record<string, number> = {};
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) {
            const tempCache = JSON.parse(raw);
            for (const [k, v] of Object.entries(tempCache)) {
              if (now - (v as number) < oneDayMs) {
                cache[k] = v as number;
              }
            }
          }
        } catch (e) {}

        if (cache[scanKey]) {
          addToast({ 
            type: 'warning', 
            title: 'Duplicate Scan', 
            message: `This non-member has already been recorded for "${attendanceLabel}" in this event.` 
          });
          const errorLog = {
            id: Math.random().toString(),
            name: name,
            time: timeStr,
            status: 'warning' as const,
            message: `Duplicate scan for "${attendanceLabel}"`
          };
          setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
          setScanFlash('warning');
          setTimeout(() => setScanFlash(null), 1000);
          return;
        }

        const recorderId = currentUserProfile && currentUserProfile.type === 'officer'
          ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
          : null;

        await api.attendance.create(selectedEventId, 'non-member', null, { name, email }, recorderId, attendanceLabel);
        
        // Cache scan
        try {
          cache[scanKey] = Date.now();
          localStorage.setItem(cacheKey, JSON.stringify(cache));
        } catch (e) {}

        playBeep();
        addToast({ type: 'success', title: 'Recorded via QR', message: `Non-Member: ${name} marked present.` });

        const successLog = {
          id: Math.random().toString(),
          name: name,
          time: timeStr,
          status: 'success' as const,
          message: `Recorded for "${attendanceLabel}"`
        };
        setFullscreenLogs(prev => [successLog, ...prev.slice(0, 9)]);
        setScanFlash('success');
        setTimeout(() => setScanFlash(null), 1000);

        if (notifyViaEmail && email) {
          (async () => {
            try {
              const selectedEvent = events.find(ev => ev.$id === selectedEventId);
              const dateStr = selectedEvent?.date_to_held 
                ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

              const formattedTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

              const htmlBody = getAttendanceHtml(
                name,
                selectedEvent?.event_name || 'Organization Event',
                dateStr,
                'Present',
                formattedTimeStr,
                window.location.origin
              );

              await functions.createExecution(
                EMAIL_FUNCTION_ID,
                JSON.stringify({
                  action: 'send_email',
                  payload: {
                    to: email,
                    subject: `Attendance Recorded: ${selectedEvent?.event_name || 'Event'}`,
                    body: htmlBody,
                    html: true
                  }
                })
              );
              addToast({ type: 'info', title: 'Notification Sent', message: `Attendance email sent to ${email}.` });
            } catch (emailErr) {
              console.error('[AdminAttendance Non-Member QR] Failed to send email:', emailErr);
            }
          })();
        }

        loadAttendanceRecords(selectedEventId);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Scan Error', message: 'Failed to parse non-member data.' });
        const errorLog = {
          id: Math.random().toString(),
          name: 'Non-Member QR',
          time: timeStr,
          status: 'error' as const,
          message: 'Failed to parse QR data'
        };
        setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
        setScanFlash('error');
        setTimeout(() => setScanFlash(null), 1000);
      }
      return;
    }

    if (!decodedText.startsWith('specs-member:')) {
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
      addToast({ type: 'warning', title: 'Invalid QR Code', message: 'Scanned QR code is not a valid SPECS member code.' });
      
      const errorLog = {
        id: Math.random().toString(),
        name: 'Invalid QR Code',
        time: timeStr,
        status: 'error' as const,
        message: 'Not a valid SPECS member code'
      };
      setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      setScanFlash('error');
      setTimeout(() => setScanFlash(null), 1000);
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

    const attendeeName = attendeeAccount ? (attendeeAccount.students as any)?.name || attendeeAccount.username : 'Unknown Member';
    const attendeeEmail = attendeeAccount ? (attendeeAccount.students as any)?.email : '';

    if (!studentProfileId) {
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
      addToast({ type: 'error', title: 'Invalid Scan', message: 'Could not resolve student profile from this QR code.' });
      
      const errorLog = {
        id: Math.random().toString(),
        name: attendeeName,
        time: timeStr,
        status: 'error' as const,
        message: 'Could not resolve student profile'
      };
      setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      setScanFlash('error');
      setTimeout(() => setScanFlash(null), 1000);
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
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
      
      addToast({ 
        type: 'warning', 
        title: 'Duplicate Scan', 
        message: `This member has already been recorded for "${attendanceLabel}" in this event.` 
      });
      
      const errorLog = {
        id: Math.random().toString(),
        name: attendeeName,
        time: timeStr,
        status: 'warning' as const,
        message: `Duplicate scan for "${attendanceLabel}"`
      };
      setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      setScanFlash('warning');
      setTimeout(() => setScanFlash(null), 1000);
      return;
    }

    setScanCooldown(true);
    setTimeout(() => setScanCooldown(false), 1200); // 1.2 second cooldown for snappy scanning

    // Prevent officer from scanning themselves
    const currentStudentId = currentUserProfile?.students 
      ? (typeof currentUserProfile.students === 'object' ? currentUserProfile.students?.$id : currentUserProfile.students)
      : null;

    if (currentStudentId && studentProfileId === currentStudentId) {
      setScanCooldown(true);
      setTimeout(() => setScanCooldown(false), 1500);
      addToast({ type: 'error', title: 'Invalid Scan', message: 'An officer cannot record their own attendance.' });
      
      const errorLog = {
        id: Math.random().toString(),
        name: attendeeName,
        time: timeStr,
        status: 'error' as const,
        message: 'Cannot record own attendance'
      };
      setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      setScanFlash('error');
      setTimeout(() => setScanFlash(null), 1000);
      return;
    }

    try {
      const recorderId = currentUserProfile && currentUserProfile.type === 'officer'
        ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
        : null;

      const attendeeType = attendeeAccount?.type || 'student';
      await api.attendance.create(selectedEventId, attendeeType, studentProfileId, null, recorderId, attendanceLabel);
      
      // Cache successful scan
      try {
        const raw = localStorage.getItem(cacheKey);
        const currentCache = raw ? JSON.parse(raw) : {};
        currentCache[scanKey] = Date.now();
        localStorage.setItem(cacheKey, JSON.stringify(currentCache));
      } catch (e) {}

      playBeep();
      addToast({ type: 'success', title: 'Recorded via QR', message: `Attendance marked for ${attendeeName}.` });

      const successLog = {
        id: Math.random().toString(),
        name: attendeeName,
        time: timeStr,
        status: 'success' as const,
        message: `Recorded for "${attendanceLabel}"`
      };
      setFullscreenLogs(prev => [successLog, ...prev.slice(0, 9)]);
      setScanFlash('success');
      setTimeout(() => setScanFlash(null), 1000);

      if (notifyViaEmail && attendeeEmail) {
        (async () => {
          try {
            const selectedEvent = events.find(ev => ev.$id === selectedEventId);
            const dateStr = selectedEvent?.date_to_held 
              ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
              : new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

            const formattedTimeStr = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

            const htmlBody = getAttendanceHtml(
              attendeeName,
              selectedEvent?.event_name || 'Organization Event',
              dateStr,
              'Present',
              formattedTimeStr,
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
      
      const errorLog = {
        id: Math.random().toString(),
        name: attendeeName,
        time: timeStr,
        status: 'error' as const,
        message: err.message || 'Failed to record attendance'
      };
      setFullscreenLogs(prev => [errorLog, ...prev.slice(0, 9)]);
      setScanFlash('error');
      setTimeout(() => setScanFlash(null), 1000);
    }
  };

  const scanHandlerRef = useRef(handleQrScanned);
  useEffect(() => {
    scanHandlerRef.current = handleQrScanned;
  }, [handleQrScanned, scanCooldown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullScreenScan) {
        setIsFullScreenScan(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullScreenScan]);

  const applyCameraControls = async (newBrightness: number, newFocusMode: string, newFocusDistance: number) => {
    try {
      const scanner = qrScannerRef.current;
      if (!scanner || !scanner.isScanning) return;
      
      const track = typeof scanner.getRunningTrack === 'function' 
        ? scanner.getRunningTrack() 
        : null;
      if (!track) return;
      
      const flatConstraints: any = {};
      const advancedConstraints: any = {};
      
      // Focus mode hardware control
      flatConstraints.focusMode = newFocusMode;
      advancedConstraints.focusMode = newFocusMode;
      
      if (newFocusMode === 'manual') {
        flatConstraints.focusDistance = newFocusDistance;
        advancedConstraints.focusDistance = newFocusDistance;
      }
      
      // Exposure/Brightness hardware control (mapped to device min/max limits)
      if (hardwareBrightnessSupported && exposureCapabilities) {
        const hwMin = exposureCapabilities.min;
        const hwMax = exposureCapabilities.max;
        const hwVal = hwMin + ((newBrightness + 2) / 4) * (hwMax - hwMin);
        
        if (brightnessMode === 'exposureCompensation') {
          flatConstraints.exposureCompensation = hwVal;
          advancedConstraints.exposureCompensation = hwVal;
        } else if (brightnessMode === 'brightness') {
          flatConstraints.brightness = hwVal;
          advancedConstraints.brightness = hwVal;
        }
      }
      
      if (Object.keys(flatConstraints).length > 0 || Object.keys(advancedConstraints).length > 0) {
        // Try applying directly on the track (bypassing any wrapper limits)
        if (typeof track.applyConstraints === 'function') {
          try {
            await track.applyConstraints({
              ...flatConstraints,
              advanced: [advancedConstraints]
            });
            console.log("[AdminAttendance Controls] Applied constraints directly on track:", flatConstraints, advancedConstraints);
          } catch (trackErr) {
            console.warn("[AdminAttendance Controls] Failed to apply constraints directly on track, trying wrapper:", trackErr);
            if (typeof scanner.applyVideoConstraints === 'function') {
              await scanner.applyVideoConstraints({
                ...flatConstraints,
                advanced: [advancedConstraints]
              });
            }
          }
        } else if (typeof scanner.applyVideoConstraints === 'function') {
          await scanner.applyVideoConstraints({
            ...flatConstraints,
            advanced: [advancedConstraints]
          });
        }
      }
    } catch (e) {
      console.warn("[AdminAttendance Controls] Failed to apply manual camera settings:", e);
    }
  };

  useEffect(() => {
    applyCameraControls(brightness, focusMode, focusDistance);
  }, [brightness, focusMode, focusDistance]);

  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;
    
    if (attendanceMode === 'qr' && selectedEventId) {
      const elementId = "qr-reader-el";
      
      const startScanner = async () => {
        try {
          html5QrCode = new Html5Qrcode(elementId);
          qrScannerRef.current = html5QrCode;
          
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
            const track = typeof html5QrCode.getRunningTrack === 'function' 
              ? html5QrCode.getRunningTrack() 
              : null;
            if (track && typeof track.getCapabilities === 'function') {
              capabilities = track.getCapabilities();
            }

            // Expose capabilities to controls
            if (capabilities.exposureCompensation) {
              setExposureCapabilities({
                min: capabilities.exposureCompensation.min || -2.0,
                max: capabilities.exposureCompensation.max || 2.0,
                step: capabilities.exposureCompensation.step || 0.1
              });
              setHardwareBrightnessSupported(true);
              setBrightnessMode('exposureCompensation');
              console.log("[AdminAttendance QR] Hardware exposure compensation supported:", capabilities.exposureCompensation);
            } else if (capabilities.brightness) {
              setExposureCapabilities({
                min: capabilities.brightness.min || 0,
                max: capabilities.brightness.max || 100,
                step: capabilities.brightness.step || 1
              });
              setHardwareBrightnessSupported(true);
              setBrightnessMode('brightness');
              console.log("[AdminAttendance QR] Hardware brightness control supported:", capabilities.brightness);
            } else {
              setExposureCapabilities({ min: -2.0, max: 2.0, step: 0.1 });
              setHardwareBrightnessSupported(false);
              setBrightnessMode('none');
              console.log("[AdminAttendance QR] Hardware exposure/brightness control NOT supported.");
            }

            if (capabilities.focusMode) {
              setFocusCapabilities(capabilities.focusMode);
            } else {
              setFocusCapabilities(['continuous', 'manual']);
            }

            if (capabilities.focusDistance) {
              setFocusDistanceCapabilities({
                min: capabilities.focusDistance.min || 0,
                max: capabilities.focusDistance.max || 1.0,
                step: capabilities.focusDistance.step || 0.05
              });
              setHardwareFocusSupported(true);
              const mid = (capabilities.focusDistance.min + capabilities.focusDistance.max) / 2;
              setFocusDistance(mid);
            } else {
              setFocusDistanceCapabilities({ min: 0, max: 1.0, step: 0.05 });
              setHardwareFocusSupported(false);
              setFocusDistance(0.2);
            }

            const advancedConstraints: any = {};

            // Request continuous focus if supported
            if (capabilities.focusMode && capabilities.focusMode.includes('continuous')) {
              advancedConstraints.focusMode = 'continuous';
              setFocusMode('continuous');
            }

            // Request continuous exposure if supported
            if (capabilities.exposureMode && capabilities.exposureMode.includes('continuous')) {
              advancedConstraints.exposureMode = 'continuous';
            }

            // Request default exposure compensation
            if (capabilities.exposureCompensation) {
              const minExp = capabilities.exposureCompensation.min || -2.0;
              const defaultBrightness = Math.max(minExp, -1.5);
              advancedConstraints.exposureCompensation = defaultBrightness;
            }
            setBrightness(0);

            if (Object.keys(advancedConstraints).length > 0) {
              await html5QrCode.applyVideoConstraints({
                advanced: [advancedConstraints]
              });
              console.log("[AdminAttendance QR] Camera initialized with optimizations:", advancedConstraints);
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
        qrScannerRef.current = null;
        setExposureCapabilities(null);
        setFocusCapabilities([]);
        setHardwareBrightnessSupported(false);
        setBrightnessMode('none');
        setFocusDistanceCapabilities(null);
        setHardwareFocusSupported(false);
        if (html5QrCode) {
          if (html5QrCode.isScanning) {
            html5QrCode.stop().then(() => {
              html5QrCode?.clear();
            }).catch(e => console.error("Error stopping scanner:", e));
          }
        }
      };
    }
  }, [attendanceMode, selectedEventId, isFullScreenScan]);

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

  const handlePrintReport = async (selectedSignatory: 'secretary' | 'asst-secretary') => {
    if (!selectedEventId) {
      addToast({ type: 'warning', title: 'Event Required', message: 'Please select an event first.' });
      return;
    }
    const selectedEvent = events.find(ev => ev.$id === selectedEventId);
    if (!selectedEvent) return;

    const rowsHtml = filteredGroupedRecords.map((group, index) => {
      const sessionsStr = group.records.map(r => {
        const timeStr = new Date(r.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return `${r.sessionLabel} (${timeStr})`;
      }).join(', ');

      return `
        <tr>
          <td>${index + 1}</td>
          <td style="font-weight: bold;">${group.name}</td>
          <td style="text-transform: capitalize;">${group.type === 'non-member' ? 'Non-Member' : group.type}</td>
          <td>${sessionsStr}</td>
        </tr>
      `;
    }).join('');

    const origin = window.location.origin;

    const getOfficerDetails = (positionCode: string, defaultTitle: string) => {
      const officer = officersList.find(o => o.position === positionCode);
      if (officer && officer.students) {
        const student = typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
        if (student?.name) {
          return {
            name: student.name.toUpperCase(),
            title: `${defaultTitle}, SPECS`
          };
        }
      }
      return {
        name: '_______________________',
        title: `${defaultTitle.toUpperCase()}, SPECS`
      };
    };

    const getSignatoryDetails = (sigId: string, officerPos: string, fallbackTitle: string) => {
      if (sigId && sigId !== 'default') {
        const customSig = signatories.find(s => s.$id === sigId);
        if (customSig) {
          return {
            name: customSig.name_officer.toUpperCase(),
            title: (customSig.position || fallbackTitle).toUpperCase()
          };
        }
      }
      const details = getOfficerDetails(officerPos, fallbackTitle);
      return {
        name: details.name.toUpperCase(),
        title: details.title.toUpperCase()
      };
    };

    let signatureHtml = '';
    const activeRows = layout.rows.filter(r => r.left || r.right);
    if (activeRows.length > 0) {
      signatureHtml = `
        <div style="margin-top: 60px; page-break-inside: avoid; text-align: left;">
          <table style="width: 100%; table-layout: fixed; border: none; border-collapse: collapse;">
            <tbody>
              ${activeRows.map((row, i) => {
                const leftS = getById(row.left);
                const rightS = getById(row.right);
                return `
                  <tr>
                    <td style="width: 50%; padding-right: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${leftS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase; margin: 0 0 35px 0; ${leftS.notation_line ? '' : 'visibility: hidden;'}">${leftS.notation_line ? leftS.notation_line.toUpperCase() : '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase; text-align: center;">${leftS.name_officer.toUpperCase()}</p>
                            ${leftS.position ? `<p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase; text-align: center;">${leftS.position.toUpperCase()}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                    <td style="width: 50%; padding-left: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${rightS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase; margin: 0 0 35px 0; ${rightS.notation_line ? '' : 'visibility: hidden;'}">${rightS.notation_line ? rightS.notation_line.toUpperCase() : '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase; text-align: center;">${rightS.name_officer.toUpperCase()}</p>
                            ${rightS.position ? `<p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase; text-align: center;">${rightS.position.toUpperCase()}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      const preparedByDetails = getSignatoryDetails(printPreparedBy, selectedSignatory, selectedSignatory === 'secretary' ? 'Executive Secretary' : 'Assistant Secretary');
      const presidentDetails = getSignatoryDetails(printAttestedBy, 'president', 'President');
      const notedDetails = (printNotedBy && printNotedBy !== 'default')
        ? (() => {
            const customSig = signatories.find(s => s.$id === printNotedBy);
            return customSig ? { name: customSig.name_officer.toUpperCase(), title: (customSig.position || 'ADVISER, SPECS').toUpperCase() } : { name: 'NICOLAS A. PURA', title: 'ADVISER, SPECS' };
          })()
        : { name: 'NICOLAS A. PURA', title: 'ADVISER, SPECS' };

      signatureHtml = `
        <div class="signature-section" style="margin-top: 60px; page-break-inside: avoid; text-align: left;">
          <div style="display: flex; flex-direction: column; gap: 40px; text-align: left; align-items: flex-start;">
            <div style="text-align: left;">
              <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">PREPARED BY:</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${preparedByDetails.name}</p>
              <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${preparedByDetails.title}</p>
            </div>
            <div style="text-align: left;">
              <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">ATTESTED BY:</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${presidentDetails.name}</p>
              <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${presidentDetails.title}</p>
            </div>
            <div style="text-align: left;">
              <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">NOTED BY:</p>
              <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${notedDetails.name}</p>
              <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${notedDetails.title}</p>
            </div>
          </div>
        </div>
      `;
    }

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Attendance Report - ${selectedEvent.event_name}</title>
          <style>
            @page {
              size: 8.5in 13in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              line-height: 1.5;
            }
            .print-header {
              position: fixed;
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 5cm;
              z-index: 1000;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-header img {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .print-footer {
              position: fixed;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 3cm;
              z-index: 1000;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-footer img {
              position: absolute !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .print-layout-table {
              width: 100%;
              border-collapse: collapse;
              border: none !important;
            }
            .print-layout-table > thead > tr > td,
            .print-layout-table > tbody > tr > td,
            .print-layout-table > tfoot > tr > td {
              padding-left: 2.54cm;
              padding-right: 2.54cm;
              border: none !important;
              background: transparent !important;
            }
            .header-spacer {
              height: 5cm;
            }
            .footer-spacer {
              height: 3cm;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            .report-title {
              text-align: center;
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            .meta-section {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 24px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px 30px;
              font-size: 13px;
            }
            .meta-item {
              margin: 0;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            .report-table th, .report-table td {
              border: 1px solid #e2e8f0;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            .report-table th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }

            @media print {
              body {
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img src="${origin}/header.png" alt="Header" />
          </div>
          <div class="print-footer">
            <img src="${origin}/footer.png" alt="Footer" />
          </div>

          <table class="print-layout-table">
            <thead>
              <tr>
                <td>
                  <div class="header-spacer"></div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <h2 class="report-title">Official Attendance Sheet Report</h2>

                  <div class="meta-section">
                    <p class="meta-item"><strong>Event Name:</strong> ${selectedEvent.event_name}</p>
                    <p class="meta-item"><strong>Location:</strong> ${selectedEvent.location || 'N/A'}</p>
                    <p class="meta-item"><strong>Event Date:</strong> ${formatDate(selectedEvent.date_to_held || '')}</p>
                  </div>

                  <table class="report-table">
                    <thead>
                      <tr>
                        <th style="width: 8%;">No.</th>
                        <th style="width: 32%;">Attendee Name</th>
                        <th style="width: 20%;">Role</th>
                        <th style="width: 40%;">Sessions Attended</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${rowsHtml || '<tr><td colspan="4" style="text-align: center; color: #94a3b8;">No attendance records found for this event.</td></tr>'}
                    </tbody>
                  </table>

                  ${signatureHtml}

                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="footer-spacer"></div>
                </td>
              </tr>
            </tfoot>
          </table>

          <script>
            let printed = false;
            function doPrint() {
              if (printed) return;
              printed = true;
              window.print();
            }
            window.onload = doPrint;
            window.onafterprint = function() {
              window.close();
            };
            setTimeout(doPrint, 500);
          </script>
        </body>
      </html>
    `;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { downloadPdfFromHtml } = await import('../../shared/utils');
      await downloadPdfFromHtml(htmlContent, `Attendance_Report_${selectedEvent.event_name.replace(/\s+/g, '_')}.pdf`, addToast);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Pop-up Blocked', message: 'Please allow pop-ups for this website to print reports.' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Group attendance records by attendee to prevent duplicate rows in the log sheet
  const groupedRecords = useMemo(() => {
    const groups: Record<string, {
      id: string;
      name: string;
      type: 'student' | 'officer' | 'non-member';
      records: { id: string; sessionLabel: string; createdAt: string }[];
    }> = {};

    attendanceRecords.forEach(record => {
      const attendeeType = record.attendee_type || 'student';
      let attendeeId = '';
      let attendeeName = '';

      if (attendeeType === 'student' || attendeeType === 'officer') {
        const profile = record.students as any;
        attendeeId = profile?.$id || record.students || '';
        attendeeName = profile?.name || 'Unknown Student';
      } else if (attendeeType === 'non-member') {
        attendeeId = `nonmember:${record.non_member_name}:${record.non_member_email || ''}`;
        attendeeName = record.non_member_name || 'Non-Member';
      }

      if (!attendeeId) return;

      if (!groups[attendeeId]) {
        groups[attendeeId] = {
          id: attendeeId,
          name: attendeeName,
          type: attendeeType,
          records: []
        };
      }

      groups[attendeeId].records.push({
        id: record.$id,
        sessionLabel: record.name_attendance || 'Attendance',
        createdAt: record.$createdAt
      });
    });

    // Sort records inside each group by createdAt (oldest first)
    Object.values(groups).forEach(g => {
      g.records.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    });

    // Sort groups alphabetically by attendee name
    return Object.values(groups).sort((a, b) => a.name.localeCompare(b.name));
  }, [attendanceRecords]);

  // Filtered grouped records based on query
  const filteredGroupedRecords = useMemo(() => {
    if (!recordFilterQuery.trim()) return groupedRecords;
    const q = recordFilterQuery.toLowerCase();
    return groupedRecords.filter(group => {
      if (group.name.toLowerCase().includes(q)) return true;
      return group.records.some(r => r.sessionLabel.toLowerCase().includes(q));
    });
  }, [groupedRecords, recordFilterQuery]);

  return (
    <div className="space-y-6">
      {/* Styles to prevent camera stretching */}
      <style>{`
        #qr-reader-el video {
          object-fit: cover !important;
          width: 100% !important;
          height: 100% !important;
        }
      `}</style>
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
                  {/* Tab Selector: Member vs Non-Member */}
                  <div className="flex border-b border-slate-100 pb-2">
                    <button
                      type="button"
                      onClick={() => setActiveTab('member')}
                      className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${
                        activeTab === 'member'
                          ? 'border-[#0d6b66] text-[#0d6b66]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      System Member
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveTab('non-member')}
                      className={`flex-1 pb-2 text-xs font-bold text-center border-b-2 transition-all ${
                        activeTab === 'non-member'
                          ? 'border-[#0d6b66] text-[#0d6b66]'
                          : 'border-transparent text-slate-400 hover:text-slate-600'
                      }`}
                    >
                      Non-Member
                    </button>
                  </div>

                  {activeTab === 'member' ? (
                    <div className="relative">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Attendee</label>
                      <input
                        type="text"
                        required={activeTab === 'member'}
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
                              onClick={() => handleSelectAutocomplete(match.id, match.name, match.email, match.type)}
                              className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 transition-colors border-b last:border-b-0 flex items-center justify-between"
                            >
                              <span>{match.name}</span>
                              <span className="text-[10px] font-semibold text-slate-400 capitalize">{match.type}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name</label>
                        <input
                          type="text"
                          required={activeTab === 'non-member'}
                          placeholder="Enter non-member name..."
                          value={nonMemberName}
                          onChange={e => setNonMemberName(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address (Optional)</label>
                        <input
                          type="email"
                          placeholder="Enter non-member email..."
                          value={nonMemberEmail}
                          onChange={e => setNonMemberEmail(e.target.value)}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                        />
                      </div>
                      
                      {/* Premium Generator / Export Utility for Non-Member QR */}
                      <button
                        type="button"
                        onClick={handleExportNonMemberQr}
                        className="w-full mt-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-[#0d6b66]/20 bg-[#0d6b66]/5 hover:bg-[#0d6b66]/10 px-3 py-2.5 text-xs font-bold text-[#0d6b66] transition-colors"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Generate & Export QR Code
                      </button>
                    </div>
                  )}

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

                  {isFullScreenScan ? (
                    <div className="aspect-square w-full rounded-xl bg-slate-900 border border-slate-800 flex flex-col items-center justify-center p-4">
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mb-1">Scanner Active</p>
                      <p className="text-[10px] text-slate-500 font-medium text-center">Webcam is currently running in full-screen overlay mode.</p>
                      <button
                        type="button"
                        onClick={() => setIsFullScreenScan(false)}
                        className="mt-3 px-3 py-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white text-[10px] font-bold transition-all shadow-xs"
                      >
                        Minimize
                      </button>
                    </div>
                  ) : (
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

                      {/* Button to enter full screen */}
                      <button
                        type="button"
                        onClick={() => setIsFullScreenScan(true)}
                        className="absolute bottom-3 right-3 z-20 bg-slate-900/80 hover:bg-slate-900 border border-slate-700/80 text-white p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md transition-all active:scale-95 animate-pulse"
                        title="Enter Full Screen Scanner"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 8V4m0 0h4M4 4l5 5m11-5h-4m4 0v4m0-4l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                        </svg>
                        Full Screen
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Attendance Logs sheet */}
            <div className="lg:col-span-2 space-y-3">
              <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="border-b border-slate-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Attendance Logs</h3>
                    <button
                      onClick={() => setPrintModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                      title="Print Official Attendance Sheet"
                    >
                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                      Print Sheet
                    </button>
                  </div>
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
                          <th className="px-6 py-3 text-left w-1/3">Attendee</th>
                          <th className="px-6 py-3 text-left">Sessions Attended</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredGroupedRecords.map(group => {
                          return (
                            <tr key={group.id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-slate-900">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span>{group.name}</span>
                                  {group.type === 'student' && (
                                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700">
                                      Student
                                    </span>
                                  )}
                                  {group.type === 'officer' && (
                                    <span className="inline-flex items-center rounded-full bg-blue-50 border border-blue-100 px-2 py-0.5 text-[9px] font-semibold text-blue-700">
                                      Officer
                                    </span>
                                  )}
                                  {group.type === 'non-member' && (
                                    <span className="inline-flex items-center rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[9px] font-semibold text-slate-600">
                                      Non-Member
                                    </span>
                                  )}
                                </div>
                              </td>
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

      {/* Signatory Row-Based Drag-and-Drop Organizer */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs mt-6">
        <button
          onClick={() => setShowSignatorySection(!showSignatorySection)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Signatory Layout — Attendance Sheet
          </h3>
          {showSignatorySection ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>

        {showSignatorySection && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Each row has a <strong>Left</strong> and <strong>Right</strong> slot. A row can be left-only, right-only, or both.
              Drag signatories from pool into slots. Layouts are saved per report type locally.
            </p>

            {/* Available pool */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Available Signatories</h4>
              <div
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => handleDropOnSlot(e, 'available')}
                className="min-h-[60px] border-2 border-dashed rounded-xl p-3 flex flex-wrap gap-2 transition-colors border-slate-200 dark:border-slate-700"
              >
                {availableSignatories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 px-2">
                    {signatories.length === 0 ? 'No signatories in the database.' : 'All signatories are placed in rows.'}
                  </p>
                ) : (
                  availableSignatories.map(s => <DraggableChip key={s.$id} signatory={s} />)
                )}
              </div>
            </div>

            {/* Rows */}
            {layout.rows.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Signature Rows</h4>
                {layout.rows.map((row, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {/* Row label */}
                    <span className="text-[10px] font-bold text-slate-400 w-12 text-right pt-4 flex-shrink-0">
                      Row {idx + 1}
                    </span>

                    {/* Left slot */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Left</span>
                      </div>
                      <SlotDropZone rowIdx={idx} side="left" signatory={getById(row.left)} />
                    </div>

                    {/* Right slot */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wide">Right</span>
                      </div>
                      <SlotDropZone rowIdx={idx} side="right" signatory={getById(row.right)} />
                    </div>

                    {/* Remove row button */}
                    <button
                      onClick={() => removeRow(idx)}
                      className="flex-shrink-0 mt-6 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Remove this row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add row + reset */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={addRow}
                className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6b66] dark:text-emerald-400 hover:underline"
              >
                <Plus className="h-3 w-3" /> Add Row
              </button>
              {layout.rows.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Reset the signatory layout?')) {
                      saveLayout({ rows: [] });
                    }
                  }}
                  className="text-xs font-medium text-red-500 hover:underline"
                >
                  Reset Layout
                </button>
              )}
            </div>
          </div>
        )}
      </div>

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

      {/* Signatory Selection Modal */}
      {printModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in zoom-in-95 max-h-[90vh] overflow-y-auto">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0d6b66] border border-teal-100 mb-4">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Print Attendance Sheet</h3>
              <p className="text-xs text-slate-500 text-center mb-5 font-medium">Select the officer signatory who prepared this report.</p>
              
              <div className="w-full space-y-4 mb-6">
                {/* Signatory Selection Dropdowns */}
                <div className="text-left space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prepared By Officer Role</label>
                    <div className="grid grid-cols-2 gap-3 mb-2">
                      <button
                        type="button"
                        onClick={() => setPrintSignatory('secretary')}
                        className={`rounded-lg py-1.5 text-xs font-semibold border transition-all ${
                          printSignatory === 'secretary'
                            ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Secretary
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintSignatory('asst-secretary')}
                        className={`rounded-lg py-1.5 text-xs font-semibold border transition-all ${
                          printSignatory === 'asst-secretary'
                            ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                            : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Asst. Secretary
                      </button>
                    </div>
                    
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Prepared By Custom Signatory</label>
                    <select
                      value={printPreparedBy}
                      onChange={(e) => {
                        setPrintPreparedBy(e.target.value);
                        localStorage.setItem('specs_attendance_print_prepared_by', e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0d6b66] outline-none"
                    >
                      <option value="default">Default Officer Details</option>
                      {signatories.map(s => (
                        <option key={s.$id} value={s.$id}>{s.name_officer} ({s.position || 'No position'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Attested By</label>
                    <select
                      value={printAttestedBy}
                      onChange={(e) => {
                        setPrintAttestedBy(e.target.value);
                        localStorage.setItem('specs_attendance_print_attested_by', e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0d6b66] outline-none"
                    >
                      <option value="default">Default Officer Details (President)</option>
                      {signatories.map(s => (
                        <option key={s.$id} value={s.$id}>{s.name_officer} ({s.position || 'No position'})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-1">Noted By</label>
                    <select
                      value={printNotedBy}
                      onChange={(e) => {
                        setPrintNotedBy(e.target.value);
                        localStorage.setItem('specs_attendance_print_noted_by', e.target.value);
                      }}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-800 focus:border-[#0d6b66] outline-none"
                    >
                      <option value="default">Default Officer Details (Adviser)</option>
                      {signatories.map(s => (
                        <option key={s.$id} value={s.$id}>{s.name_officer} ({s.position || 'No position'})</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setPrintModalOpen(false);
                    setTimeout(() => {
                      handlePrintReport(printSignatory);
                    }, 50);
                  }}
                  className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors"
                >
                  {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Report'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Full Screen QR Scanner Portal */}
      {isFullScreenScan && createPortal(
        (() => {
          const cssBrightness = brightness < 0 
            ? ((brightness + 2) / 2) * 100 
            : 100 + brightness * 50;
          
          return (
            <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center w-screen h-screen select-none animate-in fade-in">
              {/* Camera Viewport Element */}
              <div 
                id="qr-reader-el" 
                className="absolute inset-0 w-full h-full object-cover" 
                style={{ filter: `brightness(${cssBrightness}%)` }}
              />
              
              {/* Target Box Overlay */}
              <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center z-10 bg-transparent">
                <div className="w-64 h-64 border-4 border-dashed border-[#0d6b66] rounded-xl relative shadow-md">
                  <div className="absolute left-0 right-0 h-0.5 bg-red-500 opacity-60 animate-pulse top-1/2" />
                </div>
                <p className="text-[10px] text-white/90 font-bold uppercase mt-4 tracking-wider bg-slate-900/60 px-3 py-1 rounded-full backdrop-blur-xs shadow-xs">
                  Align QR code inside box
                </p>
              </div>

              {/* Top Bar for status and buttons */}
              <div className="absolute top-4 left-4 right-4 z-50 flex items-center justify-between pointer-events-none">
                {/* Left Side: Attendance Scanner title */}
                <div className="bg-slate-900/80 border border-slate-800/80 px-4 py-2 rounded-xl text-left shadow-lg pointer-events-auto backdrop-blur-xs max-w-[150px] sm:max-w-[200px] md:max-w-none">
                  <h4 className="text-[10px] md:text-xs font-black uppercase text-teal-400 tracking-wider truncate">Attendance Scanner</h4>
                  <p className="text-[9px] md:text-[10px] text-slate-300 font-semibold truncate">{attendanceLabel}</p>
                </div>
                
                {/* Right Side: Action buttons */}
                <div className="flex items-center gap-2 pointer-events-auto">
                  <button 
                    onClick={() => setShowCameraControls(prev => !prev)}
                    className={`bg-slate-900/80 hover:bg-slate-800/90 border rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2 shadow-lg transition-all ${
                      showCameraControls ? 'border-teal-500/50 text-teal-300' : 'border-slate-800 text-white'
                    }`}
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
                    </svg>
                    <span className="hidden md:inline">{showCameraControls ? 'Hide Controls' : 'Adjust Camera'}</span>
                  </button>

                  <button 
                    onClick={() => setIsFullScreenScan(false)}
                    className="bg-slate-900/80 hover:bg-slate-800/90 border border-slate-800 text-white rounded-xl px-3 py-2 text-xs font-bold flex items-center gap-2 shadow-lg transition-all"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <span>Exit</span>
                  </button>
                </div>
              </div>

              {/* Right Side Manual Camera Controls */}
              {showCameraControls && (
                <div className="absolute top-1/2 -translate-y-1/2 right-4 md:right-6 z-40 bg-slate-955/95 backdrop-blur-md border border-slate-800 rounded-xl p-5 text-white shadow-2xl flex flex-col gap-4 max-w-[90vw] w-72 max-h-[70vh] overflow-y-auto animate-in slide-in-from-right duration-200">
                  <div className="border-b border-slate-800 pb-2 flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-slate-400 text-left">Camera Adjust</span>
                    <button 
                      onClick={() => setShowCameraControls(false)}
                      className="text-slate-450 hover:text-white p-0.5 rounded-md hover:bg-slate-900 transition-colors"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* Brightness / Exposure Slider */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-300">Exposure / Brightness</span>
                      <span className="font-mono text-teal-400 font-bold">{brightness > 0 ? `+${brightness.toFixed(1)}` : brightness.toFixed(1)}</span>
                    </div>
                    <input
                      type="range"
                      min="-2.0"
                      max="2.0"
                      step="0.1"
                      value={brightness}
                      onChange={(e) => setBrightness(parseFloat(e.target.value))}
                      className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0d6b66] focus:outline-none"
                    />
                    <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                      <span>DARK</span>
                      <span>NORMAL</span>
                      <span>BRIGHT</span>
                    </div>
                  </div>

                  {/* Focus Mode Selector */}
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-slate-300 text-left">Autofocus Mode</label>
                    <div className="grid grid-cols-2 gap-2">
                      {['continuous', 'manual'].map((mode) => {
                        const isSelected = focusMode === mode;
                        return (
                          <button
                            key={mode}
                            type="button"
                            onClick={() => setFocusMode(mode)}
                            className={`rounded-lg py-2 text-[10px] font-bold border transition-all ${
                              isSelected
                                ? 'border-[#0d6b66] bg-teal-500/10 text-teal-300 font-extrabold'
                                : 'border-slate-800 bg-slate-900/40 text-slate-450 hover:bg-slate-900/60'
                            }`}
                          >
                            {mode === 'continuous' ? 'Continuous' : 'Manual Focus'}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Focus Distance Slider (Only active if manual focus mode is selected) */}
                  {focusMode === 'manual' && (
                    <div className="space-y-2 animate-in slide-in-from-top-1 duration-200">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-300">Focus Distance</span>
                        <span className="font-mono text-teal-400 font-bold">{focusDistance.toFixed(2)}m</span>
                      </div>
                      <input
                        type="range"
                        min={focusDistanceCapabilities?.min ?? 0.0}
                        max={focusDistanceCapabilities?.max ?? 1.0}
                        step={focusDistanceCapabilities?.step ?? 0.01}
                        value={focusDistance}
                        onChange={(e) => setFocusDistance(parseFloat(e.target.value))}
                        className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-[#0d6b66] focus:outline-none"
                      />
                      <div className="flex justify-between text-[9px] text-slate-500 font-bold">
                        <span>CLOSE (MACRO)</span>
                        <span>FAR (INFINITY)</span>
                      </div>
                    </div>
                  )}

                  <div className="text-[9px] text-slate-505 leading-normal text-left">
                    * Controls apply hardware constraints where supported, falling back to real-time software filters for maximum device compatibility.
                  </div>
                </div>
              )}

              {/* Collapsible Live scan log stream */}
              <div className={`absolute bottom-4 left-4 right-4 md:right-auto md:left-6 z-40 max-w-sm md:w-80 bg-slate-950/85 backdrop-blur-md border border-slate-850 rounded-xl p-3 text-white shadow-2xl flex flex-col transition-all duration-300 ${
                isLiveFeedCollapsed ? 'max-h-[72px]' : 'max-h-[30vh]'
              }`}>
                {/* Header */}
                <div 
                  onClick={() => setIsLiveFeedCollapsed(prev => !prev)}
                  className="flex items-center justify-between border-b border-slate-850 pb-1.5 mb-1.5 cursor-pointer select-none"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-slate-400">Live Scan Feed</span>
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    {fullscreenLogs.length > 0 && (
                      <span className="text-[9px] bg-slate-850 text-slate-300 px-1.5 py-0.5 rounded-full font-bold">
                        {fullscreenLogs.length}
                      </span>
                    )}
                    <svg 
                      className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-300 ${isLiveFeedCollapsed ? '' : 'rotate-180'}`} 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor" 
                      strokeWidth={2.5}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto space-y-1.5 text-left scrollbar-none">
                  {fullscreenLogs.length === 0 ? (
                    <div className="text-center text-xs text-slate-500 py-3">Waiting for scans...</div>
                  ) : isLiveFeedCollapsed ? (
                    /* Render ONLY the single most recent log in collapsed state */
                    (() => {
                      const latestLog = fullscreenLogs[0];
                      return (
                        <div className="flex items-center justify-between text-[11px] bg-white/5 border border-white/5 rounded-lg px-2 py-1.5 animate-in fade-in duration-200">
                          <div className="flex flex-col truncate pr-2">
                            <span className="font-bold text-slate-100 truncate">{latestLog.name}</span>
                            <span className={`text-[10px] truncate ${
                              latestLog.status === 'success' ? 'text-emerald-400' : latestLog.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                            }`}>
                              {latestLog.message}
                            </span>
                          </div>
                          <span className="text-[9px] text-slate-505 font-mono flex-shrink-0">{latestLog.time}</span>
                        </div>
                      );
                    })()
                  ) : (
                    /* Render full list of logs in expanded state */
                    fullscreenLogs.map(log => (
                      <div key={log.id} className="flex flex-col text-[11px] bg-white/5 border border-white/5 rounded-lg p-2 transition-all">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-100">{log.name}</span>
                          <span className="text-[9px] text-slate-505 font-mono">{log.time}</span>
                        </div>
                        <span className={`mt-0.5 text-[10px] ${
                          log.status === 'success' ? 'text-emerald-400' : log.status === 'warning' ? 'text-amber-400' : 'text-rose-400'
                        }`}>
                          {log.message}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Color Splash screen flash */}
              {scanFlash && (
                <div className={`absolute inset-0 pointer-events-none z-30 flex items-center justify-center transition-opacity duration-350 animate-pulse ${
                  scanFlash === 'success' ? 'bg-emerald-500/10 border-4 border-emerald-500' : scanFlash === 'warning' ? 'bg-amber-500/10 border-4 border-amber-500' : 'bg-red-500/10 border-4 border-red-500'
                }`} />
              )}
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};

export default AdminAttendance;
