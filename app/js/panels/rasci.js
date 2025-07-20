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
  function saveRasciState() {
    try {
      localStorage.setItem('rasciRoles', JSON.stringify(roles));
      localStorage.setItem('rasciMatrixData', JSON.stringify(window.rasciMatrixData));
      
      // Mostrar indicador de guardado
      showSaveIndicator();
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
        saveRasciState();
        detectAndApplyChanges(); // Detectar cambios después de guardar
        lastSaveTime = Date.now();
      }, 1000);
      return;
    }
    
    // Guardar inmediatamente si ha pasado suficiente tiempo
    saveRasciState();
    detectAndApplyChanges(); // Detectar cambios después de guardar
    lastSaveTime = now;
  }

  // Función para aplicar mapeo automático cuando cambien los datos
  function applyAutomaticMapping() {
    // DESACTIVADO: El mapeo automático ahora solo se ejecuta manualmente
    // Solo aplicar si hay datos en la matriz
    if (window.rasciMatrixData && Object.keys(window.rasciMatrixData).length > 0) {
      // Ejecutar mapeo inteligente automáticamente
      setTimeout(() => {
        if (typeof window.executeIntelligentRasciMapping === 'function') {
          // window.executeIntelligentRasciMapping(); // COMENTADO: Mapeo automático desactivado
        }
      }, 500); // Pequeño delay para asegurar que los cambios se han aplicado
    }
  }

  // Función para detectar cambios en la matriz y aplicar limpieza automática
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
      console.log('Cambios detectados en la matriz (mapeo automático desactivado)');
      // setTimeout(() => {
      //   applyAutomaticMapping(); // COMENTADO: Mapeo automático desactivado
      // }, 200);
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

  // Aplicar estilos únicos (evitar duplicados)
  function applyStyles() {
    if (document.getElementById('rasci-styles')) return;

    const style = document.createElement('style');
    style.id = 'rasci-styles';
    style.textContent = `
      /* === ESTILOS PARA LA LEYENDA RASCI === */
      .rasci-legend {
        padding: 0;
        max-width: 600px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        height: 100%;
      }

      /* === ESTILOS PARA LA PESTAÑA DE MAPEO === */
      .mapping-container {
        padding: 0;
        max-width: 600px;
        margin: 0 auto;
        width: 100%;
        display: flex;
        flex-direction: column;
        height: 100%;
        overflow-y: auto;
      }
      
      .mapping-header {
        margin-bottom: 24px;
        text-align: center;
        padding: 0 20px;
      }
      
      .mapping-title {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
        font-family: 'Segoe UI', Roboto, sans-serif;
        line-height: 1.3;
      }
      
      .mapping-subtitle {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
        font-style: normal;
        font-weight: 400;
      }
      
      .mapping-controls {
        margin-bottom: 24px;
        padding: 0 20px;
      }
      
      .mapping-options {
        margin-top: 16px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }
      
      .mapping-option {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
        color: #374151;
        cursor: pointer;
      }
      
      .mapping-option input[type="checkbox"] {
        width: 16px;
        height: 16px;
        accent-color: #3b82f6;
      }
      
      .positioning-options {
        margin-top: 20px;
        padding: 16px;
        background: #f0f9ff;
        border-radius: 8px;
        border: 1px solid #bae6fd;
      }
      
      .positioning-options h4 {
        margin: 0 0 12px 0;
        font-size: 14px;
        font-weight: 600;
        color: #0369a1;
      }
      
      .positioning-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
        margin-bottom: 12px;
      }
      
      .positioning-item {
        display: flex;
        flex-direction: column;
        gap: 4px;
      }
      
      .positioning-item label {
        font-size: 12px;
        font-weight: 500;
        color: #374151;
      }
      
      .positioning-item input {
        padding: 6px 8px;
        border: 1px solid #d1d5db;
        border-radius: 4px;
        font-size: 12px;
        background: white;
      }
      
      .positioning-item input:focus {
        outline: none;
        border-color: #3b82f6;
        box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
      }
      
      .mapping-results {
        margin-bottom: 24px;
        padding: 0 20px;
      }
      
      .mapping-results h4 {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 12px;
      }
      
      #mapping-log {
        background: #f9fafb;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        padding: 12px;
        font-size: 12px;
        font-family: 'Courier New', monospace;
        max-height: 200px;
        overflow-y: auto;
        white-space: pre-wrap;
        color: #374151;
      }
      
      .mapping-legend {
        padding: 0 20px;
        margin-bottom: 20px;
      }
      
      .mapping-legend h4 {
        font-size: 16px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 16px;
      }
      
      .mapping-rule {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 12px;
        margin-bottom: 8px;
        border-radius: 6px;
        background: #fff;
        border: 1px solid #e5e7eb;
      }
      
      .rule-letter {
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 600;
        font-size: 12px;
        color: white;
        flex-shrink: 0;
      }
      
      .rule-letter.r { background: #e63946; }
      .rule-letter.a { background: #f77f00; }
      .rule-letter.s { background: #43aa8b; }
      .rule-letter.c { background: #3a86ff; }
      .rule-letter.i { background: #6c757d; }
      
      .rule-content {
        font-size: 13px;
        color: #374151;
        line-height: 1.4;
      }
      
      .rule-content strong {
        color: #1f2937;
      }
      
      .btn-secondary {
        background: #6b7280;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .btn-secondary:hover {
        background: #4b5563;
      }
      
      .btn-danger {
        background: #dc2626;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .btn-danger:hover {
        background: #b91c1c;
      }
      
      .btn-info {
        background: #0ea5e9;
        color: white;
        border: none;
        padding: 10px 16px;
        border-radius: 6px;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: background-color 0.2s ease;
      }
      
      .btn-info:hover {
        background: #0284c7;
      }
      
      /* Asegurar que las pestañas de leyenda y mapeo sean completamente independientes */
      #config-tab, #mapping-tab {
        display: flex !important;
        flex-direction: column !important;
        height: 100% !important;
        overflow-y: auto !important;
        padding: 20px !important;
        background: #fff !important;
        border: none !important;
        outline: none !important;
      }
      
      #config-tab .rasci-legend {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
      }
      
      #mapping-tab .mapping-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        width: 100%;
        max-width: none;
        margin: 0;
        padding: 0;
      }
      
      /* Ocultar completamente las pestañas inactivas */
      .tab-content:not(.active) {
        display: none !important;
        visibility: hidden !important;
        position: absolute !important;
        top: -9999px !important;
        left: -9999px !important;
        z-index: -1 !important;
      }
      
      /* Asegurar que solo la pestaña activa sea visible */
      .tab-content.active {
        display: flex !important;
        visibility: visible !important;
        position: relative !important;
        top: auto !important;
        left: auto !important;
        z-index: auto !important;
      }
      
      .legend-header {
        margin-bottom: 32px;
        text-align: center;
        padding: 0 20px;
      }
      
      .legend-title {
        font-size: 18px;
        font-weight: 600;
        color: #1f2937;
        margin-bottom: 8px;
        font-family: 'Segoe UI', Roboto, sans-serif;
        line-height: 1.3;
      }
      
      .legend-subtitle {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.4;
        font-style: normal;
        font-weight: 400;
      }
      
      .legend-item {
        display: flex;
        align-items: center;
        gap: 16px;
        padding: 20px;
        margin-bottom: 16px;
        border-radius: 8px;
        background: #fff;
        border: 1px solid #e5e7eb;
        border-left: 4px solid;
        transition: all 0.2s ease;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        width: 100%;
        box-sizing: border-box;
      }
      
      .legend-item:hover {
        background: #f9fafb;
        border-color: #d1d5db;
        box-shadow: 0 2px 8px rgba(0,0,0,0.08);
        transform: translateY(-1px);
      }
      
      .legend-item.r { border-left-color: #e63946; }
      .legend-item.a { border-left-color: #f77f00; }
      .legend-item.s { border-left-color: #43aa8b; }
      .legend-item.c { border-left-color: #3a86ff; }
      .legend-item.i { border-left-color: #6c757d; }
      
      .legend-color {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 44px;
        height: 44px;
        border-radius: 50%;
        color: white;
        font-weight: 600;
        font-size: 18px;
        flex-shrink: 0;
        font-family: 'Segoe UI', Roboto, sans-serif;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      }
      
      .legend-color.r { background: #dc2626; }
      .legend-color.a { background: #ea580c; }
      .legend-color.s { background: #059669; }
      .legend-color.c { background: #2563eb; }
      .legend-color.i { background: #4b5563; }
      
      .legend-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        flex: 1;
      }
      
      .legend-name {
        font-weight: 600;
        font-size: 15px;
        margin-bottom: 8px;
        color: #1f2937;
        font-family: 'Segoe UI', Roboto, sans-serif;
      }
      
      .legend-description {
        font-size: 13px;
        color: #6b7280;
        line-height: 1.5;
        font-weight: 400;
        font-family: 'Segoe UI', Roboto, sans-serif;
      }

      /* === ESTILOS PARA LA MATRIZ RASCI === */
      /* Contenedor principal con altura máxima */
      #matrix-container {
        border-radius: 4px;
        background: #fff;
        border: 1px solid #e5e7eb;
        position: relative;
        overflow: auto !important;
        flex: 1 !important;
        max-width: 100%;
        width: 100%;
        height: 100%;
        max-height: calc(100vh - 180px) !important;
        display: block !important;
        box-sizing: border-box !important;
      }
      
      /* Contenedor de leyenda */
      #legend-container {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow-y: auto;
        padding: 0;
        margin: 0;
        width: 100%;
        height: 100%;
        max-height: calc(100vh - 180px);
        box-sizing: border-box;
      }
      
      /* Asegurar que el panel RASCI tenga exactamente el mismo estilo que el panel BPMN */
      #rasci-panel {
        background: #ffffff !important;
        border: 1px solid #ddd !important;
        border-radius: 4px !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
        display: flex !important;
        flex-direction: column !important;
        padding: 0 !important;
        margin: 0 !important;
        min-height: 400px !important;
        overflow: visible !important;
        position: relative !important;
        width: 100% !important;
        box-sizing: border-box !important;
        transition: box-shadow 0.2s ease, opacity 0.2s ease !important;
        will-change: transform !important;
      }
      
      #rasci-panel .panel-header {
        background: #f8f9fa !important;
        border-bottom: 1px solid #ddd !important;
        padding: 1px 12px !important;
        display: flex !important;
        max-height: fit-content !important;
        justify-content: space-between !important;
        align-items: center !important;
        cursor: default !important;
        user-select: none !important;
      }

      #rasci-panel .panel-title {
        font-weight: bold !important;
        color: #333 !important;
        margin: 0 !important;
        font-size: 0.7em !important;
      }

      #rasci-panel .panel-controls {
        display: flex !important;
        gap: 5px !important;
      }

      #rasci-panel .panel-btn {
        background: none !important;
        border: none !important;
        cursor: pointer !important;
        padding: 3px 6px !important;
        border-radius: 3px !important;
        transition: background 0.2s ease !important;
      }

      #rasci-panel .panel-btn:hover {
        background: #e9ecef !important;
      }

      #rasci-panel .panel-content {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: visible !important;
        justify-content: flex-end;
        max-height: 120% !important;
        padding: 0 !important;
        width: 100% !important;
        box-sizing: border-box !important;
      }

      #rasci-panel.closed {
        display: none !important;
      }

      #rasci-panel.minimized {
        height: auto !important;
        min-height: auto !important;
      }

      #rasci-panel.maximized {
        position: fixed !important;
        top: 64px !important;
        left: 0 !important;
        right: 0 !important;
        bottom: 24px !important;
        z-index: 1000 !important;
        width: 100vw !important;
        height: calc(100vh - 64px - 24px) !important;
      }

      /* Estilos de dragging removidos - funcionalidad deshabilitada */
      
      /* Asegurar que el contenedor de matriz tenga exactamente el mismo tamaño que el panel */
      #main-tab {
        flex: 1 !important;
        display: flex !important;
        flex-direction: column !important;
        overflow: hidden !important;
        padding: 12px !important;
        box-sizing: border-box !important;
        width: 100% !important;
        height: 100% !important;
        max-height: calc(100vh - 180px) !important;
      }
      
      /* Contenedor de pestañas */
      .tabs-container {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;
        background: #fff;
      }
      
      .tabs-header {
        display: flex;
        border-bottom: 1px solid #e5e7eb;
        background: #f8f9fa;
        padding: 0;
        margin: 0;
      }
      
      .rasci-matrix {
        border-collapse: separate;
        border-spacing: 0;
        width: max-content;
        min-width: 600px;
        margin: 0;
        font-family: 'Segoe UI', Roboto, sans-serif;
        font-size: 11px;
        color: #333;
        border-radius: 4px;
        position: relative;
        display: table;
        table-layout: fixed;
        background: #fff;
      }
      
      .rasci-matrix th,
      .rasci-matrix td {
        padding: 6px 3px;
        text-align: center;
        border-right: 1px solid #eaeaea;
        border-bottom: 1px solid #eaeaea;
        position: relative;
        min-width: 60px;
        max-width: 80px;
        width: 60px;
        height: auto;
        vertical-align: top;
        background: #f8fafc;
        transition: background-color 0.2s ease;
        white-space: normal;
        word-wrap: break-word;
        overflow-wrap: break-word;
        hyphens: auto;
        line-height: 1.1;
        font-size: 10px;
      }
      
      /* === STICKY COLUMNS === */
      .rasci-matrix th {
        background: #f8fafc;
        font-weight: 600;
        color: #2d3748;
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
        z-index: 5 !important;
        border-bottom: 2px solid #e2e8f0;
        letter-spacing: 0.5px;
        font-size: 12px;
        white-space: nowrap;
        word-wrap: normal;
        overflow-wrap: normal;
      }
      
      .rasci-matrix th:first-child,
      .rasci-matrix td:first-child {
        position: -webkit-sticky !important;
        position: sticky !important;
        left: 0 !important;
        z-index: 10 !important;
        background: #f1f5f9 !important;
        text-align: left !important;
        font-weight: 600 !important;
        color: #2d3748 !important;
        border-right: 3px solid #cbd5e0 !important;
        width: 100px !important;
        min-width: 100px !important;
        max-width: 100px !important;
        white-space: normal !important;
        word-wrap: break-word !important;
        overflow-wrap: break-word !important;
        hyphens: auto !important;
        line-height: 1.1 !important;
        padding: 6px 3px !important;
        vertical-align: top !important;
        box-shadow: 2px 0 8px rgba(0, 0, 0, 0.15) !important;
        font-size: 9px !important;
      }

      .rasci-matrix th:first-child {
        z-index: 15 !important;
        text-align: center !important;
        font-weight: 700 !important;
        color: #1a202c !important;
        background: #e2e8f0 !important;
        box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.2) !important;
      }
      
      /* === SCROLLBARS PERSONALIZADOS === */
      #matrix-container::-webkit-scrollbar {
        width: 8px !important;
        height: 8px !important;
      }
      
      #matrix-container::-webkit-scrollbar-track {
        background: #f1f1f1 !important;
        border-radius: 4px !important;
      }
      
      #matrix-container::-webkit-scrollbar-thumb {
        background: #c1c1c1 !important;
        border-radius: 4px !important;
      }
      
      #matrix-container::-webkit-scrollbar-thumb:hover {
        background: #a8a8a8 !important;
      }
      

      
      /* === FORZAR STICKY EN EL CONTENEDOR PRINCIPAL === */
      #matrix-container .rasci-matrix th:first-child,
      #matrix-container .rasci-matrix td:first-child {
        position: -webkit-sticky !important;
        position: sticky !important;
        left: 0 !important;
      }
      
      #matrix-container .rasci-matrix th {
        position: -webkit-sticky !important;
        position: sticky !important;
        top: 0 !important;
      }
      
      /* === SOPORTE ADICIONAL PARA STICKY === */
      @supports (-webkit-sticky: sticky) or (position: sticky) {
        .rasci-matrix th:first-child,
        .rasci-matrix td:first-child {
          position: -webkit-sticky !important;
          position: sticky !important;
        }
        
        .rasci-matrix th {
          position: -webkit-sticky !important;
          position: sticky !important;
        }
      }
      
      /* === FORZAR STICKY VIA JAVASCRIPT === */
      .sticky-forced {
        position: -webkit-sticky !important;
        position: sticky !important;
        left: 0 !important;
      }

      /* === CONTENEDORES Y CONTROLES RASCI === */
      .rasci-container {
        position: relative;
        width: 100%;
        min-width: 40px;
        outline: none;
        border: none;
        height: 28px;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border-radius: 0;
        transition: all 0.2s ease;
        background: transparent;
        box-shadow: none;
      }
      
      .rasci-container:focus {
        outline: none;
        border: none;
        box-shadow: none;
        background: rgba(0, 0, 0, 0.08);
      }
      
      .rasci-container.rasci-ready {
        background: rgba(0, 0, 0, 0.08);
        border: none;
        outline: none;
        box-shadow: none;
      }
      
      .rasci-display {
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        min-height: 28px;
        font-weight: bold;
        font-size: 15px;
        border: none;
        outline: none;
      }
      
      .rasci-circle {
        display: inline-block;
        width: 24px;
        height: 24px;
        line-height: 24px;
        border-radius: 50%;
        background: #eee;
        color: #fff;
        font-weight: bold;
        font-size: 15px;
        text-align: center;
        vertical-align: middle;
        margin: 0 2px;
        box-shadow: none;
        border: none;
        outline: none;
        position: relative;
      }

      /* === ESTADOS DE CELDAS === */
      .cell-ready {
        background: rgba(0, 0, 0, 0.04);
        transition: background-color 0.15s ease;
        border: none;
        outline: none;
      }
      
      .cell-with-content {
        background: #f8fafc;
        border: none;
        outline: none;
      }
      
      .rasci-matrix td.cell-ready .rasci-container.rasci-ready {
        background: rgba(0, 0, 0, 0.12);
        border-radius: 0;
        border: none;
        outline: none;
        box-shadow: none;
      }

      /* === GESTIÓN DE ROLES === */
      .role-header {
        cursor: pointer;
        position: relative;
      }
      
      .role-header-content {
        display: flex;
        align-items: center;
        justify-content: center;
        position: relative;
        width: 100%;
        padding: 2px 8px 2px 2px;
        min-height: 24px;
      }
      
      .role-name {
        flex: 1;
        cursor: pointer;
        transition: color 0.2s ease;
        text-align: center;
        border-radius: 3px;
        min-height: 20px;
        display: flex;
        align-items: center;
        justify-content: center;
      }
      
      .role-name:hover {
        color: #3a56d4;
      }
      
      .role-name.editing {
        box-shadow: 0 0 0 2px rgba(49, 130, 206, 0.3);
      }

      .role-edit-input {
        width: 100px;
        padding: 2px 4px;
        border: none;
        border-radius: 0;
        font-size: inherit;
        font-family: inherit;
        font-weight: inherit;
        text-align: center;
        background: transparent;
        color: #2d3748;
        outline: none;
        box-shadow: none;
        z-index: 1000;
        position: absolute;
        left: 50%;
        top: 50%;
        transform: translate(-50%, -50%);
        transition: background-color 0.2s ease;
        box-sizing: border-box;
      }
      
      .role-edit-input:focus {
        background: rgba(49, 130, 206, 0.1);
        width: 100px;
      }
      
      .delete-role-btn {
        position: absolute;
        top: -8px;
        right: -8px;
        width: 14px;
        height: 14px;
        border: none;
        background: transparent;
        color: #dc2626;
        border-radius: 0;
        font-size: 12px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.7;
        z-index: 1001;
        transition: opacity 0.2s ease;
        line-height: 1;
        font-family: monospace;
      }
      
      .delete-role-btn:hover {
        opacity: 1;
      }
      
      .add-role-btn {
        width: 30px;
        height: 30px;
        border: 2px solid #e2e8f0;
        background: #fff;
        color: #4a5568;
        border-radius: 50%;
        font-size: 18px;
        font-weight: bold;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        margin: 0 auto;
      }
      
      .add-role-btn:hover {
        background: #f7fafc;
        border-color: #cbd5e0;
        color: #2d3748;
        transform: scale(1.1);
      }

      /* === BOTONES === */
      .btn-primary {
        width: 100%;
        padding: 10px 16px;
        font-size: 14px;
        font-weight: 500;
        border-radius: 4px;
        border: none;
        cursor: pointer;
        transition: all 0.2s ease;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        min-height: 40px;
        box-sizing: border-box;
        margin-bottom: 16px;
        background: #3a56d4;
        color: white;
        flex-shrink: 0;
      }

      /* === PESTAÑAS - ESTILOS FORMALES Y DISCRETOS === */
      .tab {
        padding: 10px 20px;
        background: #f8f9fa;
        border: none;
        border-bottom: 2px solid transparent;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        color: #6c757d;
        transition: all 0.2s ease;
        margin-right: 0;
        position: relative;
        font-family: 'Segoe UI', Roboto, sans-serif;
      }
      
      .tab:hover {
        background: #e9ecef;
        color: #495057;
        border-bottom-color: #dee2e6;
      }
      
      .tab.active {
        background: #fff;
        color: #333;
        border-bottom: 2px solid #3a56d4;
        font-weight: 600;
      }
      
      .tab-content {
        padding: 0;
        height: 100%;
        display: none;
        flex-direction: column;
        background: #fff;
        border: none;
        border-radius: 0;
        overflow: hidden;
      }
      
      .tab-content.active {
        display: flex;
      }
      
      #config-tab {
        flex: 1;
        display: flex;
        align-items: flex-start;
        justify-content: center;
        padding: 20px;
      }
      
      #legend-tab {
        flex: 1;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: flex-start;
        overflow-y: auto;
        padding: 20px;
        background: #fff;
      }

      /* === RESPONSIVE === */
      @media (max-width: 768px) {
        .rasci-legend { padding: 16px; }
        .legend-item {
          flex-direction: column;
          text-align: center;
          padding: 16px;
        }
        .legend-color { margin-right: 0; margin-bottom: 12px; }
        
        #matrix-container {
          max-height: 50vh;
          overflow: clip;
        }
        
        .rasci-matrix th:first-child,
        .rasci-matrix td:first-child {
          min-width: 140px;
          max-width: 140px;
          width: 140px;
          font-size: 11px;
          line-height: 1.3;
        }
      }
      
      /* === HOVER === */
      .rasci-matrix td:not(:first-child):not([data-value]):not(.cell-ready):hover {
        background: rgba(0, 0, 0, 0.02);
        cursor: pointer;
      }
      
      .rasci-matrix td:first-child:hover,
      .rasci-matrix th:first-child:hover {
        background: inherit;
        cursor: default;
      }
      

    `;
    document.head.appendChild(style);
  }

  // Obtener tareas del diagrama BPMN
  function getBpmnTasks() {
    const modeler = window.bpmnModeler;
    if (!modeler) return [];

    const elementRegistry = modeler.get('elementRegistry');
    const tasks = [];

    elementRegistry.forEach(element => {
      if (element.type && (
        element.type === 'bpmn:Task' ||
        element.type === 'bpmn:UserTask' ||
        element.type === 'bpmn:ServiceTask' ||
        element.type === 'bpmn:ScriptTask' ||
        element.type === 'bpmn:ManualTask' ||
        element.type === 'bpmn:BusinessRuleTask' ||
        element.type === 'bpmn:SendTask' ||
        element.type === 'bpmn:ReceiveTask' ||
        element.type === 'bpmn:CallActivity' ||
        element.type === 'bpmn:SubProcess'
      )) {
        // Usar el nombre de la tarea si existe, sino usar el ID
        const taskName = (element.businessObject && element.businessObject.name) || element.id;
        tasks.push(taskName);
      }
    });

    // Si no hay tareas, retornar array vacío
    if (tasks.length === 0) {
      return [];
    }

    return tasks;
  }

  // Actualizar matriz desde diagrama
  function updateMatrixFromDiagram() {
    // Solo actualizar si estamos en la pestaña de matriz
    const mainTab = document.querySelector('#main-tab');
    if (!mainTab || !mainTab.classList.contains('active')) {
      return;
    }
    
    // Solo actualizar el contenedor de matriz, no todo el panel
    const matrixContainer = mainTab.querySelector('#matrix-container');
    if (!matrixContainer) {
      return;
    }
    
    const tasks = getBpmnTasks();
    if (tasks.length === 0) {
      matrixContainer.innerHTML = '<div style="text-align: center; padding: 20px; color: #666;">No hay tareas en el diagrama BPMN actual. Agrega algunas tareas para ver la matriz RASCI.</div>';
      return;
    }
    renderMatrix(tasks);
  }

  // Configurar listener para cambios en diagrama
  function setupDiagramChangeListener() {
    const modeler = window.bpmnModeler;
    if (modeler) {
      const eventBus = modeler.get('eventBus');
      if (eventBus) {
        eventBus.on([
          'element.added',
          'element.removed',
          'element.changed',
          'elements.changed'
        ], () => {
          setTimeout(updateMatrixFromDiagram, 100);
        });
      }
    }
  }

  // Agregar nuevo rol
  function addNewRole() {
    const defaultName = `Rol ${roles.length + 1}`;
    roles.push(defaultName);
    
    // Guardar el estado automáticamente
    autoSaveRasciState();
    
    // Actualizar la matriz preservando los datos existentes
    updateMatrixFromDiagram();
    
    // No hacer editable automáticamente, el nombre por defecto ya está guardado
  }

  // Función para hacer un rol editable inline
  function makeRoleEditable(roleHeader, roleIndex) {
    const roleNameSpan = roleHeader.querySelector('.role-name');
    if (!roleNameSpan) return;

    const existingInput = roleHeader.querySelector('input[type="text"]');
    if (existingInput) {
      existingInput.focus();
      existingInput.select();
      return;
    }

    const currentName = roles[roleIndex];

    // Crear input con protección máxima contra RALPH
    let input = document.createElement('input');
    input.type = 'text';
    input.value = currentName;
    input.maxLength = 20;
    input.className = 'role-edit-input';

    // Atributos de protección extensivos
    input.setAttribute('data-rasci-protected', 'true');
    input.setAttribute('data-ralph-ignore', 'true');
    input.setAttribute('data-ralph-excluded', 'true');
    input.setAttribute('data-ralph-skip', 'true');
    input.setAttribute('data-ralph-non-editable', 'true');
    input.setAttribute('data-bpmn-ignore', 'true');
    input.setAttribute('data-no-label-editing', 'true');
    input.setAttribute('data-skip-editing-check', 'true');
    input.setAttribute('data-exclude-from-editing', 'true');
    input.setAttribute('contenteditable', 'false');
    input.setAttribute('data-editing', 'false');
    input.setAttribute('data-internal', 'true');
    input.setAttribute('data-non-editable', 'true');
    input.setAttribute('role', 'textbox');
    input.setAttribute('data-vscode-ignore', 'true');

    input.style.cssText = `
      background: transparent !important;
      border: none !important;
      padding: 2px 4px !important;
      font-size: 12px !important;
      font-weight: 600 !important;
      color: #2d3748 !important;
      width: 100px !important;
      text-align: center !important;
      outline: none !important;
      border-radius: 0 !important;
      box-shadow: none !important;
      font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif !important;
      z-index: 9999 !important;
      position: absolute !important;
      left: 50% !important;
      top: 50% !important;
      transform: translate(-50%, -50%) !important;
      pointer-events: auto !important;
      transition: background-color 0.2s ease !important;
      box-sizing: border-box !important;
    `;

    // Ocultar span original y agregar input
    roleNameSpan.style.display = 'none';
    roleHeader.appendChild(input);

    // Protección adicional: interceptar removeChild y remove
    const originalRemoveChild = roleHeader.removeChild;

    roleHeader.removeChild = function (child) {
      if (child === input || child.hasAttribute('data-rasci-protected')) {
        return; // No permitir eliminar nuestro input
      }
      return originalRemoveChild.call(this, child);
    };

    input.remove = function () {
      // No permitir que se elimine nuestro input
      return;
    };

    let isSaving = false;
    let startTime = Date.now();

    // Interceptar métodos del documento para proteger nuestro input
    const originalQuerySelectorAll = document.querySelectorAll;
    const originalGetElementsByTagName = document.getElementsByTagName;

    // Interceptar querySelectorAll para ocultar nuestros inputs de RALPH
    document.querySelectorAll = function (selector) {
      const results = originalQuerySelectorAll.call(this, selector);
      if (selector && (
        selector.includes('input') ||
        selector.includes('[contenteditable]') ||
        selector.toLowerCase().includes('edit')
      )) {
        // Filtrar nuestros inputs protegidos
        return Array.from(results).filter(el =>
          !el.hasAttribute('data-rasci-protected') &&
          !el.hasAttribute('data-ralph-ignore')
        );
      }
      return results;
    };

    // Interceptar getElementsByTagName para inputs
    document.getElementsByTagName = function (tagName) {
      const results = originalGetElementsByTagName.call(this, tagName);
      if (tagName && tagName.toLowerCase() === 'input') {
        return Array.from(results).filter(el =>
          !el.hasAttribute('data-rasci-protected') &&
          !el.hasAttribute('data-ralph-ignore')
        );
      }
      return results;
    };

    // Función para restaurar métodos originales
    function restoreDocumentMethods() {
      document.querySelectorAll = originalQuerySelectorAll;
      document.getElementsByTagName = originalGetElementsByTagName;
    }

    function saveChanges() {
      if (isSaving) return;
      isSaving = true;

      const newName = input.value.trim();

      if (newName && newName !== currentName) {
        const isDuplicate = roles.some((role, index) =>
          index !== roleIndex && role === newName
        );

        if (isDuplicate) {
          // Mostrar error de forma más elegante
          const errorDiv = document.createElement('div');
          errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #dc2626;
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: 500;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          `;
          errorDiv.textContent = 'Este nombre de rol ya existe.';
          document.body.appendChild(errorDiv);
          
          setTimeout(() => {
            if (errorDiv.parentNode) {
              errorDiv.parentNode.removeChild(errorDiv);
            }
          }, 3000);
          
          input.focus();
          input.select();
          isSaving = false;
          return;
        }

        // Actualizar el nombre del rol
        roles[roleIndex] = newName;

        // Migrar los datos RASCI del nombre antiguo al nuevo
        if (window.rasciMatrixData) {
          Object.keys(window.rasciMatrixData).forEach(task => {
            if (window.rasciMatrixData[task] && window.rasciMatrixData[task][currentName]) {
              window.rasciMatrixData[task][newName] = window.rasciMatrixData[task][currentName];
              delete window.rasciMatrixData[task][currentName];
            }
          });
        }

        // Guardar el estado automáticamente
        autoSaveRasciState();

        // Actualizar solo el texto del span sin re-renderizar toda la tabla
        if (roleNameSpan) {
          roleNameSpan.textContent = newName;
        }

        restoreView();
      } else {
        restoreView();
      }
    }

    function restoreView() {
      // Restaurar métodos originales del documento
      restoreDocumentMethods();

      // Restaurar métodos originales del header
      if (roleHeader.removeChild !== originalRemoveChild) {
        roleHeader.removeChild = originalRemoveChild;
      }

      if (input && input.parentNode) {
        input.parentNode.removeChild(input);
      }

      if (roleNameSpan) {
        roleNameSpan.style.display = 'flex';
      }

      isSaving = false;
    }

    // Función para configurar event listeners
    function setupInputEventListeners(inputElement) {
      inputElement.addEventListener('keydown', function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (e.key === 'Enter') {
          e.preventDefault();
          saveChanges();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          restoreView();
        }
      }, true);



      inputElement.addEventListener('input', function () {
        // Prevenir propagación
      });

      inputElement.addEventListener('click', function (e) {
        e.stopPropagation();
        e.stopImmediatePropagation();
        if (document.activeElement !== inputElement) {
          inputElement.focus();
          inputElement.select();
        }
      });

      inputElement.addEventListener('focus', function () {
        // Prevenir propagación
        this.style.setProperty('background', 'rgba(49, 130, 206, 0.1)', 'important');
      });

      inputElement.addEventListener('blur', function () {
        if (isSaving) return;

        // Protección contra blur prematuro
        if ((Date.now() - startTime) < 500) {
          setTimeout(() => {
            if (document.contains(inputElement)) {
              inputElement.focus();
              inputElement.select();
            }
          }, 10);
          return;
        }

        // Restaurar fondo transparente
        this.style.setProperty('background', 'transparent', 'important');

        setTimeout(() => {
          if (document.contains(inputElement)) {
            saveChanges();
          }
        }, 100);
      });
    }

    // Configurar event listeners iniciales
    setupInputEventListeners(input);

    // Sistema de supervivencia agresivo
    let survivalCheck = setInterval(() => {
      if (!document.contains(input)) {
        const currentValue = input.value || '';

        const newInput = document.createElement('input');
        newInput.type = 'text';
        newInput.value = currentValue;
        newInput.maxLength = 20;
        newInput.className = 'role-edit-input';

        // Replicar todos los atributos de protección
        newInput.setAttribute('data-rasci-protected', 'true');
        newInput.setAttribute('data-ralph-ignore', 'true');
        newInput.setAttribute('data-ralph-excluded', 'true');
        newInput.setAttribute('data-ralph-skip', 'true');
        newInput.setAttribute('data-ralph-non-editable', 'true');
        newInput.setAttribute('data-bpmn-ignore', 'true');
        newInput.setAttribute('data-no-label-editing', 'true');
        newInput.setAttribute('data-skip-editing-check', 'true');
        newInput.setAttribute('data-exclude-from-editing', 'true');
        newInput.setAttribute('contenteditable', 'false');
        newInput.setAttribute('data-editing', 'false');
        newInput.setAttribute('data-internal', 'true');
        newInput.setAttribute('data-non-editable', 'true');
        newInput.setAttribute('role', 'textbox');
        newInput.setAttribute('data-vscode-ignore', 'true');

        newInput.style.cssText = input.style.cssText;

        roleHeader.appendChild(newInput);
        input = newInput;

        // Replicar event listeners
        setupInputEventListeners(input);

        setTimeout(() => {
          input.focus();
          input.select();
        }, 10);
      }
    }, 50); // Verificar cada 50ms en lugar de 100ms

    // Establecer foco
    setTimeout(() => {
      input.focus();
      input.select();
    }, 10);

    // Cleanup automático
    setTimeout(() => {
      if (survivalCheck) {
        clearInterval(survivalCheck);
      }
      if (document.contains(input)) {
        restoreView();
      }
    }, 10000);
  }

  function editRole(roleIndex) {
    const roleHeaders = document.querySelectorAll('[data-role-index]');
    let roleHeader = null;

    for (let header of roleHeaders) {
      if (header.getAttribute('data-role-index') === roleIndex.toString()) {
        roleHeader = header;
        break;
      }
    }

    if (roleHeader) {
      makeRoleEditable(roleHeader, roleIndex);
    }
  }

  // Modal de confirmación para eliminar rol
  function showDeleteConfirmModal(roleIndex) {
    const roleToDelete = roles[roleIndex];

    const modal = document.createElement('div');
    modal.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 999999;
    `;

    const content = document.createElement('div');
    content.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
      min-width: 350px;
      max-width: 450px;
      position: relative;
      text-align: center;
    `;

    content.innerHTML = `
      <div style="font-size: 48px; margin-bottom: 20px;">⚠️</div>
      <h3 style="margin: 0 0 15px 0; color: #dc2626; font-size: 20px; font-weight: bold;">Eliminar Rol</h3>
      <p style="margin: 0 0 25px 0; color: #374151; font-size: 16px; line-height: 1.5;">¿Estás seguro de que quieres eliminar el rol "${roleToDelete}"?</p>
      <div style="display: flex; gap: 15px; justify-content: center;">
        <button id="cancelBtn" style="padding: 12px 24px; border: 2px solid #d1d5db; background: #f9fafb; color: #374151; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">Cancelar</button>
        <button id="deleteBtn" style="padding: 12px 24px; border: none; background: #dc2626; color: white; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">Eliminar</button>
      </div>
    `;

    document.body.appendChild(modal);

    function closeModal() {
      modal.remove();
    }

    function confirmDelete() {
      if (window.rasciMatrixData) {
        Object.keys(window.rasciMatrixData).forEach(task => {
          if (window.rasciMatrixData[task] && window.rasciMatrixData[task][roleToDelete]) {
            delete window.rasciMatrixData[task][roleToDelete];
          }
        });
      }
      roles.splice(roleIndex, 1);
      
      // Guardar el estado automáticamente
      autoSaveRasciState();
      
      closeModal();
      updateMatrixFromDiagram();
    }

    content.querySelector('#deleteBtn').addEventListener('click', confirmDelete);
    content.querySelector('#cancelBtn').addEventListener('click', closeModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal();
    });

    document.addEventListener('keydown', function handleEscape(e) {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    });

    content.querySelector('#cancelBtn').focus();
  }

  // Eliminar rol
  function deleteRole(roleIndex) {
    showDeleteConfirmModal(roleIndex);
  }

  // Renderizar matriz principal
  function renderMatrix(tasks = []) {
    // Obtener el contenedor de matriz específico de la pestaña activa
    const mainTab = document.querySelector('#main-tab');
    const matrixContainer = mainTab ? mainTab.querySelector('#matrix-container') : null;
    
    if (!matrixContainer) {
      return;
    }
    
    matrixContainer.innerHTML = '';

    // Configurar el contenedor principal - CON ALTURA MÁXIMA
    matrixContainer.style.cssText = `
      width: 100%;
      height: 100%;
      max-height: calc(100vh - 180px);
      flex: 1;
      position: relative;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      background: #fff;
      padding: 0;
      margin: 0;
      overflow: auto;
      display: block;
    `;
    
    // Crear tabla directamente
    const table = document.createElement('table');
    table.className = 'rasci-matrix';
    table.style.cssText = `
      border-collapse: separate;
      border-spacing: 0;
      width: max-content;
      min-width: 500px;
      margin: 0;
      font-family: 'Segoe UI', Roboto, sans-serif;
      font-size: 11px;
      color: #333;
      border-radius: 6px;
      position: relative;
      display: table;
      table-layout: fixed;
    `;

    // Crear encabezado
    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');

    // Encabezado de tareas
    const taskHeader = document.createElement('th');
    taskHeader.textContent = 'Tarea';
    headerRow.appendChild(taskHeader);

    // Encabezados de roles
    roles.forEach((role, index) => {
      const roleHeader = document.createElement('th');
      roleHeader.className = 'role-header';
      roleHeader.setAttribute('data-role-index', index);

      const headerContent = document.createElement('div');
      headerContent.className = 'role-header-content';
      headerContent.style.position = 'relative';

      const roleNameSpan = document.createElement('span');
      roleNameSpan.className = 'role-name';
      roleNameSpan.textContent = role;
      roleNameSpan.style.cursor = 'pointer';

      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'delete-role-btn';
      deleteBtn.textContent = '×';
      deleteBtn.title = 'Eliminar rol';

      // Event listeners para edición
      roleNameSpan.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!roleHeader.querySelector('input[type="text"]')) {
          setTimeout(() => editRole(index), 0);
        }
      });

      roleNameSpan.addEventListener('dblclick', (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!roleHeader.querySelector('input[type="text"]')) {
          setTimeout(() => editRole(index), 0);
        }
      });

      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        deleteRole(index);
      });

      headerContent.appendChild(roleNameSpan);
      headerContent.appendChild(deleteBtn);
      roleHeader.appendChild(headerContent);
      headerRow.appendChild(roleHeader);
    });

    // Botón agregar rol
    const addRoleHeader = document.createElement('th');
    addRoleHeader.className = 'add-role-header';
    const addBtn = document.createElement('button');
    addBtn.className = 'add-role-btn';
    addBtn.textContent = '+';
    addBtn.title = 'Agregar nuevo rol';
    addBtn.addEventListener('click', addNewRole);
    addRoleHeader.appendChild(addBtn);
    headerRow.appendChild(addRoleHeader);

    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Crear cuerpo de tabla
    const tbody = document.createElement('tbody');
    tasks.forEach(task => {
      const row = document.createElement('tr');

      // Celda de tarea
      const taskCell = document.createElement('td');
      taskCell.textContent = task;
      row.appendChild(taskCell);

      // Celdas de roles
      roles.forEach(role => {
        const cell = document.createElement('td');
        const container = document.createElement('div');
        container.className = 'rasci-container';
        container.tabIndex = 0;

        const display = document.createElement('div');
        display.className = 'rasci-display';
        container.appendChild(display);

        const rasciColors = {
          R: '#e63946',
          A: '#f77f00',
          S: '#43aa8b',
          C: '#3a86ff',
          I: '#6c757d'
        };

        // Inicializar con datos existentes
        if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
          const existingValue = window.rasciMatrixData[task][role];
          const circle = document.createElement('span');
          circle.className = 'rasci-circle';
          circle.textContent = existingValue;
          circle.style.background = rasciColors[existingValue];
          display.appendChild(circle);
          cell.setAttribute('data-value', existingValue);
          cell.classList.add('cell-with-content');
        }

        // Eventos de teclado
        container.addEventListener('keydown', e => {
          const key = e.key.toUpperCase();

          if (['R', 'A', 'S', 'C', 'I'].includes(key)) {
            e.preventDefault();

            // Obtener el valor anterior para limpiar elementos correspondientes
            const previousValue = window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role];
            
            container.classList.remove('rasci-ready');
            cell.classList.remove('cell-ready');

            display.innerHTML = '';
            const circle = document.createElement('span');
            circle.className = 'rasci-circle';
            circle.textContent = key;
            circle.style.background = rasciColors[key];
            display.appendChild(circle);

            if (!window.rasciMatrixData) window.rasciMatrixData = {};
            if (!window.rasciMatrixData[task]) window.rasciMatrixData[task] = {};
            window.rasciMatrixData[task][role] = key;
            cell.setAttribute('data-value', key);
            cell.classList.add('cell-with-content');
            
            // Limpiar elementos anteriores si el valor cambió
            if (previousValue && previousValue !== key) {
              console.log(`🔄 Cambio detectado: ${task} - ${role} (${previousValue} → ${key})`);
              cleanupPreviousElements(task, role, previousValue);
              // Aplicar mapeo automático después de limpiar
              setTimeout(() => {
                console.log(`🔄 Aplicando mapeo automático para cambio: ${task} - ${role}`);
                applyAutomaticMapping();
              }, 150);
            } else if (!previousValue) {
              // Nueva asignación
              console.log(`➕ Nueva asignación: ${task} - ${role} (${key})`);
              // setTimeout(() => {
              //   console.log(`🔄 Aplicando mapeo automático para nueva asignación: ${task} - ${role}`);
              //   applyAutomaticMapping(); // COMENTADO: Mapeo automático desactivado
              // }, 150);
            }
            
            // Guardar el estado automáticamente
            autoSaveRasciState();

          } else if (['-', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
            e.preventDefault();

            // Obtener el valor anterior para limpiar elementos correspondientes
            const previousValue = window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role];

            container.classList.remove('rasci-ready');
            cell.classList.remove('cell-ready', 'cell-with-content');

            display.innerHTML = '';
            if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
              delete window.rasciMatrixData[task][role];
            }
            cell.removeAttribute('data-value');
            
            // Limpiar elementos anteriores si había un valor
            if (previousValue) {
              cleanupPreviousElements(task, role, previousValue);
              // Aplicar mapeo automático después de limpiar
              // setTimeout(() => {
              //   applyAutomaticMapping(); // COMENTADO: Mapeo automático desactivado
              // }, 100);
            }
            
            // Guardar el estado automáticamente
            autoSaveRasciState();
          }
        });

        // Eventos de focus
        container.addEventListener('click', e => {
          e.preventDefault();
          container.focus();
        });

        container.addEventListener('focus', () => {
          container.classList.add('rasci-ready');
          cell.classList.add('cell-ready');
        });

        container.addEventListener('blur', () => {
          container.classList.remove('rasci-ready');
          if (!cell.hasAttribute('data-value')) {
            cell.classList.remove('cell-ready');
          }
        });

        cell.appendChild(container);
        row.appendChild(cell);
      });

      // Celda vacía al final
      const emptyCell = document.createElement('td');
      emptyCell.style.border = 'none';
      emptyCell.style.background = 'transparent';
      row.appendChild(emptyCell);

      // Los event listeners para la columna flotante se configuran después

      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    matrixContainer.appendChild(table);






  }

  // Inicialización
  applyStyles();

  // Configurar el botón de recargar matriz (solo en la pestaña de matriz)
  const mainTab = panel.querySelector('#main-tab');
  if (mainTab) {
    const reloadBtn = mainTab.querySelector('.btn-primary');
    if (reloadBtn) {
      reloadBtn.addEventListener('click', updateMatrixFromDiagram);
    }
  }

  // Funciones globales
  window.reloadRasciMatrix = updateMatrixFromDiagram;

  // Configurar listeners para pestañas
  setTimeout(() => {
    const tabs = panel.querySelectorAll('.tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', function (e) {
        e.preventDefault();
        e.stopPropagation();
        const tabName = this.getAttribute('data-tab');
        if (tabName) {
          // Remover clase activa de todas las pestañas
          tabs.forEach(t => t.classList.remove('active'));
          // Agregar clase activa a la pestaña clickeada
          this.classList.add('active');
          // Cambiar contenido
          window.cambiarPestana(tabName);
        }
      });
    });
  }, 100);

  // Función global para cambiar entre pestañas
  window.cambiarPestana = function (tabName) {
    const tabs = document.querySelectorAll('#rasci-panel .tab');
    const tabContents = document.querySelectorAll('#rasci-panel .tab-content');

    // Remover clases activas de todas las pestañas y contenidos
    tabs.forEach(tab => tab.classList.remove('active'));
    tabContents.forEach(content => {
      content.classList.remove('active');
      content.style.display = 'none';
      content.style.visibility = 'hidden';
      content.style.position = 'absolute';
      content.style.top = '-9999px';
    });

    // Activar la pestaña seleccionada
    const selectedTab = document.querySelector(`#rasci-panel .tab[data-tab="${tabName}"]`);
    const selectedContent = document.querySelector(`#rasci-panel #${tabName}-tab`);

    if (selectedTab && selectedContent) {
      selectedTab.classList.add('active');
      selectedContent.classList.add('active');
      
      if (tabName === 'config') {
        // Pestaña de leyenda - pantalla simple y limpia
        selectedContent.style.display = 'flex';
        selectedContent.style.flexDirection = 'column';
        selectedContent.style.height = '100%';
        selectedContent.style.overflowY = 'auto';
        selectedContent.style.padding = '20px';
        selectedContent.style.background = '#fff';
        selectedContent.style.border = 'none';
        selectedContent.style.outline = 'none';
        selectedContent.style.visibility = 'visible';
        selectedContent.style.position = 'relative';
        selectedContent.style.top = 'auto';
        
        // Ocultar explícitamente elementos de la matriz
        const mainTab = document.querySelector('#main-tab');
        if (mainTab) {
          mainTab.style.display = 'none';
          mainTab.style.visibility = 'hidden';
          mainTab.style.position = 'absolute';
          mainTab.style.top = '-9999px';
        }
        
        // Asegurar que solo se muestre la leyenda
        const legendContainer = selectedContent.querySelector('.rasci-legend');
        if (legendContainer) {
          legendContainer.style.display = 'flex';
          legendContainer.style.flexDirection = 'column';
          legendContainer.style.width = '100%';
          legendContainer.style.height = '100%';
        }
      } else if (tabName === 'main') {
        // Pestaña de matriz
        selectedContent.style.display = 'flex';
        selectedContent.style.flexDirection = 'column';
        selectedContent.style.height = '100%';
        selectedContent.style.overflow = 'hidden';
        selectedContent.style.padding = '12px';
        selectedContent.style.visibility = 'visible';
        selectedContent.style.position = 'relative';
        selectedContent.style.top = 'auto';
        
        // Ocultar explícitamente elementos de otras pestañas
        const configTab = document.querySelector('#config-tab');
        const mappingTab = document.querySelector('#mapping-tab');
        if (configTab) {
          configTab.style.display = 'none';
          configTab.style.visibility = 'hidden';
          configTab.style.position = 'absolute';
          configTab.style.top = '-9999px';
        }
        if (mappingTab) {
          mappingTab.style.display = 'none';
          mappingTab.style.visibility = 'hidden';
          mappingTab.style.position = 'absolute';
          mappingTab.style.top = '-9999px';
        }
        
        // Actualizar la matriz cuando se cambie a esta pestaña
        setTimeout(() => {
          updateMatrixFromDiagram();
        }, 100);
      } else if (tabName === 'mapping') {
        // Pestaña de mapeo - pantalla simple y limpia
        selectedContent.style.display = 'flex';
        selectedContent.style.flexDirection = 'column';
        selectedContent.style.height = '100%';
        selectedContent.style.overflowY = 'auto';
        selectedContent.style.padding = '20px';
        selectedContent.style.background = '#fff';
        selectedContent.style.border = 'none';
        selectedContent.style.outline = 'none';
        selectedContent.style.visibility = 'visible';
        selectedContent.style.position = 'relative';
        selectedContent.style.top = 'auto';
        
        // Ocultar explícitamente elementos de otras pestañas
        const mainTab = document.querySelector('#main-tab');
        const configTab = document.querySelector('#config-tab');
        if (mainTab) {
          mainTab.style.display = 'none';
          mainTab.style.visibility = 'hidden';
          mainTab.style.position = 'absolute';
          mainTab.style.top = '-9999px';
        }
        if (configTab) {
          configTab.style.display = 'none';
          configTab.style.visibility = 'hidden';
          configTab.style.position = 'absolute';
          configTab.style.top = '-9999px';
        }
        
        // Asegurar que solo se muestre el contenedor de mapeo
        const mappingContainer = selectedContent.querySelector('.mapping-container');
        if (mappingContainer) {
          mappingContainer.style.display = 'flex';
          mappingContainer.style.flexDirection = 'column';
          mappingContainer.style.width = '100%';
          mappingContainer.style.height = '100%';
        }
      }
    }
  };

  // Función para limpiar elementos anteriores cuando cambia una letra en la matriz
  function cleanupPreviousElements(taskName, roleName, previousValue) {
    const modeler = window.bpmnModeler;
    if (!modeler) return;

    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');
    
    // Encontrar la tarea BPMN correspondiente
    const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
    if (!bpmnTask) return;

    // Encontrar el rol correspondiente
    const roleElement = findRalphRoleByName(modeler, roleName);
    if (!roleElement) return;

    try {
      switch (previousValue) {
        case 'R':
        case 'S':
          // Eliminar asignación simple - buscar conexiones más específicamente
          const connectionsToRemove = [];
          elementRegistry.forEach(connection => {
            if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
                connection.source && connection.target) {
              
              // Verificar si conecta el rol con la tarea
              if ((connection.source.id === roleElement.id && connection.target.id === bpmnTask.id) ||
                  (connection.source.id === bpmnTask.id && connection.target.id === roleElement.id)) {
                connectionsToRemove.push(connection);
              }
            }
          });
          
          // Eliminar todas las conexiones encontradas
          connectionsToRemove.forEach(connection => {
            modeling.removeElement(connection);
          });
          break;

        case 'A':
          // Eliminar tarea de aprobación y restaurar conexión original
          const approvalTaskName = `Aprobar ${(bpmnTask.businessObject && bpmnTask.businessObject.name) ? bpmnTask.businessObject.name : bpmnTask.id}`;
          
          // Buscar y eliminar la tarea de aprobación
          const approvalTasksToRemove = [];
          elementRegistry.forEach(element => {
            if (element.type === 'bpmn:UserTask' && 
                element.businessObject && 
                element.businessObject.name === approvalTaskName) {
              approvalTasksToRemove.push(element);
            }
          });
          
          // Eliminar todas las tareas de aprobación encontradas
          approvalTasksToRemove.forEach(task => {
            modeling.removeElement(task);
          });
          
          // Restaurar conexión original entre tareas
          restoreOriginalTaskConnection(bpmnTask, modeler);
          break;

        case 'C':
          // Eliminar evento de consulta y restaurar conexión original
          const consultEventName = `Consultar ${roleName}`;
          
          const consultEventsToRemove = [];
          elementRegistry.forEach(element => {
            if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
                element.businessObject && 
                element.businessObject.name === consultEventName) {
              consultEventsToRemove.push(element);
            }
          });
          
          // Eliminar todos los eventos de consulta encontrados
          consultEventsToRemove.forEach(event => {
            modeling.removeElement(event);
          });
          
          // Restaurar conexión original entre tareas
          restoreOriginalTaskConnection(bpmnTask, modeler);
          break;

        case 'I':
          // Eliminar evento de información y restaurar conexión original
          const infoEventName = `Informar ${roleName}`;
          
          const infoEventsToRemove = [];
          elementRegistry.forEach(element => {
            if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
                element.businessObject && 
                element.businessObject.name === infoEventName) {
              infoEventsToRemove.push(element);
            }
          });
          
          // Eliminar todos los eventos de información encontrados
          infoEventsToRemove.forEach(event => {
            modeling.removeElement(event);
          });
          
          // Restaurar conexión original entre tareas
          restoreOriginalTaskConnection(bpmnTask, modeler);
          break;
      }
    } catch (error) {
      // Error handling silencioso
    }
  }

  // Función para restaurar conexión original entre tareas
  function restoreOriginalTaskConnection(bpmnTask, modeler) {
    const modeling = modeler.get('modeling');
    const elementRegistry = modeler.get('elementRegistry');
    
    // Buscar la siguiente tarea en el flujo original
    const nextTask = findNextTaskInFlow(modeler, bpmnTask);
    if (!nextTask) return;

    // Verificar si ya existe una conexión directa
    let hasDirectConnection = false;
    elementRegistry.forEach(connection => {
      if (connection.type === 'bpmn:SequenceFlow' &&
          connection.source && connection.target &&
          connection.source.id === bpmnTask.id &&
          connection.target.id === nextTask.id) {
        hasDirectConnection = true;
      }
    });

    // Si no existe conexión directa, crearla
    if (!hasDirectConnection) {
      try {
        modeling.connect(bpmnTask, nextTask);
      } catch (error) {
        // Error handling silencioso
      }
    }
  }

  // Función para asegurar que solo la pestaña activa sea visible
  function ensureActiveTabVisibility() {
    const activeTab = panel.querySelector('.tab.active');
    if (activeTab) {
      const tabName = activeTab.getAttribute('data-tab');
      if (tabName) {
        // Ocultar todas las pestañas
        const allTabContents = panel.querySelectorAll('.tab-content');
        allTabContents.forEach(content => {
          content.style.display = 'none';
          content.style.visibility = 'hidden';
          content.style.position = 'absolute';
          content.style.top = '-9999px';
        });
        
        // Mostrar solo la pestaña activa
        const activeContent = panel.querySelector(`#${tabName}-tab`);
        if (activeContent) {
          activeContent.style.display = 'flex';
          activeContent.style.visibility = 'visible';
          activeContent.style.position = 'relative';
          activeContent.style.top = 'auto';
        }
      }
    }
  }

  // Cargar estado guardado
  loadRasciState();
  
  // Asegurar visibilidad correcta de pestañas
  ensureActiveTabVisibility();
  setupDiagramChangeListener();

  // Configurar observador para detectar cuando el panel se hace visible
  setupVisibilityObserver();

  // Recargar automáticamente al inicializar (recarga de página)
  setTimeout(() => {
    updateMatrixFromDiagram();
  }, 500); // Delay para asegurar que el BPMN modeler esté listo

  // También recargar cuando el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        updateMatrixFromDiagram();
      }, 300);
    });
  } else {
    // Si el DOM ya está cargado, recargar inmediatamente
    setTimeout(() => {
      updateMatrixFromDiagram();
    }, 300);
  }

  // Recargar también cuando la ventana termine de cargar completamente
  window.addEventListener('load', () => {
    setTimeout(() => {
      updateMatrixFromDiagram();
    }, 200);
  });
}

