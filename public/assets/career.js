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
