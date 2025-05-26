import {
    asTRBL,
    getMid
} from './utils/CompatibilityUtil';
import { getNewShapePosition } from "bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil";
import {assign} from "min-dash";


export default function PPINOTConnect(eventBus, dragging, modeling, rules) {

    // rules

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    // event handlers

    eventBus.on('connect.hover', function(event) {
        var context = event.context,
            source = context.source,
            type = context.type,
            hover = event.hover,
            canExecute;

        canExecute = context.canExecute = canConnect(source, hover, type);

        // simply ignore hover
        if (canExecute === null) {
            return;
        }

        context.target = hover;
    });

    eventBus.on([ 'connect.out', 'connect.cleanup' ], function(event) {
        var context = event.context;

        context.target = null;
        context.canExecute = false;
    });

    // This is util if you want to create a connection that includes an element 
    eventBus.on('connect.end', function(event) {
        var context = event.context,
            source = context.source,
            sourcePosition = context.sourcePosition,
            elementFactory = context.elementFactory,
            target = context.target,
            targetPosition = {
                x: event.x,
                y: event.y
            },
            connectionType = context.type,
            canExecute = context.canExecute || canConnect(source, target, connectionType);

        console.log('Connect end handler with type:', connectionType);

        if (!canExecute) {
            return false;
        }

        var attrs = null,
            hints = {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            };

        // Special handling for GroupedBy connections
        if (connectionType === 'PPINOT:GroupedBy') {
            attrs = { type: 'PPINOT:GroupedBy' };
            modeling.connect(source, target, attrs, hints);
            return;
        }

        // Original logic for other connection types
        if (typeof canExecute === 'object') {
            if(canExecute.type1) {
                hints = {
                    connectionStart: sourcePosition, // Fixed 'pos' to 'sourcePosition'
                    connectionEnd: targetPosition
                }
                attrs = { type: canExecute.type2 }
                modeling.connect(source, target, attrs, hints); // Fixed 'newShape' to 'source'
                return;
            }
            else {
                attrs = canExecute;
            }
        } else {
            // Default case: use the connection type from context
            attrs = { type: connectionType };
        }
        
        if(!canExecute.type1 || typeof canExecute !== 'object') {
            modeling.connect(source, target, attrs, hints);
        }
    });


    // API

    /**
     * Start connect operation.
     *
     * @param {DOMEvent} event
     * @param {djs.model.Base} source
     * @param {Point} [sourcePosition]
     * @param {Boolean} [autoActivate=false]
     */
    this.start = function(event, source, sourcePosition, autoActivate) {
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        }

        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition
                }
            }
        });
    };

    this.PPINOTStart = function(event, source, type, elementFactory, autoActivate) {
        let sourcePosition = getMid(source);
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
        }

        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition,
                    type: type,
                    elementFactory: elementFactory
                }
            }
        });
    };

    this.PPINOTStart2 = function(event, source, type, elementFactory, sourcePosition, autoActivate) {
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        }
        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition,
                    type: type,
                    elementFactory: elementFactory
                }
            }
        });
    };
}

PPINOTConnect.$inject = [
    'eventBus',
    'dragging',
    'modeling',
    'rules'
];