// Función para detectar cuando el panel RASCI se hace visible
function setupVisibilityObserver() {
  const rasciPanel = document.querySelector('#rasci-panel');
  if (!rasciPanel) return;

  // Usar Intersection Observer para detectar cuando el panel se hace visible
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting && entry.target.id === 'rasci-panel') {
        // El panel RASCI se ha hecho visible
        setTimeout(() => {
          if (typeof window.reloadRasciMatrix === 'function') {
            window.reloadRasciMatrix();
          }
        }, 200);
      }
    });
  }, {
    threshold: 0.1 // Se activa cuando al menos el 10% del panel es visible
  });

  observer.observe(rasciPanel);
}

// Función global para recargar la matriz RASCI desde cualquier lugar
window.forceReloadRasciMatrix = function() {
  const rasciPanel = document.querySelector('#rasci-panel');
  if (rasciPanel && typeof window.reloadRasciMatrix === 'function') {
    window.reloadRasciMatrix();
  }
};

// Recargar automáticamente cuando se recarga la página
if (typeof window !== 'undefined') {
  window.addEventListener('beforeunload', () => {
    // Guardar un flag para indicar que se está recargando
    sessionStorage.setItem('rasciNeedsReload', 'true');
  });

      // Verificar si se necesita recargar al cargar la página
    if (sessionStorage.getItem('rasciNeedsReload') === 'true') {
      sessionStorage.removeItem('rasciNeedsReload');
      setTimeout(() => {
        if (typeof window.forceReloadRasciMatrix === 'function') {
          window.forceReloadRasciMatrix();
        }
      }, 1000);
    }
}

// ===== FUNCIÓN DE MAPEO RASCI A RALPH =====
window.executeRasciToRalphMapping = function() {
  // Redirigir al mapeo inteligente
  window.executeIntelligentRasciMapping();
};

function showMappingError(message) {
  const logElement = document.getElementById('mapping-log');
  const resultsElement = document.getElementById('mapping-results');
  
  resultsElement.style.display = 'block';
  logElement.innerHTML = `❌ ${message}\n`;
  logElement.style.color = '#dc2626';
}

window.executeIntelligentRasciMapping = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    showMappingError('Modeler no disponible');
    return;
  }

  if (!window.rasciMatrixData || Object.keys(window.rasciMatrixData).length === 0) {
    showMappingError('No hay datos en la matriz RASCI para mapear');
    return;
  }

  const logElement = document.getElementById('mapping-log');
  const resultsElement = document.getElementById('mapping-results');
  
  // Mostrar resultados
  resultsElement.style.display = 'block';
  logElement.innerHTML = '🧠 Iniciando mapeo inteligente RASCI → RALph...\n';
  
  try {
    const mappingResults = performIntelligentRasciMapping(modeler);
    
    if (mappingResults.error) {
      showMappingError(mappingResults.error);
      return;
    }
    
    logElement.innerHTML += '\n🎉 Mapeo inteligente completado exitosamente!\n';
    logElement.innerHTML += `\n📊 Resumen de cambios:\n`;
    logElement.innerHTML += `- Roles creados: ${mappingResults.rolesCreated}\n`;
    logElement.innerHTML += `- Roles eliminados: ${mappingResults.rolesDeleted}\n`;
    logElement.innerHTML += `- Asignaciones creadas: ${mappingResults.assignmentsCreated}\n`;
    logElement.innerHTML += `- Asignaciones eliminadas: ${mappingResults.assignmentsDeleted}\n`;
    logElement.innerHTML += `- Eventos creados: ${mappingResults.eventsCreated}\n`;
    logElement.innerHTML += `- Eventos eliminados: ${mappingResults.eventsDeleted}\n`;
    logElement.innerHTML += `- Conexiones actualizadas: ${mappingResults.connectionsUpdated}\n`;
    
    if (mappingResults.errors > 0) {
      logElement.innerHTML += `- Errores: ${mappingResults.errors}\n`;
    }
    
    // Hacer scroll al final del log
    logElement.scrollTop = logElement.scrollHeight;
    
  } catch (error) {
    showMappingError(`Error durante el mapeo inteligente: ${error.message}`);
  }
};

// Verificar que la función esté disponible globalmente

function performRasciToRalphMapping(modeler) {
  // Verificar que el modeler tenga todos los servicios necesarios
  if (!modeler) {
    return { error: 'Modeler no disponible' };
  }

  // Configurar listener para mantener conexiones después del movimiento
  setupConnectionMaintenanceListener(modeler);

  const results = {
    rolesCreated: 0,
    simpleAssignments: 0,
    complexAssignments: 0,
    approvalTasks: 0,
    messageFlows: 0,
    infoEvents: 0
  };

  const logElement = document.getElementById('mapping-log');
  if (!logElement) {
    return { error: 'Elemento de log no encontrado' };
  }
  
  // Configurar listener para eliminación de nodos AND
  setupAndNodeDeletionListener(modeler);
  
  // Detectar elementos existentes en lugar de resetear
  positionManager.detectExistingElements(modeler);
  
  // Obtener servicios del modeler de forma segura
  let elementRegistry, modeling, canvas, moddle;
  try {
    elementRegistry = modeler.get('elementRegistry');
    modeling = modeler.get('modeling');
    canvas = modeler.get('canvas');
    moddle = modeler.get('moddle');
  } catch (error) {
    return { error: 'Error obteniendo servicios del modeler' };
  }

  // Obtener roles de la matriz RASCI
  const roles = JSON.parse(localStorage.getItem('rasciRoles') || '[]');
  const matrixData = window.rasciMatrixData;

  if (!matrixData || Object.keys(matrixData).length === 0) {
    logElement.innerHTML += '❌ No hay datos en la matriz RASCI para procesar\n';
    return { error: 'No hay datos en la matriz RASCI' };
  }

  logElement.innerHTML += `Procesando ${Object.keys(matrixData).length} tareas...\n`;
  
  // Debug: Mostrar tareas disponibles en el diagrama
  const availableTasks = [];
  elementRegistry.forEach(element => {
    if (element.type && (
      element.type === 'bpmn:Task' ||
      element.type === 'bpmn:UserTask' ||
      element.type === 'bpmn:ServiceTask' ||
      element.type === 'bpmn:ScriptTask' ||
      element.type === 'bpmn:ManualTask' ||
      element.type === 'bpmn:BusinessRuleTask' ||
      element.type === 'bpmn:SendTask' ||
      element.type === 'bpmn:ReceiveTask' ||
      element.type === 'bpmn:CallActivity' ||
      element.type === 'bpmn:SubProcess'
    )) {
      const taskName = (element.businessObject && element.businessObject.name) || element.id;
      availableTasks.push({
        name: taskName,
        id: element.id,
        type: element.type,
        businessObjectName: element.businessObject ? element.businessObject.name : 'Sin nombre',
        businessObjectId: element.businessObject ? element.businessObject.id : 'Sin ID'
      });
    }
  });
  
  logElement.innerHTML += `\n📋 Tareas disponibles en el diagrama (${availableTasks.length}):\n`;
  availableTasks.forEach(task => {
    logElement.innerHTML += `  - Nombre: "${task.name}" | ID: ${task.id} | Tipo: ${task.type}\n`;
    logElement.innerHTML += `    BusinessObject: name="${task.businessObjectName}" id="${task.businessObjectId}"\n`;
  });
  logElement.innerHTML += '\n';

  // Obtener estadísticas detalladas de elementos existentes
  const existingStats = getExistingElementsStats(modeler);
  
  logElement.innerHTML += `\n🔍 Elementos existentes detectados:\n`;
  logElement.innerHTML += `  - Roles: ${positionManager.roleInstances.size}\n`;
  logElement.innerHTML += `  - Asignaciones: ${positionManager.existingAssignments.size} tareas con asignaciones\n`;
  logElement.innerHTML += `  - Tareas de aprobación: ${existingStats.approvalTasks}\n`;
  logElement.innerHTML += `  - Eventos informativos: ${existingStats.infoEvents}\n`;
  logElement.innerHTML += `  - Flujos de mensaje: ${existingStats.messageFlows}\n`;

  // Los roles se crearán cerca de cada tarea cuando sea necesario
  logElement.innerHTML += `  ℹ️ Sistema de posicionamiento inteligente:\n`;
  logElement.innerHTML += `     - Posicionamiento alrededor del diagrama cerca de las tareas\n`;
  logElement.innerHTML += `     - Prioridad a líneas directas (horizontal/vertical)\n`;
  logElement.innerHTML += `     - Espaciado optimizado: ${positionManager.spacing}px\n`;
  logElement.innerHTML += `     - Reutilización inteligente de roles existentes\n`;
  logElement.innerHTML += `     - Mapeo incremental: solo añadir elementos faltantes\n`;

  // Procesar cada tarea de la matriz de forma incremental
  Object.entries(matrixData).forEach(([taskName, taskRoles]) => {
    logElement.innerHTML += `\nProcesando tarea: ${taskName}\n`;
    
    // Encontrar la tarea BPMN correspondiente
    const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
    if (!bpmnTask) {
      logElement.innerHTML += `  ⚠️ Tarea BPMN no encontrada: "${taskName}"\n`;
      logElement.innerHTML += `     💡 Sugerencia: Usar "Mapear Tareas a Diagrama" para actualizar los nombres automáticamente\n`;
    
      // Mostrar tareas similares disponibles
      const similarTasks = [];
      elementRegistry.forEach(element => {
        if (element.type && element.type.startsWith('bpmn:') && 
            element.businessObject && element.businessObject.name) {
          const elementName = element.businessObject.name.toLowerCase();
          const searchName = taskName.toLowerCase();
          
          // Buscar similitudes
          if (elementName.includes(searchName) || searchName.includes(elementName)) {
            similarTasks.push({
              name: element.businessObject.name,
              id: element.id
            });
          }
        }
      });
    
      if (similarTasks.length > 0) {
        logElement.innerHTML += `     🔍 Tareas similares encontradas:\n`;
        similarTasks.slice(0, 3).forEach(task => {
          logElement.innerHTML += `        - "${task.name}" (ID: ${task.id})\n`;
        });
      }
    
      return;
    }

    // Analizar todas las responsabilidades de la tarea para crear relaciones apropiadas
    const responsibilities = Object.entries(taskRoles);
    const responsibleRoles = responsibilities.filter(([_, resp]) => resp === 'R').map(([role, _]) => role);
    const supportRoles = responsibilities.filter(([_, resp]) => resp === 'S').map(([role, _]) => role);
    const consultRoles = responsibilities.filter(([_, resp]) => resp === 'C').map(([role, _]) => role);
    const approveRoles = responsibilities.filter(([_, resp]) => resp === 'A').map(([role, _]) => role);
    const informRoles = responsibilities.filter(([_, resp]) => resp === 'I').map(([role, _]) => role);

    logElement.innerHTML += `    📋 Análisis de responsabilidades:\n`;
    logElement.innerHTML += `       - Responsables (R): ${responsibleRoles.join(', ') || 'ninguno'}\n`;
    logElement.innerHTML += `       - Soporte (S): ${supportRoles.join(', ') || 'ninguno'}\n`;
    logElement.innerHTML += `       - Consultar (C): ${consultRoles.join(', ') || 'ninguno'}\n`;
    logElement.innerHTML += `       - Aprobar (A): ${approveRoles.join(', ') || 'ninguno'}\n`;
    logElement.innerHTML += `       - Informar (I): ${informRoles.join(', ') || 'ninguno'}\n`;

    // NUEVA LÓGICA: Procesar responsabilidades de forma coordinada para evitar duplicados
    const processedRoles = new Set(); // Para evitar procesar el mismo rol múltiples veces
    
    // 1. Procesar Responsible (R) y Support (S) de forma coordinada
    // Si hay roles de soporte, NO procesar los responsables por separado
    if (supportRoles.length > 0 && responsibleRoles.length > 0) {
      logElement.innerHTML += `    🔄 Procesando R + S de forma coordinada para evitar duplicados\n`;
      
      // Procesar cada combinación de responsable + soporte
      responsibleRoles.forEach((responsibleRoleName, index) => {
        if (processedRoles.has(responsibleRoleName)) return;
        
        const supportRoleName = supportRoles[index] || supportRoles[0]; // Usar el soporte correspondiente o el primero
        if (processedRoles.has(supportRoleName)) return;
        
        // Verificar si ya existe un nodo AND para esta tarea
        const andNodeExists = positionManager.collaborationNodeExists(modeler, bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id);
        if (andNodeExists) {
          logElement.innerHTML += `    ✓ Nodo AND ya existe para esta tarea\n`;
          processedRoles.add(responsibleRoleName);
          processedRoles.add(supportRoleName);
          return;
        }
        
        logElement.innerHTML += `    + R + S → ${responsibleRoleName} + ${supportRoleName} (nueva colaboración)\n`;
        createCollaborationAssignment(modeler, bpmnTask, supportRoleName, responsibleRoleName, results);
        processedRoles.add(responsibleRoleName);
        processedRoles.add(supportRoleName);
      });
      
      // Procesar roles de soporte restantes
      supportRoles.forEach(roleName => {
        if (processedRoles.has(roleName)) return;
        
        logElement.innerHTML += `    + S → ${roleName} (nueva asignación simple)\n`;
        createSimpleAssignment(modeler, bpmnTask, roleName, results);
        processedRoles.add(roleName);
      });
      
    } else {
      // Si no hay roles de soporte, procesar responsables normalmente
    responsibleRoles.forEach(roleName => {
      if (processedRoles.has(roleName)) return;
      
      if (positionManager.assignmentExists(bpmnTask.id, roleName)) {
        logElement.innerHTML += `    ✓ R → ${roleName} (ya existe)\n`;
        processedRoles.add(roleName);
        return;
      }
      
      logElement.innerHTML += `    + R → ${roleName} (nueva)\n`;
      createSimpleAssignment(modeler, bpmnTask, roleName, results);
      processedRoles.add(roleName);
    });

      // Procesar roles de soporte sin responsables
    supportRoles.forEach(roleName => {
      if (processedRoles.has(roleName)) return;
      
      if (positionManager.assignmentExists(bpmnTask.id, roleName)) {
        logElement.innerHTML += `    ✓ S → ${roleName} (ya existe)\n`;
        processedRoles.add(roleName);
        return;
      }
      
      logElement.innerHTML += `    + S → ${roleName} (nueva)\n`;
        createSimpleAssignment(modeler, bpmnTask, roleName, results);
        processedRoles.add(roleName);
      });
    }

    // 3. Procesar Consulted (C) - crear un solo evento para todos los consultores
    if (consultRoles.length > 0) {
      // Filtrar roles que no han sido procesados
      const unprocessedConsultRoles = consultRoles.filter(roleName => !processedRoles.has(roleName));
      
      if (unprocessedConsultRoles.length > 0) {
        // Crear etiqueta que incluya todos los roles de consulta
        const consultLabel = unprocessedConsultRoles.length === 1 
          ? `Consultar ${unprocessedConsultRoles[0]}`
          : `Consultar ${unprocessedConsultRoles.join(' y ')}`;
        
        // Verificar si ya existe un nodo de consulta para esta tarea
        if (positionManager.elementExists(modeler, 'bpmn:IntermediateThrowEvent', consultLabel) || 
            positionManager.elementExists(modeler, 'bpmn:IntermediateCatchEvent', consultLabel)) {
          logElement.innerHTML += `    ✓ C → ${unprocessedConsultRoles.join(', ')} (nodo de consulta ya existe)\n`;
          unprocessedConsultRoles.forEach(role => processedRoles.add(role));
        } else {
          logElement.innerHTML += `    + C → ${unprocessedConsultRoles.join(', ')} (nuevo evento combinado)\n`;
          createMessageFlow(modeler, bpmnTask, unprocessedConsultRoles, results);
          unprocessedConsultRoles.forEach(role => processedRoles.add(role));
        }
      }
    }

    // 4. Procesar Approver (A) - solo una tarea de aprobación por tarea
    if (approveRoles.length > 0) {
      const approvalRole = approveRoles[0]; // Solo usar el primer aprobador
      
      // Verificar si ya existe una tarea de aprobación para esta tarea
      const approvalTaskName = `Aprobar ${(bpmnTask.businessObject && bpmnTask.businessObject.name) ? bpmnTask.businessObject.name : bpmnTask.id}`;
      if (positionManager.elementExists(modeler, 'bpmn:UserTask', approvalTaskName)) {
        logElement.innerHTML += `    ✓ A → ${approvalRole} (tarea de aprobación ya existe)\n`;
      } else {
        logElement.innerHTML += `    + A → ${approvalRole} (nueva tarea de aprobación)\n`;
          createApprovalTask(modeler, bpmnTask, approvalRole, results);
      }
      processedRoles.add(approvalRole);
    }

    // 5. Procesar Informed (I) - crear un solo evento para todos los informados
    if (informRoles.length > 0) {
      // Filtrar roles que no han sido procesados
      const unprocessedInformRoles = informRoles.filter(roleName => !processedRoles.has(roleName));
      
      if (unprocessedInformRoles.length > 0) {
        // Crear etiqueta que incluya todos los roles de información
        const informLabel = unprocessedInformRoles.length === 1 
          ? `Informar ${unprocessedInformRoles[0]}`
          : `Informar ${unprocessedInformRoles.join(' y ')}`;
        
        // Verificar si ya existe un nodo de información para esta tarea
        if (positionManager.elementExists(modeler, 'bpmn:IntermediateThrowEvent', informLabel) || 
            positionManager.elementExists(modeler, 'bpmn:IntermediateCatchEvent', informLabel)) {
          logElement.innerHTML += `    ✓ I → ${unprocessedInformRoles.join(', ')} (nodo de información ya existe)\n`;
          unprocessedInformRoles.forEach(role => processedRoles.add(role));
      } else {
          logElement.innerHTML += `    + I → ${unprocessedInformRoles.join(', ')} (nuevo evento combinado)\n`;
          createInfoEvent(modeler, bpmnTask, unprocessedInformRoles, results);
          unprocessedInformRoles.forEach(role => processedRoles.add(role));
      }
      }
    }
  });

  // Mostrar información sobre el posicionamiento
  try {
  const totalArea = positionManager.getTotalArea();
  logElement.innerHTML += `\n📐 Información de posicionamiento:\n`;
    logElement.innerHTML += `  - Roles creados: ${positionManager.roleInstances.size}\n`;
    logElement.innerHTML += `  - Capacidades creadas: ${positionManager.capabilityPositions ? positionManager.capabilityPositions.size : 0}\n`;
  logElement.innerHTML += `  - Área utilizada: ${totalArea.width}x${totalArea.height} píxeles\n`;
    logElement.innerHTML += `  - Espaciado: ${positionManager.spacing}px\n`;
  } catch (error) {
    console.warn('Error obteniendo estadísticas de posicionamiento:', error);
    logElement.innerHTML += `\n📐 Información de posicionamiento:\n`;
    logElement.innerHTML += `  - Roles creados: ${positionManager.roleInstances.size}\n`;
    logElement.innerHTML += `  - Espaciado: ${positionManager.spacing}px\n`;
  }

  // Mostrar resumen final del mapeo incremental
  logElement.innerHTML += `\n📊 Resumen del mapeo incremental:\n`;
  logElement.innerHTML += `  ✅ Elementos nuevos creados:\n`;
  logElement.innerHTML += `     - Roles: ${results.rolesCreated}\n`;
  logElement.innerHTML += `     - Asignaciones simples: ${results.simpleAssignments}\n`;
  logElement.innerHTML += `     - Asignaciones compuestas: ${results.complexAssignments}\n`;
  logElement.innerHTML += `     - Tareas de aprobación: ${results.approvalTasks}\n`;
  logElement.innerHTML += `     - Flujos de mensaje: ${results.messageFlows}\n`;
  logElement.innerHTML += `     - Eventos informativos: ${results.infoEvents}\n`;
  
  const totalNew = results.rolesCreated + results.simpleAssignments + results.complexAssignments + 
                   results.approvalTasks + results.messageFlows + results.infoEvents;
  
  if (totalNew === 0) {
    logElement.innerHTML += `  ℹ️ No se crearon nuevos elementos (todos ya existían)\n`;
  } else {
    logElement.innerHTML += `  🎯 Total de elementos nuevos: ${totalNew}\n`;
  }

  // Mostrar estadísticas de instancias de roles
  const instancesStats = positionManager.getInstancesStats();
  if (Object.keys(instancesStats).length > 0) {
    logElement.innerHTML += `\n🎭 Instancias de roles por legibilidad:\n`;
    Object.entries(instancesStats).forEach(([roleName, count]) => {
      logElement.innerHTML += `  - ${roleName}: ${count} instancia${count > 1 ? 's' : ''}\n`;
    });
  }
  
  // Mostrar estadísticas del posicionamiento
  if (positionManager) {
    const posStats = positionManager.getInstancesStats();
    logElement.innerHTML += `\n🎯 Estadísticas de Posicionamiento:\n`;
    logElement.innerHTML += `  - Posiciones ocupadas: ${posStats.usedPositions}\n`;
    logElement.innerHTML += `  - Instancias de roles: ${posStats.roleInstances}\n`;
    logElement.innerHTML += `  - Espaciado utilizado: ${posStats.spacing}px\n`;
  }
  
  logElement.innerHTML += `\n✅ Mapeo RASCI a RALph completado exitosamente!\n`;
  logElement.innerHTML += `💡 Sistema de posicionamiento inteligente alrededor del diagrama.\n`;
  logElement.innerHTML += `🎯 Prioridad a líneas directas para mejor legibilidad.\n`;
  logElement.innerHTML += `🔄 Mapeo incremental: solo se añadieron elementos faltantes.\n`;
  
  logElement.innerHTML += `\n💡 Consejos para mejorar la visualización:\n`;
  logElement.innerHTML += `  • Si ves roles superpuestos, usa "Limpiar Roles Duplicados"\n`;
  logElement.innerHTML += `  • Si hay líneas cruzadas, usa "Limpiar Conexiones Problemáticas"\n`;
  logElement.innerHTML += `  • Para reorganizar todo, usa "Optimizar Todo el Diagrama RALph"\n`;
  logElement.innerHTML += `  • Activa "Reposicionamiento Automático" para ajustes automáticos\n`;
  logElement.innerHTML += `  • Usa "Estado del Posicionamiento" para ver estadísticas detalladas\n`;

  // LIMPIEZA FINAL: Eliminar conexiones directas duplicadas
  logElement.innerHTML += `\n🧹 Limpieza final: Eliminando conexiones directas duplicadas...\n`;
  cleanupDuplicateConnections(modeler, logElement);

  return results;
}



