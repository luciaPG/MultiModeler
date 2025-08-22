// RASCI Styles

export function applyStyles() {
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
    
    .mapping-section {
      padding: 20px;
      background: #fff;
      border-radius: 8px;
      margin-bottom: 20px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    .mapping-section h3 {
      font-size: 18px;
      font-weight: 600;
      color: #1f2937;
      margin-bottom: 12px;
      font-family: 'Segoe UI', Roboto, sans-serif;
    }
    
    .mapping-description {
      font-size: 14px;
      color: #6b7280;
      line-height: 1.5;
      margin-bottom: 16px;
    }
    
    .mapping-description strong {
      color: #374151;
      font-weight: 600;
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
    
    .mapping-info {
      margin-top: 20px;
      padding: 16px;
      background: #f0f9ff;
      border-radius: 8px;
      border: 1px solid #bae6fd;
    }
    
    .mapping-info h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #0369a1;
    }
    
    .mapping-info ul {
      margin: 0;
      padding-left: 20px;
    }
    
    .mapping-info li {
      font-size: 13px;
      color: #0c4a6e;
      margin-bottom: 6px;
      line-height: 1.4;
    }
    
    .test-buttons {
      margin-top: 24px;
      padding: 16px;
      background: #fef3c7;
      border-radius: 8px;
      border: 1px solid #fbbf24;
    }
    
    .test-buttons h4 {
      margin: 0 0 12px 0;
      font-size: 14px;
      font-weight: 600;
      color: #92400e;
    }
    
    /* Estilo para la nota importante de mapeo manual */
    .mapping-section div[style*="background: #fff3cd"] {
      background: #fff3cd !important;
      border: 1px solid #ffeaa7 !important;
      border-radius: 6px !important;
      padding: 12px !important;
      margin: 16px 0 !important;
      font-size: 13px !important;
      line-height: 1.4 !important;
    }
    
    .mapping-section div[style*="background: #fff3cd"] strong {
      color: #92400e !important;
      font-weight: 600 !important;
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
    
    .mapping-types {
      background: #f9fafb;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .mapping-types h4 {
      font-size: 14px;
      font-weight: 600;
      color: #374151;
      margin: 0 0 12px 0;
    }
    
    .mapping-type {
      display: flex;
      align-items: flex-start;
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.4;
    }
    
    .mapping-type:last-child {
      margin-bottom: 0;
    }
    
    .mapping-type-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      margin-right: 8px;
      margin-top: 2px;
      flex-shrink: 0;
    }
    
    .mapping-type-dot.blue { background: #3b82f6; }
    .mapping-type-dot.green { background: #10b981; }
    
    .mapping-buttons {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 20px;
    }
    
    .btn {
      padding: 12px 20px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      text-decoration: none;
      display: inline-block;
      line-height: 1.4;
    }
    
    .btn-primary {
      background: #3a56d4;
      color: white;
    }
    
    .btn-primary:hover {
      background: #2d4a8a;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(58, 86, 212, 0.3);
    }
    
    .btn-success {
      background: #10b981;
      color: white;
    }
    
    .btn-success:hover {
      background: #059669;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
    }
    
    .btn-full-width {
      width: 100%;
    }
    
    .mapping-logic {
      background: #f0f9ff;
      border: 1px solid #bae6fd;
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 20px;
    }
    
    .mapping-logic h4 {
      font-size: 14px;
      font-weight: 600;
      color: #0369a1;
      margin: 0 0 12px 0;
    }
    
    .logic-item {
      display: flex;
      align-items: center;
      margin-bottom: 8px;
      font-size: 12px;
      line-height: 1.4;
    }
    
    .logic-item:last-child {
      margin-bottom: 0;
    }
    
    .logic-letter {
      width: 20px;
      height: 20px;
      border-radius: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 600;
      font-size: 11px;
      margin-right: 8px;
      flex-shrink: 0;
    }
    
    .logic-letter.r { background: #ef4444; color: white; }
    .logic-letter.a { background: #f59e0b; color: white; }
    .logic-letter.s { background: #3b82f6; color: white; }
    .logic-letter.c { background: #8b5cf6; color: white; }
    .logic-letter.i { background: #10b981; color: white; }
    
    .mapping-results {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 16px;
      margin-top: 20px;
      display: none;
    }
    
    .mapping-results h4 {
      font-size: 14px;
      font-weight: 600;
      color: #334155;
      margin: 0 0 12px 0;
    }
    
    .mapping-log {
      background: #1e293b;
      color: #e2e8f0;
      border-radius: 6px;
      padding: 12px;
      font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
      font-size: 11px;
      line-height: 1.4;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
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
    
    .btn-warning {
      background: #f59e0b;
      color: white;
      border: 1px solid #f59e0b;
    }
    
    .btn-warning:hover {
      background: #d97706;
    }
    
    .btn-success {
      background: #10b981;
      color: white;
      border: 1px solid #10b981;
    }
    
    .btn-success:hover {
      background: #059669;
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

    #rasci-panel .panel-content {
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      width: 100% !important;
      height: 100% !important;
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
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      position: relative !important;
      width: 100% !important;
      padding: 2px 8px 2px 2px !important;
      min-height: 24px !important;
      transition: all 0.2s ease !important;
    }

    .role-header-content:hover {
      background: rgba(220, 38, 38, 0.05) !important;
      border-radius: 4px !important;
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
      position: absolute !important;
      top: 2px !important;
      right: 2px !important;
      width: 16px !important;
      height: 16px !important;
      border: none !important;
      background: transparent !important;
      color: #dc2626 !important;
      border-radius: 0 !important;
      font-size: 16px !important;
      font-weight: bold !important;
      cursor: pointer !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      opacity: 0.6 !important;
      z-index: 1001 !important;
      transition: all 0.2s ease !important;
      line-height: 1 !important;
      font-family: monospace !important;
      box-shadow: none !important;
      padding: 0 !important;
    }

    .delete-role-btn:hover {
      opacity: 1 !important;
      color: #b91c1c !important;
      transform: scale(1.1) !important;
      background: transparent !important;
      box-shadow: none !important;
    }

    .role-header-content:hover .delete-role-btn {
      opacity: 0.8 !important;
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
    #rasci-panel .panel-tabs {
      display: flex !important;
      flex-direction: row !important;
      border-bottom: 1px solid #e5e7eb;
      background: #f8f9fa;
      padding: 0;
      margin: 0;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      width: 100% !important;
      min-height: 45px !important;
    }

    #rasci-panel .panel-tabs .tab {
      padding: 12px 20px !important;
      background: #f8f9fa !important;
      border: none !important;
      border-bottom: 3px solid transparent !important;
      cursor: pointer !important;
      font-size: 13px !important;
      font-weight: 500 !important;
      color: #6c757d !important;
      transition: all 0.3s ease !important;
      margin-right: 1px !important;
      position: relative !important;
      font-family: 'Segoe UI', Roboto, sans-serif !important;
      flex: 1 !important;
      text-align: center !important;
      min-width: 80px !important;
      max-width: none !important;
      user-select: none !important;
      white-space: nowrap !important;
      overflow: hidden !important;
      text-overflow: ellipsis !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
    }

    #rasci-panel .panel-tabs .tab:last-child {
      margin-right: 0 !important;
    }

    #rasci-panel .panel-tabs .tab:hover {
      background: #e9ecef !important;
      color: #495057 !important;
      border-bottom-color: #dee2e6 !important;
      transform: translateY(-1px) !important;
    }

    #rasci-panel .panel-tabs .tab.active {
      background: #fff !important;
      color: #333 !important;
      border-bottom: 3px solid #3a56d4 !important;
      font-weight: 600 !important;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1) !important;
      position: relative !important;
    }

    #rasci-panel .panel-tabs .tab.active::after {
      content: '';
      position: absolute;
      bottom: -1px;
      left: 0;
      right: 0;
      height: 1px;
      background: #fff;
    }

    #rasci-panel .tab-content {
      padding: 0 !important;
      height: 100% !important;
      display: none !important;
      flex-direction: column !important;
      background: #fff !important;
      border: none !important;
      border-radius: 0 !important;
      overflow: hidden !important;
      width: 100% !important;
      position: absolute !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      z-index: 1 !important;
      opacity: 0 !important;
      visibility: hidden !important;
      transition: opacity 0.3s ease, visibility 0.3s ease !important;
    }

    #rasci-panel .tab-content.active {
      display: flex !important;
      position: relative !important;
      z-index: 2 !important;
      opacity: 1 !important;
      visibility: visible !important;
    }

    /* Asegurar que cada pestaña tenga su contenido completamente aislado */
    #rasci-panel .panel-content {
      position: relative !important;
      flex: 1 !important;
      display: flex !important;
      flex-direction: column !important;
      overflow: hidden !important;
      width: 100% !important;
      height: 100% !important;
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

      #rasci-panel .panel-tabs {
        min-height: 40px !important;
      }

      #rasci-panel .panel-tabs .tab {
        padding: 8px 12px !important;
        font-size: 12px !important;
        min-width: 60px !important;
      }
    }

    /* === FORZAR ESTILOS DE PESTAÑAS === */
    #rasci-panel .panel-tabs,
    #rasci-panel .panel-tabs * {
      box-sizing: border-box !important;
    }

    #rasci-panel .panel-tabs .tab {
      box-sizing: border-box !important;
      margin: 0 !important;
      border-radius: 0 !important;
    }

    /* === GARANTIZAR FUNCIONAMIENTO DE PESTAÑAS === */
    #rasci-panel .panel-content {
      position: relative !important;
      overflow: hidden !important;
    }

    #rasci-panel .tab-content:not(.active) {
      display: none !important;
      visibility: hidden !important;
      opacity: 0 !important;
      position: absolute !important;
      top: -9999px !important;
      left: -9999px !important;
      z-index: -1 !important;
    }

    #rasci-panel .tab-content.active {
      display: flex !important;
      visibility: visible !important;
      opacity: 1 !important;
      position: relative !important;
      top: auto !important;
      left: auto !important;
      z-index: 1 !important;
    }

    /* === ESTILOS ESPECÍFICOS PARA CADA PESTAÑA === */
    /* Pestaña 1: Matriz RASCI */
    #rasci-panel #main-tab {
      background: #fff !important;
      overflow-y: auto !important;
      padding: 12px !important;
    }

    #rasci-panel #main-tab #matrix-container {
      flex: 1 !important;
      min-height: 300px !important;
    }

    /* Pestaña 2: Mapeo RALph */
    #rasci-panel #mapping-tab {
      background: #fff !important;
      overflow-y: auto !important;
      padding: 0 !important;
      display: flex !important;
      flex-direction: column !important;
      height: 100% !important;
    }

    #rasci-panel #mapping-tab .mapping-container {
      padding: 20px !important;
      height: 100% !important;
      overflow-y: auto !important;
      flex: 1 !important;
    }
    
    #rasci-panel #mapping-tab .mapping-section {
      margin-bottom: 16px !important;
    }
    
    #rasci-panel #mapping-tab .btn {
      margin-bottom: 8px !important;
    }
    
    #rasci-panel #mapping-tab .btn-full-width {
      width: 100% !important;
      margin-bottom: 12px !important;
    }

    /* Pestaña 3: Leyenda */
    #rasci-panel #config-tab {
      background: #fff !important;
      overflow-y: auto !important;
      padding: 0 !important;
    }

    #rasci-panel #config-tab .rasci-legend {
      padding: 20px !important;
      height: 100% !important;
      overflow-y: auto !important;
    }

    /* === ESTILOS PARA MODALES === */
    .modal-overlay {
      position: fixed !important;
      top: 0 !important;
      left: 0 !important;
      right: 0 !important;
      bottom: 0 !important;
      background: rgba(0, 0, 0, 0.5) !important;
      display: flex !important;
      align-items: center !important;
      justify-content: center !important;
      z-index: 99999 !important;
      backdrop-filter: blur(2px) !important;
      pointer-events: auto !important;
    }

    .modal-content {
      background: white !important;
      border-radius: 8px !important;
      padding: 24px !important;
      max-width: 400px !important;
      width: 90% !important;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04) !important;
      animation: modalSlideIn 0.3s ease-out !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 100000 !important;
    }

    @keyframes modalSlideIn {
      from {
        opacity: 0;
        transform: translateY(-20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    
    .modal-title {
      font-size: 18px !important;
      font-weight: 600 !important;
      color: #374151 !important;
      margin: 0 0 16px 0 !important;
      font-family: 'Segoe UI', Roboto, sans-serif !important;
    }

    .modal-message {
      font-size: 14px !important;
      color: #6b7280 !important;
      margin-bottom: 20px !important;
      line-height: 1.5 !important;
      font-family: 'Segoe UI', Roboto, sans-serif !important;
    }

    .modal-actions {
      display: flex !important;
      gap: 12px !important;
      justify-content: flex-end !important;
    }
    
    .modal-btn {
      padding: 10px 20px !important;
      border: 1px solid #d1d5db !important;
      border-radius: 6px !important;
      background: white !important;
      color: #374151 !important;
      font-size: 14px !important;
      font-weight: 500 !important;
      cursor: pointer !important;
      transition: all 0.2s ease !important;
      font-family: 'Segoe UI', Roboto, sans-serif !important;
      min-width: 80px !important;
      pointer-events: auto !important;
      position: relative !important;
      z-index: 100000 !important;
    }
    
    .modal-btn:hover {
      background: #f3f4f6 !important;
      border-color: #9ca3af !important;
    }
    
    .modal-btn.danger {
      background: #dc2626 !important;
      color: white !important;
      border-color: #dc2626 !important;
    }
    
    .modal-btn.danger:hover {
      background: #b91c1c !important;
      border-color: #b91c1c !important;
    }
  `;
  document.head.appendChild(style);
} 