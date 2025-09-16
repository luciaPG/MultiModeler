// RASCI Matrix UI Validator

import { rasciValidator } from '../validation/matrix-validator.js';
import { RasciStore } from '../store.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';
import { onStorage } from '../../ui/core/dom-events.js';
import { registerDebug } from '../../../shared/debug-registry.js';

// Bootstrap SR
const sr = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : undefined;
const eventBus = sr && sr.get ? sr.get('EventBus') : undefined;
const rasciAdapter = sr && sr.get ? sr.get('RASCIAdapter') : undefined;
const validator = sr && sr.get ? sr.get('RASCIUIValidator') : undefined;
const bpmnModeler = sr && sr.get ? sr.get('BPMNModeler') : (rasciAdapter && rasciAdapter.getBpmnModeler ? rasciAdapter.getBpmnModeler() : undefined);

export class RasciMatrixUIValidator {
  constructor() {
    this.validationContainer = null;
    this.isVisible = false;
    this.lastValidation = null;
    this.debounceTimer = null;
  }

  // Inicializar el validador de UI
  init(panel) {
    this.panel = panel;
    this.createValidationContainer();
    this.setupValidationObserver();
  }

  // Crear contenedor de validación
  createValidationContainer() {
    // Buscar el contenedor principal de la matriz
    const mainTab = this.panel.querySelector('#main-tab');
    if (!mainTab) {
      return;
    }

    // Crear contenedor de validación
    this.validationContainer = document.createElement('div');
    this.validationContainer.id = 'rasci-validation-container';
    this.validationContainer.className = 'validation-container';
    this.validationContainer.style.cssText = `
      width: 100%;
      margin-top: 16px;
      margin-bottom: 16px;
      padding: 16px;
      border-radius: 8px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      font-family: 'Segoe UI', Roboto, sans-serif;
      font-size: 13px;
      line-height: 1.5;
      display: none;
      transition: all 0.3s ease;
    `;

    // Insertar después del contenedor de la matriz
    const matrixContainer = mainTab.querySelector('#matrix-container');
    if (matrixContainer && matrixContainer.parentNode) {
      matrixContainer.parentNode.insertBefore(this.validationContainer, matrixContainer.nextSibling);
    } else {
      mainTab.appendChild(this.validationContainer);
    }
  }

  // Configurar observador de cambios para validación automática
  setupValidationObserver() {
    // Observar cambios en la matriz
    const matrixContainer = this.panel.querySelector('#matrix-container');
    if (matrixContainer) {
      const observer = new MutationObserver(() => {
        this.debouncedValidate();
        
        // También verificar tareas vacías específicamente
        setTimeout(() => {
          this.validateEmptyTasks();
        }, 200);
      });

      observer.observe(matrixContainer, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style']
      });
    }

    // Observar cambios en localStorage
    onStorage((e) => {
      if (e.key === 'rasciMatrixData' || e.key === 'rasciRoles') {
        this.debouncedValidate();
      }
    });
    
