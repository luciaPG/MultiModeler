// RASCI Matrix Manager - Matrix rendering and role management

let roles = [];
let autoSaveRasciState = null;

export function renderMatrix(panel, rolesArray, autoSaveFunction) {
  roles = rolesArray;
  autoSaveRasciState = autoSaveFunction;
  
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
  taskHeader.textContent = 'Tarea';
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

  const tbody = document.createElement('tbody');
  tasks.forEach(task => {
    const row = document.createElement('tr');

    const taskCell = document.createElement('td');
    taskCell.textContent = task;
    row.appendChild(taskCell);

    roles.forEach(role => {
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

      if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
        const existingValue = window.rasciMatrixData[task][role];
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
          
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          if (typeof window.onRasciMatrixUpdated === 'function') {
            setTimeout(() => {
              window.onRasciMatrixUpdated();
            }, 100);
          }

        } else if (['-', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
          e.preventDefault();

          container.classList.remove('rasci-ready');
          cell.classList.remove('cell-ready', 'cell-with-content');

          display.innerHTML = '';
          if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
            delete window.rasciMatrixData[task][role];
          }
          cell.removeAttribute('data-value');
          
          if (autoSaveRasciState) {
            autoSaveRasciState();
          }
          
          if (typeof window.onRasciMatrixUpdated === 'function') {
            setTimeout(() => {
              window.onRasciMatrixUpdated();
            }, 100);
          }
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
}

// Función para obtener tareas del diagrama BPMN
function getBpmnTasks() {
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

// Función para actualizar matriz desde el diagrama
export function updateMatrixFromDiagram() {
  if (!window.bpmnModeler) {
    return;
  }

  const rasciPanel = document.querySelector('#rasci-panel');
  
  if (rasciPanel) {
    renderMatrix(rasciPanel, roles, autoSaveRasciState);
  }
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
    }, 100);
  });
}

// Función para agregar nuevo rol
export function addNewRole(panel, rolesArray, autoSaveFunction) {
  roles = rolesArray || roles;
  autoSaveRasciState = autoSaveFunction || autoSaveRasciState;
  
  const newRoleName = `Rol ${roles.length + 1}`;
  roles.push(newRoleName);
  
  if (autoSaveRasciState) autoSaveRasciState();
  
  renderMatrix(panel, roles, autoSaveRasciState);
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
    const newName = input.value.trim();
    
    if (newName && newName !== currentName) {
      roles[roleIndex] = newName;
      roleNameSpan.textContent = newName;
      
      if (autoSaveRasciState) autoSaveRasciState();
    }
    
    restoreView();
  }

  function restoreView() {
    roleNameSpan.style.visibility = 'visible';
    if (input.parentNode) {
      input.parentNode.removeChild(input);
    }
    restoreDocumentMethods();
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
  
  if (autoSaveRasciState) autoSaveRasciState();
  
  renderMatrix(panel, roles, autoSaveRasciState);
}

// Configurar función global para actualizar matriz
window.updateMatrixFromDiagram = updateMatrixFromDiagram;

// Función global para recargar la matriz RASCI
window.reloadRasciMatrix = function() {
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel) {
    renderMatrix(rasciPanel, roles, autoSaveRasciState);
  }
};
