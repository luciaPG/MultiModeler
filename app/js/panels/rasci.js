// panels/rasci.js actualizado

// Función global para cambiar entre pestañas
window.cambiarPestana = function(tabName) {
  // Obtener todas las pestañas y contenidos
  const tabs = document.querySelectorAll('#rasci-panel .tab');
  const tabContents = document.querySelectorAll('#rasci-panel .tab-content');

  // Remover clase activa de todas las pestañas
  tabs.forEach(tab => {
    tab.classList.remove('active');
  });

  // Ocultar todos los contenidos de pestañas
  tabContents.forEach(content => {
    content.classList.remove('active');
    content.style.display = 'none';
  });

  // Activar la pestaña seleccionada
  const selectedTab = document.querySelector(`#rasci-panel .tab[data-tab="${tabName}"]`);
  const selectedContent = document.querySelector(`#rasci-panel #${tabName}-tab`);

  if (selectedTab && selectedContent) {
    selectedTab.classList.add('active');
    selectedContent.classList.add('active');
    selectedContent.style.display = 'block';
  }
};

export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');
  const sampleBtn = panel.querySelector('.btn-primary');

  container.style.overflowX = 'auto';
  container.style.overflowY = 'visible';
  container.style.maxWidth = '100%';
  container.style.paddingBottom = '12px';

  // Aplicar estilos de leyenda inmediatamente
  function applyLegendStyles() {
    // Verificar si ya existe el style element para evitar duplicados
    if (document.getElementById('rasci-legend-styles')) {
      return;
    }

    const legendStyle = document.createElement('style');
    legendStyle.id = 'rasci-legend-styles';
    legendStyle.textContent = `
            /* Estilos para la leyenda RASCI */
            .rasci-legend {
                padding: 24px;
                max-width: 600px;
                margin: 0 auto;
            }
            
            .legend-header {
                margin-bottom: 24px;
                text-align: center;
            }
            
            .legend-title {
                font-size: 20px;
                font-weight: 600;
                color: #1f2937;
                margin-bottom: 8px;
                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            
            .legend-subtitle {
                font-size: 14px;
                color: #6b7280;
                line-height: 1.5;
                font-style: italic;
            }
            

            
            .legend-item:hover {
                background: #f1f5f9;
                transform: translateX(8px);
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            }
            
            .legend-item.r { border-left-color: #e63946; }
            .legend-item.a { border-left-color: #f77f00; }
            .legend-item.s { border-left-color: #43aa8b; }
            .legend-item.c { border-left-color: #3a86ff; }
            .legend-item.i { border-left-color: #6c757d; }
.legend-item {
  display: flex;
  align-items: center; /* 📌 alinea verticalmente el círculo con el texto */
  gap: 16px;
  padding: 16px;
  border-radius: 12px;
  background: #f8fafc;
  border-left: 4px solid #e63946; /* ejemplo */
  box-shadow: 0 2px 4px rgba(0,0,0,0.05);
}

.legend-color {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, #e63946, #dc2626); /* cambia según clase */
  color: white;
  font-weight: 700;
  font-size: 20px;
  line-height: 1;
  text-align: center;
  flex-shrink: 0;
  font-family: 'Segoe UI', Roboto, sans-serif;
}

.legend-content {
  display: flex;
  flex-direction: column;
  justify-content: center; /* 📌 centra verticalmente el texto si hay solo una línea */
}

.legend-name {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 6px;
  color: #1f2937;
}

.legend-description {
  font-size: 14px;
  color: #4b5563;
  line-height: 1.5;
}

            
            .legend-color.r {
                background: linear-gradient(135deg, #e63946, #dc2626);
            }
            
            .legend-color.a {
                background: linear-gradient(135deg, #f77f00, #ea580c);
            }
            
            .legend-color.s {
                background: linear-gradient(135deg, #43aa8b, #059669);
            }
            
            .legend-color.c {
                background: linear-gradient(135deg, #3a86ff, #2563eb);
            }
            
            .legend-color.i {
                background: linear-gradient(135deg, #6c757d, #4b5563);
            }
            
            /* Estilos para pestañas */
            .tab-content {
                padding: 12px;
            }
            
            .tab-content.active {
                display: block !important;
            }
            
            #config-tab {
                min-height: 400px;
                display: flex;
                align-items: flex-start;
                justify-content: center;
            }
            
            /* Responsividad */
            @media (max-width: 768px) {
                .rasci-legend {
                    padding: 16px;
                }
                
                .legend-item {
                    flex-direction: column;
                    text-align: center;
                    padding: 16px;
                    justify-self: center;
                    align-self: center;
                }
                
                .legend-color {
                    margin-right: 0;
                    margin-bottom: 12px;
                }
            }
            
            /* Estilos para la matriz RASCI */
            .rasci-table {
                border-collapse: collapse;
                width: 100%;
                margin: 20px 0;
                box-shadow: 0 4px 12px rgba(0,0,0,0.1);
                border-radius: 12px;
                overflow: hidden;
                background: white;
            }
            
            .rasci-table th,
            .rasci-table td {
                border: 1px solid #e5e7eb;
                padding: 12px 16px;
                text-align: center;
                font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            }
            
            .rasci-table th {
                background: linear-gradient(135deg, #f8fafc, #e2e8f0);
                font-weight: 600;
                color: #374151;
                font-size: 14px;
                text-transform: uppercase;
                letter-spacing: 0.5px;
            }
            
            .rasci-table tr:nth-child(even) {
                background-color: #f9fafb;
            }
            
            .rasci-table tr:hover {
                background-color: #f3f4f6;
                transition: background-color 0.2s ease;
            }
            
            .rasci-cell {
                position: relative;
                cursor: pointer;
                margin-bottom: 12px;
                transition: all 0.2s ease;
            }
            
            .rasci-cell:hover {
                transform: scale(1.05);
                z-index: 10;
            }
            
            .rasci-cell.R {
                background: linear-gradient(135deg, #fee2e2, #fecaca) !important;
                color: #991b1b !important;
                font-weight: bold;
            }
            
            .rasci-cell.A {
                background: linear-gradient(135deg, #fed7aa, #fdba74) !important;
                color: #9a3412 !important;
                font-weight: bold;
            }
            
            .rasci-cell.S {
                background: linear-gradient(135deg, #d1fae5, #a7f3d0) !important;
                color: #065f46 !important;
                font-weight: bold;
            }
            
            .rasci-cell.C {
                background: linear-gradient(135deg, #dbeafe, #bfdbfe) !important;
                color: #1e40af !important;
                font-weight: bold;
            }
            
            .rasci-cell.I {
                background: linear-gradient(135deg, #f3f4f6, #e5e7eb) !important;
                color: #374151 !important;
                font-weight: bold;
            }
        `;
    document.head.appendChild(legendStyle);
  }

  // Aplicar estilos de leyenda inmediatamente
  applyLegendStyles();

  // Aplicar estilos inmediatamente para el botón
  if (sampleBtn) {
    sampleBtn.style.cssText = `
            width: 100% !important;
            padding: 10px 16px !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            border-radius: 6px !important;
            border: none !important;
            cursor: pointer !important;
            transition: all 0.2s ease !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            gap: 8px !important;
            min-height: 40px !important;
            box-sizing: border-box !important;
            text-decoration: none !important;
            margin-bottom: 16px !important;
            background: #3a56d4 !important;
            color: white !important;
        `;
  }

  const roles = []; // Agregar algunos roles por defecto para testing
  const rasciValues = ['R', 'A', 'S', 'C', 'I'];

  // Inicializar la matriz global si no existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }

  // Función para obtener las tareas del diagrama BPMN actual
  function getBpmnTasks() {
    const modeler = window.bpmnModeler;
    if (!modeler) {
      console.warn('Modeler no disponible');
      return [];
    }

    const elementRegistry = modeler.get('elementRegistry');
    const tasks = [];

    elementRegistry.forEach(element => {
      // Obtener elementos de tipo task (incluyendo subtipos)
      if (element.type && (
          element.type === 'bpmn:Task' ||
          element.type === 'bpmn:UserTask' ||
          element.type === 'bpmn:ServiceTask' ||
          element.type === 'bpmn:ScriptTask' ||
          element.type === 'bpmn:ManualTask' ||
          element.type === 'bpmn:BusinessRuleTask' ||
          element.type === 'bpmn:SendTask' ||
          element.type === 'bpmn:ReceiveTask' ||
          element.type === 'bpmn:CallActivity' ||
          element.type === 'bpmn:SubProcess'
        )) {
        const taskName = element.businessObject && element.businessObject.name ?
          element.businessObject.name :
          `Tarea ${element.id}`;
        tasks.push(taskName);
      }
    });

    return tasks;
  }

  // Función para aplicar estilos del botón
  function applyButtonStyles() {
    const btn = panel.querySelector('.btn-primary');
    if (btn) {
      btn.style.cssText = `
                width: 100% !important;
                padding: 10px 16px !important;
                font-size: 14px !important;
                font-weight: 500 !important;
                border-radius: 6px !important;
                border: none !important;
                cursor: pointer !important;
                transition: all 0.2s ease !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                gap: 8px !important;
                min-height: 40px !important;
                box-sizing: border-box !important;
                text-decoration: none !important;
                margin-bottom: 16px !important;
                background: #3a56d4 !important;
                color: white !important;
            `;
    }
  }

  // Función para actualizar la matriz cuando cambie el diagrama
  function updateMatrixFromDiagram() {
    const tasks = getBpmnTasks();
    if (tasks.length === 0) {
      // Si no hay tareas, mostrar un mensaje
      container.innerHTML =
        '<div style="text-align: center; padding: 20px; color: #666;">No hay tareas en el diagrama BPMN actual. Agrega algunas tareas para ver la matriz RACI.</div>';
      applyButtonStyles(); // Aplicar estilos después de cualquier cambio
      return;
    }
    renderMatrix(tasks);
    applyButtonStyles(); // Aplicar estilos después de renderizar
  }

  // Escuchar cambios en el diagrama
  function setupDiagramChangeListener() {
    const modeler = window.bpmnModeler;
    if (modeler) {
      const eventBus = modeler.get('eventBus');
      if (eventBus) {
        // Escuchar eventos de cambios en el diagrama
        eventBus.on([
          'element.added',
          'element.removed',
          'element.changed',
          'elements.changed'
        ], () => {
          // Actualizar la matriz cuando cambie el diagrama
          setTimeout(updateMatrixFromDiagram, 100);
        });
      }
    }
  }

  // Funciones para gestionar roles
  function addNewRole() {
    // Agregar un nuevo rol con nombre por defecto
    const defaultName = `Rol ${roles.length + 1}`;
    roles.push(defaultName);
    updateMatrixFromDiagram();

    // Hacer que el nuevo rol sea editable inmediatamente
    setTimeout(() => {
      const newRoleIndex = roles.length - 1;
      const roleHeaders = document.querySelectorAll('[data-role-index]');
      let newRoleHeader = null;

      for (let header of roleHeaders) {
        if (header.getAttribute('data-role-index') === newRoleIndex.toString()) {
          newRoleHeader = header;
          break;
        }
      }

      if (newRoleHeader) {
        makeRoleEditable(newRoleHeader, newRoleIndex);
      }
    }, 200);
  }

  // Función para hacer un rol editable inline
  function makeRoleEditable(roleHeader, roleIndex) {
    // Buscar el span del nombre del rol
    const roleNameSpan = roleHeader.querySelector('.role-name');
    if (!roleNameSpan) {
      return;
    }

    // Verificar si ya está en modo edición - más específico
    const existingInput = roleHeader.querySelector('input[type="text"]');
    if (existingInput) {
      existingInput.focus();
      existingInput.select();
      return;
    }

    const currentName = roles[roleIndex];

    // ESTRATEGIA RADICAL: Crear un contenedor completamente aislado
    const isolatedContainer = document.createElement('div');
    isolatedContainer.style.cssText = `
            position: fixed !important;
            top: ${roleHeader.getBoundingClientRect().top}px !important;
            left: ${roleHeader.getBoundingClientRect().left}px !important;
            width: ${roleHeader.getBoundingClientRect().width}px !important;
            height: ${roleHeader.getBoundingClientRect().height}px !important;
            z-index: 999999 !important;
            background: transparent !important;
            border: none !important;
            border-radius: 0 !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            box-shadow: none !important;
        `;

    // Crear input dentro del contenedor aislado
    let input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 20;
    input.style.cssText = `
            background: #f8fafc !important;
            border: none !important;
            padding: 4px 6px !important;
            font-size: 12px !important;
            font-weight: 600 !important;
            color: #333 !important;
            width: calc(100% - 40px) !important;
            text-align: center !important;
            outline: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        `;

    // Forzar el color de fondo de la tabla inmediatamente con setProperty
    input.style.setProperty('background', '#f8fafc', 'important');
    input.style.setProperty('background-color', '#f8fafc', 'important');

    // Forzar el color de fondo de la tabla en todos los estados
    input.addEventListener('focus', function() {
      this.style.background = '#f8fafc !important';
      this.style.backgroundColor = '#f8fafc !important';
    });

    input.addEventListener('blur', function() {
      this.style.background = '#f8fafc !important';
      this.style.backgroundColor = '#f8fafc !important';
    });

    // Forzar el color durante la escritura
    input.addEventListener('input', function() {
      this.style.background = '#f8fafc !important';
      this.style.backgroundColor = '#f8fafc !important';
    });

    input.addEventListener('keydown', function() {
      this.style.background = '#f8fafc !important';
      this.style.backgroundColor = '#f8fafc !important';
    });

    input.addEventListener('keyup', function() {
      this.style.background = '#f8fafc !important';
      this.style.backgroundColor = '#f8fafc !important';
    });

    // Observar cambios de estilo y forzar el color de la tabla
    const observer = new MutationObserver(function(mutations) {
      mutations.forEach(function(mutation) {
        if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
          if (input.style.background !== '#f8fafc' || input.style.backgroundColor !== '#f8fafc') {
            input.style.background = '#f8fafc !important';
            input.style.backgroundColor = '#f8fafc !important';
          }
        }
      });
    });
    observer.observe(input, {
      attributes: true,
      attributeFilter: ['style']
    });

    // Intervalo agresivo para forzar el color constantemente
    const forceColorInterval = setInterval(() => {
      if (input && document.contains(input)) {
        input.style.setProperty('background', '#f8fafc', 'important');
        input.style.setProperty('background-color', '#f8fafc', 'important');
      } else {
        clearInterval(forceColorInterval);
      }
    }, 50); // Cada 50ms

    isolatedContainer.appendChild(input);
    document.body.appendChild(isolatedContainer);

    // Ocultar COMPLETAMENTE el texto original desde el inicio
    roleNameSpan.style.visibility = 'hidden';
    roleNameSpan.style.opacity = '0';

    // También ocultar el header original para evitar superposiciones
    roleHeader.style.visibility = 'hidden';

    // Variable para controlar el estado del editor
    let isSaving = false;
    let isBeingRestored = false;
    let startTime = Date.now();
    const INITIALIZATION_PERIOD = 1000;

    // PROTECCIÓN ANTI-INTERFERENCIA: Hacer el input invisible para VS Code
    function applyFullStealth(inputElement) {
      inputElement.setAttribute('data-rasci-protected', 'true');
      inputElement.setAttribute('data-bpmn-ignore', 'true');
      inputElement.setAttribute('data-ralph-ignore', 'true');
      inputElement.setAttribute('contenteditable', 'false');
      inputElement.setAttribute('data-editing', 'false');
      inputElement.setAttribute('data-vscode-ignore', 'true');
      inputElement.setAttribute('role', 'textbox');
      inputElement.className = 'vscode-ignore rasci-internal-input';
      inputElement.setAttribute('data-internal', 'true');
      inputElement.setAttribute('data-non-editable', 'true');
      // Mentir sobre estar conectado
      Object.defineProperty(inputElement, 'isConnected', {
        get: function() {
          return false;
        },
        configurable: true,
        enumerable: false
      });

      // Interceptar matches para ser invisible a selectors
      const originalMatches = inputElement.matches;
      inputElement.matches = function(selector) {
        if (selector && (
            selector.includes('input') ||
            selector.includes('[contenteditable]') ||
            selector.includes('editable') ||
            selector.includes('text') ||
            selector.includes('form') ||
            selector.includes('[type') ||
            selector.toLowerCase().includes('edit')
          )) {
          return false;
        }
        return originalMatches.call(this, selector);
      };

      // Fingir que es un div
      Object.defineProperty(inputElement, 'tagName', {
        get: function() {
          return 'DIV';
        },
        configurable: true
      });

      Object.defineProperty(inputElement, 'nodeName', {
        get: function() {
          return 'DIV';
        },
        configurable: true
      });

      Object.defineProperty(inputElement, 'localName', {
        get: function() {
          return 'div';
        },
        configurable: true
      });

      Object.defineProperty(inputElement, 'type', {
        get: function() {
          return 'div';
        },
        set: function() {
          /* ignorar */
        },
        configurable: true
      });

      // Hacer invisible a querySelector
      inputElement.querySelector = function() {
        return null;
      };
      inputElement.querySelectorAll = function() {
        return [];
      };

      // Interceptar addEventListener para ocultar eventos
      const originalAddEventListener = inputElement.addEventListener;
      inputElement.addEventListener = function(event, handler, options) {
        if (event === 'focus' || event === 'blur') {
          const wrappedHandler = function(e) {
            e.stopImmediatePropagation();
            e.stopPropagation();
            return handler.call(this, e);
          };
          return originalAddEventListener.call(this, event, wrappedHandler, options);
        }
        return originalAddEventListener.call(this, event, handler, options);
      };

      // Mentir sobre parentNode para confundir MutationObserver
      Object.defineProperty(inputElement, 'parentNode', {
        get: function() {
          return Math.random() > 0.5 ? isolatedContainer : null;
        },
        configurable: true
      });
    }

    // Función para configurar event listeners del input
    function setupInputEventListeners(inputElement) {
      inputElement.addEventListener('keydown', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.key === 'Enter') {
          e.preventDefault();
          saveChanges();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          restoreView();
        }
      }, true);

      inputElement.addEventListener('blur', function(e) {
        if ((Date.now() - startTime) < INITIALIZATION_PERIOD) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          setTimeout(() => {
            if (isolatedContainer && isolatedContainer.contains(inputElement)) {
              inputElement.focus();
              inputElement.select();
            }
          }, 10);
          return false;
        }

        if (isSaving || isBeingRestored) {
          return;
        }

        if (isolatedContainer && isolatedContainer.contains(inputElement)) {
          saveChanges();
        }
      });

      inputElement.addEventListener('input', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      });

      inputElement.addEventListener('click', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (document.activeElement !== inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      });

      inputElement.addEventListener('focus', function(e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
      });
    }

    // Aplicar protecciones al input inicial
    applyFullStealth(input);

    const originalRemoveChild = isolatedContainer.removeChild;
    isolatedContainer.removeChild = function(child) {
      if (child === input) {
        return child;
      }
      return originalRemoveChild.call(this, child);
    };

    let protectionObserver = null;
    let protectionTimer = null;
    let survivalCheck = null;

    survivalCheck = setInterval(() => {
      if (!isolatedContainer.contains(input)) {
        const currentValue = input.value || '';

        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.value = currentValue;
        newInput.maxLength = 20;
        newInput.style.cssText = input.style.cssText;

        applyFullStealth(newInput);

        input = newInput;
        isolatedContainer.appendChild(input);

        setTimeout(() => {
          input.focus();
          input.select();
          setupInputEventListeners(input);
        }, 10);
      }
    }, 100);


    function establishFocus() {
      input.focus();
      input.select();

      const focusAttempts = [100, 200, 300, 400, 500];
      focusAttempts.forEach(delay => {
        setTimeout(() => {
          if (document.activeElement !== input && document.contains(input)) {
            input.focus();
            input.select();
          }
        }, delay);
      });

      setTimeout(() => {
        if (protectionTimer) {
          clearTimeout(protectionTimer);
          protectionTimer = null;
        }
        if (protectionObserver) {
          protectionObserver.disconnect();
          protectionObserver = null;
        }
      }, INITIALIZATION_PERIOD);
    }

    establishFocus();
    setupInputEventListeners(input);

    function saveChanges() {
      if (isSaving) return;
      isSaving = true;

      const newName = input.value.trim();

      if (newName && newName !== currentName) {
        const isDuplicate = roles.some((role, index) =>
          index !== roleIndex && role === newName
        );

        if (isDuplicate) {
          alert('Este nombre de rol ya existe.');
          input.focus();
          input.select();
          isSaving = false;
          return;
        }

        roles[roleIndex] = newName;

        if (window.rasciMatrixData) {
          Object.keys(window.rasciMatrixData).forEach(task => {
            if (window.rasciMatrixData[task] && window.rasciMatrixData[task][currentName]) {
              window.rasciMatrixData[task][newName] = window.rasciMatrixData[task][currentName];
              delete window.rasciMatrixData[task][currentName];
            }
          });
        }

        restoreView();
        setTimeout(() => {
          updateMatrixFromDiagram();
        }, 50);
      } else {
        restoreView();
      }
    }

    function restoreView() {
      try {
        if (protectionTimer) {
          clearTimeout(protectionTimer);
          protectionTimer = null;
        }
        if (protectionObserver) {
          protectionObserver.disconnect();
          protectionObserver = null;
        }
        if (survivalCheck) {
          clearInterval(survivalCheck);
          survivalCheck = null;
        }
        if (forceColorInterval) {
          clearInterval(forceColorInterval);
        }

        if (isolatedContainer && isolatedContainer.parentNode) {
          isolatedContainer.parentNode.removeChild(isolatedContainer);
        }

        if (roleHeader) {
          roleHeader.style.visibility = 'visible';
        }

        if (roleNameSpan) {
          roleNameSpan.style.visibility = 'visible';
          roleNameSpan.style.opacity = '1';
        }

        isSaving = false;
        isBeingRestored = false;
      } catch (e) {
        console.error('Error al restaurar vista:', e);
      }
    }

    setTimeout(() => {
      if (isolatedContainer.contains(input)) {
        if (document.activeElement !== input) {
          input.focus();
          input.select();
        }
        // Mantener protección activa para uso continuo
        return;
      }

      // Limpiar protección solo si el input no está funcionando
      if (protectionTimer) {
        clearTimeout(protectionTimer);
        protectionTimer = null;
      }
      if (protectionObserver) {
        protectionObserver.disconnect();
        protectionObserver = null;
      }
      if (survivalCheck) {
        clearInterval(survivalCheck);
        survivalCheck = null;
      }
      if (forceColorInterval) {
        clearInterval(forceColorInterval);
      }

      // Limpiar contenedor aislado si aún existe
      if (isolatedContainer && isolatedContainer.parentNode) {
        isolatedContainer.parentNode.removeChild(isolatedContainer);

      }

      // Restaurar header original
      if (roleHeader) {
        roleHeader.style.visibility = 'visible';
      }

      // Restaurar texto original
      if (roleNameSpan) {
        roleNameSpan.style.visibility = 'visible';
        roleNameSpan.style.opacity = '1';
      }

    }, 2000); // Aumentado a 2 segundos para dar tiempo a la protección
  }

  function editRole(roleIndex) {
    // Buscar el header del rol específico
    const roleHeaders = document.querySelectorAll('[data-role-index]');
    let roleHeader = null;

    for (let header of roleHeaders) {
      if (header.getAttribute('data-role-index') === roleIndex.toString()) {
        roleHeader = header;
        break;
      }
    }

    if (roleHeader) {
      makeRoleEditable(roleHeader, roleIndex);
    }
  }

  // Modal personalizado para confirmar eliminación
  function showDeleteConfirmModal(roleIndex) {
    const roleToDelete = roles[roleIndex];

    const modal = document.createElement('div');
    modal.id = 'deleteConfirmModal';
    modal.style.cssText = `
            position: fixed !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            background: rgba(0, 0, 0, 0.7) !important;
            display: flex !important;
            justify-content: center !important;
            align-items: center !important;
            z-index: 999999 !important;
        `;

    const content = document.createElement('div');
    content.style.cssText = `
            background: white !important;
            padding: 30px !important;
            border-radius: 10px !important;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5) !important;
            min-width: 350px !important;
            max-width: 450px !important;
            z-index: 1000000 !important;
            position: relative !important;
            text-align: center !important;
        `;

    // Icono de advertencia
    const warningIcon = document.createElement('div');
    warningIcon.innerHTML = '⚠️';
    warningIcon.style.cssText = `
            font-size: 48px !important;
            margin-bottom: 20px !important;
        `;

    // Título
    const title = document.createElement('h3');
    title.textContent = 'Eliminar Rol';
    title.style.cssText = `
            margin: 0 0 15px 0 !important;
            color: #dc2626 !important;
            font-size: 20px !important;
            font-weight: bold !important;
        `;

    // Mensaje
    const message = document.createElement('p');
    message.textContent = `¿Estás seguro de que quieres eliminar el rol "${roleToDelete}"?`;
    message.style.cssText = `
            margin: 0 0 25px 0 !important;
            color: #374151 !important;
            font-size: 16px !important;
            line-height: 1.5 !important;
        `;

    // Botones
    const buttonContainer = document.createElement('div');
    buttonContainer.style.cssText = `
            display: flex !important;
            gap: 15px !important;
            justify-content: center !important;
        `;

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = `
            padding: 12px 24px !important;
            border: 2px solid #d1d5db !important;
            background: #f9fafb !important;
            color: #374151 !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
        `;

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Eliminar';
    deleteBtn.style.cssText = `
            padding: 12px 24px !important;
            border: none !important;
            background: #dc2626 !important;
            color: white !important;
            border-radius: 6px !important;
            cursor: pointer !important;
            font-size: 14px !important;
            font-weight: 600 !important;
            transition: all 0.2s ease !important;
        `;

    // Hover effects
    cancelBtn.addEventListener('mouseenter', () => {
      cancelBtn.style.background = '#f3f4f6';
    });
    cancelBtn.addEventListener('mouseleave', () => {
      cancelBtn.style.background = '#f9fafb';
    });

    deleteBtn.addEventListener('mouseenter', () => {
      deleteBtn.style.background = '#b91c1c';
    });
    deleteBtn.addEventListener('mouseleave', () => {
      deleteBtn.style.background = '#dc2626';
    });

    // Ensamblar
    buttonContainer.appendChild(cancelBtn);
    buttonContainer.appendChild(deleteBtn);
    content.appendChild(warningIcon);
    content.appendChild(title);
    content.appendChild(message);
    content.appendChild(buttonContainer);
    modal.appendChild(content);
    document.body.appendChild(modal);

    // Funciones
    function closeModal() {
      modal.remove();
    }

    function confirmDelete() {
      // Eliminar datos de la matriz
      if (window.rasciMatrixData) {
        Object.keys(window.rasciMatrixData).forEach(task => {
          if (window.rasciMatrixData[task][roleToDelete]) {
            delete window.rasciMatrixData[task][roleToDelete];
          }
        });
      }
      roles.splice(roleIndex, 1);
      closeModal();
      updateMatrixFromDiagram();
    }

    // Event listeners
    deleteBtn.addEventListener('click', confirmDelete);
    cancelBtn.addEventListener('click', closeModal);

    // Cerrar al hacer clic fuera
    modal.addEventListener('click', function(e) {
      if (e.target === modal) {
        closeModal();
      }
    });

    // Teclas
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'Enter') {
        confirmDelete();
      }
    });

    // Focus en el botón cancelar por defecto
    cancelBtn.focus();
  }

  function deleteRole(roleIndex) {
    showDeleteConfirmModal(roleIndex);
  }

  function renderMatrix(tasks = []) {
    container.innerHTML = '';
    const table = document.createElement('table');
    table.className = 'rasci-matrix';

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Crear encabezado de tareas
    const taskHeader = document.createElement('th');
    taskHeader.textContent = 'Tarea';
    headerRow.appendChild(taskHeader);

    // Crear encabezados de roles con funcionalidad de edición
    roles.forEach((role, index) => {
      const roleHeader = document.createElement('th');
      roleHeader.className = 'role-header';
      roleHeader.setAttribute('data-role-index', index);

      const headerContent = document.createElement('div');
      headerContent.className = 'role-header-content';
      headerContent.style.position = 'relative'; // Para posicionar el botón eliminar

      const roleNameSpan = document.createElement('span');
      roleNameSpan.className = 'role-name';
      roleNameSpan.textContent = role;
      roleNameSpan.style.cursor = 'pointer';

      const editBtn = document.createElement('button');
      editBtn.className = 'edit-role-btn';
      editBtn.textContent = '✎';
      editBtn.title = 'Editar rol';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-role-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Eliminar rol';
      deleteBtn.style.cssText = `
            position: absolute !important;
            top: -8px !important;
            right: -8px !important;
            width: 14px !important;
            height: 14px !important;
            border: none !important;
            background: transparent !important;
            color: #dc2626 !important;
            border-radius: 0 !important;
            font-size: 12px !important;
            font-weight: bold !important;
            cursor: pointer !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            opacity: 0.7 !important;
            z-index: 1001 !important;
            transition: opacity 0.2s ease !important;
            line-height: 1 !important;
            font-family: monospace !important;
        `;

      // Event listeners
      roleNameSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Verificar si ya hay un input en edición
        if (roleHeader.querySelector('input[data-editing-role="true"]')) {
          return;
        }

        editRole(index);
      });

      // Event listener adicional para hacer clic en cualquier parte del span
      roleNameSpan.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();
      });

      // Event listener para doble clic
      roleNameSpan.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        editRole(index);
      });

      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        // Verificar si ya hay un input en edición
        if (roleHeader.querySelector('input[data-editing-role="true"]')) {
          return;
        }

        editRole(index);
      });

      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation(); // Evitar que interfiera con la edición
        deleteRole(index);
      });

      headerContent.appendChild(roleNameSpan);
      headerContent.appendChild(deleteBtn); // Solo añadir deleteBtn, quitar editBtn
      roleHeader.appendChild(headerContent);

      // Event listener adicional en el header completo
      roleHeader.addEventListener('click', (e) => {
        if (e.target === roleNameSpan || e.target.closest('.role-name')) {
          e.preventDefault();
          e.stopPropagation();
          editRole(index);
        }
      });

      headerRow.appendChild(roleHeader);
    });

    // Agregar columna para añadir nuevos roles
    const addRoleHeader = document.createElement('th');
    addRoleHeader.className = 'add-role-header';

    const addBtn = document.createElement('button');
    addBtn.className = 'add-role-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Agregar nuevo rol';
    addBtn.addEventListener('click', addNewRole);

    addRoleHeader.appendChild(addBtn);
    headerRow.appendChild(addRoleHeader);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    tasks.forEach(task => {
      const row = document.createElement('tr');

      // Celda de tarea
      const taskCell = document.createElement('td');
      taskCell.textContent = task;
      row.appendChild(taskCell);

      // Celdas de roles
      roles.forEach(role => {
        const cell = document.createElement('td');

        // Dropdown personalizado
        const dropdown = document.createElement('div');
        dropdown.className = 'rasci-dropdown';
        dropdown.tabIndex = 0;

        const selected = document.createElement('div');
        selected.className = 'rasci-selected';
        selected.textContent = '';
        dropdown.appendChild(selected);

        const menu = document.createElement('div');
        menu.className = 'rasci-menu';
        menu.style.display = 'none';

        const rasciColors = {
          R: '#e63946',
          A: '#f77f00',
          S: '#43aa8b',
          C: '#3a86ff',
          I: '#6c757d'
        };

        rasciValues.forEach(v => {
          const option = document.createElement('div');
          option.className = 'rasci-option';
          // Círculo con letra blanca
          const circle = document.createElement('span');
          circle.className = 'rasci-circle';
          circle.textContent = v;
          circle.style.background = rasciColors[v];
          option.appendChild(circle);

          option.addEventListener('click', e => {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();

            selected.innerHTML = '';
            const selectedCircle = document.createElement('span');
            selectedCircle.className = 'rasci-circle';
            selectedCircle.textContent = v;
            selectedCircle.style.background = rasciColors[v];
            selected.appendChild(selectedCircle);
            menu.style.display = 'none';

            if (!window.rasciMatrixData) window.rasciMatrixData = {};
            if (!window.rasciMatrixData[task]) {
              window.rasciMatrixData[task] = {};
            }
            window.rasciMatrixData[task][role] = v;
            cell.setAttribute('data-value', v);
          });

          option.addEventListener('mousedown', e => {
            e.preventDefault();
            e.stopPropagation();
          });

          menu.appendChild(option);
        });

        // Opción para limpiar
        const clearOption = document.createElement('div');
        clearOption.className = 'rasci-option rasci-clear';
        clearOption.textContent = '-';
        clearOption.style.cssText = `
            color: #6b7280 !important;
            font-size: 18px !important;
            font-weight: 700 !important;
            line-height: 1 !important;
          `;

        clearOption.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();

          selected.innerHTML = '';
          menu.style.display = 'none';
          if (window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
            delete window.rasciMatrixData[task][role];
          }
          cell.removeAttribute('data-value');
        });

        clearOption.addEventListener('mousedown', e => {
          e.preventDefault();
          e.stopPropagation();
        });

        menu.appendChild(clearOption);

        dropdown.appendChild(menu);

        // Mostrar menú al hacer clic
        selected.addEventListener('click', e => {
          e.preventDefault();
          e.stopPropagation();

          // Cerrar otros menús abiertos
          document.querySelectorAll('.rasci-menu').forEach(m => {
            if (m !== menu) m.style.display = 'none';
          });

          if (menu.style.display === 'none' || !menu.style.display) {
            menu.style.display = 'block';
          } else {
            menu.style.display = 'none';
          }
        });

        dropdown.addEventListener('blur', () => {
          // Solo cerrar si el foco no se movió a un elemento hijo del menú
          setTimeout(() => {
            if (!dropdown.contains(document.activeElement) &&
              !menu.contains(document.activeElement)) {
              menu.style.display = 'none';
            }
          }, 150);
        });

        // Prevenir que el menú se cierre cuando se hace clic en él
        menu.addEventListener('mousedown', (e) => {
          e.preventDefault();
        });

        menu.addEventListener('click', (e) => {
          e.stopPropagation();
        });

        // Cerrar menú al hacer clic fuera
        const closeDropdownHandler = (e) => {
          if (!dropdown.contains(e.target)) {
            menu.style.display = 'none';
          }
        };
        document.addEventListener('click', closeDropdownHandler);

        // Remover listener cuando el dropdown se destruya
        dropdown.addEventListener('DOMNodeRemoved', () => {
          document.removeEventListener('click', closeDropdownHandler);
        });

        // Cerrar menú solo al redimensionar ventana, no al scroll
        window.addEventListener('resize', () => {
          if (menu.style.display === 'block') {
            menu.style.display = 'none';
          }
        });

        cell.appendChild(dropdown);
        row.appendChild(cell);
      });

      // Celda vacía al final para mantener alineación
      const emptyCell = document.createElement('td');
      emptyCell.style.border = 'none';
      emptyCell.style.background = 'transparent';
      row.appendChild(emptyCell);

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    container.appendChild(table);

    // Estilos mejorados que no interfieren con el redimensionamiento
    const style = document.createElement('style');
    style.textContent = `
        .rasci-matrix {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          min-width: max-content;
          margin: 16px 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          color: #333;
          border-radius: 6px;
          overflow: visible;
        }
        
        .rasci-matrix th,
        .rasci-matrix td {
          padding: 10px 12px;
          text-align: center;
          border-right: 1px solid #eaeaea;
          border-bottom: 1px solid #eaeaea;
          transition: all 0.2s ease;
          position: relative;
          overflow: visible;
        }
        
        .rasci-matrix th {
          background: #f8fafc;
          font-weight: 600;
          color: #2d3748;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 2px solid #e2e8f0;
          letter-spacing: 0.5px;
          font-size: 12px;
        }
        
        .rasci-matrix td:first-child,
        .rasci-matrix th:first-child {
          background: #f8fafc;
          position: sticky;
          left: 0;
          z-index: 20;
          text-align: left;
          font-weight: 500;
          color: #4a5568;
          border-right: 2px solid #e2e8f0;
          min-width: 120px;
        }

        .rasci-matrix td:first-child {
          background: #f8fafc;
          position: sticky;
          left: 0;
          z-index: 10;
          text-align: left;
          font-weight: 500;
          color: #4a5568;
          border-right: 2px solid #e2e8f0;
          min-width: 120px;
        }
        
        .rasci-matrix tr:hover td {
          background-color: #f8fafc;
        }
        
        .rasci-matrix td select {
          font-size: 13px;
          padding: 0;
          width: 15px;
          height: 100%;
          border: none;
          border-radius: 0;
          background: rgba(255,255,255,0.7);
          color: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 14px;
          text-align: center;
          font-weight: bold;
          position: absolute;
          top: 0;
          left: 0;
          box-shadow: none;
        }
       
        
        /* Opciones con círculos de color y letras */
        .rasci-matrix td select option.option-r { 
        
          color: #e63946;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-a {          
          color: #f77f00;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-s { 
        
          color: #43aa8b;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-c { 

          color: #3a86ff;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-i { 
      
          color: #6c757d;
          font-weight: bold;
        }
        
        /* Estilo para celdas con valores seleccionados */
        .rasci-matrix td[data-value="R"] { background-color: rgba(230, 57, 70, 0.1); }
        .rasci-matrix td[data-value="A"] { background-color: rgba(247, 127, 0, 0.1); }
        .rasci-matrix td[data-value="S"] { background-color: rgba(67, 170, 139, 0.1); }
        .rasci-matrix td[data-value="C"] { background-color: rgba(58, 134, 255, 0.1); }
        .rasci-matrix td[data-value="I"] { background-color: rgba(108, 117, 125, 0.1); }
        
        /* Asegurar que el contenedor no interfiera con el redimensionamiento */
        #matrix-container {
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 1;
          overflow: visible;
        }

        .rasci-dropdown {
          position: relative;
          width: 100%;
          min-width: 40px;
          user-select: none;
          outline: none;
          z-index: 1;
        }
        
        /* Asegurar que los paneles no interfieran */
        .panel, .panel-content {
          overflow: visible !important;
        }
        
        /* Asegurar que el contenedor de la matriz no corte el dropdown */
        #matrix-container, .rasci-matrix {
          overflow: visible !important;
        }
        .rasci-selected {
          width: 100%;
          padding: 4px 0;
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          font-weight: bold;
          font-size: 15px;
          border: none;
          min-height: 28px;
        }
        .rasci-menu {
          position: absolute;
          left: 50%;
          top: 100%;
          width: 120px;
          min-width: 120px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
          z-index: 999999;
          margin-left: -60px;
          margin-top: 4px;
          border: 1px solid #e2e8f0;
          max-height: none;
          overflow: visible;
          padding: 4px 0;
        }
        .rasci-option {
          padding: 8px 12px !important;
          text-align: center;
          font-size: 14px;
          font-weight: bold;
          cursor: pointer !important;
          background: #fff !important;
          border: none;
          transition: background 0.15s;
          width: calc(100% - 8px);
          display: block;
          margin: 0 4px;
          border-radius: 4px;
          user-select: none;
          pointer-events: auto !important;
          position: relative !important;
          z-index: 1000000 !important;
        }
        .rasci-option:hover {
          background: #f8fafc !important;
        }
        .rasci-option:active {
          background: #e2e8f0 !important;
        }
        .rasci-clear {
          font-weight: 700 !important;
          font-size: 18px !important;
          color: #6b7280 !important;
          border-top: 1px solid #e5e7eb !important;
          margin-top: 4px !important;
          padding-top: 8px !important;
          line-height: 1.2 !important;
        }
        .rasci-circle {
          display: inline-block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          border-radius: 50%;
          background: #eee;
          color: #fff;
          font-weight: bold;
          font-size: 15px;
          text-align: center;
          vertical-align: middle;
          margin: 0 2px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }

        /* Estilos para gestión de roles en encabezados */
        .role-header {
          cursor: pointer;
          position: relative;
        }

        .role-header-content {
          display: flex;
          align-items: center;
          justify-content: center;
          position: relative;
          width: 100%;
          padding: 2px 8px 2px 2px;
        }

        .role-name {
          flex: 1;
          cursor: pointer;
          transition: color 0.2s ease;
          text-align: center;
        }

        .role-name:hover {
          color: #3182ce;
        }

        .delete-role-btn {
          position: absolute !important;
          top: -8px !important;
          right: -8px !important;
          width: 14px !important;
          height: 14px !important;
          border: none !important;
          background: transparent !important;
          color: #dc2626 !important;
          border-radius: 0 !important;
          font-size: 12px !important;
          font-weight: bold !important;
          cursor: pointer !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          opacity: 0.7 !important;
          z-index: 1001 !important;
          transition: opacity 0.2s ease !important;
          line-height: 1 !important;
          font-family: monospace !important;
        }

        .delete-role-btn:hover {
          opacity: 1 !important;
        }

        .edit-role-btn {
          /* Botón de editar removido - se edita haciendo clic en el nombre */
          display: none !important;
        }

        .add-role-btn {
          width: 30px;
          height: 30px;
          border: 2px solid #e2e8f0;
          background: #fff;
          color: #4a5568;
          border-radius: 50%;
          font-size: 18px;
          font-weight: bold;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.2s ease;
          margin: 0 auto;
        }

        .add-role-btn:hover {
          background: #f7fafc;
          border-color: #cbd5e0;
          color: #2d3748;
          transform: scale(1.1);
        }

        .add-role-btn:active {
          transform: scale(0.95);
        }

        /* Estilos del modal */
        .role-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.3);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 100000;
          backdrop-filter: blur(2px);
        }

        .modal-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          z-index: 100000;
        }

        .modal-content {
          background: #fff;
          border-radius: 12px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
          width: 90%;
          max-width: 350px;
          position: relative;
          z-index: 100001;
          border: 1px solid #e2e8f0;
          animation: modalSlideIn 0.2s ease-out;
          padding: 0;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .modal-header {
          padding: 16px 20px 0 20px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
        }

        .modal-header h3 {
          margin: 0;
          color: #1e293b;
          font-size: 16px;
          font-weight: 600;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 20px;
          cursor: pointer;
          color: #64748b;
          padding: 4px;
          width: 28px;
          height: 28px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 6px;
          transition: all 0.2s ease;
        }

        .close-btn:hover {
          color: #1e293b;
          background: #f1f5f9;
        }

        .modal-body {
          padding: 20px;
        }

        .modal-body input {
          width: 100%;
          padding: 10px 12px;
          border: 1px solid #d1d5db;
          border-radius: 8px;
          font-size: 14px;
          margin-bottom: 16px;
          box-sizing: border-box;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          transition: border-color 0.2s ease;
          display: block;
          background: #fff;
          color: #000;
        }

        .modal-body input:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }

        .modal-body input::placeholder {
          color: #9ca3af;
        }

        .modal-actions {
          display: flex;
          gap: 8px;
          justify-content: flex-end;
        }

        .btn-cancel, .btn-confirm {
          padding: 8px 16px;
          border: none;
          border-radius: 6px;
          cursor: pointer;
          font-size: 13px;
          font-weight: 500;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          transition: all 0.2s ease;
        }

        .btn-cancel {
          background: #f8fafc;
          color: #475569;
          border: 1px solid #e2e8f0;
        }

        .btn-cancel:hover {
          background: #f1f5f9;
          color: #1e293b;
        }

        .btn-confirm {
          background: #3b82f6;
          color: #fff;
        }

        .btn-confirm:hover {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .btn-confirm:active {
          transform: translateY(0);
        }
        
        /* Estilos específicos para el editor de roles */
        .role-editor-container {
          position: relative !important;
          z-index: 1000 !important;
          background: transparent !important;
          border: none !important;
          border-radius: 0 !important;
          padding: 0 !important;
          box-shadow: none !important;
          display: flex !important;
          align-items: center !important;
          gap: 0 !important;
        }
        
        .role-editor-container input {
          border: none !important;
          border-radius: 0 !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          background: transparent !important;
          color: #2d3748 !important;
          outline: none !important;
          box-sizing: border-box !important;
          min-width: 60px !important;
          flex: 1 !important;
          height: 24px !important;
          padding: 4px 6px !important;
          pointer-events: auto !important;
          user-select: auto !important;
          -webkit-user-select: auto !important;
          -moz-user-select: auto !important;
          -ms-user-select: auto !important;
          box-shadow: none !important;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
        }
        
        .role-editor-container input:focus {
          border: none !important;
          box-shadow: none !important;
          background: transparent !important;
          background-color: transparent !important;
        }
        
        .role-editor-container button {
          width: 20px !important;
          height: 20px !important;
          border: none !important;
          border-radius: 3px !important;
          cursor: pointer !important;
          font-size: 12px !important;
          font-weight: bold !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          flex-shrink: 0 !important;
          pointer-events: auto !important;
        }
        
        .role-editor-container button:hover {
          transform: scale(1.05) !important;
        }
        
        /* Estilos para las pestañas y contenidos */
        .tab-content {
          padding: 12px;
        }
        
        .tab-content.active {
          display: block !important;
        }
        
        /* Estilos para botones - Consistentes */
        .btn {
          padding: 10px 16px !important;
          font-size: 14px !important;
          font-weight: 500 !important;
          border-radius: 6px !important;
          border: none !important;
          cursor: pointer !important;
          transition: all 0.2s ease !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 8px !important;
          min-height: 40px !important;
          box-sizing: border-box !important;
          text-decoration: none !important;
          margin-bottom: 16px !important;
        }
        
        .btn-primary {
          background: #3b82f6 !important;
          color: white !important;
          border: 1px solid #3b82f6 !important;
        }
        
        .btn-primary:hover {
          background: #2563eb !important;
          border-color: #2563eb !important;
          transform: translateY(-1px) !important;
        }
        
        .btn-primary:active {
          transform: translateY(0) !important;
        }
        
        .btn-full-width {
          width: 100% !important;
          display: flex !important;
        }
        
        /* Estilos para la leyenda RASCI mejorada */
        .rasci-legend {
          padding: 24px;
          max-width: 600px;
        }
        
        .legend-header {
          margin-bottom: 20px;
          text-align: center;
        }
        
        .legend-title {
          font-size: 18px;
          font-weight: 600;
          color: #1f2937;
          margin-bottom: 8px;
        }
        
        .legend-subtitle {
          font-size: 14px;
          color: #6b7280;
          line-height: 1.5;
        }
        
        .legend-item {
          display: flex;
          align-items: flex-start;
          margin-bottom: 16px;
          padding: 12px;
          border-radius: 8px;
          background: #f8fafc;
          border-left: 4px solid transparent;
          transition: all 0.2s ease;
        }
        
        .legend-item:hover {
          background: #f1f5f9;
          transform: translateX(4px);
        }
        
        .legend-item.r { border-left-color: #e63946; }
        .legend-item.a { border-left-color: #f77f00; }
        .legend-item.s { border-left-color: #43aa8b; }
        .legend-item.c { border-left-color: #3a86ff; }
        .legend-item.i { border-left-color: #6c757d; }
        
        .legend-color {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 40px;
          height: 40px;
          border-radius: 50%;
          color: white;
          font-weight: bold;
          font-size: 18px;
          margin-right: 16px;
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
          flex-shrink: 0;
        }
        
        .legend-content {
          flex: 1;
        }
        
        .legend-name {
          font-weight: 600;
          font-size: 16px;
          color: #1f2937;
          margin-bottom: 4px;
        }
        
        .legend-description {
          font-size: 14px;
          color: #4b5563;
          line-height: 1.4;
        }
        
        .legend-color.r {
          background: linear-gradient(135deg, #e63946, #dc2626);
        }
        
        .legend-color.a {
          background: linear-gradient(135deg, #f77f00, #ea580c);
        }
        
        .legend-color.s {
          background: linear-gradient(135deg, #43aa8b, #059669);
        }
        
        .legend-color.c {
          background: linear-gradient(135deg, #3a86ff, #2563eb);
        }
        
        .legend-color.i {
          background: linear-gradient(135deg, #6c757d, #4b5563);
        }
        
        /* Estilos para el contenedor principal de pestañas */
        #main-tab {
          min-height: 400px;
        }
        
        #config-tab {
          min-height: 400px;
          display: flex;
          align-items: flex-start;
          justify-content: center;
        }
        
        /* Mejoras para la responsividad */
        @media (max-width: 768px) {
          .rasci-legend {
            padding: 16px;
          }
          
          .legend-item {
            flex-direction: column;
            text-align: center;
            padding: 16px;
          }
          
          .legend-color {
            margin-right: 0;
            margin-bottom: 12px;
          }
        }
      `;
    document.head.appendChild(style);
  }

  if (sampleBtn) {
    sampleBtn.addEventListener('click', () => {
      updateMatrixFromDiagram();
      setTimeout(applyButtonStyles, 100);
    });
  }

  // Hacer las funciones disponibles globalmente
  window.reloadRasciMatrix = () => {
    updateMatrixFromDiagram();
    setTimeout(applyButtonStyles, 100); // Aplicar estilos con un pequeño delay
  };

  // Asegurar que la función cambiarPestana esté disponible
  if (!window.cambiarPestana) {
    window.cambiarPestana = function(tabName) {
      // Obtener todas las pestañas y contenidos
      const tabs = document.querySelectorAll('#rasci-panel .tab');
      const tabContents = document.querySelectorAll('#rasci-panel .tab-content');

      // Remover clase activa de todas las pestañas
      tabs.forEach(tab => {
        tab.classList.remove('active');
      });

      // Ocultar todos los contenidos de pestañas
      tabContents.forEach(content => {
        content.classList.remove('active');
        content.style.display = 'none';
      });

      // Activar la pestaña seleccionada
      const selectedTab = document.querySelector(`#rasci-panel .tab[data-tab="${tabName}"]`);
      const selectedContent = document.querySelector(`#rasci-panel #${tabName}-tab`);

      if (selectedTab && selectedContent) {
        selectedTab.classList.add('active');
        selectedContent.classList.add('active');
        selectedContent.style.display = 'block';
      }
    };
  }

  // Inicializar la matriz con las tareas del diagrama actual
  updateMatrixFromDiagram();

  // Configurar el listener para cambios en el diagrama
  setupDiagramChangeListener();

  // Configurar event listeners para las pestañas como respaldo
  setTimeout(() => {
    const tabs = panel.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        const tabName = this.getAttribute('data-tab');
        if (tabName && window.cambiarPestana) {
          window.cambiarPestana(tabName);
          // Aplicar estilos del botón después del cambio de pestaña
          setTimeout(applyButtonStyles, 200);
        }
      });
    });

    // Aplicar estilos iniciales
    applyButtonStyles();
  }, 100);

}