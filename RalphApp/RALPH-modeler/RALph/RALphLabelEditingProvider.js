import {
    assign
} from 'min-dash';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import {
    getLabel,
    getExternalLabelMid,
    isLabelExternal,
    hasExternalLabel,
    isLabel
} from './utils/LabelUtil';

import { directEdit, label} from "./Types";

import LabelEditingProvider from "bpmn-js/lib/features/label-editing/LabelEditingProvider";

//this module defines how the edition of labels works, for instance, adding the possibility to create default labels

export default function RALphLabelEditingProvider(
    eventBus, canvas, directEditing,
    modeling, resizeHandles, textRenderer) {

    this._canvas = canvas;
    this._modeling = modeling;
    this._textRenderer = textRenderer;

    directEditing.registerProvider(this);

    // listen to dblclick on non-root elements
    eventBus.on('element.dblclick', function(event) {
        activateDirectEdit(event.element, true);
    });

    // complete on followup canvas operation
    eventBus.on([
        'element.mousedown',
        'drag.init',
        'canvas.viewbox.changing',
        'autoPlace',
        'popupMenu.open',

    ], function(event) {

        if (directEditing.isActive()) {
            directEditing.complete();
        }
    });

    // cancel on command stack changes
    eventBus.on([ 'commandStack.changed' ], function(e) {
        if (directEditing.isActive()) {
            directEditing.cancel();
        }
    });
    
    eventBus.on(['commandStack.shape.create.postExecute'/*connection.create.preExecute'*/], function(event) {
        /*var element = e.context.shape;

        if (is(element, 'bpmn:Task')) {
          // when the shape is a task, set custom text
          element.businessObject.name = 'custom text';
        }*/
        
        var shape = event.context.shape;
        //console.log(shape);

        if(is(shape,"bpmn:Task")){
            shape.businessObject.name="";
        }
      
      });

      /*eventBus.on(['commandStack.label.create.preExecute'],500,function(event){
        var context = event.context,
        element = context.shape,
        businessObject,
        di;

        businessObject = element.businessObject,
        di = businessObject.di;
        var canvas = this._canvas;

        
        var bbox = canvas.getAbsoluteBBox(target);
    
        var mid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
        };

        // we want to trigger on BPMN elements only
        if (isAny(element.labelTarget || element, ['RALph:reportsDirectly'])) {
            assign(di.label.bounds, {
                width:50,
                height:20,
                x: mid.x-50,
                y: mid.y-30 
                });
        
        return;
        }

       

      })*/
    
      eventBus.on(['commandStack.connection.create.preExecute'],500, function(event) {
        /*    var element = e.context.shape;

        if (is(element, 'bpmn:Task')) {
          // when the shape is a task, set custom text
          element.businessObject.name = 'custom text';
        }*/
        //console.log("entra aqui: label editing provider");
        var connection = event.context.connection;
        //console.log(event.context)
        if(is(connection,"bpmn:SequenceFlow")){
            //console.log("entra aqui: label editing provider1");
            connection.businessObject.name="";
        }else if(connection.type ==="RALph:ResourceArc"){
            //console.log(connection);
            //console.log("entra aqui: label editing provider2");
            //connection.businessObject.text="prueba";
            connection.businessObject.name="";
            activateDirectEdit(connection);
            //activateDirectEdit(event.context.connection,true);
        }
      
      });


    eventBus.on('directEditing.activate', function(event) {
        resizeHandles.removeResizers();
    });

    eventBus.on('create.end', 500, function(event) {

        var context = event.context,
            element = context.shape,
            canExecute = event.context.canExecute,
            isTouch = event.isTouch;

        // TODO(nikku): we need to find a way to support the
        // direct editing on mobile devices; right now this will
        // break for desworkflowediting on mobile devices
        // as it breaks the user interaction workflow

        // TODO(nre): we should temporarily focus the edited element
        // here and release the focused viewport after the direct edit
        // operation is finished
        if (isTouch) {
            return;
        }

        if (!canExecute) {
            return;
        }

        if (context.hints && context.hints.createElementsBehavior === false) {
            return;
        }

        activateDirectEdit(element);
    });

    /*eventBus.on('autoPlace.end', 500, function(event) {
        activateDirectEdit(event.context.connection);
    });*/

    eventBus.on('autoPlace.end', 500, function(event) {

        activateDirectEdit(event.shape);
        //activateDirectEdit(event.context.connection);
    });

    function activateDirectEdit(element, force) {
        let types = [
            'bpmn:Task',
            'bpmn:TextAnnotation',
            'bpmn:Group',
            
        ].concat(directEdit)
        //console.log(directEdit)
        if (force ||
            isAny(element, types) ||
            isCollapsedSubProcess(element)|| element.type==='RALph:ResourceArc') {
            //console.log("bingo")
            directEditing.activate(element);
        }
    }

}

RALphLabelEditingProvider.$inject = [
    'eventBus',
    'canvas',
    'directEditing',
    'modeling',
    'resizeHandles',
    'textRenderer'
];

/**
 * Activate direct editing for activities and text annotations.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Object} an object with properties bounds (position and size), text and options
 */
