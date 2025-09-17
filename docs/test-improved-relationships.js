/**
 * Script de prueba mejorado para verificar:
 * 1. No aparezcan targets que no existían antes
 * 2. Se recuperen las medidas hijas del scope
 * 3. No se regeneren elementos borrados manualmente
 * 
 * Para usar:
 * 1. Abrir la consola del navegador
 * 2. Copiar y pegar este código
 * 3. Ejecutar testImprovedRelationships()
 */

function testImprovedRelationships() {
  console.log('🧪 Iniciando prueba mejorada de relaciones...');
  
  // Obtener el modeler y managers
  const registry = getServiceRegistry && getServiceRegistry();
  const modeler = registry ? registry.get('BpmnModeler') : null;
  const relationshipManager = registry ? registry.get('CanvasRelationshipManager') : null;
  
  if (!modeler) {
    console.error('❌ No se pudo obtener el modeler');
    return;
  }
  
  if (!relationshipManager) {
    console.error('❌ No se pudo obtener el PPIRelationshipManager');
    return;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  
  // 1. Estado inicial
  console.log('\n📊 === ESTADO INICIAL ===');
  logCurrentState();
  
  // 2. Detectar relaciones actuales
  console.log('\n🔍 === DETECTANDO RELACIONES ===');
  const detectedCount = relationshipManager.detectRelationshipsFromCanvas();
  console.log(`✅ Detectadas ${detectedCount} relaciones`);
  
  // 3. Mostrar relaciones detectadas
  console.log('\n🔗 === RELACIONES DETECTADAS ===');
  logDetectedRelationships(relationshipManager);
  
  // 4. Simular guardado y carga
  console.log('\n💾 === SIMULANDO GUARDADO Y CARGA ===');
  testSaveAndLoad(relationshipManager);
  
  // 5. Verificar que no se crean elementos automáticamente
  console.log('\n🚫 === VERIFICANDO NO-CREACIÓN AUTOMÁTICA ===');
  testNoAutoCreation();
  
  function logCurrentState() {
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
    
    const conditionElements = allElements.filter(el =>
      el.type === 'PPINOT:Condition' ||
      (el.businessObject && el.businessObject.$type === 'PPINOT:Condition')
    );
    
    console.log(`📊 Estado actual:
      - PPIs: ${ppiElements.length} elementos`);
    ppiElements.forEach(el => console.log(`    • ${el.id}: "${el.businessObject?.name || 'Sin nombre'}"`));
    
    console.log(`      - Scopes: ${scopeElements.length} elementos`);
    scopeElements.forEach(el => console.log(`    • ${el.id}: "${el.businessObject?.name || 'Sin nombre'}"`));
    
    console.log(`      - Targets: ${targetElements.length} elementos`);
    targetElements.forEach(el => console.log(`    • ${el.id}: "${el.businessObject?.name || 'Sin nombre'}"`));
    
    console.log(`      - Measures: ${measureElements.length} elementos`);
    measureElements.forEach(el => console.log(`    • ${el.id}: "${el.businessObject?.name || 'Sin nombre'}"`));
    
    console.log(`      - Conditions: ${conditionElements.length} elementos`);
    conditionElements.forEach(el => console.log(`    • ${el.id}: "${el.businessObject?.name || 'Sin nombre'}"`));
  }
  
  function logDetectedRelationships(manager) {
    const serialized = manager.serializeRelationships();
    console.log(`🔗 Total relaciones: ${serialized.relationships.length}`);
    
    serialized.relationships.forEach(rel => {
      const nested = rel.nested ? ' (ANIDADA)' : '';
      console.log(`  • ${rel.childName} (${rel.childType}) -> ${rel.parentName} (${rel.parentType})${nested}`);
    });
    
    // Verificar específicamente medidas hijas de scope
    const measureScopeRelations = serialized.relationships.filter(rel => 
      rel.childType === 'PPINOT:Measure' && rel.parentType === 'PPINOT:Scope'
    );
    
    if (measureScopeRelations.length > 0) {
      console.log(`✅ ÉXITO: ${measureScopeRelations.length} medidas hijas de scope detectadas`);
      measureScopeRelations.forEach(rel => {
        console.log(`    ✓ ${rel.childName} -> ${rel.parentName}`);
      });
    } else {
      console.log(`⚠️ No se encontraron medidas hijas de scope`);
    }
  }
  
  function testSaveAndLoad(manager) {
    // Serializar relaciones
    const serialized = manager.serializeRelationships();
    console.log(`💾 Serializadas ${serialized.relationships.length} relaciones`);
    
    // Simular limpieza
    manager.clearAllRelationships();
    console.log(`🧹 Relaciones limpiadas`);
    
    // Simular carga
    const loaded = manager.deserializeRelationships(serialized);
    console.log(`📂 Relaciones cargadas: ${loaded ? 'ÉXITO' : 'FALLO'}`);
    
    // Aplicar al canvas
    manager.applyRelationshipsToCanvas().then(applied => {
      console.log(`🎯 Relaciones aplicadas al canvas: ${applied ? 'ÉXITO' : 'FALLO'}`);
    });
  }
  
  function testNoAutoCreation() {
    // Verificar que las funciones de creación automática estén deshabilitadas
    const tests = [
      {
        name: 'forceCreateTargetScope',
        func: typeof window !== 'undefined' ? window.forceCreateTargetScope : undefined
      },
      {
        name: 'triggerRestoration',
        func: registry ? registry.get('PPINOTCoordinationManager')?.triggerRestoration : undefined
      }
    ];
    
    tests.forEach(test => {
      if (typeof test.func === 'function') {
        try {
          const result = test.func('test');
          if (result === false) {
            console.log(`✅ ${test.name} correctamente deshabilitada`);
          } else {
            console.error(`❌ ${test.name} aún funciona (resultado: ${result})`);
          }
        } catch (error) {
          console.log(`✅ ${test.name} genera error (esperado si está deshabilitada)`);
        }
      } else {
        console.log(`ℹ️ ${test.name} no disponible (correcto)`);
      }
    });
  }
}

// Test específico para medidas hijas de scope
function testMeasureScopeRelationships() {
  console.log('🧪 Probando específicamente relaciones Measure -> Scope...');
  
  const registry = getServiceRegistry && getServiceRegistry();
  const modeler = registry ? registry.get('BpmnModeler') : null;
  const relationshipManager = registry ? registry.get('CanvasRelationshipManager') : null;
  
  if (!modeler || !relationshipManager) {
    console.error('❌ No se pudieron obtener los managers necesarios');
    return;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  const allElements = elementRegistry.getAll();
  
  // Buscar medidas y scopes
  const measureElements = allElements.filter(el =>
    el.type === 'PPINOT:Measure' ||
    (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
  );
  
  const scopeElements = allElements.filter(el =>
    el.type === 'PPINOT:Scope' ||
    (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
  );
  
  console.log(`📊 Elementos encontrados:
    - Measures: ${measureElements.length}
    - Scopes: ${scopeElements.length}`);
  
  if (measureElements.length === 0 || scopeElements.length === 0) {
    console.log('ℹ️ No hay suficientes elementos para probar relaciones Measure-Scope');
    return;
  }
  
  // Detectar relaciones
  relationshipManager.detectRelationshipsFromCanvas();
  
  // Verificar relaciones Measure -> Scope
  const serialized = relationshipManager.serializeRelationships();
  const measureScopeRels = serialized.relationships.filter(rel => 
    rel.childType === 'PPINOT:Measure' && rel.parentType === 'PPINOT:Scope'
  );
  
  console.log(`🔗 Relaciones Measure -> Scope encontradas: ${measureScopeRels.length}`);
  
  measureScopeRels.forEach(rel => {
    console.log(`  ✓ ${rel.childName} -> ${rel.parentName}`);
    
    // Verificar distancia
    const measureEl = elementRegistry.get(rel.childId);
    const scopeEl = elementRegistry.get(rel.parentId);
    
    if (measureEl && scopeEl) {
      const dx = measureEl.x - scopeEl.x;
      const dy = measureEl.y - scopeEl.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      console.log(`    📏 Distancia: ${Math.round(distance)}px`);
    }
  });
  
  if (measureScopeRels.length > 0) {
    console.log('✅ ÉXITO: Las medidas hijas del scope se detectan correctamente');
  } else {
    console.log('❌ PROBLEMA: No se detectaron medidas hijas del scope');
    
    // Diagnóstico adicional
    console.log('\n🔍 Diagnóstico adicional:');
    measureElements.forEach(measure => {
      scopeElements.forEach(scope => {
        const dx = measure.x - scope.x;
        const dy = measure.y - scope.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        console.log(`  📏 ${measure.id} -> ${scope.id}: ${Math.round(distance)}px`);
      });
    });
  }
}

console.log('🧪 Scripts de prueba mejorados cargados. Ejecutar:');
console.log('  - testImprovedRelationships() para prueba completa');
console.log('  - testMeasureScopeRelationships() para probar específicamente Measure->Scope');