    // Observar cambios en RasciStore
    let lastMatrixData = null;
    setInterval(() => {
      if (RasciStore.getMatrix() !== lastMatrixData) {
        lastMatrixData = RasciStore.getMatrix();
        this.debouncedValidate();
        
        // También verificar tareas vacías específicamente
        setTimeout(() => {
          this.validateEmptyTasks();
        }, 200);
      }
    }, 500);
  }

  // Validación con debounce para evitar demasiadas validaciones
  debouncedValidate() {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.validateCurrentMatrix();
    }, 300);
  }

  // Validar matriz actual
  validateCurrentMatrix() {
    try {
      
      // Obtener datos actuales
      const roles = this.getCurrentRoles();
      const matrixData = this.getCurrentMatrixData();
      const organizationalRoles = this.getOrganizationalRoles();

      // Verificar si hay datos para validar
      if (!roles || roles.length === 0) {
        this.showNoDataMessage('No hay roles definidos en la matriz RASCI. Por favor, añade al menos un rol.');
        return;
      }

      if (!matrixData || Object.keys(matrixData).length === 0) {
        this.showNoDataMessage('No hay datos de matriz para validar. Por favor, añade tareas y asigna responsabilidades.');
        return;
      }

      // Realizar validación
      const validation = rasciValidator.validateRealTime(roles, matrixData, organizationalRoles);
      
      // Mostrar resultados
      this.displayValidationResults(validation);
      
      this.lastValidation = validation;
    } catch (error) {
      console.error('Error during validation:', error);
    }
  }

  // Obtener roles actuales
  getCurrentRoles() {
    try {
      // Intentar obtener desde localStorage con diferentes claves
      let roles = [];
      const localStorageKeys = ['rasciRoles', 'roles', 'matrixRoles'];

      for (const key of localStorageKeys) {
        const savedRoles = localStorage.getItem(key);
        if (savedRoles) {
          try {
            const parsedRoles = JSON.parse(savedRoles);
            if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
              roles = parsedRoles;
              break;
            }
          } catch (parseError) {
            console.error('Error parsing roles from localStorage:', parseError);
          }
        }
      }
      
      // Intentar obtener desde window si está disponible
      if (roles.length === 0) {
        roles = RasciStore.getRoles();
      }
      
      // Si no hay roles, intentar extraerlos de la matriz
      if (roles.length === 0) {
        const matrixData = this.getCurrentMatrixData();
        if (matrixData && Object.keys(matrixData).length > 0) {
          const matrixRoles = new Set();
          Object.values(matrixData).forEach(taskRoles => {
            if (typeof taskRoles === 'object') {
              Object.keys(taskRoles).forEach(role => {
                if (role && role.trim()) {
                  matrixRoles.add(role.trim());
                }
              });
            }
          });
          roles = Array.from(matrixRoles);
        }
      }
      
      return roles;
    } catch (error) {
      return [];
    }
  }

  // Obtener datos de matriz actuales
  getCurrentMatrixData() {
    try {
      // Prioridad 1: RasciStore (datos en memoria)
      const matrixData = RasciStore.getMatrix();
      if (matrixData && typeof matrixData === 'object') {
        const taskCount = Object.keys(matrixData).length;
        
        if (taskCount > 0) {
          return matrixData;
        }
      }
      
      // Prioridad 2: localStorage.rasciMatrixData
      const savedMatrix = localStorage.getItem('rasciMatrixData');
      if (savedMatrix) {
        try {
          const parsedMatrix = JSON.parse(savedMatrix);
          if (parsedMatrix && typeof parsedMatrix === 'object') {
            const taskCount = Object.keys(parsedMatrix).length;
            
            if (taskCount > 0) {
              return parsedMatrix;
            }
          }
        } catch (parseError) {
          console.error('Error parsing matrix from localStorage:', parseError);
        }
      }
      
      // Prioridad 3: localStorage.previousRasciMatrixData
      const previousMatrix = localStorage.getItem('previousRasciMatrixData');
      if (previousMatrix) {
        try {
          const parsedMatrix = JSON.parse(previousMatrix);
          if (parsedMatrix && typeof parsedMatrix === 'object') {
            const taskCount = Object.keys(parsedMatrix).length;
            
            if (taskCount > 0) {
              return parsedMatrix;
            }
          }
        } catch (parseError) {
          console.error('Error parsing previous matrix from localStorage:', parseError);
        }
      }
      
      return {};
    } catch (error) {
      return {};
    }
  }

  // Obtener roles organizativos (desde RALph si está disponible)
  getOrganizationalRoles() {
    try {
      // Intentar obtener roles desde RALph de múltiples fuentes
      let roles = [];
      
      // 1. Intentar desde ServiceRegistry (RALphModeler)
      const sr = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : null;
      const ralphModeler = sr && (sr.get('RALphModeler') || sr.get('RALph'));
      if (ralphModeler && ralphModeler.get) {
        try {
          const elementRegistry = ralphModeler.get('elementRegistry');
          const ralphElements = elementRegistry.filter(element => 
            element.type === 'ralph:Role' || 
            element.type === 'ralph:OrganizationalRole'
          );
          if (ralphElements.length > 0) {
            const ralphRoles = ralphElements.map(role => role.businessObject.name || role.id);
            if (ralphRoles.length > 0) {
              roles = ralphRoles;
            }
          }
        } catch (error) {
          console.error('Error getting RALPH roles from BPMN modeler:', error);
        }
      }
      
      // 3. Intentar desde localStorage con diferentes claves
      if (roles.length === 0) {
        const localStorageKeys = ['ralphRoles', 'RALphRoles', 'organizationalRoles', 'roles', 'ralphRoleList'];
        for (const key of localStorageKeys) {
          const savedRoles = localStorage.getItem(key);
          if (savedRoles) {
            try {
              const parsedRoles = JSON.parse(savedRoles);
              if (Array.isArray(parsedRoles) && parsedRoles.length > 0) {
                roles = parsedRoles;
                break;
              }
            } catch (parseError) {
              console.error('Error parsing roles from localStorage key:', key, parseError);
            }
          }
        }
      }
      
      // 4. Intentar desde el DOM si hay elementos RALph visibles
      if (roles.length === 0) {
        const ralphElements = document.querySelectorAll('[data-element-type="ralph:Role"], [data-element-type="ralph:OrganizationalRole"]');
        if (ralphElements.length > 0) {
          const domRoles = Array.from(ralphElements).map(el => el.getAttribute('data-element-name') || el.textContent.trim());
          if (domRoles.length > 0) {
            roles = domRoles.filter(role => role && role.length > 0);
          }
        }
      }
      
      // 2. Intentar desde el modeler de BPMN si tiene roles organizativos
      const bpmnModeler = sr && (sr.get('BPMNModeler') || sr.get('BpmnModeler'));
      if (roles.length === 0 && bpmnModeler && bpmnModeler.get) {
        try {
          const elementRegistry = bpmnModeler.get('elementRegistry');
          const bpmnElements = elementRegistry.filter(element => 
            element.type === 'bpmn:Participant' || 
            element.type === 'bpmn:Lane'
          );
          if (bpmnElements.length > 0) {
            const bpmnRoles = bpmnElements.map(element => element.businessObject.name || element.id);
            if (bpmnRoles.length > 0) {
              roles = bpmnRoles;
            }
          }
        } catch (error) {
          console.error('Error getting roles from BPMN elements:', error);
        }
      }
      
      // 3. Evitar inspección arbitraria de variables globales en producción
      return roles;
    } catch (error) {
      return [];
    }
  }

  // Mostrar resultados de validación
  displayValidationResults(validation) {
    if (!this.validationContainer) {
      return;
    }

    const hasIssues = validation.criticalErrors.length > 0 || validation.warnings.length > 0;
    
    if (!hasIssues) {
      this.hideValidationContainer();
      return;
    }
    this.validationContainer.innerHTML = this.generateValidationHTML(validation);
    this.showValidationContainer();
    
    // Marcar celdas incorrectas con fondo rojo
    this.markInvalidCells(validation);
  }

  // Marcar celdas incorrectas con fondo rojo
  markInvalidCells(validation) {
    if (!validation.criticalErrors || validation.criticalErrors.length === 0) {
      // Limpiar marcado rojo si no hay errores
      this.clearInvalidCellMarking();
      return;
    }

    // Obtener la matriz actual
    const matrixData = this.getCurrentMatrixData();
    if (!matrixData) return;

    // Limpiar marcado anterior
    this.clearInvalidCellMarking();

    // SOLO marcar en rojo cuando hay repetición de R o A
    validation.criticalErrors.forEach(error => {
      if (error.message.includes('tiene múltiples aprobadores')) {
        // Marcar celda específica con múltiples A
        const taskName = this.extractTaskNameFromError(error.message);
        const roleName = this.extractRoleNameFromError(error.message);
        if (taskName && roleName) {
          this.markSpecificCellAsInvalid(taskName, roleName);
        }
      } else if (error.message.includes('múltiples aprobadores')) {
        // Marcar celdas con múltiples A en la misma tarea
        const taskName = this.extractTaskNameFromError(error.message);
        if (taskName) {
          this.markMultipleACellsAsInvalid(taskName);
        }
      } else if (error.message.includes('múltiples responsables')) {
        // Marcar celdas con múltiples R
        const taskName = this.extractTaskNameFromError(error.message);
        if (taskName) {
          this.markMultipleRCellsAsInvalid(taskName);
        }
      }
      // NO marcar en rojo para otros errores (tareas sin roles, etc.)
    });
  }

  // Extraer nombre de tarea del mensaje de error
  extractTaskNameFromError(errorMessage) {
    const match = errorMessage.match(/'([^']+)'/);
    return match ? match[1] : null;
  }

  // Extraer nombre del rol del mensaje de error
  extractRoleNameFromError(errorMessage) {
    const match = errorMessage.match(/El rol '([^']+)'/);
    return match ? match[1] : null;
  }

  // Marcar todas las celdas de una tarea como incorrectas
  markTaskCellsAsInvalid(taskName) {
    const matrixTable = document.querySelector('.rasci-matrix');
    if (!matrixTable) return;

    const rows = matrixTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const taskCell = row.querySelector('td:first-child');
      if (taskCell && taskCell.textContent === taskName) {
        // Marcar todas las celdas de esta fila con fondo rojo
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach(cell => {
          cell.style.backgroundColor = '#ffebee';
          cell.style.border = '2px solid #f44336';
        });
      }
    });
  }

  // Marcar una celda específica como incorrecta
  markSpecificCellAsInvalid(taskName, roleName) {
    const matrixTable = document.querySelector('.rasci-matrix');
    if (!matrixTable) return;

    const rows = matrixTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const taskCell = row.querySelector('td:first-child');
      if (taskCell && taskCell.textContent === taskName) {
        // Encontrar la columna del rol específico
        const headerRow = matrixTable.querySelector('thead tr');
        const headers = headerRow.querySelectorAll('th');
        let roleColumnIndex = -1;
        
        headers.forEach((header, index) => {
          const roleSpan = header.querySelector('.role-name');
          if (roleSpan && roleSpan.textContent === roleName) {
            roleColumnIndex = index;
          }
        });

        if (roleColumnIndex > 0) { // > 0 porque la primera columna es la tarea
          const cells = row.querySelectorAll('td');
          const targetCell = cells[roleColumnIndex - 1]; // -1 porque las celdas empiezan después de la columna de tarea
          if (targetCell) {
            targetCell.style.backgroundColor = '#ffebee';
            targetCell.style.border = '2px solid #f44336';
          }
        }
      }
    });
  }

  // Marcar celdas con múltiples R como incorrectas
  markMultipleRCellsAsInvalid(taskName) {
    const matrixTable = document.querySelector('.rasci-matrix');
    if (!matrixTable) return;

    const rows = matrixTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const taskCell = row.querySelector('td:first-child');
      if (taskCell && taskCell.textContent === taskName) {
        // Marcar solo las celdas que contienen R
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach(cell => {
          const rasciDisplay = cell.querySelector('.rasci-display');
          if (rasciDisplay) {
            const circle = rasciDisplay.querySelector('.rasci-circle');
            if (circle && circle.textContent.includes('R')) {
              cell.style.backgroundColor = '#ffebee';
              cell.style.border = '2px solid #f44336';
            }
          }
        });
      }
    });
  }

  // Marcar celdas con múltiples A como incorrectas
  markMultipleACellsAsInvalid(taskName) {
    const matrixTable = document.querySelector('.rasci-matrix');
    if (!matrixTable) return;

    const rows = matrixTable.querySelectorAll('tbody tr');
    rows.forEach(row => {
      const taskCell = row.querySelector('td:first-child');
      if (taskCell && taskCell.textContent === taskName) {
        // Marcar solo las celdas que contienen A
        const cells = row.querySelectorAll('td:not(:first-child)');
        cells.forEach(cell => {
          const rasciDisplay = cell.querySelector('.rasci-display');
          if (rasciDisplay) {
            const circle = rasciDisplay.querySelector('.rasci-circle');
            if (circle && circle.textContent.includes('A')) {
              cell.style.backgroundColor = '#ffebee';
              cell.style.border = '2px solid #f44336';
            }
          }
        });
      }
    });
  }

  // Limpiar marcado rojo de todas las celdas
  clearInvalidCellMarking() {
    const matrixTable = document.querySelector('.rasci-matrix');
    if (!matrixTable) return;

    const cells = matrixTable.querySelectorAll('td');
    cells.forEach(cell => {
      cell.style.backgroundColor = '';
      cell.style.border = '';
    });
  }

  // Generar HTML de validación
  generateValidationHTML(validation) {
    let html = '<div class="validation-header">';
    
    // Solo mostrar errores críticos
    if (validation.criticalErrors.length > 0) {
      html += `
        <div class="validation-title critical">
          <span class="validation-icon">❌</span>
          <span class="validation-text">Errores críticos detectados</span>
        </div>
      `;
    }

    html += '</div>';

    // Solo errores críticos
    if (validation.criticalErrors.length > 0) {
      html += `<div class="validation-section critical-errors">`;
      html += '<h4>No se puede exportar a BPMN + RALph hasta corregirlos</h4>';
      html += '<ul class="validation-list critical-list">';
      
      validation.criticalErrors.forEach(error => {
        html += `
          <li class="validation-item critical-item">
            <span class="error-icon">🔴</span>
            <span class="error-message">${error.message}</span>
          </li>
        `;
      });
      
      html += '</ul>';
      html += '</div>';
    }

    html += '</div>';

    return html;
  }

  // Mostrar contenedor de validación
  showValidationContainer() {
    if (this.validationContainer) {
      this.validationContainer.style.display = 'block';
      this.isVisible = true;
      
      // Aplicar estilos CSS
      this.applyValidationStyles();
    }
  }

  // Ocultar contenedor de validación
  hideValidationContainer() {
    if (this.validationContainer) {
      this.validationContainer.style.display = 'none';
      this.isVisible = false;
    }
  }

  // Aplicar estilos CSS para la validación
  applyValidationStyles() {
    if (!this.validationContainer) return;

    // Estilos para el contenedor principal (sin borde rojo confuso)
    this.validationContainer.style.cssText += `
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    `;

    // Estilos para elementos internos
    const style = document.createElement('style');
    style.id = 'rasci-validation-styles';
    style.textContent = `
      .validation-header {
        margin-bottom: 16px;
        padding-bottom: 12px;
        border-bottom: 1px solid #e2e8f0;
      }

      .validation-title {
        display: flex;
        align-items: center;
        gap: 8px;
        font-weight: 600;
        font-size: 14px;
      }

      .validation-title.critical {
        color: #dc2626;
      }

             .validation-title.warning {
         color: #d97706;
       }

       .validation-title.info {
         color: #2563eb;
       }

       .validation-icon {
         font-size: 16px;
       }

      .validation-section {
        margin-bottom: 16px;
      }

      .validation-section h4 {
        margin: 0 0 8px 0;
        font-size: 13px;
        font-weight: 600;
        color: #374151;
      }

      .validation-list {
        margin: 0;
        padding: 0;
        list-style: none;
      }

      .validation-item {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        margin-bottom: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        line-height: 1.4;
      }

      .critical-item {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

             .warning-item {
         background: #fffbeb;
         border: 1px solid #fed7aa;
         color: #92400e;
       }

       .info-item {
         background: #eff6ff;
         border: 1px solid #bfdbfe;
         color: #1e40af;
       }

       .error-icon, .warning-icon {
         font-size: 12px;
         flex-shrink: 0;
         margin-top: 1px;
       }

      .error-message, .warning-message {
        flex: 1;
      }

      .validation-status {
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid #e2e8f0;
      }

      .status-message {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 8px 12px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
      }

      .status-message.critical {
        background: #fef2f2;
        border: 1px solid #fecaca;
        color: #991b1b;
      }

      .status-message.success {
        background: #f0fdf4;
        border: 1px solid #bbf7d0;
        color: #166534;
      }

      .status-icon {
        font-size: 14px;
      }

      .status-text {
        flex: 1;
      }
    `;

    // Evitar duplicar estilos
    if (!document.getElementById('rasci-validation-styles')) {
      document.head.appendChild(style);
    }
  }

  // Validar celda específica (para validación en tiempo real durante edición)
  validateCell(role, task, value) {
    const cellValidation = rasciValidator.validateCell(role, task, value);
    
    if (!cellValidation.isValid) {
      this.showCellValidationError(role, task, cellValidation.issues);
    } else {
      this.hideCellValidationError(role, task);
    }
    
    return cellValidation;
  }

  // Mostrar error de validación de celda
  showCellValidationError(role, task, issues) {
    // Implementar validación visual de celda específica
    const cell = this.findCell(role, task);
    if (cell) {
      cell.style.backgroundColor = '#fef2f2';
      cell.style.border = '2px solid #ef4444';
      cell.title = issues.join('\n');
    }
  }

  // Ocultar error de validación de celda
  hideCellValidationError(role, task) {
    const cell = this.findCell(role, task);
    if (cell) {
      cell.style.backgroundColor = '';
      cell.style.border = '';
      cell.title = '';
    }
  }

  // Encontrar celda específica
  findCell(role, task) {
    // Implementar búsqueda de celda específica
    const matrixContainer = this.panel.querySelector('#matrix-container');
    if (!matrixContainer) return null;

    // Buscar por atributos de datos o posición
    const cells = matrixContainer.querySelectorAll('td[data-role][data-task]');
    for (const cell of cells) {
      if (cell.getAttribute('data-role') === role && cell.getAttribute('data-task') === task) {
        return cell;
      }
    }
    
    return null;
  }

  // Forzar validación (para uso externo)
  forceValidation() {

    this.validateCurrentMatrix();
  }

  // Función para validación automática después de cambios en la matriz
  autoValidateAfterMatrixUpdate() {
    // Pequeño delay para asegurar que los datos se han actualizado
    setTimeout(() => {
      this.validateCurrentMatrix();
    }, 100);
  }

  // Función para validación inmediata cuando se detectan tareas vacías
  validateEmptyTasks() {
    const matrixData = this.getCurrentMatrixData();
    
    if (!matrixData || Object.keys(matrixData).length === 0) {
      return;
    }
    
    const allTasks = Object.keys(matrixData);
    
    // Siempre ejecutar validación si hay tareas
    if (allTasks.length > 0) {
      this.validateCurrentMatrix();
      
      // Validación adicional para asegurar que se detecten todas las tareas vacías
      setTimeout(() => {
        this.validateCurrentMatrix();
      }, 50);
    }
  }

  // Función para debug del estado de datos
  debugDataState() {

  }

  // Función global para diagnóstico completo del validador
  diagnoseValidator() {
    
    const validatorState = {
      panel: !!this.panel,
      validationContainer: !!this.validationContainer,
      isVisible: this.isVisible,
      lastValidation: this.lastValidation
    };
    
    console.log('=== RASCI UI Validator Diagnosis ===');
    console.log('1. Validator State:', validatorState);
    
    // 2. Datos actuales
    const currentRoles = this.getCurrentRoles();
    const currentMatrixData = this.getCurrentMatrixData();
    const organizationalRoles = this.getOrganizationalRoles();
    
    console.log('2. Current Data:');
    console.log('   - Current Roles:', currentRoles);
    console.log('   - Matrix Data Tasks:', Object.keys(currentMatrixData || {}));
    console.log('   - Organizational Roles:', organizationalRoles);
    
    // 3. Análisis de tareas
    if (currentMatrixData && Object.keys(currentMatrixData).length > 0) {
      const allTasks = Object.keys(currentMatrixData);
      const tasksWithData = allTasks.filter(taskName => {
        const taskData = currentMatrixData[taskName] || {};
        return taskData && typeof taskData === 'object' && Object.keys(taskData).length > 0;
      });
      
      const tasksWithRoles = allTasks.filter(taskName => {
        const taskData = currentMatrixData[taskName] || {};
        return Object.values(taskData).some(value => value && value.trim() !== '');
      });
      
      console.log('3. Task Analysis:');
      console.log('   - Total Tasks:', allTasks.length);
      console.log('   - Tasks with Data:', tasksWithData.length);
      console.log('   - Tasks with Roles:', tasksWithRoles.length);
    }
    
    console.log('=== End Diagnosis ===');
  }

  // Limpiar validación
  clearValidation() {
    this.hideValidationContainer();
    this.lastValidation = null;
  }

  // Obtener estado de validación actual
  getValidationState() {
    return this.lastValidation;
  }

  // Verificar si se puede exportar
  canExport() {
    return this.lastValidation ? this.lastValidation.canContinue : false;
  }

  // Mostrar mensaje cuando no hay datos
  showNoDataMessage(message) {
    if (!this.validationContainer) {
      return;
    }



    const validation = {
      criticalErrors: [{
        type: 'info',
        message: message,
        timestamp: new Date().toISOString()
      }],
      warnings: [],
      hasCriticalErrors: true,
      canContinue: false
    };

    this.displayValidationResults(validation);
  }
}

