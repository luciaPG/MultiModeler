// panels/rasci.js - Versión limpia y optimizada
// TODO: A TERMINAR EL DESARROLLO - Sistema de guardado automático implementado

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
      
      console.log('✅ Estado RASCI guardado automáticamente');
    } catch (e) {
      console.warn('❌ No se pudo guardar el estado RASCI:', e);
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

// Función para resetear el posicionamiento
window.resetPositioning = function() {
  if (positionManager) {
    positionManager.reset();
    console.log('🔄 Posicionamiento reseteado');
    alert('✅ Posicionamiento reseteado. Los nuevos elementos se posicionarán de forma más simple y clara.');
  } else {
    console.warn('⚠️ Gestor de posicionamiento no disponible');
  }
};

// Función para limpiar roles duplicados
window.cleanDuplicateRoles = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  if (positionManager) {
    const cleanedCount = positionManager.cleanDuplicateRoles(modeler);
    console.log(`🧹 Roles duplicados limpiados: ${cleanedCount} eliminados`);
    alert(`✅ Limpieza completada: ${cleanedCount} roles duplicados eliminados.\n\nLos roles ahora están mejor distribuidos y es más fácil distinguirlos.`);
  } else {
    console.warn('⚠️ Gestor de posicionamiento no disponible');
    alert('❌ Error: Gestor de posicionamiento no disponible');
  }
};

// Función para mostrar el estado del posicionamiento
window.showPositioningStatus = function() {
  if (positionManager) {
    const stats = positionManager.getDetailedStats();
    let message = `🎯 Estado del Sistema de Posicionamiento:\n\n`;
    message += `📊 Estadísticas:\n`;
    message += `  - Posiciones ocupadas: ${stats.usedPositions}\n`;
    message += `  - Instancias de roles: ${stats.roleInstances}\n`;
    message += `  - Espaciado actual: ${stats.spacing}px\n`;
    message += `  - Tamaño de roles: ${stats.roleSize.width}x${stats.roleSize.height}px\n`;
    message += `  - Tamaño de capacidades: ${stats.capabilitySize.width}x${stats.capabilitySize.height}px\n\n`;
    message += `✨ Características:\n`;
    stats.features.forEach(feature => {
      message += `  • ${feature}\n`;
    });
    message += `\n💡 Consejos:\n`;
    message += `  • Usa "Limpiar Roles Duplicados" si ves superposiciones\n`;
    message += `  • Usa "Resetear Posicionamiento" para empezar limpio\n`;
    message += `  • Ajusta el espaciado en la configuración si es necesario\n`;
    
    alert(message);
  } else {
    alert('❌ Error: Gestor de posicionamiento no disponible');
  }
};

// Función para mostrar estadísticas de elementos existentes
window.showExistingElementsStats = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  const stats = getExistingElementsStats(modeler);
  const elementRegistry = modeler.get('elementRegistry');
  
  // Contar elementos por tipo
  const roleNames = [];
  const capabilityNames = [];
  const assignmentDetails = [];
  
  elementRegistry.forEach(element => {
    if (element.type === 'RALph:RoleRALph' || 
        (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
         element.businessObject.name && element.businessObject.name.startsWith('ROL:'))) {
      roleNames.push(element.businessObject.name.replace('ROL: ', ''));
    }
    else if (element.type === 'RALph:Personcap' || 
             (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
              element.businessObject.name && element.businessObject.name.startsWith('CAPACIDAD:'))) {
      capabilityNames.push(element.businessObject.name.replace('CAPACIDAD: ', ''));
    }
    else if (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association') {
      if (element.source && element.target) {
        const sourceName = element.source.businessObject ? element.source.businessObject.name : element.source.id;
        const targetName = element.target.businessObject ? element.target.businessObject.name : element.target.id;
        assignmentDetails.push(`${sourceName} → ${targetName}`);
      }
    }
  });

  // Crear mensaje detallado
  let message = `📊 Estadísticas de Elementos RALph Existentes:\n\n`;
  message += `👥 Roles (${stats.roles}):\n`;
  message += roleNames.length > 0 ? `   ${roleNames.join(', ')}\n` : `   Ninguno\n`;
  message += `\n🔧 Capacidades (${stats.capabilities}):\n`;
  message += capabilityNames.length > 0 ? `   ${capabilityNames.join(', ')}\n` : `   Ninguna\n`;
  message += `\n🔗 Asignaciones (${stats.assignments}):\n`;
  message += assignmentDetails.length > 0 ? `   ${assignmentDetails.slice(0, 5).join('\n   ')}\n` : `   Ninguna\n`;
  if (assignmentDetails.length > 5) {
    message += `   ... y ${assignmentDetails.length - 5} más\n`;
  }
  message += `\n✅ Tareas de Aprobación: ${stats.approvalTasks}\n`;
  message += `📢 Eventos Informativos: ${stats.infoEvents}\n`;
  message += `💬 Flujos de Mensaje: ${stats.messageFlows}\n`;

  // Mostrar en modal o alert
  alert(message);
};

  // Variables para el sistema de guardado automático
  let saveTimeout = null;
  let lastSaveTime = 0;

  // Función para cargar el estado desde localStorage
  function loadRasciState() {
    try {
      const savedRoles = localStorage.getItem('rasciRoles');
      if (savedRoles) {
        roles = JSON.parse(savedRoles);
        console.log('📂 Roles RASCI cargados:', roles.length, 'roles');
      }
      
      const savedMatrixData = localStorage.getItem('rasciMatrixData');
      if (savedMatrixData) {
        window.rasciMatrixData = JSON.parse(savedMatrixData);
        console.log('📂 Matriz RASCI cargada:', Object.keys(window.rasciMatrixData).length, 'tareas');
      }
    } catch (e) {
      console.warn('❌ No se pudo cargar el estado RASCI:', e);
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
        lastSaveTime = Date.now();
      }, 1000);
      return;
    }
    
    // Guardar inmediatamente si ha pasado suficiente tiempo
    saveRasciState();
    lastSaveTime = now;
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
          alert('Este nombre de rol ya existe.');
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
            
            // Guardar el estado automáticamente
            autoSaveRasciState();

          } else if (['-', 'Delete', 'Backspace', 'Escape'].includes(e.key)) {
            e.preventDefault();

            container.classList.remove('rasci-ready');
            cell.classList.remove('cell-ready', 'cell-with-content');

            display.innerHTML = '';
            if (window.rasciMatrixData && window.rasciMatrixData[task] && window.rasciMatrixData[task][role]) {
              delete window.rasciMatrixData[task][role];
            }
            cell.removeAttribute('data-value');
            
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
    console.log('Inicialización RASCI - recargando matriz automáticamente');
    updateMatrixFromDiagram();
  }, 500); // Delay para asegurar que el BPMN modeler esté listo

  // También recargar cuando el DOM esté completamente cargado
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        console.log('DOM cargado - recargando matriz RASCI automáticamente');
        updateMatrixFromDiagram();
      }, 300);
    });
  } else {
    // Si el DOM ya está cargado, recargar inmediatamente
    setTimeout(() => {
      console.log('DOM ya cargado - recargando matriz RASCI automáticamente');
      updateMatrixFromDiagram();
    }, 300);
  }

  // Recargar también cuando la ventana termine de cargar completamente
  window.addEventListener('load', () => {
    setTimeout(() => {
      console.log('Ventana cargada completamente - recargando matriz RASCI automáticamente');
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
            console.log('Panel RASCI se hizo visible - recargando matriz automáticamente');
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
    console.log('Forzando recarga de matriz RASCI');
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
        console.log('Página recargada - forzando recarga de matriz RASCI');
        window.forceReloadRasciMatrix();
      }
    }, 1000);
  }
}

