// RASCI Core
import { renderMatrix, addNewRole, editRole, showDeleteConfirmModal, getBpmnTasks, forceReloadMatrix } from './matrix-manager.js';
import { applyStyles } from './styles.js';
import { initRasciMapping, executeSimpleRasciMapping, rasciAutoMapping } from '../mapping/index.js';
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';

export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');

  // Hacer forceReloadMatrix disponible globalmente
  window.forceReloadMatrix = forceReloadMatrix;

  // Configurar contenedor - USAR FLEX para ajuste automático
  container.style.overflowX = 'visible';
  container.style.overflowY = 'visible';
  container.style.maxWidth = '100%';
  container.style.flex = '1';
  container.style.paddingBottom = '12px';
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100%';
  container.style.border = '1px solid #e5e7eb';
  container.style.borderRadius = '8px';
  container.style.background = '#fff';

  // Inicializar roles - localStorage eliminado del panel RASCI
  let roles = [];
  
  // Inicializar la matriz global si no existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }

  // Función para guardar el estado - localStorage eliminado del panel RASCI
  function saveRasciState() {
    try {
      // Solo mostrar indicador cada 500ms para evitar spam con guardados tan frecuentes
      const now = Date.now();
      if (!saveRasciState.lastIndicatorTime || now - saveRasciState.lastIndicatorTime > 500) {
        showSaveIndicator();
        saveRasciState.lastIndicatorTime = now;
      }
      
    } catch (e) {
      console.warn('Error guardando estado RASCI:', e);
    }
  }

  // Función para mostrar indicador de guardado
  function showSaveIndicator() {
    // Crear o actualizar indicador de guardado
    let saveIndicator = document.getElementById('rasci-save-indicator');
    if (!saveIndicator) {
      saveIndicator = document.createElement('div');
      saveIndicator.id = 'rasci-save-indicator';
      saveIndicator.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        ">
          <i class="fas fa-save" style="font-size: 10px;"></i>
          <span>Guardado automático</span>
        </div>
      `;
      document.body.appendChild(saveIndicator);
    }

    // Mostrar indicador
    saveIndicator.style.opacity = '1';
    saveIndicator.style.transform = 'translateY(0)';

    // Ocultar después de 2 segundos
    setTimeout(() => {
      saveIndicator.style.opacity = '0';
      saveIndicator.style.transform = 'translateY(-10px)';
    }, 2000);
  }

  // Variables para el sistema de guardado automático
  let saveTimeout = null;
  let lastSaveTime = 0;

  // Función para cargar el estado desde localStorage
  function loadRasciState() {
    try {
      // localStorage eliminado del panel RASCI - inicializar vacío
      if (!window.rasciRoles) {
        window.rasciRoles = [];
      }
      
      if (!window.rasciMatrixData) {
        window.rasciMatrixData = {};
      }
    } catch (e) {
      console.warn('Error cargando estado RASCI:', e);
    }
  }

  // Función para guardado automático con debounce
  // ⚠️ IMPORTANTE: Esta función SOLO guarda el estado, NO ejecuta mapeo
  // El mapeo SOLO se ejecuta manualmente con el botón "Ejecutar Mapeo Manual"
  function autoSaveRasciState() {
    // Guardar inmediatamente sin debounce para cambios rápidos
    saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
    lastSaveTime = Date.now();
  }

  // Aplicar estilos
  applyStyles();

  // Cargar estado inicial
  loadRasciState();

  // Configurar visibilidad de pestañas
  function ensureActiveTabVisibility() {
    const tabs = panel.querySelectorAll('.tab');
    const tabContents = panel.querySelectorAll('.tab-content');
    
    // Ocultar todos los contenidos primero
    tabContents.forEach(content => {
      content.style.display = 'none';
      content.style.visibility = 'hidden';
      content.style.position = 'absolute';
      content.style.top = '-9999px';
    });

    // Mostrar solo la pestaña activa
    const activeTab = panel.querySelector('.tab.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      const activeContent = panel.querySelector(`#${tabName}-tab`);
      if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.style.visibility = 'visible';
        activeContent.style.position = 'relative';
        activeContent.style.top = 'auto';
      }
    }
  }

  // Configurar observer para cambios de visibilidad (DESHABILITADO PARA EVITAR BUCLE)
  function setupVisibilityObserver() {
    // Observer deshabilitado temporalmente para evitar bucle infinito
    console.log('🔕 Observer de visibilidad deshabilitado para evitar bucle');
    
    // Solo configurar una carga inicial única
    let hasLoaded = false;
    
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.id === 'rasci-panel' && target.style.display !== 'none' && !hasLoaded) {
            hasLoaded = true; // Evitar múltiples cargas
            console.log('📖 Panel RASCI visible por primera vez - cargando estado...');
            
            // localStorage eliminado del panel RASCI - inicializar vacío
            setTimeout(() => {
              try {
                if (!window.rasciRoles) {
                  window.rasciRoles = [];
                }
                
                if (!window.rasciMatrixData) {
                  window.rasciMatrixData = {};
                }
                console.log('✅ Estado RASCI inicializado (sin localStorage)');
              } catch (e) {
                console.warn('Error inicializando estado RASCI:', e);
              }
              
              // Solo renderizar la matriz una vez
              const rasciPanel = document.querySelector('#rasci-panel');
              if (rasciPanel) {
                renderMatrix(rasciPanel, window.rasciRoles || [], autoSaveRasciState);
                console.log('✅ Matriz renderizada (carga única)');
              }
            }, 100);
          }
        }
      });
    });

    observer.observe(panel, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // Configurar listeners de pestañas
  setTimeout(() => {
    const tabs = panel.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const tabName = this.getAttribute('data-tab');
        if (tabName) {
          tabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          window.cambiarPestana(tabName);
        }
      });
    });
  }, 100);

  // Inicializar componentes
  ensureActiveTabVisibility();
  setupVisibilityObserver();

  // Renderizar matriz inicial con roles cargados
      // Renderizar matriz inicial
  renderMatrix(panel, window.rasciRoles || roles, autoSaveRasciState);

  // Sincronizar nombres de roles desde RASCI hacia canvas al cargar
  setTimeout(() => {
    if (typeof window.syncOnLoad === 'function') {
      window.syncOnLoad();
    }
    

  }, 1000); // Esperar 1 segundo para asegurar que todo esté cargado

  // Inicializar mapeo
  initRasciMapping(panel);
  
  // Verificar que la función de mapeo esté disponible
  setTimeout(() => {
    
    
    if (typeof window.executeRasciToRalphMapping === 'function') {
    } else {

      
      // Intentar definir la función manualmente si no está disponible
      if (typeof executeSimpleRasciMapping === 'function') {
        window.executeRasciToRalphMapping = function() {
    
          
          if (!window.bpmnModeler) {
            return;
          }

          if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
            return;
          }

          // Validar antes de ejecutar el mapeo
          if (window.rasciUIValidator) {
            const validation = window.rasciUIValidator.getValidationState();
            if (validation && validation.hasCriticalErrors) {
              alert('❌ No se puede ejecutar el mapeo. Hay errores críticos en la matriz RASCI que deben corregirse primero.');
              return;
            }
          }

          try {
      
            const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
          } catch (error) {
          }
        };
      } else {
      }
    }
  }, 1000);

  // Configurar listeners de eventos
  setupEventListeners();

  function setupEventListeners() {
    // Listener para agregar nuevo rol
    const addRoleBtn = panel.querySelector('#add-role-btn');
    if (addRoleBtn) {
      addRoleBtn.addEventListener('click', () => addNewRole(panel, roles, autoSaveRasciState));
    }

    // Listener para editar roles
    panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-role-btn')) {
        const roleIndex = parseInt(e.target.getAttribute('data-role-index'));
        editRole(roleIndex, panel, roles, autoSaveRasciState);
      }
    });

    // Listener para eliminar roles
    panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-role-btn')) {
        const roleIndex = parseInt(e.target.getAttribute('data-role-index'));
        showDeleteConfirmModal(roleIndex, panel, roles, autoSaveRasciState);
      }
    });
  }

  // Configurar función global para cambiar pestañas (SIN RECARGA AUTOMÁTICA)
  window.cambiarPestana = function(tabName) {
    console.log('🔀 Cambiando a pestaña:', tabName);
    
    // Remover clase active de todas las pestañas
    const allTabs = panel.querySelectorAll('.panel-tabs .tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
    });

    // Ocultar todos los contenidos
    const allTabContents = panel.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
      content.classList.remove('active');
    });

    // Activar la pestaña seleccionada
    const selectedTab = panel.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedContent = panel.querySelector(`#${tabName}-tab`);

    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
      console.log('✅ Pestaña cambiada sin recargas automáticas');
      
      // NO RECARGAR AUTOMÁTICAMENTE - El usuario debe usar el botón manual si lo necesita
    }
  };

  // Global functions
  window.reloadRasciMatrix = () => {
    // Mostrar indicador de recarga
    showReloadIndicator();
    
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    }
    
    // Initialize auto-mapping after matrix reload
    setTimeout(() => {
      if (typeof window.initializeAutoMapping === 'function') {
        window.initializeAutoMapping();
      }
      
      // Forzar validación inmediatamente
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
      
      // Ocultar indicador después de completar
      hideReloadIndicator();
    }, 50);
  };

  // Función para forzar recarga inmediata
  window.forceImmediateReload = () => {
    showReloadIndicator();
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    } else {
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, roles, autoSaveRasciState);
      }
    }
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
      hideReloadIndicator();
    }, 30);
  };

  // Función para debug de eventos BPMN
  window.debugBpmnEvents = () => {
    if (window.bpmnModeler && window.bpmnModeler.get) {
      const eventBus = window.bpmnModeler.get('eventBus');
      if (eventBus) {
      }
    }
  };

  // Función de test temporal
  window.testRasciMapping = () => {
    
    if (typeof window.executeRasciToRalphMapping === 'function') {
      window.executeRasciToRalphMapping();
    } else {
    }
  };

  window.forceReloadRasciMatrix = function() {
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel && typeof window.reloadRasciMatrix === 'function') {
      window.reloadRasciMatrix();
    }
  };

  // Funciones globales para controlar la recarga automática
  window.startRasciAutoReload = startAutoReload;
  window.stopRasciAutoReload = stopAutoReload;
  window.toggleRasciAutoReload = function() {
    if (autoReloadInterval) {
      stopAutoReload();
      return false;
    } else {
      startAutoReload();
      return true;
    }
  };

  // Sistema de recarga automática
  let autoReloadInterval = null;
  let lastMatrixData = null;

  function startAutoReload() {
    // Detener intervalo anterior si existe
    if (autoReloadInterval) {
      clearInterval(autoReloadInterval);
    }

    // Recargar cada 1 segundo (ultra frecuente)
    autoReloadInterval = setInterval(() => {
      const currentMatrixData = JSON.stringify(window.rasciMatrixData || {});
      
      // Solo recargar si los datos han cambiado
      if (currentMatrixData !== lastMatrixData) {
        lastMatrixData = currentMatrixData;
        
        // Mostrar indicador de recarga
        showReloadIndicator();
        
        if (typeof window.updateMatrixFromDiagram === 'function') {
          window.updateMatrixFromDiagram();
        }
        
        // Forzar validación después de la recarga
        setTimeout(() => {
          if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
            window.rasciUIValidator.forceValidation();
          }
          
          // Ocultar indicador después de completar
          hideReloadIndicator();
        }, 50);
      }
    }, 1000); // 1 segundo

  }

  function showReloadIndicator() {
    const indicator = document.getElementById('auto-reload-indicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  function hideReloadIndicator() {
    const indicator = document.getElementById('auto-reload-indicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  function stopAutoReload() {
    if (autoReloadInterval) {
      clearInterval(autoReloadInterval);
      autoReloadInterval = null;
    }
  }

  // Iniciar recarga automática (desactivada, usar botón manual)
  // startAutoReload();

  // Auto-reload on page load (mantener para compatibilidad)
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('rasciNeedsReload', 'true');
    });

    if (sessionStorage.getItem('rasciNeedsReload') === 'true') {
      sessionStorage.removeItem('rasciNeedsReload');
      setTimeout(() => {
        if (typeof window.forceReloadRasciMatrix === 'function') {
          window.forceReloadRasciMatrix();
        }
      }, 1000);
    }
  }

  // Inicializar validador de matriz RASCI
  rasciUIValidator.init(panel);

  // Sistema de detección de cambios en BPMN (DESHABILITADO PARA EVITAR BUCLE)
  function setupBpmnChangeDetection() {
    console.log('🔕 Detección automática de cambios BPMN deshabilitada para evitar bucle');
    
    // Sistema deshabilitado temporalmente
    // El usuario debe usar el botón "Recargar Matriz" manualmente
    
    /*
    if (window.bpmnModeler && window.bpmnModeler.get) {
      const eventBus = window.bpmnModeler.get('eventBus');
      if (eventBus) {
        console.log('EventBus disponible pero listeners deshabilitados');
      } else {
        console.log('EventBus no disponible');
      }
    } else {
      console.log('BPMN Modeler no disponible');
    }
    */
  }

  // Configurar detección de cambios
  setupBpmnChangeDetection();

  // Función para verificar si el panel RASCI está visible y forzar recarga
  function checkAndForceReload() {
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel && rasciPanel.style.display !== 'none') {
      showReloadIndicator();
      
      // DETECTAR ROLES RALPH DEL CANVAS

      
      // Forzar detección de nuevas tareas primero
      if (typeof window.forceDetectNewTasks === 'function') {
        window.forceDetectNewTasks();
      }
      
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      } else {
        // Recarga manual si la función no está disponible
        renderMatrix(rasciPanel, roles, autoSaveRasciState);
      }
      
      setTimeout(() => {
        if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
          window.rasciUIValidator.forceValidation();
        }
        
        // Validación específica para tareas vacías
        if (window.rasciUIValidator && typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
          window.rasciUIValidator.validateEmptyTasks();
        }
        
        hideReloadIndicator();
      }, 50);
    }
  }

  // Verificar y recargar cada 500ms si el panel está visible (desactivado para evitar recargas constantes)
  // setInterval(checkAndForceReload, 500);

  // Funciones globales para debugging y control manual
  window.forceRasciReload = function() {
    checkAndForceReload();
  };

  window.debugRasciState = function() {
  };

  window.forceDetectAndValidate = function() {
    if (typeof window.forceDetectNewTasks === 'function') {
      window.forceDetectNewTasks();
    }
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
    }, 100);
  };

  // Función global para prevenir sobrescritura de valores (SIN RECURSIÓN)
  window.preventOverwriteExistingValues = function() {
    if (window.rasciMatrixData) {
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        Object.keys(window.rasciMatrixData[taskName]).forEach(roleName => {
          const currentValue = window.rasciMatrixData[taskName][roleName];
          
          // Si el valor es un string vacío y no debería serlo, restaurarlo
          if (currentValue === '' && currentValue !== undefined) {
            // No establecer valor vacío, dejar que el usuario lo asigne
            window.rasciMatrixData[taskName][roleName] = undefined;
          }
        });
      });
    }
  };
  

  

  
    // Función para forzar guardado inmediato
  window.forceSaveRasciState = function() {
    saveRasciState();
  };
  
  // Función para verificar estado de guardado automático
  window.checkAutoSaveStatus = function() {
    console.log('Estado del guardado automático:');
    console.log('Último guardado:', new Date(lastSaveTime).toLocaleTimeString());
    console.log('Tiempo desde último guardado:', Date.now() - lastSaveTime, 'ms');
    console.log('Guardado automático activo: INMEDIATO (sin debounce)');
    console.log('Indicador visual: cada 500ms');
  };
  
  // Función para verificar estado actual de roles
  window.checkRolesState = function() {
    console.log('Estado actual de roles:');
    console.log('window.rasciRoles:', window.rasciRoles);
    console.log('roles:', roles);
  };
  
  // Función para limpiar y reinicializar roles RASCI
  window.resetRasciRoles = function() {
    window.rasciRoles = [];
    roles = [];
  };
  
  // Función para forzar detección y guardado inmediato
  window.forceDetectAndSaveRoles = function() {
    if (typeof window.detectRalphRolesFromCanvas === 'function') {
      const detectedRoles = window.detectRalphRolesFromCanvas();
      if (detectedRoles.length > 0) {
        // Establecer roles inmediatamente
        window.rasciRoles = [...detectedRoles];
        roles = [...detectedRoles];
        
        // Guardar inmediatamente en localStorage
        try {
        } catch (e) {
          console.warn('Error guardando roles en localStorage:', e);
        }
        
        // Actualizar matriz de datos
        if (window.rasciMatrixData) {
          Object.keys(window.rasciMatrixData).forEach(taskName => {
            detectedRoles.forEach(roleName => {
              if (!(roleName in window.rasciMatrixData[taskName])) {
                window.rasciMatrixData[taskName][roleName] = undefined;
                console.log(`➕ Rol ${roleName} agregado a tarea ${taskName}`);
              }
            });
          });
        }
        
        // Re-renderizar matriz inmediatamente
        const rasciPanel = document.querySelector('#rasci-panel');
        if (rasciPanel) {
          renderMatrix(rasciPanel, window.rasciRoles, autoSaveRasciState);
          console.log('✅ Matriz re-renderizada con roles detectados');
        }
      } else {
        console.log('ℹ️ No se detectaron roles RALPH en el canvas');
      }
    } else {
      console.warn('⚠️ Función detectRalphRolesFromCanvas no disponible');
    }
  };
  
  // Función global para forzar detección y guardado de roles RALPH
  window.forceDetectRalphRoles = function() {
    console.log('🔄 Forzando detección de roles RALPH (manual)...');
    if (typeof window.detectRalphRolesFromCanvas === 'function') {
      const detectedRoles = window.detectRalphRolesFromCanvas();
      if (detectedRoles.length > 0) {
        console.log(`✅ ${detectedRoles.length} roles RALPH detectados:`, detectedRoles);
        
        // ESTABLECER TODOS LOS ROLES DETECTADOS (NO SOLO AGREGAR)
        window.rasciRoles = [...detectedRoles];
        roles = [...detectedRoles];
        
        console.log('🔍 Roles establecidos:', window.rasciRoles);
        
        // Actualizar matriz de datos para incluir todos los roles detectados
        if (window.rasciMatrixData) {
          Object.keys(window.rasciMatrixData).forEach(taskName => {
            detectedRoles.forEach(roleName => {
              if (!(roleName in window.rasciMatrixData[taskName])) {
                // NO ESTABLECER VALOR VACÍO - DEJAR QUE EL USUARIO LO ASIGNE
                window.rasciMatrixData[taskName][roleName] = undefined;
                console.log(`➕ Rol ${roleName} agregado a tarea ${taskName} (sin valor asignado)`);
              }
            });
          });
        }
        
        // Guardar en localStorage
        try {
        } catch (e) {
          console.warn('Error guardando roles en localStorage:', e);
        }
        
        // Re-renderizar matriz con roles actualizados
        const rasciPanel = document.querySelector('#rasci-panel');
        if (rasciPanel) {
          renderMatrix(rasciPanel, window.rasciRoles, autoSaveRasciState);
          console.log('✅ Matriz re-renderizada con roles detectados');
        }
      } else {
        console.log('ℹ️ No se detectaron roles RALPH en el canvas');
      }
    } else {
      console.warn('⚠️ Función detectRalphRolesFromCanvas no disponible');
    }
  };

  // Initial matrix update
  setTimeout(() => {
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    }
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {

        
        if (typeof window.updateMatrixFromDiagram === 'function') {
          window.updateMatrixFromDiagram();
        }
      }, 300);
    });
  } else {
    setTimeout(() => {
      
      
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      }
    }, 300);
  }

  // Carga inicial de tareas (una sola vez)
  setTimeout(() => {
    // localStorage eliminado del panel RASCI - inicializar vacío
    try {
      if (!window.rasciRoles) {
        window.rasciRoles = [];
      }
      
      if (!window.rasciMatrixData) {
        window.rasciMatrixData = {};
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }
    

    
    // Solo actualizar si no hay datos guardados para evitar sobrescribir
    if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      }
    } else {
      // Si hay datos guardados, solo renderizar la matriz sin actualizar
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, window.rasciRoles || [], autoSaveRasciState);
      }
    }
  }, 500);

  window.addEventListener('load', () => {
    setTimeout(() => {
      // localStorage eliminado del panel RASCI - inicializar vacío
      try {
        if (!window.rasciRoles) {
          window.rasciRoles = [];
          roles = window.rasciRoles; // Actualizar también la variable local
        }
        
        if (!window.rasciMatrixData) {
          window.rasciMatrixData = {};
        }
      } catch (e) {
        console.warn('Error inicializando estado RASCI:', e);
      }
      

      
      // Solo actualizar si no hay datos guardados para evitar sobrescribir
      if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
        if (typeof window.updateMatrixFromDiagram === 'function') {
          window.updateMatrixFromDiagram();
        }
      } else {
        // Si hay datos guardados, solo renderizar la matriz sin actualizar
        const rasciPanel = document.querySelector('#rasci-panel');
        if (rasciPanel) {
          renderMatrix(rasciPanel, window.rasciRoles || [], autoSaveRasciState);
        }
      }
    }, 200);
  });
}

