import BaseModeler from '../app/baseModeler';
import { assign, isArray, isObject } from 'min-dash';
import { isPPINOTConnection } from '../app/PPINOT-modeler/PPINOT/Types';
import PPINOTModule from '../app/PPINOT-modeler/PPINOT';
import { isLabelExternal, getExternalLabelBounds, getLabel } from '../app/PPINOT-modeler/PPINOT/utils/LabelUtil';

// Import RALPH modules (we'll create these)
import RalphModule from './ralph';

class HybridModeler extends BaseModeler {
  constructor(options) {
    // Configure both PPINOT and RALPH modules
    const hybridOptions = assign({}, options, {
      additionalModules: [
        PPINOTModule,
        RalphModule
      ].concat(options.additionalModules || [])
    });
    
    super(hybridOptions);
    
    // Track active notations
    this._activeNotations = new Set(['ppinot', 'ralph']);
    this._currentMode = 'hybrid';
  }

  _addPPINOTShape(PPINOTElement) {
    this._customElements.push(PPINOTElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const PPINOTAttrs = assign({ businessObject: PPINOTElement }, PPINOTElement);
    const PPINOTShape = elementFactory.create('shape', PPINOTAttrs);

    if (isLabelExternal(PPINOTElement) && getLabel(PPINOTShape)) {
      this.addLabel(PPINOTElement, PPINOTShape);
    }

    return canvas.addShape(PPINOTShape);
  }

  _addRalphShape(ralphElement) {
    this._customElements.push(ralphElement);
    const canvas = this.get('canvas');
    const elementFactory = this.get('elementFactory');
    const ralphAttrs = assign({ businessObject: ralphElement }, ralphElement);
    const ralphShape = elementFactory.create('shape', ralphAttrs);

    // Ralph elements might also have labels
    if (isLabelExternal(ralphElement) && getLabel(ralphShape)) {
      this.addLabel(ralphElement, ralphShape);
    }

    return canvas.addShape(ralphShape);
  }

  setColors(idAndColorList) {
    const modeling = this.get('modeling');
    const elementRegistry = this.get('elementRegistry');

    idAndColorList.forEach(idAndColor => {
      const element = elementRegistry.get(idAndColor.id);
      if (element) {
        modeling.setColor([element], idAndColor.color);
      }
    });
  }

  /**
   * Establece qué notaciones están activas
   * @param {string[]} notations - Array de notaciones ('ppinot', 'ralph')
   */
  setActiveNotations(notations) {
    this._activeNotations = new Set(notations);

    // Determinar el modo actual
    if (this._activeNotations.has('ppinot') && this._activeNotations.has('ralph')) {
      this._currentMode = 'hybrid';
    } else if (this._activeNotations.has('ppinot')) {
      this._currentMode = 'ppinot';
    } else if (this._activeNotations.has('ralph')) {
      this._currentMode = 'ralph';
    } else {
      this._currentMode = 'none';
    }

    // Notificar a los providers del cambio
    this.get('eventBus').fire('notations.changed', {
      active: Array.from(this._activeNotations),
      mode: this._currentMode
    });

    return this;
  }

  /**
   * Obtiene las notaciones actualmente activas
   * @returns {string[]} Array de notaciones activas
   */
  getActiveNotations() {
    return Array.from(this._activeNotations);
  }

  /**
   * Obtiene el modo actual del modelador
   * @returns {string} Modo actual ('ppinot', 'ralph', 'hybrid', 'none')
   */
  getCurrentMode() {
    return this._currentMode;
  }

  /**
   * Verifica si una notación específica está activa
   * @param {string} notation - Notación a verificar
   * @returns {boolean} true si está activa
   */
  isNotationActive(notation) {
    return this._activeNotations.has(notation);
  }

  /**
   * Alterna el estado de una notación específica
   * @param {string} notation - Notación a alternar
   * @returns {boolean} Nuevo estado de la notación
   */
  toggleNotation(notation) {
    if (this._activeNotations.has(notation)) {
      this._activeNotations.delete(notation);
    } else {
      this._activeNotations.add(notation);
    }

    // Actualizar el modo y notificar
    this.setActiveNotations(Array.from(this._activeNotations));
    return this._activeNotations.has(notation);
  }

  /**
   * Obtiene estadísticas del diagrama actual
   * @returns {Object} Estadísticas del diagrama
   */
  getDiagramStats() {
    const elementRegistry = this.get('elementRegistry');
    const elements = elementRegistry.getAll();
    
    const stats = {
      total: 0,
      ppinot: 0,
      ralph: 0,
      bpmn: 0,
      connections: 0,
      byType: {}
    };

    elements.forEach(element => {
      if (element.parent) { // Skip root
        stats.total++;
        
        if (element.type.startsWith('ppinot:')) {
          stats.ppinot++;
        } else if (element.type.startsWith('ralph:')) {
          stats.ralph++;
        } else if (element.type.startsWith('bpmn:')) {
          stats.bpmn++;
        }
        
        if (element.waypoints) { // Es una conexión
          stats.connections++;
        }

        // Contar por tipo específico
        const type = element.type;
        stats.byType[type] = (stats.byType[type] || 0) + 1;
      }
    });

    return stats;
  }

  addLabel(element, shape) {
    const elementFactory = this.get('elementFactory');
    const canvas = this.get('canvas');

    const labelBounds = getExternalLabelBounds(shape, getLabel(shape));
    const labelAttrs = assign({
      businessObject: element,
      type: 'label'
    }, labelBounds);
    const label = elementFactory.create('label', labelAttrs);

    return canvas.addShape(label, shape.parent);
  }
}

export default HybridModeler;
