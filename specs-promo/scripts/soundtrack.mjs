// Original synthesized score; no external recordings. Run from specs-promo.
import {mkdirSync, writeFileSync} from 'node:fs';
const rate=44100, duration=45, tau=Math.PI*2;
const left=new Float32Array(rate*duration), right=new Float32Array(rate*duration);
let seed=719;
const noise=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0; return seed/2147483648-1;};
const hz=m=>440*2**((m-69)/12);
function add(start,length,sample,pan=0){
  const offset=Math.round(start*rate), count=Math.round(length*rate);
  const l=Math.sqrt((1-pan)/2),r=Math.sqrt((1+pan)/2);
  for(let i=0;i<count&&offset+i<left.length;i++){
    if(offset+i<0)continue;
    const value=sample(i/rate,i/count);
    left[offset+i]+=value*l;right[offset+i]+=value*r;
  }
}
function note(start,midi,length,gain,pan=0){
  const f=hz(midi);
  add(start,length,(t,p)=>gain*(1-Math.exp(-t*100))*Math.exp(-t*5)*Math.min(1,(1-p)*10)*(Math.sin(tau*f*t)+.22*Math.sin(tau*f*2*t)),pan);
}
// Warm harmony, soft percussion and stereo arpeggios at 112 BPM.
const beat=60/112, chords=[[50,57,61,66],[45,52,57,61],[52,59,62,66],[47,54,57,62]];
for(let bar=0;bar*4*beat<44;bar++){
  const start=bar*4*beat,chord=chords[bar%4];
  chord.forEach((m,i)=>{
    const f=hz(m);
    add(start,4*beat+.4,(t,p)=>.033*Math.min(1,t/.35)*Math.min(1,(1-p)*5)*(Math.sin(tau*f*t)+.32*Math.sin(tau*f*1.003*t)),(i-1.5)*.35);
  });
  for(let step=0;step<8;step++){
    const time=start+step*beat/2;if(time>43.5)continue;
    const midi=chord[[0,2,1,3,2,1,3,2][step]]+12;
    note(time,midi,.65,.065,step%2?.35:-.35);
    note(time+beat*.75,midi,.5,.018,step%2?-.55:.55);
  }
  for(let b=0;b<4;b++){
    const time=start+b*beat;if(time>43)continue;
    add(time,.28,t=>.17*Math.exp(-t*20)*Math.sin(tau*(47*t+38*.035*(1-Math.exp(-t/.035)))));
    if(b%2)add(time,.13,t=>.045*noise()*Math.exp(-t*32)*Math.min(1,t*150));
    add(time+beat/2,.06,(t,p)=>.022*noise()*(1-p)**3,.25);
    const f=hz(chord[0]-12);
    add(time,beat*.8,(t,p)=>.095*Math.min(1,t*65)*Math.min(1,(1-p)*6)*Math.sin(tau*f*t));
  }
}
// Swells and interface chimes align with the Remotion scene entrances.
for(const time of [0,6,14,21,28,35]){
  add(time,.65,(t,p)=>.065*Math.sin(Math.PI*p)**2*(.6*noise()+.4*Math.sin(tau*(350*t+650*t*t))),-.2);
  note(time+.28,78,.38,.075,.25);note(time+.43,85,.5,.045,-.25);
}
for(const time of [1,1.2,1.4,14.9,15.2,15.5])note(time,83,.12,.024,.2);
for(let i=0;i<18;i++)add(28.7+i*.09,.022,(t,p)=>.017*noise()*(1-p)**4,(i%3-1)*.3);
[74,78,81].forEach((m,i)=>note(36.15+i*.16,m,1.2,.11,(i-1)*.2));
// Each assembled letter gets a soft tone; the completed word resolves as a chord.
for(const start of [0,41]){
  [74,78,81,85,86].forEach((m,i)=>note(start+.5+i*.23,m,.5,.06,(i-2)*.22));
  [62,69,74,78].forEach(m=>note(start+2.15,m,1.5,.045));
}
// Gentle fades and peak normalization, then PCM16 stereo WAV output.
let peak=0;
for(let i=0;i<left.length;i++){
  const time=i/rate,fade=Math.min(1,time/.8,Math.max(0,(duration-time)/1.7));
  left[i]*=fade;right[i]*=fade;peak=Math.max(peak,Math.abs(left[i]),Math.abs(right[i]));
}
const gain=.78/peak,data=Buffer.alloc(44+left.length*4);
data.write('RIFF',0);data.writeUInt32LE(data.length-8,4);data.write('WAVEfmt ',8);
data.writeUInt32LE(16,16);data.writeUInt16LE(1,20);data.writeUInt16LE(2,22);
data.writeUInt32LE(rate,24);data.writeUInt32LE(rate*4,28);data.writeUInt16LE(4,32);data.writeUInt16LE(16,34);
data.write('data',36);data.writeUInt32LE(data.length-44,40);
for(let i=0;i<left.length;i++){
  data.writeInt16LE(Math.round(left[i]*gain*32767),44+i*4);
  data.writeInt16LE(Math.round(right[i]*gain*32767),46+i*4);
}
mkdirSync('public',{recursive:true});writeFileSync('public/soundtrack.wav',data);
console.log('Generated original 45s stereo score with synchronized effects; peak -2.16 dBFS.');
