# Migration Plan for MultiNotation Modeler Architecture

This document provides a step-by-step plan to migrate the existing structure to the monolithic modular architecture while maintaining compatibility with existing files.

## Current Structure vs. Target Structure

### Current Structure:
```
app/
├── MultiNotationModeler/index.js
├── PPINOT-modeler/PPINOT/PPINOTModdle.json
├── RALPH-modeler/RALph/RALphModdle.json
├── js/
    ├── panel-loader.js
    ├── panel-manager.js
    ├── panels/
        ├── rasci/
        ├── ppi/
```

### Target Structure:
```
app/
├── core/              # MultiNotationModeler (state/synchronization)
├── modelers/
│   ├── bpmn/          # integration bpmn-js/diagram-js + panel mounting
│   ├── ppinot/        # PPI domain and utilities
│   └── ralph/         # resource/role domain
├── panels/
│   ├── ppi/           # PPI panel
│   └── rasci/         # RASCI panel
├── js/
│   ├── event-bus.js   # Communication channel
│   ├── panel-registry.js # Static panel registration
├── infra/            # storage adapters, utilities
```

## Migration Phases

### Phase 1: Prepare Without Structure Change
1. Add new components without changing existing structure
   - Add event-bus.js to app/js/
   - Add panel-registry.js to app/js/ 
   - Add storage-manager.js to app/js/ (instead of app/infra/)

2. Create compatibility wrapper for MultiNotationModeler
   - Create boot.js in app/js/ (instead of app/modelers/bpmn/)
   - Create MultiNotationModelerCore.js in app/js/ (instead of app/core/)

### Phase 2: Gradually Refactor Imports
1. Modify app.js to use the new components but with existing paths
2. Update imports in existing files to use the new components via compatibility wrappers

### Phase 3: Migrate Structure (Optional)
Once the application is working with the new architecture components:
1. Create the new directory structure
2. Move files to their new locations
3. Update import paths in all files

## Detailed Migration Steps

### Phase 1: Prepare Without Structure Change

1. **Add event-bus.js to app/js/**
   ```javascript
   // app/js/event-bus.js
   export class EventBus {
     // Implementation as provided earlier
   }
   
   export function getEventBus() {
     // Implementation as provided earlier
   }
   ```

2. **Add panel-registry.js to app/js/** 
   ```javascript
   // app/js/panel-registry.js
   // Use existing paths for imports
   import { initRasciPanel } from './panels/rasci/core/main.js';
   
   // Implementation as provided earlier with path adjustments
   ```

3. **Add boot.js to app/js/**
   ```javascript
   // app/js/boot.js
   import { PANEL_REGISTRY } from './panel-registry.js';
   
   export function bootUI(ctx) {
     // Implementation as provided earlier
   }
   ```

4. **Create MultiNotationModelerCore.js in app/js/**
   ```javascript
   // app/js/MultiNotationModelerCore.js
   import { getEventBus } from './event-bus.js';
   import { bootUI } from './boot.js';
   
   export class MultiNotationModelerCore {
     // Implementation adapted to use existing paths
   }
   ```

### Phase 2: Modify app.js

Create a modified version of app.js that uses the new components but maintains compatibility:

```javascript
// app.js (modified to use new architecture)
import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
import StoragePathManager from './js/storage-path-manager.js';
import './js/panel-manager.js';
import './js/import-export-manager.js';
import './js/storage-manager.js';

// Import new architecture components
import { getEventBus } from './js/event-bus.js';
import { MultiNotationModelerCore } from './js/MultiNotationModelerCore.js';

// Rest of app.js with gradual integration of new components
```

## Testing the Migration

1. Test each phase before moving to the next
2. Verify that all existing functionality continues to work
3. Add new features that leverage the new architecture
4. Watch for path-related errors and fix import statements as needed

## Completion Criteria

The migration is complete when:
1. All components are using the EventBus for communication
2. Panels are registered through the panel-registry
3. BPMN is responsible for mounting all panels
4. Storage operations go through the StorageManager facade
5. The application works without errors
