// === panel-manager.js ===
// Gestor de paneles con selector de paneles y distribución
// TODO: A TERMINAR EL DESARROLLO - Sistema de guardado automático implementado

class PanelManager {
  constructor() {
    this.availablePanels = {
      'bpmn': {
        name: 'Diagrama BPMN',
        icon: 'fas fa-diagram-project',
        description: 'Editor de diagramas BPMN',
        enabled: true
      },
      'rasci': {
        name: 'Matriz RASCI',
        icon: 'fas fa-table',
        description: 'Gestión de responsabilidades',
        enabled: true
      },
      'test': {
        name: 'Panel de Prueba',
        icon: 'fas fa-flask',
        description: 'Panel de pruebas y utilidades',
        enabled: true
      },
      'logs': {
        name: 'Logs del Sistema',
        icon: 'fas fa-terminal',
        description: 'Registros del sistema',
        enabled: true
      }
    };
    
    // Cargar configuración guardada o usar valores por defecto
    this.currentLayout = localStorage.getItem('panelLayout') || '2v';
    this.activePanels = this.loadActivePanels();
    this.panelLoader = null;
    this.preservedBpmnState = null; // Para preservar el estado BPMN cuando se oculta
    this.init();
  }

  init() {
    this.createStyles();
    this.bindEvents();
    
    // Verificar si hay paneles activos al inicio y ocultar contenedor si no los hay
    setTimeout(() => {
      // Ocultar contenedor si no hay paneles activos
      const container = document.getElementById('panel-container');
      if (container && this.activePanels.length === 0) {
        container.style.display = 'none';
        console.log('Inicialización: No hay paneles activos - contenedor oculto');
      }
      
      // Configurar observador para detectar cuando el panel RASCI se hace visible
      this.setupRasciVisibilityObserver();
    }, 100);
  }

  // Función para cargar paneles activos desde localStorage
  loadActivePanels() {
    try {
      const saved = localStorage.getItem('activePanels');
      if (saved) {
        const panels = JSON.parse(saved);
        // Verificar que los paneles existan en availablePanels
        return panels.filter(panel => this.availablePanels[panel]);
      }
    } catch (e) {
      console.warn('Error al cargar paneles activos:', e);
    }
    return []; // Sin paneles por defecto
  }

