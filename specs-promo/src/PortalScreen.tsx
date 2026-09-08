import React from 'react';
import {Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';

const teal = '#0d6b66';
const ink = '#142b32';
const muted = '#73828e';
const line = '#e2e9eb';
const card: React.CSSProperties = {background: '#fff', border: `1px solid ${line}`, borderRadius: 13, overflow: 'hidden', boxShadow: '0 3px 9px #142b3206'};
const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;
const arrive = (frame: number, delay = 0) => spring({frame: frame - delay, fps: 30, config: {damping: 22, stiffness: 110}});

function Icon({name, size = 16, color = 'currentColor'}: {name: string; size?: number; color?: string}) {
  const paths: Record<string, React.ReactNode> = {
    menu: <><path d="M4 6h16M4 12h16M4 18h16"/></>,
    search: <><circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v5m10-5v5M3 11h18m-12 4h2m4 0h2"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/></>,
    arrow: <path d="M4 12h16m-6-6 6 6-6 6"/>,
    check: <path d="m5 12 4 4L19 6"/>,
    lock: <><rect x="6" y="10" width="12" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3m-4 5v2"/></>,
    chevron: <path d="m9 5 7 7-7 7"/>,
    back: <path d="m15 5-7 7 7 7"/>,
    share: <><path d="M12 15V3m-4 4 4-4 4 4M7 10H4v11h16V10h-3"/></>,
    book: <><path d="M12 6C8 3 4 4 2 5v14c3-2 7-2 10 0 3-2 7-2 10 0V5c-3-1-7-2-10 1v13"/></>,
    tabs: <><rect x="7" y="3" width="14" height="15" rx="2"/><path d="M16 21H5a2 2 0 0 1-2-2V8"/></>,
    receipt: <><path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z"/><path d="M9 7h6m-6 4h6m-6 4h4"/></>,
    pen: <><path d="m4 16 12-12 4 4L8 20H4v-4Zm9-9 4 4M4 20h16"/></>,
    plus: <path d="M12 5v14M5 12h14"/>,
    moon: <path d="M20 15a9 9 0 0 1-11-11A9 9 0 1 0 20 15Z"/>,
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink: 0}}>{paths[name] || paths.calendar}</svg>;
}

function Status({children, pending = false}: {children: React.ReactNode; pending?: boolean}) {
  return <span style={{display: 'inline-flex', alignItems: 'center', gap: 4, borderRadius: 20, padding: '3px 7px', background: pending ? '#fff7e8' : '#eaf7f0', color: pending ? '#a56816' : '#16744d', border: `1px solid ${pending ? '#f5e8c9' : '#d4ecdf'}`, fontSize: 9, fontWeight: 600, whiteSpace: 'nowrap'}}>{!pending && <Icon name="check" size={10}/>} {children}</span>;
}

function PageTitle({title, description}: {title: string; description: string}) {
  return <div style={{marginBottom: 15}}><div style={{fontSize: 8, fontWeight: 600, color: teal, letterSpacing: 1.1, marginBottom: 5}}>MEMBER WORKSPACE · SAMPLE PREVIEW</div><h3 style={{margin: 0, fontSize: 22, lineHeight: 1.3, letterSpacing: -.8, fontWeight: 700}}>{title}</h3><p style={{margin: '6px 0 0', fontSize: 10, color: muted, lineHeight: 1.6}}>{description}</p></div>;
}

function Field({label, children}: {label: string; children: React.ReactNode}) {
  return <div><div style={{fontSize: 8, fontWeight: 600, letterSpacing: .7, color: muted, textTransform: 'uppercase', marginBottom: 5}}>{label}</div><div style={{border: `1px solid ${line}`, background: 'white', borderRadius: 7, minHeight: 32, padding: '8px 10px', fontSize: 10, lineHeight: 1.4, color: ink}}>{children}</div></div>;
}

