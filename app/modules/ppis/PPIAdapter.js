/**
 * PPI Adapter - Adaptador para comunicación entre PPIs y otros módulos del sistema
 */

import moduleBridge from '../ui/core/ModuleBridge.js';
import { getEventBus } from '../ui/core/event-bus.js';

class PPIAdapter {
  constructor() {
    this.eventBus = getEventBus();
    this.bridge = moduleBridge;
    this.initialized = false;
  }

  /**
   * Inicializar el adaptador PPI
   */
  async initialize() {
    if (this.initialized) return this;

    // Esperar a que el Module Bridge esté inicializado
    await this.bridge.initialize();
    
    // Configurar listeners específicos para PPIs
    this.setupPPIEventListeners();
    
    // Registrar servicios específicos de PPIs
    this.registerPPIServices();
    
    this.initialized = true;
    return this;
  }

  /**
   * Configurar listeners de eventos específicos para PPIs
   */
  setupPPIEventListeners() {
    // Escuchar cuando se registra un modelador BPMN
    this.eventBus.subscribe('modeler.available', (event) => {
      if (event.type === 'bpmn') {
        this.onBpmnModelerAvailable(event.modeler);
      }
    });

    // Escuchar cuando se registra el módulo RASCI
    this.eventBus.subscribe('module.available', (event) => {
      if (event.name === 'rasci') {
        this.onRasciModuleAvailable(event.instance);
      }
    });

    // Escuchar cambios en datos compartidos
    this.eventBus.subscribe('data.updated', (event) => {
      if (event.key === 'rasciMatrixData') {
        this.onRasciMatrixDataUpdated(event.data);
      }
    });
  }

  /**
   * Registrar servicios específicos de PPIs
   */
  registerPPIServices() {
    // Servicio para obtener el modelador BPMN
    if (this.bridge.serviceRegistry && typeof this.bridge.serviceRegistry.registerFunction === 'function') {
      this.bridge.serviceRegistry.registerFunction('getBpmnModeler', () => {
        return this.getBpmnModeler();
      }, {
        alias: 'getBpmnModeler',
        description: 'Obtiene el modelador BPMN para PPIs'
      });
    }

    // Servicio para obtener datos RASCI
    if (this.bridge.serviceRegistry) {
      this.bridge.serviceRegistry.registerFunction('getRasciData', () => {
        return {
          matrixData: this.getRasciMatrixData(),
          roles: this.getRasciRoles()
        };
      }, {
        alias: 'getRasciData',
        description: 'Obtiene datos RASCI para PPIs'
      });
    }

    // Servicio para comunicarse con RASCI
    if (this.bridge.serviceRegistry) {
      this.bridge.serviceRegistry.registerFunction('communicateWithRasci', (action, data) => {
        return this.communicateWithRasci(action, data);
      }, {
        alias: 'communicateWithRasci',
        description: 'Comunica con el módulo RASCI'
      });
    }
  }

  /**
   * Obtener el modelador BPMN
   * @returns {Object|null} - Instancia del modelador BPMN
   */
  getBpmnModeler() {
    return this.bridge && this.bridge.getModeler ? this.bridge.getModeler('bpmn') : null;
  }

  /**
   * Obtener datos de matriz RASCI
   * @returns {Object|null} - Datos de matriz RASCI
   */
  getRasciMatrixData() {
    return this.bridge.getSharedData('rasciMatrixData');
  }

  /**
   * Obtener roles RASCI
   * @returns {Array|null} - Roles RASCI
   */
  getRasciRoles() {
    return this.bridge.getSharedData('rasciRoles');
  }

  /**
   * Obtener el módulo RASCI
   * @returns {Object|null} - Instancia del módulo RASCI
   */
  getRasciModule() {
    return this.bridge.getModule('rasci');
  }

  /**
   * Comunicarse con el módulo RASCI
   * @param {string} action - Acción a ejecutar
   * @param {*} data - Datos adicionales
   * @returns {*} - Resultado de la comunicación
   */
  async communicateWithRasci(action, data = {}) {
    return await this.bridge.communicate('ppis', 'rasci', action, data);
  }

