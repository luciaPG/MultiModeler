// RASCI Matrix Manager
import { rasciUIValidator } from '../ui/matrix-ui-validator.js';

// Importar función de auto-mapping para evitar referencias a window
let onRasciMatrixUpdatedFunction = null;

// Función para registrar el callback de auto-mapping
function setOnRasciMatrixUpdatedCallback(callback) {
  onRasciMatrixUpdatedFunction = callback;
}

class RasciMatrixManager {
  constructor() {
    this.rasciMatrixData = {};
    this.rasciRoles = [];
    this.bpmnModeler = null;
    this.rasciUIValidator = null;
    this.isImportingProject = false;
    this.storageCleared = false;
  }

  // Métodos para inyección de dependencias
  setBpmnModeler(modeler) {
    this.bpmnModeler = modeler;
  }

  setRasciUIValidator(validator) {
    this.rasciUIValidator = validator;
  }

  setImportingProject(importing) {
    this.isImportingProject = importing;
  }

  setStorageCleared(cleared) {
    this.storageCleared = cleared;
  }

  // Getters para acceso controlado
  getRasciMatrixData() {
    return this.rasciMatrixData;
  }

  getRasciRoles() {
    return this.rasciRoles;
  }

  getBpmnModeler() {
    return this.bpmnModeler;
  }

  // Métodos para callbacks
  forceSaveRasciState() {
    if (autoSaveRasciState && typeof autoSaveRasciState === 'function') {
      autoSaveRasciState();
    }
  }

  onRasciMatrixUpdated() {
    // Activar auto-mapping usando función registrada en lugar de window
    if (onRasciMatrixUpdatedFunction && typeof onRasciMatrixUpdatedFunction === 'function') {
      try {
        onRasciMatrixUpdatedFunction();
      } catch (error) {
        console.warn('⚠️ Error calling onRasciMatrixUpdated callback:', error);
      }
    }
  }

  preventOverwriteExistingValues() {
    // Método placeholder para prevenir sobrescritura
  }
}

// Instancia única del manager
const rasciManager = new RasciMatrixManager();

let roles = [];
let autoSaveRasciState = null;

