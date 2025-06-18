import $ from 'jquery';
import HybridModeler from './hybrid';
import BpmnModdle from 'bpmn-moddle';
import PPINOTDescriptor from './PPINOT-modeler/PPINOT/PPINOT.json';
import RALPHDescriptor from './RALPH-modeler/RALph/RALPH.json';

// Import BPMN CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';

// Import diagram-js CSS
import 'diagram-js/assets/diagram-js.css';

// Import custom CSS
import './hybrid/css/hybrid-app.css';

console.log('Hybrid app starting...');

let hybridModeler;

console.log('Creating hybrid modeler...');

// Create the hybrid modeler with PPINOT moddle extension only for now
hybridModeler = new HybridModeler({
  container: '#canvas',
  keyboard: {
    bind: true
  },
  moddleExtensions: {
    PPINOT: PPINOTDescriptor
    // TODO: Add RALPH when descriptor conflicts are resolved
    // RALPH: RALPHDescriptor
  }
});

console.log('Hybrid modeler created:', hybridModeler);

// Initial empty diagram
const emptyBpmnXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                 xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                 xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                 xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                 id="Definitions_1" 
                 targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;

// Load empty diagram
hybridModeler.importXML(emptyBpmnXml).then(() => {
  console.log('Hybrid modeler loaded successfully');
  
  // Debug: Check if palette exists
  const palette = hybridModeler.get('palette');
  console.log('Palette:', palette);
  
  try {
    const entries = palette.getEntries();
    console.log('Palette entries:', entries);
    console.log('Available tools:', Object.keys(entries));
  } catch (error) {
    console.error('Error getting palette entries:', error);
  }
  
  // Check if PPINOT palette provider exists
  try {
    const paletteProvider = hybridModeler.get('paletteProvider');
    console.log('Palette provider:', paletteProvider);
    console.log('Palette provider type:', paletteProvider.constructor.name);
  } catch (error) {
    console.error('Error getting palette provider:', error);
  }
  
  // Set up notation mode controls
  setupNotationControls();
  
  // Set up file operations
  setupFileOperations();
  
}).catch(error => {
  console.error('Error loading hybrid modeler:', error);
});

function setupNotationControls() {
  const ppinnotBtn = document.getElementById('ppinot-mode');
  const ralphBtn = document.getElementById('ralph-mode');
  const hybridBtn = document.getElementById('hybrid-mode');
  
  if (ppinnotBtn) {
    ppinnotBtn.addEventListener('click', () => {
      hybridModeler.setNotationMode('ppinot');
      updateModeButtons('ppinot');
    });
  }
  
  if (ralphBtn) {
    ralphBtn.addEventListener('click', () => {
      hybridModeler.setNotationMode('ralph');
      updateModeButtons('ralph');
    });
  }
  
  if (hybridBtn) {
    hybridBtn.addEventListener('click', () => {
      hybridModeler.setNotationMode('hybrid');
      updateModeButtons('hybrid');
    });
  }
    // Set initial mode
  updateModeButtons('ppinot');
}

function updateModeButtons(activeMode) {
  const buttons = ['ppinot-mode', 'ralph-mode', 'hybrid-mode'];
  buttons.forEach(btnId => {
    const btn = document.getElementById(btnId);
    if (btn) {
      btn.classList.remove('active');
      if (btnId === activeMode + '-mode') {
        btn.classList.add('active');
      }
    }
  });
  
  // Update status indicator
  const statusIndicator = document.getElementById('notation-status');
  if (statusIndicator) {
    statusIndicator.textContent = `Mode: ${activeMode.toUpperCase()}`;
  }
}

function setupFileOperations() {
  const saveBtn = document.getElementById('save-diagram');
  const loadBtn = document.getElementById('load-diagram');
  const fileInput = document.getElementById('file-input');
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      saveDiagram();
    });
  }
  
  if (loadBtn) {
    loadBtn.addEventListener('click', () => {
      if (fileInput) {
        fileInput.click();
      }
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', (event) => {
      const file = event.target.files[0];
      if (file) {
        loadDiagram(file);
      }
    });
  }
}

function saveDiagram() {
  hybridModeler.saveXML({ format: true }).then(result => {
    const xml = result.xml;
    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'hybrid-diagram.bpmn';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }).catch(error => {
    console.error('Error saving diagram:', error);
  });
}

function loadDiagram(file) {
  const reader = new FileReader();
  reader.onload = function(e) {
    const xml = e.target.result;
    hybridModeler.importXML(xml).then(() => {
      console.log('Diagram loaded successfully');
    }).catch(error => {
      console.error('Error loading diagram:', error);
    });
  };
  reader.readAsText(file);
}

// Export modeler for debugging
window.hybridModeler = hybridModeler;
