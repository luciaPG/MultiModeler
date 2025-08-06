// RASCI Matrix Manager - Matrix rendering and role management
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';

let roles = [];
let autoSaveRasciState = null;

export function renderMatrix(panel, rolesArray, autoSaveFunction) {
  // Use provided roles or fall back to global roles
  roles = rolesArray || window.rasciRoles || [];
  autoSaveRasciState = autoSaveFunction;
  
  console.log('🎨 renderMatrix llamado con roles:', roles);
  console.log('🎨 Matriz actual en renderMatrix:', window.rasciMatrixData);
  
  // Asegurar que window.rasciMatrixData esté cargado desde localStorage
  if (!window.rasciMatrixData) {
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
  
  // Crear una copia de seguridad antes de cualquier modificación
  const matrixBackup = JSON.parse(JSON.stringify(window.rasciMatrixData));
  console.log('💾 Backup de matriz antes de renderizar:', matrixBackup);
  
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
  
  tasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      // Inicializar la tarea con estructura de roles vacíos para que el validador la detecte
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío para que el validador detecte la estructura
        });
      }
      
      window.rasciMatrixData[taskName] = taskRoles;
    } else {
      // Preservar tarea existente y solo agregar roles faltantes
      const existingTask = window.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          if (!(role in existingTask)) {
            existingTask[role] = ''; // Solo agregar rol faltante con valor vacío
          }
        });
      }
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
        console.log(`🎯 Renderizando valor: ${task}.${role} = "${existingValue}"`);
        const circle = document.createElement('span');
        circle.className = 'rasci-circle';
        circle.textContent = existingValue;
        circle.style.background = rasciColors[existingValue];
        display.appendChild(circle);
        cell.setAttribute('data-value', existingValue);
        cell.classList.add('cell-with-content');
      } else {
        console.log(`🔍 Sin valor para renderizar: ${task}.${role} = "${existingValue}"`);
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

  // Función para actualizar matriz desde el diagrama (sin recargo visual)
  export function updateMatrixFromDiagram() {
  console.log('🔄 updateMatrixFromDiagram llamado');
  
  if (!window.bpmnModeler) {
    return;
  }

    // Obtener las tareas actuales del diagrama
    const currentTasks = getBpmnTasks();
    console.log('📋 Tareas actuales:', currentTasks);
    console.log('📋 Matriz antes de actualizar:', window.rasciMatrixData);
    
    // Asegurar que window.rasciMatrixData existe
    if (!window.rasciMatrixData) {
      window.rasciMatrixData = {};
    }
    
    // Crear una copia de seguridad de los datos existentes para evitar sobrescritura
    const existingDataBackup = JSON.parse(JSON.stringify(window.rasciMatrixData));
    console.log('💾 Backup de datos existentes:', existingDataBackup);
    
      // Añadir nuevas tareas al window.rasciMatrixData si no existen
  let hasNewTasks = false;
  
  // Use global roles if local roles are not available (NO DETECTAR ROLES RALPH AUTOMÁTICAMENTE)
  const currentRoles = roles || window.rasciRoles || [];
  
  currentTasks.forEach(taskName => {
    console.log(`🔍 Procesando tarea: ${taskName}`);
    console.log(`🔍 Estado actual de la tarea:`, window.rasciMatrixData[taskName]);
    
    if (!window.rasciMatrixData[taskName]) {
      console.log(`➕ Creando nueva tarea: ${taskName}`);
      // Inicializar la tarea con estructura de roles vacíos para que el validador la detecte
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío para que el validador detecte la estructura
        });
      }
      
      window.rasciMatrixData[taskName] = taskRoles;
      hasNewTasks = true;
    } else {
      console.log(`✅ Tarea existente: ${taskName}, preservando datos`);
      // Preservar tareas existentes pero asegurar que tengan todos los roles actuales
      const existingTaskRoles = window.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.length > 0) {
        let taskUpdated = false;
        currentRoles.forEach(role => {
          if (!(role in existingTaskRoles)) {
            console.log(`➕ Añadiendo nuevo rol ${role} a tarea ${taskName}`);
            existingTaskRoles[role] = ''; // Añadir nuevo rol con valor vacío
            taskUpdated = true;
          }
        });
        if (taskUpdated) {
          hasNewTasks = true;
        }
      }
    }
      });
    
      // PREVENIR SOBRESCRITURA DE VALORES EXISTENTES
    console.log('🛡️ Preveniendo sobrescritura de valores existentes...');
    if (typeof window.preventOverwriteExistingValues === 'function') {
      window.preventOverwriteExistingValues();
    }
    
    // RESTAURAR VALORES QUE SE HAYAN SOBRESCRITO
    console.log('🔄 Restaurando valores sobrescritos...');
    let restoredCount = 0;
    Object.keys(existingDataBackup).forEach(taskName => {
      if (window.rasciMatrixData[taskName]) {
        Object.keys(existingDataBackup[taskName]).forEach(roleName => {
          const backupValue = existingDataBackup[taskName][roleName];
          const currentValue = window.rasciMatrixData[taskName][roleName];
          
          // Si el valor de backup no está vacío y el valor actual está vacío, restaurar
          if (backupValue && backupValue !== '' && currentValue === '') {
            console.log(`🔄 Restaurando valor: ${taskName}.${roleName} = "${backupValue}"`);
            window.rasciMatrixData[taskName][roleName] = backupValue;
            restoredCount++;
          }
        });
      }
    });
  
  if (restoredCount > 0) {
    console.log(`✅ Restaurados ${restoredCount} valores sobrescritos`);
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

    console.log('📋 Matriz después de actualizar:', window.rasciMatrixData);
    
    // Solo recargar visualmente si hay cambios significativos
    if (hasNewTasks) {
      console.log('🔄 Recargando matriz visualmente debido a cambios...');
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, currentRoles, autoSaveRasciState);
      }
    } else {
      console.log('✅ No hay cambios significativos, no se recarga visualmente');
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
      try {
        input.parentNode.removeChild(input);
              } catch (error) {
          // Input ya fue eliminado o movido
        }
    }
    
    restoreDocumentMethods();
  }
  
  // RESTAURAR VALORES DESPUÉS DEL RENDERIZADO
  console.log('🔄 Restaurando valores después del renderizado...');
  let restoredAfterRender = 0;
  Object.keys(matrixBackup).forEach(taskName => {
    if (window.rasciMatrixData[taskName]) {
      Object.keys(matrixBackup[taskName]).forEach(roleName => {
        const backupValue = matrixBackup[taskName][roleName];
        const currentValue = window.rasciMatrixData[taskName][roleName];
        
        // Si el valor de backup no está vacío y el valor actual está vacío, restaurar
        if (backupValue && backupValue !== '' && currentValue === '') {
          console.log(`🔄 Restaurando después de render: ${taskName}.${roleName} = "${backupValue}"`);
          window.rasciMatrixData[taskName][roleName] = backupValue;
          restoredAfterRender++;
        }
      });
    }
  });
  
  if (restoredAfterRender > 0) {
    console.log(`✅ Restaurados ${restoredAfterRender} valores después del renderizado`);
    // Guardar inmediatamente después de restaurar
    if (autoSaveRasciState) {
      autoSaveRasciState();
    }
    // Re-renderizar para mostrar los valores restaurados
    setTimeout(() => {
      renderMatrix(panel, roles, autoSaveRasciState);
    }, 100);
  }

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
  
  // Cargar estado desde localStorage antes de recargar
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI en reloadRasciMatrix:', e);
  }
  
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
  
  // Cargar estado desde localStorage
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI en recarga manual:', e);
  }
  
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
    rasciMatrixData: localStorage.getItem('rasciMatrixData'),
    rasciRoles: localStorage.getItem('rasciRoles')
  };
  
  const rasciPanel = document.querySelector('#rasci-panel');
  const panelInfo = {
    exists: !!rasciPanel,
    id: rasciPanel ? rasciPanel.id : null
  };
  
  if (window.rasciMatrixData && bpmnTasks.length > 0) {
    const matrixTasks = Object.keys(window.rasciMatrixData);
    const missingInMatrix = bpmnTasks.filter(task => !matrixTasks.includes(task));
    const extraInMatrix = matrixTasks.filter(task => !bpmnTasks.includes(task));
    
    const syncInfo = {
      tareasEnBPMN: bpmnTasks,
      tareasEnMatriz: matrixTasks,
      faltantesEnMatriz: missingInMatrix,
      extraEnMatriz: extraInMatrix,
      sincronizado: missingInMatrix.length === 0 && extraInMatrix.length === 0
    };
  }
  
};

