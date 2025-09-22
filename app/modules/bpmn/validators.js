import { getServiceRegistry } from '../ui/core/ServiceRegistry.js';

// Reutilizamos el mismo XML que usa StorageManager#createCleanBpmnDiagram para crear
// un diagrama inicial válido dentro de la aplicación.
export const CLEAN_BPMN_DIAGRAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC"
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Tarea 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Fin">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="158" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="392" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="400" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

// XML mínimo que utiliza StorageManager cuando no hay modeler disponible (solo evento de inicio).
export const MINIMAL_BPMN_DIAGRAM_XML = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"
                  id="Definitions_1"
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
  </bpmn:process>
</bpmn:definitions>`;

function toCanonicalType(tagName) {
  if (!tagName) return '';
  const [prefix, rawLocal] = tagName.split(':');
  if (!rawLocal) return tagName;
  const local = rawLocal.replace(/-([a-z])/g, (_, char) => char.toUpperCase());
  const canonical = local.charAt(0).toUpperCase() + local.slice(1);
  return `${prefix}:${canonical}`;
}

function getElementType(element) {
  if (!element) return '';
  if (element.type) return toCanonicalType(element.type);
  if (element.businessObject && element.businessObject.$type) {
    return toCanonicalType(element.businessObject.$type);
  }
  return '';
}

function getElementRegistry(modeler) {
  if (!modeler || typeof modeler.get !== 'function') return null;
  try {
    return modeler.get('elementRegistry');
  } catch (_) {
    return null;
  }
}

export function getBpmnElementStats(modeler) {
  const elementRegistry = getElementRegistry(modeler);
  const stats = {
    startEvents: 0,
    endEvents: 0,
    tasks: 0,
    gateways: 0,
    intermediateEvents: 0,
    boundaryEvents: 0,
    dataObjects: 0,
    sequenceFlows: 0,
    totalElements: 0
  };

  if (!elementRegistry || typeof elementRegistry.getAll !== 'function') {
    return stats;
  }

  const elements = elementRegistry.getAll();
  stats.totalElements = elements.length;

  elements.forEach((element) => {
    const type = getElementType(element);
    if (!type) return;
    if (type === 'bpmn:StartEvent') stats.startEvents += 1;
    else if (type === 'bpmn:EndEvent' || type === 'bpmn:TerminateEventDefinition' || type === 'bpmn:TerminateEndEvent') stats.endEvents += 1;
    else if (type.startsWith('bpmn:Task') || type === 'bpmn:CallActivity' || type === 'bpmn:SubProcess') stats.tasks += 1;
    else if (type.endsWith('Gateway')) stats.gateways += 1;
    else if (type.startsWith('bpmn:Intermediate')) stats.intermediateEvents += 1;
    else if (type.startsWith('bpmn:Boundary')) stats.boundaryEvents += 1;
    else if (type.startsWith('bpmn:Data')) stats.dataObjects += 1;
    else if (type === 'bpmn:SequenceFlow') stats.sequenceFlows += 1;
  });

  return stats;
}

function parseAttributes(attributeString = '') {
  const attributes = {};
  if (!attributeString || typeof attributeString !== 'string') {
    return attributes;
  }

  const attrRegex = /([a-zA-Z_:][\w.:-]*)\s*=\s*"([^"]*)"/g;
  let match;
  while ((match = attrRegex.exec(attributeString)) !== null) {
    const [, name, value] = match;
    attributes[name] = value;
  }

  return attributes;
}

function getDomFromXml(xml) {
  if (!xml || typeof xml !== 'string') return null;
  if (typeof DOMParser === 'undefined') return null;
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xml, 'text/xml');
    const errors = doc.getElementsByTagName('parsererror');
    if (errors && errors.length > 0) {
      return null;
    }
    return doc;
  } catch (_) {
    return null;
  }
}

export function extractSequenceFlowsFromXml(xml) {
  if (!xml || typeof xml !== 'string') return [];
  const flows = [];
  const doc = getDomFromXml(xml);
  if (doc) {
    const nodes = doc.querySelectorAll('bpmn\\:sequenceFlow, sequenceFlow');
    nodes.forEach((node) => {
      const sourceRef = node.getAttribute('sourceRef');
      const targetRef = node.getAttribute('targetRef');
      const id = node.getAttribute('id') || `${sourceRef || 'unknown'}-${targetRef || 'unknown'}`;
      if (sourceRef && targetRef) {
        flows.push({ id, sourceRef, targetRef });
      }
    });
    return flows;
  }

  const regex = /<bpmn:sequenceFlow\b([^>]*)\/?>(?:\s*<\/bpmn:sequenceFlow>)?/gi;
  let match = null;
  while ((match = regex.exec(xml)) !== null) {
    const attrs = parseAttributes(match[1]);
    const sourceRef = attrs.sourceRef || attrs['bpmn:sourceRef'];
    const targetRef = attrs.targetRef || attrs['bpmn:targetRef'];
    const id = attrs.id || attrs['bpmn:id'] || `${sourceRef || 'unknown'}-${targetRef || 'unknown'}`;
    if (sourceRef && targetRef) {
      flows.push({ id, sourceRef, targetRef });
    }
  }
  return flows;
}

function normalizeCycle(cyclePath) {
  if (!Array.isArray(cyclePath) || cyclePath.length === 0) return '';
  const withoutRepeat = cyclePath.slice(0, -1);
  if (withoutRepeat.length === 0) return cyclePath.join('->');
  const rotations = withoutRepeat.map((_, index) => {
    const rotated = withoutRepeat.slice(index).concat(withoutRepeat.slice(0, index));
    return rotated.join('->');
  });
  const smallest = rotations.sort()[0];
  return `${smallest}->${smallest.split('->')[0]}`;
}

export function findCyclesInFlows(flows) {
  if (!Array.isArray(flows) || flows.length === 0) {
    return [];
  }

  const adjacency = new Map();
  flows.forEach(({ sourceRef, targetRef }) => {
    if (!sourceRef || !targetRef) return;
    if (!adjacency.has(sourceRef)) adjacency.set(sourceRef, []);
    adjacency.get(sourceRef).push(targetRef);
    if (!adjacency.has(targetRef)) adjacency.set(targetRef, []);
  });

  const visited = new Set();
  const stack = new Set();
  const path = [];
  const cycles = [];
  const seenCycles = new Set();

  function dfs(node) {
    stack.add(node);
    path.push(node);

    const neighbors = adjacency.get(node) || [];
    neighbors.forEach((neighbor) => {
      if (stack.has(neighbor)) {
        const cycleStartIndex = path.indexOf(neighbor);
        if (cycleStartIndex !== -1) {
          const cyclePath = path.slice(cycleStartIndex).concat(neighbor);
          const normalized = normalizeCycle(cyclePath);
          if (normalized && !seenCycles.has(normalized)) {
            seenCycles.add(normalized);
            cycles.push(cyclePath);
          }
        }
      } else if (!visited.has(neighbor)) {
        dfs(neighbor);
      }
    });

    stack.delete(node);
    path.pop();
    visited.add(node);
  }

  Array.from(adjacency.keys()).forEach((node) => {
    if (!visited.has(node)) {
      dfs(node);
    }
  });

  return cycles;
}

async function getXmlFromModeler(modeler) {
  if (!modeler) return '';
  if (typeof modeler.xml === 'string' && modeler.xml.trim().length > 0) {
    return modeler.xml;
  }
  if (typeof modeler.saveXML === 'function') {
    try {
      const result = await modeler.saveXML({ format: true });
      if (result && typeof result.xml === 'string') {
        return result.xml;
      }
    } catch (_) {
      return '';
    }
  }
  return '';
}

export async function analyzeBpmnDiagram(modeler, options = {}) {
  const stats = getBpmnElementStats(modeler);
  const xml = options.xml || await getXmlFromModeler(modeler);
  const flows = extractSequenceFlowsFromXml(xml);
  const cycles = findCyclesInFlows(flows);
  const hasStartEvent = stats.startEvents > 0;
  const hasEndEvent = stats.endEvents > 0;
  const hasCycles = cycles.length > 0;
  const hasCyclesWithoutEndEvent = hasCycles && !hasEndEvent;

  return {
    stats: {
      ...stats,
      sequenceFlows: flows.length
    },
    xml,
    flows,
    cycles,
    hasStartEvent,
    hasEndEvent,
    hasCycles,
    hasCyclesWithoutEndEvent
  };
}

export function hasMandatoryEvents(modeler) {
  const stats = getBpmnElementStats(modeler);
  return stats.startEvents > 0 && stats.endEvents > 0;
}

// Registrar helpers en el ServiceRegistry para reutilizarlos desde la aplicación real.
try {
  const registry = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
  if (registry && typeof registry.registerFunction === 'function') {
    registry.registerFunction('bpmn.getElementStats', getBpmnElementStats, { scope: 'bpmn' });
    registry.registerFunction('bpmn.analyzeDiagram', analyzeBpmnDiagram, { scope: 'bpmn' });
    registry.registerFunction('bpmn.extractSequenceFlows', extractSequenceFlowsFromXml, { scope: 'bpmn' });
    registry.registerFunction('bpmn.findCycles', findCyclesInFlows, { scope: 'bpmn' });
  }
} catch (_) {
  // No hacer nada si el registro no está disponible (tests).
}

export default {
  analyzeBpmnDiagram,
  getBpmnElementStats,
  extractSequenceFlowsFromXml,
  findCyclesInFlows,
  hasMandatoryEvents
};
