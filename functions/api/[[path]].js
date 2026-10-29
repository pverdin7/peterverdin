/**
 * Cloudflare Pages Functions API.
 * Public project teasers are static. Case-study JSON and original files live in a PRIVATE R2 bucket.
 * Setup is fail-closed: missing bindings/secrets never expose private material or fake a submitted form.
 */
const COOKIE='__Host-pv_session', ADMIN_COOKIE='__Host-pv_admin';
const SESSION_TTL=7*86400, ADMIN_TTL=3600, LINK_TTL=1800;
const DEFAULT_REPLY_TO='goldinthecracksofficial@gmail.com';
const enc=new TextEncoder();
const now=()=>Math.floor(Date.now()/1000);
class HttpError extends Error { constructor(status,message){super(message);this.status=status;} }
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const hex=b=>[...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('');
const hash=async s=>hex(await crypto.subtle.digest('SHA-256',enc.encode(s)));
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const secretEqual=async(a,b)=>{const aa=await hash(String(a)),bb=await hash(String(b));let d=0;for(let i=0;i<aa.length;i++)d|=aa.charCodeAt(i)^bb.charCodeAt(i);return d===0;};
const cookie=(name,value,ttl)=>`${name}=${value}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${ttl}`;
function cookies(req){return Object.fromEntries((req.headers.get('Cookie')||'').split(';').map(x=>x.trim().split(/=(.*)/s)).filter(x=>x.length>=2).map(([k,v])=>[k,v]));}
function json(body,status=200,extra={}) {
  return new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer',...extra}});
}
// Separate capabilities so a working shared code does not depend on Resend,
// the owner login, or a final-domain URL that may not be configured yet.
// Protected content always requires a D1 session, private R2, and server-only secrets.
function accessStatus(env){
  const missing=[];
  if(!env.DB?.prepare)missing.push('DB');
  if(!env.PRIVATE_ASSETS?.get)missing.push('PRIVATE_ASSETS');
  if(typeof env.RATE_LIMIT_SALT!=='string'||env.RATE_LIMIT_SALT.length<32)missing.push('RATE_LIMIT_SALT');
  const storageReady=missing.length===0;
  const challengeReady=!!(env.TURNSTILE_SITE_KEY&&env.TURNSTILE_SECRET_KEY);
  const passwordEnabled=typeof env.PORTFOLIO_PASSWORD==='string'&&env.PORTFOLIO_PASSWORD.length>0;
  const ownerEnabled=typeof env.OWNER_PASSWORD==='string'&&env.OWNER_PASSWORD.length>=20&&env.OWNER_PASSWORD.length<=200&&env.OWNER_PASSWORD!==env.PORTFOLIO_PASSWORD;
  const emailReady=!!(env.RESEND_API_KEY&&env.EMAIL_FROM&&env.ADMIN_EMAIL&&/^https:\/\/[^/]+$/.test(env.SITE_ORIGIN||''));
  const passwordReady=storageReady&&challengeReady&&passwordEnabled;
  const ownerReady=storageReady&&challengeReady&&ownerEnabled;
  const requestsReady=storageReady&&challengeReady&&emailReady;
  return {storageReady,passwordReady,ownerReady,requestsReady,passwordEnabled,missing:passwordReady?[]:[...missing,...(!challengeReady?['TURNSTILE_KEYS']:[]),...(!passwordEnabled?['PORTFOLIO_PASSWORD']:[])]};
}
function ensureReady(env,kind='storage'){
  const status=accessStatus(env);
  if(kind==='storage'&&!status.storageReady||kind==='password'&&!status.passwordReady||kind==='owner'&&!status.ownerReady||kind==='requests'&&!status.requestsReady){
    throw new HttpError(503,'Portfolio access needs Cloudflare setup. The private files remain protected. Please contact the site owner.');
  }
}
function checkOrigin(req){if(req.headers.get('Origin')!==new URL(req.url).origin)throw new HttpError(403,'This action must be submitted from this website.');}
async function readJSON(req){
  if(!req.headers.get('Content-Type')?.startsWith('application/json'))throw new HttpError(415,'Please submit JSON.');
  if(Number(req.headers.get('Content-Length')||0)>8192)throw new HttpError(413,'Request too large.');
  if(!req.body)throw new HttpError(400,'Missing request.');
  const reader=req.body.getReader(),chunks=[];let size=0;
  while(true){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>8192){await reader.cancel();throw new HttpError(413,'Request too large.');}chunks.push(value);}
  const body=new Uint8Array(size);let off=0;for(const chunk of chunks){body.set(chunk,off);off+=chunk.length;}
  try{const v=JSON.parse(new TextDecoder().decode(body));if(!v||typeof v!=='object'||Array.isArray(v))throw Error();return v;}catch{throw new HttpError(400,'Invalid request.');}
}
function text(value,max,min=1){if(typeof value!=='string')throw new HttpError(400,'Please complete the required fields.');const v=value.trim();if(v.length<min||v.length>max||/[\u0000-\u001f\u007f]/.test(v))throw new HttpError(400,'Please check the information entered.');return v;}
function email(value){const v=text(value,254).toLowerCase();if(!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(v))throw new HttpError(400,'Please enter a valid email address.');return v;}
async function limit(env,kind,identifier,max,seconds=3600){
  const bucket=Math.floor(now()/seconds),key=await hash(`${env.RATE_LIMIT_SALT}:${kind}:${identifier}:${bucket}`);
  const row=await env.DB.prepare('INSERT INTO rate_limits (key,count,expires_at) VALUES (?,1,?) ON CONFLICT(key) DO UPDATE SET count=count+1 RETURNING count').bind(key,(bucket+1)*seconds).first();
  if(row.count>max)throw new HttpError(429,'Too many attempts. Please try again later.');
}
async function botCheck(req,env,data,action){
  if(typeof data.turnstileToken!=='string'||!data.turnstileToken||data.turnstileToken.length>2048)throw new HttpError(400,'Please complete the security check.');
  const res=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({secret:env.TURNSTILE_SECRET_KEY,response:data.turnstileToken,remoteip:req.headers.get('CF-Connecting-IP')||undefined}),signal:AbortSignal.timeout(12000)});
  if(!res.ok)throw new HttpError(503,'The security check is temporarily unavailable.');
  const result=await res.json();
  if(!result.success||result.action!==action||result.hostname!==new URL(req.url).hostname)throw new HttpError(400,'The security check expired or was unsuccessful. Please try again.');
}
async function sendEmail(env,to,subject,html,idempotencyKey){
  const res=await fetch('https://api.resend.com/emails',{method:'POST',headers:{Authorization:`Bearer ${env.RESEND_API_KEY}`,'Content-Type':'application/json',...(idempotencyKey?{'Idempotency-Key':idempotencyKey}:{})},body:JSON.stringify({from:env.EMAIL_FROM,to:[to],reply_to:env.REPLY_TO||DEFAULT_REPLY_TO,subject,html}),signal:AbortSignal.timeout(15000)});
  if(!res.ok)throw new HttpError(502,'Email delivery could not be confirmed. Please try again.');
  return res.json();
}
function emailFrame(title,body){return `<div style="font-family:Arial,sans-serif;max-width:580px;margin:auto;padding:30px;background:#f7f5f0;color:#242923"><p style="font-size:12px;letter-spacing:2px">PETER VERDIN, PhD / PORTFOLIO</p><h1 style="font-size:28px">${esc(title)}</h1>${body}<hr style="border:0;border-top:1px solid #dcded4;margin-top:30px"><p style="font-size:11px;color:#697065">An access-related message—not a mailing-list subscription.</p></div>`;}
async function createSession(env,role,requestId=null){
  const value=token(),ttl=role==='admin'?ADMIN_TTL:SESSION_TTL;
  const fingerprint=role==='admin'?await hash(env.OWNER_PASSWORD):role==='password'?await hash(env.PORTFOLIO_PASSWORD):null;
  await env.DB.prepare('INSERT INTO sessions (token_hash,request_id,role,expires_at,password_fingerprint) VALUES (?,?,?,?,?)').bind(await hash(value),requestId,role,now()+ttl,fingerprint).run();
  return cookie(role==='admin'?ADMIN_COOKIE:COOKIE,value,ttl);
}
async function session(req,env,admin=false){
  const raw=cookies(req)[admin?ADMIN_COOKIE:COOKIE];if(!raw||!/^[a-f0-9]{64}$/.test(raw))return null;
  const s=await env.DB.prepare('SELECT s.*,r.status FROM sessions s LEFT JOIN access_requests r ON r.id=s.request_id WHERE s.token_hash=? AND s.expires_at>?').bind(await hash(raw),now()).first();
  if(!s)return null;
  if(admin)return s.role==='admin'&&s.password_fingerprint===await hash(env.OWNER_PASSWORD)?s:null;
  if(s.role==='visitor'&&s.status==='approved')return s;
  if(s.role==='password'&&env.PORTFOLIO_PASSWORD&&s.password_fingerprint===await hash(env.PORTFOLIO_PASSWORD))return s;
  return null;
}
async function requireSession(req,env,admin=false){const s=await session(req,env,admin);if(!s)throw new HttpError(401,'Please sign in to continue.');return s;}
async function sendLink(env,person,approval=false){
  const raw=token(),hashed=await hash(raw);
  await env.DB.prepare('INSERT INTO login_tokens (token_hash,request_id,expires_at) VALUES (?,?,?)').bind(hashed,person.id,now()+LINK_TTL).run();
  const link=new URL('/access/',env.SITE_ORIGIN).href+'#token='+raw;
  const title=approval?'Your portfolio access is approved.':'Your private portfolio sign-in link.';
  try {
    await sendEmail(env,person.email,title,emailFrame(title,`<p>Hi ${esc(person.name)},</p><p>${approval?'Your request has been approved. You can now explore the full case studies and work samples.':'Here is the sign-in link you requested.'}</p><p><a href="${esc(link)}" style="display:inline-block;padding:14px 22px;background:#a83d2d;color:white;text-decoration:none;border-radius:30px">Open the portfolio →</a></p><p style="font-size:12px">This personal link works once and expires in 30 minutes. Approval stays in place until revoked; request a fresh link from the website whenever you need one.</p><p>— Peter</p>`),'pv-link-'+hashed);
  } catch(err){await env.DB.prepare('DELETE FROM login_tokens WHERE token_hash=?').bind(hashed).run();throw err;}
}
async function cleanup(env){await env.DB.batch([env.DB.prepare('DELETE FROM sessions WHERE expires_at<?').bind(now()),env.DB.prepare('DELETE FROM login_tokens WHERE expires_at<?').bind(now()),env.DB.prepare('DELETE FROM rate_limits WHERE expires_at<?').bind(now())]);}
async function getCases(env){
  const object=await env.PRIVATE_ASSETS.get('case-studies.json');if(!object)throw new HttpError(503,'The case studies have not been uploaded yet. Please check back shortly.');
  const data=await object.json();if(!Array.isArray(data))throw new HttpError(503,'The case-study library is not ready.');return data;
}
function hostedVideoURL(value){
  // Only a canonical, single-video YouTube URL is a supported hosted sample.
  // The equality check also rejects whitespace that URL parsing would discard.
  return typeof value==='string'&&/^https:\/\/www\.youtube\.com\/watch\?v=[A-Za-z0-9_-]{11}$/.test(value)&&new URL(value).href===value;
}
// Protected original work files stay in R2. Only playable media (with inline playback)
// and pre-rendered document page images are sent to the visitor.
function validAssetKey(key){return /^[a-z0-9][a-z0-9._-]{0,150}$/.test(key)&&!key.includes('..');}
async function findDeclaredAsset(env,key){
  if(!validAssetKey(key))throw new HttpError(400,'Invalid file.');
  const all=await getCases(env);
  const asset=all.flatMap(p=>p.assets||[]).find(a=>a.key===key&&a.available===true);
  if(!asset)throw new HttpError(404,'This work sample is not available yet.');
  return asset;
}
async function previewInfo(env,key){
  const a=await findDeclaredAsset(env,key);
  if(!/\.(pdf|pptx)$/.test(key)||Object.hasOwn(a,'externalUrl'))throw new HttpError(404,'This sample has no document preview.');
  const prefix='previews/'+key+'--';
  // Prefer the supplied manifest, but remain usable when dashboard uploads
  // omitted it or stored malformed JSON while uploading the actual pages.
  let manifest=null;
  try{
    const object=await env.PRIVATE_ASSETS.get('previews/'+key+'.json');
    if(object){
      const data=await object.json();
      if(data?.key===key&&Number.isInteger(data.pages)&&data.pages>=1&&data.pages<=500&&data.format==='webp')manifest=data;
    }
  }catch(err){console.warn('Portfolio preview manifest unreadable',key,err?.name||'Error');}
  if(manifest)return manifest;
  if(typeof env.PRIVATE_ASSETS.list!=='function')throw new HttpError(503,'Preview manifest unavailable.');
  const listed=await env.PRIVATE_ASSETS.list({prefix,limit:600});
  const ids=new Set((listed.objects||[]).map(o=>o.key.slice(prefix.length)).filter(n=>/^\d{4}\.webp$/.test(n)).map(n=>Number(n.slice(0,4))));
  const pages=ids.size;
  if(!pages||pages>500||listed.truncated)throw new HttpError(404,'Preview pages are missing in R2.');
  for(let page=1;page<=pages;page++){if(!ids.has(page))throw new HttpError(503,'Preview pages are incomplete in R2.');}
  return {key,pages,format:'webp'};
}

