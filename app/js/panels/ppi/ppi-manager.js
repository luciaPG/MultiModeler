// === PPI Manager - Main Controller ===
// Controlador principal que une la funcionalidad core con la UI

class PPIManager {
  constructor() {
    // Verificar que las dependencias estén disponibles
    if (typeof window.PPICore === 'undefined') {
      throw new Error('PPICore no está disponible. Asegúrate de cargar ppi-core.js primero.');
    }
    if (typeof window.PPIUI === 'undefined') {
      throw new Error('PPIUI no está disponible. Asegúrate de cargar ppi-ui.js primero.');
    }
    
    // Inicializar componentes
    this.core = new window.PPICore();
    this.ui = new window.PPIUI(this.core);
    
    // Inicializar sincronización mejorada
    this.syncManager = null;
    this.syncUI = null;
    
    // Inicializar
    this.init();
  }

  init() {
    this.setupCanvasDetection();
    this.ui.init();
    
    // Inicializar sincronización mejorada cuando el modeler esté disponible
    this.setupSyncManager();
  }

  // === BPMN INTEGRATION ===
  
  setupCanvasDetection() {
    console.log('🔧 setupCanvasDetection iniciado');
    let attempts = 0;
    const maxAttempts = 20;
    
    const checkModeler = () => {
      attempts++;
      console.log(`🔍 Intento ${attempts}/${maxAttempts} - Verificando window.modeler:`, !!window.modeler);
      
      const possibleModelers = ['modeler', 'bpmnModeler', 'viewer', 'bpmnViewer'];
      let foundModeler = null;
      
      for (const name of possibleModelers) {
        if (window[name]) {
          console.log(`✅ Encontrado modeler como window.${name}:`, window[name]);
          foundModeler = window[name];
          window.modeler = foundModeler;
          break;
        }
      }
      
      if (foundModeler || window.modeler) {
        console.log('✅ Modeler encontrado, configurando listeners');
        this.setupBpmnEventListeners();
        this.setupDOMObserver();
        this.setupSyncManager();
        return;
      }
      
      if (attempts <= 3) {
        const windowKeys = Object.keys(window).filter(key => 
          key.toLowerCase().includes('model') || 
          key.toLowerCase().includes('bpmn') || 
          key.toLowerCase().includes('viewer')
        );
        console.log('🔍 Objetos relacionados encontrados en window:', windowKeys);
      }
      
      if (attempts < maxAttempts) {
        console.log('⏳ Modeler no encontrado, reintentando en 1000ms');
        setTimeout(checkModeler, 1000);
      } else {
        console.warn('❌ Modeler no encontrado después de', maxAttempts, 'intentos. Continuando sin detección automática.');
        console.log('🔧 Puedes usar window.debugPPI() manualmente para buscar PPIs');
      }
    };
    checkModeler();
  }

  setupDOMObserver() {
    // NOTA: DOM Observer deshabilitado para refresco manual
    // Solo se mantiene la función por compatibilidad
    console.log('👀 DOM Observer deshabilitado (refresco manual)');
  }

  setupSyncManager() {
    try {
      if (!window.modeler) {
        console.log('⏳ Modeler no disponible para sync manager, reintentando...');
        setTimeout(() => this.setupSyncManager(), 1000);
        return;
      }

      if (typeof window.PPISyncManager === 'undefined') {
        console.warn('⚠️ PPISyncManager no disponible, cargando...');
        // Intentar cargar el archivo si no está disponible
        this.loadSyncManagerScript();
        return;
      }

      if (!this.syncManager) {
        console.log('🔄 Inicializando PPISyncManager...');
        this.syncManager = new window.PPISyncManager(this);
        console.log('✅ PPISyncManager inicializado correctamente');
        
        // Inicializar UI de sincronización
        this.setupSyncUI();
      }
    } catch (error) {
      console.error('❌ Error configurando sync manager:', error);
    }
  }

