// Importar el sistema de comunicación centralizado
import ppiAdapter from './PPIAdapter.js';
import { getEventBus } from '../ui/core/event-bus.js';
import { getServiceRegistry } from '../ui/core/ServiceRegistry.js';

class PPIManager {
  constructor() {
    // Prevenir inicializaciones duplicadas
    if (PPIManager._instance) {
      console.warn('[PPI-Manager] Instance already exists, returning existing instance');
      return PPIManager._instance;
    }
    PPIManager._instance = this;
    
    // Inicializar sistema de comunicación
    this.eventBus = getEventBus();
    this.adapter = ppiAdapter;
    
    // Obtener clases desde ServiceRegistry
    const serviceRegistry = getServiceRegistry();
    const PPICore = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPICore') : null;
    const PPIUI = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPIUI') : null;
    
    if (process.env.NODE_ENV !== 'production') {
      console.log('[PPI-Manager] PPICore via registry:', !!PPICore);
      console.log('[PPI-Manager] PPIUI via registry:', !!PPIUI);
    }
    
    // Verificar dependencias
    if (!PPICore) {
      console.warn('PPICore no está disponible. Asegúrate de cargar ppi-core.js primero.');
      // Reintentar inicialización de PPICore cuando esté disponible
      setTimeout(() => {
        const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
        const LatePPICore = sr && sr.get ? sr.get('PPICore') : null;
        if (LatePPICore && !this.core) {
          this.core = new LatePPICore(this.adapter);
          // Si la UI ya está disponible tras core, inicializarla
          const LatePPIUI = sr && sr.get ? sr.get('PPIUI') : null;
          if (LatePPIUI && !this.ui) {
            this.ui = new LatePPIUI(this.core, this);
            if (typeof this.ui.init === 'function') {
              this.ui.init();
            }
          }
          // Con core lista, verificar PPIs existentes en canvas
          try {
            this.verifyExistingPPIsInCanvas();
          } catch (e) {
            console.warn('[PPI-Manager] Error en verificación tardía de PPIs:', e);
          }
        }
      }, 1000);
    }
    if (!PPIUI) {
      console.warn('PPIUI no está disponible. Asegúrate de cargar ppi-ui.js primero.');
      // No lanzar error, solo registrar advertencia
    }
    
    // Inicializar componentes principales solo si están disponibles
    if (PPICore) {
      this.core = new PPICore(this.adapter);
    }
    
    // Intentar inicializar UI inmediatamente o esperar a que esté disponible
    if (PPIUI && this.core) {
      this.ui = new PPIUI(this.core, this);
      console.log('[PPI-Manager] UI initialized immediately');
    } else {
      console.log('[PPI-Manager] PPIUI or PPICore not available, will retry...');
      // Retry UI initialization after a delay
      setTimeout(() => {
        const retryPPIUI = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPIUI') : null;
        if (retryPPIUI && this.core && !this.ui) {
          this.ui = new retryPPIUI(this.core, this);
          console.log('[PPI-Manager] UI initialized on retry');
        } else if (retryPPIUI && !this.core) {
          console.warn('[PPI-Manager] PPIUI available but PPICore not ready');
        }
      }, 1000);
    }
    
    this.syncManager = null;
    this.syncUI = null;
    
    // Registrar este manager en el adaptador
    if (this.adapter) {
      this.adapter.registerPPIManager(this);
    }
    
    // Inicializar de forma asíncrona para evitar problemas de timing
    setTimeout(() => {
      this.init();
    }, 0);
  }

  init() {
    this.setupCanvasDetection();
    
    // Solo inicializar UI si está disponible
    if (this.ui && typeof this.ui.init === 'function') {
      this.ui.init();
    }

    this.setupSyncManager();
  }

  // === BPMN INTEGRATION ===
  
