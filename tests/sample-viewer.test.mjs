import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const source=readFileSync(new URL('../public/assets/sample.js',import.meta.url),'utf8');
async function render(status,key='sample.pdf',query=''){
 const elements=new Map();
 function el(id){
  if(!elements.has(id))elements.set(id,{id,hidden:false,textContent:'',href:'',className:'',before() {}});
  return elements.get(id);
 }
 const page={getElementById:el,createElement:()=>({className:'',textContent:''}),title:'Original'};
 const location={search:`?file=${encodeURIComponent(key)}&label=Original${query}`,replaced:null,replace(url){this.replaced=url;}};
 let calls=0;
 const context={document:page,location,URLSearchParams,encodeURIComponent,fetch:async()=>{calls++;return {status,ok:status>=200&&status<300};}};
 vm.runInNewContext(source,context);
 await new Promise(resolve=>setImmediate(resolve));
 return {elements,location,calls,get:el};
}

test('404 leaves the viewer open with readable missing-file message',async()=>{
 const r=await render(404);
 assert.equal(r.location.replaced,null);
 assert.equal(r.get('sample-error').hidden,false);
 assert.match(r.get('sample-error-heading').textContent,/not available yet/);
 assert.match(r.get('sample-email').href,/mailto:/);
 assert.equal(r.calls,1);
});
test('expired session shows sign-in action instead of an empty popup',async()=>{
 const r=await render(401);
 assert.equal(r.location.replaced,null);
 assert.match(r.get('sample-error-heading').textContent,/access has expired/);
 assert.equal(r.get('sample-email').hidden,true);
});
test('PDF and MP4 open in browser only after HEAD check',async()=>{
 const pdf=await render(200);
 assert.equal(pdf.location.replaced,'/api/asset/sample.pdf?view=1');
 const mp4=await render(200,'video.mp4');
 assert.equal(mp4.location.replaced,'/api/asset/video.mp4?play=1');
});
test('PowerPoint shows a download CTA instead of attempting browser rendering',async()=>{
 const p=await render(200,'deck.pptx');
 assert.equal(p.location.replaced,null);
 assert.equal(p.get('sample-actions').hidden,false);
 assert.equal(p.get('sample-download').href,'/api/asset/deck.pptx');
 assert.match(p.get('sample-download').textContent,/PowerPoint/);
});
test('invalid file keys do not call the API',async()=>{
 const r=await render(200,'../escape');
 assert.equal(r.calls,0);
 assert.equal(r.get('sample-error').hidden,false);
});
