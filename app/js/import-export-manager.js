// === Import/Export Manager ===
// Sistema completo de importación/exportación para preservar toda la información de los paneles

class ImportExportManager {
  constructor() {
    this.version = '1.0.0';
    this.fileExtension = '.mmproject';
    this.mimeType = 'application/json';
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createFileInput();
  }

  setupEventListeners() {
    const testBtn = document.getElementById('test-export-btn');
    if (testBtn) {
      testBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportProject();
      });
    }
  }

  createFileInput() {
    // Crear input file oculto para importación
    let fileInput = document.getElementById('import-export-file-input');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.id = 'import-export-file-input';
      fileInput.type = 'file';
      fileInput.accept = this.fileExtension;
      fileInput.style.display = 'none';
      document.body.appendChild(fileInput);
      
      fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
          this.loadProjectFromFile(e.target.files[0]);
        }
      });
    }
  }

  // === EXPORTACIÓN ===

  async exportProject() {
    try {
      const projectData = await this.collectAllProjectData();
      
      if (!projectData) {
        this.showMessage('Error: No se pudo recopilar los datos del proyecto', 'error');
        return;
      }

      const fileName = this.generateFileName();
      this.downloadFile(projectData, fileName);
      
      this.showMessage('Proyecto exportado correctamente', 'success');
      
    } catch (error) {
      this.showMessage('Error al exportar el proyecto: ' + error.message, 'error');
    }
  }

  async collectAllProjectData() {
    const projectData = {
      version: this.version,
      exportDate: new Date().toISOString(),
      metadata: {
        name: 'MultiModeler Project',
        description: 'Proyecto exportado desde MultiModeler',
        createdBy: 'MultiModeler v' + this.version
      },
      panels: {},
      connections: {},
      settings: {}
    };

    // === PANEL BPMN ===
    projectData.panels.bpmn = await this.collectBpmnData();
    
    // === PANEL PPI ===
    projectData.panels.ppi = await this.collectPPIData();
    
    // === PANEL RASCI ===
    projectData.panels.rasci = await this.collectRasciData();
    
    // === CONFIGURACIÓN DE PANELES ===
    projectData.panels.configuration = this.collectPanelConfiguration();
    
    // === CONEXIONES ENTRE PANELES ===
    projectData.connections = await this.collectPanelConnections();
    
    // === CONFIGURACIONES GLOBALES ===
    projectData.settings = this.collectGlobalSettings();

    return projectData;
  }

  async collectBpmnData() {
    const bpmnData = {
      diagram: null,
      canvas: null,
      elements: {},
      relationships: {},
      timestamp: Date.now()
    };

    try {
      // Obtener XML del diagrama
      if (window.modeler) {
        const xmlResult = await window.modeler.saveXML({ format: true });
        if (xmlResult && xmlResult.xml) {
          bpmnData.diagram = xmlResult.xml;
        }
      }

      // Obtener estado del canvas
      const canvasState = localStorage.getItem('bpmnCanvasState');
      if (canvasState) {
        bpmnData.canvas = JSON.parse(canvasState);
      }

      // Obtener elementos PPINOT
      const ppinotElements = localStorage.getItem('bpmnPPINOTElements');
      if (ppinotElements) {
        bpmnData.elements.ppinot = JSON.parse(ppinotElements);
      }

      // Obtener elementos RALPH
      const ralphElements = localStorage.getItem('bpmnRALPHElements');
      if (ralphElements) {
        bpmnData.elements.ralph = JSON.parse(ralphElements);
      }

      // Obtener relaciones padre-hijo
      const parentChildRelations = localStorage.getItem('bpmnParentChildRelations');
      if (parentChildRelations) {
        bpmnData.relationships.parentChild = JSON.parse(parentChildRelations);
      }

      // Obtener relaciones PPINOT
      const ppinotRelations = localStorage.getItem('bpmnPPINOTRelations');
      if (ppinotRelations) {
        bpmnData.relationships.ppinot = JSON.parse(ppinotRelations);
      }

    } catch (error) {
      console.error('Error recopilando datos BPMN:', error);
    }

    return bpmnData;
  }

  async collectPPIData() {
    const ppiData = {
      indicators: [],
      relationships: {},
      settings: {},
      timestamp: Date.now()
    };

    try {
      // Obtener indicadores PPI
      if (window.ppiManager && window.ppiManager.core) {
        ppiData.indicators = window.ppiManager.core.getAllPPIs();
      }

      // Obtener relaciones PPI-BPMN
      const ppiRelations = localStorage.getItem('ppiRelationships');
      if (ppiRelations) {
        ppiData.relationships = JSON.parse(ppiRelations);
      }

      // Obtener configuraciones PPI
      const ppiSettings = localStorage.getItem('ppiSettings');
      if (ppiSettings) {
        ppiData.settings = JSON.parse(ppiSettings);
      }

    } catch (error) {
      console.error('Error recopilando datos PPI:', error);
    }

    return ppiData;
  }

  async collectRasciData() {
    const rasciData = {
      roles: [],
      matrix: {},
      tasks: [],
      settings: {},
      timestamp: Date.now()
    };

    try {
      // Obtener roles
      if (window.rasciRoles) {
        rasciData.roles = window.rasciRoles;
      }

      // Obtener matriz de datos
      if (window.rasciMatrixData) {
        rasciData.matrix = window.rasciMatrixData;
      }

      // Obtener tareas
      if (window.rasciTasks) {
        rasciData.tasks = window.rasciTasks;
      }

      // Obtener configuraciones RASCI
      const rasciSettings = localStorage.getItem('rasciSettings');
      if (rasciSettings) {
        rasciData.settings = JSON.parse(rasciSettings);
      }

    } catch (error) {
      console.error('Error recopilando datos RASCI:', error);
    }

    return rasciData;
  }

  collectPanelConfiguration() {
    const config = {
      activePanels: [],
      layout: '2v',
      panelOrder: [],
      timestamp: Date.now()
    };

    try {
      // Obtener paneles activos
      const activePanels = localStorage.getItem('activePanels');
      if (activePanels) {
        config.activePanels = JSON.parse(activePanels);
      }

      // Obtener layout actual
      const layout = localStorage.getItem('panelLayout');
      if (layout) {
        config.layout = layout;
      }

      // Obtener orden de paneles
      const panelOrder = localStorage.getItem('panelOrder');
      if (panelOrder) {
        config.panelOrder = JSON.parse(panelOrder);
      }

    } catch (error) {
      console.error('Error recopilando configuración de paneles:', error);
    }

    return config;
  }

  async collectPanelConnections() {
    const connections = {
      ppiToBpmn: {},
      rasciToBpmn: {},
      ppiToRasci: {},
      timestamp: Date.now()
    };

    try {
      // Conexiones PPI-BPMN
      if (window.ppiManager && window.ppiManager.core) {
        const ppiElements = window.ppiManager.core.getAllPPIs();
        ppiElements.forEach(ppi => {
          if (ppi.linkedElements && ppi.linkedElements.length > 0) {
            connections.ppiToBpmn[ppi.id] = ppi.linkedElements;
          }
        });
      }

      // Conexiones RASCI-BPMN (tareas)
      if (window.rasciTasks) {
        connections.rasciToBpmn.tasks = window.rasciTasks;
      }

    } catch (error) {
      console.error('Error recopilando conexiones:', error);
    }

    return connections;
  }

  collectGlobalSettings() {
    const settings = {
      autoSave: true,
      syncEnabled: true,
      theme: 'light',
      timestamp: Date.now()
    };

    try {
      // Obtener configuraciones globales
      const globalSettings = localStorage.getItem('globalSettings');
      if (globalSettings) {
        Object.assign(settings, JSON.parse(globalSettings));
      }

    } catch (error) {
      console.error('Error recopilando configuraciones globales:', error);
    }

    return settings;
  }

  // === IMPORTACIÓN ===

  importProject() {
    const fileInput = document.getElementById('import-export-file-input');
    if (fileInput) {
      fileInput.click();
    }
  }

  async loadProjectFromFile(file) {
    try {
      console.log('🔄 Iniciando importación del proyecto...');
      
      const fileContent = await this.readFileAsText(file);
      const projectData = JSON.parse(fileContent);
      
      if (!this.validateProjectData(projectData)) {
        this.showMessage('Error: El archivo no es un proyecto válido de MultiModeler', 'error');
        return;
      }

      // Confirmar importación
      const confirmed = await this.confirmImport();
      if (!confirmed) {
        return;
      }

      // Importar datos
      await this.importAllProjectData(projectData);
      
      this.showMessage('Proyecto importado correctamente', 'success');
      console.log('✅ Importación completada');
      
    } catch (error) {
      console.error('❌ Error en importación:', error);
      this.showMessage('Error al importar el proyecto: ' + error.message, 'error');
    }
  }

  readFileAsText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(e);
      reader.readAsText(file);
    });
  }

  validateProjectData(data) {
    return data && 
           data.version && 
           data.panels && 
           data.exportDate &&
           typeof data.panels === 'object';
  }

  async confirmImport() {
    return new Promise((resolve) => {
      const confirmed = confirm(
        '¿Estás seguro de que quieres importar este proyecto?\n\n' +
        'Esto sobrescribirá todos los datos actuales.'
      );
      resolve(confirmed);
    });
  }

  async importAllProjectData(projectData) {
    console.log('🔄 Iniciando importación de datos del proyecto...');
    
    // Limpiar datos existentes
    this.clearExistingData();

    // Importar datos de paneles
    if (projectData.panels.bpmn) {
      console.log('📊 Importando datos BPMN...');
      await this.importBpmnData(projectData.panels.bpmn);
    }

    if (projectData.panels.ppi) {
      console.log('📊 Importando datos PPI...');
      await this.importPPIData(projectData.panels.ppi);
    }

    if (projectData.panels.rasci) {
      console.log('📊 Importando datos RASCI...');
      await this.importRasciData(projectData.panels.rasci);
    }

    if (projectData.panels.configuration) {
      console.log('📊 Importando configuración de paneles...');
      this.importPanelConfiguration(projectData.panels.configuration);
    }

    // Importar conexiones
    if (projectData.connections) {
      console.log('📊 Importando conexiones entre paneles...');
      await this.importPanelConnections(projectData.connections);
    }

    // Importar configuraciones globales
    if (projectData.settings) {
      console.log('📊 Importando configuraciones globales...');
      this.importGlobalSettings(projectData.settings);
    }

    console.log('✅ Todos los datos importados correctamente');
    
    // Mostrar mensaje de éxito y opciones al usuario
    this.showImportSuccessMessage();
  }

  clearExistingData() {
    console.log('🧹 Limpiando datos existentes antes de importar...');
    
    // Usar StorageManager si está disponible
    if (window.storageManager) {
      window.storageManager.clearStorage();
    } else {
      // Fallback: usar método propio
      this.clearAllProjectData();
    }
  }

  async importBpmnData(bpmnData) {
    try {
      // Importar diagrama XML
      if (bpmnData.diagram && window.modeler) {
        console.log('📊 Importando diagrama XML...');
        
        // Esperar a que el modeler esté listo
        await this.waitForModelerReady();
        
        // Importar el XML
        await window.modeler.importXML(bpmnData.diagram);
        console.log('✅ Diagrama XML importado correctamente');
      }

      // Restaurar estado del canvas
      if (bpmnData.canvas) {
        localStorage.setItem('bpmnCanvasState', JSON.stringify(bpmnData.canvas));
        console.log('✅ Estado del canvas restaurado');
      }

      // Restaurar elementos PPINOT
      if (bpmnData.elements && bpmnData.elements.ppinot) {
        localStorage.setItem('bpmnPPINOTElements', JSON.stringify(bpmnData.elements.ppinot));
        console.log('✅ Elementos PPINOT restaurados');
      }

      // Restaurar elementos RALPH
      if (bpmnData.elements && bpmnData.elements.ralph) {
        localStorage.setItem('bpmnRALPHElements', JSON.stringify(bpmnData.elements.ralph));
        console.log('✅ Elementos RALPH restaurados');
      }

      // Restaurar relaciones
      if (bpmnData.relationships) {
        if (bpmnData.relationships.parentChild) {
          localStorage.setItem('bpmnParentChildRelations', JSON.stringify(bpmnData.relationships.parentChild));
          console.log('✅ Relaciones padre-hijo restauradas');
        }
        if (bpmnData.relationships.ppinot) {
          localStorage.setItem('bpmnPPINOTRelations', JSON.stringify(bpmnData.relationships.ppinot));
          console.log('✅ Relaciones PPINOT restauradas');
        }
      }

    } catch (error) {
      console.error('❌ Error importando datos BPMN:', error);
      throw error; // Re-lanzar el error para manejarlo en el nivel superior
    }
  }

  async importPPIData(ppiData) {
    try {
      console.log('📊 Importando datos PPI...');
      
      // Restaurar indicadores PPI
      if (ppiData.indicators && window.ppiManager && window.ppiManager.core) {
        ppiData.indicators.forEach(ppi => {
          window.ppiManager.core.addPPI(ppi);
        });
        console.log(`✅ ${ppiData.indicators.length} indicadores PPI restaurados`);
      }

      // Restaurar relaciones
      if (ppiData.relationships) {
        localStorage.setItem('ppiRelationships', JSON.stringify(ppiData.relationships));
        console.log('✅ Relaciones PPI restauradas');
      }

      // Restaurar configuraciones
      if (ppiData.settings) {
        localStorage.setItem('ppiSettings', JSON.stringify(ppiData.settings));
        console.log('✅ Configuraciones PPI restauradas');
      }

    } catch (error) {
      console.error('❌ Error importando datos PPI:', error);
      throw error;
    }
  }

  async importRasciData(rasciData) {
    try {
      console.log('📊 Importando datos RASCI...');
      
      // Restaurar roles
      if (rasciData.roles) {
        window.rasciRoles = rasciData.roles;
        localStorage.setItem('rasciRoles', JSON.stringify(rasciData.roles));
        console.log(`✅ ${rasciData.roles.length} roles RASCI restaurados`);
      }

      // Restaurar matriz
      if (rasciData.matrix) {
        window.rasciMatrixData = rasciData.matrix;
        localStorage.setItem('rasciMatrixData', JSON.stringify(rasciData.matrix));
        console.log('✅ Matriz RASCI restaurada');
      }

      // Restaurar tareas
      if (rasciData.tasks) {
        window.rasciTasks = rasciData.tasks;
        localStorage.setItem('rasciTasks', JSON.stringify(rasciData.tasks));
        console.log(`✅ ${rasciData.tasks.length} tareas RASCI restauradas`);
      }

      // Restaurar configuraciones
      if (rasciData.settings) {
        localStorage.setItem('rasciSettings', JSON.stringify(rasciData.settings));
        console.log('✅ Configuraciones RASCI restauradas');
      }

    } catch (error) {
      console.error('❌ Error importando datos RASCI:', error);
      throw error;
    }
  }

  importPanelConfiguration(config) {
    try {
      if (config.activePanels) {
        localStorage.setItem('activePanels', JSON.stringify(config.activePanels));
      }

      if (config.layout) {
        localStorage.setItem('panelLayout', config.layout);
      }

      if (config.panelOrder) {
        localStorage.setItem('panelOrder', JSON.stringify(config.panelOrder));
      }

    } catch (error) {
      console.error('Error importando configuración de paneles:', error);
    }
  }

  async importPanelConnections(connections) {
    try {
      // Restaurar conexiones PPI-BPMN
      if (connections.ppiToBpmn && window.ppiManager) {
        Object.entries(connections.ppiToBpmn).forEach(([ppiId, elementIds]) => {
          elementIds.forEach(elementId => {
            window.ppiManager.linkToBpmnElement(ppiId, elementId);
          });
        });
      }

      // Restaurar conexiones RASCI-BPMN
      if (connections.rasciToBpmn && connections.rasciToBpmn.tasks) {
        window.rasciTasks = connections.rasciToBpmn.tasks;
        localStorage.setItem('rasciTasks', JSON.stringify(connections.rasciToBpmn.tasks));
      }

    } catch (error) {
      console.error('Error importando conexiones:', error);
    }
  }

  importGlobalSettings(settings) {
    try {
      localStorage.setItem('globalSettings', JSON.stringify(settings));
    } catch (error) {
      console.error('Error importando configuraciones globales:', error);
    }
  }

  reloadApplication() {
    // Recargar la página para aplicar todos los cambios
    window.location.reload();
  }

  showImportSuccessMessage() {
    // Crear notificación con opciones
    const notification = document.createElement('div');
    notification.className = 'import-export-notification success';
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #10b981;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        flex-direction: column;
        gap: 12px;
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
        transition: all 0.3s ease;
        min-width: 300px;
      ">
        <div style="display: flex; align-items: center; gap: 8px;">
          <i class="fas fa-check" style="font-size: 12px;"></i>
          <span>✅ Proyecto importado correctamente</span>
        </div>
        <div style="
          display: flex;
          gap: 8px;
          justify-content: center;
          margin-top: 8px;
        ">
          <button id="continue-working-btn" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            Continuar Trabajando
          </button>
          <button id="reload-app-btn" style="
            background: rgba(255,255,255,0.2);
            border: 1px solid rgba(255,255,255,0.3);
            color: white;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            cursor: pointer;
            transition: all 0.2s ease;
          " onmouseover="this.style.background='rgba(255,255,255,0.3)'" onmouseout="this.style.background='rgba(255,255,255,0.2)'">
            Recargar Aplicación
          </button>
        </div>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
      notification.querySelector('div').style.opacity = '1';
      notification.querySelector('div').style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    // Configurar event listeners para los botones
    const continueBtn = notification.querySelector('#continue-working-btn');
    const reloadBtn = notification.querySelector('#reload-app-btn');
    
    continueBtn.addEventListener('click', () => {
      console.log('👤 Usuario eligió continuar trabajando');
      this.hideNotification(notification);
    });
    
    reloadBtn.addEventListener('click', () => {
      console.log('🔄 Usuario eligió recargar la aplicación');
      this.hideNotification(notification);
      setTimeout(() => {
        this.reloadApplication();
      }, 300);
    });
    
    // Ocultar automáticamente después de 10 segundos si no se hace clic
    setTimeout(() => {
      if (notification.parentNode) {
        this.hideNotification(notification);
      }
    }, 10000);
  }

  hideNotification(notification) {
    if (notification && notification.parentNode) {
      notification.querySelector('div').style.opacity = '0';
      notification.querySelector('div').style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }
  }

  // Función para esperar a que el modeler esté listo
  async waitForModelerReady() {
    console.log('⏳ Esperando a que el modeler esté listo...');
    
    const maxAttempts = 50; // 5 segundos máximo
    let attempts = 0;
    
    while (attempts < maxAttempts) {
      if (window.modeler && 
          window.modeler.importXML && 
          typeof window.modeler.importXML === 'function') {
        console.log('✅ Modeler está listo');
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Esperar 100ms
    }
    
    console.warn('⚠️ Timeout esperando al modeler, continuando...');
  }

  // === UTILIDADES ===

  // Función de utilidad para limpiar localStorage completamente
  clearAllProjectData() {
    console.log('🧹 Limpiando todos los datos del proyecto...');
    
    // Lista de claves que queremos preservar (preferencias del usuario)
    const keysToKeep = ['userPreferences', 'theme', 'globalSettings'];
    const keysToRemove = [];
    
    // Identificar todas las claves a eliminar
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!keysToKeep.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Eliminar las claves identificadas
    keysToRemove.forEach(key => {
      console.log(`🗑️ Eliminando: ${key}`);
      localStorage.removeItem(key);
    });
    
    // Limpiar variables globales
    if (window.rasciRoles) window.rasciRoles = [];
    if (window.rasciTasks) window.rasciTasks = [];
    if (window.rasciMatrixData) window.rasciMatrixData = {};
    
    console.log('✅ Todos los datos del proyecto limpiados');
  }

  generateFileName() {
    const now = new Date();
    const timestamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
    return `multimodeler-project-${timestamp}${this.fileExtension}`;
  }

  downloadFile(data, fileName) {
    try {
      console.log('📥 Iniciando descarga del archivo:', fileName);
      
      const jsonString = JSON.stringify(data, null, 2);
      console.log('📊 Tamaño de datos:', jsonString.length, 'caracteres');
      
      const blob = new Blob([jsonString], { type: this.mimeType });
      console.log('📦 Blob creado:', blob.size, 'bytes');
      
      const url = URL.createObjectURL(blob);
      console.log('🔗 URL creada:', url);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      
      console.log('📎 Enlace de descarga creado');
      console.log('   - href:', link.href);
      console.log('   - download:', link.download);
      
      document.body.appendChild(link);
      console.log('📎 Enlace añadido al DOM');
      
      // Simular click
      link.click();
      console.log('🖱️ Click simulado en enlace de descarga');
      
      // Limpiar
      setTimeout(() => {
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        console.log('🧹 Enlace y URL limpiados');
      }, 100);
      
      console.log('✅ Descarga iniciada correctamente');
      
    } catch (error) {
      console.error('❌ Error en downloadFile:', error);
      this.showMessage('Error al descargar el archivo: ' + error.message, 'error');
    }
  }

  showMessage(message, type = 'info') {
    // Crear notificación
    const notification = document.createElement('div');
    notification.className = `import-export-notification ${type}`;
    notification.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
        color: white;
        padding: 12px 24px;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 8px;
        opacity: 0;
        transform: translateX(-50%) translateY(-10px);
        transition: all 0.3s ease;
      ">
        <i class="fas fa-${type === 'success' ? 'check' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}" style="font-size: 12px;"></i>
        <span>${message}</span>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Mostrar notificación
    setTimeout(() => {
      notification.querySelector('div').style.opacity = '1';
      notification.querySelector('div').style.transform = 'translateX(-50%) translateY(0)';
    }, 100);
    
    // Ocultar después de 3 segundos
    setTimeout(() => {
      notification.querySelector('div').style.opacity = '0';
      notification.querySelector('div').style.transform = 'translateX(-50%) translateY(-10px)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }
}

// Exportar la clase
window.ImportExportManager = ImportExportManager; 