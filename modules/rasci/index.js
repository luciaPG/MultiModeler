// RASCI Panel Module
// This module integrates existing RASCI functionality with the new modular architecture

// Core functionality
import { initRasciPanel } from './core/main.js';
import { renderMatrix, addNewRole, editRole, deleteRole, showDeleteConfirmModal, forceReloadMatrix } from './core/matrix-manager.js';

// Validation system
import { RasciMatrixValidator, rasciValidator } from './validation/matrix-validator.js';
import { RasciMatrixUIValidator, rasciUIValidator } from './ui/matrix-ui-validator.js';

// Mapping functionality
import { initRasciMapping, executeSimpleRasciMapping } from './mapping/index.js';

// Auto-mapping functionality
import { initializeAutoMapping } from './mapping/auto-mapper.js';

/**
 * RASCI Matrix Manager
 * Manages the RASCI matrix data and UI
 */
class RASCIManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.matrixData = {
      roles: [],
      tasks: [],
      assignments: {}
    };
    
    // Bind methods
    this.updateMatrix = this.updateMatrix.bind(this);
    this.getMatrixData = this.getMatrixData.bind(this);
  }
  
  /**
   * Initialize the RASCI Manager
   */
  async initialize() {
    // Set up event listeners
    if (this.eventBus) {
      this.eventBus.subscribe('bpmn.tasks.updated', (event) => {
        this.syncTasksFromBPMN(event.tasks);
      });
    }
    
    // Get initial data if available
    if (window.rasciMatrixData) {
      this.matrixData = window.rasciMatrixData;
    }
    
    console.log('[RASCI] Manager initialized');
    return this;
  }
  
  /**
   * Synchronize tasks from BPMN model
   * @param {Array} tasks - BPMN tasks
   */
  syncTasksFromBPMN(tasks) {
    // Update tasks in RASCI matrix
    const existingTaskIds = this.matrixData.tasks.map(task => task.id);
    
    // Add new tasks
    const newTasks = tasks
      .filter(task => !existingTaskIds.includes(task.id))
      .map(task => ({
        id: task.id,
        name: task.name || task.id,
        type: task.type
      }));
      
    if (newTasks.length > 0) {
      this.matrixData.tasks = [...this.matrixData.tasks, ...newTasks];
      
      // Initialize empty assignments for new tasks
      newTasks.forEach(task => {
        this.matrixData.assignments[task.id] = {};
      });
      
      this.eventBus.publish('rasci.matrix.updated', { matrix: this.matrixData });
    }
    
    // Remove deleted tasks
    const currentTaskIds = tasks.map(task => task.id);
    const tasksToRemove = existingTaskIds.filter(id => !currentTaskIds.includes(id));
    
    if (tasksToRemove.length > 0) {
      this.matrixData.tasks = this.matrixData.tasks
        .filter(task => !tasksToRemove.includes(task.id));
        
      // Remove assignments for deleted tasks
      tasksToRemove.forEach(taskId => {
        delete this.matrixData.assignments[taskId];
      });
      
      this.eventBus.publish('rasci.matrix.updated', { matrix: this.matrixData });
    }
  }
  
  /**
   * Update the RASCI matrix data
   * @param {Object} matrixData - New matrix data
   */
  updateMatrix(matrixData) {
    this.matrixData = { ...this.matrixData, ...matrixData };
    
    // Update global variable for backward compatibility
    window.rasciMatrixData = this.matrixData;
    
    this.eventBus.publish('rasci.matrix.updated', { matrix: this.matrixData });
    
    // Trigger UI update if function exists
    if (typeof window.forceReloadMatrix === 'function') {
      window.forceReloadMatrix();
    }
  }
  
  /**
   * Get the current RASCI matrix data
   * @returns {Object} - RASCI matrix data
   */
  getMatrixData() {
    return this.matrixData;
  }
  
  /**
   * Add a role to the RASCI matrix
   * @param {Object} role - Role object
   */
  addRole(role) {
    this.matrixData.roles.push(role);
    this.updateMatrix(this.matrixData);
  }
  
  /**
   * Update an assignment in the RASCI matrix
   * @param {string} taskId - Task ID
   * @param {string} roleId - Role ID
   * @param {string} assignment - Assignment type (R, A, S, C, I)
   */
  updateAssignment(taskId, roleId, assignment) {
    if (!this.matrixData.assignments[taskId]) {
      this.matrixData.assignments[taskId] = {};
    }
    
    this.matrixData.assignments[taskId][roleId] = assignment;
    this.updateMatrix(this.matrixData);
  }
}

/**
 * Initialize the RASCI module
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} - RASCI module instance
 */
export async function initialize(options = {}) {
  const rasciManager = new RASCIManager(options);
  await rasciManager.initialize();
  
  // Export existing functionality
  return {
    manager: rasciManager,
    
    // Core functionality
    initRasciPanel,
    renderMatrix,
    addNewRole,
    editRole,
    deleteRole,
    showDeleteConfirmModal,
    forceReloadMatrix,
    
    // Validation
    RasciMatrixValidator,
    rasciValidator,
    RasciMatrixUIValidator,
    rasciUIValidator,
    
    // Mapping
    initRasciMapping,
    executeSimpleRasciMapping,
    initializeAutoMapping,
    
    // Public API
    getMatrixData: rasciManager.getMatrixData,
    updateMatrix: rasciManager.updateMatrix,
    addRole: rasciManager.addRole,
    updateAssignment: rasciManager.updateAssignment
  };
}

// Legacy exports for backward compatibility
export {
  initRasciPanel,
  renderMatrix,
  addNewRole, 
  editRole, 
  deleteRole,
  showDeleteConfirmModal,
  forceReloadMatrix,
  RasciMatrixValidator,
  rasciValidator,
  RasciMatrixUIValidator,
  rasciUIValidator,
  initRasciMapping,
  executeSimpleRasciMapping,
  initializeAutoMapping
};

/**
 * Module exports
 */
export default {
  initialize
};