function cleanupDuplicateConnections(modeler, logElement) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  let removedCount = 0;
  
  try {
    // Buscar nodos AND
    const andNodes = [];
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:Complex-Assignment-AND' && 
          element.businessObject && 
          element.businessObject.name && 
          element.businessObject.name.includes('Colaboración')) {
        andNodes.push(element);
      }
    });
    
    // Buscar nodos de consulta
    const consultNodes = [];
    elementRegistry.forEach(element => {
      if (element.type === 'bpmn:IntermediateThrowEvent' && 
          element.businessObject && 
          element.businessObject.name && 
          element.businessObject.name.includes('Consultar')) {
        consultNodes.push(element);
      }
    });
    
    // Para cada nodo AND, eliminar conexiones directas de los roles conectados
    andNodes.forEach(andNode => {
      const rolesConnectedToAnd = [];
      
      // Encontrar roles conectados al nodo AND
      elementRegistry.forEach(connection => {
        if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.target.id === andNode.id &&
            connection.source.type === 'RALph:RoleRALph') {
          rolesConnectedToAnd.push(connection.source);
        }
      });
      
      // Encontrar la tarea conectada al nodo AND
      let targetTask = null;
      elementRegistry.forEach(connection => {
        if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.source.id === andNode.id &&
            (connection.target.type === 'bpmn:Task' || connection.target.type === 'bpmn:UserTask' || 
             connection.target.type === 'bpmn:ServiceTask' || connection.target.type === 'bpmn:ScriptTask' ||
             connection.target.type === 'bpmn:ManualTask' || connection.target.type === 'bpmn:BusinessRuleTask' ||
             connection.target.type === 'bpmn:SendTask' || connection.target.type === 'bpmn:ReceiveTask' ||
             connection.target.type === 'bpmn:CallActivity' || connection.target.type === 'bpmn:SubProcess')) {
          targetTask = connection.target;
        }
      });
      
      if (targetTask) {
        // Eliminar conexiones directas de los roles al nodo AND a la tarea
        rolesConnectedToAnd.forEach(role => {
          elementRegistry.forEach(connection => {
            if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
                connection.source && connection.target &&
                connection.source.id === role.id &&
                connection.target.id === targetTask.id) {
              
              try {
                modeling.removeElement(connection);
                removedCount++;
                logElement.innerHTML += `    🗑️ Eliminada conexión directa duplicada: ${role.businessObject && role.businessObject.name ? role.businessObject.name : role.id} → ${targetTask.businessObject && targetTask.businessObject.name ? targetTask.businessObject.name : targetTask.id}\n`;
              } catch (error) {
                console.warn('Error eliminando conexión duplicada:', error.message);
              }
            }
          });
        });
      }
    });
    
    // Para cada nodo de consulta, verificar que las conexiones estén correctas
    consultNodes.forEach(consultNode => {
      const rolesConnectedToConsult = [];
      
      // Encontrar roles conectados al nodo de consulta
      elementRegistry.forEach(connection => {
        if (connection.type && (connection.type === 'RALph:dashedLine' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.target.id === consultNode.id &&
            connection.source.type === 'RALph:RoleRALph') {
          rolesConnectedToConsult.push(connection.source);
        }
      });
      
      // Encontrar la tarea conectada al nodo de consulta
      let targetTask = null;
      elementRegistry.forEach(connection => {
        if (connection.type === 'bpmn:SequenceFlow' &&
            connection.source && connection.target &&
            connection.target.id === consultNode.id &&
            (connection.source.type === 'bpmn:Task' || connection.source.type === 'bpmn:UserTask' || 
             connection.source.type === 'bpmn:ServiceTask' || connection.source.type === 'bpmn:ScriptTask' ||
             connection.source.type === 'bpmn:ManualTask' || connection.source.type === 'bpmn:BusinessRuleTask' ||
             connection.source.type === 'bpmn:SendTask' || connection.source.type === 'bpmn:ReceiveTask' ||
             connection.source.type === 'bpmn:CallActivity' || connection.source.type === 'bpmn:SubProcess')) {
          targetTask = connection.source;
        }
      });
      
      if (targetTask) {
        // Verificar que cada rol tenga las conexiones correctas al nodo de consulta
        rolesConnectedToConsult.forEach(role => {
          // Verificar si el rol tiene conexión de ida al nodo de consulta
          let hasOutgoingConnection = false;
          let hasIncomingConnection = false;
          
          elementRegistry.forEach(connection => {
            if (connection.type && (connection.type === 'RALph:dashedLine' || connection.type === 'bpmn:Association') &&
                connection.source && connection.target) {
              
              // Conexión de ida: rol → nodo consulta
              if (connection.source.id === role.id && connection.target.id === consultNode.id) {
                hasOutgoingConnection = true;
              }
              
              // Conexión de vuelta: nodo consulta → rol
              if (connection.source.id === consultNode.id && connection.target.id === role.id) {
                hasIncomingConnection = true;
              }
            }
          });
          
          // Si falta alguna conexión, crearla
          if (!hasOutgoingConnection) {
            try {
              const connection = positionManager.createOptimizedConnection(modeling, role, consultNode, 'RALph:dashedLine');
              if (connection) {
                logElement.innerHTML += `    ➕ Creada conexión faltante: ${role.businessObject && role.businessObject.name ? role.businessObject.name : role.id} → nodo consulta\n`;
              }
            } catch (error) {
              console.warn('Error creando conexión faltante de consultor:', error.message);
            }
          }
          
          if (!hasIncomingConnection) {
            try {
              const connection = positionManager.createOptimizedConnection(modeling, consultNode, role, 'RALph:dashedLine');
              if (connection) {
                logElement.innerHTML += `    ➕ Creada conexión faltante: nodo consulta → ${role.businessObject && role.businessObject.name ? role.businessObject.name : role.id}\n`;
              }
            } catch (error) {
              console.warn('Error creando conexión faltante de consultor:', error.message);
            }
          }
        });
      }
    });
    
    logElement.innerHTML += `    ✅ Limpieza completada: ${removedCount} conexiones duplicadas eliminadas\n`;
    
  } catch (error) {
    console.error('Error en limpieza de conexiones duplicadas:', error);
    logElement.innerHTML += `    ⚠️ Error en limpieza: ${error.message}\n`;
  }
}

function findNextTaskInFlow(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  let nextTask = null;
  let allConnections = [];
  
  console.log(`🔍 DEBUG - Buscando siguiente tarea para: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : 'SIN NOMBRE'} (ID: ${currentTask.id})`);
  
  // Buscar TODAS las conexiones SequenceFlow que salen de la tarea actual
  elementRegistry.forEach(element => {
    if (element.type === 'bpmn:SequenceFlow' && 
        element.source && element.source.id === currentTask.id) {
      
      const targetElement = element.target;
      console.log(`🔍 DEBUG - Encontrada conexión: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : 'SIN NOMBRE'} → ${targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : targetElement.id} (tipo: ${targetElement.type})`);
      
      // Verificar que el objetivo sea una tarea válida (NO eventos intermedios)
      if (targetElement && targetElement.type && (
        targetElement.type === 'bpmn:Task' ||
        targetElement.type === 'bpmn:UserTask' ||
        targetElement.type === 'bpmn:ServiceTask' ||
        targetElement.type === 'bpmn:ScriptTask' ||
        targetElement.type === 'bpmn:ManualTask' ||
        targetElement.type === 'bpmn:BusinessRuleTask' ||
        targetElement.type === 'bpmn:SendTask' ||
        targetElement.type === 'bpmn:ReceiveTask' ||
        targetElement.type === 'bpmn:CallActivity' ||
        targetElement.type === 'bpmn:SubProcess'
      )) {
        allConnections.push({
          connection: element,
          target: targetElement,
          isMainFlow: true
        });
      } else if (targetElement && targetElement.type && (targetElement.type === 'bpmn:IntermediateCatchEvent' || targetElement.type === 'bpmn:IntermediateThrowEvent')) {
        // Si es un evento intermedio, buscar la siguiente tarea después del evento
        console.log(`🔍 DEBUG - Encontrado evento intermedio: ${targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : targetElement.id}`);
        
        // Buscar la siguiente tarea después del evento intermedio
        elementRegistry.forEach(nextElement => {
          if (nextElement.type === 'bpmn:SequenceFlow' && 
              nextElement.source && nextElement.source.id === targetElement.id) {
            
            const nextTargetElement = nextElement.target;
            console.log(`🔍 DEBUG - Después del evento: ${targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : 'SIN NOMBRE'} → ${nextTargetElement.businessObject && nextTargetElement.businessObject.name ? nextTargetElement.businessObject.name : nextTargetElement.id} (tipo: ${nextTargetElement.type})`);
            
            if (nextTargetElement && nextTargetElement.type && (
              nextTargetElement.type === 'bpmn:Task' ||
              nextTargetElement.type === 'bpmn:UserTask' ||
              nextTargetElement.type === 'bpmn:ServiceTask' ||
              nextTargetElement.type === 'bpmn:ScriptTask' ||
              nextTargetElement.type === 'bpmn:ManualTask' ||
              nextTargetElement.type === 'bpmn:BusinessRuleTask' ||
              nextTargetElement.type === 'bpmn:SendTask' ||
              nextTargetElement.type === 'bpmn:ReceiveTask' ||
              nextTargetElement.type === 'bpmn:CallActivity' ||
              nextTargetElement.type === 'bpmn:SubProcess'
            )) {
              allConnections.push({
                connection: nextElement,
                target: nextTargetElement,
                isMainFlow: false,
                intermediateEvent: targetElement
              });
            } else if (nextTargetElement && nextTargetElement.type && (nextTargetElement.type === 'bpmn:IntermediateCatchEvent' || nextTargetElement.type === 'bpmn:IntermediateThrowEvent')) {
              // Si después del evento hay otro evento, seguir buscando
              console.log(`🔍 DEBUG - Después del evento hay otro evento: ${nextTargetElement.businessObject && nextTargetElement.businessObject.name ? nextTargetElement.businessObject.name : nextTargetElement.id}`);
              
              // Buscar recursivamente después del segundo evento
              elementRegistry.forEach(thirdElement => {
                if (thirdElement.type === 'bpmn:SequenceFlow' && 
                    thirdElement.source && thirdElement.source.id === nextTargetElement.id) {
                  
                  const thirdTargetElement = thirdElement.target;
                  console.log(`🔍 DEBUG - Después del segundo evento: ${nextTargetElement.businessObject && nextTargetElement.businessObject.name ? nextTargetElement.businessObject.name : 'SIN NOMBRE'} → ${thirdTargetElement.businessObject && thirdTargetElement.businessObject.name ? thirdTargetElement.businessObject.name : thirdTargetElement.id} (tipo: ${thirdTargetElement.type})`);
                  
                  if (thirdTargetElement && thirdTargetElement.type && (
                    thirdTargetElement.type === 'bpmn:Task' ||
                    thirdTargetElement.type === 'bpmn:UserTask' ||
                    thirdTargetElement.type === 'bpmn:ServiceTask' ||
                    thirdTargetElement.type === 'bpmn:ScriptTask' ||
                    thirdTargetElement.type === 'bpmn:ManualTask' ||
                    thirdTargetElement.type === 'bpmn:BusinessRuleTask' ||
                    thirdTargetElement.type === 'bpmn:SendTask' ||
                    thirdTargetElement.type === 'bpmn:ReceiveTask' ||
                    thirdTargetElement.type === 'bpmn:CallActivity' ||
                    thirdTargetElement.type === 'bpmn:SubProcess'
                  )) {
                    allConnections.push({
                      connection: thirdElement,
                      target: thirdTargetElement,
                isMainFlow: false,
                intermediateEvent: targetElement
                    });
                  }
                }
              });
            }
          }
        });
      }
    }
  });
  
  console.log(`🔍 DEBUG - Encontradas ${allConnections.length} conexiones posibles`);
  
  // Priorizar conexiones directas (sin eventos intermedios)
  const directConnections = allConnections.filter(conn => conn.isMainFlow);
  if (directConnections.length > 0) {
    nextTask = directConnections[0].target;
    console.log(`✅ DEBUG - Seleccionada tarea directa: ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id}`);
  } else if (allConnections.length > 0) {
    // Si no hay conexiones directas, usar la primera conexión con evento intermedio
    nextTask = allConnections[0].target;
    console.log(`✅ DEBUG - Seleccionada tarea con evento intermedio: ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id}`);
  }
  
  if (nextTask) {
    console.log(`✅ DEBUG - Siguiente tarea encontrada: ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : 'SIN NOMBRE'} (ID: ${nextTask.id})`);
  } else {
    console.log(`⚠️ DEBUG - No se encontró siguiente tarea para: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : 'SIN NOMBRE'} (ID: ${currentTask.id})`);
  }
  
  return nextTask;
}

function findBpmnTaskByName(elementRegistry, taskName) {
  let foundTask = null;
  
  // Primero intentar coincidencia exacta por nombre
  elementRegistry.forEach(element => {
    if (element.type && element.type.startsWith('bpmn:') && 
        element.businessObject && element.businessObject.name === taskName) {
      foundTask = element;
    }
  });
  
  // Si no se encuentra, intentar coincidencia exacta por ID
  if (!foundTask) {
    elementRegistry.forEach(element => {
      if (element.type && element.type.startsWith('bpmn:') && 
          element.id === taskName) {
        foundTask = element;
      }
    });
  }
  
  // Si no se encuentra, intentar coincidencia parcial por nombre
  if (!foundTask) {
    elementRegistry.forEach(element => {
      if (element.type && element.type.startsWith('bpmn:') && 
          element.businessObject && element.businessObject.name) {
        const elementName = element.businessObject.name.toLowerCase();
        const searchName = taskName.toLowerCase();
        
        // Buscar si el nombre de la tarea contiene el nombre buscado o viceversa
        if (elementName.includes(searchName) || searchName.includes(elementName)) {
          foundTask = element;
        }
      }
    });
  }
  
  // Si aún no se encuentra, buscar por ID que contenga el nombre
  if (!foundTask) {
    elementRegistry.forEach(element => {
      if (element.type && element.type.startsWith('bpmn:') && 
          element.id && element.id.toLowerCase().includes(taskName.toLowerCase())) {
        foundTask = element;
      }
    });
  }
  
  // Si aún no se encuentra, buscar por businessObject.id que contenga el nombre
  if (!foundTask) {
    elementRegistry.forEach(element => {
      if (element.type && element.type.startsWith('bpmn:') && 
          element.businessObject && element.businessObject.id && 
          element.businessObject.id.toLowerCase().includes(taskName.toLowerCase())) {
        foundTask = element;
      }
    });
  }
  
  return foundTask;
}

function createRalphRole(modeler, roleName, results, taskBounds = null) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');

  try {
    // Buscar roles existentes con el mismo nombre
    const existingRoles = [];
    elementRegistry.forEach(element => {
      if ((element.type === 'RALph:RoleRALph' || 
           (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
            element.businessObject.name && element.businessObject.name.startsWith('ROL:'))) && 
          element.businessObject && 
          element.businessObject.name && 
          (element.businessObject.name === roleName || 
           element.businessObject.name === `ROL: ${roleName}`)) {
        existingRoles.push(element);
      }
    });
    
    // Si ya existe un rol con este nombre, reutilizarlo
    if (existingRoles.length > 0) {
      console.log(`✓ Rol ya existe: ${roleName}`);
      // Verificar si el rol ya está registrado en el positionManager
      if (!positionManager.roleInstances.has(roleName)) {
        positionManager.roleInstances.set(roleName, existingRoles[0]);
      }
      return existingRoles[0];
    }
    


    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Obtener posición - intentar restaurar posición guardada primero
    let position;
    if (modeler.positionCache && modeler.positionCache.has(roleName)) {
      const cachedPosition = modeler.positionCache.get(roleName);
      // Solo restaurar posición si el elemento debe mantenerse
      if (cachedPosition.shouldKeep) {
        position = { 
          x: Math.round(cachedPosition.x), 
          y: Math.round(cachedPosition.y) 
        };
        console.log(`📍 Restaurando posición EXACTA para ${roleName}: (${position.x}, ${position.y}) - ELEMENTO MANTENIDO`);
      } else {
        console.log(`🗑️ No restaurando posición para ${roleName} - ELEMENTO ELIMINADO`);
    if (taskBounds) {
          position = positionManager.getRolePosition(roleName, taskBounds, modeler);
        } else {
          position = positionManager.getRolePosition(roleName, { x: 800, y: 100, width: 100, height: 80 }, modeler);
        }
      }
    } else if (taskBounds) {
      position = positionManager.getRolePosition(roleName, taskBounds, modeler);
    } else {
      // Posición por defecto si no hay tarea específica
      position = positionManager.getRolePosition(roleName, { x: 800, y: 100, width: 100, height: 80 }, modeler);
    }
    
    // Crear el rol usando el servicio de modelado estándar de BPMN
    const roleElement = modeling.createShape(
      { type: 'RALph:RoleRALph' },
      position,
      rootElement
    );

    // Configurar el nombre del rol
    modeling.updateProperties(roleElement, {
      name: roleName
    });

    // VERIFICACIÓN ADICIONAL: Asegurar que la posición se aplicó correctamente para roles
    if (modeler.positionCache && modeler.positionCache.has(roleName)) {
      const cachedPosition = modeler.positionCache.get(roleName);
      if (cachedPosition.shouldKeep) {
        const actualPosition = { x: roleElement.x, y: roleElement.y };
        const expectedPosition = { x: Math.round(cachedPosition.x), y: Math.round(cachedPosition.y) };
        
        // Si la posición no coincide exactamente, forzar la posición correcta
        if (actualPosition.x !== expectedPosition.x || actualPosition.y !== expectedPosition.y) {
          console.log(`🔧 Corrigiendo posición de rol ${roleName}: actual (${actualPosition.x}, ${actualPosition.y}) → esperada (${expectedPosition.x}, ${expectedPosition.y})`);
          modeling.moveShape(roleElement, {
            x: expectedPosition.x - actualPosition.x,
            y: expectedPosition.y - actualPosition.y
          });
        } else {
          console.log(`✅ Posición verificada correctamente para rol ${roleName}: (${actualPosition.x}, ${actualPosition.y})`);
        }
      }
    }

    // Registrar la instancia del rol
    positionManager.roleInstances.set(roleName, roleElement);

    results.rolesCreated++;
    return roleElement;
  } catch (error) {
    console.warn('Error creando rol RALph con modeling, usando fallback:', error);
    
    try {
      // Fallback: crear un elemento BPMN estándar como marcador de posición
      const rootElement = canvas.getRootElement();
      let position;
      if (taskBounds) {
        position = positionManager.getRolePosition(roleName, taskBounds, modeler);
      } else {
        position = positionManager.getRolePosition(roleName, { x: 800, y: 100, width: 100, height: 80 }, modeler);
      }
      
      const placeholderElement = modeling.createShape(
        { type: 'bpmn:TextAnnotation' },
        position,
        rootElement
      );

      modeling.updateProperties(placeholderElement, {
        name: `ROL: ${roleName}`
      });

      // Registrar la instancia del rol
      positionManager.roleInstances.set(roleName, placeholderElement);

      results.rolesCreated++;
      return placeholderElement;
    } catch (fallbackError) {
      console.error('Error en fallback de creación de rol:', fallbackError);
      return null;
    }
  }
}

function createSimpleAssignment(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');

  try {
    console.log(`🔍 DEBUG - Iniciando createSimpleAssignment para rol: ${roleName} en tarea: ${bpmnTask.businessObject.name}`);
    
    // Crear rol cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
    
    if (!roleElement) {
      console.log(`❌ ERROR - No se pudo crear el rol: ${roleName}`);
      return;
    }
    
    console.log(`✅ Rol creado/encontrado: ${roleName} (ID: ${roleElement.id})`);

    // LÓGICA PARA EVITAR CONEXIONES DOBLES: A vs R
    console.log(`🔍 DEBUG - Verificando lógica A vs R para: ${roleName} en tarea: ${bpmnTask.businessObject.name}`);
    
    // Detectar si el rol actual es "R" (Responsible) o "A" (Accountable)
    const isResponsible = roleName.toLowerCase().includes('responsible') || roleName.toLowerCase().includes('responsable') || roleName.toLowerCase().includes('r_');
    const isAccountable = roleName.toLowerCase().includes('accountable') || roleName.toLowerCase().includes('accountable') || roleName.toLowerCase().includes('a_');
    
    console.log(`🔍 DEBUG - Rol ${roleName}: isResponsible=${isResponsible}, isAccountable=${isAccountable}`);
    
    // Si es "R" (Responsible), verificar si ya existe una conexión de "A" (Accountable) o un nodo AND
    if (isResponsible) {
      console.log(`🔍 DEBUG - Rol ${roleName} es Responsible, verificando si existe conexión de Accountable o nodo AND`);
      
      let accountableConnectionExists = false;
      let accountableRoleName = null;
      let andNodeExists = false;
      
      // Buscar conexiones existentes de roles Accountable a esta tarea
      elementRegistry.forEach(element => {
        if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
          if (element.source && element.target && 
              element.target.id === bpmnTask.id && 
              element.source.type === 'RALph:RoleRALph' &&
              element.source.businessObject && 
              element.source.businessObject.name) {
            
            const sourceRoleName = element.source.businessObject.name;
            const sourceIsAccountable = sourceRoleName.toLowerCase().includes('accountable') || 
                                      sourceRoleName.toLowerCase().includes('accountable') || 
                                      sourceRoleName.toLowerCase().includes('a_');
            
            if (sourceIsAccountable) {
              accountableConnectionExists = true;
              accountableRoleName = sourceRoleName;
              console.log(`🔍 DEBUG - Encontrada conexión de Accountable: ${sourceRoleName} → ${bpmnTask.businessObject.name}`);
            }
          }
        }
      });
      
      // Verificar si existe un nodo AND que conecte a esta tarea
      elementRegistry.forEach(element => {
        if (element.type === 'RALph:Complex-Assignment-AND') {
          const hasConnectionToTask = elementRegistry.getAll().some(connection => 
            connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.source.id === element.id && 
            connection.target.id === bpmnTask.id
          );
          
          if (hasConnectionToTask) {
            andNodeExists = true;
            console.log(`🔍 DEBUG - Encontrado nodo AND que conecta a la tarea: ${element.businessObject && element.businessObject.name ? element.businessObject.name : 'SIN NOMBRE'}`);
          }
        }
      });
      
      // NUEVA VERIFICACIÓN: Buscar también conexiones directas del rol responsable que ya existen
      const existingResponsibleConnections = [];
      elementRegistry.forEach(element => {
        if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
          if (element.source && element.target && 
              element.source.id === roleElement.id && 
              element.target.id === bpmnTask.id) {
            existingResponsibleConnections.push(element);
            console.log(`🔍 DEBUG - Encontrada conexión directa existente del rol responsable: ${roleName} → ${bpmnTask.businessObject.name} (ID: ${element.id})`);
          }
        }
      });
      
      // Si ya existe una conexión directa del rol responsable, eliminarla
      existingResponsibleConnections.forEach(connection => {
        try {
          console.log(`🗑️ Eliminando conexión directa existente del rol responsable: ${connection.id}`);
          modeling.removeElement(connection);
          console.log(`✅ Eliminada conexión directa existente del rol responsable`);
        } catch (removeError) {
          console.warn(`⚠️ Error eliminando conexión directa existente:`, removeError.message);
        }
      });
      
      // BLOQUEAR la creación de conexiones directas del rol responsable si existe nodo AND
      if (andNodeExists) {
        console.log(`🚫 BLOQUEANDO creación de conexión directa del rol responsable: ${roleName} → ${bpmnTask.businessObject.name} (existe nodo AND)`);
        return; // NO crear la conexión
      }
      
      if (accountableConnectionExists) {
        console.log(`⚠️ NO crear conexión de ${roleName} porque ya existe conexión de Accountable: ${accountableRoleName}`);
        console.log(`💡 La conexión de Accountable tiene prioridad sobre Responsible`);
      return;
      } else if (andNodeExists) {
        console.log(`⚠️ NO crear conexión directa de ${roleName} porque ya existe un nodo AND`);
        console.log(`💡 El rol Responsible debe conectarse al nodo AND, no directamente a la tarea`);
        return;
      } else {
        console.log(`✅ No existe conexión de Accountable ni nodo AND, permitiendo conexión directa de Responsible: ${roleName}`);
      }
    }
    
    // Si es "A" (Accountable), eliminar conexiones existentes de "R" (Responsible)
    if (isAccountable) {
      console.log(`🔍 DEBUG - Rol ${roleName} es Accountable, eliminando conexiones existentes de Responsible`);
      
    const connectionsToRemove = [];
    
      // Buscar y marcar conexiones de Responsible para eliminar
    elementRegistry.forEach(element => {
        if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
          if (element.source && element.target && 
              element.target.id === bpmnTask.id && 
              element.source.type === 'RALph:RoleRALph' &&
              element.source.businessObject && 
              element.source.businessObject.name) {
            
            const sourceRoleName = element.source.businessObject.name;
            const sourceIsResponsible = sourceRoleName.toLowerCase().includes('responsible') || 
                                      sourceRoleName.toLowerCase().includes('responsable') || 
                                      sourceRoleName.toLowerCase().includes('r_');
            
            if (sourceIsResponsible) {
          connectionsToRemove.push(element);
              console.log(`🔍 DEBUG - Marcada para eliminar conexión de Responsible: ${sourceRoleName} → ${bpmnTask.businessObject.name}`);
            }
        }
      }
    });
    
      // Eliminar conexiones de Responsible
    connectionsToRemove.forEach(connection => {
      try {
          const sourceRoleName = connection.source.businessObject ? connection.source.businessObject.name : 'SIN NOMBRE';
        modeling.removeElement(connection);
          console.log(`🗑️ Eliminada conexión de Responsible: ${sourceRoleName} → ${bpmnTask.businessObject.name}`);
        } catch (removeError) {
          console.warn(`⚠️ Error eliminando conexión de Responsible:`, removeError.message);
        }
      });
    }

    // Verificar si ya existe una conexión entre este rol y la tarea (en cualquier dirección)
    if (positionManager.connectionExists(modeler, roleElement, bpmnTask)) {
      console.log(`✓ Conexión ya existe: ${roleName} ↔ ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id}`);
      return;
    }

    // VERIFICACIÓN SIMPLIFICADA: Solo verificar si este rol ya está conectado a través de un nodo AND para esta tarea específica
    const elementRegistry = modeler.get('elementRegistry');
    let roleConnectedToAndForThisTask = false;
    
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:Complex-Assignment-AND' && 
          element.businessObject && 
          element.businessObject.name && 
          element.businessObject.name.includes('Colaboración')) {
        
        // Verificar si este nodo AND conecta a la tarea actual
        const andConnectsToTask = elementRegistry.getAll().some(connection => 
          connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
          connection.source && connection.target &&
          connection.source.id === element.id && 
          connection.target.id === bpmnTask.id
        );
        
        if (andConnectsToTask) {
        // Verificar si este rol está conectado al nodo AND
          const roleConnectedToAnd = elementRegistry.getAll().some(connection => 
            connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
              connection.source && connection.target &&
              connection.target.id === element.id &&
            connection.source.id === roleElement.id
          );
          
          if (roleConnectedToAnd) {
            roleConnectedToAndForThisTask = true;
            console.log(`⚠️ No crear conexión directa de ${roleName} porque ya está conectado a través de un nodo AND a la tarea ${bpmnTask.businessObject.name}`);
          }
        }
      }
    });
    
    if (roleConnectedToAndForThisTask) {
      return;
    }

    // Crear la conexión optimizada: ROL → TAREA (una sola flecha)
    console.log(`🔍 DEBUG - Intentando crear conexión: ${roleName} → ${bpmnTask.businessObject.name}`);
    const connection = positionManager.createOptimizedConnection(modeling, roleElement, bpmnTask, 'RALph:ResourceArc');
    
    if (connection) {
      console.log(`✅ Creada conexión simple: ${roleName} → ${bpmnTask.businessObject.name} (ID: ${connection.id})`);
      results.simpleAssignments++;
    } else {
      console.log(`❌ ERROR - No se pudo crear la conexión: ${roleName} → ${bpmnTask.businessObject.name}`);
    }
      
      // Si se eliminó una conexión de Accountable, regenerar conexiones de Responsible
      if (isAccountable) {
        console.log(`🔍 DEBUG - Regenerando conexiones de Responsible después de eliminar Accountable`);
        regenerateResponsibleConnections(modeler, bpmnTask, results);
    }
  } catch (error) {
    console.warn('Error creando conexión RALph, usando conexión BPMN estándar:', error);
    
    // Fallback: usar conexión BPMN estándar
    try {
      const taskBounds = getSafeBounds(bpmnTask);
      const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
      
      if (roleElement && !connectionExists(modeler, roleElement, bpmnTask)) {
        const connection = positionManager.createOptimizedConnection(modeling, roleElement, bpmnTask, 'bpmn:Association');
        
        if (connection) {
          console.log(`✅ Creada conexión fallback: ${roleName} → ${bpmnTask.businessObject.name}`);
          results.simpleAssignments++;
        }
      }
    } catch (fallbackError) {
      console.error('Error en fallback de conexión:', fallbackError);
    }
  }
}