function Events() {
  const f = useCurrentFrame();
  const showDetails = arrive(f, 106);
  return <>
    <PageTitle title="Events Schedule" description="Browse upcoming and past organization events."/>
    <div style={{display: 'flex', gap: 8, alignItems: 'center', marginBottom: 13}}><div style={{display: 'flex', gap: 3, border: `1px solid ${line}`, padding: 3, background: 'white', borderRadius: 8}}>{['All', 'Upcoming', 'Past'].map(t => <span key={t} style={{padding: '6px 9px', background: t === 'Upcoming' ? teal : 'transparent', color: t === 'Upcoming' ? 'white' : muted, borderRadius: 5, fontSize: 9, fontWeight: 600}}>{t}</span>)}</div><span style={{marginLeft: 'auto', color: muted, padding: 9, border: `1px solid ${line}`, borderRadius: 8, background: 'white'}}><Icon name="search" size={15}/></span></div>
    <div style={{...card, transform: `translateY(${(1-arrive(f, 12))*18}px)`, opacity: Math.min(1, arrive(f, 12))}}>
      <div style={{height: 146, position: 'relative', padding: 16, background: 'linear-gradient(125deg,#052f37,#0d6b66)', overflow: 'hidden', color: 'white'}}>
        <div style={{position: 'absolute', width: 190, height: 190, border: '1px solid #64c6af45', borderRadius: '50%', right: -63, top: -17}}/><div style={{position: 'absolute', width: 135, height: 135, border: '1px solid #64c6af45', borderRadius: '50%', right: -37, top: 11}}/>
        <div style={{display: 'flex', alignItems: 'center', gap: 6, fontSize: 8, fontWeight: 600, letterSpacing: 1.7}}><Img src={staticFile('logo.webp')} style={{width: 19, height: 19}}/> SPECS LEARNING SERIES</div>
        <div style={{fontSize: 25, fontWeight: 700, letterSpacing: -1.2, lineHeight: 1.06, marginTop: 16}}>Build your<br/><span style={{color: '#74e3cc'}}>first website.</span></div><div style={{fontSize: 8, opacity: .75, letterSpacing: 1, marginTop: 10}}>CODING WORKSHOP · SAMPLE EVENT</div>
        <span style={{position: 'absolute', right: 17, bottom: 18, color: '#8df0d0', fontWeight: 500, fontSize: 42, transform: `rotate(-10deg) translateY(${Math.sin(f/25)*2}px)`}}>{'</>'}</span>
      </div>
      <div style={{padding: 14}}><div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10}}><span style={{fontSize: 10, color: teal, fontWeight: 600}}>SEP 18 · 9:00 AM</span><Status>Upcoming</Status></div><div style={{fontSize: 14, fontWeight: 700}}>Coding Workshop</div><p style={{fontSize: 10, lineHeight: 1.7, color: muted, margin: '6px 0 13px'}}>Explore the basics. Build with your peers.<br/>Turn a new idea into your first web project.</p><div style={{height: 31, border: `1px solid ${line}`, background: '#f8fafb', borderRadius: 7, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: 10, fontWeight: 600}}>View Details <Icon name="arrow" size={12}/></div></div>
    </div>
    <div style={{...card, marginTop: 10, padding: 12, display: 'flex', gap: 11, alignItems: 'center'}}><div style={{background: '#eaf5f1', color: teal, padding: 9, borderRadius: 9}}><Icon name="calendar" size={21}/></div><div><b style={{fontSize: 11}}>SPECS General Assembly</b><div style={{fontSize: 9, color: muted, marginTop: 3}}>SEP 25 · 1:00 PM</div></div><Icon name="chevron" size={14}/></div>
    {f >= 106 && <div style={{position: 'absolute', inset: 0, background: `rgba(10,31,38,${showDetails*.24})`, display: 'flex', alignItems: 'flex-end', zIndex: 2}}><div style={{background: 'white', borderRadius: '19px 19px 0 0', padding: '12px 19px 25px', width: '100%', boxShadow: '0 -10px 35px #0b253320', transform: `translateY(${(1-showDetails)*260}px)`}}><div style={{width: 35, height: 4, background: '#dbe4e7', margin: '0 auto 16px', borderRadius: 5}}/><Status>Active Scheduled</Status><h4 style={{fontSize: 18, letterSpacing: -.5, lineHeight: 1.35, margin: '13px 0'}}>Coding Workshop</h4><div style={{display: 'flex', gap: 8, alignItems: 'center', color: teal, fontSize: 11}}><Icon name="calendar"/>September 18, 2026</div><div style={{display: 'flex', gap: 8, alignItems: 'center', color: muted, fontSize: 11, marginTop: 8}}><Icon name="clock"/>9:00 AM</div><p style={{fontSize: 11, color: muted, lineHeight: 1.8, margin: '14px 0 0'}}>A hands-on introduction to HTML, CSS and building for the web. Open to BSCS students.</p></div></div>}
  </>;
}

