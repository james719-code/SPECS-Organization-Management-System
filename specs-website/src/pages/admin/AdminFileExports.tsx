import React, { useState, useEffect, useRef } from 'react';
import { api, cachedApi } from '../../shared/api';
import { useToast } from '../../components/ui/Toast';
import {
  FileText, Image, Star, FileEdit, GripVertical, Plus, Trash2, X,
  Users, Printer, Loader2, ChevronDown, ChevronUp, Download, RefreshCw
} from 'lucide-react';

type ReportType = 'narrative' | 'documentation' | 'rating' | 'memorandum';

interface Signatory {
  $id: string;
  name_officer: string;
  notation_line?: string;
  position?: string;
}

interface SignatoryRow {
  left: string | null;   // signatory $id or null
  right: string | null;  // signatory $id or null
}

interface SignatoryLayout {
  rows: SignatoryRow[];
}

type DropTarget = 'available' | { row: number; side: 'left' | 'right' };

const STORAGE_KEY_PREFIX = 'specs_signatory_layout_v2_';

const REPORT_LABELS: Record<ReportType, string> = {
  narrative: 'Narrative Report',
  documentation: 'Documentation Report',
  rating: 'Rating Report',
  memorandum: 'Dynamic Memorandum',
};

const AdminFileExports: React.FC = () => {
  const { addToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // --- Signatories ---
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [loadingSignatories, setLoadingSignatories] = useState(true);

  // --- Report state ---
  const [activeReport, setActiveReport] = useState<ReportType>('narrative');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Memorandum form
  const [memoTitle, setMemoTitle] = useState('');
  const [memoDate, setMemoDate] = useState(new Date().toISOString().split('T')[0]);
  const [memoTo, setMemoTo] = useState('');
  const [memoFrom, setMemoFrom] = useState('');
  const [memoSubject, setMemoSubject] = useState('');
  const [memoBody, setMemoBody] = useState('');

  // Signatory layout — row-based
  const [layout, setLayout] = useState<SignatoryLayout>({ rows: [] });
  const [showSignatorySection, setShowSignatorySection] = useState(true);

  // CRUD modals
  const [showCrud, setShowCrud] = useState(false);
  const [editingSignatory, setEditingSignatory] = useState<Signatory | null>(null);
  const [crudNotation, setCrudNotation] = useState('');
  const [crudName, setCrudName] = useState('');
  const [crudPosition, setCrudPosition] = useState('');
  const [savingCrud, setSavingCrud] = useState(false);

  // Drag state
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  // Generating PDF
  const [generating, setGenerating] = useState(false);

  // --- Load signatories ---
  const loadSignatories = async () => {
    setLoadingSignatories(true);
    try {
      const res = await api.signatories.list();
      setSignatories(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load signatories.' });
    } finally {
      setLoadingSignatories(false);
    }
  };

  // --- Load events for reports ---
  const loadEvents = async () => {
    setLoadingEvents(true);
    try {
      const res = await cachedApi.events.listAll({ orderDesc: 'date_to_held', includeArchived: false });
      setEvents(res.documents.filter((e: any) => !e.archived && !e.event_ended));
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load events.' });
    } finally {
      setLoadingEvents(false);
    }
  };

  useEffect(() => {
    loadSignatories();
    loadEvents();
  }, []);

  // --- Layout persistence ---
  const getStorageKey = () => `${STORAGE_KEY_PREFIX}${activeReport}`;

  const loadLayout = () => {
    try {
      const saved = localStorage.getItem(getStorageKey());
      if (saved) {
        const parsed = JSON.parse(saved);
        // Migrate old format if needed
        if (Array.isArray(parsed.rows)) {
          setLayout(parsed);
        } else if (Array.isArray(parsed.leftColumn) || Array.isArray(parsed.rightColumn)) {
          // Migrate old column-based format to row-based
          const leftCol: string[] = parsed.leftColumn || [];
          const rightCol: string[] = parsed.rightColumn || [];
          const maxLen = Math.max(leftCol.length, rightCol.length);
          const rows: SignatoryRow[] = [];
          for (let i = 0; i < maxLen; i++) {
            rows.push({ left: leftCol[i] || null, right: rightCol[i] || null });
          }
          setLayout({ rows });
        } else {
          setLayout({ rows: [] });
        }
        return;
      }
    } catch {}
    setLayout({ rows: [] });
  };

  const saveLayout = (newLayout: SignatoryLayout) => {
    // Clean up empty trailing rows
    const cleaned = { ...newLayout };
    while (cleaned.rows.length > 0 && !cleaned.rows[cleaned.rows.length - 1].left && !cleaned.rows[cleaned.rows.length - 1].right) {
      cleaned.rows = cleaned.rows.slice(0, -1);
    }
    setLayout(cleaned);
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify(cleaned));
    } catch {}
  };

  useEffect(() => {
    loadLayout();
  }, [activeReport]);

  // --- Get used signatory IDs ---
  const usedIds = new Set<string>();
  layout.rows.forEach(row => {
    if (row.left) usedIds.add(row.left);
    if (row.right) usedIds.add(row.right);
  });

  const availableSignatories = signatories.filter(s => !usedIds.has(s.$id));

  // --- Get signatory by ID ---
  const getById = (id: string | null): Signatory | null =>
    id ? signatories.find(s => s.$id === id) || null : null;

  // --- Row helpers ---
  const addRow = () => {
    const newRows = [...layout.rows, { left: null, right: null }];
    setLayout({ rows: newRows });
    try {
      localStorage.setItem(getStorageKey(), JSON.stringify({ rows: newRows }));
    } catch {}
  };

  const removeRow = (rowIdx: number) => {
    const newRows = layout.rows.filter((_, i) => i !== rowIdx);
    saveLayout({ rows: newRows });
  };

  // --- Drag & Drop ---
  const handleDragStart = (e: React.DragEvent, signatoryId: string, source: { type: 'available' } | { type: 'row'; row: number; side: 'left' | 'right' }) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ signatoryId, source }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropOnSlot = (e: React.DragEvent, target: DropTarget) => {
    e.preventDefault();
    setDragOverId(null);
    const raw = e.dataTransfer.getData('text/plain');
    if (!raw) return;
    let data: { signatoryId: string; source: any };
    try { data = JSON.parse(raw); } catch { return; }

    const { signatoryId, source } = data;
    const newRows = layout.rows.map(r => ({ left: r.left, right: r.right }));

    // Remove from source
    if (source.type === 'row') {
      if (source.side === 'left' && newRows[source.row]?.left === signatoryId) {
        newRows[source.row].left = null;
      } else if (source.side === 'right' && newRows[source.row]?.right === signatoryId) {
        newRows[source.row].right = null;
      }
    }

    // Also remove from any other slot (in case it was placed elsewhere)
    newRows.forEach(r => {
      if (r.left === signatoryId) r.left = null;
      if (r.right === signatoryId) r.right = null;
    });

    // Add to target
    if (target === 'available') {
      // just removed — nothing to do
    } else if (typeof target === 'object' && 'row' in target) {
      // Ensure target row exists
      while (newRows.length <= target.row) {
        newRows.push({ left: null, right: null });
      }
      if (target.side === 'left') {
        // If slot already occupied, push the existing one down to a new row
        if (newRows[target.row].left && newRows[target.row].left !== signatoryId) {
          const displaced = newRows[target.row].left;
          newRows[target.row].left = signatoryId;
          newRows.splice(target.row + 1, 0, { left: displaced, right: null });
        } else {
          newRows[target.row].left = signatoryId;
        }
      } else {
        if (newRows[target.row].right && newRows[target.row].right !== signatoryId) {
          const displaced = newRows[target.row].right;
          newRows[target.row].right = signatoryId;
          newRows.splice(target.row + 1, 0, { left: null, right: displaced });
        } else {
          newRows[target.row].right = signatoryId;
        }
      }
    }

    saveLayout({ rows: newRows });
  };

  const removeFromSlot = (rowIdx: number, side: 'left' | 'right') => {
    const newRows = layout.rows.map((r, i) =>
      i === rowIdx ? { ...r, [side]: null } : { ...r }
    );
    saveLayout({ rows: newRows });
  };

  // --- CRUD ---
  const openCreate = () => {
    setEditingSignatory(null);
    setCrudNotation('');
    setCrudName('');
    setCrudPosition('');
    setShowCrud(true);
  };

  const openEdit = (s: Signatory) => {
    setEditingSignatory(s);
    setCrudNotation(s.notation_line || '');
    setCrudName(s.name_officer);
    setCrudPosition(s.position || '');
    setShowCrud(true);
  };

  const handleCrudSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!crudName.trim()) return;
    setSavingCrud(true);
    try {
      const payload = {
        name_officer: crudName.trim(),
        notation_line: crudNotation.trim() || undefined,
        position: crudPosition.trim() || undefined,
      };
      if (editingSignatory) {
        await api.signatories.update(editingSignatory.$id, payload);
        addToast({ type: 'success', title: 'Updated', message: 'Signatory updated.' });
      } else {
        await api.signatories.create(payload);
        addToast({ type: 'success', title: 'Created', message: 'Signatory created.' });
      }
      setShowCrud(false);
      await loadSignatories();
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to save signatory.' });
    } finally {
      setSavingCrud(false);
    }
  };

  const handleCrudDelete = async (signatoryId: string) => {
    if (!window.confirm('Delete this signatory? It will also be removed from any report layouts.')) return;
    try {
      await api.signatories.delete(signatoryId);
      // Remove from layout
      const newRows = layout.rows.map(r => ({
        left: r.left === signatoryId ? null : r.left,
        right: r.right === signatoryId ? null : r.right,
      }));
      saveLayout({ rows: newRows });
      await loadSignatories();
      addToast({ type: 'success', title: 'Deleted', message: 'Signatory deleted.' });
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete signatory.' });
    }
  };

  // --- PDF Generation ---
  const downloadPdfFromHtml = async (htmlElement: HTMLElement, filename: string) => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const jsPDF = (await import('jspdf')).default;

      const canvas = await html2canvas(htmlElement, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      });

      const imgData = canvas.toDataURL('image/png');
      const imgWidth = 210;
      const pageHeight = 297;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;

      const pdf = new jsPDF('p', 'mm', 'a4');
      let position = 0;

      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
      heightLeft -= pageHeight;

      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
        heightLeft -= pageHeight;
      }

      pdf.save(`${filename}.pdf`);
    } catch (err: any) {
      addToast({ type: 'error', title: 'PDF Error', message: err.message || 'Failed to generate PDF.' });
    }
  };

  const handleGeneratePdf = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    await new Promise(r => setTimeout(r, 100));
    await downloadPdfFromHtml(printRef.current, `${REPORT_LABELS[activeReport].replace(/\s+/g, '_')}`);
    setGenerating(false);
  };

  // --- Render print template ---
  const renderPrintTemplate = () => {
    const activeRows = layout.rows.filter(r => r.left || r.right);
    const hasSignatories = activeRows.length > 0;

    return (
      <div ref={printRef} className="bg-white p-8 print-container" style={{ fontFamily: 'Times New Roman, serif', fontSize: '12pt', color: '#000', maxWidth: '800px', margin: '0 auto' }}>
        {/* Header */}
        <div className="text-center mb-6 pb-4 border-b-2 border-black">
          <p className="text-xs uppercase tracking-wide">Republic of the Philippines</p>
          <p className="text-xs uppercase tracking-wide font-bold">City of Manila</p>
          <p className="text-xs uppercase tracking-wide font-bold">Universidad de Manila</p>
          <p className="text-xs">College of Engineering and Technology</p>
          <p className="text-xs">Department of Computer Science</p>
          <h3 className="text-sm font-bold mt-2 uppercase">Society of Programmers and Enthusiasts in Computer Science</h3>
          <p className="text-[10px] italic mt-1">(SPECS)</p>
        </div>

        {/* Report Title */}
        <h2 className="text-center text-sm font-bold uppercase mb-4">{REPORT_LABELS[activeReport]}</h2>

        {/* Report Content */}
        <div className="space-y-3 text-xs leading-relaxed">
          {activeReport === 'narrative' && (
            <>
              <p className="font-bold">I. Overview</p>
              <p className="text-justify">
                This narrative report provides a summary of the active events and programs conducted by SPECS for the current academic period.
                The organization has successfully organized and facilitated various activities aimed at promoting computer science education,
                professional development, and community engagement among its members.
              </p>
              <p className="font-bold mt-2">II. Active Events</p>
              {loadingEvents ? (
                <p className="italic text-gray-500">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="italic text-gray-500">No active events found.</p>
              ) : (
                <table className="w-full border-collapse border border-black mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Event Name</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Date</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.event_name || 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.date_to_held ? new Date(ev.date_to_held).toLocaleDateString() : 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.description?.substring(0, 150) || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              <p className="font-bold mt-3">III. Conclusion</p>
              <p className="text-justify">
                SPECS continues to uphold its commitment to excellence in computer science education and community service.
                The active events listed above reflect the organization's dedication to meaningful student engagement and professional growth.
              </p>
            </>
          )}

          {activeReport === 'documentation' && (
            <>
              <p className="font-bold">I. Event Documentation & Evidence</p>
              <p className="text-justify">
                This documentation report lists events along with their associated photo evidence and supporting materials.
              </p>
              {loadingEvents ? (
                <p className="italic text-gray-500">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="italic text-gray-500">No active events found.</p>
              ) : (
                <table className="w-full border-collapse border border-black mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Event Name</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Date</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Image File</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Related Links</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.event_name || 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.date_to_held ? new Date(ev.date_to_held).toLocaleDateString() : 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.image_file || 'No image'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{(ev.related_links || []).length} link(s)</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeReport === 'rating' && (
            <>
              <p className="font-bold">I. Event Rating & Review Report</p>
              <p className="text-justify">
                This report summarizes event review links and ratings for active SPECS events.
              </p>
              {loadingEvents ? (
                <p className="italic text-gray-500">Loading events...</p>
              ) : events.length === 0 ? (
                <p className="italic text-gray-500">No active events found.</p>
              ) : (
                <table className="w-full border-collapse border border-black mt-2">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Event Name</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Date</th>
                      <th className="border border-black px-2 py-1 text-left text-[10px]">Rating Link</th>
                    </tr>
                  </thead>
                  <tbody>
                    {events.map((ev, i) => (
                      <tr key={i}>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.event_name || 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.date_to_held ? new Date(ev.date_to_held).toLocaleDateString() : 'N/A'}</td>
                        <td className="border border-black px-2 py-1 text-[10px]">{ev.rating_links || 'No link'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          )}

          {activeReport === 'memorandum' && (
            <>
              <div className="border border-black p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="font-bold">Title:</span> {memoTitle || '____________________'}</div>
                  <div><span className="font-bold">Date:</span> {memoDate || '____________________'}</div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-[10px]">
                  <div><span className="font-bold">To:</span> {memoTo || '____________________'}</div>
                  <div><span className="font-bold">From:</span> {memoFrom || '____________________'}</div>
                </div>
                <div className="text-[10px]">
                  <span className="font-bold">Subject:</span> {memoSubject || '____________________'}
                </div>
                <hr className="border-black" />
                <div className="text-[11px] whitespace-pre-wrap leading-relaxed">
                  {memoBody || 'Enter memorandum content in the form above...'}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Signatory Block — row-based rendering */}
        {hasSignatories && (
          <div className="mt-10">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <tbody>
                {activeRows.map((row, i) => {
                  const leftS = getById(row.left);
                  const rightS = getById(row.right);
                  return (
                    <tr key={i}>
                      {/* Left cell */}
                      <td className="align-top text-center" style={{ width: '50%', paddingRight: '20px', paddingBottom: i < activeRows.length - 1 ? '30px' : '0' }}>
                        {leftS ? (
                          <>
                            {leftS.notation_line && (
                              <p className="text-[9px] italic mb-1">{leftS.notation_line}</p>
                            )}
                            <div className="font-bold text-[11px] uppercase" style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px', padding: '0 10px' }}>
                              {leftS.name_officer}
                            </div>
                            {leftS.position && (
                              <p className="text-[9px] font-semibold uppercase mt-1">{leftS.position}</p>
                            )}
                          </>
                        ) : (
                          <span>&nbsp;</span>
                        )}
                      </td>
                      {/* Right cell */}
                      <td className="align-top text-center" style={{ width: '50%', paddingLeft: '20px', paddingBottom: i < activeRows.length - 1 ? '30px' : '0' }}>
                        {rightS ? (
                          <>
                            {rightS.notation_line && (
                              <p className="text-[9px] italic mb-1">{rightS.notation_line}</p>
                            )}
                            <div className="font-bold text-[11px] uppercase" style={{ borderBottom: '1px solid black', display: 'inline-block', minWidth: '200px', padding: '0 10px' }}>
                              {rightS.name_officer}
                            </div>
                            {rightS.position && (
                              <p className="text-[9px] font-semibold uppercase mt-1">{rightS.position}</p>
                            )}
                          </>
                        ) : (
                          <span>&nbsp;</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-2 border-t border-black text-center text-[9px] text-gray-600">
          <p>SPECS Organization &bull; Universidad de Manila &bull; College of Engineering and Technology</p>
          <p>Generated on {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
        </div>
      </div>
    );
  };

  // --- Draggable "chip" component for available signatories ---
  const DraggableChip = ({ signatory }: { signatory: Signatory }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, signatory.$id, { type: 'available' })}
      className="flex items-center gap-2 p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#0d6b66] hover:shadow-md transition-all group"
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <div>
        {signatory.notation_line && <p className="text-[10px] text-slate-500 italic">{signatory.notation_line}</p>}
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">{signatory.name_officer}</p>
        {signatory.position && <p className="text-[10px] text-slate-500">{signatory.position}</p>}
      </div>
    </div>
  );

  // --- Draggable placed signatory in a slot ---
  const DraggableSlotChip = ({ signatory, rowIdx, side }: { signatory: Signatory; rowIdx: number; side: 'left' | 'right' }) => (
    <div
      draggable
      onDragStart={(e) => handleDragStart(e, signatory.$id, { type: 'row', row: rowIdx, side })}
      className="flex items-center gap-2 p-2 bg-white border border-slate-200 rounded-lg shadow-sm cursor-grab active:cursor-grabbing hover:border-[#0d6b66] hover:shadow-md transition-all group"
    >
      <GripVertical className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
      <div className="flex-1 min-w-0">
        {signatory.notation_line && <p className="text-[10px] text-slate-500 italic truncate">{signatory.notation_line}</p>}
        <p className="text-xs font-semibold text-slate-800 truncate">{signatory.name_officer}</p>
        {signatory.position && <p className="text-[10px] text-slate-500 truncate">{signatory.position}</p>}
      </div>
      <button
        type="button"
        onClick={() => removeFromSlot(rowIdx, side)}
        className="text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
        title="Remove from this slot"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );

  // --- Drop-zone for a single slot ---
  const SlotDropZone = ({ rowIdx, side, signatory }: { rowIdx: number; side: 'left' | 'right'; signatory: Signatory | null }) => {
    const zoneId = `row-${rowIdx}-${side}`;
    const borderColor = side === 'left' ? 'blue' : 'purple';
    const bgColor = side === 'left' ? 'blue' : 'purple';

    return (
      <div
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverId(zoneId); }}
        onDragLeave={() => setDragOverId(null)}
        onDrop={(e) => handleDropOnSlot(e, { row: rowIdx, side })}
        className={`rounded-lg border-2 border-dashed p-2 min-h-[60px] flex items-center justify-center transition-colors ${
          dragOverId === zoneId
            ? `border-${bgColor}-400 bg-${bgColor}-50 dark:bg-${bgColor}-950/20`
            : 'border-slate-200 dark:border-slate-700'
        }`}
      >
        {signatory ? (
          <DraggableSlotChip signatory={signatory} rowIdx={rowIdx} side={side} />
        ) : (
          <p className="text-[10px] text-slate-400 italic text-center">Drop here</p>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">File Exports</h1>
          <p className="text-sm text-slate-500 mt-1">Generate reports and manage signatory layouts for PDF exports.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCrud(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage Signatories
          </button>
          <button
            onClick={handleGeneratePdf}
            disabled={generating}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors disabled:opacity-50"
          >
            {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {generating ? 'Generating...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {/* Report Type Selector */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 shadow-xs">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">Report Type</h3>
        <div className="flex flex-wrap gap-2">
          {(Object.keys(REPORT_LABELS) as ReportType[]).map(type => (
            <button
              key={type}
              onClick={() => setActiveReport(type)}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                activeReport === type
                  ? 'bg-[#0d6b66] text-white shadow-sm'
                  : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700'
              }`}
            >
              {type === 'narrative' && <FileText className="h-3.5 w-3.5" />}
              {type === 'documentation' && <Image className="h-3.5 w-3.5" />}
              {type === 'rating' && <Star className="h-3.5 w-3.5" />}
              {type === 'memorandum' && <FileEdit className="h-3.5 w-3.5" />}
              {REPORT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* Memorandum Form */}
      {activeReport === 'memorandum' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            Memorandum Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Title</label>
              <input type="text" value={memoTitle} onChange={e => setMemoTitle(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date</label>
              <input type="date" value={memoDate} onChange={e => setMemoDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">To</label>
              <input type="text" value={memoTo} onChange={e => setMemoTo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">From</label>
              <input type="text" value={memoFrom} onChange={e => setMemoFrom(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Subject</label>
              <input type="text" value={memoSubject} onChange={e => setMemoSubject(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Memorandum Body</label>
              <textarea value={memoBody} onChange={e => setMemoBody(e.target.value)} rows={8}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>
          </div>
        </div>
      )}

      {/* Signatory Row-Based Drag-and-Drop Organizer */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <button
          onClick={() => setShowSignatorySection(!showSignatorySection)}
          className="w-full flex items-center justify-between"
        >
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider">
            Signatory Layout {activeReport && `— ${REPORT_LABELS[activeReport]}`}
          </h3>
          {showSignatorySection ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
        </button>

        {showSignatorySection && (
          <div className="mt-4 space-y-4">
            <p className="text-xs text-slate-500">
              Each row has a <strong>Left</strong> and <strong>Right</strong> slot. A row can be left-only, right-only, or both.
              Drag signatories from pool into slots. Layouts are saved per report type locally.
            </p>

            {/* Available pool */}
            <div>
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-2">Available Signatories</h4>
              <div
                onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; }}
                onDrop={(e) => handleDropOnSlot(e, 'available')}
                className="min-h-[60px] border-2 border-dashed rounded-xl p-3 flex flex-wrap gap-2 transition-colors border-slate-200 dark:border-slate-700"
              >
                {loadingSignatories ? (
                  <div className="flex items-center gap-2 text-xs text-slate-400 py-2 px-2">
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading signatories...
                  </div>
                ) : availableSignatories.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-2 px-2">
                    {signatories.length === 0 ? 'No signatories in the database. Use "Manage Signatories" to add some.' : 'All signatories are placed in rows.'}
                  </p>
                ) : (
                  availableSignatories.map(s => <DraggableChip key={s.$id} signatory={s} />)
                )}
              </div>
            </div>

            {/* Rows */}
            {layout.rows.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Signature Rows</h4>
                {layout.rows.map((row, idx) => (
                  <div key={idx} className="flex items-start gap-3">
                    {/* Row label */}
                    <span className="text-[10px] font-bold text-slate-400 w-12 text-right pt-4 flex-shrink-0">
                      Row {idx + 1}
                    </span>

                    {/* Left slot */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Left</span>
                      </div>
                      <SlotDropZone rowIdx={idx} side="left" signatory={getById(row.left)} />
                    </div>

                    {/* Right slot */}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wide">Right</span>
                      </div>
                      <SlotDropZone rowIdx={idx} side="right" signatory={getById(row.right)} />
                    </div>

                    {/* Remove row button */}
                    <button
                      onClick={() => removeRow(idx)}
                      className="flex-shrink-0 mt-6 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                      title="Remove this row"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add row + reset */}
            <div className="flex justify-between">
              <button
                onClick={addRow}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-[#0d6b66] text-[#0d6b66] px-3 py-1.5 text-xs font-semibold hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Row
              </button>
              <button
                onClick={() => {
                  if (window.confirm('Reset the signatory layout for this report type?')) {
                    saveLayout({ rows: [] });
                  }
                }}
                className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-medium transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                Reset Layout
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Print Preview */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800 mb-4 flex items-center gap-2">
          <Printer className="h-4 w-4 text-slate-400" />
          Print Preview
        </h3>
        <div className="bg-slate-100 dark:bg-slate-950 rounded-lg p-4 overflow-x-auto print-preview-container">
          {renderPrintTemplate()}
        </div>
      </div>

      {/* Signatory CRUD Modal */}
      {showCrud && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-xs p-4 pt-12 overflow-y-auto animate-in fade-in" onClick={() => setShowCrud(false)}>
          <div className="w-full max-w-2xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800 dark:text-white">Manage Signatories</h2>
              <button onClick={() => setShowCrud(false)} className="text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 transition-colors">
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* List */}
              {loadingSignatories ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#0d6b66]" /></div>
              ) : signatories.length === 0 ? (
                <p className="text-sm text-slate-500 text-center py-8">No signatories yet. Create one below.</p>
              ) : (
                <div className="space-y-2">
                  {signatories.map(s => (
                    <div key={s.$id} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                      <div className="min-w-0">
                        {s.notation_line && <p className="text-[10px] text-slate-500 italic">{s.notation_line}</p>}
                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">{s.name_officer}</p>
                        {s.position && <p className="text-xs text-slate-500">{s.position}</p>}
                      </div>
                      <div className="flex gap-2 flex-shrink-0">
                        <button onClick={() => openEdit(s)} className="p-1.5 rounded-lg text-slate-400 hover:text-[#0d6b66] hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-colors">
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button onClick={() => handleCrudDelete(s.$id)} className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create/Edit Form — fields: Notation Line, Name, Position */}
              <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wide mb-3">
                  {editingSignatory ? 'Edit Signatory' : 'Add New Signatory'}
                </h4>
                <form onSubmit={handleCrudSave} className="space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Notation Line</label>
                      <input type="text" value={crudNotation} onChange={e => setCrudNotation(e.target.value)}
                        placeholder="Noted by"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Name *</label>
                      <input type="text" required value={crudName} onChange={e => setCrudName(e.target.value)}
                        placeholder="Juan Dela Cruz"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Position</label>
                      <input type="text" value={crudPosition} onChange={e => setCrudPosition(e.target.value)}
                        placeholder="President"
                        className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
                    </div>
                  </div>
                  <div className="flex gap-2 justify-end">
                    {editingSignatory && (
                      <button type="button" onClick={() => { setEditingSignatory(null); setCrudNotation(''); setCrudName(''); setCrudPosition(''); }}
                        className="rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
                        Cancel Edit
                      </button>
                    )}
                    <button type="submit" disabled={savingCrud || !crudName.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-3 py-2 text-xs font-semibold transition-colors disabled:opacity-50">
                      {savingCrud ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
                      {editingSignatory ? 'Update' : 'Create'} Signatory
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminFileExports;
