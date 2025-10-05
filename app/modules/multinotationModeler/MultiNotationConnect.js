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

function hasValidWaypoints(waypoints) {
  if (!Array.isArray(waypoints) || waypoints.length < 2) return false;
  return waypoints.every(function(point){
    return point && typeof point.x === 'number' && typeof point.y === 'number' && isFinite(point.x) && isFinite(point.y);
  });
}

function computeDefaultWaypoints(source, target) {
  try {
    var s = getMid(source);
    var t = getMid(target);
    if (s && t && isFinite(s.x) && isFinite(s.y) && isFinite(t.x) && isFinite(t.y)) {
      return [ { x: s.x, y: s.y }, { x: t.x, y: t.y } ];
    }
  } catch (e) { /* ignore */ }
  // Fallback to simple zeros if something is missing (will be laid out later)
  return [ { x: (source && source.x) || 0, y: (source && source.y) || 0 }, { x: (target && target.x) || 0, y: (target && target.y) || 0 } ];
}

// Notificaciones visuales desactivadas a petición del usuario

/**
 * Multi-notation connection handler that works for BPMN, PPINOT, and RALPH
 */
export default function MultiNotationConnect(eventBus, dragging, modeling, rules) {

    function isPPINOTElement(el) {
        return el && typeof el.type === 'string' && el.type.indexOf('PPINOT:') === 0;
    }

    function isRALphElement(el) {
        return el && typeof el.type === 'string' && el.type.indexOf('RALph:') === 0;
    }

    // hasSameType implemented below cubre la cardinalidad por tipo

    function hasSameType(el, type) {
        if (!el) return false;
        var incoming = (el.incoming || []).some(function(c){ return c && c.type === type; });
        if (incoming) return true;
        var outgoing = (el.outgoing || []).some(function(c){ return c && c.type === type; });
        return outgoing;
    }

    function canConnect(source, target, type) {
        // Cinturón y tirantes: bloquear mezcla PPINOT↔RALph a este nivel también
        if ((isPPINOTElement(source) && isRALphElement(target)) || (isPPINOTElement(target) && isRALphElement(source))) {
            return false;
        }
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
        } catch (error) { /* ignore */ }
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
                event.preventDefault();
                return;
            }
        } catch (error) {
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
                event.preventDefault();
                return;
            }
        } catch (error) {
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

    // No mostrar tipo de conexión cuando es inválido, y marcar prohibido (sin toasts)
    if (!canExecute) {
      context.target = null;
      context.canExecute = false;
      // Señal visual de prohibido: cursor not-allowed (si el shell de UI lo respeta)
      try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
        event.originalEvent.view.document.body.style.cursor = 'not-allowed';
      } } catch (e) { /* ignore */ }
      return;
    }

    // Resetear cursor cuando es válido
    try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
      event.originalEvent.view.document.body.style.cursor = '';
    } } catch (e) { /* ignore */ }

    context.target = hover;
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
      try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
        event.originalEvent.view.document.body.style.cursor = '';
      } } catch (e) { /* ignore */ }
            return false;
        }

        // Verificación extra de cardinalidad 1 para To/From (por si alguna regla externa devuelve true)
        if (connectionType === 'PPINOT:ToConnection' || connectionType === 'PPINOT:FromConnection') {
            // Permitir 1 To y 1 From por elemento, pero bloquear duplicados del mismo tipo
            if (hasSameType(source, connectionType) || hasSameType(target, connectionType)) {
                try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
                    event.originalEvent.view.document.body.style.cursor = '';
                } } catch (e) { /* ignore */ }
                try { console.error('Conexión no permitida: ya existe una del mismo tipo'); } catch (e) { /* ignore */ }
                return false;
            }
        }

        // Bloqueo de duplicados exactos (mismo source, target y tipo)
        if (source && Array.isArray(source.outgoing)) {
            var duplicated = source.outgoing.some(function(c){ return c && c.type === connectionType && c.target === target; });
            if (duplicated) {
                try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
                    event.originalEvent.view.document.body.style.cursor = '';
                } } catch (e) { /* ignore */ }
                try { console.error('Esta conexión ya existe.'); } catch (e) { /* ignore */ }
                return false;
            }
        }

    try {
            var finalType = connectionType || (canExecute && canExecute.type) || null;
            if (!finalType && canExecute && typeof canExecute === 'object' && canExecute.type) {
                finalType = canExecute.type;
            }

            // Always provide safe default waypoints to avoid NaN in bendpoints
            var defaultWps = computeDefaultWaypoints(source, target);

            var connection = modeling.connect(source, target, finalType ? {
                type: finalType,
                waypoints: defaultWps
            } : { waypoints: defaultWps });
            
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
            
            // Ensure created connection has valid waypoints; if not, sanitize
            if (connection && !hasValidWaypoints(connection.waypoints)) {
              var sanitized = validateAndSanitizeWaypoints(connection.waypoints);
              if (!hasValidWaypoints(sanitized)) {
                sanitized = defaultWps;
              }
              try { modeling.updateWaypoints(connection, sanitized); } catch (e) { /* ignore */ }
            }
            
      try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
        event.originalEvent.view.document.body.style.cursor = '';
      } } catch (e) { /* ignore */ }
      return connection;
        } catch (error) {
      try { if (event && event.originalEvent && event.originalEvent.view && event.originalEvent.view.document && event.originalEvent.view.document.body) {
        event.originalEvent.view.document.body.style.cursor = '';
      } } catch (e) { /* ignore */ }
            return false;
        }
    });

    // Public API
    this.start = function (event, source, sourcePosition, autoActivate) {
        // Validar que source existe
        if (!source) {
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

    // Add waypoint validation before element movement to prevent intersection errors
    eventBus.on(['elements.move.start', 'shape.move.start'], function(event) {
        try {
            // Get all connections in the diagram and validate their waypoints
            var elementRegistry = event.context && event.context.elementRegistry;
            if (!elementRegistry) return;
            
            var allElements = elementRegistry.getAll();
            allElements.forEach(function(element) {
                if (element.waypoints && !hasValidWaypoints(element.waypoints)) {
                    console.warn('Fixing invalid waypoints for element:', element.id, element.type);
                    // Fix waypoints to prevent intersection calculation errors
                    var sanitized = validateAndSanitizeWaypoints(element.waypoints);
                    if (sanitized.length < 2) {
                        // Use default waypoints if sanitization failed
                        element.waypoints = computeDefaultWaypoints(
                            element.source || { x: 0, y: 0 }, 
                            element.target || { x: 50, y: 0 }
                        );
                    } else {
                        element.waypoints = sanitized;
                    }
                }
            });
        } catch (error) {
            console.warn('Error during waypoint validation:', error.message);
        }
    });
}

MultiNotationConnect.$inject = [
    'eventBus',
    'dragging',
    'modeling',
    'rules'
];