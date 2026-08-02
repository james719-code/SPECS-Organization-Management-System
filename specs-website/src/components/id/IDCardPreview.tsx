import React from 'react';

export interface IDCardData {
  id: string;
  name: string;
  studentId?: string;
  role: 'student' | 'officer' | 'admin' | 'visitor' | 'guest' | 'speaker';
  position?: string; // e.g. "President", "Secretary", etc.
  course?: string;
  yearLevel?: string | number;
  section?: string;
  email?: string;
  address?: string;
  photoUrl?: string; // Optional uploaded 2x2 photo
  academicYear?: string;
}

interface IDCardPreviewProps {
  data: IDCardData;
  orientation?: 'portrait' | 'landscape';
  side?: 'front' | 'back' | 'both';
  customPhotoUrl?: string | null;
  cardFrontRef?: React.RefObject<HTMLDivElement | null>;
  cardBackRef?: React.RefObject<HTMLDivElement | null>;
  showQrCodeOnFront?: boolean;
}

export const POSITION_LABELS: Record<string, string> = {
  'president': 'President',
  'vice-president-internal': 'Vice-President Internal Affairs',
  'vice-president-external': 'Vice-President External Affairs',
  'secretary': 'Secretary',
  'asst-secretary': 'Assistant Secretary',
  'treasurer': 'Treasurer',
  'asst-treasurer': 'Assistant Treasurer',
  'auditor': 'Auditor',
  'p.i.o': 'P.I.O',
  'business-mngr-1': 'Business Manager (1)',
  'business-mngr-2': 'Business Manager (2)',
  'srgt-arms-1': 'Sergeant at Arms (1)',
  'sgrt-arms-2': 'Sergeant at Arms (2)',
  'representative': 'Representative'
};

export const formatOfficerPosition = (pos?: string): string => {
  if (!pos || pos.trim().length === 0 || pos.toLowerCase() === 'officer') return '';
  const lowercasePos = pos.toLowerCase();
  if (POSITION_LABELS[lowercasePos]) {
    return POSITION_LABELS[lowercasePos].toUpperCase();
  }
  return pos.replace(/-/g, ' ').toUpperCase();
};

