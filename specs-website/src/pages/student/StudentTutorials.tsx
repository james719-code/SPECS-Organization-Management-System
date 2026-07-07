import React, { useState } from 'react';
import { BookOpen, FileText, User, PenTool, Send, Clock, CheckCircle, AlertCircle, Monitor, QrCode, CreditCard } from 'lucide-react';

type TutorialSection = 'volunteering' | 'absence' | 'portal';

const StudentTutorials: React.FC = () => {
  const [activeSection, setActiveSection] = useState<TutorialSection>('volunteering');

  const sections: { key: TutorialSection; label: string; icon: React.ReactNode; description: string }[] = [
    { key: 'volunteering', label: 'Volunteering Guide', icon: <PenTool className="h-5 w-5" />, description: 'How to become a volunteer writer' },
    { key: 'absence', label: 'Absence Letters', icon: <FileText className="h-5 w-5" />, description: 'Formal excuse letter formats' },
    { key: 'portal', label: 'Portal Usage', icon: <Monitor className="h-5 w-5" />, description: 'QR codes, payments & profile basics' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Student Tutorials</h1>
        <p className="text-sm text-slate-500 mt-1">Interactive guides to help you navigate the student portal and its features.</p>
      </div>

      {/* Section Tabs */}
      <div className="flex flex-wrap gap-2">
        {sections.map(section => (
          <button
            key={section.key}
            onClick={() => setActiveSection(section.key)}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-all duration-200 ${
              activeSection === section.key
                ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/20'
                : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
            }`}
          >
            {section.icon}
            <span className="hidden sm:inline">{section.label}</span>
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs">
        {/* Volunteering Guide */}
        {activeSection === 'volunteering' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d6b66]/10 text-[#0d6b66]">
                <PenTool className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Volunteering Guide</h2>
                <p className="text-xs text-slate-500">Become a volunteer writer and publish stories on the SPECS landing page</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-sm font-bold">1</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Apply for Writer Privileges</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Navigate to your <strong>My Profile</strong> page and scroll down to the
                    <strong> SPECS Volunteer Program</strong> section. Click the <strong>"Apply to Join"</strong> button
                    to submit your application. An officer will review your credentials and approve or reject your request.
                  </p>
                  <div className="mt-3 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2">
                    <Clock className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-800 dark:text-amber-300">
                      <strong>Note:</strong> Your application status will show "Awaiting Review" until an officer processes it.
                      You can check the progress in the Volunteer Program card at any time.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-sm font-bold">2</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Write Your Stories</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Once approved, go to <strong>My Stories</strong> to create new posts. Each story can include:
                  </p>
                  <ul className="mt-2 space-y-1.5 text-sm text-slate-600 dark:text-slate-400">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      A title and detailed description
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      An optional cover image (upload from your device)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                      Related links and supporting materials
                    </li>
                  </ul>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-sm font-bold">3</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Get Officer & Admin Approvals</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    Stories go through a <strong>dual-approval workflow</strong>:
                  </p>
                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg">
                      <p className="text-xs font-bold text-blue-800 dark:text-blue-300">Step A: Officer Approval</p>
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                        An officer reviews and approves your story. Once approved, it moves to the admin queue.
                      </p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-lg">
                      <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Step B: Admin Approval</p>
                      <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                        An admin gives final approval and publishes the story to the public landing page.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-sm font-bold">4</div>
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 dark:text-white">Leaving the Volunteer Program</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-400 mt-1 leading-relaxed">
                    If you wish to leave, click <strong>"Leave Volunteer Program"</strong> from your profile.
                    Your request will be reviewed by an officer who will verify any pending drafts before approving your exit.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Absence Letters */}
        {activeSection === 'absence' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30 text-amber-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Absence Letters</h2>
                <p className="text-xs text-slate-500">Formats and procedures for formal excuse letters</p>
              </div>
            </div>

            <div className="space-y-5">
              <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                When you miss a mandatory SPECS event, you are required to submit a formal
                <strong> Excuse Letter</strong> or <strong>Absence Letter</strong>. Below are the standard formats
                accepted by the organization.
              </p>

              {/* Template 1 */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Format A: Standard Excuse Letter</h3>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
{`[Date]

To: SPECS Officers
    Universidad de Manila

Dear SPECS Officers,

I, [Your Full Name], a [Year Level] BS Computer Science student
with Student ID [Your Student ID], respectfully write to explain
my absence from the mandatory event, "[Event Name]," held on
[Event Date].

[Explain your reason in 2-3 sentences. Be honest and specific.]

I understand the importance of attending organizational events
and assure you of my commitment going forward. Attached are any
supporting documents for your reference.

Respectfully yours,

_________________________
[Your Signature over Printed Name]
[Your Section]
[Contact Number]`}
                </pre>
              </div>

              {/* Template 2 */}
              <div className="border border-slate-200 dark:border-slate-700 rounded-xl p-5 bg-slate-50 dark:bg-slate-800/50 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Format B: Medical Excuse</h3>
                <pre className="text-xs text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-700 whitespace-pre-wrap font-mono leading-relaxed">
{`[Date]

To: SPECS Officers
    Universidad de Manila

Dear SPECS Officers,

I, [Your Full Name], a [Year Level] BS Computer Science student
with Student ID [Your Student ID], was unable to attend the
mandatory event, "[Event Name]," on [Event Date] due to a medical
reason.

I experienced [briefly describe illness/condition] and was
advised to rest. I have attached a medical certificate from my
attending physician for your verification.

I sincerely apologize for my absence and will make every effort
to stay updated on any matters discussed during the event.

Thank you for your understanding.

Respectfully yours,

_________________________
[Your Signature over Printed Name]
[Your Section]
[Contact Number]`}
                </pre>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Submission Instructions:</strong> Print and sign the letter, then submit it to a SPECS Officer.
                  You may also email a scanned copy if pre-arranged. Keep a copy for your records.
                  Failure to submit an excuse letter within 5 school days may result in attendance penalties.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Portal Usage */}
        {activeSection === 'portal' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/30 text-purple-600">
                <Monitor className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Portal Usage</h2>
                <p className="text-xs text-slate-500">Basic walkthrough of QR codes, payments tracker, and profiles</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* QR Code Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0d6b66]/10 text-[#0d6b66]">
                  <QrCode className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">QR Code Check-In</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Your profile page contains a unique QR code. Present this to the attendance scanner
                    at every SPECS event to record your participation. Tap the QR code to enlarge it for
                    easier scanning.
                  </p>
                  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400">
                    <strong>Tip:</strong> Save a screenshot of your QR code for offline access when connectivity is limited.
                  </div>
                </div>
              </div>

              {/* Payments Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600">
                  <CreditCard className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Payments Tracker</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Monitor your dues, event fees, and other payments from the <strong>My Payments</strong> page.
                    Each payment entry shows the item name, amount, date, and status (Paid / Unpaid).
                    Officers verify payments and mark them as paid.
                  </p>
                  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400">
                    <strong>Tip:</strong> Check your payments regularly to avoid missing deadlines for organizational dues.
                  </div>
                </div>
              </div>

              {/* Profile Card */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-950/30 text-blue-600">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 dark:text-white text-sm">Profile Management</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                    Keep your profile up to date from <strong>My Profile</strong>. You can edit your name,
                    section, year level, and address. You can also update your username and password from
                    the Account Credentials section.
                  </p>
                  <div className="mt-3 p-2 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] text-slate-500 dark:text-slate-400">
                    <strong>Tip:</strong> Use a strong password and update it periodically for security.
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-5 space-y-3">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Event Calendar & Attendance</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                <div className="space-y-2">
                  <p><strong>Event Calendar:</strong> View all upcoming and past SPECS events. Each event card shows the name,
                  date, location, and description. Click to view full details including collaborators, related links,
                  and event highlights.</p>
                </div>
                <div className="space-y-2">
                  <p><strong>My Attendance:</strong> Track your attendance history. Each record is linked to a specific
                  event. Your check-ins via QR code scanning are automatically recorded here. Non-check-in attendance
                  may be added by officers manually.</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentTutorials;
