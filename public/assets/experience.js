(() => {
  'use strict';
  let cleanup = [];
  let pendingFrame = null;
  const unmount = () => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
    pendingFrame = null;
  };
  const mount = () => {
    unmount();
    const root = document.querySelector('.experience-page');
    if (!root) return;
    const tabs = [...root.querySelectorAll('[data-experience-tab]')];
    const projects = document.getElementById('experience-projects');
    const roles = document.getElementById('experience-roles');
    if (!projects || !roles || tabs.length !== 2) return;
    const motion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    const cancelPendingScroll = () => {
      if (pendingFrame !== null) cancelAnimationFrame(pendingFrame);
      pendingFrame = null;
    };
    const fragmentValue = () => {
      const raw = location.hash.slice(1);
      try { return decodeURIComponent(raw); } catch { return raw; }
    };
    const persist = fragment => history.replaceState(null,'','#'+fragment);
    const select = (view, focus=false, save=false) => {
      cancelPendingScroll();
      const selected = view === 'roles' ? 'roles' : 'projects';
      root.dataset.experienceView = selected;
      projects.hidden = selected !== 'projects';
      roles.hidden = selected !== 'roles';
      tabs.forEach(tab => {
        const active = tab.dataset.experienceTab === selected;
        tab.setAttribute('aria-selected',String(active));
        tab.tabIndex = active ? 0 : -1;
        if (active && focus) tab.focus();
      });
      if (save) {
        persist(selected === 'roles' ? 'by-role' : 'by-project');
        // A visitor may switch views after reading several roles. Start the newly
        // selected view at its beginning instead of retaining that deep offset.
        const viewbar = root.querySelector('.experience-viewbar');
        if (viewbar && viewbar.getBoundingClientRect().top <= (document.querySelector('.site-header')?.getBoundingClientRect().bottom || 0) + 20) {
          pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null;
            if (document.contains(viewbar)) viewbar.scrollIntoView({block:'start',behavior:motion()});
          });
        }
      }
    };
    const followFragment = (fragment, save=false) => {
      const roleId = fragment.startsWith('role-') ? 'career-'+fragment.slice(5) : fragment;
      const isRole = roleId === 'by-role' || roleId.startsWith('career-');
      select(isRole || (!fragment && document.body.dataset.page === '/resume/') ? 'roles' : 'projects');
      if (save) persist(roleId);
      if (roleId.startsWith('career-')) {
        const target = document.getElementById(roleId);
        if (target && roles.contains(target)) {
          const detail = target.matches('details') ? target : target.querySelector('details.career-details');
          if (detail) detail.open = true;
          cancelPendingScroll();
          pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null;
            if (document.contains(target)) target.scrollIntoView({block:'start',behavior:motion()});
          });
        }
      }
    };
    tabs.forEach((tab,index) => {
      const click = () => select(tab.dataset.experienceTab,false,true);
      const key = event => {
        let next = null;
        if (['ArrowRight','ArrowDown'].includes(event.key)) next = (index+1)%tabs.length;
        if (['ArrowLeft','ArrowUp'].includes(event.key)) next = (index+tabs.length-1)%tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length-1;
        if (next !== null) {
          event.preventDefault();event.stopPropagation();
          select(tabs[next].dataset.experienceTab,true,true);
        }
      };
      tab.addEventListener('click',click);tab.addEventListener('keydown',key);
      cleanup.push(() => tab.removeEventListener('click',click),() => tab.removeEventListener('keydown',key));
    });
    const click = event => {
      const anchor = event.target.closest('a[href]');
      if (!anchor || !root.contains(anchor)) return;
      const href = anchor.getAttribute('href');
      if (href && (href.startsWith('#career-') || href === '#by-role' || href === '#by-project')) {
        event.preventDefault();
        event.stopPropagation();
        followFragment(href.slice(1),true);
      }
    };
    root.addEventListener('click',click);
    cleanup.push(() => root.removeEventListener('click',click));
    const hashchange = () => followFragment(fragmentValue());
    window.addEventListener('hashchange',hashchange);
    cleanup.push(() => window.removeEventListener('hashchange',hashchange));
    followFragment(fragmentValue());
  };
  window.PVExperience = {mount,unmount};
})();
