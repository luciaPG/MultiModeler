/**
 * Canvas Relationship Manager
 * 
 * Gestiona las relaciones padre-hijo entre elementos del canvas (PPIs, scope, target, medidas, etc.)
 * de forma simplificada y consistente.
 */

import { getServiceRegistry } from './ServiceRegistry.js';

class CanvasRelationshipManager {
  constructor() {
    this.relationships = new Map(); // Map<childId, parentId>
    this.childrenByParent = new Map(); // Map<parentId, Set<childId>>
    this.elementMetadata = new Map(); // Map<elementId, metadata>
  }

  /**
   * Detecta automáticamente las relaciones padre-hijo desde el canvas actual
   */
  detectRelationshipsFromCanvas() {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return;

      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();

      // Limpiar relaciones existentes
      this.clearAllRelationships();

      // Encontrar todos los PPIs
      const ppiElements = allElements.filter(el => 
        this.isPPIElement(el)
      );

      // Encontrar todos los elementos scope/target/measure/condition
      const childElements = allElements.filter(el => 
        this.isScopeOrTargetElement(el)
      );

      // PASO 1: Detectar relaciones directas PPI -> hijos
      childElements.forEach(childEl => {
        const parentPPI = this.findClosestPPIParent(childEl, ppiElements);
        if (parentPPI) {
          this.addRelationship(childEl.id, parentPPI.id, {
            childType: this.getElementType(childEl),
            parentType: 'PPI',
            childName: this.getElementName(childEl),
            parentName: this.getElementName(parentPPI),
            position: this.getElementPosition(childEl),
            autoDetected: true,
            timestamp: Date.now()
          });
        }
      });

      // PASO 2: Detectar relaciones anidadas (ej: Scope -> Measure)
      this.detectNestedRelationships(allElements);

      console.log(`🔗 Detectadas ${this.relationships.size} relaciones padre-hijo automáticamente`);
      return this.relationships.size;

    } catch (error) {
      console.error('❌ Error detectando relaciones:', error);
      return 0;
    }
  }

  /**
   * Detecta relaciones anidadas como Scope -> Measure, Target -> Condition, etc.
   */
  detectNestedRelationships(allElements) {
    // Obtener todos los scope y target que ya tienen un padre PPI
    const scopeElements = allElements.filter(el => 
      (el.type === 'PPINOT:Scope' || 
       (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')) &&
      this.relationships.has(el.id) // Solo scopes que ya tienen padre PPI
    );

    const targetElements = allElements.filter(el => 
      (el.type === 'PPINOT:Target' || 
       (el.businessObject && el.businessObject.$type === 'PPINOT:Target')) &&
      this.relationships.has(el.id) // Solo targets que ya tienen padre PPI
    );

    // Buscar medidas y condiciones que puedan ser hijas de scope/target
    const measureElements = allElements.filter(el => 
      el.type === 'PPINOT:Measure' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Measure')
    );

    const conditionElements = allElements.filter(el => 
      el.type === 'PPINOT:Condition' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Condition')
    );

    // Detectar medidas hijas de scope
    measureElements.forEach(measure => {
      if (!this.relationships.has(measure.id)) { // Si la medida no tiene padre aún
        const closestScope = this.findClosestParent(measure, scopeElements, 200); // Radio más pequeño para anidadas
        if (closestScope) {
          this.addRelationship(measure.id, closestScope.id, {
            childType: this.getElementType(measure),
            parentType: this.getElementType(closestScope),
            childName: this.getElementName(measure),
            parentName: this.getElementName(closestScope),
            position: this.getElementPosition(measure),
            autoDetected: true,
            nested: true, // Marcar como relación anidada
            timestamp: Date.now()
          });
          console.log(`🔗 Relación anidada detectada: ${measure.id} -> ${closestScope.id} (Measure -> Scope)`);
        }
      }
    });

    // Detectar condiciones hijas de target
    conditionElements.forEach(condition => {
      if (!this.relationships.has(condition.id)) { // Si la condición no tiene padre aún
        const closestTarget = this.findClosestParent(condition, targetElements, 200); // Radio más pequeño para anidadas
        if (closestTarget) {
          this.addRelationship(condition.id, closestTarget.id, {
            childType: this.getElementType(condition),
            parentType: this.getElementType(closestTarget),
            childName: this.getElementName(condition),
            parentName: this.getElementName(closestTarget),
            position: this.getElementPosition(condition),
            autoDetected: true,
            nested: true, // Marcar como relación anidada
            timestamp: Date.now()
          });
          console.log(`🔗 Relación anidada detectada: ${condition.id} -> ${closestTarget.id} (Condition -> Target)`);
        }
      }
    });
  }

  /**
   * Añade una relación padre-hijo
   */
  addRelationship(childId, parentId, metadata = {}) {
    // Añadir relación
    this.relationships.set(childId, parentId);
    
    // Añadir a la lista de hijos del padre
    if (!this.childrenByParent.has(parentId)) {
      this.childrenByParent.set(parentId, new Set());
    }
    this.childrenByParent.get(parentId).add(childId);

    // Guardar metadata
    this.elementMetadata.set(childId, {
      ...metadata,
      parentId,
      childId
    });
  }

  /**
   * Obtiene el padre de un elemento
   */
  getParent(childId) {
    return this.relationships.get(childId);
  }

  /**
   * Obtiene todos los hijos de un elemento
   */
  getChildren(parentId) {
    const children = this.childrenByParent.get(parentId);
    return children ? Array.from(children) : [];
  }

  /**
   * Obtiene los metadatos de un elemento
   */
  getElementMetadata(elementId) {
    return this.elementMetadata.get(elementId) || {};
  }

  /**
   * Elimina todas las relaciones
   */
  clearAllRelationships() {
    this.relationships.clear();
    this.childrenByParent.clear();
    this.elementMetadata.clear();
  }

  /**
   * Serializa las relaciones para guardar en archivo
   */
  serializeRelationships() {
    const serialized = {
      version: '1.0.0',
      timestamp: Date.now(),
      relationships: [],
      metadata: {}
    };

    // Convertir relaciones a array
    this.relationships.forEach((parentId, childId) => {
      const metadata = this.elementMetadata.get(childId) || {};
      serialized.relationships.push({
        childId,
        parentId,
        ...metadata
      });
    });

    // Incluir metadatos adicionales
    this.elementMetadata.forEach((metadata, elementId) => {
      serialized.metadata[elementId] = metadata;
    });

    return serialized;
  }

  /**
   * Deserializa las relaciones desde un archivo
   */
  deserializeRelationships(data) {
    try {
      if (!data || !data.relationships) {
        console.log('ℹ️ No hay relaciones que deserializar');
        return false;
      }

      this.clearAllRelationships();

      // Restaurar relaciones
      data.relationships.forEach(rel => {
        if (rel.childId && rel.parentId) {
          this.addRelationship(rel.childId, rel.parentId, {
            childType: rel.childType,
            parentType: rel.parentType,
            childName: rel.childName,
            parentName: rel.parentName,
            position: rel.position,
            autoDetected: false,
            timestamp: rel.timestamp || Date.now()
          });
        }
      });

      // Restaurar metadatos adicionales
      if (data.metadata) {
        Object.entries(data.metadata).forEach(([elementId, metadata]) => {
          if (!this.elementMetadata.has(elementId)) {
            this.elementMetadata.set(elementId, metadata);
          }
        });
      }

      console.log(`✅ Deserializadas ${this.relationships.size} relaciones desde archivo`);
      return true;

    } catch (error) {
      console.error('❌ Error deserializando relaciones:', error);
      return false;
    }
  }

  /**
   * Aplica las relaciones deserializadas al canvas
   */
  async applyRelationshipsToCanvas() {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return false;

      const elementRegistry = modeler.get('elementRegistry');
      let appliedCount = 0;

      // Aplicar relaciones parent-child en el canvas
      this.relationships.forEach((parentId, childId) => {
        const childElement = elementRegistry.get(childId);
        const parentElement = elementRegistry.get(parentId);

        if (childElement && parentElement) {
          // Establecer la relación en el elemento
          childElement.parent = parentElement;
          
          // También en el businessObject si existe
          if (childElement.businessObject && parentElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
          }

          // Para relaciones anidadas, también actualizar la información en los PPIs
          const metadata = this.elementMetadata.get(childId);
          if (metadata && metadata.nested) {
            this.updateNestedRelationshipInPPI(childId, parentId, metadata);
          }

          appliedCount++;
        }
      });

      console.log(`✅ Aplicadas ${appliedCount} relaciones al canvas`);
      return appliedCount > 0;

    } catch (error) {
      console.error('❌ Error aplicando relaciones al canvas:', error);
      return false;
    }
  }

  /**
   * Carga elementos desde localStorage y los restaura en el canvas de forma directa
   * SIN depender de eventos que pueden causar conflictos
   */
  async loadAndRestoreFromStorage() {
    try {
      console.log('🔄 Cargando elementos desde localStorage de forma directa...');
      
      const registry = getServiceRegistry();
      const storageManager = registry ? registry.get('PPINOTStorageManager') : null;
      
      if (!storageManager) {
        console.warn('⚠️ PPINOTStorageManager no disponible');
        return false;
      }

      // Cargar datos desde storage
      const data = storageManager.loadPPINOTElements();
      if (!data || !data.elements || data.elements.length === 0) {
        console.log('ℹ️ No hay elementos para restaurar desde storage');
        return false;
      }

      console.log(`📂 Cargados ${data.elements.length} elementos y ${data.relationships.length} relaciones`);

      // Deserializar relaciones
      if (data.relationships.length > 0) {
        this.deserializeRelationships({
          relationships: data.relationships,
          version: '1.0.0',
          timestamp: Date.now()
        });
      }

      // Aplicar relaciones al canvas
      const applied = await this.applyRelationshipsToCanvas();
      
      console.log(`✅ Restauración directa completada: ${applied ? 'ÉXITO' : 'FALLO'}`);
      return applied;

    } catch (error) {
      console.error('❌ Error en carga directa desde storage:', error);
      return false;
    }
  }

  /**
   * Actualiza la información de relaciones anidadas en el PPI correspondiente
   */
  updateNestedRelationshipInPPI(childId, parentId, metadata) {
    try {
      // Si es una medida hija de scope, encontrar el PPI padre del scope
      if (metadata.childType === 'PPINOT:Measure' && metadata.parentType === 'PPINOT:Scope') {
        const scopePPIParent = this.getParent(parentId); // El PPI padre del scope
        if (scopePPIParent) {
          // Actualizar el PPI con la información de la medida
          const registry = getServiceRegistry();
          const ppiManager = registry ? registry.get('PPIManager') : null;
          if (ppiManager && typeof ppiManager.updatePPIWithChildInfo === 'function') {
            ppiManager.updatePPIWithChildInfo(scopePPIParent, childId);
            console.log(`🔗 Información de medida ${childId} actualizada en PPI ${scopePPIParent} vía scope ${parentId}`);
          }
        }
      }
      
      // Similar para condiciones hijas de target
      if (metadata.childType === 'PPINOT:Condition' && metadata.parentType === 'PPINOT:Target') {
        const targetPPIParent = this.getParent(parentId); // El PPI padre del target
        if (targetPPIParent) {
          const registry = getServiceRegistry();
          const ppiManager = registry ? registry.get('PPIManager') : null;
          if (ppiManager && typeof ppiManager.updatePPIWithChildInfo === 'function') {
            ppiManager.updatePPIWithChildInfo(targetPPIParent, childId);
            console.log(`🔗 Información de condición ${childId} actualizada en PPI ${targetPPIParent} vía target ${parentId}`);
          }
        }
      }
    } catch (error) {
      console.warn('⚠️ Error actualizando relación anidada en PPI:', error);
    }
  }

  // === MÉTODOS DE UTILIDAD ===

  isPPIElement(element) {
    return element && (
      element.type === 'PPINOT:Ppi' ||
      (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi') ||
      element.id?.includes('Ppi')
    );
  }

  isScopeOrTargetElement(element) {
    if (!element) return false;
    
    const isScope = element.type === 'PPINOT:Scope' ||
                   (element.businessObject && element.businessObject.$type === 'PPINOT:Scope') ||
                   element.id?.includes('Scope');
                   
    const isTarget = element.type === 'PPINOT:Target' ||
                    (element.businessObject && element.businessObject.$type === 'PPINOT:Target') ||
                    element.id?.includes('Target');
                    
    const isMeasure = element.type === 'PPINOT:Measure' ||
                     (element.businessObject && element.businessObject.$type === 'PPINOT:Measure') ||
                     element.id?.includes('Measure');
                     
    const isCondition = element.type === 'PPINOT:Condition' ||
                       (element.businessObject && element.businessObject.$type === 'PPINOT:Condition') ||
                       element.id?.includes('Condition');
                    
    return isScope || isTarget || isMeasure || isCondition;
  }

  getElementType(element) {
    if (!element) return 'unknown';
    
    if (element.type) return element.type;
    if (element.businessObject && element.businessObject.$type) return element.businessObject.$type;
    
    // Detectar por ID como fallback
    if (element.id?.includes('Scope')) return 'PPINOT:Scope';
    if (element.id?.includes('Target')) return 'PPINOT:Target';
    if (element.id?.includes('Measure')) return 'PPINOT:Measure';
    if (element.id?.includes('Condition')) return 'PPINOT:Condition';
    if (element.id?.includes('Ppi')) return 'PPINOT:Ppi';
    
    return 'unknown';
  }

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
      x: element.x || element.bounds?.x || 0,
      y: element.y || element.bounds?.y || 0,
      width: element.width || element.bounds?.width || 0,
      height: element.height || element.bounds?.height || 0
    };
  }

  /**
   * Encuentra el PPI padre más cercano a un elemento hijo
   */
  findClosestPPIParent(childElement, ppiElements) {
    return this.findClosestParent(childElement, ppiElements, 400);
  }

  /**
   * Encuentra el elemento padre más cercano de una lista de candidatos
   */
  findClosestParent(childElement, parentCandidates, maxDistance = 400) {
    if (!childElement || !parentCandidates || parentCandidates.length === 0) return null;

    const childPos = this.getElementPosition(childElement);
    let closestParent = null;
    let minDistance = Infinity;

    parentCandidates.forEach(parent => {
      const parentPos = this.getElementPosition(parent);
      
      // Calcular distancia euclidiana
      const dx = childPos.x - parentPos.x;
      const dy = childPos.y - parentPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);

      if (distance < minDistance) {
        minDistance = distance;
        closestParent = parent;
      }
    });

    // Solo considerar como padre si está dentro del rango especificado
    if (minDistance <= maxDistance) {
      return closestParent;
    }

    return null;
  }

  getBpmnModeler() {
    try {
      const registry = getServiceRegistry();
      return registry ? registry.get('BpmnModeler') : null;
    } catch (error) {
      console.warn('⚠️ No se pudo obtener BpmnModeler:', error);
      return null;
    }
  }
}

// Crear instancia singleton
const canvasRelationshipManager = new CanvasRelationshipManager();

// Registrar en el service registry
const registry = getServiceRegistry();
if (registry) {
  registry.register('CanvasRelationshipManager', canvasRelationshipManager, {
    description: 'Gestiona relaciones padre-hijo entre elementos del canvas'
  });
  
  // Mantener compatibilidad con el nombre anterior
  registry.register('PPIRelationshipManager', canvasRelationshipManager, {
    description: 'Alias para CanvasRelationshipManager (compatibilidad)'
  });
}

export default canvasRelationshipManager;