export function renderMatrix(panel, rolesArray, autoSaveFunction) {
  // Sincronizar con variables globales para compatibilidad temporal
  if (typeof window !== 'undefined') {
    rasciManager.setBpmnModeler(window.bpmnModeler || null);
    rasciManager.setImportingProject(window.isImportingProject === true);
    rasciManager.setStorageCleared(window.storageCleared === true);
    rasciManager.setRasciUIValidator(window.rasciUIValidator || null);
    
    // Sincronizar datos existentes desde window
    if (window.rasciMatrixData) {
      rasciManager.rasciMatrixData = window.rasciMatrixData;
    }
    if (window.rasciRoles) {
      rasciManager.rasciRoles = window.rasciRoles;
    }
  }

  roles = rolesArray || rasciManager.getRasciRoles() || [];
  autoSaveRasciState = autoSaveFunction;
  
  // Verificar si se está importando un proyecto
  const isImportingProject = rasciManager.isImportingProject;
  
  // Verificar si se ha limpiado el storage recientemente
  const storageWasCleared = rasciManager.storageCleared;
  
  // Verificar si hay datos antiguos que deben limpiarse
  const shouldClearOldData = !isImportingProject && (
    storageWasCleared || 
    !rasciManager.rasciMatrixData || 
    Object.keys(rasciManager.rasciMatrixData).length === 0
  );
  
  if (shouldClearOldData) {
    rasciManager.rasciMatrixData = {};
    
    if (rasciManager.getBpmnModeler()) {
      const currentTasks = getBpmnTasks();
      currentTasks.forEach(taskName => {
        const taskRoles = {};
        if (roles && roles.length > 0) {
          roles.forEach(role => {
            taskRoles[role] = '';
          });
        }
        rasciManager.rasciMatrixData[taskName] = taskRoles;
      });
    }
  } else if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }
  
  // Actualizar roles en el manager
  rasciManager.rasciRoles = roles;
  
  // Mantener sincronización con window para compatibilidad
  if (typeof window !== 'undefined') {
    window.rasciMatrixData = rasciManager.rasciMatrixData;
    window.rasciRoles = rasciManager.rasciRoles;
  }
  
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

  // Asegurar que todas las tareas estén en rasciManager.rasciMatrixData
  if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }
  
  // Use current roles for rendering
  const currentRoles = roles || rasciManager.rasciRoles || [];
  
  // PRESERVAR VALORES EXISTENTES ANTES DE MODIFICAR LA MATRIZ
  const existingValues = {};
  if (rasciManager.rasciMatrixData) {
    Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
      existingValues[taskName] = {};
      Object.keys(rasciManager.rasciMatrixData[taskName]).forEach(roleName => {
        const value = rasciManager.rasciMatrixData[taskName][roleName];
        if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
          existingValues[taskName][roleName] = value;
        }
      });
    });
  }
  
  tasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = '';
        });
      }
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    } else {
      const existingTask = rasciManager.rasciMatrixData[taskName];
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
    if (rasciManager.rasciMatrixData[taskName]) {
      Object.keys(existingValues[taskName]).forEach(roleName => {
        if (rasciManager.rasciMatrixData[taskName][roleName] !== undefined) {
          rasciManager.rasciMatrixData[taskName][roleName] = existingValues[taskName][roleName];
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
      const existingValue = rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[task] ? 
                           rasciManager.rasciMatrixData[task][role] : undefined;
      
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
            const currentTaskData = rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[task] ? rasciManager.rasciMatrixData[task] : {};
            
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

          if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};
          if (!rasciManager.rasciMatrixData[task]) rasciManager.rasciMatrixData[task] = {};
          rasciManager.rasciMatrixData[task][role] = key;
          cell.setAttribute('data-value', key);
          cell.classList.add('cell-with-content');
          
          // Guardado inmediato al cambiar valor en la matriz
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          // Guardado adicional para asegurar persistencia
          if (rasciManager.forceSaveRasciState) {
            setTimeout(() => {
              rasciManager.forceSaveRasciState();
            }, 50);
          }
          
          if (rasciManager.onRasciMatrixUpdated) {
            setTimeout(() => {
              rasciManager.onRasciMatrixUpdated();
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
          if (rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[task] && rasciManager.rasciMatrixData[task][role]) {
            delete rasciManager.rasciMatrixData[task][role];
          }
          cell.removeAttribute('data-value');
          
          // Guardado inmediato al borrar valor en la matriz
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          // Guardado adicional para asegurar persistencia
          if (rasciManager.forceSaveRasciState) {
            setTimeout(() => {
              rasciManager.forceSaveRasciState();
            }, 50);
          }
          
          if (rasciManager.onRasciMatrixUpdated) {
            setTimeout(() => {
              rasciManager.onRasciMatrixUpdated();
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
    if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.autoValidateAfterMatrixUpdate === 'function') {
      rasciManager.rasciUIValidator.autoValidateAfterMatrixUpdate();
    }
  }, 500);
}

// Función para obtener tareas del diagrama BPMN
export function getBpmnTasks() {
  if (!rasciManager.getBpmnModeler()) {
    return [];
  }
  
  const elementRegistry = rasciManager.getBpmnModeler().get('elementRegistry');
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
  if (!rasciManager.getBpmnModeler()) {
    return;
  }

  const preservedValues = preserveRasciValues();
  const currentTasks = getBpmnTasks();
  
  if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }
    
  let hasNewTasks = false;
  
  // Use global roles if local roles are not available + DETECTAR ROLES RALPH DEL CANVAS
  let currentRoles = roles || rasciManager.rasciRoles || [];
  
  if (typeof detectRalphRolesFromCanvas === 'function') {
    const detectedRalphRoles = detectRalphRolesFromCanvas();
    if (detectedRalphRoles && detectedRalphRoles.length > 0) {
      detectedRalphRoles.forEach(ralphRole => {
        if (!currentRoles.includes(ralphRole)) {
          currentRoles.push(ralphRole);
        }
      });
      rasciManager.rasciRoles = [...currentRoles];
    }
  }
  
  currentTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      if (currentRoles && currentRoles.length > 0) {
        currentRoles.forEach(role => {
          taskRoles[role] = '';
        });
      }
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      hasNewTasks = true;
    } else {
      const existingTaskRoles = rasciManager.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.length > 0) {
        let taskUpdated = false;
        currentRoles.forEach(role => {
          if (!(role in existingTaskRoles)) {
            existingTaskRoles[role] = '';
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
    if (rasciManager.preventOverwriteExistingValues) {
      rasciManager.preventOverwriteExistingValues();
    }
    
    const finalRestoredCount = restoreRasciValues(preservedValues);
    
    if (finalRestoredCount > 0 && autoSaveRasciState) {
      autoSaveRasciState();
    }
    
    // Eliminar tareas que ya no existen en el diagrama
    const existingTasks = Object.keys(rasciManager.rasciMatrixData);
    
    existingTasks.forEach(taskName => {
      if (!currentTasks.includes(taskName)) {
        delete rasciManager.rasciMatrixData[taskName];
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
      rasciManager.rasciRoles = [...currentRoles];
    }
    
    // Validación sin recargo visual
    setTimeout(() => {
      if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.autoValidateAfterMatrixUpdate === 'function') {
        rasciManager.rasciUIValidator.autoValidateAfterMatrixUpdate();
      } else if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
        rasciManager.rasciUIValidator.forceValidation();
      }
      
      // Validación adicional específica para tareas vacías
      if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.validateEmptyTasks === 'function') {
        rasciManager.rasciUIValidator.validateEmptyTasks();
      }
    }, 200);
  }

  // Función para configurar listener de cambios en el diagrama
  export function setupDiagramChangeListener() {
    if (!rasciManager.getBpmnModeler()) {
      return;
    }

    const eventBus = rasciManager.getBpmnModeler().get('eventBus');
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
  rasciManager.rasciRoles = roles;
  
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
      try {
        // 🔄 SINCRONIZACIÓN CON CANVAS: Actualizar etiquetas de roles en el canvas
        updateCanvasRoleLabels(currentName, newName);
        
        roles[roleIndex] = newName;
        roleNameSpan.textContent = newName;
        
        // Guardado inmediato al editar rol
        if (autoSaveRasciState) autoSaveRasciState();
        
        // Guardado adicional para asegurar persistencia
        if (rasciManager.forceSaveRasciState) {
          setTimeout(() => {
            rasciManager.forceSaveRasciState();
          }, 10);
        }

        // Validar matriz después de editar rol (más lento)
        setTimeout(() => {
          if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
            rasciManager.rasciUIValidator.forceValidation();
          }
        }, 1000);
      } catch (error) {
        console.warn('Error al guardar cambios en rol:', error);
      }
    }
    
    restoreView();
  }

  function restoreView() {
    roleNameSpan.style.visibility = 'visible';
    
    // Verificación más robusta para remover el input
    try {
      if (input && input.parentNode && document.contains(input)) {
        input.parentNode.removeChild(input);
      } else if (input && input.remove) {
        // Método alternativo más seguro
        input.remove();
      }
    } catch (error) {
      // Si falla la eliminación, intentar encontrar y remover el input por selector
      try {
        const existingInput = roleNameSpan.parentNode.querySelector('input');
        if (existingInput) {
          existingInput.remove();
        }
      } catch (fallbackError) {
        // Ignorar errores de eliminación
        console.warn('No se pudo remover el input de edición:', fallbackError);
      }
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
  
  if (!rasciManager.getBpmnModeler()) {
    return;
  }
  
  try {
    const elementRegistry = rasciManager.getBpmnModeler().get('elementRegistry');
    const modeling = rasciManager.getBpmnModeler().get('modeling');
    
    if (!elementRegistry || !modeling) {
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
          
          // Actualizar el nombre usando modeling
          modeling.updateProperties(element, {
            name: newName
          });
          
          updatedElements++;
        }
      }
    });
    
    if (updatedElements > 0) {
      showTemporaryMessage(`✅ Rol "${newName}" sincronizado en el canvas`, 'success');
    }
  } catch (error) {
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
  if (rasciManager.forceSaveRasciState) {
    setTimeout(() => {
      rasciManager.forceSaveRasciState();
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
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    renderMatrix(rasciPanel, rasciManager.rasciRoles || [], null);
  }
};

// Función específica para recarga manual desde botón (preserva datos)
window.manualReloadRasciMatrix = function() {
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    renderMatrix(rasciPanel, rasciManager.rasciRoles || [], null);
  }
};

// Función global para forzar la detección de nuevas tareas y validación
export function forceDetectNewTasks() {
  if (!rasciManager.getBpmnModeler()) {
    return;
  }
  
  // Obtener tareas actuales
  const currentTasks = getBpmnTasks();
  
  // Asegurar que rasciManager.rasciMatrixData existe
  if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }
  
  // Añadir nuevas tareas si no existen
  let hasNewTasks = false;
  currentTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      // Inicializar la tarea con estructura de roles vacíos para que el validador la detecte
      const taskRoles = {};
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          taskRoles[role] = ''; // Inicializar con string vacío para que el validador detecte la estructura
        });
      }
      
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      hasNewTasks = true;
    }
  });
  
  if (hasNewTasks) {
    // Forzar validación inmediata
    setTimeout(() => {
      if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
        rasciManager.rasciUIValidator.forceValidation();
      }
      if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.validateEmptyTasks === 'function') {
        rasciManager.rasciUIValidator.validateEmptyTasks();
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
    if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.validateEmptyTasks === 'function') {
      rasciManager.rasciUIValidator.validateEmptyTasks();
    }
    if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
      rasciManager.rasciUIValidator.forceValidation();
    }
  }, 200);
};

