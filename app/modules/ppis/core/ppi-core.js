/**
 * PPICore - Refactored
 * 
 * Coordinador principal que orquesta los diferentes managers especializados.
 * Responsabilidades:
 * - Inicialización y configuración
 * - Coordinación entre managers
 * - API pública simplificada
 * - Delegación de responsabilidades específicas
 */

import { PPIDataManager } from './managers/PPIDataManager.js';
import { PPIElementManager } from './managers/PPIElementManager.js';
import { PPICanvasManager } from './managers/PPICanvasManager.js';
import { PPIXMLManager } from './managers/PPIXMLManager.js';
import { PPIUtils } from './utils/PPIUtils.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

class PPICore {
  constructor(adapter = null) {
    this.adapter = adapter;
    
    // Inicializar managers especializados
    this.dataManager = new PPIDataManager();
    this.elementManager = new PPIElementManager();
    this.canvasManager = new PPICanvasManager();
    this.xmlManager = new PPIXMLManager();
    
    console.log('✅ PPICore refactorizado inicializado con managers especializados');
    
    // Cargar elementos PPINOT al inicializar
    this.elementManager.loadPPINOTElements();
  }

  // ==================== API PÚBLICA - GESTIÓN DE PPIS ====================
  
  generatePPIId() {
    return this.dataManager.generatePPIId();
  }

  createPPI(data) {
    return this.dataManager.createPPI(data);
  }

  addPPI(ppi) {
    const result = this.dataManager.addPPI(ppi);
    
    // Coordinar con otros managers si es necesario
    this.elementManager.debouncedSavePPINOTElements();
    
    return result;
  }

  updatePPI(ppiId, updatedData, __source = null) {
    const result = this.dataManager.updatePPI(ppiId, updatedData, __source);
    
    if (result) {
      // Si la actualización viene del formulario, coordinar con canvas
      if (__source === 'form' && result.elementId) {
        this.syncFormToCanvas(result, updatedData);
      }
      
      this.elementManager.debouncedSavePPINOTElements();
    }
    
    return result;
  }

  deletePPI(ppiId) {
    const deletedPPI = this.dataManager.deletePPI(ppiId);
    
    if (deletedPPI) {
      // Eliminar también del canvas si tiene elementId
      if (deletedPPI.elementId) {
        this.canvasManager.deletePPIFromCanvas(ppiId, deletedPPI);
      }
      
      this.elementManager.debouncedSavePPINOTElements();
    }
    
    return deletedPPI;
  }

  getPPI(ppiId) {
    return this.dataManager.getPPI(ppiId);
  }

  getAllPPIs() {
    return this.dataManager.getAllPPIs();
  }

  getPPIsForElement(elementId) {
    return this.dataManager.getPPIsForElement(elementId);
  }

  // ==================== API PÚBLICA - ELEMENTOS PPINOT ====================
  
  savePPINOTElements() {
    this.elementManager.savePPINOTElements();
  }

  loadPPINOTElements() {
    return this.elementManager.loadPPINOTElements();
  }

  restorePPINOTElements() {
    // Método simplificado - delegar al ImportExportManager si está disponible
    console.log('ℹ️ restorePPINOTElements - delegando al sistema unificado');
    return false;
  }

  restoreParentChildRelationship(childId, parentId, childData = null) {
    return this.elementManager.restoreParentChildRelationship(childId, parentId, childData);
  }

  // ==================== API PÚBLICA - CANVAS ====================

  deletePPIFromCanvas(ppiId, ppiData = null) {
    return this.canvasManager.deletePPIFromCanvas(ppiId, ppiData);
  }

  purgeOrphanedPPIs() {
    this.canvasManager.purgeOrphanedPPIs(this.dataManager);
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    this.canvasManager.updatePPIWithChildInfo(parentPPIId, childElementId, this.dataManager);
  }

  isPPIElement(element) {
    return this.canvasManager.isPPIElement(element);
  }

  // ==================== API PÚBLICA - XML ====================

  savePPINOTRelationshipsToXML(relationships) {
    this.xmlManager.savePPINOTRelationshipsToXML(relationships);
  }

  loadPPINOTRelationshipsFromXML() {
    return this.xmlManager.loadPPINOTRelationshipsFromXML();
  }

  restorePPINOTRelationshipsFromXML(relationships) {
    this.xmlManager.restorePPINOTRelationshipsFromXML(relationships);
  }

