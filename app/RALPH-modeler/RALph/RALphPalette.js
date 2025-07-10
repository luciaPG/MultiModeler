import {
  assign
} from 'min-dash';
 import Cat from './SVGs'

/**
 * here is defined the palette of the editor
 */

 /*To define an icon in the palette you have to use this function:
    
    'RALph-Person': createAction(
      "RALph:Person", 'resources','icon-RALph2-person' //'icon-RALph-person'
    ),

    The first argument is the element linked to the icon, the second is a group separator, and the third is the icon, which is defined in the index.html 
 */
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

  //this function links the palette icons to objects, and requires this parameters:
  //type:object to be linked
  //group: group to which the icon belongs, inside the palette
  //className:name of the icon in the index.html
  //title:text that appears when you highlight the icon

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

  //here we define the icons of the palette with the assign function, which determines the elements to renderer in the palette
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
    //to create groups in the palette it is needed a separator:
    'resources-entities-separator': {
      group: 'resources',
      separator: true
    },
    //it is used the function createAction to assign an icon to the palette 
    //the first argument is the element linked to the icon, the second the group separator, and the third is the icon, which is defined in the index.html 
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
