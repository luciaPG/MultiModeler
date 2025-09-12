// RASCI Change Queue Manager
// Sistema de cola para almacenar y procesar cambios cuando el auto mapper está desactivado o en modo error

import { rasciManager } from './matrix-manager.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

class ChangeQueueManager {
  constructor() {
    this.pendingChanges = [];
    this.isProcessing = false;
    this.lastChangeTimestamp = null;
    this.debounceTimer = null;
    this.maxQueueSize = 100; // Límite para evitar memoria excesiva
  }

  /**
   * Agregar un cambio a la cola
   * @param {Object} change - Objeto que describe el cambio
   */
  addChange(change) {
    console.log('🔍 [QUEUE] Agregando cambio a la cola:', change);
    
    const timestamp = Date.now();
    const changeWithMeta = {
      ...change,
      timestamp,
      id: `${timestamp}_${Math.random().toString(36).substr(2, 9)}`
    };

    // Verificar si ya existe un cambio similar para la misma celda
    const existingIndex = this.pendingChanges.findIndex(existing => 
      existing.taskName === change.taskName && 
      existing.roleName === change.roleName
    );

    if (existingIndex !== -1) {
      // Reemplazar el cambio existente
      console.log(`🔄 [QUEUE] Reemplazando cambio existente en índice ${existingIndex}`);
      this.pendingChanges[existingIndex] = changeWithMeta;
    } else {
      // Agregar nuevo cambio
      console.log(`➕ [QUEUE] Agregando nuevo cambio a la cola`);
      this.pendingChanges.push(changeWithMeta);
    }

    // Limitar el tamaño de la cola
    if (this.pendingChanges.length > this.maxQueueSize) {
      this.pendingChanges = this.pendingChanges.slice(-this.maxQueueSize);
    }

    this.lastChangeTimestamp = timestamp;
    
    console.log(`📝 [QUEUE] Cambio agregado a la cola:`, {
      task: change.taskName,
      role: change.roleName,
      value: change.value,
      queueSize: this.pendingChanges.length,
      id: changeWithMeta.id
    });

    // Actualizar UI para mostrar que hay cambios pendientes
    this.updatePendingChangesIndicator();
  }

  /**
   * Procesar todos los cambios pendientes en la cola
   * @param {boolean} forceProcessing - Forzar procesamiento incluso si hay errores
   */
  async processPendingChanges(forceProcessing = false) {
    if (this.isProcessing) {
      console.log('⏳ [QUEUE] Ya se están procesando cambios...');
      return;
    }

    if (this.pendingChanges.length === 0) {
      console.log('✅ [QUEUE] No hay cambios pendientes para procesar');
      return;
    }

    console.log(`🔄 [QUEUE] Procesando ${this.pendingChanges.length} cambios pendientes...`);
    this.isProcessing = true;

    try {
      // Verificar si podemos procesar (auto mapper activado y sin errores)
      const canProcess = this.canProcessChanges(forceProcessing);
      
      if (!canProcess && !forceProcessing) {
        console.log('⏸️ [QUEUE] No se pueden procesar cambios - Auto mapper desactivado o hay errores');
        this.isProcessing = false;
        return;
      }

      // Aplicar todos los cambios pendientes a la matriz actual
      const changesApplied = this.applyPendingChangesToMatrix();
      
      if (changesApplied > 0) {
        console.log(`✅ [QUEUE] ${changesApplied} cambios aplicados a la matriz`);
        
        // Ejecutar mapeo si es posible
        if (canProcess || forceProcessing) {
          const mappingSuccess = await this.executeMapping();
          
          // Solo limpiar la cola si el mapeo fue exitoso
          if (mappingSuccess) {
            console.log('🧹 [QUEUE] Limpiando cola después de mapeo exitoso');
            this.clearPendingChanges();
          } else {
            console.log('⚠️ [QUEUE] Mapeo falló - cambios permanecen en cola');
          }
        } else {
          console.log('⏸️ [QUEUE] Mapeo no ejecutado - cambios permanecen en cola');
        }
      } else {
        // Si no se aplicaron cambios, limpiar la cola de todos modos
        this.clearPendingChanges();
      }
      
    } catch (error) {
      console.error('❌ [QUEUE] Error procesando cambios pendientes:', error);
    } finally {
      this.isProcessing = false;
      this.updatePendingChangesIndicator();
    }
  }

