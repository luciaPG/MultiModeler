import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTElementFactory from './PPINOTElementFactory';
import PPINOTOrderingProvider from './PPINOTOrderingProvider';
import PPINOTPaletteProvider from './PPINOTPalette';
import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTBpmnUpdater from './PPINOTBpmnUpdater';
import PPINOTLabelEditingProvider from "./PPINOTLabelEditingProvider";
import PPINOTModeling from "./PPINOTModeling";
import PPINOTConnect from "./PPINOTConnect";
import PPINOTReplaceConnectionBehavior from "./behaviour/ReplaceConnectionBehaviour";
import PPINOTReplaceMenuProvider from "./PPINOTReplaceMenuProvider";
import PPINOTReplace from "./PPINOTReplace";
import PPINOTCustomTextEditor from "./PPINOTCustomTextEditor";


export default {
  __init__: [
    'contextPadProvider',
    'PPINOTOrderingProvider',
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    'paletteProvider',
    'PPINOTLabelEditingProvider',
    'modeling',
    'connect',
    'replaceConnectionBehavior',
    'replaceMenuProvider',
    'replace',
    'bpmnUpdater',
    'customTextEditor'
  ],
  contextPadProvider: [ 'type', PPINOTContextPadProvider ],
  PPINOTOrderingProvider: [ 'type', PPINOTOrderingProvider ],
  PPINOTRenderer: [ 'type', PPINOTRenderer ],
  PPINOTRules: [ 'type', PPINOTRules ],
  PPINOTUpdater: [ 'type', PPINOTUpdater ],
  elementFactory: [ 'type', PPINOTElementFactory ],
  paletteProvider: [ 'type', PPINOTPaletteProvider ],
  PPINOTLabelEditingProvider: [ 'type', PPINOTLabelEditingProvider ],
  modeling: [ 'type', PPINOTModeling ],
  connect: [ 'type', PPINOTConnect],
  replaceConnectionBehavior: [ 'type', PPINOTReplaceConnectionBehavior],  replaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  bpmnUpdater: [ 'type', PPINOTBpmnUpdater ],
  replace: [ 'type', PPINOTReplace ],
  customTextEditor: [ 'type', PPINOTCustomTextEditor ]
};
