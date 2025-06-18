import {
  assign
} from 'min-dash';

/**
 * Provider de paleta híbrido que combina elementos de PPINOT y RALPH
 */
export default function HybridPaletteProvider(
    palette, create, elementFactory, 
    spaceTool, lassoTool, handTool, eventBus) {

  this._palette = palette;
  this._create = create;
  this._elementFactory = elementFactory;
  this._spaceTool = spaceTool;
  this._lassoTool = lassoTool;
  this._handTool = handTool;
  this._eventBus = eventBus;

  // Estado de las notaciones activas
  this._activeNotations = new Set(['ppinot', 'ralph']);

  palette.registerProvider(this);
  
  // Escuchar cambios en las notaciones activas
  eventBus.on('notations.changed', (event) => {
    this._activeNotations = new Set(event.active);
    // La paleta se actualizará automáticamente
  });
}

HybridPaletteProvider.$inject = [
  'palette',
  'create', 
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool',
  'eventBus'
];

HybridPaletteProvider.prototype.getPaletteEntries = function(element) {
  var actions = {},
      create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool,
      handTool = this._handTool;

  function createAction(type, group, className, title, options) {
    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      
      if (options) {
        shape = assign(shape, options);
      }
      
      create.start(event, shape);
    }

    var shortType = type.replace(/^(ppinot|ralph):/, '');

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

  // Herramientas básicas (siempre disponibles)
  assign(actions, {
    'hand-tool': {
      group: 'tools',
      className: 'djs-palette-entry',
      title: 'Activate the hand tool',
      action: {
        click: function(event) {
          handTool.activateHand(event);
        }
      }
    },
    'lasso-tool': {
      group: 'tools', 
      className: 'djs-palette-entry',
      title: 'Activate the lasso tool',
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'djs-palette-entry',
      title: 'Activate the create/remove space tool',
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    }
  });

  // Elementos PPINOT (solo si está activa la notación)
  if (this._activeNotations.has('ppinot')) {
    assign(actions, {
      'ppinot-separator': {
        group: 'ppinot',
        className: 'group-label ppinot',
        title: 'PPINOT Elements',
        separator: true
      },
      'create.ppinot-measure': createAction(
        'ppinot:Measure', 'ppinot', 'palette-element ppinot-icon-measure',
        'Create Base Measure',
        { 
          businessObject: { name: 'Base Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-derived-measure': createAction(
        'ppinot:DerivedMeasure', 'ppinot', 'palette-element ppinot-icon-derived-measure',
        'Create Derived Measure',
        { 
          businessObject: { name: 'Derived Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-aggregated-measure': createAction(
        'ppinot:AggregatedMeasure', 'ppinot', 'palette-element ppinot-icon-aggregated-measure',
        'Create Aggregated Measure',
        { 
          businessObject: { name: 'Aggregated Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-time-measure': createAction(
        'ppinot:TimeMeasure', 'ppinot', 'palette-element ppinot-icon-time-measure',
        'Create Time Measure',
        { 
          businessObject: { name: 'Time Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-count-measure': createAction(
        'ppinot:CountMeasure', 'ppinot', 'palette-element ppinot-icon-count-measure',
        'Create Count Measure',
        { 
          businessObject: { name: 'Count Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-data-measure': createAction(
        'ppinot:DataMeasure', 'ppinot', 'palette-element ppinot-icon-data-measure',
        'Create Data Measure',
        { 
          businessObject: { name: 'Data Measure' },
          width: 120,
          height: 60
        }
      ),
      'create.ppinot-ppi': createAction(
        'ppinot:PPI', 'ppinot', 'palette-element ppinot-icon-ppi',
        'Create Process Performance Indicator',
        { 
          businessObject: { name: 'PPI' },
          width: 140,
          height: 80
        }
      )
    });
  }

  // Elementos RALPH (solo si está activa la notación)
  if (this._activeNotations.has('ralph')) {
    assign(actions, {
      'ralph-separator': {
        group: 'ralph',
        className: 'group-label ralph',
        title: 'RALPH Elements', 
        separator: true
      },
      'create.ralph-actor': createAction(
        'ralph:Actor', 'ralph', 'palette-element ralph-icon-actor',
        'Create Actor',
        { 
          businessObject: { name: 'Actor' },
          width: 100,
          height: 120
        }
      ),
      'create.ralph-role': createAction(
        'ralph:Role', 'ralph', 'palette-element ralph-icon-role',
        'Create Role',
        { 
          businessObject: { name: 'Role' },
          width: 100,
          height: 80
        }
      ),
      'create.ralph-goal': createAction(
        'ralph:Goal', 'ralph', 'palette-element ralph-icon-goal',
        'Create Goal',
        { 
          businessObject: { name: 'Goal' },
          width: 120,
          height: 60
        }
      ),
      'create.ralph-soft-goal': createAction(
        'ralph:SoftGoal', 'ralph', 'palette-element ralph-icon-soft-goal',
        'Create Soft Goal',
        { 
          businessObject: { name: 'Soft Goal' },
          width: 120,
          height: 60
        }
      ),
      'create.ralph-task': createAction(
        'ralph:Task', 'ralph', 'palette-element ralph-icon-task',
        'Create Task',
        { 
          businessObject: { name: 'Task' },
          width: 120,
          height: 60
        }
      ),
      'create.ralph-resource': createAction(
        'ralph:Resource', 'ralph', 'palette-element ralph-icon-resource',
        'Create Resource',
        { 
          businessObject: { name: 'Resource' },
          width: 100,
          height: 80
        }
      ),
      'create.ralph-plan': createAction(
        'ralph:Plan', 'ralph', 'palette-element ralph-icon-plan',
        'Create Plan',
        { 
          businessObject: { name: 'Plan' },
          width: 100,
          height: 80
        }
      ),
      'create.ralph-belief': createAction(
        'ralph:Belief', 'ralph', 'palette-element ralph-icon-belief',
        'Create Belief',
        { 
          businessObject: { name: 'Belief' },
          width: 100,
          height: 80
        }
      )
    });
  }

  return actions;
};

/**
 * Actualiza las notaciones activas
 * @param {string[]} notations - Array de notaciones activas
 */
HybridPaletteProvider.prototype.setActiveNotations = function(notations) {
  this._activeNotations = new Set(notations);
};