// ===== FUNCIÓN DE MAPEO RASCI A RALPH =====
window.executeRasciToRalphMapping = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    showMappingError('No se encontró el modelador BPMN');
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
  logElement.innerHTML = 'Iniciando mapeo RASCI → RALph...\n';
  
  try {
    const mappingResults = performRasciToRalphMapping(modeler);
    logElement.innerHTML += '\n✅ Mapeo completado exitosamente!\n';
    logElement.innerHTML += `\nResumen:\n`;
    logElement.innerHTML += `- Roles creados: ${mappingResults.rolesCreated}\n`;
    logElement.innerHTML += `- Asignaciones simples: ${mappingResults.simpleAssignments}\n`;
    logElement.innerHTML += `- Asignaciones compuestas: ${mappingResults.complexAssignments}\n`;
    logElement.innerHTML += `- Tareas de aprobación: ${mappingResults.approvalTasks}\n`;
    logElement.innerHTML += `- Flujos de mensaje: ${mappingResults.messageFlows}\n`;
    logElement.innerHTML += `- Eventos informativos: ${mappingResults.infoEvents}\n`;
    
    // Hacer scroll al final del log
    logElement.scrollTop = logElement.scrollHeight;
    
  } catch (error) {
    console.error('Error en mapeo RASCI:', error);
    showMappingError(`Error durante el mapeo: ${error.message}`);
  }
};

function showMappingError(message) {
  const logElement = document.getElementById('mapping-log');
  const resultsElement = document.getElementById('mapping-results');
  
  resultsElement.style.display = 'block';
  logElement.innerHTML = `❌ ${message}\n`;
  logElement.style.color = '#dc2626';
}

