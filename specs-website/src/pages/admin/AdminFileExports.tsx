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

interface ReportImage {
  id: string;
  url: string;
  label: string;
}

const AdminFileExports: React.FC = () => {
  const { addToast } = useToast();
  const printRef = useRef<HTMLDivElement>(null);

  // --- Signatories & Officers ---
  const [signatories, setSignatories] = useState<Signatory[]>([]);
  const [loadingSignatories, setLoadingSignatories] = useState(true);
  const [officers, setOfficers] = useState<any[]>([]);

  // --- Report state ---
  const [activeReport, setActiveReport] = useState<ReportType>('narrative');
  const [events, setEvents] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(false);

  // Narrative Report States
  const [narrativeEventId, setNarrativeEventId] = useState<string>('');
  const [narrativeDate, setNarrativeDate] = useState<string>('');
  const [narrativeText, setNarrativeText] = useState<string>('');
  const [narrativeImages, setNarrativeImages] = useState<ReportImage[]>([]);

  // Documentation Report States
  const [docEventId, setDocEventId] = useState<string>('');
  const [docDate, setDocDate] = useState<string>('');
  const [docImages, setDocImages] = useState<ReportImage[]>([]);

  // Derived active values
  const selectedEventId = activeReport === 'narrative' ? narrativeEventId : docEventId;
  const reportDate = activeReport === 'narrative' ? narrativeDate : docDate;
  const reportImages = activeReport === 'narrative' ? narrativeImages : docImages;

  const handleEventChange = (eventId: string) => {
    const eventObj = events.find(e => e.$id === eventId);
    const dateVal = eventObj && eventObj.date_to_held ? eventObj.date_to_held.split('T')[0] : '';
    
    if (activeReport === 'narrative') {
      setNarrativeEventId(eventId);
      setNarrativeDate(dateVal);
      setNarrativeText(eventObj ? eventObj.description || '' : '');
      // Clean up previous image URLs
      narrativeImages.forEach(img => URL.revokeObjectURL(img.url));
      setNarrativeImages([]);
    } else {
      setDocEventId(eventId);
      setDocDate(dateVal);
      // Clean up previous image URLs
      docImages.forEach(img => URL.revokeObjectURL(img.url));
      setDocImages([]);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const filesList = e.target.files;
    if (!filesList) return;
    const newImages: ReportImage[] = [];
    for (let i = 0; i < filesList.length; i++) {
      const file = filesList[i];
      const url = URL.createObjectURL(file);
      newImages.push({
        id: Math.random().toString(36).substring(2, 9),
        url,
        label: ''
      });
    }
    if (activeReport === 'narrative') {
      setNarrativeImages(prev => [...prev, ...newImages]);
    } else {
      setDocImages(prev => [...prev, ...newImages]);
    }
    e.target.value = '';
  };

  const handleImageLabelChange = (id: string, label: string) => {
    if (activeReport === 'narrative') {
      setNarrativeImages(prev => prev.map(img => img.id === id ? { ...img, label } : img));
    } else {
      setDocImages(prev => prev.map(img => img.id === id ? { ...img, label } : img));
    }
  };

  const handleImageDelete = (id: string) => {
    if (activeReport === 'narrative') {
      setNarrativeImages(prev => {
        const target = prev.find(img => img.id === id);
        if (target) URL.revokeObjectURL(target.url);
        return prev.filter(img => img.id !== id);
      });
    } else {
      setDocImages(prev => {
        const target = prev.find(img => img.id === id);
        if (target) URL.revokeObjectURL(target.url);
        return prev.filter(img => img.id !== id);
      });
    }
  };

  // Keep track of all object URLs for cleanup on unmount
  const allImagesRef = useRef<string[]>([]);
  useEffect(() => {
    allImagesRef.current = [
      ...narrativeImages.map(img => img.url),
      ...docImages.map(img => img.url)
    ];
  }, [narrativeImages, docImages]);

  // Clean up Object URLs on unmount
  useEffect(() => {
    return () => {
      allImagesRef.current.forEach(url => URL.revokeObjectURL(url));
    };
  }, []);

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
      const res = await cachedApi.events.listAll({ orderDesc: 'date_to_held' });
      setEvents(res.documents);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: 'Failed to load events.' });
    } finally {
      setLoadingEvents(false);
    }
  };

  const loadOfficers = async () => {
    try {
      const res = await cachedApi.officers.listAll();
      setOfficers(res.documents);
    } catch (err: any) {
      console.error('Failed to load officers:', err);
    }
  };

  useEffect(() => {
    loadSignatories();
    loadEvents();
    loadOfficers();
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
      setCrudNotation('');
      setCrudName('');
      setCrudPosition('');
      setEditingSignatory(null);
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
  const getCompiledHtml = (): string => {
    const origin = window.location.origin;

    const selectedEvent = events.find(e => e.$id === selectedEventId);
    const eventTitle = selectedEvent ? selectedEvent.event_name : 'No Event Selected';
    const formattedDate = reportDate 
      ? new Date(reportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : (selectedEvent?.date_to_held ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date of Event');

    const getOfficerDetails = (positionCode: string, defaultTitle: string) => {
      const officer = officers.find(o => o.position === positionCode);
      if (officer && officer.students) {
        const student = typeof officer.students === 'object' ? (officer.students as any) : null;
        if (student?.name) {
          return {
            name: student.name.toUpperCase(),
            title: `${defaultTitle}, SPECS`
          };
        }
      }
      return {
        name: '_______________________',
        title: `${defaultTitle.toUpperCase()}, SPECS`
      };
    };

    const getFallbackSignatories = () => {
      const secretaryDetails = getOfficerDetails('secretary', 'Executive Secretary');
      const presidentDetails = getOfficerDetails('president', 'President');
      return {
        secretaryName: secretaryDetails.name,
        secretaryTitle: secretaryDetails.title,
        presidentName: presidentDetails.name,
        presidentTitle: presidentDetails.title,
        adviserName: 'NICOLAS A. PURA',
        adviserTitle: 'Adviser, SPECS'
      };
    };

    // Render signatory block HTML string
    let signatoriesHtml = '';
    const activeRows = layout.rows.filter(r => r.left || r.right);
    if (activeRows.length > 0) {
      signatoriesHtml = `
        <div style="margin-top: 60px; page-break-inside: avoid; text-align: left;">
          <table style="width: 100%; table-layout: fixed; border: none; border-collapse: collapse;">
            <tbody>
              ${activeRows.map((row, i) => {
                const leftS = getById(row.left);
                const rightS = getById(row.right);
                return `
                  <tr>
                    <td style="width: 50%; padding-right: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${leftS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 11px; font-style: italic; margin: 0 0 35px 0; ${leftS.notation_line ? '' : 'visibility: hidden;'}">${leftS.notation_line || '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="font-weight: bold; font-size: 13px; margin: 0; text-transform: uppercase;">${leftS.name_officer}</p>
                            ${leftS.position ? `<p style="font-size: 10px; margin: 3px 0 0 0; text-transform: uppercase; color: #475569; text-align: center;">${leftS.position}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                    <td style="width: 50%; padding-left: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${rightS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 11px; font-style: italic; margin: 0 0 35px 0; ${rightS.notation_line ? '' : 'visibility: hidden;'}">${rightS.notation_line || '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="font-weight: bold; font-size: 13px; margin: 0; text-transform: uppercase;">${rightS.name_officer}</p>
                            ${rightS.position ? `<p style="font-size: 10px; margin: 3px 0 0 0; text-transform: uppercase; color: #475569; text-align: center;">${rightS.position}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      signatoriesHtml = '';
    }

    const photoChunks = chunkImages(reportImages, 4);

    let reportBodyHtml = '';
    if (activeReport === 'narrative') {
      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; text-align: justify; white-space: pre-wrap;">
          ${narrativeText || 'No narrative text entered.'}
        </div>
        ${signatoriesHtml}
      `;
    } else if (activeReport === 'documentation') {
      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; text-align: center; padding-top: 40px; color: #64748b;">
          <p>This report documents the event and showcases photo evidence.</p>
          <p style="margin-top: 10px; font-style: italic; font-size: 11pt;">Refer to the subsequent pages for the photo documentation index.</p>
        </div>
        ${signatoriesHtml}
      `;
    } else if (activeReport === 'rating') {
      const rows = events.map(ev => `
        <tr>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.event_name || 'N/A'}</td>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.date_to_held ? new Date(ev.date_to_held).toLocaleDateString() : 'N/A'}</td>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.rating_links || 'No link'}</td>
        </tr>
      `).join('');
      
      reportBodyHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Event Name</th>
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Date</th>
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Rating Link</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3">No events found.</td></tr>'}
          </tbody>
        </table>
        ${signatoriesHtml}
      `;
    } else if (activeReport === 'memorandum') {
      reportBodyHtml = `
        <div style="border: 1px solid black; padding: 20px; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div><strong>Title:</strong> ${memoTitle || '____________________'}</div>
            <div><strong>Date:</strong> ${memoDate || '____________________'}</div>
            <div><strong>To:</strong> ${memoTo || '____________________'}</div>
            <div><strong>From:</strong> ${memoFrom || '____________________'}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Subject:</strong> ${memoSubject || '____________________'}
          </div>
          <hr style="border: none; border-top: 1px solid black; margin-bottom: 15px;" />
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${memoBody || 'Enter memorandum content.'}
          </div>
        </div>
        ${signatoriesHtml}
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${REPORT_LABELS[activeReport]} - ${eventTitle}</title>
          <style>
            @page {
              size: 8.5in 13in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Times New Roman', Times, serif;
              color: #1e293b;
              line-height: 1.5;
              background-color: #ffffff;
            }
            .print-header {
              position: fixed;
              top: 0;
              left: 0;
              right: 0;
              height: 5cm;
              display: flex;
              align-items: flex-start;
              justify-content: center;
              z-index: 1000;
            }
            .print-header img {
              width: 100%;
              height: auto;
              max-height: 5cm;
              object-fit: contain;
              display: block;
            }
            .print-footer {
              position: fixed;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3cm;
              display: flex;
              align-items: flex-end;
              justify-content: center;
              z-index: 1000;
            }
            .print-footer img {
              width: 100%;
              height: auto;
              max-height: 3cm;
              object-fit: contain;
              display: block;
            }
            .print-layout-table {
              width: 100%;
              border-collapse: collapse;
              border: none !important;
            }
            .print-layout-table > thead > tr > td,
            .print-layout-table > tbody > tr > td,
            .print-layout-table > tfoot > tr > td {
              padding-left: 2.54cm;
              padding-right: 2.54cm;
              border: none !important;
              background: transparent !important;
            }
            .header-spacer {
              height: 5cm;
            }
            .footer-spacer {
              height: 3cm;
            }
            thead {
              display: table-header-group;
            }
            tfoot {
              display: table-footer-group;
            }
            .report-title {
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            @media print {
              body {
                margin: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-header">
            <img src="${origin}/header.png" alt="Header" />
          </div>
          <div class="print-footer">
            <img src="${origin}/footer.png" alt="Footer" />
          </div>

          <table class="print-layout-table">
            <thead>
              <tr>
                <td>
                  <div class="header-spacer"></div>
                </td>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <h2 class="report-title">${eventTitle}</h2>
                  <h3 style="text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0 0 20px 0; color: #334155; font-family: 'Times New Roman', Times, serif;">
                    ${activeReport === 'narrative' ? 'Narrative Report' : REPORT_LABELS[activeReport]}
                  </h3>
                  <p style="text-align: center; font-size: 10pt; font-style: italic; margin-top: -15px; margin-bottom: 25px;">
                    Date of Event: ${formattedDate}
                  </p>
                  
                  ${reportBodyHtml}
                </td>
              </tr>
              ${photoChunks.map((chunk, chunkIdx) => {
                const gridItems = chunk.map(img => `
                  <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                    <img src="${img.url}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
                    ${img.label ? `
                      <div style="background-color: #7ee8a2; color: #042f1a; font-size: 9pt; font-weight: bold; padding: 6px 12px; border-radius: 2px; margin-top: 8px; text-align: center; width: 90%; font-family: 'Times New Roman', Times, serif; box-sizing: border-box; text-transform: uppercase; line-height: 1.2;">
                        ${img.label}
                      </div>
                    ` : ''}
                  </div>
                `).join('');

                return `
                  <tr style="page-break-before: always; break-before: page;">
                    <td>
                      <h2 style="text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 20px 0 5px 0;">${eventTitle}</h2>
                      <h3 style="text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 30px 0; color: #475569; font-family: 'Times New Roman', Times, serif;">
                        Photo Documentation (Page ${chunkIdx + 1})
                      </h3>
                      <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 30px; justify-items: center; align-items: center;">
                        ${gridItems}
                      </div>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="footer-spacer"></div>
                </td>
              </tr>
            </tfoot>
          </table>
        </body>
      </html>
    `;
  };

  const getPreviewHtml = (): string => {
    const origin = window.location.origin;

    const selectedEvent = events.find(e => e.$id === selectedEventId);
    const eventTitle = selectedEvent ? selectedEvent.event_name : 'No Event Selected';
    const formattedDate = reportDate 
      ? new Date(reportDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
      : (selectedEvent?.date_to_held ? new Date(selectedEvent.date_to_held).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'Date of Event');

    const getOfficerDetails = (positionCode: string, defaultTitle: string) => {
      const officer = officers.find(o => o.position === positionCode);
      if (officer && officer.students) {
        const student = typeof officer.students === 'object' ? (officer.students as any) : null;
        if (student?.name) {
          return {
            name: student.name.toUpperCase(),
            title: `${defaultTitle}, SPECS`
          };
        }
      }
      return {
        name: '_______________________',
        title: `${defaultTitle.toUpperCase()}, SPECS`
      };
    };

    // Render signatory block HTML string
    let signatoriesHtml = '';
    const activeRows = layout.rows.filter(r => r.left || r.right);
    if (activeRows.length > 0) {
      signatoriesHtml = `
        <div style="margin-top: 60px; page-break-inside: avoid; text-align: left;">
          <table style="width: 100%; table-layout: fixed; border: none; border-collapse: collapse;">
            <tbody>
              ${activeRows.map((row, i) => {
                const leftS = getById(row.left);
                const rightS = getById(row.right);
                return `
                  <tr>
                    <td style="width: 50%; padding-right: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${leftS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 11px; font-style: italic; margin: 0 0 35px 0; ${leftS.notation_line ? '' : 'visibility: hidden;'}">${leftS.notation_line || '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="font-weight: bold; font-size: 13px; margin: 0; text-transform: uppercase;">${leftS.name_officer}</p>
                            ${leftS.position ? `<p style="font-size: 10px; margin: 3px 0 0 0; text-transform: uppercase; color: #475569; text-align: center;">${leftS.position}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                    <td style="width: 50%; padding-left: 20px; padding-bottom: 35px; border: none; vertical-align: top;">
                      ${rightS ? `
                        <div style="text-align: left;">
                          <p style="font-size: 11px; font-style: italic; margin: 0 0 35px 0; ${rightS.notation_line ? '' : 'visibility: hidden;'}">${rightS.notation_line || '&nbsp;'}:</p>
                          <div style="text-align: center; width: 250px; margin-top: 30px;">
                            <div style="border-top: 1px solid #000000; width: 100%; margin-bottom: 8px;"></div>
                            <p style="font-weight: bold; font-size: 13px; margin: 0; text-transform: uppercase;">${rightS.name_officer}</p>
                            ${rightS.position ? `<p style="font-size: 10px; margin: 3px 0 0 0; text-transform: uppercase; color: #475569; text-align: center;">${rightS.position}</p>` : ''}
                          </div>
                        </div>
                      ` : '&nbsp;'}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>
      `;
    } else {
      signatoriesHtml = '';
    }

    const photoChunks = chunkImages(reportImages, 4);

    let reportBodyHtml = '';
    if (activeReport === 'narrative') {
      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; text-align: justify; white-space: pre-wrap;">
          ${narrativeText || 'No narrative text entered.'}
        </div>
        <div id="signatories-wrapper">
          ${signatoriesHtml}
        </div>
      `;
    } else if (activeReport === 'documentation') {
      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; font-size: 12pt; line-height: 1.6; text-align: center; padding-top: 40px; color: #64748b;">
          <p>This report documents the event and showcases photo evidence.</p>
          <p style="margin-top: 10px; font-style: italic; font-size: 11pt;">Refer to the subsequent pages for the photo documentation index.</p>
        </div>
        <div id="signatories-wrapper">
          ${signatoriesHtml}
        </div>
      `;
    } else if (activeReport === 'rating') {
      const rows = events.map(ev => `
        <tr>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.event_name || 'N/A'}</td>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.date_to_held ? new Date(ev.date_to_held).toLocaleDateString() : 'N/A'}</td>
          <td style="border: 1px solid black; padding: 6px; font-size: 10px;">${ev.rating_links || 'No link'}</td>
        </tr>
      `).join('');
      
      reportBodyHtml = `
        <table style="width: 100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f1f5f9;">
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Event Name</th>
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Date</th>
              <th style="border: 1px solid black; padding: 6px; font-size: 10px; text-align: left;">Rating Link</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr><td colspan="3">No events found.</td></tr>'}
          </tbody>
        </table>
        <div id="signatories-wrapper">
          ${signatoriesHtml}
        </div>
      `;
    } else if (activeReport === 'memorandum') {
      reportBodyHtml = `
        <div style="border: 1px solid black; padding: 20px; font-family: 'Times New Roman', Times, serif; font-size: 11pt;">
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px;">
            <div><strong>Title:</strong> ${memoTitle || '____________________'}</div>
            <div><strong>Date:</strong> ${memoDate || '____________________'}</div>
            <div><strong>To:</strong> ${memoTo || '____________________'}</div>
            <div><strong>From:</strong> ${memoFrom || '____________________'}</div>
          </div>
          <div style="margin-bottom: 15px;">
            <strong>Subject:</strong> ${memoSubject || '____________________'}
          </div>
          <hr style="border: none; border-top: 1px solid black; margin-bottom: 15px;" />
          <div style="white-space: pre-wrap; line-height: 1.6;">
            ${memoBody || 'Enter memorandum content.'}
          </div>
        </div>
        <div id="signatories-wrapper">
          ${signatoriesHtml}
        </div>
      `;
    }

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Print Preview</title>
          <style>
            html, body {
              margin: 0;
              padding: 0;
              background-color: #f8fafc;
              font-family: 'Times New Roman', Times, serif;
              color: #1e293b;
              box-sizing: border-box;
            }
            .preview-container {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 24px;
              padding: 24px;
            }
            .print-page {
              width: 8.5in;
              height: 13in;
              background-color: #ffffff;
              box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
              position: relative;
              box-sizing: border-box;
              border-radius: 4px;
              overflow: hidden;
              flex-shrink: 0;
            }
            .print-header {
              position: absolute;
              top: 0;
              left: 0;
              right: 0;
              height: 5cm;
              display: flex;
              align-items: flex-start;
              justify-content: center;
            }
            .print-header img {
              width: 100%;
              height: auto;
              max-height: 5cm;
              object-fit: contain;
              display: block;
            }
            .print-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              height: 3cm;
              display: flex;
              align-items: flex-end;
              justify-content: center;
            }
            .print-footer img {
              width: 100%;
              height: auto;
              max-height: 3cm;
              object-fit: contain;
              display: block;
            }
            .content-area {
              padding-top: 5.5cm;
              padding-bottom: 3.5cm;
              padding-left: 2.54cm;
              padding-right: 2.54cm;
              height: 100%;
              box-sizing: border-box;
            }
            .report-title {
              text-align: center;
              font-size: 22px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            .page-badge {
              position: absolute;
              top: 16px;
              left: 16px;
              background-color: #0d6b66;
              color: #ffffff;
              font-family: sans-serif;
              font-size: 11px;
              font-weight: 600;
              padding: 4px 10px;
              border-radius: 4px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.1);
              z-index: 10;
              user-select: none;
            }
          </style>
        </head>
        <body>
          <div class="preview-container">
            <!-- Page 1 -->
            <div class="print-page" id="page-1">
              <div class="page-badge">Page 1</div>
              <div class="print-header">
                <img src="${origin}/header.png" alt="Header" />
              </div>
              <div class="print-footer">
                <img src="${origin}/footer.png" alt="Footer" />
              </div>
              <div class="content-area">
                <div id="page-1-content">
                  <h2 class="report-title">${eventTitle}</h2>
                  <h3 style="text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0 0 20px 0; color: #334155;">
                    ${activeReport === 'narrative' ? 'Narrative Report' : REPORT_LABELS[activeReport]}
                  </h3>
                  <p style="text-align: center; font-size: 10pt; font-style: italic; margin-top: -15px; margin-bottom: 25px;">
                    Date of Event: ${formattedDate}
                  </p>
                  ${reportBodyHtml}
                </div>
              </div>
            </div>

            <!-- Page 2+: Photo chunks -->
            ${photoChunks.map((chunk, chunkIdx) => {
              const gridItems = chunk.map(img => `
                <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%;">
                  <img src="${img.url}" style="width: 100%; height: 260px; object-fit: cover; border-radius: 4px; border: 1px solid #cbd5e1; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);" />
                  ${img.label ? `
                    <div style="background-color: #7ee8a2; color: #042f1a; font-size: 9pt; font-weight: bold; padding: 6px 12px; border-radius: 2px; margin-top: 8px; text-align: center; width: 90%; font-family: 'Times New Roman', Times, serif; box-sizing: border-box; text-transform: uppercase; line-height: 1.2;">
                      ${img.label}
                    </div>
                  ` : ''}
                </div>
              `).join('');

              return `
                <div class="print-page">
                  <div class="page-badge">Photo Doc</div>
                  <div class="print-header">
                    <img src="${origin}/header.png" alt="Header" />
                  </div>
                  <div class="print-footer">
                    <img src="${origin}/footer.png" alt="Footer" />
                  </div>
                  <div class="content-area">
                    <h2 style="text-align: center; font-size: 14pt; font-weight: bold; text-transform: uppercase; margin: 20px 0 5px 0;">${eventTitle}</h2>
                    <h3 style="text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; margin: 0 0 30px 0; color: #475569;">
                      Photo Documentation
                    </h3>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; gap: 30px; justify-items: center; align-items: center;">
                      ${gridItems}
                    </div>
                  </div>
                </div>
              `;
            }).join('')}
          </div>

          <script>
            window.onload = function() {
              const page1Content = document.getElementById('page-1-content');
              const sigWrapper = document.getElementById('signatories-wrapper');
              
              // Max content height (13in page height - header padding - footer padding)
              const maxContentHeight = 908;
              
              if (page1Content.offsetHeight > maxContentHeight) {
                // Signatories overflowed Page 1. Let's move them to Page 2!
                const newPage = document.createElement('div');
                newPage.className = 'print-page';
                newPage.id = 'page-2-signatures';
                newPage.innerHTML = \`
                  <div class="page-badge">Signatures</div>
                  <div class="print-header">
                    <img src="${origin}/header.png" alt="Header" />
                  </div>
                  <div class="print-footer">
                    <img src="${origin}/footer.png" alt="Footer" />
                  </div>
                  <div class="content-area">
                    <div id="signatories-block-new"></div>
                  </div>
                \`;
                
                // Move elements
                const sigNew = newPage.querySelector('#signatories-block-new');
                sigNew.appendChild(sigWrapper);
                
                // Insert new Page 2 after Page 1
                const page1 = document.getElementById('page-1');
                page1.parentNode.insertBefore(newPage, page1.nextSibling);
              }
              
              // Relabel all page badges
              const badges = document.querySelectorAll('.page-badge');
              badges.forEach((badge, idx) => {
                badge.textContent = 'Page ' + (idx + 1) + ' of ' + badges.length;
              });
            }
          </script>
        </body>
      </html>
    `;
  };

  // --- PDF Generation ---
  // --- Standalone HTML PDF / Print generation matching AdminAttendance ---
  // --- PDF Generation / Printing ---
  const handlePrint = () => {
    const htmlContent = getCompiledHtml();
    
    // Inject print and close script matching AdminFinance.tsx style
    const printHtml = htmlContent.replace('</body>', `
      <script>
        window.onload = function() {
          window.print();
          if (!/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)) {
            window.close();
          }
        }
      </script>
      </body>
    `);

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Pop-up Blocked', message: 'Please allow pop-ups for this website to print reports.' });
      return;
    }
    printWindow.document.write(printHtml);
    printWindow.document.close();
  };

  const handleDownloadPdf = async () => {
    const htmlContent = getCompiledHtml();
    setGenerating(true);
    try {
      const { downloadPdfFromHtml } = await import('../../shared/utils');
      await downloadPdfFromHtml(htmlContent, `${REPORT_LABELS[activeReport].replace(/\s+/g, '_')}_Report.pdf`, addToast);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to download PDF.' });
    } finally {
      setGenerating(false);
    }
  };

  const chunkImages = (arr: any[], size: number) => {
    const chunks = [];
    for (let i = 0; i < arr.length; i += size) {
      chunks.push(arr.slice(i, i + size));
    }
    return chunks;
  };

  // --- Render print template ---
  const renderPrintTemplate = () => {
    const htmlContent = getPreviewHtml();
    return (
      <iframe
        srcDoc={htmlContent}
        title="Print Preview"
        className="w-full border-0 rounded-lg"
        style={{ height: '800px', backgroundColor: '#f8fafc' }}
      />
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
            onClick={() => { loadSignatories(); setShowCrud(true); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
          >
            <Users className="h-4 w-4" />
            Manage Signatories
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2 text-xs font-semibold transition-colors"
          >
            <Printer className="h-4 w-4" />
            Print / Save PDF
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
      {/* Event Selection and Narrative/Documentation Inputs */}
      {(activeReport === 'narrative' || activeReport === 'documentation') && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            {REPORT_LABELS[activeReport]} Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event *</label>
              <select
                value={selectedEventId}
                onChange={e => handleEventChange(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
              >
                <option value="">-- Select Event --</option>
                {events.map(ev => (
                  <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Event Date</label>
              <input
                type="date"
                value={reportDate}
                onChange={e => setReportDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
              />
            </div>

            {activeReport === 'narrative' && (
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Narrative Content / Details</label>
                <textarea
                  value={narrativeText}
                  onChange={e => setNarrativeText(e.target.value)}
                  rows={8}
                  placeholder="Enter the event's narrative details here..."
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y"
                />
              </div>
            )}

            <div className="sm:col-span-2 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Upload Report Photos</label>
                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 italic">
                  Suggested: Landscape photos (e.g. 4:3 or 16:9 ratio) for optimal grid layout
                </span>
              </div>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleImageUpload}
                className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#0d6b66] dark:file:bg-teal-950/30 dark:file:text-teal-400 hover:file:bg-teal-100 transition-all cursor-pointer"
              />
              
              {reportImages.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  {reportImages.map((img) => (
                    <div key={img.id} className="flex gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-lg items-center relative group">
                      <img src={img.url} alt="Thumbnail" className="w-16 h-16 object-cover rounded border border-slate-200 dark:border-slate-700 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">Photo Caption / Label</label>
                        <input
                          type="text"
                          value={img.label}
                          onChange={e => handleImageLabelChange(img.id, e.target.value)}
                          placeholder="e.g. BSCS parade group photo"
                          className="w-full rounded-md border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleImageDelete(img.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-all"
                        title="Delete photo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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
                  <div key={idx} className="flex flex-col sm:flex-row items-stretch sm:items-start gap-3 p-3 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl border border-slate-100 dark:border-slate-800 relative">
                    {/* Row label */}
                    <span className="text-[10px] font-bold text-slate-400 sm:w-12 text-left sm:text-right sm:pt-4 flex-shrink-0">
                      Row {idx + 1}
                    </span>

                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {/* Left slot */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-blue-500 uppercase tracking-wide">Left Column</span>
                        </div>
                        <SlotDropZone rowIdx={idx} side="left" signatory={getById(row.left)} />
                      </div>

                      {/* Right slot */}
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[9px] font-bold text-purple-500 uppercase tracking-wide">Right Column</span>
                        </div>
                        <SlotDropZone rowIdx={idx} side="right" signatory={getById(row.right)} />
                      </div>
                    </div>

                    {/* Remove row button */}
                    <button
                      onClick={() => removeRow(idx)}
                      className="absolute top-2 right-2 sm:relative sm:top-auto sm:right-auto flex-shrink-0 sm:mt-6 p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
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
      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800 mb-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
            <Printer className="h-4 w-4 text-slate-400" />
            Print Preview
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-3 py-1.5 text-xs font-bold transition-colors"
            >
              <Printer className="h-3.5 w-3.5" />
              Print / Save PDF
            </button>
          </div>
        </div>
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
