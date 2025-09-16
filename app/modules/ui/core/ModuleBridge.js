/**
 * Module Bridge - Sistema de comunicación centralizado entre módulos
 * Reemplaza el uso de window para comunicación entre PPIs y RASCI
 */

import { getEventBus } from './event-bus.js';
import { getServiceRegistry } from './ServiceRegistry.js';

class ModuleBridge {
  constructor() {
    this.eventBus = getEventBus?.() || null;
    this.serviceRegistry = getServiceRegistry?.() || null;
    this.modules = new Map();
    this.sharedData = new Map();
    this.modelers = new Map();
    this.initialized = false;
  }

  // === Ciclo de vida =========================================================
  async initialize() {
    if (this.initialized) return this;

    // Asegurar dependencias incluso en SSR / timings raros
    this.eventBus = this.eventBus || (getEventBus?.() || globalThis.getEventBus?.());
    this.serviceRegistry = this.serviceRegistry || (getServiceRegistry?.() || (typeof window !== 'undefined' && window.getServiceRegistry?.()));

    this.setupEventListeners();
    this.setupSharedServices();

    this.initialized = true;
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('✅ ModuleBridge inicializado');
    return this;
  }

  // === Listeners =============================================================
  setupEventListeners() {
    if (!this.eventBus) return;

    // PUBLICACIONES EXTERNAS ESPERADAS:
    // - 'bpmn.modeler.created'  -> { modeler }
    // - 'bpmn.modeler.changed'  -> { modeler }
    // - 'modeler.registered'    -> { type, modeler }
    // - 'modeler.unregistered'  -> { type }

    const onModelerInferred = (payload = {}) => {
      const modeler = payload.modeler;
      if (!modeler) return;
      // Mejor esfuerzo: si no nos dicen el tipo, asumimos 'bpmn'
      const type = payload.type || 'bpmn';
      this.registerModeler(type, modeler);
    };

    // Compat: eventos “bpmn.*”
    this.eventBus.subscribe?.('bpmn.modeler.created', onModelerInferred);
    this.eventBus.subscribe?.('bpmn.modeler.changed', onModelerInferred);

    // Compat: eventos “modeler.*”
    this.eventBus.subscribe?.('modeler.registered', e => this.registerModeler(e.type || 'bpmn', e.modeler));
    this.eventBus.subscribe?.('modeler.unregistered', e => this.unregisterModeler(e.type || 'bpmn'));

    // Módulos
    this.eventBus.subscribe?.('module.registered', e => this.registerModule(e.name, e.instance));
    this.eventBus.subscribe?.('module.unregistered', e => this.unregisterModule(e.name));

    // Datos compartidos
    this.eventBus.subscribe?.('data.shared', e => this.setSharedData(e.key, e.data));
    this.eventBus.subscribe?.('data.requested', e => {
      const data = this.getSharedData(e.key);
      this.eventBus.publish?.('data.provided', { key: e.key, data, requestId: e.requestId });
    });
  }

  // === Servicios compartidos (ServiceRegistry) ===============================
  setupSharedServices() {
    const sr = this.serviceRegistry;
    if (!sr?.registerFunction) return;

    sr.registerFunction('getModeler', (type = 'bpmn') => this.getModeler(type), {
      alias: 'getModeler',
      description: 'Obtiene un modelador por tipo'
    });

    sr.registerFunction('getModule', (name) => this.getModule(name), {
      alias: 'getModule',
      description: 'Obtiene una instancia de módulo'
    });

    sr.registerFunction('getSharedData', (key) => this.getSharedData(key), {
      alias: 'getSharedData',
      description: 'Obtiene datos compartidos'
    });

    sr.registerFunction('setSharedData', (key, data) => this.setSharedData(key, data), {
      alias: 'setSharedData',
      description: 'Establece datos compartidos'
    });

    // También exponemos el propio bridge
    sr.register('ModuleBridge', this, { description: 'Bridge de comunicación entre módulos' });
  }

