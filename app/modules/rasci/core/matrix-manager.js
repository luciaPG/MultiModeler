// RASCI Matrix Manager (versión compacta y corregida)

// Dependencias
import { rasciUIValidator as ImportedValidator } from '../ui/matrix-ui-validator.js';
import rasciAdapter from '../RASCIAdapter.js';
import { getEventBus } from '../../ui/core/event-bus.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';
import { RasciStore } from '../store.js';

// Estado interno
let onRasciMatrixUpdatedFunction = null;
let roles = [];
let autoSaveRasciState = null;

// -----------------------------------------------------
// Manager
// -----------------------------------------------------
class RasciMatrixManager {
  constructor() {
    this.rasciMatrixData = {};
    this.rasciRoles = [];
    this.bpmnModeler = null;
    this.rasciUIValidator = null;
    this.isImportingProject = false;
    this.storageCleared = false;
    this.eventBus = getEventBus();
    this.adapter = rasciAdapter;
  }

  setBpmnModeler(modeler) {
    this.bpmnModeler = modeler;
    if (this.adapter && this.adapter.bridge) {
      this.adapter.bridge.registerModeler('bpmn', modeler);
    }
  }

  setRasciUIValidator(validator) {
    this.rasciUIValidator = validator;
  }

  setImportingProject(importing) { this.isImportingProject = importing; }
  setStorageCleared(cleared) { this.storageCleared = cleared; }

  getRasciMatrixData() { return this.rasciMatrixData; }
  getRasciRoles() { return this.rasciRoles; }

  getBpmnModeler() {
    return this.adapter ? this.adapter.getBpmnModeler() : this.bpmnModeler;
  }

  forceSaveRasciState() {
    if (typeof autoSaveRasciState === 'function') autoSaveRasciState();
  }

  onRasciMatrixUpdated() {
    if (typeof onRasciMatrixUpdatedFunction === 'function') {
      try { onRasciMatrixUpdatedFunction(); } catch (_) {}
    }
  }

  preventOverwriteExistingValues() { /* placeholder intencional */ }
}

const rasciManager = new RasciMatrixManager();

// -----------------------------------------------------
// Helpers
// -----------------------------------------------------
function getValidator() {
  return rasciManager.rasciUIValidator || ImportedValidator || null;
}

export function getBpmnTasks() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return [];
  const elementRegistry = modeler.get('elementRegistry');
  const tasks = [];

  elementRegistry.forEach(el => {
    if (!el.type) return;
    if (
      el.type === 'bpmn:Task' ||
      el.type === 'bpmn:UserTask' ||
      el.type === 'bpmn:ServiceTask' ||
      el.type === 'bpmn:ScriptTask' ||
      el.type === 'bpmn:ManualTask' ||
      el.type === 'bpmn:BusinessRuleTask' ||
      el.type === 'bpmn:SendTask' ||
      el.type === 'bpmn:ReceiveTask' ||
      el.type === 'bpmn:CallActivity' ||
      el.type === 'bpmn:SubProcess'
    ) {
      const name = (el.businessObject && el.businessObject.name) || el.id;
      if (name && !tasks.includes(name)) tasks.push(name);
    }
  });

  return tasks;
}

function showTemporaryMessage(message, type = 'info') {
  const div = document.createElement('div');
  div.textContent = message;
  div.style.cssText = `
    position: fixed; top: 20px; right: 20px; padding: 10px 15px; border-radius: 5px;
    color: ${type === 'warning' ? '#212529' : '#fff'};
    font-weight: bold; z-index: 10000; font-size: 14px; max-width: 300px; text-align: center;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    background-color: ${type === 'success' ? '#28a745' : type === 'warning' ? '#ffc107' : '#007bff'};
  `;
  document.body.appendChild(div);
  setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 3000);
}

function preserveRasciValues() {
  const src = rasciManager.rasciMatrixData || {};
  const preserved = {};
  Object.keys(src).forEach(task => {
    preserved[task] = {};
    Object.keys(src[task]).forEach(role => {
      const v = src[task][role];
      if (v && ['R', 'A', 'S', 'C', 'I'].includes(v)) preserved[task][role] = v;
    });
  });
  return preserved;
}

