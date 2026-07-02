import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  CheckSquare, Plus, Trash2, Loader2, RotateCw, CheckCircle, 
  Circle, Calendar, User, FileText, X, AlertCircle, Pencil 
} from 'lucide-react';
import { cachedApi, api } from '../../shared/api';
import { useToast } from '../../components/ui/Toast';
import ConfirmModal from '../../components/ui/ConfirmModal';
import { databases, storage } from '../../shared/appwrite';
import { 
  DATABASE_ID, 
  COLLECTION_ID_TASKS, 
  COLLECTION_ID_FILES, 
  BUCKET_ID_UPLOADS 
} from '../../shared/constants';
import { Query } from 'appwrite';
import type { TaskDoc, FileDoc } from '../../types/database';

const AdminTasks: React.FC = () => {
  const [tasks, setTasks] = useState<TaskDoc[]>([]);
  const [availableFiles, setAvailableFiles] = useState<FileDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // Current user info
  const [currentUserProfile, setCurrentUserProfile] = useState<any>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Task Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTaskName, setNewTaskName] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [selectedFileIds, setSelectedFileIds] = useState<string[]>([]);
  const [fileSearchQuery, setFileSearchQuery] = useState('');

  // Edit Task Modal State
  const [editingTask, setEditingTask] = useState<TaskDoc | null>(null);
  const [editTaskName, setEditTaskName] = useState('');
  const [editTaskDesc, setEditTaskDesc] = useState('');
  const [editSelectedFileIds, setEditSelectedFileIds] = useState<string[]>([]);

  // Confirm Delete State
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; id: string | null }>({ open: false, id: null });
  const [actionLoading, setActionLoading] = useState(false);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const currentUser = await cachedApi.users.getCurrent();
      if (currentUser) {
        const profile = await cachedApi.users.getAccount(currentUser.$id);
        setCurrentUserProfile(profile);
      }

      // Fetch all tasks and file references in parallel
      const [tasksRes, filesRes] = await Promise.all([
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_TASKS, [
          Query.limit(100),
          Query.orderDesc('$createdAt')
        ]),
        databases.listDocuments(DATABASE_ID, COLLECTION_ID_FILES, [
          Query.limit(500)
        ])
      ]);

      setTasks(tasksRes.documents as TaskDoc[]);
      setAvailableFiles(filesRes.documents as FileDoc[]);

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Tasks list updated successfully.' });
      }
    } catch (err: any) {
      console.error('Failed to load tasks:', err);
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to fetch tasks.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const stats = useMemo(() => {
    const total = tasks.length;
    const completed = tasks.filter(t => t.is_done).length;
    const pending = total - completed;
    return { total, completed, pending };
  }, [tasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskName.trim()) return;

    setSubmitting(true);
    try {
      await api.tasks.create({
        name: newTaskName.trim(),
        description: newTaskDesc.trim(),
        is_done: false,
        connected_files: selectedFileIds
      });

      addToast({ type: 'success', title: 'Task Created', message: 'The task has been successfully created.' });
      setIsAddModalOpen(false);
      setNewTaskName('');
      setNewTaskDesc('');
      setSelectedFileIds([]);
      setFileSearchQuery('');
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create task.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleOpenEdit = (task: TaskDoc) => {
    setEditingTask(task);
    setEditTaskName(task.name || '');
    setEditTaskDesc(task.description || '');
    setEditSelectedFileIds(task.connected_files || []);
    setFileSearchQuery('');
  };

  const handleEditTaskSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask || !editTaskName.trim()) return;

    setSubmitting(true);
    try {
      await api.tasks.update(editingTask.$id, {
        name: editTaskName.trim(),
        description: editTaskDesc.trim(),
        connected_files: editSelectedFileIds
      });

      addToast({ type: 'success', title: 'Task Updated', message: 'Modifications saved successfully.' });
      setEditingTask(null);
      setEditTaskName('');
      setEditTaskDesc('');
      setEditSelectedFileIds([]);
      setFileSearchQuery('');
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to modify task.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleTaskDone = async (task: TaskDoc) => {
    try {
      const nextDone = !task.is_done;
      let userName = 'Staff member';
      
      if (currentUserProfile) {
        if (currentUserProfile.type === 'admin' && currentUserProfile.admins) {
          userName = currentUserProfile.admins.fullName || currentUserProfile.username;
        } else if (currentUserProfile.type === 'officer' && currentUserProfile.students) {
          userName = currentUserProfile.students.name || currentUserProfile.username;
        } else {
          userName = currentUserProfile.username;
        }
      }

      await api.tasks.update(task.$id, {
        is_done: nextDone,
        name_of_done: nextDone ? userName : null,
        time_done: nextDone ? new Date().toISOString() : null
      });

      addToast({ 
        type: 'success', 
        title: nextDone ? 'Task Completed' : 'Task Reopened', 
        message: nextDone ? `Task marked completed by ${userName}.` : 'Task marked as pending review.' 
      });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update task status.' });
    }
  };

  const handleDeleteTask = async () => {
    if (!deleteConfirm.id) return;
    setActionLoading(true);
    try {
      await api.tasks.delete(deleteConfirm.id);
      addToast({ type: 'success', title: 'Task Deleted', message: 'The task was deleted permanently.' });
      setDeleteConfirm({ open: false, id: null });
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete task.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredTasks = useMemo(() => {
    return tasks.filter(t => {
      const matchesStatus = statusFilter === 'completed'
        ? t.is_done
        : statusFilter === 'pending'
          ? !t.is_done
          : true;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch = q
        ? (t.name || '').toLowerCase().includes(q) || (t.description || '').toLowerCase().includes(q)
        : true;

      return matchesStatus && matchesSearch;
    });
  }, [tasks, statusFilter, searchQuery]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white transition-colors">Task Registry</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 transition-colors">
            Collaborate, track operational deliverables, and organize organizational duties.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Task
          </button>
          
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white dark:bg-slate-800 dark:border-slate-700 px-3.5 py-2.5 text-sm font-medium text-slate-770 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 transition-colors shadow-sm cursor-pointer"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center transition-colors">
          <span className="text-xl font-bold text-amber-500 block">{stats.pending}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Pending Tasks</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center transition-colors">
          <span className="text-xl font-bold text-emerald-600 block">{stats.completed}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Completed Tasks</span>
        </div>
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 text-center transition-colors">
          <span className="text-xl font-bold text-[#0d6b66] block">{stats.total}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mt-1">Total Tasks</span>
        </div>
      </div>

      {/* Filters Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto">
          {(['all', 'pending', 'completed'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`flex-1 sm:flex-initial px-4 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                statusFilter === filter
                  ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-white shadow-xs'
                  : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pl-10 pr-4 py-2 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
          />
        </div>
      </div>

      {/* Tasks List */}
      {loading ? (
        <div className="flex justify-center items-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-[#0d6b66]" />
        </div>
      ) : filteredTasks.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center">
          <AlertCircle className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600 mb-3" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">No tasks found</h3>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {searchQuery ? `No tasks match search term "${searchQuery}".` : 'No tasks recorded yet in this category.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {filteredTasks.map(task => (
            <div 
              key={task.$id} 
              className={`rounded-xl border p-5 flex items-start justify-between gap-4 transition-all ${
                task.is_done 
                  ? 'border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-900/30' 
                  : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 hover:shadow-xs'
              }`}
            >
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <button 
                  onClick={() => handleToggleTaskDone(task)} 
                  className="mt-0.5 text-slate-400 hover:text-[#0d6b66] dark:hover:text-teal-400 transition-colors shrink-0 cursor-pointer"
                >
                  {task.is_done ? (
                    <CheckCircle className="h-5 w-5 text-emerald-600 dark:text-emerald-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-slate-300 dark:text-slate-600" />
                  )}
                </button>

                <div className="space-y-1 min-w-0 flex-1">
                  <h3 className={`font-bold text-sm text-slate-800 dark:text-white truncate ${task.is_done ? 'line-through text-slate-400 dark:text-slate-500' : ''}`}>
                    {task.name}
                  </h3>
                  <p className={`text-xs leading-relaxed text-slate-500 dark:text-slate-400 whitespace-pre-wrap ${task.is_done ? 'text-slate-400 dark:text-slate-500' : ''}`}>
                    {task.description || 'No description provided.'}
                  </p>

                  {/* Connected Files */}
                  {task.connected_files && task.connected_files.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {task.connected_files.map((fileId: string) => {
                        const fileDoc = availableFiles.find(f => f.$id === fileId || f.fileID === fileId);
                        if (!fileDoc) return null;
                        const downloadUrl = fileDoc.fileID ? storage.getFileDownload(BUCKET_ID_UPLOADS, fileDoc.fileID) : '#';
                        return (
                          <a
                            key={fileId}
                            href={downloadUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#0d6b66]/20 bg-teal-50/50 hover:bg-teal-50 dark:bg-teal-950/20 dark:border-teal-900/50 dark:hover:bg-teal-950/30 text-[10px] font-semibold text-[#0d6b66] dark:text-teal-400 transition-colors"
                          >
                            <FileText className="h-3 w-3" />
                            {fileDoc.fileName}
                          </a>
                        );
                      })}
                    </div>
                  )}

                  {/* Log Details */}
                  {task.is_done && (
                    <div className="flex flex-wrap gap-x-3 gap-y-1 pt-2 items-center text-[10px] text-slate-400 dark:text-slate-500 font-medium">
                      <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        Completed by: {task.name_of_done || 'Unknown'}
                      </span>
                      {task.time_done && (
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          On: {new Date(task.time_done).toLocaleString()}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 self-start shrink-0">
                <button
                  onClick={() => handleOpenEdit(task)}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all cursor-pointer"
                  title="Edit Task"
                >
                  <Pencil className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setDeleteConfirm({ open: true, id: task.$id })}
                  className="rounded-lg p-1.5 text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all cursor-pointer"
                  title="Delete Task"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Task Modal */}
      {isAddModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setIsAddModalOpen(false)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Create New Task</h2>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={newTaskName}
                  onChange={e => setNewTaskName(e.target.value)}
                  placeholder="e.g. Set up logistics for general assembly"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={newTaskDesc}
                  onChange={e => setNewTaskDesc(e.target.value)}
                  placeholder="Provide specific notes or action items for this task..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] transition-colors"
                />
              </div>

              {/* Connect Files checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Connect Documents / Files</label>
                {availableFiles.length === 0 ? (
                  <p className="text-xs text-slate-450 dark:text-slate-500 italic">No shared documents available in the system library.</p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Filter files list..."
                      value={fileSearchQuery}
                      onChange={e => setFileSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/50">
                      {availableFiles
                        .filter(f => (f.fileName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()))
                        .map(file => {
                          const isChecked = selectedFileIds.includes(file.$id);
                          return (
                            <label key={file.$id} className="flex items-start gap-2.5 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setSelectedFileIds(prev => prev.filter(id => id !== file.$id));
                                  } else {
                                    setSelectedFileIds(prev => [...prev, file.$id]);
                                  }
                                }}
                                className="mt-0.5 rounded text-[#0d6b66] focus:ring-[#0d6b66]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{file.fileName}</p>
                                {file.description && <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{file.description}</p>}
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Edit Task Modal */}
      {editingTask && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setEditingTask(null)}>
          <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
              <h2 className="text-base font-bold text-slate-800 dark:text-white">Modify Task Details</h2>
              <button onClick={() => setEditingTask(null)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditTaskSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Task Title</label>
                <input
                  type="text"
                  required
                  maxLength={150}
                  value={editTaskName}
                  onChange={e => setEditTaskName(e.target.value)}
                  placeholder="Task title..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1">Description / Details</label>
                <textarea
                  rows={3}
                  maxLength={1000}
                  value={editTaskDesc}
                  onChange={e => setEditTaskDesc(e.target.value)}
                  placeholder="Task details..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 px-4 py-2.5 text-sm text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] transition-colors"
                />
              </div>

              {/* Edit Connect Files checklist */}
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide mb-1.5">Connect Documents / Files</label>
                {availableFiles.length === 0 ? (
                  <p className="text-xs text-slate-450 dark:text-slate-500 italic">No shared documents available in the system library.</p>
                ) : (
                  <div className="space-y-2">
                    <input
                      type="text"
                      placeholder="Filter files list..."
                      value={fileSearchQuery}
                      onChange={e => setFileSearchQuery(e.target.value)}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-750 bg-white dark:bg-slate-950 px-3 py-1.5 text-xs text-slate-900 dark:text-white outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                    />
                    <div className="max-h-36 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-lg p-2.5 space-y-1.5 bg-slate-50/50 dark:bg-slate-950/50">
                      {availableFiles
                        .filter(f => (f.fileName || '').toLowerCase().includes(fileSearchQuery.toLowerCase()))
                        .map(file => {
                          const isChecked = editSelectedFileIds.includes(file.$id);
                          return (
                            <label key={file.$id} className="flex items-start gap-2.5 p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer transition-colors text-xs text-slate-700 dark:text-slate-300">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => {
                                  if (isChecked) {
                                    setEditSelectedFileIds(prev => prev.filter(id => id !== file.$id));
                                  } else {
                                    setEditSelectedFileIds(prev => [...prev, file.$id]);
                                  }
                                }}
                                className="mt-0.5 rounded text-[#0d6b66] focus:ring-[#0d6b66]"
                              />
                              <div className="min-w-0 flex-1">
                                <p className="font-semibold truncate">{file.fileName}</p>
                                {file.description && <p className="text-[9px] text-slate-400 dark:text-slate-500 truncate mt-0.5">{file.description}</p>}
                              </div>
                            </label>
                          );
                        })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 justify-end shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-colors flex items-center gap-2 cursor-pointer"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Confirm Delete Dialog */}
      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, id: null })}
        onConfirm={handleDeleteTask}
        title="Delete Task Deliverable"
        message="Are you sure you want to delete this task? This operational log will be permanently purged. This cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />
    </div>
  );
};

export default AdminTasks;
