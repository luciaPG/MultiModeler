import inherits from 'inherits';

import BaseRenderer from 'diagram-js/lib/draw/BaseRenderer';
import BpmnRenderer from "bpmn-js/lib/draw/BpmnRenderer";

import {componentsToPath, createLine} from 'diagram-js/lib/util/RenderUtil';
import {query as domQuery} from 'min-dom';
import Cat from './SVGs';
import {append as svgAppend, attr as svgAttr, classes as svgClasses, create as svgCreate} from 'tiny-svg';
import {getFillColor, getSemantic, getStrokeColor} from "bpmn-js/lib/draw/BpmnRenderUtil";
import {assign} from "min-dash";
import Ids from 'ids';
import {getLabel} from "./utils/LabelUtil"
import BaseElementFactory from "diagram-js/lib/core/ElementFactory";


//this module declares what should be rendered in the editor when an object is created
//If you want to render a SVG as an element (not a connection), you should define what svg is going to be rendered, for instance in a function like this:
/*
function drawReportsTo(shape){

    var catGfx = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataReports2
    });

    return  catGfx;
  }

  Where svgCreate transforms the element to svg,using the parameter href where receives the element in base64.

  Addititonally you will have to call that function in the variable renderers when your new object appears. For example:

   'RALph:Position':(p,element) =>{
      let pos=drawPosition(element)

      svgAppend(p,pos)//svgAppend links the shape to an element
      //renderEmbeddedLabel(p,element,'center-middle')
      return pos;

    }

    And you should define a path (canvas of the object in svg coordinates) in the variable paths:

    'RALph:History-AnyInstanceInTime-Red':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

      This is important to be allowed to move objects and to regulate where the connections appears.

      Furthermore, if you want to add an internal label to an object, you should use the function "renderEmbeddedLabel(parentGfx, element, align)" in the variable renderers.
      With the option align you can define the position of the label, using some default parameters. (Apart from adding your object in the label array in Types.js)

      If you want to add an external label to an object label, you should indicate in Types.js that your elements in label and externalLabel. 
*/

var RENDERER_IDS = new Ids();//generates the ids of the elements

var COLOR_GREEN = '#52B415',
    COLOR_RED = '#cc0000',
    COLOR_YELLOW = '#ffc800',
    BLACK = '#000',
    GRAY='#807e7e',
    WHITE="#fff";


/**
 * A renderer that knows how to render RALph elements.
 */
