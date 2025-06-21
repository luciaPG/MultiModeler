import { assign } from 'min-dash';

/**
 * RALPH Notation Palette - provides only RALPH-specific palette entries
 * This class is NOT a palette provider, just a service that provides entries
 */
export default function RALPHNotationPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;

  console.log('🎨 RALPHNotationPalette service created');
}

RALPHNotationPalette.$inject = [
  'create',
  'elementFactory',
  'translate'
];

RALPHNotationPalette.prototype.getPaletteEntries = function() {
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
    // Separator before RALPH elements
    'ralph-separator': {
      group: 'ralph',
      separator: true
    },    // Basic RALPH resource elements
    'ralph-person': createAction(
      'RALph:Person', 'ralph', 'icon-ralph2-person',
      translate('Create Person')
    ),
    'ralph-role': createAction(
      'RALph:RoleRALph', 'ralph', 'icon-ralph2-role',
      translate('Create Role')
    ),
    'ralph-capability': createAction(
      'RALph:Personcap', 'ralph', 'icon-ralph2-capability',
      translate('Create Capability')
    ),
    'ralph-position': createAction(
      'RALph:Position', 'ralph', 'icon-ralph2-position',
      translate('Create Position')
    ),
    'ralph-orgunit': createAction(
      'RALph:Orgunit', 'ralph', 'icon-ralph2-orgunit',
      translate('Create Organizational Unit')
    )
  };
};