  // ==================== API PÚBLICA - FILTROS Y BÚSQUEDAS ====================

  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    return this.dataManager.filterPPIs(searchTerm, typeFilter, statusFilter);
  }

  getStatistics() {
    return this.dataManager.getStatistics();
  }

  // ==================== API PÚBLICA - CONFIGURACIÓN ====================

  enableAutoSave() {
    this.elementManager.enableAutoSave();
  }

  disableAutoSave() {
    this.elementManager.disableAutoSave();
  }

  isAutoSaveEnabled() {
    return this.elementManager.isAutoSaveEnabled();
  }

  // ==================== API PÚBLICA - UTILIDADES ====================

  detectMeasureType(elementId, elementType) {
    return PPIUtils.detectMeasureType(elementId, elementType);
  }

  extractChildElementInfo(childElementId) {
    return this.elementManager.extractChildElementInfo(childElementId);
  }

  exportPPIsToFile() {
    this.dataManager.exportPPIsToFile();
  }

  parseFormData(formData) {
    return this.dataManager.parseFormData(formData);
  }

  // ==================== MÉTODOS LEGACY PARA COMPATIBILIDAD ====================

  loadPPIs() {
    // Método legacy - los PPIs se cargan automáticamente en el constructor del dataManager
    this.dataManager.loadPPIs();
  }

  savePPIs() {
    // Método legacy - delegar al dataManager
    this.dataManager.savePPIs();
  }

  // Método de utilidad para truncar texto (usado por UI)
  truncateText(text, maxLength) {
    return PPIUtils.truncateText(text, maxLength);
  }

  // Métodos adicionales para compatibilidad con UI
  debouncedSavePPINOTElements() {
    return this.elementManager.debouncedSavePPINOTElements();
  }

  forceSavePPINOTElements() {
    return this.elementManager.forceSavePPINOTElements();
  }

  updatePPIsWithRestoredChildren(restoredChildren) {
    return this.canvasManager.updatePPIsWithRestoredChildren(restoredChildren, this.dataManager);
  }

  clearPPIChildInfo(elementType, parentPPIId = null) {
    return this.canvasManager.clearPPIChildInfo(elementType, parentPPIId, this.dataManager);
  }

  cleanupOldData() {
    return this.elementManager.cleanupOldData();
  }

  // ==================== MÉTODOS DE COORDINACIÓN INTERNA ====================

  syncFormToCanvas(ppi, updatedData) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler || !ppi.elementId) return;
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) return;

      const parentElement = elementRegistry.get(ppi.elementId);
      if (!parentElement) return;

      const allElements = elementRegistry.getAll();

      // Sincronizar target
      if (Object.prototype.hasOwnProperty.call(updatedData, 'target')) {
        const targetEl = allElements.find(el => 
          el.parent && el.parent.id === ppi.elementId && 
          (el.type === 'PPINOT:Target' || (el.businessObject && el.businessObject.$type === 'PPINOT:Target'))
        );
        
        if (targetEl) {
          try {
            modeling.updateProperties(targetEl, { name: updatedData.target || '' });
            if (targetEl.businessObject) targetEl.businessObject.name = updatedData.target || '';
            } catch (error) {
            console.debug('Error actualizando target:', error);
          }
        }
      }

      // Sincronizar scope
      if (Object.prototype.hasOwnProperty.call(updatedData, 'scope')) {
        const scopeEl = allElements.find(el => 
          el.parent && el.parent.id === ppi.elementId && 
          (el.type === 'PPINOT:Scope' || (el.businessObject && el.businessObject.$type === 'PPINOT:Scope'))
        );
        
        if (scopeEl) {
          try {
            modeling.updateProperties(scopeEl, { name: updatedData.scope || '' });
            if (scopeEl.businessObject) scopeEl.businessObject.name = updatedData.scope || '';
      } catch (error) {
            console.debug('Error actualizando scope:', error);
          }
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Error sincronizando formulario con canvas:', error);
    }
  }

  getBpmnModeler() {
    if (this.adapter && typeof this.adapter.getBpmnModeler === 'function') {
      return this.adapter.getBpmnModeler();
    }
    
    return PPIUtils.getBpmnModeler();
  }



  // ==================== GETTERS PARA COMPATIBILIDAD ====================

  get ppis() {
    return this.dataManager.ppis;
  }

  get filteredPPIs() {
    return this.dataManager.filteredPPIs;
  }

  get measureTypes() {
    return this.dataManager.measureTypes;
  }
}

// Registrar en ServiceRegistry para compatibilidad
const registry = getServiceRegistry();
if (registry) {
  registry.register('PPICore', PPICore, { 
    description: 'Core de PPIs refactorizado con managers especializados' 
  });
  console.log('✅ PPICore refactorizado registrado en ServiceRegistry');
}

export default PPICore;
