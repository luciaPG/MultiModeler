import inherits from 'inherits';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import BpmnUpdater from 'bpmn-js/lib/features/modeling/BpmnUpdater';

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
}

inherits(PPINOTBpmnUpdater, BpmnUpdater);

PPINOTBpmnUpdater.$inject = [ 'eventBus', 'bpmnFactory', 'connectionDocking', 'translate' ];

// Helper function to identify PPINOT elements
function isPPINOT(element) {
  return element && element.$type && /^PPINOT:/.test(element.$type);
} 