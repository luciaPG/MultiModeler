// import inherits from 'inherits';
// import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import { componentsToPath, createLine } from 'diagram-js/lib/util/RenderUtil';
import { query as domQuery } from 'min-dom';
import { append as svgAppend, attr as svgAttr, classes as svgClasses, create as svgCreate } from 'tiny-svg';
import { getSemantic } from "bpmn-js/lib/draw/BpmnRenderUtil";
import { assign } from "min-dash";
import Ids from 'ids';
import { isPPINOTConnection } from "./Types";

import Svg from './svg';

var RENDERER_IDS = new Ids();

var BLACK = '#000';

/**
 * A renderer that knows how to render PPINOT elements.
 */
export default function PPINOTRenderer(styles, canvas, textRenderer) {
  
  this._textRenderer = textRenderer;
  var computeStyle = styles.computeStyle;
  var rendererId = RENDERER_IDS.next();
  var markers = {};

  function addMarker(id, options) {
    var attrs = assign({
      fill: 'black',
      strokeWidth: 1,
      strokeLinecap: 'round',
      strokeDasharray: 'none'
    }, options.attrs);

    var ref = options.ref || { x: 0, y: 0 };
    var scale = options.scale || 1;

    if (attrs.strokeDasharray === 'none') {
      attrs.strokeDasharray = [10000, 1];
    }

    var marker = svgCreate('marker');
    svgAttr(options.element, attrs);
    svgAppend(marker, options.element);

    svgAttr(marker, {
      id: id,
      viewBox: '0 0 20 20',
      refX: ref.x,
      refY: ref.y,
      markerWidth: 20 * scale,
      markerHeight: 20 * scale,
      orient: 'auto'
    });

    var defs = domQuery('defs', canvas._svg);

    if (!defs) {
      defs = svgCreate('defs');
      svgAppend(canvas._svg, defs);
    }
    svgAppend(defs, marker);
    markers[id] = marker;
  }

  function colorEscape(str) {
    return str.replace(/[()\s,#]+/g, '_');
  }

  function marker(type, fill, stroke) {
    var id = type + '-' + colorEscape(fill) + '-' + colorEscape(stroke) + '-' + rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return 'url(#' + id + ')';
  }

  function createMarker(id, type, fill, stroke) { 
    if (type === 'sequenceflow-end') {
      var sequenceflowEnd = svgCreate('path');
      svgAttr(sequenceflowEnd, { d: 'M 1 5 L 11 10 L 1 15 Z' });

      addMarker(id, {
        element: sequenceflowEnd,
        ref: { x: 11, y: 10 },
        scale: 0.5,
        attrs: {
          fill: stroke,
          stroke: stroke
        }
      });
    }

    //this is to draw a unfilled arrow and large blades
    if (type === 'timedistance-start') {
      var timedistanceStart = svgCreate('path');
      svgAttr(timedistanceStart, { d: 'M -10 -5 L 20 10 L -10 25 L 20 10  Z' });

      addMarker(id, {
        element: timedistanceStart,
        ref: { x: 5, y: 10 },
        scale: 0.8,
        attrs: {
          fill: '#fff',
          stroke: stroke,
          strokeWidth: 1.5,
          fillOpacity: 0
        }
      });
    }

    //this is to draw an arrow with ony two blades
    if (type === 'timedistance-end') {
      var timedistanceEnd = svgCreate('path');
      svgAttr(timedistanceEnd, { d: 'M 35 0 L 0 15 L 35 30 L 0 15  Z' });

      addMarker(id, {
        element: timedistanceEnd,
        ref: { x: 14, y: 15 },
        scale: 0.8,
        attrs: {
          fill: '#fff',
          stroke: stroke,
          strokeWidth: 1.5,
          fillOpacity: 0
        }
      });
    }

    //this is to draw a circle
    if (type === 'messageflow-start') {
      var messageflowStart = svgCreate('circle');
      svgAttr(messageflowStart, { cx: 6, cy: 6, r: 3.5 });

      addMarker(id, {
        element: messageflowStart,
        attrs: {
          fill: fill,
          stroke: stroke
        },
        ref: { x: 6, y: 6 }
      });
    }

    //this is to draw a unfilled arrow 
    if (type === 'messageflow-end') {
      var messageflowEnd = svgCreate('path');
      svgAttr(messageflowEnd, { d: 'm 1 5 l 0 -3 l 7 3 l -7 3 z' });

     
      addMarker(id, {
        element: messageflowEnd,
        attrs: {
          fill: fill,
          stroke: stroke,
          strokeLinecap: 'butt'
        },
        ref: { x: 8.5, y: 5 }
      });
    }

    //this is to draw an arrow with inverse blades
    if (type === 'association-start') {
      var associationStart = svgCreate('path');
      svgAttr(associationStart, { d: 'M 11 5 L 1 10 L 11 15' });

      addMarker(id, {
        element: associationStart,
        attrs: {
          fill: 'none',
          stroke: stroke,
          strokeWidth: 1.5
        },
        ref: { x: 1, y: 10 },
        scale: 0.5
      });
    }

    //this is to draw a small unfilled arrow 
    if (type === 'association-end') {
      var associationEnd = svgCreate('path');
      svgAttr(associationEnd, { d: 'M 1 5 L 11 10 L 1 15' });

      addMarker(id, {
        element: associationEnd,
        attrs: {
          fill: 'none',
          stroke: stroke,
          strokeWidth: 1.5
        },
        ref: { x: 12, y: 10 },
        scale: 0.5
      });
    }

    //this is to draw a diamond
    if (type === 'conditional-flow-marker') {
      var conditionalflowMarker = svgCreate('path');
      svgAttr(conditionalflowMarker, { d: 'M 0 10 L 8 6 L 16 10 L 8 14 Z' });

      addMarker(id, {
        element: conditionalflowMarker,
        attrs: {
          fill: fill,
          stroke: stroke
        },
        ref: { x: -1, y: 10 },
        scale: 0.5
      });
    }

    //this is to draw a small line
    if (type === 'conditional-default-flow-marker') {
      var conditionaldefaultflowMarker = svgCreate('path');
      svgAttr(conditionaldefaultflowMarker, { d: 'M 6 4 L 10 16' });

      addMarker(id, {
        element: conditionaldefaultflowMarker,
        attrs: {
          stroke: stroke
        },
        ref: { x: 0, y: 10 },
        scale: 0.5
      });
    }
  }


  function renderLabel(parentGfx, label, options) {
    options = assign({
      size: {
        width: 100
      }
    }, options);

    var text = textRenderer.createText(label || '', options);


    svgClasses(text).add('djs-label');
    svgClasses(text).add('ppinot-label');

    svgAppend(parentGfx, text);

    return text;
  }


  function renderEmbeddedLabel(parentGfx, element, align) {
    var semantic = getSemantic(element);

    if (!semantic.name || semantic.name.trim() === '') {
      return null;
    }

    // Ensure label has enough space and is not constrained
    if (element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target') {

      // Place label laterally outside the element so it doesn't overlap the icon.
      var LABEL_MARGIN = 4;    // gap from element border (reduced to bring text closer)
      var MAX_CHARS_PER_LINE = 18;

      var text = svgCreate('text');

      // prefer using icon bounding box if available so text sits close to icon
      var x, anchor;
      if (element.__iconBox) {
        if (element.type === 'PPINOT:Scope') {
          x = element.__iconBox.x - LABEL_MARGIN;
          anchor = 'end';
        } else { // Target
          x = element.__iconBox.x + element.__iconBox.width + LABEL_MARGIN;
          anchor = 'start';
        }
      } else {
        // fallback to previous wide placement
        if (element.type === 'PPINOT:Scope') {
          x = -LABEL_MARGIN;
          anchor = 'end';
        } else {
          x = element.width + LABEL_MARGIN;
          anchor = 'start';
        }
      }

      var y = Math.round(element.height / 2);

      svgAttr(text, {
        x: x,
        y: y,
        'text-anchor': anchor,
        'dominant-baseline': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': '11px',
        'font-weight': 'bold',
        'fill': element.color || '#000000',
        'pointer-events': 'none'
      });

      var name = (semantic && semantic.name) ? semantic.name : '';
      var lines = [];

      if (name.length <= MAX_CHARS_PER_LINE) {
        lines = [name];
      } else {
        var words = name.split(' ');
        var cur = '';
        words.forEach(function(w) {
          if ((cur + w).length > MAX_CHARS_PER_LINE) {
            if (cur) lines.push(cur.trim());
            if (w.length > MAX_CHARS_PER_LINE) {
              for (var i = 0; i < w.length; i += MAX_CHARS_PER_LINE) {
                lines.push(w.substr(i, MAX_CHARS_PER_LINE));
              }
              cur = '';
            } else {
              cur = w + ' ';
            }
          } else {
            cur += w + ' ';
          }
        });
        if (cur.trim()) lines.push(cur.trim());
      }

      // Vertical center the whole block of lines around y.
      var lineHeight = 1.2; // em
      var totalLineHeight = (lines.length - 1) * lineHeight;
      var firstDy = -(totalLineHeight / 2);

      lines.forEach(function(line, idx) {
        var tspan = svgCreate('tspan');
        if (idx === 0) {
          svgAttr(tspan, { x: x, dy: firstDy + 'em' });
        } else {
          svgAttr(tspan, { x: x, dy: lineHeight + 'em' });
        }
        tspan.textContent = line;
        svgAppend(text, tspan);
      });

      svgAppend(parentGfx, text);

      return text;
    }


    var result = renderLabel(parentGfx, semantic.name, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: element.color || '#000000',
        fontSize: '11px',
        fontWeight: 'bold'
      }
    });

    return result;
  }

  // This function uses renderLabel function to render a default label INTO an element.
  function renderEmbeddedDefaultLabel(parentGfx, element, align, label, size, weight) {
    return renderLabel(parentGfx, label, {
      box: element,
      align: align,
      paddingLeft: 2,
      style: {
        fill: element.color || '#000000',
        fontSize: (size || 11) + 'px',
        fontWeight: weight || 'bold'
      }
    });
  }

  // The following functions define the shape of the element to be rendered 
  // You have to define x, y, width, height and href (this format is the same for all elements)
  // --> href is the svg element defined in svg -> index.js
  function drawBaseMeasure(element) {
    var baseMeasure = svgCreate('image', {

      x: 6,
      y: 4,
      width: element.width * 0.8,
      height: element.height * 0.8,
      href: Svg.dataURLbaseMeasure
    })
    return baseMeasure;
  }

  function drawTarget(element) {
    // Center the target icon inside the element and provide its bounding box
    var iconUrl = Svg.dataURLtargetMini;
    var scaleFactor = 0.82; // unified scale for both target and scope (slightly larger)
    var iconWidth = Math.round(element.width * scaleFactor);
    var iconHeight = Math.round(element.height * scaleFactor);
    var offsetX = Math.round((element.width - iconWidth) / 2);
    var offsetY = Math.round((element.height - iconHeight) / 2);

    // expose icon box for label placement
    element.__iconBox = { x: offsetX, y: offsetY, width: iconWidth, height: iconHeight };

    var target = svgCreate('image', {
      x: offsetX,
      y: offsetY,
      width: iconWidth,
      height: iconHeight,
      href: iconUrl
    });

    return target;
  }

  function drawScope(element) {
    // Center the scope icon inside the element and expose its bounding box
    var iconUrl = Svg.dataURLscopeMini;
    var scaleFactor = 0.82; // unified scale for both target and scope
    var iconWidth = Math.round(element.width * scaleFactor);
    var iconHeight = Math.round(element.height * scaleFactor);
    var offsetX = Math.round((element.width - iconWidth) / 2);
    var offsetY = Math.round((element.height - iconHeight) / 2);

    element.__iconBox = { x: offsetX, y: offsetY, width: iconWidth, height: iconHeight };

    var scope = svgCreate('image', {
      x: offsetX,
      y: offsetY,
      width: iconWidth,
      height: iconHeight,
      href: iconUrl
    })
    return scope;
  }

  function drawAggregatedMeasure(element) {
    var aggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLaggregatedMeasure
    })
    return aggregatedMeasure;
  }

  function drawTimeAggregatedMeasure(element) {
    var timeAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLtimeAggregatedMeasure
    })
    return timeAggregatedMeasure;
  }

  function drawCyclicTimeAggregatedMeasure(element) {
    var cyclicTimeAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcyclicTimeAggregatedMeasure
    })
    return cyclicTimeAggregatedMeasure;
  }

  function drawCountAggregatedMeasure(element) {
    var countAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcountAggregatedMeasure
    })
    return countAggregatedMeasure;
  }

  function drawCountMeasure(element) {
    var countMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcountMeasure
    })
    return countMeasure;
  }

  function drawTimeMeasure(element) {
    var countMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLtimeMeasure
    })
    return countMeasure;
  }

  function drawCyclicTimeMeasure(element) {
    var cyclicTime = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcyclicTimeMeasure
    })
    return cyclicTime;
  }

  function drawDataAggregatedMeasure(element) {
    var dataAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataAggregatedMeasure
    })
    return dataAggregatedMeasure;
  }

  function drawDataMeasure(element) {
    var dataMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataMeasure
    })
    return dataMeasure;
  }

  function drawDataPropertyConditionAggregatedMeasure(element) {
    var dataPropertyConditionAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataPropertyConditionAggregatedMeasure
    })
    return dataPropertyConditionAggregatedMeasure;
  }

  function drawDataPropertyConditionMeasure(element) {
    var dataPropertyConditionMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataPropertyConditionMeasure
    })
    return dataPropertyConditionMeasure;
  }

  function drawDerivedMultiInstanceMeasure(element) {
    var derivedMultiInstanceMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLderivedMultiInstanceMeasure
    })
    return derivedMultiInstanceMeasure;
  }

  function drawDerivedSingleInstanceMeasure(element) {
    var derivedSingleInstanceMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLderivedSingleInstanceMeasure
    })
    return derivedSingleInstanceMeasure;
  }

  function drawPpi(element) {
    var ppi = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLppi4
    })
    return ppi;
  }

  function drawStateConditionMeasure(element) {
    var stateConditionMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLstateConditionMeasure
    })
    return stateConditionMeasure;
  }

  function drawStateConditionAggregatedMeasure(element) {
    var stateConditionAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLstateConditionAggregatedMeasure
    })
    return stateConditionAggregatedMeasure;
  }

  function renderer(type) {
    return renderers[type];
  }


  var renderers = this.renderers = {
    'PPINOT:Target': (p, element) => {
      let target = drawTarget(element)
      svgAppend(p, target);
      renderEmbeddedLabel(p, element, 'center-middle');
      return target;
    },
    'PPINOT:Scope': (p, element) => {
      let scope = drawScope(element)
      svgAppend(p, scope);

      // Always use right-middle alignment since we're always rendering as mini
      renderEmbeddedLabel(p, element, 'right-middle');
      return scope;
    },
    'PPINOT:AggregatedMeasure': (p, element) => {
      let aggregatedMeasure = drawAggregatedMeasure(element);
      svgAppend(p, aggregatedMeasure);

      return aggregatedMeasure;
    },
    'PPINOT:AggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:AggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:AggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:AggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:AggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:AggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:AggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:AggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:TimeAggregatedMeasure': (p, element) => {
      let timeAggregatedMeasure = drawTimeAggregatedMeasure(element)
      svgAppend(p, timeAggregatedMeasure);
     
      return timeAggregatedMeasure;
    },
    'PPINOT:TimeAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:TimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:TimeAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:TimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:TimeAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:TimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:TimeAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:TimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeAggregatedMeasure': (p, element) => {
      let cyclicTimeAggregatedMeasure = drawCyclicTimeAggregatedMeasure(element)
      svgAppend(p, cyclicTimeAggregatedMeasure);
      return cyclicTimeAggregatedMeasure;
    },
    'PPINOT:CyclicTimeAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-top', '\xa0\xa0\xa0\xa0\xa0' + 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-top','\xa0\xa0\xa0\xa0\xa0' +  'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-top', '\xa0\xa0\xa0\xa0\xa0' + 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-top','\xa0\xa0\xa0\xa0\xa0' +  'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0' + 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0' + 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0' + 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0' + 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CountAggregatedMeasure': (p, element) => {
      let countAggregatedMeasure = drawCountAggregatedMeasure(element)
      svgAppend(p, countAggregatedMeasure);
    
      return countAggregatedMeasure;
    },
    'PPINOT:CountAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CountAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CountAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CountAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CountAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CountAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CountAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CountAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CountMeasure': (p, element) => {
      let countMeasure = drawCountMeasure(element)
      svgAppend(p, countMeasure);
     
      return countMeasure;
    },
    'PPINOT:TimeMeasure': (p, element) => {
      let timeMeasure = drawTimeMeasure(element)
      svgAppend(p, timeMeasure);
      
      return timeMeasure;
    },
    'PPINOT:CyclicTimeMeasure': (p, element) => {
      let cyclicTime = drawCyclicTimeMeasure(element)
      svgAppend(p, cyclicTime);
     
      return cyclicTime;
    },
    'PPINOT:BaseMeasure': (p, element) => {
      let baseMeasure = drawBaseMeasure(element)
      svgAppend(p, baseMeasure);

      return baseMeasure;
    },
    'PPINOT:DataAggregatedMeasure': (p, element) => {
      let dataAggregatedMeasure = drawDataAggregatedMeasure(element)
      svgAppend(p, dataAggregatedMeasure);
    
      return dataAggregatedMeasure;
    },
    'PPINOT:DataAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:DataAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:DataAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:DataAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:DataAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:DataAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:DataAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:DataAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:DataMeasure': (p, element) => {
      let dataMeasure = drawDataMeasure(element)
      svgAppend(p, dataMeasure);
    
      return dataMeasure;
    },
    'PPINOT:DataPropertyConditionAggregatedMeasure': (p, element) => {
      let dataPropertyConditionAggregatedMeasure = drawDataPropertyConditionAggregatedMeasure(element)
      svgAppend(p, dataPropertyConditionAggregatedMeasure);
    
      return dataPropertyConditionAggregatedMeasure;
    },
    'PPINOT:DataPropertyConditionMeasure': (p, element) => {
      let dataPropertyConditionMeasure = drawDataPropertyConditionMeasure(element)
      svgAppend(p, dataPropertyConditionMeasure);
    
      return dataPropertyConditionMeasure;
    },
    'PPINOT:DerivedMultiInstanceMeasure': (p, element) => {
      let derivedMultiInstanceMeasure = drawDerivedMultiInstanceMeasure(element)
      svgAppend(p, derivedMultiInstanceMeasure);
    
      return derivedMultiInstanceMeasure;
    },
    'PPINOT:StateConditionMeasure': (p, element) => {
      let stateConditionMeasure = drawStateConditionMeasure(element)
      svgAppend(p, stateConditionMeasure);
    
      return stateConditionMeasure;
    },
    'PPINOT:StateConditionAggregatedMeasure': (p, element) => {
      let stateConditionAggregatedMeasure = drawStateConditionAggregatedMeasure(element)
      svgAppend(p, stateConditionAggregatedMeasure);
    
      return stateConditionAggregatedMeasure;
    },
    'PPINOT:StateCondAggMeasureNumber': (p, element) => {
      var number = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', '#', 30);
      return number;
    },
    'PPINOT:StateCondAggMeasurePercentage': (p, element) => {
      var percentage = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', '%', 30);
      return percentage;
    },
    'PPINOT:StateCondAggMeasureAll': (p, element) => {
      var all = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', '∀', 30);
      return all;
    },
    'PPINOT:StateCondAggMeasureAtLeastOne': (p, element) => {
      var one = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', '∃', 30);
      return one;
    },
    'PPINOT:StateCondAggMeasureNo': (p, element) => {
      var no = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element);
      renderEmbeddedDefaultLabel(p, element, 'center-middle', '∄', 30);
      return no;
    },
    'PPINOT:Ppi': (p, element) => {
      let ppi = drawPpi(element)
      svgAppend(p, ppi);
      renderEmbeddedLabel(p, element, 'top');
      return ppi;
    },
    'PPINOT:DerivedSingleInstanceMeasure': (p, element) => {
      let derivedSingleInstanceMeasure = drawDerivedSingleInstanceMeasure(element)
      svgAppend(p, derivedSingleInstanceMeasure);
    
      return derivedSingleInstanceMeasure;
    },

    'PPINOT:ResourceArc': (p, element) => {
      var attrs = computeStyle(attrs, {
      stroke: element.color || BLACK, 
      strokeWidth: 1.5, 
      markerEnd: marker('sequenceflow-end', 'white',BLACK), 
      });
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:MyConnection': (p, element) => {
      var attrs = computeStyle(attrs, {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        markerEnd: marker('sequenceflow-end', 'white',BLACK),
      });
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:DashedLine': (p, element) => {
        var attrs = computeStyle(attrs, {
          stroke: BLACK, 
          strokeWidth: 1.5, 
          strokeDasharray: [10,7] 
        });
        return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:RFCStateConnection': (p, element) => {
      var attrs = computeStyle(attrs, {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [10,7] 
      });
      return svgAppend(p, createLine(element.waypoints, attrs));
  },
    'PPINOT:AggregatedConnection': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        markerStart: marker('conditional-flow-marker', 'white', BLACK),
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:GroupedBy': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        markerStart: marker('conditional-flow-marker', 'white',BLACK),      
      };
      
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
     
    'PPINOT:ToConnection': (p, element) => {
      var attrs = computeStyle({}, {
        stroke: BLACK,
        strokeWidth: 1.5,
        strokeDasharray: '8,5',
        markerStart: marker('messageflow-start', 'black', BLACK),
        markerEnd: marker('messageflow-start', 'black', BLACK),
      });
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:FromConnection': (p, element) => {
      var attrs = computeStyle({}, {
        stroke: BLACK,
        strokeWidth: 1.5,
        strokeDasharray: [8, 5],
        markerStart: marker('messageflow-start', 'white', BLACK),
        markerEnd: marker('messageflow-start', 'white', BLACK),
      });
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:EndConnection': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        markerEnd: marker('messageflow-start', 'black',BLACK),
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:StartConnection': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        markerEnd: marker('messageflow-start', 'white',BLACK),
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'label': (p, element) => {
      return self.renderExternalLabel(p, element);
    },
  };

  

  this.paths = {
    'PPINOT:BaseMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var offsetX = 6; 
      var offsetY = 4; 
      var scaledWidth = width * 0.8; 
      var scaledHeight = height * 0.8; 

      var adjustedX = x + offsetX;
      var adjustedY = y + offsetY;

      var borderRadius = 10;

      var d = [
        ['M', adjustedX + borderRadius, adjustedY],
        ['l', scaledWidth - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, scaledHeight - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - scaledWidth, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - scaledHeight],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:Target': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var d = [
        ['M', x, y],
        ['h', width],
        ['v', height],
        ['h', -width],
        ['v', -height],
          ['z']
        ]

      return componentsToPath(d);
    },

    'PPINOT:Scope': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var d = [
        ['M', x, y],
        ['h', width],
        ['v', height],
        ['h', -width],
        ['v', -height],
        ['z']
      ]

      return componentsToPath(d);
    },
    'PPINOT:AggregatedMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:TimeAggregatedMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
          ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeAggregatedMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CountAggregatedMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:RFCStateConnection': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CountMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:TimeMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeMeasure': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;


      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeAggregatedMeasureMAX': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeAggregatedMeasureSUM': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeAggregatedMeasureMIN': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },
    'PPINOT:CyclicTimeAggregatedMeasureAVG': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var borderRadius = 20;

      var d = [
        ['M', x + borderRadius, y],
        ['l', width - borderRadius * 2, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, borderRadius],
        ['l', 0, height - borderRadius * 2],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, borderRadius],
        ['l', borderRadius * 2 - width, 0],
        ['a', borderRadius, borderRadius, 0, 0, 1, -borderRadius, -borderRadius],
        ['l', 0, borderRadius * 2 - height],
        ['a', borderRadius, borderRadius, 0, 0, 1, borderRadius, -borderRadius],
        ['z']
      ];

      return componentsToPath(d);
    },

    'label': (element) => {
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height;

      var rectPath = [
        ['M', x, y],
        ['l', width, 0],
        ['l', 0, height],
        ['l', -width, 0],
        ['z']
      ];

      return componentsToPath(rectPath);
  }
}


