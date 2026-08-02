import React, { useState, useEffect, useRef, useMemo } from 'react';
import { api, cachedApi } from '../../shared/api';
import { useToast } from '../../components/ui/Toast';
import {
  FileText, Image, Star, FileEdit, GripVertical, Plus, Trash2, X,
  Users, Printer, Loader2, ChevronDown, ChevronUp, Download, RefreshCw, Upload, CreditCard,
  UserCheck, ShieldCheck
} from 'lucide-react';
import JSZip from 'jszip';
import { IDCardPreview, IDCardData, formatOfficerPosition } from '../../components/id/IDCardPreview';
import { IDCardExportModal } from '../../components/id/IDCardExportModal';

type ReportType = 'narrative' | 'documentation' | 'rating' | 'resolution' | 'proposal' | 'id_card';

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
  resolution: 'SPECS Resolution',
  proposal: 'Activity Proposal',
  id_card: 'ID Card Generator',
};

interface ReportImage {
  id: string;
  url: string;
  label: string;
}

interface CriteriaDefinition {
  id: number;
  area: string;
  text: string;
  csvHeaderPattern: string;
}

const EVALUATION_CRITERIA: CriteriaDefinition[] = [
  { id: 1, area: '1. Activity Title/Theme', text: 'The title/theme is appropriate to the nature of the activity.', csvHeaderPattern: 'appropriate to the nature' },
  { id: 2, area: '2. Objectives', text: 'The objectives of the activity are in line with the Vision and mission of the university.', csvHeaderPattern: 'Vision and mission' },
  { id: 3, area: '2. Objectives', text: 'The objectives are relevant to the activity.', csvHeaderPattern: 'relevant to the activity' },
  { id: 4, area: '2. Objectives', text: 'The objectives are attainable within the allotted time.', csvHeaderPattern: 'attainable within' },
  { id: 5, area: '3. Program Implementations / Schedule', text: 'There is flexibility in the time slot', csvHeaderPattern: 'flexibility in the time slot' },
  { id: 6, area: '3. Program Implementations / Schedule', text: 'The flow of the program is smooth and without ad-lib', csvHeaderPattern: 'flow of the program' },
  { id: 7, area: '3. Program Implementations / Schedule', text: 'The content of the program is well-organized and informative.', csvHeaderPattern: 'well-organized and informative' },
  { id: 8, area: '3. Program Implementations / Schedule', text: 'The topics are discussed thoroughly and executed effectively.', csvHeaderPattern: 'discussed thoroughly' },
  { id: 9, area: '3. Program Implementations / Schedule', text: 'The organizers were effective in their functions.', csvHeaderPattern: 'organizers were effective' },
  { id: 10, area: '3. Program Implementations / Schedule', text: 'The chosen modality and instruction are accessible, student-friendly, and hassle-free.', csvHeaderPattern: 'modality and instruction' },
  { id: 11, area: '4. Speakers', text: 'The speakers are competent and have mastery on the topics assigned to them.', csvHeaderPattern: 'speakers are competent' },
  { id: 12, area: '4. Speakers', text: 'The speakers talk articulately.', csvHeaderPattern: 'speakers talk articulately' },
  { id: 13, area: '5. Venue', text: 'The venue is accessible, clean and adequate in size.', csvHeaderPattern: 'venue is accessible' },
  { id: 14, area: '5. Venue', text: 'It is well-ventilated.', csvHeaderPattern: 'well-ventilated' },
  { id: 15, area: '5. Venue', text: 'It is equipped with functional amenities.', csvHeaderPattern: 'equipped with functional' },
  { id: 16, area: '6. Meals', text: 'The food is served on time.', csvHeaderPattern: 'food is served' },
  { id: 17, area: '6. Meals', text: 'The food is balanced and nutritious.', csvHeaderPattern: 'food is balanced' },
];

