import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { copyToClipboard } from '../../shared/utils';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonList } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { AccountDoc } from '../../types/database';

interface AnnouncementDraft {
  id: string;
  subject: string;
  message: string;
  recipients: 'all' | 'students' | 'officers';
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'admin_announcements_drafts';

const AdminAnnouncements: React.FC = () => {
  const [drafts, setDrafts] = useState<AnnouncementDraft[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<'all' | 'students' | 'officers'>('all');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  
  // Recipient Emails caching
  const [studentEmails, setStudentEmails] = useState<string[]>([]);
  const [officerEmails, setOfficerEmails] = useState<string[]>([]);
  const [allEmails, setAllEmails] = useState<string[]>([]);

  // Deletion confirm
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; draftId: string | null }>({ open: false, draftId: null });

  const { addToast } = useToast();

  const loadDrafts = () => {
    try {
      setLoading(true);
      const stored = localStorage.getItem(STORAGE_KEY);
      setDrafts(stored ? JSON.parse(stored) : []);
    } catch (e) {
      console.error('Failed to load drafts:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchEmails = async () => {
    try {
      const res = await cachedApi.users.listAllAccounts({}, 5 * 60 * 1000);
      const accounts = res.documents;
      const all = accounts.map(a => a.email).filter(Boolean) as string[];
      const students = accounts.filter(a => a.type === 'student').map(a => a.email).filter(Boolean) as string[];
      const officers = accounts.filter(a => a.type === 'officer').map(a => a.email).filter(Boolean) as string[];

      setAllEmails(all);
      setStudentEmails(students);
      setOfficerEmails(officers);
    } catch (err) {
      console.error('Failed to load user emails for composer:', err);
    }
  };

  useEffect(() => {
    loadDrafts();
    fetchEmails();
  }, []);

  const handleSaveDraft = () => {
    if (!subject.trim() && !message.trim()) {
      addToast({ type: 'warning', title: 'Empty Draft', message: 'Add a subject or body first.' });
      return;
    }

    try {
      let updatedDrafts = [...drafts];
      const time = new Date().toISOString();

      if (composerDraftId) {
        // Edit existing draft
        updatedDrafts = updatedDrafts.map(d =>
          d.id === composerDraftId
            ? { ...d, subject, message, recipients, updatedAt: time }
            : d
        );
      } else {
        // Create new draft
        const newDraft: AnnouncementDraft = {
          id: `draft-${Date.now()}`,
          subject,
          message,
          recipients,
          createdAt: time,
          updatedAt: time
        };
        updatedDrafts.unshift(newDraft);
      }

      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedDrafts));
      setDrafts(updatedDrafts);
      setIsComposerOpen(false);
      resetForm();
      addToast({ type: 'success', title: 'Draft Saved', message: 'Draft saved in local storage.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to write draft to storage.' });
    }
  };

  const handleDeleteDraft = () => {
    if (!deleteConfirm.draftId) return;
    try {
      const updated = drafts.filter(d => d.id !== deleteConfirm.draftId);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      setDrafts(updated);
      setDeleteConfirm({ open: false, draftId: null });
      addToast({ type: 'success', title: 'Deleted', message: 'Announcement draft removed.' });
    } catch (e) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to delete draft.' });
    }
  };

  const handleOpenEdit = (draft: AnnouncementDraft) => {
    setComposerDraftId(draft.id);
    setSubject(draft.subject);
    setMessage(draft.message);
    setRecipients(draft.recipients);
    setIsComposerOpen(true);
  };

  const handleOpenComposeAction = (type: 'all' | 'students' | 'officers') => {
    resetForm();
    setRecipients(type);
    setIsComposerOpen(true);
  };

  const resetForm = () => {
    setComposerDraftId(null);
    setSubject('');
    setMessage('');
    setRecipients('all');
  };

  // Build target emails
  const targetEmails = useMemo(() => {
    if (recipients === 'students') return studentEmails;
    if (recipients === 'officers') return officerEmails;
    return allEmails;
  }, [recipients, studentEmails, officerEmails, allEmails]);

  const handleCopyToClipboard = async () => {
    if (!subject || !message) {
      addToast({ type: 'warning', title: 'Copy Failed', message: 'Subject and body cannot be empty.' });
      return;
    }
    const formattedText = `Subject: ${subject}\n\n${message}`;
    const success = await copyToClipboard(formattedText);
    if (success) {
      addToast({ type: 'success', title: 'Copied', message: 'Formatted message copied to clipboard.' });
    } else {
      addToast({ type: 'error', title: 'Error', message: 'Failed to copy text.' });
    }
  };

