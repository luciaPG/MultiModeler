import inherits from 'inherits';
import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {
  createLine
} from 'diagram-js/lib/util/RenderUtil';

import {
  append as svgAppend,
  create as svgCreate,
  classes as svgClasses
} from 'tiny-svg';

var RENDERER_IDS = [ 'hybrid' ];

/**
 * Renderer híbrido que maneja elementos de PPINOT y RALPH
 */
export default function HybridRenderer(eventBus, styles, pathMap, canvas, textRenderer) {
  BaseRenderer.call(this, eventBus, RENDERER_IDS);

  this._styles = styles;
  this._pathMap = pathMap;
  this._canvas = canvas;
  this._textRenderer = textRenderer;
}

inherits(HybridRenderer, BaseRenderer);

HybridRenderer.$inject = [
  'eventBus',
  'styles', 
  'pathMap',
  'canvas',
  'textRenderer'
];

HybridRenderer.prototype.canRender = function(element) {
  return /^(ppinot|ralph):/.test(element.type);
};

HybridRenderer.prototype.drawShape = function(parentGroup, element) {
  var type = element.type;
  
  if (type.startsWith('ppinot:')) {
    return this._drawPPINOTShape(parentGroup, element);
  } else if (type.startsWith('ralph:')) {
    return this._drawRalphShape(parentGroup, element);
  }
};

HybridRenderer.prototype._drawPPINOTShape = function(parentGroup, element) {
  var type = element.type;
  var rect = svgCreate('rect');
  
  // Configuración por defecto
  var attrs = {
    x: 0,
    y: 0,
    width: element.width || 120,
    height: element.height || 60,
    rx: 8,
    ry: 8
  };
  
  // Estilos específicos por tipo PPINOT
  switch (type) {
    case 'ppinot:Measure':
      attrs.fill = '#E3F2FD';
      attrs.stroke = '#1976D2';
      break;
    case 'ppinot:DerivedMeasure':
      // Crear rombo en lugar de rectángulo
      return this._drawDiamond(parentGroup, element, '#F3E5F5', '#7B1FA2');
    case 'ppinot:AggregatedMeasure':
      return this._drawHexagon(parentGroup, element, '#E8F5E8', '#388E3C');
    case 'ppinot:PPI':
      return this._drawShield(parentGroup, element, '#FFF8E1', '#FFA000');
    default:
      attrs.fill = '#F5F5F5';
      attrs.stroke = '#666';
  }
  
  // Aplicar atributos
  Object.keys(attrs).forEach(key => {
    rect.setAttribute(key, attrs[key]);
  });
  
  svgAppend(parentGroup, rect);
  
  return rect;
};

HybridRenderer.prototype._drawRalphShape = function(parentGroup, element) {
  var type = element.type;
  
  switch (type) {
    case 'ralph:Actor':
      return this._drawActor(parentGroup, element);
    case 'ralph:Goal':
      return this._drawEllipse(parentGroup, element, '#E3F2FD', '#1976D2');
    case 'ralph:SoftGoal':
      return this._drawCloud(parentGroup, element, '#F3E5F5', '#7B1FA2');
    case 'ralph:Task':
      return this._drawTaskShape(parentGroup, element, '#FFEBEE', '#D32F2F');
    default:
      return this._drawRectangle(parentGroup, element, '#E8F5E8', '#2E7D32');
  }
};

// Métodos auxiliares para formas específicas
HybridRenderer.prototype._drawRectangle = function(parentGroup, element, fill, stroke) {
  var rect = svgCreate('rect');
  rect.setAttribute('x', 0);
  rect.setAttribute('y', 0);
  rect.setAttribute('width', element.width || 100);
  rect.setAttribute('height', element.height || 80);
  rect.setAttribute('rx', 8);
  rect.setAttribute('fill', fill);
  rect.setAttribute('stroke', stroke);
  rect.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, rect);
  return rect;
};

