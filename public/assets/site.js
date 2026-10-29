/* Public UI. Full case studies are not bundled here; /api/projects authorizes every request. */
(() => {
  'use strict';
  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projects = window.PROJECTS || [];
  const imageNames = new Set(['nnu','book','curriculum','facility','playground','movement']);
  const imagePath = name => '/assets/img/' + name + (name === 'book' ? '.svg' : '.webp');
  let filter = 'all', search = '', activeProject = '', config = {}, authenticated = false, adminAuthenticated = false;
  let pendingConfig = null, widgets = new Map(), privateCases = [], toastTimer;
  let sessionReady = Promise.resolve(), projectNavigation = 0;
  const scrollBehavior = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';

  async function api(path, data, method) {
    const opts = {method:method || (data === undefined ? 'GET' : 'POST'), credentials:'same-origin', headers:{Accept:'application/json'}};
    if (data !== undefined) { opts.headers['Content-Type']='application/json'; opts.body=JSON.stringify(data); }
    const res = await fetch('/api/' + path, opts);
    let body; try { body=await res.json(); } catch { throw new Error('The access service could not respond. Please try again or email Peter.'); }
    if (!res.ok) { const error=new Error(body.error || 'That request could not be completed. Please try again.'); error.status=res.status; throw error; }
    return body;
  }
  function chips(p, limit=99) { return p.skills.slice(0,limit).map(s=>`<span class="chip">${esc(s)}</span>`).join(''); }
  function visual(p) {
    const art = imageNames.has(p.visual)
      ? `<img src="${imagePath(esc(p.visual))}" alt="${esc(p.title)} — cover preview" loading="lazy" width="430" height="260">`
      : `<div class="metric-art"><strong>${esc(p.outcome)}</strong><small>${esc(p.outcomeLabel)}</small><div class="metric-foot" aria-hidden="true"><span>PROJECT ${esc(p.number)} / SELECTED WORK</span><span>↗</span></div></div>`;
    return `<div class="project-visual visual-${esc(p.visual)}"><span class="type-tag">${esc(p.category.toUpperCase())}</span>${art}<span class="corner-no">${esc(p.number)} /</span></div>`;
  }
  /* Gallery-only surfaces. These mappings contain public preview assets and
     descriptions of materials, never the protected files themselves. */
  const workPreviewMap = {
    'strategy-client-solutions': {image:'slow-coffee', alt:'Slow by Slow market intelligence presentation cover', caption:'SLOW BY SLOW / MARKET INTELLIGENCE', materials:['Audience research','Proposal pitches','Campaign concept']},
    'author-brand': {image:'book', alt:'Gold in the Cracks book rendering', caption:'GOLD IN THE CRACKS / EXIT DOOR PRESS', materials:['Book & publishing identities','Website, logo & speaker materials']},
    'district-onboarding': {materials:['K–6 onboarding lesson','8–12 onboarding lesson'], kind:'SLIDE DECKS'},
    'mtss-data-dives': {materials:['Guided district data dive','Introduction video'], kind:'GUIDED DATA REVIEW'},
    'professional-services': {materials:['Tailored professional-services plan','Implementation & coaching support'], kind:'SERVICE PLANNING'},
    'motor-learning-research': {materials:['Doctoral dissertation','Study design, analysis & findings'], kind:'RESEARCH MANUSCRIPT'},
    'physical-education-program': {image:'movement', alt:'Keep on Movin’ physical-education program preview', caption:'KEEP ON MOVIN’ / MOVEMENT CURRICULUM', materials:['Curriculum strategy','Fall family update']},
    'skateboarding-program': {materials:['After-school program overview','Skateboarding program video'], kind:'PROGRAM & VIDEO'},
    'curriculum-design': {image:'curriculum', alt:'Sample pages from the Athlos physical-education curriculum', caption:'ATHLOS / SAMPLE LESSON PAGES', materials:['Sample lesson plans','Visual teaching resources']},
    'learning-management-system': {materials:['Learning-system introduction','Athletic Stance lesson','Connected webinar example'], kind:'LMS & MICROCREDENTIALING'},
    'webinar-delivery': {materials:['Meaningful Movement Progressions','Healthy Body webinar'], kind:'RECORDED SESSIONS'},
    'data-visualization': {materials:['De-identified dashboard example','Interactive & printable views'], kind:'DATA VISUALIZATION'},
    'facility-design': {image:'facility', alt:'Training facility from Peter’s facility-design portfolio', caption:'TRAINING ENVIRONMENTS / FACILITY DESIGN', materials:['Facility design gallery','Space & equipment planning']},
    'professional-development': {materials:['Summer Institute agenda','Interactive learning sessions'], kind:'WORKSHOP DESIGN'},
    'playground-design': {image:'playground', alt:'Playground design concept from the portfolio', caption:'MULTI-USE PLAYGROUND / DESIGN CONCEPT', materials:['Playground design renderings','Movement & learning spaces']}
  };

  /* Public employment context belongs outside the sample gate. Some bodies of
     work span adjacent roles; label those links as related experience instead
     of assigning every artifact to one unverified title or date. */
  const workRoleMap = {
    'strategy-client-solutions': {roles:[['Idaho News 6 / KIVI','Account Executive','career-kivi']]},
    'author-brand': {label:'INDEPENDENT WORK',roles:[['Gold in the Cracks / Exit Door Press','Author, speaker & brand creator','career-author']]},
    'district-onboarding': {roles:[['Varsity Tutors for Schools','SaaS Enterprise Account Executive','career-varsity']]},
    'mtss-data-dives': {roles:[['Houghton Mifflin Harcourt','EdTech SaaS Account Executive','career-hmh']]},
    'professional-services': {roles:[['Houghton Mifflin Harcourt','EdTech SaaS Account Executive','career-hmh']]},
    'motor-learning-research': {label:'EDUCATION & RESEARCH',education:true,roles:[['Rocky Mountain University of Health Professions','PhD in Health Sciences: Human and Sport Performance','career-education']]},
    'physical-education-program': {roles:[['Future Public School','Physical Education Teacher (Movement Engineer)','career-future-pe']]},
    'skateboarding-program': {roles:[['Future Public School','Physical Education Teacher (Movement Engineer)','career-future-pe']]},
    'curriculum-design': {label:'RELATED EXPERIENCE',roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director'],['Athlos Academies','Product Manager // Coach Education Manager','career-athlos-product']]},
    'learning-management-system': {roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director']]},
    'webinar-delivery': {label:'RELATED EXPERIENCE',roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director'],['Athlos Academies','Product Manager // Coach Education Manager','career-athlos-product']]},
    'data-visualization': {roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director']]},
    'facility-design': {label:'RELATED EXPERIENCE',roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director'],['STACK Sports Performance & Therapy','Head Sports Performance Coach','career-stack']]},
    'professional-development': {label:'RELATED EXPERIENCE',roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director'],['Athlos Academies','Product Manager // Coach Education Manager','career-athlos-product']]},
    'playground-design': {label:'RELATED EXPERIENCE',roles:[['Athlos Academies','Associate Director of Healthy Body','career-athlos-director'],['Athlos Academies','Product Manager // Coach Education Manager','career-athlos-product']]}
  };

  function workRoleSearchText(p) {
    const item=workRoleMap[p.id];
    return item ? item.roles.map(role=>`${role[0]} ${role[1]}`).join(' ') : '';
  }

  function workRoleContext(p) {
    const item=workRoleMap[p.id];
    if(!item) return '';
    const linkLabel=item.education?'View education':'View role';
    return `<div class="work-role-context"><p class="work-role-eyebrow">${esc(item.label || 'EXPERIENCE')}</p><ul>${item.roles.map(role=>`<li><a href="/my-work/#${esc(role[2])}" aria-label="${esc(linkLabel)}: ${esc(role[1])}, ${esc(role[0])}"><span class="work-role-copy"><strong>${esc(role[0])}</strong><span>${esc(role[1])}</span></span><span class="work-role-link">${esc(linkLabel)} <span aria-hidden="true">↗</span></span></a></li>`).join('')}</ul></div>`;
  }

  function workFrontLabel(p) {
    return p.id === 'webinar-delivery' ? 'coaches in a monthly webinar' : p.outcomeLabel;
  }

  function workPeekContent(p) {
    const item = workPreviewMap[p.id] || {materials:[],kind:p.category.toUpperCase()};
    const materials = (item.materials || []).map(t=>`<li>${esc(t)}</li>`).join('');
    if (item.image) {
      return `<div class="work-peek work-peek-photo" id="work-peek-${esc(p.id)}"><span class="work-peek-eyebrow">PUBLIC SAMPLE PREVIEW</span><div class="work-peek-media work-media-${esc(item.image)}"><img src="${imagePath(esc(item.image))}" alt="${esc(item.alt)}" loading="lazy"></div><div class="work-peek-caption"><strong>${esc(item.caption)}</strong><span>${esc(item.materials.join(' · '))}</span></div></div>`;
    }
    return `<div class="work-peek work-peek-overview" id="work-peek-${esc(p.id)}"><div class="work-overview-top"><span class="work-peek-eyebrow">PROJECT OVERVIEW</span><span class="work-overview-mark" aria-hidden="true">↗</span></div><p class="work-overview-kind">${esc(item.kind || p.category.toUpperCase())}</p><p class="work-overview-summary">${esc(p.summary)}</p><div class="work-materials"><span>INSIDE THE FULL STUDY</span><ul>${materials}</ul></div></div>`;
  }

  function cardVisual(p) {
    const kicker = p.id === 'webinar-delivery' ? '<span class="work-stat-kicker">UP TO</span>' : '';
    return `<div class="work-card-visual work-visual-${esc(p.visual)}"><div class="work-front"><svg class="work-deco" data-watermark="sculptural" viewBox="0 0 480 320" fill="none" aria-hidden="true" focusable="false"><g class="wm-portal"><path class="wm-band" d="M266 342V154C266 86 312 40 380 40S494 86 494 154V342" style="--wm-band:27px"/><path class="wm-band" d="M311 342V156C311 115 339 86 380 86S449 115 449 156V342" style="--wm-band:24px"/><path class="wm-band" d="M354 342V158C354 141 364 130 380 130S406 141 406 158V342" style="--wm-band:21px"/><path class="wm-solid" d="M236 18H292V44H272V67H236Z"/></g><g class="wm-wave"><path class="wm-band" d="M250 -32C420 -10 238 104 398 133S276 267 452 352" style="--wm-band:28px"/><path class="wm-band" d="M306 -32C476 -10 294 104 454 133S332 267 508 352" style="--wm-band:26px"/><path class="wm-band" d="M362 -32C532 -10 350 104 510 133S388 267 564 352" style="--wm-band:24px"/><path class="wm-solid" d="M248 250H291V277H272V305H248Z"/></g><g class="wm-fan"><path class="wm-band" d="M250 342V278A205 205 0 0 1 455 73H510" style="--wm-band:28px"/><path class="wm-band" d="M297 342V280A160 160 0 0 1 457 120H510" style="--wm-band:26px"/><path class="wm-band" d="M343 342V280A114 114 0 0 1 457 166H510" style="--wm-band:24px"/><path class="wm-solid" d="M250 18H320V46H299V74H250Z"/></g></svg><div class="work-front-top"><span>${esc(p.category.toUpperCase())}</span><span>${esc(p.number)} /</span></div><div class="work-stat-block">${kicker}<strong class="work-front-stat">${esc(p.outcome)}</strong><span class="work-front-label">${esc(workFrontLabel(p))}</span></div><div class="work-front-bottom"><span class="work-hint-desktop">HOVER TO PREVIEW</span><span class="work-hint-touch">A CLOSER LOOK BELOW</span><span aria-hidden="true">↗</span></div></div>${workPeekContent(p)}</div>`;
  }

  function card(p) {
    const stat = (p.id === 'webinar-delivery' ? 'Up to ' : '') + p.outcome + ' ' + workFrontLabel(p);
    return `<article class="project-card work-project-card" id="preview-${esc(p.id)}"><div class="work-visual-wrap"><button type="button" class="visual-button work-visual-trigger" data-project="${esc(p.id)}" aria-label="Open ${esc(p.title)} ${esc(stat)}. Full study requires access.">${cardVisual(p)}</button><button type="button" class="work-preview-toggle" data-preview-toggle="${esc(p.id)}" aria-controls="work-peek-${esc(p.id)}" aria-expanded="false">Preview <span aria-hidden="true">↓</span></button></div><div class="project-body"><div class="project-meta"><span>PROJECT ${esc(p.number)}</span><span>${esc(p.eyebrow.split(' · ')[0])}</span></div><div class="chips" aria-label="Skills">${chips(p,4)}</div><h3><button type="button" data-project="${esc(p.id)}">${esc(p.title)}</button></h3><p>${esc(p.summary)}</p>${workRoleContext(p)}<div class="card-action"><button type="button" data-project="${esc(p.id)}">OPEN PROJECT <span aria-hidden="true">↗</span></button><span class="lock-label"><span class="lock-icon" aria-hidden="true"></span>Full study · access code</span></div></div></article>`;
  }

  function renderProjects() {
    const grid=$('#all-projects'); if(!grid) return;
    const visible=projects.filter(p=>(filter==='all'||p.category===filter)&&`${p.title} ${p.summary} ${p.skills.join(' ')} ${p.category} ${workRoleSearchText(p)}`.toLowerCase().includes(search));
    const shown = visible;
    grid.innerHTML=visible.length ? shown.map(card).join('') : '<p class="no-results">No projects match that search. Try another skill or choose “All work.”</p>';
    $('#project-count').textContent=`${shown.length<visible.length?`${shown.length} of `:''}${visible.length} project${visible.length===1?'':'s'}${filter==='all'?'':` · ${filter}`}`;
    
  }
  function toast(message) {
    const el=$('#toast'); if(!el)return; clearTimeout(toastTimer); el.textContent=message;el.hidden=false;
    toastTimer=setTimeout(()=>el.hidden=true,6500);
  }
  function openDialog(id) {
    const el=$(id); if(!el)return;
    $$('dialog[open]').forEach(d=>d.close());
    el.showModal();document.body.classList.add('modal-open');
  }
  function closeDialogs(){ $$('dialog[open]').forEach(d=>d.close());document.body.classList.remove('modal-open'); }
  function projectDialog(id) {
    const p=projects.find(x=>x.id===id);if(!p)return;
    activeProject=id;
    if(!authenticated){openAccess('login');return;}
    $('#project-dialog-body').innerHTML=`${visual(p)}<p class="eyebrow red">Project ${esc(p.number)} / ${esc(p.eyebrow)}</p><h2 id="project-dialog-title">${esc(p.title)}</h2><div class="chips">${chips(p)}</div><p class="intro">${esc(p.summary)}</p><div class="modal-result"><strong>${esc(p.outcome)}</strong><span>${esc(p.outcomeLabel)}</span></div><div class="button-row">${authenticated?`<button class="btn" data-view-case="${esc(p.id)}">Read the full case study →</button>`:`<button class="btn" data-open-access="login">Enter access code →</button><button class="btn outline" data-open-access="request">Request access ↗</button>`}</div><p class="form-fine">This is a public project preview. Detailed materials and downloads remain private.</p>`;
    openDialog('#project-dialog');
  }
  function setTab(name) {
    $$('[data-tab]').forEach(el=>{const on=el.dataset.tab===name;el.setAttribute('aria-selected',String(on));el.tabIndex=on?0:-1;});
    $('#request-panel').hidden=name!=='request';$('#login-panel').hidden=name!=='login';
    renderTurnstile();
  }
  async function openAccess(tab='login') {
    const selected = projects.find(p=>p.id===activeProject);
    const context = $('#access-project-context');
    context.hidden=!selected;
    if(selected){
      $('#access-project-category').textContent='Project '+selected.number+' / '+selected.category;
      $('#access-project-title').textContent=selected.title;
      $('#access-project-summary').textContent=selected.summary;
    }
    setTab(tab);$('#request-project').value=activeProject;openDialog('#access-dialog');
    const field=tab==='login'?$('#password-form input[name=password]'):$('#request-form input[name=name]');
    field?.focus({preventScroll:true});
    await getConfig(); await renderTurnstile();
  }
  async function getConfig() {
    if(pendingConfig)return pendingConfig;
    pendingConfig=api('config').then(x=>config=x).catch(()=>{pendingConfig=null;return config={ready:false};});
    return pendingConfig;
  }
  async function renderTurnstile() {
    if(!config.turnstileSiteKey)return;
    if(!window.turnstile) {
      if(!document.getElementById('cf-turnstile-script')) {
        const s=document.createElement('script');s.id='cf-turnstile-script';s.src='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';s.async=true;
        s.onload=renderTurnstile;document.head.append(s);
      }
      return;
    }
    $$('.turnstile-slot').forEach(el=>{
      if(widgets.has(el.id)||!el.getClientRects().length)return;
      const action=el.id.replace('-turnstile','');
      const id=window.turnstile.render(el,{sitekey:config.turnstileSiteKey,theme:'light',action});widgets.set(el.id,id);
    });
  }
  function tokenFor(form){ const el=$('.turnstile-slot',form);if(!el||!window.turnstile||!widgets.has(el.id))return '';return window.turnstile.getResponse(widgets.get(el.id)); }
  function resetWidget(form){const el=$('.turnstile-slot',form);if(el&&window.turnstile&&widgets.has(el.id))window.turnstile.reset(widgets.get(el.id));}
  async function submitForm(form,endpoint,success) {
    const status=$('.form-status',form),button=$('[type=submit]',form);
    status.textContent='';button.disabled=true;
    try {
      await getConfig();
      const data=Object.fromEntries(new FormData(form));data.turnstileToken=tokenFor(form);
      if(!config.ready)throw new Error('Portfolio access is temporarily unavailable. Please try again or email goldinthecracksofficial@gmail.com.');
      const result=await api(endpoint,data);await success(result);
    } catch(err) {status.textContent=err.message;}
    finally {button.disabled=false;resetWidget(form);}
  }
  async function authenticateAndOpen() {
    authenticated=true;closeDialogs();
    const destination=activeProject?'case-'+activeProject:'private-library';
    if(!$('#private-content')) { navigate('/my-work/#'+destination);return; }
    await loadPrivate();document.getElementById(destination)?.scrollIntoView({behavior:scrollBehavior()});
  }
  async function loadSession() {
    try {const s=await api('session');authenticated=!!s.authorized;if(authenticated)await loadPrivate();} catch {authenticated=false;}
  }
  /* BEGIN GUIDED LEARNING PATH */
  function learningPathSteps(p) {
    if(!Array.isArray(p.learningPath?.steps))return [];
    const assets=new Map(privateCases.flatMap(item=>(item.assets||[]).map(asset=>[asset.key,asset])));
    return p.learningPath.steps.filter(step=>step&&typeof step.title==='string'&&typeof step.assetKey==='string')
      .map(step=>({...step,asset:assets.get(step.assetKey)}));
  }
  function learningPathPoster(step) {
    return typeof step.poster==='string'&&/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(step.poster)&&!/\s/.test(step.poster)?step.poster:'';
  }
  function learningSampleRequest(p,step) {
    return 'mailto:goldinthecracksofficial@gmail.com?subject='+encodeURIComponent('Work sample request: '+p.title+' — '+(step.asset?.label||step.title));
  }
  function learningStepPanel(p,steps,index) {
    const step=steps[index],asset=step.asset,poster=learningPathPoster(step);
    let media='',download='';
    if(asset?.available&&asset.kind==='VIDEO'&&!asset.externalUrl&&/\.mp4$/i.test(asset.key)){
      const url='/api/asset/'+encodeURIComponent(asset.key);
      media=`<video class="learning-path-video" controls playsinline preload="none" aria-label="${esc(step.title)}"${poster?` poster="${poster}"`:''} src="${url}?play=1">Your browser cannot play this video. Use the download link below.</video>`;
      download=`<a class="learning-path-download" href="${url}" target="_blank" rel="noopener noreferrer">Download original <span aria-hidden="true">↗</span></a>`;
    }else if(asset?.available){
      media=`<div class="learning-path-empty"><p>Open this video to explore the next part of the learning experience.</p><a href="/api/asset/${encodeURIComponent(asset.key)}" target="_blank" rel="noopener noreferrer">Watch video <span aria-hidden="true">↗</span></a></div>`;
    }else{
      media=`<div class="learning-path-empty"><p>This example is available by request.</p><a href="${esc(learningSampleRequest(p,step))}">Request this sample <span aria-hidden="true">↗</span></a></div>`;
    }
    const next=steps[index+1];
    return `<p class="learning-path-status">Step ${index+1} of ${steps.length}${step.duration?` · ${esc(step.duration)}`:''}${step.optional?' · Optional':''}</p><h5 class="learning-path-heading" id="learning-step-title-${esc(p.id)}" tabindex="-1">${esc(step.title)}</h5><p class="learning-path-description">${esc(step.description||'')}</p>${media}<div class="learning-path-footer">${download}${next?`<button type="button" class="learning-path-next" data-learning-step="${index+1}" data-learning-next>${next.optional?'Explore optional step':'Next'}: ${esc(next.title)} <span aria-hidden="true">→</span></button>`:''}</div>`;
  }
  function renderLearningPath(p) {
    const steps=learningPathSteps(p);if(!steps.length)return '';
    return `<section class="learning-path" data-learning-path="${esc(p.id)}" aria-labelledby="learning-title-${esc(p.id)}"><div class="learning-path-header"><p class="learning-path-eyebrow">One connected learning experience</p><h4 class="learning-path-title" id="learning-title-${esc(p.id)}">${esc(p.learningPath.title||'Follow the learning experience.')}</h4><p class="learning-path-intro">${esc(p.learningPath.intro||'')}</p></div><ol class="learning-path-steps" aria-label="Choose a step in the learning experience">${steps.map((step,index)=>`<li><button type="button" class="learning-path-choice" data-learning-step="${index}" data-learning-choice aria-controls="learning-panel-${esc(p.id)}"${index===0?' aria-current="step"':''}><span class="learning-path-number" aria-hidden="true">${String(index+1).padStart(2,'0')}</span><span class="learning-path-choice-copy"><strong>${esc(step.title)}</strong>${step.duration||step.optional?`<small>${esc(step.duration||'')}${step.optional?' · Optional':''}</small>`:''}</span></button></li>`).join('')}</ol><div class="learning-path-panel" id="learning-panel-${esc(p.id)}" data-learning-panel aria-labelledby="learning-step-title-${esc(p.id)}">${learningStepPanel(p,steps,0)}</div></section>`;
  }
  function selectLearningStep(button) {
    const container=button.closest('[data-learning-path]');if(!container)return;
    const p=privateCases.find(item=>item.id===container.dataset.learningPath);if(!p)return;
    const steps=learningPathSteps(p),index=Number(button.dataset.learningStep);
    if(!Number.isInteger(index)||index<0||index>=steps.length)return;
    const panel=container.querySelector('[data-learning-panel]');if(!panel)return;
    const focusHeading=button.hasAttribute('data-learning-next');
    panel.querySelectorAll('video').forEach(video=>{video.pause();video.removeAttribute('src');video.load();});
    panel.innerHTML=learningStepPanel(p,steps,index);
    container.querySelectorAll('[data-learning-choice]').forEach(choice=>{
      if(Number(choice.dataset.learningStep)===index)choice.setAttribute('aria-current','step');
      else choice.removeAttribute('aria-current');
    });
    if(focusHeading)panel.querySelector('.learning-path-heading')?.focus({preventScroll:true});
  }
  /* END GUIDED LEARNING PATH */
  async function loadPrivate() {
    const target=$('#private-content');if(!target)return;
    try {
      const data=await api('projects');if(!Array.isArray(data.projects))throw new Error('The case studies could not be loaded. Please try again.');privateCases=data.projects;
      $('#access-gate').hidden=true;target.hidden=false;
      target.innerHTML=`<div class="private-intro"><div><p class="eyebrow red">Access granted / the complete picture</p><h2>The full case studies.</h2></div><button class="btn outline small" data-logout>Sign out ↗</button></div><div class="private-layout"><nav class="case-index" aria-label="Case study index">${privateCases.map(p=>`<a href="#case-${esc(p.id)}">${esc(p.number)} &nbsp; ${esc(p.title)}</a>`).join('')}</nav><div>${privateCases.map(p=>`<article class="case-study" id="case-${esc(p.id)}"><p class="eyebrow red">Project ${esc(p.number)} / ${esc(p.category)}</p><h3>${esc(p.title)}</h3><div class="chips">${chips(p)}</div><p class="case-summary">${esc(p.summary)}</p><div class="modal-result"><strong>${esc(p.outcome)}</strong><span>${esc(p.outcomeLabel)}</span></div><div class="case-parts"><div><h4>The context</h4><p>${esc(p.challenge)}</p></div><div><h4>What I did</h4><p>${esc(p.approach)}</p></div><div><h4>The result</h4><p>${esc(p.impact)}</p></div></div>${renderLearningPath(p)}<h4 style="margin-bottom:16px">${p.learningPath?'Original files':'The work samples'}</h4><div class="asset-list">${p.assets.map(a=>`<div class="asset-row ${a.available?'':'unavailable'}"><span class="asset-type">${esc(a.kind)}</span>${a.available?`<a href="/api/asset/${encodeURIComponent(a.key)}" target="_blank" rel="noopener noreferrer">${esc(a.label)} ↗</a>`:`<span>${esc(a.label)}</span>`}${a.available?`<span class="asset-state">${a.externalUrl&&a.kind==='VIDEO'?'Watch on YouTube':'Private file'}</span>`:`<a class="asset-state" href="mailto:goldinthecracksofficial@gmail.com?subject=${encodeURIComponent('Work sample request: '+p.title+' — '+a.label)}">Request this sample ↗</a>`}</div>`).join('')}</div></article>`).join('')}</div></div>`;
      const fragment=location.hash.slice(1);
      if(fragment?.startsWith('case-'))setTimeout(()=>document.getElementById(fragment)?.scrollIntoView({behavior:scrollBehavior()}),0);
    }catch(err){toast(err.message);}
  }
  async function loadAdmin() {
    if(!$('#admin-content'))return;
    try {
      const result=await api('admin/requests');
      if(!result.requests)return;
      adminAuthenticated=true;$('#admin-auth').hidden=true;$('#admin-content').hidden=false;
      $('#admin-requests').innerHTML=result.requests.length?result.requests.map(r=>`<article class="admin-card"><p class="eyebrow red">${esc(r.status)} · ${esc(new Date(r.created_at*1000).toLocaleDateString())}</p><h3>${esc(r.name)}</h3><p>${esc(r.email)}<br>${esc(r.organization)}${r.project?`<br>Interested in: ${esc(r.project)}`:''}</p><div class="button-row">${r.status!=='approved'?`<button class="btn small" data-admin-action="approve" data-id="${esc(r.id)}">Approve & email access</button>`:`<button class="btn small" data-admin-action="resend" data-id="${esc(r.id)}">Send a fresh link</button>`}<button class="btn outline small" data-admin-action="revoke" data-id="${esc(r.id)}">Revoke / decline</button><button class="btn outline small" data-admin-action="delete" data-id="${esc(r.id)}">Delete details</button></div></article>`).join(''):'<p class="notice">No access requests yet.</p>';
    }catch { $('#admin-auth').hidden=false;$('#admin-content').hidden=true; }
  }
  function navigate(path){window.location.assign(path);}
  function projectIdFromHash(hash=location.hash) {
    let id;try{id=decodeURIComponent(hash.slice(1));}catch{return '';}
    return projects.some(project=>project.id===id)?id:'';
  }
  async function openProjectFromHash() {
    const navigation=++projectNavigation,id=projectIdFromHash();
    if(!id)return;
    await sessionReady;
    if(navigation===projectNavigation&&projectIdFromHash()===id)projectDialog(id);
  }
  function mount() {
    filter='all';search='';widgets.clear();document.body.classList.remove('modal-open');
    $$('[data-year]').forEach(e=>e.textContent=new Date().getFullYear());
    $$('[data-featured]').forEach(el=>el.innerHTML=el.dataset.featured.split(',').map(id=>projects.find(p=>p.id===id)).filter(Boolean).map(card).join(''));
    renderProjects();
    $$('dialog').forEach(el=>el.addEventListener('close',()=>document.body.classList.remove('modal-open')));
    $('#project-search')?.addEventListener('input',e=>{search=e.target.value.trim().toLowerCase();renderProjects();});
    $('#request-form')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'request-access',result=>{$('.form-status',e.target).textContent=result.message;e.target.reset();});});
    $('#password-form')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'password-login',authenticateAndOpen);});
    $('#email-login-form')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'login',result=>{$('.form-status',e.target).textContent=result.message;});});
    $('#admin-login-form')?.addEventListener('submit',e=>{e.preventDefault();submitForm(e.currentTarget,'admin/login',()=>loadAdmin());});
    $('#redeem-access')?.addEventListener('click',async()=>{
      const el=$('#access-status'),button=$('#redeem-access');button.disabled=true;
      try{const token=new URLSearchParams(location.hash.slice(1)).get('token');if(!token)throw new Error('No sign-in token was found. Use the link in your approval email.');await api('redeem',{token});history.replaceState(null,'',location.pathname);navigate('/my-work/#private-library');}catch(e){el.textContent=e.message;button.disabled=false;}
    });
    getConfig().then(()=>{if($('#admin-login-form'))renderTurnstile();});
    loadAdmin();
    sessionReady=loadSession();openProjectFromHash();
  }
  document.addEventListener('click',async e=>{
    const target=e.target.closest('button,a,dialog');if(!target)return;
    if(target.hasAttribute('data-learning-step')){selectLearningStep(target);return;}
    if(target.matches('dialog')){const r=target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)closeDialogs();return;}
    if(target.matches('[data-close]')){closeDialogs();return;}
    if(target.matches('.nav-toggle')){const open=$('#main-nav').classList.toggle('open');target.setAttribute('aria-expanded',String(open));return;}
    if(target.dataset.filter){filter=target.dataset.filter;$$('[data-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b===target)));renderProjects();return;}
    if(target.dataset.previewToggle){
      const card=target.closest('.work-project-card');const open=card.classList.toggle('is-preview');
      target.setAttribute('aria-expanded',String(open));target.innerHTML=open?'Hide preview <span aria-hidden="true">↑</span>':'Preview <span aria-hidden="true">↓</span>';return;
    }
    if(target.dataset.project){projectDialog(target.dataset.project);return;}
    if(target.dataset.openAccess){e.preventDefault();if(!target.closest('#project-dialog'))activeProject='';openAccess(target.dataset.openAccess);return;}
    if(target.dataset.tab){setTab(target.dataset.tab);return;}
    if(target.id==='show-email-login'){$('#email-login-form').hidden=!$('#email-login-form').hidden;renderTurnstile();return;}
    if(target.id==='print-resume'){window.print();return;}
    if(target.dataset.viewCase){closeDialogs();if(!$('#private-content')){navigate('/my-work/#case-'+target.dataset.viewCase);return;}$('#case-'+target.dataset.viewCase)?.scrollIntoView({behavior:scrollBehavior()});return;}
    if(target.hasAttribute('data-logout')){try{await api('logout',{});authenticated=false;privateCases=[];$('#access-gate').hidden=false;$('#private-content').hidden=true;$('#private-content').innerHTML='';toast('You’re signed out.');}catch(err){toast(err.message);}return;}
    if(target.id==='admin-logout'){target.disabled=true;try{await api('admin/logout',{});adminAuthenticated=false;$('#admin-auth').hidden=false;$('#admin-content').hidden=true;$('#admin-requests').innerHTML='';}catch(err){toast(err.message);}finally{target.disabled=false;}return;}
    if(target.dataset.adminAction){
      const action=target.dataset.adminAction;
      if((action==='delete'||action==='revoke')&&!confirm(action==='delete'?'Delete this person’s access record and sessions?':'Revoke or decline access for this person?'))return;
      target.disabled=true;try{const res=await api('admin/action',{id:target.dataset.id,action});await loadAdmin();toast(res.message||'Updated.');}catch(err){toast(err.message);target.disabled=false;}return;
    }
    if(target.tagName==='A'&&!e.defaultPrevented&&!e.metaKey&&!e.ctrlKey&&!e.shiftKey&&!e.altKey&&e.button===0&&!target.hasAttribute('download')&&(!target.target||target.target==='_self')){
      const url=new URL(target.href,location.href);
      const samePath=path=>path.replace(/\/+$/,'')||'/';
      if(url.origin===location.origin&&samePath(url.pathname)===samePath(location.pathname)&&url.search===location.search&&url.hash===location.hash&&projectIdFromHash(url.hash)){
        e.preventDefault();openProjectFromHash();
      }
    }
  });
  window.addEventListener('hashchange',openProjectFromHash);
  document.addEventListener('keydown',e=>{if(e.target.matches('[data-tab][role=tab]')&&['ArrowRight','ArrowLeft'].includes(e.key)){e.preventDefault();const name=e.target.dataset.tab==='request'?'login':'request';setTab(name);$(`#${name}-tab`).focus();}});
  window.PV={mount,visual,card};
  mount();
})();