// Función global para diagnóstico completo del estado
window.diagnoseRasciState = () => {
  console.log('=== DIAGNÓSTICO RASCI-RALPH ===');
  
  // 1. Estado del manager
  console.log('1. Estado del RasciManager:');
  console.log('  - rasciMatrixData:', rasciManager.rasciMatrixData);
  console.log('  - rasciRoles:', rasciManager.rasciRoles);
  console.log('  - bpmnModeler disponible:', !!rasciManager.getBpmnModeler());
  
  // 2. Estado del window
  console.log('2. Variables globales window:');
  console.log('  - window.rasciMatrixData:', window.rasciMatrixData);
  console.log('  - window.rasciRoles:', window.rasciRoles);
  console.log('  - window.bpmnModeler:', !!window.bpmnModeler);
  
  // 3. Detección RALPH
  console.log('3. Detección de roles RALPH:');
  try {
    const ralphRoles = detectRalphRolesFromCanvas();
    console.log('  - Roles RALPH detectados:', ralphRoles);
  } catch (error) {
    console.error('  - Error en detección RALPH:', error);
  }
  
  // 4. Tareas BPMN
  console.log('4. Tareas BPMN:');
  try {
    const bpmnTasks = getBpmnTasks();
    console.log('  - Tareas BPMN detectadas:', bpmnTasks);
  } catch (error) {
    console.error('  - Error en detección tareas:', error);
  }
  
  // 5. Estado DOM
  console.log('5. Estado del DOM:');
  const rasciPanel = document.querySelector('#rasci-panel');
  const matrixContainer = document.querySelector('#matrix-container');
  console.log('  - Panel RASCI encontrado:', !!rasciPanel);
  console.log('  - Contenedor matriz encontrado:', !!matrixContainer);
  
  console.log('=== FIN DIAGNÓSTICO ===');
};

