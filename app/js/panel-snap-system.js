// === panel-snap-system.js ===
// Sistema de snap simple basado en botones

class PanelSnapSystem {
  constructor() {
    this.currentLayout = '4';
    this.init();
  }

  init() {
    this.createStyles();
    this.bindEvents();
  }

  createStyles() {
    const style = document.createElement('style');
    style.textContent = `

      
      .panel-container {
        display: flex;
        height: 100vh;
        width: 100vw;
        overflow: hidden;
        gap: 2px;
      }
      

      

      
      .panel-container.layout-2h {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-2v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
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
      
      .panel-container.layout-3h {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-3v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-4h {
        display: flex;
        flex-direction: column;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-4v {
        display: flex;
        flex-direction: row;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-4 {
        display: grid !important;
        grid-template-columns: 1fr 1fr !important;
        grid-template-rows: 1fr 1fr !important;
        gap: 8px !important;
        padding: 8px !important;
        background: #f8f9fa;
        height: 100vh !important;
        width: 100vw !important;
        overflow: hidden;
        box-sizing: border-box !important;
      }
      
      .panel-container.layout-4 .panel {
        min-width: 0 !important;
        min-height: 0 !important;
        max-width: 100% !important;
        max-height: 100% !important;
        width: 100% !important;
        height: 100% !important;
        flex: none !important;
        overflow: hidden;
        display: flex !important;
        flex-direction: column !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 0 !important;
        /* Refuerzo igualdad de espacio */
        grid-row: auto !important;
        grid-column: auto !important;
      }
      
      .panel-container.layout-4 .panel .panel-content {
        flex: 1 !important;
        overflow: auto !important;
        min-height: 0 !important;
        min-width: 0 !important;
        max-width: 100% !important;
        max-height: 100% !important;
        box-sizing: border-box !important;
        margin: 0 !important;
        padding: 8px !important;
      }
      
      .panel-container.layout-4 .panel:nth-child(1) {
        grid-column: 1 !important;
        grid-row: 1 !important;
      }
      
      .panel-container.layout-4 .panel:nth-child(2) {
        grid-column: 2 !important;
        grid-row: 1 !important;
      }
      
      .panel-container.layout-4 .panel:nth-child(3) {
        grid-column: 1 !important;
        grid-row: 2 !important;
      }
      
      .panel-container.layout-4 .panel:nth-child(4) {
        grid-column: 2 !important;
        grid-row: 2 !important;
      }
      

      
      .panel-container.layout-1 {
        display: flex;
        gap: 4px;
        padding: 4px;
        background: #f8f9fa;
      }
      
      .panel-container.layout-2h .panel,
      .panel-container.layout-2v .panel,
      .panel-container.layout-4h .panel,
      .panel-container.layout-4v .panel,
      .panel-container.layout-3 .panel,
      .panel-container.layout-3h .panel,
      .panel-container.layout-3v .panel,
      .panel-container.layout-1 .panel {
        flex: 1;
        min-width: 0;
        min-height: 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
      }
      
      .panel-container.layout-4 .panel {
        min-width: 0;
        min-height: 0;
        border-radius: 8px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
        transition: all 0.3s ease;
        height: 100%;
        width: 100%;
        position: relative;
        overflow: hidden;
      }
      

      
      .panel-container.layout-4 .panel::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        height: 3px;
        background: linear-gradient(90deg, #3a56d4, #4361ee, #3f37c9);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .panel-container.layout-4 .panel:hover::before {
        opacity: 1;
      }
      
      .panel {
        display: flex;
        flex-direction: column;
        background: white;
        border: 1px solid #e0e0e0;
        border-radius: 8px;
        overflow: hidden;
        transition: all 0.3s ease;
        position: relative;
      }
      
      .panel:hover {
        border-color: #3a56d4;
        box-shadow: 0 4px 16px rgba(58, 86, 212, 0.15);
        transform: translateY(-1px);
      }
      
      .panel-header {
        height: 44px;
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
        border-bottom: 1px solid #e0e0e0;
        padding: 0 16px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        font-weight: 600;
        font-size: 14px;
        color: #333;
        position: relative;
      }
      
      .panel-header::after {
        content: '';
        position: absolute;
        bottom: 0;
        left: 0;
        right: 0;
        height: 1px;
        background: linear-gradient(90deg, transparent, #3a56d4, transparent);
        opacity: 0;
        transition: opacity 0.3s ease;
      }
      
      .panel:hover .panel-header::after {
        opacity: 1;
      }
      
      .panel-title {
        display: flex;
        align-items: center;
        gap: 8px;
        color: #3a56d4;
      }
      
      .panel-title i {
        font-size: 16px;
      }
      
      .panel-content {
        flex: 1;
        padding: 20px;
        background: white;
        overflow-y: auto;
      }
      
      /* Estilos específicos para el panel de prueba */
      .test-content h3 {
        color: #3a56d4;
        margin-bottom: 12px;
        font-size: 18px;
      }
      
      .test-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-top: 16px;
      }
      
      .test-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 16px;
        background: #f8f9fa;
        border-radius: 8px;
        border: 1px solid #e9ecef;
        transition: all 0.3s ease;
        cursor: pointer;
      }
      
      .test-item:hover {
        background: #e9ecef;
        border-color: #3a56d4;
        transform: translateY(-2px);
      }
      
      .test-item i {
        font-size: 24px;
        color: #3a56d4;
        margin-bottom: 8px;
      }
      
      .test-item span {
        font-size: 12px;
        font-weight: 500;
        color: #495057;
      }
      
      /* Estilos específicos para el panel de logs */
      .logs-content h3 {
        color: #3a56d4;
        margin-bottom: 16px;
        font-size: 18px;
      }
      
      .logs-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 16px;
      }
      
      .log-filters {
        display: flex;
        gap: 4px;
      }
      
      .log-filter {
        padding: 4px 8px;
        border: 1px solid #dee2e6;
        background: white;
        border-radius: 4px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
      }
      
      .log-filter:hover {
        border-color: #3a56d4;
      }
      
      .log-filter.active {
        background: #3a56d4;
        color: white;
        border-color: #3a56d4;
      }
      
      .logs-list {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .log-entry {
        display: flex;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        border-left: 3px solid transparent;
      }
      
      .log-entry.info {
        background: #e3f2fd;
        border-left-color: #2196f3;
      }
      
      .log-entry.warning {
        background: #fff3e0;
        border-left-color: #ff9800;
      }
      
      .log-entry.error {
        background: #ffebee;
        border-left-color: #f44336;
      }
      
      .log-time {
        color: #666;
        font-weight: 500;
        min-width: 60px;
      }
      
      .log-level {
        font-weight: 600;
        min-width: 50px;
      }
      
      .log-entry.info .log-level {
        color: #2196f3;
      }
      
      .log-entry.warning .log-level {
        color: #ff9800;
      }
      
      .log-entry.error .log-level {
        color: #f44336;
      }
      
      .log-message {
        flex: 1;
        color: #333;
      }
      
      /* Estilos para botones de acción del panel */
      .panel-actions {
        display: flex;
        gap: 4px;
      }
      
      .panel-btn {
        width: 28px;
        height: 28px;
        border: none;
        background: transparent;
        border-radius: 4px;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: all 0.2s ease;
        font-size: 12px;
      }
      
      .panel-btn:hover {
        background: rgba(58, 86, 212, 0.1);
        color: #3a56d4;
      }
      
      .panel-btn:active {
        background: rgba(58, 86, 212, 0.2);
        transform: scale(0.95);
      }
      
      /* Animación de entrada para los paneles */
      .panel {
        animation: panelFadeIn 0.5s ease-out;
      }
      
      @keyframes panelFadeIn {
        from {
          opacity: 0;
          transform: translateY(20px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Mejoras para el layout de 4 paneles */
      .panel-container.layout-4 {
        animation: layoutChange 0.4s ease-out;
      }
      
      @keyframes layoutChange {
        from {
          opacity: 0.8;
          transform: scale(0.98);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }
      

    `;
    document.head.appendChild(style);
  }



