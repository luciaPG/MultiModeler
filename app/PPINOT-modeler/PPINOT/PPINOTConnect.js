import {
    asTRBL,
    getMid
} from 'diagram-js/lib/layout/LayoutUtil';
import { getNewShapePosition } from "bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil";
import {assign} from "min-dash";

// Añadimos canvas como dependencia
export default function PPINOTConnect(eventBus, dragging, modeling, rules, canvas) {

    // rules

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    // Normaliza un punto a {x: number, y: number} o devuelve null si no es válido
    function normalizePoint(pt) {
        if (!pt || typeof pt.x !== 'number' || typeof pt.y !== 'number' || isNaN(pt.x) || isNaN(pt.y)) {
            return null;
        }
        return { x: pt.x, y: pt.y };
    }

    // Normaliza los waypoints de una conexión
    function normalizeWaypoints(waypoints) {
        if (!Array.isArray(waypoints)) return [];
        return waypoints.map(normalizePoint).filter(Boolean);
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
            sourcePosition = normalizePoint(context.sourcePosition),
            elementFactory = context.elementFactory,
            target = context.target,
            targetPosition = normalizePoint({ x: event.x, y: event.y }),
            canExecute = context.canExecute || canConnect(source, target, context.type);

        if (!canExecute) {
            return false;
        }

        var attrs = null,
            hints = {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            };

        // Normaliza los puntos antes de crear la conexión
        if (!sourcePosition || !targetPosition) {
            // No crear conexión si los puntos no son válidos
            return false;
        }

        // Asegura que la conexión se crea correctamente
        let connection;
        if (typeof canExecute === 'object') {
            if (canExecute.type1) {
                hints = {
                    connectionStart: sourcePosition,
                    connectionEnd: targetPosition
                };
                attrs = { type: canExecute.type2 };
                connection = modeling.connect(source, target, attrs, hints);
            } else {
                attrs = canExecute;
                connection = modeling.connect(source, target, attrs, hints);
            }
        } else {
            connection = modeling.connect(source, target, attrs, hints);
        }

        // Fuerza refresco del canvas usando la instancia DI
        if (canvas && typeof canvas.resized === 'function') {
            canvas.resized();
            // También fuerza el viewbox para asegurar el redibujado
            if (typeof canvas.viewbox === 'function') {
                const vbox = canvas.viewbox();
                canvas.viewbox(vbox);
            }
        }

        return connection;
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
    'rules',
    'canvas'
];