function restoreRasciValues(preserved) {
  if (!preserved || !rasciManager.rasciMatrixData) return 0;
  let restored = 0;
  Object.keys(preserved).forEach(task => {
    if (!rasciManager.rasciMatrixData[task]) return;
    Object.keys(preserved[task]).forEach(role => {
      if (rasciManager.rasciMatrixData[task][role] !== undefined) {
        rasciManager.rasciMatrixData[task][role] = preserved[task][role];
        restored++;
      }
    });
  });
  return restored;
}

// -----------------------------------------------------
// Detección / sincronización con canvas (RALPH)
// -----------------------------------------------------
export function detectRalphRolesFromCanvas() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return [];

  try {
    const elementRegistry = modeler.get('elementRegistry');
    const detected = [];
    elementRegistry.forEach(el => {
      const t = el.type || '';
      if (
        t === 'RALph:RoleRALph' ||
        t === 'ralph:Role' ||
        t === 'RALph:Role' ||
        t === 'ralph:RoleRALph' ||
        (t.includes('RALph') && t.includes('Role'))
      ) {
        const name =
          (el.businessObject && el.businessObject.name) ||
          el.name ||
          el.id ||
          'Rol sin nombre';
        if (name && !detected.includes(name)) detected.push(name);
      }
    });
    return detected;
  } catch (_) {
    return [];
  }
}

function updateCanvasRoleLabels(oldName, newName) {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;

  try {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    if (!elementRegistry || !modeling) return;

    let count = 0;
    elementRegistry.forEach(el => {
      const t = el.type || '';
      if (
        t === 'RALph:RoleRALph' || t === 'ralph:Role' || t === 'RALph:Role' ||
        t === 'ralph:RoleRALph' || (t.includes('RALph') && t.includes('Role'))
      ) {
        const current =
          (el.businessObject && el.businessObject.name) ||
          el.name ||
          '';
        if (current === oldName) {
          modeling.updateProperties(el, { name: newName });
          count++;
        }
      }
    });
    if (count > 0) showTemporaryMessage(`✅ Rol "${newName}" sincronizado en el canvas`, 'success');
  } catch (_) {
    showTemporaryMessage('⚠️ Error al sincronizar con el canvas', 'warning');
  }
}

export function forceDetectRalphRoles() {
  const detected = detectRalphRolesFromCanvas();
  if (!detected.length) return detected;

  if (!rasciManager.rasciRoles) rasciManager.rasciRoles = [];
  let changed = false;

  detected.forEach(name => {
    if (!rasciManager.rasciRoles.includes(name)) {
      rasciManager.rasciRoles.push(name);
      changed = true;
    }
  });

  if (rasciManager.rasciMatrixData) {
    Object.keys(rasciManager.rasciMatrixData).forEach(task => {
      detected.forEach(role => {
        if (!(role in rasciManager.rasciMatrixData[task])) {
          rasciManager.rasciMatrixData[task][role] = undefined;
          changed = true;
          setTimeout(() => rasciManager.forceSaveRasciState(), 10);
        }
      });
    });
  }

  if (changed) {
    rasciManager.preventOverwriteExistingValues?.();
    const panel = document.querySelector('#rasci-panel');
    if (panel) renderMatrix(panel, rasciManager.rasciRoles, null);
  }

  return detected;
}

