export default function CreateConnectionHandler(canvas, layouter) {
    this._canvas = canvas;
    this._layouter = layouter;
}

CreateConnectionHandler.$inject = [ 'canvas', 'layouter' ];

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

// api //////////////////////

/**
 * Appends a shape to a target shape
 *
 * @param {Object} context
 * @param {djs.element.Base} context.source the source object
 * @param {djs.element.Base} context.target the parent object
 * @param {Point} context.position position of the new element
 */
CreateConnectionHandler.prototype.execute = function(context) {
    console.log(context)

    var connection = context.connection,
        source = context.source,
        target = context.target,
        type = context.type,
        parent = context.parent,
        parentIndex = context.parentIndex,
        hints = context.hints;

    if (!source || !target) {
        throw new Error('source and target required');
    }

    if (!parent) {
        throw new Error('parent required');
    }

    connection.source = source;
    connection.target = target;
    connection.type = type;

    if (!connection.waypoints) {
        connection.waypoints = this._layouter.layoutConnection(connection, hints);
    }

    // Validate and sanitize waypoints before adding connection
    if (connection.waypoints) {
        connection.waypoints = validateAndSanitizeWaypoints(connection.waypoints);
        
        // Ensure we have at least source and target points
        if (connection.waypoints.length < 2) {
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

    // add connection
    this._canvas.addConnection(connection, parent, parentIndex);

    return connection;
};

CreateConnectionHandler.prototype.revert = function(context) {
    var connection = context.connection;

    this._canvas.removeConnection(connection);

    connection.source = null;
    connection.target = null;
};