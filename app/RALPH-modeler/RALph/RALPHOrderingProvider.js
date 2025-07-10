import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHOrderingProvider(eventBus, modeling) {
  eventBus.on('element.changed', function(e) {
    const element = e.element;
    const businessObject = element.businessObject;

    if (is(businessObject, 'ralph:ResourcePool')) {
      // Ordenar recursos dentro del pool
      const resources = element.children.filter(child => 
        is(child.businessObject, 'ralph:Resource')
      );

      resources.sort((a, b) => {
        return a.y - b.y;
      });

      resources.forEach((resource, index) => {
        modeling.updateProperties(resource, {
          y: element.y + 50 + (index * 80)
        });
      });
    }
  });
}

RALPHOrderingProvider.$inject = ['eventBus', 'modeling']; 