// Global function for toggling auto-mapping
// Función modular para togglear auto-mapping
function toggleAutoMapping() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (!switchElement) return false;
  
  const isEnabled = switchElement.checked;
  
  if (rasciAutoMapping) {
    if (isEnabled) {
      rasciAutoMapping.enable();
      if (manualBtn) manualBtn.style.display = 'none';
      
      // Show notification
      
      // Trigger initial mapping if matrix exists
      if (rasciAutoMapping.enabled) {
        setTimeout(() => {
          rasciAutoMapping.triggerMapping();
        }, 100);
      }
    } else {
      rasciAutoMapping.disable();
      if (manualBtn) manualBtn.style.display = 'block';
      
    }
  }
  
  return isEnabled;
}

// Asignar a window para compatibilidad
window.toggleAutoMapping = toggleAutoMapping;

// Función modular para inicializar auto-mapping
function initializeAutoMapping() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (switchElement) {
    // Set default state (enabled by default)
    switchElement.checked = true;
    
    // Initialize auto-mapping
    if (rasciAutoMapping) {
      rasciAutoMapping.enable();
      if (manualBtn) manualBtn.style.display = 'none';
    }
    
  }
}

// Asignar a window para compatibilidad
window.initializeAutoMapping = initializeAutoMapping;

// Funciones globales de debug para RASCI
window.forceRasciReload = function() {
  // localStorage eliminado del panel RASCI - inicializar vacío
  try {
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
    
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
    }
  } catch (e) {
    console.warn('Error inicializando estado RASCI:', e);
  }
  
  if (typeof window.updateMatrixFromDiagram === 'function') {
    window.updateMatrixFromDiagram();
  }
  if (typeof window.forceDetectNewTasks === 'function') {
    window.forceDetectNewTasks();
  }
  setTimeout(() => {
    if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
      window.rasciUIValidator.forceValidation();
    }
  }, 100);
};

