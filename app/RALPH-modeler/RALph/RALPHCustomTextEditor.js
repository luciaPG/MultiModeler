import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHCustomTextEditor(eventBus, modeling, textRenderer) {
  eventBus.on('element.click', function(e) {
    const element = e.element;

    if (is(element, 'ralph:Resource') ||
        is(element, 'ralph:ResourceType') ||
        is(element, 'ralph:ResourcePool')) {
      const text = element.businessObject.name || '';
      const options = {
        text: text,
        element: element,
        position: {
          x: element.x + element.width / 2,
          y: element.y + element.height / 2
        }
      };

      textRenderer.createText(options);
    }
  });
}

RALPHCustomTextEditor.$inject = ['eventBus', 'modeling', 'textRenderer']; 