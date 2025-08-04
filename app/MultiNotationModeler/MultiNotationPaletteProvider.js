import { assign } from 'min-dash';
import BpmnPaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';
import PPINOTPalette from '../PPINOT-modeler/PPINOT/PPINOTPalette';
import RALphPalette from '../RALPH-modeler/RALph/RALphPalette';

export default function MultiNotationPaletteProvider(palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, injector) {
  BpmnPaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate);
  this._injector = injector;
  
  // Create the palette services directly instead of trying to get them through dependency injection
  try {
    this.ppinotNotationPalette = new PPINOTPalette(create, elementFactory, translate);
  } catch (error) {
    this.ppinotNotationPalette = null;
  }
  
  try {
    this.ralphNotationPalette = new RALphPalette(create, elementFactory, translate);
  } catch (error) {
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
    }
  }

  //RALPH entries
  if (this.ralphNotationPalette && typeof this.ralphNotationPalette.getPaletteEntries === 'function') {
    try {
      assign(allEntries, this.ralphNotationPalette.getPaletteEntries());
    } catch (error) {
    }
  }

  return allEntries;
};