  // === Modelers ==============================================================

  registerModeler(type, modeler) {
    if (!type || !modeler) return;
    this.modelers.set(type, modeler);

    this.eventBus?.publish?.('modeler.available', { type, modeler });
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log(`🧩 Modeler "${type}" registrado en ModuleBridge`);
  }

  getModeler(type = 'bpmn') {
    return this.modelers.get(type) || null;
  }

  unregisterModeler(type) {
    if (!type) return;
    this.modelers.delete(type);
    this.eventBus?.publish?.('modeler.unavailable', { type });
    console.log(`❌ Modeler "${type}" desregistrado de ModuleBridge`);
  }

  // === Módulos ===============================================================

  registerModule(name, instance) {
    if (!name || !instance) return;
    this.modules.set(name, instance);
    this.eventBus?.publish?.('module.available', { name, instance });
  }

  getModule(name) {
    return this.modules.get(name) || null;
  }

  unregisterModule(name) {
    if (!name) return;
    this.modules.delete(name);
    this.eventBus?.publish?.('module.unavailable', { name });
    console.log(`❌ Módulo "${name}" desregistrado de ModuleBridge`);
  }

  // === Shared data ===========================================================

  setSharedData(key, data) {
    if (key == null) return;
    this.sharedData.set(key, data);
    this.eventBus?.publish?.('data.updated', { key, data });
  }

  getSharedData(key) {
    return this.sharedData.get(key);
  }

  removeSharedData(key) {
    this.sharedData.delete(key);
    this.eventBus?.publish?.('data.removed', { key });
  }

  // === Comunicación directa ==================================================

  async communicate(fromModule, toModule, action, data = {}) {
    const target = this.getModule(toModule);
    if (!target) {
      console.warn(`⚠️ Módulo destino "${toModule}" no encontrado (from: ${fromModule})`);
      return null;
    }
    try {
      this.eventBus?.publish?.('module.communication', { from: fromModule, to: toModule, action, data });
      if (typeof target[action] === 'function') {
        const result = await target[action](data);
        this.eventBus?.publish?.('module.response', { from: toModule, to: fromModule, action, result });
        return result;
      }
      console.warn(`⚠️ Acción "${action}" no existe en el módulo "${toModule}"`);
      return null;
    } catch (err) {
      console.error('❌ Error en comunicación entre módulos:', err);
      this.eventBus?.publish?.('module.error', { from: fromModule, to: toModule, action, error: err?.message });
      return null;
    }
  }

  // === Utilidades ============================================================

  getStatus() {
    return {
      initialized: this.initialized,
      modules: Array.from(this.modules.keys()),
      modelers: Array.from(this.modelers.keys()),
      sharedData: Array.from(this.sharedData.keys())
    };
  }

  clear() {
    this.modules.clear();
    this.modelers.clear();
    this.sharedData.clear();
    this.eventBus?.publish?.('bridge.cleared', {});
    console.log('🧹 ModuleBridge limpiado');
  }
}

// === Singleton perezoso + exports compatibles ================================

let __bridgeSingleton = null;

function createSingleton() {
  if (!__bridgeSingleton) {
    __bridgeSingleton = new ModuleBridge();
    // inicializamos sin bloquear (y tolerante a fallos)
    __bridgeSingleton.initialize?.().catch(err => {
      console.warn('[ModuleBridge] init warning:', err?.message || err);
    });

    // Exponer global para módulos legacy (opcional, pero útil)
    try {
      if (typeof window !== 'undefined') window.moduleBridge = __bridgeSingleton;
      globalThis.moduleBridge = __bridgeSingleton;
    } catch {}
  }
  return __bridgeSingleton;
}

/** Named export recomendado */
export function getModuleBridge() {
  return createSingleton();
}

/** Default export para compatibilidad con `import moduleBridge from ...` */
const defaultExport = createSingleton();
export default defaultExport;

/** También exportamos la clase por si alguien la necesita para tipos/tests */
export { ModuleBridge };
