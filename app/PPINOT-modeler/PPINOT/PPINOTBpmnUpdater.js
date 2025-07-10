import inherits from 'inherits';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import BpmnUpdater from 'bpmn-js/lib/features/modeling/BpmnUpdater';

export default function PPINOTBpmnUpdater(eventBus, bpmnFactory, connectionDocking, translate) {
  BpmnUpdater.call(this, eventBus, bpmnFactory, connectionDocking, translate);

  // Referencia al método original
  var originalUpdateSemanticParent = this.updateSemanticParent;

  // Sobrescribe para tratar PPINOT
  this.updateSemanticParent = function(businessObject, newParent, visualParent) {
    if (businessObject && businessObject.$type && businessObject.$type.indexOf('PPINOT:') === 0) {
      return updatePPINOTSemanticParent(businessObject, newParent, visualParent);
    }
    return originalUpdateSemanticParent.call(this, businessObject, newParent, visualParent);
  };

  function updatePPINOTSemanticParent(businessObject, newParent, visualParent) {
    if (!businessObject) return;
    if (newParent === businessObject) throw new Error('element cannot be parent of itself');
    var oldParent = businessObject.$parent;
    if (is(visualParent, 'bpmn:Participant')) {
      var process = visualParent.businessObject.processRef;
      if (process) {
        if (!process.flowElements) process.flowElements = [];
        if (!process.artifacts) process.artifacts = [];
        if (oldParent && oldParent.flowElements) {
          var participantIndex = oldParent.flowElements.indexOf(businessObject);
          if (participantIndex !== -1) oldParent.flowElements.splice(participantIndex, 1);
        }
        if (process.flowElements.indexOf(businessObject) === -1) process.flowElements.push(businessObject);
        businessObject.$parent = process;
        return;
      }
    }
    if (is(newParent, 'bpmn:Process')) {
      if (!newParent.flowElements) newParent.flowElements = [];
      if (!newParent.artifacts) newParent.artifacts = [];
      if (oldParent && oldParent.flowElements) {
        var processIndex = oldParent.flowElements.indexOf(businessObject);
        if (processIndex !== -1) oldParent.flowElements.splice(processIndex, 1);
      }
      if (newParent.flowElements.indexOf(businessObject) === -1) newParent.flowElements.push(businessObject);
      businessObject.$parent = newParent;
      return;
    }
    if (is(newParent, 'bpmn:Collaboration')) {
      if (!newParent.artifacts) newParent.artifacts = [];
      if (oldParent && oldParent.artifacts) {
        var collaborationIndex = oldParent.artifacts.indexOf(businessObject);
        if (collaborationIndex !== -1) oldParent.artifacts.splice(collaborationIndex, 1);
      }
      if (newParent.artifacts.indexOf(businessObject) === -1) newParent.artifacts.push(businessObject);
      businessObject.$parent = newParent;
      return;
    }
    businessObject.$parent = newParent;
  }

  var originalUpdateParent = this.updateParent;
  this.updateParent = function(element, visualParent) {
    if (element && element.businessObject && element.businessObject.$type && element.businessObject.$type.indexOf('PPINOT:') === 0) {
      if (is(visualParent, 'bpmn:Participant')) {
        var process = visualParent.businessObject.processRef;
        if (process) {
          if (!process.flowElements) process.flowElements = [];
          if (!process.artifacts) process.artifacts = [];
        }
      } else if (is(visualParent, 'bpmn:Process')) {
        if (!visualParent.businessObject.flowElements) visualParent.businessObject.flowElements = [];
        if (!visualParent.businessObject.artifacts) visualParent.businessObject.artifacts = [];
      } else if (is(visualParent, 'bpmn:Collaboration')) {
        if (!visualParent.businessObject.artifacts) visualParent.businessObject.artifacts = [];
      }
    }
    return originalUpdateParent.call(this, element, visualParent);
  };
}

inherits(PPINOTBpmnUpdater, BpmnUpdater);
PPINOTBpmnUpdater.$inject = ['eventBus', 'bpmnFactory', 'connectionDocking', 'translate'];