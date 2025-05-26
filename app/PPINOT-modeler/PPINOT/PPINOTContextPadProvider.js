import inherits from 'inherits';

import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

import { is } from "./utils/CompatibilityUtil";

import { isAny } from './utils/CompatibilityUtil';

import {
  assign,
  bind
} from 'min-dash';
import { isLabel } from "./utils/CompatibilityUtil";

import {myConnectionElements, aggregatedElements, baseMeasureElements} from "./Types";
import { remove, replace } from 'tiny-svg';
import {
    isDifferentType
  } from "bpmn-js/lib/features/popup-menu/util/TypeUtil"; 
import PPINOTModeling from './PPINOTModeling' ;


// This module is used to show buttons in the menu of element in the diagram
export default class PPINOTContextPadProvider extends ContextPadProvider {
  constructor(
    config,         
    injector,       
    eventBus,       
    contextPad,     
    modeling,       
    elementFactory, 
    connect,        
    create,         
    popupMenu,      
    canvas,         
    rules,          
    translate,      
    appendPreview   
  ) {
    super(
      config,
      injector,
      eventBus,
      contextPad,
      modeling,
      elementFactory,
      connect,
      create,
      popupMenu,
      canvas,
      rules,
      translate,
      appendPreview
    );

    // Register this provider with the context pad
    contextPad.registerProvider(this);

    // Store references for later use
    this._modeling = modeling;
    this._elementFactory = elementFactory;
    this._connect = connect;
    this._create = create;
    this._translate = translate;
    this._contextPad = contextPad;
    this._popupMenu = popupMenu;
    this._canvas = canvas;

    // Enable autoPlace, if configured
    this._autoPlace =
      (config && config.autoPlace !== false) ? injector.get('autoPlace', false) : null;
  }

  // With this function you can append some elements to other element in the diagram automatically
  appendStart(event, element) {
    const shape = this._elementFactory.createShape(assign({ type: 'bpmn:Task' }, {}));
    this._create.start(event, shape, {
      source: element
    });
  }

  append(event, element) {
    const shape = this._elementFactory.createShape(assign({ type: 'bpmn:Task' }, {}));
    this._autoPlace.append(element, shape);
  }

  // With this function you can append some elements to other element in the diagram automatically
  appendAction(type, className, title, options) {
    if (typeof title !== 'string') {
      options = title;
      title = this._translate('Append {type}', { type: type.replace(/^bpmn:/, '') });
    }

    const appendStart = (event, element) => {
      const shape = this._elementFactory.createShape(assign({ type: type }, options));
      this._create.start(event, shape, {
        source: element
      });
    };

    const append = (event, element) => {
      const shape = this._elementFactory.createShape(assign({ type: type }, options));
      this._autoPlace.append(element, shape);
    };

    return {
      group: 'model',
      className: className,
      title: title,
      action: {
        dragstart: appendStart,
        click: this._autoPlace ? append : appendStart
      }
    };
  }

