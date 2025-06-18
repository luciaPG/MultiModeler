import {
  assign
} from 'min-dash';

/**
 * Factory para crear elementos híbridos PPINOT y RALPH
 */
export default function HybridElementFactory(bpmnFactory, moddle) {
  this._bpmnFactory = bpmnFactory;
  this._moddle = moddle;
}

HybridElementFactory.$inject = [ 'bpmnFactory', 'moddle' ];

HybridElementFactory.prototype.baseCreate = function(elementType, attrs) {
  return this._bpmnFactory.baseCreate(elementType, attrs);
};

HybridElementFactory.prototype.create = function(elementType, attrs) {
  return this._bpmnFactory.create(elementType, attrs);
};

HybridElementFactory.prototype.createRoot = function(attrs) {
  return this._bpmnFactory.createRoot(attrs);
};

HybridElementFactory.prototype.createLabel = function(attrs) {
  return this._bpmnFactory.createLabel(attrs);
};

HybridElementFactory.prototype.createShape = function(attrs) {
  var type = attrs.type;
  var size = this._getDefaultSize(type);
  
  // Aplicar tamaños por defecto según el tipo
  attrs = assign({
    width: size.width,
    height: size.height
  }, attrs);
  
  // Crear business object apropiado según el tipo
  if (!attrs.businessObject) {
    attrs.businessObject = this._createBusinessObject(type, attrs);
  }
  
  return this._bpmnFactory.createShape(attrs);
};

HybridElementFactory.prototype.createConnection = function(attrs) {
  return this._bpmnFactory.createConnection(attrs);
};

/**
 * Obtiene el tamaño por defecto para un tipo de elemento
 */
HybridElementFactory.prototype._getDefaultSize = function(type) {
  var sizes = {
    // Elementos PPINOT
    'ppinot:Measure': { width: 120, height: 60 },
    'ppinot:DerivedMeasure': { width: 120, height: 60 },
    'ppinot:AggregatedMeasure': { width: 120, height: 60 },
    'ppinot:TimeMeasure': { width: 120, height: 60 },
    'ppinot:CountMeasure': { width: 120, height: 60 },
    'ppinot:DataMeasure': { width: 120, height: 80 },
    'ppinot:PPI': { width: 140, height: 80 },
    
    // Elementos RALPH
    'ralph:Actor': { width: 100, height: 120 },
    'ralph:Role': { width: 100, height: 80 },
    'ralph:Goal': { width: 120, height: 60 },
    'ralph:SoftGoal': { width: 120, height: 60 },
    'ralph:Task': { width: 120, height: 60 },
    'ralph:Resource': { width: 100, height: 80 },
    'ralph:Plan': { width: 100, height: 80 },
    'ralph:Belief': { width: 100, height: 80 },
    
    // Default
    'default': { width: 100, height: 80 }
  };
  
  return sizes[type] || sizes['default'];
};

/**
 * Crea el business object apropiado para un tipo de elemento
 */
HybridElementFactory.prototype._createBusinessObject = function(type, attrs) {
  var businessObject = {};
  
  // Propiedades comunes
  businessObject.id = attrs.id || this._generateId(type);
  businessObject.name = attrs.name || this._getDefaultName(type);
  
  // Propiedades específicas por tipo
  if (type.startsWith('ppinot:')) {
    businessObject = this._createPPINOTBusinessObject(type, businessObject, attrs);
  } else if (type.startsWith('ralph:')) {
    businessObject = this._createRalphBusinessObject(type, businessObject, attrs);
  }
  
  return businessObject;
};

/**
 * Crea business object para elementos PPINOT
 */
