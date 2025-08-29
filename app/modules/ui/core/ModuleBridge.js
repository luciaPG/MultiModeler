/**
 * Module Bridge - Sistema de comunicación centralizado entre módulos
 * Reemplaza el uso de window para comunicación entre PPIs y RASCI
 */

import { getEventBus } from './event-bus.js';
import { getServiceRegistry } from './ServiceRegistry.js';

class ModuleBridge {
  constructor() {
    this.eventBus = getEventBus();
    this.serviceRegistry = getServiceRegistry();
    this.modules = new Map();
    this.sharedData = new Map();
    this.modelers = new Map();
    this.initialized = false;
  }

  /**
   * Inicializar el Module Bridge
   */
  async initialize() {
    if (this.initialized) return this;

    // Registrar eventos del bridge
    this.setupEventListeners();
    
    // Configurar servicios compartidos
    this.setupSharedServices();
    
    this.initialized = true;
    console.log('✅ Module Bridge inicializado');
    return this;
  }

  /**
   * Configurar listeners de eventos
   */
  setupEventListeners() {
    // Eventos de modeladores
    this.eventBus.subscribe('modeler.registered', (event) => {
      this.registerModeler(event.type, event.modeler);
    });

    this.eventBus.subscribe('modeler.unregistered', (event) => {
      this.unregisterModeler(event.type);
    });

    // Eventos de módulos
    this.eventBus.subscribe('module.registered', (event) => {
      this.registerModule(event.name, event.instance);
    });

    this.eventBus.subscribe('module.unregistered', (event) => {
      this.unregisterModule(event.name);
    });

    // Eventos de datos compartidos
    this.eventBus.subscribe('data.shared', (event) => {
      this.setSharedData(event.key, event.data);
    });

    this.eventBus.subscribe('data.requested', (event) => {
      const data = this.getSharedData(event.key);
      this.eventBus.publish('data.provided', {
        key: event.key,
        data: data,
        requestId: event.requestId
      });
    });
  }

  /**
   * Configurar servicios compartidos
   */
  setupSharedServices() {
    // Servicio para obtener modeladores
    this.serviceRegistry.registerFunction('getModeler', (type = 'bpmn') => {
      return this.getModeler(type);
    }, {
      alias: 'getModeler',
      description: 'Obtiene un modelador por tipo'
    });

    // Servicio para obtener módulos
    this.serviceRegistry.registerFunction('getModule', (name) => {
      return this.getModule(name);
    }, {
      alias: 'getModule',
      description: 'Obtiene una instancia de módulo'
    });

    // Servicio para datos compartidos
    this.serviceRegistry.registerFunction('getSharedData', (key) => {
      return this.getSharedData(key);
    }, {
      alias: 'getSharedData',
      description: 'Obtiene datos compartidos'
    });

    this.serviceRegistry.registerFunction('setSharedData', (key, data) => {
      return this.setSharedData(key, data);
    }, {
      alias: 'setSharedData',
      description: 'Establece datos compartidos'
    });
  }

  /**
   * Registrar un modelador
   * @param {string} type - Tipo de modelador (bpmn, ralph, etc.)
   * @param {Object} modeler - Instancia del modelador
   */
  registerModeler(type, modeler) {
    this.modelers.set(type, modeler);
    
    // Publicar evento de modelador registrado
    this.eventBus.publish('modeler.available', {
      type: type,
      modeler: modeler
    });


  }

  /**
   * Obtener un modelador
   * @param {string} type - Tipo de modelador
   * @returns {Object|null} - Instancia del modelador
   */
  getModeler(type = 'bpmn') {
    return this.modelers.get(type) || null;
  }

  /**
   * Desregistrar un modelador
   * @param {string} type - Tipo de modelador
   */
  unregisterModeler(type) {
    this.modelers.delete(type);
    
    this.eventBus.publish('modeler.unavailable', {
      type: type
    });

    console.log(`❌ Modelador ${type} desregistrado del Module Bridge`);
  }

