import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';
import {
    getLabel,
    setLabel
} from 'bpmn-js/lib/features/label-editing/LabelUtil';


export default function MultiNotationLabelProvider(
    eventBus, canvas, directEditing,
    modeling, resizeHandles, textRenderer, injector) {

    this._canvas = canvas;
    this._modeling = modeling;
    this._textRenderer = textRenderer;
    this._injector = injector;
    this._customProviders = [];


    eventBus.on('element.dblclick', function (event) {
        activateDirectEdit(event.element, true);
    });

    eventBus.on([
        'element.mousedown',
        'drag.init',
        'canvas.viewbox.changing',
        'autoPlace',
        'popupMenu.open'
    ], function () {
        if (directEditing.isActive()) {
            directEditing.complete();
        }
    });

    eventBus.on(['commandStack.changed'], function () {
        if (directEditing.isActive()) {
            directEditing.cancel();
        }
    });

    eventBus.on('directEditing.activate', function () {
        resizeHandles.removeResizers();
    });

    eventBus.on('create.end', 500, function (event) {
        var context = event.context,
            element = context.shape,
            canExecute = event.context.canExecute,
            isTouch = event.isTouch;

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

    eventBus.on('autoPlace.end', 500, function (event) {
        activateDirectEdit(event.shape);
    });

    var self = this;

    function activateDirectEdit(element, force) {
        for (let provider of self._customProviders) {
            if (provider.canEdit && provider.canEdit(element)) {
                var context = provider.activate(element);
                if (context) {
                    directEditing.activate(element, context);
                }
                return;
            }
        }

        let standardTypes = [
            'bpmn:Task',
            'bpmn:TextAnnotation',
            'bpmn:Group',
            'bpmn:SubProcess',
            'bpmn:Participant',
            'bpmn:Lane',
            'bpmn:CallActivity'
        ];

        if (force || isAny(element, standardTypes) || isCollapsedSubProcess(element)) {
            directEditing.activate(element);
        }
    }

    this.registerProvider = function (provider) {
        self._customProviders.push(provider);
    };
}

MultiNotationLabelProvider.$inject = [
    'eventBus',
    'canvas',
    'directEditing',
    'modeling',
    'resizeHandles',
    'textRenderer',
    'injector'
];

MultiNotationLabelProvider.prototype.canEdit = function (element) {
    for (let provider of this._customProviders) {
        if (provider.canEdit && provider.canEdit(element)) {
            return true;
        }
    }

    if (isAny(element, [
        'bpmn:Task',
        'bpmn:TextAnnotation',
        'bpmn:Group',
        'bpmn:SubProcess',
        'bpmn:Participant',
        'bpmn:Lane',
        'bpmn:CallActivity'
    ]) || isCollapsedSubProcess(element)) {
        return true;
    }

    return false;
};

MultiNotationLabelProvider.prototype.activate = function (element) {
    for (let provider of this._customProviders) {
        if (provider.canEdit && provider.canEdit(element)) {
            if (provider.activate) {
                return provider.activate(element);
            }
        }
    }

    return this.activateStandardElement(element);
};

MultiNotationLabelProvider.prototype.activateStandardElement = function (element) {
    var text = getLabel(element);

    if (text === undefined) {
        return;
    }

    var context = {
        text: text
    };

    var bounds = this.getEditingBBox(element);
    assign(context, bounds);

    var options = {};

    if (
        isAny(element, [
            'bpmn:Task',
            'bpmn:Participant',
            'bpmn:Lane',
            'bpmn:CallActivity'
        ]) ||
        isCollapsedSubProcess(element)
    ) {
        assign(options, {
            centerVertically: true
        });
    }

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

MultiNotationLabelProvider.prototype.getEditingBBox = function (element) {
    for (let provider of this._customProviders) {
        if (provider.canEdit && provider.canEdit(element)) {
            if (provider.getEditingBBox) {
                return provider.getEditingBBox(element);
            }
        }
    }

    return this.getStandardEditingBBox(element);
};


MultiNotationLabelProvider.prototype.getStandardEditingBBox = function (element) {
    var canvas = this._canvas;
    var target = element.label || element;
    var bbox = canvas.getAbsoluteBBox(target);

    var mid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };

    var bounds = { x: bbox.x, y: bbox.y };
    var zoom = canvas.zoom();

    var defaultStyle = this._textRenderer.getDefaultStyle(),
        externalStyle = this._textRenderer.getExternalStyle();

    var defaultFontSize = defaultStyle.fontSize * zoom,
        defaultLineHeight = defaultStyle.lineHeight;

    var style = {
        fontFamily: this._textRenderer.getDefaultStyle().fontFamily,
        fontWeight: this._textRenderer.getDefaultStyle().fontWeight
    };


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


MultiNotationLabelProvider.prototype.update = function (element, newText, oldText) {

    for (let provider of this._customProviders) {
        if (provider.canEdit && provider.canEdit(element)) {
            if (provider.update) {
                return provider.update(element, newText, oldText);
            }
        }
    }


    setLabel(element, newText);
};


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
