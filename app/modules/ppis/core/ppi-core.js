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

    this.dataManager = new PPIDataManager();
    this.canvasManager = new PPICanvasManager();
    this.xmlManager = new PPIXMLManager();
  }

  // ==================== API PÚBLICA - GESTIÓN DE PPIS ====================

  generatePPIId() {
    return this.dataManager.generatePPIId();
  }

  createPPI(data) {
    return this.dataManager.createPPI(data);
  }

  addPPI(ppi) {
    return this.dataManager.addPPI(ppi);
  }

  async updatePPI(ppiId, updatedData, source = null) {
    console.log('🔧 [PPICore] Iniciando updatePPI para:', ppiId, 'desde source:', source);
    const result = await this.dataManager.updatePPI(ppiId, updatedData, source);
    console.log('✅ [PPICore] Resultado updatePPI:', result);
    
    if (result && result.success && source === 'form' && result.data && result.data.elementId) {
      this.syncFormToCanvas(result.data, updatedData);
    }
    return result;
  }

  deletePPI(ppiId) {
    const result = this.dataManager.deletePPI(ppiId);
    if (result && result.success && result.data && result.data.elementId) {
      this.canvasManager.deletePPIFromCanvas(ppiId, result.data);
    }
    // CORREGIDO: Retornar el resultado completo para verificar success
    return result;
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

  /**
   * Limpia todos los PPIs de la memoria y del localStorage
   * Se usa cuando se crea un nuevo diagrama
   */
  async clearAllPPIs() {
    return await this.dataManager.clearAllPPIs();
  }

  // ==================== API PÚBLICA - ELEMENTOS PPINOT ====================

  savePPINOTElements() {
    return false; // Delegado a LocalStorageManager
  }

  loadPPINOTElements() {
    return false; // Delegado a LocalStorageManager
  }

  restorePPINOTElements() {
    return false; // Delegado a ImportExportManager
  }

  restoreParentChildRelationship() {
    return false; // Delegado a LocalStorageManager
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
    return false; // Delegado a LocalStorageManager
  }

  disableAutoSave() {
    return false; // Delegado a LocalStorageManager
  }

  isAutoSaveEnabled() {
    return false; // Delegado a LocalStorageManager
  }

  // ==================== API PÚBLICA - UTILIDADES ====================

  detectMeasureType(elementId, elementType) {
    return PPIUtils.detectMeasureType(elementId, elementType);
  }

  extractChildElementInfo() {
    return null; // Delegado a LocalStorageManager
  }

  exportPPIsToFile() {
    this.dataManager.exportPPIsToFile();
  }

  parseFormData(formData) {
    return this.dataManager.parseFormData(formData);
  }

  // ==================== MÉTODOS LEGACY (Compatibilidad) ====================

  loadPPIs() {
    this.dataManager.loadPPIs();
  }

  savePPIs() {
    this.dataManager.savePPIs();
  }

  truncateText(text, maxLength) {
    return PPIUtils.truncateText(text, maxLength);
  }

  debouncedSavePPINOTElements() {
    return false; // Delegado a LocalStorageManager
  }

  forceSavePPINOTElements() {
    return false; // Delegado a LocalStorageManager
  }

  updatePPIsWithRestoredChildren(restoredChildren) {
    return this.canvasManager.updatePPIsWithRestoredChildren(restoredChildren, this.dataManager);
  }

  clearPPIChildInfo(elementType, parentPPIId = null) {
    return this.canvasManager.clearPPIChildInfo(elementType, parentPPIId, this.dataManager);
  }

  cleanupOldData() {
    return false; // Delegado a LocalStorageManager
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

      if (Object.prototype.hasOwnProperty.call(updatedData, 'target')) {
        const targetEl = allElements.find(
          el =>
            el.parent?.id === ppi.elementId &&
            (el.type === 'PPINOT:Target' || el.businessObject?.$type === 'PPINOT:Target')
        );
        if (targetEl) {
          try {
            modeling.updateProperties(targetEl, { name: updatedData.target || '' });
            if (targetEl.businessObject) targetEl.businessObject.name = updatedData.target || '';
          } catch (error) {
            console.warn('Error actualizando target en canvas:', error);
          }
        }
      }

      if (Object.prototype.hasOwnProperty.call(updatedData, 'scope')) {
        const scopeEl = allElements.find(
          el =>
            el.parent?.id === ppi.elementId &&
            (el.type === 'PPINOT:Scope' || el.businessObject?.$type === 'PPINOT:Scope')
        );
        if (scopeEl) {
          try {
            modeling.updateProperties(scopeEl, { name: updatedData.scope || '' });
            if (scopeEl.businessObject) scopeEl.businessObject.name = updatedData.scope || '';
          } catch (error) {
            console.warn('Error actualizando scope en canvas:', error);
          }
        }
      }
    } catch (error) {
      console.warn('Error sincronizando formulario con canvas:', error);
    }
  }

  getBpmnModeler() {
    if (this.adapter?.getBpmnModeler) {
      return this.adapter.getBpmnModeler();
    }
    return PPIUtils.getBpmnModeler();
  }

  // ==================== GETTERS / SETTERS (Compatibilidad) ====================

  get ppis() {
    return this.dataManager.ppis;
  }

  set ppis(value) {
    if (this.dataManager && this.dataManager.ppis !== undefined) {
      this.dataManager.ppis = value;
    }
  }

  get filteredPPIs() {
    return this.dataManager.filteredPPIs;
  }

  set filteredPPIs(value) {
    if (this.dataManager && this.dataManager.filteredPPIs !== undefined) {
      this.dataManager.filteredPPIs = value;
    }
  }

  get measureTypes() {
    return this.dataManager.measureTypes;
  }
}

// Registro en ServiceRegistry
const registry = getServiceRegistry();
if (registry) {
  registry.register('PPICore', PPICore, {
    description: 'Core de PPIs refactorizado con managers especializados',
  });
}

export default PPICore;
