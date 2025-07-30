// panels/rasci.js - Versión limpia y optimizada

export function initRasciPanel(panel) {
  const container = panel.querySelector('#matrix-container');

      // Configurar contenedor - USAR FLEX para ajuste automático
    container.style.overflowX = 'visible';
    container.style.overflowY = 'visible';
    container.style.maxWidth = '100%';
    container.style.flex = '1';
    container.style.paddingBottom = '12px';
    container.style.position = 'relative';
    container.style.display = 'flex';
    container.style.flexDirection = 'column';
    container.style.width = '100%';
    container.style.border = '1px solid #e5e7eb';
    container.style.borderRadius = '8px';
    container.style.background = '#fff';

  // Inicializar roles desde localStorage o usar array vacío
  let roles = [];
  if (localStorage.getItem('rasciRoles')) {
    try {
      roles = JSON.parse(localStorage.getItem('rasciRoles'));
    } catch (e) {
      roles = [];
    }
  }

  // Inicializar la matriz global si no existe
  if (!window.rasciMatrixData) {
    // Intentar cargar desde localStorage
    const savedMatrixData = localStorage.getItem('rasciMatrixData');
    if (savedMatrixData) {
      try {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
      } catch (e) {
        window.rasciMatrixData = {};
      }
    } else {
      window.rasciMatrixData = {};
    }
  }

  // Función para guardar el estado en localStorage con indicador visual
  // 🔒 IMPORTANTE: Esta función SOLO guarda el estado, NO ejecuta mapeo
  function saveRasciState() {
    try {
      localStorage.setItem('rasciRoles', JSON.stringify(roles));
      localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
      
      // Mostrar indicador de guardado
      showSaveIndicator();
      
      console.log('💾 Estado RASCI guardado (SIN mapeo automático)');
    } catch (e) {
      // Error handling silencioso
    }
  }

  // Función para mostrar indicador de guardado
  function showSaveIndicator() {
    // Crear o actualizar indicador de guardado
    let saveIndicator = document.getElementById('rasci-save-indicator');
    if (!saveIndicator) {
      saveIndicator = document.createElement('div');
      saveIndicator.id = 'rasci-save-indicator';
      saveIndicator.innerHTML = `
        <div style="
          position: fixed;
          top: 20px;
          right: 20px;
          background: #10b981;
          color: white;
          padding: 8px 16px;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          z-index: 10000;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          gap: 6px;
          opacity: 0;
          transform: translateY(-10px);
          transition: all 0.3s ease;
        ">
          <i class="fas fa-save" style="font-size: 10px;"></i>
          <span>Guardado automático</span>
        </div>
      `;
      document.body.appendChild(saveIndicator);
    }

    // Mostrar indicador
    saveIndicator.style.opacity = '1';
    saveIndicator.style.transform = 'translateY(0)';

    // Ocultar después de 2 segundos
    setTimeout(() => {
      saveIndicator.style.opacity = '0';
      saveIndicator.style.transform = 'translateY(-10px)';
      }, 2000);
}



  // Variables para el sistema de guardado automático
  let saveTimeout = null;
  let lastSaveTime = 0;

  // Función para cargar el estado desde localStorage
  function loadRasciState() {
    try {
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        roles = JSON.parse(savedRoles);
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
      }
    } catch (e) {
      // Error handling silencioso
    }
  }

  // Función para guardado automático con debounce
  function autoSaveRasciState() {
    const now = Date.now();
    
    // Evitar guardados muy frecuentes (mínimo 1 segundo entre guardados)
    if (now - lastSaveTime < 1000) {
      // Cancelar timeout anterior y programar uno nuevo
      if (saveTimeout) {
        clearTimeout(saveTimeout);
      }
      saveTimeout = setTimeout(() => {
        saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
        detectAndApplyChanges(); // ✅ ACTIVADO: Ejecutar mapeo automático
        lastSaveTime = Date.now();
      }, 1000);
      return;
    }
    
    // Guardar inmediatamente si ha pasado suficiente tiempo
    saveRasciState(); // 🔒 Solo guarda estado, NO ejecuta mapeo
    detectAndApplyChanges(); // ✅ ACTIVADO: Ejecutar mapeo automático
    lastSaveTime = now;
  }

  // ✅ FUNCIÓN ACTIVADA: Mapeo automático habilitado
  function applyAutomaticMapping() {
    // Solo aplicar si hay datos en la matriz
    if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
      // Ejecutar mapeo inteligente automáticamente
      setTimeout(() => {
        if (typeof window.executeSimpleRasciMapping === 'function') {
          console.log('🔄 Ejecutando mapeo automático...');
          window.executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
        } else if (typeof window.executeIntelligentRasciMapping === 'function') {
          console.log('🔄 Ejecutando mapeo inteligente automático...');
          window.executeIntelligentRasciMapping();
        }
      }, 500); // Pequeño delay para asegurar que los cambios se han aplicado
    }
  }

  // ❌ FUNCIÓN DESACTIVADA: Mapeo automático completamente deshabilitado
  // Función para detectar cambios y aplicar mapeo automático
  function detectAndApplyChanges() {
    const modeler = window.bpmnModeler;
    if (!modeler) return;

    // Debug: mostrar estado actual
    debugMatrixState();

    // Obtener datos actuales
    const currentMatrixData = window.rasciMatrixData || {};
    const currentRoles = JSON.parse(localStorage.getItem('rasciRoles') || '[]');

    // Obtener datos anteriores
    const previousMatrixData = JSON.parse(localStorage.getItem('previousRasciMatrixData') || '{}');
    const previousRoles = JSON.parse(localStorage.getItem('previousRasciRoles') || '[]');

    let hasChanges = false;

    // Detectar cambios en roles
    const deletedRoles = previousRoles.filter(role => !currentRoles.includes(role));
    if (deletedRoles.length > 0) {
      hasChanges = true;
      console.log('Limpiando roles eliminados:', deletedRoles);
      // Limpiar roles eliminados
      deletedRoles.forEach(roleName => {
        cleanupRoleElements(modeler, roleName);
      });
    }

    // Detectar cambios en responsabilidades
    const allTasks = new Set([...Object.keys(currentMatrixData), ...Object.keys(previousMatrixData)]);
    
    allTasks.forEach(taskName => {
      const currentTaskRoles = currentMatrixData[taskName] || {};
      const previousTaskRoles = previousMatrixData[taskName] || {};
      
      // Detectar roles que han cambiado o sido eliminados
      const allRoles = new Set([...Object.keys(currentTaskRoles), ...Object.keys(previousTaskRoles)]);
      
      allRoles.forEach(roleName => {
        const currentResp = currentTaskRoles[roleName];
        const previousResp = previousTaskRoles[roleName];
        
        if (previousResp && currentResp !== previousResp) {
          hasChanges = true;
          console.log(`Limpiando cambio: ${taskName} - ${roleName} (${previousResp} → ${currentResp})`);
          // Limpiar elemento anterior
          cleanupPreviousElements(taskName, roleName, previousResp);
        }
        
        // Si un rol fue eliminado de una tarea
        if (previousResp && !currentResp) {
          hasChanges = true;
          console.log(`Limpiando eliminación: ${taskName} - ${roleName} (${previousResp})`);
          cleanupPreviousElements(taskName, roleName, previousResp);
        }
      });
    });

    // Guardar estado actual para la próxima comparación
    localStorage.setItem('previousRasciMatrixData', JSON.stringify(currentMatrixData));
    localStorage.setItem('previousRasciRoles', JSON.stringify(currentRoles));

    // Si hubo cambios, aplicar mapeo automático después de un pequeño delay
    if (hasChanges) {
      console.log('Aplicando mapeo automático después de cambios...');
      setTimeout(() => {
        applyAutomaticMapping();
      }, 200);
    } else {
      console.log('No se detectaron cambios en la matriz');
    }
  }

  // Función para limpiar elementos de un rol eliminado
  function cleanupRoleElements(modeler, roleName) {
    const modeling = modeler.get('modeling');
    
    // Buscar y eliminar el rol
    const roleElement = findRalphRoleByName(modeler, roleName);
    if (roleElement) {
      try {
        modeling.removeElements([roleElement]);
      } catch (error) {
        // Error handling silencioso
      }
    }
  }

  // Función para debug - mostrar estado actual de la matriz
  function debugMatrixState() {
    const currentMatrixData = window.rasciMatrixData || {};
    const currentRoles = JSON.parse(localStorage.getItem('rasciRoles') || '[]');
    const previousMatrixData = JSON.parse(localStorage.getItem('previousRasciMatrixData') || '{}');
    const previousRoles = JSON.parse(localStorage.getItem('previousRasciRoles') || '[]');
    
    console.log('=== ESTADO ACTUAL DE LA MATRIZ ===');
    console.log('Roles actuales:', currentRoles);
    console.log('Roles anteriores:', previousRoles);
    console.log('Matriz actual:', currentMatrixData);
    console.log('Matriz anterior:', previousMatrixData);
    
    // Detectar cambios
    const deletedRoles = previousRoles.filter(role => !currentRoles.includes(role));
    const newRoles = currentRoles.filter(role => !previousRoles.includes(role));
    
    console.log('Roles eliminados:', deletedRoles);
    console.log('Roles nuevos:', newRoles);
    
    // Detectar cambios en responsabilidades
    const allTasks = new Set([...Object.keys(currentMatrixData), ...Object.keys(previousMatrixData)]);
    const changes = [];
    
    allTasks.forEach(taskName => {
      const currentTaskRoles = currentMatrixData[taskName] || {};
      const previousTaskRoles = previousMatrixData[taskName] || {};
      const allRoles = new Set([...Object.keys(currentTaskRoles), ...Object.keys(previousTaskRoles)]);
      
      allRoles.forEach(roleName => {
        const currentResp = currentTaskRoles[roleName];
        const previousResp = previousTaskRoles[roleName];
        
        if (currentResp !== previousResp) {
          changes.push({
            task: taskName,
            role: roleName,
            from: previousResp,
            to: currentResp
          });
        }
      });
    });
    
    console.log('Cambios detectados:', changes);
    console.log('================================');
    
    return changes;
  }
}