// -----------------------------------------------------
// Render / UI
// -----------------------------------------------------
export function renderMatrix(panel, rolesArray, autoSaveFn) {
  const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;

  rasciManager.setBpmnModeler(
    (sr && sr.get('BPMNModeler')) ||
    (rasciManager.adapter?.getBpmnModeler?.()) ||
    null
  );
  rasciManager.setImportingProject(!!(sr && sr.get('ImportingProjectFlag')));
  rasciManager.setStorageCleared(!!(sr && sr.get('StorageClearedFlag')));
  rasciManager.setRasciUIValidator((sr && sr.get('RASCIUIValidator')) || null);

  rasciManager.rasciMatrixData = RasciStore.getMatrix();
  rasciManager.rasciRoles = RasciStore.getRoles();

  roles = rolesArray || rasciManager.getRasciRoles() || [];
  autoSaveRasciState = autoSaveFn;

  const shouldClear =
    !rasciManager.isImportingProject &&
    (rasciManager.storageCleared ||
      !rasciManager.rasciMatrixData ||
      Object.keys(rasciManager.rasciMatrixData).length === 0);

  if (shouldClear) {
    rasciManager.rasciMatrixData = {};
    const currentTasks = rasciManager.getBpmnModeler() ? getBpmnTasks() : [];
    currentTasks.forEach(task => {
      const taskRoles = {};
      roles?.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[task] = taskRoles;
    });
  } else if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }

  rasciManager.rasciRoles = roles;

  if (typeof window !== 'undefined') {
    RasciStore.setMatrix(rasciManager.rasciMatrixData);
    RasciStore.setRoles(rasciManager.rasciRoles);
  }

  const mainTab = panel.querySelector('#main-tab');
  const matrixContainer = mainTab ? mainTab.querySelector('#matrix-container') : null;
  if (!matrixContainer) return;

  matrixContainer.innerHTML = '';
  matrixContainer.style.cssText = `
    width: 100%; height: 100%; max-height: calc(100vh - 180px); flex: 1; position: relative;
    border: 1px solid #e5e7eb; border-radius: 8px; background: #fff; padding: 0; margin: 0; overflow: auto; display: block;
  `;

  const table = document.createElement('table');
  table.className = 'rasci-matrix';
  table.style.cssText = `
    border-collapse: separate; border-spacing: 0; width: max-content; min-width: 500px; margin: 0;
    font-family: 'Segoe UI', Roboto, sans-serif; font-size: 11px; color: #333; border-radius: 6px; position: relative; display: table; table-layout: fixed;
  `;

  // Header
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');

  const taskHeader = document.createElement('th');
  taskHeader.style.cssText = `
    position: relative; background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 12px 16px; text-align: center;
    font-weight: 400; color: #1f2937; min-width: 160px; vertical-align: middle; font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
  `;
  const taskHeaderContent = document.createElement('div');
  taskHeaderContent.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 6px; position: relative; height: 100%; min-height: 24px;`;

  const taskText = document.createElement('span');
  taskText.textContent = 'Tarea';
  taskText.style.cssText = `
    font-weight: 600; color: #1f2937; font-size: 12px; text-transform: capitalize; letter-spacing: 0.2px; line-height: 1.4;
    display: flex; align-items: center; height: 100%; font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif; padding-left: 10px; margin-left: 5px;
  `;

  const reloadBtn = document.createElement('button');
  reloadBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
  reloadBtn.title = 'Recargar tareas del canvas';
  reloadBtn.style.cssText = `
    background: transparent; color: #6b7280; border: none; border-radius: 4px; padding: 2px; font-size: 11px; cursor: pointer;
    transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; line-height: 1;
  `;
  const reloadBtnStyleActive = `
    background: #e5e7eb; color: #374151; border: none; border-radius: 4px; padding: 2px; font-size: 11px; cursor: pointer;
    transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; min-width: 18px; height: 18px; line-height: 1;
  `;
  const reloadBtnStyleIdle = reloadBtn.style.cssText;

  reloadBtn.addEventListener('mouseenter', () => { reloadBtn.style.cssText = reloadBtnStyleActive; });
  reloadBtn.addEventListener('mouseleave', () => { reloadBtn.style.cssText = reloadBtnStyleIdle; });
  reloadBtn.addEventListener('click', (e) => {
    e.preventDefault(); e.stopPropagation();
    reloadBtn.style.cssText = reloadBtnStyleActive;
    reloadBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i>';
    setTimeout(() => {
      forceReloadMatrix();
      reloadBtn.style.cssText = reloadBtnStyleIdle;
      reloadBtn.innerHTML = '<i class="fas fa-sync-alt"></i>';
    }, 500);
  });

  taskHeaderContent.appendChild(taskText);
  taskHeaderContent.appendChild(reloadBtn);
  taskHeader.appendChild(taskHeaderContent);
  headerRow.appendChild(taskHeader);

  // Roles header
  roles.forEach((role, index) => {
    const roleHeader = document.createElement('th');
    roleHeader.className = 'role-header';
    roleHeader.dataset.roleIndex = String(index);

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

    const triggerEdit = (e) => {
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation();
      if (!roleHeader.querySelector('input[type="text"]')) {
        setTimeout(() => editRole(index, panel), 0);
      }
    };
    roleNameSpan.addEventListener('click', triggerEdit);
    roleNameSpan.addEventListener('dblclick', triggerEdit);

    deleteBtn.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
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

  // Body
  const tasks = getBpmnTasks();
  if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};

  const currentRoles = roles || rasciManager.rasciRoles || [];

  // Preservar valores actuales
  const existingValues = {};
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    existingValues[taskName] = {};
    Object.keys(rasciManager.rasciMatrixData[taskName]).forEach(roleName => {
      const v = rasciManager.rasciMatrixData[taskName][roleName];
      if (v && ['R', 'A', 'S', 'C', 'I'].includes(v)) existingValues[taskName][roleName] = v;
    });
  });

  tasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      currentRoles?.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    } else {
      const existingTask = rasciManager.rasciMatrixData[taskName];
      currentRoles?.forEach(r => {
        if (!(r in existingTask)) existingTask[r] = '';
        else if (existingValues[taskName] && existingValues[taskName][r]) {
          existingTask[r] = existingValues[taskName][r];
        }
      });
    }
  });

  Object.keys(existingValues).forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) return;
    Object.keys(existingValues[taskName]).forEach(roleName => {
      if (rasciManager.rasciMatrixData[taskName][roleName] !== undefined) {
        rasciManager.rasciMatrixData[taskName][roleName] = existingValues[taskName][roleName];
      }
    });
  });

  const tbody = document.createElement('tbody');

  const rasciColors = { R: '#e63946', A: '#f77f00', S: '#43aa8b', C: '#3a86ff', I: '#6c757d' };

  tasks.forEach(task => {
    const row = document.createElement('tr');

    const taskCell = document.createElement('td');
    taskCell.style.cssText = `
      background: #f8fafc; border-right: 2px solid #e2e8f0; padding: 20px 16px; text-align: left; font-weight: 600; color: #1f2937;
      font-size: 12px; vertical-align: middle; min-width: 160px; max-width: 240px; word-wrap: break-word; position: relative;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif;
    `;
    const taskNameSpan = document.createElement('span');
    taskNameSpan.textContent = task;
    taskNameSpan.style.cssText = `
      display: block; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 600;
      color: #1f2937; font-size: 12px; font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif; letter-spacing: 0.2px; padding-left: 10px; margin-left: 5px;
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

      const existingValue = rasciManager.rasciMatrixData?.[task]?.[role];
      if (existingValue && ['R', 'A', 'S', 'C', 'I'].includes(existingValue)) {
        const circle = document.createElement('span');
        circle.className = 'rasci-circle';
        circle.textContent = existingValue;
        circle.style.background = rasciColors[existingValue];
        display.appendChild(circle);
        cell.setAttribute('data-value', existingValue);
        cell.classList.add('cell-with-content');
      }

      container.addEventListener('keydown', (e) => {
        const key = e.key.toUpperCase();
        if (['R', 'A', 'S', 'C', 'I'].includes(key)) {
          e.preventDefault();

          if (key === 'R' || key === 'A') {
            const values = Object.values(rasciManager.rasciMatrixData?.[task] || {});
            const hasR = values.some(v => v === 'R');
            const hasA = values.some(v => v === 'A');
            if ((key === 'R' && hasR) || (key === 'A' && hasA)) {
              cell.style.backgroundColor = '#ffebee';
              cell.style.border = '2px solid #f44336';
              setTimeout(() => { cell.style.backgroundColor = ''; cell.style.border = ''; }, 800);
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

          if (!rasciManager.rasciMatrixData[task]) rasciManager.rasciMatrixData[task] = {};
          rasciManager.rasciMatrixData[task][role] = key;
          cell.setAttribute('data-value', key);
          cell.classList.add('cell-with-content');

          autoSaveRasciState?.();
          setTimeout(() => rasciManager.forceSaveRasciState(), 50);
          setTimeout(() => rasciManager.onRasciMatrixUpdated(), 100);
          setTimeout(() => getValidator()?.forceValidation?.(), 500);
        } else if (['-', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
          e.preventDefault();
          container.classList.remove('rasci-ready');
          cell.classList.remove('cell-ready', 'cell-with-content');
          display.innerHTML = '';
          if (rasciManager.rasciMatrixData?.[task]?.[role]) {
            delete rasciManager.rasciMatrixData[task][role];
          }
          cell.removeAttribute('data-value');

          autoSaveRasciState?.();
          setTimeout(() => rasciManager.forceSaveRasciState(), 50);
          setTimeout(() => rasciManager.onRasciMatrixUpdated(), 100);
          setTimeout(() => getValidator()?.forceValidation?.(), 500);
        }
      });

      container.addEventListener('click', (e) => { e.preventDefault(); container.focus(); });
      container.addEventListener('focus', () => { container.classList.add('rasci-ready'); cell.classList.add('cell-ready'); });
      container.addEventListener('blur', () => {
        container.classList.remove('rasci-ready');
        if (!cell.hasAttribute('data-value')) cell.classList.remove('cell-ready');
      });

      cell.appendChild(container);
      row.appendChild(cell);
    });

    const emptyCell = document.createElement('td');
    emptyCell.style.border = 'none';
    emptyCell.style.background = 'transparent';
    row.appendChild(emptyCell);

    tbody.appendChild(row);
  });

  table.appendChild(tbody);
  matrixContainer.appendChild(table);

  // Validación post-render
  setTimeout(() => {
    const v = getValidator();
    if (v?.autoValidateAfterMatrixUpdate) v.autoValidateAfterMatrixUpdate();
  }, 500);
}

