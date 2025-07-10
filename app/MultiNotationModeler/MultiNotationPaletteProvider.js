import { assign } from 'min-dash';
import BpmnPaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';

export default function MultiNotationPaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, injector) {
  BpmnPaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate);
  
  this._injector = injector;
}

MultiNotationPaletteProvider.$inject = [
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

MultiNotationPaletteProvider.prototype = Object.create(BpmnPaletteProvider.prototype);
MultiNotationPaletteProvider.prototype.constructor = MultiNotationPaletteProvider;

MultiNotationPaletteProvider.prototype.getPaletteEntries = function () {
  const bpmnEntries = BpmnPaletteProvider.prototype.getPaletteEntries.call(this);
  let allEntries = assign({}, bpmnEntries);
  const ppinotNotationPalette = safeGet(this._injector, 'ppinotNotationPalette');
  const ralphNotationPalette = safeGet(this._injector, 'ralphNotationPalette');

  //PPINOT entries
  if (ppinotNotationPalette && typeof ppinotNotationPalette.getPaletteEntries === 'function') {
    assign(allEntries, ppinotNotationPalette.getPaletteEntries());
  }

  //RALPH entries
  if (ralphNotationPalette && typeof ralphNotationPalette.getPaletteEntries === 'function') {
    assign(allEntries, ralphNotationPalette.getPaletteEntries());
  }

  return allEntries;
};


function safeGet(injector, serviceName) {
  try {
    return injector.get(serviceName, false);
  } catch (_) {
    return null;
  }
}

