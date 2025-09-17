/**
 * Script para probar la restauración directa sin conflictos
 * 
 * Para usar:
 * 1. Abrir la consola del navegador
 * 2. Copiar y pegar este código
 * 3. Ejecutar testDirectRestore()
 */

function testDirectRestore() {
  console.log('🧪 Probando restauración directa...');
  
  // Obtener managers
  const registry = getServiceRegistry && getServiceRegistry();
  const modeler = registry ? registry.get('BpmnModeler') : null;
  const directManager = registry ? registry.get('DirectRestoreManager') : null;
  const relationshipManager = registry ? registry.get('CanvasRelationshipManager') : null;
  
  if (!modeler) {
    console.error('❌ No se pudo obtener el modeler');
    return;
  }

  if (!directManager) {
    console.error('❌ No se pudo obtener DirectRestoreManager');
    return;
  }

  if (!relationshipManager) {
    console.error('❌ No se pudo obtener CanvasRelationshipManager');
    return;
  }

  const elementRegistry = modeler.get('elementRegistry');
  
  // 1. Estado inicial
  console.log('\n📊 === ESTADO INICIAL ===');
  logCurrentState();
  
  // 2. Detectar y guardar relaciones actuales
  console.log('\n💾 === GUARDANDO ESTADO ACTUAL ===');
  const detectedCount = relationshipManager.detectRelationshipsFromCanvas();
  console.log(`✅ Detectadas ${detectedCount} relaciones`);
  
  // Forzar guardado
  const storageManager = registry ? registry.get('PPINOTStorageManager') : null;
  if (storageManager) {
    const allElements = elementRegistry.getAll();
    const ppinotElements = allElements.filter(el => 
      el.type && el.type.startsWith('PPINOT:')
    );
    
    const serialized = relationshipManager.serializeRelationships();
    const saved = storageManager.savePPINOTElements(ppinotElements, serialized.relationships);
    console.log(`💾 Guardado en localStorage: ${saved ? 'ÉXITO' : 'FALLO'}`);
  }
  
  // 3. Simular borrado de algunos elementos
  console.log('\n🗑️ === SIMULANDO BORRADO ===');
  const allElements = elementRegistry.getAll();
  const targetElements = allElements.filter(el => 
    el.type === 'PPINOT:Target' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
  );
  
  const measureElements = allElements.filter(el => 
    el.type === 'PPINOT:Measure' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
  );
  
  if (targetElements.length > 0) {
    const targetToDelete = targetElements[0];
    console.log(`🗑️ Borrando target: ${targetToDelete.id}`);
    const modeling = modeler.get('modeling');
    modeling.removeElements([targetToDelete]);
  }
  
  if (measureElements.length > 0) {
    const measureToDelete = measureElements[0];
    console.log(`🗑️ Borrando measure: ${measureToDelete.id}`);
    const modeling = modeler.get('modeling');
    modeling.removeElements([measureToDelete]);
  }
  
  // 4. Esperar y verificar que no reaparecen
  setTimeout(() => {
    console.log('\n⏱️ === DESPUÉS DEL BORRADO (2s) ===');
    logCurrentState();
    
    // 5. Probar restauración directa
    console.log('\n🔄 === PROBANDO RESTAURACIÓN DIRECTA ===');
    directManager.loadAndRestoreFromStorage().then(result => {
      console.log(`📂 Restauración directa: ${result ? 'ÉXITO' : 'FALLO'}`);
      
      setTimeout(() => {
        console.log('\n📊 === ESTADO DESPUÉS DE RESTAURACIÓN ===');
        logCurrentState();
        
        // Verificar estabilidad
        setTimeout(() => {
          console.log('\n📊 === VERIFICACIÓN DE ESTABILIDAD (5s después) ===');
          logCurrentState();
          
          console.log('\n✅ Prueba completada. Revisa los logs para ver si:');
          console.log('  - Los elementos NO reaparecen después del borrado');
          console.log('  - La restauración directa funciona correctamente');
          console.log('  - Los elementos permanecen estables');
        }, 5000);
      }, 1000);
    });
  }, 2000);
  
  function logCurrentState() {
    const currentElements = elementRegistry.getAll();
    
    const ppis = currentElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );
    
    const scopes = currentElements.filter(el =>
      el.type === 'PPINOT:Scope' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
    );
    
    const targets = currentElements.filter(el =>
      el.type === 'PPINOT:Target' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
    );
    
    const measures = currentElements.filter(el =>
      el.type === 'PPINOT:Measure' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
    );
    
    console.log(`📊 Estado actual:
      - PPIs: ${ppis.length}
      - Scopes: ${scopes.length}
      - Targets: ${targets.length}  
      - Measures: ${measures.length}`);
    
    // Mostrar detalles de cada tipo
    ppis.forEach(el => console.log(`  PPI: ${el.id} - "${el.businessObject?.name || 'Sin nombre'}"`));
    scopes.forEach(el => console.log(`  Scope: ${el.id} - "${el.businessObject?.name || 'Sin nombre'}"`));
    targets.forEach(el => console.log(`  Target: ${el.id} - "${el.businessObject?.name || 'Sin nombre'}"`));
    measures.forEach(el => console.log(`  Measure: ${el.id} - "${el.businessObject?.name || 'Sin nombre'}"`));
  }
}

