import { assign } from 'min-dash';
import BasePaletteProvider from '../../baseModeler/BasePaletteProvider';
import inherits from 'inherits';

/**
 * Example notation palette provider showing how easy it is to add new notations
 * This serves as a template for creating additional notation-specific palettes
 */
export default function ExampleNotationPaletteProvider(
    palette, create, elementFactory,
    spaceTool, lassoTool, handTool,
    globalConnect, translate) {

  // Create Example notation palette
  this._examplePalette = new ExampleNotationPalette(create, elementFactory, translate);
  
  // Call parent constructor with Example palette
  BasePaletteProvider.call(this, palette, create, elementFactory,
    spaceTool, lassoTool, handTool, globalConnect, translate, 
    [this._examplePalette]);
}

inherits(ExampleNotationPaletteProvider, BasePaletteProvider);

ExampleNotationPaletteProvider.$inject = [
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
 * Example Notation Palette - contains only Example-specific elements
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
      shape.color = "#000";
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
    // Separator before Example elements
    'Example-separator': {
      group: 'Example',
      separator: true
    },

    // Example elements - replace these with your actual notation elements
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
