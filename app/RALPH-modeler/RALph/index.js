import RALphContextPadProvider from './RALphContextPadProvider';
import RALphOrderingProvider from './RALphOrderingProvider';
import RALphPalette from './RALphPalette';
import RALphRenderer from './RALphRenderer';
import RALphRules from './RALphRules';
import RALphUpdater from './RALphUpdater';
import RALphLabelEditingProvider from "./RALphLabelEditingProvider";

export default {
  __init__: [
    'RALphContextPadProvider',
    'RALphOrderingProvider',
    'RALphRenderer',
    'RALphRules',
    'RALphUpdater',
    'RALphPalette',
    'RALphLabelEditingProvider',
  ],
  RALphContextPadProvider: [ 'type', RALphContextPadProvider ],
  RALphOrderingProvider: [ 'type', RALphOrderingProvider ],
  RALphRenderer: [ 'type', RALphRenderer ],
  RALphRules: [ 'type', RALphRules ],
  RALphUpdater: [ 'type', RALphUpdater ],
  RALphPalette: [ 'type', RALphPalette ],
  RALphLabelEditingProvider: [ 'type', RALphLabelEditingProvider ],
};