// Función global para forzar sincronización completa
window.forceFullSync = () => {
  // 1. Obtener tareas del BPMN
  const bpmnTasks = getBpmnTasks();
  
  // 2. Asegurar que window.rasciMatrixData existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // 3. Sincronizar completamente
  let changes = 0;
  
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
      changes++;
    }
  });
  
  // Eliminar tareas extra
  const matrixTasks = Object.keys(window.rasciMatrixData);
  matrixTasks.forEach(taskName => {
    if (!bpmnTasks.includes(taskName)) {
      delete window.rasciMatrixData[taskName];
      changes++;
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
  
  if (!window.bpmnModeler) {
    console.warn('⚠️ BPMN Modeler no disponible');
    return;
  }

  // Cargar estado desde localStorage antes de recargar
  try {
    const savedRoles = localStorage.getItem('rasciRoles');
    if (savedRoles) {
      window.rasciRoles = JSON.parse(savedRoles);
    }
    
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      window.rasciMatrixData = JSON.parse(savedMatrixData);
    }
  } catch (e) {
    console.warn('Error cargando estado RASCI en forceReloadMatrix:', e);
  }
  
  // Obtener las tareas actuales del diagrama
  const currentTasks = getBpmnTasks();
  console.log('📋 Tareas actuales:', currentTasks);
  
  // Asegurar que window.rasciMatrixData existe
  if (!window.rasciMatrixData) {
    window.rasciMatrixData = {};
  }
  
  // NO limpiar datos existentes, solo agregar tareas faltantes
  let changes = 0;
  currentTasks.forEach(taskName => {
    if (!window.rasciMatrixData[taskName]) {
      console.log(`➕ Agregando tarea faltante: ${taskName}`);
      const taskRoles = {};
      if (window.rasciRoles && window.rasciRoles.length > 0) {
        window.rasciRoles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío solo para tareas nuevas
        });
      }
      window.rasciMatrixData[taskName] = taskRoles;
      changes++;
    }
  });
  
  // Eliminar tareas que ya no existen en el diagrama
  const existingTasks = Object.keys(window.rasciMatrixData);
  existingTasks.forEach(taskName => {
    if (!currentTasks.includes(taskName)) {
      console.log(`🗑️ Eliminando tarea que ya no existe: ${taskName}`);
      delete window.rasciMatrixData[taskName];
      changes++;
    }
  });
  
  console.log(`📊 Cambios realizados: ${changes}`);
  
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
        console.log(`✅ Rol RALPH detectado: ${roleName}`);
      }
    }
  });
  
  console.log(`📋 Roles RALPH detectados: ${ralphRoles.length}`, ralphRoles);
  
  // NO MODIFICAR NADA DEL CANVAS - SOLO DETECTAR PARA INFORMACIÓN
  // Los roles detectados se pueden usar para sugerencias pero no se modifican automáticamente
  
  return ralphRoles;
}