  // Función para guardar configuración de paneles
  savePanelConfiguration() {
    try {
      localStorage.setItem('activePanels', JSON.stringify(this.activePanels));
      localStorage.setItem('panelLayout', this.currentLayout);
    } catch (e) {
      console.warn('Error al guardar configuración de paneles:', e);
    }
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Estilos globales para scrollbars discretos */
      * {
        scrollbar-width: thin;
        scrollbar-color: #e0e0e0 #f8f9fa;
      }
      
      /* === ESTILOS DE LAYOUTS === */
      .panel-container {
        display: flex;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        gap: 2px;
      }
      
      /* Contenedor oculto cuando no hay paneles */
      .panel-container[style*="display: none"] {
        display: none !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
      }
      
      /* Paneles completamente ocultos */
      .panel[style*="display: none"] {
        display: none !important;
        visibility: hidden !important;
        position: absolute !important;
        left: -9999px !important;
        top: -9999px !important;
        width: 0 !important;
        height: 0 !important;
        flex: 0 !important;
        overflow: hidden !important;
        z-index: -1 !important;
        margin: 0 !important;
        padding: 0 !important;
        opacity: 0 !important;
        pointer-events: none !important;
      }
      
      /* Layout 2 vertical */
      .panel-container.layout-2v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      /* Layout 3 */
      .panel-container.layout-3 {
        display: grid;
        grid-template-columns: 1fr 1fr;
        grid-template-rows: 1fr;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-3 .panel:nth-child(1) {
        grid-column: 1;
        grid-row: 1;
      }
      
      .panel-container.layout-3 .panel:nth-child(2) {
        grid-column: 2;
        grid-row: 1;
      }
      
      .panel-container.layout-3 .panel:nth-child(3) {
        grid-column: 1 / -1;
        grid-row: 2;
      }
      
      /* Layout 3 vertical */
      .panel-container.layout-3v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      /* Layout 4 vertical */
      .panel-container.layout-4v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      /* Layout 4 grid removido - funcionalidad deshabilitada */
      
      /* Layout 1 */
      .panel-container.layout-1 {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      /* Estilos generales para paneles */
      .panel-container.layout-2v .panel,
      .panel-container.layout-4v .panel,
      .panel-container.layout-3 .panel,
      .panel-container.layout-3v .panel,
      .panel-container.layout-1 .panel {
        flex: 1;
        min-width: 0;
        min-height: 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }
      
      /* Scrollbars verticales discretos */
      *::-webkit-scrollbar:vertical {
        width: 6px;
      }
      
      *::-webkit-scrollbar-track:vertical {
        background: #f8f9fa;
        border-radius: 3px;
      }
      
      *::-webkit-scrollbar-thumb:vertical {
        background: #e0e0e0;
        border-radius: 3px;
      }
      
      *::-webkit-scrollbar-thumb:vertical:hover {
        background: #c0c0c0;
      }
      
      /* Scrollbars horizontales discretos */
      *::-webkit-scrollbar:horizontal {
        height: 6px;
      }
      
      *::-webkit-scrollbar-track:horizontal {
        background: #f8f9fa;
        border-radius: 3px;
      }
      
      *::-webkit-scrollbar-thumb:horizontal {
        background: #e0e0e0;
        border-radius: 3px;
      }
      
      *::-webkit-scrollbar-thumb:horizontal:hover {
        background: #c0c0c0;
      }
      
      .panel-selector {
        position: fixed;
        top: 55%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        padding: 20px;
        width: 600px;
        max-width: 85vw;
        max-height: 85vh;
        overflow-y: auto;
        scrollbar-width: none;
        -ms-overflow-style: none;
        z-index: 10002;
        display: none;
        border: 1px solid #e0e0e0;
      }
      
      .panel-selector::-webkit-scrollbar {
        display: none;
      }
      
      .panel-selector.show {
        display: block;
        animation: modalFadeIn 0.3s ease-out;
      }
      
      @keyframes modalFadeIn {
        from {
          opacity: 0;
          transform: translate(-50%, -50%) scale(0.9);
        }
        to {
          opacity: 1;
          transform: translate(-50%, -50%) scale(1);
        }
      }
      
      .panel-selector-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 10px;
        padding-bottom: 10px;
        border-bottom: 1px solid #e0e0e0;
      }
      
      .panel-selector-title {
        font-size: 16px;
        font-weight: 600;
        color: #333;
      }
      
      .panel-selector-close {
        background: none;
        border: none;
        font-size: 20px;
        cursor: pointer;
        color: #666;
        padding: 4px;
        border-radius: 4px;
        transition: all 0.2s ease;
      }
      
      .panel-selector-close:hover {
        background: #f0f0f0;
        color: #333;
      }
      
      .panel-selector-section {
        margin-bottom: 20px;
      }
      
      .panel-selector-section h3 {
        font-size: 13px;
        font-weight: 600;
        color: #333;
        margin-bottom: 10px;
        display: flex;
        align-items: center;
        gap: 6px;
      }
      
      .panel-selector-section h3 i {
        color: #3a56d4;
      }
      
      .layout-options {
        display: grid;
        grid-template-columns: repeat(5, 1fr);
        gap: 8px;
        margin-bottom: 16px;
      }
      
      .layout-option {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 12px 8px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      }
      
      .layout-option:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
      }
      
      .layout-option.active {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.1);
      }
      
      .layout-option.disabled {
        opacity: 0.7;
        cursor: not-allowed;
        background: #f8f9fa;
        border-color: #e0e0e0;
        color: #999;
      }
      
      .layout-option.disabled:hover {
        background: #f8f9fa;
        border-color: #e0e0e0;
        transform: none;
      }
      
      .layout-option-icon {
        font-size: 12px;
        margin-bottom: 4px;
        color: #3a56d4;
        line-height: 1.1;
        text-align: center;
      }
      
      .layout-option-label {
        font-size: 11px;
        font-weight: 500;
        color: #333;
        text-align: center;
      }
      
