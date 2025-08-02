// === PPI Manager ===
// Gestor de Indicadores de Rendimiento de Procesos (PPI)
// Integración con BPMN y procesamiento de lenguaje natural

class PPIManager {
  constructor() {
    this.ppis = [];
    this.currentTab = 'template';
    this.bpmnModeler = null;
    this.currentPPI = null;
    this.measureTypes = {
      time: {
        name: 'Time Measure',
        icon: 'fas fa-clock',
        description: 'Medida de tiempo entre eventos',
        fields: ['fromEvent', 'toEvent', 'timeUnit']
      },
      count: {
        name: 'Count Measure',
        icon: 'fas fa-hashtag',
        description: 'Conteo de elementos o eventos',
        fields: ['countElement']
      },
      state: {
        name: 'State Condition',
        icon: 'fas fa-toggle-on',
        description: 'Condición de estado de un elemento',
        fields: ['stateCondition']
      },
      data: {
        name: 'Data Measure',
        icon: 'fas fa-database',
        description: 'Medida basada en datos específicos',
        fields: ['dataField', 'dataSource']
      },
      derived: {
        name: 'Derived Measure',
        icon: 'fas fa-calculator',
        description: 'Medida calculada a partir de otras',
        fields: ['formula', 'dependencies']
      },
      aggregated: {
        name: 'Aggregated Measure',
        icon: 'fas fa-chart-bar',
        description: 'Medida agregada de múltiples elementos',
        fields: ['aggregationType', 'groupBy']
      }
    };
    
    this.init();
  }

  init() {
    this.loadPPIs();
    this.setupEventListeners();
    this.setupFileUpload();
    this.setupFormValidation();
    this.refreshPPIList();
  }

  setBpmnModeler(modeler) {
    this.bpmnModeler = modeler;
    this.setupBpmnIntegration();
  }

  setupEventListeners() {
    // Event listeners para el formulario
    const form = document.getElementById('ppi-form');
    if (form) {
      form.addEventListener('submit', (e) => this.handleFormSubmit(e));
    }

    // Event listeners para drag and drop
    const uploadArea = document.getElementById('file-upload-area');
    if (uploadArea) {
      uploadArea.addEventListener('dragover', (e) => this.handleDragOver(e));
      uploadArea.addEventListener('drop', (e) => this.handleFileDrop(e));
      uploadArea.addEventListener('click', () => document.getElementById('ppi-file-input').click());
    }
  }

  setupFileUpload() {
    const fileInput = document.getElementById('ppi-file-input');
    if (fileInput) {
      fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
    }
  }

  setupFormValidation() {
    // Validación en tiempo real
    const requiredFields = document.querySelectorAll('#ppi-form [required]');
    requiredFields.forEach(field => {
      field.addEventListener('blur', () => this.validateField(field));
      field.addEventListener('input', () => this.clearFieldError(field));
    });
  }

  setupBpmnIntegration() {
    if (!this.bpmnModeler) return;

    // Escuchar cambios en el modelo BPMN
    this.bpmnModeler.on('element.changed', (event) => {
      this.handleBpmnElementChange(event);
    });

    this.bpmnModeler.on('element.removed', (event) => {
      this.handleBpmnElementRemoval(event);
    });
  }