function performRasciToRalphMapping(modeler) {
  // Verificar que el modeler tenga todos los servicios necesarios
  if (!modeler) {
    console.error('Modeler no disponible');
    return { error: 'Modeler no disponible' };
  }

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
    console.error('Elemento de log no encontrado');
    return { error: 'Elemento de log no encontrado' };
  }
  
  // Resetear el gestor de posiciones para un nuevo mapeo
  positionManager.reset();
  
  // Obtener servicios del modeler de forma segura
  let elementRegistry, modeling, canvas, moddle;
  try {
    elementRegistry = modeler.get('elementRegistry');
    modeling = modeler.get('modeling');
    canvas = modeler.get('canvas');
    moddle = modeler.get('moddle');
  } catch (error) {
    console.error('Error obteniendo servicios del modeler:', error);
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

  // Detectar elementos RALph existentes
  const existingRoles = new Set();
  const existingCapabilities = new Set();
  const existingAssignments = new Map(); // taskId -> Set of roleNames
  
  elementRegistry.forEach(element => {
    // Detectar roles existentes
    if ((element.type === 'RALph:RoleRALph' || element.type === 'bpmn:TextAnnotation') && 
        element.businessObject && element.businessObject.name) {
      const roleName = element.businessObject.name.replace(/^(ROL|CAPACIDAD): /, '');
      existingRoles.add(roleName);
    }
    
    // Detectar capacidades existentes
    if ((element.type === 'RALph:Personcap' || element.type === 'bpmn:TextAnnotation') && 
        element.businessObject && element.businessObject.name) {
      const capabilityName = element.businessObject.name.replace(/^(ROL|CAPACIDAD): /, '');
      existingCapabilities.add(capabilityName);
    }
    
    // Detectar asignaciones existentes (conexiones)
    if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
      if (element.source && element.target) {
        const sourceId = element.source.id;
        const targetName = element.target.businessObject ? element.target.businessObject.name : '';
        const roleName = targetName.replace(/^(ROL|CAPACIDAD): /, '');
        
        if (!existingAssignments.has(sourceId)) {
          existingAssignments.set(sourceId, new Set());
        }
        existingAssignments.get(sourceId).add(roleName);
      }
    }
  });

  // Obtener estadísticas detalladas de elementos existentes
  const existingStats = getExistingElementsStats(modeler);
  
  logElement.innerHTML += `\n🔍 Elementos existentes detectados:\n`;
  logElement.innerHTML += `  - Roles: ${existingRoles.size} (${Array.from(existingRoles).join(', ')})\n`;
  logElement.innerHTML += `  - Capacidades: ${existingCapabilities.size} (${Array.from(existingCapabilities).join(', ')})\n`;
  logElement.innerHTML += `  - Asignaciones: ${existingAssignments.size} tareas con asignaciones\n`;
  logElement.innerHTML += `  - Tareas de aprobación: ${existingStats.approvalTasks}\n`;
  logElement.innerHTML += `  - Eventos informativos: ${existingStats.infoEvents}\n`;
  logElement.innerHTML += `  - Flujos de mensaje: ${existingStats.messageFlows}\n`;

  // Los roles se crearán cerca de cada tarea cuando sea necesario
  logElement.innerHTML += `  ℹ️ Sistema de posicionamiento mejorado:\n`;
  logElement.innerHTML += `     - Espaciado aumentado a ${positionManager.spacing}px para evitar superposiciones\n`;
  logElement.innerHTML += `     - Detección de roles existentes mejorada (radio: 250px)\n`;
  logElement.innerHTML += `     - Reutilización de instancias de roles cercanas\n`;
  logElement.innerHTML += `     - Marcado automático de posiciones ocupadas\n`;
  logElement.innerHTML += `     - Posicionamiento natural: derecha → arriba → abajo → izquierda\n`;

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

    // Obtener asignaciones existentes para esta tarea
    const taskAssignments = existingAssignments.get(bpmnTask.id) || new Set();
    
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

    // Procesar cada responsabilidad de forma incremental
    Object.entries(taskRoles).forEach(([roleName, responsibility]) => {
      const assignmentKey = `${responsibility}_${roleName}`;
      
      // Verificar si esta asignación ya existe
      if (taskAssignments.has(roleName)) {
        logElement.innerHTML += `    ✓ ${responsibility} → ${roleName} (ya existe)\n`;
        return; // Saltar esta asignación
      }
      
      logElement.innerHTML += `    + ${responsibility} → ${roleName} (nueva)\n`;
      
      switch (responsibility) {
        case 'R':
          createSimpleAssignment(modeler, bpmnTask, roleName, results);
          break;
        case 'A':
          if (document.getElementById('create-approval-tasks').checked) {
            createApprovalTask(modeler, bpmnTask, roleName, results);
          }
          break;
        case 'S':
          // Si hay roles responsables, crear colaboración AND
          if (responsibleRoles.length > 0) {
            createCollaborationAssignment(modeler, bpmnTask, roleName, responsibleRoles[0], results);
          } else {
            createComplexAssignment(modeler, bpmnTask, roleName, results);
          }
          break;
        case 'C':
          if (document.getElementById('create-message-flows').checked) {
            createMessageFlow(modeler, bpmnTask, roleName, results);
          }
          break;
        case 'I':
          if (document.getElementById('create-message-flows').checked) {
            createInfoEvent(modeler, bpmnTask, roleName, results);
          }
          break;
      }
    });
  });

  // Mostrar información sobre el posicionamiento
  const totalArea = positionManager.getTotalArea();
  logElement.innerHTML += `\n📐 Información de posicionamiento:\n`;
  logElement.innerHTML += `  - Roles creados: ${positionManager.rolePositions.size}\n`;
  logElement.innerHTML += `  - Capacidades creadas: ${positionManager.capabilityPositions.size}\n`;
  logElement.innerHTML += `  - Área utilizada: ${totalArea.width}x${totalArea.height} píxeles\n`;
  logElement.innerHTML += `  - Roles organizados en filas de ${positionManager.rolesPerRow}\n`;
  logElement.innerHTML += `  - Espaciado: ${positionManager.spacingX}x${positionManager.spacingY} píxeles\n`;

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
  logElement.innerHTML += `💡 Sistema de posicionamiento mejorado para evitar superposiciones.\n`;
  logElement.innerHTML += `🎯 Tareas de aprobación insertadas exactamente en el flujo del proceso.\n`;
  logElement.innerHTML += `🔗 Conexiones optimizadas con waypoints para líneas rectas.\n`;
  
  logElement.innerHTML += `\n💡 Consejos para mejorar la visualización:\n`;
  logElement.innerHTML += `  • Si ves roles superpuestos, usa "Limpiar Roles Duplicados"\n`;
  logElement.innerHTML += `  • Si hay líneas cruzadas, usa "Limpiar Conexiones Problemáticas"\n`;
  logElement.innerHTML += `  • Para reorganizar todo, usa "Optimizar Todo el Diagrama RALph"\n`;
  logElement.innerHTML += `  • Activa "Reposicionamiento Automático" para ajustes automáticos\n`;
  logElement.innerHTML += `  • Usa "Estado del Posicionamiento" para ver estadísticas detalladas\n`;

  return results;
}

