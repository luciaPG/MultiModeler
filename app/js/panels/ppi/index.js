// === PPI Panel - Main Entry Point ===
// Punto de entrada principal que carga los componentes modulares

// Función para cargar scripts de forma dinámica
async function loadPPIComponents() {
  try {
    // Cargar scripts en orden secuencial para garantizar dependencias
    console.log('🔄 Cargando PPI Core...');
    await loadScript('./js/panels/ppi/ppi-core.js');
    
    console.log('🔄 Cargando PPI UI...');
    await loadScript('./js/panels/ppi/ppi-ui.js');
    
    console.log('🔄 Cargando PPI Manager...');
    await loadScript('./js/panels/ppi/ppi-manager.js');
    
    console.log('✅ PPI Panel - Arquitectura modular cargada');
    
    // Verificar que ppiManager esté disponible globalmente
    if (window.ppiManager && typeof window.ppiManager.refreshPPIList === 'function') {
      console.log('✅ ppiManager disponible globalmente');
    } else {
      console.warn('⚠️ ppiManager no está completamente disponible. Esperando inicialización...');
      // Esperar un poco más para la inicialización
      setTimeout(() => {
        if (window.ppiManager && typeof window.ppiManager.refreshPPIList === 'function') {
          console.log('✅ ppiManager disponible después de espera');
        } else {
          console.error('❌ ppiManager no se pudo inicializar correctamente');
        }
      }, 1000);
    }
  } catch (error) {
    console.error('❌ Error cargando componentes PPI:', error);
  }
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    // Verificar si el script ya está cargado
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }

    const script = document.createElement('script');
    script.src = src;
    script.onload = () => {
      console.log(`✅ Script cargado: ${src}`);
      resolve();
    };
    script.onerror = (error) => {
      console.error(`❌ Error cargando script: ${src}`, error);
      reject(error);
    };
    document.head.appendChild(script);
  });
}

// Funciones de fallback para evitar errores en el HTML
// Estas funciones están disponibles inmediatamente
function createPPIManagerFallback() {
  return {
    showCreatePPIModal: () => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.showCreatePPIModal) {
          window.ppiManagerInstance.showCreatePPIModal();
        }
      }, 500);
    },
    exportPPIsToFile: () => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.exportPPIsToFile) {
          window.ppiManagerInstance.exportPPIsToFile();
        }
      }, 500);
    },
    refreshPPIList: () => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.refreshPPIList) {
          window.ppiManagerInstance.refreshPPIList();
        }
      }, 500);
    },
    forceAnalyzePPIChildren: () => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.forceAnalyzePPIChildren) {
          window.ppiManagerInstance.forceAnalyzePPIChildren();
        }
      }, 500);
    },
    viewPPI: (id) => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.viewPPI) {
          window.ppiManagerInstance.viewPPI(id);
        }
      }, 500);
    },
    editPPI: (id) => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.editPPI) {
          window.ppiManagerInstance.editPPI(id);
        }
      }, 500);
    },
    confirmDeletePPI: (id) => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.confirmDeletePPI) {
          window.ppiManagerInstance.confirmDeletePPI(id);
        }
      }, 500);
    },
    saveEditedPPI: (id) => {
      console.warn('Esperando inicialización de ppiManager...');
      setTimeout(() => {
        if (window.ppiManagerInstance && window.ppiManagerInstance.saveEditedPPI) {
          window.ppiManagerInstance.saveEditedPPI(id);
        }
      }, 500);
    }
  };
}

// Inicializar el fallback inmediatamente
if (!window.ppiManager) {
  window.ppiManager = createPPIManagerFallback();
}

// Cargar componentes cuando el DOM esté listo
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', loadPPIComponents);
} else {
  loadPPIComponents();
}
