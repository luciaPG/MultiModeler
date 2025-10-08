// RASCI Core
import { renderMatrix, addNewRole, editRole, showDeleteConfirmModal, getBpmnTasks, forceReloadMatrix, setupDiagramChangeListener } from './matrix-manager.js';
import { applyStyles } from './styles.js';
import { initRasciMapping, executeSimpleRasciMapping, rasciAutoMapping } from '../mapping/index.js';
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';
import { onBeforeUnload, onLoad } from '../../ui/core/dom-events.js';
import rasciAdapter from '../RASCIAdapter.js';

// Bootstrap SR
const sr = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : undefined;
const eventBus = sr && sr.get ? sr.get('EventBus') : undefined;
const rasciAdapterInstance = sr && sr.get ? sr.get('RASCIAdapter') : rasciAdapter;
const validator = sr && sr.get ? sr.get('RASCIUIValidator') : undefined;
const bpmnModeler = sr && sr.get ? sr.get('BPMNModeler') : (rasciAdapterInstance && rasciAdapterInstance.getBpmnModeler ? rasciAdapterInstance.getBpmnModeler() : undefined);

// Idempotency flag for listeners
let rasciListenersBound = false;

// Bind RASCI core listeners with guards and idempotency
export function bindRasciCoreListeners() {
  if (rasciListenersBound) return;
  rasciListenersBound = true;

  onBeforeUnload(() => {
    sessionStorage.setItem('rasciNeedsReload', 'true');
  });
}

