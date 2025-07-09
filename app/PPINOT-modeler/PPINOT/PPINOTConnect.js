import {
    asTRBL,
    getMid
} from 'diagram-js/lib/layout/LayoutUtil';
import { getNewShapePosition } from "bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil";
import { assign } from "min-dash";

/**
 * Handles connection creation between BPMN and PPINOT elements
 */
export default function PPINOTConnect(eventBus, dragging, modeling, rules) {

    // Connection validation rules
    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }


    // Event handlers
    eventBus.on(['connect.out', 'connect.cleanup'], function (event) {
        var context = event.context;
        context.target = null;
        context.canExecute = false;
    });

    eventBus.on('connect.hover', function (event) {
        var context = event.context,
            source = context.source,
            hover = event.hover;

        var type = context.hints && context.hints.type;

        var canExecute = context.canExecute = canConnect(source, hover, type);

        if (canExecute === null) {
            return;
        }

        context.target = hover;
    });

    eventBus.on('connect.end', function (event) {
        var context = event.context,
            source = context.source,
            sourcePosition = context.sourcePosition,
            target = context.target,
            targetPosition = {
                x: event.x,
                y: event.y
            };

        var hints = context.hints || {};
        var connectionType = hints.type;



        try {
            var connection = modeling.connect(source, target, {
                type: connectionType
            }, {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            });

            return connection;
        } catch (error) {
            return false;
        }
    });

    // Public API
    this.start = function (event, source, sourcePosition, hints) {
        if (typeof sourcePosition !== 'object') {
            hints = sourcePosition;
            sourcePosition = getMid(source);
        }

        dragging.init(event, 'connect', {
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition,
                    hints: hints
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