import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc } from '../../types/database';

const StudentEvents: React.FC = () => {
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'upcoming' | 'past'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [detailEvent, setDetailEvent] = useState<EventDoc | null>(null);

  const { addToast } = useToast();

  const loadEvents = async () => {
    try {
      setLoading(true);
      const res = await cachedApi.events.listAll({ orderDesc: 'date_to_held' }, 2 * 60 * 1000);
      setEvents(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load events.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    return events.filter(e => {
      const eventDate = new Date(e.date_to_held || '');
      const isEnded = e.event_ended;
      const isPast = eventDate < now;

      const matchesStatus = filter === 'upcoming'
        ? !isEnded && !isPast
        : filter === 'past'
          ? isEnded || isPast
          : true;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q ? e.event_name?.toLowerCase().includes(q) : true;

      return matchesStatus && matchesSearch;
    });
  }, [events, filter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Events Schedule</h1>
          <p className="text-sm text-slate-500 mt-1">Browse upcoming and past organization events.</p>
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

          <div className="relative max-w-xs">
            <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-2 text-xs text-slate-950 focus:border-[#0d6b66] outline-none"
            />
          </div>
        </div>
      </div>

      {/* Grid container */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredEvents.length === 0 ? (
        <EmptyState
          title="No Events Found"
          description="We couldn't find any events matching your selected filter parameters."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEvents.map(event => {
            const eventDate = new Date(event.date_to_held || '');
            const isEnded = event.event_ended;
            const isPast = eventDate < new Date();
            
            const day = eventDate.getDate();
            const month = eventDate.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
            const imageUrl = event.image_file ? api.files.getFilePreview(event.image_file, 400, 250) : null;

            return (
              <div
                key={event.$id}
                onClick={() => setDetailEvent(event)}
                className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs hover:shadow-md hover:-translate-y-1 transition-all duration-200 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="relative h-48 border-b">
                    {imageUrl ? (
                      <img src={imageUrl} alt={event.event_name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-50 flex items-center justify-center text-slate-350">
                        <span className="text-xs font-bold uppercase tracking-widest">SPECS Org</span>
                      </div>
                    )}
                    
                    {/* Date card float */}
                    <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-xs rounded-lg px-2.5 py-1 text-center shadow-md">
                      <span className="block text-lg font-bold text-slate-900 leading-none">{day}</span>
                      <span className="block text-[10px] font-bold text-[#0d6b66] uppercase mt-0.5 tracking-wide">{month}</span>
                    </div>

                    {/* Status marker */}
                    <span className={`absolute top-4 right-4 inline-flex items-center rounded-full px-2.5 py-0.5 text-[9px] font-bold uppercase tracking-wider shadow-sm text-white ${
                      isEnded || isPast ? 'bg-slate-500' : 'bg-emerald-600'
                    }`}>
                      {isEnded || isPast ? 'Ended' : 'Upcoming'}
                    </span>
                  </div>

                  <div className="p-5 space-y-2">
                    <h3 className="font-bold text-slate-800 text-base line-clamp-1">{event.event_name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold uppercase">
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span>{eventDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-2">{event.description || 'No description provided.'}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 mt-4 border-t border-slate-50">
                  <button className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-700 py-2 text-xs font-semibold hover:bg-slate-100 transition-colors flex items-center justify-center gap-1.5">
                    View Details
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Enhanced detail overlay modal */}
      {detailEvent && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in animate-fade-in" onClick={() => setDetailEvent(null)}>
          <div
            className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col"
            onClick={e => e.stopPropagation()}
          >
            {/* Header image cover banner */}
            <div className="relative h-60 w-full bg-slate-100 border-b">
              {detailEvent.image_file ? (
                <img
                  src={api.files.getFilePreview(detailEvent.image_file, 800, 400)}
                  alt={detailEvent.event_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-355 bg-slate-50 font-bold uppercase tracking-widest text-slate-400">
                  SPECS Org Banner
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/55 via-transparent to-transparent" />
              <button
                onClick={() => setDetailEvent(null)}
                className="absolute top-4 right-4 bg-black/25 text-white hover:bg-black/50 p-1.5 rounded-full transition-colors"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              <div className="absolute bottom-4 left-4 text-white flex items-center gap-3">
                <svg className="h-5 w-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div>
                  <h4 className="font-bold text-sm leading-tight">
                    {detailEvent.date_to_held ? formatDate(new Date(detailEvent.date_to_held), { month: 'long', day: 'numeric', year: 'numeric' }) : ''}
                  </h4>
                  <span className="text-xs opacity-85">
                    {detailEvent.date_to_held ? new Date(detailEvent.date_to_held).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            </div>

            {/* Content Body details */}
            <div className="p-6 space-y-4 overflow-y-auto max-h-[350px]">
              <div className="flex justify-between items-center gap-4 flex-wrap">
                <h3 className="text-lg font-bold text-slate-900">{detailEvent.event_name}</h3>
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold border ${
                  detailEvent.event_ended ? 'bg-slate-50 text-slate-500 border-slate-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {detailEvent.event_ended ? 'Event Ended' : 'Active Scheduled'}
                </span>
              </div>

              {/* Description */}
              <p className="text-sm text-slate-600 whitespace-pre-wrap leading-relaxed">
                {detailEvent.description || 'No description provided.'}
              </p>

              {/* Related links */}
              {detailEvent.related_links && detailEvent.related_links.length > 0 && (
                <div className="space-y-2 border-t pt-4">
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide">Related Links</span>
                  <div className="flex flex-col gap-2">
                    {detailEvent.related_links.map((link, idx) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 text-xs font-semibold text-[#0d6b66] hover:text-[#0b5c58] hover:underline bg-slate-50 p-2 rounded border border-slate-100 break-all"
                      >
                        <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
                        </svg>
                        {link}
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default StudentEvents;
