import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc } from '../../types/database';

const AdminEvents: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});

  // Create Modal State
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [eventName, setEventName] = useState('');
  const [eventDesc, setEventDesc] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventImageFile, setEventImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Confirm Actions
  const [endConfirm, setEndConfirm] = useState<{ open: boolean; event: EventDoc | null }>({ open: false, event: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; event: EventDoc | null }>({ open: false, event: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      // Fetch all events
      const res = await cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000);
      setEvents(res.documents);

      // Fetch accounts to build user lookup for creator names
      const accountsRes = await cachedApi.users.listAllAccounts({}, isRefresh ? 0 : 5 * 60 * 1000);
      const lookup: Record<string, string> = {};
      accountsRes.documents.forEach((acc: any) => {
        lookup[acc.$id] = acc.username || acc.name || 'Staff';
      });
      setUserLookup(lookup);

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Events list updated successfully.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load events.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEventImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
    } else {
      setEventImageFile(null);
      setImagePreviewUrl(null);
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventImageFile) {
      addToast({ type: 'warning', title: 'Required', message: 'Please select an event banner image.' });
      return;
    }

    setSubmitting(true);
    try {
      // 1. Upload Event Image
      const uploadRes = await api.files.uploadEventImage(eventImageFile);
      const imageFileId = uploadRes.$id;

      // 2. Fetch current logged-in user to store as creator
      const currentUser = await cachedApi.users.getCurrent();

      // 3. Create Event document
      const newEvent = await api.events.create({
        event_name: eventName,
        description: eventDesc,
        date_to_held: new Date(eventDate).toISOString(),
        image_file: imageFileId,
        event_ended: false,
        added_by: currentUser?.$id || 'system',
      });

      addToast({ type: 'success', title: 'Success', message: `Event "${eventName}" created successfully!` });
      setIsCreateOpen(false);
      
      // Reset form fields
      setEventName('');
      setEventDesc('');
      setEventDate('');
      setEventImageFile(null);
      setImagePreviewUrl(null);
      
      // Reload event listing
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create event.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleMarkEnded = async () => {
    if (!endConfirm.event) return;
    const event = endConfirm.event;
    setActionLoading(true);
    try {
      await api.events.markEnded(event.$id);
      addToast({ type: 'success', title: 'Success', message: `Event "${event.event_name}" is now marked as ended.` });
      setEndConfirm({ open: false, event: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to end event.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteEvent = async () => {
    if (!deleteConfirm.event) return;
    const event = deleteConfirm.event;
    setActionLoading(true);
    try {
      // Delete image asset if exists
      if (event.image_file) {
        try {
          await api.files.deleteEventImage(event.image_file);
        } catch (e) {
          console.warn('Failed to delete associated event image:', e);
        }
      }
      // Delete event doc
      await api.events.delete(event.$id);
      addToast({ type: 'success', title: 'Success', message: `Event "${event.event_name}" has been deleted.` });
      setDeleteConfirm({ open: false, event: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete event.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter(event => {
      const eventDate = new Date(event.date_to_held || '');
      const isEnded = event.event_ended;
      const isPast = eventDate < now;

      if (filter === 'upcoming') {
        return !isEnded && !isPast;
      }
      if (filter === 'past') {
        return isEnded || isPast;
      }
      return true;
    });
  }, [events, filter]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events Timeline</h1>
          <p className="text-sm text-slate-500 mt-1">Manage upcoming and past SPECS events</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-0.5 shadow-sm">
            <button
              onClick={() => setFilter('all')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'all' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              All
            </button>
            <button
              onClick={() => setFilter('upcoming')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'upcoming' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Upcoming
            </button>
            <button
              onClick={() => setFilter('past')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'past' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Past
            </button>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <svg className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
            </svg>
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Timeline Wrapper */}
      {loading ? (
        <div className="space-y-4">
          <SkeletonCard />
          <SkeletonCard />
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description={filter === 'upcoming' ? 'There are no upcoming organization events scheduled.' : filter === 'past' ? 'No past events found in the record.' : 'No events found.'}
          action={{
            label: 'Schedule First Event',
            onClick: () => setIsCreateOpen(true)
          }}
        />
      ) : (
        <div className="relative pl-6 sm:pl-8 border-l border-slate-200 space-y-6 ml-4">
          {filteredEvents.map(event => {
            const eventDate = new Date(event.date_to_held || '');
            const isEnded = event.event_ended;
            const isPast = eventDate < new Date();
            const creatorName = userLookup[event.added_by || ''] || 'SPECS Admin';
            
            // Get event image URL via preview API
            const imageUrl = event.image_file ? api.files.getFilePreview(event.image_file, 150, 100) : null;

            return (
              <div key={event.$id} className="relative group">
                {/* Timeline dot */}
                <div className={`absolute -left-[35px] sm:-left-[43px] top-1 flex h-6 w-6 items-center justify-center rounded-full border-4 border-slate-50 ${isEnded ? 'bg-slate-400' : 'bg-[#0d6b66]'} shadow-sm`}>
                  <div className="h-1.5 w-1.5 rounded-full bg-white" />
                </div>

                <div className={`rounded-xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm hover:shadow-md transition-all duration-200 ${isEnded ? 'opacity-85' : ''}`}>
                  <div className="flex flex-col sm:flex-row gap-4 items-start">
                    {/* Event Banner preview */}
                    {imageUrl ? (
                      <img
                        src={imageUrl}
                        alt={event.event_name || 'Event image'}
                        className="w-full sm:w-28 h-20 rounded-lg object-cover border border-slate-100 shadow-inner flex-shrink-0"
                      />
                    ) : (
                      <div className="w-full sm:w-28 h-20 rounded-lg bg-slate-50 border border-slate-200 flex flex-col items-center justify-center gap-1 text-slate-400 flex-shrink-0">
                        <svg className="h-6 w-6 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span className="text-[9px] font-bold tracking-widest uppercase">SPECS</span>
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="flex-1 w-full space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800 line-clamp-1">{event.event_name}</h3>
                          {isEnded ? (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                              Ended
                            </span>
                          ) : isPast ? (
                            <span className="inline-flex items-center rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-medium text-amber-700 border border-amber-200">
                              Past - Not Ended
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1.5">
                          {!isEnded && (
                            <button
                              onClick={() => setEndConfirm({ open: true, event })}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-xs"
                            >
                              End
                            </button>
                          )}
                          <button
                            onClick={() => setDeleteConfirm({ open: true, event })}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors shadow-xs"
                            title="Delete Event"
                          >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </div>

                      {/* Meta information */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(eventDate, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                          Posted by {creatorName}
                        </span>
                      </div>

                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{event.description || 'No description provided.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Event FAB Button */}
      <button
        onClick={() => setIsCreateOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
        title="Schedule Event"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
        </svg>
      </button>

      {/* Create Event Dialog Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsCreateOpen(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Create New Event</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Assembly 2026"
                  value={eventName}
                  onChange={e => setEventName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  placeholder="Brief description of event details..."
                  rows={3}
                  value={eventDesc}
                  onChange={e => setEventDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  required
                  value={eventDate}
                  onChange={e => setEventDate(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Banner Image</label>
                <input
                  type="file"
                  required
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                />
                {imagePreviewUrl && (
                  <div className="mt-3 rounded-lg overflow-hidden border border-slate-100 max-h-36 shadow-xs flex justify-center bg-slate-50">
                    <img src={imagePreviewUrl} alt="Preview" className="object-contain max-h-36" />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Modals */}
      <ConfirmModal
        isOpen={endConfirm.open}
        onClose={() => setEndConfirm({ open: false, event: null })}
        onConfirm={handleMarkEnded}
        title="Mark Event as Ended"
        message={`Are you sure you want to end "${endConfirm.event?.event_name}"? This stops new student RSVP and marks the timeline item as Ended.`}
        confirmLabel="Mark Ended"
        variant="info"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, event: null })}
        onConfirm={handleDeleteEvent}
        title="Delete Event Record"
        message={`Are you sure you want to delete "${deleteConfirm.event?.event_name}"? All associated attendance sheets and data will be affected. This cannot be undone.`}
        confirmLabel="Delete Event"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminEvents;