const parseCsvLine = (text: string): string[] => {
  const result: string[] = [];
  let cell = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === ',' && !inQuotes) {
      result.push(cell.trim());
      cell = '';
    } else {
      cell += c;
    }
  }
  result.push(cell.trim());
  return result;
};

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

  // --- Rating Report States ---
  const [ratingEventId, setRatingEventId] = useState(() => localStorage.getItem('specs_rating_event_id') || '');
  const [ratingDate, setRatingDate] = useState(() => localStorage.getItem('specs_rating_date') || '');
  const [ratingResponsesCount, setRatingResponsesCount] = useState(() => 
    parseInt(localStorage.getItem('specs_rating_responses_count') || '0', 10)
  );
  
  const [ratingScores, setRatingScores] = useState<Record<number, number | null>>(() => {
    try {
      const saved = localStorage.getItem('specs_rating_scores');
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial: Record<number, number | null> = {};
    EVALUATION_CRITERIA.forEach(c => { initial[c.id] = null; });
    return initial;
  });

  const [ratingApplicable, setRatingApplicable] = useState<Record<number, boolean>>(() => {
    try {
      const saved = localStorage.getItem('specs_rating_applicable');
      if (saved) return JSON.parse(saved);
    } catch {}
    const initial: Record<number, boolean> = {};
    EVALUATION_CRITERIA.forEach(c => { initial[c.id] = true; });
    return initial;
  });

  const [ratingInterpretation, setRatingInterpretation] = useState(() => 
    localStorage.getItem('specs_rating_interpretation') || ''
  );

  useEffect(() => {
    localStorage.setItem('specs_rating_event_id', ratingEventId);
    localStorage.setItem('specs_rating_date', ratingDate);
    localStorage.setItem('specs_rating_responses_count', String(ratingResponsesCount));
    localStorage.setItem('specs_rating_scores', JSON.stringify(ratingScores));
    localStorage.setItem('specs_rating_applicable', JSON.stringify(ratingApplicable));
    localStorage.setItem('specs_rating_interpretation', ratingInterpretation);
  }, [ratingEventId, ratingDate, ratingResponsesCount, ratingScores, ratingApplicable, ratingInterpretation]);

  const calculateOverall = (scores: Record<number, number | null>, applicable: Record<number, boolean>): number => {
    let sum = 0;
    let count = 0;
    EVALUATION_CRITERIA.forEach(crit => {
      const isApplicable = applicable[crit.id] !== false;
      const score = scores[crit.id];
      if (isApplicable && score != null) {
        sum += score;
        count++;
      }
    });
    return count > 0 ? sum / count : 0;
  };

  const getRatingVerbalDescription = (score: number): string => {
    if (score >= 4.75) return 'EXCELLENT';
    if (score >= 3.75) return 'VERY GOOD';
    if (score >= 2.75) return 'GOOD';
    if (score >= 1.75) return 'NEEDS IMPROVEMENT';
    return 'NOT APPLICABLE';
  };

  // Derived active values
  const selectedEventId = 
    activeReport === 'narrative' ? narrativeEventId : 
    activeReport === 'documentation' ? docEventId : 
    activeReport === 'rating' ? ratingEventId : '';

  const reportDate = 
    activeReport === 'narrative' ? narrativeDate : 
    activeReport === 'documentation' ? docDate : 
    activeReport === 'rating' ? ratingDate : '';

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
    } else if (activeReport === 'documentation') {
      setDocEventId(eventId);
      setDocDate(dateVal);
      // Clean up previous image URLs
      docImages.forEach(img => URL.revokeObjectURL(img.url));
      setDocImages([]);
    } else if (activeReport === 'rating') {
      setRatingEventId(eventId);
      setRatingDate(dateVal);
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

  const handleScoreChange = (id: number, val: string) => {
    const parsed = parseFloat(val);
    const updated = { ...ratingScores };
    if (val === '' || isNaN(parsed)) {
      updated[id] = null;
    } else {
      updated[id] = Math.min(5, Math.max(1, parsed));
    }
    setRatingScores(updated);
    
    // Auto-update overall score and interpretation
    const computedOverall = calculateOverall(updated, ratingApplicable);
    const verb = getRatingVerbalDescription(computedOverall);
    setRatingInterpretation(
      `In general, the implementation of the activity was successful. Based on an overall score resulting in ${computedOverall > 0 ? computedOverall.toFixed(2) : '0.00'}, the transcribed data matches the word description "${verb}".`
    );
  };

  const handleToggleApplicable = (id: number, val: boolean) => {
    const updatedApplicable = { ...ratingApplicable, [id]: val };
    setRatingApplicable(updatedApplicable);
    
    // Auto-update overall score and interpretation
    const computedOverall = calculateOverall(ratingScores, updatedApplicable);
    const verb = getRatingVerbalDescription(computedOverall);
    setRatingInterpretation(
      `In general, the implementation of the activity was successful. Based on an overall score resulting in ${computedOverall > 0 ? computedOverall.toFixed(2) : '0.00'}, the transcribed data matches the word description "${verb}".`
    );
  };

  const handleZipUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if it is a ZIP or CSV file
    const isZip = file.name.toLowerCase().endsWith('.zip');
    const isCsv = file.name.toLowerCase().endsWith('.csv');

    if (!isZip && !isCsv) {
      addToast({ type: 'error', title: 'Invalid File', message: 'Please upload a .zip or .csv file.' });
      return;
    }

    const processCsvContent = (csvText: string) => {
      const lines = csvText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) return null;

      const headers = parseCsvLine(lines[0]);
      const dataRows = lines.slice(1).map(line => parseCsvLine(line));
      return { headers, dataRows };
    };

    if (isCsv) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const csvText = event.target?.result as string;
          const parsed = processCsvContent(csvText);
          if (!parsed) {
            addToast({ type: 'warning', title: 'Empty File', message: 'The CSV file was empty.' });
            return;
          }

          applyParsedData(parsed.headers, parsed.dataRows);
        } catch (err: any) {
          addToast({ type: 'error', title: 'Parse Error', message: err.message || 'Failed to parse CSV file.' });
        }
      };
      reader.readAsText(file);
    } else {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const arrayBuffer = event.target?.result as ArrayBuffer;
          const zip = await JSZip.loadAsync(arrayBuffer);
          
          let allRows: string[][] = [];
          let headers: string[] = [];

          // Find all CSV files in the zip
          const csvFiles = Object.keys(zip.files).filter(name => name.toLowerCase().endsWith('.csv'));
          if (csvFiles.length === 0) {
            addToast({ type: 'error', title: 'Invalid File', message: 'No CSV files found inside the ZIP.' });
            return;
          }

          for (const filename of csvFiles) {
            const csvText = await zip.files[filename].async('text');
            const parsed = processCsvContent(csvText);
            if (!parsed) continue;

            if (headers.length === 0) {
              headers = parsed.headers;
            }
            allRows = allRows.concat(parsed.dataRows);
          }

          if (allRows.length === 0) {
            addToast({ type: 'warning', title: 'Empty Data', message: 'No evaluation records found in the ZIP CSV files.' });
            return;
          }

          applyParsedData(headers, allRows);
        } catch (err: any) {
          addToast({ type: 'error', title: 'Import Failed', message: err.message || 'Failed to process zip file.' });
        }
      };
      reader.readAsArrayBuffer(file);
    }

    e.target.value = ''; // clear input
  };

  const applyParsedData = (headers: string[], dataRows: string[][]) => {
    // Map evaluation criteria questions to CSV columns
    const columnIndices: Record<number, number> = {};
    EVALUATION_CRITERIA.forEach(crit => {
      const idx = headers.findIndex(h => 
        h.toLowerCase().includes(crit.csvHeaderPattern.toLowerCase()) ||
        h.toLowerCase().replace(/\s+/g, '').includes(crit.text.toLowerCase().replace(/\s+/g, ''))
      );
      if (idx !== -1) {
        columnIndices[crit.id] = idx;
      } else {
        // Fallback match by question index (e.g. starts with "1.", "2.")
        const prefixIdx = headers.findIndex(h => h.trim().startsWith(`${crit.id}.`));
        if (prefixIdx !== -1) {
          columnIndices[crit.id] = prefixIdx;
        }
      }
    });

    // Compute average ratings for each question
    const newScores: Record<number, number | null> = {};
    const newApplicable = { ...ratingApplicable };
    EVALUATION_CRITERIA.forEach(crit => {
      const colIdx = columnIndices[crit.id];
      if (colIdx === undefined) {
        newScores[crit.id] = null;
        newApplicable[crit.id] = false;
        return;
      }

      let sum = 0;
      let count = 0;

      dataRows.forEach(row => {
        const rawVal = row[colIdx];
        if (rawVal) {
          const val = parseFloat(rawVal);
          if (!isNaN(val) && val > 1 && val <= 5) {
            sum += val;
            count++;
          }
        }
      });

      const averageScore = count > 0 ? parseFloat((sum / count).toFixed(2)) : null;
      newScores[crit.id] = averageScore;
      if (averageScore === null) {
        newApplicable[crit.id] = false;
      } else {
        newApplicable[crit.id] = true;
      }
    });

    setRatingScores(newScores);
    setRatingApplicable(newApplicable);
    setRatingResponsesCount(dataRows.length);
    
    // Auto-compute overall score and update interpretation text
    const computedOverall = calculateOverall(newScores, newApplicable);
    const verb = getRatingVerbalDescription(computedOverall);
    setRatingInterpretation(
      `In general, the implementation of the activity was successful. Based on an overall score resulting in ${computedOverall.toFixed(2)}, the transcribed data matches the word description "${verb}".`
    );

    addToast({ 
      type: 'success', 
      title: 'Import Successful', 
      message: `Successfully parsed ${dataRows.length} evaluation responses.` 
    });
  };

  // Resolution form
  const [resNumber, setResNumber] = useState(() => localStorage.getItem('specs_res_number') || '01');
  const [resAcademicYear, setResAcademicYear] = useState(() => {
    const saved = localStorage.getItem('specs_res_academic_year');
    if (saved) return saved;
    const now = new Date();
    const currentYear = now.getFullYear();
    const nextYear = currentYear + 1;
    return `${currentYear}-${nextYear}`;
  });
  const [resExcerpt, setResExcerpt] = useState(() => localStorage.getItem('specs_res_excerpt') || '');
  const [resTitle, setResTitle] = useState(() => localStorage.getItem('specs_res_title') || '');
  const [resWhereasClauses, setResWhereasClauses] = useState<string[]>(() => {
    const saved = localStorage.getItem('specs_res_whereas_clauses');
    return saved ? JSON.parse(saved) : [''];
  });
  const [resActionClause, setResActionClause] = useState(() => localStorage.getItem('specs_res_action_clause') || '');
  const [resResolvedFurther, setResResolvedFurther] = useState(() => localStorage.getItem('specs_res_resolved_further') || '');
  const [resConformed, setResConformed] = useState(() => localStorage.getItem('specs_res_conformed') === 'true');

  // Persistence Effects
  useEffect(() => {
    localStorage.setItem('specs_res_number', resNumber);
    localStorage.setItem('specs_res_academic_year', resAcademicYear);
    localStorage.setItem('specs_res_excerpt', resExcerpt);
    localStorage.setItem('specs_res_title', resTitle);
    localStorage.setItem('specs_res_whereas_clauses', JSON.stringify(resWhereasClauses));
    localStorage.setItem('specs_res_action_clause', resActionClause);
    localStorage.setItem('specs_res_resolved_further', resResolvedFurther);
    localStorage.setItem('specs_res_conformed', String(resConformed));
  }, [resNumber, resAcademicYear, resExcerpt, resTitle, resWhereasClauses, resActionClause, resResolvedFurther, resConformed]);

  // Activity Proposal form
  const [propTitle, setPropTitle] = useState(() => localStorage.getItem('specs_prop_title') || '');
  const [propProponents, setPropProponents] = useState(() => localStorage.getItem('specs_prop_proponents') || 'SOCIETY OF PROGRAMMERS AND ENTHUSIASTS IN COMPUTER SCIENCE (SPECS)');
  const [propDate, setPropDate] = useState(() => localStorage.getItem('specs_prop_date') || '');
  const [propTime, setPropTime] = useState(() => localStorage.getItem('specs_prop_time') || '');
  const [propVenue, setPropVenue] = useState(() => localStorage.getItem('specs_prop_venue') || '');
  const [propParticipants, setPropParticipants] = useState(() => localStorage.getItem('specs_prop_participants') || '');
  const [propRationale, setPropRationale] = useState(() => localStorage.getItem('specs_prop_rationale') || '');
  const [propObjectives, setPropObjectives] = useState<string[]>(() => {
    const saved = localStorage.getItem('specs_prop_objectives');
    return saved ? JSON.parse(saved) : [''];
  });
  const [propDescription, setPropDescription] = useState(() => localStorage.getItem('specs_prop_description') || '');
  const [propBudgetItems, setPropBudgetItems] = useState<Array<{ item: string; quantity: string; cost: string }>>(() => {
    const saved = localStorage.getItem('specs_prop_budget_items');
    return saved ? JSON.parse(saved) : [{ item: '', quantity: '', cost: '' }];
  });
  const [propSourceOfFunds, setPropSourceOfFunds] = useState(() => localStorage.getItem('specs_prop_source_of_funds') || 'S.P.E.C.S. Funds');
  const [propExpectedOutputs, setPropExpectedOutputs] = useState<string[]>(() => {
    const saved = localStorage.getItem('specs_prop_expected_outputs');
    return saved ? JSON.parse(saved) : [''];
  });

  useEffect(() => {
    localStorage.setItem('specs_prop_title', propTitle);
    localStorage.setItem('specs_prop_proponents', propProponents);
    localStorage.setItem('specs_prop_date', propDate);
    localStorage.setItem('specs_prop_time', propTime);
    localStorage.setItem('specs_prop_venue', propVenue);
    localStorage.setItem('specs_prop_participants', propParticipants);
    localStorage.setItem('specs_prop_rationale', propRationale);
    localStorage.setItem('specs_prop_objectives', JSON.stringify(propObjectives));
    localStorage.setItem('specs_prop_description', propDescription);
    localStorage.setItem('specs_prop_budget_items', JSON.stringify(propBudgetItems));
    localStorage.setItem('specs_prop_source_of_funds', propSourceOfFunds);
    localStorage.setItem('specs_prop_expected_outputs', JSON.stringify(propExpectedOutputs));
  }, [
    propTitle, propProponents, propDate, propTime, propVenue, propParticipants,
    propRationale, propObjectives, propDescription, propBudgetItems, propSourceOfFunds, propExpectedOutputs
  ]);
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

  // ID Card Generator States
  const [allStudents, setAllStudents] = useState<any[]>([]);
  const [idCardSearch, setIdCardSearch] = useState('');
  const [selectedStudentForId, setSelectedStudentForId] = useState('');
  const [selectedIdCardDataForModal, setSelectedIdCardDataForModal] = useState<IDCardData | null>(null);
  const [idCategoryFilter, setIdCategoryFilter] = useState<'all' | 'officers' | 'students' | 'custom'>('all');
  const [customBlankData, setCustomBlankData] = useState({
    name: '',
    studentId: '',
    role: 'student' as 'student' | 'officer',
    position: '',
    section: '',
    yearLevel: '',
    email: '',
    address: ''
  });

  const loadStudents = async () => {
    try {
      const res = await cachedApi.students.listAllProfiles();
      setAllStudents(res.documents || []);
    } catch (err: any) {
      console.error('Failed to load students for ID generator:', err);
    }
  };

  useEffect(() => {
    loadSignatories();
    loadEvents();
    loadOfficers();
    loadStudents();
  }, []);

  const selectedIdCardData = useMemo<IDCardData | null>(() => {
    if (selectedStudentForId === 'custom_blank') {
      return {
        id: 'custom_blank',
        name: customBlankData.name || 'FULL NAME',
        studentId: customBlankData.studentId || 'STUDENT ID',
        role: customBlankData.role,
        position: customBlankData.position,
        section: customBlankData.section,
        yearLevel: customBlankData.yearLevel,
        email: customBlankData.email,
        address: customBlankData.address
      };
    }
    if (!selectedStudentForId) return null;
    if (selectedStudentForId.startsWith('off_')) {
      const offId = selectedStudentForId.replace('off_', '');
      const off = officers.find(o => o.$id === offId);
      if (!off) return null;
      const std = off.students && typeof off.students === 'object' ? off.students : null;
      return {
        id: std?.$id || off.$id,
        name: std?.name || off.name_officer || 'Executive Officer',
        studentId: std?.student_id ? String(std.student_id) : off.$id,
        role: 'officer',
        position: off.position || 'Officer',
        section: std?.section,
        yearLevel: std?.yearLevel,
        email: std?.email,
        address: std?.address
      };
    } else if (selectedStudentForId.startsWith('std_')) {
      const stdId = selectedStudentForId.replace('std_', '');
      const std = allStudents.find(s => s.$id === stdId);
      if (!std) return null;
      return {
        id: std.$id,
        name: std.name || 'Student Member',
        studentId: std.student_id ? String(std.student_id) : std.$id,
        role: 'student',
        section: std.section,
        yearLevel: std.yearLevel,
        email: std.email,
        address: std.address
      };
    }
    return null;
  }, [selectedStudentForId, officers, allStudents, customBlankData]);

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

  const assignSignatoryToSlot = (signatoryId: string, rowIdx: number, side: 'left' | 'right') => {
    const newRows = layout.rows.map(r => ({ left: r.left, right: r.right }));

    // Also remove from any other slot (in case it was placed elsewhere)
    newRows.forEach(r => {
      if (r.left === signatoryId) r.left = null;
      if (r.right === signatoryId) r.right = null;
    });

    // Ensure target row exists
    while (newRows.length <= rowIdx) {
      newRows.push({ left: null, right: null });
    }

    if (side === 'left') {
      if (newRows[rowIdx].left && newRows[rowIdx].left !== signatoryId) {
        const displaced = newRows[rowIdx].left;
        newRows[rowIdx].left = signatoryId;
        newRows.splice(rowIdx + 1, 0, { left: displaced, right: null });
      } else {
        newRows[rowIdx].left = signatoryId;
      }
    } else {
      if (newRows[rowIdx].right && newRows[rowIdx].right !== signatoryId) {
        const displaced = newRows[rowIdx].right;
        newRows[rowIdx].right = signatoryId;
        newRows.splice(rowIdx + 1, 0, { left: null, right: displaced });
      } else {
        newRows[rowIdx].right = signatoryId;
      }
    }

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

  const renderConformedSignatoriesHtml = () => {
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

    const secretaryDetails = getOfficerDetails('secretary', 'Executive Secretary');
    const presidentDetails = getOfficerDetails('president', 'President');
    
    const POSITION_RANK: Record<string, number> = {
      'vice-president-internal': 1,
      'vice-president-external': 2,
      'asst-secretary': 3,
      'treasurer': 4,
      'asst-treasurer': 5,
      'auditor': 6,
      'p.i.o': 7,
      'business-mngr-1': 8,
      'business-mngr-2': 9,
      'srgt-arms-1': 10,
      'sgrt-arms-2': 11,
      'representative': 12,
    };

    const getRoleLabel = (pos: string, officer: any) => {
      const labels: Record<string, string> = {
        'vice-president-internal': 'Vice-President Internal Affairs',
        'vice-president-external': 'Vice-President External Affairs',
        'asst-secretary': 'Assistant Secretary',
        'treasurer': 'Treasurer',
        'asst-treasurer': 'Assistant Treasurer',
        'auditor': 'Auditor',
        'p.i.o': 'Public Information Officer',
        'business-mngr-1': 'Business Manager',
        'business-mngr-2': 'Business Manager',
        'srgt-arms-1': 'Sergeant at Arms',
        'sgrt-arms-2': 'Sergeant at Arms',
      };
      if (pos === 'representative') {
        const student = officer.students && typeof officer.students === 'object' ? officer.students : null;
        if (student && student.yearLevel && student.section) {
          const sec = student.section.toUpperCase();
          const prefix = /^\d/.test(sec) ? '' : student.yearLevel;
          return `${prefix}${sec} Representative`;
        }
        return 'Representative';
      }
      return labels[pos] || pos;
    };

    const conformedOfficersList = officers
      .filter(o => o.position !== 'president' && o.position !== 'secretary')
      .sort((a, b) => {
        const rankA = POSITION_RANK[a.position || ''] || 99;
        const rankB = POSITION_RANK[b.position || ''] || 99;
        return rankA - rankB;
      });

    const conformedGridItems = conformedOfficersList.map(o => {
      const student = o.students && typeof o.students === 'object' ? o.students : null;
      const name = student?.name ? student.name.toUpperCase() : '_______________________';
      const role = getRoleLabel(o.position || '', o);
      return `
        <div style="text-align: left; page-break-inside: avoid;">
          <p style="font-weight: bold; font-size: 11pt; margin: 0 0 2px 0; text-transform: uppercase;">${name}</p>
          <p style="font-size: 9.5pt; font-style: italic; margin: 0; color: #475569;">${role}, SPECS</p>
        </div>
      `;
    }).join('');

    return `
      <div style="margin-top: 50px; font-family: 'Times New Roman', Times, serif; font-size: 11pt; line-height: 1.5; page-break-inside: avoid;">
        <!-- Certification -->
        <div style="text-align: right; margin-bottom: 30px; page-break-inside: avoid; margin-left: auto; width: 300px;">
          <p style="font-style: italic; margin: 0 0 35px 0;">Certified true and correct;</p>
          <p style="font-weight: bold; font-size: 11.5pt; margin: 0 0 2px 0; text-transform: uppercase;">${secretaryDetails.name}</p>
          <p style="font-size: 10pt; font-style: italic; margin: 0; color: #475569;">Executive Secretary, SPECS</p>
        </div>

        <!-- Attestation -->
        <div style="text-align: left; margin-bottom: 40px; page-break-inside: avoid; width: 300px;">
          <p style="font-style: italic; margin: 0 0 35px 0;">Attested by;</p>
          <p style="font-weight: bold; font-size: 11.5pt; margin: 0 0 2px 0; text-transform: uppercase;">${presidentDetails.name}</p>
          <p style="font-size: 10pt; font-style: italic; margin: 0; color: #475569;">President, SPECS</p>
        </div>

        <!-- Conformed by grid -->
        <div style="text-align: left; margin-bottom: 40px; page-break-inside: avoid;">
          <p style="font-style: italic; margin: 0 0 25px 0;">Conformed by;</p>
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px 40px; width: 100%;">
            ${conformedGridItems || '<div style="grid-column: span 2; font-style: italic; color: #94a3b8;">No other officers conformed.</div>'}
          </div>
        </div>

        <!-- Adviser Approval -->
        <div style="text-align: left; page-break-inside: avoid; width: 300px; margin-top: 40px;">
          <p style="font-style: italic; margin: 0 0 35px 0;">Approved by:</p>
          <p style="font-weight: bold; font-size: 11.5pt; margin: 0 0 2px 0; text-transform: uppercase;">NICOLAS A. PURA</p>
          <p style="font-size: 10pt; font-style: italic; margin: 0; color: #475569;">Adviser, SPECS</p>
        </div>
      </div>
    `;
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
      const grouped: Record<string, typeof EVALUATION_CRITERIA> = {};
      EVALUATION_CRITERIA.forEach(crit => {
        if (!grouped[crit.area]) {
          grouped[crit.area] = [];
        }
        grouped[crit.area].push(crit);
      });

      let tableRowsHtml = '';
      Object.keys(grouped).forEach(area => {
        const crits = grouped[area];
        let groupRowsHtml = '';
        crits.forEach((crit, idx) => {
          const isApplicable = ratingApplicable[crit.id] !== false;
          const scoreVal = ratingScores[crit.id];
          const ratingText = isApplicable ? (scoreVal != null ? scoreVal.toFixed(2) : 'N/A') : 'N/A';

          groupRowsHtml += `
            <tr style="page-break-inside: avoid; break-inside: avoid;">
              ${idx === 0 ? `<td rowspan="${crits.length}" style="border: 1px solid black; padding: 6px; font-weight: bold; vertical-align: top; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${area}</td>` : ''}
              <td style="border: 1px solid black; padding: 6px; text-align: left; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${crit.text}</td>
              <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${ratingText}</td>
            </tr>
          `;
        });

        tableRowsHtml += `
          <tbody style="page-break-inside: avoid; break-inside: avoid;">
            ${groupRowsHtml}
          </tbody>
        `;
      });

      const computedOverall = calculateOverall(ratingScores, ratingApplicable);

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none; margin-top: 10px;">
          <div style="text-align: center; background-color: #7ee8a2; border: 1.5px solid #042f1a; color: #042f1a; font-weight: bold; padding: 6px; font-size: 11pt; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px; page-break-inside: avoid;">
            EVALUATION
          </div>

          <div style="font-size: 10pt; margin-bottom: 20px; line-height: 1.4; page-break-inside: avoid;">
            <p style="font-weight: bold; margin: 0 0 5px 0;">Rating for the evaluation form where:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 0; padding: 0;">
              <span><strong>5</strong> &ndash; Excellent</span>
              <span><strong>4</strong> &ndash; Very Good</span>
              <span><strong>3</strong> &ndash; Good</span>
              <span><strong>2</strong> &ndash; Needs Improvement</span>
              <span><strong>1</strong> &ndash; Not Applicable</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid black;">
            <thead>
              <tr style="background-color: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: left; font-family: 'Times New Roman', Times, serif; width: 25%;">AREA</th>
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: left; font-family: 'Times New Roman', Times, serif; width: 55%;">CRITERIA</th>
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: center; font-family: 'Times New Roman', Times, serif; width: 20%;">AVERAGE RATING</th>
              </tr>
            </thead>
            ${tableRowsHtml}
            <tbody>
              <tr style="font-weight: bold; background-color: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
                <td colspan="2" style="border: 1px solid black; padding: 8px; text-align: right; font-size: 10.5pt; font-family: 'Times New Roman', Times, serif;">OVERALL RATING</td>
                <td style="border: 1px solid black; padding: 8px; text-align: center; font-size: 10.5pt; font-family: 'Times New Roman', Times, serif; font-weight: bold;">
                  ${computedOverall > 0 ? computedOverall.toFixed(2) : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>

          ${ratingInterpretation ? `
            <div style="margin-bottom: 35px; line-height: 1.6; font-size: 10.5pt; text-align: justify; page-break-inside: avoid;">
              <p style="margin: 0;"><strong>Interpretations:</strong> ${ratingInterpretation}</p>
            </div>
          ` : ''}
        </div>
        ${signatoriesHtml}
      `;
    } else if (activeReport === 'resolution') {
      const whereasItems = resWhereasClauses
        .filter(c => c.trim() !== '')
        .map(c => {
          const trimmed = c.trim();
          const suffix = trimmed.endsWith(';') || trimmed.endsWith(',') || trimmed.endsWith('.') ? '' : ';';
          return `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none;"><strong>WHEREAS,</strong> ${trimmed}${suffix}</p>`;
        })
        .join('');

      const actionSuffix = resActionClause.trim().endsWith(';') || resActionClause.trim().endsWith('.') ? '' : ';';
      const resolvedSuffix = resResolvedFurther.trim().endsWith('.') || resResolvedFurther.trim().endsWith(';') ? '' : '.';

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none;">
          ${resExcerpt ? `<p style="text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 25px; line-height: 1.4;">${resExcerpt}</p>` : ''}
          
          <p style="text-align: center; font-weight: bold; font-size: 12pt; margin: 0 0 15px 0; letter-spacing: 0.5px; text-transform: none;">
            Resolution No. ${resNumber || '01'}, Series of A/Y ${resAcademicYear || '2025-2026'}
          </p>
          
          <h2 style="text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0 0 35px 0; line-height: 1.5; padding: 0 10px;">
            ${resTitle || 'A RESOLUTION APPROVING...' }
          </h2>

          <div style="margin-bottom: 25px;">
            ${whereasItems || '<p style="text-align: center; font-style: italic; color: #94a3b8;">No rationale clauses added.</p>'}
          </div>

          <p style="text-align: justify; text-indent: 0.5in; margin-bottom: 20px; font-size: 11pt; line-height: 1.6; text-transform: none;">
            <strong>NOW, THEREFORE, BE IT RESOLVED,</strong> ${resActionClause || 'as it is hereby approved...'}${actionSuffix}
          </p>

          ${resResolvedFurther ? `
            <p style="text-align: justify; text-indent: 0.5in; margin-bottom: 30px; font-size: 11pt; line-height: 1.6; text-transform: none;">
              <strong>RESOLVED FURTHER,</strong> ${resResolvedFurther}${resolvedSuffix}
            </p>
          ` : ''}
        </div>
        ${resConformed ? renderConformedSignatoriesHtml() : signatoriesHtml}
      `;
    } else if (activeReport === 'proposal') {
      const objectivesHtml = propObjectives
        .filter(o => o.trim() !== '')
        .map(o => `<li style="margin-bottom: 8px;">${o.trim()}</li>`)
        .join('');

      const expectedHtml = propExpectedOutputs
        .filter(o => o.trim() !== '')
        .map(o => `<li style="margin-bottom: 8px;">${o.trim()}</li>`)
        .join('');

      const rationaleParagraphs = propRationale
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; text-transform: none;">${p.trim()}</p>`)
        .join('');

      const descriptionParagraphs = propDescription
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; text-transform: none;">${p.trim()}</p>`)
        .join('');

      const budgetRows = propBudgetItems
        .filter(b => b.item.trim() !== '')
        .map(b => {
          const cost = parseFloat(b.cost.replace(/[^\d.]/g, '')) || 0;
          return `
            <tr>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: left; font-family: 'Times New Roman', Times, serif; text-transform: none;">${b.item}</td>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: center; font-family: 'Times New Roman', Times, serif;">${b.quantity}</td>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: right; font-family: 'Times New Roman', Times, serif;">₱${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        })
        .join('');

      const totalBudget = propBudgetItems.reduce((acc, b) => {
        const cost = parseFloat(b.cost.replace(/[^\d.]/g, '')) || 0;
        return acc + cost;
      }, 0);

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; font-size: 11pt;">
          <h2 style="text-align: center; font-weight: bold; font-size: 13pt; text-transform: uppercase; margin: 0 0 30px 0;">
            ACTIVITY PROPOSAL
          </h2>

          <!-- Specifications Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: none;">
            <tbody>
              <tr>
                <td style="width: 32%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">I. &nbsp; TITLE OF ACTIVITY</td>
                <td style="width: 3%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="width: 65%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase;">${propTitle || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">II. &nbsp; PROPONENTS</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propProponents || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">III. &nbsp; DATE OF IMPLEMENTATION</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propDate || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">IV. &nbsp; TIME</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propTime || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">V. &nbsp; VENUE</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propVenue || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">VI. &nbsp; TARGET PARTICIPANTS</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propParticipants || '_______________________'}</td>
              </tr>
            </tbody>
          </table>

          <!-- VII. Rationale -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">VII. &nbsp; RATIONALE</p>
            ${rationaleParagraphs || '<p style="font-style: italic; color: #94a3b8;">No rationale text added.</p>'}
          </div>

          <!-- VIII. Objectives -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">VIII. &nbsp; OBJECTIVES</p>
            <p style="margin: 0 0 8px 0;">This activity aims to:</p>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0; text-transform: none;">
              ${objectivesHtml || '<li style="font-style: italic; color: #94a3b8;">No objectives added.</li>'}
            </ul>
          </div>

          <!-- IX. Activity Description -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">IX. &nbsp; ACTIVITY DESCRIPTION</p>
            ${descriptionParagraphs || '<p style="font-style: italic; color: #94a3b8;">No description text added.</p>'}
          </div>

          <!-- X. Budgetary Requirements -->
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">X. &nbsp; BUDGETARY REQUIREMENTS</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: left; font-family: 'Times New Roman', Times, serif;">Items</th>
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: center; font-family: 'Times New Roman', Times, serif; width: 20%;">Quantity</th>
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: right; font-family: 'Times New Roman', Times, serif; width: 25%;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${budgetRows || '<tr><td colspan="3" style="border: 1px solid black; padding: 6px; text-align: center; font-style: italic;">No items specified.</td></tr>'}
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid black; padding: 6px; text-align: left; font-family: 'Times New Roman', Times, serif;">Total</td>
                  <td style="border: 1px solid black; padding: 6px;"></td>
                  <td style="border: 1px solid black; padding: 6px; text-align: right; font-family: 'Times New Roman', Times, serif;">₱${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 11pt; margin-top: 10px; font-family: 'Times New Roman', Times, serif; text-transform: none;">
              Source of Funds: ${propSourceOfFunds || 'S.P.E.C.S. Funds'}
            </p>
          </div>

          <!-- XI. Expected Output -->
          <div style="margin-bottom: 35px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">XI. &nbsp; EXPECTED OUTPUT</p>
            <p style="margin: 0 0 8px 0;">By the end of the activity, the following outcomes are expected:</p>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0; text-transform: none;">
              ${expectedHtml || '<li style="font-style: italic; color: #94a3b8;">No outcomes added.</li>'}
            </ul>
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
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 5cm;
              z-index: 1000;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-header img {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .print-footer {
              position: fixed;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 3cm;
              z-index: 1000;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-footer img {
              position: absolute !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
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
                  ${(activeReport !== 'resolution' && activeReport !== 'proposal') ? `
                    <h2 class="report-title">${eventTitle}</h2>
                    <h3 style="text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0 0 20px 0; color: #334155; font-family: 'Times New Roman', Times, serif;">
                      ${activeReport === 'narrative' ? 'Narrative Report' : REPORT_LABELS[activeReport]}
                    </h3>
                    <p style="text-align: center; font-size: 10pt; font-style: italic; margin-top: -15px; margin-bottom: 25px;">
                      Date of Event: ${formattedDate}
                    </p>
                  ` : ''}
                  
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
      const grouped: Record<string, typeof EVALUATION_CRITERIA> = {};
      EVALUATION_CRITERIA.forEach(crit => {
        if (!grouped[crit.area]) {
          grouped[crit.area] = [];
        }
        grouped[crit.area].push(crit);
      });

      let tableRowsHtml = '';
      Object.keys(grouped).forEach(area => {
        const crits = grouped[area];
        let groupRowsHtml = '';
        crits.forEach((crit, idx) => {
          const isApplicable = ratingApplicable[crit.id] !== false;
          const scoreVal = ratingScores[crit.id];
          const ratingText = isApplicable ? (scoreVal != null ? scoreVal.toFixed(2) : 'N/A') : 'N/A';

          groupRowsHtml += `
            <tr style="page-break-inside: avoid; break-inside: avoid;">
              ${idx === 0 ? `<td rowspan="${crits.length}" style="border: 1px solid black; padding: 6px; font-weight: bold; vertical-align: top; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${area}</td>` : ''}
              <td style="border: 1px solid black; padding: 6px; text-align: left; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${crit.text}</td>
              <td style="border: 1px solid black; padding: 6px; text-align: center; font-weight: bold; font-size: 10pt; font-family: 'Times New Roman', Times, serif;">${ratingText}</td>
            </tr>
          `;
        });

        tableRowsHtml += `
          <tbody style="page-break-inside: avoid; break-inside: avoid;">
            ${groupRowsHtml}
          </tbody>
        `;
      });

      const computedOverall = calculateOverall(ratingScores, ratingApplicable);

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none; margin-top: 10px;">
          <div style="text-align: center; background-color: #7ee8a2; border: 1.5px solid #042f1a; color: #042f1a; font-weight: bold; padding: 6px; font-size: 11pt; margin-bottom: 25px; text-transform: uppercase; letter-spacing: 0.5px; page-break-inside: avoid;">
            EVALUATION
          </div>

          <div style="font-size: 10pt; margin-bottom: 20px; line-height: 1.4; page-break-inside: avoid;">
            <p style="font-weight: bold; margin: 0 0 5px 0;">Rating for the evaluation form where:</p>
            <div style="display: flex; flex-wrap: wrap; gap: 15px; margin: 0; padding: 0;">
              <span><strong>5</strong> &ndash; Excellent</span>
              <span><strong>4</strong> &ndash; Very Good</span>
              <span><strong>3</strong> &ndash; Good</span>
              <span><strong>2</strong> &ndash; Needs Improvement</span>
              <span><strong>1</strong> &ndash; Not Applicable</span>
            </div>
          </div>

          <table style="width: 100%; border-collapse: collapse; margin-bottom: 25px; border: 1px solid black;">
            <thead>
              <tr style="background-color: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: left; font-family: 'Times New Roman', Times, serif; width: 25%;">AREA</th>
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: left; font-family: 'Times New Roman', Times, serif; width: 55%;">CRITERIA</th>
                <th style="border: 1px solid black; padding: 6px; font-size: 10pt; text-align: center; font-family: 'Times New Roman', Times, serif; width: 20%;">AVERAGE RATING</th>
              </tr>
            </thead>
            ${tableRowsHtml}
            <tbody>
              <tr style="font-weight: bold; background-color: #f8fafc; page-break-inside: avoid; break-inside: avoid;">
                <td colspan="2" style="border: 1px solid black; padding: 8px; text-align: right; font-size: 10.5pt; font-family: 'Times New Roman', Times, serif;">OVERALL RATING</td>
                <td style="border: 1px solid black; padding: 8px; text-align: center; font-size: 10.5pt; font-family: 'Times New Roman', Times, serif; font-weight: bold;">
                  ${computedOverall > 0 ? computedOverall.toFixed(2) : 'N/A'}
                </td>
              </tr>
            </tbody>
          </table>


          ${ratingInterpretation ? `
            <div style="margin-bottom: 35px; line-height: 1.6; font-size: 10.5pt; text-align: justify; page-break-inside: avoid;">
              <p style="margin: 0;"><strong>Interpretations:</strong> ${ratingInterpretation}</p>
            </div>
          ` : ''}
        </div>
        <div id="signatories-wrapper">
          ${signatoriesHtml}
        </div>
      `;
    } else if (activeReport === 'resolution') {
      const whereasItems = resWhereasClauses
        .filter(c => c.trim() !== '')
        .map(c => {
          const trimmed = c.trim();
          const suffix = trimmed.endsWith(';') || trimmed.endsWith(',') || trimmed.endsWith('.') ? '' : ';';
          return `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none;"><strong>WHEREAS,</strong> ${trimmed}${suffix}</p>`;
        })
        .join('');

      const actionSuffix = resActionClause.trim().endsWith(';') || resActionClause.trim().endsWith('.') ? '' : ';';
      const resolvedSuffix = resResolvedFurther.trim().endsWith('.') || resResolvedFurther.trim().endsWith(';') ? '' : '.';

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; text-transform: none;">
          ${resExcerpt ? `<p style="text-align: center; font-style: italic; font-size: 10pt; margin-bottom: 25px; line-height: 1.4;">${resExcerpt}</p>` : ''}
          
          <p style="text-align: center; font-weight: bold; font-size: 12pt; margin: 0 0 15px 0; letter-spacing: 0.5px; text-transform: none;">
            Resolution No. ${resNumber || '01'}, Series of A/Y ${resAcademicYear || '2025-2026'}
          </p>
          
          <h2 style="text-align: center; font-weight: bold; font-size: 12pt; text-transform: uppercase; margin: 0 0 35px 0; line-height: 1.5; padding: 0 10px;">
            ${resTitle || 'A RESOLUTION APPROVING...' }
          </h2>

          <div style="margin-bottom: 25px;">
            ${whereasItems || '<p style="text-align: center; font-style: italic; color: #94a3b8;">No rationale clauses added.</p>'}
          </div>

          <p style="text-align: justify; text-indent: 0.5in; margin-bottom: 20px; font-size: 11pt; line-height: 1.6; text-transform: none;">
            <strong>NOW, THEREFORE, BE IT RESOLVED,</strong> ${resActionClause || 'as it is hereby approved...'}${actionSuffix}
          </p>

          ${resResolvedFurther ? `
            <p style="text-align: justify; text-indent: 0.5in; margin-bottom: 30px; font-size: 11pt; line-height: 1.6; text-transform: none;">
              <strong>RESOLVED FURTHER,</strong> ${resResolvedFurther}${resolvedSuffix}
            </p>
          ` : ''}
        </div>
        <div id="signatories-wrapper">
          ${resConformed ? renderConformedSignatoriesHtml() : signatoriesHtml}
        </div>
      `;
    } else if (activeReport === 'proposal') {
      const objectivesHtml = propObjectives
        .filter(o => o.trim() !== '')
        .map(o => `<li style="margin-bottom: 8px;">${o.trim()}</li>`)
        .join('');

      const expectedHtml = propExpectedOutputs
        .filter(o => o.trim() !== '')
        .map(o => `<li style="margin-bottom: 8px;">${o.trim()}</li>`)
        .join('');

      const rationaleParagraphs = propRationale
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; text-transform: none;">${p.trim()}</p>`)
        .join('');

      const descriptionParagraphs = propDescription
        .split('\n')
        .filter(p => p.trim() !== '')
        .map(p => `<p style="text-align: justify; text-indent: 0.5in; margin-bottom: 15px; font-size: 11pt; line-height: 1.6; text-transform: none;">${p.trim()}</p>`)
        .join('');

      const budgetRows = propBudgetItems
        .filter(b => b.item.trim() !== '')
        .map(b => {
          const cost = parseFloat(b.cost.replace(/[^\d.]/g, '')) || 0;
          return `
            <tr>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: left; font-family: 'Times New Roman', Times, serif; text-transform: none;">${b.item}</td>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: center; font-family: 'Times New Roman', Times, serif;">${b.quantity}</td>
              <td style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: right; font-family: 'Times New Roman', Times, serif;">₱${cost.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            </tr>
          `;
        })
        .join('');

      const totalBudget = propBudgetItems.reduce((acc, b) => {
        const cost = parseFloat(b.cost.replace(/[^\d.]/g, '')) || 0;
        return acc + cost;
      }, 0);

      reportBodyHtml = `
        <div style="font-family: 'Times New Roman', Times, serif; color: #000000; font-size: 11pt;">
          <h2 style="text-align: center; font-weight: bold; font-size: 13pt; text-transform: uppercase; margin: 0 0 30px 0;">
            ACTIVITY PROPOSAL
          </h2>

          <!-- Specifications Table -->
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: none;">
            <tbody>
              <tr>
                <td style="width: 32%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">I. &nbsp; TITLE OF ACTIVITY</td>
                <td style="width: 3%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="width: 65%; font-weight: bold; padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase;">${propTitle || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">II. &nbsp; PROPONENTS</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propProponents || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">III. &nbsp; DATE OF IMPLEMENTATION</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propDate || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">IV. &nbsp; TIME</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propTime || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">V. &nbsp; VENUE</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propVenue || '_______________________'}</td>
              </tr>
              <tr>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">VI. &nbsp; TARGET PARTICIPANTS</td>
                <td style="font-weight: bold; padding: 4px 0; vertical-align: top; border: none;">:</td>
                <td style="padding: 4px 0; vertical-align: top; border: none; text-transform: uppercase; font-weight: bold;">${propParticipants || '_______________________'}</td>
              </tr>
            </tbody>
          </table>

          <!-- VII. Rationale -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">VII. &nbsp; RATIONALE</p>
            ${rationaleParagraphs || '<p style="font-style: italic; color: #94a3b8;">No rationale text added.</p>'}
          </div>

          <!-- VIII. Objectives -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">VIII. &nbsp; OBJECTIVES</p>
            <p style="margin: 0 0 8px 0;">This activity aims to:</p>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0; text-transform: none;">
              ${objectivesHtml || '<li style="font-style: italic; color: #94a3b8;">No objectives added.</li>'}
            </ul>
          </div>

          <!-- IX. Activity Description -->
          <div style="margin-bottom: 25px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">IX. &nbsp; ACTIVITY DESCRIPTION</p>
            ${descriptionParagraphs || '<p style="font-style: italic; color: #94a3b8;">No description text added.</p>'}
          </div>

          <!-- X. Budgetary Requirements -->
          <div style="margin-bottom: 25px; page-break-inside: avoid;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">X. &nbsp; BUDGETARY REQUIREMENTS</p>
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
              <thead>
                <tr style="background-color: #f8fafc;">
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: left; font-family: 'Times New Roman', Times, serif;">Items</th>
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: center; font-family: 'Times New Roman', Times, serif; width: 20%;">Quantity</th>
                  <th style="border: 1px solid black; padding: 6px; font-size: 11pt; text-align: right; font-family: 'Times New Roman', Times, serif; width: 25%;">Cost</th>
                </tr>
              </thead>
              <tbody>
                ${budgetRows || '<tr><td colspan="3" style="border: 1px solid black; padding: 6px; text-align: center; font-style: italic;">No items specified.</td></tr>'}
                <tr style="font-weight: bold;">
                  <td style="border: 1px solid black; padding: 6px; text-align: left; font-family: 'Times New Roman', Times, serif;">Total</td>
                  <td style="border: 1px solid black; padding: 6px;"></td>
                  <td style="border: 1px solid black; padding: 6px; text-align: right; font-family: 'Times New Roman', Times, serif;">₱${totalBudget.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              </tbody>
            </table>
            <p style="font-size: 11pt; margin-top: 10px; font-family: 'Times New Roman', Times, serif; text-transform: none;">
              Source of Funds: ${propSourceOfFunds || 'S.P.E.C.S. Funds'}
            </p>
          </div>

          <!-- XI. Expected Output -->
          <div style="margin-bottom: 35px;">
            <p style="font-weight: bold; margin: 0 0 10px 0;">XI. &nbsp; EXPECTED OUTPUT</p>
            <p style="margin: 0 0 8px 0;">By the end of the activity, the following outcomes are expected:</p>
            <ul style="list-style-type: disc; padding-left: 20px; margin: 0; text-transform: none;">
              ${expectedHtml || '<li style="font-style: italic; color: #94a3b8;">No outcomes added.</li>'}
            </ul>
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
              top: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 5cm;
              margin: 0 !important;
              padding: 0 !important;
            }
             .print-header img {
              position: absolute !important;
              top: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
            }
            .print-footer {
              position: absolute;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              height: 3cm;
              margin: 0 !important;
              padding: 0 !important;
            }
            .print-footer img {
              position: absolute !important;
              bottom: 0 !important;
              left: 0 !important;
              width: 100% !important;
              height: auto !important;
              margin: 0 !important;
              padding: 0 !important;
              display: block !important;
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
                  ${(activeReport !== 'resolution' && activeReport !== 'proposal') ? `
                    <h2 class="report-title">${eventTitle}</h2>
                    <h3 style="text-align: center; font-size: 12pt; font-weight: bold; text-transform: uppercase; margin: 0 0 20px 0; color: #334155;">
                      ${activeReport === 'narrative' ? 'Narrative Report' : REPORT_LABELS[activeReport]}
                    </h3>
                    <p style="text-align: center; font-size: 10pt; font-style: italic; margin-top: -15px; margin-bottom: 25px;">
                      Date of Event: ${formattedDate}
                    </p>
                  ` : ''}
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
    
    // Inject print and close script with onafterprint handler
    const printHtml = htmlContent.replace('</body>', `
      <script>
        let printed = false;
        function doPrint() {
          if (printed) return;
          printed = true;
          window.print();
        }
        window.onload = doPrint;
        window.onafterprint = function() {
          window.close();
        };
        // Fallback for onload
        setTimeout(doPrint, 500);
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
          <div className="w-full flex flex-col items-center justify-center gap-1.5">
            <span className="text-[10px] text-slate-400 italic text-center hidden md:inline">Drop here</span>
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) {
                  assignSignatoryToSlot(e.target.value, rowIdx, side);
                }
              }}
              className="w-full max-w-[160px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-[10px] px-2 py-1 outline-none text-slate-500 focus:border-[#0d6b66] cursor-pointer"
            >
              <option value="">Select Signatory...</option>
              {availableSignatories.map(s => (
                <option key={s.$id} value={s.$id}>
                  {s.name_officer}
                </option>
              ))}
            </select>
          </div>
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
              {type === 'resolution' && <FileEdit className="h-3.5 w-3.5" />}
              {type === 'proposal' && <FileText className="h-3.5 w-3.5" />}
              {type === 'id_card' && <CreditCard className="h-3.5 w-3.5" />}
              {REPORT_LABELS[type]}
            </button>
          ))}
        </div>
      </div>

      {/* ID Card Generator Section */}
      {activeReport === 'id_card' && (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-4 sm:p-6 shadow-xs space-y-6 animate-fade-in">
          {/* Header Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-[#0d6b66]" />
                ID Card Generator
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Generate official horizontal CR80 SPECS attendance passes (3.375" × 2.125") with 50/50 QR layout and organization policy disclaimers.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForId('custom_blank');
                  setIdCategoryFilter('custom');
                  setCustomBlankData(prev => ({ ...prev, role: 'visitor', position: 'Visitor Pass' }));
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-purple-900 hover:bg-purple-950 text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <UserCheck className="h-3.5 w-3.5" />
                + Visitor Pass
              </button>

              <button
                type="button"
                onClick={() => {
                  setSelectedStudentForId('custom_blank');
                  setIdCategoryFilter('custom');
                  setCustomBlankData(prev => ({ ...prev, role: 'student', position: '' }));
                }}
                className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#0d6b66] hover:bg-[#0b5c58] text-white text-xs font-bold rounded-xl shadow-xs transition-all cursor-pointer"
              >
                <Plus className="h-3.5 w-3.5" />
                + Create Blank Card
              </button>
            </div>
          </div>

          {/* Category Filter Pills & Search Input */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-3">
              {/* Category Pills */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl max-w-full overflow-x-auto">
                <button
                  type="button"
                  onClick={() => setIdCategoryFilter('all')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    idCategoryFilter === 'all'
                      ? 'bg-white dark:bg-slate-700 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  All ({officers.length + allStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIdCategoryFilter('officers')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    idCategoryFilter === 'officers'
                      ? 'bg-white dark:bg-slate-700 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-amber-500" />
                  Officers ({officers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setIdCategoryFilter('students')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    idCategoryFilter === 'students'
                      ? 'bg-white dark:bg-slate-700 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Students ({allStudents.length})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedStudentForId('custom_blank');
                    setIdCategoryFilter('custom');
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    idCategoryFilter === 'custom'
                      ? 'bg-white dark:bg-slate-700 text-[#0d6b66] dark:text-teal-400 shadow-xs'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
                  }`}
                >
                  Custom / Visitor Card
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative flex-1 min-w-[220px]">
                <input
                  type="text"
                  placeholder="Search member, ID, course..."
                  value={idCardSearch}
                  onChange={e => setIdCardSearch(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 dark:border-slate-700 pl-3 pr-8 py-2 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                />
                {idCardSearch && (
                  <button
                    onClick={() => setIdCardSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Custom Blank / Visitor Pass Generator Form */}
          {idCategoryFilter === 'custom' && (
            <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-xl space-y-3 animate-in fade-in">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-900 dark:text-amber-300 uppercase tracking-wide flex items-center gap-1.5">
                  <UserCheck className="h-4 w-4 text-[#0d6b66]" />
                  Custom Card & Visitor Pass Builder
                </span>
                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400">
                  Fill in details below to dynamically populate the card preview
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={customBlankData.name}
                    onChange={e => setCustomBlankData({ ...customBlankData, name: e.target.value })}
                    placeholder="e.g. JUAN DELA CRUZ"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">ID Number / Reference *</label>
                  <input
                    type="text"
                    value={customBlankData.studentId}
                    onChange={e => setCustomBlankData({ ...customBlankData, studentId: e.target.value })}
                    placeholder="e.g. 202410192 or VIST-001"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Pass Type / Role</label>
                  <select
                    value={customBlankData.role}
                    onChange={e => setCustomBlankData({ ...customBlankData, role: e.target.value as any })}
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  >
                    <option value="student">Student Member</option>
                    <option value="officer">Executive Officer</option>
                    <option value="visitor">Visitor Pass</option>
                    <option value="guest">Guest Speaker / VIP</option>
                  </select>
                </div>
                {customBlankData.role === 'officer' && (
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Officer Position</label>
                    <input
                      type="text"
                      value={customBlankData.position}
                      onChange={e => setCustomBlankData({ ...customBlankData, position: e.target.value })}
                      placeholder="e.g. President, Vice-President"
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                    />
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Section / Year</label>
                  <input
                    type="text"
                    value={customBlankData.section}
                    onChange={e => setCustomBlankData({ ...customBlankData, section: e.target.value })}
                    placeholder="e.g. BSCS 4A"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Email Address</label>
                  <input
                    type="email"
                    value={customBlankData.email}
                    onChange={e => setCustomBlankData({ ...customBlankData, email: e.target.value })}
                    placeholder="e.g. jdelacruz@parsu.edu.ph"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wide mb-1">Residential Address</label>
                  <input
                    type="text"
                    value={customBlankData.address}
                    onChange={e => setCustomBlankData({ ...customBlankData, address: e.target.value })}
                    placeholder="e.g. Goa, Camarines Sur"
                    className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:border-[#0d6b66]"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Mobile-Friendly Grid Selector */}
          {idCategoryFilter !== 'custom' && (
            <div className="space-y-2">
              <div className="max-h-[320px] overflow-y-auto pr-1 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                {/* Officers */}
                {(idCategoryFilter === 'all' || idCategoryFilter === 'officers') &&
                  officers
                    .filter(off => {
                      const std = off.students && typeof off.students === 'object' ? off.students : null;
                      const name = std?.name || off.name_officer || '';
                      const q = idCardSearch.toLowerCase();
                      return name.toLowerCase().includes(q) || (off.position || '').toLowerCase().includes(q);
                    })
                    .map(off => {
                      const std = off.students && typeof off.students === 'object' ? off.students : null;
                      const name = std?.name || off.name_officer || 'Executive Officer';
                      const pos = formatOfficerPosition(off.position) || off.position || 'Officer';
                      const isSelected = selectedStudentForId === `off_${off.$id}`;
                      return (
                        <div
                          key={`off_${off.$id}`}
                          onClick={() => setSelectedStudentForId(`off_${off.$id}`)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#0d6b66]/10 border-[#0d6b66] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#063834] text-amber-300 flex items-center justify-center shrink-0">
                              <ShieldCheck className="h-4 w-4 text-amber-300" />
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {name}
                              </h4>
                              <p className="text-[10px] text-amber-600 dark:text-amber-400 font-bold uppercase truncate">
                                {pos}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 uppercase ${
                            isSelected ? 'bg-[#0d6b66] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      );
                    })}

                {/* Students */}
                {(idCategoryFilter === 'all' || idCategoryFilter === 'students') &&
                  allStudents
                    .filter(s => {
                      const q = idCardSearch.toLowerCase();
                      return (s.name || '').toLowerCase().includes(q) || (s.student_id || '').toString().includes(q) || (s.section || '').toLowerCase().includes(q);
                    })
                    .slice(0, 60)
                    .map(s => {
                      const isSelected = selectedStudentForId === `std_${s.$id}`;
                      return (
                        <div
                          key={`std_${s.$id}`}
                          onClick={() => setSelectedStudentForId(`std_${s.$id}`)}
                          className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                            isSelected
                              ? 'bg-[#0d6b66]/10 border-[#0d6b66] shadow-xs'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700 hover:border-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-[#0d6b66] text-white flex items-center justify-center font-bold text-xs shrink-0">
                              {(s.name || 'S').charAt(0).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <h4 className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                                {s.name}
                              </h4>
                              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate">
                                ID: {s.student_id || 'N/A'} • {s.section || 'Student'}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[10px] font-black px-2 py-1 rounded-md shrink-0 uppercase ${
                            isSelected ? 'bg-[#0d6b66] text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                          }`}>
                            {isSelected ? 'Selected' : 'Select'}
                          </span>
                        </div>
                      );
                    })}
              </div>
            </div>
          )}

          {/* Render ID Card Interactive Preview */}
          {selectedIdCardData ? (
            <div className="flex flex-col items-center justify-center p-3 sm:p-6 bg-slate-100 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-4 w-full max-w-full overflow-hidden">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between w-full max-w-xl gap-2">
                <span className="text-xs font-bold text-slate-600 dark:text-slate-300 uppercase tracking-wider">
                  Live Preview ({selectedIdCardData.role === 'officer' ? 'OFFICER' : selectedIdCardData.role === 'visitor' ? 'VISITOR' : 'MEMBER'})
                </span>
                <button
                  type="button"
                  onClick={() => setSelectedIdCardDataForModal(selectedIdCardData)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#0d6b66] hover:bg-[#0b5c58] text-white rounded-xl text-xs font-extrabold transition-all shadow-md cursor-pointer shrink-0"
                >
                  <Download className="h-3.5 w-3.5" />
                  Export & Attach Photo
                </button>
              </div>

              <div className="w-full flex items-center justify-center overflow-x-auto py-2">
                <div className="shrink-0 origin-center scale-[0.45] min-[360px]:scale-[0.55] min-[440px]:scale-[0.70] sm:scale-85 md:scale-100 my-[-130px] min-[360px]:my-[-90px] min-[440px]:my-[-45px] sm:my-[-20px] md:my-0 transition-all">
                  <IDCardPreview data={selectedIdCardData} orientation="landscape" side="both" />
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-10 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
              <CreditCard className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-600 dark:text-slate-300">No Card Selected</p>
              <p className="text-xs text-slate-400 mt-1">Select a member/officer above or click "+ Create Blank ID Card" to generate.</p>
            </div>
          )}
        </div>
      )}
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

      {/* Rating Report Form */}
      {activeReport === 'rating' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4 animate-fade-in">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            Activity Evaluation Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event *</label>
              <select
                value={ratingEventId}
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
                value={ratingDate}
                onChange={e => setRatingDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">
                Upload Evaluation Responses File (.zip or .csv)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".zip,.csv"
                  onChange={handleZipUpload}
                  className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-teal-50 file:text-[#0d6b66] dark:file:bg-teal-950/30 dark:file:text-teal-400 hover:file:bg-teal-100 transition-all cursor-pointer"
                />
                {ratingResponsesCount > 0 && (
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold whitespace-nowrap bg-emerald-50 dark:bg-emerald-950/35 px-2.5 py-1.5 rounded-lg border border-emerald-250/20">
                    {ratingResponsesCount} responses loaded
                  </span>
                )}
              </div>
              <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">
                You can upload a ZIP file containing Google Forms feedback CSV(s), or upload a raw CSV file directly. Individual ratings of "1" are treated as "Not Applicable" and excluded.
              </p>
            </div>

            {/* Criteria table with applicable checkboxes and manual score overrides */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">
                  Criteria Applicability & Scores
                </label>
                <span className="text-[10px] text-slate-400 italic">
                  Toggle applicability checkboxes or modify scores manually if needed.
                </span>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-xs text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-800 font-bold text-slate-705 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2 w-12 text-center">App?</th>
                      <th className="px-4 py-2 w-48">Area</th>
                      <th className="px-4 py-2">Criteria Question</th>
                      <th className="px-4 py-2 w-32 text-center">Average Rating</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {EVALUATION_CRITERIA.map(crit => {
                      const isApplicable = ratingApplicable[crit.id] !== false;
                      const scoreVal = ratingScores[crit.id];
                      return (
                        <tr key={crit.id} className={isApplicable ? '' : 'bg-slate-50/55 opacity-60'}>
                          <td className="px-4 py-2 text-center">
                            <input
                              type="checkbox"
                              checked={isApplicable}
                              onChange={e => handleToggleApplicable(crit.id, e.target.checked)}
                              className="h-3.5 w-3.5 text-[#0d6b66] focus:ring-[#0d6b66] border-slate-350 rounded cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-2 font-semibold text-slate-750 dark:text-slate-400">{crit.area}</td>
                          <td className="px-4 py-2 text-slate-600 dark:text-slate-300">{crit.text}</td>
                          <td className="px-4 py-2">
                            <input
                              type="number"
                              min="1"
                              max="5"
                              step="0.01"
                              disabled={!isApplicable}
                              value={scoreVal != null ? scoreVal : ''}
                              onChange={e => handleScoreChange(crit.id, e.target.value)}
                              placeholder="N/A"
                              className="w-full rounded border border-slate-200 dark:border-slate-700 px-2 py-1 text-center text-xs bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none disabled:bg-slate-100 dark:disabled:bg-slate-800/40"
                            />
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-bold text-slate-900 dark:text-white text-sm">
                      <td colSpan={3} className="px-4 py-3 text-right">OVERALL EVALUATION RATING</td>
                      <td className="px-4 py-3 text-center text-teal-650 dark:text-teal-400 text-base">
                        {calculateOverall(ratingScores, ratingApplicable) > 0 
                          ? calculateOverall(ratingScores, ratingApplicable).toFixed(2) 
                          : 'N/A'}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Interpretations Paragraph</label>
              <textarea
                value={ratingInterpretation}
                onChange={e => setRatingInterpretation(e.target.value)}
                rows={4}
                placeholder="Enter interpretation description..."
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y"
              />
            </div>
          </div>
        </div>
      )}

      {/* Resolution Form */}
      {activeReport === 'resolution' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            Resolution Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Resolution Number</label>
              <input type="text" value={resNumber} onChange={e => setResNumber(e.target.value)} placeholder="e.g. 01"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Academic Year</label>
              <input type="text" value={resAcademicYear} onChange={e => setResAcademicYear(e.target.value)} placeholder="e.g. 2025-2026"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Meeting Excerpt / Date metadata (Optional)</label>
              <input type="text" value={resExcerpt} onChange={e => setResExcerpt(e.target.value)} placeholder="e.g. Excerpt from the Minutes of the 2nd regular meeting of SPECS held last August 23, 2025, on Google Meet"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Resolution Title</label>
              <textarea value={resTitle} onChange={e => setResTitle(e.target.value)} placeholder="A RESOLUTION APPROVING THE USE OF..." rows={2}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>

            {/* Dynamic WHEREAS clauses */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">WHEREAS Clauses (Rationale)</label>
                <button
                  type="button"
                  onClick={() => setResWhereasClauses([...resWhereasClauses, ''])}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0d6b66] hover:text-[#0a524e] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Clause
                </button>
              </div>
              
              {resWhereasClauses.map((clause, idx) => (
                <div key={idx} className="flex gap-2 items-start">
                  <span className="text-xs font-bold text-slate-400 mt-2.5 w-20 flex-shrink-0">WHEREAS,</span>
                  <div className="flex-1">
                    <textarea
                      value={clause}
                      onChange={e => {
                        const newClauses = [...resWhereasClauses];
                        newClauses[idx] = e.target.value;
                        setResWhereasClauses(newClauses);
                      }}
                      placeholder="e.g. the organization aims to support..."
                      rows={2}
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (resWhereasClauses.length > 1) {
                        setResWhereasClauses(resWhereasClauses.filter((_, i) => i !== idx));
                      } else {
                        const newClauses = [...resWhereasClauses];
                        newClauses[idx] = '';
                        setResWhereasClauses(newClauses);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors mt-1"
                    title="Remove clause"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Primary Resolution Body (NOW, THEREFORE...)</label>
              <textarea value={resActionClause} onChange={e => setResActionClause(e.target.value)} placeholder="e.g. as it is hereby approved, that the necessary expenses for the representing band shall be covered..." rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Secondary Action / Distribution (RESOLVED FURTHER...)</label>
              <textarea value={resResolvedFurther} onChange={e => setResResolvedFurther(e.target.value)} placeholder="e.g. that copies of this resolution shall be furnished to the Office of Student Affairs and Services..." rows={3}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>

            <div className="sm:col-span-2 flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="res-conformed"
                checked={resConformed}
                onChange={e => setResConformed(e.target.checked)}
                className="h-4 w-4 text-[#0d6b66] focus:ring-[#0d6b66] border-slate-300 rounded"
              />
              <label htmlFor="res-conformed" className="text-xs font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wide cursor-pointer">
                Include Full Conformed Grid (General Assembly / Officers Signature Grid)
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Activity Proposal Form */}
      {activeReport === 'proposal' && (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-800 dark:text-white uppercase tracking-wider pb-2 border-b border-slate-100 dark:border-slate-800">
            Activity Proposal Details
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Title of Activity</label>
              <input type="text" value={propTitle} onChange={e => setPropTitle(e.target.value)} placeholder="e.g. AIDEATHON: HACKATHON WITH AI"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Proponents</label>
              <input type="text" value={propProponents} onChange={e => setPropProponents(e.target.value)} placeholder="e.g. SOCIETY OF PROGRAMMERS AND ENTHUSIASTS IN COMPUTER SCIENCE (SPECS)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Date of Implementation</label>
              <input type="text" value={propDate} onChange={e => setPropDate(e.target.value)} placeholder="e.g. OCTOBER 21 – NOVEMBER 18, 2025"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Time</label>
              <input type="text" value={propTime} onChange={e => setPropTime(e.target.value)} placeholder="e.g. 8:00 A.M. – 12:00 P.M. (PRESENTATION DAY ON NOVEMBER 18, 2025)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Venue</label>
              <input type="text" value={propVenue} onChange={e => setPropVenue(e.target.value)} placeholder="e.g. ROOMS 22, IIT BUILDING (PRESENTATION DAY)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Target Participants</label>
              <input type="text" value={propParticipants} onChange={e => setPropParticipants(e.target.value)} placeholder="e.g. BS COMPUTER SCIENCE AND BS INFORMATION TECHNOLOGY MAJORS (ALL YEAR LEVELS)"
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">VII. Rationale</label>
              <textarea value={propRationale} onChange={e => setPropRationale(e.target.value)} placeholder="Enter rationale paragraphs..." rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>

            {/* Objectives */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">VIII. Objectives</label>
                <button
                  type="button"
                  onClick={() => setPropObjectives([...propObjectives, ''])}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0d6b66] hover:text-[#0a524e] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Objective
                </button>
              </div>
              
              {propObjectives.map((obj, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 flex-shrink-0">Bullet {idx + 1}</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={obj}
                      onChange={e => {
                        const newObjs = [...propObjectives];
                        newObjs[idx] = e.target.value;
                        setPropObjectives(newObjs);
                      }}
                      placeholder="Provide an accessible platform..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (propObjectives.length > 1) {
                        setPropObjectives(propObjectives.filter((_, i) => i !== idx));
                      } else {
                        const newObjs = [...propObjectives];
                        newObjs[idx] = '';
                        setPropObjectives(newObjs);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                    title="Remove objective"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">IX. Activity Description</label>
              <textarea value={propDescription} onChange={e => setPropDescription(e.target.value)} placeholder="Describe the event phases, mechanics, prizes..." rows={6}
                className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none resize-y" />
            </div>

            {/* Budgetary requirements */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">X. Budgetary Requirements</label>
                <button
                  type="button"
                  onClick={() => setPropBudgetItems([...propBudgetItems, { item: '', quantity: '', cost: '' }])}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0d6b66] hover:text-[#0a524e] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Budget Item
                </button>
              </div>

              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
                <table className="w-full border-collapse text-left text-sm text-slate-500 dark:text-slate-400">
                  <thead className="bg-slate-50 dark:bg-slate-800 text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                    <tr>
                      <th className="px-4 py-2">Item Description</th>
                      <th className="px-4 py-2 w-28">Quantity</th>
                      <th className="px-4 py-2 w-36">Unit Cost (₱)</th>
                      <th className="px-4 py-2 w-16 text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 bg-white dark:bg-slate-900">
                    {propBudgetItems.map((bItem, idx) => (
                      <tr key={idx}>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={bItem.item}
                            onChange={e => {
                              const newItems = [...propBudgetItems];
                              newItems[idx].item = e.target.value;
                              setPropBudgetItems(newItems);
                            }}
                            placeholder="e.g. Certificate"
                            className="w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={bItem.quantity}
                            onChange={e => {
                              const newItems = [...propBudgetItems];
                              newItems[idx].quantity = e.target.value;
                              setPropBudgetItems(newItems);
                            }}
                            placeholder="e.g. 8"
                            className="w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white text-center"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={bItem.cost}
                            onChange={e => {
                              const newItems = [...propBudgetItems];
                              newItems[idx].cost = e.target.value;
                              setPropBudgetItems(newItems);
                            }}
                            placeholder="e.g. 800.00"
                            className="w-full bg-transparent border-0 outline-none text-slate-900 dark:text-white text-right"
                          />
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (propBudgetItems.length > 1) {
                                setPropBudgetItems(propBudgetItems.filter((_, i) => i !== idx));
                              } else {
                                setPropBudgetItems([{ item: '', quantity: '', cost: '' }]);
                              }
                            }}
                            className="text-slate-400 hover:text-red-500 rounded-md p-1 transition-colors"
                            title="Delete item"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-50 dark:bg-slate-800/50 font-semibold text-slate-900 dark:text-white">
                      <td className="px-4 py-2">Total Budget Required</td>
                      <td className="px-4 py-2 text-center">
                        {propBudgetItems.reduce((acc, current) => {
                          const qty = parseFloat(current.quantity) || 0;
                          return acc + (qty ? 1 : 0);
                        }, 0)} item lines
                      </td>
                      <td className="px-4 py-2 text-right">
                        ₱{propBudgetItems.reduce((acc, current) => {
                          const cost = parseFloat(current.cost.replace(/[^\d.]/g, '')) || 0;
                          return acc + cost;
                        }, 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td></td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Source of Funds</label>
                <input type="text" value={propSourceOfFunds} onChange={e => setPropSourceOfFunds(e.target.value)} placeholder="e.g. S.P.E.C.S. Funds"
                  className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none" />
              </div>
            </div>

            {/* Expected Outputs */}
            <div className="sm:col-span-2 space-y-3">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">XI. Expected Output</label>
                <button
                  type="button"
                  onClick={() => setPropExpectedOutputs([...propExpectedOutputs, ''])}
                  className="flex items-center gap-1 text-xs font-semibold text-[#0d6b66] hover:text-[#0a524e] transition-all"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Expected Output
                </button>
              </div>

              {propExpectedOutputs.map((out, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <span className="text-xs font-bold text-slate-400 flex-shrink-0">Outcome {idx + 1}</span>
                  <div className="flex-1">
                    <input
                      type="text"
                      value={out}
                      onChange={e => {
                        const newOuts = [...propExpectedOutputs];
                        newOuts[idx] = e.target.value;
                        setPropExpectedOutputs(newOuts);
                      }}
                      placeholder="e.g. Increased student confidence in using AI tools..."
                      className="w-full rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:border-[#0d6b66] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (propExpectedOutputs.length > 1) {
                        setPropExpectedOutputs(propExpectedOutputs.filter((_, i) => i !== idx));
                      } else {
                        const newOuts = [...propExpectedOutputs];
                        newOuts[idx] = '';
                        setPropExpectedOutputs(newOuts);
                      }
                    }}
                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-lg transition-colors"
                    title="Remove expected output"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
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

      {/* ID Card Export Modal */}
      <IDCardExportModal
        isOpen={!!selectedIdCardDataForModal}
        onClose={() => setSelectedIdCardDataForModal(null)}
        data={selectedIdCardDataForModal}
      />
    </div>
  );
};

export default AdminFileExports;
