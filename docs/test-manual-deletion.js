/**
 * Script de prueba para verificar que los elementos borrados manualmente NO reaparecen
 * 
 * Para usar:
 * 1. Abrir la consola del navegador
 * 2. Copiar y pegar este código
 * 3. Ejecutar testManualDeletion()
 */

function testManualDeletion() {
  console.log('🧪 Iniciando prueba de borrado manual...');
  
  // Obtener el modeler
  const registry = getServiceRegistry && getServiceRegistry();
  const modeler = registry ? registry.get('BpmnModeler') : null;
  
  if (!modeler) {
    console.error('❌ No se pudo obtener el modeler');
    return;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // 1. Buscar elementos PPINOT existentes
  const allElements = elementRegistry.getAll();
  const ppiElements = allElements.filter(el => 
    el.type === 'PPINOT:Ppi' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
  );
  
  const scopeElements = allElements.filter(el =>
    el.type === 'PPINOT:Scope' ||
    (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
  );
  
  const targetElements = allElements.filter(el =>
    el.type === 'PPINOT:Target' ||
    (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
  );
  
  const measureElements = allElements.filter(el =>
    el.type === 'PPINOT:Measure' ||
    (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
  );
  
  console.log(`📊 Estado inicial:
    - PPIs: ${ppiElements.length}
    - Scopes: ${scopeElements.length}  
    - Targets: ${targetElements.length}
    - Measures: ${measureElements.length}`);
  
  // 2. Borrar algunos elementos manualmente
  const elementsToDelete = [
    ...scopeElements.slice(0, 1),    // Borrar 1 scope
    ...targetElements.slice(0, 1),   // Borrar 1 target
    ...measureElements.slice(0, 1)   // Borrar 1 measure
  ];
  
  if (elementsToDelete.length === 0) {
    console.log('ℹ️ No hay elementos hijo para borrar');
    return;
  }
  
  console.log(`🗑️ Borrando ${elementsToDelete.length} elementos manualmente...`);
  elementsToDelete.forEach(el => {
    console.log(`  - Borrando: ${el.id} (${el.type || el.businessObject?.$type})`);
    try {
      modeling.removeElements([el]);
    } catch (error) {
      console.error(`❌ Error borrando ${el.id}:`, error);
    }
  });
  
  // 3. Verificar estado inmediatamente después del borrado
  setTimeout(() => {
    console.log('⏱️ Verificando estado después de 2 segundos...');
    checkElementCounts('Después del borrado (2s)');
  }, 2000);
  
  // 4. Verificar estado después de más tiempo
  setTimeout(() => {
    console.log('⏱️ Verificando estado después de 5 segundos...');
    checkElementCounts('Después del borrado (5s)');
  }, 5000);
  
  // 5. Verificar estado después de aún más tiempo
  setTimeout(() => {
    console.log('⏱️ Verificación final después de 10 segundos...');
    checkElementCounts('Verificación final (10s)');
    
    // Verificar si algún elemento reapareció
    const finalAllElements = elementRegistry.getAll();
    const finalScopeElements = finalAllElements.filter(el =>
      el.type === 'PPINOT:Scope' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
    );
    
    const finalTargetElements = finalAllElements.filter(el =>
      el.type === 'PPINOT:Target' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
    );
    
    const finalMeasureElements = finalAllElements.filter(el =>
      el.type === 'PPINOT:Measure' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
    );
    
    // Comprobar si reaparecieron elementos
    const scopeReappeared = finalScopeElements.length > (scopeElements.length - 1);
    const targetReappeared = finalTargetElements.length > (targetElements.length - 1);
    const measureReappeared = finalMeasureElements.length > (measureElements.length - 1);
    
    if (scopeReappeared || targetReappeared || measureReappeared) {
      console.error('❌ FALLO: Algunos elementos reaparecieron automáticamente');
      if (scopeReappeared) console.error('  - Scope reaparecido');
      if (targetReappeared) console.error('  - Target reaparecido');  
      if (measureReappeared) console.error('  - Measure reaparecido');
    } else {
      console.log('✅ ÉXITO: Los elementos borrados NO reaparecieron');
    }
  }, 10000);
  
  function checkElementCounts(label) {
    const currentAllElements = elementRegistry.getAll();
    const currentPpiElements = currentAllElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );
    
    const currentScopeElements = currentAllElements.filter(el =>
      el.type === 'PPINOT:Scope' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
    );
    
    const currentTargetElements = currentAllElements.filter(el =>
      el.type === 'PPINOT:Target' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
    );
    
    const currentMeasureElements = currentAllElements.filter(el =>
      el.type === 'PPINOT:Measure' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
    );
    
    console.log(`📊 ${label}:
      - PPIs: ${currentPpiElements.length}
      - Scopes: ${currentScopeElements.length}
      - Targets: ${currentTargetElements.length}
      - Measures: ${currentMeasureElements.length}`);
  }
}

// También probar que no se generen automáticamente elementos falsos
function testNoAutoGeneration() {
  console.log('🧪 Probando que NO se generen automáticamente elementos falsos...');
  
  // Intentar ejecutar las funciones que antes generaban elementos automáticamente
  try {
    if (typeof forceCreateTargetScope !== 'undefined') {
      const result = forceCreateTargetScope();
      if (result === false) {
        console.log('✅ forceCreateTargetScope correctamente deshabilitada');
      } else {
        console.error('❌ forceCreateTargetScope aún funciona');
      }
    }
  } catch (error) {
    console.log('✅ forceCreateTargetScope no disponible (correcto)');
  }
  
  // Verificar que los managers de coordinación estén deshabilitados
  const registry = getServiceRegistry && getServiceRegistry();
  const coordinationManager = registry ? registry.get('PPINOTCoordinationManager') : null;
  
  if (coordinationManager) {
    try {
      const result = coordinationManager.triggerRestoration('test');
      if (result === false) {
        console.log('✅ triggerRestoration correctamente deshabilitado');
      } else {
        console.error('❌ triggerRestoration aún funciona');
      }
    } catch (error) {
      console.log('✅ triggerRestoration genera error (esperado si está deshabilitado)');
    }
  }
}

console.log('🧪 Scripts de prueba cargados. Ejecutar:');
console.log('  - testManualDeletion() para probar borrado manual');
console.log('  - testNoAutoGeneration() para probar que no se generen elementos automáticamente');
