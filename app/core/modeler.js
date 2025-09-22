import { resolve } from '../services/global-access.js';
import modelerManager from '../modules/ui/managers/modeler-manager.js';

/**
 * Attach BPMN modeler event handlers to broadcast changes.
 * @param {any} modeler
 * @param {any} app
 */
export function setupEventHandlers(modeler, app) {
  if (!modeler) return;

  modeler.on('elements.changed', function() {
    try {
      const sr = resolve('ServiceRegistry');
      const lsMgr = sr && sr.get && sr.get('LocalStorageIntegration');
      const inCooldown = lsMgr && lsMgr._postRestoreCooldownUntil && Date.now() < lsMgr._postRestoreCooldownUntil;
      if (inCooldown) return;
    } catch (_) { /* no-op */ }
    if (app && app.core && app.core.eventBus) {
      app.core.eventBus.publish('model.changed', { source: 'bpmn' });
    }
  });

  modeler.on('selection.changed', function(e) {
    if (e.newSelection && e.newSelection.length && app && app.core && app.core.eventBus) {
      app.core.eventBus.publish('bpmn.element.selected', { element: e.newSelection[0] });
    }
  });
}

/**
 * Initialize a fresh BPMN diagram in the modeler and configure panels.
 * @param {any} modeler
 */
export async function initModeler(modeler) {
  if (!modeler) throw new Error('Modeler no encontrado');

  const panelManager = resolve('PanelManagerInstance');
  if (panelManager) {
    panelManager.activePanels = ['bpmn'];
    panelManager.currentLayout = '2v';
    await panelManager.applyConfiguration();
  }

  const initialXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                 xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                 xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                 xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                 xmlns:ppinot="http://www.isa.us.es/ppinot" 
                 xmlns:ralph="http://www.isa.us.es/ralph"
                 id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_1" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="82" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

  await modeler.importXML(initialXml);
  modelerManager.setModeler(modeler);
}


