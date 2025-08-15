// RASCI Matrix Manager
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';

let roles = [];
let autoSaveRasciState = null;

export function renderMatrix(panel, rolesArray, autoSaveFunction) {
  roles = rolesArray || window.rasciRoles || [];
  autoSaveRasciState = autoSaveFunction;
  
  // Verificar si se está importando un proyecto
  const isImportingProject = window.isImportingProject === true;
  
  // Verificar si se ha limpiado el storage recientemente
  const storageWasCleared = window.storageCleared === true;
  
  // Verificar si hay datos antiguos que deben limpiarse
  const shouldClearOldData = !isImportingProject && (
    storageWasCleared || 
    !window.rasciMatrixData || 
    Object.keys(window.rasciMatrixData).length === 0
  );
  
  if (shouldClearOldData) {
    console.log('🧹 Detectados datos antiguos o storage limpiado, reinicializando matriz...');
    window.rasciMatrixData = {};
    
    // Si hay modeler disponible, obtener tareas actuales
    if (window.bpmnModeler) {
      const currentTasks = getBpmnTasks();
      currentTasks.forEach(taskName => {
        const taskRoles = {};
        if (roles && roles.length > 0) {
          roles.forEach(role => {
            taskRoles[role] = '';
          });
        }
        window.rasciMatrixData[taskName] = taskRoles;
      });
      
      // Guardar el estado limpio
      try {
        console.log('✅ Matriz reinicializada y guardada');
      } catch (e) {
        console.warn('Error guardando matriz limpia:', e);
      }
    }
  } else if (!window.rasciMatrixData) {
    // Inicializar matriz vacía si no existe
    window.rasciMatrixData = {};
    console.log('� Matriz RASCI inicializada como vacía');
  }
  
  // matrixBackup eliminado - no se usa localStorage
  
  const mainTab = panel.querySelector('#main-tab');
  const matrixContainer = mainTab ? mainTab.querySelector('#matrix-container') : null;
  
  if (!matrixContainer) {
    return;
  }
  
  matrixContainer.innerHTML = '';

  matrixContainer.style.cssText = `
    width: 100%;
    height: 100%;
    max-height: calc(100vh - 180px);
    flex: 1;
    position: relative;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    background: #fff;
    padding: 0;
    margin: 0;
    overflow: auto;
    display: block;
  `;
  
  const table = document.createElement('table');
  table.className = 'rasci-matrix';
  table.style.cssText = `
    border-collapse: separate;
    border-spacing: 0;
    width: max-content;
    min-width: 500px;
    margin: 0;
    font-family: 'Segoe UI', Roboto, sans-serif;
    font-size: 11px;
    color: #333;
    border-radius: 6px;
    position: relative;
    display: table;
    table-layout: fixed;
  `;

  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const taskHeader = document.createElement('th');
  taskHeader.style.cssText = `
    position: relative;
    background: #f8fafc;
    border-bottom: 2px solid #e2e8f0;
    padding: 12px 16px;
    text-align: center;
    font-weight: 400;
    color: #1f2937;
    min-width: 160px;
    vertical-align: middle;
    font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  
  const taskHeaderContent = document.createElement('div');
  taskHeaderContent.style.cssText = `
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    position: relative;
    height: 100%;
    min-height: 24px;
  `;
  
  const taskText = document.createElement('span');
  taskText.textContent = 'Tarea';
  taskText.style.cssText = `
    font-weight: 600;
    color: #1f2937;
    font-size: 12px;
    text-transform: capitalize;
    letter-spacing: 0.2px;
    line-height: 1.4;
    display: flex;
    align-items: center;
    height: 100%;
    font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
    padding-left: 10px;
    margin-left: 5px;
  `;
  
  const reloadBtn = document.createElement('button');
  reloadBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  reloadBtn.title = 'Recargar tareas del canvas';
  reloadBtn.style.cssText = `
    background: transparent;
    color: #6b7280;
    border: none;
    border-radius: 4px;
    padding: 2px;
    font-size: 11px;
    cursor: pointer;
    transition: all 0.2s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 18px;
    height: 18px;
    line-height: 1;
  `;
  
  reloadBtn.addEventListener('mouseenter', () => {
    reloadBtn.style.cssText = `
      background: #f3f4f6;
      color: #374151;
      border: none;
      border-radius: 4px;
      padding: 2px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      line-height: 1;
    `;
  });
  
  reloadBtn.addEventListener('mouseleave', () => {
    reloadBtn.style.cssText = `
      background: transparent;
      color: #6b7280;
      border: none;
      border-radius: 4px;
      padding: 2px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      line-height: 1;
    `;
  });
  
  reloadBtn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    reloadBtn.style.cssText = `
      background: #e5e7eb;
      color: #374151;
      border: none;
      border-radius: 4px;
      padding: 2px;
      font-size: 11px;
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      justify-content: center;
      min-width: 18px;
      height: 18px;
      line-height: 1;
    `;
    reloadBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    
    // Llamar a la función de recarga forzada
    setTimeout(() => {
      forceReloadMatrix();
      reloadBtn.style.cssText = `
        background: transparent;
        color: #6b7280;
        border: none;
        border-radius: 4px;
        padding: 2px;
        font-size: 11px;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        min-width: 18px;
        height: 18px;
        line-height: 1;
      `;
      reloadBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    }, 500);
  });
  
  taskHeaderContent.appendChild(taskText);
  taskHeaderContent.appendChild(reloadBtn);
  taskHeader.appendChild(taskHeaderContent);
  headerRow.appendChild(taskHeader);

  roles.forEach((role, index) => {
    const roleHeader = document.createElement('th');
    roleHeader.className = 'role-header';
    roleHeader.setAttribute('data-role-index', index);

    const headerContent = document.createElement('div');
    headerContent.className = 'role-header-content';
    headerContent.style.position = 'relative';

    const roleNameSpan = document.createElement('span');
    roleNameSpan.className = 'role-name';
    roleNameSpan.textContent = role;
    roleNameSpan.style.cursor = 'pointer';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-role-btn';
    deleteBtn.textContent = '×';
    deleteBtn.title = 'Eliminar rol';

    roleNameSpan.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!roleHeader.querySelector('input[type="text"]')) {
        setTimeout(() => editRole(index, panel), 0);
      }
    });

    roleNameSpan.addEventListener('dblclick', (e) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      if (!roleHeader.querySelector('input[type="text"]')) {
        setTimeout(() => editRole(index, panel), 0);
      }
    });

    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      showDeleteConfirmModal(index, panel);
    });

    headerContent.appendChild(roleNameSpan);
    headerContent.appendChild(deleteBtn);
    roleHeader.appendChild(headerContent);
    headerRow.appendChild(roleHeader);
  });

  const addRoleHeader = document.createElement('th');
  addRoleHeader.className = 'add-role-header';
  const addBtn = document.createElement('button');
  addBtn.className = 'add-role-btn';
  addBtn.textContent = '+';
  addBtn.title = 'Agregar nuevo rol';
  addBtn.addEventListener('click', () => addNewRole(panel));
  addRoleHeader.appendChild(addBtn);
  headerRow.appendChild(addRoleHeader);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tasks = getBpmnTasks();

  // Asegurar que todas las tareas estén en window.rasciMatrixData
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // Use current roles for rendering
  const currentRoles = roles || window.rasciRoles || [];
  
  // PRESERVAR VALORES EXISTENTES ANTES DE MODIFICAR LA MATRIZ
  const existingValues = {};
  if (window.rasciMatrixData) {
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      existingValues[taskName] = {};
      Object.keys(window.rasciMatrixData[taskName]).forEach(roleName => {
        const value = window.rasciMatrixData[taskName][roleName];
        if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
          existingValues[taskName][roleName] = value;
        }
      });
    });
  }
  
  tasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      // Nueva tarea: inicializar con estructura de roles vacíos
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío solo para nuevas tareas
        });
      }
      
      window.rasciMatrixData[taskName] = taskRoles;
    } else {
      // Tarea existente: preservar valores y agregar roles faltantes
      const existingTask = window.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          if (!(role in existingTask)) {
            // Solo agregar rol faltante con valor vacío
            existingTask[role] = '';
          }
          // IMPORTANTE: Si había un valor preservado, restaurarlo
          else if (existingValues[taskName] && existingValues[taskName][role]) {
            existingTask[role] = existingValues[taskName][role];
          }
        });
      }
    }
  });
  
  // RESTAURAR TODOS LOS VALORES PRESERVADOS
  Object.keys(existingValues).forEach(taskName => {
    if (window.rasciMatrixData[taskName]) {
      Object.keys(existingValues[taskName]).forEach(roleName => {
        if (window.rasciMatrixData[taskName][roleName] !== undefined) {
          window.rasciMatrixData[taskName][roleName] = existingValues[taskName][roleName];
        }
      });
    }
  });

  const tbody = document.createElement('tbody');
  tasks.forEach(task => {
    const row = document.createElement('tr');

    const taskCell = document.createElement('td');
    taskCell.style.cssText = `
      background: #f8fafc;
      border-right: 2px solid #e2e8f0;
      padding: 20px 16px;
      text-align: left;
      font-weight: 600;
      color: #1f2937;
      margin-left: 15px;
      font-size: 12px;
      vertical-align: middle;
      min-width: 160px;
      max-width: 240px;
      word-wrap: break-word;
      position: relative;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    
    const taskNameSpan = document.createElement('span');
    taskNameSpan.textContent = task;
    taskNameSpan.style.cssText = `
      display: block;
      line-height: 1.4;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      font-weight: 600;
      color: #1f2937;
      font-size: 12px;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
      letter-spacing: 0.2px;
      padding-left: 10px;
      margin-left: 5px;
    `;
    
    taskCell.appendChild(taskNameSpan);
    row.appendChild(taskCell);

    currentRoles.forEach(role => {
      const cell = document.createElement('td');
      const container = document.createElement('div');
      container.className = 'rasci-container';
      container.tabIndex = 0;

      const display = document.createElement('div');
      display.className = 'rasci-display';
      container.appendChild(display);

      const rasciColors = {
        R: '#e63946',
        A: '#f77f00',
        S: '#43aa8b',
        C: '#3a86ff',
        I: '#6c757d'
      };

      // Verificar si hay un valor válido para renderizar
      const existingValue = window.rasciMatrixData && window.rasciMatrixData[task] ? 
                           window.rasciMatrixData[task][role] : undefined;
      
      if (existingValue && existingValue !== undefined && existingValue !== '' && 
          ['R', 'A', 'S', 'C', 'I'].includes(existingValue)) {
        const circle = document.createElement('span');
        circle.className = 'rasci-circle';
        circle.textContent = existingValue;
        circle.style.background = rasciColors[existingValue];
        display.appendChild(circle);
        cell.setAttribute('data-value', existingValue);
        cell.classList.add('cell-with-content');
      }

      container.addEventListener('keydown', e => {
        const key = e.key.toUpperCase();

        if (['R', 'A', 'S', 'C', 'I'].includes(key)) {
          e.preventDefault();

          // Validación preventiva para R y A
          if (key === 'R' || key === 'A') {
            const currentTaskData = window.rasciMatrixData && window.rasciMatrixData[task] ? window.rasciMatrixData[task] : {};
            
            // Verificar si ya existe una R o A en esta tarea
            const existingRoles = Object.values(currentTaskData);
            const hasR = existingRoles.some(value => value.includes('R'));
            const hasA = existingRoles.some(value => value.includes('A'));
            
            if (key === 'R' && hasR) {
              // Mostrar feedback visual en lugar de alert
              cell.style.backgroundColor = '#ffebee';
              cell.style.border = '2px solid #f44336';
              setTimeout(() => {
                cell.style.backgroundColor = '';
                cell.style.border = '';
              }, 1000);
              return;
            }
            
            if (key === 'A' && hasA) {
              // Mostrar feedback visual en lugar de alert
              cell.style.backgroundColor = '#ffebee';
              cell.style.border = '2px solid #f44336';
              setTimeout(() => {
                cell.style.backgroundColor = '';
                cell.style.border = '';
              }, 1000);
              return;
            }
          }

          container.classList.remove('rasci-ready');
          cell.classList.remove('cell-ready');

          display.innerHTML = '';
          const circle = document.createElement('span');
          circle.className = 'rasci-circle';
          circle.textContent = key;
          circle.style.background = rasciColors[key];
          display.appendChild(circle);

          if (!window.rasciMatrixData) window.rasciMatrixData = {};
          if (!window.rasciMatrixData[task]) window.rasciMatrixData[task] = {};
          window.rasciMatrixData[task][role] = key;
          cell.setAttribute('data-value', key);
          cell.classList.add('cell-with-content');
          
          // Guardado inmediato al cambiar valor en la matriz
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          // Guardado adicional para asegurar persistencia
          if (typeof window.forceSaveRasciState === 'function') {
            setTimeout(() => {
              window.forceSaveRasciState();
            }, 50);
          }
          
          if (typeof window.onRasciMatrixUpdated === 'function') {
            setTimeout(() => {
              window.onRasciMatrixUpdated();
            }, 100);
          }

          // Validar matriz en tiempo real (más lento para evitar recargas constantes)
          setTimeout(() => {
            rasciUIValidator.forceValidation();
          }, 500);

        } else if (['-', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
          e.preventDefault();

          container.classList.remove('rasci-ready');
          cell.classList.remove('cell-ready', 'cell-with-content');

          display.innerHTML = '';
          if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
            delete window.rasciMatrixData[task][role];
          }
          cell.removeAttribute('data-value');
          
          // Guardado inmediato al borrar valor en la matriz
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          // Guardado adicional para asegurar persistencia
          if (typeof window.forceSaveRasciState === 'function') {
            setTimeout(() => {
              window.forceSaveRasciState();
            }, 50);
          }
          
          if (typeof window.onRasciMatrixUpdated === 'function') {
            setTimeout(() => {
              window.onRasciMatrixUpdated();
            }, 100);
          }

          // Validar matriz en tiempo real (más lento para evitar recargas constantes)
          setTimeout(() => {
            rasciUIValidator.forceValidation();
          }, 500);
        }
      });

      container.addEventListener('click', e => {
        e.preventDefault();
        container.focus();
      });

      container.addEventListener('focus', () => {
        container.classList.add('rasci-ready');
        cell.classList.add('cell-ready');
      });

      container.addEventListener('blur', () => {
        container.classList.remove('rasci-ready');
        if (!cell.hasAttribute('data-value')) {
          cell.classList.remove('cell-ready');
        }
      });

      cell.appendChild(container);
      row.appendChild(cell);
    });

    // Celda vacía al final
    const emptyCell = document.createElement('td');
    emptyCell.style.border = 'none';
    emptyCell.style.background = 'transparent';
    row.appendChild(emptyCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  matrixContainer.appendChild(table);
  
  // Validación automática después de renderizar la matriz (una sola vez)
  setTimeout(() => {
    if (window.rasciUIValidator && typeof window.rasciUIValidator.autoValidateAfterMatrixUpdate === 'function') {
      window.rasciUIValidator.autoValidateAfterMatrixUpdate();
    }
  }, 500);
}

// Función para obtener tareas del diagrama BPMN
export function getBpmnTasks() {
  if (!window.bpmnModeler) {
    return [];
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  const tasks = [];

  elementRegistry.forEach(element => {
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
      const taskName = (element.businessObject && element.businessObject.name) || element.id;
      
      if (taskName && !tasks.includes(taskName)) {
        tasks.push(taskName);
      }
    }
  });
  
  return tasks;
}

  // Función para actualizar matriz desde el diagrama (PRESERVANDO RESPONSABILIDADES)
  export function updateMatrixFromDiagram() {
  console.log('🔄 updateMatrixFromDiagram - PRESERVANDO responsabilidades existentes');
  
  if (!window.bpmnModeler) {
    return;
  }

  // PASO 1: PRESERVAR todas las responsabilidades existentes ANTES de hacer cambios
  const preservedValues = preserveRasciValues();
  
  // Obtener las tareas actuales del diagrama
  const currentTasks = getBpmnTasks();
  
  // Asegurar que window.rasciMatrixData existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // existingDataBackup eliminado - no se usa localStorage
    
      // Añadir nuevas tareas al window.rasciMatrixData si no existen
  let hasNewTasks = false;
  
  // Use global roles if local roles are not available + DETECTAR ROLES RALPH DEL CANVAS
  let currentRoles = roles || window.rasciRoles || [];
  
  // SIEMPRE DETECTAR ROLES RALPH DEL CANVAS Y AGREGARLOS
  if (typeof window.detectRalphRolesFromCanvas === 'function') {
    try {
      const detectedRalphRoles = window.detectRalphRolesFromCanvas();
      if (detectedRalphRoles && detectedRalphRoles.length > 0) {
        console.log(`🔍 ${detectedRalphRoles.length} roles RALph detectados en canvas:`, detectedRalphRoles);
        
        // Agregar roles RALph detectados que no estén ya en currentRoles
        detectedRalphRoles.forEach(ralphRole => {
          if (!currentRoles.includes(ralphRole)) {
            currentRoles.push(ralphRole);
            console.log(`➕ Rol RALph agregado: ${ralphRole}`);
          }
        });
        
        // Actualizar roles globales con los roles RALph detectados
        window.rasciRoles = [...currentRoles];
      }
    } catch (e) {
      console.warn('Error detectando roles RALph:', e);
    }
  }
  
  currentTasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      // Nueva tarea: inicializar con estructura de roles vacíos
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío solo para nuevas tareas
        });
      }
      
      window.rasciMatrixData[taskName] = taskRoles;
      hasNewTasks = true;
      console.log(`➕ Nueva tarea agregada: ${taskName}`);
    } else {
      // Tarea existente: PRESERVAR valores existentes y solo agregar roles nuevos
      const existingTaskRoles = window.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.length > 0) {
        let taskUpdated = false;
        currentRoles.forEach(role => {
          if (!(role in existingTaskRoles)) {
            // Solo agregar nuevo rol con valor vacío, NO tocar valores existentes
            existingTaskRoles[role] = '';
            taskUpdated = true;
            console.log(`➕ Nuevo rol agregado a tarea existente: ${taskName}[${role}]`);
          } else {
            // IMPORTANTE: NO modificar valores existentes
            console.log(`✅ Preservando valor existente: ${taskName}[${role}] = "${existingTaskRoles[role]}"`);
          }
        });
        if (taskUpdated) {
          hasNewTasks = true;
        }
      }
    }
  });
    
      // PREVENIR SOBRESCRITURA DE VALORES EXISTENTES
    if (typeof window.preventOverwriteExistingValues === 'function') {
      window.preventOverwriteExistingValues();
    }
    
    // PASO FINAL: RESTAURAR TODAS LAS RESPONSABILIDADES PRESERVADAS
    const finalRestoredCount = restoreRasciValues(preservedValues);
    
    if (finalRestoredCount > 0) {
      console.log(`✅ ${finalRestoredCount} responsabilidades RASCI finalmente restauradas`);
      // Guardar inmediatamente después de restaurar
      if (autoSaveRasciState) {
        autoSaveRasciState();
      }
    }
    
    // Eliminar tareas que ya no existen en el diagrama
    const existingTasks = Object.keys(window.rasciMatrixData);
    
    existingTasks.forEach(taskName => {
      if (!currentTasks.includes(taskName)) {
        delete window.rasciMatrixData[taskName];
        hasNewTasks = true;
      }
    });

    // Solo recargar visualmente si hay cambios significativos
    if (hasNewTasks) {
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, currentRoles, autoSaveRasciState);
      }
    }
    
    // ASEGURAR QUE LOS ROLES GLOBALES ESTÉN SIEMPRE ACTUALIZADOS
    if (currentRoles && currentRoles.length > 0) {
      window.rasciRoles = [...currentRoles];
    }
    
    // Validación sin recargo visual
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.autoValidateAfterMatrixUpdate === 'function') {
        window.rasciUIValidator.autoValidateAfterMatrixUpdate();
      } else if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
      
      // Validación adicional específica para tareas vacías
      if (window.rasciUIValidator && typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
        window.rasciUIValidator.validateEmptyTasks();
      }
    }, 200);
  }

  // Función para configurar listener de cambios en el diagrama
  export function setupDiagramChangeListener() {
    if (!window.bpmnModeler) {
      return;
    }

    const eventBus = window.bpmnModeler.get('eventBus');
    eventBus.on('element.changed', () => {
      setTimeout(() => {
        updateMatrixFromDiagram();
      }, 500); // Más lento para evitar recargas constantes
    });
  }

