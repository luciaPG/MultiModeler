/**
 * ModelerManager - Class for managing the BPMN modeler lifecycle
 * Responsible for creating, storing, and restoring the BPMN modeler state
 * when panel configurations change
 */

class ModelerManager {
  constructor() {
    this.modeler = null;
    this.container = null;
    this.currentXML = null;
    this.currentSelection = null;
    this.eventListeners = [];
  }

  /**
   * Initialize the modeler with the specified container
   * @param {string|HTMLElement} container - The container element or selector
   * @returns {MultiNotationModeler} - The created modeler instance
   */
  initialize(container) {
    // Clean up any existing modeler
    this.cleanup();
    
    // Store container reference
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    
    if (!this.container) {
      console.error('Container not found for modeler initialization');
      return null;
    }
    
    console.log('Initializing BPMN modeler');
    
    try {
      // Import the required modules directly to avoid circular dependencies
      const MultiNotationModeler = require('@multi-notation/index.js').default;
      const PPINOTModdle = require('@ppinot-moddle');
      const RALphModdle = require('@ralph-moddle');
      
      // Create new modeler instance
      this.modeler = new MultiNotationModeler({
        container: this.container,
        moddleExtensions: {
          PPINOT: PPINOTModdle,
          RALph: RALphModdle
        }
      });
      
      // Make the modeler available globally (for backward compatibility)
      window.bpmnModeler = this.modeler;
      window.modeler = this.modeler;
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Create empty diagram to ensure a valid state
      setTimeout(() => {
        if (this.modeler && typeof this.modeler.createDiagram === 'function') {
          this.modeler.createDiagram()
            .catch(err => console.error('Error creating initial diagram:', err));
        }
      }, 100);
      
      return this.modeler;
    } catch (error) {
      console.error('Error initializing BPMN modeler:', error);
      return null;
    }
  }
  
  /**
   * Get the current modeler instance
   * @returns {MultiNotationModeler} The current modeler instance
   */
  getModeler() {
    return this.modeler;
  }
  
  /**
   * Set up event listeners for the modeler
   */
  setupEventListeners() {
    if (!this.modeler) return;
    
    const eventBus = this.modeler.get('eventBus');
    if (!eventBus) return;
    
    // Add waypoint validation
    const connectionCreateHandler = (event) => {
      const wp = event && event.context && event.context.connection && event.context.connection.waypoints;
      if (wp) event.context.connection.waypoints = this.validateAndSanitizeWaypoints(wp);
    };
    
    eventBus.on(['connection.create', 'bendpoint.move.end'], connectionCreateHandler);
    
    // Track this event listener so we can clean it up later
    this.eventListeners.push({
      eventBus,
      events: ['connection.create', 'bendpoint.move.end'],
      handler: connectionCreateHandler
    });
  }
  
  /**
   * Validate and sanitize waypoints for connections
   * @param {Array} waypoints - The waypoints to validate
   * @returns {Array} - Sanitized waypoints
   */
  validateAndSanitizeWaypoints(waypoints) {
    if (!Array.isArray(waypoints)) return waypoints;
    
    return waypoints.map(wp => {
      if (wp && typeof wp === 'object') {
        // Ensure numeric values and no NaN or Infinity
        const x = parseFloat(wp.x) || 0;
        const y = parseFloat(wp.y) || 0;
        
        return {
          x: isFinite(x) ? x : 0,
          y: isFinite(y) ? y : 0,
          original: wp.original
        };
      }
      return wp;
    });
  }
  
  /**
   * Save the current state of the modeler
   * @returns {Promise<void>}
   */
  async saveState() {
    if (!this.modeler) return;
    
    try {
      // Check if we have a diagram loaded before trying to save
      const definitions = this.modeler._definitions;
      if (!definitions) {
        console.log('No BPMN definitions loaded yet - skipping state save');
        return;
      }
      
      // Save XML
      const result = await this.modeler.saveXML({ format: true });
      this.currentXML = result.xml;
      
      // Save selection
      const selection = this.modeler.get('selection', false);
      if (selection && selection.get) {
        this.currentSelection = selection.get();
      }
      
      console.log('BPMN modeler state saved');
    } catch (error) {
      console.error('Error saving BPMN modeler state:', error);
      
      // If we failed to save, don't try to restore later
      this.currentXML = null;
      this.currentSelection = null;
    }
  }
  
  /**
   * Restore the modeler state to a different container
   * @param {string|HTMLElement} newContainer - The new container element or selector
   * @returns {MultiNotationModeler} - The modeler instance
   */
  async restoreToNewContainer(newContainer) {
    const newContainerEl = typeof newContainer === 'string' ? document.querySelector(newContainer) : newContainer;
    
    if (!newContainerEl) {
      console.error('New container not found for modeler restoration');
      return null;
    }
    
    // Initialize a new modeler with the new container
    const modeler = this.initialize(newContainerEl);
    
    // Restore the saved XML if available
    if (this.currentXML && modeler) {
      try {
        await modeler.importXML(this.currentXML);
        
        // Restore selection if available
        if (this.currentSelection && this.currentSelection.length > 0) {
          const selection = modeler.get('selection', false);
          if (selection && selection.select) {
            selection.select(this.currentSelection);
          }
        }
        
        console.log('BPMN modeler state restored to new container');
      } catch (error) {
        console.error('Error restoring BPMN modeler state:', error);
        
        // If we failed to restore, create an empty diagram
        try {
          await modeler.createDiagram();
          console.log('Created empty diagram after restore failure');
        } catch (createErr) {
          console.error('Error creating empty diagram:', createErr);
        }
      }
    } else {
      // No saved state, create an empty diagram
      try {
        await modeler.createDiagram();
        console.log('Created new empty diagram (no previous state)');
      } catch (createErr) {
        console.error('Error creating empty diagram:', createErr);
      }
    }
    
    return modeler;
  }
  
  /**
   * Clean up the modeler instance and resources
   */
  cleanup() {
    if (!this.modeler) return;
    
    // Remove event listeners
    this.eventListeners.forEach(({ eventBus, events, handler }) => {
      if (eventBus && eventBus.off) {
        events.forEach(event => eventBus.off(event, handler));
      }
    });
    this.eventListeners = [];
    
    // Destroy modeler if it has a destroy method
    if (typeof this.modeler.destroy === 'function') {
      try {
        this.modeler.destroy();
      } catch (error) {
        console.error('Error destroying BPMN modeler:', error);
      }
    }
    
    this.modeler = null;
    console.log('BPMN modeler cleaned up');
  }
}

// Create and export a singleton instance
const modelerManager = new ModelerManager();
export default modelerManager;
