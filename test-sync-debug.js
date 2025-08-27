// === DEBUG SCRIPT PARA SINCRONIZACIÓN TARGET/SCOPE ===

console.log('🔧 === INICIANDO DEBUG DE SINCRONIZACIÓN ===');

// Función para probar la sincronización
function testTargetScopeSync() {
  console.log('🧪 Probando sincronización Target/Scope...');
  
  if (!window.modeler) {
    console.error('❌ No hay modeler disponible');
    return;
  }
  
  if (!window.ppiManagerInstance) {
    console.error('❌ No hay PPI Manager disponible');
    return;
  }
  
  const elementRegistry = window.modeler.get('elementRegistry');
  const allElements = elementRegistry.getAll();
  
  // Buscar elementos PPI principales
  const ppiElements = allElements.filter(el => 
    el.type === 'PPINOT:Ppi' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
  );
  
  console.log(`📊 Encontrados ${ppiElements.length} elementos PPI principales:`, ppiElements);
  
  // Buscar elementos Target y Scope
  const targetElements = allElements.filter(el => el.type === 'PPINOT:Target');
  const scopeElements = allElements.filter(el => el.type === 'PPINOT:Scope');
  
  console.log(`🎯 Encontrados ${targetElements.length} elementos Target:`, targetElements);
  console.log(`🔍 Encontrados ${scopeElements.length} elementos Scope:`, scopeElements);
  
  // Probar cada Target
  targetElements.forEach(targetEl => {
    console.log(`🎯 Analizando Target: ${targetEl.id}`);
    console.log(`   - Nombre: ${targetEl.businessObject?.name || 'Sin nombre'}`);
    console.log(`   - Padre: ${targetEl.parent?.id || 'Sin padre'}`);
    console.log(`   - Tipo padre: ${targetEl.parent?.type || 'Sin tipo'}`);
    
    if (targetEl.parent && targetEl.parent.type === 'PPINOT:Ppi') {
      console.log(`   ✅ Tiene padre PPI, probando actualización...`);
      window.ppiManagerInstance.updatePPIWithChildInfo(targetEl.parent.id, targetEl.id);
    }
  });
  
  // Probar cada Scope
  scopeElements.forEach(scopeEl => {
    console.log(`🔍 Analizando Scope: ${scopeEl.id}`);
    console.log(`   - Nombre: ${scopeEl.businessObject?.name || 'Sin nombre'}`);
    console.log(`   - Padre: ${scopeEl.parent?.id || 'Sin padre'}`);
    console.log(`   - Tipo padre: ${scopeEl.parent?.type || 'Sin tipo'}`);
    
    if (scopeEl.parent && scopeEl.parent.type === 'PPINOT:Ppi') {
      console.log(`   ✅ Tiene padre PPI, probando actualización...`);
      window.ppiManagerInstance.updatePPIWithChildInfo(scopeEl.parent.id, scopeEl.id);
    }
  });
  
  // Verificar estado de los PPIs
  console.log('📋 Estado actual de PPIs:');
  window.ppiManagerInstance.core.ppis.forEach(ppi => {
    console.log(`   PPI ${ppi.id}:`);
    console.log(`     - Title: ${ppi.title}`);
    console.log(`     - Target: ${ppi.target || 'No definido'}`);
    console.log(`     - Scope: ${ppi.scope || 'No definido'}`);
    console.log(`     - Element ID: ${ppi.elementId}`);
  });
  
  // Refrescar UI
  console.log('🔄 Refrescando UI...');
  if (window.ppiManagerInstance.ui) {
    window.ppiManagerInstance.ui.refreshPPIList();
  }
  
  console.log('✅ Test completado');
}

// Función para simular cambio de nombre en Target/Scope
function simulateNameChange(elementId, newName) {
  console.log(`🔄 Simulando cambio de nombre para ${elementId} -> ${newName}`);
  
  if (!window.modeler) {
    console.error('❌ No hay modeler disponible');
    return;
  }
  
  const elementRegistry = window.modeler.get('elementRegistry');
  const modeling = window.modeler.get('modeling');
  const element = elementRegistry.get(elementId);
  
  if (!element) {
    console.error(`❌ Elemento ${elementId} no encontrado`);
    return;
  }
  
  console.log(`📝 Elemento encontrado:`, element);
  console.log(`   - Nombre actual: ${element.businessObject?.name || 'Sin nombre'}`);
  console.log(`   - Tipo: ${element.type}`);
  
  // Cambiar el nombre usando modeling
  modeling.updateProperties(element, {
    name: newName
  });
  
  console.log(`✅ Nombre cambiado a: ${newName}`);
  
  // Forzar actualización si es Target o Scope con padre PPI
  if ((element.type === 'PPINOT:Target' || element.type === 'PPINOT:Scope') && 
      element.parent && element.parent.type === 'PPINOT:Ppi') {
    console.log(`🔄 Forzando actualización del PPI padre...`);
    setTimeout(() => {
      window.ppiManagerInstance.updatePPIWithChildInfo(element.parent.id, element.id);
      window.ppiManagerInstance.ui.refreshPPIList();
    }, 100);
  }
}

// Exponer funciones globalmente para testing
window.testTargetScopeSync = testTargetScopeSync;
window.simulateNameChange = simulateNameChange;

console.log('🔧 === DEBUG SCRIPT CARGADO ===');
console.log('💡 Usa estas funciones:');
console.log('   - testTargetScopeSync() - Probar sincronización actual');
console.log('   - simulateNameChange(elementId, newName) - Simular cambio de nombre');
console.log('💡 Ejemplo: simulateNameChange("Target_123", "Nuevo Target")');

