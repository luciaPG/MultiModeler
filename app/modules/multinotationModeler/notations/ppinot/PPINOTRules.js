import {
  reduce
} from 'min-dash';

import inherits from 'inherits';

import {
  is
} from 'bpmn-js/lib/util/ModelUtil';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import {isPPINOTResourceArcElement, isPPINOTShape, isPPINOTAggregatedElement} from "./Types";
import {isLabel as bpmnIsLabel} from "bpmn-js/lib/util/LabelUtil";

// Reconoce labels de PPINOT
function isLabel(element) {
  return element && (element.type === 'label' || bpmnIsLabel(element));
}

// Reglas de conexión para los diferentes tipos de conectores y elementos PPINOT

var HIGH_PRIORITY = 1500;


function isPPINOT(element) {
  return element && /^PPINOT:/.test(element.type);
}

function hasReverseConnection(source, target, connectionType) {
  if (!target || !source || !target.outgoing) return false;
  return target.outgoing.some(function(conn) {
    return conn && conn.target === source && conn.type === connectionType;
  });
}

function isDefaultValid(element) {
  return element && (is(element, 'bpmn:Task') || is(element, 'bpmn:Event') || is(element, 'bpmn:Pool') || is(element, 'bpmn:DataObjectReference')) 
}

// Helpers
function isPPINOTElement(element) {
  return element && /^PPINOT:/.test(element.type);
}

function isRALphElement(element) {
  return element && /^RALph:/.test(element.type);
}

function hasIdenticalConnection(source, target, type) {
  if (!source || !target || !source.outgoing) return false;
  return source.outgoing.some(function(c){ return c && c.type === type && c.target === target; });
}

// Deprecated helper (replaced by countConnectionsOfType)

function countConnectionsOfType(element, type) {
  if (!element) return 0;
  var incoming = (element.incoming || []).filter(function(c){
    return c && c.type === type;
  }).length;
  var outgoing = (element.outgoing || []).filter(function(c){
    return c && c.type === type;
  }).length;
  return incoming + outgoing;
}

function hasToFromBetween(source, target) {
  if (!source || !target || !source.outgoing) return false;
  return source.outgoing.some(function(c){
    return c && (c.type === 'PPINOT:ToConnection' || c.type === 'PPINOT:FromConnection') && c.target === target;
  });
}

// Reglas específicas para elementos PPINOT
export default function PPINOTRules(eventBus) {
  RuleProvider.call(this, eventBus);

  // Flags to relax validation while reconnecting/moving to avoid accidental deletion
  var __ppinotIsReconnecting = false;

  eventBus.on(['connection.reconnectStart'], function() {
    __ppinotIsReconnecting = true;
  });

  eventBus.on(['connection.reconnectEnd', 'commandStack.connection.reconnectStart.executed', 'commandStack.connection.reconnectEnd.executed'], function() {
    __ppinotIsReconnecting = false;
  });

  // expose getter for debug if needed
  this._isReconnectingPPINOT = function(){ return __ppinotIsReconnecting; };
}

inherits(PPINOTRules, RuleProvider);

PPINOTRules.$inject = [ 'eventBus' ];

