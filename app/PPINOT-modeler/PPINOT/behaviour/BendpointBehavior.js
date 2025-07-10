

export default function BendpointBehavior(eventBus) {
  function validatePoint(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }

  // Interceptar adición de bendpoint
  eventBus.on('bendpoint.move.move', function(event) {
    var context = event.context,
        connection = context.connection,
        originalWaypoints = connection.waypoints.slice(),
        bendpoint = context.bendpoint;

    // Validar el bendpoint movido
    if (!validatePoint(bendpoint)) {
      event.stopPropagation();
      connection.waypoints = originalWaypoints;
      return false;
    }
  });

  // Validar waypoints antes de usarlos
  eventBus.on(['bendpoint.move.cleanup', 'connect.cleanup'], function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = connection.waypoints.filter(validatePoint);

      // Asegurar que haya al menos source y target
      if (connection.waypoints.length < 2) {
        var source = connection.source,
            target = connection.target;

        if (source && target) {
          connection.waypoints = [
            { x: source.x + source.width/2, y: source.y + source.height/2 },
            { x: target.x + target.width/2, y: target.y + target.height/2 }
          ];
        }
      }
    }
  });

  // Validar previsualización de conexión
  eventBus.on(['connection.preview', 'connection.move'], function(event) {
    var context = event.context,
        hints = context.hints || {};

    if (hints.waypoints) {
      hints.waypoints = hints.waypoints.filter(validatePoint);
    }
  });
}

BendpointBehavior.$inject = [ 'eventBus', 'canvas' ]; 