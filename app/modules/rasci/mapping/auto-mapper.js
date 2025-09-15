// RASCI Mapping Auto - Clean Version
// Automatic mapping functionality

import { executeSimpleRasciMapping } from './main-mapper.js';
import { rasciManager, validateRasciCriticalRules } from '../core/matrix-manager.js';
import { processPendingChanges } from '../core/change-queue-manager.js';

// Función unificada que usa la misma lógica para manual y automático
function executeAutoMappingWithCleanup(modeler, matrix) {
  // La función executeSimpleRasciMapping ya incluye limpieza
  return executeSimpleRasciMapping(modeler, matrix);
}

// Define as local variable first
const rasciAutoMapping = {
  enabled: false,
  debounceTimer: null,
  smartTimer: null,
  
  enable() {
    this.enabled = true;
    if (rasciManager.getBpmnModeler() && rasciManager.rasciMatrixData && Object.keys(rasciManager.rasciMatrixData).length > 0) {
      this.triggerMapping();
    }
  },
  
  disable() {
    this.enabled = false;
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
      this.smartTimer = null;
    }
  },
  
  toggle() {
    if (this.enabled) {
      this.disable();
    } else {
      this.enable();
    }
    return this.enabled;
  },
  
  triggerMapping() {
    if (!this.enabled) {
      return;
    }
    
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }
    
    this.debounceTimer = setTimeout(() => {
      onRasciMatrixUpdated();
    }, 200);
  },
  
  triggerSmartMapping() {
    if (!this.enabled) return;
    
    if (this.smartTimer) {
      clearTimeout(this.smartTimer);
    }
    
    this.smartTimer = setTimeout(() => {
      if (rasciManager.getBpmnModeler() && rasciManager.rasciMatrixData) {
        try {
          executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
        } catch (error) {
          // Handle error silently
        }
      }
    }, 200);
  }
};

