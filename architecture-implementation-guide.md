# MultiNotation Modeler - Monolithic Modular Architecture

## Implementation Guide

This document provides instructions for implementing the monolithic modular architecture for the MultiNotation Modeler.

## Architecture Overview

The MultiNotation Modeler uses a **monolithic modular architecture with static composition** that integrates the following notations:

- **BPMN** (Business Process Model and Notation)
- **PPINOT** (Process Performance Indicators)
- **RASCI** (Responsibility Assignment Matrix)
- **RALPH** (Resource Assignment Language for Process Handling)

## Implemented Components

The following components have been implemented as part of the new architecture:

### Core Components
- `app/core/MultiNotationModelerCore.js` - Main coordinator for all modelers and panels
- `app/core/MultiNotationModeler.js` - Extension of BPMN-JS that integrates all notations

### Modeler Components
- `app/modelers/bpmn/boot.js` - Handles mounting panels and setting up event handlers
- `app/modelers/ppinot/index.js` - PPINOT integration for PPI indicators
- `app/modelers/ralph/index.js` - RALPH integration for resource assignments

### Infrastructure
- `app/js/event-bus.js` - Communication mechanism between components
- `app/js/panel-registry.js` - Static registry of available panels
- `app/infra/storage-manager.js` - Unified storage interface

### Integration
- `app/js/architecture-adapter.js` - Adapter to integrate new architecture with existing code

## Directory Structure

```
multi-notation-modeler/
├─ app/
│  ├─ core/                    # Core coordination components
│  │  ├─ MultiNotationModelerCore.js
│  │  └─ MultiNotationModeler.js
│  ├─ modelers/                # Specific notation modelers
│  │  ├─ bpmn/
│  │  ├─ ppinot/
│  │  └─ ralph/
│  ├─ js/                      # Core utilities
│  │  ├─ event-bus.js
│  │  ├─ panel-registry.js
│  │  └─ architecture-adapter.js
│  ├─ panels/                  # Panel implementations
│  │  ├─ ppi/
│  │  └─ rasci/
│  └─ infra/                   # Infrastructure components
│     └─ storage-manager.js
```

## Integration Steps

### 1. Add New Files to Your Project

All the necessary files have been created in their respective directories.

### 2. Integrate with app.js

To integrate the new architecture with your existing app.js:

1. Add the following imports to the top of app.js:

```javascript
import { getEventBus } from './js/event-bus.js';
import { initializeArchitecture } from './js/architecture-adapter.js';
```

2. Add the initialization function somewhere after your modeler is initialized:

```javascript
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

// Call this function after modeler initialization
setTimeout(() => {
  initializeWithNewArchitecture();
}, 2000);
```

3. Add a call to this function in your createNewDiagram function:

```javascript
function createNewDiagram() {
  // Existing code...
  
  // After modeler initialization:
  if (typeof initializeWithNewArchitecture === 'function') {
    initializeWithNewArchitecture();
  }
}
```

### 3. Test the Integration

To verify that the integration is working:

1. Check the console for initialization messages
2. Verify that BPMN elements are properly synchronized with PPINOT and RALPH
3. Confirm that panel communication works through the event bus

## Using the Architecture

Once integrated, the architecture provides:

1. **Event Bus** - Use for communication between components:
```javascript
const eventBus = getEventBus();
eventBus.publish('some.event', { data: 'example' });
eventBus.subscribe('some.event', (data) => {
  console.log('Event received:', data);
});
```

2. **Core API** - Access through the global instance:
```javascript
const core = window.mnmCore;
const modeler = core.getModeler();
const store = core.getStore();
```

3. **Panel Registry** - Register new panels:
```javascript
import { PANEL_REGISTRY } from './js/panel-registry.js';

PANEL_REGISTRY.push({
  id: 'panel-custom',
  region: 'right',
  factory: createCustomPanel
});
```

## Troubleshooting

If you encounter issues with the integration:

1. **Path errors**: Ensure that imports in your code match the actual file locations
2. **Initialization errors**: Check that components are initialized in the correct order
3. **Event communication**: Verify that events are properly published and subscribed

## Next Steps

After implementing the basic architecture:

1. Move remaining functionality to appropriate modules
2. Enhance cross-notation validation
3. Improve panel interactions
4. Add more comprehensive testing

## Contact

For assistance with implementation, please contact the development team.
