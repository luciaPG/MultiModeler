// === panel-loader.js limpio ===

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

    // Hacer el panel redimensionable y arrastrable
    this.makePanelResizable(panel, container);
    this.makePanelDraggable(panel);

    this.initializePanelEvents(panel);
    this.loadPanelController(panelType, panel);
    return panel;
  }

  makePanelResizable(panel, container) {
    // Crear estilos de resize si no existen
    if (!document.querySelector('#panel-resize-styles')) {
      const style = document.createElement('style');
      style.id = 'panel-resize-styles';
      style.textContent = `
        .panel-container {
          display: flex;
          flex-direction: row;
          gap: 8px;
          height: 100%;
          overflow: hidden;
        }
        
        .panel {
          position: relative;
          overflow: hidden;
          flex: 1;
          min-width: 200px;
          min-height: 200px;
        }
        
        .panel-resize-handle {
          position: absolute;
          background: transparent;
          border: none;
          border-radius: 2px;
          z-index: 1000;
          transition: all 0.2s ease;
          opacity: 0;
        }
        
        .panel-resize-handle:hover {
          background: rgba(58, 86, 212, 0.1);
          border: none;
          opacity: 1;
        }
        
        .panel-resize-handle.left {
          left: 0;
          top: 0;
          width: 6px;
          height: 100%;
          cursor: ew-resize;
        }
        
        .panel-resize-handle.right {
          right: 0;
          top: 0;
          width: 6px;
          height: 100%;
          cursor: ew-resize;
        }
        
        .panel-resize-handle.bottom {
          bottom: 0;
          left: 0;
          width: 100%;
          height: 6px;
          cursor: ns-resize;
        }
        
        .panel-resize-handle.corner {
          right: 0;
          bottom: 0;
          width: 12px;
          height: 12px;
          cursor: nw-resize;
          background: transparent;
        }
        
        .panel-resize-handle.corner:hover {
          background: rgba(58, 86, 212, 0.1);
        }
        
        .panel.maximized .panel-resize-handle {
          display: none;
        }
        
        .panel.minimized .panel-resize-handle {
          display: none;
        }
        
        .panel.maximized {
          flex: 1 !important;
          min-width: 100% !important;
          min-height: 100% !important;
        }
        
        .panel.minimized {
          flex: 0 !important;
          min-width: 0 !important;
          min-height: 0 !important;
          overflow: hidden;
        }
      `;
      document.head.appendChild(style);
    }

    // Añadir handles de resize
    const handles = ['left', 'right', 'bottom', 'corner'];
    handles.forEach(type => {
      const handle = document.createElement('div');
      handle.className = `panel-resize-handle ${type}`;
      panel.appendChild(handle);
    });

    // Implementar resize manual
    this.setupResizeHandlers(panel, container);
  }

  setupResizeHandlers(panel, container) {
    const leftHandle = panel.querySelector('.panel-resize-handle.left');
    const rightHandle = panel.querySelector('.panel-resize-handle.right');
    const bottomHandle = panel.querySelector('.panel-resize-handle.bottom');
    const cornerHandle = panel.querySelector('.panel-resize-handle.corner');

    let isResizing = false;
    let startX, startY, startWidth, startHeight;
    let currentDirection = null;
    let originalFlexValues = {};

    function startResize(e, direction) {
      e.preventDefault();
      e.stopPropagation();
      
      isResizing = true;
      currentDirection = direction;
      startX = e.clientX;
      startY = e.clientY;
      
      // Guardar el estado inicial de todos los paneles
      const allPanels = Array.from(container.children);
      allPanels.forEach(p => {
        originalFlexValues[p.id] = {
          flex: p.style.flex || '1',
          width: p.style.width || '',
          height: p.style.height || ''
        };
      });
      
      // Obtener dimensiones actuales del panel
      const rect = panel.getBoundingClientRect();
      startWidth = rect.width;
      startHeight = rect.height;
      
      document.addEventListener('mousemove', handleResize);
      document.addEventListener('mouseup', stopResize);
    }

    function handleResize(e) {
      if (!isResizing) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      if (currentDirection === 'horizontal' || currentDirection === 'both') {
        const newWidth = startWidth + deltaX;
        const containerWidth = container.offsetWidth;
        const gap = 8;
        const minWidth = 200;
        
        // Calcular el ancho disponible considerando gaps
        const otherPanels = Array.from(container.children).filter(p => p !== panel);
        const totalGaps = (otherPanels.length + 1) * gap;
        const availableWidth = containerWidth - totalGaps;
        const maxWidth = availableWidth - (otherPanels.length * minWidth);
        
        if (newWidth >= minWidth && newWidth <= maxWidth) {
          // Establecer ancho fijo para el panel actual
          panel.style.flex = `0 0 ${newWidth}px`;
          
          // Distribuir el espacio restante entre los otros paneles
          const remainingWidth = availableWidth - newWidth;
          
          if (otherPanels.length > 0) {
            // Calcular cuánto espacio le corresponde a cada panel
            const widthPerPanel = Math.max(minWidth, remainingWidth / otherPanels.length);
            
            otherPanels.forEach(otherPanel => {
              otherPanel.style.flex = `1 1 ${widthPerPanel}px`;
            });
          }
        }
      }
      
      if (currentDirection === 'vertical' || currentDirection === 'both') {
        const newHeight = startHeight + deltaY;
        const containerHeight = container.offsetHeight;
        const minHeight = 200;
        const maxHeight = containerHeight;
        
        if (newHeight >= minHeight && newHeight <= maxHeight) {
          // Establecer altura fija para el panel actual
          panel.style.flex = `1 1 auto`;
          panel.style.height = `${newHeight}px`;
          
          // Ajustar otros paneles para que rellenen el espacio vertical restante
          const otherPanels = Array.from(container.children).filter(p => p !== panel);
          const remainingHeight = containerHeight - newHeight;
          
          if (remainingHeight > 0 && otherPanels.length > 0) {
            const heightPerPanel = Math.max(minHeight, remainingHeight / otherPanels.length);
            
            otherPanels.forEach(otherPanel => {
              otherPanel.style.flex = `1 1 auto`;
              otherPanel.style.height = `${heightPerPanel}px`;
            });
          }
        }
      }
    }

    function stopResize() {
      if (isResizing) {
        // Asegurar que todos los paneles tengan flex apropiado después del resize
        const allPanels = Array.from(container.children);
        allPanels.forEach(p => {
          if (!p.style.flex || p.style.flex === '0 0 auto') {
            p.style.flex = '1';
          }
        });
      }
      
      isResizing = false;
      currentDirection = null;
      originalFlexValues = {};
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', stopResize);
    }

    // Configurar eventos para cada handle
    if (leftHandle) {
      leftHandle.addEventListener('mousedown', (e) => startResize(e, 'horizontal'));
    }
    
    if (rightHandle) {
      rightHandle.addEventListener('mousedown', (e) => startResize(e, 'horizontal'));
    }
    
    if (bottomHandle) {
      bottomHandle.addEventListener('mousedown', (e) => startResize(e, 'vertical'));
    }
    
    if (cornerHandle) {
      cornerHandle.addEventListener('mousedown', (e) => startResize(e, 'both'));
    }
  }

  makePanelDraggable(panel) {
    const header = panel.querySelector('.panel-header');
    if (!header) return;

    let isDragging = false;
    let startX, startY, startLeft, startTop;
    let wasMaximized = false;
    let originalStyles = {};
    let originalSize = {};

    header.addEventListener('mousedown', (e) => {
      // Evitar arrastrar si se hace clic en botones
      if (e.target.closest('.panel-btn')) return;
      
      e.preventDefault();
      isDragging = true;
      
      // Guardar estado original completo
      wasMaximized = panel.classList.contains('maximized');
      originalStyles = {
        position: panel.style.position,
        left: panel.style.left,
        top: panel.style.top,
        width: panel.style.width,
        height: panel.style.height,
        flex: panel.style.flex,
        right: panel.style.right,
        bottom: panel.style.bottom,
        margin: panel.style.margin
      };
      
      // Guardar dimensiones originales
      const rect = panel.getBoundingClientRect();
      originalSize = {
        width: rect.width,
        height: rect.height
      };
      
      startX = e.clientX;
      startY = e.clientY;
      startLeft = rect.left;
      startTop = rect.top;
      
      // Si estaba maximizado, quitar temporalmente la clase para permitir el arrastre
      if (wasMaximized) {
        panel.classList.remove('maximized');
      }
      
      // Configurar para arrastre manteniendo el tamaño original
      panel.style.position = 'fixed';
      panel.style.zIndex = '10000';
      panel.style.opacity = '0.9';
      
      // Mantener el tamaño original durante el arrastre
      panel.style.width = `${originalSize.width}px`;
      panel.style.height = `${originalSize.height}px`;
      panel.style.flex = 'none';
      
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    });

    const handleMouseMove = (e) => {
      if (!isDragging) return;
      
      const deltaX = e.clientX - startX;
      const deltaY = e.clientY - startY;
      
      // Mover manteniendo el tamaño original
      panel.style.left = `${startLeft + deltaX}px`;
      panel.style.top = `${startTop + deltaY}px`;
      
      // Asegurar que mantenga el tamaño durante el movimiento
      panel.style.width = `${originalSize.width}px`;
      panel.style.height = `${originalSize.height}px`;
    };

    const handleMouseUp = () => {
      if (!isDragging) return;
      
      isDragging = false;
      panel.style.opacity = '1';
      
      // Limpiar todos los estilos inline aplicados durante el arrastre
      panel.style.position = '';
      panel.style.left = '';
      panel.style.top = '';
      panel.style.right = '';
      panel.style.bottom = '';
      panel.style.width = '';
      panel.style.height = '';
      panel.style.margin = '';
      panel.style.flex = '';
      panel.style.zIndex = '';
      
      // Restaurar estado apropiado
      if (wasMaximized) {
        // Si estaba maximizado, restaurar a maximizado
        panel.classList.add('maximized');
      } else {
        // Restaurar estilos originales solo si no estaban vacíos
        if (originalStyles.position) panel.style.position = originalStyles.position;
        if (originalStyles.width) panel.style.width = originalStyles.width;
        if (originalStyles.height) panel.style.height = originalStyles.height;
        if (originalStyles.flex) panel.style.flex = originalStyles.flex;
        if (originalStyles.right) panel.style.right = originalStyles.right;
        if (originalStyles.bottom) panel.style.bottom = originalStyles.bottom;
        if (originalStyles.margin) panel.style.margin = originalStyles.margin;
      }
      
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }

  initializePanelEvents(panel) {
    // Eventos para los botones del panel
    const header = panel.querySelector('.panel-header');
    if (!header) return;

    const minimizeBtn = header.querySelector('.panel-btn[title="Minimizar"]');
    const maximizeBtn = header.querySelector('.panel-btn[title="Maximizar"]');
    const closeBtn = header.querySelector('.panel-btn[title="Cerrar"]');

    // Guardar tamaño original para restaurar
    let originalSize = null;

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
        const isMaximized = panel.classList.contains('maximized');
        
        if (isMaximized) {
          // Restaurar tamaño original
          panel.classList.remove('maximized');
          if (originalSize) {
            panel.style.flex = originalSize.flex;
            panel.style.height = originalSize.height;
            panel.style.position = originalSize.position;
            panel.style.left = originalSize.left;
            panel.style.top = originalSize.top;
            originalSize = null;
          }
          maximizeBtn.innerHTML = '<i class="fas fa-expand"></i>';
        } else {
          // Guardar tamaño actual y maximizar
          originalSize = {
            flex: panel.style.flex || '1',
            height: panel.style.height || panel.offsetHeight + 'px',
            position: panel.style.position,
            left: panel.style.left,
            top: panel.style.top
          };
          
          panel.classList.add('maximized');
          panel.style.flex = '1';
          panel.style.height = '100%';
          panel.style.position = 'relative';
          panel.style.left = '';
          panel.style.top = '';
          maximizeBtn.innerHTML = '<i class="fas fa-compress"></i>';
        }
      });
    }

    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        panel.style.display = 'none';
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
        break;
    }
  }

  loadRasciController(panel) {
    // Inicializar el controlador RASCI
    if (window.initRasciPanel) {
      window.initRasciPanel(panel);
    }
  }

  loadBpmnController() {
    // El controlador BPMN se maneja principalmente en app.js
  }
}

// Exportar la clase para ES6 modules
export { PanelLoader };

// También mantener la referencia global para compatibilidad
window.PanelLoader = PanelLoader;