import { assign } from 'min-dash';
import inherits from 'inherits';
import BasePaletteProvider from '../baseModeler/BasePaletteProvider';

/**
 * Palette provider that merges Example and PPINOT palettes
 */
export default function MultiNotationPaletteProvider(
  palette, create, elementFactory,
  spaceTool, lassoTool, handTool,
  globalConnect, translate) {

  // Instantiate notation-specific palettes
  this._examplePalette = new ExampleNotationPalette(create, elementFactory, translate);
  this._ppinotPalette = new PPINOTNotationPalette(create, elementFactory, translate);

  // Call parent constructor with both palettes
  BasePaletteProvider.call(this, palette, create, elementFactory,
    spaceTool, lassoTool, handTool, globalConnect, translate,
    [this._examplePalette, this._ppinotPalette]);
}

inherits(MultiNotationPaletteProvider, BasePaletteProvider);

MultiNotationPaletteProvider.$inject = [
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
 * Example notation palette entries
 */
function ExampleNotationPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;
}

ExampleNotationPalette.prototype.getPaletteEntries = function() {
  var create = this._create,
      elementFactory = this._elementFactory,
      translate = this._translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      shape.color = '#000';
      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }
      create.start(event, shape);
    }

    var shortType = type.replace(/^Example:/, '');

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
    'Example-separator': {
      group: 'Example',
      separator: true
    },
    'Example-element1': createAction(
      'Example:Element1', 'Example', 'icon-example-element1',
      translate('Create Example Element 1')
    ),
    'Example-element2': createAction(
      'Example:Element2', 'Example', 'icon-example-element2',
      translate('Create Example Element 2')
    ),
    'Example-connector': createAction(
      'Example:Connector', 'Example', 'icon-example-connector',
      translate('Create Example Connector')
    )
  };
};

/**
 * PPINOT notation palette entries
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
      shape.color = '#000';
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
    'PPINOT-separator': {
      group: 'PPINOT',
      separator: true
    },
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
    )
  };
};