export function addNewRole(panel, rolesArray, autoSaveFn) {
  roles = rolesArray || roles;
  autoSaveRasciState = autoSaveFn || autoSaveRasciState;

  const newRoleName = `Rol ${roles.length + 1}`;
  roles.push(newRoleName);
  rasciManager.rasciRoles = roles;

  autoSaveRasciState?.();
  renderMatrix(panel, roles, autoSaveRasciState);

  setTimeout(() => getValidator()?.forceValidation?.(), 800);
}

function makeRoleEditable(roleHeader, roleIndex) {
  const roleNameSpan = roleHeader.querySelector('.role-name');
  const currentName = roleNameSpan.textContent;

  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'role-edit-input';
  input.value = currentName;
  input.style.cssText = `
    width: 100px; padding: 2px 4px; border: none; background: transparent; text-align: center;
    position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); outline: none;
  `;

  roleNameSpan.style.visibility = 'hidden';
  roleHeader.appendChild(input);
  setTimeout(() => { input.focus(); input.select(); }, 0);

  function restoreView() {
    roleNameSpan.style.visibility = 'visible';
    try { input.remove(); } catch (_) {}
  }

  function saveChanges() {
    if (!input || !document.contains(input)) { restoreView(); return; }
    const newName = input.value.trim();
    if (newName && newName !== currentName) {
      try {
        updateCanvasRoleLabels(currentName, newName);
        roles[roleIndex] = newName;
        roleNameSpan.textContent = newName;
        autoSaveRasciState?.();
        setTimeout(() => rasciManager.forceSaveRasciState(), 10);
        setTimeout(() => getValidator()?.forceValidation?.(), 800);
      } catch (_) {}
    }
    restoreView();
  }

  input.addEventListener('blur', saveChanges);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveChanges(); }
    else if (e.key === 'Escape') { e.preventDefault(); restoreView(); }
  });
}