// Función para limpiar elementos RALph creados
window.clearRalphElements = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  const elementRegistry = modeler.get('elementRegistry');
  const modeling = modeler.get('modeling');
  
  // Encontrar todos los elementos RALph
  const ralphElements = [];
  elementRegistry.forEach(element => {
    if (element.type && element.type.startsWith('RALph:')) {
      ralphElements.push(element);
    }
  });

  if (ralphElements.length === 0) {
    alert('No hay elementos RALph para eliminar');
    return;
  }

  // Eliminar elementos RALph
  ralphElements.forEach(element => {
    try {
      modeling.removeElement(element);
    } catch (error) {
      console.warn('Error eliminando elemento RALph:', error);
    }
  });

  alert(`Se eliminaron ${ralphElements.length} elementos RALph`);
};

// Función para mapear automáticamente tareas de la matriz a tareas del diagrama
window.autoMapTasksToDiagram = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  const elementRegistry = modeler.get('elementRegistry');
  const matrixData = window.rasciMatrixData;
  
  if (!matrixData || Object.keys(matrixData).length === 0) {
    alert('No hay datos en la matriz RASCI para mapear');
    return;
  }

  // Obtener tareas disponibles en el diagrama
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
        type: element.type
      });
    }
  });

  // Crear matriz actualizada con nombres correctos
  const updatedMatrixData = {};
  let mappedCount = 0;
  let unmappedCount = 0;

  Object.entries(matrixData).forEach(([taskName, taskRoles]) => {
    // Buscar la tarea correspondiente
    const foundTask = findBpmnTaskByName(elementRegistry, taskName);
    
    if (foundTask) {
      // Usar el nombre del businessObject si existe, sino usar el ID
      const correctTaskName = (foundTask.businessObject && foundTask.businessObject.name) || foundTask.id;
      updatedMatrixData[correctTaskName] = taskRoles;
      mappedCount++;
      console.log(`✅ Mapeada: "${taskName}" → "${correctTaskName}"`);
    } else {
      // Si no se encuentra, mantener el nombre original
      updatedMatrixData[taskName] = taskRoles;
      unmappedCount++;
      console.log(`❌ No mapeada: "${taskName}"`);
    }
  });

  // Actualizar la matriz global
  window.rasciMatrixData = updatedMatrixData;
  
  // Guardar en localStorage
  localStorage.setItem('rasciMatrixData', JSON.stringify(updatedMatrixData));

  // Mostrar resultado
  const message = `Mapeo automático completado:\n` +
                 `✅ Tareas mapeadas: ${mappedCount}\n` +
                 `⚠️ Tareas no encontradas: ${unmappedCount}\n\n` +
                 `La matriz ha sido actualizada con los nombres correctos de las tareas del diagrama.`;

  alert(message);
  
  // Recargar la matriz en la interfaz
  if (typeof updateMatrixFromDiagram === 'function') {
    setTimeout(() => {
      updateMatrixFromDiagram();
    }, 100);
  }
};

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
    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Obtener posición inteligente basada en el flujo
    let position;
    if (taskBounds) {
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

  try {
    // Crear rol cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
    
    if (!roleElement) {
      // Si no se pudo crear el rol, crear una capacidad
      if (document.getElementById('create-capabilities').checked) {
        createRalphCapability(modeler, roleName, results, taskBounds);
      }
      return;
    }

    // Verificar si la conexión ya existe
    if (connectionExists(modeler, bpmnTask, roleElement)) {
      console.log(`Conexión entre ${bpmnTask.id} y ${roleName} ya existe, saltando`);
      return;
    }

    // Crear la conexión optimizada
    const connection = positionManager.createOptimizedConnection(modeling, bpmnTask, roleElement, 'RALph:ResourceArc');
    
    results.simpleAssignments++;
  } catch (error) {
    console.warn('Error creando conexión RALph, usando conexión BPMN estándar:', error);
    
    // Fallback: usar conexión BPMN estándar
    try {
      const taskBounds = getSafeBounds(bpmnTask);
      const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
      
      if (roleElement && !connectionExists(modeler, bpmnTask, roleElement)) {
        const connection = positionManager.createOptimizedConnection(modeling, bpmnTask, roleElement, 'bpmn:Association');
        
        if (connection) {
          results.simpleAssignments++;
        }
      }
    } catch (fallbackError) {
      console.error('Error en fallback de conexión:', fallbackError);
    }
  }
}

