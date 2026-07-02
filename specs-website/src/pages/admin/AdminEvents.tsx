import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc } from '../../types/database';
import { Calendar, Users, Clock, Plus, Trash2, X, Loader2, RotateCw, User, MapPin, ExternalLink } from 'lucide-react';

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
 
  // Optional parameters states
  const [eventCollab, setEventCollab] = useState('');
  const [relatedLinks, setRelatedLinks] = useState<{ name: string; url: string }[]>([]);
  const [eventLocation, setEventLocation] = useState('');
  const [eventRatingLinks, setEventRatingLinks] = useState('');

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
      const res = await cachedApi.events.listAll({ orderDesc: 'date_to_held', includeArchived: true }, isRefresh ? 0 : 2 * 60 * 1000);
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
      const validLinks = relatedLinks.filter(l => l.url.trim() !== '');
      const relatedLinksUrls = validLinks.map(l => l.url.trim());
      const relatedLinksNames = validLinks.map(l => l.name.trim() || 'Link');

      const newEvent = await api.events.create({
        event_name: eventName,
        description: eventDesc,
        date_to_held: new Date(eventDate).toISOString(),
        image_file: imageFileId,
        event_ended: false,
        added_by: currentUser?.$id || 'system',
        collab: eventCollab.split(',').map(s => s.trim()).filter(Boolean),
        related_links: relatedLinksUrls,
        meaning: relatedLinksNames,
        location: eventLocation.trim() || null,
        rating_links: eventRatingLinks.trim() || null
      });

      addToast({ type: 'success', title: 'Success', message: `Event "${eventName}" created successfully!` });
      setIsCreateOpen(false);
      
      // Reset form fields
      setEventName('');
      setEventDesc('');
      setEventDate('');
      setEventImageFile(null);
      setImagePreviewUrl(null);
      setEventCollab('');
      setRelatedLinks([]);
      setEventLocation('');
      setEventRatingLinks('');
      
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
        return !isEnded && !isPast && !event.archived;
      }
      if (filter === 'past') {
        return (isEnded || isPast) && !event.archived;
      }
      if (filter === 'archived') {
        return !!event.archived;
      }
      return !event.archived;
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
            <button
              onClick={() => setFilter('archived')}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold transition-colors ${filter === 'archived' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Archived
            </button>
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
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
                        <Calendar className="h-6 w-6 opacity-60" />
                        <span className="text-[9px] font-bold tracking-widest uppercase">SPECS</span>
                      </div>
                    )}

                    {/* Event Details */}
                    <div className="flex-1 w-full space-y-1">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-base font-bold text-slate-800 line-clamp-1">{event.event_name}</h3>
                          {event.archived && (
                            <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200">
                              Archived
                            </span>
                          )}
                          {isEnded ? (
                            <span className="inline-flex items-center rounded-full bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-500 border border-slate-200">
                              Ended
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                              Upcoming
                            </span>
                          )}
                        </div>

                        {/* Top quick actions */}
                        <div className="flex items-center gap-1.5">
                          {event.archived ? (
                            <button
                              disabled={actionLoading}
                              onClick={() => handleToggleArchive(event, false)}
                              className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-amber-600 hover:bg-amber-50 hover:border-amber-200 transition-colors shadow-xs"
                            >
                              Restore
                            </button>
                          ) : (
                            <>
                              {!isEnded && (
                                <button
                                  disabled={actionLoading}
                                  onClick={() => setEndConfirm({ open: true, event })}
                                  className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-emerald-600 hover:bg-emerald-50 hover:border-emerald-200 transition-colors shadow-xs"
                                >
                                  End
                                </button>
                              )}
                              <button
                                disabled={actionLoading}
                                onClick={() => handleToggleArchive(event, true)}
                                className="rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs"
                              >
                                Archive
                              </button>
                            </>
                          )}
                          <button
                            disabled={actionLoading}
                            onClick={() => setDeleteConfirm({ open: true, event })}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors shadow-xs"
                            title="Delete Event"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {/* Meta information */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5" />
                          {formatDate(event.date_to_held, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3.5 w-3.5" />
                          Posted by {creatorName}
                        </span>
                        {event.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3.5 w-3.5" />
                            {event.location}
                          </span>
                        )}
                      </div>

                      <p className="text-sm text-slate-500 mt-2 line-clamp-2">{event.description || 'No description provided.'}</p>
                      
                      {/* Additional params view */}
                      {(event.collab?.length > 0 || event.related_links?.length > 0) && (
                        <div className="flex flex-wrap gap-2 pt-2 items-center">
                          {event.collab?.map((col: string, idx: number) => (
                            <span key={idx} className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full text-[9px] font-bold border border-teal-100">
                              {col}
                            </span>
                          ))}
                          {event.related_links?.map((link: string, idx: number) => {
                            const label = event.meaning && event.meaning[idx] ? event.meaning[idx] : 'Link';
                            return (
                              <a key={idx} href={link} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-[10px] font-bold text-[#0d6b66] hover:underline">
                                {label} <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            );
                          })}
                        </div>
                      )}
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
        <Plus className="h-6 w-6" />
      </button>

      {/* Create Event Dialog Modal */}
      {isCreateOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsCreateOpen(false)}>
          <div
            className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Create New Event</h2>
              <button onClick={() => setIsCreateOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
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

              {/* Optional Parameters form fields */}
              <div className="border-t pt-4 space-y-4">
                <span className="block text-xs font-bold text-[#0d6b66] uppercase tracking-wide">Additional Details (Optional)</span>
                
                <div>
                  <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">Collaborations (Comma-separated)</label>
                  <input
                    type="text"
                    placeholder="e.g. IT Club, Google DSC"
                    value={eventCollab}
                    onChange={e => setEventCollab(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide">
                      Related Links
                    </label>
                    <button
                      type="button"
                      onClick={() => setRelatedLinks([...relatedLinks, { name: '', url: '' }])}
                      className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0d6b66] hover:text-[#0b5c58] transition-colors"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      Add Link
                    </button>
                  </div>

                  {relatedLinks.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No related links added yet.</p>
                  ) : (
                    <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                      {relatedLinks.map((link, idx) => (
                        <div key={idx} className="flex gap-2 items-center">
                          <input
                            type="text"
                            placeholder="Name (e.g. RSVP Form)"
                            value={link.name}
                            onChange={e => {
                              const newLinks = [...relatedLinks];
                              newLinks[idx].name = e.target.value;
                              setRelatedLinks(newLinks);
                            }}
                            className="flex-1 min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                          />
                          <input
                            type="url"
                            placeholder="URL (e.g. https://...)"
                            value={link.url}
                            onChange={e => {
                              const newLinks = [...relatedLinks];
                              newLinks[idx].url = e.target.value;
                              setRelatedLinks(newLinks);
                            }}
                            className="flex-[2] min-w-0 rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setRelatedLinks(relatedLinks.filter((_, i) => i !== idx));
                            }}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 hover:border-red-100 hover:bg-red-50 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">Location</label>
                    <input
                      type="text"
                      placeholder="e.g. Main Campus"
                      value={eventLocation}
                      onChange={e => setEventLocation(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-550 dark:text-slate-400 uppercase tracking-wide mb-1">Rating Link</label>
                    <input
                      type="text"
                      placeholder="e.g. Feedback Form URL"
                      value={eventRatingLinks}
                      onChange={e => setEventRatingLinks(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-900 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                    />
                  </div>
                </div>
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
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {submitting ? 'Creating...' : 'Create Event'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
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
