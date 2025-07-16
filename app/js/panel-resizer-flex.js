// === panel-resizer-flex.js ===
// Sistema de redimensionamiento que ajusta paneles adyacentes automáticamente

class PanelResizerFlex {
  constructor() {
    this.activePanel = null;
    this.isResizing = false;
    this.resizeDirection = null;
    this.startX = 0;
    this.startY = 0;
    this.startWidth = 0;
    this.startHeight = 0;
    this.minWidth = 200;
    this.minHeight = 150;
    this.panelContainer = null;
    this.siblingPanels = [];
    
    this.init();
  }

  init() {
    this.createResizeStyles();
    document.addEventListener('mousemove', this.handleMouseMove.bind(this));
    document.addEventListener('mouseup', this.handleMouseUp.bind(this));
  }

  createResizeStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .panel {
        position: relative !important;
        resize: none !important;
      }
      
      .panel.resizable {
        transition: none !important;
      }
      
      .panel.resizing {
        user-select: none;
        pointer-events: none;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        z-index: 1000 !important;
      }
      
      .resize-handle {
        position: absolute;
        background: transparent;
        z-index: 1000;
        transition: background 0.2s ease;
      }
      
      .resize-handle:hover {
        background: rgba(66, 153, 225, 0.2);
      }
      
      .resize-handle.resizing {
        background: rgba(66, 153, 225, 0.4);
      }
      
      /* Handles de los lados */
      .resize-handle.n {
        top: 0;
        left: 8px;
        right: 8px;
        height: 6px;
        cursor: n-resize;
      }
      
      .resize-handle.s {
        bottom: 0;
        left: 8px;
        right: 8px;
        height: 6px;
        cursor: s-resize;
      }
      
      .resize-handle.e {
        top: 8px;
        right: 0;
        bottom: 8px;
        width: 6px;
        cursor: e-resize;
      }
      
      .resize-handle.w {
        top: 8px;
        left: 0;
        bottom: 8px;
        width: 6px;
        cursor: w-resize;
      }
      
      /* Handles de las esquinas */
      .resize-handle.nw {
        top: 0;
        left: 0;
        width: 8px;
        height: 8px;
        cursor: nw-resize;
      }
      
      .resize-handle.ne {
        top: 0;
        right: 0;
        width: 8px;
        height: 8px;
        cursor: ne-resize;
      }
      
      .resize-handle.sw {
        bottom: 0;
        left: 0;
        width: 8px;
        height: 8px;
        cursor: sw-resize;
      }
      
      .resize-handle.se {
        bottom: 0;
        right: 0;
        width: 8px;
        height: 8px;
        cursor: se-resize;
      }
      
      .panel.resizing * {
        pointer-events: none;
      }
      
      .panel.resizing .resize-handle {
        pointer-events: auto;
      }
      