function createCollaborationAssignment(modeler, bpmnTask, supportRoleName, responsibleRoleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Crear rol de soporte cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const supportRoleElement = createRalphRole(modeler, supportRoleName, results, taskBounds);
    
    if (!supportRoleElement) {
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Buscar o crear el rol responsable
    const elementRegistry = modeler.get('elementRegistry');
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
      
      // Conectar el rol responsable directamente a la tarea
      if (responsibleRoleElement) {
        try {
          positionManager.createOptimizedConnection(modeling, bpmnTask, responsibleRoleElement, 'RALph:ResourceArc');
        } catch (error) {
          console.warn('Error creando conexión responsable:', error);
          try {
            positionManager.createOptimizedConnection(modeling, bpmnTask, responsibleRoleElement, 'bpmn:Association');
          } catch (fallbackError) {
            console.error('Error en fallback de conexión responsable:', fallbackError);
          }
        }
      }
    }

    // Crear nodo AND para representar la colaboración entre responsable y soporte
    const andPosition = {
      x: taskBounds.x + taskBounds.width + 150,
      y: taskBounds.y + (taskBounds.height / 2) - 20
    };
    
    const collaborationNode = modeling.createShape(
      { type: 'RALph:Complex-Assignment-AND' },
      andPosition,
      rootElement
    );

    // Configurar el nodo de colaboración
    modeling.updateProperties(collaborationNode, {
      name: `Colaboración ${responsibleRoleName} + ${supportRoleName}`
    });

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

    results.complexAssignments++;
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
      // Si no se pudo crear el rol, crear una capacidad
      if (document.getElementById('create-capabilities').checked) {
        createRalphCapability(modeler, roleName, results, taskBounds);
      }
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
      
      // Conectar el rol responsable directamente a la tarea
      if (responsibleRoleElement) {
        try {
          positionManager.createOptimizedConnection(modeling, bpmnTask, responsibleRoleElement, 'RALph:ResourceArc');
        } catch (error) {
          console.warn('Error creando conexión responsable:', error);
          try {
            positionManager.createOptimizedConnection(modeling, bpmnTask, responsibleRoleElement, 'bpmn:Association');
          } catch (fallbackError) {
            console.error('Error en fallback de conexión responsable:', fallbackError);
          }
        }
      }
    }

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
    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Obtener la siguiente tarea en el flujo
    const nextTask = positionManager.getNextTaskInFlow(modeler, bpmnTask);
    const taskBounds = getSafeBounds(bpmnTask);
    const nextTaskBounds = nextTask ? getSafeBounds(nextTask) : null;
    
    // Obtener posición para la tarea de aprobación (en el flujo)
    const position = positionManager.getApprovalTaskPosition(taskBounds, nextTaskBounds, modeler);
    
    // Crear nueva tarea de aprobación
    const approvalTaskName = `Aprobar ${bpmnTask.businessObject.name}`;
    const approvalTask = modeling.createShape(
      { type: 'bpmn:UserTask' },
      position,
      rootElement
    );

    // Configurar la tarea de aprobación
    modeling.updateProperties(approvalTask, {
      name: approvalTaskName
    });

    // Manejar el flujo: ELIMINAR conexión original y crear: original → aprobación → siguiente
    if (nextTask) {
      // Buscar y eliminar TODAS las conexiones originales entre las tareas
      const connectionsToRemove = [];
      const elementRegistry = modeler.get('elementRegistry');
      
      elementRegistry.forEach(element => {
        if (element.type && (
          element.type === 'bpmn:SequenceFlow' || 
          element.type === 'bpmn:Association' ||
          element.type === 'bpmn:MessageFlow'
        )) {
          if (element.source && element.target && 
              element.source.id === bpmnTask.id &&
              element.target.id === nextTask.id) {
            connectionsToRemove.push(element);
          }
        }
      });
      
      // Eliminar conexiones originales
      connectionsToRemove.forEach(connection => {
        try {
          modeling.removeElement(connection);
          console.log(`✅ Eliminada conexión original: ${bpmnTask.businessObject.name} → ${nextTask.businessObject.name}`);
        } catch (error) {
          console.warn('Error eliminando conexión original:', error);
        }
      });
      
      // Crear NUEVAS conexiones: original → aprobación → siguiente
      try {
        const connection1 = positionManager.createOptimizedConnection(modeling, bpmnTask, approvalTask, 'bpmn:SequenceFlow');
        const connection2 = positionManager.createOptimizedConnection(modeling, approvalTask, nextTask, 'bpmn:SequenceFlow');
        
        if (connection1 && connection2) {
          console.log(`✅ Creadas nuevas conexiones: ${bpmnTask.businessObject.name} → Aprobar → ${nextTask.businessObject.name}`);
        }
      } catch (error) {
        console.error('Error creando conexiones de aprobación:', error);
      }
    } else {
      // Si no hay siguiente tarea, solo conectar la original a la aprobación
      try {
        positionManager.createOptimizedConnection(modeling, bpmnTask, approvalTask, 'bpmn:SequenceFlow');
        console.log(`✅ Creada conexión de aprobación: ${bpmnTask.businessObject.name} → Aprobar`);
      } catch (error) {
        console.error('Error creando conexión de aprobación:', error);
      }
    }

    // Crear rol para la tarea de aprobación (cerca de la tarea)
    const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
    if (roleElement) {
      createSimpleAssignment(modeler, approvalTask, roleName, results);
    }

    results.approvalTasks++;
  } catch (error) {
    console.error('Error creando tarea de aprobación:', error);
  }
}

function createMessageFlow(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Crear rol consultado cerca de la tarea si no existe
    const taskBounds = getSafeBounds(bpmnTask);
    const consultRoleElement = createRalphRole(modeler, roleName, results, taskBounds);
    
    if (!consultRoleElement) {
      return;
    }

    const rootElement = canvas.getRootElement();
    
    // Crear nodo de consulta para representar la relación bidireccional
    const consultPosition = {
      x: taskBounds.x + taskBounds.width + 200,
      y: taskBounds.y + (taskBounds.height / 2) - 15
    };
    
    const consultNode = modeling.createShape(
      { type: 'bpmn:IntermediateCatchEvent' },
      consultPosition,
      rootElement
    );

    // Configurar el nodo de consulta
    modeling.updateProperties(consultNode, {
      name: `Consultar ${roleName}`
    });

    // Crear conexión bidireccional: Tarea ↔ Consulta ↔ Rol
    try {
      // Tarea → Consulta (solicitud de consulta)
      const connection1 = positionManager.createOptimizedConnection(modeling, bpmnTask, consultNode, 'bpmn:SequenceFlow');
      
      // Consulta → Rol (envío de consulta)
      const connection2 = positionManager.createOptimizedConnection(modeling, consultNode, consultRoleElement, 'RALph:dashedLine');
      
      // Rol → Consulta (respuesta de consulta)
      const connection3 = positionManager.createOptimizedConnection(modeling, consultRoleElement, consultNode, 'RALph:dashedLine');
      
      // Consulta → Tarea (retorno de respuesta)
      const connection4 = positionManager.createOptimizedConnection(modeling, consultNode, bpmnTask, 'bpmn:SequenceFlow');
      
      if (connection1 && connection2 && connection3 && connection4) {
        results.messageFlows++;
      }
    } catch (error) {
      console.warn('Error creando flujo de consulta bidireccional, usando conexión simple:', error);
      
      // Fallback: conexión simple
      try {
        const connection = positionManager.createOptimizedConnection(modeling, bpmnTask, consultRoleElement, 'bpmn:Association');
        if (connection) {
          results.messageFlows++;
        }
      } catch (fallbackError) {
        console.error('Error en fallback de flujo de consulta:', fallbackError);
      }
    }
  } catch (error) {
    console.warn('Error creando flujo de consulta, usando conexión BPMN estándar:', error);
    
    // Fallback: usar conexión BPMN estándar
    try {
      const taskBounds = getSafeBounds(bpmnTask);
      const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
      
      if (roleElement) {
        const connection = positionManager.createOptimizedConnection(modeling, bpmnTask, roleElement, 'bpmn:Association');
        
        if (connection) {
          results.messageFlows++;
        }
      }
    } catch (fallbackError) {
      console.error('Error en fallback de flujo de consulta:', fallbackError);
    }
  }
}

