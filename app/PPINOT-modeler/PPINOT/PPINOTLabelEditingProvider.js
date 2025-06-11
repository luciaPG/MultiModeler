import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';
import {
    getLabel,
    setLabel,
    getExternalLabelMid,
    isLabelExternal,
    hasExternalLabel,
    isLabel
} from './utils/LabelUtil';
import { directEdit, label} from "./Types";
import LabelEditingProvider from "bpmn-js/lib/features/label-editing/LabelEditingProvider";

export default function PPINOTLabelEditingProvider(
    eventBus, canvas, directEditing,
    modeling, resizeHandles, textRenderer) {
      this._canvas = canvas;
    this._modeling = modeling;
    this._textRenderer = textRenderer;
    this._eventBus = eventBus;

    directEditing.registerProvider(this);

    eventBus.on('element.dblclick', function(event) {
        setTimeout(function() {
            activateDirectEdit(event.element, true);
        }, 10);
    });

    eventBus.on([
        'canvas.viewbox.changing',
        'autoPlace',
        'popupMenu.open'
    ], function() {
        if (directEditing.isActive()) {
            directEditing.complete();
        }
    });

    eventBus.on(['drag.init'], function(event) {
        if (directEditing.isActive()) {
            var editedElement = directEditing._active && directEditing._active.element;
            var eventElement = event.element;
            
            if (!editedElement || (eventElement && editedElement.id !== eventElement.id)) {
                directEditing.complete();
            }
        }
    });

    eventBus.on('directEditing.activate', function() {
        resizeHandles.removeResizers();
    });

    eventBus.on(['shape.move.start'], function(event) {
        var element = event.context.shape;
        if (element && isAny(element, label.concat(directEdit))) {
            element._labelBeforeMove = getLabel(element);
        }
    });

    eventBus.on(['shape.move.end'], function(event) {
        var element = event.context.shape;
        
        if (element && isAny(element, label.concat(directEdit))) {
            var storedLabel = element._labelBeforeMove;
            if (storedLabel && storedLabel.trim() !== '') {
                try {
                    setLabel(element, storedLabel);
                } catch (error) {
                    // Silent fallback
                }
                
                setTimeout(function() {
                    try {
                        setLabel(element, storedLabel);
                    } catch (error) {
                        // Silent fallback
                    }
                }, 10);
                
                delete element._labelBeforeMove;
            }
            
            if (directEditing.isActive()) {
                var activeElement = directEditing._active && directEditing._active.element;
                if (activeElement && activeElement.id === element.id) {
                    try {
                        var newBounds = this.getEditingBBox(element);
                        if (directEditing._active && newBounds) {
                            var editingOverlay = directEditing._active.overlayId;
                            if (editingOverlay) {
                                var overlays = canvas.get('overlays');
                                if (overlays && overlays.move) {
                                    overlays.move(editingOverlay, {
                                        x: newBounds.x,
                                        y: newBounds.y
                                    });
                                }
                            }
                        }
                    } catch (error) {
                        // Silent fallback
                    }
                }
            }
        }
    }.bind(this));

    eventBus.on(['shape.replace'], function(event) {
        var oldElement = event.context.oldShape;
        var newElement = event.context.newShape;
        
        if (oldElement && newElement && isAny(oldElement, label.concat(directEdit))) {
            var originalText = getLabel(oldElement);
            
            if (originalText && originalText.trim() !== '') {
                newElement._labelToRestore = originalText;
                
                try {
                    setLabel(newElement, originalText);
                } catch (error) {
                    // Silent fallback
                }
            }
        }
    });
    
    eventBus.on(['commandStack.shape.replace.postExecuted'], function(event) {
        var context = event.context;
        var newElement = context.newShape;
        
        if (newElement && newElement._labelToRestore) {
            var textToRestore = newElement._labelToRestore;
            
            setTimeout(function() {
                try {
                    if (!newElement.businessObject) {
                        newElement.businessObject = {};
                    }
                    newElement.businessObject.text = textToRestore;
                    setLabel(newElement, textToRestore);
                } catch (error) {
                    // Silent fallback
                }
            }, 25);
            
            setTimeout(function() {
                try {
                    if (!newElement.businessObject) {
                        newElement.businessObject = {};
                    }
                    newElement.businessObject.text = textToRestore;
                    setLabel(newElement, textToRestore);
                    eventBus.fire('element.changed', { element: newElement });
                    delete newElement._labelToRestore;
                } catch (error) {
                    // Silent fallback
                }
            }, 100);
        }
    });

    eventBus.on('create.end', 500, function(event) {
        var context = event.context,
            element = context.shape,
            canExecute = event.context.canExecute,
            isTouch = event.isTouch;

        if (isTouch || !canExecute) {
            return;
        }

        if (context.hints && context.hints.createElementsBehavior === false) {
            return;
        }

        activateDirectEdit(element);
    });

    eventBus.on('autoPlace.end', 500, function(event) {
        activateDirectEdit(event.shape);
    });

    function activateDirectEdit(element, force) {
        let types = ['bpmn:Task', 'bpmn:TextAnnotation', 'bpmn:Group'].concat(directEdit);
        
        if (force || isAny(element, types) || isCollapsedSubProcess(element)) {
            directEditing.activate(element);
        }
    }
}

PPINOTLabelEditingProvider.$inject = [
    'eventBus',
    'canvas',
    'directEditing',
    'modeling',
    'resizeHandles',
    'textRenderer'
];

PPINOTLabelEditingProvider.prototype.canEdit = function(element) {
    if (isAny(element, directEdit)) {
        return false; // Custom text editor handles PPINOT elements
    }

    if (isAny(element, ['bpmn:Task', 'bpmn:TextAnnotation', 'bpmn:Group'])) {
        return true;
    }

    if (isCollapsedSubProcess(element)) {
        return true;
    }

    return false;
};