// Función para agregar nuevo rol
export function addNewRole(panel, rolesArray, autoSaveFunction) {
  roles = rolesArray || roles;
  autoSaveRasciState = autoSaveFunction || autoSaveRasciState;
  
  const newRoleName = `Rol ${roles.length + 1}`;
  roles.push(newRoleName);
  
  // Update global roles
  window.rasciRoles = roles;
  
  if (autoSaveRasciState) autoSaveRasciState();
  
  renderMatrix(panel, roles, autoSaveRasciState);

  // Validar matriz después de agregar rol (más lento)
  setTimeout(() => {
    rasciUIValidator.forceValidation();
  }, 1000);
}

// Función para hacer editable un rol
function makeRoleEditable(roleHeader, roleIndex) {
  const roleNameSpan = roleHeader.querySelector('.role-name');
  const currentName = roleNameSpan.textContent;

  // Crear input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'role-edit-input';
  input.value = currentName;
  input.style.cssText = `
    width: 100px;
    padding: 2px 4px;
    border: none;
    border-radius: 0;
    font-size: inherit;
    font-family: inherit;
    font-weight: inherit;
    text-align: center;
    background: transparent;
    color: #2d3748;
    outline: none;
    box-shadow: none;
    z-index: 1000;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    transition: background-color 0.2s ease;
    box-sizing: border-box;
  `;

  // Ocultar span original
  roleNameSpan.style.visibility = 'hidden';

  // Agregar input
  roleHeader.appendChild(input);

  // Focus y seleccionar todo
  setTimeout(() => {
    input.focus();
    input.select();
  }, 0);

  const originalPreventDefault = Event.prototype.preventDefault;
  const originalStopPropagation = Event.prototype.stopPropagation;

  function restoreDocumentMethods() {
    Event.prototype.preventDefault = originalPreventDefault;
    Event.prototype.stopPropagation = originalStopPropagation;
  }

  function saveChanges() {
    // Verificar si el input aún existe antes de procesar
    if (!input || !document.contains(input)) {
      restoreView();
      return;
    }
    
    const newName = input.value.trim();
    
    if (newName && newName !== currentName) {
      // 🔄 SINCRONIZACIÓN CON CANVAS: Actualizar etiquetas de roles en el canvas
      updateCanvasRoleLabels(currentName, newName);
      
      roles[roleIndex] = newName;
      roleNameSpan.textContent = newName;
      
      // Guardado inmediato al editar rol
      if (autoSaveRasciState) autoSaveRasciState();
      
      // Guardado adicional para asegurar persistencia
      if (typeof window.forceSaveRasciState === 'function') {
        setTimeout(() => {
          window.forceSaveRasciState();
        }, 10);
      }

      // Validar matriz después de editar rol (más lento)
      setTimeout(() => {
        if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
          window.rasciUIValidator.forceValidation();
        }
      }, 1000);
    }
    
    restoreView();
  }

  function restoreView() {
    roleNameSpan.style.visibility = 'visible';
    
    // Verificar si el input existe y está en el DOM antes de intentar eliminarlo
    if (input && input.parentNode && document.contains(input)) {
        input.parentNode.removeChild(input);
    }
    
    restoreDocumentMethods();
  }
  
  // RESTAURAR VALORES DESPUÉS DEL RENDERIZADO - eliminado (no se usa localStorage)

  function setupInputEventListeners(inputElement) {
    inputElement.addEventListener('blur', saveChanges);
    inputElement.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        saveChanges();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        restoreView();
      }
    });
  }

  setupInputEventListeners(input);
}