  /**
   * Registrar un módulo
   * @param {string} name - Nombre del módulo
   * @param {Object} instance - Instancia del módulo
   */
  registerModule(name, instance) {
    this.modules.set(name, instance);
    
    // Publicar evento de módulo registrado
    this.eventBus.publish('module.available', {
      name: name,
      instance: instance
    });


  }

  /**
   * Obtener un módulo
   * @param {string} name - Nombre del módulo
   * @returns {Object|null} - Instancia del módulo
   */
  getModule(name) {
    return this.modules.get(name) || null;
  }

  /**
   * Desregistrar un módulo
   * @param {string} name - Nombre del módulo
   */
  unregisterModule(name) {
    this.modules.delete(name);
    
    this.eventBus.publish('module.unavailable', {
      name: name
    });

    console.log(`❌ Módulo ${name} desregistrado del Module Bridge`);
  }

  /**
   * Establecer datos compartidos
   * @param {string} key - Clave de los datos
   * @param {*} data - Datos a compartir
   */
  setSharedData(key, data) {
    this.sharedData.set(key, data);
    
    // Publicar evento de datos actualizados
    this.eventBus.publish('data.updated', {
      key: key,
      data: data
    });

    console.log(`📊 Datos compartidos actualizados: ${key}`);
  }

  /**
   * Obtener datos compartidos
   * @param {string} key - Clave de los datos
   * @returns {*} - Datos compartidos
   */
  getSharedData(key) {
    return this.sharedData.get(key);
  }

  /**
   * Eliminar datos compartidos
   * @param {string} key - Clave de los datos
   */
  removeSharedData(key) {
    this.sharedData.delete(key);
    
    this.eventBus.publish('data.removed', {
      key: key
    });

    console.log(`🗑️ Datos compartidos eliminados: ${key}`);
  }

  /**
   * Comunicación directa entre módulos
   * @param {string} fromModule - Módulo origen
   * @param {string} toModule - Módulo destino
   * @param {string} action - Acción a ejecutar
   * @param {*} data - Datos adicionales
   */
  async communicate(fromModule, toModule, action, data = {}) {
    const targetModule = this.getModule(toModule);
    
    if (!targetModule) {
      console.warn(`⚠️ Módulo ${toModule} no encontrado para comunicación desde ${fromModule}`);
      return null;
    }

    try {
      // Publicar evento de comunicación
      this.eventBus.publish('module.communication', {
        from: fromModule,
        to: toModule,
        action: action,
        data: data
      });

      // Ejecutar acción en el módulo destino
      if (typeof targetModule[action] === 'function') {
        const result = await targetModule[action](data);
        
        // Publicar evento de respuesta
        this.eventBus.publish('module.response', {
          from: toModule,
            to: fromModule,
            action: action,
            result: result
        });

        return result;
      } else {
        console.warn(`⚠️ Acción ${action} no encontrada en módulo ${toModule}`);
        return null;
      }
    } catch (error) {
      console.error(`❌ Error en comunicación entre módulos:`, error);
      
      this.eventBus.publish('module.error', {
        from: fromModule,
        to: toModule,
        action: action,
        error: error.message
      });

      return null;
    }
  }

  /**
   * Obtener estado del bridge
   */
  getStatus() {
    return {
      initialized: this.initialized,
      modules: Array.from(this.modules.keys()),
      modelers: Array.from(this.modelers.keys()),
      sharedData: Array.from(this.sharedData.keys())
    };
  }

  /**
   * Limpiar todos los datos
   */
  clear() {
    this.modules.clear();
    this.modelers.clear();
    this.sharedData.clear();
    
    this.eventBus.publish('bridge.cleared', {});
    
    console.log('🧹 Module Bridge limpiado');
  }
}

// Instancia única del Module Bridge
const moduleBridge = new ModuleBridge();

// Exportar la instancia y la clase
export { ModuleBridge };
export default moduleBridge;