export function editRole(roleIndex, panel) {
  const roleHeader = panel.querySelector(`[data-role-index="${roleIndex}"]`);
  if (roleHeader) makeRoleEditable(roleHeader, roleIndex);
}

export function showDeleteConfirmModal(roleIndex, panel) {
  const roleName = roles[roleIndex];
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">Eliminar Rol</h3>
      <p class="modal-message">¿Eliminar el rol "${roleName}"? Esta acción no se puede deshacer.</p>
      <div class="modal-actions">
        <button class="modal-btn" id="cancel-delete">Cancelar</button>
        <button class="modal-btn danger" id="confirm-delete">Eliminar</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() { try { modal.remove(); } catch (_) {} }
  function confirmDelete() { deleteRole(roleIndex, panel); closeModal(); }

  modal.querySelector('#cancel-delete').addEventListener('click', closeModal);
  modal.querySelector('#confirm-delete').addEventListener('click', confirmDelete);

  const handleEsc = (e) => { if (e.key === 'Escape') { closeModal(); document.removeEventListener('keydown', handleEsc); } };
  document.addEventListener('keydown', handleEsc);
}

export function deleteRole(roleIndex, panel) {
  roles.splice(roleIndex, 1);
  autoSaveRasciState?.();
  setTimeout(() => rasciManager.forceSaveRasciState(), 10);
  renderMatrix(panel, roles, autoSaveRasciState);
  setTimeout(() => getValidator()?.forceValidation?.(), 800);
}