// Función para actualizar etiquetas de roles en el canvas cuando se cambia el nombre en RASCI
function updateCanvasRoleLabels(oldName, newName) {
  console.log(`🔄 Sincronizando rol en canvas: "${oldName}" → "${newName}"`);
  
  if (!window.bpmnModeler) {
    console.warn('⚠️ Modeler no disponible para sincronización');
    return;
  }
  
  try {
    const elementRegistry = window.bpmnModeler.get('elementRegistry');
    const modeling = window.bpmnModeler.get('modeling');
    
    if (!elementRegistry || !modeling) {
      console.warn('⚠️ ElementRegistry o Modeling no disponible');
      return;
    }
    
    let updatedElements = 0;
    
    // Buscar y actualizar elementos RALPH Role que coincidan con el nombre anterior
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:RoleRALph' || 
          element.type === 'ralph:Role' ||
          element.type === 'RALph:Role' ||
          element.type === 'ralph:RoleRALph' ||
          (element.type && element.type.includes('RALph') && element.type.includes('Role'))) {
        
        const currentName = element.businessObject && element.businessObject.name ? 
                           element.businessObject.name : 
                           (element.name || '');
        
        // Si el nombre actual coincide con el nombre anterior, actualizarlo
        if (currentName === oldName) {
          console.log(`🎯 Actualizando elemento ${element.id}: "${oldName}" → "${newName}"`);
          
          // Actualizar el nombre usando modeling
          modeling.updateProperties(element, {
            name: newName
          });
          
          updatedElements++;
        }
      }
    });
    
    if (updatedElements > 0) {
      console.log(`✅ ${updatedElements} elemento(s) del canvas actualizados`);
      
      // Notificar al usuario
      showTemporaryMessage(`✅ Rol "${newName}" sincronizado en el canvas`, 'success');
    } else {
      console.log(`ℹ️ No se encontraron elementos en el canvas con el nombre "${oldName}"`);
    }
  } catch (error) {
    console.error('❌ Error al sincronizar rol con canvas:', error);
    showTemporaryMessage('⚠️ Error al sincronizar con el canvas', 'warning');
  }
}

