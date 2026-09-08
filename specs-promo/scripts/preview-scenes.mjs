import {bundle} from '@remotion/bundler';
import {selectComposition, renderStill} from '@remotion/renderer';
import {mkdirSync} from 'node:fs';
import {resolve} from 'node:path';

const browserExecutable=process.env.REMOTION_BROWSER_EXECUTABLE || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
mkdirSync('out',{recursive:true});
const serveUrl=await bundle({entryPoint:resolve('src/index.tsx'),outDir:resolve('out/preview-bundle')});
const composition=await selectComposition({serveUrl,id:'SpecsPromo',browserExecutable});
const shots=[['events',340],['attendance',520],['payments',745],['stories',965],['signup',1170]];
// Two workers share the bundle and render independent review frames.
await Promise.all([0,1].map(async worker=>{
  for(let i=worker;i<shots.length;i+=2){
    const [name,frame]=shots[i];
    await renderStill({serveUrl,composition,browserExecutable,frame,output:resolve(`out/realistic-${name}.png`),imageFormat:'png'});
    console.log(`Reviewed frame ready: ${name} (${frame})`);
  }
}));
