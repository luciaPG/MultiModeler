if (typeof window.PPISyncManager === 'undefined') {
class PPISyncManager {
  constructor(ppiManager) {
    this.ppiManager = ppiManager;
    this.core = ppiManager.core;
    this.ui = ppiManager.ui;
    
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
    if (!window.modeler) {
      return;
    }

    const eventBus = window.modeler.get('eventBus');
    
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
    });

    eventBus.on('modeling.updateProperties', (event) => {
      this.handlePropertiesUpdate(event);
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
      }, 50);
    });

    eventBus.on('elements.move', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 50);
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
        }, 50);
      }
    });

    // Eventos adicionales para capturar cambios en el canvas
    eventBus.on('shape.move', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 50);
    });

    eventBus.on('element.updateParent', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 50);
    });

    eventBus.on('modeling.updateProperties', () => {
      setTimeout(() => {
        this.checkAllParentChanges();
      }, 50);
    });
  }

  // === HANDLERS DE EVENTOS ===

  handleElementChange(event) {
    const element = event.element;
    
    if (!element) {
      console.log('🔄 Cambio de elemento sin elemento específico');
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
      console.log('🔄 Eliminación de elemento sin elemento específico');
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
      console.log('🔄 Adición de elemento sin elemento específico');
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
      console.log('🔄 Movimiento de forma sin elemento específico');
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      this.queueSync('child_move', element.id);
    }
  }

  handleElementsMove(event) {
    if (!event.elements || !Array.isArray(event.elements)) {
      console.log('🔄 Movimiento de elementos sin elementos específicos');
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
      console.log('🔄 Movimiento de modelado sin elemento específico');
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      console.log(`🔄 Movimiento detectado: ${element.id} de ${oldParent ? oldParent.id : 'root'} a ${newParent ? newParent.id : 'root'}`);
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
      console.log('🔄 Actualización de padre sin elemento específico');
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      console.log(`🔄 Actualización de padre detectada: ${element.id}`);
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
      console.log('🔄 Actualización de propiedades sin elemento específico');
      return;
    }
    
    if (this.isPPIChildElement(element)) {
      console.log(`🔄 Actualización de propiedades detectada: ${element.id}`);
      this.queueSync('child_change', element.id);
    }
  }

           handleDragEnd(event) {
      console.log('🔄 [DEBUG] handleDragEnd ejecutado');
      const element = event.element;
      
      if (!element) {
        console.log('🔄 [DEBUG] Drag terminado sin elemento específico');
        return;
      }
      
      console.log(`🔄 [DEBUG] Drag terminado para elemento: ${element.id} (tipo: ${element.type})`);
      
      // NUEVO: Siempre verificar cambios de padre después de un drag, no solo para hijos PPI
      // porque el elemento podría haber dejado de ser hijo PPI durante el drag
      setTimeout(() => {
        console.log(`🔄 [DEBUG] Ejecutando verificaciones post-drag para ${element.id}`);
        // Usar checkAllParentChanges que maneja tanto elementos actuales como huérfanos
        this.checkAllParentChanges();
      }, 100); // Aumentar delay para asegurar que el DOM se actualice
    }

           handleDropEnd(event) {
      console.log('🔄 [DEBUG] handleDropEnd ejecutado');
      const element = event.element;
      
      if (!element) {
        console.log('🔄 [DEBUG] Drop terminado sin elemento específico');
        return;
      }
      
      console.log(`🔄 [DEBUG] Drop terminado para elemento: ${element.id} (tipo: ${element.type})`);
      
      // NUEVO: Siempre verificar cambios de padre después de un drop, no solo para hijos PPI
      // porque el elemento podría haber dejado de ser hijo PPI durante el drop
      setTimeout(() => {
        console.log(`🔄 [DEBUG] Ejecutando verificaciones post-drop para ${element.id}`);
        // Usar checkAllParentChanges que maneja tanto elementos actuales como huérfanos
        this.checkAllParentChanges();
      }, 100); // Aumentar delay para asegurar que el DOM se actualice
    }

  handleSelectionChange(event) {
    // No procesar cambios de selección, solo para debugging
    const selection = event.newSelection || [];
    const ppiChildren = selection.filter(element => this.isPPIChildElement(element));
    
    if (ppiChildren.length > 0) {
      console.log(`🎯 Elementos hijo PPI seleccionados: ${ppiChildren.map(el => el.id).join(', ')}`);
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
       console.log(`🔍 [DEBUG] isPPIChildElement: elemento es null/undefined`);
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
     
     console.log(`🔍 [DEBUG] isPPIChildElement(${element.id}): tipo=${element.type}, businessObject.$type=${element.businessObject && element.businessObject.$type}, es hijo=${isChild}`);
     
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
    console.log('🔄 Iniciando sincronización PPINOT...');

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
      console.log('✅ Sincronización PPINOT completada');
      
    } catch (error) {
      console.error('❌ Error en sincronización PPINOT:', error);
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
        console.warn('⚠️ Error procesando cambio:', change, error);
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
        console.warn('⚠️ Error procesando item de cola:', item, error);
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
        console.warn('⚠️ Tipo de cambio desconocido:', type);
    }
  }

  // === MANEJADORES DE CAMBIOS ===

  async handlePPIChange(ppiId) {
    console.log(`🔄 Procesando cambio de PPI: ${ppiId}`);
    
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
    console.log(`🗑️ Procesando eliminación de PPI: ${ppiId}`);
    
    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === ppiId);
    if (existingPPI) {
      this.core.deletePPI(existingPPI.id);
    }
  }

  async handlePPIAddition(ppiId) {
    console.log(`➕ Procesando adición de PPI: ${ppiId}`);
    
    const existingPPI = this.core.ppis.find(ppi => ppi.elementId === ppiId);
    if (existingPPI) return;

    this.ppiManager.createPPIFromElement(ppiId);
  }

  async handleChildChange(childId) {
    console.log(`🔄 Procesando cambio de elemento hijo: ${childId}`);
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

  async handleChildRemoval(childId) {
    console.log(`🗑️ Procesando eliminación de elemento hijo: ${childId}`);
    
    // Limpiar información del hijo de todos los PPIs
    this.clearChildInfoFromAllPPIs(childId);
  }

  async handleChildAddition(childId) {
    console.log(`➕ Procesando adición de elemento hijo: ${childId}`);
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

  async handleChildMove(childId) {
    console.log(`🔄 Procesando movimiento de elemento hijo: ${childId}`);
    
    const element = this.getElementFromRegistry(childId);
    if (!element) return;

    // Buscar PPI padre
    const parentPPI = this.findParentPPI(element);
    if (!parentPPI) return;

    // Actualizar PPI con información del hijo
    this.updatePPIWithChildInfo(parentPPI.elementId, childId);
  }

     async handleParentChange(data) {
     console.log(`🔄 Procesando cambio de padre: ${data.elementId}`);
     
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
    if (!window.modeler) return null;
    
    const elementRegistry = window.modeler.get('elementRegistry');
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
       console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): no tiene padre`);
       return false;
     }
     
     console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): verificando jerarquía...`);
     
     // Verificar padre directo
     if (this.isPPIElement(element.parent)) {
       console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): padre directo es PPI (${element.parent.id})`);
       return true;
     }
     
     // Verificar en la jerarquía
     let currentParent = element.parent;
     let level = 1;
     while (currentParent) {
       console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): nivel ${level} - padre: ${currentParent.id} (tipo: ${currentParent.type})`);
       if (this.isPPIElement(currentParent)) {
         console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): ¡PPI encontrado en nivel ${level}! (${currentParent.id})`);
         return true;
       }
       currentParent = currentParent.parent;
       level++;
     }
     
     console.log(`🔍 [DEBUG] hasPPIParent(${element.id}): no se encontró PPI en la jerarquía`);
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
      console.log(`🎯 Actualizando TARGET del PPI ${parentPPIId}:`, targetName);
    } else if (element.type === 'PPINOT:Scope') {
      const scopeName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.scope = scopeName;
      console.log(`🎯 Actualizando SCOPE del PPI ${parentPPIId}:`, scopeName);
    } else if (element.type === 'PPINOT:Measure') {
      const measureName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.measureDefinition = {
        type: this.detectMeasureType(childElementId, element.type),
        definition: measureName
      };
      console.log(`📏 Actualizando MEASURE del PPI ${parentPPIId}:`, measureName);
    } else if (element.type === 'PPINOT:Condition') {
      const conditionName = (element.businessObject && element.businessObject.name) || childElementId;
      updatedData.businessObjective = conditionName;
      console.log(`📋 Actualizando CONDITION del PPI ${parentPPIId}:`, conditionName);
    }
    
    this.core.updatePPI(existingPPI.id, updatedData);
  }

     clearChildInfoFromAllPPIs(childElementId) {
       console.log(`🔍 [DEBUG] clearChildInfoFromAllPPIs(${childElementId}) iniciado`);
       
       const element = this.getElementFromRegistry(childElementId);
       if (!element) {
         console.log(`🔍 [DEBUG] Elemento ${childElementId} no encontrado`);
         return;
       }

       const elementType = element.type;
       console.log(`🔍 [DEBUG] Tipo de elemento: ${elementType}`);
       console.log(`🔍 [DEBUG] PPIs disponibles: ${this.core.ppis.length}`);
       
       // CORREGIDO: Verificar directamente en todos los PPIs sin depender del cache
       this.core.ppis.forEach(ppi => {
         console.log(`🔍 [DEBUG] Verificando PPI ${ppi.elementId}:`);
         console.log(`  - Target actual: ${ppi.target}`);
         console.log(`  - Scope actual: ${ppi.scope}`);
         
         let updatedData = { updatedAt: new Date().toISOString() };
         let hasChanges = false;
         
         if (elementType === 'PPINOT:Target' && ppi.target) {
           // CORREGIDO: Verificar si el target actual coincide con este elemento
           // El target puede contener el nombre del elemento, no el ID
           const targetName = (element.businessObject && element.businessObject.name) || childElementId;
           
           console.log(`🔍 [DEBUG] Comparando target: PPI tiene "${ppi.target}", elemento es "${targetName}"`);
           
           if (ppi.target === targetName || ppi.target === childElementId) {
             updatedData.target = null;
             hasChanges = true;
             console.log(`🎯 [DEBUG] ¡Limpiando TARGET del PPI ${ppi.elementId}: No definido (era ${ppi.target})`);
           }
         } else if (elementType === 'PPINOT:Scope' && ppi.scope) {
           // CORREGIDO: Verificar si el scope actual coincide con este elemento
           const scopeName = (element.businessObject && element.businessObject.name) || childElementId;
           
           console.log(`🔍 [DEBUG] Comparando scope: PPI tiene "${ppi.scope}", elemento es "${scopeName}"`);
           
           if (ppi.scope === scopeName || ppi.scope === childElementId) {
             updatedData.scope = null;
             hasChanges = true;
             console.log(`🎯 [DEBUG] ¡Limpiando SCOPE del PPI ${ppi.elementId}: No definido (era ${ppi.scope})`);
           }
         }
         
         if (hasChanges) {
           console.log(`🔍 [DEBUG] Actualizando PPI ${ppi.elementId} con cambios`);
           this.core.updatePPI(ppi.id, updatedData);
         } else {
           console.log(`🔍 [DEBUG] PPI ${ppi.elementId} no necesita cambios`);
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
       console.log(`🎯 Limpiando TARGET del PPI ${parentPPIId}: No definido`);
     } else if (element.type === 'PPINOT:Scope') {
       updatedData.scope = null;
       hasChanges = true;
       console.log(`🎯 Limpiando SCOPE del PPI ${parentPPIId}: No definido`);
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
       console.log(`🔍 [DEBUG] Iniciando checkElementParentChange para ${elementId}`);
       
       const element = this.getElementFromRegistry(elementId);
       if (!element) {
         console.log(`🔍 [DEBUG] Elemento ${elementId} no encontrado en registry`);
         return;
       }

       const cachedParentId = this.elementCache.get(elementId) ? this.elementCache.get(elementId).parentId : null;
       const cachedParentElement = cachedParentId ? this.getElementFromRegistry(cachedParentId) : null;
       const cachedParentIsPPI = cachedParentElement ? this.isPPIElement(cachedParentElement) : false;
       const currentHasPPIParent = this.hasPPIParent(element);
       const currentParentPPI = this.findParentPPI(element);
       const currentParentId = element.parent ? element.parent.id : null;

       console.log(`🔍 [DEBUG] ${elementId} - Detalles completos:`);
       console.log(`  - Elemento actual: ${element.id} (tipo: ${element.type})`);
       console.log(`  - Padre actual: ${currentParentId} (tipo: ${element.parent ? element.parent.type : 'null'})`);
       console.log(`  - Padre en cache: ${cachedParentId} (tipo: ${cachedParentElement ? cachedParentElement.type : 'null'})`);
       console.log(`  - Padre cache es PPI: ${cachedParentIsPPI}`);
       console.log(`  - Tiene padre PPI actual: ${currentHasPPIParent}`);
       console.log(`  - PPI padre encontrado: ${currentParentPPI ? currentParentPPI.elementId : 'null'}`);

       // Solo procesar si hay un cambio real en la relación PPI
       if (cachedParentIsPPI !== currentHasPPIParent) {
         console.log(`🔄 [DEBUG] ¡CAMBIO DETECTADO! ${elementId}: tenía PPI=${cachedParentIsPPI}, ahora tiene PPI=${currentHasPPIParent}`);
         
         // Actualizar cache
         this.updateElementInCache(element);
         
         // Si el elemento tenía un padre PPI pero ahora no tiene, limpiar de todos los PPIs
         if (cachedParentIsPPI && !currentHasPPIParent) {
           console.log(`🔄 [DEBUG] ¡ELEMENTO PERDIÓ PADRE PPI! Limpiando de todos los PPIs...`);
           this.clearChildInfoFromAllPPIs(elementId);
         }
         
         // Procesar el cambio inmediatamente (sin cola para cambios de padre)
         this.handleParentChange({
           elementId: elementId,
           oldParentId: cachedParentIsPPI ? cachedParentId : null,
           newParentId: currentHasPPIParent ? (currentParentPPI ? currentParentPPI.elementId : null) : null
         });
       } else {
         console.log(`🔍 [DEBUG] No hay cambio para ${elementId}`);
       }
     } catch (error) {
       console.warn('⚠️ Error verificando cambio de padre:', error);
     }
   }

           // NUEVO: Verificar todos los elementos hijo para cambios de padre
    checkAllParentChanges() {
      try {
        if (!window.modeler) return;

        console.log('🔍 [DEBUG] Iniciando checkAllParentChanges...');

        const elementRegistry = window.modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        // Buscar todos los elementos que pueden ser hijos de PPI
        const ppiChildElements = allElements.filter(element => this.isPPIChildElement(element));
        console.log(`🔍 [DEBUG] Encontrados ${ppiChildElements.length} elementos que pueden ser hijos PPI`);

        // Para cada elemento hijo, verificar si tiene padre PPI
        ppiChildElements.forEach(element => {
          const hasPPIParent = this.hasPPIParent(element);
          console.log(`🔍 [DEBUG] Elemento ${element.id}: tiene padre PPI = ${hasPPIParent}`);
          
          if (!hasPPIParent) {
            // Si no tiene padre PPI, limpiar de todos los PPIs
            console.log(`🔄 [DEBUG] Elemento ${element.id} no tiene padre PPI, limpiando de todos los PPIs...`);
            this.clearChildInfoFromAllPPIs(element.id);
          }
        });

        // Actualizar la UI inmediatamente
        this.syncUI();
        
        console.log('✅ checkAllParentChanges completado');

      } catch (error) {
        console.warn('⚠️ Error verificando cambios de padre:', error);
      }
    }

  updateElementCache() {
    if (!window.modeler) return;
    
    const elementRegistry = window.modeler.get('elementRegistry');
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
          console.log(`🔍 [DEBUG] Preservando información histórica para ${elementId} (era hijo de PPI ${oldInfo.parentId})`);
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
    if (!window.modeler) return [];
    
    const elementRegistry = window.modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    return allElements.filter(element => 
      element.parent && element.parent.id === parentId && this.isPPIChildElement(element)
    );
  }

           // === SINCRONIZACIÓN DE UI ===

    syncUI() {
      console.log('🔄 [DEBUG] Sincronizando UI...');
      
      try {
        // Forzar actualización completa de la lista de PPIs
        if (this.ui && this.ui.refreshPPIList) {
          this.ui.refreshPPIList();
          console.log('🔄 [DEBUG] UI actualizada con refreshPPIList');
        } else {
          console.log('⚠️ [DEBUG] UI no disponible para actualización');
        }
        
        // Guardar estado inmediatamente
        if (this.core && this.core.savePPINOTElements) {
          this.core.savePPINOTElements();
          console.log('🔄 [DEBUG] Estado guardado');
        }
        
      } catch (error) {
        console.warn('⚠️ Error sincronizando UI:', error);
      }
    }

  // === AUTO-SYNC ===

  startAutoSync() {
    if (!this.syncConfig.autoSync) return;
    
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
  }

  async performFullSync() {
    console.log('🔄 Realizando sincronización completa...');
    
    if (!window.modeler) return;
    
    const elementRegistry = window.modeler.get('elementRegistry');
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
    
    console.log('✅ Sincronización completa completada');
  }

  // === MÉTODOS PÚBLICOS ===

  forceSync() {
    console.log('🔄 Forzando sincronización...');
    this.performFullSync();
  }

     // NUEVO: Forzar verificación de cambios de padre
   forceCheckParentChanges() {
     console.log('🔍 Forzando verificación de cambios de padre...');
     this.checkAllParentChanges();
   }

   // NUEVO: Forzar sincronización rápida de padres
   forceQuickParentSync() {
     console.log('⚡ Forzando sincronización rápida de padres...');
     this.performQuickParentSync();
   }

     // NUEVO: Sincronización inteligente que verifica cambios de padre
   async performSmartSync() {
     console.log('🧠 Realizando sincronización inteligente...');
     
     if (!window.modeler) return;
     
     // Primero verificar cambios de padre (más rápido)
     this.checkAllParentChanges();
     
     // Luego realizar sincronización normal
     await this.performFullSync();
     
     console.log('✅ Sincronización inteligente completada');
   }

   // NUEVO: Sincronización rápida solo para cambios de padre
   performQuickParentSync() {
     console.log('⚡ Realizando sincronización rápida de padres...');
     
     if (!window.modeler) return;
     
     // Solo verificar cambios de padre y actualizar UI
     this.checkAllParentChanges();
     this.syncUI();
     
     console.log('✅ Sincronización rápida de padres completada');
   }

   // NUEVO: Método más robusto para detectar elementos que dejaron de ser hijos
   checkOrphanedElements() {
     console.log('🔍 [DEBUG] Iniciando checkOrphanedElements...');
     
     if (!window.modeler) {
       console.log('🔍 [DEBUG] Modeler no disponible');
       return;
     }
     
     // NUEVO: Iterar sobre el cache en lugar de elementos actuales
     // Esto nos permite encontrar elementos que WERE PPI children pero ya no lo son
     console.log(`🔍 [DEBUG] Verificando ${this.elementCache.size} elementos en cache...`);
     
     let orphanedCount = 0;
     
     // Iterar sobre todos los elementos en el cache
     this.elementCache.forEach((cachedInfo, elementId) => {
       console.log(`🔍 [DEBUG] Verificando elemento del cache: ${elementId}`);
       
       // Verificar si el elemento aún existe en el canvas
       const currentElement = this.getElementFromRegistry(elementId);
       if (!currentElement) {
         // NUEVO: Si el elemento no existe pero tenía un padre PPI, limpiarlo de todos los PPIs
         if (cachedInfo.parentId) {
           const oldParentElement = this.getElementFromRegistry(cachedInfo.parentId);
           if (oldParentElement && this.isPPIElement(oldParentElement)) {
             console.log(`🔄 [DEBUG] ¡ELEMENTO ELIMINADO CON PADRE PPI! ${elementId} (era hijo de PPI ${cachedInfo.parentId}, ahora eliminado)`);
             this.clearChildInfoFromAllPPIs(elementId);
             orphanedCount++;
           }
         }
         console.log(`🔍 [DEBUG] Elemento ${elementId} ya no existe en el canvas, procesado si tenía padre PPI`);
         return; // Skip elements that no longer exist
       }
       
       // Verificar si el elemento es del tipo que puede ser hijo de PPI
       if (!this.isPPIChildElement(currentElement)) {
         console.log(`🔍 [DEBUG] Elemento ${elementId} no es del tipo que puede ser hijo PPI, ignorando`);
         return; // Skip elements that can't be PPI children
       }
       
       const cachedParentId = cachedInfo.parentId;
       const cachedParentElement = cachedParentId ? this.getElementFromRegistry(cachedParentId) : null;
       const cachedParentIsPPI = cachedParentElement ? this.isPPIElement(cachedParentElement) : false;
       const currentHasPPIParent = this.hasPPIParent(currentElement);
       
       console.log(`🔍 [DEBUG] ${elementId}:`);
       console.log(`  - Padre en cache: ${cachedParentId} (es PPI: ${cachedParentIsPPI})`);
       console.log(`  - Tiene padre PPI actual: ${currentHasPPIParent}`);
       
       // Si el elemento tenía un padre PPI en el cache pero ahora no tiene padre PPI
       if (cachedParentIsPPI && !currentHasPPIParent) {
         console.log(`🔄 [DEBUG] ¡ELEMENTO HUÉRFANO DETECTADO! ${elementId} (era hijo de PPI ${cachedParentId}, ahora no tiene padre PPI)`);
         
         // Limpiar de todos los PPIs
         this.clearChildInfoFromAllPPIs(elementId);
         
         // Actualizar cache
         this.updateElementInCache(currentElement);
         
         orphanedCount++;
       } else {
         console.log(`🔍 [DEBUG] ${elementId} no es huérfano`);
       }
     });
     
     if (orphanedCount > 0) {
       console.log(`🔄 [DEBUG] Se procesaron ${orphanedCount} elementos huérfanos`);
       // Forzar actualización de UI
       this.syncUI();
     } else {
       console.log(`🔍 [DEBUG] No se encontraron elementos huérfanos`);
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
    
    console.log('🗑️ PPISyncManager destruido');
  }
}

// Exportar para uso global
window.PPISyncManager = PPISyncManager;
} 