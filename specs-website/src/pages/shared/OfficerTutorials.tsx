import React, { useState } from 'react';
import {
  LayoutDashboard, User, CheckSquare, BookOpen, UserCheck, Users, Calendar,
  FileText, Award, Printer, CreditCard, Landmark, Mail, ScrollText,
  Bell, Settings, QrCode, ChevronRight, ExternalLink, AlertCircle
} from 'lucide-react';

type TutorialSection = 'overview' | 'students' | 'events' | 'attendance' | 'volunteers' | 'nonorg' | 'stories' | 'files' | 'tasks' | 'exports' | 'finance' | 'smtp';

interface SectionDef {
  key: TutorialSection;
  label: string;
  icon: React.ReactNode;
  description: string;
  group: string;
}

const OfficerTutorials: React.FC = () => {
  const [activeSection, setActiveSection] = useState<TutorialSection>('overview');

  const sections: SectionDef[] = [
    { key: 'overview', label: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" />, description: 'Understanding the overview page', group: 'General' },
    { key: 'students', label: 'Students', icon: <UserCheck className="h-4 w-4" />, description: 'Managing student records', group: 'Operations' },
    { key: 'events', label: 'Events', icon: <Calendar className="h-4 w-4" />, description: 'Creating and managing events', group: 'Operations' },
    { key: 'attendance', label: 'Attendance', icon: <CheckSquare className="h-4 w-4" />, description: 'Tracking event attendance', group: 'Operations' },
    { key: 'volunteers', label: 'Volunteers', icon: <Users className="h-4 w-4" />, description: 'Volunteer program management', group: 'Operations' },
    { key: 'nonorg', label: 'Non-Org Events', icon: <ScrollText className="h-4 w-4" />, description: 'External event listings', group: 'Operations' },
    { key: 'stories', label: 'Stories', icon: <Award className="h-4 w-4" />, description: 'Reviewing volunteer posts', group: 'Communication' },
    { key: 'files', label: 'Files', icon: <FileText className="h-4 w-4" />, description: 'Document management', group: 'Communication' },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="h-4 w-4" />, description: 'Task assignment & tracking', group: 'Communication' },
    { key: 'exports', label: 'File Exports', icon: <Printer className="h-4 w-4" />, description: 'Reports & PDF generation', group: 'Communication' },
    { key: 'finance', label: 'Finance', icon: <Landmark className="h-4 w-4" />, description: 'Payments & finance tracking', group: 'Financials' },
    { key: 'smtp', label: 'Email Setup', icon: <Mail className="h-4 w-4" />, description: 'SMTP email credentials', group: 'General' },
  ];

  const groups = ['General', 'Operations', 'Communication', 'Financials'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Officer Tutorials</h1>
        <p className="text-sm text-slate-500 mt-1">Comprehensive guide to every tool and feature available in the officer portal.</p>
      </div>

      {/* Section Tabs — grouped */}
      <div className="space-y-3">
        {groups.map(group => {
          const groupSections = sections.filter(s => s.group === group);
          return (
            <div key={group}>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2 px-1">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {groupSections.map(section => (
                  <button
                    key={section.key}
                    onClick={() => setActiveSection(section.key)}
                    className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition-all duration-200 ${
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
            </div>
          );
        })}
      </div>

      {/* Content Area */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 shadow-xs min-h-[400px]">
        {/* Overview */}
        {activeSection === 'overview' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0d6b66]/10 text-[#0d6b66]">
                <LayoutDashboard className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Dashboard Overview</h2>
                <p className="text-xs text-slate-500">Understanding your officer dashboard landing page</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Stats Cards</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  The dashboard displays key metrics — total members, pending verifications, upcoming events, file counts, revenue, and expenses.
                  Clicking the school year tag shows the active academic period.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Student Breakdown</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Shows all 8 BSCS sections (1A-4B) with bar charts indicating membership distribution.
                  Each bar percentage reflects the proportion of total students in that section.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Financial Summary</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Revenue vs Expenses breakdown with a net balance calculation.
                  Data is scoped to the active school year based on starting balance configuration.
                </p>
              </div>
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 space-y-2">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">SMTP Reminder</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  If your email credentials are not configured, a prominent banner appears at the top
                  of the dashboard. Set up your Google App Passkey to enable email functions.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Students */}
        {activeSection === 'students' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 dark:bg-blue-950/30 text-blue-600">
                <UserCheck className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Students Management</h2>
                <p className="text-xs text-slate-500">View, search, and manage all registered student profiles</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Student Directory</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  The Students page lists all registered SPECS members. Each row shows the student's name, student ID,
                  section, year level, and verification status. Use the search bar to filter by name or student ID.
                </p>
                <ul className="mt-3 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-[#0d6b66] mt-0.5 shrink-0" />
                    <span><strong>Profile Cards:</strong> Click any student to view their full profile, attendance history, and payment records.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-[#0d6b66] mt-0.5 shrink-0" />
                    <span><strong>Verification Status:</strong> Pending students show an amber badge — these accounts need manual verification before they can fully use the portal.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-[#0d6b66] mt-0.5 shrink-0" />
                    <span><strong>Year & Section Filters:</strong> Use the top controls to narrow down to specific year levels or sections for targeted management.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Events */}
        {activeSection === 'events' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600">
                <Calendar className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Events Manager</h2>
                <p className="text-xs text-slate-500">Create, edit, and manage organizational events</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Creating an Event</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Click <strong>"Add Event"</strong> to open the creation form. Fill in:
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Event Name*:</strong> Clear, descriptive title (e.g. "General Assembly 2026")</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Date to be Held*:</strong> The scheduled event date</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Description:</strong> Event details, agenda, or important notes</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Event Type*:</strong> Mandatory, Optional, or Special — determines how attendance is tracked</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Starting/Absent Balance:</strong> Set custom payment amounts for this specific event</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Event Lifecycle</h3>
                <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>1. Create</strong> — Add the event with all details and optional image/links.</p>
                  <p><strong>2. Active</strong> — Students can see the event on their calendar. QR check-ins are recorded.</p>
                  <p><strong>3. Archive</strong> — Toggle the <strong>Archived</strong> switch to hide it from active views. Attendance and payments remain preserved.</p>
                  <p><strong>4. End Event</strong> — Mark as <strong>Ended</strong> to close the event permanently.</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Once an event is created, its attendance system activates immediately.
                  Students will see it on their Event Calendar and can be checked in via QR code.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Attendance */}
        {activeSection === 'attendance' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 dark:bg-violet-950/30 text-violet-600">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Attendance Tracking</h2>
                <p className="text-xs text-slate-500">Record and monitor student attendance for all events</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Methods of Recording Attendance</h3>
                <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <span><strong>QR Code Scanning:</strong> Students present their QR code from My Profile → scan with attendance scanner at the venue. This is the recommended method — it's instant, tamper-proof, and leaves a digital trail.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <span><strong>Manual Entry:</strong> Officers can manually mark students as Present or Absent. Use for students without devices or when QR scanning fails. Each manual entry is logged with the officer's name.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <ChevronRight className="h-3.5 w-3.5 text-violet-500 mt-0.5 shrink-0" />
                    <span><strong>Bulk Operations:</strong> Use the "Mark All Present" or "Mark All Absent" buttons for quick batch updates during large events.</span>
                  </li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Attendance Reports</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  The attendance log view shows per-event breakdowns. Use the <strong>Export</strong> buttons
                  to download attendance data as CSV or include it in File Exports reports. The <strong>Non-Member Attendance</strong>
                  section tracks guests and external participants separately.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Volunteers */}
        {activeSection === 'volunteers' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 dark:bg-rose-950/30 text-rose-600">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Volunteers Management</h2>
                <p className="text-xs text-slate-500">Review applications, approve writers, and manage the volunteer program</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Application Workflow</h3>
                <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>1. Pending Requests</strong> — Students submit applications from their profile. You'll see them listed under the "Pending" tab.</p>
                  <p><strong>2. Review & Approve</strong> — Check the student's profile, year level, and standing. Click <strong>Approve</strong> to grant writer privileges or <strong>Reject</strong> with an optional reason.</p>
                  <p><strong>3. Active Volunteers</strong> — Approved volunteers can create story posts. Monitor their activity from the Approved tab.</p>
                  <p><strong>4. Resignations</strong> — When a volunteer requests to leave, verify their pending drafts are resolved, then approve or reject the backout.</p>
                </div>
              </div>

              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-blue-800 dark:text-blue-300">
                  <strong>Tip:</strong> Volunteers can only publish after both officer AND admin approval. Their stories
                  go through a dual-approval pipeline — you approve first, then an admin gives final publish clearance.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Non-Org Events */}
        {activeSection === 'nonorg' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 dark:bg-teal-950/30 text-teal-600">
                <ScrollText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Non-Organization Events</h2>
                <p className="text-xs text-slate-500">Manage external event listings that aren't official SPECS events</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">What Are Non-Org Events?</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  These are external events — company tech talks, university-wide seminars, inter-org competitions —
                  that SPECS members may be interested in but are not official SPECS-organized events.
                  They appear as informational listings visible to students.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Adding a Non-Org Event</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" /><span><strong>Event Name*:</strong> Official name of the external event</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" /><span><strong>Description:</strong> Brief summary of what the event is about</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" /><span><strong>Event Date:</strong> When the event takes place</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-teal-500 mt-0.5 shrink-0" /><span><strong>No. of Participants:</strong> Expected or actual participant count</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Stories */}
        {activeSection === 'stories' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30 text-amber-600">
                <Award className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Stories Management</h2>
                <p className="text-xs text-slate-500">Review, approve, and publish volunteer-written stories</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Dual-Approval Pipeline</h3>
                <div className="mt-2 space-y-3 text-xs text-slate-600 dark:text-slate-400">
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white text-[10px] font-bold">1</span>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Volunteer Submits Draft</p>
                      <p>A volunteer writer creates and submits a story. It enters the draft queue with status "Pending Officer."</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-[10px] font-bold">2</span>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Officer Review (You)</p>
                      <p>Review the content for quality, accuracy, and appropriateness. You can approve it (moves to admin queue) or send it back for revisions with notes.</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white text-[10px] font-bold">3</span>
                    <div>
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Admin Final Approval</p>
                      <p>An admin reviews the officer-approved story and publishes it to the public landing page.</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Review Tips</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" /><span>Check for grammar, spelling, and formatting quality.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" /><span>Verify that any images or links are appropriate and working.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-amber-500 mt-0.5 shrink-0" /><span>Use the rejection notes field to give constructive feedback for revision.</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Files */}
        {activeSection === 'files' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100 dark:bg-purple-950/30 text-purple-600">
                <FileText className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Document Files</h2>
                <p className="text-xs text-slate-500">Upload, organize, and share organization documents</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">File Management</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  The Files page is a centralized document repository for the organization. Upload PDFs,
                  images, spreadsheets, and other files. Each file can be categorized and tagged for easy discovery.
                  Students can access shared files through their portal.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Best Practices</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" /><span>Use descriptive filenames (e.g. "SPECS_General_Assembly_Minutes_2026-07-08.pdf").</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" /><span>Organize files into logical categories — constitution, meeting minutes, event photos, etc.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-purple-500 mt-0.5 shrink-0" /><span>Review uploaded files periodically and archive outdated documents.</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Tasks */}
        {activeSection === 'tasks' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 dark:bg-orange-950/30 text-orange-600">
                <CheckSquare className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Tasks Manager</h2>
                <p className="text-xs text-slate-500">Create, assign, and track organizational tasks</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Task Workflow</h3>
                <div className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <p><strong>1. Create Task</strong> — Give it a title, description, assignee (any officer or admin), and optional due date.</p>
                  <p><strong>2. Track Progress</strong> — Tasks move through states: To Do → In Progress → Completed. The assignee updates the status.</p>
                  <p><strong>3. Review</strong> — Completed tasks remain visible for reference. You can filter by status or assignee.</p>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 dark:text-amber-300">
                  <strong>Note:</strong> Tasks are visible across the officer team. Use them to coordinate event planning,
                  delegate responsibilities, and keep track of operational deadlines.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* File Exports */}
        {activeSection === 'exports' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 dark:bg-indigo-950/30 text-indigo-600">
                <Printer className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">File Exports & Signatories</h2>
                <p className="text-xs text-slate-500">Generate official reports with signature blocks</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Report Types</h3>
                <ul className="mt-2 space-y-2 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Narrative Report:</strong> Summary of active events with a standard events table and conclusion.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Documentation Report:</strong> Events with photo evidence columns and related links.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Rating Report:</strong> Events with rating/review link columns.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>SPECS Resolution:</strong> Custom resolution form supporting meeting excerpt details, multiple rationale (WHEREAS) clauses, resolving action items, and conformed officer grid layouts.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Activity Proposal:</strong> Structured format for planning events (including proponents, implementation specs, rationales, objectives list, dynamic budget tables, and expected outcomes).</span></li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Signatory Layout</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Each report type has its own signatory layout. Officers appear as signature lines at the bottom of reports.
                </p>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Manage Signatories:</strong> Add/edit/remove entries with Notation Line, Name, and Position fields.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Row-Based Layout:</strong> Each row has Left and Right slots — rows can be left-only, right-only, or both.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Drag & Drop:</strong> Drag signatories from the available pool into position slots. Layouts save per report type.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-indigo-500 mt-0.5 shrink-0" /><span><strong>Download PDF:</strong> Click "Download PDF" to generate a formatted A4 document with the SPECS header.</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Finance */}
        {activeSection === 'finance' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600">
                <Landmark className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Finance & Payments</h2>
                <p className="text-xs text-slate-500">Manage organizational finances, payments, and expense tracking</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Finance Summary</h3>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  The Finance Summary page provides a high-level overview with revenue, expenses, and net balance.
                  Click into line items to see detailed breakdowns. Data is scoped by school year.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-bold text-slate-800 dark:text-white">Payments Tracker</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-slate-600 dark:text-slate-400">
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Create Payments:</strong> Set up payment items with name, amount, description, and optional student assignment.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Mark as Paid:</strong> Verify student payments and toggle status from Unpaid to Paid. Include reference numbers.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Outside Payments:</strong> Record payments from non-members or external sources via the Outside Payments view.</span></li>
                  <li className="flex items-start gap-2"><ChevronRight className="h-3.5 w-3.5 text-emerald-500 mt-0.5 shrink-0" /><span><strong>Starting Balances:</strong> Configure initial balances per school year from system settings.</span></li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* SMTP Setup */}
        {activeSection === 'smtp' && (
          <div className="space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-slate-800">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 dark:bg-amber-950/30 text-amber-600">
                <Mail className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Email Setup (SMTP)</h2>
                <p className="text-xs text-slate-500">Configure your Google App Passkey to send official SPECS emails</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50">
                <h3 className="text-sm font-bold text-amber-900 dark:text-amber-200">Why This Matters</h3>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed mt-1">
                  SPECS uses your Google account to send official emails — attendance notifications, announcements,
                  payment reminders, and other communications. Without SMTP configured, the email functions are unavailable.
                </p>
              </div>

              <div className="space-y-3">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">1</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Enable 2-Step Verification</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Go to{' '}
                      <a href="https://myaccount.google.com/security" target="_blank" rel="noopener noreferrer" className="text-[#0d6b66] hover:underline font-medium inline-flex items-center gap-0.5">
                        myaccount.google.com/security <ExternalLink className="h-3 w-3" />
                      </a>
                      {' '}→ Sign in to Google → 2-Step Verification → Get Started. Follow the prompts to enable it.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">2</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Generate an App Password</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Go to{' '}
                      <a href="https://myaccount.google.com/apppasswords" target="_blank" rel="noopener noreferrer" className="text-[#0d6b66] hover:underline font-medium inline-flex items-center gap-0.5">
                        myaccount.google.com/apppasswords <ExternalLink className="h-3 w-3" />
                      </a>
                      . Select <strong>Mail</strong> as the app and <strong>Other</strong> as the device (name it "SPECS Portal").
                      Click Generate.
                    </p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#0d6b66] text-white text-xs font-bold">3</span>
                  <div>
                    <p className="font-semibold text-slate-900 dark:text-white text-sm">Enter Credentials in Your Profile</p>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Navigate to <strong>My Profile</strong> → scroll to <strong>SMTP Email Credentials</strong> → paste the
                      16-character App Password into <strong>App Passkey (Token)</strong> and your Gmail address into{' '}
                      <strong>Officer Email</strong>. Click <strong>Save SMTP Credentials</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-3 text-xs text-slate-500">
                <strong className="text-slate-700 dark:text-slate-300">Important Notes:</strong>
                <ul className="mt-1.5 space-y-1">
                  <li>• App Passwords require 2-Step Verification to be enabled first.</li>
                  <li>• The 16-character password is shown only once — save it immediately.</li>
                  <li>• If lost, simply generate a new App Password (the old one stops working).</li>
                  <li>• Use a dedicated Gmail account for organizational communications.</li>
                  <li>• All officers can configure their own SMTP — emails are sent from the configured account.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Empty state for any unhandled section */}
        {!['overview', 'students', 'events', 'attendance', 'volunteers', 'nonorg', 'stories', 'files', 'tasks', 'exports', 'finance', 'smtp'].includes(activeSection) && (
          <div className="text-center py-12 text-slate-500">
            <BookOpen className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="text-sm font-semibold">Select a tutorial topic</p>
            <p className="text-xs mt-1">Choose from the sections above to learn about each officer function.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfficerTutorials;
