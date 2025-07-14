import { assign } from 'min-dash';
import BpmnPaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';
import PPINOTPalette from '../PPINOT-modeler/PPINOT/PPINOTPalette';
import RALphPalette from '../RALPH-modeler/RALph/RALphPalette';

export default function MultiNotationPaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, injector) {
  BpmnPaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate);
  this._injector = injector;
  
  // Get the palette services through dependency injection - safely
  try {
    this.ppinotNotationPalette = injector.get('PPINOTPalette');
  } catch (error) {
    console.warn('PPINOTPalette not available:', error.message);
    this.ppinotNotationPalette = null;
  }
  
  try {
    this.ralphNotationPalette = injector.get('RALphPalette');
  } catch (error) {
    console.warn('RALphPalette not available:', error.message);
    this.ralphNotationPalette = null;
  }
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
  'injector'
];

MultiNotationPaletteProvider.prototype = Object.create(BpmnPaletteProvider.prototype);
MultiNotationPaletteProvider.prototype.constructor = MultiNotationPaletteProvider;

MultiNotationPaletteProvider.prototype.getPaletteEntries = function () {
  const bpmnEntries = BpmnPaletteProvider.prototype.getPaletteEntries.call(this);
  let allEntries = assign({}, bpmnEntries);

  //PPINOT entries
  if (this.ppinotNotationPalette && typeof this.ppinotNotationPalette.getPaletteEntries === 'function') {
    try {
      assign(allEntries, this.ppinotNotationPalette.getPaletteEntries());
    } catch (error) {
      console.warn('Error getting PPINOT palette entries:', error);
    }
  }

  //RALPH entries
  if (this.ralphNotationPalette && typeof this.ralphNotationPalette.getPaletteEntries === 'function') {
    try {
      assign(allEntries, this.ralphNotationPalette.getPaletteEntries());
    } catch (error) {
      console.warn('Error getting RALPH palette entries:', error);
    }
  }

  return allEntries;
};

