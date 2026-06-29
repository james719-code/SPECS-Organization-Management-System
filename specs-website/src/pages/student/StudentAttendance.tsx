import React, { useState, useEffect } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatDateTime } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { account, databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../../shared/constants';
import type { AttendanceDoc } from '../../types/database';

const StudentAttendance: React.FC = () => {
  const [attendance, setAttendance] = useState<AttendanceDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [eventLookup, setEventLookup] = useState<Record<string, string>>({});
  const { addToast } = useToast();

  const loadAttendance = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      
      // Get student profile ID
      const accountDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
      const studentId = accountDoc.students?.$id || accountDoc.students;
      
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
                      <tr key={record.$id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">
                          {formatDateTime(record.$createdAt)}
                        </td>
                        <td className="px-6 py-3.5 font-bold text-slate-900">{eventName}</td>
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
                <div key={record.$id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start gap-3 border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm">{eventName}</h3>
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
                      <span className="font-medium text-slate-850">{record.name_attendance || 'General'}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentAttendance;
