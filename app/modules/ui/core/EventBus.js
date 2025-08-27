/**
 * Event Bus - Sistema de comunicación centralizado
 * Reemplaza el uso de variables y funciones globales en window
 */
class EventBus {
  constructor() {
    this.events = new Map();
    this.subscribers = new Map();
    this.services = new Map();
    this.middleware = [];
  }

  // === EVENT SYSTEM ===
  
  /**
   * Suscribirse a un evento
   * @param {string} eventName - Nombre del evento
   * @param {Function} callback - Función a ejecutar
   * @param {Object} options - Opciones adicionales
   */
  subscribe(eventName, callback, options = {}) {
    if (!this.subscribers.has(eventName)) {
      this.subscribers.set(eventName, []);
    }
    
    const subscriber = {
      callback,
      options,
      id: this.generateId()
    };
    
    this.subscribers.get(eventName).push(subscriber);
    return subscriber.id;
  }

  /**
   * Desuscribirse de un evento
   * @param {string} eventName - Nombre del evento
   * @param {string|Function} identifier - ID del subscriber o función callback
   */
  unsubscribe(eventName, identifier) {
    if (!this.subscribers.has(eventName)) return;
    
    const subscribers = this.subscribers.get(eventName);
    const index = subscribers.findIndex(sub => 
      sub.id === identifier || sub.callback === identifier
    );
    
    if (index !== -1) {
      subscribers.splice(index, 1);
    }
  }

  /**
   * Publicar un evento
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos a enviar
   * @param {Object} options - Opciones adicionales
   */
  async publish(eventName, data = null, options = {}) {
    if (!this.subscribers.has(eventName)) return;
    
    const subscribers = this.subscribers.get(eventName);
    const event = {
      name: eventName,
      data,
      timestamp: Date.now(),
      options
    };

    // Ejecutar middleware
    for (const middleware of this.middleware) {
      try {
        await middleware(event);
      } catch (error) {
        console.error(`Middleware error for event ${eventName}:`, error);
      }
    }

    // Notificar a todos los subscribers
    const promises = subscribers.map(async (subscriber) => {
      try {
        await subscriber.callback(event);
      } catch (error) {
        console.error(`Subscriber error for event ${eventName}:`, error);
        if (subscriber.options.onError) {
          subscriber.options.onError(error);
        }
      }
    });

    await Promise.all(promises);
  }

  /**
   * Publicar evento una sola vez
   * @param {string} eventName - Nombre del evento
   * @param {*} data - Datos a enviar
   */
  async publishOnce(eventName, data = null) {
    await this.publish(eventName, data);
    this.subscribers.delete(eventName);
  }

  // === SERVICE REGISTRY ===
  
  /**
   * Registrar un servicio
   * @param {string} serviceName - Nombre del servicio
   * @param {Object} service - Instancia del servicio
   */
  registerService(serviceName, service) {
    this.services.set(serviceName, service);
    this.publish('service.registered', { serviceName, service });
  }

  /**
   * Obtener un servicio
   * @param {string} serviceName - Nombre del servicio
   * @returns {Object|null} - Instancia del servicio
   */
  getService(serviceName) {
    return this.services.get(serviceName) || null;
  }

  /**
   * Verificar si existe un servicio
   * @param {string} serviceName - Nombre del servicio
   * @returns {boolean}
   */
  hasService(serviceName) {
    return this.services.has(serviceName);
  }

  /**
   * Eliminar un servicio
   * @param {string} serviceName - Nombre del servicio
   */
  unregisterService(serviceName) {
    if (this.services.has(serviceName)) {
      const service = this.services.get(serviceName);
      this.services.delete(serviceName);
      this.publish('service.unregistered', { serviceName, service });
    }
  }

  // === MIDDLEWARE ===
  
  /**
   * Agregar middleware
   * @param {Function} middleware - Función middleware
   */
  use(middleware) {
    this.middleware.push(middleware);
  }

  // === UTILITIES ===
  
  /**
   * Generar ID único
   * @returns {string}
   */
  generateId() {
    return Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtener estadísticas del Event Bus
   * @returns {Object}
   */
  getStats() {
    return {
      eventCount: this.subscribers.size,
      serviceCount: this.services.size,
      middlewareCount: this.middleware.length,
      events: Array.from(this.subscribers.keys()),
      services: Array.from(this.services.keys())
    };
  }

  /**
   * Limpiar todos los eventos y servicios
   */
  clear() {
    this.subscribers.clear();
    this.services.clear();
    this.middleware = [];
  }

  /**
   * Debug: Listar todos los eventos y sus subscribers
   */
  debug() {
    console.log('=== Event Bus Debug ===');
    console.log('Events:', this.getStats());
    
    for (const [eventName, subscribers] of this.subscribers) {
      console.log(`Event: ${eventName} (${subscribers.length} subscribers)`);
      subscribers.forEach((sub, index) => {
        console.log(`  ${index + 1}. ID: ${sub.id}, Callback: ${sub.callback.name || 'anonymous'}`);
      });
    }
  }
}

// Crear instancia global del Event Bus
const eventBus = new EventBus();

// Exportar para uso en módulos
export default eventBus;

// También exportar como singleton para compatibilidad
export { EventBus };

