import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../public/assets/sample.js',import.meta.url),'utf8');
const markup=readFileSync(new URL('../public/sample/index.html',import.meta.url),'utf8');
const realIds=new Set([...markup.matchAll(/\bid=\"([^\"]+)\"/g)].map(match=>match[1]));

test('viewer markup defines every ID used by JavaScript',()=>{
 for(const [,id] of source.matchAll(/\$\('([^']+)'\)/g)){
  assert.ok(realIds.has(id),`Viewer markup is missing #${id}`);
 }
});
function fakeNode(){return {hidden:false,textContent:'',href:'',className:'',value:'',max:'',disabled:false,src:'',alt:'',replaceChildren(...children){this.children=children;},classList:{add(){}},addEventListener(){},setAttribute(){},load(){}};}
async function render(status,key='sample.pdf',pages=2){
 const elements=new Map();const el=id=>{if(!realIds.has(id))return null;if(!elements.has(id))elements.set(id,fakeNode());return elements.get(id);};
 const document={title:'Original',getElementById:el,createElement:tag=>({...fakeNode(),tagName:tag}),addEventListener(){}};
 const location={search:'?file='+encodeURIComponent(key)+'&label=Original',replaced:null,replace(url){this.replaced=url;}};
 const calls=[];
 function Image(){Object.assign(this,fakeNode());this.loading='';this.draggable=true;}
 const fetch=async(url,options)=>{calls.push({url,options});return {status,ok:status>=200&&status<300,async json(){return {pages,format:'webp'};}};};
 vm.runInNewContext(source,{document,location,URLSearchParams,encodeURIComponent,fetch,Image,Number});
 await new Promise(resolve=>setImmediate(resolve));
 return {get:el,calls,location};
}
test('missing preview leaves viewer open with readable error',async()=>{
 const r=await render(404);assert.equal(r.location.replaced,null);
 assert.equal(r.get('sample-error').hidden,false);assert.match(r.get('sample-error-heading').textContent,/not available yet/);
 assert.equal(r.calls[0].url,'/api/preview/sample.pdf/manifest');
});
test('expired session shows sign-in action',async()=>{
 const r=await render(401);assert.match(r.get('sample-error-heading').textContent,/access has expired/);assert.equal(r.get('sample-email').hidden,true);
});
test('PDF and PowerPoint load watermarked page images, never original file URLs',async()=>{
 for(const key of ['sample.pdf','deck.pptx']){
  const r=await render(200,key);assert.equal(r.location.replaced,null);
  assert.equal(r.get('sample-view').hidden,false);
  assert.equal(r.get('sample-media').children[0].src,'/api/preview/'+key+'/1');
  assert.match(r.get('sample-page-counter').textContent,/PAGE 1 \/ 2/);
  assert.ok(!r.calls.some(call=>call.url.includes('/api/asset/')));
 }
});
test('video plays inline without direct download actions',async()=>{
 const r=await render(200,'video.mp4');assert.equal(r.location.replaced,null);
 assert.equal(r.get('sample-media').children[0].src,'/api/asset/video.mp4?play=1');
 assert.equal(r.get('sample-media').children[0].controls,true);
 assert.equal(r.get('sample-view').hidden,false);
 assert.equal(r.calls.length,0,'video viewer should not block playback on a HEAD request');
});
test('invalid asset key does not access the API',async()=>{
 const r=await render(200,'../escape');assert.equal(r.calls.length,0);
 assert.equal(r.get('sample-error').hidden,false);
});
