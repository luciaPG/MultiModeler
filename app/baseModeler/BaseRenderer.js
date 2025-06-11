import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import {
  componentsToPath
} from 'diagram-js/lib/util/RenderUtil';
import {
  query as domQuery
} from 'min-dom';
import {
  append as svgAppend,
  attr as svgAttr,
  create as svgCreate,
  classes as svgClasses
} from 'tiny-svg';
import { assign } from 'min-dash';
import { getLabel } from '../PPINOT-modeler/PPINOT/utils/LabelUtil';
import Ids from 'ids';

var RENDERER_IDS = new Ids();

export default function CustomBaseRenderer(eventBus, canvas, textRenderer) {
  BaseRenderer.call(this, eventBus, 2000);

  this._canvas = canvas;
  this._textRenderer = textRenderer;
  this._rendererId = RENDERER_IDS.next();
  this._markers = {};
}

CustomBaseRenderer.prototype = Object.create(BaseRenderer.prototype);
CustomBaseRenderer.prototype.constructor = CustomBaseRenderer;

CustomBaseRenderer.$inject = ['eventBus', 'canvas', 'textRenderer'];

/**
 * Renders a label with the given options
 */
CustomBaseRenderer.prototype.renderLabel = function(parentGfx, label, options) {
  options = assign({
    size: {
      width: 100
    }
  }, options);

  var text = this._textRenderer.createText(label || '', options);
  svgClasses(text).add('djs-label');
  svgAppend(parentGfx, text);
  return text;
};

/**
 * Renders an embedded label inside an element
 */
CustomBaseRenderer.prototype.renderEmbeddedLabel = function(parentGfx, element, align) {
  var semantic = element.businessObject;
  return this.renderLabel(parentGfx, semantic.text, {
    box: element,
    align: align,
    padding: 5,
    style: {
      fill: element.color
    }
  });
};

/**
 * Renders an embedded label with custom text and styling
 */
CustomBaseRenderer.prototype.renderEmbeddedDefaultLabel = function(parentGfx, element, align, label, size, weight) {
  return this.renderLabel(parentGfx, label, {
    box: element,
    align: align,
    padding: 5,
    style: {
      fill: element.color,
      fontSize: size + 'px',
      fontWeight: weight
    }
  });
};

/**
 * Renders an external label for an element
 */
CustomBaseRenderer.prototype.renderExternalLabel = function(parentGfx, element) {
  var box = {
    width: 90,
    height: 10,
    x: element.width / 2 + element.x,
    y: element.height / 2 + element.y
  };
  return this.renderLabel(parentGfx, getLabel(element), {
    box: box,
    fitBox: true,
    style: assign(
      {},
      this._textRenderer.getExternalStyle(),
      {
        fill: element.color
      }
    )
  });
};

/**
 * Adds a marker to the canvas
 */
CustomBaseRenderer.prototype.addMarker = function(id, options) {
  var attrs = assign({
    fill: 'black',
    strokeWidth: 1,
    strokeLinecap: 'round',
    strokeDasharray: 'none',
    labelContent: ''
  }, options.attrs);

  var ref = options.ref || { x: 0, y: 0 };
  var scale = options.scale || 1;

  // fix for safari / chrome / firefox bug not correctly resetting stroke dash array
  if (attrs.strokeDasharray === 'none') {
    attrs.strokeDasharray = '';
  }

  var marker = svgCreate('marker');
  svgAttr(options.element, attrs);
  svgAppend(marker, options.element);  svgAttr(marker, {
    id: id,
    viewBox: '0 0 20 20',
    refX: ref.x,
    refY: ref.y,
    markerWidth: 12 * scale,
    markerHeight: 12 * scale,
    orient: 'auto'
  });

  var defs = domQuery('defs', this._canvas._svg);
  if (!defs) {
    defs = svgCreate('defs');
    svgAppend(this._canvas._svg, defs);
  }
  
  svgAppend(defs, marker);
  this._markers[id] = marker;
};

/**
 * Escapes color strings for use in marker IDs
 */
