(() => {
      const baseMount=window.PV.mount;
      const isExperience=()=>['/my-work/','/resume/'].includes(document.body.dataset.page);
      const mountExperience=()=>{if(isExperience()){window.PVCareer.mount();window.PVExperience.mount();}};
      window.PV.mount=function(){
        window.PVExperience.unmount();window.PVCareer.unmount();baseMount();mountExperience();
      };
      mountExperience();
    })();