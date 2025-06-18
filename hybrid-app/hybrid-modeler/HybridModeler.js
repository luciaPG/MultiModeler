import inherits from 'inherits';
import BaseModeler from 'bpmn-js/lib/Modeler';

import HybridModule from './features';

/**
 * Modeler híbrido que combina notaciones PPINOT y RALPH
 */
export default function HybridModeler(options) {
  options = options || {};
  
  // Add our hybrid modules to the BPMN modeler
  options.additionalModules = [
    // Hybrid module
    HybridModule
  ].concat(options.additionalModules || []);
  
  BaseModeler.call(this, options);
  
  // Estado de las notaciones activas
  this._activeNotations = new Set(['ppinot', 'ralph']); // Por defecto ambas activas
  this._currentMode = 'hybrid'; // 'ppinot', 'ralph', 'hybrid'
}

inherits(HybridModeler, BaseModeler);

/**
 * Establece qué notaciones están activas
 * @param {string[]} notations - Array de notaciones ('ppinot', 'ralph')
 */
HybridModeler.prototype.setActiveNotations = function(notations) {
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
  this._eventBus.fire('notations.changed', {
    active: Array.from(this._activeNotations),
    mode: this._currentMode
  });
  
  return this;
};

/**
 * Obtiene las notaciones actualmente activas
 * @returns {string[]} Array de notaciones activas
 */
HybridModeler.prototype.getActiveNotations = function() {
  return Array.from(this._activeNotations);
};

/**
 * Obtiene el modo actual del modelador
 * @returns {string} Modo actual ('ppinot', 'ralph', 'hybrid', 'none')
 */
HybridModeler.prototype.getCurrentMode = function() {
  return this._currentMode;
};

/**
 * Verifica si una notación específica está activa
 * @param {string} notation - Notación a verificar
 * @returns {boolean} true si está activa
 */
HybridModeler.prototype.isNotationActive = function(notation) {
  return this._activeNotations.has(notation);
};

/**
 * Alterna el estado de una notación específica
 * @param {string} notation - Notación a alternar
 * @returns {boolean} Nuevo estado de la notación
 */
HybridModeler.prototype.toggleNotation = function(notation) {
  if (this._activeNotations.has(notation)) {
    this._activeNotations.delete(notation);
  } else {
    this._activeNotations.add(notation);
  }
  
  // Actualizar el modo y notificar
  this.setActiveNotations(Array.from(this._activeNotations));
  
  return this._activeNotations.has(notation);
};

/**
 * Crea un nuevo diagrama híbrido vacío
 * @returns {Promise} Promesa que se resuelve cuando el diagrama está listo
 */
HybridModeler.prototype.createNewDiagram = function() {
  const hybridXML = this._createEmptyHybridDiagram();
  return this.importXML(hybridXML);
};

/**
 * Crea el XML base para un diagrama híbrido vacío
 * @private
 */
HybridModeler.prototype._createEmptyHybridDiagram = function() {
  return `<?xml version="1.0" encoding="UTF-8"?>
<hybrid:definitions xmlns:hybrid="http://hybrid.modeler.org/schema"
                    xmlns:ppinot="http://ppinot.org/schema"
                    xmlns:ralph="http://ralph.org/schema"
                    id="HybridDiagram_1">
  <hybrid:diagram id="HybridDiagram_1_Diagram">
    <hybrid:plane id="HybridDiagram_1_Plane" />
  </hybrid:diagram>
</hybrid:definitions>`;
};

/**
 * Exporta el diagrama híbrido como XML
 * @returns {Promise<string>} XML del diagrama
 */
HybridModeler.prototype.saveXML = function() {
  return new Promise((resolve, reject) => {
    try {
      // Por ahora, exportamos una estructura básica
      // TODO: Implementar serialización completa
      const xml = this._serializeCurrentDiagram();
      resolve({ xml });
    } catch (error) {
      reject(error);
    }
  });
};

/**
 * Serializa el diagrama actual a XML
 * @private
 */
HybridModeler.prototype._serializeCurrentDiagram = function() {
  const elementRegistry = this.get('elementRegistry');
  
  let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
  xml += '<hybrid:definitions xmlns:hybrid="http://hybrid.modeler.org/schema"\n';
  xml += '                    xmlns:ppinot="http://ppinot.org/schema"\n';
  xml += '                    xmlns:ralph="http://ralph.org/schema">\n';
  xml += '  <hybrid:diagram>\n';
  xml += '    <hybrid:plane>\n';
  
  // Serializar elementos
  const elements = elementRegistry.getAll();
  elements.forEach(element => {
    if (element.parent) { // Skip root element
      xml += this._serializeElement(element);
    }
  });
  
  xml += '    </hybrid:plane>\n';
  xml += '  </hybrid:diagram>\n';
  xml += '</hybrid:definitions>';
  
  return xml;
};

/**
 * Serializa un elemento individual
 * @private
 */
HybridModeler.prototype._serializeElement = function(element) {
  const type = element.type;
  const id = element.id;
  const x = element.x || 0;
  const y = element.y || 0;
  const width = element.width || 100;
  const height = element.height || 80;
  
  let xml = '';
  
  if (type.startsWith('ppinot:')) {
    xml += `      <ppinot:${type.replace('ppinot:', '')} id="${id}" x="${x}" y="${y}" width="${width}" height="${height}"`;
    if (element.businessObject && element.businessObject.name) {
      xml += ` name="${element.businessObject.name}"`;
    }
    xml += ' />\n';
  } else if (type.startsWith('ralph:')) {
    xml += `      <ralph:${type.replace('ralph:', '')} id="${id}" x="${x}" y="${y}" width="${width}" height="${height}"`;
    if (element.businessObject && element.businessObject.name) {
      xml += ` name="${element.businessObject.name}"`;
    }
    xml += ' />\n';
  }
  
  return xml;
};

/**
 * Obtiene estadísticas del diagrama actual
 * @returns {Object} Estadísticas del diagrama
 */
HybridModeler.prototype.getDiagramStats = function() {
  const elementRegistry = this.get('elementRegistry');
  const elements = elementRegistry.getAll();
  
  const stats = {
    total: 0,
    ppinot: 0,
    ralph: 0,
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
};

/**
 * Limpia el diagrama actual
 */
HybridModeler.prototype.clear = function() {
  return this.createNewDiagram();
};
