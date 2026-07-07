import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, ArrowLeft, Users, CreditCard, ShieldCheck, Lock, AlertTriangle,
  Copyright, RefreshCw, UserCheck, Mail, Ban, MapPin
} from 'lucide-react';
import { usePageMeta } from '../shared/seo';

interface TermsOfServicePageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const SECTIONS = [
  { id: 'acceptance', label: 'Acceptance of Terms', icon: <FileText className="h-4 w-4" /> },
  { id: 'eligibility', label: 'User Eligibility', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'fees', label: 'Fees & Obligations', icon: <CreditCard className="h-4 w-4" /> },
  { id: 'data-obligation', label: 'Data Obligation', icon: <FileText className="h-4 w-4" /> },
  { id: 'account', label: 'Account & Security', icon: <Lock className="h-4 w-4" /> },
  { id: 'conduct', label: 'Code of Conduct', icon: <ShieldCheck className="h-4 w-4" /> },
  { id: 'intellectual-property', label: 'Intellectual Property', icon: <Copyright className="h-4 w-4" /> },
  { id: 'disclaimer', label: 'Disclaimer & Liability', icon: <AlertTriangle className="h-4 w-4" /> },
  { id: 'modifications', label: 'Modifications', icon: <RefreshCw className="h-4 w-4" /> },
  { id: 'contact', label: 'Contact', icon: <Mail className="h-4 w-4" /> },
];

