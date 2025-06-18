import { assign } from 'min-dash';

export default function RALPHPaletteProvider(palette, create, elementFactory, globalConnect) {
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

      const shortType = type.replace(/^ralph:/, '');

      return {
        group: group,
        className: className,
        title: title || 'Create ' + shortType,
        action: {
          dragstart: createListener,
          click: createListener
        }
      };
    }    // RALPH elements
    assign(actions, {
      'ralph-separator': {
        group: 'ralph',
        separator: true
      },
      'create.ralph-resource': createAction(
        'ralph:Resource', 'ralph', 'bpmn-icon-participant',
        'Create RALPH Resource'
      ),
      'create.ralph-resource-type': createAction(
        'ralph:ResourceType', 'ralph', 'bpmn-icon-lane',
        'Create RALPH Resource Type'
      ),
      'create.ralph-resource-pool': createAction(
        'ralph:ResourcePool', 'ralph', 'bpmn-icon-group',
        'Create RALPH Resource Pool'
      ),
      'create.ralph-activity-resource': createAction(
        'ralph:ActivityResource', 'ralph', 'bpmn-icon-connection-multi',
        'Create RALPH Activity Resource'
      )
    });

    return actions;
  };
}

RALPHPaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'globalConnect'
];