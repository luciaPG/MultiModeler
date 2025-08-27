// === BPMN Integration Module ===
// Módulo para integrar PPIs con elementos BPMN
// Permite vincular PPIs a tareas, eventos y otros elementos del diagrama

class BpmnIntegration {
  constructor(ppiManager, bpmnModeler) {
    this.ppiManager = ppiManager;
    this.bpmnModeler = bpmnModeler;
    this.selectedElements = new Set();
    this.linkingMode = false;
    this.currentLinkingPPI = null;
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.setupContextMenu();
    this.setupElementSelection();
  }

  setupEventListeners() {
    if (!this.bpmnModeler) return;

    // Escuchar selección de elementos
    this.bpmnModeler.on('selection.changed', (event) => {
      this.handleSelectionChange(event);
    });

    // Escuchar cambios en elementos
    this.bpmnModeler.on('element.changed', (event) => {
      this.handleElementChange(event);
    });

    // Escuchar eliminación de elementos
    this.bpmnModeler.on('element.removed', (event) => {
      this.handleElementRemoval(event);
    });

    // Escuchar clics en elementos
    this.bpmnModeler.on('element.click', (event) => {
      this.handleElementClick(event);
    });
  }

  setupContextMenu() {
    // Crear menú contextual para elementos BPMN
    this.createContextMenu();
  }

  setupElementSelection() {
    // Configurar selección múltiple para vinculación
    this.setupMultiSelection();
  }

