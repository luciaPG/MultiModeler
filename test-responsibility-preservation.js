// Test específico para verificar preservación de responsabilidades RASCI
console.log('=== TEST PRESERVACIÓN RESPONSABILIDADES RASCI ===');

function testRasciResponsibilityPreservation() {
  console.log('🧪 Iniciando prueba de preservación de responsabilidades RASCI...');
  
  // 1. Verificar estado inicial
  console.log('📋 Estado inicial:', window.rasciMatrixData);
  
  // 2. Si hay tareas y roles, establecer valores de prueba
  if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
    const tasks = Object.keys(window.rasciMatrixData);
    const firstTask = tasks[0];
    
    if (window.rasciMatrixData[firstTask]) {
      const roles = Object.keys(window.rasciMatrixData[firstTask]);
      
      if (roles.length >= 2) {
        // Establecer valores de prueba
        window.rasciMatrixData[firstTask][roles[0]] = 'R';
        window.rasciMatrixData[firstTask][roles[1]] = 'A';
        
        console.log(`🎯 Valores de prueba establecidos: ${firstTask}[${roles[0]}] = R, ${firstTask}[${roles[1]}] = A`);
        
        // Guardar en localStorage
        localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
        
        // 3. Simular recarga de matriz
        setTimeout(() => {
          console.log('🔄 Simulando recarga de matriz...');
          
          if (typeof window.updateMatrixFromDiagram === 'function') {
            window.updateMatrixFromDiagram();
            
            // 4. Verificar que los valores se preservaron
            setTimeout(() => {
              const preservedR = window.rasciMatrixData[firstTask][roles[0]];
              const preservedA = window.rasciMatrixData[firstTask][roles[1]];
              
              console.log(`🔍 Después de recarga: ${firstTask}[${roles[0]}] = "${preservedR}", ${firstTask}[${roles[1]}] = "${preservedA}"`);
              
              if (preservedR === 'R' && preservedA === 'A') {
                console.log('✅ ÉXITO: Responsabilidades RASCI preservadas correctamente');
              } else {
                console.log('❌ FALLO: Responsabilidades RASCI NO preservadas');
                console.log('❌ Se esperaba R y A, se obtuvo:', preservedR, 'y', preservedA);
              }
            }, 1000);
          } else {
            console.log('❌ Función updateMatrixFromDiagram no disponible');
          }
        }, 500);
      } else {
        console.log('⚠️ No hay suficientes roles para la prueba');
      }
    }
  } else {
    console.log('⚠️ No hay matriz RASCI para probar');
  }
}

// Ejecutar prueba después de un momento para asegurar que todo esté cargado
setTimeout(testRasciResponsibilityPreservation, 2000);
