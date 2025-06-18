import RALphContextPadProvider from './RALphContextPadProvider';
import RALphElementFactory from './RALphElementFactory';
import RALphOrderingProvider from './RALphOrderingProvider';
import RALphPalette from './RALphPalette';
import RALphRenderer from './RALphRenderer';
import RALphRules from './RALphRules';
import RALphUpdater from './RALphUpdater';
import RALphLabelEditingProvider from "./RALphLabelEditingProvider";
import RALphModeling from "./RALphModeling";
import RALphConnect from "./RALphConnect";
import RALphReplaceConnectionBehavior from "./behaviour/ReplaceConnectionBehaviour";

export default {
  __init__: [
    'contextPadProvider',
    'customOrderingProvider',
    'customRenderer',
    'customRules',
    'customUpdater',
    'paletteProvider',
    'customLabelEditingProvider',
    'modeling',
    'connect',
    'replaceConnectionBehavior'
  ],
  contextPadProvider: [ 'type', RALphContextPadProvider ],
  customOrderingProvider: [ 'type', RALphOrderingProvider ],
  customRenderer: [ 'type', RALphRenderer ],
  customRules: [ 'type', RALphRules ],
  customUpdater: [ 'type', RALphUpdater ],
  elementFactory: [ 'type', RALphElementFactory ],
  paletteProvider: [ 'type', RALphPalette ],
  customLabelEditingProvider: [ 'type', RALphLabelEditingProvider ],
  modeling: [ 'type', RALphModeling ],
  connect: [ 'type', RALphConnect],
  replaceConnectionBehavior: [ 'type', RALphReplaceConnectionBehavior],
};