async function servePreview(req,env,key,what){
  const manifest=await previewInfo(env,key);
  if(what==='manifest'){
    if(req.method==='HEAD')return new Response(null,{headers:{'Cache-Control':'private, no-store'}});
    return json({pages:manifest.pages,format:'webp'});
  }
  if(!/^\d{1,4}$/.test(what))throw new HttpError(404,'Preview page not found.');
  const n=Number(what);
  if(n<1||n>manifest.pages)throw new HttpError(404,'Preview page not found.');
  const object=await env.PRIVATE_ASSETS.get('previews/'+key+'--'+String(n).padStart(4,'0')+'.webp');
  if(!object)throw new HttpError(404,'Preview page not found.');
  return new Response(req.method==='HEAD'?null:object.body,{headers:{
    'Content-Type':'image/webp','Content-Disposition':'inline','Cache-Control':'private, no-store',
    'X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Referrer-Policy':'no-referrer'
  }});
}
async function serveAsset(req,env,key){
  const asset=await findDeclaredAsset(env,key);
  if(Object.hasOwn(asset,'externalUrl')){
    if(asset.kind!=='VIDEO'||!hostedVideoURL(asset.externalUrl))throw new HttpError(503,'This hosted work sample is not configured correctly.');
    return new Response(null,{status:302,headers:{Location:asset.externalUrl,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow'}});
  }
  // Never transmit original PDF or PowerPoint bytes. Older links (even those
  // with ?view=1 or ?download=1) now go to our page-image viewer instead.
  if(/\.(pdf|pptx)$/.test(key)){
    if(req.method==='HEAD'||req.headers.has('Range'))throw new HttpError(403,'The original document is view-only.');
    const location='/sample/?file='+encodeURIComponent(key)+'&label='+encodeURIComponent(asset.label||key);
    return new Response(null,{status:302,headers:{Location:location,'Cache-Control':'private, no-store','Referrer-Policy':'no-referrer','X-Robots-Tag':'noindex, nofollow','X-Content-Type-Options':'nosniff'}});
  }
  if(!/\.mp4$/.test(key)||asset.kind!=='VIDEO'||new URL(req.url).searchParams.get('play')!=='1'){
    throw new HttpError(403,'This work sample is view-only. Open it in the portfolio viewer.');
  }
  if(Object.hasOwn(asset,'externalUrl'))throw new HttpError(403,'Use the hosted video provider to view this video.');
  const range=req.headers.get('Range');if(range&&!/^bytes=\d*-\d*$/.test(range))throw new HttpError(416,'Unsupported media range.');
  const head=await env.PRIVATE_ASSETS.head('files/'+key);if(!head)throw new HttpError(404,'This work sample is not available yet.');
  const h=new Headers({'Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff','X-Robots-Tag':'noindex, nofollow','Content-Disposition':'inline','Accept-Ranges':'bytes','Referrer-Policy':'no-referrer','Content-Type':'video/mp4'});
  if(req.method==='HEAD'){h.set('Content-Length',String(head.size));return new Response(null,{headers:h});}
  let options;
  if(range){const [,first,last]=range.match(/^bytes=(\d*)-(\d*)$/);if(!first&&!last)throw new HttpError(416,'Invalid media range.');if(!first){const len=Number(last);if(len<1)throw new HttpError(416,'Invalid media range.');options={range:{suffix:Math.min(len,head.size)}};}else{const start=Number(first),end=last?Math.min(Number(last),head.size-1):head.size-1;if(start>=head.size||end<start)throw new HttpError(416,'Media range out of bounds.');options={range:{offset:start,length:end-start+1}};}}
  const object=await env.PRIVATE_ASSETS.get('files/'+key,options);if(!object)throw new HttpError(404,'File not found.');
  if(range&&object.range){const r=object.range,start=r.offset??Math.max(0,head.size-r.suffix),length=r.length??r.suffix;h.set('Content-Range',`bytes ${start}-${start+length-1}/${head.size}`);h.set('Content-Length',String(length));return new Response(object.body,{status:206,headers:h});}
  h.set('Content-Length',String(head.size));return new Response(object.body,{headers:h});
}

export async function onRequest(context){
  const {request:req,env}=context;const path=new URL(req.url).pathname.replace(/^\/api\//,'').replace(/\/$/,'');
  try {
    if(path==='config'&&req.method==='GET'){
      const status=accessStatus(env);
      return json({ready:status.passwordReady,passwordReady:status.passwordReady,requestsReady:status.requestsReady,ownerReady:status.ownerReady,passwordEnabled:status.passwordEnabled,viewerVersion:'3.6',turnstileSiteKey:env.TURNSTILE_SITE_KEY||null,missing:status.missing});
    }
    const requirement=path==='password-login'?'password':path==='admin/login'?'owner':(path==='request-access'||path==='login')?'requests':'storage';
    ensureReady(env,requirement);
    const isGet=req.method==='GET'||req.method==='HEAD';
    if(!isGet&&req.method!=='POST')throw new HttpError(405,'Method not allowed.');
    if(req.method==='POST')checkOrigin(req);
    if(path==='session'&&req.method==='GET')return json({authorized:!!await session(req,env)});
    if(path==='projects'&&req.method==='GET'){await requireSession(req,env);return json({projects:await getCases(env)});}
    if(path.startsWith('preview/')&&isGet){
      await requireSession(req,env);
      const match=path.slice('preview/'.length).match(/^([^/]+)\/(manifest|[0-9]{1,4})$/);
      if(!match)throw new HttpError(404,'Preview not found.');
      let key;try{key=decodeURIComponent(match[1]);}catch{throw new HttpError(400,'Invalid preview.');}
      return await servePreview(req,env,key,match[2]);
    }
    if(path.startsWith('asset/')&&isGet){
      await requireSession(req,env);let key;
      try{key=decodeURIComponent(path.slice(6));}catch{throw new HttpError(400,'Invalid file.');}
      return await serveAsset(req,env,key);
    }
    if(path==='admin/requests'&&req.method==='GET'){await requireSession(req,env,true);const result=await env.DB.prepare('SELECT id,name,email,organization,project,status,created_at,approved_at FROM access_requests ORDER BY created_at DESC LIMIT 500').all();return json({requests:result.results});}
    if(req.method!=='POST')throw new HttpError(404,'Not found.');
    const data=await readJSON(req),ip=req.headers.get('CF-Connecting-IP')||'unknown';
    // Cleanup never logs identifiers, passwords, links, or email bodies.
    if(context.waitUntil)context.waitUntil(cleanup(env).catch(()=>{}));
    if(path==='request-access'){
      await limit(env,'request-ip',ip,8);if(data.website)return json({message:'Thanks. You’ll receive an email if your request is approved.'});
      await botCheck(req,env,data,'request');
      const name=text(data.name,100),mail=email(data.email),org=text(data.organization,160),project=typeof data.project==='string'?text(data.project,100,0):'';
      await limit(env,'request-email',mail,3);
      const exists=await env.DB.prepare('SELECT id,status FROM access_requests WHERE email=?').bind(mail).first();
      if(!exists){
        const id=crypto.randomUUID();
        const inserted=await env.DB.prepare('INSERT OR IGNORE INTO access_requests (id,name,email,organization,project,status,created_at) VALUES (?,?,?,?,?,\'pending\',?)').bind(id,name,mail,org,project,now()).run();
        if(inserted.meta.changes){
          const adminLink=new URL('/admin/',env.SITE_ORIGIN).href;
          try{await sendEmail(env,env.ADMIN_EMAIL,'Portfolio access request: '+name,emailFrame('A new access request.',`<p><strong>Name:</strong> ${esc(name)}<br><strong>Email:</strong> ${esc(mail)}<br><strong>Organization:</strong> ${esc(org)}${project?`<br><strong>Project:</strong> ${esc(project)}`:''}</p><p><a href="${esc(adminLink)}">Review in your private owner workspace →</a></p><p>No access has been granted yet.</p>`),'pv-request-'+id);}catch{throw new HttpError(502,'Your request was saved, but the notification email could not be delivered. Please email Peter directly so he can review it.');}
        }
      }
      return json({message:'Thanks for your interest. You’ll receive an email when your request is approved.'});
    }
    if(path==='login'){
      await limit(env,'login-ip',ip,12);await botCheck(req,env,data,'email');const mail=email(data.email);await limit(env,'login-email',mail,4);
      const person=await env.DB.prepare('SELECT * FROM access_requests WHERE email=? AND status=\'approved\'').bind(mail).first();
      if(person)await sendLink(env,person);
      return json({message:'If that address has approved access, a sign-in link is on its way. Check your inbox and spam folder.'});
    }
    if(path==='password-login'||path==='admin/login'){
      const admin=path==='admin/login';await limit(env,admin?'admin-ip':'password-ip',ip,8,900);await botCheck(req,env,data,admin?'admin':'password');
      const expected=admin?env.OWNER_PASSWORD:env.PORTFOLIO_PASSWORD;
      if(!expected)throw new HttpError(400,'Password access is not enabled. Use your approved email to request a sign-in link.');
      const provided=typeof data.password==='string'&&data.password.length<=200?data.password:'';
      if(!await secretEqual(provided,expected))throw new HttpError(401,admin?'The owner password was not recognized.':'The access code was not recognized.');
      const c=await createSession(env,admin?'admin':'password');return json({ok:true},200,{'Set-Cookie':c});
    }
    if(path==='redeem'){
      await limit(env,'redeem-ip',ip,20,900);const raw=text(data.token,64);if(!/^[a-f0-9]{64}$/.test(raw))throw new HttpError(401,'That sign-in link is invalid or expired.');
      const taken=await env.DB.prepare('DELETE FROM login_tokens WHERE token_hash=? AND expires_at>? RETURNING request_id').bind(await hash(raw),now()).first();
      if(!taken)throw new HttpError(401,'That sign-in link was already used or has expired. Request a new link.');
      const person=await env.DB.prepare('SELECT id FROM access_requests WHERE id=? AND status=\'approved\'').bind(taken.request_id).first();
      if(!person)throw new HttpError(403,'Access is no longer approved.');
      return json({ok:true},200,{'Set-Cookie':await createSession(env,'visitor',person.id)});
    }
    if(path==='logout'||path==='admin/logout'){
      const name=path==='admin/logout'?ADMIN_COOKIE:COOKIE,raw=cookies(req)[name];if(raw)await env.DB.prepare('DELETE FROM sessions WHERE token_hash=?').bind(await hash(raw)).run();
      return json({ok:true},200,{'Set-Cookie':cookie(name,'',0)});
    }
    if(path==='admin/action'){
      await requireSession(req,env,true);const id=text(data.id,100),action=text(data.action,20);
      const person=await env.DB.prepare('SELECT * FROM access_requests WHERE id=?').bind(id).first();if(!person)throw new HttpError(404,'Request not found.');
      if(action==='approve'||action==='resend'){
        ensureReady(env,'requests');
        if(action==='resend'&&person.status!=='approved')throw new HttpError(400,'Approve access first.');
        await env.DB.prepare('UPDATE access_requests SET status=\'approved\',approved_at=? WHERE id=?').bind(now(),id).run();
        try{await sendLink(env,person,action==='approve');}catch{throw new HttpError(502,'Access was approved, but the approval email failed. Use “Send a fresh link” to retry.');}
        return json({ok:true,message:'Access is approved and the sign-in email was sent.'});
      }
      if(action==='revoke'||action==='delete'){
        const statements=[env.DB.prepare('DELETE FROM sessions WHERE request_id=?').bind(id),env.DB.prepare('DELETE FROM login_tokens WHERE request_id=?').bind(id)];
        statements.push(action==='delete'?env.DB.prepare('DELETE FROM access_requests WHERE id=?').bind(id):env.DB.prepare('UPDATE access_requests SET status=\'revoked\' WHERE id=?').bind(id));
        await env.DB.batch(statements);return json({ok:true,message:action==='delete'?'The request details and access credentials were deleted.':'Individual access was revoked. Shared-password access, if provided separately, requires rotating the shared password.'});
      }
      throw new HttpError(400,'Unknown action.');
    }
    throw new HttpError(404,'Not found.');
  } catch(err) {
    // Deliberately omit sensitive details from logs and responses.
    return json({error:err instanceof HttpError?err.message:'The access service encountered a problem. Please try again later.'},err instanceof HttpError?err.status:500);
  }
}