function connect(source, target, connection) {
  // Prohibir mezcla PPINOT/RALph en cualquier dirección o tipo de conexión
  if (connection && typeof connection === 'string' && connection.indexOf('PPINOT:') === 0) {
    if (isRALphElement(source) || isRALphElement(target)) {
      return false;
    }
  }
  if (connection && typeof connection === 'string' && connection.indexOf('RALph:') === 0) {
    if (isPPINOTElement(source) || isPPINOTElement(target)) {
      return false;
    }
  }

  // Early global guard: only one total (To or From) per source
  if (connection === 'PPINOT:ToConnection' || connection === 'PPINOT:FromConnection') {
    // Cardinalidad 1 por tipo: cada elemento puede tener a la vez 1 To y 1 From, pero no duplicados del mismo tipo
    var sourceSameType = countConnectionsOfType(source, connection);
    var targetSameType = countConnectionsOfType(target, connection);
    if (sourceSameType >= 1 || targetSameType >= 1) {
      return false;
    }
  }

  if(connection === 'PPINOT:ResourceArc'){
    if(isPPINOTResourceArcElement(source) && (isDefaultValid(target) || is(target, 'bpmn:Participant'))){
      return { type: connection }
    }
  }

  if(connection === 'PPINOT:AggregatedConnection'){
    if(isPPINOTAggregatedElement(source) && isPPINOTShape(target)){
      return { type: connection }
    }
  }

  if(connection === 'PPINOT:GroupedBy'){
    if(isPPINOTAggregatedElement(source) && is(target, 'bpmn:DataObjectReference')){
      return { type: connection }
    }
  }

  if(connection === 'PPINOT:ToConnection'){
    if(isDefaultValid(target) || is(target, 'bpmn:Participant')){
      if((is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')) )
      {
        // Cardinalidad 1 por tipo (To): permitir 1 To y 1 From, pero no más de 1 To
        if (countConnectionsOfType(source, 'PPINOT:ToConnection') >= 1) return false;
        if (countConnectionsOfType(target, 'PPINOT:ToConnection') >= 1) return false;
        // Prevent To/From duplication between the same pair (redundant and overload)
        if (hasToFromBetween(source, target)) return false;
        // block identical duplicate
        if (hasIdenticalConnection(source, target, connection)) return false;
        // Prevent same-metric duplicate on same BPMN target
        var dupMetric = (target.incoming || []).some(function(c){
          return c && c.type === connection && c.source && c.source.type === source.type;
        });
        if (dupMetric) { return false; }
        return { type: connection }
      }
      else
        return false
    }
  }
  else if(connection === 'PPINOT:DashedLine'){
    if(is(source, 'PPINOT:AggregatedMeasure') && (isDefaultValid(target) || is(target, 'bpmn:Participant')))
      return { type: connection }
  }
  else if(connection === 'PPINOT:MyConnection'){
    if(is(source, 'PPINOT:AggregatedMeasure') && (isDefaultValid(target) || is(target, 'bpmn:Participant')))
      return { type: connection }
  }
  else if(connection === 'PPINOT:FromConnection'){
    if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) &&
        (is(source, 'PPINOT:AggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure') || is(source, 'PPINOT:CyclicTimeAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:BaseMeasure') || is(source, 'PPINOT:DerivedSingleInstanceMeasure') || is(source, 'PPINOT:DerivedMultiInstanceMeasure') || is(source, 'PPINOT:DataAggregatedMeasure') || is(source, 'PPINOT:DataPropertyConditionAggregatedMeasure') || is(source, 'PPINOT:StateConditionAggregatedMeasure') || is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:CyclicTimeMeasure') || is(source, 'PPINOT:CountMeasure') || is(source, 'PPINOT:DataMeasure') || is(source, 'PPINOT:DataPropertyConditionMeasure') || is(source, 'PPINOT:StateConditionMeasure') || is(source, 'PPINOT:StateCondAggMeasureNumber') || is(source, 'PPINOT:StateCondAggMeasurePercentage') || is(source, 'PPINOT:StateCondAggMeasureAll') || is(source, 'PPINOT:StateCondAggMeasureAtLeastOne') || is(source, 'PPINOT:StateCondAggMeasureNo')
        || is(source, 'PPINOT:CountMeasure') || is(source, 'PPINOT:DataMeasure') || is(source, 'PPINOT:TimeMeasure')
        || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:DataAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')))
      {
        // Cardinalidad 1 por tipo (From): permitir 1 To y 1 From, pero no más de 1 From
        if (countConnectionsOfType(source, 'PPINOT:FromConnection') >= 1) return false;
        if (countConnectionsOfType(target, 'PPINOT:FromConnection') >= 1) return false;
        // Prevent To/From duplication between the same pair (redundant and overload)
        if (hasToFromBetween(source, target)) return false;
        // block identical duplicate and circular
        if (hasIdenticalConnection(source, target, connection) || hasReverseConnection(source, target, connection)) return false;
        // Avoid duplicated metric on same BPMN target
        var dupMetricFrom = (target.incoming || []).some(function(c){
          return c && c.type === connection && c.source && c.source.type === source.type;
        });
        if (dupMetricFrom) { return false; }
        return { type: connection }
      }
    else
      return false
  }

  else if (connection === 'PPINOT:StartConnection') {
    if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') 
    || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM')
    || is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN')
    || is(source, 'PPINOT:CountAggregatedMeasureAVG')))
      {
        if (hasIdenticalConnection(source, target, connection) || hasReverseConnection(source, target, connection)) return false;
        var dupMetricStart = (target.incoming || []).some(function(c){
          return c && c.type === connection && c.source && c.source.type === source.type;
        });
        if (dupMetricStart) { return false; }
        return { type: connection }
      }
    else
      return false
  }
  else if(connection === 'PPINOT:EndConnection'){
    if((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') 
    || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM')
    || is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN')
    || is(source, 'PPINOT:CountAggregatedMeasureAVG')))
      {
        if (hasIdenticalConnection(source, target, connection) || hasReverseConnection(source, target, connection)) return false;
        var dupMetricEnd = (target.incoming || []).some(function(c){
          return c && c.type === connection && c.source && c.source.type === source.type;
        });
        if (dupMetricEnd) { return false; }
        return { type: connection }
      }
    else
      return false
  }
  else {
    if (!isPPINOT(source) && !isPPINOT(target))
      return;
    
    // Forbid PPI to PPI connections
    if (is(source, 'PPINOT:Ppi') && is(target, 'PPINOT:Ppi')) {
      return false;
    }

    // Forbid connecting PPINOT elements to non-BPMN elements (e.g., RALph)
    if ((isPPINOTElement(source) && !isDefaultValid(target) && !is(target, 'bpmn:Participant')) ||
        (isPPINOTElement(target) && !isDefaultValid(source) && !is(source, 'bpmn:Participant'))) {
      return false;
    }

    // Block identical duplicates generically (allow reverse)
    if (hasIdenticalConnection(source, target, connection)) {
      return false;
    }
    else if((isDefaultValid(source) && isPPINOTResourceArcElement(target)) 
    || (isDefaultValid(target) && isPPINOTResourceArcElement(source))) {
      return {type: 'PPINOT:ResourceArc'}
    }
    else if((isPPINOTAggregatedElement(source) && isPPINOTShape(target)) )
      return {type: 'PPINOT:AggregatedConnection'}
    else if (isPPINOTAggregatedElement(source) && is(target, 'bpmn:DataObjectReference') )
      return {type: 'PPINOT:GroupedBy'}
    else
      return
  }
}

