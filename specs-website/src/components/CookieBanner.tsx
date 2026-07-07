import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = 'specs_cookie_consent';

const CookieBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Check if consent has already been given
    const hasConsented = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!hasConsented) {
      // Delay appearance slightly for a smooth entrance after page load
      const timer = setTimeout(() => setVisible(true), 600);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAcknowledge = () => {
    setExiting(true);
    // Wait for exit animation to complete before removing from DOM
    setTimeout(() => {
      localStorage.setItem(COOKIE_CONSENT_KEY, 'true');
      setVisible(false);
      setExiting(false);
    }, 250);
  };

  if (!visible) return null;

  return (
    <div
      className={`fixed bottom-0 left-0 right-0 z-[9998] px-4 pb-4 pointer-events-none ${
        exiting ? 'animate-fade-out' : 'animate-slide-up'
      }`}
    >
      <div className="max-w-4xl mx-auto pointer-events-auto">
        <div className="rounded-2xl bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border border-slate-200/60 dark:border-slate-800/60 shadow-2xl shadow-slate-950/10 dark:shadow-black/30 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4 transition-all duration-300">
          {/* Icon */}
          <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center flex-shrink-0">
            <Cookie className="h-5 w-5" />
          </div>

          {/* Message */}
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
              <span className="font-bold text-slate-900 dark:text-white">Cookie & Session Notice.</span>{' '}
              We use local storage and session cookies strictly for essential portal features — keeping you logged in
              and remembering your theme preference. We do not use tracking cookies, analytics, or advertising pixels.
              No personal data is ever sold or shared with third parties.{' '}
              <Link
                to="/privacy"
                className="text-[#0d6b66] dark:text-teal-400 font-semibold hover:underline whitespace-nowrap"
              >
                Privacy Policy →
              </Link>
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-shrink-0 self-end sm:self-auto">
            <button
              onClick={handleAcknowledge}
              className="rounded-xl bg-[#0d6b66] hover:bg-[#094d4a] dark:bg-teal-500 dark:hover:bg-teal-400 dark:text-slate-950 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:shadow-lg hover:-translate-y-0.5 transition-all"
            >
              Got It
            </button>
            <button
              onClick={handleAcknowledge}
              className="p-2.5 rounded-xl text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              aria-label="Dismiss cookie notice"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CookieBanner;