const TermsOfServicePage: React.FC<TermsOfServicePageProps> = ({ theme, toggleTheme }) => {
  usePageMeta({
    title: 'Terms of Service',
    description: 'Review the official terms governing the use of the SPECS Portal — membership eligibility, fees, code of conduct, and organizational obligations under the SPECS Constitution.',
  });

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md bg-white/80 dark:bg-slate-900/80 border-b border-slate-100 dark:border-slate-800 px-6 py-4 flex items-center justify-between transition-all duration-300">
        <div className="flex items-center gap-3">
          <Link to="/">
            <img src="/logo.webp" alt="SPECS Logo" className="h-10 w-10 object-contain rounded-xl shadow-md" />
          </Link>
          <div className="flex flex-col">
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">Terms of Service</span>
            <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 tracking-wider uppercase mt-0.5">SPECS Portal — Legal Disclosure</span>
          </div>
        </div>
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 px-4 py-2 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal
        </Link>
      </header>

      <div className="flex-1 max-w-6xl mx-auto w-full px-6 sm:px-12 md:px-20 py-12 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          {/* Sidebar Navigation */}
          <aside className="lg:col-span-3">
            <nav className="sticky top-28 space-y-1">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-3">
                On This Page
              </h4>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#0d6b66] dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all group"
                >
                  <span className="text-slate-400 dark:text-slate-500 group-hover:text-[#0d6b66] dark:group-hover:text-teal-400 transition-colors">
                    {section.icon}
                  </span>
                  {section.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Main Content */}
          <main className="lg:col-span-9 space-y-10 animate-fade-in">
            {/* Hero Card */}
            <div className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-teal-500/5 to-transparent rounded-bl-full pointer-events-none" />
              <div className="flex items-center gap-3 mb-4">
                <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                  <FileText className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Terms of Service
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                These Terms of Service govern your use of the <strong className="text-slate-900 dark:text-white">SPECS Portal</strong> —
                the official membership management platform of the Society of Programmers and Enthusiasts in Computer Science
                at Partido State University, Goa Campus, Camarines Sur, Philippines. By accessing or using the portal,
                you agree to be bound by these terms.
              </p>
            </div>

            {/* Section: Acceptance of Terms */}
            <section id="acceptance" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Acceptance of Terms
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  By registering for an account, logging into, or otherwise accessing the SPECS Portal, you acknowledge
                  that you have read, understood, and agree to be bound by these Terms of Service, our{' '}
                  <Link to="/privacy" className="text-[#0d6b66] dark:text-teal-400 font-semibold hover:underline">
                    Privacy Policy
                  </Link>, and all applicable provisions of the SPECS Constitution and By-Laws (Revised 2025).
                </p>
                <p>
                  If you do not agree with any of these terms, you must not register for or use the SPECS Portal.
                  Your continued use of the portal following any modifications to these terms constitutes acceptance
                  of those changes.
                </p>
              </div>
            </section>

            {/* Section: User Eligibility */}
            <section id="eligibility" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                User Eligibility
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  In accordance with <strong className="text-slate-800 dark:text-slate-200">Article II of the SPECS Constitution</strong>,
                  portal registration and membership in SPECS are open to:
                </p>
                <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20 p-5 mt-3">
                  <ul className="space-y-2 text-xs list-disc pl-4">
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Actively enrolled students</strong> of the
                      Bachelor of Science in Computer Science (BSCS) program under the College of Engineering and
                      Computational Sciences (CECS) at Partido State University.
                    </li>
                    <li>
                      Students who possess a valid <strong className="text-slate-800 dark:text-slate-200">@parsu.edu.ph</strong> institutional
                      email address and a valid university-issued student identification number.
                    </li>
                    <li>
                      Students who have not been previously banned or suspended from SPECS membership for violations
                      of the Constitution, By-Laws, or these Terms of Service.
                    </li>
                  </ul>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-2">
                  SPECS reserves the right to verify your student status with the College and the Office of Student
                  Affairs and Services (OSAS). Registration under false pretenses will result in immediate account
                  termination.
                </p>
              </div>
            </section>

            {/* Section: Fees & Obligations */}
            <section id="fees" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Membership Fees & Obligations
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  As stipulated in <strong className="text-slate-800 dark:text-slate-200">Article II, Section 2 of the SPECS Constitution</strong>,
                  the following financial obligations apply to all members:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="h-4 w-4 text-[#0d6b66] dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        One-Time Membership Fee
                      </h4>
                    </div>
                    <p className="text-2xl font-extrabold text-[#0d6b66] dark:text-teal-400 mb-1">₱50.00</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      A non-refundable membership fee payable upon joining the organization.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-[#0d6b66] dark:text-teal-400" />
                      <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                        Event Contributions
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Periodic monetary contributions may be collected for specific organizational events, activities,
                      and projects as determined by the Executive Officers and subject to organizational approval.
                    </p>
                  </div>
                </div>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 p-5 mt-4">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Consequences of Non-Compliance
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Failure to settle organization dues on time or fulfill financial obligations without valid justification
                    will result in the <strong className="font-semibold">forfeiture of active membership status</strong>.
                    Non-compliant (inactive) members shall lose their eligibility to:
                  </p>
                  <ul className="space-y-1 text-xs text-amber-700 dark:text-amber-400 list-disc pl-5 mt-2">
                    <li>Vote in organizational elections</li>
                    <li>Run for any elective office</li>
                    <li>Receive certificates of participation and recognition</li>
                    <li>Represent SPECS in official university or external events</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section: Data Obligation */}
            <section id="data-obligation" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Obligation to Provide Accurate Data
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  In accordance with <strong className="text-slate-800 dark:text-slate-200">Article II, Section 4, Item 5 of the SPECS Constitution</strong>,
                  all members are obligated to provide <strong className="text-slate-800 dark:text-slate-200">complete and accurate personal information</strong>
                  for organizational administration and OSAS compliance purposes.
                </p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5 mt-3">
                  <ul className="space-y-2 text-xs list-disc pl-4">
                    <li>
                      You agree to provide truthful, accurate, and complete information during registration and to
                      promptly update such information to keep it current.
                    </li>
                    <li>
                      Providing false, misleading, or fraudulent information constitutes a violation of these terms
                      and the SPECS Constitution and may result in immediate account suspension or termination.
                    </li>
                    <li>
                      SPECS relies on the accuracy of the data you provide for emergency contact purposes,
                      organizational coordination, and university reporting — inaccuracies in your data may
                      compromise these critical functions.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section: Account & Security */}
            <section id="account" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Account Registration & Security
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  To access the SPECS Portal, you must create an account using the following credentials:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Registration Requirements</h4>
                    <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc pl-4">
                      <li>Valid <strong className="text-slate-700 dark:text-slate-300">@parsu.edu.ph</strong> institutional email</li>
                      <li>Numeric Student ID number</li>
                      <li>Full legal name as registered with the university</li>
                      <li>A secure password (minimum 8 characters)</li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Your Responsibilities</h4>
                    <ul className="space-y-1 text-[11px] text-slate-500 dark:text-slate-400 list-disc pl-4">
                      <li>Maintain the confidentiality of your login credentials</li>
                      <li>Notify SPECS officers immediately of any unauthorized access</li>
                      <li>Log out of your account after each session on shared devices</li>
                      <li>Not share your account credentials with any other individual</li>
                    </ul>
                  </div>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-3">
                  SPECS is not liable for any loss or damage arising from your failure to comply with these security
                  obligations. You are solely responsible for all activities that occur under your account.
                </p>
              </div>
            </section>

            {/* Section: Code of Conduct */}
            <section id="conduct" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Code of Conduct
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  All users of the SPECS Portal are expected to adhere to the highest standards of ethical conduct.
                  The following activities are <strong className="text-red-600 dark:text-red-400">strictly prohibited</strong>:
                </p>
                <div className="space-y-2.5 mt-4">
                  {[
                    { icon: <Ban className="h-4 w-4" />, title: 'Unauthorized Access', desc: 'Attempting to access another member\'s account, data, or portal areas restricted to your role.' },
                    { icon: <Ban className="h-4 w-4" />, title: 'Database Manipulation', desc: 'Tampering with, modifying, or corrupting any database records, configurations, or system settings.' },
                    { icon: <Ban className="h-4 w-4" />, title: 'Spam & Disruptive Behavior', desc: 'Uploading spam, malicious content, or any material that disrupts the normal operation of the portal.' },
                    { icon: <Ban className="h-4 w-4" />, title: 'Impersonation', desc: 'Impersonating any SPECS officer, administrator, faculty member, or fellow student.' },
                    { icon: <Ban className="h-4 w-4" />, title: 'Data Scraping', desc: 'Using automated tools, scripts, or bots to scrape, harvest, or bulk-extract member data from the portal.' },
                    { icon: <Ban className="h-4 w-4" />, title: 'Unauthorized Disclosure', desc: 'Sharing, distributing, or publishing member data outside of authorized organizational channels.' },
                  ].map((item, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 rounded-xl bg-red-50/50 dark:bg-red-950/10 border border-red-100 dark:border-red-900/20 p-4"
                    >
                      <span className="text-red-500 dark:text-red-400 flex-shrink-0 mt-0.5">{item.icon}</span>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.title}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
                  Violation of any of these prohibitions may result in immediate suspension or permanent revocation
                  of portal access, disciplinary action under the SPECS Constitution, and referral to the Office of
                  Student Affairs and Services (OSAS) or relevant university authorities.
                </p>
              </div>
            </section>

            {/* Section: Intellectual Property */}
            <section id="intellectual-property" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Intellectual Property
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  All intellectual property rights in the SPECS Portal — including but not limited to its source code,
                  user interface design, graphics, logos, branding, database schema, and documentation — are owned by
                  SPECS and its authorized developers.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Portal Assets</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      The SPECS Portal's codebase is open-source and available on GitHub for educational contribution.
                      However, the SPECS name, logo, and brand identity are protected organizational assets and may not
                      be used without prior written authorization.
                    </p>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">User-Contributed Content</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                      By submitting content to the portal — including Student Spotlight stories, portfolio entries,
                      or event feedback — you grant SPECS a non-exclusive, royalty-free license to display, distribute,
                      and promote such content for organizational purposes.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Disclaimer */}
            <section id="disclaimer" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Disclaimer of Warranties & Limitation of Liability
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-700 dark:text-slate-300">Service Provided "As Is":</strong> The SPECS Portal
                    is provided on an "as is" and "as available" basis for organizational administration purposes.
                    SPECS makes no warranties, express or implied, regarding the portal's uninterrupted operation,
                    error-free performance, or fitness for a particular purpose.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-700 dark:text-slate-300">Service Availability:</strong> SPECS does not
                    guarantee that the portal will be available at all times. Scheduled maintenance, unforeseen
                    technical issues, or circumstances beyond SPECS's control may temporarily affect accessibility.
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    <strong className="text-slate-700 dark:text-slate-300">Limitation of Liability:</strong> To the fullest
                    extent permitted by Philippine law, SPECS, its officers, advisers, and Partido State University
                    shall not be liable for any indirect, incidental, special, consequential, or punitive damages
                    arising from your use of, or inability to use, the portal — including but not limited to loss
                    of data, service interruptions, or unauthorized access despite reasonable security measures.
                  </p>
                </div>
              </div>
            </section>

            {/* Section: Modifications */}
            <section id="modifications" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Modifications to Terms
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  SPECS reserves the right to modify or update these Terms of Service at any time. Changes may be made
                  to reflect updates to the SPECS Constitution, Philippine laws and regulations, or the operational
                  requirements of the portal.
                </p>
                <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20 p-5 mt-3">
                  <h4 className="text-xs font-bold text-[#0d6b66] dark:text-teal-400 mb-1.5 flex items-center gap-2">
                    <RefreshCw className="h-4 w-4" />
                    How Changes Are Communicated
                  </h4>
                  <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-400 list-disc pl-4">
                    <li>Material changes will be announced via the portal's notification system.</li>
                    <li>The "Last Updated" date at the top of this page will be revised accordingly.</li>
                    <li>For significant changes, members may receive an email notification at their registered @parsu.edu.ph address.</li>
                    <li>Continued use of the portal after modifications are posted constitutes acceptance of the revised terms.</li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section: Contact */}
            <section id="contact" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Contact Information
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  For questions, clarifications, or concerns regarding these Terms of Service, please contact us:
                </p>
                <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-6 mt-4 space-y-3">
                  <div className="flex items-center gap-3">
                    <Mail className="h-5 w-5 text-[#0d6b66] dark:text-teal-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Email</span>
                      <a href="mailto:parsu.specs@gmail.com" className="text-sm font-semibold text-[#0d6b66] dark:text-teal-400 hover:underline">
                        parsu.specs@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <svg className="h-5 w-5 text-[#0d6b66] dark:text-teal-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
                    </svg>
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Facebook</span>
                      <a href="https://www.facebook.com/parsu.specs" target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-[#0d6b66] dark:text-teal-400 hover:underline">
                        facebook.com/parsu.specs
                      </a>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MapPin className="h-5 w-5 text-[#0d6b66] dark:text-teal-400 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block">Office Address</span>
                      <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        SPECS Office, College of Engineering and Computational Sciences, Partido State University, Goa Campus, Camarines Sur, Philippines
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* Footer Note */}
            <div className="text-center pt-6 pb-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                These Terms of Service are governed by and construed in accordance with the laws of the Republic of
                the Philippines. Any disputes arising from these terms shall be subject to the jurisdiction of the
                appropriate bodies within Partido State University and the Philippine legal system.
              </p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-3">
                © {new Date().getFullYear()} Society of Programmers and Enthusiasts in Computer Science (SPECS). All Rights Reserved.
              </p>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default TermsOfServicePage;
