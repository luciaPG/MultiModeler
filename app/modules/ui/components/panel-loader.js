// === panel-loader.js ===

class PanelLoader {
  constructor() {
    this.panelCache = new Map();
    this.panelConfigs = {
      bpmn: { file: 'panels/bpmn-panel.html', id: 'bpmn-panel', type: 'bpmn' },
      rasci: { file: 'panels/rasci-panel.html', id: 'rasci-panel', type: 'rasci' },
      ppi: { file: 'panels/ppi-panel.html', id: 'ppi-panel', type: 'ppi' },
      test: { file: 'panels/test-panel.html', id: 'test-panel', type: 'test' },
      logs: { file: 'panels/logs-panel.html', id: 'logs-panel', type: 'logs' },
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
          <button class="panel-btn" title="Ocultar"><i class="fas fa-eye-slash"></i></button>
          <button class="panel-btn" title="Solo este panel"><i class="fas fa-expand"></i></button>
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
    // Verificar si ya existe un panel de este tipo en el contenedor
    const expectedId = (this.panelConfigs[panelType] && this.panelConfigs[panelType].id) || `${panelType}-panel`;
    const existingPanel = container.querySelector(`#${expectedId}`) || 
                         container.querySelector(`[data-panel-type="${panelType}"]`);
    
    if (existingPanel) {
      // Si el panel existe pero está oculto, restaurarlo
      if (this.isPanelHidden(existingPanel)) {
        console.log(`[PanelLoader] Restaurando panel ${panelType} existente`);
        
        // Restaurar visibilidad del panel
        this.restorePanelVisibility(existingPanel);
        
        // Para el panel PPI, solo refrescar la lista sin recrear
        if (panelType === 'ppi' && window.ppiManager) {
          console.log('[PanelLoader] Refrescando lista PPI sin recrear controladores');
          if (typeof window.ppiManager.refreshPPIList === 'function') {
            // Pequeño delay para asegurar que el panel esté completamente visible
            setTimeout(() => {
              window.ppiManager.refreshPPIList();
            }, 100);
          }
        }
        
        return existingPanel;
      }
      
      // Si el panel ya está visible, retornarlo sin hacer nada
      return existingPanel;
    }

    const panel = await this.loadPanel(panelType);
    if (!panel || !container) return null;

    // Asegurar que el panel tiene la clase y un id único
    panel.classList.add('panel');
    if (!panel.id) {
      panel.id = expectedId;
    }
    
    // Marcar el tipo de panel para evitar duplicados
    panel.setAttribute('data-panel-type', panelType);

    container.appendChild(panel);

    // Funcionalidad de redimensionamiento y arrastre deshabilitada
    // this.makePanelResizable(panel, container);
    // this.makePanelDraggable(panel);

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
          transition: flex 0.1s ease-out;
        }
        
        .panel.resizing {
          transition: none;
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
      
      // Agregar clase resizing para desactivar transiciones
      panel.classList.add('resizing');
      
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
      
      // Usar requestAnimationFrame para sincronizar con el movimiento del ratón
      requestAnimationFrame(() => {
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
      });
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
        
        // Remover clase resizing para reactivar transiciones
        panel.classList.remove('resizing');
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
    let isReordering = false; // Para distinguir entre arrastrar y reordenar

    header.addEventListener('mousedown', (e) => {
      // Evitar arrastrar si se hace clic en botones
      if (e.target.closest('.panel-btn')) return;
      
      e.preventDefault();
      
      // Si se mantiene presionado Shift, es para reordenar
      if (e.shiftKey) {
        isReordering = true;
        this.startPanelReorder(panel, e);
        return;
      }
      
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

    const hideBtn = header.querySelector('.panel-btn[title="Ocultar"]');
    const soloBtn = header.querySelector('.panel-btn[title="Solo este panel"]');

    if (hideBtn) {
      hideBtn.addEventListener('click', async () => {
        // Ocultar el panel completamente
        panel.style.display = 'none';
        panel.style.visibility = 'hidden';
        panel.style.position = 'absolute';
        panel.style.left = '-9999px';
        panel.style.top = '-9999px';
        panel.style.width = '0';
        panel.style.height = '0';
        panel.style.flex = '0';
        panel.style.overflow = 'hidden';
        panel.style.zIndex = '-1';
        
        // Preservar estado BPMN si se está ocultando el panel BPMN
        const panelType = panel.getAttribute('data-panel-type');
        if (panelType === 'bpmn' && window.bpmnModeler && window.bpmnModeler.get) {
          try {
            const xml = await window.bpmnModeler.saveXML({ format: true });
            const svg = await window.bpmnModeler.saveSVG();
            
            // Verificar que el XML no esté vacío
            if (xml && xml.xml && xml.xml.trim().length > 0) {
              const bpmnState = {
                xml: xml.xml,
                svg: svg
              };
              // Guardar el estado en el panel manager
              if (window.panelManager) {
                window.panelManager.preservedBpmnState = bpmnState;
              }
            } else {
            }
          } catch (error) {
          }
        }
        
        // Actualizar la lista de paneles activos en el panel manager
        if (window.panelManager) {
          if (panelType && window.panelManager.activePanels.includes(panelType)) {
            window.panelManager.activePanels = window.panelManager.activePanels.filter(p => p !== panelType);
            
            // Actualizar el selector de paneles para mostrar el cambio
            if (window.panelManager.updatePanelSelector) {
              window.panelManager.updatePanelSelector();
            }
            
            // Notificar al panel manager para que reajuste el layout
            setTimeout(() => {
              if (window.panelManager && typeof window.panelManager.adjustLayoutForVisiblePanels === 'function') {
                window.panelManager.adjustLayoutForVisiblePanels();
              }
            }, 50);
          }
        }
      });
    }

    if (soloBtn) {
      soloBtn.addEventListener('click', () => {
        // Ocultar todos los otros paneles
        const container = panel.parentElement;
        const allPanels = container.querySelectorAll('.panel');
        
        allPanels.forEach(otherPanel => {
          if (otherPanel !== panel) {
            otherPanel.style.display = 'none';
            otherPanel.style.visibility = 'hidden';
            otherPanel.style.position = 'absolute';
            otherPanel.style.left = '-9999px';
            otherPanel.style.top = '-9999px';
            otherPanel.style.width = '0';
            otherPanel.style.height = '0';
            otherPanel.style.flex = '0';
            otherPanel.style.overflow = 'hidden';
            otherPanel.style.zIndex = '-1';
            
            // Remover de la lista activa
            const otherPanelType = otherPanel.getAttribute('data-panel-type');
            if (otherPanelType && window.panelManager && window.panelManager.activePanels.includes(otherPanelType)) {
              window.panelManager.activePanels = window.panelManager.activePanels.filter(p => p !== otherPanelType);
            }
          }
        });
        
        // Mostrar solo este panel
        panel.style.display = 'flex';
        panel.style.flex = '1';
        
        // Ajustar layout para un solo panel
        setTimeout(() => {
          if (window.panelManager && typeof window.panelManager.adjustLayoutForVisiblePanels === 'function') {
            window.panelManager.adjustLayoutForVisiblePanels();
          }
        }, 50);
      });
    }
  }

  // Método para detectar si un panel está oculto
  isPanelHidden(panel) {
    return panel.style.display === 'none' || 
           panel.style.visibility === 'hidden' ||
           (panel.style.position === 'absolute' && panel.style.left === '-9999px') ||
           panel.style.flex === '0' ||
           panel.style.width === '0' ||
           panel.style.height === '0' ||
           panel.style.opacity === '0';
  }

  // Método para restaurar la visibilidad de un panel
  restorePanelVisibility(panel) {
    // Restaurar estilos de visibilidad
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
    panel.style.opacity = '';
    
    // Asegurar que el panel sea visible
    panel.style.display = 'flex';
    panel.style.visibility = 'visible';
    panel.style.position = 'relative';
    panel.style.flex = '1';
    panel.style.opacity = '1';
    
    // Forzar reflow para asegurar que los cambios se apliquen
    panel.offsetHeight;
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
      case 'ppi':
        this.loadPpiController(panel);
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

  loadPpiController(panel) {
    // Inicializar el controlador PPI
    if (window.ppiManager) {
      // El PPI Manager ya está inicializado globalmente
      
      // Verificar que los métodos existan antes de llamarlos
      if (typeof window.ppiManager.setupFileUpload === 'function') {
        window.ppiManager.setupFileUpload();
      }
      
      if (typeof window.ppiManager.setupEventListeners === 'function') {
        window.ppiManager.setupEventListeners();
      }
      
      // MEJORADO: Forzar configuración de event listeners BPMN
      if (typeof window.ppiManager.setupBpmnEventListeners === 'function') {
        console.log('[PanelLoader] Forzando configuración de event listeners BPMN');
        window.ppiManager.setupBpmnEventListeners();
      }
      
      // MEJORADO: Verificar y crear PPIs desde elementos existentes en el canvas
      this.syncExistingPPIsFromCanvas();
      
      // Create sample PPIs if none exist - SOLO si es la primera vez
      if (typeof window.ppiManager.createSamplePPIs === 'function') {
        // Verificar si ya hay PPIs en el core antes de crear muestras
        const existingPPIs = window.ppiManager.core ? window.ppiManager.core.getAllPPIs() : [];
        if (existingPPIs.length === 0) {
          console.log('[PanelLoader] No hay PPIs existentes, creando muestras');
          window.ppiManager.createSamplePPIs();
        } else {
          console.log(`[PanelLoader] Ya existen ${existingPPIs.length} PPIs, saltando creación de muestras`);
        }
      }
      
      // OPTIMIZADO: Actualización inmediata sin delays
      if (typeof window.ppiManager.refreshPPIList === 'function') {
        console.log('[PanelLoader] Refrescando lista PPI');
        window.ppiManager.refreshPPIList();
      }

      // DEBUG: Verificar estado de sincronización
      this.debugPPISyncStatus();
    } else {
      console.warn('[PanelLoader] PPI Manager no disponible');
    }
  }

  // NUEVO: Método para sincronizar PPIs existentes desde el canvas
  syncExistingPPIsFromCanvas() {
    if (!window.ppiManager || !window.ppiManager.core) {
      console.log('[PanelLoader] PPI Manager no disponible para sincronización');
      return;
    }

    // Obtener modelador
    const modeler = window.modeler || (window.ppiManager.adapter && window.ppiManager.adapter.getBpmnModeler());
    if (!modeler) {
      console.log('[PanelLoader] Modeler no disponible para sincronización');
      return;
    }

    try {
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Buscar elementos PPINOT en el canvas
      const ppiElements = allElements.filter(el => 
        el.type && el.type.startsWith('PPINOT:') && 
        el.type !== 'PPINOT:Target' && 
        el.type !== 'PPINOT:Scope' && 
        el.type !== 'PPINOT:Measure' && 
        el.type !== 'PPINOT:Condition'
      );

      console.log(`[PanelLoader] Encontrados ${ppiElements.length} elementos PPINOT en el canvas`);

      // Verificar si cada elemento PPINOT tiene un PPI correspondiente
      ppiElements.forEach(element => {
        const existingPPI = window.ppiManager.core.ppis.find(ppi => ppi.elementId === element.id);
        if (!existingPPI) {
          console.log(`[PanelLoader] Elemento PPINOT sin PPI correspondiente: ${element.id}, creando PPI`);
          if (typeof window.ppiManager.createPPIFromElement === 'function') {
            window.ppiManager.createPPIFromElement(element.id);
          }
        } else {
          console.log(`[PanelLoader] Elemento PPINOT ya tiene PPI: ${element.id} -> ${existingPPI.id}`);
        }
      });

      // Verificar PPIs huérfanos (PPIs sin elementos en el canvas)
      const orphanPPIs = window.ppiManager.core.ppis.filter(ppi => {
        if (!ppi.elementId) return true;
        const canvasElement = elementRegistry.get(ppi.elementId);
        return !canvasElement;
      });

      if (orphanPPIs.length > 0) {
        console.log(`[PanelLoader] Encontrados ${orphanPPIs.length} PPIs huérfanos (sin elementos en canvas)`);
        orphanPPIs.forEach(ppi => {
          console.log(`[PanelLoader] PPI huérfano: ${ppi.id} (${ppi.title})`);
        });
      }

    } catch (error) {
      console.error('[PanelLoader] Error sincronizando PPIs desde canvas:', error);
    }
  }

  // Método de debugging para verificar el estado de sincronización PPI
  debugPPISyncStatus() {
    if (!window.ppiManager || !window.ppiManager.core) {
      console.log('[PanelLoader] PPI Manager o Core no disponible para debugging');
      return;
    }

    const ppis = window.ppiManager.core.getAllPPIs();
    console.log(`[PanelLoader] DEBUG: ${ppis.length} PPIs en el core`);

    // Verificar elementos en el canvas
    if (window.modeler) {
      try {
        const elementRegistry = window.modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        const ppiElements = allElements.filter(el => 
          el.businessObject && el.businessObject.$type && 
          el.businessObject.$type.includes('PPINOT')
        );
        
        console.log(`[PanelLoader] DEBUG: ${allElements.length} elementos totales en canvas`);
        console.log(`[PanelLoader] DEBUG: ${ppiElements.length} elementos PPI en canvas`);
        
        // Verificar sincronización
        ppis.forEach(ppi => {
          const canvasElement = elementRegistry.get(ppi.elementId);
          if (canvasElement) {
            console.log(`[PanelLoader] ✅ PPI ${ppi.id} (${ppi.title}) sincronizado con canvas`);
          } else {
            console.log(`[PanelLoader] ❌ PPI ${ppi.id} (${ppi.title}) NO encontrado en canvas`);
          }
        });
      } catch (error) {
        console.log('[PanelLoader] Error verificando elementos del canvas:', error);
      }
    } else {
      console.log('[PanelLoader] Modeler no disponible para debugging');
    }
  }

  startPanelReorder(panel, e) {
    const container = panel.parentElement;
    if (!container) return;

    // Crear indicador visual de reordenamiento
    panel.style.opacity = '0.7';
    panel.style.transform = 'rotate(2deg)';
    panel.style.zIndex = '1000';
    panel.style.boxShadow = '0 8px 32px rgba(0,0,0,0.3)';

    // Crear indicadores de drop zones
    this.createDropZones(container, panel);

    // Event listeners para el reordenamiento
    const handleMouseMove = (e) => {
      this.updateDropZones(e, container, panel);
    };

    const handleMouseUp = (e) => {
      this.finishPanelReorder(panel, container, e);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  createDropZones(container, draggedPanel) {
    const panels = Array.from(container.querySelectorAll('.panel')).filter(p => p !== draggedPanel);
    
    panels.forEach((panel, index) => {
      const dropZone = document.createElement('div');
      dropZone.className = 'panel-drop-zone';
      dropZone.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(58, 86, 212, 0.1);
        border: 2px dashed #3a56d4;
        border-radius: 8px;
        z-index: 999;
        opacity: 0;
        transition: opacity 0.2s ease;
        pointer-events: none;
      `;
      dropZone.setAttribute('data-panel-index', index);
      panel.appendChild(dropZone);
    });
  }

  updateDropZones(e, container, draggedPanel) {
    const dropZones = container.querySelectorAll('.panel-drop-zone');
    const mouseY = e.clientY;
    
    dropZones.forEach((zone, index) => {
      const panel = zone.parentElement;
      const rect = panel.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      
      if (mouseY < centerY) {
        zone.style.opacity = '1';
        zone.style.borderColor = '#3a56d4';
      } else {
        zone.style.opacity = '0.3';
        zone.style.borderColor = '#ccc';
      }
    });
  }

  finishPanelReorder(draggedPanel, container, e) {
    // Restaurar estilo del panel arrastrado
    draggedPanel.style.opacity = '1';
    draggedPanel.style.transform = '';
    draggedPanel.style.zIndex = '';
    draggedPanel.style.boxShadow = '';

    // Encontrar la posición de destino
    const panels = Array.from(container.querySelectorAll('.panel'));
    const mouseY = e.clientY;
    let targetIndex = panels.length;

    // Encontrar la posición correcta basada en la posición del mouse
    for (let i = 0; i < panels.length; i++) {
      const panel = panels[i];
      if (panel === draggedPanel) continue;
      
      const rect = panel.getBoundingClientRect();
      const centerY = rect.top + rect.height / 2;
      
      if (mouseY < centerY) {
        targetIndex = i;
        break;
      }
    }

    // Si no se encontró posición, poner al final
    if (targetIndex === panels.length) {
      targetIndex = panels.length - 1;
    }


    // Reordenar el panel
    this.reorderPanel(draggedPanel, targetIndex);

    // Limpiar drop zones
    container.querySelectorAll('.panel-drop-zone').forEach(zone => zone.remove());
  }

  reorderPanel(panel, targetIndex) {
    const container = panel.parentElement;
    if (!container) return;

    const panels = Array.from(container.querySelectorAll('.panel'));
    const currentIndex = panels.indexOf(panel);

    if (currentIndex === targetIndex) return;

    // Obtener el tipo de panel que se está reordenando
    const panelType = panel.getAttribute('data-panel-type');
    if (!panelType || !window.panelManager) return;

    // Reordenar en el array de paneles activos del panel manager
    const activePanels = window.panelManager.activePanels;
    const currentPanelIndex = activePanels.indexOf(panelType);
    
    if (currentPanelIndex === -1) return;

    // Remover el panel de su posición actual en el array
    activePanels.splice(currentPanelIndex, 1);
    
    // Insertar en la nueva posición
    if (targetIndex >= activePanels.length) {
      activePanels.push(panelType);
    } else {
      activePanels.splice(targetIndex, 0, panelType);
    }


    // Reaplicar la configuración para reflejar el nuevo orden
    setTimeout(() => {
      if (window.panelManager && typeof window.panelManager.applyConfiguration === 'function') {
        window.panelManager.applyConfiguration();
      }
    }, 100);
  }

  loadBpmnController() {
    // Ensure the canvas exists and has the expected ID
    const jsCanvas = document.getElementById('js-canvas');
    if (!jsCanvas) {
      console.error('Error: The BPMN canvas element with id "js-canvas" was not found');
      // Create the canvas if it doesn't exist
      const bpmnPanel = document.getElementById('bpmn-panel');
      if (bpmnPanel) {
        const panelContent = bpmnPanel.querySelector('.panel-content');
        if (panelContent) {
          const canvas = document.createElement('div');
          canvas.id = 'js-canvas';
          canvas.className = 'bpmn-container';
          panelContent.appendChild(canvas);
          console.log('Created missing js-canvas element in BPMN panel');
        }
      }
    }
    
    // Initialize or restore the BPMN modeler
    setTimeout(() => {
      // Let the panel-manager handle modeler initialization
      console.log('BPMN panel is ready for modeler initialization');
    }, 0);
  }
}

// Exportar la clase para ES6 modules
export { PanelLoader };

// También mantener la referencia global para compatibilidad
window.PanelLoader = PanelLoader;