/**
 * ImportExportManager - Main orchestrator for import/export functionality
 * 
 * This is the main interface that coordinates all import/export operations
 * by delegating to specialized modules for each concern.
 */

import { resolve } from '../../../../services/global-access.js';
import { getServiceRegistry } from '../../core/ServiceRegistry.js';
import { BpmnExporter } from './BpmnExporter.js';
import { BpmnImporter, normalizeRALPHNamespaces } from './BpmnImporter.js';
import { DataCapture } from './DataCapture.js';
import { DataRestore } from './DataRestore.js';
import { RelationshipCapture } from './RelationshipCapture.js';
import { RelationshipRestore } from './RelationshipRestore.js';

export class ImportExportManager {
  constructor() {
    this.config = {
      fileExtension: '.mmproject',
      projectName: 'Nuevo Diagrama',
      version: '2.0.0',
      maxDistance: 400, // Maximum distance for proximity relationships
      maxWaitAttempts: 50,
      checkInterval: 500
    };
    
    // Initialize specialized modules
    this.bpmnExporter = new BpmnExporter(this.config);
    this.bpmnImporter = new BpmnImporter(this.config);
    this.dataCapture = new DataCapture(this.config);
    this.dataRestore = new DataRestore(this.config);
    
    this.init();
  }

  init() {
    this.setupEventListeners();
    this.createFileInput();
    this.registerService();
  }

  async clearLocalStorageState() {
    try {
      const sr = getServiceRegistry();
      const storageManager = sr && sr.get ? sr.get('LocalStorageManager') : resolve('LocalStorageManager');
      if (storageManager && typeof storageManager.clearSavedData === 'function') {
        await storageManager.clearSavedData();
        console.log('🧹 LocalStorage cleared before import/open');
      }
      const ppiManager = sr && sr.get ? sr.get('PPIManagerInstance') : null;
      if (ppiManager && ppiManager.core) {
        // Reset in-memory PPIs to avoid mixing with imported state
        if (Array.isArray(ppiManager.core.ppis)) {
          ppiManager.core.ppis = [];
          if (ppiManager.ui && typeof ppiManager.ui.refreshPPIList === 'function') {
            ppiManager.ui.refreshPPIList();
          }
        }
      }
    } catch (e) {
      console.debug('clearLocalStorageState skipped:', (e && e.message) || e);
    }
  }

  registerService() {
    const sr = getServiceRegistry();
    if (sr) {
      sr.register('ImportExportManager', this);
      console.log('✅ ImportExportManager registered');
      
      this.exposeDebugAPI();
    }
  }

  exposeDebugAPI() {
    if (typeof window !== 'undefined') {
      const debugAPI = {
        exportProject: () => this.exportProject(),
        importProject: () => this.importProject(),
        debugCanvasState: () => this.debugCanvasState(),
        testRelationships: () => this.testRelationshipCapture(),
        debugPPINOTRelations: () => this.debugPPINOTSpecificRelations(),
        forceRestoreRelations: (projectData) => this.forceRestoreRelations(projectData),
        testTargetScopeRelations: () => this.testTargetScopeRelations()
      };
      
      Object.assign(window, debugAPI);
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
    const inputId = 'import-export-file-input';
    let fileInput = document.getElementById(inputId);
    
    if (!fileInput) {
      fileInput = this.createInputElement(inputId);
      this.attachFileInputHandler(fileInput);
    }
  }

  createInputElement(id) {
    const fileInput = document.createElement('input');
    fileInput.id = id;
    fileInput.type = 'file';
    fileInput.accept = this.config.fileExtension;
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);
    return fileInput;
  }

