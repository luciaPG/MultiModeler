/**
 * EventBus Mock for HU01 acceptance tests
 * Based on the MockEventBus implementation from bpmn-modeler.mock.js
 */

class MockEventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Register an event listener
   * @param {string} event - Event name
   * @param {Function} callback - Callback function
   */
  on(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
  }

  /**
   * Unregister an event listener
   * @param {string} event - Event name  
   * @param {Function} callback - Callback function to remove
   */
  off(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  /**
   * Fire an event
   * @param {string} event - Event name
   * @param {Object} data - Event data
   */
  fire(event, data = {}) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Mock EventBus error in ${event}:`, e);
        }
      });
    }
  }

  /**
   * Alias for on() method for compatibility
   */
  once(event, callback) {
    const wrappedCallback = (data) => {
      callback(data);
      this.off(event, wrappedCallback);
    };
    this.on(event, wrappedCallback);
  }

  /**
   * Clear all listeners for testing
   */
  clear() {
    this.listeners.clear();
  }

  /**
   * Get all registered events for debugging
   */
  getEvents() {
    return Array.from(this.listeners.keys());
  }
}

module.exports = MockEventBus;