  switchTab(tabName) {
    this.currentTab = tabName;
    
    // Actualizar pestañas activas
    document.querySelectorAll('.panel-tabs .tab').forEach(tab => {
      tab.classList.remove('active');
    });
    document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    
    // Mostrar contenido correspondiente
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.remove('active');
    });
    document.getElementById(`${tabName}-tab`).classList.add('active');
    
    // Acciones específicas por pestaña
    if (tabName === 'visualization') {
      this.refreshPPIList();
    }
  }

  toggleSection(headerElement) {
    const section = headerElement.closest('.form-section');
    const isCollapsed = section.classList.contains('collapsed');
    
    if (isCollapsed) {
      // Expandir sección
      section.classList.remove('collapsed');
    } else {
      // Colapsar sección
      section.classList.add('collapsed');
    }
  }

  expandAllSections() {
    document.querySelectorAll('.form-section.collapsible').forEach(section => {
      section.classList.remove('collapsed');
    });
  }

  collapseAllSections() {
    document.querySelectorAll('.form-section.collapsible').forEach(section => {
      section.classList.add('collapsed');
    });
  }

  onMeasureTypeChange() {
    const measureType = document.getElementById('measure-type').value;
    
    // Ocultar todos los campos específicos
    Object.keys(this.measureTypes).forEach(type => {
      const fields = document.getElementById(`${type}-measure-fields`);
      if (fields) fields.style.display = 'none';
    });
    
    // Mostrar campos específicos del tipo seleccionado
    if (measureType && this.measureTypes[measureType]) {
      const fields = document.getElementById(`${measureType}-measure-fields`);
      if (fields) fields.style.display = 'block';
    }
  }

  handleFormSubmit(event) {
    event.preventDefault();
    
    if (!this.validateForm()) {
      return;
    }
    
    const formData = new FormData(event.target);
    const ppiData = this.parseFormData(formData);
    
    if (this.validatePPIData(ppiData)) {
      const form = event.target;
      const editingPpiId = form.getAttribute('data-editing-ppi-id');
      
      if (editingPpiId) {
        // Modo edición
        const updatedData = this.createPPIUpdateData(ppiData);
        if (this.updatePPI(editingPpiId, updatedData)) {
          this.clearForm();
          this.showSuccessMessage('PPI actualizado exitosamente');
          this.switchTab('visualization');
        } else {
          this.showErrorMessage('Error al actualizar el PPI');
        }
      } else {
        // Modo creación
        const ppi = this.createPPI(ppiData);
        this.addPPI(ppi);
        this.clearForm();
        this.showSuccessMessage('PPI creado exitosamente');
        this.switchTab('visualization');
      }
    }
  }

  createPPIUpdateData(formData) {
    return {
      process: formData.process,
      businessObjective: formData.businessObjective,
      measureDefinition: {
        type: formData.measureType,
        definition: formData.measureDefinition,
        ...this.getMeasureSpecificData(formData)
      },
      target: formData.target,
      scope: formData.scope,
      source: formData.source,
      responsible: formData.responsible,
      informed: formData.informed || [],
      comments: formData.comments || '',
      updatedAt: new Date().toISOString()
    };
  }

  parseFormData(formData) {
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    // Procesar campos especiales
    if (data.informed) {
      data.informed = data.informed.split(',').map(item => item.trim());
    }
    
    return data;
  }

  validateForm() {
    const requiredFields = document.querySelectorAll('#ppi-form [required]');
    let isValid = true;
    
    requiredFields.forEach(field => {
      if (!this.validateField(field)) {
        isValid = false;
      }
    });
    
    return isValid;
  }

  validateField(field) {
    const value = field.value.trim();
    const isValid = value.length > 0;
    
    if (!isValid) {
      this.showFieldError(field, 'Este campo es obligatorio');
    } else {
      this.clearFieldError(field);
    }
    
    return isValid;
  }

  showFieldError(field, message) {
    this.clearFieldError(field);
    field.classList.add('error');
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    field.parentNode.appendChild(errorDiv);
  }

  clearFieldError(field) {
    field.classList.remove('error');
    const errorDiv = field.parentNode.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  validatePPIData(data) {
    // Validación SMART
    const smartValidation = this.validateSMART(data);
    if (!smartValidation.isValid) {
      this.showErrorMessage(`Validación SMART fallida: ${smartValidation.message}`);
      return false;
    }
    
    return true;
  }

  validateSMART(data) {
    // Specific - Específico
    if (!data.measureDefinition || data.measureDefinition.length < 10) {
      return { isValid: false, message: 'La definición de medida debe ser específica' };
    }
    
    // Measurable - Medible
    if (!data.target || !data.source) {
      return { isValid: false, message: 'El objetivo debe ser medible y tener una fuente de datos' };
    }
    
    // Achievable - Alcanzable
    if (!data.responsible) {
      return { isValid: false, message: 'Debe especificar un responsable' };
    }
    
    // Relevant - Relevante
    if (!data.businessObjective || data.businessObjective.length < 10) {
      return { isValid: false, message: 'El objetivo de negocio debe ser relevante' };
    }
    
    // Time-bound - Con límite de tiempo
    if (!data.scope) {
      return { isValid: false, message: 'Debe especificar el alcance temporal' };
    }
    
    return { isValid: true };
  }

  createPPI(data) {
    const ppi = {
      id: this.generatePPIId(),
      process: data.process,
      businessObjective: data.businessObjective,
      measureDefinition: {
        type: data.measureType,
        definition: data.measureDefinition,
        ...this.getMeasureSpecificData(data)
      },
      target: data.target,
      scope: data.scope,
      source: data.source,
      responsible: data.responsible,
      informed: data.informed || [],
      comments: data.comments || '',
      bpmnLink: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    return ppi;
  }

  getMeasureSpecificData(data) {
    const specificData = {};
    
    switch (data.measureType) {
      case 'time':
        specificData.fromEvent = data.fromEvent;
        specificData.toEvent = data.toEvent;
        specificData.timeUnit = data.timeUnit;
        break;
      case 'count':
        specificData.countElement = data.countElement;
        break;
      case 'state':
        specificData.stateCondition = data.stateCondition;
        break;
      case 'data':
        specificData.dataField = data.dataField;
        specificData.dataSource = data.dataSource;
        break;
      case 'derived':
        specificData.formula = data.formula;
        specificData.dependencies = data.dependencies;
        break;
      case 'aggregated':
        specificData.aggregationType = data.aggregationType;
        specificData.groupBy = data.groupBy;
        break;
    }
    
    return specificData;
  }

  generatePPIId() {
    return 'ppi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  addPPI(ppi) {
    this.ppis.push(ppi);
    this.savePPIs();
    this.refreshPPIList();
  }

  updatePPI(ppiId, updatedData) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      this.ppis[index] = { ...this.ppis[index], ...updatedData, updatedAt: new Date().toISOString() };
      this.savePPIs();
      this.refreshPPIList();
      return true;
    }
    return false;
  }

  deletePPI(ppiId) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      this.ppis.splice(index, 1);
      this.savePPIs();
      this.refreshPPIList();
      return true;
    }
    return false;
  }

  savePPIs() {
    try {
      localStorage.setItem('ppis', JSON.stringify(this.ppis));
    } catch (e) {
      console.error('Error al guardar PPIs:', e);
    }
  }

  loadPPIs() {
    try {
      const saved = localStorage.getItem('ppis');
      if (saved) {
        this.ppis = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error al cargar PPIs:', e);
      this.ppis = [];
    }
  }

  refreshPPIList() {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (this.ppis.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-chart-line"></i>
          <p>No hay PPIs definidos</p>
          <p>Crea tu primer PPI usando el formulario</p>
        </div>
      `;
      return;
    }
    
    this.ppis.forEach(ppi => {
      const ppiElement = this.createPPIElement(ppi);
      container.appendChild(ppiElement);
    });
  }

  createPPIElement(ppi) {
    const div = document.createElement('div');
    div.className = 'ppi-item';
    div.setAttribute('data-ppi-id', ppi.id);
    
    const measureType = this.measureTypes[ppi.measureDefinition.type];
    const createdAt = new Date(ppi.createdAt).toLocaleDateString('es-ES');
    
    div.innerHTML = `
      <div class="ppi-header">
        <div class="ppi-icon">
          <i class="${measureType.icon}" title="${measureType.name}"></i>
        </div>
        <div class="ppi-info">
          <h5 class="ppi-title">${ppi.process}</h5>
          <p class="ppi-objective">${ppi.businessObjective}</p>
          <div class="ppi-meta">
            <span class="ppi-date"><i class="fas fa-calendar-alt"></i> ${createdAt}</span>
            <span class="ppi-type"><i class="fas fa-tag"></i> ${measureType.name}</span>
          </div>
        </div>
        <div class="ppi-actions">
          <button class="btn btn-sm btn-info" onclick="ppiManager.viewPPI('${ppi.id}')" title="Ver detalles">
            <i class="fas fa-eye"></i>
          </button>
          <button class="btn btn-sm btn-warning" onclick="ppiManager.editPPI('${ppi.id}')" title="Editar">
            <i class="fas fa-edit"></i>
          </button>
          <button class="btn btn-sm btn-danger" onclick="ppiManager.confirmDeletePPI('${ppi.id}')" title="Eliminar">
            <i class="fas fa-trash"></i>
          </button>
        </div>
      </div>
      <div class="ppi-details">
        <div class="ppi-target">
          <i class="fas fa-bullseye"></i>
          <strong>Objetivo:</strong> ${ppi.target}
        </div>
        <div class="ppi-scope">
          <i class="fas fa-globe"></i>
          <strong>Alcance:</strong> ${ppi.scope}
        </div>
        <div class="ppi-responsible">
          <i class="fas fa-user"></i>
          <strong>Responsable:</strong> ${ppi.responsible}
        </div>
        <div class="ppi-source">
          <i class="fas fa-database"></i>
          <strong>Fuente:</strong> ${ppi.source}
        </div>
      </div>
      <div class="ppi-footer">
        <div class="ppi-status">
          <span class="status-indicator active"></span>
          <span>Activo</span>
        </div>
        <div class="ppi-bpmn-links">
          ${Object.keys(ppi.bpmnLink || {}).length > 0 ? 
            `<i class="fas fa-link"></i> ${Object.keys(ppi.bpmnLink).length} elemento(s) BPMN` : 
            '<i class="fas fa-unlink"></i> Sin elementos BPMN'
          }
        </div>
      </div>
    `;
    
    return div;
  }

  viewPPI(ppiId) {
    const ppi = this.ppis.find(p => p.id === ppiId);
    if (!ppi) return;
    
    this.currentPPI = ppi;
    this.showDetailModal(ppi);
  }

  editPPI(ppiId) {
    const ppi = this.ppis.find(p => p.id === ppiId);
    if (!ppi) return;
    
    this.currentPPI = ppi;
    this.populateForm(ppi);
    this.switchTab('form');
  }

  confirmDeletePPI(ppiId) {
    if (confirm('¿Estás seguro de que quieres eliminar este PPI?')) {
      if (this.deletePPI(ppiId)) {
        this.showSuccessMessage('PPI eliminado exitosamente');
        this.closeDetailModal();
      }
    }
  }

  showDetailModal(ppi) {
    const modal = document.getElementById('ppi-detail-modal');
    const title = document.getElementById('modal-ppi-title');
    const content = document.getElementById('modal-ppi-content');
    
    title.textContent = ppi.process;
    
    const measureType = this.measureTypes[ppi.measureDefinition.type];
    const createdAt = new Date(ppi.createdAt).toLocaleString('es-ES');
    const updatedAt = new Date(ppi.updatedAt).toLocaleString('es-ES');
    
    content.innerHTML = `
      <div class="ppi-detail-content">
        <div class="modal-actions">
          <button class="btn btn-warning" onclick="ppiManager.editPPI('${ppi.id}'); ppiManager.closeDetailModal();">
            <i class="fas fa-edit"></i> Editar
          </button>
          <button class="btn btn-danger" onclick="ppiManager.confirmDeletePPI('${ppi.id}')">
            <i class="fas fa-trash"></i> Eliminar
          </button>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Información General</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Proceso:</label>
              <span>${ppi.process}</span>
            </div>
            <div class="detail-item">
              <label>Objetivo de Negocio:</label>
              <span>${ppi.businessObjective}</span>
            </div>
            <div class="detail-item">
              <label>Tipo de Medida:</label>
              <span><i class="${measureType.icon}"></i> ${measureType.name}</span>
            </div>
            <div class="detail-item">
              <label>Creado:</label>
              <span>${createdAt}</span>
            </div>
            <div class="detail-item">
              <label>Actualizado:</label>
              <span>${updatedAt}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-chart-line"></i> Definición de Medida</h4>
          <div class="measure-definition">
            <p class="definition-text">${ppi.measureDefinition.definition}</p>
            ${this.renderMeasureSpecificDetails(ppi)}
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-target"></i> Objetivos y Alcance</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Objetivo:</label>
              <span class="target-value">${ppi.target}</span>
            </div>
            <div class="detail-item">
              <label>Alcance:</label>
              <span>${ppi.scope}</span>
            </div>
          </div>
        </div>
        
        <div class="detail-section">
          <h4><i class="fas fa-users"></i> Responsabilidades</h4>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Fuente:</label>
              <span><i class="fas fa-database"></i> ${ppi.source}</span>
            </div>
            <div class="detail-item">
              <label>Responsable:</label>
              <span><i class="fas fa-user"></i> ${ppi.responsible}</span>
            </div>
            <div class="detail-item">
              <label>Informados:</label>
              <span><i class="fas fa-bell"></i> ${Array.isArray(ppi.informed) ? ppi.informed.join(', ') : (ppi.informed || 'N/A')}</span>
            </div>
          </div>
        </div>
        
        ${ppi.comments ? `
        <div class="detail-section">
          <h4><i class="fas fa-comment"></i> Comentarios</h4>
          <div class="comments-content">
            <p>${ppi.comments}</p>
          </div>
        </div>
        ` : ''}
        
        ${Object.keys(ppi.bpmnLink || {}).length > 0 ? `
        <div class="detail-section">
          <h4><i class="fas fa-link"></i> Elementos BPMN Vinculados</h4>
          <div class="bpmn-links-content">
            ${this.renderBpmnLinks(ppi.bpmnLink)}
          </div>
        </div>
        ` : ''}
      </div>
    `;
    
    modal.style.display = 'flex';
  }

  renderMeasureSpecificDetails(ppi) {
    const details = ppi.measureDefinition;
    let html = '';
    
    switch (details.type) {
      case 'time':
        html = `
          <p><strong>Desde:</strong> ${details.fromEvent}</p>
          <p><strong>Hasta:</strong> ${details.toEvent}</p>
          <p><strong>Unidad:</strong> ${details.timeUnit}</p>
        `;
        break;
      case 'count':
        html = `<p><strong>Elemento:</strong> ${details.countElement}</p>`;
        break;
      case 'state':
        html = `<p><strong>Condición:</strong> ${details.stateCondition}</p>`;
        break;
      case 'data':
        html = `
          <p><strong>Campo:</strong> ${details.dataField}</p>
          <p><strong>Fuente:</strong> ${details.dataSource}</p>
        `;
        break;
      case 'derived':
        html = `
          <p><strong>Fórmula:</strong> ${details.formula}</p>
          <p><strong>Dependencias:</strong> ${details.dependencies}</p>
        `;
        break;
      case 'aggregated':
        html = `
          <p><strong>Tipo de Agregación:</strong> ${details.aggregationType}</p>
          <p><strong>Agrupar por:</strong> ${details.groupBy}</p>
        `;
        break;
    }
    
    return html;
  }

  renderBpmnLinks(bpmnLink) {
    let html = '<div class="bpmn-links-grid">';
    for (const [key, value] of Object.entries(bpmnLink)) {
      html += `
        <div class="bpmn-link-item">
          <div class="link-type">
            <i class="fas fa-link"></i>
            <span>${this.getLinkTypeLabel(key)}</span>
          </div>
          <div class="link-value">
            <code>${value}</code>
          </div>
        </div>
      `;
    }
    html += '</div>';
    return html;
  }

  getLinkTypeLabel(key) {
    const labels = {
      'fromEvent': 'Evento Inicio',
      'toEvent': 'Evento Fin',
      'task': 'Tarea',
      'gateway': 'Compuerta',
      'dataObject': 'Objeto de Datos',
      'lane': 'Carril',
      'pool': 'Pool'
    };
    return labels[key] || key;
  }

  closeDetailModal() {
    const modal = document.getElementById('ppi-detail-modal');
    modal.style.display = 'none';
    this.currentPPI = null;
  }

  populateForm(ppi) {
    const form = document.getElementById('ppi-form');
    if (!form) return;
    
    // Limpiar formulario
    form.reset();
    
    // Poblar campos básicos
    form.querySelector('[name="process"]').value = ppi.process || '';
    form.querySelector('[name="businessObjective"]').value = ppi.businessObjective || '';
    form.querySelector('[name="measureType"]').value = ppi.measureDefinition.type || 'time';
    form.querySelector('[name="measureDefinition"]').value = ppi.measureDefinition.definition || '';
    form.querySelector('[name="target"]').value = ppi.target || '';
    form.querySelector('[name="scope"]').value = ppi.scope || '';
    form.querySelector('[name="source"]').value = ppi.source || '';
    form.querySelector('[name="responsible"]').value = ppi.responsible || '';
    form.querySelector('[name="informed"]').value = Array.isArray(ppi.informed) ? ppi.informed.join(', ') : (ppi.informed || '');
    form.querySelector('[name="comments"]').value = ppi.comments || '';
    
    // Poblar campos específicos del tipo de medida
    this.populateMeasureSpecificFields(ppi.measureDefinition);
    
    // Mostrar campos específicos
    this.onMeasureTypeChange();
    
    // Expandir todas las secciones para edición
    this.expandAllSections();
    
    // Cambiar el texto del botón de submit
    const submitBtn = form.querySelector('button[type="submit"]');
    if (submitBtn) {
      submitBtn.innerHTML = '<i class="fas fa-save"></i> Actualizar PPI';
      submitBtn.classList.remove('btn-primary');
      submitBtn.classList.add('btn-warning');
    }
    
    // Agregar el ID del PPI al formulario para identificar que es una edición
    form.setAttribute('data-editing-ppi-id', ppi.id);
  }

  populateMeasureSpecificFields(measureDefinition) {
    const details = measureDefinition;
    
    switch (details.type) {
      case 'time':
        document.querySelector('[name="fromEvent"]').value = details.fromEvent || '';
        document.querySelector('[name="toEvent"]').value = details.toEvent || '';
        document.querySelector('[name="timeUnit"]').value = details.timeUnit || 'hours';
        break;
      case 'count':
        document.querySelector('[name="countElement"]').value = details.countElement || '';
        break;
      case 'state':
        document.querySelector('[name="stateCondition"]').value = details.stateCondition || '';
        break;
      case 'data':
        document.querySelector('[name="dataField"]').value = details.dataField || '';
        document.querySelector('[name="dataSource"]').value = details.dataSource || '';
        break;
      case 'derived':
        document.querySelector('[name="formula"]').value = details.formula || '';
        document.querySelector('[name="dependencies"]').value = details.dependencies || '';
        break;
      case 'aggregated':
        document.querySelector('[name="aggregationType"]').value = details.aggregationType || '';
        document.querySelector('[name="groupBy"]').value = details.groupBy || '';
        break;
    }
  }

  clearForm() {
    const form = document.getElementById('ppi-form');
    if (form) {
      form.reset();
      this.onMeasureTypeChange();
      
      // Expandir todas las secciones al limpiar
      this.expandAllSections();
      
      // Resetear el botón de submit
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Crear PPI';
        submitBtn.classList.remove('btn-warning');
        submitBtn.classList.add('btn-primary');
      }
      
      // Remover el atributo de edición
      form.removeAttribute('data-editing-ppi-id');
    }
  }

  handleFileSelect(event) {
    const files = event.target.files;
    this.processFiles(files);
  }

  handleDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }

  handleFileDrop(event) {
    event.preventDefault();
    const files = event.dataTransfer.files;
    this.processFiles(files);
  }

  async processFiles(files) {
    for (const file of files) {
      try {
        const content = await this.readFile(file);
        const ppiData = this.parseFileContent(content, file.name);
        
        if (ppiData) {
          const ppi = this.createPPI(ppiData);
          this.addPPI(ppi);
          this.showSuccessMessage(`PPI importado desde ${file.name}`);
        }
      } catch (error) {
        this.showErrorMessage(`Error al procesar ${file.name}: ${error.message}`);
      }
    }
  }

  readFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = () => reject(new Error('Error al leer el archivo'));
      
      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  parseFileContent(content, filename) {
    if (filename.endsWith('.json')) {
      try {
        return JSON.parse(content);
      } catch (e) {
        throw new Error('Formato JSON inválido');
      }
    } else {
      return this.parseTextContent(content);
    }
  }

  parseTextContent(content) {
    const lines = content.split('\n');
    const data = {};
    
    lines.forEach(line => {
      const colonIndex = line.indexOf(':');
      if (colonIndex > 0) {
        const key = line.substring(0, colonIndex).trim().toLowerCase();
        const value = line.substring(colonIndex + 1).trim();
        
        switch (key) {
          case 'proceso':
            data.process = value;
            break;
          case 'objetivo de negocio':
            data.businessObjective = value;
            break;
          case 'definición de medida':
            data.measureDefinition = value;
            break;
          case 'objetivo':
            data.target = value;
            break;
          case 'alcance':
            data.scope = value;
            break;
          case 'fuente':
            data.source = value;
            break;
          case 'responsable':
            data.responsible = value;
            break;
          case 'informado':
            data.informed = value;
            break;
          case 'comentarios':
            data.comments = value;
            break;
        }
      }
    });
    
    // Inferir tipo de medida basado en la definición
    data.measureType = this.inferMeasureType(data.measureDefinition);
    
    return data;
  }

  inferMeasureType(definition) {
    const lowerDef = definition.toLowerCase();
    
    if (lowerDef.includes('tiempo') || lowerDef.includes('time') || lowerDef.includes('duración')) {
      return 'time';
    } else if (lowerDef.includes('contar') || lowerDef.includes('count') || lowerDef.includes('número')) {
      return 'count';
    } else if (lowerDef.includes('estado') || lowerDef.includes('state') || lowerDef.includes('condición')) {
      return 'state';
    } else if (lowerDef.includes('datos') || lowerDef.includes('data') || lowerDef.includes('campo')) {
      return 'data';
    } else if (lowerDef.includes('calculado') || lowerDef.includes('derived') || lowerDef.includes('fórmula')) {
      return 'derived';
    } else if (lowerDef.includes('agregado') || lowerDef.includes('aggregated') || lowerDef.includes('suma')) {
      return 'aggregated';
    }
    
    return 'time'; // Por defecto
  }

  handleBpmnElementChange() {
    // Actualizar vinculaciones BPMN si es necesario
    this.updateBpmnLinks();
  }

  handleBpmnElementRemoval(event) {
    // Limpiar vinculaciones BPMN si el elemento fue eliminado
    this.cleanupBpmnLinks(event.element.id);
  }

  updateBpmnLinks() {
    // Implementar lógica de actualización de vinculaciones
    // console.log('Actualizando vinculaciones BPMN');
  }

  cleanupBpmnLinks(elementId) {
    // Limpiar vinculaciones cuando se elimina un elemento BPMN
    this.ppis.forEach(ppi => {
      if (ppi.bpmnLink) {
        Object.keys(ppi.bpmnLink).forEach(key => {
          if (ppi.bpmnLink[key] === elementId) {
            delete ppi.bpmnLink[key];
          }
        });
      }
    });
    this.savePPIs();
  }

  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showErrorMessage(message) {
    this.showMessage(message, 'error');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      messageDiv.remove();
    }, 3000);
  }

  // Métodos públicos para integración con BPMN
  linkToBpmnElement(ppiId, elementId, linkType) {
    const ppi = this.ppis.find(p => p.id === ppiId);
    if (ppi) {
      if (!ppi.bpmnLink) ppi.bpmnLink = {};
      ppi.bpmnLink[linkType] = elementId;
      this.savePPIs();
      return true;
    }
    return false;
  }

  getPPIsForElement(elementId) {
    return this.ppis.filter(ppi => 
      ppi.bpmnLink && Object.values(ppi.bpmnLink).includes(elementId)
    );
  }

  exportPPIs() {
    return JSON.stringify(this.ppis, null, 2);
  }

  importPPIs(jsonData) {
    try {
      const ppis = JSON.parse(jsonData);
      if (Array.isArray(ppis)) {
        this.ppis = ppis;
        this.savePPIs();
        this.refreshPPIList();
        return true;
      }
    } catch (e) {
      console.error('Error al importar PPIs:', e);
    }
    return false;
  }
}

// Inicializar el gestor de PPI cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
  window.ppiManager = new PPIManager();
}); 