import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import LabelEditingModule from 'bpmn-js/lib/features/label-editing';
import MultiNotationPaletteProvider from './MultiNotationPaletteProvider';
import MultiNotationContextPadProvider from './MultiNotationContextPadProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';
import MultiNotationRenderer from './MultiNotationRenderer';
import MultiNotationLabelProvider from './MultiNotationLabelProvider';
import MultiNotationMenuProvider from './MultiNotationMenuProvider';
export default {
  __depends__: [
    ReplaceModule,
    PopupMenuModule,
    LabelEditingModule
  ],

  __init__: [
    'multiNotationPaletteProvider',
    'bpmnRenderer',
    'contextPadProvider',
    'multiNotationLabelProvider',
    'elementFactory',
    'multiNotationMenuProvider'
  ],

  multiNotationPaletteProvider:    ['type', MultiNotationPaletteProvider],
  bpmnRenderer:           ['type', MultiNotationRenderer],
  contextPadProvider:     ['type', MultiNotationContextPadProvider],
  multiNotationLabelProvider:      ['type', MultiNotationLabelProvider],
  elementFactory:         ['type', MultiNotationElementFactory],
  multiNotationMenuProvider: ['type', MultiNotationMenuProvider]
};