  setupCanvasDetection() {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkModeler = () => {
      attempts++;
      
      // Intentar obtener el modelador del nuevo sistema primero
      let foundModeler = null;
      
      if (this.adapter && this.adapter.bridge) {
        foundModeler = this.adapter.getBpmnModeler();
      }
      
      // Fallback a window (compatibilidad temporal)
      if (!foundModeler && typeof window !== 'undefined') {
        const possibleModelers = ['modeler', 'bpmnModeler', 'viewer', 'bpmnViewer'];
        
        for (const name of possibleModelers) {
          if (window[name]) {
            foundModeler = window[name];
            // Register modeler through adapter instead of window
            if (this.adapter && this.adapter.bridge) {
              this.adapter.bridge.registerModeler(foundModeler);
            }
            break;
          }
        }
      }
      
      if (foundModeler || this.adapter.getBpmnModeler()) {
        // Registrar el modelador en el nuevo sistema
        if (this.adapter && this.adapter.bridge && foundModeler) {
          this.adapter.bridge.registerModeler('bpmn', foundModeler);
        }
        
        this.setupBpmnEventListeners();
        this.setupDOMObserver();
        this.setupSyncManager();
        
        // NUEVO: Configurar listener para cambios de modelador
        this.setupModelerChangeListener();
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkModeler, 1000);
      }
    };
    checkModeler();
  }

  setupModelerChangeListener() {
    const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    const eventBus = this.eventBus || (sr && sr.get ? sr.get('EventBus') : null);
    if (eventBus) {
      eventBus.subscribe('bpmn.modeler.initialized', () => this.configureEventListeners && this.configureEventListeners());
      eventBus.subscribe('bpmn.diagram.loaded', () => this.configureEventListeners && this.configureEventListeners());
      eventBus.subscribe('bpmn.modeler.changed', () => this.configureEventListeners && this.configureEventListeners());
    }
  }

  setupDOMObserver() {
 
  }

  setupSyncManager() {
    try {
      // Obtener modelador solo del adapter
      const modeler = this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null;
      if (!modeler) {
        setTimeout(() => this.setupSyncManager(), 1000);
        return;
      }

      // Asegurar que core está disponible antes de crear el SyncManager
      if (!this.core) {
        setTimeout(() => this.setupSyncManager(), 500);
        return;
      }

      // Obtener PPISyncManager desde ServiceRegistry
      const serviceRegistry = getServiceRegistry();
      const PPISyncManager = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPISyncManager') : null;

      if (!PPISyncManager) {
        this.loadSyncManagerScript();
        return;
      }

      if (!this.syncManager) {
        this.syncManager = new PPISyncManager(this);
        
        // Inicializar UI de sincronización
        this.setupSyncUI();
        
        // Inicializar estado de sincronización visual
        setTimeout(() => {
          if (this.ui && typeof this.ui.setSyncActive === 'function') {
            this.ui.setSyncActive();
          }
        }, 500);
      }
    } catch (error) {
      // Error configurando sync manager
    }
  }

  loadSyncManagerScript() {
    // Prevent multiple loading attempts
    if (typeof document === 'undefined') {
      console.warn('[PPI-Manager] Document not available, skipping script loading');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `modules/ppis/ppi-sync-manager.js?v=${Date.now()}`;
    script.onload = () => {
     
      setTimeout(() => this.setupSyncManager(), 100);
    };
    script.onerror = () => {
      // Error cargando PPISyncManager
    };
    document.head.appendChild(script);
  }

  setupSyncUI() {
    try {
      // Obtener PPISyncUI solo desde ServiceRegistry
      const serviceRegistry = getServiceRegistry();
      const PPISyncUI = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPISyncUI') : null;
      if (!PPISyncUI) {
        this.loadSyncUIScript();
        return;
      }

      if (!this.syncUI) {
        this.syncUI = new PPISyncUI(this);
      }
    } catch (error) {
      // Error configurando sync UI
    }
  }

  loadSyncUIScript() {
    // Prevent multiple loading attempts
    if (typeof document === 'undefined') {
      console.warn('[PPI-Manager] Document not available, skipping script loading');
      return;
    }
    
    if (document.querySelector('script[src="modules/ppis/ppi-sync-ui.js"]')) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `modules/ppis/ppi-sync-ui.js?v=${Date.now()}`;
    script.onload = () => {
      setTimeout(() => this.setupSyncUI(), 100);
    };
    script.onerror = () => {
      // Error cargando PPISyncUI
    };
    document.head.appendChild(script);
  }

  setupBpmnEventListeners() {
    console.log(`[PPI-Manager] Configurando event listeners BPMN`);
    try {
      // Debug: Verificar estado del adapter y bridge
      console.log(`[PPI-Manager] Adapter disponible:`, !!this.adapter);
      console.log(`[PPI-Manager] Bridge disponible:`, !!(this.adapter && this.adapter.bridge));
      
      if (this.adapter && this.adapter.bridge) {
        console.log(`[PPI-Manager] Modelers en bridge:`, Array.from(this.adapter.bridge.modelers.keys()));
        const bridgeModeler = this.adapter.bridge.getModeler('bpmn');
        console.log(`[PPI-Manager] Modeler desde bridge:`, !!bridgeModeler);
      }
      
      // MEJORADO: Obtener modelador solo del adapter
      let modeler = null;
      if (this.adapter && typeof this.adapter.getBpmnModeler === 'function') {
        modeler = this.adapter.getBpmnModeler();
        console.log(`[PPI-Manager] Modeler obtenido desde adapter:`, !!modeler);
      }
      if (!modeler) {
        console.warn(`[PPI-Manager] Modelador BPMN no disponible`);
        // MEJORADO: Programar reintento
        setTimeout(() => {
          console.log(`[PPI-Manager] Reintentando configuración de event listeners...`);
          this.setupBpmnEventListeners();
        }, 2000);
        return;
      }
      
      console.log(`[PPI-Manager] Modelador encontrado:`, !!modeler);
      
      const eventBus = modeler.get('eventBus');
      console.log(`[PPI-Manager] EventBus obtenido:`, !!eventBus);
      
      if (!eventBus) {
        console.warn(`[PPI-Manager] EventBus no disponible`);
        return;
      }
      
      // Limpiar listeners previos para evitar duplicados
      if (this._bpmnListeners) {
        console.log(`[PPI-Manager] Limpiando listeners previos`);
        this._bpmnListeners.forEach(({ event, handler }) => {
          try {
            eventBus.off(event, handler);
          } catch (error) {
            console.warn(`[PPI-Manager] Error limpiando listener ${event}:`, error);
          }
        });
      }
      this._bpmnListeners = [];
      
      // MEJORADO: Listener para eliminación de PPIs del canvas
      const removeHandler = (event) => {
        console.log('[PPI-Manager] Element removed event:', event);
        if (event.element && this.core && this.core.isPPIElement && this.core.isPPIElement(event.element)) {
          console.log('[PPI-Manager] PPINOT element removed:', event.element.id);
          this.removePPIFromList(event.element.id);
        }
      };
      eventBus.on('element.removed', removeHandler);
      this._bpmnListeners.push({ event: 'element.removed', handler: removeHandler });

      // MEJORADO: Listener para adición de PPIs al canvas
      const addHandler = (event) => {
        console.log('[PPI-Manager] Element added event:', event);
        const element = event.element;
        if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
          console.log('[PPI-Manager] PPINOT element detected:', element.id, element.type);
          const existingPPI = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
          if (!existingPPI) {
            console.log('[PPI-Manager] Creating PPI from element:', element.id);
            // MEJORADO: Usar delay más corto para respuesta más rápida
            setTimeout(() => this.createPPIFromElement(element.id), 50);
          } else {
            console.log('[PPI-Manager] PPI already exists for element:', element.id);
          }
        } else {
          console.log('[PPI-Manager] Element is not PPINOT:', element ? element.type : 'undefined');
        }
      };
      eventBus.on('element.added', addHandler);
      this._bpmnListeners.push({ event: 'element.added', handler: addHandler });
      console.log(`[PPI-Manager] ✅ Listener 'element.added' registrado exitosamente`);

      // NUEVO: Listener para creación de formas (algunas integraciones disparan shape.added en lugar de element.added)
      const shapeAddedHandler = (event) => {
        try {
          const element = event && event.element;
          if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
            const exists = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
            if (!exists) {
              setTimeout(() => this.createPPIFromElement(element.id), 10);
            }
          }
        } catch (e) {
          console.warn('[PPI-Manager] shape.added handler error:', e);
        }
      };
      eventBus.on('shape.added', shapeAddedHandler);
      this._bpmnListeners.push({ event: 'shape.added', handler: shapeAddedHandler });

      // NUEVO: Listener sobre command stack para creación (garantiza captura en todos los flujos)
      const cmdCreateHandler = (event) => {
        try {
          const context = event && event.context;
          const shape = context && (context.shape || context.element);
          if (shape && this.core && this.core.isPPIElement && this.core.isPPIElement(shape)) {
            const exists = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === shape.id);
            if (!exists) {
              setTimeout(() => this.createPPIFromElement(shape.id), 10);
            }
          }
        } catch (e) {
          console.warn('[PPI-Manager] commandStack.shape.create.executed handler error:', e);
        }
      };
      eventBus.on('commandStack.shape.create.executed', cmdCreateHandler);
      this._bpmnListeners.push({ event: 'commandStack.shape.create.executed', handler: cmdCreateHandler });

      // MEJORADO: Listener para cambios en elementos PPI del canvas
      const changeHandler = (event) => {
        console.log('📝 Element changed event:', event);
        const element = event.element;
        if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
          console.log('📝 PPI element changed:', element.id, element.businessObject && element.businessObject.name);
          this.updatePPIFromElement(element);
        }
      };
      eventBus.on('element.changed', changeHandler);
      this._bpmnListeners.push({ event: 'element.changed', handler: changeHandler });

      // MEJORADO: Listener adicional para cambios de propiedades
      const propertiesHandler = (event) => {
        console.log('📝 Properties updated event:', event);
        const element = event.context && event.context.element;
        if (element && this.core.isPPIElement && this.core.isPPIElement(element)) {
          console.log('📝 PPI properties updated:', element.id, element.businessObject && element.businessObject.name);
          setTimeout(() => this.updatePPIFromElement(element), 50);
        }
      };
      eventBus.on('commandStack.element.updateProperties.executed', propertiesHandler);
      this._bpmnListeners.push({ event: 'commandStack.element.updateProperties.executed', handler: propertiesHandler });

      // MEJORADO: Listener para cambios en el modelo
      const shapeChangeHandler = (event) => {
        console.log('📝 Shape changed event:', event);
        const element = event.element;
        
        // Detectar elementos PPI principales
        if (element && this.core.isPPIElement && this.core.isPPIElement(element)) {
          console.log('📝 PPI shape changed:', element.id, element.businessObject && element.businessObject.name);
          
          // Verificar si el PPI existe, si no, crearlo
          const existingPPI = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
          if (!existingPPI) {
            console.log('📝 Creating PPI from shape.changed:', element.id);
            // Usar un flag para evitar creación duplicada
            if (!this._creatingPPI) {
              this._creatingPPI = true;
              setTimeout(() => {
                this.createPPIFromElement(element.id);
                this._creatingPPI = false;
              }, 50);
            } else {
              console.log('📝 Skipping duplicate PPI creation for:', element.id);
            }
          } else {
            console.log('📝 Updating existing PPI from shape.changed:', element.id);
            this.updatePPIFromElement(element);
          }
        }
        
        // NUEVO: Detectar elementos Target y Scope que son hijos de PPIs
        if (element && element.parent && element.parent.type === 'PPINOT:Ppi') {
          if (element.type === 'PPINOT:Target' || element.type === 'PPINOT:Scope') {
            console.log('📝 Target/Scope changed:', element.type, element.id, 'parent:', element.parent.id);
            console.log('📝 Element name:', element.businessObject && element.businessObject.name);
            console.log('📝 Full element:', element);
            
            // Actualizar el PPI padre con la información del hijo
            setTimeout(() => {
              console.log('📝 Calling updatePPIWithChildInfo for:', element.parent.id, element.id);
              this.updatePPIWithChildInfo(element.parent.id, element.id);
              // Refrescar la UI para mostrar los cambios
              if (this.ui) {
                console.log('📝 Refreshing UI after Target/Scope update');
                this.ui.refreshPPIList();
              }
            }, 50);
          }
        }
      };
      eventBus.on('shape.changed', shapeChangeHandler);
      this._bpmnListeners.push({ event: 'shape.changed', handler: shapeChangeHandler });

      // MEJORADO: Listener para selección de elementos en el canvas
      const selectionHandler = (event) => {
        console.log(`[PPI-Manager] Selección cambiada en canvas:`, event);
        const selectedElements = event.newSelection || [];
        console.log(`[PPI-Manager] Elementos seleccionados:`, selectedElements.length);
        
        if (selectedElements.length === 1) {
          const selectedElement = selectedElements[0];
          console.log(`[PPI-Manager] Elemento seleccionado:`, selectedElement.id, selectedElement.type);
          
          // Buscar si el elemento seleccionado corresponde a un PPI
          const ppi = this.findPPIByElement(selectedElement);
          if (ppi) {
            // Marcar el PPI como seleccionado en la lista
            console.log(`[PPI-Manager] Marcando PPI como seleccionado: ${ppi.id}`);
            this.ui.selectPPI(ppi.id);
            
            // También forzar actualización del nombre al seleccionar
            console.log(`[PPI-Manager] Forzando actualización de nombre al seleccionar`);
            this.updatePPIFromElement(selectedElement);
            
            console.log(`PPI seleccionado en canvas: ${ppi.id} (${ppi.title || 'Sin título'})`);
          } else {
            // Si no es un PPI, limpiar la selección
            console.log(`[PPI-Manager] Elemento no es PPI, limpiando selección`);
            if (this.ui && typeof this.ui.clearPPISelection === 'function') {
              this.ui.clearPPISelection();
            }
          }
        } else {
          // Si no hay selección o hay múltiples elementos, limpiar la selección
          console.log(`[PPI-Manager] Múltiples elementos o sin selección, limpiando`);
          if (this.ui && typeof this.ui.clearPPISelection === 'function') {
            this.ui.clearPPISelection();
          }
        }
      };
      eventBus.on('selection.changed', selectionHandler);
      this._bpmnListeners.push({ event: 'selection.changed', handler: selectionHandler });

      // MEJORADO: Listener específico para cambios de propiedades (nombres)
      const elementChangedHandler = (event) => {
        console.log('🔄 Element changed event:', event);
        const element = event.element;
        
        if (element && element.parent && element.parent.type === 'PPINOT:Ppi') {
          if (element.type === 'PPINOT:Target' || element.type === 'PPINOT:Scope') {
            console.log('🔄 Target/Scope properties changed:', element.type, element.id);
            console.log('🔄 New name:', element.businessObject && element.businessObject.name);
            
            setTimeout(() => {
              console.log('🔄 Updating PPI from element.changed');
              this.updatePPIWithChildInfo(element.parent.id, element.id);
              if (this.ui) {
                this.ui.refreshPPIList();
              }
            }, 50);
          }
        }
      };
      eventBus.on('element.changed', elementChangedHandler);
      this._bpmnListeners.push({ event: 'element.changed', handler: elementChangedHandler });
      
      console.log(`[PPI-Manager] 🎉 Setup de event listeners completado exitosamente`);
      console.log(`[PPI-Manager] Total listeners registrados: ${this._bpmnListeners.length}`);
      
      // MEJORADO: Verificar PPIs existentes en el canvas después de configurar listeners
      this.verifyExistingPPIsInCanvas();
      
    } catch (error) {
      console.error('[PPI-Manager] Error configurando listeners BPMN:', error);
    }
  }

  // NUEVO: Método para verificar PPIs existentes en el canvas
  verifyExistingPPIsInCanvas() {
    try {
      if (!this.core) {
        console.log('[PPI-Manager] Core no disponible aún para verificación');
        return;
      }
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      if (!modeler) {
        console.log('[PPI-Manager] Modeler no disponible para verificación');
        return;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Buscar elementos PPINOT en el canvas
      const ppiElements = allElements.filter(el => 
        el.type && el.type.startsWith('PPINOT:') && 
        el.type !== 'PPINOT:Target' && 
        el.type !== 'PPINOT:Scope' && 
        el.type !== 'PPINOT:Measure' && 
        el.type !== 'PPINOT:Condition'
      );

      console.log(`[PPI-Manager] Verificación: ${ppiElements.length} elementos PPINOT encontrados en canvas`);

      // Verificar si cada elemento PPINOT tiene un PPI correspondiente
      ppiElements.forEach(element => {
        const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
        if (!existingPPI) {
          console.log(`[PPI-Manager] Elemento PPINOT sin PPI correspondiente: ${element.id}, creando PPI`);
          setTimeout(() => {
            this.createPPIFromElement(element.id);
          }, 100);
        } else {
          console.log(`[PPI-Manager] Elemento PPINOT ya tiene PPI: ${element.id} -> ${existingPPI.id}`);
        }
      });

    } catch (error) {
      console.error('[PPI-Manager] Error verificando PPIs existentes en canvas:', error);
    }
  }

  // === UTILITY METHODS ===

  /**
   * Obtiene el modelador BPMN de múltiples fuentes
   * @returns {Object|null} El modelador BPMN o null si no se encuentra
   */
  getBpmnModeler() {
    let modeler = null;
    
    // Intentar desde el adapter
    if (this.adapter) {
      modeler = this.adapter.getBpmnModeler();
      if (modeler) {
        console.log(`🔧 [getBpmnModeler] Modeler obtenido desde adapter`);
        return modeler;
      }
    }
    

    
    // Último intento: bridge
    if (this.bridge && this.bridge.getModeler) {
      modeler = this.bridge.getModeler('bpmn');
      if (modeler) {
        console.log(`🔧 [getBpmnModeler] Modeler obtenido desde bridge`);
        return modeler;
      }
    }
    
    console.warn(`🔧 [getBpmnModeler] No se pudo obtener el modelador desde ninguna fuente`);
    return null;
  }

  // === PPI ELEMENT DETECTION ===

  /**
   * Busca un PPI por su elemento del canvas
   * @param {Object} element - Elemento del canvas BPMN
   * @returns {Object|null} PPI encontrado o null
   */
  findPPIByElement(element) {
    if (!element) return null;
    
    console.log(`[PPI-Manager] Buscando PPI para elemento:`, element.id, element.type);
    
    try {
      // Buscar por elementId
      let ppi = this.core.ppis.find(p => p.elementId === element.id);
      if (ppi) {
        console.log(`[PPI-Manager] PPI encontrado por elementId:`, ppi.id, ppi.title);
        return ppi;
      }
      
      // Buscar por nombre del elemento
      if (element.businessObject && element.businessObject.name) {
        ppi = this.core.ppis.find(p => p.title === element.businessObject.name);
        if (ppi) {
          console.log(`[PPI-Manager] PPI encontrado por nombre:`, ppi.id, ppi.title);
          return ppi;
        }
      }
      
      // Buscar en el elemento padre si no se encuentra directamente
      if (element.parent) {
        const parentElement = element.parent;
        console.log(`[PPI-Manager] Buscando en elemento padre:`, parentElement.id, parentElement.type);
        
        // Buscar por elementId del padre
        ppi = this.core.ppis.find(p => p.elementId === parentElement.id);
        if (ppi) {
          console.log(`[PPI-Manager] PPI encontrado por elementId del padre:`, ppi.id, ppi.title);
          return ppi;
        }
        
        // También buscar por nombre del padre
        if (parentElement.businessObject && parentElement.businessObject.name) {
          ppi = this.core.ppis.find(p => p.title === parentElement.businessObject.name);
          if (ppi) {
            console.log(`[PPI-Manager] PPI encontrado por nombre del padre:`, ppi.id, ppi.title);
            return ppi;
          }
        }
      }
      
      console.log(`[PPI-Manager] No se encontró PPI para elemento:`, element.id);
    } catch (error) {
      console.error('Error finding PPI by element:', error);
    }
    
    return null;
  }

  // === SCOPE AND TARGET SPECIFIC HANDLING ===

  clearPPIChildInfo(element, specificParentId = null) {
    try {
      const elementType = element.type;
      
      // Use the core method to clear child info
      const clearedCount = this.core.clearPPIChildInfo(elementType, specificParentId);
      
      if (clearedCount > 0) {
        this.ui.refreshPPIList();
        this.core.debouncedSavePPINOTElements();
      }
      
    } catch (error) {
      // Error limpiando información de hijo PPI
    }
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    try {
      console.log(`🔧 [updatePPIWithChildInfo] Iniciando actualización:`, { parentPPIId, childElementId });
      
      // Obtener modelador usando la función de utilidad
      const modeler = this.getBpmnModeler();
      
      if (!modeler) {
        console.warn('🔧 [updatePPIWithChildInfo] No hay modelador disponible');
        return;
      }
      
      const elementRegistry = modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        console.warn(`🔧 [updatePPIWithChildInfo] Elemento hijo ${childElementId} no encontrado`);
        return;
      }
      
      console.log(`🔧 [updatePPIWithChildInfo] Elemento hijo encontrado:`, {
        id: childElement.id,
        type: childElement.type,
        name: childElement.businessObject && childElement.businessObject.name,
        parent: childElement.parent && childElement.parent.id
      });
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
        console.warn(`🔧 [updatePPIWithChildInfo] PPI padre ${parentPPIId} no encontrado`);
        console.log(`🔧 [updatePPIWithChildInfo] PPIs disponibles:`, this.core.ppis.map(p => ({ id: p.id, elementId: p.elementId })));
        return;
      }
      
      console.log(`🔧 [updatePPIWithChildInfo] PPI padre encontrado:`, {
        id: existingPPI.id,
        title: existingPPI.title,
        currentTarget: existingPPI.target,
        currentScope: existingPPI.scope
      });
      
      // Extraer información basada en el tipo de elemento
      let updatedData = { updatedAt: new Date().toISOString() };
      
      if (childElement.type === 'PPINOT:Target') {
        const targetName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.target = targetName;
        console.log(`🎯 [updatePPIWithChildInfo] Actualizando Target: ${targetName}`);
      } else if (childElement.type === 'PPINOT:Scope') {
        const scopeName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.scope = scopeName;
        console.log(`🔍 [updatePPIWithChildInfo] Actualizando Scope: ${scopeName}`);
      } else if (childElement.type === 'PPINOT:Measure') {
        const measureName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.measureDefinition = {
          type: this.core.detectMeasureType(childElementId, childElement.type),
          definition: measureName
        };
        console.log(`📏 [updatePPIWithChildInfo] Actualizando Measure: ${measureName}`);
      } else if (childElement.type === 'PPINOT:Condition') {
        const conditionName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.businessObjective = conditionName;
        console.log(`⚖️ [updatePPIWithChildInfo] Actualizando Condition: ${conditionName}`);
      }
      
      console.log(`🔧 [updatePPIWithChildInfo] Datos a actualizar:`, updatedData);
      
      if (this.core.updatePPI(existingPPI.id, updatedData)) {
        console.log(`✅ [updatePPIWithChildInfo] PPI actualizado exitosamente`);
        this.ui.refreshPPIList();
        this.core.debouncedSavePPINOTElements();
      } else {
        console.error(`❌ [updatePPIWithChildInfo] Error actualizando PPI`);
      }
      
    } catch (error) {
      console.error(`💥 [updatePPIWithChildInfo] Error:`, error);
    }
  }



  createPPIFromElement(elementId) {
    console.log('[PPI-Manager] createPPIFromElement called with:', elementId);
    try {
      let elementName = elementId;
      
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      
      if (modeler) {
        const elementRegistry = modeler.get('elementRegistry');
        const element = elementRegistry.get(elementId);
        
        if (element && element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
          elementName = element.businessObject.name.trim();
          console.log('[PPI-Manager] Using element name:', elementName);
        } else {
          console.log('[PPI-Manager] Using elementId as name:', elementId);
        }
      }
      
      const ppi = {
        id: this.core.generatePPIId(),
        title: elementName,
        process: 'Proceso General',
        businessObjective: '',
        measureDefinition: { type: 'derived', definition: '' },
        target: '',
        scope: '',
        source: '',
        responsible: '',
        informed: [],
        comments: `PPI generado automáticamente desde elemento: ${elementId}`,
        elementId: elementId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      console.log('[PPI-Manager] Created PPI object:', ppi);
      
      this.core.addPPI(ppi);
      console.log('[PPI-Manager] PPI added to core');
      
      if (this.ui && this.ui.showSuccessMessage) {
        this.ui.showSuccessMessage(`PPI creado: ${elementName}`);
      }
      
      // Asegurar que la UI está disponible y el DOM está listo
      const attemptRefresh = (retryCount = 0) => {
        if (this.ui && this.ui.refreshPPIList) {
          // Verificar que el contenedor DOM existe antes de refrescar
          const ppiListContainer = document.getElementById('ppi-list');
          if (ppiListContainer) {
            this.ui.refreshPPIList();
            console.log('[PPI-Manager] UI refreshed successfully');
          } else if (retryCount < 5) {
            console.log(`[PPI-Manager] ppi-list container not ready, retrying... (${retryCount + 1}/5)`);
            setTimeout(() => attemptRefresh(retryCount + 1), 200);
          } else {
            console.warn('[PPI-Manager] ppi-list container not available after retries');
          }
        } else if (retryCount < 5) {
          console.log(`[PPI-Manager] UI not available, retrying... (${retryCount + 1}/5)`);
          setTimeout(() => attemptRefresh(retryCount + 1), 200);
        } else {
          console.warn('[PPI-Manager] UI not available for refresh after retries');
        }
      };
      
      attemptRefresh();
      
      // Guardar elementos PPINOT después de crear
      if (this.core.debouncedSavePPINOTElements) {
        this.core.debouncedSavePPINOTElements();
      }
      
      console.log('[PPI-Manager] PPI creation completed successfully');
    } catch (error) {
      console.error('[PPI-Manager] Error creando PPI:', error);
    }
  }

  updatePPIFromElement(element) {
    console.log('📝 UpdatePPIFromElement called with:', element);
    try {
      const elementId = element.id;
      console.log('📝 Element ID:', elementId);
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === elementId);
      console.log('📝 Existing PPI found:', existingPPI);
      
      if (!existingPPI) {
        console.log('📝 No existing PPI found for element');
        return;
      }
      
      let newTitle = '';
      if (element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
        newTitle = element.businessObject.name.trim();
      } else if (element.businessObject && element.businessObject.id) {
        newTitle = element.businessObject.id; // Use ID as fallback
      }
      
      console.log('📝 Current PPI title:', existingPPI.title);
      console.log('📝 New title from element:', newTitle);
      
      // Always update if we have a new title, be more aggressive
      if (newTitle) {
        // Force update even if titles appear to be the same (might have whitespace differences)
        const titleChanged = newTitle.trim() !== (existingPPI.title || '').trim();
        
        if (titleChanged || !existingPPI.title) {
          console.log('📝 Updating PPI title from', existingPPI.title, 'to', newTitle);
          
          const updatedData = {
            title: newTitle,
            updatedAt: new Date().toISOString()
          };
          
          if (this.core.updatePPI(existingPPI.id, updatedData)) {
            console.log('📝 PPI updated successfully in core');
            
            // Force immediate DOM update
            this.updatePPIElementInDOM(existingPPI.id, updatedData);
            
            // Force UI refresh with multiple attempts
            setTimeout(() => {
              console.log('📝 Forcing UI refresh attempt 1...');
              this.ui.refreshPPIList();
            }, 10);
            
            setTimeout(() => {
              console.log('📝 Forcing UI refresh attempt 2...');
              this.ui.refreshPPIList();
            }, 100);
            
            // Also try to update the card directly
            setTimeout(() => {
              console.log('📝 Direct card update attempt...');
              const cardElement = document.querySelector(`[data-ppi-id="${existingPPI.id}"] .ppi-title`);
              if (cardElement) {
                cardElement.textContent = newTitle;
                console.log('📝 Card title updated directly');
              }
            }, 50);
            
          } else {
            console.log('📝 Failed to update PPI in core');
          }
        } else {
          console.log('📝 No title change detected');
        }
      } else {
        console.log('📝 No valid title found');
      }
    } catch (error) {
      console.error('📝 Error updating PPI from element:', error);
    }
  }

  updatePPIElementInDOM(ppiId, updatedData) {
    try {
      const ppiElement = document.querySelector(`[data-ppi-id="${ppiId}"]`);
      if (!ppiElement) return;

      if (updatedData.title) {
        const titleElement = ppiElement.querySelector('.card-title');
        if (titleElement) {
          titleElement.textContent = updatedData.title;
          titleElement.setAttribute('title', updatedData.title);
        }
      }
    } catch (error) {
      // Error actualizando DOM
    }
  }

  // === PUBLIC API METHODS ===
  
  // UI Methods
  showCreatePPIModal() {
    this.ui.showCreatePPIModal();
  }

  viewPPI(ppiId) {
    const ppi = this.core.getPPI(ppiId);
    if (!ppi) return;
    this.ui.showDetailModal(ppi);
  }

  editPPI(ppiId) {
    const ppi = this.core.getPPI(ppiId);
    if (!ppi) return;
    this.ui.showEditModal(ppi);
  }

  confirmDeletePPI(ppiId) {
    if (confirm('¿Estás seguro de que quieres eliminar este PPI?')) {
      if (this.core.deletePPI(ppiId)) {
        this.ui.showSuccessMessage('PPI eliminado exitosamente');
        this.ui.refreshPPIList();
      }
    }
  }

  removePPIFromList(ppiId) {
    try {
      // Buscar el PPI por elementId
      const ppi = this.core.ppis.find(ppi => ppi.elementId === ppiId);
      if (ppi) {
        // Usar la función deletePPI del core que también elimina del canvas
        if (this.core.deletePPI(ppi.id)) {
          // Refresh the UI
          this.ui.refreshPPIList();
          this.ui.showSuccessMessage(`PPI eliminado: ${ppi.title || ppiId}`);
        }
      } else {
        // Buscar por ID directo como fallback
        const ppiById = this.core.ppis.find(ppi => ppi.id === ppiId);
        if (ppiById) {
          if (this.core.deletePPI(ppiById.id)) {
            this.ui.refreshPPIList();
            this.ui.showSuccessMessage(`PPI eliminado: ${ppiById.title || ppiId}`);
          }
        }
      }
    } catch (error) {
      // Error removiendo PPI de la lista
    }
  }

  saveEditedPPI(ppiId) {
    const form = document.getElementById('edit-ppi-form');
    if (!form) return;

    // Capturar todos los campos del formulario manualmente para asegurar que se incluyan todos
    const ppiData = {};
    
    // Campos de la pestaña General
    const titleEl = form.querySelector('[name="title"]');
    ppiData.title = titleEl ? titleEl.value : '';
    const processEl = form.querySelector('[name="process"]');
    ppiData.process = processEl ? processEl.value : '';
    const businessObjectiveEl = form.querySelector('[name="businessObjective"]');
    ppiData.businessObjective = businessObjectiveEl ? businessObjectiveEl.value : '';
    
    // Campos de la pestaña Measurement
    const measureTypeEl = form.querySelector('[name="measureType"]');
    ppiData.measureType = measureTypeEl ? measureTypeEl.value : '';
    const measureDefinitionEl = form.querySelector('[name="measureDefinition"]');
    ppiData.measureDefinition = measureDefinitionEl ? measureDefinitionEl.value : '';
    const sourceEl = form.querySelector('[name="source"]');
    ppiData.source = sourceEl ? sourceEl.value : '';
    
    // Campos de la pestaña Targets (¡ESTOS SON LOS IMPORTANTES!)
    const targetEl = form.querySelector('[name="target"]');
    ppiData.target = targetEl ? targetEl.value : '';
    const scopeEl = form.querySelector('[name="scope"]');
    ppiData.scope = scopeEl ? scopeEl.value : '';
    
    // Campos de la pestaña Responsibilities
    const responsibleEl = form.querySelector('[name="responsible"]');
    ppiData.responsible = responsibleEl ? responsibleEl.value : '';
    const informedEl = form.querySelector('[name="informed"]');
    ppiData.informed = informedEl ? informedEl.value : '';
    const commentsEl = form.querySelector('[name="comments"]');
    ppiData.comments = commentsEl ? commentsEl.value : '';
    
    // Debug: Mostrar todos los campos capturados
    console.log('🔍 [saveEditedPPI] Captured form fields:');
    for (let [key, value] of Object.entries(ppiData)) {
      console.log(`   ${key}: ${value}`);
    }
    
    // Procesar los datos usando el método del core
    const processedData = this.core.parseFormData(new Map(Object.entries(ppiData)));
    
    console.log('💾 [saveEditedPPI] Processed PPI data:', processedData);
    
    if (ppiId) {
      // Update existing PPI
      if (this.core.updatePPI(ppiId, processedData)) {
        // Sync changes back to canvas elements (Target/Scope)
        this.syncPPIChangesToCanvas(ppiId, processedData);
        
        document.getElementById('ppi-modal').remove();
        this.ui.showSuccessMessage('PPI actualizado exitosamente');
        this.ui.refreshPPIList();
      } else {
        this.ui.showMessage('Error al actualizar el PPI', 'error');
      }
    } else {
      // Create new PPI
      const ppi = this.core.createPPI(processedData);
      this.core.addPPI(ppi);
      document.getElementById('ppi-modal').remove();
      this.ui.showSuccessMessage('PPI creado exitosamente');
      this.ui.refreshPPIList();
    }
  }

  /**
   * Sync PPI changes back to canvas Target/Scope elements
   */
  syncPPIChangesToCanvas(ppiId, ppiData) {
    try {
      console.log('🔄 [syncPPIChangesToCanvas] Syncing changes to canvas for PPI:', ppiId);
      
      const ppi = this.core.ppis.find(p => p.id === ppiId);
      if (!ppi || !ppi.elementId) {
        console.log('❌ [syncPPIChangesToCanvas] PPI or elementId not found');
        return;
      }

      const modeler = this.getBpmnModeler();
      if (!modeler) {
        console.log('❌ [syncPPIChangesToCanvas] No modeler available');
        return;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const eventBus = modeler.get('eventBus');
      
      // Find the PPI parent element
      const ppiElement = elementRegistry.get(ppi.elementId);
      if (!ppiElement) {
        console.log('❌ [syncPPIChangesToCanvas] PPI element not found in canvas');
        return;
      }

      // Find Target and Scope children
      const allElements = elementRegistry.getAll();
      const targetElements = allElements.filter(el => 
        el.type === 'PPINOT:Target' && el.parent && el.parent.id === ppi.elementId
      );
      const scopeElements = allElements.filter(el => 
        el.type === 'PPINOT:Scope' && el.parent && el.parent.id === ppi.elementId
      );

      console.log(`🎯 [syncPPIChangesToCanvas] Found ${targetElements.length} Target elements`);
      console.log(`🔍 [syncPPIChangesToCanvas] Found ${scopeElements.length} Scope elements`);

      // Helper function to safely update element and trigger visual refresh
      const safeUpdateElement = (element, newName, elementType) => {
        try {
          console.log(`🔄 [syncPPIChangesToCanvas] Updating ${elementType} ${element.id} with: ${newName}`);
          
          // Update the business object name directly
          if (element.businessObject) {
            element.businessObject.name = newName;
            console.log(`🔄 [syncPPIChangesToCanvas] Updated businessObject.name to: ${element.businessObject.name}`);
          }
          
          // Update properties using modeling service
          modeling.updateProperties(element, {
            name: newName
          });
          
          // Safely trigger visual updates with error handling
          try {
            eventBus.fire('element.changed', { element: element });
          } catch (eventError) {
            console.warn(`⚠️ [syncPPIChangesToCanvas] Error firing element.changed for ${elementType}:`, eventError);
          }
          
          try {
            eventBus.fire('shape.changed', { element: element });
          } catch (eventError) {
            console.warn(`⚠️ [syncPPIChangesToCanvas] Error firing shape.changed for ${elementType}:`, eventError);
          }
          
          // Delayed re-render with error handling
          setTimeout(() => {
            try {
              eventBus.fire('element.changed', { element: element });
              console.log(`✅ [syncPPIChangesToCanvas] Re-render completed for ${elementType} ${element.id}`);
            } catch (eventError) {
              console.warn(`⚠️ [syncPPIChangesToCanvas] Error in delayed re-render for ${elementType}:`, eventError);
            }
          }, 100);
          
        } catch (updateError) {
          console.error(`💥 [syncPPIChangesToCanvas] Error updating ${elementType} ${element.id}:`, updateError);
        }
      };

      // Update Target elements
      if (ppiData.target && targetElements.length > 0) {
        console.log(`🎯 [syncPPIChangesToCanvas] Updating ${targetElements.length} Target elements with: ${ppiData.target}`);
        targetElements.forEach(targetEl => {
          safeUpdateElement(targetEl, ppiData.target, 'Target');
        });
      } else {
        console.log(`⚠️ [syncPPIChangesToCanvas] No Target update: ppiData.target=${ppiData.target}, targetElements.length=${targetElements.length}`);
      }

      // Update Scope elements
      if (ppiData.scope && scopeElements.length > 0) {
        console.log(`🔍 [syncPPIChangesToCanvas] Updating ${scopeElements.length} Scope elements with: ${ppiData.scope}`);
        scopeElements.forEach(scopeEl => {
          safeUpdateElement(scopeEl, ppiData.scope, 'Scope');
        });
      } else {
        console.log(`⚠️ [syncPPIChangesToCanvas] No Scope update: ppiData.scope=${ppiData.scope}, scopeElements.length=${scopeElements.length}`);
        console.log(`⚠️ [syncPPIChangesToCanvas] ppiData:`, ppiData);
        console.log(`⚠️ [syncPPIChangesToCanvas] scopeElements:`, scopeElements);
      }

      // Update PPI title if provided
      if (ppiData.title && ppiElement) {
        console.log(`📝 [syncPPIChangesToCanvas] Updating PPI title to: ${ppiData.title}`);
        safeUpdateElement(ppiElement, ppiData.title, 'PPI');
      }

      console.log('✅ [syncPPIChangesToCanvas] Canvas sync completed');
      
    } catch (error) {
      console.error('💥 [syncPPIChangesToCanvas] Error:', error);
    }
  }

  /**
   * Get existing Target/Scope elements for a PPI when editing
   */
  getExistingTargetScopeElements(ppiElementId) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return { targets: [], scopes: [] };

      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const targets = allElements.filter(el => 
        el.type === 'PPINOT:Target' && el.parent && el.parent.id === ppiElementId
      );
      
      const scopes = allElements.filter(el => 
        el.type === 'PPINOT:Scope' && el.parent && el.parent.id === ppiElementId
      );

      console.log(`📋 [getExistingTargetScopeElements] Found ${targets.length} targets, ${scopes.length} scopes for PPI ${ppiElementId}`);
      
      return { targets, scopes };
      
    } catch (error) {
      console.error('💥 [getExistingTargetScopeElements] Error:', error);
      return { targets: [], scopes: [] };
    }
  }

  // Core Methods
  exportPPIsToFile() {
    if (this.core.exportPPIsToFile()) {
      this.ui.showSuccessMessage('PPIs exportados exitosamente');
    } else {
      this.ui.showMessage('Error al exportar PPIs', 'error');
    }
  }

  refreshPPIList() {
    console.log('[PPI-Manager] refreshPPIList called');
    console.log('[PPI-Manager] this.ui:', this.ui);
    
    const attemptRefresh = (retryCount = 0) => {
      if (this.ui && typeof this.ui.refreshPPIList === 'function') {
        // Verificar que el contenedor DOM existe
        const ppiListContainer = document.getElementById('ppi-list');
        if (ppiListContainer) {
          console.log('[PPI-Manager] Calling ui.refreshPPIList()');
          this.ui.refreshPPIList();
        } else if (retryCount < 3) {
          console.log(`[PPI-Manager] ppi-list container not ready, retrying... (${retryCount + 1}/3)`);
          setTimeout(() => attemptRefresh(retryCount + 1), 200);
        } else {
          console.warn('[PPI-Manager] ppi-list container not available after retries');
        }
      } else if (retryCount < 3) {
        console.log(`[PPI-Manager] UI not available, retrying... (${retryCount + 1}/3)`);
        setTimeout(() => attemptRefresh(retryCount + 1), 200);
      } else {
        console.warn('[PPI-Manager] UI not available for refreshPPIList after retries');
      }
    };
    
    attemptRefresh();
  }

  filterPPIs() {
    this.ui.filterPPIs();
  }



  // Compatibility Methods
  getAllPPIs() {
    return this.core.getAllPPIs();
  }

  getPPIsForElement(elementId) {
    // Check both old structure (elementId) and new structure (bpmnLink)
    return this.core.ppis.filter(ppi => {
      // Old structure: direct elementId
      if (ppi.elementId === elementId) {
        return true;
      }
      
      // New structure: bpmnLink object
      if (ppi.bpmnLink && ppi.bpmnLink[elementId]) {
        return true;
      }
      
      return false;
    });
  }

  setupFileUpload() {
    // Función de compatibilidad
  }

  setupEventListeners() {
    // Setup event listeners for the PPI panel
    try {
      // Add event listeners for search functionality
      const searchInput = document.getElementById('ppi-search');
      if (searchInput) {
        searchInput.addEventListener('input', () => this.filterPPIs());
      }
      
      // Add event listeners for filter dropdowns
      const typeFilter = document.getElementById('type-filter');
      if (typeFilter) {
        typeFilter.addEventListener('change', () => this.filterPPIs());
      }
      
      const statusFilter = document.getElementById('status-filter');
      if (statusFilter) {
        statusFilter.addEventListener('change', () => this.filterPPIs());
      }
      

    } catch (error) {
      // Error setting up PPI event listeners
    }
  }


  // === PPINOT RESTORATION ===
  
  restorePPINOTElements() {
    try {
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      
      if (!modeler) {
        setTimeout(() => this.restorePPINOTElements(), 1000);
        return;
      }

      // Restaurar elementos (esto ya incluye cargar relaciones desde XML)
      const restored = this.core.restorePPINOTElements();
      if (restored) {
        // Elementos PPINOT restaurados exitosamente
      }
    } catch (error) {
      // Error restaurando elementos PPINOT
    }
  }

  // === DEBUG FUNCTIONS ===
  
  // Función global para debugging del estado PPINOT


  // === SYNC MANAGER METHODS ===
  
  getSyncStatus() {
    if (this.syncManager) {
      return this.syncManager.getSyncStatus();
    }
    return {
      isSyncing: false,
      lastSyncTime: 0,
      pendingChanges: 0,
      queueLength: 0,
      elementCacheSize: 0,
      relationshipCacheSize: 0,
      syncManagerAvailable: false
    };
  }

  enableAutoSync() {
    if (this.syncManager) {
      this.syncManager.enableAutoSync();
    }
  }

  disableAutoSync() {
    if (this.syncManager) {
      this.syncManager.disableAutoSync();
    }
  }

  forceSync() {
    if (this.syncManager) {
      this.syncManager.performSmartSync();
    } else {
      this.refreshPPINOTRelationships();
    }
  }

  // NUEVO: Forzar verificación de cambios de padre
  forceCheckParentChanges() {
    if (this.syncManager) {
      this.syncManager.forceCheckParentChanges();
    }
  }

  // NUEVO: Sincronización rápida de padres
  forceQuickParentSync() {
    if (this.syncManager) {
      this.syncManager.forceQuickParentSync();
    }
  }

  // NUEVO: Verificar elementos huérfanos
  forceCheckOrphanedElements() {
    if (this.syncManager) {
      this.syncManager.checkOrphanedElements();
    }
  }

  // Función global para forzar restauración completa
  forceRestorePPINOTElements() {
    // Limpiar elementos procesados para permitir reprocesamiento
    this.core.processedElements.clear();
    
    // Cargar elementos PPINOT nuevamente
    this.core.loadPPINOTElements();
    
    // Restaurar elementos
    this.restorePPINOTElements();
  }



  // Función global para cargar relaciones desde XML
  loadPPINOTRelationshipsFromXML() {
    return this.core.loadPPINOTRelationshipsFromXML();
  }

  // === MEMORY MANAGEMENT ===
  
  cleanupOldData() {
    this.core.cleanupOldData();
  }

  enableAutoSave() {
    this.core.enableAutoSave();
  }

  disableAutoSave() {
    this.core.disableAutoSave();
  }

  isAutoSaveEnabled() {
    return this.core.isAutoSaveEnabled();
  }
  
  // Force save PPINOT elements immediately
  forceSavePPINOTElements() {
    this.core.forceSavePPINOTElements();
  }

  // BPMN Integration Methods
  savePPIs() {
    this.core.savePPIs();
  }

  linkToBpmnElement(ppiId, elementId, linkType = 'direct') {
    const ppi = this.core.getPPI(ppiId);
    if (!ppi) {
      return false;
    }

    // Initialize bpmnLink if it doesn't exist
    if (!ppi.bpmnLink) {
      ppi.bpmnLink = {};
    }

    // Add the link
    ppi.bpmnLink[elementId] = {
      type: linkType,
      linkedAt: new Date().toISOString(),
      elementId: elementId
    };

    // Save changes
    this.core.savePPIs();
    return true;
  }

  cleanupBpmnLinks(elementId) {
    let updated = false;
    
    this.core.ppis.forEach(ppi => {
      if (ppi.bpmnLink && ppi.bpmnLink[elementId]) {
        delete ppi.bpmnLink[elementId];
        updated = true;
      }
    });

    if (updated) {
      this.core.savePPIs();
    }
  }

  exportPPIs() {
    return this.core.ppis;
  }

  // UI Message Methods
  showSuccessMessage(message) {
    this.ui.showSuccessMessage(message);
  }

  showMessage(message, type) {
    this.ui.showMessage(message, type);
  }

  // Properties for BPMN Integration
  get ppis() {
    return this.core.ppis;
  }

  get measureTypes() {
    return {
      'PPINOT:BaseMeasure': 'Base Measure',
      'PPINOT:TimeMeasure': 'Time Measure',
      'PPINOT:CountMeasure': 'Count Measure',
      'PPINOT:DataMeasure': 'Data Measure',
      'PPINOT:CyclicTimeMeasure': 'Cyclic Time Measure',
      'PPINOT:DataPropertyConditionMeasure': 'Data Property Condition Measure',
      'PPINOT:StateConditionMeasure': 'State Condition Measure',
      'PPINOT:DerivedSingleInstanceMeasure': 'Derived Single Instance Measure',
      'PPINOT:DerivedMultiInstanceMeasure': 'Derived Multi Instance Measure',
      'PPINOT:AggregatedMeasure': 'Aggregated Measure',
      'PPINOT:TimeAggregatedMeasure': 'Time Aggregated Measure',
      'PPINOT:CyclicTimeAggregatedMeasure': 'Cyclic Time Aggregated Measure',
      'PPINOT:CountAggregatedMeasure': 'Count Aggregated Measure',
      'PPINOT:DataAggregatedMeasure': 'Data Aggregated Measure',
      'PPINOT:DataPropertyConditionAggregatedMeasure': 'Data Property Condition Aggregated Measure',
      'PPINOT:StateConditionAggregatedMeasure': 'State Condition Aggregated Measure'
    };
  }

  // === MANUAL REFRESH FUNCTION ===
  
  refreshPPINOTRelationships() {
    try {
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      
      if (!modeler) {
        this.ui.showMessage('Modeler no disponible', 'warning');
        return;
      }

      // Usar el nuevo sistema de sincronización si está disponible
      if (this.syncManager) {
        this.syncManager.forceSync();
        this.ui.showSuccessMessage('Sincronización completada con el nuevo sistema');
        return;
      }

      // Fallback al método anterior
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Limpiar todos los PPIs existentes
      this.core.ppis.length = 0;
      this.core.processedElements.clear();
      
      // Buscar todos los PPIs principales
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      // Crear PPIs para cada elemento encontrado
      ppiElements.forEach(element => {
        this.createPPIFromElement(element.id);
      });
      
      // Buscar todos los elementos hijos de PPI
      const ppiChildren = allElements.filter(element => 
        element.parent && 
        element.parent.type === 'PPINOT:Ppi' &&
        (element.type === 'PPINOT:Scope' || 
         element.type === 'PPINOT:Target' ||
         element.type === 'PPINOT:Measure' ||
         element.type === 'PPINOT:Condition')
      );
      
      // Actualizar cada PPI con sus hijos
      ppiChildren.forEach(element => {
        if (element.parent && element.parent.id) {
          this.updatePPIWithChildInfo(element.parent.id, element.id);
        }
      });
      
      // Guardar el estado actual
      this.core.forceSavePPINOTElements();
      
      // Actualizar la UI
      this.ui.refreshPPIList();
      
      this.ui.showSuccessMessage(`Refresco completado: ${ppiElements.length} PPIs, ${ppiChildren.length} elementos hijos`);
      
    } catch (error) {
      this.ui.showMessage('Error en refresco: ' + error.message, 'error');
    }
  }

  // === CANVAS REFRESH AND DEBUGGING ===
  
  forceCanvasRefresh() {
    try {
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      
      if (!modeler) return;
      
      const elementRegistry = modeler.get('elementRegistry');
      
      // Force refresh all scope and target elements
      const scopeTargetElements = elementRegistry.getAll().filter(element => 
        element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target'
      );
      
      scopeTargetElements.forEach(element => {
        try {
          // Force re-render by triggering a change event
          const eventBus = modeler.get('eventBus');
          eventBus.fire('element.changed', { element: element });
        } catch (error) {
          // Error refrescando elemento
        }
      });
      
    } catch (error) {
      // Error forzando refresh de canvas
    }
  }

  /**
   * Selecciona un PPI en el canvas BPMN
   * @param {string} ppiId - ID del PPI a seleccionar
   */
  selectPPIInCanvas(ppiId) {
    try {
      const ppi = this.core.ppis.find(p => p.id === ppiId);
      if (!ppi || !ppi.elementId) {
        console.warn(`No se encontró elemento en canvas para PPI: ${ppiId}`);
        return;
      }

      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = (this.adapter && this.adapter.getBpmnModeler ? this.adapter.getBpmnModeler() : null) || (getServiceRegistry && getServiceRegistry().get ? getServiceRegistry().get('BpmnModeler') : null);
      
      if (!modeler) {
        console.warn('Modeler no disponible para selección');
        return;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const selection = modeler.get('selection');
      
      const element = elementRegistry.get(ppi.elementId);
      if (element) {
        // Seleccionar el elemento en el canvas
        selection.select(element);
        
        // Hacer zoom hacia el elemento si está disponible
        try {
          const canvas = modeler.get('canvas');
          if (canvas && typeof canvas.zoom === 'function') {
            canvas.zoom('fit-viewport', element);
          }
        } catch (zoomError) {
          // Si el zoom falla, al menos intentar scrollTo
          try {
            const canvas = modeler.get('canvas');
            if (canvas && typeof canvas.scrollToElement === 'function') {
              canvas.scrollToElement(element);
            }
          } catch (scrollError) {
            console.log('Zoom/scroll no disponible, pero elemento seleccionado');
          }
        }
        
        console.log(`Elemento seleccionado en canvas: ${ppi.elementId} (PPI: ${ppiId})`);
      } else {
        console.warn(`Elemento no encontrado en canvas: ${ppi.elementId}`);
      }
    } catch (error) {
      console.error('Error seleccionando PPI en canvas:', error);
    }
  }
}



// Inicialización automática comentada - se inicializa desde index.js

// Registrar en ServiceRegistry
const registry = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
if (registry) {
  registry.register('PPIManager', PPIManager, {
    description: 'Gestor de PPIs'
  });
  if (process.env.NODE_ENV !== 'production') {
    try {
      // Exponer para debug solo en desarrollo
      if (typeof window !== 'undefined') {
        window.__debug = { ...(window.__debug || {}), PPIManager };
      }
    } catch (e) {
      // Ignorar errores de entorno
    }
  }
  console.log('✅ PPIManager registrado en ServiceRegistry');
} else {
  console.log('ℹ️ ServiceRegistry no disponible para PPIManager');
}

 