function Attendance() {
  const f = useCurrentFrame();
  return <><PageTitle title="Attendance Record" description="Track your participation in events and activities."/><div style={{...card, padding: 13, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}><div style={{display: 'flex', alignItems: 'center', gap: 9}}><div style={{width: 32, height: 32, background: '#e9f6f0', color: teal, display: 'grid', placeItems: 'center', borderRadius: 9}}><Icon name="calendar" size={17}/></div><div style={{fontSize: 10, fontWeight: 600}}>4 recorded check-ins<div style={{fontSize: 9, color: muted, fontWeight: 400, marginTop: 2}}>4 of 5 activities · 80% participation</div></div></div></div>
    {[
      {name: 'SPECS General Assembly', date: 'Sep 04, 2026', time: '8:58 AM', session: 'Morning Check-in'},
      {name: 'Coding Fundamentals', date: 'Aug 28, 2026', time: '9:02 AM', session: 'Workshop Check-in'},
      {name: 'Freshmen Orientation', date: 'Aug 21, 2026', time: '8:45 AM', session: 'General Check-in'},
      {name: 'Meet the SPECS Team', date: 'Aug 14, 2026', time: '9:00 AM', session: 'General Check-in'},
    ].map((r, i) => <div key={r.name} style={{...card, padding: 13, marginTop: 10, opacity: Math.min(1, arrive(f, 12 + i*12)), transform: `translateY(${(1-arrive(f, 12+i*12))*22}px)`}}><div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${line}`, paddingBottom: 10, marginBottom: 9}}><b style={{fontSize: 11, letterSpacing: -.2}}>{r.name}</b><Status>Present</Status></div>{[['Date Logged', r.date], ['Time Logged', r.time], ['Check-in', r.session]].map(([label, value]) => <div key={label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 9, marginTop: 6}}><span style={{color: muted}}>{label}</span><span style={{fontWeight: 500}}>{value}</span></div>)}</div>)}
  </>;
}

function Payments() {
  const f = useCurrentFrame();
  return <><PageTitle title="Transaction History" description="Overview of your payments, collections, and dues."/>
    {[{item: 'Membership dues', amount: '₱150.00', date: 'Sep 02, 2026', method: 'Cash', paid: true}, {item: 'Workshop materials', amount: '₱50.00', date: 'Sep 05, 2026', method: '—', paid: false}].map((p, i) => <div key={p.item} style={{...card, marginBottom: 12, padding: 15, opacity: Math.min(1, arrive(f, 14+i*15)), transform: `translateY(${(1-arrive(f, 14+i*15))*22}px)`}}><div style={{display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${line}`, paddingBottom: 12}}><div style={{width: 28, height: 28, display: 'grid', placeItems: 'center', background: '#edf5f4', color: teal, borderRadius: 7}}><Icon name="receipt" size={17}/></div><b style={{fontSize: 12}}>{p.item}</b><span style={{marginLeft: 'auto'}}><Status pending={!p.paid}>{p.paid ? 'Paid' : 'Pending'}</Status></span></div><div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '16px 0'}}><span style={{fontSize: 10, color: muted}}>Total Amount</span><span style={{fontWeight: 700, fontSize: 26, letterSpacing: -1, color: ink}}>{p.amount}</span></div>{[['Date', p.date], ['Method', p.method]].map(([label, value]) => <div key={label} style={{display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 8}}><span style={{color: muted}}>{label}</span><span style={{fontWeight: 500}}>{value}</span></div>)}{i === 1 && <div style={{fontSize: 9, display: 'flex', alignItems: 'center', gap: 5, color: muted, marginTop: 9}}><Icon name="calendar" size={12}/> Event Linked</div>}</div>)}
    <div style={{display: 'flex', gap: 8, color: muted, padding: '5px 4px', fontSize: 9, lineHeight: 1.7}}><Icon name="lock" size={13}/><span>Payment records are visible in your account.<br/>Sample amounts shown for this preview.</span></div>
  </>;
}

