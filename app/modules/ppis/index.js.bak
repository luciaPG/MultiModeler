async function loadPPIComponents() {
  try {
    await loadScript('./js/panels/ppi/ppi-core.js');
    await loadScript('./js/panels/ppi/ppi-ui.js');
    await loadScript('./js/panels/ppi/ppi-manager.js');
    
    try {
      if (typeof window.PPIManager !== 'undefined') {
        window.ppiManagerInstance = new window.PPIManager();
        window.ppiManager = window.ppiManagerInstance;
      }
    } catch (error) {
      // Error inicializando PPIManager
    }
    
    if (window.ppiManagerInstance && typeof window.ppiManagerInstance.refreshPPIList === 'function') {
      // ppiManager disponible globalmente
    } else {
      setTimeout(() => {
        if (window.ppiManagerInstance && typeof window.ppiManagerInstance.refreshPPIList === 'function') {
          // ppiManager disponible después de espera
        }
      }, 1000);
    }
  } catch (error) {
    // Error cargando componentes PPI
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => resolve();
    script.onerror = (error) => reject(error);
    document.head.appendChild(script);
  });
}

function createPPIManagerFallback() {
  return {
    showCreatePPIModal: () => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.showCreatePPIModal) {
          window.ppiManagerInstance.showCreatePPIModal();
        }
      }, 500);
    },
    exportPPIsToFile: () => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.exportPPIsToFile) {
          window.ppiManagerInstance.exportPPIsToFile();
        }
      }, 500);
    },
    refreshPPIList: () => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.refreshPPIList) {
          window.ppiManagerInstance.refreshPPIList();
        }
      }, 500);
    },
    forceAnalyzePPIChildren: () => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.forceAnalyzePPIChildren) {
          window.ppiManagerInstance.forceAnalyzePPIChildren();
        }
      }, 500);
    },
    viewPPI: (id) => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.viewPPI) {
          window.ppiManagerInstance.viewPPI(id);
        }
      }, 500);
    },
    editPPI: (id) => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.editPPI) {
          window.ppiManagerInstance.editPPI(id);
        }
      }, 500);
    },
    confirmDeletePPI: (id) => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.confirmDeletePPI) {
          window.ppiManagerInstance.confirmDeletePPI(id);
        }
      }, 500);
    },
    saveEditedPPI: (id) => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.saveEditedPPI) {
          window.ppiManagerInstance.saveEditedPPI(id);
        }
      }, 500);
    },
    createSamplePPIs: () => {
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.createSamplePPIs) {
          window.ppiManagerInstance.createSamplePPIs();
        }
      }, 500);
    }
  };
}

if (!window.ppiManager) {
  window.ppiManager = createPPIManagerFallback();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPPIComponents);
} else {
  loadPPIComponents();
}
