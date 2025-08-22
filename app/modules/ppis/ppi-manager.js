class PPIManager {
  constructor() {
    if (typeof window.PPICore === 'undefined') {
      throw new Error('PPICore no está disponible. Asegúrate de cargar ppi-core.js primero.');
    }
    if (typeof window.PPIUI === 'undefined') {
      throw new Error('PPIUI no está disponible. Asegúrate de cargar ppi-ui.js primero.');
    }
    
    this.core = new window.PPICore();
    this.ui = new window.PPIUI(this.core);
    this.syncManager = null;
    this.syncUI = null;
    
    this.init();
  }

  init() {
    this.setupCanvasDetection();
    this.ui.init();

    this.setupSyncManager();
  }

  // === BPMN INTEGRATION ===
  
  setupCanvasDetection() {
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkModeler = () => {
      attempts++;
      
      const possibleModelers = ['modeler', 'bpmnModeler', 'viewer', 'bpmnViewer'];
      let foundModeler = null;
      
      for (const name of possibleModelers) {
        if (window[name]) {
          foundModeler = window[name];
          window.modeler = foundModeler;
          break;
        }
      }
      
      if (foundModeler || window.modeler) {
        this.setupBpmnEventListeners();
        this.setupDOMObserver();
        this.setupSyncManager();
        return;
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkModeler, 1000);
      }
    };
    checkModeler();
  }

  setupDOMObserver() {
 
  }

  setupSyncManager() {
    try {
      if (!window.modeler) {
        setTimeout(() => this.setupSyncManager(), 1000);
        return;
      }

      if (typeof window.PPISyncManager === 'undefined') {
        this.loadSyncManagerScript();
        return;
      }

      if (!this.syncManager) {
       
        this.syncManager = new window.PPISyncManager(this);
       
        
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
  
    
    const script = document.createElement('script');
    script.src = `js/panels/ppi/ppi-sync-manager.js?v=${Date.now()}`;
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
      if (typeof window.PPISyncUI === 'undefined') {
        this.loadSyncUIScript();
        return;
      }

      if (!this.syncUI) {
        this.syncUI = new window.PPISyncUI(this);
      }
    } catch (error) {
      // Error configurando sync UI
    }
  }

  loadSyncUIScript() {
    // Prevent multiple loading attempts
    if (document.querySelector('script[src="js/panels/ppi/ppi-sync-ui.js"]')) {
      return;
    }
    
    const script = document.createElement('script');
    script.src = `js/panels/ppi/ppi-sync-ui.js?v=${Date.now()}`;
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
      if (!window.modeler) {
        console.warn(`[PPI-Manager] window.modeler no disponible`);
        return;
      }
      
      const eventBus = window.modeler.get('eventBus');
      console.log(`[PPI-Manager] EventBus obtenido:`, eventBus);
      
      // Listener para eliminación de PPIs del canvas
      eventBus.on('element.removed', (event) => {
        if (event.element && this.core.isPPIElement(event.element)) {
          this.removePPIFromList(event.element.id);
        }
      });

      // Listener para adición de PPIs al canvas
      eventBus.on('element.added', (event) => {
        const element = event.element;
        if (element && this.core.isPPIElement(element)) {
          const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
          if (!existingPPI) {
            setTimeout(() => this.createPPIFromElement(element.id), 100);
          }
        }
      });

      // Listener para cambios en elementos PPI del canvas
      eventBus.on('element.changed', (event) => {
        console.log('📝 Element changed event:', event);
        const element = event.element;
        if (element && this.core.isPPIElement(element)) {
          console.log('📝 PPI element changed:', element.id, element.businessObject && element.businessObject.name);
          this.updatePPIFromElement(element);
        }
      });

      // Listener adicional para cambios de propiedades
      eventBus.on('commandStack.element.updateProperties.executed', (event) => {
        console.log('📝 Properties updated event:', event);
        const element = event.context && event.context.element;
        if (element && this.core.isPPIElement(element)) {
          console.log('📝 PPI properties updated:', element.id, element.businessObject && element.businessObject.name);
          setTimeout(() => this.updatePPIFromElement(element), 50);
        }
      });

      // Listener para cambios en el modelo
      eventBus.on('shape.changed', (event) => {
        console.log('📝 Shape changed event:', event);
        const element = event.element;
        if (element && this.core.isPPIElement(element)) {
          console.log('📝 PPI shape changed:', element.id, element.businessObject && element.businessObject.name);
          this.updatePPIFromElement(element);
        }
      });

      // Listener para selección de elementos en el canvas
      eventBus.on('selection.changed', (event) => {
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
            this.ui.clearPPISelection();
          }
        } else {
          // Si no hay selección o hay múltiples elementos, limpiar la selección
          console.log(`[PPI-Manager] Múltiples elementos o sin selección, limpiando`);
          this.ui.clearPPISelection();
        }
      });
    } catch (error) {
      // Error configurando listeners BPMN
    }
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
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        return;
      }
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
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
      }
      
    } catch (error) {
      // Error actualizando PPI con información del hijo
    }
  }



  createPPIFromElement(elementId) {
    try {
      let elementName = elementId;
      
      if (window.modeler) {
        const elementRegistry = window.modeler.get('elementRegistry');
        const element = elementRegistry.get(elementId);
        
        if (element && element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
          elementName = element.businessObject.name.trim();
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
      this.ui.showSuccessMessage(`PPI creado: ${elementName}`);
      this.ui.refreshPPIList();
      // Guardar elementos PPINOT después de crear
      this.core.debouncedSavePPINOTElements();
    } catch (error) {
      // Error creando PPI
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

    const formData = new FormData(form);
    const ppiData = this.core.parseFormData(formData);
    

    
    if (ppiId) {
      // Update existing PPI
      if (this.core.updatePPI(ppiId, ppiData)) {
        document.getElementById('ppi-modal').remove();
        this.ui.showSuccessMessage('PPI actualizado exitosamente');
        this.ui.refreshPPIList();
      } else {
        this.ui.showMessage('Error al actualizar el PPI', 'error');
      }
    } else {
      // Create new PPI
      const ppi = this.core.createPPI(ppiData);
      this.core.addPPI(ppi);
      document.getElementById('ppi-modal').remove();
      this.ui.showSuccessMessage('PPI creado exitosamente');
      this.ui.refreshPPIList();
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
    this.ui.refreshPPIList();
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
      if (!window.modeler) {
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
      if (!window.modeler) {
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
      const elementRegistry = window.modeler.get('elementRegistry');
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
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      
      // Force refresh all scope and target elements
      const scopeTargetElements = elementRegistry.getAll().filter(element => 
        element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target'
      );
      
      scopeTargetElements.forEach(element => {
        try {
          // Force re-render by triggering a change event
          const eventBus = window.modeler.get('eventBus');
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

      if (!window.modeler) {
        console.warn('Modeler no disponible para selección');
        return;
      }

      const elementRegistry = window.modeler.get('elementRegistry');
      const selection = window.modeler.get('selection');
      
      const element = elementRegistry.get(ppi.elementId);
      if (element) {
        // Seleccionar el elemento en el canvas
        selection.select(element);
        
        // Hacer zoom hacia el elemento si está disponible
        try {
          const canvas = window.modeler.get('canvas');
          if (canvas && typeof canvas.zoom === 'function') {
            canvas.zoom('fit-viewport', element);
          }
        } catch (zoomError) {
          // Si el zoom falla, al menos intentar scrollTo
          try {
            const canvas = window.modeler.get('canvas');
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

// Exportar para uso global
window.PPIManager = PPIManager;

 