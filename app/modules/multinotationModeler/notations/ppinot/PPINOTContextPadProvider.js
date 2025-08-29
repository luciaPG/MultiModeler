import { is } from "bpmn-js/lib/util/ModelUtil";
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { assign } from 'min-dash';
import { myConnectionElements, aggregatedElements } from "./Types";
import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';

// Devuelve las acciones para el context pad de PPINOT
export default function PPINOTContextPadProvider(
  config,
  injector,
  contextPad,
  modeling,
  elementFactory,
  connect,
  create,
  popupMenu,
  canvas,
  rules,
  translate
) {
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._translate = translate;
  this._popupMenu = popupMenu;
  this._canvas = canvas;
  this._rules = rules;
  this._autoPlace = (config && config.autoPlace !== false) ? injector.get('autoPlace', false) : null;
}

PPINOTContextPadProvider.prototype.appendConnectAction = function (type, className, title, groupName = 'ppinot-connect') {
  const connect = this._connect;

  function startConnect(event, element) {
    connect.start(event, element, { type: type });
  }

  return {
    group: groupName,
    className: className,
    title: title,
    action: {
      click: startConnect,
      dragstart: startConnect
    }
  };
};

PPINOTContextPadProvider.prototype.getContextPadEntries = function (element) {
  const businessObject = element.businessObject;
  const actions = {};

  // Acciones específicas de conexión PPINOT según el tipo de elemento
  if (isAny(businessObject, aggregatedElements) && element.type !== 'label') {
    assign(actions, {
      'connect3': this.appendConnectAction(
        'PPINOT:AggregatedConnection',
        'icon-PPINOT-aggregates',
        'Connect using aggregates connection',
        'ppinot-aggregate'
      ),
      'connect4': this.appendConnectAction(
        'PPINOT:GroupedBy',
        'icon-PPINOT-isGroupedBy',
        'Connect using isGroupedBy connection',
        'ppinot-aggregate'
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
      is(businessObject, 'PPINOT:DataAggregatedMeasure') ||
      is(businessObject, 'PPINOT:DataAggregatedMeasureSUM') ||
      is(businessObject, 'PPINOT:DataAggregatedMeasureMIN') ||
      is(businessObject, 'PPINOT:DataAggregatedMeasureMAX') ||
      is(businessObject, 'PPINOT:DataAggregatedMeasureAVG')) &&
    element.type !== 'label'
  ) {
    assign(actions, {
      'connect5': this.appendConnectAction(
        'PPINOT:DashedLine',
        'icon-PPINOT-dashed-line',
        'Connect using dashed line',
        'ppinot-dashed'
      )
    });
  }

  if (
    (is(businessObject, 'PPINOT:TimeMeasure') ||
      is(businessObject, 'PPINOT:TimeAggregatedMeasure') ||
      is(businessObject, 'PPINOT:TimeAggregatedMeasureMAX') ||
      is(businessObject, 'PPINOT:TimeAggregatedMeasureMIN') ||
      is(businessObject, 'PPINOT:TimeAggregatedMeasureAVG') ||
      is(businessObject, 'PPINOT:TimeAggregatedMeasureSUM') ||
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
       'connect1': this.appendConnectAction(
        'PPINOT:FromConnection',
        'icon-PPINOT-fromConnector',
        'Connect using From connection',
        'ppinot-time'
      ),
      'connect2': this.appendConnectAction(
        'PPINOT:ToConnection',
        'icon-PPINOT-toConnector',
        'Connect using To connection',
        'ppinot-time'
      ),
     
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
        'icon-PPINOT-startConnector',
        'Connect using Start connection',
        'ppinot-count'
      ),
      'connect11': this.appendConnectAction(
        'PPINOT:EndConnection',
        'icon-PPINOT-endConnector',
        'Connect using End connection',
        'ppinot-count'
      )
    });
  }
  if (isAny(businessObject, myConnectionElements) && element.type !== 'label') {
    assign(actions, {
      'connect13': this.appendConnectAction(
        'PPINOT:MyConnection',
        'bpmn-icon-connection',
        'Connection between PPINOT elements',
        'ppinot-general'
      )
    });
  }
  // Acción de reemplazo
  assign(actions, {
    'replace': {
      group: 'edit',
      className: 'bpmn-icon-screw-wrench',
      title: this._translate('Replace'),
      action: {
        click: (event, element) => {
          this._popupMenu.open(element, 'replace', { x: event.x, y: event.y });
        }
      }
    }
  });
  // Acción de borrado
  assign(actions, {
    'delete': {
      group: 'edit',
      className: 'bpmn-icon-trash',
      title: this._translate('Remove'),
      action: {
        click: (event, element) => {
          
          // Check if it's a PPI element BEFORE removing it
          const isPPI = element && element.type && element.type.startsWith('PPINOT:');
          
          // Remove element from canvas
          this._modeling.removeElements([element]);
          
          // Sync with PPI list if it was a PPI element
          if (isPPI) {
            try {
              const ppiManager = getServiceRegistry()?.get('PPIManagerInstance');
              if (ppiManager) {
                ppiManager.removePPIFromList(element.id);
              }
            } catch (error) {
              console.warn('Could not access PPI manager:', error);
            }
          } else {
          }
        }
      }
    }
  });

  if (businessObject && (businessObject.$type === 'PPINOT:Ppi' || businessObject.type === 'PPINOT:Ppi')) {

    delete actions.replace;
  }

  return actions;
};


PPINOTContextPadProvider.$inject = [
  'config',
  'injector',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate'
];

