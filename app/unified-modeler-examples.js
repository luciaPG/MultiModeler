/**
 * Unified Modeler Architecture - Single Modeler Instance
 * 
 * This architecture uses ONLY ONE modeler instance that can dynamically
 * enable/disable PPINOT and RALPH notations as needed.
 */

import BaseModeler from './baseModeler/index.js';

// Create a single hybrid modeler instance that supports all notations
const unifiedModeler = new BaseModeler({
  container: '#canvas-hybrid',
  notations: ['ppinot', 'ralph']
});

// Example functions to demonstrate dynamic notation switching
function enableBPMNOnly() {
  unifiedModeler.disableNotation('ppinot');
  unifiedModeler.disableNotation('ralph');
  console.log('Current mode: BPMN only');
  console.log('Enabled notations:', unifiedModeler.getEnabledNotations());
}

function enablePPINOTMode() {
  unifiedModeler.enableNotation('ppinot');
  unifiedModeler.disableNotation('ralph');
  console.log('Current mode: BPMN + PPINOT');
  console.log('Enabled notations:', unifiedModeler.getEnabledNotations());
}

function enableRALPHMode() {
  unifiedModeler.disableNotation('ppinot');
  unifiedModeler.enableNotation('ralph');
  console.log('Current mode: BPMN + RALPH');
  console.log('Enabled notations:', unifiedModeler.getEnabledNotations());
}

function enableHybridMode() {
  unifiedModeler.enableNotation('ppinot');
  unifiedModeler.enableNotation('ralph');
  console.log('Current mode: Full Hybrid (BPMN + PPINOT + RALPH)');
  console.log('Enabled notations:', unifiedModeler.getEnabledNotations());
}

// Initialize in full hybrid mode
console.log('Unified Modeler initialized');
console.log('Configuration:', unifiedModeler.getConfiguration());
console.log('Is unified?', unifiedModeler.isUnifiedModeler());

// Expose the single modeler instance and control functions
export {
  unifiedModeler,
  enableBPMNOnly,
  enablePPINOTMode,
  enableRALPHMode,
  enableHybridMode
};