  changeLayout(layout) {
    const container = document.getElementById('panel-container');
    if (!container) return;

    console.log(`Cambiando layout a: ${layout}`);
    console.log(`Contenedor antes:`, container.className);

    // Remove all layout classes
    container.classList.remove('layout-4', 'layout-4h', 'layout-4v', 'layout-3', 'layout-3h', 'layout-3v', 'layout-2h', 'layout-2v', 'layout-1');
    
    // Add new layout class
    container.classList.add(`layout-${layout}`);
    console.log(`Aplicando clase CSS: layout-${layout}`);
    console.log(`Contenedor después:`, container.className);
    
    // Reset panel styles
    const panels = container.querySelectorAll('.panel');
    console.log(`Número de paneles encontrados:`, panels.length);
    
    panels.forEach((panel, index) => {
      if (layout === '4') {
        // Para layout grid, limpiar todos los estilos de tamaño y flex
        panel.style.flex = 'none';
        panel.style.width = '100%';
        panel.style.height = '100%';
        panel.style.minWidth = '0';
        panel.style.minHeight = '0';
        panel.style.maxWidth = '100%';
        panel.style.maxHeight = '100%';
        
        // Posicionar panel según su atributo data-position
        const position = panel.getAttribute('data-position');
        if (position) {
          panel.style.gridColumn = '';
          panel.style.gridRow = '';
          
          // Solo aplicar grid para layout 4
          if (layout === '4') {
            switch(position) {
              case '1':
                panel.style.gridColumn = '1';
                panel.style.gridRow = '1';
                break;
              case '2':
                panel.style.gridColumn = '2';
                panel.style.gridRow = '1';
                break;
              case '3':
                panel.style.gridColumn = '1';
                panel.style.gridRow = '2';
                break;
              case '4':
                panel.style.gridColumn = '2';
                panel.style.gridRow = '2';
                break;
            }
          }
        } else {
          // Fallback: posicionar por orden solo para layout 4
          if (layout === '4') {
            const positions = ['1', '2', '3', '4'];
            if (index < positions.length) {
              panel.setAttribute('data-position', positions[index]);
              switch(positions[index]) {
                case '1':
                  panel.style.gridColumn = '1';
                  panel.style.gridRow = '1';
                  break;
                case '2':
                  panel.style.gridColumn = '2';
                  panel.style.gridRow = '1';
                  break;
                case '3':
                  panel.style.gridColumn = '1';
                  panel.style.gridRow = '2';
                  break;
                case '4':
                  panel.style.gridColumn = '2';
                  panel.style.gridRow = '2';
                  break;
              }
            }
          }
        }
      } else {
        panel.style.flex = '1';
        panel.style.width = '';
        panel.style.height = '';
        panel.style.minWidth = '';
        panel.style.minHeight = '';
        panel.style.maxWidth = '';
        panel.style.maxHeight = '';
        panel.style.gridColumn = '';
        panel.style.gridRow = '';
      }
      panel.style.position = 'relative';
      panel.style.top = '';
      panel.style.left = '';
      panel.style.zIndex = '';
      
      console.log(`Panel ${index + 1} estilos:`, {
        flex: panel.style.flex,
        width: panel.style.width,
        height: panel.style.height,
        position: panel.getAttribute('data-position')
      });
    });
    
    // Handle single panel layout
    if (layout === '1') {
      // Show only the first visible panel (not hidden)
      let firstVisibleFound = false;
      panels.forEach((panel) => {
        if (!firstVisibleFound && panel.style.display !== 'none') {
          panel.style.display = 'flex';
          firstVisibleFound = true;
        } else {
          panel.style.display = 'none';
        }
      });
    } else {
      // Show all panels that are not explicitly hidden
      panels.forEach(panel => {
        if (panel.style.display !== 'none') {
          panel.style.display = 'flex';
        }
      });
    }
    
    this.currentLayout = layout;
    console.log(`Layout cambiado a: ${layout}`);
    
    // Reinicializar resizers después del cambio de layout
    setTimeout(() => {
      if (window.panelResizer) {
        window.panelResizer.makeAllPanelsResizable();
      }
    }, 100);
  }