  /**
   * Verificar si se pueden procesar los cambios
   */
  canProcessChanges(forceProcessing = false) {
    if (forceProcessing) return true;

    // Verificar si el auto mapper está activado
    const autoMappingSwitch = document.getElementById('auto-mapping-switch');
    const isAutoMappingEnabled = autoMappingSwitch ? autoMappingSwitch.checked : false;
    
    if (!isAutoMappingEnabled) {
      console.log('🚫 [QUEUE] Auto mapper desactivado');
      return false;
    }

    // Verificar si hay errores de validación
    const sr = getServiceRegistry();
    if (sr && typeof sr.getFunction === 'function') {
      const validateRasciCriticalRules = sr.getFunction('validateRasciCriticalRules');
      if (typeof validateRasciCriticalRules === 'function') {
        const validation = validateRasciCriticalRules();
        if (validation.errors && validation.errors.length > 0) {
          console.log(`🚫 [QUEUE] ${validation.errors.length} errores detectados`);
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Aplicar cambios pendientes a la matriz actual
   */
  applyPendingChangesToMatrix() {
    let changesApplied = 0;

    this.pendingChanges.forEach(change => {
      try {
        if (!rasciManager.rasciMatrixData) {
          rasciManager.rasciMatrixData = {};
        }

        if (!rasciManager.rasciMatrixData[change.taskName]) {
          rasciManager.rasciMatrixData[change.taskName] = {};
        }

        // Aplicar el cambio
        if (change.value === null || change.value === undefined) {
          // Eliminar el valor
          delete rasciManager.rasciMatrixData[change.taskName][change.roleName];
          console.log(`✅ [QUEUE] Eliminado cambio: ${change.taskName}.${change.roleName}`);
        } else {
          // Establecer el valor
          rasciManager.rasciMatrixData[change.taskName][change.roleName] = change.value;
          console.log(`✅ [QUEUE] Aplicado cambio: ${change.taskName}.${change.roleName} = ${change.value}`);
        }
        changesApplied++;
      } catch (error) {
        console.error(`❌ [QUEUE] Error aplicando cambio ${change.taskName}.${change.roleName}:`, error);
      }
    });

    return changesApplied;
  }

  /**
   * Ejecutar el mapeo después de aplicar los cambios
   */
  async executeMapping() {
    try {
      console.log('🔍 [QUEUE] Verificando service registry...');
      const sr = getServiceRegistry();
      
      if (!sr) {
        console.error('❌ [QUEUE] Service registry no disponible');
        return false;
      }

      console.log('🔍 [QUEUE] Buscando función executeRasciToRalphMapping...');
      const executeRasciToRalphMapping = sr.getFunction('executeRasciToRalphMapping');
      
      if (!executeRasciToRalphMapping) {
        console.error('❌ [QUEUE] Función executeRasciToRalphMapping no encontrada en service registry');
        return false;
      }

      console.log('🔄 [QUEUE] Ejecutando mapeo después de aplicar cambios...');
      console.log('🔍 [QUEUE] Datos de matriz después de aplicar cambios:', JSON.stringify(rasciManager.rasciMatrixData, null, 2));
      
      await executeRasciToRalphMapping(true, true); // Forzar ejecución con await y skip queue processing
      
      console.log('✅ [QUEUE] Mapeo ejecutado exitosamente');
      return true;
    } catch (error) {
      console.error('❌ [QUEUE] Error ejecutando mapeo:', error);
      return false;
    }
  }

  /**
   * Limpiar todos los cambios pendientes
   */
  clearPendingChanges() {
    const clearedCount = this.pendingChanges.length;
    this.pendingChanges = [];
    console.log(`🧹 [QUEUE] ${clearedCount} cambios pendientes eliminados de la cola`);
    this.updatePendingChangesIndicator();
  }

  /**
   * Obtener información sobre la cola de cambios
   */
  getQueueInfo() {
    return {
      pendingCount: this.pendingChanges.length,
      isProcessing: this.isProcessing,
      lastChangeTimestamp: this.lastChangeTimestamp,
      canProcess: this.canProcessChanges()
    };
  }

  /**
   * Actualizar el indicador visual de cambios pendientes
   */
  updatePendingChangesIndicator() {
    const indicator = document.getElementById('pending-changes-indicator');
    const count = this.pendingChanges.length;
    
    console.log(`🔍 [QUEUE] Actualizando indicador: ${count} cambios pendientes`);
    
    if (indicator) {
      if (count > 0) {
        indicator.style.display = 'inline-block';
        indicator.textContent = count.toString();
        indicator.title = `${count} cambios pendientes en cola`;
        console.log(`✅ [QUEUE] Indicador mostrado con ${count} cambios`);
      } else {
        indicator.style.display = 'none';
        console.log(`✅ [QUEUE] Indicador ocultado - sin cambios pendientes`);
      }
    } else {
      console.warn('⚠️ [QUEUE] Elemento pending-changes-indicator no encontrado');
    }

    // Actualizar el botón de mapeo manual si existe
    const manualBtn = document.getElementById('manual-mapping-btn');
    if (manualBtn) {
      if (count > 0) {
        manualBtn.innerHTML = `<i class="fas fa-magic"></i> Ejecutar Mapeo Manual (${count} pendientes)`;
        manualBtn.style.backgroundColor = '#ff9800';
        manualBtn.style.color = 'white';
        manualBtn.style.display = 'block';
      } else {
        manualBtn.innerHTML = `<i class="fas fa-magic"></i> Ejecutar Mapeo Manual`;
        manualBtn.style.backgroundColor = '';
        manualBtn.style.color = '';
        // No cambiar display aquí, dejarlo como está
      }
    }
  }

  /**
   * Procesar cambios con debounce para evitar procesamiento excesivo
   */
  processWithDebounce(delay = 500) {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = setTimeout(() => {
      this.processPendingChanges();
    }, delay);
  }

  /**
   * Función de debug para verificar el estado del sistema
   */
  debugStatus() {
    console.log('🔍 [QUEUE DEBUG] Estado del sistema:');
    console.log('  - Cambios pendientes:', this.pendingChanges.length);
    console.log('  - Procesando:', this.isProcessing);
    console.log('  - Último cambio:', this.lastChangeTimestamp);
    console.log('  - Auto mapper activado:', this.canProcessChanges());
    console.log('  - Datos de matriz:', rasciManager.rasciMatrixData);
    console.log('  - Cambios en cola:', this.pendingChanges);
  }
}

// Crear instancia global
const changeQueueManager = new ChangeQueueManager();

// Exportar funciones para uso externo
export function addChangeToQueue(taskName, roleName, value) {
  changeQueueManager.addChange({
    taskName,
    roleName,
    value,
    type: 'matrix_cell_change'
  });
}

export function processPendingChanges(forceProcessing = false) {
  return changeQueueManager.processPendingChanges(forceProcessing);
}

export function getQueueInfo() {
  return changeQueueManager.getQueueInfo();
}

export function clearPendingChanges() {
  changeQueueManager.clearPendingChanges();
}

export function debugQueueStatus() {
  changeQueueManager.debugStatus();
}

export { changeQueueManager };

// Función para registrar todas las funciones globalmente
function registerGlobalFunctions() {
  if (typeof globalThis !== 'undefined') {
    globalThis.debugQueueStatus = debugQueueStatus;
    globalThis.processPendingChanges = processPendingChanges;
    globalThis.getQueueInfo = getQueueInfo;
    globalThis.addChangeToQueue = addChangeToQueue;
    globalThis.clearPendingChanges = clearPendingChanges;
    console.log('✅ [QUEUE] Funciones de debug registradas globalmente');
  }
}

// Registrar inmediatamente
registerGlobalFunctions();

// Registrar en service registry
const sr = getServiceRegistry();
if (sr) {
  sr.registerFunction('addChangeToQueue', addChangeToQueue);
  sr.registerFunction('processPendingChanges', processPendingChanges);
  sr.registerFunction('getQueueInfo', getQueueInfo);
  sr.registerFunction('clearPendingChanges', clearPendingChanges);
  sr.registerFunction('debugQueueStatus', debugQueueStatus);
  
  console.log('✅ [QUEUE] ChangeQueueManager registrado en service registry');
}

// También registrar con un pequeño delay para asegurar que esté disponible
setTimeout(registerGlobalFunctions, 1000);
