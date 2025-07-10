import inherits from 'inherits';

import {
  pick,
  assign
} from 'min-dash';

import CommandInterceptor from 'diagram-js/lib/command/CommandInterceptor';

import {
  add as collectionAdd,
  remove as collectionRemove
} from 'diagram-js/lib/util/Collections';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isExternalLabel } from './Types';

// Actualiza el businessObject de elementos PPINOT cuando hay cambios en el diagrama
export default function PPINOTUpdater(eventBus, modeling, bpmnjs) {

  CommandInterceptor.call(this, eventBus);

  // Inicializa el array PPINOTElements si no existe
  if (!bpmnjs._PPINOTElements) {
    bpmnjs._PPINOTElements = [];
  }

  // Inicializa arrays en los contenedores padre
  function initializeParentArrays(parent) {
    if (!parent || !parent.businessObject) {
      return;
    }

    var parentBO = parent.businessObject;
    
    // Pools
    if (is(parent, 'bpmn:Participant') && parentBO.processRef) {
      var process = parentBO.processRef;
      // Inicializa arrays requeridos por BpmnUpdater
      if (!process.flowElements) {
        process.flowElements = [];
      }
      if (!process.artifacts) {
        process.artifacts = [];
      }
      if (!process.children) {
        process.children = [];
      }
    } else if (is(parent, 'bpmn:Collaboration')) {
      // Colaboraciones: asegurar arrays
      if (!parentBO.participants) {
        parentBO.participants = [];
      }
      if (!parentBO.messageFlows) {
        parentBO.messageFlows = [];
      }
      if (!parentBO.artifacts) {
        parentBO.artifacts = [];
      }
    } else if (is(parent, 'bpmn:Process')) {
      // Procesos directos
      if (!parentBO.flowElements) {
        parentBO.flowElements = [];
      }
      if (!parentBO.artifacts) {
        parentBO.artifacts = [];
      }
    }
  }

  // Escucha reemplazo de elementos para manejar labels
  eventBus.on('shape.replace', function(event) {
    const oldShape = event.oldShape;
    const newShape = event.newShape;
    
    // Si el shape antiguo tenía label y el nuevo debe tenerlo
    if (oldShape.label && isExternalLabel(newShape)) {
      // El nuevo shape debe tener la referencia al label
      newShape.label = oldShape.label;
      newShape._hasExternalLabel = true;
      
      // Actualiza el labelTarget
      if (oldShape.label.labelTarget) {
        oldShape.label.labelTarget = newShape;
      }
    }
  });

  function updatePPINOTElement(e) {
    var context = e.context,
        shape = context.shape,
        businessObject = shape.businessObject;

    if (!isPPINOT(shape)) {
      return;
    }

    var parent = shape.parent;

    // Inicializa arrays del padre para evitar errores de BpmnUpdater
    initializeParentArrays(parent);

    // Asegura que PPINOTElements existe
    var PPINOTElements = bpmnjs._PPINOTElements = bpmnjs._PPINOTElements || [];

    // Añade o elimina el elemento de bpmnjs.PPINOTElements
    if (!parent) {
      collectionRemove(PPINOTElements, businessObject);
    } else {
      collectionAdd(PPINOTElements, businessObject);
    }

    // Guarda la posición del elemento PPINOT
    assign(businessObject, pick(shape, [ 'x', 'y' ]));
    
    // Manejo especial para creación de pools
    if (is(parent, 'bpmn:Participant') || is(parent, 'bpmn:Collaboration')) {
      // Contención correcta de elementos PPINOT en pools
      var process = parent.businessObject.processRef;
      if (process) {
        // Inicializa array children si no existe
        if (!process.children) {
          process.children = [];
        }
        
        // Si el proceso existe, asegura que el elemento PPINOT está en el proceso
        if (businessObject.$parent !== process) {
          // Elimina del padre actual
          if (businessObject.$parent && businessObject.$parent.children) {
            collectionRemove(businessObject.$parent.children, businessObject);
          }
          
          // Añade al proceso
          process.children.push(businessObject);
          businessObject.$parent = process;
        }
      }
    }
  }

  function updatePPINOTConnection(e) {
    var context = e.context,
        connection = context.connection,
        source = connection.source,
        target = context.target || connection.target,
        businessObject = connection.businessObject;

    if (!businessObject || !source || !target) {
      return false;
    }

    var parent = connection.parent;
    
    // Inicializa arrays del padre para evitar errores
    initializeParentArrays(parent);
    
    // Asegura que PPINOTElements es un array
    var PPINOTElements = bpmnjs._PPINOTElements = bpmnjs._PPINOTElements || [];

    // Comprueba si ya existe una conexión similar
    var existingSimilarConnection = PPINOTElements.find(function(element) {
      return element && element.type === businessObject.type &&
             element.source === source.id &&
             element.target === target.id;
    });

    // Si se crea una conexión nueva y ya existe una similar, evita duplicados
    if (e.command === 'connection.create' && existingSimilarConnection) {
      return false;
    }

    // Añade o elimina el elemento de bpmnjs.PPINOTElements
    if (!parent) {
      collectionRemove(PPINOTElements, businessObject);
    } else if (!existingSimilarConnection) {
      // Only add if no similar connection exists
      collectionAdd(PPINOTElements, businessObject);
    }

    // Valida y filtra waypoints
    if (connection.waypoints) {
      // Filtra waypoints inválidos
      var validWaypoints = connection.waypoints.filter(function(p) {
        return p && typeof p.x === 'number' && typeof p.y === 'number' && 
               !isNaN(p.x) && !isNaN(p.y) && isFinite(p.x) && isFinite(p.y);
      });

      // Solo actualiza si hay waypoints válidos
      if (validWaypoints.length >= 2) {
        assign(businessObject, {
          waypoints: validWaypoints.map(function(p) {
            return { x: p.x, y: p.y };
          })
        });
        // Actualiza los waypoints de la conexión
        connection.waypoints = validWaypoints;
      }
    }

    // Actualiza referencias de source y target
    if (source && target) {
      assign(businessObject, {
        source: source.id,
        target: target.id
      });
    }

    return true;
  }

  // Maneja actualizaciones de padre directamente
  eventBus.on('element.updateParent', function(event) {
    var context = event.context;
    var element = context.element;
    var oldParent = context.oldParent;
    var newParent = context.newParent;
    
    if (!isPPINOT(element)) {
      return;
    }
    
    // Inicializa arrays para ambos padres
    initializeParentArrays(oldParent);
    initializeParentArrays(newParent);
    
    var businessObject = element.businessObject;
    
    // Maneja cambio de padre
    if (newParent) {
      var newParentBO = newParent.businessObject;
      
      // Pools
      if (is(newParent, 'bpmn:Participant') && newParentBO.processRef) {
        newParentBO = newParentBO.processRef;
      }
      
      // Asegura que existe el array children
      if (!newParentBO.children) {
        newParentBO.children = [];
      }
      
      // Elimina del padre anterior
      if (businessObject.$parent && businessObject.$parent.children) {
        collectionRemove(businessObject.$parent.children, businessObject);
      }
      
      // Añade al nuevo padre
      newParentBO.children.push(businessObject);
      businessObject.$parent = newParentBO;
    } else if (oldParent && businessObject.$parent) {
      // Solo elimina del padre anterior
      if (businessObject.$parent.children) {
        collectionRemove(businessObject.$parent.children, businessObject);
      }
      businessObject.$parent = null;
    }
  });

  this.executed([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifPPINOTElement(updatePPINOTElement));

  this.reverted([
    'shape.create',
    'shape.move',
    'shape.delete'
  ], ifPPINOTElement(updatePPINOTElement));

  this.executed([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifPPINOTElement(updatePPINOTConnection));

  this.reverted([
    'connection.create',
    'connection.reconnectStart',
    'connection.reconnectEnd',
    'connection.updateWaypoints',
    'connection.delete',
    'connection.layout',
    'connection.move'
  ], ifPPINOTElement(updatePPINOTConnection));


  // Al transformar un Process en Collaboration o viceversa, actualiza los padres de los elementos PPINOT
  function updatePPINOTElementsRoot(event) {
    var context = event.context,
        oldRoot = context.oldRoot,
        newRoot = context.newRoot,
        children = oldRoot.children;

    var PPINOTChildren = children.filter(isPPINOT);

    if (PPINOTChildren.length) {
      modeling.moveElements(PPINOTChildren, { x: 0, y: 0 }, newRoot);
    }
  }

  this.postExecute('canvas.updateRoot', updatePPINOTElementsRoot);
}

inherits(PPINOTUpdater, CommandInterceptor);

PPINOTUpdater.$inject = [ 'eventBus', 'modeling', 'bpmnjs' ];


/////// helpers ///////////////////////////////////

function isPPINOT(element) {
  return element && /PPINOT:/.test(element.type);
}

function ifPPINOTElement(fn) {
  return function(event) {
    var context = event.context,
        element = context.shape || context.connection;

    if (isPPINOT(element)) {
      fn(event);
    }
  };
}