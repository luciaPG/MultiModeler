import RALphElementFactory from './RALphElementFactory';
import RALphRenderer from './RALphRenderer';
import RALphRules from './RALphRules';
import RALphUpdater from './RALphUpdater';
import RALPHNotationPalette from './RALPHNotationPalette';

export default {
  __init__: [
    'RALphRenderer',
    'RALphRules',
    'RALphUpdater'
  ],
  RALphRenderer: [ 'type', RALphRenderer ],
  RALphRules: [ 'type', RALphRules ],
  RALphUpdater: [ 'type', RALphUpdater ],
  elementFactory: [ 'type', RALphElementFactory ],
  ralphNotationPalette: [ 'type', RALPHNotationPalette ]
};