PPINOTRules.prototype.init = function() {

  /**
   * Can shape be created on target container?
   * This function defines which elements may contain other elements
   */
  function canCreate(shape, target) {

    if (!isPPINOT(shape)) {
      return;
    }

    var allowedContainer = is(target, 'bpmn:Process') || is(target, 'bpmn:Participant') || is(target, 'bpmn:Collaboration');

    if (isPPINOT(shape)) {
      allowedContainer = allowedContainer || is(target, 'PPINOT:Ppi');
    }

    return allowedContainer;
  }


  this.addRule('elements.move', HIGH_PRIORITY, function(context) {

    var target = context.target,
        shapes = context.shapes;

    // Special handling for single PPINOT label movement
    if (shapes.length === 1 && isLabel(shapes[0]) && shapes[0].labelTarget && isPPINOT(shapes[0].labelTarget)) {
      return true;
    }

    var type;

    // do not allow mixed movements of PPINOT / BPMN shapes
    // if any shape cannot be moved, the group cannot be moved, too
    var allowed = reduce(shapes, function(result, s) {
      
      // Allow PPINOT labels to be moved freely in groups too
      if (isLabel(s) && s.labelTarget && isPPINOT(s.labelTarget)) {
        return result !== false; // Don't change result if it's already false, otherwise allow
      }
      
      if (type === undefined) {
        type = isPPINOT(s);
      }

      if (type !== isPPINOT(s) || result === false) {
        return false;
      }

      return canCreate(s, target);
    }, undefined);

    // reject, if we have at least one
    // PPINOT element that cannot be moved
    return allowed;
  });

  this.addRule('shape.create', HIGH_PRIORITY, function(context) {
    var target = context.target,
        shape = context.shape;

    return canCreate(shape, target);
  });

  this.addRule('shape.move', HIGH_PRIORITY + 1, function(context) {
    var shape = context.shape;

    // Allow PPINOT labels to be moved freely with highest priority
    if (isLabel(shape) && shape.labelTarget && isPPINOT(shape.labelTarget)) {
      return true;
    }
    
  });

  // Add additional rule for element movement with even higher priority
  this.addRule('element.move', HIGH_PRIORITY + 2, function(context) {
    var element = context.element || context.shape;

    if (isLabel(element) && element.labelTarget && isPPINOT(element.labelTarget)) {
      return true;
    }
  });

  this.addRule('shape.resize', HIGH_PRIORITY, function(context) {
    var shape = context.shape;

    // it lets resize PPINOT elements  
    if (isPPINOT(shape)) {
      return true;
    }
  });

  this.addRule('connection.create', HIGH_PRIORITY, function(context) {
    var source = context.source,
        target = context.target,
        type = context.type;
    // Bloqueo preventivo: no permitir conexiones cruzadas PPINOT↔RALph aunque el tipo sea genérico (p.ej., bpmn:Association)
    if ((isPPINOTElement(source) && isRALphElement(target)) || (isPPINOTElement(target) && isRALphElement(source))) {
      return false;
    }
    return connect(source, target, type);
  });

  this.addRule('connection.reconnectStart', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = context.hover || context.source,
        target = connection.target;

    var res = connect(source, target, connection.type);
    // If not explicitly allowed, block instead of letting BPMN fallback
    return res || false;
  });

  this.addRule('connection.reconnectEnd', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = connection.source,
        target = context.hover || context.target;
    var res = connect(source, target, connection.type);
    return res || false;
  });

};

function nonExistingOrLabel(element) {
  return !element || isLabel(element);
}

PPINOTRules.prototype.canConnect = function (source, target, connection) {
  if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
    return null;
  }

  // Early guard here too (hover/preview path)
  if (connection && (connection.type === 'PPINOT:ToConnection' || connection.type === 'PPINOT:FromConnection')) {
    var total = (source && source.outgoing) ? source.outgoing.filter(function(c){
      return c && (c.type === 'PPINOT:ToConnection' || c.type === 'PPINOT:FromConnection');
    }).length : 0;
    if (total >= 1) {
      return false;
    }
  }

  return connect(source, target, connection.type)

}