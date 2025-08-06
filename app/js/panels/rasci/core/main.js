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
      // Preservar roles existentes si no hay nuevos
      const rolesToSave = window.rasciRoles || roles || [];
      localStorage.setItem('rasciRoles', JSON.stringify(rolesToSave));
      
      // Preservar matriz de datos existente
      const matrixDataToSave = window.rasciMatrixData || {};
      localStorage.setItem('rasciMatrixData', JSON.stringify(matrixDataToSave));
      
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
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        const parsedRoles = JSON.parse(savedRoles);
        window.rasciRoles = parsedRoles;
        roles = parsedRoles; // Mantener compatibilidad
        console.log('📋 Roles cargados desde localStorage:', parsedRoles);
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        const parsedMatrixData = JSON.parse(savedMatrixData);
        window.rasciMatrixData = parsedMatrixData;
        console.log('📋 Matriz cargada desde localStorage:', Object.keys(parsedMatrixData).length, 'tareas');
        
        // Verificar valores en la matriz
        Object.keys(parsedMatrixData).forEach(taskName => {
          Object.keys(parsedMatrixData[taskName]).forEach(roleName => {
            const value = parsedMatrixData[taskName][roleName];
            if (value && value !== '' && value !== undefined) {
              console.log(`📋 Valor preservado: ${taskName}.${roleName} = "${value}"`);
            }
          });
        });
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

  // Configurar observer para cambios de visibilidad
  function setupVisibilityObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.id === 'rasci-panel' && target.style.display !== 'none') {
            // Panel se hizo visible, cargar estado y actualizar matriz inmediatamente
            setTimeout(() => {
              showReloadIndicator();
              
              // Cargar estado desde localStorage antes de actualizar
              try {
                const savedRoles = localStorage.getItem('rasciRoles');
                if (savedRoles) {
                  window.rasciRoles = JSON.parse(savedRoles);
                }
                
                const savedMatrixData = localStorage.getItem('rasciMatrixData');
                if (savedMatrixData) {
                  window.rasciMatrixData = JSON.parse(savedMatrixData);
                }
              } catch (e) {
                console.warn('Error cargando estado RASCI:', e);
              }
              
              // PREVENIR SOBRESCRITURA DE VALORES EXISTENTES AL CARGAR
              if (window.rasciMatrixData && typeof window.preventOverwriteExistingValues === 'function') {
                window.preventOverwriteExistingValues();
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

  // Renderizar matriz inicial con roles cargados
  console.log('🎯 Renderizando matriz inicial con roles:', window.rasciRoles || roles);
  console.log('🎯 Matriz actual:', window.rasciMatrixData);
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
            
            // Cancelar timeout anterior si existe
            if (reloadTimeout) {
              clearTimeout(reloadTimeout);
            }

                         // Recargar matriz inmediatamente después de cambios en BPMN
             reloadTimeout = setTimeout(() => {
               
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
      }
    } else {
    }
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
    console.log('🛡️ Preveniendo sobrescritura de valores existentes...');
    
    if (window.rasciMatrixData) {
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        Object.keys(window.rasciMatrixData[taskName]).forEach(roleName => {
          const currentValue = window.rasciMatrixData[taskName][roleName];
          
          // Si el valor es un string vacío y no debería serlo, restaurarlo
          if (currentValue === '' && currentValue !== undefined) {
            console.log(`⚠️ Detectado valor vacío en ${taskName}.${roleName}, restaurando...`);
            // No establecer valor vacío, dejar que el usuario lo asigne
            window.rasciMatrixData[taskName][roleName] = undefined;
          }
        });
      });
    }
  };
  

  

  
    // Función para forzar guardado inmediato
  window.forceSaveRasciState = function() {
    console.log('💾 Forzando guardado inmediato de estado RASCI...');
    saveRasciState();
  };
  
  // Función para verificar estado de guardado automático
  window.checkAutoSaveStatus = function() {
    console.log('🔍 Estado del guardado automático:');
    console.log('📋 Último guardado:', new Date(lastSaveTime).toLocaleTimeString());
    console.log('📋 Tiempo desde último guardado:', Date.now() - lastSaveTime, 'ms');
    console.log('📋 Guardado automático activo: INMEDIATO (sin debounce)');
    console.log('📋 Indicador visual: cada 500ms');
  };
  
  // Función para verificar estado actual de roles
  window.checkRolesState = function() {
    console.log('🔍 VERIFICANDO ESTADO ACTUAL DE ROLES:');
    console.log('📋 window.rasciRoles:', window.rasciRoles);
    console.log('📋 roles:', roles);
    console.log('📋 localStorage rasciRoles:', localStorage.getItem('rasciRoles'));
    
    if (window.rasciRoles) {
      console.log('📋 window.rasciRoles.length:', window.rasciRoles.length);
      window.rasciRoles.forEach((role, index) => {
        console.log(`  ${index}: "${role}" (tipo: ${typeof role})`);
      });
    }
    
    if (roles) {
      console.log('📋 roles.length:', roles.length);
      roles.forEach((role, index) => {
        console.log(`  ${index}: "${role}" (tipo: ${typeof role})`);
      });
    }
  };
  
  // Función para limpiar y reinicializar roles RASCI
  window.resetRasciRoles = function() {
    console.log('🔄 Reinicializando roles RASCI...');
    window.rasciRoles = [];
    roles = [];
    localStorage.removeItem('rasciRoles');
    console.log('✅ Roles RASCI reinicializados');
  };
  
  // Función para forzar detección y guardado inmediato
  window.forceDetectAndSaveRoles = function() {
    console.log('🔄 Forzando detección y guardado inmediato de roles...');
    if (typeof window.detectRalphRolesFromCanvas === 'function') {
      const detectedRoles = window.detectRalphRolesFromCanvas();
      if (detectedRoles.length > 0) {
        console.log(`✅ ${detectedRoles.length} roles RALPH detectados:`, detectedRoles);
        
        // Establecer roles inmediatamente
        window.rasciRoles = [...detectedRoles];
        roles = [...detectedRoles];
        
        console.log('🔍 Roles establecidos en window.rasciRoles:', window.rasciRoles);
        console.log('🔍 Roles establecidos en roles:', roles);
        
        // Guardar inmediatamente en localStorage
        try {
          localStorage.setItem('rasciRoles', JSON.stringify(window.rasciRoles));
          console.log('💾 Roles guardados inmediatamente en localStorage:', window.rasciRoles);
          
          // Verificar que se guardó correctamente
          const savedRoles = localStorage.getItem('rasciRoles');
          console.log('🔍 Roles leídos de localStorage:', savedRoles);
          const parsedRoles = JSON.parse(savedRoles);
          console.log('🔍 Roles parseados de localStorage:', parsedRoles);
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
          localStorage.setItem('rasciRoles', JSON.stringify(window.rasciRoles));
          console.log('💾 Roles guardados en localStorage:', window.rasciRoles);
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
    // Cargar estado desde localStorage antes de actualizar
    try {
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        window.rasciRoles = JSON.parse(savedRoles);
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
      }
    } catch (e) {
      console.warn('Error cargando estado RASCI:', e);
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
      // Cargar estado desde localStorage antes de actualizar
      try {
        const savedRoles = localStorage.getItem('rasciRoles');
        if (savedRoles) {
          window.rasciRoles = JSON.parse(savedRoles);
          roles = window.rasciRoles; // Actualizar también la variable local
          console.log('✅ Roles cargados desde localStorage:', window.rasciRoles);
        }
        
        const savedMatrixData = localStorage.getItem('rasciMatrixData');
        if (savedMatrixData) {
          window.rasciMatrixData = JSON.parse(savedMatrixData);
          console.log('✅ Matriz cargada desde localStorage:', Object.keys(window.rasciMatrixData).length, 'tareas');
        }
      } catch (e) {
        console.warn('Error cargando estado RASCI:', e);
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
      
      // Trigger initial mapping if matrix exists
      if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
        setTimeout(() => {
          window.rasciAutoMapping.triggerMapping();
        }, 100);
      }
    } else {
      window.rasciAutoMapping.disable();
      if (manualBtn) manualBtn.style.display = 'block';
      
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
    
  }
};

// Funciones globales de debug para RASCI
window.forceRasciReload = function() {
  // Cargar estado desde localStorage antes de actualizar
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI:', e);
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

// Función global para recargar estado RASCI desde localStorage
window.reloadRasciState = function() {
  console.log('🔄 Recargando estado RASCI desde localStorage...');
  
  // Cargar estado desde localStorage
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
      console.log('✅ Roles cargados:', window.rasciRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
      console.log('✅ Matriz cargada:', Object.keys(window.rasciMatrixData).length, 'tareas');
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI:', e);
  }
  
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    console.log('🎯 Renderizando matriz RASCI...');
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado');
  }
};

// Función global para debug del estado RASCI
window.debugRasciState = function() {
  console.log('🔍 DEBUG: Estado actual de RASCI');
  console.log('Roles:', window.rasciRoles);
  console.log('Matriz:', window.rasciMatrixData);
  
  const savedRoles = localStorage.getItem('rasciRoles');
  const savedMatrixData = localStorage.getItem('rasciMatrixData');
  
  console.log('localStorage roles:', savedRoles);
  console.log('localStorage matriz:', savedMatrixData);
};

// Función global para forzar recarga del estado RASCI
window.forceReloadRasciState = function() {
  console.log('🔄 Forzando recarga del estado RASCI...');
  
  // Cargar estado desde localStorage
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
      console.log('✅ Roles cargados:', window.rasciRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
      console.log('✅ Matriz cargada:', Object.keys(window.rasciMatrixData).length, 'tareas');
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI:', e);
  }
  
  // Forzar re-renderizado de la matriz
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    console.log('🎯 Forzando re-renderizado de la matriz...');
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado');
  }
};

// Función global para simular el problema y debuggear
window.debugRasciIssue = function() {
  console.log('🔍 DEBUG: Simulando el problema de sobrescritura...');
  
  // 1. Cargar estado original
  const originalMatrixData = localStorage.getItem('rasciMatrixData');
  console.log('📋 Estado original en localStorage:', originalMatrixData);
  
  // 2. Ver estado actual en memoria
  console.log('📋 Estado actual en window.rasciMatrixData:', window.rasciMatrixData);
  
  // 3. Simular llamada a updateMatrixFromDiagram
  console.log('🔄 Simulando llamada a updateMatrixFromDiagram...');
  if (typeof window.updateMatrixFromDiagram === 'function') {
    window.updateMatrixFromDiagram();
  }
  
  // 4. Verificar si cambió algo
  setTimeout(() => {
    console.log('📋 Estado después de updateMatrixFromDiagram:', window.rasciMatrixData);
    
    // 5. Comparar con el original
    if (originalMatrixData) {
      const original = JSON.parse(originalMatrixData);
      console.log('🔍 Comparación:');
      console.log('  Original:', original);
      console.log('  Actual:', window.rasciMatrixData);
      
      // Verificar si se perdieron valores
      Object.keys(original).forEach(taskName => {
        Object.keys(original[taskName]).forEach(roleName => {
          const originalValue = original[taskName][roleName];
          const currentValue = window.rasciMatrixData[taskName]?.[roleName];
          
          if (originalValue && originalValue !== '' && currentValue === '') {
            console.error(`❌ VALOR PERDIDO: ${taskName}.${roleName} = "${originalValue}" -> "${currentValue}"`);
          }
        });
      });
    }
  }, 1000);
};

window.debugRasciState = function() {
  
  if (window.bpmnModeler) {
    const tasks = getBpmnTasks();
  }
  
  if (window.rasciUIValidator) {
  }
  
};