// -----------------------------------------------------
// Sincronización matriz <-> diagrama
// -----------------------------------------------------
export function updateMatrixFromDiagram() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;

  const preserved = preserveRasciValues();
  const currentTasks = getBpmnTasks();
  if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};

  let hasChanges = false;
  let currentRoles = roles?.length ? roles : (rasciManager.rasciRoles || []);

  const detected = detectRalphRolesFromCanvas();
  if (detected.length) {
    detected.forEach(r => { if (!currentRoles.includes(r)) currentRoles.push(r); });
    rasciManager.rasciRoles = [...currentRoles];
  }

  currentTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      currentRoles?.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      hasChanges = true;
    } else {
      const existing = rasciManager.rasciMatrixData[taskName];
      let updated = false;
      currentRoles?.forEach(r => {
        if (!(r in existing)) { existing[r] = ''; updated = true; }
      });
      if (updated) hasChanges = true;
    }
  });

  rasciManager.preventOverwriteExistingValues?.();
  const restored = restoreRasciValues(preserved);
  if (restored > 0) autoSaveRasciState?.();

  // Eliminar tareas que ya no existan
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    if (!currentTasks.includes(taskName)) { delete rasciManager.rasciMatrixData[taskName]; hasChanges = true; }
  });

  if (hasChanges) {
    const panel = document.querySelector('#rasci-panel');
    if (panel) renderMatrix(panel, currentRoles, autoSaveRasciState);
  }

  setTimeout(() => {
    const v = getValidator();
    if (v?.autoValidateAfterMatrixUpdate) v.autoValidateAfterMatrixUpdate();
    else v?.forceValidation?.();
    v?.validateEmptyTasks?.();
  }, 200);
}

export function setupDiagramChangeListener() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;
  modeler.get('eventBus').on('element.changed', () => setTimeout(updateMatrixFromDiagram, 500));
}

// -----------------------------------------------------
// Operaciones utilitarias públicas
// -----------------------------------------------------
export function forceReloadMatrix() {
  try {
    const panel = document.querySelector('#rasci-panel');
    const r = rasciManager?.rasciRoles || [];
    renderMatrix(panel, r, null);
  } catch (_) {}
}

export function forceDetectNewTasks() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;

  const currentTasks = getBpmnTasks();
  if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};
  let changed = false;

  currentTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      roles?.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      changed = true;
    }
  });

  if (changed) {
    setTimeout(() => {
      const v = getValidator();
      v?.forceValidation?.();
      v?.validateEmptyTasks?.();
    }, 100);
  }
}

