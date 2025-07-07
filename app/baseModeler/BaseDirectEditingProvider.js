import DirectEditingProvider from 'bpmn-js/lib/features/direct-editing/DirectEditingProvider';

/**
 * BaseDirectEditingProvider: Extends bpmn-js DirectEditingProvider to provide unified label editing
 * for both BPMN and custom elements (PPINOT/RALPH)
 */
class BaseDirectEditingProvider extends DirectEditingProvider {
  constructor(eventBus, canvas, modeling, commandStack, config) {
    super(eventBus, canvas, modeling, commandStack, config);
    
    this._eventBus = eventBus;
    this._canvas = canvas;
    this._modeling = modeling;
    this._commandStack = commandStack;
    
    // Store custom providers
    this._customProviders = [];
    
    console.log('BaseDirectEditingProvider initialized');
  }

  /**
   * Register a custom provider for specific element types
   */
  registerProvider(provider) {
    this._customProviders.push(provider);
  }

  /**
   * Check if an element can be edited directly
   */
  canEdit(element) {
    // Check custom providers first
    for (let provider of this._customProviders) {
      if (provider.canEdit && provider.canEdit(element)) {
        return true;
      }
    }
    
    // Fall back to default BPMN behavior
    return super.canEdit(element);
  }

  /**
   * Activate direct editing for an element
   */
  activate(element) {
    // Check custom providers first
    for (let provider of this._customProviders) {
      if (provider.canEdit && provider.canEdit(element)) {
        if (provider.activate) {
          return provider.activate(element);
        }
      }
    }
    
    // Fall back to default BPMN behavior
    return super.activate(element);
  }

  /**
   * Get the current text value for editing
   */
  getValue(element) {
    // Check custom providers first
    for (let provider of this._customProviders) {
      if (provider.canEdit && provider.canEdit(element)) {
        if (provider.getValue) {
          return provider.getValue(element);
        }
      }
    }
    
    // Fall back to default BPMN behavior
    return super.getValue(element);
  }

  /**
   * Update the element with new text value
   */
  update(element, newText, oldText) {
    // Check custom providers first
    for (let provider of this._customProviders) {
      if (provider.canEdit && provider.canEdit(element)) {
        if (provider.update) {
          return provider.update(element, newText, oldText);
        }
      }
    }
    
    // Fall back to default BPMN behavior
    return super.update(element, newText, oldText);
  }
}

BaseDirectEditingProvider.$inject = [
  'eventBus',
  'canvas', 
  'modeling',
  'commandStack',
  'config'
];

export default BaseDirectEditingProvider;
