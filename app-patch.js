// app.js patch for architecture integration
// Add these imports at the top of the file:

import { getEventBus } from './js/event-bus.js';
import { initializeArchitecture } from './js/architecture-adapter.js';

// Add this at the end of the initializeModeler function:

async function initializeWithNewArchitecture() {
  // Wait for modeler to be fully initialized
  if (!modeler || !window.modeler) {
    setTimeout(initializeWithNewArchitecture, 500);
    return;
  }

  try {
    // Initialize the new architecture
    const result = await initializeArchitecture();
    
    if (result.success) {
      console.log('Successfully initialized new architecture');
    } else {
      console.error('Failed to initialize new architecture:', result.error);
    }
  } catch (error) {
    console.error('Error initializing new architecture:', error);
  }
}

// Add this to your DOM ready handler or window.onload:
setTimeout(() => {
  // Allow some time for other components to initialize
  initializeWithNewArchitecture();
}, 2000);

// Modify your existing modeler initialization as follows:

function createNewDiagram() {
  // Existing code...
  
  // After modeler initialization and diagram creation:
  if (typeof initializeWithNewArchitecture === 'function') {
    initializeWithNewArchitecture();
  }
}

// Add the following button to your UI for testing:
function addArchitectureTestButton() {
  const container = document.querySelector('.buttons');
  if (!container) return;
  
  const button = document.createElement('button');
  button.textContent = 'Initialize Architecture';
  button.className = 'btn btn-primary';
  button.style.marginLeft = '10px';
  button.onclick = initializeWithNewArchitecture;
  
  container.appendChild(button);
}

// Call this function after the UI is initialized:
setTimeout(addArchitectureTestButton, 2000);
