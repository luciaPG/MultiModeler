/**
 * ImportExportManager - Sistema Puro
 * 
 * Basado en patrones de ralphLu y ppinot-visual
 * - Captura directa del canvas actual (sin localStorage)
 * - Restauración robusta de relaciones padre-hijo
 * - Compatible con BPMN.js oficial
 * - Mantiene elementos unidos con moveElements/moveShape
 */

import { resolve } from '../../../services/global-access.js';
import { getServiceRegistry } from '../core/ServiceRegistry.js';
import { RasciStore } from '../../rasci/store.js';

class ImportExportManager {
  constructor() {
    this.fileExtension = '.mmproject';
    this.projectName = 'Nuevo Diagrama';
    this.version = '2.0.0'; // Versión nueva para sistema puro
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createFileInput();
    this.registerService();
  }

  registerService() {
    const sr = getServiceRegistry();
    if (sr) {
      sr.register('ImportExportManager', this);
      console.log('✅ ImportExportManager registrado - Sistema puro sin localStorage');
      
      // API global para testing
      if (typeof window !== 'undefined') {
        window.exportProjectPure = () => this.exportProject();
        window.importProjectPure = () => this.importProject();
        window.debugCanvasState = () => this.debugCanvasState();
        window.testRelationships = () => this.testRelationshipCapture();
        window.debugPPINOTRelations = () => this.debugPPINOTSpecificRelations();
        window.forceRestoreRelations = (projectData) => this.forceRestoreRelations(projectData);
        window.testTargetScopeRelations = () => this.testTargetScopeRelations();
        window.verifyXMLImport = () => this.verifyXMLImport();
      }
    }
  }

