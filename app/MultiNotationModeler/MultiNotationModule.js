import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import LabelEditingModule from 'bpmn-js/lib/features/label-editing';
import MultiNotationPaletteProvider from './MultiNotationPaletteProvider';
import MultiNotationContextPadProvider from './MultiNotationContextPadProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';
import MultiNotationRenderer from './MultiNotationRenderer';
import MultiNotationLabelProvider from './MultiNotationLabelProvider';
import MultiNotationReplaceMenuProvider from './MultiNotationReplaceMenuProvider';
import MultiNotationModeling from './MultiNotationModeling';
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
    'multiNotationReplaceMenuProvider',
    'modeling'
  ],

  multiNotationPaletteProvider:    ['type', MultiNotationPaletteProvider],
  bpmnRenderer:           ['type', MultiNotationRenderer],
  contextPadProvider:     ['type', MultiNotationContextPadProvider],
  multiNotationLabelProvider:      ['type', MultiNotationLabelProvider],
  elementFactory:         ['type', MultiNotationElementFactory],
  multiNotationReplaceMenuProvider: ['type', MultiNotationReplaceMenuProvider],
  modeling:  ['type', MultiNotationModeling]
};
