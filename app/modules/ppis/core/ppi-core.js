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
import { PPICanvasManager } from './managers/PPICanvasManager.js';
import { PPIXMLManager } from './managers/PPIXMLManager.js';
import { PPIUtils } from './utils/PPIUtils.js';
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

class PPICore {
  constructor(adapter = null) {
    this.adapter = adapter;
    
    // Inicializar managers especializados
    this.dataManager = new PPIDataManager();
    this.canvasManager = new PPICanvasManager();
    this.xmlManager = new PPIXMLManager();
    
    console.log('✅ PPICore refactorizado inicializado con managers especializados');
  }

  // ==================== API PÚBLICA - GESTIÓN DE PPIS ====================
  
  generatePPIId() {
    return this.dataManager.generatePPIId();
  }

  createPPI(data) {
    return this.dataManager.createPPI(data);
  }

  // Métodos básicos expuestos más abajo con lógica adicional

  addPPI(ppi) {
    const result = this.dataManager.addPPI(ppi);
    
    // Coordinar con otros managers si es necesario
    // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    
    return result;
  }

  updatePPI(ppiId, updatedData, __source = null) {
    const result = this.dataManager.updatePPI(ppiId, updatedData, __source);
    
    if (result) {
      // Si la actualización viene del formulario, coordinar con canvas
      if (__source === 'form' && result.elementId) {
        this.syncFormToCanvas(result, updatedData);
      }
      
      // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    }
    
    return result;
  }

  deletePPI(ppiId) {
    const result = this.dataManager.deletePPI(ppiId);
    
    if (result && result.success) {
      const deletedPPI = result.data;
      // Eliminar también del canvas si tiene elementId
      if (deletedPPI && deletedPPI.elementId) {
        this.canvasManager.deletePPIFromCanvas(ppiId, deletedPPI);
      }
      // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
      return deletedPPI;
    }
    
    return null;
  }

  getPPI(ppiId) {
    return this.dataManager.getPPI(ppiId);
  }

  getAllPPIs() {
    return this.dataManager.getAllPPIs();
  }
  
  getVisiblePPIs() {
    return this.dataManager.getVisiblePPIs();
  }

  getPPIsForElement(elementId) {
    return this.dataManager.getPPIsForElement(elementId);
  }

  // ==================== API PÚBLICA - ELEMENTOS PPINOT ====================
  
  savePPINOTElements() {
    // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    console.log('ℹ️ savePPINOTElements - delegando al LocalStorageManager');
  }

  loadPPINOTElements() {
    // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    console.log('ℹ️ loadPPINOTElements - delegando al LocalStorageManager');
    return false;
  }

  restorePPINOTElements() {
    // Método simplificado - delegar al ImportExportManager si está disponible
    console.log('ℹ️ restorePPINOTElements - delegando al sistema unificado');
    return false;
  }

  restoreParentChildRelationship(childId, parentId, /* eslint-disable-line no-unused-vars */ _ = null) {
    // Nota: elementManager eliminado, la restauración se maneja por LocalStorageManager
    console.log('ℹ️ restoreParentChildRelationship - delegando al LocalStorageManager');
    return false;
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
    // Nota: elementManager eliminado, el autosave se maneja por LocalStorageManager
    console.log('ℹ️ enableAutoSave - delegando al LocalStorageManager');
  }

  disableAutoSave() {
    // Nota: elementManager eliminado, el autosave se maneja por LocalStorageManager
    console.log('ℹ️ disableAutoSave - delegando al LocalStorageManager');
  }

  isAutoSaveEnabled() {
    // Nota: elementManager eliminado, el autosave se maneja por LocalStorageManager
    console.log('ℹ️ isAutoSaveEnabled - delegando al LocalStorageManager');
    return false;
  }

  // ==================== API PÚBLICA - UTILIDADES ====================

  detectMeasureType(elementId, elementType) {
    return PPIUtils.detectMeasureType(elementId, elementType);
  }

  extractChildElementInfo(/* eslint-disable-line no-unused-vars */ _) {
    // Nota: elementManager eliminado, esta funcionalidad se maneja por LocalStorageManager
    console.log('ℹ️ extractChildElementInfo - delegando al LocalStorageManager');
    return null;
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
    // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    console.log('ℹ️ debouncedSavePPINOTElements - delegando al LocalStorageManager');
    return false;
  }

  forceSavePPINOTElements() {
    // Nota: elementManager eliminado, la persistencia se maneja por LocalStorageManager
    console.log('ℹ️ forceSavePPINOTElements - delegando al LocalStorageManager');
    return false;
  }

  updatePPIsWithRestoredChildren(restoredChildren) {
    return this.canvasManager.updatePPIsWithRestoredChildren(restoredChildren, this.dataManager);
  }

  clearPPIChildInfo(elementType, parentPPIId = null) {
    return this.canvasManager.clearPPIChildInfo(elementType, parentPPIId, this.dataManager);
  }

  cleanupOldData() {
    // Nota: elementManager eliminado, la limpieza se maneja por LocalStorageManager
    console.log('ℹ️ cleanupOldData - delegando al LocalStorageManager');
    return false;
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

  set ppis(value) {
    // Redirigir la asignación al dataManager
    if (this.dataManager && this.dataManager.ppis !== undefined) {
      this.dataManager.ppis = value;
    }
  }

  get filteredPPIs() {
    return this.dataManager.filteredPPIs;
  }

  set filteredPPIs(value) {
    // Redirigir la asignación al dataManager
    if (this.dataManager && this.dataManager.filteredPPIs !== undefined) {
      this.dataManager.filteredPPIs = value;
    }
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