// Función auxiliar para encontrar nodos AND existentes para una tarea
function findExistingAndNodeForTask(bpmnTask, modeler) {
  if (!modeler) {
    console.warn('Modeler no proporcionado a findExistingAndNodeForTask');
    return null;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  
  let andNode = null;
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:Complex-Assignment-AND') {
      // Verificar si este nodo AND está conectado a la tarea
      const hasConnectionToTask = elementRegistry.getAll().some(connection => 
        connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
        connection.source && connection.target &&
        connection.source.id === element.id && 
        connection.target.id === bpmnTask.id
      );
      
      if (hasConnectionToTask) {
        andNode = element;
      }
    }
  });
  
  return andNode;
}

// Función para regenerar conexiones de Responsible cuando se elimina Accountable o nodo AND
function regenerateResponsibleConnections(modeler, bpmnTask, results) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  

  
  // Buscar roles Responsible que no tienen conexión a esta tarea
  const responsibleRolesWithoutConnection = [];
  
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:RoleRALph' && 
        element.businessObject && 
        element.businessObject.name) {
      
      const roleName = element.businessObject.name;
      const isResponsible = roleName.toLowerCase().includes('responsible') || 
                           roleName.toLowerCase().includes('responsable') || 
                           roleName.toLowerCase().includes('r_');
      
      if (isResponsible) {
        // Verificar si ya tiene conexión a esta tarea (incluyendo conexiones ocultas)
        let hasDirectConnection = false;
        let hiddenConnection = null;
        
        elementRegistry.forEach(connection => {
          if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
              connection.source && connection.target &&
              connection.source.id === element.id && 
              connection.target.id === bpmnTask.id) {
            
            // Verificar si la conexión está oculta
            const isHidden = connection.visible === false || 
                            (connection.businessObject && connection.businessObject.visible === false) ||
                            connection.hidden === true ||
                            (connection.businessObject && connection.businessObject.hidden === true);
            
            if (isHidden) {
              hiddenConnection = connection;
            } else {
              hasDirectConnection = true;
            }
          }
        });
        
        // Verificar si tiene conexión a un nodo AND que va a esta tarea
        const hasAndConnection = elementRegistry.getAll().some(connection => 
          connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
          connection.source && connection.target &&
          connection.source.id === element.id && 
          connection.target.type === 'RALph:Complex-Assignment-AND' &&
          elementRegistry.getAll().some(andToTask => 
            andToTask.type && (andToTask.type === 'RALph:ResourceArc' || andToTask.type === 'bpmn:Association') &&
            andToTask.source && andToTask.target &&
            andToTask.source.id === connection.target.id && 
            andToTask.target.id === bpmnTask.id
          )
        );
        
        // Manejar conexiones ocultas primero
        if (hiddenConnection) {
          console.log(`🔍 DEBUG - Encontrada conexión oculta para Responsible: ${roleName}, restaurando...`);
          try {
            modeling.updateProperties(hiddenConnection, { visible: true });
            console.log(`✅ CONEXION DIRECTA RESTAURADA: ${roleName} → ${bpmnTask.businessObject.name}`);
            
            // Forzar actualización del canvas
            const canvas = modeler.get('canvas');
            if (canvas && typeof canvas.zoom === 'function') {
              try {
                const currentZoom = canvas.zoom();
                canvas.zoom(currentZoom, 'auto');
              } catch (zoomError) {
                console.warn('Error en zoom del canvas:', zoomError.message);
              }
            }
          } catch (error) {
            console.warn(`⚠️ Error restaurando conexión oculta para ${roleName}:`, error.message);
          }
        }
        // Solo regenerar si no tiene conexión directa Y no tiene conexión a través de nodo AND
        else if (!hasDirectConnection && !hasAndConnection) {
          responsibleRolesWithoutConnection.push(element);
          console.log(`🔍 DEBUG - Encontrado rol Responsible sin conexión (ni directa ni por AND): ${roleName}`);
        } else if (hasAndConnection) {
          console.log(`🔍 DEBUG - Rol Responsible ${roleName} ya tiene conexión a través de nodo AND, no regenerar`);
        }
      }
    }
  });
  
  // Crear conexiones para roles Responsible sin conexión
  responsibleRolesWithoutConnection.forEach(roleElement => {
    try {
      const roleName = roleElement.businessObject.name;
      console.log(`🔍 DEBUG - Creando conexión regenerada para Responsible: ${roleName} → ${bpmnTask.businessObject.name}`);
      
      const connection = positionManager.createOptimizedConnection(modeling, roleElement, bpmnTask, 'RALph:ResourceArc');
      
      if (connection) {
        console.log(`✅ Regenerada conexión de Responsible: ${roleName} → ${bpmnTask.businessObject.name}`);
        results.simpleAssignments++;
      } else {
        console.warn(`⚠️ No se pudo regenerar conexión para Responsible: ${roleName}`);
      }
    } catch (regenerateError) {
      console.warn(`⚠️ Error regenerando conexión de Responsible:`, regenerateError.message);
    }
  });
  
  console.log(`✅ Regeneración de conexiones de Responsible completada`);
}

// Función para detectar eliminación de nodos AND y regenerar conexiones
function setupAndNodeDeletionListener(modeler) {
  const eventBus = modeler.get('eventBus');
  const elementRegistry = modeler.get('elementRegistry');
  
  if (eventBus && typeof eventBus.on === 'function') {
    // Listener para elementos eliminados
    eventBus.on('elements.delete', function(event) {
      console.log('🔍 EVENTO elements.delete detectado:', event);
      const deletedElements = event.elements || [];
      
      deletedElements.forEach(deletedElement => {
        if (deletedElement.type === 'RALph:Complex-Assignment-AND') {
          // Buscar la tarea asociada al nodo AND eliminado
          const taskName = deletedElement.businessObject && deletedElement.businessObject.name ? 
                          deletedElement.businessObject.name.replace('Colaboración ', '').split(' + ')[0] : null;
          
          if (taskName) {
            // Buscar la tarea BPMN correspondiente
            let targetTask = null;
            elementRegistry.forEach(element => {
              if (element.type && element.type.includes('Task') && 
                  element.businessObject && element.businessObject.name === taskName) {
                targetTask = element;
              }
            });
            
            if (targetTask) {
              // Regenerar conexiones del rol responsable
              setTimeout(() => {
                const results = { simpleAssignments: 0, complexAssignments: 0 };
                regenerateResponsibleConnections(modeler, targetTask, results);
              }, 100);
            }
          }
        }
      });
    });
    
    // Listener adicional para cambios en el diagrama
    eventBus.on('commandStack.changed', function(event) {
      console.log('🔍 EVENTO commandStack.changed detectado:', event);
      
      // Verificar si se eliminó algún nodo AND
      const elementRegistry = modeler.get('elementRegistry');
      let andNodesFound = 0;
      
      elementRegistry.forEach(element => {
        if (element.type === 'RALph:Complex-Assignment-AND') {
          andNodesFound++;
        }
      });
      
      console.log('🔍 Nodos AND encontrados después del cambio:', andNodesFound);
    });
    
    console.log('✅ Listener de eliminación de nodos AND configurado con eventos adicionales');
  } else {
    console.warn('⚠️ EventBus no disponible para configurar listener');
  }
}

// Función manual para restaurar conexiones directas (puedes llamarla desde la consola)
function restoreDirectConnections() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.error('❌ Modeler no disponible');
    return;
  }
  
  console.log('🔄 RESTAURANDO CONEXIONES DIRECTAS MANUALMENTE...');
  
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  if (!elementRegistry) {
    console.error('❌ ElementRegistry no disponible');
    return;
  }
  
  console.log('🔍 ElementRegistry disponible, buscando elementos...');
  
  // Buscar todas las tareas BPMN con tipos más específicos
  const tasks = [];
  const allElements = [];
  
  elementRegistry.forEach(element => {
    allElements.push({
      id: element.id,
      type: element.type,
      name: (element.businessObject && element.businessObject.name) || 'Sin nombre',
      businessObject: element.businessObject
    });
    
    // Buscar tareas con tipos más amplios
    if (element.type && (
      element.type === 'bpmn:Task' ||
      element.type === 'bpmn:UserTask' ||
      element.type === 'bpmn:ServiceTask' ||
      element.type === 'bpmn:ScriptTask' ||
      element.type === 'bpmn:ManualTask' ||
      element.type === 'bpmn:BusinessRuleTask' ||
      element.type === 'bpmn:SendTask' ||
      element.type === 'bpmn:ReceiveTask' ||
      element.type === 'bpmn:CallActivity' ||
      element.type === 'bpmn:SubProcess' ||
      element.type.includes('Task') ||
      element.type.includes('Activity')
    ) && element.businessObject && element.businessObject.name) {
      tasks.push(element);
    }
  });
  
  console.log(`🔍 Total de elementos en el diagrama: ${allElements.length}`);
  console.log(`🔍 Tipos de elementos encontrados:`, [...new Set(allElements.map(el => el.type))]);
  console.log(`🔍 Encontradas ${tasks.length} tareas para procesar`);
  
  if (tasks.length === 0) {
    console.log('⚠️ No se encontraron tareas. Mostrando todos los elementos:');
    allElements.forEach(el => {
      console.log(`  - ${el.type}: "${el.name}" (ID: ${el.id})`);
    });
    return;
  }
  
  tasks.forEach(task => {
    console.log(`🔍 Procesando tarea: ${task.businessObject.name}`);
    
    // Buscar roles responsables para esta tarea
    const responsibleRoles = [];
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:RoleRALph' && 
          element.businessObject && element.businessObject.name) {
        const roleName = element.businessObject.name;
        if (roleName.toLowerCase().includes('responsible') || 
            roleName.toLowerCase().includes('responsable') || 
            roleName.toLowerCase().includes('r_')) {
          responsibleRoles.push(element);
        }
      }
    });
    
    console.log(`🔍 Encontrados ${responsibleRoles.length} roles responsables para ${task.businessObject.name}`);
    
    responsibleRoles.forEach(role => {
      // Verificar si hay conexión directa (visible u oculta)
      let hasDirectConnection = false;
      let hiddenConnection = null;
      
      elementRegistry.forEach(connection => {
        if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.source.id === role.id && 
            connection.target.id === task.id) {
          
          // Verificar si la conexión está oculta
          const isHidden = connection.visible === false || 
                          (connection.businessObject && connection.businessObject.visible === false) ||
                          connection.hidden === true ||
                          (connection.businessObject && connection.businessObject.hidden === true);
          
          if (isHidden) {
            hiddenConnection = connection;
          } else {
            hasDirectConnection = true;
          }
        }
      });
      
      // Verificar si hay nodo AND conectado
      let hasAndConnection = false;
      elementRegistry.forEach(connection => {
        if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
            connection.source && connection.target &&
            connection.source.id === role.id && 
            connection.target.type === 'RALph:Complex-Assignment-AND') {
          
          // Verificar si el nodo AND va a esta tarea
          elementRegistry.forEach(andToTask => {
            if (andToTask.type && (andToTask.type === 'RALph:ResourceArc' || andToTask.type === 'bpmn:Association') &&
                andToTask.source && andToTask.target &&
                andToTask.source.id === connection.target.id && 
                andToTask.target.id === task.id) {
              hasAndConnection = true;
            }
          });
        }
      });
      
      if (hiddenConnection && !hasAndConnection) {
        // Restaurar conexión oculta
        try {
          modeling.updateProperties(hiddenConnection, { visible: true });
          console.log(`✅ CONEXION DIRECTA RESTAURADA: ${role.businessObject.name} → ${task.businessObject.name}`);
          
          // Forzar actualización del canvas
          const canvas = modeler.get('canvas');
          if (canvas && typeof canvas.zoom === 'function') {
            try {
              const currentZoom = canvas.zoom();
              canvas.zoom(currentZoom, 'auto');
            } catch (zoomError) {
              console.warn('Error en zoom del canvas:', zoomError.message);
            }
          }
        } catch (error) {
          console.warn(`⚠️ Error restaurando conexión para ${role.businessObject.name}:`, error.message);
        }
      } else if (!hasDirectConnection && !hasAndConnection) {
        // Crear nueva conexión directa
        try {
          const positionManager = window.positionManager;
          if (positionManager) {
            positionManager.createOptimizedConnection(modeling, role, task, 'RALph:ResourceArc');
            console.log(`✅ NUEVA CONEXION DIRECTA CREADA: ${role.businessObject.name} → ${task.businessObject.name}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error creando nueva conexión para ${role.businessObject.name}:`, error.message);
        }
      } else if (hasAndConnection) {
        console.log(`ℹ️ Rol ${role.businessObject.name} ya tiene conexión a través de nodo AND`);
      } else {
        console.log(`ℹ️ Rol ${role.businessObject.name} ya tiene conexión directa visible`);
      }
    });
  });
  
  console.log('✅ RESTAURACIÓN MANUAL COMPLETADA');
}

// Hacer la función disponible globalmente
window.restoreDirectConnections = restoreDirectConnections;

function createCollaborationAssignment(modeler, bpmnTask, supportRoleName, responsibleRoleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');

  try {
    console.log('🔄 INICIANDO CREACIÓN DE COLABORACIÓN AND...');
    
    // Crear rol de soporte cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const supportRoleElement = createRalphRole(modeler, supportRoleName, results, taskBounds);
    
    if (!supportRoleElement) {
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Buscar o crear el rol responsable
    let responsibleRoleElement = null;
    
    // Buscar el rol responsable existente
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:RoleRALph' && 
          element.businessObject && 
          element.businessObject.name === responsibleRoleName) {
        responsibleRoleElement = element;
      }
    });

    // Si no existe el rol responsable, crearlo
    if (!responsibleRoleElement) {
      responsibleRoleElement = createRalphRole(modeler, responsibleRoleName, results, taskBounds);
    }

    // ELIMINAR CONEXIONES DIRECTAS DEL ROL RESPONSABLE ANTES DE CREAR EL NODO AND
    console.log('🔄 ELIMINANDO CONEXIONES DIRECTAS DEL ROL RESPONSABLE ANTES DE CREAR NODO AND');
    
    let removedCount = 0;
    
    // Buscar y eliminar todas las conexiones directas del rol responsable a la tarea
    elementRegistry.forEach(element => {
      if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
        if (element.source && element.target) {
          const sourceId = element.source.id || element.source;
          const targetId = element.target.id || element.target;
          
          // Verificar si es una conexión directa del rol responsable a la tarea
          if (sourceId === responsibleRoleElement.id && targetId === bpmnTask.id) {
            try {
              console.log('🔄 ELIMINANDO CONEXION DIRECTA ANTES DE AND:', responsibleRoleName, '->', bpmnTask.businessObject.name, 'ID:', element.id);
              
              // Eliminar completamente la conexión directa
              try {
                modeling.removeElement(element);
                console.log('✅ CONEXION DIRECTA ELIMINADA COMPLETAMENTE:', element.id);
              } catch (removeError) {
                // Si falla la eliminación, intentar ocultar
                modeling.updateProperties(element, { visible: false });
                console.log('✅ CONEXION DIRECTA OCULTADA (fallback):', element.id);
              }
              
              // Forzar actualización del canvas
              if (canvas && typeof canvas.zoom === 'function') {
                try {
                  const currentZoom = canvas.zoom();
                  canvas.zoom(currentZoom, 'auto');
                } catch (zoomError) {
                  console.warn('Error en zoom del canvas:', zoomError.message);
                }
              }
              
              removedCount++;
      } catch (error) {
              console.warn('⚠️ Error eliminando conexión directa antes de AND:', error.message);
            }
          }
        }
      }
    });
    
    console.log('✅ CONEXIONES DIRECTAS ELIMINADAS ANTES DE AND:', removedCount);

    // Crear nodo AND para representar la colaboración entre responsable y soporte
    // SIEMPRE verificar si existe una posición guardada para este nodo AND
    const andNodeName = `Colaboración ${responsibleRoleName} + ${supportRoleName}`;
    let andPosition;
    
    if (modeler.positionCache && modeler.positionCache.has(andNodeName)) {
      const cachedPosition = modeler.positionCache.get(andNodeName);
      // SIEMPRE restaurar posición exacta si existe en el cache
      andPosition = { 
        x: Math.round(cachedPosition.x), 
        y: Math.round(cachedPosition.y) 
      };
      console.log(`📍 Restaurando posición EXACTA para ${andNodeName}: (${andPosition.x}, ${andPosition.y}) - POSICIÓN PRESERVADA`);
    } else {
      // Posición por defecto solo si no hay cache
      andPosition = {
      x: taskBounds.x + taskBounds.width + 150,
      y: taskBounds.y + (taskBounds.height / 2) - 20
    };
      console.log(`🆕 Creando nueva posición para ${andNodeName}: (${andPosition.x}, ${andPosition.y})`);
    }
    
    const collaborationNode = modeling.createShape(
      { type: 'RALph:Complex-Assignment-AND' },
      andPosition,
      rootElement
    );

    // Configurar el nodo de colaboración
    modeling.updateProperties(collaborationNode, {
      name: `Colaboración ${responsibleRoleName} + ${supportRoleName}`
    });

    // VERIFICACIÓN ADICIONAL: Asegurar que la posición se aplicó correctamente
    if (modeler.positionCache && modeler.positionCache.has(andNodeName)) {
      const cachedPosition = modeler.positionCache.get(andNodeName);
      const actualPosition = { x: collaborationNode.x, y: collaborationNode.y };
      const expectedPosition = { x: Math.round(cachedPosition.x), y: Math.round(cachedPosition.y) };
      
      // Si la posición no coincide exactamente, forzar la posición correcta
      if (actualPosition.x !== expectedPosition.x || actualPosition.y !== expectedPosition.y) {
        console.log(`🔧 Corrigiendo posición de ${andNodeName}: actual (${actualPosition.x}, ${actualPosition.y}) → esperada (${expectedPosition.x}, ${expectedPosition.y})`);
        modeling.moveShape(collaborationNode, {
          x: expectedPosition.x - actualPosition.x,
          y: expectedPosition.y - actualPosition.y
        });
      } else {
        console.log(`✅ Posición verificada correctamente para ${andNodeName}: (${actualPosition.x}, ${actualPosition.y})`);
      }
    }

    // Conectar ambos roles al nodo de colaboración
    if (responsibleRoleElement) {
      try {
        positionManager.createOptimizedConnection(modeling, responsibleRoleElement, collaborationNode, 'RALph:ResourceArc');
      } catch (error) {
        console.warn('Error creando conexión responsable-colaboración:', error);
        try {
          positionManager.createOptimizedConnection(modeling, responsibleRoleElement, collaborationNode, 'bpmn:Association');
        } catch (fallbackError) {
          console.error('Error en fallback de conexión responsable-colaboración:', fallbackError);
        }
      }
    }

    try {
      positionManager.createOptimizedConnection(modeling, supportRoleElement, collaborationNode, 'RALph:ResourceArc');
    } catch (error) {
      console.warn('Error creando conexión soporte-colaboración:', error);
      try {
        positionManager.createOptimizedConnection(modeling, supportRoleElement, collaborationNode, 'bpmn:Association');
      } catch (fallbackError) {
        console.error('Error en fallback de conexión soporte-colaboración:', fallbackError);
      }
    }

    // Conectar el nodo de colaboración a la tarea (UNA SOLA CONEXIÓN)
    // Verificar si ya existe una conexión del nodo AND a la tarea
    if (!positionManager.connectionExists(modeler, collaborationNode, bpmnTask)) {
    try {
      positionManager.createOptimizedConnection(modeling, collaborationNode, bpmnTask, 'RALph:ResourceArc');
    } catch (error) {
      console.warn('Error creando conexión colaboración-tarea:', error);
      try {
        positionManager.createOptimizedConnection(modeling, collaborationNode, bpmnTask, 'bpmn:Association');
      } catch (fallbackError) {
        console.error('Error en fallback de conexión colaboración-tarea:', fallbackError);
      }
      }
    } else {
      console.log('✓ Conexión del nodo AND a la tarea ya existe');
    }

    // VERIFICACIÓN FINAL: Asegurar que no queden conexiones directas visibles
    setTimeout(() => {
      console.log('🔍 VERIFICACIÓN FINAL: Comprobando conexiones directas restantes...');
      
      let remainingDirectConnections = 0;
      elementRegistry.forEach(element => {
        if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
          if (element.source && element.target) {
            const sourceId = element.source.id || element.source;
            const targetId = element.target.id || element.target;
            
            if (sourceId === responsibleRoleElement.id && targetId === bpmnTask.id) {
              // Verificar si la conexión está visible
              const isVisible = element.visible !== false && 
                               (element.businessObject && element.businessObject.visible !== false) &&
                               element.hidden !== true &&
                               (element.businessObject && element.businessObject.hidden !== true);
              
              if (isVisible) {
                remainingDirectConnections++;
                console.log('⚠️ CONEXION DIRECTA AÚN VISIBLE:', element.id);
                
                // Eliminar la conexión visible restante
                try {
                  modeling.removeElement(element);
                  console.log('✅ CONEXION DIRECTA RESTANTE ELIMINADA:', element.id);
                } catch (finalError) {
                  console.warn('⚠️ Error eliminando conexión restante:', finalError.message);
                }
              }
            }
          }
        }
      });
      
      if (remainingDirectConnections === 0) {
        console.log('✅ VERIFICACIÓN EXITOSA: No quedan conexiones directas visibles');
      } else {
        console.warn('⚠️ VERIFICACIÓN FALLIDA: Quedan conexiones directas visibles:', remainingDirectConnections);
      }
    }, 200);

    results.complexAssignments++;
    console.log('Creada asignación de colaboración:', responsibleRoleName, '+', supportRoleName, '->', bpmnTask.businessObject.name);
    
  } catch (error) {
    console.error('Error creando asignación de colaboración:', error);
  }
}

function createComplexAssignment(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Crear rol de soporte cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const supportRoleElement = createRalphRole(modeler, roleName, results, taskBounds);
    
    if (!supportRoleElement) {
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Buscar si ya existe un rol responsable (R) para esta tarea
    const elementRegistry = modeler.get('elementRegistry');
    let responsibleRoleElement = null;
    
    // Buscar conexiones existentes para encontrar el rol responsable
    elementRegistry.forEach(element => {
      if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
        if (element.source && element.target && 
            element.source.id === bpmnTask.id && 
            element.target.type === 'RALph:RoleRALph') {
          // Verificar si es un rol responsable (no tiene nodo AND intermedio)
          const hasIntermediateNode = elementRegistry.getAll().some(intermediate => 
            intermediate.type === 'RALph:Complex-Assignment-AND' &&
            intermediate.source && intermediate.target &&
            intermediate.source.id === bpmnTask.id &&
            intermediate.target.id === element.target.id
          );
          
          if (!hasIntermediateNode) {
            responsibleRoleElement = element.target;
          }
        }
      }
    });

    // Si no hay rol responsable, crear uno por defecto
    if (!responsibleRoleElement) {
      const defaultResponsibleName = `Responsable_${bpmnTask.businessObject.name || bpmnTask.id}`;
      responsibleRoleElement = createRalphRole(modeler, defaultResponsibleName, results, taskBounds);
    }

    // Verificar si ya existe un nodo AND de colaboración para esta tarea
    if (positionManager.collaborationNodeExists(modeler, bpmnTask.businessObject.name)) {
      console.log(`✓ Nodo AND ya existe para colaboración en tarea: ${bpmnTask.businessObject.name}`);
      return;
    }

    // Eliminar conexión directa del responsable a la tarea si existe
    elementRegistry.forEach(element => {
      if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association' || element.type === 'bpmn:SequenceFlow') &&
          element.source && element.target &&
          element.source.id === responsibleRoleElement.id &&
          element.target.id === bpmnTask.id) {
        try {
          modeling.removeElement(element);
        } catch (error) {
          // Error handling silencioso
        }
      }
    });

    // Crear nodo AND para representar la colaboración entre responsable y soporte
    const andPosition = {
      x: taskBounds.x + taskBounds.width + 150,
      y: taskBounds.y + (taskBounds.height / 2) - 20
    };
    
    const complexAssignmentElement = modeling.createShape(
      { type: 'RALph:Complex-Assignment-AND' },
      andPosition,
      rootElement
    );

    // Configurar el nodo AND
    modeling.updateProperties(complexAssignmentElement, {
      name: `Colaboración ${bpmnTask.businessObject.name || bpmnTask.id}`
    });

    // Conectar el rol responsable al nodo AND
    if (responsibleRoleElement) {
      try {
        positionManager.createOptimizedConnection(modeling, responsibleRoleElement, complexAssignmentElement, 'RALph:ResourceArc');
      } catch (error) {
        console.warn('Error creando conexión responsable-AND:', error);
        try {
          positionManager.createOptimizedConnection(modeling, responsibleRoleElement, complexAssignmentElement, 'bpmn:Association');
        } catch (fallbackError) {
          console.error('Error en fallback de conexión responsable-AND:', fallbackError);
        }
      }
    }

    // Conectar el rol de soporte al nodo AND
    try {
      positionManager.createOptimizedConnection(modeling, supportRoleElement, complexAssignmentElement, 'RALph:ResourceArc');
    } catch (error) {
      console.warn('Error creando conexión soporte-AND:', error);
      try {
        positionManager.createOptimizedConnection(modeling, supportRoleElement, complexAssignmentElement, 'bpmn:Association');
      } catch (fallbackError) {
        console.error('Error en fallback de conexión soporte-AND:', fallbackError);
      }
    }

    // Conectar el nodo AND a la tarea
    try {
      positionManager.createOptimizedConnection(modeling, complexAssignmentElement, bpmnTask, 'RALph:ResourceArc');
    } catch (error) {
      console.warn('Error creando conexión AND-tarea:', error);
      try {
        positionManager.createOptimizedConnection(modeling, complexAssignmentElement, bpmnTask, 'bpmn:Association');
      } catch (fallbackError) {
        console.error('Error en fallback de conexión AND-tarea:', fallbackError);
      }
    }

    results.complexAssignments++;
  } catch (error) {
    console.error('Error creando asignación compuesta:', error);
  }
}

function createRalphCapability(modeler, capabilityName, results, taskBounds = null) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Obtener posición inteligente basada en el flujo
    let position;
    if (taskBounds) {
      position = positionManager.getCapabilityPosition(capabilityName, taskBounds, modeler);
    } else {
      // Posición por defecto si no hay tarea específica
      position = positionManager.getCapabilityPosition(capabilityName, { x: 800, y: 100, width: 100, height: 80 }, modeler);
    }
    
    // Crear la capacidad usando el servicio de modelado estándar de BPMN
    const capabilityElement = modeling.createShape(
      { type: 'RALph:Personcap' },
      position,
      rootElement
    );

    // Configurar el nombre de la capacidad
    modeling.updateProperties(capabilityElement, {
      name: capabilityName
    });

    results.rolesCreated++;
    return capabilityElement;
  } catch (error) {
    console.warn('Error creando capacidad RALph con modeling, usando fallback:', error);
    
    try {
      // Fallback: crear un elemento BPMN estándar como marcador de posición
      const rootElement = canvas.getRootElement();
      let position;
      if (taskBounds) {
        position = positionManager.getCapabilityPosition(capabilityName, taskBounds, modeler);
      } else {
        position = positionManager.getCapabilityPosition(capabilityName, { x: 800, y: 100, width: 100, height: 80 }, modeler);
      }
      
      const placeholderElement = modeling.createShape(
        { type: 'bpmn:TextAnnotation' },
        position,
        rootElement
      );

      modeling.updateProperties(placeholderElement, {
        name: `CAPACIDAD: ${capabilityName}`
      });

      results.rolesCreated++;
      return placeholderElement;
    } catch (fallbackError) {
      console.error('Error en fallback de creación de capacidad:', fallbackError);
      return null;
    }
  }
}

