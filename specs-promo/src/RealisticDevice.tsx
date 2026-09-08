import {interpolate, spring, useCurrentFrame} from 'remotion';
import {PortalScreen} from './PortalScreen';

const teal='#0d6b66';
const enter=(f:number,d=0)=>spring({frame:f-d,fps:30,config:{damping:25,stiffness:100}});

function DetailPanel({kind}:{kind:string}) {
  const frame=useCurrentFrame();
  const progress=interpolate(frame,[35,92],[0,.8],{extrapolateLeft:'clamp',extrapolateRight:'clamp'});
  return <>
    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',borderBottom:'1px solid #e6eeee',paddingBottom:16,marginBottom:19}}><span style={{fontSize:12,fontWeight:700,letterSpacing:2,color:teal}}>SPECS PORTAL</span><span style={{fontSize:11,color:'#829391'}}>DEMO PREVIEW</span></div>
    {kind==='events'?<>
      <div style={{fontSize:12,color:'#788b89'}}>FEATURED ACTIVITY</div>
      <div style={{fontSize:25,fontWeight:700,lineHeight:1.3,margin:'9px 0 17px'}}>Coding Workshop</div>
      <div style={{fontSize:17,color:'#617572',lineHeight:1.8}}>Explore event details.<br/>Find your next learning moment.</div>
      <div style={{marginTop:22,padding:'13px 17px',borderRadius:10,background:teal,color:'white',fontSize:17,display:'flex',justifyContent:'space-between'}}>View event <span>↗</span></div>
    </>:kind==='attendance'?<>
      <div style={{fontSize:17,color:'#617572'}}>Attendance overview</div>
      <div style={{display:'flex',alignItems:'baseline',gap:12,marginTop:4}}><strong style={{fontSize:54,letterSpacing:-2}}>{Math.round(progress*100)}<span style={{fontSize:25}}>%</span></strong><span style={{fontSize:15,color:teal}}>participation</span></div>
      <div style={{height:9,background:'#e5eeec',borderRadius:8,overflow:'hidden',margin:'14px 0 20px'}}><div style={{height:'100%',width:`${progress*100}%`,background:'linear-gradient(90deg,#0d6b66,#4bc5a9)',borderRadius:8}}/></div>
      <div style={{display:'flex',justifyContent:'space-between',fontSize:17}}><span>4 attended</span><span style={{color:'#78908a'}}>5 activities</span></div>
      <div style={{fontSize:11,color:'#8a9c98',marginTop:15}}>Sample attendance records</div>
    </>:kind==='payments'?<>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:22,fontWeight:700}}>Payment record</span><span style={{fontSize:12,background:'#def4e9',color:teal,padding:'5px 9px',borderRadius:20}}>PAID</span></div>
      {[['Description','Membership dues'],['Amount','₱150.00'],['Method','Cash']].map(([a,b])=><div key={a} style={{display:'flex',justifyContent:'space-between',fontSize:15,marginTop:22}}><span style={{color:'#78908a'}}>{a}</span><b>{b}</b></div>)}
      <div style={{borderTop:'1px dashed #ccdcd7',marginTop:23,paddingTop:13,fontSize:11,color:'#83958f'}}>Illustrative payment record</div>
    </>:kind==='stories'?<>
      <div style={{display:'flex',alignItems:'center',gap:12}}><div style={{height:40,width:40,borderRadius:'50%',display:'grid',placeItems:'center',background:'#def2eb',color:teal,fontSize:14,fontWeight:700}}>CS</div><div><b style={{fontSize:17}}>Your student story</b><div style={{fontSize:12,color:'#82958f'}}>Student volunteer contribution</div></div></div>
      <div style={{fontSize:23,lineHeight:1.45,fontWeight:600,marginTop:20}}>Small ideas.<br/>Meaningful beginnings.</div>
      <div style={{marginTop:19,borderTop:'1px solid #e6eeee',paddingTop:15,display:'flex',justifyContent:'space-between',fontSize:14,color:teal}}><span>Draft preview</span><span>Submit for review ↗</span></div>
    </>:<>
      <div style={{fontSize:23,fontWeight:700}}>A few details.<br/>A whole community.</div>
      {['Official PSU email','Your student ID','Your BSCS profile'].map(t=><div key={t} style={{fontSize:17,marginTop:17,display:'flex',gap:12}}><span style={{color:teal}}>✓</span>{t}</div>)}
    </>}
  </>;
}

