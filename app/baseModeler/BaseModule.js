import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import BasePaletteProvider from './BasePaletteProvider';
import BaseContextPadProvider from './BaseContextPadProvider';
import BaseReplaceMenuProvider from './BaseReplaceMenuProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';
import MultiNotationRenderer from './MultiNotationRenderer';


export default {
  // Declarar dependencia del módulo de replace y popup-menu de BPMN.js
  __depends__: [
    ReplaceModule,
    PopupMenuModule
  ],

  // Inicializar nuestros providers personalizados (sobrescriben los estándar)
  __init__: [
    'basePaletteProvider',
    'bpmnRenderer', // Use standard BPMN renderer name
    'contextPadProvider',
    'baseReplaceMenuProvider',
    'elementFactory' // Añadido para inicializar el factory común
  ],

  basePaletteProvider:    ['type', BasePaletteProvider],
  bpmnRenderer:           ['type', MultiNotationRenderer], // Override the standard BpmnRenderer
  contextPadProvider:     ['type', BaseContextPadProvider],
  baseReplaceMenuProvider:    ['type', BaseReplaceMenuProvider],
  elementFactory:         ['type', MultiNotationElementFactory] // Añadido como provider principal
};
