// Importar el sistema de comunicación centralizado
import ppiAdapter from './PPIAdapter.js';
import { getEventBus } from '../ui/core/event-bus.js';

class PPISyncManager {
  constructor(ppiManager) {
    this.ppiManager = ppiManager;
    this.core = ppiManager.core;
    this.ui = ppiManager.ui;
    
    // Inicializar sistema de comunicación
    this.eventBus = getEventBus();
    this.adapter = ppiAdapter;
    
    this.syncState = {
      isSyncing: false,
      lastSyncTime: 0,
      pendingChanges: new Set(),
      syncQueue: []
    };
    
    this.relationshipCache = new Map();
    this.elementCache = new Map();
    
    this.syncConfig = {
      autoSync: true,
      syncInterval: 1000,
      maxRetries: 3,
      debounceDelay: 200
    };
    
    this.syncTimer = null;
    this.debounceTimer = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.startAutoSync();
  }

  setupEventListeners() {
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
    
    if (!modeler) {
      return;
    }

    const eventBus = modeler.get('eventBus');
    
    // Eventos de elementos PPINOT
    eventBus.on('element.changed', (event) => {
      this.handleElementChange(event);
    });

    eventBus.on('element.removed', (event) => {
      this.handleElementRemoval(event);
    });

    eventBus.on('element.added', (event) => {
      this.handleElementAdded(event);
    });

    // Eventos de relaciones padre-hijo - MEJORADOS
    eventBus.on('shape.move', (event) => {
      this.handleShapeMove(event);
    });

    eventBus.on('elements.move', (event) => {
      this.handleElementsMove(event);
    });

    // Eventos de modelado - MEJORADOS
    eventBus.on('modeling.moveShape', (event) => {
      this.handleModelingMoveShape(event);
    });

    // NUEVOS EVENTOS para detectar cambios de padre
    eventBus.on('element.updateParent', (event) => {
      this.handleParentUpdate(event);
      // Verificar cambios de padre después de actualización
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 100);
    });

