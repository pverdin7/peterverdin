// View-only portfolio viewer. Never exposes the original PDF or PowerPoint bytes.
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const key=params.get('file')||'';
  const label=(params.get('label')||key||'Work sample').slice(0,160);
  const context=(params.get('case')||'').slice(0,160);
  $('sample-title').textContent=label;
  document.title=label+' | Peter Verdin';
  if(context){$('sample-case').hidden=false;$('sample-case').textContent=context;}
  const address='drpete@peterverdin.com';
  $('sample-email').href='mailto:'+address+'?subject='+encodeURIComponent('Portfolio sample request: '+label);
  function fail(title,message,unauthorized=false){
    $('sample-status').hidden=true;
    $('sample-view').hidden=true;
    $('sample-error').hidden=false;
    $('sample-error-heading').textContent=title;
    $('sample-error-text').textContent=message;
    if(unauthorized){$('sample-error-action').textContent='Sign in to the portfolio ↗';$('sample-email').hidden=true;}
  }
  const valid=/^[a-z0-9][a-z0-9._-]{0,150}$/.test(key)&&!key.includes('..');
  if(!valid){fail('This file link is invalid.','Return to the case study and select the work sample again.');return;}
  const ext=key.split('.').pop().toLowerCase();
  function viewReady(){
    $('sample-status').hidden=true;
    $('sample-view').hidden=false;
    // Keep the stage optional so a layout change never prevents media from opening.
    $('sample-stage')?.classList.add('is-viewing');
  }
  async function fetchError(response){
    try { const data=await response.json(); return String(data.error||'').slice(0,180); }
    catch { return ''; }
  }
  function serverFailure(status,reason,what){
    if(status===401){fail('Portfolio access has expired.','Sign in again, then reopen this work sample.',true);return;}
    if(status===404){fail(what+' is not available yet.',reason||'Check that the files are in the correct private R2 folder.');return;}
    const detail=reason?' '+reason:'';
    fail('The '+what.toLowerCase()+' could not load.',
      'The protected media service returned HTTP '+status+'.'+detail+' Please check the R2 files and try again.');
  }
  async function open(){
    try{
      if(['pdf','pptx'].includes(ext)){
        const base='/api/preview/'+encodeURIComponent(key)+'/';
        const response=await fetch(base+'manifest',{credentials:'same-origin',cache:'no-store'});
        if(!response.ok){serverFailure(response.status,await fetchError(response),'View-only preview');return;}
        const manifest=await response.json();
        const pages=manifest.pages;
        if(!Number.isInteger(pages)||pages<1||pages>500){fail('Invalid preview index.','The preview page count returned by R2 is incorrect.');return;}
        viewReady();
        $('sample-controls').hidden=pages<2;
        let current=1;
        const showPage=n=>{
          current=Math.max(1,Math.min(pages,n));
          const image=new Image();
          image.src=base+current;
          image.alt=label+', page '+current+' of '+pages;
          image.loading='eager'; image.draggable=false;
          image.addEventListener('error',async()=>{
            try{const res=await fetch(image.src,{credentials:'same-origin',cache:'no-store'});
              serverFailure(res.status,await fetchError(res),'Preview page '+current);
            }catch{fail('Unable to display preview page.','The preview image could not be reached.');}
          });
          $('sample-media').replaceChildren(image);
          $('sample-page-counter').textContent='PAGE '+current+' / '+pages;
          $('sample-page-input').value=String(current);
          $('sample-page-input').max=String(pages);
          $('sample-prev').disabled=current===1;
          $('sample-next').disabled=current===pages;
        };
        $('sample-prev').addEventListener('click',()=>showPage(current-1));
        $('sample-next').addEventListener('click',()=>showPage(current+1));
        $('sample-page-input').addEventListener('change',()=>showPage(Number($('sample-page-input').value)||1));
        document.addEventListener('keydown',e=>{
          if(e.target?.matches?.('input, textarea, button'))return;
          if(e.key==='ArrowLeft'&&current>1)showPage(current-1);
          if(e.key==='ArrowRight'&&current<pages)showPage(current+1);
        });
        $('sample-media').addEventListener('contextmenu',e=>e.preventDefault());
        showPage(1);
        return;
      }
      if(ext==='mp4'){
        const url='/api/asset/'+encodeURIComponent(key)+'?play=1';
        // Browser media requests sometimes reject the HEAD preflight even when
        // a normal byte-range GET is playable. Mount the player immediately.
        viewReady();
        $('sample-page-counter').textContent='VIDEO';
        const video=document.createElement('video');
        video.controls=true;video.playsInline=true;video.preload='metadata';
        video.controlsList?.add('nodownload');video.controlsList?.add('noremoteplayback');
        video.disablePictureInPicture=true;
        video.src=url;video.setAttribute('aria-label',label);
        video.addEventListener('error',async()=>{
          try{
            const probe=await fetch(url,{method:'GET',headers:{Range:'bytes=0-0'},credentials:'same-origin',cache:'no-store'});
            if(!probe.ok){serverFailure(probe.status,await fetchError(probe),'Video');return;}
            fail('This video format could not play.','The protected video exists, but the browser could not decode or stream it. Try another browser.');
          }catch{fail('Video streaming failed.','The browser could not reach the protected video service.');}
        });
        $('sample-media').replaceChildren(video);
        video.load();
        return;
      }
      fail('View-only preview unavailable.','This sample type cannot be previewed in the browser.');
    }catch(err){
      fail('Unable to load the preview.','The preview request did not complete. Please refresh; if it persists, check Worker logs.');
    }
  }
  open();
})();
