// NUEVA FUNCIÓN DE TOGGLE SIMPLIFICADA Y CORREGIDA
function toggleAutoMapping() {
  console.log('🔄 === TOGGLE AUTO MAPPING INICIADO ===');
  
  // 1. Buscar elementos de la UI
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  const manualMappingBtn = document.getElementById('manual-mapping-btn');
  const executeMappingBtn = document.getElementById('execute-mapping-btn');
  const executeRalphBtn = document.getElementById('execute-ralph-mapping-btn');
  
  console.log('📋 Elementos encontrados:');
  console.log(`  • auto-mapping-switch: ${autoMappingSwitch ? '✅' : '❌'}`);
  console.log(`  • manual-mapping-btn: ${manualMappingBtn ? '✅' : '❌'}`);
  console.log(`  • execute-mapping-btn: ${executeMappingBtn ? '✅' : '❌'}`);
  console.log(`  • execute-ralph-mapping-btn: ${executeRalphBtn ? '✅' : '❌'}`);
  
  if (!autoMappingSwitch) {
    console.error('❌ FALLO: No se encontró el switch de auto-mapping');
    return false;
  }
  
  const isEnabled = autoMappingSwitch.checked;
  console.log(`🎛️ Estado del toggle: ${isEnabled ? 'ACTIVADO ✅' : 'DESACTIVADO ❌'}`);
  
  // 2. Elegir el botón correcto para mostrar/ocultar
  const targetButton = executeRalphBtn || executeMappingBtn || manualMappingBtn;
  
  if (targetButton) {
    targetButton.style.display = isEnabled ? 'none' : 'block';
    console.log(`🔲 Botón manual: ${isEnabled ? 'OCULTO' : 'VISIBLE'}`);
  } else {
    console.warn('⚠️ No se encontró ningún botón de mapeo manual');
  }
  
  // 3. Si se activa el toggle, validar y ejecutar
  if (isEnabled) {
    console.log('🔍 Toggle ACTIVADO - Iniciando proceso...');
    
    try {
      // Limpiar tareas automáticas
      console.log('🧹 Limpiando tareas automáticas...');
      cleanAutomaticTasksFromMatrix();
      
      // Validar reglas RASCI
      console.log('📊 Validando reglas RASCI...');
      const validation = validateRasciRules();
      
      console.log(`📋 Resultado validación:`);
      console.log(`  • isValid: ${validation.isValid}`);
      console.log(`  • errores: ${validation.errors.length}`);
      
      if (!validation.isValid) {
        console.log('❌ Validación falló - errores:');
        validation.errors.forEach(error => console.log(`  - ${error}`));
        
        // Desactivar toggle
        autoMappingSwitch.checked = false;
        if (targetButton) targetButton.style.display = 'block';
        
        console.log('🔄 Toggle desactivado automáticamente por errores');
        return false;
      }
      
      // Validación exitosa - ejecutar mapeo
      console.log('✅ Validación exitosa - Ejecutando mapeo...');
      
      setTimeout(() => {
        console.log('🚀 Ejecutando mapeo RASCI → RALPH...');
        
        try {
          const success = executeRasciToRalphMappingWrapper();
          
          if (success) {
            console.log('🎉 ¡MAPEO EXITOSO!');
            // Actualizar controles
            updateMappingControlsState(false);
          } else {
            console.error('❌ Mapeo falló');
            // Revertir toggle
            autoMappingSwitch.checked = false;
            if (targetButton) targetButton.style.display = 'block';
          }
        } catch (error) {
          console.error('❌ Error ejecutando mapeo:', error);
          // Revertir toggle
          autoMappingSwitch.checked = false;
          if (targetButton) targetButton.style.display = 'block';
        }
      }, 100);
      
    } catch (error) {
      console.error('❌ Error en proceso de activación:', error);
      // Revertir toggle
      autoMappingSwitch.checked = false;
      if (targetButton) targetButton.style.display = 'block';
      return false;
    }
    
  } else {
    // Toggle desactivado
    console.log('🔕 Toggle DESACTIVADO - Mapeo automático deshabilitado');
    if (targetButton) {
      targetButton.style.display = 'block';
      console.log('🔲 Botón manual mostrado');
    }
  }
  
  console.log('🏁 === TOGGLE AUTO MAPPING FINALIZADO ===');
  return true;
}

