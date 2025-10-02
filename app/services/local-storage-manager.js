/**
 * LocalStorageManager - Nuevo sistema de localStorage basado en el patrón Import/Export
 * 
 * Este manager reemplaza el sistema de autosave con un enfoque similar al ImportExportManager,
 * proporcionando métodos save/load que capturan y restauran el estado completo del proyecto.
 */

import { resolve } from './global-access.js';
import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';
import { RasciStore } from '../modules/rasci/store.js';
import { RelationshipCapture } from '../modules/ui/managers/import-export/RelationshipCapture.js';
import { RelationshipRestore } from '../modules/ui/managers/import-export/RelationshipRestore.js';

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
      const saveTimestamp = Date.now();
      console.log('💾 Iniciando guardado del proyecto...');
      console.log(`⏰ [LocalStorageManager] Timestamp de guardado: ${saveTimestamp}`);
      console.log('🔍 DEBUG - Iniciando proceso de guardado completo...');
      
      // Generar stack trace para saber quién inició el guardado
      const stack = new Error().stack;
      const stackLines = stack.split('\n');
      const caller = (stackLines[2] && stackLines[2].trim()) || 'desconocido';
      console.log(`📞 [LocalStorageManager] Guardado iniciado por: ${caller}`);

      const projectData = await this.captureCompleteProject();
      const success = await this.saveToLocalStorage(projectData);

      if (success) {
      console.log(`✅ Proyecto guardado exitosamente en localStorage (timestamp: ${saveTimestamp})`);
      this.notifySaveSuccess(projectData);
      
      return { success: true, data: projectData, timestamp: saveTimestamp };
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

      // CRITICAL: Deshabilitar autoguardado durante la restauración
      console.log('🔒 Deshabilitando autoguardado durante la restauración...');
      this.setAutoSaveEnabled(false);

      // CRITICAL: Esperar a que la aplicación esté completamente inicializada
      console.log('⏳ Esperando a que la aplicación se inicialice completamente...');
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('✅ Aplicación inicializada, procediendo con la carga...');

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
      
      // CRITICAL: Reactivar autoguardado después de la restauración
      console.log('🔓 Reactivando autoguardado después de la restauración...');
      this.setAutoSaveEnabled(true);
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
      
      // También limpiar PPIs en memoria si hay un PPIManager activo
      try {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager && ppiManager.core && typeof ppiManager.core.clearAllPPIs === 'function') {
          // Uso síncrono porque clearSavedData no es async y no queremos cambiar su interfaz
          ppiManager.core.clearAllPPIs();
          console.log('✅ PPIs limpiados junto con datos del proyecto');
        }
      } catch (ppiError) {
        console.warn('⚠️ No se pudieron limpiar los PPIs:', ppiError);
      }
      
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
      metadata: await this.captureMetadata(),
      formData: await this.captureFormData() // NUEVO: Capturar datos del formulario
    };

    console.log('📊 Datos del proyecto capturados:', {
      bpmn: projectData.bpmn ? 'XML capturado' : 'No disponible',
      ppi: (projectData.ppi && projectData.ppi.indicators) ? projectData.ppi.indicators.length : 0,
      rasci: `${(projectData.rasci && projectData.rasci.roles) ? projectData.rasci.roles.length : 0} roles, ${Object.keys((projectData.rasci && projectData.rasci.matrix) || {}).length} tareas`,
      ralph: (projectData.ralph && projectData.ralph.elements) ? projectData.ralph.elements.length : 0,
      metadata: projectData.metadata ? 'Capturado' : 'No disponible'
    });

    // DEBUG: Mostrar estructura de relaciones si existen
    if (projectData.bpmn && projectData.bpmn.relationships) {
      console.log('🔍 DEBUG - Relaciones capturadas:', {
        count: projectData.bpmn.relationships.length,
        relationships: projectData.bpmn.relationships
      });
    }

    return projectData;
  }

  async captureBpmnData() {
    console.log('🔍 DEBUG - Iniciando captura de datos BPMN...');
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.warn('⚠️ Modeler no disponible para capturar BPMN');
      return null;
    }

    try {
      // COPIAR EXACTAMENTE del BpmnExporter
      const data = this.initializeBpmnData();
      
      await this.captureXMLDiagram(modeler, data);
      await this.capturePPINOTElements(modeler, data);
      await this.captureRALPHElements(modeler, data);
      this.captureCanvasState(modeler, data);
      
      console.log(`🔍 DEBUG - Relaciones capturadas:`, { count: data.relationships.length, relationships: data.relationships });
      
      return data;
      
    } catch (error) {
      console.warn('Error capturando BPMN:', error);
      return null;
    }
  }

  /**
   * Captura etiquetas de elementos PPINOT
   */

  /**
   * Captura relaciones PPINOT directamente del canvas
   */
  capturePPINOTRelationshipsDirect(modeler) {
    const relationships = [];
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      console.log(`🔍 DEBUG - Analizando ${allElements.length} elementos para relaciones PPINOT...`);
      
      // DEBUG: Mostrar todos los elementos con sus tipos
      console.log('🔍 DEBUG - Todos los elementos encontrados:', allElements.map(el => ({
        id: el.id,
        type: el.type,
        boType: (el.businessObject && el.businessObject.$type) || '',
        name: (el.businessObject && el.businessObject.name) || '',
        x: el.x,
        y: el.y
      })));
      
      // Buscar elementos PPINOT
      const ppiElements = allElements.filter(el => {
        const type = el.type || '';
        const boType = (el.businessObject && el.businessObject.$type) || '';
        const isPPINOT = type.includes('PPINOT:') || boType.includes('PPINOT:');
        
        if (isPPINOT) {
          console.log(`🔍 DEBUG - Elemento PPINOT encontrado: ${el.id} (${type || boType})`);
        }
        
        return isPPINOT;
      });
      
      console.log(`🔍 DEBUG - Encontrados ${ppiElements.length} elementos PPINOT:`, ppiElements.map(el => ({
        id: el.id,
        type: el.type,
        boType: (el.businessObject && el.businessObject.$type) || '',
        name: (el.businessObject && el.businessObject.name) || ''
      })));
      
      // Para cada elemento PPINOT, buscar sus hijos
      for (const ppiElement of ppiElements) {
        const ppiId = ppiElement.id;
        const ppiType = ppiElement.type || (ppiElement.businessObject && ppiElement.businessObject.$type) || '';
        const ppiName = ppiElement.businessObject && ppiElement.businessObject.name || ppiId;
        
        console.log(`🔍 DEBUG - Procesando elemento PPINOT: ${ppiId} (${ppiType})`);
        
        // Buscar elementos que podrían ser hijos de este PPI
        const potentialChildren = allElements.filter(child => {
          if (child.id === ppiId) return false; // No es hijo de sí mismo
          
          const childType = child.type || '';
          const childBoType = (child.businessObject && child.businessObject.$type) || '';
          
          // Verificar si es un elemento PPINOT hijo (Target, AggregatedMeasure, etc.)
          const isPPINOTChild = childType.includes('PPINOT:') || childBoType.includes('PPINOT:');
          const isNotPPI = !childType.includes('PPINOT:Ppi') && !childBoType.includes('PPINOT:Ppi');
          
          const isPotentialChild = isPPINOTChild && isNotPPI;
          
          if (isPotentialChild) {
            console.log(`🔍 DEBUG - Hijo potencial encontrado: ${child.id} (${childType || childBoType})`);
          }
          
          return isPotentialChild;
        });
        
        console.log(`🔍 DEBUG - Elemento ${ppiId} (${ppiType}) tiene ${potentialChildren.length} posibles hijos`);
        
        if (potentialChildren.length === 0) {
          console.log(`🔍 DEBUG - Todos los elementos disponibles para buscar hijos:`, allElements.map(el => ({
            id: el.id,
            type: el.type,
            boType: (el.businessObject && el.businessObject.$type) || ''
          })));
        }
        
        // Para cada hijo potencial, verificar proximidad y crear relación
        for (const child of potentialChildren) {
          const childId = child.id;
          const childType = child.type || (child.businessObject && child.businessObject.$type) || '';
          const childName = child.businessObject && child.businessObject.name || childId;
          
          // Verificar proximidad visual
          const distance = this.calculateDistance(ppiElement, child);
          console.log(`🔍 DEBUG - Distancia entre ${ppiId} y ${childId}: ${distance} (máximo: ${this.config.maxDistance})`);
          
          if (distance <= this.config.maxDistance) {
            // Guardar posiciones absolutas para calcular relativas en restauración
            const position = {
              childX: child.x || 0,
              childY: child.y || 0,
              parentX: ppiElement.x || 0,
              parentY: ppiElement.y || 0,
              width: child.width || 0,
              height: child.height || 0
            };
            
        console.log(`🔍 DEBUG - Posiciones capturadas:`);
        console.log(`  Padre (${ppiId}): (${position.parentX}, ${position.parentY})`);
        console.log(`  Hijo (${childId}): (${position.childX}, ${position.childY})`);
        console.log(`  Relación encontrada y guardada!`);
            
            const relationship = {
              childId: childId,
              parentId: ppiId,
              childName: childName,
              parentName: ppiName,
              childType: childType,
              parentType: ppiType,
              position: position,
              timestamp: Date.now(),
              source: 'direct_ppinot_capture'
            };
            
            relationships.push(relationship);
            console.log(`✅ DEBUG - Relación creada: ${childName} -> ${ppiName} (distancia: ${distance})`);
          } else {
            console.log(`❌ DEBUG - Relación rechazada por distancia: ${childName} -> ${ppiName} (${distance} > ${this.config.maxDistance})`);
          }
        }
      }
      
      console.log(`✅ DEBUG - Captura directa completada: ${relationships.length} relaciones PPINOT encontradas`);
      console.log('🔍 DEBUG - Relaciones encontradas:', relationships);
      
    } catch (error) {
      console.warn('Error en captura directa de relaciones PPINOT:', error);
    }
    
    console.log(`🔍 DEBUG - Captura PPINOT completada: ${relationships.length} relaciones encontradas`);
    if (relationships.length > 0) {
      console.log(`🔍 DEBUG - Primeras 2 relaciones:`, relationships.slice(0, 2));
    }
    
    return relationships;
  }
  
  // COPIAR EXACTAMENTE del BpmnExporter
  initializeBpmnData() {
    return {
      diagram: null,
      relationships: [],
      elements: {},
      canvas: null,
      ppinotElements: [],
      ralphElements: []
    };
  }

  async captureXMLDiagram(modeler, data) {
    try {
      const result = await modeler.saveXML({ format: true });
      data.diagram = result.xml;
      console.log('✅ XML diagram captured');
    } catch (error) {
      // Si no hay definiciones cargadas, crear un diagrama vacío y reintentar una vez
      const message = (error && (error.message || String(error))) || '';
      if (message && message.toLowerCase().includes('no definitions loaded')) {
        console.warn('⚠️ No definitions loaded. Creating empty diagram and retrying saveXML...');
        try {
          if (typeof modeler.createDiagram === 'function') {
            await modeler.createDiagram();
          }
          const retry = await modeler.saveXML({ format: true });
          data.diagram = retry.xml;
          console.log('✅ XML diagram captured after createDiagram');
        } catch (retryError) {
          console.warn('⚠️ Retry saveXML failed after createDiagram:', retryError);
          // Continuar sin diagrama para no bloquear el flujo de guardado
          data.diagram = null;
        }
      } else {
        console.warn('Error capturando BPMN:', error);
        data.diagram = null; // Continuar sin diagrama
      }
    }
    
    // Use RelationshipCapture imported at the top
    const relationshipCapture = new RelationshipCapture(this.config);
    
    // Capture parent-child relationships
    data.relationships = relationshipCapture.captureParentChildRelationships(modeler);
    console.log(`✅ ${data.relationships.length} parent-child relationships captured`);
  }

  async capturePPINOTElements(modeler, data) {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Incluir elementos PPINOT y labels de conexiones PPINOT
    const ppinotElements = allElements.filter(el => {
      if (el.type && (el.type.includes('PPINOT:') || el.type.includes('ppinot:'))) {
        return true;
      }
      // Incluir labels que pertenecen a conexiones PPINOT
      if (el.type === 'label' && el.labelTarget && el.labelTarget.type && 
          (el.labelTarget.type.includes('PPINOT:') || el.labelTarget.type.includes('ppinot:'))) {
        return true;
      }
      return false;
    });
    
    console.log(`🔍 XML verification: ${ppinotElements.length} PPINOT elements (including labels) in canvas`);
    
    const missingFromXml = ppinotElements.filter(el => 
      !data.diagram.includes(`id="${el.id}"`)
    );
    
    // CRITICAL: Only capture separately if missing from XML (like BpmnExporter)
    if (missingFromXml.length > 0) {
      console.log(`📋 Saving ${missingFromXml.length} PPINOT elements separately...`);
      data.ppinotElements = this.serializePPINOTElements(missingFromXml);
      console.log(`✅ ${data.ppinotElements.length} PPINOT elements saved separately`);
    } else {
      console.log(`✅ All PPINOT elements are in XML, no separate capture needed`);
      data.ppinotElements = [];
    }
    
    // Capture PPINOT data from modeler if available
    if (modeler.getJson && typeof modeler.getJson === 'function') {
      const ppinotData = modeler.getJson();
      data.ppinotElements = ppinotData.definitions || [];
      data.ppinotDiagram = ppinotData.diagram || [];
      data.ppinotIdMap = ppinotData.idMap || {};
      console.log(`✅ ${data.ppinotElements.length} PPINOT elements from modeler`);
    }
  }

  async captureRALPHElements(modeler, data) {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    const ralphElements = allElements.filter(el => 
      el.type && (el.type.includes('RALph:') || el.type.includes('ralph:'))
    );
    
    // CRITICAL: Only capture separately if missing from XML (like BpmnExporter)
    const missingFromXml = ralphElements.filter(el => 
      !data.diagram.includes(`id="${el.id}"`)
    );
    
    if (missingFromXml.length > 0) {
      console.log(`📋 Saving ${missingFromXml.length} RALPH elements separately...`);
      data.ralphElements = this.serializeRALPHElements(missingFromXml);
      console.log(`✅ ${data.ralphElements.length} RALPH elements saved separately`);
    } else {
      data.ralphElements = [];
      console.log('✅ All RALPH elements are in XML, no separate capture needed');
    }
  }

  captureCanvasState(modeler, data) {
    const canvas = modeler.get('canvas');
    if (canvas) {
      data.canvas = {
        zoom: canvas.zoom(),
        viewbox: canvas.viewbox()
      };
      console.log('✅ Canvas state captured');
    }
  }

  serializePPINOTElements(elements) {
    return elements.map(el => {
      const serialized = {
        type: el.type,
        id: el.id,
        width: el.width || (el.type === 'label' ? 80 : 100),
        height: el.height || (el.type === 'label' ? 20 : 80),
        x: el.x || 0,
        y: el.y || 0,
        text: el.businessObject && el.businessObject.name || null,
        parent: el.parent && el.parent.id || null
      };
      
      // Para labels, guardar información del labelTarget
      if (el.type === 'label' && el.labelTarget) {
        serialized.labelTargetId = el.labelTarget.id;
      }
      
      return serialized;
    });
  }

  serializeRALPHElements(elements) {
    return elements.map(el => ({
      type: el.type,
      id: el.id,
      width: el.width || 50,
      height: el.height || 50,
      x: el.x || 0,
      y: el.y || 0,
      text: el.businessObject && el.businessObject.name || null,
      parent: el.parent && el.parent.id || null
    }));
  }

  async waitForModelerReady() {
    // MEJORADO: Esperar más tiempo y verificar más servicios
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('⚠️ Modeler not available, waiting...');
      await new Promise(resolve => setTimeout(resolve, 1000));
      return this.waitForModelerReady(); // Retry
    }
    
    return new Promise((resolve) => {
      let attempts = 0;
      const maxAttempts = 100; // 10 segundos máximo
      
      const check = () => {
        attempts++;
        try {
          // Verificar que todos los servicios críticos estén disponibles
          const canvas = modeler.get('canvas');
          const elementRegistry = modeler.get('elementRegistry');
          const modeling = modeler.get('modeling');
          const elementFactory = modeler.get('elementFactory');
          const moddle = modeler.get('moddle');
          
          // Verificar que el canvas esté realmente montado
          const canvasContainer = canvas && canvas.getContainer();
          const isCanvasMounted = canvasContainer && document.contains(canvasContainer);
          
          if (canvas && elementRegistry && modeling && elementFactory && moddle && isCanvasMounted) {
            console.log(`✅ Modeler ready after ${attempts} attempts (canvas mounted: ${isCanvasMounted})`);
            resolve();
          } else {
            if (attempts >= maxAttempts) {
              console.warn(`⚠️ Modeler not ready after ${maxAttempts} attempts, proceeding anyway`);
              console.warn(`  - canvas: ${!!canvas}, elementRegistry: ${!!elementRegistry}, modeling: ${!!modeling}, elementFactory: ${!!elementFactory}, moddle: ${!!moddle}, mounted: ${isCanvasMounted}`);
              resolve();
            } else {
              setTimeout(check, 100);
            }
          }
    } catch (error) {
          if (attempts >= maxAttempts) {
            console.warn(`⚠️ Modeler error after ${maxAttempts} attempts, proceeding anyway:`, error.message);
            resolve();
          } else {
            setTimeout(check, 100);
          }
        }
      };
      check();
    });
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
  
  async capturePPIData() {
    try {
      const ppiManager = resolve('PPIManagerInstance');
      
      if (!ppiManager || !ppiManager.core) {
        console.log('⚠️ PPIManager no disponible');
        return { indicators: [], captureDate: new Date().toISOString() };
      }
      
      // DEBUGGING: Verificar qué PPIs tiene el DataManager en este momento
      const rawPPIs = ppiManager.core.dataManager ? ppiManager.core.dataManager.ppis : [];
      console.log('🔍 [LocalStorageManager] PPIs en memoria antes de captura:', rawPPIs.map(p => `${p.id}: ${p.title || p.name}`));
      
      // Base: usar getVisiblePPIs() que excluye agregadas y solo incluye las del canvas (con elementId)
      let visiblePPIs = ppiManager.core.getVisiblePPIs ? 
                        ppiManager.core.getVisiblePPIs() : 
                        (ppiManager.core.getAllPPIs ? ppiManager.core.getAllPPIs() : []);

      console.log('🔍 [LocalStorageManager] PPIs devueltos por getVisiblePPIs():', visiblePPIs.map(p => `${p.id}: ${p.title || p.name}`));

      // Refuerzo: filtrar por existencia real en el canvas
      try {
        const modeler = resolve('BpmnModeler');
        const elementRegistry = modeler && modeler.get ? modeler.get('elementRegistry') : null;
        if (elementRegistry) {
          const before = visiblePPIs.length;
          visiblePPIs = visiblePPIs.filter(ppi => {
            if (!ppi.elementId) return false; // Si no está en canvas, no lo guardamos
            return !!elementRegistry.get(ppi.elementId);
          });
          if (visiblePPIs.length !== before) {
            console.log(`🧹 PPIs huérfanos excluidos de captura: ${before - visiblePPIs.length}`);
          }
        }
      } catch (_) {
        // si no hay modeler/elementRegistry, mantenemos visiblePPIs tal cual
      }
      
      console.log(`✅ ${visiblePPIs.length} PPIs capturados (solo canvas, sin agregadas):`);
      console.log('📋 [LocalStorageManager] PPIs finales a guardar:', visiblePPIs.map(p => `${p.id}: ${p.title || p.name}`));
      
      return {
        indicators: visiblePPIs,
        captureDate: new Date().toISOString()
      };
      
    } catch (error) {
      console.warn('Error capturando PPIs:', error);
      return { indicators: [], captureDate: new Date().toISOString() };
    }
  }

  async captureMetadata() {
    try {
      let currentFileName = 'mi_diagrama.bpmn'; // Default
      
      // Fuente 1: Verificar localStorage por nombre guardado previamente
      const savedName = localStorage.getItem('current_diagram_name');
      if (savedName && savedName.trim() && savedName !== 'mi_diagrama.bpmn') {
        currentFileName = savedName;
        console.log(`📝 Nombre capturado desde localStorage: ${currentFileName}`);
      }
      
      // Fuente 2: Verificar título del DOM
      const titleElement = document.querySelector('title');
      if (titleElement && titleElement.textContent && titleElement.textContent !== 'MultiModeler') {
        const titleText = titleElement.textContent.trim();
        if (titleText.includes('.bpmn') && titleText !== currentFileName) {
          currentFileName = titleText;
          console.log(`📝 Nombre capturado desde título DOM: ${currentFileName}`);
        }
      }
      
      // Fuente 3: Buscar en inputs del DOM
      const nameInputs = document.querySelectorAll('input[type="text"]');
      for (const input of nameInputs) {
        if (input.value && input.value.trim() && input.value.includes('.bpmn') && input.value !== currentFileName) {
          currentFileName = input.value.trim();
          console.log(`📝 Nombre capturado desde input DOM: ${currentFileName}`);
          break;
        }
      }
      
      // Fuente 4: AppService (último recurso)
      try {
        const registry = resolve('ServiceRegistry');
        if (registry && registry.get) {
          const appService = registry.get('AppService');
          if (appService && appService.currentFileName && appService.currentFileName !== currentFileName) {
            currentFileName = appService.currentFileName;
            console.log(`📝 Nombre capturado desde AppService: ${currentFileName}`);
          }
        }
      } catch (error) {
        console.debug('Error accediendo a AppService:', error);
      }
      
      // Guardar el nombre actual en localStorage
      localStorage.setItem('current_diagram_name', currentFileName);
      
      console.log(`✅ Metadata capturada - Nombre final: ${currentFileName}`);
      
      return {
        diagramName: currentFileName,
        captureDate: new Date().toISOString()
      };
    } catch (error) {
      console.warn('Error capturando metadata:', error);
      return null;
    }
  }
  
  /**
   * Captura datos de formularios de la aplicación
   */
  async captureFormData() {
    const formData = {
      timestamp: new Date().toISOString(),
      projectSettings: {},
      ppiFormSettings: {},
      rasciFormSettings: {},
      userPreferences: {}
    };
    
    try {
      // Capturar configuraciones de proyecto
      const projectName = localStorage.getItem('projectName') || document.title || 'Untitled Project';
      formData.projectSettings = {
        name: projectName,
        description: localStorage.getItem('projectDescription') || '',
        author: localStorage.getItem('projectAuthor') || '',
        version: localStorage.getItem('projectVersion') || '1.0.0'
      };
      
      // Capturar preferencias de usuario
      formData.userPreferences = {
        theme: localStorage.getItem('theme') || 'default',
        language: localStorage.getItem('language') || 'es',
        panelLayout: localStorage.getItem('panelLayout') || '2v',
        autoSave: localStorage.getItem('autoSaveEnabled') !== 'false'
      };
      
      // Capturar estado de formularios PPI si hay modal abierto
      const ppiModal = document.getElementById('ppi-modal');
      if (ppiModal && ppiModal.style.display !== 'none') {
        const form = ppiModal.querySelector('form');
        if (form) {
          // Capturar todos los campos del formulario PPI
          const ppiFormData = {};
          
          // Campos básicos
          const titleInput = form.querySelector('[name="title"]');
          if (titleInput) ppiFormData.title = titleInput.value;
          
          const descInput = form.querySelector('[name="description"]');
          if (descInput) ppiFormData.description = descInput.value;
          
          const processInput = form.querySelector('[name="process"]');
          if (processInput) ppiFormData.process = processInput.value;
          
          // Campos de medición
          const measureTypeSelect = form.querySelector('[name="measureType"]');
          if (measureTypeSelect) ppiFormData.measureType = measureTypeSelect.value;
          
          const targetInput = form.querySelector('[name="target"]');
          if (targetInput) ppiFormData.target = targetInput.value;
          
          const scopeInput = form.querySelector('[name="scope"]');
          if (scopeInput) ppiFormData.scope = scopeInput.value;
          
          // Campos de responsabilidades
          const responsibleInput = form.querySelector('[name="responsible"]');
          if (responsibleInput) ppiFormData.responsible = responsibleInput.value;
          
          const informedInput = form.querySelector('[name="informed"]');
          if (informedInput) ppiFormData.informed = informedInput.value;
          
          const commentsInput = form.querySelector('[name="comments"]');
          if (commentsInput) ppiFormData.comments = commentsInput.value;
          
          // Capturar ID de la PPI que se está editando
          const ppiIdElement = form.querySelector('.ppi-id-value');
          if (ppiIdElement) ppiFormData.editingPPIId = ppiIdElement.textContent;
          
          formData.ppiFormSettings = ppiFormData;
          console.log('📝 Datos del formulario PPI capturados:', Object.keys(ppiFormData).length, 'campos');
        }
      }
      
      console.log('📋 Datos de formulario capturados:', {
        project: formData.projectSettings.name,
        preferences: Object.keys(formData.userPreferences).length,
        ppiForm: Object.keys(formData.ppiFormSettings).length
      });
      
    } catch (error) {
      console.warn('Error capturando datos de formulario:', error);
    }
    
    return formData;
  }

  // ==================== RESTAURACIÓN DE DATOS ====================

  /**
   * Restaura el estado completo del proyecto (similar a ImportExportManager.importProjectData)
   */
  async restoreCompleteProject(projectData) {
    const restoreOrder = [
      { key: 'bpmn', method: 'restoreBpmnData' },
      { key: 'rasci', method: 'restoreRasciData' },
      { key: 'ralph', method: 'restoreRalphData' },
      { key: 'ppi', method: 'restorePPIData' },
      { key: 'metadata', method: 'restoreMetadata' },
      { key: 'formData', method: 'restoreFormData' }
    ];

    for (const { key, method } of restoreOrder) {
      if (projectData[key]) {
        try {
          await this[method](projectData[key]);
          console.log(`✅ ${key} restaurado correctamente`);
          
          // Pequeño delay entre restauraciones para evitar conflictos
          if (key === 'bpmn') {
            console.log('⏳ Esperando a que el BPMN se estabilice...');
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        } catch (error) {
          console.warn(`⚠️ Error restaurando ${key}:`, error);
        }
      }
    }

    return true;
  }

  async restoreBpmnData(bpmnData) {
    if (!bpmnData) return;
    console.log('🔍 DEBUG - Iniciando restauración de datos BPMN...');

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler no disponible para restaurar BPMN');
    }

    try {
      // Restaurar XML del BPMN
      const xmlContent = bpmnData.diagram || bpmnData.xml || bpmnData;
      
      // CRITICAL: Verificar si elementos tienen BPMNShape (igual que ImportExportManager)
      let missingShapes = [];
      let presentShapes = [];
      
      console.log('🔍 DEBUG - Verificando XML antes de importar...');
      
      // Buscar elementos PPINOT en <bpmn:process>
      const processMatch = xmlContent.match(/<bpmn:process[^>]*>(.*?)<\/bpmn:process>/s);
      if (processMatch) {
        const processContent = processMatch[1];
        const ppinotElements = processContent.match(/<PPINOT:[^>]+id="([^"]+)"/g) || [];
        
        console.log(`🔍 PPINOT elements en <bpmn:process>: ${ppinotElements.length}`);
        
        ppinotElements.forEach(match => {
          const idMatch = match.match(/id="([^"]+)"/);
          if (idMatch) {
            const elementId = idMatch[1];
            const hasShape = xmlContent.includes(`${elementId}_di`);
            
            if (hasShape) {
              presentShapes.push(elementId);
            } else {
              missingShapes.push(elementId);
            }
          }
        });
      }
      
      console.log(`🔍 Elements WITH BPMNShape: ${presentShapes.join(', ')}`);
      console.log(`❌ Elements WITHOUT BPMNShape: ${missingShapes.join(', ')}`);
      
      await this.waitForModelerReady();
      
      // NEW: Verify moddle extensions before import (like BpmnImporter)
      const moddle = modeler.get('moddle');
      console.log('🔍 DEBUG moddle before import:');
      console.log('  - Moddle available?', !!moddle);
      if (moddle) {
        console.log('  - Registry available?', !!moddle.registry);
        const packages = moddle.registry && moddle.registry.packages || {};
        console.log('  - Registered packages:', Object.keys(packages));
        
        // CRITICAL: Search extensions by index (not by name)
        const ppinotPackage = Object.values(packages).find(pkg => 
          pkg.name === 'PPINOTModdle' || pkg.prefix === 'PPINOT' || pkg.prefix === 'ppinot'
        );
        const ralphPackage = Object.values(packages).find(pkg => 
          pkg.name === 'RALph' || pkg.prefix === 'RALph' || pkg.prefix === 'ralph'
        );
        
        console.log('  - PPINOT package found?', !!ppinotPackage);
        console.log('  - RALPH package found?', !!ralphPackage);
        
        // VERIFICATION: Extensions are already registered
        if (ppinotPackage && ralphPackage) {
          console.log('✅ PPINOT and RALPH extensions are correctly registered');
        } else {
          console.warn('⚠️ Missing extensions - this could cause import problems');
          if (!ppinotPackage) console.warn('  - Missing PPINOT');
          if (!ralphPackage) console.warn('  - Missing RALPH');
        }
      }
      
      // Si faltan elementos, añadir BPMNShapes al XML (igual que ImportExportManager)
      let correctedXml = xmlContent;

      // Normalize PPINOT connection refs: source/target -> sourceRef/targetRef
      correctedXml = this.normalizePPINOTConnections(correctedXml);
      if (missingShapes.length > 0 && bpmnData.relationships) {
        console.log(`🔧 FIXING XML: Missing ${missingShapes.length} elements with BPMNShape`);
        correctedXml = this.addMissingBPMNShapes(xmlContent, bpmnData.relationships);
      }
      
      // Importar XML (corregido si era necesario)
      await modeler.importXML(correctedXml);
      console.log('✅ BPMN restaurado en el canvas');
      
      // CRITICAL: Esperar a que el XML se estabilice completamente
      await new Promise(resolve => setTimeout(resolve, 200));
      console.log('✅ XML estabilizado');
      
      // CRITICAL: Restaurar elementos PPINOT por separado (igual que BpmnImporter)
      if (bpmnData.ppinotElements && bpmnData.ppinotElements.length > 0) {
        console.log(`📊 Restaurando ${bpmnData.ppinotElements.length} PPINOT elements por separado...`);
        await this.restorePPINOTElements(modeler, bpmnData.ppinotElements);
      }
      
      
      // DEBUG: Verificar qué elementos están disponibles después de la importación
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      console.log('🔍 DEBUG - Elementos disponibles después de importar XML:');
      allElements.forEach(el => {
        if (el.id.includes('Target_') || el.id.includes('AggregatedMeasure_') || el.id.includes('Ppi_')) {
          console.log(`  - ${el.id} (${el.type})`);
        }
      });
      
      // Restaurar relaciones padre-hijo igual que ImportExportManager
      if (bpmnData.relationships && Array.isArray(bpmnData.relationships) && bpmnData.relationships.length > 0) {
        console.log(`🔄 Restaurando ${bpmnData.relationships.length} relaciones padre-hijo...`);
        
        // DEBUG: Mostrar relaciones que se van a restaurar
        console.log('🔍 DEBUG - Relaciones a restaurar:', bpmnData.relationships);
        
        try {
          // Usar RelationshipRestore
          const relationshipRestore = new RelationshipRestore(this.config);
          
          // CRITICAL: Esperar a que termine la restauración de relaciones
          console.log('🔄 Iniciando restauración de relaciones con espera inteligente...');
          const restoredCount = await relationshipRestore.waitForPPINOTElementsAndRestore(modeler, bpmnData.relationships);
          
          if (restoredCount > 0) {
            console.log(`✅ ${restoredCount}/${bpmnData.relationships.length} relaciones padre-hijo restauradas exitosamente`);
          } else {
            console.warn('⚠️ No se pudieron restaurar las relaciones padre-hijo');
          }
          
        } catch (error) {
          console.warn('Error restaurando relaciones:', error);
          // Continuar sin restaurar relaciones si hay error
        }
      }
      
      // Las etiquetas se restauran automáticamente con el XML como en import/export
      
    } catch (error) {
      console.error('Error restaurando BPMN:', error);
      throw error;
    }
  }

  /**
   * Ensure PPINOT connections use BPMN association refs (sourceRef/targetRef) for import
   */
  normalizePPINOTConnections(xml) {
    try {
      if (!xml || typeof xml !== 'string') return xml;

      // Replace attributes source="..." -> sourceRef="..." and target -> targetRef
      // Only inside PPINOT:* connection tags
      const connectionTypes = [
        'FromConnection', 'ToConnection', 'StartConnection', 'EndConnection',
        'AggregatedConnection', 'GroupedBy', 'ResourceArc', 'ConsequenceFlow',
        'TimeDistanceArcStart', 'TimeDistanceArcEnd', 'RFCStateConnection', 'MyConnection', 'DashedLine'
      ];

      connectionTypes.forEach((type) => {
        const openTag = new RegExp(`<PPINOT:${type}([^>]*)>`, 'g');
        xml = xml.replace(openTag, (match, attrs) => {
          let updated = attrs;
          // attribute-level replacements (avoid duplicating if already correct)
          updated = updated.replace(/\ssource="([^"]+)"/g, ' sourceRef="$1"');
          updated = updated.replace(/\starget="([^"]+)"/g, ' targetRef="$1"');
          // If both missing, leave as-is
          return `<PPINOT:${type}${updated}>`;
        });
        // Self-closing variant
        const selfClosing = new RegExp(`<PPINOT:${type}([^>]*)/>`, 'g');
        xml = xml.replace(selfClosing, (match, attrs) => {
          let updated = attrs;
          updated = updated.replace(/\ssource="([^"]+)"/g, ' sourceRef="$1"');
          updated = updated.replace(/\starget="([^"]+)"/g, ' targetRef="$1"');
          return `<PPINOT:${type}${updated}/>`;
        });
      });

      return xml;
    } catch (_) {
      return xml;
    }
  }

  /**
   * Adds missing BPMNShapes to XML (copied from BpmnImporter)
   */
  addMissingBPMNShapes(xmlContent, relationships) {
    console.log('🔧 Adding missing BPMNShapes to XML...');
    
    let modifiedXml = xmlContent;
    let addedCount = 0;
    
    // Search BPMNPlane section to add shapes
    const planeMatch = modifiedXml.match(/(<bpmndi:BPMNPlane[^>]*>)(.*?)(<\/bpmndi:BPMNPlane>)/s);
    if (!planeMatch) {
      console.warn('⚠️ BPMNPlane not found in XML');
      return xmlContent;
    }
    
    const planeStart = planeMatch[1];
    const planeContent = planeMatch[2];
    const planeEnd = planeMatch[3];
    
    let newShapes = '';
    
    // For each relationship, verify if child element has BPMNShape
    for (const rel of relationships) {
      const hasShape = xmlContent.includes(`${rel.childId}_di`);
      
      if (!hasShape && rel.position) {
        console.log(`🔧 Adding BPMNShape for: ${rel.childId}`);
        
        // Create BPMNShape based on element type
        const shapeXml = `
      <bpmndi:BPMNShape id="${rel.childId}_di" bpmnElement="${rel.childId}">
        <dc:Bounds x="${rel.position.childX}" y="${rel.position.childY}" width="${rel.position.width}" height="${rel.position.height}" />
      </bpmndi:BPMNShape>`;
        
        newShapes += shapeXml;
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      // Insert new shapes in BPMNPlane
      const newPlaneContent = planeContent + newShapes;
      modifiedXml = modifiedXml.replace(
        planeMatch[0], 
        planeStart + newPlaneContent + planeEnd
      );
      
      console.log(`✅ ${addedCount} BPMNShapes added to XML`);
    }
    
    return modifiedXml;
  }

  /**
   * Restores PPINOT elements separately (copied from BpmnImporter)
   */

  async restorePPINOTElements(modeler, ppinotElements) {
    console.log('🔧 Restoring PPINOT elements from separate data...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Modeler services not available');
    }

    let createdCount = 0;
    const createdElements = [];

    // Create elements in order: first PPIs, then other elements, then labels last
    const sortedElements = [...ppinotElements].sort((a, b) => {
      // Labels go last
      if (a.type === 'label' && b.type !== 'label') return 1;
      if (b.type === 'label' && a.type !== 'label') return -1;
      
      // PPIs go first (among non-labels)
      if (a.type === 'PPINOT:Ppi' && b.type !== 'PPINOT:Ppi') return -1;
      if (b.type === 'PPINOT:Ppi' && a.type !== 'PPINOT:Ppi') return 1;
      return 0;
    });

    for (const elementData of sortedElements) {
      try {
        // Check if element already exists
        const elementRegistry = modeler.get('elementRegistry');
        const existingElement = elementRegistry.get(elementData.id);
        if (existingElement) {
          console.log(`✅ Element already exists, skipping: ${elementData.id} (${elementData.type})`);
          createdElements.push(existingElement);
          continue;
        }

        // Determine parent
        let parentElement = canvas.getRootElement();
        if (elementData.parent) {
          const foundParent = createdElements.find(el => el.id === elementData.parent);
          if (foundParent) {
            parentElement = foundParent;
          }
        }

        // Manejar labels de forma especial
        if (elementData.type === 'label') {
          // Para labels, necesitamos encontrar el labelTarget primero
          const elementRegistry = modeler.get('elementRegistry');
          const labelTargetId = elementData.labelTargetId || elementData.id.replace('_label', ''); // Usar labelTargetId guardado o asumir convención
          const labelTarget = elementRegistry.get(labelTargetId);
          
          if (labelTarget) {
            // Crear la label usando elementFactory.createLabel
            const labelBusinessObject = {
              $type: 'bpmn:Label',
              name: elementData.text || 'Label'
            };
            
            const label = elementFactory.createLabel({
              id: elementData.id,
              businessObject: labelBusinessObject,
              type: 'label',
              labelTarget: labelTarget,
              width: elementData.width || 80,
              height: elementData.height || 20
            });
            
            // Establecer posición
            label.x = elementData.x;
            label.y = elementData.y;
            
            // Agregar al canvas usando modeling.createShape
            const createdLabel = modeling.createShape(
              label,
              { x: elementData.x, y: elementData.y },
              parentElement
            );
            
            if (createdLabel) {
              // Asociar la label con el target
              labelTarget.label = createdLabel;
              createdLabel.labelTarget = labelTarget;
              
              // Asegurar que el businessObject del target tenga el nombre
              if (!labelTarget.businessObject) {
                labelTarget.businessObject = {};
              }
              labelTarget.businessObject.name = elementData.text || 'Label';
              
              createdElements.push(createdLabel);
              createdCount++;
              console.log(`✅ PPINOT label restored: ${elementData.id} for target ${labelTargetId} with text "${elementData.text}"`);
            }
          } else {
            console.warn(`⚠️ Label target not found for label ${elementData.id}, expected target: ${labelTargetId}`);
          }
        } else {
          // Para elementos regulares (no labels)
          const element = elementFactory.create('shape', {
            type: elementData.type,
            id: elementData.id,
            width: elementData.width,
            height: elementData.height
          });

          // Create in canvas with exact position
          const createdElement = modeling.createShape(
            element,
            { x: elementData.x, y: elementData.y },
            parentElement
          );
          
          if (createdElement) {
            // Restaurar el texto si existe
            if (elementData.text && createdElement.businessObject) {
              createdElement.businessObject.name = elementData.text;
            }
            
            createdElements.push(createdElement);
            createdCount++;
            console.log(`✅ PPINOT element created: ${elementData.id} at (${elementData.x}, ${elementData.y})`);
          }
        }
        
      } catch (error) {
        console.warn(`⚠️ Error restoring ${elementData.id}:`, error.message);
      }
    }

    console.log(`🎉 ${createdCount}/${ppinotElements.length} PPINOT elements restored`);
  }

  async restoreRALPHElements(modeler, ralphElements) {
    // COPIAR EXACTAMENTE del BpmnImporter
    console.log('🔧 Restoring RALPH elements from separate data...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Modeler services not available');
    }

    let createdCount = 0;
    const createdElements = [];

    for (const elementData of ralphElements) {
      try {
        // Check if element already exists
        const elementRegistry = modeler.get('elementRegistry');
        const existingElement = elementRegistry.get(elementData.id);
        if (existingElement) {
          console.log(`✅ Element already exists, skipping: ${elementData.id} (${elementData.type})`);
          createdElements.push(existingElement);
          continue;
        }

        // Determine parent
        let parentElement = canvas.getRootElement();
        if (elementData.parent) {
          const foundParent = createdElements.find(el => el.id === elementData.parent);
          if (foundParent) {
            parentElement = foundParent;
          }
        }

        // Create simple and effective element
        const element = elementFactory.create('shape', {
          type: elementData.type,
          id: elementData.id,
          width: elementData.width,
          height: elementData.height
        });

        // Create in canvas with exact position
        const createdElement = modeling.createShape(
          element,
          { x: elementData.x, y: elementData.y },
          parentElement
        );
        
        if (createdElement) {
          createdElements.push(createdElement);
          createdCount++;
          console.log(`✅ RALPH element created: ${elementData.id} at (${elementData.x}, ${elementData.y})`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error restoring ${elementData.id}:`, error.message);
      }
    }

    console.log(`🎉 ${createdCount}/${ralphElements.length} RALPH elements restored`);
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
        // Purga inmediata de PPIs inválidos (no vinculados a elementos PPINOT:Ppi)
        try {
          if (typeof ppiManager.verifyExistingPPIsInCanvas === 'function') {
            ppiManager.verifyExistingPPIsInCanvas();
          }
        } catch (_) { /* no-op */ }
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
      
      // DEBUG: Mostrar estructura de datos cargados
      console.log('🔍 DEBUG - Estructura completa de datos cargados desde localStorage:', {
        version: parsed.version,
        timestamp: parsed.timestamp,
        savedAt: parsed.savedAt,
        data: parsed.data ? {
          bpmn: parsed.data.bpmn ? {
            hasDiagram: !!parsed.data.bpmn.diagram,
            hasRelationships: !!parsed.data.bpmn.relationships,
            relationshipsCount: (parsed.data.bpmn.relationships && parsed.data.bpmn.relationships.length) || 0,
            relationshipsPreview: (parsed.data.bpmn.relationships && parsed.data.bpmn.relationships.slice(0, 2)) || [] // Mostrar solo las primeras 2
          } : 'No disponible',
          ppi: parsed.data.ppi ? {
            indicatorsCount: (parsed.data.ppi.indicators && parsed.data.ppi.indicators.length) || 0
          } : 'No disponible'
        } : 'No data property'
      });
      
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
  savePPIs() {
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
      const diagramName = metadata.diagramName;
      
      // Restaurar nombre del diagrama en múltiples ubicaciones
      const registry = resolve('ServiceRegistry');
      if (registry && registry.get) {
        // Fuente 1: AppService
        const appService = registry.get('AppService');
        if (appService) {
          if (appService.setCurrentFileName) {
            appService.setCurrentFileName(diagramName);
            console.log(`📝 Nombre restaurado en AppService: ${diagramName}`);
          } else if (appService.currentFileName !== undefined) {
            appService.currentFileName = diagramName;
            console.log(`📝 Nombre asignado directamente a AppService: ${diagramName}`);
          }
        }
      }
      
      // Fuente 2: Actualizar título del DOM
      const titleElement = document.querySelector('title');
      if (titleElement) {
        titleElement.textContent = diagramName;
        console.log(`📝 Título DOM actualizado: ${diagramName}`);
      }
      
      // Fuente 3: Guardar en localStorage para persistencia
      localStorage.setItem('current_diagram_name', diagramName);
      console.log(`📝 Nombre guardado en localStorage: ${diagramName}`);
      
      // Fuente 4: Actualizar cualquier input de nombre de archivo visible
      const nameSelectors = [
        '#fileName', 
        '.file-name-input', 
        'input[name="fileName"]',
        'input[name*="name"]',
        'input[id*="name"]',
        'input[class*="name"]',
        'input[placeholder*="nombre"]',
        'input[placeholder*="archivo"]'
      ];
      
      let updatedInputs = 0;
      for (const selector of nameSelectors) {
        const inputs = document.querySelectorAll(selector);
        inputs.forEach(input => {
          if (input && input.type === 'text') {
            input.value = diagramName;
            updatedInputs++;
          }
        });
      }
      
      if (updatedInputs > 0) {
        console.log(`📝 ${updatedInputs} inputs de nombre actualizados: ${diagramName}`);
      }
      
      console.log(`✅ Metadata restaurada completamente - Nombre: ${diagramName}`);
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

  /**
   * Método de debug para restaurar relaciones manualmente
   */
  async debugRestoreRelationships() {
    try {
      console.log('🔧 DEBUG: Iniciando restauración manual de relaciones...');
      
      const projectData = await this.loadFromLocalStorage();
      if (!projectData || !projectData.bpmn || !projectData.bpmn.relationships) {
        console.log('❌ No hay relaciones guardadas para restaurar');
        return { success: false, reason: 'No relationships found' };
      }

      const modeler = resolve('BpmnModeler');
      if (!modeler) {
        console.log('❌ Modeler no disponible');
        return { success: false, reason: 'Modeler not available' };
      }

      const relationshipRestore = new RelationshipRestore(this.config);
      const restoredCount = await relationshipRestore.fallbackRestore(modeler, projectData.bpmn.relationships);
      
      console.log(`🎉 DEBUG: ${restoredCount} relaciones restauradas manualmente`);
      return { success: true, restoredCount };
      
    } catch (error) {
      console.error('❌ Error en restauración manual:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Método de debug para verificar el estado de las relaciones
   */
  debugCheckRelationships() {
    try {
      const projectData = JSON.parse(localStorage.getItem(this.config.storageKey));
      if (!projectData || !projectData.data || !projectData.data.bpmn) {
        console.log('❌ No hay datos BPMN guardados');
        return;
      }

      const relationships = projectData.data.bpmn.relationships || [];
      console.log(`🔍 DEBUG: Estado de las relaciones guardadas:`);
      console.log(`  📊 Total relaciones: ${relationships.length}`);
      
      if (relationships.length > 0) {
        console.log('  📋 Relaciones guardadas:');
        relationships.forEach((rel, index) => {
          console.log(`    ${index + 1}. ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
          console.log(`       Posición: (${(rel.position && rel.position.childX) || 'N/A'}, ${(rel.position && rel.position.childY) || 'N/A'})`);
          console.log(`       Timestamp: ${rel.timestamp ? new Date(rel.timestamp).toLocaleString() : 'N/A'}`);
        });
      }

      // Verificar elementos actuales en el canvas
      const modeler = resolve('BpmnModeler');
      if (modeler) {
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        const ppinotElements = allElements.filter(el => 
          el.type && (el.type.includes('PPINOT:') || el.type.includes('ppinot:'))
        );
        
        console.log(`  🎯 Elementos PPINOT actuales en canvas: ${ppinotElements.length}`);
        ppinotElements.forEach(el => {
          const parentId = el.parent ? el.parent.id : 'none';
          console.log(`    - ${el.id} (${el.type}) → Padre: ${parentId}`);
        });
      }
      
    } catch (error) {
      console.error('❌ Error verificando relaciones:', error);
    }
  }

  /**
   * Habilita/deshabilita el autoguardado para evitar conflictos durante la restauración
   */
  setAutoSaveEnabled(enabled) {
    try {
      const registry = resolve('ServiceRegistry');
      if (registry) {
        const autosave = registry.get('localStorageAutoSaveManager');
        if (autosave && typeof autosave.setEnabled === 'function') {
          autosave.setEnabled(enabled);
          console.log(`🔧 Autoguardado ${enabled ? 'habilitado' : 'deshabilitado'}`);
        } else {
          console.log(`⚠️ AutoSaveManager no disponible para ${enabled ? 'habilitar' : 'deshabilitar'} autoguardado`);
        }
      } else {
        console.log(`⚠️ ServiceRegistry no disponible para ${enabled ? 'habilitar' : 'deshabilitar'} autoguardado`);
      }
    } catch (error) {
      console.warn('⚠️ Error configurando autoguardado:', error.message);
    }
  }

  /**
   * Inicializa el localStorageAutoSaveManager en el ServiceRegistry
   */
  initializeAutoSaveManager() {
    try {
      const registry = resolve('ServiceRegistry');
      if (registry) {
        // Crear una implementación simple que delegue al LocalStorageManager
        const autoSaveManager = {
          enabled: true,
          setEnabled: (enabled) => {
            this.autoSaveEnabled = enabled;
            console.log(`🔧 AutoSaveManager ${enabled ? 'habilitado' : 'deshabilitado'}`);
          },
          forceSave: async () => {
            if (!this.autoSaveEnabled) {
              console.log('🔒 AutoSaveManager deshabilitado - guardado omitido');
              return { success: false, reason: 'AutoSave disabled' };
            }
            console.log('💾 AutoSaveManager ejecutando forceSave...');
            return await this.saveProject();
          },
          forceRestore: async () => {
            console.log('🔄 AutoSaveManager ejecutando forceRestore...');
            return await this.loadProject();
          },
          clearProjectState: () => {
            console.log('🧹 AutoSaveManager limpiando estado del proyecto...');
            localStorage.removeItem('multinotation_project_data');
            localStorage.removeItem('draft:multinotation');
          }
        };

        registry.register('localStorageAutoSaveManager', autoSaveManager, {
          description: 'AutoSaveManager que delega al LocalStorageManager'
        });
        console.log('✅ localStorageAutoSaveManager inicializado');
      }
    } catch (error) {
      console.warn('⚠️ Error inicializando AutoSaveManager:', error.message);
    }
  }
  
  /**
   * Restaura datos de formularios de la aplicación
   */
  async restoreFormData(formData) {
    try {
      console.log('📋 Restaurando datos de formulario...');
      
      if (formData.projectSettings) {
        // Restaurar configuraciones de proyecto
        if (formData.projectSettings.name) {
          localStorage.setItem('projectName', formData.projectSettings.name);
          document.title = formData.projectSettings.name;
          
          // Actualizar el input del nombre del proyecto
          const projectNameInput = document.getElementById('project-name-input');
          if (projectNameInput) {
            projectNameInput.value = formData.projectSettings.name;
            console.log('📝 Título DOM actualizado:', formData.projectSettings.name);
          }
          
          // Actualizar variable global
          window.currentProjectName = formData.projectSettings.name;
          console.log('📝 Nombre guardado en localStorage:', formData.projectSettings.name);
          
          // Actualizar múltiples inputs si existen (para compatibilidad)
          const allNameInputs = document.querySelectorAll('input[type="text"][placeholder*="nombre"], input[type="text"][placeholder*="Nombre"], #project-name-input, .project-name-input');
          let updatedInputs = 0;
          allNameInputs.forEach(input => {
            if (input && input.value !== formData.projectSettings.name) {
              input.value = formData.projectSettings.name;
              updatedInputs++;
            }
          });
          console.log('📝', updatedInputs, 'inputs de nombre actualizados:', formData.projectSettings.name);
          
          console.log('✅ Metadata restaurada completamente - Nombre:', formData.projectSettings.name);
        }
        if (formData.projectSettings.description) {
          localStorage.setItem('projectDescription', formData.projectSettings.description);
        }
        if (formData.projectSettings.author) {
          localStorage.setItem('projectAuthor', formData.projectSettings.author);
        }
        if (formData.projectSettings.version) {
          localStorage.setItem('projectVersion', formData.projectSettings.version);
        }
      }
      
      if (formData.userPreferences) {
        // Restaurar preferencias de usuario
        Object.entries(formData.userPreferences).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
      }
      
      // Restaurar datos del formulario PPI si existen
      if (formData.ppiFormSettings && Object.keys(formData.ppiFormSettings).length > 0) {
        // Guardar los datos del formulario PPI en localStorage para restaurar más tarde
        localStorage.setItem('savedPPIFormData', JSON.stringify(formData.ppiFormSettings));
        console.log('📝 Datos del formulario PPI guardados para restauración:', Object.keys(formData.ppiFormSettings).length, 'campos');
        
        // Si hay un modal PPI abierto, restaurar inmediatamente
        const ppiModal = document.getElementById('ppi-modal');
        if (ppiModal && ppiModal.style.display !== 'none') {
          this.restorePPIFormData(formData.ppiFormSettings);
        }
      }
      
      // También actualizar el nombre del proyecto en ImportExportManager
      if (formData.projectSettings && formData.projectSettings.name) {
        try {
          const registry = resolve('ServiceRegistry');
          const importManager = registry ? registry.get('ImportExportManager') : null;
          if (importManager && typeof importManager.setProjectName === 'function') {
            importManager.setProjectName(formData.projectSettings.name);
            console.log('✅ Nombre del proyecto actualizado en ImportExportManager:', formData.projectSettings.name);
          }
        } catch (e) {
          console.warn('⚠️ No se pudo actualizar ImportExportManager:', e.message);
        }
      }
      
      console.log('✅ Datos de formulario restaurados correctamente');
      
    } catch (error) {
      console.warn('Error restaurando datos de formulario:', error);
    }
  }
  
  /**
   * Restaura los datos del formulario PPI en el modal
   */
  restorePPIFormData(ppiFormData) {
    try {
      const ppiModal = document.getElementById('ppi-modal');
      if (!ppiModal) return;
      
      const form = ppiModal.querySelector('form');
      if (!form) return;
      
      // Restaurar cada campo del formulario
      Object.entries(ppiFormData).forEach(([fieldName, value]) => {
        if (fieldName === 'editingPPIId') return; // Skip meta fields
        
        const input = form.querySelector(`[name="${fieldName}"]`);
        if (input && value !== undefined && value !== null) {
          input.value = value;
          console.log(`📝 Campo PPI restaurado: ${fieldName} = ${value}`);
        }
      });
      
      console.log('✅ Formulario PPI restaurado con', Object.keys(ppiFormData).length, 'campos');
      
    } catch (error) {
      console.warn('Error restaurando formulario PPI:', error);
    }
  }
}

// Exportar instancia singleton
export default new LocalStorageManager();
