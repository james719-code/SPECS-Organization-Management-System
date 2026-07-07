import React, { useState, useEffect } from 'react';
import { api } from '../../shared/api';
import { useToast } from '../../components/ui/Toast';
import { Plus, Trash2, Loader2, Calendar, Users, Edit3, X } from 'lucide-react';

interface NonOrgEvent {
  $id: string;
  name: string;
  description?: string;
  date_event?: string;
  no_participants?: number;
  $createdAt: string;
  $updatedAt: string;
}

const AdminNonOrgEvents: React.FC = () => {
  const { addToast } = useToast();
  const [events, setEvents] = useState<NonOrgEvent[]>([]);
  const [loading, setLoading] = useState(true);

  // CRUD form state
  const [showForm, setShowForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<NonOrgEvent | null>(null);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formDate, setFormDate] = useState('');
  const [formParticipants, setFormParticipants] = useState('');
  const [saving, setSaving] = useState(false);

  const loadEvents = async () => {
    setLoading(true);
    try {
      const res = await api.eventNonOrg.list();
      setEvents(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load non-org events.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, []);

  const openCreate = () => {
    setEditingEvent(null);
    setFormName('');
    setFormDescription('');
    setFormDate('');
    setFormParticipants('');
    setShowForm(true);
  };

  const openEdit = (ev: NonOrgEvent) => {
    setEditingEvent(ev);
    setFormName(ev.name);
    setFormDescription(ev.description || '');
    setFormDate(ev.date_event ? ev.date_event.split('T')[0] : '');
    setFormParticipants(ev.no_participants ? String(ev.no_participants) : '');
    setShowForm(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setSaving(true);
    try {
      const data = {
        name: formName.trim(),
        description: formDescription.trim() || undefined,
        date_event: formDate ? new Date(formDate).toISOString() : undefined,
        no_participants: formParticipants ? parseInt(formParticipants, 10) : undefined,
      };

      if (editingEvent) {
        await api.eventNonOrg.update(editingEvent.$id, data);
        addToast({ type: 'success', title: 'Updated', message: 'Non-org event updated.' });
      } else {
        await api.eventNonOrg.create(data);
        addToast({ type: 'success', title: 'Created', message: 'Non-org event created.' });
      }
      setShowForm(false);
      await loadEvents();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to save event.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (eventId: string, eventName: string) => {
    if (!window.confirm(`Delete "${eventName}"? This cannot be undone.`)) return;
    try {
      await api.eventNonOrg.delete(eventId);
      setEvents(prev => prev.filter(e => e.$id !== eventId));
      addToast({ type: 'success', title: 'Deleted', message: 'Non-org event deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete event.' });
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Non-Org Events</h1>
          <p className="text-sm text-slate-500 mt-1">Manage external event listings (outside official SPECS events).</p>
        </div>
        <button
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors shadow-sm"
        >
          <Plus className="h-4 w-4" />
          Add Event
        </button>
      </div>

      {/* Events List */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xs overflow-hidden">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-[#0d6b66]" />
          </div>
        ) : events.length === 0 ? (
          <div className="text-center py-12 text-slate-500">
            <Calendar className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold">No non-org events</p>
            <p className="text-xs mt-1">Click "Add Event" to create the first entry.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {events.map(ev => (
              <div key={ev.$id} className="p-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white">{ev.name}</h3>
                    {ev.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{ev.description}</p>
                    )}
                    <div className="flex flex-wrap items-center gap-3 mt-2">
                      <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDate(ev.date_event)}
                      </span>
                      {ev.no_participants != null && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                          <Users className="h-3 w-3" />
                          {ev.no_participants} participant{ev.no_participants !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => openEdit(ev)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-[#0d6b66] hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors"
                      title="Edit"
                    >
                      <Edit3 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ev.$id, ev.name)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs p-4 pt-12 overflow-y-auto animate-in fade-in" onClick={() => setShowForm(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">
                {editingEvent ? 'Edit Event' : 'Add Non-Org Event'}
              </h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Event Name *</label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={e => setFormName(e.target.value)}
                  placeholder="e.g., Company Tech Talk"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  value={formDescription}
                  onChange={e => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="Brief description of the event..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Event Date</label>
                  <input
                    type="date"
                    value={formDate}
                    onChange={e => setFormDate(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">No. of Participants</label>
                  <input
                    type="number"
                    min="1"
                    value={formParticipants}
                    onChange={e => setFormParticipants(e.target.value)}
                    placeholder="e.g., 50"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2.5 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 justify-end">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving || !formName.trim()}
                  className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-sm font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingEvent ? 'Update' : 'Create'} Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminNonOrgEvents;
