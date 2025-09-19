// RASCI Panel Module
// This module integrates existing RASCI functionality with the new modular architecture

import { getServiceRegistry } from '../ui/core/ServiceRegistry.js';

// Core functionality
import { initRasciPanel } from './core/main.js';
import { renderMatrix, addNewRole, editRole, deleteRole, showDeleteConfirmModal, forceReloadMatrix } from './core/matrix-manager.js';

// Validation system
import { RasciMatrixValidator, rasciValidator } from './validation/matrix-validator.js';
import { RasciMatrixUIValidator, rasciUIValidator } from './ui/matrix-ui-validator.js';

// Mapping functionality
import { initRasciMapping, executeSimpleRasciMapping } from './mapping/index.js';

// Auto-mapping functionality
import { rasciAutoMapping } from './mapping/auto-mapper.js';

// Change queue management
import { changeQueueManager, addChangeToQueue, processPendingChanges, getQueueInfo, clearPendingChanges, debugQueueStatus } from './core/change-queue-manager.js';

// Debug helper
import './debug-helper.js';

/**
 * RASCI Matrix Manager
 * Manages the RASCI matrix data and UI
 */
class RASCIManager {
  constructor(options = {}) {
    this.eventBus = options.eventBus;
    this.adapter = options.adapter;
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
    // Obtener datos del adaptador o ServiceRegistry
    if (this.adapter) {
      const matrixData = this.adapter.getMatrixData();
      if (matrixData) {
        this.matrixData = matrixData;
      }
    } else {
      // CONSERVAR estructura inicial cuando no hay adaptador
      const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
      const rasciAdapter = this.adapter || (sr && sr.get('RASCIAdapter'));
      
      if (rasciAdapter && typeof rasciAdapter.getMatrixData === 'function') {
        this.matrixData = rasciAdapter.getMatrixData();
      }
      // NO borrar this.matrixData si no hay adaptador - mantener estructura inicial
    }
    
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('[RASCI] Manager initialized');
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
    
    // Update data through adapter if available
    if (this.adapter) {
      this.adapter.updateMatrixData(this.matrixData);
    }
    
  // Update matrix data via adapter or ServiceRegistry
    const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    const rasciAdapter = this.adapter || (sr && sr.get('RASCIAdapter'));
    if (rasciAdapter && typeof rasciAdapter.setMatrixData === 'function') {
      rasciAdapter.setMatrixData(this.matrixData);
    }
    
    this.eventBus.publish('rasci.matrix.updated', { matrix: this.matrixData });
    
  // Trigger UI update through adapter or ServiceRegistry
    const sr2 = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    const rasciAdapter2 = this.adapter || (sr2 && sr2.get('RASCIAdapter'));
    if (rasciAdapter2 && typeof rasciAdapter2.forceReloadMatrix === 'function') {
      rasciAdapter2.forceReloadMatrix();
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
  
  // Registrar funciones de debug globalmente
  if (typeof globalThis !== 'undefined') {
    globalThis.debugQueueStatus = debugQueueStatus;
    globalThis.processPendingChanges = processPendingChanges;
    globalThis.getQueueInfo = getQueueInfo;
    globalThis.addChangeToQueue = addChangeToQueue;
    globalThis.clearPendingChanges = clearPendingChanges;
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('✅ Funciones de debug RASCI registradas globalmente');
  }
  
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
    rasciAutoMapping,
    
    // Change queue management
    changeQueueManager,
    addChangeToQueue,
    processPendingChanges,
    getQueueInfo,
    clearPendingChanges,
    
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
  rasciAutoMapping,
  changeQueueManager,
  addChangeToQueue,
  processPendingChanges,
  getQueueInfo,
  clearPendingChanges
};

/**
 * Module exports
 */
export default {
  initialize
};
