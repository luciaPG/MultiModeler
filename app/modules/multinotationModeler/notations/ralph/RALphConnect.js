import {
    getMid
} from 'diagram-js/lib/layout/LayoutUtil';

// Helper function to validate and sanitize waypoints
function validateAndSanitizeWaypoints(waypoints) {
  if (!Array.isArray(waypoints)) {
    return [];
  }
  
  return waypoints.filter(function(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }).map(function(point) {
    // Ensure coordinates are finite numbers
    return {
      x: isFinite(point.x) ? point.x : 0,
      y: isFinite(point.y) ? point.y : 0
    };
  });
}

//this module allows to define connections

export default function RALphConnect(eventBus, dragging, modeling, rules) {

    // rules

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    // Early waypoint validation for all connection events
    eventBus.on(['connect.start', 'connect.hover', 'connect.out', 'connect.cleanup'], function(event) {
        var context = event.context;
        
        if (context && context.hints && context.hints.waypoints) {
            context.hints.waypoints = validateAndSanitizeWaypoints(context.hints.waypoints);
        }
    });

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
        // Always preserve the connection type
        context.connectionType = type || context.connectionType;
    });

    eventBus.on([ 'connect.out', 'connect.cleanup' ], function(event) {
        var context = event.context;

        context.target = null;
        context.canExecute = false;
    });

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
            connectionType = context.connectionType || context.type,
            canExecute = context.canExecute || canConnect(source, target, connectionType);

        // Validate positions
        if (sourcePosition) {
            sourcePosition.x = isFinite(sourcePosition.x) ? sourcePosition.x : 0;
            sourcePosition.y = isFinite(sourcePosition.y) ? sourcePosition.y : 0;
        }
        
        if (targetPosition) {
            targetPosition.x = isFinite(targetPosition.x) ? targetPosition.x : 0;
            targetPosition.y = isFinite(targetPosition.y) ? targetPosition.y : 0;
        }

        if (!canExecute) {
            return false;
        }

        var attrs = null,
            hints = {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            };

        if (typeof canExecute === 'object') {//here we define the connections that require to create automatically an element and one or two connections
            
             if(canExecute.type3){//if the return has type3 
                let shape = elementFactory.createShape({ type: 'RALph:DelegateTo' });//it is created the shape RALph:DelegateTo
                let pos = {
                    x: (sourcePosition.x + targetPosition.x)/2,
                    y: (sourcePosition.y + targetPosition.y)/2,
                }
                let newShape = modeling.appendShape(source, shape, pos, source.parent, {//the connection of type3 is linked to the previous shape
                    connection: { type: canExecute.type3}
                });

                hints = {
                    connectionStart: pos,
                    connectionEnd: targetPosition
                }
                attrs = { type: canExecute.type4}//the connection of type4 is also created
                var connection = modeling.connect(newShape, target, attrs, hints);
                
                // Validate waypoints immediately after connection creation
                if (connection && connection.waypoints) {
                    connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
                }
                
                return;

        }else
                attrs = canExecute;
        }
        if(!canExecute.type1) {
            // Use the type from canExecute if attrs is null
            if (!attrs && canExecute && canExecute.type) {
                attrs = { type: canExecute.type };
            }
            
            var connection = modeling.connect(source, target, attrs, hints);
            
            // Validate waypoints immediately after connection creation
            if (connection && connection.waypoints) {
                connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
            }
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

        // Validate source position
        if (sourcePosition) {
            sourcePosition.x = isFinite(sourcePosition.x) ? sourcePosition.x : 0;
            sourcePosition.y = isFinite(sourcePosition.y) ? sourcePosition.y : 0;
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

    this.RALphStart = function(event, source, type, elementFactory, autoActivate) {
        let sourcePosition = getMid(source);
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;

        }

        // Validate source position
        if (sourcePosition) {
            sourcePosition.x = isFinite(sourcePosition.x) ? sourcePosition.x : 0;
            sourcePosition.y = isFinite(sourcePosition.y) ? sourcePosition.y : 0;
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

    this.RALphStart2 = function(event, source, type, elementFactory, sourcePosition, autoActivate) {
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        }
        
        // Validate source position
        if (sourcePosition) {
            sourcePosition.x = isFinite(sourcePosition.x) ? sourcePosition.x : 0;
            sourcePosition.y = isFinite(sourcePosition.y) ? sourcePosition.y : 0;
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

RALphConnect.$inject = [
    'eventBus',
    'dragging',
    'modeling',
    'rules'
];