PPINOTLabelEditingProvider.prototype.activate = function(element) {
    var text = getLabel(element);
    
    // Set default text for connection elements if no existing text
    if (!text && isAny(element, label)) {
        if(is(element, 'PPINOT:ToConnection')){
            text = 'to';
        } else if(is(element, 'PPINOT:FromConnection')){
            text = 'from';
        } else if(is(element, 'PPINOT:AggregatedConnection')){
            text = 'aggregates';
        } else if(is(element, 'PPINOT:GroupedBy')){
            text = 'isGroupedBy';
        } else if(is(element, 'PPINOT:StartConnection')){
            text = 'start';
        } else if(is(element, 'PPINOT:EndConnection')){
            text = 'end';
        } else {
            text = '';
        }
    } else if (!text) {
        text = '';
    }

    var context = { text: text };
    var boundsInfo = this.getEditingBBox(element);
    
    if (boundsInfo && boundsInfo.bounds) {
        assign(context, boundsInfo.bounds);
        if (boundsInfo.style) {
            context.style = boundsInfo.style;
        }
    } else if (boundsInfo) {
        assign(context, boundsInfo);
    }

    var options = { text: text };
    
    if (isAny(element, [
            'bpmn:Task', 'bpmn:Participant', 'bpmn:Lane', 'bpmn:CallActivity',
            'PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Ppi',
            'PPINOT:DataPropertyConditionAggregatedMeasure',
            'PPINOT:DataPropertyConditionMeasure',
            'PPINOT:DerivedSingleInstanceMeasure',
            'PPINOT:DerivedMultiInstanceMeasure',
            'PPINOT:CountMeasure', 'PPINOT:TimeMeasure',
            'PPINOT:CyclicTimeMeasure', 'PPINOT:DataMeasure',
            'PPINOT:StateConditionMeasure'
        ]) || isCollapsedSubProcess(element)) {
        assign(options, { centerVertically: true });
    }

    if (isLabelExternal(element)) {
        assign(options, { autoResize: true });
    }

    if (is(element, 'bpmn:TextAnnotation')) {
        assign(options, { resizable: true, autoResize: true });
    }

    assign(context, { options: options });
    return context;
};

PPINOTLabelEditingProvider.prototype.getEditingBBox = function(element) {
    var canvas = this._canvas;
    var target = element.label || element;
    var bbox = canvas.getAbsoluteBBox(target);
    var mid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };

    var bounds = { 
        x: bbox.x, 
        y: bbox.y,
        width: bbox.width,
        height: bbox.height
    };

    var zoom = canvas.zoom();
    var defaultStyle = this._textRenderer.getDefaultStyle();
    var externalStyle = this._textRenderer.getExternalStyle();
    var externalFontSize = externalStyle.fontSize * zoom;
    var externalLineHeight = externalStyle.lineHeight;
    var defaultFontSize = defaultStyle.fontSize * zoom;
    var defaultLineHeight = defaultStyle.lineHeight;

    var style = {
        fontFamily: defaultStyle.fontFamily,
        fontWeight: defaultStyle.fontWeight
    };

    // Expanded pools and lanes
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

    // Tasks and collapsed elements
    if (isAny(element, ['bpmn:Task', 'bpmn:CallActivity']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {

        assign(bounds, {
            width: bbox.width,
            height: bbox.height
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

    // PPINOT elements
    if (isAny(element, [
        'PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Ppi',
        'PPINOT:DataPropertyConditionAggregatedMeasure',
        'PPINOT:DataPropertyConditionMeasure',
        'PPINOT:DerivedSingleInstanceMeasure',
        'PPINOT:DerivedMultiInstanceMeasure',
        'PPINOT:CountMeasure', 'PPINOT:TimeMeasure',
        'PPINOT:CyclicTimeMeasure', 'PPINOT:DataMeasure',
        'PPINOT:StateConditionMeasure'
    ])) {
        var centerX = bbox.x + bbox.width / 2;
        var centerY = bbox.y + bbox.height / 2;
        var editWidth = Math.max(bbox.width * 0.8, 60);
        var editHeight = Math.max(bbox.height * 0.6, 30);
        
        assign(bounds, {
            x: centerX - editWidth / 2,
            y: centerY - editHeight / 2,
            width: editWidth,
            height: editHeight
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px',
            textAlign: 'center'
        });
    }

    // Expanded sub processes
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

    var width = 90 * zoom;
    var paddingTop = 7 * zoom;
    var paddingBottom = 4 * zoom;

    // External labels
    if (target.labelTarget) {
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

    // External label not yet created
    if (isLabelExternal(target) && !hasExternalLabel(target) && !isLabel(target)) {
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

    // Text annotations
    if (is(element, 'bpmn:TextAnnotation')) {
        assign(bounds, {
            width: bbox.width,
            height: bbox.height,
            minWidth: Math.max(30 * zoom, 15),
            minHeight: Math.max(10 * zoom, 15)
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

PPINOTLabelEditingProvider.prototype.update = function(element, newLabel, activeContextText, bounds) {
    var currentText = getLabel(element);
    
    if (currentText && currentText.trim() !== '' && (!newLabel || newLabel.trim() === '')) {
        newLabel = currentText;
    }

    if (isAny(element, label.concat(directEdit))) {
        try {
            this._modeling.updateLabel(element, newLabel);
        } catch (error) {                    setLabel(element, newLabel);
                    this._eventBus.fire('element.changed', { element: element });
        }
        return;
    }

    return LabelEditingProvider.prototype.update.call(this, element, newLabel, activeContextText, bounds);
};

// Helper functions
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
