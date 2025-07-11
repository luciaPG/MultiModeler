// MultiNotationRenderer.js
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import inherits from 'inherits';
import RALphRenderer from '../RALPH-modeler/RALph/RALphRenderer';

// Helper function to validate and sanitize waypoints
function validateAndSanitizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return [];
  }
  
  return waypoints.filter(function(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }).map(function(point) {
    // Ensure coordinates are finite numbers
    return {
      x: isFinite(point.x) ? point.x : 0,
      y: isFinite(point.y) ? point.y : 0,
      original: point.original ? {
        x: isFinite(point.original.x) ? point.original.x : 0,
        y: isFinite(point.original.y) ? point.original.y : 0
      } : null
    };
  });
}

export default function MultiNotationRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  this._ppinotRenderer = new PPINOTRenderer(styles, canvas, textRenderer);
  this._ralphRenderer = new RALphRenderer(eventBus, styles, canvas, textRenderer);
  
  // Validate waypoints for connection previews
  eventBus.on('connectionPreview.shown', function(event) {
    if (event.connection && event.connection.waypoints) {
      event.connection.waypoints = validateAndSanitizeWaypoints(event.connection.waypoints);
    }
  });

  // Validate waypoints for all connections
  eventBus.on(['connection.create', 'connection.updateWaypoints', 'bendpoint.move.cleanup'], function(event) {
    var context = event.context,
        connection = context && context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
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