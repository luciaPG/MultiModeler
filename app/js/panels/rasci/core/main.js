// RASCI Core - Main panel initialization and state management
import { renderMatrix, addNewRole, editRole, showDeleteConfirmModal, getBpmnTasks } from './matrix-manager.js';
import { applyStyles } from './styles.js';
import { initRasciMapping, executeSimpleRasciMapping } from '../mapping/index.js';
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';



export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');

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

  // Inicializar roles desde localStorage o usar array vacío
  let roles = [];
  if (localStorage.getItem('rasciRoles')) {
    try {
      roles = JSON.parse(localStorage.getItem('rasciRoles'));
    } catch (e) {
      roles = [];
    }
  }

  // Inicializar la matriz global si no existe
  if (!window.rasciMatrixData) {
    // Intentar cargar desde localStorage
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      try {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
      } catch (e) {
        window.rasciMatrixData = {};
      }
    } else {
      window.rasciMatrixData = {};
    }
  }

  // Función para guardar el estado en localStorage con indicador visual
  function saveRasciState() {
    try {
      localStorage.setItem('rasciRoles', JSON.stringify(roles));
      localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
      
      // Mostrar indicador de guardado
      showSaveIndicator();
      
      // console.log('✅ Estado RASCI guardado automáticamente');
    } catch (e) {
      console.warn('❌ No se pudo guardar el estado RASCI:', e);
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
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        roles = JSON.parse(savedRoles);
    
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        window.rasciMatrixData = JSON.parse(savedMatrixData);

      }
    } catch (e) {
      console.warn('❌ No se pudo cargar el estado RASCI:', e);
    }
  }

  // Función para guardado automático con debounce
  // ⚠️ IMPORTANTE: Esta función SOLO guarda el estado, NO ejecuta mapeo
  // El mapeo SOLO se ejecuta manualmente con el botón "Ejecutar Mapeo Manual"
  function autoSaveRasciState() {
    const now = Date.now();
    
    // Evitar guardados muy frecuentes (mínimo 1 segundo entre guardados)
    if (now - lastSaveTime < 1000) {
      // Cancelar timeout anterior y programar uno nuevo
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
        lastSaveTime = Date.now();
      }, 1000);
      return;
    }
    
    // Guardar inmediatamente si ha pasado suficiente tiempo
    saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
    lastSaveTime = now;
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

  // Configurar observer para cambios de visibilidad
  function setupVisibilityObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.id === 'rasci-panel' && target.style.display !== 'none') {
            // Panel se hizo visible, actualizar matriz inmediatamente
            setTimeout(() => {
              showReloadIndicator();
              if (typeof window.updateMatrixFromDiagram === 'function') {
                window.updateMatrixFromDiagram();
              }
              setTimeout(() => {
                if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
                  window.rasciUIValidator.forceValidation();
                }
                hideReloadIndicator();
              }, 50);
            }, 50);
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

  // Renderizar matriz inicial
  renderMatrix(panel, roles, autoSaveRasciState);

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
      // console.log('✅ Función executeRasciToRalphMapping disponible');
    } else {
      console.warn('⚠️ Función executeRasciToRalphMapping no disponible');

      
      // Intentar definir la función manualmente si no está disponible
      if (typeof executeSimpleRasciMapping === 'function') {
        window.executeRasciToRalphMapping = function() {
    
          
          if (!window.bpmnModeler) {
            console.error('❌ BPMN Modeler no disponible');
            console.warn('⚠️ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
            return;
          }

          if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
            console.error('❌ No hay datos en la matriz RASCI');
            console.warn('⚠️ No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
            return;
          }

          // Validar antes de ejecutar el mapeo
          if (window.rasciUIValidator) {
            const validation = window.rasciUIValidator.getValidationState();
            if (validation && validation.hasCriticalErrors) {
              console.error('❌ No se puede ejecutar el mapeo. Hay errores críticos en la matriz RASCI.');
              alert('❌ No se puede ejecutar el mapeo. Hay errores críticos en la matriz RASCI que deben corregirse primero.');
              return;
            }
          }

          try {
      
            const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
            // console.log('✅ Mapeo completado con resultados:', results);
          } catch (error) {
            console.error('❌ Error en el mapeo:', error);
            console.error(`❌ Error en el mapeo: ${error.message}`);
          }
        };
        // console.log('✅ Función executeRasciToRalphMapping definida manualmente');
      } else {
        console.error('❌ executeSimpleRasciMapping no está disponible');
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

  // Configurar función global para cambiar pestañas
  window.cambiarPestana = function(tabName) {
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
      
             // Actualizar matriz si es la pestaña principal
       if (tabName === 'main') {
         setTimeout(() => {
           showReloadIndicator();
           if (typeof window.updateMatrixFromDiagram === 'function') {
             window.updateMatrixFromDiagram();
           }
           setTimeout(() => {
             if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
               window.rasciUIValidator.forceValidation();
             }
             hideReloadIndicator();
           }, 50);
         }, 50);
       }
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
    console.log('🚀 Forzando recarga inmediata...');
    showReloadIndicator();
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    } else {
      console.warn('⚠️ updateMatrixFromDiagram no disponible, usando recarga manual');
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
    console.log('🔍 Debug de eventos BPMN:');
    console.log('- window.bpmnModeler:', typeof window.bpmnModeler);
    if (window.bpmnModeler && window.bpmnModeler.get) {
      const eventBus = window.bpmnModeler.get('eventBus');
      console.log('- eventBus disponible:', !!eventBus);
      if (eventBus) {
        console.log('- Eventos registrados:', eventBus._listeners ? Object.keys(eventBus._listeners) : 'No disponible');
      }
    }
  };

  // Función de test temporal
  window.testRasciMapping = () => {
    console.log('🧪 testRasciMapping: Función de test ejecutándose...');
    console.log('📊 Estado actual:');
    console.log('  - window.executeRasciToRalphMapping:', typeof window.executeRasciToRalphMapping);
    console.log('  - window.bpmnModeler:', typeof window.bpmnModeler);
    console.log('  - window.rasciMatrixData:', window.rasciMatrixData);
    console.log('  - executeSimpleRasciMapping:', typeof executeSimpleRasciMapping);
    
    if (typeof window.executeRasciToRalphMapping === 'function') {
      // console.log('✅ Ejecutando función de mapeo...');
      window.executeRasciToRalphMapping();
    } else {
      console.error('❌ Función de mapeo no disponible');
      console.warn('⚠️ Función de mapeo no disponible. Revisa la consola para más detalles.');
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

    console.log('🔄 Recarga automática de matriz RASCI iniciada');
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
      // console.log('⏹️ Recarga automática de matriz RASCI detenida');
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

  // Sistema de detección de cambios en BPMN
  function setupBpmnChangeDetection() {
    if (window.bpmnModeler && window.bpmnModeler.get) {
      const eventBus = window.bpmnModeler.get('eventBus');
      if (eventBus) {
        // Eventos que indican cambios en el diagrama
        const changeEvents = [
          'element.added',
          'element.removed',
          'element.changed',
          'elements.changed',
          'shape.move.end',
          'shape.resize.end',
          'connection.create',
          'connection.delete',
          'commandStack.changed',
          'canvas.viewbox.changed'
        ];

        // Debounce para evitar múltiples recargas
        let reloadTimeout = null;

        changeEvents.forEach(event => {
          eventBus.on(event, (e) => {
            console.log(`🔄 Evento BPMN detectado: ${event}`, e);
            
            // Cancelar timeout anterior si existe
            if (reloadTimeout) {
              clearTimeout(reloadTimeout);
            }

                         // Recargar matriz inmediatamente después de cambios en BPMN
             reloadTimeout = setTimeout(() => {
               console.log('🔄 Ejecutando recarga de matriz desde evento BPMN...');
               
               // Mostrar indicador de recarga
               showReloadIndicator();
               
               // Forzar detección de nuevas tareas primero
               if (typeof window.forceDetectNewTasks === 'function') {
                 window.forceDetectNewTasks();
               }
               
               // Forzar recarga de matriz
               if (typeof window.updateMatrixFromDiagram === 'function') {
                 window.updateMatrixFromDiagram();
               } else {
                 console.warn('⚠️ window.updateMatrixFromDiagram no está disponible');
                 // Intentar recarga manual
                 const rasciPanel = document.querySelector('#rasci-panel');
                 if (rasciPanel) {
                   renderMatrix(rasciPanel, roles, autoSaveRasciState);
                 }
               }
               
               // Forzar validación inmediatamente
               setTimeout(() => {
                 if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
                   window.rasciUIValidator.forceValidation();
                 }
                 
                 // Validación específica para tareas vacías
                 if (window.rasciUIValidator && typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
                   window.rasciUIValidator.validateEmptyTasks();
                 }
                 
                 // Ocultar indicador después de completar
                 hideReloadIndicator();
               }, 20);
             }, 20); // Reducido a 20ms para respuesta ultra rápida
          });
        });


      } else {
        console.warn('⚠️ EventBus no disponible en bpmnModeler');
      }
    } else {
      console.warn('⚠️ bpmnModeler no disponible para detección de cambios');
    }
  }

  // Configurar detección de cambios
  setupBpmnChangeDetection();

  // Función para verificar si el panel RASCI está visible y forzar recarga
  function checkAndForceReload() {
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel && rasciPanel.style.display !== 'none') {
      showReloadIndicator();
      
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
    console.log('🔧 Forzando recarga manual de RASCI...');
    checkAndForceReload();
  };

  window.debugRasciState = function() {
    console.log('🔍 === DEBUG ESTADO RASCI ===');
    console.log('📊 window.rasciMatrixData:', window.rasciMatrixData);
    console.log('📊 window.rasciRoles:', window.rasciRoles);
    console.log('📊 roles locales:', roles);
    console.log('📊 Tareas del diagrama:', getBpmnTasks());
    console.log('🔍 === FIN DEBUG ===');
  };

  window.forceDetectAndValidate = function() {
    console.log('🔧 Forzando detección y validación...');
    if (typeof window.forceDetectNewTasks === 'function') {
      window.forceDetectNewTasks();
    }
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
    }, 100);
  };

  // Funciones globales para debugging y control manual
  window.forceRasciReload = function() {
    console.log('🔧 Forzando recarga manual de RASCI...');
    checkAndForceReload();
  };

  window.debugRasciState = function() {
    console.log('🔍 === DEBUG ESTADO RASCI ===');
    console.log('📊 window.rasciMatrixData:', window.rasciMatrixData);
    console.log('📊 window.rasciRoles:', window.rasciRoles);
    console.log('📊 roles locales:', roles);
    console.log('📊 Tareas del diagrama:', getBpmnTasks());
    console.log('🔍 === FIN DEBUG ===');
  };

  window.forceDetectAndValidate = function() {
    console.log('🔧 Forzando detección y validación...');
    if (typeof window.forceDetectNewTasks === 'function') {
      window.forceDetectNewTasks();
    }
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
    }, 100);
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
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    }
  }, 500);

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      }
    }, 200);
  });
}

