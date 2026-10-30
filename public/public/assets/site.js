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
    const art = p.id !== 'physical-education-program' && imageNames.has(p.visual)
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
    'physical-education-program': {materials:['Curriculum strategy','Fall family update'], kind:'CURRICULUM & FAMILY COMMUNICATION'},
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
    return `<div class="work-card-visual work-visual-${esc(p.visual)}"><div class="work-front"><svg class="work-deco" data-watermark="editorial" viewBox="0 0 480 320" fill="none" aria-hidden="true" focusable="false">${Number(p.number)%2 ? '<path class="work-gesture" d="M320 90C345 36 366 49 370 81C372 110 402 120 415 83C425 53 449 42 488 78" />' : '<path class="work-blob" d="M385 21C413 8 436 23 450 42C481 42 505 72 484 104C500 129 470 158 438 153C416 168 379 153 374 127C345 115 346 85 369 69C364 47 369 32 385 21Z" />'}</svg><div class="work-front-top"><span>${esc(p.category.toUpperCase())}</span><span>${esc(p.number)} /</span></div><div class="work-stat-block">${kicker}<strong class="work-front-stat">${esc(p.outcome)}</strong><span class="work-front-label">${esc(workFrontLabel(p))}</span></div><div class="work-front-bottom"><span class="work-hint-desktop">HOVER TO PREVIEW</span><span class="work-hint-touch">A CLOSER LOOK BELOW</span><span aria-hidden="true">↗</span></div></div>${workPeekContent(p)}</div>`;
  }

  function card(p) {
    const stat = (p.id === 'webinar-delivery' ? 'Up to ' : '') + p.outcome + ' ' + workFrontLabel(p);
    return `<article class="project-card work-project-card" id="preview-${esc(p.id)}"><header class="work-card-heading"><span class="work-card-number">PROJECT ${esc(p.number)} / ${esc(p.category.toUpperCase())}</span><h3><button type="button" data-project="${esc(p.id)}">${esc(p.title)}</button></h3></header><div class="work-visual-wrap"><button type="button" class="visual-button work-visual-trigger" data-project="${esc(p.id)}" aria-label="Open ${esc(p.title)}. ${esc(stat)}.">${cardVisual(p)}</button><button type="button" class="work-preview-toggle" data-preview-toggle="${esc(p.id)}" aria-controls="work-peek-${esc(p.id)}" aria-expanded="false">Preview image <span aria-hidden="true">↓</span></button></div><div class="project-body"><p>${esc(p.summary)}</p><div class="chips" aria-label="Skills">${chips(p,4)}</div>${workRoleContext(p)}<div class="card-action"><button type="button" data-project="${esc(p.id)}">OPEN CASE STUDY <span aria-hidden="true">↗</span></button><span class="lock-label"><span class="lock-icon" aria-hidden="true"></span>${authenticated?'Access granted':'Access code if needed'}</span></div></div></article>`;
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
  async function projectDialog(id) {
    const p=projects.find(x=>x.id===id);if(!p)return;
    activeProject=id;
    if(!authenticated){await openAccess('login');return;}
    if(!$('#private-content')){navigate('/my-work/#case-'+encodeURIComponent(id));return;}
    if(!privateCases.length)await loadPrivate();
    const selected=document.getElementById('case-'+id);
    if(selected)selected.scrollIntoView({behavior:scrollBehavior(),block:'start'});
    else toast('This case study is not available yet. Please email goldinthecracksofficial@gmail.com for a copy.');
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
    pendingConfig=api('config').then(x=>config=x).catch(err=>{
      pendingConfig=null;
      return config={ready:false,passwordReady:false,requestsReady:false,connectionError:err.message};
    });
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
      const isPassword=endpoint==='password-login';
      const available=isPassword?config.passwordReady:config.requestsReady;
      if(!available){
        if(config.connectionError)throw new Error('The access API has not been deployed at this address. The portfolio code cannot be checked yet. Please email goldinthecracksofficial@gmail.com.');
        const missing=Array.isArray(config.missing)&&config.missing.length?' Missing: '+config.missing.join(', ')+'.':'';
        throw new Error('Private access requires Cloudflare configuration.'+missing+' Please email goldinthecracksofficial@gmail.com.');
      }
      const result=await api(endpoint,data);await success(result);
    } catch(err) {status.textContent=err.message;}
    finally {button.disabled=false;resetWidget(form);}
  }
  async function authenticateAndOpen() {
    authenticated=true;closeDialogs();
    const destination=activeProject?'case-'+activeProject:'private-library';
    if(!$('#private-content')) { navigate('/my-work/#'+destination);return; }
    await loadPrivate();document.getElementById(destination)?.scrollIntoView({behavior:scrollBehavior(),block:'start'});
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
    let media='';
    if(asset?.available&&asset.kind==='VIDEO'&&!asset.externalUrl&&/\.mp4$/i.test(asset.key)){
      const url='/api/asset/'+encodeURIComponent(asset.key);
      media=`<video class="learning-path-video" controls controlsList="nodownload noremoteplayback" disablePictureInPicture playsinline preload="none" aria-label="${esc(step.title)}"${poster?` poster="${poster}"`:''} src="${url}?play=1">Your browser cannot play this video.</video>`;
    }else if(asset?.available){
      media=`<div class="learning-path-empty"><p>Open this video to explore the next part of the learning experience.</p><a href="/sample/?file=${encodeURIComponent(asset.key)}&amp;label=${encodeURIComponent(asset.label || step.title)}" target="_blank" rel="noopener noreferrer">Watch video <span aria-hidden="true">↗</span></a></div>`;
    }else{
      media=`<div class="learning-path-empty"><p>This example is available by request.</p><a href="${esc(learningSampleRequest(p,step))}">Request this sample <span aria-hidden="true">↗</span></a></div>`;
    }
    const next=steps[index+1];
    return `<p class="learning-path-status">Step ${index+1} of ${steps.length}${step.duration?` · ${esc(step.duration)}`:''}${step.optional?' · Optional':''}</p><h5 class="learning-path-heading" id="learning-step-title-${esc(p.id)}" tabindex="-1">${esc(step.title)}</h5><p class="learning-path-description">${esc(step.description||'')}</p>${media}<div class="learning-path-footer">${next?`<button type="button" class="learning-path-next" data-learning-step="${index+1}" data-learning-next>${next.optional?'Explore optional step':'Next'}: ${esc(next.title)} <span aria-hidden="true">→</span></button>`:''}</div>`;
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
  function privatePreviewVisual(p) {
    const item=workPreviewMap[p.id]||{};
    const name=p.id==='physical-education-program' ? null : (item.image || (imageNames.has(p.visual) ? p.visual : null));
    if(name && (imageNames.has(name) || ['slow-coffee','tso','nnu'].includes(name))) {
      const url=name==='book'?'/assets/img/book.svg':'/assets/img/'+name+'.webp';
      return `<div class="case-preview-cover case-cover-${esc(name)}"><img src="${url}" alt="${esc(item.alt || p.title+' project preview')}" loading="lazy"><span class="case-preview-image-caption">${esc(item.caption || p.title)}</span></div>`;
    }
    return `<div class="case-preview-graphic"><span>PROJECT ${esc(p.number)} / ${esc(p.category.toUpperCase())}</span><strong>${esc(p.outcome)}</strong><p>${esc(p.outcomeLabel)}</p><span class="case-preview-graphic-line" aria-hidden="true"></span></div>`;
  }
  function privateAsset(a,p) {
    if(!a.available) return `<div class="case-file case-file-missing"><span class="case-file-icon" aria-hidden="true">?</span><span class="case-file-info"><strong>${esc(a.label)}</strong><small>Available by request</small></span><a class="case-file-action" href="mailto:goldinthecracksofficial@gmail.com?subject=${encodeURIComponent('Work sample request: '+p.title+' — '+a.label)}">Request ↗</a></div>`;
    const isSlides=/\.pptx$/i.test(a.key);
    const isDocument=isSlides||/\.pdf$/i.test(a.key);
    const fileUrl=`/sample/?file=${encodeURIComponent(a.key)}&amp;label=${encodeURIComponent(a.label)}&amp;case=${encodeURIComponent(p.title)}`;
    // A document/presentation is always viewed as page images, never linked
    // to its R2 original (even if the case-study JSON contains externalUrl).
    const destination=(!isDocument&&a.kind==='VIDEO'&&a.externalUrl)?esc(a.externalUrl):fileUrl;
    const action=isSlides?'View slides':'View';
    const descriptor=isSlides?'SLIDE DECK · View-only slides':/\.pdf$/i.test(a.key)?'DOCUMENT · View-only pages':a.externalUrl&&a.kind==='VIDEO'?'VIDEO · Hosted playback':'VIDEO · Private streaming';
    return `<a class="case-file case-file-view" href="${destination}" target="_blank" rel="noopener noreferrer"><span class="case-file-icon" aria-hidden="true">${a.kind==='VIDEO'?'▶':isSlides?'▤':'↗'}</span><span class="case-file-info"><strong>${esc(a.label)}</strong><small>${descriptor}</small></span><span class="case-file-action">${action} ↗</span></a>`;
  }
  function renderPrivateCase(p) {
    return `<article class="case-study" id="case-${esc(p.id)}"><div class="case-study-heading"><p class="eyebrow red">Project ${esc(p.number)} / ${esc(p.category)}</p><h3>${esc(p.title)}</h3><p class="case-summary">${esc(p.summary)}</p></div><div class="case-study-columns"><div class="case-narrative"><div class="chips">${chips(p)}</div><div class="case-parts"><div><h4>The challenge</h4><p>${esc(p.challenge)}</p></div><div><h4>The idea & what I did</h4><p>${esc(p.approach)}</p></div><div><h4>The outcome</h4><p>${esc(p.impact)}</p></div></div><div class="case-outcome"><strong>${esc(p.outcome)}</strong><span>${esc(p.outcomeLabel)}</span></div></div><aside class="case-preview" aria-label="Work sample previews for ${esc(p.title)}"><div class="case-preview-top"><span>INSIDE THE WORK</span><span>${p.assets.length} SAMPLE${p.assets.length===1?'':'S'}</span></div>${privatePreviewVisual(p)}<div class="case-preview-files">${p.assets.map(a=>privateAsset(a,p)).join('')}</div><p class="case-preview-help" role="status" aria-live="polite" hidden></p></aside></div>${renderLearningPath(p)}</article>`;
  }
  /* A visual table of contents for the authorized work: one tap to jump,
     with a live reading indicator and keyboard-accessible project links. */
  function renderCaseIndex(items) {
    const count=items.length;
    return `<nav class="case-index" aria-label="Explore the case studies"><div class="case-index-top"><div class="case-index-kicker"><span class="case-index-signal" aria-hidden="true"></span><span>THE WORK / INDEX</span></div><span class="case-index-total">${count} CASES <span class="case-index-swipe" aria-hidden="true">· SWIPE →</span></span></div><div class="case-index-reading"><span class="case-index-read-label">YOU’RE VIEWING</span><span class="case-index-read-number" id="case-index-number">01<span> / ${String(count).padStart(2,'0')}</span></span></div><div class="case-index-progress" role="progressbar" aria-label="Current case study" aria-valuemin="1" aria-valuemax="${count}" aria-valuenow="1"><span class="case-index-progress-fill" style="width:${count?100/count:0}%"></span></div><div class="case-index-list">${items.map((p,i)=>`<a href="#case-${esc(p.id)}" class="case-index-item${i===0?' is-current':''}" data-case-nav="${esc(p.id)}" ${i===0?'aria-current="location"':''}><span class="case-index-item-num">${esc(p.number)}</span><span class="case-index-item-copy"><span class="case-index-item-category">${esc(p.category)}</span><span class="case-index-item-title">${esc(p.title)}</span></span><span class="case-index-item-arrow" aria-hidden="true">↗</span></a>`).join('')}</div><div class="case-index-bottom"><span>SELECT A PROJECT</span><span aria-hidden="true">↕ SCROLL</span></div></nav>`;
  }
  let disposeCaseIndex=()=>{};
  function enableCaseIndex() {
    disposeCaseIndex();
    const menu=$('#private-content .case-index');
    const list=menu?.querySelector('.case-index-list');
    const links=list?$$('[data-case-nav]',list):[];
    const cases=$$('#private-content .case-study');
    if(!menu||!cases.length)return;
    let current='',frame=0;
    function setCurrent(id) {
      if(!id||id===current)return;
      current=id;
      const at=links.findIndex(a=>a.dataset.caseNav===id);
      if(at<0)return;
      links.forEach(a=>{
        const on=a.dataset.caseNav===id;
        a.classList.toggle('is-current',on);
        if(on)a.setAttribute('aria-current','location');
        else a.removeAttribute('aria-current');
      });
      const number=menu.querySelector('#case-index-number');
      if(number)number.innerHTML=`${String(at+1).padStart(2,'0')}<span> / ${String(cases.length).padStart(2,'0')}</span>`;
      const progress=menu.querySelector('.case-index-progress');
      const fill=menu.querySelector('.case-index-progress-fill');
      if(progress)progress.setAttribute('aria-valuenow',String(at+1));
      if(fill)fill.style.width=`${(at+1)*100/cases.length}%`;
      const active=links[at];
      if(matchMedia('(max-width: 1160px)').matches){
        const start=active.offsetLeft, end=start+active.offsetWidth;
        if(start<list.scrollLeft+16||end>list.scrollLeft+list.clientWidth-16){list.scrollTo({left:Math.max(0,start-list.clientWidth/2+active.offsetWidth/2),behavior:'auto'});}
      }else{
        const start=active.offsetTop-list.offsetTop,end=start+active.offsetHeight;
        if(start<list.scrollTop+12||end>list.scrollTop+list.clientHeight-12){list.scrollTo({top:Math.max(0,start-list.clientHeight/2+active.offsetHeight/2),behavior:'auto'});}
      }
    }
    function update() {
      frame=0;
      const threshold=Math.min(310,Math.max(175,window.innerHeight*.34));
      let visible=cases[0];
      for(const item of cases){if(item.getBoundingClientRect().top<=threshold)visible=item;else break;}
      setCurrent(visible.id.slice(5));
    }
    function schedule(){if(!frame)frame=requestAnimationFrame(update);}
    function onClick(e){
      const link=e.target.closest('[data-case-nav]');
      if(link)setCurrent(link.dataset.caseNav);
    }
    list.addEventListener('click',onClick);
    window.addEventListener('scroll',schedule,{passive:true});
    window.addEventListener('resize',schedule,{passive:true});
    schedule();
    disposeCaseIndex=()=>{
      if(frame)cancelAnimationFrame(frame);
      list.removeEventListener('click',onClick);
      window.removeEventListener('scroll',schedule);
      window.removeEventListener('resize',schedule);
    };
  }
  async function loadPrivate() {
    const target=$('#private-content');if(!target)return;
    try {
      const data=await api('projects');if(!Array.isArray(data.projects))throw new Error('The case studies could not be loaded. Please try again.');privateCases=data.projects;
      $('#access-gate').hidden=true;target.hidden=false;
      target.innerHTML=`<div class="private-intro"><div><p class="eyebrow red">Access granted / the complete picture</p><h2>Explore the full work.</h2><p>Each case includes the thinking, the outcome, and a preview of its supporting work.</p></div><button class="btn outline small" data-logout>Sign out ↗</button></div><div class="private-layout">${renderCaseIndex(privateCases)}<div class="case-studies-list">${privateCases.map(renderPrivateCase).join('')}</div></div>`;
      enableCaseIndex();
      const fragment=location.hash.slice(1);
      if(fragment.startsWith('case-'))requestAnimationFrame(()=>document.getElementById(fragment)?.scrollIntoView({behavior:scrollBehavior()}));
    }catch(err){
      $('#access-gate').hidden=true;target.hidden=false;
      disposeCaseIndex();
      const unavailable=err.message.toLowerCase().includes('not been uploaded')||err.message.toLowerCase().includes('not ready');
      target.innerHTML=`<div class="case-library-error" role="alert"><h2>Access confirmed. Case-study library unavailable.</h2><p>${unavailable?'The private case-study index has not been added to Cloudflare R2. Upload case-studies.json to the root of the private bucket.':'The private library could not load. Please try again or contact Peter for the sample.'}</p><a href="mailto:goldinthecracksofficial@gmail.com?subject=Portfolio%20case%20study%20request">Request a work sample ↗</a></div>`;
    }
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
    const projectId=id.startsWith('case-')?id.slice(5):id;return projects.some(project=>project.id===projectId)?projectId:'';
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
    if(target.dataset.viewCase){closeDialogs();projectDialog(target.dataset.viewCase);return;}
    if(target.hasAttribute('data-logout')){try{await api('logout',{});disposeCaseIndex();authenticated=false;privateCases=[];$('#access-gate').hidden=false;$('#private-content').hidden=true;$('#private-content').innerHTML='';toast('You’re signed out.');}catch(err){toast(err.message);}return;}
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


/*
 * Peter Verdin portfolio — iOS-safe diagonal arrows
 * Converts ↗ and ↗️ into ↗︎ (Unicode text presentation), including
 * arrows added later by project previews, view-only cards, and dialogs.
 * Does not alter links, content, styling, or form behavior.
 */
(() => {
  'use strict';
  const skip = 'script,style,noscript,template,textarea,pre,code,svg,math';
  // U+FE0E requests a plain typographic symbol rather than an emoji.
  const emojiArrow = /\u2197\uFE0F?(?!\uFE0E)/g;
  const textArrow = '\u2197\uFE0E';

  function updateText(node) {
    if (!node || node.nodeType !== 3 || node.parentElement?.closest(skip)) return;
    const before = node.nodeValue;
    const after = before.replace(emojiArrow, textArrow);
    if (after !== before) node.nodeValue = after;
  }

  function updateTree(root) {
    if (!root) return;
    if (root.nodeType === 3) return updateText(root);
    if (root.nodeType !== 1 || root.matches(skip)) return;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) updateText(node);
  }

  function start() {
    updateTree(document.body);
    new MutationObserver((changes) => {
      for (const change of changes) {
        if (change.type === 'characterData') updateText(change.target);
        else for (const node of change.addedNodes) updateTree(node);
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true });
  }

  if (document.readyState === 'loading')
    document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
})();


/* Portfolio: click-to-play YouTube previews for authorized case studies.
   Paste at the very end of /assets/site.js, after the existing code. */
;(() => {
  'use strict';
  const start = () => {
    const library = document.getElementById('private-content');
    if (!library) return;

    const styles = document.createElement('style');
    styles.textContent = `
      .pv-youtube-stage { position:relative; aspect-ratio:16/9; width:100%; overflow:hidden;
        background:#201c1b; color:#f5f0e8; }
      .pv-youtube-stage img { display:block; width:100%; height:100%; object-fit:cover; }
      .pv-youtube-play { position:absolute; inset:0; display:flex; align-items:center;
        justify-content:center; width:100%; height:100%; border:0; cursor:pointer;
        background:linear-gradient(0deg,rgba(0,0,0,.65),transparent 48%); color:#fff; }
      .pv-youtube-play:focus-visible { outline:4px solid #db3026; outline-offset:-4px; }
      .pv-youtube-play-icon { display:grid; place-items:center; width:72px; height:54px;
        background:#db3026; border:2px solid #f5f0e8; border-radius:12px;
        box-shadow:0 5px 24px rgba(0,0,0,.3); transition:transform .2s; }
      .pv-youtube-play:hover .pv-youtube-play-icon { transform:scale(1.08); }
      .pv-youtube-play-icon:before { content:''; width:0; height:0;
        border-top:11px solid transparent; border-bottom:11px solid transparent;
        border-left:17px solid #fff; margin-left:4px; }
      .pv-youtube-caption { position:absolute; bottom:0; left:0; right:0;
        padding:11px 15px; text-align:left; font:700 13px/1.3 Arial,sans-serif;
        letter-spacing:.02em; color:#fff; pointer-events:none; }
      .pv-youtube-stage iframe { border:0; display:block; width:100%; height:100%; }
      @media(max-width:740px){.pv-youtube-play-icon{width:64px;height:48px}}
    `;
    document.head.appendChild(styles);

    function renderPreviews() {
      library.querySelectorAll('.case-study .case-preview:not([data-pv-youtube-ready])').forEach(preview => {
        const link = Array.from(preview.querySelectorAll('.case-file-view[href]'))
          .find(a => /^https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}$/.test(a.href));
        if (!link) return;
        const id = new URL(link.href).searchParams.get('v');
        const old = preview.querySelector('.case-preview-cover, .case-preview-graphic');
        if (!old) return;
        const caption = link.querySelector('.case-file-info strong')?.textContent || 'Watch video';
        const stage = document.createElement('div');
        stage.className = 'pv-youtube-stage';
        const thumbnail = document.createElement('img');
        thumbnail.src = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
        thumbnail.alt = '';
        thumbnail.loading = 'lazy';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'pv-youtube-play';
        button.setAttribute('aria-label', `Play ${caption}`);
        const icon = document.createElement('span');
        icon.className = 'pv-youtube-play-icon';
        icon.setAttribute('aria-hidden', 'true');
        const text = document.createElement('span');
        text.className = 'pv-youtube-caption';
        text.textContent = caption;
        button.append(icon, text);
        button.addEventListener('click', () => {
          const frame = document.createElement('iframe');
          frame.title = caption;
          frame.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`;
          frame.setAttribute('allow', 'accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture; web-share');
          frame.setAttribute('allowfullscreen', '');
          frame.referrerPolicy = 'strict-origin-when-cross-origin';
          stage.replaceChildren(frame);
        });
        stage.append(thumbnail, button);
        old.replaceWith(stage);
        preview.dataset.pvYoutubeReady = 'true';
        // The existing work-sample row remains a YouTube link if embedding is blocked.
        link.querySelector('.case-file-action')?.replaceChildren(document.createTextNode('Watch ↗︎'));
      });
    }
    new MutationObserver(renderPreviews).observe(library, {childList:true, subtree:true});
    renderPreviews();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();

