import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, Lock, FileText, Mail, ArrowLeft, Eye, UserCheck, Database, Scale, Users, Check, MapPin } from 'lucide-react';
import { usePageMeta } from '../shared/seo';

interface PrivacyPolicyPageProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const SECTIONS = [
  { id: 'introduction', label: 'Introduction', icon: <FileText className="h-4 w-4" /> },
  { id: 'legal-basis', label: 'Legal Basis', icon: <Scale className="h-4 w-4" /> },
  { id: 'data-collected', label: 'Data Collected', icon: <Database className="h-4 w-4" /> },
  { id: 'purpose', label: 'Purpose of Collection', icon: <Eye className="h-4 w-4" /> },
  { id: 'access-security', label: 'Access & Security', icon: <Lock className="h-4 w-4" /> },
  { id: 'retention', label: 'Data Retention', icon: <FileText className="h-4 w-4" /> },
  { id: 'user-rights', label: 'Your Rights', icon: <UserCheck className="h-4 w-4" /> },
  { id: 'contact', label: 'Contact & Complaints', icon: <Mail className="h-4 w-4" /> },
];

const PrivacyPolicyPage: React.FC<PrivacyPolicyPageProps> = ({ theme, toggleTheme }) => {
  usePageMeta({
    title: 'Privacy Policy',
    description: 'Learn how SPECS collects, processes, and protects your personal data in compliance with the Philippines Data Privacy Act of 2012 (RA 10173) and the SPECS Constitution.',
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
            <span className="text-lg font-extrabold tracking-tight text-slate-900 dark:text-white leading-none">Privacy Policy</span>
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
          <aside className="lg:col-span-3 sticky top-[72px] lg:top-28 z-20 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-md lg:bg-transparent lg:backdrop-blur-none -mx-6 px-6 lg:mx-0 lg:px-0 py-3 lg:py-0 border-b border-slate-200/40 dark:border-slate-800/40 lg:border-b-0">
            <nav className="flex lg:flex-col overflow-x-auto lg:overflow-x-visible pb-1 lg:pb-0 gap-2 lg:gap-1 scrollbar-none">
              <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 px-3 hidden lg:block">
                On This Page
              </h4>
              {SECTIONS.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-[#0d6b66] dark:hover:text-teal-400 hover:bg-teal-50 dark:hover:bg-teal-950/20 transition-all group whitespace-nowrap bg-white dark:bg-slate-900 border border-slate-200/40 dark:border-slate-800/40 lg:bg-transparent lg:border-none flex-shrink-0"
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
                  <ShieldCheck className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#0d6b66] dark:text-teal-400">
                  Last Updated: July 2026
                </span>
              </div>
              <h1 className="text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight mb-4">
                Privacy Policy
              </h1>
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl">
                This Privacy Policy explains how the <strong className="text-slate-900 dark:text-white">Society of Programmers and Enthusiasts in Computer Science (SPECS)</strong> —
                the official student organization of the Bachelor of Science in Computer Science program at the College of Engineering
                and Computational Sciences, Partido State University, Goa Campus, Camarines Sur, Philippines — collects, uses,
                discloses, and protects your personal information when you use the SPECS Portal.
              </p>
            </div>

            {/* Section: Introduction */}
            <section id="introduction" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Introduction
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  SPECS is committed to protecting the privacy and security of your personal data. This policy outlines our
                  data handling practices in accordance with applicable Philippine laws and our organizational constitution.
                </p>
                <p>
                  By registering for and using the SPECS Portal, you acknowledge that you have read and understood this Privacy
                  Policy and agree to the collection and processing of your personal data as described herein. If you do not
                  agree with any part of this policy, you must discontinue use of the portal immediately.
                </p>
                <p>
                  This policy applies to all registered members — students, officers, volunteers, and administrators — who
                  interact with the SPECS Portal and its associated services.
                </p>
              </div>
            </section>

            {/* Section: Legal Basis */}
            <section id="legal-basis" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Legal Basis
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  Our data collection and processing practices are governed by the following legal and organizational frameworks:
                </p>
                <ul className="space-y-2.5 list-disc pl-5">
                  <li>
                    <strong className="text-slate-800 dark:text-slate-200">Republic Act No. 10173</strong> — The
                    Data Privacy Act of 2012 (Philippines), which protects individual personal data in information and
                    communications systems in the government and private sector.
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-slate-200">Article XI of the SPECS Constitution (Revised 2025)</strong> —
                    The Data Confidentiality provisions that specifically govern the collection, use, storage, and access
                    restrictions of member data within the organization.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section: Data Collected */}
            <section id="data-collected" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Personal Data We Collect
              </h2>
              <div className="space-y-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  In the course of providing our membership administration services, SPECS collects and processes the
                  following categories of personal information:
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                      Identity & Contact Data
                    </h4>
                    <ul className="space-y-1.5 text-xs list-disc pl-4">
                      <li>Full legal name</li>
                      <li>University-issued email address (@parsu.edu.ph)</li>
                      <li>Student ID number</li>
                      <li>Complete residential address</li>
                      <li>Contact number</li>
                    </ul>
                  </div>
                  <div className="rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-5">
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-2 uppercase tracking-wider">
                      Portal Usage Data
                    </h4>
                    <ul className="space-y-1.5 text-xs list-disc pl-4">
                      <li>Event attendance records</li>
                      <li>Membership dues & payment history</li>
                      <li>Login sessions & activity timestamps</li>
                      <li>Volunteer registration status</li>
                      <li>Submitted stories and portfolio content</li>
                    </ul>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Purpose of Collection */}
            <section id="purpose" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Purpose of Collection
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  In accordance with <strong className="text-slate-800 dark:text-slate-200">Article XI, Section 1 of the SPECS Constitution</strong>,
                  the personal data collected through this portal is strictly used for the following purposes:
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
                  <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20 p-5 text-center">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
                      <ShieldCheck className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Emergency Purposes</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Contacting members or their emergency contacts during urgent situations affecting their welfare.
                    </p>
                  </div>
                  <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20 p-5 text-center">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
                      <Users className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">Organizational Coordination</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Managing membership records, event registrations, attendance tracking, and fee administration.
                    </p>
                  </div>
                  <div className="rounded-xl bg-teal-50/50 dark:bg-teal-950/10 border border-teal-100 dark:border-teal-900/20 p-5 text-center">
                    <div className="h-10 w-10 rounded-full bg-teal-100 dark:bg-teal-900/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center mx-auto mb-3">
                      <FileText className="h-5 w-5" />
                    </div>
                    <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">OSAS & University Reporting</h4>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                      Compliance with reportorial requirements mandated by the Office of Student Affairs and Services and the university administration.
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* Section: Access & Security */}
            <section id="access-security" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Access Control & Data Security
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  SPECS employs strict access controls and security measures to protect your personal data from
                  unauthorized access, disclosure, alteration, or destruction.
                </p>

                <div className="rounded-xl bg-amber-50 dark:bg-amber-950/10 border border-amber-100 dark:border-amber-900/20 p-5 mt-4">
                  <h4 className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-2 uppercase tracking-wider flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Restricted Access — Article XI, Sections 3–4
                  </h4>
                  <p className="text-xs text-amber-700 dark:text-amber-400 leading-relaxed">
                    Access to member personal data is <strong className="font-semibold">strictly restricted to authorized SPECS officers</strong> who
                    require the information to fulfill their organizational duties. Unauthorized disclosure, sharing, or
                    misuse of member data by any officer or member is a violation of the SPECS Constitution and will
                    result in <strong className="font-semibold">disciplinary action</strong>, up to and including removal from office or revocation
                    of membership privileges.
                  </p>
                </div>

                <div className="space-y-3 mt-4">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                    Technical Safeguards
                  </h4>
                  <ul className="space-y-2 list-disc pl-5 text-xs">
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Appwrite Cloud Backend:</strong> All data is stored
                      securely on the Appwrite Cloud platform with industry-standard encryption at rest and in transit.
                    </li>
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Role-Based Access Control (RBAC):</strong> Portal features
                      and data visibility are strictly gated by user role (student, officer, admin), ensuring members
                      can only access data they are authorized to view.
                    </li>
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">Session Security:</strong> Authentication tokens are managed
                      securely, and sessions are automatically invalidated upon logout or extended inactivity.
                    </li>
                    <li>
                      <strong className="text-slate-800 dark:text-slate-200">No Third-Party Trackers:</strong> The SPECS Portal does not
                      integrate with third-party analytics, advertising networks, or social media tracking pixels.
                    </li>
                  </ul>
                </div>
              </div>
            </section>

            {/* Section: Data Retention */}
            <section id="retention" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Data Retention
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  SPECS retains your personal data for as long as you remain an actively enrolled BSCS student and an
                  active member of the organization. Specifically:
                </p>
                <ul className="space-y-2 list-disc pl-5 text-xs">
                  <li>
                    <strong className="text-slate-800 dark:text-slate-200">Active Membership:</strong> Your data is maintained
                    throughout your period of active membership and enrollment at Partido State University.
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-slate-200">Alumni & Inactive Status:</strong> Upon graduation,
                    separation from the university, or prolonged inactive membership status, your personal data may be
                    archived or anonymized for historical record-keeping purposes, subject to applicable university
                    document retention policies.
                  </li>
                  <li>
                    <strong className="text-slate-800 dark:text-slate-200">Data Deletion Requests:</strong> You may request
                    the deletion of your personal data at any time, subject to any legal or regulatory obligations
                    that require SPECS to retain certain records.
                  </li>
                </ul>
              </div>
            </section>

            {/* Section: Your Rights */}
            <section id="user-rights" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Your Rights Under the Data Privacy Act
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  As a data subject under the Philippines Data Privacy Act of 2012 (RA 10173), you are entitled to
                  the following rights:
                </p>
                <div className="space-y-3 mt-4">
                  {[
                    { title: 'Right to Be Informed', desc: 'You have the right to know when and how your personal data is being collected and processed.' },
                    { title: 'Right to Access', desc: 'You may request access to your personal data that SPECS holds and obtain a copy thereof.' },
                    { title: 'Right to Rectification', desc: 'You may dispute any inaccuracy or error in your personal data and have it corrected immediately.' },
                    { title: 'Right to Erasure or Blocking', desc: 'You may request the removal or suspension of processing of your personal data under the conditions set forth by law.' },
                    { title: 'Right to Object', desc: 'You may object to the processing of your personal data, including processing for direct marketing, automated processing, or profiling.' },
                    { title: 'Right to Data Portability', desc: 'You may request a copy of your personal data in a commonly used electronic format for transfer to another organization.' },
                    { title: 'Right to Damages', desc: 'You may be indemnified for damages sustained due to inaccurate, incomplete, outdated, false, unlawfully obtained, or unauthorized use of your personal data.' },
                    { title: 'Right to File a Complaint', desc: 'You may file a complaint with SPECS officers or the National Privacy Commission (NPC) if you believe your data privacy rights have been violated.' },
                  ].map((right, idx) => (
                    <div
                      key={idx}
                      className="flex gap-3 rounded-xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 p-4"
                    >
                      <div className="h-6 w-6 rounded-full bg-teal-100 dark:bg-teal-900/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <Check className="h-3.5 w-3.5" />
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-800 dark:text-slate-200">{right.title}</h5>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{right.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            {/* Section: Contact */}
            <section id="contact" className="rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-8 md:p-10 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-3">
                <span className="h-8 w-1 rounded-full bg-[#0d6b66] dark:bg-teal-500" />
                Contact & Complaints
              </h2>
              <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <p>
                  If you have any questions, concerns, or complaints regarding this Privacy Policy or how your personal
                  data is being handled, you may contact us through the following channels:
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
                <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
                  You also have the right to lodge a complaint directly with the
                  <strong className="text-slate-700 dark:text-slate-300"> National Privacy Commission (NPC)</strong> of the
                  Philippines through their official website at{' '}
                  <a href="https://www.privacy.gov.ph" target="_blank" rel="noopener noreferrer" className="text-[#0d6b66] dark:text-teal-400 font-semibold hover:underline">
                    www.privacy.gov.ph
                  </a>.
                </p>
              </div>
            </section>

            {/* Footer Note */}
            <div className="text-center pt-6 pb-4 border-t border-slate-100 dark:border-slate-800">
              <p className="text-[11px] text-slate-400 dark:text-slate-500">
                This Privacy Policy may be updated from time to time. Members will be notified of any material changes
                through the portal or via their registered email address. Continued use of the SPECS Portal after such
                modifications constitutes acceptance of the revised policy.
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

export default PrivacyPolicyPage;
