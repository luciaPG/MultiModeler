// === PPI UI Components ===
// Componentes de interfaz de usuario para el gestor de PPIs

class PPIUI {
  constructor(ppiCore) {
    this.core = ppiCore;
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
    const measureType = this.core.measureTypes[measureTypeKey] || this.core.measureTypes.derived;
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
    
    // Calcular progreso/completitud
    const completedFields = [ppi.title, ppi.target, ppi.scope, ppi.responsible].filter(Boolean).length;
    const totalFields = 4;
    const completionPercentage = Math.round((completedFields / totalFields) * 100);
    const isComplete = completionPercentage === 100;
    
    // Determinar badges - solo estado de completitud
    const badges = [];
    if (isComplete) {
      badges.push('<span class="status-badge complete"><i class="fas fa-check-circle"></i> Completo</span>');
    } else {
      badges.push('<span class="status-badge incomplete"><i class="fas fa-exclamation-triangle"></i> Incompleto</span>');
    }
    
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
              ${badges.join('')}
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
                ${this.core.truncateText(ppi.target || 'No definido', 35)}
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

  // === LIST MANAGEMENT ===
  
  refreshPPIList() {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    // Add loading state
    container.style.opacity = '0.6';
    container.style.pointerEvents = 'none';
    
    setTimeout(() => {
      container.innerHTML = '';
      
      // Use filtered PPIs if available, otherwise use all PPIs
      const ppisToShow = this.core.filteredPPIs.length > 0 ? this.core.filteredPPIs : this.core.ppis;
      
      if (ppisToShow.length === 0) {
        container.innerHTML = `
          <div class="empty-state">
            <div class="empty-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <h3>${this.core.ppis.length === 0 ? 'No hay PPIs definidos' : 'No se encontraron PPIs'}</h3>
            <p>${this.core.ppis.length === 0 ? 'Los PPIs se crearán automáticamente cuando agregues elementos PPI al canvas BPMN' : 'Intenta ajustar los filtros de búsqueda'}</p>
          </div>
        `;
      } else {
        // Añadir estilos mejorados
        this.addImprovedStyles();
        
        ppisToShow.forEach((ppi, index) => {
          const ppiElement = this.createPPIElement(ppi);
          ppiElement.style.animationDelay = `${index * 0.1}s`;
          container.appendChild(ppiElement);
        });
      }
      
      // Restore normal state
      container.style.opacity = '1';
      container.style.pointerEvents = 'auto';
    }, 150);
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
        <div class="ppi-modal-header">
          <h3>${title}</h3>
          <button class="ppi-modal-close" onclick="this.closest('.ppi-modal-overlay').remove()">
            <i class="fas fa-times"></i>
          </button>
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
  }

  // === FORM GENERATION ===
  
  generateDetailContent(ppi) {
    const measureType = this.core.measureTypes[ppi.measureDefinition.type];
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
      <div class="ppi-detail-grid">
        <div class="detail-section">
          <h4><i class="fas fa-info-circle"></i> Información General</h4>
          <div class="detail-item">
            <strong>Título:</strong> ${ppi.title || 'Sin título'}
          </div>
          <div class="detail-item">
            <strong>Proceso:</strong> ${ppi.process || 'No especificado'}
          </div>
          <div class="detail-item">
            <strong>Objetivo de Negocio:</strong> ${ppi.businessObjective || 'No definido'}
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="${measureType.icon}"></i> Medición</h4>
          <div class="detail-item">
            <strong>Tipo de Medida:</strong> ${measureType.name}
          </div>
          <div class="detail-item">
            <strong>Definición:</strong> ${ppi.measureDefinition.definition || 'No definida'}
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-bullseye"></i> Objetivos y Alcance</h4>
          <div class="detail-item">
            <strong>Target:</strong> ${ppi.target || 'No definido'}
          </div>
          <div class="detail-item">
            <strong>Scope:</strong> ${ppi.scope || 'Sin scope definido'}
          </div>
          <div class="detail-item">
            <strong>Fuente de Datos:</strong> ${ppi.source || 'No especificada'}
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-users"></i> Responsabilidades</h4>
          <div class="detail-item">
            <strong>Responsable:</strong> ${ppi.responsible || 'No asignado'}
          </div>
          <div class="detail-item">
            <strong>Informados:</strong> ${Array.isArray(ppi.informed) && ppi.informed.length > 0 ? ppi.informed.join(', ') : 'Ninguno'}
          </div>
        </div>

        <div class="detail-section">
          <h4><i class="fas fa-clock"></i> Información Temporal</h4>
          <div class="detail-item">
            <strong>Creado:</strong> ${createdAt}
          </div>
          <div class="detail-item">
            <strong>Última Actualización:</strong> ${updatedAt}
          </div>
          <div class="detail-item">
            <strong>Elemento BPMN:</strong> ${ppi.elementId || 'No vinculado'}
          </div>
        </div>

        ${ppi.comments ? `
          <div class="detail-section">
            <h4><i class="fas fa-comment"></i> Comentarios</h4>
            <div class="detail-item">
              ${ppi.comments}
            </div>
          </div>
        ` : ''}
      </div>
    `;
  }

  generateEditForm(ppi) {
    const measureTypes = Object.entries(this.core.measureTypes).map(([key, type]) => 
      `<option value="${key}" ${ppi.measureDefinition.type === key ? 'selected' : ''}>${type.name}</option>`
    ).join('');

    return `
      <form id="edit-ppi-form" class="ppi-edit-form">
        <div class="form-grid">
          <div class="form-section">
            <h4><i class="fas fa-info-circle"></i> Información General</h4>
            
            <div class="form-group">
              <label for="edit-title">Título del PPI:</label>
              <input type="text" id="edit-title" name="title" value="${ppi.title || ''}" required>
            </div>

            <div class="form-group">
              <label for="edit-process">Proceso:</label>
              <input type="text" id="edit-process" name="process" value="${ppi.process || ''}">
            </div>

            <div class="form-group">
              <label for="edit-business-objective">Objetivo de Negocio:</label>
              <textarea id="edit-business-objective" name="businessObjective" rows="3">${ppi.businessObjective || ''}</textarea>
            </div>
          </div>

          <div class="form-section">
            <h4><i class="fas fa-chart-bar"></i> Definición de Medida</h4>
            
            <div class="form-group">
              <label for="edit-measure-type">Tipo de Medida:</label>
              <select id="edit-measure-type" name="measureType" required>
                ${measureTypes}
              </select>
            </div>

            <div class="form-group">
              <label for="edit-measure-definition">Definición de la Medida:</label>
              <textarea id="edit-measure-definition" name="measureDefinition" rows="3">${ppi.measureDefinition.definition || ''}</textarea>
            </div>
          </div>

          <div class="form-section">
            <h4><i class="fas fa-bullseye"></i> Objetivos y Alcance</h4>
            
            <div class="form-group">
              <label for="edit-target">Target:</label>
              <input type="text" id="edit-target" name="target" value="${ppi.target || ''}" placeholder="Información del canvas: ${ppi.target || 'No definido desde BPMN'}">
            </div>

            <div class="form-group">
              <label for="edit-scope">Scope:</label>
              <input type="text" id="edit-scope" name="scope" value="${ppi.scope || ''}" placeholder="Información del canvas: ${ppi.scope || 'No definido desde BPMN'}">
            </div>

            <div class="form-group">
              <label for="edit-source">Fuente de Datos:</label>
              <input type="text" id="edit-source" name="source" value="${ppi.source || ''}">
            </div>
          </div>

          <div class="form-section">
            <h4><i class="fas fa-users"></i> Responsabilidades</h4>
            
            <div class="form-group">
              <label for="edit-responsible">Responsable:</label>
              <input type="text" id="edit-responsible" name="responsible" value="${ppi.responsible || ''}">
            </div>

            <div class="form-group">
              <label for="edit-informed">Personas Informadas (separadas por comas):</label>
              <input type="text" id="edit-informed" name="informed" value="${Array.isArray(ppi.informed) ? ppi.informed.join(', ') : ''}">
            </div>

            <div class="form-group">
              <label for="edit-comments">Comentarios:</label>
              <textarea id="edit-comments" name="comments" rows="3">${ppi.comments || ''}</textarea>
            </div>
          </div>
        </div>
      </form>
    `;
  }

  // === STYLES MANAGEMENT ===
  
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
        border: 1px solid var(--bg-muted);
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

      .ppi-card:hover {
        transform: translateY(-2px);
        box-shadow: var(--shadow-lg);
        border-color: var(--ppi-primary);
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
        padding: 30px;
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

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      ${type === 'success' ? 'background-color: #28a745;' : 'background-color: #dc3545;'}
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
}

// Exportar para uso global
window.PPIUI = PPIUI; 