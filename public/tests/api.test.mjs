import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {onRequest} from '../functions/api/[[path]].js';

class D1 {
 constructor(){this.db=new DatabaseSync(':memory:');this.db.exec(fs.readFileSync(new URL('../schema.sql',import.meta.url),'utf8'));}
 prepare(sql){const db=this.db;let args=[];return {bind(...values){args=values;return this;},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const r=db.prepare(sql).run(...args);return {meta:{changes:Number(r.changes)}};}};}
 async batch(statements){this.db.exec('BEGIN');try{const results=[];for(const s of statements)results.push(await s.run());this.db.exec('COMMIT');return results;}catch(e){this.db.exec('ROLLBACK');throw e;}}
}
function fixture(){
 const db=new D1(),sent=[],objects=new Map(),metadata=new Map();
 const network={emailStatus:200,challengeHostname:'example.com',challengeAction:null};
 objects.set('case-studies.json',JSON.stringify([{id:'test',challenge:'PRIVATE SENTINEL',assets:[{key:'sample.pdf',available:true}]}]));objects.set('files/sample.pdf','%PDF-TEST');
 const env={DB:db,PRIVATE_ASSETS:{async get(key,opts){if(!objects.has(key))return null;const value=objects.get(key);const b=new TextEncoder().encode(value);const range=opts?.range;let body=b,r;if(range){const off=range.offset??(b.length-range.suffix),len=range.length??range.suffix;r={offset:off,length:len};body=b.slice(off,off+len);}return {json:async()=>JSON.parse(value),body,size:b.length,range:r};},async head(key){if(!objects.has(key))return null;return {size:new TextEncoder().encode(objects.get(key)).length,writeHttpMetadata(headers){for(const [name,value] of Object.entries(metadata.get(key)||{}))headers.set(name,value);}};}},RESEND_API_KEY:'unit-test-not-a-real-key',EMAIL_FROM:'Test <access@example.com>',ADMIN_EMAIL:'owner@example.com',OWNER_PASSWORD:'owner-secret-with-more-than-twenty-characters',PORTFOLIO_PASSWORD:'visitor-secret-only-for-tests',SITE_ORIGIN:'https://example.com',TURNSTILE_SITE_KEY:'unit-test-key',TURNSTILE_SECRET_KEY:'unit-test-secret',RATE_LIMIT_SALT:'unit-test-long-salt-for-hashing-ip-identifiers'};
 const oldFetch=globalThis.fetch;
 globalThis.fetch=async(url,opts)=>{
  const body=JSON.parse(opts.body);
  if(String(url).includes('siteverify'))return Response.json({success:body.response.startsWith('valid-'),hostname:network.challengeHostname,action:network.challengeAction??body.response.replace('valid-','')});
  if(String(url).includes('api.resend.com')){sent.push(body);return Response.json(network.emailStatus===200?{id:crypto.randomUUID()}:{error:'Test delivery failure'},{status:network.emailStatus});}
  throw new Error('Unexpected external request');
 };
 async function call(path,data,{cookie,origin='https://example.com',method,ip='192.0.2.1',headers={}}={}){
  const pending=[];const h={Origin:origin,'CF-Connecting-IP':ip,...headers};if(data!==undefined)h['Content-Type']='application/json';if(cookie)h.Cookie=cookie;
  const req=new Request('https://example.com/api/'+path,{method:method??(data===undefined?'GET':'POST'),headers:h,...(data!==undefined?{body:JSON.stringify(data)}:{})});
  const res=await onRequest({request:req,env,waitUntil:p=>pending.push(p)});await Promise.all(pending);return res;
 }
 return {env,db,sent,objects,metadata,network,call,close(){globalThis.fetch=oldFetch;db.db.close();}};
}
const cookieHeader=r=>r.headers.get('Set-Cookie')?.split(';')[0];

