(() => {
  'use strict';
  let cleanup = [];
  let frameId = null;
  const unmount = () => {
    cleanup.forEach(fn => fn());
    cleanup = [];
    if (frameId !== null) window.cancelAnimationFrame(frameId);
    frameId = null;
  };
  const mount = () => {
    unmount();
    const root = document.querySelector('.story-root');
    if (!root) return;
    root.classList.add('has-story-js');
    const chapters = [...root.querySelectorAll('[data-story-chapter]')];
    const nav = [...root.querySelectorAll('[data-story-nav]')];
    const frames = [...root.querySelectorAll('[data-story-frame]')];
    const segments = [...root.querySelectorAll('[data-story-segment]')];
    const progress = root.querySelector('.story-nav-inner');
    const count = root.querySelector('[data-story-stage-count]');
    let active = '';
    const update = () => {
      frameId = null;
      if (!document.contains(root)) return;
      const focusLine = Math.max(210, window.innerHeight * .42);
      let selected = null;
      chapters.forEach(chapter => { if (chapter.getBoundingClientRect().top <= focusLine) selected = chapter; });
      const name = selected ? selected.dataset.storyChapter : '';
      const last = chapters[chapters.length - 1];
      const first = chapters[0];
      if (first && last) {
        const firstTop = first.getBoundingClientRect().top;
        const lastBottom = last.getBoundingClientRect().bottom;
        const total = lastBottom - firstTop;
        const pct = Math.max(0, Math.min(100, ((focusLine - firstTop) / total) * 100));
        progress.style.setProperty('--story-progress', `${pct.toFixed(2)}%`);
      }
      if (name === active) return;
      active = name;
      nav.forEach(link => {
        const current = link.dataset.storyNav === name;
        link.classList.toggle('is-current', current);
        if (current) link.setAttribute('aria-current', 'location');
        else link.removeAttribute('aria-current');
      });
      const stageName = name === 'evidence' ? 'brand' : (name || 'strategy');
      frames.forEach(frame => frame.classList.toggle('is-current', frame.dataset.storyFrame === stageName));
      segments.forEach(segment => segment.classList.toggle('is-current', segment.dataset.storySegment === stageName));
      const number = ['strategy', 'curriculum', 'brand'].indexOf(stageName) + 1;
      if (count && number > 0) count.textContent = `0${number} / 03`;
    };
    const scheduleUpdate = () => { if (frameId === null) frameId = window.requestAnimationFrame(update); };
    window.addEventListener('scroll', scheduleUpdate, { passive: true });
    window.addEventListener('resize', scheduleUpdate, { passive: true });
    cleanup.push(() => window.removeEventListener('scroll', scheduleUpdate), () => window.removeEventListener('resize', scheduleUpdate));
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(scheduleUpdate, { rootMargin: '-25% 0px -45% 0px', threshold: [0, .2, .6] });
      chapters.forEach(chapter => observer.observe(chapter));
      cleanup.push(() => observer.disconnect());
    }
    const tabs = [...root.querySelectorAll('[data-story-tab]')];
    const panels = [...root.querySelectorAll('[data-story-panel]')];
    const selectTab = (name, focus) => {
      tabs.forEach(tab => {
        const selected = tab.dataset.storyTab === name;
        tab.setAttribute('aria-selected', String(selected));
        tab.tabIndex = selected ? 0 : -1;
        if (selected && focus) tab.focus();
      });
      panels.forEach(panel => { panel.hidden = panel.dataset.storyPanel !== name; });
    };
    tabs.forEach((tab, index) => {
      const click = () => selectTab(tab.dataset.storyTab, false);
      const key = event => {
        let next = null;
        if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (index + 1) % tabs.length;
        if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') next = 0;
        if (event.key === 'End') next = tabs.length - 1;
        if (next !== null) { event.preventDefault(); event.stopPropagation(); selectTab(tabs[next].dataset.storyTab, true); }
      };
      tab.addEventListener('click', click);
      tab.addEventListener('keydown', key);
      cleanup.push(() => tab.removeEventListener('click', click), () => tab.removeEventListener('keydown', key));
    });
    if (tabs.length) selectTab(tabs[0].dataset.storyTab, false);
    const details = [...root.querySelectorAll('details')];
    details.forEach(detail => {
      detail.addEventListener('toggle', scheduleUpdate);
      cleanup.push(() => detail.removeEventListener('toggle', scheduleUpdate));
    });
    update();
  };
  window.PVStory = { mount, unmount };
})();
