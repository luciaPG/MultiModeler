import {
  assign
} from 'min-dash';
 import Cat from './SVGs'

// Definición de la paleta del editor RALph
// Para añadir un icono usa:
// 'RALph-Person': createAction("RALph:Person", 'resources','icon-RALph2-person')
// El primer argumento es el tipo, el segundo el grupo, el tercero el icono definido en index.html
export default function PaletteProvider(
    palette, create, elementFactory,
    spaceTool, lassoTool, handTool,
    globalConnect, translate) {

  this._palette = palette;
  this._create = create;
  this._elementFactory = elementFactory;
  this._spaceTool = spaceTool;
  this._lassoTool = lassoTool;
  this._handTool = handTool;
  this._globalConnect = globalConnect;
  this._translate = translate;

  palette.registerProvider(this);
}

PaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool',
  'globalConnect',
  'translate'
];


PaletteProvider.prototype.getPaletteEntries = function(element) {

  var actions = {},
      create = this._create,
      elementFactory = this._elementFactory,
      spaceTool = this._spaceTool,
      lassoTool = this._lassoTool,
      handTool = this._handTool,
      globalConnect = this._globalConnect,
      translate = this._translate;

  // Asocia iconos de la paleta a objetos:
  // type: tipo de objeto
  // group: grupo en la paleta
  // className: icono en index.html
  // title: texto al pasar el ratón

  function createAction(type, group, className,title, options) {

    function createListener(event) {
      var shape = elementFactory.createShape(assign({ type: type }, options));
      shape.color = "#000"
      if (options) {
        shape.businessObject.di.isExpanded = options.isExpanded;
      }

      create.start(event, shape);
    }

    var shortType = type.replace(/^bpmn:/, '');
      
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

    create.start(event, [ subProcess, startEvent ], {
      hints: {
        autoSelect: [ startEvent ]
      }
    });
  }

  function createParticipant(event, collapsed) {
    create.start(event, elementFactory.createParticipantShape(collapsed));
  }

    // Definición de los iconos de la paleta mediante assign
  assign(actions, {
    'hand-tool': {
      group: 'tools',
      className: 'bpmn-icon-hand-tool',
      title: translate('Activate the hand tool'),
      action: {
        click: function(event) {
          handTool.activateHand(event);
        }
      }
    },
    'lasso-tool': {
      group: 'tools',
      className: 'bpmn-icon-lasso-tool',
      title: translate('Activate the lasso tool'),
      action: {
        click: function(event) {
          lassoTool.activateSelection(event);
        }
      }
    },
    'space-tool': {
      group: 'tools',
      className: 'bpmn-icon-space-tool',
      title: translate('Activate the create/remove space tool'),
      action: {
        click: function(event) {
          spaceTool.activateSelection(event);
        }
      }
    },
    'global-connect-tool': {
      group: 'tools',
      className: 'bpmn-icon-connection-multi',
      title: translate('Activate the global connect tool'),
      action: {
        click: function(event) {
          globalConnect.toggle(event);
        }
      }
    },
    'tool-separator': {
      group: 'tools',
      separator: true
    },
    'create.start-event': createAction(
        'bpmn:StartEvent', 'event', 'bpmn-icon-start-event-none',
        translate('Create StartEvent')
    ),
    'create.intermediate-event': createAction(
        'bpmn:IntermediateThrowEvent', 'event', 'bpmn-icon-intermediate-event-none',
        translate('Create Intermediate/Boundary Event')
    ),
    'create.end-event': createAction(
        'bpmn:EndEvent', 'event', 'bpmn-icon-end-event-none',
        translate('Create EndEvent')
    ),
    'create.exclusive-gateway': createAction(
        'bpmn:ExclusiveGateway', 'gateway', 'bpmn-icon-gateway-none',
        translate('Create Gateway')
    ),
    'create.task': createAction(
        'bpmn:Task', 'activity', 'bpmn-icon-task',
        translate('Create Task')
    ),
    'create.data-object': createAction(
        'bpmn:DataObjectReference', 'data-object', 'bpmn-icon-data-object',
        translate('Create DataObjectReference')
    ),
    'create.data-store': createAction(
        'bpmn:DataStoreReference', 'data-store', 'bpmn-icon-data-store',
        translate('Create DataStoreReference')
    ),
    'create.subprocess-expanded': {
      group: 'activity',
      className: 'bpmn-icon-subprocess-expanded',
      title: translate('Create expanded SubProcess'),
      action: {
        dragstart: createSubprocess,
        click: createSubprocess
      }
    },
    'create.participant-expanded': {
      group: 'collaboration',
      className: 'bpmn-icon-participant',
      title: translate('Create Pool/Participant'),
      action: {
        dragstart: createParticipant,
        click: createParticipant
      }
    },
    'create.group': createAction(
        'bpmn:Group', 'artifact', 'bpmn-icon-group',
        translate('Create Group')
    ),
    // Para crear grupos en la paleta se necesita un separador:
    'resources-entities-separator': {
      group: 'resources',
      separator: true
    },
    // Se usa createAction para asignar un icono a la paleta
    // El primer argumento es el tipo, el segundo el grupo, el tercero el icono definido en index.html
    'RALph-Person': createAction(
      "RALph:Person", 'resources','icon-RALph2-person' //'icon-RALph-person'
    ),
  
    'RALph-Role':createAction(
      "RALph:RoleRALph", 'resources' , 'icon-RALph2-role'//'icon-RALph-roleRalph'
    ),
        
    'RALph-Personcap':createAction(
      'RALph:Personcap','resources','icon-RALph2-capability'
    ),
    
    'RALph-Position':createAction(
      'RALph:Position','resources','icon-RALph2-position'
    ),

    'RALph-Orgunit':createAction(
      'RALph:Orgunit','resources','icon-RALph2-orgunit'
    ),
    
    'history-based-assignment-separator': {
      group: 'history-based-assignments',
      separator: true
    },
    'RALph-History-Any-Green':createAction(
      'RALph:History-Any-Green','history-based-assignments','icon-RALph2-history-any-green'
    ),
    'RALph-History-Any-Red':createAction(
      'RALph:History-Any-Red','history-based-assignments','icon-RALph2-history-any-red'
    ),
    'RALph-History-Same-Green':createAction(
      'RALph:History-Same-Green','history-based-assignments','icon-RALph2-history-same-green'
    ),
    'RALph-History-Same-Red':createAction(
      'RALph:History-Same-Red','history-based-assignments','icon-RALph2-history-same-red'
    ),
    'RALph-History-AnyInstanceInTime-Green':createAction(
      'RALph:History-AnyInstanceInTime-Green','history-based-assignments','icon-RALph2-history-instanceInTime-green'
    ),
    'RALph-History-AnyInstanceInTime-Red':createAction(
      'RALph:History-AnyInstanceInTime-Red','history-based-assignments','icon-RALph2-history-instanceInTime-red'
    ),
    'Complex-assignments': {
      group: 'Complex',
      separator: true
    },'RALph-OR':createAction(
      'RALph:Complex-Assignment-OR','Complex-assignments','icon-RALph2-OR'
    ),
    'RALph-AND':createAction(
      'RALph:Complex-Assignment-AND','Complex-assignments','icon-RALph2-AND'
    ),
    'Hierarchy-connectors': {
      group: 'hierarchy',
      separator: true
    },
    'RALph-Hierarchy-reports':createAction(
      'RALph:reportsDirectly','Hierarchy-connectors','icon-RALph2-reportsDirectlyPalette'
    ),
    'RALph-Hierarchy-delegates':createAction(
      'RALph:delegatesDirectly','Hierarchy-connectors','icon-RALph2-delegatesDirectlyPalette'
    )


      




  });

  return actions;
};