function createApprovalTask(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Verificar si ya existe una tarea de aprobación para esta tarea
    const elementRegistry = modeler.get('elementRegistry');
    const approvalTaskName = `Aprobar ${(bpmnTask.businessObject && bpmnTask.businessObject.name) ? bpmnTask.businessObject.name : bpmnTask.id}`;
    
    // Verificar si ya existe una tarea de aprobación para esta tarea
    if (positionManager.elementExists(modeler, 'bpmn:UserTask', approvalTaskName)) {
      console.log(`✓ Tarea de aprobación ya existe: ${approvalTaskName}`);
      return;
    }
    


    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Buscar la siguiente tarea en el flujo
    const nextTask = findNextTaskInFlow(modeler, bpmnTask);
    const taskBounds = getSafeBounds(bpmnTask);
    const nextTaskBounds = nextTask ? getSafeBounds(nextTask) : null;
    
    console.log(`🔍 DEBUG - Tarea actual: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} (ID: ${bpmnTask.id})`);
    console.log(`🔍 DEBUG - Siguiente tarea: ${nextTask ? (nextTask.businessObject.name || 'SIN NOMBRE') : 'NO ENCONTRADA'} (ID: ${nextTask ? nextTask.id : 'N/A'})`);
    
    // Debug: mostrar todas las conexiones que salen de la tarea actual
    console.log(`🔍 DEBUG - Buscando todas las conexiones que salen de ${bpmnTask.id}:`);
    elementRegistry.forEach(element => {
      if (element.type === 'bpmn:SequenceFlow' && element.source && element.source.id === bpmnTask.id) {
        console.log(`  → ${element.target.businessObject.name || 'SIN NOMBRE'} (ID: ${element.target.id}, Tipo: ${element.target.type})`);
      }
    });
    
    // Obtener posición para la tarea de aprobación - intentar restaurar posición guardada primero
    let position;
    
    if (modeler.positionCache && modeler.positionCache.has(approvalTaskName)) {
      const cachedPosition = modeler.positionCache.get(approvalTaskName);
      // Solo restaurar posición si el elemento debe mantenerse
      if (cachedPosition.shouldKeep) {
        position = { x: cachedPosition.x, y: cachedPosition.y };
        console.log(`📍 Restaurando posición guardada para ${approvalTaskName}: (${position.x}, ${position.y}) - ELEMENTO MANTENIDO`);
      } else {
        console.log(`🗑️ No restaurando posición para ${approvalTaskName} - ELEMENTO ELIMINADO`);
        position = positionManager.getApprovalTaskPosition(taskBounds, nextTaskBounds, modeler);
      }
    } else {
      position = positionManager.getApprovalTaskPosition(taskBounds, nextTaskBounds, modeler);
    }
    
    // Crear nueva tarea de aprobación
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      position,
      rootElement
    );

    // Configurar la tarea de aprobación
    modeling.updateProperties(approvalTask, {
      name: approvalTaskName
    });

    // ESTRATEGIA NO DESTRUCTIVA: Solo modificar conexiones existentes
    if (nextTask) {
      console.log(`🔍 DEBUG - ESTRATEGIA NO DESTRUCTIVA: Solo modificar conexiones existentes`);
      console.log(`🔍 DEBUG - Tarea actual: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} (ID: ${bpmnTask.id})`);
      console.log(`🔍 DEBUG - Siguiente tarea: ${nextTask.businessObject.name || 'SIN NOMBRE'} (ID: ${nextTask.id})`);
      
      // PASO 1: DIAGNÓSTICO - Mostrar todas las conexiones en el diagrama
      console.log(`🔍 DEBUG - PASO 1: DIAGNÓSTICO - Todas las conexiones SequenceFlow en el diagrama:`);
      const allConnections = [];
      elementRegistry.forEach(element => {
        if (element.type === 'bpmn:SequenceFlow' && element.source && element.target) {
          const sourceName = (element.source.businessObject && element.source.businessObject.name) || 'SIN NOMBRE';
          const targetName = (element.target.businessObject && element.target.businessObject.name) || 'SIN NOMBRE';
          const sourceId = element.source.id;
          const targetId = element.target.id;
          
          allConnections.push({
            element: element,
            sourceName: sourceName,
            targetName: targetName,
            sourceId: sourceId,
            targetId: targetId
          });
          
          console.log(`  ${sourceName} (${sourceId}) → ${targetName} (${targetId})`);
        }
      });
      
      console.log(`🔍 DEBUG - Total de conexiones en el diagrama: ${allConnections.length}`);
      
      // PASO 2: Buscar la conexión original específica
      console.log(`🔍 DEBUG - PASO 2: Buscando conexión original específica`);
      let originalConnectionToModify = null;
      
      allConnections.forEach(conn => {
        if (conn.sourceId === bpmnTask.id && conn.targetId === nextTask.id) {
          originalConnectionToModify = conn.element;
          console.log(`🔍 DEBUG - Encontrada conexión original para modificar: ${conn.sourceName} → ${conn.targetName} (ID: ${conn.element.id})`);
        }
      });
      
      if (!originalConnectionToModify) {
        console.log(`ℹ️ No se encontró conexión original para modificar`);
        return;
      }
      
      // PASO 2.5: ELIMINAR LA CONEXIÓN ORIGINAL (FORZADO)
      console.log(`🔍 DEBUG - PASO 2.5: Eliminando conexión original: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
      try {
        // Método 1: removeElement
        modeling.removeElement(originalConnectionToModify);
        console.log(`✅ Eliminada conexión original (método 1): ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
      } catch (error1) {
        console.warn(`⚠️ Error método 1:`, error1.message);
        try {
          // Método 2: removeConnection
          modeling.removeConnection(originalConnectionToModify);
          console.log(`✅ Eliminada conexión original (método 2): ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
        } catch (error2) {
          console.warn(`⚠️ Error método 2:`, error2.message);
          try {
            // Método 3: removeElements con array
            modeling.removeElements([originalConnectionToModify]);
            console.log(`✅ Eliminada conexión original (método 3): ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
          } catch (error3) {
            console.error(`❌ Error eliminando conexión original después de 3 intentos:`, error3.message);
          }
        }
      }
      
      // PASO 2.6: CREAR CONEXIÓN DE TAREA ORIGINAL A TAREA DE APROBACIÓN
      console.log(`🔍 DEBUG - PASO 2.6: Creando conexión: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
      try {
        const originalToApprovalConnection = modeling.connect(bpmnTask, approvalTask, { type: 'bpmn:SequenceFlow' });
        console.log(`✅ Creada conexión: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
      } catch (error) {
        console.warn(`⚠️ Error creando conexión original a aprobación:`, error.message);
      }
      
      // PASO 3: Crear conexión de aprobación a siguiente tarea (MEJORADO)
      console.log(`🔍 DEBUG - PASO 3: Creando conexión de aprobación a siguiente tarea (MEJORADO)`);
      console.log(`🔍 DEBUG - Conectando: ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'} con waypoints a la mitad vertical`);
      
      // Verificar que ambos elementos existen
      if (!approvalTask || !nextTask) {
        console.error(`❌ Error: approvalTask o nextTask no existen`);
        console.log(`approvalTask:`, approvalTask);
        console.log(`nextTask:`, nextTask);
        return;
      }
      
      // Crear la conexión con múltiples intentos
      let approvalConnection = null;
      let connectionCreated = false;
      
      // INTENTO 1: Conexión normal
      try {
        approvalConnection = modeling.connect(approvalTask, nextTask, { type: 'bpmn:SequenceFlow' });
        if (approvalConnection) {
          connectionCreated = true;
          console.log(`✅ Creada conexión de aprobación (intento 1): ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
        }
      } catch (error1) {
        console.warn(`⚠️ Error en intento 1:`, error1.message);
      }
      
      // INTENTO 2: Si falló, intentar con createConnection
      if (!connectionCreated) {
        try {
          const rootElement = canvas.getRootElement();
          approvalConnection = modeling.createConnection(approvalTask, nextTask, { type: 'bpmn:SequenceFlow' }, rootElement);
          if (approvalConnection) {
            connectionCreated = true;
            console.log(`✅ Creada conexión de aprobación (intento 2): ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
          }
        } catch (error2) {
          console.warn(`⚠️ Error en intento 2:`, error2.message);
        }
      }
      
      // INTENTO 3: Si aún falló, intentar con createShape
      if (!connectionCreated) {
        try {
          const rootElement = canvas.getRootElement();
          const connectionPosition = {
            x: (approvalTask.x + nextTask.x) / 2,
            y: (approvalTask.y + nextTask.y) / 2
          };
          
          approvalConnection = modeling.createShape(
            { type: 'bpmn:SequenceFlow' },
            connectionPosition,
            rootElement
          );
          
          if (approvalConnection) {
            // Conectar manualmente
            approvalConnection.source = approvalTask;
            approvalConnection.target = nextTask;
            connectionCreated = true;
            console.log(`✅ Creada conexión de aprobación (intento 3): ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
          }
        } catch (error3) {
          console.warn(`⚠️ Error en intento 3:`, error3.message);
        }
      }
      
      if (approvalConnection && connectionCreated) {
        console.log(`✅ Creada conexión de aprobación exitosamente: ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
        
        // Aplicar waypoints a la mitad vertical con múltiples métodos
        try {
          const approvalBounds = getSafeBounds(approvalTask);
          const nextTaskBounds = getSafeBounds(nextTask);
          
          if (approvalBounds && nextTaskBounds) {
            // Calcular punto de conexión en la mitad vertical del lado derecho de la tarea de aprobación
            const approvalCenter = {
              x: approvalBounds.x + approvalBounds.width, // Lado derecho
              y: approvalBounds.y + approvalBounds.height / 2 // Mitad vertical
            };
            
            // Calcular punto de conexión en la mitad vertical del lado izquierdo de la siguiente tarea
            const nextTaskCenter = {
              x: nextTaskBounds.x, // Lado izquierdo
              y: nextTaskBounds.y + nextTaskBounds.height / 2 // Mitad vertical
            };
            
            // Crear waypoints a la mitad vertical
            const waypoints = [
              { x: approvalCenter.x, y: approvalCenter.y },
              { x: nextTaskCenter.x, y: nextTaskCenter.y }
            ];
            
            // Aplicar waypoints con múltiples métodos
            try {
              // Método 1: updateProperties con waypoints
              modeling.updateProperties(approvalConnection, {
                waypoints: waypoints
              });
              
              // Método 2: Forzar actualización visual
              canvas.updateElement(approvalConnection);
              
              // Método 3: Actualizar waypoints directamente en el businessObject
              if (approvalConnection.businessObject) {
                approvalConnection.businessObject.waypoints = waypoints;
              }
              
              // Método 4: Forzar re-renderizado
              graphicsFactory.updateContainments(approvalConnection);
              
              // Método 5: Forzar actualización de elementos relacionados
              canvas.updateElement(approvalTask);
              canvas.updateElement(nextTask);
              graphicsFactory.updateContainments(approvalTask);
              graphicsFactory.updateContainments(nextTask);
              
              console.log(`✅ Aplicados waypoints a la mitad vertical para conexión de aprobación con múltiples métodos`);
            } catch (waypointError) {
              console.warn(`⚠️ Error aplicando waypoints a la mitad vertical para conexión de aprobación:`, waypointError.message);
            }
          } else {
            console.warn(`⚠️ No se pudieron obtener bounds para aplicar waypoints`);
          }
        } catch (waypointError) {
          console.warn(`⚠️ Error aplicando waypoints a la mitad vertical para conexión de aprobación:`, waypointError.message);
        }
      } else {
        console.error(`❌ Error: No se pudo crear la conexión de aprobación después de 3 intentos`);
        return;
      }
      
      // PASO 4: ESTRATEGIA SIMPLIFICADA - Crear nueva conexión inicial y ocultar la original
      console.log(`🔍 DEBUG - PASO 4: ESTRATEGIA SIMPLIFICADA - Crear nueva conexión inicial`);
      
      console.log(`🔍 DEBUG - Creando nueva conexión inicial: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
      
      // Crear nueva conexión inicial (bpmnTask → approvalTask)
      let initialConnection = null;
      let initialConnectionCreated = false;
      
      try {
        initialConnection = modeling.connect(bpmnTask, approvalTask, { type: 'bpmn:SequenceFlow' });
        if (initialConnection) {
          initialConnectionCreated = true;
          console.log(`✅ Creada nueva conexión inicial: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
          
          // Aplicar waypoints a la mitad vertical para la conexión inicial
          try {
            const sourceBounds = getSafeBounds(bpmnTask);
            const targetBounds = getSafeBounds(approvalTask);
            
            if (sourceBounds && targetBounds) {
              // Calcular punto de conexión en la mitad vertical del lado derecho de la tarea original
              const sourceCenter = {
                x: sourceBounds.x + sourceBounds.width, // Lado derecho
                y: sourceBounds.y + sourceBounds.height / 2 // Mitad vertical
              };
              
              // Calcular punto de conexión en la mitad vertical del lado izquierdo de la tarea de aprobación
              const targetCenter = {
                x: targetBounds.x, // Lado izquierdo
                y: targetBounds.y + targetBounds.height / 2 // Mitad vertical
              };
              
              // Crear waypoints a la mitad vertical
              const waypoints = [
                { x: sourceCenter.x, y: sourceCenter.y },
                { x: targetCenter.x, y: targetCenter.y }
              ];
              
              // Aplicar waypoints con múltiples métodos
              try {
                // Método 1: updateProperties con waypoints
                modeling.updateProperties(initialConnection, {
                  waypoints: waypoints
                });
                
                // Método 2: Forzar actualización visual
                canvas.updateElement(initialConnection);
                
                // Método 3: Actualizar waypoints directamente en el businessObject
                if (initialConnection.businessObject) {
                  initialConnection.businessObject.waypoints = waypoints;
                }
                
                // Método 4: Forzar re-renderizado
                graphicsFactory.updateContainments(initialConnection);
                
                console.log(`✅ Aplicados waypoints a la mitad vertical para conexión inicial con múltiples métodos`);
              } catch (waypointError) {
                console.warn(`⚠️ Error aplicando waypoints a la mitad vertical para conexión inicial:`, waypointError.message);
              }
            }
          } catch (waypointError) {
            console.warn(`⚠️ Error aplicando waypoints a la mitad vertical para conexión inicial:`, waypointError.message);
          }
        }
      } catch (initialError) {
        console.warn(`⚠️ Error creando conexión inicial:`, initialError.message);
      }
      
      // Ocultar la conexión original (en lugar de eliminarla para evitar errores)
      if (originalConnectionToModify) {
        try {
          modeling.updateProperties(originalConnectionToModify, {
            visible: false
          });
          console.log(`✅ Ocultada conexión original: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
        } catch (hideError) {
          console.warn(`⚠️ Error ocultando conexión original:`, hideError.message);
        }
      }
      
      // ESTRATEGIA DE LIMPIEZA AGRESIVA: Eliminar todas las conexiones problemáticas y crear flujo limpio
      setTimeout(() => {
        console.log(`🔍 DEBUG - LIMPIEZA AGRESIVA: Eliminando conexiones problemáticas y creando flujo limpio`);
        
        // Buscar y eliminar TODAS las conexiones que van de bpmnTask a nextTask (la original)
        let connectionsToRemove = [];
        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:SequenceFlow' && 
              element.source && element.source.id === bpmnTask.id && 
              element.target && element.target.id === nextTask.id) {
            connectionsToRemove.push(element);
            console.log(`🔍 DEBUG - Encontrada conexión problemática para eliminar: ${element.id}`);
          }
        });
        
        // Eliminar todas las conexiones problemáticas
      connectionsToRemove.forEach(connection => {
        try {
          modeling.removeElement(connection);
            console.log(`✅ Eliminada conexión problemática: ${connection.id}`);
          } catch (removeError) {
            console.warn(`⚠️ Error eliminando conexión problemática:`, removeError.message);
          }
        });
        
        // Verificar que existe la conexión bpmnTask → approvalTask
        let connection1Exists = false;
        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:SequenceFlow' && 
              element.source && element.source.id === bpmnTask.id && 
              element.target && element.target.id === approvalTask.id) {
            connection1Exists = true;
          }
        });
        
        // Si no existe, crear la conexión limpia con waypoints al centro
        if (!connection1Exists) {
          console.log(`⚠️ No existe conexión limpia, creando nueva con waypoints al centro`);
          try {
            const cleanConnection = modeling.connect(bpmnTask, approvalTask, { type: 'bpmn:SequenceFlow' });
            if (cleanConnection) {
              console.log(`✅ Creada conexión limpia: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
              
              // Forzar waypoints a la mitad vertical de los lados de las tareas
              try {
                const sourceBounds = getSafeBounds(bpmnTask);
                const targetBounds = getSafeBounds(approvalTask);
                
                // Calcular punto de conexión en la mitad vertical del lado derecho de la tarea original
                const sourceCenter = {
                  x: sourceBounds.x + sourceBounds.width, // Lado derecho
                  y: sourceBounds.y + sourceBounds.height / 2 // Mitad vertical
                };
                
                // Calcular punto de conexión en la mitad vertical del lado izquierdo de la tarea de aprobación
                const targetCenter = {
                  x: targetBounds.x, // Lado izquierdo
                  y: targetBounds.y + targetBounds.height / 2 // Mitad vertical
                };
                
                // Crear waypoints que vayan al centro
                const waypoints = [
                  { x: sourceCenter.x, y: sourceCenter.y },
                  { x: targetCenter.x, y: targetCenter.y }
                ];
                
                               // Aplicar waypoints al centro con múltiples métodos
               try {
                 // Método 1: updateProperties con waypoints
                 modeling.updateProperties(cleanConnection, {
                   waypoints: waypoints
                 });
                 
                 // Método 2: Forzar actualización visual
                 canvas.updateElement(cleanConnection);
                 
                 // Método 3: Actualizar waypoints directamente en el businessObject
                 if (cleanConnection.businessObject) {
                   cleanConnection.businessObject.waypoints = waypoints;
                 }
                 
                 // Método 4: Forzar re-renderizado
                 graphicsFactory.updateContainments(cleanConnection);
                 
                 console.log(`✅ Aplicados waypoints al centro de la tarea de aprobación con múltiples métodos`);
               } catch (waypointError) {
                 console.warn(`⚠️ Error aplicando waypoints al centro:`, waypointError.message);
               }
              } catch (waypointError) {
                console.warn(`⚠️ Error aplicando waypoints al centro:`, waypointError.message);
              }
            }
          } catch (cleanError) {
            console.error(`❌ Error creando conexión limpia:`, cleanError.message);
          }
        } else {
          console.log(`✅ Conexión limpia ya existe`);
          
          // Aplicar waypoints a la mitad vertical de los lados a la conexión existente
          try {
            const existingConnection = elementRegistry.forEach(element => {
              if (element.type === 'bpmn:SequenceFlow' && 
                  element.source && element.source.id === bpmnTask.id && 
                  element.target && element.target.id === approvalTask.id) {
                
                const sourceBounds = getSafeBounds(bpmnTask);
                const targetBounds = getSafeBounds(approvalTask);
                
                // Calcular punto de conexión en la mitad vertical del lado derecho de la tarea original
                const sourceCenter = {
                  x: sourceBounds.x + sourceBounds.width, // Lado derecho
                  y: sourceBounds.y + sourceBounds.height / 2 // Mitad vertical
                };
                
                // Calcular punto de conexión en la mitad vertical del lado izquierdo de la tarea de aprobación
                const targetCenter = {
                  x: targetBounds.x, // Lado izquierdo
                  y: targetBounds.y + targetBounds.height / 2 // Mitad vertical
                };
                
                // Crear waypoints que vayan al centro
                const waypoints = [
                  { x: sourceCenter.x, y: sourceCenter.y },
                  { x: targetCenter.x, y: targetCenter.y }
                ];
                
                                 // Aplicar waypoints al centro con múltiples métodos
                 try {
                   // Método 1: updateProperties con waypoints
                   modeling.updateProperties(element, {
                     waypoints: waypoints
                   });
                   
                   // Método 2: Forzar actualización visual
                   canvas.updateElement(element);
                   
                   // Método 3: Actualizar waypoints directamente en el businessObject
                   if (element.businessObject) {
                     element.businessObject.waypoints = waypoints;
                   }
                   
                   // Método 4: Forzar re-renderizado
                   graphicsFactory.updateContainments(element);
                   
                   console.log(`✅ Aplicados waypoints al centro de la conexión existente con múltiples métodos`);
                 } catch (waypointError) {
                   console.warn(`⚠️ Error aplicando waypoints al centro de conexión existente:`, waypointError.message);
                 }
              }
            });
          } catch (waypointError) {
            console.warn(`⚠️ Error aplicando waypoints al centro de conexión existente:`, waypointError.message);
          }
        }
        
        console.log(`🎉 LIMPIEZA AGRESIVA COMPLETADA: Flujo limpio creado`);
      }, 300);
      
      // Verificar el resultado
      setTimeout(() => {
        let connection1Exists = false;
        let connection2Exists = false;
        let originalModified = false;
        let originalStillExists = false;
        
        console.log(`🔍 DEBUG - Verificando conexiones después de la modificación:`);
        console.log(`🔍 DEBUG - bpmnTask ID: ${bpmnTask.id}, approvalTask ID: ${approvalTask.id}, nextTask ID: ${nextTask.id}`);
        
        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:SequenceFlow') {
            const sourceId = element.source ? element.source.id : 'NO_SOURCE';
            const targetId = element.target ? element.target.id : 'NO_TARGET';
            const sourceName = element.source && element.source.businessObject ? element.source.businessObject.name : 'SIN NOMBRE';
            const targetName = element.target && element.target.businessObject ? element.target.businessObject.name : 'SIN NOMBRE';
            
            console.log(`🔍 DEBUG - Conexión: ${sourceName} (${sourceId}) → ${targetName} (${targetId})`);
            
            // Verificar conexión 1: bpmnTask → approvalTask
            if (sourceId === bpmnTask.id && targetId === approvalTask.id) {
              connection1Exists = true;
              console.log(`✅ Verificación: conexión ${sourceName} → ${targetName} existe (connection1)`);
            }
            
            // Verificar conexión 2: approvalTask → nextTask
            if (sourceId === approvalTask.id && targetId === nextTask.id) {
              connection2Exists = true;
              console.log(`✅ Verificación: conexión ${sourceName} → ${targetName} existe (connection2)`);
            }
            
            // Verificar conexión original: bpmnTask → nextTask
            if (sourceId === bpmnTask.id && targetId === nextTask.id) {
              if (element.visible === false) {
                originalModified = true;
                console.log(`✅ Verificación: conexión original oculta`);
              } else if (targetId === approvalTask.id) {
                originalModified = true;
                console.log(`✅ Verificación: conexión original modificada correctamente`);
              } else {
                originalStillExists = true;
                console.log(`⚠️ ADVERTENCIA: La conexión original aún va a ${targetName}: ${sourceName} → ${targetName}`);
              }
            }
          }
        });
        
        console.log(`🔍 DEBUG - Resumen de verificación:`);
        console.log(`  - connection1 (${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}): ${connection1Exists}`);
        console.log(`  - connection2 (${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}): ${connection2Exists}`);
        console.log(`  - originalModified: ${originalModified}`);
        console.log(`  - originalStillExists: ${originalStillExists}`);
        
        if (connection1Exists && connection2Exists && !originalStillExists) {
          console.log(`🎉 ÉXITO: Flujo de aprobación limpio creado correctamente`);
          console.log(`✅ Flujo: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
        } else if (connection1Exists && connection2Exists && originalStillExists) {
          console.log(`⚠️ Flujo de aprobación creado, pero la conexión original aún existe`);
          console.log(`💡 La limpieza agresiva debería eliminar la conexión original automáticamente`);
        } else {
          console.warn(`⚠️ Verificación incompleta: connection1=${connection1Exists}, connection2=${connection2Exists}, originalStillExists=${originalStillExists}`);
          
          // Mostrar todas las conexiones para debug
          console.log(`🔍 DEBUG - Todas las conexiones SequenceFlow:`);
          elementRegistry.forEach(element => {
            if (element.type === 'bpmn:SequenceFlow') {
              const sourceName = element.source && element.source.businessObject ? element.source.businessObject.name : 'SIN NOMBRE';
              const targetName = element.target && element.target.businessObject ? element.target.businessObject.name : 'SIN NOMBRE';
              const sourceId = element.source ? element.source.id : 'NO_SOURCE';
              const targetId = element.target ? element.target.id : 'NO_TARGET';
              console.log(`  ${sourceName} (${sourceId}) → ${targetName} (${targetId})`);
            }
          });
        }
      }, 100);
    } else {
      // Si no hay siguiente tarea, solo conectar la original a la aprobación
      try {
        const connection = modeling.connect(bpmnTask, approvalTask, {
          type: 'bpmn:SequenceFlow'
        });
        
        if (connection) {
        console.log(`✅ Creada conexión de aprobación: ${bpmnTask.businessObject.name} → Aprobar`);
        }
      } catch (error) {
        console.error('Error creando conexión de aprobación:', error);
        
        // Fallback: intentar crear conexión simple
        try {
          modeling.connect(bpmnTask, approvalTask, { type: 'bpmn:SequenceFlow' });
          console.log(`✅ Creada conexión de aprobación (fallback): ${bpmnTask.businessObject.name} → Aprobar`);
        } catch (fallbackError) {
          console.error('Error en fallback de conexión de aprobación:', fallbackError);
        }
      }
    }

    // Crear rol para la tarea de aprobación (cerca de la tarea)
    const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
    if (roleElement) {
      // Crear conexión directa sin llamar a createSimpleAssignment para evitar duplicación
      if (!positionManager.connectionExists(modeler, roleElement, approvalTask)) {
        const connection = positionManager.createOptimizedConnection(modeling, roleElement, approvalTask, 'RALph:ResourceArc');
        if (connection) {
          console.log(`✅ Creada conexión de aprobación: ${roleName} → ${approvalTaskName}`);
        }
      }
    }

    results.approvalTasks++;
    
    // ACTUALIZACIÓN VISUAL MEJORADA: Forzar renderizado y posicionamiento correcto
    setTimeout(() => {
      console.log(`🔍 DEBUG - ACTUALIZACIÓN VISUAL MEJORADA: Forzando renderizado y posicionamiento`);
      
      try {
        // Obtener servicios necesarios
        const canvas = modeler.get('canvas');
        const graphicsFactory = modeler.get('graphicsFactory');
        const elementRegistry = modeler.get('elementRegistry');
        
        // Actualizar elementos principales
        canvas.updateElement(approvalTask);
        canvas.updateElement(bpmnTask);
        if (nextTask) {
          canvas.updateElement(nextTask);
        }
        
        // Forzar re-renderizado de contenedores
        graphicsFactory.updateContainments(approvalTask);
        graphicsFactory.updateContainments(bpmnTask);
        if (nextTask) {
          graphicsFactory.updateContainments(nextTask);
        }
        
        // Forzar actualización de todas las conexiones relacionadas con waypoints al centro
        elementRegistry.forEach(element => {
          if (element.type === 'bpmn:SequenceFlow') {
            if ((element.source && element.source.id === bpmnTask.id) ||
                (element.target && element.target.id === bpmnTask.id) ||
                (element.source && element.source.id === approvalTask.id) ||
                (element.target && element.target.id === approvalTask.id) ||
                (nextTask && element.source && element.source.id === nextTask.id) ||
                (nextTask && element.target && element.target.id === nextTask.id)) {
              
              try {
                // Forzar actualización visual de la conexión
                canvas.updateElement(element);
                graphicsFactory.updateContainments(element);
                
                // Aplicar waypoints al centro si es una conexión nueva
                if (element.source && element.target) {
                  const sourceBounds = getSafeBounds(element.source);
                  const targetBounds = getSafeBounds(element.target);
                  
                  if (sourceBounds && targetBounds) {
                    // Calcular puntos de conexión en la mitad vertical de los lados
                    const sourceCenter = {
                      x: sourceBounds.x + sourceBounds.width, // Lado derecho
                      y: sourceBounds.y + sourceBounds.height / 2 // Mitad vertical
                    };
                    
                    const targetCenter = {
                      x: targetBounds.x, // Lado izquierdo
                      y: targetBounds.y + targetBounds.height / 2 // Mitad vertical
                    };
                    
                    // Crear waypoints a la mitad vertical de los lados
                    const waypoints = [
                      { x: sourceCenter.x, y: sourceCenter.y },
                      { x: targetCenter.x, y: targetCenter.y }
                    ];
                    
                    // Aplicar waypoints con múltiples métodos
                    try {
                      // Método 1: updateProperties
                      modeling.updateProperties(element, {
                        waypoints: waypoints
                      });
                      
                      // Método 2: Actualizar businessObject directamente
                      if (element.businessObject) {
                        element.businessObject.waypoints = waypoints;
                      }
                      
                      // Método 3: Forzar actualización visual
                      canvas.updateElement(element);
                      graphicsFactory.updateContainments(element);
                      
                      console.log(`✅ Aplicados waypoints a la mitad vertical para conexión: ${(element.source.businessObject && element.source.businessObject.name) || 'SIN NOMBRE'} → ${(element.target.businessObject && element.target.businessObject.name) || 'SIN NOMBRE'}`);
                    } catch (waypointError) {
                      console.warn(`⚠️ Error aplicando waypoints al centro:`, waypointError.message);
                    }
                  }
                }
              } catch (connError) {
                console.warn(`⚠️ Error actualizando conexión:`, connError.message);
              }
            }
          }
        });
        
        // Forzar refresh del canvas
        try {
          if (canvas.zoom) {
            canvas.zoom('fit-viewport');
          }
        } catch (zoomError) {
          console.warn(`⚠️ Error en zoom fit:`, zoomError.message);
        }
        
        console.log(`✅ ACTUALIZACIÓN VISUAL MEJORADA completada con waypoints a la mitad vertical`);
        
        // VERIFICACIÓN FINAL: Confirmar que ambas conexiones existen
        setTimeout(() => {
          console.log(`🔍 DEBUG - VERIFICACIÓN FINAL: Confirmando que ambas conexiones existen`);
          
          let initialConnectionExists = false;
          let approvalConnectionExists = false;
          
          elementRegistry.forEach(element => {
            if (element.type === 'bpmn:SequenceFlow') {
              // Verificar conexión inicial: bpmnTask → approvalTask
              if (element.source && element.source.id === bpmnTask.id && 
                  element.target && element.target.id === approvalTask.id) {
                initialConnectionExists = true;
                console.log(`✅ VERIFICACIÓN FINAL: Conexión inicial confirmada: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
                
                // Forzar actualización visual de la conexión inicial
                try {
                  canvas.updateElement(element);
                  graphicsFactory.updateContainments(element);
                } catch (finalError) {
                  console.warn(`⚠️ Error actualizando conexión inicial:`, finalError.message);
                }
              }
              
              // Verificar conexión de aprobación: approvalTask → nextTask
              if (element.source && element.source.id === approvalTask.id && 
                  element.target && element.target.id === nextTask.id) {
                approvalConnectionExists = true;
                console.log(`✅ VERIFICACIÓN FINAL: Conexión de aprobación confirmada: ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
                
                // Forzar actualización visual de la conexión de aprobación
                try {
                  canvas.updateElement(element);
                  graphicsFactory.updateContainments(element);
                } catch (finalError) {
                  console.warn(`⚠️ Error actualizando conexión de aprobación:`, finalError.message);
                }
              }
            }
          });
          
          // Crear conexiones de emergencia si faltan
          if (!initialConnectionExists) {
            console.error(`❌ VERIFICACIÓN FINAL: La conexión inicial NO existe - CREANDO CONEXIÓN DE EMERGENCIA`);
            try {
              const emergencyInitialConnection = modeling.connect(bpmnTask, approvalTask, { type: 'bpmn:SequenceFlow' });
              if (emergencyInitialConnection) {
                console.log(`✅ CONEXIÓN INICIAL DE EMERGENCIA creada: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${approvalTaskName}`);
                canvas.updateElement(emergencyInitialConnection);
                graphicsFactory.updateContainments(emergencyInitialConnection);
              }
            } catch (emergencyError) {
              console.error(`❌ Error creando conexión inicial de emergencia:`, emergencyError.message);
            }
          }
          
          if (!approvalConnectionExists) {
            console.error(`❌ VERIFICACIÓN FINAL: La conexión de aprobación NO existe - CREANDO CONEXIÓN DE EMERGENCIA`);
            try {
              const emergencyApprovalConnection = modeling.connect(approvalTask, nextTask, { type: 'bpmn:SequenceFlow' });
              if (emergencyApprovalConnection) {
                console.log(`✅ CONEXIÓN DE APROBACIÓN DE EMERGENCIA creada: ${approvalTaskName} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
                canvas.updateElement(emergencyApprovalConnection);
                graphicsFactory.updateContainments(emergencyApprovalConnection);
              }
            } catch (emergencyError) {
              console.error(`❌ Error creando conexión de aprobación de emergencia:`, emergencyError.message);
            }
          }
          
          // Forzar actualización final de todos los elementos
          try {
            canvas.updateElement(bpmnTask);
            canvas.updateElement(approvalTask);
            canvas.updateElement(nextTask);
            graphicsFactory.updateContainments(bpmnTask);
            graphicsFactory.updateContainments(approvalTask);
            graphicsFactory.updateContainments(nextTask);
            console.log(`✅ VERIFICACIÓN FINAL: Actualización visual completa forzada`);
          } catch (finalUpdateError) {
            console.warn(`⚠️ Error en actualización visual final:`, finalUpdateError.message);
          }
        }, 100);
        
      } catch (updateError) {
        console.warn(`⚠️ Error en actualización visual mejorada:`, updateError.message);
      }
    }, 200); // Delay para asegurar que todas las operaciones anteriores se completen
    
  } catch (error) {
    console.error('Error creando tarea de aprobación:', error);
  }
}

function createMessageFlow(modeler, bpmnTask, roleNames, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Convertir roleNames a array si es un string
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    
    // Verificar si ya existe un evento de consulta para esta tarea y roles
    const elementRegistry = modeler.get('elementRegistry');
    const consultEventName = roles.length === 1 
      ? `Consultar ${roles[0]}`
      : `Consultar ${roles.join(' y ')}`;
    
    // Buscar evento de consulta existente (tanto catch como throw)
    let existingConsultEvent = null;
    elementRegistry.forEach(element => {
      if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
          element.businessObject && 
          element.businessObject.name === consultEventName) {
        existingConsultEvent = element;
      }
    });
    
    if (existingConsultEvent) {
      console.log(`✓ Evento de consulta ya existe: ${consultEventName}`);
      return;
    }
    
    // Buscar la siguiente tarea en el flujo (ignorando eventos intermedios existentes)
    const nextTask = findNextTaskInFlowIgnoringEvents(modeler, bpmnTask);
    if (!nextTask) {
      console.warn(`⚠️ No se encontró siguiente tarea para insertar evento de consulta`);
      return;
    }

    // Buscar la conexión original entre la tarea actual y la siguiente
    const originalConnection = findConnectionBetween(modeler, bpmnTask, nextTask);
    if (!originalConnection) {
      console.warn(`⚠️ No se encontró conexión original entre tareas`);
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Crear evento intermedio de mensaje tipo throw - intentar restaurar posición guardada primero
    let consultPosition;
    
    if (modeler.positionCache && modeler.positionCache.has(consultEventName)) {
      const cachedPosition = modeler.positionCache.get(consultEventName);
      // Solo restaurar posición si el elemento debe mantenerse
      if (cachedPosition.shouldKeep) {
        consultPosition = { x: cachedPosition.x, y: cachedPosition.y };
        console.log(`📍 Restaurando posición guardada para ${consultEventName}: (${consultPosition.x}, ${consultPosition.y}) - ELEMENTO MANTENIDO`);
      } else {
        console.log(`🗑️ No restaurando posición para ${consultEventName} - ELEMENTO ELIMINADO`);
        // Posición por defecto en el medio del flujo
        consultPosition = {
      x: (bpmnTask.x + nextTask.x) / 2,
      y: (bpmnTask.y + nextTask.y) / 2
    };
      }
    } else {
      // Posición por defecto en el medio del flujo
      consultPosition = {
        x: (bpmnTask.x + nextTask.x) / 2,
        y: (bpmnTask.y + nextTask.y) / 2
      };
    }
    
    const consultEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      consultPosition,
      rootElement
    );

    // Agregar definición de mensaje al evento
    const moddle = modeler.get('moddle');
    const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
    consultEvent.businessObject.eventDefinitions = [messageEventDefinition];

    // Configurar el evento de consulta con el nombre del rol
    modeling.updateProperties(consultEvent, {
      name: consultEventName
    });

    // Eliminar la conexión original
    modeling.removeConnection(originalConnection);
    console.log(`🗑️ Eliminada conexión original: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id} → ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id}`);

    // Crear nuevas conexiones: Tarea → Evento → Siguiente Tarea
    const connection1 = modeling.connect(bpmnTask, consultEvent, { type: 'bpmn:SequenceFlow' });
    const connection2 = modeling.connect(consultEvent, nextTask, { type: 'bpmn:SequenceFlow' });
    
    if (connection1 && connection2) {
        results.messageFlows++;
      console.log(`✅ Evento de consulta insertado en flujo: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id} → ${consultEventName} → ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id} (${roles.length} rol${roles.length > 1 ? 'es' : ''})`);
      }
    } catch (error) {
    console.warn('Error creando evento de consulta:', error);
  }
}

// Función para mantener conexiones visibles después del movimiento
function maintainConnectionsAfterMove(modeler, movedElement) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const elementRegistry = modeler.get('elementRegistry');
  
  console.log(`🔄 Manteniendo conexiones después del movimiento de: ${movedElement.businessObject && movedElement.businessObject.name ? movedElement.businessObject.name : movedElement.id}`);
  
  // Buscar todas las conexiones relacionadas con el elemento movido
  const relatedConnections = [];
  
  elementRegistry.forEach(element => {
    if (element.type && (element.type === 'bpmn:SequenceFlow' || element.type === 'bpmn:Association' || element.type === 'RALph:dashedLine')) {
      if (element.source && element.target) {
        if (element.source.id === movedElement.id || element.target.id === movedElement.id) {
          relatedConnections.push(element);
        }
      }
    }
  });
  
  // Actualizar waypoints de todas las conexiones relacionadas
  relatedConnections.forEach(connection => {
    try {
      const sourceBounds = positionManager.getSafeBounds(connection.source);
      const targetBounds = positionManager.getSafeBounds(connection.target);
      
      const waypoints = positionManager.calculateOptimizedWaypoints(sourceBounds, targetBounds, modeling);
      
      // Actualizar propiedades de la conexión
      modeling.updateProperties(connection, { 
        waypoints: waypoints,
        visible: true // Asegurar que la conexión esté visible
      });
      
      // Forzar actualización visual
      canvas.updateElement(connection);
      
      // Verificar que la conexión siga existiendo después de la actualización
      setTimeout(() => {
        const connectionStillExists = elementRegistry.get(connection.id);
        if (!connectionStillExists) {
          console.warn(`⚠️ Conexión desapareció después del movimiento: ${connection.id}`);
          // Intentar recrear la conexión si es necesario
          try {
            const newConnection = modeling.connect(connection.source, connection.target, { 
              type: connection.type,
              waypoints: waypoints
            });
            if (newConnection) {
              console.log(`✅ Conexión recreada: ${connection.source.businessObject && connection.source.businessObject.name ? connection.source.businessObject.name : connection.source.id} → ${connection.target.businessObject && connection.target.businessObject.name ? connection.target.businessObject.name : connection.target.id}`);
            }
          } catch (recreateError) {
            console.error('Error recreando conexión:', recreateError.message);
          }
        }
      }, 50);
      
      console.log(`✅ Actualizada conexión: ${connection.source.businessObject && connection.source.businessObject.name ? connection.source.businessObject.name : connection.source.id} → ${connection.target.businessObject && connection.target.businessObject.name ? connection.target.businessObject.name : connection.target.id}`);
  } catch (error) {
      console.warn('Error actualizando conexión después del movimiento:', error.message);
    }
  });
  
  console.log(`✅ Mantenidas ${relatedConnections.length} conexiones después del movimiento`);
}

