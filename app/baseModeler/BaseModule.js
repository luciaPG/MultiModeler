import ReplaceModule from 'bpmn-js/lib/features/replace';
import PopupMenuModule from 'bpmn-js/lib/features/popup-menu';
import BasePaletteProvider from './BasePaletteProvider';
import BaseRenderer from './BaseRenderer';
import BaseContextPadProvider from './BaseContextPadProvider';
import BaseReplaceMenuProvider from './BaseReplaceMenuProvider';
import MultiNotationElementFactory from './MultiNotationElementFactory';


export default {
  // Declarar dependencia del módulo de replace y popup-menu de BPMN.js
  __depends__: [
    ReplaceModule,
    PopupMenuModule
  ],

  // Inicializar nuestros providers personalizados (sobrescriben los estándar)
  __init__: [
    'basePaletteProvider',
    'baseRenderer',
    'contextPadProvider',
    'baseReplaceMenuProvider',
    'elementFactory' // Añadido para inicializar el factory común
  ],

  basePaletteProvider:    ['type', BasePaletteProvider],
  baseRenderer:           ['type', BaseRenderer],
  contextPadProvider:     ['type', BaseContextPadProvider],
  baseReplaceMenuProvider:    ['type', BaseReplaceMenuProvider],
  elementFactory:         ['type', MultiNotationElementFactory] // Añadido como provider principal
};
