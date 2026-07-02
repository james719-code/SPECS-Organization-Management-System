import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { formatDateTime } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { account, databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS, COLLECTION_ID_STUDENTS } from '../../shared/constants';
import type { AttendanceDoc } from '../../types/database';

const StudentAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventLookup, setEventLookup] = useState<Record<string, string>>({});
  const [selectedRecord, setSelectedRecord] = useState<AttendanceDoc | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [officerDetails, setOfficerDetails] = useState<{ name: string; email: string } | null>(null);
  const [loadingOfficer, setLoadingOfficer] = useState(false);
  const { addToast } = useToast();

  const handleViewDetails = async (record: AttendanceDoc) => {
    setSelectedRecord(record);
    setIsModalOpen(true);
    setOfficerDetails(null);

    const officerObj = record.officers;
    if (!officerObj) return;

    // Resolve the student profile ID of the officer
    let officerStudentId = '';
    if (typeof officerObj === 'object') {
      officerStudentId = typeof officerObj.students === 'object'
        ? officerObj.students?.$id || ''
        : (officerObj.students || '');
    } else {
      officerStudentId = officerObj;
    }

    if (!officerStudentId) return;

    try {
      setLoadingOfficer(true);
      const doc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_STUDENTS, officerStudentId);
      const name = doc.name && doc.name !== 'N/A' ? doc.name : 'Administrator';
      const email = doc.email && doc.email !== 'N/A' ? doc.email : 'specs.parsu@gmail.com';
      setOfficerDetails({ name, email });
    } catch (e) {
      console.warn('[StudentAttendance] Failed to resolve officer details:', e);
      setOfficerDetails({ name: 'Administrator', email: 'specs.parsu@gmail.com' });
    } finally {
      setLoadingOfficer(false);
    }
  };

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      
      // Get student profile ID
      const accountDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
      const studentId = accountDoc.students?.$id || accountDoc.students;

      console.log("[StudentAttendance] Logged-in Auth ID (Account ID):", user.$id);
      console.log("[StudentAttendance] Resolved Student Profile ID:", studentId);
      
      if (!studentId) {
        setLoading(false);
        return;
      }

      const [attendanceRes, eventsRes] = await Promise.all([
        api.attendance.listForStudent(studentId),
        cachedApi.events.listAll({ limit: 500 }, 5 * 60 * 1000)
      ]);

      setAttendance(attendanceRes.documents);

      // Build event ID to event name lookup map
      const lookup: Record<string, string> = {};
      eventsRes.documents.forEach((e: any) => {
        lookup[e.$id] = e.event_name;
      });
      setEventLookup(lookup);

    } catch (err: any) {
      console.error('Failed to load student attendance:', err);
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load attendance history.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAttendance();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Attendance Record</h1>
        <p className="text-sm text-slate-500 mt-1">Track your participation in organization events and activities.</p>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={4} />
      ) : attendance.length === 0 ? (
        <EmptyState
          title="No Attendance Records"
          description="You haven't checked in to any events yet."
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table view */}
          <div className="hidden sm:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Date Recorded</th>
                    <th className="px-6 py-3 text-left">Event Name</th>
                    <th className="px-6 py-3 text-left">Details</th>
                    <th className="px-6 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {attendance.map(record => {
                    const eventId = record.events ? (typeof record.events === 'object' ? record.events.$id : record.events) : '';
                    const eventName = eventLookup[eventId] || 'General Activity';
                    return (
                      <tr 
                        key={record.$id} 
                        onClick={() => handleViewDetails(record)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                        title="Click to view scanner details"
                      >
                        <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                          {formatDateTime(record.$createdAt)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900 group-hover:text-[#0d6b66] transition-colors">{eventName}</td>
                        <td className="px-6 py-3.5 text-slate-500">{record.name_attendance || 'General Check-in'}</td>
                        <td className="px-6 py-3.5 text-center">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Present
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card list view */}
          <div className="block sm:hidden space-y-3">
            {attendance.map(record => {
              const eventId = record.events ? (typeof record.events === 'object' ? record.events.$id : record.events) : '';
              const eventName = eventLookup[eventId] || 'General Activity';
              return (
                <div 
                  key={record.$id} 
                  onClick={() => handleViewDetails(record)}
                  className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs hover:border-[#0d6b66] transition-colors cursor-pointer"
                  title="Click to view scanner details"
                >
                  <div className="flex justify-between items-start gap-3 border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm hover:text-[#0d6b66] transition-colors">{eventName}</h3>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Present
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date Logged:</span>
                      <span className="font-medium text-slate-800">{new Date(record.$createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Time Logged:</span>
                      <span className="font-medium text-slate-800">
                        {new Date(record.$createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Check-in:</span>
                      <span className="font-medium text-slate-800">{record.name_attendance || 'General'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scanner Details Modal */}
      {isModalOpen && selectedRecord && createPortal(
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-in fade-in" 
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" 
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-md font-bold text-slate-800">Attendance Scan Details</h2>
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="text-slate-400 hover:text-slate-700 transition-colors cursor-pointer"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Event</span>
                <p className="text-sm font-bold text-slate-900">
                  {eventLookup[selectedRecord.events ? (typeof selectedRecord.events === 'object' ? selectedRecord.events.$id : selectedRecord.events) : ''] || 'General Activity'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Session</span>
                  <p className="text-xs font-semibold text-slate-700">{selectedRecord.name_attendance || 'General Check-in'}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Status</span>
                  <div>
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      Present
                    </span>
                  </div>
                </div>
              </div>
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Recorded At</span>
                <p className="text-xs text-slate-700 font-medium">{formatDateTime(selectedRecord.$createdAt)}</p>
              </div>
              <div className="border-t pt-4 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Scanned By</span>
                {loadingOfficer ? (
                  <div className="flex items-center gap-2 py-1">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-[#0d6b66]" />
                    <span className="text-xs text-slate-400">Loading scanner details...</span>
                  </div>
                ) : selectedRecord.officers ? (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-[#0d6b66]/10 flex items-center justify-center font-bold text-[#0d6b66] text-xs">
                      {((officerDetails?.name || 'Administrator').split(' ').map((n: string) => n[0]).join('').substring(0, 2).toUpperCase())}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">{officerDetails?.name || 'Administrator'}</p>
                      <p className="text-[10px] text-slate-500 font-mono">{officerDetails?.email || 'specs.parsu@gmail.com'}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-8 rounded-full bg-indigo-50 flex items-center justify-center font-bold text-indigo-600 text-xs">
                      AD
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Administrator</p>
                      <p className="text-[10px] text-slate-500 font-mono">specs.parsu@gmail.com</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="px-6 py-3 bg-slate-50 border-t flex justify-end">
              <button 
                onClick={() => setIsModalOpen(false)} 
                className="rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 font-semibold px-4 py-2 text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentAttendance;
