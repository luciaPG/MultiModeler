import inherits from 'inherits';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';

import {componentsToPath, createLine} from 'diagram-js/lib/util/RenderUtil';

import {query as domQuery} from 'min-dom';

import {append as svgAppend, attr as svgAttr, classes as svgClasses, create as svgCreate} from 'tiny-svg';
import {getSemantic} from "bpmn-js/lib/draw/BpmnRenderUtil";
import {assign} from "min-dash";
import Ids from 'ids';
import {isPPINOTConnection} from "./Types";

import Svg from './svg';

var RENDERER_IDS = new Ids();

var BLACK = '#000';

/**
 * A renderer that knows how to render PPINOT elements.
 * 
 * This module is used to declarate which elements will be created in the diagram when you 
 * drag an element of the palette. It is only for PPINOT elements, not bpmn elements.
 */
export default function PPINOTRenderer(eventBus, styles, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 2000);

  var computeStyle = styles.computeStyle;

  var rendererId = RENDERER_IDS.next();

  var markers = {};

  
  // This function is necessary to render a label for an element.
  function renderLabel(parentGfx, label, options) {
    options = assign({
      size: {
        width: 100
      }
    }, options);

    var text = textRenderer.createText(label || '', options);
    

    svgClasses(text).add('djs-label');

    svgAppend(parentGfx, text);

    return text;
  }

  // This function uses renderLabel function to render a label INTO an element.
  function renderEmbeddedLabel(parentGfx, element, align) {
    var semantic = getSemantic(element);
    
    // Try multiple sources for the label text
    var labelText = '';
    if (semantic && semantic.name) {
      labelText = semantic.name;
    } else if (element.businessObject && element.businessObject.name) {
      labelText = element.businessObject.name;
    } else if (element.businessObject && element.businessObject.$attrs && element.businessObject.$attrs['name']) {
      labelText = element.businessObject.$attrs['name'];
    } else if (element.label) {
      labelText = element.label;
    }
    
    // Si no hay texto para la label, no renderizar nada
    if (!labelText || labelText.trim() === '') {
      return null;
    }

    // Para Scope mini y Target mini, crear texto SVG directo sin recuadro
    if (align === 'right-middle' && element.parent && element.parent.type === 'PPINOT:Ppi' && 
        (element.type === 'PPINOT:Scope' || element.type === 'PPINOT:Target')) {
      // Crear el texto SVG directamente para mini elementos sin usar el sistema de labels estándar
      var text = svgCreate('text');
      
      var centerX, centerY;
      
      if (element.type === 'PPINOT:Scope') {
        // Para Scope mini: posicionar la etiqueta a la izquierda del icono pequeño centrado
        var scaleFactor = 0.3;
        var iconOffsetX = 10 + (element.width * (1 - scaleFactor)) / 2;
        centerX = iconOffsetX - 2;  // Un poco a la izquierda del icono pequeño
        centerY = element.height / 2;
      } else {
        // Para Target mini: posicionar la etiqueta a la izquierda del icono normal
        centerX = 8;  // Posición a la izquierda del icono
        centerY = element.height / 2;
      }
      
      svgAttr(text, {
        x: centerX,
        y: centerY,
        'text-anchor': 'end',  // Alineado a la derecha (termina en centerX)
        'dominant-baseline': 'middle',
        'font-family': 'Arial, sans-serif',
        'font-size': '11px',  // Tamaño estándar igual al de otras labels
        'font-weight': 'bold',  // Hacer la etiqueta bold
        'fill': element.color || '#000000',
        'pointer-events': 'none'  // Evitar que interfiera con la interacción
      });
      
      text.textContent = labelText;
      // NO añadir la clase 'djs-label' para evitar el recuadro azul
      svgAppend(parentGfx, text);
      
      return text;
    }

    // Para elementos normales, usar el método estándar
    var result = renderLabel(parentGfx, labelText, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: element.color || '#000000'
      }
    });
    
    return result;
  }

  // This function uses renderLabel function to render a default label INTO an element.
  function renderEmbeddedDefaultLabel(parentGfx, element, align, label, size, weight) {
    return renderLabel(parentGfx, label, {
      box: element,
      align: align,
      padding: 5,
      style: {
        fill: element.color,
        fontSize:  size + 'px',
        fontWeight: weight
      }
    });
  }
  
  // This function uses renderLabel function to render an external label for an element.
  // Label will render under the element by default.
  function renderExternalLabel(parentGfx, element) {
    var semantic = getSemantic(element);
    
    // Try multiple sources for the label text - same logic as renderEmbeddedLabel
    var labelText = '';
    if (semantic && semantic.name) {
      labelText = semantic.name;
    } else if (element.businessObject && element.businessObject.name) {
      labelText = element.businessObject.name;
    } else if (element.businessObject && element.businessObject.$attrs && element.businessObject.$attrs['name']) {
      labelText = element.businessObject.$attrs['name'];
    } else if (element.businessObject && element.businessObject.text) {
      labelText = element.businessObject.text;
    } else if (element.label) {
      labelText = element.label;
    }
    
    // Si no hay texto para la label, no renderizar nada
    if (!labelText || labelText.trim() === '') {
      return null;
    }
    
    // Crear el texto SVG directamente
    var text = svgCreate('text');
    svgAttr(text, {
      x: element.width / 2,  // Centro horizontal del elemento
      y: element.height + 18, // Debajo del elemento + offset para el texto
      'text-anchor': 'middle',
      'font-family': 'Arial, sans-serif',
      'font-size': '11px',
      'fill': element.color || '#000000'
    });
    
    text.textContent = labelText;
    svgClasses(text).add('djs-label');
    svgAppend(parentGfx, text);
    
    return text;
  }

  function addMarker( id, options) {
    var attrs = assign({
      fill: 'black',
      strokeWidth: 1,
      strokeLinecap: 'round',
      strokeDasharray: 'none',
      labelContent: ''

    }, options.attrs);

    var ref = options.ref || { x: 0, y: 0 };
    var scale = options.scale || 1;

    // fix for safari / chrome / firefox bug not correctly
    // resetting stroke dash array
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


  //This function is used to add different shapes to the ends of connectors
  function marker(type, fill, stroke) {
    var id = type + '-' + colorEscape(fill) + '-' + colorEscape(stroke) + '-' + rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return 'url(#' + id + ')';
  }

  function createMarker(id, type, fill, stroke) {

    // this is to draw a commom arrow
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

  
  // The following functions define the shape of the element to be rendered 
  // You have to define x, y, width, height and href (this format is the same for all elements)
  // --> href is the svg element defined in svg -> index.js
  function drawBaseMeasure(element){
    var baseMeasure = svgCreate('image', {
      // Ajustamos el posicionamiento para centrar mejor la imagen
      x: 6,
      y: 4,
      // Reducimos ligeramente el tamaño para darle menos margen
      width: element.width*0.8,
      height: element.height*0.8,
      href: Svg.dataURLbaseMeasure
    })
    return baseMeasure;
  }

  function drawTarget(element){
    // Check if the parent is a PPINOT:Ppi and use mini icon if so, but same size
    var iconUrl = Svg.dataURLtarget;
    
    if (element.parent && element.parent.type === 'PPINOT:Ppi') {
      iconUrl = Svg.dataURLtargetMini;
    }
    
    var target = svgCreate('image', {
      x: 10,
      y: 5,
      width: element.width * 0.85,
      height: element.height * 0.85,
      href: iconUrl
    })
    return target;
  }

  function drawScope(element){
    // Switch between normal and mini icon based on parent
    var iconUrl = Svg.dataURLscope;
    var scaleFactor = 0.85;
    var offsetX = 10;
    var offsetY = 5;
    
    if (element.parent && element.parent.type === 'PPINOT:Ppi') {
      iconUrl = Svg.dataURLscopeMini;
      scaleFactor = 0.3; // Scale down scope mini icons to 30% of original size
      // Center the smaller icon by adjusting the offset
      offsetX = 10 + (element.width * (1 - scaleFactor)) / 2;
      offsetY = 5 + (element.height * (1 - scaleFactor)) / 2 - 5; // Ajuste adicional para subir más el icono
    }
    
    var scope = svgCreate('image', {
      x: offsetX,
      y: offsetY,
      width: element.width * scaleFactor,
      height: element.height * scaleFactor,
      href: iconUrl
    })
    return scope;
  }

  function drawAggregatedMeasure(element){
    var aggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLaggregatedMeasure
    })
    return aggregatedMeasure;
  }

  function drawTimeAggregatedMeasure(element){
    var timeAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLtimeAggregatedMeasure
    })
    return timeAggregatedMeasure;
  }

  function drawCyclicTimeAggregatedMeasure(element){
    var cyclicTimeAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcyclicTimeAggregatedMeasure
    })
    return cyclicTimeAggregatedMeasure;
  }

  function drawCountAggregatedMeasure(element){
    var countAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcountAggregatedMeasure
    })
    return countAggregatedMeasure;
  }

  function drawCountMeasure(element){
    var countMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcountMeasure
    })
    return countMeasure;
  }

  function drawTimeMeasure(element){
    var countMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLtimeMeasure
    })
    return countMeasure;
  }

  function drawCyclicTimeMeasure(element){
    var cyclicTime = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLcyclicTimeMeasure
    })
    return cyclicTime;
  }

  function drawDataAggregatedMeasure(element){
    var dataAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataAggregatedMeasure
    })
    return dataAggregatedMeasure;
  }

  function drawDataMeasure(element){
    var dataMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataMeasure
    })
    return dataMeasure;
  }

  function drawDataPropertyConditionAggregatedMeasure(element){
    var dataPropertyConditionAggregatedMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataPropertyConditionAggregatedMeasure
    })
    return dataPropertyConditionAggregatedMeasure;
  }

  function drawDataPropertyConditionMeasure(element){
    var dataPropertyConditionMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLdataPropertyConditionMeasure
    })
    return dataPropertyConditionMeasure;
  }

  function drawDerivedMultiInstanceMeasure(element){
    var derivedMultiInstanceMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLderivedMultiInstanceMeasure
    })
    return derivedMultiInstanceMeasure;
  }

  function drawDerivedSingleInstanceMeasure(element){
    var derivedSingleInstanceMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLderivedSingleInstanceMeasure
    })
    return derivedSingleInstanceMeasure;
  }

  function drawPpi(element){
    var ppi = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLppi4
    })
    return ppi;
  }

  function drawStateConditionMeasure(element){
    var stateConditionMeasure = svgCreate('image', {
      x: 0,
      y: 0,
      width: element.width,
      height: element.height,
      href: Svg.dataURLstateConditionMeasure
    })
    return stateConditionMeasure;
  }

  function drawStateConditionAggregatedMeasure(element){
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

  // After defining the functions correctly to draw each shape, we must associate each element 
  // with its corresponding function
  var renderers = this.renderers = {
    //for instance, in this case, to render 'PPINOT:Target' element, we must to use drawTarget
    'PPINOT:Target': (p, element) => {
      let target = drawTarget(element)
      svgAppend(p, target);
      renderEmbeddedLabel(p, element, 'center-middle');
      return target;
    },
    'PPINOT:Scope': (p, element) => {
      let scope = drawScope(element)
      svgAppend(p, scope);
      // Si es un elemento mini (dentro de Ppi), usar posición right-middle para activar lógica especial
      var alignment = (element.parent && element.parent.type === 'PPINOT:Ppi') ? 'right-middle' : 'center-middle';
      renderEmbeddedLabel(p, element, alignment);
      return scope;
    },
    'PPINOT:AggregatedMeasure': (p, element) => {
      let aggregatedMeasure = drawAggregatedMeasure(element)
      svgAppend(p, aggregatedMeasure);
      renderExternalLabel(p, element);
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
      renderEmbeddedLabel(p, element, 'center-middle');
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
      renderEmbeddedLabel(p, element, 'center-middle');
      return cyclicTimeAggregatedMeasure;
    },
    'PPINOT:CyclicTimeAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CountAggregatedMeasure': (p, element) => {
      let countAggregatedMeasure = drawCountAggregatedMeasure(element)
      svgAppend(p, countAggregatedMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
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
      renderEmbeddedLabel(p, element, 'center-middle');
      return countMeasure;
    },
    'PPINOT:TimeMeasure': (p, element) => {
      let timeMeasure = drawTimeMeasure(element)
      svgAppend(p, timeMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
      return timeMeasure;
    },
    'PPINOT:CyclicTimeMeasure': (p, element) => {
      let cyclicTime = drawCyclicTimeMeasure(element)
      svgAppend(p, cyclicTime);
      renderEmbeddedLabel(p, element, 'center-middle');
      return cyclicTime;
    },
    'PPINOT:BaseMeasure': (p, element) => {
      let baseMeasure = drawBaseMeasure(element)
      svgAppend(p, baseMeasure);
      renderExternalLabel(p, element);
      return baseMeasure;
    },
    'PPINOT:DataAggregatedMeasure': (p, element) => {
      let dataAggregatedMeasure = drawDataAggregatedMeasure(element)
      svgAppend(p, dataAggregatedMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
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
      renderEmbeddedLabel(p, element, 'center-middle');
      return dataMeasure;
    },
    'PPINOT:DataPropertyConditionAggregatedMeasure': (p, element) => {
      let dataPropertyConditionAggregatedMeasure = drawDataPropertyConditionAggregatedMeasure(element)
      svgAppend(p, dataPropertyConditionAggregatedMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
      return dataPropertyConditionAggregatedMeasure;
    },
    'PPINOT:DataPropertyConditionMeasure': (p, element) => {
      let dataPropertyConditionMeasure = drawDataPropertyConditionMeasure(element)
      svgAppend(p, dataPropertyConditionMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
      return dataPropertyConditionMeasure;
    },
    'PPINOT:DerivedMultiInstanceMeasure': (p, element) => {
      let derivedMultiInstanceMeasure = drawDerivedMultiInstanceMeasure(element)
      svgAppend(p, derivedMultiInstanceMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
      return derivedMultiInstanceMeasure; 
    },
    'PPINOT:StateConditionMeasure': (p, element) => {
      let stateConditionMeasure = drawStateConditionMeasure(element)
      svgAppend(p, stateConditionMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
      return stateConditionMeasure; 
    },
    'PPINOT:StateConditionAggregatedMeasure': (p, element) => {
      let stateConditionAggregatedMeasure = drawStateConditionAggregatedMeasure(element)
      svgAppend(p, stateConditionAggregatedMeasure);
      renderEmbeddedLabel(p, element, 'center-middle');
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
      renderEmbeddedLabel(p, element, 'center-middle');
      return derivedSingleInstanceMeasure; 
    },

    // You have to define the connectors (the properties of the lines)
    'PPINOT:ResourceArc': (p, element) => {
      var attrs = computeStyle(attrs, {
        stroke: element.color || BLACK, //color
        strokeWidth: 1.5, //width of the line
        markerEnd: marker('sequenceflow-end', 'white',BLACK), //marker added to the line
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
        markerStart: marker('conditional-flow-marker', 'white',BLACK),
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:GroupedBy': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        // i changed de marker name 
        markerStart: marker('conditional-flow-marker', 'white',BLACK),      
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:ToConnection': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        markerStart: marker('messageflow-start', 'black',BLACK),
        markerEnd: marker('messageflow-start', 'black',BLACK),
      };
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'PPINOT:FromConnection': (p, element) => {
      var attrs = {
        stroke: BLACK, 
        strokeWidth: 1.5, 
        strokeDasharray: [8,5],
        markerStart: marker('messageflow-start', 'white',BLACK),
        markerEnd: marker('messageflow-start', 'white',BLACK),
      };
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
      return renderExternalLabel(p, element);
    },
  };

  // Finally, you have to define the paths
  // Using this property you define and delimit the connectivity area of the element
  this.paths = {
    'PPINOT:BaseMeasure': (element) => {
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
          
      // Ajustamos las coordenadas y tamaño del path para que coincida con la imagen reducida
      var offsetX = 6; // Mismo offset que en drawBaseMeasure
      var offsetY = 4; // Mismo offset que en drawBaseMeasure
      var scaledWidth = width * 0.8; // Mismo factor que en drawBaseMeasure
      var scaledHeight = height * 0.8; // Mismo factor que en drawBaseMeasure
      
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
      
      // Para Target mini (dentro de Ppi), usar un área de selección más pequeña
      if (element.parent && element.parent.type === 'PPINOT:Ppi') {
        // Usar dimensiones similares al icono para el área seleccionable
        var scaleFactor = 0.85;
        var offsetX = 10;
        var offsetY = 5;
        var scaledWidth = width * scaleFactor;
        var scaledHeight = height * scaleFactor;
        
        var miniPath = [
          ['M', x + offsetX, y + offsetY],
          ['h', scaledWidth],
          ['v', scaledHeight],
          ['h', -scaledWidth],
          ['v', -scaledHeight],
          ['z']
        ]
        return componentsToPath(miniPath);
      }
          
      // Para Target normal, usar las dimensiones completas del elemento
      var normalPath = [
        ['M', x, y],
        ['h', width],
        ['v', height],
        ['h', -width],
        ['v', -height],
        ['z']
      ]

      return componentsToPath(normalPath);
    },

    'PPINOT:Scope': (element) => {
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
      
      // Para Scope mini (dentro de Ppi), usar un área de selección más pequeña
      if (element.parent && element.parent.type === 'PPINOT:Ppi') {
        // Usar las mismas dimensiones que el icono escalado
        var scaleFactor = 0.3;
        var offsetX = 10 + (width * (1 - scaleFactor)) / 2;
        var offsetY = 5 + (height * (1 - scaleFactor)) / 2;
        var scaledWidth = width * scaleFactor;
        var scaledHeight = height * scaleFactor;
        
        var miniPath = [
          ['M', x + offsetX, y + offsetY],
          ['h', scaledWidth],
          ['v', scaledHeight],
          ['h', -scaledWidth],
          ['v', -scaledHeight],
          ['z']
        ]
        return componentsToPath(miniPath);
      }
          
      // Para Scope normal, usar las dimensiones completas del elemento
      var normalPath = [
        ['M', x, y],
        ['h', width],
        ['v', height],
        ['h', -width],
        ['v', -height],
        ['z']
      ]

      return componentsToPath(normalPath);
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
}

inherits(PPINOTRenderer, BaseRenderer);

PPINOTRenderer.$inject = [ 'eventBus', 'styles', 'canvas', 'textRenderer' ];

PPINOTRenderer.prototype.canRender = function(element) {
  return /^PPINOT:/.test(element.type) || element.type === 'label';
};

PPINOTRenderer.prototype.drawShape = function(p, element) {
  var type = element.type;
  var h = this.renderers[type];
  
  if(element.color == null)
    element.color= "#000"

  /* jshint -W040 */
  return h(p, element);
};

PPINOTRenderer.prototype.getShapePath = function(shape) {
  var type = shape.type;
  
  // Para conexiones, tenemos que generar un path válido a partir de los waypoints
  if (isPPINOTConnection(type)) {
    // Si es una conexión PPINOT con waypoints, usarlos para generar el path
    var waypoints = shape.waypoints || [];
    if (waypoints.length < 2) {
      return 'M0,0 L0,0';
    }
    
    var connectionPath = [
      ['M', waypoints[0].x, waypoints[0].y]
    ];

    for (var i = 1; i < waypoints.length; i++) {
      connectionPath.push(['L', waypoints[i].x, waypoints[i].y]);
    }

    return componentsToPath(connectionPath);
  }
  
  // Para otros elementos, usar el path definido
  var h = this.paths[type];
  
  if (!h) {
    // Si no hay un path definido, devolver un rectángulo básico
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

PPINOTRenderer.prototype.drawConnection = function(p, element) {
  var type = element.type;
  var h = this.renderers[type];
  if(element.color == null)
    element.color= "#000"

  /* jshint -W040 */
  return h(p, element);
};

PPINOTRenderer.prototype.getConnectionPath = function(connection) {
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
