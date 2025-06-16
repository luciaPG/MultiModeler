import inherits from 'inherits';
import PPINOTModeler from '../PPINOT-modeler';
import MultiNotationPaletteProvider from './MultiNotationPalette';
import PPINOTContextPadProvider from '../PPINOT-modeler/PPINOT/PPINOTContextPadProvider';
import PPINOTElementFactory from '../PPINOT-modeler/PPINOT/PPINOTElementFactory';
import PPINOTOrderingProvider from '../PPINOT-modeler/PPINOT/PPINOTOrderingProvider';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import PPINOTRules from '../PPINOT-modeler/PPINOT/PPINOTRules';
import PPINOTUpdater from '../PPINOT-modeler/PPINOT/PPINOTUpdater';
import PPINOTBpmnUpdater from '../PPINOT-modeler/PPINOT/PPINOTBpmnUpdater';
import PPINOTLabelEditingProvider from '../PPINOT-modeler/PPINOT/PPINOTLabelEditingProvider';
import PPINOTModeling from '../PPINOT-modeler/PPINOT/PPINOTModeling';
import PPINOTConnect from '../PPINOT-modeler/PPINOT/PPINOTConnect';
import PPINOTReplaceConnectionBehavior from '../PPINOT-modeler/PPINOT/behaviour/ReplaceConnectionBehaviour';
import PPINOTReplaceMenuProvider from '../PPINOT-modeler/PPINOT/PPINOTReplaceMenuProvider';
import PPINOTReplace from '../PPINOT-modeler/PPINOT/PPINOTReplace';
import PPINOTCustomTextEditor from '../PPINOT-modeler/PPINOT/PPINOTCustomTextEditor';

// Module that replaces the palette provider with one supporting multiple notations
var MultiNotationModule = {
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
  contextPadProvider: ['type', PPINOTContextPadProvider],
  PPINOTOrderingProvider: ['type', PPINOTOrderingProvider],
  PPINOTRenderer: ['type', PPINOTRenderer],
  PPINOTRules: ['type', PPINOTRules],
  PPINOTUpdater: ['type', PPINOTUpdater],
  elementFactory: ['type', PPINOTElementFactory],
  paletteProvider: ['type', MultiNotationPaletteProvider],
  PPINOTLabelEditingProvider: ['type', PPINOTLabelEditingProvider],
  modeling: ['type', PPINOTModeling],
  connect: ['type', PPINOTConnect],
  replaceConnectionBehavior: ['type', PPINOTReplaceConnectionBehavior],
  replaceMenuProvider: ['type', PPINOTReplaceMenuProvider],
  bpmnUpdater: ['type', PPINOTBpmnUpdater],
  replace: ['type', PPINOTReplace],
  customTextEditor: ['type', PPINOTCustomTextEditor]
};

// Modeler that loads the multi-notation module
export default function MultiNotationModeler(options) {
  PPINOTModeler.call(this, options);
}

inherits(MultiNotationModeler, PPINOTModeler);

MultiNotationModeler.prototype._modules = [].concat(
  MultiNotationModeler.prototype._modules,
  [ MultiNotationModule ]
);
