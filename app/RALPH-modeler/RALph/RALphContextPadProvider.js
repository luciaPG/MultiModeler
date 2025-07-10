import inherits from 'inherits';

import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

import {is} from "bpmn-js/lib/util/ModelUtil";

import {
  isAny
} from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {
  assign,
  bind
} from 'min-dash';
import {isLabel} from "./utils/LabelUtil";

import {resourceArcElements,negatedElements,solidLineElements} from "./Types";

//This module is used to generate the icons of an object inside the diagram
export default function RALphContextPadProvider(config, injector, elementFactory, connect, create, translate,modeling) {

    injector.invoke(ContextPadProvider, this);

    var cached = bind(this.getContextPadEntries, this);

    let autoPlace = config.autoPlace
    if (autoPlace !== false) {
        autoPlace = injector.get('autoPlace', false);
    }

    function appendAction(type, className, title, options) {
        if (typeof title !== 'string') {
            options = title;
            title = translate('Append {type}', { type: type.replace(/^bpmn:/, '') });
        }

        function appendStart(event, element) {
            var shape = elementFactory.createShape(assign({ type: type }, options));
            create.start(event, shape, {
                source: element
            });
        }

        function append(event, element) {
            var shape = elementFactory.createShape(assign({ type: type }, options));

            autoPlace.append(element, shape);
        }


        return {
            group: 'model',
            className: className,
            title: title,
            action: {
                dragstart: appendStart,
                click: autoPlace ? append : appendStart
            }
        };
    }

    function appendConnectAction(type, className, title) {
        if (typeof title !== 'string') {
            title = translate('Append {type}', { type: type.replace(/^RALph:/, '') });
        }

        function connectStart(event, element, autoActivate) {
            connect.RALphStart(event, element, type, elementFactory, autoActivate);
        }


        return {
            group: 'connect',
            className: className,
            title: title,
            action: {
                dragstart: connectStart,
                click: connectStart
            }
        };
    }

    this.getContextPadEntries = function(element) {
    var actions = cached(element);
    var businessObject = element.businessObject;

    function startConnect(event, element, autoActivate) {
      connect.start(event, element, autoActivate);
    }

    function startConnect2(event, element, autoActivate) {
        connect.start(event, element, autoActivate);
      }

    function startConnectConsequence(event, element, autoActivate) {
      connect.RALphStart(event, element, 'RALph:ConsequenceFlow', autoActivate);
    }

    function startConnectConsequenceTimed(event, element, autoActivate) {
      connect.RALphStart2(event, element, 'RALph:ConsequenceTimedFlow', elementFactory, autoActivate);
    }

    function startConnectTimeDistance(event, element, autoActivate) {
        connect.RALphStart2(event, element, 'RALph:ConsequenceTimedFlow', elementFactory, autoActivate);
    }

    //here we declared the conditions to show an icon

    //for instance, in this case the element (businessObject) must be contained in the list of resourceArcElements to have his corresponding button and it must not be a label
    if (isAny(businessObject, resourceArcElements) && element.type !== 'label') {
        //in the case that the element accomplishes the conditions, with the function assign we state which button should appear, 
        //additionally, with the function appendConnectAction ,it is linked an element defined in the renderer(RALph:ResourceArc in this case) 
        //to an icon which is defined in the index.html (icon-RALph-solidLineDef in this case), and a description is added ('Connect using simple resource assignment' in this case)
        assign(actions, {
            'connect1': appendConnectAction(//
                'RALph:ResourceArc',
                'icon-RALph-solidLineDef',
                'Connect using simple resource assignment'
            ),
            

        });
    }


    if (isAny(businessObject,negatedElements) && element.type !== 'label') {
        assign(actions, {
        
            
            'connect2': appendConnectAction(
                    'RALph:negatedAssignment',
                    'icon-RALph-negatedDef',//'icon-RALph-Negated',
                    'Connect using negated connection'
                )
        });
    }





    /*
    if (is(businessObject, 'RALph:Position') && element.type !== 'label') {
        assign(actions, {
            'connectPos': appendConnectAction(
                'RALph:Delegate',
                'icon-RALph-Delegate',
                'Connect using delegate'
            ),
        });
    }*/
    if(isAny(businessObject,['RALph:reportsDirectly'])){
        assign(actions, {
            'replaceReportsDirectly': {
                className: 'icon-RALph2-reportsTransitively',
                title: translate('Replace for reports transitively'),
                action: {
                  click: function(event, element) {
                    let newElementData = elementFactory.createShape({ type: 'RALph:reportsTransitively' });
                    newElementData.x = element.x + (newElementData.width || element.width) / 2;
                    newElementData.y = element.y + (newElementData.height || element.height) / 2;
                    modeling.replaceShape(element, newElementData);
                  }
                }
              }
            })
    }

    if(isAny(businessObject,['RALph:reportsTransitively'])){
        assign(actions, {
            'replaceReportsDirectly': {
                className: 'icon-RALph2-reportsDirectly',
                title: translate('Replace for reports directly'),
                action: {
                  click: function(event, element) {
                    let newElementData = elementFactory.createShape({ type: 'RALph:reportsDirectly' });
                    newElementData.x = element.x + (newElementData.width || element.width) / 2;
                    newElementData.y = element.y + (newElementData.height || element.height) / 2;
                    modeling.replaceShape(element, newElementData);
                  }
                }
              }
            })
    }

    if(isAny(businessObject,['RALph:delegatesTransitively'])){
        assign(actions, {
            'replaceDelegatesDirectly': {
                className: 'icon-RALph2-delegatesDirectly',
                title: translate('Replace for delegates directly'),
                action: {
                  click: function(event, element) {
                    let newElementData = elementFactory.createShape({ type: 'RALph:delegatesDirectly' });
                    newElementData.x = element.x + (newElementData.width || element.width) / 2;
                    newElementData.y = element.y + (newElementData.height || element.height) / 2;
                    modeling.replaceShape(element, newElementData);
                  }
                }
              }
            })
    }

    if(isAny(businessObject,['RALph:delegatesDirectly'])){
        assign(actions, {
            'replaceDelegatesTransitively': {
                className: 'icon-RALph2-delegatesTransitively',
                title: translate('Replace for delegates Transitively'),
                action: {
                  click: function(event, element) {
                    let newElementData = elementFactory.createShape({ type: 'RALph:delegatesTransitively' });
                    newElementData.x = element.x + (newElementData.width || element.width) / 2;
                    newElementData.y = element.y + (newElementData.height || element.height) / 2;
                    modeling.replaceShape(element, newElementData);
                  }
                }
              }
            })
    }
    
    if(isAny(businessObject,solidLineElements) && element.type !== 'label') {
        assign(actions, {
            'connect1': appendConnectAction(
                'RALph:solidLine',
                'icon-RALph-solidLineDef',//'icon-RALph-SolidLine',
                'Connect using a solid line'
            ),'connect2': appendConnectAction(
                'RALph:solidLineWithCircle',
                'icon-RALph-solidLineWithCircleDef',
                'Connect using a solid line with a circle'
            ),'connect3': appendConnectAction(
                'RALph:dashedLine',
                'icon-RALph-dashedLineDef',//'icon-RALph-dashedLine2',
                'Connect using a dashed line'
            ),'connect4': appendConnectAction(
                'RALph:dashedLineWithCircle',
                'icon-RALph-dashedLineWithCircle',//'bpmn-icon-connection-multi',
                'Connect using a dashed line with circle'
            )
        });
    }

    if(is(businessObject, 'bpmn:Task') && element.type !== 'label') {//it is also possible to limit the icons for an unique object.
        assign(actions, {
            'connect2': appendConnectAction(
                'bpmn:DataOutputAssociation',
                'bpmn-icon-connection-multi',//'bpmn-icon-connection-multi',
                'Connect using data output association'
            ),
           
            
        });
    }

    if(is(businessObject, 'bpmn:DataObjectReference') && element.type !== 'label') {
        assign(actions, {
            'connect4': appendConnectAction(
                'RALph:dataFieldConnection',
                'bpmn-icon-connection-multi',
                'Connect using data field connection')
        });
    }

    return actions;
  };
}

inherits(RALphContextPadProvider, ContextPadProvider);

RALphContextPadProvider.$inject = [
    'config',
    'injector',
    'elementFactory',
    'connect',
    'create',
    'translate',
    'modeling'
];