# Implementation Plan for MultiNotation Modeler Architecture

This document outlines the implementation steps required to achieve the monolithic modular architecture for MultiNotation Modeler as described in the specification.

## Current Structure Analysis

The project already has several components that align with the desired architecture:

1. **MultiNotation Modeler** - Exists as a base class extending BPMN-JS Modeler
2. **BPMN Integration** - Present as the core modeling component
3. **PPINOT Integration** - Available for PPI indicators
4. **RALPH Integration** - Available for resource modeling
5. **Panel Manager & Panel Loader** - Already implement panel management features
6. **RASCI Panel** - Already implemented for responsibility assignments

## Missing Components and Required Changes

### 1. Event Bus Implementation

Create a central event bus to enable communication between modules.

```javascript
// app/js/event-bus.js
export class EventBus {
  constructor() {
    this.subscribers = {};
  }

  subscribe(event, callback) {
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event, callback) {
    if (!this.subscribers[event]) return;
    this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
  }

  publish(event, data) {
    if (!this.subscribers[event]) return;
    this.subscribers[event].forEach(callback => {
      try {
        callback(data);
      } catch (e) {
        console.error(`Error in event subscriber for ${event}:`, e);
      }
    });
  }

  // Special handler for wildcard subscriptions
  subscribeToAll(callback) {
    return this.subscribe('*', callback);
  }
}
```

### 2. Storage Manager Facade

Implement a centralized storage manager to abstract different storage mechanisms.

```javascript
// app/js/storage-manager.js
export class StorageManager {
  constructor(options = {}) {
    this.adapters = {
      localStorage: new LocalStorageAdapter(),
      indexedDB: new IndexedDBAdapter(),
      fileSystem: new FileSystemAdapter()
    };
    this.defaultAdapter = options.defaultAdapter || 'localStorage';
  }

  async save(key, value, options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.save(key, value, options);
  }

  async load(key, options = {}) {
    const adapter = this.getAdapter(options.adapter);
    return adapter.load(key, options);
  }

  getAdapter(adapterName) {
    const adapter = adapterName ? this.adapters[adapterName] : this.adapters[this.defaultAdapter];
    if (!adapter) throw new Error(`Storage adapter '${adapterName || this.defaultAdapter}' not found`);
    return adapter;
  }
}

// Adapter implementations would follow
```

### 3. Panel Registry (Static Configuration)

Replace the current panel loading with a static registry.

```javascript
// app/js/panel-registry.js
export const PANEL_REGISTRY = [
  { 
    id: 'panel-ppi',
    region: 'right',
    factory: () => createPpiPanel()
  },
  {
    id: 'panel-rasci',
    region: 'bottom',
    factory: () => createRasciPanel()
  },
  // Additional panels could be registered here
];

function createPpiPanel() {
  // This would return an object with the panel API:
  return {
    mount: (ctx) => {
      const panel = document.createElement('div');
      panel.id = 'ppi-panel';
      // Setup logic using ctx.eventBus, ctx.store
      // Initialize the PPI panel
      return panel;
    },
    update: (evt) => {
      // Handle updates based on events
    },
    unmount: () => {
      // Clean up logic
    }
  };
}

function createRasciPanel() {
  // Similar to PPI panel but for RASCI
  // ...
}
```

### 4. BPMN Boot Process

Modify BPMN initialization to load and mount all panels.

```javascript
// app/modelers/bpmn/boot.js
import { PANEL_REGISTRY } from '../panel-registry';

export function bootUI({ eventBus, panelManager, store }) {
  // Mount all registered panels
  PANEL_REGISTRY.forEach(({ id, region, factory }) => {
    const panel = factory();
    const el = panel.mount({ eventBus, store });
    panelManager.attach(id, el, { region });
    
    // Subscribe to all events for panel updates
    eventBus.subscribe('*', (evt) => panel.update(evt));
  });
  
  // Additional UI setup specific to BPMN could go here
}
```

### 5. MultiNotation Modeler Core Refactoring

Enhance the existing MultiNotationModeler to act as the central coordinator.

