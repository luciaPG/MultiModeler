import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import inherits from 'inherits';

export default function MultiNotationRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  this._textRenderer = textRenderer;
  this._canvas = canvas;
  this._ppinotRenderer = new PPINOTRenderer(eventBus, styles, canvas, textRenderer);
}

inherits(MultiNotationRenderer, BpmnRenderer);

MultiNotationRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas',
  'textRenderer'
];

MultiNotationRenderer.prototype.canRender = function(element) {
  if (element.type === 'label') {
    return BpmnRenderer.prototype.canRender.call(this, element);
  }
  if (this._ppinotRenderer.canRender(element)) {
    return true;
  }
  return BpmnRenderer.prototype.canRender.call(this, element);
};

MultiNotationRenderer.prototype.drawShape = function(parentGfx, element) {
  if (element.type === 'label') {
    return BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);
  }
  if (this._ppinotRenderer.canRender(element)) {
    return this._ppinotRenderer.drawShape(parentGfx, element);
  }
  return BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getShapePath = function(shape) {
  if (this._ppinotRenderer.canRender(shape)) {
    return this._ppinotRenderer.getShapePath(shape);
  }
  return BpmnRenderer.prototype.getShapePath.call(this, shape);
};

MultiNotationRenderer.prototype.drawConnection = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    return this._ppinotRenderer.drawConnection(parentGfx, element);
  }
  return BpmnRenderer.prototype.drawConnection.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getConnectionPath = function(connection) {
  if (this._ppinotRenderer.canRender(connection)) {
    return this._ppinotRenderer.getConnectionPath(connection);
  }
  return BpmnRenderer.prototype.getConnectionPath.call(this, connection);
};

MultiNotationRenderer.prototype.drawLabel = function(parentGfx, element) {
  const labelGfx = BpmnRenderer.prototype.drawLabel.call(this, parentGfx, element);
  if (labelGfx) {
    labelGfx.style.visibility = 'visible';
    labelGfx.style.display = 'block';
    labelGfx.style.opacity = '1';
    const textElement = labelGfx.querySelector('text');
    if (textElement) {
      const tspanElement = textElement.querySelector('tspan');
      if (tspanElement) {
        if (!tspanElement.textContent || tspanElement.textContent.trim() === '') {
          const fallbackText = element.id ? 
            element.id.replace('_label', '').replace(/([A-Z])/g, ' $1').trim() || 'PPINOT Element' :
            'PPINOT Element';
          tspanElement.textContent = fallbackText;
        }
      }
    }
  }
  return labelGfx;
};

export function CustomElementFactoryProvider(type = 'PPINOT') {
  let factory;
  switch (type) {
    case 'PPINOT':
      factory = MultiNotationRenderer;
      break;
    default:
      factory = MultiNotationRenderer;
  }
  return {
    __init__: ['elementFactory'],
    elementFactory: ['type', factory]
  };
}

