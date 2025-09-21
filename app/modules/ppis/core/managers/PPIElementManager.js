/**
 * PPIElementManager
 * 
 * Responsabilidades:
 * - Gestión de elementos PPINOT en el canvas
 * - Relaciones padre-hijo entre elementos
 * - Detección y clasificación de tipos de elementos
 * - Restauración de elementos desde localStorage
 */

import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';
import { PPIUtils } from '../utils/PPIUtils.js';

export class PPIElementManager {
  constructor() {
    this.processedElements = new Set();
    this.pendingPPINOTRestore = null;
    this.isRestoringElements = false;
    this.isLoadingRelationships = false;
    
    // Configuración de autosave
    this.autoSaveEnabled = true;
    this.autoSaveTimeout = null;
    this.autoSaveDelay = 1000;
    this.lastSaveTime = 0;
    this.minSaveInterval = 2000;
  }

  // ==================== GESTIÓN DE ELEMENTOS PPINOT ====================

  savePPINOTElements() {
    const startTime = performance.now();
    
    try {
      if (!this.isAutoSaveEnabled()) {
        return;
      }
      
      // Prevenir ejecución demasiado frecuente
      const now = Date.now();
      if (now - this.lastSaveTime < 1000) {
        return;
      }
      
      const modeler = this.getBpmnModeler();
      if (!modeler) {
        return;
      }
      
      this.lastSaveTime = now;
      
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Filtrar elementos PPI
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      // Detectar hijos PPINOT
      const ppiChildren = this.detectPPINOTChildren(allElements);
      
      // Combinar todos los elementos PPINOT
      const allPPINOTElements = [...ppiElements, ...ppiChildren]
        .filter(e => e && e.type !== 'label' && (!e.businessObject || e.businessObject.$type !== 'label'));
      
      // Crear relaciones padre-hijo
      const relationships = this.createRelationships(ppiChildren, ppiElements);
      
      // ELIMINADO: No guardar en localStorage - solo usar autosave
      // localStorage.setItem('ppinotElements', JSON.stringify(allPPINOTElements));
      // localStorage.setItem('ppinotRelationships', JSON.stringify(relationships));
      
      console.log(`💾 Guardados ${allPPINOTElements.length} elementos PPINOT y ${relationships.length} relaciones`);
      
    } catch (error) {
      console.error('Error guardando elementos PPINOT:', error);
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 100) {
        console.warn(`⚠️ savePPINOTElements took ${duration.toFixed(2)}ms`);
      }
    }
  }

  detectPPINOTChildren(allElements) {
    const ppiChildren = [];
    
    for (const element of allElements) {
      // Ignorar labels
      if (element.type === 'label' || (element.businessObject && element.businessObject.$type === 'label')) {
        continue;
      }
      
      const type = element.type || '';
      const boType = (element.businessObject && element.businessObject.$type) || '';
      
      // Cualquier elemento PPINOT que no sea el propio PPI
      const isPPINOTAny = (type.startsWith('PPINOT:') || boType.startsWith('PPINOT:')) && 
                         (type !== 'PPINOT:Ppi' && boType !== 'PPINOT:Ppi');
      
      // Señales adicionales para Target/Scope
      const isTargetOrScopeById = element.id && (element.id.includes('Target') || element.id.includes('Scope'));
      const isTargetOrScopeByMeta = element.metadata && (element.metadata.isTarget || element.metadata.isScope);
      
      if (isPPINOTAny || isTargetOrScopeById || isTargetOrScopeByMeta) {
        ppiChildren.push(element);
      }
    }
    
    return ppiChildren;
  }

  createRelationships(ppiChildren, ppiElements) {
    const relationships = [];
    
    for (const childEl of ppiChildren) {
      const boType = (childEl.businessObject && childEl.businessObject.$type) || '';
      const elType = childEl.type || '';
      let childType = boType || elType || 'unknown';
      
      if (childType.includes('Target') || (childEl.id && childEl.id.includes('Target'))) {
        childType = 'PPINOT:Target';
      } else if (childType.includes('Scope') || (childEl.id && childEl.id.includes('Scope'))) {
        childType = 'PPINOT:Scope';
      }
      
      // Determinar padre
      const parentInfo = this.findParentForElement(childEl, ppiElements);
      
      if (parentInfo.parentId) {
        relationships.push({
          childId: childEl.id,
          parentId: parentInfo.parentId,
          childName: childEl.businessObject ? childEl.businessObject.name : '',
          parentName: parentInfo.parentName,
          childType: childType,
          parentType: parentInfo.parentType || 'PPINOT:Ppi',
          childBusinessObjectType: boType,
          parentBusinessObjectType: '',
          timestamp: Date.now()
        });
      }
    }
    
    return relationships;
  }

  findParentForElement(childEl, ppiElements) {
    let parentId = null;
    let parentType = null;
    let parentName = '';
    
    // 1. Usar businessObject.$parent si existe
    if (childEl.businessObject && childEl.businessObject.$parent && childEl.businessObject.$parent.id) {
      parentId = childEl.businessObject.$parent.id;
      parentType = childEl.businessObject.$parent.$type || (childEl.parent && childEl.parent.type) || null;
      parentName = childEl.businessObject.$parent.name || '';
    }
    // 2. Usar shape.parent si existe
    else if (childEl.parent && childEl.parent.id) {
      parentId = childEl.parent.id;
      parentType = childEl.parent.type;
      parentName = childEl.parent.businessObject ? childEl.parent.businessObject.name : '';
    }
    // 3. Fallback: buscar el PPI más cercano
    else if (ppiElements.length > 0) {
      const closestPPI = this.findClosestPPI(childEl, ppiElements);
      if (closestPPI) {
        parentId = closestPPI.id;
        parentType = closestPPI.type;
        parentName = closestPPI.businessObject ? closestPPI.businessObject.name : '';
      }
    }
    
    return { parentId, parentType, parentName };
  }

  findClosestPPI(childEl, ppiElements) {
    const childBounds = childEl.bounds || { x: childEl.x || 0, y: childEl.y || 0 };
    const childCenter = { 
      x: childBounds.x + (childBounds.width || 0) / 2, 
      y: childBounds.y + (childBounds.height || 0) / 2 
    };
    
    let closestPPI = null;
    let minDistance = Infinity;
    
    for (const ppi of ppiElements) {
      const ppiBounds = ppi.bounds || { x: ppi.x || 0, y: ppi.y || 0 };
      const ppiCenter = { 
        x: ppiBounds.x + (ppiBounds.width || 0) / 2, 
        y: ppiBounds.y + (ppiBounds.height || 0) / 2 
      };
      
      const distance = Math.sqrt(
        Math.pow(childCenter.x - ppiCenter.x, 2) + 
        Math.pow(childCenter.y - ppiCenter.y, 2)
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        closestPPI = ppi;
      }
    }
    
    // Solo devolver si está dentro de un rango razonable (400px)
    return minDistance <= 400 ? closestPPI : null;
  }

  // ==================== CARGA DE ELEMENTOS ====================

  loadPPINOTElements() {
    const startTime = performance.now();
    
    try {
      // ELIMINADO: No leer de localStorage - usar solo autosave
      // const savedElements = localStorage.getItem('ppinotElements');
      
      // Método deshabilitado - usar solo autosave
      console.log('ℹ️ loadPPINOTElements deshabilitado - usar solo autosave');
      return false;
      
    } catch (error) {
      console.error('Error cargando elementos PPINOT:', error);
      return false;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 50) {
        console.warn(`⚠️ loadPPINOTElements took ${duration.toFixed(2)}ms`);
      }
    }
  }

  // ==================== RESTAURACIÓN DE RELACIONES ====================

  restoreParentChildRelationship(childId, parentId, childData = null) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return false;
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      const childElement = elementRegistry.get(childId);
      const parentElement = elementRegistry.get(parentId);
      
      if (!childElement || !parentElement) {
        console.warn(`⚠️ Elementos no encontrados para relación: ${childId} → ${parentId}`);
        return false;
      }
      
      // Verificar si ya están correctamente relacionados
      if (childElement.parent && childElement.parent.id === parentId) {
        return true;
      }
      
      try {
        // Usar modeling.moveElements para establecer la relación
        modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
        console.log(`✅ Relación restaurada: ${childId} → ${parentId}`);
        return true;
        
      } catch (error) {
        console.warn(`⚠️ Error restaurando relación ${childId} → ${parentId}:`, error.message);
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error en restoreParentChildRelationship:', error);
      return false;
    }
  }

  // ==================== DETECCIÓN Y CLASIFICACIÓN ====================

  detectMeasureType(elementId, elementType) {
    return PPIUtils.detectMeasureType(elementId, elementType);
  }

  extractChildElementInfo(childElementId) {
    const info = {
      target: '',
      scope: '',
      measureType: 'time',
      measureDefinition: ''
    };
    
    try {
      const modeler = this.getBpmnModeler();
      if (modeler) {
        const elementRegistry = modeler.get('elementRegistry');
        const element = elementRegistry.get(childElementId);
        
        if (element && element.businessObject) {
          const name = element.businessObject.name || '';
          const type = element.businessObject.$type || '';
          
          if (childElementId.toLowerCase().includes('target') || type.toLowerCase().includes('target')) {
            info.target = name;
          }
          
          if (childElementId.toLowerCase().includes('scope') || type.toLowerCase().includes('scope')) {
            info.scope = name;
          }
          
          if (childElementId.toLowerCase().includes('measure') || childElementId.toLowerCase().includes('medida') || type.toLowerCase().includes('measure')) {
            info.measureDefinition = name;
            info.measureType = this.detectMeasureType(childElementId, type);
          }
          
          if (childElementId.toLowerCase().includes('condition') || type.toLowerCase().includes('condition')) {
            info.measureDefinition = `Condición: ${name}`;
            info.measureType = 'state';
          }
          
          if (childElementId.toLowerCase().includes('data') || type.toLowerCase().includes('data')) {
            info.measureDefinition = `Datos: ${name}`;
            info.measureType = 'data';
          }
        }
      }
    } catch (error) {
      console.warn('Error extrayendo información del elemento hijo:', error);
    }
    
    return info;
  }

  // ==================== CONFIGURACIÓN Y UTILIDADES ====================

  enableAutoSave() {
    this.autoSaveEnabled = true;
  }

  disableAutoSave() {
    this.autoSaveEnabled = false;
  }

  isAutoSaveEnabled() {
    return this.autoSaveEnabled;
  }

  debouncedSavePPINOTElements() {
    const now = Date.now();
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    if (now - this.lastSaveTime < this.minSaveInterval) {
      this.autoSaveTimeout = setTimeout(() => {
        this.savePPINOTElements();
      }, this.autoSaveDelay);
    } else {
      this.savePPINOTElements();
    }
  }

  forceSavePPINOTElements() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.savePPINOTElements();
  }

  getBpmnModeler() {
    return PPIUtils.getBpmnModeler();
  }

  cleanupOldData() {
    // Limpiar datos obsoletos de localStorage
    const keysToRemove = [
      'ppinotPendingRestore',
      'ppinotProcessedElements', 
      'ppinotTempData'
    ];
    
    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        console.debug(`No se pudo eliminar clave ${key}:`, error);
      }
    });
  }
}