// Configurar ServiceRegistry para el validador de UI
function setupServiceRegistry() {
  const registry = getServiceRegistry();

  // Registrar funciones de validación en ServiceRegistry
  registry.registerFunction('debugRasciValidator', () => {
    const validator = registry.get('rasciUIValidator');
    if (validator) {
      validator.diagnoseValidator();
    } else {
      console.warn('RASCI UI Validator no disponible en ServiceRegistry');
    }
  }, {
    alias: 'debugRasciValidator',
    description: 'Debug del validador de UI RASCI'
  });

  registry.registerFunction('forceRasciValidation', () => {
    const validator = registry.get('rasciUIValidator');
    if (validator) {
      validator.validateCurrentMatrix();
    } else {
      console.warn('RASCI UI Validator no disponible en ServiceRegistry');
    }
  }, {
    alias: 'forceRasciValidation',
    description: 'Forzar validación de matriz RASCI'
  });

  registry.registerFunction('autoValidateRasci', () => {
    const validator = registry.get('rasciUIValidator');
    if (validator) {
      validator.validateEmptyTasks();
      setTimeout(() => {
        validator.validateCurrentMatrix();
      }, 100);
    } else {
      console.warn('RASCI UI Validator no disponible en ServiceRegistry');
    }
  }, {
    alias: 'autoValidateRasci',
    description: 'Validación automática de RASCI'
  });

  registry.registerFunction('validateEmptyRasciTasks', () => {
    const validator = registry.get('rasciUIValidator');
    if (validator) {
      validator.validateEmptyTasks();
    } else {
      console.warn('RASCI UI Validator no disponible en ServiceRegistry');
    }
  }, {
    alias: 'validateEmptyRasciTasks',
    description: 'Validar tareas vacías en RASCI'
  });

  registry.registerFunction('analyzeRasciState', () => {
    const validator = registry.get('rasciUIValidator');
    if (validator) {
      validator.diagnoseValidator();
    }

    // Ejecutar diagnóstico del estado general
    const diagnoseFn = registry.getFunction('diagnoseRasciState');
    if (diagnoseFn) {
      diagnoseFn();
    }

    // Ejecutar sincronización completa
    const syncFn = registry.getFunction('forceFullSync');
    if (syncFn) {
      syncFn();
    }
  }, {
    alias: 'analyzeRasciState',
    description: 'Análisis completo del estado RASCI'
  });

  // Registrar la instancia del validador
  registry.register('rasciUIValidator', rasciUIValidator);

  // Exponer API de debug en modo desarrollo
  registerDebug('rasciUIValidator', {
    debugRasciValidator: registry.getFunction('debugRasciValidator'),
    forceRasciValidation: registry.getFunction('forceRasciValidation'),
    autoValidateRasci: registry.getFunction('autoValidateRasci'),
    validateEmptyRasciTasks: registry.getFunction('validateEmptyRasciTasks'),
    analyzeRasciState: registry.getFunction('analyzeRasciState'),
    getValidator: () => registry.get('rasciUIValidator')
  });

  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('✅ ServiceRegistry configurado para RASCI UI Validator');
}

// Instancia global del validador de UI
export const rasciUIValidator = new RasciMatrixUIValidator();

// Configurar ServiceRegistry al final del archivo
setupServiceRegistry();
