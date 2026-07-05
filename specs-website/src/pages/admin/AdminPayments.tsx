import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { cachedApi, api } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import ConfirmModal from '../../components/ui/ConfirmModal';
import Pagination from '../../components/ui/Pagination';
import { SkeletonCard } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import type { EventDoc, PaymentDoc, AccountDoc, OfficerDoc, StudentDoc } from '../../types/database';
import { ArrowLeft, RotateCw, Search, Plus, Edit, Trash2, X, Loader2, Mail, Printer } from 'lucide-react';
import { functions, databases } from '../../shared/appwrite';
import { EMAIL_FUNCTION_ID, DATABASE_ID, COLLECTION_ID_REVENUE } from '../../shared/constants';
import { ID } from 'appwrite';
import { getReceiptHtml, getPaymentReminderHtml } from '../../shared/emailTemplates';

interface AdminPaymentsProps {
  isCreateView?: boolean;
  isOutsideView?: boolean;
}

const AdminPayments: React.FC<AdminPaymentsProps> = ({ isCreateView = false, isOutsideView = false }) => {
  const navigate = useNavigate();
  // Navigation / View state
  const [selectedStudent, setSelectedStudent] = useState<AccountDoc | null>(null);

  // Data state
  const [students, setStudents] = useState<AccountDoc[]>([]);
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [events, setEvents] = useState<EventDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 20;

  // Add Payment View State
  const isAddView = isCreateView;
  const [dynamicItems, setDynamicItems] = useState<{ id: string; name: string; price: number; quantity: number }[]>([
    { id: '1', name: '', price: 0, quantity: 1 }
  ]);
  const [isEventLink, setIsEventLink] = useState(false);
  const [activityName, setActivityName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [assignAll, setAssignAll] = useState(false);
  const [assignStudentQuery, setAssignStudentQuery] = useState('');
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Active Tab State (Member Ledger vs Outside Payments)
  const [activeTab, setActiveTab] = useState<'members' | 'outside'>(() => {
    return (localStorage.getItem('admin_payments_tab') as 'members' | 'outside') || 'members';
  });

  // Record Outside Payment View State
  const [nonBscsName, setNonBscsName] = useState('');
  const [payerEmail, setPayerEmail] = useState('');
  const [datePaid, setDatePaid] = useState(new Date().toISOString().split('T')[0]);
  const [modality, setModality] = useState<'cash' | 'gcash'>('cash');

  // Edit Payment Modal State
  const [editingPayment, setEditingPayment] = useState<PaymentDoc | null>(null);
  const [editItemName, setEditItemName] = useState('');
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editIsEventLink, setEditIsEventLink] = useState(false);
  const [editActivityName, setEditActivityName] = useState('');
  const [editSelectedEventId, setEditSelectedEventId] = useState('');
  const [editSubmitting, setEditSubmitting] = useState(false);

  // Actions confirmations
  const [paidConfirm, setPaidConfirm] = useState<{ open: boolean; payment: PaymentDoc | null }>({ open: false, payment: null });
  const [deleteConfirm, setDeleteConfirm] = useState<{ open: boolean; payment: PaymentDoc | null }>({ open: false, payment: null });
  const [actionLoading, setActionLoading] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<AccountDoc | null>(null);
  const [modalPaid, setModalPaid] = useState<'cash' | 'gcash'>('cash');
  const [confirmRecipient, setConfirmRecipient] = useState(false);
  const [officersList, setOfficersList] = useState<OfficerDoc[]>([]);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printSignatory, setPrintSignatory] = useState<'treasurer' | 'asst-treasurer'>('treasurer');
  const [printScope, setPrintScope] = useState<string>('all');

  const activitiesList = useMemo(() => {
    const groups = new Set<string>();
    payments.filter(p => !p.is_outside_bscs).forEach(p => {
      let actName = 'General Collection';
      if (p.is_event && p.events) {
        const evId = typeof p.events === 'object' ? p.events.$id : p.events;
        const ev = events.find(e => e.$id === evId);
        actName = ev?.event_name || 'Linked Event';
      } else if (p.activity) {
        actName = p.activity;
      }
      groups.add(actName);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [payments, events]);

  const outsideActivitiesList = useMemo(() => {
    const groups = new Set<string>();
    payments.filter(p => p.is_outside_bscs).forEach(p => {
      let actName = 'General Collection';
      if (p.is_event && p.events) {
        const evId = typeof p.events === 'object' ? p.events.$id : p.events;
        const ev = events.find(e => e.$id === evId);
        actName = ev?.event_name || 'Linked Event';
      } else if (p.activity) {
        actName = p.activity;
      }
      groups.add(actName);
    });
    return Array.from(groups).sort((a, b) => a.localeCompare(b));
  }, [payments, events]);

  const { addToast } = useToast();

  const loadData = async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      let profileDoc: AccountDoc | null = null;
      try {
        const currentUser = await cachedApi.users.getCurrent();
        if (currentUser) {
          profileDoc = await cachedApi.users.getAccount(currentUser.$id);
        }
      } catch (err) {
        console.warn('Failed to load current user profile:', err);
      }

      const [studentsRes, officersRes, paymentsRes, eventsRes, activeOfficersRes] = await Promise.all([
        cachedApi.users.listAllAccounts({ type: 'student' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.users.listAllAccounts({ type: 'officer' }, isRefresh ? 0 : 5 * 60 * 1000),
        cachedApi.payments.listAll({}, isRefresh ? 0 : 1 * 60 * 1000),
        cachedApi.events.listAll({ orderDesc: 'date_to_held' }, isRefresh ? 0 : 2 * 60 * 1000),
        cachedApi.officers.listAll(isRefresh ? 0 : 5 * 60 * 1000)
      ]);

      const combined = [...studentsRes.documents, ...officersRes.documents];
      setStudents(combined);
      setPayments(paymentsRes.documents);
      setEvents(eventsRes.documents);
      setCurrentUserProfile(profileDoc);
      setOfficersList(activeOfficersRes.documents);

      if (selectedStudent) {
        // Refresh current student doc
        const refreshedStudent = studentsRes.documents.find(s => s.$id === selectedStudent.$id);
        if (refreshedStudent) setSelectedStudent(refreshedStudent);
      }

      if (isRefresh) {
        addToast({ type: 'success', title: 'Refreshed', message: 'Payments ledger updated.' });
      }
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load payments ledger.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filter list of assignees for the check-list
  const filteredAssignees = useMemo(() => {
    const q = assignStudentQuery.trim().toLowerCase();
    const list = students.map(std => {
      const profile = std.students as any;
      return {
        id: profile?.$id || std.$id,
        name: profile?.name || std.username || 'Unknown Member',
        yearLevel: profile?.yearLevel || 0
      };
    });
    if (!q) return list;
    return list.filter(item => item.name.toLowerCase().includes(q));
  }, [students, assignStudentQuery]);

  // Assign payment logic
  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const invalidItem = dynamicItems.find(item => !item.name.trim() || item.price < 0 || item.quantity < 1);
    if (invalidItem) {
      addToast({ type: 'warning', title: 'Invalid inputs', message: 'Each item must have a name, non-negative price, and quantity of at least 1.' });
      return;
    }

    if (!assignAll && selectedAssigneeIds.length === 0) {
      addToast({ type: 'warning', title: 'Assignees needed', message: 'Select at least one student or check assign to all.' });
      return;
    }

    setSubmitting(true);
    try {
      // Loop over each item and insert them
      for (const item of dynamicItems) {
        const payload: Partial<PaymentDoc> = {
          item_name: item.name,
          price: item.price,
          quantity: item.quantity,
          is_event: isEventLink,
          events: isEventLink ? selectedEventId : null,
          activity: isEventLink ? null : activityName,
          is_paid: false,
          date_paid: new Date(0).toISOString(),
          is_outside_bscs: false
        };

        if (assignAll) {
          // Create payment document for all students
          await Promise.all(
            students.map(async (std) => {
              const profile = std.students as any;
              const pId = profile?.$id || std.$id;
              await api.payments.create({ ...payload, students: pId });
            })
          );
        } else if (selectedAssigneeIds.length > 0) {
          await Promise.all(
            selectedAssigneeIds.map(async (id) => {
              await api.payments.create({ ...payload, students: id });
            })
          );
        }
      }

      if (assignAll) {
        addToast({ type: 'success', title: 'Assigned All', message: `Outstanding dues assigned to ${students.length} students.` });
      } else {
        addToast({ type: 'success', title: 'Assigned', message: `Outstanding dues assigned to ${selectedAssigneeIds.length} students.` });
      }

      navigate(window.location.pathname.split('/create')[0]);
      setDynamicItems([{ id: Date.now().toString(), name: '', price: 0, quantity: 1 }]);
      setIsEventLink(false);
      setActivityName('');
      setSelectedEventId('');
      setAssignAll(false);
      setAssignStudentQuery('');
      setSelectedAssigneeIds([]);

      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to create payment due.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordOutsidePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nonBscsName.trim()) {
      addToast({ type: 'warning', title: 'Invalid inputs', message: 'Please enter payer name / organization.' });
      return;
    }

    const invalidItem = dynamicItems.find(item => !item.name.trim() || item.price <= 0 || item.quantity < 1);
    if (invalidItem) {
      addToast({ type: 'warning', title: 'Invalid inputs', message: 'Each item must have a name, price greater than 0, and quantity of at least 1.' });
      return;
    }

    setSubmitting(true);
    try {
      const officerId = currentUserProfile && currentUserProfile.type === 'officer'
        ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
        : null;
      const recorderId = officerId;

      let verifierName = 'Admin';
      if (currentUserProfile) {
        if (currentUserProfile.type === 'admin') {
          verifierName = currentUserProfile.admins && typeof currentUserProfile.admins === 'object'
            ? (currentUserProfile.admins as any).fullName
            : currentUserProfile.username;
        } else if (currentUserProfile.students) {
          verifierName = typeof currentUserProfile.students === 'object'
            ? (currentUserProfile.students as any).name
            : currentUserProfile.username;
        } else {
          verifierName = currentUserProfile.username;
        }
      }

      for (const item of dynamicItems) {
        const payload: Partial<PaymentDoc> = {
          students: null,
          is_event: isEventLink,
          events: isEventLink ? selectedEventId : null,
          activity: isEventLink ? null : activityName,
          price: item.price,
          item_name: item.name,
          quantity: item.quantity,
          date_paid: new Date(datePaid).toISOString(),
          officers: officerId,
          is_outside_bscs: true,
          non_bscs_name: nonBscsName,
          is_paid: true,
          modal_paid: modality,
          verified_by_name: verifierName
        };

        // 1. Create payment document
        const paymentDoc = await api.payments.create(payload);

        // 2. Create revenue document
        await databases.createDocument(DATABASE_ID, COLLECTION_ID_REVENUE, ID.unique(), {
          name: `${item.name} (Paid by ${nonBscsName}) [Outside Civilian]`,
          isEvent: isEventLink,
          event: (isEventLink && selectedEventId) ? selectedEventId : null,
          activity: isEventLink ? null : activityName,
          quantity: item.quantity,
          price: item.price,
          date_earned: new Date(datePaid).toISOString(),
          recorder: recorderId
        });

        // 3. Optional Email Receipt (Background)
        if (payerEmail.trim()) {
          const datePaidStr = new Date(datePaid).toLocaleDateString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric'
          });
          const htmlBody = getReceiptHtml(
            nonBscsName,
            item.name,
            item.price,
            item.quantity,
            datePaidStr,
            paymentDoc.$id
          );
          (async () => {
            try {
              await functions.createExecution(
                EMAIL_FUNCTION_ID,
                JSON.stringify({
                  action: 'send_email',
                  payload: {
                    to: payerEmail,
                    subject: `Payment Receipt: ${item.name}`,
                    body: htmlBody,
                    html: true
                  }
                })
              );
            } catch (emailErr: any) {
              console.error('[AdminPayments] Failed to send email receipt:', emailErr);
            }
          })();
        }
      }

      addToast({ type: 'success', title: 'Success', message: 'Outside payment collections recorded.' });
      if (payerEmail.trim()) {
        addToast({ type: 'info', title: 'Receipt Sent', message: `Email receipt(s) dispatched to ${payerEmail}.` });
      }

      // Reset states & navigate back to outside tab
      localStorage.setItem('admin_payments_tab', 'outside');
      setActiveTab('outside');
      
      setNonBscsName('');
      setDynamicItems([{ id: Date.now().toString(), name: '', price: 0, quantity: 1 }]);
      setPayerEmail('');
      setIsEventLink(false);
      setActivityName('');
      setSelectedEventId('');
      setModality('cash');

      navigate(window.location.pathname.replace('/outside', ''));
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to record payment.' });
    } finally {
      setSubmitting(false);
    }
  };

  // Edit payment due logic
  const handleOpenEdit = (p: PaymentDoc) => {
    setEditingPayment(p);
    setEditItemName(p.item_name || '');
    setEditPrice(p.price || 0);
    setEditQuantity(p.quantity || 1);
    setEditIsEventLink(p.is_event || false);
    setEditActivityName(p.activity || '');
    
    const evId = p.events ? (typeof p.events === 'object' ? p.events.$id : p.events) : '';
    setEditSelectedEventId(evId);
  };

  const handleEditPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPayment) return;

    setEditSubmitting(true);
    try {
      await api.payments.update(editingPayment.$id, {
        item_name: editItemName,
        price: editPrice,
        quantity: editQuantity,
        is_event: editIsEventLink,
        events: editIsEventLink ? editSelectedEventId : null,
        activity: editIsEventLink ? null : editActivityName
      });

      addToast({ type: 'success', title: 'Success', message: 'Payment record details modified.' });
      setEditingPayment(null);
      loadData(true);
    } catch (err: any) {
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to save changes.' });
    } finally {
      setEditSubmitting(false);
    }
  };

  // Mark Paid due
  const handleMarkPaid = async () => {
    if (!paidConfirm.payment) return;
    const payment = paidConfirm.payment;
    const studentProfile = selectedStudent?.students as any;
    const sName = studentProfile?.name || selectedStudent?.username || 'Student';

    const officerId = currentUserProfile && currentUserProfile.type === 'officer'
      ? (typeof currentUserProfile.officers === 'object' ? currentUserProfile.officers?.$id : currentUserProfile.officers)
      : null;
    const recorderId = officerId;

    let verifierName = 'Admin';
    if (currentUserProfile) {
      if (currentUserProfile.type === 'admin') {
        verifierName = currentUserProfile.admins && typeof currentUserProfile.admins === 'object'
          ? (currentUserProfile.admins as any).fullName
          : currentUserProfile.username;
      } else if (currentUserProfile.students) {
        verifierName = typeof currentUserProfile.students === 'object'
          ? (currentUserProfile.students as any).name
          : currentUserProfile.username;
      } else {
        verifierName = currentUserProfile.username;
      }
    }

    // Close modal immediately to avoid UI blocking
    setPaidConfirm({ open: false, payment: null });
    addToast({ type: 'info', title: 'Processing Payment', message: 'Recording payment in the background...' });

    (async () => {
      try {
        await api.payments.markPaid(payment, recorderId, sName, modalPaid, officerId, verifierName);
        addToast({ type: 'success', title: 'Paid', message: `Outstanding due marked as paid via ${modalPaid.toUpperCase()}.` });
        
        // Send Email Receipt if student email exists (Background)
        const sEmail = studentProfile?.email;
        if (sEmail) {
          try {
            const datePaidStr = new Date().toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            });
            const htmlBody = getReceiptHtml(
              sName,
              payment.item_name,
              payment.price,
              payment.quantity,
              datePaidStr,
              payment.$id
            );
            await functions.createExecution(
              EMAIL_FUNCTION_ID,
              JSON.stringify({
                action: 'send_email',
                payload: {
                  to: sEmail,
                  subject: `Payment Receipt: ${payment.item_name}`,
                  body: htmlBody,
                  html: true
                }
              })
            );
            addToast({ type: 'info', title: 'Receipt Sent', message: `Email receipt dispatched to ${sEmail}.` });
          } catch (emailErr: any) {
            console.error('[AdminPayments] Failed to send email receipt:', emailErr);
            addToast({ type: 'warning', title: 'Receipt Not Sent', message: `Payment marked paid, but email receipt failed to send to ${sEmail}.` });
          }
        }
        loadData(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to process payment.' });
      }
    })();
  };

  // Delete payment due
  const handleDeletePayment = async () => {
    if (!deleteConfirm.payment) return;
    const payment = deleteConfirm.payment;
    
    // Close modal immediately to avoid UI blocking
    setDeleteConfirm({ open: false, payment: null });
    addToast({ type: 'info', title: 'Deleting Dues', message: `Removing due "${payment.item_name}" in the background...` });
    
    (async () => {
      try {
        await api.payments.delete(payment.$id);
        addToast({ type: 'success', title: 'Deleted', message: 'Dues item removed from logs.' });
        loadData(true);
      } catch (err: any) {
        addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to delete record.' });
      }
    })();
  };

  // Send Outstanding Dues Notification
  const handleNotifyDues = async () => {
    if (!selectedStudent) return;
    const studentProfile = selectedStudent.students as any;
    const sEmail = studentProfile?.email;
    const sName = studentProfile?.name || selectedStudent.username || 'Student';

    if (!sEmail) {
      addToast({ type: 'warning', title: 'No Email Address', message: 'This student does not have an email address associated with their profile.' });
      return;
    }

    const pendingDues = currentStudentPayments.filter(p => !p.is_paid);
    if (pendingDues.length === 0) {
      addToast({ type: 'warning', title: 'No Pending Dues', message: 'There are no pending dues to notify this student about.' });
      return;
    }

    // Immediately show info toast and run the execution in the background
    addToast({ 
      type: 'info', 
      title: 'Sending Notification', 
      message: `Outstanding dues notification is being sent to ${sEmail} in the background.` 
    });

    (async () => {
      try {
        const formattedDues = pendingDues.map(p => {
          const linkedEvent = p.is_event && p.events
            ? (events.find(e => e.$id === p.events || e.$id === (p.events as any).$id)?.event_name || 'Linked Event')
            : p.activity;
          return {
            itemName: p.item_name,
            price: p.price,
            quantity: p.quantity,
            activity: linkedEvent || 'General Collection'
          };
        });

        const htmlBody = getPaymentReminderHtml(sName, formattedDues, window.location.origin);

        const response = await functions.createExecution(
          EMAIL_FUNCTION_ID,
          JSON.stringify({
            action: 'send_email',
            payload: {
              to: sEmail,
              subject: 'Action Required: Outstanding Dues Notice',
              body: htmlBody,
              html: true
            }
          })
        );

        let result;
        try {
          result = JSON.parse(response.responseBody);
        } catch (e) {
          result = { success: false, error: 'Failed to parse response body' };
        }

        if (response.status === 'failed' || !result.success) {
          throw new Error(result.error || 'Execution failed');
        }

        addToast({ type: 'success', title: 'Dues Notified', message: `Email notifications successfully dispatched to ${sEmail}.` });
      } catch (err: any) {
        console.error('[AdminPayments] Failed to notify student dues:', err);
        addToast({ type: 'error', title: 'Notification Failed', message: err.message || 'Failed to dispatch email notice.' });
      }
    })();
  };

  const handlePrintActivityLedger = async (selectedRole: 'treasurer' | 'asst-treasurer', selectedScope: string) => {

    const origin = window.location.origin;

    const getStudentName = (studentIdOrDoc: any) => {
      if (!studentIdOrDoc) return 'Unknown Member';
      const id = typeof studentIdOrDoc === 'object' ? studentIdOrDoc.$id : studentIdOrDoc;
      const studentAcc = students.find(s => {
        const profile = s.students as any;
        const sId = profile?.$id || s.$id;
        return sId === id;
      });
      if (studentAcc) {
        const profile = studentAcc.students as any;
        return profile?.name || studentAcc.username || 'Unknown Member';
      }
      return 'Unknown Member';
    };

    // Group payments by activity
    const activityGroups: Record<string, PaymentDoc[]> = {};
    payments.filter(p => !p.is_outside_bscs).forEach(p => {
      let actName = 'General Collection';
      if (p.is_event && p.events) {
        const evId = typeof p.events === 'object' ? p.events.$id : p.events;
        const ev = events.find(e => e.$id === evId);
        actName = ev?.event_name || 'Linked Event';
      } else if (p.activity) {
        actName = p.activity;
      }
      if (!activityGroups[actName]) {
        activityGroups[actName] = [];
      }
      activityGroups[actName].push(p);
    });

    const activitiesList = Object.keys(activityGroups).sort((a, b) => a.localeCompare(b));

    const getOfficerDetails = (positionCode: string, defaultTitle: string) => {
      const officer = officersList.find(o => o.position === positionCode);
      if (officer && officer.students) {
        const student = typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
        if (student?.name) {
          return {
            name: student.name.toUpperCase(),
            title: `${defaultTitle}, SPECS`
          };
        }
      }
      return {
        name: '_______________________',
        title: `${defaultTitle}, SPECS`
      };
    };

    const presidentDetails = getOfficerDetails('president', 'President');
    const auditorDetails = getOfficerDetails('auditor', 'Auditor');
    
    // For Treasurer/Prep by: dynamically resolved based on selection
    const treasurerDetails = selectedRole === 'treasurer'
      ? getOfficerDetails('treasurer', 'Treasurer')
      : getOfficerDetails('asst-treasurer', 'Assistant Treasurer');

    const adviserDetails = {
      name: 'NICOLAS A. PURA',
      title: 'Adviser, SPECS'
    };

    const activitiesToPrint = selectedScope === 'all'
      ? activitiesList
      : activitiesList.filter(a => a === selectedScope);

    const pagesHtml = activitiesToPrint.map((activityName, index) => {
      const actPayments = activityGroups[activityName];
      const sortedPayments = [...actPayments].sort((a, b) => {
        const nameA = getStudentName(a.students);
        const nameB = getStudentName(b.students);
        return nameA.localeCompare(nameB);
      });

      const totalPaid = sortedPayments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const totalOutstanding = sortedPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const paidCount = sortedPayments.filter(p => p.is_paid).length;
      const totalCount = sortedPayments.length;
      const rate = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;

      const rows = sortedPayments.map((p, idx) => {
        const studentName = getStudentName(p.students);
        const total = p.price * p.quantity;
        const dateStr = p.is_paid && p.date_paid && p.date_paid !== new Date(0).toISOString()
          ? new Date(p.date_paid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        const recorderName = p.is_paid ? (p.verified_by_name || 'Admin') : '—';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight: bold;">${studentName}</td>
            <td>${p.item_name}</td>
            <td>₱${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${p.quantity}</td>
            <td style="font-weight: bold;">₱${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${recorderName}</td>
            <td>${dateStr}</td>
          </tr>
        `;
      }).join('');

      const pageBreakHtml = index < activitiesToPrint.length - 1 ? '<div class="page-break"></div>' : '';

      return `
        <div class="activity-report-page">
          <h2 class="report-title">Payment Ledger Report</h2>
          <h3 style="text-align: center; color: #475569; margin-top: -5px; font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
            Activity: ${activityName}
          </h3>

          <div class="meta-section">
            <p class="meta-item"><strong>Activity Name:</strong> ${activityName}</p>
            <p class="meta-item"><strong>Collected Amount:</strong> <span style="color: #059669; font-weight: bold;">₱${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 5%;">No.</th>
                <th style="width: 25%;">Student Name</th>
                <th style="width: 20%;">Item</th>
                <th style="width: 10%;">Price</th>
                <th style="width: 5%;">Qty</th>
                <th style="width: 12%;">Total</th>
                <th style="width: 13%;">Recorded By</th>
                <th style="width: 10%;">Date Paid</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No payment records found for this activity.</td></tr>'}
            </tbody>
          </table>

          <div class="signature-section" style="margin-top: 50px; page-break-inside: avoid;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px 80px;">
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">PREPARED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${treasurerDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${treasurerDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">AUDITED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${auditorDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${auditorDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">ATTESTED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${presidentDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${presidentDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">NOTED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${adviserDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${adviserDetails.title.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
        ${pageBreakHtml}
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SPECS Payment Ledger by Activity</title>
          <style>
            @page {
              size: 8.5in 13in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              line-height: 1.5;
            }
            .activity-report-page {
              width: 100%;
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
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            .meta-section {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 24px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px 30px;
              font-size: 13px;
            }
            .meta-item {
              margin: 0;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            .report-table th, .report-table td {
              border: 1px solid #e2e8f0;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            .report-table th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }

            .page-break {
              page-break-after: always;
              break-after: page;
            }
            @media print {
              body {
                margin: 0;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
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
                  ${pagesHtml || '<div style="text-align: center; padding: 40px; color: #94a3b8;">No payment activities available to print.</div>'}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="footer-spacer"></div>
                </td>
              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { downloadPdfFromHtml } = await import('../../shared/utils');
      await downloadPdfFromHtml(htmlContent, `Payment_Ledger_${selectedScope === 'all' ? 'All_Activities' : selectedScope.replace(/\s+/g, '_')}.pdf`, addToast);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Pop-up Blocked', message: 'Please allow pop-ups for this website to print reports.' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  const handlePrintOutsideActivityLedger = async (selectedRole: 'treasurer' | 'asst-treasurer', selectedScope: string) => {

    const origin = window.location.origin;

    // Group outside payments by activity
    const activityGroups: Record<string, PaymentDoc[]> = {};
    payments.filter(p => p.is_outside_bscs).forEach(p => {
      let actName = 'General Collection';
      if (p.is_event && p.events) {
        const evId = typeof p.events === 'object' ? p.events.$id : p.events;
        const ev = events.find(e => e.$id === evId);
        actName = ev?.event_name || 'Linked Event';
      } else if (p.activity) {
        actName = p.activity;
      }
      if (!activityGroups[actName]) {
        activityGroups[actName] = [];
      }
      activityGroups[actName].push(p);
    });

    const activitiesList = Object.keys(activityGroups).sort((a, b) => a.localeCompare(b));

    const getOfficerDetails = (positionCode: string, defaultTitle: string) => {
      const officer = officersList.find(o => o.position === positionCode);
      if (officer && officer.students) {
        const student = typeof officer.students === 'object' ? (officer.students as StudentDoc) : null;
        if (student?.name) {
          return {
            name: student.name.toUpperCase(),
            title: `${defaultTitle}, SPECS`
          };
        }
      }
      return {
        name: '_______________________',
        title: `${defaultTitle}, SPECS`
      };
    };

    const presidentDetails = getOfficerDetails('president', 'President');
    const auditorDetails = getOfficerDetails('auditor', 'Auditor');
    
    // For Treasurer/Prep by: resolved based on selection
    const treasurerDetails = selectedRole === 'treasurer'
      ? getOfficerDetails('treasurer', 'Treasurer')
      : getOfficerDetails('asst-treasurer', 'Assistant Treasurer');

    const adviserDetails = {
      name: 'NICOLAS A. PURA',
      title: 'Adviser, SPECS'
    };

    const activitiesToPrint = selectedScope === 'all'
      ? activitiesList
      : activitiesList.filter(a => a === selectedScope);

    const pagesHtml = activitiesToPrint.map((activityName, index) => {
      const actPayments = activityGroups[activityName];
      const sortedPayments = [...actPayments].sort((a, b) => {
        const nameA = a.non_bscs_name || 'Unknown';
        const nameB = b.non_bscs_name || 'Unknown';
        return nameA.localeCompare(nameB);
      });

      const totalPaid = sortedPayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const paidCount = sortedPayments.length;

      const rows = sortedPayments.map((p, idx) => {
        const payerName = p.non_bscs_name || 'Unknown Payer';
        const total = p.price * p.quantity;
        const dateStr = p.date_paid && p.date_paid !== new Date(0).toISOString()
          ? new Date(p.date_paid).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
          : '—';
        const recorderName = p.verified_by_name || 'Admin';

        return `
          <tr>
            <td>${idx + 1}</td>
            <td style="font-weight: bold;">${payerName}</td>
            <td>${p.item_name}</td>
            <td>₱${p.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${p.quantity}</td>
            <td style="font-weight: bold;">₱${total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
            <td>${recorderName}</td>
            <td>${dateStr}</td>
          </tr>
        `;
      }).join('');

      const pageBreakHtml = index < activitiesToPrint.length - 1 ? '<div class="page-break"></div>' : '';

      return `
        <div class="activity-report-page">
          <h2 class="report-title">Outside Payments Ledger Report</h2>
          <h3 style="text-align: center; color: #475569; margin-top: -5px; font-size: 15px; font-weight: bold; text-transform: uppercase; margin-bottom: 20px;">
            Activity / Event: ${activityName}
          </h3>

          <div class="meta-section">
            <p class="meta-item"><strong>Activity Name:</strong> ${activityName}</p>
            <p class="meta-item"><strong>Collected Amount:</strong> <span style="color: #059669; font-weight: bold;">₱${totalPaid.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></p>
            <p class="meta-item"><strong>Transactions:</strong> <span>${paidCount}</span></p>
          </div>

          <table class="report-table">
            <thead>
              <tr>
                <th style="width: 5%;">No.</th>
                <th style="width: 25%;">Payer / Organization Name</th>
                <th style="width: 20%;">Item</th>
                <th style="width: 10%;">Price</th>
                <th style="width: 5%;">Qty</th>
                <th style="width: 12%;">Total</th>
                <th style="width: 13%;">Recorded By</th>
                <th style="width: 10%;">Date Paid</th>
              </tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="8" style="text-align: center; color: #94a3b8;">No payment records found for this activity.</td></tr>'}
            </tbody>
          </table>

          <div class="signature-section" style="margin-top: 50px; page-break-inside: avoid;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 60px 80px;">
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">PREPARED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${treasurerDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${treasurerDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">AUDITED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${auditorDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${auditorDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">ATTESTED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${presidentDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${presidentDetails.title.toUpperCase()}</p>
              </div>
              <div>
                <p style="margin: 0 0 35px 0; font-size: 13px; color: #1e293b; font-weight: bold; text-transform: uppercase;">NOTED BY:</p>
                <p style="margin: 0; font-size: 14px; font-weight: bold; color: #0f172a; text-transform: uppercase;">${adviserDetails.name.toUpperCase()}</p>
                <p style="margin: 3px 0 0 0; font-size: 12px; font-style: italic; color: #475569; text-transform: uppercase;">${adviserDetails.title.toUpperCase()}</p>
              </div>
            </div>
          </div>
        </div>
        ${pageBreakHtml}
      `;
    }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>SPECS Outside Payments Ledger by Activity</title>
          <style>
            @page {
              size: 8.5in 13in;
              margin: 0;
            }
            html, body {
              margin: 0;
              padding: 0;
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
              color: #1e293b;
              line-height: 1.5;
            }
            .activity-report-page {
              width: 100%;
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
              font-size: 20px;
              font-weight: 800;
              text-transform: uppercase;
              margin: 20px 0 10px 0;
              color: #0f172a;
            }
            .meta-section {
              background-color: #f8fafc;
              border: 1px solid #e2e8f0;
              border-radius: 8px;
              padding: 15px;
              margin-bottom: 24px;
              display: flex;
              flex-wrap: wrap;
              gap: 10px 30px;
              font-size: 13px;
            }
            .meta-item {
              margin: 0;
            }
            .report-table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 16px;
            }
            .report-table th, .report-table td {
              border: 1px solid #e2e8f0;
              padding: 10px 12px;
              text-align: left;
              font-size: 12px;
            }
            .report-table th {
              background-color: #f1f5f9;
              font-weight: 700;
              color: #334155;
              text-transform: uppercase;
              font-size: 11px;
              letter-spacing: 0.5px;
            }
            .report-table tr:nth-child(even) {
              background-color: #f8fafc;
            }

            .page-break {
              page-break-after: always;
              break-after: page;
            }
            @media print {
              body {
                margin: 0;
              }
              .page-break {
                page-break-after: always;
                break-after: page;
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
                  ${pagesHtml || '<div style="text-align: center; padding: 40px; color: #94a3b8;">No payment activities available to print.</div>'}
                </td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td>
                  <div class="footer-spacer"></div>
                </td>
              </tr>
            </tfoot>
          </table>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    if (isMobile) {
      const { downloadPdfFromHtml } = await import('../../shared/utils');
      await downloadPdfFromHtml(htmlContent, `Outside_Payment_Ledger_${selectedScope === 'all' ? 'All_Activities' : selectedScope.replace(/\s+/g, '_')}.pdf`, addToast);
      return;
    }

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      addToast({ type: 'error', title: 'Pop-up Blocked', message: 'Please allow pop-ups for this website to print reports.' });
      return;
    }

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  // Metrics computation
  const summary = useMemo(() => {
    const memberPayments = payments.filter(p => !p.is_outside_bscs);
    const totalPaid = memberPayments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const totalOutstanding = memberPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
    const completionRate = memberPayments.length > 0 ? Math.round((memberPayments.filter(p => p.is_paid).length / memberPayments.length) * 100) : 0;
    return { totalPaid, totalOutstanding, completionRate };
  }, [payments]);

  // Aggregate outside payments
  const outsidePayments = useMemo(() => {
    return payments.filter(p => p.is_outside_bscs);
  }, [payments]);

  // Metrics for outside payments
  const outsideSummary = useMemo(() => {
    const totalCollected = outsidePayments.reduce((sum, p) => sum + (p.price * p.quantity), 0);
    return { totalCollected };
  }, [outsidePayments]);

  // Aggregate student & officer payments for list grid
  const studentLedger = useMemo(() => {
    const list = students.map(std => {
      const profile = std.students as any;
      const sId = profile?.$id || std.$id;
      const stdPayments = payments.filter(p => {
        const pStdId = p.students ? (typeof p.students === 'object' ? p.students.$id : p.students) : '';
        return pStdId === sId;
      });

      const outstanding = stdPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);
      const paid = stdPayments.filter(p => p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0);

      return {
        studentDoc: std,
        sId,
        name: profile?.name || std.username || 'Unknown Member',
        role: std.type,
        yearLevel: profile?.yearLevel || 0,
        outstanding,
        paid,
        paymentsCount: stdPayments.length
      };
    });

    // Sort: 1. outstanding > 0 first, sorted by outstanding desc, but only keep top 20 with dues.
    // The rest with dues + those without dues are sorted by name.
    const withDues = list.filter(item => item.outstanding > 0)
      .sort((a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name));
    const withoutDues = list.filter(item => item.outstanding === 0);

    const top20WithDues = withDues.slice(0, 20);
    const restWithDues = withDues.slice(20);

    const remainingList = [...withoutDues, ...restWithDues].sort((a, b) => a.name.localeCompare(b.name));

    return [...top20WithDues, ...remainingList];
  }, [students, payments]);

  // Filter student ledger items
  const filteredLedger = useMemo(() => {
    if (!searchQuery.trim()) return studentLedger;
    const q = searchQuery.toLowerCase();
    return studentLedger.filter(l => l.name.toLowerCase().includes(q));
  }, [studentLedger, searchQuery]);

  // Filter outside payments
  const filteredOutsidePayments = useMemo(() => {
    if (!searchQuery.trim()) return outsidePayments;
    const q = searchQuery.toLowerCase();
    return outsidePayments.filter(p => 
      (p.non_bscs_name || '').toLowerCase().includes(q) ||
      (p.item_name || '').toLowerCase().includes(q)
    );
  }, [outsidePayments, searchQuery]);

  // Reset pagination to page 1 on filter
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Slice paginated items
  const paginatedLedger = useMemo(() => {
    const startIndex = (currentPage - 1) * PAGE_SIZE;
    return filteredLedger.slice(startIndex, startIndex + PAGE_SIZE);
  }, [filteredLedger, currentPage]);

  // Specific student payments details
  const currentStudentPayments = useMemo(() => {
    if (!selectedStudent) return [];
    const profile = selectedStudent.students as any;
    const sId = profile?.$id || selectedStudent.$id;
    return payments.filter(p => {
      const pStdId = p.students ? (typeof p.students === 'object' ? p.students.$id : p.students) : '';
      return pStdId === sId;
    });
  }, [payments, selectedStudent]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Payment Management</h1>
          <p className="text-sm text-slate-500 mt-1">Assign dues, collect payments, and manage student and officer accounts</p>
        </div>
        <div className="flex items-center gap-2">
          {(selectedStudent || isAddView || isOutsideView) && (
            <button
              onClick={() => {
                if (isCreateView || isOutsideView) {
                  navigate(window.location.pathname.replace(isCreateView ? '/create' : '/outside', ''));
                } else {
                  setSelectedStudent(null);
                }
              }}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-sm"
            >
              <ArrowLeft className="h-4 w-4 text-slate-500" />
              Back to List
            </button>
          )}
          <button
            onClick={() => loadData(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm"
          >
            <RotateCw className={`h-4 w-4 text-slate-500 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Main Ledger List State */}
      {isOutsideView ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">Record Non-Member / Outside Payment</h2>
            <p className="text-sm text-slate-500 mt-1">Record a collection from outside organizations or civilian payers.</p>
          </div>

          <form onSubmit={handleRecordOutsidePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <div className="lg:col-span-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Payer Name / Organization</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. BSIT Dept, Jane Doe"
                  value={nonBscsName}
                  onChange={e => setNonBscsName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Items to Collect ({dynamicItems.length})</label>
                  <button
                    type="button"
                    onClick={() => setDynamicItems(prev => [...prev, { id: Date.now().toString(), name: '', price: 0, quantity: 1 }])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6b66] hover:text-[#0b5c58] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {dynamicItems.map((item, idx) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 relative group">
                      {dynamicItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDynamicItems(prev => prev.filter(i => i.id !== item.id))}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-slate-100"
                          title="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Item #${idx + 1}</div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Name / Description</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Registration Fee, Entrance Pass"
                          value={item.name}
                          onChange={e => {
                            const val = e.target.value;
                            setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price (PHP)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.price || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, price: val } : i));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="linkEventCheck"
                  checked={isEventLink}
                  onChange={e => setIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                />
                <label htmlFor="linkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {isEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Event</label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none transition-colors"
                  >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                      <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Semester Collection"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                  />
                </div>
              )}
            </div>

            <div className="lg:col-span-6 space-y-5 border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Date Paid</label>
                <input
                  type="date"
                  required
                  value={datePaid}
                  onChange={e => setDatePaid(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Optional Email Receipt</label>
                <input
                  type="email"
                  placeholder="payer@example.com"
                  value={payerEmail}
                  onChange={e => setPayerEmail(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                />
                <span className="text-[10px] text-slate-400 mt-1 block font-medium">An official PDF email receipt will be generated and dispatched if an email address is supplied.</span>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Modality</label>
                <div className="grid grid-cols-2 gap-4">
                  <div
                    onClick={() => setModality('cash')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      modality === 'cash'
                        ? 'border-emerald-600 bg-emerald-500/10 dark:border-emerald-500 dark:bg-emerald-500/20 ring-1 ring-emerald-600/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <span className={`text-sm font-bold ${modality === 'cash' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>Cash</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Physical Tender</span>
                  </div>

                  <div
                    onClick={() => setModality('gcash')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      modality === 'gcash'
                        ? 'border-blue-600 bg-blue-500/10 dark:border-blue-500 dark:bg-blue-500/20 ring-1 ring-blue-600/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <span className={`text-sm font-bold ${modality === 'gcash' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>GCash</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Mobile E-Wallet</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-6 border-t border-slate-100 justify-end w-full">
                <button
                  type="button"
                  onClick={() => navigate(window.location.pathname.replace('/outside', ''))}
                  className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Record Collection
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : isAddView ? (
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
          <div className="border-b border-slate-100 pb-4 mb-6">
            <h2 className="text-xl font-bold text-slate-900">New Payment Due Entry</h2>
            <p className="text-sm text-slate-500 mt-1">Fill out the due parameters and select who should receive this charge.</p>
          </div>

          <form onSubmit={handleCreatePayment} className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            {/* Left Column - Form Fields */}
            <div className="lg:col-span-5 space-y-5">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Dues Items ({dynamicItems.length})</label>
                  <button
                    type="button"
                    onClick={() => setDynamicItems(prev => [...prev, { id: Date.now().toString(), name: '', price: 0, quantity: 1 }])}
                    className="inline-flex items-center gap-1 text-xs font-bold text-[#0d6b66] hover:text-[#0b5c58] transition-colors"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-3">
                  {dynamicItems.map((item, idx) => (
                    <div key={item.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50/50 space-y-3 relative group">
                      {dynamicItems.length > 1 && (
                        <button
                          type="button"
                          onClick={() => setDynamicItems(prev => prev.filter(i => i.id !== item.id))}
                          className="absolute top-3 right-3 text-slate-400 hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-slate-100"
                          title="Remove item"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Item #${idx + 1}</div>
                      
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Item Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Membership Fee 2026"
                          value={item.name}
                          onChange={e => {
                            const val = e.target.value;
                            setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, name: val } : i));
                          }}
                          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Price (PHP)</label>
                          <input
                            type="number"
                            required
                            min="0"
                            step="0.01"
                            placeholder="0.00"
                            value={item.price || ''}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, price: val } : i));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Quantity</label>
                          <input
                            type="number"
                            required
                            min="1"
                            value={item.quantity}
                            onChange={e => {
                              const val = Number(e.target.value);
                              setDynamicItems(prev => prev.map(i => i.id === item.id ? { ...i, quantity: val } : i));
                            }}
                            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 outline-none focus:border-[#0d6b66] bg-white transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="linkEventCheck"
                  checked={isEventLink}
                  onChange={e => setIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                />
                <label htmlFor="linkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {isEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Select Event</label>
                  <select
                    required
                    value={selectedEventId}
                    onChange={e => setSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none transition-colors"
                  >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                      <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">Activity Name</label>
                  <input
                    type="text"
                    placeholder="e.g. 1st Semester Collection"
                    value={activityName}
                    onChange={e => setActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                  />
                </div>
              )}

              <hr className="border-slate-100 my-2" />

              <div className="flex items-center gap-3 p-3.5 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="assignAllCheck"
                  checked={assignAll}
                  onChange={e => setAssignAll(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66] cursor-pointer"
                />
                <label htmlFor="assignAllCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Assign to all members directory
                </label>
              </div>

              <div className="flex gap-3 pt-4 border-t justify-start lg:hidden">
                <button
                  type="button"
                  onClick={() => navigate(window.location.pathname.split('/create')[0])}
                  className="flex-1 rounded-lg border border-slate-200 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 rounded-lg bg-[#0d6b66] py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Due
                </button>
              </div>
            </div>

            {/* Right Column - Assignees selection or all info */}
            <div className="lg:col-span-7 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-slate-100 pt-6 lg:pt-0 lg:pl-8 min-h-[300px]">
              <div className="space-y-4 flex-1">
                {!assignAll ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Assignees ({selectedAssigneeIds.length} selected)</label>
                      {selectedAssigneeIds.length > 0 && (
                        <button
                          type="button"
                          onClick={() => setSelectedAssigneeIds([])}
                          className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors"
                        >
                          Clear Selection
                        </button>
                      )}
                    </div>
                    
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Search student directories..."
                        value={assignStudentQuery}
                        onChange={e => setAssignStudentQuery(e.target.value)}
                        className="w-full rounded-lg border border-slate-200 pl-10 pr-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] bg-white transition-colors"
                      />
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 max-h-[350px] overflow-y-auto space-y-1.5">
                      {filteredAssignees.length === 0 ? (
                        <div className="text-center py-8 text-sm text-slate-400 font-medium">No students matched the query</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {filteredAssignees.map(student => {
                            const isChecked = selectedAssigneeIds.includes(student.id);
                            return (
                              <label
                                key={student.id}
                                className={`flex items-center gap-3 p-2.5 rounded-lg border bg-white cursor-pointer transition-all ${
                                  isChecked 
                                    ? 'border-[#0d6b66] ring-1 ring-[#0d6b66]/20 bg-[#0d6b66]/5' 
                                    : 'border-slate-200 hover:bg-slate-50/80'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isChecked) {
                                      setSelectedAssigneeIds(prev => prev.filter(id => id !== student.id));
                                    } else {
                                      setSelectedAssigneeIds(prev => [...prev, student.id]);
                                    }
                                  }}
                                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                                />
                                <div className="text-xs">
                                  <span className="font-bold text-slate-800 block truncate">{student.name}</span>
                                  {student.yearLevel > 0 && (
                                    <span className="text-[10px] text-slate-400 font-semibold uppercase">Year {student.yearLevel}</span>
                                  )}
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-center p-8 bg-teal-50/40 border border-teal-100 rounded-xl h-full min-h-[250px]">
                    <div className="h-12 w-12 rounded-full bg-teal-100 text-[#0d6b66] flex items-center justify-center mb-3">
                      <Plus className="h-6 w-6" />
                    </div>
                    <h4 className="font-bold text-slate-900">Assigning to all members</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1">
                      Every member currently registered in the database directory ({students.length} people) will be assigned this outstanding due item.
                    </p>
                  </div>
                )}
              </div>

              {/* Desktop Submit Row */}
              <div className="hidden lg:flex gap-3 pt-6 border-t border-slate-100 justify-end w-full">
                <button
                  type="button"
                  onClick={() => navigate(window.location.pathname.split('/create')[0])}
                  className="rounded-lg border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-lg bg-[#0d6b66] px-6 py-2.5 text-sm font-bold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  Create Due Entry
                </button>
              </div>
            </div>
          </form>
        </div>
      ) : !selectedStudent ? (
        <>
          {/* Tabs */}
          <div className="flex border-b border-slate-200 space-x-2">
            <button
              onClick={() => {
                setActiveTab('members');
                localStorage.setItem('admin_payments_tab', 'members');
              }}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-colors ${
                activeTab === 'members'
                  ? 'border-[#0d6b66] text-[#0d6b66]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Member Ledger
            </button>
            <button
              onClick={() => {
                setActiveTab('outside');
                localStorage.setItem('admin_payments_tab', 'outside');
              }}
              className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-colors ${
                activeTab === 'outside'
                  ? 'border-[#0d6b66] text-[#0d6b66]'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Outside Payments (Non-Members)
            </button>
          </div>

          {activeTab === 'members' ? (
            <>
              {/* General Summary Cards */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Members</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{students.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</span>
                  <p className="text-2xl font-bold text-red-600 mt-1">{formatCurrency(summary.totalOutstanding)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Collected</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(summary.totalPaid)}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ledger Completion</span>
                  <p className="text-2xl font-bold text-[#0d6b66]">{summary.completionRate}%</p>
                  <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-[#0d6b66] rounded-full" style={{ width: `${summary.completionRate}%` }} />
                  </div>
                </div>
              </div>

              {/* Search bar & Action row */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search ledger..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
                  />
                </div>
                <button
                  onClick={() => {
                    setPrintScope('all');
                    setPrintModalOpen(true);
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                  title="Print Payment Ledger grouped by Activity"
                >
                  <Printer className="h-4 w-4 text-slate-500" />
                  {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Activity Report'}
                </button>
              </div>

              {/* Student Grid */}
              {loading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
              ) : filteredLedger.length === 0 ? (
                <EmptyState title="No Records found" description="Adjust your filters or add payments dues first." />
              ) : (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {paginatedLedger.map(ledgerItem => (
                      <div
                        key={ledgerItem.sId}
                        onClick={() => setSelectedStudent(ledgerItem.studentDoc)}
                        className="rounded-xl border border-slate-200 bg-white p-5 cursor-pointer hover:shadow-md hover:-translate-y-1 transition-all duration-200 flex flex-col justify-between"
                      >
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-600 font-bold uppercase">
                              {ledgerItem.name.substring(0, 2)}
                            </div>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h4 className="font-bold text-slate-800 line-clamp-1">{ledgerItem.name}</h4>
                                {ledgerItem.role === 'officer' && (
                                  <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider">
                                    Officer
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-semibold uppercase">Year {ledgerItem.yearLevel || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <hr className="my-3 text-slate-100" />

                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Outstanding:</span>
                              <span className="font-bold text-red-500">{formatCurrency(ledgerItem.outstanding)}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-slate-400">Collected:</span>
                              <span className="font-bold text-emerald-600">{formatCurrency(ledgerItem.paid)}</span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mt-3 text-right">
                          {ledgerItem.paymentsCount} total records
                        </div>
                      </div>
                    ))}
                  </div>

                  <Pagination
                    currentPage={currentPage}
                    totalPages={Math.ceil(filteredLedger.length / PAGE_SIZE)}
                    onPageChange={setCurrentPage}
                    totalItems={filteredLedger.length}
                    pageSize={PAGE_SIZE}
                  />
                </>
              )}

              {/* Add Dues FAB */}
              <button
                onClick={() => navigate('create')}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
                title="Create Payment Entry"
              >
                <Plus className="h-6 w-6" />
              </button>
            </>
          ) : (
            <>
              {/* Outside Payments summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Transactions</span>
                  <p className="text-2xl font-bold text-slate-900 mt-1">{outsidePayments.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Outside Collected</span>
                  <p className="text-2xl font-bold text-emerald-600 mt-1">{formatCurrency(outsideSummary.totalCollected)}</p>
                </div>
              </div>

              {/* Search bar + Action row */}
              <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div className="relative max-w-sm flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search outside payments..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white pl-10 pr-4 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none transition-colors"
                  />
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    onClick={() => {
                      setPrintScope('all');
                      setPrintModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-colors shadow-xs"
                    title="Print Outside Payment Ledger grouped by Activity"
                  >
                    <Printer className="h-4 w-4 text-slate-500" />
                    {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Outside Report'}
                  </button>
                  <button
                    onClick={() => navigate('outside')}
                    className="rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="h-4 w-4" />
                    Record Outside Payment
                  </button>
                </div>
              </div>

              {/* Outside Payments Table */}
              {loading ? (
                <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs animate-pulse space-y-4">
                  <div className="h-8 bg-slate-100 rounded w-1/3" />
                  <div className="h-20 bg-slate-50 rounded" />
                </div>
              ) : filteredOutsidePayments.length === 0 ? (
                <EmptyState title="No Outside Payments Found" description="Adjust your search query or record a payment collection." />
              ) : (
                <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
                  <table className="w-full text-left text-sm text-slate-500">
                    <thead className="bg-slate-50 text-xs font-bold text-slate-700 uppercase border-b">
                      <tr>
                        <th className="px-6 py-4">Date Paid</th>
                        <th className="px-6 py-4">Payer / Organization</th>
                        <th className="px-6 py-4">Item Description</th>
                        <th className="px-6 py-4">Qty</th>
                        <th className="px-6 py-4">Price</th>
                        <th className="px-6 py-4">Total</th>
                        <th className="px-6 py-4">Modality</th>
                        <th className="px-6 py-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredOutsidePayments.map(p => {
                        const total = p.price * p.quantity;
                        const formattedDate = new Date(p.date_paid).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        });

                        return (
                          <tr key={p.$id} className="hover:bg-slate-50/50 transition-colors">
                            <td className="px-6 py-4 font-medium text-slate-800">{formattedDate}</td>
                            <td className="px-6 py-4 font-bold text-slate-900">{p.non_bscs_name}</td>
                            <td className="px-6 py-4 text-slate-600">{p.item_name}</td>
                            <td className="px-6 py-4 font-semibold">{p.quantity}</td>
                            <td className="px-6 py-4 font-semibold">{formatCurrency(p.price)}</td>
                            <td className="px-6 py-4 font-extrabold text-[#0d6b66]">{formatCurrency(total)}</td>
                            <td className="px-6 py-4">
                              <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${
                                p.modal_paid === 'gcash'
                                  ? 'bg-blue-50 border-blue-100 text-blue-700'
                                  : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                              }`}>
                                {p.modal_paid || 'CASH'}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right">
                              <button
                                onClick={() => setDeleteConfirm({ open: true, payment: p })}
                                className="inline-flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 transition-colors"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Record FAB for Outside Payments */}
              <button
                onClick={() => navigate('outside')}
                className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-[#0d6b66] hover:bg-[#0b5c58] text-white shadow-2xl transition-transform hover:scale-105 active:scale-95"
                title="Record Outside Payment"
              >
                <Plus className="h-6 w-6" />
              </button>
            </>
          )}
        </>
      ) : (
        /* Specific Student Dues Sub-View */
        <div className="space-y-6">
          {/* Student Profile summary */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-50 border border-slate-100 font-bold text-lg text-[#0d6b66] uppercase shadow-inner">
                {selectedStudent.username?.substring(0, 2) || 'MB'}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-900">{(selectedStudent.students as any)?.name || selectedStudent.username}</h3>
                  {selectedStudent.type === 'officer' && (
                    <span className="inline-flex items-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-900/20 dark:text-teal-400 border border-teal-100 dark:border-teal-900/30 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider">
                      Officer
                    </span>
                  )}
                </div>
                <p className="text-xs text-slate-500 font-medium">BSCS — Year {(selectedStudent.students as any)?.yearLevel || 'N/A'}</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="rounded-lg bg-red-50 border border-red-100 px-4 py-2 text-right">
                <span className="block text-[10px] font-bold text-red-500 uppercase tracking-wide">Total Outstanding Due</span>
                <span className="text-xl font-bold text-red-700">
                  {formatCurrency(
                    currentStudentPayments.filter(p => !p.is_paid).reduce((sum, p) => sum + (p.price * p.quantity), 0)
                  )}
                </span>
              </div>
              {currentStudentPayments.filter(p => !p.is_paid).length > 0 && (
                <button
                  onClick={handleNotifyDues}
                  disabled={notifying}
                  className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white font-bold text-xs px-3.5 py-2.5 shadow-sm disabled:opacity-50 transition-all duration-200"
                  title="Notify student of outstanding payments via email"
                >
                  {notifying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Mail className="h-3.5 w-3.5" />}
                  Notify Dues
                </button>
              )}
            </div>
          </div>

          {/* Dues Cards/Tables split */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Pending Dues */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="border-b border-slate-200 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Pending Dues</span>
                <span className="text-xs font-semibold text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                  {currentStudentPayments.filter(p => !p.is_paid).length} pending
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {currentStudentPayments.filter(p => !p.is_paid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">All caught up! No outstanding dues.</div>
                ) : (
                  currentStudentPayments.filter(p => !p.is_paid).map(p => {
                    const linkedEvent = p.is_event && p.events
                      ? (events.find(e => e.$id === p.events || e.$id === (p.events as any).$id)?.event_name || 'Linked Event')
                      : p.activity;

                    return (
                      <div key={p.$id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{p.item_name}</h4>
                          <span className="text-xs text-slate-400 mt-0.5 block">{linkedEvent || 'General Collection'}</span>
                          <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Qty: {p.quantity} x {formatCurrency(p.price)}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => {
                              setModalPaid('cash');
                              setConfirmRecipient(false);
                              setPaidConfirm({ open: true, payment: p });
                            }}
                            className="rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs px-2.5 py-1.5 shadow-xs transition-colors"
                          >
                            Mark Paid
                          </button>
                          <button
                            onClick={() => handleOpenEdit(p)}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors"
                            title="Edit due"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, payment: p })}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete due"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Collected History */}
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              <div className="border-b border-slate-200 px-5 py-3.5 bg-slate-50 flex items-center justify-between">
                <span className="text-sm font-bold text-slate-800 uppercase tracking-wider">Collected Dues</span>
                <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full">
                  {currentStudentPayments.filter(p => p.is_paid).length} paid
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-[400px] overflow-y-auto">
                {currentStudentPayments.filter(p => p.is_paid).length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-400">No paid history available.</div>
                ) : (
                  currentStudentPayments.filter(p => p.is_paid).map(p => {
                    const linkedEvent = p.is_event && p.events
                      ? (events.find(e => e.$id === p.events || e.$id === (p.events as any).$id)?.event_name || 'Linked Event')
                      : p.activity;

                    const authorizingUser = (() => {
                      const officerId = p.officers ? (typeof p.officers === 'object' ? p.officers.$id : p.officers) : null;
                      if (!officerId) return 'Admin';
                      const foundAccount = students.find(acc => {
                        if (acc.type !== 'officer' || !acc.officers) return false;
                        const accOfficerId = typeof acc.officers === 'object' ? acc.officers.$id : acc.officers;
                        return accOfficerId === officerId;
                      });
                      if (foundAccount) {
                        return (foundAccount.students as any)?.name || foundAccount.username || 'Officer';
                      }
                      return 'Officer';
                    })();

                    return (
                      <div key={p.$id} className="p-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors">
                        <div>
                          <h4 className="text-sm font-bold text-slate-800">{p.item_name}</h4>
                          <span className="text-xs text-slate-400 mt-0.5 block">{linkedEvent || 'General Collection'}</span>
                          <span className="text-[10px] font-semibold text-slate-500 mt-1 block">Qty: {p.quantity} x {formatCurrency(p.price)}</span>
                          
                          <div className="flex flex-wrap items-center gap-2 mt-2">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              p.modal_paid === 'gcash'
                                ? 'bg-blue-50/50 border-blue-100 text-blue-700'
                                : 'bg-emerald-50/50 border-emerald-100 text-emerald-700'
                            }`}>
                              {p.modal_paid || 'Cash'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium">
                              Authorized by: <span className="font-bold text-slate-600">{authorizingUser}</span>
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                            Paid
                          </span>
                          <button
                            onClick={() => setDeleteConfirm({ open: true, payment: p })}
                            className="flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-red-500 hover:bg-red-50 transition-colors"
                            title="Delete paid transaction record"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}



      {/* Edit Payment Modal */}
      {editingPayment && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setEditingPayment(null)}>
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Modify Outstanding Dues</h2>
              <button onClick={() => setEditingPayment(null)} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleEditPayment} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Item Name</label>
                <input
                  type="text"
                  required
                  value={editItemName}
                  onChange={e => setEditItemName(e.target.value)}
                  className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Price (PHP)</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={editPrice}
                    onChange={e => setEditPrice(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Quantity</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editQuantity}
                    onChange={e => setEditQuantity(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg">
                <input
                  type="checkbox"
                  id="editLinkEventCheck"
                  checked={editIsEventLink}
                  onChange={e => setEditIsEventLink(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-slate-300 text-[#0d6b66] focus:ring-[#0d6b66]"
                />
                <label htmlFor="editLinkEventCheck" className="text-sm font-semibold text-slate-700 cursor-pointer select-none">
                  Link this payment to an organization event
                </label>
              </div>

              {editIsEventLink ? (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Select Event</label>
                  <select
                    required
                    value={editSelectedEventId}
                    onChange={e => setEditSelectedEventId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 focus:border-[#0d6b66] outline-none"
                  >
                    <option value="">-- Choose an event --</option>
                    {events.map(ev => (
                      <option key={ev.$id} value={ev.$id}>{ev.event_name}</option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-1">Activity Name</label>
                  <input
                    type="text"
                    value={editActivityName}
                    onChange={e => setEditActivityName(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 px-4 py-2.5 text-sm text-slate-900 outline-none focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66]"
                  />
                </div>
              )}

              <div className="flex gap-3 pt-4 border-t justify-end">
                <button
                  type="button"
                  onClick={() => setEditingPayment(null)}
                  className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editSubmitting}
                  className="rounded-lg bg-[#0d6b66] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#0b5c58] disabled:opacity-50 transition-colors flex items-center gap-2"
                >
                  {editSubmitting && (
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
        </div>,
        document.body
      )}

      {/* Record Payment Collection Modal */}
      {paidConfirm.open && paidConfirm.payment && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in" onClick={() => setPaidConfirm({ open: false, payment: null })}>
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 border border-slate-100" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h2 className="text-lg font-bold text-slate-800">Record Collection</h2>
              <button onClick={() => setPaidConfirm({ open: false, payment: null })} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Payment Details Card */}
              <div className="bg-slate-50 border border-slate-200/60 rounded-xl p-4 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Item / Activity</span>
                    <span className="font-bold text-slate-800 text-sm">{paidConfirm.payment.item_name}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Total Amount</span>
                    <span className="font-extrabold text-[#0d6b66] text-base">
                      {formatCurrency(paidConfirm.payment.price * paidConfirm.payment.quantity)}
                    </span>
                  </div>
                </div>
                <hr className="border-slate-200/50 my-1" />
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Student:</span>
                  <span className="font-semibold text-slate-700">
                    {(selectedStudent?.students as any)?.name || selectedStudent?.username || 'Student'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Quantity:</span>
                  <span className="font-semibold text-slate-700">{paidConfirm.payment.quantity} unit(s)</span>
                </div>
              </div>

              {/* Payment Modality Selector */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Select Modality</label>
                <div className="grid grid-cols-2 gap-4">
                  {/* Cash Option */}
                  <div
                    onClick={() => setModalPaid('cash')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      modalPaid === 'cash'
                        ? 'border-emerald-600 bg-emerald-500/10 dark:border-emerald-500 dark:bg-emerald-500/20 ring-1 ring-emerald-600/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      modalPaid === 'cash' 
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-bold ${modalPaid === 'cash' ? 'text-emerald-700 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-300'}`}>Cash</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Physical Tender</span>
                  </div>

                  {/* GCash Option */}
                  <div
                    onClick={() => setModalPaid('gcash')}
                    className={`flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                      modalPaid === 'gcash'
                        ? 'border-blue-600 bg-blue-500/10 dark:border-blue-500 dark:bg-blue-500/20 ring-1 ring-blue-600/10'
                        : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 bg-white dark:bg-slate-950'
                    }`}
                  >
                    <div className={`h-10 w-10 rounded-full flex items-center justify-center mb-2 transition-colors ${
                      modalPaid === 'gcash' 
                        ? 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400' 
                        : 'bg-slate-100 text-slate-500 dark:bg-slate-900 dark:text-slate-400'
                    }`}>
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <span className={`text-sm font-bold ${modalPaid === 'gcash' ? 'text-blue-700 dark:text-blue-400' : 'text-slate-700 dark:text-slate-300'}`}>GCash</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">Mobile E-Wallet</span>
                  </div>
                </div>
              </div>

              {/* Authorization Banner */}
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  currentUserProfile?.type === 'officer' ? 'bg-teal-100 text-teal-800' : 'bg-slate-200 text-slate-700'
                }`}>
                  {currentUserProfile?.username?.substring(0, 2).toUpperCase() || 'AD'}
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide block">Authorized By</span>
                  <span className="text-xs font-bold text-slate-800">
                    {currentUserProfile?.type === 'officer' 
                      ? `Officer: ${currentUserProfile.username}` 
                      : `Admin: ${currentUserProfile?.username || 'System Admin'} (Officers: NULL)`
                    }
                  </span>
                </div>
              </div>

              {/* Recipient Verification Checkbox */}
              <div className="flex items-start gap-3 p-3 bg-amber-50/50 border border-amber-200 rounded-lg">
                <input
                  type="checkbox"
                  id="confirmRecipientCheck"
                  checked={confirmRecipient}
                  onChange={e => setConfirmRecipient(e.target.checked)}
                  className="h-4.5 w-4.5 rounded border-amber-300 text-[#0d6b66] focus:ring-[#0d6b66] mt-0.5 cursor-pointer"
                />
                <label htmlFor="confirmRecipientCheck" className="text-xs font-semibold text-amber-800 cursor-pointer select-none leading-relaxed">
                  I confirm that this payment of {formatCurrency(paidConfirm.payment.price * paidConfirm.payment.quantity)} is indeed being recorded for student: <span className="font-bold underline">{(selectedStudent?.students as any)?.name || selectedStudent?.username}</span>.
                </label>
              </div>

              {/* Actions */}
              <div className="flex w-full gap-3 pt-2">
                <button
                  onClick={() => setPaidConfirm({ open: false, payment: null })}
                  disabled={actionLoading}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleMarkPaid}
                  disabled={actionLoading || !confirmRecipient}
                  className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Recording...
                    </>
                  ) : (
                    'Confirm & Record'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        onClose={() => setDeleteConfirm({ open: false, payment: null })}
        onConfirm={handleDeletePayment}
        title="Delete Dues Entry"
        message={`Are you sure you want to delete outstanding due "${deleteConfirm.payment?.item_name}"? This removes the entry from the student's ledger. This action is irreversible.`}
        confirmLabel="Delete"
        variant="danger"
        loading={actionLoading}
      />

      {printModalOpen && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 animate-in fade-in">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl mx-4 animate-in zoom-in-95">
            <div className="flex flex-col items-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-teal-50 text-[#0d6b66] border border-teal-100 mb-4">
                <Printer className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Print Report Options</h3>
              <p className="text-sm text-slate-500 text-center mb-5">Configure the report scope and preparer signatory before printing.</p>
              
              <div className="w-full space-y-4 mb-6">
                {/* Scope Selection */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Report Scope</label>
                  <select
                    value={printScope}
                    onChange={(e) => setPrintScope(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 focus:border-[#0d6b66] focus:ring-1 focus:ring-[#0d6b66] outline-none"
                  >
                    <option value="all">All Activities & Events</option>
                    {(activeTab === 'outside' ? outsideActivitiesList : activitiesList).map(actName => (
                      <option key={actName} value={actName}>{actName}</option>
                    ))}
                  </select>
                </div>

                {/* Signatory Selection */}
                <div className="text-left">
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wide mb-1.5">Prepared By Signatory</label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPrintSignatory('treasurer')}
                      className={`rounded-lg py-2.5 text-xs font-semibold border transition-all ${
                        printSignatory === 'treasurer'
                          ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Treasurer
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintSignatory('asst-treasurer')}
                      className={`rounded-lg py-2.5 text-xs font-semibold border transition-all ${
                        printSignatory === 'asst-treasurer'
                          ? 'border-[#0d6b66] bg-teal-50 text-[#0d6b66] font-bold'
                          : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Asst. Treasurer
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setPrintModalOpen(false)}
                  className="flex-1 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (document.activeElement instanceof HTMLElement) {
                      document.activeElement.blur();
                    }
                    setPrintModalOpen(false);
                    setTimeout(() => {
                      if (activeTab === 'outside') {
                        handlePrintOutsideActivityLedger(printSignatory, printScope);
                      } else {
                        handlePrintActivityLedger(printSignatory, printScope);
                      }
                    }, 50);
                  }}
                  className="flex-1 rounded-lg bg-[#0d6b66] hover:bg-[#0b5c58] text-white px-4 py-2.5 text-sm font-bold shadow-sm transition-colors"
                >
                  {/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ? 'Download PDF' : 'Print Report'}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminPayments;
