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
      console.log('💾 Iniciando guardado del proyecto...');
      console.log('🔍 DEBUG - Iniciando proceso de guardado completo...');

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
      const result = await modeler.saveXML({ format: true });
      const xmlContent = result.xml;
      console.log('✅ BPMN XML capturado');
      
      // CRITICAL: Verificar si elementos PPINOT están en el XML (igual que BpmnExporter)
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      const ppinotElements = allElements.filter(el => 
        el.type && (el.type.includes('PPINOT:') || el.type.includes('ppinot:'))
      );
      
      console.log(`🔍 XML verification: ${ppinotElements.length} PPINOT elements in canvas`);
      
      const missingFromXml = ppinotElements.filter(el => 
        !xmlContent.includes(`id="${el.id}"`)
      );
      
      let ppinotElementsData = [];
      if (missingFromXml.length > 0) {
        console.log(`📋 Saving ${missingFromXml.length} PPINOT elements separately...`);
        ppinotElementsData = this.serializePPINOTElements(ppinotElements);
        console.log(`✅ ${ppinotElementsData.length} PPINOT elements saved separately`);
      }
      
      // Crear estructura de datos igual que ImportExportManager
      const bpmnData = {
        diagram: xmlContent,
        relationships: [],
        ppinotElements: ppinotElementsData
      };
      
      // Capturar relaciones padre-hijo con múltiples métodos
      try {
        // Método 1: Usar RelationshipCapture
        const relationshipCapture = new RelationshipCapture(this.config);
        const capturedRelationships = relationshipCapture.captureParentChildRelationships(modeler);
        
        console.log(`🔍 RelationshipCapture encontró ${capturedRelationships.length} relaciones`);
        
        // Método 2: Captura directa de elementos PPINOT
        const directRelationships = this.capturePPINOTRelationshipsDirect(modeler);
        console.log(`🔍 Captura directa encontró ${directRelationships.length} relaciones PPINOT`);
        
        // Combinar ambas fuentes de relaciones
        const allRelationships = [...capturedRelationships, ...directRelationships];
        
        // Eliminar duplicados basándose en childId
        const uniqueRelationships = allRelationships.filter((rel, index, self) => 
          index === self.findIndex(r => r.childId === rel.childId)
        );
        
        bpmnData.relationships = uniqueRelationships;
        console.log(`✅ ${bpmnData.relationships.length} relaciones padre-hijo capturadas (${capturedRelationships.length} + ${directRelationships.length} - duplicados)`);
        
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
  
  /**
   * Calcula la distancia entre dos elementos
   */
  calculateDistance(element1, element2) {
    const x1 = element1.x || 0;
    const y1 = element1.y || 0;
    const x2 = element2.x || 0;
    const y2 = element2.y || 0;
    
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }

  async capturePPIData() {
    try {
      const ppiManager = resolve('PPIManagerInstance');
      const indicators = (ppiManager && ppiManager.core && ppiManager.core.getAllPPIs) ? ppiManager.core.getAllPPIs() : [];
      
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
      { key: 'metadata', method: 'restoreMetadata' }
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
      
      // Si faltan elementos, añadir BPMNShapes al XML (igual que ImportExportManager)
      let correctedXml = xmlContent;
      if (missingShapes.length > 0 && bpmnData.relationships) {
        console.log(`🔧 FIXING XML: Missing ${missingShapes.length} elements with BPMNShape`);
        correctedXml = this.addMissingBPMNShapes(xmlContent, bpmnData.relationships);
      }
      
      // Importar XML (corregido si era necesario)
      await modeler.importXML(correctedXml);
      console.log('✅ BPMN restaurado en el canvas');
      
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
          
          // Usar el método correcto que espera a que los elementos estén listos
          console.log('🔄 Iniciando restauración de relaciones con espera inteligente...');
          relationshipRestore.waitForPPINOTElementsAndRestore(modeler, bpmnData.relationships);
          
        } catch (error) {
          console.warn('Error restaurando relaciones:', error);
          // Continuar sin restaurar relaciones si hay error
        }
      } else {
        console.log('ℹ️ No hay relaciones padre-hijo para restaurar');
        if (bpmnData.relationships) {
          console.log('🔍 DEBUG - Estructura de bpmnData.relationships:', bpmnData.relationships);
        }
      }
      
    } catch (error) {
      console.error('Error restaurando BPMN:', error);
      throw error;
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

    // Create elements in order: first PPIs, then children
    const sortedElements = [...ppinotElements].sort((a, b) => {
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
          console.log(`✅ PPINOT element created: ${elementData.id} at (${elementData.x}, ${elementData.y})`);
        }
        
      } catch (error) {
        console.warn(`⚠️ Error restoring ${elementData.id}:`, error.message);
      }
    }

    console.log(`🎉 ${createdCount}/${ppinotElements.length} PPINOT elements restored`);
  }

  /**
   * Serializes PPINOT elements for separate storage (copied from BpmnExporter)
   */
  serializePPINOTElements(elements) {
    return elements.map(el => ({
      type: el.type,
      id: el.id,
      width: el.width || 100,
      height: el.height || 80,
      x: el.x || 0,
      y: el.y || 0,
      text: el.businessObject && el.businessObject.name || null,
      parent: el.parent && el.parent.id || null
    }));
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
}

// Exportar instancia singleton
export default new LocalStorageManager();
