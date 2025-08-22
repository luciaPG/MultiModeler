// === panel-manager.js ===
// Gestor de paneles con selector de paneles y distribución
import modelerManager from './modeler-manager.js';
import { PanelLoader } from './panel-loader.js';

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
      'ppi': {
        name: 'PPI Indicators',
        icon: 'fas fa-chart-line',
        description: 'Indicadores de Rendimiento de Procesos',
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
    
    // Usar valores por defecto sin localStorage
    this.currentLayout = '2v';
    this.activePanels = ['bpmn']; // Solo abrir panel BPMN por defecto
    // Initialize panelLoader directly using the imported PanelLoader
    this.panelLoader = new PanelLoader();
    // Variable eliminada - usamos solo localStorage
    this.isApplyingConfiguration = false; // Bandera para prevenir ejecuciones múltiples
    
    // Limpiar cualquier modal remanente al inicializar
    this.cleanupExistingModals();
    
    this.init();
    
    // Agregar listener para redimensionamiento de ventana
    this.setupWindowResizeListener();
  }
  
  setupWindowResizeListener() {
    let resizeTimeout;
    window.addEventListener('resize', () => {
      // Debounce para evitar muchas llamadas
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        // En el commit anterior no se hacía resize manual del canvas
        // El canvas se redimensiona automáticamente
      }, 250);
    });
  }

  cleanupExistingModals() {
    const existingOverlay = document.getElementById('panel-selector-overlay');
    const existingSelector = document.getElementById('panel-selector');
    
    if (existingOverlay && existingOverlay.parentNode) {
      existingOverlay.remove();
    }
    
    if (existingSelector && existingSelector.parentNode) {
      existingSelector.remove();
    }
    
    const orphanOverlays = document.querySelectorAll('.modal-overlay:not(#panel-selector-overlay)');
    orphanOverlays.forEach(overlay => {
      if (overlay.parentNode) {
        overlay.remove();
      }
    });
  }

  init() {
    this.createStyles();
    this.bindEvents();
    
    // Initialize the panelLoader if it doesn't exist
    if (!this.panelLoader && window.panelLoader) {
      this.panelLoader = window.panelLoader;
    } else if (!this.panelLoader && window.PanelLoader) {
      this.panelLoader = new window.PanelLoader();
    } else if (!this.panelLoader) {
      console.error('PanelLoader not found - panels will not work');
    }
    
    setTimeout(() => {
      const container = document.getElementById('panel-container');
      if (container && this.activePanels.length === 0) {
        container.style.display = 'none';
      }
      
      this.setupRasciVisibilityObserver();
    }, 100);
  }

  loadActivePanels() {
    // Default panels instead of using localStorage
    return ['bpmn', 'rasci'];
  }

  savePanelConfiguration() {
    // No-op function - no longer using localStorage
    try {
      // Just logging for debugging purposes
      console.log('Panel configuration updated (in memory)');
    } catch (e) {   
      console.error('Error saving panel configuration:', e);
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
        background: white !important;
        border-radius: 12px !important;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2) !important;
        padding: 20px !important;
        width: 600px !important;
        max-width: 85vw !important;
        max-height: 85vh !important;
        overflow-y: auto !important;
        scrollbar-width: none !important;
        -ms-overflow-style: none !important;
        z-index: 10001 !important;
        position: relative !important;
        border: 1px solid #e0e0e0 !important;
        margin: 0 !important;
        pointer-events: auto !important;
      }
      
      .panel-selector::-webkit-scrollbar {
        display: none;
      }
      
      .panel-selector.show {
        animation: modalFadeIn 0.3s ease-out;
      }
      
      @keyframes modalFadeIn {
        from {
          opacity: 0;
          transform: scale(0.9);
        }
        to {
          opacity: 1;
          transform: scale(1);
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
        z-index: 10000 !important;
        display: none !important;
        align-items: center !important;
        justify-content: center !important;
        backdrop-filter: blur(2px) !important;
        pointer-events: auto !important;
      }
      
      .modal-overlay.show {
        display: flex !important;
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
    if (document.getElementById('panel-selector') || document.getElementById('panel-selector-overlay')) {
      return;
    }
    
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.id = 'panel-selector-overlay';

    const selector = document.createElement('div');
    selector.className = 'panel-selector';
    selector.id = 'panel-selector';
    
    selector.innerHTML = `
      <div class="panel-selector-header">
        <div class="panel-selector-title">Configurar Paneles</div>
                <button class="panel-selector-close" id="panel-selector-close-btn" onclick="window.closePanelSelector()">×</button>
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
        <button class="panel-selector-btn" id="panel-selector-cancel-btn">Cancelar</button>
        <button class="panel-selector-btn primary" id="panel-selector-apply-btn">Aplicar</button>
      </div>
    `;
    
    overlay.appendChild(selector);
    document.body.appendChild(overlay);
    this.setupModalEventListeners(overlay, selector);
  }

  setupModalEventListeners(overlay, selector) {
    let closeBtn = selector.querySelector('#panel-selector-close-btn');
    let cancelBtn = selector.querySelector('#panel-selector-cancel-btn');
    let applyBtn = selector.querySelector('#panel-selector-apply-btn');
    
    if (!closeBtn) closeBtn = selector.querySelector('.panel-selector-close');
    if (!cancelBtn) cancelBtn = selector.querySelector('.panel-selector-btn:not(.primary)');
    if (!applyBtn) applyBtn = selector.querySelector('.panel-selector-btn.primary');
    
    if (closeBtn) {
      const newCloseBtn = closeBtn.cloneNode(true);
      closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
      
      newCloseBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSelector();
      });
    }
    
    if (cancelBtn) {
      const newCancelBtn = cancelBtn.cloneNode(true);
      cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
      
      newCancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSelector();
      });
    }
    
    if (applyBtn) {
      const newApplyBtn = applyBtn.cloneNode(true);
      applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
      
      newApplyBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applyConfiguration();
      });
    }
    
    const panelItems = selector.querySelectorAll('.panel-item');
    
    panelItems.forEach(item => {
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const panelKey = item.getAttribute('data-panel');
        
        if (this.activePanels.includes(panelKey)) {
          // El localStorage se maneja automáticamente, no necesitamos preservar
          
          this.activePanels = this.activePanels.filter(p => p !== panelKey);
          item.classList.remove('active');
          const checkbox = item.querySelector('.panel-item-checkbox');
          if (checkbox) checkbox.textContent = '';
        } else {
          this.activePanels.push(panelKey);
          item.classList.add('active');
          const checkbox = item.querySelector('.panel-item-checkbox');
          if (checkbox) checkbox.textContent = '✓';
        }
        
        this.savePanelConfiguration();
        await this.updateLayoutOptions();
        this.updatePanelSelector();
      });
    });
    
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        this.closeSelector();
      }
    });
    
    selector.addEventListener('click', (e) => {
      e.stopPropagation();
    });
    
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.closeSelector();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    
    document.addEventListener('keydown', handleEscape);
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

  async updateLayoutOptions() {
    const orderSection = document.getElementById('panel-order-section');
    const orderContainer = document.getElementById('panel-order');
    
    const panelCount = this.activePanels.length;
    let newLayout;
    if (panelCount === 1) {
      newLayout = '1';
    } else if (panelCount === 2) {
      newLayout = '2v';
    } else if (panelCount === 3) {
      newLayout = '3v';
    } else if (panelCount >= 4) {
      newLayout = '4v';
    }
    
    // No longer using localStorage
    
    this.currentLayout = newLayout;
    
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
    // Event listeners del modal se configuran dinámicamente
  }

  updatePanelSelector() {
    const panelList = document.getElementById('panel-list');
    if (panelList) {
      this.refreshPanelList();
    }
  }

  setupPanelItemEventListeners() {
    const panelItems = document.querySelectorAll('.panel-item');
    
    panelItems.forEach((item) => {
      const panelKey = item.getAttribute('data-panel');
      
      if (item.hasAttribute('data-listener-configured')) {
        return;
      }
      
      item.setAttribute('data-listener-configured', 'true');
      
      item.addEventListener('click', async (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        if (this.activePanels.includes(panelKey)) {
          // El localStorage se maneja automáticamente
          
          this.activePanels = this.activePanels.filter(p => p !== panelKey);
          item.classList.remove('active');
          const checkbox = item.querySelector('.panel-item-checkbox');
          if (checkbox) checkbox.textContent = '';
        } else {
          this.activePanels.push(panelKey);
          item.classList.add('active');
          const checkbox = item.querySelector('.panel-item-checkbox');
          if (checkbox) checkbox.textContent = '✓';
        }
        
        this.savePanelConfiguration();
        await this.updateLayoutOptions();
        
        setTimeout(() => {
          this.refreshPanelList();
        }, 50);
      });
    });
  }
  
  refreshPanelList() {
    const panelList = document.getElementById('panel-list');
    if (panelList) {
      const existingItems = panelList.querySelectorAll('.panel-item');
      existingItems.forEach(item => {
        item.removeAttribute('data-listener-configured');
      });
      
      panelList.innerHTML = this.generatePanelList();
      this.setupPanelItemEventListeners();
    }
  }

  async showSelector() {
    let overlay = document.getElementById('panel-selector-overlay');
    let selector = document.getElementById('panel-selector');
    
    if (overlay || selector) {
      if (overlay && overlay.parentNode) overlay.remove();
      if (selector && selector.parentNode) selector.remove();
    }
    
    this.createPanelSelector();

    overlay = document.getElementById('panel-selector-overlay');
    selector = document.getElementById('panel-selector');

    if (!overlay || !selector) {
      return;
    }

    this.updatePanelSelector();
    await this.updateLayoutOptions();

    overlay.classList.add('show');
    overlay.style.display = 'flex';
    selector.classList.add('show');
    
    setTimeout(() => {
      this.setupPanelItemEventListeners();
      this.forceReconfigureButtonListeners(overlay, selector);
      this.savePanelConfiguration();
    }, 100);
  }
  
  forceReconfigureButtonListeners(overlay, selector) {
    const closeBtn = selector.querySelector('#panel-selector-close-btn');
    const cancelBtn = selector.querySelector('#panel-selector-cancel-btn');
    const applyBtn = selector.querySelector('#panel-selector-apply-btn');
    
    if (closeBtn && !closeBtn.hasAttribute('data-emergency-configured')) {
      closeBtn.setAttribute('data-emergency-configured', 'true');
      closeBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSelector();
      };
    }
    
    if (cancelBtn && !cancelBtn.hasAttribute('data-emergency-configured')) {
      cancelBtn.setAttribute('data-emergency-configured', 'true');
      cancelBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.closeSelector();
      };
    }
    
    if (applyBtn && !applyBtn.hasAttribute('data-emergency-configured')) {
      applyBtn.setAttribute('data-emergency-configured', 'true');
      applyBtn.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        this.applyConfiguration();
      };
    }
  }

  closeSelector() {
    const overlay = document.getElementById('panel-selector-overlay');
    const selector = document.getElementById('panel-selector');

    if (overlay) {
      overlay.remove();
    }

    // El selector se elimina junto con el overlay ya que está dentro
    if (selector && selector.parentNode !== overlay) {
      selector.remove();
    }
    
  }

  async applyConfiguration() {
    // Prevenir ejecuciones múltiples concurrentes
    if (this.isApplyingConfiguration) {
      console.log('⚠️ Ya se está aplicando una configuración de paneles, ignorando llamada');
      return;
    }
    
    this.isApplyingConfiguration = true;
    console.log('🔄 Aplicando nueva configuración de paneles...');
    
    try {
      const container = document.getElementById('panel-container');
      if (!container) {
        console.error('❌ No se encontró el contenedor de paneles');
        return;
      }

      // Save BPMN state if we have a BPMN panel
      if (this.activePanels.includes('bpmn')) {
        console.log('💾 Guardando estado del panel BPMN antes del cambio...');
        // Use modelerManager to save the state before changing panels
        // Using await to ensure state is saved before continuing
        try {
          const savedSuccessfully = await modelerManager.saveState();
          console.log('💾 Estado BPMN guardado:', savedSuccessfully ? '✅ Exitoso' : '⚠️ Fallido');
        } catch (err) {
          console.error('❌ Error al guardar estado del modelador BPMN:', err);
        }
      }

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
          console.error('Error creating panel:', error);
        }
      }

      if (container) {
        container.className = 'panel-container';
        container.classList.add(`layout-${this.currentLayout}`);
        this.adjustLayoutForVisiblePanels();
      }

      // Initialize the BPMN modeler with more robust error handling
      if (this.activePanels.includes('bpmn')) {
        setTimeout(() => {
          console.log('Inicializando el modeler BPMN con manejo robusto');
          
          // Verify the BPMN panel exists and has a canvas
          const bpmnPanel = document.querySelector('[data-panel-type="bpmn"]');
          
          if (!bpmnPanel) {
            console.error('BPMN panel not found in DOM');
            return;
          }
          
          // Make sure the panel is visible
          bpmnPanel.style.display = '';
          bpmnPanel.style.visibility = 'visible';
          
          // Ensure the panel has the expected structure
          let canvas = bpmnPanel.querySelector('#js-canvas');
          if (!canvas) {
            console.warn('Canvas not found in BPMN panel, creating it');
            const panelContent = bpmnPanel.querySelector('.panel-content');
            if (panelContent) {
              canvas = document.createElement('div');
              canvas.id = 'js-canvas';
              canvas.className = 'bpmn-container';
              panelContent.appendChild(canvas);
              console.log('Created js-canvas element in BPMN panel');
            } else {
              console.error('Panel content container not found in BPMN panel');
              return;
            }
          }
          
          // Ensure canvas has proper dimensions
          canvas.style.width = '100%';
          canvas.style.height = '100%';
          canvas.style.minHeight = '400px';
          
          console.log('Preparando restauración del BPMN modeler al panel');
          
          // Force redraw before attaching modeler
          setTimeout(async () => {
            try {
              // Always try to restore - this will now always create a new modeler instance
              const restoredModeler = await modelerManager.restoreToNewContainer(canvas);
              
              if (restoredModeler) {
                console.log('BPMN modeler inicializado/restaurado correctamente');
                
                // Force resize after a short delay to ensure proper dimensions
                setTimeout(() => {
                  try {
                    const canvas = restoredModeler.get('canvas');
                    if (canvas) {
                      canvas.resized();
                    }
                  } catch (resizeErr) {
                    console.warn('Error al redimensionar el canvas después de la restauración:', resizeErr);
                  }
                }, 100);
              } else {
                throw new Error('No se pudo restaurar el modelador');
              }
            } catch (err) {
              console.error('Error restaurando BPMN modeler, intentando crear nuevo:', err);
              
              try {
                // Last resort - create a completely new instance
                modelerManager.initialize(canvas, true);
                console.log('Nuevo modeler BPMN inicializado como fallback');
              } catch (initErr) {
                console.error('Error fatal al inicializar el modeler BPMN:', initErr);
              }
            }
          }, 100);
        }, 500); // Dar más tiempo para que se cree el DOM
      }

      // Recargar automáticamente el panel RASCI si está activo
      if (this.activePanels.includes('rasci')) {
        setTimeout(() => {
          const rasciPanel = container.querySelector('#rasci-panel');
          if (rasciPanel && typeof window.reloadRasciMatrix === 'function') {
            window.reloadRasciMatrix();
          }
        }, 300);
      }

      this.closeSelector();

    } catch (error) {
      console.error('Error applying configuration:', error);
    } finally {
      this.isApplyingConfiguration = false;
    }
  }

  async adjustLayoutForVisiblePanels() {
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
  
  // Método para preservar el estado del BPMN antes de operaciones que pueden destruir el modeler
  // Método eliminado - usamos solo localStorage como antes

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
      
      if (wasHidden && panelType === 'rasci' && typeof window.reloadRasciMatrix === 'function') {
        setTimeout(() => {
          window.reloadRasciMatrix();
        }, 100);
      }
      
      // Manejar restauración específica para panel BPMN
      if (wasHidden && panelType === 'bpmn' && window.modeler) {
        setTimeout(() => {
          // Usar el método simple como en el commit anterior
          if (typeof window.loadBpmnState === 'function') {
            window.loadBpmnState();
          }
        }, 100);
      }
    }
  }

  setupRasciVisibilityObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              if (node.id === 'rasci-panel' || node.querySelector('#rasci-panel')) {
                setTimeout(() => {
                  if (typeof window.reloadRasciMatrix === 'function') {
                    window.reloadRasciMatrix();
                  }
                }, 200);
              }
            }
          });
        }
      });
    });

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

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        items.forEach(i => i.classList.remove('drag-over'));
      });

      item.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        item.classList.add('drag-over');
      });

      item.addEventListener('dragleave', (e) => {
        if (!item.contains(e.relatedTarget)) {
          item.classList.remove('drag-over');
        }
      });

      item.addEventListener('drop', async (e) => {
        e.preventDefault();
        item.classList.remove('drag-over');
        const draggedPanel = e.dataTransfer.getData('text/plain');
        const targetPanel = item.getAttribute('data-panel');
        
        if (draggedPanel !== targetPanel) {
          await this.reorderPanels(draggedPanel, targetPanel);
        }
      });
    });
  }

  async reorderPanels(draggedPanel, targetPanel) {
    const draggedIndex = this.activePanels.indexOf(draggedPanel);
    const targetIndex = this.activePanels.indexOf(targetPanel);
    
    if (draggedIndex === -1 || targetIndex === -1) return;
    
    this.activePanels.splice(draggedIndex, 1);
    this.activePanels.splice(targetIndex, 0, draggedPanel);
    
    this.savePanelConfiguration();
    await this.updateLayoutOptions();
  }
}

window.PanelManager = PanelManager;
// Create an instance of PanelManager and assign it to window.panelManager
window.panelManager = new PanelManager();

// Función eliminada - el canvas se redimensiona automáticamente

window.closePanelSelector = function() {
  if (window.panelManager && typeof window.panelManager.closeSelector === 'function') {
    window.panelManager.closeSelector();
  } else {
    const overlay = document.getElementById('panel-selector-overlay');
    if (overlay && overlay.parentNode) {
      overlay.remove();
    }
  }
}; 