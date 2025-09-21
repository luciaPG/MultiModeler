/**
 * LocalStorageIntegration - Integración del nuevo sistema de localStorage
 * 
 * Este archivo se encarga de:
 * - Inicializar el LocalStorageManager
 * - Proporcionar métodos de conveniencia para el resto de la aplicación
 * - Manejar la migración desde el sistema anterior
 */

import LocalStorageManager from './local-storage-manager.js';
import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';

class LocalStorageIntegration {
  constructor() {
    this.storageManager = LocalStorageManager;
    this.initialized = false;
    this.restored = false;
    this._postRestoreCooldownUntil = null;
    this.init();
  }

  init() {
    if (this.initialized) return;
    
    console.log('🔧 Inicializando LocalStorageIntegration...');
    
    // Registrar en el ServiceRegistry
    const registry = getServiceRegistry();
    if (registry) {
      registry.register('LocalStorageIntegration', this);
      registry.register('LocalStorageManager', this.storageManager);
      console.log('✅ LocalStorageIntegration registrado en ServiceRegistry');
      console.log('✅ LocalStorageManager registrado');
      
      // Inicializar AutoSaveManager
      this.storageManager.initializeAutoSaveManager();
    }
    
    // Exponer métodos de conveniencia en window para debugging
    this.exposeDebugAPI();
    
    this.initialized = true;
    console.log('✅ LocalStorageIntegration inicializado');
  }

  exposeDebugAPI() {
    // API de debug disponible a través del ServiceRegistry
    console.log('🔧 LocalStorageIntegration registrado en ServiceRegistry');
    
    // Exponer métodos de debug en window para fácil acceso desde consola
    if (typeof window !== 'undefined') {
      window.debugLocalStorage = {
        // Información general
        getInfo: () => this.storageManager.getStorageInfo(),
        checkRelationships: () => this.storageManager.debugCheckRelationships(),
        
        // Restauración manual
        restoreRelationships: () => this.storageManager.debugRestoreRelationships(),
        
        // Métodos de conveniencia
        save: () => this.saveProject(),
        load: () => this.loadProject(),
        clear: () => this.clearSavedData(),
        
        // Verificar estado
        hasData: () => this.hasSavedData(),
        isRestored: () => this.isRestored(),
        
        // Help
        help: () => {
          console.log('🔧 LocalStorage Debug API disponible:');
          console.log('  debugLocalStorage.getInfo() - Información del almacenamiento');
          console.log('  debugLocalStorage.checkRelationships() - Verificar relaciones guardadas');
          console.log('  debugLocalStorage.restoreRelationships() - Restaurar relaciones manualmente');
          console.log('  debugLocalStorage.save() - Guardar proyecto');
          console.log('  debugLocalStorage.load() - Cargar proyecto');
          console.log('  debugLocalStorage.clear() - Limpiar datos guardados');
          console.log('  debugLocalStorage.hasData() - Verificar si hay datos');
          console.log('  debugLocalStorage.isRestored() - Verificar si se restauró');
          console.log('  debugLocalStorage.help() - Mostrar esta ayuda');
        }
      };
      
      console.log('🔧 API de debug expuesta en window.debugLocalStorage');
      console.log('💡 Usa debugLocalStorage.help() para ver todos los métodos disponibles');
    }
  }

  // ==================== MÉTODOS DE CONVENIENCIA ====================

  /**
   * Guarda el proyecto completo
   */
  async saveProject() {
    return await this.storageManager.saveProject();
  }

  /**
   * Carga el proyecto completo
   */
  async loadProject() {
    const result = await this.storageManager.loadProject();
    
    // Si la carga fue exitosa, configurar cooldown para evitar guardados inmediatos
    if (result && result.success) {
      this._postRestoreCooldownUntil = Date.now() + 2000; // 2 segundos de cooldown
      console.log('⏰ Cooldown configurado después de restauración');
    }
    
    return result;
  }

  /**
   * Verifica si hay datos guardados
   */
  hasSavedData() {
    return this.storageManager.hasSavedData();
  }

  /**
   * Elimina los datos guardados
   */
  clearSavedData() {
    return this.storageManager.clearSavedData();
  }

  /**
   * Obtiene información sobre los datos guardados
   */
  getStorageInfo() {
    return this.storageManager.getStorageInfo();
  }

  /**
   * Marca que los datos han sido restaurados
   */
  markRestored() {
    this.restored = true;
    this._postRestoreCooldownUntil = null; // Limpiar cooldown
    console.log('✅ Estado marcado como restaurado');
  }

  /**
   * Verifica si los datos han sido restaurados
   */
  isRestored() {
    return this.restored || false;
  }

  /**
   * Limpia el estado de restauración y cooldown (para nuevo diagrama)
   */
  resetRestoreState() {
    this.restored = false;
    this._postRestoreCooldownUntil = null;
    console.log('🔄 Estado de restauración limpiado');
  }

  // ==================== MÉTODOS DE MIGRACIÓN ====================

