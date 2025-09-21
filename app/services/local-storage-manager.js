/**
 * LocalStorageManager - Nuevo sistema de localStorage basado en el patrón Import/Export
 * 
 * Este manager reemplaza el sistema de autosave con un enfoque similar al ImportExportManager,
 * proporcionando métodos save/load que capturan y restauran el estado completo del proyecto.
 */

import { resolve } from './global-access.js';
import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';
import { RasciStore } from '../modules/rasci/store.js';

export class LocalStorageManager {
  constructor(options = {}) {
    this.config = {
      storageKey: 'multinotation_project_data',
      version: '2.0.0',
      maxDistance: 400,
      maxWaitAttempts: 50,
      checkInterval: 500,
      ...options
    };
    
    this.isSaving = false;
    this.isLoading = false;
    this.eventBus = null;
    
    this.init();
  }

  init() {
    this.setupEventBus();
    this.registerService();
  }

  setupEventBus() {
    const registry = getServiceRegistry();
    if (registry) {
      this.eventBus = registry.get('EventBus');
    }
  }

  registerService() {
    const registry = getServiceRegistry();
    if (registry) {
      registry.register('LocalStorageManager', this);
      console.log('✅ LocalStorageManager registrado');
    }
  }

  // ==================== MÉTODOS PRINCIPALES ====================

  /**
   * Guarda el estado completo del proyecto en localStorage
   */
  async saveProject() {
    if (this.isSaving) {
      console.log('⚠️ Ya hay una operación de guardado en progreso');
      return { success: false, reason: 'Already saving' };
    }

    try {
      this.isSaving = true;
      console.log('💾 Iniciando guardado del proyecto...');

      const projectData = await this.captureCompleteProject();
      const success = await this.saveToLocalStorage(projectData);

      if (success) {
      console.log('✅ Proyecto guardado exitosamente en localStorage');
      this.notifySaveSuccess(projectData);
      
      return { success: true, data: projectData };
      } else {
        throw new Error('Error al guardar en localStorage');
      }

    } catch (error) {
      console.error('❌ Error guardando proyecto:', error);
      this.notifySaveError(error);
      return { success: false, error: error.message };
    } finally {
      this.isSaving = false;
    }
  }

  /**
   * Carga el estado completo del proyecto desde localStorage
   */
  async loadProject() {
    if (this.isLoading) {
      console.log('⚠️ Ya hay una operación de carga en progreso');
      return { success: false, reason: 'Already loading' };
    }

    try {
      this.isLoading = true;
      console.log('📂 Iniciando carga del proyecto...');

      const projectData = await this.loadFromLocalStorage();
      
      if (!projectData) {
        console.log('ℹ️ No hay datos guardados en localStorage');
        return { success: false, reason: 'No saved data' };
      }

      const success = await this.restoreCompleteProject(projectData);

      if (success) {
        console.log('✅ Proyecto cargado exitosamente desde localStorage');
        this.notifyLoadSuccess(projectData);
        return { success: true, data: projectData };
      } else {
        throw new Error('Error al restaurar el proyecto');
      }

    } catch (error) {
      console.error('❌ Error cargando proyecto:', error);
      this.notifyLoadError(error);
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
    }
  }