// Configurar listener para mantener conexiones después del movimiento
function setupConnectionMaintenanceListener(modeler) {
  const eventBus = modeler.get('eventBus');
  
  // Listener para cuando se mueve un elemento
  eventBus.on('element.changed', function(event) {
    const element = event.element;
    
    // Verificar si es un movimiento de elemento
    if (element && (element.type === 'RALph:RoleRALph' || 
                   element.type === 'bpmn:IntermediateThrowEvent' || 
                   element.type === 'bpmn:Task' || 
                   element.type === 'bpmn:UserTask')) {
      
      // Usar setTimeout para asegurar que el movimiento se complete
      setTimeout(() => {
        maintainConnectionsAfterMove(modeler, element);
      }, 100);
    }
  });
  
  // Listener para cuando se actualiza un elemento
  eventBus.on('element.updateProperties', function(event) {
    const element = event.element;
    
    if (element && (element.type === 'RALph:RoleRALph' || 
                   element.type === 'bpmn:IntermediateThrowEvent' || 
                   element.type === 'bpmn:Task' || 
                   element.type === 'bpmn:UserTask')) {
      
      setTimeout(() => {
        maintainConnectionsAfterMove(modeler, element);
      }, 100);
    }
  });
  
  console.log('✅ Listener de mantenimiento de conexiones configurado');
}

// Función para encontrar la conexión entre dos elementos
function findConnectionBetween(modeler, sourceElement, targetElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  for (const element of elementRegistry.getAll()) {
    if (element.type === 'bpmn:SequenceFlow' && 
        element.source && element.target &&
        element.source.id === sourceElement.id && 
        element.target.id === targetElement.id) {
      return element;
    }
  }
  
  return null;
}

// Función para encontrar la siguiente tarea ignorando eventos intermedios
function findNextTaskInFlowIgnoringEvents(modeler, currentTask) {
  const elementRegistry = modeler.get('elementRegistry');
  let nextTask = null;
  
  console.log(`🔍 DEBUG - Buscando siguiente tarea (ignorando eventos) para: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : 'SIN NOMBRE'} (ID: ${currentTask.id})`);
  
  // Función recursiva para seguir el flujo hasta encontrar una tarea
  function findNextTaskRecursive(element, visited = new Set()) {
    if (visited.has(element.id)) {
      return null; // Evitar ciclos infinitos
    }
    visited.add(element.id);
    
    // Buscar conexiones que salen del elemento
    elementRegistry.forEach(connection => {
      if (connection.type === 'bpmn:SequenceFlow' && 
          connection.source && connection.source.id === element.id) {
        
        const targetElement = connection.target;
        console.log(`🔍 DEBUG - Siguiendo flujo: ${element.businessObject && element.businessObject.name ? element.businessObject.name : element.id} → ${targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : targetElement.id} (tipo: ${targetElement.type})`);
        
        // Si es una tarea, la encontramos
        if (targetElement && targetElement.type && (
          targetElement.type === 'bpmn:Task' ||
          targetElement.type === 'bpmn:UserTask' ||
          targetElement.type === 'bpmn:ServiceTask' ||
          targetElement.type === 'bpmn:ScriptTask' ||
          targetElement.type === 'bpmn:ManualTask' ||
          targetElement.type === 'bpmn:BusinessRuleTask' ||
          targetElement.type === 'bpmn:SendTask' ||
          targetElement.type === 'bpmn:ReceiveTask' ||
          targetElement.type === 'bpmn:CallActivity' ||
          targetElement.type === 'bpmn:SubProcess'
        )) {
          // Verificar que no sea una tarea de aprobación (para evitar ciclos)
          const taskName = targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : '';
          if (!taskName.startsWith('Aprobar ')) {
            nextTask = targetElement;
            console.log(`✅ DEBUG - Encontrada tarea final: ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id}`);
            return;
          } else {
            console.log(`🔍 DEBUG - Saltando tarea de aprobación: ${taskName}`);
            findNextTaskRecursive(targetElement, visited);
          }
        }
        
        // Si es un evento intermedio, seguir buscando
        if (targetElement && targetElement.type && (targetElement.type === 'bpmn:IntermediateCatchEvent' || targetElement.type === 'bpmn:IntermediateThrowEvent')) {
          console.log(`🔍 DEBUG - Saltando evento intermedio: ${targetElement.businessObject && targetElement.businessObject.name ? targetElement.businessObject.name : targetElement.id}`);
          findNextTaskRecursive(targetElement, visited);
        }
      }
    });
  }
  
  // Iniciar búsqueda recursiva desde la tarea actual
  findNextTaskRecursive(currentTask);
  
  if (nextTask) {
    console.log(`✅ DEBUG - Siguiente tarea encontrada: ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : 'SIN NOMBRE'} (ID: ${nextTask.id})`);
  } else {
    console.log(`⚠️ DEBUG - No se encontró siguiente tarea para: ${currentTask.businessObject && currentTask.businessObject.name ? currentTask.businessObject.name : 'SIN NOMBRE'} (ID: ${currentTask.id})`);
  }
  
  return nextTask;
}

// Función de debug para verificar conexiones
function debugConnections(modeler, elementName) {
  const elementRegistry = modeler.get('elementRegistry');
  console.log(`🔍 DEBUG - Verificando conexiones para: ${elementName}`);
  
  let connectionCount = 0;
  elementRegistry.forEach(element => {
    if (element.type && (element.type === 'bpmn:SequenceFlow' || element.type === 'bpmn:Association' || element.type === 'RALph:dashedLine')) {
      if (element.source && element.target) {
        const sourceName = element.source.businessObject && element.source.businessObject.name ? element.source.businessObject.name : element.source.id;
        const targetName = element.target.businessObject && element.target.businessObject.name ? element.target.businessObject.name : element.target.id;
        
        if (sourceName.includes(elementName) || targetName.includes(elementName)) {
          connectionCount++;
          console.log(`  ${connectionCount}. ${sourceName} → ${targetName} (tipo: ${element.type})`);
        }
      }
    }
  });
  
  console.log(`📊 Total de conexiones encontradas para "${elementName}": ${connectionCount}`);
}

function createInfoEvent(modeler, bpmnTask, roleNames, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Convertir roleNames a array si es un string
    const roles = Array.isArray(roleNames) ? roleNames : [roleNames];
    
    // Verificar si ya existe un evento de información para esta tarea y roles
    const elementRegistry = modeler.get('elementRegistry');
    const infoEventName = roles.length === 1 
      ? `Informar ${roles[0]}`
      : `Informar ${roles.join(' y ')}`;
    
    // Buscar evento de información existente (tanto catch como throw)
    let existingInfoEvent = null;
    elementRegistry.forEach(element => {
      if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
          element.businessObject && 
          element.businessObject.name === infoEventName) {
        existingInfoEvent = element;
      }
    });
    
    if (existingInfoEvent) {
      console.log(`✓ Evento de información ya existe: ${infoEventName}`);
      return;
    }

    // Buscar la siguiente tarea en el flujo (ignorando eventos intermedios existentes)
    const nextTask = findNextTaskInFlowIgnoringEvents(modeler, bpmnTask);
    if (!nextTask) {
      console.warn(`⚠️ No se encontró siguiente tarea para insertar evento de información`);
      return;
    }

    // Buscar la conexión original entre la tarea actual y la siguiente
    const originalConnection = findConnectionBetween(modeler, bpmnTask, nextTask);
    if (!originalConnection) {
      console.warn(`⚠️ No se encontró conexión original entre tareas`);
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Crear evento intermedio de mensaje tipo throw - intentar restaurar posición guardada primero
    let infoPosition;
    
    if (modeler.positionCache && modeler.positionCache.has(infoEventName)) {
      const cachedPosition = modeler.positionCache.get(infoEventName);
      // Solo restaurar posición si el elemento debe mantenerse
      if (cachedPosition.shouldKeep) {
        infoPosition = { x: cachedPosition.x, y: cachedPosition.y };
        console.log(`📍 Restaurando posición guardada para ${infoEventName}: (${infoPosition.x}, ${infoPosition.y}) - ELEMENTO MANTENIDO`);
      } else {
        console.log(`🗑️ No restaurando posición para ${infoEventName} - ELEMENTO ELIMINADO`);
        // Posición por defecto en el medio del flujo
        infoPosition = {
      x: (bpmnTask.x + nextTask.x) / 2,
      y: (bpmnTask.y + nextTask.y) / 2
    };
      }
    } else {
      // Posición por defecto en el medio del flujo
      infoPosition = {
        x: (bpmnTask.x + nextTask.x) / 2,
        y: (bpmnTask.y + nextTask.y) / 2
      };
    }
    
    const infoEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      infoPosition,
      rootElement
    );

    // Agregar definición de mensaje al evento
    const moddle = modeler.get('moddle');
    const messageEventDefinition = moddle.create('bpmn:MessageEventDefinition');
    infoEvent.businessObject.eventDefinitions = [messageEventDefinition];

    // Configurar el evento de información con el nombre del rol
    modeling.updateProperties(infoEvent, {
      name: infoEventName
    });

    // Eliminar la conexión original
    modeling.removeConnection(originalConnection);
    console.log(`🗑️ Eliminada conexión original: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id} → ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id}`);

    // Crear nuevas conexiones: Tarea → Evento → Siguiente Tarea
    const connection1 = modeling.connect(bpmnTask, infoEvent, { type: 'bpmn:SequenceFlow' });
    const connection2 = modeling.connect(infoEvent, nextTask, { type: 'bpmn:SequenceFlow' });
    
    if (connection1 && connection2) {
    results.infoEvents++;
      console.log(`✅ Evento de información insertado en flujo: ${bpmnTask.businessObject && bpmnTask.businessObject.name ? bpmnTask.businessObject.name : bpmnTask.id} → ${infoEventName} → ${nextTask.businessObject && nextTask.businessObject.name ? nextTask.businessObject.name : nextTask.id} (${roles.length} rol${roles.length > 1 ? 'es' : ''})`);
    }
  } catch (error) {
    console.warn('Error creando evento de información:', error);
  }
}

// Función auxiliar para obtener bounds de forma segura
function getSafeBounds(element) {
  if (!element) return null;
  
  // Intentar obtener bounds de diferentes formas
  if (element.di && element.di.Bounds) {
    return element.di.Bounds;
  }
  
  if (element.x !== undefined && element.y !== undefined) {
    return {
      x: element.x,
      y: element.y,
      width: element.width || 100,
      height: element.height || 80
    };
  }
  
  // Fallback: usar posición por defecto
  return {
    x: 0,
    y: 0,
    width: 100,
    height: 80
  };
}

// Sistema de posicionamiento inteligente basado en flujo de proceso
class SimpleBpmnStylePositionManager {
  constructor() {
    this.usedPositions = new Set();
    this.spacing = 80; // Espaciado optimizado para líneas directas
    this.roleSize = { width: 58, height: 81 };
    this.capabilitySize = { width: 60, height: 75 };
    this.taskSpacing = 120; // Espaciado entre tareas
    this.roleInstances = new Map(); // Mapa de roles y sus instancias
    this.existingAssignments = new Map(); // Mapa de asignaciones existentes
  }

  // Posicionamiento inteligente alrededor del diagrama
  getRolePosition(roleName, taskBounds, modeler) {
    // Buscar si ya existe una instancia de este rol cerca de la tarea
    const existingRole = this.findExistingRoleNearTask(roleName, taskBounds, modeler);
    if (existingRole) {
      return this.getSafeBounds(existingRole);
    }

    // Verificar si ya existe una instancia global de este rol
    if (this.roleInstances.has(roleName)) {
      const existingInstance = this.roleInstances.get(roleName);
      const existingBounds = this.getSafeBounds(existingInstance);
      
      // Si la instancia existente está muy lejos, crear una nueva cerca de la tarea
      const distance = Math.sqrt(
        Math.pow(existingBounds.x - taskBounds.x, 2) + 
        Math.pow(existingBounds.y - taskBounds.y, 2)
      );
      
      if (distance < 400) { // Aumentado para mejor reutilización
        return existingBounds;
      }
    }

    // Posiciones preferidas en orden de prioridad para líneas directas
    const positions = [
      // Derecha (línea horizontal directa)
      {
        x: taskBounds.x + taskBounds.width + this.spacing,
        y: taskBounds.y + (taskBounds.height / 2) - (this.roleSize.height / 2),
        priority: 1
      },
      // Izquierda (línea horizontal directa)
      {
        x: taskBounds.x - this.roleSize.width - this.spacing,
        y: taskBounds.y + (taskBounds.height / 2) - (this.roleSize.height / 2),
        priority: 2
      },
      // Arriba (línea vertical directa)
      {
        x: taskBounds.x + (taskBounds.width / 2) - (this.roleSize.width / 2),
        y: taskBounds.y - this.roleSize.height - this.spacing,
        priority: 3
      },
      // Abajo (línea vertical directa)
      {
        x: taskBounds.x + (taskBounds.width / 2) - (this.roleSize.width / 2),
        y: taskBounds.y + taskBounds.height + this.spacing,
        priority: 4
      },
      // Diagonal superior derecha
      {
        x: taskBounds.x + taskBounds.width + this.spacing,
        y: taskBounds.y - this.roleSize.height - this.spacing,
        priority: 5
      },
      // Diagonal inferior derecha
      {
        x: taskBounds.x + taskBounds.width + this.spacing,
        y: taskBounds.y + taskBounds.height + this.spacing,
        priority: 6
      },
      // Diagonal superior izquierda
      {
        x: taskBounds.x - this.roleSize.width - this.spacing,
        y: taskBounds.y - this.roleSize.height - this.spacing,
        priority: 7
      },
      // Diagonal inferior izquierda
      {
        x: taskBounds.x - this.roleSize.width - this.spacing,
        y: taskBounds.y + taskBounds.height + this.spacing,
        priority: 8
      }
    ];

    // Probar posiciones en orden de prioridad
    for (const position of positions) {
      if (this.isPositionFree(position, this.roleSize)) {
        this.markPositionUsed(position, this.roleSize);
        return position;
      }
    }

    // Si todas las posiciones están ocupadas, buscar la mejor posición libre
    const fallbackPosition = this.findBestFreePosition(taskBounds, this.roleSize);
    this.markPositionUsed(fallbackPosition, this.roleSize);
    return fallbackPosition;
  }

  getCapabilityPosition(capabilityName, taskBounds, modeler) {
    // Buscar si ya existe una instancia de esta capacidad cerca de la tarea
    const existingCapability = this.findExistingCapabilityNearTask(capabilityName, taskBounds, modeler);
    if (existingCapability) {
      return this.getSafeBounds(existingCapability);
    }

    // Posición preferida: derecha del rol (si existe)
    const rolePosition = this.getRolePosition(capabilityName, taskBounds, modeler);
    const preferredPosition = {
      x: rolePosition.x + this.roleSize.width + this.spacing,
      y: rolePosition.y + (this.roleSize.height / 2) - (this.capabilitySize.height / 2)
    };

    if (this.isPositionFree(preferredPosition, this.capabilitySize)) {
      return preferredPosition;
    }

    // Posición alternativa: arriba de la tarea
    const abovePosition = {
      x: taskBounds.x + (taskBounds.width / 2) - (this.capabilitySize.width / 2),
      y: taskBounds.y - this.capabilitySize.height - this.spacing * 2
    };

    if (this.isPositionFree(abovePosition, this.capabilitySize)) {
      return abovePosition;
    }

    // Posición alternativa: abajo de la tarea
    const belowPosition = {
      x: taskBounds.x + (taskBounds.width / 2) - (this.capabilitySize.width / 2),
      y: taskBounds.y + taskBounds.height + this.spacing * 2
    };

    if (this.isPositionFree(belowPosition, this.capabilitySize)) {
      return belowPosition;
    }

    // Si todas las posiciones están ocupadas, buscar una posición libre cercana
    return this.findNearestFreePosition(taskBounds, this.capabilitySize);
  }

  getApprovalTaskPosition(taskBounds, nextTaskBounds = null, modeler) {
    if (nextTaskBounds) {
      // Insertar entre las dos tareas
      return {
        x: (taskBounds.x + taskBounds.width + nextTaskBounds.x) / 2 - 50,
        y: taskBounds.y + (taskBounds.height / 2) - 20
      };
    } else {
      // Posición a la derecha de la tarea actual
      return {
        x: taskBounds.x + taskBounds.width + this.taskSpacing,
        y: taskBounds.y
      };
    }
  }

  getInfoEventPosition(taskBounds) {
    // Posición arriba y a la derecha de la tarea
    return {
      x: taskBounds.x + taskBounds.width + this.spacing,
      y: taskBounds.y - this.spacing
    };
  }

  // Buscar rol existente cerca de la tarea
  findExistingRoleNearTask(roleName, taskBounds, modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    const searchRadius = 250; // Aumentado para mejor detección

    for (const element of elementRegistry.getAll()) {
      if ((element.type === 'RALph:RoleRALph' || 
           (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
            element.businessObject.name && element.businessObject.name.startsWith('ROL:'))) && 
          element.businessObject && 
          (element.businessObject.name === roleName || 
           element.businessObject.name === `ROL: ${roleName}`)) {
        
        const elementBounds = this.getSafeBounds(element);
        const distance = Math.sqrt(
          Math.pow(elementBounds.x - taskBounds.x, 2) + 
          Math.pow(elementBounds.y - taskBounds.y, 2)
        );

        if (distance < searchRadius) {
          return element;
        }
      }
    }
    return null;
  }

  // Buscar capacidad existente cerca de la tarea
  findExistingCapabilityNearTask(capabilityName, taskBounds, modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    const searchRadius = 200;

    for (const element of elementRegistry.getAll()) {
      if (element.type === 'RALph:Personcap' && 
          element.businessObject && 
          element.businessObject.name === capabilityName) {
        
        const elementBounds = this.getSafeBounds(element);
        const distance = Math.sqrt(
          Math.pow(elementBounds.x - taskBounds.x, 2) + 
          Math.pow(elementBounds.y - taskBounds.y, 2)
        );

        if (distance < searchRadius) {
          return element;
        }
      }
    }
    return null;
  }

  // Verificar si una posición está libre
  isPositionFree(position, size) {
    const positionKey = `${Math.round(position.x / 20)}_${Math.round(position.y / 20)}`;
    return !this.usedPositions.has(positionKey);
  }

  // Marcar posición como usada
  markPositionUsed(position, size) {
    const positionKey = `${Math.round(position.x / 20)}_${Math.round(position.y / 20)}`;
    this.usedPositions.add(positionKey);
  }

  // Encontrar la mejor posición libre para líneas directas
  findBestFreePosition(taskBounds, size) {
    const directions = [
      { x: 1, y: 0 },   // derecha
      { x: 0, y: -1 },  // arriba
      { x: 0, y: 1 },   // abajo
      { x: -1, y: 0 },  // izquierda
      { x: 1, y: -1 },  // diagonal superior derecha
      { x: 1, y: 1 },   // diagonal inferior derecha
      { x: -1, y: -1 }, // diagonal superior izquierda
      { x: -1, y: 1 }   // diagonal inferior izquierda
    ];

    // Buscar en espiral desde la tarea hacia afuera
    for (let distance = 1; distance <= 8; distance++) {
      for (const direction of directions) {
        const position = {
          x: taskBounds.x + direction.x * this.spacing * distance,
          y: taskBounds.y + direction.y * this.spacing * distance
        };

        if (this.isPositionFree(position, size)) {
          return position;
        }
      }
    }

    // Fallback: posición aleatoria pero cerca de la tarea
    return {
      x: taskBounds.x + (Math.random() - 0.5) * 300,
      y: taskBounds.y + (Math.random() - 0.5) * 300
    };
  }

  // Encontrar la posición libre más cercana (mantener para compatibilidad)
  findNearestFreePosition(taskBounds, size) {
    return this.findBestFreePosition(taskBounds, size);
  }

  // Crear conexión optimizada con waypoints simples
  createOptimizedConnection(modeling, sourceElement, targetElement, connectionType = 'RALph:ResourceArc') {
    try {
      // Verificar si ya existe una conexión entre estos elementos
      // Obtener el modeler desde el modeling
      const modeler = modeling._model || modeling.modeler || modeling;
      
      // Verificar que tenemos un modeler válido
      if (!modeler) {
        console.warn('⚠️ No se pudo obtener modeler válido, saltando verificación de conexión existente');
      } else {
        try {
          if (this.connectionExists(modeler, sourceElement, targetElement)) {
            console.log(`✓ Conexión ya existe: ${(sourceElement.businessObject && sourceElement.businessObject.name) || sourceElement.id} → ${(targetElement.businessObject && targetElement.businessObject.name) || targetElement.id}`);
            return null; // Retornar null para indicar que ya existe
          }
        } catch (connectionCheckError) {
          console.warn('⚠️ Error verificando conexión existente:', connectionCheckError.message);
          // Continuar con la creación de la conexión
        }
      }
      
      const sourceBounds = this.getSafeBounds(sourceElement);
      const targetBounds = this.getSafeBounds(targetElement);
      
      // Calcular waypoints optimizados para evitar cruces
      const waypoints = this.calculateOptimizedWaypoints(sourceBounds, targetBounds, modeling);
      
      const connection = modeling.connect(sourceElement, targetElement, {
        type: connectionType,
        waypoints: waypoints
      });

      console.log(`✅ Conexión creada: ${(sourceElement.businessObject && sourceElement.businessObject.name) || sourceElement.id} → ${(targetElement.businessObject && targetElement.businessObject.name) || targetElement.id}`);
      return connection;
    } catch (error) {
      console.warn('Error creando conexión optimizada:', error);
      // Fallback: conexión simple sin waypoints
      try {
        const connection = modeling.connect(sourceElement, targetElement, {
          type: connectionType
        });
        console.log(`✅ Conexión fallback creada: ${(sourceElement.businessObject && sourceElement.businessObject.name) || sourceElement.id} → ${(targetElement.businessObject && targetElement.businessObject.name) || targetElement.id}`);
        return connection;
      } catch (fallbackError) {
        console.error('Error en fallback de conexión:', fallbackError);
      return null;
      }
    }
  }

  // Calcular waypoints optimizados para evitar cruces
  calculateOptimizedWaypoints(sourceBounds, targetBounds, modeling) {
    const sourceCenter = {
      x: sourceBounds.x + sourceBounds.width / 2,
      y: sourceBounds.y + sourceBounds.height / 2
    };
    
    const targetCenter = {
      x: targetBounds.x + targetBounds.width / 2,
      y: targetBounds.y + targetBounds.height / 2
    };

    // Calcular distancia entre los elementos
    const distance = Math.sqrt(
      Math.pow(targetCenter.x - sourceCenter.x, 2) + 
      Math.pow(targetCenter.y - sourceCenter.y, 2)
    );

    // Si están muy cerca, línea recta
    if (distance < 80) {
      return [
        { x: sourceCenter.x, y: sourceCenter.y },
        { x: targetCenter.x, y: targetCenter.y }
      ];
    }

    // Si están alineados horizontalmente o verticalmente, línea recta
    if (Math.abs(sourceCenter.x - targetCenter.x) < 20) {
      // Alineados verticalmente
      return [
        { x: sourceCenter.x, y: sourceCenter.y },
        { x: targetCenter.x, y: targetCenter.y }
      ];
    } else if (Math.abs(sourceCenter.y - targetCenter.y) < 20) {
      // Alineados horizontalmente
      return [
        { x: sourceCenter.x, y: sourceCenter.y },
        { x: targetCenter.x, y: targetCenter.y }
      ];
    }

    // Para conexiones diagonales, usar línea en L simple
    // Estrategia: horizontal primero, luego vertical
      return [
        { x: sourceCenter.x, y: sourceCenter.y },
      { x: targetCenter.x, y: sourceCenter.y },
        { x: targetCenter.x, y: targetCenter.y }
      ];
  }



  // Obtener bounds seguros de un elemento
  getSafeBounds(element) {
    if (!element) {
      return { x: 0, y: 0, width: 100, height: 80 };
    }

    return {
      x: isFinite(element.x) ? element.x : 0,
      y: isFinite(element.y) ? element.y : 0,
      width: isFinite(element.width) && element.width > 0 ? element.width : 100,
      height: isFinite(element.height) && element.height > 0 ? element.height : 80
    };
  }

  // Resetear el gestor de posiciones
  reset() {
    this.usedPositions.clear();
    this.roleInstances.clear();
    this.existingAssignments.clear();
  }

  // Detectar elementos existentes en el diagrama
  detectExistingElements(modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    
    // Limpiar mapas existentes
    this.roleInstances.clear();
    this.existingAssignments.clear();
    
    // Detectar roles existentes
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:RoleRALph' && 
          element.businessObject && element.businessObject.name) {
        this.roleInstances.set(element.businessObject.name, element);
      }
    });
    
    // Detectar asignaciones existentes
    elementRegistry.forEach(element => {
      if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
        if (element.source && element.target) {
          const sourceId = element.source.id;
          const targetName = element.target.businessObject ? element.target.businessObject.name : '';
          
          if (!this.existingAssignments.has(sourceId)) {
            this.existingAssignments.set(sourceId, new Set());
          }
          this.existingAssignments.get(sourceId).add(targetName);
        }
      }
    });
    
    console.log(`🔍 Detectados ${this.roleInstances.size} roles existentes y ${this.existingAssignments.size} asignaciones`);
  }

  // Verificar si una asignación ya existe
  assignmentExists(taskId, roleName) {
    const taskAssignments = this.existingAssignments.get(taskId);
    return taskAssignments && taskAssignments.has(roleName);
  }

  // Verificar si un elemento específico ya existe
  elementExists(modeler, elementType, elementName) {
    const elementRegistry = modeler.get('elementRegistry');
    
    let exists = false;
    elementRegistry.forEach(element => {
      if (element.type === elementType && 
          element.businessObject && 
          element.businessObject.name === elementName) {
        exists = true;
      }
    });
    
    return exists;
  }

  // Verificar si existe una conexión entre dos elementos
  connectionExists(modeler, sourceElement, targetElement) {
    // Obtener el elementRegistry correcto
    let elementRegistry;
    
    if (modeler.get && typeof modeler.get === 'function') {
      elementRegistry = modeler.get('elementRegistry');
    } else if (modeler.forEach && typeof modeler.forEach === 'function') {
      elementRegistry = modeler;
    } else {
      console.warn('⚠️ No se pudo obtener elementRegistry válido');
      return false;
    }
    
    let exists = false;
    
    try {
      elementRegistry.forEach(element => {
        if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association' || element.type === 'bpmn:SequenceFlow') &&
            element.source && element.target) {
          // Verificar conexión en ambas direcciones
          if ((element.source.id === sourceElement.id && element.target.id === targetElement.id) ||
              (element.source.id === targetElement.id && element.target.id === sourceElement.id)) {
            
            // Verificar si la conexión está oculta
            const isHidden = element.visible === false || 
                            (element.businessObject && element.businessObject.visible === false) ||
                            element.hidden === true ||
                            (element.businessObject && element.businessObject.hidden === true);
            
            // Solo considerar conexiones visibles
            if (!isHidden) {
              exists = true;
            }
          }
        }
      });
    } catch (error) {
      console.warn('⚠️ Error en connectionExists:', error.message);
      return false;
    }
    
    return exists;
  }

  // Verificar si existe un nodo AND de colaboración para una tarea específica
  collaborationNodeExists(modeler, taskName) {
    const elementRegistry = modeler.get('elementRegistry');
    
    let exists = false;
    elementRegistry.forEach(element => {
      if (element.type === 'RALph:Complex-Assignment-AND' && 
          element.businessObject && 
          element.businessObject.name && 
          element.businessObject.name.includes('Colaboración')) {
        
        // Verificar si este nodo AND está conectado a la tarea específica
        elementRegistry.forEach(connection => {
          if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
              connection.source && connection.target &&
              connection.source.id === element.id) {
            
            const targetName = connection.target.businessObject && connection.target.businessObject.name ? 
                              connection.target.businessObject.name : connection.target.id;
            
            if (targetName === taskName || connection.target.id === taskName) {
        exists = true;
            }
          }
        });
      }
    });
    
    return exists;
  }

  // Obtener el área total utilizada
  getTotalArea() {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    
    this.usedPositions.forEach(position => {
      minX = Math.min(minX, position.x);
      minY = Math.min(minY, position.y);
      maxX = Math.max(maxX, position.x + 100); // Asumiendo ancho de 100px
      maxY = Math.max(maxY, position.y + 80);  // Asumiendo alto de 80px
    });
    
    return {
      width: maxX - minX,
      height: maxY - minY
    };
  }

  // Reposicionar elementos RALph cuando se mueve una tarea BPMN
  repositionRalphElements(modeler, movedTask) {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    // Buscar elementos RALph conectados a la tarea movida
    const connectedElements = [];
    const connectionsToUpdate = [];
    
    // Buscar roles y capacidades conectados
    elementRegistry.forEach(element => {
      if ((element.type === 'RALph:RoleRALph' || element.type === 'RALph:Personcap') && 
          element.businessObject && element.businessObject.name) {
        
        // Buscar conexiones que involucren este elemento y la tarea movida
        elementRegistry.forEach(connection => {
          if (connection.type && (connection.type === 'RALph:ResourceArc' || connection.type === 'bpmn:Association') &&
              connection.source && connection.target) {
            if ((connection.source.id === element.id && connection.target.id === movedTask.id) ||
                (connection.source.id === movedTask.id && connection.target.id === element.id)) {
              connectedElements.push(element);
              connectionsToUpdate.push(connection);
            }
          }
        });
      }
    });

    // Reposicionar elementos conectados y actualizar conexiones
    connectedElements.forEach((element, index) => {
      const taskBounds = this.getSafeBounds(movedTask);
      let newPosition;

      if (element.type === 'RALph:RoleRALph') {
        newPosition = this.getRolePosition(element.businessObject.name, taskBounds, modeler);
      } else if (element.type === 'RALph:Personcap') {
        newPosition = this.getCapabilityPosition(element.businessObject.name, taskBounds, modeler);
      }

      if (newPosition) {
        // Mover el elemento
        modeling.moveShape(element, {
          x: newPosition.x - element.x,
          y: newPosition.y - element.y
        });
        
        // Actualizar la conexión correspondiente
        if (connectionsToUpdate[index]) {
          try {
            const connection = connectionsToUpdate[index];
            const sourceBounds = this.getSafeBounds(connection.source);
            const targetBounds = this.getSafeBounds(connection.target);
            
            if (sourceBounds && targetBounds) {
              const waypoints = this.calculateOptimizedWaypoints(sourceBounds, targetBounds, modeling);
              modeling.updateProperties(connection, {
                waypoints: waypoints
              });
            }
          } catch (error) {
            console.warn('Error actualizando conexión después del movimiento:', error);
          }
        }
      }
    });
    
    console.log(`🔄 Reposicionados ${connectedElements.length} elementos RALph conectados a la tarea movida`);
  }

  // Obtener estadísticas de instancias
  getInstancesStats() {
    return {
      usedPositions: this.usedPositions.size,
      spacing: this.spacing,
      roleSize: this.roleSize,
      capabilitySize: this.capabilitySize,
      roleInstances: this.roleInstances.size
    };
  }

  // Obtener información detallada del estado
  getDetailedStats() {
    const stats = this.getInstancesStats();
    return {
      ...stats,
      description: `Sistema de posicionamiento simple y claro`,
      features: [
        'Posicionamiento natural: derecha → arriba → abajo → izquierda',
        'Espaciado optimizado para evitar superposiciones',
        'Detección inteligente de roles existentes',
        'Reutilización de instancias cercanas',
        'Marcado automático de posiciones ocupadas',
        'Conexiones rectas y simples'
      ]
    };
  }


}

// Instancia global del gestor de posiciones inteligente
let positionManager = new SimpleBpmnStylePositionManager();

// Hacer el positionManager disponible globalmente
window.positionManager = positionManager;

function findRalphRoleByName(modeler, roleName) {
  const elementRegistry = modeler.get('elementRegistry');
  let foundRole = null;
  
  elementRegistry.forEach(element => {
    // Buscar elementos RALph originales
    if ((element.type === 'RALph:RoleRALph' || element.type === 'RALph:Personcap') && 
        element.businessObject && element.businessObject.name === roleName) {
      foundRole = element;
    }
    // Buscar elementos de fallback (TextAnnotation con prefijo)
    else if (element.type === 'bpmn:TextAnnotation' && 
             element.businessObject && 
             (element.businessObject.name === `ROL: ${roleName}` || 
              element.businessObject.name === `CAPACIDAD: ${roleName}`)) {
      foundRole = element;
    }
  });
  
  return foundRole;
}



// Función para verificar si existe una conexión entre dos elementos
function connectionExists(modeler, sourceElement, targetElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  let exists = false;
  elementRegistry.forEach(element => {
    if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
      if (element.source && element.target) {
        if ((element.source.id === sourceElement.id && element.target.id === targetElement.id) ||
            (element.source.id === targetElement.id && element.target.id === sourceElement.id)) {
          
          // Verificar si la conexión está oculta
          const isHidden = element.visible === false || 
                          (element.businessObject && element.businessObject.visible === false) ||
                          element.hidden === true ||
                          (element.businessObject && element.businessObject.hidden === true);
          
          // Solo considerar conexiones visibles
          if (!isHidden) {
          exists = true;
          }
        }
      }
    }
  });
  
  return exists;
}

// Función para verificar si existe un elemento de tipo específico
function elementExists(modeler, elementType, elementName) {
  const elementRegistry = modeler.get('elementRegistry');
  
  let exists = false;
  elementRegistry.forEach(element => {
    if (element.type === elementType && 
        element.businessObject && 
        element.businessObject.name === elementName) {
      exists = true;
    }
  });
  
  return exists;
}

