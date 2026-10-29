(() => {
  'use strict';
  let cleanup = [];
  let printState = null;
  const unmount = () => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    printState = null;
  };
  const mount = () => {
    unmount();
    const root = document.querySelector('.career-page');
    if (!root) return;
    // As the visitor reads the career timeline, keep the active role visible in
    // the sticky, horizontally scrolling role index. The active state is derived
    // from scroll position; it never changes the URL or opens résumé details.
    const roleNav = root.querySelector('.career-index');
    const roleTrack = roleNav?.querySelector('.career-wrap');
    const roleLinks = [...(roleNav?.querySelectorAll('a[href^="#career-"]') || [])];
    const roles = [...root.querySelectorAll('article.career-role[id]')];
    const navLinks = new Map(roleLinks.map(link => [link.hash.slice(1), link]));
    let activeRoleId = null;
    let spyFrame = null;
    const setActiveRole = id => {
      if (activeRoleId === id) return;
      activeRoleId = id;
      for (const link of roleLinks) {
        const active = link.hash.slice(1) === id;
        link.classList.toggle('is-active-role',active);
        if (active) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      }
      // Scroll only the horizontal navigation strip, never the page itself.
      const active = navLinks.get(id);
      if (!active || !roleTrack) return;
      const rect = active.getBoundingClientRect();
      const trackRect = roleTrack.getBoundingClientRect();
      const pad = 42;
      if (rect.left < trackRect.left + pad || rect.right > trackRect.right - pad) {
        roleTrack.scrollTo({left:Math.max(0,roleTrack.scrollLeft + rect.left - trackRect.left - (trackRect.width - rect.width)/2),behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
      }
    };
    const updateActiveRole = () => {
      spyFrame = null;
      if (!roles.length || !roleNav || root.closest('[hidden]')) return;
      const navBottom = roleNav.getBoundingClientRect().bottom;
      const probe = navBottom + Math.min(120,innerHeight*0.17);
      let current = null;
      for (const role of roles) {
        if (role.getBoundingClientRect().top <= probe) current = role.id;
        else break;
      }
      setActiveRole(current);
    };
    const scheduleRoleSpy = () => {
      if (spyFrame === null) spyFrame = requestAnimationFrame(updateActiveRole);
    };
    window.addEventListener('scroll',scheduleRoleSpy,{passive:true});
    window.addEventListener('resize',scheduleRoleSpy,{passive:true});
    window.addEventListener('hashchange',scheduleRoleSpy);
    cleanup.push(() => window.removeEventListener('scroll',scheduleRoleSpy),
                 () => window.removeEventListener('resize',scheduleRoleSpy),
                 () => window.removeEventListener('hashchange',scheduleRoleSpy),
                 () => { if(spyFrame !== null) cancelAnimationFrame(spyFrame); spyFrame = null; });
    // The timeline is hidden until the visitor chooses the "By role" tab.
    // Observe its visibility change so the highlight is correct immediately.
    const rolePanel = root.closest('.experience-panel');
    if (rolePanel) {
      const observer = new MutationObserver(scheduleRoleSpy);
      observer.observe(rolePanel,{attributes:true,attributeFilter:['hidden']});
      cleanup.push(() => observer.disconnect());
    }
    for (const link of roleLinks) {
      const click = () => setActiveRole(link.hash.slice(1));
      link.addEventListener('click',click);
      cleanup.push(() => link.removeEventListener('click',click));
    }
    scheduleRoleSpy();
    const details = [...root.querySelectorAll('details')];
    const triggers = [...root.querySelectorAll('[data-career-expand]')];
    const allButton = root.querySelector('[data-career-expand-all]');
    const sync = () => {
      triggers.forEach(button => {
        const detail = document.getElementById(button.dataset.careerExpand);
        button.setAttribute('aria-expanded', String(!!detail?.open));
      });
      const allOpen = details.length > 0 && details.every(detail => detail.open);
      if (allButton) {
        allButton.setAttribute('aria-expanded', String(allOpen));
        allButton.querySelector('[data-career-expand-label]').textContent = allOpen ? 'COLLAPSE ALL RÉSUMÉ DETAILS' : 'EXPAND ALL RÉSUMÉ DETAILS';
      }
    };
    triggers.forEach(button => {
      const click = () => {
        const detail = document.getElementById(button.dataset.careerExpand);
        if (!detail) return;
        detail.open = !detail.open;
        sync();
        if (detail.open) {
          detail.querySelector('summary').focus({preventScroll:true});
          detail.scrollIntoView({block:'nearest', behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
        }
      };
      button.addEventListener('click',click);
      cleanup.push(() => button.removeEventListener('click',click));
    });
    details.forEach(detail => {
      detail.addEventListener('toggle',sync);
      cleanup.push(() => detail.removeEventListener('toggle',sync));
    });
    if (allButton) {
      const click = () => {
        const open = !details.every(detail => detail.open);
        details.forEach(detail => { detail.open = open; });
        sync();
      };
      allButton.addEventListener('click',click);
      cleanup.push(() => allButton.removeEventListener('click',click));
    }
    const beforePrint = () => {
      printState = details.map(detail => detail.open);
      details.forEach(detail => { detail.open = true; });
      sync();
    };
    const afterPrint = () => {
      if (printState) details.forEach((detail,index) => { detail.open = printState[index]; });
      printState = null;
      sync();
    };
    window.addEventListener('beforeprint',beforePrint);
    window.addEventListener('afterprint',afterPrint);
    cleanup.push(() => window.removeEventListener('beforeprint',beforePrint), () => window.removeEventListener('afterprint',afterPrint));
    sync();
  };
  window.PVCareer = {mount,unmount};
})();
