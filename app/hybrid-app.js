/**
 * Unified Hybrid Modeler Application
 * 
 * This is the main application that demonstrates the unified modeler architecture
 * with a single modeler instance and dynamic notation switching.
 */

import PPINOTDescriptor from './PPINOT-modeler/PPINOT/PPINOT.json';

// Import BaseModeler for the unified architecture
import BaseModeler from './baseModeler/index.js';

// Test: Import basic bpmn-js Modeler for debugging
import BpmnModeler from 'bpmn-js/lib/Modeler';

// Import required CSS
import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/hybrid-app.css';

class HybridApp {
  constructor() {
    this.modeler = null;
    this.currentFile = null;
    this.initializeApp();
  }  initializeApp() {
    console.log('Initializing Unified Hybrid Modeler Application...');
    
    // Wait for DOM to be fully loaded
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => this.initializeModeler());
    } else {
      this.initializeModeler();
    }
  }

  initializeModeler() {
    console.log('DOM ready, creating modeler...');
    
    // Verify that the canvas element exists
    const canvasElement = document.querySelector('#canvas');
    if (!canvasElement) {
      throw new Error('Canvas element #canvas not found in DOM');
    }
      console.log('Canvas element found:', canvasElement);
    console.log('Canvas element dimensions:', canvasElement.getBoundingClientRect());    // Now test with BaseModeler but without additional modules
    try {
      console.log('Creating BaseModeler with minimal configuration...');
      const baseModeler = new BaseModeler({
        container: '#canvas',
        width: '100%',
        height: '600px',
        notations: [] // Start with no additional notations
      });
      
      console.log('BaseModeler created successfully:', baseModeler);
      
      // Store the base modeler
      this.modeler = baseModeler;
      
      // Load a simple BPMN diagram
      const simpleBPMN = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" id="Definitions_1" targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="true">
    <bpmn:startEvent id="StartEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="179" y="79" width="36" height="36" />
      </bpmndi:BPMNShape>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;      // Import the diagram
      baseModeler.importXML(simpleBPMN).then(() => {
        console.log('✅ Simple BPMN diagram loaded successfully');
      }).catch(err => {
        console.error('❌ Failed to load simple BPMN diagram:', err);
      });// Wait a bit then try to access palette
      setTimeout(() => {        try {
          console.log('🔍 Checking for palette after 1 second...');
          
          // Check all available services
          console.log('🔧 Available services in modeler:');
          try {
            const services = Object.keys(this.modeler._container._providers);
            console.log('📋 Services:', services.sort());
          } catch (e) {
            console.log('Could not get services list:', e);
          }
          
          const palette = this.modeler.get('palette');
          console.log('✅ Basic modeler palette found:', palette);
          
          if (palette && palette.getEntries) {
            const entries = palette.getEntries();
            console.log('🎨 Basic modeler palette entries:', entries);
            console.log('📊 Number of palette entries:', Object.keys(entries).length);
            
            // Check palette internal state
            console.log('🔍 Palette internal state:');
            console.log('  - _canvas:', palette._canvas);
            console.log('  - _container:', palette._container);
            console.log('  - _providers:', palette._providers);
            console.log('  - _providerMap:', palette._providerMap);
            
            // Try to trigger palette creation manually
            if (palette.open) {
              console.log('🔓 Trying to open palette manually...');
              palette.open();
            }
            
          } else {
            console.warn('⚠️ Palette found but no getEntries method');
          }
          
          // Check if palette DOM element exists
          const paletteElement = document.querySelector('.djs-palette');
          console.log('🔍 Palette DOM element:', paletteElement);
          
          if (paletteElement) {
            console.log('📏 Palette element dimensions:', paletteElement.getBoundingClientRect());
            console.log('🎨 Palette element styles:', window.getComputedStyle(paletteElement));
            console.log('👶 Palette element children:', paletteElement.children.length);
          } else {
            console.error('❌ Palette DOM element not found!');
            // Let's check what's in the canvas
            const canvasElement = document.querySelector('#canvas');
            if (canvasElement) {
              console.log('🖼️ Canvas children:', canvasElement.children);
              console.log('🔍 Looking for any palette-related elements...');
              const allPaletteElements = document.querySelectorAll('[class*="palette"]');
              console.log('🎨 All palette-related elements:', allPaletteElements);
            }
          }
            } catch (e) {
          console.error('❌ Failed to get palette from basic modeler:', e);
        }
      }, 1000);
        } catch (error) {
      console.error('Failed to create basic modeler:', error);
      return;
    }

    this.setupEventListeners();
    this.updateUI();
    
    console.log('Unified Hybrid Modeler initialized');
  }

  setupEventListeners() {
    // Notation mode buttons
    document.getElementById('ppinot-mode').addEventListener('click', () => {
      this.switchToPPINOTMode();
    });

    document.getElementById('ralph-mode').addEventListener('click', () => {
      this.switchToRALPHMode();
    });

    document.getElementById('hybrid-mode').addEventListener('click', () => {
      this.switchToHybridMode();
    });

    // File operations
    document.getElementById('load-diagram').addEventListener('click', () => {
      this.loadDiagram();
    });

    document.getElementById('save-diagram').addEventListener('click', () => {
      this.saveDiagram();
    });

    // File input change
    document.getElementById('file-input').addEventListener('change', (event) => {
      this.handleFileLoad(event);
    });

    // Listen for notation events from the modeler
    if (this.modeler.get) {
      try {
        const eventBus = this.modeler.get('eventBus');
        eventBus.on('notation.enabled', (event) => {
          console.log('Notation enabled:', event.notation);
          this.updateUI();
        });
        
        eventBus.on('notation.disabled', (event) => {
          console.log('Notation disabled:', event.notation);
          this.updateUI();
        });
      } catch (error) {
        console.warn('Could not set up modeler event listeners:', error.message);
      }
    }
  }
  switchToPPINOTMode() {
    console.log('Switching to PPINOT mode...');
    // TODO: Implement PPINOT mode switching when BaseModeler is integrated
    this.updateUI('PPINOT');
  }

  switchToRALPHMode() {
    console.log('Switching to RALPH mode...');
    // TODO: Implement RALPH mode switching when BaseModeler is integrated
    this.updateUI('RALPH');
  }

  switchToHybridMode() {
    console.log('Switching to Hybrid mode...');
    // TODO: Implement Hybrid mode switching when BaseModeler is integrated
    this.updateUI('Hybrid');
  }
  updateUI(mode = null) {
    // For basic bpmn-js modeler, just update the status
    const currentMode = mode || 'BPMN';
    
    document.getElementById('notation-status').textContent = `Mode: ${currentMode}`;
    
    // Update button states
    document.querySelectorAll('.mode-btn').forEach(btn => btn.classList.remove('active'));
    
    if (currentMode === 'PPINOT') {
      document.getElementById('ppinot-mode').classList.add('active');
    } else if (currentMode === 'RALPH') {
      document.getElementById('ralph-mode').classList.add('active');
    } else if (currentMode === 'Hybrid') {
      document.getElementById('hybrid-mode').classList.add('active');
    } else {
      // Default to hybrid mode active
      document.getElementById('hybrid-mode').classList.add('active');
    }

    console.log('UI updated - Mode:', currentMode);
  }

  getCurrentModeLabel(notations) {
    if (notations.includes('ppinot') && notations.includes('ralph')) {
      return 'Hybrid';
    } else if (notations.includes('ppinot')) {
      return 'PPINOT';
    } else if (notations.includes('ralph')) {
      return 'RALPH';
    } else {
      return 'BPMN';
    }
  }

  loadDiagram() {
    document.getElementById('file-input').click();
  }

  handleFileLoad(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const xml = e.target.result;
      this.modeler.importXML(xml)
        .then(() => {
          console.log('Diagram loaded successfully');
          this.currentFile = file.name;
        })
        .catch((error) => {
          console.error('Error loading diagram:', error);
          alert('Error loading diagram: ' + error.message);
        });
    };
    reader.readAsText(file);
  }

  saveDiagram() {
    this.modeler.saveXML({ format: true })
      .then((result) => {
        const xml = result.xml;
        const filename = this.currentFile || 'diagram.bpmn';
        this.downloadFile(xml, filename);
        console.log('Diagram saved successfully');
      })
      .catch((error) => {
        console.error('Error saving diagram:', error);
        alert('Error saving diagram: ' + error.message);
      });
  }

  downloadFile(content, filename) {
    const blob = new Blob([content], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // API for external access
  getModeler() {
    return this.modeler;
  }

  getConfiguration() {
    return this.modeler ? this.modeler.getConfiguration() : null;
  }
}

// Initialize the application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.hybridApp = new HybridApp();
  
  // Expose modeler instance globally for debugging
  window.modeler = window.hybridApp.getModeler();
  
  console.log('Hybrid application ready. Available globals: window.hybridApp, window.modeler');
});