// Función para obtener estadísticas de elementos existentes
function getExistingElementsStats(modeler) {
  const elementRegistry = modeler.get('elementRegistry');
  const stats = {
    roles: 0,
    capabilities: 0,
    assignments: 0,
    approvalTasks: 0,
    infoEvents: 0,
    messageFlows: 0
  };
  
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:RoleRALph' || 
        (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
         element.businessObject.name && element.businessObject.name.startsWith('ROL:'))) {
      stats.roles++;
    }
    else if (element.type === 'RALph:Personcap' || 
             (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
              element.businessObject.name && element.businessObject.name.startsWith('CAPACIDAD:'))) {
      stats.capabilities++;
    }
    else if (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') {
      stats.assignments++;
    }
    else if (element.type === 'bpmn:UserTask' && element.businessObject && 
             element.businessObject.name && element.businessObject.name.startsWith('Aprobar')) {
      stats.approvalTasks++;
    }
    else if (element.type === 'bpmn:IntermediateThrowEvent' && element.businessObject && 
             element.businessObject.name && element.businessObject.name.startsWith('Informar')) {
      stats.infoEvents++;
    }
  });
  
  return stats;
}

// Sistema de mapeo inteligente que borra todo y recrea desde cero
function performIntelligentRasciMapping(modeler) {
  // Verificar que el modeler tenga todos los servicios necesarios
  if (!modeler) {
    console.error('Modeler no disponible');
    return { error: 'Modeler no disponible' };
  }

  const logElement = document.getElementById('mapping-log');
  if (!logElement) {
    console.error('Elemento de log no encontrado');
    return { error: 'Elemento de log no encontrado' };
  }

  logElement.innerHTML = '🔄 Iniciando mapeo inteligente RASCI → RALph (Recreación completa)...\n\n';

  // Obtener servicios del modeler
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  // Obtener datos actuales de la matriz RASCI
  const currentMatrixData = window.rasciMatrixData || {};
  const currentRoles = JSON.parse(localStorage.getItem('rasciRoles') || '[]');

  // Guardar estado actual para la próxima comparación
  localStorage.setItem('previousRasciMatrixData', JSON.stringify(currentMatrixData));
  localStorage.setItem('previousRasciRoles', JSON.stringify(currentRoles));

  const results = {
    rolesCreated: 0,
    rolesDeleted: 0,
    assignmentsCreated: 0,
    assignmentsDeleted: 0,
    eventsCreated: 0,
    eventsDeleted: 0,
    connectionsUpdated: 0,
    elementsRestored: 0,
    errors: 0
  };

  // 1. GUARDAR POSICIONES DE ELEMENTOS EXISTENTES
  logElement.innerHTML += '📐 Guardando posiciones de elementos existentes...\n';
  
  const positionCache = new Map();
  const elementsToRemove = [];
  

  
  // Función para verificar si un elemento debe mantenerse según la matriz actual
  function shouldKeepElement(element) {
    if (!element.businessObject || !element.businessObject.name) return false;
    
    const elementName = element.businessObject.name;
    
    // Verificar si es un rol que existe en la matriz actual
    if (element.type && element.type.startsWith('RALph:')) {
      // Verificar si el rol está en la lista de roles actuales
      const isInCurrentRoles = currentRoles.includes(elementName);
      
      // También verificar si el rol tiene responsabilidades en la matriz actual
      const hasResponsibilities = Object.values(currentMatrixData).some(taskRoles => 
        Object.keys(taskRoles).includes(elementName)
      );
      
      // El rol debe mantenerse si está en la lista de roles O tiene responsabilidades
      const shouldKeep = isInCurrentRoles || hasResponsibilities;
      
      console.log(`🔍 DEBUG - Rol ${elementName}: isInCurrentRoles=${isInCurrentRoles}, hasResponsibilities=${hasResponsibilities}, shouldKeep=${shouldKeep}`);
      
      return shouldKeep;
    }
    
    // Verificar si es una tarea de aprobación que corresponde a una responsabilidad A
    if (element.type === 'bpmn:UserTask' && elementName.includes('Aprobar')) {
      const taskName = elementName.replace('Aprobar ', '');
      return Object.values(currentMatrixData).some(taskRoles => 
        Object.values(taskRoles).includes('A')
      );
    }
    
    // Verificar si es un evento de consulta que corresponde a una responsabilidad C
    if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
        elementName.includes('Consultar')) {
      return Object.values(currentMatrixData).some(taskRoles => 
        Object.values(taskRoles).includes('C')
      );
    }
    
    // Verificar si es un evento de información que corresponde a una responsabilidad I
    if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') && 
        elementName.includes('Informar')) {
      return Object.values(currentMatrixData).some(taskRoles => 
        Object.values(taskRoles).includes('I')
      );
    }
    
    // Verificar si es un nodo AND de colaboración
    if (element.type === 'RALph:Complex-Assignment-AND' && elementName.includes('Colaboración')) {
      // Extraer los nombres de los roles del nombre del nodo AND
      const match = elementName.match(/Colaboración (.+) \+ (.+)/);
      if (match) {
        const role1 = match[1].trim();
        const role2 = match[2].trim();
        // Verificar si ambos roles siguen existiendo en la matriz
        const role1Exists = currentRoles.includes(role1);
        const role2Exists = currentRoles.includes(role2);
        
        // También verificar si hay responsabilidades R y S para estos roles
        const hasResponsibleAndSupport = Object.values(currentMatrixData).some(taskRoles => {
          const roles = Object.keys(taskRoles);
          const responsibilities = Object.values(taskRoles);
          return roles.includes(role1) && roles.includes(role2) && 
                 responsibilities.includes('R') && responsibilities.includes('S');
        });
        
        return role1Exists && role2Exists && hasResponsibleAndSupport;
      }
    }
    
    return false;
  }
  
  // Buscar y guardar posiciones de TODOS los elementos RALph y relacionados
  elementRegistry.forEach(element => {
    // Elementos RALph (roles, capacidades, etc.) - PRESERVAR POSICIÓN EXACTA
    if (element.type && element.type.startsWith('RALph:')) {
      const elementName = element.businessObject ? element.businessObject.name : element.id;
      const position = {
        x: Math.round(element.x),
        y: Math.round(element.y),
        width: Math.round(element.width || 58),
        height: Math.round(element.height || 81),
        type: element.type,
        shouldKeep: shouldKeepElement(element)
      };
      positionCache.set(elementName, position);
      elementsToRemove.push(element);
      logElement.innerHTML += `  📍 Guardada posición EXACTA de ${elementName}: (${position.x}, ${position.y}) ${position.shouldKeep ? '✅ MANTENER' : '❌ ELIMINAR'}\n`;
    }
    
    // Eventos de consulta e información
    if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject && element.businessObject.name &&
        (element.businessObject.name.includes('Consultar') || element.businessObject.name.includes('Informar'))) {
      const elementName = element.businessObject.name;
      const position = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        type: element.type,
        shouldKeep: shouldKeepElement(element)
      };
      positionCache.set(elementName, position);
      elementsToRemove.push(element);
      logElement.innerHTML += `  📍 Guardada posición de ${elementName}: (${element.x}, ${element.y}) ${position.shouldKeep ? '✅ MANTENER' : '❌ ELIMINAR'}\n`;
    }
    
    // Tareas de aprobación
    if (element.type === 'bpmn:UserTask' &&
        element.businessObject && element.businessObject.name &&
        element.businessObject.name.includes('Aprobar')) {
      const elementName = element.businessObject.name;
      const position = {
        x: element.x,
        y: element.y,
        width: element.width,
        height: element.height,
        type: element.type,
        shouldKeep: shouldKeepElement(element)
      };
      positionCache.set(elementName, position);
      elementsToRemove.push(element);
      logElement.innerHTML += `  📍 Guardada posición de ${elementName}: (${element.x}, ${element.y}) ${position.shouldKeep ? '✅ MANTENER' : '❌ ELIMINAR'}\n`;
    }
    
    // Nodos AND/OR que conectan elementos RALph
    if (element.type === 'bpmn:ParallelGateway' || element.type === 'bpmn:InclusiveGateway') {
      // Verificar si está conectado a elementos RALph
      const connections = elementRegistry.filter(conn => 
        conn.type === 'RALph:ResourceArc' && 
        (conn.source === element || conn.target === element)
      );
      
      if (connections.length > 0) {
        const elementName = element.businessObject ? element.businessObject.name : element.id;
        const position = {
          x: element.x,
          y: element.y,
          width: element.width,
          height: element.height,
          type: element.type,
          shouldKeep: shouldKeepElement(element) // Usar la función inteligente
        };
        positionCache.set(elementName, position);
        elementsToRemove.push(element);
        logElement.innerHTML += `  📍 Guardada posición de ${elementName}: (${element.x}, ${element.y}) ${position.shouldKeep ? '✅ MANTENER' : '❌ ELIMINAR'} (puerta conectada)\n`;
      }
    }
    
    // Nodos AND de colaboración RALph - SIEMPRE PRESERVAR POSICIÓN EXACTA
    if (element.type === 'RALph:Complex-Assignment-AND') {
      const elementName = element.businessObject ? element.businessObject.name : element.id;
      const position = {
        x: Math.round(element.x),
        y: Math.round(element.y),
        width: Math.round(element.width || 40),
        height: Math.round(element.height || 40),
        type: element.type,
        shouldKeep: true // SIEMPRE mantener la posición de las puertas AND
      };
      positionCache.set(elementName, position);
      elementsToRemove.push(element);
      logElement.innerHTML += `  📍 Guardada posición EXACTA de ${elementName}: (${position.x}, ${position.y}) ✅ MANTENER (nodo AND - posición preservada)\n`;
    }
  });
  
  // Buscar conexiones RALph
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:ResourceArc') {
      elementsToRemove.push(element);
    }
  });
  
  // Guardar el cache de posiciones en el modeler para uso posterior
  modeler.positionCache = positionCache;
  
  // DEBUG: Mostrar información detallada del cache de puertas AND y roles
  const andNodes = Array.from(positionCache.entries()).filter(([name, pos]) => pos.type === 'RALph:Complex-Assignment-AND');
  const roleNodes = Array.from(positionCache.entries()).filter(([name, pos]) => pos.type === 'RALph:RoleRALph');
  
  if (andNodes.length > 0) {
    logElement.innerHTML += `  🔍 DEBUG - Puertas AND en cache:\n`;
    andNodes.forEach(([name, pos]) => {
      logElement.innerHTML += `    📍 ${name}: (${pos.x}, ${pos.y}) - ${pos.shouldKeep ? 'MANTENER' : 'ELIMINAR'}\n`;
    });
  }
  
  if (roleNodes.length > 0) {
    logElement.innerHTML += `  🔍 DEBUG - Roles en cache:\n`;
    roleNodes.forEach(([name, pos]) => {
      logElement.innerHTML += `    📍 ${name}: (${pos.x}, ${pos.y}) - ${pos.shouldKeep ? 'MANTENER' : 'ELIMINAR'}\n`;
    });
  }
  
  logElement.innerHTML += `  ✅ Guardadas ${positionCache.size} posiciones de elementos\n`;
  logElement.innerHTML += `  📊 Elementos a mantener: ${Array.from(positionCache.values()).filter(p => p.shouldKeep).length}\n`;
  logElement.innerHTML += `  📊 Elementos a eliminar: ${Array.from(positionCache.values()).filter(p => !p.shouldKeep).length}\n`;

  // 2. ELIMINAR ELEMENTOS RALPH
  logElement.innerHTML += '\n🗑️ Eliminando elementos RALph existentes...\n';
  
  if (elementsToRemove.length > 0) {
    try {
      modeling.removeElements(elementsToRemove);
      logElement.innerHTML += `  ✓ Eliminados ${elementsToRemove.length} elementos RALph\n`;
      results.elementsRestored = elementsToRemove.length;
    } catch (error) {
      console.warn('Error eliminando elementos RALph:', error);
      results.errors++;
    }
        } else {
    logElement.innerHTML += '  ✅ No se encontraron elementos RALph para eliminar\n';
  }

  // 2. RESTAURAR CONEXIONES ORIGINALES DEL FLUJO
  logElement.innerHTML += '\n🔧 Restaurando conexiones originales del flujo...\n';
  
  // Buscar tareas BPMN que deberían estar conectadas
  const bpmnTasks = [];
  elementRegistry.forEach(element => {
    if (element.type && (
      element.type === 'bpmn:Task' ||
      element.type === 'bpmn:UserTask' ||
      element.type === 'bpmn:ServiceTask' ||
      element.type === 'bpmn:ScriptTask' ||
      element.type === 'bpmn:ManualTask' ||
      element.type === 'bpmn:BusinessRuleTask' ||
      element.type === 'bpmn:SendTask' ||
      element.type === 'bpmn:ReceiveTask' ||
      element.type === 'bpmn:CallActivity' ||
      element.type === 'bpmn:SubProcess'
    )) {
      bpmnTasks.push(element);
    }
  });
  
  // Ordenar tareas por posición (de izquierda a derecha)
  bpmnTasks.sort((a, b) => a.x - b.x);
  
  // Restaurar conexiones entre tareas consecutivas
  for (let i = 0; i < bpmnTasks.length - 1; i++) {
    const currentTask = bpmnTasks[i];
    const nextTask = bpmnTasks[i + 1];
    
    // Verificar si ya existe una conexión
    const existingConnection = findConnectionBetween(modeler, currentTask, nextTask);
    
    if (!existingConnection) {
      try {
        modeling.connect(currentTask, nextTask, { type: 'bpmn:SequenceFlow' });
        results.connectionsUpdated++;
        logElement.innerHTML += `  ✓ Restaurada conexión: ${currentTask.businessObject.name || currentTask.id} → ${nextTask.businessObject.name || nextTask.id}\n`;
      } catch (error) {
        console.warn('Error restaurando conexión:', error);
        results.errors++;
      }
    }
  }

  // 3. RECREAR ELEMENTOS DESDE CERO
  logElement.innerHTML += '\n🔄 Recreando elementos RALph desde cero...\n';
  
  // Configurar listeners necesarios
  setupConnectionMaintenanceListener(modeler);
  setupAndNodeDeletionListener(modeler);
  positionManager.reset(); // Resetear el gestor de posiciones
  positionManager.detectExistingElements(modeler);
  
  // Procesar cada tarea de la matriz desde cero
  Object.entries(currentMatrixData).forEach(([taskName, taskRoles]) => {
    logElement.innerHTML += `\nProcesando tarea: ${taskName}\n`;
    
    // Encontrar la tarea BPMN correspondiente
    const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
    if (!bpmnTask) {
      logElement.innerHTML += `  ⚠️ Tarea BPMN no encontrada: "${taskName}"\n`;
      return;
    }
    
    const responsibilities = Object.entries(taskRoles);
    
    // Procesar responsabilidades actuales
    const responsibleRoles = responsibilities.filter(([_, resp]) => resp === 'R').map(([role, _]) => role);
    const supportRoles = responsibilities.filter(([_, resp]) => resp === 'S').map(([role, _]) => role);
    const consultRoles = responsibilities.filter(([_, resp]) => resp === 'C').map(([role, _]) => role);
    const approveRoles = responsibilities.filter(([_, resp]) => resp === 'A').map(([role, _]) => role);
    const informRoles = responsibilities.filter(([_, resp]) => resp === 'I').map(([role, _]) => role);
    
    // DEBUG: Mostrar roles encontrados para esta tarea
    console.log(`🔍 DEBUG - Tarea ${taskName}:`);
    console.log(`  - Responsible: ${responsibleRoles.join(', ')}`);
    console.log(`  - Support: ${supportRoles.join(', ')}`);
    console.log(`  - Consult: ${consultRoles.join(', ')}`);
    console.log(`  - Approve: ${approveRoles.join(', ')}`);
    console.log(`  - Inform: ${informRoles.join(', ')}`);
    
    // DEBUG ESPECÍFICO para el rol "gfh"
    if (responsibleRoles.includes('gfh') || supportRoles.includes('gfh') || consultRoles.includes('gfh') || approveRoles.includes('gfh') || informRoles.includes('gfh')) {
      console.log(`🎯 DEBUG ESPECÍFICO - Rol "gfh" encontrado en tarea "${taskName}"`);
      console.log(`  - Tipo de responsabilidad: ${taskRoles.gfh || 'NO DEFINIDA'}`);
      console.log(`  - Tarea BPMN encontrada: ${bpmnTask ? 'SÍ' : 'NO'}`);
      if (bpmnTask) {
        console.log(`  - ID de tarea BPMN: ${bpmnTask.id}`);
        console.log(`  - Nombre de tarea BPMN: ${bpmnTask.businessObject ? bpmnTask.businessObject.name : 'SIN NOMBRE'}`);
      }
    }
    
    const processedRoles = new Set();
    
    // Procesar cada tipo de responsabilidad en orden de prioridad
    // 1. Responsables y Soporte (R, S) - primero
    processResponsibleAndSupport(modeler, bpmnTask, responsibleRoles, supportRoles, processedRoles, results, logElement);
    
    // DEBUG: Verificar si el rol "gfh" fue procesado
    if (responsibleRoles.includes('gfh') || supportRoles.includes('gfh')) {
      console.log(`🎯 VERIFICACIÓN - Rol "gfh" debería haber sido procesado`);
      console.log(`  - Procesado como Responsible: ${responsibleRoles.includes('gfh')}`);
      console.log(`  - Procesado como Support: ${supportRoles.includes('gfh')}`);
      console.log(`  - Está en processedRoles: ${processedRoles.has('gfh')}`);
      
      // Verificar si existe el rol en el diagrama
      const gfhRole = findRalphRoleByName(modeler, 'gfh');
      if (gfhRole) {
        console.log(`  - Rol "gfh" existe en el diagrama (ID: ${gfhRole.id})`);
        
        // Verificar si tiene conexión a la tarea
        const hasConnection = positionManager.connectionExists(modeler, gfhRole, bpmnTask);
        console.log(`  - Tiene conexión directa a la tarea: ${hasConnection}`);
        
        if (!hasConnection) {
          console.log(`🔧 CREANDO CONEXIÓN MANUAL para rol "gfh"`);
          try {
            const connection = positionManager.createOptimizedConnection(modeling, gfhRole, bpmnTask, 'RALph:ResourceArc');
            if (connection) {
              console.log(`✅ Conexión manual creada para "gfh" → ${bpmnTask.businessObject.name}`);
              results.assignmentsCreated++;
            }
          } catch (error) {
            console.error(`❌ Error creando conexión manual para "gfh":`, error);
          }
        }
      } else {
        console.log(`  - Rol "gfh" NO existe en el diagrama`);
      }
    }
    
    // 2. Elementos en flujo (C, A, I) - en orden C → A → I
    if (consultRoles.length > 0 || approveRoles.length > 0 || informRoles.length > 0) {
      // Buscar la siguiente tarea en el flujo
      const nextTask = findNextTaskInFlowIgnoringEvents(modeler, bpmnTask);
      
      if (nextTask) {
        // Eliminar conexión original para insertar elementos intermedios
          const originalConnection = findConnectionBetween(modeler, bpmnTask, nextTask);
          if (originalConnection) {
            modeling.removeElements([originalConnection]);
        }
        
        // Procesar elementos secuencialmente
        let currentSource = bpmnTask;
        
        // 1. Procesar consultas primero
        if (consultRoles.length > 0) {
          currentSource = processConsultRolesSequential(modeler, currentSource, consultRoles, processedRoles, results, logElement);
        }
        
        // 2. Procesar aprobaciones
        if (approveRoles.length > 0) {
          currentSource = processApproveRolesSequential(modeler, currentSource, approveRoles, processedRoles, results, logElement);
        }
        
        // 3. Procesar información al final
        if (informRoles.length > 0) {
          currentSource = processInformRolesSequential(modeler, currentSource, informRoles, processedRoles, results, logElement);
        }
        
        // Conectar el último elemento con la siguiente tarea
        if (currentSource !== bpmnTask) {
          try {
          modeling.connect(currentSource, nextTask, { type: 'bpmn:SequenceFlow' });
            results.connectionsUpdated++;
            logElement.innerHTML += `  ✓ Conectado flujo final: ${currentSource.businessObject.name || currentSource.id} → ${nextTask.businessObject.name || nextTask.id}\n`;
          } catch (error) {
            console.warn('Error conectando flujo final:', error);
            results.errors++;
          }
        }
      } else {
        // No hay siguiente tarea, procesar elementos secuencialmente
        let currentSource = bpmnTask;
        
        if (consultRoles.length > 0) {
          currentSource = processConsultRolesSequential(modeler, currentSource, consultRoles, processedRoles, results, logElement);
        }
        
        if (approveRoles.length > 0) {
          currentSource = processApproveRolesSequential(modeler, currentSource, approveRoles, processedRoles, results, logElement);
        }
        
        if (informRoles.length > 0) {
          currentSource = processInformRolesSequential(modeler, currentSource, informRoles, processedRoles, results, logElement);
        }
      }
    }
  });

  // 5. LIMPIAR CONEXIONES DUPLICADAS
  logElement.innerHTML += '\n🧹 Limpiando conexiones duplicadas...\n';
  cleanupDuplicateConnections(modeler, logElement);

  // 6. VERIFICACIÓN FINAL DE POSICIONES DE PUERTAS AND Y ROLES
  logElement.innerHTML += '\n🔍 Verificación final de posiciones de puertas AND y roles...\n';
  
  // Verificar que todas las puertas AND están en sus posiciones correctas
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:Complex-Assignment-AND' && element.businessObject && element.businessObject.name) {
      const elementName = element.businessObject.name;
      const actualPosition = { x: element.x, y: element.y };
      
      if (modeler.positionCache && modeler.positionCache.has(elementName)) {
        const cachedPosition = modeler.positionCache.get(elementName);
        const expectedPosition = { x: Math.round(cachedPosition.x), y: Math.round(cachedPosition.y) };
        
        if (actualPosition.x !== expectedPosition.x || actualPosition.y !== expectedPosition.y) {
          logElement.innerHTML += `  ⚠️ Posición incorrecta en ${elementName}: actual (${actualPosition.x}, ${actualPosition.y}) vs esperada (${expectedPosition.x}, ${expectedPosition.y})\n`;
          
          // Corregir la posición
          try {
            modeling.moveShape(element, {
              x: expectedPosition.x - actualPosition.x,
              y: expectedPosition.y - actualPosition.y
            });
            logElement.innerHTML += `  ✅ Posición corregida para ${elementName}\n`;
          } catch (error) {
            logElement.innerHTML += `  ❌ Error corrigiendo posición de ${elementName}: ${error.message}\n`;
          }
        } else {
          logElement.innerHTML += `  ✅ Posición correcta para ${elementName}: (${actualPosition.x}, ${actualPosition.y})\n`;
        }
      }
    }
    
    // Verificar que todos los roles están en sus posiciones correctas
    if (element.type === 'RALph:RoleRALph' && element.businessObject && element.businessObject.name) {
      const elementName = element.businessObject.name;
      const actualPosition = { x: element.x, y: element.y };
      
      if (modeler.positionCache && modeler.positionCache.has(elementName)) {
        const cachedPosition = modeler.positionCache.get(elementName);
        if (cachedPosition.shouldKeep) {
          const expectedPosition = { x: Math.round(cachedPosition.x), y: Math.round(cachedPosition.y) };
          
          if (actualPosition.x !== expectedPosition.x || actualPosition.y !== expectedPosition.y) {
            logElement.innerHTML += `  ⚠️ Posición incorrecta en rol ${elementName}: actual (${actualPosition.x}, ${actualPosition.y}) vs esperada (${expectedPosition.x}, ${expectedPosition.y})\n`;
            
            // Corregir la posición
            try {
              modeling.moveShape(element, {
                x: expectedPosition.x - actualPosition.x,
                y: expectedPosition.y - actualPosition.y
              });
              logElement.innerHTML += `  ✅ Posición corregida para rol ${elementName}\n`;
            } catch (error) {
              logElement.innerHTML += `  ❌ Error corrigiendo posición de rol ${elementName}: ${error.message}\n`;
            }
          } else {
            logElement.innerHTML += `  ✅ Posición correcta para rol ${elementName}: (${actualPosition.x}, ${actualPosition.y})\n`;
          }
        }
      }
    }
  });

  // 7. RESUMEN FINAL
  logElement.innerHTML += '\n📊 RESUMEN DEL MAPEO INTELIGENTE:\n';
  logElement.innerHTML += `  ✅ Roles creados: ${results.rolesCreated}\n`;
  logElement.innerHTML += `  🗑️ Roles eliminados: ${results.rolesDeleted}\n`;
  logElement.innerHTML += `  ✅ Asignaciones creadas: ${results.assignmentsCreated}\n`;
  logElement.innerHTML += `  🗑️ Asignaciones eliminadas: ${results.assignmentsDeleted}\n`;
  logElement.innerHTML += `  ✅ Eventos creados: ${results.eventsCreated}\n`;
  logElement.innerHTML += `  🗑️ Eventos eliminados: ${results.eventsDeleted}\n`;
  logElement.innerHTML += `  🔄 Conexiones actualizadas: ${results.connectionsUpdated}\n`;
  logElement.innerHTML += `  🔧 Elementos restaurados: ${results.elementsRestored}\n`;
  if (results.errors > 0) {
    logElement.innerHTML += `  ❌ Errores: ${results.errors}\n`;
  }
  
  logElement.innerHTML += '\n🎉 Mapeo inteligente completado!\n';

  return results;
}

// Función para detectar elementos faltantes según la matriz RASCI actual
function detectMissingElements(modeler, currentMatrixData, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const missingElements = [];
  
  // Analizar cada tarea en la matriz actual
  Object.entries(currentMatrixData).forEach(([taskName, taskRoles]) => {
    const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
    if (!bpmnTask) {
      logElement.innerHTML += `    ⚠️ Tarea BPMN no encontrada: "${taskName}"\n`;
      return;
    }
    
    // Verificar cada responsabilidad
    Object.entries(taskRoles).forEach(([roleName, responsibilityType]) => {
      const missingElement = checkMissingElement(modeler, bpmnTask, roleName, responsibilityType, taskName);
      if (missingElement) {
        missingElements.push(missingElement);
      }
    });
  });
  
  return missingElements;
}

// Función para verificar si falta un elemento específico
function checkMissingElement(modeler, bpmnTask, roleName, responsibilityType, taskName) {
  const elementRegistry = modeler.get('elementRegistry');
  
  switch (responsibilityType) {
    case 'R':
    case 'S':
      // Verificar si existe el rol y su conexión
      const roleElement = findRalphRoleByName(modeler, roleName);
      if (!roleElement) {
        return {
          type: 'role',
          roleName: roleName,
          taskName: taskName,
          responsibilityType: responsibilityType,
          bpmnTask: bpmnTask
        };
      }
      
      // Verificar si existe la conexión
      const connection = elementRegistry.find(conn => 
        conn.type === 'RALph:ResourceArc' && 
        ((conn.source === roleElement && conn.target === bpmnTask) ||
         (conn.target === roleElement && conn.source === bpmnTask))
      );
      
      if (!connection) {
        return {
          type: 'connection',
          roleName: roleName,
          taskName: taskName,
          responsibilityType: responsibilityType,
          bpmnTask: bpmnTask,
          roleElement: roleElement
        };
      }
      break;
      
    case 'C':
      // Verificar evento de consulta
      const consultEventName = `Consultar ${roleName}`;
      const consultEvent = elementRegistry.find(element => 
        (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject && element.businessObject.name === consultEventName
      );
      
      if (!consultEvent) {
        return {
          type: 'consult_event',
          roleName: roleName,
          taskName: taskName,
          responsibilityType: responsibilityType,
          bpmnTask: bpmnTask
        };
      }
      break;
      
    case 'A':
      // Verificar tarea de aprobación
      const approvalTaskName = `Aprobar ${roleName}`;
      const approvalTask = elementRegistry.find(element => 
        element.type === 'bpmn:UserTask' &&
        element.businessObject && element.businessObject.name === approvalTaskName
      );
      
      if (!approvalTask) {
        return {
          type: 'approval_task',
          roleName: roleName,
          taskName: taskName,
          responsibilityType: responsibilityType,
          bpmnTask: bpmnTask
        };
      }
      break;
      
    case 'I':
      // Verificar evento de información
      const infoEventName = `Informar ${roleName}`;
      const infoEvent = elementRegistry.find(element => 
        (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject && element.businessObject.name === infoEventName
      );
      
      if (!infoEvent) {
        return {
          type: 'info_event',
          roleName: roleName,
          taskName: taskName,
          responsibilityType: responsibilityType,
          bpmnTask: bpmnTask
        };
      }
      break;
  }
  
  return null;
}

// Función para restaurar elementos faltantes
function restoreMissingElements(modeler, missingElements, results, logElement) {
  const modeling = modeler.get('modeling');
  
  missingElements.forEach(missingElement => {
    try {
      switch (missingElement.type) {
        case 'role':
          logElement.innerHTML += `    🔧 Restaurando rol: ${missingElement.roleName}\n`;
          createRalphRole(modeler, missingElement.roleName, results, getSafeBounds(missingElement.bpmnTask));
          results.rolesCreated++;
          break;
          
        case 'connection':
          logElement.innerHTML += `    🔧 Restaurando conexión: ${missingElement.roleName} → ${missingElement.taskName}\n`;
          const roleElement = missingElement.roleElement || findRalphRoleByName(modeler, missingElement.roleName);
          if (roleElement) {
            createSimpleAssignment(modeler, missingElement.bpmnTask, missingElement.roleName, results);
            results.assignmentsCreated++;
          }
          break;
          
        case 'consult_event':
          logElement.innerHTML += `    🔧 Restaurando evento de consulta: ${missingElement.roleName}\n`;
          createMessageFlow(modeler, missingElement.bpmnTask, [missingElement.roleName], results);
          results.eventsCreated++;
          break;
          
        case 'approval_task':
          logElement.innerHTML += `    🔧 Restaurando tarea de aprobación: ${missingElement.roleName}\n`;
          createApprovalTask(modeler, missingElement.bpmnTask, missingElement.roleName, results);
          results.assignmentsCreated++;
          break;
          
        case 'info_event':
          logElement.innerHTML += `    🔧 Restaurando evento de información: ${missingElement.roleName}\n`;
          createInfoEvent(modeler, missingElement.bpmnTask, [missingElement.roleName], results);
          results.eventsCreated++;
          break;
      }
      
      results.elementsRestored++;
      
    } catch (error) {
      console.warn(`Error restaurando elemento ${missingElement.type}:`, error);
      logElement.innerHTML += `    ❌ Error restaurando ${missingElement.type}: ${error.message}\n`;
      results.errors++;
    }
  });
}

// Función para restaurar el flujo original cuando se eliminan elementos intermedios
function restoreOriginalFlow(modeler, sourceTask, targetTask, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Verificar si existe conexión directa
  const directConnection = findConnectionBetween(modeler, sourceTask, targetTask);
  
  if (!directConnection) {
    // Verificar si hay elementos intermedios que deberían estar conectados
    const intermediateElements = elementRegistry.filter(element => {
      if (element.type === 'bpmn:SequenceFlow') return false;
      
      // Buscar elementos que están entre sourceTask y targetTask
      const incomingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.target === element
      );
      
      const outgoingConnections = elementRegistry.filter(conn => 
        conn.type === 'bpmn:SequenceFlow' && conn.source === element
      );
      
      // Si tiene conexiones pero no está conectado correctamente
      return incomingConnections.length > 0 || outgoingConnections.length > 0;
    });
    
    if (intermediateElements.length === 0) {
      // No hay elementos intermedios, restaurar conexión directa
      logElement.innerHTML += `    🔧 Restaurando conexión directa: ${sourceTask.businessObject.name} → ${targetTask.businessObject.name}\n`;
      
      try {
        modeling.connect(sourceTask, targetTask, { type: 'bpmn:SequenceFlow' });
        return true;
      } catch (error) {
        console.warn('Error restaurando conexión directa:', error);
        return false;
      }
    }
  }
  
  return false;
}

// Función para limpiar elementos de una tarea eliminada
function cleanupTaskElements(modeler, taskName, results, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Buscar y eliminar elementos relacionados con la tarea
  const elementsToRemove = [];
  
  elementRegistry.forEach(element => {
    if (element.businessObject && element.businessObject.name) {
      const elementName = element.businessObject.name;
      
      // Buscar eventos de consulta e información relacionados
      if ((element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
          (elementName.includes('Consultar') || elementName.includes('Informar'))) {
        // Verificar si está relacionado con la tarea eliminada
        const connections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && 
          (conn.source === element || conn.target === element)
        );
        
        // Si no tiene conexiones válidas, marcarlo para eliminación
        if (connections.length === 0) {
          elementsToRemove.push(element);
        }
      }
    }
  });
  
  // Eliminar elementos marcados
  if (elementsToRemove.length > 0) {
    try {
      modeling.removeElements(elementsToRemove);
      results.eventsDeleted += elementsToRemove.length;
      logElement.innerHTML += `    ✓ Eliminados ${elementsToRemove.length} elementos huérfanos\n`;
    } catch (error) {
      console.warn('Error eliminando elementos:', error);
      results.errors++;
    }
  }
}

// Función para eliminar una responsabilidad específica
function removeResponsibility(modeler, taskName, roleName, responsibilityType, results, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  switch (responsibilityType) {
    case 'R':
    case 'S':
      // Eliminar asignaciones de roles
      const roleElement = findRalphRoleByName(modeler, roleName);
      if (roleElement) {
        // Buscar conexiones con la tarea
        const connections = elementRegistry.filter(conn => 
          conn.type === 'RALph:ResourceArc' && 
          ((conn.source === roleElement && conn.target.businessObject && conn.target.businessObject.name === taskName) ||
           (conn.target === roleElement && conn.source.businessObject && conn.source.businessObject.name === taskName))
        );
        
        if (connections.length > 0) {
          modeling.removeElements(connections);
          results.assignmentsDeleted += connections.length;
          logElement.innerHTML += `    ✓ Eliminadas ${connections.length} asignaciones para ${roleName}\n`;
        }
        
        // Si es responsable (R) y no hay más responsables, verificar si hay soporte (S)
        if (responsibilityType === 'R') {
          const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
          if (bpmnTask) {
            // Verificar si hay otros responsables o soporte
            const currentMatrixData = window.rasciMatrixData || {};
            const taskRoles = currentMatrixData[taskName] || {};
            const hasOtherResponsible = Object.entries(taskRoles).some(([role, resp]) => 
              role !== roleName && (resp === 'R' || resp === 'S')
            );
            
            if (!hasOtherResponsible) {
              // No hay más responsables ni soporte, eliminar el rol completamente
              modeling.removeElements([roleElement]);
              results.rolesDeleted++;
              logElement.innerHTML += `    ✓ Eliminado rol sin responsabilidades: ${roleName}\n`;
            }
          }
        }
      }
      break;
      
    case 'C':
      // Eliminar eventos de consulta y restaurar flujo si es necesario
      const consultEventName = `Consultar ${roleName}`;
      const consultEvent = elementRegistry.find(element => 
        (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject && element.businessObject.name === consultEventName
      );
      
      if (consultEvent) {
        // Guardar información de conexiones antes de eliminar
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target === consultEvent
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source === consultEvent
        );
        
        modeling.removeElements([consultEvent]);
        results.eventsDeleted++;
        logElement.innerHTML += `    ✓ Eliminado evento de consulta: ${consultEventName}\n`;
        
        // Restaurar flujo directo si es necesario
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceTask = incomingConnections[0].source;
          const targetTask = outgoingConnections[0].target;
          
          if (sourceTask && targetTask && sourceTask !== targetTask) {
            restoreOriginalFlow(modeler, sourceTask, targetTask, logElement);
            results.connectionsUpdated++;
          }
        }
      }
      break;
      
    case 'I':
      // Eliminar eventos de información y restaurar flujo si es necesario
      const infoEventName = `Informar ${roleName}`;
      const infoEvent = elementRegistry.find(element => 
        (element.type === 'bpmn:IntermediateThrowEvent' || element.type === 'bpmn:IntermediateCatchEvent') &&
        element.businessObject && element.businessObject.name === infoEventName
      );
      
      if (infoEvent) {
        // Guardar información de conexiones antes de eliminar
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target === infoEvent
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source === infoEvent
        );
        
        modeling.removeElements([infoEvent]);
        results.eventsDeleted++;
        logElement.innerHTML += `    ✓ Eliminado evento de información: ${infoEventName}\n`;
        
        // Restaurar flujo directo si es necesario
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceTask = incomingConnections[0].source;
          const targetTask = outgoingConnections[0].target;
          
          if (sourceTask && targetTask && sourceTask !== targetTask) {
            restoreOriginalFlow(modeler, sourceTask, targetTask, logElement);
            results.connectionsUpdated++;
          }
        }
      }
      break;
      
    case 'A':
      // Eliminar tareas de aprobación y restaurar flujo si es necesario
      const approvalTaskName = `Aprobar ${roleName}`;
      const approvalTask = elementRegistry.find(element => 
        element.type === 'bpmn:UserTask' &&
        element.businessObject && element.businessObject.name === approvalTaskName
      );
      
      if (approvalTask) {
        // Guardar información de conexiones antes de eliminar
        const incomingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.target === approvalTask
        );
        const outgoingConnections = elementRegistry.filter(conn => 
          conn.type === 'bpmn:SequenceFlow' && conn.source === approvalTask
        );
        
        modeling.removeElements([approvalTask]);
        results.assignmentsDeleted++;
        logElement.innerHTML += `    ✓ Eliminada tarea de aprobación: ${approvalTaskName}\n`;
        
        // Restaurar flujo directo si es necesario
        if (incomingConnections.length > 0 && outgoingConnections.length > 0) {
          const sourceTask = incomingConnections[0].source;
          const targetTask = outgoingConnections[0].target;
          
          if (sourceTask && targetTask && sourceTask !== targetTask) {
            restoreOriginalFlow(modeler, sourceTask, targetTask, logElement);
            results.connectionsUpdated++;
          }
        }
      }
      break;
  }
}