  createContextMenu() {
    const contextMenu = document.createElement('div');
    contextMenu.id = 'bpmn-context-menu';
    contextMenu.className = 'context-menu';
    contextMenu.style.display = 'none';
    
    contextMenu.innerHTML = `
      <div class="context-menu-item" data-action="link-ppi">
        <i class="fas fa-link"></i> Vincular PPI
      </div>
      <div class="context-menu-item" data-action="view-linked-ppis">
        <i class="fas fa-eye"></i> Ver PPIs Vinculados
      </div>
      <div class="context-menu-item" data-action="unlink-ppis">
        <i class="fas fa-unlink"></i> Desvincular PPIs
      </div>
      <div class="context-menu-separator"></div>
      <div class="context-menu-item" data-action="select-element">
        <i class="fas fa-check"></i> Seleccionar para Vinculación
      </div>
    `;
    
    document.body.appendChild(contextMenu);
    
    // Event listeners para el menú contextual
    contextMenu.addEventListener('click', (e) => {
      const action = e.target.closest('.context-menu-item')?.dataset.action;
      if (action) {
        this.handleContextMenuAction(action);
      }
    });
    
    // Cerrar menú al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!contextMenu.contains(e.target)) {
        contextMenu.style.display = 'none';
      }
    });
  }

  setupMultiSelection() {
    // Configurar selección múltiple con Ctrl/Cmd
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        this.enableMultiSelection();
      }
    });
    
    document.addEventListener('keyup', (e) => {
      if (!e.ctrlKey && !e.metaKey) {
        this.disableMultiSelection();
      }
    });
  }

  handleSelectionChange(event) {
    const selection = event.newSelection || [];
    this.selectedElements = new Set(selection.map(element => element.id));
    
    // Actualizar UI de vinculación
    this.updateLinkingUI();
  }

  handleElementChange(event) {
    const element = event.element;
    
    // Actualizar PPIs vinculados si es necesario
    this.updateLinkedPPIs(element);
  }

  handleElementRemoval(event) {
    const element = event.element;
    
    // Limpiar vinculaciones del elemento eliminado
    this.cleanupElementLinks(element.id);
  }

  handleElementClick(event) {
    const element = event.element;
    
    // Mostrar menú contextual en clic derecho
    if (event.originalEvent.button === 2) { // Clic derecho
      this.showContextMenu(event.originalEvent, element);
    }
    
    // Manejar clic izquierdo en elementos PPI
    if (event.originalEvent.button === 0) { // Clic izquierdo
      this.handlePPIElementSelection(element);
    }
  }

  handlePPIElementSelection(element) {
    // Verificar si es un elemento PPI o hijo de PPI
    const isPPIElement = element.type === 'PPINOT:Ppi' || 
                        element.type === 'PPINOT:Scope' || 
                        element.type === 'PPINOT:Target' ||
                        element.type === 'PPINOT:Measure' ||
                        element.type === 'PPINOT:Condition';
    
    if (isPPIElement && this.ppiManager && this.ppiManager.ui && this.ppiManager.ui.setActivePPI) {
      this.ppiManager.ui.setActivePPI(element.id);
    }
  }

  showContextMenu(event, element) {
    const contextMenu = document.getElementById('bpmn-context-menu');
    if (!contextMenu) return;
    
    // Posicionar menú
    contextMenu.style.left = event.pageX + 'px';
    contextMenu.style.top = event.pageY + 'px';
    contextMenu.style.display = 'block';
    
    // Guardar elemento actual
    contextMenu.dataset.elementId = element.id;
    
    // Actualizar opciones del menú
    this.updateContextMenuOptions(element);
  }

  updateContextMenuOptions(element) {
    const contextMenu = document.getElementById('bpmn-context-menu');
    const linkedPPIs = this.ppiManager.getPPIsForElement(element.id);
    
    // Mostrar/ocultar opciones según el estado
    const linkOption = contextMenu.querySelector('[data-action="link-ppi"]');
    const viewOption = contextMenu.querySelector('[data-action="view-linked-ppis"]');
    const unlinkOption = contextMenu.querySelector('[data-action="unlink-ppis"]');
    
    linkOption.style.display = linkedPPIs.length === 0 ? 'block' : 'none';
    viewOption.style.display = linkedPPIs.length > 0 ? 'block' : 'none';
    unlinkOption.style.display = linkedPPIs.length > 0 ? 'block' : 'none';
    
    // Actualizar contador de PPIs vinculados
    if (linkedPPIs.length > 0) {
      viewOption.innerHTML = `<i class="fas fa-eye"></i> Ver PPIs Vinculados (${linkedPPIs.length})`;
    }
  }

  handleContextMenuAction(action) {
    const contextMenu = document.getElementById('bpmn-context-menu');
    const elementId = contextMenu.dataset.elementId;
    
    switch (action) {
      case 'link-ppi':
        this.startLinkingPPI(elementId);
        break;
      case 'view-linked-ppis':
        this.showLinkedPPIs(elementId);
        break;
      case 'unlink-ppis':
        this.unlinkPPIs(elementId);
        break;
      case 'select-element':
        this.selectElementForLinking(elementId);
        break;
    }
    
    contextMenu.style.display = 'none';
  }

  startLinkingPPI(elementId) {
    this.linkingMode = true;
    this.currentLinkingElement = elementId;
    
    // Mostrar selector de PPI
    this.showPPISelector(elementId);
  }

  showPPISelector(elementId) {
    const ppis = this.ppiManager.ppis;
    
    if (ppis.length === 0) {
      this.showMessage('No hay PPIs disponibles para vincular', 'warning');
      return;
    }
    
    // Crear modal de selección de PPI
    const modal = this.createPPISelectorModal(ppis, elementId);
    document.body.appendChild(modal);
  }

  createPPISelectorModal(ppis, elementId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay ppi-selector-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>Vincular PPI a Elemento BPMN</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <p>Selecciona el PPI que deseas vincular al elemento <strong>${elementId}</strong>:</p>
          <div class="ppi-selector-list">
            ${ppis.map(ppi => `
              <div class="ppi-selector-item" data-ppi-id="${ppi.id}">
                <div class="ppi-selector-icon">
                  <i class="${this.ppiManager.measureTypes[ppi.measureDefinition.type].icon}"></i>
                </div>
                <div class="ppi-selector-info">
                  <h5>${ppi.process}</h5>
                  <p>${ppi.businessObjective}</p>
                  <small>${ppi.measureDefinition.type} - ${ppi.target}</small>
                </div>
                <button class="btn btn-sm btn-primary" onclick="bpmnIntegration.linkPPIToElement('${ppi.id}', '${elementId}')">
                  <i class="fas fa-link"></i> Vincular
                </button>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancelar</button>
        </div>
      </div>
    `;
    
    return modal;
  }

  linkPPIToElement(ppiId, elementId) {
    // Determinar tipo de vinculación basado en el tipo de medida
    const ppi = this.ppiManager.ppis.find(p => p.id === ppiId);
    if (!ppi) return;
    
    let linkType = 'element';
    
    switch (ppi.measureDefinition.type) {
      case 'time':
        if (!ppi.bpmnLink.fromEventId) {
          linkType = 'fromEvent';
        } else if (!ppi.bpmnLink.toEventId) {
          linkType = 'toEvent';
        } else {
          linkType = 'relatedElement';
        }
        break;
      case 'count':
        linkType = 'countedElement';
        break;
      case 'state':
        linkType = 'stateElement';
        break;
      case 'data':
        linkType = 'dataElement';
        break;
      default:
        linkType = 'relatedElement';
    }
    
    // Realizar la vinculación
    if (this.ppiManager.linkToBpmnElement(ppiId, elementId, linkType)) {
      this.showSuccessMessage(`PPI vinculado exitosamente a ${elementId}`);
      this.highlightLinkedElement(elementId);
      this.updateElementVisualization(elementId);
    }
    
    // Cerrar modal
    const modal = document.querySelector('.ppi-selector-modal');
    if (modal) modal.remove();
  }

  showLinkedPPIs(elementId) {
    const linkedPPIs = this.ppiManager.getPPIsForElement(elementId);
    
    if (linkedPPIs.length === 0) {
      this.showMessage('No hay PPIs vinculados a este elemento', 'info');
      return;
    }
    
    // Crear modal para mostrar PPIs vinculados
    const modal = this.createLinkedPPIsModal(linkedPPIs, elementId);
    document.body.appendChild(modal);
  }

  createLinkedPPIsModal(linkedPPIs, elementId) {
    const modal = document.createElement('div');
    modal.className = 'modal-overlay linked-ppis-modal';
    
    modal.innerHTML = `
      <div class="modal-content">
        <div class="modal-header">
          <h3>PPIs Vinculados a ${elementId}</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body">
          <div class="linked-ppis-list">
            ${linkedPPIs.map(ppi => `
              <div class="linked-ppi-item">
                <div class="linked-ppi-header">
                  <div class="linked-ppi-icon">
                    <i class="${this.ppiManager.measureTypes[ppi.measureDefinition.type].icon}"></i>
                  </div>
                  <div class="linked-ppi-info">
                    <h5>${ppi.process}</h5>
                    <p>${ppi.businessObjective}</p>
                  </div>
                  <div class="linked-ppi-actions">
                    <button class="btn btn-sm btn-secondary" onclick="ppiManager.viewPPI('${ppi.id}')">
                      <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="bpmnIntegration.unlinkSpecificPPI('${ppi.id}', '${elementId}')">
                      <i class="fas fa-unlink"></i>
                    </button>
                  </div>
                </div>
                <div class="linked-ppi-details">
                  <p><strong>Tipo de Vinculación:</strong> ${this.getLinkTypeDescription(ppi, elementId)}</p>
                  <p><strong>Objetivo:</strong> ${ppi.target}</p>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cerrar</button>
        </div>
      </div>
    `;
    
    return modal;
  }

  getLinkTypeDescription(ppi, elementId) {
    const linkTypes = {
      'fromEvent': 'Evento de Inicio',
      'toEvent': 'Evento de Fin',
      'countedElement': 'Elemento Contado',
      'stateElement': 'Elemento de Estado',
      'dataElement': 'Elemento de Datos',
      'relatedElement': 'Elemento Relacionado'
    };
    
    for (const [key, value] of Object.entries(ppi.bpmnLink)) {
      if (value === elementId) {
        return linkTypes[key] || 'Vinculación';
      }
    }
    
    return 'Vinculación';
  }

  unlinkPPIs(elementId) {
    if (confirm('¿Estás seguro de que quieres desvincular todos los PPIs de este elemento?')) {
      const linkedPPIs = this.ppiManager.getPPIsForElement(elementId);
      
      linkedPPIs.forEach(ppi => {
        // Remover todas las vinculaciones con este elemento
        Object.keys(ppi.bpmnLink).forEach(key => {
          if (ppi.bpmnLink[key] === elementId) {
            delete ppi.bpmnLink[key];
          }
        });
      });
      
      this.ppiManager.savePPIs();
      this.removeElementHighlight(elementId);
      this.showSuccessMessage('PPIs desvinculados exitosamente');
    }
  }

  unlinkSpecificPPI(ppiId, elementId) {
    const ppi = this.ppiManager.ppis.find(p => p.id === ppiId);
    if (!ppi) return;
    
    // Remover vinculación específica
    Object.keys(ppi.bpmnLink).forEach(key => {
      if (ppi.bpmnLink[key] === elementId) {
        delete ppi.bpmnLink[key];
      }
    });
    
    this.ppiManager.savePPIs();
    this.showSuccessMessage('PPI desvinculado exitosamente');
    
    // Actualizar modal si está abierto
    const modal = document.querySelector('.linked-ppis-modal');
    if (modal) {
      modal.remove();
      this.showLinkedPPIs(elementId);
    }
  }

  selectElementForLinking(elementId) {
    if (this.linkingMode && this.currentLinkingPPI) {
      // Vincular PPI actual al elemento seleccionado
      this.linkPPIToElement(this.currentLinkingPPI, elementId);
      this.exitLinkingMode();
    } else {
      // Agregar a selección múltiple
      this.selectedElements.add(elementId);
      this.updateLinkingUI();
    }
  }

  enableMultiSelection() {
    this.multiSelectionMode = true;
    this.updateLinkingUI();
  }

  disableMultiSelection() {
    this.multiSelectionMode = false;
    this.updateLinkingUI();
  }

  updateLinkingUI() {
    // Actualizar indicadores visuales de vinculación
    this.updateElementVisualizations();
  }

  updateElementVisualizations() {
    // Actualizar visualización de todos los elementos seleccionados
    this.selectedElements.forEach(elementId => {
      this.updateElementVisualization(elementId);
    });
  }

  updateElementVisualization(elementId) {
    const element = this.bpmnModeler.get('elementRegistry').get(elementId);
    if (!element) return;
    
    const linkedPPIs = this.ppiManager.getPPIsForElement(elementId);
    
    if (linkedPPIs.length > 0) {
      this.highlightLinkedElement(elementId);
    } else {
      this.removeElementHighlight(elementId);
    }
  }

  highlightLinkedElement(elementId) {
    const element = this.bpmnModeler.get('elementRegistry').get(elementId);
    if (!element) return;
    
    // Agregar clase CSS para resaltado
    const gfx = this.bpmnModeler.get('elementRegistry').getGraphics(elementId);
    if (gfx) {
      gfx.classList.add('ppi-linked');
    }
  }

  removeElementHighlight(elementId) {
    const element = this.bpmnModeler.get('elementRegistry').get(elementId);
    if (!element) return;
    
    // Remover clase CSS de resaltado
    const gfx = this.bpmnModeler.get('elementRegistry').getGraphics(elementId);
    if (gfx) {
      gfx.classList.remove('ppi-linked');
    }
  }

  updateLinkedPPIs(element) {
    // Actualizar PPIs vinculados cuando cambia un elemento
    const linkedPPIs = this.ppiManager.getPPIsForElement(element.id);
    
    linkedPPIs.forEach(ppi => {
      // Marcar PPI como actualizado
      ppi.updatedAt = new Date().toISOString();
    });
    
    this.ppiManager.savePPIs();
  }

  cleanupElementLinks(elementId) {
    // Limpiar todas las vinculaciones cuando se elimina un elemento
    this.ppiManager.cleanupBpmnLinks(elementId);
  }

  exitLinkingMode() {
    this.linkingMode = false;
    this.currentLinkingPPI = null;
    this.currentLinkingElement = null;
    this.updateLinkingUI();
  }

  // Métodos de utilidad
  showSuccessMessage(message) {
    this.ppiManager.showSuccessMessage(message);
  }

  showMessage(message, type) {
    this.ppiManager.showMessage(message, type);
  }

  // Métodos públicos para integración
  getLinkedElements(ppiId) {
    const ppi = this.ppiManager.ppis.find(p => p.id === ppiId);
    if (!ppi || !ppi.bpmnLink) return [];
    
    return Object.values(ppi.bpmnLink);
  }

  getElementInfo(elementId) {
    const element = this.bpmnModeler.get('elementRegistry').get(elementId);
    if (!element) return null;
    
    return {
      id: element.id,
      type: element.type,
      name: element.businessObject?.name || element.id,
      linkedPPIs: this.ppiManager.getPPIsForElement(elementId)
    };
  }

  exportBpmnWithPPIs() {
    // Exportar diagrama BPMN con información de PPIs
    const bpmnXML = this.bpmnModeler.saveXML({ format: true });
    const ppiData = this.ppiManager.exportPPIs();
    
    return {
      bpmn: bpmnXML.xml,
      ppis: ppiData,
      exportDate: new Date().toISOString()
    };
  }
}

// Exportar para uso global (temporal para compatibilidad)
if (typeof window !== 'undefined') {
  window.BpmnIntegration = BpmnIntegration;
}

// Registrar en ServiceRegistry si está disponible
setTimeout(() => {
  try {
    // Intentar acceder al ServiceRegistry global
    if (typeof window !== 'undefined' && window.serviceRegistry) {
      window.serviceRegistry.register('BpmnIntegration', BpmnIntegration, {
        description: 'Integración BPMN con PPIs'
      });
      console.log('✅ BpmnIntegration registrado en ServiceRegistry');
    }
  } catch (error) {
    console.log('ℹ️ ServiceRegistry no disponible para BpmnIntegration');
  }
}, 0); 