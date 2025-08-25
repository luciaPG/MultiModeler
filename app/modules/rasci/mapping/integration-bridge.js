// RASCI Mapping Integration Bridge
// Provee un puente entre el sistema modular y las funciones necesarias para la UI

import { rasciManager, setOnRasciMatrixUpdatedCallback } from '../core/matrix-manager.js';
import { executeSimpleRasciMapping } from './main-mapper.js';
import { rasciAutoMapping, onRasciMatrixUpdated, executeAutoMappingWithCleanup } from './auto-mapper.js';

/**
 * Clase para gestionar la integración del sistema de mapping
 * Reemplaza las referencias globales de window con un sistema modular
 */
class RasciMappingBridge {
  constructor() {
    this.initialized = false;
  }

  /**
   * Inicializar el bridge y conectar con el DOM
   */
  initialize() {
    if (this.initialized) return;
    
    try {
      // Conectar botones de mapping si existen
      this.connectMappingButtons();
      
      // Configurar auto-mapping
      this.setupAutoMapping();
      
      // Integrar con matrix-manager
      this.integrateWithMatrixManager();
      
      this.initialized = true;
      console.log('✅ RASCI Mapping Bridge initialized');
    } catch (error) {
      console.error('❌ Error initializing RASCI Mapping Bridge:', error);
    }
  }

  /**
   * Conectar botones de mapping con las funciones del módulo
   */
  connectMappingButtons() {
    // Buscar botones que tengan referencias a mapping
    const mappingButtons = document.querySelectorAll('[onclick*="executeRasciToRalphMapping"], [onclick*="executeSimpleRasciMapping"]');
    
    mappingButtons.forEach(button => {
      // Remover onclick handlers antiguos
      button.removeAttribute('onclick');
      
      // Agregar event listener modular
      button.addEventListener('click', (e) => {
        e.preventDefault();
        this.executeMapping();
      });
    });
  }

  /**
   * Configurar auto-mapping
   */
  setupAutoMapping() {
    // Activar auto-mapping por defecto
    if (rasciAutoMapping && !rasciAutoMapping.enabled) {
      rasciAutoMapping.enable();
    }
  }

  /**
   * Integrar con matrix-manager para recibir notificaciones
   */
  integrateWithMatrixManager() {
    // Registrar la función de auto-mapping con el manager
    // para evitar referencias a window
    setOnRasciMatrixUpdatedCallback(() => {
      if (onRasciMatrixUpdated && typeof onRasciMatrixUpdated === 'function') {
        try {
          onRasciMatrixUpdated();
        } catch (error) {
          console.warn('⚠️ Error in modular onRasciMatrixUpdated:', error);
        }
      }
    });
  }

  /**
   * Ejecutar mapping simple
   */
  executeMapping() {
    try {
      const modeler = rasciManager.getBpmnModeler();
      const matrix = rasciManager.rasciMatrixData;
      
      if (!modeler) {
        console.warn('❌ BPMN Modeler not available');
        return;
      }
      
      if (!matrix || Object.keys(matrix).length === 0) {
        console.warn('❌ RASCI matrix data not available');
        return;
      }
      
      executeSimpleRasciMapping(modeler, matrix);
      console.log('✅ RASCI mapping executed successfully');
    } catch (error) {
      console.error('❌ Error executing RASCI mapping:', error);
    }
  }

  /**
   * Ejecutar auto-mapping con cleanup
   */
  executeAutoMapping() {
    try {
      const modeler = rasciManager.getBpmnModeler();
      const matrix = rasciManager.rasciMatrixData;
      
      if (executeAutoMappingWithCleanup && typeof executeAutoMappingWithCleanup === 'function') {
        executeAutoMappingWithCleanup(modeler, matrix);
      } else {
        this.executeMapping();
      }
    } catch (error) {
      console.error('❌ Error executing auto mapping:', error);
    }
  }

  /**
   * Obtener el estado del auto-mapping
   */
  getAutoMappingState() {
    return {
      enabled: rasciAutoMapping ? rasciAutoMapping.enabled : false,
      available: !!rasciAutoMapping
    };
  }

  /**
   * Activar/desactivar auto-mapping
   */
  toggleAutoMapping() {
    if (rasciAutoMapping) {
      return rasciAutoMapping.toggle();
    }
    return false;
  }
}

// Crear instancia única del bridge
const mappingBridge = new RasciMappingBridge();

// Inicializar cuando el DOM esté listo
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      mappingBridge.initialize();
    });
  } else {
    mappingBridge.initialize();
  }
}

// Exportar la instancia y funciones principales
export {
  mappingBridge,
  RasciMappingBridge
};