function Stories() {
  const f = useCurrentFrame();
  const composer = arrive(f, 83);
  const typed = 'We built our first web project together and learned how ideas become working code.'.slice(0, Math.max(0, Math.floor((f-95)*1.4)));
  return <><PageTitle title="My Stories" description="Compose stories and check their verification progress."/><div style={{display: 'flex', alignItems: 'center', gap: 7, color: teal, fontSize: 9, margin: '-3px 0 14px'}}><span style={{width: 6, height: 6, background: '#2aad83', borderRadius: '50%'}}/> SPECS volunteer contributor</div><div style={{display: 'flex', gap: 7, marginBottom: 13}}>{[['3', 'TOTAL STORIES'], ['2', 'PUBLISHED'], ['1', 'UNDER REVIEW']].map(([n, label], i) => <div key={label} style={{...card, flex: 1, textAlign: 'center', padding: '12px 3px'}}><div style={{fontSize: 23, color: i === 2 ? '#b3822c' : teal, fontWeight: 700}}>{n}</div><div style={{fontSize: 6.5, letterSpacing: .4, color: muted, fontWeight: 600}}>{label}</div></div>)}</div>
    <div style={{...card, padding: 15}}><div style={{display: 'flex', alignItems: 'center', justifyContent: 'space-between'}}><span style={{fontSize: 8, color: muted}}>SEP 04, 2026</span><Status pending>Awaiting Officer</Status></div><h4 style={{fontSize: 15, margin: '14px 0 8px', letterSpacing: -.4}}>From classmates to creators</h4><p style={{fontSize: 11, lineHeight: 1.8, color: muted, margin: 0}}>A day of shared ideas, first projects and learning together with SPECS.</p><div style={{borderTop: `1px solid ${line}`, marginTop: 18, paddingTop: 12}}><div style={{fontSize: 8, fontWeight: 600, letterSpacing: 1, color: muted}}>APPROVAL FLOW</div><div style={{display: 'flex', justifyContent: 'space-between', position: 'relative', paddingTop: 13}}><div style={{position: 'absolute', top: 25, left: 23, right: 23, height: 2, background: '#e5ebed'}}/>{['Submitted', 'Officer', 'Admin'].map((step, i) => <div key={step} style={{position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 64}}><div style={{width: 25, height: 25, borderRadius: '50%', background: i === 0 ? teal : '#f1f5f6', border: '2px solid white', color: i === 0 ? 'white' : '#a6b3ba', display: 'grid', placeItems: 'center'}}>{i === 0 ? <Icon name="check" size={12}/> : <Icon name={i === 1 ? 'clock' : 'lock'} size={12}/>}</div><span style={{fontSize: 8, color: i === 0 ? teal : muted}}>{step}</span></div>)}</div></div></div>
    <div style={{marginTop: 14, background: teal, color: 'white', display: 'flex', gap: 7, alignItems: 'center', justifyContent: 'center', padding: '11px 0', borderRadius: 9, fontSize: 11, fontWeight: 600}}><Icon name="plus" size={15}/> Create Story</div>
    {f >= 83 && <div style={{position: 'absolute', inset: 0, background: `rgba(10,31,38,${composer*.2})`, display: 'flex', alignItems: 'flex-end', zIndex: 3}}><div style={{background: 'white', padding: '15px 18px 24px', borderRadius: '18px 18px 0 0', width: '100%', transform: `translateY(${(1-composer)*400}px)`, boxShadow: '0 -10px 35px #0b253322'}}><div style={{width: 33, height: 4, margin: '0 auto 16px', background: '#dce5e7', borderRadius: 6}}/><div style={{fontSize: 16, fontWeight: 700, letterSpacing: -.4, marginBottom: 17}}>Create New Story Draft</div><div style={{display: 'grid', gap: 12}}><Field label="Title">From classmates to creators</Field><Field label="Short Summary">Our first web development workshop.</Field><Field label="Story Details"><div style={{height: 78, lineHeight: 1.8}}>{typed}<span style={{opacity: Math.floor(f/12)%2, color: teal}}>|</span></div></Field></div><div style={{padding: '11px 0', color: 'white', background: teal, textAlign: 'center', borderRadius: 8, fontWeight: 600, fontSize: 11, marginTop: 15}}>Submit Draft</div><div style={{fontSize: 8, color: muted, textAlign: 'center', marginTop: 8}}>Stories go through officer and admin approval.</div></div></div>}
  </>;
}

