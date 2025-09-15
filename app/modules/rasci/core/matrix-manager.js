// RASCI Matrix Manager (versión compacta y corregida)

// Dependencias
import { rasciUIValidator as ImportedValidator } from '../ui/matrix-ui-validator.js';
import rasciAdapter from '../RASCIAdapter.js';
import { getEventBus } from '../../ui/core/event-bus.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';
import { RasciStore } from '../store.js';
import { executeSimpleRasciMapping } from '../mapping/main-mapper.js';

// Estado interno
let onRasciMatrixUpdatedFunction = null;
let roles = [];
let autoSaveRasciState = null;
// Buffer/flags para aplicar cambios acumulados tras corregir errores
let hasHardRuleErrorsPrev = false;
let pendingMappingDueToErrors = false;
let bufferedMatrixState = null; // Estado de la matriz guardado durante errores

// Función para actualizar variables globales del buffer
function updateGlobalBufferState() {
  if (typeof window !== 'undefined') {
    window.bufferedMatrixState = bufferedMatrixState;
    window.pendingMappingDueToErrors = pendingMappingDueToErrors;
    window.hasHardRuleErrorsPrev = hasHardRuleErrorsPrev;
  }
}

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
      
      // Filtrar tareas automáticas que empiezan con "Aprobar"
      if (name && !tasks.includes(name)) {
        const isAutoTask = name.startsWith('Aprobar ');
        if (isAutoTask) {
          console.log(`🤖 Excluyendo tarea automática de matriz RASCI: ${name}`);
        } else {
          tasks.push(name);
        }
      }
    }
  });

  console.log(`📋 Tareas detectadas para matriz RASCI: ${tasks.length} (tareas automáticas excluidas)`);
  return tasks;
}

// Función para limpiar tareas automáticas de la matriz existente
export function cleanAutoTasksFromMatrix() {
  console.log('🧹 Limpiando tareas automáticas de la matriz RASCI...');
  
  if (!rasciManager.rasciMatrixData) {
    console.log('📋 No hay matriz para limpiar');
    return 0;
  }
  
  const allTasks = Object.keys(rasciManager.rasciMatrixData);
  const autoTasks = allTasks.filter(taskId => 
    taskId.startsWith('Aprobar ') || taskId.startsWith('root_')
  );

   
  
  console.log(`🔍 Encontradas ${autoTasks.length} tareas automáticas/fantasma en matriz existente:`);
  autoTasks.forEach(task => {
    console.log(`  🗑️ Eliminando: ${task}`);
    delete rasciManager.rasciMatrixData[task];
  });
  
  if (autoTasks.length > 0) {
    // Actualizar la interfaz
    const panel = document.querySelector('#rasci-panel');
    if (panel) {
      const currentRoles = rasciManager.rasciRoles || [];
      renderMatrix(panel, currentRoles, null);
    }
    
    // Guardar cambios
    if (typeof autoSaveRasciState === 'function') {
      autoSaveRasciState();
    }
    
    console.log(`✅ Eliminadas ${autoTasks.length} tareas automáticas de la matriz`);
  }
  
  return autoTasks.length;
}

// Función para limpiar tareas fantasma al inicio
export function cleanGhostTasksOnStartup() {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('🧹 Limpieza inicial de tareas fantasma...');
  
  // Obtener datos de la matriz desde localStorage
  const matrixData = RasciStore.getMatrix();
  if (!matrixData || Object.keys(matrixData).length === 0) {
    console.log('📋 No hay matriz para limpiar en startup');
    return;
  }
  
  const allTasks = Object.keys(matrixData);
  const ghostTasks = allTasks.filter(taskId => taskId.startsWith('root_'));
  
  if (ghostTasks.length > 0) {
    console.log(`🔍 Encontradas ${ghostTasks.length} tareas fantasma en startup:`);
    ghostTasks.forEach(task => {
      console.log(`  🗑️ Eliminando tarea fantasma: ${task}`);
      delete matrixData[task];
    });
    
    // Guardar la matriz limpia
    RasciStore.setMatrix(matrixData);
    console.log(`✅ ${ghostTasks.length} tareas fantasma eliminadas en startup`);
  } else {
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('✅ No hay tareas fantasma que limpiar en startup');
  }
}

// Función para limpiar tareas fantasma periódicamente
export function startGhostTaskCleaner() {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('🧹 Iniciando limpiador periódico de tareas fantasma...');
  
  setInterval(() => {
    if (rasciManager.rasciMatrixData) {
      const allTasks = Object.keys(rasciManager.rasciMatrixData);
      const ghostTasks = allTasks.filter(taskId => taskId.startsWith('root_'));
      
      if (ghostTasks.length > 0) {
        console.log(`🧹 Limpiador periódico: eliminando ${ghostTasks.length} tareas fantasma`);
        ghostTasks.forEach(task => {
          delete rasciManager.rasciMatrixData[task];
          console.log(`  🗑️ Eliminada: ${task}`);
        });
        
        // Guardar cambios
        if (typeof autoSaveRasciState === 'function') {
          autoSaveRasciState();
        }
      }
    }
  }, 10000); // Cada 10 segundos
}

