// === panel-loader.js ===
// Panel Loader - Maneja la carga dinámica de paneles
class PanelLoader {
  constructor() {
    this.panelCache = new Map();
    this.panelConfigs = {
      bpmn: { file: 'panels/bpmn-panel.html', id: 'bpmn-panel', type: 'bpmn' },
      rasci: { file: 'panels/rasci-panel.html', id: 'rasci-panel', type: 'rasci' },
    };
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
    panel.id = this.panelConfigs[panelType]?.id || `${panelType}-panel`;
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
    container.appendChild(panel);
    this.injectResizeHandles(panel);
    this.initializePanelEvents(panel);
    this.loadPanelController(panelType, panel);
    return panel;
  }

  injectResizeHandles(panel) {
    const edges = ['top', 'right', 'bottom', 'left'];
    edges.forEach(edge => {
      const handle = document.createElement('div');
      handle.className = `panel-resize-handle ${edge}`;
      panel.appendChild(handle);
    });
  }

  initializePanelEvents(panel) {
    panel.querySelectorAll('.panel-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const icon = btn.querySelector('i');
        if (icon?.classList.contains('fa-times')) this.closePanel(panel);
        if (icon?.classList.contains('fa-expand')) this.maximizePanel(panel);
        if (icon?.classList.contains('fa-minus')) this.minimizePanel(panel);
      });
    });

    panel.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', e => {
        e.stopPropagation();
        const allTabs = tab.parentNode.querySelectorAll('.tab');
        allTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
      });
    });
  }

  async loadPanelController(panelType, panel) {
    try {
      const module = await import(`./panels/${panelType}.js`);
      const initFn = module[`init${panelType.charAt(0).toUpperCase() + panelType.slice(1)}Panel`];
      if (typeof initFn === 'function') {
        initFn(panel);
      }
    } catch (err) {
      console.warn(`⚠️ No se pudo cargar módulo para ${panelType}:`, err);
    }
  }

  closePanel(panel) {
    panel.style.display = 'none';
    panel.classList.add('closed');
  }

  maximizePanel(panel) {
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('maximized', 'minimized'));
    panel.classList.add('maximized');
  }

  minimizePanel(panel) {
    const other = [...document.querySelectorAll('.panel')].find(p => p !== panel && !p.classList.contains('closed'));
    if (other) this.maximizePanel(other);
  }
}

window.PanelLoader = PanelLoader;