// Función para forzar detección de roles RALPH (SOLO CUANDO SE SOLICITA MANUALMENTE)
export function forceDetectRalphRoles() {
  console.log('🔄 Forzando detección de roles RALPH (manual)...');
  const detectedRoles = detectRalphRolesFromCanvas();
  
  if (detectedRoles.length > 0) {
    console.log(`📋 Roles RALPH detectados: ${detectedRoles.length}`, detectedRoles);
    
    // SOLO AGREGAR ROLES NUEVOS A LA MATRIZ RASCI (NO MODIFICAR CANVAS)
    if (!window.rasciRoles) {
      window.rasciRoles = [];
    }
    
    let addedNewRoles = false;
    detectedRoles.forEach(roleName => {
      if (!window.rasciRoles.includes(roleName)) {
        window.rasciRoles.push(roleName);
        addedNewRoles = true;
        console.log(`➕ Rol nuevo agregado a matriz RASCI: ${roleName}`);
      }
    });
    
    // SIEMPRE actualizar la matriz de datos con los roles detectados (aunque ya existan)
    if (window.rasciMatrixData) {
      Object.keys(window.rasciMatrixData).forEach(taskName => {
        detectedRoles.forEach(roleName => {
                      if (!(roleName in window.rasciMatrixData[taskName])) {
              // NO ESTABLECER VALOR VACÍO - DEJAR QUE EL USUARIO LO ASIGNE
              window.rasciMatrixData[taskName][roleName] = undefined;
              console.log(`➕ Rol ${roleName} agregado a tarea ${taskName} (sin valor asignado)`);
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
      
      // Guardar en localStorage
      try {
        localStorage.setItem('rasciRoles', JSON.stringify(window.rasciRoles));
        console.log('💾 Roles guardados en localStorage');
      } catch (e) {
        console.warn('Error guardando roles en localStorage:', e);
      }
      
      // Re-renderizar matriz con roles actualizados
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, window.rasciRoles, null);
        console.log('✅ Matriz re-renderizada con roles detectados');
      }
    } else {
      console.log('ℹ️ No se agregaron roles nuevos, manteniendo matriz actual');
    }
  } else {
    console.log('ℹ️ No se detectaron roles RALPH en el canvas');
  }
  
  return detectedRoles;
}


