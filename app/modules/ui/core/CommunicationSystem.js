/**
 * Communication System - Sistema de comunicación centralizado
 * Inicializa y configura el EventBus, ServiceRegistry, ModuleBridge y adaptadores
 * Reemplaza el uso de variables y funciones globales en window
 */

import { getEventBus } from './event-bus.js';
import { getServiceRegistry } from './ServiceRegistry.js';
import windowCompatibilityAdapter from './WindowCompatibilityAdapter.js';
import moduleBridge from './ModuleBridge.js';
import ppiAdapter from '../../ppis/PPIAdapter.js';
import rasciAdapter from '../../rasci/RASCIAdapter.js';

class CommunicationSystem {
  constructor() {
    this.eventBus = getEventBus();
    this.serviceRegistry = getServiceRegistry();
    this.windowAdapter = windowCompatibilityAdapter;
    this.moduleBridge = moduleBridge;
    this.ppiAdapter = ppiAdapter;
    this.rasciAdapter = rasciAdapter;
    this.initialized = false;
  }

  /**
   * Inicializar el sistema de comunicación
   * @param {Object} options - Opciones de configuración
   */
  async initialize(options = {}) {
    if (this.initialized) {
      console.log('[CommunicationSystem] Ya inicializado');
      return this;
    }

    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('[CommunicationSystem] Inicializando sistema de comunicación...');

    try {
      // 1. ServiceRegistry initialization - no longer exposed on window
      // Optimización: Log eliminado para mejorar rendimiento
      // console.log('[CommunicationSystem] Inicializando ServiceRegistry...');

      // 2. Configurar middleware para logging
      this.setupLoggingMiddleware();

      // 3. Registrar servicios core
      this.registerCoreServices();

      // 4. Configurar migración automática
      this.setupAutomaticMigration();

      // 5. Configurar eventos de debug
      this.setupDebugEvents();

      // Publicar evento de inicialización
      this.eventBus.publish('communication.system.initialized', {
        timestamp: Date.now(),
        options
      });

      this.initialized = true;
      // Optimización: Log eliminado para mejorar rendimiento
    // console.log('[CommunicationSystem] Sistema de comunicación inicializado exitosamente');

      return this;
    } catch (error) {
      console.error('[CommunicationSystem] Error al inicializar:', error);
      throw error;
    }
  }

  /**
   * Configurar middleware para logging
   */
  setupLoggingMiddleware() {
    this.eventBus.subscribe('*', (event) => {
      if (event.name && !event.name.startsWith('communication.')) {
        console.debug(`[EventBus] ${event.name}`, event.data);
      }
    });
  }

  /**
   * Registrar servicios core
   */
  registerCoreServices() {
    // Registrar el propio sistema de comunicación
    this.serviceRegistry.register('communicationSystem', this, {
      description: 'Sistema de comunicación centralizado'
    });

    // Registrar el EventBus
    this.serviceRegistry.register('eventBus', this.eventBus, {
      description: 'Sistema de eventos centralizado'
    });

    // Registrar el ServiceRegistry
    this.serviceRegistry.register('serviceRegistry', this.serviceRegistry, {
      description: 'Registro de servicios centralizado'
    });

    // Registrar el ModuleBridge
    this.serviceRegistry.register('moduleBridge', this.moduleBridge, {
      description: 'Puente de comunicación entre módulos'
    });

    // Registrar los adaptadores
    this.serviceRegistry.register('ppiAdapter', this.ppiAdapter, {
      description: 'Adaptador para módulo PPIs'
    });

    this.serviceRegistry.register('rasciAdapter', this.rasciAdapter, {
      description: 'Adaptador para módulo RASCI'
    });

    // Registrar el WindowAdapter
    this.serviceRegistry.register('windowAdapter', this.windowAdapter, {
      description: 'Adaptador de compatibilidad con window'
    });
  }

  /**
   * Configurar migración automática
   */
  setupAutomaticMigration() {
    // Migrar funciones RASCI automáticamente
    this.windowAdapter.migrateRasciFunctions();

    // Migrar funciones PPI automáticamente
    this.windowAdapter.migratePpiFunctions();

    // Migrar funciones UI automáticamente
    this.windowAdapter.migrateUIFunctions();

    console.log('[CommunicationSystem] Migración automática configurada');
  }

  /**
   * Configurar eventos de debug
   */
  setupDebugEvents() {
    // Evento para debug del sistema
    this.eventBus.subscribe('debug.communication.system', () => {
      this.debug();
    });

    // Evento para debug del ServiceRegistry
    this.eventBus.subscribe('debug.service.registry', () => {
      this.serviceRegistry.debug();
    });

    // Evento para debug del WindowAdapter
    this.eventBus.subscribe('debug.adapter.window', () => {
      this.windowAdapter.debug();
    });
  }

  /**
   * Registrar un servicio
   * @param {string} name - Nombre del servicio
   * @param {Object} service - Instancia del servicio
   * @param {Object} options - Opciones adicionales
   */
  registerService(name, service, options = {}) {
    return this.serviceRegistry.register(name, service, options);
  }

  /**
   * Obtener un servicio
   * @param {string} name - Nombre del servicio
   * @returns {Object|null}
   */
  getService(name) {
    return this.serviceRegistry.get(name);
  }

  /**
   * Publicar un evento
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos del evento
   */
  publishEvent(eventName, data = null) {
    return this.eventBus.publish(eventName, data);
  }

  /**
   * Suscribirse a un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función callback
   * @returns {string} - ID del subscriber
   */
  subscribeToEvent(eventName, callback) {
    return this.eventBus.subscribe(eventName, callback);
  }

  /**
   * Migrar una función específica
   * @param {string} functionName - Nombre de la función
   * @param {Function} functionImpl - Implementación
   * @param {Object} options - Opciones
   */
  migrateFunction(functionName, functionImpl, options = {}) {
    return this.windowAdapter.migrateFunction(functionName, functionImpl, options);
  }

  /**
   * Verificar si una función está migrada
   * @param {string} functionName - Nombre de la función
   * @returns {boolean}
   */
  isFunctionMigrated(functionName) {
    return this.windowAdapter.isMigrated(functionName);
  }

  /**
   * Obtener estadísticas del sistema
   * @returns {Object}
   */
  getStats() {
    return {
      eventBus: this.eventBus.getStats(),
      serviceRegistry: this.serviceRegistry.getStats(),
      windowAdapter: this.windowAdapter.getMigrationStats(),
      initialized: this.initialized
    };
  }

  /**
   * Debug: Mostrar información del sistema
   */
  debug() {
    console.log('=== Communication System Debug ===');
    console.log('Stats:', this.getStats());
    
    console.log('\n=== Event Bus ===');
    this.eventBus.debug();
    
    console.log('\n=== Service Registry ===');
    this.serviceRegistry.debug();
    
    console.log('\n=== Window Adapter ===');
    this.windowAdapter.debug();
  }

  /**
   * Limpiar el sistema
   */
  clear() {
    this.eventBus.clear();
    this.serviceRegistry.clear();
    this.windowAdapter.clear();
    this.initialized = false;
    
    console.log('[CommunicationSystem] Sistema limpiado');
  }
}

// Crear instancia global del sistema de comunicación
const communicationSystem = new CommunicationSystem();

// Exportar para uso en módulos
export default communicationSystem;

// También exportar la clase para compatibilidad
export { CommunicationSystem };

// Función helper para inicializar el sistema
export async function initializeCommunicationSystem(options = {}) {
  return await communicationSystem.initialize(options);
}

// Función helper para obtener el sistema
export function getCommunicationSystem() {
  return communicationSystem;
}


