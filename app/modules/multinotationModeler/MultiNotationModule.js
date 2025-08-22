import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import LabelEditingModule from 'bpmn-js/lib/features/label-editing';
import MultiNotationPaletteProvider from './MultiNotationPaletteProvider';
import MultiNotationContextPadProvider from './MultiNotationContextPadProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';
import MultiNotationRenderer from './MultiNotationRenderer';
import MultiNotationReplaceMenuProvider from './MultiNotationReplaceMenuProvider';
import MultiNotationConnect from './MultiNotationConnect';
import BendpointBehavior from './behaviour/BendpointBehavior';
import ReplaceConnectionBehaviour from './behaviour/ReplaceConnectionBehaviour';

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
    'elementFactory',
    'multiNotationReplaceMenuProvider',
    'connect',
    'bendpointBehavior',
    'replaceConnectionBehaviour'
  ],

  multiNotationPaletteProvider:    ['type', MultiNotationPaletteProvider],
  bpmnRenderer:           ['type', MultiNotationRenderer],
  contextPadProvider:     ['type', MultiNotationContextPadProvider],
  elementFactory:         ['type', MultiNotationElementFactory],
  multiNotationReplaceMenuProvider: ['type', MultiNotationReplaceMenuProvider],
  connect: ['type', MultiNotationConnect],
  bendpointBehavior: ['type', BendpointBehavior],
  replaceConnectionBehaviour: ['type', ReplaceConnectionBehaviour]
};