  /**
   * Migra datos del sistema anterior si es necesario
   */
  async migrateFromOldSystem() {
    try {
      console.log('🔄 Verificando migración desde sistema anterior...');
      
      // Verificar si ya tenemos datos del nuevo sistema
      if (this.storageManager.hasSavedData()) {
        console.log('✅ Ya existen datos del nuevo sistema, no se requiere migración');
        return { success: true, migrated: false };
      }

      // Buscar datos del sistema anterior
      const oldData = this.findOldSystemData();
      if (!oldData) {
        console.log('ℹ️ No se encontraron datos del sistema anterior');
        return { success: true, migrated: false };
      }

      console.log('📦 Datos del sistema anterior encontrados, iniciando migración...');
      
      // Migrar datos al nuevo formato
      const migratedData = await this.convertOldDataToNewFormat(oldData);
      
      // Guardar datos migrados
      const saveResult = await this.storageManager.saveToLocalStorage(migratedData);
      
      if (saveResult) {
        console.log('✅ Migración completada exitosamente');
        return { success: true, migrated: true, data: migratedData };
      } else {
        throw new Error('Error guardando datos migrados');
      }

    } catch (error) {
      console.error('❌ Error en migración:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Busca datos del sistema anterior en localStorage
   */
  findOldSystemData() {
    const oldKeys = [
      'draft:multinotation',
      'ppinotElements',
      'rasci_matrix_data',
      'rasci_roles_data',
      'bpmnDiagramData'
    ];

    const foundData = {};
    let hasAnyData = false;

    for (const key of oldKeys) {
      try {
        const data = localStorage.getItem(key);
        if (data) {
          foundData[key] = JSON.parse(data);
          hasAnyData = true;
          console.log(`📦 Datos encontrados en ${key}:`, data.length, 'caracteres');
        }
      } catch (error) {
        console.warn(`Error leyendo ${key}:`, error);
      }
    }

    return hasAnyData ? foundData : null;
  }

  /**
   * Convierte datos del sistema anterior al nuevo formato
   */
  async convertOldDataToNewFormat(oldData) {
    console.log('🔄 Convirtiendo datos del sistema anterior...');

    const newData = {
      version: '2.0.0',
      saveDate: new Date().toISOString(),
      bpmn: null,
      ppi: { indicators: [] },
      rasci: { roles: [], matrix: {} },
      ralph: { elements: [] }
    };

    // Migrar BPMN
    if (oldData['draft:multinotation']) {
      const draftData = oldData['draft:multinotation'];
      if (draftData.data && draftData.data.bpmn) {
        newData.bpmn = draftData.data.bpmn;
        console.log('✅ BPMN migrado desde draft:multinotation');
      }
    }

    // Migrar PPIs
    if (oldData['ppinotElements']) {
      newData.ppi.indicators = oldData['ppinotElements'];
      console.log(`✅ ${newData.ppi.indicators.length} PPIs migrados`);
    }

    // Migrar RASCI
    if (oldData['rasci_matrix_data']) {
      newData.rasci.matrix = oldData['rasci_matrix_data'];
      console.log(`✅ Matriz RASCI migrada: ${Object.keys(newData.rasci.matrix).length} tareas`);
    }

    if (oldData['rasci_roles_data']) {
      newData.rasci.roles = oldData['rasci_roles_data'];
      console.log(`✅ ${newData.rasci.roles.length} roles RASCI migrados`);
    }

    console.log('✅ Conversión de datos completada');
    return newData;
  }

  // ==================== MÉTODOS DE UTILIDAD ====================

  /**
   * Limpia datos del sistema anterior después de la migración
   */
  clearOldSystemData() {
    const oldKeys = [
      'draft:multinotation',
      'ppinotElements',
      'ppinotRelationships',
      'rasci_matrix_data',
      'rasci_roles_data',
      'rasci_roles_with_ids',
      'bpmnDiagramData'
    ];

    let cleanedCount = 0;
    for (const key of oldKeys) {
      try {
        if (localStorage.getItem(key)) {
          localStorage.removeItem(key);
          cleanedCount++;
        }
      } catch (error) {
        console.warn(`Error eliminando ${key}:`, error);
      }
    }

    console.log(`🗑️ ${cleanedCount} claves del sistema anterior eliminadas`);
    return cleanedCount;
  }

  /**
   * Obtiene estadísticas del almacenamiento
   */
  getStorageStats() {
    const stats = {
      totalKeys: 0,
      newSystemKeys: 0,
      oldSystemKeys: 0,
      totalSize: 0
    };

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        
        if (key && value) {
          stats.totalKeys++;
          stats.totalSize += key.length + value.length;
          
          if (key === 'multinotation_project_data') {
            stats.newSystemKeys++;
          } else if (key.includes('draft:') || key.includes('ppinot') || key.includes('rasci')) {
            stats.oldSystemKeys++;
          }
        }
      }
    } catch (error) {
      console.warn('Error calculando estadísticas:', error);
    }

    return stats;
  }
}

// Crear instancia singleton
const localStorageIntegration = new LocalStorageIntegration();

// Exportar tanto la clase como la instancia
export { LocalStorageIntegration };
export default localStorageIntegration;
