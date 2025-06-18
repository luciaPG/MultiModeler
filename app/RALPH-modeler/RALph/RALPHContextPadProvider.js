import { assign } from 'min-dash';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default function RALPHContextPadProvider(
  config,
  injector,
  contextPad,
  create,
  elementFactory,
  connect,
  translate
) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._connect = connect;
  this._translate = translate;

  contextPad.registerProvider(this);
}

RALPHContextPadProvider.$inject = [
  'config',
  'injector',
  'contextPad',
  'create',
  'elementFactory',
  'connect',
  'translate'
];

RALPHContextPadProvider.prototype.getContextPadEntries = function(element) {
  const {
    create,
    elementFactory,
    connect,
    translate
  } = this;

  function createResource(event) {
    const shape = elementFactory.createShape({ type: 'ralph:Resource' });
    create.start(event, shape);
  }

  function createResourceType(event) {
    const shape = elementFactory.createShape({ type: 'ralph:ResourceType' });
    create.start(event, shape);
  }

  function createResourcePool(event) {
    const shape = elementFactory.createShape({ type: 'ralph:ResourcePool' });
    create.start(event, shape);
  }

  return {
    'create.resource': {
      group: 'create',
      className: 'bpmn-icon-task',
      title: translate('Create Resource'),
      action: {
        dragstart: createResource,
        click: createResource
      }
    },
    'create.resource-type': {
      group: 'create',
      className: 'bpmn-icon-task',
      title: translate('Create Resource Type'),
      action: {
        dragstart: createResourceType,
        click: createResourceType
      }
    },
    'create.resource-pool': {
      group: 'create',
      className: 'bpmn-icon-lane',
      title: translate('Create Resource Pool'),
      action: {
        dragstart: createResourcePool,
        click: createResourcePool
      }
    }
  };
}; 