  /**
   * Callback cuando el modelador BPMN está disponible
   * @param {Object} modeler - Instancia del modelador BPMN
   */
  onBpmnModelerAvailable(modeler) {
    
    // Notificar a los componentes PPI que el modelador está disponible
    this.eventBus.publish('ppi.bpmn.available', {
      modeler: modeler
    });
  }

  /**
   * Callback cuando el módulo RASCI está disponible
   * @param {Object} rasciModule - Instancia del módulo RASCI
   */
  onRasciModuleAvailable(rasciModule) {
    
    // Notificar a los componentes PPI que RASCI está disponible
    this.eventBus.publish('ppi.rasci.available', {
      module: rasciModule
    });
  }

  /**
   * Callback cuando se actualizan los datos de matriz RASCI
   * @param {Object} matrixData - Nuevos datos de matriz
   */
  onRasciMatrixDataUpdated(matrixData) {
    
    // Notificar a los componentes PPI sobre la actualización
    this.eventBus.publish('ppi.rasci.matrix.updated', {
      matrixData: matrixData
    });
  }

  /**
   * Registrar el manager PPI en el bridge
   * @param {Object} ppiManager - Instancia del PPI Manager
   */
  registerPPIManager(ppiManager) {
    this.bridge.registerModule('ppis', ppiManager);
    
    // Establecer datos compartidos específicos de PPIs
    this.bridge.setSharedData('ppiManager', ppiManager);
    
  }

  /**
   * Obtener el PPI Manager
   * @returns {Object|null} - Instancia del PPI Manager
   */
  getPPIManager() {
    return (this.bridge && this.bridge.getModule ? this.bridge.getModule('ppis') : null) || 
           (this.bridge && this.bridge.getSharedData ? this.bridge.getSharedData('ppiManager') : null);
  }

  /**
   * Sincronizar datos con RASCI
   * @param {Object} ppiData - Datos PPI a sincronizar
   */
  async syncWithRasci(ppiData) {
    const rasciModule = this.getRasciModule();
    
    if (rasciModule && typeof rasciModule.syncPPIData === 'function') {
      return await rasciModule.syncPPIData(ppiData);
    }
    
    return null;
  }

  /**
   * Obtener tareas BPMN para PPIs
   * @returns {Array} - Lista de tareas BPMN
   */
  getBpmnTasks() {
    const modeler = this.getBpmnModeler();
    
    if (!modeler) {
      return [];
    }

    try {
      const elementRegistry = modeler.get('elementRegistry');
      const tasks = [];

      elementRegistry.forEach(element => {
        if (element.type && (
          element.type === 'bpmn:Task' ||
          element.type === 'bpmn:UserTask' ||
          element.type === 'bpmn:ServiceTask' ||
          element.type === 'bpmn:ScriptTask' ||
          element.type === 'bpmn:ManualTask' ||
          element.type === 'bpmn:BusinessRuleTask' ||
          element.type === 'bpmn:SendTask' ||
          element.type === 'bpmn:ReceiveTask' ||
          element.type === 'bpmn:CallActivity' ||
          element.type === 'bpmn:SubProcess'
        )) {
          const taskName = (element.businessObject && element.businessObject.name) || element.id;
          
          if (taskName && !tasks.includes(taskName)) {
            tasks.push(taskName);
          }
        }
      });
      
      return tasks;
    } catch (error) {
      console.error('Error obteniendo tareas BPMN:', error);
      return [];
    }
  }

  /**
   * Obtener estado del adaptador
   */
  getStatus() {
    return {
      initialized: this.initialized,
      bpmnModeler: !!this.getBpmnModeler(),
      rasciModule: !!this.getRasciModule(),
      ppiManager: !!this.getPPIManager(),
      rasciMatrixData: !!this.getRasciMatrixData(),
      rasciRoles: !!this.getRasciRoles()
    };
  }
}

// Instancia única del PPI Adapter
const ppiAdapter = new PPIAdapter();

// Exportar la instancia y la clase
export { PPIAdapter };
export default ppiAdapter;

