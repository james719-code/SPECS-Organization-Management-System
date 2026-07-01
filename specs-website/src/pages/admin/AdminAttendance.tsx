import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw, Loader2, Check } from 'lucide-react';
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

const AdminAttendance: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [students, setStudents] = useState<AccountDoc[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceDoc[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Student search autocomplete states
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{ id: string; name: string; email?: string } | null>(null);
  const [autocompleteResults, setAutocompleteResults] = useState<{ id: string; name: string; email?: string }[]>([]);
  const [attendanceLabel, setAttendanceLabel] = useState('Morning Check-in');
  const [notifyViaEmail, setNotifyViaEmail] = useState(true);
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

      const [eventsRes, studentsRes] = await Promise.all([
        cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'student' }, isRefresh ? 0 : 5 * 60 * 1000)
      ]);

      setEvents(eventsRes.documents);
      setStudents(studentsRes.documents);

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
      // Create record (officer id is null, admin session)
      await api.attendance.create(selectedEventId, selectedStudent.id, 'admin', attendanceLabel);
      addToast({ type: 'success', title: 'Recorded', message: `Attendance marked for ${selectedStudent.name}.` });
      
      // Dispatch email notification if toggled and email is present
      if (notifyViaEmail && selectedStudent.email) {
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
            selectedStudent.name,
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
                to: selectedStudent.email,
                subject: `Attendance Recorded: ${selectedEvent?.event_name || 'Event'}`,
                body: htmlBody,
                html: true
              }
            })
          );
          addToast({ type: 'info', title: 'Notification Sent', message: `Attendance email sent to ${selectedStudent.email}.` });
        } catch (emailErr: any) {
          console.error('[AdminAttendance] Failed to send email notification:', emailErr);
        }
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

  // Filtered records
  const filteredRecords = useMemo(() => {
    if (!recordFilterQuery.trim()) return attendanceRecords;
    const q = recordFilterQuery.toLowerCase();
    return attendanceRecords.filter(record => {
      const profile = record.students as any;
      const name = profile?.name || '';
      const label = record.name_attendance || '';
      return name.toLowerCase().includes(q) || label.toLowerCase().includes(q);
    });
  }, [attendanceRecords, recordFilterQuery]);

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
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Event</label>
          <span className="text-xs text-slate-400 font-medium">{events.length} events available</span>
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-slate-400 italic">No events found. Please add events first.</p>
        ) : (
          <div className="flex flex-wrap gap-2.5 max-h-60 overflow-y-auto pr-1">
            {events.map(event => {
              const isSelected = selectedEventId === event.$id;
              return (
                <button
                  key={event.$id}
                  type="button"
                  onClick={() => setSelectedEventId(event.$id)}
                  className={`group flex items-center gap-2.5 px-4 py-2.5 rounded-full border text-left transition-all duration-200 active:scale-[0.98] ${
                    isSelected
                      ? 'border-[#0d6b66] bg-[#0d6b66] text-white shadow-sm shadow-[#0d6b66]/10'
                      : 'border-slate-200 bg-slate-50/50 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full transition-all duration-200 ${
                      isSelected
                        ? 'bg-white text-[#0d6b66]'
                        : 'bg-white border border-slate-300 text-transparent group-hover:border-slate-400'
                    }`}
                  >
                    {isSelected ? (
                      <Check className="h-3 w-3 stroke-[3]" />
                    ) : (
                      <div className="h-1.5 w-1.5 rounded-full bg-slate-300 group-hover:bg-slate-400" />
                    )}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className={`text-xs font-semibold truncate max-w-[180px] sm:max-w-[240px] leading-tight transition-colors ${
                      isSelected ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'
                    }`}>
                      {event.event_name}
                    </span>
                    <span className={`text-[9px] mt-0.5 transition-colors ${
                      isSelected ? 'text-white/80' : 'text-slate-400'
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
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Record Attendance</h3>
              <form onSubmit={handleAddAttendance} className="space-y-4">
                <div className="relative">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Student</label>
                  <input
                    type="text"
                    required
                    placeholder="Search student name..."
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
                    Notify student via email
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
                  <SkeletonTable rows={4} cols={4} />
                ) : filteredRecords.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-sm">
                    No matching attendance records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="px-6 py-3 text-left">Student</th>
                          <th className="px-6 py-3 text-left">Session Label</th>
                          <th className="px-6 py-3 text-left">Timestamp</th>
                          <th className="px-6 py-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 text-sm text-slate-700">
                        {filteredRecords.map(record => {
                          const profile = record.students as any;
                          const name = profile?.name || 'Unknown Student';
                          return (
                            <tr key={record.$id} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-6 py-3.5 font-medium text-slate-900">{name}</td>
                              <td className="px-6 py-3.5 text-slate-500">{record.name_attendance || 'Attendance'}</td>
                              <td className="px-6 py-3.5 text-xs text-slate-400">{formatDateTime(record.$createdAt)}</td>
                              <td className="px-6 py-3.5 text-right">
                                <button
                                  onClick={() => setDeleteConfirm({ open: true, id: record.$id })}
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 p-1.5 rounded-lg border border-transparent hover:border-red-100 transition-colors"
                                  title="Delete record"
                                >
                                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
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
