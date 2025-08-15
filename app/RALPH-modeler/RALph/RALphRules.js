import {
  reduce
} from 'min-dash';

import inherits from 'inherits';

import {
  getBusinessObject,
  is
} from 'bpmn-js/lib/util/ModelUtil';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import {isAny} from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import {resourceArcElements} from "./Types";
import {isLabel} from "bpmn-js/lib/util/LabelUtil";
//this module declares which elements can be connected by some connectors, and also declares the number of possible connections between the elements.

var HIGH_PRIORITY = 1500;

//these functions find out if an element is an instance of some element, and they are important to limit the possibilities in the connections.
function isRALph(element) {
  return element && /^RALph:/.test(element.type);
}

function isDefaultValid(element) {
  return element && (is(element, 'bpmn:Task') || is(element, 'bpmn:Event') || is(element,'bpmn:DataObjectReference') || is(element,'bpmn:ExclusiveGateway') || is(element,'bpmn:EndEvent') || is(element,'bpmn:DataStoreReference') )
}

function isValidForHistoryConnectors(element){
  var cond=false;

  if(is(element, 'bpmn:Task'))
    cond=true;

  return cond;
}

function isValidForResourceArc(element){
  return isAny(element,resourceArcElements);
}

function isValidForResourceEntities(element){
  return element && (is(element,'RALph:Person') || is(element,'RALph:RoleRALph') || is(element,'RALph:Personcap') || is(element,'RALph:Orgunit') || is(element,'RALph:Position'))
}

/**
 * Specific rules for custom elements
 */
export default function RALphRules(eventBus) {
  RuleProvider.call(this, eventBus);

}

inherits(RALphRules, RuleProvider);

RALphRules.$inject = [ 'eventBus',
                        'elementRegistry' ];



//
function simpleConnection(source, target, connection) { //function to connect elements

  //The outgoing connections of the source are saved to check that the target does not have another connection from the source.
  //This is important for history connector in order to avoid more than one connection between him and the task, or to avoid the possibility of
  //connecting an element with a negated and a resource connection.
  var sourceOutgoingConnections=source.outgoing;
 
  let cond=true;//cond will be the variable to check that

  
 
  if(target !== null){
    
    if(typeof target !== 'undefined'){
      var targetIncomingConnections=target.incoming;

      for(let i of sourceOutgoingConnections){
       
        if(targetIncomingConnections.includes(i) ){//here it is checked if the source of a connection has already been connected to that target

        //if it is already connected, cond will be false and it will not be possible to connect the source and the target
          cond=false;
        }
      }

    }  
  }

  if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
    return null;
  }

  //usually the structure is enter if is connection X and check that the target and the source can be connected.
  if(connection ===  'bpmn:DataOutputAssociation'){
    if( is(target, 'bpmn:DataObjectReference') && is(source,'bpmn:Task') ){//for instance, if the source is a Task and the target is DataObjectReference, it is possible to connect them
        return { type: connection}//and the 
    }
  }

  if(connection === 'RALph:negatedAssignment' && cond === true){
    if(isValidForResourceEntities(source) && is(target, 'bpmn:Task')){//only a task can receive the negated connection
      return { type: connection }
    }
  }

  //connection === 'RALph:ResourceArc'=> if the connection is resourceArc
  //cond === true => if source and target have not been connected previously
  if(connection === 'RALph:ResourceArc' && cond === true){
    //check if the target is one of the possible targets of resourceArc (Orgunit,role,task...etc)
    if( ( is(target, 'RALph:Orgunit') && is(source,'RALph:RoleRALph')) || is(target, 'bpmn:Task') || 
          is(target, 'bpmn:Event') || is(target,'bpmn:DataObjectReference') || is(target,'bpmn:ExclusiveGateway') ||
          is(target,'bpmn:EndEvent') || is(target,'bpmn:DataStoreReference') || is(target,'RALph:Complex-Assignment-AND') || 
          is(target,'RALph:Complex-Assignment-OR') || is(target, 'bpmn:Task') && is(source,'RALph:reportsTransitively')  ||
          is(target, 'bpmn:Task') && is(source,'RALph:reportsDirectly') || is(target, 'bpmn:Task') && is(source,'RALph:delegatesDirectly') ||
          is(target, 'bpmn:Task') && is(source,'RALph:delegatesTransitively')){

          if(is(source,'RALph:Complex-Assignment-AND') || is(source,'RALph:Complex-Assignment-OR')){

            if(sourceOutgoingConnections.length<1){//if the source is an AND or an OR, it should not be able to connect with more than one element 
                return { type: connection }
              }
            //if the source is reports or delegates, it can only be connected to a task
          }else if(is(source,'RALph:reportsDirectly') || is(source,'RALph:reportsTransitively') || is(source,'RALph:delegatesDirectly') || is(source,'RALph:delegatesTransitively')){
            if(is(target, 'bpmn:Task')){
              return { type: connection }
            }
          }else{
              return { type: connection }
          }
    }
  }

  //the same logic is applied:
  if(connection === 'RALph:solidLine' && cond === true){

    //for solidline,solidLineWithCircle,dashedLine and dashedLineWithCircle it is checked that the history connector
    //does not have incompatible connectors dashedLine with solidLine or vice versa. It is also checked that the source does not have already a solidline 
    //this prevents the source of having two equal connectors 
    var cond2=true;
    for(let connectionOutgoing of sourceOutgoingConnections){
      if(connectionOutgoing.type.includes("dashed") || connectionOutgoing.type==="RALph:solidLine"){
        cond2=false;
      }
    }

    //it is also checked that the target is in the list of valid targets for history connectors 
    //and that the history connector does not have more than two connections, which is not possible.
    if(isValidForHistoryConnectors(target) && sourceOutgoingConnections.length<2 && cond2===true){
      return { type: connection }
    }
  }

  

  if(connection === 'RALph:solidLineWithCircle' && cond === true) {
    var cond2=true;
    for(let connection of sourceOutgoingConnections){
      if(connection.type.includes("dashed") ||  connection.type==="RALph:solidLineWithCircle"){
        cond2=false;
      }
    }
    if(isValidForHistoryConnectors(target) && sourceOutgoingConnections.length<2 && cond2===true){
      return { type: connection }
    }
  }

  if(connection === 'RALph:dashedLine' && cond === true){
    var cond2=true;
    for(let connection of sourceOutgoingConnections){
      if(connection.type.includes("solid") || connection.type==="RALph:dashedLine"){
        cond2=false;
      }
    }

    if(isValidForHistoryConnectors(target) && sourceOutgoingConnections.length<2 && cond2===true){
      return { type: connection }
    }
  }

  if(connection === 'RALph:dashedLineWithCircle' && cond === true){
    var cond2=true;
    for(let connection of sourceOutgoingConnections){
      if(connection.type.includes("solid") || connection.type==="RALph:dashedLineWithCircle"){
        cond2=false;
      }
    }

    if(isValidForHistoryConnectors(target) && sourceOutgoingConnections.length<2 && cond2===true){
      return { type: connection }
    }
  }
  else {
    if (!isRALph(source) && !isRALph(target))
      return;
  }
}

