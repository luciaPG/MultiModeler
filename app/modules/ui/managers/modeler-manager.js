/**
 * ModelerManager - Class for managing the BPMN modeler lifecycle
 * Responsible for creating, storing, and restoring the BPMN modeler state
 * when panel configurations change
 */

import { getServiceRegistry } from '../core/ServiceRegistry.js';

class ModelerManager {
  constructor() {
    this.modeler = null;
    this.container = null;
    this.currentXML = null;
    this.currentSelection = null;
    this.eventListeners = [];
  }
  
  /**
   * Set the modeler instance
   * @param {Object} modeler - The modeler instance to set
   * @returns {Object} - The modeler instance
   */
  setModeler(modeler) {
    this.modeler = modeler;
    return this.modeler;
  }

  /**
   * Initialize the modeler with the specified container
   * @param {string|HTMLElement} container - The container element or selector
   * @param {boolean} forceNew - Whether to force creation of a new modeler instance
   * @returns {MultiNotationModeler} - The created modeler instance
   */
  initialize(container, forceNew = false) {
    // Store container reference
    this.container = typeof container === 'string' ? document.querySelector(container) : container;
    
    if (!this.container) {
      console.error('Container not found for modeler initialization');
      return null;
    }
    
    // If we already have a modeler and aren't forced to create a new one, 
    // just update the container
    if (this.modeler && !forceNew) {
      console.log('Reusing existing BPMN modeler with new container');
      
      try {
        // Get the canvas service
        const canvas = this.modeler.get('canvas');
        if (canvas) {
          // Update the container
          canvas._container = this.container;
          
          // Force resize to fit the new container
          canvas.resized();
        }
        
        return this.modeler;
      } catch (error) {
        console.error('Error reusing BPMN modeler:', error);
        // Fall through to create a new one
      }
    }
    
    // Clean up any existing modeler if we're creating a new one
    if (forceNew || !this.modeler) {
      this.cleanup();
    }
    
    console.log('Initializing new BPMN modeler');
    
    try {
      // Get modules from ServiceRegistry
      const registry = getServiceRegistry();
      const MultiNotationModeler = registry && registry.get ? registry.get('MultiNotationModeler') : null;
      const PPINOTModdle = registry && registry.get ? registry.get('PPINOTModdle') : null;
      const RALphModdle = registry && registry.get ? registry.get('RALphModdle') : null;
      
      if (!MultiNotationModeler || !PPINOTModdle || !RALphModdle) {
        console.error('Required modules not found in ServiceRegistry:',
          !MultiNotationModeler ? 'MultiNotationModeler missing' : '',
          !PPINOTModdle ? 'PPINOTModdle missing' : '',
          !RALphModdle ? 'RALphModdle missing' : ''
        );
        
        // Try alternative approach using direct imports if the modules are not in the global scope
        try {
          const MultiNotationModeler = require('@multi-notation/index.js').default;
          const PPINOTModdle = require('@ppinot-moddle');
          const RALphModdle = require('@ralph-moddle');
          
          console.log('Modules loaded via require as fallback');
          
          this.modeler = new MultiNotationModeler({
            container: this.container,
            moddleExtensions: {
              PPINOT: PPINOTModdle,
              RALph: RALphModdle
            }
          });
          
          console.log('Successfully created modeler using require fallback');
        } catch (requireError) {
          console.error('Error loading modules via require:', requireError);
          throw new Error('Could not load required modules via any method');
        }
      } else {
        // Create new modeler instance using registry modules
        this.modeler = new MultiNotationModeler({
          container: this.container,
          moddleExtensions: {
            PPINOT: PPINOTModdle,
            RALph: RALphModdle
          }
        });
        
        console.log('Successfully created MultiNotationModeler instance using global modules');
      }
      
      // Register the modeler in the service registry
      const sr = getServiceRegistry();
      if (sr) {
        sr.register('BpmnModeler', this.modeler);
        sr.register('bpmnModeler', this.modeler); // backward compatibility
      }
      
      // Debug exposure only in development
      if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-undef
        globalThis.__debug = { ...(globalThis.__debug || {}), bpmnModeler: this.modeler, modeler: this.modeler };
      }
      
      // Set up event listeners
      this.setupEventListeners();
      
      // Only create an empty diagram if this is the first initialization and we don't have saved state
      if (forceNew || (!this.currentXML && !this._diagramInitialized)) {
        console.log('Planning to create empty diagram (no XML or first initialization)');
      }
      
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
   * @returns {Promise<boolean>} - Whether the state was saved successfully
   */
  async saveState() {
    if (!this.modeler) {
      console.log('No hay instancia del modelador para guardar estado');
      return false;
    }
    
    try {
      // Verificar primero si hay definiciones cargadas
      const definitions = this.modeler._definitions;
      
      // Si no hay definiciones pero tenemos XML guardado anteriormente, mantenerlo
      if (!definitions && this.currentXML) {
        console.log('No hay definiciones BPMN, manteniendo estado guardado previamente');
        return true;
      }
      
      // Intentar guardar XML con diferentes opciones
      let savedXml = null;
      
      try {
        // Primer intento con format=true
        const result = await this.modeler.saveXML({ format: true });
        if (result && result.xml) {
          savedXml = result.xml;
        }
      } catch (formatError) {
        console.warn('Error al guardar XML con formato:', formatError);
      }
      
      // Si el primer intento falló, intentar sin formato
      if (!savedXml) {
        try {
          const fallbackResult = await this.modeler.saveXML({ format: false });
          if (fallbackResult && fallbackResult.xml) {
            savedXml = fallbackResult.xml;
          }
        } catch (noFormatError) {
          console.warn('Error al guardar XML sin formato:', noFormatError);
        }
      }
      
      // Si tenemos XML guardado, actualizar el estado
      if (savedXml) {
        // Verificar que el XML no esté vacío o sea inválido
        if (savedXml.includes('<bpmn:definitions') || savedXml.includes('<bpmn2:definitions')) {
          this.currentXML = savedXml;
          
          // Guardar la selección actual
          try {
            const selection = this.modeler.get('selection', false);
            if (selection && selection.get) {
              this.currentSelection = selection.get();
            }
          } catch (selError) {
            console.warn('No se pudo guardar la selección:', selError);
          }
          
          console.log('✅ Estado del modelador BPMN guardado correctamente');
          // Para debugging
          console.log('📊 Tamaño del XML guardado:', (savedXml.length / 1024).toFixed(2) + 'KB');
          return true;
        } else {
          console.warn('XML guardado parece inválido, manteniendo estado anterior');
        }
      }
      
      // Si llegamos aquí y tenemos XML guardado previamente, mantenerlo
      if (this.currentXML) {
        console.log('⚠️ No se pudo guardar nuevo estado, manteniendo estado previo');
        return true;
      }
      
      // No pudimos guardar y no hay estado previo
      console.warn('⛔ No se pudo guardar el estado del modelador BPMN');
      return false;
    } catch (error) {
      console.error('❌ Error al guardar estado del modelador BPMN:', error);
      
      // Solo limpiar XML si no tenemos estado guardado previamente
      if (!this.currentXML) {
        this.currentSelection = null;
        return false;
      } else {
        console.log('Manteniendo estado previo a pesar del error');
        return true;
      }
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
    
    console.log('Restaurando modelador BPMN a nuevo contenedor');
    
    // ALWAYS save state if we have an existing modeler
    if (this.modeler) {
      try {
        await this.saveState();
        console.log('Estado actual guardado antes de restaurar');
      } catch (error) {
        console.warn('No se pudo guardar el estado antes de cambiar de contenedor:', error);
      }
    }
    
    // ALWAYS create a new modeler instance for better reliability
    this.cleanup(); // Clean up the old modeler instance
    
    // Create a new modeler instance
    try {
      console.log('Creando nueva instancia del modelador BPMN');
      const modeler = this.initialize(newContainerEl, true);
      
      // If we have saved XML, import it
      if (this.currentXML && modeler) {
        try {
          console.log('Importando XML guardado a la nueva instancia del modelador');
          await modeler.importXML(this.currentXML);
          
          // Restore selection if available
          if (this.currentSelection && this.currentSelection.length > 0) {
            const selection = modeler.get('selection', false);
            if (selection && selection.select) {
              selection.select(this.currentSelection);
              console.log('Selección restaurada');
            }
          }
          
          console.log('✅ Estado del modelador BPMN restaurado correctamente');
        } catch (importError) {
          console.error('Error al importar XML guardado:', importError);
          
          // If we failed to restore, create an empty diagram
          try {
            await modeler.createDiagram();
            console.log('Diagrama vacío creado después de un error de restauración');
          } catch (createErr) {
            console.error('Error al crear diagrama vacío:', createErr);
          }
        }
      } else if (modeler) {
        // No saved state, so create an empty diagram
        try {
          await modeler.createDiagram();
          console.log('Nuevo diagrama vacío creado (sin estado previo)');
        } catch (createErr) {
          console.error('Error al crear diagrama vacío:', createErr);
        }
      }
      
      return modeler;
    } catch (error) {
      console.error('Error al inicializar nuevo modelador BPMN:', error);
      return null;
    }
  }
  
  /**
   * Clean up the modeler instance and resources
   */
  cleanup() {
    if (!this.modeler) {
      console.log('No hay instancia del modelador para limpiar');
      return;
    }
    
    console.log('Limpiando instancia del modelador BPMN...');
    
    // Remove event listeners
    try {
      this.eventListeners.forEach(({ eventBus, events, handler }) => {
        if (eventBus && eventBus.off) {
          events.forEach(event => {
            try {
              eventBus.off(event, handler);
            } catch (e) {
              console.warn(`Error al eliminar listener para ${event}:`, e);
            }
          });
        }
      });
      this.eventListeners = [];
    } catch (listenerError) {
      console.warn('Error al limpiar event listeners:', listenerError);
    }
    
    // Destroy modeler if it has a destroy method
    if (typeof this.modeler.destroy === 'function') {
      try {
        this.modeler.destroy();
        console.log('Modelador BPMN destruido correctamente');
      } catch (error) {
        console.error('Error al destruir modelador BPMN:', error);
        
        // Additional cleanup attempts if destroy fails
        try {
          // Try to clean up references that might prevent garbage collection
          const canvas = this.modeler.get('canvas', false);
          if (canvas) {
            // Clear container reference
            canvas._container = null;
          }
          
          // Unregister from service registry
          const registry = getServiceRegistry();
          if (registry) {
            registry.unregister('BpmnModeler');
            registry.unregister('bpmnModeler');
          }
        } catch (e) {
          console.warn('Error en limpieza adicional:', e);
        }
      }
    } else {
      console.warn('El modelador no tiene método destroy, realizando limpieza manual');
      
      // Manual cleanup if no destroy method is available
      try {
        // Unregister from service registry
        const sr = getServiceRegistry();
        if (sr) {
          sr.unregister('BpmnModeler');
          sr.unregister('bpmnModeler');
        }
        
        // Try to clean up DOM elements
        if (this.container) {
          // Clear content but keep the container
          while (this.container.firstChild) {
            this.container.removeChild(this.container.firstChild);
          }
        }
      } catch (manualError) {
        console.error('Error en limpieza manual:', manualError);
      }
    }
    
    this.modeler = null;
    console.log('✅ Modelador BPMN limpiado completamente');
  }
}

// Create and export a singleton instance
const modelerManager = new ModelerManager();
export default modelerManager;
