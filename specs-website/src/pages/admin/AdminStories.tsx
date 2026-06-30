import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw } from 'lucide-react';
import { cachedApi, api } from '../../shared/api';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { databases, storage, functions } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_STORIES, COLLECTION_ID_STUDENTS, FUNCTION_ID } from '../../shared/constants';
import { Query, ID } from 'appwrite';
import type { StoryDoc } from '../../types/database';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES || 'highlight-images';

const AdminStories: React.FC = () => {
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [studentLookup, setStudentLookup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<'pending' | 'published' | 'all'>('pending');
  const [searchQuery, setSearchQuery] = useState('');

  // Editing state
  const [editingStory, setEditingStory] = useState<StoryDoc | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [submittingEdit, setSubmittingEdit] = useState(false);

  // Confirmations
  const [publishConfirm, setPublishConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const [storiesRes, studentsRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, [
          Query.limit(500),
          Query.orderDesc('$createdAt')
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_STUDENTS, [
          Query.limit(500)
        ])
      ]);

      setStories(storiesRes.documents as StoryDoc[]);

      const lookup: Record<string, string> = {};
      studentsRes.documents.forEach((s: any) => {
        lookup[s.$id] = s.name;
      });
      setStudentLookup(lookup);

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Stories log synchronized successfully.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to sync stories.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const pending = stories.filter(s => !s.isAccepted).length;
    const published = stories.filter(s => s.isAccepted).length;
    return { pending, published, total: stories.length };
  }, [stories]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setEditImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const handleOpenEdit = (story: StoryDoc) => {
    setEditingStory(story);
    setEditTitle(story.title || '');
    setEditDesc(story.post_description || '');
    setEditContent(story.post_details || '');
    setEditImageFile(null);
    setRemoveExistingImage(false);

    if (story.image_bucket) {
      try {
        const previewUrl = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 600, 320);
        setImagePreviewUrl(previewUrl);
      } catch {
        setImagePreviewUrl(null);
      }
    } else {
      setImagePreviewUrl(null);
    }
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStory) return;

    setSubmittingEdit(true);
    try {
      let imageId = editingStory.image_bucket || null;

      // Check if image is flagged for removal
      if (removeExistingImage && imageId) {
        try {
          await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, imageId);
          imageId = null;
        } catch (e) {
          console.warn('Failed to delete old highlight image:', e);
        }
      }

      // Check if new image is uploaded
      if (editImageFile) {
        if (imageId) {
          try {
            await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, imageId);
          } catch (e) {
            console.warn('Failed to overwrite highlight image:', e);
          }
        }
        const uploaded = await storage.createFile(BUCKET_ID_HIGHLIGHT_IMAGES, ID.unique(), editImageFile);
        imageId = uploaded.$id;
      }

      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, editingStory.$id, {
        title: editTitle.trim(),
        post_description: editDesc.trim(),
        post_details: editContent.trim(),
        image_bucket: imageId
      });

      addToast({ type: 'success', title: 'Story Updated', message: 'Modifications saved successfully.' });
      setEditingStory(null);
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to modify story.' });
    } finally {
      setSubmittingEdit(false);
    }
  };

  const handlePublishStory = async () => {
    if (!publishConfirm.id) return;
    setActionLoading(true);
    try {
      const currentUser = await cachedApi.users.getCurrent();

      if (FUNCTION_ID) {
        await functions.createExecution(
          FUNCTION_ID,
          JSON.stringify({
            action: 'approve_story',
            payload: { story_id: publishConfirm.id },
            requestingUserId: currentUser?.$id
          }),
          false
        );
      } else {
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, publishConfirm.id, {
          isAccepted: true
        });
      }

      addToast({ type: 'success', title: 'Published', message: 'Story successfully published to highlights.' });
      setPublishConfirm({ open: false, id: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to publish story.' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteStory = async () => {
    if (!deleteConfirm.id) return;
    setActionLoading(true);
    try {
      const story = stories.find(s => s.$id === deleteConfirm.id);

      // Clean up image from storage bucket before deleting the story record
      if (story?.image_bucket) {
        try {
          await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket);
        } catch (e) {
          console.warn('Failed to delete cover image:', e);
        }
      }

      const currentUser = await cachedApi.users.getCurrent();

      if (FUNCTION_ID) {
        const execution = await functions.createExecution(
          FUNCTION_ID,
          JSON.stringify({
            action: 'reject_story',
            payload: { story_id: deleteConfirm.id },
            requestingUserId: currentUser?.$id,
          }),
          false
        );
        let result: any = {};
        try { result = JSON.parse(execution?.responseBody || '{}'); } catch { /* ignore */ }
        if (result.success === false) {
          throw new Error(result.error || 'Failed to reject/delete story');
        }
      } else {
        // Fallback: direct delete if function ID not configured
        await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STORIES, deleteConfirm.id);
      }

      addToast({ type: 'success', title: 'Deleted', message: 'Story has been removed.' });
      setDeleteConfirm({ open: false, id: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete story.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredStories = useMemo(() => {
    return stories.filter(s => {
      const isPending = !s.isAccepted;
      
      const matchesStatus = statusFilter === 'pending'
        ? isPending
        : statusFilter === 'published'
          ? !isPending
          : true;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q
        ? (s.title || '').toLowerCase().includes(q) || (s.post_description || '').toLowerCase().includes(q)
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [stories, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Manage Stories</h1>
          <p className="text-sm text-slate-500 mt-1">Approve, edit, and publish highlight stories.</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value as any)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
          >
            <option value="pending">Pending Approval</option>
            <option value="published">Published Only</option>
            <option value="all">All Stories</option>
          </select>

          <div className="relative w-full sm:max-w-xs">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Search stories..."
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
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-amber-500 block">{stats.pending}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Pending Approval</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-emerald-600 block">{stats.published}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Published Highlights</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-[#0d6b66] block">{stats.total}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Total Stories</span>
        </div>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredStories.length === 0 ? (
        <EmptyState
          title="No Stories Found"
          description={searchQuery ? `No stories match search term "${searchQuery}".` : 'No stories found in the selected category.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredStories.map(story => {
            const studentId = story.students?.$id || story.students || '';
            const authorName = studentLookup[studentId] || 'Unknown Student';
            
            // Get cover image URL
            const imageUrl = story.image_bucket ? storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 400, 250) : null;

            return (
              <div key={story.$id} className="rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition-shadow flex flex-col justify-between">
                <div>
                  {imageUrl ? (
                    <img src={imageUrl} alt={story.title || ''} className="w-full h-44 object-cover border-b" />
                  ) : (
                    <div className="w-full h-44 bg-slate-50 border-b flex flex-col items-center justify-center text-slate-300 gap-1.5">
                      <svg className="h-8 w-8 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                      </svg>
                      <span className="text-[10px] font-bold tracking-widest uppercase">SPECS STORY</span>
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    {story.isAccepted ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 uppercase tracking-wide">
                        Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 uppercase tracking-wide">
                        Pending Approval
                      </span>
                    )}

                    <h3 className="font-bold text-slate-800 text-base line-clamp-1">{story.title || 'Untitled'}</h3>
                    <span className="text-xs text-slate-400 block font-medium">By: {authorName}</span>
                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-2">{story.post_description || 'No description provided.'}</p>
                  </div>
                </div>

                <div className="p-5 pt-0 border-t border-slate-50 flex flex-col gap-2 mt-4">
                  {!story.isAccepted && (
                    <button
                      onClick={() => setPublishConfirm({ open: true, id: story.$id })}
                      className="w-full rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-xs py-2 shadow-xs transition-colors"
                    >
                      Publish Story
                    </button>
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(story)}
                      className="flex-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 py-1.5 text-xs font-semibold transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ open: true, id: story.$id })}
                      className="flex-1 rounded-lg border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 py-1.5 text-xs font-semibold transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Edit Story Dialog Modal */}
      {editingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setEditingStory(null)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Edit highlight Story</h2>
              <button onClick={() => setEditingStory(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Full Content details</label>
                <textarea
                  required
                  rows={5}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-50 file:text-slate-700 hover:file:bg-slate-100 cursor-pointer"
                />
                
                {imagePreviewUrl && (
                  <div className="mt-3 relative inline-block rounded-lg overflow-hidden border">
                    <img src={imagePreviewUrl} alt="Preview" className="max-h-40 max-w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreviewUrl(null);
                        setEditImageFile(null);
                        setRemoveExistingImage(true);
                      }}
                      className="absolute top-2 right-2 bg-red-600 hover:bg-red-700 text-white rounded-lg p-1.5 shadow-sm text-xs"
                    >
                      Remove cover
                    </button>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submittingEdit && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmations modals */}
      <ConfirmModal
        isOpen={publishConfirm.open}
        onClose={() => setPublishConfirm({ open: false, id: null })}
        onConfirm={handlePublishStory}
        title="Approve Highlight Story"
        message="Publish this student story? It will render in the landing highlights page database feed."
        confirmLabel="Publish"
        variant="info"
        loading={actionLoading}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteStory}
        title="Delete Story Permanently"
        message="Are you sure you want to delete this story? The cover images assets will be scrubbed. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminStories;
