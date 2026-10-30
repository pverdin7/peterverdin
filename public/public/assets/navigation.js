/* PV_PRIMARY_NAV: measure the visible header so sticky controls and anchors stay clear. */
(() => {
  let observer;
  const unmount = () => {if (observer) observer.disconnect();observer=null;};
  const mount = () => {
    unmount();
    const header=document.querySelector('.site-header');
    const viewbar=document.querySelector('.experience-viewbar');
    const sync=()=>{
      if(header)document.documentElement.style.setProperty('--pv-header-height',Math.ceil(header.getBoundingClientRect().height)+'px');
      if(viewbar)document.documentElement.style.setProperty('--pv-workbar-height',Math.ceil(viewbar.getBoundingClientRect().height)+'px');
    };
    sync();
    observer=new ResizeObserver(sync);
    if(header)observer.observe(header);
    if(viewbar)observer.observe(viewbar);
  };
  const previousMount=window.PV.mount;
  window.PV.mount=function(){unmount();previousMount();mount();};
  mount();
})();