  const handleOpenEmailClient = () => {
    if (!subject || !message) {
      addToast({ type: 'warning', title: 'Cannot Open Mail', message: 'Subject and body cannot be empty.' });
      return;
    }

    const bccList = targetEmails.join(',');
    const mailtoUrl = `mailto:?bcc=${encodeURIComponent(bccList)}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    window.open(mailtoUrl, '_blank');
    addToast({ type: 'info', title: 'Opening Email Client', message: `Pre-populating Bcc list with ${targetEmails.length} recipients.` });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compose & Share</h1>
          <p className="text-sm text-slate-500 mt-1">Draft announcements, copy to clipboard, or fire mail clients.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setIsComposerOpen(true);
          }}
          className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm px-4 py-2.5 shadow-sm transition-colors"
        >
          New Announcement
        </button>
      </div>

      {/* Quick Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div
          onClick={() => handleOpenComposeAction('all')}
          className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all text-center space-y-2"
        >
          <div className="h-12 w-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center mx-auto text-[#0d6b66]">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-5.603-3.735A.75.75 0 008 10.9v1.4a.75.75 0 00.118.4l5.603 3.735A.75.75 0 0015 16v-1.4a.75.75 0 00-.118-.4z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-800">Email All Users</h3>
          <p className="text-xs text-slate-400">Draft updates for all community members</p>
        </div>

        <div
          onClick={() => handleOpenComposeAction('students')}
          className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all text-center space-y-2"
        >
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
              <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-800">Email Students</h3>
          <p className="text-xs text-slate-400">Compose announcement for students only</p>
        </div>

        <div
          onClick={() => handleOpenComposeAction('officers')}
          className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all text-center space-y-2"
        >
          <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 014 0m-3 8a3 3 0 100-6 3 3 0 000 6z" />
            </svg>
          </div>
          <h3 className="font-bold text-slate-800">Email Officers</h3>
          <p className="text-xs text-slate-400">Send updates to assigned officer list</p>
        </div>
      </div>

      {/* Saved Drafts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <svg className="h-5 w-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Saved Drafts
          </h2>
          <span className="inline-flex items-center rounded-full bg-slate-50 border px-2.5 py-0.5 text-xs font-semibold text-slate-500">
            {drafts.length} drafts
          </span>
        </div>

        {loading ? (
          <SkeletonList items={3} />
        ) : drafts.length === 0 ? (
          <EmptyState
            title="No Drafts Saved"
            description="Locally composed announcements will render here."
          />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {drafts.map(draft => (
              <div key={draft.id} className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between hover:shadow-md transition-all duration-200">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <span className="inline-flex items-center rounded-full bg-[#0d6b66]/10 px-2.5 py-0.5 text-[10px] font-semibold text-[#0d6b66] border border-[#0d6b66]/20">
                      Draft
                    </span>
                    <button
                      onClick={() => setDeleteConfirm({ open: true, draftId: draft.id })}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete draft"
                    >
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-800 line-clamp-1">{draft.subject || 'Untitled'}</h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{draft.message || 'Empty body'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex flex-col gap-2.5">
                  <div className="flex justify-between text-[10px] text-slate-400 font-semibold uppercase">
                    <span>To: {draft.recipients}</span>
                    <span>{new Date(draft.updatedAt).toLocaleDateString()}</span>
                  </div>
                  <button
                    onClick={() => handleOpenEdit(draft)}
                    className="w-full rounded-lg bg-slate-50 border border-slate-200 text-slate-700 py-1.5 text-xs font-semibold hover:bg-slate-100 transition-colors"
                  >
                    Edit Draft
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Compose Announcement Modal */}
      {isComposerOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsComposerOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Compose Announcement</h2>
              <button onClick={() => setIsComposerOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recipients</label>
                <select
                  value={recipients}
                  onChange={e => setRecipients(e.target.value as any)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                >
                  <option value="all">All Users ({allEmails.length} active)</option>
                  <option value="students">All Students ({studentEmails.length} active)</option>
                  <option value="officers">All Officers ({officerEmails.length} active)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Subject / Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Important Announcement: System Update"
                  value={subject}
                  onChange={e => setSubject(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Message Body</label>
                <textarea
                  required
                  placeholder="Announcements content details..."
                  rows={6}
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:border-[#0d6b66] outline-none"
                />
                <span className="text-[10px] text-slate-400 mt-1 block text-right font-medium">
                  {message.length} characters
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:justify-between gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Save Draft
                </button>
                
                <div className="flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setIsPreviewOpen(true)}
                    className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm px-4 py-2.5 shadow-xs transition-colors"
                  >
                    Copy Text
                  </button>
                  <button
                    type="button"
                    onClick={handleOpenEmailClient}
                    className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm px-4 py-2.5 shadow-xs transition-colors"
                  >
                    Open Mail
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {isPreviewOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsPreviewOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50">
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Announcement Preview</h2>
              <button onClick={() => setIsPreviewOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Subject / Title</span>
                <h4 className="text-base font-bold text-slate-900">{subject || '(Empty subject)'}</h4>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-2 max-h-60 overflow-y-auto">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Message Body</span>
                <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{message || '(Empty content)'}</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t flex justify-end">
              <button
                onClick={() => setIsPreviewOpen(false)}
                 className="rounded-lg bg-slate-900 text-white font-semibold text-xs px-4 py-2 hover:bg-slate-800"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Draft confirm */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, draftId: null })}
        onConfirm={handleDeleteDraft}
        title="Delete Announcement Draft"
        message="Are you sure you want to remove this draft? This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
      />
    </div>
  );
};

export default AdminAnnouncements;
