/**
 * RASCI Adapter - Adaptador para comunicación RASCI

 */

import moduleBridge from '../ui/core/ModuleBridge.js';
import { getEventBus } from '../ui/core/event-bus.js';

class RASCIAdapter {
  constructor() {
    this.eventBus = getEventBus();
    this.bridge = moduleBridge;
    this.initialized = false;
  }

  /**
   * Inicializar el adaptador RASCI
   */
  async initialize() {
    if (this.initialized) return this;

    // Esperar a que el Module Bridge esté inicializado
    await this.bridge.initialize();
    
    // Configurar listeners específicos para RASCI
    this.setupRASCIEventListeners();
    
    // Registrar servicios específicos de RASCI
    this.registerRASCIServices();
    
    this.initialized = true;
    console.log('✅ RASCI Adapter inicializado');
    return this;
  }

  /**
   * Configurar listeners de eventos específicos para RASCI
   */
  setupRASCIEventListeners() {
    // Escuchar cuando se registra un modelador BPMN
    this.eventBus.subscribe('modeler.available', (event) => {
      if (event.type === 'bpmn') {
        this.onBpmnModelerAvailable(event.modeler);
      }
    });

    // Escuchar cuando se registra el módulo PPIs
    this.eventBus.subscribe('module.available', (event) => {
      if (event.name === 'ppis') {
        this.onPPIsModuleAvailable(event.instance);
      }
    });

    // Escuchar cambios en datos compartidos
    this.eventBus.subscribe('data.updated', (event) => {
      if (event.key === 'ppiData') {
        this.onPPIDataUpdated(event.data);
      }
    });
  }

  /**
   * Registrar servicios específicos de RASCI
   */
  registerRASCIServices() {
    // Servicio para obtener el modelador BPMN
    this.bridge.serviceRegistry?.registerFunction('getBpmnModelerForRasci', () => {
      return this.getBpmnModeler();
    }, {
      alias: 'getBpmnModelerForRasci',
      description: 'Obtiene el modelador BPMN para RASCI'
    });

    // Servicio para obtener datos PPIs
    this.bridge.serviceRegistry?.registerFunction('getPPIData', () => {
      return this.getPPIData();
    }, {
      alias: 'getPPIData',
      description: 'Obtiene datos PPIs para RASCI'
    });

    // Servicio para comunicarse con PPIs
    this.bridge.serviceRegistry?.registerFunction('communicateWithPPIs', (action, data) => {
      return this.communicateWithPPIs(action, data);
    }, {
      alias: 'communicateWithPPIs',
      description: 'Comunica con el módulo PPIs'
    });

    // Servicio para actualizar matriz RASCI
    this.bridge.serviceRegistry?.registerFunction('updateRasciMatrix', (matrixData) => {
      return this.updateMatrixData(matrixData);
    }, {
      alias: 'updateRasciMatrix',
      description: 'Actualiza los datos de matriz RASCI'
    });

    // Servicio para obtener roles RASCI
    this.bridge.serviceRegistry?.registerFunction('getRasciRoles', () => {
      return this.getRoles();
    }, {
      alias: 'getRasciRoles',
      description: 'Obtiene los roles RASCI'
    });
  }

  /**
   * Obtener el modelador BPMN
   * @returns {Object|null} - Instancia del modelador BPMN
   */
  getBpmnModeler() {
    return this.bridge.getModeler('bpmn');
  }

  /**
   * Obtener datos de matriz RASCI
   * @returns {Object|null} - Datos de matriz RASCI
   */
  getMatrixData() {
    return this.bridge.getSharedData('rasciMatrixData');
  }

  /**
   * Obtener roles RASCI
   * @returns {Array|null} - Roles RASCI
   */
  getRoles() {
    return this.bridge.getSharedData('rasciRoles');
  }

  /**
   * Obtener datos PPIs
   * @returns {Object|null} - Datos PPIs
   */
  getPPIData() {
    return this.bridge.getSharedData('ppiData');
  }

  /**
   * Obtener el módulo PPIs
   * @returns {Object|null} - Instancia del módulo PPIs
   */
  getPPIsModule() {
    return this.bridge.getModule('ppis');
  }

  /**
   * Comunicarse con el módulo PPIs
   * @param {string} action - Acción a ejecutar
   * @param {*} data - Datos adicionales
   * @returns {*} - Resultado de la comunicación
   */
  async communicateWithPPIs(action, data = {}) {
    return await this.bridge.communicate('rasci', 'ppis', action, data);
  }

  /**
   * Callback cuando el modelador BPMN está disponible
   * @param {Object} modeler - Instancia del modelador BPMN
   */
  onBpmnModelerAvailable(modeler) {
    console.log('🎯 RASCI Adapter: Modelador BPMN disponible');
    
    // Notificar a los componentes RASCI que el modelador está disponible
    this.eventBus.publish('rasci.bpmn.available', {
      modeler: modeler
    });
  }

  /**
   * Callback cuando el módulo PPIs está disponible
   * @param {Object} ppisModule - Instancia del módulo PPIs
   */
  onPPIsModuleAvailable(ppisModule) {
    console.log('🎯 RASCI Adapter: Módulo PPIs disponible');
    
    // Notificar a los componentes RASCI que PPIs está disponible
    this.eventBus.publish('rasci.ppis.available', {
      module: ppisModule
    });
  }

