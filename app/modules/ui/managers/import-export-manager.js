// === Import/Export Manager ===
// Sistema completo de importación/exportación para preservar toda la información de los paneles

import { resolve } from '../../../services/global-access.js';
import { getServiceRegistry } from '../core/ServiceRegistry.js';
import { RasciStore } from '../../rasci/store.js';
import { registerDebug } from '../../../shared/debug-registry.js';
import ppinotStorageManager from './ppinot-storage-manager.js';
import ppinotCoordinationManager from './ppinot-coordination-manager.js';

// Bootstrap SR
const sr = (typeof getServiceRegistry === 'function') ? getServiceRegistry() : undefined;
const rasciAdapter = sr && sr.get ? sr.get('RASCIAdapter') : undefined;
// const validator = sr && sr.get ? sr.get('RASCIUIValidator') : undefined;
// const bpmnModeler = sr && sr.get ? sr.get('BPMNModeler') : (rasciAdapter && rasciAdapter.getBpmnModeler ? rasciAdapter.getBpmnModeler() : undefined);

class ImportExportManager {
  constructor() {
    this.version = '1.0.0';
    this.fileExtension = '.mmproject';
    this.mimeType = 'application/json';
    this.init();
  }

  init() {
    this.setupEventListeners();
    
    // FORZAR RECARGA DE LA MATRIZ RASCI EN LA UI con retry mejorado
    const attemptRasciReload = (retryCount = 0) => {
      const sr = getServiceRegistry();
      const eb = sr && sr.get('EventBus');
      if (eb) {
        
        eb.publish('rasci.state.ensureLoaded', {});
      } else if (retryCount < 10) {
        // Aumentar delay progresivamente y más intentos
        const delay = Math.min(200 * (retryCount + 1), 2000);
        setTimeout(() => attemptRasciReload(retryCount + 1), delay);
      } else {
        console.warn('⚠️ EventBus no disponible para recargar RASCI después de varios intentos - continuando sin recargar');
      }
    };
    
    // Esperar más tiempo antes del primer intento
    setTimeout(() => attemptRasciReload(), 500);
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
    
    // === PANEL RALPH ===
    projectData.panels.ralph = await this.collectRalphData();

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
      ppinotElements: [],
      ppinotRelationships: [],
      timestamp: Date.now()
    };

