import { 
  assign
} from 'min-dash';
import BasePaletteProvider from '../../baseModeler/BasePaletteProvider';
import inherits from 'inherits';

/**
 * PPINOT-specific palette provider that extends BasePaletteProvider
 * This module provides PPINOT-specific elements for the palette
 */
export default function PPINOTPaletteProvider(
    palette, create, elementFactory,
    spaceTool, lassoTool, handTool,
    globalConnect, translate) {

  // Create PPINOT notation palette
  this._ppinotPalette = new PPINOTNotationPalette(create, elementFactory, translate);
  
  // Call parent constructor with PPINOT palette
  BasePaletteProvider.call(this, palette, create, elementFactory,
    spaceTool, lassoTool, handTool, globalConnect, translate, 
    [this._ppinotPalette]);
}

inherits(PPINOTPaletteProvider, BasePaletteProvider);

PPINOTPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool',
  'globalConnect',
  'translate'
];

/**
 * PPINOT Notation Palette - contains only PPINOT-specific elements
 */
function PPINOTNotationPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;
}

PPINOTNotationPalette.prototype.getPaletteEntries = function() {
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
    },

    // PPINOT elements
    'PPINOT-baseMeasure': createAction(
      'PPINOT:BaseMeasure', 'PPINOT', 'icon-baseMeasure',
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
      'PPINOT:Target', 'PPINOT', 'icon-target',
      translate('Create Target')
    ),
    'PPINOT-scope': createAction(
      'PPINOT:Scope', 'PPINOT', 'icon-scope',
      translate('Create Scope')
    )  };
};


