/**
 * NotationManager - Gestiona las diferentes notaciones disponibles
 */
import PPINOTModule from '../../PPINOT-modeler/PPINOT';
import RALPHModule from '../../RALPH-modeler/RALph';
import PPINOTDescriptor from '../../PPINOT-modeler/PPINOT/PPINOT.json';
import RALPHDescriptor from '../../RALPH-modeler/RALph/RALPH.json';

export class NotationManager {
  constructor() {
    this.notations = new Map();
    this.currentMode = 'hybrid';
    this.initializeNotations();
  }

  initializeNotations() {
    // Registrar PPINOT
    this.notations.set('ppinot', {
      name: 'PPINOT',
      description: 'Process Performance Indicators Notation',
      module: PPINOTModule,
      descriptor: PPINOTDescriptor,
      color: '#1976D2',
      enabled: true
    });

    // Registrar RALPH (preparado para futuro uso)
    this.notations.set('ralph', {
      name: 'RALPH',
      description: 'Risk-Aware Language for Process Hierarchy',
      module: RALPHModule,
      descriptor: RALPHDescriptor,
      color: '#2E7D32',
      enabled: false // Deshabilitado por conflictos de descriptores
    });

    // Modo híbrido
    this.notations.set('hybrid', {
      name: 'Hybrid',
      description: 'PPINOT + RALPH Combined',
      module: null, // Se construye dinámicamente
      descriptor: null,
      color: 'linear-gradient(45deg, #1976D2, #2E7D32)',
      enabled: true
    });
  }

  /**
   * Obtiene las notaciones disponibles
   */
  getAvailableNotations() {
    const available = [];
    for (const [key, notation] of this.notations) {
      if (notation.enabled) {
        available.push({
          key,
          ...notation
        });
      }
    }
    return available;
  }

  /**
   * Obtiene los módulos activos según el modo
   */
  getActiveModules(mode = this.currentMode) {
    const modules = [];
    
    switch (mode) {
      case 'ppinot':
        modules.push(PPINOTModule);
        break;
      case 'ralph':
        if (this.notations.get('ralph').enabled) {
          modules.push(RALPHModule);
        }
        break;
      case 'hybrid':
        modules.push(PPINOTModule);
        // TODO: Añadir RALPH cuando se resuelvan conflictos
        // if (this.notations.get('ralph').enabled) {
        //   modules.push(RALPHModule);
        // }
        break;
    }
    
    return modules;
  }

  /**
   * Obtiene los descriptores activos según el modo
   */
  getActiveDescriptors(mode = this.currentMode) {
    const descriptors = {};
    
    switch (mode) {
      case 'ppinot':
        descriptors.PPINOT = PPINOTDescriptor;
        break;
      case 'ralph':
        if (this.notations.get('ralph').enabled) {
          descriptors.RALPH = RALPHDescriptor;
        }
        break;
      case 'hybrid':
        descriptors.PPINOT = PPINOTDescriptor;
        // TODO: Añadir RALPH cuando se resuelvan conflictos
        // if (this.notations.get('ralph').enabled) {
        //   descriptors.RALPH = RALPHDescriptor;
        // }
        break;
    }
    
    return descriptors;
  }

  /**
   * Cambia el modo de notación
   */
  setMode(mode) {
    if (this.notations.has(mode) && this.notations.get(mode).enabled) {
      this.currentMode = mode;
      return true;
    }
    return false;
  }

  /**
   * Habilita/deshabilita una notación
   */
  toggleNotation(key, enabled) {
    if (this.notations.has(key)) {
      this.notations.get(key).enabled = enabled;
      return true;
    }
    return false;
  }

  getCurrentMode() {
    return this.currentMode;
  }
}

export default NotationManager;
