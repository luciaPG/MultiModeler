import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHLabelEditingProvider(eventBus, bpmnjs) {
  eventBus.on('element.click', function(e) {
    const element = e.element;

    if (is(element, 'ralph:Resource') ||
        is(element, 'ralph:ResourceType') ||
        is(element, 'ralph:ResourcePool')) {
      bpmnjs.get('labelEditing').activate(element);
    }
  });
}

RALPHLabelEditingProvider.$inject = ['eventBus', 'bpmnjs']; 