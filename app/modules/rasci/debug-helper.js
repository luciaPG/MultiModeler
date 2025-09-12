// RASCI Debug Helper
// Utilidad para acceder a funciones de debug del sistema de cola

import { 
  debugQueueStatus as queueDebugStatus,
  processPendingChanges as queueProcessPendingChanges,
  getQueueInfo as queueGetQueueInfo,
  addChangeToQueue as queueAddChangeToQueue,
  clearPendingChanges as queueClearPendingChanges
} from './core/change-queue-manager.js';

import { executeManualRasciMapping as mapperExecuteManual } from './mapping/auto-mapper.js';

/**
 * Función de debug que accede directamente al change-queue-manager
 */
export function debugQueueStatus() {
  try {
    queueDebugStatus();
  } catch (error) {
    console.error('❌ Error ejecutando debugQueueStatus:', error);
  }
}

/**
 * Procesar cambios pendientes
 */
export async function processPendingChanges(forceProcessing = false) {
  try {
    return await queueProcessPendingChanges(forceProcessing);
  } catch (error) {
    console.error('❌ Error ejecutando processPendingChanges:', error);
  }
}

/**
 * Obtener información de la cola
 */
export function getQueueInfo() {
  try {
    return queueGetQueueInfo();
  } catch (error) {
    console.error('❌ Error ejecutando getQueueInfo:', error);
  }
}

/**
 * Agregar cambio a la cola
 */
export function addChangeToQueue(taskName, roleName, value) {
  try {
    return queueAddChangeToQueue(taskName, roleName, value);
  } catch (error) {
    console.error('❌ Error ejecutando addChangeToQueue:', error);
  }
}

/**
 * Limpiar cambios pendientes
 */
export function clearPendingChanges() {
  try {
    return queueClearPendingChanges();
  } catch (error) {
    console.error('❌ Error ejecutando clearPendingChanges:', error);
  }
}

/**
 * Ejecutar mapeo manual
 */
export async function executeManualRasciMapping() {
  try {
    return await mapperExecuteManual();
  } catch (error) {
    console.error('❌ Error ejecutando executeManualRasciMapping:', error);
  }
}

// El registro global se hace desde change-queue-manager.js para evitar duplicados
console.log('✅ [DEBUG-HELPER] Debug helper cargado - funciones disponibles a través de imports');
