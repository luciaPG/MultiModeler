// Test para verificar detección y preservación de roles RALph
console.log('=== TEST DETECCIÓN ROLES RALPH ===');

function testRalphRolesDetection() {
  console.log('🔍 Iniciando prueba de detección de roles RALph...');
  
  // 1. Verificar si la función está disponible
  if (typeof window.detectRalphRolesFromCanvas === 'function') {
    console.log('✅ Función detectRalphRolesFromCanvas disponible');
    
    // 2. Detectar roles del canvas
    const detectedRoles = window.detectRalphRolesFromCanvas();
    console.log('🎯 Roles detectados del canvas:', detectedRoles);
    
    // 3. Verificar estado actual de roles RASCI
    console.log('📋 window.rasciRoles actuales:', window.rasciRoles);
    console.log('💾 localStorage rasciRoles:', localStorage.getItem('rasciRoles'));
    
    // 4. Forzar actualización de matriz
    if (typeof window.updateMatrixFromDiagram === 'function') {
      console.log('🔄 Actualizando matriz desde diagrama...');
      window.updateMatrixFromDiagram();
      
      // 5. Verificar estado después de la actualización
      setTimeout(() => {
        console.log('📋 window.rasciRoles después de actualizar:', window.rasciRoles);
        console.log('💾 localStorage después de actualizar:', localStorage.getItem('rasciRoles'));
        console.log('🏗️ Matriz RASCI:', Object.keys(window.rasciMatrixData || {}));
      }, 500);
    } else {
      console.log('❌ Función updateMatrixFromDiagram no disponible');
    }
  } else {
    console.log('❌ Función detectRalphRolesFromCanvas no disponible');
  }
}

// Ejecutar prueba
testRalphRolesDetection();
