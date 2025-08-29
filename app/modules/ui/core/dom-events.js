// DOM Events Helper - Centralized event registration without direct window usage
// Provides SSR-safe event listeners for browser environment

/**
 * Get the global root object safely (SSR-compatible)
 * @returns {Object|null} The global object or null if not available
 */
function getRoot() {
  // eslint-disable-next-line no-undef
  if (typeof globalThis !== 'undefined' && 'addEventListener' in globalThis) return globalThis;
  if (typeof self !== 'undefined' && 'addEventListener' in self) return self; // browser/workers
  return null;
}

/**
 * Safely register a window event listener
 * @param {string} type - Event type (e.g., 'load', 'resize', 'storage')
 * @param {Function} handler - Event handler function
 * @param {Object} options - addEventListener options
 * @returns {Function} Cleanup function to remove the event listener
 */
export function onWindowEvent(type, handler, options) {
  const root = getRoot();
  if (!root) return () => {};
  root.addEventListener(type, handler, options);
  // devuelve función de cleanup (buena práctica)
  return () => root.removeEventListener(type, handler, options);
}

/**
 * Register a load event listener (fires even if page already loaded)
 * @param {Function} fn - Handler function
 * @returns {Function} Cleanup function to remove the event listener
 */
export const onLoad = (fn) => {
  const root = getRoot();
  if (!root) return () => {};
  const doc = root.document;
  if (doc && doc.readyState === 'complete') {
    queueMicrotask(fn);
    return () => {};
  }
  return onWindowEvent('load', fn, { once: true });
};

/**
 * Register a beforeunload event listener
 * @param {Function} fn - Handler function
 * @returns {Function} Cleanup function to remove the event listener
 */
export const onBeforeUnload = (fn) => onWindowEvent('beforeunload', fn);

/**
 * Register a storage event listener
 * @param {Function} fn - Handler function
 * @returns {Function} Cleanup function to remove the event listener
 */
export const onStorage = (fn) => onWindowEvent('storage', fn);

/**
 * Register a resize event listener
 * @param {Function} fn - Handler function
 * @returns {Function} Cleanup function to remove the event listener
 */
export const onResize = (fn) => onWindowEvent('resize', fn);
