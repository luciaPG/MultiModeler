import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHUpdater(eventBus, modeling) {
  eventBus.on('element.changed', function(e) {
    const element = e.element;
    const businessObject = element.businessObject;

    if (is(businessObject, 'ralph:Resource') ||
        is(businessObject, 'ralph:ResourceType') ||
        is(businessObject, 'ralph:ResourcePool')) {
      // Update element properties
      modeling.updateProperties(element, {
        name: businessObject.name,
        description: businessObject.description
      });
    }
  });
}

RALPHUpdater.$inject = ['eventBus', 'modeling']; 