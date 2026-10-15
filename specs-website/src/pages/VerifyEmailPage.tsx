import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { account } from '../shared/appwrite';
import { usePageMeta } from '../shared/seo';

const VerifyEmailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const oobCode = searchParams.get('oobCode');
  const userId = searchParams.get('userId');
  const secret = searchParams.get('secret');
  const isFirebase = import.meta.env.VITE_AUTH_PROVIDER === 'firebase';
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');

  usePageMeta({
    title: 'Verify Email',
    description: 'Verify your SPECS Portal email address.'
  });

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        if (isFirebase) {
          // Firebase uses its hosted action handler for verification. A valid
          // Firebase link is completed before the browser reaches this route.
          if (oobCode) await account.updateVerification('', oobCode);
        } else {
          if (!userId || !secret) throw new Error('This verification link is invalid or incomplete.');
          await account.updateVerification(userId, secret);
        }
        if (active) setState('success');
      } catch (verificationError: any) {
        if (!active) return;
        setError(verificationError?.message || 'The verification link may have expired or already been used.');
        setState('error');
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [isFirebase, oobCode, secret, userId]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xl">
        {state === 'loading' && (
          <>
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-[#0d6b66]" />
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Verifying your email</h1>
            <p className="mt-2 text-sm text-slate-500">Please wait while we confirm your email address.</p>
          </>
        )}

        {state === 'success' && (
          <>
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Email verified</h1>
            <p className="mt-2 text-sm text-slate-500">Your email address has been verified successfully.</p>
            <Link to="/login" className="mt-6 block rounded-xl bg-[#0d6b66] px-4 py-3 text-sm font-bold text-white">
              Continue to Sign In
            </Link>
          </>
        )}

        {state === 'error' && (
          <>
            <AlertCircle className="mx-auto h-12 w-12 text-red-500" />
            <h1 className="mt-5 text-2xl font-bold text-slate-900">Verification failed</h1>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <Link to="/login" className="mt-6 block rounded-xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700">
              Return to Sign In
            </Link>
          </>
        )}
      </div>
    </div>
  );
};

export default VerifyEmailPage;