  /**
   * Verifica si hay datos guardados en localStorage
   */
  hasSavedData() {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      return data !== null && data !== undefined;
    } catch (error) {
      console.warn('Error verificando datos guardados:', error);
      return false;
    }
  }

  /**
   * Elimina los datos guardados del localStorage
   */
  clearSavedData() {
    try {
      localStorage.removeItem(this.config.storageKey);
      console.log('🗑️ Datos del proyecto eliminados del localStorage');
      
      // Notificar que se eliminaron los datos
      this.notifyClearSuccess();
      
      return true;
    } catch (error) {
      console.error('Error eliminando datos:', error);
      return false;
    }
  }

  // ==================== CAPTURA DE DATOS ====================

  /**
   * Captura el estado completo del proyecto (similar a ImportExportManager.captureProjectData)
   */
  async captureCompleteProject() {
    const projectData = {
      version: this.config.version,
      saveDate: new Date().toISOString(),
      bpmn: await this.captureBpmnData(),
      ppi: await this.capturePPIData(),
      rasci: await this.captureRasciData(),
      ralph: await this.captureRalphData(),
      metadata: await this.captureMetadata()
    };

    console.log('📊 Datos del proyecto capturados:', {
      bpmn: projectData.bpmn ? 'XML capturado' : 'No disponible',
      ppi: projectData.ppi?.indicators?.length || 0,
      rasci: `${projectData.rasci?.roles?.length || 0} roles, ${Object.keys(projectData.rasci?.matrix || {}).length} tareas`,
      ralph: projectData.ralph?.elements?.length || 0,
      metadata: projectData.metadata ? 'Capturado' : 'No disponible'
    });

    return projectData;
  }

  async captureBpmnData() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.warn('⚠️ Modeler no disponible para capturar BPMN');
      return null;
    }

    try {
      const result = await modeler.saveXML({ format: true });
      console.log('✅ BPMN XML capturado');
      
      // Crear estructura de datos igual que ImportExportManager
      const bpmnData = {
        diagram: result.xml,
        relationships: []
      };
      
      // Capturar relaciones padre-hijo igual que ImportExportManager
      try {
        const { RelationshipCapture } = await import('../modules/ui/managers/import-export/RelationshipCapture.js');
        const relationshipCapture = new RelationshipCapture(this.config);
        
        // Capturar relaciones padre-hijo
        bpmnData.relationships = relationshipCapture.captureParentChildRelationships(modeler);
        console.log(`✅ ${bpmnData.relationships.length} relaciones padre-hijo capturadas`);
        
      } catch (error) {
        console.warn('Error capturando relaciones:', error);
        // Continuar sin relaciones si hay error
      }
      
      return bpmnData;
      
    } catch (error) {
      console.warn('Error capturando BPMN:', error);
      return null;
    }
  }

  async capturePPIData() {
    try {
      const ppiManager = resolve('PPIManagerInstance');
      const indicators = ppiManager?.core?.getAllPPIs ? ppiManager.core.getAllPPIs() : [];
      
      console.log(`✅ ${indicators.length} PPIs capturados`);
      
      return {
        indicators,
        captureDate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Error capturando PPIs:', error);
      return { indicators: [], captureDate: new Date().toISOString() };
    }
  }

  async captureRasciData() {
    try {
      const data = {
        roles: RasciStore.getRoles() || [],
        matrix: RasciStore.getMatrix() || {},
        captureDate: new Date().toISOString()
      };
      
      console.log(`✅ RASCI capturado: ${data.roles.length} roles, ${Object.keys(data.matrix).length} entradas de matriz`);
      return data;
    } catch (error) {
      console.warn('Error capturando RASCI:', error);
      return { roles: [], matrix: {}, captureDate: new Date().toISOString() };
    }
  }

  async captureRalphData() {
    const modeler = resolve('BpmnModeler');
    const data = {
      elements: [],
      captureDate: new Date().toISOString()
    };
    
    if (modeler) {
      try {
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        const ralphElements = allElements.filter(el => 
          (el.type && el.type.includes('RALPH')) ||
          (el.businessObject && el.businessObject.$type && el.businessObject.$type.includes('RALPH'))
        );
        
        data.elements = ralphElements.map(element => ({
          id: element.id,
          type: element.type,
          name: this.getElementName(element),
          position: this.getElementPosition(element),
          properties: element.businessObject ? {
            name: element.businessObject.name,
            type: element.businessObject.$type
          } : {}
        }));
        
        console.log(`✅ ${data.elements.length} elementos RALPH capturados`);
      } catch (error) {
        console.warn('Error capturando RALPH:', error);
      }
    }
    
    return data;
  }

  async captureMetadata() {
    try {
      // Capturar nombre del diagrama desde el ServiceRegistry
      const registry = resolve('ServiceRegistry');
      let currentFileName = 'mi_diagrama.bpmn'; // Default
      
      if (registry && registry.get) {
        // Intentar obtener el nombre del diagrama desde algún servicio
        const appService = registry.get('AppService');
        if (appService && appService.currentFileName) {
          currentFileName = appService.currentFileName;
        }
      }
      
      console.log(`✅ Metadata capturada - Nombre: ${currentFileName}`);
      
      return {
        diagramName: currentFileName,
        captureDate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Error capturando metadata:', error);
      return null;
    }
  }

  // ==================== RESTAURACIÓN DE DATOS ====================

  /**
   * Restaura el estado completo del proyecto (similar a ImportExportManager.importProjectData)
   */
  async restoreCompleteProject(projectData) {
    const restoreOrder = [
      { key: 'bpmn', method: 'restoreBpmnData' },
      { key: 'ppi', method: 'restorePPIData' },
      { key: 'rasci', method: 'restoreRasciData' },
      { key: 'ralph', method: 'restoreRalphData' },
      { key: 'metadata', method: 'restoreMetadata' }
    ];

    for (const { key, method } of restoreOrder) {
      if (projectData[key]) {
        try {
          await this[method](projectData[key]);
          console.log(`✅ ${key} restaurado correctamente`);
        } catch (error) {
          console.warn(`⚠️ Error restaurando ${key}:`, error);
        }
      }
    }

    return true;
  }

  async restoreBpmnData(bpmnData) {
    if (!bpmnData) return;

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler no disponible para restaurar BPMN');
    }

    try {
      // Restaurar XML del BPMN
      const xmlContent = bpmnData.diagram || bpmnData.xml || bpmnData;
      await modeler.importXML(xmlContent);
      console.log('✅ BPMN restaurado en el canvas');
      
      // Restaurar relaciones padre-hijo igual que ImportExportManager
      if (bpmnData.relationships && Array.isArray(bpmnData.relationships) && bpmnData.relationships.length > 0) {
        console.log(`🔄 Restaurando ${bpmnData.relationships.length} relaciones padre-hijo...`);
        
        try {
          // Importar RelationshipRestore dinámicamente
          const { RelationshipRestore } = await import('../modules/ui/managers/import-export/RelationshipRestore.js');
          const relationshipRestore = new RelationshipRestore(this.config);
          
          // Esperar un poco para que los elementos estén listos, igual que ImportExportManager
          setTimeout(() => {
            relationshipRestore.restoreRelationshipsSimple(modeler, bpmnData.relationships);
          }, 1000); // Wait 1 second for elements to be ready
          
        } catch (error) {
          console.warn('Error restaurando relaciones:', error);
          // Continuar sin restaurar relaciones si hay error
        }
      }
      
    } catch (error) {
      console.error('Error restaurando BPMN:', error);
      throw error;
    }
  }

  async restorePPIData(ppiData) {
    if (!ppiData || !ppiData.indicators) return;

    try {
      const ppiManager = resolve('PPIManagerInstance');
      
      if (ppiManager && ppiManager.core) {
        console.log(`📊 Restaurando ${ppiData.indicators.length} PPIs...`);
        
        // Limpiar PPIs existentes si es necesario
        const existingPPIs = ppiManager.core.getAllPPIs();
        if (existingPPIs.length > 0) {
          console.log(`🗑️ Limpiando ${existingPPIs.length} PPIs existentes...`);
          // Nota: Aquí podrías implementar lógica para limpiar PPIs existentes si es necesario
        }
        
        // Agregar PPIs restaurados
        ppiData.indicators.forEach(ppi => {
          ppiManager.core.addPPI(ppi);
        });
        
        console.log('✅ PPIs restaurados en el manager');
      }
    } catch (error) {
      console.error('Error restaurando PPIs:', error);
      throw error;
    }
  }

  async restoreRasciData(rasciData) {
    if (!rasciData) return;

    try {
      if (rasciData.roles) {
        RasciStore.setRoles(rasciData.roles);
        console.log(`✅ ${rasciData.roles.length} roles RASCI restaurados`);
      }
      
      if (rasciData.matrix) {
        RasciStore.setMatrix(rasciData.matrix);
        console.log(`✅ Matriz RASCI restaurada: ${Object.keys(rasciData.matrix).length} entradas`);
      }
      
      // Notificar recarga del estado RASCI
      setTimeout(() => {
        if (this.eventBus) {
          this.eventBus.publish('rasci.state.ensureLoaded', {});
        }
      }, 500);
      
    } catch (error) {
      console.error('Error restaurando RASCI:', error);
      throw error;
    }
  }

  async restoreRalphData(ralphData) {
    if (!ralphData || !ralphData.elements || ralphData.elements.length === 0) {
      return;
    }

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.warn('⚠️ Modeler no disponible para restaurar RALPH');
      return;
    }

    try {
      console.log(`🎭 Restaurando ${ralphData.elements.length} elementos RALPH...`);
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const elementFactory = modeler.get('elementFactory');
      const canvas = modeler.get('canvas');
      
      if (!elementRegistry || !modeling || !elementFactory) {
        throw new Error('Servicios del modeler no disponibles para RALPH');
      }

      const rootElement = canvas.getRootElement();
      let restoredCount = 0;

      for (const ralphEl of ralphData.elements) {
        try {
          // Verificar si el elemento ya existe
          const existingElement = elementRegistry.get(ralphEl.id);
          if (existingElement) {
            console.log(`✅ Elemento RALPH ya existe: ${ralphEl.id}`);
            continue;
          }

          // Crear elemento RALPH
          const element = elementFactory.create('shape', {
            type: ralphEl.type,
            id: ralphEl.id,
            width: ralphEl.position.width || 50,
            height: ralphEl.position.height || 50
          });

          // Establecer propiedades del businessObject
          if (element.businessObject && ralphEl.properties) {
            element.businessObject.name = ralphEl.properties.name || ralphEl.name;
            if (ralphEl.properties.type) {
              element.businessObject.$type = ralphEl.properties.type;
            }
          }

          // Crear en el canvas
          const position = { 
            x: ralphEl.position.x || 100, 
            y: ralphEl.position.y || 100 
          };
          
          modeling.createShape(element, position, rootElement);
          restoredCount++;
          
          console.log(`🎭 Elemento RALPH restaurado: ${ralphEl.id} (${ralphEl.type})`);
          
        } catch (error) {
          console.warn(`⚠️ Error restaurando elemento RALPH ${ralphEl.id}:`, error);
        }
      }

      console.log(`✅ Restauración RALPH completada: ${restoredCount}/${ralphData.elements.length} elementos`);
      
    } catch (error) {
      console.error('❌ Error restaurando RALPH:', error);
      throw error;
    }
  }

  // ==================== PERSISTENCIA EN LOCALSTORAGE ====================

  async saveToLocalStorage(projectData) {
    try {
      const dataToSave = {
        version: this.config.version,
        timestamp: new Date().toISOString(),
        savedAt: Date.now(),
        data: projectData
      };

      localStorage.setItem(this.config.storageKey, JSON.stringify(dataToSave));
      console.log('💾 Datos guardados en localStorage');
      return true;
    } catch (error) {
      console.error('Error guardando en localStorage:', error);
      return false;
    }
  }

  async loadFromLocalStorage() {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (!data) {
        return null;
      }

      const parsed = JSON.parse(data);
      
      // Verificar TTL (opcional - 24 horas)
      const now = Date.now();
      const saved = parsed.savedAt || new Date(parsed.timestamp).getTime();
      const ttl = 24 * 60 * 60 * 1000; // 24 horas
      
      if (now - saved > ttl) {
        console.log('⚠️ Los datos guardados han expirado, eliminando...');
        localStorage.removeItem(this.config.storageKey);
        return null;
      }

      return parsed.data;
    } catch (error) {
      console.error('Error cargando desde localStorage:', error);
      return null;
    }
  }

  // ==================== NOTIFICACIONES ====================

  notifySaveSuccess(projectData) {
    if (this.eventBus) {
      this.eventBus.publish('localStorage.save.success', {
        success: true,
        timestamp: new Date().toISOString(),
        data: projectData
      });
    }
  }

  notifyClearSuccess() {
    if (this.eventBus) {
      this.eventBus.publish('localStorage.clear.success', {
        success: true,
        timestamp: new Date().toISOString()
      });
    }
  }

  notifySaveError(error) {
    if (this.eventBus) {
      this.eventBus.publish('localStorage.save.error', {
        success: false,
        error: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  notifyLoadSuccess(projectData) {
    if (this.eventBus) {
      this.eventBus.publish('localStorage.load.success', {
        success: true,
        timestamp: new Date().toISOString(),
        data: projectData
      });
    }
  }

  notifyLoadError(error) {
    if (this.eventBus) {
      this.eventBus.publish('localStorage.load.error', {
        success: false,
        error: error,
        timestamp: new Date().toISOString()
      });
    }
  }

  // ==================== MÉTODOS UTILITARIOS ====================

  getElementName(element) {
    if (!element) return '';
    if (element.businessObject && element.businessObject.name) {
      return element.businessObject.name;
    }
    if (element.name) return element.name;
    return element.id || '';
  }

  getElementPosition(element) {
    if (!element) return { x: 0, y: 0, width: 0, height: 0 };
    return {
      x: element.x || 0,
      y: element.y || 0,
      width: element.width || 0,
      height: element.height || 0
    };
  }

  // ==================== MÉTODOS DE COMPATIBILIDAD ====================

  /**
   * Método de compatibilidad para el PPIDataManager
   */
  savePPIs(ppis) {
    console.log('ℹ️ savePPIs llamado - usando nuevo LocalStorageManager');
    // El PPIDataManager puede llamar a este método, pero ahora usamos saveProject()
    // para guardar todo el estado del proyecto
    return this.saveProject();
  }

  /**
   * Método de compatibilidad para el PPIDataManager
   */
  loadPPIs() {
    console.log('ℹ️ loadPPIs llamado - usando nuevo LocalStorageManager');
    // El PPIDataManager puede llamar a este método, pero ahora usamos loadProject()
    // para cargar todo el estado del proyecto
    return this.loadProject();
  }

  async restoreMetadata(metadata) {
    if (!metadata || !metadata.diagramName) return;

    try {
      // Restaurar nombre del diagrama
      const registry = resolve('ServiceRegistry');
      if (registry && registry.get) {
        const appService = registry.get('AppService');
        if (appService && appService.setCurrentFileName) {
          appService.setCurrentFileName(metadata.diagramName);
        }
      }
      
      console.log(`✅ Metadata restaurada - Nombre: ${metadata.diagramName}`);
    } catch (error) {
      console.warn('Error restaurando metadata:', error);
    }
  }

  // ==================== MÉTODOS DE DEBUG ====================

  getStorageInfo() {
    try {
      const data = localStorage.getItem(this.config.storageKey);
      if (!data) {
        return { hasData: false };
      }

      const parsed = JSON.parse(data);
      return {
        hasData: true,
        version: parsed.version,
        timestamp: parsed.timestamp,
        savedAt: parsed.savedAt,
        dataSize: data.length,
        age: Date.now() - (parsed.savedAt || new Date(parsed.timestamp).getTime())
      };
    } catch (error) {
      return { hasData: false, error: error.message };
    }
  }
}

// Exportar instancia singleton
export default new LocalStorageManager();