    try {
      // Obtener XML del diagrama
      const modeler = resolve('BpmnModeler');
      if (modeler) {
        const xmlResult = await modeler.saveXML({ format: true });
        if (xmlResult && xmlResult.xml) {
          bpmnData.diagram = xmlResult.xml;
        }
      }

      // Obtener estado del canvas
      const canvasState = localStorage.getItem('bpmnCanvasState');
      if (canvasState) {
        bpmnData.canvas = JSON.parse(canvasState);
      }

      // Obtener elementos PPINOT usando el sistema unificado
      const ppinotData = ppinotStorageManager.loadPPINOTElements();
      bpmnData.ppinotElements = ppinotData.elements;
      bpmnData.ppinotRelationships = ppinotData.relationships;
      
      console.log(`📤 Exportando elementos PPINOT: ${ppinotData.elements.length} elementos, ${ppinotData.relationships.length} relaciones`);
      const targetCount = ppinotData.elements.filter(el => el.metadata && el.metadata.isTarget).length;
      const scopeCount = ppinotData.elements.filter(el => el.metadata && el.metadata.isScope).length;
      const ppiCount = ppinotData.elements.filter(el => el.metadata && el.metadata.isPPI).length;
      console.log(`📊 Desglose: ${ppiCount} PPIs, ${targetCount} Targets, ${scopeCount} Scopes`);
      
      // También extraer desde XML como respaldo
      if (bpmnData.diagram) {
        const xmlElements = this.extractPPINOTElementsFromXML(bpmnData.diagram);
        const xmlRelationships = this.extractPPINOTRelationshipsFromXML(bpmnData.diagram);
        
        // Combinar datos si hay elementos en XML que no están en localStorage
        if (xmlElements.length > 0) {
          const existingIds = new Set(ppinotData.elements.map(el => el.id));
          const newElements = xmlElements.filter(el => !existingIds.has(el.id));
          bpmnData.ppinotElements = [...ppinotData.elements, ...newElements];
        }
        
        if (xmlRelationships.length > 0) {
          const existingRelIds = new Set(ppinotData.relationships.map(rel => `${rel.childId}-${rel.parentId}`));
          const newRelationships = xmlRelationships.filter(rel => !existingRelIds.has(`${rel.childId}-${rel.parentId}`));
          bpmnData.ppinotRelationships = [...ppinotData.relationships, ...newRelationships];
        }
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
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && ppiManager.core) {
        ppiData.indicators = ppiManager.core.getAllPPIs();
      }

      // Obtener relaciones PPI desde localStorage si existen
      const ppiRelationships = localStorage.getItem('ppiRelationships');
      if (ppiRelationships) {
        ppiData.relationships = JSON.parse(ppiRelationships);
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

  async collectRalphData() {
    const ralphData = {
      elements: [],
      relationships: {},
      settings: {},
      timestamp: Date.now()
    };

    try {
      // Intentar obtener desde un posible adaptador RALPH
      const sr = getServiceRegistry && getServiceRegistry();
      const ralphAdapter = sr && sr.get && sr.get('RALPHAdapter');
      if (ralphAdapter && typeof ralphAdapter.getElements === 'function') {
        ralphData.elements = ralphAdapter.getElements() || [];
      } else {
        // Fallback: desde localStorage si existe
        const ralphElements = localStorage.getItem('bpmnRALPHElements');
        if (ralphElements) {
          ralphData.elements = JSON.parse(ralphElements);
        }
      }

      // Configuraciones RALPH si existen
      const ralphSettings = localStorage.getItem('ralphSettings');
      if (ralphSettings) {
        ralphData.settings = JSON.parse(ralphSettings);
      }

    } catch (error) {
      console.error('Error recopilando datos RALPH:', error);
    }

    return ralphData;
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
      rasciData.roles = RasciStore.getRoles();

      // Obtener matriz de datos
      rasciData.matrix = RasciStore.getMatrix();

      // Obtener tareas
      const rasci = getServiceRegistry && getServiceRegistry().get('RASCIAdapter');
      const tasks = rasci && typeof rasci.getTasks === 'function' ? rasci.getTasks() : [];
      if (tasks.length) rasciData.tasks = tasks;

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
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && ppiManager.core) {
        const ppiElements = ppiManager.core.getAllPPIs();
        ppiElements.forEach(ppi => {
          if (ppi.linkedElements && ppi.linkedElements.length > 0) {
            connections.ppiToBpmn[ppi.id] = ppi.linkedElements;
          }
        });
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
    
    // Limpiar datos existentes
    this.clearExistingData();

    // Importar datos de paneles EN ORDEN CORRECTO
    if (projectData.panels.bpmn) {
      console.log('📊 Importando datos BPMN...');
      await this.importBpmnData(projectData.panels.bpmn);
    }

    if (projectData.panels.ralph) {
      console.log('📊 Importando datos RALPH...');
      await this.importRalphData(projectData.panels.ralph);
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

    
    // ASEGURAR RECARGA FINAL DE TODOS LOS PANELES
    setTimeout(() => {
      
      // Recargar estado RASCI con función robusta
      getServiceRegistry && getServiceRegistry().get('EventBus') && getServiceRegistry().get('EventBus').publish('rasci.matrix.ensureLoaded', {});
      
      // Forzar actualización de matriz desde diagrama
      getServiceRegistry && getServiceRegistry().get('EventBus') && getServiceRegistry().get('EventBus').publish('rasci.matrix.update.fromDiagram', {});
      
      // Aplicar configuración de paneles si está disponible
      const panelManager = resolve('PanelManagerInstance');
      if (panelManager && typeof panelManager.applyConfiguration === 'function') {
        panelManager.applyConfiguration();
      }
      
    }, 1000);
  }

  clearExistingData() {
    
    // Usar StorageManager si está disponible
    getServiceRegistry && getServiceRegistry().get('StorageManager') && getServiceRegistry().get('StorageManager').clearStorage && getServiceRegistry().get('StorageManager').clearStorage();
  }

  async importBpmnData(bpmnData) {
    try {
      // Importar diagrama XML
      const modeler = resolve('BpmnModeler');
      if (bpmnData.diagram && modeler) {
        console.log('📊 Importando diagrama XML...');
        
        // Esperar a que el modeler esté listo
        await this.waitForModelerReady();
        
        // Importar el XML
        await modeler.importXML(bpmnData.diagram);
        
      }

      // Restaurar estado del canvas
      if (bpmnData.canvas) {
        localStorage.setItem('bpmnCanvasState', JSON.stringify(bpmnData.canvas));
        
      }

      // Restaurar elementos PPINOT si están disponibles
      if (bpmnData.ppinotElements && bpmnData.ppinotElements.length > 0) {
        
        // Buscar elementos Target y Scope usando múltiples criterios
        const targetElements = bpmnData.ppinotElements.filter(el => {
          if (el.metadata && el.metadata.isTarget) return true;
          if (el.type && el.type.includes('Target')) return true;
          if (el.id && el.id.includes('Target')) return true;
          if (el.businessObject && el.businessObject.$type && el.businessObject.$type.includes('Target')) return true;
          if (el.businessObject && el.businessObject.name && el.businessObject.name.toLowerCase().includes('target')) return true;
          return false;
        });
        
        const scopeElements = bpmnData.ppinotElements.filter(el => {
          if (el.metadata && el.metadata.isScope) return true;
          if (el.type && el.type.includes('Scope')) return true;
          if (el.id && el.id.includes('Scope')) return true;
          if (el.businessObject && el.businessObject.$type && el.businessObject.$type.includes('Scope')) return true;
          if (el.businessObject && el.businessObject.name && el.businessObject.name.toLowerCase().includes('scope')) return true;
          return false;
        });
        
        if (targetElements.length > 0) {
          console.log(`🎯 ${targetElements.length} elementos Target encontrados:`, targetElements.map(el => el.id));
        }
        
        if (scopeElements.length > 0) {
          console.log(`🎯 ${scopeElements.length} elementos Scope encontrados:`, scopeElements.map(el => el.id));
        }
        
        // Guardar elementos PPINOT usando el sistema unificado
        ppinotStorageManager.savePPINOTElements(bpmnData.ppinotElements, bpmnData.ppinotRelationships || []);
        
      }

      // Restaurar relaciones PPINOT si están disponibles
      if (bpmnData.ppinotRelationships && bpmnData.ppinotRelationships.length > 0) {
        
        // Guardar relaciones PPINOT en localStorage para restauración posterior
        localStorage.setItem('ppinotRelationships', JSON.stringify(bpmnData.ppinotRelationships));
        
      }

      // Usar el sistema de coordinación unificado para restauración PPINOT
      
      ppinotCoordinationManager.triggerRestoration('import.completed');

      // Restaurar elementos RALPH
      if (bpmnData.elements && bpmnData.elements.ralph) {
        localStorage.setItem('bpmnRALPHElements', JSON.stringify(bpmnData.elements.ralph));
        
      }

      // Restaurar relaciones
      if (bpmnData.relationships) {
        if (bpmnData.relationships.parentChild) {
          localStorage.setItem('bpmnParentChildRelations', JSON.stringify(bpmnData.relationships.parentChild));
          
        }
        // PPI localStorage deshabilitado - relaciones PPINOT no se guardan en localStorage
        if (bpmnData.relationships.ppinot) {
          
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
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiData.indicators && ppiManager && ppiManager.core) {
        ppiData.indicators.forEach(ppi => {
          ppiManager.core.addPPI(ppi);
        });
        
      }

      // Restaurar relaciones
      if (ppiData.relationships) {
        localStorage.setItem('ppiRelationships', JSON.stringify(ppiData.relationships));
        
      }

      // Restaurar configuraciones
      if (ppiData.settings) {
        localStorage.setItem('ppiSettings', JSON.stringify(ppiData.settings));
        
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
        RasciStore.setRoles(rasciData.roles);
        
      }

      // Restaurar matriz
      if (rasciData.matrix) {
        RasciStore.setMatrix(rasciData.matrix);
        
      }

      // Restaurar tareas
      const rasci = getServiceRegistry && getServiceRegistry().get('RASCIAdapter');
      const tasks = rasci && typeof rasci.getTasks === 'function' ? rasci.getTasks() : [];
      if (tasks.length) {
        // Use service registry instead of window
        const sr = getServiceRegistry();
        if (sr && sr.get('RASCIAdapter')) {
          sr.get('RASCIAdapter').setTasks(tasks);
        }
        
      }

      // Restaurar configuraciones
      if (rasciData.settings) {
        
      }

      // OPTIMIZACIÓN: Reducir intentos de recarga RASCI para evitar spam
      const attemptRasciReload = (retryCount = 0) => {
        const sr = getServiceRegistry();
        const eb = sr && sr.get('EventBus');
        if (eb) {
          
          eb.publish('rasci.state.ensureLoaded', {});
        } else if (retryCount < 2) { // Reducido a 2 intentos
          const delay = 1000; // Delay más largo de 1 segundo
          setTimeout(() => attemptRasciReload(retryCount + 1), delay);
        } else {
          // Solo mostrar warning si realmente es necesario
          if (retryCount === 2) {
            
          }
        }
      };
      
      // Esperar antes del primer intento
      setTimeout(() => attemptRasciReload(), 1000);

    } catch (error) {
      console.error('❌ Error importando datos RASCI:', error);
      throw error;
    }
  }

  async importRalphData(ralphData) {
    try {
      console.log('📊 Importando datos RALPH...');

      if (ralphData.elements) {
        // Guardar elementos RALPH para que el módulo los cargue
        localStorage.setItem('bpmnRALPHElements', JSON.stringify(ralphData.elements));
        
      }

      if (ralphData.settings) {
        localStorage.setItem('ralphSettings', JSON.stringify(ralphData.settings));
        
      }

      // Señal al EventBus para asegurar carga del estado RALPH
      const sr = getServiceRegistry && getServiceRegistry();
      const eb = sr && sr.get && sr.get('EventBus');
      if (eb) {
        eb.publish('ralph.state.ensureLoaded', {});
      }

    } catch (error) {
      console.error('❌ Error importando datos RALPH:', error);
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
      const ppiManager = resolve('PPIManagerInstance');
      if (connections.ppiToBpmn && ppiManager) {
        Object.entries(connections.ppiToBpmn).forEach(([ppiId, elementIds]) => {
          elementIds.forEach(elementId => {
            ppiManager.linkToBpmnElement(ppiId, elementId);
          });
        });
      }

      // Restaurar conexiones RASCI-BPMN
      if (connections.rasciToBpmn && connections.rasciToBpmn.tasks) {
        rasciAdapter && rasciAdapter.setTasks ? rasciAdapter.setTasks(connections.rasciToBpmn.tasks) : console.warn('⚠️ RASCIAdapter no disponible para restaurar tareas');
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
    getServiceRegistry && getServiceRegistry().get('EventBus') && getServiceRegistry().get('EventBus').publish('app.reload.requested', {});
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
      const modeler = resolve('BpmnModeler');
      if (modeler && 
          modeler.importXML && 
          typeof modeler.importXML === 'function') {
        
        return;
      }
      
      attempts++;
      await new Promise(resolve => setTimeout(resolve, 100)); // Esperar 100ms
    }
    
    console.warn('⚠️ Timeout esperando al modeler, continuando...');
  }

  // === MÉTODOS DE EXTRACCIÓN PPINOT ===

  extractPPINOTElementsFromXML(xmlString) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const ppinotElements = [];

      // Buscar elementos PPINOT en el XML (incluyendo Target y Scope)
      const ppinotNodes = xmlDoc.querySelectorAll('[ppinot\\:measureType], [ppinot\\:baseMeasure], [ppinot\\:derivedMeasure], [ppinot\\:aggregatedMeasure], [ppinot\\:target], [ppinot\\:scope], PPINOT\\:ppi, PPINOT\\:target, PPINOT\\:scope');

      
      ppinotNodes.forEach(node => {
        const element = {
          id: node.getAttribute('id'),
          type: node.tagName,
          name: node.getAttribute('name') || '',
          measureType: node.getAttribute('ppinot:measureType') || '',
          target: node.getAttribute('ppinot:target') || '',
          scope: node.getAttribute('ppinot:scope') || '',
          businessObject: {
            name: node.getAttribute('name') || '',
            $type: node.tagName
          }
        };
        ppinotElements.push(element);
        console.log(`  📝 Elemento PPINOT: ${element.name} (${element.type}) - ID: ${element.id}`);
      });

      // Buscar elementos Target y Scope que pueden estar como elementos separados
      const targetNodes = xmlDoc.querySelectorAll('[id*="Target"], [id*="Scope"]');
      
      targetNodes.forEach(node => {
        const element = {
          id: node.getAttribute('id'),
          type: node.tagName,
          name: node.getAttribute('name') || node.getAttribute('id'),
          measureType: '',
          target: node.tagName.includes('Target') || node.getAttribute('id').includes('Target') ? 'true' : '',
          scope: node.tagName.includes('Scope') || node.getAttribute('id').includes('Scope') ? 'true' : '',
          businessObject: {
            name: node.getAttribute('name') || node.getAttribute('id'),
            $type: node.tagName
          }
        };
        ppinotElements.push(element);
        console.log(`  🎯 Elemento Target/Scope: ${element.name} (${element.type}) - ID: ${element.id}`);
      });

      // Buscar elementos BPMNShape que contengan Target o Scope en su ID
      const bpmnShapes = xmlDoc.querySelectorAll('bpmndi\\:BPMNShape[id*="Target"], bpmndi\\:BPMNShape[id*="Scope"]');
      console.log(`🎨 Encontrados ${bpmnShapes.length} BPMNShape con Target/Scope`);

      bpmnShapes.forEach(shape => {
        const element = {
          id: shape.getAttribute('id'),
          type: 'bpmndi:BPMNShape',
          name: shape.getAttribute('id') || '',
          measureType: '',
          target: shape.getAttribute('id').includes('Target') ? 'true' : '',
          scope: shape.getAttribute('id').includes('Scope') ? 'true' : '',
          businessObject: {
            name: shape.getAttribute('id') || '',
            $type: 'bpmndi:BPMNShape'
          }
        };
        ppinotElements.push(element);
        console.log(`  🎨 BPMNShape Target/Scope: ${element.name} - ID: ${element.id}`);
      });

      
      return ppinotElements;
    } catch (error) {
      console.error('Error extrayendo elementos PPINOT del XML:', error);
      return [];
    }
  }

  extractPPINOTRelationshipsFromXML(xmlString) {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, 'text/xml');
      const relationships = [];

      // Buscar el elemento PPI principal primero
      const ppiElement = xmlDoc.querySelector('PPINOT\\:ppi');
      const ppiId = ppiElement ? ppiElement.getAttribute('id') : null;
      
      
      // Buscar elementos PPINOT específicos
      const ppinotElements = xmlDoc.querySelectorAll('[ppinot\\:measureType], [ppinot\\:baseMeasure], [ppinot\\:derivedMeasure], [ppinot\\:aggregatedMeasure], [ppinot\\:target], [ppinot\\:scope], PPINOT\\:ppi, PPINOT\\:target, PPINOT\\:scope');
      
      
      ppinotElements.forEach(element => {
        const elementId = element.getAttribute('id');
        const elementType = element.tagName;
        const elementName = element.getAttribute('name') || '';
        
        // Si es el elemento PPI principal, no necesita relación padre
        if (elementType === 'PPINOT:ppi') {
          return;
        }
        
        // Buscar el elemento padre en el BPMN
        let parent = element.parentElement;
        while (parent && !parent.hasAttribute('id')) {
          parent = parent.parentElement;
        }
        
        if (parent && parent.hasAttribute('id')) {
          const relationship = {
            childId: elementId,
            parentId: parent.getAttribute('id'),
            childType: elementType,
            parentType: parent.tagName,
            childName: elementName,
            parentName: parent.getAttribute('name') || '',
            timestamp: Date.now()
          };
          relationships.push(relationship);
          console.log(`🔗 Relación PPINOT encontrada: ${elementName} (${elementType}) -> ${parent.getAttribute('name') || parent.getAttribute('id')} (${parent.tagName})`);
        }
      });

      // Buscar elementos Target y Scope específicos y asociarlos con el PPI principal
      const targetScopeElements = xmlDoc.querySelectorAll('[id*="Target"], [id*="Scope"]');
      
      targetScopeElements.forEach(element => {
        const elementId = element.getAttribute('id');
        const elementType = element.tagName;
        const elementName = element.getAttribute('name') || elementId;
        
        // Si hay un PPI principal, asociar Target y Scope con él
        if (ppiId) {
          const relationship = {
            childId: elementId,
            parentId: ppiId,
            childType: elementType,
            parentType: 'PPINOT:ppi',
            childName: elementName,
            parentName: ppiElement.getAttribute('name') || ppiId,
            timestamp: Date.now()
          };
          relationships.push(relationship);
          console.log(`🎯 Relación Target/Scope -> PPI: ${elementName} (${elementType}) -> ${ppiId} (PPINOT:ppi)`);
        } else {
          // Si no hay PPI principal, buscar el padre en el BPMN
          let parent = element.parentElement;
          while (parent && !parent.hasAttribute('id')) {
            parent = parent.parentElement;
          }
          
          if (parent && parent.hasAttribute('id')) {
            const relationship = {
              childId: elementId,
              parentId: parent.getAttribute('id'),
              childType: elementType,
              parentType: parent.tagName,
              childName: elementName,
              parentName: parent.getAttribute('name') || '',
              timestamp: Date.now()
            };
            relationships.push(relationship);
            console.log(`🎯 Relación Target/Scope encontrada: ${elementName} (${elementType}) -> ${parent.getAttribute('name') || parent.getAttribute('id')} (${parent.tagName})`);
          }
        }
      });

      
      return relationships;
    } catch (error) {
      console.error('Error extrayendo relaciones PPINOT del XML:', error);
      return [];
    }
  }

  // === RESTAURACIÓN POST-CARGA ===

  async restorePPINOTElementsAfterLoad() {
    try {
      
      // Obtener el modeler del ServiceRegistry
      const sr = getServiceRegistry();
      
      let modeler = sr && sr.get ? sr.get('BPMNModeler') : null;
      
      // Si no está en ServiceRegistry, intentar obtenerlo de otras formas
      if (!modeler) {
        
        // Intentar desde el panel manager
        const panelManager = sr && sr.get ? sr.get('PanelManager') : null;
        if (panelManager && panelManager.getBpmnModeler) {
          modeler = panelManager.getBpmnModeler();
          
        }
        
        // Intentar desde el modeler manager
        const modelerManager = sr && sr.get ? sr.get('ModelerManager') : null;
        if (modelerManager && modelerManager.getModeler) {
          modeler = modelerManager.getModeler();
          
        }
        
        // Intentar desde el DOM
        if (!modeler) {
          const canvasElement = document.querySelector('.bjs-container');
          if (canvasElement && canvasElement.__modeler) {
            modeler = canvasElement.__modeler;
            
          }
        }
        
        // Intentar desde window global
        if (!modeler && window.bpmnModeler) {
          modeler = window.bpmnModeler;
          
        }
        
        // Intentar desde globalThis (comentado por problemas de linting)
        // try {
        //   if (!modeler && typeof globalThis !== 'undefined' && globalThis && globalThis.bpmnModeler) {
        //     modeler = globalThis.bpmnModeler;
        //     
        //   }
        // } catch (e) {
        //   // globalThis no está disponible
        // }
        
        // Buscar en todos los elementos del DOM que puedan tener un modeler
        if (!modeler) {
          const allElements = document.querySelectorAll('*');
          for (const element of allElements) {
            if (element.__modeler || element.modeler) {
              modeler = element.__modeler || element.modeler;
              
              break;
            }
          }
        }
      }
      
      
      
      if (!modeler) {
        console.log('⚠️ Modeler no disponible para restauración PPINOT');
        console.log('🔍 Servicios disponibles en ServiceRegistry:', sr ? Object.keys(sr._services || {}) : 'N/A');
        return;
      }

      // Obtener elementos PPINOT guardados
      const ppinotElementsData = localStorage.getItem('ppinotElements');
      
      if (!ppinotElementsData) {
        
        console.log('🔍 Claves en localStorage:', Object.keys(localStorage));
        return;
      }

      const ppinotElements = JSON.parse(ppinotElementsData);
      
      
      // Obtener relaciones PPINOT guardadas
      const ppinotRelationshipsData = localStorage.getItem('ppinotRelationships');
      const ppinotRelationships = ppinotRelationshipsData ? JSON.parse(ppinotRelationshipsData) : [];
      console.log(`🔗 Restaurando ${ppinotRelationships.length} relaciones PPINOT...`);

      // Buscar elementos Target y Scope específicamente
      const targetElements = ppinotElements.filter(el => el.id && el.id.includes('Target'));
      const scopeElements = ppinotElements.filter(el => el.id && el.id.includes('Scope'));
      
      
      
      // Restaurar elementos Target y Scope visualmente
      await this.restoreTargetAndScopeElements(modeler, targetElements, scopeElements);

      // Restaurar relaciones padre-hijo
      if (ppinotRelationships.length > 0) {
        console.log('🔗 Relaciones PPINOT a restaurar:');
        ppinotRelationships.forEach(rel => {
          console.log(`  - ${rel.childName} (${rel.childType}) -> ${rel.parentName} (${rel.parentType})`);
        });
        
        // Restaurar las relaciones visualmente
        await this.restorePPINOTRelationships(modeler, ppinotRelationships);
      }

      // Limpiar datos temporales
      localStorage.removeItem('ppinotElements');
      localStorage.removeItem('ppinotRelationships');
      
      
    } catch (error) {
      console.error('❌ Error restaurando elementos PPINOT después de la carga:', error);
    }
  }

  async restoreTargetAndScopeElements(modeler, targetElements, scopeElements) {
    try {
      
      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      const elementRegistry = modeler.get('elementRegistry');
      
      if (!elementFactory || !modeling || !canvas) {
        console.log('⚠️ Servicios del modeler no disponibles');
        return;
      }

      // Obtener el elemento raíz del canvas
      const rootElement = canvas.getRootElement();
      
      // Buscar el elemento PPI principal para posicionar Target y Scope cerca de él
      const ppiElement = elementRegistry.filter(element => 
        element.businessObject && element.businessObject.$type === 'PPINOT:ppi'
      )[0];
      
      let basePosition = { x: 100, y: 100 };
      if (ppiElement) {
        const ppiBounds = ppiElement.bounds;
        basePosition = {
          x: ppiBounds.x + ppiBounds.width + 20,
          y: ppiBounds.y + 50
        };
        
      }
      
      // Restaurar elementos Target
      for (const targetData of targetElements) {
        try {
          console.log(`🎯 Restaurando Target: ${targetData.name} (${targetData.id})`);
          
          // Verificar si el elemento ya existe en el canvas
          const existingElement = elementRegistry.get(targetData.id);
          if (existingElement) {
            
            continue;
          }
          
          // Crear el elemento usando elementFactory.create (no createShape)
          const targetElement = elementFactory.create('shape', {
            id: targetData.id,
            type: 'PPINOT:Target',
            width: 25,
            height: 25
          });
          
          // Configurar el business object
          if (targetElement.businessObject) {
            // $type gestionado por moddle según type
            targetElement.businessObject.id = targetData.id;
            targetElement.businessObject.name = targetData.name || 'Target';
          }
          
          // Marcar que necesita label externo
          targetElement._hasExternalLabel = true;
          
          // Posicionar el elemento cerca del PPI
          const position = { 
            x: basePosition.x, 
            y: basePosition.y + (targetElements.indexOf(targetData) * 60) 
          };
          
          // Crear el elemento en el canvas
          const createdTarget = modeling.createShape(targetElement, position, rootElement);
          
          // Crear el label externo
          const labelShape = elementFactory.createLabel({
            businessObject: createdTarget.businessObject,
            type: 'label',
            labelTarget: createdTarget,
            width: 50,
            height: 20
          });
          
          const labelPosition = {
            x: position.x + 30, // A la derecha del Target
            y: position.y
          };
          
          const createdLabel = modeling.createShape(labelShape, labelPosition, rootElement);
          createdTarget.label = createdLabel;
          createdLabel.labelTarget = createdTarget;
          
          
        } catch (error) {
          console.error(`❌ Error creando Target ${targetData.id}:`, error);
        }
      }
      
      // Restaurar elementos Scope
      for (const scopeData of scopeElements) {
        try {
          console.log(`🎯 Restaurando Scope: ${scopeData.name} (${scopeData.id})`);
          
          // Verificar si el elemento ya existe en el canvas
          const existingElement = elementRegistry.get(scopeData.id);
          if (existingElement) {
            
            continue;
          }
          
          // Crear el elemento usando elementFactory.create (no createShape)
          const scopeElement = elementFactory.create('shape', {
            id: scopeData.id,
            type: 'PPINOT:Scope',
            width: 28,
            height: 28
          });
          
          // Configurar el business object
          if (scopeElement.businessObject) {
            // $type gestionado por moddle según type
            scopeElement.businessObject.id = scopeData.id;
            scopeElement.businessObject.name = scopeData.name || 'Scope';
          }
          
          // Marcar que necesita label externo
          scopeElement._hasExternalLabel = true;
          
          // Posicionar el elemento cerca del PPI
          const position = { 
            x: basePosition.x + 100, 
            y: basePosition.y + (scopeElements.indexOf(scopeData) * 60) 
          };
          
          // Crear el elemento en el canvas
          const createdScope = modeling.createShape(scopeElement, position, rootElement);
          
          // Crear el label externo
          const labelShape = elementFactory.createLabel({
            businessObject: createdScope.businessObject,
            type: 'label',
            labelTarget: createdScope,
            width: 50,
            height: 20
          });
          
          const labelPosition = {
            x: position.x - 30, // A la izquierda del Scope
            y: position.y
          };
          
          const createdLabel = modeling.createShape(labelShape, labelPosition, rootElement);
          createdScope.label = createdLabel;
          createdLabel.labelTarget = createdScope;
          
          
        } catch (error) {
          console.error(`❌ Error creando Scope ${scopeData.id}:`, error);
        }
      }
      
      
    } catch (error) {
      console.error('❌ Error en restauración visual de Target y Scope:', error);
    }
  }

  async restorePPINOTRelationships(modeler, relationships) {
    try {
      console.log('🔗 Iniciando restauración de relaciones PPINOT...');
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        console.log('⚠️ Servicios del modeler no disponibles para relaciones');
        return;
      }

      for (const relationship of relationships) {
        try {
          console.log(`🔗 Restaurando relación: ${relationship.childName} -> ${relationship.parentName}`);
          
          // Buscar los elementos en el canvas
          const childElement = elementRegistry.get(relationship.childId);
          const parentElement = elementRegistry.get(relationship.parentId);
          
          if (!childElement) {
            console.log(`⚠️ Elemento hijo no encontrado: ${relationship.childId}`);
            continue;
          }
          
          if (!parentElement) {
            console.log(`⚠️ Elemento padre no encontrado: ${relationship.parentId}`);
            continue;
          }
          
          // Para elementos PPINOT, establecer la relación padre-hijo en el business object
          if (relationship.childType.includes('PPINOT') || relationship.parentType.includes('PPINOT')) {
            // Establecer la relación en el business object del elemento hijo
            if (childElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
              
              // Si el padre es un PPI, agregar el hijo a su lista de children
              if (parentElement.businessObject && parentElement.businessObject.$type === 'PPINOT:Ppi') {
                if (!parentElement.businessObject.children) {
                  parentElement.businessObject.children = [];
                }
                if (!parentElement.businessObject.children.includes(childElement.businessObject)) {
                  parentElement.businessObject.children.push(childElement.businessObject);
                }
              }
            }
            // Asegurar que el shape hijo esté bajo el shape padre en el canvas
            try {
              if (childElement.parent !== parentElement) {
                // Reparent sin mover posición
                const delta = { x: 0, y: 0 };
                if (typeof modeling.moveElements === 'function') {
                  modeling.moveElements([childElement], delta, parentElement);
                } else if (typeof modeling.moveShape === 'function') {
                  modeling.moveShape(childElement, delta, parentElement);
                }
              }
            } catch (reparentError) {
              console.warn('⚠️ No se pudo reparentar visualmente el elemento:', reparentError);
            }
            
            
          } else {
            // Para otros elementos, crear conexión visual
            modeling.connect(childElement, parentElement, {
              type: 'bpmn:Association'
            });
            
            
          }
          
        } catch (error) {
          console.error(`❌ Error creando relación ${relationship.childId} -> ${relationship.parentId}:`, error);
        }
      }
      
      
    } catch (error) {
      console.error('❌ Error en restauración de relaciones PPINOT:', error);
    }
  }