// FUNCIÓN DE DEBUG AVANZADA
function debugToggleCompleto() {
  console.log('\n🔍 === DEBUG COMPLETO DEL TOGGLE ===');
  
  // 1. Estado de elementos UI
  console.log('1️⃣ ELEMENTOS UI:');
  const elementos = {
    'auto-mapping-switch': document.getElementById('auto-mapping-switch'),
    'manual-mapping-btn': document.getElementById('manual-mapping-btn'),
    'execute-mapping-btn': document.getElementById('execute-mapping-btn'),
    'execute-ralph-mapping-btn': document.getElementById('execute-ralph-mapping-btn')
  };
  
  Object.entries(elementos).forEach(([id, element]) => {
    if (element) {
      console.log(`  ✅ ${id}: ENCONTRADO`);
      if (element.tagName === 'INPUT' && element.type === 'checkbox') {
        console.log(`     - checked: ${element.checked}`);
        console.log(`     - disabled: ${element.disabled}`);
      }
      if (element.tagName === 'BUTTON') {
        console.log(`     - disabled: ${element.disabled}`);
        console.log(`     - display: ${element.style.display || 'default'}`);
      }
    } else {
      console.log(`  ❌ ${id}: NO ENCONTRADO`);
    }
  });
  
  // 2. Estado del store RASCI
  console.log('\n2️⃣ ESTADO RASCI:');
  try {
    const store = window.rasciStore || window.RasciStore;
    if (store) {
      const matrix = store.getRasciMatrix();
      const roles = store.getRasciRoles();
      console.log(`  ✅ Store encontrado`);
      console.log(`  📋 Tareas: ${Object.keys(matrix).length}`);
      console.log(`  👥 Roles: ${roles.length}`);
      console.log(`  📝 Tareas: ${Object.keys(matrix).join(', ')}`);
      console.log(`  👤 Roles: ${roles.join(', ')}`);
    } else {
      console.log(`  ❌ Store no encontrado`);
    }
  } catch (error) {
    console.log(`  ❌ Error accediendo store: ${error.message}`);
  }
  
  // 3. Validación actual
  console.log('\n3️⃣ VALIDACIÓN:');
  try {
    cleanAutomaticTasksFromMatrix();
    const validation = validateRasciRules();
    console.log(`  📊 isValid: ${validation.isValid}`);
    console.log(`  ⚠️ errores: ${validation.errors.length}`);
    if (validation.errors.length > 0) {
      validation.errors.forEach(error => console.log(`     - ${error}`));
    }
  } catch (error) {
    console.log(`  ❌ Error validando: ${error.message}`);
  }
  
  // 4. Funciones disponibles
  console.log('\n4️⃣ FUNCIONES:');
  const funciones = [
    'toggleAutoMapping',
    'executeRasciToRalphMappingWrapper',
    'validateRasciRules',
    'cleanAutomaticTasksFromMatrix',
    'updateMappingControlsState'
  ];
  
  funciones.forEach(func => {
    console.log(`  ${typeof window[func] === 'function' ? '✅' : '❌'} ${func}`);
  });
  
  console.log('\n========================================\n');
}

// FUNCIÓN PARA ACTIVAR FORZADAMENTE EL TOGGLE
function activarToggleForzado() {
  console.log('🚀 === ACTIVACIÓN FORZADA DEL TOGGLE ===');
  
  // 1. Corregir matriz si es necesario
  console.log('🔧 Aplicando correcciones automáticas...');
  fixCommonRasciIssues();
  
  // 2. Buscar y activar el switch
  const autoMappingSwitch = document.getElementById('auto-mapping-switch');
  if (!autoMappingSwitch) {
    console.error('❌ No se encontró el switch');
    return false;
  }
  
  // 3. Activar programáticamente
  autoMappingSwitch.checked = true;
  console.log('✅ Switch activado programáticamente');
  
  // 4. Disparar el evento
  autoMappingSwitch.dispatchEvent(new Event('change', { bubbles: true }));
  console.log('🔄 Evento change disparado');
  
  // 5. Llamar toggle manualmente si es necesario
  setTimeout(() => {
    toggleAutoMapping();
  }, 100);
  
  console.log('🏁 Activación forzada completada');
  return true;
}
