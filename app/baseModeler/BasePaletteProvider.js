import { assign } from 'min-dash';
import BpmnPaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';

/**
 * Unified palette provider that extends BPMN.js PaletteProvider and adds
 * PPINOT and RALPH elements if their services are available.
 */
export default function BasePaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, injector) {
  // Call parent constructor to initialize BPMN palette logic
  BpmnPaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate);
  
  // Store injector to get notation services
  this._injector = injector;
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
  'injector',
  
];

// Inherit from BpmnPaletteProvider
BasePaletteProvider.prototype = Object.create(BpmnPaletteProvider.prototype);
BasePaletteProvider.prototype.constructor = BasePaletteProvider;

BasePaletteProvider.prototype.getPaletteEntries = function () {
  // Get BPMN palette entries
  const bpmnEntries = BpmnPaletteProvider.prototype.getPaletteEntries.call(this);
  let allEntries = assign({}, bpmnEntries);

  // Try to get PPINOT and RALPH palette services
  const ppinotNotationPalette = safeGet(this._injector, 'ppinotNotationPalette');
  const ralphNotationPalette = safeGet(this._injector, 'ralphNotationPalette');

  // Add PPINOT entries if available
  if (ppinotNotationPalette && typeof ppinotNotationPalette.getPaletteEntries === 'function') {
    assign(allEntries, ppinotNotationPalette.getPaletteEntries());
  }

  // Add RALPH entries if available
  if (ralphNotationPalette && typeof ralphNotationPalette.getPaletteEntries === 'function') {
    assign(allEntries, ralphNotationPalette.getPaletteEntries());
  }

  return allEntries;
};

// Helper to safely get a service from injector
function safeGet(injector, serviceName) {
  try {
    return injector.get(serviceName, false);
  } catch (_) {
    return null;
  }
}

