/**
 * Window Compatibility Adapter
 * Permite migrar gradualmente desde window hacia el ServiceRegistry
 * manteniendo compatibilidad con código existente
 */

import { getServiceRegistry } from './ServiceRegistry.js';
import { getEventBus } from './event-bus.js';

class WindowCompatibilityAdapter {
  constructor() {
    this.eventBus = getEventBus();
    this.serviceRegistry = getServiceRegistry();
    this.migratedFunctions = new Set();
    this.originalWindowFunctions = new Map();
    this.setupEventListeners();
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Escuchar cuando se registran nuevos servicios
    this.eventBus.subscribe('service.registered', (event) => {
      if (event.options && event.options.alias) {
        this.migratedFunctions.add(event.options.alias);
      }
    });
  }

  /**
   * Migrar una función específica de window al ServiceRegistry
   * @param {string} functionName - Nombre de la función
   * @param {Function} functionImpl - Implementación de la función
   * @param {Object} options - Opciones adicionales
   */
  migrateFunction(functionName, functionImpl, options = {}) {
    // Guardar la función original si existe
    if (window[functionName] && !this.originalWindowFunctions.has(functionName)) {
      this.originalWindowFunctions.set(functionName, window[functionName]);
    }

    // Registrar en el ServiceRegistry
    this.serviceRegistry.registerFunction(functionName, functionImpl, {
      alias: functionName,
      migrated: true,
      ...options
    });

    // Reemplazar en window con un wrapper que use el ServiceRegistry
    window[functionName] = (...args) => {
      try {
        return this.serviceRegistry.call(functionName, ...args);
      } catch (error) {
        console.error(`Error ejecutando función migrada ${functionName}:`, error);
        
        // Fallback a la función original si está disponible
        const original = this.originalWindowFunctions.get(functionName);
        if (original) {
          console.warn(`Fallback a función original de window: ${functionName}`);
          return original(...args);
        }
        
        throw error;
      }
    };

    this.migratedFunctions.add(functionName);
    
  }

  /**
   * Migrar múltiples funciones de una vez
   * @param {Object} functions - Objeto con funciones a migrar
   */
  migrateFunctions(functions) {
    Object.entries(functions).forEach(([name, func]) => {
      this.migrateFunction(name, func);
    });
  }

  /**
   * Migrar automáticamente funciones comunes de RASCI
   */
  migrateRasciFunctions() {
    const rasciFunctions = {
      'updateMatrixFromDiagram': () => this.serviceRegistry.executeFunction('updateMatrixFromDiagram'),
      'detectRalphRolesFromCanvas': () => this.serviceRegistry.executeFunction('detectRalphRolesFromCanvas'),
      'forceDetectRalphRoles': () => this.serviceRegistry.executeFunction('forceDetectRalphRoles'),
      'reloadRasciMatrix': () => this.serviceRegistry.executeFunction('reloadRasciMatrix'),
      'manualReloadRasciMatrix': () => this.serviceRegistry.executeFunction('manualReloadRasciMatrix'),
      'forceDetectNewTasks': () => this.serviceRegistry.executeFunction('forceDetectNewTasks'),
      'forceDetectAndValidate': () => this.serviceRegistry.executeFunction('forceDetectAndValidate'),
      'diagnoseRasciState': () => this.serviceRegistry.executeFunction('diagnoseRasciState'),
      'forceFullSync': () => this.serviceRegistry.executeFunction('forceFullSync'),
      'repairRasciRalphMapping': () => this.serviceRegistry.executeFunction('repairRasciRalphMapping')
    };

    this.migrateFunctions(rasciFunctions);
  }

  /**
   * Migrar automáticamente funciones comunes de PPI
   */
  migratePpiFunctions() {
    const ppiFunctions = {
      'showPPIModal': () => this.serviceRegistry.executeFunction('showPPIModal'),
      'createPPI': () => this.serviceRegistry.executeFunction('createPPI'),
      'editPPI': () => this.serviceRegistry.executeFunction('editPPI'),
      'deletePPI': () => this.serviceRegistry.executeFunction('deletePPI'),
      'refreshPPIList': () => this.serviceRegistry.executeFunction('refreshPPIList')
    };

    this.migrateFunctions(ppiFunctions);
  }

  /**
   * Migrar automáticamente funciones comunes de UI
   */
  migrateUIFunctions() {
    const uiFunctions = {
      'showFileNameModal': () => this.serviceRegistry.executeFunction('showFileNameModal'),
      'showPanelSelector': () => this.serviceRegistry.executeFunction('showPanelSelector'),
      'closePanelSelector': () => this.serviceRegistry.executeFunction('closePanelSelector'),
      'resetStorage': () => this.serviceRegistry.executeFunction('resetStorage'),
      'clearStorage': () => this.serviceRegistry.executeFunction('clearStorage')
    };

    this.migrateFunctions(uiFunctions);
  }

  /**
   * Restaurar una función a su implementación original de window
   * @param {string} functionName - Nombre de la función
   */
  restoreOriginalFunction(functionName) {
    const original = this.originalWindowFunctions.get(functionName);
    if (original) {
      window[functionName] = original;
      this.migratedFunctions.delete(functionName);
      console.log(`🔄 Función restaurada a original: ${functionName}`);
    }
  }

  /**
   * Verificar si una función está migrada
   * @param {string} functionName - Nombre de la función
   * @returns {boolean}
   */
  isMigrated(functionName) {
    return this.migratedFunctions.has(functionName);
  }

  /**
   * Obtener estadísticas de migración
   * @returns {Object}
   */
  getMigrationStats() {
    return {
      migratedCount: this.migratedFunctions.size,
      originalCount: this.originalWindowFunctions.size,
      migratedFunctions: Array.from(this.migratedFunctions),
      originalFunctions: Array.from(this.originalWindowFunctions.keys())
    };
  }

  /**
   * Debug: Mostrar estado de migración
   */
  debug() {
    console.log('=== Window Compatibility Adapter Debug ===');
    console.log('Migration Stats:', this.getMigrationStats());
    
    console.log('\nMigrated Functions:');
    this.migratedFunctions.forEach(funcName => {
      console.log(`  ✅ ${funcName}`);
    });
    
    console.log('\nOriginal Functions:');
    this.originalWindowFunctions.forEach((func, name) => {
      console.log(`  📦 ${name}`);
    });
  }

  /**
   * Limpiar todas las migraciones
   */
  clear() {
    this.migratedFunctions.forEach(funcName => {
      this.restoreOriginalFunction(funcName);
    });
    
    this.migratedFunctions.clear();
    this.originalWindowFunctions.clear();
    
    console.log('🧹 Todas las migraciones limpiadas');
  }
}

// Crear instancia global del adaptador
const windowCompatibilityAdapter = new WindowCompatibilityAdapter();

// Exportar para uso en módulos
export default windowCompatibilityAdapter;

// También exportar la clase para compatibilidad
export { WindowCompatibilityAdapter };

