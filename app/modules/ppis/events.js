/**
 * Event constants for PPI module
 */
export const EVENTS = {
  // App/Core
  CORE_INITIALIZED: 'core.initialized',

  // BPMN lifecycle
  BPMN_MODELER_INITIALIZED: 'bpmn.modeler.initialized',
  BPMN_DIAGRAM_LOADED: 'bpmn.diagram.loaded',
  BPMN_MODELER_CHANGED: 'bpmn.modeler.changed',

  // BPMN low-level
  ELEMENT_ADDED: 'element.added',
  ELEMENT_REMOVED: 'element.removed',
  ELEMENT_CHANGED: 'element.changed',
  ELEMENT_MOVED: 'element.move.end',
  SHAPE_CHANGED: 'shape.changed',
  CREATE_END: 'create.end',
  CONNECT_END: 'connect.end',
  CMD_CREATE_EXECUTED: 'commandStack.element.create.executed',
  CMD_UPDATE_PROPS_EXECUTED: 'commandStack.element.updateProperties.executed',

  // Editing
  DIRECT_EDITING_COMPLETE: 'directEditing.complete',

  // Selection
  SELECTION_CHANGED: 'selection.changed'
};