RALphRules.prototype.init = function() {

  /**
   * Can shape be created on target container?
   */
  function canCreate(shape, target) {

    // only judge about custom elements
    if (!isRALph(shape)) {
      return;
    }

    // allow creation on processes
    return is(target, 'bpmn:Process') || is(target, 'bpmn:Participant') || is(target, 'bpmn:Collaboration') || is(target, 'bpmn:SubProcess');
  }

  

  function canConnectMultipleRALphElement(source, target) {//it allows to automatically define an element and two connections between two elements.
      if( is(source,'RALph:Position') && is(target,'bpmn:Task') ) { 
        return {type3: 'RALph:solidLine' , type4: 'RALph:simpleArrow' }//the return structure because depending in the type some elements are automatically connected in RALph connect
      /*}else if( is(source,'bpmn:Task') && is(target,'RALph:Position')  ){
        return {type5: 'RALph:solidLine' , type6:'RALph:doubleArrow'} //'RALph:reportsTo' }
      */}else if( is(source,'bpmn:DataObjectReference') && is(target,'RALph:Person')  ){
        return {type7:'RALph:ResourceArc', type8:'RALph:simpleArrow'}
      }
  }

  function connectHierarchyConnectors(source,target,type) {
    
    if(is(source,'bpmn:Task') && type === "RALph:ReportsDirectlyAssignment"){
      return {type:'RALph:ResourceArc'}

    }else if(is(source,'bpmn:Task') && type === "RALph:ReportsTransitivelyAssignment"){
      return {type:'RALph:ResourceArc'}
      
    }else if(is(source,'bpmn:Task') && type === "RALph:delegatesTransitivelyAssignment"){
      return {type:'RALph:ResourceArc'}

    }else if(is(source,'bpmn:Task') && type==="RALph:delegatesDirectlyAssignment"){
      return {type:'RALph:ResourceArc'}
    }
  }

  function canReconnect(source, target, connection) {
    if(!isRALph(connection) && !isRALph(source) && !isRALph(target))
      return;
    else {
      if(connection.type === 'RALph:ConsequenceFlow') {
        if(!isRALph(source) && !isRALph(target))
          return { type: connection.type }
        else if(is(source, 'RALph:TimeSlot') && !isRALph(target))
          return { type: connection.type }
        else
          return false
      }
     
    }

  }

  this.addRule('elements.move', HIGH_PRIORITY, function(context) {//it allows to move elements.

    var target = context.target,
        shapes = context.shapes;

    // Special handling for single RALPH label movement
    if (shapes.length === 1 && isLabel(shapes[0]) && shapes[0].labelTarget && isRALph(shapes[0].labelTarget)) {
      return true;
    }

    var type;

    // do not allow mixed movements of custom / BPMN shapes
    // if any shape cannot be moved, the group cannot be moved, too
    var allowed = reduce(shapes, function(result, s) {
      
      // Allow RALPH labels to be moved freely in groups too
      if (isLabel(s) && s.labelTarget && isRALph(s.labelTarget)) {
        return result !== false; // Don't change result if it's already false, otherwise allow
      }
      
      if (type === undefined) {
        type = isRALph(s);
      }

      if (type !== isRALph(s) || result === false) {
        return false;
      }
      return canCreate(s, target);
    }, undefined);

    // reject, if we have at least one
    // custom element that cannot be moved
    return allowed;
  });

  this.addRule('shape.create', HIGH_PRIORITY, function(context) {
    var target = context.target,
        shape = context.shape,
        elementFactory = context.elementFactory;

  var newElement = null;

  /*if(shape.type==="RALph:reportsTransitively") {

    // set center of element for modeling API
    // if no new width / height is given use old elements size
    newElementData.x = oldElement.x + (newElementData.width || oldElement.width) / 2;
    newElementData.y = oldElement.y + (newElementData.height || oldElement.height) / 2;
    let shape = elementFactory.createShape({ type: 'RALph:dataField' });
                let pos = {
                    x: (sourcePosition.x + targetPosition.x)/2,
                    y: (sourcePosition.y + targetPosition.y)/2,
                }

    newElement = modeling.replaceShape(oldElement, newElementData, options);
    return newElement;
  }*/

    return canCreate(shape, target);
  });

  this.addRule('shape.resize', HIGH_PRIORITY, function(context) {//it allows to resize custom elements.
    var shape = context.shape;

    if (isRALph(shape)) {
      // cannot resize custom elements
      return true;
    }
  });

  this.addRule('connection.create', HIGH_PRIORITY, function(context) {//it allows to create connections
    var source = context.source,
        target = context.target,
        type = context.type;

    //if it is one of these connections, it should be called another function (not the simple function to connect), because they require to automatically define some elements.
    if(type === 'RALph:Delegate' || type==='RALph:Report' || type==='RALph:dataFieldConnection'){
    
      return canConnectMultipleRALphElement(source,target)

    }else if(type==='RALph:ReportsDirectlyAssignment' || type==="RALph:ReportsTransitivelyAssignment"){
      var cond=true;
      var sourceOutgoingConnections=source.outgoing;
      //it is checked that the source is not connected with another report element since it makes no sense, to be connected with transitive and direct report
      for(let connection of sourceOutgoingConnections){
        if(connection.businessObject.target.includes("reports") ){
          cond=false;
        }
      }

      if(cond===true){// if it is connected with one report connection, creates the connection:
        return connectHierarchyConnectors(source,target,type);
      }
    }else if(type==="RALph:delegatesTransitivelyAssignment" || type==="RALph:delegatesDirectlyAssignment"){//the same logic is applied for delegate connections
      var cond2=true;
      var sourceOutgoingConnections2=source.outgoing;

      for(let connection of sourceOutgoingConnections2){
        if(connection.businessObject.target.includes("delegates")){
          cond2=false;
        }
      }

      if(cond2===true){
        return connectHierarchyConnectors(source,target,type);
      }
    }
    
    return simpleConnection(source, target, type);
  });

  this.addRule('connection.reconnectStart', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = context.hover || context.source,
        target = connection.target;

    return simpleConnection(source, target, connection.type);
  });

  this.addRule('connection.reconnectEnd', HIGH_PRIORITY*2, function(context) {
    var connection = context.connection,
        source = connection.source,
        target = context.hover || context.target;

    return simpleConnection(source, target, connection.type);
  });


};

function nonExistingOrLabel(element) {
  return !element || isLabel(element);
}

RALphRules.prototype.canConnect = function (source, target, connection) {

  if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
    return null;
  }
  return simpleConnection(source, target, connection.type)

}