  /**
   * Callback cuando se actualizan los datos PPIs
   * @param {Object} ppiData - Nuevos datos PPIs
   */
  onPPIDataUpdated(ppiData) {
    console.log('🎯 RASCI Adapter: Datos PPIs actualizados');
    
    // Notificar a los componentes RASCI sobre la actualización
    this.eventBus.publish('rasci.ppis.data.updated', {
      ppiData: ppiData
    });
  }

  /**
   * Registrar el manager RASCI en el bridge
   * @param {Object} rasciManager - Instancia del RASCI Manager
   */
  registerRASCIManager(rasciManager) {
    this.bridge.registerModule('rasci', rasciManager);
    
    // Establecer datos compartidos específicos de RASCI
    this.bridge.setSharedData('rasciManager', rasciManager);
    

  }

  /**
   * Obtener el RASCI Manager
   * @returns {Object|null} - Instancia del RASCI Manager
   */
  getRASCIManager() {
    return this.bridge.getModule('rasci') || this.bridge.getSharedData('rasciManager');
  }

  /**
   * Actualizar datos de matriz RASCI
   * @param {Object} matrixData - Nuevos datos de matriz
   */
  updateMatrixData(matrixData) {
    this.bridge.setSharedData('rasciMatrixData', matrixData);
    
    // Notificar a otros módulos sobre la actualización
    this.eventBus.publish('rasci.matrix.updated', {
      matrixData: matrixData
    });
    
    console.log('📊 Datos de matriz RASCI actualizados');
  }

  /**
   * Actualizar roles RASCI
   * @param {Array} roles - Nuevos roles
   */
  updateRoles(roles) {
    this.bridge.setSharedData('rasciRoles', roles);
    
    // Notificar a otros módulos sobre la actualización
    this.eventBus.publish('rasci.roles.updated', {
      roles: roles
    });
    
    console.log('👥 Roles RASCI actualizados');
  }

  /**
   * Sincronizar datos con PPIs
   * @param {Object} rasciData - Datos RASCI a sincronizar
   */
  async syncWithPPIs(rasciData) {
    const ppisModule = this.getPPIsModule();
    
    if (ppisModule && typeof ppisModule.syncRasciData === 'function') {
      return await ppisModule.syncRasciData(rasciData);
    }
    
    return null;
  }

  /**
   * Obtener tareas BPMN para RASCI
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
   * Detectar roles RALPH del canvas
   * @returns {Array} - Lista de roles RALPH detectados
   */
  detectRalphRoles() {
    const modeler = this.getBpmnModeler();
    
    if (!modeler) {
      return [];
    }

    try {
      const elementRegistry = modeler.get('elementRegistry');
      const ralphRoles = [];

      elementRegistry.forEach(element => {
        if (element.type === 'RALph:RoleRALph' || 
            element.type === 'ralph:Role' ||
            element.type === 'RALph:Role' ||
            element.type === 'ralph:RoleRALph' ||
            (element.type && element.type.includes('RALph') && element.type.includes('Role'))) {
          
          const roleName = element.businessObject && element.businessObject.name ? 
                          element.businessObject.name : 
                          (element.name || element.id || 'Rol sin nombre');
          
          if (roleName && !ralphRoles.includes(roleName)) {
            ralphRoles.push(roleName);
          }
        }
      });
      
      return ralphRoles;
    } catch (error) {
      console.error('Error detectando roles RALPH:', error);
      return [];
    }
  }

  /**
   * Forzar recarga de la matriz RASCI
   * @returns {boolean} - True si se ejecutó correctamente
   */
  forceReloadMatrix() {
    try {
      // Intentar obtener la función desde el ServiceRegistry
      const forceReloadFunction = this.bridge.serviceRegistry?.getFunction('forceReloadMatrix');
      
      if (forceReloadFunction && typeof forceReloadFunction === 'function') {
        forceReloadFunction();
        console.log('🔄 Matriz RASCI recargada a través del ServiceRegistry');
        return true;
      }
      
      // Publicar evento en EventBus
      const eb = getServiceRegistry?.()?.get('EventBus');
      if (eb) {
        eb.publish('rasci.matrix.reload', {});
        return true;
      }
      
      console.warn('⚠️ No se pudo encontrar la función forceReloadMatrix');
      return false;
    } catch (error) {
      console.error('❌ Error al recargar matriz RASCI:', error);
      return false;
    }
  }

  /**
   * Obtener estado del adaptador
   */
  getStatus() {
    return {
      initialized: this.initialized,
      bpmnModeler: !!this.getBpmnModeler(),
      ppisModule: !!this.getPPIsModule(),
      rasciManager: !!this.getRASCIManager(),
      matrixData: !!this.getMatrixData(),
      roles: !!this.getRoles(),
      ppiData: !!this.getPPIData()
    };
  }
}

// Instancia única del RASCI Adapter
const rasciAdapter = new RASCIAdapter();

// Exportar la instancia y la clase
export { RASCIAdapter };
export default rasciAdapter;