test('inline video playback stays authorized and supports seeking without changing download defaults',async()=>{const f=fixture();try{
 f.objects.set('case-studies.json',JSON.stringify([{id:'test',assets:[{key:'lesson.mp4',kind:'VIDEO',available:true}]}]));
 f.objects.set('files/lesson.mp4','0123456789');
 f.metadata.set('files/lesson.mp4',{'Content-Type':'text/html','Content-Disposition':'attachment','Cache-Control':'public, max-age=31536000'});
 for(const method of ['GET','HEAD'])assert.equal((await f.call('asset/lesson.mp4?play=1',undefined,{method})).status,401);
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'}),visitor=cookieHeader(login);
 let r=await f.call('asset/lesson.mp4',undefined,{cookie:visitor});
 assert.equal(r.status,403);assert.equal(r.headers.get('Content-Disposition'),null);
 r=await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor});
 assert.equal(r.status,200);assert.equal(r.headers.get('Content-Disposition'),'inline');
 assert.equal(r.headers.get('Content-Type'),'video/mp4');assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('Accept-Ranges'),'bytes');assert.equal(r.headers.get('X-Content-Type-Options'),'nosniff');assert.equal(await r.text(),'0123456789');
 r=await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor,method:'HEAD'});
 assert.equal(r.status,200);assert.equal(r.headers.get('Content-Length'),'10');assert.equal(await r.text(),'');
 for(const [range,body,contentRange] of [['bytes=0-3','0123','bytes 0-3/10'],['bytes=4-','456789','bytes 4-9/10'],['bytes=-4','6789','bytes 6-9/10']]){
  r=await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor,headers:{Range:range}});
  assert.equal(r.status,206);assert.equal(await r.text(),body);assert.equal(r.headers.get('Content-Range'),contentRange);assert.equal(r.headers.get('Content-Length'),String(body.length));assert.equal(r.headers.get('Content-Disposition'),'inline');
 }
 assert.equal((await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor,headers:{Range:'bytes=30-40'}})).status,416);
 await f.call('logout',{}, {cookie:visitor});assert.equal((await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor})).status,401);
}finally{f.close();}});

test('inline playback is limited to declared MP4 videos and cannot inline documents',async()=>{const f=fixture();try{
 f.objects.set('case-studies.json',JSON.stringify([{id:'test',assets:[{key:'sample.pdf',kind:'PDF',available:true},{key:'undeclared.mp4',kind:'FILE',available:true},{key:'unavailable.mp4',kind:'VIDEO',available:false}]}]));
 f.objects.set('files/undeclared.mp4','0123456789');f.objects.set('files/unavailable.mp4','0123456789');
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'}),visitor=cookieHeader(login);
 for(const key of ['sample.pdf','undeclared.mp4']){
  const r=await f.call('asset/'+key+'?play=1',undefined,{cookie:visitor});assert.equal(r.status,403);assert.equal(r.headers.get('Content-Disposition'),null);
 }
 assert.equal((await f.call('asset/unavailable.mp4?play=1',undefined,{cookie:visitor})).status,404);
}finally{f.close();}});

