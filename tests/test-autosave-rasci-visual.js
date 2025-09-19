/**
 * Test específico para verificar que AutosaveManager
 * guarda y restaura correctamente la matriz RASCI y símbolos RALPH
 */

// Configurar localStorage
const localStorageMock = (() => {
  let store = {};
  return {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString(); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; },
    _store: store
  };
})();

global.localStorage = localStorageMock;

async function testAutosaveRASCI() {
  console.log('🧪 INICIANDO TEST: AutosaveManager + RASCI + RALPH');
  
  try {
    // 1. SIMULAR DATOS RASCI EN EL SISTEMA
    const { RasciStore } = await import('../app/modules/rasci/store.js');
    
    console.log('\n📋 1. CONFIGURANDO DATOS RASCI DE PRUEBA...');
    const rolesTest = ['Analista', 'Desarrollador', 'Tester'];
    const matrixTest = {
      'Task_1': { 'Analista': 'R', 'Desarrollador': 'A' },
      'Task_2': { 'Desarrollador': 'R', 'Tester': 'A' }
    };
    
    RasciStore.setRoles(rolesTest);
    RasciStore.setMatrix(matrixTest);
    
    console.log('✅ Datos RASCI configurados:');
    console.log('   - Roles:', rolesTest);
    console.log('   - Matriz:', Object.keys(matrixTest).length, 'tareas');
    
    // 2. VERIFICAR QUE SE GUARDARON
    const rolesGuardados = RasciStore.getRoles();
    const matrixGuardada = RasciStore.getMatrix();
    
    console.log('\n🔍 2. VERIFICANDO ALMACENAMIENTO...');
    console.log('   - Roles recuperados:', rolesGuardados);
    console.log('   - Matriz recuperada:', Object.keys(matrixGuardada || {}).length, 'tareas');
    
    // 3. CREAR AUTOSAVE MANAGER Y HACER AUTOGUARDADO
    const { AutosaveManager } = await import('../app/services/autosave-manager.js');
    
    const mockModeler = {
      saveXML: async () => ({ xml: '<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1"><bpmn:startEvent id="StartEvent_1"/><bpmn:task id="Task_1" name="Tarea 1"/><bpmn:task id="Task_2" name="Tarea 2"/><bpmn:endEvent id="EndEvent_1"/></bpmn:process></bpmn:definitions>' }),
      get: () => ({ getAll: () => [] })
    };
    
    const mockEventBus = {
      publish: (event, data) => console.log(`📡 Evento: ${event}`, data),
      subscribe: () => {},
      getHistory: () => []
    };
    
    console.log('\n💾 3. EJECUTANDO AUTOGUARDADO...');
    const autosaveManager = new AutosaveManager({
      modeler: mockModeler,
      eventBus: mockEventBus,
      enabled: true
    });
    
    // Marcar cambios y ejecutar autoguardado
    autosaveManager.markAsChanged();
    const saveResult = await autosaveManager.performAutosave();
    
    console.log('✅ Resultado autoguardado:', saveResult);
    
    // 4. VERIFICAR QUE SE GUARDÓ EN LOCALSTORAGE
    console.log('\n🔍 4. VERIFICANDO DATOS GUARDADOS...');
    const draftData = localStorage.getItem('draft:multinotation');
    
    if (draftData) {
      const parsed = JSON.parse(draftData);
      console.log('✅ Draft encontrado en localStorage');
      console.log('   - Timestamp:', new Date(parsed.timestamp).toLocaleString());
      console.log('   - Tiene BPMN:', !!parsed.data?.bpmn);
      console.log('   - Tiene RASCI:', !!parsed.data?.rasci);
      console.log('   - RASCI roles:', parsed.data?.rasci?.roles?.length || 0);
      console.log('   - RASCI matriz:', Object.keys(parsed.data?.rasci?.matrix || {}).length, 'tareas');
      console.log('   - Tiene RALPH:', !!parsed.data?.ralph);
      console.log('   - RALPH roles:', parsed.data?.ralph?.roles?.length || 0);
      
      // Verificar que los datos RASCI están ahí
      if (parsed.data?.rasci?.roles?.length > 0) {
        console.log('🎯 RASCI roles guardados correctamente:', parsed.data.rasci.roles);
      } else {
        console.log('❌ RASCI roles NO se guardaron');
      }
      
      if (parsed.data?.rasci?.matrix && Object.keys(parsed.data.rasci.matrix).length > 0) {
        console.log('🎯 RASCI matriz guardada correctamente:', parsed.data.rasci.matrix);
      } else {
        console.log('❌ RASCI matriz NO se guardó');
      }
    } else {
      console.log('❌ No se encontró draft en localStorage');
    }
    
    // 5. SIMULAR RESTAURACIÓN
    console.log('\n🔄 5. SIMULANDO RESTAURACIÓN...');
    
    // Limpiar datos actuales
    RasciStore.setRoles([]);
    RasciStore.setMatrix({});
    
    // Restaurar desde autosave
    const restoreResult = await autosaveManager.forceRestore();
    console.log('✅ Resultado restauración:', restoreResult);
    
    // Verificar que se restauraron
    const rolesRestaurados = RasciStore.getRoles();
    const matrixRestaurada = RasciStore.getMatrix();
    
    console.log('\n🎯 6. VERIFICANDO RESTAURACIÓN...');
    console.log('   - Roles restaurados:', rolesRestaurados);
    console.log('   - Matriz restaurada:', Object.keys(matrixRestaurada || {}).length, 'tareas');
    
    if (rolesRestaurados?.length > 0 && Object.keys(matrixRestaurada || {}).length > 0) {
      console.log('🎉 ¡ÉXITO! AutosaveManager guarda y restaura RASCI correctamente');
    } else {
      console.log('❌ PROBLEMA: AutosaveManager NO restaura RASCI correctamente');
    }
    
  } catch (error) {
    console.error('❌ Error en test:', error);
  }
}

// Ejecutar test
testAutosaveRASCI().then(() => {
  console.log('\n✅ Test completado');
}).catch(error => {
  console.error('❌ Test falló:', error);
});
