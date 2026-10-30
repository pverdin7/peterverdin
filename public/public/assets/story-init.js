
(() => {
  const baseMount = window.PV.mount;
  window.PV.mount = function () {
    window.PVStory.unmount();
    baseMount();
    if (document.body.dataset.page === '/') window.PVStory.mount();
  };
  if (document.body.dataset.page === '/') window.PVStory.mount();
})();
