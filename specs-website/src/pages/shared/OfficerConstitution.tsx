import React, { useState } from 'react';
import { 
  Users, Key, ShieldCheck, AlertTriangle, RefreshCw, FileText, 
  HelpCircle, UserCheck, Scale, Award, Info, Lock, ChevronRight, Check
} from 'lucide-react';

const OfficerConstitution: React.FC = () => {
  const [selectedRole, setSelectedRole] = useState<string>('president');
  const [activeTab, setActiveTab] = useState<'powers' | 'rules' | 'succession'>('powers');

  const officerRoles = [
    { id: 'president', name: 'President', duties: [
      'Call and preside over all the meetings of the organization.',
      'Present and enforce decisions taken by the organization.',
      'Impose discipline during the meeting.',
      'Break a tie in case of a deadlock.',
      'Implement the rules and regulations of the organization.'
    ]},
    { id: 'vp-internal', name: 'VP for Internal Affairs', duties: [
      'Help the president implement the rules and regulations.',
      'Act as the presiding officer in the absence of the president.',
      'Help the president in all matters, whatever assistance is needed.',
      'Oversee and manage internal operations, policies, and procedures.'
    ]},
    { id: 'vp-external', name: 'VP for External Affairs', duties: [
      'Manage the external matters, communication, collaboration, and partnership.',
      'Represent external events and shape the image and reputation of the organization.',
      'Help the president implement the rules and regulations.',
      'Help the president in all matters, whatever assistance is needed.'
    ]},
    { id: 'secretary', name: 'Executive Secretary', duties: [
      'Call the roll at each meeting of the organization.',
      'Take down notes, keep records of the minutes, and prepare pertinent papers.',
      'Write the agenda and itinerary of the business.',
      'Manage schedules, appointments, and incoming and outgoing communications.'
    ]},
    { id: 'asst-secretary', name: 'Assistant Secretary', duties: [
      'Help the Executive Secretary with whatever assistance is needed.',
      'Help manage tasks, organize meetings, handle documents, and keep records.',
      'Call the roll at each meeting of the organization.'
    ]},
    { id: 'treasurer', name: 'Treasurer', duties: [
      'Disburse funds by the president, adviser, and other signatories.',
      'Make a financial report to be submitted to the SPECS officers during meetings.',
      'Shall keep an active log book of all the collections.'
    ]},
    { id: 'asst-treasurer', name: 'Assistant Treasurer', duties: [
      'Assist the Treasurer in managing organizational funds.',
      'Prepare and organize financial reports, budgets, and monetary records.',
      'Act as acting Treasurer in the Treasurer\'s absence.',
      'Ensure all receipts, disbursements, and collections are properly documented and verified.'
    ]},
    { id: 'auditor', name: 'Auditor', duties: [
      'Audit all the financial transactions of the organization.',
      'Maintain the financial record of the organization.',
      'Maintain an independent review and examination of the financial record.',
      'Verify, record, and document all transactions before funds are deposited.'
    ]},
    { id: 'pio', name: 'Public Information Officer', duties: [
      'Make announcements approved by the president.',
      'Inform SPECS officers of the time and place of the meeting.',
      'Coordinate with the official publication of the department.',
      'Coordinate with the OSAS with respect to activities inside and outside the campus.'
    ]},
    { id: 'business-managers', name: 'Business Managers', duties: [
      'Make the financial and the business of the club.',
      'Prepare the budget of the ACSEs and act as the custodian of the organization.'
    ]},
    { id: 'sergeant-arms', name: 'Sergeant at Arms', duties: [
      'Administer punishment to the offender.',
      'In charge of the orderliness of the meeting or activities.'
    ]},
    { id: 'representatives', name: 'Representatives', duties: [
      'Coordinate with classmates with respect to the SPECS plan and activities.',
      'Help the P.I.O. coordinate outside, in line with the welfare of the society.',
      'Collect all membership fees, event payments, and other contributions from respective classes.',
      'Remit collections directly to the Treasurer or, if unavailable, the Assistant Treasurer.'
    ]},
    { id: 'publicity-committee', name: 'Publicity & Media Committee', duties: [
      'Oversees and enhances SPECS\' public presence across all online and offline platforms.',
      'Manages the organization\'s official social media platforms.',
      'Reviews and approves publication materials for accuracy and OSAS compliance.',
      'Consists of: Public Relations Officer (drafts text), Creative Media Officer (designs visual assets), and Documentation Officer (captures & archives activities).'
    ]},
    { id: 'sports-committee', name: 'Sports Committee', duties: [
      'Coordinator of event planning related to sports events.',
      'Develop and enforce rules and regulations governing sports activities to ensure fair play.'
    ]},
    { id: 'adviser', name: 'Organization Adviser', duties: [
      'Help the officers in whatever endeavors and projects are to be done.',
      'See to it that the objectives of the organization are promulgated and achieved.'
    ]}
  ];

  const currentRoleInfo = officerRoles.find(r => r.id === selectedRole) || officerRoles[0];

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Officer Handbook & By-Laws</h1>
          <p className="text-sm text-slate-500 mt-1">
            Reference guide for SPECS Officers & Administration on powers, financial policies, accountability, and succession.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0d6b66]/10 dark:bg-teal-500/10 px-3 py-1.5 rounded-xl border border-[#0d6b66]/20 dark:border-teal-500/20 text-xs font-semibold text-[#0d6b66] dark:text-teal-400">
          <Scale className="h-4 w-4" />
          <span>Officer Mandate (2025 Revision)</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveTab('powers')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'powers' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <UserCheck className="h-4 w-4" />
          Officer Powers & Functions
        </button>
        <button
          onClick={() => setActiveTab('rules')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'rules' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Key className="h-4 w-4" />
          Financial & Admin Rules
        </button>
        <button
          onClick={() => setActiveTab('succession')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeTab === 'succession' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <RefreshCw className="h-4 w-4" />
          Succession & Accountability
        </button>
      </div>

      {/* Tab Contents */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start mt-6">
        
        {/* TAB 1: POWERS & FUNCTIONS OF OFFICERS */}
        {activeTab === 'powers' && (
          <>
            {/* Sidebar list of roles */}
            <div className="md:col-span-4 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-4 shadow-sm space-y-1">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest px-3 block mb-2">Select Officer Role</span>
              {officerRoles.map(role => (
                <button
                  key={role.id}
                  onClick={() => setSelectedRole(role.id)}
                  className={`w-full text-left px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                    selectedRole === role.id 
                      ? 'bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400' 
                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>

            {/* Detailed duties card */}
            <div className="md:col-span-8 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4 animate-fade-in">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">{currentRoleInfo.name}</h3>
                  <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Article VI, Section 1 Duties</span>
                </div>
              </div>
              <ul className="space-y-3">
                {currentRoleInfo.duties.map((duty, idx) => (
                  <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-350 leading-relaxed">
                    <span className="h-5 w-5 shrink-0 rounded-full bg-teal-50 dark:bg-teal-950/30 text-[#0d6b66] dark:text-teal-400 font-bold flex items-center justify-center text-[10px]">
                      {idx + 1}
                    </span>
                    <span className="pt-0.5">{duty}</span>
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* TAB 2: FINANCIAL & ADMIN SIGNATURE RULES */}
        {activeTab === 'rules' && (
          <div className="md:col-span-12 space-y-6">
            
            {/* Signing Officials (Article V) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
              <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
                <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                  <Key className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Signing Officials & Fund Controls</h3>
                  <p className="text-xs text-slate-400">Article V, Section 1 Rules</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-2 flex items-center gap-2">
                      <Scale className="h-4 w-4 text-[#0d6b66] dark:text-teal-400 shrink-0" />
                      Withdrawal of Society Funds
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      Withdrawal of any society funds from the repository/bank accounts requires precisely <strong className="font-bold text-slate-800 dark:text-slate-205">three (3) signatures</strong>:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400">Treasurer OR Secretary</span>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400">President OR Vice-President</span>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-350">Organization Adviser (Notation)</span>
                    </div>
                  </div>

                  <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-bold text-slate-850 dark:text-slate-200 mb-2 flex items-center gap-2">
                      <FileText className="h-4 w-4 text-[#0d6b66] dark:text-teal-400 shrink-0" />
                      Committing Society Actions
                    </h4>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mb-3">
                      Any document committing the society to an official plan of action requires <strong className="font-bold text-slate-800 dark:text-slate-205">two (2) signatures</strong>:
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400">Authorized Member (Advisor authorization)</span>
                      <span className="text-[10px] font-semibold px-2 py-1 rounded bg-[#0d6b66]/10 text-[#0d6b66] dark:bg-teal-500/10 dark:text-teal-400">President OR Vice-Presidents</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Integrity rule */}
                  <div className="p-4 rounded-xl bg-rose-500/5 border border-rose-500/10 text-rose-800 dark:text-rose-300">
                    <div className="flex items-center gap-2 mb-2">
                      <ShieldCheck className="h-4 w-4 text-rose-600 dark:text-rose-450 shrink-0" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">Anti-Collusion Integrity Clause</h4>
                    </div>
                    <p className="text-xs leading-relaxed opacity-95">
                      <strong>Section 1.C:</strong> Signing society members shall not be related by marriage, blood, or cohabitation. This ensures strict, unbiased handling of organization resources and absolute financial audit safety.
                    </p>
                  </div>

                  {/* Data security */}
                  <div className="p-4 rounded-xl bg-blue-500/5 border border-blue-500/10 text-blue-800 dark:text-blue-300">
                    <div className="flex items-center gap-2 mb-2">
                      <Lock className="h-4 w-4 text-blue-600 dark:text-blue-400 shrink-0" />
                      <h4 className="text-xs font-extrabold uppercase tracking-wider">Member Data Security (Article XI)</h4>
                    </div>
                    <p className="text-xs leading-relaxed opacity-95">
                      As officers, you have restricted access to student details. Unauthorized disclosure, sharing, or misuse of member data without written consent or OSAS approval is strictly prohibited and leads to immediate impeachment/disciplinary action.
                    </p>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}

        {/* TAB 3: SUCCESSION, ACCOUNTABILITY & IMPEACHMENT */}
        {activeTab === 'succession' && (
          <div className="md:col-span-12 space-y-6 animate-fade-in">
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* Succession Procedure (Article VII) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                    <RefreshCw className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Vacancies & Successions</h3>
                    <p className="text-xs text-slate-400">Article VII Procedures</p>
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1 hover:border-[#0d6b66] dark:hover:border-teal-500 transition-colors">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">President Vacancy (Sec 1)</h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                      In case of permanent vacancy (incapacity, death, resignation, failure to qualify), the <strong>Vice-President</strong> shall assume the presidency.
                    </p>
                  </div>
                  
                  <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1 hover:border-[#0d6b66] dark:hover:border-teal-500 transition-colors">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">VP/Secretary Vacancy (Sec 2)</h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                      If a permanent vacancy arises in these roles, the unexpired term is filled as needed by designated next-in-line roles.
                    </p>
                  </div>
                  
                  <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1 hover:border-[#0d6b66] dark:hover:border-teal-500 transition-colors">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Other Roles (Sec 3)</h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                      For vacancies in other offices, the <strong>Adviser</strong> appoints a replacement upon recommendation of the active officers.
                    </p>
                  </div>
                  
                  <div className="border-l-2 border-slate-200 dark:border-slate-800 pl-4 py-1 hover:border-[#0d6b66] dark:hover:border-teal-500 transition-colors">
                    <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-200">Temporary Incapacity (Sec 4)</h4>
                    <p className="text-[11px] text-slate-550 dark:text-slate-400 mt-1 leading-relaxed">
                      If the President is temporarily incapacitated, the Vice-President executes duties <em>except</em> the power to appoint, suspend, or dismiss officers.
                    </p>
                  </div>
                </div>
              </div>

              {/* Accountability & Impeachment (Article VIII) */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <AlertTriangle className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Accountability & Impeachment</h3>
                    <p className="text-xs text-slate-400">Article VIII Rules</p>
                  </div>
                </div>

                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  Officers serve as a special trust of the organization. Any officer can be impeached by a <strong>2/3 vote of the general SPECS membership</strong>.
                </p>

                <div className="p-4 bg-rose-500/5 border border-rose-500/10 rounded-xl">
                  <h4 className="text-xs font-bold text-rose-800 dark:text-rose-400 mb-2.5">Grounds for Impeachment:</h4>
                  <ul className="space-y-2 text-xs text-slate-650 dark:text-slate-400 leading-normal">
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>Disloyalty to the organization.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>Dishonesty, oppression, misconduct in office, or neglect of duties.</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <ChevronRight className="h-3 w-3 text-rose-500 shrink-0" />
                      <span>Unauthorized absence from three (3) consecutive meetings.</span>
                    </li>
                  </ul>
                </div>
              </div>

            </div>

            {/* Amendments rigidity note */}
            <div className="p-5 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200/60 dark:border-slate-800/80 flex items-start gap-3">
              <Info className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h4 className="text-xs font-extrabold text-slate-800 dark:text-slate-205 uppercase tracking-wider">Article IX. Amendment Rigidity</h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                  Any amendment to the Constitution requires the approval of at least <strong>two-thirds (2/3) of the membership</strong>. Revisions can only be enacted after a <strong>minimum period of two (2) years</strong> from the previous amendment or revision, preserving constitutional stability.
                </p>
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
};

export default OfficerConstitution;