window.forceFullSync = () => {
  const bpmnTasks = getBpmnTasks();
  
  // 2. Asegurar que rasciManager.rasciMatrixData existe
  if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }
  
  // 3. Sincronizar completamente
  // changes eliminado - no se usa
  
  // Añadir tareas faltantes
  bpmnTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      if (roles && roles.length > 0) {
        roles.forEach(role => {
          taskRoles[role] = '';
        });
      }
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      // changes++ eliminado
    }
  });
  
  // Eliminar tareas extra
  const matrixTasks = Object.keys(rasciManager.rasciMatrixData);
  matrixTasks.forEach(taskName => {
    if (!bpmnTasks.includes(taskName)) {
      delete rasciManager.rasciMatrixData[taskName];
      // changes++ eliminado
    }
  });
  
  // 4. Forzar validación
  setTimeout(() => {
    if (rasciManager.rasciUIValidator) {
      if (typeof rasciManager.rasciUIValidator.validateEmptyTasks === 'function') {
        rasciManager.rasciUIValidator.validateEmptyTasks();
      }
      if (typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
        rasciManager.rasciUIValidator.forceValidation();
      }
    }
  }, 100);
};

// Función para forzar la recarga completa de la matriz
export function forceReloadMatrix() {
  
  // Verificar si se está importando un proyecto
  const isImportingProject = rasciManager.isImportingProject === true;
  
  // SIEMPRE PRESERVAR responsabilidades existentes antes de cualquier operación
  let preservedResponsibilities = {};
  if (rasciManager.rasciMatrixData) {
    Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
      preservedResponsibilities[taskName] = {};
      Object.keys(rasciManager.rasciMatrixData[taskName]).forEach(roleName => {
        const value = rasciManager.rasciMatrixData[taskName][roleName];
        if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
          preservedResponsibilities[taskName][roleName] = value;
        }
      });
    });
  }
  
  const totalPreservedValues = Object.values(preservedResponsibilities)
    .reduce((total, taskRoles) => total + Object.keys(taskRoles).length, 0);
    
  if (isImportingProject) {
    if (!rasciManager.rasciMatrixData) {
      rasciManager.rasciMatrixData = {};
    }
    if (!rasciManager.rasciRoles) {
      rasciManager.rasciRoles = [];
    }
  } else {
    // NO LIMPIAR completamente los datos - solo estructurar
    if (!rasciManager.rasciMatrixData) {
      rasciManager.rasciMatrixData = {};
    }
    
    // Inicializar roles si no existen
    if (!rasciManager.rasciRoles) {
      rasciManager.rasciRoles = [];
    }
  }
  
  if (!rasciManager.getBpmnModeler()) {
    // Aún así, limpiar la matriz visual
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      renderMatrix(rasciPanel, rasciManager.rasciRoles || [], null);
    }
    return;
  }

  const currentTasks = getBpmnTasks();
  
  if (isImportingProject) {
    currentTasks.forEach(taskName => {
      if (!rasciManager.rasciMatrixData[taskName]) {
        const taskRoles = {};
        if (rasciManager.rasciRoles && rasciManager.rasciRoles.length > 0) {
          rasciManager.rasciRoles.forEach(role => {
            taskRoles[role] = '';
          });
        }
        rasciManager.rasciMatrixData[taskName] = taskRoles;
      }
    });
  } else {
    const existingData = { ...rasciManager.rasciMatrixData };
    
    // Reinicializar matriz pero preservando responsabilidades
    rasciManager.rasciMatrixData = {};
    currentTasks.forEach(taskName => {
      const taskRoles = {};
      if (rasciManager.rasciRoles && rasciManager.rasciRoles.length > 0) {
        rasciManager.rasciRoles.forEach(role => {
          const existingValue = existingData[taskName] && existingData[taskName][role];
          taskRoles[role] = existingValue || '';
        });
      }
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    });
  }
  
  if (totalPreservedValues > 0) {
    Object.keys(preservedResponsibilities).forEach(taskName => {
      if (rasciManager.rasciMatrixData[taskName]) {
        Object.keys(preservedResponsibilities[taskName]).forEach(roleName => {
          if (rasciManager.rasciMatrixData[taskName][roleName] !== undefined) {
            rasciManager.rasciMatrixData[taskName][roleName] = preservedResponsibilities[taskName][roleName];
          }
        });
      }
    });
  }
  
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    renderMatrix(rasciPanel, rasciManager.rasciRoles || [], null);
  }
  
  setTimeout(() => {
    if (rasciManager.rasciUIValidator && typeof rasciManager.rasciUIValidator.forceValidation === 'function') {
      rasciManager.rasciUIValidator.forceValidation();
    }
  }, 300);
}

