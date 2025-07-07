import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import LabelEditingModule from 'bpmn-js/lib/features/label-editing';
import BasePaletteProvider from './BasePaletteProvider';
import BaseContextPadProvider from './BaseContextPadProvider';
import BaseReplaceMenuProvider from './BaseReplaceMenuProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';
import MultiNotationRenderer from './MultiNotationRenderer';
import BaseLabelProvider from './BaseLabelProvider';


export default {
  // Declarar dependencia del módulo de replace y popup-menu de BPMN.js
  __depends__: [
    ReplaceModule,
    PopupMenuModule,
    LabelEditingModule
  ],

  // Inicializar nuestros providers personalizados (sobrescriben los estándar)
  __init__: [
    'basePaletteProvider',
    'bpmnRenderer', // Use standard BPMN renderer name
    'contextPadProvider',
    'baseReplaceMenuProvider',
    'baseLabelProvider', // Base label provider for all elements
    'elementFactory' // Element factory común
  ],

  basePaletteProvider:    ['type', BasePaletteProvider],
  bpmnRenderer:           ['type', MultiNotationRenderer], // Override the standard BpmnRenderer
  contextPadProvider:     ['type', BaseContextPadProvider],
  baseReplaceMenuProvider:    ['type', BaseReplaceMenuProvider],
  baseLabelProvider:      ['type', BaseLabelProvider], // Base label provider for all elements
  directEditingProvider:  ['type', BaseLabelProvider], // Override the default direct editing provider
  elementFactory:         ['type', MultiNotationElementFactory] // Element factory común
};
