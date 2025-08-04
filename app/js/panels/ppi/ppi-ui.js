// === PPI UI Components ===
// Componentes de interfaz de usuario para el gestor de PPIs

if (typeof window.PPIUI === 'undefined') {
  window.PPIUI = class PPIUI {
    constructor(ppiCore) {
      this.core = ppiCore;
      
      // Validar que el core está correctamente inicializado
      if (!this.core || !this.core.measureTypes) {
        console.error('PPIUI: ppiCore no está correctamente inicializado');
        this.core = this.core || {};
        this.core.measureTypes = this.core.measureTypes || {
          derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' }
        };
      }
    }

  // === UI INITIALIZATION ===
  
  init() {
    this.setupEventListeners();
    this.loadPPIs();
    this.refreshPPIList();
  }

  setupEventListeners() {
    // Event listeners for the interface
    const searchInput = document.getElementById('ppi-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterPPIs());
    }
  }

  // === CARD GENERATION ===
  
  createPPIElement(ppi) {
    const div = document.createElement('div');
    div.className = 'ppi-card';
    div.setAttribute('data-ppi-id', ppi.id);
    
    // Asegurar que tenemos un tipo de medida válido
    const measureTypeKey = (ppi.measureDefinition && ppi.measureDefinition.type) || 'derived';
    const measureType = this.core.measureTypes[measureTypeKey] || this.core.measureTypes.derived || {
      name: 'Tipo Desconocido',
      icon: 'fas fa-question-circle'
    };
    const cardTitle = ppi.title || ppi.id;
    
    // Determinar color del tipo
    const typeColors = {
      time: '#4facfe',
      count: '#f093fb',
      state: '#43e97b',
      data: '#a8edea',
      derived: '#667eea',
      aggregated: '#a8edea'
    };
    
    // Calcular progreso/completitud - solo para clase de tarjeta
    const completedFields = [ppi.title, ppi.target, ppi.scope, ppi.responsible].filter(Boolean).length;
    const totalFields = 4;
    const isComplete = completedFields === totalFields;
    
    div.className = `ppi-card ${!isComplete ? 'needs-attention' : ''}`;
    
    div.innerHTML = `
      <div class="card-header">
        <div class="type-indicator" style="--type-color: ${typeColors[measureTypeKey]}">
          <i class="${measureType.icon}"></i>
        </div>
        <div class="header-content">
          <h3 class="card-title" title="${cardTitle}">${this.core.truncateText(cardTitle, 50)}</h3>
          <div class="meta-info">
            <div class="badges-container">
              <!-- Sin badges de completitud -->
            </div>
          </div>
        </div>
        <div class="actions-panel">
          <button class="icon-btn primary" onclick="ppiManager.viewPPI('${ppi.id}')" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
          <button class="icon-btn secondary" onclick="ppiManager.editPPI('${ppi.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-btn danger" onclick="ppiManager.confirmDeletePPI('${ppi.id}')" title="Eliminar">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div class="essential-info">
          <div class="info-line primary">
            <div class="field-group target-group">
              <i class="fas fa-bullseye field-icon target-icon"></i>
              <span class="field-label">Target:</span>
              <span class="field-value target-value" title="${ppi.target || 'No definido'}">
                ${ppi.target?this.core.truncateText(ppi.target || 'No definido', 35):'No definido'}
              </span>
            </div>
            
            <div class="field-group scope-group">
              <i class="fas fa-crosshairs field-icon scope-icon"></i>
              <span class="field-label">Scope:</span>
              <span class="field-value scope-value" title="${ppi.scope || 'Sin scope'}">
                ${this.core.truncateText(ppi.scope || 'Sin scope', 35)}
              </span>
            </div>
            
            <div class="field-group responsible-group">
              <i class="fas fa-user-tie field-icon responsible-icon"></i>
              <span class="field-label">Responsable:</span>
              <span class="field-value responsible-value" title="${ppi.responsible || 'No asignado'}">
                ${this.core.truncateText(ppi.responsible || 'No asignado', 45)}
              </span>
            </div>
          </div>
          
          ${ppi.businessObjective ? `
            <div class="info-line description">
              <div class="description-group">
                <i class="fas fa-lightbulb field-icon description-icon"></i>
                <span class="field-value description-text" title="${ppi.businessObjective}">
                  ${this.core.truncateText(ppi.businessObjective, 140)}
                </span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    return div;
  }

  // Función para actualizar un elemento PPI existente sin recrearlo
  updatePPIElement(element, ppi) {
    
    
    // Calcular datos actualizados
    const completedFields = [ppi.title, ppi.target, ppi.scope, ppi.responsible].filter(Boolean).length;
    const totalFields = 4;
    const isComplete = completedFields === totalFields;
    
    // Actualizar clase del elemento
    element.className = `ppi-card ${!isComplete ? 'needs-attention' : ''}`;
    
    // Actualizar título
    const titleElement = element.querySelector('.card-title');
    if (titleElement) {
      const cardTitle = ppi.title || ppi.id;
      titleElement.textContent = this.core.truncateText(cardTitle, 50);
      titleElement.setAttribute('title', cardTitle);
    }
    
    // Actualizar target - MEJORADO
    const targetElement = element.querySelector('.target-value');
    if (targetElement) {
      const targetText = ppi.target || 'No definido';
      targetElement.textContent = this.core.truncateText(targetText, 35);
      targetElement.setAttribute('title', targetText);
      
      // Añadir indicador visual si el target cambió
      if (ppi.target) {
        targetElement.classList.add('has-value');
        targetElement.style.color = '#28a745'; // Verde para indicar que tiene valor
      } else {
        targetElement.classList.remove('has-value');
        targetElement.style.color = '#6c757d'; // Gris para indicar que no tiene valor
      }
    }
    
    // Actualizar scope - MEJORADO
    const scopeElement = element.querySelector('.scope-value');
    if (scopeElement) {
      const scopeText = ppi.scope || 'Sin scope';
      scopeElement.textContent = this.core.truncateText(scopeText, 35);
      scopeElement.setAttribute('title', scopeText);
      
      // Añadir indicador visual si el scope cambió
      if (ppi.scope) {
        scopeElement.classList.add('has-value');
        scopeElement.style.color = '#28a745'; // Verde para indicar que tiene valor
      } else {
        scopeElement.classList.remove('has-value');
        scopeElement.style.color = '#6c757d'; // Gris para indicar que no tiene valor
      }
    }
    
    // Actualizar responsible
    const responsibleElement = element.querySelector('.responsible-value');
    if (responsibleElement) {
      const responsibleText = ppi.responsible || 'No asignado';
      responsibleElement.textContent = this.core.truncateText(responsibleText, 45);
      responsibleElement.setAttribute('title', responsibleText);
    }
    
    // Actualizar business objective si existe
    const descriptionLine = element.querySelector('.info-line.description');
    if (ppi.businessObjective) {
      if (!descriptionLine) {
        // Crear la sección de descripción si no existe
        const descriptionHTML = `
          <div class="info-line description">
            <div class="description-group">
              <i class="fas fa-lightbulb field-icon description-icon"></i>
              <span class="field-value description-text" title="${ppi.businessObjective}">
                ${this.core.truncateText(ppi.businessObjective, 140)}
              </span>
            </div>
          </div>
        `;
        const essentialInfo = element.querySelector('.essential-info');
        if (essentialInfo) {
          essentialInfo.insertAdjacentHTML('beforeend', descriptionHTML);
        }
      } else {
        // Actualizar descripción existente
        const descriptionText = descriptionLine.querySelector('.description-text');
        if (descriptionText) {
          descriptionText.textContent = this.core.truncateText(ppi.businessObjective, 140);
          descriptionText.setAttribute('title', ppi.businessObjective);
        }
      }
    } else if (descriptionLine) {
      // Remover descripción si ya no hay business objective
      descriptionLine.remove();
    }
    
    // Actualizar botones de acción (en caso de que el ID haya cambiado)
    const viewBtn = element.querySelector('button[onclick*="viewPPI"]');
    const editBtn = element.querySelector('button[onclick*="editPPI"]');
    const deleteBtn = element.querySelector('button[onclick*="confirmDeletePPI"]');
    
    if (viewBtn) viewBtn.setAttribute('onclick', `ppiManager.viewPPI('${ppi.id}')`);
    if (editBtn) editBtn.setAttribute('onclick', `ppiManager.editPPI('${ppi.id}')`);
    if (deleteBtn) deleteBtn.setAttribute('onclick', `ppiManager.confirmDeletePPI('${ppi.id}')`);
    
    // Añadir efecto visual de actualización
    element.style.transition = 'all 0.3s ease';
    element.style.transform = 'scale(1.02)';
    setTimeout(() => {
      element.style.transform = 'scale(1)';
    }, 300);
    

    return element;
  }

  // === LIST MANAGEMENT ===
  
  refreshPPIList() {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    // Use filtered PPIs if available, otherwise use all PPIs
    const ppisToShow = this.core.filteredPPIs.length > 0 ? this.core.filteredPPIs : this.core.ppis;
    

    
    // Crear un mapa de PPIs existentes para evitar recrear elementos innecesariamente
    const existingCards = new Map();
    container.querySelectorAll('.ppi-card[data-ppi-id]').forEach(card => {
      const ppiId = card.getAttribute('data-ppi-id');
      existingCards.set(ppiId, card);
    });
    
 
    
    // Añadir estilos mejorados
    this.addImprovedStyles();
    
    // Crear un fragmento para los nuevos elementos
    const fragment = document.createDocumentFragment();
    const newCards = new Set();
    
    ppisToShow.forEach((ppi, index) => {
      let ppiElement = existingCards.get(ppi.id);
      
      if (ppiElement) {
        // SIEMPRE actualizar el elemento existente para asegurar que los cambios se reflejen
        this.updatePPIElement(ppiElement, ppi);
        
        // Actualizar los datos almacenados
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });
        ppiElement.setAttribute('data-ppi-data', currentData);
        newCards.add(ppi.id);
        

      } else {
        // Crear nuevo elemento
        const newElement = this.createPPIElement(ppi);
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });
        newElement.setAttribute('data-ppi-data', currentData);
        newElement.style.animationDelay = `${index * 0.05}s`;
        fragment.appendChild(newElement);
        newCards.add(ppi.id);
        

      }
    });
    
    // Limpiar elementos que ya no existen
    const elementsToRemove = [];
    existingCards.forEach((card, ppiId) => {
      if (!newCards.has(ppiId)) {
        elementsToRemove.push(card);
      }
    });
    
    elementsToRemove.forEach(element => {
      if (element.parentNode) {
        element.remove();
      }
    });
    
    // Añadir nuevos elementos (solo los que realmente son nuevos)
    const fragmentChildren = Array.from(fragment.children);
    fragmentChildren.forEach(newElement => {
      container.appendChild(newElement);
    });
    

  }

  filterPPIs() {
    const searchInput = document.getElementById('ppi-search');
    const typeSelect = document.getElementById('type-filter');
    const statusSelect = document.getElementById('status-filter');
    
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase();
    const typeFilter = typeSelect ? typeSelect.value : '';
    const statusFilter = statusSelect ? statusSelect.value : '';

    this.core.filterPPIs(searchTerm, typeFilter, statusFilter);
    this.refreshPPIList();
  }

  // === MODAL MANAGEMENT ===
  
  showCreatePPIModal() {
    const emptyPPI = {
      id: '',
      title: '',
      process: '',
      businessObjective: '',
      measureDefinition: { type: 'derived', definition: '' },
      target: '',
      scope: '',
      source: '',
      responsible: '',
      informed: [],
      comments: '',
      elementId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.createModal('Crear Nuevo PPI', this.generateEditForm(emptyPPI), true, emptyPPI);
  }

  showDetailModal(ppi) {
    this.createModal('Detalles del PPI', this.generateDetailContent(ppi), false);
  }

  showEditModal(ppi) {
    this.createModal('Editar PPI', this.generateEditForm(ppi), true, ppi);
  }

  createModal(title, content, isEdit = false, ppi = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('ppi-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'ppi-modal';
    modal.className = 'ppi-modal-overlay';
    modal.innerHTML = `
      <div class="ppi-modal">
      <button class="ppi-modal-close" onclick="this.closest('.ppi-modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>

          <div class="ppi-modal-title">
        <h2>${title}</h2> 
        </div>
      
        <div class="ppi-modal-body">
          ${content}
        </div>
        ${isEdit ? `
          <div class="ppi-modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.ppi-modal-overlay').remove()">
              Cancelar
            </button>
            <button class="btn btn-primary" onclick="ppiManager.saveEditedPPI('${ppi ? ppi.id : ''}')">
              ${ppi ? 'Guardar Cambios' : 'Crear PPI'}
            </button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    this.addModalStyles();

    // Configurar funcionalidad de pestañas para modales de edición y visualización
    if (isEdit) {
      this.setupTabNavigation();
      this.setupFormValidation();
      this.setupTargetScopeValidation(ppi);
    } else {
      // También configurar pestañas para el modal de visualización
      this.setupTabNavigation();
    }
  }

  // === FORM GENERATION ===
  
  generateDetailContent(ppi) {
    // Validar que existe el tipo de medida
    const measureTypeKey = (ppi.measureDefinition && ppi.measureDefinition.type) || 'derived';
    const measureType = this.core.measureTypes[measureTypeKey] || this.core.measureTypes.derived || {
      name: 'Tipo Desconocido',
      icon: 'fas fa-question-circle'
    };
    
    const createdAt = new Date(ppi.createdAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const updatedAt = new Date(ppi.updatedAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="ppi-detail-container">
        <div class="ppi-form-header">
          <div class="ppi-id-info">
            <span class="ppi-id-label">PPI ID:</span>
            <span class="ppi-id-value">${ppi.id}</span>
          </div>
        </div>

        <div class="form-tabs">
          <button type="button" class="tab-button active" data-tab="general">
            <i class="fas fa-info-circle"></i> General
          </button>
          <button type="button" class="tab-button" data-tab="measurement">
            <i class="fas fa-chart-bar"></i> Medición
          </button>
          <button type="button" class="tab-button" data-tab="targets">
            <i class="fas fa-bullseye"></i> Objetivos
          </button>
          <button type="button" class="tab-button" data-tab="responsibilities">
            <i class="fas fa-users"></i> Responsabilidades
          </button>
          <button type="button" class="tab-button" data-tab="system">
            <i class="fas fa-clock"></i> Sistema
          </button>
        </div>

        <div class="form-content">
          <!-- Tab: General -->
          <div class="tab-content active" data-tab="general">
              <div class="form-group">
                <label for="view-title">Título del PPI</label>
                <input type="text" id="view-title" value="${ppi.title || ''}" readonly class="readonly-field">
                <div class="field-help">Nombre descriptivo del indicador</div>
              </div>

              <div class="form-group">
                <label for="view-process">Proceso</label>
                <input type="text" id="view-process" value="${ppi.process || ''}" readonly class="readonly-field">
                <div class="field-help">Proceso de negocio asociado</div>
              </div>

              <div class="form-group">
                <label for="view-business-objective">Process Goals</label>
                <textarea id="view-business-objective" rows="3" readonly class="readonly-field">${ppi.businessObjective || ''}</textarea>
                <div class="field-help">Objetivos que busca cumplir</div>
              </div>
          </div>

          <!-- Tab: Measurement -->
          <div class="tab-content" data-tab="measurement">
              <div class="form-group">
                <label for="view-measure-type">Tipo de Medida</label>
                <input type="text" id="view-measure-type" value="${measureType.name}" readonly class="readonly-field">
              </div>

              <div class="form-group">
                <label for="view-measure-definition">Measure (Definición)</label>
                <textarea id="view-measure-definition" rows="4" readonly class="readonly-field">${ppi.measureDefinition.definition || ''}</textarea>
                <div class="field-help">Descripción técnica del cálculo</div>
              </div>

              <div class="form-group">
                <label for="view-source">Source (Fuente)</label>
                <input type="text" id="view-source" value="${ppi.source || ''}" readonly class="readonly-field">
                <div class="field-help">Origen de los datos</div>
              </div>
          </div>

          <!-- Tab: Targets -->
          <div class="tab-content" data-tab="targets">
              <div class="form-group">
                <label for="view-target">Target (Objetivo)</label>
                <input type="text" id="view-target" value="${ppi.target || ''}" readonly class="readonly-field">
                <div class="field-help">Valor objetivo del indicador</div>
                ${ppi.target ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${ppi.target}</div>` : ''}
              </div>

              <div class="form-group">
                <label for="view-scope">Scope (Alcance)</label>
                <input type="text" id="view-scope" value="${ppi.scope || ''}" readonly class="readonly-field">
                <div class="field-help">Qué instancias se consideran</div>
                ${ppi.scope ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${ppi.scope}</div>` : ''}
              </div>
          </div>

          <!-- Tab: Responsibilities -->
          <div class="tab-content" data-tab="responsibilities">
              <div class="form-group">
                <label for="view-responsible">Responsible (Responsable)</label>
                <input type="text" id="view-responsible" value="${ppi.responsible || ''}" readonly class="readonly-field">
                <div class="field-help">Persona responsable del PPI</div>
              </div>

              <div class="form-group">
                <label for="view-informed">Informed (Informados)</label>
                <input type="text" id="view-informed" value="${Array.isArray(ppi.informed) && ppi.informed.length > 0 ? ppi.informed.join(', ') : ''}" readonly class="readonly-field">
                <div class="field-help">Personas que reciben información</div>
              </div>

              <div class="form-group">
                <label for="view-comments">Comments (Comentarios)</label>
                <textarea id="view-comments" rows="3" readonly class="readonly-field">${ppi.comments || ''}</textarea>
                <div class="field-help">Información adicional</div>
              </div>
          </div>

          <!-- Tab: System -->
          <div class="tab-content" data-tab="system">
              <div class="form-group">
                <label for="view-created">Fecha de Creación</label>
                <input type="text" id="view-created" value="${createdAt}" readonly class="readonly-field">
                <div class="field-help">Cuándo se creó este PPI</div>
              </div>

              <div class="form-group">
                <label for="view-updated">Última Actualización</label>
                <input type="text" id="view-updated" value="${updatedAt}" readonly class="readonly-field">
                <div class="field-help">Última vez que se modificó</div>
              </div>

              <div class="form-group">
                <label for="view-element">Elemento BPMN</label>
                <input type="text" id="view-element" value="${ppi.elementId || 'No vinculado'}" readonly class="readonly-field">
                <div class="field-help">Elemento del modelo al que está asociado</div>
              </div>
          </div>
        </div>
      </div>
    `;
  }

  generateEditForm(ppi) {
    // Validar que measureTypes existe
    const measureTypesObj = this.core.measureTypes || {};
    const measureTypes = Object.entries(measureTypesObj).map(([key, type]) => 
      `<option value="${key}" ${ppi.measureDefinition.type === key ? 'selected' : ''}>${type.name}</option>`
    ).join('');

    return `
      <form id="edit-ppi-form" class="ppi-edit-form">
        <div class="ppi-form-header">
          <div class="ppi-id-info">
            <span class="ppi-id-label">PPI ID:</span>
            <span class="ppi-id-value">${ppi.id || 'Nuevo PPI'}</span>
          </div>
        </div>

        <div class="form-tabs">
          <button type="button" class="tab-button active" data-tab="general">
            <i class="fas fa-info-circle"></i> General
          </button>
          <button type="button" class="tab-button" data-tab="measurement">
            <i class="fas fa-chart-bar"></i> Medición
          </button>
          <button type="button" class="tab-button" data-tab="targets">
            <i class="fas fa-bullseye"></i> Objetivos
          </button>
          <button type="button" class="tab-button" data-tab="responsibilities">
            <i class="fas fa-users"></i> Responsabilidades
          </button>
        </div>

        <div class="form-content">
          <!-- Tab: General -->
          <div class="tab-content active" data-tab="general">
              <div class="form-group required">
                <label for="edit-title">Título del PPI</label>
                <input type="text" id="edit-title" name="title" value="${ppi.title || ''}" required 
                       placeholder="Ej: Percentage of RFCs cancelled during holidays">
                <div class="field-help">Nombre descriptivo del indicador</div>
              </div>

              <div class="form-group">
                <label for="edit-process">Proceso</label>
                <input type="text" id="edit-process" name="process" value="${ppi.process || ''}"
                       placeholder="Ej: RFC-002: Improve customer satisfaction">
                <div class="field-help">Proceso de negocio asociado</div>
              </div>

              <div class="form-group">
                <label for="edit-business-objective">Process Goals</label>
                <textarea id="edit-business-objective" name="businessObjective" rows="2" 
                          placeholder="Objetivos del proceso...">${ppi.businessObjective || ''}</textarea>
                <div class="field-help">Objetivos que busca cumplir</div>
              </div>
            
          </div>

          <!-- Tab: Measurement -->
          <div class="tab-content" data-tab="measurement">
  
              <div class="form-group required">
                <label for="edit-measure-type">Tipo de Medida</label>
                <select id="edit-measure-type" name="measureType" required>
                  <option value="">Seleccionar...</option>
                  ${measureTypes}
                </select>
              </div>

              <div class="form-group required">
                <label for="edit-measure-definition">Measure (Definición)</label>
                <textarea id="edit-measure-definition" name="measureDefinition" rows="3" required
                          placeholder="Ej: Calculado como ξ * 100, donde c = RFCs cancelados y r = RFCs registrados">${ppi.measureDefinition.definition || ''}</textarea>
                <div class="field-help">Descripción técnica del cálculo</div>
              </div>

              <div class="form-group">
                <label for="edit-source">Source (Fuente)</label>
                <input type="text" id="edit-source" name="source" value="${ppi.source || ''}"
                       placeholder="Ej: Event logs, Sistema ERP...">
                <div class="field-help">Origen de los datos</div>
              </div>
          </div>

          <!-- Tab: Targets -->
          <div class="tab-content" data-tab="targets">
              <div class="form-group">
                <label for="edit-target">Target (Objetivo)</label>
                <input type="text" id="edit-target" name="target" value="${ppi.target || ''}" 
                       placeholder="Ej: Must be ≥ 90%">
                <div class="field-help">Valor objetivo del indicador</div>
                ${ppi.target ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${ppi.target}</div>` : ''}
                <div id="target-validation-warning" class="field-warning" style="display: none;">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span>Vincula primero el Target en el diagrama para editarlo aquí</span>
                </div>
              </div>

              <div class="form-group">
                <label for="edit-scope">Scope (Alcance)</label>
                <input type="text" id="edit-scope" name="scope" value="${ppi.scope || ''}"
                       placeholder="Ej: Instancias en periodo de vacaciones">
                <div class="field-help">Qué instancias se consideran</div>
                ${ppi.scope ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${ppi.scope}</div>` : ''}
                <div id="scope-validation-warning" class="field-warning" style="display: none;">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span>Vincula primero el Scope en el diagrama para editarlo aquí</span>
                </div>
              </div>
          
          </div>

          <!-- Tab: Responsibilities -->
          <div class="tab-content" data-tab="responsibilities">
              <div class="form-group">
                <label for="edit-responsible">Responsible (Responsable)</label>
                <input type="text" id="edit-responsible" name="responsible" value="${ppi.responsible || ''}"
                       placeholder="Ej: Planning and quality manager">
                <div class="field-help">Persona responsable del PPI</div>
              </div>

              <div class="form-group">
                <label for="edit-informed">Informed (Informados)</label>
                <input type="text" id="edit-informed" name="informed" 
                       value="${Array.isArray(ppi.informed) ? ppi.informed.join(', ') : ''}"
                       placeholder="Ej: CIO, Quality Manager (separados por comas)">
                <div class="field-help">Personas que reciben información</div>
              </div>

              <div class="form-group">
                <label for="edit-comments">Comments (Comentarios)</label>
                <textarea id="edit-comments" name="comments" rows="2"
                          placeholder="Observaciones adicionales...">${ppi.comments || ''}</textarea>
                <div class="field-help">Información adicional</div>
              </div>
            
          </div>
        </div>
      </form>
    `;
  }

  // === TAB NAVIGATION ===
  
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remover clase active de todos los botones y contenidos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Añadir clase active al botón y contenido seleccionado
        button.classList.add('active');
        const targetContent = document.querySelector(`[data-tab="${targetTab}"].tab-content`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // === FORM VALIDATION ===
  
  setupFormValidation() {
    const form = document.getElementById('edit-ppi-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.validateField(input);
      });

      input.addEventListener('blur', () => {
        this.validateField(input);
      });
    });
  }

  validateField(field) {
    const isRequired = field.hasAttribute('required');
    const value = field.value.trim();
    
    // Remover clases de validación anteriores
    field.classList.remove('field-valid', 'field-invalid');
    
    if (isRequired && !value) {
      field.classList.add('field-invalid');
      this.showFieldError(field, 'Este campo es obligatorio');
    } else if (value) {
      field.classList.add('field-valid');
      this.hideFieldError(field);
    } else {
      this.hideFieldError(field);
    }
  }

  showFieldError(field, message) {
    this.hideFieldError(field); // Remover error existente
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
  }

  hideFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  // === TARGET AND SCOPE VALIDATION ===
  
  setupTargetScopeValidation(ppi) {
    const targetInput = document.getElementById('edit-target');
    const scopeInput = document.getElementById('edit-scope');
    const targetWarning = document.getElementById('target-validation-warning');
    const scopeWarning = document.getElementById('scope-validation-warning');
    
    if (!targetInput || !scopeInput) return;
    
    // Verificar si el PPI tiene elementos Target y Scope vinculados
    const hasLinkedTarget = this.hasLinkedElement(ppi, 'PPINOT:Target');
    const hasLinkedScope = this.hasLinkedElement(ppi, 'PPINOT:Scope');
    
    // Configurar Target
    if (!hasLinkedTarget) {
      targetInput.disabled = true;
      targetInput.placeholder = 'Vincula primero un Target en el diagrama';
      targetInput.classList.add('readonly-field');
      if (targetWarning) targetWarning.style.display = 'block';
    } else {
      // Configurar listener para actualizar diagrama cuando se cambie
      targetInput.addEventListener('input', () => {
        this.updateDiagramElement(ppi, 'PPINOT:Target', targetInput.value);
      });
    }
    
    // Configurar Scope
    if (!hasLinkedScope) {
      scopeInput.disabled = true;
      scopeInput.placeholder = 'Vincula primero un Scope en el diagrama';
      scopeInput.classList.add('readonly-field');
      if (scopeWarning) scopeWarning.style.display = 'block';
    } else {
      // Configurar listener para actualizar diagrama cuando se cambie
      scopeInput.addEventListener('input', () => {
        this.updateDiagramElement(ppi, 'PPINOT:Scope', scopeInput.value);
      });
    }
  }
  
  hasLinkedElement(ppi, elementType) {
    if (!window.modeler || !ppi) return false;
    
    try {
      const elementRegistry = window.modeler.get('elementRegistry');
      
      // Buscar elementos vinculados del tipo especificado
      const linkedElements = elementRegistry.filter(element => {
        if (element.type !== elementType) return false;
        
        // Verificar si está vinculado a este PPI
        const parentElement = element.parent;
        if (!parentElement) return false;
        
        // Verificar si el padre es el PPI actual
        return parentElement.id === ppi.elementId ||
               (parentElement.businessObject && parentElement.businessObject.name === ppi.title);
      });
      
      return linkedElements.length > 0;
    } catch (error) {
      console.warn('Error verificando elementos vinculados:', error);
      return false;
    }
  }
  
  updateDiagramElement(ppi, elementType, newValue) {
    if (!window.modeler || !ppi) return;
    
    try {
      const elementRegistry = window.modeler.get('elementRegistry');
      const modeling = window.modeler.get('modeling');
      
      // Buscar el elemento vinculado del tipo especificado
      const linkedElement = elementRegistry.filter(element => {
        if (element.type !== elementType) return false;
        
        const parentElement = element.parent;
        if (!parentElement) return false;
        
        return parentElement.id === ppi.elementId ||
               (parentElement.businessObject && parentElement.businessObject.name === ppi.title);
      })[0];
      
      if (linkedElement) {
        // Actualizar la etiqueta del elemento en el diagrama
        modeling.updateProperties(linkedElement, { name: newValue });
        
        // También actualizar el businessObject directamente para asegurar persistencia
        if (linkedElement.businessObject) {
          linkedElement.businessObject.name = newValue;
        }
        
        // Mensaje eliminado - sin notificación automática
      }
    } catch (error) {
      console.warn('Error actualizando elemento del diagrama:', error);
    }
  }

  updateTabIndicators() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // Definir campos por pestaña
    const tabFields = {
      general: {
        required: ['edit-title'],
        optional: ['edit-process', 'edit-business-objective']
      },
      measurement: {
        required: ['edit-measure-type', 'edit-measure-definition'],
        optional: ['edit-source']
      },
      targets: {
        required: [],
        optional: ['edit-target', 'edit-scope']
      },
      responsibilities: {
        required: [],
        optional: ['edit-responsible', 'edit-informed', 'edit-comments']
      }
    };
    
    tabButtons.forEach(button => {
      const tabName = button.getAttribute('data-tab');
      const tabData = tabFields[tabName];
      
      if (tabData) {
        let completedRequired = 0;
        let completedOptional = 0;

        // Contar campos requeridos completados
        tabData.required.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field && field.value.trim()) {
            completedRequired++;
          }
        });

        // Contar campos opcionales completados
        tabData.optional.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field && field.value.trim()) {
            completedOptional++;
          }
        });

        // Remover indicadores existentes
        const existingIndicator = button.querySelector('.tab-indicator');
        if (existingIndicator) {
          existingIndicator.remove();
        }

        // Añadir nuevo indicador
        const indicator = document.createElement('span');
        indicator.className = 'tab-indicator';
        
        const totalRequired = tabData.required.length;
        const hasRequiredFields = totalRequired > 0;
        
        if (hasRequiredFields && completedRequired === totalRequired) {
          // Todos los campos requeridos completados
          indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
          indicator.style.color = 'var(--success-color, #28a745)';
        } else if (!hasRequiredFields && completedOptional > 0) {
          // No hay campos requeridos pero hay opcionales completados
          indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
          indicator.style.color = 'var(--success-color, #28a745)';
        } else if (completedOptional > 0 || completedRequired > 0) {
          // Algunos campos completados pero no todos los requeridos
          indicator.innerHTML = '<i class="fas fa-clock"></i>';
          indicator.style.color = 'var(--warning-color, #ffc107)';
        } else {
          // Ningún campo completado
          indicator.innerHTML = '<i class="fas fa-circle"></i>';
          indicator.style.color = 'var(--text-muted, #6c757d)';
        }
        
        button.appendChild(indicator);
      }
    });
  }
  
  addImprovedStyles() {
    // Remover estilos existentes para forzar actualización
    const existingStyles = document.getElementById('ppi-improved-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    const styles = document.createElement('style');
    styles.id = 'ppi-improved-styles';
    styles.textContent = `
      /* Variables CSS para sistema de color y espaciado */
      :root {
        --ppi-primary: #4361ee;
        --ppi-secondary: #667eea;
        --ppi-success: #43e97b;
        --ppi-warning: #f093fb;
        --ppi-danger: #ff6b6b;
        --ppi-info: #4facfe;
        
        --color-text-primary: #2c3e50;
        --color-text-secondary: #495057;
        --color-text-meta: #6c757d;
        --color-text-light: #868e96;
        
        --bg-white: #ffffff;
        --bg-light: #f8f9fa;
        --bg-muted: #e9ecef;
        --bg-dark: #343a40;
        
        --border-radius: 12px;
        --border-radius-sm: 6px;
        --border-radius-lg: 16px;
        
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 12px;
        --spacing-lg: 16px;
        --spacing-xl: 20px;
        --spacing-xxl: 24px;
        
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.12);
        --shadow-xl: 0 15px 35px rgba(0, 0, 0, 0.15);
        
        --transition-fast: 150ms ease;
        --transition-normal: 250ms ease;
        --transition-slow: 350ms ease;
      }

      /* Animaciones base */
      @keyframes fadeInUp {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.7; }
      }

      /* Contenedor principal del panel PPI */
      #ppi-list {
        height: calc(100vh - 200px);
        overflow-y: auto;
        padding: var(--spacing-md);
        scroll-behavior: smooth;
      }

      /* Scrollbar personalizado */
      #ppi-list::-webkit-scrollbar {
        width: 8px;
      }

      #ppi-list::-webkit-scrollbar-track {
        background: var(--bg-light);
        border-radius: 4px;
      }

      #ppi-list::-webkit-scrollbar-thumb {
        background: var(--ppi-primary);
        border-radius: 4px;
      }

      #ppi-list::-webkit-scrollbar-thumb:hover {
        background: var(--ppi-secondary);
      }

      /* Card principal con diseño profesional */
      .ppi-card {
        background: var(--bg-white);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
        transition: all var(--transition-normal);
        overflow: hidden;
        width: 100%;
        min-height: 150px;
        height: auto;
        margin-bottom: var(--spacing-md);
        animation: fadeInUp var(--transition-normal);
        animation-fill-mode: both;
        position: relative;
        display: flex;
        flex-direction: column;
      }


      /* Estados especiales de card */
      .ppi-card.has-bpmn-data {
        background: linear-gradient(135deg, #fafbff 0%, #f8f9fa 100%);
      }

      .ppi-card.needs-attention::after {
        content: '';
        position: absolute;
        top: var(--spacing-sm);
        right: var(--spacing-sm);
        width: 8px;
        height: 8px;
        background: var(--ppi-danger);
        border-radius: 50%;
        animation: pulse 2s infinite;
      }

      /* Header de la card */
      .card-header {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        border-bottom: 1px solid var(--bg-muted);
        background: linear-gradient(135deg, #fafbff 0%, #ffffff 100%);
        min-height: 70px;
      }

      .type-indicator {
        width: 32px;
        height: 32px;
        border-radius: var(--border-radius-sm);
        background: var(--type-color, var(--ppi-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        flex-shrink: 0;
        box-shadow: var(--shadow-sm);
      }

      .header-content {
        flex: 1;
        min-width: 0;
        padding:2px;
      }

      .card-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-top: 10px;
        margin-bottom: 5px;
        line-height: 1.2;
        word-wrap: break-word;
      }

      .meta-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-xs);
      
      }

    

      .badges-container {
        display: flex;
        flex-wrap: wrap;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px 7px;
        border-radius: var(--border-radius-sm);
        font-size: 9px;
        font-weight: 700;
        margin-top: 5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.85;
      }

      .status-badge.linked {
        background: rgba(67, 97, 238, 0.08);
        color: var(--ppi-primary);
        border: 1px solid rgba(67, 97, 238, 0.2);
      }

      .status-badge.synced {
        background: rgba(34, 139, 34, 0.08);
        color: #228b22;
        border: 1px solid rgba(34, 139, 34, 0.2);
      }

      .status-badge.complete {
        background: rgba(40, 167, 69, 0.1);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.3);
      }

      .status-badge.incomplete {
        background: rgba(255, 193, 7, 0.1);
        color: #e67e22;
        border: 1px solid rgba(255, 193, 7, 0.3);
      }

      /* Panel de acciones */
      .actions-panel {
        display: flex;
        gap: var(--spacing-xs);
        flex-shrink: 0;
      }

      .icon-btn {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: var(--border-radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-fast);
        font-size: 12px;
      }

      .icon-btn.primary {
        background: rgba(67, 97, 238, 0.1);
        color: var(--ppi-primary);
      }

      .icon-btn.secondary {
        background: rgba(108, 117, 125, 0.1);
        color: var(--color-text-meta);
      }

      .icon-btn.danger {
        background: rgba(255, 107, 107, 0.1);
        color: var(--ppi-danger);
      }

      .icon-btn:hover {
        transform: scale(1.05);
      }

      .icon-btn.primary:hover {
        background: var(--ppi-primary);
        color: white;
      }

      .icon-btn.secondary:hover {
        background: var(--color-text-meta);
        color: white;
      }

      .icon-btn.danger:hover {
        background: var(--ppi-danger);
        color: white;
      }

      /* Cuerpo de la card */
      .card-body {
        padding: var(--spacing-md);
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      /* Información esencial en líneas compactas */
      .essential-info {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .info-line {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        line-height: 1.3;
        flex-wrap: wrap;
      }

      .info-line.primary {
        font-size: 12px;
        margin-bottom: var(--spacing-lg);
        background: rgba(67, 97, 238, 0.05);
        padding: var(--spacing-md);
        border-radius: var(--border-radius-sm);
        border: 1px solid rgba(67, 97, 238, 0.1);
      }

      .info-line.secondary {
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .info-line.description {
        font-size: 11px;
        color: var(--color-text-meta);
        font-style: italic;
        margin-top: var(--spacing-xs);
        padding-top: var(--spacing-xs);
        border-top: 1px solid var(--bg-muted);
      }

      .field-group {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 20px;
        flex: 1;
        min-width: 0;
      }

      .field-icon {
        font-size: 13px;
        color: var(--ppi-primary);
        margin-top: 1px;
        flex-shrink: 0;
        width: 15px;
        text-align: center;
        opacity: 0.9;
      }

      .field-content {
        flex: 1;
        min-width: 0;
      }

      .field-value {
        font-size: 10px;
        line-height: 1.4;
        color: var(--text-color);
        hyphens: auto;
      }

      .target-value, .scope-value .responsible-value {
        font-weight: 700;
        color: var(--color-text-primary);
        font-size: 12px;
        letter-spacing: -0.01em;
      }

   

      .description-value {
        font-weight: 400;
        color: var(--text-color-muted);
        font-size: 10px;
        line-height: 1.5;
      }

      .field-separator {
        color: var(--color-text-meta);
        margin: 0 var(--spacing-xs);
      }

      .field-label {
        font-weight: 600;
        color: var(--color-text-meta);
        font-size: 9px;
        text-transform: capitalize;
        letter-spacing: 0.05em;
        opacity: 0.8;
        margin-right: 2px;
      }

      .field-value {
        color: var(--color-text-secondary);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
      }

      .field-value.bpmn-sourced {
        color: var(--color-text-secondary);
        font-weight: 600;
      }

      .field-value.description-text {
        font-weight: 400;
        line-height: 1.4;
      }

      /* Icon-specific styling */
      .target-group .field-icon {
        color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .scope-group .field-icon {
        color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .responsible-group .field-icon {
         color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .description-group .field-icon {
        color: #f39c12;
        font-weight: 500;
      }

      /* Enhanced typography for better hierarchy */
      .target-group, .scope-group, .responsible-group {
        background: transparent;
        padding: 0;
        border-radius: 0;
        border: none;
        margin-bottom: 0;
      }

      .target-group .target-value,
      .scope-group .scope-value,
      .responsible-group .responsible-value {
        text-shadow: none;
      }

      /* Responsive Design */
      @media (max-width: 420px) {
        .ppi-card {
          width: 100%;
          min-height: 100px;
        }
        
        .info-line.primary {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--spacing-xs);
        }

        .field-group {
          width: 100%;
        }
        
        .card-header {
          padding: var(--spacing-sm);
        }

        .type-indicator {
          width: 28px;
          height: 28px;
          font-size: 12px;
        }

        .card-title {
          font-size: 13px;
        }
      }

      /* Estados vacíos mejorados */
      .empty-state {
        text-align: center;
        padding: var(--spacing-xxl);
        color: var(--color-text-meta);
      }

      .empty-icon {
        font-size: 48px;
        color: var(--bg-muted);
        margin-bottom: var(--spacing-lg);
      }

      .empty-state h3 {
        color: var(--color-text-secondary);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
      }

      .empty-state p {
        color: var(--color-text-light);
        line-height: 1.5;
        max-width: 300px;
        margin: 0 auto;
      }

      /* Accesibilidad */
      .ppi-card:focus-within {
        outline: 2px solid var(--ppi-primary);
        outline-offset: 2px;
      }

      .icon-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--ppi-primary);
      }

      /* Animaciones de entrada escalonadas */
      .ppi-card:nth-child(1) { animation-delay: 0ms; }
      .ppi-card:nth-child(2) { animation-delay: 100ms; }
      .ppi-card:nth-child(3) { animation-delay: 200ms; }
      .ppi-card:nth-child(4) { animation-delay: 300ms; }
      .ppi-card:nth-child(5) { animation-delay: 400ms; }
      .ppi-card:nth-child(n+6) { animation-delay: 500ms; }

      /* Scroll suave para contenido largo */
      .ppi-list {
        scroll-behavior: smooth;
      }

      /* Tooltips mejorados */
      [title]:hover::after {
        content: attr(title);
        position: absolute;
        background: var(--bg-dark);
        color: white;
        padding: var(--spacing-xs) var(--spacing-sm);
        border-radius: var(--border-radius-sm);
        font-size: 11px;
        white-space: nowrap;
        z-index: 1000;
        bottom: 100%;
        left: 50%;
        transform: translateX(-50%);
        margin-bottom: var(--spacing-xs);
        pointer-events: none;
      }

      /* Optimización para alta densidad de información */
      .ppi-card .data-item:nth-child(n+7) {
        display: none;
      }

      .ppi-card:hover .data-item:nth-child(n+7) {
        display: block;
        animation: fadeInUp 0.2s ease;
      }
    `;

    document.head.appendChild(styles);
  }

  addModalStyles() {
    if (document.getElementById('ppi-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ppi-modal-styles';
    styles.textContent = `
      .ppi-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(3px);
      }

      .ppi-modal {
        background: white;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        max-width: 90vw;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-width: 800px;
      }

      .ppi-modal-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px 30px;
        display: flex;
        justify-content: space-between;
        align-items: center;
        border-bottom: 1px solid #e0e0e0;
      }

      .ppi-modal-header h3 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 600;
      }

      .ppi-modal-close {
        background: none;
        border: none;
        color: white;
        font-size: 1.2rem;
        cursor: pointer;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }

      .ppi-modal-close:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .ppi-modal-body {
        overflow-y: auto;
        flex: 1;
      }

      .ppi-modal-footer {
        padding: 20px 30px;
        border-top: 1px solid #e0e0e0;
        display: flex;
        justify-content: flex-end;
        gap: 15px;
        background: #f8f9fa;
      }

      .ppi-detail-grid, .form-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
        gap: 25px;
      }

      .detail-section, .form-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        border-left: 4px solid #667eea;
      }

      .detail-section h4, .form-section h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .detail-item {
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }

      .detail-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .detail-item strong {
        color: #495057;
        display: inline-block;
        min-width: 120px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #495057;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e9ecef;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        outline: none;
      }

      .form-group input::placeholder {
        color: #6c757d;
        font-style: italic;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .btn-secondary {
        background: #6c757d;
        color: white;
      }

      .btn-secondary:hover {
        background: #5a6268;
        transform: translateY(-1px);
      }
    `;

    document.head.appendChild(styles);
  }

  // === MESSAGE DISPLAY ===
  
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showWarningMessage(message) {
    this.showMessage(message, 'warning');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    let backgroundColor;
    switch(type) {
      case 'success':
        backgroundColor = '#28a745';
        break;
      case 'warning':
        backgroundColor = '#ffc107';
        break;
      default:
        backgroundColor = '#dc3545';
    }
    
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: ${type === 'warning' ? '#212529' : 'white'};
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      background-color: ${backgroundColor};
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // === UTILITY METHODS ===
  
  loadPPIs() {
    this.core.loadPPIs();
  }

  updateStatistics() {
    const stats = this.core.getStatistics();
    
    const totalElement = document.getElementById('total-ppis');
    const linkedElement = document.getElementById('linked-ppis');
    const timeElement = document.getElementById('time-measures');

    if (totalElement) totalElement.textContent = stats.total;
    if (linkedElement) linkedElement.textContent = stats.linked;
    if (timeElement) timeElement.textContent = stats.timeMeasures;
  }

  // NUEVO: Forzar actualización de una card específica
  forceUpdatePPICard(ppiId) {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    const ppiElement = container.querySelector(`[data-ppi-id="${ppiId}"]`);
    if (!ppiElement) {

      return;
    }
    
    const ppi = this.core.ppis.find(p => p.id === ppiId);
    if (!ppi) {

      return;
    }
    

    this.updatePPIElement(ppiElement, ppi);
  }

  // NUEVO: Actualizar todas las cards que tengan cambios
  updateChangedCards() {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    const cards = container.querySelectorAll('.ppi-card[data-ppi-id]');
    
    cards.forEach(card => {
      const ppiId = card.getAttribute('data-ppi-id');
      const ppi = this.core.ppis.find(p => p.id === ppiId);
      
      if (ppi) {
        const storedData = card.getAttribute('data-ppi-data') || '';
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });
        
        if (storedData !== currentData) {
          this.updatePPIElement(card, ppi);
          card.setAttribute('data-ppi-data', currentData);
        }
      }
    });
    

  }
  };
} 