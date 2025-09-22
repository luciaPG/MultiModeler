import {
    forEach,
    find,
    matchPattern
} from 'min-dash';

import inherits from 'inherits';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {is} from "bpmn-js/lib/util/ModelUtil";


export default function ReplaceConnectionBehavior(eventBus, modeling, bpmnRules, ralphRules, injector) {

    CommandInterceptor.call(this, eventBus);

    var dragging = injector.get('dragging', false);
    var elementRegistry = injector.get && injector.get('elementRegistry', false);
    var reconnectingCustom = false;

    // Store PPINOT connections snapshot around moves to restore if removed by other behaviors
    var preMovePPINOT = null;
    var movingElements = false;
    var deletedDuringMove = Object.create(null);

    function isPPINOTConnection(connection) {
        return connection && connection.type && /^PPINOT:/.test(connection.type);
    }

    function isRALPHConnection(connection) {
        return connection && connection.type && /^RALph:/.test(connection.type);
    }

    function dbg(tag, payload) {
        try {
            var info = payload;
            if (payload && payload.connection) {
                info = {
                    id: payload.connection.id,
                    type: payload.connection.type,
                    src: payload.connection.source && payload.connection.source.id,
                    tgt: payload.connection.target && payload.connection.target.id,
                    wps: (payload.connection.waypoints || []).length
                };
            }
            console.log('[PPINOT][ReplaceConn][' + tag + ']', info);
        } catch (e) { return; }
    }

    function recomputePPINOTWaypoints(connection) {
        if (!isPPINOTConnection(connection)) return null;
        var s = connection.source;
        var t = connection.target;
        if (!s || !t || typeof s.x !== 'number' || typeof t.x !== 'number') return null;

        // Specific recompute for GroupedBy to keep orthogonal shape similar to creation rule
        if (connection.type === 'PPINOT:GroupedBy') {
            var sx = s.x + (s.width || 0) / 2;
            var sy = s.y + (s.height || 0) / 2;
            var tx = t.x + (t.width || 0) / 2;
            var ty = t.y + (t.height || 0) / 2;
            var midY = (sy + ty) / 2;
            return [
                { x: sx, y: sy },
                { x: sx, y: midY },
                { x: tx, y: midY },
                { x: tx, y: ty }
            ];
        }

        // For other PPINOT connections, default to straight line between centers if waypoints invalid
        var sx2 = s.x + (s.width || 0) / 2;
        var sy2 = s.y + (s.height || 0) / 2;
        var tx2 = t.x + (t.width || 0) / 2;
        var ty2 = t.y + (t.height || 0) / 2;
        return [ { x: sx2, y: sy2 }, { x: tx2, y: ty2 } ];
    }

    function isValidWaypoints(waypoints) {
        return Array.isArray(waypoints) && waypoints.length >= 2 && waypoints.every(function(p){
            return p && typeof p.x === 'number' && typeof p.y === 'number' && isFinite(p.x) && isFinite(p.y);
        });
    }

    function getCenter(el) {
        if (!el) return { x: 0, y: 0 };
        var x = (typeof el.x === 'number') ? el.x : 0;
        var y = (typeof el.y === 'number') ? el.y : 0;
        var w = (typeof el.width === 'number') ? el.width : 0;
        var h = (typeof el.height === 'number') ? el.height : 0;
        return { x: x + w / 2, y: y + h / 2 };
    }

    function computeSafeWaypoints(connection) {
        var s = connection && connection.source ? getCenter(connection.source) : { x: 0, y: 0 };
        var t = connection && connection.target ? getCenter(connection.target) : { x: 0, y: 0 };
        if (!isFinite(s.x) || !isFinite(s.y) || !isFinite(t.x) || !isFinite(t.y)) {
            return [ { x: 0, y: 0 }, { x: 0, y: 0 } ];
        }
        return [ { x: s.x, y: s.y }, { x: t.x, y: t.y } ];
    }

    function sanitizeWaypointsIfNeeded(connection) {
        if (!connection) return;
        var wps = Array.isArray(connection.waypoints) ? connection.waypoints : [];
        var valid = isValidWaypoints(wps);
        if (!valid) {
            var safe = computeSafeWaypoints(connection);
            try {
                modeling.updateWaypoints(connection, safe);
            } catch (e) {
                // ignore
            }
        }
    }

    function fixConnection(connection) {

        // Never touch PPINOT custom associations here
        if (isPPINOTConnection(connection)) {
            dbg('fixConnection:skip-ppinot', { connection: connection });
            return;
        }

        // Never touch RALPH custom associations here
        if (isRALPHConnection(connection)) {
            dbg('fixConnection:skip-ralph', { connection: connection });
            return;
        }

        var source = connection.source,
            target = connection.target,
            parent = connection.parent;

        // do not do anything if connection
        // is already deleted (may happen due to other
        // behaviors plugged-in before)
        if (!parent) {
            return;
        }

        var replacementType,
            remove;

        /**
         * Check if incoming or outgoing connections
         * can stay or could be substituted with an
         * appropriate replacement.
         *
         * This holds true for SequenceFlow <> MessageFlow.
         */

        if (is(connection, 'bpmn:SequenceFlow')) {
            if (!bpmnRules.canConnectSequenceFlow(source, target)) {
                remove = true;
            }

            if (bpmnRules.canConnectMessageFlow(source, target)) {
                replacementType = 'bpmn:MessageFlow';
            }
        }

        // transform message flows into sequence flows, if possible

        if (is(connection, 'bpmn:MessageFlow')) {

            if (!bpmnRules.canConnectMessageFlow(source, target)) {
                remove = true;
            }

            if (bpmnRules.canConnectSequenceFlow(source, target)) {
                replacementType = 'bpmn:SequenceFlow';
            }
        }

        // Do not evaluate PPINOT associations against plain BPMN rules
        if (!isPPINOTConnection(connection) && is(connection, 'bpmn:Association') && !bpmnRules.canConnectAssociation(source, target)) {
            remove = true;
        }


        // remove invalid connection,
        // unless it has been removed already
        if (remove) {
            dbg('fixConnection:remove', { connection: connection });
            modeling.removeConnection(connection);
        }

        // replace SequenceFlow <> MessageFlow

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

        // Handle custom connections explicitly to avoid morphing to BPMN
        if (isPPINOTConnection(connection) || isRALPHConnection(connection)) {
            var customAllowed = true;
            if (isRALPHConnection(connection) && ralphRules && typeof ralphRules.canConnect === 'function') {
                try {
                    var res = ralphRules.canConnect(source, target, context.connection);
                    customAllowed = !!res;
                } catch (e) {
                    customAllowed = false;
                }
            }

            if (!customAllowed) {
                dbg('replaceReconnected:block-custom', { connection: connection });
                // block reconnection
                return false;
            }

            // Recreate connection preserving original type and waypoints
            try {
                var preserved = modeling.connect(source, target, {
                    type: connection.type,
                    waypoints: connection.waypoints.slice()
                });

                // remove old connection
                modeling.removeConnection(connection);

                // replace connection in context to reconnect end/start
                context.connection = preserved;

                if (dragging) {
                    cleanDraggingSelection(connection, preserved);
                }
                dbg('replaceReconnected:preserve-custom', { connection: preserved });
                return;
            } catch (err) {
                dbg('replaceReconnected:preserve-failed', { connection: connection });
                return false;
            }
        }

        allowed = ralphRules.canConnect(source, target, context.connection)
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

    // monkey-patch selection saved in dragging in order to not re-select non-existing connection
    function cleanDraggingSelection(oldConnection, newConnection) {
        var context = dragging.context(),
            previousSelection = context && context.payload.previousSelection,
            index;

        // do nothing if not dragging or no selection was present
        if (!previousSelection || !previousSelection.length) {
            return;
        }

        index = previousSelection.indexOf(oldConnection);

        if (index === -1) {
            return;
        }

        previousSelection.splice(index, 1, newConnection);
    }

    // lifecycle hooks

    // Capture PPINOT connections before a move
    this.preExecute('elements.move', function(context) {
        var closure = context.closure,
            allConnections = (closure && closure.allConnections) || [];

        movingElements = true;
        dbg('move.pre', { count: allConnections.length });

        var snapshotList = [];

        // 1) PPINOT connections related to the move closure
        snapshotList = snapshotList.concat(
            allConnections
                .filter(isPPINOTConnection)
                .map(function(conn) {
                    return {
                        id: conn.id,
                        type: conn.type,
                        source: conn.source,
                        target: conn.target,
                        parent: conn.parent,
                        waypoints: (conn.waypoints || []).map(function(p) { return { x: p.x, y: p.y }; })
                    };
                })
        );

        // 2) All PPINOT connections present in the diagram (belt-and-braces)
        if (elementRegistry && elementRegistry.getAll) {
            var all = elementRegistry.getAll();
            all.forEach(function(el) {
                if (el && el.waypoints && isPPINOTConnection(el)) {
                    snapshotList.push({
                        id: el.id,
                        type: el.type,
                        source: el.source,
                        target: el.target,
                        parent: el.parent,
                        waypoints: (el.waypoints || []).map(function(p) { return { x: p.x, y: p.y }; })
                    });
                }
            });
        }

        // De-duplicate by id
        var seen = Object.create(null);
        preMovePPINOT = snapshotList.filter(function(s) {
            if (seen[s.id]) return false;
            seen[s.id] = true;
            return true;
        });
    });

    // Track PPINOT connections about to be deleted while moving
    this.preExecute('connection.delete', function(context) {
        var connection = context.connection;
        if (movingElements && isPPINOTConnection(connection)) {
            dbg('conn.delete.pre', { connection: connection });
            deletedDuringMove[connection.id] = {
                id: connection.id,
                type: connection.type,
                source: connection.source,
                target: connection.target,
                parent: connection.parent,
                waypoints: (connection.waypoints || []).map(function(p) { return { x: p.x, y: p.y }; })
            };
        }
    });

    // After deletion, if it happened during move and was PPINOT, recreate it immediately
    this.postExecuted('connection.delete', function(context) {
        var snapshot = deletedDuringMove && deletedDuringMove[context.connection && context.connection.id];
        if (!movingElements || !snapshot || !elementRegistry) {
            return;
        }
        delete deletedDuringMove[snapshot.id];

        var src = snapshot.source && elementRegistry.get(snapshot.source.id || snapshot.source);
        var tgt = snapshot.target && elementRegistry.get(snapshot.target.id || snapshot.target);
        if (!src || !tgt) {
            return;
        }
        try {
            var restored = modeling.connect(src, tgt, {
                type: snapshot.type,
                waypoints: snapshot.waypoints && snapshot.waypoints.length >= 2 ? snapshot.waypoints.slice() : undefined
            });
            dbg('conn.delete.post:restored', { connection: restored || snapshot });
            if (restored && snapshot.parent) {
                restored.parent = snapshot.parent;
            }
        } catch (e) {
            // ignore
        }
    });

    this.postExecuted('elements.move', function(context) {

        var closure = context.closure,
            allConnections = closure.allConnections;

        forEach(allConnections, fixConnection);

        // Re-layout PPINOT connections so waypoints adapt to new positions
        forEach(allConnections, function(conn) {
            if (isPPINOTConnection(conn)) {
                try {
                    // If waypoints are missing/invalid, recompute custom ones (esp. GroupedBy)
                    var wps = Array.isArray(conn.waypoints) ? conn.waypoints : [];
                    var valid = wps.length >= 2 && wps.every(function(p){ return p && typeof p.x === 'number' && typeof p.y === 'number'; });
                    if (!valid) {
                        var recomputed = recomputePPINOTWaypoints(conn);
                        if (recomputed && recomputed.length >= 2) {
                            modeling.updateWaypoints(conn, recomputed);
                            return;
                        }
                    }
                    modeling.layoutConnection(conn);
                } catch (e) {
                    // ignore layout errors
                }
            }
            // Always ensure valid waypoints for any connection after move
            sanitizeWaypointsIfNeeded(conn);
        });

        // Restore any PPINOT connections that were deleted during move
        if (preMovePPINOT && preMovePPINOT.length && elementRegistry) {
            preMovePPINOT.forEach(function(snapshot) {
                // If connection still exists, skip
                var stillExists = elementRegistry.get && elementRegistry.get(snapshot.id);
                if (stillExists) {
                    return;
                }

                // Validate source/target still exist
                var src = snapshot.source && elementRegistry.get(snapshot.source.id || snapshot.source);
                var tgt = snapshot.target && elementRegistry.get(snapshot.target.id || snapshot.target);
                var parent = snapshot.parent && elementRegistry.get(snapshot.parent.id || snapshot.parent);

                if (!src || !tgt) {
                    return; // cannot restore without ends
                }

                try {
                    var restored = modeling.connect(src, tgt, {
                        type: snapshot.type,
                        waypoints: snapshot.waypoints && snapshot.waypoints.length >= 2 ? snapshot.waypoints.slice() : undefined
                    });

                    if (restored && parent) {
                        restored.parent = parent;
                    }
                } catch (e) {
                    // swallow
                }
            });
        }

        preMovePPINOT = null;
        movingElements = false;
        deletedDuringMove = Object.create(null);
    }, true);

    // Extra safety: if a PPINOT connection disappears during layout/move, restore it
    function restoreIfMissing(connection) {
        if (!isPPINOTConnection(connection) || !elementRegistry) return;
        var exists = elementRegistry.get && elementRegistry.get(connection.id);
        if (exists) return;
        var src = connection.source && elementRegistry.get(connection.source.id || connection.source);
        var tgt = connection.target && elementRegistry.get(connection.target.id || connection.target);
        if (!src || !tgt) return;
        try {
            var restored = modeling.connect(src, tgt, {
                type: connection.type,
                waypoints: (connection.waypoints && connection.waypoints.length >= 2) ? connection.waypoints.slice() : undefined
            });
            if (restored && connection.parent) restored.parent = connection.parent;
            if (restored) modeling.layoutConnection(restored);
        } catch (e) {
            // ignore
        }
    }

    this.postExecuted('connection.layout', function(event) {
        var ctx = event.context;
        if (ctx && ctx.connection) {
            dbg('conn.move.post', { connection: ctx.connection });
            sanitizeWaypointsIfNeeded(ctx.connection);
            restoreIfMissing(ctx.connection);
        }
    });

    this.postExecuted('connection.move', function(event) {
        var ctx = event.context;
        if (ctx && ctx.connection) {
            sanitizeWaypointsIfNeeded(ctx.connection);
            restoreIfMissing(ctx.connection);
        }
    });

    // After connection creation, ensure valid waypoints
    this.postExecuted('connection.create', function(event) {
        var ctx = event && event.context;
        if (!ctx || !ctx.connection) return;
        sanitizeWaypointsIfNeeded(ctx.connection);
    });

    // Hard block: prevent deleting PPINOT connections via command stack
    this.canExecute('connection.delete', function(context) {
        var connection = context && context.connection;
        if (isPPINOTConnection(connection)) {
            dbg('conn.delete.block', { connection: connection });
            return false;
        }
        if (isRALPHConnection(connection)) {
            dbg('conn.delete.block', { connection: connection });
            return false;
        }
    });

    // Forbid transforming RALPH/PPINOT into BPMN during reconnection
    this.canExecute([
        'connection.reconnectStart',
        'connection.reconnectEnd'
    ], function(context) {
        var connection = context && context.connection;
        if (!connection) return;
        if (isPPINOTConnection(connection) || isRALPHConnection(connection)) {
            var source = context.newSource || connection.source;
            var target = context.newTarget || connection.target;
            // Ask rules; if not allowed, block instead of morphing
            var rulesModule = isPPINOTConnection(connection) ? null : ralphRules;
            if (rulesModule && typeof rulesModule.canConnect === 'function') {
                try {
                    var allowed = rulesModule.canConnect(source, target, connection);
                    if (!allowed) {
                        dbg('custom.reconnect.block', { connection: connection });
                        return false;
                    }
                } catch (e) { /* ignore */ }
            }
            // allow reconnect but do not change type elsewhere
            return false; // block default command; we'll handle manually via eventBus below
        }
    });

    // Ensure PPINOT connections have provisional waypoints at drag start to prevent disappearing
    eventBus.on('shape.move.start', function(event) {
        dbg('shape.move.start', { shape: event && event.shape && event.shape.id });
        var shape = event.shape;
        if (!shape) return;
        var conns = ([]).concat(shape.incoming || [], shape.outgoing || []);
        conns.forEach(function(conn){
            if (!isPPINOTConnection(conn)) return;
            if (!isValidWaypoints(conn.waypoints)) {
                var recomputed = recomputePPINOTWaypoints(conn);
                if (recomputed && recomputed.length >= 2) {
                    try {
                        modeling.updateWaypoints(conn, recomputed);
                    } catch (e) { /* ignore waypoint update errors at drag start */ }
                }
                dbg('move.start.fix-waypoints', { connection: conn });
            }
        });
    });

    // Manual reconnect handling for custom connections at UI-event level
    function performManualReconnect(ctx) {
        var connection = ctx && ctx.connection;
        if (!connection) return;
        if (!(isPPINOTConnection(connection) || isRALPHConnection(connection))) return;

        var source = ctx.newSource || connection.source;
        var target = ctx.newTarget || connection.target;
        // Fallbacks from hover/target in context
        if (ctx && ctx.hover) {
            // If reconnecting start, newSource likely set; else set newTarget
            if (ctx.newSource) {
                source = ctx.newSource;
            } else if (!ctx.newTarget) {
                target = ctx.hover;
            }
        }
        if (!source || !target) return;

        try {
            var restored = modeling.connect(source, target, {
                type: connection.type,
                waypoints: Array.isArray(connection.waypoints) ? connection.waypoints.slice() : undefined
            });
            modeling.removeConnection(connection);
            ctx.connection = restored || connection;
            dbg('manual.reconnect.done', { connection: restored || connection });
        } catch (e) {
            dbg('manual.reconnect.failed', { connection: connection });
        }
    }

    eventBus.on('connection.reconnectEnd', 5000, function(event) {
        performManualReconnect(event && event.context);
        if (event && typeof event.stopPropagation === 'function') {
            event.stopPropagation();
        }
    });

    // If during a custom reconnect a BPMN connection sneaks in via connection.create, replace it back
    this.postExecuted('connection.create', function(event) {
        var ctx = event && event.context;
        var conn = ctx && ctx.connection;
        if (!conn) return;
        // only act if a BPMN connection was created while original was custom
        var wasCustom = (ctx && ctx.hints && (/^PPINOT:/.test(ctx.hints.originalType || '') || /^RALph:/.test(ctx.hints.originalType || '')));
        if (/^bpmn:/.test(conn.type) && wasCustom) {
            try {
                var source = conn.source;
                var target = conn.target;
                var origType = ctx.hints.originalType;
                var restored = modeling.connect(source, target, { type: origType, waypoints: conn.waypoints && conn.waypoints.slice() });
                modeling.removeConnection(conn);
                dbg('post.connection.create.restore-custom', { connection: restored || conn });
            } catch (e) {
                dbg('post.connection.create.restore-failed', { connection: conn });
            }
        }
    }, true);

    this.preExecute([
        'connection.reconnectStart',
        'connection.reconnectEnd'
    ], replaceReconnectedConnection, true);

    // Preserve custom connection type across reconnect operations
    this.preExecute([
        'connection.reconnectStart',
        'connection.reconnectEnd'
    ], function(event) {
        var ctx = event.context;
        var conn = ctx && ctx.connection;
        if (!conn) return;
        if (isPPINOTConnection(conn) || isRALPHConnection(conn)) {
            reconnectingCustom = true;
            ctx._originalCustomType = conn.type;
            ctx._originalWaypoints = Array.isArray(conn.waypoints) ? conn.waypoints.slice() : null;
            dbg('reconnect.pre.stash', { connection: conn });
        }
    }, true);

    this.postExecuted([
        'connection.reconnectStart',
        'connection.reconnectEnd'
    ], function(event) {
        var ctx = event.context;
        var newConn = ctx && ctx.connection;
        var origType = ctx && ctx._originalCustomType;
        if (!newConn || !origType) return;

        // If type changed to BPMN during reconnect, restore the original custom type
        if (newConn.type !== origType) {
            try {
                var source = newConn.source;
                var target = newConn.target;
                var waypoints = (ctx._originalWaypoints && ctx._originalWaypoints.length >= 2) ? ctx._originalWaypoints : newConn.waypoints;
                var restored = modeling.connect(source, target, { type: origType, waypoints: waypoints });
                dbg('reconnect.post.restore-type', { connection: restored || newConn });
                // remove the wrongly typed connection
                modeling.removeConnection(newConn);
                ctx.connection = restored || newConn;
            } catch (e) {
                dbg('reconnect.post.restore-failed', { connection: newConn });
            }
        }
        reconnectingCustom = false;
    }, true);

    // During custom reconnect, forbid creation of BPMN connections (prevents morphing)
    this.canExecute('connection.create', function(context) {
        if (!reconnectingCustom) return;
        var t = context && context.type;
        if (!t) return;
        if (/^bpmn:/.test(t)) {
            dbg('block.connection.create.bpmn.during-custom-reconnect', { type: t });
            return false;
        }
    });

    // Force preview to use the original custom type during reconnect drag
    eventBus.on('connection.reconnectStart', function(event) {
        var ctx = event && event.context;
        if (!ctx || !ctx.connection) return;
        var conn = ctx.connection;
        if (isPPINOTConnection(conn) || isRALPHConnection(conn)) {
            ctx.hints = ctx.hints || {};
            ctx.hints.type = conn.type;
            ctx.type = conn.type;
            ctx.connectionType = conn.type;
            dbg('reconnect.preview.set-type', { connection: conn });
        }
    });

    eventBus.on('connection.reconnectMove', function(event) {
        var ctx = event && event.context;
        if (!ctx || !ctx.connection) return;
        var conn = ctx.connection;
        if (isPPINOTConnection(conn) || isRALPHConnection(conn)) {
            ctx.hints = ctx.hints || {};
            if (!ctx.hints.type) ctx.hints.type = conn.type;
            ctx.type = conn.type;
            ctx.connectionType = conn.type;
        }
    });

    eventBus.on('connection.reconnectEnd', function(event) {
        var ctx = event && event.context;
        if (!ctx || !ctx.connection) return;
        var conn = ctx.connection;
        if (isPPINOTConnection(conn) || isRALPHConnection(conn)) {
            ctx.hints = ctx.hints || {};
            if (!ctx.hints.type) ctx.hints.type = conn.type;
            ctx.type = conn.type;
            ctx.connectionType = conn.type;
        }
    });

    this.postExecuted('element.updateProperties', function(event) {
        var context = event.context,
            properties = context.properties,
            element = context.element,
            businessObject = element.businessObject,
            connection;

        // remove condition expression when morphing to default flow
        if (properties.default) {
            connection = find(
                element.outgoing,
                matchPattern({ id: element.businessObject.default.id })
            );

            if (connection) {
                modeling.updateProperties(connection, { conditionExpression: undefined });
            }
        }

        // remove default property from source when morphing to conditional flow
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
    'RALphRules',
    'injector'
];