this.canRender = function (element) {

  if (/^PPINOT:/.test(element.type)) {
    return true;
  }


  if (element.type === 'label' && element.labelTarget) {
    var target = element.labelTarget;
    if (target.type && /^PPINOT:/.test(target.type)) {
      return true;
    }
  }

  return false;
};

this.drawShape = function (p, element) {
  var type = element.type;


  if (type === 'label' && element.labelTarget && element.labelTarget.type && /^PPINOT:/.test(element.labelTarget.type)) {
    return this.drawLabel(p, element);
  }

  var h = this.renderers[type];

  if (element.color == null)
    element.color = "#000"

  /* jshint -W040 */
  return h(p, element);
};

PPINOTRenderer.prototype.drawLabel = function (parentGfx, element) {
  if (!element) return null;

  const text = (element.businessObject && typeof element.businessObject.name === 'string')
    ? element.businessObject.name
    : '';

  if (!text.trim()) return null;

  const { width = 150, height = 50 } = element;

  const textElement = this._textRenderer.createText(text, {
    box: { width, height },
    align: 'center-middle',
    style: {
      fontSize: '12px',
      fontFamily: 'Arial, sans-serif',
      fill: '#000',
      whiteSpace: 'pre',       
      maxWidth: width,
    }
  });

  svgClasses(textElement).add('ppinot-label');
  svgAppend(parentGfx, textElement);

  return textElement;
};

