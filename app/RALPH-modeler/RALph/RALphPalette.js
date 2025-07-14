import { assign } from 'min-dash';

/**
 * RALph Notation Palette - provides only RALph-specific palette entries
 * Esta clase NO es un provider, solo devuelve las entradas de la paleta
 */
export default function RALphPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;
}

RALphPalette.$inject = [
  'create',
  'elementFactory',
  'translate'
];

RALphPalette.prototype.getPaletteEntries = function() {
  var create = this._create,
      elementFactory = this._elementFactory,
      translate = this._translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      shape.color = "#000";
      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }
      create.start(event, shape);
    }

    var shortType = type.replace(/^RALph:/, '');

    return {
      group: group,
      className: className,
      title: title || 'Create ' + shortType,
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  }

  return {
    'RALph-separator': {
      group: 'RALph',
      separator: true
    },
    'RALph-Person': createAction(
      "RALph:Person", 'resources', 'icon-RALph2-person', translate('Create Person')
    ),
    'RALph-Role': createAction(
      "RALph:RoleRALph", 'resources', 'icon-RALph2-role', translate('Create Role')
    ),
    'RALph-Personcap': createAction(
      'RALph:Personcap', 'resources', 'icon-RALph2-capability', translate('Create Capability')
    ),
    'RALph-Position': createAction(
      'RALph:Position', 'resources', 'icon-RALph2-position', translate('Create Position')
    ),
    'RALph-Orgunit': createAction(
      'RALph:Orgunit', 'resources', 'icon-RALph2-orgunit', translate('Create Orgunit')
    ),
    'RALph-History-Any-Green': createAction(
      'RALph:History-Any-Green', 'history-based-assignments', 'icon-RALph2-history-any-green', translate('Create History Any Green')
    ),
    'RALph-History-Any-Red': createAction(
      'RALph:History-Any-Red', 'history-based-assignments', 'icon-RALph2-history-any-red', translate('Create History Any Red')
    ),
    'RALph-History-Same-Green': createAction(
      'RALph:History-Same-Green', 'history-based-assignments', 'icon-RALph2-history-same-green', translate('Create History Same Green')
    ),
    'RALph-History-Same-Red': createAction(
      'RALph:History-Same-Red', 'history-based-assignments', 'icon-RALph2-history-same-red', translate('Create History Same Red')
    ),
    'RALph-History-AnyInstanceInTime-Green': createAction(
      'RALph:History-AnyInstanceInTime-Green', 'history-based-assignments', 'icon-RALph2-history-instanceInTime-green', translate('Create History Any Instance In Time Green')
    ),
    'RALph-History-AnyInstanceInTime-Red': createAction(
      'RALph:History-AnyInstanceInTime-Red', 'history-based-assignments', 'icon-RALph2-history-instanceInTime-red', translate('Create History Any Instance In Time Red')
    ),
    'RALph-OR': createAction(
      'RALph:Complex-Assignment-OR', 'Complex-assignments', 'icon-RALph2-OR', translate('Create OR')
    ),
    'RALph-AND': createAction(
      'RALph:Complex-Assignment-AND', 'Complex-assignments', 'icon-RALph2-AND', translate('Create AND')
    ),
    'RALph-Hierarchy-reports': createAction(
      'RALph:reportsDirectly', 'Hierarchy-connectors', 'icon-RALph2-reportsDirectly', translate('Create Reports Directly')
    ),
    'RALph-Hierarchy-delegates': createAction(
      'RALph:delegatesDirectly', 'Hierarchy-connectors', 'icon-RALph2-delegatesDirectly', translate('Create Delegates Directly')
    ),
    'RALph-Hierarchy-reports-transitively': createAction(
      'RALph:reportsTransitively', 'Hierarchy-connectors', 'icon-RALph2-reportsTransitively', translate('Create Reports Transitively')
    ),
    'RALph-Hierarchy-delegates-transitively': createAction(
      'RALph:delegatesTransitively', 'Hierarchy-connectors', 'icon-RALph2-delegatesTransitively', translate('Create Delegates Transitively')
    )
  };
};