export function DeviceStage({kind,side,duration}:{kind:string;side:'left'|'right';duration:number}) {
  const frame=useCurrentFrame();
  const left=side==='left',direction=left?-1:1;
  const appear=enter(frame,5),panel=enter(frame,38);
  const camera=interpolate(frame,[0,40,duration-15],left?[.9,.98,1.025]:[1.08,1.015,.97],{extrapolateRight:'clamp'});
  const turn=interpolate(frame,[0,60,duration],[-20,-8,-4],{extrapolateRight:'clamp'})*direction;
  return <div style={{position:'absolute',...(left?{left:55}:{right:65}),top:193,width:830,height:755,perspective:1800,transform:`translateX(${direction*(1-appear)*110}px) scale(${camera})`,transformOrigin:'50% 45%'}}>
    <div style={{position:'absolute',left:55,top:25,width:730,height:670,borderRadius:'50%',background:'radial-gradient(ellipse,#c4e5db75,transparent 68%)'}}/>
    <div style={{position:'absolute',left:left?54:303,top:707,width:438,height:40,borderRadius:'50%',background:'radial-gradient(ellipse,#122d3540,transparent 68%)',filter:'blur(9px)',opacity:appear}}/>
    <div style={{position:'absolute',left:left?86:353,top:0,width:370,height:710,boxSizing:'border-box',padding:9,borderRadius:49,border:'2px solid #667477',background:'linear-gradient(105deg,#b0bdbd 0%,#253439 5%,#07171c 48%,#69817f 96%,#a9bbb6)',boxShadow:`${direction*7}px 8px 0 #1b3032, ${direction*13}px 20px 35px #12242e35, inset 0 0 2px 2px #c7ded9`,transform:`translateY(${(1-appear)*90+Math.sin(frame/60)*3}px) rotateY(${turn}deg) rotateZ(${direction*2}deg)`,opacity:appear}}>
      <div style={{position:'absolute',left:-5,top:142,width:4,height:48,borderRadius:3,background:'linear-gradient(#abc0bb,#415653,#aec0ba)'}}/>
      <div style={{position:'absolute',left:-5,top:204,width:4,height:48,borderRadius:3,background:'linear-gradient(#abc0bb,#415653,#aec0ba)'}}/>
      <div style={{position:'absolute',right:-5,top:175,width:4,height:69,borderRadius:3,background:'linear-gradient(#abc0bb,#415653,#aec0ba)'}}/>
      <div style={{height:'100%',borderRadius:38,overflow:'hidden',position:'relative',background:'#f5f8f7',boxShadow:'0 0 0 1px #031116'}}>
        <PortalScreen kind={kind}/>
        <div style={{position:'absolute',top:9,left:'50%',transform:'translateX(-50%)',width:91,height:23,borderRadius:18,background:'#061215',boxShadow:'inset 0 1px 2px #223637'}}><span style={{position:'absolute',right:9,top:7,width:9,height:9,borderRadius:'50%',background:'radial-gradient(circle at 35% 35%,#204b65,#020b11 75%)'}}/></div>
        <div style={{position:'absolute',top:0,bottom:0,left:0,right:0,borderRadius:38,pointerEvents:'none',background:'linear-gradient(113deg, #ffffff13 0%, #ffffff00 38%, #ffffff00 86%, #ffffff10 100%)'}}/>
        <div style={{position:'absolute',bottom:8,left:'50%',transform:'translateX(-50%)',width:104,height:4,borderRadius:6,background:'#12282a'}}/>
      </div>
    </div>
    <div style={{position:'absolute',left:left?410:8,top:kind==='payments'?265:kind==='cta'?335:310,width:359,boxSizing:'border-box',background:'#fffffffa',border:'1px solid #d9e7e1',padding:25,borderRadius:19,boxShadow:'0 20px 50px #0b2d3022, 0 2px 5px #12372c09',color:'#153c38',opacity:panel,transform:`translateY(${(1-panel)*50}px)`}}><DetailPanel kind={kind}/></div>
    <div style={{position:'absolute',bottom:3,left:left?107:371,fontSize:12,color:kind==='cta'?'#9dbdb7':'#728c84'}}>Portal demo • Illustrative student data</div>
  </div>;
}
