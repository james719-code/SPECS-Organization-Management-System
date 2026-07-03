import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw, BookOpen, Clock, Globe, Award, CheckCircle2, UserCheck, ShieldAlert, ShieldCheck, Eye, Trash2, Edit3, Search, Calendar, User, FileText, Check, X, ExternalLink, RefreshCw } from 'lucide-react';
import { cachedApi } from '../../shared/api';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { useToast } from '../../components/ui/Toast';
import { databases, storage, functions } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_STORIES, COLLECTION_ID_STUDENTS, FUNCTION_ID } from '../../shared/constants';
import { Query, ID } from 'appwrite';
import type { StoryDoc } from '../../types/database';

const BUCKET_ID_HIGHLIGHT_IMAGES = import.meta.env.VITE_BUCKET_ID_HIGHLIGHT_IMAGES || 'highlight-images';

interface StoryLink {
  url: string;
  label: string;
}

const AdminStories: React.FC = () => {
  const [stories, setStories] = useState<StoryDoc[]>([]);
  const [studentLookup, setStudentLookup] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  const [userRole, setUserRole] = useState<'admin' | 'officer' | 'student' | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'pending_officer' | 'pending_admin' | 'published' | 'all'>('pending_officer');
  const [searchQuery, setSearchQuery] = useState('');

  // Viewing state
  const [viewingStory, setViewingStory] = useState<StoryDoc | null>(null);

  // Editing state
  const [editingStory, setEditingStory] = useState<StoryDoc | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editContent, setEditContent] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [removeExistingImage, setRemoveExistingImage] = useState(false);
  const [editLinks, setEditLinks] = useState<StoryLink[]>([]);
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

      // Fetch user profile and role to adjust filters automatically
      const currentUser = await cachedApi.users.getCurrent();
      if (currentUser) {
        const profile = await cachedApi.users.getAccount(currentUser.$id);
        setUserRole(profile.type);
        if (profile.type === 'admin') {
          setStatusFilter('pending_admin');
        } else {
          setStatusFilter('pending_officer');
        }
      }

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
    const pendingOfficer = stories.filter(s => !s.officerApproval && !s.isAccepted).length;
    const pendingAdmin = stories.filter(s => s.officerApproval && !s.isAccepted).length;
    const published = stories.filter(s => s.isAccepted).length;
    return { pendingOfficer, pendingAdmin, published, total: stories.length };
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

    // Map related links and meanings
    const urls = story.related_links || [];
    const meanings = story.meaning || [];
    const mappedLinks = urls.map((url: string, index: number) => ({
      url,
      label: meanings[index] || ''
    }));
    setEditLinks(mappedLinks.length > 0 ? mappedLinks : [{ url: '', label: '' }]);

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

      const filteredLinks = editLinks.filter(l => l.url.trim() !== '');
      const urls = filteredLinks.map(l => l.url.trim());
      const meanings = filteredLinks.map(l => l.label.trim() || l.url.trim());

      await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, editingStory.$id, {
        title: editTitle.trim(),
        post_description: editDesc.trim(),
        post_details: editContent.trim(),
        image_bucket: imageId,
        related_links: urls,
        meaning: meanings
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
      const story = stories.find(s => s.$id === publishConfirm.id);
      if (!story) return;

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
        const updates: any = {};
        if (userRole === 'admin') {
          updates.adminApproval = true;
          updates.officerApproval = true; // Mark officer approved too if admin override
          updates.isAccepted = true;
        } else {
          updates.officerApproval = true;
        }
        await databases.updateDocument(DATABASE_ID, COLLECTION_ID_STORIES, publishConfirm.id, updates);
      }

      addToast({ 
        type: 'success', 
        title: userRole === 'admin' ? 'Published' : 'Officer Approved', 
        message: userRole === 'admin' ? 'Story successfully published to highlights.' : 'Story approved and forwarded to admin queue.' 
      });
      setPublishConfirm({ open: false, id: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update story status.' });
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
      let matchesStatus = true;
      if (statusFilter === 'pending_officer') {
        matchesStatus = !s.officerApproval && !s.isAccepted;
      } else if (statusFilter === 'pending_admin') {
        matchesStatus = s.officerApproval && !s.isAccepted;
      } else if (statusFilter === 'published') {
        matchesStatus = s.isAccepted;
      }

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q
        ? (s.title || '').toLowerCase().includes(q) || (s.post_description || '').toLowerCase().includes(q)
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [stories, statusFilter, searchQuery]);

  return (
    <div className="space-y-6 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-200 min-h-screen pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 pb-5 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-900 dark:text-white">Manage Stories</h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Approve, edit, and publish volunteer highlight stories.</p>
          </div>
        </div>
        
        {/* Controls: Search, Reload */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search stories..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 pl-10 pr-4 py-2.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#0d6b66] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#0d6b66] outline-none transition-all duration-200"
            />
          </div>
          
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-850 disabled:opacity-50 transition-all shadow-xs cursor-pointer active:scale-95"
            title="Reload Stories Log"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 dark:text-slate-400 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Sync Stories</span>
          </button>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Pending Officer */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group hover:-translate-y-0.5">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Pending Officer</span>
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">{stats.pendingOfficer}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shadow-xs">
            <Clock className="h-5 w-5" />
          </div>
        </div>

        {/* Card 2: Pending Admin */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group hover:-translate-y-0.5">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Pending Admin</span>
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">{stats.pendingAdmin}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shadow-xs">
            <ShieldAlert className="h-5 w-5" />
          </div>
        </div>

        {/* Card 3: Published */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group hover:-translate-y-0.5">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Published</span>
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">{stats.published}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shadow-xs">
            <Globe className="h-5 w-5" />
          </div>
        </div>

        {/* Card 4: Total Stories */}
        <div className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/60 p-5 shadow-xs hover:shadow-md transition-all duration-300 flex items-center justify-between group hover:-translate-y-0.5">
          <div className="space-y-1.5 text-left">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest block">Total Stories</span>
            <span className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight block">{stats.total}</span>
          </div>
          <div className="h-10 w-10 rounded-xl bg-[#0d6b66]/10 dark:bg-teal-500/10 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shadow-xs">
            <BookOpen className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Pill-Based Status Switcher Tabs */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-2xl bg-slate-100/60 dark:bg-slate-900 border border-slate-200/30 dark:border-slate-800/40 w-fit">
        <button
          onClick={() => setStatusFilter('pending_officer')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            statusFilter === 'pending_officer'
              ? 'bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-sm shadow-[#0d6b66]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-850'
          }`}
        >
          <span>Pending Officer Review</span>
          <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
            statusFilter === 'pending_officer' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>{stats.pendingOfficer}</span>
        </button>

        <button
          onClick={() => setStatusFilter('pending_admin')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            statusFilter === 'pending_admin'
              ? 'bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-sm shadow-[#0d6b66]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-850'
          }`}
        >
          <span>Pending Admin Review</span>
          <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
            statusFilter === 'pending_admin' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>{stats.pendingAdmin}</span>
        </button>

        <button
          onClick={() => setStatusFilter('published')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            statusFilter === 'published'
              ? 'bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-sm shadow-[#0d6b66]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-850'
          }`}
        >
          <span>Published Only</span>
          <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
            statusFilter === 'published' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>{stats.published}</span>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer ${
            statusFilter === 'all'
              ? 'bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-sm shadow-[#0d6b66]/20'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-200/40 dark:hover:bg-slate-850'
          }`}
        >
          <span>All Stories</span>
          <span className={`px-2 py-0.5 text-[9px] rounded-full font-extrabold ${
            statusFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-800 text-slate-500'
          }`}>{stats.total}</span>
        </button>
      </div>

      {/* Grid listing */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : filteredStories.length === 0 ? (
        <EmptyState
          title="No Stories Found"
          description={searchQuery ? `No stories match search term "${searchQuery}".` : 'No stories found in the selected category.'}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredStories.map(story => {
            const studentId = story.students?.$id || story.students || '';
            const authorName = story.author || (story.students as any)?.name || studentLookup[studentId] || 'SPECS Contributor';
            
            // Get cover image URL
            const imageUrl = story.image_bucket ? storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, story.image_bucket, 400, 250) : null;

            return (
              <div key={story.$id} className="rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden hover:shadow-xl hover:shadow-slate-100/50 dark:hover:shadow-black/20 hover:-translate-y-0.5 transition-all duration-300 flex flex-col justify-between">
                <div 
                  onClick={() => setViewingStory(story)} 
                  className="cursor-pointer group flex-1"
                >
                  {imageUrl ? (
                    <img src={imageUrl} alt={story.title || ''} className="w-full h-44 object-cover border-b border-slate-100 dark:border-slate-800 group-hover:opacity-95 transition-opacity" />
                  ) : (
                    <div className="w-full h-44 bg-slate-50 dark:bg-slate-950/40 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-slate-350 dark:text-slate-650 gap-1.5 group-hover:bg-slate-100/50 transition-colors">
                      <BookOpen className="h-8 w-8 text-slate-350 dark:text-slate-655 opacity-60" />
                      <span className="text-[10px] font-bold tracking-widest uppercase text-slate-400">SPECS STORY</span>
                    </div>
                  )}

                  <div className="p-5 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      {story.isAccepted ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-emerald-700 dark:text-emerald-450 uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Published
                        </span>
                      ) : story.officerApproval ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-indigo-700 dark:text-indigo-455 uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 animate-pulse" />
                          Pending Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 px-2.5 py-0.5 text-[9px] font-extrabold text-amber-700 dark:text-amber-455 uppercase tracking-wide">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                          Pending Officer
                        </span>
                      )}
                      
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-semibold">
                        <Calendar className="h-3 w-3" />
                        <span>{new Date(story.$createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span>
                      </div>
                    </div>

                    <h3 className="font-extrabold text-slate-800 dark:text-white text-base line-clamp-1 group-hover:text-[#0d6b66] dark:group-hover:text-teal-400 transition-colors leading-snug tracking-tight">{story.title || 'Untitled'}</h3>
                    
                    <div className="flex items-center gap-1 text-xs text-slate-400 dark:text-slate-500 font-bold">
                      <User className="h-3 w-3 text-slate-350 dark:text-slate-655" />
                      <span>{authorName}</span>
                    </div>
                    
                    <p className="text-xs text-slate-550 dark:text-slate-400 line-clamp-3 leading-relaxed mt-2.5 font-medium">{story.post_description || 'No description provided.'}</p>
                  </div>
                </div>

                {/* Progress Stepper Timeline inside AdminStories card */}
                <div className="px-5 pb-4">
                  <div className="pt-4 border-t border-slate-100 dark:border-slate-800/80">
                    <div className="flex items-center justify-between relative px-3 z-0">
                      {/* Connecting Line Track */}
                      <div className="absolute top-[10px] left-5 right-5 h-[2px] bg-slate-100 dark:bg-slate-850 rounded-full" />
                      {/* Active Track Highlight */}
                      <div 
                        className="absolute top-[10px] left-5 h-[2px] bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: story.isAccepted ? '86%' : story.officerApproval ? '43%' : '0%' }}
                      />

                      {/* Step 1: Submitted */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className="h-5 w-5 rounded-full bg-[#0d6b66] dark:bg-teal-500 text-white flex items-center justify-center text-[9px] font-black border-2 border-white dark:border-slate-900 shadow-sm">
                          <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                        </div>
                        <span className="text-[8px] font-bold text-slate-500 mt-1">Submitted</span>
                      </div>

                      {/* Step 2: Officer */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 shadow-xs transition-all duration-300 ${
                          story.officerApproval || story.isAccepted
                            ? 'bg-[#0d6b66] dark:bg-teal-500 border-white dark:border-slate-900 text-white' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-850 text-slate-400'
                        }`}>
                          {story.officerApproval || story.isAccepted ? (
                            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                          ) : (
                            <UserCheck className="h-2.5 w-2.5" />
                          )}
                        </div>
                        <span className={`text-[8px] font-bold mt-1 transition-colors ${
                          story.officerApproval || story.isAccepted ? 'text-[#0d6b66] dark:text-teal-400' : 'text-slate-400'
                        }`}>Officer</span>
                      </div>

                      {/* Step 3: Admin */}
                      <div className="flex flex-col items-center relative z-10">
                        <div className={`h-5 w-5 rounded-full flex items-center justify-center text-[9px] font-bold border-2 shadow-xs transition-all duration-300 ${
                          story.isAccepted 
                            ? 'bg-emerald-600 dark:bg-emerald-500 border-white dark:border-slate-900 text-white' 
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-855 text-slate-400'
                        }`}>
                          {story.isAccepted ? (
                            <Check className="h-2.5 w-2.5" strokeWidth={3.5} />
                          ) : (
                            <ShieldCheck className="h-2.5 w-2.5" />
                          )}
                        </div>
                        <span className={`text-[8px] font-bold mt-1 transition-colors ${
                          story.isAccepted ? 'text-emerald-600 dark:text-emerald-450' : 'text-slate-400'
                        }`}>Admin</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Administrative Approvals & Modification Actions */}
                <div className="p-5 pt-0 border-t border-slate-100/50 dark:border-slate-800/40 flex flex-col gap-2.5 mt-2">
                  {!story.isAccepted && (
                    userRole === 'admin' ? (
                      <button
                        onClick={() => setPublishConfirm({ open: true, id: story.$id })}
                        className="w-full rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 dark:from-emerald-500 dark:to-teal-500 dark:hover:from-emerald-600 dark:hover:to-teal-600 text-white font-bold text-xs py-2.5 transition-all duration-200 hover:scale-[1.02] shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <ShieldCheck className="h-3.5 w-3.5" />
                        {story.officerApproval ? 'Publish Story' : 'Publish (Override)'}
                      </button>
                    ) : userRole === 'officer' ? (
                      !story.officerApproval ? (
                        <button
                          onClick={() => setPublishConfirm({ open: true, id: story.$id })}
                          className="w-full rounded-xl bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-bold text-xs py-2.5 transition-all duration-200 hover:scale-[1.02] shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                        >
                          <UserCheck className="h-3.5 w-3.5" />
                          Officer Approve
                        </button>
                      ) : (
                        <div className="w-full rounded-xl bg-slate-100/60 dark:bg-slate-850/60 text-slate-400 dark:text-slate-500 font-bold text-center text-xs py-2.5 flex items-center justify-center gap-1.5 select-none border border-slate-200/20 dark:border-slate-800/20">
                          <Clock className="h-3.5 w-3.5 animate-pulse text-amber-500" />
                          Awaiting Admin Final
                        </div>
                      )
                    ) : null
                  )}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleOpenEdit(story)}
                      className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-[#0d6b66]/30 dark:hover:border-teal-500/30 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 text-slate-700 dark:text-slate-200 py-2.5 text-xs font-bold transition-all duration-200 flex items-center justify-center gap-1.5 cursor-pointer hover:shadow-xs"
                    >
                      <Edit3 className="h-3.5 w-3.5 text-slate-450" />
                      Edit
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ open: true, id: story.$id })}
                      className="flex-1 rounded-xl border border-red-200 dark:border-red-900/30 bg-red-50/50 dark:bg-red-950/20 text-red-650 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 py-2.5 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 hover:scale-[1.02]"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setEditingStory(null)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Edit Highlight Story</h2>
              <button onClick={() => setEditingStory(null)} className="text-slate-450 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Title</label>
                <input
                  type="text"
                  required
                  maxLength={200}
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={editDesc}
                  onChange={e => setEditDesc(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Full Content Details</label>
                <textarea
                  required
                  rows={5}
                  value={editContent}
                  onChange={e => setEditContent(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] dark:focus:border-teal-500 focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Cover Image</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-55 dark:file:bg-slate-800 file:text-slate-700 dark:file:text-slate-350 hover:file:bg-slate-100 cursor-pointer"
                />
                
                {imagePreviewUrl && (
                  <div className="mt-3 relative inline-block rounded-lg overflow-hidden border dark:border-slate-800">
                    <img src={imagePreviewUrl} alt="Preview" className="max-h-40 max-w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        setImagePreviewUrl(null);
                        setEditImageFile(null);
                        setRemoveExistingImage(true);
                      }}
                      className="absolute top-2 right-2 bg-red-650 hover:bg-red-700 text-white rounded-lg p-1.5 shadow-xs text-xs font-bold"
                    >
                      Remove cover
                    </button>
                  </div>
                )}
              </div>

              {/* Dynamic Related Links Editor */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">Related Links</label>
                  <button
                    type="button"
                    onClick={() => setEditLinks([...editLinks, { url: '', label: '' }])}
                    className="text-xs font-bold text-[#0d6b66] dark:text-teal-400 hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                    </svg>
                    Add Reference URL
                  </button>
                </div>
                
                {editLinks.length === 0 ? (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">No links attached.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {editLinks.map((link, index) => (
                      <div key={index} className="flex gap-2 items-center bg-slate-50 dark:bg-slate-900/60 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="flex-1 space-y-1.5">
                          <input
                            type="url"
                            placeholder="https://example.com"
                            value={link.url}
                            onChange={e => {
                              const newLinks = [...editLinks];
                              newLinks[index].url = e.target.value;
                              setEditLinks(newLinks);
                            }}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Friendly Label (e.g. Documentation)"
                            value={link.label}
                            onChange={e => {
                              const newLinks = [...editLinks];
                              newLinks[index].label = e.target.value;
                              setEditLinks(newLinks);
                            }}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-xs text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                          />
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            const newLinks = editLinks.filter((_, idx) => idx !== index);
                            setEditLinks(newLinks);
                          }}
                          className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
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

              <div className="flex gap-3 pt-4 border-t border-slate-200 dark:border-slate-800 justify-end">
                <button
                  type="button"
                  onClick={() => setEditingStory(null)}
                  className="rounded-lg border border-slate-200 dark:border-slate-800 px-5 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingEdit}
                  className="rounded-lg bg-[#0d6b66] dark:bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] dark:hover:bg-teal-700 disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {submittingEdit && (
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth={4} />
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

      {/* View Story Modal */}
      {viewingStory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 dark:bg-black/70 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setViewingStory(null)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">View Story Preview</h2>
              <button onClick={() => setViewingStory(null)} className="text-slate-450 hover:text-slate-655 dark:text-slate-500 dark:hover:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 p-1.5 rounded-lg transition-colors cursor-pointer" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4">
              {viewingStory.image_bucket && (
                <img 
                  src={storage.getFilePreview(BUCKET_ID_HIGHLIGHT_IMAGES, viewingStory.image_bucket, 800, 400)} 
                  alt={viewingStory.title || ''} 
                  className="w-full h-64 object-cover rounded-xl border dark:border-slate-800 shadow-xs" 
                />
              )}
              
              <div className="space-y-1">
                <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white leading-tight">{viewingStory.title || 'Untitled'}</h1>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-450 dark:text-slate-500">
                  <span>By {viewingStory.author || 'SPECS Contributor'}</span>
                  <span>•</span>
                  <span>{new Date(viewingStory.$createdAt).toLocaleDateString()}</span>
                  <span>•</span>
                  <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    viewingStory.isAccepted 
                      ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' 
                      : 'bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border border-amber-100 dark:border-amber-900/30'
                  }`}>
                    {viewingStory.isAccepted ? 'Published' : 'Pending Approval'}
                  </span>
                </div>
              </div>

              {viewingStory.post_description && (
                <div className="p-4 bg-slate-50 dark:bg-slate-950/50 rounded-xl border border-slate-100 dark:border-slate-800/80 italic text-slate-600 dark:text-slate-400 text-sm">
                  {viewingStory.post_description}
                </div>
              )}

              <div className="text-sm text-slate-700 dark:text-slate-350 leading-relaxed whitespace-pre-wrap font-normal">
                {viewingStory.post_details || 'No detail content provided.'}
              </div>

              {viewingStory.related_links && viewingStory.related_links.length > 0 && (
                <div className="pt-4 border-t border-slate-200 dark:border-slate-800 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Related Links</h4>
                  <div className="flex flex-col gap-1.5">
                    {viewingStory.related_links.map((link: string, idx: number) => {
                      const label = (viewingStory.meaning && viewingStory.meaning[idx]) || link;
                      return (
                        <a 
                          key={idx} 
                          href={link} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-[#0d6b66] dark:text-teal-400 hover:underline text-xs font-bold flex items-center gap-1"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                          {label}
                        </a>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/60 flex justify-end gap-2">
              {!viewingStory.isAccepted && (
                userRole === 'admin' ? (
                  <button
                    onClick={() => {
                      setPublishConfirm({ open: true, id: viewingStory.$id });
                      setViewingStory(null);
                    }}
                    className="rounded-lg bg-[#0d6b66] dark:bg-teal-600 hover:bg-[#0b5c58] dark:hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    {viewingStory.officerApproval ? 'Publish Story' : 'Publish (Override)'}
                  </button>
                ) : userRole === 'officer' && !viewingStory.officerApproval ? (
                  <button
                    onClick={() => {
                      setPublishConfirm({ open: true, id: viewingStory.$id });
                      setViewingStory(null);
                    }}
                    className="rounded-lg bg-[#0d6b66] dark:bg-teal-600 hover:bg-[#0b5c58] dark:hover:bg-teal-700 text-white px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
                  >
                    Officer Approve
                  </button>
                ) : null
              )}
              <button
                onClick={() => {
                  handleOpenEdit(viewingStory);
                  setViewingStory(null);
                }}
                className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                Edit
              </button>
              <button
                onClick={() => setViewingStory(null)}
                className="rounded-lg bg-slate-200 dark:bg-slate-800 hover:bg-slate-350 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 px-4 py-2 text-xs font-bold transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
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