// Función para preservar responsabilidades RASCI existentes
function preserveRasciValues() {
  if (!rasciManager.rasciMatrixData) {
    return {};
  }
  
  const preserved = {};
  
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    preserved[taskName] = {};
    Object.keys(rasciManager.rasciMatrixData[taskName]).forEach(roleName => {
      const value = rasciManager.rasciMatrixData[taskName][roleName];
      if (value && ['R', 'A', 'S', 'C', 'I'].includes(value)) {
        preserved[taskName][roleName] = value;
      }
    });
  });
  
  return preserved;
}

// Función para restaurar responsabilidades RASCI preservadas
function restoreRasciValues(preserved) {
  if (!preserved || !rasciManager.rasciMatrixData) {
    return 0;
  }
  
  let restoredCount = 0;
  
  Object.keys(preserved).forEach(taskName => {
    if (rasciManager.rasciMatrixData[taskName]) {
      Object.keys(preserved[taskName]).forEach(roleName => {
        if (rasciManager.rasciMatrixData[taskName][roleName] !== undefined) {
          rasciManager.rasciMatrixData[taskName][roleName] = preserved[taskName][roleName];
          restoredCount++;
        }
      });
    }
  });
  
  return restoredCount;
}

// Función para detectar roles RALPH del canvas SOLO PARA LECTURA (NO INVASIVA)
export function detectRalphRolesFromCanvas() {
  
  if (!rasciManager.getBpmnModeler()) {
    console.warn('RASCI-RALPH: No hay modeler BPMN disponible');
    return [];
  }
  
  try {
    const elementRegistry = rasciManager.getBpmnModeler().get('elementRegistry');
    if (!elementRegistry) {
      console.warn('RASCI-RALPH: No se pudo obtener elementRegistry');
      return [];
    }
    
    // Detectar roles RALPH del canvas SOLO PARA LECTURA
    const ralphRoles = [];
    let elementsProcessed = 0;
    let ralphElementsFound = 0;
    
    elementRegistry.forEach(element => {
      elementsProcessed++;
      
      // Buscar elementos RALPH con diferentes variaciones de tipo
      if (element.type === 'RALph:RoleRALph' || 
          element.type === 'ralph:Role' ||
          element.type === 'RALph:Role' ||
          element.type === 'ralph:RoleRALph' ||
          (element.type && element.type.includes('RALph') && element.type.includes('Role'))) {
        
        ralphElementsFound++;
        
        const roleName = element.businessObject && element.businessObject.name ? 
                        element.businessObject.name : 
                        (element.name || element.id || 'Rol sin nombre');
        
        if (roleName && !ralphRoles.includes(roleName)) {
          ralphRoles.push(roleName);
        }
      }
    });
    
    console.log(`RASCI-RALPH Detección: ${elementsProcessed} elementos procesados, ${ralphElementsFound} elementos RALPH encontrados, ${ralphRoles.length} roles únicos detectados:`, ralphRoles);
    
    // NO MODIFICAR NADA DEL CANVAS - SOLO DETECTAR PARA INFORMACIÓN
    // Los roles detectados se pueden usar para sugerencias pero no se modifican automáticamente
    
    return ralphRoles;
    
  } catch (error) {
    console.error('Error en detección RASCI-RALPH:', error);
    return [];
  }
}



