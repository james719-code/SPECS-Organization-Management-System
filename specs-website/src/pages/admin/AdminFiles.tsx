import React, { useState, useEffect, useMemo } from 'react';
import { cachedApi, api } from '../../shared/api';
import { formatDate } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { storage, databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_FILES, BUCKET_ID_UPLOADS } from '../../shared/constants';
import { ID } from 'appwrite';
import type { FileDoc } from '../../types/database';

const AdminFiles: React.FC = () => {
  const [files, setFiles] = useState<FileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userLookup, setUserLookup] = useState<Record<string, string>>({});

  // Dialog Modals state
  const [detailFile, setDetailFile] = useState<FileDoc | null>(null);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [uploadTitle, setUploadTitle] = useState('');
  const [uploadDesc, setUploadDesc] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Deletion confirmations
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; fileDoc: FileDoc | null }>({ open: false, fileDoc: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [filesRes, accountsRes] = await Promise.all([
        cachedApi.files.listDocuments({ limit: 500, orderDesc: '$createdAt' }, isRefresh ? 0 : 2 * 60 * 1000),
        cachedApi.users.listAllAccounts({}, isRefresh ? 0 : 5 * 60 * 1000)
      ]);

      setFiles(filesRes.documents);

      // Build user lookup
      const lookup: Record<string, string> = {};
      accountsRes.documents.forEach((acc: any) => {
        const name = (acc.students && acc.students.name) ? acc.students.name : acc.username;
        lookup[acc.$id] = name || 'Unknown User';
      });
      setUserLookup(lookup);

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'File directory synchronized.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load file index.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (!uploadTitle) {
        // Auto-fill title with filename without extension
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        setUploadTitle(cleanName);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      addToast({ type: 'warning', title: 'File required', message: 'Please select a document file first.' });
      return;
    }

    setUploading(true);
    try {
      // 1. Upload file binary to storage
      const uploaded = await storage.createFile(BUCKET_ID_UPLOADS, ID.unique(), selectedFile);

      // 2. Fetch current user id
      const currentUser = await cachedApi.users.getCurrent();

      // 3. Create document record
      await databases.createDocument(DATABASE_ID, COLLECTION_ID_FILES, ID.unique(), {
        fileName: uploadTitle.trim(),
        description: uploadDesc.trim(),
        uploader: currentUser?.$id || 'system',
        fileID: uploaded.$id,
      });

      api.cache.clearTags(['files', 'dashboard']);
      addToast({ type: 'success', title: 'Upload complete', message: `"${uploadTitle}" has been shared.` });
      
      // Reset form
      setIsUploadOpen(false);
      setUploadTitle('');
      setUploadDesc('');
      setSelectedFile(null);

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to upload document.' });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteConfirm.fileDoc) return;
    const fileDoc = deleteConfirm.fileDoc;
    setActionLoading(true);
    try {
      // 1. Remove file storage binary
      if (fileDoc.fileID) {
        try {
          await storage.deleteFile(BUCKET_ID_UPLOADS, fileDoc.fileID);
        } catch (e) {
          console.warn('Failed to delete associated storage file:', e);
        }
      }
      
      // 2. Remove file db record
      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_FILES, fileDoc.$id);
      
      api.cache.clearTags(['files', 'dashboard']);
      addToast({ type: 'success', title: 'Deleted', message: 'Document has been removed.' });
      setDeleteConfirm({ open: false, fileDoc: null });
      setDetailFile(null);
      
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete file.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredFiles = useMemo(() => {
    if (!searchQuery.trim()) return files;
    const q = searchQuery.toLowerCase();
    return files.filter(f => f.fileName?.toLowerCase().includes(q));
  }, [files, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">File Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage and access all organization documents.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative w-full sm:max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search documents by name..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
            />
          </div>
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <svg className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 1121.21 8H18.5" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredFiles.length === 0 ? (
        <EmptyState
          title="No Documents Shared"
          description={searchQuery ? `No files match search term "${searchQuery}".` : 'No organization files are currently published.'}
          action={{
            label: 'Upload Document',
            onClick: () => setIsUploadOpen(true)
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredFiles.map(fileDoc => {
            const uploaderName = userLookup[fileDoc.uploader || ''] || 'SPECS Admin';
            const downloadUrl = fileDoc.fileID ? storage.getFileDownload(BUCKET_ID_UPLOADS, fileDoc.fileID) : '#';

            return (
              <div
                key={fileDoc.$id}
                onClick={() => setDetailFile(fileDoc)}
                className="group relative rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-50 border border-slate-100 text-[#0d6b66] shadow-inner">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDetailFile(fileDoc);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      title="File details"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </button>
                  </div>

                  <h3 className="font-bold text-slate-800 group-hover:text-[#0d6b66] transition-colors line-clamp-1 break-all" title={fileDoc.fileName || ''}>
                    {fileDoc.fileName}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{fileDoc.description || 'No description provided.'}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 font-semibold uppercase">
                    <span>By: {uploaderName.split(' ')[0]}</span>
                    <span>{formatDate(fileDoc.$createdAt)}</span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="flex-1 inline-flex justify-center items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2 text-xs font-semibold shadow-xs transition-colors"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      Download
                    </a>
                    <button
                      onClick={e => {
                        e.stopPropagation();
                        setDeleteConfirm({ open: true, fileDoc });
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 hover:border-red-100 transition-colors"
                      title="Delete document"
                    >
                      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Upload FAB Button */}
      <button
        onClick={() => setIsUploadOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
        title="Upload Document"
      >
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      </button>

      {/* Detail side-drawer / Modal */}
      {detailFile && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/45 backdrop-blur-xs animate-in fade-in" onClick={() => setDetailFile(null)}>
          <div
            className="h-full w-full max-w-md bg-white p-6 shadow-2xl overflow-y-auto flex flex-col justify-between animate-in slide-in-from-right duration-250"
            onClick={e => e.stopPropagation()}
          >
            <div>
              <div className="flex items-center justify-between pb-4 border-b">
                <h2 className="text-lg font-bold text-slate-900">File Information</h2>
                <button onClick={() => setDetailFile(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex flex-col items-center text-center py-6">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50 border border-slate-100 text-[#0d6b66] shadow-sm mb-3">
                  <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-base font-bold text-slate-900 break-all px-4">{detailFile.fileName}</h3>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Description</span>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3.5 rounded-lg border border-slate-100 whitespace-pre-wrap leading-relaxed">
                    {detailFile.description || 'No description provided.'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2">
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Uploader</span>
                    <span className="text-sm font-semibold text-slate-800 block">
                      {userLookup[detailFile.uploader || ''] || 'SPECS Admin'}
                    </span>
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Uploaded On</span>
                    <span className="text-sm font-semibold text-slate-800 block">
                      {formatDate(detailFile.$createdAt)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t mt-8">
              <a
                href={detailFile.fileID ? storage.getFileDownload(BUCKET_ID_UPLOADS, detailFile.fileID) : '#'}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex justify-center items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2.5 text-sm font-semibold shadow-sm transition-colors"
              >
                Download Document
              </a>
              <button
                onClick={() => setDeleteConfirm({ open: true, fileDoc: detailFile })}
                className="flex-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 py-2.5 text-sm font-medium transition-colors shadow-sm"
              >
                Delete File
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload document modal */}
      {isUploadOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsUploadOpen(false)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Upload Document</h2>
              <button onClick={() => setIsUploadOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. General Assembly Agenda"
                  value={uploadTitle}
                  onChange={e => setUploadTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  placeholder="Summarize file content or details..."
                  rows={3}
                  value={uploadDesc}
                  onChange={e => setUploadDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select File</label>
                <input
                  type="file"
                  required
                  onChange={handleFileChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {uploading && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, fileDoc: null })}
        onConfirm={handleDeleteFile}
        title="Remove Document File"
        message={`Are you sure you want to delete document "${deleteConfirm.fileDoc?.fileName}"? This deletes the index record and file storage asset. This action is irreversible.`}
        confirmLabel="Remove File"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminFiles;