    `;
    document.head.appendChild(style);
  }

  makePanelResizable(panel) {
    if (!panel || panel.classList.contains('resizable')) return;
    
    panel.classList.add('resizable');
    
    // Crear handles de redimensionamiento
    const handles = [
      { class: 'n', direction: 'n' },
      { class: 's', direction: 's' },
      { class: 'e', direction: 'e' },
      { class: 'w', direction: 'w' },
      { class: 'nw', direction: 'nw' },
      { class: 'ne', direction: 'ne' },
      { class: 'sw', direction: 'sw' },
      { class: 'se', direction: 'se' }
    ];
    
    handles.forEach(handle => {
      const handleElement = document.createElement('div');
      handleElement.className = `resize-handle ${handle.class}`;
      handleElement.setAttribute('data-direction', handle.direction);
      handleElement.addEventListener('mousedown', (e) => this.startResize(e, handle.direction));
      panel.appendChild(handleElement);
    });
    

  }



  startResize(e, direction) {
    e.preventDefault();
    e.stopPropagation();
    
    const panel = e.target.closest('.panel');
    if (!panel) return;
    
    // Verificar si el panel está siendo arrastrado (position: fixed y z-index alto)
    if (panel.style.position === 'fixed' && parseInt(panel.style.zIndex) >= 10000) {
      return; // No permitir redimensionamiento durante el arrastre
    }
    
    this.activePanel = panel;
    this.isResizing = true;
    this.resizeDirection = direction;
    
    // Obtener el contenedor de paneles
    this.panelContainer = panel.parentElement;
    this.siblingPanels = Array.from(this.panelContainer.children).filter(p => 
      p.classList.contains('panel') && p !== panel
    );
    
    // Obtener tamaño inicial
    const rect = panel.getBoundingClientRect();
    this.startX = e.clientX;
    this.startY = e.clientY;
    this.startWidth = rect.width;
    this.startHeight = rect.height;
    
    // Guardar estado original
    this.originalFlex = panel.style.flex;
    this.originalWidth = panel.style.width;
    this.originalHeight = panel.style.height;
    
    // Guardar estados de paneles hermanos
    this.siblingOriginalStates = this.siblingPanels.map(sibling => ({
      flex: sibling.style.flex,
      width: sibling.style.width,
      height: sibling.style.height
    }));
    
    // Aplicar estilos durante redimensionamiento
    panel.classList.add('resizing');
    panel.style.flex = 'none';
  }

  handleMouseMove(e) {
    if (!this.isResizing || !this.activePanel) return;
    
    // Verificar si el panel está siendo arrastrado
    if (this.activePanel.style.position === 'fixed' && parseInt(this.activePanel.style.zIndex) >= 10000) {
      return; // No permitir redimensionamiento durante el arrastre
    }
    
    e.preventDefault();
    
    const deltaX = e.clientX - this.startX;
    const deltaY = e.clientY - this.startY;
    
    let newWidth = this.startWidth;
    let newHeight = this.startHeight;
    
    // Calcular nuevas dimensiones según la dirección
    switch (this.resizeDirection) {
      case 'n':
        newHeight = Math.max(this.minHeight, this.startHeight - deltaY);
        break;
      case 's':
        newHeight = Math.max(this.minHeight, this.startHeight + deltaY);
        break;
      case 'e':
        newWidth = Math.max(this.minWidth, this.startWidth + deltaX);
        break;
      case 'w':
        newWidth = Math.max(this.minWidth, this.startWidth - deltaX);
        break;
      case 'nw':
        newWidth = Math.max(this.minWidth, this.startWidth - deltaX);
        newHeight = Math.max(this.minHeight, this.startHeight - deltaY);
        break;
      case 'ne':
        newWidth = Math.max(this.minWidth, this.startWidth + deltaX);
        newHeight = Math.max(this.minHeight, this.startHeight - deltaY);
        break;
      case 'sw':
        newWidth = Math.max(this.minWidth, this.startWidth - deltaX);
        newHeight = Math.max(this.minHeight, this.startHeight + deltaY);
        break;
      case 'se':
        newWidth = Math.max(this.minWidth, this.startWidth + deltaX);
        newHeight = Math.max(this.minHeight, this.startHeight + deltaY);
        break;
    }
    
    // Aplicar cambios al panel activo
    this.activePanel.style.width = `${newWidth}px`;
    this.activePanel.style.height = `${newHeight}px`;
    
    // Ajustar paneles hermanos
    this.adjustSiblingPanels(newWidth, newHeight);
  }

  adjustSiblingPanels(newWidth, newHeight) {
    if (!this.panelContainer || this.siblingPanels.length === 0) return;
    
    const containerRect = this.panelContainer.getBoundingClientRect();
    const totalWidth = containerRect.width;
    const totalHeight = containerRect.height;
    
    // Calcular espacio disponible
    const availableWidth = totalWidth - newWidth;
    const availableHeight = totalHeight - newHeight;
    
    // Distribuir espacio entre paneles hermanos
    if (this.siblingPanels.length === 1) {
      // Si solo hay un panel hermano, que ocupe todo el espacio disponible
      const sibling = this.siblingPanels[0];
      sibling.style.flex = '1';
      sibling.style.width = '';
      sibling.style.height = '';
    } else {
      // Si hay múltiples paneles hermanos, distribuir proporcionalmente
      this.siblingPanels.forEach((sibling, index) => {
        const flexValue = 1 / this.siblingPanels.length;
        sibling.style.flex = flexValue.toString();
        sibling.style.width = '';
        sibling.style.height = '';
      });
    }
  }

  handleMouseUp() {
    if (!this.isResizing || !this.activePanel) return;
    
    this.isResizing = false;
    this.activePanel.classList.remove('resizing');
    
    // Mantener el tamaño actual del panel sin forzar maximización
    // Solo ajustar flex para que mantenga su tamaño
    this.activePanel.style.flex = 'none';
    
    // Los paneles hermanos ya están ajustados por adjustSiblingPanels()
    
    this.activePanel = null;
    this.resizeDirection = null;
    this.panelContainer = null;
    this.siblingPanels = [];
  }

  restoreSiblingPanels() {
    if (!this.siblingOriginalStates) return;
    
    this.siblingPanels.forEach((sibling, index) => {
      const originalState = this.siblingOriginalStates[index];
      if (originalState) {
        sibling.style.flex = originalState.flex;
        sibling.style.width = originalState.width;
        sibling.style.height = originalState.height;
      }
    });
  }



  makeAllPanelsResizable() {
    const panels = document.querySelectorAll('.panel');
    panels.forEach(panel => this.makePanelResizable(panel));
  }

  observeNewPanels() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.classList && node.classList.contains('panel')) {
              this.makePanelResizable(node);
            }
            const panels = node.querySelectorAll ? node.querySelectorAll('.panel') : [];
            panels.forEach(panel => this.makePanelResizable(panel));
          }
        });
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  disableResize(panel) {
    if (!panel) return;
    panel.classList.remove('resizable');
    const handles = panel.querySelectorAll('.resize-handle');
    handles.forEach(handle => handle.remove());
  }

  enableResize(panel) {
    if (!panel) return;
    this.makePanelResizable(panel);
  }
}

// Exportar la clase
export { PanelResizerFlex };

// También mantener referencia global para compatibilidad
window.PanelResizerFlex = PanelResizerFlex; 