// Global function for toggling auto-mapping
window.toggleAutoMapping = function() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (!switchElement) return false;
  
  const isEnabled = switchElement.checked;
  
  if (window.rasciAutoMapping) {
    if (isEnabled) {
      window.rasciAutoMapping.enable();
      if (manualBtn) manualBtn.style.display = 'none';
      
      // Show notification
      // console.log('✅ Mapeo automático RALph activado');
      
      // Trigger initial mapping if matrix exists
      if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
        setTimeout(() => {
          window.rasciAutoMapping.triggerMapping();
        }, 100);
      }
    } else {
      window.rasciAutoMapping.disable();
      if (manualBtn) manualBtn.style.display = 'block';
      
      // console.log('❌ Mapeo automático RALph desactivado');
    }
  }
  
  return isEnabled;
};

// Initialize auto-mapping state when panel loads
window.initializeAutoMapping = function() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (switchElement) {
    // Set default state (enabled by default)
    switchElement.checked = true;
    
    // Initialize auto-mapping
    if (window.rasciAutoMapping) {
      window.rasciAutoMapping.enable();
      if (manualBtn) manualBtn.style.display = 'none';
    }
    
    console.log('🔄 Mapeo automático RALph inicializado (activado por defecto)');
  }
};

// Funciones globales de debug para RASCI
window.forceRasciReload = function() {
  console.log('🔄 Forzando recarga completa de RASCI...');
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

window.debugRasciState = function() {
  console.log('🔍 === DEBUG ESTADO RASCI COMPLETO ===');
  console.log('1. window.rasciMatrixData:', window.rasciMatrixData);
  console.log('2. localStorage.rasciMatrixData:', localStorage.getItem('rasciMatrixData'));
  console.log('3. localStorage.rasciRoles:', localStorage.getItem('rasciRoles'));
  console.log('4. window.bpmnModeler disponible:', !!window.bpmnModeler);
  console.log('5. window.rasciUIValidator disponible:', !!window.rasciUIValidator);
  
  if (window.bpmnModeler) {
    const tasks = getBpmnTasks();
    console.log('6. Tareas BPMN detectadas:', tasks);
  }
  
  if (window.rasciUIValidator) {
    console.log('7. Estado del validador:', window.rasciUIValidator.getValidationState());
  }
  
  console.log('🔍 === FIN DEBUG ===');
};
