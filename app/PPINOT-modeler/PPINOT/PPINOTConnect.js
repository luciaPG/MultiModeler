/**
 * Handles connection creation between BPMN and PPINOT elements with validation rules
 */
import {
    asTRBL,
    getMid
} from 'diagram-js/lib/layout/LayoutUtil';
import { getNewShapePosition } from "bpmn-js/lib/features/auto-place/BpmnAutoPlaceUtil";
import { assign } from "min-dash";

export default function PPINOTConnect(eventBus, dragging, modeling, rules) {

    // Connection validation rules
    function canConnect(source, target, type, showMessage = false) {
        // PPINOT elements can only connect to BPMN elements
        if ((type === 'PPINOT:FromConnection' || type === 'PPINOT:ToConnection') &&
            typeof target?.type === 'string' &&
            !target.type.startsWith('bpmn:')) {

            if (showMessage) {
                showUserFeedback('Time measures can only connect to BPMN elements like tasks and events, not to other PPINOT elements.');
            }
            return false;
        }

        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    function showUserFeedback(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.cssText = `
            position: fixed;
            top: 20px;               
            left: 50%;
            transform: translateX(-50%);
            background-color: #333;
            color: white;
            padding: 10px 20px;
            border-radius: 4px;
            z-index: 10000;
            max-width: 80%;
            text-align: center;
            box-shadow: 0 2px 5px rgba(0, 0, 0, 0.21);
        `;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.5s';
            setTimeout(() => document.body.removeChild(toast), 500);
        }, 3000);
    }

    function determineConnectionType(source, target) {
        if (source.type && source.type.startsWith('PPINOT:')) {
            return 'PPINOT:FromConnection';
        } else if (target.type && target.type.startsWith('PPINOT:')) {
            return 'PPINOT:ToConnection';
        } else if (source.type && source.type.startsWith('bpmn:') && 
                   target.type && target.type.startsWith('bpmn:')) {
            return 'bpmn:SequenceFlow';
        }
        return null;
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
            type = context.type,
            hover = event.hover;

        var canExecute = context.canExecute = canConnect(source, hover, type, false);

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
            },
            connectionType = context.type;
        
        // Auto-determine connection type if not specified
        if (!connectionType) {
            connectionType = determineConnectionType(source, target);
        }

        if (!target) {
            showUserFeedback('You need to connect this arrow to another element.');
            return false;
        }

        // Validate PPINOT connections
        if ((connectionType === 'PPINOT:FromConnection' || connectionType === 'PPINOT:ToConnection') &&
            target.type && target.type.startsWith('PPINOT:')) {
            showUserFeedback('Time measures can only connect to BPMN elements like tasks and events, not to other PPINOT elements.');
            return false;
        }

        var canExecute = canConnect(source, target, connectionType, true);

        if (!canExecute) {
            showUserFeedback('This connection is not allowed.');
            return false;
        }

        try {
            var connection = modeling.connect(source, target, {
                type: connectionType
            }, {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            });
            
            return connection;
        } catch (error) {
            showUserFeedback('Failed to create connection: ' + error.message);
            return false;
        }
    });

    // Public API
    this.start = function (event, source, sourcePosition, autoActivate) {
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

    // PPINOT-specific connection starter with optional custom position
    this.PPINOTStart = function (event, source, type, elementFactory, sourcePosition, autoActivate) {
        // Handle overloaded parameters - sourcePosition is optional
        if (typeof sourcePosition === 'boolean') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        } else if (typeof sourcePosition !== 'object') {
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