// === PPI Manager - Main Controller ===
// Controlador principal que une la funcionalidad core con la UI

class PPIManager {
  constructor() {
    // Verificar que las dependencias estén disponibles
    if (typeof PPICore === 'undefined') {
      throw new Error('PPICore no está disponible. Asegúrate de cargar ppi-core.js primero.');
    }
    if (typeof PPIUI === 'undefined') {
      throw new Error('PPIUI no está disponible. Asegúrate de cargar ppi-ui.js primero.');
    }
    
    // Inicializar componentes
    this.core = new PPICore();
    this.ui = new PPIUI(this.core);
    
    // Inicializar
    this.init();
  }

  init() {
    this.setupCanvasDetection();
    this.ui.init();
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
    try {
      const canvasContainer = document.querySelector('.djs-container');
      if (!canvasContainer) {
        console.log('⚠️ Canvas container no encontrado, reintentando...');
        setTimeout(() => this.setupDOMObserver(), 1000);
        return;
      }

      console.log('✅ Canvas container encontrado, configurando observer');
      
      const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              const elementId = node.getAttribute ? node.getAttribute('data-element-id') : null;
              if (elementId && elementId.toLowerCase().includes('target')) {
                console.log('🎯 TARGET DETECTADO EN DOM:', elementId);
                this.checkForPPIElements(node);
              }
            }
          });
        });
      });

      observer.observe(canvasContainer, {
        childList: true,
        subtree: true,
        characterData: true
      });

      console.log('👀 DOM Observer configurado correctamente');
    } catch (error) {
      console.warn('⚠️ Error configurando DOM observer:', error);
    }
  }

  setupBpmnEventListeners() {
    try {
      const eventBus = window.modeler.get('eventBus');
      
      eventBus.on('element.changed', (event) => {
        if (this.core.isPPIElement(event.element)) {
          this.updatePPIFromElement(event.element);
        }
      });

      eventBus.on('directEditing.deactivate', (event) => {
        if (this.core.isPPIElement(event.element)) {
          setTimeout(() => {
            this.updatePPIFromElement(event.element);
          }, 200);
        }
      });

      eventBus.on('commandStack.postExecuted', (event) => {
        if (event.context && event.context.element && this.core.isPPIElement(event.context.element)) {
          setTimeout(() => {
            this.updatePPIFromElement(event.context.element);
          }, 100);
        }
      });

      // Verificación periódica
      setInterval(() => {
        this.checkAllPPIElements();
      }, 3000);

      console.log('✅ Eventos BPMN configurados');
    } catch (error) {
      console.warn('⚠️ Error configurando eventos BPMN:', error);
    }
  }

  // === PPI ELEMENT DETECTION ===
  
  checkForPPIElements(element) {
    try {
      if (!element.getAttribute) return;
      
      const elementId = element.getAttribute('data-element-id');
      if (!elementId) return;
      
      const isPPIElement = elementId.includes('Ppi');
      const isPPIChild = elementId.toLowerCase().includes('target') || 
        elementId.toLowerCase().includes('scope') || 
        elementId.toLowerCase().includes('measure') || 
        elementId.toLowerCase().includes('medida') ||
        elementId.toLowerCase().includes('condition') ||
        elementId.toLowerCase().includes('data');
      
      if (elementId.toLowerCase().includes('target')) {
        console.log('🎯 TARGET DETECTADO:', elementId);
      }
      
      if (!isPPIElement && !isPPIChild) return;
      
      if (isPPIChild) {
        this.handlePPIChildElement(elementId);
        return;
      }
      
      if (isPPIElement) {
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
      const isTarget = childElementId.toLowerCase().includes('target');
      const isScope = childElementId.toLowerCase().includes('scope');
      
      if (isTarget || isScope) {
        console.log(`🎯 PROCESANDO ${isTarget ? 'TARGET' : 'SCOPE'}:`, childElementId);
      }
      
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const ppiElements = allElements.filter(el => el.id && el.id.includes('Ppi') && 
        !el.id.toLowerCase().includes('target') && 
        !el.id.toLowerCase().includes('scope') && 
        !el.id.toLowerCase().includes('measure') &&
        !el.id.toLowerCase().includes('condition') &&
        !el.id.toLowerCase().includes('data') &&
        (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
      );
      
      let parentPPIElement = null;
      for (const ppiEl of ppiElements) {
        if (childElementId.startsWith(ppiEl.id)) {
          parentPPIElement = ppiEl;
          break;
        }
      }
      
      if (!parentPPIElement && ppiElements.length > 0) {
        parentPPIElement = ppiElements[ppiElements.length - 1];
        if (isTarget || isScope) {
          console.log(`🎯 Usando PPI más reciente como padre:`, parentPPIElement.id);
        }
      }
      
      if (parentPPIElement) {
        this.updatePPIWithChildInfo(parentPPIElement.id, childElementId);
      }
      
    } catch (error) {
      console.warn('❌ Error manejando elemento hijo PPI:', error);
    }
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    try {
      const isTarget = childElementId.toLowerCase().includes('target');
      const isScope = childElementId.toLowerCase().includes('scope');
      
      if (isTarget || isScope) {
        console.log(`🎯 Actualizando PPI con ${isTarget ? 'TARGET' : 'SCOPE'}:`, childElementId);
      }
      
      const existingPPI = this.core.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) return;
      
      let childInfo = this.core.extractChildElementInfo(childElementId);
      const updatedData = { ...childInfo, updatedAt: new Date().toISOString() };
      
      if (this.core.updatePPI(existingPPI.id, updatedData)) {
        if (isTarget || isScope) {
          console.log(`✅ PPI actualizado con ${isTarget ? 'TARGET' : 'SCOPE'}:`, childInfo);
        }
        this.ui.refreshPPIList();
      }
      
    } catch (error) {
      console.warn('❌ Error actualizando PPI con información del hijo:', error);
    }
  }

  checkAllPPIElements() {
    try {
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const ppiChildren = allElements.filter(element => element.id && 
        (element.id.toLowerCase().includes('target') || element.id.toLowerCase().includes('scope'))
      );
      
      ppiChildren.forEach((element) => {
        this.handlePPIChildElement(element.id);
      });
      
      const ppiElements = allElements.filter(element => this.core.isPPIElement(element));
      
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
    console.log('🔍 DEBUG: Búsqueda manual de elementos TARGET');
    
    if (window.modeler) {
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const targetElements = allElements.filter(el => el.id && el.id.toLowerCase().includes('target'));
      console.log(`🎯 Elementos TARGET en Registry: ${targetElements.length}`);
      targetElements.forEach((element, index) => {
        console.log(`  ${index + 1}. ${element.id} (type: ${element.type})`);
        console.log(`    - businessObject.$type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
        console.log(`    - businessObject.name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      });
    }
  }

  forceAnalyzePPIChildren() {
    console.log('🔍 FORZANDO ANÁLISIS DE TARGETS');
    
    if (!window.modeler) {
      console.log('❌ window.modeler no disponible');
      return;
    }
    
    const elementRegistry = window.modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    const targetElements = allElements.filter(element => 
      element.id && element.id.toLowerCase().includes('target')
    );
    
    console.log(`🎯 TARGETS ENCONTRADOS: ${targetElements.length}`);
    targetElements.forEach((element, index) => {
      console.log(`${index + 1}. ${element.id}`);
      console.log(`   - Type: ${element.type}`);
      console.log(`   - $type: ${element.businessObject ? element.businessObject.$type : 'N/A'}`);
      console.log(`   - Name: ${element.businessObject ? element.businessObject.name : 'N/A'}`);
      console.log(`   🔄 Procesando como hijo de PPI...`);
      this.handlePPIChildElement(element.id);
      console.log('   ---');
    });
  }

  // Compatibility Methods
  getAllPPIs() {
    return this.core.getAllPPIs();
  }

  getPPIsForElement(elementId) {
    return this.core.getPPIsForElement(elementId);
  }

  setupFileUpload() {
    console.log('📁 setupFileUpload llamado (función de compatibilidad)');
  }
}

// Inicialización
try {
  const ppiManagerInstance = new PPIManager();
  
  // Guardar la instancia globalmente
  window.ppiManagerInstance = ppiManagerInstance;
  window.ppiManager = ppiManagerInstance;
  
  // Funciones de debug globales
  window.debugPPI = () => ppiManagerInstance.debugSearchPPIElements();
  window.forceAnalyzePPIChildren = () => ppiManagerInstance.forceAnalyzePPIChildren();
  
  console.log('✅ PPI Manager inicializado - Arquitectura modular');
} catch (error) {
  console.error('❌ Error inicializando PPI Manager:', error);
} 