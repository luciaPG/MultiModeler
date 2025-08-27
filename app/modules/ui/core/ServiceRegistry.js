/**
 * Service Registry - Sistema de registro de servicios centralizado
 * Se integra con el EventBus existente para reemplazar funciones globales de window
 */

// Importar EventBus desde el archivo correcto
import { getEventBus } from './event-bus.js';

class ServiceRegistry {
  constructor() {
    this.services = new Map();
    this.eventBus = getEventBus(); // Usar la instancia global
    this.aliases = new Map(); // Para mantener compatibilidad con nombres de window
  }

  /**
   * Registrar un servicio
   * @param {string} serviceName - Nombre del servicio
   * @param {Object} service - Instancia del servicio
   * @param {Object} options - Opciones adicionales
   */
  register(serviceName, service, options = {}) {
    // Registrar el servicio
    this.services.set(serviceName, {
      instance: service,
      options,
      registeredAt: Date.now()
    });

    // Crear alias si se especifica
    if (options.alias) {
      this.aliases.set(options.alias, serviceName);
    }

    // Publicar evento de registro
    this.eventBus.publish('service.registered', {
      serviceName,
      service,
      options
    });

    console.log(`[ServiceRegistry] Servicio registrado: ${serviceName}`);
  }

  /**
   * Obtener un servicio
   * @param {string} serviceName - Nombre del servicio
   * @returns {Object|null} - Instancia del servicio
   */
  get(serviceName) {
    // Buscar por nombre directo
    if (this.services.has(serviceName)) {
      return this.services.get(serviceName).instance;
    }

    // Buscar por alias
    if (this.aliases.has(serviceName)) {
      const actualName = this.aliases.get(serviceName);
      return this.services.get(actualName) && this.services.get(actualName).instance || null;
    }

    return null;
  }

  /**
   * Verificar si existe un servicio
   * @param {string} serviceName - Nombre del servicio
   * @returns {boolean}
   */
  has(serviceName) {
    return this.services.has(serviceName) || this.aliases.has(serviceName);
  }

  /**
   * Eliminar un servicio
   * @param {string} serviceName - Nombre del servicio
   */
  unregister(serviceName) {
    if (this.services.has(serviceName)) {
      const service = this.services.get(serviceName);
      this.services.delete(serviceName);
      
      // Eliminar alias asociados
      for (const [alias, name] of this.aliases.entries()) {
        if (name === serviceName) {
          this.aliases.delete(alias);
        }
      }

      this.eventBus.publish('service.unregistered', {
        serviceName,
        service: service.instance
      });

      console.log(`[ServiceRegistry] Servicio eliminado: ${serviceName}`);
    }
  }

  /**
   * Registrar una función como servicio
   * @param {string} functionName - Nombre de la función
   * @param {Function} func - Función a registrar
   * @param {Object} options - Opciones adicionales
   */
  registerFunction(functionName, func, options = {}) {
    const service = {
      type: 'function',
      execute: func,
      name: functionName
    };

    this.register(functionName, service, options);
  }

  /**
   * Obtener una función registrada
   * @param {string} functionName - Nombre de la función
   * @returns {Function|null} - Función registrada
   */
  getFunction(functionName) {
    const service = this.get(functionName);
    
    if (service && service.type === 'function') {
      return service.execute;
    }
    
    if (service && typeof service === 'function') {
      return service;
    }

    return null;
  }

  /**
   * Ejecutar una función registrada
   * @param {string} functionName - Nombre de la función
   * @param {...any} args - Argumentos para la función
   * @returns {any} - Resultado de la función
   */
  executeFunction(functionName, ...args) {
    const func = this.getFunction(functionName);
    
    if (func) {
      return func(...args);
    }

    throw new Error(`Función no encontrada: ${functionName}`);
  }

  /**
   * Migrar funciones de window al registry
   * @param {Array} functionNames - Lista de nombres de funciones a migrar
   */
  migrateFromWindow(functionNames) {
    functionNames.forEach(name => {
      if (window[name] && typeof window[name] === 'function') {
        this.registerFunction(name, window[name], {
          alias: name,
          migrated: true
        });
        
        // Reemplazar la función global con una que use el registry
        window[name] = (...args) => this.executeFunction(name, ...args);
        
        console.log(`[ServiceRegistry] Función migrada desde window: ${name}`);
      }
    });
  }

  /**
   * Obtener estadísticas del registry
   * @returns {Object}
   */
  getStats() {
    return {
      serviceCount: this.services.size,
      aliasCount: this.aliases.size,
      services: Array.from(this.services.keys()),
      aliases: Array.from(this.aliases.keys())
    };
  }

  /**
   * Debug: Listar todos los servicios
   */
  debug() {
    console.log('=== Service Registry Debug ===');
    console.log('Stats:', this.getStats());
    
    for (const [name, service] of this.services) {
      console.log(`Service: ${name}`);
      console.log(`  Type: ${service.instance.type || typeof service.instance}`);
      console.log(`  Registered: ${new Date(service.registeredAt).toISOString()}`);
      console.log(`  Options:`, service.options);
    }
  }
}

// Crear instancia global del Service Registry
const serviceRegistry = new ServiceRegistry();

// Función para obtener la instancia del Service Registry
export function getServiceRegistry() {
  return serviceRegistry;
}

// Exportar para uso en módulos
export default serviceRegistry;

// También exportar la clase para compatibilidad
export { ServiceRegistry };
