import React from 'react';
import {DeviceStage} from './RealisticDevice';
import {Wordmark} from './BrandTitles';
import {AbsoluteFill, Audio, Img, Sequence, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig} from 'remotion';

const teal = '#0d6b66';
const ink = '#0f172a';
const mint = '#2dd4bf';
const scenes = [
  {from: 0, duration: 180, tag: 'HELLO, BSCS STUDENTS', title: 'Your community.\nYour next chapter.', body: 'Meet the SPECS portal.\nOne place to stay involved.', kind: 'intro'},
  {from: 180, duration: 240, tag: '01 / DISCOVER & PARTICIPATE', title: 'Make room for\nwhat’s next.', body: 'Explore the event calendar.\nStay updated on SPECS activities.', kind: 'events'},
  {from: 420, duration: 210, tag: '02 / KEEP TRACK', title: 'Your involvement,\nat a glance.', body: 'Review your attendance records\nand follow your participation.', kind: 'attendance'},
  {from: 630, duration: 210, tag: '03 / STAY INFORMED', title: 'Know where\nyou stand.', body: 'Check your dues and payment history.\nKeep your records within reach.', kind: 'payments'},
  {from: 840, duration: 210, tag: '04 / SHARE YOUR JOURNEY', title: 'There’s a story\nonly you can tell.', body: 'Student volunteers can submit stories\nfor review and share their experiences.', kind: 'stories'},
  {from: 1050, duration: 300, tag: 'YOUR SPECS JOURNEY STARTS HERE', title: 'BSCS students,\nlet’s connect.', body: 'Create your SPECS portal account.', kind: 'cta'},
] as const;

function Reveal({children, delay = 0, style}: {children: React.ReactNode; delay?: number; style?: React.CSSProperties}) {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const enter = spring({frame: frame - delay, fps, config: {damping: 200}});
  return <div style={{opacity: enter, transform: `translateY(${(1-enter)*35}px)`, ...style}}>{children}</div>;
}

