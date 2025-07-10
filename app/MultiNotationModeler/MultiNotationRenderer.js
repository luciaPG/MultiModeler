// MultiNotationRenderer.js
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import inherits from 'inherits';
import RALphRenderer from '../RALPH-modeler/RALph/RALphRenderer';
export default function MultiNotationRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  this._ppinotRenderer = new PPINOTRenderer(styles, canvas, textRenderer);
  this._ralphRenderer = new RALphRenderer(eventBus, styles, canvas, textRenderer);
  eventBus.on('connectionPreview.shown', function(event) {
    if (event.connection && event.connection.waypoints) {
      event.connection.waypoints = event.connection.waypoints.map(function(p) {
        return {
          x: typeof p.x === 'number' ? p.x : 0,
          y: typeof p.y === 'number' ? p.y : 0,
          original: p.original ? {
            x: typeof p.original.x === 'number' ? p.original.x : 0,
            y: typeof p.original.y === 'number' ? p.original.y : 0
          } : null
        };
      });
    }
  });
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
    if (
      (element.labelTarget && this._ppinotRenderer.canRender(element.labelTarget)) ||
      (element.labelTarget && this._ralphRenderer.canRender(element.labelTarget))
    ) {
      return true;
    }
    return BpmnRenderer.prototype.canRender.call(this, element);
  }

  return (
    this._ppinotRenderer.canRender(element) ||
    this._ralphRenderer.canRender(element) ||
    BpmnRenderer.prototype.canRender.call(this, element)
  );
};

MultiNotationRenderer.prototype.drawShape = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    return this._ppinotRenderer.drawShape(parentGfx, element);
  }
  if (this._ralphRenderer.canRender(element)) {
    return this._ralphRenderer.drawShape(parentGfx, element);
  }
  return BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getShapePath = function(shape) {
  if (this._ppinotRenderer.canRender(shape)) {
    return this._ppinotRenderer.getShapePath(shape);
  }
  if (this._ralphRenderer.canRender(shape)) {
    return this._ralphRenderer.getShapePath(shape);
  }
  return BpmnRenderer.prototype.getShapePath.call(this, shape);
};

MultiNotationRenderer.prototype.drawConnection = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    return this._ppinotRenderer.drawConnection(parentGfx, element);
  }
  if (this._ralphRenderer.canRender(element)) {
    return this._ralphRenderer.drawConnection(parentGfx, element);
  }
  return BpmnRenderer.prototype.drawConnection.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getConnectionPath = function(connection) {
  if (this._ppinotRenderer.canRender(connection)) {
    return this._ppinotRenderer.getConnectionPath(connection);
  }
  if (this._ralphRenderer.canRender(connection)) {
    return this._ralphRenderer.getConnectionPath(connection);
  }
  return BpmnRenderer.prototype.getConnectionPath.call(this, connection);
};

MultiNotationRenderer.prototype.drawLabel = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    return this._ppinotRenderer.drawLabel(parentGfx, element);
  }
  if (this._ralphRenderer.canRender(element)) {
    return this._ralphRenderer.drawLabel(parentGfx, element);
  }
  const labelGfx = BpmnRenderer.prototype.drawLabel.call(this, parentGfx, element);
  if (labelGfx) {
    labelGfx.style.visibility = 'visible';
    labelGfx.style.display = 'block';
    labelGfx.style.opacity = '1';
  }
  return labelGfx;
};