      .panel-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
        gap: 12px;
        max-height: 200px;
        overflow-y: auto;
        padding: 4px;
      }
      
      .panel-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s ease;
        background: white;
      }
      
      .panel-item:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
      }
      
      .panel-item.active {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.1);
      }
      
      /* Estilos para los botones de acción */
      .panel-selector-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
      }
      
      .panel-selector-btn {
        padding: 8px 16px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background: white;
        color: #333;
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .panel-selector-btn:hover {
        background: #f8f9fa;
        border-color: #ced4da;
      }
      
      .panel-selector-btn.primary {
        background: #3a56d4;
        color: white;
        border-color: #3a56d4;
      }
      
      .panel-selector-btn.primary:hover {
        background: #2d4a9e;
        border-color: #2d4a9e;
      }
      
      .panel-item-icon {
        font-size: 16px;
        color: #3a56d4;
        width: 20px;
        text-align: center;
      }
      
      .panel-item-info {
        flex: 1;
      }
      
      .panel-item-name {
        font-size: 13px;
        font-weight: 500;
        color: #333;
        margin-bottom: 2px;
      }
      
      .panel-item-description {
        font-size: 11px;
        color: #666;
      }
      
      .panel-item-checkbox {
        width: 16px;
        height: 16px;
        border: 2px solid #ccc;
        border-radius: 3px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
      }
      
      .panel-item.active .panel-item-checkbox {
        border-color: #3a56d4;
        background: #3a56d4;
        color: white;
      }
      
      .panel-selector-actions {
        display: flex;
        gap: 12px;
        justify-content: flex-end;
        margin-top: 20px;
        padding-top: 16px;
        border-top: 1px solid #e0e0e0;
      }
      
      .panel-selector-btn {
        padding: 8px 16px;
        border: 1px solid #ccc;
        border-radius: 6px;
        background: white;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        transition: all 0.2s ease;
      }
      
      .panel-selector-btn:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
      }
      
      .panel-selector-btn.primary {
        background: #3a56d4;
        color: white;
        border-color: #3a56d4;
      }
      
      .panel-selector-btn.primary:hover {
        background: #2a46c4;
      }
      
      .modal-overlay {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 0 !important;
        background: rgba(0,0,0,0.5) !important;
        z-index: 10001 !important;
        display: none !important;
        pointer-events: none !important;
      }
      
      .modal-overlay.show {
        display: block !important;
        pointer-events: auto !important;
        animation: overlayFadeIn 0.3s ease-out !important;
      }
      
      @keyframes overlayFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      .header-panel-btn {
        background: #3a56d4;
        color: white;
        border: none;
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        display: flex;
        align-items: center;
        gap: 6px;
        transition: all 0.2s ease;
      }
      
      .header-panel-btn:hover {
        background: #2a46c4;
        transform: translateY(-1px);
      }
      
      .header-panel-btn i {
        font-size: 14px;
      }

      /* Estilos para el selector de layout 4 paneles */
      .layout-4-selector {
        display: flex;
        flex-direction: column;
        gap: 15px;
        margin-top: 20px;
        padding-top: 15px;
        border-top: 1px solid #e0e0e0;
      }

      .layout-4-title {
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 10px;
      }

      .layout-4-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 15px;
      }

             .layout-4-position {
         display: flex;
         flex-direction: column;
         align-items: center;
         gap: 8px;
         padding: 12px;
         border: 2px solid #e0e0e0;
         border-radius: 8px;
         background: #f9f9f9;
         transition: all 0.2s ease;
       }

       .layout-4-position:hover {
         border-color: #3a56d4;
         background: rgba(58, 86, 212, 0.05);
       }

       .position-number {
         font-size: 24px;
         font-weight: bold;
         color: #3a56d4;
         background: white;
         width: 40px;
         height: 40px;
         border-radius: 50%;
         display: flex;
         align-items: center;
         justify-content: center;
         border: 2px solid #3a56d4;
       }

      .panel-selector-dropdown {
        width: 100%;
        padding: 8px 12px;
        border: 1px solid #ccc;
        border-radius: 6px;
        font-size: 13px;
        color: #333;
        background-color: #f9f9f9;
        cursor: pointer;
        transition: all 0.2s ease;
      }

      .panel-selector-dropdown:hover {
        border-color: #3a56d4;
        background-color: #f0f7ff;
      }


      
      /* Estilos para el orden de paneles */
      .panel-order {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 8px;
        margin-top: 8px;
        padding: 4px;
      }
      
      .panel-order-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 6px;
        padding: 12px 8px;
        border: 2px solid #e0e0e0;
        border-radius: 6px;
        background: #f9f9f9;
        transition: all 0.2s ease;
        min-height: 60px;
        justify-content: center;
      }
      
      .panel-order-item:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
        cursor: grab;
      }
      
      .panel-order-item:active {
        cursor: grabbing;
      }
      
      .panel-order-item.dragging {
        opacity: 0.5;
        transform: rotate(5deg);
      }
      
      .panel-order-item.drag-over {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.1);
        transform: scale(1.05);
      }
      
      .order-number {
        font-size: 14px;
        font-weight: bold;
        color: #3a56d4;
        background: white;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 2px solid #3a56d4;
        transition: all 0.2s ease;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      

      
      .order-panel-name {
        font-size: 11px;
        font-weight: 600;
        color: #333;
        text-align: center;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
        line-height: 1.2;
      }
      
      .panel-order-info {
        font-size: 12px;
        color: #666;
        text-align: center;
        margin-bottom: 10px;
        font-style: italic;
      }
      
      .panel-order-empty {
        grid-column: 1 / -1;
        text-align: center;
        padding: 20px;
        color: #999;
        font-size: 13px;
        font-style: italic;
        background: #f8f9fa;
        border: 1px dashed #dee2e6;
        border-radius: 8px;
        margin: 10px 0;
      }
      
      /* Estilos para la lista de paneles */
      .panel-list {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 12px;
        margin-top: 12px;
      }
      
      .panel-item {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 16px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        background: #fff;
        cursor: pointer;
        transition: all 0.2s ease;
        position: relative;
        min-height: 60px;
      }
      
      .panel-item:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.02);
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
      }
      
      .panel-item.active {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
        box-shadow: 0 2px 8px rgba(58, 86, 212, 0.2);
      }
      
      .panel-item-checkbox {
        width: 20px;
        height: 20px;
        border: 2px solid #d1d5db;
        border-radius: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #fff;
        color: #3a56d4;
        font-weight: bold;
        font-size: 12px;
        transition: all 0.2s ease;
        flex-shrink: 0;
      }
      
      .panel-item.active .panel-item-checkbox {
        background: #3a56d4;
        border-color: #3a56d4;
        color: white;
      }
      
      .panel-item-icon {
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: #f3f4f6;
        border-radius: 6px;
        color: #6b7280;
        font-size: 16px;
        flex-shrink: 0;
      }
      
      .panel-item.active .panel-item-icon {
        background: #3a56d4;
        color: white;
      }
      
      .panel-item-content {
        flex: 1;
        min-width: 0;
      }
      
      .panel-item-name {
        font-weight: 600;
        font-size: 13px;
        color: #1f2937;
        margin-bottom: 3px;
        line-height: 1.2;
      }
      
      .panel-item-description {
        font-size: 11px;
        color: #6b7280;
        line-height: 1.3;
      }
    `;
    document.head.appendChild(style);
  }

  createPanelSelector() {
    // Crear overlay
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'panel-selector-overlay';
    document.body.appendChild(overlay);

    // Crear selector
    const selector = document.createElement('div');
    selector.className = 'panel-selector';
    selector.id = 'panel-selector';
    
    selector.innerHTML = `
      <div class="panel-selector-header">
        <div class="panel-selector-title">Configurar Paneles</div>
        <button class="panel-selector-close" onclick="panelManager.closeSelector()">×</button>
      </div>
      
      <div class="panel-selector-section">
        <h3><i class="fas fa-check-square"></i> Seleccionar Paneles</h3>
        <div class="panel-list" id="panel-list">
          ${this.generatePanelList()}
        </div>
      </div>
      
      <div class="panel-selector-section" id="panel-order-section" style="display: none;">
        <h3><i class="fas fa-sort"></i> Orden de Paneles</h3>
        <div class="panel-order-info">Arrastra los paneles para cambiar su orden</div>
        <div class="panel-order" id="panel-order">
          ${this.generatePanelOrder()}
        </div>
      </div>
      
      <div class="panel-selector-actions">
        <button class="panel-selector-btn" onclick="panelManager.closeSelector()">Cancelar</button>
        <button class="panel-selector-btn primary" onclick="panelManager.applyConfiguration()">Aplicar</button>
      </div>
    `;
    
    document.body.appendChild(selector);
    
    // Configurar event listeners para el modal
    overlay.addEventListener('click', () => {
      this.closeSelector();
    });
  }





  generatePanelList() {
    return Object.entries(this.availablePanels).map(([key, panel]) => {
      const isActive = this.activePanels.includes(key);
      return `
        <div class="panel-item ${isActive ? 'active' : ''}" data-panel="${key}">
          <div class="panel-item-checkbox">${isActive ? '✓' : ''}</div>
          <div class="panel-item-icon">
            <i class="${panel.icon}"></i>
          </div>
          <div class="panel-item-content">
            <div class="panel-item-name">${panel.name}</div>
            <div class="panel-item-description">${panel.description}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  generatePanelOrder() {
    if (this.activePanels.length <= 1) {
      return '<div class="panel-order-empty">Se necesitan al menos 2 paneles para cambiar el orden</div>';
    }

    return this.activePanels.map((panelKey, index) => {
      const panelInfo = this.availablePanels[panelKey];
      if (!panelInfo) return '';

      return `
        <div class="panel-order-item" data-panel="${panelKey}" data-index="${index}" draggable="true">
          <div class="order-number">${index + 1}</div>
          <div class="order-panel-name">${panelInfo.name}</div>
        </div>
      `;
    }).join('');
  }

  updateLayoutOptions() {
    const orderSection = document.getElementById('panel-order-section');
    const orderContainer = document.getElementById('panel-order');
    
    // Establecer layout automáticamente basado en el número de paneles
    const panelCount = this.activePanels.length;
    if (panelCount === 1) {
      this.currentLayout = '1';
    } else if (panelCount === 2) {
      this.currentLayout = '2v';
    } else if (panelCount === 3) {
      this.currentLayout = '3v';
    } else if (panelCount >= 4) {
      this.currentLayout = '4v';
    }
    
    // Mostrar sección de orden solo si hay más de 1 panel
    if (orderSection && orderContainer) {
      if (this.activePanels.length > 1) {
        orderSection.style.display = 'block';
        orderContainer.innerHTML = this.generatePanelOrder();
        this.setupPanelOrderDragAndDrop();
      } else {
        orderSection.style.display = 'none';
      }
    }
  }



  bindEvents() {
    // Panel items
    document.addEventListener('click', (e) => {
      if (e.target.closest('.panel-item')) {
        const item = e.target.closest('.panel-item');
        const panelKey = item.getAttribute('data-panel');
        
        if (this.activePanels.includes(panelKey)) {
          this.activePanels = this.activePanels.filter(p => p !== panelKey);
          item.classList.remove('active');
          item.querySelector('.panel-item-checkbox').textContent = '';
        } else {
          this.activePanels.push(panelKey);
          item.classList.add('active');
          item.querySelector('.panel-item-checkbox').textContent = '✓';
        }
        
        // Guardar configuración automáticamente
        this.savePanelConfiguration();
        
        // Actualizar opciones de layout basadas en el número de paneles
        this.updateLayoutOptions();
        
        // Actualizar la lista de paneles para reflejar los cambios
        this.updatePanelSelector();
        
        // NO aplicar automáticamente - solo actualizar la vista del selector
      }
      

    });

    // Overlay click to close - se configurará cuando se cree el modal
    // document.getElementById('panel-selector-overlay').addEventListener('click', () => {
    //   this.closeSelector();
    // });
  }

  updatePanelSelector() {
    const panelList = document.getElementById('panel-list');
    if (panelList) {
      panelList.innerHTML = this.generatePanelList();
    }
  }

  showSelector() {
    // Crear el selector si no existe
    if (!document.getElementById('panel-selector-overlay')) {
      this.createPanelSelector();
    }
    
    // Actualizar lista de paneles y opciones de layout antes de mostrar
    this.updatePanelSelector();
    this.updateLayoutOptions();
    
    const overlay = document.getElementById('panel-selector-overlay');
    const selector = document.getElementById('panel-selector');
    
    if (overlay) {
      overlay.classList.add('show');
    }
    
    if (selector) {
      selector.classList.add('show');
    }
  }

  closeSelector() {
    const overlay = document.getElementById('panel-selector-overlay');
    const selector = document.getElementById('panel-selector');
    
    if (overlay) {
      overlay.classList.remove('show');
    }
    
    if (selector) {
      selector.classList.remove('show');
    }
  }

  async applyConfiguration() {
    const container = document.getElementById('panel-container');
    if (!container) return;

    // Preservar el estado del BPMN si existe
    let bpmnState = null;
    const existingBpmnPanel = container.querySelector('#bpmn-panel');
    if (existingBpmnPanel && window.bpmnModeler) {
      try {
        // Guardar el estado actual del modeler
        bpmnState = {
          xml: await window.bpmnModeler.saveXML({ format: true }),
          svg: await window.bpmnModeler.saveSVG()
        };
        console.log('Estado BPMN preservado');
      } catch (error) {
        console.error('Error preservando estado BPMN:', error);
      }
    }

    // Restaurar completamente todos los paneles existentes antes de limpiar
    const existingPanels = container.querySelectorAll('.panel');
    existingPanels.forEach(panel => {
      this.restorePanel(panel);
    });

    // Limpiar contenedor
    container.innerHTML = '';

    // Si no hay paneles activos, ocultar completamente el contenedor
    if (this.activePanels.length === 0) {
      container.style.display = 'none';
      container.style.visibility = 'hidden';
      container.style.position = 'absolute';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.width = '0';
      container.style.height = '0';
      container.style.overflow = 'hidden';
      container.style.zIndex = '-1';
      console.log('No hay paneles activos - contenedor completamente oculto');
      this.closeSelector();
      return;
    }

    // Mostrar el contenedor si hay paneles
    container.style.display = 'flex';
    container.style.visibility = 'visible';
    container.style.position = 'relative';
    container.style.left = '';
    container.style.top = '';
    container.style.width = '';
    container.style.height = '';
    container.style.overflow = '';
    container.style.zIndex = '';

    // Crear paneles activos en el orden especificado
    for (const panelKey of this.activePanels) {
      try {
        const panel = await this.panelLoader.createPanel(panelKey, container);
        if (panel) {
          panel.style.flex = '1';
          // Asignar posición basada en el índice en activePanels para todos los layouts
          const index = this.activePanels.indexOf(panelKey);
          panel.setAttribute('data-position', (index + 1).toString());
        }
      } catch (error) {
        console.error(`Error creating panel ${panelKey}:`, error);
      }
    }

    // NO ajustar layout automáticamente - usar el layout seleccionado por el usuario
    // El layout ya está establecido en this.currentLayout

    // Aplicar layout directamente sin snap system
    console.log('Aplicando layout:', this.currentLayout);
    console.log('Número de paneles activos:', this.activePanels.length);
    
    // Aplicar layout directamente al contenedor
    if (container) {
      // Remover todas las clases de layout anteriores
      container.className = 'panel-container';
      // Agregar la clase del layout actual
      container.classList.add(`layout-${this.currentLayout}`);
    }
    
    // Resizers removidos - No se necesita redimensionamiento de paneles
    // setTimeout(() => {
    //   if (window.panelResizer) {
    //     window.panelResizer.makeAllPanelsResizable();
    //   }
    // }, 200);

    // Reinicializar el modeler si es necesario y restaurar estado
    if (this.activePanels.includes('bpmn')) {
      setTimeout(async () => {
        if (typeof window.initializeModeler === 'function') {
          window.initializeModeler();
          
          // Debug del estado antes de cargar
          if (typeof window.debugBpmnState === 'function') {
            window.debugBpmnState();
          }
          
          // Usar la función loadBpmnState que carga desde localStorage
          // en lugar de intentar restaurar desde el estado preservado
          setTimeout(() => {
            if (typeof window.loadBpmnState === 'function') {
              window.loadBpmnState();
            }
          }, 200); // Pequeño delay para asegurar que el modeler esté listo
        }
      }, 500); // Aumentar el tiempo para asegurar que el DOM esté listo
    }

    // Recargar automáticamente el panel RASCI si está activo
    if (this.activePanels.includes('rasci')) {
      setTimeout(() => {
        const rasciPanel = container.querySelector('#rasci-panel');
        if (rasciPanel && typeof window.reloadRasciMatrix === 'function') {
          console.log('Recargando automáticamente matriz RASCI');
          window.reloadRasciMatrix();
        }
      }, 300); // Delay para asegurar que el panel RASCI esté completamente cargado
    }

    this.closeSelector();
    console.log(`Configuración aplicada: Layout ${this.currentLayout}, Paneles: ${this.activePanels.join(', ')}`);
  }

  adjustLayoutForVisiblePanels() {
    if (!window.snapSystem) return;
    
    // Contar paneles visibles correctamente
    const container = document.getElementById('panel-container');
    if (!container) return;
    
    const allPanels = container.querySelectorAll('.panel');
    let visibleCount = 0;
    
    allPanels.forEach(panel => {
      // Verificar si el panel está realmente visible
      const isVisible = panel.style.display !== 'none' && 
                       !panel.classList.contains('minimized') &&
                       panel.offsetParent !== null;
      if (isVisible) {
        visibleCount++;
      }
    });
    
    console.log(`Paneles visibles: ${visibleCount}`);
    
    // Ajustar layout automáticamente
    let newLayout;
    if (visibleCount === 1) {
      newLayout = '1';
    } else if (visibleCount === 2) {
      newLayout = '2v';
    } else if (visibleCount === 3) {
      newLayout = '3v'; // Vertical (uno encima del otro)
    } else if (visibleCount >= 4) {
      newLayout = '4';
    }
    
    if (newLayout && newLayout !== this.currentLayout) {
      console.log(`Ajustando layout automáticamente de ${this.currentLayout} a ${newLayout}`);
      this.currentLayout = newLayout;
      window.snapSystem.changeLayout(newLayout);
    }
  }

  setPanelLoader(loader) {
    this.panelLoader = loader;
  }

  // Función para restaurar completamente un panel oculto
  restorePanel(panel) {
    if (panel) {
      const wasHidden = panel.style.display === 'none';
      const panelType = panel.getAttribute('data-panel-type');
      
      panel.style.display = '';
      panel.style.visibility = '';
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.width = '';
      panel.style.height = '';
      panel.style.flex = '';
      panel.style.overflow = '';
      panel.style.zIndex = '';
      panel.style.margin = '';
      panel.style.padding = '';
      panel.style.opacity = '';
      panel.style.pointerEvents = '';
      
      // Si el panel RASCI se está restaurando desde un estado oculto, recargarlo
      if (wasHidden && panelType === 'rasci' && typeof window.reloadRasciMatrix === 'function') {
        setTimeout(() => {
          console.log('Panel RASCI restaurado - recargando matriz automáticamente');
          window.reloadRasciMatrix();
        }, 100);
      }
    }
  }

  // Configurar observador para detectar cuando el panel RASCI se hace visible
  setupRasciVisibilityObserver() {
    // Usar MutationObserver para detectar cambios en el DOM
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Verificar si se agregó un panel RASCI
              if (node.id === 'rasci-panel' || node.querySelector('#rasci-panel')) {
                setTimeout(() => {
                  if (typeof window.reloadRasciMatrix === 'function') {
                    console.log('Panel RASCI detectado en DOM - recargando matriz automáticamente');
                    window.reloadRasciMatrix();
                  }
                }, 200);
              }
            }
          });
        }
      });
    });

    // Observar cambios en el contenedor de paneles
    const container = document.getElementById('panel-container');
    if (container) {
      observer.observe(container, {
        childList: true,
        subtree: true
      });
    }
  }

  setupPanelOrderDragAndDrop() {
    const orderContainer = document.getElementById('panel-order');
    if (!orderContainer) return;

    const items = orderContainer.querySelectorAll('.panel-order-item');
    
    items.forEach(item => {
      item.addEventListener('dragstart', (e) => {
        e.dataTransfer.setData('text/plain', item.getAttribute('data-panel'));
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', (e) => {
        item.classList.remove('dragging');
        // Remover todas las clases de drag-over
        items.forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', (e) => {
        // Solo remover la clase si no estamos sobre el elemento
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over');
        }
      });

      item.addEventListener('drop', (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const draggedPanel = e.dataTransfer.getData('text/plain');
        const targetPanel = item.getAttribute('data-panel');
        
        if (draggedPanel !== targetPanel) {
          this.reorderPanels(draggedPanel, targetPanel);
        }
      });
    });
  }

  reorderPanels(draggedPanel, targetPanel) {
    const draggedIndex = this.activePanels.indexOf(draggedPanel);
    const targetIndex = this.activePanels.indexOf(targetPanel);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    // Remover el panel arrastrado de su posición actual
    this.activePanels.splice(draggedIndex, 1);
    
    // Insertar el panel arrastrado en la nueva posición
    this.activePanels.splice(targetIndex, 0, draggedPanel);
    
    // Guardar la nueva configuración
    this.savePanelConfiguration();
    
    // Actualizar la vista del orden
    this.updateLayoutOptions();
  }
}

// Exportar la clase
window.PanelManager = PanelManager; 