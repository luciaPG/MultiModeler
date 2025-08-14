// Test para verificar que las responsabilidades RASCI se preservan
console.log('🧪 INICIANDO TEST DE PRESERVACIÓN DE RESPONSABILIDADES RASCI');

// Simular datos de prueba
const testData = {
  'Tarea 1': {
    'Rol 1': 'R',
    'Rol 2': 'A'
  },
  'Activity_0hr0y28': {
    'Rol 1': 'S',
    'Rol 2': 'C'
  },
  'Activity_09j2i5g': {
    'Rol 1': 'I',
    'Rol 2': 'R'
  }
};

// Función para testear preservación
function testPreservation() {
  console.log('📋 Configurando datos de prueba...');
  
  // Configurar datos iniciales
  window.rasciMatrixData = JSON.parse(JSON.stringify(testData));
  window.rasciRoles = ['Rol 1', 'Rol 2'];
  
  console.log('📊 Datos iniciales:', window.rasciMatrixData);
  
  // Guardar en localStorage
  localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
  localStorage.setItem('rasciRoles', JSON.stringify(window.rasciRoles));
  
  console.log('💾 Datos guardados en localStorage');
  
  // Simular múltiples llamadas a forceReloadMatrix
  console.log('🔄 Ejecutando primera llamada a forceReloadMatrix...');
  if (typeof window.forceReloadMatrix === 'function') {
    window.forceReloadMatrix();
  }
  
  setTimeout(() => {
    console.log('🔄 Ejecutando segunda llamada a forceReloadMatrix...');
    if (typeof window.forceReloadMatrix === 'function') {
      window.forceReloadMatrix();
    }
    
    setTimeout(() => {
      console.log('🔄 Ejecutando tercera llamada a forceReloadMatrix...');
      if (typeof window.forceReloadMatrix === 'function') {
        window.forceReloadMatrix();
      }
      
      setTimeout(() => {
        console.log('🔍 VERIFICANDO RESULTADOS FINALES:');
        console.log('📊 Datos finales:', window.rasciMatrixData);
        
        // Verificar que se preservaron las responsabilidades
        let preservationSuccess = true;
        let totalResponsibilities = 0;
        let preservedResponsibilities = 0;
        
        Object.keys(testData).forEach(taskName => {
          Object.keys(testData[taskName]).forEach(roleName => {
            totalResponsibilities++;
            const originalValue = testData[taskName][roleName];
            const currentValue = window.rasciMatrixData[taskName] && window.rasciMatrixData[taskName][roleName];
            
            if (currentValue === originalValue) {
              preservedResponsibilities++;
              console.log(`✅ ${taskName}[${roleName}]: "${originalValue}" preservado`);
            } else {
              preservationSuccess = false;
              console.log(`❌ ${taskName}[${roleName}]: esperado "${originalValue}", encontrado "${currentValue}"`);
            }
          });
        });
        
        console.log(`📊 RESUMEN: ${preservedResponsibilities}/${totalResponsibilities} responsabilidades preservadas`);
        
        if (preservationSuccess) {
          console.log('🎉 ¡TEST EXITOSO! Todas las responsabilidades fueron preservadas');
        } else {
          console.log('💥 TEST FALLIDO: Algunas responsabilidades se perdieron');
        }
      }, 1000);
    }, 1000);
  }, 1000);
}

// Ejecutar test cuando esté listo
if (typeof window.forceReloadMatrix === 'function') {
  testPreservation();
} else {
  console.log('⏳ Esperando que forceReloadMatrix esté disponible...');
  setTimeout(() => {
    if (typeof window.forceReloadMatrix === 'function') {
      testPreservation();
    } else {
      console.log('❌ forceReloadMatrix no está disponible para testing');
    }
  }, 2000);
}