```javascript
// app/core/MultiNotationModeler.js
import { EventBus } from '../js/event-bus';
import { StorageManager } from '../js/storage-manager';
import { bootUI } from '../modelers/bpmn/boot';

export default class MultiNotationModeler {
  constructor(options) {
    this.eventBus = new EventBus();
    this.store = new StorageManager(options.storage || {});
    this.panelManager = options.panelManager;
    
    // Initialize BPMN modeler as the primary modeler
    this.bpmnModeler = new BPMNModeler({
      container: options.container,
      // Additional BPMN-specific options
    });
    
    // Initialize auxiliary modelers
    this.ppinotModeler = new PPINOTModeler({
      eventBus: this.eventBus,
      bpmnModeler: this.bpmnModeler
    });
    
    this.ralphModeler = new RALPHModeler({
      eventBus: this.eventBus,
      bpmnModeler: this.bpmnModeler
    });
    
    // Boot the UI with all panels
    bootUI({
      eventBus: this.eventBus,
      panelManager: this.panelManager,
      store: this.store
    });
    
    // Setup event listeners for synchronization
    this.setupEventListeners();
  }
  
  setupEventListeners() {
    // Listen for BPMN changes to update other notations
    this.eventBus.subscribe('bpmn.element.changed', (evt) => {
      this.ppinotModeler.handleBPMNChange(evt);
      this.ralphModeler.handleBPMNChange(evt);
      this.eventBus.publish('model.changed', { source: 'bpmn', ...evt });
    });
    
    // Similar subscriptions for other notations
  }
  
  // API methods for external interaction
  saveDiagram() {
    // Save logic combining all notations
  }
  
  loadDiagram(diagram) {
    // Load logic distributing to all notations
  }
}
```

### 6. App Entry Point Refactoring

Refactor app.js to use the new architecture.

```javascript
// app/app.js
import MultiNotationModeler from './core/MultiNotationModeler';
import { PanelManager } from './js/panel-manager';

document.addEventListener('DOMContentLoaded', () => {
  const container = document.getElementById('js-canvas');
  const panelContainer = document.getElementById('panel-container');
  
  // Initialize panel manager
  const panelManager = new PanelManager(panelContainer);
  
  // Initialize the MultiNotation Modeler
  const modeler = new MultiNotationModeler({
    container,
    panelManager,
    storage: {
      defaultAdapter: 'localStorage'
    }
  });
  
  // Make modeler instance globally available (for development/debugging)
  window.modeler = modeler;
  
  // Load initial diagram or show welcome screen
  // ...
});
```

## Implementation Phases

### Phase 1: Foundation
1. Create the EventBus implementation
2. Refactor the Storage Manager as a proper facade
3. Create the static Panel Registry

### Phase 2: Core Components
4. Refactor MultiNotationModeler to use the EventBus
5. Modify BPMN boot process to mount all panels
6. Adapt PPINOT and RALPH integrations to work with the EventBus

### Phase 3: Panel System
7. Standardize the Panel API (mount, update, unmount)
8. Adapt RASCI and PPI panels to use the standardized API
9. Integrate the Panel Manager with the new architecture

### Phase 4: Integration & Testing
10. Update app.js to use the new architecture
11. Test all interactions between components
12. Fix synchronization issues between notations

## Directory Structure Changes

The new directory structure should be updated to match the proposed structure:

```
multi-notation-modeler/
├─ app/                # App Shell, EventBus, PanelManager, Storage
├─ core/               # MultiNotationModeler (state/synchronization)
├─ modelers/
│  ├─ bpmn/            # integration bpmn-js/diagram-js + panel mounting
│  ├─ ppinot/          # PPI domain and utilities
│  └─ ralph/           # resource/role domain
├─ panels/
│  ├─ ppi/             # PPI panel
│  └─ rasci/           # RASCI panel
├─ public/             # index.html, css, images, bundles
├─ docs/               # diagrams and documentation
└─ infra/              # storage adapters, utilities
```

This would require moving some existing files to their new locations according to this structure.
