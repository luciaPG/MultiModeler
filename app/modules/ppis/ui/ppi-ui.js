// === PPI UI Components ===
// Componentes de interfaz de usuario para el gestor de PPIs

import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

// Define resolve function locally to avoid import issues
function resolve(key) {
  try {
    const registry = getServiceRegistry();
    return registry && typeof registry.get === 'function' ? (registry.get(key) || null) : null;
  } catch (error) {
    return null;
  }
}

class PPIUI {
    constructor(ppiCore, ppiManager = null) {
      this.core = ppiCore;
      this.ppiManager = ppiManager;
      
      // Obtener el adaptador del ppiManager si está disponible
      this.adapter = ppiManager ? ppiManager.adapter : null;
      
      // Validar que el core está correctamente inicializado
      if (!this.core || !this.core.measureTypes) {
        this.core = this.core || {};
        this.core.measureTypes = this.core.measureTypes || {
          derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' }
        };
      }
    }

  // === UI INITIALIZATION ===
  
  init() {
    this.setupEventListeners();
    this.loadPPIs();
  }

  setupEventListeners() {
    // Event listeners for the interface
    const searchInput = document.getElementById('ppi-search');
    if (searchInput) {
      searchInput.addEventListener('input', () => this.filterPPIs());
    }
  }

  // === CARD GENERATION ===
  
