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

        if (!parent) return; // conexión ya eliminada
        // Para PPINOT, preservar waypoints
        if (isPPINOTConnection(connection.type)) {
            if (connection.waypoints) {
                connection.businessObject.waypoints = connection.waypoints.map(p => ({ x: p.x, y: p.y }));
            }
            return;
        }

        var replacementType,
            remove;

        // Comprobar si la conexión debe ser eliminada o reemplazada
        if (is(connection, 'bpmn:SequenceFlow')) {
            if (!bpmnRules.canConnectSequenceFlow(source, target)) remove = true;
            if (bpmnRules.canConnectMessageFlow(source, target)) replacementType = 'bpmn:MessageFlow';
        }
        if (is(connection, 'bpmn:MessageFlow')) {
            if (!bpmnRules.canConnectMessageFlow(source, target)) remove = true;
            if (bpmnRules.canConnectSequenceFlow(source, target)) replacementType = 'bpmn:SequenceFlow';
        }
        if (is(connection, 'bpmn:Association') && !bpmnRules.canConnectAssociation(source, target)) remove = true;
        if (remove) modeling.removeConnection(connection);
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

    function cleanDraggingSelection(oldConnection, newConnection) {
        var context = dragging.context(),
            previousSelection = context && context.payload.previousSelection,
            index;

        if (!previousSelection || !previousSelection.length) return;
        index = previousSelection.indexOf(oldConnection);
        if (index === -1) return;
        previousSelection.splice(index, 1, newConnection);
    }

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

        if (properties.default) {
            connection = find(
                element.outgoing,
                matchPattern({ id: element.businessObject.default.id })
            );

            if (connection) {
                modeling.updateProperties(connection, { conditionExpression: undefined });
            }
        }

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