// Test específico para verificar que no hay regeneración automática
function testNoAutoRegeneration() {
  console.log('🧪 Probando que NO hay regeneración automática...');
  
  const registry = getServiceRegistry && getServiceRegistry();
  const modeler = registry ? registry.get('BpmnModeler') : null;
  
  if (!modeler) {
    console.error('❌ No se pudo obtener el modeler');
    return;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Contar elementos iniciales
  const initialState = {
    ppis: elementRegistry.getAll().filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    ).length,
    scopes: elementRegistry.getAll().filter(el =>
      el.type === 'PPINOT:Scope' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
    ).length,
    targets: elementRegistry.getAll().filter(el =>
      el.type === 'PPINOT:Target' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
    ).length,
    measures: elementRegistry.getAll().filter(el =>
      el.type === 'PPINOT:Measure' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
    ).length
  };
  
  console.log('📊 Estado inicial:', initialState);
  
  // Borrar algunos elementos
  const allElements = elementRegistry.getAll();
  const elementsToDelete = allElements.filter(el => 
    el.type && el.type.startsWith('PPINOT:') && el.type !== 'PPINOT:Ppi'
  ).slice(0, 3); // Borrar máximo 3 elementos
  
  if (elementsToDelete.length === 0) {
    console.log('ℹ️ No hay elementos PPINOT para borrar');
    return;
  }
  
  console.log(`🗑️ Borrando ${elementsToDelete.length} elementos...`);
  elementsToDelete.forEach(el => {
    console.log(`  - Borrando: ${el.id} (${el.type})`);
    modeling.removeElements([el]);
  });
  
  // Verificar en intervalos que no reaparecen
  const checkIntervals = [1000, 3000, 5000, 10000]; // 1s, 3s, 5s, 10s
  
  checkIntervals.forEach((interval, index) => {
    setTimeout(() => {
      const currentState = {
        ppis: elementRegistry.getAll().filter(el => 
          el.type === 'PPINOT:Ppi' || 
          (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
        ).length,
        scopes: elementRegistry.getAll().filter(el =>
          el.type === 'PPINOT:Scope' ||
          (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
        ).length,
        targets: elementRegistry.getAll().filter(el =>
          el.type === 'PPINOT:Target' ||
          (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
        ).length,
        measures: elementRegistry.getAll().filter(el =>
          el.type === 'PPINOT:Measure' ||
          (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
        ).length
      };
      
      console.log(`📊 Estado después de ${interval/1000}s:`, currentState);
      
      // Verificar si algún elemento reapareció
      const scopesReappeared = currentState.scopes > (initialState.scopes - elementsToDelete.filter(el => el.type === 'PPINOT:Scope').length);
      const targetsReappeared = currentState.targets > (initialState.targets - elementsToDelete.filter(el => el.type === 'PPINOT:Target').length);
      const measuresReappeared = currentState.measures > (initialState.measures - elementsToDelete.filter(el => el.type === 'PPINOT:Measure').length);
      
      if (scopesReappeared || targetsReappeared || measuresReappeared) {
        console.error(`❌ FALLO en ${interval/1000}s: Elementos reaparecieron automáticamente`);
        if (scopesReappeared) console.error('  - Scopes reaparecieron');
        if (targetsReappeared) console.error('  - Targets reaparecieron');
        if (measuresReappeared) console.error('  - Measures reaparecieron');
      } else {
        console.log(`✅ ÉXITO en ${interval/1000}s: No hay regeneración automática`);
      }
      
      // En la última verificación, mostrar resumen final
      if (index === checkIntervals.length - 1) {
        console.log('\n🎯 === RESUMEN FINAL ===');
        if (!scopesReappeared && !targetsReappeared && !measuresReappeared) {
          console.log('✅ ÉXITO TOTAL: Los elementos borrados NO reaparecieron');
        } else {
          console.log('❌ FALLO: Hay regeneración automática activa');
        }
      }
    }, interval);
  });
}

console.log('🧪 Scripts de prueba directa cargados. Ejecutar:');
console.log('  - testDirectRestore() para probar restauración directa');
console.log('  - testNoAutoRegeneration() para verificar que no hay regeneración automática');