  // === FUNCIONES DE ESPERA Y RESTAURACIÓN ===

  async waitForModelerAndRestore() {
    console.log('⏳ Esperando a que el modeler esté disponible...');
    
    let attempts = 0;
    const maxAttempts = 50; // 25 segundos máximo
    
    const checkModeler = () => {
      attempts++;
      
      // Buscar el modeler de todas las formas posibles
      let modeler = null;
      
      // 1. ServiceRegistry
      const sr = getServiceRegistry();
      if (sr) {
        modeler = sr.get('BPMNModeler');
        if (modeler) {
          
          this.restorePPINOTElementsWithModeler(modeler);
          return;
        }
      }
      
      // 2. Buscar en el DOM
      const canvasElement = document.querySelector('.bjs-container');
      if (canvasElement) {
        // Buscar en las propiedades del elemento
        for (const prop in canvasElement) {
          if (prop.includes('modeler') || prop.includes('Modeler')) {
            const potentialModeler = canvasElement[prop];
            if (potentialModeler && typeof potentialModeler.get === 'function') {
              
              this.restorePPINOTElementsWithModeler(potentialModeler);
              return;
            }
          }
        }
      }
      
      // 3. Buscar en window
      if (window.bpmnModeler && typeof window.bpmnModeler.get === 'function') {
        
        this.restorePPINOTElementsWithModeler(window.bpmnModeler);
        return;
      }
      
      // 4. Buscar en globalThis (comentado por problemas de linting)
      // try {
      //   if (typeof globalThis !== 'undefined' && globalThis && globalThis.bpmnModeler && typeof globalThis.bpmnModeler.get === 'function') {
      //     
      //     this.restorePPINOTElementsWithModeler(globalThis.bpmnModeler);
      //     return;
      //   }
      // } catch (e) {
      //   // globalThis no está disponible
      // }
      
      // 5. Buscar en todos los elementos del DOM
      const allElements = document.querySelectorAll('*');
      for (const element of allElements) {
        for (const prop in element) {
          if (prop.includes('modeler') || prop.includes('Modeler')) {
            const potentialModeler = element[prop];
            if (potentialModeler && typeof potentialModeler.get === 'function') {
              
              this.restorePPINOTElementsWithModeler(potentialModeler);
              return;
            }
          }
        }
      }
      
      if (attempts < maxAttempts) {
        setTimeout(checkModeler, 500); // Reintentar cada 500ms
      } else {
        
      }
    };
    
    checkModeler();
  }

