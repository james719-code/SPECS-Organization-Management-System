import {AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame} from 'remotion';

const mint = '#61e6c5';
const muted = '#a6c6c7';
const reveal = (frame: number, delay: number) => spring({frame: frame-delay, fps: 30, config: {damping: 200}});

function AssembledWord({closing}: {closing: boolean}) {
  const frame = useCurrentFrame();
  const clock = closing ? frame*1.35 : frame;
  const settled = interpolate(clock, [64, 76], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return <div style={{position: 'absolute', top: closing ? 350 : 300, left: 91, width: 940, height: 280, transform: `scale(${interpolate(frame,[0,100],[.95,1],{extrapolateRight:'clamp'})})`, transformOrigin: 'left center'}}>
    {'SPECS'.split('').map((letter,i) => {
      const base = {position: 'absolute' as const, inset: 0, fontSize: 252, lineHeight: '280px', textAlign: 'center' as const, fontWeight: 800, letterSpacing: -10};
      return <div key={i} style={{position: 'absolute', left: i*184, width: 184, height: 280}}>
        <div style={{...base, color: 'transparent', WebkitTextStroke: '1px #61e6c530', opacity: 1-settled}}>{letter}</div>
        {[0,1,2].map(slice => {
          const assemble = spring({frame: clock-(7+i*6+slice*3), fps:30, config:{damping:22,stiffness:110}});
          const sign = (i+slice)%2 ? 1 : -1;
          return <div key={slice} style={{...base, color: i>2 ? mint : '#f3faf8', clipPath: `inset(${slice*33.333}% 0 ${100-(slice+1)*33.333}% 0)`, opacity: Math.min(1,assemble)*(1-settled), transform:`translate(${(1-assemble)*sign*230}px,${(1-assemble)*(slice-1)*120}px) rotate(${(1-assemble)*sign*12}deg)`}}>{letter}</div>;
        })}
        <div style={{...base, opacity: settled, color: 'transparent', backgroundImage: 'linear-gradient(130deg, #ffffff 0%, #e5fcf4 45%, #61e6c5 100%)', backgroundClip:'text', WebkitBackgroundClip:'text'}}>{letter}</div>
      </div>;
    })}
    <div style={{position:'absolute', left: 14, right: 16, bottom: 0, height: 1, background:'linear-gradient(90deg, #61e6c5, #61e6c500)', transform:`scaleX(${settled})`, transformOrigin:'left'}}/>
  </div>;
}

export function Wordmark({closing = false, signupUrl}: {closing?: boolean; signupUrl: string}) {
  const frame = useCurrentFrame();
  const enter = reveal(frame, 8);
  const text = reveal(frame, closing ? 14 : 54);
  const fade = interpolate(frame,[0,9],[0,1],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <AbsoluteFill style={{background:'#071c22',color:'white',opacity:closing?fade:1,overflow:'hidden'}}>
    <AbsoluteFill style={{background:'radial-gradient(ellipse at 75% 40%, #0d6b6650, transparent 60%), linear-gradient(130deg, #06171e 20%, #0c3032 100%)'}}/>
    <AbsoluteFill style={{backgroundImage:'radial-gradient(#70ddc516 1px, transparent 1px)',backgroundSize:'30px 30px'}}/>
    <svg width="1920" height="1080" style={{position:'absolute',opacity:.45}}>
      <defs><linearGradient id="circuit" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#61e6c5" stopOpacity="0"/><stop offset="1" stopColor="#61e6c5"/></linearGradient></defs>
      <path d="M0 820 H330 L430 920 H970 L1110 780 H1920" stroke="url(#circuit)" fill="none"/>
      <path d="M0 840 H320 L420 940 H980 L1130 790 H1920" stroke="#61e6c515" fill="none"/>
      <circle cx={430+Math.min(frame/100,1)*540} cy="920" r="4" fill={mint}/>
      <path d="M1010 0 V150 L1110 250 H1920" stroke="#61e6c51c" fill="none"/>
    </svg>
    <div style={{position:'absolute',left:110,top:68,display:'flex',alignItems:'center',gap:18}}>
      <Img src={staticFile('logo.webp')} style={{width:62,height:62}}/>
      <div><div style={{fontSize:19,fontWeight:700,letterSpacing:3}}>SPECS</div><div style={{fontSize:12,color:muted,letterSpacing:2,marginTop:3}}>PARTIDO STATE UNIVERSITY</div></div>
    </div>
    <div style={{position:'absolute',right:110,top:86,color:muted,fontSize:16,letterSpacing:3}}>A COMMUNITY FOR BSCS STUDENTS</div>
    <div style={{position:'absolute',left:110,top:closing?259:224,display:'flex',alignItems:'center',gap:15,opacity:enter}}>
      <span style={{width:32,height:2,background:mint}}/>
      <span style={{fontSize:18,letterSpacing:4,color:mint}}>{closing?'BELONG. BUILD. BECOME.':'YOUR PEOPLE. YOUR POSSIBILITIES.'}</span>
    </div>
    <AssembledWord closing={closing}/>
    <div style={{position:'absolute',left:110,top:closing?668:631,width:850,opacity:text,transform:`translateY(${(1-text)*22}px)`}}>
      <div style={{fontSize:closing?28:36,lineHeight:1.45,fontWeight:600}}>{closing?'Your community. Your next chapter.':'Computer Science is better together.'}</div>
      <div style={{fontSize:21,lineHeight:1.7,color:muted,marginTop:18,maxWidth:710}}>Society of Programmers and Enthusiasts<br/>in Computer Science</div>
    </div>
    {closing ? <div style={{position:'absolute',left:1120,top:252,width:660,height:594,boxSizing:'border-box',padding:'43px 46px',borderRadius:32,background:'linear-gradient(135deg,#e9fff6,#a6ebd4)',boxShadow:'0 38px 95px #00000040',color:'#093d3b',opacity:enter,transform:`translateY(${(1-enter)*65}px) rotate(${(1-enter)*3}deg)`}}>
      <div style={{fontSize:14,fontWeight:700,letterSpacing:3}}>THE NEXT STEP IS YOURS</div>
      <div style={{fontSize:55,lineHeight:1.12,fontWeight:800,letterSpacing:-2,marginTop:23}}>Your next<br/>chapter awaits.</div>
      <div style={{fontSize:20,lineHeight:1.6,marginTop:21}}>Make the most of your BSCS journey.</div>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',background:'#0d6b66',color:'white',borderRadius:15,padding:'19px 23px',fontSize:24,fontWeight:600,marginTop:28}}>Create your account <span style={{fontSize:29}}>↗</span></div>
      <div style={{fontSize:29,fontWeight:700,letterSpacing:-.7,marginTop:25}}>{signupUrl}</div>
      <div style={{fontSize:16,color:'#316b60',marginTop:13}}>Use your @parsu.edu.ph email and student ID.</div>
    </div> : <div style={{position:'absolute',left:1170,top:222,width:610,height:610,opacity:enter,transform:`scale(${.86+enter*.14}) translateY(${Math.sin(frame/45)*5}px)`}}>
      {[590,505,427].map((size,i)=><div key={size} style={{position:'absolute',left:(610-size)/2,top:(610-size)/2,width:size,height:size,borderRadius:'50%',border:`1px ${i===1?'dashed':'solid'} ${i===2?'#61e6c53a':'#61e6c520'}`,transform:`rotate(${frame*(i===1?-.12:.1)}deg)`}}/>)}
      <div style={{position:'absolute',inset:125,borderRadius:'50%',background:'linear-gradient(140deg,#184d4c,#082a30)',boxShadow:'inset 0 1px 1px #baffdf66, 0 28px 70px #00000044',display:'grid',placeItems:'center'}}><Img src={staticFile('logo.webp')} style={{width:300,height:300,filter:'drop-shadow(0 10px 18px #00000030)'}}/></div>
      <div style={{position:'absolute',top:87,left:48,width:14,height:14,borderRadius:'50%',background:mint,boxShadow:'0 0 22px #61e6c580'}}/>
      <div style={{position:'absolute',right:1,bottom:128,padding:'15px 21px',border:'1px solid #61e6c550',background:'#0b3338',borderRadius:12,color:mint,fontFamily:'monospace',fontSize:25,transform:`translateY(${Math.sin(frame/30)*6}px)`}}>{'<hello, future />'}</div>
      <div style={{position:'absolute',left:5,bottom:80,fontSize:15,letterSpacing:3,color:muted}}>LEARN. BUILD. BELONG.</div>
    </div>}
    <div style={{position:'absolute',left:110,right:110,bottom:74,borderTop:'1px solid #86cbb726',paddingTop:26,display:'flex',alignItems:'center',justifyContent:'space-between',opacity:text}}>
      <div style={{display:'flex',gap:36}}>{['CONNECT','LEARN','GROW'].map((word,i)=><span key={word} style={{fontSize:16,letterSpacing:3,color:'#c9e2dd'}}><span style={{color:mint,marginRight:12,fontSize:12}}>0{i+1}</span>{word}</span>)}</div>
      <span style={{fontSize:15,color:muted,letterSpacing:2}}>{closing?'SEE YOU IN SPECS ↗':'YOUR SPECS JOURNEY STARTS HERE'}</span>
    </div>
  </AbsoluteFill>;
}
