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

/**
 * Multi-notation connection handler that works for BPMN, PPINOT, and RALPH
 */
export default function MultiNotationConnect(eventBus, dragging, modeling, rules) {

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    // Manejador global de errores para eventos de conexión
    eventBus.on('connect.*', function(event) {
        try {
            // Validar que el evento y su contexto existen
            if (!event || !event.context) {
                return;
            }
            
            var context = event.context;
            
            // Validar que source existe y tiene las propiedades necesarias
            if (context.source) {
                if (!context.source.x || !context.source.y || !context.source.width || !context.source.height) {
                    // Set default values if missing
                    context.source.x = context.source.x || 0;
                    context.source.y = context.source.y || 0;
                    context.source.width = context.source.width || 100;
                    context.source.height = context.source.height || 80;
                }
            }
            
            // Validar que target existe y tiene las propiedades necesarias (si existe)
            if (context.target) {
                if (!context.target.x || !context.target.y || !context.target.width || !context.target.height) {
                    // Set default values if missing
                    context.target.x = context.target.x || 0;
                    context.target.y = context.target.y || 0;
                    context.target.width = context.target.width || 100;
                    context.target.height = context.target.height || 80;
                }
            }
            
            // Validar waypoints si existen
            if (context.hints && context.hints.waypoints) {
                context.hints.waypoints = validateAndSanitizeWaypoints(context.hints.waypoints);
            }
        } catch (error) {
            console.warn('Error in connection event handler:', error);
        }
    });

    // Manejador específico para el preview de conexión
    eventBus.on('connectPreview.show', function(event) {
        try {
            if (!event || !event.source) {
                event.preventDefault();
                return;
            }
            
            // Validar que el source tiene las propiedades necesarias
            if (!event.source.x || !event.source.y || !event.source.width || !event.source.height) {
                console.warn('Source element missing required properties for connection preview');
                event.preventDefault();
                return;
            }
        } catch (error) {
            console.warn('Error in connection preview handler:', error);
            event.preventDefault();
        }
    });

    // Manejador para el preview durante el dragging
    eventBus.on('connectPreview.update', function(event) {
        try {
            if (!event || !event.source) {
                event.preventDefault();
                return;
            }
            
            // Validar que el source tiene las propiedades necesarias
            if (!event.source.x || !event.source.y || !event.source.width || !event.source.height) {
                console.warn('Source element missing required properties for connection preview update');
                event.preventDefault();
                return;
            }
        } catch (error) {
            console.warn('Error in connection preview update handler:', error);
            event.preventDefault();
        }
    });

    eventBus.on('connect.start', function (event) {
        var context = event.context;
        
        // Si el tipo no está establecido, intentar obtenerlo del contexto de dragging
        if (!context.type && event.originalEvent && event.originalEvent.data && event.originalEvent.data.context) {
            context.type = event.originalEvent.data.context.type;
            context.connectionType = event.originalEvent.data.context.connectionType;
        }
    });

    eventBus.on(['connect.out', 'connect.cleanup'], function (event) {
        var context = event.context;
        context.target = null;
        context.canExecute = false;
    });

    eventBus.on('connect.hover', function (event) {
        var context = event.context;
        
        // Validar que el contexto y sus propiedades existen
        if (!context || !context.source) {
            return;
        }
        
        var source = context.source,
            hover = event.hover;

        var type = context.type;

        var canExecute = context.canExecute = canConnect(source, hover, type);

        if (canExecute === null) {
            return;
        }

        context.target = hover;
        // Siempre preservar el tipo, incluso si es undefined
        context.connectionType = type || context.connectionType;
    });

    eventBus.on('connect.end', function (event) {
        var context = event.context;
        
        // Validar que el contexto y sus propiedades existen
        if (!context || !context.source) {
            return false;
        }
        
        var source = context.source,
            target = context.target,
            connectionType = context.connectionType || context.type;

        if (!target) {
            return false;
        }

        var canExecute = canConnect(source, target, connectionType);

        if (!canExecute) {
            return false;
        }

        try {
            // Usar el tipo de canExecute si connectionType es undefined
            var finalType = connectionType || (canExecute && canExecute.type) || null;
            
            // Si no tenemos tipo, intentar obtenerlo de las reglas
            if (!finalType && canExecute && typeof canExecute === 'object' && canExecute.type) {
                finalType = canExecute.type;
            }
            
            var connection = modeling.connect(source, target, finalType ? {
                type: finalType
            } : null);
            
            // Disparar eventos específicos según el tipo de conexión
            if (connection && connection.type) {
                if (connection.type.startsWith('PPINOT:')) {
                    eventBus.fire('ppinot.connection.created', {
                        connection: connection
                    });
                } else if (connection.type.startsWith('RALph:')) {
                    eventBus.fire('ralph.connection.created', {
                        connection: connection
                    });
                }
            }
            
            return connection;
        } catch (error) {
            return false;
        }
    });

    // Public API
    this.start = function (event, source, sourcePosition, autoActivate) {
        // Validar que source existe
        if (!source) {
            console.error('Source element is undefined');
            return;
        }

        var hints = {};
        var realSourcePosition;

        // Validar que source tiene las propiedades necesarias para getMid
        if (source.x !== undefined && source.y !== undefined && source.width !== undefined && source.height !== undefined) {
            realSourcePosition = getMid(source);
        } else {
            // Fallback si el elemento no tiene las propiedades necesarias
            realSourcePosition = { x: 0, y: 0 };
        }

        if (typeof sourcePosition === 'object' && sourcePosition.type) {
            hints = sourcePosition;
        } else {
            if (typeof sourcePosition !== 'object') {
                autoActivate = sourcePosition;
            } else {
                realSourcePosition = sourcePosition;
            }
        }

        var contextData = {
            source: source,
            sourcePosition: realSourcePosition,
            type: hints.type,
            connectionType: hints.type  // Explicitly set connectionType
        };
        
        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: contextData
            }
        });
    };
}

MultiNotationConnect.$inject = [
    'eventBus',
    'dragging',
    'modeling',
    'rules'
];