  // With this function you can append some connections to an element in the diagram automatically
  appendConnectAction(type, className, title) {
    if (typeof title !== 'string') {
      title = this._translate('Append {type}', { type: type.replace(/^PPINOT:/, '') });
    }

    const connectStart = (event, element, autoActivate) => {
      this._connect.PPINOTStart(event, element, type, this._elementFactory, autoActivate);
    };

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

  getContextPadEntries(element) {
    const actions = super.getContextPadEntries(element);
  
  // This is used to not get duplicated normal arrows 
  if (actions['connect']) {
    delete actions['connect']; 
  }
    const businessObject = element.businessObject;

     if (isAny(businessObject, myConnectionElements) && element.type !== 'label') {
      assign(actions, {
        'connect13': this.appendConnectAction(
          'PPINOT:MyConnection',
          'bpmn-icon-connection',
          'Connection between PPINOT elements'
        )
      });
    }

    
    if (isAny(businessObject, aggregatedElements) && element.type !== 'label') {
      assign(actions, {
        'connect1': this.appendConnectAction(
          'PPINOT:AggregatedConnection', 
          'icon-aggregates', 
          'Connect using aggregates connection' 
        ),
        'connect2': this.appendConnectAction( 
          'PPINOT:GroupedBy',
          'icon-isGroupedBy',
          'Connect using isGroupedBy connection'
        )
      });
    }

   
    if (
      (is(businessObject, 'PPINOT:StateConditionAggregatedMeasure') ||
       is(businessObject, 'PPINOT:StateCondAggMeasureNumber') ||
       is(businessObject, 'PPINOT:StateCondAggMeasurePercentage') ||
       is(businessObject, 'PPINOT:StateCondAggMeasureAll') ||
       is(businessObject, 'PPINOT:StateCondAggMeasureAtLeastOne') ||
       is(businessObject, 'PPINOT:StateCondAggMeasureNo') ||
       is(businessObject, 'PPINOT:StateConditionMeasure') ||
       is(businessObject, 'PPINOT:CountMeasure') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasure') ||
       is(businessObject, 'PPINOT:TimeMeasure') ||
       is(businessObject, 'PPINOT:TimeAggregatedMeasure') ||
       is(businessObject, 'PPINOT:DataMeasure') ||
       is(businessObject, 'PPINOT:DataAggregatedMeasure')) &&
      element.type !== 'label'
    ) {
      assign(actions, {
        'connect3': this.appendConnectAction(
          'PPINOT:DashedLine',
          'icon-dashed-line',
          'Connect using dashed line'
        )
      });
    }

    if (
      (is(businessObject, 'PPINOT:TimeMeasure') ||
       is(businessObject, 'PPINOT:TimeAggregatedMeasure') ||
       is(businessObject, 'PPINOT:CyclicTimeMeasure') ||
       is(businessObject, 'PPINOT:CyclicTimeMeasureSUM') ||
       is(businessObject, 'PPINOT:CyclicTimeMeasureMAX') ||
       is(businessObject, 'PPINOT:CyclicTimeMeasureMIN') ||
       is(businessObject, 'PPINOT:CyclicTimeMeasureAVG') ||
       is(businessObject, 'PPINOT:CyclicTimeAggregatedMeasure') ||
       is(businessObject, 'PPINOT:CyclicTimeAggregatedMeasureSUM') ||
       is(businessObject, 'PPINOT:CyclicTimeAggregatedMeasureMAX') ||
       is(businessObject, 'PPINOT:CyclicTimeAggregatedMeasureMIN') ||
       is(businessObject, 'PPINOT:CyclicTimeAggregatedMeasureAVG')) &&
      element.type !== 'label'
    ) {
      assign(actions, {
        'connect7': this.appendConnectAction(
          'PPINOT:ToConnection',
          'icon-toConnector',
          'Connect using To connection'
        ),
        'connect8': this.appendConnectAction(
          'PPINOT:FromConnection',
          'icon-fromConnector',
          'Connect using From connection'
        )
      });
    }

    if (
      (is(businessObject, 'PPINOT:CountMeasure') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasure') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasureSUM') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasureMAX') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasureMIN') ||
       is(businessObject, 'PPINOT:CountAggregatedMeasureAVG')) &&
      element.type !== 'label'
    ) {
      assign(actions, {
        'connect10': this.appendConnectAction(
          'PPINOT:StartConnection',
          'icon-startConnector',
          'Connect using Start connection'
        ),
        'connect11': this.appendConnectAction(
          'PPINOT:EndConnection',
          'icon-endConnector',
          'Connect using End connection'
        )
      });
    }

    // if (is(businessObject, 'bpmn:DataObjectReference') && element.type !== 'label') {
    //   assign(actions, {
    //     'connect12': this.appendConnectAction(
    //       'PPINOT:RFCStateConnection',
    //       'icon-dashed-line',
    //       'Connect using RFC state connection'
    //     )
    //   });
    // }

   

    // The following conditions defines buttons to replace elements
    // In this case, the menu button is only in aggregated measures and its function is replace these elements 
    // by derived multi instance measure
    /*
    if (isAny(businessObject, aggreagatedElements)) {
      assign(actions, {
        'replaceDerivedMulti': {
          className: 'icon-derivedMulti-menu',
          title: this._translate('Replace with Derived Multi Instance Measure'),
          action: {
            click: (event, element) => {
              let newElementData = this._elementFactory.createShape({ type: 'PPINOT:DerivedMultiInstanceMeasure'});
              newElementData.x = element.x + (newElementData.width || element.width) / 2;
              newElementData.y = element.y + (newElementData.height || element.height) / 2;
              this._modeling.replaceShape(element, newElementData);
            }
          }
        }   
      });
    }
    */

    return actions;
  }
}

// Match the order of the constructor for injection
PPINOTContextPadProvider.$inject = [
  'config',
  'injector',
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate',
  'appendPreview'
];