// Define as local function first
function onRasciMatrixUpdated() {
  console.log('📊 [AUTO-MAPPER] Matriz RASCI actualizada - Validando errores');
  
  // VALIDAR ERRORES y NO MAPEAR si existen (dejar que matrix-manager haga el mapeo acumulado)
  const validation = validateRasciCriticalRules();
  if (validation.errors && validation.errors.length > 0) {
    console.log(`🚫 [AUTO-MAPPER] ${validation.errors.length} ERRORES DETECTADOS - No se mapea ahora (buffer)`);
    
    // Forzar toggle a desactivado
    const autoMappingSwitch = document.getElementById('auto-mapping-switch');
    if (autoMappingSwitch) {
      autoMappingSwitch.checked = false;
      autoMappingSwitch.disabled = true;
    }
    
    // Mostrar botón manual
    const manualBtn = document.getElementById('manual-mapping-btn');
    if (manualBtn) {
      manualBtn.style.display = 'block';
      manualBtn.style.backgroundColor = '#ff6b6b';
      manualBtn.style.color = 'white';
      manualBtn.style.border = '2px solid #ff4757';
      manualBtn.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Mapeo Manual (${validation.errors.length} Errores)`;
    }
    
    console.log('📋 Errores encontrados:');
    validation.errors.forEach(error => console.log(`  ❌ ${error}`));
    console.log('⏸️ [AUTO-MAPPER] Cambios quedarán en buffer hasta que se corrijan los errores');
    return;
  }

  // SI NO HAY ERRORES, permitir flujo normal de auto-mapping (según estado del toggle)
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const isAutoMappingEnabled = autoMappingSwitch ? autoMappingSwitch.checked : false;
  if (!isAutoMappingEnabled) {
    console.log('🚫 [AUTO-MAPPER] Auto-mapping desactivado en HTML - No se ejecuta mapeo');
    return;
  }
  if (!rasciAutoMapping || !rasciAutoMapping.enabled) {
    console.log('🚫 [AUTO-MAPPER] Auto-mapping desactivado en sistema - No se ejecuta mapeo');
    return;
  }
  if (!rasciManager.getBpmnModeler()) {
    console.log('🚫 [AUTO-MAPPER] No hay modeler BPMN disponible');
    return;
  }
  if (!rasciManager.rasciMatrixData || Object.keys(rasciManager.rasciMatrixData).length === 0) {
    console.log('🚫 [AUTO-MAPPER] No hay datos de matriz RASCI');
    return;
  }
  
  console.log('✅ [AUTO-MAPPER] Sin errores y toggle activado - Ejecutando mapeo...');
  
  let hasActiveResponsibilities = false;
  Object.keys(rasciManager.rasciMatrixData).forEach(taskName => {
    const taskRoles = rasciManager.rasciMatrixData[taskName];
    Object.keys(taskRoles).forEach(roleName => {
      const responsibility = taskRoles[roleName];
      if (responsibility && responsibility !== '-' && responsibility !== '') {
        hasActiveResponsibilities = true;
      }
    });
  });
  
  if (!hasActiveResponsibilities) {
    try {
      executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
    } catch (error) {}
    return;
  }
  
  try {
    if (rasciAutoMapping.debounceTimer) {
      clearTimeout(rasciAutoMapping.debounceTimer);
    }
    executeAutoMappingWithCleanup(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
  } catch (error) {
    setTimeout(() => {
      try { syncRasciConnections(); } catch (_) {}
    }, 500);
  }
}

// Define as local function first
async function executeRasciToRalphMapping(forceExecution = false, skipQueueProcessing = false) {
  console.log('🚀 [AUTO-MAPPER] === INICIANDO executeRasciToRalphMapping ===');
  console.log('🔍 [AUTO-MAPPER] Parámetros recibidos:', { forceExecution, skipQueueProcessing });
  
  // Verificaciones básicas
  if (!rasciManager) {
    console.log('🚫 [AUTO-MAPPER] SALIENDO - rasciManager no disponible');
    return;
  }
  
  if (!rasciManager.getBpmnModeler()) {
    console.log('🚫 [AUTO-MAPPER] SALIENDO - No hay modeler BPMN disponible');
    return;
  }

  if (!rasciManager.rasciMatrixData || Object.keys(rasciManager.rasciMatrixData).length === 0) {
    console.log('🚫 [AUTO-MAPPER] SALIENDO - No hay datos de matriz RASCI');
    return;
  }
  
  // Solo verificar el toggle si no se fuerza la ejecución
  if (!forceExecution) {
    const autoMappingSwitch = document.getElementById('auto-mapping-switch');
    const isAutoMappingEnabled = autoMappingSwitch ? autoMappingSwitch.checked : false;
    
    if (!isAutoMappingEnabled) {
      console.log('🚫 [AUTO-MAPPER] SALIENDO - Mapeo automático deshabilitado');
      return;
    }
  }
  
  console.log('🔄 [AUTO-MAPPER] Ejecutando mapeo RASCI a RALph...');
  
  try {
    // Solo procesar cambios pendientes si no se especifica skipQueueProcessing
    if (!skipQueueProcessing) {
      console.log('🔄 [AUTO-MAPPER] Procesando cambios pendientes de la cola...');
      await processPendingChanges(forceExecution);
    } else {
      console.log('⏭️ [AUTO-MAPPER] Saltando procesamiento de cola (skipQueueProcessing=true)');
    }
    
    console.log('🔍 [AUTO-MAPPER] Datos de matriz que se van a mapear:', JSON.stringify(rasciManager.rasciMatrixData, null, 2));
    console.log('🔍 [AUTO-MAPPER] Llamando a executeSimpleRasciMapping...');
    
    // Llamar a la función que funciona bien
    const results = executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
    console.log('🔍 [AUTO-MAPPER] Resultado de executeSimpleRasciMapping:', results);
    
    if (results && results.error === 'Reglas RASCI no cumplidas') {
      console.log('⚠️ [AUTO-MAPPER] Mapeo cancelado - Corrige los errores RASCI primero');
      return results;
    }
    
    console.log('✅ [AUTO-MAPPER] Mapeo RASCI a RALph ejecutado exitosamente. Resultados:', results);
    return results;
    
  } catch (error) {
    console.error('❌ [AUTO-MAPPER] Error ejecutando mapeo RASCI a RALph:', error);
    console.error('❌ [AUTO-MAPPER] Stack trace:', error.stack);
    return { error: error.message };
  }
}

// Define as local function first
function syncRasciConnections() {
  if (!rasciManager.getBpmnModeler()) {
    return;
  }
  
  if (!rasciManager.rasciMatrixData) {
    return;
  }
  
  try {
    executeSimpleRasciMapping(rasciManager.getBpmnModeler(), rasciManager.rasciMatrixData);
  } catch (error) {
    // Handle error silently
  }
}

// Función para mapeo manual que procesa cambios pendientes
async function executeManualRasciMapping() {
  console.log('🔄 Ejecutando mapeo manual RASCI a RALph...');
  
  try {
    // Procesar cambios pendientes con forzado
    await processPendingChanges(true);
    console.log('✅ Mapeo manual ejecutado exitosamente');
  } catch (error) {
    console.error('❌ Error ejecutando mapeo manual:', error);
  }
}

// Export as named exports
export {
  executeAutoMappingWithCleanup,
  rasciAutoMapping,
  onRasciMatrixUpdated,
  executeRasciToRalphMapping,
  executeManualRasciMapping,
  syncRasciConnections
};

// Registrar en service registry
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

const sr = getServiceRegistry();
if (sr) {
  // Optimización: Logs eliminados para mejorar rendimiento
  // console.log('🔄 [AUTO-MAPPER] Re-registrando funciones en service registry...');
  // console.log('🔍 [AUTO-MAPPER] Función executeRasciToRalphMapping antes del registro:', typeof executeRasciToRalphMapping);
  // console.log('🔍 [AUTO-MAPPER] Código de la función:', executeRasciToRalphMapping.toString().substring(0, 100) + '...');
  
  sr.registerFunction('executeRasciToRalphMapping', executeRasciToRalphMapping);
  sr.registerFunction('executeManualRasciMapping', executeManualRasciMapping);
  
  // También registrar globalmente para acceso directo desde consola
  if (typeof globalThis !== 'undefined') {
    globalThis.executeRasciToRalphMapping = executeRasciToRalphMapping;
    globalThis.executeManualRasciMapping = executeManualRasciMapping;
  }
  
  // Verificar que se registró correctamente
  const registeredFunction = sr.getFunction('executeRasciToRalphMapping');
  // Optimización: Logs eliminados para mejorar rendimiento
  // console.log('🔍 [AUTO-MAPPER] Función registrada en service registry:', typeof registeredFunction);
  // console.log('🔍 [AUTO-MAPPER] Código de la función registrada:', registeredFunction ? registeredFunction.toString().substring(0, 100) + '...' : 'null');
  
  // console.log('✅ executeRasciToRalphMapping y executeManualRasciMapping registradas en service registry y globalThis desde auto-mapper');
}

// Para compatibilidad con el sistema, usar el rasciManager como puente
// En lugar de usar window, integramos directamente con el manager 