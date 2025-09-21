/**
 * RelationshipCapture - Handles capturing relationships between elements
 * 
 * Responsible for:
 * - Visual relationships (parent-child)
 * - Proximity relationships (elements near each other)
 * - Business object relationships
 */

export class RelationshipCapture {
  constructor(config) {
    this.config = config;
  }

  /**
   * Captures parent-child relationships from canvas elements
   */
  captureParentChildRelationships(modeler) {
    const relationships = [];
    
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      this.captureVisualRelationships(allElements, relationships);
      this.captureProximityRelationships(allElements, relationships);
      this.captureBusinessObjectRelationships(allElements, relationships);

      console.log(`🔗 Captured ${relationships.length} significant relationships from canvas`);
      
    } catch (error) {
      console.error('❌ Error capturing relationships:', error);
    }
    
    return relationships;
  }

  /**
   * Captures relationships that are already established visually in the canvas
   */
  captureVisualRelationships(allElements, relationships) {
    allElements.forEach(element => {
      if (this.hasValidParent(element)) {
        const isSignificant = this.isSignificantParentChildRelationship(element, element.parent);
        
        if (isSignificant) {
          const relationship = this.createRelationship(
            element, element.parent, 'visual_canvas'
          );
          relationships.push(relationship);
          console.log(`🔗 Visual relationship: ${relationship.childName} → ${relationship.parentName}`);
        }
      }
    });
  }

  /**
   * Detects relationships by proximity (PPINOT elements near PPIs)
   */
  captureProximityRelationships(allElements, relationships) {
    const ppiElements = this.filterPPIElements(allElements);
    const childElements = this.filterPPINOTChildElements(allElements);

    childElements.forEach(child => {
      if (this.alreadyHasRelationship(child.id, relationships)) return;

      const closestPPI = this.findClosestPPI(child, ppiElements);
      
      if (closestPPI) {
        const relationship = this.createRelationship(
          child, closestPPI, 'proximity_detection'
        );
        relationships.push(relationship);
        console.log(`🔗 Proximity relationship: ${relationship.childName} → ${relationship.parentName}`);
      }
    });
  }

  /**
   * Captures relationships from businessObject.$parent
   */
  captureBusinessObjectRelationships(allElements, relationships) {
    allElements.forEach(element => {
      if (this.hasBusinessObjectParent(element)) {
        const parentId = element.businessObject.$parent.id;
        
        if (this.alreadyHasRelationship(element.id, relationships)) return;

        const parentElement = allElements.find(el => el.id === parentId);
        if (parentElement && this.isSignificantParentChildRelationship(element, parentElement)) {
          
          const relationship = this.createRelationship(
            element, parentElement, 'businessObject_parent'
          );
          relationship.businessObjectParent = parentId;

          relationships.push(relationship);
          console.log(`🔗 BusinessObject relationship: ${relationship.childName} → ${relationship.parentName}`);
        }
      }
    });
  }

  // Helper methods for validation
  hasValidParent(element) {
    return element.parent && 
           element.parent.id && 
           element.parent.id !== '__implicitroot';
  }

  hasBusinessObjectParent(element) {
    return element.businessObject && element.businessObject.$parent;
  }

  alreadyHasRelationship(elementId, relationships) {
    return relationships.some(rel => rel.childId === elementId);
  }

  // Helper methods for filtering elements
  filterPPIElements(allElements) {
    return allElements.filter(el => 
      el.type === 'PPINOT:Ppi' || 
      (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
    );
  }

  filterPPINOTChildElements(allElements) {
    return allElements.filter(el => 
      el.type && el.type.includes('PPINOT:') && 
      !el.type.includes('PPINOT:Ppi') &&
      el.type !== 'label'
    );
  }

  // Proximity detection
  /**
   * Finds the closest PPI element to a given child element
   */
  findClosestPPI(childElement, ppiElements) {
    if (!ppiElements || ppiElements.length === 0) return null;

    const childCenter = this.getElementCenter(childElement);
    let closestPPI = null;
    let minDistance = Infinity;

    ppiElements.forEach(ppi => {
      const ppiCenter = this.getElementCenter(ppi);
      const distance = this.calculateDistance(childCenter, ppiCenter);

      if (distance < minDistance && distance <= this.config.maxDistance) {
        minDistance = distance;
        closestPPI = ppi;
      }
    });

    return closestPPI;
  }

  getElementCenter(element) {
    const pos = this.getElementPosition(element);
    return {
      x: pos.x + pos.width / 2,
      y: pos.y + pos.height / 2
    };
  }

  calculateDistance(point1, point2) {
    return Math.sqrt(
      Math.pow(point1.x - point2.x, 2) + 
      Math.pow(point1.y - point2.y, 2)
    );
  }

  // Relationship creation and validation
  createRelationship(childElement, parentElement, source) {
    return {
      childId: childElement.id,
      parentId: parentElement.id,
      childName: this.getElementName(childElement),
      parentName: this.getElementName(parentElement),
      childType: this.getElementType(childElement),
      parentType: this.getElementType(parentElement),
      position: this.getElementPosition(childElement),
      timestamp: Date.now(),
      source
    };
  }

  /**
   * Determines if a parent-child relationship is significant for export
   */
  isSignificantParentChildRelationship(child, parent) {
    const relationshipRules = [
      this.isPPINOTToPPIRelationship,
      this.isTargetRelationship,
      this.isScopeRelationship,
      this.isBaseMeasureRelationship,
      this.isAggregatedMeasureRelationship,
      this.isDerivedMeasureRelationship,
      this.isRALPHRelationship,
      this.isLabelRelationship,
      this.isNestedPPINOTRelationship
    ];

    // Ignore Process parent relationships (automatic BPMN)
    if (parent.type && parent.type.includes('Process')) {
      return false;
    }

    return relationshipRules.some(rule => rule.call(this, child, parent));
  }

  // Relationship type checkers
  isPPINOTToPPIRelationship(child, parent) {
    return child.type && child.type.includes('PPINOT:') && parent.type && parent.type.includes('PPINOT:Ppi');
  }

  isTargetRelationship(child, parent) {
    return child.type && child.type.includes('Target') && parent.type && parent.type.includes('PPINOT:');
  }

  isScopeRelationship(child, parent) {
    return child.type && child.type.includes('Scope') && parent.type && parent.type.includes('PPINOT:');
  }

  isBaseMeasureRelationship(child, parent) {
    return child.type && child.type.includes('BaseMeasure') && parent.type && parent.type.includes('PPINOT:');
  }

  isAggregatedMeasureRelationship(child, parent) {
    return child.type && child.type.includes('AggregatedMeasure') && parent.type && parent.type.includes('PPINOT:');
  }

  isDerivedMeasureRelationship(child, parent) {
    return child.type && child.type.includes('DerivedMeasure') && parent.type && parent.type.includes('PPINOT:');
  }

  isRALPHRelationship(child, parent) {
    return child.type && child.type.includes('RALPH') && parent.type && !parent.type.includes('Process');
  }

  isLabelRelationship(child, parent) {
    return child.type === 'label' && parent.type && 
           (parent.type.includes('PPINOT') || parent.type.includes('RALPH'));
  }

  isNestedPPINOTRelationship(child, parent) {
    return child.type && child.type.includes('PPINOT:') && parent.type && parent.type.includes('PPINOT:') &&
           !parent.type.includes('Process') && !parent.type.includes('Ppi');
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