// Función global para recargar estado RASCI - localStorage eliminado
window.reloadRasciState = function() {
  
  // localStorage eliminado del panel RASCI - inicializar vacío
  try {
    if (!window.rasciRoles) {
      window.rasciRoles = [];
      console.log('✅ Roles inicializados:', window.rasciRoles);
    }
    
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
      console.log('✅ Matriz inicializada:', Object.keys(window.rasciMatrixData).length, 'tareas');
    }
  } catch (e) {
    console.warn('Error inicializando estado RASCI:', e);
  }
  
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    // Renderizar matriz RASCI
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado');
  }
};



// Función global para forzar recarga del estado RASCI
window.forceReloadRasciState = function() {
  // localStorage eliminado del panel RASCI - inicializar vacío
  try {
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
    
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
    }
  } catch (e) {
    console.warn('Error inicializando estado RASCI:', e);
  }
  
  // Forzar re-renderizado de la matriz
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado');
  }
};

// Función más robusta para forzar recarga después de importación o carga
window.ensureRasciMatrixLoaded = function() {
  console.log('🔄 Asegurando que la matriz RASCI esté cargada...');
  
  // Múltiples intentos de recarga con intervalos
  let attempts = 0;
  const maxAttempts = 5;
  
  const tryReload = () => {
    attempts++;
    console.log(`🔄 Intento ${attempts} de recarga RASCI...`);
    
    // Primero, verificar si detectRalphRolesFromCanvas está disponible
    if (typeof window.detectRalphRolesFromCanvas === 'function') {
      console.log('✅ Función detectRalphRolesFromCanvas disponible, detectando roles...');
      try {
        const detectedRoles = window.detectRalphRolesFromCanvas();
        if (detectedRoles && detectedRoles.length > 0) {
          console.log(`✅ ${detectedRoles.length} roles RALph detectados:`, detectedRoles);
          
          // Asegurar que los roles detectados estén en window.rasciRoles
          if (!window.rasciRoles || window.rasciRoles.length === 0) {
            window.rasciRoles = [...detectedRoles];
            console.log('✅ Roles RALph agregados a window.rasciRoles');
          } else {
            // Agregar roles nuevos que no estén ya
            let added = false;
            detectedRoles.forEach(role => {
              if (!window.rasciRoles.includes(role)) {
                window.rasciRoles.push(role);
                added = true;
              }
            });
            if (added) {
              console.log('✅ Nuevos roles RALph agregados');
            }
          }
        } else {
          console.log('ℹ️ No se detectaron roles RALph en el canvas');
        }
      } catch (e) {
        console.warn('⚠️ Error detectando roles RALph:', e);
      }
    } else {
      console.warn('⚠️ Función detectRalphRolesFromCanvas no disponible aún');
    }
    
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      // Panel existe, forzar renderizado con roles actuales
      try {
        const currentRoles = window.rasciRoles || [];
        renderMatrix(rasciPanel, currentRoles, null);
        console.log('✅ Matriz RASCI recargada exitosamente con', currentRoles.length, 'roles');
        
        // Forzar detección adicional si tenemos pocos roles
        if (currentRoles.length === 0 && typeof window.forceDetectAndSaveRoles === 'function') {
          setTimeout(() => {
            window.forceDetectAndSaveRoles();
          }, 200);
        }
        
        return true;
      } catch (e) {
        console.warn('⚠️ Error en renderizado, intentando de nuevo...', e);
      }
    }
    
    if (attempts < maxAttempts) {
      setTimeout(tryReload, 500 * attempts); // Delay incremental
    } else {
      console.warn('⚠️ No se pudo recargar la matriz RASCI después de varios intentos');
      
      // Último intento: forzar detección manual
      if (typeof window.forceDetectAndSaveRoles === 'function') {
        console.log('🔄 Último intento: forzando detección manual...');
        window.forceDetectAndSaveRoles();
      }
    }
    return false;
  };
  
  // Iniciar el proceso
  setTimeout(tryReload, 100);
};
