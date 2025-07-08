import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTNotationPalette from './PPINOTNotationPalette';
// import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
import PPINOTLabelProvider from './PPINOTLabelProvider';
import PPINOTConnect from './PPINOTConnect';
import PPINOTOrderingProvider from './PPINOTOrderingProvider';
import ReplaceConnectionBehavior from './behaviour/ReplaceConnectionBehaviour.js';
import BendpointBehavior from './behaviour/BendpointBehavior';

export default {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    // 'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider',
    'PPINOTLabelProvider',
    'PPINOTConnect',
    'PPINOTOrderingProvider',
    'replaceConnectionBehavior',
    'bendpointBehavior'
  ],
  PPINOTRenderer: ['type', PPINOTRenderer],
  PPINOTRules: ['type', PPINOTRules],
  PPINOTUpdater: ['type', PPINOTUpdater],
  // PPINOTContextPadProvider: [ 'type', PPINOTContextPadProvider ],
  PPINOTReplaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  ppinotNotationPalette: ['type', PPINOTNotationPalette],
  PPINOTLabelProvider: ['type', PPINOTLabelProvider],
  PPINOTConnect: ['type', PPINOTConnect],
  PPINOTOrderingProvider: ['type', PPINOTOrderingProvider],
  replaceConnectionBehavior: ['type', ReplaceConnectionBehavior],
  bendpointBehavior: ['type', BendpointBehavior]
};
