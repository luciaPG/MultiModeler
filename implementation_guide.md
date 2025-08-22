# MultiNotation Modeler Implementation Guide

This document provides instructions on how to implement the monolithic modular architecture for the MultiNotation Modeler as described in the specification.

## Architecture Overview

The MultiNotation Modeler uses a **monolithic modular architecture with static composition** that integrates the following notations:

- **BPMN** (Business Process Model and Notation)
- **PPINOT** (Process Performance Indicators)
- **RASCI** (Responsibility Assignment Matrix)
- **RALPH** (Resource Assignment Language for Process Handling)

The architecture follows these key principles:

1. **Unification**: A single tool that coordinates all notations
2. **Modularity**: Clear responsibilities by module
3. **Simplicity**: Single build and deployment as a web SPA
4. **Maintainability**: Stable contracts between modules and panels
5. **Usability**: Consistent panels and low learning curve

## Implementation Steps

### 1. Set Up the Core Structure

Start by reorganizing the project to match the proposed directory structure:

```
multi-notation-modeler/
├─ app/             # App Shell, EventBus, PanelManager, Storage
├─ core/            # MultiNotationModeler (state/synchronization)
├─ modelers/
│  ├─ bpmn/         # integration bpmn-js/diagram-js + panel mounting
│  ├─ ppinot/       # PPI domain and utilities
│  └─ ralph/        # resource/role domain
├─ panels/
│  ├─ ppi/          # PPI panel
│  └─ rasci/        # RASCI panel
├─ public/          # index.html, css, images, bundles
├─ docs/            # diagrams and documentation
└─ infra/           # storage adapters, utilities
```

### 2. Implement Core Components

#### Event Bus

The Event Bus enables decoupled communication between modules and panels:

```javascript
// app/js/event-bus.js
export class EventBus {
  constructor() {
    this.subscribers = {};
    this.wildcardSubscribers = [];
  }
  
  subscribe(event, callback) {
    // Implementation...
  }
  
  publish(event, data) {
    // Implementation...
  }
}
```

#### Panel Registry

Create a static panel registry instead of dynamic loading:

```javascript
// app/js/panel-registry.js
export const PANEL_REGISTRY = [
  { id: 'panel-ppi', region: 'right', factory: createPpiPanel },
  { id: 'panel-rasci', region: 'bottom', factory: createRasciPanel }
];

function createPpiPanel() {
  // Return panel with mount, update, unmount methods
}

function createRasciPanel() {
  // Return panel with mount, update, unmount methods
}
```

#### Storage Manager

Implement a facade for different storage mechanisms:

```javascript
// app/infra/storage-manager.js
export class StorageManager {
  constructor(options = {}) {
    this.adapters = {
      localStorage: new LocalStorageAdapter(),
      indexedDB: new IndexedDBAdapter(),
      fileSystem: new FileSystemAdapter()
    };
    // Implementation...
  }
  
  async save(key, value, options = {}) {
    // Implementation...
  }
  
  async load(key, options = {}) {
    // Implementation...
  }
}
```

### 3. Modify BPMN Integration

BPMN will act as the backbone and mount all panels:

```javascript
// app/modelers/bpmn/boot.js
export function bootUI({ eventBus, panelManager, store }) {
  PANEL_REGISTRY.forEach(({ id, region, factory }) => {
    const panel = factory();
    const el = panel.mount({ eventBus, store });
    panelManager.attach(id, el, { region });
    eventBus.subscribe('*', (evt) => panel.update(evt));
  });
  
  // Additional BPMN setup...
}
```

### 4. MultiNotation Core

Create the central coordinator for all notations:

```javascript
// app/core/MultiNotationModelerCore.js
export class MultiNotationModelerCore {
  constructor(options) {
    this.eventBus = options.eventBus || getEventBus();
    this.store = options.store || new StorageManager();
    this.panelManager = options.panelManager;
    // Implementation...
  }
  
  async initialize() {
    // Initialize BPMN, auxiliary notations, panels...
  }
  
  setupEventListeners() {
    // Set up synchronization between notations...
  }
}
```

### 5. Panel System

Standardize the panel API for all panels:

```javascript
// Common panel interface
{
  mount: (ctx) => {
    // Return the DOM element
  },
  update: (evt) => {
    // Handle updates based on events
  },
  unmount: () => {
    // Clean up resources
  }
}
```

### 6. Update App Entry Point

Refactor the main app.js to use the new architecture:

```javascript
// app/app.js
import { MultiNotationModelerCore } from './core/MultiNotationModelerCore';
import { PanelManager } from './js/panel-manager';
import { getEventBus } from './js/event-bus';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize components...
  const eventBus = getEventBus();
  const panelManager = new PanelManager();
  
  const core = new MultiNotationModelerCore({
    eventBus,
    panelManager,
    // Additional options...
  });
  
  core.initialize().catch(error => {
    console.error('Failed to initialize:', error);
  });
});
```

## Implementation Order

1. Set up directory structure
2. Implement EventBus
3. Create Panel Registry
4. Implement Storage Manager
5. Create BPMN boot process
6. Implement MultiNotation Core
7. Adapt existing panels to the standardized API
8. Update app.js to use the new architecture
9. Test and refine

## Testing Your Implementation

After implementing the architecture:

1. Start the application
2. Verify that all panels load correctly
3. Check that BPMN, PPINOT, RALPH, and RASCI notations interact properly
4. Test synchronization between notations (e.g., BPMN changes affecting PPINOT)
5. Test panel operations (mounting/unmounting)
6. Test model saving and loading

## Common Issues and Solutions

- **Panel loading failures**: Check that panel factories return properly structured objects
- **Event synchronization issues**: Verify that events are being published and subscribed to correctly
- **Storage problems**: Test each storage adapter separately
- **BPMN integration issues**: Make sure BPMN events are properly connected to the EventBus

## Next Steps

Once the base architecture is in place, consider:

1. Adding more comprehensive validation between notations
2. Improving the user experience with better panel interactions
3. Adding support for additional notations
4. Enhancing the storage capabilities with cloud sync
