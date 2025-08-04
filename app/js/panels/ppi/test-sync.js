// === PPI Sync Test Script ===
// Script para probar el sistema de sincronización

class PPISyncTester {
  constructor() {
    this.testResults = [];
  }

  log(message, data = null) {
    const timestamp = new Date().toISOString();
    console.log(`🧪 [TEST] ${message}`, data || '');
    this.testResults.push({ timestamp, message, data });
  }

  // === PRUEBAS ESPECÍFICAS ===

  async testTargetScopeClearing() {
    this.log('=== PRUEBA: LIMPIEZA DE TARGET Y SCOPE ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para prueba');
      return false;
    }

    const syncManager = window.ppiManager.syncManager;
    
    try {
      // 1. Verificar estado inicial
      this.log('1. Verificando estado inicial...');
      const initialPPIs = window.ppiManager.core.ppis;
      this.log(`PPIs iniciales: ${initialPPIs.length}`);
      
      initialPPIs.forEach(ppi => {
        this.log(`PPI ${ppi.elementId}: target="${ppi.target}", scope="${ppi.scope}"`);
      });

      // 2. Buscar elementos hijo en el canvas
      this.log('2. Buscando elementos hijo en canvas...');
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const targetElements = allElements.filter(el => el.type === 'PPINOT:Target');
      const scopeElements = allElements.filter(el => el.type === 'PPINOT:Scope');
      
      this.log(`Elementos Target encontrados: ${targetElements.length}`);
      this.log(`Elementos Scope encontrados: ${scopeElements.length}`);

      // 3. Probar limpieza de cada elemento
      const testElements = [...targetElements, ...scopeElements];
      
      for (const element of testElements) {
        this.log(`3. Probando limpieza de elemento: ${element.id} (${element.type})`);
        
        // Verificar si algún PPI tiene este elemento como target o scope
        const ppisWithThisElement = initialPPIs.filter(ppi => {
          const elementName = (element.businessObject && element.businessObject.name) || element.id;
          return ppi.target === elementName || ppi.target === element.id ||
                 ppi.scope === elementName || ppi.scope === element.id;
        });
        
        this.log(`PPIs que tienen este elemento: ${ppisWithThisElement.length}`);
        
        if (ppisWithThisElement.length > 0) {
          this.log('Ejecutando clearChildInfoFromAllPPIs...');
          syncManager.clearChildInfoFromAllPPIs(element.id);
          
          // Verificar si se limpió correctamente
          setTimeout(() => {
            const updatedPPIs = window.ppiManager.core.ppis;
            const stillHasElement = updatedPPIs.filter(ppi => {
              const elementName = (element.businessObject && element.businessObject.name) || element.id;
              return ppi.target === elementName || ppi.target === element.id ||
                     ppi.scope === elementName || ppi.scope === element.id;
            });
            
            if (stillHasElement.length === 0) {
              this.log(`✅ Elemento ${element.id} limpiado correctamente`);
            } else {
              this.log(`❌ Elemento ${element.id} NO se limpió correctamente`);
            }
          }, 100);
        } else {
          this.log(`Elemento ${element.id} no está asignado a ningún PPI`);
        }
      }

      return true;
      
    } catch (error) {
      this.log('Error en prueba de limpieza:', error);
      return false;
    }
  }

  async testOrphanedElementDetection() {
    this.log('=== PRUEBA: DETECCIÓN DE ELEMENTOS HUÉRFANOS ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para prueba');
      return false;
    }

    const syncManager = window.ppiManager.syncManager;
    
    try {
      // 1. Verificar estado inicial del cache
      this.log('1. Estado inicial del cache de elementos:');
      this.log(`Cache size: ${syncManager.elementCache.size}`);
      
      // 2. Ejecutar detección de elementos huérfanos
      this.log('2. Ejecutando checkOrphanedElements...');
      syncManager.checkOrphanedElements();
      
      // 3. Verificar si se detectaron cambios
      setTimeout(() => {
        this.log('3. Verificando resultados...');
        const updatedPPIs = window.ppiManager.core.ppis;
        
        updatedPPIs.forEach(ppi => {
          if (ppi.target === null || ppi.scope === null) {
            this.log(`✅ PPI ${ppi.elementId} tiene campos limpiados: target="${ppi.target}", scope="${ppi.scope}"`);
          }
        });
      }, 200);
      
      return true;
      
    } catch (error) {
      this.log('Error en prueba de detección de huérfanos:', error);
      return false;
    }
  }

  async testParentChangeDetection() {
    this.log('=== PRUEBA: DETECCIÓN DE CAMBIOS DE PADRE ===');
    
    if (!window.ppiManager?.syncManager) {
      this.log('❌ SyncManager no disponible para prueba');
      return false;
    }

    const syncManager = window.ppiManager.syncManager;
    
    try {
      // 1. Verificar estado inicial
      this.log('1. Estado inicial de relaciones padre-hijo:');
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const ppiChildren = allElements.filter(element => {
        if (!element.parent) return false;
        return element.type === 'PPINOT:Scope' || 
               element.type === 'PPINOT:Target' ||
               element.type === 'PPINOT:Measure' ||
               element.type === 'PPINOT:Condition';
      });
      
      ppiChildren.forEach(child => {
        const parent = child.parent;
        const parentIsPPI = parent && (parent.type === 'PPINOT:Ppi' || 
                                      (parent.businessObject && parent.businessObject.$type === 'PPINOT:Ppi'));
        this.log(`Elemento ${child.id}: padre=${parent ? parent.id : 'none'}, es PPI=${parentIsPPI}`);
      });

      // 2. Ejecutar verificación de cambios de padre
      this.log('2. Ejecutando checkAllParentChanges...');
      syncManager.checkAllParentChanges();
      
      // 3. Verificar resultados
      setTimeout(() => {
        this.log('3. Verificando cambios detectados...');
        const updatedPPIs = window.ppiManager.core.ppis;
        
        updatedPPIs.forEach(ppi => {
          this.log(`PPI ${ppi.elementId} final: target="${ppi.target}", scope="${ppi.scope}"`);
        });
      }, 200);
      
      return true;
      
    } catch (error) {
      this.log('Error en prueba de detección de cambios de padre:', error);
      return false;
    }
  }

  async testUIUpdate() {
    this.log('=== PRUEBA: ACTUALIZACIÓN DE UI ===');
    
    if (!window.ppiManager?.ui) {
      this.log('❌ UI no disponible para prueba');
      return false;
    }

    try {
      // 1. Verificar estado inicial de las cards
      this.log('1. Estado inicial de las cards:');
      const ppiList = document.getElementById('ppi-list');
      if (ppiList) {
        const cards = ppiList.querySelectorAll('.ppi-card');
        this.log(`Cards encontradas: ${cards.length}`);
        
        cards.forEach((card, index) => {
          const ppiId = card.getAttribute('data-ppi-id');
          const targetElement = card.querySelector('.target-value');
          const scopeElement = card.querySelector('.scope-value');
          
          this.log(`Card ${index + 1} (${ppiId}): target="${targetElement ? targetElement.textContent : 'no encontrado'}", scope="${scopeElement ? scopeElement.textContent : 'no encontrado'}"`);
        });
      }

      // 2. Ejecutar actualización de UI
      this.log('2. Ejecutando refreshPPIList...');
      window.ppiManager.ui.refreshPPIList();
      
      // 3. Verificar estado final
      setTimeout(() => {
        this.log('3. Estado final de las cards:');
        const updatedCards = ppiList.querySelectorAll('.ppi-card');
        this.log(`Cards actualizadas: ${updatedCards.length}`);
        
        updatedCards.forEach((card, index) => {
          const ppiId = card.getAttribute('data-ppi-id');
          const targetElement = card.querySelector('.target-value');
          const scopeElement = card.querySelector('.scope-value');
          
          this.log(`Card ${index + 1} (${ppiId}): target="${targetElement ? targetElement.textContent : 'no encontrado'}", scope="${scopeElement ? scopeElement.textContent : 'no encontrado'}"`);
        });
      }, 100);
      
      return true;
      
    } catch (error) {
      this.log('Error en prueba de actualización de UI:', error);
      return false;
    }
  }

  // === PRUEBA COMPLETA ===

  async runAllTests() {
    this.log('🧪 === INICIANDO PRUEBAS COMPLETAS DEL SISTEMA DE SINCRONIZACIÓN ===');
    
    const results = {
      targetScopeClearing: false,
      orphanedDetection: false,
      parentChangeDetection: false,
      uiUpdate: false
    };

    try {
      // Ejecutar todas las pruebas
      results.targetScopeClearing = await this.testTargetScopeClearing();
      await new Promise(resolve => setTimeout(resolve, 500)); // Esperar entre pruebas
      
      results.orphanedDetection = await this.testOrphanedElementDetection();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      results.parentChangeDetection = await this.testParentChangeDetection();
      await new Promise(resolve => setTimeout(resolve, 500));
      
      results.uiUpdate = await this.testUIUpdate();
      
      // Mostrar resumen
      this.printTestSummary(results);
      
      return results;
      
    } catch (error) {
      this.log('Error ejecutando pruebas:', error);
      return results;
    }
  }

  printTestSummary(results) {
    console.log('\n📊 === RESUMEN DE PRUEBAS ===');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    console.log(`Pruebas pasadas: ${passed}/${total}`);
    
    Object.entries(results).forEach(([test, result]) => {
      const status = result ? '✅ PASÓ' : '❌ FALLÓ';
      console.log(`${test}: ${status}`);
    });
    
    if (passed === total) {
      console.log('🎉 ¡Todas las pruebas pasaron!');
    } else {
      console.log('⚠️ Algunas pruebas fallaron. Revisa los logs para más detalles.');
    }
  }

  getTestResults() {
    return this.testResults;
  }

  clearTestResults() {
    this.testResults = [];
  }

          // NUEVO: Test específico para verificar la detección automática
        testAutomaticDetection() {
          this.log('=== PRUEBA: DETECCIÓN AUTOMÁTICA ===');
          
          if (!window.ppiManager?.syncManager) {
            this.log('❌ SyncManager no disponible para prueba');
            return false;
          }
          
          const syncManager = window.ppiManager.syncManager;
          
          try {
            this.log('1. Verificando estado actual del cache...');
            this.log(`Cache de elementos: ${syncManager.elementCache.size} elementos`);
            
            // Mostrar algunos elementos del cache
            let cacheCount = 0;
            syncManager.elementCache.forEach((value, key) => {
              if (cacheCount < 5) { // Solo mostrar los primeros 5
                this.log(`  Cache[${key}]: parentId=${value.parentId}, type=${value.type}, exists=${value.exists}`);
                cacheCount++;
              }
            });
            
            this.log('2. Ejecutando verificación completa (cambios de padre + elementos huérfanos)...');
            syncManager.checkAllParentChanges();
            
            this.log('3. Verificando PPIs después de las verificaciones...');
            const updatedPPIs = window.ppiManager.core.ppis;
            updatedPPIs.forEach(ppi => {
              this.log(`  PPI ${ppi.elementId}: target="${ppi.target}", scope="${ppi.scope}"`);
            });
            
            this.log('✅ Test de detección automática completado');
            return true;
            
          } catch (error) {
            this.log('Error en test de detección automática:', error);
            return false;
          }
        }
}

// Exportar para uso global
window.PPISyncTester = PPISyncTester;

// Funciones de conveniencia
window.testPPISync = function() {
  const tester = new PPISyncTester();
  return tester.runAllTests();
};

window.testTargetScopeClearing = function() {
  const tester = new PPISyncTester();
  return tester.testTargetScopeClearing();
};

window.testOrphanedDetection = function() {
  const tester = new PPISyncTester();
  return tester.testOrphanedElementDetection();
};

window.testParentChangeDetection = function() {
  const tester = new PPISyncTester();
  return tester.testParentChangeDetection();
};

window.testUIUpdate = function() {
  const tester = new PPISyncTester();
  return tester.testUIUpdate();
};

window.testAutomaticDetection = function() {
  const tester = new PPISyncTester();
  return tester.testAutomaticDetection();
};

console.log('🧪 PPISyncTester cargado. Usa testPPISync() para ejecutar todas las pruebas.'); 