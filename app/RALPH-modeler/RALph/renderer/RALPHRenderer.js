import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { is } from 'bpmn-js/lib/util/ModelUtil';

const HIGH_PRIORITY = 1500;

export default class RALPHRenderer extends BaseRenderer {
  constructor(eventBus, bpmnRenderer) {
    super(eventBus, HIGH_PRIORITY);

    this.bpmnRenderer = bpmnRenderer;
  }

  canRender(element) {
    return is(element, 'ralph:Resource') ||
           is(element, 'ralph:ResourceType') ||
           is(element, 'ralph:ResourcePool');
  }

  drawShape(parentNode, element) {
    return this.bpmnRenderer.drawShape(parentNode, element);
  }

  getShapePath(shape) {
    return this.bpmnRenderer.getShapePath(shape);
  }
}

RALPHRenderer.$inject = ['eventBus', 'bpmnRenderer']; 