HybridElementFactory.prototype._createPPINOTBusinessObject = function(type, bo, attrs) {
  switch (type) {
    case 'ppinot:Measure':
      bo.measureType = 'base';
      bo.unit = '';
      bo.scale = 'ratio';
      break;
      
    case 'ppinot:DerivedMeasure':
      bo.measureType = 'derived';
      bo.formula = '';
      bo.baseMeasures = [];
      break;
      
    case 'ppinot:AggregatedMeasure':
      bo.measureType = 'aggregated';
      bo.aggregationFunction = 'sum';
      bo.groupBy = null;
      break;
      
    case 'ppinot:TimeMeasure':
      bo.measureType = 'time';
      bo.unit = 'minutes';
      bo.timeMeasureType = 'duration';
      bo.considerWorking = false;
      break;
      
    case 'ppinot:CountMeasure':
      bo.measureType = 'count';
      bo.unit = 'instances';
      break;
      
    case 'ppinot:DataMeasure':
      bo.measureType = 'data';
      bo.dataElement = null;
      bo.attribute = null;
      break;
      
    case 'ppinot:PPI':
      bo.measures = [];
      bo.target = {
        value: null,
        operator: '>=',
        unit: ''
      };
      bo.responsible = '';
      bo.informed = [];
      break;
  }
  
  return bo;
};

/**
 * Crea business object para elementos RALPH
 */
HybridElementFactory.prototype._createRalphBusinessObject = function(type, bo, attrs) {
  switch (type) {
    case 'ralph:Actor':
      bo.roles = [];
      bo.capabilities = [];
      bo.goals = [];
      bo.beliefs = [];
      break;
      
    case 'ralph:Role':
      bo.responsibilities = [];
      bo.permissions = [];
      bo.constraints = [];
      break;
      
    case 'ralph:Goal':
      bo.priority = 'medium';
      bo.status = 'open';
      bo.subgoals = [];
      bo.plans = [];
      break;
      
    case 'ralph:SoftGoal':
      bo.priority = 'medium';
      bo.satisfactionLevel = 'unknown';
      bo.criteria = [];
      bo.contributions = [];
      break;
      
    case 'ralph:Task':
      bo.preconditions = [];
      bo.postconditions = [];
      bo.resources = [];
      bo.duration = null;
      break;
      
    case 'ralph:Resource':
      bo.resourceType = 'physical';
      bo.availability = 'available';
      bo.owner = null;
      bo.properties = {};
      break;
      
    case 'ralph:Plan':
      bo.steps = [];
      bo.conditions = [];
      bo.expectedOutcome = '';
      bo.alternatives = [];
      break;
      
    case 'ralph:Belief':
      bo.content = '';
      bo.confidence = 0.5;
      bo.source = '';
      bo.domain = '';
      break;
  }
  
  return bo;
};

/**
 * Genera un ID único para un elemento
 */
HybridElementFactory.prototype._generateId = function(type) {
  var prefix = type.replace(':', '_');
  var timestamp = Date.now().toString(36);
  var random = Math.random().toString(36).substr(2, 5);
  return prefix + '_' + timestamp + '_' + random;
};

/**
 * Obtiene el nombre por defecto para un tipo de elemento
 */
HybridElementFactory.prototype._getDefaultName = function(type) {
  var names = {
    // PPINOT
    'ppinot:Measure': 'Base Measure',
    'ppinot:DerivedMeasure': 'Derived Measure',
    'ppinot:AggregatedMeasure': 'Aggregated Measure',
    'ppinot:TimeMeasure': 'Time Measure',
    'ppinot:CountMeasure': 'Count Measure',
    'ppinot:DataMeasure': 'Data Measure',
    'ppinot:PPI': 'PPI',
    
    // RALPH
    'ralph:Actor': 'Actor',
    'ralph:Role': 'Role',
    'ralph:Goal': 'Goal',
    'ralph:SoftGoal': 'Soft Goal',
    'ralph:Task': 'Task',
    'ralph:Resource': 'Resource',
    'ralph:Plan': 'Plan',
    'ralph:Belief': 'Belief'
  };
  
  return names[type] || 'Element';
};
