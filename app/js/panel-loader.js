// === panel-loader.js actualizado ===

class PanelLoader {
  constructor() {
    this.panelCache = new Map();
    this.panelConfigs = {
      bpmn: { file: 'panels/bpmn-panel.html', id: 'bpmn-panel', type: 'bpmn' },
      rasci: { file: 'panels/rasci-panel.html', id: 'rasci-panel', type: 'rasci' },
    };  
    
    // Inicializar el sistema de redimensionamiento
    this.initResizer();
  }
  
  initResizer() {
    // Importar y crear instancia del PanelResizer
    if (window.PanelResizerFlex) {
      this.panelResizer = new window.PanelResizerFlex();
      // Observar nuevos paneles automáticamente
      this.panelResizer.observeNewPanels();
    } else {
      console.warn('PanelResizerFlex no disponible');
    }
  }

  async loadPanel(panelType) {
    const config = this.panelConfigs[panelType];
    if (!config) return null;
    if (this.panelCache.has(panelType)) return this.panelCache.get(panelType).cloneNode(true);

    try {
      const response = await fetch(config.file);
      if (!response.ok) throw new Error(`Error HTTP: ${response.status}`);
      const html = await response.text();
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html.trim();
      const panel = tempDiv.firstElementChild;
      if (!panel) throw new Error('HTML inválido para panel');
      this.panelCache.set(panelType, panel.cloneNode(true));
      return panel;
    } catch (err) {
      console.error(`❌ Error cargando ${panelType}:`, err);
      return this.createFallbackPanel(panelType);
    }
  }

  createFallbackPanel(panelType) {
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = (this.panelConfigs[panelType] && this.panelConfigs[panelType].id) || `${panelType}-panel`;
    panel.setAttribute('data-panel-type', panelType);
    panel.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <i class="fas fa-exclamation-triangle"></i>
          <span>Panel ${panelType.toUpperCase()} (Fallback)</span>
        </div>
        <div class="panel-actions">
          <button class="panel-btn" title="Minimizar"><i class="fas fa-minus"></i></button>
          <button class="panel-btn" title="Maximizar"><i class="fas fa-expand"></i></button>
          <button class="panel-btn" title="Cerrar"><i class="fas fa-times"></i></button>
        </div>
      </div>
      <div class="panel-content">
        <div style="padding: 20px; text-align: center; color: #666;">
          <p>Error al cargar panel: ${panelType}</p>
        </div>
      </div>
    `;
    return panel;
  }

  async createPanel(panelType, container) {
    const panel = await this.loadPanel(panelType);
    if (!panel || !container) return null;

    // Asegurar que el panel tiene la clase y un id único
    panel.classList.add('panel');
    if (!panel.id) {
      panel.id = (this.panelConfigs[panelType] && this.panelConfigs[panelType].id) || `${panelType}-panel-${Date.now()}`;
    }

    container.appendChild(panel);

    // Hacer el panel redimensionable
    if (this.panelResizer) {
      this.panelResizer.makePanelResizable(panel);
    }

    this.initializePanelEvents(panel);
    this.loadPanelController(panelType, panel);
    return panel;
  }

  initializePanelEvents(panel) {
    // Eventos para los botones del panel
    const header = panel.querySelector('.panel-header');
    if (!header) return;

    const minimizeBtn = header.querySelector('.panel-btn[title="Minimizar"]');
    const maximizeBtn = header.querySelector('.panel-btn[title="Maximizar"]');
    const closeBtn = header.querySelector('.panel-btn[title="Cerrar"]');

    if (minimizeBtn) {
      minimizeBtn.addEventListener('click', () => {
        panel.classList.toggle('minimized');
        minimizeBtn.innerHTML = panel.classList.contains('minimized') 
          ? '<i class="fas fa-expand"></i>' 
          : '<i class="fas fa-minus"></i>';
      });
    }

    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        panel.classList.toggle('maximized');
        maximizeBtn.innerHTML = panel.classList.contains('maximized') 
          ? '<i class="fas fa-compress"></i>' 
          : '<i class="fas fa-expand"></i>';
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
        // Opcional: agregar a una lista de paneles cerrados para poder restaurarlos
        // Eliminar referencias a window.windowManager y comentarios relacionados
        // if (window.windowManager) {
        //   window.windowManager.hidePanel(panel);
        // }
      });
    }
  }

  loadPanelController(panelType, panel) {
    // Cargar controladores específicos según el tipo de panel
    switch (panelType) {
      case 'rasci':
        this.loadRasciController(panel);
        break;
      case 'bpmn':
        this.loadBpmnController();
        break;
      default:
    
    }
  }

  loadRasciController(panel) {
    // Inicializar el controlador RASCI
    // El módulo se importa en app.js, así que verificamos si está disponible
    if (window.initRasciPanel) {
      window.initRasciPanel(panel);
    }
  }

  loadBpmnController() {
    // El controlador BPMN se maneja principalmente en app.js
    // Aquí solo podemos hacer configuraciones específicas del panel

  }
}

// Exportar la clase para ES6 modules
export { PanelLoader };

// También mantener la referencia global para compatibilidad
window.PanelLoader = PanelLoader;