  bindEvents() {
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch(e.key) {
          case '1':
            e.preventDefault();
            this.changeLayout('1');
            break;
          case '2':
            e.preventDefault();
            if (e.shiftKey) {
              this.changeLayout('2v');
            } else {
              this.changeLayout('2h');
            }
            break;
          case '3':
            e.preventDefault();
            if (e.shiftKey) {
              this.changeLayout('3v');
            } else {
              this.changeLayout('3h');
            }
            break;
          case '4':
            e.preventDefault();
            if (e.shiftKey) {
              this.changeLayout('4v');
            } else {
              this.changeLayout('4h');
            }
            break;
        }
      }
    });
  }



  // Método para hacer que un panel sea arrastrable (opcional, para futuras mejoras)
  makePanelDraggable(panel) {
    if (!panel) return;
    
    // Ensure panel has relative positioning
    if (panel.style.position !== 'absolute' && panel.style.position !== 'fixed') {
      panel.style.position = 'relative';
    }
    
    // Add draggable class
    panel.classList.add('draggable-panel');
  }

  // Método para hacer todos los paneles arrastrables
  makeAllPanelsDraggable() {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => this.makePanelDraggable(panel));
  }

  // Observer para nuevos paneles
  observeNewPanels() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('panel')) {
              this.makePanelDraggable(node);
            }
            // Check children
            const panels = node.querySelectorAll ? node.querySelectorAll('.panel') : [];
            panels.forEach(panel => this.makePanelDraggable(panel));
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }
}

// Exportar la clase
window.PanelSnapSystem = PanelSnapSystem; 