    eventBus.on('modeling.updateProperties', (event) => {
      this.handlePropertiesUpdate(event);
      // Verificar cambios después de actualización de propiedades
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 100);
    });

    // Eventos de drag & drop
    eventBus.on('drag.end', (event) => {
      this.handleDragEnd(event);
    });

    eventBus.on('drop.end', (event) => {
      this.handleDropEnd(event);
    });

    // Eventos adicionales para detectar cambios de padre
    eventBus.on('modeling.moveShape', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 100);
    });

    eventBus.on('elements.move', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 100);
    });

    // Eventos de selección para detectar cambios
    eventBus.on('selection.changed', (event) => {
      this.handleSelectionChange(event);
    });

    // Evento para detectar cambios de propiedades que podrían afectar relaciones padre-hijo
    eventBus.on('element.changed', (event) => {
      if (event.element && this.isPPIChildElement(event.element)) {
        setTimeout(() => {
          this.checkAllParentChanges();
        }, 100);
      }
    });

    // Eventos adicionales para capturar cambios en el canvas
    eventBus.on('shape.move', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 100);
    });
  }

  // === HANDLERS DE EVENTOS ===

  handleElementChange(event) {
    const element = event.element;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIElement(element)) {
      this.queueSync('ppi_change', element.id);
    } else if (this.isPPIChildElement(element)) {
      this.queueSync('child_change', element.id);
    }
  }

  handleElementRemoval(event) {
    const element = event.element;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIElement(element)) {
      this.queueSync('ppi_removal', element.id);
    } else if (this.isPPIChildElement(element)) {
      this.queueSync('child_removal', element.id);
    }
  }

  handleElementAdded(event) {
    const element = event.element;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIElement(element)) {
      this.queueSync('ppi_addition', element.id);
    } else if (this.isPPIChildElement(element)) {
      this.queueSync('child_addition', element.id);
    }
  }

  handleShapeMove(event) {
    const element = event.element;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      this.queueSync('child_move', element.id);
    }
  }

  handleElementsMove(event) {
    if (!event.elements || !Array.isArray(event.elements)) {
      return;
    }
    
    event.elements.forEach(element => {
      if (element && this.isPPIChildElement(element)) {
        this.queueSync('child_move', element.id);
      }
    });
  }

  handleModelingMoveShape(event) {
    const element = event.element;
    const newParent = event.newParent;
    const oldParent = event.oldParent;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      this.queueSync('parent_change', {
        elementId: element.id,
        oldParentId: oldParent ? oldParent.id : null,
        newParentId: newParent ? newParent.id : null
      });
    }
  }

  // NUEVOS HANDLERS para detectar cambios de padre
  handleParentUpdate(event) {
    const element = event.element;
    const oldParent = event.oldParent;
    const newParent = event.newParent;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      this.queueSync('parent_change', {
        elementId: element.id,
        oldParentId: oldParent ? oldParent.id : null,
        newParentId: newParent ? newParent.id : null
      });
    }
  }

  handlePropertiesUpdate(event) {
    const element = event.element;
    
    if (!element) {
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      this.queueSync('child_change', element.id);
    }
  }

           handleDragEnd(event) {
      const element = event.element;
      
      if (!element) {
        return;
      }
      
      // NUEVO: Usar el método robusto para verificar después del drag
      this.forceDropCheck();
    }

           handleDropEnd(event) {
      const element = event.element;
      
      if (!element) {
        return;
      }
      
      // NUEVO: Usar el método robusto para verificar después del drop
      this.forceDropCheck();
    }

  handleSelectionChange(event) {
    // Procesar cambios de selección para detectar elementos PPI activos
    const selection = event.newSelection || [];
    const ppiChildren = selection.filter(element => this.isPPIChildElement(element));
    const ppiElements = selection.filter(element => this.isPPIElement(element));
    
    if (ppiChildren.length > 0) {
      
      // Notificar al UI que hay un elemento PPI activo
      if (this.ppiManager && this.ppiManager.ui && this.ppiManager.ui.setActivePPI) {
        // Usar el primer elemento hijo seleccionado
        this.ppiManager.ui.setActivePPI(ppiChildren[0].id);
      }
    } else if (ppiElements.length > 0) {
      
      // Notificar al UI que hay un elemento PPI principal activo
      if (this.ppiManager && this.ppiManager.ui && this.ppiManager.ui.setActivePPI) {
        this.ppiManager.ui.setActivePPI(ppiElements[0].id);
      }
    } else {
      // Si no hay elementos PPI seleccionados, limpiar estado activo
      if (this.ppiManager && this.ppiManager.ui && this.ppiManager.ui.clearAllActivePPIs) {
        this.ppiManager.ui.clearAllActivePPIs();
      }
    }
  }

  // === DETECCIÓN DE ELEMENTOS ===

  isPPIElement(element) {
    if (!element) return false;
    return element.type === 'PPINOT:Ppi' || 
           (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi');
  }

     isPPIChildElement(element) {
     if (!element) {
       return false;
     }
     
     const isChild = element.type === 'PPINOT:Scope' || 
            element.type === 'PPINOT:Target' ||
            element.type === 'PPINOT:Measure' ||
            element.type === 'PPINOT:Condition' ||
            (element.businessObject && (
              element.businessObject.$type === 'PPINOT:Scope' ||
              element.businessObject.$type === 'PPINOT:Target' ||
              element.businessObject.$type === 'PPINOT:Measure' ||
              element.businessObject.$type === 'PPINOT:Condition'
            ));
     
     
     return isChild;
   }

  // === SISTEMA DE COLA DE SINCRONIZACIÓN ===

  queueSync(type, data) {
    if (this.syncState.isSyncing) {
      this.syncState.syncQueue.push({ type, data, timestamp: Date.now() });
      return;
    }

    // Create a unique identifier for the change
    const changeId = `${type}_${typeof data === 'string' ? data : JSON.stringify(data)}`;
    this.syncState.pendingChanges.add(changeId);
    this.debounceSync();
  }

  debounceSync() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.performSync();
    }, this.syncConfig.debounceDelay);
  }

  async performSync() {
    if (this.syncState.isSyncing) {
      return;
    }

    this.syncState.isSyncing = true;

    try {
      // Procesar cambios pendientes
      await this.processPendingChanges();
      
      // Procesar cola de sincronización
      await this.processSyncQueue();
      
      // Actualizar cache
      this.updateCaches();
      
      // Sincronizar UI
      this.syncUI();
      
      this.syncState.lastSyncTime = Date.now();
      
    } catch (error) {
    } finally {
      this.syncState.isSyncing = false;
      
      // Procesar cola si hay más elementos
      if (this.syncState.syncQueue.length > 0) {
        setTimeout(() => this.performSync(), 100);
      }
    }
  }

  async processPendingChanges() {
    const changes = Array.from(this.syncState.pendingChanges);
    this.syncState.pendingChanges.clear();

    for (const change of changes) {
      try {
        const [type, dataStr] = change.split('_', 2);
        
        // Handle both string and JSON data
        let data;
        try {
          data = JSON.parse(dataStr);
        } catch (parseError) {
          // If it's not JSON, treat it as a string
          data = dataStr;
        }
        
        await this.processChange(type, data);
      } catch (error) {
      }
    }
  }

  async processSyncQueue() {
    const queue = [...this.syncState.syncQueue];
    this.syncState.syncQueue = [];

    for (const item of queue) {
      try {
        await this.processChange(item.type, item.data);
      } catch (error) {
      }
    }
  }

  async processChange(type, data) {
    switch (type) {
      case 'ppi_change':
        await this.handlePPIChange(data);
        break;
      case 'ppi_removal':
        await this.handlePPIRemoval(data);
        break;
      case 'ppi_addition':
        await this.handlePPIAddition(data);
        break;
      case 'child_change':
        await this.handleChildChange(data);
        break;
      case 'child_removal':
        await this.handleChildRemoval(data);
        break;
      case 'child_addition':
        await this.handleChildAddition(data);
        break;
      case 'child_move':
        await this.handleChildMove(data);
        break;
      case 'parent_change':
        await this.handleParentChange(data);
        break;
      default:
    }
  }

  // === MANEJADORES DE CAMBIOS ===

  async handlePPIChange(ppiId) {
    
    const element = this.getElementFromRegistry(ppiId);
    if (!element) return;

    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === ppiId);
    if (!existingPPI) return;

    // Actualizar información del PPI
    const updatedData = {
             title: (element.businessObject && element.businessObject.name) || ppiId,
      updatedAt: new Date().toISOString()
    };

    this.core.updatePPI(existingPPI.id, updatedData);
  }

  async handlePPIRemoval(ppiId) {
    
    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === ppiId);
    if (existingPPI) {
      this.core.deletePPI(existingPPI.id);
    }
  }

  async handlePPIAddition(ppiId) {
    
    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === ppiId);
    if (existingPPI) return;

    this.ppiManager.createPPIFromElement(ppiId);
  }

  async handleChildChange(childId) {
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

  async handleChildRemoval(childId) {
    
    // Limpiar información del hijo de todos los PPIs
    this.clearChildInfoFromAllPPIs(childId);
  }

  async handleChildAddition(childId) {
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

  async handleChildMove(childId) {
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

     async handleParentChange(data) {
     
     const { elementId, oldParentId, newParentId } = data;
     
     // Limpiar información del PPI padre anterior
     if (oldParentId) {
       this.clearChildInfoFromPPI(oldParentId, elementId);
     }
     
     // Actualizar información del nuevo PPI padre (o limpiar si no hay padre)
     if (newParentId) {
       this.updatePPIWithChildInfo(newParentId, elementId);
     } else {
       // Si no hay nuevo padre, limpiar de todos los PPIs
       this.clearChildInfoFromAllPPIs(elementId);
     }
   }

  // === MÉTODOS AUXILIARES ===

  getElementFromRegistry(elementId) {
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
    
    if (!modeler) return null;
    
    const elementRegistry = modeler.get('elementRegistry');
    return elementRegistry.get(elementId);
  }

     findParentPPI(element) {
     if (!element.parent) return null;
     
     // Buscar PPI padre directo
     if (this.isPPIElement(element.parent)) {
       return this.core.ppis.find(ppi => ppi.elementId === element.parent.id);
     }
     
     // Buscar PPI padre en la jerarquía
     let currentParent = element.parent;
     while (currentParent) {
       if (this.isPPIElement(currentParent)) {
         return this.core.ppis.find(ppi => ppi.elementId === currentParent.id);
       }
       currentParent = currentParent.parent;
     }
     
     return null;
   }

   // NUEVO: Verificar si un elemento tiene un padre PPI
   hasPPIParent(element) {
     if (!element.parent) {
       return false;
     }
     
     
     // Verificar padre directo
     if (this.isPPIElement(element.parent)) {
       return true;
     }
     
     // Verificar en la jerarquía
     let currentParent = element.parent;
     let level = 1;
     while (currentParent) {
       if (this.isPPIElement(currentParent)) {
         return true;
       }
       currentParent = currentParent.parent;
       level++;
     }
     
     return false;
   }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    const element = this.getElementFromRegistry(childElementId);
    if (!element) return;

    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
    if (!existingPPI) return;

    let updatedData = { updatedAt: new Date().toISOString() };
    
    if (element.type === 'PPINOT:Target') {
      const targetName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.target = targetName;
    } else if (element.type === 'PPINOT:Scope') {
      const scopeName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.scope = scopeName;
    } else if (element.type === 'PPINOT:Measure') {
      const measureName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.measureDefinition = {
        type: this.detectMeasureType(childElementId, element.type),
        definition: measureName
      };
    } else if (element.type === 'PPINOT:Condition') {
      const conditionName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.businessObjective = conditionName;
    }
    
    this.core.updatePPI(existingPPI.id, updatedData);
  }

     clearChildInfoFromAllPPIs(childElementId) {
       
       const element = this.getElementFromRegistry(childElementId);
       if (!element) {
         return;
       }

       const elementType = element.type;
       
       // CORREGIDO: Verificar directamente en todos los PPIs sin depender del cache
       this.core.ppis.forEach(ppi => {
         
         let updatedData = { updatedAt: new Date().toISOString() };
         let hasChanges = false;
         
         if (elementType === 'PPINOT:Target' && ppi.target) {
           // CORREGIDO: Verificar si el target actual coincide con este elemento
           // El target puede contener el nombre del elemento, no el ID
           const targetName = (element.businessObject && element.businessObject.name) || childElementId;
           
           
           if (ppi.target === targetName || ppi.target === childElementId) {
             updatedData.target = null;
             hasChanges = true;
           }
         } else if (elementType === 'PPINOT:Scope' && ppi.scope) {
           // CORREGIDO: Verificar si el scope actual coincide con este elemento
           const scopeName = (element.businessObject && element.businessObject.name) || childElementId;
           
           
           if (ppi.scope === scopeName || ppi.scope === childElementId) {
             updatedData.scope = null;
             hasChanges = true;
           }
         }
         
         if (hasChanges) {
           this.core.updatePPI(ppi.id, updatedData);
         } else {
         }
       });
     }

     clearChildInfoFromPPI(parentPPIId, childElementId) {
     const element = this.getElementFromRegistry(childElementId);
     if (!element) return;

     const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
     if (!existingPPI) return;

     let updatedData = { updatedAt: new Date().toISOString() };
     let hasChanges = false;
     
     if (element.type === 'PPINOT:Target') {
       updatedData.target = null;
       hasChanges = true;
     } else if (element.type === 'PPINOT:Scope') {
       updatedData.scope = null;
       hasChanges = true;
     }
     
     if (hasChanges) {
       this.core.updatePPI(existingPPI.id, updatedData);
     }
   }

  detectMeasureType(elementId, elementType) {
    // Lógica para detectar el tipo de medida
    if (elementType.includes('Time')) return 'time';
    if (elementType.includes('Count')) return 'count';
    if (elementType.includes('Data')) return 'data';
    if (elementType.includes('Condition')) return 'state';
    if (elementType.includes('Derived')) return 'derived';
    if (elementType.includes('Aggregated')) return 'aggregated';
    return 'derived';
  }

  // === GESTIÓN DE CACHE ===

  updateCaches() {
    this.updateElementCache();
    this.updateRelationshipCache();
  }

     // NUEVO: Verificar cambios de padre para un elemento específico
   checkElementParentChange(elementId) {
     try {
       
       const element = this.getElementFromRegistry(elementId);
       if (!element) {
         return;
       }

       const cachedParentId = this.elementCache.get(elementId) ? this.elementCache.get(elementId).parentId : null;
       const cachedParentElement = cachedParentId ? this.getElementFromRegistry(cachedParentId) : null;
       const cachedParentIsPPI = cachedParentElement ? this.isPPIElement(cachedParentElement) : false;
       const currentHasPPIParent = this.hasPPIParent(element);
       const currentParentPPI = this.findParentPPI(element);
       const currentParentId = element.parent ? element.parent.id : null;


       // Solo procesar si hay un cambio real en la relación PPI
       if (cachedParentIsPPI !== currentHasPPIParent) {
         
         // Actualizar cache
         this.updateElementInCache(element);
         
         // Si el elemento tenía un padre PPI pero ahora no tiene, limpiar de todos los PPIs
         if (cachedParentIsPPI && !currentHasPPIParent) {
           this.clearChildInfoFromAllPPIs(elementId);
         }
         
         // Procesar el cambio inmediatamente (sin cola para cambios de padre)
         this.handleParentChange({
           elementId: elementId,
           oldParentId: cachedParentIsPPI ? cachedParentId : null,
           newParentId: currentHasPPIParent ? (currentParentPPI ? currentParentPPI.elementId : null) : null
         });
       } else {
       }
     } catch (error) {
     }
   }

           // NUEVO: Verificar todos los elementos hijo para cambios de padre
    checkAllParentChanges() {
      try {
        // Obtener modelador del nuevo sistema o fallback a window
        const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
        
        if (!modeler) return;

        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        // Buscar todos los elementos que pueden ser hijos de PPI
        const ppiChildElements = allElements.filter(element => this.isPPIChildElement(element));

        // Para cada elemento hijo, verificar si tiene padre PPI
        ppiChildElements.forEach(element => {
          const hasPPIParent = this.hasPPIParent(element);
          
          if (hasPPIParent) {
            // Si tiene padre PPI, actualizar la información del PPI padre
            const parentPPI = this.findParentPPI(element);
            if (parentPPI) {
              this.updatePPIWithChildInfo(parentPPI.elementId, element.id);
            }
          } else {
            // Si no tiene padre PPI, limpiar de todos los PPIs
            this.clearChildInfoFromAllPPIs(element.id);
          }
        });

        // También verificar elementos huérfanos que podrían haber perdido su padre PPI
        this.checkOrphanedElements();

        // Actualizar la UI inmediatamente
        this.syncUI();
        

      } catch (error) {
      }
    }

  updateElementCache() {
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
    
    if (!modeler) return;
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // NUEVO: Preservar información histórica del cache
    const oldCache = new Map(this.elementCache);
    
    // Limpiar cache actual
    this.elementCache.clear();
    
    // Actualizar con elementos actuales
    allElements.forEach(element => {
      this.updateElementInCache(element);
    });
    
    // NUEVO: Preservar información de elementos que ya no existen pero tenían padres PPI
    oldCache.forEach((oldInfo, elementId) => {
      // Si el elemento ya no existe en el canvas pero tenía un padre PPI, preservar esa información
      if (!this.elementCache.has(elementId) && oldInfo.parentId) {
        const oldParentElement = this.getElementFromRegistry(oldInfo.parentId);
        if (oldParentElement && this.isPPIElement(oldParentElement)) {
          this.elementCache.set(elementId, {
            ...oldInfo,
            // Marcar como elemento que ya no existe
            exists: false,
            lastUpdated: Date.now()
          });
        }
      }
    });
  }

  // NUEVO: Actualizar un elemento específico en el cache
  updateElementInCache(element) {
    this.elementCache.set(element.id, {
      id: element.id,
      type: element.type,
      parentId: element.parent ? element.parent.id : null,
      businessObject: element.businessObject ? {
        $type: element.businessObject.$type,
        name: element.businessObject.name
      } : null,
      exists: true, // NUEVO: Marcar como elemento que existe actualmente
      lastUpdated: Date.now()
    });
  }

  updateRelationshipCache() {
    this.relationshipCache.clear();
    
    this.core.ppis.forEach(ppi => {
      if (ppi.elementId) {
        const children = this.getChildElements(ppi.elementId);
        this.relationshipCache.set(ppi.elementId, children);
      }
    });
  }

  getChildElements(parentId) {
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
    
    if (!modeler) return [];
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    return allElements.filter(element => 
      element.parent && element.parent.id === parentId && this.isPPIChildElement(element)
    );
  }

           // === SINCRONIZACIÓN DE UI ===

    syncUI() {
      
      try {
        // Forzar actualización completa de la lista de PPIs
        if (this.ui && this.ui.refreshPPIList) {
          this.ui.refreshPPIList();
        } else {
        }
        
        // Guardar estado inmediatamente
        if (this.core && this.core.savePPINOTElements) {
          this.core.savePPINOTElements();
        }
        
      } catch (error) {
      }
    }

  // === AUTO-SYNC ===

  startAutoSync() {
    if (!this.syncConfig.autoSync) {
      // Marcar como deshabilitado si no está configurado para auto sync
      if (this.ui && typeof this.ui.setSyncDisabled === 'function') {
        this.ui.setSyncDisabled('Sincronización automática deshabilitada');
      }
      return;
    }
    
    // Marcar como activo
    if (this.ui && typeof this.ui.setSyncActive === 'function') {
      this.ui.setSyncActive();
    }
    
    this.syncTimer = setInterval(() => {
      if (!this.syncState.isSyncing && this.syncState.pendingChanges.size === 0) {
        this.performFullSync();
      }
    }, this.syncConfig.syncInterval);
  }

  stopAutoSync() {
    if (this.syncTimer) {
      clearInterval(this.syncTimer);
      this.syncTimer = null;
    }
    
    // Marcar como deshabilitado
    if (this.ui && typeof this.ui.setSyncDisabled === 'function') {
      this.ui.setSyncDisabled('Sincronización detenida');
    }
  }

  async performFullSync() {
    
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
    
    if (!modeler) return;
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Sincronizar PPIs
    const ppiElements = allElements.filter(element => this.isPPIElement(element));
    ppiElements.forEach(element => {
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
      if (!existingPPI) {
        this.ppiManager.createPPIFromElement(element.id);
      }
    });
    
    // Sincronizar elementos hijos
    const childElements = allElements.filter(element => this.isPPIChildElement(element));
    childElements.forEach(element => {
      const parentPPI = this.findParentPPI(element);
      if (parentPPI) {
        this.updatePPIWithChildInfo(parentPPI.elementId, element.id);
      }
    });
    
    // NUEVO: Verificar cambios de padre
    this.checkAllParentChanges();
    
    // Actualizar cache
    this.updateCaches();
    
    // Actualizar UI
    this.syncUI();
    
  }

  // === MÉTODOS PÚBLICOS ===

  forceSync() {
    this.performFullSync();
  }

     // NUEVO: Forzar verificación de cambios de padre
   forceCheckParentChanges() {
     this.checkAllParentChanges();
   }

   // NUEVO: Forzar sincronización rápida de padres
   forceQuickParentSync() {
     this.performQuickParentSync();
   }

   // NUEVO: Método para forzar verificación después de drop
   forceDropCheck() {
     setTimeout(() => {
       this.checkAllParentChanges();
     }, 100);
     
     setTimeout(() => {
       this.checkAllParentChanges();
     }, 300);
     
     setTimeout(() => {
       this.checkAllParentChanges();
     }, 500);
   }

     // NUEVO: Sincronización inteligente que verifica cambios de padre
   async performSmartSync() {
     
     // Obtener modelador del nuevo sistema o fallback a window
     const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
     
     if (!modeler) return;
     
     // Primero verificar cambios de padre (más rápido)
     this.checkAllParentChanges();
     
     // Luego realizar sincronización normal
     await this.performFullSync();
     
   }

   // NUEVO: Sincronización rápida solo para cambios de padre
   performQuickParentSync() {
     
     // Obtener modelador del nuevo sistema o fallback a window
     const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
     
     if (!modeler) return;
     
     // Solo verificar cambios de padre y actualizar UI
     this.checkAllParentChanges();
     this.syncUI();
     
   }

   // NUEVO: Método más robusto para detectar elementos que dejaron de ser hijos
   checkOrphanedElements() {
     
     // Obtener modelador del nuevo sistema o fallback a window
     const modeler = this.adapter ? this.adapter.getBpmnModeler() : window.modeler;
     
     if (!modeler) {
       return;
     }
     
     // NUEVO: Iterar sobre el cache en lugar de elementos actuales
     // Esto nos permite encontrar elementos que WERE PPI children pero ya no lo son
     
     let orphanedCount = 0;
     
     // Iterar sobre todos los elementos en el cache
     this.elementCache.forEach((cachedInfo, elementId) => {
       
       // Verificar si el elemento aún existe en el canvas
       const currentElement = this.getElementFromRegistry(elementId);
       if (!currentElement) {
         // NUEVO: Si el elemento no existe pero tenía un padre PPI, limpiarlo de todos los PPIs
         if (cachedInfo.parentId) {
           const oldParentElement = this.getElementFromRegistry(cachedInfo.parentId);
           if (oldParentElement && this.isPPIElement(oldParentElement)) {
             this.clearChildInfoFromAllPPIs(elementId);
             orphanedCount++;
           }
         }
         return; // Skip elements that no longer exist
       }
       
       // Verificar si el elemento es del tipo que puede ser hijo de PPI
       if (!this.isPPIChildElement(currentElement)) {
         return; // Skip elements that can't be PPI children
       }
       
       const cachedParentId = cachedInfo.parentId;
       const cachedParentElement = cachedParentId ? this.getElementFromRegistry(cachedParentId) : null;
       const cachedParentIsPPI = cachedParentElement ? this.isPPIElement(cachedParentElement) : false;
       const currentHasPPIParent = this.hasPPIParent(currentElement);
       
       
       // Si el elemento tenía un padre PPI en el cache pero ahora no tiene padre PPI
       if (cachedParentIsPPI && !currentHasPPIParent) {
         
         // Limpiar de todos los PPIs
         this.clearChildInfoFromAllPPIs(elementId);
         
         // Actualizar cache
         this.updateElementInCache(currentElement);
         
         orphanedCount++;
       } else {
       }
     });
     
     if (orphanedCount > 0) {
       // Forzar actualización de UI
       this.syncUI();
     } else {
     }
   }

  getSyncStatus() {
    return {
      isSyncing: this.syncState.isSyncing,
      lastSyncTime: this.syncState.lastSyncTime,
      pendingChanges: this.syncState.pendingChanges.size,
      queueLength: this.syncState.syncQueue.length,
      elementCacheSize: this.elementCache.size,
      relationshipCacheSize: this.relationshipCache.size
    };
  }

  enableAutoSync() {
    this.syncConfig.autoSync = true;
    this.startAutoSync();
  }

  disableAutoSync() {
    this.syncConfig.autoSync = false;
    this.stopAutoSync();
  }

  // === LIMPIEZA ===

  destroy() {
    this.stopAutoSync();
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.syncState.pendingChanges.clear();
    this.syncState.syncQueue = [];
    this.elementCache.clear();
    this.relationshipCache.clear();
    
  }
}

// Exportar para uso global (temporal para compatibilidad)
if (typeof window !== 'undefined') {
  window.PPISyncManager = PPISyncManager;
  
  // NUEVO: Exponer método para verificación manual
  window.forcePPIDropCheck = () => {
    if (window.ppiManagerInstance && window.ppiManagerInstance.syncManager) {
      window.ppiManagerInstance.syncManager.forceDropCheck();
    }
  };
}

// Registrar en ServiceRegistry si está disponible
setTimeout(() => {
  try {
    // Intentar acceder al ServiceRegistry global
    if (typeof window !== 'undefined' && window.serviceRegistry) {
      window.serviceRegistry.register('PPISyncManager', PPISyncManager, {
        description: 'Gestor de sincronización de PPIs'
      });
      console.log('✅ PPISyncManager registrado en ServiceRegistry');
    }
  } catch (error) {
    console.log('ℹ️ ServiceRegistry no disponible para PPISyncManager');
  }
}, 0);