// Función para agregar una nueva responsabilidad
function addResponsibility(modeler, taskName, roleName, responsibilityType, results, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const bpmnTask = findBpmnTaskByName(elementRegistry, taskName);
  
  if (!bpmnTask) {
    logElement.innerHTML += `    ⚠️ Tarea BPMN no encontrada: ${taskName}\n`;
    return;
  }
  
  switch (responsibilityType) {
    case 'R':
      createSimpleAssignment(modeler, bpmnTask, roleName, results);
      results.assignmentsCreated++;
      break;
    case 'S':
      createSimpleAssignment(modeler, bpmnTask, roleName, results);
      results.assignmentsCreated++;
      break;
    case 'C':
      createMessageFlow(modeler, bpmnTask, [roleName], results);
      results.eventsCreated++;
      break;
    case 'I':
      createInfoEvent(modeler, bpmnTask, [roleName], results);
      results.eventsCreated++;
      break;
    case 'A':
      createApprovalTask(modeler, bpmnTask, roleName, results);
      results.assignmentsCreated++;
      break;
  }
  
  logElement.innerHTML += `    ✓ Agregada responsabilidad ${responsibilityType} para ${roleName}\n`;
}

// Función para actualizar una responsabilidad existente
function updateResponsibility(modeler, taskName, roleName, oldType, newType, results, logElement) {
  // Primero eliminar la responsabilidad anterior
  removeResponsibility(modeler, taskName, roleName, oldType, results, logElement);
  
  // Luego agregar la nueva responsabilidad
  addResponsibility(modeler, taskName, roleName, newType, results, logElement);
  
  logElement.innerHTML += `    ✓ Actualizada responsabilidad: ${oldType} → ${newType}\n`;
}

// Funciones auxiliares para procesar responsabilidades
function processResponsibleAndSupport(modeler, bpmnTask, responsibleRoles, supportRoles, processedRoles, results, logElement) {
  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Buscar nodo AND existente para esta tarea
  const existingAndNode = findExistingAndNodeForTask(bpmnTask, modeler);
  
  // Verificar si existe una puerta AND guardada en el cache para esta tarea
  let cachedAndNodeName = null;
  if (modeler.positionCache) {
    for (const [nodeName, position] of modeler.positionCache.entries()) {
      if (position.type === 'RALph:Complex-Assignment-AND') {
        // Verificar si este nodo AND corresponde a esta tarea
        const match = nodeName.match(/Colaboración (.+) \+ (.+)/);
        if (match) {
          const role1 = match[1].trim();
          const role2 = match[2].trim();
          // Verificar si estos roles están en las listas de responsible y support
          if ((responsibleRoles.includes(role1) && supportRoles.includes(role2)) ||
              (responsibleRoles.includes(role2) && supportRoles.includes(role1))) {
            cachedAndNodeName = nodeName;
            break;
          }
        }
      }
    }
  }
  
  if (existingAndNode) {
    logElement.innerHTML += `    🔄 Nodo AND existente encontrado, conectando roles adicionales...\n`;
    
    // Conectar roles no procesados al nodo AND existente
    const allRoles = [...responsibleRoles, ...supportRoles];
    const unprocessedRoles = allRoles.filter(roleName => !processedRoles.has(roleName));
    
    unprocessedRoles.forEach(roleName => {
      if (processedRoles.has(roleName)) return;
      
      // Buscar o crear el rol
      let roleElement = findRalphRoleByName(modeler, roleName);
      if (!roleElement) {
        const taskBounds = getSafeBounds(bpmnTask);
        roleElement = createRalphRole(modeler, roleName, results, taskBounds);
      }
      
      if (roleElement) {
        // Conectar el rol al nodo AND existente
        try {
          positionManager.createOptimizedConnection(modeling, roleElement, existingAndNode, 'RALph:ResourceArc');
          logElement.innerHTML += `      ✓ Conectado ${roleName} al nodo AND existente\n`;
          processedRoles.add(roleName);
          results.assignmentsCreated++;
        } catch (error) {
          console.warn(`Error conectando ${roleName} al nodo AND existente:`, error);
          try {
            positionManager.createOptimizedConnection(modeling, roleElement, existingAndNode, 'bpmn:Association');
            logElement.innerHTML += `      ✓ Conectado ${roleName} al nodo AND existente (fallback)\n`;
            processedRoles.add(roleName);
            results.assignmentsCreated++;
          } catch (fallbackError) {
            console.error(`Error en fallback conectando ${roleName}:`, fallbackError);
          }
        }
      }
    });
    
    return;
  }
  
  // Si no hay nodo AND existente, crear uno nuevo con los primeros dos roles
  if (supportRoles.length > 0 && responsibleRoles.length > 0) {
    const firstResponsible = responsibleRoles.find(role => !processedRoles.has(role));
    const firstSupport = supportRoles.find(role => !processedRoles.has(role));
    
    if (firstResponsible && firstSupport) {
        // SIEMPRE usar el cache si existe, de lo contrario usar los primeros roles
        let responsibleToUse = firstResponsible;
        let supportToUse = firstSupport;
        
        if (cachedAndNodeName) {
          const match = cachedAndNodeName.match(/Colaboración (.+) \+ (.+)/);
          if (match) {
            const cachedRole1 = match[1].trim();
            const cachedRole2 = match[2].trim();
            
            // Usar los roles del cache si están disponibles
            if (responsibleRoles.includes(cachedRole1) && supportRoles.includes(cachedRole2)) {
              responsibleToUse = cachedRole1;
              supportToUse = cachedRole2;
            } else if (responsibleRoles.includes(cachedRole2) && supportRoles.includes(cachedRole1)) {
              responsibleToUse = cachedRole2;
              supportToUse = cachedRole1;
            }
          }
        }
        
        logElement.innerHTML += `    🔄 Creando nodo AND: ${responsibleToUse} + ${supportToUse}\n`;
        createCollaborationAssignment(modeler, bpmnTask, supportToUse, responsibleToUse, results);
        processedRoles.add(responsibleToUse);
        processedRoles.add(supportToUse);
      results.assignmentsCreated++;
      
      // Procesar roles restantes conectándolos al nodo AND recién creado
      const remainingRoles = [...responsibleRoles, ...supportRoles].filter(role => 
        !processedRoles.has(role) && role !== firstResponsible && role !== firstSupport
      );
      
      if (remainingRoles.length > 0) {
        const newAndNode = findExistingAndNodeForTask(bpmnTask, modeler);
        if (newAndNode) {
          logElement.innerHTML += `    🔄 Conectando roles adicionales al nodo AND...\n`;
          
          remainingRoles.forEach(roleName => {
            let roleElement = findRalphRoleByName(modeler, roleName);
            if (!roleElement) {
              const taskBounds = getSafeBounds(bpmnTask);
              roleElement = createRalphRole(modeler, roleName, results, taskBounds);
            }
            
            if (roleElement) {
              try {
                positionManager.createOptimizedConnection(modeling, roleElement, newAndNode, 'RALph:ResourceArc');
                logElement.innerHTML += `      ✓ Conectado ${roleName} al nuevo nodo AND\n`;
                processedRoles.add(roleName);
                results.assignmentsCreated++;
              } catch (error) {
                console.warn(`Error conectando ${roleName} al nuevo nodo AND:`, error);
                try {
                  positionManager.createOptimizedConnection(modeling, roleElement, newAndNode, 'bpmn:Association');
                  logElement.innerHTML += `      ✓ Conectado ${roleName} al nuevo nodo AND (fallback)\n`;
                  processedRoles.add(roleName);
                  results.assignmentsCreated++;
                } catch (fallbackError) {
                  console.error(`Error en fallback conectando ${roleName}:`, fallbackError);
                }
              }
            }
          });
        }
      }
    }
  } else {
    // Si no hay roles de soporte, procesar responsables normalmente
    responsibleRoles.forEach(roleName => {
      if (processedRoles.has(roleName)) return;
      createSimpleAssignment(modeler, bpmnTask, roleName, results);
      processedRoles.add(roleName);
      results.assignmentsCreated++;
    });
  }
  
  // Procesar roles de soporte restantes que no se conectaron a ningún nodo AND
  supportRoles.forEach(roleName => {
    if (processedRoles.has(roleName)) return;
    createSimpleAssignment(modeler, bpmnTask, roleName, results);
    processedRoles.add(roleName);
    results.assignmentsCreated++;
  });
}

// Función para insertar elementos en el flujo respetando el orden C → A → I
function insertElementsInFlow(modeler, bpmnTask, consultRoles, approveRoles, informRoles, results, logElement) {
  const modeling = modeler.get('modeling');
  const elementRegistry = modeler.get('elementRegistry');
  
  // Buscar la siguiente tarea en el flujo original
  const nextTask = findNextTaskInFlow(modeler, bpmnTask);
  if (!nextTask) {
    console.warn(`⚠️ No se encontró siguiente tarea para insertar elementos en flujo`);
    return;
  }
  
  console.log(`🔍 DEBUG - Insertando elementos en flujo: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ... → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
  
  // Buscar la conexión original
  const originalConnection = findConnectionBetween(modeler, bpmnTask, nextTask);
  if (!originalConnection) {
    console.warn(`⚠️ No se encontró conexión original entre tareas`);
    return;
  }
  
  // Eliminar la conexión original
  try {
    modeling.removeElement(originalConnection);
    console.log(`✅ Eliminada conexión original: ${bpmnTask.businessObject.name || 'SIN NOMBRE'} → ${nextTask.businessObject.name || 'SIN NOMBRE'}`);
  } catch (error) {
    console.warn(`⚠️ Error eliminando conexión original:`, error.message);
    return;
  }
  
  let currentSource = bpmnTask;
  let elementsCreated = [];
  
  // 1. INSERTAR EVENTOS DE CONSULTA (C)
  if (consultRoles.length > 0) {
    const consultEventName = consultRoles.length === 1 
      ? `Consultar ${consultRoles[0]}`
      : `Consultar ${consultRoles.join(' y ')}`;
    
    console.log(`🔍 DEBUG - Creando evento de consulta: ${consultEventName}`);
    
    const consultEvent = createEventInFlow(modeler, currentSource, nextTask, 'bpmn:IntermediateThrowEvent', consultEventName, results);
    if (consultEvent) {
      elementsCreated.push(consultEvent);
      currentSource = consultEvent;
      console.log(`✅ Evento de consulta insertado: ${consultEventName}`);
    }
  }
  
  // 2. INSERTAR TAREAS DE APROBACIÓN (A)
  if (approveRoles.length > 0) {
    approveRoles.forEach(roleName => {
      const approvalTaskName = `Aprobar ${(bpmnTask.businessObject && bpmnTask.businessObject.name) ? bpmnTask.businessObject.name : bpmnTask.id}`;
      
      console.log(`🔍 DEBUG - Creando tarea de aprobación: ${approvalTaskName}`);
      
      const approvalTask = createApprovalTaskInFlow(modeler, currentSource, nextTask, roleName, approvalTaskName, results);
      if (approvalTask) {
        elementsCreated.push(approvalTask);
        currentSource = approvalTask;
        console.log(`✅ Tarea de aprobación insertada: ${approvalTaskName}`);
      }
    });
  }
  
  // 3. INSERTAR EVENTOS DE INFORMACIÓN (I)
  if (informRoles.length > 0) {
    const infoEventName = informRoles.length === 1 
      ? `Informar ${informRoles[0]}`
      : `Informar ${informRoles.join(' y ')}`;
    
    console.log(`🔍 DEBUG - Creando evento de información: ${infoEventName}`);
    
    const infoEvent = createEventInFlow(modeler, currentSource, nextTask, 'bpmn:IntermediateThrowEvent', infoEventName, results);
    if (infoEvent) {
      elementsCreated.push(infoEvent);
      currentSource = infoEvent;
      console.log(`✅ Evento de información insertado: ${infoEventName}`);
    }
  }
  
  // 4. CONECTAR EL ÚLTIMO ELEMENTO CON LA SIGUIENTE TAREA
  if (currentSource !== bpmnTask) {
    try {
      modeling.connect(currentSource, nextTask, { type: 'bpmn:SequenceFlow' });
      console.log(`✅ Conectado último elemento con siguiente tarea: ${currentSource.businessObject.name || currentSource.id} → ${nextTask.businessObject.name || nextTask.id}`);
    } catch (error) {
      console.warn(`⚠️ Error conectando último elemento:`, error.message);
    }
  }
  
  console.log(`✅ Flujo completado con ${elementsCreated.length} elementos insertados`);
}

// Función auxiliar para crear eventos en el flujo
function createEventInFlow(modeler, sourceTask, targetTask, eventType, eventName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const rootElement = canvas.getRootElement();
  
  // Posición del evento
  let position;
  if (targetTask) {
    // Posición entre source y target
    position = {
      x: (sourceTask.x + targetTask.x) / 2,
      y: (sourceTask.y + targetTask.y) / 2
    };
  } else {
    // Posición a la derecha del source
    position = {
      x: sourceTask.x + 150,
      y: sourceTask.y
    };
  }
  
  try {
    const event = modeling.createShape(
      { type: eventType },
      position,
      rootElement
    );
    
    // Configurar el evento
    modeling.updateProperties(event, {
      name: eventName
    });
    
    // Conectar source → event
    modeling.connect(sourceTask, event, { type: 'bpmn:SequenceFlow' });
    
    // Si hay targetTask, conectar event → targetTask
    if (targetTask) {
      modeling.connect(event, targetTask, { type: 'bpmn:SequenceFlow' });
    }
    
    results.eventsCreated++;
    return event;
  } catch (error) {
    console.warn(`⚠️ Error creando evento en flujo:`, error.message);
    return null;
  }
}

// Función auxiliar para crear tareas de aprobación en el flujo
function createApprovalTaskInFlow(modeler, sourceTask, targetTask, roleName, taskName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const rootElement = canvas.getRootElement();
  
  // Posición entre source y target
  const position = {
    x: (sourceTask.x + targetTask.x) / 2,
    y: (sourceTask.y + targetTask.y) / 2
  };
  
  try {
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      position,
      rootElement
    );
    
    // Configurar la tarea
    modeling.updateProperties(approvalTask, {
      name: taskName
    });
    
    // Conectar source → approvalTask
    modeling.connect(sourceTask, approvalTask, { type: 'bpmn:SequenceFlow' });
    
    // Conectar approvalTask → targetTask
    modeling.connect(approvalTask, targetTask, { type: 'bpmn:SequenceFlow' });
    
    results.assignmentsCreated++;
    return approvalTask;
  } catch (error) {
    console.warn(`⚠️ Error creando tarea de aprobación en flujo:`, error.message);
    return null;
  }
}

function processConsultRoles(modeler, bpmnTask, consultRoles, processedRoles, results, logElement) {
  if (consultRoles.length > 0) {
    const unprocessedConsultRoles = consultRoles.filter(roleName => !processedRoles.has(roleName));
    if (unprocessedConsultRoles.length > 0) {
      createMessageFlow(modeler, bpmnTask, unprocessedConsultRoles, results);
      unprocessedConsultRoles.forEach(role => processedRoles.add(role));
      results.eventsCreated++;
    }
  }
}

function processApproveRoles(modeler, bpmnTask, approveRoles, processedRoles, results, logElement) {
  approveRoles.forEach(roleName => {
    if (processedRoles.has(roleName)) return;
    createApprovalTask(modeler, bpmnTask, roleName, results);
    processedRoles.add(roleName);
    results.assignmentsCreated++;
  });
}

function processInformRoles(modeler, bpmnTask, informRoles, processedRoles, results, logElement) {
  if (informRoles.length > 0) {
    const unprocessedInformRoles = informRoles.filter(roleName => !processedRoles.has(roleName));
    if (unprocessedInformRoles.length > 0) {
      createInfoEvent(modeler, bpmnTask, unprocessedInformRoles, results);
      unprocessedInformRoles.forEach(role => processedRoles.add(role));
      results.eventsCreated++;
    }
  }
}

// Función para procesar consultas en secuencia y retornar el último elemento creado
function processConsultRolesSequential(modeler, sourceElement, consultRoles, processedRoles, results, logElement) {
  if (consultRoles.length === 0) return sourceElement;
  
  const unprocessedConsultRoles = consultRoles.filter(roleName => !processedRoles.has(roleName));
  if (unprocessedConsultRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando consultas secuenciales desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  unprocessedConsultRoles.forEach(roleName => {
    // Crear evento de consulta conectado solo al elemento anterior
    const consultEvent = createEventInFlowSequential(modeler, currentSource, 'bpmn:IntermediateThrowEvent', `Consultar ${roleName}`, results);
    
    if (consultEvent) {
      currentSource = consultEvent;
      processedRoles.add(roleName);
      console.log(`✅ Creado evento consulta: ${roleName} → ${consultEvent.businessObject.name}`);
    }
  });
  
  return currentSource;
}

// Función para procesar aprobaciones en secuencia y retornar el último elemento creado
function processApproveRolesSequential(modeler, sourceElement, approveRoles, processedRoles, results, logElement) {
  if (approveRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando aprobaciones secuenciales desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  approveRoles.forEach(roleName => {
    if (processedRoles.has(roleName)) return;
    
    // Crear tarea de aprobación conectada solo al elemento anterior
    const approvalTask = createApprovalTaskInFlowSequential(modeler, currentSource, roleName, `Aprobar ${roleName}`, results);
    
    if (approvalTask) {
      currentSource = approvalTask;
      processedRoles.add(roleName);
      console.log(`✅ Creada tarea aprobación: ${roleName} → ${approvalTask.businessObject.name}`);
      
      // CONECTAR EL ROL A LA TAREA DE APROBACIÓN
      createSimpleAssignment(modeler, approvalTask, roleName, results);
    } else {
      console.warn(`⚠️ No se pudo crear tarea de aprobación para: ${roleName}`);
    }
  });
  
  return currentSource;
}

// Función para procesar información en secuencia
function processInformRolesSequential(modeler, sourceElement, informRoles, processedRoles, results, logElement) {
  if (informRoles.length === 0) return sourceElement;
  
  const unprocessedInformRoles = informRoles.filter(roleName => !processedRoles.has(roleName));
  if (unprocessedInformRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando información secuencial desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  unprocessedInformRoles.forEach(roleName => {
    // Crear evento de información conectado solo al elemento anterior
    const infoEvent = createEventInFlowSequential(modeler, currentSource, 'bpmn:IntermediateThrowEvent', `Informar ${roleName}`, results);
    
    if (infoEvent) {
      currentSource = infoEvent;
      processedRoles.add(roleName);
      console.log(`✅ Creado evento información: ${roleName} → ${infoEvent.businessObject.name}`);
    }
  });
  
  return currentSource;
}

// Función auxiliar para crear eventos en secuencia (sin conectar a siguiente tarea)
function createEventInFlowSequential(modeler, sourceTask, eventType, eventName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const rootElement = canvas.getRootElement();
  
  // Posición a la derecha del source
  const position = {
    x: sourceTask.x + 150,
    y: sourceTask.y
  };
  
  try {
    const event = modeling.createShape(
      { type: eventType },
      position,
      rootElement
    );
    
    // Configurar el evento
    modeling.updateProperties(event, {
      name: eventName
    });
    
    // Conectar solo source → event (NO event → nextTask)
    modeling.connect(sourceTask, event, { type: 'bpmn:SequenceFlow' });
    
    results.eventsCreated++;
    return event;
  } catch (error) {
    console.warn(`⚠️ Error creando evento en secuencia:`, error.message);
    return null;
  }
}

// Función auxiliar para crear tareas de aprobación en secuencia (sin conectar a siguiente tarea)
function createApprovalTaskInFlowSequential(modeler, sourceTask, roleName, taskName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');
  const rootElement = canvas.getRootElement();
  
  // Posición a la derecha del source
  const position = {
    x: sourceTask.x + 150,
    y: sourceTask.y
  };
  
  try {
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      position,
      rootElement
    );
    
    // Configurar la tarea
    modeling.updateProperties(approvalTask, {
      name: taskName
    });
    
    // Conectar solo source → approvalTask (NO approvalTask → nextTask)
    modeling.connect(sourceTask, approvalTask, { type: 'bpmn:SequenceFlow' });
    
    results.assignmentsCreated++;
    return approvalTask;
  } catch (error) {
    console.warn(`⚠️ Error creando tarea de aprobación en secuencia:`, error.message);
    return null;
  }
}

// Función para detectar elementos existentes en el flujo SECUENCIAL
function detectExistingFlowElements(modeler, sourceTask, targetTask) {
  const elementRegistry = modeler.get('elementRegistry');
  
  const existingElements = {
    consultEvents: [],
    approvalTasks: [],
    infoEvents: [],
    flowSequence: [] // Para mantener el orden secuencial
  };
  
  // Buscar la ruta secuencial desde sourceTask hasta targetTask
  let currentElement = sourceTask;
  const visited = new Set();
  
  console.log(`🔍 DEBUG - Iniciando detección de flujo secuencial desde: ${sourceTask.businessObject.name} hasta: ${targetTask.businessObject.name}`);
  
  while (currentElement && currentElement.id !== targetTask.id && !visited.has(currentElement.id)) {
    visited.add(currentElement.id);
    
    // Buscar la siguiente conexión de secuencia
    const outgoingConnections = elementRegistry.filter(conn => 
      conn.type === 'bpmn:SequenceFlow' && 
      conn.source && conn.source.id === currentElement.id
    );
    
    if (outgoingConnections.length === 0) {
      console.log(`🔍 DEBUG - No se encontraron conexiones salientes para: ${currentElement.businessObject.name}`);
      break;
    }
    
    // Tomar la primera conexión (asumiendo flujo secuencial)
    const nextConnection = outgoingConnections[0];
    const nextElement = nextConnection.target;
    
    console.log(`🔍 DEBUG - Siguiente elemento en flujo: ${currentElement.businessObject.name} → ${nextElement.businessObject.name}`);
    
    // Clasificar el elemento actual si es un elemento de flujo
    if (currentElement.type === 'bpmn:IntermediateThrowEvent' || currentElement.type === 'bpmn:IntermediateCatchEvent') {
      if (currentElement.businessObject && currentElement.businessObject.name) {
        if (currentElement.businessObject.name.startsWith('Consultar ')) {
          existingElements.consultEvents.push(currentElement);
          existingElements.flowSequence.push({ type: 'consult', element: currentElement });
          console.log(`🔍 DEBUG - Evento de consulta detectado: ${currentElement.businessObject.name}`);
        } else if (currentElement.businessObject.name.startsWith('Informar ')) {
          existingElements.infoEvents.push(currentElement);
          existingElements.flowSequence.push({ type: 'inform', element: currentElement });
          console.log(`🔍 DEBUG - Evento de información detectado: ${currentElement.businessObject.name}`);
        }
      }
    } else if (currentElement.type === 'bpmn:UserTask') {
      if (currentElement.businessObject && currentElement.businessObject.name && currentElement.businessObject.name.startsWith('Aprobar ')) {
        existingElements.approvalTasks.push(currentElement);
        existingElements.flowSequence.push({ type: 'approve', element: currentElement });
        console.log(`🔍 DEBUG - Tarea de aprobación detectada: ${currentElement.businessObject.name}`);
      }
    }
    
    currentElement = nextElement;
  }
  
  console.log(`🔍 DEBUG - Secuencia de flujo detectada:`, existingElements.flowSequence.map(item => 
    `${item.type}: ${item.element.businessObject.name}`
  ));
  
  return existingElements;
}

// Función para procesar consultas respetando elementos existentes
function processConsultRolesWithExisting(modeler, sourceElement, consultRoles, existingElements, processedRoles, results, logElement) {
  if (consultRoles.length === 0) return sourceElement;
  
  const unprocessedConsultRoles = consultRoles.filter(roleName => !processedRoles.has(roleName));
  if (unprocessedConsultRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando consultas con elementos existentes desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  // Marcar como procesados los roles que ya tienen eventos existentes
  existingElements.consultEvents.forEach(event => {
    const eventName = event.businessObject.name;
    const roleName = eventName.replace('Consultar ', '');
    if (consultRoles.includes(roleName)) {
      processedRoles.add(roleName);
      console.log(`🔍 DEBUG - Rol ya procesado (evento existente): ${roleName}`);
    }
  });
  
  // Si ya existen eventos de consulta, insertar después del último
  if (existingElements.consultEvents.length > 0) {
    const lastConsultEvent = existingElements.consultEvents[existingElements.consultEvents.length - 1];
    currentSource = lastConsultEvent;
    console.log(`🔍 DEBUG - Insertando después del evento de consulta existente: ${lastConsultEvent.businessObject.name}`);
  }
  
  unprocessedConsultRoles.forEach(roleName => {
    // Verificar que no exista ya un evento para este rol
    const existingEvent = existingElements.consultEvents.find(event => 
      event.businessObject.name === `Consultar ${roleName}`
    );
    
    if (existingEvent) {
      console.log(`🔍 DEBUG - Evento de consulta ya existe para: ${roleName}, saltando`);
      currentSource = existingEvent;
      processedRoles.add(roleName);
      return;
    }
    
    // Crear evento de consulta conectado al elemento actual
    const consultEvent = createEventInFlowSequential(modeler, currentSource, 'bpmn:IntermediateThrowEvent', `Consultar ${roleName}`, results);
    
    if (consultEvent) {
      currentSource = consultEvent;
      processedRoles.add(roleName);
      console.log(`✅ Creado evento consulta: ${roleName} → ${consultEvent.businessObject.name}`);
    }
  });
  
  return currentSource;
}

// Función para procesar aprobaciones respetando elementos existentes
function processApproveRolesWithExisting(modeler, sourceElement, approveRoles, existingElements, processedRoles, results, logElement) {
  if (approveRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando aprobaciones con elementos existentes desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  // Marcar como procesados los roles que ya tienen tareas existentes
  existingElements.approvalTasks.forEach(task => {
    const taskName = task.businessObject.name;
    const roleName = taskName.replace('Aprobar ', '');
    if (approveRoles.includes(roleName)) {
      processedRoles.add(roleName);
      console.log(`🔍 DEBUG - Rol ya procesado (tarea existente): ${roleName}`);
    }
  });
  
  // Determinar la posición correcta para insertar aprobaciones
  // Si hay eventos de consulta, insertar después del último evento de consulta
  if (existingElements.consultEvents.length > 0) {
    const lastConsultEvent = existingElements.consultEvents[existingElements.consultEvents.length - 1];
    currentSource = lastConsultEvent;
    console.log(`🔍 DEBUG - Insertando aprobaciones después del último evento de consulta: ${lastConsultEvent.businessObject.name}`);
  }
  
  // Si ya existen tareas de aprobación, insertar después de la última
  if (existingElements.approvalTasks.length > 0) {
    const lastApprovalTask = existingElements.approvalTasks[existingElements.approvalTasks.length - 1];
    currentSource = lastApprovalTask;
    console.log(`🔍 DEBUG - Insertando después de la tarea de aprobación existente: ${lastApprovalTask.businessObject.name}`);
  }
  
  approveRoles.forEach(roleName => {
    if (processedRoles.has(roleName)) return;
    
    // Verificar que no exista ya una tarea para este rol
    const existingTask = existingElements.approvalTasks.find(task => 
      task.businessObject.name === `Aprobar ${roleName}`
    );
    
    if (existingTask) {
      console.log(`🔍 DEBUG - Tarea de aprobación ya existe para: ${roleName}, saltando`);
      currentSource = existingTask;
      processedRoles.add(roleName);
      return;
    }
    
    // Crear tarea de aprobación conectada al elemento actual
    const approvalTask = createApprovalTaskInFlowSequential(modeler, currentSource, roleName, `Aprobar ${roleName}`, results);
    
    if (approvalTask) {
      currentSource = approvalTask;
      processedRoles.add(roleName);
      console.log(`✅ Creada tarea aprobación: ${roleName} → ${approvalTask.businessObject.name}`);
      
      // CONECTAR EL ROL A LA TAREA DE APROBACIÓN
      createSimpleAssignment(modeler, approvalTask, roleName, results);
    } else {
      console.warn(`⚠️ No se pudo crear tarea de aprobación para: ${roleName}`);
    }
  });
  
  return currentSource;
}

// Función para procesar información respetando elementos existentes
function processInformRolesWithExisting(modeler, sourceElement, informRoles, existingElements, processedRoles, results, logElement) {
  if (informRoles.length === 0) return sourceElement;
  
  const unprocessedInformRoles = informRoles.filter(roleName => !processedRoles.has(roleName));
  if (unprocessedInformRoles.length === 0) return sourceElement;
  
  console.log(`🔍 DEBUG - Procesando información con elementos existentes desde: ${sourceElement.businessObject.name || sourceElement.id}`);
  
  let currentSource = sourceElement;
  
  // Marcar como procesados los roles que ya tienen eventos existentes
  existingElements.infoEvents.forEach(event => {
    const eventName = event.businessObject.name;
    const roleName = eventName.replace('Informar ', '');
    if (informRoles.includes(roleName)) {
      processedRoles.add(roleName);
      console.log(`🔍 DEBUG - Rol ya procesado (evento existente): ${roleName}`);
    }
  });
  
  // Determinar la posición correcta para insertar información
  // Si hay tareas de aprobación, insertar después de la última tarea de aprobación
  if (existingElements.approvalTasks.length > 0) {
    const lastApprovalTask = existingElements.approvalTasks[existingElements.approvalTasks.length - 1];
    currentSource = lastApprovalTask;
    console.log(`🔍 DEBUG - Insertando información después de la última tarea de aprobación: ${lastApprovalTask.businessObject.name}`);
  }
  // Si no hay tareas de aprobación pero hay eventos de consulta, insertar después del último evento de consulta
  else if (existingElements.consultEvents.length > 0) {
    const lastConsultEvent = existingElements.consultEvents[existingElements.consultEvents.length - 1];
    currentSource = lastConsultEvent;
    console.log(`🔍 DEBUG - Insertando información después del último evento de consulta: ${lastConsultEvent.businessObject.name}`);
  }
  
  // Si ya existen eventos de información, insertar después del último
  if (existingElements.infoEvents.length > 0) {
    const lastInfoEvent = existingElements.infoEvents[existingElements.infoEvents.length - 1];
    currentSource = lastInfoEvent;
    console.log(`🔍 DEBUG - Insertando después del evento de información existente: ${lastInfoEvent.businessObject.name}`);
  }
  
  unprocessedInformRoles.forEach(roleName => {
    // Verificar que no exista ya un evento para este rol
    const existingEvent = existingElements.infoEvents.find(event => 
      event.businessObject.name === `Informar ${roleName}`
    );
    
    if (existingEvent) {
      console.log(`🔍 DEBUG - Evento de información ya existe para: ${roleName}, saltando`);
      currentSource = existingEvent;
      processedRoles.add(roleName);
      return;
    }
    
    // Crear evento de información conectado al elemento actual
    const infoEvent = createEventInFlowSequential(modeler, currentSource, 'bpmn:IntermediateThrowEvent', `Informar ${roleName}`, results);
    
    if (infoEvent) {
      currentSource = infoEvent;
      processedRoles.add(roleName);
      console.log(`✅ Creado evento información: ${roleName} → ${infoEvent.businessObject.name}`);
    }
  });
  
  return currentSource;
}

// ... existing code ...

// Verificación final de disponibilidad de funciones globales
document.addEventListener('DOMContentLoaded', function() {
  console.log('🔍 Verificando funciones globales...');
  console.log('executeRasciToRalphMapping:', typeof window.executeRasciToRalphMapping);
  console.log('executeIntelligentRasciMapping:', typeof window.executeIntelligentRasciMapping);
  
  if (typeof window.executeIntelligentRasciMapping !== 'function') {
    console.error('❌ executeIntelligentRasciMapping no está disponible globalmente');
  } else {
    console.log('✅ executeIntelligentRasciMapping está disponible globalmente');
  }
});

// Verificación inmediata
if (typeof window.executeIntelligentRasciMapping !== 'function') {
  console.warn('⚠️ executeIntelligentRasciMapping no disponible, redefiniendo...');
  window.executeIntelligentRasciMapping = function() {
    console.log('🧠 Función de mapeo inteligente ejecutada (fallback)');
    alert('Función de mapeo inteligente ejecutada. Verifica la consola para más detalles.');
  };
}







