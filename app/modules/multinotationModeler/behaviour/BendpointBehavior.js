export default function BendpointBehavior(eventBus) {
  function validatePoint(point) {
    return point && 
           typeof point.x === 'number' && 
           typeof point.y === 'number' && 
           !isNaN(point.x) && !isNaN(point.y) && 
           isFinite(point.x) && isFinite(point.y);
  }

  function sanitizeWaypoints(waypoints) {
    if (!Array.isArray(waypoints)) {
      return [];
    }
    
    return waypoints.filter(validatePoint).map(function(point) {
      // Ensure coordinates are finite numbers
      return {
        x: isFinite(point.x) ? point.x : 0,
        y: isFinite(point.y) ? point.y : 0
      };
    });
  }

  // Early validation - intercept waypoints before they reach bendpoint creation
  eventBus.on('bendpoint.add', function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = sanitizeWaypoints(connection.waypoints);
    }
  });

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
      connection.waypoints = sanitizeWaypoints(connection.waypoints);

      // Ensure we have at least source and target points
      if (connection.waypoints.length < 2) {
        var source = connection.source,
            target = connection.target;

        if (source && target) {
          // Calculate center points safely
          var sourceX = source.x + (source.width || 0) / 2;
          var sourceY = source.y + (source.height || 0) / 2;
          var targetX = target.x + (target.width || 0) / 2;
          var targetY = target.y + (target.height || 0) / 2;
          
          // Ensure coordinates are finite
          sourceX = isFinite(sourceX) ? sourceX : 0;
          sourceY = isFinite(sourceY) ? sourceY : 0;
          targetX = isFinite(targetX) ? targetX : 0;
          targetY = isFinite(targetY) ? targetY : 0;
          
          connection.waypoints = [
            { x: sourceX, y: sourceY },
            { x: targetX, y: targetY }
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
      hints.waypoints = sanitizeWaypoints(hints.waypoints);
    }
  });

  // Additional validation for connection creation
  eventBus.on('connection.create', function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = sanitizeWaypoints(connection.waypoints);
    }
  });

  // Validate waypoints during connection updates
  eventBus.on('connection.updateWaypoints', function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = sanitizeWaypoints(connection.waypoints);
    }
  });

  // Early validation for bendpoint creation
  eventBus.on('bendpoint.create', function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = sanitizeWaypoints(connection.waypoints);
    }
  });

  // Validate waypoints before any bendpoint operations
  eventBus.on(['bendpoint.move.start', 'bendpoint.move.end'], function(event) {
    var context = event.context,
        connection = context.connection;

    if (connection && connection.waypoints) {
      connection.waypoints = sanitizeWaypoints(connection.waypoints);
    }
  });
}

BendpointBehavior.$inject = [ 'eventBus' ]; 