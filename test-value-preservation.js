// Test para verificar que no se borren valores existentes
console.log('=== TEST PRESERVACIÓN DE VALORES ===');

function testValuePreservation() {
  console.log('🛡️ Iniciando prueba de preservación de valores...');
  
  // 1. Verificar estado inicial
  console.log('📋 Estado inicial de matrix:', Object.keys(window.rasciMatrixData || {}));
  
  // 2. Crear valores de prueba si no existen
  if (window.rasciMatrixData) {
    const tasks = Object.keys(window.rasciMatrixData);
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      const roles = Object.keys(window.rasciMatrixData[firstTask] || {});
      
      if (roles.length > 0) {
        const firstRole = roles[0];
        const originalValue = window.rasciMatrixData[firstTask][firstRole];
        
        // Establecer valor de prueba si está vacío
        if (!originalValue || originalValue === '') {
          window.rasciMatrixData[firstTask][firstRole] = 'R';
          console.log(`🧪 Valor de prueba establecido: ${firstTask}[${firstRole}] = R`);
        }
        
        // 3. Forzar actualización y verificar que el valor se preserva
        if (typeof window.updateMatrixFromDiagram === 'function') {
          console.log('🔄 Actualizando matriz para probar preservación...');
          window.updateMatrixFromDiagram();
          
          setTimeout(() => {
            const newValue = window.rasciMatrixData[firstTask][firstRole];
            if (newValue === 'R') {
              console.log('✅ ÉXITO: Valor preservado correctamente');
            } else {
              console.log('❌ ERROR: Valor no preservado. Era: R, ahora es:', newValue);
            }
          }, 300);
        }
      }
    }
  }
}

// Ejecutar después de un momento
setTimeout(testValuePreservation, 1000);