  attachFileInputHandler(fileInput) {
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        this.loadProjectFromFile(e.target.files[0]);
      }
    });
  }

  // ==================== PROJECT EXPORT ====================

  /**
   * Exports the complete project by capturing current canvas state
   */
  async exportProject() {
    try {
      console.log('📤 Exporting project - Direct canvas capture...');
      
      const projectData = await this.captureProjectData();
      const fileName = this.generateFileName();
      
      this.downloadFile(projectData, fileName);
      
      console.log('✅ Project exported successfully');
      this.showMessage('Project exported successfully', 'success');
      
    } catch (error) {
      console.error('❌ Export error:', error);
      this.showMessage('Export error: ' + error.message, 'error');
    }
  }

  async captureProjectData() {
    // Usar LocalStorageManager para captura completa que incluye formularios
    const storageManager = resolve('LocalStorageManager');
    if (storageManager && typeof storageManager.captureCompleteProject === 'function') {
      console.log('📋 Usando LocalStorageManager para captura completa...');
      // Forzar sincronización de PPIs antes de capturar si el canvas no ha cambiado
      try {
        const sr = getServiceRegistry();
        const ppiManager = sr && sr.get ? sr.get('PPIManagerInstance') : null;
        if (ppiManager && typeof ppiManager.verifyExistingPPIsInCanvas === 'function') {
          ppiManager.verifyExistingPPIsInCanvas();
        }
      } catch (syncErr) {
        console.debug('PPI sync before capture skipped:', (syncErr && syncErr.message) || syncErr);
      }
      const completeData = await storageManager.captureCompleteProject();
      
      return {
        version: this.config.version,
        exportDate: new Date().toISOString(),
        data: completeData // Incluye BPMN, PPI, RASCI, RALPH y datos de formularios
      };
    } else {
      // Fallback al método anterior
      console.log('⚠️ LocalStorageManager no disponible, usando captura básica...');
      return {
        version: this.config.version,
        exportDate: new Date().toISOString(),
        bpmn: await this.bpmnExporter.captureBpmnFromCanvas(),
        ppi: await this.dataCapture.capturePPIFromCanvas(),
        rasci: await this.dataCapture.captureRasciFromStores(),
        ralph: await this.bpmnExporter.captureRalphFromCanvas()
      };
    }
  }

  generateFileName() {
    const sanitizedName = this.config.projectName
      .replace(/[^a-z0-9áéíóúñü\\s-]/gi, '')
      .replace(/\\s+/g, '-')
      .toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${sanitizedName}-${date}.mmproject`;
  }
  
  /**
   * Exporta solo el archivo BPMN con elementos PPINOT integrados
   */
  async exportBpmnOnly() {
    try {
      console.log('📤 Exporting BPMN only...');
      
      const bpmnXml = await this.bpmnExporter.captureBpmnFromCanvas();
      const fileName = this.generateBpmnFileName();
      
      this.downloadBpmnFile(bpmnXml, fileName);
      
      console.log('✅ BPMN exported successfully');
      this.showMessage('BPMN exported successfully', 'success');
      
    } catch (error) {
      console.error('❌ BPMN export error:', error);
      this.showMessage('BPMN export error: ' + error.message, 'error');
    }
  }
  
  generateBpmnFileName() {
    const sanitizedName = this.config.projectName
      .replace(/[^a-z0-9áéíóúñü\\s-]/gi, '')
      .replace(/\\s+/g, '-')
      .toLowerCase();
    const date = new Date().toISOString().split('T')[0];
    return `${sanitizedName}-${date}.bpmn`;
  }
  
  downloadBpmnFile(xmlContent, fileName) {
    const blob = new Blob([xmlContent], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==================== PROJECT IMPORT ====================

  /**
   * Loads and imports a project from a file
   */
  async loadProjectFromFile(file) {
    try {
      console.log('📥 Loading project - Direct canvas restoration...');
      
      // Policy: when opening, clear existing local storage and in-memory PPIs first
      await this.clearLocalStorageState();

      const projectData = await this.parseProjectFile(file);
      await this.importProjectData(projectData);
      
      console.log('✅ Project imported - State restored to canvas');
      this.showMessage('Project imported successfully', 'success');
      
    } catch (error) {
      console.error('❌ Import error:', error);
      this.showMessage('Import error: ' + error.message, 'error');
    }
  }

  async parseProjectFile(file) {
    const text = await file.text();
    return JSON.parse(text);
  }

  async importProjectData(projectData) {
    // Ensure clean state before any import (JSON, CBPMN, BPMN-only)
    await this.clearLocalStorageState();
    
    // Apply RALPH namespace normalization to BPMN data if present
    if (projectData.bpmn) {
      // Verificar si es el formato nuevo (con diagram) o antiguo (string directo)
      if (projectData.bpmn.diagram) {
        projectData.bpmn.diagram = normalizeRALPHNamespaces(projectData.bpmn.diagram);
      } else if (typeof projectData.bpmn === 'string') {
        projectData.bpmn = normalizeRALPHNamespaces(projectData.bpmn);
      }
    }
    
    const importOrder = [
      { key: 'bpmn', method: 'restoreBpmnToCanvas', module: this.bpmnImporter },
      { key: 'ppi', method: 'restorePPIToCanvas', module: this.dataRestore },
      { key: 'rasci', method: 'restoreRasciToStores', module: this.dataRestore },
      { key: 'ralph', method: 'restoreRalphToCanvas', module: this.dataRestore }
    ];

    for (const { key, method, module } of importOrder) {
      if (projectData[key]) {
        // CRITICAL: For RALPH, merge waypoints from bpmn.ralphElements (same as localStorage)
        let dataToRestore = projectData[key];
        
        if (key === 'ralph' && projectData.bpmn && projectData.bpmn.ralphElements) {
          console.log('🔄 RALPH IMPORT: Merging waypoints from bpmn.ralphElements into ralph.elements');
          const bpmnRalphElements = projectData.bpmn.ralphElements;
          const ralphElements = projectData.ralph.elements || [];
          
          // Create maps for waypoints and source/target
          const waypointsMap = {};
          const sourceTargetMap = {};
          
          bpmnRalphElements.forEach(el => {
            if (el.waypoints && el.id) {
              waypointsMap[el.id] = el.waypoints;
              console.log(`   Found waypoints for ${el.id}: ${el.waypoints.length} points`);
            }
            if (el.source && el.target && el.id) {
              sourceTargetMap[el.id] = { source: el.source, target: el.target };
            }
          });
          
          // Merge into ralph elements
          const mergedElements = ralphElements.map(el => {
            const merged = { ...el };
            if (waypointsMap[el.id]) {
              merged.waypoints = waypointsMap[el.id];
            }
            if (sourceTargetMap[el.id]) {
              merged.source = sourceTargetMap[el.id].source;
              merged.target = sourceTargetMap[el.id].target;
            }
            return merged;
          });
          
          console.log(`✅ IMPORT: Merged waypoints for ${Object.keys(waypointsMap).length} RALPH connections`);
          dataToRestore = { elements: mergedElements };
        }
        
        await module[method](dataToRestore);
      }
    }

    // After import, update project name from imported data if available (via ProjectInfoService)
    try {
      const importedName = (projectData.formData && projectData.formData.projectSettings && projectData.formData.projectSettings.name)
        || (projectData.metadata && projectData.metadata.project && projectData.metadata.project.name)
        || null;
      if (importedName) {
        const sr = getServiceRegistry();
        const projectInfo = sr && sr.get ? sr.get('ProjectInfoService') : null;
        if (projectInfo && typeof projectInfo.setName === 'function') {
          projectInfo.setName(importedName);
        } else {
          this.setProjectName(importedName);
        }
      }
    } catch (nameUpdateError) {
      console.debug('Project name update skipped:', (nameUpdateError && nameUpdateError.message) || nameUpdateError);
    }

    // Purga adicional: asegurar que no queden PPIs huérfanos tras la importación
    try {
      const sr = getServiceRegistry();
      const ppiManager = sr && sr.get ? sr.get('PPIManagerInstance') : null;
      if (ppiManager && ppiManager.core && typeof ppiManager.core.purgeOrphanedPPIs === 'function') {
        ppiManager.core.purgeOrphanedPPIs();
        // refrescar lista si la UI está disponible
        if (ppiManager.ui && typeof ppiManager.ui.refreshPPIList === 'function') {
          ppiManager.ui.refreshPPIList();
        }
      }
    } catch (e) {
      console.debug('Purge orphan PPIs post-import skipped:', (e && e.message) || e);
    }
  }

  /**
   * Public API for importing project data (compatibility)
   */
  async importAllProjectData(projectData) {
    try {
      console.log('📥 Importing project data (public API)...');
      
      // CRITICAL: Evitar import automático si localStorage ya fue restaurado recientemente
      const registry = getServiceRegistry && getServiceRegistry();
      const localStorageIntegration = registry && registry.get ? registry.get('LocalStorageIntegration') : null;
      if (localStorageIntegration && typeof localStorageIntegration.isRecentlyRestored === 'function') {
        const isRecent = localStorageIntegration.isRecentlyRestored();
        if (isRecent) {
          console.log('🛑 Skipping import - LocalStorage was recently restored, avoiding overwrite');
          return;
        }
      }
      
      // NEW: Detect file type
      if (typeof projectData === 'string' && projectData.includes('<?xml')) {
        console.log('🔍 Detected BPMN XML file - importing as basic diagram');
        return await this.importBpmnXmlFile(projectData);
      }
      
      if (projectData.diagram && Array.isArray(projectData.diagram)) {
        console.log('🔍 Detected CBPMN file - importing separate PPINOT elements');
        return await this.importCbpmnFile(projectData);
      }
      
      // Import in order: BPMN → PPI → RASCI → RALPH (unified JSON format)
      console.log('🔍 Detected unified JSON format - importing complete project');
      
      // Si projectData tiene una estructura anidada con 'data', usamos eso
      const dataToImport = projectData.data || projectData;
      
      await this.importProjectData(dataToImport);
      
      console.log('✅ Project imported correctly (public API)');
      this.showMessage('Project imported correctly', 'success');
      
    } catch (error) {
      console.error('❌ Import error (public API):', error);
      this.showMessage('Import error: ' + error.message, 'error');
      throw error;
    }
  }

  async importBpmnXmlFile(xmlContent) {
    console.log('📥 Importing BPMN XML file...');
    
    await this.clearLocalStorageState();

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler not available');
    }

    try {
      await modeler.importXML(xmlContent);
      console.log('✅ BPMN XML file imported correctly');
      return { success: true, message: 'BPMN diagram imported' };
    } catch (error) {
      console.error('❌ Error importing BPMN XML:', error);
      throw error;
    }
  }

  async importCbpmnFile(cbpmnData) {
    console.log('📥 Importing CBPMN file (separate PPINOT elements)...');
    
    await this.clearLocalStorageState();

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      throw new Error('Modeler not available');
    }

    try {
      // CBPMN files contain PPINOT elements with positions
      console.log(`🔍 PPINOT elements in CBPMN: ${cbpmnData.diagram && cbpmnData.diagram.length || 0}`);
      
      if (cbpmnData.diagram && cbpmnData.diagram.length > 0) {
        const elementFactory = modeler.get('elementFactory');
        const canvas = modeler.get('canvas');
        const modeling = modeler.get('modeling');
        
        if (!elementFactory || !canvas || !modeling) {
          throw new Error('Modeler services not available');
        }

        // Create each PPINOT element in canvas
        for (const elementData of cbpmnData.diagram) {
          try {
            console.log(`🔧 Creating element: ${elementData.id} (${elementData.type})`);
            console.log(`  📍 CBPMN position: x=${elementData.x}, y=${elementData.y}, w=${elementData.width}, h=${elementData.height}`);
            
            // Create element using factory
            const element = elementFactory.create('shape', {
              type: elementData.type,
              id: elementData.id,
              width: elementData.width,
              height: elementData.height
            });

            // Add to canvas in correct position
            const createdElement = modeling.createShape(element, 
              { x: elementData.x, y: elementData.y }, 
              canvas.getRootElement()
            );
            
            console.log(`✅ Element created: ${elementData.id} at position (${elementData.x}, ${elementData.y})`);
            
            // Verify final position
            if (createdElement) {
              console.log(`  🔍 Final position: x=${createdElement.x}, y=${createdElement.y}, w=${createdElement.width}, h=${createdElement.height}`);
            }
            
          } catch (elementError) {
            console.warn(`⚠️ Error creating element ${elementData.id}:`, elementError.message);
          }
        }

        // Restore connections if they exist
        if (cbpmnData.definitions && cbpmnData.definitions.consequences) {
          console.log(`🔗 Restoring ${cbpmnData.definitions.consequences.length} connections...`);
          // TODO: Implement PPINOT connection restoration
        }
        
        // CRITICAL: Restore parent-child relationships after creating elements
        console.log('🔄 Restoring parent-child relationships of CBPMN elements...');
        setTimeout(async () => {
          await this.restoreCbpmnRelationships(modeler, cbpmnData.diagram);
        }, 1000);
      }
      
      console.log('✅ CBPMN file imported correctly');
      return { success: true, message: 'PPINOT elements imported from CBPMN' };
      
    } catch (error) {
      console.error('❌ Error importing CBPMN:', error);
      throw error;
    }
  }

  async restoreCbpmnRelationships(modeler, diagramElements) {
    console.log('🔄 Restoring parent-child relationships of CBPMN elements...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    if (!elementRegistry || !modeling) {
      console.warn('⚠️ Modeler services not available');
      return;
    }

    // Search parent PPI (main container element)
    const ppiElement = diagramElements.find(el => el.type === 'PPINOT:Ppi');
    if (!ppiElement) {
      console.warn('⚠️ Parent PPI element not found in CBPMN');
      return;
    }

    const parentElement = elementRegistry.get(ppiElement.id);
    if (!parentElement) {
      console.warn(`⚠️ Parent PPI element ${ppiElement.id} not found in canvas`);
      return;
    }

    let restoredCount = 0;

    // Move all child elements to parent PPI
    for (const elementData of diagramElements) {
      if (elementData.type !== 'PPINOT:Ppi' && !elementData.type.includes('Connection')) {
        const childElement = elementRegistry.get(elementData.id);
        
        if (childElement) {
          try {
            console.log(`🔗 Moving ${elementData.id} to parent PPI ${ppiElement.id}`);
            
            // Move element to parent using moveElements
            modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // Set businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
            restoredCount++;
            console.log(`✅ Relationship restored: ${elementData.id} → ${ppiElement.id}`);
            
          } catch (error) {
            console.warn(`⚠️ Error moving element ${elementData.id}:`, error.message);
          }
    } else {
          console.warn(`⚠️ Child element ${elementData.id} not found in canvas`);
        }
      }
    }

    console.log(`🎉 CBPMN relationships restored: ${restoredCount} elements moved to parent PPI`);
  }

  // ==================== UTILITY METHODS ====================

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
    this.config.projectName = name || 'Nuevo Diagrama';
  }

  importProject() {
    const fileInput = document.getElementById('import-export-file-input');
    if (fileInput) fileInput.click();
  }

  // ==================== DEBUG METHODS ====================

  debugCanvasState() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    try {
    const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      console.log('🔍 Current canvas state:');
      console.log(`📊 Total elements: ${allElements.length}`);
      
      // Analyze elements by type
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
      
      console.log('📋 Elements by type:', elementsByType);
      console.log(`🔗 Elements with parent: ${elementsWithParent.length}`);
      
      if (elementsWithParent.length > 0) {
        console.log('📋 Current parent-child relationships:');
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
      console.error('❌ Error in canvas debug:', error);
      return null;
    }
  }

  testRelationshipCapture() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    console.log('🧪 Testing relationship capture...');
    
    const relationshipCapture = new RelationshipCapture(this.config);
    const relationships = relationshipCapture.captureParentChildRelationships(modeler);
    
    console.log('🎯 Significant relationships (to be exported):');
    relationships.forEach((rel, i) => {
      console.log(`  ${i + 1}. ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
    });
    
    return {
      total: relationships.length,
      relationships: relationships
    };
  }

  debugPPINOTSpecificRelations() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    console.log('🔍 SPECIFIC PPINOT DEBUG - Analyzing relationships...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Search PPIs
    const ppiElements = allElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );

    // Search PPINOT child elements
    const ppinotChildren = allElements.filter(el => 
      el.type && el.type.includes('PPINOT:') && 
      !el.type.includes('PPINOT:Ppi') &&
      el.type !== 'label'
    );

    console.log(`📊 PPIs found: ${ppiElements.length}`);
    ppiElements.forEach(ppi => {
      const pos = this.getElementPosition(ppi);
      console.log(`  🎯 ${ppi.id} (${this.getElementName(ppi)}) at (${pos.x}, ${pos.y})`);
    });

    console.log(`📊 PPINOT child elements: ${ppinotChildren.length}`);
    ppinotChildren.forEach(child => {
      const pos = this.getElementPosition(child);
      const parent = child.parent ? `${child.parent.id} (${this.getElementType(child.parent)})` : 'No parent';
      const businessParent = child.businessObject && child.businessObject.$parent ? 
        child.businessObject.$parent.id : 'No businessObject.$parent';
      
      console.log(`  📍 ${child.id} (${this.getElementName(child)}) at (${pos.x}, ${pos.y})`);
      console.log(`    👨‍👦 Visual parent: ${parent}`);
      console.log(`    🏢 BusinessObject.$parent: ${businessParent}`);
      
      // Calculate distance to nearest PPI
      if (ppiElements.length > 0) {
        const relationshipCapture = new RelationshipCapture(this.config);
        const closest = relationshipCapture.findClosestPPI(child, ppiElements);
        if (closest) {
          const closestPos = this.getElementPosition(closest);
          const distance = Math.sqrt(
            Math.pow(pos.x - closestPos.x, 2) + 
            Math.pow(pos.y - closestPos.y, 2)
          );
          console.log(`    📏 Nearest PPI: ${closest.id} (distance: ${distance.toFixed(0)}px)`);
        }
      }
    });

    return {
      ppis: ppiElements.length,
      children: ppinotChildren.length
    };
  }

  testTargetScopeRelations() {
    console.log('🧪 SPECIFIC TEST: Target, Scope, BaseMeasure...');
    
    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    // Search specific elements
    const targets = allElements.filter(el => el.type && el.type.includes('Target'));
    const scopes = allElements.filter(el => el.type && el.type.includes('Scope'));
    const baseMeasures = allElements.filter(el => el.type && el.type.includes('BaseMeasure'));
    const ppis = allElements.filter(el => el.type && el.type.includes('PPINOT:Ppi'));
    
    console.log(`📊 Elements found:`);
    console.log(`  🎯 Targets: ${targets.length}`);
    console.log(`  📏 Scopes: ${scopes.length}`);
    console.log(`  📊 BaseMeasures: ${baseMeasures.length}`);
    console.log(`  🏆 PPIs: ${ppis.length}`);
    
    // Test manually creating Target → nearest PPI relationships
    const relationshipCapture = new RelationshipCapture(this.config);
    
    targets.forEach(target => {
      const closestPPI = relationshipCapture.findClosestPPI(target, ppis);
      if (closestPPI) {
        const distance = relationshipCapture.calculateDistance(
          relationshipCapture.getElementCenter(target),
          relationshipCapture.getElementCenter(closestPPI)
        );
        console.log(`🎯 Target ${target.id} → PPI ${closestPPI.id} (${distance.toFixed(0)}px)`);
        
        // Test if relationship would be significant
        const isSignificant = relationshipCapture.isSignificantParentChildRelationship(target, closestPPI);
        console.log(`  ✅ Significant relationship? ${isSignificant}`);
      }
    });
  }

  async forceRestoreRelations(projectData) {
    if (!projectData || !projectData.bpmn || !projectData.bpmn.relationships) {
      console.log('❌ No relationships to restore');
      return;
    }

    const modeler = resolve('BpmnModeler');
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    const relationshipRestore = new RelationshipRestore(this.config);
    
    return await relationshipRestore.forceRestoreRelations(modeler, projectData.bpmn.relationships);
  }

  // Utility methods
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
}

// Export singleton instance
export default new ImportExportManager();