function createInfoEvent(modeler, bpmnTask, roleName, results) {
  const modeling = modeler.get('modeling');
  const canvas = modeler.get('canvas');

  try {
    // Obtener el elemento raíz del diagrama
    const rootElement = canvas.getRootElement();
    
    // Obtener posición para el evento informativo (arriba de la tarea)
    const taskBounds = getSafeBounds(bpmnTask);
    const position = positionManager.getInfoEventPosition(taskBounds);
    
    // Crear evento intermedio de mensaje
    const infoEvent = modeling.createShape(
      { type: 'bpmn:IntermediateThrowEvent' },
      position,
      rootElement
    );

    // Configurar el evento
    modeling.updateProperties(infoEvent, {
      name: `Informar a ${roleName}`
    });

    // Conectar la tarea al evento con conexión optimizada
    positionManager.createOptimizedConnection(modeling, bpmnTask, infoEvent, 'bpmn:SequenceFlow');

    // Crear rol cerca de la tarea si no existe
    const roleElement = createRalphRole(modeler, roleName, results, taskBounds);
    if (roleElement) {
      try {
        // Conectar el evento al rol con conexión optimizada
        positionManager.createOptimizedConnection(modeling, infoEvent, roleElement, 'RALph:solidLine');
      } catch (error) {
        console.warn('Error creando flujo informativo, usando conexión BPMN estándar:', error);
        
        // Fallback: usar conexión BPMN estándar
        try {
          positionManager.createOptimizedConnection(modeling, infoEvent, roleElement, 'bpmn:Association');
        } catch (fallbackError) {
          console.error('Error en fallback de flujo informativo:', fallbackError);
        }
      }
    }

    results.infoEvents++;
  } catch (error) {
    console.error('Error creando evento informativo:', error);
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
    this.spacing = 100; // Espaciado aumentado para evitar superposiciones
    this.roleSize = { width: 58, height: 81 };
    this.capabilitySize = { width: 60, height: 75 };
    this.taskSpacing = 120; // Espaciado entre tareas
    this.roleInstances = new Map(); // Mapa de roles y sus instancias
  }

  // Posicionamiento simple basado en el flujo BPMN
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
      
      if (distance < 300) { // Si está a menos de 300px, reutilizar
        return existingBounds;
      }
    }

    // Posición preferida: derecha de la tarea (flujo natural)
    const preferredPosition = {
      x: taskBounds.x + taskBounds.width + this.spacing,
      y: taskBounds.y + (taskBounds.height / 2) - (this.roleSize.height / 2)
    };

    if (this.isPositionFree(preferredPosition, this.roleSize)) {
      this.markPositionUsed(preferredPosition, this.roleSize);
      return preferredPosition;
    }

    // Posición alternativa: arriba de la tarea
    const abovePosition = {
      x: taskBounds.x + (taskBounds.width / 2) - (this.roleSize.width / 2),
      y: taskBounds.y - this.roleSize.height - this.spacing
    };

    if (this.isPositionFree(abovePosition, this.roleSize)) {
      this.markPositionUsed(abovePosition, this.roleSize);
      return abovePosition;
    }

    // Posición alternativa: abajo de la tarea
    const belowPosition = {
      x: taskBounds.x + (taskBounds.width / 2) - (this.roleSize.width / 2),
      y: taskBounds.y + taskBounds.height + this.spacing
    };

    if (this.isPositionFree(belowPosition, this.roleSize)) {
      this.markPositionUsed(belowPosition, this.roleSize);
      return belowPosition;
    }

    // Posición alternativa: izquierda de la tarea
    const leftPosition = {
      x: taskBounds.x - this.roleSize.width - this.spacing,
      y: taskBounds.y + (taskBounds.height / 2) - (this.roleSize.height / 2)
    };

    if (this.isPositionFree(leftPosition, this.roleSize)) {
      this.markPositionUsed(leftPosition, this.roleSize);
      return leftPosition;
    }

    // Si todas las posiciones están ocupadas, buscar una posición libre cercana
    const fallbackPosition = this.findNearestFreePosition(taskBounds, this.roleSize);
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

  // Encontrar la posición libre más cercana
  findNearestFreePosition(taskBounds, size) {
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

    for (let distance = 1; distance <= 5; distance++) {
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

    // Fallback: posición aleatoria lejana
    return {
      x: taskBounds.x + Math.random() * 400 - 200,
      y: taskBounds.y + Math.random() * 400 - 200
    };
  }

  // Crear conexión optimizada con waypoints simples
  createOptimizedConnection(modeling, sourceElement, targetElement, connectionType = 'RALph:ResourceArc') {
    try {
      const sourceBounds = this.getSafeBounds(sourceElement);
      const targetBounds = this.getSafeBounds(targetElement);
      
      // Calcular waypoints para línea recta
      const waypoints = this.calculateStraightWaypoints(sourceBounds, targetBounds);
      
      const connection = modeling.connect(sourceElement, targetElement, {
        type: connectionType,
        waypoints: waypoints
      });

      return connection;
    } catch (error) {
      console.warn('Error creando conexión optimizada:', error);
      return null;
    }
  }

  // Calcular waypoints para línea recta
  calculateStraightWaypoints(sourceBounds, targetBounds) {
    const sourceCenter = {
      x: sourceBounds.x + sourceBounds.width / 2,
      y: sourceBounds.y + sourceBounds.height / 2
    };
    
    const targetCenter = {
      x: targetBounds.x + targetBounds.width / 2,
      y: targetBounds.y + targetBounds.height / 2
    };

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
    } else {
      // Diagonal - usar un punto intermedio para evitar cruces
      const midX = (sourceCenter.x + targetCenter.x) / 2;
      return [
        { x: sourceCenter.x, y: sourceCenter.y },
        { x: midX, y: sourceCenter.y },
        { x: midX, y: targetCenter.y },
        { x: targetCenter.x, y: targetCenter.y }
      ];
    }
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
  }

  // Reposicionar elementos RALph cuando se mueve una tarea BPMN
  repositionRalphElements(modeler, movedTask) {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    // Buscar elementos RALph conectados a la tarea movida
    const connectedElements = [];
    
    elementRegistry.forEach(element => {
      if (element.type && element.type.startsWith('RALph:') && 
          element.source && element.target) {
        if (element.source.id === movedTask.id || element.target.id === movedTask.id) {
          connectedElements.push(element);
        }
      }
    });

    // Reposicionar elementos conectados
    connectedElements.forEach(element => {
      const taskBounds = this.getSafeBounds(movedTask);
      let newPosition;

      if (element.type === 'RALph:RoleRALph') {
        newPosition = this.getRolePosition(element.businessObject.name, taskBounds, modeler);
      } else if (element.type === 'RALph:Personcap') {
        newPosition = this.getCapabilityPosition(element.businessObject.name, taskBounds, modeler);
      }

      if (newPosition) {
        modeling.moveShape(element, {
          x: newPosition.x - element.x,
          y: newPosition.y - element.y
        });
      }
    });
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

  // Limpiar roles duplicados
  cleanDuplicateRoles(modeler) {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    const roleGroups = new Map(); // roleName -> [elements]
    let cleanedCount = 0;

    // Agrupar roles por nombre
    elementRegistry.forEach(element => {
      if ((element.type === 'RALph:RoleRALph' || 
           (element.type === 'bpmn:TextAnnotation' && element.businessObject && 
            element.businessObject.name && element.businessObject.name.startsWith('ROL:'))) && 
          element.businessObject && element.businessObject.name) {
        
        const roleName = element.businessObject.name.replace('ROL: ', '');
        if (!roleGroups.has(roleName)) {
          roleGroups.set(roleName, []);
        }
        roleGroups.get(roleName).push(element);
      }
    });

    // Eliminar duplicados, manteniendo solo el primero
    roleGroups.forEach((elements, roleName) => {
      if (elements.length > 1) {
        // Mantener el primer elemento, eliminar los demás
        for (let i = 1; i < elements.length; i++) {
          try {
            modeling.removeElements([elements[i]]);
            cleanedCount++;
          } catch (error) {
            console.warn('Error eliminando rol duplicado:', error);
          }
        }
      }
    });

    return cleanedCount;
  }
}

