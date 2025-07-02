import PPINOTRenderer from './PPINOTRenderer';
import PPINOTRules from './PPINOTRules';
import PPINOTUpdater from './PPINOTUpdater';
import PPINOTNotationPalette from './PPINOTNotationPalette';
// import PPINOTContextPadProvider from './PPINOTContextPadProvider';
import PPINOTReplaceMenuProvider from './PPINOTReplaceMenuProvider';
import PPINOTCustomTextEditor from './PPINOTCustomTextEditor';

export default {
  __init__: [
    'PPINOTRenderer',
    'PPINOTRules',
    'PPINOTUpdater',
    'PPINOTCustomTextEditor',
    // 'PPINOTContextPadProvider',
    'PPINOTReplaceMenuProvider'
  ],
  PPINOTRenderer: [ 'type', PPINOTRenderer ],
  PPINOTRules: [ 'type', PPINOTRules ],
  PPINOTUpdater: [ 'type', PPINOTUpdater ],
  PPINOTCustomTextEditor: [ 'type', PPINOTCustomTextEditor ],
  // PPINOTContextPadProvider: [ 'type', PPINOTContextPadProvider ],
  PPINOTReplaceMenuProvider: [ 'type', PPINOTReplaceMenuProvider ],
  ppinotReplaceMenuProvider: [ 'type', PPINOTReplaceMenuProvider ],
  ppinotNotationPalette: [ 'type', PPINOTNotationPalette ]
};