// Función para mostrar mensajes temporales al usuario
function showTemporaryMessage(message, type = 'info') {
  // Crear elemento de mensaje
  const messageDiv = document.createElement('div');
  messageDiv.textContent = message;
  messageDiv.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 10px 15px;
    border-radius: 5px;
    color: white;
    font-weight: bold;
    z-index: 10000;
    font-size: 14px;
    max-width: 300px;
    text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    ${type === 'success' ? 'background-color: #28a745;' : 
      type === 'warning' ? 'background-color: #ffc107; color: #212529;' : 
      'background-color: #007bff;'}
  `;
  
  document.body.appendChild(messageDiv);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    if (messageDiv && messageDiv.parentNode) {
      messageDiv.parentNode.removeChild(messageDiv);
    }
  }, 3000);
}

// Función para editar rol
export function editRole(roleIndex, panel) {
  const roleHeader = panel.querySelector(`[data-role-index="${roleIndex}"]`);
  if (roleHeader) {
    makeRoleEditable(roleHeader, roleIndex);
  }
}

// Función para mostrar modal de confirmación de eliminación
export function showDeleteConfirmModal(roleIndex, panel) {
  const roleName = roles[roleIndex];
  
  // Crear modal
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">Eliminar Rol</h3>
      <p class="modal-message">¿Estás seguro de que quieres eliminar el rol "${roleName}"? Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="modal-btn" id="cancel-delete">Cancelar</button>
        <button class="modal-btn danger" id="confirm-delete">Eliminar</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function closeModal() {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  function confirmDelete() {
    deleteRole(roleIndex, panel);
    closeModal();
  }

  // Event listeners
  modal.querySelector('#cancel-delete').addEventListener('click', closeModal);
  modal.querySelector('#confirm-delete').addEventListener('click', confirmDelete);

  // Cerrar con Escape
  document.addEventListener('keydown', function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  });
}

// Función para eliminar rol
export function deleteRole(roleIndex, panel) {
  roles.splice(roleIndex, 1);
  
  // Guardado inmediato al eliminar rol
  if (autoSaveRasciState) autoSaveRasciState();
  
  // Guardado adicional para asegurar persistencia
  if (typeof window.forceSaveRasciState === 'function') {
    setTimeout(() => {
      window.forceSaveRasciState();
    }, 10);
  }
  
  renderMatrix(panel, roles, autoSaveRasciState);

  // Validar matriz después de eliminar rol (más lento)
  setTimeout(() => {
    rasciUIValidator.forceValidation();
  }, 1000);
}

// Configurar función global para actualizar matriz
  window.updateMatrixFromDiagram = updateMatrixFromDiagram;
  window.detectRalphRolesFromCanvas = detectRalphRolesFromCanvas;
  window.forceDetectRalphRoles = forceDetectRalphRoles;

// Función global para recargar la matriz RASCI (preserva datos)
window.reloadRasciMatrix = function() {
  console.log('🔄 reloadRasciMatrix llamado - PRESERVANDO DATOS');
  
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    console.log('🎯 Recargando matriz RASCI (solo visual)...');
    // Solo recargar visualmente, sin modificar datos
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado en reloadRasciMatrix');
  }
};

// Función específica para recarga manual desde botón (preserva datos)
window.manualReloadRasciMatrix = function() {
  console.log('🔄 Recarga manual solicitada - PRESERVANDO DATOS');
  
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    console.log('🎯 Ejecutando recarga manual (solo visual)...');
    // Solo recargar visualmente, sin modificar datos
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado en recarga manual');
  }
};

// Función global para forzar la detección de nuevas tareas y validación
export function forceDetectNewTasks() {
  if (!window.bpmnModeler) {
    return;
  }
  
  // Obtener tareas actuales
  const currentTasks = getBpmnTasks();
  
  // Asegurar que window.rasciMatrixData existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // Añadir nuevas tareas si no existen
  let hasNewTasks = false;
  currentTasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      // Inicializar la tarea con estructura de roles vacíos para que el validador la detecte
      const taskRoles = {};
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío para que el validador detecte la estructura
        });
      }
      
      window.rasciMatrixData[taskName] = taskRoles;
      hasNewTasks = true;
    }
  });
  
  if (hasNewTasks) {
    // Forzar validación inmediata
    setTimeout(() => {
      if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
      if (window.rasciUIValidator && typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
        window.rasciUIValidator.validateEmptyTasks();
      }
    }, 100);
  }
}

// Hacer la función disponible globalmente
window.forceDetectNewTasks = forceDetectNewTasks;

// Función global para forzar la detección y validación completa
window.forceDetectAndValidate = () => {
  forceDetectNewTasks();
  
  // También forzar validación después de un breve delay
  setTimeout(() => {
    if (window.rasciUIValidator && typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
      window.rasciUIValidator.validateEmptyTasks();
    }
    if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
      window.rasciUIValidator.forceValidation();
    }
  }, 200);
};

// Función global para diagnóstico completo del estado
window.diagnoseRasciState = () => {
  const bpmnModelerInfo = {
    available: !!window.bpmnModeler,
    type: typeof window.bpmnModeler
  };
  
  // 2. Obtener tareas del BPMN
  const bpmnTasks = getBpmnTasks();
  
  const rasciMatrixDataInfo = {
    exists: !!window.rasciMatrixData,
    type: typeof window.rasciMatrixData,
    keys: window.rasciMatrixData ? Object.keys(window.rasciMatrixData) : [],
    data: window.rasciMatrixData
  };
  
  const roles = getRasciRoles();
  const rolesInfo = {
    roles: roles,
    count: roles ? roles.length : 0
  };
  
  const uiValidatorInfo = {
    exists: !!window.rasciUIValidator,
    type: typeof window.rasciUIValidator,
    hasValidateEmptyTasks: window.rasciUIValidator ? typeof window.rasciUIValidator.validateEmptyTasks === 'function' : false,
    hasForceValidation: window.rasciUIValidator ? typeof window.rasciUIValidator.forceValidation === 'function' : false
  };
  
  const localStorageInfo = {
    // localStorage eliminado del panel RASCI
  };
  
  const rasciPanel = document.querySelector('#rasci-panel');
  const panelInfo = {
    exists: !!rasciPanel,
    id: rasciPanel ? rasciPanel.id : null
  };
  
  // Diagnóstico simplificado - sin localStorage
  
  console.log('🔍 Diagnóstico RASCI:', {
    bpmnModeler: bpmnModelerInfo,
    tareas: bpmnTasks,
    matriz: rasciMatrixDataInfo,
    roles: rolesInfo,
    validador: uiValidatorInfo,
    localStorage: localStorageInfo,
    panel: panelInfo
  });
};

// Función para obtener roles RASCI
function getRasciRoles() {
  return window.rasciRoles || [];
}

// Función global para forzar sincronización completa
window.forceFullSync = () => {
  // 1. Obtener tareas del BPMN
  const bpmnTasks = getBpmnTasks();
  
  // 2. Asegurar que window.rasciMatrixData existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // 3. Sincronizar completamente
  // changes eliminado - no se usa
  
  // Añadir tareas faltantes
  bpmnTasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      const taskRoles = {};
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          taskRoles[role] = '';
        });
      }
      window.rasciMatrixData[taskName] = taskRoles;
      // changes++ eliminado
    }
  });
  
  // Eliminar tareas extra
  const matrixTasks = Object.keys(window.rasciMatrixData);
  matrixTasks.forEach(taskName => {
    if (!bpmnTasks.includes(taskName)) {
      delete window.rasciMatrixData[taskName];
      // changes++ eliminado
    }
  });
  
  // 4. Forzar validación
  setTimeout(() => {
    if (window.rasciUIValidator) {
      if (typeof window.rasciUIValidator.validateEmptyTasks === 'function') {
        window.rasciUIValidator.validateEmptyTasks();
      }
      if (typeof window.rasciUIValidator.forceValidation === 'function') {
        window.rasciUIValidator.forceValidation();
      }
    }
  }, 100);
};

// Función para forzar la recarga completa de la matriz
export function forceReloadMatrix() {
  console.log('🔄 forceReloadMatrix llamado');
  
  // Verificar si se está importando un proyecto
  const isImportingProject = window.isImportingProject === true;
  
  // SIEMPRE PRESERVAR responsabilidades existentes antes de cualquier operación
  let preservedResponsibilities = {};
  if (window.rasciMatrixData) {
    Object.keys(window.rasciMatrixData).forEach(taskName => {
      preservedResponsibilities[taskName] = {};
      Object.keys(window.rasciMatrixData[taskName]).forEach(roleName => {
        const value = window.rasciMatrixData[taskName][roleName];
        if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
          preservedResponsibilities[taskName][roleName] = value;
        }
      });
    });
  }
  
  const totalPreservedValues = Object.values(preservedResponsibilities)
    .reduce((total, taskRoles) => total + Object.keys(taskRoles).length, 0);
    
  if (totalPreservedValues > 0) {
    console.log(`🛡️ Preservando ${totalPreservedValues} responsabilidades RASCI antes de recargar`);
  }
  
  if (isImportingProject) {
    console.log('📦 Proyecto en importación detectado, preservando datos importados...');
    
    // Inicializar datos sin localStorage
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
    }
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
  } else {
    // NO LIMPIAR completamente los datos - solo estructurar
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
    }
    
    // Inicializar roles si no existen
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
  }
  
  if (!window.bpmnModeler) {
    console.warn('⚠️ BPMN Modeler no disponible');
    // Aún así, limpiar la matriz visual
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      renderMatrix(rasciPanel, window.rasciRoles || [], null);
    }
    return;
  }

  // Obtener las tareas actuales del diagrama
  const currentTasks = getBpmnTasks();
  console.log('📋 Tareas actuales:', currentTasks);
  
  if (isImportingProject) {
    // Si se está importando, solo agregar tareas faltantes sin limpiar datos existentes
    let changes = 0;
    currentTasks.forEach(taskName => {
      if (!window.rasciMatrixData[taskName]) {
        console.log(`➕ Agregando tarea faltante: ${taskName}`);
        const taskRoles = {};
        if (window.rasciRoles && window.rasciRoles.length > 0) {
          window.rasciRoles.forEach(role => {
            taskRoles[role] = '';
          });
        }
        window.rasciMatrixData[taskName] = taskRoles;
        changes++;
      }
    });
    
    console.log(`📊 Matriz actualizada con datos importados (${changes} cambios)`);
  } else {
    // Preservar responsabilidades existentes antes de actualizar la matriz
    const existingData = { ...window.rasciMatrixData };
    console.log('💾 Preservando datos existentes antes de actualizar matriz');
    
    // Reinicializar matriz pero preservando responsabilidades
    window.rasciMatrixData = {};
    currentTasks.forEach(taskName => {
      console.log(`➕ Agregando tarea: ${taskName}`);
      const taskRoles = {};
      if (window.rasciRoles && window.rasciRoles.length > 0) {
        window.rasciRoles.forEach(role => {
          // Preservar responsabilidad existente si existe, sino vacía
          const existingValue = existingData[taskName] && existingData[taskName][role];
          taskRoles[role] = existingValue || '';
          if (existingValue) {
            console.log(`💾 Preservando responsabilidad: ${taskName} -> ${role} = "${existingValue}"`);
          }
        });
      }
      window.rasciMatrixData[taskName] = taskRoles;
    });
    
    console.log('📊 Matriz actualizada preservando responsabilidades existentes');
  }
  
  // RESTAURAR responsabilidades preservadas en cualquier caso
  if (totalPreservedValues > 0) {
    console.log('🔄 Restaurando responsabilidades preservadas...');
    let restoredCount = 0;
    
    Object.keys(preservedResponsibilities).forEach(taskName => {
      if (window.rasciMatrixData[taskName]) {
        Object.keys(preservedResponsibilities[taskName]).forEach(roleName => {
          if (window.rasciMatrixData[taskName][roleName] !== undefined) {
            window.rasciMatrixData[taskName][roleName] = preservedResponsibilities[taskName][roleName];
            restoredCount++;
            console.log(`✅ Restaurado: ${taskName}[${roleName}] = "${preservedResponsibilities[taskName][roleName]}"`);
          }
        });
      }
    });
    
    console.log(`✅ ${restoredCount} responsabilidades restauradas de ${totalPreservedValues} preservadas`);
  }
  
  // localStorage eliminado del panel RASCI
  
  
  // Forzar recarga visual
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    console.log('🎯 Recargando matriz visualmente...');
    renderMatrix(rasciPanel, window.rasciRoles || [], null);
  } else {
    console.warn('⚠️ Panel RASCI no encontrado en forceReloadMatrix');
  }
  
  // Validación después de recargar
  setTimeout(() => {
    if (window.rasciUIValidator && typeof window.rasciUIValidator.forceValidation === 'function') {
      window.rasciUIValidator.forceValidation();
    }
  }, 300);
}

// Función para preservar responsabilidades RASCI existentes
function preserveRasciValues() {
  if (!window.rasciMatrixData) {
    return {};
  }
  
  const preserved = {};
  let totalPreserved = 0;
  
  Object.keys(window.rasciMatrixData).forEach(taskName => {
    preserved[taskName] = {};
    Object.keys(window.rasciMatrixData[taskName]).forEach(roleName => {
      const value = window.rasciMatrixData[taskName][roleName];
      if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
        preserved[taskName][roleName] = value;
        totalPreserved++;
      }
    });
  });
  
  if (totalPreserved > 0) {
    console.log(`🛡️ ${totalPreserved} responsabilidades RASCI preservadas`);
  }
  
  return preserved;
}

// Función para restaurar responsabilidades RASCI preservadas
function restoreRasciValues(preserved) {
  if (!preserved || !window.rasciMatrixData) {
    return 0;
  }
  
  let restoredCount = 0;
  
  Object.keys(preserved).forEach(taskName => {
    if (window.rasciMatrixData[taskName]) {
      Object.keys(preserved[taskName]).forEach(roleName => {
        if (window.rasciMatrixData[taskName][roleName] !== undefined) {
          window.rasciMatrixData[taskName][roleName] = preserved[taskName][roleName];
          restoredCount++;
        }
      });
    }
  });
  
  if (restoredCount > 0) {
    console.log(`✅ ${restoredCount} responsabilidades RASCI restauradas`);
  }
  
  return restoredCount;
}

// Función para detectar roles RALPH del canvas SOLO PARA LECTURA (NO INVASIVA)
export function detectRalphRolesFromCanvas() {
  console.log('🔍 Detectando roles RALPH del canvas (solo lectura)...');
  
  if (!window.bpmnModeler) {
    console.warn('⚠️ Modeler no disponible');
    return [];
  }
  
  const elementRegistry = window.bpmnModeler.get('elementRegistry');
  if (!elementRegistry) {
    console.warn('⚠️ ElementRegistry no disponible');
    return [];
  }
  
  // Detectar roles RALPH del canvas SOLO PARA LECTURA
  const ralphRoles = [];
  
  elementRegistry.forEach(element => {
    // Buscar elementos RALPH con diferentes variaciones de tipo
    if (element.type === 'RALph:RoleRALph' || 
        element.type === 'ralph:Role' ||
        element.type === 'RALph:Role' ||
        element.type === 'ralph:RoleRALph' ||
        (element.type && element.type.includes('RALph') && element.type.includes('Role'))) {
      
      const roleName = element.businessObject && element.businessObject.name ? 
                      element.businessObject.name : 
                      (element.name || element.id || 'Rol sin nombre');
      
      if (roleName && !ralphRoles.includes(roleName)) {
        ralphRoles.push(roleName);
      }
    }
  });
  

  
  // NO MODIFICAR NADA DEL CANVAS - SOLO DETECTAR PARA INFORMACIÓN
  // Los roles detectados se pueden usar para sugerencias pero no se modifican automáticamente
  
  return ralphRoles;
}



// Función para forzar detección de roles RALPH (SOLO CUANDO SE SOLICITA MANUALMENTE)
export function forceDetectRalphRoles() {
  const detectedRoles = detectRalphRolesFromCanvas();
  
  if (detectedRoles.length > 0) {
    
    // SOLO AGREGAR ROLES NUEVOS A LA MATRIZ RASCI (NO MODIFICAR CANVAS)
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
    
    let addedNewRoles = false;
    detectedRoles.forEach(roleName => {
      if (!window.rasciRoles.includes(roleName)) {
        window.rasciRoles.push(roleName);
        addedNewRoles = true;
      }
    });
    
    // SIEMPRE actualizar la matriz de datos con los roles detectados (aunque ya existan)
    if (window.rasciMatrixData) {
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        detectedRoles.forEach(roleName => {
                      if (!(roleName in window.rasciMatrixData[taskName])) {
              // NO ESTABLECER VALOR VACÍO - DEJAR QUE EL USUARIO LO ASIGNE
              window.rasciMatrixData[taskName][roleName] = undefined;

              addedNewRoles = true; // Marcar que se agregó algo
              
              // Guardado inmediato al agregar nuevo rol
              if (typeof window.forceSaveRasciState === 'function') {
                setTimeout(() => {
                  window.forceSaveRasciState();
                }, 10);
              }
            }
        });
      });
    }
    
    if (addedNewRoles) {
      // PREVENIR SOBRESCRITURA DE VALORES EXISTENTES
      if (typeof window.preventOverwriteExistingValues === 'function') {
        window.preventOverwriteExistingValues();
      }
      
      // localStorage eliminado del panel RASCI
      
      // Re-renderizar matriz con roles actualizados
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, window.rasciRoles, null);
      }
    }
  }
  
  return detectedRoles;
}
