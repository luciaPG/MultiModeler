import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTNotationPalette from './PPINOTNotationPalette';
// import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
// import PPINOTLabelProvider from './PPINOTLabelProvider';  // Eliminar referencia
import PPINOTLabelSupport from './handlers/PPINOTLabelSupport';  // Mantener solo label support

export default {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    // 'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider',
    // 'PPINOTLabelProvider',  // Eliminar
    'PPINOTLabelSupport'    // Mantener solo label support
  ],
  PPINOTRenderer: [ 'type', PPINOTRenderer ],
  PPINOTRules: [ 'type', PPINOTRules ],
  PPINOTUpdater: [ 'type', PPINOTUpdater ],
  // PPINOTContextPadProvider: [ 'type', PPINOTContextPadProvider ],
  PPINOTReplaceMenuProvider: [ 'type', PPINOTReplaceMenuProvider ],
  ppinotReplaceMenuProvider: [ 'type', PPINOTReplaceMenuProvider ],
  ppinotNotationPalette: [ 'type', PPINOTNotationPalette ],
  // PPINOTLabelProvider: [ 'type', PPINOTLabelProvider ],  // Eliminar
  PPINOTLabelSupport: [ 'type', PPINOTLabelSupport ]  // Mantener solo label support
};