  setupModelerReadyListener() {
    console.log('🎧 Configurando listener para modeler listo...');
    
    // Escuchar eventos de modeler listo
    document.addEventListener('modelerReady', (event) => {
      console.log('🎉 Evento modelerReady recibido!', event.detail);
      if (event.detail && event.detail.modeler) {
        this.restorePPINOTElementsWithModeler(event.detail.modeler);
      }
    });
    
    // Escuchar eventos de canvas listo
    document.addEventListener('canvasReady', (event) => {
      console.log('🎉 Evento canvasReady recibido!', event.detail);
      if (event.detail && event.detail.modeler) {
        this.restorePPINOTElementsWithModeler(event.detail.modeler);
      }
    });
    
    // Escuchar eventos de BPMN listo
    document.addEventListener('bpmnReady', (event) => {
      console.log('🎉 Evento bpmnReady recibido!', event.detail);
      if (event.detail && event.detail.modeler) {
        this.restorePPINOTElementsWithModeler(event.detail.modeler);
      }
    });
    
    // Escuchar cambios en el DOM que indiquen que el modeler está listo
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.ELEMENT_NODE) {
              // Buscar elementos que indiquen que el modeler está listo
              if (node.classList && (node.classList.contains('bjs-container') || node.classList.contains('djs-container'))) {
                console.log('🎉 Canvas detectado en DOM, buscando modeler...');
                setTimeout(() => {
                  this.waitForModelerAndRestore();
                }, 1000);
              }
            }
          });
        }
      });
    });
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    
  }

  async restorePPINOTElementsWithModeler() {
    // Desactivado: la coordinación/auto-save gestionan la restauración
    return;
  }

  async restorePPINOTElementsLegacy() {
    // Deshabilitado: evitar duplicación y re-creación intermitente
    return;
  }

  // === FUNCIONES DE PRUEBA ===

  async createTestTargetAndScope() {
    try {
      console.log('🧪 Iniciando creación de elementos de prueba Target y Scope...');
      
      // Obtener el modeler del ServiceRegistry
      const sr = getServiceRegistry();
      let modeler = sr && sr.get ? sr.get('BPMNModeler') : null;
      
      // Si no está en ServiceRegistry, intentar obtenerlo de otras formas
      if (!modeler) {
        
        // Intentar desde el panel manager
        const panelManager = sr && sr.get ? sr.get('PanelManager') : null;
        if (panelManager && panelManager.getBpmnModeler) {
          modeler = panelManager.getBpmnModeler();
        }
        
        // Intentar desde el modeler manager
        const modelerManager = sr && sr.get ? sr.get('ModelerManager') : null;
        if (modelerManager && modelerManager.getModeler) {
          modeler = modelerManager.getModeler();
        }
        
        // Intentar desde el DOM
        if (!modeler) {
          const canvasElement = document.querySelector('.bjs-container');
          if (canvasElement && canvasElement.__modeler) {
            modeler = canvasElement.__modeler;
          }
        }
      }
      
      if (!modeler) {
        console.log('⚠️ Modeler no disponible para prueba');
        return;
      }

      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      
      if (!elementFactory || !modeling || !canvas) {
        console.log('⚠️ Servicios del modeler no disponibles para prueba');
        return;
      }

      const rootElement = canvas.getRootElement();
      
      // Crear Target de prueba
      try {
        
        const targetElement = elementFactory.createShape({
          type: 'PPINOT:Target',
          businessObject: {
            $type: 'PPINOT:Target',
            id: 'test-target-' + Date.now(),
            name: 'Test Target'
          }
        });
        
        const createdTarget = modeling.createShape(targetElement, { x: 300, y: 200 }, rootElement);
        
      } catch (error) {
        console.error('❌ Error creando Target de prueba:', error);
      }

      // Crear Scope de prueba
      try {
        
        const scopeElement = elementFactory.createShape({
          type: 'PPINOT:Scope',
          businessObject: {
            $type: 'PPINOT:Scope',
            id: 'test-scope-' + Date.now(),
            name: 'Test Scope'
          }
        });
        
        const createdScope = modeling.createShape(scopeElement, { x: 400, y: 200 }, rootElement);
        
      } catch (error) {
        console.error('❌ Error creando Scope de prueba:', error);
      }

      
    } catch (error) {
      console.error('❌ Error en creación de elementos de prueba:', error);
    }
  }

  // === UTILIDADES ===

  // Función de utilidad para limpiar localStorage completamente
  clearAllProjectData() {
    
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
    RasciStore.setRoles([]);
    RasciStore.setMatrix({});
    
    
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
        
      }, 100);
      
      
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

// Register in service registry instead of window
const sr2 = getServiceRegistry();
if (sr2) {
  const importExportManager = new ImportExportManager();
  sr2.register('ImportExportManager', importExportManager, { description: 'Import/Export manager' });
}

// Expose in debug for development
registerDebug('ImportExportManager', ImportExportManager);