  createPPIElement(ppi) {
    
    const div = document.createElement('div');
    div.setAttribute('data-ppi-id', ppi.id);
    
    // Asegurar que tenemos un tipo de medida válido
    const measureTypeKey = (ppi.measureDefinition && ppi.measureDefinition.type) || 'derived';
    const measureType = this.core.measureTypes[measureTypeKey] || this.core.measureTypes.derived || {
      name: 'Tipo Desconocido',
      icon: 'fas fa-question-circle'
    };
    const cardTitle = ppi.title || ppi.id;
    
    // Determinar color del tipo
    const typeColors = {
      time: '#4facfe',
      count: '#f093fb',
      state: '#43e97b',
      data: '#a8edea',
      derived: '#667eea',
      aggregated: '#a8edea'
    };
    
    // Calcular progreso/completitud - solo para clase de tarjeta
    const completedFields = [ppi.title, ppi.target, ppi.scope, ppi.responsible].filter(Boolean).length;
    const totalFields = 4;
    const isComplete = completedFields === totalFields;
    
    // Set class without animation-triggering classes
    div.className = `ppi-card ${!isComplete ? 'needs-attention' : ''}`;
    
    // Disable any animations immediately
    div.style.animation = 'none';
    div.style.transition = 'none';
    div.style.opacity = '1';
    div.style.visibility = 'visible';
    
    // Add click handler to select PPI in canvas
    div.style.cursor = 'pointer';
    div.addEventListener('click', (e) => {
      // Only select if clicking on the card itself, not on buttons
      if (!e.target.closest('button')) {
        // Marcar inmediatamente esta tarjeta como seleccionada
        if (this.ppiManager && this.ppiManager.ui) {
          this.ppiManager.ui.selectPPI(ppi.id);
        }
        
        // También seleccionar en el canvas
        if (this.ppiManager && typeof this.ppiManager.selectPPIInCanvas === 'function') {
          this.ppiManager.selectPPIInCanvas(ppi.id);
        }
      }
    });
    
    // Add specific click handler for the selection dot
    const selectionDot = div.querySelector('.selection-dot');
    if (selectionDot) {
      selectionDot.style.cursor = 'pointer';
      selectionDot.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent card click
        
        // Toggle selection
        const isCurrentlySelected = div.classList.contains('selected');
        
        if (isCurrentlySelected) {
          // Deseleccionar
          if (this.ppiManager && this.ppiManager.ui) {
            this.ppiManager.ui.clearPPISelection();
          }
        } else {
          // Seleccionar
          if (this.ppiManager && this.ppiManager.ui) {
            this.ppiManager.ui.selectPPI(ppi.id);
          }
          
          // También seleccionar en el canvas
          if (this.ppiManager && typeof this.ppiManager.selectPPIInCanvas === 'function') {
            this.ppiManager.selectPPIInCanvas(ppi.id);
          }
        }
      });
    }
    
    div.innerHTML = `
      <div class="card-header">
        <div class="type-indicator" style="--type-color: ${typeColors[measureTypeKey]}">
          <i class="${measureType.icon}"></i>
        </div>
        
        <div class="header-content">
          <h3 class="card-title">${this.core.truncateText(cardTitle, 50)}</h3>
          <div class="meta-info">
           
          </div>
        </div>
        <div class="actions-panel">
          <button class="icon-btn primary" data-action="view" data-ppi-id="${ppi.id}">
            <i class="fas fa-eye"></i>
          </button>
          <button class="icon-btn secondary" data-action="edit" data-ppi-id="${ppi.id}">
            <i class="fas fa-edit"></i>
          </button>
          <button class="icon-btn danger" data-action="delete" data-ppi-id="${ppi.id}">
            <i class="fas fa-trash-alt"></i>
          </button>
        </div>
      </div>
      
      <div class="card-body">
        <div class="essential-info">
          <div class="info-line primary">
            <div class="field-group target-group">
              <i class="fas fa-bullseye field-icon target-icon"></i>
              <span class="field-label">Target:</span>
              <span class="field-value target-value">
                ${ppi.target ? this.core.truncateText(ppi.target, 60) : 'No definido'}
              </span>
            </div>
            
            <div class="field-group scope-group">
              <i class="fas fa-crosshairs field-icon scope-icon"></i>
              <span class="field-label">Scope:</span>
              <span class="field-value scope-value">
                ${this.core.truncateText(ppi.scope || 'Sin scope', 60)}
              </span>
            </div>
            
            <div class="field-group responsible-group">
              <i class="fas fa-user-tie field-icon responsible-icon"></i>
              <span class="field-label">Responsable:</span>
              <span class="field-value responsible-value">
                ${this.core.truncateText(ppi.responsible || 'No asignado', 70)}
              </span>
            </div>
          </div>
          
          ${ppi.businessObjective ? `
            <div class="info-line description">
              <div class="description-group">
                <i class="fas fa-lightbulb field-icon description-icon"></i>
                <span class="field-value description-text">
                  ${this.core.truncateText(ppi.businessObjective, 140)}
                </span>
              </div>
            </div>
          ` : ''}
        </div>
      </div>
    `;
    
    
    return div;
  }

  // Función para actualizar un elemento PPI existente sin recrearlo
  updatePPIElement(element, ppi) {
    
    
    // Prevent flickering during update
    element.classList.add('updating');
    element.style.visibility = 'visible';
    element.style.opacity = '1';
    
    // Calcular datos actualizados
    const completedFields = [ppi.title, ppi.target, ppi.scope, ppi.responsible].filter(Boolean).length;
    const totalFields = 4;
    const isComplete = completedFields === totalFields;

    // Actualizar clase del elemento (preservar estado activo y otras clases importantes)
    const wasActive = element.classList.contains('active-working');
    // Preserve existing classes except 'new-card' class which is only for new elements
    const preserveClasses = ['active-working', 'updating'];
    const classesToKeep = [];

    preserveClasses.forEach(cls => {
      if (element.classList.contains(cls)) {
        classesToKeep.push(cls);
      }
    });

    // Remove 'new-card' class if present
    element.classList.remove('new-card');

    // Update the element's class
    element.className = `ppi-card ${!isComplete ? 'needs-attention' : ''}`;

    // Re-add preserved classes
    classesToKeep.forEach(cls => element.classList.add(cls));

    // Make sure the active state is preserved
    if (wasActive) {
      element.classList.add('active-working');
    }    // Actualizar título
    const titleElement = element.querySelector('.card-title');
    if (titleElement) {
      const cardTitle = ppi.title || ppi.id;
      titleElement.textContent = this.core.truncateText(cardTitle, 50);
      titleElement.setAttribute('title', cardTitle);
    }
    
    // Actualizar target - MEJORADO
    const targetElement = element.querySelector('.target-value');
    if (targetElement) {
      const targetText = ppi.target || 'No definido';
      
      targetElement.textContent = this.core.truncateText(targetText, 35);
      targetElement.setAttribute('title', targetText);
      
      // Añadir indicador visual si el target cambió
      if (ppi.target) {
        targetElement.classList.add('has-value');
        targetElement.style.color = '#28a745'; // Verde para indicar que tiene valor
      } else {
        targetElement.classList.remove('has-value');
        targetElement.style.color = '#6c757d'; // Gris para indicar que no tiene valor
      }
    } else {
      
    }
    
    // Actualizar scope - MEJORADO
    const scopeElement = element.querySelector('.scope-value');
    if (scopeElement) {
      const scopeText = ppi.scope || 'Sin scope';
      
      scopeElement.textContent = this.core.truncateText(scopeText, 35);
      scopeElement.setAttribute('title', scopeText);
      
      // Añadir indicador visual si el scope cambió
      if (ppi.scope) {
        scopeElement.classList.add('has-value');
        scopeElement.style.color = '#28a745'; // Verde para indicar que tiene valor
      } else {
        scopeElement.classList.remove('has-value');
        scopeElement.style.color = '#6c757d'; // Gris para indicar que no tiene valor
      }
    } else {
      
    }
    
    // Actualizar responsible
    const responsibleElement = element.querySelector('.responsible-value');
    if (responsibleElement) {
      const responsibleText = ppi.responsible || 'No asignado';
      responsibleElement.textContent = this.core.truncateText(responsibleText, 45);
      responsibleElement.setAttribute('title', responsibleText);
    }
    
    // Actualizar business objective si existe
    const descriptionLine = element.querySelector('.info-line.description');
    if (ppi.businessObjective) {
      if (!descriptionLine) {
        // Crear la sección de descripción si no existe
        const descriptionHTML = `
          <div class="info-line description">
            <div class="description-group">
              <i class="fas fa-lightbulb field-icon description-icon"></i>
              <span class="field-value description-text">
                ${this.core.truncateText(ppi.businessObjective, 140)}
              </span>
            </div>
          </div>
        `;
        const essentialInfo = element.querySelector('.essential-info');
        if (essentialInfo) {
          essentialInfo.insertAdjacentHTML('beforeend', descriptionHTML);
        }
      } else {
        // Actualizar descripción existente
        const descriptionText = descriptionLine.querySelector('.description-text');
        if (descriptionText) {
          descriptionText.textContent = this.core.truncateText(ppi.businessObjective, 140);
          descriptionText.setAttribute('title', ppi.businessObjective);
        }
      }
    } else if (descriptionLine) {
      // Remover descripción si ya no hay business objective
      descriptionLine.remove();
    }
    
    // Configurar event listeners para botones de acción
    const viewBtn = element.querySelector('button[data-action="view"]');
    const editBtn = element.querySelector('button[data-action="edit"]');
    const deleteBtn = element.querySelector('button[data-action="delete"]');
    
    if (viewBtn) {
      viewBtn.removeEventListener('click', viewBtn._clickHandler);
      viewBtn._clickHandler = () => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.viewPPI === 'function') {
          ppiManager.viewPPI(ppi.id);
        }
      };
      viewBtn.addEventListener('click', viewBtn._clickHandler);
    }
    
    if (editBtn) {
      editBtn.removeEventListener('click', editBtn._clickHandler);
      editBtn._clickHandler = () => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.editPPI === 'function') {
          ppiManager.editPPI(ppi.id);
        }
      };
      editBtn.addEventListener('click', editBtn._clickHandler);
    }
    
    if (deleteBtn) {
      deleteBtn.removeEventListener('click', deleteBtn._clickHandler);
      deleteBtn._clickHandler = () => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.confirmDeletePPI === 'function') {
          ppiManager.confirmDeletePPI(ppi.id);
        }
      };
      deleteBtn.addEventListener('click', deleteBtn._clickHandler);
    }
    
    // Remove updating class after a brief delay to allow styles to apply
    setTimeout(() => {
      element.classList.remove('updating');
    }, 50);

    return element;
  }

  // === LIST MANAGEMENT ===
  
  refreshPPIList() {
    if (!this._refreshDebounced) {
      this._refreshDebounced = (fn => {
        let scheduled = false;
        return () => {
          if (scheduled) return;
          scheduled = true;
          setTimeout(() => { scheduled = false; fn(); }, 50);
        };
      })(() => this.rerefreshPPIList());
    }
    return this._refreshDebounced();
  }

  rerefreshPPIList() {
    if (this._isRefreshing) {
      this._refreshPending = true;
      return;
    }
    this._isRefreshing = true;
    // Silenciar logs para evitar spam cuando el panel no está montado aún
  
    // Siempre buscar el contenedor actual del panel
    const listContainer = document.querySelector('#ppi-panel #ppi-list');
    if (!listContainer) {
      // Si el contenedor no existe, liberar el lock y salir sin reintentos para evitar bucles
      this._isRefreshing = false;
      return;
    }
  
    try {
      if (typeof this._refreshPPIListImpl === 'function') {
        // Usar la implementación interna real
        this._refreshPPIListImpl(listContainer);
      } else {
        console.warn('[PPI-UI] ⚠️ No existe _refreshPPIListImpl');
      }
    } catch (err) {
      console.error('[PPI-UI] ❌ Error en refreshPPIList:', err);
    }
  }
  

  _refreshPPIListImpl(containerParam = null, retryCount = 0) {
    try {
      // MEJORADO: Buscar el contenedor de múltiples formas para mayor robustez
      let container = containerParam || document.getElementById('ppi-list');
     
    // Si no lo encuentra, intentar con querySelector
    if (!container) {
      container = document.querySelector('#ppi-list');
      
    }
    
    // Si aún no lo encuentra, buscar por clase
    if (!container) {
      container = document.querySelector('.ppi-list');
      
    }
    
    // MEJORADO: Buscar en el panel PPI específico
    if (!container) {
      const ppiPanel = document.getElementById('ppi-panel');
      if (ppiPanel) {
        container = ppiPanel.querySelector('#ppi-list') || ppiPanel.querySelector('.ppi-list'); 
      }
    }
    
    // MEJORADO: Buscar en cualquier panel que contenga ppi-list
    if (!container) {
      const allPanels = document.querySelectorAll('.panel');
      for (const panel of allPanels) {
        const found = panel.querySelector('#ppi-list') || panel.querySelector('.ppi-list');
        if (found) {
          container = found;      
          break;
        }
      }
    }
    
    // MEJORADO: Buscar en cualquier elemento con data-panel-type="ppi"
    if (!container) {
      const ppiPanels = document.querySelectorAll('[data-panel-type="ppi"]');
      for (const panel of ppiPanels) {
        const found = panel.querySelector('#ppi-list') || panel.querySelector('.ppi-list');
        if (found) {
          container = found;
          break;
        }
      }
    }
    
    // Si aún no encuentra el contenedor, reintentar
    if (!container) {
      
      if (retryCount < 50) {
        // Reintentar después de un delay
        setTimeout(() => {
          this._refreshPPIListImpl(container, retryCount + 1);

        }, 100);
        return;
      } else {
        console.log(`🔴 [_refreshPPIListImpl] No se pudo encontrar el contenedor ppi-list después de 50 intentos`);
        
        // MEJORADO: Intentar crear el contenedor si no existe  
        container = this.createPPIListContainer();
        
        if (!container) {
          console.log('🔴 [_refreshPPIListImpl] No se pudo crear el contenedor ppi-list');
          return;
        }
      }
    }
    
    // MEJORADO: Verificar si el panel PPI está cargando
    if (!container) {
      const ppiPanel = document.getElementById('ppi-panel');
      if (ppiPanel) {
        const innerHTML = ppiPanel.innerHTML || '';
        if (innerHTML.includes('Loading') || innerHTML.length < 100) {
        
          if (retryCount < 50) { // Más intentos para HTML asíncrono
            setTimeout(() => {
              this._refreshPPIListImpl(container, retryCount + 1);
            }, 100);
          }
          return;
        }
      }
    }
    
    if (!container) {
      if (retryCount < 50) { // MEJORADO: Maximum 50 retries (5 seconds total)
        // Retry mechanism for when container is not yet available

        setTimeout(() => {
          this._refreshPPIListImpl(container, retryCount + 1);
        }, 100);
      } else {
        
        // MEJORADO: Intentar crear el contenedor si no existe
        this.createPPIListContainer();
      }
      return;
    }

    // MEJORADO: Verificar que el core esté disponible
    if (!this.core || !this.core.ppis) {
      if (retryCount < 5) {
        setTimeout(() => {
          this._refreshPPIListImpl(container, retryCount + 1);
        }, 500);
      }
      return;
    }

    // Priorizar filteredPPIs si existe, luego getVisiblePPIs(), luego ppis como último recurso
    let sourcePPIs;
    if (this.core.filteredPPIs && this.core.filteredPPIs.length >= 0) {
      sourcePPIs = this.core.filteredPPIs;
      console.log(`🔍 [PPI-UI] Usando filteredPPIs: ${sourcePPIs.length} PPIs`);
    } else if (this.core.getVisiblePPIs) {
      sourcePPIs = this.core.getVisiblePPIs();
      console.log(`🔍 [PPI-UI] Usando getVisiblePPIs(): ${sourcePPIs.length} PPIs`);
    } else {
      sourcePPIs = this.core.ppis || [];
      console.log(`🔍 [PPI-UI] Usando ppis directas: ${sourcePPIs.length} PPIs`);
    }
    
    console.log(`🔍 [PPI-UI] PPIs a mostrar: ${sourcePPIs.length} (filtradas de ${this.core.ppis ? this.core.ppis.length : 0} totales)`);
    const uniqueById = new Map();
    const uniqueByElement = new Set();
    for (const p of sourcePPIs) {
      if (!p || !p.id) continue;
      if (p.elementId && uniqueByElement.has(p.elementId)) continue;
      uniqueById.set(p.id, p);
      if (p.elementId) uniqueByElement.add(p.elementId);
    }
    // Mostrar SOLO PPIs principales
    const ppisToShow = Array.from(uniqueById.values()).filter(p => p && p.type === 'PPINOT:Ppi');


    // MEJORADO: Deduplicar tarjetas existentes por data-ppi-id (mantener la primera)
    const allCards = Array.from(container.querySelectorAll('.ppi-card[data-ppi-id]'));
    const seenIds = new Set();
    for (const card of allCards) {
      const id = card.getAttribute('data-ppi-id');
      if (seenIds.has(id)) {
        try {
          card.remove();
        } catch (removeErr) {
          console.warn('No se pudo eliminar tarjeta duplicada', id, removeErr);
        }
      } else {
        seenIds.add(id);
      }
    }

    // MEJORADO: Crear un mapa de PPIs existentes para evitar recrear elementos innecesariamente
    const existingCards = new Map();
    container.querySelectorAll('.ppi-card[data-ppi-id]').forEach(card => {
      const ppiId = card.getAttribute('data-ppi-id');
      if (!existingCards.has(ppiId)) {
        existingCards.set(ppiId, card);
      }
    });


    // Añadir estilos mejorados
    this.addImprovedStyles();

    // Crear un fragmento para los nuevos elementos
    const fragment = document.createDocumentFragment();
    const newCards = new Set();

    // Preserve scroll position to prevent jumping
    const scrollTop = container.scrollTop;

    ppisToShow.forEach((ppi) => {
      let ppiElement = existingCards.get(ppi.id);

      if (ppiElement) {
        // MEJORADO: Solo actualizar si los datos han cambiado realmente
        const storedData = ppiElement.getAttribute('data-ppi-data') || '';
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });

        // Solo actualizar si hay cambios reales
        if (storedData !== currentData) {
          
          
          // Prevent any movement during update
          ppiElement.style.position = 'relative';
          ppiElement.style.visibility = 'visible';
          ppiElement.style.opacity = '1';
          
          this.updatePPIElement(ppiElement, ppi);
          ppiElement.setAttribute('data-ppi-data', currentData);
        } else {
          // No hacer nada
        }
        
        newCards.add(ppi.id);

      } else {
        if (newCards.has(ppi.id)) {
          // Duplicate during this render batch, skip
          return;
        }
        // MEJORADO: Crear nuevo elemento solo si realmente es nuevo
        
        const newElement = this.createPPIElement(ppi);
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });
        newElement.setAttribute('data-ppi-data', currentData);
        // Eliminar completamente animaciones y transiciones para evitar parpadeos
        newElement.style.animation = 'none';
        newElement.style.transition = 'none';
        newElement.style.opacity = '1';
        newElement.style.transform = 'none';
        
        // Configurar event listeners para los botones de la nueva tarjeta
        this.setupCardEventListeners(newElement, ppi);
        
        fragment.appendChild(newElement);
        newCards.add(ppi.id);
        
      }
    });

    // MEJORADO: Limpiar elementos que ya no existen
    const elementsToRemove = [];
    existingCards.forEach((card, ppiId) => {
      if (!newCards.has(ppiId)) {
        elementsToRemove.push(card);
      }
    });

    elementsToRemove.forEach(element => {
      if (element.parentNode) {
        element.remove();
      }
    });

    // Añadir nuevos elementos (solo los que realmente son nuevos)
    if (fragment.children.length > 0) {
      container.appendChild(fragment);
    } else {
      // No ha  cer nada
    }

    // Restore scroll position to prevent jumping
    container.scrollTop = scrollTop;
    
    } catch (error) {
      console.error('❌ [_refreshPPIListImpl] Error refreshing PPI list:', error);
      
      // If we get an error, try to create the container and retry
      if (retryCount < 10) {
        // No hacer nada
        setTimeout(() => {
          this.createPPIListContainer();
          setTimeout(() => {
            this._refreshPPIListImpl(retryCount + 1);
          }, 200);
        }, 100);
      } else {
        console.error('❌ [_refreshPPIListImpl] Max retries reached, giving up');
      }
    }
    finally {
      this._isRefreshing = false;
      if (this._refreshPending) {
        this._refreshPending = false;
        setTimeout(() => this.refreshPPIList(), 0);
      }
    }
  }

  // Configurar event listeners para los botones de una tarjeta PPI
  setupCardEventListeners(element, ppi) {
    const viewBtn = element.querySelector('button[data-action="view"]');
    const editBtn = element.querySelector('button[data-action="edit"]');
    const deleteBtn = element.querySelector('button[data-action="delete"]');
    
    if (viewBtn) {
      // Remover listener anterior si existe
      if (viewBtn._clickHandler) {
        viewBtn.removeEventListener('click', viewBtn._clickHandler);
      }
      viewBtn._clickHandler = () => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.viewPPI === 'function') {
          ppiManager.viewPPI(ppi.id);
        }
      };
      viewBtn.addEventListener('click', viewBtn._clickHandler);
    }
    
    if (editBtn) {
      // Remover listener anterior si existe
      if (editBtn._clickHandler) {
        editBtn.removeEventListener('click', editBtn._clickHandler);
      }
      editBtn._clickHandler = () => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && typeof ppiManager.editPPI === 'function') {
          ppiManager.editPPI(ppi.id);
        }
      };
      editBtn.addEventListener('click', editBtn._clickHandler);
    }
    
    if (deleteBtn) {
      // Remover listener anterior si existe
      if (deleteBtn._clickHandler) {
        deleteBtn.removeEventListener('click', deleteBtn._clickHandler);
      }
      deleteBtn._clickHandler = () => {
        console.log('[PPI-UI] Delete button clicked for PPI:', ppi.id);
        
        // VALIDACIÓN: Verificar que el PPI existe antes de intentar eliminarlo
        const ppiManager = resolve('PPIManagerInstance');
        if (!ppiManager || typeof ppiManager.confirmDeletePPI !== 'function') {
          console.error('[PPI-UI] PPIManager not found or confirmDeletePPI not available');
          return;
        }
        
        // Verificar que el PPI existe en memoria
        const ppiExists = ppiManager.core.getPPI(ppi.id);
        if (!ppiExists) {
          console.warn('[PPI-UI] ⚠️ PPI no encontrado en memoria, buscando por elementId:', ppi.elementId);
          
          // Intentar buscar por elementId
          const allPPIs = ppiManager.core.getAllPPIs();
          const ppiByElement = allPPIs.find(p => p.elementId === ppi.elementId);
          
          if (ppiByElement) {
            console.log('[PPI-UI] ✅ PPI encontrado por elementId:', ppiByElement.id);
            console.log('[PPI-UI] 🔄 Actualizando ID de', ppi.id, 'a', ppiByElement.id);
            ppiManager.confirmDeletePPI(ppiByElement.id);
          } else {
            console.error('[PPI-UI] ❌ PPI no encontrado ni por ID ni por elementId');
            // Forzar refresh de la lista para sincronizar
            this.refreshPPIList();
            return;
          }
        } else {
          console.log('[PPI-UI] ✅ PPI encontrado, procediendo con eliminación:', ppi.id);
          ppiManager.confirmDeletePPI(ppi.id);
        }
      };
      deleteBtn.addEventListener('click', deleteBtn._clickHandler);
    }
  }

  // NUEVO: Método para crear el contenedor de lista PPI si no existe
  createPPIListContainer() {
    // Buscar el panel PPI
    let ppiPanel = document.getElementById('ppi-panel');
    if (!ppiPanel) {
      // Esperar un poco más antes de dar por vencido
      setTimeout(() => {
        this.createPPIListContainer();
      }, 500);
      return;
    }
    
    // Buscar el contenedor principal
    let mainContainer = ppiPanel.querySelector('.ppi-main-container');
    if (!mainContainer) {
      // Crear estructura básica si no existe
      const panelContent = ppiPanel.querySelector('.panel-content');
      if (panelContent) {
        panelContent.innerHTML = `
          <div class="ppi-main-container">
            <div class="ppi-section-header">
              <div class="ppi-section-title">
                <i class="fas fa-tachometer-alt"></i>
                <h2>Indicadores de Rendimiento</h2>
              </div>
              <div class="ppi-section-meta">
                <span class="section-description">Gestión y monitoreo de métricas clave. Añade tu PPI desde el canvas de BPMN</span>
              </div>
              <div class="ppi-info-box" id="ppi-sync-status">
                <i class="fas fa-check-circle" id="sync-icon"></i>
                <span id="sync-status-text">Sincronización en tiempo real</span>
              </div>
            </div>
            <div class="ppi-list-container">
              <div id="ppi-list" class="ppi-list"></div>
            </div>
          </div>
                      `;
            } else {
              return;
            }
    } else {
      // Buscar el contenedor de lista
      let listContainer = mainContainer.querySelector('.ppi-list-container');
      if (!listContainer) {
        listContainer = document.createElement('div');
        listContainer.className = 'ppi-list-container';
        mainContainer.appendChild(listContainer);
      }
      
      // Crear el contenedor de lista si no existe
      let ppiList = listContainer.querySelector('#ppi-list');
      if (!ppiList) {
        ppiList = document.createElement('div');
        ppiList.id = 'ppi-list';
        ppiList.className = 'ppi-list';
        listContainer.appendChild(ppiList);
      }
    }
    
    // Intentar refrescar la lista nuevamente
    setTimeout(() => {
      this._refreshPPIListImpl(0);
    }, 100);
  }

  filterPPIs() {
    const searchInput = document.getElementById('ppi-search');
    const typeSelect = document.getElementById('type-filter');
    const statusSelect = document.getElementById('status-filter');
    
    const searchTerm = (searchInput ? searchInput.value : '').toLowerCase();
    const typeFilter = typeSelect ? typeSelect.value : '';
    const statusFilter = statusSelect ? statusSelect.value : '';

    this.core.filterPPIs(searchTerm, typeFilter, statusFilter);
    this.refreshPPIList();
  }

  // === MODAL MANAGEMENT ===
  
  showCreatePPIModal() {
    const emptyPPI = {
      id: '',
      title: '',
      process: '',
      businessObjective: '',
      measureDefinition: { type: 'derived', definition: '' },
      target: '',
      scope: '',
      source: '',
      responsible: '',
      informed: [],
      comments: '',
      elementId: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.createModal('Crear Nuevo PPI', this.generateEditForm(emptyPPI), true, emptyPPI);
  }

  showDetailModal(ppi) {
    if (!ppi) {
      console.warn('[PPI-UI] No se puede mostrar modal de detalle: PPI no proporcionado');
      return;
    }
    
    // MEJORADO: Validar PPI antes de mostrar
    const validatedPPI = this.validatePPI(ppi);
    if (!validatedPPI) {
      console.error('[PPI-UI] PPI no válido, no se puede mostrar modal');
      return;
    }
    
    this.createModal('Detalles del PPI', this.generateDetailContent(validatedPPI), false);
  }

  showEditModal(ppi) {
    if (!ppi) {
      console.warn('[PPI-UI] No se puede mostrar modal de edición: PPI no proporcionado');
      return;
    }
    
    // MEJORADO: Validar PPI antes de mostrar
    const validatedPPI = this.validatePPI(ppi);
    if (!validatedPPI) {
      console.error('[PPI-UI] PPI no válido, no se puede mostrar modal de edición');
      return;
    }
    
    this.createModal('Editar PPI', this.generateEditForm(validatedPPI), true, validatedPPI);
  }
  
  // MEJORADO: Método para validar PPIs
  validatePPI(ppi) {
    if (!ppi) {
      console.warn('[PPI-UI] PPI es null o undefined');
      return null;
    }
    
    // Validar propiedades requeridas
    if (!ppi.id) {
      console.warn('[PPI-UI] PPI sin ID válido');
      return null;
    }
    
    // Asegurar que measureDefinition existe
    if (!ppi.measureDefinition) {
      console.log('[PPI-UI] PPI sin measureDefinition, agregando por defecto');
      ppi.measureDefinition = { type: 'derived', definition: 'Sin definición' };
    }
    
    // Asegurar que otras propiedades existan
    const safePPI = {
      ...ppi,
      title: ppi.title || 'Sin título',
      description: ppi.description || 'Sin descripción',
      target: ppi.target || 'Sin objetivo',
      scope: ppi.scope || 'Sin alcance',
      businessObjective: ppi.businessObjective || 'Sin objetivo de negocio',
      responsible: ppi.responsible || '',
      informed: ppi.informed || [],
      comments: ppi.comments || '',
      source: ppi.source || '',
      process: ppi.process || '',
      createdAt: ppi.createdAt || new Date().toISOString(),
      updatedAt: ppi.updatedAt || new Date().toISOString(),
      elementId: ppi.elementId || ''
    };
    
    console.log('[PPI-UI] PPI validado correctamente:', safePPI.id);
    return safePPI;
  }

  createModal(title, content, isEdit = false, ppi = null) {
    // Remover modal existente si hay uno
    const existingModal = document.getElementById('ppi-modal');
    if (existingModal) {
      existingModal.remove();
    }

    const modal = document.createElement('div');
    modal.id = 'ppi-modal';
    modal.className = 'ppi-modal-overlay';
    const typeColor = '#3a56d4';
    modal.innerHTML = `
      <div class="ppi-modal" style="--type-color: ${typeColor}">
        <div class="ppi-modal-header">
          <div class="header-left">
            <span class="type-indicator"><i class="fas fa-calculator"></i></span>
            <div class="titles">
              <h3>${title}</h3>
              <p class="subtitle">Gestión de PPIs · Configura y revisa la información clave</p>
            </div>
          </div>
          <button class="ppi-modal-close" onclick="this.closest('.ppi-modal-overlay').remove()" title="Cerrar">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="ppi-modal-body">
          ${content}
        </div>
        ${isEdit ? `
          <div class="ppi-modal-footer">
            <button class="btn btn-secondary" onclick="this.closest('.ppi-modal-overlay').remove()">Cancelar</button>
            <button class="btn btn-primary" id="save-ppi-btn" data-ppi-id="${ppi ? ppi.id : ''}">${ppi ? 'Guardar Cambios' : 'Crear PPI'}</button>
          </div>
        ` : ''}
      </div>
    `;

    document.body.appendChild(modal);
    this.addModalStyles();

    // Configurar funcionalidad de pestañas para modales de edición y visualización
    if (isEdit) {
      // NUEVO: Restaurar datos del formulario PPI guardados si existen
      this.restoreSavedPPIFormData();
      this.setupTabNavigation();
      this.setupFormValidation();
      this.setupTargetScopeValidation(ppi);
      
      // Configurar sincronización bidireccional con el diagrama
      if (ppi) {
        this.setupDiagramSync(ppi);
        // MEJORADO: Configurar sincronización formulario-diagrama
        this.setupFormToDiagramSync(ppi);
        // Debug: listar elementos del diagrama
        this.debugDiagramElements();
      }
      
      // Configurar event listener para el botón de guardar
      const saveBtn = modal.querySelector('#save-ppi-btn');
      if (saveBtn) {
        saveBtn.addEventListener('click', () => {
          const ppiId = saveBtn.getAttribute('data-ppi-id');
          const ppiManager = resolve('PPIManagerInstance');
          if (ppiManager && typeof ppiManager.saveEditedPPI === 'function') {
            ppiManager.saveEditedPPI(ppiId);
          } else {
            console.error('PPI Manager no disponible');
          }
        });
      }
      
      // Configurar event listener para cerrar el modal y limpiar la sincronización
      const closeBtn = modal.querySelector('.ppi-modal-close');
      const cancelBtn = modal.querySelector('.btn-secondary');
      
      const cleanupAndClose = () => {
        this.cleanupDiagramSync();
        modal.remove();
      };
      
      if (closeBtn) {
        closeBtn.addEventListener('click', cleanupAndClose);
      }
      if (cancelBtn) {
        cancelBtn.addEventListener('click', cleanupAndClose);
      }
      
      // También limpiar cuando se hace clic fuera del modal
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          cleanupAndClose();
        }
      });
      
    } else {
      // También configurar pestañas para el modal de visualización
      this.setupTabNavigation();
    }
  }

  // === FORM GENERATION ===
  
  generateDetailContent(ppi) {
    // Validar que existe el tipo de medida
    const measureTypeKey = (ppi.measureDefinition && ppi.measureDefinition.type) || 'derived';
    const measureType = this.core.measureTypes[measureTypeKey] || this.core.measureTypes.derived || {
      name: 'Tipo Desconocido',
      icon: 'fas fa-question-circle'
    };
    
    // MEJORADO: Validar y proporcionar valores por defecto para evitar errores
    const safePPI = {
      id: ppi.id || 'Sin ID',
      title: ppi.title || 'Sin título',
      description: ppi.description || 'Sin descripción',
      target: ppi.target || 'Sin objetivo',
      scope: ppi.scope || 'Sin alcance',
      businessObjective: ppi.businessObjective || 'Sin objetivo de negocio',
      measureDefinition: ppi.measureDefinition || { type: 'derived', definition: 'Sin definición' },
      createdAt: ppi.createdAt || new Date().toISOString(),
      updatedAt: ppi.updatedAt || new Date().toISOString(),
      elementId: ppi.elementId || 'Sin elemento'
    };
    
    const createdAt = new Date(safePPI.createdAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
    const updatedAt = new Date(safePPI.updatedAt).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });

    return `
      <div class="ppi-detail-container">
        <div class="ppi-form-header">
          <div class="ppi-id-info">
            <span class="ppi-id-label">PPI ID:</span>
            <span class="ppi-id-value">${safePPI.id}</span>
          </div>
        </div>

        <div class="form-tabs">
          <button type="button" class="tab-button active" data-tab="general">
            <i class="fas fa-info-circle"></i> General
          </button>
          <button type="button" class="tab-button" data-tab="measurement">
            <i class="fas fa-chart-bar"></i> Medición
          </button>
          <button type="button" class="tab-button" data-tab="targets">
            <i class="fas fa-bullseye"></i> Objetivos
          </button>
          <button type="button" class="tab-button" data-tab="responsibilities">
            <i class="fas fa-users"></i> Responsabilidades
          </button>
          <button type="button" class="tab-button" data-tab="system">
            <i class="fas fa-clock"></i> Sistema
          </button>
        </div>

        <div class="form-content">
          <!-- Tab: General -->
          <div class="tab-content active" data-tab="general">
              <div class="form-group">
                <label for="view-title">Título del PPI</label>
                <input type="text" id="view-title" value="${safePPI.title || ''}" readonly class="readonly-field">
                <div class="field-help">Nombre descriptivo del indicador</div>
              </div>

              <div class="form-group">
                <label for="view-process">Proceso</label>
                <input type="text" id="view-process" value="${safePPI.process || ''}" readonly class="readonly-field">
                <div class="field-help">Proceso de negocio asociado</div>
              </div>

              <div class="form-group">
                <label for="view-business-objective">Process Goals</label>
                <textarea id="view-business-objective" rows="3" readonly class="readonly-field">${safePPI.businessObjective || ''}</textarea>
                <div class="field-help">Objetivos que busca cumplir</div>
              </div>
          </div>

          <!-- Tab: Measurement -->
          <div class="tab-content" data-tab="measurement">
              <div class="form-group">
                <label for="view-measure-type">Tipo de Medida</label>
                <input type="text" id="view-measure-type" value="${measureType.name}" readonly class="readonly-field">
              </div>

              <div class="form-group">
                <label for="view-measure-definition">Measure (Definición)</label>
                <textarea id="view-measure-definition" rows="4" readonly class="readonly-field">${safePPI.measureDefinition.definition || ''}</textarea>
                <div class="field-help">Descripción técnica del cálculo</div>
              </div>

              <div class="form-group">
                <label for="view-source">Source (Fuente)</label>
                <input type="text" id="view-source" value="${safePPI.source || ''}" readonly class="readonly-field">
                <div class="field-help">Origen de los datos</div>
              </div>
          </div>

          <!-- Tab: Targets -->
          <div class="tab-content" data-tab="targets">
              <div class="form-group">
                <label for="view-target">Target (Objetivo)</label>
                <input type="text" id="view-target" value="${safePPI.target || ''}" readonly class="readonly-field">
                <div class="field-help">Valor objetivo del indicador</div>
                ${safePPI.target ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${safePPI.target}</div>` : ''}
              </div>

              <div class="form-group">
                <label for="view-scope">Scope (Alcance)</label>
                <input type="text" id="view-scope" value="${safePPI.scope || ''}" readonly class="readonly-field">
                <div class="field-help">Qué instancias se consideran</div>
                ${safePPI.scope ? `<div class="bpmn-info"><i class="fas fa-link"></i> Del canvas: ${safePPI.scope}</div>` : ''}
              </div>
          </div>

          <!-- Tab: Responsibilities -->
          <div class="tab-content" data-tab="responsibilities">
              <div class="form-group">
                <label for="view-responsible">Responsible (Responsable)</label>
                <input type="text" id="view-responsible" value="${safePPI.responsible || ''}" readonly class="readonly-field">
                <div class="field-help">Persona responsable del PPI</div>
              </div>

              <div class="form-group">
                <label for="view-informed">Informed (Informados)</label>
                <input type="text" id="view-informed" value="${Array.isArray(safePPI.informed) && safePPI.informed.length > 0 ? safePPI.informed.join(', ') : ''}" readonly class="readonly-field">
                <div class="field-help">Personas que reciben información</div>
              </div>

              <div class="form-group">
                <label for="view-comments">Comments (Comentarios)</label>
                <textarea id="view-comments" rows="3" readonly class="readonly-field">${safePPI.comments || ''}</textarea>
                <div class="field-help">Información adicional</div>
              </div>
          </div>

          <!-- Tab: System -->
          <div class="tab-content" data-tab="system">
              <div class="form-group">
                <label for="view-created">Fecha de Creación</label>
                <input type="text" id="view-created" value="${createdAt}" readonly class="readonly-field">
                <div class="field-help">Cuándo se creó este PPI</div>
              </div>

              <div class="form-group">
                <label for="view-updated">Última Actualización</label>
                <input type="text" id="view-updated" value="${updatedAt}" readonly class="readonly-field">
                <div class="field-help">Última vez que se modificó</div>
              </div>

              <div class="form-group">
                <label for="view-element">Elemento BPMN</label>
                <input type="text" id="view-element" value="${safePPI.elementId || 'No vinculado'}" readonly class="readonly-field">
                <div class="field-help">Elemento del modelo al que está asociado</div>
              </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Generate info about existing Target/Scope elements in canvas
   */
  generateTargetScopeInfo(ppi, type) {
    if (!ppi.elementId || !this.ppiManager) {
      return '';
    }

    const existing = this.ppiManager.getExistingTargetScopeElements(ppi.elementId);
    const elements = type === 'target' ? existing.targets : existing.scopes;
    
    if (elements.length === 0) {
      return `<div class="bpmn-info-warning"><i class="fas fa-info-circle"></i> No hay elementos ${type === 'target' ? 'Target' : 'Scope'} en el canvas. Arrastra uno desde la paleta. Puedes editarlos pero no se reflejará en el canvas si no lo añades graficamente</div>`;
    }

    const elementsList = elements.map(el => {
      const name = (el.businessObject && el.businessObject.name) || 'Sin nombre';
      return `<span class="canvas-element">${name} (${el.id})</span>`;
    }).join(', ');

    return `<div class="bpmn-info"><i class="fas fa-link"></i> En el canvas: ${elementsList}</div>`;
  }

  generateEditForm(ppi) {
    // MEJORADO: Validar y proporcionar valores por defecto para evitar errores
    const safePPI = {
      id: ppi.id || 'Nuevo PPI',
      title: ppi.title || '',
      description: ppi.description || '',
      target: ppi.target || '',
      scope: ppi.scope || '',
      businessObjective: ppi.businessObjective || '',
      measureDefinition: ppi.measureDefinition || { type: 'derived', definition: '' },
      responsible: ppi.responsible || '',
      informed: ppi.informed || [],
      comments: ppi.comments || '',
      source: ppi.source || '',
      process: ppi.process || '',
      elementId: ppi.elementId || ''
    };
    
    // Validar que measureTypes existe
    const measureTypesObj = this.core.measureTypes || {};
    const measureTypes = Object.entries(measureTypesObj).map(([key, type]) => 
      `<option value="${key}" ${safePPI.measureDefinition.type === key ? 'selected' : ''}>${type.name}</option>`
    ).join('');

    return `
      <form id="edit-ppi-form" class="ppi-edit-form">
        <div class="ppi-form-header">
          <div class="ppi-id-info">
            <span class="ppi-id-label">PPI ID:</span>
            <span class="ppi-id-value">${safePPI.id}</span>
          </div>
        </div>

        <div class="form-tabs">
          <button type="button" class="tab-button active" data-tab="general">
            <i class="fas fa-info-circle"></i> General
          </button>
          <button type="button" class="tab-button" data-tab="measurement">
            <i class="fas fa-chart-bar"></i> Medición
          </button>
          <button type="button" class="tab-button" data-tab="targets">
            <i class="fas fa-bullseye"></i> Objetivos
          </button>
          <button type="button" class="tab-button" data-tab="responsibilities">
            <i class="fas fa-users"></i> Responsabilidades
          </button>
        </div>

        <div class="form-content">
          <!-- Tab: General -->
          <div class="tab-content active" data-tab="general">
              <div class="form-group required">
                <label for="edit-title">Título del PPI</label>
                <input type="text" id="edit-title" name="title" value="${ppi.title || ''}" required 
                       placeholder="Ej: Percentage of RFCs cancelled during holidays">
                <div class="field-help">Nombre descriptivo del indicador</div>
              </div>

              <div class="form-group">
                <label for="edit-process">Proceso</label>
                <input type="text" id="edit-process" name="process" value="${ppi.process || ''}"
                       placeholder="Ej: RFC-002: Improve customer satisfaction">
                <div class="field-help">Proceso de negocio asociado</div>
              </div>

              <div class="form-group">
                <label for="edit-business-objective">Process Goals</label>
                <textarea id="edit-business-objective" name="businessObjective" rows="2" 
                          placeholder="Objetivos del proceso...">${ppi.businessObjective || ''}</textarea>
                <div class="field-help">Objetivos que busca cumplir</div>
              </div>
            
          </div>

          <!-- Tab: Measurement -->
          <div class="tab-content" data-tab="measurement">
  
              <div class="form-group required">
                <label for="edit-measure-type">Tipo de Medida</label>
                <select id="edit-measure-type" name="measureType" required>
                  <option value="">Seleccionar...</option>
                  ${measureTypes}
                </select>
              </div>

              <div class="form-group required">
                <label for="edit-measure-definition">Measure (Definición)</label>
                <textarea id="edit-measure-definition" name="measureDefinition" rows="3" required
                          placeholder="Ej: Calculado como ξ * 100, donde c = RFCs cancelados y r = RFCs registrados">${ppi.measureDefinition.definition || ''}</textarea>
                <div class="field-help">Descripción técnica del cálculo</div>
              </div>

              <div class="form-group">
                <label for="edit-source">Source (Fuente)</label>
                <input type="text" id="edit-source" name="source" value="${ppi.source || ''}"
                       placeholder="Ej: Event logs, Sistema ERP...">
                <div class="field-help">Origen de los datos</div>
              </div>
          </div>

          <!-- Tab: Targets -->
          <div class="tab-content" data-tab="targets">
              <div class="form-group">
                <label for="edit-target">Target (Objetivo)</label>
                <input type="text" id="edit-target" name="target" value="${ppi.target || ''}" 
                       placeholder="Ej: Must be ≥ 90%">
                <div class="field-help">Valor objetivo del indicador</div>
                ${this.generateTargetScopeInfo(ppi, 'target')}
                <div id="target-validation-warning" class="field-warning" style="display: none;">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span>Vincula primero el Target en el diagrama para editarlo aquí</span>
                </div>
              </div>

              <div class="form-group">
                <label for="edit-scope">Scope (Alcance)</label>
                <input type="text" id="edit-scope" name="scope" value="${ppi.scope || ''}"
                       placeholder="Ej: Instancias en periodo de vacaciones">
                <div class="field-help">Qué instancias se consideran</div>
                ${this.generateTargetScopeInfo(ppi, 'scope')}
                <div id="scope-validation-warning" class="field-warning" style="display: none;">
                  <i class="fas fa-exclamation-triangle"></i>
                  <span>Vincula primero el Scope en el diagrama para editarlo aquí</span>
                </div>
              </div>
          
          </div>

          <!-- Tab: Responsibilities -->
          <div class="tab-content" data-tab="responsibilities">
              <div class="form-group">
                <label for="edit-responsible">Responsible (Responsable)</label>
                <input type="text" id="edit-responsible" name="responsible" value="${ppi.responsible || ''}"
                       placeholder="Ej: Planning and quality manager">
                <div class="field-help">Persona responsable del PPI</div>
              </div>

              <div class="form-group">
                <label for="edit-informed">Informed (Informados)</label>
                <input type="text" id="edit-informed" name="informed" 
                       value="${Array.isArray(ppi.informed) ? ppi.informed.join(', ') : ''}"
                       placeholder="Ej: CIO, Quality Manager (separados por comas)">
                <div class="field-help">Personas que reciben información</div>
              </div>

              <div class="form-group">
                <label for="edit-comments">Comments (Comentarios)</label>
                <textarea id="edit-comments" name="comments" rows="2"
                          placeholder="Observaciones adicionales...">${ppi.comments || ''}</textarea>
                <div class="field-help">Información adicional</div>
              </div>
            
          </div>
        </div>
      </form>
    `;
  }

  // === TAB NAVIGATION ===
  
  setupTabNavigation() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
      button.addEventListener('click', () => {
        const targetTab = button.getAttribute('data-tab');
        
        // Remover clase active de todos los botones y contenidos
        tabButtons.forEach(btn => btn.classList.remove('active'));
        tabContents.forEach(content => content.classList.remove('active'));
        
        // Añadir clase active al botón y contenido seleccionado
        button.classList.add('active');
        const targetContent = document.querySelector(`[data-tab="${targetTab}"].tab-content`);
        if (targetContent) {
          targetContent.classList.add('active');
        }
      });
    });
  }

  // === FORM VALIDATION ===
  
  setupFormValidation() {
    const form = document.getElementById('edit-ppi-form');
    if (!form) return;

    const inputs = form.querySelectorAll('input, textarea, select');
    inputs.forEach(input => {
      input.addEventListener('input', () => {
        this.validateField(input);
      });

      input.addEventListener('blur', () => {
        this.validateField(input);
      });
    });
  }

  validateField(field) {
    const isRequired = field.hasAttribute('required');
    const value = field.value.trim();
    
    // Remover clases de validación anteriores
    field.classList.remove('field-valid', 'field-invalid');
    
    if (isRequired && !value) {
      field.classList.add('field-invalid');
      this.showFieldError(field, 'Este campo es obligatorio');
    } else if (value) {
      field.classList.add('field-valid');
      this.hideFieldError(field);
    } else {
      this.hideFieldError(field);
    }
  }

  showFieldError(field, message) {
    this.hideFieldError(field); // Remover error existente
    
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    
    field.parentNode.appendChild(errorDiv);
  }

  hideFieldError(field) {
    const existingError = field.parentNode.querySelector('.field-error');
    if (existingError) {
      existingError.remove();
    }
  }

  // === TARGET AND SCOPE VALIDATION ===
  
  setupTargetScopeValidation(ppi) {
    const targetInput = document.getElementById('edit-target');
    const scopeInput = document.getElementById('edit-scope');
    const titleInput = document.getElementById('edit-title');
    const targetWarning = document.getElementById('target-validation-warning');
    const scopeWarning = document.getElementById('scope-validation-warning');
    
    if (!targetInput || !scopeInput || !titleInput) {
      return;
    }
    
    // Limpiar event listeners anteriores para evitar duplicados
    targetInput.removeEventListener('input', targetInput._syncHandler);
    scopeInput.removeEventListener('input', scopeInput._syncHandler);
    titleInput.removeEventListener('input', titleInput._syncHandler);
    
    // Verificar si el PPI tiene elementos Target y Scope vinculados
    const hasLinkedTarget = this.hasLinkedElement(ppi, 'PPINOT:Target');
    const hasLinkedScope = this.hasLinkedElement(ppi, 'PPINOT:Scope');
    
    // Configurar Target - SIEMPRE EDITABLE
    targetInput.disabled = false;
    targetInput.classList.remove('readonly-field');
    if (targetWarning) targetWarning.style.display = 'none';
    
    // Configurar Target - SIEMPRE EDITABLE
    targetInput.disabled = false;
    targetInput.classList.remove('readonly-field');
    if (targetWarning) targetWarning.style.display = 'none';
    
    // Configurar listener para actualizar diagrama cuando se cambie
    targetInput._syncHandler = () => {
      
      this.updateDiagramElement(ppi, 'PPINOT:Target', targetInput.value);
      // También actualizar el PPI en el core
      if (this.core && typeof this.core.updatePPI === 'function') {
        this.core.updatePPI(ppi.id, { target: targetInput.value, __source: 'form' });
        // Actualizar la tarjeta PPI específica inmediatamente
        this.forceUpdatePPICard(ppi.id);
        try {
          const registry = getServiceRegistry && getServiceRegistry();
          const autosave = registry ? registry.get('localStorageAutoSaveManager') : null;
          if (autosave && typeof autosave.forceSave === 'function') {
            autosave.forceSave();
          }
        } catch (e) {
          // ignore autosave errors
        }
      }
    };
    targetInput.addEventListener('input', targetInput._syncHandler);
    
    // Configurar Scope - SIEMPRE EDITABLE
    scopeInput.disabled = false;
    scopeInput.classList.remove('readonly-field');
    if (scopeWarning) scopeWarning.style.display = 'none';
    
    // Configurar listener para actualizar diagrama cuando se cambie
    scopeInput._syncHandler = () => {
      
      this.updateDiagramElement(ppi, 'PPINOT:Scope', scopeInput.value);
      // También actualizar el PPI en el core
      if (this.core && typeof this.core.updatePPI === 'function') {
        this.core.updatePPI(ppi.id, { scope: scopeInput.value, __source: 'form' });
        // Actualizar la tarjeta PPI específica inmediatamente
        this.forceUpdatePPICard(ppi.id);
        try {
          const registry = getServiceRegistry && getServiceRegistry();
          const autosave = registry ? registry.get('localStorageAutoSaveManager') : null;
          if (autosave && typeof autosave.forceSave === 'function') {
            autosave.forceSave();
          }
        } catch (e) {
          // ignore autosave errors
        }
      }
    };
    scopeInput.addEventListener('input', scopeInput._syncHandler);
    
    // Configurar Title - SIEMPRE EDITABLE
    titleInput.disabled = false;
    titleInput.classList.remove('readonly-field');
    
    // Configurar listener para actualizar diagrama cuando se cambie
    titleInput._syncHandler = () => {
      
      this.updateDiagramElement(ppi, 'PPINOT:PPINOT', titleInput.value);
      // También actualizar el PPI en el core
      if (this.core && typeof this.core.updatePPI === 'function') {
        this.core.updatePPI(ppi.id, { title: titleInput.value });
        // Actualizar la tarjeta PPI específica inmediatamente
        this.forceUpdatePPICard(ppi.id);
      }
    };
    titleInput.addEventListener('input', titleInput._syncHandler);
    
    // Mostrar información sobre elementos vinculados si existen
    if (hasLinkedTarget) {
      
    } else {
      console.log('⚠️ [setupTargetScopeValidation] No hay Target vinculado, pero el campo es editable');
    }
    
    if (hasLinkedScope) {
      
    } else {
      console.log('⚠️ [setupTargetScopeValidation] No hay Scope vinculado, pero el campo es editable');
    }
  }
  
  hasLinkedElement(ppi, elementType) {
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    
    if (!modeler || !ppi) return false;
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      
      
      
      // Buscar elementos vinculados del tipo especificado
      const linkedElements = elementRegistry.filter(element => {
        if (element.type !== elementType) return false;
        
        
        // Verificar si está vinculado a este PPI
        const parentElement = element.parent;
        if (!parentElement) {
          
          return false;
        }
        
        
        // Verificar si el padre es el PPI actual - MEJORADO
        let isLinked = false;
        
        // Verificar por ID del elemento padre
        if (parentElement.id === ppi.elementId) {
          isLinked = true;
          
        }
        
        // Verificar por nombre del businessObject del padre
        if (parentElement.businessObject && parentElement.businessObject.name === ppi.title) {
          isLinked = true;
          
        }
        
        // Verificar si el elemento padre es un PPINOT y coincide con el PPI
        if (parentElement.type === 'PPINOT:PPINOT' && 
            parentElement.businessObject && 
            parentElement.businessObject.name === ppi.title) {
          isLinked = true;
          
        }
        
        // Verificar si el elemento padre tiene el mismo ID que el PPI
        if (parentElement.id === ppi.id) {
          isLinked = true;
          
        }
        
        
        return isLinked;
      });
      
      
      return linkedElements.length > 0;
    } catch (error) {
      console.error('[hasLinkedElement] Error:', error);
      return false;
    }
  }
  
  updateDiagramElement(ppi, elementType, newValue) {
    // MEJORADO: Obtener modelador del nuevo sistema o fallback a window
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || 
                   (getServiceRegistry() && getServiceRegistry().get('BpmnModeler')) ||
                   (window.getServiceRegistry && window.getServiceRegistry().get('BpmnModeler'));
    
    if (!modeler || !ppi) {
      console.warn(`[updateDiagramElement] Modeler o PPI no disponible. Modeler: ${!!modeler}, PPI: ${!!ppi}`);
      return;
    }
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const eventBus = modeler.get('eventBus');
      
      
      
      // MEJORADO: Buscar el elemento vinculado del tipo especificado
      let linkedElement = null;
      
      // Primero, buscar por el elemento padre directo (PPI principal)
      if (ppi.elementId) {
        const parentElement = elementRegistry.get(ppi.elementId);
        if (parentElement) {
          
          // Buscar elementos hijos del tipo especificado
          const childElements = elementRegistry.filter(element => {
            return element.type === elementType && element.parent && element.parent.id === ppi.elementId;
          });
          
          if (childElements.length > 0) {
            linkedElement = childElements[0];
            
          }
        }
      }
      
      // Si no se encontró por elemento padre, buscar por nombre del PPI
      if (!linkedElement && ppi.title) {
        const elementsWithName = elementRegistry.filter(element => {
          return element.type === elementType && 
                 element.parent && 
                 element.parent.businessObject && 
                 element.parent.businessObject.name === ppi.title;
        });
        
        if (elementsWithName.length > 0) {
          linkedElement = elementsWithName[0];
          
        }
      }
      
      // Si aún no se encontró, buscar cualquier elemento del tipo especificado
      if (!linkedElement) {
        const allElementsOfType = elementRegistry.filter(element => element.type === elementType);
        
        if (allElementsOfType.length > 0) {
          linkedElement = allElementsOfType[0];
          
        }
      }
      
      if (linkedElement) {
        
        // Actualizar la etiqueta del elemento en el diagrama
        modeling.updateProperties(linkedElement, { name: newValue });
        
        // También actualizar el businessObject directamente para asegurar persistencia
        if (linkedElement.businessObject) {
          linkedElement.businessObject.name = newValue;
        }
        
        // Forzar actualización visual
        eventBus.fire('element.changed', { element: linkedElement });
        eventBus.fire('shape.changed', { element: linkedElement });
        
        
        // MEJORADO: Actualizar también el PPI en el core
        if (this.core && this.core.updatePPI) {
          const updateData = {};
          if (elementType === 'PPINOT:Target') updateData.target = newValue;
          if (elementType === 'PPINOT:Scope') updateData.scope = newValue;
          if (elementType === 'PPINOT:PPINOT') updateData.title = newValue;
          
          if (Object.keys(updateData).length > 0) {
            this.core.updatePPI(ppi.id, updateData);
            
          }
        }
      } else {
        console.warn(`⚠️ [updateDiagramElement] No se encontró elemento del tipo ${elementType} para actualizar`);
      }
    } catch (error) {
      console.error('[PPI-UI] Error updating PPI element:', error);
    }
  }

  // === DIAGRAM TO MODAL SYNCHRONIZATION ===
  
  // MEJORADO: Sincronizar cambios del formulario con el diagrama automáticamente
  setupFormToDiagramSync(ppi) {
    
    // Sincronizar título
    const titleInput = document.getElementById('edit-title');
    if (titleInput) {
      titleInput.addEventListener('input', (e) => {
        const newValue = e.target.value;
        
        this.updateDiagramElement(ppi, 'PPINOT:PPINOT', newValue);
        
        // Actualizar también el PPI en el core
        if (this.core && this.core.updatePPI) {
          this.core.updatePPI(ppi.id, { title: newValue, updatedAt: new Date().toISOString() });
        }
        
        // Forzar actualización de la tarjeta
        this.forceUpdatePPICard(ppi.id);
      });
    }
    
    // Sincronizar target
    const targetInput = document.getElementById('edit-target');
    if (targetInput) {
      targetInput.addEventListener('input', (e) => {
        const newValue = e.target.value;
        
        this.updateDiagramElement(ppi, 'PPINOT:Target', newValue);
        
        // Actualizar también el PPI en el core
        if (this.core && this.core.updatePPI) {
          this.core.updatePPI(ppi.id, { target: newValue, updatedAt: new Date().toISOString() });
        }
        
        // Forzar actualización de la tarjeta
        this.forceUpdatePPICard(ppi.id);
      });
    }
    
    // Sincronizar scope
    const scopeInput = document.getElementById('edit-scope');
    if (scopeInput) {
      scopeInput.addEventListener('input', (e) => {
        const newValue = e.target.value;
        
        this.updateDiagramElement(ppi, 'PPINOT:Scope', newValue);
        
        // Actualizar también el PPI en el core
        if (this.core && this.core.updatePPI) {
          this.core.updatePPI(ppi.id, { scope: newValue, updatedAt: new Date().toISOString() });
        }
        
        // Forzar actualización de la tarjeta
        this.forceUpdatePPICard(ppi.id);
      });
    }
  }
  
  // Función de debug para listar todos los elementos del diagrama
  debugDiagramElements() {
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    if (!modeler) return;
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      
      elementRegistry.forEach(element => {
        if (element.type && element.type.includes('PPINOT')) {
          
          if (element.parent) {
            
          } else {
            
          }
        }
      });
    } catch (error) {
      console.error('[DEBUG] Error listando elementos:', error);
    }
  }
  
  setupDiagramSync(ppi) {
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    
    if (!modeler || !ppi) {
      return;
    }
    
    try {
      const eventBus = modeler.get('eventBus');
      
      // Escuchar cambios en elementos del diagrama
      const diagramSyncHandler = (event) => {
        const element = event.element;
        if (!element) return;
        
        // Verificar si el elemento cambiado está relacionado con este PPI
        let isRelatedToPPI = false;
        
        if (element.parent) {
          isRelatedToPPI = element.parent.id === ppi.elementId ||
                          (element.parent.businessObject && element.parent.businessObject.name === ppi.title);
        } else if (element.id === ppi.elementId || 
                  (element.businessObject && element.businessObject.name === ppi.title)) {
          // El elemento es el PPI principal
          isRelatedToPPI = true;
        }
        
        if (!isRelatedToPPI) return;
        
        // Actualizar campos del modal según el tipo de elemento
        if (element.type === 'PPINOT:Target') {
          const targetInput = document.getElementById('edit-target');
          if (targetInput && targetInput.value !== element.businessObject.name) {
            targetInput.value = element.businessObject.name;
            // Actualizar PPI en el core
            if (this.core && typeof this.core.updatePPI === 'function') {
              this.core.updatePPI(ppi.id, { target: element.businessObject.name });
              // Actualizar la tarjeta PPI en la interfaz
              this.refreshPPIList();
            }
          }
        } else if (element.type === 'PPINOT:Scope') {
          const scopeInput = document.getElementById('edit-scope');
          if (scopeInput && scopeInput.value !== element.businessObject.name) {
            scopeInput.value = element.businessObject.name;
            // Actualizar PPI en el core
            if (this.core && typeof this.core.updatePPI === 'function') {
              this.core.updatePPI(ppi.id, { scope: element.businessObject.name });
              // Actualizar la tarjeta PPI en la interfaz
              this.refreshPPIList();
            }
          }
        } else if (element.type === 'PPINOT:PPINOT') {
          const titleInput = document.getElementById('edit-title');
          if (titleInput && titleInput.value !== element.businessObject.name) {
            titleInput.value = element.businessObject.name;
            // Actualizar PPI en el core
            if (this.core && typeof this.core.updatePPI === 'function') {
              this.core.updatePPI(ppi.id, { title: element.businessObject.name });
              // Actualizar la tarjeta PPI en la interfaz
              this.refreshPPIList();
            }
          }
        }
        
        // Si es un elemento nuevo vinculado, actualizar los campos correspondientes
        if (event.type === 'element.added' || event.type === 'create.end') {
          this.updateModalFieldsFromLinkedElements(ppi);
        }
      };
      
      // Registrar el handler para limpiarlo después
      this._diagramSyncHandler = diagramSyncHandler;
      
      // Escuchar eventos de cambio de elementos
      eventBus.on('element.changed', diagramSyncHandler);
      eventBus.on('shape.changed', diagramSyncHandler);
      eventBus.on('element.added', diagramSyncHandler);
      eventBus.on('element.removed', diagramSyncHandler);
      eventBus.on('create.end', diagramSyncHandler);
      eventBus.on('connect.end', diagramSyncHandler);
      
          } catch (error) {
        // Error silencioso para evitar spam
      }
  }
  
  cleanupDiagramSync() {
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    
    if (modeler && this._diagramSyncHandler) {
      try {
        const eventBus = modeler.get('eventBus');
        eventBus.off('element.changed', this._diagramSyncHandler);
        eventBus.off('shape.changed', this._diagramSyncHandler);
        eventBus.off('element.added', this._diagramSyncHandler);
        eventBus.off('element.removed', this._diagramSyncHandler);
        eventBus.off('create.end', this._diagramSyncHandler);
        eventBus.off('connect.end', this._diagramSyncHandler);
        this._diagramSyncHandler = null;
      } catch (error) {
        // Error silencioso para evitar spam
      }
        }
  }
  
  // Actualizar campos del modal basándose en elementos vinculados en el diagrama
  updateModalFieldsFromLinkedElements(ppi) {
    
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    if (!modeler) return;
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      
      // Buscar elementos Target vinculados
      const targetElements = elementRegistry.filter(element => {
        if (element.type !== 'PPINOT:Target') return false;
        
        const parentElement = element.parent;
        if (!parentElement) return false;
        
        // Verificar si el padre es el PPI actual - MEJORADO
        let isLinked = false;
        
        // Verificar por ID del elemento padre
        if (parentElement.id === ppi.elementId) {
          isLinked = true;
        }
        
        // Verificar por nombre del businessObject del padre
        if (parentElement.businessObject && parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre es un PPINOT y coincide con el PPI
        if (parentElement.type === 'PPINOT:PPINOT' && 
            parentElement.businessObject && 
            parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre tiene el mismo ID que el PPI
        if (parentElement.id === ppi.id) {
          isLinked = true;
        }
        
        return isLinked;
      });
      
      
      if (targetElements.length > 0) {
        const targetElement = targetElements[0];
        
        const targetInput = document.getElementById('edit-target');
        if (targetInput && targetElement.businessObject && targetElement.businessObject.name) {
          targetInput.value = targetElement.businessObject.name;
          if (this.core && typeof this.core.updatePPI === 'function') {
            this.core.updatePPI(ppi.id, { target: targetElement.businessObject.name });
            // Actualizar la tarjeta PPI en la interfaz
            this.refreshPPIList();
          }
        }
      }
      
      // Buscar elementos Scope vinculados
      const scopeElements = elementRegistry.filter(element => {
        if (element.type !== 'PPINOT:Scope') return false;
        
        const parentElement = element.parent;
        if (!parentElement) return false;
        
        // Verificar si el padre es el PPI actual - MEJORADO
        let isLinked = false;
        
        // Verificar por ID del elemento padre
        if (parentElement.id === ppi.elementId) {
          isLinked = true;
        }
        
        // Verificar por nombre del businessObject del padre
        if (parentElement.businessObject && parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre es un PPINOT y coincide con el PPI
        if (parentElement.type === 'PPINOT:PPINOT' && 
            parentElement.businessObject && 
            parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre tiene el mismo ID que el PPI
        if (parentElement.id === ppi.id) {
          isLinked = true;
        }
        
        return isLinked;
      });
      
      
      if (scopeElements.length > 0) {
        const scopeElement = scopeElements[0];
        
        const scopeInput = document.getElementById('edit-scope');
        if (scopeInput && scopeElement.businessObject && scopeElement.businessObject.name) {
          scopeInput.value = scopeElement.businessObject.name;
          if (this.core && typeof this.core.updatePPI === 'function') {
            this.core.updatePPI(ppi.id, { scope: scopeElement.businessObject.name });
            // Actualizar la tarjeta PPI en la interfaz
            this.refreshPPIList();
          }
        }
      }
      
      // Buscar elementos PPINOT vinculados (título)
      const titleElements = elementRegistry.filter(element => {
        if (element.type !== 'PPINOT:PPINOT') return false;
        
        const parentElement = element.parent;
        if (!parentElement) return false;
        
        // Verificar si el padre es el PPI actual - MEJORADO
        let isLinked = false;
        
        // Verificar por ID del elemento padre
        if (parentElement.id === ppi.elementId) {
          isLinked = true;
        }
        
        // Verificar por nombre del businessObject del padre
        if (parentElement.businessObject && parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre es un PPINOT y coincide con el PPI
        if (parentElement.type === 'PPINOT:PPINOT' && 
            parentElement.businessObject && 
            parentElement.businessObject.name === ppi.title) {
          isLinked = true;
        }
        
        // Verificar si el elemento padre tiene el mismo ID que el PPI
        if (parentElement.id === ppi.id) {
          isLinked = true;
        }
        
        return isLinked;
      });
      
      
      if (titleElements.length > 0) {
        const titleElement = titleElements[0];
        
        const titleInput = document.getElementById('edit-title');
        if (titleInput && titleElement.businessObject && titleElement.businessObject.name) {
          titleInput.value = titleElement.businessObject.name;
          if (this.core && typeof this.core.updatePPI === 'function') {
            this.core.updatePPI(ppi.id, { title: titleElement.businessObject.name });
            // Actualizar la tarjeta PPI en la interfaz
            this.refreshPPIList();
          }
        }
      }
      
    } catch (error) {
      // Error silencioso para evitar spam
    }
  }
  
  updateTabIndicators() {
    const tabButtons = document.querySelectorAll('.tab-button');
    
    // Definir campos por pestaña
    const tabFields = {
      general: {
        required: ['edit-title'],
        optional: ['edit-process', 'edit-business-objective']
      },
      measurement: {
        required: ['edit-measure-type', 'edit-measure-definition'],
        optional: ['edit-source']
      },
      targets: {
        required: [],
        optional: ['edit-target', 'edit-scope']
      },
      responsibilities: {
        required: [],
        optional: ['edit-responsible', 'edit-informed', 'edit-comments']
      }
    };
    
    tabButtons.forEach(button => {
      const tabName = button.getAttribute('data-tab');
      const tabData = tabFields[tabName];
      
      if (tabData) {
        let completedRequired = 0;
        let completedOptional = 0;

        // Contar campos requeridos completados
        tabData.required.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field && field.value.trim()) {
            completedRequired++;
          }
        });

        // Contar campos opcionales completados
        tabData.optional.forEach(fieldId => {
          const field = document.getElementById(fieldId);
          if (field && field.value.trim()) {
            completedOptional++;
          }
        });

        // Remover indicadores existentes
        const existingIndicator = button.querySelector('.tab-indicator');
        if (existingIndicator) {
          existingIndicator.remove();
        }

        // Añadir nuevo indicador
        const indicator = document.createElement('span');
        indicator.className = 'tab-indicator';
        
        const totalRequired = tabData.required.length;
        const hasRequiredFields = totalRequired > 0;
        
        if (hasRequiredFields && completedRequired === totalRequired) {
          // Todos los campos requeridos completados
          indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
          indicator.style.color = 'var(--success-color, #28a745)';
        } else if (!hasRequiredFields && completedOptional > 0) {
          // No hay campos requeridos pero hay opcionales completados
          indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
          indicator.style.color = 'var(--success-color, #28a745)';
        } else if (completedOptional > 0 || completedRequired > 0) {
          // Algunos campos completados pero no todos los requeridos
          indicator.innerHTML = '<i class="fas fa-clock"></i>';
          indicator.style.color = 'var(--warning-color, #ffc107)';
        } else {
          // Ningún campo completado
          indicator.innerHTML = '<i class="fas fa-circle"></i>';
          indicator.style.color = 'var(--text-muted, #6c757d)';
        }
        
        button.appendChild(indicator);
      }
    });
  }
  
  addImprovedStyles() {
    // Remover estilos existentes para forzar actualización
    const existingStyles = document.getElementById('ppi-improved-styles');
    if (existingStyles) {
      existingStyles.remove();
    }

    const styles = document.createElement('style');
    styles.id = 'ppi-improved-styles';
    styles.textContent = `
      /* Variables CSS para sistema de color y espaciado */
      :root {
        --ppi-primary: #3b82f6; /* azul más moderno acorde con app */
        --ppi-secondary: #667eea;
        --ppi-success: #43e97b;
        --ppi-warning: #f093fb;
        --ppi-danger: #ff6b6b;
        --ppi-info: #4facfe;
        
        --color-text-primary: #2c3e50;
        --color-text-secondary: #495057;
        --color-text-meta: #6c757d;
        --color-text-light: #868e96;
        
        --bg-white: #ffffff;
        --bg-light: #f8f9fa;
        --bg-muted: #e9ecef;
        --bg-dark: #343a40;
        
        --border-radius: 12px;
        --border-radius-sm: 6px;
        --border-radius-lg: 16px;
        
        --spacing-xs: 4px;
        --spacing-sm: 8px;
        --spacing-md: 12px;
        --spacing-lg: 16px;
        --spacing-xl: 20px;
        --spacing-xxl: 24px;
        
        --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.08);
        --shadow-md: 0 4px 6px rgba(0, 0, 0, 0.1);
        --shadow-lg: 0 8px 25px rgba(0, 0, 0, 0.12);
        --shadow-xl: 0 15px 35px rgba(0, 0, 0, 0.15);
        
        --transition-fast: 150ms ease;
        --transition-normal: 250ms ease;
        --transition-slow: 350ms ease;
      }

      /* No animations - instant display */

      /* Contenedor principal del panel PPI */
      #ppi-list {
        height: calc(100vh - 200px);
        overflow-y: auto;
        padding: var(--spacing-md);
        scroll-behavior: smooth;
      }

      /* Scrollbar personalizado */
      #ppi-list::-webkit-scrollbar {
        width: 8px;
      }

      #ppi-list::-webkit-scrollbar-track {
        background: var(--bg-light);
        border-radius: 4px;
      }

      #ppi-list::-webkit-scrollbar-thumb {
        background: var(--ppi-primary);
        border-radius: 4px;
      }

      #ppi-list::-webkit-scrollbar-thumb:hover {
        background: var(--ppi-secondary);
      }

      /* Card principal con diseño profesional */
      .ppi-card {
        background: var(--bg-white);
        border-radius: var(--border-radius);
        box-shadow: var(--shadow-sm);
        transition: box-shadow 0.3s ease, transform 0.3s ease;
        overflow: hidden;
        width: 100%;
        min-height: 150px;
        height: auto;
        margin-bottom: var(--spacing-md);
        position: relative;
        display: flex;
        flex-direction: column;
      }
      
      /* No animations for any cards */
      .ppi-card.new-card {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }

      /* Estados especiales de card */
      .ppi-card.has-bpmn-data {
        background: linear-gradient(135deg, #fafbff 0%, #f8f9fa 100%);
      }

      .ppi-card.needs-attention::after {
        content: '';
        position: absolute;
        top: var(--spacing-sm);
        right: var(--spacing-sm);
        width: 8px;
        height: 8px;
        background: var(--ppi-danger);
        border-radius: 50%;
        animation: pulse 2s infinite;
        z-index: 1001;
      }

      .ppi-card.active-working::after {
        content: '';
        position: absolute;
        top: var(--spacing-sm);
        right: var(--spacing-sm);
        width: 10px;
        height: 10px;
        background: var(--ppi-success) !important;
        border-radius: 50%;
        box-shadow: 0 0 8px rgba(67, 233, 123, 0.6);
        animation: glow 1.5s ease-in-out infinite alternate !important;
        z-index: 1001;
      }

      /* Estado activo tiene prioridad sobre needs-attention */
      .ppi-card.needs-attention.active-working::after {
        background: var(--ppi-success) !important;
        width: 10px !important;
        height: 10px !important;
        animation: none !important;
        box-shadow: 0 0 8px rgba(67, 233, 123, 0.6) !important;
        z-index: 1001;
      }

      /* Header de la card */
      .card-header {
        padding: var(--spacing-md);
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        border-bottom: 1px solid var(--bg-muted);
        background: linear-gradient(135deg, #fafbff 0%, #ffffff 100%);
        min-height: 70px;
        position: relative;
      }

      /* Selection indicator - punto en la esquina superior derecha */
      .selection-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
      }

      .selection-dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
        background-color: #dc3545 !important; /* Rojo por defecto */
        transition: all 0.3s ease;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
        border: 2px solid white;
        cursor: pointer;
        position: relative;
        z-index: 5;
      }

      /* Punto verde cuando está seleccionado - mayor especificidad */
      .ppi-card.selected .selection-dot {
        background-color: #28a745 !important; /* Verde cuando seleccionado */
        transform: scale(1.2) !important;
        box-shadow: 0 2px 6px rgba(40, 167, 69, 0.4) !important;
        border-color: white !important;
      }

      /* Efecto hover en el punto - solo cuando no está seleccionado */
      .ppi-card:not(.selected) .selection-dot:hover {
        transform: scale(1.1);
        box-shadow: 0 2px 4px rgba(220, 53, 69, 0.4);
      }

      /* Efecto hover cuando está seleccionado */
      .ppi-card.selected .selection-dot:hover {
        transform: scale(1.3);
        box-shadow: 0 3px 8px rgba(40, 167, 69, 0.6);
      }

      .type-indicator {
        width: 32px;
        height: 32px;
        border-radius: var(--border-radius-sm);
        background: var(--type-color, var(--ppi-secondary));
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 14px;
        flex-shrink: 0;
        box-shadow: var(--shadow-sm);
      }

      .header-content {
        flex: 1;
        min-width: 0;
        padding:2px;
      }

      .card-title {
        font-size: 14px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin-top: 10px;
        margin-bottom: 5px;
        line-height: 1.2;
        word-wrap: break-word;
        position: relative;
      }

      /* Asegurar que los títulos no tengan pseudo-elementos no deseados */
      .card-title::before,
      .card-title::after {
        display: none !important;
      }

      /* Prevenir pseudo-elementos no deseados en h3 elementos */
      .ppi-card h3::before,
      .ppi-card h3::after {
        display: none !important;
      }

      .meta-info {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        gap: var(--spacing-xs);
      
      }

    

      .badges-container {
        display: flex;
        flex-wrap: wrap;
      }

      .status-badge {
        display: inline-flex;
        align-items: center;
        gap: 3px;
        padding: 3px 7px;
        border-radius: var(--border-radius-sm);
        font-size: 9px;
        font-weight: 700;
        margin-top: 5px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        opacity: 0.85;
      }

      .status-badge.linked {
        background: rgba(67, 97, 238, 0.08);
        color: var(--ppi-primary);
        border: 1px solid rgba(67, 97, 238, 0.2);
      }

      .status-badge.synced {
        background: rgba(34, 139, 34, 0.08);
        color: #228b22;
        border: 1px solid rgba(34, 139, 34, 0.2);
      }

      .status-badge.complete {
        background: rgba(40, 167, 69, 0.1);
        color: #28a745;
        border: 1px solid rgba(40, 167, 69, 0.3);
      }

      .status-badge.incomplete {
        background: rgba(255, 193, 7, 0.1);
        color: #e67e22;
        border: 1px solid rgba(255, 193, 7, 0.3);
      }

      /* Panel de acciones */
      .actions-panel {
        display: flex;
        gap: var(--spacing-xs);
        flex-shrink: 0;
      }

      .icon-btn {
        width: 26px;
        height: 26px;
        border: none;
        border-radius: var(--border-radius-sm);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all var(--transition-fast);
        font-size: 12px;
      }

      .icon-btn.primary {
        background: #ffffff;
        color: var(--ppi-primary);
        border: 1px solid #e5e7eb;
      }

      .icon-btn.secondary {
        background: rgba(108, 117, 125, 0.1);
        color: var(--color-text-meta);
      }

      .icon-btn.danger {
        background: rgba(255, 107, 107, 0.1);
        color: var(--ppi-danger);
      }

      .icon-btn:hover {
        transform: scale(1.05);
      }

      .icon-btn.primary:hover {
        background: #f3f4f6;
        color: var(--ppi-primary);
      }

      .icon-btn.secondary:hover {
        background: var(--color-text-meta);
        color: white;
      }

      .icon-btn.danger:hover {
        background: var(--ppi-danger);
        color: white;
      }

      /* Cuerpo de la card */
      .card-body {
        padding: var(--spacing-md);
        flex: 1;
        display: flex;
        flex-direction: column;
      }

      /* Información esencial en líneas compactas */
      .essential-info {
        display: flex;
        flex-direction: column;
        gap: var(--spacing-xs);
      }

      .info-line {
        display: flex;
        align-items: center;
        gap: var(--spacing-md);
        line-height: 1.3;
        flex-wrap: wrap;
      }

      .info-line.primary {
        font-size: 12px;
        margin-bottom: var(--spacing-lg);
        background: rgba(67, 97, 238, 0.05);
        padding: var(--spacing-md);
        border-radius: var(--border-radius-sm);
        border: 1px solid rgba(67, 97, 238, 0.1);
      }

      .info-line.secondary {
        font-size: 12px;
        color: var(--color-text-secondary);
      }

      .info-line.description {
        font-size: 11px;
        color: var(--color-text-meta);
        font-style: italic;
        margin-top: var(--spacing-xs);
        padding-top: var(--spacing-xs);
        border-top: 1px solid var(--bg-muted);
      }

      .field-group {
        display: flex;
        align-items: center;
        gap: 6px;
        min-height: 20px;
        flex: 1;
        min-width: 0;
      }

      .field-icon {
        font-size: 13px;
        color: var(--ppi-primary);
        margin-top: 1px;
        flex-shrink: 0;
        width: 15px;
        text-align: center;
        opacity: 0.9;
      }

      .field-content {
        flex: 1;
        min-width: 0;
      }

      .field-value {
        font-size: 10px;
        line-height: 1.4;
        color: var(--text-color);
        hyphens: auto;
      }

      .target-value, .scope-value .responsible-value {
        font-weight: 700;
        color: var(--color-text-primary);
        font-size: 12px;
        letter-spacing: -0.01em;
      }

   

      .description-value {
        font-weight: 400;
        color: var(--text-color-muted);
        font-size: 10px;
        line-height: 1.5;
      }

      .field-separator {
        color: var(--color-text-meta);
        margin: 0 var(--spacing-xs);
      }

      .field-label {
        font-weight: 600;
        color: var(--color-text-meta);
        font-size: 9px;
        text-transform: capitalize;
        letter-spacing: 0.05em;
        opacity: 0.8;
        margin-right: 2px;
      }

      .field-value {
        color: var(--color-text-secondary);
        font-weight: 500;
        display: inline-flex;
        align-items: center;
        gap: var(--spacing-xs);
      }

      .field-value.bpmn-sourced {
        color: var(--color-text-secondary);
        font-weight: 600;
      }

      .field-value.description-text {
        font-weight: 400;
        line-height: 1.4;
      }

      /* Icon-specific styling */
      .target-group .field-icon {
        color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .scope-group .field-icon {
        color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .responsible-group .field-icon {
         color: var(--ppi-primary);
        font-weight: 700;
        font-size: 13px;
      }

      .description-group .field-icon {
        color: #f39c12;
        font-weight: 500;
      }

      /* Enhanced typography for better hierarchy */
      .target-group, .scope-group, .responsible-group {
        background: transparent;
        padding: 0;
        border-radius: 0;
        border: none;
        margin-bottom: 0;
      }

      .target-group .target-value,
      .scope-group .scope-value,
      .responsible-group .responsible-value {
        text-shadow: none;
      }

      /* Responsive Design */
      @media (max-width: 420px) {
        .ppi-card {
          width: 100%;
          min-height: 100px;
        }
        
        .info-line.primary {
          flex-direction: column;
          align-items: flex-start;
          gap: var(--spacing-xs);
        }

        .field-group {
          width: 100%;
        }
        
        .card-header {
          padding: var(--spacing-sm);
        }

        .type-indicator {
          width: 28px;
          height: 28px;
          font-size: 12px;
        }

        .card-title {
          font-size: 13px;
        }
      }

      /* Estados vacíos mejorados */
      .empty-state {
        text-align: center;
        padding: var(--spacing-xxl);
        color: var(--color-text-meta);
      }

      .empty-icon {
        font-size: 48px;
        color: var(--bg-muted);
        margin-bottom: var(--spacing-lg);
      }

      .empty-state h3 {
        color: var(--color-text-secondary);
        font-weight: 600;
        margin-bottom: var(--spacing-sm);
      }

      .empty-state p {
        color: var(--color-text-light);
        line-height: 1.5;
        max-width: 300px;
        margin: 0 auto;
      }

      /* Accesibilidad */
      .ppi-card:focus-within {
        outline: 2px solid var(--ppi-primary);
        outline-offset: 2px;
      }

      .icon-btn:focus {
        outline: none;
        box-shadow: 0 0 0 2px var(--ppi-primary);
      }

      /* Animaciones de entrada escalonadas */
      .ppi-card:nth-child(1) { animation-delay: 0ms; }
      .ppi-card:nth-child(2) { animation-delay: 100ms; }
      .ppi-card:nth-child(3) { animation-delay: 200ms; }
      .ppi-card:nth-child(4) { animation-delay: 300ms; }
      .ppi-card:nth-child(5) { animation-delay: 400ms; }
      .ppi-card:nth-child(n+6) { animation-delay: 500ms; }

      /* Scroll suave para contenido largo */
      .ppi-list {
        scroll-behavior: smooth;
      }

      /* Eliminar TODOS los tooltips nativos del navegador */
      .ppi-card *[title],
      .ppi-card *::after,
      .ppi-card *::before {
        title: none !important;
      }
      
      .ppi-card * {
        title: none !important;
      }

      /* Optimización para alta densidad de información */
      .ppi-card .data-item:nth-child(n+7) {
        display: none;
      }

      .ppi-card:hover .data-item:nth-child(n+7) {
        display: block;
        animation: none !important;
      }

      /* Anti-flicker styles */
      .ppi-card {
        will-change: auto;
        backface-visibility: hidden;
        transform: translateZ(0);
        animation: none !important;
        transition: none !important;
      }

      .ppi-card, .ppi-card * {
        opacity: 1 !important;
        visibility: visible !important;
        animation: none !important;
        transition: none !important;
        transform: none !important;
      }

      /* Disable all animations and transitions globally for PPI cards */
      .ppi-card.updating {
        animation: none !important;
        transition: none !important;
      }

      .ppi-card.updating * {
        animation: none !important;
        transition: none !important;
      }

      /* Smooth list container - no animations */
      #ppi-list {
        will-change: auto;
        transform: translateZ(0);
      }

      /* Remove any fadeIn animations */
      .ppi-card.new-card {
        animation: none !important;
        opacity: 1 !important;
        transform: none !important;
      }

      /* Disable hover effects that might cause movement */
      .ppi-card:hover {
        transform: none !important;
        animation: none !important;
      }

      /* Selected PPI state - highlight when selected in canvas (suavizado) */
      .ppi-card.selected {
        border: 2px solid #4361ee !important;
        background: linear-gradient(135deg, #f8f9ff 0%, #fcfdff 100%) !important;
        box-shadow: 0 2px 8px rgba(67, 97, 238, 0.15) !important;
        transform: none !important;
        position: relative;
      }

      .ppi-card.selected::before {
        content: '';
        position: absolute;
        top: -2px;
        left: -2px;
        right: -2px;
        bottom: -2px;
        background: linear-gradient(45deg, rgba(67, 97, 238, 0.1), rgba(102, 126, 234, 0.1));
        border-radius: inherit;
        z-index: -1;
      }

      .ppi-card.selected .card-header {
        background: linear-gradient(135deg, #f8f9ff 0%, #ffffff 100%);
        border-bottom-color: rgba(67, 97, 238, 0.3);
      }

      .ppi-card.selected .card-title {
        color: #4361ee;
        font-weight: 600;
      }

      /* Hover effect for clickable cards */
      .ppi-card:hover {
        transform: none !important;
        animation: none !important;
        border-color: #dee2e6 !important;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1) !important;
        cursor: pointer;
      }

      .ppi-card:hover:not(.selected) {
        background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%) !important;
      }

      /* Sync status indicator styles */
      #ppi-sync-status {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        background: linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%);
        border: 1px solid #c3e6c3;
        border-radius: 6px;
        font-size: 0.9em;
      }

      .sync-indicator {
        display: flex;
        align-items: center;
        margin-left: auto;
      }

      .sync-dot {
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: #28a745;
        animation: pulse-sync 2s infinite;
      }

      @keyframes pulse-sync {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.6; }
      }

      /* Selection indicator for individual PPIs */
      .selection-indicator {
        position: absolute;
        top: 8px;
        right: 8px;
        z-index: 10;
      }

      /* Sync disabled state */
      .sync-disabled .sync-dot {
        background: #dc3545;
        animation: none;
      }

      .sync-warning .sync-dot {
        background: #ffc107;
      }
    `;

    document.head.appendChild(styles);
  }

  addModalStyles() {
    if (document.getElementById('ppi-modal-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'ppi-modal-styles';
    styles.textContent = `
      .ppi-modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.6);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 10000;
        backdrop-filter: blur(3px);
      }

      .ppi-modal {
        background: #ffffff;
        border-radius: 12px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.25);
        max-width: 90vw;
        max-height: 90vh;
        overflow: hidden;
        display: flex;
        flex-direction: column;
        min-width: 800px;
      }

      .ppi-modal-header {
        background: #f8fafc; /* neutro claro, sin azul intenso */
        color:rgb(46, 46, 46);
        padding: 16px 24px;
        display: flex;
        margin-top: 5px;
        justify-content: space-between;
        align-items: center;
   
        
      }

      .ppi-modal-header .header-left {
        display: flex;
        align-items: stretch;
        gap: 12px;
      }

      .ppi-modal-header .type-indicator {
        width: 36px;
        height: 36px;
        border-radius: 8px;
        background: rgba(58,86,212,0.12); /* suave */
        color: #3a56d4;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .ppi-modal-header .subtitle {
        margin: 2px 0 0 0;
        font-size: 0.85rem;
        opacity: 0.9;
      }

      .ppi-modal-header h3 {
        margin: 0;
        font-size: 1.4rem;
        font-weight: 600;
      }

      .ppi-modal-close {
        background: none;
        border: none;
        color: #334155;
        font-size: 1.1rem;
        cursor: pointer;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s;
      }

      .ppi-modal-close:hover {
        background: rgba(15, 23, 42, 0.06);
      }

      .ppi-modal-body {
        overflow-y: auto;
        flex: 1;
        padding: 0 24px 16px 24px;
      }

      .ppi-modal-footer {
        padding: 16px 24px;
        border-top: 1px solid #e5e7eb;
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        background: #ffffff;
        align-items: stretch;
      }

      .ppi-modal .btn { width: auto; display: inline-flex; align-items: center; justify-content: center; padding: 10px 16px; border-radius: 8px; border: 1px solid transparent; height: 40px; min-width: 160px; line-height: 1; }
      .ppi-modal .btn-primary { background: linear-gradient(135deg, var(--ppi-primary) 0%, #764ba2 100%); color: #fff; border-color: transparent; }
      .ppi-modal .btn-primary:hover { background: linear-gradient(135deg, #2563eb 0%, #6d28d9 100%); }
      .ppi-modal .btn-secondary { background: #fff; color: #111827; border: 1px solid #d1d5db; }
      .ppi-modal .btn-secondary:hover { background: #f3f4f6; }

      .ppi-detail-grid, .form-grid {
        display: grid;
        grid-template-columns: 1fr; /* vertical, a una columna */
        gap: 16px;
      }

      .detail-section, .form-section {
        background: #f8f9fa;
        border-radius: 8px;
        padding: 20px;
        border-left: 4px solid #667eea;
      }

      .detail-section h4, .form-section h4 {
        margin: 0 0 15px 0;
        color: #333;
        font-size: 1.1rem;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .detail-item {
        margin-bottom: 12px;
        padding: 8px 0;
        border-bottom: 1px solid #e9ecef;
      }

      .detail-item:last-child {
        border-bottom: none;
        margin-bottom: 0;
      }

      .detail-item strong {
        color: #495057;
        display: inline-block;
        min-width: 120px;
      }

      .form-group {
        margin-bottom: 20px;
      }

      .form-group label {
        display: block;
        margin-bottom: 6px;
        font-weight: 600;
        color: #495057;
      }

      .form-group input,
      .form-group select,
      .form-group textarea {
        width: 100%;
        padding: 10px 12px;
        border: 2px solid #e9ecef;
        border-radius: 6px;
        font-size: 14px;
        transition: border-color 0.2s, box-shadow 0.2s;
        box-sizing: border-box;
      }

      .form-group input:focus,
      .form-group select:focus,
      .form-group textarea:focus {
        border-color: #667eea;
        box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
        outline: none;
      }

      .form-group input::placeholder {
        color: #6c757d;
        font-style: italic;
      }

      .btn {
        padding: 10px 20px;
        border: none;
        border-radius: 6px;
        font-weight: 600;
        text-decoration: none;
        cursor: pointer;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .btn-primary {
        background: var(--ppi-primary);
        color: white;
        min-width: 160px;
      }

      .btn-primary:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
      }

      .btn-secondary {
        background: #ffffff;
        color: #111827;
        border: 1px solid #d1d5db;
      }

      .btn-secondary:hover { background: #f3f4f6; }

      /* Forzar contenido vertical */
      .tab-content { display: flex; flex-direction: column; gap: 16px; }

      /* Tabs con degradado consistente */
      .form-tabs { display: flex; gap: 8px; padding: 12px 0 0 0; position: sticky; top: 0;; z-index: 1; border: none !important; }
      .tab-button {background: #ffffff; color: #374151; border-radius: 8px; padding: 10px 14px; font-weight: 600; display: inline-flex; align-items: center; gap: 8px; cursor: pointer; transition: background .2s, border-color .2s, color .2s; }
      .tab-button:hover { background: #ffffff !important; border-color: #cbd5e1 !important; color: #374151 !important; box-shadow: none !important; }
      .tab-button.active { color: #fff; border-color: transparent; background: linear-gradient(135deg, var(--ppi-primary) 0%, #764ba2 100%); box-shadow: 0 2px 10px rgba(59,130,246,0.25); }
      .tab-button.active:hover { background: linear-gradient(135deg, var(--ppi-primary) 0%, #764ba2 100%) !important; color: #ffffff !important; box-shadow: 0 2px 10px rgba(59,130,246,0.25) !important; }
      .tab-indicator { margin-left: 6px; font-size: 12px; }
    `;

    document.head.appendChild(styles);
  }

  // === MESSAGE DISPLAY ===
  
  showSuccessMessage(message) {
    this.showMessage(message, 'success');
  }

  showWarningMessage(message) {
    this.showMessage(message, 'warning');
  }

  showMessage(message, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.textContent = message;
    
    let backgroundColor;
    switch(type) {
      case 'success':
        backgroundColor = '#28a745';
        break;
      case 'warning':
        backgroundColor = '#ffc107';
        break;
      default:
        backgroundColor = '#dc3545';
    }
    
    messageDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: ${type === 'warning' ? '#212529' : 'white'};
      font-weight: bold;
      z-index: 10000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
      background-color: ${backgroundColor};
    `;
    
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // === UTILITY METHODS ===
  
  loadPPIs() {
    this.core.loadPPIs();
  }

  updateStatistics() {
    const stats = this.core.getStatistics();
    
    const totalElement = document.getElementById('total-ppis');
    const linkedElement = document.getElementById('linked-ppis');
    const timeElement = document.getElementById('time-measures');

    if (totalElement) totalElement.textContent = stats.total;
    if (linkedElement) linkedElement.textContent = stats.linked;
    if (timeElement) timeElement.textContent = stats.timeMeasures;
  }

  // NUEVO: Forzar actualización de una card específica
  forceUpdatePPICard(ppiId) {
    
    const container = document.getElementById('ppi-list');
    if (!container) {
      
      return;
    }
    
    const ppiElement = container.querySelector(`[data-ppi-id="${ppiId}"]`);
    if (!ppiElement) {
      
      return;
    }
    
    const ppi = this.core.ppis.find(p => p.id === ppiId);
    if (!ppi) {
      
      return;
    }
    
    
    // MEJORADO: Actualizar también desde el diagrama si es necesario
    this.updatePPIFromDiagram(ppi);
    
    // Actualizar la tarjeta
    this.updatePPIElement(ppiElement, ppi);
  }
  
  // MEJORADO: Método para actualizar PPI desde el diagrama
  updatePPIFromDiagram(ppi) {
    if (!ppi || !ppi.elementId) {
      console.log(`[updatePPIFromDiagram] PPI sin elementId, saltando actualización desde diagrama`);
      return;
    }
    
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || 
                   (getServiceRegistry() && getServiceRegistry().get('BpmnModeler')) ||
                   (window.getServiceRegistry && window.getServiceRegistry().get('BpmnModeler'));
    
    if (!modeler) {
      console.log(`[updatePPIFromDiagram] Modeler no disponible`);
      return;
    }
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const parentElement = elementRegistry.get(ppi.elementId);
      
      if (!parentElement) {
        console.log(`[updatePPIFromDiagram] Elemento padre ${ppi.elementId} no encontrado en el diagrama`);
        return;
      }
      
      // Buscar elementos Target y Scope vinculados
      const childElements = elementRegistry.filter(element => {
        return element.parent && element.parent.id === ppi.elementId;
      });
      
      let hasChanges = false;
      const updateData = {};
      
      childElements.forEach(element => {
        if (element.type === 'PPINOT:Target' && element.businessObject && element.businessObject.name) {
          if (ppi.target !== element.businessObject.name) {
            updateData.target = element.businessObject.name;
            hasChanges = true;
            console.log(`[updatePPIFromDiagram] Target actualizado: ${element.businessObject.name}`);
          }
        }
        
        if (element.type === 'PPINOT:Scope' && element.businessObject && element.businessObject.name) {
          if (ppi.scope !== element.businessObject.name) {
            updateData.scope = element.businessObject.name;
            hasChanges = true;
            console.log(`[updatePPIFromDiagram] Scope actualizado: ${element.businessObject.name}`);
          }
        }
      });
      
      // Actualizar el título si cambió en el diagrama
      if (parentElement.businessObject && parentElement.businessObject.name && 
          ppi.title !== parentElement.businessObject.name) {
        updateData.title = parentElement.businessObject.name;
        hasChanges = true;
        console.log(`[updatePPIFromDiagram] Título actualizado: ${parentElement.businessObject.name}`);
      }
      
      if (hasChanges && this.core && this.core.updatePPI) {
        updateData.updatedAt = new Date().toISOString();
        this.core.updatePPI(ppi.id, updateData);
        
      }
    } catch (error) {
      console.error(`[updatePPIFromDiagram] Error actualizando PPI desde diagrama:`, error);
    }
  }

  // Throttle function to limit frequency of updates
  throttle(callback, delay) {
    let lastCall = 0;
    return function(...args) {
      const now = new Date().getTime();
      if (now - lastCall < delay) {
        return;
      }
      lastCall = now;
      return callback(...args);
    };
  }
  
  // NUEVO: Actualizar todas las cards que tengan cambios
  updateChangedCards() {
    // Use throttled version of this function
    if (!this._throttledUpdateCards) {
      this._throttledUpdateCards = this.throttle(() => {
        this._updateChangedCardsImpl();
      }, 5000); // Only update every 5 seconds at most to prevent flickering
    }
    
    this._throttledUpdateCards();
  }
  
  _updateChangedCardsImpl() {
    const container = document.getElementById('ppi-list');
    if (!container) return;

    const cards = container.querySelectorAll('.ppi-card[data-ppi-id]');
    
    cards.forEach(card => {
      const ppiId = card.getAttribute('data-ppi-id');
      const ppi = this.core.ppis.find(p => p.id === ppiId);
      
      if (ppi) {
        const storedData = card.getAttribute('data-ppi-data') || '';
        const currentData = JSON.stringify({
          title: ppi.title,
          target: ppi.target,
          scope: ppi.scope,
          responsible: ppi.responsible,
          businessObjective: ppi.businessObjective,
          updatedAt: ppi.updatedAt
        });
        
        if (storedData !== currentData) {
          // Prevenir parpadeo manteniendo la visibilidad durante la actualización
          const originalDisplay = card.style.display;
          
          // Forzar que el elemento se mantenga visible
          card.style.visibility = 'visible';
          card.style.opacity = '1';
          card.style.display = originalDisplay || 'block';
          
          // Actualizar el contenido sin animaciones
          const originalTransition = card.style.transition;
          card.style.transition = 'none';
          
          this.updatePPIElement(card, ppi);
          card.setAttribute('data-ppi-data', currentData);
          
          // Restaurar las propiedades después de un breve delay
          setTimeout(() => {
            card.style.transition = originalTransition;
          }, 16); // Un frame a 60fps
        }
      }
    });
  }  // === ACTIVE WORKING STATE MANAGEMENT ===
  
  setActivePPI(elementId) {
    // Limpiar todos los estados activos anteriores
    this.clearAllActivePPIs();
    
    // Encontrar el PPI asociado al elemento
    const ppi = this.findPPIByElement(elementId);
    if (!ppi) return;
    
    // Marcar la card como activa
    this.markPPICardAsActive(ppi.id);
    
  }
  
  clearAllActivePPIs() {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    const activeCards = container.querySelectorAll('.ppi-card.active-working');
    activeCards.forEach(card => {
      card.classList.remove('active-working');
    });
  }
  
  markPPICardAsActive(ppiId) {
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    const ppiCard = container.querySelector(`[data-ppi-id="${ppiId}"]`);
    if (ppiCard) {
      ppiCard.classList.add('active-working');
      
      // Añadir efecto visual de activación
      ppiCard.style.transition = 'all 0.3s ease';
      ppiCard.style.transform = 'scale(1.02)';
      setTimeout(() => {
        ppiCard.style.transform = 'scale(1)';
      }, 300);
    }
  }
  
  findPPIByElement(elementId) {
    // Buscar por elementId directo
    let ppi = this.core.ppis.find(p => p.elementId === elementId);
    if (ppi) return ppi;
    
    // Buscar por elementos padre de PPIs hijo (Target, Scope, etc.)
    // Obtener modelador del nuevo sistema o fallback a window
    const modeler = (this.adapter && this.adapter.getBpmnModeler()) || (getServiceRegistry() && getServiceRegistry().get('BpmnModeler'));
    
    if (modeler) {
      try {
        const elementRegistry = modeler.get('elementRegistry');
        const element = elementRegistry.get(elementId);
        
        if (element && element.parent) {
          // Si es un elemento hijo PPI, buscar por el padre
          const parentElement = element.parent;
          ppi = this.core.ppis.find(p => p.elementId === parentElement.id);
          if (ppi) return ppi;
          
          // También buscar por nombre del padre
          if (parentElement.businessObject && parentElement.businessObject.name) {
            ppi = this.core.ppis.find(p => p.title === parentElement.businessObject.name);
            if (ppi) return ppi;
          }
        }
      } catch (error) {
        console.error('Error finding PPI by element:', error);
      }
    }
    
    return null;
  }

  // === PPI SELECTION MANAGEMENT ===
  
  /**
   * Marca un PPI como seleccionado en la lista
   * @param {string} ppiId - ID del PPI a seleccionar
   */
  selectPPI(ppiId) {
    console.log(`🟢 [PPI-UI] Seleccionando PPI: ${ppiId}`);
    
    // Primero deseleccionar todos los PPIs
    this.clearPPISelection();
    
    const container = document.getElementById('ppi-list');
    if (!container) {
      console.warn('🟢 [PPI-UI] Container ppi-list no encontrado');
      return;
    }
    
    const ppiCard = container.querySelector(`.ppi-card[data-ppi-id="${ppiId}"]`);
    if (ppiCard) {
      console.log(`🟢 [PPI-UI] Tarjeta PPI encontrada, añadiendo clase selected`);
      ppiCard.classList.add('selected');
      
      // Actualizar el indicador visual
      const selectionIndicator = ppiCard.querySelector('.selection-dot');
      if (selectionIndicator) {
        console.log(`🟢 [PPI-UI] Actualizando punto de selección a verde`);
        console.log(`🟢 [PPI-UI] Punto actual - color:`, selectionIndicator.style.backgroundColor);
        
        // Remove any existing classes and styles
        selectionIndicator.className = 'selection-dot';
        selectionIndicator.style.removeProperty('background');
        selectionIndicator.style.removeProperty('background-color');
        
        // Add selected state
        selectionIndicator.classList.add('selected');
        selectionIndicator.style.backgroundColor = '#28a745';
        selectionIndicator.style.transform = 'scale(1.2)';
        selectionIndicator.style.boxShadow = '0 2px 6px rgba(40, 167, 69, 0.4)';
        selectionIndicator.style.border = '2px solid #fff';
        
        console.log(`🟢 [PPI-UI] Punto después - color:`, selectionIndicator.style.backgroundColor);
        console.log(`🟢 [PPI-UI] Punto después - classes:`, selectionIndicator.className);
      } else {
        console.warn(`🟢 [PPI-UI] Punto de selección no encontrado para PPI: ${ppiId}`);
        // Let's check if the dot exists at all
        const allDots = ppiCard.querySelectorAll('.selection-dot, .selection-indicator');
        console.log(`🟢 [PPI-UI] Dots found in card:`, allDots.length);
        allDots.forEach((dot, index) => {
          console.log(`🟢 [PPI-UI] Dot ${index}:`, dot.className, dot);
        });
      }
      
      // Scroll suave hacia el elemento seleccionado
      ppiCard.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
        inline: 'nearest'
      });
      
      console.log(`🟢 PPI seleccionado en la lista: ${ppiId}`);
    } else {
      console.warn(`🟢 [PPI-UI] Tarjeta PPI no encontrada para ID: ${ppiId}`);
      // Debug: let's see what cards exist
      const allCards = container.querySelectorAll('.ppi-card');
      console.log(`🟢 [PPI-UI] Total cards found:`, allCards.length);
      allCards.forEach((card, index) => {
        console.log(`🟢 [PPI-UI] Card ${index} ID:`, card.getAttribute('data-ppi-id'));
      });
    }
  }
  
  /**
   * Deselecciona todos los PPIs en la lista
   */
  clearPPISelection() {
    // Optimización: Log eliminado para mejorar rendimiento
    
    
    const container = document.getElementById('ppi-list');
    if (!container) return;
    
    const selectedCards = container.querySelectorAll('.ppi-card.selected');
    // Optimización: Log eliminado para mejorar rendimiento
    
    
    selectedCards.forEach(card => {
      card.classList.remove('selected');
      
      // Resetear el indicador visual
      const selectionIndicator = card.querySelector('.selection-dot');
      if (selectionIndicator) {
        console.log(`🔴 [PPI-UI] Restableciendo punto de selección a rojo`);
        
        // Remove any existing classes and styles
        selectionIndicator.classList.remove('selected');
        selectionIndicator.style.removeProperty('background');
        selectionIndicator.style.removeProperty('background-color');
        
        // Reset to red state
        selectionIndicator.style.backgroundColor = '#dc3545';
        selectionIndicator.style.transform = 'scale(1)';
        selectionIndicator.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.2)';
        selectionIndicator.style.border = '1px solid #fff';
      }
    });
  }
  
  /**
   * Obtiene el PPI actualmente seleccionado
   * @returns {string|null} ID del PPI seleccionado o null si no hay ninguno
   */
  getSelectedPPI() {
    const container = document.getElementById('ppi-list');
    if (!container) return null;
    
    const selectedCard = container.querySelector('.ppi-card.selected');
    return selectedCard ? selectedCard.getAttribute('data-ppi-id') : null;
  }
  
  /**
   * Verifica si un PPI está seleccionado
   * @param {string} ppiId - ID del PPI a verificar
   * @returns {boolean} true si está seleccionado, false en caso contrario
   */
  isPPISelected(ppiId) {
    const container = document.getElementById('ppi-list');
    if (!container) return false;
    
    const ppiCard = container.querySelector(`.ppi-card[data-ppi-id="${ppiId}"]`);
    return ppiCard ? ppiCard.classList.contains('selected') : false;
  }

  // === SYNC STATUS MANAGEMENT ===
  
  /**
   * Actualiza el estado del indicador de sincronización
   * @param {string} status - 'active', 'warning', 'disabled'
   * @param {string} message - Mensaje a mostrar
   */
  updateSyncStatus(status = 'active', message = 'Sincronización automática activa') {
    const syncStatusElement = document.getElementById('ppi-sync-status');
    const syncTextElement = document.getElementById('sync-status-text');
    const syncIndicator = document.getElementById('sync-indicator');
    
    if (syncTextElement) {
      syncTextElement.textContent = message;
    }
    
    if (syncStatusElement && syncIndicator) {
      // Remover clases previas
      syncStatusElement.classList.remove('sync-disabled', 'sync-warning');
      
      switch (status) {
        case 'active':
          syncStatusElement.style.background = 'linear-gradient(135deg, #e8f5e8 0%, #f0f8f0 100%)';
          syncStatusElement.style.borderColor = '#c3e6c3';
          break;
        case 'warning':
          syncStatusElement.classList.add('sync-warning');
          syncStatusElement.style.background = 'linear-gradient(135deg, #fff3cd 0%, #fef8e7 100%)';
          syncStatusElement.style.borderColor = '#f0c36d';
          break;
        case 'disabled':
          syncStatusElement.classList.add('sync-disabled');
          syncStatusElement.style.background = 'linear-gradient(135deg, #f8d7da 0%, #fce6e7 100%)';
          syncStatusElement.style.borderColor = '#f1a5a8';
          break;
      }
    }
  }
  
  /**
   * Marca la sincronización como activa
   */
  setSyncActive() {
    this.updateSyncStatus('active', 'Sincronización automática activa');
  }
  
  /**
   * Marca la sincronización con advertencia
   */
  setSyncWarning(message = 'Sincronización con problemas') {
    this.updateSyncStatus('warning', message);
  }
  
  /**
   * Marca la sincronización como deshabilitada
   */
  setSyncDisabled(message = 'Sincronización deshabilitada') {
    this.updateSyncStatus('disabled', message);
  }
  
  /**
   * Restaura los datos del formulario PPI guardados en localStorage
   */
  restoreSavedPPIFormData() {
    try {
      const savedData = localStorage.getItem('savedPPIFormData');
      if (!savedData) return;
      
      const ppiFormData = JSON.parse(savedData);
      
      // Restaurar después de un pequeño delay para asegurar que el DOM esté listo
      setTimeout(() => {
        const modal = document.getElementById('ppi-modal');
        if (!modal) return;
        
        const form = modal.querySelector('form');
        if (!form) return;
        
        // Restaurar cada campo
        Object.entries(ppiFormData).forEach(([fieldName, value]) => {
          if (fieldName === 'editingPPIId') return; // Skip meta fields
          
          const input = form.querySelector(`[name="${fieldName}"]`);
          if (input && value !== undefined && value !== null && value !== '') {
            input.value = value;
            console.log(`📝 Campo PPI restaurado: ${fieldName} = ${value}`);
          }
        });
        
        console.log('✅ Formulario PPI restaurado desde localStorage');
        
        // Limpiar datos guardados después de restaurar
        localStorage.removeItem('savedPPIFormData');
        
      }, 100);
      
    } catch (error) {
      console.warn('Error restaurando formulario PPI desde localStorage:', error);
    }
  }
}

// Register in ServiceRegistry
const registry = getServiceRegistry();
if (registry) {
  registry.register('PPIUI', PPIUI, { 
    description: 'UI de PPIs' 
  });
  // Optimización: Log eliminado para mejorar rendimiento
  // 
} else {
  
}


export default PPIUI;