  loadSyncManagerScript() {
    // Prevent multiple loading attempts
    if (document.querySelector('script[src="js/panels/ppi/ppi-sync-manager.js"]')) {
      console.log('⏳ PPISyncManager ya está cargando...');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `js/panels/ppi/ppi-sync-manager.js?v=${Date.now()}`;
    script.onload = () => {
      console.log('✅ PPISyncManager cargado, configurando...');
      setTimeout(() => this.setupSyncManager(), 100);
    };
    script.onerror = () => {
      console.error('❌ Error cargando PPISyncManager');
    };
    document.head.appendChild(script);
  }

  setupSyncUI() {
    try {
      if (typeof window.PPISyncUI === 'undefined') {
        console.warn('⚠️ PPISyncUI no disponible, cargando...');
        this.loadSyncUIScript();
        return;
      }

      if (!this.syncUI) {
        console.log('🔄 Inicializando PPISyncUI...');
        this.syncUI = new window.PPISyncUI(this);
        console.log('✅ PPISyncUI inicializado correctamente');
      }
    } catch (error) {
      console.error('❌ Error configurando sync UI:', error);
    }
  }

  loadSyncUIScript() {
    // Prevent multiple loading attempts
    if (document.querySelector('script[src="js/panels/ppi/ppi-sync-ui.js"]')) {
      console.log('⏳ PPISyncUI ya está cargando...');
      return;
    }
    
    const script = document.createElement('script');
    script.src = `js/panels/ppi/ppi-sync-ui.js?v=${Date.now()}`;
    script.onload = () => {
      console.log('✅ PPISyncUI cargado, configurando...');
      setTimeout(() => this.setupSyncUI(), 100);
    };
    script.onerror = () => {
      console.error('❌ Error cargando PPISyncUI');
    };
    document.head.appendChild(script);
  }

  setupBpmnEventListeners() {
    try {
      const eventBus = window.modeler.get('eventBus');
      
      // Solo mantener listeners esenciales para eliminación de PPIs
      eventBus.on('element.removed', (event) => {
        // Check if the removed element is a PPI and remove it from the list
        if (event.element && this.core.isPPIElement(event.element)) {
          console.log(`🗑️ PPI eliminado del canvas: ${event.element.id}`);
          this.removePPIFromList(event.element.id);
        }
      });

      console.log('✅ Listeners BPMN simplificados configurados (refresco manual)');
    } catch (error) {
      console.error('❌ Error configurando listeners BPMN:', error);
    }
  }

  // === PPI ELEMENT DETECTION ===
  // NOTA: Estas funciones ya no se usan con el refresco manual
  // Se mantienen por compatibilidad pero no se ejecutan automáticamente
  
  /*
  checkForPPIElements(element) {
    try {
      if (!element.getAttribute) return;
      
      const elementId = element.getAttribute('data-element-id');
      if (!elementId) return;
      
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const bpmnElement = elementRegistry.get(elementId);
      
      if (!bpmnElement) return;
      
      // Verificar si es un PPI principal
      const isPPIElement = bpmnElement.type === 'PPINOT:Ppi' || 
                          (bpmnElement.businessObject && bpmnElement.businessObject.$type === 'PPINOT:Ppi');
      
      // Verificar si es un elemento hijo de PPI usando la lógica de PPINOT
      const isPPIChild = bpmnElement.parent && 
        bpmnElement.parent.type === 'PPINOT:Ppi' &&
        (bpmnElement.type === 'PPINOT:Scope' || 
         bpmnElement.type === 'PPINOT:Target' ||
         bpmnElement.type === 'PPINOT:Measure' ||
         bpmnElement.type === 'PPINOT:Condition');
      
      if (isPPIChild) {
        console.log('🎯 ELEMENTO HIJO PPI DETECTADO:', elementId, 'Tipo:', bpmnElement.type);
        this.handlePPIChildElement(elementId);
        return;
      }
      
      if (isPPIElement) {
        console.log('📊 PPI PRINCIPAL DETECTADO:', elementId);
        
        if (this.core.processedElements.has(elementId)) return;
        
        const existingPPI = this.core.ppis.find(ppi => ppi.elementId === elementId);
        if (existingPPI) {
          this.core.processedElements.add(elementId);
          return;
        }
        
        this.core.processedElements.add(elementId);
        setTimeout(() => this.createPPIFromElement(elementId), 300);
      }
    } catch (error) {
      console.warn('❌ Error verificando elemento PPI:', error);
    }
  }

  handlePPIChildElement(childElementId) {
    try {
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        console.warn('❌ Elemento hijo no encontrado:', childElementId);
        return;
      }
      
      // Verificar si es hijo de un PPI usando la lógica de PPINOT
      if (childElement.parent && childElement.parent.type === 'PPINOT:Ppi') {
        console.log(`🎯 Elemento hijo ${childElementId} detectado como hijo de PPI ${childElement.parent.id}`);
        this.updatePPIWithChildInfo(childElement.parent.id, childElementId);
      } else {
        console.log(`⚠️ Elemento ${childElementId} no es hijo de PPI`);
      }
      
    } catch (error) {
      console.warn('❌ Error manejando elemento hijo PPI:', error);
    }
  }
  */

  // === SCOPE AND TARGET SPECIFIC HANDLING ===
  // NOTA: Sincronización automática de target y scope deshabilitada
  /*
  handleScopeTargetChange(element) {
    try {
      console.log(`🔄 Cambio detectado en ${element.type}: ${element.id}`);
      
      // Eliminado: sincronización automática de target/scope
      // if (element.parent && element.parent.type === 'PPINOT:Ppi') {
      //   this.updatePPIWithChildInfo(element.parent.id, element.id);
      // } else {
      //   // If the element no longer has a parent PPI, we need to clear the corresponding field
      //   this.clearPPIChildInfo(element);
      // }
      
      // Force canvas refresh to ensure new rendering takes effect
      setTimeout(() => {
        this.forceCanvasRefresh();
      }, 100);
      
    } catch (error) {
      console.warn('❌ Error manejando cambio de scope/target:', error);
    }
  }

  handleScopeTargetRemoval(element) {
    try {
      console.log(`🗑️ Eliminación detectada de ${element.type}: ${element.id}`);
      
      // Eliminado: sincronización automática de target/scope
      // this.clearPPIChildInfo(element);
      
    } catch (error) {
      console.warn('❌ Error manejando eliminación de scope/target:', error);
    }
  }

  handleScopeTargetParentChange(element, oldParent, newParent) {
    try {
      console.log(`🔄 Cambio de padre detectado para ${element.type}: ${element.id}`);
      console.log(`  - Padre anterior: ${oldParent ? oldParent.id : 'none'}`);
      console.log(`  - Padre nuevo: ${newParent ? newParent.id : 'none'}`);
      
      // Eliminado: sincronización automática de target/scope
      // if (oldParent && oldParent.type === 'PPINOT:Ppi') {
      //   this.clearPPIChildInfo(element, oldParent.id);
      // }
      
      // if (newParent && newParent.type === 'PPINOT:Ppi') {
      //   this.updatePPIWithChildInfo(newParent.id, element.id);
      // }
      
      // Force canvas refresh to ensure new rendering takes effect
      setTimeout(() => {
        this.forceCanvasRefresh();
      }, 100);
      
    } catch (error) {
      console.warn('❌ Error manejando cambio de padre de scope/target:', error);
    }
  }
  */

  clearPPIChildInfo(element, specificParentId = null) {
    try {
      const elementType = element.type;
      
      // Use the core method to clear child info
      const clearedCount = this.core.clearPPIChildInfo(elementType, specificParentId);
      
      if (clearedCount > 0) {
        this.ui.refreshPPIList();
        this.core.debouncedSavePPINOTElements();
        console.log(`✅ Limpiada información de ${elementType} de ${clearedCount} PPIs`);
      }
      
    } catch (error) {
      console.warn('❌ Error limpiando información de hijo PPI:', error);
    }
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    try {
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        console.warn('❌ Elemento hijo no encontrado:', childElementId);
        return;
      }
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
        console.warn('❌ PPI padre no encontrado:', parentPPIId);
        return;
      }
      
      // Extraer información basada en el tipo de elemento
      let updatedData = { updatedAt: new Date().toISOString() };
      
      if (childElement.type === 'PPINOT:Target') {
        const targetName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.target = targetName;
        console.log(`🎯 Actualizando TARGET del PPI ${parentPPIId}:`, targetName);
      } else if (childElement.type === 'PPINOT:Scope') {
        const scopeName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.scope = scopeName;
        console.log(`🎯 Actualizando SCOPE del PPI ${parentPPIId}:`, scopeName);
      } else if (childElement.type === 'PPINOT:Measure') {
        const measureName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.measureDefinition = {
          type: this.core.detectMeasureType(childElementId, childElement.type),
          definition: measureName
        };
        console.log(`📏 Actualizando MEASURE del PPI ${parentPPIId}:`, measureName);
      } else if (childElement.type === 'PPINOT:Condition') {
        const conditionName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.businessObjective = conditionName;
        console.log(`📋 Actualizando CONDITION del PPI ${parentPPIId}:`, conditionName);
      }
      
      if (this.core.updatePPI(existingPPI.id, updatedData)) {
        console.log(`✅ PPI ${parentPPIId} actualizado exitosamente`);
        this.ui.refreshPPIList();
        // Guardar elementos PPINOT después de actualizar
        this.core.debouncedSavePPINOTElements();
      }
      
    } catch (error) {
      console.warn('❌ Error actualizando PPI con información del hijo:', error);
    }
  }

  // NOTA: Esta función ya no se usa con el refresco manual
  /*
  checkAllPPIElements() {
    try {
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Buscar elementos hijos de PPI usando la lógica de PPINOT
      const ppiChildren = allElements.filter(element => 
        element.parent && 
        element.parent.type === 'PPINOT:Ppi' &&
        (element.type === 'PPINOT:Scope' || 
         element.type === 'PPINOT:Target' ||
         element.type === 'PPINOT:Measure' ||
         element.type === 'PPINOT:Condition')
      );
      
      console.log(`🎯 Encontrados ${ppiChildren.length} elementos hijos de PPI`);
      ppiChildren.forEach((element) => {
        console.log(`  - ${element.id} (${element.type}) hijo de ${element.parent.id}`);
        this.handlePPIChildElement(element.id);
      });
      
      // Buscar PPIs principales
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      console.log(`📊 Encontrados ${ppiElements.length} PPIs principales`);
      ppiElements.forEach(element => {
        const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
        if (!existingPPI && !this.core.processedElements.has(element.id)) {
          this.core.processedElements.add(element.id);
          this.createPPIFromElement(element.id);
        } else if (existingPPI) {
          let currentName = element.id;
          if (element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
            currentName = element.businessObject.name.trim();
          }
          
          if (currentName !== existingPPI.title) {
            this.updatePPIFromElement(element);
          }
        }
      });
    } catch (error) {
      console.warn('⚠️ Error en verificación periódica:', error);
    }
  }
  */

  createPPIFromElement(elementId) {
    try {
      let elementName = elementId;
      
      if (window.modeler) {
        const elementRegistry = window.modeler.get('elementRegistry');
        const element = elementRegistry.get(elementId);
        
        if (element && element.businessObject && element.businessObject.name) {
          elementName = element.businessObject.name;
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
        comments: `PPI generado automáticamente desde elemento: ${elementName}`,
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
      console.error('❌ Error creando PPI:', error);
    }
  }

  updatePPIFromElement(element) {
    try {
      const elementId = element.id;
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === elementId);
      if (!existingPPI) return;
      
      let newTitle = elementId;
      if (element.businessObject && element.businessObject.name && element.businessObject.name.trim()) {
        newTitle = element.businessObject.name.trim();
      }
      
      if (newTitle === existingPPI.title) return;
      
      const updatedData = {
        title: newTitle,
        updatedAt: new Date().toISOString()
      };
      
      if (this.core.updatePPI(existingPPI.id, updatedData)) {
        this.updatePPIElementInDOM(existingPPI.id, updatedData);
        this.ui.refreshPPIList();
      }
    } catch (error) {
      console.error('❌ Error actualizando PPI:', error);
    }
  }

  updatePPIElementInDOM(ppiId, updatedData) {
    try {
      const ppiElement = document.querySelector(`[data-ppi-id="${ppiId}"]`);
      if (!ppiElement) return;

      if (updatedData.title) {
        const titleElement = ppiElement.querySelector('.ppi-title');
        if (titleElement) {
          titleElement.textContent = updatedData.title;
        }
      }
    } catch (error) {
      console.warn('⚠️ Error actualizando DOM:', error);
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
      // Remove from core PPIs list
      const index = this.core.ppis.findIndex(ppi => ppi.elementId === ppiId);
      if (index !== -1) {
        this.core.ppis.splice(index, 1);
        this.core.savePPIs();
        console.log(`🗑️ PPI removido de la lista: ${ppiId}`);
        
        // Refresh the UI
        this.ui.refreshPPIList();
      }
    } catch (error) {
      console.error('❌ Error removiendo PPI de la lista:', error);
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

  // Debug Methods
  debugSearchPPIElements() {
    console.log('🔍 DEBUG: Búsqueda manual de elementos PPI');
    
    if (window.modeler) {
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Buscar elementos hijos de PPI
      const ppiChildren = allElements.filter(element => 
        element.parent && 
        element.parent.type === 'PPINOT:Ppi' &&
        (element.type === 'PPINOT:Scope' || 
         element.type === 'PPINOT:Target' ||
         element.type === 'PPINOT:Measure' ||
         element.type === 'PPINOT:Condition')
      );
      
      console.log(`🎯 Elementos hijo PPI en Registry: ${ppiChildren.length}`);
      ppiChildren.forEach((element, index) => {
        console.log(`  ${index + 1}. ${element.id} (${element.type})`);
        console.log(`    - Padre: ${element.parent.id}`);
        console.log(`    - businessObject.$type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
        console.log(`    - businessObject.name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      });
      
      // Buscar PPIs principales
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      console.log(`📊 PPIs principales en Registry: ${ppiElements.length}`);
      ppiElements.forEach((element, index) => {
        console.log(`  ${index + 1}. ${element.id} (${element.type})`);
        console.log(`    - businessObject.$type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
        console.log(`    - businessObject.name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      });
    }
  }

  forceAnalyzePPIChildren() {
    console.log('🔍 FORZANDO ANÁLISIS DE ELEMENTOS HIJO PPI');
    
    if (!window.modeler) {
      console.log('❌ window.modeler no disponible');
      return;
    }
    
    const elementRegistry = window.modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Buscar elementos hijos de PPI usando la lógica de PPINOT
    const ppiChildren = allElements.filter(element => 
      element.parent && 
      element.parent.type === 'PPINOT:Ppi' &&
      (element.type === 'PPINOT:Scope' || 
       element.type === 'PPINOT:Target' ||
       element.type === 'PPINOT:Measure' ||
       element.type === 'PPINOT:Condition')
    );
    
    console.log(`🎯 ELEMENTOS HIJO PPI ENCONTRADOS: ${ppiChildren.length}`);
    ppiChildren.forEach((element, index) => {
      console.log(`${index + 1}. ${element.id} (${element.type})`);
      console.log(`   - Padre: ${element.parent.id}`);
      console.log(`   - $type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
      console.log(`   - Name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      console.log(`   🔄 Procesando como hijo de PPI...`);
      this.handlePPIChildElement(element.id);
      console.log('   ---');
    });
    
    // También buscar PPIs principales que no estén procesados
    const ppiElements = allElements.filter(element => 
      element.type === 'PPINOT:Ppi' || 
      (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
    );
    
    console.log(`📊 PPIs PRINCIPALES ENCONTRADOS: ${ppiElements.length}`);
    ppiElements.forEach((element, index) => {
      console.log(`${index + 1}. ${element.id}`);
      console.log(`   - Type: ${element.type}`);
      console.log(`   - $type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
      console.log(`   - Name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === element.id);
      if (!existingPPI && !this.core.processedElements.has(element.id)) {
        console.log(`   🔄 Creando PPI desde elemento...`);
        this.core.processedElements.add(element.id);
        this.createPPIFromElement(element.id);
      } else if (existingPPI) {
        console.log(`   ✅ PPI ya existe: ${existingPPI.title}`);
      }
      console.log('   ---');
    });
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
    console.log('📁 setupFileUpload llamado (función de compatibilidad)');
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
      
      console.log('PPI event listeners setup completed');
    } catch (error) {
      console.warn('Error setting up PPI event listeners:', error);
    }
  }

  createSamplePPIs() {
    // Create some sample PPIs for testing if none exist
    if (this.core.ppis.length === 0) {
      console.log('Creating sample PPIs for testing...');
      
      const samplePPIs = [
        {
          id: 'sample_ppi_1',
          title: 'Tiempo de Procesamiento',
          process: 'Proceso de Pedidos',
          businessObjective: 'Reducir el tiempo de procesamiento de pedidos',
          measureDefinition: {
            type: 'time',
            definition: 'Tiempo desde la recepción hasta la confirmación'
          },
          target: '24 horas',
          scope: 'Todos los pedidos estándar',
          source: 'Sistema de gestión de pedidos',
          responsible: 'Equipo de logística',
          informed: ['Gerente de operaciones'],
          comments: 'PPI crítico para la satisfacción del cliente',
          elementId: 'sample_element_1',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'sample_ppi_2',
          title: 'Tasa de Completitud',
          process: 'Proceso de Facturación',
          businessObjective: 'Asegurar que todos los pedidos sean facturados correctamente',
          measureDefinition: {
            type: 'count',
            definition: 'Número de facturas generadas vs pedidos procesados'
          },
          target: '95%',
          scope: 'Pedidos completados',
          source: 'Sistema de facturación',
          responsible: 'Equipo de contabilidad',
          informed: ['Director financiero'],
          comments: 'Indicador de calidad del proceso',
          elementId: 'sample_element_2',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      samplePPIs.forEach(ppi => {
        this.core.addPPI(ppi);
      });
      
      console.log('Sample PPIs created:', this.core.ppis.length);
      this.refreshPPIList();
    }
  }

  // === PPINOT RESTORATION ===
  
  restorePPINOTElements() {
    try {
      if (!window.modeler) {
        console.log('⏳ Modeler no disponible, reintentando restauración...');
        setTimeout(() => this.restorePPINOTElements(), 1000);
        return;
      }

      console.log('🔄 Iniciando restauración de elementos PPINOT...');
      
      // Restaurar elementos (esto ya incluye cargar relaciones desde XML)
      const restored = this.core.restorePPINOTElements();
      if (restored) {
        console.log('✅ Elementos PPINOT restaurados exitosamente');
        // NOTA: No forzar análisis automático - usar refresco manual
        console.log('💡 Usa el botón de refresco manual para actualizar las relaciones');
      }
    } catch (error) {
      console.warn('⚠️ Error restaurando elementos PPINOT:', error);
    }
  }

  // === DEBUG FUNCTIONS ===
  
  // Función global para debugging del estado PPINOT
  debugPPINOTState() {
    console.log('🔍 Debugging PPINOT state from PPIManager...');
    this.core.debugPPINOTState();
  }

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
      console.log('✅ Auto-sync habilitado');
    } else {
      console.warn('⚠️ Sync manager no disponible');
    }
  }

  disableAutoSync() {
    if (this.syncManager) {
      this.syncManager.disableAutoSync();
      console.log('⏸️ Auto-sync deshabilitado');
    } else {
      console.warn('⚠️ Sync manager no disponible');
    }
  }

  forceSync() {
    if (this.syncManager) {
      this.syncManager.performSmartSync();
      console.log('🔄 Sincronización inteligente iniciada');
    } else {
      console.warn('⚠️ Sync manager no disponible, usando refresco manual');
      this.refreshPPINOTRelationships();
    }
  }

  // NUEVO: Forzar verificación de cambios de padre
  forceCheckParentChanges() {
    if (this.syncManager) {
      this.syncManager.forceCheckParentChanges();
      console.log('🔍 Verificación de cambios de padre iniciada');
    } else {
      console.warn('⚠️ Sync manager no disponible');
    }
  }

  // NUEVO: Sincronización rápida de padres
  forceQuickParentSync() {
    if (this.syncManager) {
      this.syncManager.forceQuickParentSync();
      console.log('⚡ Sincronización rápida de padres iniciada');
    } else {
      console.warn('⚠️ Sync manager no disponible');
    }
  }

  // NUEVO: Verificar elementos huérfanos
  forceCheckOrphanedElements() {
    if (this.syncManager) {
      this.syncManager.checkOrphanedElements();
      console.log('🔍 Verificación de elementos huérfanos iniciada');
    } else {
      console.warn('⚠️ Sync manager no disponible');
    }
  }

  // Función global para forzar restauración completa (para debugging)
  forceRestorePPINOTElements() {
    console.log('🔄 Forzando restauración completa de elementos PPINOT...');
    
    // Limpiar elementos procesados para permitir reprocesamiento
    this.core.processedElements.clear();
    
    // Cargar elementos PPINOT nuevamente
    this.core.loadPPINOTElements();
    
    // Restaurar elementos
    this.restorePPINOTElements();
    
    // NOTA: No forzar análisis automático - usar refresco manual
    console.log('💡 Usa el botón de refresco manual para actualizar las relaciones');
  }

  // Función global para debugging
  debugParentChildRelationships() {
    if (!window.modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }
    
    const elementRegistry = window.modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    console.log('🔍 Analizando relaciones padre-hijo en el canvas...');
    
    const ppiElements = allElements.filter(el => el.type === 'PPINOT:Ppi');
    const childElements = allElements.filter(el => 
      el.type === 'PPINOT:Target' || 
      el.type === 'PPINOT:Scope' || 
      el.type === 'PPINOT:Measure' || 
      el.type === 'PPINOT:Condition'
    );
    
    console.log(`📊 Encontrados ${ppiElements.length} PPIs y ${childElements.length} elementos hijos`);
    
    ppiElements.forEach(ppi => {
      console.log(`\n🎯 PPI: ${ppi.id}`);
      const children = childElements.filter(child => 
        child.parent && child.parent.id === ppi.id
      );
      console.log(`   Hijos: ${children.length}`);
      children.forEach(child => {
        console.log(`   - ${child.type}: ${child.id} (${(child.businessObject && child.businessObject.name) || 'sin nombre'})`);
      });
    });
    
    // Verificar elementos hijos sin padre
    const orphanedChildren = childElements.filter(child => !child.parent);
    if (orphanedChildren.length > 0) {
      console.log(`\n⚠️ Elementos hijos sin padre: ${orphanedChildren.length}`);
      orphanedChildren.forEach(child => {
        console.log(`   - ${child.type}: ${child.id} (${(child.businessObject && child.businessObject.name) || 'sin nombre'})`);
      });
    }
  }

  // Función global para cargar relaciones desde XML
  loadPPINOTRelationshipsFromXML() {
    console.log('🔄 Cargando relaciones PPINOT desde XML...');
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
    console.log('💾 Forzando guardado inmediato de elementos PPINOT...');
    this.core.forceSavePPINOTElements();
  }

  // BPMN Integration Methods
  savePPIs() {
    this.core.savePPIs();
  }

  linkToBpmnElement(ppiId, elementId, linkType = 'direct') {
    const ppi = this.core.getPPI(ppiId);
    if (!ppi) {
      console.error('PPI no encontrado:', ppiId);
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
      console.log('🔄 Iniciando refresco manual de relaciones PPINOT...');
      
      if (!window.modeler) {
        console.warn('⚠️ Modeler no disponible');
        this.ui.showMessage('Modeler no disponible', 'warning');
        return;
      }

      // Usar el nuevo sistema de sincronización si está disponible
      if (this.syncManager) {
        console.log('🔄 Usando sistema de sincronización mejorado...');
        this.syncManager.forceSync();
        this.ui.showSuccessMessage('Sincronización completada con el nuevo sistema');
        return;
      }

      // Fallback al método anterior
      console.log('🔄 Usando método de refresco anterior...');
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Limpiar todos los PPIs existentes
      console.log('🧹 Limpiando PPIs existentes...');
      this.core.ppis.length = 0;
      this.core.processedElements.clear();
      
      // Buscar todos los PPIs principales
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      console.log(`📊 Encontrados ${ppiElements.length} PPIs principales`);
      
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
      
      console.log(`🎯 Encontrados ${ppiChildren.length} elementos hijos de PPI`);
      
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
      
      console.log('✅ Refresco manual de relaciones PPINOT completado');
      this.ui.showSuccessMessage(`Refresco completado: ${ppiElements.length} PPIs, ${ppiChildren.length} elementos hijos`);
      
    } catch (error) {
      console.error('❌ Error en refresco manual de relaciones PPINOT:', error);
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
      
      console.log(`🔄 Forzando refresh de ${scopeTargetElements.length} elementos scope/target`);
      
      scopeTargetElements.forEach(element => {
        try {
          // Force re-render by triggering a change event
          const eventBus = window.modeler.get('eventBus');
          eventBus.fire('element.changed', { element: element });
        } catch (error) {
          console.warn(`⚠️ Error refrescando elemento ${element.id}:`, error);
        }
      });
      
      console.log('✅ Refresh de canvas completado');
    } catch (error) {
      console.warn('❌ Error forzando refresh de canvas:', error);
    }
  }
}

// === GLOBAL EXPOSURE FOR DEBUGGING ===
// Exponer métodos globalmente para debugging
if (typeof window !== 'undefined') {
  // Wait for ppiManager to be available
  const exposeMethods = () => {
    if (window.ppiManager) {
      // Existing methods
      window.forceRestorePPINOTElements = () => window.ppiManager.forceRestorePPINOTElements();
      window.debugParentChildRelationships = () => window.ppiManager.debugParentChildRelationships();
      window.loadPPINOTRelationshipsFromXML = () => window.ppiManager.loadPPINOTRelationshipsFromXML();
      window.forceSavePPINOTElements = () => window.ppiManager.forceSavePPINOTElements();
      window.debugPPINOTState = () => window.ppiManager.debugPPINOTState();
      window.testPPINOTRestoration = () => window.ppiManager.testPPINOTRestoration();
      window.testPPINOTSave = () => window.ppiManager.testPPINOTSave();
      
      // New methods for scope/target handling
      window.forceCanvasRefresh = () => window.ppiManager.forceCanvasRefresh();
      window.refreshPPINOTRelationships = () => window.ppiManager.refreshPPINOTRelationships();
      window.handleScopeTargetChange = (elementId) => {
        if (window.modeler) {
          const element = window.modeler.get('elementRegistry').get(elementId);
          if (element) {
            window.ppiManager.handleScopeTargetChange(element);
          }
        }
      };
      window.clearPPIChildInfo = (elementId) => {
        if (window.modeler) {
          const element = window.modeler.get('elementRegistry').get(elementId);
          if (element) {
            window.ppiManager.clearPPIChildInfo(element);
          }
        }
      };
      
      // New sync manager methods
      window.getSyncStatus = () => window.ppiManager.getSyncStatus();
      window.enableAutoSync = () => window.ppiManager.enableAutoSync();
      window.disableAutoSync = () => window.ppiManager.disableAutoSync();
      window.forceSync = () => window.ppiManager.forceSync();
      window.forceCheckParentChanges = () => window.ppiManager.forceCheckParentChanges();
      window.forceQuickParentSync = () => window.ppiManager.forceQuickParentSync();
      window.forceCheckOrphanedElements = () => window.ppiManager.forceCheckOrphanedElements();
      window.debugSyncStatus = () => {
        const status = window.ppiManager.getSyncStatus();
        console.log('🔍 Estado de sincronización:', status);
        return status;
      };
      window.debugParentChanges = () => {
        if (window.ppiManager.syncManager) {
          window.ppiManager.syncManager.checkAllParentChanges();
        } else {
          console.warn('⚠️ Sync manager no disponible');
        }
      };
      
      console.log('✅ Métodos de debugging PPI expuestos globalmente');
    } else {
      setTimeout(exposeMethods, 100);
    }
  };
  
  exposeMethods();
}

// Inicialización automática comentada - se inicializa desde index.js
// try {
//   const ppiManagerInstance = new PPIManager();
//   
//   // Guardar la instancia globalmente
//   window.ppiManagerInstance = ppiManagerInstance;
//   window.ppiManager = ppiManagerInstance;
//   
//   // Funciones de debug globales
//   window.debugPPI = () => ppiManagerInstance.debugSearchPPIElements();
//   window.forceAnalyzePPIChildren = () => ppiManagerInstance.forceAnalyzePPIChildren();
//   window.forceRestorePPINOT = () => ppiManagerInstance.forceRestorePPINOTElements();
//   
//   console.log('✅ PPI Manager inicializado - Arquitectura modular');
// } catch (error) {
//   console.error('❌ Error inicializando PPI Manager:', error);
// } 

// Exportar para uso global
window.PPIManager = PPIManager;

// Funciones globales para debugging
window.forceRestorePPINOT = function() {
  if (window.ppiManager) {
    window.ppiManager.forceRestorePPINOTElements();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.debugPPINOTRelationships = function() {
  if (window.ppiManager) {
    window.ppiManager.debugParentChildRelationships();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.loadPPINOTFromXML = function() {
  if (window.ppiManager) {
    window.ppiManager.loadPPINOTRelationshipsFromXML();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.forceSavePPINOT = function() {
  if (window.ppiManager) {
    window.ppiManager.forceSavePPINOTElements();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.debugPPINOTState = function() {
  if (window.ppiManager) {
    window.ppiManager.debugPPINOTState();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.testPPINOTRestoration = function() {
  if (window.ppiManager) {
    console.log('🧪 Probando restauración PPINOT...');
    window.ppiManager.debugPPINOTState();
    window.ppiManager.restorePPINOTElements();
  } else {
    console.error('❌ ppiManager no disponible');
  }
};

window.testPPINOTSave = function() {
  if (window.ppiManager) {
    console.log('🧪 Probando guardado PPINOT...');
    window.ppiManager.forceSavePPINOTElements();
    window.ppiManager.debugPPINOTState();
  } else {
    console.error('❌ ppiManager no disponible');
  }
}; 