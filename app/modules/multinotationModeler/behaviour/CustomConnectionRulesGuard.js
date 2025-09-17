import inherits from 'inherits';
import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';

var SUPER_HIGH = 5000;

function isCustom(connection) {
  return connection && connection.type && (/^PPINOT:/.test(connection.type) || /^RALph:/.test(connection.type));
}

export default function CustomConnectionRulesGuard(eventBus) {
  RuleProvider.call(this, eventBus);
  var currentCustomReconnectType = null;
  var hudEl = null;

  // Keep original custom type during reconnect preview and finalization
  this.addRule('connection.reconnectStart', SUPER_HIGH, function(context) {
    console.log('connection.reconnectStart', context);
    var connection = context.connection;
    var source = context.hover || context.source;
    var target = connection && connection.target;
    if (!connection || !isCustom(connection)) return;
    if (!source || !target) return false;
    currentCustomReconnectType = connection.type;
    return { type: connection.type };
  });


  this.addRule('connection.reconnectEnd', SUPER_HIGH, function(context) {
    console.log('connection.reconnectEnd', context);
    var connection = context.connection;
    var source = connection && connection.source;
    var target = context.hover || context.target;
    if (!connection || !isCustom(connection)) return;
    if (!source || !target) return false;
    currentCustomReconnectType = connection.type;
    return { type: connection.type };
  });

  // Reset the flag when command completes
  eventBus.on([
    'commandStack.connection.reconnectEnd.executed',
    'commandStack.connection.reconnectStart.executed',
    'connection.reconnectCanceled'
  ], function() { currentCustomReconnectType = null; });

  // While reconnecting custom connections, forbid any BPMN connection.create fallback (preview or drop)
  this.addRule('connection.create', SUPER_HIGH, function(context) {
    if (!context) return;
    var t = context.type;
    var conn = context.connection;
    var hints = context.hints || {};

    // If the engine tries to create a BPMN connection while we are handling a custom reconnect → block
    var isBpmn = typeof t === 'string' && /^bpmn:/.test(t);
    var inferredType = hints.type || hints.originalType || (conn && conn.type) || t;
    var customInContext = isCustom({ type: inferredType }) || !!currentCustomReconnectType;

    if (isBpmn && customInContext) {
      return false;
    }

    // If we detect custom, allow explicitly with that type (helps preview keep custom appearance)
    if (customInContext) {
      var finalType = currentCustomReconnectType || inferredType;
      return { type: finalType };
    }
  });

  // Also guard the connect.* path often used by reconnect tools
  function forceCustomTypeOnConnectContext(ctx) {
    if (!ctx) return;
    var t = (ctx.hints && (ctx.hints.type || ctx.hints.originalType)) || ctx.type || ctx.connectionType;
    if (t && (/^PPINOT:/.test(t) || /^RALph:/.test(t))) {
      currentCustomReconnectType = t;
      ctx.hints = ctx.hints || {};
      ctx.hints.type = t;
      ctx.type = t;
      ctx.connectionType = t;
    }
  }

  eventBus.on('connect.start', function(event) {
    forceCustomTypeOnConnectContext(event && event.context);
  });

  eventBus.on('connect.move', function(event) {
    forceCustomTypeOnConnectContext(event && event.context);
  });

  eventBus.on('connect.end', function(event) {
    forceCustomTypeOnConnectContext(event && event.context);
  });

  // Force preview to render with custom type while drawing
  function forcePreview(event) {
    var ctx = event && event.context;
    if (!ctx) return;
    var t = (ctx.hints && (ctx.hints.type || ctx.hints.originalType)) || ctx.type || ctx.connectionType;
    if (t && (/^PPINOT:/.test(t) || /^RALph:/.test(t))) {
      ctx.hints = ctx.hints || {};
      ctx.hints.type = t;
      ctx.type = t;
      ctx.connectionType = t;
      // If a preview connection element exists, force its type so renderer picks the custom renderer
      if (event && event.connection && event.connection.type !== t) {
        try { event.connection.type = t; } catch (e) { /* ignore */ }
      }
      // Show HUD near cursor with live type info
      showHUD(event, t, ctx);
    }
  }

  eventBus.on('connectPreview.show', SUPER_HIGH, forcePreview);
  eventBus.on('connectPreview.update', SUPER_HIGH, forcePreview);
  // Some builds use these events for preview
  eventBus.on('connection.preview', SUPER_HIGH, forcePreview);
  eventBus.on('connection.move', SUPER_HIGH, forcePreview);
  // Ensure hover phase keeps custom type while dragging
  eventBus.on('connect.hover', SUPER_HIGH, forcePreview);

  function ensureHUD() {
    if (hudEl) return hudEl;
    try {
      var el = document.createElement('div');
      el.style.position = 'fixed';
      el.style.zIndex = '100000';
      el.style.pointerEvents = 'none';
      el.style.background = 'rgba(20,20,20,0.8)';
      el.style.color = '#fff';
      el.style.padding = '2px 6px';
      el.style.fontSize = '11px';
      el.style.borderRadius = '3px';
      el.style.display = 'none';
      document.body.appendChild(el);
      hudEl = el;
    } catch (e) {}
    return hudEl;
  }

  function showHUD(event, t, ctx) {
    var el = ensureHUD();
    if (!el) return;
    var x = (event && (event.x || (event.originalEvent && event.originalEvent.clientX))) || 0;
    var y = (event && (event.y || (event.originalEvent && event.originalEvent.clientY))) || 0;
    var ctype = t || '';
    var t2 = ctx && ctx.connectionType;
    var ht = ctx && ctx.hints && ctx.hints.type;
    el.textContent = 'type: ' + ctype + ' | connType: ' + (t2 || '') + ' | hints: ' + (ht || '');
    el.style.left = (x + 12) + 'px';
    el.style.top = (y + 12) + 'px';
    el.style.display = 'block';
  }

  function hideHUD() {
    if (hudEl) hudEl.style.display = 'none';
  }

  eventBus.on(['connect.cleanup', 'connect.end'], SUPER_HIGH, function() { hideHUD(); });
}

inherits(CustomConnectionRulesGuard, RuleProvider);

CustomConnectionRulesGuard.$inject = [ 'eventBus' ];


