/**
 * Utilidades para manejo seguro del canvas BPMN
 * Evita errores de matriz no invertible en operaciones de zoom
 */

class CanvasUtils {
  /**
   * Zoom seguro al elemento evitando errores de matriz no invertible
   * @param {Object} canvas - Canvas del modeler
   * @param {Object|string} target - Elemento o comando de zoom
   * @param {Object} element - Elemento opcional para zoom específico
   * @returns {boolean} - true si el zoom fue exitoso
   */
  static safeZoom(canvas, target, element = null) {
    try {
      if (!canvas || typeof canvas.zoom !== 'function') {
        return false;
      }

      // Si es un comando de zoom (string)
      if (typeof target === 'string') {
        return this.safeZoomCommand(canvas, target, element);
      }

      // Si es un elemento
      if (target && typeof target === 'object') {
        return this.safeZoomToElement(canvas, target);
      }

      return false;
    } catch (error) {
      console.warn('Error en zoom seguro:', error.message);
      return false;
    }
  }

  /**
   * Zoom seguro con comando
   * @param {Object} canvas - Canvas del modeler
   * @param {string} command - Comando de zoom ('fit-viewport', etc.)
   * @param {Object} element - Elemento opcional
   * @returns {boolean}
   */
  static safeZoomCommand(canvas, command, element = null) {
    try {
      // Comandos seguros que no causan errores de matriz
      const safeCommands = ['fit-viewport', 'fit-to-view'];
      
      if (safeCommands.includes(command)) {
        if (element) {
          canvas.zoom(command, element);
        } else {
          canvas.zoom(command);
        }
        return true;
      }

      // Para otros comandos, validar primero
      return this.safeZoomWithValidation(canvas, command, element);
    } catch (error) {
      console.warn(`Error en zoom command '${command}':`, error.message);
      return false;
    }
  }

  /**
   * Zoom seguro a un elemento específico
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} element - Elemento al que hacer zoom
   * @returns {boolean}
   */
  static safeZoomToElement(canvas, element) {
    try {
      if (!element || !element.x !== undefined || !element.y !== undefined) {
        return false;
      }

      // Intentar fit-viewport primero (más seguro)
      try {
        canvas.zoom('fit-viewport', element);
        return true;
      } catch (fitError) {
        // Fallback: zoom manual con límites
        return this.safeZoomWithLimits(canvas, element);
      }
    } catch (error) {
      console.warn('Error en zoom a elemento:', error.message);
      return false;
    }
  }

  /**
   * Zoom con validación de valores
   * @param {Object} canvas - Canvas del modeler
   * @param {number|string} zoomValue - Valor de zoom
   * @param {Object} element - Elemento opcional
   * @returns {boolean}
   */
  static safeZoomWithValidation(canvas, zoomValue, element = null) {
    try {
      // Obtener zoom actual de forma segura
      let currentZoom = 1;
      try {
        currentZoom = canvas.zoom();
        if (typeof currentZoom !== 'number' || !isFinite(currentZoom) || currentZoom <= 0) {
          currentZoom = 1;
        }
      } catch (e) {
        currentZoom = 1;
      }

      // Validar valor de zoom
      let safeZoom = zoomValue;
      if (typeof zoomValue === 'number') {
        // Límites seguros para zoom
        safeZoom = Math.max(0.1, Math.min(10, zoomValue));
      }

      // Aplicar zoom
      if (element) {
        canvas.zoom(safeZoom, element);
      } else {
        canvas.zoom(safeZoom);
      }
      return true;
    } catch (error) {
      console.warn('Error en zoom con validación:', error.message);
      return false;
    }
  }

  /**
   * Zoom con límites seguros
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} element - Elemento
   * @returns {boolean}
   */
  static safeZoomWithLimits(canvas, element) {
    try {
      // Obtener zoom actual
      let currentZoom = 1;
      try {
        currentZoom = canvas.zoom();
        if (typeof currentZoom !== 'number' || !isFinite(currentZoom) || currentZoom <= 0) {
          currentZoom = 1;
        }
      } catch (e) {
        currentZoom = 1;
      }

      // Zoom seguro (entre 0.1 y 5)
      const safeZoom = Math.max(0.1, Math.min(5, currentZoom));
      canvas.zoom(safeZoom, element);
      return true;
    } catch (error) {
      console.warn('Error en zoom con límites:', error.message);
      return false;
    }
  }

  /**
   * Obtener zoom actual de forma segura
   * @param {Object} canvas - Canvas del modeler
   * @returns {number} - Zoom actual o 1 si hay error
   */
  static getSafeZoom(canvas) {
    try {
      if (!canvas || typeof canvas.zoom !== 'function') {
        return 1;
      }

      const zoom = canvas.zoom();
      if (typeof zoom === 'number' && isFinite(zoom) && zoom > 0) {
        return zoom;
      }
      return 1;
    } catch (error) {
      console.warn('Error obteniendo zoom:', error.message);
      return 1;
    }
  }

  /**
   * Scroll seguro a elemento
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} element - Elemento
   * @returns {boolean}
   */
  static safeScrollToElement(canvas, element) {
    try {
      if (!canvas || !element || typeof canvas.scrollToElement !== 'function') {
        return false;
      }

      canvas.scrollToElement(element);
      return true;
    } catch (error) {
      console.warn('Error en scroll a elemento:', error.message);
      return false;
    }
  }
}

// Exportar para uso global
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CanvasUtils;
} else if (typeof window !== 'undefined') {
  window.CanvasUtils = CanvasUtils;
}