this.getShapePath = function (shape) {
  var type = shape.type;

  if (isPPINOTConnection(type)) {
    var waypoints = shape.waypoints || [];

    // Fallback: if waypoints are missing/invalid, synthesize from source/target
    var valid = Array.isArray(waypoints) && waypoints.length >= 2 && waypoints.every(function(p){
      return p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y);
    });

    if (!valid && shape.source && shape.target) {
      var sx = shape.source.x + (shape.source.width || 0) / 2;
      var sy = shape.source.y + (shape.source.height || 0) / 2;
      var tx = shape.target.x + (shape.target.width || 0) / 2;
      var ty = shape.target.y + (shape.target.height || 0) / 2;

      var fallback = [];
      if (type === 'PPINOT:GroupedBy') {
        var midY = (sy + ty) / 2;
        fallback = [ ['M', sx, sy], ['L', sx, midY], ['L', tx, midY], ['L', tx, ty] ];
      } else {
        fallback = [ ['M', sx, sy], ['L', tx, ty] ];
      }
      return componentsToPath(fallback);
    }

    if (!valid) {
      return 'M0,0 L0,0';
    }

    var connectionPath = [ ['M', waypoints[0].x, waypoints[0].y] ];
    for (var i = 1; i < waypoints.length; i++) {
      connectionPath.push(['L', waypoints[i].x, waypoints[i].y]);
    }
    return componentsToPath(connectionPath);
  }

  var h = this.paths[type];

  if (!h) {
    var x = shape.x || 0;
    var y = shape.y || 0;
    var width = shape.width || 50;
    var height = shape.height || 50;

    return 'M' + x + ',' + y +
      ' L' + (x + width) + ',' + y +
      ' L' + (x + width) + ',' + (y + height) +
      ' L' + x + ',' + (y + height) +
      ' Z';
  }

  /* jshint -W040 */
  return h(shape);
};

