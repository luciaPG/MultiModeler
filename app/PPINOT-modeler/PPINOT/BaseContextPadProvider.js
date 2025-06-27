import BaseElementProvider from './BaseElementProvider';

/**
 * Base Context Pad Provider that delegates to appropriate providers based on element type
 */
function BaseContextPadProvider(contextPad, injector) {
  this._contextPad = contextPad;
  this._injector = injector;
  
  // Get providers for different element types
  this._bpmnProvider = null;
  this._ppinotProvider = null;
  this._ralphProvider = null;
  
  // Try to get BPMN provider
  try {
    this._bpmnProvider = injector.get('contextPadProvider');
  } catch (e) {
    // BPMN provider not available
  }
  
  // Try to get PPINOT provider
  try {
    this._ppinotProvider = injector.get('ppinotContextPadProvider');
  } catch (e) {
    // PPINOT provider not available
  }
  
  // Try to get RALPH provider (for future use)
  try {
    this._ralphProvider = injector.get('ralphContextPadProvider');
  } catch (e) {
    // RALPH provider not available
  }

  this.register();
}

BaseContextPadProvider.$inject = [
  'contextPad',
  'injector'
];

/**
 * Register this provider
 */
BaseContextPadProvider.prototype.register = function() {
  this._contextPad.registerProvider(this);
};

/**
 * Get context pad entries for element
 */
BaseContextPadProvider.prototype.getContextPadEntries = function(element) {
  var elementType = BaseElementProvider.getElementType(element);
  
  switch (elementType) {
    case 'ppinot':
      return this._ppinotProvider ? this._ppinotProvider.getContextPadEntries(element) : {};
    case 'ralph':
      return this._ralphProvider ? this._ralphProvider.getContextPadEntries(element) : {};
    case 'bpmn':
      return this._bpmnProvider ? this._bpmnProvider.getContextPadEntries(element) : {};
    default:
      return {};
  }
};

export default BaseContextPadProvider;
