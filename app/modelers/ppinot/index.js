// PPINOT Module - Integration for Process Performance Indicators
import { isPPINOTConnection } from '../../PPINOT-modeler/PPINOT/Types';
import PPINOTModdle from '../../PPINOT-modeler/PPINOT/PPINOTModdle.json';

// Factory function to create the PPINOT module
export default {
  __init__: ['ppinotRenderer', 'ppinotPalette', 'ppinotRules'],
  
  // Core PPINOT components
  ppinotRenderer: ['type', PPINOTRenderer],
  ppinotPalette: ['type', PPINOTPaletteProvider],
  ppinotRules: ['type', PPINOTRules],
  
  // Export PPINOT moddle for extension
  moddle: ['value', PPINOTModdle]
};

/**
 * PPINOT Renderer for visualizing PPI indicators
 */
function PPINOTRenderer(eventBus, styles, canvas) {
  this.eventBus = eventBus;
  this.styles = styles;
  this.canvas = canvas;
  
  // Register for rendering events
  eventBus.on('render.shape', this.onRenderShape.bind(this));
  eventBus.on('render.connection', this.onRenderConnection.bind(this));
}

PPINOTRenderer.prototype.onRenderShape = function(event) {
  const shape = event.gfx;
  const element = event.element;
  
  // Check if this is a PPINOT element
  if (element.type && element.type.startsWith('ppinot:')) {
    // Apply custom styling or rendering for PPINOT shapes
    this.renderPPINOTShape(shape, element);
  }
};

PPINOTRenderer.prototype.onRenderConnection = function(event) {
  const connection = event.gfx;
  const element = event.element;
  
  // Check if this is a PPINOT connection
  if (isPPINOTConnection(element)) {
    // Apply custom styling or rendering for PPINOT connections
    this.renderPPINOTConnection(connection, element);
  }
};

PPINOTRenderer.prototype.renderPPINOTShape = function(shape, element) {
  // Implementation would depend on specific PPINOT shape rendering
  // Apply custom styles, icons, etc.
};

PPINOTRenderer.prototype.renderPPINOTConnection = function(connection, element) {
  // Implementation would depend on specific PPINOT connection rendering
  // Apply custom styles, markers, etc.
};

// Inject PPINOT renderer dependencies
PPINOTRenderer.$inject = ['eventBus', 'styles', 'canvas'];

/**
 * PPINOT Palette Provider for adding PPI tools to the palette
 */
function PPINOTPaletteProvider(palette, create, elementFactory, translate) {
  this.palette = palette;
  this.create = create;
  this.elementFactory = elementFactory;
  this.translate = translate;
  
  // Register palette entries
  palette.registerProvider(this);
}

PPINOTPaletteProvider.prototype.getPaletteEntries = function() {
  const elementFactory = this.elementFactory;
  const create = this.create;
  const translate = this.translate;
  
  // Return PPINOT palette entries
  return {
    'create.ppinot-base-measure': {
      group: 'ppinot',
      className: 'ppinot-base-measure',
      title: translate('Base Measure'),
      action: {
        dragstart: createPPINOTElement('ppinot:BaseMeasure', 'Base Measure'),
        click: createPPINOTElement('ppinot:BaseMeasure', 'Base Measure')
      }
    },
    'create.ppinot-aggregated-measure': {
      group: 'ppinot',
      className: 'ppinot-aggregated-measure',
      title: translate('Aggregated Measure'),
      action: {
        dragstart: createPPINOTElement('ppinot:AggregatedMeasure', 'Aggregated Measure'),
        click: createPPINOTElement('ppinot:AggregatedMeasure', 'Aggregated Measure')
      }
    },
    'create.ppinot-derived-measure': {
      group: 'ppinot',
      className: 'ppinot-derived-measure',
      title: translate('Derived Measure'),
      action: {
        dragstart: createPPINOTElement('ppinot:DerivedMeasure', 'Derived Measure'),
        click: createPPINOTElement('ppinot:DerivedMeasure', 'Derived Measure')
      }
    }
  };
  
  // Helper to create PPINOT elements
  function createPPINOTElement(type, name) {
    return function(event) {
      const shape = elementFactory.createShape({
        type: type,
        name: name,
        isFrame: false,
        width: 100,
        height: 80
      });
      
      create.start(event, shape);
    };
  }
};

// Inject PPINOT palette provider dependencies
PPINOTPaletteProvider.$inject = ['palette', 'create', 'elementFactory', 'translate'];

/**
 * PPINOT Rules for validation and constraints
 */
function PPINOTRules(eventBus, modeling) {
  this.eventBus = eventBus;
  this.modeling = modeling;
  
  // Register for relevant events
  eventBus.on(['commandStack.shape.create.postExecute'], this.validatePPINOTElement.bind(this));
  eventBus.on(['commandStack.connection.create.postExecute'], this.validatePPINOTConnection.bind(this));
}

PPINOTRules.prototype.validatePPINOTElement = function(event) {
  const element = event.context.shape;
  
  // Check if this is a PPINOT element
  if (element.type && element.type.startsWith('ppinot:')) {
    // Validate PPINOT element
    this.validateElement(element);
  }
};

PPINOTRules.prototype.validatePPINOTConnection = function(event) {
  const connection = event.context.connection;
  
  // Check if this is a PPINOT connection
  if (isPPINOTConnection(connection)) {
    // Validate PPINOT connection
    this.validateConnection(connection);
  }
};

PPINOTRules.prototype.validateElement = function(element) {
  // Implementation would depend on specific PPINOT validation rules
  // For example, check if the element is in a valid position
};

PPINOTRules.prototype.validateConnection = function(connection) {
  // Implementation would depend on specific PPINOT connection validation rules
  // For example, check if the connection is between compatible elements
};

// Inject PPINOT rules dependencies
PPINOTRules.$inject = ['eventBus', 'modeling'];
