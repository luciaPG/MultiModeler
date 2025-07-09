import inherits from 'inherits';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import BpmnUpdater from 'bpmn-js/lib/features/modeling/BpmnUpdater';

/**
 * A handler responsible for updating the BPMN elements and
 * handling special cases for PPINOT elements.
 */
export default function PPINOTBpmnUpdater(eventBus, bpmnFactory, connectionDocking, translate) {
  BpmnUpdater.call(this, eventBus, bpmnFactory, connectionDocking, translate);

  // Store reference to original updateSemanticParent
  var originalUpdateSemanticParent = this.updateSemanticParent;

  // Override the updateSemanticParent method to handle PPINOT elements
  this.updateSemanticParent = function(businessObject, newParent, visualParent) {
    
    // Check if this is a PPINOT element
    if (businessObject && businessObject.$type && businessObject.$type.indexOf('PPINOT:') === 0) {
      // Handle PPINOT elements differently
      return updatePPINOTSemanticParent(businessObject, newParent, visualParent);
    }
    
    // For regular BPMN elements, call the original method
    return originalUpdateSemanticParent.call(this, businessObject, newParent, visualParent);
  };

  function updatePPINOTSemanticParent(businessObject, newParent, visualParent) {
    if (!businessObject) {
      return;
    }

    // For PPINOT elements, we need to handle the semantic parent differently
    if (newParent === businessObject) {
      throw new Error('element cannot be parent of itself');
    }

    var oldParent = businessObject.$parent;

    // Handle different types of new parents
    if (is(visualParent, 'bpmn:Participant')) {
      // When moving to a pool, the semantic parent should be the process
      var process = visualParent.businessObject.processRef;
      if (process) {
        // Ensure the process has the necessary arrays
        if (!process.flowElements) {
          process.flowElements = [];
        }
        if (!process.artifacts) {
          process.artifacts = [];
        }
        
        // Remove from old parent
        if (oldParent && oldParent.flowElements) {
          var participantIndex = oldParent.flowElements.indexOf(businessObject);
          if (participantIndex !== -1) {
            oldParent.flowElements.splice(participantIndex, 1);
          }
        }
        
        // Add to new parent (process)
        if (process.flowElements.indexOf(businessObject) === -1) {
          process.flowElements.push(businessObject);
        }
        
        businessObject.$parent = process;
        return;
      }
    }

    // Handle direct process parent
    if (is(newParent, 'bpmn:Process')) {
      // Ensure the process has the necessary arrays
      if (!newParent.flowElements) {
        newParent.flowElements = [];
      }
      if (!newParent.artifacts) {
        newParent.artifacts = [];
      }
      
      // Remove from old parent
      if (oldParent && oldParent.flowElements) {
        var processIndex = oldParent.flowElements.indexOf(businessObject);
        if (processIndex !== -1) {
          oldParent.flowElements.splice(processIndex, 1);
        }
      }
      
      // Add to new parent
      if (newParent.flowElements.indexOf(businessObject) === -1) {
        newParent.flowElements.push(businessObject);
      }
      
      businessObject.$parent = newParent;
      return;
    }

    // Handle collaboration parent
    if (is(newParent, 'bpmn:Collaboration')) {
      // Ensure the collaboration has the necessary arrays
      if (!newParent.artifacts) {
        newParent.artifacts = [];
      }
      
      // Remove from old parent
      if (oldParent && oldParent.artifacts) {
        var collaborationIndex = oldParent.artifacts.indexOf(businessObject);
        if (collaborationIndex !== -1) {
          oldParent.artifacts.splice(collaborationIndex, 1);
        }
      }
      
      // Add to new parent
      if (newParent.artifacts.indexOf(businessObject) === -1) {
        newParent.artifacts.push(businessObject);
      }
      
      businessObject.$parent = newParent;
      return;
    }

    // Fallback: just update the $parent reference
    businessObject.$parent = newParent;
  }

  // Store reference to original updateParent
  var originalUpdateParent = this.updateParent;
  
  // Override updateParent to handle PPINOT elements
  this.updateParent = function(element, visualParent) {
    if (element && element.businessObject && 
        element.businessObject.$type && 
        element.businessObject.$type.indexOf('PPINOT:') === 0) {
      
      // For PPINOT elements, ensure parent arrays are initialized
      if (is(visualParent, 'bpmn:Participant')) {
        var process = visualParent.businessObject.processRef;
        if (process) {
          if (!process.flowElements) {
            process.flowElements = [];
          }
          if (!process.artifacts) {
            process.artifacts = [];
          }
        }
      } else if (is(visualParent, 'bpmn:Process')) {
        if (!visualParent.businessObject.flowElements) {
          visualParent.businessObject.flowElements = [];
        }
        if (!visualParent.businessObject.artifacts) {
          visualParent.businessObject.artifacts = [];
        }
      } else if (is(visualParent, 'bpmn:Collaboration')) {
        if (!visualParent.businessObject.artifacts) {
          visualParent.businessObject.artifacts = [];
        }
      }
    }
    
    // Call original method
    return originalUpdateParent.call(this, element, visualParent);
  };
}

inherits(PPINOTBpmnUpdater, BpmnUpdater);

PPINOTBpmnUpdater.$inject = ['eventBus', 'bpmnFactory', 'connectionDocking', 'translate']; 