function Signup() {
  const f = useCurrentFrame();
  return <><div style={{textAlign: 'center', margin: '0 0 15px'}}><Img src={staticFile('logo.webp')} style={{width: 34, height: 34}}/><h3 style={{margin: '7px 0 4px', fontSize: 22, letterSpacing: -.8}}>Register Student</h3><div style={{fontSize: 9, color: muted}}>Join the SPECS organization community portal</div></div><div style={{display: 'grid', gap: 10}}>{[['Full Name', 'Your full name'], ['University Email', 'you@parsu.edu.ph'], ['Student ID Number', 'Your student ID']].map(([label, value], i) => <div key={label} style={{opacity: Math.min(1, arrive(f, 15 + i*8)), transform: `translateY(${(1-arrive(f,15+i*8))*12}px)`}}><Field label={label}>{value}</Field></div>)}<div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 9}}><Field label="Year Level">1st Year</Field><Field label="Section">Section A</Field></div><Field label="Password">••••••••••</Field></div><div style={{fontSize: 8, color: muted, lineHeight: 1.6, margin: '13px 0'}}>Use your official university email.<br/>Complete your profile to join the community.</div><div style={{background: teal, color: 'white', padding: 11, textAlign: 'center', fontSize: 12, fontWeight: 600, borderRadius: 8}}>Register as Member</div></>;
}

/** Animated, illustrative content based on the actual student portal's mobile cards. */
export function PortalScreen({kind}: {kind: string}) {
  const f = useCurrentFrame();
  const signup = kind === 'cta';
  return <div style={{position: 'absolute', inset: 0, overflow: 'hidden', color: ink, fontFamily: 'Poppins, sans-serif', background: '#f7f9fa', boxSizing: 'border-box'}}>
    <div style={{height: 43, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '5px 21px 0', fontSize: 12, fontWeight: 600}}><span>9:41</span><div style={{display: 'flex', alignItems: 'center', gap: 5}}><svg width="14" height="12" viewBox="0 0 14 12" fill={ink}><rect x="0" y="8" width="2" height="4" rx=".5"/><rect x="4" y="5" width="2" height="7" rx=".5"/><rect x="8" y="2" width="2" height="10" rx=".5"/><rect x="12" y="0" width="2" height="12" rx=".5"/></svg><svg width="16" height="12" viewBox="0 0 16 12" fill="none" stroke={ink} strokeWidth="1.8"><path d="M1 4a11 11 0 0 1 14 0M4 7a6 6 0 0 1 8 0m-5 3 1 1 1-1"/></svg><svg width="23" height="12" viewBox="0 0 23 12"><rect x="1" y="1" width="18" height="10" rx="3" fill="none" stroke={ink} opacity=".4"/><rect x="3" y="3" width="14" height="6" rx="1.4" fill={ink}/><path d="M21 4v4" stroke={ink} strokeWidth="2"/></svg></div></div>
    <div style={{height: 38, padding: '3px 13px 7px', background: 'white', boxSizing: 'border-box'}}><div style={{height: 28, background: '#edf1f3', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, fontSize: 10, color: '#54636e'}}><span style={{position: 'absolute', left: 24, fontSize: 11}}>aA</span><Icon name="lock" size={10}/> specs-portal.org<span style={{position: 'absolute', right: 25, fontSize: 14}}>↻</span></div></div>
    <div style={{height: 48, background: 'white', borderTop: '1px solid #f4f6f7', borderBottom: `1px solid ${line}`, padding: '0 15px', display: 'flex', alignItems: 'center', gap: 9}}><div style={{width: 29, height: 29, border: `1px solid ${line}`, borderRadius: 7, display: 'grid', placeItems: 'center', color: '#657884'}}><Icon name="menu" size={16}/></div><div style={{fontSize: 13, fontWeight: 700, letterSpacing: -.3}}>Student Portal</div><div style={{marginLeft: 'auto', display: 'flex', gap: 10, alignItems: 'center'}}><Icon name="moon" size={14} color={teal}/><Img src={staticFile('logo.webp')} style={{width: 25, height: 25}}/></div></div>
    <div style={{position: 'absolute', top: 129, left: 0, right: 0, bottom: 57, overflow: 'hidden'}}><div style={{padding: '17px 16px 18px', boxSizing: 'border-box', opacity: interpolate(f, [0, 8], [0, 1], clamp)}}>{kind === 'events' ? <Events/> : kind === 'attendance' || kind === 'intro' ? <Attendance/> : kind === 'payments' ? <Payments/> : kind === 'stories' ? <Stories/> : signup ? <Signup/> : <Events/>}</div></div>
    <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, height: 57, boxSizing: 'border-box', background: '#ffffffee', borderTop: `1px solid ${line}`, display: 'flex', justifyContent: 'space-between', padding: '12px 26px 25px', color: '#257881'}}><Icon name="back" size={18}/><Icon name="chevron" size={18} color="#c0ccd1"/><Icon name="share" size={18}/><Icon name="book" size={18}/><Icon name="tabs" size={18}/></div>
  </div>;
}
