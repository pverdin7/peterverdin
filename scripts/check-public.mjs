import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve('public');
const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);
const files=walk(root),errors=[];
for(const file of files){
 const rel=path.relative(root,file);
 if(/(^|\/)(private|owner-review|originals)(\/|$)|case-studies\.json|asset-manifest|\.dev\.vars|\.env|schema\.sql|\.pdf$/i.test(rel))errors.push('Private/config document in public output: '+rel);
 if(/\.(html|js|json|svg|css)$/.test(file)){
  const text=fs.readFileSync(file,'utf8');
  if(/OWNER_PREVIEW|PREVIEW_CASES|PREVIEW_PAGES|PREVIEW_IMAGES|previewCodeDigest|data-preview-unlock|re_[A-Za-z0-9]{20,}/.test(text))errors.push('Owner-preview data or possible secret in public output: '+rel);
  if(/pverdin7@gmail\.com/.test(text))errors.push('Old portfolio contact in '+rel);
  for(const [,address] of text.matchAll(/mailto:([^?"'<>\s]+)/g))if(address!=='goldinthecracksofficial@gmail.com')errors.push('Unexpected contact destination in '+rel);
 }
}
const projectSource=fs.readFileSync(path.join(root,'assets/projects.js'),'utf8');
const publicProjects=JSON.parse(projectSource.slice(projectSource.indexOf('=')+1).trim().replace(/;$/,''));
for(const p of publicProjects)if(['challenge','approach','impact','assets'].some(key=>key in p))errors.push('Private case fields in public project '+p.id);
if(errors.length){console.error(errors.join('\n'));process.exit(1);}
console.log('Public boundary passed: '+files.length+' files; '+publicProjects.length+' teaser records; no bundled private cases or owner preview.');
