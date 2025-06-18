import PaletteModule from './palette';
import ModelingModule from './modeling';
import RendererModule from './renderer';
import RulesModule from './rules';
import ContextPadModule from './context-pad';

export default {
  __depends__: [
    PaletteModule,
    ModelingModule,
    RendererModule,
    RulesModule,
    ContextPadModule
  ]
};
