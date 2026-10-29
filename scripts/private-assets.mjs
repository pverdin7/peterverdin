import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const mode=process.argv[2]||'check';
if(!['check','sync','upload'].includes(mode))throw Error('Use check, sync, or upload.');
const source='private/case-studies.json';
if(!fs.existsSync(source))throw Error('Run this command from the full build package containing private/.');
const cases=JSON.parse(fs.readFileSync(source,'utf8'));
const assets=cases.flatMap(c=>(c.assets||[]).map(a=>({project:c.number,project_id:c.id,title:c.title,...a})));
const keys=new Set();
const hosted=a=>Object.hasOwn(a,'externalUrl');
const validHostedURL=value=>typeof value==='string'&&/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(value)&&new URL(value).href===value;
for(const a of assets){
 if(!/^[a-z0-9][a-z0-9._-]{0,150}$/.test(a.key)||a.key.includes('..')||keys.has(a.key))throw Error('Invalid or duplicate asset key: '+a.key);
 keys.add(a.key);
 if(hosted(a)&&(a.kind!=='VIDEO'||!validHostedURL(a.externalUrl)))throw Error('Invalid hosted video URL for: '+a.key);
 const file=path.join('private/originals',a.key),exists=hosted(a)||(fs.existsSync(file)&&fs.statSync(file).isFile());
 if(mode==='sync'){
  cases.find(c=>c.id===a.project_id).assets.find(x=>x.key===a.key).available=exists;
  a.available=exists;
 }else if(a.available&&!exists)throw Error('An enabled download has no local original: '+a.key);
}
if(mode==='sync'){
 fs.writeFileSync(source,JSON.stringify(cases,null,2)+'\n');
 fs.writeFileSync('private/asset-manifest.json',JSON.stringify(assets,null,2)+'\n');
}
const ready=assets.filter(a=>a.available),pending=assets.filter(a=>!a.available);
const downloads=ready.filter(a=>!hosted(a)),videos=ready.filter(hosted);
console.log(cases.length+' case studies; '+downloads.length+' included downloads; '+videos.length+' hosted videos; '+pending.length+' request-only samples.');
if(mode==='upload'){
 const bucketIndex=process.argv.indexOf('--bucket');
 const bucket=bucketIndex>=0?process.argv[bucketIndex+1]:'peter-verdin-private';
 if(!/^[a-z0-9][a-z0-9-]{1,61}[a-z0-9]$/.test(bucket||''))throw Error('Provide a valid R2 bucket name with --bucket.');
 const wrangler=path.resolve('node_modules/wrangler/bin/wrangler.js');
 if(!fs.existsSync(wrangler))throw Error('Run npm ci before uploading.');
 const types={pdf:'application/pdf',pptx:'application/vnd.openxmlformats-officedocument.presentationml.presentation',mp4:'video/mp4',png:'image/png',jpg:'image/jpeg',webp:'image/webp'};
 const put=(key,file,type)=>{
  const r=spawnSync(process.execPath,[wrangler,'r2','object','put',bucket+'/'+key,'--remote','--file',file,'--content-type',type],{stdio:'inherit'});
  if(r.error||r.status!==0)throw Error('Upload stopped; case manifest not advanced: '+key);
 };
 for(const a of downloads)put('files/'+a.key,path.join('private/originals',a.key),types[a.key.split('.').pop()]||'application/octet-stream');
 put('case-studies.json',source,'application/json');
 console.log('Private files uploaded, then the case manifest. Bucket sharing was not changed.');
}
