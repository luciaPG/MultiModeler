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
      
      /* Asegurar que la pestaña de leyenda sea completamente independiente */
      #config-tab {
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
        const taskName = (element.businessObject && element.businessObject.name) || `Tarea ${element.id}`;
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
        
        // Ocultar explícitamente elementos de la leyenda
        const configTab = document.querySelector('#config-tab');
        if (configTab) {
          configTab.style.display = 'none';
          configTab.style.visibility = 'hidden';
          configTab.style.position = 'absolute';
          configTab.style.top = '-9999px';
        }
        
        // Actualizar la matriz cuando se cambie a esta pestaña
        setTimeout(() => {
          updateMatrixFromDiagram();
        }, 100);
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

