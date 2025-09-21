/**
 * Relationship Manager Module
 * 
 * Handles parent-child and visual relationships between elements
 */

export class RelationshipManager {

  /**
   * Capture parent-child relationships from modeler
   * @param {Object} modeler - BPMN modeler instance
   * @returns {Array} Array of relationships
   */
  captureParentChildRelationships(modeler) {
    if (!modeler) return [];

    try {
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      const relationships = [];

      // Capture visual relationships
      this._captureVisualRelationships(allElements, relationships);
      
      // Capture proximity relationships
      this._captureProximityRelationships(allElements, relationships);
      
      // Capture business object relationships
      this._captureBusinessObjectRelationships(allElements, relationships);

      console.log(`✅ ${relationships.length} relationships captured`);
      return relationships;

    } catch (error) {
      console.error('Error capturing relationships:', error);
      return [];
    }
  }

  /**
   * Restore relationships in modeler
   * @param {Object} modeler - BPMN modeler instance
   * @param {Array} relationships - Relationships to restore
   */
  async restoreRelationships(modeler, relationships) {
    if (!modeler || !relationships?.length) return;

    try {
      const modeling = modeler.get('modeling');
      const elementRegistry = modeler.get('elementRegistry');
      
      // Group relationships by type for better processing
      const groupedRelationships = this._groupRelationshipsByType(relationships);
      
      // Restore parent-child relationships first
      await this._restoreParentChildRelationships(modeling, elementRegistry, groupedRelationships.parentChild || []);
      
      // Then restore visual relationships
      await this._restoreVisualRelationships(modeling, elementRegistry, groupedRelationships.visual || []);
      
      console.log(`✅ ${relationships.length} relationships restored`);

    } catch (error) {
      console.error('Error restoring relationships:', error);
    }
  }

  // Private methods for capturing relationships
  _captureVisualRelationships(allElements, relationships) {
    allElements.forEach(element => {
      if (element.parent && element.parent.id !== '__implicitroot') {
        relationships.push({
          type: 'parentChild',
          childId: element.id,
          parentId: element.parent.id,
          childType: element.type,
          parentType: element.parent.type,
          significant: this._isSignificantParentChildRelationship(element, element.parent)
        });
      }
    });
  }

  _captureProximityRelationships(allElements, relationships) {
    const ppiElements = allElements.filter(el => 
      el.type && el.type.includes('PPINOT')
    );

    ppiElements.forEach(ppiElement => {
      const closestElement = this._findClosestElement(ppiElement, allElements);
      if (closestElement && this._calculateDistance(ppiElement, closestElement) < 100) {
        relationships.push({
          type: 'proximity',
          sourceId: ppiElement.id,
          targetId: closestElement.id,
          distance: this._calculateDistance(ppiElement, closestElement),
          sourceType: ppiElement.type,
          targetType: closestElement.type
        });
      }
    });
  }

  _captureBusinessObjectRelationships(allElements, relationships) {
    allElements.forEach(element => {
      const bo = element.businessObject;
      if (bo && bo.targetRef) {
        relationships.push({
          type: 'businessObject',
          sourceId: element.id,
          targetRef: bo.targetRef,
          sourceType: element.type,
          property: 'targetRef'
        });
      }

      if (bo && bo.scope) {
        relationships.push({
          type: 'businessObject',
          sourceId: element.id,
          scope: bo.scope,
          sourceType: element.type,
          property: 'scope'
        });
      }
    });
  }

  // Private methods for restoring relationships
  async _restoreParentChildRelationships(modeling, elementRegistry, relationships) {
    for (const rel of relationships) {
      try {
        const child = elementRegistry.get(rel.childId);
        const parent = elementRegistry.get(rel.parentId);
        
        if (child && parent && rel.significant) {
          modeling.moveElements([child], { x: 0, y: 0 }, parent);
        }
      } catch (error) {
        console.debug(`Could not restore parent-child relationship: ${rel.childId} -> ${rel.parentId}`);
      }
    }
  }

  async _restoreVisualRelationships(modeling, elementRegistry, relationships) {
    for (const rel of relationships) {
      try {
        const source = elementRegistry.get(rel.sourceId);
        const target = elementRegistry.get(rel.targetId || rel.targetRef);
        
        if (source && target) {
          // Restore visual proximity by adjusting positions if needed
          const currentDistance = this._calculateDistance(source, target);
          if (currentDistance > rel.distance * 1.5) {
            // Move source closer to target
            const deltaX = (target.x - source.x) * 0.3;
            const deltaY = (target.y - source.y) * 0.3;
            modeling.moveElements([source], { x: deltaX, y: deltaY });
          }
        }
      } catch (error) {
        console.debug(`Could not restore visual relationship: ${rel.sourceId} -> ${rel.targetId}`);
      }
    }
  }

  // Helper methods
  _groupRelationshipsByType(relationships) {
    return relationships.reduce((groups, rel) => {
      const type = rel.type;
      if (!groups[type]) groups[type] = [];
      groups[type].push(rel);
      return groups;
    }, {});
  }

  _isSignificantParentChildRelationship(child, parent) {
    // Define what makes a relationship significant
    const significantParentTypes = [
      'bpmn:SubProcess', 'bpmn:Process', 'bpmn:Participant',
      'bpmn:Lane', 'bpmn:LaneSet'
    ];
    
    const significantChildTypes = [
      'bpmn:Task', 'bpmn:UserTask', 'bpmn:ServiceTask',
      'bpmn:StartEvent', 'bpmn:EndEvent', 'bpmn:IntermediateEvent'
    ];

    return significantParentTypes.includes(parent.type) && 
           significantChildTypes.includes(child.type);
  }

  _findClosestElement(element, allElements) {
    let closest = null;
    let minDistance = Infinity;

    allElements.forEach(other => {
      if (other.id !== element.id && other.type !== element.type) {
        const distance = this._calculateDistance(element, other);
        if (distance < minDistance) {
          minDistance = distance;
          closest = other;
        }
      }
    });

    return closest;
  }

  _calculateDistance(element1, element2) {
    const dx = (element1.x || 0) - (element2.x || 0);
    const dy = (element1.y || 0) - (element2.y || 0);
    return Math.sqrt(dx * dx + dy * dy);
  }
}

export const relationshipManager = new RelationshipManager();
