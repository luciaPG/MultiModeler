// RASCI Panel - Main entry point
// Exporta todas las funcionalidades del sistema RASCI incluyendo el validador inteligente

// Core functionality
export { initRasciPanel } from './core/main.js';
export { renderMatrix, addNewRole, editRole, deleteRole, showDeleteConfirmModal } from './core/matrix-manager.js';

// Validation system
export { RasciMatrixValidator, rasciValidator } from './validation/matrix-validator.js';
export { RasciMatrixUIValidator, rasciUIValidator } from './ui/matrix-ui-validator.js';

// Mapping functionality
export { initRasciMapping, executeSimpleRasciMapping } from './mapping/index.js';

// Auto-mapping functionality
export { initializeAutoMapping } from './mapping/auto-mapper.js';
