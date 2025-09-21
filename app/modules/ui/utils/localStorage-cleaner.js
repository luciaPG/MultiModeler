/**
 * LocalStorage Cleaner
 * 
 * Limpia todas las claves de localStorage obsoletas, manteniendo solo autosave
 */

export class LocalStorageCleaner {
  
  static cleanAllObsoleteKeys() {
    console.log('🧹 Iniciando limpieza completa de localStorage...');
    
    // Lista de TODAS las claves obsoletas que deben eliminarse
    const obsoleteKeys = [
      // Claves de sistemas eliminados
      'ppinotElements',
      'ppinotRelationships', 
      'ppinotDiagram',
      'ppinotIdMap',
      'ppinot:relationships',
      'ppinot:elements',
      'bpmnParentChildRelations',
      'ppiRelationships',
      
      // Settings obsoletos
      'ppiSettings',
      'rasciSettings', 
      'ralphSettings',
      'bpmnCanvasState',
      
      // Elementos obsoletos
      'bpmnRALPHElements',
      'ppis',
      'PPINOT_elements',
      
      // Datos temporales obsoletos
      'ppinotPendingRestore',
      'ppinotProcessedElements',
      'ppinotTempData',
      'previousRasciMatrixData',
      
      // Cache obsoleto
      'bpmnDiagram',
      'bpmnDiagramTimestamp',
      
      // Configuraciones obsoletas
      'activePanels',
      'panelLayout', 
      'panelOrder',
      
      // Backup obsoleto
      'storageBackup',
      'lastSaved',
      
      // Testing keys
      'real-test-data',
      'testKey',
      'transient',
      'customKey',
      'legacyKey',
      'projectKey',
      'foo'
    ];
    
    let removedCount = 0;
    
    obsoleteKeys.forEach(key => {
      try {
        if (localStorage.getItem(key) !== null) {
          localStorage.removeItem(key);
          removedCount++;
          console.log(`🗑️ Eliminada clave obsoleta: ${key}`);
        }
      } catch (error) {
        console.debug(`No se pudo eliminar ${key}:`, error);
      }
    });
    
    console.log(`✅ Limpieza completada: ${removedCount} claves obsoletas eliminadas`);
    
    // Mostrar claves restantes (solo deberían quedar autosave)
    this.showRemainingKeys();
  }
  
  static showRemainingKeys() {
    console.log('📋 Claves restantes en localStorage:');
    
    const remainingKeys = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        remainingKeys.push(key);
      }
    }
    
    if (remainingKeys.length === 0) {
      console.log('✅ localStorage completamente limpio');
    } else {
      remainingKeys.forEach(key => {
        const isAutosave = key.includes('draft:') || key.includes('autosave') || 
                          key === 'detected-username' || key === 'userPreferences' || 
                          key === 'theme';
        const status = isAutosave ? '✅ MANTENER' : '⚠️ REVISAR';
        console.log(`  ${status} ${key}`);
      });
    }
  }
  
  static getAutosaveKeys() {
    // Claves que SÍ deben mantenerse (solo autosave)
    return [
      'draft:multinotation',  // Autosave principal
      'detected-username',    // Configuración de usuario
      'userPreferences',      // Preferencias de usuario  
      'theme'                 // Tema de la aplicación
    ];
  }
  
  static isAutosaveKey(key) {
    const autosaveKeys = this.getAutosaveKeys();
    return autosaveKeys.includes(key) || 
           key.startsWith('draft:') || 
           key.includes('autosave');
  }
  
  static cleanEverythingExceptAutosave() {
    console.log('🧹 Limpieza TOTAL: eliminando todo excepto autosave...');
    
    const keysToKeep = this.getAutosaveKeys();
    const allKeys = [];
    
    // Obtener todas las claves actuales
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key) {
        allKeys.push(key);
      }
    }
    
    let removedCount = 0;
    
    allKeys.forEach(key => {
      if (!this.isAutosaveKey(key)) {
        try {
          localStorage.removeItem(key);
          removedCount++;
          console.log(`🗑️ Eliminada: ${key}`);
        } catch (error) {
          console.debug(`Error eliminando ${key}:`, error);
        }
      } else {
        console.log(`✅ Mantenida: ${key}`);
      }
    });
    
    console.log(`✅ Limpieza TOTAL completada: ${removedCount} claves eliminadas`);
    this.showRemainingKeys();
  }
}

// Hacer disponible globalmente para debugging
if (typeof window !== 'undefined') {
  window.cleanLocalStorage = () => LocalStorageCleaner.cleanAllObsoleteKeys();
  window.cleanEverythingExceptAutosave = () => LocalStorageCleaner.cleanEverythingExceptAutosave();
  window.showLocalStorageKeys = () => LocalStorageCleaner.showRemainingKeys();
  
  console.log('🧹 Funciones de limpieza disponibles:');
  console.log('  - window.cleanLocalStorage()');
  console.log('  - window.cleanEverythingExceptAutosave()'); 
  console.log('  - window.showLocalStorageKeys()');
}
