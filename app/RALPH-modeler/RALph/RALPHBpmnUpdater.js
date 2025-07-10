import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHBpmnUpdater(eventBus, modeling) {
  eventBus.on('element.changed', function(e) {
    const element = e.element;
    const businessObject = element.businessObject;

    if (is(businessObject, 'ralph:Resource') ||
        is(businessObject, 'ralph:ResourceType') ||
        is(businessObject, 'ralph:ResourcePool')) {
      // Actualizar propiedades BPMN
      const bpmnElement = businessObject.$parent;
      if (bpmnElement) {
        modeling.updateProperties(bpmnElement, {
          name: businessObject.name,
          documentation: businessObject.description
        });
      }
    }
  });
}

RALPHBpmnUpdater.$inject = ['eventBus', 'modeling']; 