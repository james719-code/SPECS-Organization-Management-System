import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { cachedApi, api } from '../../shared/api';
import { Mail, GraduationCap, Shield, Clock, Trash2, X, Send } from 'lucide-react';
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
  recipients: 'all' | 'students' | 'officers' | 'specific';
  createdAt: string;
  updatedAt: string;
}

const STORAGE_KEY = 'admin_announcements_drafts';

const getAccountEmail = (a: AccountDoc): string => {
  if (!a) return '';
  if (a.email) return a.email;
  if (a.studentSnapshot?.email) return a.studentSnapshot.email;
  if (a.adminSnapshot?.email) return a.adminSnapshot.email;
  if (a.officerSnapshot?.email) return a.officerSnapshot.email;
  if (a.type === 'admin' && a.admins && typeof a.admins === 'object') {
    return (a.admins as any).email || '';
  }
  if ((a.type === 'student' || a.type === 'officer') && a.students && typeof a.students === 'object') {
    return (a.students as any).email || '';
  }
  return '';
};

const getAccountName = (a: AccountDoc): string => {
  if (!a) return '';
  if (a.displayName) return a.displayName;
  if (a.studentSnapshot?.name) return a.studentSnapshot.name;
  if (a.adminSnapshot?.fullName) return a.adminSnapshot.fullName;
  if (a.type === 'admin' && a.admins && typeof a.admins === 'object') {
    return (a.admins as any).fullName || a.username || '';
  }
  if ((a.type === 'student' || a.type === 'officer') && a.students && typeof a.students === 'object') {
    return (a.students as any).name || a.username || '';
  }
  return a.username || '';
};

const getAnnouncementHtml = (subject: string, message: string, senderName: string, senderEmail: string): string => {
  const formattedBody = message
    .split('\n\n')
    .map(para => {
      if (!para.trim()) return '';
      const formattedPara = para.replace(/\n/g, '<br />');
      return `<p style="margin-bottom: 16px; line-height: 1.6; color: #334155; font-size: 15px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">${formattedPara}</p>`;
    })
    .filter(Boolean)
    .join('');

  const dateStr = new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });

  return `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${subject}</title>
  </head>
  <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f8fafc; padding: 48px 16px;">
      <tr>
        <td align="center">
          <table border="0" cellpadding="0" cellspacing="0" width="100%" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px -2px rgba(0, 0, 0, 0.05), 0 2px 8px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0; text-align: left;">
            <!-- Header Section -->
            <tr>
              <td style="padding: 32px 32px 16px 32px; background-color: #ffffff;">
                <div style="margin-bottom: 16px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 13px; color: #64748b; line-height: 1.6;">
                  <span style="font-weight: 700; color: #0d6b66;">From:</span> ${senderName} (${senderEmail})<br />
                  <span style="font-weight: 700; color: #0d6b66;">Date:</span> ${dateStr}
                </div>
                <h1 style="color: #0f172a; margin: 0; font-size: 22px; font-weight: 800; line-height: 1.3; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; letter-spacing: -0.02em;">
                  ${subject}
                </h1>
              </td>
            </tr>
            <!-- Divider -->
            <tr>
              <td style="padding: 0 32px;">
                <div style="border-bottom: 1px solid #f1f5f9; width: 100%;"></div>
              </td>
            </tr>
            <!-- Message Body -->
            <tr>
              <td style="padding: 24px 32px 32px 32px; background-color: #ffffff;">
                <div style="color: #334155; font-size: 15px; line-height: 1.65; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
                  ${formattedBody}
                </div>
                
                <!-- Action Button -->
                <div style="margin-top: 32px; text-align: left;">
                  <a href="${window.location.origin}" style="background-color: #0d6b66; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600; display: inline-block; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                    Access SPECS Portal
                  </a>
                </div>
              </td>
            </tr>
            <!-- Footer -->
            <tr>
              <td style="background-color: #f8fafc; padding: 24px 32px; text-align: left; border-top: 1px solid #f1f5f9;">
                <p style="color: #64748b; margin: 0; font-size: 12px; line-height: 1.6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  Sent via the <strong>SPECS Portal</strong>. Please do not reply directly to this message.
                </p>
                <p style="color: #94a3b8; margin: 6px 0 0 0; font-size: 11px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
                  &copy; ${new Date().getFullYear()} SPECS. All rights reserved.
                </p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
  `;
};