// Instancia global del gestor de posiciones inteligente
let positionManager = new SimpleBpmnStylePositionManager();

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

// Función para aplicar la configuración de posicionamiento
window.applyPositioningConfig = function() {
  const spacing = parseInt(document.getElementById('spacing').value) || 80;
  const searchRadius = parseInt(document.getElementById('search-radius').value) || 200;

  // Actualizar la configuración del gestor de posiciones
  positionManager.spacing = spacing;
  positionManager.searchRadius = searchRadius;

  // Mostrar confirmación
  const logElement = document.getElementById('mapping-log');
  if (logElement) {
    logElement.innerHTML += `\n⚙️ Configuración de posicionamiento inteligente actualizada:\n`;
    logElement.innerHTML += `  - Espaciado mínimo: ${spacing}px\n`;
    logElement.innerHTML += `  - Radio de búsqueda: ${searchRadius}px\n`;
    logElement.innerHTML += `  - Sistema: Análisis inteligente de flujo\n`;
    logElement.innerHTML += `  - Características: Evita cruces + conexiones rectas + flujo de aprobación\n`;
  }

  // Mostrar indicador visual
  showConfigAppliedIndicator();
};

// Función para verificar si existe una conexión entre dos elementos
function connectionExists(modeler, sourceElement, targetElement) {
  const elementRegistry = modeler.get('elementRegistry');
  
  let exists = false;
  elementRegistry.forEach(element => {
    if (element.type && (element.type === 'RALph:ResourceArc' || element.type === 'bpmn:Association')) {
      if (element.source && element.target) {
        if ((element.source.id === sourceElement.id && element.target.id === targetElement.id) ||
            (element.source.id === targetElement.id && element.target.id === sourceElement.id)) {
          exists = true;
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

// Función para reposicionar automáticamente elementos RALph cuando se mueve una tarea
window.autoRepositionRalphElements = function(movedTask) {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    console.warn('Modeler no disponible para reposicionamiento');
    return;
  }

  try {
    positionManager.repositionRalphElements(modeler, movedTask);
    console.log('✅ Reposicionamiento automático completado');
  } catch (error) {
    console.error('Error en reposicionamiento automático:', error);
  }
};

// Función para limpiar conexiones problemáticas
window.cleanupRalphConnections = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  try {
    positionManager.cleanupAndRecreateConnections(modeler);
    alert('Conexiones RALph limpiadas y optimizadas');
  } catch (error) {
    console.error('Error limpiando conexiones:', error);
    alert('Error limpiando conexiones: ' + error.message);
  }
};

// Variable global para el listener de eventos
let autoRepositionListener = null;

// Función para activar el reposicionamiento automático
window.enableAutoReposition = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  try {
    // Obtener el eventBus para escuchar cambios
    const eventBus = modeler.get('eventBus');
    
    // Remover listener anterior si existe
    if (autoRepositionListener) {
      eventBus.off('element.changed', autoRepositionListener);
    }
    
    // Crear nuevo listener
    autoRepositionListener = function(event) {
      const element = event.element;
      
      // Verificar si es una tarea BPMN que se movió
      if (element.type && element.type.startsWith('bpmn:') && 
          (element.type === 'bpmn:Task' || 
           element.type === 'bpmn:UserTask' || 
           element.type === 'bpmn:ServiceTask' ||
           element.type === 'bpmn:ScriptTask' ||
           element.type === 'bpmn:ManualTask' ||
           element.type === 'bpmn:BusinessRuleTask' ||
           element.type === 'bpmn:SendTask' ||
           element.type === 'bpmn:ReceiveTask' ||
           element.type === 'bpmn:CallActivity' ||
           element.type === 'bpmn:SubProcess')) {
        
        // Esperar un poco para que el movimiento termine
        setTimeout(() => {
          window.autoRepositionRalphElements(element);
        }, 500);
      }
    };
    
    // Agregar el listener
    eventBus.on('element.changed', autoRepositionListener);
    
    console.log('✅ Reposicionamiento automático activado');
    alert('Reposicionamiento automático activado. Los elementos RALph se reposicionarán automáticamente cuando muevas tareas BPMN.');
    
  } catch (error) {
    console.error('Error activando reposicionamiento automático:', error);
    alert('Error activando reposicionamiento automático: ' + error.message);
  }
};

// Función para desactivar el reposicionamiento automático
window.disableAutoReposition = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  try {
    const eventBus = modeler.get('eventBus');
    
    if (autoRepositionListener) {
      eventBus.off('element.changed', autoRepositionListener);
      autoRepositionListener = null;
      console.log('✅ Reposicionamiento automático desactivado');
      alert('Reposicionamiento automático desactivado.');
    } else {
      alert('El reposicionamiento automático no estaba activado.');
    }
    
  } catch (error) {
    console.error('Error desactivando reposicionamiento automático:', error);
    alert('Error desactivando reposicionamiento automático: ' + error.message);
  }
};

// Función para optimizar todo el diagrama RALph
window.optimizeRalphDiagram = function() {
  const modeler = window.bpmnModeler;
  if (!modeler) {
    alert('No se encontró el modelador BPMN');
    return;
  }

  try {
    // Limpiar conexiones problemáticas
    positionManager.cleanupAndRecreateConnections(modeler);
    
    // Reposicionar todos los elementos RALph
    const elementRegistry = modeler.get('elementRegistry');
    const ralphElements = [];
    
    elementRegistry.forEach(element => {
      if (element.type && (
        element.type === 'RALph:RoleRALph' ||
        element.type === 'RALph:Personcap' ||
        element.type === 'RALph:Complex-Assignment-AND' ||
        (element.type === 'bpmn:TextAnnotation' && 
         element.businessObject && 
         element.businessObject.name && 
         (element.businessObject.name.startsWith('ROL:') || 
          element.businessObject.name.startsWith('CAPACIDAD:')))
      )) {
        ralphElements.push(element);
      }
    });
    
    // Reposicionar cada elemento RALph
    ralphElements.forEach(ralphElement => {
      // Encontrar la tarea BPMN conectada
      elementRegistry.forEach(connection => {
        if (connection.type && (
          connection.type === 'RALph:ResourceArc' || 
          connection.type === 'bpmn:Association' ||
          connection.type === 'RALph:solidLine' ||
          connection.type === 'RALph:dashedLine'
        )) {
          if (connection.source && connection.target) {
            if (connection.source.id === ralphElement.id || connection.target.id === ralphElement.id) {
              const bpmnTask = connection.source.id === ralphElement.id ? connection.target : connection.source;
              if (bpmnTask.type && bpmnTask.type.startsWith('bpmn:')) {
                positionManager.repositionRalphElements(modeler, bpmnTask);
              }
            }
          }
        }
      });
    });
    
    alert(`Optimización completada: ${ralphElements.length} elementos RALph reposicionados`);
    
  } catch (error) {
    console.error('Error optimizando diagrama RALph:', error);
    alert('Error optimizando diagrama: ' + error.message);
  }
};

// Función para mostrar indicador de configuración aplicada
function showConfigAppliedIndicator() {
  let indicator = document.getElementById('config-applied-indicator');
  if (!indicator) {
    indicator = document.createElement('div');
    indicator.id = 'config-applied-indicator';
    indicator.innerHTML = `
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
        <i class="fas fa-cog" style="font-size: 10px;"></i>
        <span>Configuración aplicada</span>
      </div>
    `;
    document.body.appendChild(indicator);
  }

  // Mostrar indicador
  indicator.style.opacity = '1';
  indicator.style.transform = 'translateY(0)';

  // Ocultar después de 2 segundos
  setTimeout(() => {
    indicator.style.opacity = '0';
    indicator.style.transform = 'translateY(-10px)';
  }, 2000);
}