RALphLabelEditingProvider.prototype.activate = function(element) {

    // text
    let text = getLabel(element);

    // CUSTOM
    if(isAny(element, label) && !text)
        text = '';
    //END_CUSTOM



    if (text === undefined) {
        return;
    }

    var context = {
        text: text
    };

    // bounds
    var bounds = this.getEditingBBox(element);

    assign(context, bounds);

    var options = {};

    // tasks
    if (
        isAny(element, [
            'bpmn:Task',
            'bpmn:Participant',
            'bpmn:Lane',
            'bpmn:CallActivity',
            "RALph:ResourceArc"
            //CUSTOM
            //'RALph:resource' // interni?
        ]) ||
        isCollapsedSubProcess(element)
    ) {
        assign(options, {
            centerVertically: true
        });
    }

    // external labels
    if (isLabelExternal(element)) {
        assign(options, {
            autoResize: true
        });
    }

    // text annotations
    if (is(element, 'bpmn:TextAnnotation')) {
        assign(options, {
            resizable: true,
            autoResize: true
        });
    }

    assign(context, {
        options: options
    });

    return context;
};


/**
 * Get the editing bounding box based on the element's size and position
 *
 * @param  {djs.model.Base} element
 *
 * @return {Object} an object containing information about position
 *                  and size (fixed or minimum and/or maximum)
 */
RALphLabelEditingProvider.prototype.getEditingBBox = function(element) {
    var canvas = this._canvas;

    var target = element.label || element;

    var bbox = canvas.getAbsoluteBBox(target);
    //console.log(element)
    //console.log(bbox)
    var mid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };

    // default position
    var bounds = { x: bbox.x, y: bbox.y };

    var zoom = canvas.zoom();

    var defaultStyle = this._textRenderer.getDefaultStyle(),
        externalStyle = this._textRenderer.getExternalStyle();

    // take zoom into account
    var externalFontSize = externalStyle.fontSize * zoom,
        externalLineHeight = externalStyle.lineHeight,
        defaultFontSize = defaultStyle.fontSize * zoom,
        defaultLineHeight = defaultStyle.lineHeight;

    var style = {
        fontFamily: this._textRenderer.getDefaultStyle().fontFamily,
        fontWeight: this._textRenderer.getDefaultStyle().fontWeight
    };

    // adjust for expanded pools AND lanes
    if (is(element, 'bpmn:Lane') || isExpandedPool(element)) {

        assign(bounds, {
            width: bbox.height,
            height: 30 * zoom,
            x: bbox.x - bbox.height / 2 + (15 * zoom),
            y: mid.y - (30 * zoom) / 2
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px',
            transform: 'rotate(-90deg)'
        });
    }


    // internal labels for tasks and collapsed call activities,
    // sub processes and participants
    if (isAny(element, [ 'bpmn:Task', 'bpmn:CallActivity', 'RALph:TimeSlot','RALph:nyanCat','RALph:Person']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {

        assign(bounds, {
            width: bbox.width,
            height: bbox.height,
            
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px'
        });
    }

    if (isAny(element, ['RALph:reportsDirectly','RALph:reportsTransitively']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {
        //console.log("entra aqui reports label editing provider")    
        assign(bounds, {
            width:50,
            height:20,
            x: mid.x-25,
            y: mid.y-10 
        });
        
        paddingTop=(7 * zoom);
        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });

       
    }

    if (isAny(element, ['RALph:History-AnyInstanceInTime-Green','RALph:History-AnyInstanceInTime-Red']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {
           
        assign(bounds, {
            width:50,
            height:30,
            x: (mid.x-25),
            y: (mid.y-10) 
        });

        /*assign(bounds, {
            width:bbox.width/4,//50,
            height:bbox.height/4,
            x: mid.x,
            y: mid.y
        });*/
        
        paddingTop=(7 * zoom);
        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });

       
    }

    // internal labels for expanded sub processes
    if (isExpandedSubProcess(element)) {
        assign(bounds, {
            width: bbox.width,
            x: bbox.x
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px'
        });
    }

    var width = 90 * zoom,
        paddingTop = 7 * zoom,
        paddingBottom = 4 * zoom;

    // external labels for events, data elements, gateways and connections
    if (target.labelTarget ) {
        assign(bounds, {
            width: width,
            height: bbox.height + paddingTop + paddingBottom,
            x: mid.x - width / 2,
            y: bbox.y - paddingTop
        });

        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });
    }

    // external label not yet created
    if (isLabelExternal(target)
        && !hasExternalLabel(target)
        && !isLabel(target) && !isAny(element, ['RALph:reportsDirectly']) ) {

        var externalLabelMid = getExternalLabelMid(element);

        var absoluteBBox = canvas.getAbsoluteBBox({
            x: externalLabelMid.x,
            y: externalLabelMid.y,
            width: 0,
            height: 0
        });

        var height = externalFontSize + paddingTop + paddingBottom;

        assign(bounds, {
            width: width,
            height: height,
            x: absoluteBBox.x - width / 2,
            y: absoluteBBox.y - height / 2
        });

        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });
    }

    // text annotations
    if (is(element, 'bpmn:TextAnnotation')) {
        assign(bounds, {
            width: bbox.width,
            height: bbox.height,
            minWidth: 30 * zoom,
            minHeight: 10 * zoom
        });

        assign(style, {
            textAlign: 'left',
            paddingTop: (5 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (7 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px',
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight
        });
    }

    return { bounds: bounds, style: style };
};

RALphLabelEditingProvider.prototype.update = LabelEditingProvider.prototype.update

// helpers //////////////////////

function isCollapsedSubProcess(element) {
    return is(element, 'bpmn:SubProcess') && !isExpanded(element);
}

function isExpandedSubProcess(element) {
    return is(element, 'bpmn:SubProcess') && isExpanded(element);
}

function isCollapsedPool(element) {
    return is(element, 'bpmn:Participant') && !isExpanded(element);
}

function isExpandedPool(element) {
    return is(element, 'bpmn:Participant') && isExpanded(element);
}

function isEmptyText(label) {
    return !label || !label.trim();
}
