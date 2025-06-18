import { assign } from 'min-dash';
import BasePaletteProvider from '../baseModeler/BasePaletteProvider';
import inherits from 'inherits';

/**
 * Hybrid palette provider that combines PPINOT and RALPH elements
 * Extends BasePaletteProvider to maintain the established architecture
 */
export default function HybridPaletteProvider(
    palette, create, elementFactory,
    spaceTool, lassoTool, handTool,
    globalConnect, translate) {

  // Create hybrid palette that includes both notations
  this._hybridPalette = new HybridNotationPalette(create, elementFactory, translate);
  
  // Call parent constructor with hybrid palette
  BasePaletteProvider.call(this, palette, create, elementFactory,
    spaceTool, lassoTool, handTool, globalConnect, translate, 
    [this._hybridPalette]);
    
  this._notationMode = 'hybrid';
}

inherits(HybridPaletteProvider, BasePaletteProvider);

HybridPaletteProvider.$inject = [
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
 * Set the notation mode for the palette
 */
HybridPaletteProvider.prototype.setNotationMode = function(mode) {
  this._notationMode = mode;
  if (this._hybridPalette.setNotationMode) {
    this._hybridPalette.setNotationMode(mode);
  }
};

/**
 * Hybrid notation palette that provides entries for both PPINOT and RALPH
 */
function HybridNotationPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;
  this._notationMode = 'hybrid';
}

HybridNotationPalette.prototype.setNotationMode = function(mode) {
  this._notationMode = mode;
};

HybridNotationPalette.prototype.getPaletteEntries = function() {
  var actions = {};
  var create = this._create;
  var elementFactory = this._elementFactory;
  var translate = this._translate;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }
      create.start(event, shape);
    }

    var shortType = type.replace(/^bpmn:/, '');
    return {
      group: group,
      className: className,
      title: title || translate('Create {type}', { type: shortType }),
      action: {
        dragstart: createListener,
        click: createListener
      }
    };
  }

  // PPINOT-specific elements
  if (this._notationMode === 'hybrid' || this._notationMode === 'ppinot') {
    assign(actions, {
      'create.ppinot-time-measure': createAction(
        'ppinot:TimeMeasure', 'ppinot', 'ppinot-icon-time-measure',
        translate('Create Time Measure')
      ),
      'create.ppinot-count-measure': createAction(
        'ppinot:CountMeasure', 'ppinot', 'ppinot-icon-count-measure',
        translate('Create Count Measure')
      ),
      'create.ppinot-state-condition': createAction(
        'ppinot:StateCondition', 'ppinot', 'ppinot-icon-state-condition',
        translate('Create State Condition')
      ),
      'create.ppinot-data-condition': createAction(
        'ppinot:DataCondition', 'ppinot', 'ppinot-icon-data-condition',
        translate('Create Data Condition')
      )
    });
  }

  // RALPH-specific elements
  if (this._notationMode === 'hybrid' || this._notationMode === 'ralph') {
    assign(actions, {
      'create.ralph-risk': createAction(
        'ralph:Risk', 'ralph', 'ralph-icon-risk',
        translate('Create Risk')
      ),
      'create.ralph-threat': createAction(
        'ralph:Threat', 'ralph', 'ralph-icon-threat',
        translate('Create Threat')
      ),
      'create.ralph-vulnerability': createAction(
        'ralph:Vulnerability', 'ralph', 'ralph-icon-vulnerability',
        translate('Create Vulnerability')
      ),
      'create.ralph-control': createAction(
        'ralph:Control', 'ralph', 'ralph-icon-control',
        translate('Create Control')
      )
    });
  }

  return actions;
};