  setupEventListeners() {
    const exportBtn = document.getElementById('test-export-btn');
    if (exportBtn) {
      exportBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.exportProject();
      });
    }
  }

  createFileInput() {
    let fileInput = document.getElementById('import-export-file-input-pure');
    if (!fileInput) {
      fileInput = document.createElement('input');
      fileInput.id = 'import-export-file-input-pure';
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

  // ==================== EXPORTACIÓN PURA (CAPTURA DIRECTA DEL CANVAS) ====================

  async exportProject() {
    try {
      console.log('📤 Exportando proyecto - Captura directa del canvas...');
      
      const projectData = {
        version: this.version,
        exportDate: new Date().toISOString(),
        bpmn: await this.captureBpmnFromCanvas(),
        ppi: await this.capturePPIFromCanvas(),
        rasci: await this.captureRasciFromStores(),
        ralph: await this.captureRalphFromCanvas()
      };

      const sanitizedName = this.projectName.replace(/[^a-z0-9áéíóúñü\s-]/gi, '').replace(/\s+/g, '-').toLowerCase();
      const fileName = `${sanitizedName}-${new Date().toISOString().split('T')[0]}.mmproject`;
      this.downloadFile(projectData, fileName);
      
      console.log('✅ Proyecto exportado - Estado actual del canvas capturado');
      this.showMessage('Proyecto exportado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error exportando:', error);
      this.showMessage('Error al exportar: ' + error.message, 'error');
    }
  }

  async captureBpmnFromCanvas() {
    const modeler = resolve('BpmnModeler');
    const data = { 
      diagram: null, 
      relationships: [],
      elements: {},
      canvas: null
    };
    
    if (!modeler) {
      console.warn('⚠️ Modeler no disponible para captura');
      return data;
    }

    try {
      // 1. Capturar XML actual (patrón oficial BPMN.js)
      const result = await modeler.saveXML({ format: true });
      data.diagram = result.xml;
      console.log('✅ XML del canvas capturado');
      
      // CRÍTICO: Verificar que TODOS los elementos PPINOT estén en el XML
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      const ppinotElements = allElements.filter(el => 
        el.type && (el.type.includes('PPINOT:') || el.type.includes('ppinot:'))
      );
      
      console.log(`🔍 VERIFICACIÓN XML: ${ppinotElements.length} elementos PPINOT en canvas`);
      ppinotElements.forEach(el => {
        const inXml = data.diagram.includes(`id="${el.id}"`);
        console.log(`  - ${el.id} (${el.type}): ${inXml ? '✅ en XML' : '❌ FALTA en XML'}`);
      });
      
      // NUEVO: En lugar de forzar en XML, guardar elementos por separado (estilo CBPMN mejorado)
      const missingFromXml = ppinotElements.filter(el => !data.diagram.includes(`id="${el.id}"`));
      if (missingFromXml.length > 0) {
        console.log(`📋 Guardando ${missingFromXml.length} elementos PPINOT por separado (estilo CBPMN)...`);
        
        // Guardar elementos PPINOT como datos separados
        data.ppinotElements = ppinotElements.map(el => ({
          type: el.type,
          id: el.id,
          width: el.width || 100,
          height: el.height || 80,
          x: el.x || 0,
          y: el.y || 0,
          text: el.businessObject?.name || null,
          parent: el.parent?.id || null
        }));
        
        console.log(`✅ ${data.ppinotElements.length} elementos PPINOT guardados por separado`);
      }

      // 2. Capturar relaciones padre-hijo directamente del canvas (patrón ppinot-visual)
      data.relationships = this.captureParentChildRelationships(modeler);
      console.log(`✅ ${data.relationships.length} relaciones padre-hijo capturadas`);
      
      // 3. Capturar elementos PPINOT del canvas (patrón ppinot-visual)
      if (modeler.getJson && typeof modeler.getJson === 'function') {
        const ppinotData = modeler.getJson();
        data.ppinotElements = ppinotData.definitions || [];
        data.ppinotDiagram = ppinotData.diagram || [];
        data.ppinotIdMap = ppinotData.idMap || {};
        console.log(`✅ ${data.ppinotElements.length} elementos PPINOT capturados`);
      }
      
      // 4. Capturar elementos RALPH por separado (estilo CBPMN extendido)
      const ralphElements = allElements.filter(el => 
        el.type && (el.type.includes('RALph:') || el.type.includes('ralph:'))
      );
      
      if (ralphElements.length > 0) {
        data.ralphElements = ralphElements.map(el => ({
          type: el.type,
          id: el.id,
          width: el.width || 50,
          height: el.height || 50,
          x: el.x || 0,
          y: el.y || 0,
          text: el.businessObject?.name || null,
          parent: el.parent?.id || null
        }));
        
        console.log(`✅ ${data.ralphElements.length} elementos RALPH guardados por separado`);
    } else {
        data.ralphElements = [];
        console.log('✅ 0 elementos RALPH capturados');
      }

      // 5. Capturar estado del canvas (zoom, pan, etc.)
      const canvas = modeler.get('canvas');
      if (canvas) {
        data.canvas = {
          zoom: canvas.zoom(),
          viewbox: canvas.viewbox()
        };
        console.log('✅ Estado del canvas capturado');
      }

    } catch (error) {
      console.error('❌ Error capturando BPMN del canvas:', error);
    }
    
    return data;
  }

  captureParentChildRelationships(modeler) {
    const relationships = [];
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // MÉTODO 1: Capturar relaciones visuales del canvas (patrón ralphLu)
      this.captureVisualRelationships(allElements, relationships);
      
      // MÉTODO 2: Capturar relaciones por proximidad (patrón ppinot-visual)
      this.captureProximityRelationships(allElements, relationships);
      
      // MÉTODO 3: Capturar relaciones desde businessObject (patrón ppinot-visual)
      this.captureBusinessObjectRelationships(allElements, relationships);

      console.log(`🔗 Capturadas ${relationships.length} relaciones significativas del canvas`);
      
    } catch (error) {
      console.error('❌ Error capturando relaciones:', error);
    }
    
    return relationships;
  }

  captureVisualRelationships(allElements, relationships) {
    // Capturar relaciones que ya están establecidas visualmente en el canvas
    allElements.forEach(element => {
      if (element.parent && element.parent.id && element.parent.id !== '__implicitroot') {
        
        // FILTRO: Solo relaciones PPINOT/RALPH significativas
        const isSignificant = this.isSignificantParentChildRelationship(element, element.parent);
        
        if (isSignificant) {
          const relationship = {
            childId: element.id,
            parentId: element.parent.id,
            childName: this.getElementName(element),
            parentName: this.getElementName(element.parent),
            childType: this.getElementType(element),
            parentType: this.getElementType(element.parent),
            position: this.getElementPosition(element),
            timestamp: Date.now(),
            source: 'visual_canvas'
          };

          relationships.push(relationship);
          console.log(`🔗 Relación visual: ${relationship.childName} → ${relationship.parentName}`);
        }
      }
    });
  }

  captureProximityRelationships(allElements, relationships) {
    // Detectar relaciones por proximidad (elementos PPINOT cerca de PPIs)
    const ppiElements = allElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );

    const childElements = allElements.filter(el => 
      el.type && el.type.includes('PPINOT:') && 
      !el.type.includes('PPINOT:Ppi') &&
      el.type !== 'label'
    );

    childElements.forEach(child => {
      // Solo si no tiene padre ya establecido
      const alreadyHasRelation = relationships.some(rel => rel.childId === child.id);
      if (alreadyHasRelation) return;

      // Buscar PPI más cercano
      const closestPPI = this.findClosestPPI(child, ppiElements);
      
      if (closestPPI) {
        const relationship = {
          childId: child.id,
          parentId: closestPPI.id,
          childName: this.getElementName(child),
          parentName: this.getElementName(closestPPI),
          childType: this.getElementType(child),
          parentType: this.getElementType(closestPPI),
          position: this.getElementPosition(child),
          timestamp: Date.now(),
          source: 'proximity_detection'
        };

        relationships.push(relationship);
        console.log(`🔗 Relación por proximidad: ${relationship.childName} → ${relationship.parentName}`);
      }
    });
  }

  captureBusinessObjectRelationships(allElements, relationships) {
    // Capturar relaciones desde businessObject.$parent (patrón ppinot-visual)
    allElements.forEach(element => {
      if (element.businessObject && element.businessObject.$parent) {
        const parentId = element.businessObject.$parent.id;
        
        // Solo si no tiene relación ya establecida
        const alreadyHasRelation = relationships.some(rel => rel.childId === element.id);
        if (alreadyHasRelation) return;

        // Buscar el elemento padre
        const parentElement = allElements.find(el => el.id === parentId);
        if (parentElement && this.isSignificantParentChildRelationship(element, parentElement)) {
          
          const relationship = {
            childId: element.id,
            parentId: parentId,
            childName: this.getElementName(element),
            parentName: this.getElementName(parentElement),
            childType: this.getElementType(element),
            parentType: this.getElementType(parentElement),
            position: this.getElementPosition(element),
            timestamp: Date.now(),
            source: 'businessObject_parent',
            businessObjectParent: parentId
          };

          relationships.push(relationship);
          console.log(`🔗 Relación businessObject: ${relationship.childName} → ${relationship.parentName}`);
        }
      }
    });
  }

  findClosestPPI(childElement, ppiElements) {
    if (!ppiElements || ppiElements.length === 0) return null;

    const childPos = this.getElementPosition(childElement);
    const childCenter = { 
      x: childPos.x + childPos.width / 2, 
      y: childPos.y + childPos.height / 2 
    };

    let closestPPI = null;
    let minDistance = Infinity;
    const maxDistance = 400; // Máximo 400px de distancia

    ppiElements.forEach(ppi => {
      const ppiPos = this.getElementPosition(ppi);
      const ppiCenter = { 
        x: ppiPos.x + ppiPos.width / 2, 
        y: ppiPos.y + ppiPos.height / 2 
      };

      const distance = Math.sqrt(
        Math.pow(childCenter.x - ppiCenter.x, 2) + 
        Math.pow(childCenter.y - ppiCenter.y, 2)
      );

      if (distance < minDistance && distance <= maxDistance) {
        minDistance = distance;
        closestPPI = ppi;
      }
    });

    return closestPPI;
  }

  isSignificantParentChildRelationship(child, parent) {
    // EXPANDIDO: Capturar TODAS las relaciones PPINOT/RALPH importantes
    
    // 1. CUALQUIER elemento PPINOT hijo de PPI
    if (child.type && child.type.includes('PPINOT:') && 
        parent.type && parent.type.includes('PPINOT:Ppi')) {
      console.log(`✅ Relación PPINOT→PPI: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 2. Target específicamente (muy importante)
    if (child.type && child.type.includes('Target') && 
        parent.type && parent.type.includes('PPINOT:')) {
      console.log(`✅ Relación Target: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 3. Scope específicamente (muy importante)
    if (child.type && child.type.includes('Scope') && 
        parent.type && parent.type.includes('PPINOT:')) {
      console.log(`✅ Relación Scope: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 4. BaseMeasure específicamente
    if (child.type && child.type.includes('BaseMeasure') && 
        parent.type && parent.type.includes('PPINOT:')) {
      console.log(`✅ Relación BaseMeasure: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 5. AggregatedMeasure (ya funcionaba)
    if (child.type && child.type.includes('AggregatedMeasure') && 
        parent.type && parent.type.includes('PPINOT:')) {
      console.log(`✅ Relación AggregatedMeasure: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 6. DerivedMeasure
    if (child.type && child.type.includes('DerivedMeasure') && 
        parent.type && parent.type.includes('PPINOT:')) {
      console.log(`✅ Relación DerivedMeasure: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 7. Elementos RALPH con padres específicos
    if (child.type && child.type.includes('RALPH') && 
        parent.type && !parent.type.includes('Process')) {
      console.log(`✅ Relación RALPH: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 8. Labels de elementos PPINOT/RALPH (muy importante)
    if (child.type === 'label' && parent.type && 
        (parent.type.includes('PPINOT') || parent.type.includes('RALPH'))) {
      console.log(`✅ Relación Label: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // 9. Elementos anidados (Measure → Scope, Condition → Target)
    if (child.type && parent.type && 
        child.type.includes('PPINOT:') && parent.type.includes('PPINOT:') &&
        !parent.type.includes('Process') && !parent.type.includes('Ppi')) {
      console.log(`✅ Relación anidada: ${child.type} → ${parent.type}`);
      return true;
    }
    
    // Ignorar relaciones con Process como padre (son automáticas de BPMN)
    if (parent.type && parent.type.includes('Process')) {
      return false;
    }
    
    return false;
  }

  async capturePPIFromCanvas() {
    const ppiManager = resolve('PPIManagerInstance');
    
    // Capturar PPIs directamente del manager (no de localStorage)
    const indicators = (ppiManager && ppiManager.core && ppiManager.core.getAllPPIs) ? 
                     ppiManager.core.getAllPPIs() : [];
    
    console.log(`✅ ${indicators.length} PPIs capturados del manager`);
    
    return {
      indicators,
      captureDate: new Date().toISOString()
    };
  }

  async captureRasciFromStores() {
    // Capturar RASCI directamente de los stores (patrón store)
    const data = {
      roles: RasciStore.getRoles() || [],
      matrix: RasciStore.getMatrix() || {},
      captureDate: new Date().toISOString()
    };
    
    console.log(`✅ RASCI capturado: ${data.roles.length} roles, ${Object.keys(data.matrix).length} entradas matriz`);
    
    return data;
  }

  async captureRalphFromCanvas() {
    const modeler = resolve('BpmnModeler');
    const data = {
      elements: [],
      captureDate: new Date().toISOString()
    };
    
    if (modeler) {
      try {
        // Capturar elementos RALPH del canvas directamente
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        // Filtrar elementos RALPH
        const ralphElements = allElements.filter(element => 
          element.type && element.type.includes('RALPH') ||
          (element.businessObject && element.businessObject.$type && element.businessObject.$type.includes('RALPH'))
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
        
        console.log(`✅ ${data.elements.length} elementos RALPH capturados del canvas`);
        
      } catch (error) {
        console.warn('⚠️ Error capturando elementos RALPH:', error);
      }
    }
    
    return data;
  }

  // ==================== IMPORTACIÓN PURA (RESTAURACIÓN DIRECTA AL CANVAS) ====================

  async loadProjectFromFile(file) {
    try {
      console.log('📥 Cargando proyecto - Restauración directa al canvas...');
      
      const text = await file.text();
      const projectData = JSON.parse(text);
      
      // Importar en orden: BPMN → Relaciones → PPI → RASCI → RALPH
      if (projectData.bpmn) await this.restoreBpmnToCanvas(projectData.bpmn);
      if (projectData.ppi) await this.restorePPIToCanvas(projectData.ppi);
      if (projectData.rasci) await this.restoreRasciToStores(projectData.rasci);
      if (projectData.ralph) await this.restoreRalphToCanvas(projectData.ralph);
      
      console.log('✅ Proyecto importado - Estado restaurado al canvas');
      this.showMessage('Proyecto importado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error importando:', error);
      this.showMessage('Error al importar: ' + error.message, 'error');
    }
  }

  async restoreBpmnToCanvas(bpmnData) {
    const modeler = resolve('BpmnModeler');
    if (!modeler) return;

    try {
      // CRÍTICO: Verificar si elementos tienen BPMNShape
      let missingShapes = [];
      let presentShapes = [];
      
      // 1. Importar XML al canvas (patrón oficial BPMN.js)
      if (bpmnData.diagram) {
        console.log('🔍 DEBUG XML antes de importar:');
        console.log('  - Contiene PPINOT?', bpmnData.diagram.includes('ppinot:'));
        console.log('  - Contiene Target?', bpmnData.diagram.includes('Target_'));
        console.log('  - Contiene AggregatedMeasure?', bpmnData.diagram.includes('AggregatedMeasure_'));
        
        // Buscar elementos en <bpmn:process>
        const processMatch = bpmnData.diagram.match(/<bpmn:process[^>]*>(.*?)<\/bpmn:process>/s);
        if (processMatch) {
          const processContent = processMatch[1];
          const ppinotElements = processContent.match(/<PPINOT:[^>]+id="([^"]+)"/g) || [];
          
          console.log(`🔍 Elementos PPINOT en <bpmn:process>: ${ppinotElements.length}`);
          
          ppinotElements.forEach(match => {
            const idMatch = match.match(/id="([^"]+)"/);
            if (idMatch) {
              const elementId = idMatch[1];
              const hasShape = bpmnData.diagram.includes(`${elementId}_di`);
              
              if (hasShape) {
                presentShapes.push(elementId);
              } else {
                missingShapes.push(elementId);
              }
            }
          });
        }
        
        console.log(`🔍 Elementos CON BPMNShape: ${presentShapes.join(', ')}`);
        console.log(`❌ Elementos SIN BPMNShape: ${missingShapes.join(', ')}`);
        
        await this.waitForModelerReady();
        
        // NUEVO: Verificar extensiones de moddle antes de importar
        const moddle = modeler.get('moddle');
        console.log('🔍 DEBUG moddle antes de importar:');
        console.log('  - Moddle disponible?', !!moddle);
        if (moddle) {
          console.log('  - Registry disponible?', !!moddle.registry);
          const packages = moddle.registry?.packages || {};
          console.log('  - Packages registrados:', Object.keys(packages));
          console.log('  - Detalles packages:', packages);
          
          // CRÍTICO: Buscar extensiones por índice (no por nombre)
          const ppinotPackage = Object.values(packages).find(pkg => 
            pkg.name === 'PPINOTModdle' || pkg.prefix === 'PPINOT' || pkg.prefix === 'ppinot'
          );
          const ralphPackage = Object.values(packages).find(pkg => 
            pkg.name === 'RALph' || pkg.prefix === 'RALph' || pkg.prefix === 'ralph'
          );
          
          console.log('  - PPINOT package encontrado?', !!ppinotPackage);
          console.log('  - RALPH package encontrado?', !!ralphPackage);
          
          if (ppinotPackage) {
            console.log('  - PPINOT details:', { name: ppinotPackage.name, prefix: ppinotPackage.prefix, uri: ppinotPackage.uri });
          }
          if (ralphPackage) {
            console.log('  - RALPH details:', { name: ralphPackage.name, prefix: ralphPackage.prefix, uri: ralphPackage.uri });
          }
          
          // VERIFICACIÓN: Las extensiones ya están registradas
          if (ppinotPackage && ralphPackage) {
            console.log('✅ Extensiones PPINOT y RALPH ya están correctamente registradas');
          } else {
            console.warn('⚠️ Faltan extensiones - esto podría causar problemas de importación');
            if (!ppinotPackage) console.warn('  - Falta PPINOT');
            if (!ralphPackage) console.warn('  - Falta RALPH');
          }
        }
        
        await modeler.importXML(bpmnData.diagram);
        console.log('✅ XML restaurado al canvas');
        
        // NUEVO: Verificar elementos después de importar
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        console.log('🔍 DEBUG elementos después de importar XML:');
        console.log('  - Total elementos:', allElements.length);
        allElements.forEach(el => {
          console.log(`  - ${el.id}: ${el.type} (businessObject: ${el.businessObject?.$type || 'sin BO'})`);
        });
      }

      // 2. Restaurar elementos PPINOT por separado (estilo CBPMN mejorado)
      if (bpmnData.ppinotElements && bpmnData.ppinotElements.length > 0) {
        const elementRegistry = modeler.get('elementRegistry');
        
        // Filtrar solo elementos que NO existen en el canvas
        const elementsToCreate = bpmnData.ppinotElements.filter(elementData => {
          const existingElement = elementRegistry.get(elementData.id);
          return !existingElement; // Solo crear si NO existe
        });
        
        if (elementsToCreate.length > 0) {
          console.log(`📊 Restaurando ${elementsToCreate.length} elementos PPINOT faltantes...`);
          await this.restorePPINOTElements(modeler, elementsToCreate);
        } else {
          console.log(`✅ Todos los elementos PPINOT ya están presentes en el XML`);
        }
      }
      
      // 3. Restaurar SOLO elementos RALPH que NO están en el XML
      if (bpmnData.ralphElements && bpmnData.ralphElements.length > 0) {
        const elementRegistry = modeler.get('elementRegistry');
        
        // Filtrar solo elementos que NO existen en el canvas
        const ralphToCreate = bpmnData.ralphElements.filter(elementData => {
          const existingElement = elementRegistry.get(elementData.id);
          return !existingElement; // Solo crear si NO existe
        });
        
        if (ralphToCreate.length > 0) {
          console.log(`📊 Restaurando ${ralphToCreate.length} elementos RALPH faltantes...`);
          await this.restoreRALPHElements(modeler, ralphToCreate);
        } else {
          console.log(`✅ Todos los elementos RALPH ya están presentes en el XML`);
        }
      }

      // 3. Restaurar estado del canvas (zoom, pan)
      if (bpmnData.canvas) {
        const canvas = modeler.get('canvas');
        if (canvas && bpmnData.canvas.zoom) {
          try {
            canvas.zoom(bpmnData.canvas.zoom);
            if (bpmnData.canvas.viewbox) {
              canvas.viewbox(bpmnData.canvas.viewbox);
            }
            console.log('✅ Estado del canvas restaurado');
          } catch (canvasError) {
            console.debug('Canvas state restore failed (normal):', canvasError.message);
          }
        }
      }

      // 4. CRÍTICO: Restaurar relaciones padre-hijo (patrón ppinot-visual + ralph)
      if (bpmnData.relationships && bpmnData.relationships.length > 0) {
        console.log(`🚀 DEBUG relaciones a restaurar:`);
        bpmnData.relationships.forEach((rel, i) => {
          console.log(`  ${i+1}. ${rel.childId} → ${rel.parentId} (${rel.childName} → ${rel.parentName})`);
        });
        
        // NUEVO: Verificar si faltan elementos y arreglar el XML
        console.log(`🚀 Verificando elementos faltantes para ${bpmnData.relationships.length} relaciones...`);
        
        // Si faltan elementos, significa que el XML está incompleto
        if (missingShapes.length > 0) {
          console.log(`🔧 ARREGLANDO XML: Faltan ${missingShapes.length} elementos con BPMNShape`);
          bpmnData.diagram = this.addMissingBPMNShapes(bpmnData.diagram, bpmnData.relationships);
          
          // Re-importar el XML corregido
          console.log('🔄 Re-importando XML con elementos completos...');
          await modeler.importXML(bpmnData.diagram);
          console.log('✅ XML corregido importado');
        }
        
        // Restaurar relaciones padre-hijo usando modeling.moveElements
        if (bpmnData.relationships && bpmnData.relationships.length > 0) {
          setTimeout(() => {
            this.restoreRelationshipsSimple(modeler, bpmnData.relationships);
          }, 1000); // Esperar 1 segundo para que elementos estén listos
        }
      }

    } catch (error) {
      console.error('❌ Error restaurando BPMN al canvas:', error);
      throw error;
    }
  }

  async restoreParentChildRelationships(modeler, relationships) {
    try {
      console.log(`🔄 Restaurando ${relationships.length} relaciones padre-hijo al canvas...`);
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        console.warn('⚠️ Servicios del modeler no disponibles');
        return;
      }

      // Esperar a que todos los elementos estén disponibles
      await this.waitForElementsReady(elementRegistry, relationships);
      
      let restoredCount = 0;
      let businessObjectCount = 0;
      
      // Restaurar cada relación usando el patrón oficial de BPMN.js
      for (const rel of relationships) {
        try {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (!childElement || !parentElement) {
            console.warn(`⚠️ Elementos no encontrados: ${rel.childId} → ${rel.parentId}`);
            continue;
          }
          
          // Verificar si ya están correctamente relacionados
          if (childElement.parent && childElement.parent.id === rel.parentId) {
            console.log(`✅ Relación ya correcta: ${rel.childName} → ${rel.parentName}`);
            continue;
          }
          
          // CRÍTICO: Usar moveElements para mantener elementos unidos (patrón BPMN.js oficial)
          modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
          
          // CRÍTICO: Restaurar businessObject.$parent (patrón ppinot-visual)
          if (childElement.businessObject && parentElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
            businessObjectCount++;
          }
          
          // También mover label si existe (patrón ralph)
          if (childElement.label) {
            try {
              modeling.moveElements([childElement.label], { x: 0, y: 0 }, parentElement);
            } catch (labelError) {
              console.debug('Label move failed (normal):', labelError.message);
            }
          }
          
          restoredCount++;
          console.log(`🔗 Restaurada: ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
          
        } catch (error) {
          console.warn(`⚠️ Error restaurando ${rel.childId} → ${rel.parentId}:`, error.message);
        }
      }
      
      console.log(`✅ Restauración completada: ${restoredCount}/${relationships.length} relaciones`);
      console.log(`✅ BusinessObjects actualizados: ${businessObjectCount}`);
      
    } catch (error) {
      console.error('❌ Error en restauración de relaciones:', error);
    }
  }

  async restorePPIToCanvas(ppiData) {
    const ppiManager = resolve('PPIManagerInstance');
    
    if (ppiData.indicators && ppiManager && ppiManager.core) {
      console.log(`📊 Restaurando ${ppiData.indicators.length} PPIs al manager...`);
      
      ppiData.indicators.forEach(ppi => {
        ppiManager.core.addPPI(ppi);
      });
      
      console.log('✅ PPIs restaurados al manager');
    }
  }

  async restoreRasciToStores(rasciData) {
    if (rasciData.roles) {
      RasciStore.setRoles(rasciData.roles);
      console.log(`✅ ${rasciData.roles.length} roles RASCI restaurados`);
    }
    
    if (rasciData.matrix) {
      RasciStore.setMatrix(rasciData.matrix);
      console.log(`✅ Matriz RASCI restaurada: ${Object.keys(rasciData.matrix).length} entradas`);
    }
    
    // Notificar recarga de estado RASCI
    setTimeout(() => {
      const sr = getServiceRegistry();
      const eb = sr && sr.get ? sr.get('EventBus') : null;
      if (eb) eb.publish('rasci.state.ensureLoaded', {});
    }, 500);
  }

  async restoreRalphToCanvas(ralphData) {
    if (!ralphData.elements || ralphData.elements.length === 0) {
      return;
    }

    const modeler = resolve('BpmnModeler');
    if (!modeler) return;

    try {
      console.log(`🎭 Restaurando ${ralphData.elements.length} elementos RALPH al canvas...`);
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const elementFactory = modeler.get('elementFactory');
      const canvas = modeler.get('canvas');
      
      if (!elementRegistry || !modeling || !elementFactory) {
        console.warn('⚠️ Servicios del modeler no disponibles para RALPH');
        return;
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

          // Crear elemento RALPH (patrón ralph)
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

          // Crear en canvas
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
      console.error('❌ Error restaurando RALPH al canvas:', error);
    }
  }

  // ==================== UTILIDADES DE ESPERA ====================

  async waitForElementsReady(elementRegistry, relationships) {
    let attempts = 0;
    const maxAttempts = 50; // Más tiempo para elementos PPINOT
    
    while (attempts < maxAttempts) {
      const missingElements = [];
      
      relationships.forEach(rel => {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);
        if (!childElement || !parentElement) {
          missingElements.push(`${rel.childId} → ${rel.parentId}`);
        }
      });
      
      if (missingElements.length === 0) {
        console.log(`✅ Todos los elementos disponibles (intento ${attempts + 1})`);
        return;
      }
      
      attempts++;
      console.log(`⏳ Esperando elementos (${attempts}/${maxAttempts}): ${missingElements.length} faltantes`);
      
      const waitTime = Math.min(300 + (attempts * 100), 1500);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    console.warn('⚠️ Algunos elementos siguen faltantes después de esperar');
  }

  async waitForModelerReady() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) return;
    
    return new Promise((resolve) => {
      const check = () => {
        try {
          if (modeler.get && modeler.get('canvas') && modeler.get('elementRegistry')) {
          resolve();
        } else {
            setTimeout(check, 100);
          }
        } catch (error) {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  // ==================== UTILIDADES DE ELEMENTOS ====================

  getElementName(element) {
    if (!element) return '';
    if (element.businessObject && element.businessObject.name) {
      return element.businessObject.name;
    }
    if (element.name) return element.name;
    return element.id || '';
  }

  getElementType(element) {
    if (!element) return 'unknown';
    if (element.type) return element.type;
    if (element.businessObject && element.businessObject.$type) return element.businessObject.$type;
    return 'unknown';
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

  // ==================== UTILIDADES GENERALES ====================

  downloadFile(data, filename) {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  showMessage(message, type = 'info') {
    console.log(`${type.toUpperCase()}: ${message}`);
  }

  setProjectName(name) {
    this.projectName = name || 'Nuevo Diagrama';
  }

  importProject() {
    const fileInput = document.getElementById('import-export-file-input-pure');
    if (fileInput) fileInput.click();
  }

  // ==================== API PÚBLICA PARA COMPATIBILIDAD ====================

  async importAllProjectData(projectData) {
    try {
      console.log('📥 Importando datos del proyecto (API pública)...');
      
      // NUEVO: Detectar tipo de archivo
      if (typeof projectData === 'string' && projectData.includes('<?xml')) {
        console.log('🔍 Detectado archivo BPMN XML - importando como diagrama básico');
        return await this.importBpmnXmlFile(projectData);
      }
      
      if (projectData.diagram && Array.isArray(projectData.diagram)) {
        console.log('🔍 Detectado archivo CBPMN - importando elementos PPINOT separados');
        return await this.importCbpmnFile(projectData);
      }
      
      // Importar en orden: BPMN → PPI → RASCI → RALPH (formato JSON unificado)
      console.log('🔍 Detectado formato JSON unificado - importando proyecto completo');
      if (projectData.bpmn) await this.restoreBpmnToCanvas(projectData.bpmn);
      if (projectData.ppi) await this.restorePPIToCanvas(projectData.ppi);
      if (projectData.rasci) await this.restoreRasciToStores(projectData.rasci);
      if (projectData.ralph) await this.restoreRalphToCanvas(projectData.ralph);
      
      console.log('✅ Proyecto importado correctamente (API pública)');
      this.showMessage('Proyecto importado correctamente', 'success');
      
    } catch (error) {
      console.error('❌ Error importando (API pública):', error);
      this.showMessage('Error al importar: ' + error.message, 'error');
      throw error;
    }
  }

  // ==================== DEBUG Y DIAGNÓSTICO ====================

  debugCanvasState() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }

    try {
    const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      console.log('🔍 Estado actual del canvas:');
      console.log(`📊 Total elementos: ${allElements.length}`);
      
      // Analizar elementos por tipo
      const elementsByType = {};
      const elementsWithParent = [];
      
      allElements.forEach(element => {
        const type = this.getElementType(element);
        elementsByType[type] = (elementsByType[type] || 0) + 1;
        
        if (element.parent && element.parent.id !== '__implicitroot') {
          elementsWithParent.push({
            id: element.id,
            name: this.getElementName(element),
            type: type,
            parentId: element.parent.id,
            parentName: this.getElementName(element.parent),
            parentType: this.getElementType(element.parent)
          });
        }
      });
      
      console.log('📋 Elementos por tipo:', elementsByType);
      console.log(`🔗 Elementos con padre: ${elementsWithParent.length}`);
      
      if (elementsWithParent.length > 0) {
        console.log('📋 Relaciones padre-hijo actuales:');
        elementsWithParent.forEach((rel, index) => {
          console.log(`  ${index + 1}. ${rel.name || rel.id} → ${rel.parentName || rel.parentId}`);
        });
      }
      
      return {
        totalElements: allElements.length,
        elementsByType,
        relationships: elementsWithParent
      };
      
    } catch (error) {
      console.error('❌ Error en debug del canvas:', error);
      return null;
    }
  }

  // ==================== TESTING Y VERIFICACIÓN ====================
    
  testRelationshipCapture() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }

    console.log('🧪 Probando captura de relaciones...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    console.log(`📊 Total elementos en canvas: ${allElements.length}`);
    
    // Analizar todas las relaciones
    const allRelationships = [];
    const significantRelationships = [];
    
    allElements.forEach(element => {
      if (element.parent && element.parent.id && element.parent.id !== '__implicitroot') {
        const rel = {
          child: `${element.id} (${this.getElementType(element)})`,
          parent: `${element.parent.id} (${this.getElementType(element.parent)})`
        };
        
        allRelationships.push(rel);
        
        if (this.isSignificantParentChildRelationship(element, element.parent)) {
          significantRelationships.push(rel);
        }
      }
    });
    
    console.log('📋 TODAS las relaciones:');
    allRelationships.forEach((rel, i) => {
      console.log(`  ${i + 1}. ${rel.child} → ${rel.parent}`);
    });
    
    console.log('🎯 Relaciones SIGNIFICATIVAS (las que se exportarán):');
    significantRelationships.forEach((rel, i) => {
      console.log(`  ${i + 1}. ${rel.child} → ${rel.parent}`);
    });
    
    return {
      total: allRelationships.length,
      significant: significantRelationships.length,
      relationships: significantRelationships
    };
  }

  debugPPINOTSpecificRelations() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }

    console.log('🔍 DEBUG ESPECÍFICO PPINOT - Analizando relaciones...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Buscar PPIs
    const ppiElements = allElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );

    // Buscar elementos PPINOT hijos
    const ppinotChildren = allElements.filter(el => 
      el.type && el.type.includes('PPINOT:') && 
      !el.type.includes('PPINOT:Ppi') &&
      el.type !== 'label'
    );

    console.log(`📊 PPIs encontrados: ${ppiElements.length}`);
    ppiElements.forEach(ppi => {
      const pos = this.getElementPosition(ppi);
      console.log(`  🎯 ${ppi.id} (${this.getElementName(ppi)}) en (${pos.x}, ${pos.y})`);
    });

    console.log(`📊 Elementos PPINOT hijos: ${ppinotChildren.length}`);
    ppinotChildren.forEach(child => {
      const pos = this.getElementPosition(child);
      const parent = child.parent ? `${child.parent.id} (${this.getElementType(child.parent)})` : 'Sin padre';
      const businessParent = child.businessObject && child.businessObject.$parent ? 
        child.businessObject.$parent.id : 'Sin businessObject.$parent';
      
      console.log(`  📍 ${child.id} (${this.getElementName(child)}) en (${pos.x}, ${pos.y})`);
      console.log(`    👨‍👦 Padre visual: ${parent}`);
      console.log(`    🏢 BusinessObject.$parent: ${businessParent}`);
      
      // Calcular distancia al PPI más cercano
      if (ppiElements.length > 0) {
        const closest = this.findClosestPPI(child, ppiElements);
        if (closest) {
          const closestPos = this.getElementPosition(closest);
          const distance = Math.sqrt(
            Math.pow(pos.x - closestPos.x, 2) + 
            Math.pow(pos.y - closestPos.y, 2)
          );
          console.log(`    📏 PPI más cercano: ${closest.id} (distancia: ${distance.toFixed(0)}px)`);
        }
      }
    });

    return {
      ppis: ppiElements.length,
      children: ppinotChildren.length
    };
  }

  // ==================== FORZAR RESTAURACIÓN DE RELACIONES ====================

  async forceRestoreRelations(projectData) {
    console.log('🚀 FORZANDO restauración de relaciones...');
    
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }

    if (!projectData || !projectData.bpmn || !projectData.bpmn.relationships) {
      console.log('❌ No hay relaciones para restaurar');
      return;
    }

    const relationships = projectData.bpmn.relationships;
    console.log(`🔄 Intentando restaurar ${relationships.length} relaciones FORZADAMENTE...`);

    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    let restoredCount = 0;
    
      for (const rel of relationships) {
      try {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);
        
        console.log(`🔍 Buscando: ${rel.childId} → ${rel.parentId}`);
        console.log(`  Child encontrado: ${!!childElement}`);
        console.log(`  Parent encontrado: ${!!parentElement}`);
        
        if (childElement && parentElement) {
          // Verificar relación actual
          const currentParent = childElement.parent ? childElement.parent.id : 'ninguno';
          console.log(`  Padre actual: ${currentParent}`);
          
          if (currentParent !== rel.parentId) {
            console.log(`🔄 FORZANDO relación: ${rel.childId} → ${rel.parentId}`);
            
            // FORZAR usando moveElements
            modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // FORZAR businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
            restoredCount++;
            console.log(`✅ FORZADA: ${rel.childName} → ${rel.parentName}`);
          } else {
            console.log(`✅ Ya correcta: ${rel.childName} → ${rel.parentName}`);
          }
        } else {
          console.warn(`❌ Elementos no encontrados: ${rel.childId} → ${rel.parentId}`);
        }
        
      } catch (error) {
        console.error(`❌ Error forzando relación ${rel.childId} → ${rel.parentId}:`, error);
      }
    }
    
    console.log(`🎉 Restauración FORZADA completada: ${restoredCount}/${relationships.length} relaciones`);
    
    // Refrescar canvas
    try {
      const canvas = modeler.get('canvas');
      if (canvas && canvas.resized) {
        canvas.resized();
      }
    } catch (error) {
      console.debug('Canvas refresh falló:', error);
    }
    
    return restoredCount;
  }

  // ==================== PROGRAMACIÓN INTELIGENTE DE RESTAURACIÓN ====================

  scheduleRelationshipRestoration(modeler, relationships) {
    console.log(`📅 Programando restauración de ${relationships.length} relaciones...`);
    
    // Intentos más rápidos y frecuentes
    const attempts = [
      { delay: 500, name: 'Intento inmediato' },
      { delay: 1000, name: 'Intento rápido' },
      { delay: 2000, name: 'Intento medio' },
      { delay: 3000, name: 'Intento final' }
    ];
    
    attempts.forEach((attempt, index) => {
      setTimeout(async () => {
        console.log(`🔄 ${attempt.name} (${index + 1}/${attempts.length}) - Restaurando relaciones...`);
        
        const restoredCount = await this.tryRestoreRelationships(modeler, relationships);
        
        if (restoredCount === relationships.length) {
          console.log(`🎉 ¡Todas las relaciones restauradas en ${attempt.name}!`);
          return; // Éxito - no necesitar más intentos
        } else if (restoredCount > 0) {
          console.log(`⚠️ ${attempt.name}: ${restoredCount}/${relationships.length} relaciones restauradas`);
        } else {
          console.log(`❌ ${attempt.name}: 0 relaciones restauradas - elementos aún no listos`);
        }
        
        // Si es el último intento y no funcionó, mostrar error
        if (index === attempts.length - 1 && restoredCount < relationships.length) {
          console.error(`❌ Falló restauración automática. Usar: window.forceRestoreRelations(projectData)`);
        }
        
      }, attempt.delay);
    });
  }

  async tryRestoreRelationships(modeler, relationships) {
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        return 0;
    }

    let restoredCount = 0;

    for (const rel of relationships) {
      try {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);

          if (childElement && parentElement) {
            // Verificar si ya está correctamente relacionado
        if (childElement.parent && childElement.parent.id === rel.parentId) {
              restoredCount++;
          continue;
        }

            // Restaurar relación
        modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // Restaurar businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
        restoredCount++;
            console.log(`✅ Restaurada: ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
            
          }
        } catch (error) {
          console.debug(`Relación ${rel.childId} → ${rel.parentId} falló:`, error.message);
        }
      }
      
      return restoredCount;
      
      } catch (error) {
      console.error('❌ Error en tryRestoreRelationships:', error);
      return 0;
    }
  }

  // ==================== TEST ESPECÍFICO PARA TARGET/SCOPE ====================

  testTargetScopeRelations() {
    console.log('🧪 TEST ESPECÍFICO: Target, Scope, BaseMeasure...');
    
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler no disponible');
      return;
    }

    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Buscar elementos específicos
    const targets = allElements.filter(el => el.type && el.type.includes('Target'));
    const scopes = allElements.filter(el => el.type && el.type.includes('Scope'));
    const baseMeasures = allElements.filter(el => el.type && el.type.includes('BaseMeasure'));
    const ppis = allElements.filter(el => el.type && el.type.includes('PPINOT:Ppi'));
    
    console.log(`📊 Elementos encontrados:`);
    console.log(`  🎯 Targets: ${targets.length}`);
    console.log(`  📏 Scopes: ${scopes.length}`);
    console.log(`  📊 BaseMeasures: ${baseMeasures.length}`);
    console.log(`  🏆 PPIs: ${ppis.length}`);
    
    // Probar manualmente crear relaciones Target → PPI más cercano
    targets.forEach(target => {
      const closestPPI = this.findClosestPPI(target, ppis);
      if (closestPPI) {
        const distance = this.calculateDistance(target, closestPPI);
        console.log(`🎯 Target ${target.id} → PPI ${closestPPI.id} (${distance.toFixed(0)}px)`);
        
        // Probar si la relación sería significativa
        const isSignificant = this.isSignificantParentChildRelationship(target, closestPPI);
        console.log(`  ✅ ¿Relación significativa? ${isSignificant}`);
      }
    });
    
    // Probar manualmente crear relaciones Scope → PPI más cercano
    scopes.forEach(scope => {
      const closestPPI = this.findClosestPPI(scope, ppis);
      if (closestPPI) {
        const distance = this.calculateDistance(scope, closestPPI);
        console.log(`📏 Scope ${scope.id} → PPI ${closestPPI.id} (${distance.toFixed(0)}px)`);
        
        const isSignificant = this.isSignificantParentChildRelationship(scope, closestPPI);
        console.log(`  ✅ ¿Relación significativa? ${isSignificant}`);
      }
    });
    
    // Probar BaseMeasures
    baseMeasures.forEach(measure => {
      const closestPPI = this.findClosestPPI(measure, ppis);
      if (closestPPI) {
        const distance = this.calculateDistance(measure, closestPPI);
        console.log(`📊 BaseMeasure ${measure.id} → PPI ${closestPPI.id} (${distance.toFixed(0)}px)`);
        
        const isSignificant = this.isSignificantParentChildRelationship(measure, closestPPI);
        console.log(`  ✅ ¿Relación significativa? ${isSignificant}`);
      }
    });
  }

  calculateDistance(element1, element2) {
    const pos1 = this.getElementPosition(element1);
    const pos2 = this.getElementPosition(element2);
    
    const center1 = { x: pos1.x + pos1.width / 2, y: pos1.y + pos1.height / 2 };
    const center2 = { x: pos2.x + pos2.width / 2, y: pos2.y + pos2.height / 2 };
    
    return Math.sqrt(
      Math.pow(center1.x - center2.x, 2) + 
      Math.pow(center1.y - center2.y, 2)
    );
  }

  // ==================== FORZAR INCLUSIÓN DE ELEMENTOS PPINOT EN XML ====================

  forceIncludePPINOTInXML(xmlContent, missingElements) {
    console.log('🔧 Forzando inclusión de elementos PPINOT en XML...');
    
    let modifiedXml = xmlContent;
    
    // Buscar la sección <bpmn:process> para añadir elementos
    const processMatch = modifiedXml.match(/(<bpmn:process[^>]*>)(.*?)(<\/bpmn:process>)/s);
    if (!processMatch) {
      console.warn('⚠️ No se encontró bpmn:process en el XML');
      return xmlContent;
    }
    
    const processStart = processMatch[1];
    const processContent = processMatch[2];
    const processEnd = processMatch[3];
    
    let newElements = '';
    let newShapes = '';
    
    // Buscar la sección BPMNPlane para añadir shapes
    const planeMatch = modifiedXml.match(/(<bpmndi:BPMNPlane[^>]*>)(.*?)(<\/bpmndi:BPMNPlane>)/s);
    
    for (const element of missingElements) {
      console.log(`🔧 Añadiendo al XML: ${element.id} (${element.type})`);
      
      // Crear elemento en el proceso
      const elementXml = this.createPPINOTElementXML(element);
      newElements += elementXml;
      
      // Crear BPMNShape correspondiente
      const shapeXml = this.createPPINOTShapeXML(element);
      newShapes += shapeXml;
    }
    
    // Insertar elementos en el proceso
    const newProcessContent = processContent + newElements;
    modifiedXml = modifiedXml.replace(
      processMatch[0], 
      processStart + newProcessContent + processEnd
    );
    
    // Insertar shapes en el diagrama
    if (planeMatch && newShapes) {
      const planeStart = planeMatch[1];
      const planeContent = planeMatch[2];
      const planeEnd = planeMatch[3];
      const newPlaneContent = planeContent + newShapes;
      
      modifiedXml = modifiedXml.replace(
        planeMatch[0], 
        planeStart + newPlaneContent + planeEnd
      );
    }
    
    console.log(`✅ ${missingElements.length} elementos PPINOT añadidos al XML`);
    return modifiedXml;
  }

  createPPINOTElementXML(element) {
    const type = element.type.replace('PPINOT:', '').toLowerCase();
    const width = element.width || 100;
    const height = element.height || 80;
    
    return `
    <PPINOT:${type} id="${element.id}" type="${element.type}" width="${width}" height="${height}" />`;
  }

  createPPINOTShapeXML(element) {
    const x = element.x || 100;
    const y = element.y || 100;
    const width = element.width || 100;
    const height = element.height || 80;
    
    return `
      <bpmndi:BPMNShape id="${element.id}_di" bpmnElement="${element.id}">
        <dc:Bounds x="${x}" y="${y}" width="${width}" height="${height}" />
      </bpmndi:BPMNShape>`;
  }

  // ==================== ARREGLAR XML CON BPMNSHAPES FALTANTES ====================

  addMissingBPMNShapes(xmlContent, relationships) {
    console.log('🔧 Añadiendo BPMNShapes faltantes al XML...');
    
    let modifiedXml = xmlContent;
    let addedCount = 0;
    
    // Buscar la sección BPMNPlane para añadir shapes
    const planeMatch = modifiedXml.match(/(<bpmndi:BPMNPlane[^>]*>)(.*?)(<\/bpmndi:BPMNPlane>)/s);
    if (!planeMatch) {
      console.warn('⚠️ No se encontró BPMNPlane en el XML');
      return xmlContent;
    }
    
    const planeStart = planeMatch[1];
    const planeContent = planeMatch[2];
    const planeEnd = planeMatch[3];
    
    let newShapes = '';
    
    // Para cada relación, verificar si el elemento hijo tiene BPMNShape
    for (const rel of relationships) {
      const hasShape = xmlContent.includes(`${rel.childId}_di`);
      
      if (!hasShape && rel.position) {
        console.log(`🔧 Añadiendo BPMNShape para: ${rel.childId}`);
        
        // Crear BPMNShape basado en el tipo de elemento
        const shapeXml = `
      <bpmndi:BPMNShape id="${rel.childId}_di" bpmnElement="${rel.childId}">
        <dc:Bounds x="${rel.position.x}" y="${rel.position.y}" width="${rel.position.width}" height="${rel.position.height}" />
      </bpmndi:BPMNShape>`;
        
        newShapes += shapeXml;
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      // Insertar las nuevas shapes en el BPMNPlane
      const newPlaneContent = planeContent + newShapes;
      modifiedXml = modifiedXml.replace(
        planeMatch[0], 
        planeStart + newPlaneContent + planeEnd
      );
      
      console.log(`✅ ${addedCount} BPMNShapes añadidas al XML`);
    }
    
    return modifiedXml;
  }

  // ==================== CREAR ELEMENTOS FALTANTES ====================

  async createMissingPPINOTElements(modeler, relationships) {
    console.log('🔧 Creando elementos PPINOT faltantes...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const elementFactory = modeler.get('elementFactory');
    const modeling = modeler.get('modeling');
    const canvas = modeler.get('canvas');
    
    if (!elementRegistry || !elementFactory || !modeling || !canvas) {
      console.error('❌ Servicios del modeler no disponibles');
      return;
    }

    let createdCount = 0;
    
    for (const rel of relationships) {
      const childElement = elementRegistry.get(rel.childId);
      const parentElement = elementRegistry.get(rel.parentId);
      
      // Si el elemento hijo no existe, crearlo
      if (!childElement && parentElement) {
        try {
          console.log(`🔧 Creando elemento faltante: ${rel.childId} (${rel.childType})`);
          console.log(`  - Posición original: x=${rel.position?.x}, y=${rel.position?.y}, w=${rel.position?.width}, h=${rel.position?.height}`);
          console.log(`  - Padre: ${rel.parentId} en canvas`);
          
          // Crear elemento usando el tipo y posición de la relación
          const newElement = elementFactory.create('shape', {
            type: rel.childType,
            id: rel.childId,
            width: rel.position?.width || 100,
            height: rel.position?.height || 80
          });

          // Posicionar usando coordenadas absolutas de la relación
          const childX = rel.position?.x || 100;
          const childY = rel.position?.y || 100;
          
          console.log(`  - Creando en posición: (${childX}, ${childY})`);

          // Crear en el canvas (primero en root, luego mover al padre)
          const rootElement = canvas.getRootElement();
          const createdElement = modeling.createShape(newElement, { x: childX, y: childY }, rootElement);
          
          // Inmediatamente mover al padre para establecer la relación
          if (createdElement && parentElement) {
            setTimeout(() => {
              modeling.moveElements([createdElement], { x: 0, y: 0 }, parentElement);
              console.log(`🔗 Elemento ${rel.childId} movido a padre ${rel.parentId}`);
            }, 100);
          }
          
          console.log(`✅ Elemento creado: ${rel.childId} en posición (${childX}, ${childY})`);
          createdCount++;
          
        } catch (createError) {
          console.warn(`⚠️ Error creando elemento ${rel.childId}:`, createError.message);
        }
      }
    }
    
    console.log(`🎉 Elementos PPINOT creados: ${createdCount}`);
    return createdCount;
  }

  // ==================== RESTAURACIÓN SIMPLE DE RELACIONES ====================

  restoreRelationshipsSimple(modeler, relationships) {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    console.log(`🔗 Restaurando ${relationships.length} relaciones...`);
    
    let restored = 0;
    
    relationships.forEach(relationship => {
      try {
        const childElement = elementRegistry.get(relationship.childId);
        const parentElement = elementRegistry.get(relationship.parentId);
        
        if (childElement && parentElement) {
          // Mover elemento hijo al padre usando modeling.moveElements
          modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
          
          // Actualizar businessObject si existe
          if (childElement.businessObject && parentElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
          }
          
          restored++;
        }
      } catch (error) {
        console.warn(`⚠️ Error restaurando relación ${relationship.childId} → ${relationship.parentId}:`, error.message);
      }
    });
    
    console.log(`✅ ${restored}/${relationships.length} relaciones restauradas`);
  }

  async waitForPPINOTElementsAndRestore(modeler, relationships) {
    console.log('⏳ Esperando específicamente elementos PPINOT...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    if (!elementRegistry || !modeling) {
      console.error('❌ Servicios del modeler no disponibles');
      return;
    }

    // Extraer IDs únicos de elementos que necesitamos
    const requiredElementIds = new Set();
    relationships.forEach(rel => {
      requiredElementIds.add(rel.childId);
      requiredElementIds.add(rel.parentId);
    });

    console.log(`🔍 Elementos requeridos: ${Array.from(requiredElementIds).join(', ')}`);

    let attempts = 0;
    const maxAttempts = 60; // 30 segundos máximo
    const checkInterval = 500; // Cada 500ms

    const checkElements = () => {
      attempts++;
      
      const availableElements = [];
      const missingElements = [];
      
      requiredElementIds.forEach(id => {
        const element = elementRegistry.get(id);
        if (element) {
          availableElements.push(id);
    } else {
          missingElements.push(id);
        }
      });

      console.log(`🔍 Intento ${attempts}/${maxAttempts}:`);
      console.log(`  ✅ Disponibles: ${availableElements.length}/${requiredElementIds.size}`);
      console.log(`  ❌ Faltantes: ${missingElements.join(', ')}`);

      // Si todos están disponibles, restaurar inmediatamente
      if (missingElements.length === 0) {
        console.log('🎉 ¡Todos los elementos PPINOT están listos! Restaurando...');
        
        setTimeout(async () => {
          const restoredCount = await this.tryRestoreRelationships(modeler, relationships);
          console.log(`🎉 ÉXITO: ${restoredCount}/${relationships.length} relaciones restauradas`);
          
          if (restoredCount < relationships.length) {
            console.log('🔄 Algunos elementos fallaron, reintentando en 1s...');
            setTimeout(async () => {
              const retry = await this.tryRestoreRelationships(modeler, relationships);
              console.log(`🔄 Reintento: ${retry}/${relationships.length} relaciones`);
            }, 1000);
          }
        }, 100);
        
        return;
      }

      // Si aún faltan elementos, continuar esperando
      if (attempts < maxAttempts) {
        setTimeout(checkElements, checkInterval);
      } else {
        console.error(`❌ Timeout: Algunos elementos nunca aparecieron: ${missingElements.join(', ')}`);
        console.error('💡 Usar: window.forceRestoreRelations(projectData)');
      }
    };

    // Iniciar verificación
    checkElements();
  }

  // ==================== EXPORTADORES ESPECÍFICOS ====================

  async exportDualFormat() {
    console.log('📂 Exportando en formato dual (BPMN + CBPMN)...');
    
    try {
      // 1. Capturar datos del canvas
      const bpmnData = await this.captureBpmnFromCanvas();
      const ppiData = this.capturePPIFromManager();
      
      // 2. Crear BPMN XML limpio (sin elementos PPINOT, solo BPMN + RASCI)
      const cleanBpmn = this.createCleanBpmnXML(bpmnData);
      
      // 3. Crear archivo CBPMN (elementos PPINOT)
      const cbpmnData = this.createCbpmnData(bpmnData, ppiData);
      
      // 4. Descargar ambos archivos
      this.downloadFile(cleanBpmn, `${this.projectName}.bpmn`, 'application/xml');
      setTimeout(() => {
        this.downloadFile(JSON.stringify(cbpmnData, null, 2), `${this.projectName}.cbpmn`, 'application/json');
      }, 500);
      
      console.log('✅ Archivos BPMN + CBPMN descargados');
      
    } catch (error) {
      console.error('❌ Error exportando formato dual:', error);
      throw error;
    }
  }

  async exportBpmnOnly() {
    console.log('📄 Exportando solo BPMN...');
    
    try {
      // Capturar solo BPMN básico con RASCI
      const modeler = resolve('BpmnModeler');
      if (!modeler) throw new Error('Modeler no disponible');
      
      const result = await modeler.saveXML({ format: true });
      
      this.downloadFile(result.xml, `${this.projectName}.bpmn`, 'application/xml');
      console.log('✅ Archivo BPMN descargado');
      
    } catch (error) {
      console.error('❌ Error exportando BPMN:', error);
      throw error;
    }
  }

  createCleanBpmnXML(bpmnData) {
    // Crear XML BPMN sin elementos PPINOT (solo BPMN básico + RASCI)
    let cleanXml = bpmnData.diagram;
    
    // Remover elementos PPINOT del proceso
    cleanXml = cleanXml.replace(/<PPINOT:[^>]*\/>/g, '');
    cleanXml = cleanXml.replace(/<PPINOT:[^>]*>.*?<\/PPINOT:[^>]*>/gs, '');
    
    // Remover BPMNShapes de elementos PPINOT
    cleanXml = cleanXml.replace(/<bpmndi:BPMNShape[^>]*bpmnElement="[^"]*PPINOT[^"]*"[^>]*>.*?<\/bpmndi:BPMNShape>/gs, '');
    
    return cleanXml;
  }

  createCbpmnData(bpmnData, ppiData) {
    // Crear datos CBPMN compatible con ppinot-visual
    const elementRegistry = resolve('BpmnModeler').get('elementRegistry');
    const allElements = elementRegistry.getAll();
    const ppinotElements = allElements.filter(el => 
      el.type && el.type.includes('PPINOT:')
    );
    
    const diagram = ppinotElements.map(el => ({
      type: el.type,
      id: el.id,
      width: el.width || 100,
      height: el.height || 80,
      x: el.x || 0,
      y: el.y || 0,
      text: el.businessObject?.name || null
    }));
    
    // Crear conexiones PPINOT si existen
    const consequences = [];
    // TODO: Implementar detección de conexiones PPINOT
    
    return {
      definitions: {
        consequences: consequences,
        consequencesTimed: [],
        timeDistances: [],
        timeInstances: [],
        taskDurations: [],
        resources: [],
        roles: [],
        groups: []
      },
      diagram: diagram,
      idMap: {}
    };
  }

  // ==================== IMPORTADORES ESPECÍFICOS ====================

  async importBpmnXmlFile(xmlContent) {
    console.log('📥 Importando archivo BPMN XML...');
    
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler no disponible');
    }

    try {
      await modeler.importXML(xmlContent);
      console.log('✅ Archivo BPMN XML importado correctamente');
      return { success: true, message: 'Diagrama BPMN importado' };
    } catch (error) {
      console.error('❌ Error importando BPMN XML:', error);
      throw error;
    }
  }

  async importCbpmnFile(cbpmnData) {
    console.log('📥 Importando archivo CBPMN (elementos PPINOT separados)...');
    
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler no disponible');
    }

    try {
      // Los archivos CBPMN contienen elementos PPINOT con posiciones
      console.log(`🔍 Elementos PPINOT en CBPMN: ${cbpmnData.diagram?.length || 0}`);
      
      if (cbpmnData.diagram && cbpmnData.diagram.length > 0) {
        const elementFactory = modeler.get('elementFactory');
        const canvas = modeler.get('canvas');
        const modeling = modeler.get('modeling');
        
        if (!elementFactory || !canvas || !modeling) {
          throw new Error('Servicios del modeler no disponibles');
        }

        // Crear cada elemento PPINOT en el canvas
        for (const elementData of cbpmnData.diagram) {
          try {
            console.log(`🔧 Creando elemento: ${elementData.id} (${elementData.type})`);
            console.log(`  📍 Posición CBPMN: x=${elementData.x}, y=${elementData.y}, w=${elementData.width}, h=${elementData.height}`);
            
            // Crear elemento usando el factory
            const element = elementFactory.create('shape', {
              type: elementData.type,
              id: elementData.id,
              width: elementData.width,
              height: elementData.height
            });

            // Añadir al canvas en la posición correcta
            const createdElement = modeling.createShape(element, 
              { x: elementData.x, y: elementData.y }, 
              canvas.getRootElement()
            );
            
            console.log(`✅ Elemento creado: ${elementData.id} en posición (${elementData.x}, ${elementData.y})`);
            
            // Verificar posición final
            if (createdElement) {
              console.log(`  🔍 Posición final: x=${createdElement.x}, y=${createdElement.y}, w=${createdElement.width}, h=${createdElement.height}`);
            }
            
          } catch (elementError) {
            console.warn(`⚠️ Error creando elemento ${elementData.id}:`, elementError.message);
          }
        }

        // Restaurar conexiones si existen
        if (cbpmnData.definitions?.consequences) {
          console.log(`🔗 Restaurando ${cbpmnData.definitions.consequences.length} conexiones...`);
          // TODO: Implementar restauración de conexiones PPINOT
        }
        
        // CRÍTICO: Restaurar relaciones padre-hijo después de crear elementos
        console.log('🔄 Restaurando relaciones padre-hijo de elementos CBPMN...');
        setTimeout(async () => {
          await this.restoreCbpmnRelationships(modeler, cbpmnData.diagram);
        }, 1000);
      }
      
      console.log('✅ Archivo CBPMN importado correctamente');
      return { success: true, message: 'Elementos PPINOT importados desde CBPMN' };
      
    } catch (error) {
      console.error('❌ Error importando CBPMN:', error);
      throw error;
    }
  }

  async restoreCbpmnRelationships(modeler, diagramElements) {
    console.log('🔄 Restaurando relaciones padre-hijo de elementos CBPMN...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    if (!elementRegistry || !modeling) {
      console.warn('⚠️ Servicios del modeler no disponibles');
      return;
    }

    // Buscar PPI padre (elemento contenedor principal)
    const ppiElement = diagramElements.find(el => el.type === 'PPINOT:Ppi');
    if (!ppiElement) {
      console.warn('⚠️ No se encontró elemento PPI padre en CBPMN');
      return;
    }

    const parentElement = elementRegistry.get(ppiElement.id);
    if (!parentElement) {
      console.warn(`⚠️ Elemento PPI padre ${ppiElement.id} no encontrado en canvas`);
      return;
    }

    let restoredCount = 0;

    // Mover todos los elementos hijos al PPI padre
    for (const elementData of diagramElements) {
      if (elementData.type !== 'PPINOT:Ppi' && !elementData.type.includes('Connection')) {
        const childElement = elementRegistry.get(elementData.id);
        
        if (childElement) {
          try {
            console.log(`🔗 Moviendo ${elementData.id} al PPI padre ${ppiElement.id}`);
            
            // Mover elemento al padre usando moveElements
            modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // Establecer businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
            restoredCount++;
            console.log(`✅ Relación restaurada: ${elementData.id} → ${ppiElement.id}`);
            
          } catch (error) {
            console.warn(`⚠️ Error moviendo elemento ${elementData.id}:`, error.message);
          }
    } else {
          console.warn(`⚠️ Elemento hijo ${elementData.id} no encontrado en canvas`);
        }
      }
    }

    console.log(`🎉 Relaciones CBPMN restauradas: ${restoredCount} elementos movidos al PPI padre`);
  }

  // ==================== RESTAURADORES DE ELEMENTOS SEPARADOS ====================

  async restorePPINOTElements(modeler, ppinotElements) {
    console.log('🔧 Restaurando elementos PPINOT desde datos separados...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Servicios del modeler no disponibles');
    }

    let createdCount = 0;
    const createdElements = [];

    // Crear elementos en orden: primero PPIs, luego hijos
    const sortedElements = [...ppinotElements].sort((a, b) => {
      if (a.type === 'PPINOT:Ppi' && b.type !== 'PPINOT:Ppi') return -1;
      if (b.type === 'PPINOT:Ppi' && a.type !== 'PPINOT:Ppi') return 1;
      return 0;
    });

    for (const elementData of sortedElements) {
      try {
        // Determinar padre
        let parentElement = canvas.getRootElement();
        if (elementData.parent) {
          const foundParent = createdElements.find(el => el.id === elementData.parent);
          if (foundParent) {
            parentElement = foundParent;
          }
        }

        // Crear elemento simple y efectivo
        const element = elementFactory.create('shape', {
          type: elementData.type,
          id: elementData.id,
          width: elementData.width,
          height: elementData.height
        });

        // Crear en canvas con posición exacta
        const createdElement = modeling.createShape(
          element,
          { x: elementData.x, y: elementData.y },
          parentElement
        );
        
        if (createdElement) {
          createdElements.push(createdElement);
          createdCount++;
        }
        
      } catch (error) {
        console.warn(`⚠️ Error restaurando ${elementData.id}:`, error.message);
      }
    }

    console.log(`🎉 ${createdCount}/${ppinotElements.length} elementos PPINOT restaurados`);
  }

  async restoreRALPHElements(modeler, ralphElements) {
    console.log('🔧 Restaurando elementos RALPH desde datos separados...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Servicios del modeler no disponibles');
    }

    let createdCount = 0;

    for (const elementData of ralphElements) {
      try {
        console.log(`🔧 Restaurando: ${elementData.id} (${elementData.type})`);
        console.log(`  📍 Posición: x=${elementData.x}, y=${elementData.y}`);
        
        // Crear elemento RALPH
        const element = elementFactory.create('shape', {
          type: elementData.type,
          id: elementData.id,
          width: elementData.width,
          height: elementData.height
        });

        // Crear en canvas
        const createdElement = modeling.createShape(element, 
          { x: elementData.x, y: elementData.y }, 
          canvas.getRootElement()
        );
        
        if (createdElement) {
          createdCount++;
          console.log(`✅ ${elementData.id} restaurado en (${elementData.x}, ${elementData.y})`);
      }
      
    } catch (error) {
        console.warn(`⚠️ Error restaurando ${elementData.id}:`, error.message);
    }
    }

    console.log(`🎉 ${createdCount}/${ralphElements.length} elementos RALPH restaurados`);
  }
}

// Exportar instancia única
export default new ImportExportManager();