function Scene({scene, signupUrl}: {scene: typeof scenes[number]; signupUrl: string}) {
  const frame = useCurrentFrame();
  const phoneLeft = ['events', 'payments', 'cta'].includes(scene.kind);
  const textEntrance = spring({frame, fps: 30, config: {damping: 200}});
  const dark = scene.kind === 'intro' || scene.kind === 'cta';
  const details: Record<string,string[]> = {events:['Event calendar','Activity details'],attendance:['Attendance rate','Session records'],payments:['Dues status','Payment history'],stories:['Volunteer contributions','Officer review']};
  const opacity = interpolate(frame, [0, 12, scene.duration-12, scene.duration], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <AbsoluteFill style={{opacity, color: dark ? 'white' : ink}}>
    <div style={{position: 'absolute', top: 247, left: phoneLeft ? 970 : 112, width: 820, transform: `translateX(${(1-textEntrance)*(phoneLeft ? 80 : -80)}px)`}}>
      <Reveal><div style={{fontSize: 17, letterSpacing: 3, fontWeight: 600, color: dark ? mint : teal,display:'flex',alignItems:'center',gap:17}}><span style={{width:32,height:2,background:dark?mint:teal}}/>{scene.tag}</div></Reveal>
      <Reveal delay={7}><h1 style={{fontSize: 74, fontWeight: 800, letterSpacing: -3.5, lineHeight: 1.15, whiteSpace: 'pre-line', margin: '34px 0 28px'}}>{scene.title}</h1></Reveal>
      <Reveal delay={17}><p style={{fontSize: 26, lineHeight: 1.75, whiteSpace: 'pre-line', color: dark ? '#cbd5e1' : '#617772', margin: 0}}>{scene.body}</p></Reveal>
      {details[scene.kind] && <Reveal delay={32}><div style={{borderTop:'1px solid #bccfc9',maxWidth:620,marginTop:39,paddingTop:24,display:'flex',gap:32}}>{details[scene.kind].map(t=><span key={t} style={{fontSize:18,color:teal,display:'flex',gap:10,alignItems:'center'}}><span style={{height:6,width:6,background:teal,borderRadius:'50%'}}/>{t}</span>)}</div><div style={{marginTop:29,fontSize:14,letterSpacing:2,color:'#7e9790'}}>SPECS / YOUR STUDENT PORTAL</div></Reveal>}
      {scene.kind === 'intro' && <Reveal delay={30}><div style={{display: 'flex', gap: 15, marginTop: 45}}>{['EVENTS', 'RECORDS', 'STORIES'].map(t => <span key={t} style={{border: '1px solid #ffffff30', borderRadius: 50, padding: '14px 23px', color: mint, fontSize: 19, letterSpacing: 2}}>{t}</span>)}</div></Reveal>}
      {scene.kind === 'cta' && <>
        <Reveal delay={26}><div style={{display: 'inline-flex', alignItems: 'center', gap: 35, background: mint, color: ink, fontWeight: 700, borderRadius: 18, fontSize: 31, padding: '20px 32px', marginTop: 33}}>Sign up today <span>↗</span></div></Reveal>
        <Reveal delay={34}><div style={{fontSize: 36, fontWeight: 600, marginTop: 25}}>{signupUrl}</div><div style={{fontSize: 22, color: '#cbd5e1', marginTop: 13}}>Use your official @parsu.edu.ph email and student ID.</div></Reveal>
      </>}
    </div>
    <DeviceStage kind={scene.kind} side={phoneLeft ? 'left' : 'right'} duration={scene.duration}/>
  </AbsoluteFill>;
}

export function SpecsPromo({signupUrl}: {signupUrl: string}) {
  const frame = useCurrentFrame();
  const dark = frame < 180 || frame >= 1050;
  return <AbsoluteFill style={{fontFamily: 'Poppins, sans-serif', backgroundColor: dark ? '#081e25' : '#edf3ef', overflow: 'hidden'}}>
    <Audio src={staticFile('soundtrack.wav')}/>
    <AbsoluteFill style={{backgroundImage: dark ? 'radial-gradient(#2dd4bf18 1.5px, transparent 1.5px)' : 'linear-gradient(120deg, #ffffffb0, #ffffff00 45%, #c8dfd430)', backgroundSize: dark ? '32px 32px' : '100% 100%'}}/>
    <div style={{position: 'absolute', width: 950, height: 950, right: -150, top: -180, borderRadius: '50%', background: `radial-gradient(circle, ${dark ? '#0d6b6655' : '#ccfbf155'}, transparent 70%)`}}/>
    <div style={{position: 'absolute', top: 65, left: 110, display: 'flex', alignItems: 'center', gap: 20, color: dark ? 'white' : ink}}><Img src={staticFile('logo.webp')} style={{width: 70, height: 70, objectFit: 'contain', borderRadius: '50%', background: 'white'}}/><div style={{fontSize: 32, fontWeight: 800, letterSpacing: 3}}>SPECS<span style={{display: 'block', fontSize: 13, fontWeight: 400, letterSpacing: 1}}>PARTIDO STATE UNIVERSITY</span></div></div>
    <div style={{position: 'absolute', right: 110, top: 87, color: dark ? '#99b8b7' : teal, fontSize: 19, letterSpacing: 3}}>CONNECT / LEARN / GROW</div>
    {scenes.map(scene => <Sequence key={scene.kind} from={scene.from} durationInFrames={scene.duration}><Scene scene={scene} signupUrl={signupUrl}/></Sequence>)}
    <div style={{position: 'absolute', bottom: 69, left: 112, color: dark ? '#99b8b7' : '#64748b', fontSize: 17}}>Society of Programmers and Enthusiasts in Computer Science</div>
    <div style={{position: 'absolute', bottom: 0, height: 6, width: `${frame/1349*100}%`, background: dark ? mint : teal}}/>
    <Sequence from={0} durationInFrames={180}><Wordmark signupUrl={signupUrl}/></Sequence>
    <Sequence from={1230} durationInFrames={120}><Wordmark closing signupUrl={signupUrl}/></Sequence>
  </AbsoluteFill>;
}
