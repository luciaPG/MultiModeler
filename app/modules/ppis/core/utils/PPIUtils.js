/**
 * PPIUtils
 * 
 * Utilidades compartidas para todos los managers de PPI
 * Evita duplicación de código y centraliza funciones comunes
 */

import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';

export class PPIUtils {
  
  static getBpmnModeler() {
    try {
      const registry = getServiceRegistry && getServiceRegistry();
      return registry ? registry.get('BpmnModeler') : null;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener BpmnModeler:', error);
      return null;
    }
  }

  static truncateText(text, maxLength) {
    if (!text) return '';
    if (typeof text !== 'string') text = String(text);
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 3) + '...';
  }

  static calculateRelativePosition(childElement, parentElement) {
    if (!childElement || !parentElement) return null;
    
    try {
      return {
        x: childElement.x - parentElement.x,
        y: childElement.y - parentElement.y
      };
    } catch (error) {
      console.warn('⚠️ Error calculando posición relativa:', error);
      return null;
    }
  }

  static getElementPosition(element) {
    if (!element) return { x: 0, y: 0, width: 0, height: 0 };
    
    return {
      x: element.x || element.bounds?.x || 0,
      y: element.y || element.bounds?.y || 0,
      width: element.width || element.bounds?.width || 0,
      height: element.height || element.bounds?.height || 0
    };
  }

  static getElementName(element) {
    if (!element) return '';
    if (element.businessObject && element.businessObject.name) {
      return element.businessObject.name;
    }
    if (element.name) return element.name;
    return element.id || '';
  }

  static getElementType(element) {
    if (!element) return 'unknown';
    if (element.type) return element.type;
    if (element.businessObject && element.businessObject.$type) return element.businessObject.$type;
    return 'unknown';
  }

  static isPPIElement(element) {
    if (!element) return false;
    
    // Verificar por businessObject.$type (case-insensitive)
    if (element.businessObject && element.businessObject.$type) {
      const type = String(element.businessObject.$type);
      const t = type.toLowerCase();
      if (t === 'ppinot:ppi') {
        return true;
      }
    }
    
    // Verificar por element.type (case-insensitive)
    if (element.type) {
      const t = String(element.type).toLowerCase();
      if (t === 'ppinot:ppi') return true;
    }
    
    return false;
  }

  static detectMeasureType(elementId, elementType) {
    const id = elementId.toLowerCase();
    const type = elementType.toLowerCase();
    
    if (id.includes('time') || type.includes('time')) return 'time';
    if (id.includes('count') || type.includes('count')) return 'count';
    if (id.includes('data') || type.includes('data')) return 'data';
    if (id.includes('state') || type.includes('state')) return 'state';
    if (id.includes('aggregated') || type.includes('aggregated')) return 'aggregated';
    if (id.includes('derived') || type.includes('derived')) return 'derived';
    
    return 'time'; // default
  }
}
