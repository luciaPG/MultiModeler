/**
 * PPI Manager - Manages Process Performance Indicators and their integration with BPMN canvas
 */
import ppiAdapter from './PPIAdapter.js';
import { getEventBus } from '../ui/core/event-bus.js';
import { getServiceRegistry } from '../ui/core/ServiceRegistry.js';

class PPIManager {
  constructor() {
    if (PPIManager._instance) {
      return PPIManager._instance;
    }
    PPIManager._instance = this;
    
    this._deletingPPIIds = new Set();
    this._deletingElementIds = new Set();
    this._isDeleting = false;
    this._recentlyDeletedElements = new Map();
    this._creationCooldownMs = 1500;
    
    // Circuit breaker para evitar spam de refreshPPIList
    this._refreshAttempts = 0;
    this._refreshMaxAttempts = 10;
    this._refreshCircuitOpen = false;
    this._refreshCircuitResetTime = 10000; // 10 segundos
    this._lastRefreshTime = 0;
    this._refreshDebounceMs = 100;
    this.eventBus = getEventBus();
    this.adapter = ppiAdapter;
    
    const serviceRegistry = getServiceRegistry();
    const PPICore = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPICore') : null;
    const PPIUI = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPIUI') : null;
    if (!PPICore) {
      setTimeout(() => {
        const sr = getServiceRegistry();
        const LatePPICore = sr && sr.get ? sr.get('PPICore') : null;
        if (LatePPICore && !this.core) {
          this.core = new LatePPICore(this.adapter);
          const LatePPIUI = sr && sr.get ? sr.get('PPIUI') : null;
          if (LatePPIUI && !this.ui) {
            this.ui = new LatePPIUI(this.core, this);
            if (typeof this.ui.init === 'function') {
              this.ui.init();
            }
          }
          try {
            this.verifyExistingPPIsInCanvas();
          } catch (e) {
            console.warn('[PPI-Manager] Error en verificación tardía de PPIs:', e);
          }
        }
      }, 1000);
    }
    if (PPICore) {
      this.core = new PPICore(this.adapter);
    }
    
    if (PPIUI && this.core) {
      this.ui = new PPIUI(this.core, this);
    } else {
      setTimeout(() => {
        const retryPPIUI = serviceRegistry && serviceRegistry.get ? serviceRegistry.get('PPIUI') : null;
        if (retryPPIUI && this.core && !this.ui) {
          this.ui = new retryPPIUI(this.core, this);
        }
      }, 1000);
    }
    
    this.syncManager = null;
    this.syncUI = null;
    
    if (this.adapter) {
      this.adapter.registerPPIManager(this);
    }
    
    setTimeout(() => {
      this.init();
    }, 0);
  }

  init() {
    this.setupCanvasDetection();
    
    if (this.ui && typeof this.ui.init === 'function') {
      this.ui.init();
    }

    this.setupSyncManager();
    this.setupKeyboardListeners();
  }