// Función para forzar detección de roles RALPH (SOLO CUANDO SE SOLICITA MANUALMENTE)
export function forceDetectRalphRoles() {
  const detectedRoles = detectRalphRolesFromCanvas();
  
  if (detectedRoles.length > 0) {
    
    // SOLO AGREGAR ROLES NUEVOS A LA MATRIZ RASCI (NO MODIFICAR CANVAS)
    if (!rasciManager.rasciRoles) {
      rasciManager.rasciRoles = [];
    }
    
    let addedNewRoles = false;
    detectedRoles.forEach(roleName => {
      if (!rasciManager.rasciRoles.includes(roleName)) {
        rasciManager.rasciRoles.push(roleName);
        addedNewRoles = true;
      }
    });
    
    // SIEMPRE actualizar la matriz de datos con los roles detectados (aunque ya existan)
    if (rasciManager.rasciMatrixData) {
      Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
        detectedRoles.forEach(roleName => {
                      if (!(roleName in rasciManager.rasciMatrixData[taskName])) {
              // NO ESTABLECER VALOR VACÍO - DEJAR QUE EL USUARIO LO ASIGNE
              rasciManager.rasciMatrixData[taskName][roleName] = undefined;

              addedNewRoles = true; // Marcar que se agregó algo
              
              // Guardado inmediato al agregar nuevo rol
              if (rasciManager.forceSaveRasciState) {
                setTimeout(() => {
                  rasciManager.forceSaveRasciState();
                }, 10);
              }
            }
        });
      });
    }
    
    if (addedNewRoles) {
      // PREVENIR SOBRESCRITURA DE VALORES EXISTENTES
      if (rasciManager.preventOverwriteExistingValues) {
        rasciManager.preventOverwriteExistingValues();
      }
      
      // localStorage eliminado del panel RASCI
      
      // Re-renderizar matriz con roles actualizados
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        renderMatrix(rasciPanel, rasciManager.rasciRoles, null);
      }
    }
  }
  
  return detectedRoles;
}