const AdminAnnouncements: React.FC = () => {
  const [drafts, setDrafts] = useState<AnnouncementDraft[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerDraftId, setComposerDraftId] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [recipients, setRecipients] = useState<'all' | 'students' | 'officers' | 'specific'>('all');

  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'write' | 'preview'>('write');
  
  // Custom Selection state
  const [accountsList, setAccountsList] = useState<AccountDoc[]>([]);
  const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [senderEmail, setSenderEmail] = useState('noreply@specs.org');
  const [senderName, setSenderName] = useState('SPECS Administrator');
  
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
      console.log('Composer fetched accounts:', accounts);
      setAccountsList(accounts);
    } catch (err: any) {
      console.error('Failed to load user emails for composer:', err);
      addToast({ type: 'error', title: 'Loading Recipients Failed', message: err.message || 'Failed to retrieve database accounts.' });
    }
  };

  useEffect(() => {
    loadDrafts();
    fetchEmails();
    
    // Fetch current user details to populate sender email and name
    cachedApi.users.getCurrent().then(user => {
      if (user?.email) {
        setSenderEmail(user.email);
      }
      if (user?.name) {
        setSenderName(user.name);
      }
    }).catch(err => console.warn('Failed to load current user details:', err));
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

  const handleOpenComposeAction = (type: 'all' | 'students' | 'officers' | 'specific') => {
    resetForm();
    setRecipients(type);
    setIsComposerOpen(true);
  };

  const resetForm = () => {
    setComposerDraftId(null);
    setSubject('');
    setMessage('');
    setRecipients('all');
    setSelectedUserIds([]);
    setUserSearchQuery('');
    setActiveTab('write');
  };

  // Filtered accounts based on search query in specific select modal
  const filteredSearchAccounts = useMemo(() => {
    if (!userSearchQuery) return accountsList;
    const query = userSearchQuery.toLowerCase();
    return accountsList.filter(acc => 
      acc.username?.toLowerCase().includes(query) || 
      getAccountEmail(acc).toLowerCase().includes(query) ||
      getAccountName(acc).toLowerCase().includes(query) ||
      acc.type?.toLowerCase().includes(query)
    );
  }, [accountsList, userSearchQuery]);

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

  const handleSendAnnouncement = async () => {
    if (!subject || !message) {
      addToast({ type: 'warning', title: 'Cannot Publish', message: 'Subject and body cannot be empty.' });
      return;
    }

    if (recipients === 'specific' && selectedUserIds.length === 0) {
      addToast({ type: 'warning', title: 'No Recipients Selected', message: 'Please select at least one user from the list.' });
      return;
    }
    if (recipients === 'specific' && selectedUserIds.length > 100) {
      addToast({ type: 'warning', title: 'Too Many Recipients', message: 'Specific in-app announcements are limited to 100 accounts.' });
      return;
    }

    setSending(true);
    try {
      await api.notifications.publish({
        title: subject.trim(),
        body: message.trim(),
        audience: recipients,
        userIds: recipients === 'specific' ? selectedUserIds : undefined,
        priority: 'normal'
      });
      setIsComposerOpen(false);
      resetForm();
      addToast({ type: 'success', title: 'Published In-App', message: 'The announcement is now available in recipients’ notification inboxes.' });
    } catch (err: any) {
      console.error('Failed to publish announcement:', err);
      addToast({ type: 'error', title: 'Publish Failed', message: err.message || 'Failed to publish in-app announcement.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Compose & Share</h1>
          <p className="text-sm text-slate-500 mt-1">Save local drafts and publish role-based updates to the in-app inbox.</p>
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
            <Mail className="h-6 w-6" />
          </div>
                  <h3 className="font-bold text-slate-800">Notify All Users</h3>
          <p className="text-xs text-slate-400">Draft updates for all community members</p>
        </div>

        <div
          onClick={() => handleOpenComposeAction('students')}
          className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all text-center space-y-2"
        >
          <div className="h-12 w-12 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center mx-auto text-emerald-600">
            <GraduationCap className="h-6 w-6" />
          </div>
                  <h3 className="font-bold text-slate-800">Notify Students</h3>
          <p className="text-xs text-slate-400">Compose announcement for students only</p>
        </div>

        <div
          onClick={() => handleOpenComposeAction('officers')}
          className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md transition-all text-center space-y-2"
        >
          <div className="h-12 w-12 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center mx-auto text-blue-600">
            <Shield className="h-6 w-6" />
          </div>
                  <h3 className="font-bold text-slate-800">Notify Officers</h3>
          <p className="text-xs text-slate-400">Publish updates to the officer inbox</p>
        </div>
      </div>

      {/* Saved Drafts */}
      <div className="space-y-4">
        <div className="flex justify-between items-center border-b pb-2">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-400" />
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
                      <Trash2 className="h-4 w-4" />
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
      {isComposerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in" onClick={() => setIsComposerOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between bg-slate-50 flex-shrink-0">
              <h2 className="text-lg font-bold text-slate-800">Compose Announcement</h2>
              <button onClick={() => setIsComposerOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Write/Preview Tabs */}
            <div className="flex border-b border-slate-200 bg-slate-50/50 px-6 flex-shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('write')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-[1px] ${
                  activeTab === 'write'
                    ? 'border-[#0d6b66] text-[#0d6b66]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('preview')}
                className={`py-3 px-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors -mb-[1px] ${
                  activeTab === 'preview'
                    ? 'border-[#0d6b66] text-[#0d6b66]'
                    : 'border-transparent text-slate-500 hover:text-slate-700'
                }`}
              >
                Preview Announcement
              </button>
            </div>

            {/* Scrollable Body Container */}
            <div className="p-6 space-y-4 overflow-y-auto flex-grow">
              {activeTab === 'write' ? (
                <>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Recipients</label>
                    <select
                      value={recipients}
                      onChange={e => setRecipients(e.target.value as any)}
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                    >
                      <option value="all">All Users ({accountsList.filter(a => a.verified && !a.deactivated).length} active)</option>
                      <option value="students">All Students ({accountsList.filter(a => a.type === 'student' && a.verified && !a.deactivated).length} active)</option>
                      <option value="officers">All Officers ({accountsList.filter(a => a.type === 'officer' && a.verified && !a.deactivated).length} active)</option>
                      <option value="specific">Specific Users ({selectedUserIds.length} selected)</option>
                    </select>
                  </div>

                  {recipients === 'specific' && (
                    <div className="space-y-2 border border-slate-200 rounded-lg p-3 bg-slate-50">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                          Select Recipients ({selectedUserIds.length} selected)
                        </span>
                        <button
                          type="button"
                           onClick={() => {
                             const eligible = accountsList.map(a => a.$id);
                             const next = selectedUserIds.length === eligible.length ? [] : eligible;
                             setSelectedUserIds(next);
                          }}
                          className="text-[10px] text-[#0d6b66] hover:underline font-bold"
                        >
                           {selectedUserIds.length === accountsList.length ? 'Deselect All' : 'Select All'}
                        </button>
                      </div>
                      <input
                        type="text"
                        placeholder="Search by name, email, or role..."
                        value={userSearchQuery}
                        onChange={e => setUserSearchQuery(e.target.value)}
                        className="w-full rounded-md border border-slate-200 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#0d6b66] bg-white"
                      />
                      <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-100 rounded bg-white p-2">
                        {filteredSearchAccounts.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">No users match search.</div>
                        ) : (
                          filteredSearchAccounts.map(acc => {
                            const email = getAccountEmail(acc);
                             const isChecked = selectedUserIds.includes(acc.$id);
                            return (
                              <label key={acc.$id} className="flex items-center gap-2 hover:bg-slate-50 p-1 rounded cursor-pointer text-xs select-none">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                     const next = isChecked
                                       ? selectedUserIds.filter(id => id !== acc.$id)
                                       : [...selectedUserIds, acc.$id];
                                     setSelectedUserIds(next);
                                  }}
                                  className="rounded text-[#0d6b66] focus:ring-[#0d6b66] border-slate-300"
                                />
                                <div className="flex flex-col">
                                  <span className="font-semibold text-slate-700">
                                    {getAccountName(acc)}
                                  </span>
                                  <span className="text-[10px] text-slate-400">
                                    {email || 'No email on file'} • <span className="capitalize text-[9px] px-1 bg-slate-100 text-slate-500 rounded">{acc.type}</span>
                                  </span>
                                </div>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  )}

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
                </>
              ) : (
                <div className="space-y-2">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                     Announcement Preview
                  </span>
                  <iframe
                    title="Announcement Preview"
                    srcDoc={getAnnouncementHtml(subject || 'Announcement: Subject Line', message || 'Please write your message body inside the "Write" tab...', senderName, senderEmail)}
                    className="w-full h-[380px] border border-slate-200 rounded-xl bg-white shadow-inner animate-in fade-in"
                  />
                </div>
              )}
            </div>

            {/* Fixed Footer Container */}
            <div className="px-6 py-4 border-t bg-slate-50 flex flex-col sm:flex-row sm:justify-between items-center gap-3 flex-shrink-0">
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleSaveDraft}
                  className="flex-1 sm:flex-initial rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Save Draft
                </button>
                <button
                  type="button"
                  onClick={handleCopyToClipboard}
                  className="flex-1 sm:flex-initial rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
                >
                  Copy Text
                </button>
              </div>
              
              <button
                type="button"
                disabled={sending}
                onClick={handleSendAnnouncement}
                className="w-full sm:w-auto rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] disabled:bg-slate-300 text-white font-semibold text-sm px-6 py-2 shadow-xs transition-colors flex items-center justify-center gap-1.5"
              >
                {sending ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Publishing...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Publish In-App
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
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