test('unconfigured deployment fails closed',async()=>{
 const res=await onRequest({request:new Request('https://example.com/api/projects'),env:{}});assert.equal(res.status,503);assert.ok(!(await res.text()).includes('PRIVATE SENTINEL'));
 const cfg=await onRequest({request:new Request('https://example.com/api/config'),env:{}});assert.equal((await cfg.json()).ready,false);
});
test('unauthorized visitors cannot read case studies or original files',async()=>{const f=fixture();try{
 assert.equal((await f.call('projects')).status,401);assert.equal((await f.call('asset/sample.pdf')).status,401);assert.equal((await f.call('asset/sample.pdf',undefined,{method:'HEAD'})).status,401);
 const status=await f.call('session');assert.deepEqual(await status.json(),{authorized:false});
 const config=await (await f.call('config')).text();assert.ok(!config.includes(f.env.PORTFOLIO_PASSWORD));assert.ok(!config.includes(f.env.OWNER_PASSWORD));
}finally{f.close();}});
test('origin validation and invalid challenge reject submissions',async()=>{const f=fixture();try{
 const data={name:'Visitor',organization:'Example',email:'visitor@example.com',turnstileToken:'valid-request'};
 assert.equal((await f.call('request-access',data,{origin:'https://untrusted.invalid'})).status,403);
 assert.equal((await f.call('request-access',{...data,turnstileToken:'invalid'})).status,400);
 assert.equal((await f.call('request-access',{...data,email:'invalid-email'})).status,400);
 assert.equal(f.sent.length,0);
}finally{f.close();}});
test('request → owner approval → email link → one-time sign-in → revoke',async()=>{const f=fixture();try{
 let r=await f.call('request-access',{name:'<Visitor>',organization:'Example Org',email:'Visitor@example.com',project:'test',turnstileToken:'valid-request'});assert.equal(r.status,200);
 const person=f.db.db.prepare('SELECT * FROM access_requests').get();assert.equal(person.status,'pending');assert.equal(person.email,'visitor@example.com');assert.equal(f.sent.length,1);assert.equal(f.sent[0].to[0],'owner@example.com');assert.ok(f.sent[0].html.includes('&lt;Visitor&gt;'));assert.equal(f.sent[0].reply_to,'goldinthecracksofficial@gmail.com');
 r=await f.call('admin/login',{password:f.env.OWNER_PASSWORD,turnstileToken:'valid-admin'});assert.equal(r.status,200);const admin=cookieHeader(r);assert.ok(r.headers.get('Set-Cookie').includes('HttpOnly; Secure; SameSite=Lax'));
 assert.equal((await f.call('admin/requests',undefined,{cookie:admin})).status,200);
 r=await f.call('admin/action',{id:person.id,action:'approve'},{cookie:admin});assert.equal(r.status,200);assert.equal(f.sent.length,2);assert.equal(f.sent[1].reply_to,'goldinthecracksofficial@gmail.com');
 const token=f.sent[1].html.match(/#token=([a-f0-9]{64})/)[1];const stored=f.db.db.prepare('SELECT token_hash FROM login_tokens').get();assert.notEqual(stored.token_hash,token);
 r=await f.call('redeem',{token});assert.equal(r.status,200);const visitor=cookieHeader(r);assert.ok(visitor.startsWith('__Host-pv_session='));
 assert.equal((await f.call('redeem',{token})).status,401);
 r=await f.call('projects',undefined,{cookie:visitor});assert.equal(r.status,200);assert.ok((await r.text()).includes('PRIVATE SENTINEL'));assert.equal(r.headers.get('cache-control'),'private, no-store');
 r=await f.call('asset/sample.pdf',undefined,{cookie:visitor});assert.equal(r.status,403);assert.ok(!(await r.text()).includes('%PDF-TEST'));
 r=await f.call('asset/sample.pdf',undefined,{cookie:visitor,headers:{Range:'bytes=0-3'}});assert.equal(r.status,403);
 assert.equal((await f.call('asset/missing.pdf',undefined,{cookie:visitor})).status,404);
 r=await f.call('login',{email:person.email,turnstileToken:'valid-email'});assert.equal(r.status,200);const unusedToken=f.sent.at(-1).html.match(/#token=([a-f0-9]{64})/)[1];
 r=await f.call('admin/action',{id:person.id,action:'revoke'},{cookie:admin});assert.equal(r.status,200);assert.equal((await f.call('projects',undefined,{cookie:visitor})).status,401);assert.equal((await f.call('asset/sample.pdf',undefined,{cookie:visitor})).status,401);assert.equal((await f.call('redeem',{token:unusedToken})).status,401);
 assert.equal(f.db.db.prepare('SELECT COUNT(*) AS count FROM login_tokens').get().count,0);
}finally{f.close();}});
test('shared password authorizes server-side and rotation revokes its sessions',async()=>{const f=fixture();try{
 assert.equal((await f.call('password-login',{password:'wrong',turnstileToken:'valid-password'})).status,401);
 const r=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});assert.equal(r.status,200);const c=cookieHeader(r);
 assert.equal((await f.call('projects',undefined,{cookie:c})).status,200);f.env.PORTFOLIO_PASSWORD='a-different-visitor-password';assert.equal((await f.call('projects',undefined,{cookie:c})).status,401);
}finally{f.close();}});
test('repeated password attempts are rate-limited',async()=>{const f=fixture();try{
 let r;for(let n=0;n<9;n++)r=await f.call('password-login',{password:'wrong',turnstileToken:'valid-password'});assert.equal(r.status,429);
}finally{f.close();}});
test('oversized requests are rejected',async()=>{const f=fixture();try{const r=await f.call('request-access',{name:'x'.repeat(9000)});assert.equal(r.status,413);}finally{f.close();}});

test('owner configuration requires a separate password of 20 to 200 characters',async()=>{const f=fixture();try{
 for(const value of ['short','x'.repeat(201),f.env.PORTFOLIO_PASSWORD]){
  f.env.OWNER_PASSWORD=value;
  assert.equal((await (await f.call('config')).json()).ownerReady,false);
  assert.equal((await f.call('admin/login',{password:value,turnstileToken:'valid-admin'})).status,503);
 }
 assert.equal(f.db.db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,0);
}finally{f.close();}});

