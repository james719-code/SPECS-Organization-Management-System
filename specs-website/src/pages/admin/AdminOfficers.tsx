import React, { useState, useEffect, useMemo } from 'react';
import { RotateCw, Shield, Edit2, Check, AlertCircle, Users, X, Grid, List } from 'lucide-react';
import { cachedApi, api } from '../../shared/api';
import { storage } from '../../shared/appwrite';
import { BUCKET_ID_PICTURES } from '../../shared/constants';
import { useToast } from '../../components/ui/Toast';
import type { OfficerDoc, StudentDoc } from '../../types/database';

const POSITION_METADATA: Record<string, { label: string; limit: number; badgeColor: string }> = {
  'president': { label: 'President', limit: 1, badgeColor: 'bg-amber-100 text-amber-800 dark:bg-amber-955/30 dark:text-amber-300 border-amber-200 dark:border-amber-900/50' },
  'vice-president-internal': { label: 'Vice-President Internal Affairs', limit: 1, badgeColor: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-955/30 dark:text-indigo-300 border-indigo-200 dark:border-indigo-900/50' },
  'vice-president-external': { label: 'Vice-President External Affairs', limit: 1, badgeColor: 'bg-purple-100 text-purple-800 dark:bg-purple-955/30 dark:text-purple-300 border-purple-200 dark:border-purple-900/50' },
  'secretary': { label: 'Secretary', limit: 1, badgeColor: 'bg-blue-100 text-blue-800 dark:bg-blue-955/30 dark:text-blue-300 border-blue-200 dark:border-blue-900/50' },
  'asst-secretary': { label: 'Assistant Secretary', limit: 1, badgeColor: 'bg-sky-100 text-sky-800 dark:bg-sky-955/30 dark:text-sky-300 border-sky-200 dark:border-sky-900/50' },
  'treasurer': { label: 'Treasurer', limit: 1, badgeColor: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955/30 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900/50' },
  'asst-treasurer': { label: 'Assistant Treasurer', limit: 1, badgeColor: 'bg-teal-100 text-teal-800 dark:bg-teal-955/30 dark:text-teal-300 border-teal-200 dark:border-teal-900/50' },
  'auditor': { label: 'Auditor', limit: 1, badgeColor: 'bg-rose-100 text-rose-800 dark:bg-rose-955/30 dark:text-rose-300 border-rose-200 dark:border-rose-900/50' },
  'p.i.o': { label: 'P.I.O', limit: 1, badgeColor: 'bg-orange-100 text-orange-800 dark:bg-orange-955/30 dark:text-orange-300 border-orange-200 dark:border-orange-900/50' },
  'business-mngr-1': { label: 'Business Manager (1)', limit: 1, badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-955/30 dark:text-pink-300 border-pink-200 dark:border-pink-900/50' },
  'business-mngr-2': { label: 'Business Manager (2)', limit: 1, badgeColor: 'bg-pink-100 text-pink-800 dark:bg-pink-955/30 dark:text-pink-300 border-pink-200 dark:border-pink-900/50' },
  'srgt-arms-1': { label: 'Sergeant at Arms (1)', limit: 1, badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-955/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/50' },
  'sgrt-arms-2': { label: 'Sergeant at Arms (2)', limit: 1, badgeColor: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-955/30 dark:text-cyan-300 border-cyan-200 dark:border-cyan-900/50' },
  'representative': { label: 'Representative', limit: 8, badgeColor: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700' }
};

const AdminOfficers: React.FC = () => {
  const [officers, setOfficers] = useState<OfficerDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Single edit modal state
  const [editOfficer, setEditOfficer] = useState<OfficerDoc | null>(null);
  const [editPosition, setEditPosition] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [validationError, setValidationError] = useState('');

  // Drag & Drop / Click-to-assign states
  const [draggingOfficerId, setDraggingOfficerId] = useState<string | null>(null);
  const [activeSelectOfficerId, setActiveSelectOfficerId] = useState<string | null>(null);

  const { addToast } = useToast();

  const loadOfficers = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const res = await cachedApi.officers.listAll(isRefresh ? 0 : 2 * 60 * 1000);
      setOfficers(res.documents);

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Officers database updated.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to fetch officers.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadOfficers();
  }, []);

  // Filter officers based on search query
  const filteredOfficers = useMemo(() => {
    return officers.filter(officer => {
      const student = officer.students && typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
      const name = student?.name || '';
      const email = student?.email || '';
      const stdId = student?.student_id?.toString() || '';
      const posLabel = officer.position ? (POSITION_METADATA[officer.position]?.label || officer.position) : 'Unassigned';

      const q = searchQuery.toLowerCase();
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        stdId.includes(q) ||
        posLabel.toLowerCase().includes(q)
      );
    });
  }, [officers, searchQuery]);

  // Compute position fill stats
  const positionStats = useMemo(() => {
    const counts: Record<string, number> = {};
    Object.keys(POSITION_METADATA).forEach(key => {
      counts[key] = 0;
    });

    officers.forEach(o => {
      if (o.position && counts[o.position] !== undefined) {
        counts[o.position]++;
      }
    });

    return counts;
  }, [officers]);

  // Validate single position assignment
  const validateAssignment = (targetPosition: string, officerId: string) => {
    if (!targetPosition) return '';
    const meta = POSITION_METADATA[targetPosition];
    if (!meta) return 'Invalid position selected.';

    if (targetPosition === 'representative') {
      const current = officers.filter(o => o.position === 'representative' && o.$id !== officerId).length;
      if (current >= 8) {
        return `Cannot assign 'Representative' position. Limit is 8 and all slots are currently filled.`;
      }
    } else {
      const current = officers.filter(o => o.position === targetPosition && o.$id !== officerId).length;
      if (current >= meta.limit) {
        return `Cannot assign '${meta.label}' position. The limit is ${meta.limit} and the slot is already filled.`;
      }
    }
    return '';
  };

  const handleSingleSave = async () => {
    if (!editOfficer) return;
    setValidationError('');

    const error = validateAssignment(editPosition, editOfficer.$id);
    if (error) {
      setValidationError(error);
      return;
    }

    setActionLoading(true);
    try {
      await api.officers.update(editOfficer.$id, { position: editPosition || null });
      addToast({ type: 'success', title: 'Success', message: 'Officer position updated successfully.' });
      setEditOfficer(null);
      setEditPosition('');
      api.cache.clearTags(['dashboard']);
      loadOfficers(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to update position.' });
    } finally {
      setActionLoading(false);
    }
  };

  // Inline assignment with swapping support
  const handleAssignInline = async (officerId: string, targetPosition: string) => {
    const officerA = officers.find(o => o.$id === officerId);
    if (!officerA) return;

    const currentPosA = officerA.position || '';
    if (currentPosA === targetPosition) return; // No change

    // If targetPosition is empty (unassigning)
    if (!targetPosition) {
      setActionLoading(true);
      try {
        await api.officers.update(officerId, { position: null });
        addToast({ type: 'success', title: 'Unassigned', message: 'Officer position unassigned.' });
        api.cache.clearTags(['dashboard']);
        loadOfficers(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to unassign position.' });
      } finally {
        setActionLoading(false);
      }
      return;
    }

    const meta = POSITION_METADATA[targetPosition];
    if (!meta) return;

    // Retrieve other occupants of targetPosition
    const occupants = officers.filter(o => o.position === targetPosition && o.$id !== officerId);

    // Swap condition: single-slot position and already occupied
    if (meta.limit === 1 && occupants.length >= 1) {
      const officerB = occupants[0];
      
      setActionLoading(true);
      try {
        // Swap: A gets targetPosition, B gets currentPosA (could be null)
        await Promise.all([
          api.officers.update(officerA.$id, { position: targetPosition }),
          api.officers.update(officerB.$id, { position: currentPosA || null })
        ]);
        
        const nameA = (officerA.students as any)?.name || 'Officer';
        const nameB = (officerB.students as any)?.name || 'Officer';
        
        addToast({ 
          type: 'success', 
          title: 'Swapped', 
          message: `Swapped: "${nameA}" is now ${meta.label}, "${nameB}" is now ${currentPosA ? POSITION_METADATA[currentPosA]?.label : 'Unassigned'}.` 
        });
        
        api.cache.clearTags(['dashboard']);
        loadOfficers(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to swap positions.' });
      } finally {
        setActionLoading(false);
      }
    } else {
      // General assignment (either has slot or is Representative under 8 limit)
      if (targetPosition === 'representative' && occupants.length >= 8) {
        addToast({
          type: 'warning',
          title: 'Slot Limit Reached',
          message: `Cannot assign. Representative position is full (8/8).`
        });
        return;
      }

      setActionLoading(true);
      try {
        await api.officers.update(officerA.$id, { position: targetPosition });
        addToast({ type: 'success', title: 'Assigned', message: `Officer assigned as ${meta.label}.` });
        api.cache.clearTags(['dashboard']);
        loadOfficers(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to assign position.' });
      } finally {
        setActionLoading(false);
      }
    }
  };

  const getAvatarUrl = (pictureId?: string | null) => {
    if (!pictureId) return null;
    const bucket = BUCKET_ID_PICTURES || '688643030009e8bbf324';
    try {
      return storage.getFileView(bucket, pictureId);
    } catch {
      return null;
    }
  };

  // Helper for rendering Draggable Officer Card
  const renderDraggableOfficerCard = (officer: OfficerDoc, isHorizontal = false) => {
    const student = officer.students && typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
    const name = student?.name || 'Unknown Officer';
    const isSelected = activeSelectOfficerId === officer.$id;
    const initials = name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();

    const avatar = getAvatarUrl(officer.pictureId);

    return (
      <div
        key={officer.$id}
        draggable={true}
        onDragStart={(e) => {
          e.dataTransfer.setData('text/plain', officer.$id);
          setDraggingOfficerId(officer.$id);
        }}
        onDragEnd={() => setDraggingOfficerId(null)}
        onClick={(e) => {
          e.stopPropagation();
          setActiveSelectOfficerId(isSelected ? null : officer.$id);
        }}
        className={`p-2 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all select-none ${
          isHorizontal ? 'w-48 flex-shrink-0' : 'w-full'
        } ${
          isSelected
            ? 'bg-[#0d6b66] border-[#0d6b66] text-white ring-2 ring-[#0d6b66]/30 cursor-pointer shadow-md'
            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-200 hover:border-[#0d6b66]/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/50 cursor-grab active:cursor-grabbing shadow-xs'
        }`}
      >
        <div className="flex items-center gap-2 max-w-[85%]">
          {avatar ? (
            <img src={avatar.toString()} alt={name} className="h-5 w-5 rounded-full object-cover" />
          ) : (
            <div className="h-5 w-5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 flex items-center justify-center text-[9px] font-bold border dark:border-slate-700">
              {initials}
            </div>
          )}
          <span className="truncate">{name}</span>
        </div>
        {officer.position && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleAssignInline(officer.$id, '');
            }}
            className="text-slate-400 hover:text-red-500 transition-colors flex-shrink-0 ml-1"
            title="Remove Position"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <Shield className="h-6 w-6 text-[#0d6b66] dark:text-[#149a93]" />
            Officer Positions Control
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Drag and drop officers to positions, swap single-slot roles, or unassign roles directly.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* View Toggle */}
          <div className="flex items-center gap-1 border border-slate-200 dark:border-slate-800 rounded-lg p-0.5 bg-white dark:bg-slate-900 shadow-xs">
            <button
              onClick={() => { setViewMode('board'); setActiveSelectOfficerId(null); }}
              className={`rounded-md p-2 flex items-center gap-1 text-xs font-semibold transition-colors ${viewMode === 'board' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="Board View"
            >
              <Grid className="h-4 w-4" />
              <span>Board View</span>
            </button>
            <button
              onClick={() => { setViewMode('list'); setActiveSelectOfficerId(null); }}
              className={`rounded-md p-2 flex items-center gap-1 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-[#0d6b66] text-white shadow-sm' : 'text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'}`}
              title="List View"
            >
              <List className="h-4 w-4" />
              <span>List View</span>
            </button>
          </div>

          <button
            onClick={() => loadOfficers(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-3.5 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 shadow-sm transition-all disabled:opacity-50"
          >
            <RotateCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Workspace */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-12 h-64">
          <RotateCw className="h-8 w-8 animate-spin text-[#0d6b66]" />
          <span className="text-sm font-medium text-slate-500 mt-2">Loading officer data...</span>
        </div>
      ) : viewMode === 'list' ? (
        /* List View */
        <div className="bg-white dark:bg-slate-900 rounded-2xl border dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="p-4 border-b dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
            <input
              type="text"
              placeholder="Search officers..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full sm:max-w-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2 pl-3 text-sm focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none text-slate-900 dark:text-white"
            />
          </div>

          {filteredOfficers.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center space-y-2">
              <Users className="h-10 w-10 text-slate-300" />
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300">No Officers Found</h3>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
                <thead>
                  <tr className="border-b dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 dark:bg-slate-900/50">
                    <th className="px-6 py-3.5">Officer Name</th>
                    <th className="px-6 py-3.5">Student ID</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5">Position</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredOfficers.map(officer => {
                    const student = officer.students && typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
                    const name = student?.name || 'Unknown Officer';
                    const email = student?.email || 'N/A';
                    const stdId = student?.student_id || 'N/A';
                    const pos = officer.position;
                    const meta = pos ? POSITION_METADATA[pos] : null;
                    const initials = name
                      .split(' ')
                      .map(n => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase();

                    const avatar = getAvatarUrl(officer.pictureId);

                    return (
                      <tr key={officer.$id} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            {avatar ? (
                              <img src={avatar.toString()} alt={name} className="h-9 w-9 rounded-full object-cover border" />
                            ) : (
                              <div className="h-9 w-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center text-xs font-bold border dark:border-slate-700">
                                {initials}
                              </div>
                            )}
                            <div>
                              <span className="font-bold text-slate-800 dark:text-slate-200 block">{name}</span>
                              <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                                {student?.section || 'No Section'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-300">{stdId}</td>
                        <td className="px-6 py-4">{email}</td>
                        <td className="px-6 py-4">
                          {meta ? (
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize tracking-wide ${meta.badgeColor}`}>
                              {meta.label}
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-2.5 py-0.5 text-xs font-medium text-slate-400 dark:text-slate-500">
                              Unassigned
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => {
                              setEditOfficer(officer);
                              setEditPosition(officer.position || '');
                              setValidationError('');
                            }}
                            className="p-1 rounded-lg border hover:bg-slate-50 dark:hover:bg-slate-800 border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-800 dark:hover:text-white transition-colors"
                            title="Edit Position"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Board View (Interactive Drag and Drop) */
        <div className="space-y-6">
          
          {/* Top Tray: Unassigned well */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={e => {
              const id = e.dataTransfer.getData('text/plain') || draggingOfficerId;
              if (id) handleAssignInline(id, '');
            }}
            onClick={() => {
              if (activeSelectOfficerId) {
                handleAssignInline(activeSelectOfficerId, '');
              }
            }}
            className="border dark:border-slate-800 rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/20 shadow-xs flex flex-col gap-2 transition-colors cursor-pointer"
          >
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Unassigned Officers
              </span>
              <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-200/50 dark:bg-slate-800/80 rounded-full">
                {officers.filter(o => !o.position).length}
              </span>
            </div>

            <div className="flex gap-2 overflow-x-auto py-2 pr-1 min-h-[58px] scrollbar-thin">
              {officers.filter(o => !o.position).map(o => renderDraggableOfficerCard(o, true))}

              {officers.filter(o => !o.position).length === 0 && (
                <div className="flex-1 flex items-center justify-center text-slate-400 py-1">
                  <Check className="h-4 w-4 text-teal-500 mr-1.5" />
                  <span className="text-xs font-semibold">All officers placed!</span>
                </div>
              )}
            </div>
          </div>

          {/* Grid: Position Pigeonholes */}
          <div className="border dark:border-slate-800 rounded-2xl p-4 bg-white dark:bg-slate-900 shadow-xs flex flex-col gap-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block">
                Organization Pigeonholes
              </span>
              <span className="text-[10px] font-bold text-slate-400 px-2 py-0.5 bg-slate-105 dark:bg-slate-850 rounded-full">
                {officers.filter(o => o.position).length} / 21 Slots Filled
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {Object.entries(POSITION_METADATA).map(([val, meta]) => {
                const occupants = officers.filter(o => o.position === val);
                const totalFilled = occupants.length;
                const isFull = totalFilled >= meta.limit;
                const isDragActive = !!draggingOfficerId || !!activeSelectOfficerId;

                return (
                  <div
                    key={val}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => {
                      const id = e.dataTransfer.getData('text/plain') || draggingOfficerId;
                      if (id) handleAssignInline(id, val);
                    }}
                    onClick={() => {
                      if (activeSelectOfficerId) {
                        handleAssignInline(activeSelectOfficerId, val);
                      }
                    }}
                    className={`p-3.5 rounded-xl border flex flex-col min-h-[120px] justify-between transition-all ${
                      isFull
                        ? 'bg-red-50/20 dark:bg-red-950/5 border-red-150 dark:border-red-900/30'
                        : isDragActive
                          ? 'border-dashed border-[#0d6b66] bg-teal-50/15 dark:bg-teal-955/5 hover:bg-teal-50/30 dark:hover:bg-teal-950/10 cursor-pointer shadow-xs'
                          : 'bg-slate-50/30 dark:bg-slate-900/30 border-slate-200 dark:border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2 mb-3">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">
                        {meta.label}
                      </span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${
                        isFull
                          ? 'bg-red-105 text-red-750 dark:bg-red-950 dark:text-red-300'
                          : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {totalFilled}/{meta.limit}
                      </span>
                    </div>

                    {/* Draggable Chips Inside Box */}
                    <div className="space-y-2">
                      {occupants.map(o => renderDraggableOfficerCard(o, false))}

                      {totalFilled === 0 && (
                        <div className="text-[10px] text-slate-400 py-3 border border-dashed border-slate-200 dark:border-slate-850 rounded-lg flex items-center justify-center select-none bg-white dark:bg-slate-950/20">
                          {isFull ? 'Filled' : isDragActive ? 'Drop / Click' : 'Empty slot'}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      )}

      {/* Edit Single Position Modal (For List View) */}
      {editOfficer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-sm bg-white dark:bg-slate-900 rounded-2xl shadow-xl overflow-hidden p-6 border dark:border-slate-800">
            <div className="flex justify-between items-center pb-4 border-b dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Edit Officer Position</h3>
              <button
                onClick={() => setEditOfficer(null)}
                className="text-slate-400 hover:text-slate-655 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="py-4 space-y-4">
              <div>
                <span className="text-xs text-slate-400 dark:text-slate-500 uppercase tracking-wider font-bold">Officer</span>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mt-0.5">
                  {(editOfficer.students as any)?.name || 'Officer'}
                </p>
              </div>

              <div>
                <label htmlFor="position-select" className="block text-xs font-bold text-slate-450 uppercase tracking-wider mb-2">
                  Position
                </label>
                <select
                  id="position-select"
                  value={editPosition}
                  onChange={e => {
                    setEditPosition(e.target.value);
                    setValidationError('');
                  }}
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-2.5 text-sm font-semibold text-slate-700 dark:text-slate-350 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                >
                  <option value="">Unassigned</option>
                  {Object.entries(POSITION_METADATA).map(([val, meta]) => {
                    const count = officers.filter(o => o.position === val).length;
                    const currentFill = editOfficer.position === val ? Math.max(0, count - 1) : count;
                    return (
                      <option key={val} value={val}>
                        {meta.label} ({currentFill}/{meta.limit} occupied)
                      </option>
                    );
                  })}
                </select>
              </div>

              {validationError && (
                <div className="bg-red-50 dark:bg-red-955/20 border border-red-200 dark:border-red-900/30 p-3 rounded-lg flex items-start gap-2 text-xs text-red-650 dark:text-red-400">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{validationError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t dark:border-slate-800">
              <button
                type="button"
                onClick={() => setEditOfficer(null)}
                className="flex-1 rounded-lg border border-slate-200 dark:border-slate-800 py-2.5 text-sm font-medium text-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-850 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSingleSave}
                disabled={actionLoading}
                className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white py-2.5 text-sm font-semibold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {actionLoading ? <RotateCw className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminOfficers;
