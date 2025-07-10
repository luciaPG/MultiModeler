import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTBpmnUpdater from './PPINOTBpmnUpdater';
import PPINOTPalette from './PPINOTPalette';
import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
import PPINOTLabelProvider from './PPINOTLabelProvider';
import PPINOTConnect from './PPINOTConnect';
import PPINOTOrderingProvider from './PPINOTOrderingProvider';
import PPINOTReplaceConnectionBehavior from './behaviour/ReplaceConnectionBehaviour.js';
import BendpointBehavior from './behaviour/BendpointBehavior';

export default {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider',
    'PPINOTLabelProvider',
    'PPINOTConnect',
    'PPINOTOrderingProvider',
    'PPINOTReplaceConnectionBehavior',
    'PPINOTRenderer',
    'bendpointBehavior',
    'bpmnUpdater',
    'PPINOTPalette'
  ],
  PPINOTRules: ['type', PPINOTRules],
  PPINOTUpdater: ['type', PPINOTUpdater],
  PPINOTContextPadProvider: ['type', PPINOTContextPadProvider],
  PPINOTReplaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  PPINOTPalette: ['type', PPINOTPalette],
  PPINOTLabelProvider: ['type', PPINOTLabelProvider],
  PPINOTConnect: ['type', PPINOTConnect],
  PPINOTOrderingProvider: ['type', PPINOTOrderingProvider],
  PPINOTReplaceConnectionBehavior: ['type', PPINOTReplaceConnectionBehavior],
  bendpointBehavior: ['type', BendpointBehavior],
  bpmnUpdater: ['type', PPINOTBpmnUpdater],
  PPINOTRenderer: ['type', PPINOTRenderer]
};