test('owner and visitor sessions cannot be exchanged; owner rotation and logout invalidate access',async()=>{const f=fixture();try{
 let r=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});const visitor=cookieHeader(r);
 assert.equal((await f.call('admin/requests',undefined,{cookie:visitor.replace('__Host-pv_session','__Host-pv_admin')})).status,401);
 assert.equal((await f.call('admin/login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-admin'})).status,401);
 r=await f.call('admin/login',{password:f.env.OWNER_PASSWORD,turnstileToken:'valid-admin'});const admin=cookieHeader(r);
 assert.equal((await f.call('projects',undefined,{cookie:admin.replace('__Host-pv_admin','__Host-pv_session')})).status,401);
 f.env.OWNER_PASSWORD='a-new-owner-password-with-more-than-twenty-characters';assert.equal((await f.call('admin/requests',undefined,{cookie:admin})).status,401);
 assert.equal((await f.call('projects',undefined,{cookie:visitor})).status,200);
 r=await f.call('logout',{}, {cookie:visitor});assert.equal(r.status,200);assert.ok(r.headers.get('Set-Cookie').includes('Max-Age=0'));assert.equal((await f.call('projects',undefined,{cookie:visitor})).status,401);
}finally{f.close();}});

test('Turnstile success must match both the hostname and the form action',async()=>{const f=fixture();try{
 const data={password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'};
 f.network.challengeHostname='another.example.com';assert.equal((await f.call('password-login',data)).status,400);
 f.network.challengeHostname='example.com';f.network.challengeAction='request';assert.equal((await f.call('password-login',data)).status,400);
 assert.equal(f.db.db.prepare('SELECT COUNT(*) AS count FROM sessions').get().count,0);
}finally{f.close();}});

test('expired sessions and disabled shared-code access fail closed',async()=>{const f=fixture();try{
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});const visitor=cookieHeader(login);
 f.db.db.prepare('UPDATE sessions SET expires_at=0').run();assert.equal((await f.call('projects',undefined,{cookie:visitor})).status,401);
 delete f.env.PORTFOLIO_PASSWORD;assert.equal((await (await f.call('config')).json()).passwordEnabled,false);
 assert.equal((await f.call('password-login',{password:'anything',turnstileToken:'valid-password'})).status,503);
}finally{f.close();}});

test('transactional Reply-To can be overridden without changing the verified sender or recipient',async()=>{const f=fixture();try{
 f.env.REPLY_TO='replies@example.com';
 const r=await f.call('request-access',{name:'Visitor',organization:'Example',email:'visitor@example.com',turnstileToken:'valid-request'});assert.equal(r.status,200);
 assert.equal(f.sent[0].reply_to,'replies@example.com');assert.equal(f.sent[0].from,f.env.EMAIL_FROM);assert.deepEqual(f.sent[0].to,[f.env.ADMIN_EMAIL]);
}finally{f.close();}});

test('failed delivery is reported truthfully and leaves no usable approval token',async()=>{const f=fixture();try{
 f.network.emailStatus=500;
 let r=await f.call('request-access',{name:'Visitor',organization:'Example',email:'visitor@example.com',turnstileToken:'valid-request'});assert.equal(r.status,502);assert.match((await r.json()).error,/request was saved/);
 const person=f.db.db.prepare('SELECT * FROM access_requests').get();assert.equal(person.status,'pending');
 const login=await f.call('admin/login',{password:f.env.OWNER_PASSWORD,turnstileToken:'valid-admin'});
 r=await f.call('admin/action',{id:person.id,action:'approve'},{cookie:cookieHeader(login)});assert.equal(r.status,502);assert.match((await r.json()).error,/approval email failed/);
 assert.equal(f.db.db.prepare('SELECT COUNT(*) AS count FROM login_tokens').get().count,0);
}finally{f.close();}});