// Función para reparar y sincronizar el mapeo RASCI-RALPH
window.repairRasciRalphMapping = () => {
  console.log('=== INICIANDO REPARACIÓN RASCI-RALPH ===');
  
  try {
    // 1. Sincronizar manager con window
    if (typeof window !== 'undefined') {
      rasciManager.setBpmnModeler(window.bpmnModeler || null);
      rasciManager.setRasciUIValidator(window.rasciUIValidator || null);
      
      if (window.rasciMatrixData) {
        rasciManager.rasciMatrixData = { ...window.rasciMatrixData };
      }
      if (window.rasciRoles) {
        rasciManager.rasciRoles = [...window.rasciRoles];
      }
    }
    
    // 2. Detectar roles RALPH
    const ralphRoles = detectRalphRolesFromCanvas();
    console.log('Roles RALPH detectados:', ralphRoles);
    
    // 3. Asegurar inicialización de datos
    if (!rasciManager.rasciMatrixData) {
      rasciManager.rasciMatrixData = {};
    }
    if (!rasciManager.rasciRoles) {
      rasciManager.rasciRoles = [];
    }
    
    // 4. Integrar roles RALPH únicos
    let rolesAdded = 0;
    ralphRoles.forEach(ralphRole => {
      if (!rasciManager.rasciRoles.includes(ralphRole)) {
        rasciManager.rasciRoles.push(ralphRole);
        rolesAdded++;
      }
    });
    
    // 5. Actualizar tareas BPMN
    const bpmnTasks = getBpmnTasks();
    console.log('Tareas BPMN detectadas:', bpmnTasks);
    
    // 6. Sincronizar matriz con nuevos roles y tareas
    bpmnTasks.forEach(taskName => {
      if (!rasciManager.rasciMatrixData[taskName]) {
        rasciManager.rasciMatrixData[taskName] = {};
      }
      
      rasciManager.rasciRoles.forEach(role => {
        if (!(role in rasciManager.rasciMatrixData[taskName])) {
          rasciManager.rasciMatrixData[taskName][role] = '';
        }
      });
    });
    
    // 7. Sincronizar de vuelta a window
    if (typeof window !== 'undefined') {
      window.rasciMatrixData = rasciManager.rasciMatrixData;
      window.rasciRoles = rasciManager.rasciRoles;
    }
    
    // 8. Re-renderizar matriz
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel) {
      renderMatrix(rasciPanel, rasciManager.rasciRoles, null);
    }
    
    console.log(`✅ Reparación completada: ${rolesAdded} roles agregados, ${bpmnTasks.length} tareas sincronizadas`);
    console.log('Estado final - Roles:', rasciManager.rasciRoles);
    console.log('Estado final - Matriz:', rasciManager.rasciMatrixData);
    
    return {
      success: true,
      rolesAdded,
      tasksProcessed: bpmnTasks.length,
      ralphRoles,
      currentRoles: rasciManager.rasciRoles
    };
    
  } catch (error) {
    console.error('❌ Error durante reparación:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// Exportar el manager y utilidades para uso externo
export { rasciManager, setOnRasciMatrixUpdatedCallback };
