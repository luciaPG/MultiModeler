// === PPI Sync Debug Script ===
// Script para diagnosticar problemas de sincronización

class PPISyncDebugger {
  constructor() {
    this.debugLog = [];
    this.isActive = false;
  }

  start() {
    this.isActive = true;
    console.log('🔍 [DEBUG] PPISyncDebugger iniciado');
    this.log('=== INICIO DE DEBUGGING ===');
  }

  stop() {
    this.isActive = false;
    console.log('🔍 [DEBUG] PPISyncDebugger detenido');
    this.log('=== FIN DE DEBUGGING ===');
  }

  log(message, data = null) {
    if (!this.isActive) return;
    
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, data };
    this.debugLog.push(logEntry);
    
    console.log(`🔍 [DEBUG] ${message}`, data || '');
  }

  // === DIAGNÓSTICO COMPLETO ===
  
  async diagnoseSyncIssue() {
    this.start();
    
    try {
      this.log('Iniciando diagnóstico completo del sistema de sincronización...');
      
      // 1. Verificar estado del modeler
      await this.checkModelerStatus();
      
      // 2. Verificar estado del PPIManager
      await this.checkPPIManagerStatus();
      
      // 3. Verificar estado del PPISyncManager
      await this.checkPPISyncManagerStatus();
      
      // 4. Verificar cache de elementos
      await this.checkElementCache();
      
      // 5. Verificar cache de relaciones
      await this.checkRelationshipCache();
      
      // 6. Verificar PPIs y sus datos
      await this.checkPPIData();
      
      // 7. Verificar elementos en el canvas
      await this.checkCanvasElements();
      
      // 8. Verificar UI
      await this.checkUIStatus();
      
      this.log('Diagnóstico completo finalizado');
      this.printSummary();
      
    } catch (error) {
      this.log('Error durante diagnóstico:', error);
    } finally {
      this.stop();
    }
  }

  async checkModelerStatus() {
    this.log('=== VERIFICANDO MODELER ===');
    
    if (!window.modeler) {
      this.log('❌ Modeler no disponible');
      return;
    }
    
    this.log('✅ Modeler disponible');
    
    try {
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      this.log(`Elementos en canvas: ${allElements.length}`);
      
      const ppiElements = allElements.filter(el => 
        el.type === 'PPINOT:Ppi' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
      );
      this.log(`Elementos PPI en canvas: ${ppiElements.length}`);
      
      const childElements = allElements.filter(el => 
        el.type === 'PPINOT:Scope' || 
        el.type === 'PPINOT:Target' ||
        el.type === 'PPINOT:Measure' ||
        el.type === 'PPINOT:Condition' ||
        (el.businessObject && (
          el.businessObject.$type === 'PPINOT:Scope' ||
          el.businessObject.$type === 'PPINOT:Target' ||
          el.businessObject.$type === 'PPINOT:Measure' ||
          el.businessObject.$type === 'PPINOT:Condition'
        ))
      );
      this.log(`Elementos hijo en canvas: ${childElements.length}`);
      
      // Mostrar detalles de elementos hijo
      childElements.forEach(child => {
        const parent = child.parent;
        this.log(`Elemento hijo: ${child.id} (${child.type}) - Padre: ${parent ? parent.id : 'root'} (${parent ? parent.type : 'none'})`);
      });
      
    } catch (error) {
      this.log('Error verificando modeler:', error);
    }
  }

  async checkPPIManagerStatus() {
    this.log('=== VERIFICANDO PPIMANAGER ===');
    
    if (!window.ppiManager) {
      this.log('❌ PPIManager no disponible');
      return;
    }
    
    this.log('✅ PPIManager disponible');
    
    try {
      this.log(`Core disponible: ${!!window.ppiManager.core}`);
      this.log(`UI disponible: ${!!window.ppiManager.ui}`);
      this.log(`SyncManager disponible: ${!!window.ppiManager.syncManager}`);
      this.log(`SyncUI disponible: ${!!window.ppiManager.syncUI}`);
      
      if (window.ppiManager.core) {
        this.log(`PPIs en core: ${window.ppiManager.core.ppis.length}`);
      }
      
    } catch (error) {
      this.log('Error verificando PPIManager:', error);
    }
  }

  async checkPPISyncManagerStatus() {
    this.log('=== VERIFICANDO PPISYNCMANAGER ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ PPISyncManager no disponible');
      return;
    }
    
    this.log('✅ PPISyncManager disponible');
    
    try {
      const syncManager = window.ppiManager.syncManager;
      
      this.log(`Estado de sincronización:`, syncManager.getSyncStatus());
      this.log(`Cache de elementos: ${syncManager.elementCache.size} elementos`);
      this.log(`Cache de relaciones: ${syncManager.relationshipCache.size} relaciones`);
      
      // Verificar configuración
      this.log(`Configuración:`, syncManager.syncConfig);
      
    } catch (error) {
      this.log('Error verificando PPISyncManager:', error);
    }
  }

  async checkElementCache() {
    this.log('=== VERIFICANDO CACHE DE ELEMENTOS ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para verificar cache');
      return;
    }
    
    const syncManager = window.ppiManager.syncManager;
    const cache = syncManager.elementCache;
    
    this.log(`Tamaño del cache: ${cache.size}`);
    
    // Mostrar algunos elementos del cache
    let count = 0;
    for (const [elementId, data] of cache) {
      if (count < 5) { // Solo mostrar los primeros 5
        this.log(`Cache entry ${elementId}:`, data);
        count++;
      }
    }
    
    if (cache.size > 5) {
      this.log(`... y ${cache.size - 5} elementos más`);
    }
  }

  async checkRelationshipCache() {
    this.log('=== VERIFICANDO CACHE DE RELACIONES ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para verificar cache de relaciones');
      return;
    }
    
    const syncManager = window.ppiManager.syncManager;
    const cache = syncManager.relationshipCache;
    
    this.log(`Tamaño del cache de relaciones: ${cache.size}`);
    
    // Mostrar relaciones
    for (const [ppiId, children] of cache) {
      this.log(`PPI ${ppiId} tiene ${children.length} hijos:`, children.map(c => c.id));
    }
  }

  async checkPPIData() {
    this.log('=== VERIFICANDO DATOS DE PPIs ===');
    
    if (!window.ppiManager?.core) {
      this.log('❌ Core no disponible para verificar PPIs');
      return;
    }
    
    const ppis = window.ppiManager.core.ppis;
    this.log(`Total de PPIs: ${ppis.length}`);
    
    ppis.forEach((ppi, index) => {
      this.log(`PPI ${index + 1}:`, {
        id: ppi.id,
        elementId: ppi.elementId,
        title: ppi.title,
        target: ppi.target,
        scope: ppi.scope,
        updatedAt: ppi.updatedAt
      });
    });
  }

  async checkCanvasElements() {
    this.log('=== VERIFICANDO ELEMENTOS EN CANVAS ===');
    
    if (!window.modeler) {
      this.log('❌ Modeler no disponible');
      return;
    }
    
    try {
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Buscar elementos hijo PPI
      const ppiChildren = allElements.filter(element => {
        if (!element.parent) return false;
        
        return element.type === 'PPINOT:Scope' || 
               element.type === 'PPINOT:Target' ||
               element.type === 'PPINOT:Measure' ||
               element.type === 'PPINOT:Condition' ||
               (element.businessObject && (
                 element.businessObject.$type === 'PPINOT:Scope' ||
                 element.businessObject.$type === 'PPINOT:Target' ||
                 element.businessObject.$type === 'PPINOT:Measure' ||
                 element.businessObject.$type === 'PPINOT:Condition'
               ));
      });
      
      this.log(`Elementos hijo PPI encontrados: ${ppiChildren.length}`);
      
      ppiChildren.forEach(child => {
        const parent = child.parent;
        const parentIsPPI = parent && (parent.type === 'PPINOT:Ppi' || 
                                      (parent.businessObject && parent.businessObject.$type === 'PPINOT:Ppi'));
        
        this.log(`Elemento hijo: ${child.id} (${child.type})`, {
          parentId: parent ? parent.id : 'none',
          parentType: parent ? parent.type : 'none',
          parentIsPPI: parentIsPPI
        });
      });
      
    } catch (error) {
      this.log('Error verificando elementos del canvas:', error);
    }
  }

  async checkUIStatus() {
    this.log('=== VERIFICANDO ESTADO DE UI ===');
    
    const ppiList = document.getElementById('ppi-list');
    if (!ppiList) {
      this.log('❌ Elemento ppi-list no encontrado');
      return;
    }
    
    this.log('✅ Elemento ppi-list encontrado');
    
    const cards = ppiList.querySelectorAll('.ppi-card');
    this.log(`Cards de PPI en UI: ${cards.length}`);
    
    cards.forEach((card, index) => {
      const ppiId = card.getAttribute('data-ppi-id');
      const targetElement = card.querySelector('.target-value');
      const scopeElement = card.querySelector('.scope-value');
      
      this.log(`Card ${index + 1} (${ppiId}):`, {
        targetText: targetElement ? targetElement.textContent : 'no encontrado',
        scopeText: scopeElement ? scopeElement.textContent : 'no encontrado'
      });
    });
  }

  // === PRUEBAS ESPECÍFICAS ===
  
  async testOrphanedElementDetection() {
    this.log('=== PRUEBA: DETECCIÓN DE ELEMENTOS HUÉRFANOS ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para prueba');
      return;
    }
    
    const syncManager = window.ppiManager.syncManager;
    
    try {
      this.log('Ejecutando checkOrphanedElements...');
      syncManager.checkOrphanedElements();
      this.log('checkOrphanedElements ejecutado');
      
    } catch (error) {
      this.log('Error en checkOrphanedElements:', error);
    }
  }

  async testParentChangeDetection() {
    this.log('=== PRUEBA: DETECCIÓN DE CAMBIOS DE PADRE ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para prueba');
      return;
    }
    
    const syncManager = window.ppiManager.syncManager;
    
    try {
      this.log('Ejecutando checkAllParentChanges...');
      syncManager.checkAllParentChanges();
      this.log('checkAllParentChanges ejecutado');
      
    } catch (error) {
      this.log('Error en checkAllParentChanges:', error);
    }
  }

  async testUIUpdate() {
    this.log('=== PRUEBA: ACTUALIZACIÓN DE UI ===');
    
    if (!window.ppiManager?.ui) {
      this.log('❌ UI no disponible para prueba');
      return;
    }
    
    try {
      this.log('Ejecutando refreshPPIList...');
      window.ppiManager.ui.refreshPPIList();
      this.log('refreshPPIList ejecutado');
      
    } catch (error) {
      this.log('Error en refreshPPIList:', error);
    }
  }

  // === UTILIDADES ===
  
  printSummary() {
    console.log('\n📊 === RESUMEN DEL DIAGNÓSTICO ===');
    console.log(`Total de logs: ${this.debugLog.length}`);
    
    const errors = this.debugLog.filter(log => log.message.includes('❌'));
    const warnings = this.debugLog.filter(log => log.message.includes('⚠️'));
    const successes = this.debugLog.filter(log => log.message.includes('✅'));
    
    console.log(`Errores: ${errors.length}`);
    console.log(`Advertencias: ${warnings.length}`);
    console.log(`Éxitos: ${successes.length}`);
    
    if (errors.length > 0) {
      console.log('\n🚨 ERRORES ENCONTRADOS:');
      errors.forEach(error => {
        console.log(`- ${error.message}`);
      });
    }
    
    if (warnings.length > 0) {
      console.log('\n⚠️ ADVERTENCIAS:');
      warnings.forEach(warning => {
        console.log(`- ${warning.message}`);
      });
    }
  }

  getLogs() {
    return this.debugLog;
  }

  clearLogs() {
    this.debugLog = [];
  }

          // NUEVO: Forzar actualización de cache y detección automática
        forceAutomaticDetection() {
          this.log('🔄 === FORZANDO DETECCIÓN AUTOMÁTICA ===');
          
          if (!window.ppiManager?.syncManager) {
            this.log('❌ SyncManager no disponible');
            return;
          }
          
          const syncManager = window.ppiManager.syncManager;
          
          try {
            this.log('1. Actualizando cache de elementos (con preservación histórica)...');
            syncManager.updateElementCache();
            
            this.log(`2. Cache actualizado: ${syncManager.elementCache.size} elementos`);
            
            this.log('3. Verificando cambios de padre y elementos huérfanos...');
            syncManager.checkAllParentChanges();
            
            this.log('4. Actualizando UI...');
            syncManager.syncUI();
            
            this.log('✅ Detección automática forzada completada');
            
          } catch (error) {
            this.log('❌ Error forzando detección automática:', error);
          }
        }
}

// Exportar para uso global
window.PPISyncDebugger = PPISyncDebugger;

// Función de conveniencia para diagnóstico rápido
window.debugPPISync = function() {
  const debugger = new PPISyncDebugger();
  return debugger.diagnoseSyncIssue();
};

// Función para probar detección de elementos huérfanos
window.testOrphanedDetection = function() {
  const debugger = new PPISyncDebugger();
  debugger.start();
  return debugger.testOrphanedElementDetection().finally(() => debugger.stop());
};

// Función para probar detección de cambios de padre
window.testParentChangeDetection = function() {
  const debugger = new PPISyncDebugger();
  debugger.start();
  return debugger.testParentChangeDetection().finally(() => debugger.stop());
};

// Función para probar actualización de UI
window.testUIUpdate = function() {
  const debugger = new PPISyncDebugger();
  debugger.start();
  return debugger.testUIUpdate().finally(() => debugger.stop());
};

// Función para forzar detección automática
window.forceAutomaticDetection = function() {
  const debugger = new PPISyncDebugger();
  debugger.start();
  debugger.forceAutomaticDetection();
  debugger.stop();
};

console.log('🔍 PPISyncDebugger cargado. Usa debugPPISync() para diagnóstico completo.'); 