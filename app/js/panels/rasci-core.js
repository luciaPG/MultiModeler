// RASCI Core - Main panel initialization and state management
import { renderMatrix, addNewRole, editRole, deleteRole, showDeleteConfirmModal } from './rasci-matrix.js';
import { applyStyles } from './rasci-styles.js';
import { initRasciMapping, executeSimpleRasciMapping } from './rasci-mapping-consolidated.js';

export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');

  // Configurar contenedor - USAR FLEX para ajuste automático
  container.style.overflowX = 'visible';
  container.style.overflowY = 'visible';
  container.style.maxWidth = '100%';
  container.style.flex = '1';
  container.style.paddingBottom = '12px';
  container.style.position = 'relative';
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.width = '100%';
  container.style.border = '1px solid #e5e7eb';
  container.style.borderRadius = '8px';
  container.style.background = '#fff';

  // Inicializar roles desde localStorage o usar array vacío
  let roles = [];
  if (localStorage.getItem('rasciRoles')) {
    try {
      roles = JSON.parse(localStorage.getItem('rasciRoles'));
    } catch (e) {
      roles = [];
    }
  }

  // Inicializar la matriz global si no existe
  if (!window.rasciMatrixData) {
    // Intentar cargar desde localStorage
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      try {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
      } catch (e) {
        window.rasciMatrixData = {};
      }
    } else {
      window.rasciMatrixData = {};
    }
  }

  // Función para guardar el estado en localStorage con indicador visual
  function saveRasciState() {
    try {
      localStorage.setItem('rasciRoles', JSON.stringify(roles));
      localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
      
      // Mostrar indicador de guardado
      showSaveIndicator();
      
      console.log('✅ Estado RASCI guardado automáticamente');
    } catch (e) {
      console.warn('❌ No se pudo guardar el estado RASCI:', e);
    }
  }

  // Función para mostrar indicador de guardado
  function showSaveIndicator() {
    // Crear o actualizar indicador de guardado
    let saveIndicator = document.getElementById('rasci-save-indicator');
    if (!saveIndicator) {
      saveIndicator = document.createElement('div');
      saveIndicator.id = 'rasci-save-indicator';
      saveIndicator.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        ">
          <i class="fas fa-save" style="font-size: 10px;"></i>
          <span>Guardado automático</span>
        </div>
      `;
      document.body.appendChild(saveIndicator);
    }

    // Mostrar indicador
    saveIndicator.style.opacity = '1';
    saveIndicator.style.transform = 'translateY(0)';

    // Ocultar después de 2 segundos
    setTimeout(() => {
      saveIndicator.style.opacity = '0';
      saveIndicator.style.transform = 'translateY(-10px)';
    }, 2000);
  }

  // Variables para el sistema de guardado automático
  let saveTimeout = null;
  let lastSaveTime = 0;

  // Función para cargar el estado desde localStorage
  function loadRasciState() {
    try {
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        roles = JSON.parse(savedRoles);
        console.log('📂 Roles RASCI cargados:', roles.length, 'roles');
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
        console.log('📂 Matriz RASCI cargada:', Object.keys(window.rasciMatrixData).length, 'tareas');
      }
    } catch (e) {
      console.warn('❌ No se pudo cargar el estado RASCI:', e);
    }
  }

  // Función para guardado automático con debounce
  // ⚠️ IMPORTANTE: Esta función SOLO guarda el estado, NO ejecuta mapeo
  // El mapeo SOLO se ejecuta manualmente con el botón "Ejecutar Mapeo Manual"
  function autoSaveRasciState() {
    const now = Date.now();
    
    // Evitar guardados muy frecuentes (mínimo 1 segundo entre guardados)
    if (now - lastSaveTime < 1000) {
      // Cancelar timeout anterior y programar uno nuevo
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
        lastSaveTime = Date.now();
      }, 1000);
      return;
    }
    
    // Guardar inmediatamente si ha pasado suficiente tiempo
    saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
    lastSaveTime = now;
  }

  // Aplicar estilos
  applyStyles();

  // Cargar estado inicial
  loadRasciState();

  // Configurar visibilidad de pestañas
  function ensureActiveTabVisibility() {
    const tabs = panel.querySelectorAll('.tab');
    const tabContents = panel.querySelectorAll('.tab-content');
    
    // Ocultar todos los contenidos primero
    tabContents.forEach(content => {
      content.style.display = 'none';
      content.style.visibility = 'hidden';
      content.style.position = 'absolute';
      content.style.top = '-9999px';
    });

    // Mostrar solo la pestaña activa
    const activeTab = panel.querySelector('.tab.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      const activeContent = panel.querySelector(`#${tabName}-tab`);
      if (activeContent) {
        activeContent.style.display = 'block';
        activeContent.style.visibility = 'visible';
        activeContent.style.position = 'relative';
        activeContent.style.top = 'auto';
      }
    }
  }

  // Configurar observer para cambios de visibilidad
  function setupVisibilityObserver() {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          const target = mutation.target;
          if (target.id === 'rasci-panel' && target.style.display !== 'none') {
            // Panel se hizo visible, actualizar matriz
            setTimeout(() => {
              if (typeof window.updateMatrixFromDiagram === 'function') {
                window.updateMatrixFromDiagram();
              }
            }, 100);
          }
        }
      });
    });

    observer.observe(panel, {
      attributes: true,
      attributeFilter: ['style']
    });
  }

  // Configurar listeners de pestañas
  setTimeout(() => {
    const tabs = panel.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const tabName = this.getAttribute('data-tab');
        if (tabName) {
          tabs.forEach(t => t.classList.remove('active'));
          this.classList.add('active');
          window.cambiarPestana(tabName);
        }
      });
    });
  }, 100);

  // Inicializar componentes
  ensureActiveTabVisibility();
  setupVisibilityObserver();

  // Renderizar matriz inicial
  renderMatrix(panel, roles, autoSaveRasciState);

  // Inicializar mapeo
  initRasciMapping(panel);
  
  // Asegurar que las funciones globales estén disponibles
  setTimeout(() => {
    if (typeof window.executeRasciToRalphMapping !== 'function') {
      console.warn('⚠️ Función executeRasciToRalphMapping no disponible, configurando fallback...');
      
      // Fallback: configurar función básica usando la función importada
      window.executeRasciToRalphMapping = function() {
        console.log('🔄 Ejecutando mapeo manual...');
        
        if (!window.bpmnModeler) {
          alert('❌ BPMN Modeler no disponible. Asegúrate de tener un diagrama BPMN abierto.');
          return;
        }

        if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
          alert('❌ No hay datos en la matriz RASCI para mapear. Primero agrega algunos roles en la matriz.');
          return;
        }

        try {
          const results = executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
          console.log('✅ Mapeo manual completado:', results);
        } catch (error) {
          console.error('❌ Error en mapeo manual:', error);
        }
      };
      
      console.log('✅ Función executeRasciToRalphMapping configurada como fallback');
    } else {
      console.log('✅ Función executeRasciToRalphMapping ya disponible');
    }
  }, 1000);

  // Configurar listeners de eventos
  setupEventListeners();

  function setupEventListeners() {
    // Listener para agregar nuevo rol
    const addRoleBtn = panel.querySelector('#add-role-btn');
    if (addRoleBtn) {
      addRoleBtn.addEventListener('click', () => addNewRole(panel, roles, autoSaveRasciState));
    }

    // Listener para editar roles
    panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('edit-role-btn')) {
        const roleIndex = parseInt(e.target.getAttribute('data-role-index'));
        editRole(roleIndex, panel, roles, autoSaveRasciState);
      }
    });

    // Listener para eliminar roles
    panel.addEventListener('click', (e) => {
      if (e.target.classList.contains('delete-role-btn')) {
        const roleIndex = parseInt(e.target.getAttribute('data-role-index'));
        showDeleteConfirmModal(roleIndex, panel, roles, autoSaveRasciState);
      }
    });
  }

  // Configurar función global para cambiar pestañas
  window.cambiarPestana = function(tabName) {
    // Remover clase active de todas las pestañas
    const allTabs = panel.querySelectorAll('.panel-tabs .tab');
    allTabs.forEach(tab => {
      tab.classList.remove('active');
    });

    // Ocultar todos los contenidos
    const allTabContents = panel.querySelectorAll('.tab-content');
    allTabContents.forEach(content => {
      content.classList.remove('active');
    });

    // Activar la pestaña seleccionada
    const selectedTab = panel.querySelector(`.tab[data-tab="${tabName}"]`);
    const selectedContent = panel.querySelector(`#${tabName}-tab`);

    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
      
      // Actualizar matriz si es la pestaña principal
      if (tabName === 'main') {
        setTimeout(() => {
          if (typeof window.updateMatrixFromDiagram === 'function') {
            window.updateMatrixFromDiagram();
          }
        }, 100);
      }
    }
  };

  // Global functions
  window.reloadRasciMatrix = () => {
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    }
  };

  window.forceReloadRasciMatrix = function() {
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel && typeof window.reloadRasciMatrix === 'function') {
      window.reloadRasciMatrix();
    }
  };

  // Auto-reload on page load
  if (typeof window !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      sessionStorage.setItem('rasciNeedsReload', 'true');
    });

    if (sessionStorage.getItem('rasciNeedsReload') === 'true') {
      sessionStorage.removeItem('rasciNeedsReload');
      setTimeout(() => {
        if (typeof window.forceReloadRasciMatrix === 'function') {
          window.forceReloadRasciMatrix();
        }
      }, 1000);
    }
  }

  // Initial matrix update
  setTimeout(() => {
    if (typeof window.updateMatrixFromDiagram === 'function') {
      window.updateMatrixFromDiagram();
    }
  }, 500);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        if (typeof window.updateMatrixFromDiagram === 'function') {
          window.updateMatrixFromDiagram();
        }
      }, 300);
    });
  } else {
    setTimeout(() => {
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      }
    }, 300);
  }

  window.addEventListener('load', () => {
    setTimeout(() => {
      if (typeof window.updateMatrixFromDiagram === 'function') {
        window.updateMatrixFromDiagram();
      }
    }, 200);
  });
} 