// Panel Loader - Maneja la carga dinámica de paneles
class PanelLoader {
  constructor() {
    this.panelCache = new Map();
    this.panelConfigs = {
      'bpmn': {
        file: 'panels/bpmn-panel.html',
        id: 'bpmn-panel',
        type: 'bpmn'
      },
      'ppinot': {
        file: 'panels/ppinot-panel.html',
        id: 'ppinot-panel',
        type: 'ppinot'
      }
    };
  }

  // Cargar panel desde archivo HTML
  async loadPanel(panelType) {
    console.log(`🔄 Cargando panel: ${panelType}`);
    const config = this.panelConfigs[panelType];
    if (!config) {
      console.error(`Configuración no encontrada para el panel: ${panelType}`);
      return null;
    }

    console.log(`📁 Archivo a cargar: ${config.file}`);

    // Verificar cache
    if (this.panelCache.has(panelType)) {
      console.log(`✅ Panel ${panelType} encontrado en cache`);
      return this.panelCache.get(panelType).cloneNode(true);
    }

    try {
      console.log(`🌐 Haciendo fetch a: ${config.file}`);
      const response = await fetch(config.file);
      console.log(`📡 Respuesta del servidor:`, response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const html = await response.text();
      console.log(`📄 HTML cargado, longitud:`, html.length);
      
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = html.trim();
      
      const panel = tempDiv.firstElementChild;
      if (!panel) {
        throw new Error('No se pudo parsear el HTML del panel');
      }

      console.log(`✅ Panel ${panelType} parseado correctamente:`, panel);

      // Cachear el panel
      this.panelCache.set(panelType, panel.cloneNode(true));
      
      return panel;
    } catch (error) {
      console.error(`❌ Error cargando panel ${panelType}:`, error);
      return this.createFallbackPanel(panelType);
    }
  }

  // Crear panel de respaldo si falla la carga
  createFallbackPanel(panelType) {
    console.log(`🛠️ Creando panel de fallback para: ${panelType}`);
    const config = this.panelConfigs[panelType];
    const panel = document.createElement('div');
    panel.className = 'panel';
    panel.id = config.id;
    panel.setAttribute('data-panel-type', config.type);
    
    if (panelType === 'bpmn') {
      panel.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-diagram-project"></i>
            <span>Diagrama BPMN (Fallback)</span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" title="Minimizar"><i class="fas fa-minus"></i></button>
            <button class="panel-btn" title="Maximizar"><i class="fas fa-expand"></i></button>
            <button class="panel-btn" title="Cerrar"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="panel-content">
          <div id="js-canvas" class="bpmn-container" style="width: 100%; height: 100%; background: #f8f9fa; display: flex; align-items: center; justify-content: center;">
            <div style="text-align: center; color: #666;">
              <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
              <p>Panel BPMN cargado en modo fallback</p>
            </div>
          </div>
        </div>
      `;
    } else if (panelType === 'ppinot') {
      panel.innerHTML = `
        <div class="panel-header">
          <div class="panel-title">
            <i class="fas fa-sliders"></i>
            <span>Propiedades PPINOT (Fallback)</span>
          </div>
          <div class="panel-actions">
            <button class="panel-btn" title="Minimizar"><i class="fas fa-minus"></i></button>
            <button class="panel-btn" title="Maximizar"><i class="fas fa-expand"></i></button>
            <button class="panel-btn" title="Cerrar"><i class="fas fa-times"></i></button>
          </div>
        </div>
        <div class="panel-content">
          <div style="padding: 20px; text-align: center; color: #666;">
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
            <p>Panel PPINOT cargado en modo fallback</p>
          </div>
        </div>
      `;
    } else {
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
            <i class="fas fa-exclamation-triangle" style="font-size: 2rem; margin-bottom: 10px;"></i>
            <p>Error cargando panel ${panelType}</p>
            <button onclick="location.reload()" class="tool-btn">Recargar</button>
          </div>
        </div>
      `;
    }
    
    console.log(`✅ Panel de fallback creado:`, panel);
    return panel;
  }

  // Crear y agregar panel al contenedor
  async createPanel(panelType, container) {
    console.log(`🔧 Creando panel: ${panelType}`);
    console.log(`📦 Container:`, container);
    
    const panel = await this.loadPanel(panelType);
    console.log(`📋 Panel cargado:`, panel);
    
    if (panel && container) {
      console.log(`➕ Agregando panel al container...`);
      container.appendChild(panel);
      console.log(`✅ Panel agregado al container`);
      
      // Reinicializar eventos del panel
      this.initializePanelEvents(panel);
      console.log(`🎯 Eventos del panel inicializados`);
      
      return panel;
    } else {
      console.error(`❌ No se pudo crear el panel: panel=${!!panel}, container=${!!container}`);
    }
    return null;
  }

  // Inicializar eventos del panel
  initializePanelEvents(panel) {
    // Eventos de botones del panel
    const buttons = panel.querySelectorAll('.panel-btn');
    buttons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handlePanelButtonClick(btn, panel);
      });
    });

    // Eventos de tabs
    const tabs = panel.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', (e) => {
        e.stopPropagation();
        this.handleTabClick(tab);
      });
    });

    // Hacer el header arrastrable
    const header = panel.querySelector('.panel-header');
    if (header) {
      this.makeHeaderDraggable(header, panel);
    }

    // Agregar handles de redimensionamiento
    setTimeout(() => {
      this.addResizeHandles(panel);
    }, 100);
  }

  // Manejar clicks en botones del panel
  handlePanelButtonClick(btn, panel) {
    const icon = btn.querySelector('i');
    if (!icon) return;

    if (icon.classList.contains('fa-times')) {
      this.closePanel(panel);
    } else if (icon.classList.contains('fa-expand')) {
      this.maximizePanel(panel);
    } else if (icon.classList.contains('fa-minus')) {
      this.minimizePanel(panel);
    }
  }

  // Manejar clicks en tabs
  handleTabClick(clickedTab) {
    const tabContainer = clickedTab.parentNode;
    tabContainer.querySelectorAll('.tab').forEach(tab => {
      tab.classList.remove('active');
    });
    clickedTab.classList.add('active');
  }

  // Cerrar panel
  closePanel(panel) {
    const allPanels = Array.from(document.querySelectorAll('.panel:not(.closed)'));
    const otherPanel = allPanels.find(p => p !== panel);
    
    if (otherPanel) {
      this.maximizePanel(otherPanel);
      if (panel.getAttribute('data-panel-type') === 'bpmn') {
        this.preserveBpmnCanvas();
      }
    }
    
    panel.style.display = 'none';
    panel.classList.add('closed');
  }

  // Maximizar panel
  maximizePanel(panelToMaximize) {
    const allPanels = document.querySelectorAll('.panel:not(.closed)');
    const restoreButtons = document.querySelectorAll('.restore-btn');
    
    // Restaurar todos los paneles primero
    allPanels.forEach(panel => {
      panel.classList.remove('maximized', 'minimized');
      panel.style.width = '';
      panel.style.height = '';
      panel.style.position = '';
      panel.style.zIndex = '';
      panel.style.flex = '';
      panel.setAttribute('data-x', '0');
      panel.setAttribute('data-y', '0');
    });
    
    // Ocultar todos los botones de restaurar
    restoreButtons.forEach(btn => btn.classList.add('hidden'));
    
    // Maximizar el panel seleccionado
    panelToMaximize.classList.add('maximized');
    
    // Minimizar el otro panel
    allPanels.forEach(panel => {
      if (panel !== panelToMaximize) {
        panel.classList.add('minimized');
        
        const panelType = panel.getAttribute('data-panel-type');
        const restoreBtn = document.getElementById(`restore-${panelType}`);
        if (restoreBtn) {
          restoreBtn.classList.remove('hidden');
        }
      }
    });
    
    this.resizeCanvas();
  }

  // Minimizar panel
  minimizePanel(panel) {
    const allPanels = Array.from(document.querySelectorAll('.panel:not(.closed)'));
    const otherPanel = allPanels.find(p => p !== panel);
    if (otherPanel) {
      this.maximizePanel(otherPanel);
    }
  }

  // Preservar canvas BPMN
  preserveBpmnCanvas() {
    const canvas = document.getElementById('js-canvas');
    if (canvas && window.bpmnModeler) {
      window._preservedCanvas = canvas.cloneNode(true);
      window._preservedCanvas.id = 'js-canvas-preserved';
    }
  }

    // Restaurar canvas BPMN
  restoreBpmnCanvas() {
    const canvas = document.getElementById('js-canvas');
    if (canvas && window._preservedCanvas) {
      canvas.innerHTML = window._preservedCanvas.innerHTML;
      canvas.className = window._preservedCanvas.className;
      
      if (window.bpmnModeler) {
        const canvasService = window.bpmnModeler.get('canvas');
        if (canvasService && canvasService._container) {
          canvasService._container = canvas;
        }
        
        setTimeout(() => {
          try {
            canvasService.resized();
          } catch (error) {
            console.warn('Error resizing canvas:', error);
          }
        }, 100);
      }
    }
  }



  // Hacer header arrastrable
  makeHeaderDraggable(header, panel) {
    if (typeof interact === 'undefined') {
      console.warn('Interact.js no está disponible');
      return;
    }

    interact(header).draggable({
      inertia: true,
      modifiers: [
        interact.modifiers.restrictRect({
          restriction: 'parent',
          endOnly: true
        })
      ],
      autoScroll: true,
      listeners: {
        start: (event) => {
          panel.style.zIndex = 10;
          panel.style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
          this.toggleSnapZones(true);
        },
        move: (event) => {
          const x = (parseFloat(panel.getAttribute('data-x')) || 0) + event.dx;
          const y = (parseFloat(panel.getAttribute('data-y')) || 0) + event.dy;
          
          panel.style.transform = `translate(${x}px, ${y}px)`;
          panel.setAttribute('data-x', x);
          panel.setAttribute('data-y', y);
          
          const snapPosition = this.getSnapPosition(panel, x, y);
          this.highlightSnapZone(snapPosition);
        },
        end: (event) => {
          const x = parseFloat(panel.getAttribute('data-x')) || 0;
          const y = parseFloat(panel.getAttribute('data-y')) || 0;
          
          const snapPosition = this.getSnapPosition(panel, x, y);
          this.applySnapAndReorganize(panel, snapPosition);
          
          this.toggleSnapZones(false);
          panel.style.zIndex = '';
          panel.style.boxShadow = '';
        }
      }
    });
  }

  // Agregar handles de redimensionamiento
  addResizeHandles(panel) {
    if (typeof interact === 'undefined') {
      console.warn('Interact.js no está disponible');
      return;
    }

    console.log('🔧 Agregando handles de redimensionamiento al panel:', panel.id);
    
    // Aplicar interact.js a los handles específicos de este panel
    const handles = panel.querySelectorAll('.panel-resize-handle');
    console.log('📏 Handles encontrados:', handles.length);
    
    handles.forEach(handle => {
      console.log('🔧 Configurando handle:', handle.className);
    });

    interact('.panel-resize-handle').draggable({
      modifiers: [
        interact.modifiers.restrictEdges({
          outer: 'parent',
          endOnly: true
        }),
        interact.modifiers.restrictSize({
          min: { width: 300, height: 200 }
        })
      ],
      listeners: {
        start: (event) => {
          const panel = event.target.closest('.panel');
          const handle = event.target;
          const container = panel.parentElement;
          const panels = Array.from(container.children).filter(el => el.classList.contains('panel'));
          
          handle.classList.add('resizing');
          
          panel._initialWidth = panel.offsetWidth;
          panel._initialHeight = panel.offsetHeight;
          panel._initialX = event.clientX;
          panel._initialY = event.clientY;
          
          panels.forEach(p => {
            p._initialWidth = p.offsetWidth;
            p._initialHeight = p.offsetHeight;
          });
          
          const panelIndex = panels.indexOf(panel);
          panel._adjacentPanels = {
            left: panelIndex > 0 ? panels[panelIndex - 1] : null,
            right: panelIndex < panels.length - 1 ? panels[panelIndex + 1] : null,
            top: panelIndex > 0 ? panels[panelIndex - 1] : null,
            bottom: panelIndex < panels.length - 1 ? panels[panelIndex + 1] : null
          };
          
          panel._isVerticalLayout = container.style.flexDirection === 'column';
        },
        move: (event) => {
          const panel = event.target.closest('.panel');
          const handle = event.target;
          const deltaX = event.clientX - panel._initialX;
          const deltaY = event.clientY - panel._initialY;
          
          if (panel._isVerticalLayout) {
            if (handle.classList.contains('bottom')) {
              const newHeight = Math.max(200, panel._initialHeight + deltaY);
              const heightDiff = newHeight - panel._initialHeight;
              
              panel.style.height = newHeight + 'px';
              panel.style.flex = 'none';
              
              if (panel._adjacentPanels.bottom) {
                const bottomPanel = panel._adjacentPanels.bottom;
                const newBottomHeight = Math.max(200, bottomPanel._initialHeight - heightDiff);
                bottomPanel.style.height = newBottomHeight + 'px';
                bottomPanel.style.flex = 'none';
              }
            } else if (handle.classList.contains('top')) {
              const newHeight = Math.max(200, panel._initialHeight - deltaY);
              const heightDiff = panel._initialHeight - newHeight;
              
              panel.style.height = newHeight + 'px';
              panel.style.flex = 'none';
              
              if (panel._adjacentPanels.top) {
                const topPanel = panel._adjacentPanels.top;
                const newTopHeight = Math.max(200, topPanel._initialHeight + heightDiff);
                topPanel.style.height = newTopHeight + 'px';
                topPanel.style.flex = 'none';
              }
            }
          } else {
            if (handle.classList.contains('right')) {
              const newWidth = Math.max(300, panel._initialWidth + deltaX);
              const widthDiff = newWidth - panel._initialWidth;
              
              panel.style.width = newWidth + 'px';
              panel.style.flex = 'none';
              
              if (panel._adjacentPanels.right) {
                const rightPanel = panel._adjacentPanels.right;
                const newRightWidth = Math.max(300, rightPanel._initialWidth - widthDiff);
                rightPanel.style.width = newRightWidth + 'px';
                rightPanel.style.flex = 'none';
              }
            } else if (handle.classList.contains('left')) {
              const newWidth = Math.max(300, panel._initialWidth - deltaX);
              const widthDiff = panel._initialWidth - newWidth;
              
              panel.style.width = newWidth + 'px';
              panel.style.flex = 'none';
              
              if (panel._adjacentPanels.left) {
                const leftPanel = panel._adjacentPanels.left;
                const newLeftWidth = Math.max(300, leftPanel._initialWidth + widthDiff);
                leftPanel.style.width = newLeftWidth + 'px';
                leftPanel.style.flex = 'none';
              }
            }
          }
        },
        end: (event) => {
          const handle = event.target;
          handle.classList.remove('resizing');
          this.resizeCanvas();
        }
      }
    });
  }

  // Funciones de snap (reutilizadas del código original)
  getSnapPosition(panel, x, y) {
    const container = document.getElementById('panel-container');
    const containerRect = container.getBoundingClientRect();
    const panelRect = panel.getBoundingClientRect();
    
    const snapPositions = [
      { x: 0, y: 0, name: 'left', zone: 'left' },
      { x: containerRect.width - panelRect.width, y: 0, name: 'right', zone: 'right' },
      { x: 0, y: 0, name: 'top', zone: 'top' },
      { x: 0, y: containerRect.height - panelRect.height, name: 'bottom', zone: 'bottom' }
    ];
    
    let closestSnap = snapPositions[0];
    let minDistance = Infinity;
    
    snapPositions.forEach(snap => {
      const distance = Math.sqrt(
        Math.pow(x - snap.x, 2) + Math.pow(y - snap.y, 2)
      );
      if (distance < minDistance) {
        minDistance = distance;
        closestSnap = snap;
      }
    });
    
    return closestSnap;
  }

  toggleSnapZones(show) {
    const snapZones = document.getElementById('snap-zones');
    if (snapZones) {
      if (show) {
        snapZones.classList.add('visible');
      } else {
        snapZones.classList.remove('visible');
        snapZones.querySelectorAll('.snap-zone').forEach(zone => {
          zone.classList.remove('active');
        });
      }
    }
  }

  highlightSnapZone(snapPosition) {
    const snapZones = document.getElementById('snap-zones');
    if (snapZones) {
      snapZones.querySelectorAll('.snap-zone').forEach(zone => {
        zone.classList.remove('active');
      });
      
      const activeZone = snapZones.querySelector(`[data-zone="${snapPosition.zone}"]`);
      if (activeZone) {
        activeZone.classList.add('active');
      }
    }
  }

  applySnapAndReorganize(panel, snapPosition) {
    this.reorganizePanelsForSnap(panel, snapPosition);
  }

  reorganizePanelsForSnap(panel, snapPosition) {
    const container = document.getElementById('panel-container');
    const visiblePanels = Array.from(document.querySelectorAll('.panel:not(.closed)'));
    const zone = snapPosition.zone;
    
    visiblePanels.forEach(p => {
      p.style.transform = '';
      p.setAttribute('data-x', '0');
      p.setAttribute('data-y', '0');
    });
    
    let panelOrder = [];
    
    if (visiblePanels.length === 1) {
      panelOrder = [panel];
      container.style.flexDirection = 'row';
      panel.style.flex = '1';
    } else if (zone === 'left') {
      panelOrder = [panel, ...visiblePanels.filter(p => p !== panel)];
      container.style.flexDirection = 'row';
      panel.style.flex = '2';
      visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
    } else if (zone === 'right') {
      panelOrder = [...visiblePanels.filter(p => p !== panel), panel];
      container.style.flexDirection = 'row';
      panel.style.flex = '2';
      visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
    } else if (zone === 'top') {
      panelOrder = [panel, ...visiblePanels.filter(p => p !== panel)];
      container.style.flexDirection = 'column';
      panel.style.flex = '2';
      visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
    } else if (zone === 'bottom') {
      panelOrder = [...visiblePanels.filter(p => p !== panel), panel];
      container.style.flexDirection = 'column';
      panel.style.flex = '2';
      visiblePanels.filter(p => p !== panel).forEach(p => p.style.flex = '1');
    }
    
    container.style.display = 'flex';
    container.style.gap = '8px';
    
    if (panelOrder.length > 0) {
      panelOrder.forEach((p, index) => {
        if (p.parentNode) {
          container.appendChild(p);
        }
      });
    }
    
    setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }

  // Redimensionar canvas
  resizeCanvas() {
    if (window.bpmnModeler) {
      setTimeout(() => {
        try {
          const canvas = window.bpmnModeler.get('canvas');
          if (canvas && typeof canvas.resized === 'function') {
            canvas.resized();
          }
        } catch (error) {
          console.warn('Error resizing canvas:', error);
        }
      }, 50);
    }
  }

  // Restaurar layout compartido
  restoreSharedLayout() {
    const container = document.getElementById('panel-container');
    const visiblePanels = document.querySelectorAll('.panel:not(.closed)');
    
    visiblePanels.forEach(panel => {
      panel.classList.remove('maximized', 'minimized');
      panel.style.width = '';
      panel.style.height = '';
      panel.style.position = '';
      panel.style.zIndex = '';
      panel.style.flex = '';
      panel.setAttribute('data-x', '0');
      panel.setAttribute('data-y', '0');
    });
    
    if (visiblePanels.length >= 2) {
      container.style.flexDirection = 'row';
      container.style.display = 'flex';
      container.style.gap = '8px';
      visiblePanels[0].style.flex = '2';
      visiblePanels[1].style.flex = '1';
    } else if (visiblePanels.length === 1) {
      container.style.flexDirection = 'row';
      container.style.display = 'flex';
      visiblePanels[0].style.flex = '1';
    }
    
    document.querySelectorAll('.restore-btn').forEach(btn => btn.classList.add('hidden'));
    
    setTimeout(() => {
      this.resizeCanvas();
    }, 100);
  }
}

// Exportar para uso global
window.PanelLoader = PanelLoader; 