export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');

  // Register forceReloadMatrix in service registry instead of window
  if (sr) {
    sr.registerFunction('forceReloadMatrix', forceReloadMatrix);
  }

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
  
      if (!rasciAdapterInstance || (rasciAdapterInstance && typeof rasciAdapterInstance.hasMatrixData === 'function' && !rasciAdapterInstance.hasMatrixData())) {
        rasciAdapterInstance && typeof rasciAdapterInstance.setMatrixData === 'function' && rasciAdapterInstance.setMatrixData({});
      }  // Función para guardar el estado - localStorage eliminado del panel RASCI
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
      if (!rasciAdapter || (rasciAdapter && typeof rasciAdapter.hasRoles === 'function' && !rasciAdapter.hasRoles())) {
        rasciAdapter && typeof rasciAdapter.setRoles === 'function' && rasciAdapter.setRoles([]);
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
                if (!rasciAdapter || (rasciAdapter && typeof rasciAdapter.hasRoles === 'function' && !rasciAdapter.hasRoles())) {
                  rasciAdapter && typeof rasciAdapter.setRoles === 'function' && rasciAdapter.setRoles([]);
                }
                if (!rasciAdapter || (rasciAdapter && typeof rasciAdapter.hasMatrixData === 'function' && !rasciAdapter.hasMatrixData())) {
                  rasciAdapter && typeof rasciAdapter.setMatrixData === 'function' && rasciAdapter.setMatrixData({});
                }
                console.log('✅ Estado RASCI inicializado (sin localStorage)');
              } catch (e) {
                console.warn('Error inicializando estado RASCI:', e);
              }
              
              // Solo renderizar la matriz una vez
              const rasciPanel = document.querySelector('#rasci-panel');
              if (rasciPanel) {
                renderMatrix(rasciPanel, rasciAdapterInstance && typeof rasciAdapterInstance.getRoles === 'function' ? rasciAdapterInstance.getRoles() : [], autoSaveRasciState);
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
          changeTab(tabName);
        }
      });
    });
  }, 100);

  // Inicializar componentes
  ensureActiveTabVisibility();
  setupVisibilityObserver();

  // CRÍTICO: Configurar suscripciones a eventos para actualización automática de UI
  if (eventBus && eventBus.subscribe) {
    console.log('🔗 Configurando suscripciones a eventos RASCI para actualización automática...');
    
    // Suscribirse a eventos de actualización de matriz
    eventBus.subscribe('rasci.matrix.updated', (event) => {
      console.log('📡 Evento recibido: rasci.matrix.updated', event);
      const currentRoles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : roles;
      renderMatrix(panel, currentRoles, autoSaveRasciState);
      console.log('✅ Matriz UI actualizada por evento rasci.matrix.updated');
    });
    
    // Suscribirse a eventos de actualización de roles
    eventBus.subscribe('rasci.roles.updated', (event) => {
      console.log('📡 Evento recibido: rasci.roles.updated', event);
      if (event.roles && Array.isArray(event.roles)) {
        roles = event.roles;
        renderMatrix(panel, roles, autoSaveRasciState);
        console.log('✅ Matriz UI actualizada por evento rasci.roles.updated');
      }
    });
    
    // Suscribirse a eventos de restauración
    eventBus.subscribe('rasci.restored', (event) => {
      console.log('📡 Evento recibido: rasci.restored', event);
      if (event.roles) roles = event.roles;
      const currentRoles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : roles;
      renderMatrix(panel, currentRoles, autoSaveRasciState);
      console.log('✅ Matriz UI actualizada por evento rasci.restored');
    });
    
    // Suscribirse a eventos de actualización desde diagrama
    eventBus.subscribe('rasci.matrix.update.fromDiagram', (event) => {
      console.log('📡 Evento recibido: rasci.matrix.update.fromDiagram', event);
      if (event.forceUpdate || event.source === 'autosave.restore') {
        const currentRoles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : roles;
        renderMatrix(panel, currentRoles, autoSaveRasciState);
        console.log('✅ Matriz UI actualizada por evento rasci.matrix.update.fromDiagram');
      }
    });
    
    console.log('✅ Suscripciones a eventos RASCI configuradas');
  }

  // Renderizar matriz inicial con roles cargados
  renderMatrix(panel, rasciAdapterInstance && typeof rasciAdapterInstance.getRoles === 'function' ? rasciAdapterInstance.getRoles() : roles, autoSaveRasciState);

  // Sincronizar nombres de roles desde RASCI hacia canvas al cargar
  setTimeout(() => {
    eventBus && eventBus.publish('app.sync.onLoad', {});
    

  }, 1000); // Esperar 1 segundo para asegurar que todo esté cargado

  // Inicializar mapeo
  initRasciMapping(panel);
  
  // Verificar que la función de mapeo esté disponible
  setTimeout(() => {
    
    
    // Register executeRasciToRalphMapping in service registry
    const executeRasciToRalphMapping = function() {
      const modeler = bpmnModeler || (rasciAdapterInstance && rasciAdapterInstance.getBpmnModeler && rasciAdapterInstance.getBpmnModeler());
      const data = (rasciAdapter && rasciAdapter.getMatrixData && rasciAdapter.getMatrixData()) || {};
      
      if (!modeler || !Object.keys(data).length) return;
      
      // Verificar si el auto-mapping está habilitado
      const autoMappingSwitch = document.getElementById('auto-mapping-switch');
      const isAutoMappingEnabled = autoMappingSwitch ? autoMappingSwitch.checked : true; // Por defecto habilitado
      
      if (!isAutoMappingEnabled) {
        console.log('Mapeo automático deshabilitado - Solo se actualiza la matriz RASCI');
        return;
      }
      
      const validatorInstance = validator;
      if (validator && validator.getValidationState && validator.getValidationState().hasCriticalErrors) {
        alert('❌ No se puede ejecutar el mapeo. Hay errores críticos en la matriz RASCI que deben corregirse primero.');
        return;
      }
      
      try {
        const results = executeSimpleRasciMapping(modeler, data);
        if (results && results.error === 'Reglas RASCI no cumplidas') {
          console.log('⚠️ Mapeo cancelado - Corrige los errores RASCI primero');
          return;
        }
      } catch (error) {
        console.error('Error executing RASCI to Ralph mapping:', error);
      }
    };
    
    if (sr) {
      sr.registerFunction('executeRasciToRalphMapping', executeRasciToRalphMapping);
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

  // Configurar función local para cambiar pestañas (SIN RECARGA AUTOMÁTICA)
  const changeTab = function(tabName) {
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

  // Register functions in service registry
  const reloadRasciMatrix = () => {
    // Mostrar indicador de recarga
    showReloadIndicator();
    
    const updateMatrixFromDiagram = sr && sr.getFunction ? sr.getFunction('updateMatrixFromDiagram') : undefined;
    if (updateMatrixFromDiagram) {
      updateMatrixFromDiagram();
    }
    
    // Initialize auto-mapping after matrix reload
    setTimeout(() => {
      const initializeAutoMapping = sr && sr.getFunction ? sr.getFunction('initializeAutoMapping') : undefined;
      if (initializeAutoMapping) {
        initializeAutoMapping();
      }
      
      // Forzar validación inmediatamente
      if (validator && typeof validator.forceValidation === 'function') {
        validator.forceValidation();
      }
      
      // Ocultar indicador después de completar
      hideReloadIndicator();
    }, 50);
  };
  
  // COMENTADO PARA EVITAR BUCLE INFINITO - reloadRasciMatrix ya está registrada en matrix-manager.js
  // if (sr) {
  //   sr.registerFunction('reloadRasciMatrix', reloadRasciMatrix);
  // }

  // Function for immediate reload
  const forceImmediateReload = () => {
    showReloadIndicator();
    const updateMatrixFromDiagram = sr && sr.getFunction ? sr.getFunction('updateMatrixFromDiagram') : undefined;
    if (updateMatrixFromDiagram) {
      updateMatrixFromDiagram();
    } else {
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, roles, autoSaveRasciState);
      }
    }
    setTimeout(() => {
      if (validator && typeof validator.forceValidation === 'function') {
        validator.forceValidation();
      }
      hideReloadIndicator();
    }, 30);
  };
  
  if (sr) {
    sr.registerFunction('forceImmediateReload', forceImmediateReload);
  }

  // Expose minimal globals for legacy inline handlers in HTML templates
  if (typeof window !== 'undefined') {
    // Bridge for <div onclick="cambiarPestana('...')">
    window.cambiarPestana = function(tabName) {
      try {
        changeTab(tabName);
      } catch (e) { /* ignore */ }
    };
    // Bridge for <button onclick="manualReloadRasciMatrix()">
    window.manualReloadRasciMatrix = function() {
      try {
        reloadRasciMatrix();
      } catch (e) { /* ignore */ }
    };
  }

  // Function for BPMN event debugging
  const debugBpmnEvents = () => {
    const modeler = rasciAdapter.getBpmnModeler();
    if (modeler && modeler.get) {
      const eventBus = modeler.get('eventBus');
      if (eventBus) {
        console.log('[RASCI] BPMN EventBus available');
      }
    }
  };
  
  if (sr) {
    sr.registerFunction('debugBpmnEvents', debugBpmnEvents);
  }

  // Test mapping function
  const testRasciMapping = () => {
    const executeRasciToRalphMapping = sr && sr.getFunction ? sr.getFunction('executeRasciToRalphMapping') : undefined;
    if (executeRasciToRalphMapping) {
      executeRasciToRalphMapping();
    } else {
      console.warn('[RASCI] executeRasciToRalphMapping not available');
    }
  };
  
  if (sr) {
    sr.registerFunction('testRasciMapping', testRasciMapping);
  }

  const forceReloadRasciMatrix = function() {
    const rasciPanel = document.querySelector('#rasci-panel');
    const reloadRasciMatrixFn = sr && sr.getFunction ? sr.getFunction('reloadRasciMatrix') : undefined;
    if (rasciPanel && reloadRasciMatrixFn) {
      reloadRasciMatrixFn();
    }
  };
  
  if (sr) {
    sr.registerFunction('forceReloadRasciMatrix', forceReloadRasciMatrix);
  }

  // Auto-reload control functions
  const toggleRasciAutoReload = function() {
    if (autoReloadInterval) {
      stopAutoReload();
      return false;
    } else {
      startAutoReload();
      return true;
    }
  };
  
  if (sr) {
    sr.registerFunction('startRasciAutoReload', startAutoReload);
    sr.registerFunction('stopRasciAutoReload', stopAutoReload);
    sr.registerFunction('toggleRasciAutoReload', toggleRasciAutoReload);
  }

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
  const currentMatrixData = JSON.stringify(rasciAdapter && typeof rasciAdapter.getMatrixData === 'function' ? rasciAdapter.getMatrixData() : {});
      
      // Solo recargar si los datos han cambiado
      if (currentMatrixData !== lastMatrixData) {
        lastMatrixData = currentMatrixData;
        
        // Mostrar indicador de recarga
        showReloadIndicator();
        
        eventBus && eventBus.publish('rasci.matrix.update.fromDiagram', {});
        
        // Forzar validación después de la recarga
        setTimeout(() => {
          if (validator && typeof validator.forceValidation === 'function') {
            validator.forceValidation();
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
  onBeforeUnload(() => {
    sessionStorage.setItem('rasciNeedsReload', 'true');
  });

  if (sessionStorage.getItem('rasciNeedsReload') === 'true') {
    sessionStorage.removeItem('rasciNeedsReload');
    setTimeout(() => {
      eventBus && eventBus.publish && eventBus.publish('rasci.matrix.reload', {});
    }, 1000);
  }

  // Inicializar validador de matriz RASCI
  rasciUIValidator.init(panel);

  // Sistema de detección de cambios en BPMN - HABILITADO para sincronizar matriz
  function setupBpmnChangeDetection() {
    console.log('🔍 Configurando detección de cambios BPMN para sincronizar matriz RASCI...');
    
    const registry = getServiceRegistry();
    const modeler = registry && registry.get('BPMNModeler');
    if (modeler && modeler.get) {
      const eventBus = modeler.get('eventBus');
      if (eventBus) {
        console.log('✅ EventBus disponible - configurando listeners para sincronización');
        // Configurar listeners para sincronizar matriz cuando cambie el diagrama
        setupDiagramChangeListener();
      } else {
        console.log('⚠️ EventBus no disponible');
      }
    } else {
      console.log('⚠️ BPMN Modeler no disponible');
    }
  }

  // Configurar detección de cambios
  setupBpmnChangeDetection();

  // Verificar y recargar cada 500ms si el panel está visible (desactivado para evitar recargas constantes)
  // setInterval(checkAndForceReload, 500);

  // Register RASCI debug functions in service registry
  const rasciDebugAPI = {
    forceReload: () => {
      const sr = getServiceRegistry();
      const eb = sr && sr.get('EventBus');
      eb && eb.publish('rasci.matrix.reload', {});
      eb && eb.publish('rasci.tasks.detect', {});
      setTimeout(() => {
        const validator = sr && sr.get('RASCIUIValidator');
        if (validator && validator.forceValidation) validator.forceValidation();
      }, 100);
    },
    debugState: () => {
      const sr = getServiceRegistry();
      const ra = sr && sr.get('RASCIAdapter');
      console.log('RASCI State:', {
        matrixData: ra && ra.getMatrixData ? ra.getMatrixData() : {},
        roles: ra && ra.getRoles ? ra.getRoles() : [],
        validator: sr && sr.get('RASCIUIValidator')
      });
    },
    forceDetectAndValidate: () => {
      const sr = getServiceRegistry();
      const eb = sr && sr.get('EventBus');
      eb && eb.publish('rasci.tasks.detect', {});
      setTimeout(() => {
        const validator = sr && sr.get('RASCIUIValidator');
        if (validator && validator.forceValidation) validator.forceValidation();
      }, 100);
    },
    preventOverwriteExistingValues: () => {
      const sr = getServiceRegistry();
      const ra = sr && sr.get('RASCIAdapter');
      const matrixData = ra && ra.getMatrixData ? ra.getMatrixData() : {};
      Object.keys(matrixData).forEach(taskName => {
        Object.keys(matrixData[taskName]).forEach(roleName => {
          const currentValue = matrixData[taskName][roleName];
          if (currentValue === '' && currentValue !== undefined) {
            ra && ra.patchMatrixData && ra.patchMatrixData({ [taskName]: { [roleName]: undefined } });
          }
        });
      });
    }
  };

  if (sr) {
    sr.register('RASCIAPI', rasciDebugAPI, { description: 'RASCI debug and control API' });
  }

  // Expose in __debug for development
  // registerDebug('RASCIAPI', rasciDebugAPI); // Removed: debug-registry deleted
  // Register RASCI control functions in service registry
  if (sr) {
    // Save state function
    sr.registerFunction('forceSaveRasciState', () => saveRasciState());

    // Check auto-save status
    sr.registerFunction('checkAutoSaveStatus', () => {
      console.log('Estado del guardado automático:');
      console.log('Último guardado:', new Date(lastSaveTime).toLocaleTimeString());
      console.log('Tiempo desde último guardado:', Date.now() - lastSaveTime, 'ms');
      console.log('Guardado automático activo: INMEDIATO (sin debounce)');
      console.log('Indicador visual: cada 500ms');
    });

    // Check roles state
    sr.registerFunction('checkRolesState', () => {
      console.log('Estado actual de roles:');
      console.log('rasciAdapter roles:', rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : undefined);
      console.log('roles:', roles);
    });

    // Reset RASCI roles
    sr.registerFunction('resetRasciRoles', () => {
      rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([]);
      roles = [];
      eventBus && eventBus.publish && eventBus.publish('rasci.roles.reset', {});
    });

    // Force detect and save roles
    sr.registerFunction('forceDetectAndSaveRoles', () => {
      const detectRalphRolesFromCanvas = sr && sr.getFunction && sr.getFunction('detectRalphRolesFromCanvas');
      if (detectRalphRolesFromCanvas) {
        const detectedRoles = detectRalphRolesFromCanvas();
        if (detectedRoles.length > 0) {
          // Set roles immediately
          rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([...detectedRoles]);
          roles = [...detectedRoles];

          // Update matrix data
          const matrixData = rasciAdapterInstance && rasciAdapterInstance.getMatrixData ? rasciAdapterInstance.getMatrixData() : {};
          Object.keys(matrixData).forEach(taskName => {
            detectedRoles.forEach(roleName => {
              if (!(roleName in matrixData[taskName])) {
                const updatedMatrix = { ...matrixData };
                if (!updatedMatrix[taskName]) updatedMatrix[taskName] = {};
                updatedMatrix[taskName][roleName] = undefined;
                rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData(updatedMatrix);
                console.log(`➕ Rol ${roleName} agregado a tarea ${taskName}`);
              }
            });
          });

          // Re-render matrix immediately
          const rasciPanel = document.querySelector('#rasci-panel');
          if (rasciPanel) {
            renderMatrix(rasciPanel, rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [], autoSaveRasciState);
            console.log('✅ Matriz re-renderizada con roles detectados');
          }
        } else {
          console.log('ℹ️ No se detectaron roles RALPH en el canvas');
        }
      } else {
        console.warn('⚠️ Función detectRalphRolesFromCanvas no disponible');
      }
      eventBus && eventBus.publish && eventBus.publish('rasci.roles.detect', { save: true });
    });

    // Mapeo manual que procesa cambios pendientes
    sr.registerFunction('executeManualRasciMapping', async () => {
      // Importar directamente desde auto-mapper para evitar recursión
      try {
        const { executeManualRasciMapping } = await import('../mapping/auto-mapper.js');
        if (executeManualRasciMapping) {
          await executeManualRasciMapping();
        } else {
          console.warn('⚠️ Función executeManualRasciMapping no disponible');
        }
      } catch (error) {
        console.error('❌ Error importando executeManualRasciMapping:', error);
      }
    });

    // Debug de la cola de cambios
    sr.registerFunction('debugQueueStatus', async () => {
      // Importar directamente desde change-queue-manager para evitar recursión
      try {
        const { debugQueueStatus } = await import('./change-queue-manager.js');
        if (debugQueueStatus) {
          debugQueueStatus();
        } else {
          console.warn('⚠️ Función debugQueueStatus no disponible');
        }
      } catch (error) {
        console.error('❌ Error importando debugQueueStatus:', error);
      }
    });

    // Force detect Ralph roles
    sr.registerFunction('forceDetectRalphRoles', () => {
      console.log('🔄 Forzando detección de roles RALPH (manual)...');
      const detectRalphRolesFromCanvas = sr && sr.getFunction && sr.getFunction('detectRalphRolesFromCanvas');
      if (detectRalphRolesFromCanvas) {
        const detectedRoles = detectRalphRolesFromCanvas();
        if (detectedRoles.length > 0) {
          console.log(`✅ ${detectedRoles.length} roles RALPH detectados:`, detectedRoles);

          // SET ALL DETECTED ROLES (NOT JUST ADD)
          rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([...detectedRoles]);
          roles = [...detectedRoles];

          console.log('🔍 Roles establecidos:', roles);

          // Update matrix data to include all detected roles
          const matrixData = rasciAdapterInstance && rasciAdapterInstance.getMatrixData ? rasciAdapterInstance.getMatrixData() : {};
          Object.keys(matrixData).forEach(taskName => {
            detectedRoles.forEach(roleName => {
              if (!(roleName in matrixData[taskName])) {
                const updatedMatrix = { ...matrixData };
                if (!updatedMatrix[taskName]) updatedMatrix[taskName] = {};
                updatedMatrix[taskName][roleName] = undefined;
                rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData(updatedMatrix);
                console.log(`➕ Rol ${roleName} agregado a tarea ${taskName} (sin valor asignado)`);
              }
            });
          });

          // Re-render matrix with updated roles
          const rasciPanel = document.querySelector('#rasci-panel');
          if (rasciPanel) {
            renderMatrix(rasciPanel, roles, autoSaveRasciState);
            console.log('✅ Matriz re-renderizada con roles detectados');
          }
        } else {
          console.log('ℹ️ No se detectaron roles RALPH en el canvas');
        }
      } else {
        console.warn('⚠️ Función detectRalphRolesFromCanvas no disponible');
      }
    });
  }

  // Initial matrix update
  setTimeout(() => {
    eventBus && eventBus.publish('rasci.matrix.update.fromDiagram', {});
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {

        
        eventBus && eventBus.publish('rasci.matrix.update.fromDiagram', {});
      }, 300);
    });
  } else {
    setTimeout(() => {
      
      
      eventBus && eventBus.publish('rasci.matrix.update.fromDiagram', {});
    }, 300);
  }

  // Carga inicial de tareas (una sola vez)
  setTimeout(() => {
    // localStorage eliminado del panel RASCI - inicializar vacío
    try {
      if (!rasciAdapterInstance || (rasciAdapterInstance && typeof rasciAdapterInstance.getRoles === 'function' && (!rasciAdapterInstance.getRoles() || rasciAdapterInstance.getRoles().length === 0))) {
        rasciAdapterInstance && typeof rasciAdapterInstance.setRoles === 'function' && rasciAdapterInstance.setRoles([]);
      }
      
      if (!rasciAdapterInstance || (rasciAdapterInstance && typeof rasciAdapterInstance.getMatrixData === 'function' && !rasciAdapterInstance.getMatrixData()) || !Object.keys(rasciAdapterInstance.getMatrixData() || {}).length) {
        rasciAdapterInstance && typeof rasciAdapterInstance.setMatrixData === 'function' && rasciAdapterInstance.setMatrixData({});
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }
    

    
    // Solo actualizar si no hay datos guardados para evitar sobrescribir
    const matrixData = rasciAdapter && rasciAdapter.getMatrixData ? rasciAdapter.getMatrixData() : {};
    if (!matrixData || Object.keys(matrixData).length === 0) {
      eventBus && eventBus.publish('rasci.matrix.update.fromDiagram', {});
    } else {
      // Si hay datos guardados, solo renderizar la matriz sin actualizar
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        const roles = rasciAdapter && rasciAdapter.getRoles ? rasciAdapter.getRoles() : [];
        renderMatrix(rasciPanel, roles, autoSaveRasciState);
      }
    }
  }, 500);

  onLoad(() => {
    setTimeout(() => {
    // Initialize RASCI state via adapters
    try {
      if (!rasciAdapterInstance || (rasciAdapterInstance.getRoles && !rasciAdapterInstance.getRoles().length)) {
        rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([]);
        roles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
      }

      if (!rasciAdapterInstance || (rasciAdapterInstance.getMatrixData && !Object.keys(rasciAdapterInstance.getMatrixData()).length)) {
        rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData({});
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }

    // Solo actualizar si no hay datos guardados para evitar sobrescribir
    const matrixData = rasciAdapterInstance && rasciAdapterInstance.getMatrixData ? rasciAdapterInstance.getMatrixData() : {};
    if (!matrixData || Object.keys(matrixData).length === 0) {
      eventBus && eventBus.publish && eventBus.publish('rasci.matrix.update.fromDiagram', {});
    } else {
      // Si hay datos guardados, solo renderizar la matriz sin actualizar
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        const roles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
        renderMatrix(rasciPanel, roles, autoSaveRasciState);
      }
    }
  }, 200);
  });

// Global function for toggling auto-mapping
// Función modular para togglear auto-mapping
function toggleAutoMapping() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');

  if (!switchElement) return false;

  const isEnabled = switchElement.checked;

  // Si se está intentando activar el mapeo, validar reglas primero
  if (isEnabled) {
    // Obtener la función de validación desde el ServiceRegistry
    const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    if (sr && typeof sr.getFunction === 'function') {
      const validateRasciCriticalRules = sr.getFunction('validateRasciCriticalRules');
      if (typeof validateRasciCriticalRules === 'function') {
        const validation = validateRasciCriticalRules();
        if (!validation.isValid) {
          // Revertir el toggle si hay errores
          switchElement.checked = false;
          alert('No se puede activar el mapeo automático. Corrige los errores RASCI primero:\n\n' + 
                validation.errors.join('\n'));
          return false;
        }
      }
    }
  }

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

// Hacer la función disponible globalmente para el HTML
if (typeof window !== 'undefined') {
  window.toggleAutoMapping = toggleAutoMapping;
}

// Función modular para inicializar auto-mapping
function initializeAutoMapping() {
  const switchElement = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');

  if (switchElement) {
    // Set default state (DISABLED by default)
    switchElement.checked = false;

    // Initialize auto-mapping as disabled
    if (rasciAutoMapping) {
      rasciAutoMapping.disable();
      if (manualBtn) manualBtn.style.display = 'block';
    }

  }
}

// Register auto-mapping functions in service registry
if (sr) {
  sr.registerFunction('toggleAutoMapping', toggleAutoMapping);
  sr.registerFunction('initializeAutoMapping', initializeAutoMapping);
}

// Register RASCI state management functions in service registry
if (sr) {
  // Force RASCI reload
  sr.registerFunction('forceRasciReload', () => {
    const registry = getServiceRegistry();
    const eventBus = registry && registry.get('EventBus');
    // Initialize RASCI state via adapters
    try {
      if (!rasciAdapterInstance || (rasciAdapterInstance.getRoles && !rasciAdapterInstance.getRoles().length)) {
        rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([]);
      }

      if (!rasciAdapterInstance || (rasciAdapterInstance.getMatrixData && !Object.keys(rasciAdapterInstance.getMatrixData()).length)) {
        rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData({});
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }

    eventBus && eventBus.publish && eventBus.publish('rasci.matrix.update.fromDiagram', {});
    eventBus && eventBus.publish && eventBus.publish('rasci.tasks.detect', {});
    setTimeout(() => {
      const validator = registry && registry.get('RASCIUIValidator');
      if (validator && typeof validator.forceValidation === 'function') {
        validator.forceValidation();
      }
    }, 100);
  });

  // Reload RASCI state
  sr.registerFunction('reloadRasciState', () => {
    // Initialize RASCI state via adapters
    try {
      if (!rasciAdapterInstance || (rasciAdapterInstance.getRoles && !rasciAdapterInstance.getRoles().length)) {
        rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([]);
        console.log('✅ Roles inicializados:', rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : []);
      }

      if (!rasciAdapterInstance || (rasciAdapterInstance.getMatrixData && !Object.keys(rasciAdapterInstance.getMatrixData()).length)) {
        rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData({});
        console.log('✅ Matriz inicializada:', Object.keys(rasciAdapterInstance && rasciAdapterInstance.getMatrixData ? rasciAdapterInstance.getMatrixData() : {}).length, 'tareas');
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }

    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      // Renderizar matriz RASCI
      const roles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
      renderMatrix(rasciPanel, roles, null);
    } else {
      console.warn('⚠️ Panel RASCI no encontrado');
    }
  });

  // Force reload RASCI state
  sr.registerFunction('forceReloadRasciState', () => {
    // Initialize RASCI state via adapters
    try {
      if (!rasciAdapterInstance || (rasciAdapterInstance.getRoles && !rasciAdapterInstance.getRoles().length)) {
        rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([]);
      }

      if (!rasciAdapterInstance || (rasciAdapterInstance.getMatrixData && !Object.keys(rasciAdapterInstance.getMatrixData()).length)) {
        rasciAdapterInstance && rasciAdapterInstance.setMatrixData && rasciAdapterInstance.setMatrixData({});
      }
    } catch (e) {
      console.warn('Error inicializando estado RASCI:', e);
    }

    // Forzar re-renderizado de la matriz
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      const roles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
      renderMatrix(rasciPanel, roles, null);
    } else {
      console.warn('⚠️ Panel RASCI no encontrado');
    }
  });

  // Ensure RASCI matrix loaded
  sr.registerFunction('ensureRasciMatrixLoaded', () => {
    console.log('🔄 Asegurando que la matriz RASCI esté cargada...');

    // Múltiples intentos de recarga con intervalos
    let attempts = 0;
    const maxAttempts = 5;

    const tryReload = () => {
      attempts++;
      console.log(`🔄 Intento ${attempts} de recarga RASCI...`);

      // Primero, verificar si detectRalphRolesFromCanvas está disponible
      const detectRalphRolesFromCanvas = sr && sr.getFunction && sr.getFunction('detectRalphRolesFromCanvas');
      if (detectRalphRolesFromCanvas) {
        console.log('✅ Función detectRalphRolesFromCanvas disponible, detectando roles...');
        try {
          const detectedRoles = detectRalphRolesFromCanvas();
          if (detectedRoles && detectedRoles.length > 0) {
            console.log(`✅ ${detectedRoles.length} roles RALph detectados:`, detectedRoles);

            // Asegurar que los roles detectados estén en el adapter
            if (!rasciAdapterInstance || (rasciAdapterInstance.getRoles && !rasciAdapterInstance.getRoles().length)) {
              rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles([...detectedRoles]);
              console.log('✅ Roles RALph agregados al adapter');
            } else {
              // Agregar roles nuevos que no estén ya
              const currentRoles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
              let added = false;
              detectedRoles.forEach(role => {
                if (!currentRoles.includes(role)) {
                  currentRoles.push(role);
                  added = true;
                }
              });
              if (added) {
                rasciAdapterInstance && rasciAdapterInstance.setRoles && rasciAdapterInstance.setRoles(currentRoles);
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
          const currentRoles = rasciAdapterInstance && rasciAdapterInstance.getRoles ? rasciAdapterInstance.getRoles() : [];
          renderMatrix(rasciPanel, currentRoles, null);
          console.log('✅ Matriz RASCI recargada exitosamente con', currentRoles.length, 'roles');

          // Forzar detección adicional si tenemos pocos roles
          if (currentRoles.length === 0) {
            const forceDetectAndSaveRoles = sr && sr.getFunction && sr.getFunction('forceDetectAndSaveRoles');
            if (forceDetectAndSaveRoles) {
              setTimeout(() => {
                forceDetectAndSaveRoles();
              }, 200);
            }
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
        const forceDetectAndSaveRoles = sr && sr.getFunction && sr.getFunction('forceDetectAndSaveRoles');
        if (forceDetectAndSaveRoles) {
          console.log('🔄 Último intento: forzando detección manual...');
          forceDetectAndSaveRoles();
        }
      }
      return false;
    };

    // Iniciar el proceso
    setTimeout(tryReload, 100);
  });
  }
}
