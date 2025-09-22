import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';
import { resolve } from '../services/global-access.js';
import { showDownloadOptions } from './modals.js';
import { openFile } from './files.js';

/**
 * Handle project download flow, including naming and format selection.
 */
export async function downloadProjectHandler() {
  try {
    const projectNameInput = document.getElementById('project-name-input');
    const projectName = projectNameInput ? projectNameInput.value.trim() : '';
    const finalProjectName = projectName || 'Nuevo Diagrama';

    const downloadOption = await showDownloadOptions();
    if (!downloadOption) return;

    const importManager = getServiceRegistry && getServiceRegistry().get('ImportExportManager');
    if (!importManager) throw new Error('No se pudo acceder al gestor de exportación');

    if (typeof importManager.setProjectName === 'function') {
      importManager.setProjectName(finalProjectName);
    }

    if (downloadOption === 'complete') {
      await importManager.exportProject();
    } else if (downloadOption === 'bpmn') {
      await exportBpmnDirect(finalProjectName);
    }
  } catch (e) {
    console.error('[ERROR] Error al descargar proyecto:', e);
    throw e;
  }
}

/**
 * Export current BPMN diagram directly to file, with a sanitized name.
 * @param {string} projectName
 */
export async function exportBpmnDirect(projectName) {
  const modeler = resolve('BpmnModeler');
  if (!modeler) throw new Error('Modeler no disponible');

  const xmlResult = await modeler.saveXML({ format: true });
  const xmlContent = xmlResult.xml;

  const sanitizedName = projectName
    .replace(/[^a-z0-9áéíóúñü\s-]/gi, '')
    .replace(/\s+/g, '-')
    .toLowerCase();
  const date = new Date().toISOString().split('T')[0];
  const fileName = `${sanitizedName}-${date}.bpmn`;

  const blob = new Blob([xmlContent], { type: 'application/xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Handler to open diagram or project.
 * Delegates to openFile and imports according to detected type.
 * @param {object} deps
 * @param {import('../modules/index.js').MultiNotationModeler} deps.modeler
 * @param {(m:any)=>void} deps.setModelerInitialized
 */
export async function openDiagramHandler(deps = {}) {
  const { modeler, setModelerInitialized } = deps;
  const fileData = await openFile();

  const welcomeScreen = document.getElementById('welcome-screen');
  const modelerContainer = document.getElementById('modeler-container');
  if (welcomeScreen && modelerContainer) {
    welcomeScreen.style.display = 'none';
    modelerContainer.style.display = 'block';
  }

  if (fileData.type === 'project') {
    const importManager = getServiceRegistry && getServiceRegistry().get('ImportExportManager');
    if (!importManager) throw new Error('No se pudo acceder al gestor de importación');
    await importManager.importAllProjectData(fileData.data);
    return;
  }

  if (fileData.type === 'bpmn') {
    const canvas = modeler.get('canvas');
    if (!canvas || !canvas.getRootElement()) {
      const basicXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_0r9a9oq" targetNamespace="http://bpmn.io/schema/bpmn" exporter="bpmn-js (https://demo.bpmn.io)" exporterVersion="18.6.1">
  <bpmn:process id="Process_0id04jz" isExecutable="false">
    <bpmn:startEvent id="StartEvent_002krp3" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_0id04jz">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_002krp3">
        <dc:Bounds x="152" y="72" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>
`;
      await modeler.importXML(basicXml);
    }
    await modeler.importXML(fileData.content);
    if (typeof setModelerInitialized === 'function') setModelerInitialized(true);
    // Derive and apply project name from file name via ProjectInfoService
    try {
      const registry = getServiceRegistry();
      const projectInfo = registry ? registry.get('ProjectInfoService') : null;
      if (projectInfo && typeof projectInfo.deriveFromFileName === 'function') {
        projectInfo.deriveFromFileName(fileData.fileName, 'Diagrama BPMN');
      }
  } catch (e) {
    // Ignore errors deriving file name
  }
    return;
  }

  if (fileData.type === 'bpmn_with_ppinot') {
    const importManager = resolve('ImportExportManager');
    if (!importManager) throw new Error('No se pudo acceder al gestor de importación');
    await importManager.importBpmnWithPPINOT(fileData.data);
    if (typeof setModelerInitialized === 'function') setModelerInitialized(true);
  }
}


