// A safe, permanent tab for protected portfolio files. Errors are shown, never hidden by closing the tab.
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const params=new URLSearchParams(location.search);
  const key=params.get('file')||'';
  const label=(params.get('label')||key||'Work sample').slice(0,160);
  const context=(params.get('case')||'').slice(0,160);
  const downloadOnly=params.get('download')==='1';
  $('sample-title').textContent=label;
  document.title=label+' | Peter Verdin';
  if(context){$('sample-case').hidden=false;$('sample-case').textContent=context;}
  const address='goldinthecracksofficial@gmail.com';
  $('sample-email').href='mailto:'+address+'?subject='+encodeURIComponent('Portfolio sample request: '+label);
  function fail(title,message,unauthorized=false){
    $('sample-status').hidden=true;
    $('sample-error').hidden=false;
    $('sample-error-heading').textContent=title;
    $('sample-error-text').textContent=message;
    if(unauthorized){$('sample-error-action').textContent='Sign in to the portfolio ↗';$('sample-email').hidden=true;}
  }
  const valid=/^[a-z0-9][a-z0-9._-]{0,150}$/.test(key)&&!key.includes('..');
  if(!valid){fail('This file link is invalid.','Return to the case study and select the original work sample again.');return;}
  const url='/api/asset/'+encodeURIComponent(key);
  const ext=key.split('.').pop().toLowerCase();
  async function open(){
    try {
      const response=await fetch(url,{method:'HEAD',credentials:'same-origin',cache:'no-store',redirect:'follow'});
      if(response.status===401){fail('Portfolio access has expired.','Sign in again with your access code, then open the file from the case study.',true);return;}
      if(response.status===404){fail('This work sample is not available yet.','The case study is available, but the original file has not been uploaded or is not currently available. You can request a copy.');return;}
      if(!response.ok){fail('This file could not be opened.','The private file service returned an error. Please try again, or request the file directly.');return;}
      // The secure Worker serves declared PDF/images and MP4 as inline media only when explicitly requested.
      // PowerPoint and other original formats download on an explicit click; no empty auto-closing window.
      if(!downloadOnly&&['pdf','png','jpg','webp','mp4'].includes(ext)){
        location.replace(url+(['mp4'].includes(ext)?'?play=1':'?view=1'));
        return;
      }
      $('sample-status').hidden=true;
      $('sample-actions').hidden=false;
      $('sample-download').href=url;
      $('sample-download').textContent='Download '+(ext==='pptx'?'PowerPoint':ext.toUpperCase())+' file ↓';
      const msg=document.createElement('p');
      msg.className='sample-download-note';
      msg.textContent=ext==='pptx'?'PowerPoint files download to your device. Open the file in PowerPoint or a compatible presentation app.':'The original file is ready. Select Download to save a copy.';
      $('sample-actions').before(msg);
    } catch {
      fail('Unable to connect to the work sample.','Check your connection and try opening the sample again from the case study.');
    }
  }
  open();
})();
