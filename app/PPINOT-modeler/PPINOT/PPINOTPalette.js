import { 
  assign
} from 'min-dash';
import { PPINOTNotation } from './PPINOTElementFactory';

/**
 * PPINOT-specific palette service
 * This module provides PPINOT-specific palette entries
 */
export default function PPINOTPalette(create, elementFactory, translate) {
  this._create = create;
  this._elementFactory = elementFactory;
  this._translate = translate;

  console.log('🎨 PPINOTPalette service initialized');
}

PPINOTPalette.$inject = [
  'create',
  'elementFactory', 
  'translate'
];

PPINOTPalette.prototype.getPaletteEntries = function() {
  var create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool,
      handTool = this._handTool,
      globalConnect = this._globalConnect,
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

  function createSubprocess(event) {
    var subProcess = elementFactory.createShape({
      type: 'bpmn:SubProcess',
      x: 0,
      y: 0,
      isExpanded: true
    });

    var startEvent = elementFactory.createShape({
      type: 'bpmn:StartEvent',
      x: 40,
      y: 82,
      parent: subProcess
    });

    create.start(event, [subProcess, startEvent], {
      hints: {
        autoSelect: [startEvent]
      }
    });
  }

  function createParticipant(event, collapsed) {
    create.start(event, elementFactory.createParticipantShape(collapsed));
  }

  var actions = {};

  // Add BPMN tools first
  // Add PPINOT-specific elements
  assign(actions, {
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
      'PPINOT:Ppi', 'PPINOT', 'icon-PPINOT-ppi-palette',
      translate('Create PPI')
    ),
    'PPINOT-target': createAction(
      'PPINOT:Target', 'PPINOT', 'icon-PPINOT-target',
      translate('Create Target')
    ),
    'PPINOT-scope': createAction(
      'PPINOT:Scope', 'PPINOT', 'icon-PPINOT-scope',
      translate('Create Scope')
    )
  });

  console.log('🎨 PPINOTPalette returning entries:', Object.keys(actions));
  return actions;
};