  setupCanvasDetection() {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkModeler = () => {
      attempts++;
      
      let foundModeler = null;
      
      if (this.adapter && this.adapter.bridge) {
        foundModeler = this.adapter.getBpmnModeler();
      }
      
      if (!foundModeler && typeof window !== 'undefined') {
        const possibleModelers = ['modeler', 'bpmnModeler', 'viewer', 'bpmnViewer'];
        
        for (const name of possibleModelers) {
          if (window[name]) {
            foundModeler = window[name];
            if (this.adapter && this.adapter.bridge) {
              this.adapter.bridge.registerModeler(foundModeler);
            }
            break;
          }
        }
      }
      
      if (foundModeler || this.adapter.getBpmnModeler()) {
        if (this.adapter && this.adapter.bridge && foundModeler) {
          this.adapter.bridge.registerModeler('bpmn', foundModeler);
        }
        
        this.setupBpmnEventListeners();
        this.setupDOMObserver();
        this.setupSyncManager();
        this.setupModelerChangeListener();
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkModeler, 50); // Optimización Ultra: Reducir de 1000ms a 50ms
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
        setTimeout(() => this.setupSyncManager(), 50); // Optimización Ultra: Reducir de 1000ms a 50ms
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
    
    // PPISyncUI functionality removed - file was empty
    // Direct setup without external script loading
    setTimeout(() => this.setupSyncUI(), 100);
  }

  setupBpmnEventListeners() {
    try {
      let modeler = null;
      if (this.adapter && typeof this.adapter.getBpmnModeler === 'function') {
        modeler = this.adapter.getBpmnModeler();
      }
      if (!modeler) {
        setTimeout(() => {
          this.setupBpmnEventListeners();
        }, 2000);
        return;
      }
      
      const eventBus = modeler.get('eventBus');
      
      if (!eventBus) {
        return;
      }
      
      if (this._bpmnListeners) {
        this._bpmnListeners.forEach(({ event, handler }) => {
          try {
            eventBus.off(event, handler);
          } catch (error) {
            console.warn(`[PPI-Manager] Error limpiando listener ${event}:`, error);
          }
        });
      }
      this._bpmnListeners = [];
      
      // MEJORADO: Listener rápido para eliminación de PPIs del canvas
      const removeHandler = (event) => {
        const el = event && event.element;
        if (el && this.core && this.core.isPPIElement && this.core.isPPIElement(el)) {
          const elementId = el.id;
          if (this._deletingElementIds.has(elementId)) {
            return;
          }
          this._deletingElementIds.add(elementId);
          // Marcar como borrado reciente para que los handlers de creación lo ignoren
          this._recentlyDeletedElements.set(elementId, Date.now());
          try {
            if (!this._isDeleting) {
              this.removePPIFromList(elementId);
            }
          } finally {
            // Limpiar inmediatamente
            this._deletingElementIds.delete(elementId);
          }
        }
      };
      eventBus.on('element.removed', removeHandler);
      this._bpmnListeners.push({ event: 'element.removed', handler: removeHandler });

      // MEJORADO: Listener para adición de PPIs al canvas
      const addHandler = (event) => {
        const element = event.element;
        if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
          const existingPPI = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
          const lastDel = this._recentlyDeletedElements.get(element.id) || 0;
          const withinCooldown = Date.now() - lastDel < this._creationCooldownMs;
          if (!existingPPI && !this._isDeleting && !withinCooldown) {
            // MEJORADO: Usar delay más corto para respuesta más rápida
            setTimeout(() => this.createPPIFromElement(element.id), 50);
          } else {
          }
        } else {
        }
      };
      eventBus.on('element.added', addHandler);
      this._bpmnListeners.push({ event: 'element.added', handler: addHandler });

      // NUEVO: Listener para creación de formas (algunas integraciones disparan shape.added en lugar de element.added)
      const shapeAddedHandler = (event) => {
        try {
          const element = event && event.element;
          if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
            const exists = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
            const lastDel = this._recentlyDeletedElements.get(element.id) || 0;
            const withinCooldown = Date.now() - lastDel < this._creationCooldownMs;
            if (!exists && !this._isDeleting && !withinCooldown) {
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
            const lastDel = this._recentlyDeletedElements.get(shape.id) || 0;
            const withinCooldown = Date.now() - lastDel < this._creationCooldownMs;
            if (!exists && !this._isDeleting && !withinCooldown) {
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
        const element = event.element;
        if (element && this.core && this.core.isPPIElement && this.core.isPPIElement(element)) {
          this.updatePPIFromElement(element);
        }
      };
      eventBus.on('element.changed', changeHandler);
      this._bpmnListeners.push({ event: 'element.changed', handler: changeHandler });

      // MEJORADO: Listener adicional para cambios de propiedades
      const propertiesHandler = (event) => {
        const element = event.context && event.context.element;
        if (element && this.core.isPPIElement && this.core.isPPIElement(element)) {
          setTimeout(() => this.updatePPIFromElement(element), 50);
        }
      };
      eventBus.on('commandStack.element.updateProperties.executed', propertiesHandler);
      this._bpmnListeners.push({ event: 'commandStack.element.updateProperties.executed', handler: propertiesHandler });

      // MEJORADO: Listener para cambios en el modelo
      const shapeChangeHandler = (event) => {
        const element = event.element;
        
        // Detectar elementos PPI principales
        if (element && this.core.isPPIElement && this.core.isPPIElement(element)) {
          
          // Verificar si el PPI existe, si no, crearlo
          const existingPPI = this.core.ppis && this.core.ppis.find(ppi => ppi.elementId === element.id);
          if (!existingPPI) {
            // Usar un flag para evitar creación duplicada
            const lastDel = this._recentlyDeletedElements.get(element.id) || 0;
            const withinCooldown = Date.now() - lastDel < this._creationCooldownMs;
            if (!this._creatingPPI && !this._isDeleting && !withinCooldown) {
              this._creatingPPI = true;
              setTimeout(() => {
                this.createPPIFromElement(element.id);
                this._creatingPPI = false;
              }, 50);
            } else {
            }
          } else {
            this.updatePPIFromElement(element);
          }
        }
        
        // NUEVO: Detectar elementos Target y Scope que son hijos de PPIs
        if (element && element.parent && element.parent.type === 'PPINOT:Ppi') {
          if (element.type === 'PPINOT:Target' || element.type === 'PPINOT:Scope') {
            const parentId = element && element.parent ? element.parent.id : null;
            const childId = element ? element.id : null;
            
            // Actualizar el PPI padre con la información del hijo
            setTimeout(() => {
              if (parentId && childId) {
                this.updatePPIWithChildInfo(parentId, childId);
              } else {
                console.warn('[PPI-Manager] Skip updatePPIWithChildInfo: parentId/childId nulos tras shape.changed');
              }
              // Refrescar la UI para mostrar los cambios
              if (this.ui) {
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
        const selectedElements = event.newSelection || [];
        
        if (selectedElements.length === 1) {
          const selectedElement = selectedElements[0];
          if (!selectedElement) {
            if (this.ui && typeof this.ui.clearPPISelection === 'function') {
              this.ui.clearPPISelection();
            }
            return;
          }
          
          // Buscar si el elemento seleccionado corresponde a un PPI
          const ppi = this.findPPIByElement(selectedElement);
          if (ppi) {
            // Marcar el PPI como seleccionado en la lista
            this.ui.selectPPI(ppi.id);
            
            // También forzar actualización del nombre al seleccionar
            this.updatePPIFromElement(selectedElement);
            
          } else {
            // Si no es un PPI, limpiar la selección
            if (this.ui && typeof this.ui.clearPPISelection === 'function') {
              this.ui.clearPPISelection();
            }
          }
        } else {
          // Si no hay selección o hay múltiples elementos, limpiar la selección
          if (this.ui && typeof this.ui.clearPPISelection === 'function') {
            this.ui.clearPPISelection();
          }
        }
      };
      eventBus.on('selection.changed', selectionHandler);
      this._bpmnListeners.push({ event: 'selection.changed', handler: selectionHandler });

      // MEJORADO: Listener específico para cambios de propiedades (nombres)
      const elementChangedHandler = (event) => {
        const element = event.element;
        
        if (element && element.parent && element.parent.type === 'PPINOT:Ppi') {
          if (element.type === 'PPINOT:Target' || element.type === 'PPINOT:Scope') {
            
            setTimeout(() => {
              const parentId = element && element.parent ? element.parent.id : null;
              const childId = element ? element.id : null;
              if (parentId && childId) {
                this.updatePPIWithChildInfo(parentId, childId);
              } else {
                console.warn('[PPI-Manager] element.parent o element.id es null; se omite updatePPIWithChildInfo');
              }
              if (this.ui) {
                this.ui.refreshPPIList();
              }
            }, 50);
          }
        }
      };
      eventBus.on('element.changed', elementChangedHandler);
      this._bpmnListeners.push({ event: 'element.changed', handler: elementChangedHandler });
      
      
      // MEJORADO: Verificar PPIs existentes en el canvas después de configurar listeners
      this.verifyExistingPPIsInCanvas();
      
    } catch (error) {
      console.error('[PPI-Manager] Error configurando listeners BPMN:', error);
    }
  }

  setupKeyboardListeners() {
    
    // Listener ultra-rápido para limpiar PPIs huérfanos
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Delete' || event.key === 'Backspace') {
        
        // Verificar PPIs huérfanos inmediatamente
        this.checkForOrphanedPPIs();
      }
    });
  }


  checkForOrphanedPPIs() {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler || !this.core) return;

      const elementRegistry = modeler.get('elementRegistry');
      const before = this.core.ppis.length;

      // Filtrar PPIs huérfanos ultra-rápido
      this.core.ppis = this.core.ppis.filter(ppi => 
        !ppi.elementId || !!elementRegistry.get(ppi.elementId)
      );

      if (this.core.ppis.length !== before) {
        this.core.savePPIs();
        if (this.ui && this.ui.refreshPPIList) {
          this.ui.refreshPPIList();
        }
      }
    } catch (error) {
      console.error('[PPI-Manager] Error checking for orphaned PPIs:', error);
    }
  }

  // NUEVO: Método para verificar PPIs existentes en el canvas
  verifyExistingPPIsInCanvas() {
    try {
      if (!this.core) {
        return;
      }
      const modeler = this.getBpmnModeler();
      if (!modeler) {
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


      // Verificar si cada elemento PPINOT tiene un PPI correspondiente
      ppiElements.forEach(element => {
        const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
        if (!existingPPI && !this._isDeleting) {
          setTimeout(() => {
            this.createPPIFromElement(element.id);
          }, 100);
        } else {
        }
      });

    } catch (error) {
      console.error('[PPI-Manager] Error verificando PPIs existentes en canvas:', error);
    }
  }


  /**
   * Obtiene el modelador BPMN de múltiples fuentes
   * @returns {Object|null} El modelador BPMN o null si no se encuentra
   */
  getBpmnModeler() {
    // Intentar desde el adapter
    if (this.adapter) {
      const modeler = this.adapter.getBpmnModeler();
      if (modeler) {
        return modeler;
      }
    }
    
    // Último intento: bridge
    if (this.bridge && this.bridge.getModeler) {
      const modeler = this.bridge.getModeler('bpmn');
      if (modeler) {
        return modeler;
      }
    }
    
    console.warn(`🔧 [getBpmnModeler] No se pudo obtener el modelador desde ninguna fuente`);
    return null;
  }


  /**
   * Busca un PPI por su elemento del canvas
   * @param {Object} element - Elemento del canvas BPMN
   * @returns {Object|null} PPI encontrado o null
   */
  findPPIByElement(element) {
    if (!element) return null;
    
    
    try {
      // Buscar por elementId
      let ppi = this.core.ppis.find(p => p.elementId === element.id);
      if (ppi) {
        return ppi;
      }
      
      // Buscar por nombre del elemento
      if (element.businessObject && element.businessObject.name) {
        ppi = this.core.ppis.find(p => p.title === element.businessObject.name);
        if (ppi) {
          return ppi;
        }
      }
      
      // Buscar en el elemento padre si no se encuentra directamente
      if (element.parent) {
        const parentElement = element.parent;
        
        // Buscar por elementId del padre
        ppi = this.core.ppis.find(p => p.elementId === parentElement.id);
        if (ppi) {
          return ppi;
        }
        
        // También buscar por nombre del padre
        if (parentElement.businessObject && parentElement.businessObject.name) {
          ppi = this.core.ppis.find(p => p.title === parentElement.businessObject.name);
          if (ppi) {
            return ppi;
          }
        }
      }
      
    } catch (error) {
      console.error('Error finding PPI by element:', error);
    }
    
    return null;
  }


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
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
        console.warn(`🔧 [updatePPIWithChildInfo] PPI padre ${parentPPIId} no encontrado`);
        return;
      }
      
      // Extraer información basada en el tipo de elemento
      let updatedData = { updatedAt: new Date().toISOString() };
      
      if (childElement.type === 'PPINOT:Target') {
        const targetName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.target = targetName;
      } else if (childElement.type === 'PPINOT:Scope') {
        const scopeName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.scope = scopeName;
      } else if (childElement.type === 'PPINOT:Measure') {
        const measureName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.measureDefinition = {
          type: this.core.detectMeasureType(childElementId, childElement.type),
          definition: measureName
        };
      } else if (childElement.type === 'PPINOT:Condition') {
        const conditionName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.businessObjective = conditionName;
      }
      
      
      if (this.core.updatePPI(existingPPI.id, updatedData)) {
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
    try {
      // Evitar creación si estamos en proceso de borrado o en cooldown para este elemento
      const lastDel = this._recentlyDeletedElements.get(elementId) || 0;
      const withinCooldown = Date.now() - lastDel < this._creationCooldownMs;
      if (this._isDeleting || withinCooldown) {
        return;
      }
      let elementName = elementId;
      
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = this.getBpmnModeler();
      
      if (modeler) {
        const elementRegistry = modeler.get('elementRegistry');
        const element = elementRegistry.get(elementId);
        
        if (element && element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
          elementName = element.businessObject.name.trim();
        } else {
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
      
      
      this.core.addPPI(ppi);
      
      // Silenciar feedback de creación de PPI para evitar molestias en UI
      
      // Asegurar que la UI está disponible y el DOM está listo
      this.refreshPPIList();
      
      // Guardar elementos PPINOT después de crear
      if (this.core.debouncedSavePPINOTElements) {
        this.core.debouncedSavePPINOTElements();
      }
      
    } catch (error) {
      console.error('[PPI-Manager] Error creando PPI:', error);
    }
  }

  updatePPIFromElement(element) {
    try {
      const elementId = element.id;
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === elementId);
      
      if (!existingPPI) {
        return;
      }
      
      let newTitle = '';
      if (element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
        newTitle = element.businessObject.name.trim();
      } else if (element.businessObject && element.businessObject.id) {
        newTitle = element.businessObject.id; // Use ID as fallback
      }
      
      
      // Always update if we have a new title, be more aggressive
      if (newTitle) {
        // Force update even if titles appear to be the same (might have whitespace differences)
        const titleChanged = newTitle.trim() !== (existingPPI.title || '').trim();
        
        if (titleChanged || !existingPPI.title) {
          
          const updatedData = {
            title: newTitle,
            updatedAt: new Date().toISOString()
          };
          
          if (this.core.updatePPI(existingPPI.id, updatedData)) {
            
            // Force immediate DOM update
            this.updatePPIElementInDOM(existingPPI.id, updatedData);
            
            // Force UI refresh with multiple attempts
            setTimeout(() => {
              this.ui.refreshPPIList();
            }, 10);
            
            setTimeout(() => {
              this.ui.refreshPPIList();
            }, 100);
            
            // Also try to update the card directly
            setTimeout(() => {
              const cardElement = document.querySelector(`[data-ppi-id="${existingPPI.id}"] .ppi-title`);
              if (cardElement) {
                cardElement.textContent = newTitle;
              }
            }, 50);
            
          } else {
          }
        } else {
        }
      } else {
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

  
  // UI Methods
  showCreatePPIModal() {
    this.ui.showCreatePPIModal();
  }

  /**
   * Marcar el inicio de una eliminación en el canvas para un elemento PPINOT
   * Esto evita recreaciones y elimina duplicadas disparadas por eventos
   */
  beginCanvasDeletion(elementId) {
    try {
      this._isDeleting = true;
      if (elementId) {
        this._deletingElementIds.add(elementId);
        this._recentlyDeletedElements.set(elementId, Date.now());
      }
    } catch (_) { /* no-op: coordinación opcional */ }
  }

  /**
   * Marcar el fin de una eliminación en el canvas para un elemento PPINOT
   */
  endCanvasDeletion(elementId) {
    try {
      if (elementId) {
        this._deletingElementIds.delete(elementId);
        this._recentlyDeletedElements.set(elementId, Date.now());
      }
      
      // PURGE INMEDIATO tras eliminación
      if (this.core && typeof this.core.purgeOrphanedPPIs === 'function') {
        this.core.purgeOrphanedPPIs();
      }
    } finally {
      this._isDeleting = false;
    }
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
    
    const proceed = () => {
      if (this._deletingPPIIds.has(ppiId)) {
        return;
      }
      this._deletingPPIIds.add(ppiId);
      try {
        this._isDeleting = true;
        if (this.core.deletePPI(ppiId)) {
          this.ui.showSuccessMessage('PPI eliminado exitosamente');
          this.ui.refreshPPIList();
        } else {
        }
      } finally {
        this._isDeleting = false;
        this._deletingPPIIds.delete(ppiId);
      }
    };

    // Usar modal de confirmación del proyecto en lugar de window.confirm
    this.showConfirmModal('¿Estás seguro de que quieres eliminar este PPI?', proceed);
  }

  removePPIFromList(ppiId) {
    try {
      if (this._deletingPPIIds.has(ppiId)) {
        return;
      }
      // Buscar el PPI por elementId
      const ppi = this.core.ppis.find(ppi => ppi.elementId === ppiId);
      if (ppi) {
        this._deletingPPIIds.add(ppi.id);
        // Si viene del canvas (elementId), solo eliminar de la lista, no del canvas
        // porque el canvas ya se eliminó (eso disparó este evento)
        try {
          this._isDeleting = true;
          
          // Eliminar solo de la lista, no del canvas
          this.core.ppis = this.core.ppis.filter(p => p.id !== ppi.id);
          this.core.savePPIs();
          
          // Refresh the UI
          this.ui.refreshPPIList();
          this.ui.showSuccessMessage(`PPI eliminado: ${ppi.title || ppiId}`);
        } finally {
          this._isDeleting = false;
        }
        this._deletingPPIIds.delete(ppi.id);
      } else {
        // Buscar por ID directo como fallback
        const ppiById = this.core.ppis.find(ppi => ppi.id === ppiId);
        if (ppiById) {
          this._deletingPPIIds.add(ppiById.id);
          try {
            this._isDeleting = true;
            if (this.core.deletePPI(ppiById.id)) {
              this.ui.refreshPPIList();
              this.ui.showSuccessMessage(`PPI eliminado: ${ppiById.title || ppiId}`);
            } else {
              // Fallback: eliminar solo de la lista
              this.core.ppis = this.core.ppis.filter(p => p.id !== ppiById.id);
              this.ui.refreshPPIList();
              this.ui.showSuccessMessage(`PPI eliminado de la lista: ${ppiById.title || ppiId}`);
            }
          } finally {
            this._isDeleting = false;
          }
          this._deletingPPIIds.delete(ppiById.id);
        } else {
          // Fallback adicional: purgar PPIs huérfanos cuyo elementId ya no exista en el canvas
          try {
            const modeler = this.getBpmnModeler();
            const er = modeler && modeler.get ? modeler.get('elementRegistry') : null;
            if (er) {
              const before = this.core.ppis.length;
              this.core.ppis = this.core.ppis.filter(p => !p.elementId || er.get(p.elementId));
              if (this.core.ppis.length !== before) {
                this.ui.refreshPPIList();
              }
            }
          } catch (purgeErr) {
            // no-op
          }
        }
      }
    } catch (error) {
      // Error removiendo PPI de la lista
    }
  }

  // Modal de confirmación estilizado (reutilizable)
  showConfirmModal(message, onConfirm) {
    try {
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay ppi-confirm-modal';
      overlay.innerHTML = `
        <div class="modal-content">
          <div class="modal-header">
            <h3><i class="fas fa-trash-alt"></i> Confirmar eliminación</h3>
            <button class="modal-close" aria-label="Cerrar">×</button>
          </div>
          <div class="modal-body">
            <div class="warning-container" style="max-width: 500px; margin: 0 auto;">
              <div class="warning-icon">
                <i class="fas fa-exclamation-triangle"></i>
              </div>
              <div class="warning-content">
                <p class="warning-title">${message}</p>
                <p class="warning-subtitle">Esta acción no se puede deshacer.</p>
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary btn-cancel">Cancelar</button>
            <button class="btn btn-danger btn-accept">
              <span class="btn-text">Eliminar</span>
              <span class="btn-loading" style="display: none;">
                <div class="loading-spinner"></div>
              </span>
            </button>
          </div>
        </div>`;

      const close = () => {
        if (overlay.parentNode) {
          overlay.classList.remove('active');
          setTimeout(() => {
            if (overlay.parentNode) {
              overlay.parentNode.removeChild(overlay);
            }
          }, 300);
        }
      };

      // Animación de entrada
      document.body.appendChild(overlay);
      setTimeout(() => {
        overlay.classList.add('active');
      }, 10);

      // Event listeners
      overlay.querySelector('.modal-close').addEventListener('click', close);
      overlay.querySelector('.btn-cancel').addEventListener('click', close);
      
      // Cerrar al hacer clic en el overlay (fuera del modal)
      overlay.addEventListener('click', (e) => {
        if (e.target === overlay) close();
      });

      // Cerrar con Escape
      const handleEscape = (e) => {
        if (e.key === 'Escape') {
          close();
          document.removeEventListener('keydown', handleEscape);
        }
      };
      document.addEventListener('keydown', handleEscape);

      overlay.querySelector('.btn-accept').addEventListener('click', () => {
        const btn = overlay.querySelector('.btn-accept');
        
        // Mostrar estado de carga
        btn.disabled = true;
        btn.classList.add('loading');
        
        try {
          // Ejecutar confirmación de forma asíncrona
          if (onConfirm) {
            // Usar Promise para manejar la eliminación de forma asíncrona
            Promise.resolve(onConfirm()).then(() => {
              // Cerrar modal después de que se complete la eliminación
              setTimeout(() => {
                close();
                document.removeEventListener('keydown', handleEscape);
              }, 300);
            }).catch((error) => {
              console.error('Error en confirmación:', error);
              // En caso de error, restaurar botón y cerrar
              btn.disabled = false;
              btn.classList.remove('loading');
              close();
              document.removeEventListener('keydown', handleEscape);
            });
          } else {
            // Si no hay onConfirm, cerrar inmediatamente
            close();
            document.removeEventListener('keydown', handleEscape);
          }
        } catch (error) {
          console.error('Error ejecutando confirmación:', error);
          // En caso de error, restaurar botón y cerrar
          btn.disabled = false;
          btn.classList.remove('loading');
          close();
          document.removeEventListener('keydown', handleEscape);
        }
      });

    } catch (e) {
      console.error('Error creando modal de confirmación:', e);
      // Fallback silencioso si el modal falla
      if (typeof onConfirm === 'function') onConfirm();
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
    for (let [key, value] of Object.entries(ppiData)) {
    }
    
    // Procesar los datos usando el método del core
    const processedData = this.core.parseFormData(new Map(Object.entries(ppiData)));
    
    
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
      // Silenciar feedback de creación
      this.ui.refreshPPIList();
    }
  }

  /**
   * Sync PPI changes back to canvas Target/Scope elements
   */
  syncPPIChangesToCanvas(ppiId, ppiData) {
    try {
      
      const ppi = this.core.ppis.find(p => p.id === ppiId);
      if (!ppi || !ppi.elementId) {
        return;
      }

      const modeler = this.getBpmnModeler();
      if (!modeler) {
        return;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const eventBus = modeler.get('eventBus');
      
      // Find the PPI parent element
      const ppiElement = elementRegistry.get(ppi.elementId);
      if (!ppiElement) {
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


      // Helper function to safely update element and trigger visual refresh
      const safeUpdateElement = (element, newName, elementType) => {
        try {
          
          // Update the business object name directly
          if (element.businessObject) {
            element.businessObject.name = newName;
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
        targetElements.forEach(targetEl => {
          safeUpdateElement(targetEl, ppiData.target, 'Target');
        });
      } else {
      }

      // Update Scope elements
      if (ppiData.scope && scopeElements.length > 0) {
        scopeElements.forEach(scopeEl => {
          safeUpdateElement(scopeEl, ppiData.scope, 'Scope');
        });
      } else {
      }

      // Update PPI title if provided
      if (ppiData.title && ppiElement) {
        safeUpdateElement(ppiElement, ppiData.title, 'PPI');
      }

      
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
    const now = Date.now();
    
    // Circuit breaker: Si está abierto, verificar si es tiempo de reset
    if (this._refreshCircuitOpen) {
      if (now - this._lastRefreshTime > this._refreshCircuitResetTime) {
        this._refreshCircuitOpen = false;
        this._refreshAttempts = 0;
      } else {
        // Circuit abierto, salir silenciosamente
        return;
      }
    }
    
    // Debounce: Evitar llamadas muy frecuentes
    if (now - this._lastRefreshTime < this._refreshDebounceMs) {
      return;
    }
    
    this._lastRefreshTime = now;
    this._refreshAttempts++;
    
    // Verificar límite de intentos
    if (this._refreshAttempts > this._refreshMaxAttempts) {
      this._refreshCircuitOpen = true;
      console.warn('[PPI-Manager] Circuit breaker activado - demasiados intentos de refresh. Pausando por', this._refreshCircuitResetTime / 1000, 'segundos');
      return;
    }
    
    const attemptRefresh = (retryCount = 0) => {
      if (this.ui && typeof this.ui.refreshPPIList === 'function') {
        // Verificar que el panel PPI está montado y el contenedor DOM existe
        const ppiPanel = document.getElementById('ppi-panel');
        const ppiListContainer = document.getElementById('ppi-list');
        
        if (ppiPanel && ppiListContainer) {
          this.ui.refreshPPIList();
          // Reset contador en caso de éxito
          this._refreshAttempts = Math.max(0, this._refreshAttempts - 1);
        } else if (retryCount < 3) { // Reducido de 5 a 3
          const delay = Math.min(300 * (retryCount + 1), 1000); // Reducido delay máximo
          setTimeout(() => attemptRefresh(retryCount + 1), delay);
        } else {
          // Silenciar warning para evitar spam - el panel se montará cuando sea necesario
        }
      } else if (retryCount < 2) {
        setTimeout(() => attemptRefresh(retryCount + 1), 300);
      } else {
        if (this._refreshAttempts === 1) {
          console.warn('[PPI-Manager] UI not available for refreshPPIList after retries');
        }
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


  
  restorePPINOTElements() {
    try {
      // Usar el sistema de coordinación unificado
      const registry = getServiceRegistry && getServiceRegistry();
      const coordinationManager = registry?.get('PPINOTCoordinationManager');
      
      if (coordinationManager) {
        coordinationManager.triggerRestoration('ppi.manager.request');
      } else {
        // Fallback al método anterior
        const modeler = this.getBpmnModeler();
        
        if (!modeler) {
          setTimeout(() => this.restorePPINOTElements(), 1000);
          return;
        }

        // Restaurar elementos (esto ya incluye cargar relaciones desde XML)
        const restored = this.core.restorePPINOTElements();
        if (restored) {
          // Elementos PPINOT restaurados exitosamente
        }
      }
    } catch (error) {
      console.error('❌ Error restaurando elementos PPINOT:', error);
    }
  }

  
  // Función global para debugging del estado PPINOT


  
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

  
  refreshPPINOTRelationships() {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) {
        this.ui.showMessage('Modeler no disponible', 'warning');
        return;
      }

      if (this.syncManager) {
        this.syncManager.forceSync();
        this.ui.showSuccessMessage('Sincronización completada con el nuevo sistema');
        return;
      }

      this.performLegacySync(modeler);
      
    } catch (error) {
      this.ui.showMessage('Error en refresco: ' + error.message, 'error');
    }
  }

  performLegacySync(modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    this.clearExistingPPIs();
    const ppiElements = this.createPPIsFromElements(allElements);
    const ppiChildren = this.updatePPIsWithChildren(allElements);
    
    this.core.forceSavePPINOTElements();
    this.ui.refreshPPIList();
    this.ui.showSuccessMessage(`Refresco completado: ${ppiElements.length} PPIs, ${ppiChildren.length} elementos hijos`);
  }

  clearExistingPPIs() {
    this.core.ppis.length = 0;
    this.core.processedElements.clear();
  }

  createPPIsFromElements(allElements) {
    const ppiElements = allElements.filter(element => 
      element.type === 'PPINOT:Ppi' || 
      (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
    );
    
    ppiElements.forEach(element => {
      this.createPPIFromElement(element.id);
    });
    
    return ppiElements;
  }

  updatePPIsWithChildren(allElements) {
    const ppiChildren = allElements.filter(element => 
      element.parent && 
      element.parent.type === 'PPINOT:Ppi' &&
      (element.type === 'PPINOT:Scope' || 
       element.type === 'PPINOT:Target' ||
       element.type === 'PPINOT:Measure' ||
       element.type === 'PPINOT:Condition')
    );
    
    ppiChildren.forEach(element => {
      if (element.parent && element.parent.id) {
        this.updatePPIWithChildInfo(element.parent.id, element.id);
      }
    });
    
    return ppiChildren;
  }

  
  forceCanvasRefresh() {
    try {
      // Obtener modelador del nuevo sistema o fallback a window
      const modeler = this.getBpmnModeler();
      
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
      const modeler = this.getBpmnModeler();
      
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
            this.safeZoomToElement(canvas, element);
          }
        } catch (zoomError) {
          // Si el zoom falla, al menos intentar scrollTo
          try {
            const canvas = modeler.get('canvas');
            if (canvas && typeof canvas.scrollToElement === 'function') {
              canvas.scrollToElement(element);
            }
          } catch (scrollError) {
          }
        }
        
      } else {
        console.warn(`Elemento no encontrado en canvas: ${ppi.elementId}`);
      }
    } catch (error) {
      console.error('Error seleccionando PPI en canvas:', error);
    }
  }

  /**
   * Zoom seguro al elemento evitando errores de matriz no invertible
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} element - Elemento al que hacer zoom
   */
  safeZoomToElement(canvas, element) {
    // Usar la utilidad global si está disponible
    const CanvasUtils = getServiceRegistry && getServiceRegistry().get('CanvasUtils');
    if (CanvasUtils) {
      const success = CanvasUtils.safeZoomToElement(canvas, element);
      if (!success) {
        // Fallback a scroll si el zoom falla
        CanvasUtils.safeScrollToElement(canvas, element);
      }
      return;
    }

    // Fallback local si CanvasUtils no está disponible
    try {
      if (!canvas || !element) return;

      try {
        canvas.zoom('fit-viewport', element);
      } catch (fitError) {
        if (canvas.scrollToElement) {
          canvas.scrollToElement(element);
        }
      }
    } catch (error) {
      console.warn('Error en zoom seguro:', error.message);
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
} else {
}

 