export default function RALphRenderer(eventBus, styles, canvas, textRenderer) {

  BaseRenderer.call(this, eventBus, 2000);//forces to call this renderer, instead of calling the original renderer of bpmn.js

  var computeStyle = styles.computeStyle;

  var rendererId = RENDERER_IDS.next();

  var markers = {};

  //if you want to create a connection you will have to receive the points that delimit the connection, the source and target points.
  //If it is not a simple line, you will have to create a function with a path defining coordinates, you can preview line shapes in this page: https://yqnn.github.io/svg-path-editor/.
  //Moreover you will have to change the function getConnectionPath.

  //Additionally, you can find more information about creating connections with different shape in this link: https://forum.bpmn.io/t/bezier-curve-drawing/1130

  //This function and drawCrossedLine2 create red lines in the center of a simple connection to generate a negated connection
  function drawCrossedLine(points,attrs){
    var line = svgCreate('polyline');//it will be created a polyline
    var result='';
      //the middlepoint of the simple connection (to be negated) is calculated to put the red cross in that position.
      var middlePosition=points.length/2;
      middlePosition=Math.round(middlePosition)

      var middlePointX=(points[middlePosition].x+points[middlePosition-1].x)/2;
      var middlePointY=(points[middlePosition].y+points[middlePosition-1].y)/2;
      result +=(middlePointX-20).toString()+ ',' + (middlePointY+20).toString()+ ','+(middlePointX+20).toString()+ ',' +  parseInt(middlePointY-20).toString();
      
      svgAttr(line, {points: result });


    if (attrs) {
      svgAttr(line, attrs);
    }


    return line
  }


  function drawCrossedLine2(points,attrs){

    var line = svgCreate('polyline');
    var result='';
    
    var middlePosition;

    middlePosition=points.length/2;
    middlePosition=Math.round(middlePosition)

    var middlePointX=(points[middlePosition].x+points[middlePosition-1].x)/2;
    var middlePointY=(points[middlePosition].y+points[middlePosition-1].y)/2;

    result +=(middlePointX+20).toString()+ ',' + (middlePointY+20).toString()+ ','+(middlePointX-20).toString()+ ',' +  parseInt(middlePointY-20).toString();
    svgAttr(line, {points: result });
    

    if (attrs) {
      svgAttr(line, attrs);
    }

    return line
  }



  //function to render labels in objects.
  function renderLabel(parentGfx, label, options) {
    options = assign({
      size: {
        width: 100
      }
    }, options);

    var text = textRenderer.createText(label || '', options);//text renderer defines the text to be rendered

    svgClasses(text).add('djs-label');

    svgAppend(parentGfx, text);

    return text;
  }

  //function to render labels inside of the objects.
  function renderEmbeddedLabel(parentGfx, element, align) {
    var semantic = getSemantic(element);

    return renderLabel(parentGfx,semantic.text, {
      box: element,//size of the object text box
      align: align,//position of the text
      padding: 3,//it declares the length of a line
      style: {
        fill: element.color
      }
    });
  }

  //function to render the labels of the history connectors in certain time:
  function renderEmbeddedLabelHistoryAnyInTime(parentGfx, element, align,size,weight) {
    var semantic = getSemantic(element);

    return renderLabel(parentGfx,semantic.text, {
      box: element,
      align: align,
      padding:35,
      style: {
        fill: element.color,
        fontSize:  size + 'px',//it declares the size of the letters
        fontWeight: weight //it declares the thickness of the letters
      }
    });
  }

  function renderExternalLabel(parentGfx, element) {
    var box = {
      width: 90,
      height: 10,
      x: element.width / 2, //+ element.x,
      y: element.height /2 //+ element.y
    };
    return renderLabel(parentGfx, getLabel(element), {
      box: box,
      fitBox: true,
      style: assign(
          {},
          textRenderer.getExternalStyle(),
          {
            fill: element.color
          }
      )
    });
  }

  
  

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

  //with this function, diverse shapes can be added to a connection (for instance an arrow),
  //To add a marker to a function, you have to call this function as a the value of markerStart or markerEnd in the computeStyle variable of an element 
  function marker(type, fill, stroke) {
    var id = type + '-' + colorEscape(fill) + '-' + colorEscape(stroke) + '-' + rendererId;

    if (!markers[id]) {
      createMarker(id, type, fill, stroke);
    }

    return 'url(#' + id + ')';
  }

  //the shapes that can be added to a connection are declared in svg coordinates
  function createMarker(id, type, fill, stroke) {


    if (type === 'sequenceflow-end') {
      var sequenceflowEnd = svgCreate('path');
      svgAttr(sequenceflowEnd, { d: 'M 1 5 L 11 10 L 1 15 Z' });

      addMarker(id, {
        element: sequenceflowEnd,
        ref: { x: 11, y: 10 },
        scale: 1.5,
        attrs: {
          fill: stroke,
          stroke: stroke
        }
      });
    }

    if (type === 'timedistance-start') {
      var sequenceflowEnd = svgCreate('path');
      svgAttr(sequenceflowEnd, { d: 'M -10 -5 L 20 10 L -10 25 L 20 10  Z' });

      addMarker(id, {
        element: sequenceflowEnd,
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

    if (type === 'timedistance-end') {
      var sequenceflowEnd = svgCreate('path');
      svgAttr(sequenceflowEnd, { d: 'M 35 0 L 0 15 L 35 30 L 0 15  Z' });

      addMarker(id, {
        element: sequenceflowEnd,
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
    if(type === "doubleArrow"){
      var dobleFlecha=svgCreate('path');
     
      svgAttr(dobleFlecha,{d:'M 0 0 L 3 3 L 0 6 M 3 6 L 6 3 L 3 0'}); 
      addMarker(id, {
        element: dobleFlecha,
        attrs: {
          fill:stroke,
          stroke: stroke
        },
        ref: {x:6,y:3},
        scale: 3
      });

    }

    if(type === "simpleArrow"){
      var simpleFlecha=svgCreate('path');
     
      svgAttr(simpleFlecha,{d:'M 0 0 L 3 3 M 3 3 L 0 6'});
  
      addMarker(id, {
        element: simpleFlecha,
        attrs: {
          stroke: stroke
        },
        ref: {x:3,y:3},
        scale: 3
      });

    }

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

    if (type === 'history-source-another-start') {
      var messageflowStart = svgCreate('circle');
      svgAttr(messageflowStart, { cx: 6, cy: 6, r: 5.5 });

      addMarker(id, {
        element: messageflowStart,
        attrs: {
          fill:WHITE,
          stroke: stroke
        },
        scale:2.5,
        ref: { x: 7, y: 7 }
      });
    }


    if (type === 'history-source-another-end') {
      var messageflowStart = svgCreate('circle');
      svgAttr(messageflowStart, { cx: 6, cy: 6, r: 3.5 });

      addMarker(id, {
        element: messageflowStart,
        attrs: {
          fill:BLACK,
          stroke: stroke
        },
        ref: { x: 6, y: 6 }
      });
    }

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



    if(type === "negated"){
      var dobleFlecha=svgCreate('path');
      //var dpath='';
      
      var zero=parseInt('0');
      var ten=parseInt('10');
      var x1=parseInt(x)
      var x2=parseInt(x2)
      var y1=parseInt(y1)
      var y2=parseInt(y2)

      var dpath='M '+zero+' '+zero+' L '+ten+' '+ten+' M '+ten+' '+zero+' L '+zero+' '+ ten

      svgAttr(dobleFlecha,{d:dpath,orient:'auto'});
      addMarker(id, {
        element: dobleFlecha,
        attrs: {
          stroke: 'red'
        },
        ref: {x:90 , y:5}, //{ x: 50, y: 5},
        orient:'auto',
        scale: 4.0
      });

    }

    if(type === "negated2"){
      var dobleFlecha=svgCreate('path');
     
      svgAttr(dobleFlecha,{d:'M 10 0 L 0 10',orient:'auto'});
     
      addMarker(id, {
        element: dobleFlecha,
        attrs: {
          stroke: 'red'
        },
        ref: { x: -100, y: 5},
        orient:'auto',
        scale: 0.5
      });
    }
  }

  

  //these functions define the shape to be rendered, adding the svgs as a href:

  function drawDataField(shape){

    var catGfx = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataField
    });

    return  catGfx;
  }

  function drawReportsTo(shape){

    var catGfx = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataReports2
    });

    return  catGfx;
  }

  

  function drawPosition(shape){

    var pos = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataPositionDef
    });

    return pos;
  }

  function drawAND(shape){
    var AND = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataAND
    });

    return AND;
  }

  function drawOR(shape){
    var OR = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataOR
    });

    return OR;
  }

  function drawPerson(shape){
    var person = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.personDef
    });

    return  person;
  }

  function drawDelegateTo(shape){
    var delegate = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataCanDelegate2
    });

    return delegate;
  }

  function drawRoleRALph(shape){
    var role = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataRoleDef
    });

    return role;
  }

  function drawPersoncap(shape){
    var cap = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataCapabilityDef
    });

    return cap;
  }
  function drawHistoryAnyRedConnector(shape){
    var hist = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistoryAnyRed
    });

    return hist;

  }

  function drawHistoryAnyGreenConnector(shape){
    var hist = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistoryAnyGreen
    });

    return hist;

  }

  function drawHistorySameGreenConnector(shape){
    var hist = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistorySameGreen
    });

    return hist;

  }

  function drawHistorySameRedConnector(shape){
    var hist = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistorySameRed
    });

    return hist;

  }

  function drawHistoryAnyInTimeConnectorGreen(shape){

    var historyAnyInTime = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistoryAnyInstanceInTimeGreen
    });

    return historyAnyInTime;
  }

  function drawHistoryAnyInTimeConnectorRed(shape){

    var historyAnyInTime = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistoryAnyInstanceInTimeRed
    });

    return historyAnyInTime;
  }

  function drawOrgunit(shape){
    var org = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataOrgUnitDef
    });

    return org;
  }

  function drawHistorySameConnector(shape){
    var org = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistorySame
    });

    return org;
  }

  function drawHistoryAnyConnector(shape){
    var org = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataHistoryAny
    });

    return org;
  }

  function drawReportsDirectly(shape){
    var reportsDirectly = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataReportsDirectly
    });

    return reportsDirectly;
  }

  function drawDelegatesDirectly(shape){
    var delegatesDirectly = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataDelegatesDirectly
    });

    return delegatesDirectly;
  }

  function drawDelegatesTransitively(shape){

    var delegatesTransitively = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataDelegatesTransitively
    });

    return delegatesTransitively;
  }

  function drawReportsTransitively(shape){

    var reportsTransitively = svgCreate('image', {
      x: 0,
      y: 0,
      width: shape.width,
      height: shape.height,
      href:Cat.dataReportsTransitively
    });

    return reportsTransitively;
  }

 
  //this property determines which shape must be rendered depending on the object.
   this.renderers = {
    
    'RALph:Position':(p,element) =>{
      let pos=drawPosition(element)

      svgAppend(p,pos)//svgAppend links the shape to an element

      return pos;

    },'RALph:Complex-Assignment-OR':(p,element)=>{
      let OR=drawOR(element)

      svgAppend(p,OR)

      return OR;

    
    },'RALph:Complex-Assignment-AND':(p,element)=>{
      let AND=drawAND(element)

      svgAppend(p,AND)

      return AND;


    },'RALph:reportsDirectly':(p,element)=>{

      let reportsDirectly=drawReportsDirectly(element);
      svgAppend(p,reportsDirectly);
      renderEmbeddedLabel(p,element,'center-middle')
      return reportsDirectly;

    },'RALph:reportsTransitively':(p,element)=>{

      let reportsTransitively=drawReportsTransitively(element);
      svgAppend(p,reportsTransitively);
      renderEmbeddedLabel(p,element,'center-middle')
      return reportsTransitively;

    },'RALph:delegatesDirectly':(p,element)=>{

      let delegatesDirectly=drawDelegatesDirectly(element);
      svgAppend(p,delegatesDirectly);
      return delegatesDirectly;

    },'RALph:delegatesTransitively':(p,element)=>{

      let delegatesTransitively=drawDelegatesTransitively(element);
      svgAppend(p,delegatesTransitively);
      return delegatesTransitively;
      
    },'RALph:Orgunit':(p,element) =>{
      let org=drawOrgunit(element)

      svgAppend(p,org)
      

      return org;

    },'RALph:Personcap':(p,element) =>{
      let cap=drawPersoncap(element)
      
      svgAppend(p,cap)

      return cap;

    },'RALph:Person':(p,element)=>{
        let person=drawPerson(element)
        
        svgAppend(p,person)
        return person;

    },'RALph:RoleRALph':(p,element)=>{
        let role=drawRoleRALph(element)

        svgAppend(p,role)
        return role;

    },'RALph:History-Same':(p,element)=>{
      let connector=drawHistorySameConnector(element)

      
      svgAppend(p,connector)
      return connector;

    },'RALph:History-Any':(p,element)=>{
      let connector2=drawHistoryAnyConnector(element)

      
      svgAppend(p,connector2)
      return connector2;

    },'RALph:History-Any-Red':(p,element)=>{
      let connector2=drawHistoryAnyRedConnector(element)

      svgAppend(p,connector2)
      return connector2;

    },
    'RALph:History-Any-Green':(p,element)=>{
      let connector2=drawHistoryAnyGreenConnector(element)

      svgAppend(p,connector2)
      return connector2;

    },'RALph:History-Same-Green':(p,element)=>{
      let connector2=drawHistorySameGreenConnector(element)

      svgAppend(p,connector2)
      return connector2;

    },'RALph:History-Same-Red':(p,element)=>{
      let connector2=drawHistorySameRedConnector(element)

      svgAppend(p,connector2)
      return connector2;

    },'RALph:History-AnyInstanceInTime-Green':(p,element)=>{
      let HistoryAnyInTimeConnector=drawHistoryAnyInTimeConnectorGreen(element)

      renderEmbeddedLabelHistoryAnyInTime(p,element,'center-middle')//10
      svgAppend(p,HistoryAnyInTimeConnector)
      return HistoryAnyInTimeConnector;

    },'RALph:History-AnyInstanceInTime-Red':(p,element)=>{
      let HistoryAnyInTimeConnector=drawHistoryAnyInTimeConnectorRed(element)

      renderEmbeddedLabelHistoryAnyInTime(p,element,'center-middle')//10
      svgAppend(p,HistoryAnyInTimeConnector)
      return HistoryAnyInTimeConnector;

    },'RALph:DelegateTo':(p,element)=>{
      let delegate=drawDelegateTo(element)
      
      svgAppend(p,delegate)
      return delegate;

    },'RALph:reportsTo':(p,element)=>{
      let report = drawReportsTo(element);

      svgAppend(p,report)
      return report;

    },'RALph:ResourceArc': (p, element) => {

      //with computeStyle you can modify properties of the lines
      // strokeWidth: width of the line
      // strokeDasharray: [10,7] -> makes a line dashed

      var attrs = computeStyle(attrs, {
        stroke:BLACK,//-> PARA EL COLOR
        strokeWidth: 0.5,
        //strokedashoffset: 153,
        //markerStart: marker('history-source-another-start', 'white',BLACK),
        //markerBetween: marker('history-source-another-end', 'white',BLACK),
      });
      

      return svgAppend(p, createLine(element.waypoints, attrs));

    },

    'RALph:dataField':(p,element)=>{
      let dataField=drawDataField(element);

      svgAppend(p,dataField);

      return dataField;

    },
      'RALph:negatedAssignment': (p, element) => {
      
      var attrs = {
        strokeLinejoin: 'round',
        stroke: element.color || COLOR_RED,
        strokeWidth: 0.5,
      };

      var attrs2 = {
        strokeLinejoin: 'round',
        stroke: COLOR_RED,
        strokeWidth: 1,
      };

      svgAppend(p, drawCrossedLine(element.waypoints,attrs2));
      svgAppend(p, drawCrossedLine2(element.waypoints,attrs2));

      
      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'RALph:simpleArrow':(p, element)=>{
      var attrs = {
        strokeLinejoin: 'round',
        markerEnd: marker('sequenceflow-end', 'white',GRAY),
        stroke: GRAY,
        strokeWidth: 0.5,
        //strokeDasharray: [8,5]
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    }, 
    'RALph:doubleArrow':(p,element)=>{
      var attrs = {
        strokeLinejoin: 'round',
        markerEnd: marker('doubleArrow', 'white',GRAY),
        stroke: GRAY,
        strokeWidth: 0.5,
        //strokeDasharray: [8,5]
      };
      
      return svgAppend(p, createLine(element.waypoints, attrs));

    }
    
    ,'RALph:solidLine':(p,element)=>{
      var attrs = {
        stroke: element.color || BLACK,
        strokeWidth: 0.5,
        strokeLinejoin: 'round',
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'RALph:solidLineWithCircle':(p,element)=>{
      var attrs = {
        strokeLinejoin: 'round',
        stroke: BLACK,
        strokeWidth: 0.5,
        markerEnd: marker('history-source-another-start', 'white',BLACK),
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'RALph:dashedLine':(p,element)=>{
      var attrs = {
        strokeLinejoin: 'round',
        stroke: element.color || BLACK,
        strokeWidth: 0.5,
        strokeDasharray: [8,5],
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'RALph:dashedLineWithCircle':(p,element)=>{
      var attrs = {
        strokeLinejoin: 'round',
        stroke: element.color || BLACK,
        strokeWidth: 0.5,
        strokeDasharray: [8,5],
        markerEnd: marker('history-source-another-start', 'white',BLACK),
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'RALph:ConsequenceFlow': (p, element) => {
      var attrs = {
        strokeLinejoin: 'round',
        markerEnd: marker('sequenceflow-end', 'white', element.color),
        stroke: element.color || BLACK,
        strokeWidth: 0.5,
        //strokeDasharray: [8,5]
      };

      return svgAppend(p, createLine(element.waypoints, attrs));
    },
    'label': (p, element) => {
      return renderExternalLabel(p, element);
    },
  };

  /*
   function getConnectionPath(connection) {
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
   }*/

   //this property determines the area of connectivity in a shape:
   this.paths = {
    'RALph:ResourceArc':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
          

      var d = [
        ['M', x , y],
        ['h', 50 ],
        ['v', 50 ],
        ['h', -50 ],
        ['v', -50 ],
        ['z']
      ]

      return componentsToPath(d);
    },'RALph:negatedAssignment':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
          

      var d = [
        ['M', x , y],
        ['h', 60 ],
        ['v', 90 ],
        ['h', -50 ],
        ['v', -50 ],
        ['z']
      ]

      return componentsToPath(d);
    },'RALph:Rolecap':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
          

      var d = [
        ['M', x , y],
        ['h', 50 ],
        ['v', 50 ],
        ['h', -50 ],
        ['v', -50 ],
        ['z']
      ]

      return componentsToPath(d);
    },'RALph:RoleRALph':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height;
          

      var borderRadius = 20;

      var roundRectPath = [
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

      return componentsToPath(roundRectPath);


    },'RALph:DelegateTo':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height,
          borderRadius=20;
      
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
    'RALph:reportsTo':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height,
          borderRadius=20;
      
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
    'RALph:Position':(element)=>{
      var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height,
          borderRadius=20;

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

    },'RALph:Orgunit':(element) =>{
      var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height,
        borderRadius=20;
        
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

  },'RALph:Personcap':(element) =>{
        var x = element.x,
          y = element.y,
          width = element.width,
          height = element.height,
          borderRadius=20;

          
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

    },'RALph:Person':(element)=>{
        var x = element.x,
        y = element.y,
        width = element.width,
        height = element.height,
        borderRadius=20;
        
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

    },'RALph:History-Same':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;

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

  },'RALph:History-Any':(element)=>{
    var x = element.x,
    y = element.y,
    width = element.width,
    height = element.height,
    borderRadius=30;
    
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
},'RALph:dataField':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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
    },
    'RALph:History-Same-Red':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

    },'RALph:History-Same-Green':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

    },'RALph:History-Any-Green':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

    },'RALph:History-Any-Red':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

    },'RALph:History-AnyInstanceInTime-Green':(element)=>{
      
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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



    },'RALph:History-AnyInstanceInTime-Red':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;
    
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

    },'RALph:Complex-Assignment-OR':(element)=>{
      var width = element.width,
      height = element.height,
      x = element.x,
      y = element.y,
      halfWidth = width / 2,
      halfHeight = height / 2;

      var diamondPath = [
        ['M', x + halfWidth, y],
        ['l', halfWidth, halfHeight],
        ['l', -halfWidth, halfHeight],
        ['l', -halfWidth, -halfHeight],
        ['z']
      ];

      return componentsToPath(diamondPath);

    
    },'RALph:Complex-Assignment-AND':(element)=>{
      /*var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=10;
    
     
      var d = [
        ['M', x , y],
        ['h', 50 ],
        ['v', 50 ],
        ['h', -50 ],
        ['v', -50 ],
        ['z']
      ]*/
      var width = element.width,
      height = element.height,
      x = element.x,
      y = element.y,
      halfWidth = width / 2,
      halfHeight = height / 2;

      var diamondPath = [
        ['M', x + halfWidth, y],
        ['l', halfWidth, halfHeight],
        ['l', -halfWidth, halfHeight],
        ['l', -halfWidth, -halfHeight],
        ['z']
      ];

      return componentsToPath(diamondPath);

    },'RALph:reportsDirectly':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;

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

    },'RALph:reportsTransitively':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;

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

    },'RALph:delegatesDirectly':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;

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

    },'RALph:delegatesTransitively':(element)=>{
      var x = element.x,
      y = element.y,
      width = element.width,
      height = element.height,
      borderRadius=30;

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

    }
  }
}