CustomBaseRenderer.prototype.colorEscape = function(str) {
  return str.replace(/[()\s,#]+/g, '_');
};

/**
 * Creates a marker URL reference
 */
CustomBaseRenderer.prototype.markerUrl = function(type, fill, stroke) {
  var id = type + '-' + this.colorEscape(fill) + '-' + this.colorEscape(stroke) + '-' + this._rendererId;

  if (!this._markers[id]) {
    this.createMarker(id, type, fill, stroke);
  }

  return 'url(#' + id + ')';
};

/**
 * Creates different types of markers for connections
 */
CustomBaseRenderer.prototype.createMarker = function(id, type, fill, stroke) {
  // Common arrow marker
  if (type === 'sequenceflow-end') {
    var sequencePath = svgCreate('path');
    svgAttr(sequencePath, { d: 'M 1 5 L 11 10 L 1 15 Z' });
    this.addMarker(id, {
      element: sequencePath,
      ref: { x: 11, y: 10 },
      scale: 1,
      attrs: {
        fill: stroke,
        stroke: stroke
      }
    });
  }

  // Time distance start marker
  if (type === 'timedistance-start') {
    var timeStartPath = svgCreate('path');
    svgAttr(timeStartPath, { d: 'M 1 5 L 11 10 L 1 15' });
    this.addMarker(id, {
      element: timeStartPath,
      ref: { x: 11, y: 10 },
      scale: 1,
      attrs: {
        fill: 'none',
        stroke: stroke,
        strokeWidth: 2
      }
    });
  }

  // Time distance end marker
  if (type === 'timedistance-end') {
    var timeEndPath = svgCreate('path');
    svgAttr(timeEndPath, { d: 'M 1 5 L 11 10 L 1 15' });
    this.addMarker(id, {
      element: timeEndPath,
      ref: { x: 11, y: 10 },
      scale: 1,
      attrs: {
        fill: 'none',
        stroke: stroke,
        strokeWidth: 1
      }
    });
  }

  // Circle marker
  if (type === 'messageflow-start') {
    var circle = svgCreate('circle');
    svgAttr(circle, { cx: 6, cy: 6, r: 3 });
    this.addMarker(id, {
      element: circle,
      ref: { x: 6, y: 6 },
      scale: 0.9,
      attrs: {
        fill: 'white',
        stroke: stroke
      }
    });
  }

  // Message flow end marker
  if (type === 'messageflow-end') {
    var messageEndPath = svgCreate('path');
    svgAttr(messageEndPath, { d: 'M 1 5 L 11 10 L 1 15' });
    this.addMarker(id, {
      element: messageEndPath,
      ref: { x: 11, y: 10 },
      scale: 1,
      attrs: {
        fill: 'white',
        stroke: stroke
      }
    });
  }

  // Association start marker
  if (type === 'association-start') {
    var assocStartPath = svgCreate('path');
    svgAttr(assocStartPath, { d: 'M 11 5 L 1 10 L 11 15' });
    this.addMarker(id, {
      element: assocStartPath,
      ref: { x: 1, y: 10 },
      scale: 1,
      attrs: {
        fill: 'none',
        stroke: stroke,
        strokeWidth: 1.5
      }
    });
  }

  // Association end marker
  if (type === 'association-end') {
    var assocEndPath = svgCreate('path');
    svgAttr(assocEndPath, { d: 'M 1 5 L 11 10 L 1 15' });
    this.addMarker(id, {
      element: assocEndPath,
      ref: { x: 11, y: 10 },
      scale: 1,
      attrs: {
        fill: 'none',
        stroke: stroke,
        strokeWidth: 1.5
      }
    });
  }

  // Diamond marker for conditional flow
  if (type === 'conditional-flow-marker') {
    var diamondPath = svgCreate('path');
    svgAttr(diamondPath, { d: 'M 0 10 L 8 6 L 16 10 L 8 14 Z' });
    this.addMarker(id, {
      element: diamondPath,
      ref: { x: 16, y: 10 },
      scale: 1,
      attrs: {
        fill: 'white',
        stroke: stroke
      }
    });
  }

  // Small line marker for default flow
  if (type === 'conditional-default-flow-marker') {
    var defaultPath = svgCreate('path');
    svgAttr(defaultPath, { d: 'M 6 4 L 10 16' });
    this.addMarker(id, {
      element: defaultPath,
      ref: { x: 0, y: 10 },
      scale: 1,
      attrs: {
        fill: 'none',
        stroke: stroke,
        strokeWidth: 2
      }
    });
  }
};

/**
 * Creates a standard SVG image element for rendering
 */
CustomBaseRenderer.prototype.createSvgImage = function(element, svgData, offsetX, offsetY, widthRatio, heightRatio) {
  offsetX = offsetX || 0;
  offsetY = offsetY || 0;
  widthRatio = widthRatio || 1;
  heightRatio = heightRatio || 1;

  return svgCreate('image', {
    x: offsetX,
    y: offsetY,
    width: element.width * widthRatio,
    height: element.height * heightRatio,
    href: svgData
  });
};

/**
 * Creates connection path from waypoints
 */
CustomBaseRenderer.prototype.createConnectionPath = function(connection) {
  var waypoints = connection.waypoints.map(function(p) {
    return p.original || p;
  });

  var connectionPath = [
    ['M', waypoints[0].x, waypoints[0].y]
  ];

  waypoints.forEach(function(waypoint, index) {
    if (index !== 0) {
      connectionPath.push(['L', waypoint.x, waypoint.y]);
    }
  });

  return componentsToPath(connectionPath);
};