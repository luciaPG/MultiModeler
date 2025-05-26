import inherits from 'inherits';
import { is } from './utils/CompatibilityUtil';
import BpmnUpdater from 'bpmn-js/lib/features/modeling/BpmnUpdater';
import { getDi } from './utils/CompatibilityUtil';

/**
 * A handler responsible for updating the BPMN elements and
 * handling special cases for PPINOT elements.
 */
export default function PPINOTBpmnUpdater(eventBus, bpmnFactory, connectionDocking, translate) {
  BpmnUpdater.call(this, eventBus, bpmnFactory, connectionDocking, translate);

  // Override the updateSemanticParent method
  this.updateSemanticParent = function(businessObject, newParent, visualParent) {
    // Special handling for PPINOT elements
    if (isPPINOT(businessObject)) {
      if (businessObject.$parent === newParent) {
        return;
      }

      // Handle special case for Participant
      if (is(newParent, 'bpmn:Participant') && newParent.processRef) {
        newParent = newParent.processRef;
      }

      // Remove from old parent
      if (businessObject.$parent && businessObject.$parent.children) {
        var oldChildren = businessObject.$parent.children;
        var idx = oldChildren.indexOf(businessObject);
        
        if (idx !== -1) {
          oldChildren.splice(idx, 1);
        }
        
        businessObject.$parent = null;
      }

      // Add to new parent
      if (newParent) {
        // Ensure children array exists
        if (!newParent.children) {
          newParent.children = [];
        }
        
        newParent.children.push(businessObject);
        businessObject.$parent = newParent;
      }
      
      return;
    }
    
    // Call the original method for non-PPINOT elements
    BpmnUpdater.prototype.updateSemanticParent.call(this, businessObject, newParent, visualParent);
  };
  
  // Override the _getLabel method to handle cases when DI is undefined for PPINOT elements
  this._getLabel = function(di) {
    // Check if DI is undefined or null
    if (!di) {
      // Create a new label for PPINOT elements
      return this._bpmnFactory.createDiLabel();
    }
    
    // For existing DI elements, use the original logic
    if (!di.label) {
      di.label = this._bpmnFactory.createDiLabel();
    }
    
    return di.label;
  };
  
  // Override the updateBounds method to handle PPINOT elements
  this.updateBounds = function(shape) {
    var businessObject = shape.businessObject;
    
    // Special handling for PPINOT elements
    if (isPPINOT(businessObject)) {
      // For PPINOT elements, we need to check if they have a DI
      // but we can't directly access it from businessObject
      if (!shape.di) {
        // If there's no DI, we can't update bounds
        return;
      }
    }
    
    // Call original implementation for standard elements and PPINOT elements with DI
    BpmnUpdater.prototype.updateBounds.call(this, shape);
  };
}

inherits(PPINOTBpmnUpdater, BpmnUpdater);

PPINOTBpmnUpdater.$inject = [ 'eventBus', 'bpmnFactory', 'connectionDocking', 'translate' ];

// Helper function to identify PPINOT elements
function isPPINOT(element) {
  return element && element.$type && /^PPINOT:/.test(element.$type);
}