inherits(RALphRenderer, BaseRenderer);

//RALphRenderer.$inject = [ 'eventBus', 'styles', 'canvas', 'textRenderer' ];
RALphRenderer.$inject = [ 'eventBus', 'styles', 'canvas', 'textRenderer' ];

RALphRenderer.prototype.canRender = function(element) {
  return (/^RALph:/.test(element.type) || element.type === 'label') //|| (/^persons:/.test(element.type) || element.type === 'label') 
};

RALphRenderer.prototype.drawShape = function(p, element) {
  var type = element.type;
  var h = this.renderers[type];
  if(element.color == null)
    element.color= "#000"

  /* jshint -W040 */
  return h(p, element);
};

RALphRenderer.prototype.getShapePath = function(shape) {

  var type = shape.type;
  var h = this.paths[type];

  /* jshint -W040 */
  return h(shape);
};

RALphRenderer.prototype.drawConnection = function(p, element) {
  var type = element.type;
  var h = this.renderers[type];

  if(element.color == null)
    element.color='#000';
  /* jshint -W040 */
  return h(p, element);
};

RALphRenderer.prototype.getConnectionPath = function(connection) {
  // var type = connection.type;
  // var h = this.paths[type];
  //
  // /* jshint -W040 */
  // return h(connection);
  
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
