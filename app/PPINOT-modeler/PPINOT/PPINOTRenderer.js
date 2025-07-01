import {componentsToPath, createLine} from 'diagram-js/lib/util/RenderUtil';
import {append as svgAppend, create as svgCreate} from 'tiny-svg';
import {isPPINOTConnection} from "./Types";
import Svg from './svg';

var BLACK = '#000';

/**
 * A renderer that knows how to render PPINOT elements.
 * 
 * This module is used to declarate which elements will be created in the diagram when you 
 * drag an element of the palette. It is only for PPINOT elements, not bpmn elements.
 */
export default function PPINOTRenderer(eventBus, styles, canvas, textRenderer) {
  // No need to call BaseRenderer.call, we'll use this as a composition helper

  var computeStyle = styles.computeStyle;

  // Store reference to this for use in inner functions
  var self = this;

  var markers = {};
  var rendererId = this.rendererId = 'ppinot-' + (Math.random() * 1000000 | 0);

  function colorEscape(str) {
    return str.replace(/[()\s,#]+/g, '_');
  }

  // This function is used to add different shapes to the ends of connectors
  function marker(type, fill, stroke) {
    var id = type + '-' + colorEscape(fill) + '-' + colorEscape(stroke) + '-' + rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return 'url(#' + id + ')';
  }

  function addMarker(id, options) {
    var marker = svgCreate('marker', {
      id: id,
      viewBox: '0 0 20 20',
      refX: options.refX || 0,
      refY: options.refY || 0,
      markerWidth: options.markerWidth || 10,
      markerHeight: options.markerHeight || 10,
      orient: 'auto'
    });

    var shape = svgCreate(options.element || 'path', options.attrs);
    svgAppend(marker, shape);

    var defs = document.querySelector('defs') || svgCreate('defs');
    svgAppend(defs, marker);

    if (!document.querySelector('defs')) {
      svgAppend(document.querySelector('svg'), defs);
    }

    markers[id] = marker;
  }

  function createMarker(id, type, fill, stroke) {
    if (type === 'sequenceflow-end') {
      addMarker(id, {
        element: 'polygon',
        attrs: {
          fill: fill,
          stroke: stroke,
          points: '0,6 0,10 8,6 0,2 0,6'
        },
        refX: 8,
        refY: 6,
        markerWidth: 10,
        markerHeight: 10
      });
    } else if (type === 'conditional-flow-marker') {
      addMarker(id, {
        element: 'polygon',
        attrs: {
          fill: fill,
          stroke: stroke,
          points: '7,4 0,6 7,8'
        },
        refX: 7,
        refY: 6,
        markerWidth: 10,
        markerHeight: 10
      });
    } else if (type === 'messageflow-start') {
      addMarker(id, {
        element: 'circle',
        attrs: {
          fill: fill,
          stroke: stroke,
          r: 4,
          cx: 4,
          cy: 4
        },
        refX: 4,
        refY: 4,
        markerWidth: 8,
        markerHeight: 8
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
    // Check if the parent is a PPINOT:Ppi and use mini icon if so
    var iconUrl = Svg.dataURLtarget;
    var scaleFactor = 1;
    var offsetX = 10;
    var offsetY = 5;
    
    if (element.parent && element.parent.type === 'PPINOT:Ppi') {
      iconUrl = Svg.dataURLtargetMini;
      scaleFactor = 0.4; // Scale down target mini icons to 50% of original size
      // Center the smaller icon by adjusting the offset
      offsetX = 10 + (element.width * (1 - scaleFactor)) / 2;
      offsetY = 5 + (element.height * (1 - scaleFactor)) / 2;
    }
    
    var target = svgCreate('image', {
      x: offsetX,
      y: offsetY,
      width: element.width * scaleFactor,
      height: element.height * scaleFactor,
      href: iconUrl
    })
    return target;
  }

  function drawScope(element){
    // Check if the parent is a PPINOT:Ppi and use mini icon if so
    var iconUrl = Svg.dataURLscope;
    var scaleFactor = 1;
    var offsetX = 10;
    var offsetY = 5;
    
    if (element.parent && element.parent.type === 'PPINOT:Ppi') {
      iconUrl = Svg.dataURLscopeMini;
      scaleFactor = 0.7; // Scale down scope mini icons to 70% of original size
      // Center the smaller icon by adjusting the offset
      offsetX = 10 + (element.width * (1 - scaleFactor)) / 2;
      offsetY = 5 + (element.height * (1 - scaleFactor)) / 2;
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
      self.renderEmbeddedLabel(p, element, 'center-middle'); // label will be added to the element using this function
      return target;
    },
    'PPINOT:Scope': (p, element) => {
      let scope = drawScope(element)
      svgAppend(p, scope);
      self.renderEmbeddedLabel(p, element, 'center-middle');
      return scope;
    },
    'PPINOT:AggregatedMeasure': (p, element) => {
      let aggregatedMeasure = drawAggregatedMeasure(element)
      svgAppend(p, aggregatedMeasure);
      return aggregatedMeasure;
    },
    'PPINOT:AggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:AggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:AggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:AggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:AggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:AggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:AggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:AggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:TimeAggregatedMeasure': (p, element) => {
      let timeAggregatedMeasure = drawTimeAggregatedMeasure(element)
      svgAppend(p, timeAggregatedMeasure);
      return timeAggregatedMeasure;
    },
    'PPINOT:TimeAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:TimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:TimeAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:TimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:TimeAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:TimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:TimeAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:TimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeAggregatedMeasure': (p, element) => {
      let cyclicTimeAggregatedMeasure = drawCyclicTimeAggregatedMeasure(element)
      svgAppend(p, cyclicTimeAggregatedMeasure);
      return cyclicTimeAggregatedMeasure;
    },
    'PPINOT:CyclicTimeAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CyclicTimeAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CyclicTimeMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CyclicTimeMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CyclicTimeMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CyclicTimeMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'top', '\xa0\xa0\xa0\xa0\xa0'+'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CountAggregatedMeasure': (p, element) => {
      let countAggregatedMeasure = drawCountAggregatedMeasure(element)
      svgAppend(p, countAggregatedMeasure);
      return countAggregatedMeasure;
    },
    'PPINOT:CountAggregatedMeasureSUM': (p, element) => {
      var sum = renderer('PPINOT:CountAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:CountAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:CountAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:CountAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:CountAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:CountAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:CountAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:CountMeasure': (p, element) => {
      let countMeasure = drawCountMeasure(element)
      svgAppend(p, countMeasure);
      // Note: CountMeasure SVG already contains visual representation, no additional label needed
      return countMeasure;
    },
    'PPINOT:TimeMeasure': (p, element) => {
      let timeMeasure = drawTimeMeasure(element)
      svgAppend(p, timeMeasure);
      // Note: TimeMeasure SVG already contains visual representation, no additional label needed
      return timeMeasure;
    },
    'PPINOT:CyclicTimeMeasure': (p, element) => {
      let cyclicTime = drawCyclicTimeMeasure(element)
      svgAppend(p, cyclicTime);
      // Note: CyclicTimeMeasure SVG already contains visual representation, no additional label needed
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
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'SUM', 15, 'bold');
      return sum;
    },
    'PPINOT:DataAggregatedMeasureMAX': (p, element) => {
      var max = renderer('PPINOT:DataAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MAX', 15, 'bold');
      return max;
    },
    'PPINOT:DataAggregatedMeasureMIN': (p, element) => {
      var min = renderer('PPINOT:DataAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'MIN', 15, 'bold');
      return min;
    },
    'PPINOT:DataAggregatedMeasureAVG': (p, element) => {
      var avg = renderer('PPINOT:DataAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', 'AVG', 15, 'bold');
      return avg;
    },
    'PPINOT:DataMeasure': (p, element) => {
      let dataMeasure = drawDataMeasure(element)
      svgAppend(p, dataMeasure);
      // Note: DataMeasure SVG already contains visual representation, no additional label needed
      return dataMeasure;
    },
    'PPINOT:DataPropertyConditionAggregatedMeasure': (p, element) => {
      let dataPropertyConditionAggregatedMeasure = drawDataPropertyConditionAggregatedMeasure(element)
      svgAppend(p, dataPropertyConditionAggregatedMeasure);
      self.renderEmbeddedLabel(p, element, 'center-middle');
      return dataPropertyConditionAggregatedMeasure;
    },
    'PPINOT:DataPropertyConditionMeasure': (p, element) => {
      let dataPropertyConditionMeasure = drawDataPropertyConditionMeasure(element)
      svgAppend(p, dataPropertyConditionMeasure);
      self.renderEmbeddedLabel(p, element, 'center-middle');
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
      // Note: StateConditionMeasure SVG already contains visual representation, no additional label needed
      return stateConditionMeasure; 
    },
    'PPINOT:StateConditionAggregatedMeasure': (p, element) => {
      let stateConditionAggregatedMeasure = drawStateConditionAggregatedMeasure(element)
      svgAppend(p, stateConditionAggregatedMeasure);    
      return stateConditionAggregatedMeasure; 
    },
    'PPINOT:StateCondAggMeasureNumber': (p, element) => {
      var number = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', '#', 30);
      return number; 
    },
    'PPINOT:StateCondAggMeasurePercentage': (p, element) => {
      var percentage = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', '%', 30);
      return percentage; 
    },
    'PPINOT:StateCondAggMeasureAll': (p, element) => {
      var all = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', '∀', 30); 
      return all; 
    },
    'PPINOT:StateCondAggMeasureAtLeastOne': (p, element) => {
      var one = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', '∃', 30);    
      return one; 
    },
    'PPINOT:StateCondAggMeasureNo': (p, element) => {
      var no = renderer('PPINOT:StateConditionAggregatedMeasure')(p, element); 
      self.renderEmbeddedDefaultLabel(p, element, 'center-middle', '∄', 30);    
      return no; 
    },
    'PPINOT:Ppi': (p, element) => {
      let ppi = drawPpi(element)
      svgAppend(p, ppi);
      // Note: PPI images already contain visual representation, no additional label needed
      return ppi; 
    },
    'PPINOT:DerivedSingleInstanceMeasure': (p, element) => {
      let derivedSingleInstanceMeasure = drawDerivedSingleInstanceMeasure(element)
      svgAppend(p, derivedSingleInstanceMeasure);
      self.renderEmbeddedLabel(p, element, 'center-middle');
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
      return self.renderExternalLabel(p, element);
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
          
      // Usamos las dimensiones completas del elemento para el área seleccionable
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
          
      // Usamos las dimensiones completas del elemento para el área seleccionable
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
    // Define paths for other element types using similar structure
    // Each element type should have a path definition that matches its visual bounds
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
  // Define methods as instance properties
  this.canRender = function(element) {
    return /^PPINOT:/.test(element.type) || element.type === 'label';
  };

  this.drawShape = function(p, element) {
    var type = element.type;
    var h = renderers[type];
    
    if(element.color == null)
      element.color= "#000"

    /* jshint -W040 */
    return h(p, element);
  };

  this.getShapePath = function(shape) {
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
    
    // Para otros elementos, devolver un rectángulo básico
    var x = shape.x || 0;
    var y = shape.y || 0;
    var width = shape.width || 50;
    var height = shape.height || 50;
    
    return 'M' + x + ',' + y + 
           ' L' + (x + width) + ',' + y + 
           ' L' + (x + width) + ',' + (y + height) + 
           ' L' + x + ',' + (y + height) + 
           ' Z';
  };

  this.drawConnection = function(p, element) {
    var type = element.type;
    var h = renderers[type];
    if(element.color == null)
      element.color= "#000"

    /* jshint -W040 */
    return h(p, element);
  };

  this.getConnectionPath = function(connection) {
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
}
