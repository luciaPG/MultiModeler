import { is } from "bpmn-js/lib/util/ModelUtil";
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { assign } from 'min-dash';
import inherits from 'inherits';
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

import {
  resourceArcElements,
  negatedElements,
  solidLineElements
} from "./Types";

export default function RALphContextPadProvider(
  config,
  injector,
  elementFactory,
  connect,
  create,
  translate,
  modeling
) {
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._create = create;
  this._translate = translate;
  this._modeling = modeling;
  this._autoPlace = (config && config.autoPlace !== false) ? injector.get('autoPlace', false) : null;
}

// Helper para crear acciones de conexión
RALphContextPadProvider.prototype.appendConnectAction = function(type, className, title, group = 'ralph-connect') {
  const connect = this._connect;
  const elementFactory = this._elementFactory;

  function startConnect(event, element) {
    connect.start(event, element, { type: type });
  }

  return {
    group: group,
    className: className,
    title: title,
    action: {
      click: startConnect,
      dragstart: startConnect
    }
  };
};

RALphContextPadProvider.prototype.getContextPadEntries = function(element) {
  const businessObject = element.businessObject;
  const modeling = this._modeling;
  const elementFactory = this._elementFactory;
  const actions = {};

  if (element.type === 'label') {
    return {};
  }

  // Recursos
  if (isAny(businessObject, resourceArcElements)) {
    assign(actions, {
      'connect-resource': this.appendConnectAction(
        'RALph:ResourceArc',
        'icon-RALph-solidLineDef',
        'Connect using simple resource assignment'
      )
    });
  }

  // Conexiones negadas
  if (isAny(businessObject, negatedElements)) {
    assign(actions, {
      'connect-negated': this.appendConnectAction(
        'RALph:negatedAssignment',
        'icon-RALph-negatedDef',
        'Connect using negated connection'
      )
    });
  }

  // Líneas y conexiones especiales
  if (isAny(businessObject, solidLineElements)) {
    assign(actions, {
      'connect-solid': this.appendConnectAction(
        'RALph:solidLine',
        'icon-RALph-solidLineDef',
        'Connect using solid line'
      ),
      'connect-solid-circle': this.appendConnectAction(
        'RALph:solidLineWithCircle',
        'icon-RALph-solidLineWithCircleDef',
        'Connect using solid line with circle'
      ),
      'connect-dashed': this.appendConnectAction(
        'RALph:dashedLine',
        'icon-RALph-dashedLineDef',
        'Connect using dashed line'
      ),
      'connect-dashed-circle': this.appendConnectAction(
        'RALph:dashedLineWithCircle',
        'icon-RALph-dashedLineWithCircle',
        'Connect using dashed line with circle'
      )
    });
  }

  // Reemplazos directos/transitivos
  if (is(businessObject, 'RALph:reportsDirectly')) {
    assign(actions, {
      'replace-to-transitive': {
        group: 'edit',
        className: 'icon-RALph2-reportsTransitively',
        title:  this._translate('Replace for reports transitively'),
        action: {
          click: function(event, element) {
            const newElement = elementFactory.createShape({ type: 'RALph:reportsTransitively' });
            newElement.x = element.x + (newElement.width || element.width) / 2;
            newElement.y = element.y + (newElement.height || element.height) / 2;
            modeling.replaceShape(element, newElement);
          }
        }
      }
    });
  }

  if (is(businessObject, 'RALph:reportsTransitively')) {
    assign(actions, {
      'replace-to-direct': {
        group: 'edit',
        className: 'icon-RALph2-reportsDirectly',
        title:  this._translate('Replace for reports directly'),
        action: {
          click: function(event, element) {
            const newElement = elementFactory.createShape({ type: 'RALph:reportsDirectly' });
            newElement.x = element.x + (newElement.width || element.width) / 2;
            newElement.y = element.y + (newElement.height || element.height) / 2;
            modeling.replaceShape(element, newElement);
          }
        }
      }
    });
  }

  if (is(businessObject, 'RALph:delegatesDirectly')) {
    assign(actions, {
      'replace-to-delegates-transitive': {
        group: 'edit',
        className: 'icon-RALph2-delegatesTransitively',
        title: this._translate('Replace for delegates transitively'),
        action: {
          click: function(event, element) {
            const newElement = elementFactory.createShape({ type: 'RALph:delegatesTransitively' });
            newElement.x = element.x + (newElement.width || element.width) / 2;
            newElement.y = element.y + (newElement.height || element.height) / 2;
            modeling.replaceShape(element, newElement);
          }
        }
      }
    });
  }

  if (is(businessObject, 'RALph:delegatesTransitively')) {
    assign(actions, {
      'replace-to-delegates-direct': {
        group: 'edit',
        className: 'icon-RALph2-delegatesDirectly',
        title: this._translate('Replace for delegates directly'),
        action: {
          click: function(event, element) {
            const newElement = elementFactory.createShape({ type: 'RALph:delegatesDirectly' });
            newElement.x = element.x + (newElement.width || element.width) / 2;
            newElement.y = element.y + (newElement.height || element.height) / 2;
            modeling.replaceShape(element, newElement);
          }
        }
      }
    });
  }
  // Acción de borrado
  assign(actions, {
    'delete': {
      group: 'edit',
      className: 'bpmn-icon-trash',
      title: this._translate('Remove'),
      action: {
        click: (event, element) => {
          this._modeling.removeElements([element]);
        }
      }
    }
  });

  return actions;
};

RALphContextPadProvider.$inject = [
  'config',
  'injector',
  'elementFactory',
  'connect',
  'create',
  'translate',   
  'modeling'
];