this.drawConnection = function (p, element) {
  var type = element.type;
  var h = this.renderers[type];
  if (element.color == null)
    element.color = "#000"

  /* jshint -W040 */
  return h(p, element);
};

this.getConnectionPath = function (connection) {
    var waypoints = connection.waypoints || [];

    var valid = Array.isArray(waypoints) && waypoints.length >= 2 && waypoints.every(function(p){
      var point = p && (p.original || p);
      return point && typeof point.x === 'number' && typeof point.y === 'number' && isFinite(point.x) && isFinite(point.y);
    });

    // Fallback: synthesize from source/target centers if invalid
    if (!valid && connection.source && connection.target) {
      var sx = connection.source.x + (connection.source.width || 0) / 2;
      var sy = connection.source.y + (connection.source.height || 0) / 2;
      var tx = connection.target.x + (connection.target.width || 0) / 2;
      var ty = connection.target.y + (connection.target.height || 0) / 2;

      var fallback = [];
      if (connection.type === 'PPINOT:GroupedBy') {
        var midY = (sy + ty) / 2;
        fallback = [ ['M', sx, sy], ['L', sx, midY], ['L', tx, midY], ['L', tx, ty] ];
      } else {
        fallback = [ ['M', sx, sy], ['L', tx, ty] ];
      }
      return componentsToPath(fallback);
    }

    if (!valid) {
      return 'M0,0 L0,0';
    }

    var normalized = waypoints.map(function (p) {
      var point = p.original || p;
      return {
        x: point.x,
        y: point.y
      };
    });

    var connectionPath = [ ['M', normalized[0].x, normalized[0].y] ];
    normalized.forEach(function (waypoint, index) {
      if (index !== 0) {
        connectionPath.push(['L', waypoint.x, waypoint.y]);
      }
    });

    return componentsToPath(connectionPath);
};

PPINOTRenderer.$inject = ['styles', 'canvas', 'textRenderer'];
}

// Improved lateral label placement for Scope (left) and Target (right).