/**
 * PPICanvasManager
 * 
 * Responsabilidades:
 * - Interacciones con el canvas BPMN
 * - Eliminación de elementos del canvas
 * - Actualización de PPIs con información de elementos hijos
 * - Detección y limpieza de PPIs huérfanos
 */

import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';
import { PPIUtils } from '../utils/PPIUtils.js';

export class PPICanvasManager {
  constructor() {
    // No necesita estado interno específico
  }

  // ==================== OPERACIONES EN CANVAS ====================

  deletePPIFromCanvas(ppiId, ppiData = null) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) {
        console.warn('⚠️ Modeler no disponible para eliminación del canvas');
        return false;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        console.warn('⚠️ Servicios del modeler no disponibles');
        return false;
      }

      // Buscar elemento PPI en el canvas
      const elementId = ppiData?.elementId || ppiId;
      const ppiElement = elementRegistry.get(elementId);
      
      if (!ppiElement) {
        console.warn(`⚠️ Elemento PPI no encontrado en canvas: ${elementId}`);
        return false;
      }

      console.log(`🗑️ Eliminando PPI del canvas: ${ppiElement.id}`);

      // Encontrar y eliminar elementos hijos primero
      const childElements = this.getChildElements(ppiElement.id, elementRegistry.getAll());
      
      if (childElements.length > 0) {
        try {
          childElements.forEach(childElement => {
            try {
              modeling.removeElements([childElement]);
              console.log(`🗑️ Elemento hijo eliminado: ${childElement.id}`);
            } catch (childError) {
              console.warn(`⚠️ Error eliminando elemento hijo ${childElement.id}:`, childError);
            }
          });
        } catch (error) {
          console.warn('⚠️ Error eliminando elementos hijos:', error);
        }
      }
      
      // Eliminar el elemento PPI principal
      try {
        modeling.removeElements([ppiElement]);
        console.log(`✅ PPI eliminado del canvas: ${ppiElement.id}`);
        
        // Refrescar canvas si es posible
        try {
          const canvas = modeler.get('canvas');
          if (canvas && typeof canvas.resized === 'function') {
            canvas.resized();
          }
        } catch (canvasError) {
          console.debug('Canvas refresh no disponible:', canvasError.message);
        }
        
        return true;
        
      } catch (error) {
        console.error('❌ Error eliminando elemento PPI:', error);
        
        // Intentar método alternativo
        try {
          const commandStack = modeler.get('commandStack');
          if (commandStack) {
            commandStack.execute('element.delete', { elements: [ppiElement] });
            return true;
          }
        } catch (fallbackError) {
          console.error('❌ Error en método alternativo de eliminación:', fallbackError);
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error general en deletePPIFromCanvas:', error);
      return false;
    }
  }

  getChildElements(parentId, allElements) {
    return allElements.filter(el => 
      el.parent && el.parent.id === parentId
    );
  }

  purgeOrphanedPPIs(ppiDataManager) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return;

      const elementRegistry = modeler.get('elementRegistry');
      if (!elementRegistry) return;

      const before = ppiDataManager.getAllPPIs().length;
      const validPPIs = ppiDataManager.getAllPPIs().filter(ppi => {
        if (!ppi.elementId) return true; // Mantener PPIs sin elementId
        
        const element = elementRegistry.get(ppi.elementId);
        return !!element; // Solo mantener PPIs cuyos elementos existen en el canvas
      });

      if (validPPIs.length !== before) {
        console.log(`🧹 Limpieza de PPIs huérfanos: ${before - validPPIs.length} eliminados`);
        // Actualizar la lista en el data manager
        ppiDataManager.ppis = validPPIs;
        ppiDataManager.savePPIs();
      }
      
    } catch (error) {
      console.error('❌ Error en purgeOrphanedPPIs:', error);
    }
  }

  // ==================== ACTUALIZACIÓN DE PPIS ====================

  updatePPIsWithRestoredChildren(restoredChildren, ppiDataManager) {
    restoredChildren.forEach(childElement => {
      try {
        if (childElement.parent && childElement.parent.type === 'PPINOT:Ppi') {
          const parentPPIId = childElement.parent.id;
          this.updatePPIWithChildInfo(parentPPIId, childElement.id, ppiDataManager);
        }
      } catch (error) {
        console.warn(`⚠️ Error actualizando PPI con elemento hijo ${childElement.id}:`, error);
      }
    });
  }

  updatePPIWithChildInfo(parentPPIId, childElementId, ppiDataManager) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return;

      const elementRegistry = modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        console.warn(`⚠️ Elemento hijo no encontrado: ${childElementId}`);
        return;
      }

      const existingPPI = ppiDataManager.getPPIsForElement(parentPPIId)[0];
      if (!existingPPI) {
        console.warn(`⚠️ PPI padre no encontrado: ${parentPPIId}`);
        return;
      }

      const updatedData = { ...existingPPI };

      // Actualizar información según el tipo de elemento hijo
      if (childElement.type === 'PPINOT:Target') {
        updatedData.target = childElement.businessObject ? 
          childElement.businessObject.name || '' : '';
      }

      if (childElement.type === 'PPINOT:Scope') {
        updatedData.scope = childElement.businessObject ? 
          childElement.businessObject.name || '' : '';
      }

      // Otros tipos de elementos (medidas, condiciones, etc.)
      if (childElement.type && childElement.type.includes('Measure')) {
        updatedData.measureDefinition = {
          ...updatedData.measureDefinition,
          definition: childElement.businessObject ? 
            childElement.businessObject.name || '' : ''
        };
      }

      // Actualizar el PPI
      if (ppiDataManager.updatePPI(existingPPI.id, updatedData)) {
        console.log(`✅ PPI actualizado con información del elemento hijo: ${parentPPIId}`);
      }
      
    } catch (error) {
      console.error('❌ Error en updatePPIWithChildInfo:', error);
    }
  }

  clearPPIChildInfo(elementType, parentPPIId = null, ppiDataManager) {
    try {
      const ppis = parentPPIId ? 
        [ppiDataManager.getPPI(parentPPIId)].filter(Boolean) : 
        ppiDataManager.getAllPPIs();

      ppis.forEach(ppi => {
        if (elementType === 'PPINOT:Target') {
          ppiDataManager.updatePPI(ppi.id, { target: '' });
        }
        
        if (elementType === 'PPINOT:Scope') {
          ppiDataManager.updatePPI(ppi.id, { scope: '' });
        }
        
        if (elementType && elementType.includes('Measure')) {
          ppiDataManager.updatePPI(ppi.id, { 
            measureDefinition: { 
              ...ppi.measureDefinition, 
              definition: '' 
            } 
          });
        }
      });
      
    } catch (error) {
      console.error('❌ Error en clearPPIChildInfo:', error);
    }
  }

  // ==================== DETECCIÓN DE ELEMENTOS ====================

  isPPIElement(element) {
    return PPIUtils.isPPIElement(element);
  }

  // ==================== UTILIDADES ====================

  getBpmnModeler() {
    return PPIUtils.getBpmnModeler();
  }

  calculateRelativePosition(childElement, parentElement) {
    return PPIUtils.calculateRelativePosition(childElement, parentElement);
  }
}