test('original files are denied for GET, HEAD, and Range; view-only pages are session gated',async()=>{const f=fixture();try{
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});const visitor=cookieHeader(login);
 f.objects.set('previews/sample.pdf.json',JSON.stringify({key:'sample.pdf',pages:2,format:'webp'}));
 f.objects.set('previews/sample.pdf--0001.webp','WATERMARKED-PAGE-1');
 f.objects.set('previews/sample.pdf--0002.webp','WATERMARKED-PAGE-2');
 for(const url of ['asset/sample.pdf','asset/sample.pdf?view=1','asset/sample.pdf?download=1']){
  const r=await f.call(url,undefined,{cookie:visitor});assert.equal(r.status,403);assert.equal(r.headers.get('Content-Disposition'),null);
 }
 assert.equal((await f.call('asset/sample.pdf',undefined,{cookie:visitor,method:'HEAD'})).status,403);
 assert.equal((await f.call('asset/sample.pdf',undefined,{cookie:visitor,headers:{Range:'bytes=0-3'}})).status,403);
 assert.equal((await f.call('preview/sample.pdf/manifest')).status,401);
 assert.equal((await f.call('preview/sample.pdf/1')).status,401);
 let r=await f.call('preview/sample.pdf/manifest',undefined,{cookie:visitor});assert.equal(r.status,200);assert.deepEqual(await r.json(),{pages:2,format:'webp'});
 r=await f.call('preview/sample.pdf/1',undefined,{cookie:visitor});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Type'),'image/webp');assert.equal(r.headers.get('Content-Disposition'),'inline');assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(await r.text(),'WATERMARKED-PAGE-1');
 assert.equal((await f.call('preview/sample.pdf/3',undefined,{cookie:visitor})).status,404);
 assert.equal((await f.call('preview/sample.pdf/../1',undefined,{cookie:visitor})).status,404);
 assert.equal((await f.call('asset/%E0%A4%A',undefined,{cookie:visitor})).status,400);
 assert.equal((await f.call('asset/private%2Fsample.pdf',undefined,{cookie:visitor})).status,400);
 f.objects.set('case-studies.json',JSON.stringify([{id:'test',assets:[{key:'sample.pdf',available:false}]}]));assert.equal((await f.call('preview/sample.pdf/1',undefined,{cookie:visitor})).status,404);
 f.objects.delete('case-studies.json');assert.equal((await f.call('projects',undefined,{cookie:visitor})).status,503);
}finally{f.close();}});

test('hosted video URLs stay behind authorization for GET and HEAD',async()=>{const f=fixture();try{
 const externalUrl='https://www.youtube.com/watch?v=sqGhENiOj08';
 f.objects.set('case-studies.json',JSON.stringify([{id:'video',assets:[{key:'hosted.mp4',kind:'VIDEO',available:true,externalUrl}]}]));
 for(const method of ['GET','HEAD']){
  const r=await f.call('asset/hosted.mp4',undefined,{method});assert.equal(r.status,401);assert.equal(r.headers.get('Location'),null);assert.ok(!(await r.text()).includes(externalUrl));
 }
 const r=await f.call('projects');assert.equal(r.status,401);assert.ok(!(await r.text()).includes(externalUrl));
}finally{f.close();}});

test('authorized hosted video redirect does not read a private file object',async()=>{const f=fixture();try{
 const externalUrl='https://www.youtube.com/watch?v=sqGhENiOj08';
 f.objects.set('case-studies.json',JSON.stringify([{id:'video',assets:[{key:'hosted.mp4',kind:'VIDEO',available:true,externalUrl}]}]));
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});const visitor=cookieHeader(login);
 const originalGet=f.env.PRIVATE_ASSETS.get;const reads=[];
 f.env.PRIVATE_ASSETS.get=async(key,opts)=>{reads.push(key);assert.equal(key,'case-studies.json');return originalGet(key,opts);};
 f.env.PRIVATE_ASSETS.head=async()=>{assert.fail('A hosted video must not read a local file object.');};
 for(const method of ['GET','HEAD']){
  const r=await f.call('asset/hosted.mp4',undefined,{cookie:visitor,method});assert.equal(r.status,302);assert.equal(r.headers.get('Location'),externalUrl);assert.equal(r.headers.get('Cache-Control'),'private, no-store');assert.equal(r.headers.get('Referrer-Policy'),'no-referrer');assert.equal(await r.text(),'');
 }
 assert.deepEqual(reads,['case-studies.json','case-studies.json']);
}finally{f.close();}});