// Función para mapeo directo usando sistema RALph visual
export async function executeVisualRalphMapping() {
  console.log('🎯 === EJECUTANDO MAPEO RALph VISUAL ===');
  
  try {
    const modeler = rasciManager.getBpmnModeler();
    if (!modeler) {
      console.log('❌ No hay modeler BPMN disponible');
      return false;
    }

    const matrixData = rasciManager.rasciMatrixData;
    if (!matrixData || Object.keys(matrixData).length === 0) {
      console.log('❌ No hay datos de matriz para mapear');
      return false;
    }

    console.log('📊 Estado actual de la matriz antes del mapeo:');
    Object.keys(matrixData).forEach(taskName => {
      const assignments = matrixData[taskName];
      const assignmentText = Object.keys(assignments)
        .filter(role => assignments[role] && ['R', 'A', 'S', 'C', 'I'].includes(assignments[role]))
        .map(role => `${role}: ${assignments[role]}`)
        .join(', ');
      console.log(`  📝 ${taskName}: ${assignmentText}`);
    });

    // Usar el sistema RALph completo para mapeo visual
    const sr = getServiceRegistry();
    if (sr && typeof sr.getFunction === 'function') {
      const executeRasciToRalphMapping = sr.getFunction('executeRasciToRalphMapping');
      if (typeof executeRasciToRalphMapping === 'function') {
        console.log('🔄 Forzando limpieza y mapeo completo...');
        
        try {
          // LIMPIAR datos cacheados que pueden estar interfiriendo
          localStorage.removeItem('previousRasciMatrixData');
          console.log('🧹 Limpiando datos cacheados...');
          
          // VERIFICAR que rasciManager.rasciMatrixData tiene los datos correctos
          console.log('🔍 Verificando rasciManager.rasciMatrixData:', rasciManager.rasciMatrixData);
          
          // DEBUG: Verificar que la función está disponible
          console.log('🔍 DEBUG - Tipo de executeRasciToRalphMapping:', typeof executeRasciToRalphMapping);
          console.log('🔍 DEBUG - rasciManager disponible:', !!rasciManager);
          console.log('🔍 DEBUG - getBpmnModeler disponible:', !!rasciManager.getBpmnModeler());
          console.log('🔍 DEBUG - rasciMatrixData disponible:', !!rasciManager.rasciMatrixData);
          console.log('🔍 DEBUG - Keys en rasciMatrixData:', Object.keys(rasciManager.rasciMatrixData || {}));
          
          // IMPORTANTE: Forzar true para que limpie todo y reaplique desde matriz actual
          console.log('🚀 LLAMANDO a executeRasciToRalphMapping(true)...');
          const result = executeRasciToRalphMapping(true); // Forzar ejecución
          console.log('🔍 RESULTADO de executeRasciToRalphMapping:', result);
          
          // Si el resultado es undefined, usar fallback inmediatamente
          if (result === undefined) {
            console.log('⚠️ executeRasciToRalphMapping devolvió undefined - usando fallback inmediatamente');
            
            try {
              if (typeof executeSimpleRasciMapping === 'function') {
                console.log('🚀 Ejecutando executeSimpleRasciMapping como fallback...');
                const fallbackResult = executeSimpleRasciMapping(modeler, rasciManager.rasciMatrixData);
                console.log('✅ Resultado del fallback:', fallbackResult);
                
                // Continuar con el canvas refresh
                try {
                  console.log('🔄 Forzando refresh del canvas tras fallback...');
                  const canvas = modeler.get('canvas');
                  if (canvas) {
                    const currentZoom = canvas.zoom();
                    canvas.zoom(currentZoom);
                    const elementRegistry = modeler.get('elementRegistry');
                    const allElements = elementRegistry.getAll();
                    if (allElements.length > 0) {
                      canvas.zoom('fit-viewport');
                    }
                    console.log('✅ Canvas refresh tras fallback ejecutado exitosamente');
                  }
                } catch (refreshError) {
                  console.log('⚠️ Error en canvas refresh tras fallback (no crítico):', refreshError);
                }
                
                return true;
              }
            } catch (fallbackError) {
              console.error('❌ Error en fallback inmediato:', fallbackError);
            }
          }
          
          // Si la función devuelve una promesa, esperarla
          if (result && typeof result.then === 'function') {
            await result;
          }
          
          console.log('✅ Mapeo RALph visual ejecutado - Datos de matriz aplicados');
          
          // CRÍTICO: Forzar refresh del canvas para que se vean los cambios
          try {
            console.log('🔄 Forzando refresh del canvas para visualizar cambios...');
            const canvas = modeler.get('canvas');
            if (canvas) {
              // Forzar un zoom para trigger el redraw
              const currentZoom = canvas.zoom();
              canvas.zoom(currentZoom);
              
              // También hacer un fit-to-viewport si hay elementos
              const elementRegistry = modeler.get('elementRegistry');
              const allElements = elementRegistry.getAll();
              if (allElements.length > 0) {
                canvas.zoom('fit-viewport');
              }
              
              console.log('✅ Canvas refresh ejecutado exitosamente');
            }
          } catch (refreshError) {
            console.log('⚠️ Error en canvas refresh (no crítico):', refreshError);
          }
          
          return true;
        } catch (error) {
          console.error('❌ Error en mapeo RALph visual:', error);
          console.log('🔄 FALLBACK: Intentando mapeo directo con executeSimpleRasciMapping...');
          
          // Fallback directo usando la función importada
          try {
            if (typeof executeSimpleRasciMapping === 'function') {
              console.log('🚀 Ejecutando executeSimpleRasciMapping como fallback...');
              const result = executeSimpleRasciMapping(modeler, rasciManager.rasciMatrixData);
              console.log('✅ Resultado del fallback:', result);
              return true;
            }
          } catch (fallbackError) {
            console.error('❌ Error en fallback:', fallbackError);
          }
          
          return false;
        }
      } else {
        console.log('⚠️ executeRasciToRalphMapping no es una función válida');
        
        // Fallback directo
        try {
          console.log('🔄 FALLBACK: Usando executeSimpleRasciMapping directamente...');
          if (typeof executeSimpleRasciMapping === 'function') {
            console.log('🚀 Ejecutando executeSimpleRasciMapping como fallback...');
            const result = executeSimpleRasciMapping(modeler, rasciManager.rasciMatrixData);
            console.log('✅ Resultado del fallback:', result);
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ Error en fallback directo:', fallbackError);
        }
      }
    } else {
      console.log('⚠️ Service registry no disponible');
      
      // Fallback directo cuando no hay service registry
      try {
        console.log('🔄 FALLBACK: Service registry no disponible, usando executeSimpleRasciMapping...');
        if (typeof executeSimpleRasciMapping === 'function') {
          console.log('🚀 Ejecutando executeSimpleRasciMapping como fallback...');
          const result = executeSimpleRasciMapping(modeler, rasciManager.rasciMatrixData);
          console.log('✅ Resultado del fallback:', result);
          return true;
        }
      } catch (fallbackError) {
        console.error('❌ Error en fallback cuando no hay service registry:', fallbackError);
      }
    }
    
    console.log('⚠️ No se pudo acceder al sistema RALph completo');
    return false;

  } catch (error) {
    console.error('❌ Error ejecutando mapeo RALph visual:', error);
    return false;
  }
}

// Función para mapeo directo de matriz a canvas (respaldo)
export async function executeDirectMatrixToCanvasMapping() {
  console.log('🎯 === EJECUTANDO MAPEO DIRECTO MATRIZ → CANVAS ===');
  
  // PRIMERO: Intentar mapeo RALph visual (funcional)
  const visualMappingSuccess = await executeVisualRalphMapping();
  if (visualMappingSuccess) {
    console.log('✅ Mapeo visual RALph ejecutado exitosamente');
    return true;
  }
  
  console.log('⚠️ Mapeo visual falló, usando mapeo de documentación como respaldo...');
  
  try {
    const modeler = rasciManager.getBpmnModeler();
    if (!modeler) {
      console.log('❌ No hay modeler BPMN disponible');
      return false;
    }
    
    const matrixData = rasciManager.rasciMatrixData;
    if (!matrixData || Object.keys(matrixData).length === 0) {
      console.log('❌ No hay datos de matriz para mapear');
      return false;
    }
    
    console.log('🔄 Aplicando asignaciones RASCI al canvas...');
    const elementRegistry = modeler.get('elementRegistry');
    let mappedElements = 0;
    
    // Iterar por cada tarea en la matriz
    Object.keys(matrixData).forEach(taskName => {
      const taskAssignments = matrixData[taskName];
      
      // Buscar el elemento correspondiente en el canvas (por ID, no por nombre)
      let element = null;
      elementRegistry.forEach(el => {
        // Buscar por ID del elemento (que es lo que usa la matriz RASCI)
        if (el.businessObject && el.businessObject.id === taskName) {
          element = el;
        }
      });
      
      if (element) {
        console.log(`🎯 Mapeando tarea: ${taskName}`);
        
        // Crear string de asignaciones RASCI
        const assignments = [];
        Object.keys(taskAssignments).forEach(role => {
          const assignment = taskAssignments[role];
          if (assignment && ['R', 'A', 'S', 'C', 'I'].includes(assignment)) {
            assignments.push(`${role}: ${assignment}`);
          }
        });
        
        if (assignments.length > 0) {
          // Aplicar las asignaciones al elemento
          const assignmentText = assignments.join(', ');
          
          // Intentar usar propiedades personalizadas o documentation
          try {
            const businessObject = element.businessObject;
            
            // Opción 1: Usar documentation
            if (!businessObject.documentation) {
              businessObject.documentation = [];
            }
            
            // Remover documentación RASCI previa
            businessObject.documentation = businessObject.documentation.filter(doc => 
              !doc.text || !doc.text.includes('RASCI:')
            );
            
            // Agregar nueva documentación RASCI
            const rasciDoc = modeler.get('bpmnFactory').create('bpmn:Documentation');
            rasciDoc.text = `RASCI: ${assignmentText}`;
            businessObject.documentation.push(rasciDoc);
            
            console.log(`  ✅ Aplicado: ${assignmentText}`);
            mappedElements++;
            
          } catch (error) {
            console.log(`  ❌ Error aplicando asignaciones a ${taskName}:`, error);
          }
        }
      } else {
        console.log(`⚠️ No se encontró elemento para tarea: ${taskName}`);
      }
    });
    
    console.log(`✅ Mapeo directo completado: ${mappedElements} elementos mapeados`);
    
    // CRÍTICO: Forzar refresh del canvas para que se vean los cambios
    try {
      console.log('🔄 Forzando refresh del canvas tras mapeo directo...');
      const canvas = modeler.get('canvas');
      if (canvas) {
        // Forzar un zoom para trigger el redraw
        const currentZoom = canvas.zoom();
        canvas.zoom(currentZoom);
        
        // También hacer un fit-to-viewport si hay elementos
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        if (allElements.length > 0) {
          canvas.zoom('fit-viewport');
        }
        
        console.log('✅ Canvas refresh tras mapeo directo ejecutado exitosamente');
      }
    } catch (refreshError) {
      console.log('⚠️ Error en canvas refresh tras mapeo directo (no crítico):', refreshError);
    }
    
    return mappedElements > 0;
    
  } catch (error) {
    console.error('❌ Error en mapeo directo:', error);
    return false;
  }
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
    if (rasciManager.preventOverwriteExistingValues) {
      rasciManager.preventOverwriteExistingValues();
    }
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
    (rasciManager.adapter && rasciManager.adapter.getBpmnModeler && rasciManager.adapter.getBpmnModeler()) ||
    null
  );
  rasciManager.setImportingProject(!!(sr && sr.get('ImportingProjectFlag')));
  rasciManager.setStorageCleared(!!(sr && sr.get('StorageClearedFlag')));
  rasciManager.setRasciUIValidator((sr && sr.get('RASCIUIValidator')) || null);

  // Cargar datos desde localStorage
  rasciManager.rasciMatrixData = RasciStore.getMatrix();
  rasciManager.rasciRoles = RasciStore.getRoles();

  // Usar roles guardados si existen, sino usar los proporcionados
  roles = rolesArray || rasciManager.getRasciRoles() || [];
  autoSaveRasciState = autoSaveFn;

  // Solo limpiar si realmente no hay datos guardados Y no estamos importando
  const shouldClear =
    !rasciManager.isImportingProject &&
    rasciManager.storageCleared &&
    (!rasciManager.rasciMatrixData || Object.keys(rasciManager.rasciMatrixData).length === 0) &&
    (!rasciManager.rasciRoles || rasciManager.rasciRoles.length === 0);

  if (shouldClear) {
    console.log('🧹 Limpiando matriz RASCI - no hay datos guardados');
    rasciManager.rasciMatrixData = {};
    const currentTasks = rasciManager.getBpmnModeler() ? getBpmnTasks() : [];
    currentTasks.forEach(task => {
      const taskRoles = {};
      if (roles && roles.forEach) {
        roles.forEach(r => { taskRoles[r] = ''; });
      }
      rasciManager.rasciMatrixData[task] = taskRoles;
    });
  } else if (!rasciManager.rasciMatrixData) {
    rasciManager.rasciMatrixData = {};
  }

  // Preservar roles guardados si existen
  if (rasciManager.rasciRoles && rasciManager.rasciRoles.length > 0) {
    console.log('📋 Restaurando roles guardados:', rasciManager.rasciRoles);
    roles = rasciManager.rasciRoles;
  } else {
    rasciManager.rasciRoles = roles;
  }

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
    position: relative; background: #f8fafc; border-bottom: 2px solid #e2e8f0; padding: 4px 8px; text-align: center;
    font-weight: 400; color: #1f2937; min-width: 120px; vertical-align: middle; font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif; height: 28px;
  `;
  const taskHeaderContent = document.createElement('div');
  taskHeaderContent.style.cssText = `display: flex; align-items: center; justify-content: center; gap: 4px; position: relative; height: 100%; min-height: 20px;`;

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

  // Calcular altura dinámica basada en el número de tareas
  const taskCount = tasks ? tasks.length : 0;
  const baseHeight = 200; // Altura base
  const rowHeight = 28; // Altura de cada fila
  const headerHeight = 28; // Altura del header
  const calculatedHeight = Math.max(baseHeight, headerHeight + (taskCount * rowHeight) + 20); // +20 para padding
  const maxHeight = Math.min(calculatedHeight, window.innerHeight - 200);
  
  console.log(`📏 Calculando altura de matriz: ${taskCount} tareas, altura calculada: ${calculatedHeight}px, altura máxima: ${maxHeight}px`);
  
  // Aplicar altura calculada al contenedor
  matrixContainer.style.height = `${calculatedHeight}px`;
  matrixContainer.style.maxHeight = `${maxHeight}px`;

  // Limpiar tareas fantasma antes de renderizar
  const allTasks = Object.keys(rasciManager.rasciMatrixData);
  const ghostTasks = allTasks.filter(taskId => taskId.startsWith('root_'));
  if (ghostTasks.length > 0) {
    console.log(`🧹 Eliminando ${ghostTasks.length} tareas fantasma durante renderizado:`);
    ghostTasks.forEach(task => {
      console.log(`  🗑️ Eliminando: ${task}`);
      delete rasciManager.rasciMatrixData[task];
    });
  }

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
      if (currentRoles && currentRoles.forEach) {
        currentRoles.forEach(r => { taskRoles[r] = ''; });
      }
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    } else {
      const existingTask = rasciManager.rasciMatrixData[taskName];
      if (currentRoles && currentRoles.forEach) {
        currentRoles.forEach(r => {
          if (!(r in existingTask)) existingTask[r] = '';
          else if (existingValues[taskName] && existingValues[taskName][r]) {
            existingTask[r] = existingValues[taskName][r];
          }
        });
      }
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
      background: #f8fafc; border-right: 2px solid #e2e8f0; padding: 4px 8px; text-align: left; font-weight: 600; color: #1f2937;
      font-size: 10px; vertical-align: middle; min-width: 120px; max-width: 200px; word-wrap: break-word; position: relative;
      font-family: 'Segoe UI', Roboto, -apple-system, BlinkMacSystemFont, sans-serif; height: 10px;
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

      const existingValue = rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[task] && rasciManager.rasciMatrixData[task][role];
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
            const values = Object.values((rasciManager.rasciMatrixData && rasciManager.rasciMatrixData[task]) || {});
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

          if (typeof autoSaveRasciState === 'function') autoSaveRasciState();
          setTimeout(() => rasciManager.forceSaveRasciState(), 50);
          setTimeout(() => rasciManager.onRasciMatrixUpdated(), 100);
          setTimeout(() => {
            const validator = getValidator();
            if (validator && typeof validator.forceValidation === 'function') validator.forceValidation();
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

          if (typeof autoSaveRasciState === 'function') autoSaveRasciState();
          setTimeout(() => rasciManager.forceSaveRasciState(), 50);
          setTimeout(() => rasciManager.onRasciMatrixUpdated(), 100);
          setTimeout(() => {
            const validator = getValidator();
            if (validator && typeof validator.forceValidation === 'function') validator.forceValidation();
          }, 500);
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
    if (v && typeof v.autoValidateAfterMatrixUpdate === 'function') v.autoValidateAfterMatrixUpdate();
  }, 500);
}

export function addNewRole(panel, rolesArray, autoSaveFn) {
  roles = rolesArray || roles;
  autoSaveRasciState = autoSaveFn || autoSaveRasciState;

  const newRoleName = `Rol ${roles.length + 1}`;
  roles.push(newRoleName);
  rasciManager.rasciRoles = roles;

  if (typeof autoSaveRasciState === 'function') autoSaveRasciState();
  renderMatrix(panel, roles, autoSaveRasciState);

  setTimeout(() => {
            const validator = getValidator();
            if (validator && typeof validator.forceValidation === 'function') validator.forceValidation();
          }, 800);
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
        if (typeof autoSaveRasciState === 'function') autoSaveRasciState();
        setTimeout(() => rasciManager.forceSaveRasciState(), 10);
        setTimeout(() => {
            const validator = getValidator();
            if (validator && typeof validator.forceValidation === 'function') validator.forceValidation();
          }, 800);
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
  console.log(`🗑️ === INICIANDO ELIMINACIÓN DEL ROL ${roleIndex} ===`);
  
  if (roleIndex < 0 || roleIndex >= roles.length) {
    console.error('❌ Índice de rol inválido:', roleIndex);
    return;
  }
  
  const roleToDelete = roles[roleIndex];
  console.log(`🗑️ Eliminando rol: "${roleToDelete}"`);
  
  // 1. ELIMINAR EL ROL DEL ARRAY
  roles.splice(roleIndex, 1);
  console.log(`✅ Rol eliminado del array. Roles restantes:`, roles);
  
  // 2. ELIMINAR TODAS LAS RESPONSABILIDADES DE ESTE ROL EN LA MATRIZ
  if (rasciManager.rasciMatrixData) {
    Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
      if (rasciManager.rasciMatrixData[taskName] && rasciManager.rasciMatrixData[taskName][roleToDelete]) {
        console.log(`🧹 Eliminando responsabilidad "${rasciManager.rasciMatrixData[taskName][roleToDelete]}" del rol "${roleToDelete}" en tarea "${taskName}"`);
        delete rasciManager.rasciMatrixData[taskName][roleToDelete];
      }
    });
    console.log('✅ Responsabilidades del rol eliminadas de la matriz');
  }
  
  // 3. ACTUALIZAR RASCI ROLES EN EL MANAGER
  if (rasciManager.rasciRoles) {
    const roleManagerIndex = rasciManager.rasciRoles.indexOf(roleToDelete);
    if (roleManagerIndex !== -1) {
      rasciManager.rasciRoles.splice(roleManagerIndex, 1);
      console.log('✅ Rol eliminado del rasciManager.rasciRoles');
    }
  }
  
  // 4. GUARDAR CAMBIOS EN LOCALSTORAGE
  try {
    if (typeof autoSaveRasciState === 'function') {
      autoSaveRasciState();
      console.log('✅ Estado guardado con autoSaveRasciState');
    }
    
    setTimeout(() => {
      rasciManager.forceSaveRasciState();
      console.log('✅ Estado forzado con forceSaveRasciState');
    }, 10);
    
    // Guardar roles en localStorage directamente también
    RasciStore.saveRoles(roles);
    console.log('✅ Roles guardados en RasciStore');
    
  } catch (error) {
    console.error('❌ Error guardando estado tras eliminación de rol:', error);
  }
  
  // 5. RE-RENDERIZAR LA MATRIZ
  renderMatrix(panel, roles, autoSaveRasciState);
  console.log('✅ Matriz re-renderizada');
  
  // 6. VALIDAR MATRIZ TRAS EL CAMBIO
  setTimeout(() => {
    const validator = getValidator();
    if (validator && typeof validator.forceValidation === 'function') {
      validator.forceValidation();
      console.log('✅ Validación forzada tras eliminación de rol');
    }
  }, 800);
  
  // 7. TRIGGER CALLBACK PARA ACTUALIZAR CANVAS SI AUTO-MAPEO ESTÁ ACTIVADO
  if (onRasciMatrixUpdatedFunction && typeof onRasciMatrixUpdatedFunction === 'function') {
    setTimeout(() => {
      console.log('🔄 Triggering callback tras eliminación de rol...');
      onRasciMatrixUpdatedFunction();
    }, 100);
  }
  
  console.log(`🗑️ === ELIMINACIÓN DEL ROL "${roleToDelete}" COMPLETADA ===`);
}

// -----------------------------------------------------
// Sincronización matriz <-> diagrama
// -----------------------------------------------------
export function updateMatrixFromDiagram() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;

  // Limpiar tareas automáticas y fantasma de la matriz existente
  cleanAutoTasksFromMatrix();
  
  // Limpieza adicional de tareas fantasma
  if (rasciManager.rasciMatrixData) {
    const allTasks = Object.keys(rasciManager.rasciMatrixData);
    const ghostTasks = allTasks.filter(taskId => taskId.startsWith('root_'));
    if (ghostTasks.length > 0) {
      console.log(`🧹 Limpieza adicional: eliminando ${ghostTasks.length} tareas fantasma`);
      ghostTasks.forEach(task => {
        delete rasciManager.rasciMatrixData[task];
        console.log(`  🗑️ Eliminada: ${task}`);
      });
    }
  }

  const preserved = preserveRasciValues();
  const currentTasks = getBpmnTasks();
  if (!rasciManager.rasciMatrixData) rasciManager.rasciMatrixData = {};

  let hasChanges = false;
  let currentRoles = (roles && roles.length) ? roles : (rasciManager.rasciRoles || []);

  const detected = detectRalphRolesFromCanvas();
  if (detected.length) {
    detected.forEach(r => { if (!currentRoles.includes(r)) currentRoles.push(r); });
    rasciManager.rasciRoles = [...currentRoles];
  }

  currentTasks.forEach(taskName => {
    if (!rasciManager.rasciMatrixData[taskName]) {
      const taskRoles = {};
      if (currentRoles && currentRoles.forEach) currentRoles.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      hasChanges = true;
    } else {
      const existing = rasciManager.rasciMatrixData[taskName];
      let updated = false;
      if (currentRoles && currentRoles.forEach) currentRoles.forEach(r => {
        if (!(r in existing)) { existing[r] = ''; updated = true; }
      });
      if (updated) hasChanges = true;
    }
  });

  if (rasciManager.preventOverwriteExistingValues && typeof rasciManager.preventOverwriteExistingValues === 'function') rasciManager.preventOverwriteExistingValues();
  const restored = restoreRasciValues(preserved);
  if (restored > 0) if (typeof autoSaveRasciState === 'function') autoSaveRasciState();

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
    if (v && typeof v.autoValidateAfterMatrixUpdate === 'function') v.autoValidateAfterMatrixUpdate();
    else if (v && typeof v.forceValidation === 'function') v.forceValidation();
    if (v && typeof v.validateEmptyTasks === 'function') v.validateEmptyTasks();
  }, 200);
}

export function setupDiagramChangeListener() {
  const modeler = rasciManager.getBpmnModeler();
  if (!modeler) return;
  
  const eventBus = modeler.get('eventBus');
  
  // Escuchar cambios en elementos
  eventBus.on('element.changed', () => setTimeout(updateMatrixFromDiagram, 500));
  
  // Escuchar eliminación de elementos para limpiar la matriz
  eventBus.on('element.removed', () => {
    console.log('🗑️ Elemento eliminado del diagrama - sincronizando matriz RASCI...');
    setTimeout(updateMatrixFromDiagram, 100); // Más rápido para eliminaciones
  });
}

// -----------------------------------------------------
// Operaciones utilitarias públicas
// -----------------------------------------------------
export function forceReloadMatrix() {
  try {
    const panel = document.querySelector('#rasci-panel');
    const r = (rasciManager && rasciManager.rasciRoles) || [];
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
      if (roles && roles.forEach) roles.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
      changed = true;
    }
  });

  if (changed) {
    setTimeout(() => {
      const v = getValidator();
      if (v && typeof v.forceValidation === 'function') v.forceValidation();
      if (v && typeof v.validateEmptyTasks === 'function') v.validateEmptyTasks();
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
      if (roles && roles.forEach) roles.forEach(r => { taskRoles[r] = ''; });
      rasciManager.rasciMatrixData[taskName] = taskRoles;
    }
  });

  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    if (!bpmnTasks.includes(taskName)) delete rasciManager.rasciMatrixData[taskName];
  });

  setTimeout(() => {
    const v = getValidator();
    if (v && typeof v.validateEmptyTasks === 'function') v.validateEmptyTasks();
    if (v && typeof v.forceValidation === 'function') v.forceValidation();
  }, 100);
}

export function repairRasciRalphMapping() {
  try {
    const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    rasciManager.setBpmnModeler(
      (sr && sr.get('BPMNModeler')) ||
      (rasciManager.adapter && rasciManager.adapter.getBpmnModeler && rasciManager.adapter.getBpmnModeler()) ||
      null
    );
    rasciManager.setRasciUIValidator((sr && sr.get('RASCIUIValidator')) || null);

    if (rasciManager.adapter && rasciManager.adapter.getMatrixData) {
      rasciManager.rasciMatrixData = { ...rasciManager.adapter.getMatrixData() };
    }
    if (rasciManager.adapter && rasciManager.adapter.getRoles) {
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
    return { success: false, error: (error && error.message) || 'Error desconocido' };
  }
}

// -----------------------------------------------------
// Service Registry (registro no duplicado)
// -----------------------------------------------------
function setupServiceRegistry() {
  const sr = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : null;
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
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('✅ Callback de matriz RASCI configurado:', typeof callback);
}

// Función para configurar el callback manualmente
export function configureMatrixCallback() {
  // Optimización: Log eliminado para mejorar rendimiento
  // console.log('🔧 Configurando callback de matriz RASCI...');
  
  // Configurar el callback directamente
  setOnRasciMatrixUpdatedCallback(onRasciMatrixUpdated);
  
  // También exponerlo globalmente para diagnóstico
  if (typeof window !== 'undefined') {
    window.onRasciMatrixUpdatedFunction = onRasciMatrixUpdated;
    // Optimización: Log eliminado para mejorar rendimiento
  // console.log('✅ Callback expuesto globalmente');
  }
  
  return true;
}

// -----------------------------------------------------
// Funciones adicionales para el toggle (sin auto-corrección)
// -----------------------------------------------------

// Función básica para inicializar el toggle
export function initializeAutoMappingSwitch() {
  console.log('🔧 Inicializando Auto-Mapping Switch...');
  
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (!autoMappingSwitch) {
    console.warn('⚠️ No se encontró el switch de auto-mapping');
    return;
  }
  
  // Establecer estado inicial (desactivado por defecto - sin auto-corrección)
  autoMappingSwitch.checked = false;
  if (manualBtn) {
    manualBtn.style.display = 'block';
  }
  
  console.log('✅ Auto-Mapping Switch inicializado (DESACTIVADO por defecto)');
}

// Función para validar reglas críticas de RASCI
export function validateRasciCriticalRules() {
  console.log('🔍 Validando reglas críticas de RASCI...');
  
  const matrixData = rasciManager.getRasciMatrixData();
  const errors = [];
  const warnings = [];
  
  // Verificar si hay datos de matriz
  if (!matrixData || Object.keys(matrixData).length === 0) {
    console.log('⚠️ No hay datos de matriz para validar - matriz vacía');
    // NO agregar error si la matriz está vacía - esto es normal al inicio
    return { isValid: true, errors: [], warnings: [] };
  }

  // Obtener todas las tareas y filtrar las automáticas (que empiezan con "Aprobar")
  const allTasks = Object.keys(matrixData);
  const tasks = allTasks.filter(taskId => {
    const isAutoTask = taskId.startsWith('Aprobar ');
    if (isAutoTask) {
      console.log(`🤖 Excluyendo tarea automática de validación: ${taskId}`);
    }
    return !isAutoTask;
  });
  
  console.log(`📋 Validando ${tasks.length} tareas de proceso (${allTasks.length - tasks.length} tareas automáticas excluidas)...`);
  
  // Si no hay tareas de proceso, no es un error - puede ser que solo haya tareas automáticas
  if (tasks.length === 0) {
    console.log('ℹ️ No hay tareas de proceso para validar - solo tareas automáticas');
    return { isValid: true, errors: [], warnings: [] };
  }
  
  // Limpiar tareas automáticas de la matriz si existen
  const autoTasks = allTasks.filter(taskId => taskId.startsWith('Aprobar '));
  if (autoTasks.length > 0) {
    console.log(`🧹 Limpiando ${autoTasks.length} tareas automáticas de la matriz...`);
    autoTasks.forEach(taskId => {
      delete matrixData[taskId];
      console.log(`🗑️ Eliminada tarea automática: ${taskId}`);
    });
  }
  
  tasks.forEach(taskId => {
    const assignments = matrixData[taskId];
    if (!assignments || Object.keys(assignments).length === 0) {
      warnings.push(`Tarea "${taskId}": No tiene asignaciones de roles`);
      return;
    }
    
    // Contar responsables (R) y aprobadores (A)
    let responsibleCount = 0;
    let accountableCount = 0;
    
    Object.values(assignments).forEach(assignment => {
      if (assignment === 'R') responsibleCount++;
      if (assignment === 'A') accountableCount++;
    });
    
    console.log(`  📝 Tarea "${taskId}": R=${responsibleCount}, A=${accountableCount}`);
    
    // REGLAS DURAS MÍNIMAS - ERRORES CRÍTICOS (bloquean el toggle)
    if (accountableCount > 1) {
      errors.push(`🚫 REGLA DURA: Tarea "${taskId}": NO puede tener MÁS DE 1 aprobador (A), tiene ${accountableCount}`);
    }
    
    if (responsibleCount < 1) {
      errors.push(`🚫 REGLA DURA: Tarea "${taskId}": DEBE tener AL MENOS 1 responsable (R), tiene ${responsibleCount}`);
    }
    
    if (responsibleCount > 1) {
      warnings.push(`Tarea "${taskId}": Múltiples responsables (R) pueden causar confusión, tiene ${responsibleCount}`);
    }
  });
  
  const isValid = errors.length === 0;
  
  if (isValid && warnings.length === 0) {
    console.log('✅ Todas las reglas críticas de RASCI se cumplen');
  } else if (isValid && warnings.length > 0) {
    console.log(`⚠️ Validación exitosa con ${warnings.length} advertencias`);
    warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  } else {
    console.log(`❌ Errores críticos encontrados: ${errors.length}, Advertencias: ${warnings.length}`);
    errors.forEach(error => console.log(`  ❌ ${error}`));
    warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }
  
  return {
    isValid,
    errors,
    warnings
  };
}

// Función eliminada - ya no se usan modales de errores

// Función eliminada - ya no se usan modales de errores

// Función mejorada para el toggle con validación de reglas críticas
export function validateAndToggleAutoMapping() {
  console.log('🔄 === VALIDANDO Y ACTIVANDO TOGGLE AUTO MAPPING ===');
  
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  if (!autoMappingSwitch) {
    console.error('❌ No se encontró el switch de auto-mapping');
    return false;
  }
  
  const isBeingActivated = autoMappingSwitch.checked;
  console.log(`🎯 Usuario intentando ${isBeingActivated ? 'ACTIVAR' : 'DESACTIVAR'} el toggle`);
  
  // SIEMPRE validar reglas críticas (tanto para activar como desactivar)
  const validation = validateRasciCriticalRules();
  console.log(`📊 Resultado validación: isValid=${validation.isValid}, errores=${validation.errors.length}, advertencias=${(validation.warnings && validation.warnings.length) || 0}`);
  
  // BLOQUEAR SI HAY CUALQUIER ERROR (lista > 0)
  if (validation.errors && validation.errors.length > 0) {
    // HAY ERRORES - BLOQUEAR TOGGLE AUTOMÁTICO COMPLETAMENTE
    console.log(`🚫 ${validation.errors.length} ERRORES DETECTADOS - Toggle DESACTIVADO`);
    
    // FORZAR TOGGLE A DESACTIVADO
    autoMappingSwitch.checked = false;
    autoMappingSwitch.disabled = true; // DESHABILITAR EL TOGGLE
    
    // Mostrar botón manual y hacerlo más visible
    if (manualBtn) {
      manualBtn.style.display = 'block';
      manualBtn.style.backgroundColor = '#ff6b6b';
      manualBtn.style.color = 'white';
      manualBtn.style.border = '2px solid #ff4757';
      manualBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Mapeo Manual (${validation.errors.length} Errores)`;
    }
    
    // NO MOSTRAR MODAL - solo logs en consola
    if (isBeingActivated) {
      console.log('🚫 Usuario intentó activar toggle con errores');
      console.log('📋 Errores encontrados:');
      validation.errors.forEach(error => console.log(`  ❌ ${error}`));
      console.log('💡 Corrige los errores en la matriz RASCI para poder activar el mapeo automático');
    } else {
      console.log('🚫 Toggle FORZADO A DESACTIVADO - UI actualizada (sin modal)');
    }
    
    return false;
  } else {
    // NO HAY ERRORES - PERMITIR TOGGLE NORMAL
    console.log('✅ Sin errores - Permitiendo toggle normal');
    autoMappingSwitch.disabled = false; // HABILITAR EL TOGGLE
    
    // Solo permitir activación si el usuario la está solicitando
    if (isBeingActivated) {
      console.log('✅ Validación exitosa - Permitiendo activación del toggle');
      autoMappingSwitch.checked = true;
      
      // Cuando se activa el toggle, ejecutar sincronización completa INMEDIATAMENTE
      console.log('🔄 Toggle activado - Ejecutando sincronización BIDIRECCIONAL completa...');
      
      // Ejecutar sincronización inmediatamente usando setTimeout para evitar problemas de sincronización
      setTimeout(async () => {
        console.log('🚀 1. Capturando estado actual de la matriz...');
        
        // IMPORTANTE: Capturar el estado ACTUAL de la matriz (cambios hechos mientras estaba desactivado)
        const currentMatrixState = (rasciManager && rasciManager.rasciMatrixData) ? rasciManager.rasciMatrixData : {};
        console.log('📊 Estado actual capturado:', Object.keys(currentMatrixState).length, 'tareas');
        
        console.log('🚀 2. Sincronizando diagrama → matriz (para cambios hechos en canvas)...');
        updateMatrixFromDiagram();
        
        console.log('🚀 3. Aplicando TODOS los cambios matriz → canvas...');
        
        // Aplicar el estado actual de la matriz al canvas (incluyendo cambios hechos mientras estaba desactivado)
        if (Object.keys(currentMatrixState).length > 0) {
          console.log('📦 Forzando aplicación del estado actual de la matriz al canvas...');
          
          // APLICAR DIRECTAMENTE el estado actual al canvas sin usar el buffer
          try {
            // Asegurar que rasciManager.rasciMatrixData tiene el estado actual
            rasciManager.rasciMatrixData = JSON.parse(JSON.stringify(currentMatrixState));
            
            // Actualizar la UI de la matriz
            const panel = document.querySelector('#rasci-panel');
            if (panel && rasciManager.rasciRoles) {
              renderMatrix(panel, rasciManager.rasciRoles, null);
            }
            
            // Ejecutar mapeo completo al canvas
            const success = await executeCompleteMatrixMapping();
            
            if (success) {
              console.log('✅ Estado actual aplicado al canvas exitosamente');
            } else {
              console.log('⚠️ Mapeo completo falló, intentando mapeo directo...');
              await executeDirectMatrixToCanvasMapping();
            }
          } catch (error) {
            console.error('❌ Error aplicando estado actual:', error);
            // Fallback: usar mapeo directo
            console.log('🔄 Usando mapeo directo como fallback...');
            await executeDirectMatrixToCanvasMapping();
          }
        } else {
          // Si no hay estado en la matriz, usar mapeo completo
          console.log('📊 No hay estado en la matriz, ejecutando mapeo completo...');
          await executeCompleteMatrixMapping();
        }
        
        console.log('✅ Sincronización BIDIRECCIONAL completa finalizada');
      }, 100);
    } else {
      // Si no está siendo activado, mantener el estado actual
      console.log('ℹ️ Toggle no está siendo activado - Manteniendo estado actual');
    }
    
    // Restaurar botón manual normal
    if (manualBtn) {
      const isEnabled = autoMappingSwitch.checked;
      manualBtn.style.display = isEnabled ? 'none' : 'block';
      manualBtn.style.backgroundColor = '';
      manualBtn.style.color = '';
      manualBtn.style.border = '';
      manualBtn.innerHTML = '<i class="fas fa-magic"></i> Ejecutar Mapeo Manual';
    }
  }
  
  // Actualizar UI según el estado
  const isEnabled = autoMappingSwitch.checked;
  console.log(`🎛️ Estado final del toggle: ${isEnabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
  
  console.log('🔄 === FIN TOGGLE AUTO MAPPING ===');
  return isEnabled;
}

// Función simplificada para actualizaciones de matriz (sin validación automática)
export function onRasciMatrixUpdated() {
  console.log('📊 === MATRIZ RASCI ACTUALIZADA - INICIANDO SINCRONIZACIÓN ===');
  
  // 1. VALIDAR REGLAS DURAS Y ACTUALIZAR UI (desactiva toggle automáticamente si hay errores)
  const hardRulesValid = validateHardRulesInRealTime();
  
  // 2. APLICAR CAMBIOS AL CANVAS INMEDIATAMENTE (independientemente del estado del toggle)
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const isAutoMappingEnabled = autoMappingSwitch ? autoMappingSwitch.checked : false;
  
  console.log(`🎛️ Estado del auto-mapeo: ${isAutoMappingEnabled ? 'ACTIVADO' : 'DESACTIVADO'}`);
  console.log(`✅ Reglas válidas: ${hardRulesValid}`);
  
  if (isAutoMappingEnabled) {
    // Si el auto-mapeo está activado, usar el flujo completo
    console.log('🔄 Auto-mapeo activado - Aplicando cambios mediante sistema automático...');
    
    if (!hardRulesValid) {
      pendingMappingDueToErrors = true;
      bufferedMatrixState = JSON.parse(JSON.stringify(rasciManager.rasciMatrixData || {}));
      console.log('⏸️ Estado de matriz guardado en buffer - Cambios marcados para mapeo cuando se corrijan los errores');
      hasHardRuleErrorsPrev = true;
      updateGlobalBufferState();
      return;
    }
  } else {
    // Si el auto-mapeo está desactivado, aplicar cambios directamente
    console.log('� Auto-mapeo desactivado - Aplicando cambios directamente al canvas...');
    
    // Solo validar y mostrar errores sin ejecutar mapeo
    if (!hardRulesValid) {
      console.log('⚠️ Hay errores en las reglas RASCI - corrige los errores y activa el toggle para mapear');
      return;
    }
    
    console.log('✅ Matriz válida - activa el toggle para aplicar cambios al canvas');
    return;
  }
  
  // Si no hay errores y auto-mapeo activado, ejecutar mapeo completo
  if (isAutoMappingEnabled && hardRulesValid) {
    console.log('🔄 Ejecutando mapeo completo para auto-mapeo...');
    setTimeout(async () => {
      try {
        const success = await executeCompleteMatrixMapping();
        if (success) {
          console.log('✅ Mapeo automático ejecutado correctamente');
          hasHardRuleErrorsPrev = false;
          pendingMappingDueToErrors = false;
          updateGlobalBufferState();
        }
      } catch (error) {
        console.error('❌ Error ejecutando mapeo automático:', error);
      }
    }, 200);
  }
}

// Función SOLO para validación manual (sin afectar toggle)
export function validateRasciMatrixSilently() {
  console.log('🔍 Validación silenciosa de matriz RASCI...');
  
  const validation = validateRasciCriticalRules();
  
  if (validation.isValid && (!validation.warnings || validation.warnings.length === 0)) {
    console.log('✅ Matriz RASCI válida sin advertencias (validación silenciosa)');
  } else if (validation.isValid && validation.warnings && validation.warnings.length > 0) {
    console.log(`⚠️ Matriz RASCI válida con ${validation.warnings.length} advertencias (validación silenciosa):`);
    validation.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  } else {
    console.log('❌ Errores encontrados en matriz RASCI (validación silenciosa):', validation.errors);
    if (validation.warnings && validation.warnings.length > 0) {
      console.log('⚠️ Advertencias adicionales:', validation.warnings);
    }
  }
  
  return validation;
}

// Función para actualizar la UI basada en el estado de errores
export function updateUIForErrorState() {
  console.log('🔄 Actualizando UI basada en estado de errores...');
  
  const validation = validateRasciCriticalRules();
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  // BLOQUEAR SI HAY CUALQUIER ERROR (lista > 0)
  if (validation.errors && validation.errors.length > 0) {
    // HAY ERRORES - FORZAR TOGGLE A DESACTIVADO
    console.log(`🚫 FORZANDO toggle a DESACTIVADO por ${validation.errors.length} errores detectados`);
    
    if (autoMappingSwitch) {
      autoMappingSwitch.checked = false; // FORZAR A DESACTIVADO
      autoMappingSwitch.disabled = true; // DESHABILITAR
    }
    
    if (manualBtn) {
      manualBtn.style.display = 'block';
      manualBtn.style.backgroundColor = '#ff6b6b';
      manualBtn.style.color = 'white';
      manualBtn.style.border = '2px solid #ff4757';
      manualBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Mapeo Manual (${validation.errors.length} Errores)`;
    }
  } else {
    // NO HAY ERRORES - PERMITIR TOGGLE NORMAL
    console.log('✅ Sin errores - Permitiendo toggle normal');
    
    if (autoMappingSwitch) {
      autoMappingSwitch.disabled = false; // HABILITAR EL TOGGLE
    }
    
    if (manualBtn) {
      manualBtn.style.backgroundColor = '';
      manualBtn.style.color = '';
      manualBtn.style.border = '';
      manualBtn.innerHTML = '<i class="fas fa-magic"></i> Ejecutar Mapeo Manual';
      
      // Solo ocultar si el toggle está activado
      if (autoMappingSwitch && autoMappingSwitch.checked) {
        manualBtn.style.display = 'none';
      } else {
        manualBtn.style.display = 'block';
      }
    }
  }
}

