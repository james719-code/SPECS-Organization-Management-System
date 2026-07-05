import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { storage } from '../../shared/appwrite';
import { Query, ID } from 'appwrite';
import { api, cachedApi } from '../../shared/api';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { useNavigate } from 'react-router-dom';
import { account } from '../../shared/appwrite';
import { PenTool, Calendar, Globe, Award, Check, Clock, UserCheck, ShieldCheck, Trash2, Edit3, Plus, X, Loader2 } from 'lucide-react';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES || 'highlight-images';

interface StoryLink {
  url: string;
  label: string;
}

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
  const [links, setLinks] = useState<StoryLink[]>([]);
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
      const accountDoc = await cachedApi.users.getAccount(user.$id);
      const studentId = accountDoc.students?.$id || accountDoc.students;
      
      if (!studentId) {
        setLoading(false);
        return;
      }

      // Fetch student info
      const studentDoc = await cachedApi.users.getStudentProfile(studentId);
      setStudentData(studentDoc);

      if (!studentDoc.is_volunteer) {
        setLoading(false);
        return;
      }

      // Fetch stories written by this student
      const storiesRes = await api.stories.list({
        extraQueries: [Query.equal('students', studentDoc.$id)],
        limit: 100
      });
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
    setLinks([{ url: '', label: '' }]);
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
    
    // Parse related links and meanings
    const urls = post.related_links || [];
    const meanings = post.meaning || [];
    const mappedLinks = urls.map((url: string, index: number) => ({
      url,
      label: meanings[index] || ''
    }));
    setLinks(mappedLinks.length > 0 ? mappedLinks : [{ url: '', label: '' }]);

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
      const filteredLinks = links.filter(l => l.url.trim() !== '');
      const splitLinks = filteredLinks.map(l => l.url.trim());
      const meanings = filteredLinks.map(l => l.label.trim() || l.url.trim());

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

        await api.stories.update(composerPostId, {
          title: title.trim(),
          post_description: description.trim(),
          post_details: content.trim(),
          image_bucket: imageId,
          related_links: splitLinks,
          meaning: meanings,
          isAccepted: false, // Reset publication accepted status back to review on modification
          officerApproval: false, // Reset approvals to trigger review cycle again
          adminApproval: false
        });

        addToast({ type: 'success', title: 'Post Modified', message: 'Your post modification was submitted for review.' });
      } else {
        // Create new story
        if (imageFile) {
          const uploaded = await storage.createFile(BUCKET_ID_HIGHLIGHT_IMAGES, ID.unique(), imageFile);
          imageId = uploaded.$id;
        }

        await api.stories.create({
          title: title.trim(),
          post_description: description.trim(),
          post_details: content.trim(),
          image_bucket: imageId,
          related_links: splitLinks,
          meaning: meanings,
          isAccepted: false,
          officerApproval: false,
          adminApproval: false,
          students: studentData.$id
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

      await api.stories.delete(deleteConfirm.id);
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
      <div className="flex justify-center items-center py-20 bg-slate-50 dark:bg-slate-950 min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0d6b66]" />
      </div>
    );
  }

  // Non-volunteer warning panel
  if (studentData && !studentData.is_volunteer) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4 px-4 bg-slate-50 dark:bg-slate-950 min-h-[80vh] flex flex-col justify-center">
        <div className="h-16 w-16 bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-full flex items-center justify-center mx-auto text-amber-500 dark:text-amber-400 shadow-sm animate-pulse">
          <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Volunteer Access Required</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          You must join the SPECS Volunteer Team in order to compile and share community stories.
        </p>
        <button
          onClick={() => navigate('/dashboard/student')}
          className="inline-flex justify-center items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition-all hover:scale-[1.02] cursor-pointer"
        >
          Go to Profile Settings
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 min-h-screen pb-12 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">My Stories</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Compose, structure, and check the verification progress of your stories.</p>
        </div>
        <button
          onClick={handleOpenCompose}
          className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-bold text-xs px-4 py-3 shadow-md transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          Create Story
        </button>
      </div>

      {/* Stats Counter banner */}
      <div className="grid grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-4 text-center shadow-xs transition-transform hover:scale-[1.01]">
          <span className="text-2xl font-black text-[#0d6b66] dark:text-teal-400 block">{stats.total}</span>
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-1">Total Stories</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-4 text-center shadow-xs transition-transform hover:scale-[1.01]">
          <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block">{stats.published}</span>
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-1">Published</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/60 backdrop-blur-sm p-4 text-center shadow-xs transition-transform hover:scale-[1.01]">
          <span className="text-2xl font-black text-amber-500 dark:text-amber-400 block">{stats.pending}</span>
          <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mt-1">Under Review</span>
        </div>
      </div>

      {/* Grid listing */}
      {posts.length === 0 ? (
        <EmptyState
          title="No Stories Created"
          description="Write your first story to share accomplishments or events with the SPECS community!"
          action={{
            label: 'Create Story',
            onClick: handleOpenCompose
          }}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {posts.map(post => (
            <div 
              key={post.$id} 
              className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-1.5 text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5 text-slate-350 dark:text-slate-655" />
                    <span>
                      {new Date(post.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                    </span>
                  </div>
                  {post.isAccepted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-450 uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Published
                    </span>
                  ) : post.officerApproval ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-450 uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                      Awaiting Admin
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 dark:text-amber-450 uppercase tracking-wide">
                      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                      Awaiting Officer
                    </span>
                  )}
                </div>

                <h3 className="font-extrabold text-slate-800 dark:text-white text-base line-clamp-1 leading-snug tracking-tight hover:text-[#0d6b66] dark:hover:text-teal-400 transition-colors">
                  {post.title || 'Untitled'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-3 leading-relaxed mt-2.5 font-medium">
                  {post.post_description || 'No description provided.'}
                </p>
              </div>

              {/* Progress Stepper Timeline */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60">
                <span className="text-[9px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-4">Approval Flow</span>
                <div className="flex items-center justify-between relative px-3 z-0">
                  {/* Connecting Line Track */}
                  <div className="absolute top-[12px] left-5 right-5 h-[3px] bg-slate-100 dark:bg-slate-850 rounded-full" />
                  {/* Active Track Highlight */}
                  <div 
                    className="absolute top-[12px] left-5 h-[3px] bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" 
                    style={{ width: post.isAccepted ? '86%' : post.officerApproval ? '43%' : '0%' }}
                  />

                  {/* Step 1: Submitted */}
                  <div className="flex flex-col items-center relative z-10">
                    <div className="h-6 w-6 rounded-full bg-[#0d6b66] dark:bg-teal-500 text-white flex items-center justify-center text-[10px] font-black border-2 border-white dark:border-slate-900 shadow-sm">
                      <Check className="h-3 w-3" strokeWidth={3.5} />
                    </div>
                    <span className="text-[9px] font-bold text-slate-600 dark:text-slate-450 mt-1.5">Submitted</span>
                  </div>

                  {/* Step 2: Officer */}
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shadow-xs transition-all duration-300 ${
                      post.officerApproval 
                        ? 'bg-[#0d6b66] dark:bg-teal-500 border-white dark:border-slate-900 text-white' 
                        : post.isAccepted
                          ? 'bg-[#0d6b66] dark:bg-teal-500 border-white dark:border-slate-900 text-white'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                    }`}>
                      {post.officerApproval || post.isAccepted ? (
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      ) : (
                        <UserCheck className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className={`text-[9px] font-bold mt-1.5 transition-colors duration-300 ${
                      post.officerApproval || post.isAccepted
                        ? 'text-[#0d6b66] dark:text-teal-400' 
                        : 'text-slate-400 dark:text-slate-600'
                    }`}>Officer</span>
                  </div>

                  {/* Step 3: Admin */}
                  <div className="flex flex-col items-center relative z-10">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 shadow-xs transition-all duration-300 ${
                      post.isAccepted 
                        ? 'bg-emerald-600 dark:bg-emerald-500 border-white dark:border-slate-900 text-white' 
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-400 dark:text-slate-600'
                    }`}>
                      {post.isAccepted ? (
                        <Check className="h-3 w-3" strokeWidth={3.5} />
                      ) : (
                        <ShieldCheck className="h-3.5 w-3.5" />
                      )}
                    </div>
                    <span className={`text-[9px] font-bold mt-1.5 transition-colors duration-300 ${
                      post.isAccepted ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-400 dark:text-slate-600'
                    }`}>Admin</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800/60 flex gap-2">
                <button
                  onClick={() => handleOpenEdit(post)}
                  className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0d6b66]/30 dark:hover:border-teal-500/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 py-2.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-xs"
                >
                  <Edit3 className="h-3.5 w-3.5 text-slate-400" />
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm({ open: true, id: post.$id, title: post.title })}
                  className="rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30 text-red-650 dark:text-red-400 p-2.5 transition-all duration-200 cursor-pointer hover:scale-105"
                  title="Delete post"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Composer dialog modal */}
      {isComposerOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsComposerOpen(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-250 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">{composerPostId ? 'Edit Story Draft' : 'Create New Story Draft'}</h2>
              <button onClick={() => setIsComposerOpen(false)} className="text-slate-450 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handlePostSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  required
                  placeholder="Give your story a catchy title..."
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] dark:focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Short Summary</label>
                <input
                  type="text"
                  required
                  placeholder="Write a brief overview/summary quote..."
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] dark:focus:border-teal-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Story Details</label>
                <textarea
                  required
                  placeholder="Share the full details of your story here. HTML/details are supported."
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  rows={5}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] dark:focus:border-teal-500 outline-none resize-none"
                />
              </div>

              {/* Cover image upload */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Cover Image</label>
                <div className="flex flex-col gap-2">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-bold file:bg-teal-50 dark:file:bg-teal-950/20 file:text-[#0d6b66] dark:file:text-teal-400 hover:file:bg-teal-100"
                  />
                  {imagePreviewUrl && (
                    <div className="relative inline-block mt-1 max-w-[200px] border dark:border-slate-800 rounded-lg overflow-hidden">
                      <img src={imagePreviewUrl} alt="Cover Preview" className="max-h-28 object-cover" />
                      <button
                        type="button"
                        onClick={() => {
                          setImagePreviewUrl(null);
                          setImageFile(null);
                          setRemoveExistingImage(true);
                        }}
                        className="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded p-1 text-[10px] font-bold"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Dynamic Links Section */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Related Links</label>
                  <button
                    type="button"
                    onClick={() => setLinks([...links, { url: '', label: '' }])}
                    className="text-xs font-bold text-[#0d6b66] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reference URL
                  </button>
                </div>
                
                {links.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No links added yet. Click 'Add Reference URL' if you want to include links.</p>
                ) : (
                  <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                    {links.map((link, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="url"
                            placeholder="https://example.com/reference-post"
                            value={link.url}
                            onChange={e => {
                              const newLinks = [...links];
                              newLinks[index].url = e.target.value;
                              setLinks(newLinks);
                            }}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Display Label (e.g., Read on Github)"
                            value={link.label}
                            onChange={e => {
                              const newLinks = [...links];
                              newLinks[index].label = e.target.value;
                              setLinks(newLinks);
                            }}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newLinks = links.filter((_, idx) => idx !== index);
                            setLinks(newLinks);
                          }}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-55 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                          title="Remove reference"
                        >
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 justify-end">
                <button
                  type="button"
                  onClick={() => setIsComposerOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] dark:bg-teal-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-[#0b5c58] dark:hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {submitting && (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
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
