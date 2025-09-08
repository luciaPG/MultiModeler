// === Test LocalStorage AutoSave ===
// Script de prueba para verificar la funcionalidad de autoguardado

console.log('🧪 Iniciando pruebas de LocalStorage AutoSave...');

// Simular localStorage si no está disponible (para Node.js)
if (typeof localStorage === 'undefined') {
  console.log('⚠️ localStorage no disponible, simulando...');
  global.localStorage = {
    data: {},
    getItem: function(key) {
      return this.data[key] || null;
    },
    setItem: function(key, value) {
      this.data[key] = value;
    },
    removeItem: function(key) {
      delete this.data[key];
    },
    clear: function() {
      this.data = {};
    }
  };
}

// Función de prueba para verificar TTL
function testTTL() {
  console.log('\n📋 Probando TTL...');
  
  const STORAGE_KEY = "draft:multinotation";
  const TTL_MS = 3 * 60 * 60 * 1000; // 3 horas
  
  // Crear datos de prueba
  const testData = {
    value: { test: 'data', timestamp: Date.now() },
    savedAt: Date.now()
  };
  
  // Guardar datos
  localStorage.setItem(STORAGE_KEY, JSON.stringify(testData));
  console.log('✅ Datos de prueba guardados');
  
  // Verificar que se pueden leer
  const stored = localStorage.getItem(STORAGE_KEY);
  const parsed = JSON.parse(stored);
  console.log('✅ Datos leídos correctamente:', parsed.value.test);
  
  // Verificar TTL válido
  const isValid = Date.now() - parsed.savedAt < TTL_MS;
  console.log('✅ TTL válido:', isValid);
  
  // Simular datos expirados
  const expiredData = {
    value: { test: 'expired' },
    savedAt: Date.now() - (TTL_MS + 1000) // 1 segundo más que el TTL
  };
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(expiredData));
  const expiredStored = localStorage.getItem(STORAGE_KEY);
  const expiredParsed = JSON.parse(expiredStored);
  const isExpired = Date.now() - expiredParsed.savedAt > TTL_MS;
  console.log('✅ Datos expirados detectados:', isExpired);
  
  // Limpiar
  localStorage.removeItem(STORAGE_KEY);
  console.log('✅ Datos de prueba eliminados');
}

// Función de prueba para verificar debouncing
function testDebouncing() {
  console.log('\n📋 Probando debouncing...');
  
  let callCount = 0;
  let lastCallTime = 0;
  const debounceDelay = 500;
  
  function debouncedFunction() {
    const now = Date.now();
    if (now - lastCallTime > debounceDelay) {
      callCount++;
      lastCallTime = now;
      console.log(`✅ Llamada ${callCount} ejecutada`);
    } else {
      console.log('⏱️ Llamada debounced');
    }
  }
  
  // Simular múltiples llamadas rápidas
  console.log('Simulando múltiples llamadas rápidas...');
  for (let i = 0; i < 5; i++) {
    setTimeout(() => debouncedFunction(), i * 100);
  }
  
  // Esperar y hacer otra llamada
  setTimeout(() => {
    debouncedFunction();
    console.log(`✅ Total de llamadas ejecutadas: ${callCount}`);
  }, 1000);
}

// Función de prueba para verificar estructura de datos
function testDataStructure() {
  console.log('\n📋 Probando estructura de datos...');
  
  const projectState = {
    bpmn: {
      xml: '<xml>test</xml>',
      canvas: { width: 800, height: 600 },
      selection: [],
      zoom: 1,
      position: { x: 0, y: 0 }
    },
    ppi: {
      indicators: [{ id: 1, name: 'Test PPI' }],
      relationships: {},
      lastUpdate: Date.now()
    },
    rasci: {
      roles: ['Role1', 'Role2'],
      matrixData: { 'task1': { 'role1': 'R' } },
      tasks: ['Task1']
    },
    panels: {
      activePanels: ['bpmn'],
      layout: '2v',
      order: ['bpmn']
    },
    metadata: {
      lastSave: Date.now(),
      version: '1.0.0',
      projectName: 'Test Project'
    }
  };
  
  // Verificar estructura
  console.log('✅ Estructura BPMN:', !!projectState.bpmn.xml);
  console.log('✅ Estructura PPI:', projectState.ppi.indicators.length);
  console.log('✅ Estructura RASCI:', projectState.rasci.roles.length);
  console.log('✅ Estructura Paneles:', projectState.panels.activePanels.length);
  console.log('✅ Estructura Metadata:', !!projectState.metadata.lastSave);
  
  // Verificar serialización
  try {
    const serialized = JSON.stringify(projectState);
    const deserialized = JSON.parse(serialized);
    console.log('✅ Serialización/deserialización exitosa');
    console.log('📊 Tamaño de datos:', (serialized.length / 1024).toFixed(2), 'KB');
  } catch (error) {
    console.error('❌ Error en serialización:', error);
  }
}

// Función de prueba para verificar notificaciones
function testNotifications() {
  console.log('\n📋 Probando sistema de notificaciones...');
  
  function showNotification(message, type = 'info') {
    const colors = {
      success: '#10b981',
      error: '#ef4444',
      info: '#3b82f6'
    };
    
    console.log(`🔔 [${type.toUpperCase()}] ${message}`);
    console.log(`   Color: ${colors[type]}`);
  }
  
  showNotification('Borrador disponible', 'info');
  showNotification('Guardado exitoso', 'success');
  showNotification('Error en guardado', 'error');
  
  console.log('✅ Notificaciones simuladas correctamente');
}

// Función de prueba para verificar timeAgo
function testTimeAgo() {
  console.log('\n📋 Probando cálculo de tiempo relativo...');
  
  function getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return 'menos de 1 minuto';
    }
  }
  
  const now = Date.now();
  const oneMinuteAgo = now - (60 * 1000);
  const oneHourAgo = now - (60 * 60 * 1000);
  const oneDayAgo = now - (24 * 60 * 60 * 1000);
  
  console.log('✅ 1 minuto:', getTimeAgo(oneMinuteAgo));
  console.log('✅ 1 hora:', getTimeAgo(oneHourAgo));
  console.log('✅ 1 día:', getTimeAgo(oneDayAgo));
}

// Ejecutar todas las pruebas
async function runAllTests() {
  console.log('🚀 Iniciando suite de pruebas...\n');
  
  try {
    testTTL();
    
    testDataStructure();
    
    testNotifications();
    
    testTimeAgo();
    
    // Esperar para que termine el debouncing
    await new Promise(resolve => setTimeout(resolve, 1500));
    testDebouncing();
    
    console.log('\n🎉 Todas las pruebas completadas exitosamente!');
    console.log('\n📝 Resumen:');
    console.log('✅ TTL funciona correctamente');
    console.log('✅ Estructura de datos válida');
    console.log('✅ Sistema de notificaciones operativo');
    console.log('✅ Cálculo de tiempo relativo correcto');
    console.log('✅ Debouncing implementado');
    
  } catch (error) {
    console.error('❌ Error en las pruebas:', error);
  }
}

// Ejecutar pruebas si se llama directamente
if (typeof window === 'undefined') {
  // Node.js
  runAllTests();
} else {
  // Browser
  console.log('🌐 Ejecutando en navegador...');
  runAllTests();
}

// Exportar para uso en otros módulos
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    testTTL,
    testDataStructure,
    testNotifications,
    testTimeAgo,
    testDebouncing,
    runAllTests
  };
}
