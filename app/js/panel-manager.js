// === panel-manager.js ===
// Gestor de paneles con selector de paneles y distribución

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
    
    this.currentLayout = '2v'; // Layout vertical por defecto para 2 paneles
    this.activePanels = ['bpmn', 'rasci']; // Solo BPMN y RASCI por defecto
    this.panelLoader = null;
    this.preservedBpmnState = null; // Para preservar el estado BPMN cuando se oculta
    this.init();
  }

  init() {
    this.createPanelSelector();
    this.createStyles();
    this.bindEvents();
    
    // Vincular eventos de layout después de que todo esté listo
    setTimeout(() => {
      this.bindLayoutEvents();
    }, 100);
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* Estilos globales para scrollbars discretos */
      * {
        scrollbar-width: thin;
        scrollbar-color: #e0e0e0 #f8f9fa;
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
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.2);
        padding: 20px;
        min-width: 400px;
        max-width: 600px;
        max-height: 97vh;
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
        font-size: 14px;
        font-weight: 600;
        color: #333;
        margin-bottom: 12px;
        display: flex;
        align-items: center;
        gap: 8px;
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
        opacity: 0.5;
        cursor: not-allowed;
        background: #f5f5f5;
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
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        max-height: 200px;
        overflow-y: auto;
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
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.5);
        z-index: 51;
        display: none;
      }
      
      .modal-overlay.show {
        display: block;
        animation: overlayFadeIn 0.3s ease-out;
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

      .layout-4-info {
        font-size: 11px;
        color: #666;
        text-align: center;
        margin-top: 10px;
      }
      
      /* Estilos para el orden de paneles */
      .panel-order {
        display: grid;
        grid-template-columns: repeat(4, 1fr);
        gap: 6px;
        margin-top: 8px;
      }
      
      .panel-order-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 4px;
        padding: 8px;
        border: 1px solid #e0e0e0;
        border-radius: 6px;
        background: #f9f9f9;
        transition: all 0.2s ease;
      }
      
      .panel-order-item:hover {
        border-color: #3a56d4;
        background: rgba(58, 86, 212, 0.05);
      }
      
      .order-number {
        font-size: 14px;
        font-weight: bold;
        color: #3a56d4;
        background: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px solid #3a56d4;
        transition: all 0.2s ease;
      }
      

      
      .order-panel-name {
        font-size: 10px;
        font-weight: 500;
        color: #333;
        text-align: center;
        max-width: 100%;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
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
        <h3><i class="fas fa-th-large"></i> Distribución</h3>
        <div class="layout-options" id="layout-options">
          ${this.generateLayoutOptions()}
        </div>
      </div>
      
      <div class="panel-selector-section">
        <h3><i class="fas fa-window-maximize"></i> Paneles Disponibles</h3>
        <div class="panel-list" id="panel-list">
          ${this.generatePanelList()}
        </div>
      </div>
      
      <div class="panel-selector-section" id="panel-order-section" style="display: none;">
        <h3><i class="fas fa-sort-numeric-up"></i> Orden de Paneles</h3>
        <div class="panel-order-info">El orden se determina por el orden en que seleccionas los paneles. El primer panel seleccionado será el primero en aparecer.</div>
        <div id="panel-order" class="panel-order">
          ${this.generatePanelOrder()}
        </div>
      </div>
      
      <div class="panel-selector-actions">
        <button class="panel-selector-btn" onclick="panelManager.closeSelector()">Cancelar</button>
        <button class="panel-selector-btn primary" onclick="panelManager.applyConfiguration()">Aplicar</button>
      </div>
    `;
    
    document.body.appendChild(selector);
  }

  generatePanelList() {
    return Object.entries(this.availablePanels).map(([key, panel]) => {
      const isActive = this.activePanels.includes(key);
      
      return `
        <div class="panel-item ${isActive ? 'active' : ''}" data-panel="${key}">
          <div class="panel-item-icon">
            <i class="${panel.icon}"></i>
          </div>
          <div class="panel-item-info">
            <div class="panel-item-name">${panel.name}</div>
            <div class="panel-item-description">${panel.description}</div>
          </div>
          <div class="panel-item-actions">
            <div class="panel-item-checkbox">
              ${isActive ? '✓' : ''}
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  updatePanelSelector() {
    const panelListContainer = document.getElementById('panel-list');
    if (panelListContainer) {
      panelListContainer.innerHTML = this.generatePanelList();
    }
  }

  generateLayoutOptions() {
    const panelCount = this.activePanels.length;
    
    if (panelCount === 0) {
      return '<div class="layout-option disabled"><div class="layout-option-label">Selecciona paneles</div></div>';
    }
    
    if (panelCount === 1) {
      return `
        <div class="layout-option ${this.currentLayout === '1' ? 'active' : ''}" data-layout="1">
          <div class="layout-option-icon">●</div>
          <div class="layout-option-label">1 Panel</div>
        </div>
      `;
    }
    
    if (panelCount === 2) {
      return `
        <div class="layout-option ${this.currentLayout === '2h' ? 'active' : ''}" data-layout="2h">
          <div class="layout-option-icon">● ●</div>
          <div class="layout-option-label">2 Horizontal</div>
        </div>
        <div class="layout-option ${this.currentLayout === '2v' ? 'active' : ''}" data-layout="2v">
          <div class="layout-option-icon">●<br>●</div>
          <div class="layout-option-label">2 Vertical</div>
        </div>
      `;
    }
    
    if (panelCount === 3) {
      return `
        <div class="layout-option ${this.currentLayout === '3h' ? 'active' : ''}" data-layout="3h">
          <div class="layout-option-icon">● ● ●</div>
          <div class="layout-option-label">3 Horizontal</div>
        </div>
        <div class="layout-option ${this.currentLayout === '3v' ? 'active' : ''}" data-layout="3v">
          <div class="layout-option-icon">●<br>●<br>●</div>
          <div class="layout-option-label">3 Vertical</div>
        </div>
      `;
    }
    
    if (panelCount >= 4) {
      return `
        <div class="layout-option ${this.currentLayout === '4h' ? 'active' : ''}" data-layout="4h">
          <div class="layout-option-icon">● ● ● ●</div>
          <div class="layout-option-label">4 Horizontal</div>
        </div>
        <div class="layout-option ${this.currentLayout === '4v' ? 'active' : ''}" data-layout="4v">
          <div class="layout-option-icon">●<br>●<br>●<br>●</div>
          <div class="layout-option-label">4 Vertical</div>
        </div>
        <div class="layout-option ${this.currentLayout === '4' ? 'active' : ''}" data-layout="4">
          <div class="layout-option-icon">● ●<br>● ●</div>
          <div class="layout-option-label">4 (2x2)</div>
        </div>
      `;
    }
  }

  generatePanelOrder() {
    if (this.activePanels.length === 0) {
      return '<div class="panel-order-empty">Selecciona paneles para ver el orden</div>';
    }
    
    return this.activePanels.map((panelKey, index) => {
      const panel = this.availablePanels[panelKey];
      return `
        <div class="panel-order-item" data-panel="${panelKey}" data-order="${index + 1}">
          <div class="order-number" data-panel="${panelKey}">${index + 1}</div>
          <div class="order-panel-name">${panel.name}</div>
        </div>
      `;
    }).join('');
  }

  updateLayoutOptions() {
    const layoutOptionsContainer = document.getElementById('layout-options');
    const orderSection = document.getElementById('panel-order-section');
    const orderContainer = document.getElementById('panel-order');
    
    if (layoutOptionsContainer) {
      layoutOptionsContainer.innerHTML = this.generateLayoutOptions();
      
      // Solo establecer layout por defecto si no hay ninguno seleccionado
      const panelCount = this.activePanels.length;
      if (!this.currentLayout) {
        if (panelCount === 1) {
          this.currentLayout = '1';
        } else if (panelCount === 2) {
          this.currentLayout = '2v';
        } else if (panelCount === 3) {
          this.currentLayout = '3h';
        } else if (panelCount >= 4) {
          this.currentLayout = '4';
        }
      }
      
      // Mostrar sección de orden siempre
      if (orderSection && orderContainer) {
        orderSection.style.display = 'block';
        orderContainer.innerHTML = this.generatePanelOrder();
      }
    }
  }

  bindLayoutEvents() {
    // Usar event delegation para evitar múltiples listeners
    const layoutOptionsContainer = document.getElementById('layout-options');
    if (layoutOptionsContainer) {
      // Remover listener anterior si existe
      layoutOptionsContainer.removeEventListener('click', this.handleLayoutClick);
      
      // Agregar nuevo listener para botones de layout
      this.handleLayoutClick = (e) => {
        const option = e.target.closest('.layout-option');
        if (!option || option.classList.contains('disabled')) return;
        
        // Remover clase active de todos los botones
        layoutOptionsContainer.querySelectorAll('.layout-option').forEach(opt => opt.classList.remove('active'));
        // Agregar clase active al botón clickeado
        option.classList.add('active');
        // Actualizar el layout actual
        this.currentLayout = option.getAttribute('data-layout');
        console.log('Layout seleccionado:', this.currentLayout);
        
        // Actualizar sección de orden si es necesario
        this.updateLayoutOptions();
      };
      
      layoutOptionsContainer.addEventListener('click', this.handleLayoutClick);
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
        
        // Actualizar opciones de layout basadas en el número de paneles
        this.updateLayoutOptions();
        
        // NO aplicar automáticamente - solo actualizar la vista del selector
      }
      

    });

    // Overlay click to close
    document.getElementById('panel-selector-overlay').addEventListener('click', () => {
      this.closeSelector();
    });
  }

  showSelector() {
    // Actualizar lista de paneles y opciones de layout antes de mostrar
    this.updatePanelSelector();
    this.updateLayoutOptions();
    
    document.getElementById('panel-selector-overlay').classList.add('show');
    document.getElementById('panel-selector').classList.add('show');
    
    // Vincular eventos de layout
    this.bindLayoutEvents();
  }

  closeSelector() {
    document.getElementById('panel-selector-overlay').classList.remove('show');
    document.getElementById('panel-selector').classList.remove('show');
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

    // Limpiar contenedor
    container.innerHTML = '';

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

    // Aplicar layout
    console.log('Aplicando layout:', this.currentLayout);
    console.log('Número de paneles activos:', this.activePanels.length);
    if (window.snapSystem) {
      window.snapSystem.changeLayout(this.currentLayout);
    }
    
    // Reinicializar resizers después de aplicar la configuración
    setTimeout(() => {
      if (window.panelResizer) {
        window.panelResizer.makeAllPanelsResizable();
      }
    }, 200);

    // Reinicializar el modeler si es necesario y restaurar estado
    if (this.activePanels.includes('bpmn')) {
      setTimeout(async () => {
        if (typeof window.initializeModeler === 'function') {
          window.initializeModeler();
          
          // Restaurar estado preservado o el estado actual
          const stateToRestore = this.preservedBpmnState || bpmnState;
          if (stateToRestore && stateToRestore.xml && window.bpmnModeler) {
            try {
              // Verificar que el XML no esté vacío
              if (stateToRestore.xml.trim().length > 0) {
                console.log('Restaurando estado BPMN:', stateToRestore.xml.substring(0, 100) + '...');
                await window.bpmnModeler.importXML(stateToRestore.xml);
                console.log('Estado BPMN restaurado exitosamente');
                // Limpiar el estado preservado después de restaurarlo
                this.preservedBpmnState = null;
              } else {
                console.warn('XML BPMN vacío, creando nuevo diagrama');
                if (typeof window.createNewDiagram === 'function') {
                  window.createNewDiagram();
                }
              }
            } catch (error) {
              console.error('Error restaurando estado BPMN:', error);
              // Si falla la restauración, crear nuevo diagrama
              if (typeof window.createNewDiagram === 'function') {
                window.createNewDiagram();
              }
            }
          } else {
            console.log('No hay estado BPMN para restaurar, creando nuevo diagrama');
            // Si no hay estado preservado, crear nuevo diagrama
            if (typeof window.createNewDiagram === 'function') {
              window.createNewDiagram();
            }
          }
        }
      }, 500); // Aumentar el tiempo para asegurar que el DOM esté listo
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
}

// Exportar la clase
window.PanelManager = PanelManager; 