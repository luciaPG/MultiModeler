import {
    forEach,
    find,
    matchPattern
} from 'min-dash';

import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {is} from "bpmn-js/lib/util/ModelUtil";
import {isPPINOTConnection} from "../Types";


export default function ReplaceConnectionBehavior(eventBus, modeling, bpmnRules, PPINOTRules, injector) {

    CommandInterceptor.call(this, eventBus);

    var dragging = injector.get('dragging', false);

    function fixConnection(connection) {
        var source = connection.source,
            target = connection.target,
            parent = connection.parent;

        // No hacer nada si la conexión ya está eliminada
        if (!parent) {
            return;
        }

        // Para conexiones PPINOT, preservar waypoints
        if (isPPINOTConnection(connection.type)) {
            if (connection.waypoints) {
                connection.businessObject.waypoints = connection.waypoints.map(function(p) {
                    return { x: p.x, y: p.y };
                });
            }
            return;
        }

        var replacementType,
            remove;

        // Comprobar si la conexión puede quedarse o debe ser reemplazada (SequenceFlow <> MessageFlow)

        if (is(connection, 'bpmn:SequenceFlow')) {
            if (!bpmnRules.canConnectSequenceFlow(source, target)) {
                remove = true;
            }

            if (bpmnRules.canConnectMessageFlow(source, target)) {
                replacementType = 'bpmn:MessageFlow';
            }
        }

        // Transformar message flows en sequence flows si es posible

        if (is(connection, 'bpmn:MessageFlow')) {

            if (!bpmnRules.canConnectMessageFlow(source, target)) {
                remove = true;
            }

            if (bpmnRules.canConnectSequenceFlow(source, target)) {
                replacementType = 'bpmn:SequenceFlow';
            }
        }

        if (is(connection, 'bpmn:Association') && !bpmnRules.canConnectAssociation(source, target)) {
            remove = true;
        }


        // Eliminar conexión inválida si no ha sido eliminada ya
        if (remove) {
            modeling.removeConnection(connection);
        }

        // Reemplazar SequenceFlow <> MessageFlow

        if (replacementType) {
            modeling.connect(source, target, {
                type: replacementType,
                waypoints: connection.waypoints.slice()
            });
        }
    }

    function replaceReconnectedConnection(event) {
        var context = event.context,
            connection = context.connection,
            source = context.newSource || connection.source,
            target = context.newTarget || connection.target,
            allowed,
            replacement;

        allowed = PPINOTRules.canConnect(source, target, context.connection)
        if (!allowed || allowed.type === connection.type) {
            return;
        }

        replacement = modeling.connect(source, target, {
            type: allowed.type,
            waypoints: connection.waypoints.slice()
        });

        // remove old connection
        modeling.removeConnection(connection);

        // replace connection in context to reconnect end/start
        context.connection = replacement;

        if (dragging) {
            cleanDraggingSelection(connection, replacement);
        }
    }

    // Parchear selección guardada en dragging para no re-seleccionar conexiones eliminadas
    function cleanDraggingSelection(oldConnection, newConnection) {
        var context = dragging.context(),
            previousSelection = context && context.payload.previousSelection,
            index;

        // No hacer nada si no hay dragging o no hay selección
        if (!previousSelection || !previousSelection.length) {
            return;
        }

        index = previousSelection.indexOf(oldConnection);

        if (index === -1) {
            return;
        }

        previousSelection.splice(index, 1, newConnection);
    }

    // Hooks de ciclo de vida

    this.postExecuted('elements.move', function(context) {

        var closure = context.closure,
            allConnections = closure.allConnections;

        forEach(allConnections, fixConnection);
    }, true);

    this.preExecute([
        'connection.reconnectStart',
        'connection.reconnectEnd'
    ], replaceReconnectedConnection);

    this.postExecuted('element.updateProperties', function(event) {
        var context = event.context,
            properties = context.properties,
            element = context.element,
            businessObject = element.businessObject,
            connection;

        // Eliminar expresión de condición al convertir a default flow
        if (properties.default) {
            connection = find(
                element.outgoing,
                matchPattern({ id: element.businessObject.default.id })
            );

            if (connection) {
                modeling.updateProperties(connection, { conditionExpression: undefined });
            }
        }

        // Eliminar propiedad default del source al convertir a conditional flow
        if (properties.conditionExpression && businessObject.sourceRef.default === businessObject) {
            modeling.updateProperties(element.source, { default: undefined });
        }
    });
}

inherits(ReplaceConnectionBehavior, CommandInterceptor);

ReplaceConnectionBehavior.$inject = [
    'eventBus',
    'modeling',
    'bpmnRules',
    'PPINOTRules',
    'injector'
];