// Función para forzar toggle a desactivado cuando hay errores
export function forceToggleDisabledOnErrors() {
  console.log('🔍 Verificando errores para forzar toggle a desactivado...');
  
  const validation = validateRasciCriticalRules();
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  
  if (validation.errors && validation.errors.length > 0) {
    console.log(`🚫 FORZANDO toggle a DESACTIVADO por ${validation.errors.length} errores`);
    
    if (autoMappingSwitch) {
      autoMappingSwitch.checked = false; // FORZAR A DESACTIVADO
      autoMappingSwitch.disabled = true; // DESHABILITAR
    }
    
    // Actualizar UI completa
    updateUIForErrorState();
    
    return true; // Se forzó a desactivado
  }
  
  return false; // No se forzó
}

// Función para validar reglas duras en tiempo real
export function validateHardRulesInRealTime() {
  console.log('🔍 Validando reglas duras en tiempo real...');
  
  const validation = validateRasciCriticalRules();
  
  if (validation.errors && validation.errors.length > 0) {
    console.log(`🚫 REGLAS DURAS NO CUMPLIDAS: ${validation.errors.length} errores detectados`);
    
    // FORZAR toggle a DESACTIVADO automáticamente cuando hay errores
    const autoMappingSwitch = document.getElementById('auto-mapping-switch');
    if (autoMappingSwitch) {
      autoMappingSwitch.checked = false; // FORZAR A DESACTIVADO
      autoMappingSwitch.disabled = true; // DESHABILITAR
    }
    
    // Actualizar botón manual
    const manualBtn = document.getElementById('manual-mapping-btn');
    if (manualBtn) {
      manualBtn.style.display = 'block';
      manualBtn.style.backgroundColor = '#ff6b6b';
      manualBtn.style.color = 'white';
      manualBtn.style.border = '2px solid #ff4757';
      manualBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Mapeo BLOQUEADO (${validation.errors.length} Errores)`;
    }
    
    // NO mostrar modal - solo logs en consola
    console.log('🚫 Toggle FORZADO A DESACTIVADO por errores - Modo error activado');
    hasHardRuleErrorsPrev = true;
    
    // Actualizar variables globales
    updateGlobalBufferState();
    
    return false; // Reglas duras no cumplidas
  }
  
  console.log('✅ Reglas duras cumplidas - Mapeo disponible');
  
  // HABILITAR toggle si no hay errores
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  if (autoMappingSwitch) {
    autoMappingSwitch.disabled = false; // HABILITAR EL TOGGLE
  }
  
  // Restaurar botón manual normal
  const manualBtn = document.getElementById('manual-mapping-btn');
  if (manualBtn) {
    manualBtn.style.backgroundColor = '';
    manualBtn.style.color = '';
    manualBtn.style.border = '';
    manualBtn.innerHTML = '<i class="fas fa-magic"></i> Ejecutar Mapeo Manual';
    
    // Solo ocultar si el toggle está activado
    if (autoMappingSwitch && autoMappingSwitch.checked) {
      manualBtn.style.display = 'none';
    } else {
      manualBtn.style.display = 'block';
    }
  }
  
  // Si veníamos de errores o hay cambios pendientes, aplicar estado bufferizado y mapear
  if (hasHardRuleErrorsPrev || pendingMappingDueToErrors) {
    console.log('🔄 Aplicando estado bufferizado tras corregir errores...');
    console.log('🔍 DEBUG - hasHardRuleErrorsPrev:', hasHardRuleErrorsPrev);
    console.log('🔍 DEBUG - pendingMappingDueToErrors:', pendingMappingDueToErrors);
    console.log('🔍 DEBUG - bufferedMatrixState keys:', bufferedMatrixState ? Object.keys(bufferedMatrixState).length : 'null');
    
    // Usar la función específica para aplicar estado bufferizado
    forceApplyBufferedState();
  }
  
  return true; // Reglas duras cumplidas
}

// Función para forzar aplicación de estado bufferizado
export async function forceApplyBufferedState() {
  console.log('🔄 === FORZANDO APLICACIÓN DE ESTADO BUFFERIZADO ===');
  
  if (!bufferedMatrixState || Object.keys(bufferedMatrixState).length === 0) {
    console.log('❌ No hay estado bufferizado para aplicar');
    return false;
  }
  
  console.log('📦 Aplicando estado bufferizado con', Object.keys(bufferedMatrixState).length, 'tareas...');
  console.log('🔍 DEBUG - Estado actual antes:', Object.keys(rasciManager.rasciMatrixData || {}).length, 'tareas');
  console.log('🔍 DEBUG - Estado bufferizado:', Object.keys(bufferedMatrixState).length, 'tareas');
  
  // Aplicar estado bufferizado
  rasciManager.rasciMatrixData = JSON.parse(JSON.stringify(bufferedMatrixState));
  
  // Actualizar UI
  const panel = document.querySelector('#rasci-panel');
  if (panel) {
    const currentRoles = rasciManager.rasciRoles || [];
    renderMatrix(panel, currentRoles, null);
  }
  
  console.log('✅ Estado bufferizado aplicado');
  console.log('🔍 DEBUG - Estado después:', Object.keys(rasciManager.rasciMatrixData || {}).length, 'tareas');
  
  // Resetear flags
  hasHardRuleErrorsPrev = false;
  pendingMappingDueToErrors = false;
  bufferedMatrixState = null;
  
  // Actualizar variables globales
  updateGlobalBufferState();
  
  // Ejecutar mapeo
  console.log('🔄 Ejecutando mapeo después de aplicar estado bufferizado...');
  return executeCompleteMatrixMapping();
}

// Función para ejecutar mapeo completo de toda la matriz al canvas
export async function executeCompleteMatrixMapping() {
  console.log('🚀 === EJECUTANDO MAPEO COMPLETO DE TODA LA MATRIZ AL CANVAS ===');
  
  // 1. Verificar que tenemos datos
  if (!rasciManager.rasciMatrixData || Object.keys(rasciManager.rasciMatrixData).length === 0) {
    console.log('❌ No hay datos de matriz para mapear');
    return false;
  }
  
  if (!rasciManager.getBpmnModeler()) {
    console.log('❌ No hay modeler BPMN disponible');
    return false;
  }
  
  // 2. Aplicar estado bufferizado si existe
  if (bufferedMatrixState && Object.keys(bufferedMatrixState).length > 0) {
    console.log('📦 Aplicando estado bufferizado con', Object.keys(bufferedMatrixState).length, 'tareas...');
    console.log('🔍 DEBUG - Estado actual antes de aplicar buffer:', Object.keys(rasciManager.rasciMatrixData || {}).length, 'tareas');
    console.log('🔍 DEBUG - Estado bufferizado:', Object.keys(bufferedMatrixState).length, 'tareas');
    
    rasciManager.rasciMatrixData = JSON.parse(JSON.stringify(bufferedMatrixState));
    
    // Actualizar la UI de la matriz
    const panel = document.querySelector('#rasci-panel');
    if (panel) {
      const currentRoles = rasciManager.rasciRoles || [];
      renderMatrix(panel, currentRoles, null);
    }
    console.log('✅ Estado bufferizado aplicado');
    console.log('🔍 DEBUG - Estado después de aplicar buffer:', Object.keys(rasciManager.rasciMatrixData || {}).length, 'tareas');
  } else {
    console.log('🔍 DEBUG - No hay estado bufferizado para aplicar');
  }
  
  // 3. Ejecutar mapeo completo de toda la matriz
  try {
    console.log('🔄 Ejecutando mapeo directo para garantizar limpieza de asignaciones previas...');
    
    // SIEMPRE usar mapeo directo para garantizar que se limpien las asignaciones previas
    const directMappingSuccess = await executeDirectMatrixToCanvasMapping();
    
    if (directMappingSuccess) {
      console.log('✅ Mapeo directo ejecutado exitosamente - Asignaciones previas limpiadas');
      // Resetear flags y buffer
      hasHardRuleErrorsPrev = false;
      pendingMappingDueToErrors = false;
      bufferedMatrixState = null;
      
      // Actualizar variables globales
      updateGlobalBufferState();
      console.log('🎉 Mapeo completo de toda la matriz ejecutado - TODOS los elementos mapeados al canvas');
      return true;
    } else {
      console.log('❌ El mapeo directo falló, intentando mapeo vía service registry como respaldo...');
      
      // Respaldo: usar service registry
      const sr = getServiceRegistry();
      let mappingExecuted = false;
      
      if (sr && typeof sr.getFunction === 'function') {
        const executeRasciToRalphMapping = sr.getFunction('executeRasciToRalphMapping');
        if (typeof executeRasciToRalphMapping === 'function') {
          console.log('🔄 Ejecutando mapeo vía service registry como respaldo...');
          
          try {
            const result = executeRasciToRalphMapping(true); // Forzar ejecución
            
            // Si la función devuelve una promesa, esperarla
            if (result && typeof result.then === 'function') {
              await result;
            }
            
            mappingExecuted = true;
            console.log('✅ Mapeo vía service registry ejecutado como respaldo');
          } catch (error) {
            console.error('❌ Error en mapeo vía service registry:', error);
          }
        }
      }
      
      if (mappingExecuted) {
        // Resetear flags y buffer
        hasHardRuleErrorsPrev = false;
        pendingMappingDueToErrors = false;
        bufferedMatrixState = null;
        
        // Actualizar variables globales
        updateGlobalBufferState();
        console.log('🎉 Mapeo ejecutado vía respaldo - elementos mapeados al canvas');
        return true;
      } else {
        console.log('❌ No se pudo ejecutar el mapeo completo por ningún método');
        return false;
      }
    }
    
  } catch (error) {
    console.error('❌ Error ejecutando mapeo completo de matriz:', error);
    return false;
  }
}

// Función para forzar mapeo completo de todos los cambios (mantenida para compatibilidad)
export function forceCompleteMapping() {
  console.log('🔄 === REDIRIGIENDO A MAPEO COMPLETO DE MATRIZ ===');
  return executeCompleteMatrixMapping();
}

// Función para aplicar estado bufferizado y sincronizar canvas
export function applyBufferedStateAndSync() {
  console.log('🔄 === APLICANDO ESTADO BUFFERIZADO Y SINCRONIZANDO CANVAS ===');
  
  // Usar la función de mapeo completo
  return forceCompleteMapping();
}

// Función para forzar sincronización completa del canvas
export function forceCompleteCanvasSync() {
  console.log('🔄 === FORZANDO SINCRONIZACIÓN COMPLETA DEL CANVAS ===');
  
  // Usar la función que aplica estado bufferizado
  return applyBufferedStateAndSync();
}

// Función para mapeo manual (habilitada y mejorada)
export async function executeManualMapping() {
  console.log('🔧 === EJECUTANDO MAPEO MANUAL ===');
  
  // 1. Primero sincronizar matriz desde diagrama para capturar cambios recientes
  console.log('🔄 1. Sincronizando diagrama → matriz...');
  updateMatrixFromDiagram();
  
  // 2. Luego ejecutar mapeo completo de matriz → canvas
  console.log('🔄 2. Ejecutando mapeo matriz → canvas...');
  
  try {
    // Usar la función de mapeo completo que ya tenemos
    const success = await executeCompleteMatrixMapping();
    
    if (success) {
      console.log('✅ Mapeo manual ejecutado exitosamente');
      
      // Mostrar mensaje temporal de éxito
      showTemporaryMessage('✅ Mapeo manual ejecutado correctamente', 'success');
    } else {
      console.log('❌ Error en mapeo manual');
      showTemporaryMessage('❌ Error ejecutando mapeo manual', 'error');
    }
    
    return success;
  } catch (error) {
    console.error('❌ Error ejecutando mapeo manual:', error);
    showTemporaryMessage('❌ Error ejecutando mapeo manual: ' + error.message, 'error');
    return false;
  }
}

// Función para mapeo manual con validación (DESHABILITADA)
export function executeManualRasciMapping() {
  console.log('🔧 === MAPEO MANUAL DESHABILITADO ===');
  console.log('ℹ️ El mapeo manual ha sido deshabilitado. Usa el toggle automático para mapear.');
  return false;
}

// Función eliminada - ya no se usan modales de errores

// Función para mostrar modal de mapeo manual con errores (mantenida para compatibilidad)
export function showManualMappingWithErrorsModal(errors) {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content" style="max-width: 600px;">
      <h3 class="modal-title">⚠️ Mapeo Manual con Errores Críticos</h3>
      <div class="modal-message">
        <p>Se detectaron errores críticos en la matriz RASCI:</p>
        <ul style="text-align: left; margin: 15px 0; padding-left: 20px; background: #fff3cd; padding: 10px; border-radius: 5px; border-left: 4px solid #ffc107;">
          ${errors.map(error => `<li style="margin: 5px 0;">${error}</li>`).join('')}
        </ul>
        <div style="background: #f8d7da; padding: 10px; border-radius: 5px; border-left: 4px solid #dc3545; margin: 15px 0;">
          <p style="margin: 0;"><strong>⚠️ Advertencia:</strong> El mapeo manual puede causar inconsistencias en el diagrama debido a estos errores.</p>
        </div>
        <p><strong>¿Qué deseas hacer?</strong></p>
      </div>
      <div class="modal-actions" style="display: flex; gap: 10px; justify-content: center;">
        <button class="modal-btn" id="cancel-manual-mapping" style="background: #6c757d; color: white;">
          <i class="fas fa-times"></i> Cancelar
        </button>
        <button class="modal-btn" id="force-manual-mapping" style="background: #ff6b6b; color: white; border: 2px solid #ff4757;">
          <i class="fas fa-exclamation-triangle"></i> Forzar Mapeo
        </button>
        <button class="modal-btn" id="fix-errors-first" style="background: #28a745; color: white;">
          <i class="fas fa-wrench"></i> Corregir Errores
        </button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  function closeModal() { 
    try { modal.remove(); } catch (_) {} 
  }

  function forceManualMapping() {
    closeModal();
    console.log('🔧 Forzando mapeo manual a pesar de errores...');
    
    // Ejecutar mapeo sin validación
    try {
      const sr = getServiceRegistry();
      if (sr && typeof sr.getFunction === 'function') {
        const executeRasciToRalphMapping = sr.getFunction('executeRasciToRalphMapping');
        if (typeof executeRasciToRalphMapping === 'function') {
          executeRasciToRalphMapping();
          console.log('✅ Mapeo manual forzado ejecutado');
        }
      }
    } catch (error) {
      console.error('❌ Error ejecutando mapeo manual forzado:', error);
    }
  }

  function fixErrorsFirst() {
    closeModal();
    console.log('🔧 Abriendo panel para corregir errores...');
    // Aquí podrías abrir un panel de corrección de errores o dar instrucciones
    alert('Corrige los errores en la matriz RASCI y vuelve a intentar el mapeo manual.');
  }

  modal.querySelector('#cancel-manual-mapping').addEventListener('click', closeModal);
  modal.querySelector('#force-manual-mapping').addEventListener('click', forceManualMapping);
  modal.querySelector('#fix-errors-first').addEventListener('click', fixErrorsFirst);
  
  const handleEsc = (e) => { 
    if (e.key === 'Escape') { 
      closeModal(); 
      document.removeEventListener('keydown', handleEsc); 
    } 
  };
  document.addEventListener('keydown', handleEsc);
}

// Función simple para validar solo (sin auto-corrección)
export function activarSistemaCompleto() {
  console.log('🔍 Validando matriz RASCI...');
  
  // Solo validar sin hacer correcciones automáticas
  const sr = getServiceRegistry();
  if (sr && typeof sr.getFunction === 'function') {
    const validateRasciRules = sr.getFunction('validateRasciRules');
    if (typeof validateRasciRules === 'function') {
      const validation = validateRasciRules();
      if (!validation.isValid) {
        console.log('❌ Se encontraron errores en la matriz RASCI:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        return { success: false, errors: validation.errors };
      }
    }
  }
  
  console.log('✅ Validación completada - Matrix RASCI válida');
  return { success: true, errors: [] };
}

// Registro en el service registry
const sr = getServiceRegistry();
if (sr) {
  // Registrar la función de validación como toggleAutoMapping para que el HTML la use
  sr.registerFunction('toggleAutoMapping', validateAndToggleAutoMapping);
  sr.registerFunction('initializeAutoMappingSwitch', initializeAutoMappingSwitch);
  sr.registerFunction('validateRasciCriticalRules', validateRasciCriticalRules);
  sr.registerFunction('validateAndToggleAutoMapping', validateAndToggleAutoMapping);
  sr.registerFunction('executeManualRasciMapping', executeManualRasciMapping);
  sr.registerFunction('updateUIForErrorState', updateUIForErrorState);
  sr.registerFunction('forceToggleDisabledOnErrors', forceToggleDisabledOnErrors);
  sr.registerFunction('validateHardRulesInRealTime', validateHardRulesInRealTime);
  sr.registerFunction('forceCompleteCanvasSync', forceCompleteCanvasSync);
  sr.registerFunction('applyBufferedStateAndSync', applyBufferedStateAndSync);
  // Funciones de modales eliminadas - ya no se usan
  sr.registerFunction('showManualMappingWithErrorsModal', showManualMappingWithErrorsModal);
  sr.registerFunction('validateRasciMatrixSilently', validateRasciMatrixSilently);
  sr.registerFunction('testMatrixUpdateBehavior', testMatrixUpdateBehavior);
  sr.registerFunction('testRasciValidationWithErrors', testRasciValidationWithErrors);
  sr.registerFunction('testRasciValidationWithoutErrors', testRasciValidationWithoutErrors);
  sr.registerFunction('testAutoTaskFiltering', testAutoTaskFiltering);
  sr.registerFunction('cleanAutoTasksFromMatrix', cleanAutoTasksFromMatrix);
  sr.registerFunction('testToggleActivationSync', testToggleActivationSync);
  sr.registerFunction('executeManualMapping', executeManualMapping);
  sr.registerFunction('testManualMapping', testManualMapping);
  sr.registerFunction('executeDirectMatrixToCanvasMapping', executeDirectMatrixToCanvasMapping);
  sr.registerFunction('testCompleteMappingSystem', testCompleteMappingSystem);
  sr.registerFunction('testBufferState', testBufferState);
  sr.registerFunction('testServiceRegistry', testServiceRegistry);
  sr.registerFunction('diagnosticComplete', diagnosticComplete);
  sr.registerFunction('testDirectMapping', testDirectMapping);
  sr.registerFunction('clearMemoryAndReset', clearMemoryAndReset);
  sr.registerFunction('syncMatrixWithCanvas', syncMatrixWithCanvas);
  sr.registerFunction('diagnoseCanvasMatrixSync', diagnoseCanvasMatrixSync);
  sr.registerFunction('forceCompleteMapping', forceCompleteMapping);
  sr.registerFunction('executeCompleteMatrixMapping', executeCompleteMatrixMapping);
  sr.registerFunction('forceApplyBufferedState', forceApplyBufferedState);
  sr.registerFunction('testBufferMappingIssue', testBufferMappingIssue);
  sr.registerFunction('debugCanvasElements', debugCanvasElements);
  sr.registerFunction('debugApprovalTaskCreation', debugApprovalTaskCreation);
  sr.registerFunction('configureMatrixCallback', configureMatrixCallback);
  sr.registerFunction('testCallbackConfiguration', testCallbackConfiguration);
  
  // La función executeRasciToRalphMapping se registrará desde auto-mapper.js
}

// Hacer la función de validación disponible globalmente para el HTML
if (typeof window !== 'undefined') {
  // IMPORTANTE: Asignar la función de validación como toggleAutoMapping
  window.toggleAutoMapping = validateAndToggleAutoMapping;
  window.validateAndToggleAutoMapping = validateAndToggleAutoMapping;
  window.executeManualRasciMapping = executeManualRasciMapping;
  window.validateRasciCriticalRules = validateRasciCriticalRules;
  window.validateRasciMatrixSilently = validateRasciMatrixSilently;
  window.testMatrixUpdateBehavior = testMatrixUpdateBehavior;
  // Funciones de prueba disponibles globalmente
  window.testRasciValidationWithErrors = testRasciValidationWithErrors;
  window.testRasciValidationWithoutErrors = testRasciValidationWithoutErrors;
  window.testAutoTaskFiltering = testAutoTaskFiltering;
  window.cleanAutoTasksFromMatrix = cleanAutoTasksFromMatrix;
  window.testToggleActivationSync = testToggleActivationSync;
  window.executeManualMapping = executeManualMapping;
  window.testManualMapping = testManualMapping;
  window.executeDirectMatrixToCanvasMapping = executeDirectMatrixToCanvasMapping;
  window.testCompleteMappingSystem = testCompleteMappingSystem;
  window.applyBufferedStateAndSync = applyBufferedStateAndSync;
  window.forceCompleteCanvasSync = forceCompleteCanvasSync;
  window.testBufferState = testBufferState;
  window.testServiceRegistry = testServiceRegistry;
  window.diagnosticComplete = diagnosticComplete;
  
  // Función de prueba simple para mapeo directo
  window.testDirectMapping = function() {
    console.log('🧪 === PROBANDO MAPEO DIRECTO ===');
    console.log('⚠️ Usar testDirectMappingAsync() para mapeo directo');
    return false;
  };
  
  // Función de prueba para mapeo directo
  window.testDirectMapping = testDirectMapping;
  // Función para limpiar memoria
  window.clearMemoryAndReset = clearMemoryAndReset;
  // Función para sincronizar matriz con canvas
  window.syncMatrixWithCanvas = syncMatrixWithCanvas;
  // Función de diagnóstico de sincronización
  window.diagnoseCanvasMatrixSync = diagnoseCanvasMatrixSync;
  // Función para forzar mapeo completo
  window.forceCompleteMapping = forceCompleteMapping;
  // Función para ejecutar mapeo completo de matriz
  window.executeCompleteMatrixMapping = executeCompleteMatrixMapping;
  // Función para forzar aplicación de estado bufferizado
  window.forceApplyBufferedState = forceApplyBufferedState;
  // Función de prueba para el problema del buffer
  window.testBufferMappingIssue = testBufferMappingIssue;
  window.debugCanvasElements = debugCanvasElements;
  window.debugApprovalTaskCreation = debugApprovalTaskCreation;
  window.configureMatrixCallback = configureMatrixCallback;
  window.testCallbackConfiguration = testCallbackConfiguration;
  
  // Exponer variables de buffer globalmente para diagnóstico
  updateGlobalBufferState();
  
  // Configurar automáticamente el callback
  setTimeout(() => {
    configureMatrixCallback();
  }, 100);
}

// Función de prueba para mapeo directo (simplificada)
export function testDirectMapping() {
  console.log('🧪 === PROBANDO MAPEO DIRECTO ===');
  console.log('⚠️ Función simplificada - usar diagnosticComplete() para diagnóstico completo');
  return false;
}

// Función de prueba específica para el problema del buffer
export function testBufferMappingIssue() {
  console.log('🧪 === PROBANDO PROBLEMA DEL BUFFER ===');

  // 1. Verificar estado actual
  console.log('1️⃣ Estado actual:');
  console.log('  - hasHardRuleErrorsPrev:', hasHardRuleErrorsPrev);
  console.log('  - pendingMappingDueToErrors:', pendingMappingDueToErrors);
  console.log('  - bufferedMatrixState:', bufferedMatrixState ? Object.keys(bufferedMatrixState).length + ' tareas' : 'null');

  // 2. Verificar validación
  const validation = validateRasciCriticalRules();
  console.log('2️⃣ Validación actual:');
  console.log('  - isValid:', validation.isValid);
  console.log('  - errors:', validation.errors.length);

  // 3. Simular corrección de errores
  if (validation.isValid && (hasHardRuleErrorsPrev || pendingMappingDueToErrors)) {
    console.log('3️⃣ Simulando corrección de errores...');
    console.log('🔄 Llamando a validateHardRulesInRealTime...');
    validateHardRulesInRealTime();
  } else if (validation.isValid && !hasHardRuleErrorsPrev && !pendingMappingDueToErrors) {
    console.log('3️⃣ No hay errores ni estado bufferizado - sistema normal');
  } else {
    console.log('3️⃣ Aún hay errores - no se puede probar la corrección');
  }

  // 4. Forzar aplicación de buffer si existe
  if (bufferedMatrixState && Object.keys(bufferedMatrixState).length > 0) {
    console.log('4️⃣ Forzando aplicación de estado bufferizado...');
    forceApplyBufferedState();
  } else {
    console.log('4️⃣ No hay estado bufferizado para aplicar');
  }

  console.log('🏁 === FIN DE PRUEBA DEL BUFFER ===');
}

// Función para probar la configuración del callback
export function testCallbackConfiguration() {
  console.log('🧪 === PROBANDO CONFIGURACIÓN DEL CALLBACK ===');
  
  // 1. Verificar si el callback está configurado
  console.log('1️⃣ Estado del callback:');
  console.log('  - onRasciMatrixUpdatedFunction:', typeof onRasciMatrixUpdatedFunction);
  console.log('  - window.onRasciMatrixUpdatedFunction:', typeof window.onRasciMatrixUpdatedFunction);
  
  // 2. Configurar el callback si no está configurado
  if (typeof onRasciMatrixUpdatedFunction !== 'function') {
    console.log('2️⃣ Callback no configurado, configurando...');
    configureMatrixCallback();
  } else {
    console.log('2️⃣ Callback ya está configurado');
  }
  
  // 3. Probar el callback
  console.log('3️⃣ Probando callback...');
  try {
    if (typeof onRasciMatrixUpdatedFunction === 'function') {
      onRasciMatrixUpdatedFunction();
      console.log('✅ Callback ejecutado exitosamente');
    } else {
      console.log('❌ Callback no disponible');
    }
  } catch (error) {
    console.error('❌ Error ejecutando callback:', error);
  }
  
  // 4. Verificar estado del buffer después del callback
  console.log('4️⃣ Estado del buffer después del callback:');
  testBufferState();
  
  console.log('🏁 === FIN DE PRUEBA DEL CALLBACK ===');
}

export function debugCanvasElements() {
  console.log('🔍 === DIAGNÓSTICO DE ELEMENTOS DEL CANVAS ===');
  
  try {
    const modeler = rasciManager.getBpmnModeler();
    if (!modeler) {
      console.log('❌ No hay modeler disponible');
      return;
    }
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    console.log('1️⃣ Total de elementos en canvas:', allElements.length);
    
    // Filtrar elementos RALph
    const ralphElements = allElements.filter(el => 
      el.type && (
        el.type.includes('RALph') || 
        el.type.includes('ralph') ||
        el.type.includes('Role')
      )
    );
    console.log('2️⃣ Elementos RALph encontrados:', ralphElements.length);
    
    // Buscar tareas de aprobación
    const approvalTasks = allElements.filter(el => 
      el.businessObject && 
      el.businessObject.name && 
      el.businessObject.name.startsWith('Aprobar ')
    );
    console.log('3️⃣ Tareas de aprobación encontradas:', approvalTasks.length);
    approvalTasks.forEach(task => {
      console.log('   -', task.businessObject.name, '(ID:', task.id, ')');
    });
    
    // Mostrar matriz actual
    console.log('4️⃣ Matriz RASCI actual:');
    console.log(rasciManager.rasciMatrixData);
    
    // Verificar si hay responsabilidades 'A'
    let hasApprovalResponsibilities = false;
    Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
      const taskRoles = rasciManager.rasciMatrixData[taskName];
      Object.keys(taskRoles).forEach(roleKey => {
        if (taskRoles[roleKey] === 'A') {
          hasApprovalResponsibilities = true;
          console.log('   - Tarea', taskName, 'tiene responsabilidad A para rol', roleKey);
        }
      });
    });
    
    if (!hasApprovalResponsibilities) {
      console.log('   - No hay responsabilidades de tipo A en la matriz');
    }
    
  } catch (error) {
    console.error('❌ Error en diagnóstico:', error);
  }
  
  console.log('🏁 === FIN DE DIAGNÓSTICO ===');
}

export function debugApprovalTaskCreation() {
  console.log('🔍 === DIAGNÓSTICO DE CREACIÓN DE TAREAS DE APROBACIÓN ===');
  
  try {
    const modeler = rasciManager.getBpmnModeler();
    if (!modeler) {
      console.log('❌ No hay modeler disponible');
      return;
    }
    
    const elementRegistry = modeler.get('elementRegistry');
    if (!elementRegistry) {
      console.log('❌ Element Registry no disponible');
      return;
    }
    
    // Verificar si hay tareas BPMN que deberían tener tareas de aprobación
    if (rasciManager.rasciMatrixData) {
      console.log('1️⃣ Verificando tareas que deberían tener aprobación:');
      
      Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
        const taskRoles = rasciManager.rasciMatrixData[taskName];
        const hasApproval = Object.values(taskRoles).includes('A');
        
        if (hasApproval) {
          console.log(`   📋 Tarea: ${taskName}`);
          
          // Buscar la tarea BPMN (por ID, no por nombre)
          const bpmnTask = elementRegistry.find(el => 
            el.businessObject && 
            el.businessObject.id === taskName &&
            (el.type === 'bpmn:Task' || el.type === 'bpmn:UserTask' || el.type === 'bpmn:ServiceTask')
          );
          
          if (bpmnTask) {
            console.log(`   ✅ Tarea BPMN encontrada: ${bpmnTask.id}`);
            
            // Buscar tarea de aprobación esperada
            const expectedApprovalName = `Aprobar ${taskName}`;
            const approvalTask = elementRegistry.find(el => 
              el.businessObject && 
              el.businessObject.name === expectedApprovalName &&
              el.type === 'bpmn:UserTask'
            );
            
            if (approvalTask) {
              console.log(`   ✅ Tarea de aprobación encontrada: ${approvalTask.id}`);
            } else {
              console.log(`   ❌ Tarea de aprobación NO encontrada: ${expectedApprovalName}`);
              
              // Verificar si hay conexiones salientes de la tarea BPMN
              const outgoingConnections = elementRegistry.filter(conn => 
                conn.type === 'bpmn:SequenceFlow' && 
                conn.source && conn.source.id === bpmnTask.id
              );
              
              console.log(`   🔗 Conexiones salientes: ${outgoingConnections.length}`);
              outgoingConnections.forEach(conn => {
                const targetName = conn.target && conn.target.businessObject ? 
                  conn.target.businessObject.name : 'Sin nombre';
                console.log(`      → ${targetName} (${conn.target ? conn.target.type : 'N/A'})`);
              });
            }
          } else {
            console.log(`   ❌ Tarea BPMN NO encontrada para: ${taskName}`);
          }
        }
      });
    }
    
    console.log('🏁 === FIN DE DIAGNÓSTICO DE APROBACIÓN ===');
    
  } catch (error) {
    console.error('❌ Error en diagnóstico de aprobación:', error);
  }
}

// Función para sincronizar matriz con canvas actual
export function syncMatrixWithCanvas() {
  console.log('🔄 === SINCRONIZANDO MATRIZ CON CANVAS ACTUAL ===');
  
  // 1. Obtener tareas actuales del canvas
  const currentCanvasTasks = getBpmnTasks();
  console.log('📋 Tareas actuales en canvas:', currentCanvasTasks);
  
  // 2. Obtener tareas actuales en la matriz
  const currentMatrixTasks = rasciManager.rasciMatrixData ? Object.keys(rasciManager.rasciMatrixData) : [];
  console.log('📋 Tareas actuales en matriz:', currentMatrixTasks);
  
  // 3. Identificar tareas que están en la matriz pero no en el canvas
  const orphanedTasks = currentMatrixTasks.filter(taskId => !currentCanvasTasks.includes(taskId));
  console.log('🗑️ Tareas huérfanas (en matriz pero no en canvas):', orphanedTasks);
  
  // 4. Identificar tareas que están en el canvas pero no en la matriz
  const missingTasks = currentCanvasTasks.filter(taskId => !currentMatrixTasks.includes(taskId));
  console.log('➕ Tareas faltantes (en canvas pero no en matriz):', missingTasks);
  
  // 5. Eliminar tareas huérfanas de la matriz
  if (orphanedTasks.length > 0) {
    console.log(`🧹 Eliminando ${orphanedTasks.length} tareas huérfanas...`);
    orphanedTasks.forEach(taskId => {
      delete rasciManager.rasciMatrixData[taskId];
      console.log(`🗑️ Eliminada tarea huérfana: ${taskId}`);
    });
  }
  
  // 6. Añadir tareas faltantes a la matriz
  if (missingTasks.length > 0) {
    console.log(`➕ Añadiendo ${missingTasks.length} tareas faltantes...`);
    const currentRoles = rasciManager.rasciRoles || [];
    missingTasks.forEach(taskId => {
      const taskRoles = {};
      currentRoles.forEach(role => {
        taskRoles[role] = '';
      });
      rasciManager.rasciMatrixData[taskId] = taskRoles;
      console.log(`➕ Añadida tarea: ${taskId}`);
    });
  }
  
  // 7. Re-renderizar matriz
  const panel = document.querySelector('#rasci-panel');
  if (panel) {
    const currentRoles = rasciManager.rasciRoles || [];
    renderMatrix(panel, currentRoles, null);
    console.log('✅ Matriz re-renderizada');
  }
  
  // 8. Limpiar buffer
  bufferedMatrixState = null;
  pendingMappingDueToErrors = false;
  hasHardRuleErrorsPrev = false;
  console.log('✅ Buffer limpiado');
  
  console.log('🎉 Sincronización completada');
  
  return {
    canvasTasks: currentCanvasTasks.length,
    matrixTasks: currentMatrixTasks.length,
    orphanedRemoved: orphanedTasks.length,
    missingAdded: missingTasks.length,
    synchronized: true
  };
}

// Función para limpiar completamente la memoria y resetear estado
export function clearMemoryAndReset() {
  console.log('🧹 === LIMPIANDO MEMORIA Y RESETEANDO ESTADO ===');
  
  // 1. Limpiar buffer
  bufferedMatrixState = null;
  pendingMappingDueToErrors = false;
  hasHardRuleErrorsPrev = false;
  console.log('✅ Buffer limpiado');
  
  // 2. Limpiar tareas automáticas de la matriz
  if (rasciManager.rasciMatrixData) {
    const allTasks = Object.keys(rasciManager.rasciMatrixData);
    const autoTasks = allTasks.filter(taskId => taskId.startsWith('Aprobar '));
    
    if (autoTasks.length > 0) {
      console.log(`🧹 Eliminando ${autoTasks.length} tareas automáticas de la memoria...`);
      autoTasks.forEach(taskId => {
        delete rasciManager.rasciMatrixData[taskId];
        console.log(`🗑️ Eliminada: ${taskId}`);
      });
    }
  }
  
  // 3. Limpiar localStorage si existe
  try {
    if (typeof localStorage !== 'undefined') {
      const keys = Object.keys(localStorage);
      const rasciKeys = keys.filter(key => key.includes('rasci') || key.includes('RASCI'));
      rasciKeys.forEach(key => {
        localStorage.removeItem(key);
        console.log(`🗑️ Eliminado de localStorage: ${key}`);
      });
    }
  } catch (error) {
    console.log('⚠️ No se pudo acceder a localStorage:', error.message);
  }
  
  // 4. Resetear toggle
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  if (autoMappingSwitch) {
    autoMappingSwitch.checked = false;
    autoMappingSwitch.disabled = false;
    console.log('✅ Toggle reseteado');
  }
  
  // 5. Resetear botón manual
  const manualBtn = document.getElementById('manual-mapping-btn');
  if (manualBtn) {
    manualBtn.style.display = 'block';
    manualBtn.style.backgroundColor = '';
    manualBtn.style.color = '';
    manualBtn.style.border = '';
    manualBtn.innerHTML = '<i class="fas fa-magic"></i> Ejecutar Mapeo Manual';
    console.log('✅ Botón manual reseteado');
  }
  
  // 6. Re-renderizar matriz
  const panel = document.querySelector('#rasci-panel');
  if (panel) {
    const currentRoles = rasciManager.rasciRoles || [];
    renderMatrix(panel, currentRoles, null);
    console.log('✅ Matriz re-renderizada');
  }
  
  console.log('🎉 Limpieza completa finalizada');
  
  return {
    bufferCleared: true,
    autoTasksRemoved: rasciManager.rasciMatrixData ? Object.keys(rasciManager.rasciMatrixData).filter(taskId => taskId.startsWith('Aprobar ')).length : 0,
    toggleReset: !!autoMappingSwitch,
    matrixRerendered: !!panel
  };
}

// Función de prueba para verificar el estado del buffer
export function testBufferState() {
  console.log('🧪 === ESTADO DEL BUFFER ===');
  console.log('📦 Estado bufferizado:', bufferedMatrixState ? Object.keys(bufferedMatrixState).length + ' tareas' : 'null');
  console.log('⏸️ Cambios pendientes:', pendingMappingDueToErrors);
  console.log('🚫 Errores previos:', hasHardRuleErrorsPrev);
  
  if (bufferedMatrixState) {
    console.log('📋 Tareas en buffer:');
    Object.keys(bufferedMatrixState).forEach(task => {
      const roles = Object.keys(bufferedMatrixState[task]);
      const assignments = roles.map(role => `${role}:${bufferedMatrixState[task][role] || '?'}`).join(', ');
      console.log(`  - ${task}: ${assignments}`);
    });
  }
  
  return {
    bufferedState: bufferedMatrixState,
    pendingMapping: pendingMappingDueToErrors,
    hadErrors: hasHardRuleErrorsPrev
  };
}

// Función de prueba para verificar el service registry
export function testServiceRegistry() {
  console.log('🧪 === ESTADO DEL SERVICE REGISTRY ===');
  
  const sr = getServiceRegistry();
  if (!sr) {
    console.log('❌ Service Registry no disponible');
    return;
  }
  
  const stats = sr.getStats();
  console.log('📊 Estadísticas del registry:');
  console.log('  - Servicios:', stats.services);
  console.log('  - Funciones:', stats.functions);
  
  console.log('🔍 Funciones disponibles:');
  stats.functionNames.forEach(name => {
    console.log(`  - ${name}`);
  });
  
  // Verificar específicamente executeRasciToRalphMapping
  const hasExecuteFunction = sr.has('executeRasciToRalphMapping') || stats.functionNames.includes('executeRasciToRalphMapping');
  console.log('🎯 executeRasciToRalphMapping registrada:', hasExecuteFunction);
  
  if (hasExecuteFunction) {
    try {
      const fn = sr.getFunction('executeRasciToRalphMapping');
      console.log('✅ Función encontrada:', typeof fn);
    } catch (error) {
      console.log('❌ Error obteniendo función:', error.message);
    }
  }
  
  return {
    stats,
    hasExecuteFunction,
    functionNames: stats.functionNames
  };
}

// Función de diagnóstico específica para sincronización
export function diagnoseCanvasMatrixSync() {
  console.log('🔍 === DIAGNÓSTICO DE SINCRONIZACIÓN CANVAS-MATRIZ ===');
  
  // 1. Obtener tareas del canvas
  const canvasTasks = getBpmnTasks();
  console.log('1️⃣ Tareas en canvas:', canvasTasks);
  
  // 2. Obtener tareas de la matriz
  const matrixTasks = rasciManager.rasciMatrixData ? Object.keys(rasciManager.rasciMatrixData) : [];
  console.log('2️⃣ Tareas en matriz:', matrixTasks);
  
  // 3. Identificar diferencias
  const orphanedTasks = matrixTasks.filter(taskId => !canvasTasks.includes(taskId));
  const missingTasks = canvasTasks.filter(taskId => !matrixTasks.includes(taskId));
  
  console.log('3️⃣ Tareas huérfanas (en matriz pero no en canvas):', orphanedTasks);
  console.log('4️⃣ Tareas faltantes (en canvas pero no en matriz):', missingTasks);
  
  // 4. Verificar tareas "Aprobar X"
  const autoTasks = matrixTasks.filter(taskId => taskId.startsWith('Aprobar '));
  console.log('5️⃣ Tareas automáticas en matriz:', autoTasks);
  
  // 5. Verificar validación
  const validation = validateRasciCriticalRules();
  console.log('6️⃣ Estado de validación:');
  console.log('   - Válido:', validation.isValid);
  console.log('   - Errores:', validation.errors.length);
  if (validation.errors.length > 0) {
    console.log('   - Lista de errores:');
    validation.errors.forEach(error => console.log(`     ❌ ${error}`));
  }
  
  return {
    canvasTasks: canvasTasks,
    matrixTasks: matrixTasks,
    orphanedTasks: orphanedTasks,
    missingTasks: missingTasks,
    autoTasks: autoTasks,
    validation: validation,
    needsSync: orphanedTasks.length > 0 || missingTasks.length > 0
  };
}

// Función de diagnóstico completa
export function diagnosticComplete() {
  console.log('🔍 === DIAGNÓSTICO COMPLETO ===');
  
  // 1. Verificar service registry
  const sr = getServiceRegistry();
  console.log('1️⃣ Service Registry disponible:', !!sr);
  
  if (sr) {
    const stats = sr.getStats();
    console.log('   - Funciones registradas:', stats.functions);
    console.log('   - executeRasciToRalphMapping registrada:', stats.functionNames.includes('executeRasciToRalphMapping'));
  }
  
  // 2. Verificar estado de la matriz
  console.log('2️⃣ Estado de la matriz RASCI:');
  console.log('   - Matriz disponible:', !!rasciManager.rasciMatrixData);
  console.log('   - Tareas en matriz:', rasciManager.rasciMatrixData ? Object.keys(rasciManager.rasciMatrixData).length : 0);
  console.log('   - Modeler BPMN disponible:', !!rasciManager.getBpmnModeler());
  
  // 3. Verificar estado del buffer
  console.log('3️⃣ Estado del buffer:');
  console.log('   - Estado bufferizado:', !!bufferedMatrixState);
  console.log('   - Cambios pendientes:', pendingMappingDueToErrors);
  console.log('   - Errores previos:', hasHardRuleErrorsPrev);
  
  if (bufferedMatrixState) {
    console.log('   - Tareas en buffer:', Object.keys(bufferedMatrixState).length);
  }
  
  // 4. Verificar validación
  console.log('4️⃣ Estado de validación:');
  const validation = validateRasciCriticalRules();
  console.log('   - Válido:', validation.isValid);
  console.log('   - Errores:', validation.errors.length);
  console.log('   - Advertencias:', validation.warnings ? validation.warnings.length : 0);
  
  // 5. Verificar toggle
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  console.log('5️⃣ Estado del toggle:');
  console.log('   - Toggle encontrado:', !!autoMappingSwitch);
  if (autoMappingSwitch) {
    console.log('   - Toggle activado:', autoMappingSwitch.checked);
    console.log('   - Toggle habilitado:', !autoMappingSwitch.disabled);
  }
  
  // 6. Probar llamada directa
  console.log('6️⃣ Probando llamada directa:');
  try {
    if (sr && sr.getFunction) {
      const executeFn = sr.getFunction('executeRasciToRalphMapping');
      if (executeFn) {
        console.log('   - Función encontrada, probando llamada...');
        executeFn(true); // Forzar ejecución
        console.log('   - Llamada ejecutada');
      } else {
        console.log('   - Función NO encontrada en registry');
      }
    } else {
      console.log('   - No se puede acceder a getFunction');
    }
  } catch (error) {
    console.log('   - Error en llamada directa:', error.message);
  }
  
  return {
    serviceRegistry: !!sr,
    matrixAvailable: !!rasciManager.rasciMatrixData,
    modelerAvailable: !!rasciManager.getBpmnModeler(),
    bufferState: !!bufferedMatrixState,
    validation: validation,
    toggleState: autoMappingSwitch ? { found: true, checked: autoMappingSwitch.checked, enabled: !autoMappingSwitch.disabled } : { found: false }
  };
}

// Función de prueba para verificar el filtrado de tareas automáticas
export function testAutoTaskFiltering() {
  console.log('🧪 === PROBANDO FILTRADO DE TAREAS AUTOMÁTICAS ===');
  
  const matrixData = rasciManager.getRasciMatrixData();
  if (!matrixData || !matrixData.assignments) {
    console.log('❌ No hay datos de matriz disponibles');
    return;
  }
  
  const allTasks = Object.keys(matrixData.assignments);
  const autoTasks = allTasks.filter(taskId => taskId.startsWith('Aprobar '));
  const validTasks = allTasks.filter(taskId => !taskId.startsWith('Aprobar '));
  
  console.log(`📊 Tareas totales: ${allTasks.length}`);
  console.log(`🤖 Tareas automáticas (excluidas): ${autoTasks.length}`);
  autoTasks.forEach(task => console.log(`  - ${task}`));
  console.log(`✅ Tareas de proceso (validadas): ${validTasks.length}`);
  validTasks.forEach(task => console.log(`  - ${task}`));
  
  console.log('\n🔍 Ejecutando validación...');
  const result = validateRasciCriticalRules();
  
  console.log('📋 Resultado de validación:');
  console.log(`  ✅ Válido: ${result.isValid}`);
  console.log(`  ❌ Errores críticos: ${(result.errors && result.errors.length) || 0}`);
  console.log(`  ⚠️ Advertencias: ${(result.warnings && result.warnings.length) || 0}`);
  
  if (result.errors && result.errors.length > 0) {
    console.log('📝 Errores críticos encontrados:');
    result.errors.forEach(error => console.log(`  ❌ ${error}`));
  }
  
  if (result.warnings && result.warnings.length > 0) {
    console.log('📝 Advertencias encontradas:');
    result.warnings.forEach(warning => console.log(`  ⚠️ ${warning}`));
  }
  
  return result;
}

// Función de prueba para verificar la sincronización completa al activar toggle
export function testToggleActivationSync() {
  console.log('🧪 === PROBANDO SINCRONIZACIÓN AL ACTIVAR TOGGLE ===');
  
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  if (!autoMappingSwitch) {
    console.log('❌ No se encontró el switch de auto-mapping');
    return;
  }
  
  console.log('🔍 Estado inicial del toggle:', autoMappingSwitch.checked ? 'ACTIVADO' : 'DESACTIVADO');
  
  // Simular validación de estado actual
  console.log('📋 Datos actuales de matriz:');
  const matrixData = rasciManager.getRasciMatrixData();
  if (matrixData) {
    const tasks = Object.keys(matrixData);
    console.log(`  📊 Tareas en matriz: ${tasks.length}`);
    tasks.forEach(task => console.log(`    - ${task}`));
  } else {
    console.log('  ❌ No hay datos de matriz');
  }
  
  // Probar activación del toggle
  console.log('\n🎯 Intentando activar toggle...');
  validateAndToggleAutoMapping();
  
  console.log('\n✅ Prueba completada. Revisa los logs anteriores para ver el proceso de sincronización.');
}

// Función de prueba para verificar el mapeo manual
export function testManualMapping() {
  console.log('🧪 === PROBANDO MAPEO MANUAL ===');
  
  console.log('🔍 Estado actual:');
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  console.log(`  🎛️ Toggle automático: ${autoMappingSwitch ? (autoMappingSwitch.checked ? 'ACTIVADO' : 'DESACTIVADO') : 'NO ENCONTRADO'}`);
  console.log(`  🔲 Botón manual: ${manualBtn ? (manualBtn.style.display === 'none' ? 'OCULTO' : 'VISIBLE') : 'NO ENCONTRADO'}`);
  
  // Mostrar datos actuales de matriz
  const matrixData = rasciManager.getRasciMatrixData();
  if (matrixData) {
    const tasks = Object.keys(matrixData);
    console.log(`  📊 Tareas en matriz: ${tasks.length}`);
    tasks.forEach(task => console.log(`    - ${task}`));
  } else {
    console.log('  ❌ No hay datos de matriz');
  }
  
  // Ejecutar mapeo manual
  console.log('\n🚀 Ejecutando mapeo manual...');
  executeManualMapping();
  
  console.log('\n✅ Prueba de mapeo manual completada.');
}

// Función de prueba completa para verificar todo el sistema
export function testCompleteMappingSystem() {
  console.log('🧪 === PRUEBA COMPLETA DEL SISTEMA DE MAPEO ===');
  
  console.log('🔍 1. Estado actual del sistema:');
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualBtn = document.getElementById('manual-mapping-btn');
  
  console.log(`  🎛️ Toggle automático: ${autoMappingSwitch ? (autoMappingSwitch.checked ? 'ACTIVADO' : 'DESACTIVADO') : 'NO ENCONTRADO'}`);
  console.log(`  🔲 Botón manual: ${manualBtn ? (manualBtn.style.display === 'none' ? 'OCULTO' : 'VISIBLE') : 'NO ENCONTRADO'}`);
  
  // Mostrar datos actuales de matriz
  const matrixData = rasciManager.getRasciMatrixData();
  if (matrixData) {
    const tasks = Object.keys(matrixData);
    console.log(`  📊 Tareas en matriz: ${tasks.length}`);
    tasks.forEach(task => {
      const assignments = matrixData[task];
      const assignedRoles = Object.keys(assignments).filter(role => assignments[role] && assignments[role] !== '');
      console.log(`    - ${task}: ${assignedRoles.length} roles asignados`);
      assignedRoles.forEach(role => console.log(`      ${role}: ${assignments[role]}`));
    });
  } else {
    console.log('  ❌ No hay datos de matriz');
  }
  
  console.log('\n🚀 2. Probando mapeo directo...');
  executeDirectMatrixToCanvasMapping();
  
  console.log('\n✅ Prueba completa del sistema finalizada.');
  console.log('💡 Para probar manualmente:');
  console.log('   - executeManualMapping() - Ejecutar mapeo manual');
  console.log('   - validateAndToggleAutoMapping() - Activar/desactivar toggle');
  console.log('   - executeDirectMatrixToCanvasMapping() - Mapeo directo');
}

// Función de prueba para demostrar comportamiento corregido
export function testMatrixUpdateBehavior() {
  console.log('🧪 === PROBANDO COMPORTAMIENTO DE ACTUALIZACIÓN DE MATRIZ ===');
  
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  if (!autoMappingSwitch) {
    console.log('❌ No se encontró el switch de auto-mapping');
    return;
  }
  
  console.log(`🎛️ Estado actual del toggle: ${autoMappingSwitch.checked ? 'ACTIVADO' : 'DESACTIVADO'}`);
  
  // Simular actualización de matriz
  console.log('📝 Simulando actualización de matriz...');
  onRasciMatrixUpdated();
  
  console.log('✅ Prueba completada - Revisar logs para ver comportamiento');
  console.log(`🎛️ Estado final del toggle: ${autoMappingSwitch.checked ? 'ACTIVADO' : 'DESACTIVADO'}`);
}

// Función de prueba para simular errores de RASCI
export function testRasciValidationWithErrors() {
  console.log('🧪 === SIMULANDO ERRORES DE RASCI PARA PRUEBAS ===');
  
  // Simular datos de matriz con errores típicos
  const testMatrixData = {
    assignments: {
      'Tarea 1': {
        'Rol A': 'A',
        'Rol B': 'A'  // ERROR: Múltiples aprobadores
      },
      'Tarea 2': {
        'Rol A': 'S',
        'Rol B': 'C'  // ERROR: Sin responsable
      },
      'Tarea 3': {
        'Rol A': 'R',
        'Rol B': 'R',  // ERROR: Múltiples responsables
        'Rol C': 'A'
      }
    }
  };
  
  // Temporalmente sobrescribir los datos del manager para la prueba
  const originalData = rasciManager.rasciMatrixData;
  rasciManager.rasciMatrixData = testMatrixData;
  
  console.log('📋 Datos de prueba cargados con errores intencionados');
  console.log('🔍 Intentando activar toggle con errores...');
  
  // Probar la validación
  const validation = validateRasciCriticalRules();
  
  if (!validation.isValid) {
    console.log('✅ PRUEBA EXITOSA: El sistema detectó correctamente los errores');
    console.log('❌ Errores encontrados:');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  } else {
    console.log('❌ PRUEBA FALLÓ: El sistema NO detectó los errores');
  }
  
  // Restaurar datos originales
  rasciManager.rasciMatrixData = originalData;
  console.log('🔄 Datos originales restaurados');
  
  return validation;
}

// Función de prueba para matriz válida
export function testRasciValidationWithoutErrors() {
  console.log('🧪 === SIMULANDO MATRIZ RASCI VÁLIDA PARA PRUEBAS ===');
  
  // Simular datos de matriz correctos
  const testMatrixData = {
    assignments: {
      'Tarea 1': {
        'Rol A': 'R',  // Un responsable
        'Rol B': 'A',  // Un aprobador
        'Rol C': 'S'   // Soporte
      },
      'Tarea 2': {
        'Rol A': 'A',  // Un aprobador
        'Rol B': 'R',  // Un responsable
        'Rol C': 'C'   // Consultado
      }
    }
  };
  
  // Temporalmente sobrescribir los datos del manager para la prueba
  const originalData = rasciManager.rasciMatrixData;
  rasciManager.rasciMatrixData = testMatrixData;
  
  console.log('📋 Datos de prueba cargados SIN errores');
  console.log('🔍 Probando validación con matriz correcta...');
  
  // Probar la validación
  const validation = validateRasciCriticalRules();
  
  if (validation.isValid) {
    console.log('✅ PRUEBA EXITOSA: El sistema validó correctamente la matriz');
  } else {
    console.log('❌ PRUEBA FALLÓ: El sistema encontró errores donde no debería');
    validation.errors.forEach(error => console.log(`  - ${error}`));
  }
  
  // Restaurar datos originales
  rasciManager.rasciMatrixData = originalData;
  console.log('🔄 Datos originales restaurados');
  
  return validation;
}

// Export principal
export { rasciManager };
