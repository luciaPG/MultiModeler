// Example of integrating the new architecture with the existing app.js
// This file shows how to gradually integrate the new architecture components

// 1. Import the new architecture components
import { getEventBus } from './event-bus.js';
import { MultiNotationModelerCore } from '../../multinotationModeler/core/MultiNotationModelerCore.js';

// 2. After your existing app.js initialization code, add:
function initializeNewArchitecture() {
  // Get references to existing components
  const panelManager = window.panelManager;
  
  // Create the event bus
  const eventBus = getEventBus();
  
  // Create the core component
  const core = new MultiNotationModelerCore({
    eventBus,
    panelManager,
    bpmnModeler: window.modeler // Use the existing modeler
  });
  
  // Initialize the core component
  core.initialize().then(() => {
    console.log('MultiNotation Modeler Core initialized successfully');
    
    // Make core available globally for development/debugging
    window.mnmCore = core;
  }).catch(error => {
    console.error('Failed to initialize MultiNotation Modeler Core:', error);
  });
}

// 3. Call this function after your modeler is initialized
// For example, you can add this to the end of your initializeModeler function:
/*
function initializeModeler() {
  // ... your existing code ...
  
  // Initialize the new architecture after the modeler is ready
  setTimeout(() => {
    initializeNewArchitecture();
  }, 1000);
}
*/

// 4. Alternatively, you can add a button to your interface to test the new architecture:
function addTestButton() {
  const button = document.createElement('button');
  button.textContent = 'Initialize New Architecture';
  button.style.position = 'fixed';
  button.style.bottom = '20px';
  button.style.right = '20px';
  button.style.zIndex = '9999';
  button.style.padding = '10px';
  button.style.backgroundColor = '#4CAF50';
  button.style.color = 'white';
  button.style.border = 'none';
  button.style.borderRadius = '5px';
  button.style.cursor = 'pointer';
  
  button.addEventListener('click', () => {
    initializeNewArchitecture();
  });
  
  document.body.appendChild(button);
}

// Uncomment to add a test button
// document.addEventListener('DOMContentLoaded', addTestButton);
