import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';

/**
 * Base Element Provider utilities for detecting element types
 */
const BaseElementProvider = {
  /**
   * Check if element is a PPINOT element
   * @param {djs.model.Base} element
   * @return {boolean}
   */
  isPPINOTElement: function(element) {
    if (!element || !element.businessObject) {
      return false;
    }
    
    // Check if it's a PPINOT shape
    if (isPPINOTShape(element)) {
      return true;
    }
    
    // Check business object type
    var boType = element.businessObject.$type || element.businessObject.type || '';
    return boType.startsWith && boType.startsWith('PPINOT:');
  },

  /**
   * Check if element is a RALPH element
   * @param {djs.model.Base} element
   * @return {boolean}
   */
  isRALPHElement: function(element) {
    if (!element || !element.businessObject) {
      return false;
    }
    
    var boType = element.businessObject.$type || element.businessObject.type || '';
    return boType.startsWith && boType.startsWith('ralph:');
  },

  /**
   * Check if element is a BPMN element
   * @param {djs.model.Base} element
   * @return {boolean}
   */
  isBPMNElement: function(element) {
    if (!element || !element.businessObject) {
      return false;
    }
    
    // If it's PPINOT or RALPH, it's not pure BPMN
    if (BaseElementProvider.isPPINOTElement(element) || BaseElementProvider.isRALPHElement(element)) {
      return false;
    }
    
    var boType = element.businessObject.$type || element.businessObject.type || '';
    return boType.startsWith && boType.startsWith('bpmn:');
  },

  /**
   * Get element type classification
   * @param {djs.model.Base} element
   * @return {string} 'ppinot', 'ralph', 'bpmn', or 'unknown'
   */
  getElementType: function(element) {
    if (BaseElementProvider.isPPINOTElement(element)) {
      return 'ppinot';
    }
    if (BaseElementProvider.isRALPHElement(element)) {
      return 'ralph';
    }
    if (BaseElementProvider.isBPMNElement(element)) {
      return 'bpmn';
    }
    return 'unknown';
  }
};

/**
 * Base Replace Menu Provider that delegates to appropriate providers based on element type
 */
function BaseReplaceMenuProvider(popupMenu, injector) {
  this._popupMenu = popupMenu;
  this._injector = injector;
  
  console.log('🔧 BaseReplaceMenuProvider initializing...');
  
  // Get providers for different element types
  this._bpmnProvider = null;
  this._ppinotProvider = null;
  this._ralphProvider = null;
  
  // Try to get existing BPMN provider (if any)
  try {
    this._bpmnProvider = injector.get('bpmnReplaceMenuProvider', false);
  } catch (e) {
    console.log('BPMN replace provider not available');
  }
  
  // Try to get PPINOT provider
  try {
    this._ppinotProvider = injector.get('PPINOTReplaceMenuProvider');
    console.log('✅ PPINOT replace provider loaded');
  } catch (e) {
    console.log('❌ PPINOT replace provider not available:', e.message);
  }
  
  // Try to get RALPH provider (for future use)
  try {
    this._ralphProvider = injector.get('RALPHReplaceMenuProvider', false);
    if (this._ralphProvider) {
      console.log('✅ RALPH replace provider loaded');
    }
  } catch (e) {
    console.log('RALPH replace provider not available');
  }

  this.register();
  console.log('🔧 BaseReplaceMenuProvider registered');
}

BaseReplaceMenuProvider.$inject = [
  'popupMenu',
  'injector'
];

/**
 * Register this provider
 */
BaseReplaceMenuProvider.prototype.register = function() {
  console.log('🔧 Registering BaseReplaceMenuProvider as "replace"');
  this._popupMenu.registerProvider('replace', this);
};

/**
 * Get replace menu entries for element
 */
BaseReplaceMenuProvider.prototype.getEntries = function(element) {
  console.log('🔧 BaseReplaceMenuProvider.getEntries called for:', element.businessObject && element.businessObject.$type);
  
  var elementType = BaseElementProvider.getElementType(element);
  console.log('🔧 Element type detected:', elementType);
  
  switch (elementType) {
    case 'ppinot':
      if (this._ppinotProvider) {
        console.log('🔧 Delegating to PPINOT provider');
        var entries = this._ppinotProvider.getEntries(element);
        console.log('🔧 PPINOT provider returned', entries.length, 'entries');
        return entries;
      }
      break;
    case 'ralph':
      return this._ralphProvider ? this._ralphProvider.getEntries(element) : [];
    case 'bpmn':
      return this._bpmnProvider ? this._bpmnProvider.getEntries(element) : [];
    default:
      console.log('🔧 Unknown element type, returning empty entries');
      return [];
  }
  
  console.log('🔧 No appropriate provider found, returning empty entries');
  return [];
};

/**
 * Get header entries for element
 */
BaseReplaceMenuProvider.prototype.getHeaderEntries = function(element) {
  console.log('🔧 BaseReplaceMenuProvider.getHeaderEntries called for:', element.businessObject && element.businessObject.$type);
  
  var elementType = BaseElementProvider.getElementType(element);
  console.log('🔧 Element type detected for headers:', elementType);
  
  switch (elementType) {
    case 'ppinot':
      if (this._ppinotProvider) {
        console.log('🔧 Delegating headers to PPINOT provider');
        var headers = this._ppinotProvider.getHeaderEntries(element);
        console.log('🔧 PPINOT provider returned', headers.length, 'headers');
        return headers;
      }
      break;
    case 'ralph':
      return this._ralphProvider ? this._ralphProvider.getHeaderEntries(element) : [];
    case 'bpmn':
      return this._bpmnProvider ? this._bpmnProvider.getHeaderEntries(element) : [];
    default:
      console.log('🔧 Unknown element type, returning empty headers');
      return [];
  }
  
  console.log('🔧 No appropriate provider found, returning empty headers');
  return [];
};

export default BaseReplaceMenuProvider;
