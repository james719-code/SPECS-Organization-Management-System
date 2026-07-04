import React, { useState } from 'react';
import { 
  ShieldAlert, BookOpen, CheckCircle2, AlertTriangle, Users, DollarSign, 
  Award, HelpCircle, FileText, Check, Calendar, Info
} from 'lucide-react';

const StudentConstitution: React.FC = () => {
  const [activeSection, setActiveSection] = useState<'membership' | 'rights' | 'compliance' | 'activities'>('membership');

  return (
    <div className="space-y-6 max-w-5xl animate-fade-in pb-12">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">Constitution & By-Laws</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Important handbook details, membership rules, rights, and compliance guidelines for SPECS members.
          </p>
        </div>
        <div className="flex items-center gap-2 bg-[#0d6b66]/10 dark:bg-teal-500/10 px-3 py-1.5 rounded-xl border border-[#0d6b66]/20 dark:border-teal-500/20 text-xs font-semibold text-[#0d6b66] dark:text-teal-400">
          <BookOpen className="h-4 w-4" />
          <span>Active Constitution (2025 Revision)</span>
        </div>
      </div>

      {/* Top Banner Alert - Active Status Consequence */}
      <div className="bg-gradient-to-r from-amber-500/5 to-orange-500/5 border border-amber-500/20 dark:border-amber-500/10 rounded-2xl p-5 flex gap-4 text-amber-800 dark:text-amber-300 shadow-sm">
        <ShieldAlert className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-extrabold uppercase tracking-wider text-amber-900 dark:text-amber-205">Crucial Membership Rule</h4>
          <p className="text-xs leading-relaxed opacity-90">
            Failure to settle organization dues on time or maintain active attendance without a valid excuse will classify you as <strong className="font-semibold">non-compliant (inactive status)</strong>. Inactive members lose their eligibility to vote in elections, run for office, or receive certificates of participation.
          </p>
        </div>
      </div>

      {/* Section Nav Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800 pb-1">
        <button
          onClick={() => setActiveSection('membership')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'membership' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-650 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Users className="h-4 w-4" />
          Eligibility & Fees
        </button>
        <button
          onClick={() => setActiveSection('rights')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'rights' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Award className="h-4 w-4" />
          Rights & Duties
        </button>
        <button
          onClick={() => setActiveSection('compliance')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'compliance' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Status & Violations
        </button>
        <button
          onClick={() => setActiveSection('activities')}
          className={`px-4 py-2.5 text-xs font-bold rounded-xl transition-all flex items-center gap-2 ${
            activeSection === 'activities' 
              ? 'bg-[#0d6b66] text-white shadow-md shadow-teal-900/10' 
              : 'text-slate-655 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Calendar className="h-4 w-4" />
          Absences & Volunteering
        </button>
      </div>

      {/* Main Tab Content */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-6">
        
        {/* Left 2 Cols: Details according to the selected tab */}
        <div className="md:col-span-2 space-y-6">
          
          {/* TAB 1: ELIGIBILITY & FEES */}
          {activeSection === 'membership' && (
            <div className="space-y-6 animate-fade-in">
              {/* Eligibility Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                    <Users className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Membership Eligibility</h3>
                    <p className="text-xs text-slate-400">Article II, Section 1</p>
                  </div>
                </div>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  SPECS membership remains open to all <strong>Bachelor of Science in Computer Science (BSCS)</strong> students enrolled under the <strong>College of Engineering and Computational Sciences (CECS)</strong>. Enrollment automatically qualifies you to join.
                </p>
              </div>

              {/* Dues Card */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Membership Dues</h3>
                    <p className="text-xs text-slate-400">Article II, Section 2</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800">
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-350">One-Time Membership Fee</span>
                    <span className="text-sm font-black text-[#0d6b66] dark:text-teal-400">₱50.00</span>
                  </div>
                  <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                    This one-time organization fee is required of all members to support basic operations, activities, and club events.
                  </p>
                  <div className="p-4 bg-amber-500/5 border-l-4 border-amber-500 rounded-r-xl">
                    <div className="flex gap-2.5">
                      <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800 dark:text-amber-400 leading-relaxed font-medium">
                        Payment obligations must be settled on or before the deadlines set by the Treasurer. Unexcused failures immediately trigger non-compliance penalties.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: RIGHTS & DUTIES */}
          {activeSection === 'rights' && (
            <div className="space-y-6 animate-fade-in">
              {/* Member Rights */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Rights of Members</h3>
                    <p className="text-xs text-slate-400">Article II, Section 3</p>
                  </div>
                </div>
                <ul className="space-y-3 text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded bg-teal-50 dark:bg-teal-950/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Participate in all SPECS activities, seminars, and organizational events.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded bg-teal-50 dark:bg-teal-950/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Volunteer for organization-sponsored projects and sub-committees.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded bg-teal-50 dark:bg-teal-950/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Receive certificates of participation or appreciation based on verified contributions.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <div className="h-4 w-4 rounded bg-teal-50 dark:bg-teal-950/30 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-3 w-3" />
                    </div>
                    <span>Be nominated and vote during general elections (provided you are a compliant active member).</span>
                  </li>
                </ul>
              </div>

              {/* Responsibilities */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Responsibilities of Members</h3>
                    <p className="text-xs text-slate-400">Article II, Section 4</p>
                  </div>
                </div>
                <ul className="space-y-3 text-xs text-slate-650 dark:text-slate-400 leading-relaxed">
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[10px]">1</span>
                    <span className="pt-0.5">Uphold the Constitution, By-Laws, and organizational policies of SPECS.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[10px]">2</span>
                    <span className="pt-0.5"><strong>Attend at least two (2) major SPECS activities</strong> per semester.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[10px]">3</span>
                    <span className="pt-0.5">Participate in mandatory events required by OSAS, CECS, or upper university bodies.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[10px]">4</span>
                    <span className="pt-0.5">Submit a formal excuse letter for absences in required events.</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 shrink-0 w-5 h-5 rounded-full bg-indigo-50 dark:bg-indigo-950/30 flex items-center justify-center text-[10px]">5</span>
                    <span className="pt-0.5">Provide complete and accurate personal information requested by authorized officers for OSAS compliance.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 3: MEMBERSHIP STATUS & COMPLIANCE */}
          {activeSection === 'compliance' && (
            <div className="space-y-6 animate-fade-in">
              {/* Active vs Inactive */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-emerald-50 dark:bg-emerald-950/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Active and Inactive Membership</h3>
                    <p className="text-xs text-slate-400">Article II, Section 5</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="p-4 rounded-xl bg-emerald-50/50 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30">
                    <h4 className="text-xs font-bold text-emerald-800 dark:text-emerald-400 mb-2.5 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                      Active Member
                    </h4>
                    <ul className="space-y-1.5 text-[11px] text-emerald-700 dark:text-emerald-300 leading-normal">
                      <li>• Attend at least 70% of SPECS activities</li>
                      <li>• Pay all organizational dues on time</li>
                      <li>• Provide required personal details</li>
                      <li>• Participate in mandatory OSAS/CECS events</li>
                    </ul>
                  </div>
                  <div className="p-4 rounded-xl bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30">
                    <h4 className="text-xs font-bold text-rose-800 dark:text-rose-450 mb-2.5 flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500"></span>
                      Inactive Member
                    </h4>
                    <p className="text-[11px] text-rose-700 dark:text-rose-300 leading-relaxed">
                      Fails to meet participation, payment, or information requirements without valid, approved reasons.
                      <strong className="block mt-1.5 font-bold text-rose-850 dark:text-rose-400">Penalty: Lose the right to vote, run for office, or receive certificates.</strong>
                    </p>
                  </div>
                </div>
              </div>

              {/* General Non-Compliance Clause */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 flex items-center justify-center">
                    <ShieldAlert className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">General Non-Compliance Clause</h3>
                    <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed mb-4">
                      Any member who, without a valid reason or prior approval:
                    </p>
                    <ol className="space-y-2 text-xs text-slate-700 dark:text-slate-300 list-decimal pl-4 mb-4">
                      <li>Fails to settle required fees within specified deadlines.</li>
                      <li>Refuses to provide the required personal information needed for OSAS.</li>
                      <li>Consistently ignores duties under this Constitution and By-Laws.</li>
                    </ol>
                    <div className="p-4 bg-rose-500/5 dark:bg-rose-500/[0.02] border-l-4 border-rose-500 rounded-r-xl">
                      <p className="text-xs text-rose-800 dark:text-rose-400 font-bold mb-1.5">Consequences:</p>
                      <ul className="space-y-1.5 text-xs text-slate-650 dark:text-slate-400">
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          <span>Forfeit active membership status.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          <span>Ineligible to vote, hold office, or receive certificates.</span>
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0"></span>
                          <span>May face disciplinary action upon repeated violations.</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: ABSENCES & VOLUNTEERING */}
          {activeSection === 'activities' && (
            <div className="space-y-6 animate-fade-in">
              {/* Absences */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                    <Info className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Excused Absences</h3>
                    <p className="text-xs text-slate-400">Article X, Section 3</p>
                  </div>
                </div>
                <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed mb-4">
                  If you are unable to attend a mandatory OSAS, CECS, or SPECS event, you must submit a formal excuse letter to prevent penalties.
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-105 dark:border-slate-800">
                  <h4 className="text-xs font-bold text-slate-800 dark:text-slate-205 mb-1.5">Submission Timeline</h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
                    The excuse letter must be submitted to <strong>both the President and Adviser at least 24 hours prior</strong> to the event. Only sudden emergencies are exempt from this 24-hour window.
                  </p>
                </div>
              </div>

              {/* Volunteering */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-4">
                  <div className="h-10 w-10 rounded-xl bg-teal-50 dark:bg-teal-950/20 text-[#0d6b66] dark:text-teal-400 flex items-center justify-center">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">Volunteer & Contribution</h3>
                    <p className="text-xs text-slate-650 dark:text-slate-400 leading-relaxed mb-3.5">
                      Members are encouraged to volunteer. Areas of contribution include:
                    </p>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300 mb-4">
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950">
                        <Check className="h-3 w-3 text-teal-500" /> Event setup & logistics
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950">
                        <Check className="h-3 w-3 text-teal-500" /> Media & documentation
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950">
                        <Check className="h-3 w-3 text-teal-500" /> Hosting & coordination
                      </div>
                      <div className="flex items-center gap-2 p-2 rounded bg-slate-50 dark:bg-slate-950">
                        <Check className="h-3 w-3 text-teal-500" /> Tech support & dev
                      </div>
                    </div>
                    <div className="p-3 bg-teal-500/5 dark:bg-teal-500/[0.02] border border-teal-500/10 rounded-xl flex items-center gap-2.5 text-xs text-[#0d6b66] dark:text-teal-400">
                      <Info className="h-4 w-4 shrink-0 text-[#0d6b66] dark:text-teal-400" />
                      <span className="font-semibold text-slate-700 dark:text-slate-300">
                        Volunteers receive official Certificates of Contribution based on verified involvement!
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* Right 1 Col: Summary / Helpful Tips */}
        <div className="space-y-6">
          {/* Quick FAQ summary */}
          <div className="bg-gradient-to-br from-[#0d6b66] to-[#084844] text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-bl-full pointer-events-none"></div>
            <HelpCircle className="h-6 w-6 text-teal-200 mb-4" />
            <h3 className="text-sm font-extrabold text-white mb-2">Need to Submit an Excuse?</h3>
            <p className="text-xs text-teal-100/80 leading-relaxed mb-4">
              Write a formal letter detailing your name, year, section, the mandatory event missed, and the reason for your absence. Email it to both the President and Advisor.
            </p>
            <span className="text-[10px] bg-white/10 text-white rounded px-2.5 py-1 font-bold inline-block border border-white/10 uppercase tracking-wide">
              24-Hour Lead Time Needed
            </span>
          </div>

          {/* Privacy Note */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 dark:text-slate-200 mb-2">
              <Info className="h-4 w-4 text-teal-500 shrink-0" />
              <span>Data Confidentiality (Article XI)</span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              Any personal data collected (names, student IDs, contact numbers, email addresses) is strictly restricted to authorized officers. Sharing or unauthorized exposure is prohibited and subject to administrative penalties.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default StudentConstitution;
