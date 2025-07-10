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

// Custom isLabel function that recognizes PPINOT labels
function isLabel(element) {
  return element && (element.type === 'label' || bpmnIsLabel(element));
}

// This module defines the rules of connection for the different types of connectors and elements created

var HIGH_PRIORITY = 1500;


function isPPINOT(element) {
  return element && /^PPINOT:/.test(element.type);
}


function isDefaultValid(element) {
  return element && (is(element, 'bpmn:Task') || is(element, 'bpmn:Event') || is(element, 'bpmn:Pool') || is(element, 'bpmn:DataObjectReference')) 
}


/**
 * Specific rules for PPINOT elements
 */
export default function PPINOTRules(eventBus) {
  RuleProvider.call(this, eventBus);

}

inherits(PPINOTRules, RuleProvider);

PPINOTRules.$inject = [ 'eventBus' ];



function connect(source, target, connection) {
  if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
    return null;
  }
  
      

  if(connection && connection.startsWith('PPINOT:')) {
    return {type: connection};
  }
  
  if(connection === 'PPINOT:MyConnection'){
    return {type: connection}
  }

  if(connection === 'PPINOT:RFCStateConnection'){
    return {type: connection}
  }

  else if(connection === 'PPINOT:DashedLine') {
    if(isDefaultValid(target) && (is(source, 'PPINOT:StateConditionMeasure') 
    || is(source, 'PPINOT:StateConditionAggregatedMeasure') || is(source, 'PPINOT:StateCondAggMeasureNumber')
    || is(source, 'PPINOT:StateCondAggMeasurePercentage') || is(source, 'PPINOT:StateCondAggMeasureAll')
    || is(source, 'PPINOT:StateCondAggMeasureAtLeastOne') || is(source, 'PPINOT:StateCondAggMeasureNo')
    || is(source, 'PPINOT:CountMeasure') || is(source, 'PPINOT:DataMeasure') || is(source, 'PPINOT:TimeMeasure')
    || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:DataAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')))
      return { type: connection }
    else
      return false
  }

  else if (isPPINOTAggregatedElement(source) && is(target, 'bpmn:DataObjectReference')) {
    return { 
      type: 'PPINOT:GroupedBy',
      waypoints: [
        { x: source.x + source.width/2, y: source.y + source.height/2 },
        { x: source.x + source.width/2, y: (source.y + target.y)/2 },
        { x: target.x + target.width/2, y: (source.y + target.y)/2 },
        { x: target.x + target.width/2, y: target.y + target.height/2 }
      ]
    };
  }
  else if(connection === 'PPINOT:ToConnection') {
    if((isDefaultValid(target) || is(target, 'bpmn:Participant')) && 
       (is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure'))) {
      return { 
        type: connection,
        waypoints: [
          { x: source.x + source.width/2, y: source.y + source.height/2 },
          { x: (source.x + target.x)/2, y: source.y + source.height/2 },
          { x: (source.x + target.x)/2, y: target.y + target.height/2 },
          { x: target.x + target.width/2, y: target.y + target.height/2 }
        ]
      };
    }
    return false;
  }
  else if(connection === 'PPINOT:FromConnection') {
    if((isDefaultValid(target) || is(target, 'bpmn:Participant') )
    && (is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:CyclicTimeMeasure')
    || is(source, 'PPINOT:CyclicTimeMeasureSUM') || is(source, 'PPINOT:CyclicTimeMeasureMAX')
    || is(source, 'PPINOT:CyclicTimeMeasureMIN') || is(source, 'PPINOT:CyclicTimeMeasureAVG')
    || is(source, 'PPINOT:CyclicTimeAggregatedMeasureSUM') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureMAX')
    || is(source, 'PPINOT:CyclicTimeAggregatedMeasureMIN') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureAVG')
    || is(source, 'PPINOT:CyclicTimeAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')
    || is(source, 'PPINOT:TimeAggregatedMeasureMAX') || is(source, 'PPINOT:TimeAggregatedMeasureMIN') || is(source, 'PPINOT:TimeAggregatedMeasureAVG') || is(source, 'PPINOT:TimeAggregatedMeasureSUM')))
      return { type: connection }
    else
      return false
  }

  else if(connection === 'PPINOT:StartConnection') {
    if((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') 
    || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM')
    || is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN')
    || is(source, 'PPINOT:CountAggregatedMeasureAVG')))
      return { type: connection }
    else
      return false
  }
  else if(connection === 'PPINOT:EndConnection') {
    if((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') 
    || is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM')
    || is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN')
    || is(source, 'PPINOT:CountAggregatedMeasureAVG')))
      return { type: connection }
    else
      return false
  }
  else {
    if (!isPPINOT(source) && !isPPINOT(target))
      return;
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
      console.log('🎯 PPINOTRules: Allowing single PPINOT label movement for:', shapes[0].id);
      return true;
    }

    var type;

    // do not allow mixed movements of PPINOT / BPMN shapes
    // if any shape cannot be moved, the group cannot be moved, too
    var allowed = reduce(shapes, function(result, s) {
      
      // Allow PPINOT labels to be moved freely in groups too
      if (isLabel(s) && s.labelTarget && isPPINOT(s.labelTarget)) {
        console.log('🎯 PPINOTRules: PPINOT label in group movement:', s.id);
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
      console.log('🎯 PPINOTRules: Allowing PPINOT label move for:', shape.id);
      return true;
    }
    
    console.log('🚫 PPINOTRules: shape.move not handled for:', shape.type, shape.id);
  });

  // Add additional rule for element movement with even higher priority
  this.addRule('element.move', HIGH_PRIORITY + 2, function(context) {
    var element = context.element || context.shape;

    if (isLabel(element) && element.labelTarget && isPPINOT(element.labelTarget)) {
      console.log('🚀 PPINOTRules: Allowing PPINOT label element.move for:', element.id);
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

    return connect(source, target, type);
  });

  this.addRule('connection.reconnectStart', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = context.hover || context.source,
        target = connection.target;

    return connect(source, target, connection.type);
  });

  this.addRule('connection.reconnectEnd', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = connection.source,
        target = context.hover || context.target;
    return connect(source, target, connection.type);
  });

};

function nonExistingOrLabel(element) {
  return !element || isLabel(element);
}

PPINOTRules.prototype.canConnect = function (source, target, connection) {
  if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
    return null;
  }
  return connect(source, target, connection.type)

}