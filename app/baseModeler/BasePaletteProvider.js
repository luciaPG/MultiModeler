import { assign } from 'min-dash';
import BpmnPaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';

/**
 * A unified palette provider that extends BPMN.js PaletteProvider and adds
 * PPINOT and RALPH elements based on enabled notations
 */
export default function BasePaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, injector) {
  // Call parent constructor to initialize BPMN palette logic
  BpmnPaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate);
  
  // Store injector to get notation services
  this._injector = injector;

  console.log('🎨 BasePaletteProvider constructor called - Extending BPMN PaletteProvider with PPINOT + RALPH');
  console.log('🎨 Single unified palette provider registered for all notations');
}

BasePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool',
  'globalConnect',
  'translate',
  'injector'
];

// Set up inheritance from BpmnPaletteProvider
BasePaletteProvider.prototype = Object.create(BpmnPaletteProvider.prototype);
BasePaletteProvider.prototype.constructor = BasePaletteProvider;

BasePaletteProvider.prototype.getPaletteEntries = function () {
  console.log('🎨 BasePaletteProvider.getPaletteEntries called');
  
  // Get the original BPMN palette entries
  var bpmnEntries = BpmnPaletteProvider.prototype.getPaletteEntries.call(this);
  console.log('🎨 Got BPMN palette entries:', Object.keys(bpmnEntries));  // Get notation services if available
  var ppinotNotationPalette = null;
  var ralphNotationPalette = null;
  
  try {
    ppinotNotationPalette = this._injector.get('ppinotNotationPalette', false);
    console.log('🎨 Found ppinotNotationPalette service:', !!ppinotNotationPalette);
  } catch (e) {
    console.log('🎨 PPINOT service not available:', e.message);
  }
  
  try {
    ralphNotationPalette = this._injector.get('ralphNotationPalette', false);
    console.log('🎨 Found ralphNotationPalette service:', !!ralphNotationPalette);
  } catch (e) {
    console.log('🎨 RALPH service not available:', e.message);
  }
  
  // Start with BPMN entries
  var allEntries = assign({}, bpmnEntries);
  
  // Add PPINOT entries if service is available
  if (ppinotNotationPalette && typeof ppinotNotationPalette.getPaletteEntries === 'function') {
    console.log('🎨 Adding PPINOT palette entries');
    var ppinotEntries = ppinotNotationPalette.getPaletteEntries();
    console.log('🎨 PPINOT entries:', Object.keys(ppinotEntries));
    assign(allEntries, ppinotEntries);
  } else {
    console.log('🎨 PPINOT service not available or no getPaletteEntries method');
  }
  
  // Add RALPH entries if service is available  
  if (ralphNotationPalette && typeof ralphNotationPalette.getPaletteEntries === 'function') {
    console.log('🎨 Adding RALPH palette entries');
    var ralphEntries = ralphNotationPalette.getPaletteEntries();
    console.log('🎨 RALPH entries:', Object.keys(ralphEntries));
    assign(allEntries, ralphEntries);
  } else {
    console.log('🎨 RALPH service not available or no getPaletteEntries method');
  }
  
  console.log('🎨 BasePaletteProvider returning combined entries:', Object.keys(allEntries));
  return allEntries;
};