test('hosted video configuration cannot become an open redirect',async()=>{const f=fixture();try{
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});const visitor=cookieHeader(login);
 const invalid=[null,'','https://untrusted.invalid/watch?v=sqGhENiOj08','https://www.youtube.com.evil.invalid/watch?v=sqGhENiOj08','https://www.youtube.com@untrusted.invalid/watch?v=sqGhENiOj08','http://www.youtube.com/watch?v=sqGhENiOj08','https://www.youtube.com/watch?v=sqGhENiOj08&next=https://untrusted.invalid','https://www.youtube.com/watch?v=sqGhENiOj08#other','https://www.youtube.com/watch?v=sqGhENiOj08\n','https://www.youtube.com/watch?v=short','javascript:alert(1)'];
 for(const externalUrl of invalid){
  f.objects.set('case-studies.json',JSON.stringify([{id:'video',assets:[{key:'hosted.mp4',kind:'VIDEO',available:true,externalUrl}]}]));
  const r=await f.call('asset/hosted.mp4',undefined,{cookie:visitor});assert.equal(r.status,503);assert.equal(r.headers.get('Location'),null);
 }
 f.objects.set('case-studies.json',JSON.stringify([{id:'video',assets:[{key:'hosted.mp4',kind:'VIDEO',available:false,externalUrl:'https://www.youtube.com/watch?v=sqGhENiOj08'}]}]));
 assert.equal((await f.call('asset/hosted.mp4',undefined,{cookie:visitor})).status,404);
}finally{f.close();}});

test('private asset helper synchronizes hosted availability and uploads only original files before the manifest',()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),'pv-assets-'));
 try{
  fs.mkdirSync(path.join(dir,'private/originals'),{recursive:true});
  fs.mkdirSync(path.join(dir,'node_modules/wrangler/bin'),{recursive:true});
  fs.writeFileSync(path.join(dir,'private/originals/sample.pdf'),'%PDF-TEST');
  const externalUrl='https://www.youtube.com/watch?v=sqGhENiOj08';
  const cases=[{id:'test',number:'01',title:'Test',assets:[{key:'sample.pdf',kind:'PDF',available:false},{key:'hosted.mp4',kind:'VIDEO',available:false,externalUrl},{key:'missing.pdf',kind:'PDF',available:false}]}];
  const source=path.join(dir,'private/case-studies.json');fs.writeFileSync(source,JSON.stringify(cases));
  const helper=new URL('../scripts/private-assets.mjs',import.meta.url);
  const run=mode=>{const result=spawnSync(process.execPath,[helper.pathname,mode],{cwd:dir,encoding:'utf8'});assert.ifError(result.error);return result;};
  let r=run('sync');assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/1 included downloads; 1 hosted videos; 1 request-only samples/);
  const synced=JSON.parse(fs.readFileSync(source,'utf8'));assert.deepEqual(synced[0].assets.map(a=>a.available),[true,true,false]);
  const manifest=JSON.parse(fs.readFileSync(path.join(dir,'private/asset-manifest.json'),'utf8'));assert.equal(manifest[1].externalUrl,externalUrl);
  fs.writeFileSync(path.join(dir,'node_modules/wrangler/bin/wrangler.js'),"require('node:fs').appendFileSync('calls.jsonl',JSON.stringify(process.argv.slice(2))+'\\n');");
  r=run('upload');assert.equal(r.status,0,r.stderr);
  const calls=fs.readFileSync(path.join(dir,'calls.jsonl'),'utf8').trim().split('\n').map(line=>JSON.parse(line));
  assert.deepEqual(calls.map(args=>args[3]),['peter-verdin-private/files/sample.pdf','peter-verdin-private/case-studies.json']);
  synced[0].assets[1].externalUrl='https://untrusted.invalid/';fs.writeFileSync(source,JSON.stringify(synced));
  r=run('check');assert.notEqual(r.status,0);assert.match(r.stderr,/Invalid hosted video URL/);
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
});


test('shared code works when email service and owner login are not configured',async()=>{const f=fixture();try{
 delete f.env.RESEND_API_KEY;delete f.env.EMAIL_FROM;delete f.env.ADMIN_EMAIL;delete f.env.SITE_ORIGIN;delete f.env.OWNER_PASSWORD;
 const cfg=await (await f.call('config')).json();
 assert.equal(cfg.ready,true);assert.equal(cfg.passwordReady,true);assert.equal(cfg.requestsReady,false);assert.equal(cfg.ownerReady,false);
 const denied=await f.call('password-login',{password:'wrong',turnstileToken:'valid-password'});assert.equal(denied.status,401);
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'});assert.equal(login.status,200);
 assert.equal((await f.call('projects',undefined,{cookie:cookieHeader(login)})).status,200);
 assert.equal((await f.call('request-access',{name:'Visitor',email:'v@example.com',organization:'Example',turnstileToken:'valid-request'})).status,503);
}finally{f.close();}});

