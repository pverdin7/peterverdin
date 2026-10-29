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
  const address='goldinthecracksofficial@gmail.com';
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
    $('sample-stage').classList.add('is-viewing');
  }
  async function open(){
    try{
      if(['pdf','pptx'].includes(ext)){
        const base='/api/preview/'+encodeURIComponent(key)+'/';
        const response=await fetch(base+'manifest',{credentials:'same-origin',cache:'no-store'});
        if(response.status===401){fail('Portfolio access has expired.','Sign in again, then open this sample from the case study.',true);return;}
        if(response.status===404){fail('View-only preview not available yet.','The document is protected, but the preview pages still need to be uploaded to Cloudflare R2. You can request to see this work.');return;}
        if(!response.ok)throw new Error('preview unavailable');
        const manifest=await response.json();
        const pages=manifest.pages;
        if(!Number.isInteger(pages)||pages<1||pages>500)throw new Error('invalid preview');
        viewReady();
        $('sample-controls').hidden=pages<2;
        let current=1;
        const showPage=n=>{
          current=Math.max(1,Math.min(pages,n));
          const image=new Image();
          image.src=base+current;
          image.alt=label+', page '+current+' of '+pages;
          image.loading='eager'; image.draggable=false;
          image.addEventListener('error',()=>fail('This preview page could not be loaded.','Please refresh or request this sample.'));
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
        const response=await fetch(url,{method:'HEAD',credentials:'same-origin',cache:'no-store'});
        if(response.status===401){fail('Portfolio access has expired.','Sign in again, then open this sample from the case study.',true);return;}
        if(response.status===404){fail('This video is not available yet.','The original video has not been uploaded or is not currently available.');return;}
        if(!response.ok)throw new Error('video unavailable');
        viewReady();
        $('sample-page-counter').textContent='VIDEO';
        const video=document.createElement('video');
        video.controls=true;video.playsInline=true;video.preload='metadata';
        video.controlsList?.add('nodownload');video.controlsList?.add('noremoteplayback');
        video.disablePictureInPicture=true;
        video.src=url; video.setAttribute('aria-label',label);
        $('sample-media').replaceChildren(video);
        return;
      }
      fail('View-only preview unavailable.','This sample type cannot be previewed in the browser.');
    }catch{
      fail('Unable to load the preview.','Check your connection and try again, or request this sample.');
    }
  }
  open();
})();
