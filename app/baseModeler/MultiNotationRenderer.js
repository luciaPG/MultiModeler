import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import inherits from 'inherits';

export default function MultiNotationRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  // Validate parameters
  if (!eventBus) {
    throw new Error('MultiNotationRenderer requires eventBus');
  }
  if (typeof eventBus.on !== 'function') {
    throw new Error('MultiNotationRenderer requires a proper EventBus object with .on method');
  }
  if (!styles) {
    throw new Error('MultiNotationRenderer requires styles');
  }
  if (!canvas) {
    throw new Error('MultiNotationRenderer requires canvas');
  }
  if (!textRenderer) {
    throw new Error('MultiNotationRenderer requires textRenderer');
  }
  
  // Call the parent constructor with the correct parameter order
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  
  // Store references for later use
  this._textRenderer = textRenderer;
  this._canvas = canvas;
  
  // Create an instance of PPINOTRenderer with proper dependencies
  this._ppinotRenderer = new PPINOTRenderer(eventBus, styles, canvas, textRenderer);
  
  // Don't override label rendering - let PPINOTRenderer handle it natively
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
  // First check if PPINOT renderer can handle it
  if (this._ppinotRenderer.canRender(element)) {
    return true;
  }
  // Otherwise, defer to parent BpmnRenderer
  return BpmnRenderer.prototype.canRender.call(this, element);
};

MultiNotationRenderer.prototype.drawShape = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    // Use the inheritance-based PPINOTRenderer method directly
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
    // Use the inheritance-based PPINOTRenderer method directly
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
