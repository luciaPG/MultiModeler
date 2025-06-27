import { assign } from 'min-dash';
import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';
import BpmnContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';

/**
 * A unified context pad provider that extends BPMN.js ContextPadProvider and adds
 * PPINOT and RALPH context pad entries based on element types
 */
export default function BaseContextPadProvider(config, injector, eventBus, contextPad, modeling, elementFactory, connect, create, popupMenu, canvas, rules, translate, appendPreview) {
  // Call parent constructor to initialize BPMN context pad logic
  BpmnContextPadProvider.call(this, config, injector, eventBus, contextPad, modeling, elementFactory, connect, create, popupMenu, canvas, rules, translate, appendPreview);
  
  // Store injector to get notation services
  this._injector = injector;

  console.log('🎯 BaseContextPadProvider constructor called - Extending BPMN ContextPadProvider with PPINOT + RALPH');
}

BaseContextPadProvider.$inject = [
  'config',
  'injector',
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate',
  'appendPreview'
];

// Set up inheritance from BpmnContextPadProvider
BaseContextPadProvider.prototype = Object.create(BpmnContextPadProvider.prototype);
BaseContextPadProvider.prototype.constructor = BaseContextPadProvider;

BaseContextPadProvider.prototype.getContextPadEntries = function(element) {
  console.log('🎯 BaseContextPadProvider.getContextPadEntries called for element:', element.type);
  
  // Check if it's a PPINOT element
  if (isPPINOTShape(element)) {
    console.log('🎯 Element is PPINOT, returning ONLY PPINOT context pad entries');
    
    // Get PPINOT context pad service
    var ppinotContextPad = null;
    try {
      ppinotContextPad = this._injector.get('ppinotContextPadProvider', false);
    } catch (e) {
      console.log('🎯 PPINOT context pad service not available:', e.message);
      return {}; // Return empty if PPINOT service not available
    }
    
    // Return ONLY PPINOT entries
    if (ppinotContextPad && typeof ppinotContextPad.getContextPadEntries === 'function') {
      console.log('🎯 Getting PPINOT context pad entries');
      var ppinotEntries = ppinotContextPad.getContextPadEntries(element);
      console.log('🎯 PPINOT entries:', Object.keys(ppinotEntries));
      return ppinotEntries; // Return ONLY PPINOT entries, not merged with BPMN
    }
    
    return {}; // Return empty if no PPINOT entries
  }
    // Check if it's a RALPH element (for future use)
  var boType = element.businessObject ? (element.businessObject.$type || element.businessObject.type || '') : '';
  if (boType.startsWith && boType.startsWith('RALPH:')) {
    console.log('🎯 Element is RALPH, getting RALPH context pad entries');
    
    // Get the original BPMN context pad entries for RALPH elements
    var ralphBpmnEntries = BpmnContextPadProvider.prototype.getContextPadEntries.call(this, element);
    
    // Get RALPH context pad service
    var ralphContextPad = null;
    try {
      ralphContextPad = this._injector.get('ralphContextPadProvider', false);
    } catch (e) {
      console.log('🎯 RALPH context pad service not available:', e.message);
    }
    
    // Add RALPH entries if service is available
    if (ralphContextPad && typeof ralphContextPad.getContextPadEntries === 'function') {
      console.log('🎯 Adding RALPH context pad entries');
      var ralphEntries = ralphContextPad.getContextPadEntries(element);
      console.log('🎯 RALPH entries:', Object.keys(ralphEntries));
      assign(ralphBpmnEntries, ralphEntries);
    }
    
    return ralphBpmnEntries;
  }
  
  // For pure BPMN elements, return original entries
  console.log('🎯 Element is BPMN, returning original entries');
  var pureBpmnEntries = BpmnContextPadProvider.prototype.getContextPadEntries.call(this, element);
  return pureBpmnEntries;
};
