import { initMultiNotationModeler, MultiNotationModeler } from './multinotationModeler/index.js';
import * as ppinotModule from './multinotationModeler/notations/ppinot/index.js';
import * as ralphModule from './multinotationModeler/notations/ralph/index.js';
import * as rasciModule from './rasci/index.js';
import * as ppisModule from './ppis/index.js';
import { getServiceRegistry } from './ui/core/ServiceRegistry.js';
import CanvasUtils from './ui/utils/canvas-utils.js';

export async function initializeApplication(options = {}) {
  try {
    const registry = getServiceRegistry();
    let modeler = options.bpmnModeler || (registry && registry.get('BpmnModeler'));

    if (!modeler && registry) {
      for (let i = 0; i < 20; i++) {
        await new Promise(resolve => setTimeout(resolve, 100));
        modeler = registry.get('BpmnModeler');
        if (modeler) break;
      }
    }

    if (modeler && registry && !registry.get('BpmnModeler')) {
      registry.register('BpmnModeler', modeler);
    }

    if (!modeler) {
      throw new Error('BpmnModeler not available in ServiceRegistry.');
    }

    const multiNotationModeler = initMultiNotationModeler({ ...options, bpmnModeler: modeler });
    const core = multiNotationModeler.core;

    ppinotModule.registerWith(core);
    ralphModule.registerWith(core);

    await multiNotationModeler.initialize();

    if (registry) {
      registry.register('CanvasUtils', CanvasUtils);
    }

    const rasci = await rasciModule.initialize({ eventBus: core.eventBus, core });
    const ppis = await ppisModule.initialize({ eventBus: core.eventBus, core });

    return {
      core,
      multiNotationModeler,
      rasci,
      ppis,
      saveModel: core.saveModel.bind(core),
      loadModel: core.loadModel.bind(core)
    };
  } catch (error) {
    console.error('[App] Failed to initialize application:', error);
    throw error;
  }
}

export { MultiNotationModeler };

async function main() {
  return;
}

if (typeof document !== 'undefined' && document.readyState === 'loading') {
  main();
}

export default {
  initializeApplication,
  MultiNotationModeler
};