export const IDCardPreview: React.FC<IDCardPreviewProps> = ({
  data,
  side = 'front',
  customPhotoUrl,
  cardFrontRef,
  cardBackRef,
}) => {
  const isOfficer = data.role === 'officer' || (data.position && data.position.trim().length > 0);
  const positionTitle = formatOfficerPosition(data.position);
  const photo = customPhotoUrl || data.photoUrl;

  const currentYear = new Date().getFullYear();
  const academicYear = data.academicYear || `${currentYear}-${currentYear + 1}`;

  const qrData = encodeURIComponent(`specs-member:${data.id}`);
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${qrData}`;

  const courseSection = data.course || ((data.section ? `${data.section}` : '') + (data.yearLevel ? ` (Year ${data.yearLevel})` : ''));

  return (
    <div className="flex flex-col items-center gap-6 py-2 select-none font-sans">
      {/* FRONT SIDE (Horizontal 508px x 320px) */}
      {(side === 'front' || side === 'both') && (
        <div
          ref={cardFrontRef}
          className="w-[508px] h-[320px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col relative shrink-0 text-slate-900"
          style={{ width: '508px', height: '320px' }}
        >
          {/* Header Banner - SPECS Organization Branding Only */}
          <div className={`px-4 py-2.5 ${isOfficer ? 'bg-[#084e49] border-b-2 border-amber-400' : 'bg-[#0d6b66] border-b-2 border-[#128882]'} text-white flex items-center justify-between relative shrink-0`}>
            <div className="flex items-center gap-3">
              {/* SPECS Logo */}
              <div className="w-9 h-9 bg-white rounded-full p-0.5 shadow-sm flex items-center justify-center shrink-0 border border-slate-200">
                <img src="/logo.webp" alt="SPECS Logo" className="w-full h-full object-contain rounded-full" />
              </div>
              <div>
                <div className="text-[11px] font-black tracking-wider uppercase leading-tight text-white">
                  SPECS ATTENDANCE & EVENT PASS
                </div>
                <div className="text-[9px] font-extrabold tracking-wide uppercase leading-tight text-emerald-100 opacity-90">
                  Society of Programmers and Enthusiasts in Computer Science
                </div>
              </div>
            </div>

            {/* Role / Officer / Visitor Badge */}
            <div className="shrink-0">
              {data.role === 'visitor' ? (
                <span className="px-3 py-1 bg-purple-900 text-purple-200 font-black text-[9.5px] uppercase tracking-wider rounded-md border border-purple-400/50 shadow-xs">
                  {data.position ? `VISITOR • ${data.position.toUpperCase()}` : 'VISITOR PASS'}
                </span>
              ) : data.role === 'guest' || data.role === 'speaker' ? (
                <span className="px-3 py-1 bg-amber-950 text-amber-300 font-black text-[9.5px] uppercase tracking-wider rounded-md border border-amber-500/50 shadow-xs">
                  {data.position ? `GUEST • ${data.position.toUpperCase()}` : 'GUEST / VIP'}
                </span>
              ) : isOfficer ? (
                <span className="px-3 py-1 bg-[#063834] text-amber-300 font-black text-[9.5px] uppercase tracking-wider rounded-md border border-amber-500/50 shadow-xs">
                  {positionTitle ? `OFFICER • ${positionTitle}` : 'EXECUTIVE OFFICER'}
                </span>
              ) : (
                <span className="px-3 py-1 bg-[#095753] text-white font-black text-[9.5px] uppercase tracking-widest rounded-md border border-[#084e49] shadow-xs">
                  STUDENT MEMBER
                </span>
              )}
            </div>
          </div>

          {/* Card Body - Half & Half (50 / 50) Layout */}
          <div className="flex-1 p-4 flex items-center justify-between gap-4 bg-slate-50 relative overflow-hidden">
            {/* LEFT HALF (50%) - Member Basic Info & Photo */}
            <div className="w-1/2 flex items-center gap-3 pr-2 border-r border-slate-200/90 relative z-10">
              {/* Member Photo */}
              <div className="relative shrink-0">
                <div className="w-[96px] h-[96px] border-2 border-[#0d6b66] rounded-xl bg-white flex flex-col items-center justify-center relative overflow-hidden shadow-sm p-0.5">
                  {photo ? (
                    <img src={photo} alt={data.name} className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-slate-400 space-y-1">
                      <svg className="w-7 h-7 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-[8px] font-extrabold text-slate-400 tracking-wider uppercase leading-none">PHOTO</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Basic Details */}
              <div className="flex-1 min-w-0 space-y-1 text-left">
                <h3 className="text-sm font-black text-slate-950 tracking-tight leading-snug uppercase break-words">
                  {data.name}
                </h3>
                <div className="text-[11px] font-black text-[#0d6b66] font-mono leading-tight">
                  ID: {data.studentId || data.id || 'N/A'}
                </div>
                {courseSection && (
                  <div className="text-[10px] font-extrabold text-slate-700 uppercase leading-tight">
                    {courseSection}
                  </div>
                )}
                {data.email && (
                  <div className="text-[8.5px] text-slate-600 font-semibold break-all leading-tight">
                    {data.email}
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT HALF (50%) - Big Attendance QR Code */}
            <div className="w-1/2 flex flex-col items-center justify-center space-y-1.5 pl-2 relative z-10">
              <span className="text-[9.5px] font-black text-[#0d6b66] uppercase tracking-widest font-mono">
                OFFICIAL ATTENDANCE QR
              </span>

              {/* Large QR Container */}
              <div className="p-2 bg-white rounded-xl border-2 border-[#0d6b66]/30 shadow-md flex items-center justify-center aspect-square">
                <img src={qrUrl} alt="Attendance QR" className="w-[124px] h-[124px] aspect-square object-contain shrink-0 rounded-md" />
              </div>

              <span className="text-[8px] font-extrabold text-slate-500 tracking-wider uppercase">
                PRESENT TO SCAN AT SPECS EVENTS
              </span>
            </div>
          </div>

          {/* Bottom Footer Bar */}
          <div className="bg-[#084e49] text-white text-[8.5px] py-1.5 px-4 flex items-center justify-between border-t border-[#063834] shrink-0 leading-none">
            <span className="font-bold tracking-widest text-white">SPECS ORGANIZATION ATTENDANCE PASS</span>
            <span className="font-mono text-slate-200">AY {academicYear}</span>
          </div>
        </div>
      )}

      {/* BACK SIDE (Horizontal 508px x 320px) */}
      {(side === 'back' || side === 'both') && (
        <div
          ref={cardBackRef}
          className="w-[508px] h-[320px] bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-300 flex flex-col justify-between p-4 relative shrink-0 text-slate-900"
          style={{ width: '508px', height: '320px' }}
        >
          {/* Header */}
          <div className="border-b border-slate-200 pb-2 flex items-center justify-between relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-5 h-5 bg-[#0d6b66] text-white rounded-full flex items-center justify-center shrink-0">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[11px] font-black tracking-widest text-[#0d6b66] uppercase">
                ORGANIZATION MEMBERSHIP & ATTENDANCE PASS
              </span>
            </div>
            <span className="text-[8.5px] text-slate-500 font-mono font-bold">
              AY {academicYear}
            </span>
          </div>

          {/* Body Content - Disclaimers & Notes */}
          <div className="space-y-2.5 my-auto relative z-10 px-1">
            {/* Main Policy & Attendance Notice */}
            <div className="p-2.5 bg-amber-50/90 border border-amber-200 rounded-xl space-y-1 text-left">
              <div className="flex items-center gap-1.5 text-amber-900">
                <svg className="w-3.5 h-3.5 text-amber-700 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-[9px] font-black uppercase tracking-wide">
                  IMPORTANT ATTENDANCE & POLICY DISCLAIMER
                </span>
              </div>
              <p className="text-[8.5px] text-amber-950 font-semibold leading-relaxed">
                This pass is an internal organization event badge issued by SPECS strictly for activity check-ins and attendance verification. <strong>It is NOT an official University/School Identification Card</strong> and cannot be used for institutional campus entry or academic verification.
              </p>
            </div>

            {/* Terms & Usage Notes */}
            <div className="grid grid-cols-2 gap-3 text-left">
              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                <span className="text-[8px] font-black text-[#0d6b66] uppercase tracking-wider block">PASS USAGE & PRIVILEGES</span>
                <p className="text-[8px] font-medium text-slate-700 leading-tight">
                  Valid for SPECS workshops, general assemblies, hackathons, and organization activities.
                </p>
              </div>

              <div className="p-2 bg-slate-50 rounded-lg border border-slate-200 space-y-0.5">
                <span className="text-[8px] font-black text-[#0d6b66] uppercase tracking-wider block">FOUND / RETURN NOTICE</span>
                <p className="text-[8px] font-medium text-slate-700 leading-tight">
                  If lost or found, please return to SPECS Executive Officers or Organization Advisers (IIT Building).
                </p>
              </div>
            </div>
          </div>

          {/* Signatures & Verification */}
          <div className="grid grid-cols-2 gap-8 pt-2 border-t border-slate-200 relative z-10">
            <div className="text-center space-y-0.5">
              <div className="h-6 border-b border-slate-400 flex items-end justify-center pb-0.5">
                <span className="text-[7.5px] font-serif italic text-slate-400">Cardholder Signature</span>
              </div>
              <span className="text-[7.5px] font-extrabold text-slate-700 uppercase block">CARDHOLDER</span>
            </div>

            <div className="text-center space-y-0.5">
              <div className="h-6 border-b border-slate-400 flex items-end justify-center pb-0.5">
                <span className="text-[7.5px] font-serif italic text-slate-400">Adviser Signature</span>
              </div>
              <span className="text-[7.5px] font-extrabold text-slate-700 uppercase block">SPECS ADVISER</span>
            </div>
          </div>

          {/* Footer Note */}
          <div className="pt-1.5 border-t border-slate-200 text-center relative z-10">
            <span className="text-[7.5px] font-black text-slate-400 uppercase tracking-widest font-mono">
              SPECS INTERNAL EVENT PASS • NOT A VALID SCHOOL ID
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
