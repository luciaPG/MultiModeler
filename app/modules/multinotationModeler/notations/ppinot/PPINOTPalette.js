import { assign } from 'min-dash';
import { PPINOTNotation } from './PPINOTElementFactory';


/**
 * PPINOT Notation Palette - provides only PPINOT-specific palette entries
 * This class is NOT a palette provider, just a service that provides entries
 */
export default function PPINOTPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;
}

PPINOTPalette.$inject = [
  'create',
  'elementFactory',
  'translate'
];

PPINOTPalette.prototype.getPaletteEntries = function() {
  var create = this._create,
      elementFactory = this._elementFactory,
      translate = this._translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      const size = PPINOTNotation.getElementSize(type);
      var shape = elementFactory.createShape(assign({ type: type }, size, options));
      shape.color = "#000";
      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }
      create.start(event, shape);
    }

    var shortType = type.replace(/^PPINOT:/, '');

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
    // Separator before PPINOT elements
    'PPINOT-separator': {
      group: 'PPINOT',
      separator: true
    },    // PPINOT elements - only basic palette elements
    'PPINOT-baseMeasure': createAction(
      'PPINOT:BaseMeasure', 'PPINOT', 'icon-PPINOT-baseMeasure',
      translate('Create Base Measure')
    ),
    'PPINOT-aggregatedMeasure': createAction(
      'PPINOT:AggregatedMeasure', 'PPINOT', 'icon-PPINOT-aggregatedMeasure',
      translate('Create Aggregated Measure')
    ),
    'PPINOT-ppi': createAction(
      'PPINOT:Ppi', 'PPINOT', 'icon-PPINOT-ppi',
      translate('Create PPI')
    ),
    'PPINOT-target': createAction(
      'PPINOT:Target', 'PPINOT', 'icon-PPINOT-target-mini',
      translate('Create Target')
    ),
    'PPINOT-scope': createAction(
      'PPINOT:Scope', 'PPINOT', 'icon-PPINOT-scope-mini',
      translate('Create Scope')
    )
  };
};
