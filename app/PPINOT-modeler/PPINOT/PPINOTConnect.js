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

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }


    eventBus.on(['connect.out', 'connect.cleanup'], function (event) {
        var context = event.context;
        context.target = null;
        context.canExecute = false;
    });

    eventBus.on('connect.hover', function (event) {
        var context = event.context,
            source = context.source,
            hover = event.hover;

        var type = context.type;

        var canExecute = context.canExecute = canConnect(source, hover, type);

        if (canExecute === null) {
            return;
        }

        context.target = hover;
        if (type) {
            context.connectionType = type;
        }
    });

    eventBus.on('connect.end', function (event) {
        var context = event.context,
            source = context.source,
            target = context.target,
            connectionType = context.connectionType || context.type;

        if (!target) {
            return false;
        }

        var canExecute = canConnect(source, target, connectionType);

        if (!canExecute) {
            console.log('🚫 Connection not allowed by rules');
            return false;
        }

        console.log('🔗 Attempting connection:', {
            source: source.type,
            target: target.type, 
            connectionType: connectionType,
            canExecute: canExecute
        });

        try {
            var connection = modeling.connect(source, target, connectionType ? {
                type: connectionType
            } : null);
            
            console.log('✅ Connection created successfully:', connection ? connection.type : 'no connection created');
            
            // Disparar evento personalizado para que PPINOTLabelProvider pueda crear el label
            if (connection && connection.type && connection.type.startsWith('PPINOT:')) {
                console.log('🚀 Firing ppinot.connection.created event for:', connection.type, connection.id);
                eventBus.fire('ppinot.connection.created', {
                    connection: connection
                });
            }
            
            return connection;
        } catch (error) {
            console.error('❌ Error al conectar:', error);
            return false;
        }
    });


    // Public API
    this.start = function (event, source, sourcePosition, autoActivate) {
        var hints = {};
        var realSourcePosition = getMid(source);
        

        if (typeof sourcePosition === 'object' && sourcePosition.type) {
            hints = sourcePosition;
            console.log('🚀 PPINOTConnect.start called with hints:', hints);
        } else {
            if (typeof sourcePosition !== 'object') {
                autoActivate = sourcePosition;
            } else {
                realSourcePosition = sourcePosition;
            }
        }

        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: realSourcePosition,
                    type: hints.type
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