export function diagnoseRasciState() {
  // Salida reducida, sin logs ruidosos
  return {
    hasManager: !!rasciManager,
    hasModeler: !!rasciManager.getBpmnModeler(),
    roles: (rasciManager.rasciRoles || []).slice(),
    tasksCount: Object.keys(rasciManager.rasciMatrixData || {}).length
  };
}

export function forceFullSync() {
  const bpmnTasks = getBpmnTasks();
  if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};

  bpmnTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      roles?.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    }
  });

  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    if (!bpmnTasks.includes(taskName)) delete rasciManager.rasciMatrixData[taskName];
  });

  setTimeout(() => {
    const v = getValidator();
    v?.validateEmptyTasks?.();
    v?.forceValidation?.();
  }, 100);
}

export function repairRasciRalphMapping() {
  try {
    const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    rasciManager.setBpmnModeler(
      (sr && sr.get('BPMNModeler')) ||
      (rasciManager.adapter?.getBpmnModeler?.()) ||
      null
    );
    rasciManager.setRasciUIValidator((sr && sr.get('RASCIUIValidator')) || null);

    if (rasciManager.adapter?.getMatrixData) {
      rasciManager.rasciMatrixData = { ...rasciManager.adapter.getMatrixData() };
    }
    if (rasciManager.adapter?.getRoles) {
      rasciManager.rasciRoles = [...rasciManager.adapter.getRoles()];
    }

    const ralphRoles = detectRalphRolesFromCanvas();
    if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};
    if (!rasciManager.rasciRoles) rasciManager.rasciRoles = [];

    ralphRoles.forEach(rr => {
      if (!rasciManager.rasciRoles.includes(rr)) rasciManager.rasciRoles.push(rr);
    });

    const bpmnTasks = getBpmnTasks();
    bpmnTasks.forEach(taskName => {
      if (!rasciManager.rasciMatrixData[taskName]) rasciManager.rasciMatrixData[taskName] = {};
      rasciManager.rasciRoles.forEach(role => {
        if (!(role in rasciManager.rasciMatrixData[taskName])) {
          rasciManager.rasciMatrixData[taskName][role] = '';
        }
      });
    });

    const panel = document.querySelector('#rasci-panel');
    if (panel) renderMatrix(panel, rasciManager.rasciRoles, null);

    return {
      success: true,
      rolesAdded: ralphRoles.length,
      tasksProcessed: bpmnTasks.length,
      ralphRoles,
      currentRoles: rasciManager.rasciRoles
    };
  } catch (error) {
    return { success: false, error: error?.message || 'Error desconocido' };
  }
}

// -----------------------------------------------------
// Service Registry (registro no duplicado)
// -----------------------------------------------------
function setupServiceRegistry() {
  const sr = getServiceRegistry?.();
  if (!sr) return;

  sr.registerFunction('updateMatrixFromDiagram', updateMatrixFromDiagram);
  sr.registerFunction('detectRalphRolesFromCanvas', detectRalphRolesFromCanvas);
  sr.registerFunction('forceDetectRalphRoles', forceDetectRalphRoles);
  sr.registerFunction('reloadRasciMatrix', () => {
    const panel = document.querySelector('#rasci-panel');
    if (panel) renderMatrix(panel, rasciManager.rasciRoles || [], null);
  });
  sr.registerFunction('manualReloadRasciMatrix', () => {
    const panel = document.querySelector('#rasci-panel');
    if (panel) renderMatrix(panel, rasciManager.rasciRoles || [], null);
  });
  sr.registerFunction('forceDetectNewTasks', forceDetectNewTasks);
  sr.registerFunction('diagnoseRasciState', diagnoseRasciState);
  sr.registerFunction('forceFullSync', forceFullSync);
  sr.registerFunction('repairRasciRalphMapping', repairRasciRalphMapping);
}
setupServiceRegistry();

// -----------------------------------------------------
// Callbacks externos
// -----------------------------------------------------
export function setOnRasciMatrixUpdatedCallback(callback) {
  onRasciMatrixUpdatedFunction = callback;
}

// Export principal
export { rasciManager };