HybridRenderer.prototype._drawEllipse = function(parentGroup, element, fill, stroke) {
  var ellipse = svgCreate('ellipse');
  ellipse.setAttribute('cx', (element.width || 120) / 2);
  ellipse.setAttribute('cy', (element.height || 60) / 2);
  ellipse.setAttribute('rx', (element.width || 120) / 2 - 5);
  ellipse.setAttribute('ry', (element.height || 60) / 2 - 5);
  ellipse.setAttribute('fill', fill);
  ellipse.setAttribute('stroke', stroke);
  ellipse.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, ellipse);
  return ellipse;
};

HybridRenderer.prototype._drawDiamond = function(parentGroup, element, fill, stroke) {
  var path = svgCreate('path');
  var w = element.width || 120;
  var h = element.height || 60;
  
  var pathData = `M ${w/2} 5 L ${w-5} ${h/2} L ${w/2} ${h-5} L 5 ${h/2} Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, path);
  return path;
};

HybridRenderer.prototype._drawHexagon = function(parentGroup, element, fill, stroke) {
  var path = svgCreate('path');
  var w = element.width || 120;
  var h = element.height || 60;
  
  var pathData = `M ${w*0.25} 5 L ${w*0.75} 5 L ${w-5} ${h/2} L ${w*0.75} ${h-5} L ${w*0.25} ${h-5} L 5 ${h/2} Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, path);
  return path;
};

HybridRenderer.prototype._drawShield = function(parentGroup, element, fill, stroke) {
  var path = svgCreate('path');
  var w = element.width || 140;
  var h = element.height || 80;
  
  var pathData = `M ${w/2} 5 L ${w-10} 20 L ${w-10} ${h/2} L ${w/2} ${h-5} L 10 ${h/2} L 10 20 Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, path);
  return path;
};

HybridRenderer.prototype._drawActor = function(parentGroup, element) {
  var group = svgCreate('g');
  
  // Cabeza
  var head = svgCreate('circle');
  head.setAttribute('cx', (element.width || 100) / 2);
  head.setAttribute('cy', 25);
  head.setAttribute('r', 15);
  head.setAttribute('fill', '#E8F5E8');
  head.setAttribute('stroke', '#2E7D32');
  head.setAttribute('stroke-width', 2);
  
  // Cuerpo
  var body = svgCreate('rect');
  body.setAttribute('x', (element.width || 100) / 2 - 15);
  body.setAttribute('y', 40);
  body.setAttribute('width', 30);
  body.setAttribute('height', 50);
  body.setAttribute('rx', 5);
  body.setAttribute('fill', '#E8F5E8');
  body.setAttribute('stroke', '#2E7D32');
  body.setAttribute('stroke-width', 2);
  
  svgAppend(group, head);
  svgAppend(group, body);
  svgAppend(parentGroup, group);
  
  return group;
};

HybridRenderer.prototype._drawCloud = function(parentGroup, element, fill, stroke) {
  var path = svgCreate('path');
  var w = element.width || 120;
  var h = element.height || 60;
  
  // Forma simplificada de nube
  var pathData = `M ${w*0.25} ${h*0.6} Q ${w*0.1} ${h*0.4} ${w*0.25} ${h*0.3} Q ${w*0.4} ${h*0.1} ${w*0.6} ${h*0.3} Q ${w*0.9} ${h*0.4} ${w*0.75} ${h*0.6} Q ${w*0.9} ${h*0.8} ${w*0.6} ${h*0.85} Q ${w*0.4} ${h*0.95} ${w*0.25} ${h*0.85} Q ${w*0.1} ${h*0.8} ${w*0.25} ${h*0.6} Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', 2);
  path.setAttribute('stroke-dasharray', '5,5');
  
  svgAppend(parentGroup, path);
  return path;
};

HybridRenderer.prototype._drawTaskShape = function(parentGroup, element, fill, stroke) {
  var path = svgCreate('path');
  var w = element.width || 120;
  var h = element.height || 60;
  
  // Hexágono alargado para tasks
  var pathData = `M ${w*0.15} ${h/2} L ${w*0.25} 5 L ${w*0.75} 5 L ${w*0.85} ${h/2} L ${w*0.75} ${h-5} L ${w*0.25} ${h-5} Z`;
  
  path.setAttribute('d', pathData);
  path.setAttribute('fill', fill);
  path.setAttribute('stroke', stroke);
  path.setAttribute('stroke-width', 2);
  
  svgAppend(parentGroup, path);
  return path;
};
