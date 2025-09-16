import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';

/**
 * Obtiene un servicio del ServiceRegistry de forma segura
 * @param {string} key
 * @returns {any|null}
 */
export function resolve(key) {
  try {
    const reg = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
    return reg && typeof reg.get === 'function' ? (reg.get(key) || null) : null;
  } catch (error) {
    return null;
  }
}
