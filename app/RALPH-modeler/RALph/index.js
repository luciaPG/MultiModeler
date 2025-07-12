import RALphContextPadProvider from './RALphContextPadProvider';
import RALphOrderingProvider from './RALphOrderingProvider';
import RALphPalette from './RALphPalette';
import RALphRenderer from './RALphRenderer';
import RALphRules from './RALphRules';
import RALphUpdater from './RALphUpdater';
import RALPHLabelProvider from './RALphLabelProvider';

export default {
  __init__: [
    'RALphContextPadProvider',
    'RALphOrderingProvider',
    'RALphRenderer',
    'RALphRules',
    'RALphUpdater',
    'RALphPalette',
    'RALPHLabelProvider',
  ],
  RALphContextPadProvider: [ 'type', RALphContextPadProvider ],
  RALphOrderingProvider: [ 'type', RALphOrderingProvider ],
  RALphRenderer: [ 'type', RALphRenderer ],
  RALphRules: [ 'type', RALphRules ],
  RALphUpdater: [ 'type', RALphUpdater ],
  RALphPalette: [ 'type', RALphPalette ],
  RALPHLabelProvider: [ 'type', RALPHLabelProvider ],
};
