import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { databases, storage } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_STORIES, COLLECTION_ID_ACCOUNTS } from '../../shared/constants';
import { Query, ID } from 'appwrite';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { Link, useNavigate } from 'react-router-dom';
import { account } from '../../shared/appwrite';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES || 'highlight-images';

const StudentPosts: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [studentData, setStudentData] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Composer Modal state
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerPostId, setComposerPostId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [linksText, setLinksText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Deletion validations
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null; title: string }>({ open: false, id: null, title: '' });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const loadData = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      setCurrentUser(user);

      // Get account document links
      const accountDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
      const studentId = accountDoc.students?.$id || accountDoc.students;
      
      if (!studentId) {
        setLoading(false);
        return;
      }

      // Fetch student info
      const studentDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id).then(async doc => {
        if (typeof doc.students === 'object' && doc.students.name) {
          return doc.students;
        }
        const studentId = typeof doc.students === 'object' ? doc.students.$id : doc.students;
        return await databases.getDocument(DATABASE_ID, 'students', studentId);
      });
      setStudentData(studentDoc);

      if (!studentDoc.is_volunteer) {
        setLoading(false);
        return;
      }

      // Fetch stories written by this student
      const storiesRes = await databases.listDocuments(DATABASE_ID, COLLECTION_ID_STORIES, [
        Query.equal('students', studentDoc.$id),
        Query.orderDesc('$createdAt'),
        Query.limit(100)
      ]);
      setPosts(storiesRes.documents);

    } catch (err: any) {
      console.error('Failed to load student posts view:', err);
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load posts ledger.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = posts.length;
    const published = posts.filter(p => p.isAccepted).length;
    const pending = posts.filter(p => !p.isAccepted).length;
    return { total, published, pending };
  }, [posts]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setImagePreviewUrl(URL.createObjectURL(file));
      setRemoveExistingImage(false);
    }
  };

  const handleOpenCompose = () => {
    setTitle('');
    setDescription('');
    setContent('');
    setImageFile(null);
    setImagePreviewUrl(null);
    setRemoveExistingImage(false);
    setLinksText('');
    setComposerPostId(null);
    setIsComposerOpen(true);
  };

  const handleOpenEdit = (post: any) => {
    setComposerPostId(post.$id);
    setTitle(post.title || '');
    setDescription(post.post_description || '');
    setContent(post.post_details || '');
    setImageFile(null);
    setRemoveExistingImage(false);
    
    const links = post.related_links ? post.related_links.join(', ') : '';
    setLinksText(links);

    if (post.image_bucket) {
      try {
        const preview = storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, post.image_bucket, 600, 320);
        setImagePreviewUrl(preview);
      } catch {
        setImagePreviewUrl(null);
      }
    } else {
      setImagePreviewUrl(null);
    }

    setIsComposerOpen(true);
  };

  const handlePostSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !content.trim()) {
      addToast({ type: 'warning', title: 'Missing parameters', message: 'Please write all required inputs.' });
      return;
    }

    setSubmitting(true);
    try {
      const splitLinks = linksText
        .split(',')
        .map(l => l.trim())
        .filter(l => l.length > 0);

      let imageId = null;

      if (composerPostId) {
        // Retrieve existing story
        const existing = posts.find(p => p.$id === composerPostId);
        imageId = existing.image_bucket || null;

        if (removeExistingImage && imageId) {
          try {
            await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, imageId);
            imageId = null;
          } catch (e) {
            console.warn('Failed to delete old post cover image:', e);
          }
        }

        if (imageFile) {
          if (imageId) {
            try {
              await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, imageId);
            } catch (e) {}
          }
          const uploaded = await storage.createFile(BUCKET_ID_HIGHLIGHT_IMAGES, ID.unique(), imageFile);
          imageId = uploaded.$id;
        }

        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, composerPostId, {
          title: title.trim(),
          post_description: description.trim(),
          post_details: content.trim(),
          image_bucket: imageId,
          related_links: splitLinks,
          isAccepted: false // Reset publication accepted status back to review on modification
        });

        addToast({ type: 'success', title: 'Post Modified', message: 'Your post modification was submitted for review.' });
      } else {
        // Create new story
        if (imageFile) {
          const uploaded = await storage.createFile(BUCKET_ID_HIGHLIGHT_IMAGES, ID.unique(), imageFile);
          imageId = uploaded.$id;
        }

        await databases.createDocument(DATABASE_ID, COLLECTION_ID_STORIES, ID.unique(), {
          title: title.trim(),
          post_description: description.trim(),
          post_details: content.trim(),
          image_bucket: imageId,
          related_links: splitLinks,
          isAccepted: false,
          students: studentData.$id,
          author: studentData.name || currentUser.name
        });

        addToast({ type: 'success', title: 'Post Created', message: 'New story post submitted for approval.' });
      }

      setIsComposerOpen(false);
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to submit post.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeletePost = async () => {
    if (!deleteConfirm.id) return;
    setActionLoading(true);
    try {
      const post = posts.find(p => p.$id === deleteConfirm.id);
      if (post?.image_bucket) {
        try {
          await storage.deleteFile(BUCKET_ID_HIGHLIGHT_IMAGES, post.image_bucket);
        } catch (e) {}
      }

      await databases.deleteDocument(DATABASE_ID, COLLECTION_ID_STORIES, deleteConfirm.id);
      addToast({ type: 'success', title: 'Removed', message: 'Post successfully deleted.' });
      setDeleteConfirm({ open: false, id: null, title: '' });
      loadData();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete post.' });
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d6b66]" />
      </div>
    );
  }

  // Non-volunteer warning panel
  if (studentData && !studentData.is_volunteer) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="h-16 w-16 bg-amber-50 border border-amber-100 rounded-full flex items-center justify-center mx-auto text-amber-500">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800">Volunteer Access Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You must join the SPECS Volunteer Team in order to compile and share community posts.
        </p>
        <button
          onClick={() => navigate('/dashboard/student/profile')}
          className="inline-flex justify-center items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold shadow-sm transition-colors"
        >
          Go to Profile Settings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My Posts</h1>
          <p className="text-sm text-slate-500 mt-1">Create and manage your volunteer community stories.</p>
        </div>
        <button
          onClick={handleOpenCompose}
          className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-semibold text-sm px-4 py-2.5 shadow-sm transition-colors"
        >
          Create Post
        </button>
      </div>

      {/* Stats Counter banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-[#0d6b66] block">{stats.total}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Total Posts</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-emerald-600 block">{stats.published}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Published</span>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4 text-center">
          <span className="text-xl font-bold text-amber-500 block">{stats.pending}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Pending Review</span>
        </div>
      </div>

      {/* Grid listing */}
      {posts.length === 0 ? (
        <EmptyState
          title="No Posts Created"
          description="Create your first post to share with the SPECS community!"
          action={{
            label: 'Create Post',
            onClick: handleOpenCompose
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {posts.map(post => (
            <div key={post.$id} className="rounded-xl border border-slate-200 bg-white p-5 hover:shadow-md transition-shadow flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase">{new Date(post.$createdAt).toLocaleDateString()}</span>
                  {post.isAccepted ? (
                    <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[9px] font-semibold text-emerald-700 uppercase tracking-wide">
                      Published
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[9px] font-semibold text-amber-700 uppercase tracking-wide">
                      Pending Review
                    </span>
                  )}
                </div>

                <h3 className="font-bold text-slate-850 line-clamp-1">{post.title || 'Untitled'}</h3>
                <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed mt-2">{post.post_description || 'No description provided.'}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex gap-2">
                <button
                  onClick={() => handleOpenEdit(post)}
                  className="flex-1 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-750 py-1.5 text-xs font-semibold transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm({ open: true, id: post.$id, title: post.title })}
                  className="rounded-lg border border-red-200 bg-red-50 hover:bg-red-100 text-red-600 p-2 transition-colors"
                  title="Delete post"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer dialog modal */}
      {isComposerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in animate-fade-in" onClick={() => setIsComposerOpen(false)}>
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">{composerPostId ? 'Edit Post' : 'Create New Post'}</h2>
              <button onClick={() => setIsComposerOpen(false)} className="text-slate-400 hover:text-slate-655 transition-colors">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-6 space-y-4 max-h-[500px] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Give your story a title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-950 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-505 uppercase tracking-wider mb-2">Short Description</label>
                <input
                  type="text"
                  required
                  placeholder="Write a brief overview/summary quote of the story..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-955 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Story Details</label>
                <textarea
                  required
                  placeholder="Share the full details of your story here. Be descriptive!"
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-955 focus:border-[#0d6b66] outline-none resize-none"
                />
              </div>

              {/* Cover image upload */}
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Cover Image</label>
                <div className="flex items-center gap-4">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#0d6b66] hover:file:bg-teal-100"
                  />
                  {imageFile && (
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100 font-semibold">Ready</span>
                  )}
                </div>
              </div>

              {/* Related links */}
              <div>
                <label className="block text-xs font-bold text-slate-550 uppercase tracking-wider mb-2">Related Links (comma separated)</label>
                <input
                  type="text"
                  placeholder="https://example.com, https://google.com"
                  value={linksText}
                  onChange={e => setLinksText(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs text-slate-955 focus:border-[#0d6b66] outline-none"
                />
              </div>

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-650 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-4 py-2 text-xs font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submitting && (
                    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  )}
                  {composerPostId ? 'Save Changes' : 'Submit Draft'}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Delete confirm modal */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null, title: '' })}
        onConfirm={handleDeletePost}
        title="Delete Story Post"
        message={`Are you sure you want to delete post "${deleteConfirm.title}"? Associated cover image files will also be scrubbed. This cannot be undone.`}
        confirmLabel="Delete Post"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default StudentPosts;
export { BUCKET_ID_HIGHLIGHT_IMAGES };
