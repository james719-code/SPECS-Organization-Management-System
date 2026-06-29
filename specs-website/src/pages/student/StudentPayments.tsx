import React, { useState, useEffect } from 'react';
import { api } from '../../shared/api';
import { formatCurrency } from '../../shared/formatters';
import EmptyState from '../../components/ui/EmptyState';
import { SkeletonTable } from '../../components/ui/SkeletonLoader';
import { useToast } from '../../components/ui/Toast';
import { account, databases } from '../../shared/appwrite';
import { DATABASE_ID, COLLECTION_ID_ACCOUNTS } from '../../shared/constants';
import type { PaymentDoc } from '../../types/database';

const StudentPayments: React.FC = () => {
  const [payments, setPayments] = useState<PaymentDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  const loadPayments = async () => {
    try {
      setLoading(true);
      const user = await account.get();
      
      // Get student profile ID
      const accountDoc = await databases.getDocument(DATABASE_ID, COLLECTION_ID_ACCOUNTS, user.$id);
      const studentId = accountDoc.students?.$id || accountDoc.students;
      
      if (!studentId) {
        setLoading(false);
        return;
      }

      const res = await api.payments.listForStudent(studentId);
      setPayments(res.documents);

    } catch (err: any) {
      console.error('Failed to load student transaction history:', err);
      addToast({ type: 'error', title: 'Error', message: err.message || 'Failed to load transaction history.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPayments();
  }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Transaction History</h1>
        <p className="text-sm text-slate-500 mt-1">Overview of your payments, collections, and dues.</p>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={5} />
      ) : payments.length === 0 ? (
        <EmptyState
          title="No Payment Logs Found"
          description="You do not have any pending dues or collected payment entries."
        />
      ) : (
        <div className="space-y-4">
          {/* Desktop Table View */}
          <div className="hidden sm:block rounded-xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-slate-700">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Item / Event</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-center">Status</th>
                    <th className="px-6 py-3 text-right">Method</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {payments.map(payment => {
                    const date = payment.date_paid && payment.date_paid !== new Date(0).toISOString()
                      ? new Date(payment.date_paid).toLocaleDateString()
                      : new Date(payment.$createdAt).toLocaleDateString();

                    return (
                      <tr key={payment.$id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-6 py-3.5 text-xs text-slate-400 font-mono">{date}</td>
                        <td className="px-6 py-3.5">
                          <span className="font-bold text-slate-900 block">{payment.item_name}</span>
                          {payment.is_event && (
                            <span className="text-[10px] font-semibold text-slate-400 uppercase mt-0.5 inline-flex items-center gap-1">
                              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                              Event Linked
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right font-bold text-slate-805">
                          {formatCurrency((payment.price || 0) * (payment.quantity || 1))}
                        </td>
                        <td className="px-6 py-3.5 text-center">
                          {payment.is_paid ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                              Paid
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                              Pending
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3.5 text-right text-xs text-slate-450">
                          {payment.is_paid ? (payment.modal_paid || 'Collected by Staff') : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile Card list view */}
          <div className="block sm:hidden space-y-3">
            {payments.map(payment => {
              const date = payment.date_paid && payment.date_paid !== new Date(0).toISOString()
                ? new Date(payment.date_paid).toLocaleDateString()
                : new Date(payment.$createdAt).toLocaleDateString();

              return (
                <div key={payment.$id} className="rounded-xl border border-slate-200 bg-white p-4 space-y-3 shadow-xs">
                  <div className="flex justify-between items-start gap-3 border-b pb-2">
                    <h3 className="font-bold text-slate-800 text-sm">{payment.item_name}</h3>
                    {payment.is_paid ? (
                      <span className="inline-flex items-center rounded-full bg-emerald-50 border border-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-full bg-amber-50 border border-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                        Pending
                      </span>
                    )}
                  </div>
                  <div className="space-y-1.5 text-xs">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Date:</span>
                      <span className="font-medium text-slate-800">{date}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Total Amount:</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency((payment.price || 0) * (payment.quantity || 1))}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Method:</span>
                      <span className="font-medium text-slate-800">
                        {payment.is_paid ? (payment.modal_paid || 'Staff') : '-'}
                      </span>
                    </div>
                    {payment.is_event && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Type:</span>
                        <span className="font-medium text-slate-800 inline-flex items-center gap-1">
                          <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          Event Linked
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentPayments;
