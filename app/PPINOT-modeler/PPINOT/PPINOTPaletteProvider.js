import { assign } from 'min-dash';

export default function PPINOTPaletteProvider(palette, create, elementFactory, globalConnect) {
  this._palette = palette;
  this._create = create;
  this._elementFactory = elementFactory;
  this._globalConnect = globalConnect;

  palette.registerProvider(this);
  this.getPaletteEntries = function() {
    const actions = {},
          create = this._create,
          elementFactory = this._elementFactory;

    function createAction(type, group, className, title, options) {
      function createListener(event) {
        const shape = elementFactory.createShape(assign({ type: type }, options));
        
        if (options) {
          shape.businessObject.di.isExpanded = options.isExpanded;
        }

        create.start(event, shape);
      }

      const shortType = type.replace(/^ppinot:/, '');

      return {
        group: group,
        className: className,
        title: title || 'Create ' + shortType,
        action: {
          dragstart: createListener,
          click: createListener
        }
      };
    }    // PPINOT elements
    assign(actions, {
      'ppinot-separator': {
        group: 'ppinot',
        separator: true
      },
      'create.ppinot-measure': createAction(
        'PPINOT:BaseMeasure', 'ppinot', 'bpmn-icon-task',
        'Create PPINOT Base Measure'
      ),
      'create.ppinot-count-measure': createAction(
        'PPINOT:CountMeasure', 'ppinot', 'bpmn-icon-task-user',
        'Create PPINOT Count Measure'
      ),
      'create.ppinot-time-measure': createAction(
        'PPINOT:TimeMeasure', 'ppinot', 'bpmn-icon-task-manual',
        'Create PPINOT Time Measure'
      ),
      'create.ppinot-data-measure': createAction(
        'PPINOT:DataMeasure', 'ppinot', 'bpmn-icon-task-business-rule',
        'Create PPINOT Data Measure'
      ),
      'create.ppinot-aggregated-measure': createAction(
        'PPINOT:AggregatedMeasure', 'ppinot', 'bpmn-icon-task-script',
        'Create PPINOT Aggregated Measure'
      ),
      'create.ppinot-target': createAction(
        'PPINOT:Target', 'ppinot', 'bpmn-icon-end-event-none',
        'Create PPINOT Target'
      ),
      'create.ppinot-scope': createAction(
        'PPINOT:Scope', 'ppinot', 'bpmn-icon-subprocess-collapsed',
        'Create PPINOT Scope'
      )
    });

    return actions;
  };
}

PPINOTPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'globalConnect'
]; 