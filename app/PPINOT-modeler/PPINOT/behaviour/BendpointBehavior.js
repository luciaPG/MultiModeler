export default function BendpointBehavior(eventBus) {
  function validatePoint(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }

  // Intercept bendpoint addition
  eventBus.on('bendpoint.move.move', function(event) {
    var context = event.context,
        connection = context.connection,
        originalWaypoints = connection.waypoints.slice(),
        bendpoint = context.bendpoint;

    // Validate the bendpoint being moved
    if (!validatePoint(bendpoint)) {
      event.stopPropagation();
      connection.waypoints = originalWaypoints;
      return false;
    }
  });

  // Validate waypoints before they're used
  eventBus.on(['bendpoint.move.cleanup', 'connect.cleanup'], function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = connection.waypoints.filter(validatePoint);

      // Ensure we have at least source and target points
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

  // Validate connection preview
  eventBus.on(['connection.preview', 'connection.move'], function(event) {
    var context = event.context,
        hints = context.hints || {};

    if (hints.waypoints) {
      hints.waypoints = hints.waypoints.filter(validatePoint);
    }
  });
}

BendpointBehavior.$inject = [ 'eventBus' ]; 