test('missing R2, D1 or Turnstile blocks private content and identifies missing binding names',async()=>{const f=fixture();try{
 delete f.env.PRIVATE_ASSETS;delete f.env.TURNSTILE_SECRET_KEY;
 const cfg=await (await f.call('config')).json();assert.equal(cfg.passwordReady,false);
 assert.ok(cfg.missing.includes('PRIVATE_ASSETS'));assert.ok(cfg.missing.includes('TURNSTILE_KEYS'));
 assert.equal((await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'})).status,503);
 assert.equal((await f.call('projects')).status,503);
}finally{f.close();}});

test('Worker adapter routes API without exposing private content and delegates public assets',async()=>{
 const worker=(await import('../worker/index.js')).default;const f=fixture();try{
 const pubReq=new Request('https://example.com/');const publicReply=Response.redirect('https://example.com/public',302);
 f.env.ASSETS={async fetch(request){assert.equal(request,pubReq);return publicReply;}};
 const site=await worker.fetch(pubReq,f.env,{});assert.equal(site,publicReply);
 const apiRes=await worker.fetch(new Request('https://example.com/api/config'),f.env,{});
 assert.equal((await apiRes.json()).passwordReady,true);
 const unsafe=await worker.fetch(new Request('https://example.com/api/projects'),f.env,{});assert.equal(unsafe.status,401);
}finally{f.close();}});

test('public resume link points at the bundled, original PDF',()=>{
 const pdf=fs.readFileSync(new URL('../public/assets/dr-peter-verdin-resume.pdf',import.meta.url));
 assert.equal(pdf.subarray(0,4).toString(),'%PDF');
 for(const page of ['my-work','resume']){
  const html=fs.readFileSync(new URL(`../public/${page}/index.html`,import.meta.url),'utf8');
  assert.match(html,/id="print-resume"[^>]*href="\/assets\/dr-peter-verdin-resume\.pdf"/);
 }
});


test('PDFs, slides and images cannot be retrieved through original asset route',async()=>{const f=fixture();try{
 f.objects.set('case-studies.json',JSON.stringify([{id:'test',assets:[{key:'sample.pdf',kind:'PDF',available:true},{key:'sample.png',kind:'IMAGE',available:true},{key:'lesson.mp4',kind:'VIDEO',available:true},{key:'slide.pptx',kind:'PRESENTATION',available:true}]}]));
 for(const key of ['sample.png','lesson.mp4','slide.pptx'])f.objects.set('files/'+key,'12345');
 const login=await f.call('password-login',{password:f.env.PORTFOLIO_PASSWORD,turnstileToken:'valid-password'}),visitor=cookieHeader(login);
 for(const key of ['sample.pdf','sample.png','slide.pptx','lesson.mp4']){
  for(const qs of ['', '?view=1','?download=1']){
   const r=await f.call('asset/'+key+qs,undefined,{cookie:visitor});assert.equal(r.status,403);
  }
 }
 let r=await f.call('asset/lesson.mp4?play=1',undefined,{cookie:visitor});assert.equal(r.status,200);assert.equal(r.headers.get('Content-Disposition'),'inline');
 assert.equal((await f.call('asset/sample.pdf?view=1')).status,401);
}finally{f.close();}});

test('public case-study sample links use the permanent sample viewer, not transient popup checks',()=>{
 const file=fs.readFileSync(new URL('../public/assets/site.js',import.meta.url),'utf8');
 const viewer=fs.readFileSync(new URL('../public/assets/sample.js',import.meta.url),'utf8');
 assert.match(file,/\/sample\/\?file=/);
 assert.doesNotMatch(file,/window\.open\('about:blank'/);
 assert.doesNotMatch(file,/windowRef\.close\(/);
 assert.match(viewer,/status===404/);
 assert.match(viewer,/api\/preview/);
 assert.doesNotMatch(viewer,/sample-download|location\.replace\(url/);
 assert.doesNotMatch(file,/Download original|PowerPoint download/);
});
