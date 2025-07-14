import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTBpmnUpdater from './PPINOTBpmnUpdater';
import PPINOTPalette from './PPINOTPalette';
import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
import PPINOTLabelProvider from './PPINOTLabelProvider';
import PPINOTOrderingProvider from './PPINOTOrderingProvider';

export default {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider',
    'PPINOTLabelProvider',
    'PPINOTOrderingProvider',
    'bpmnUpdater'
  ],
  PPINOTRules: ['type', PPINOTRules],
  PPINOTUpdater: ['type', PPINOTUpdater],
  PPINOTContextPadProvider: ['type', PPINOTContextPadProvider],
  PPINOTReplaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  PPINOTLabelProvider: ['type', PPINOTLabelProvider],
  PPINOTOrderingProvider: ['type', PPINOTOrderingProvider],
  bpmnUpdater: ['type', PPINOTBpmnUpdater],
  PPINOTRenderer: ['type', PPINOTRenderer]
};
