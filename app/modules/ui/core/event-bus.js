// Event Bus - Core communication component for MultiNotation Modeler
// This provides a publish/subscribe mechanism for decoupling modules and panels

export class EventBus {
  constructor() {
    this.subscribers = {};
    this.wildcardSubscribers = [];
    this.history = [];
    this.historyLimit = 100; // Limit history size to avoid memory issues
  }

  /**
   * Subscribe to a specific event
   * @param {string} event - The event name to subscribe to
   * @param {Function} callback - The callback function to execute when event occurs
   * @returns {Function} - Unsubscribe function
   */
  subscribe(event, callback) {
    // Handle wildcard subscription
    if (event === '*') {
      this.wildcardSubscribers.push(callback);
      return () => this.unsubscribeWildcard(callback);
    }

    // Regular event subscription
    if (!this.subscribers[event]) {
      this.subscribers[event] = [];
    }
    this.subscribers[event].push(callback);
    return () => this.unsubscribe(event, callback);
  }

  /**
   * Unsubscribe from a specific event
   * @param {string} event - The event name to unsubscribe from
   * @param {Function} callback - The callback function to remove
   */
  unsubscribe(event, callback) {
    if (!this.subscribers[event]) return;
    this.subscribers[event] = this.subscribers[event].filter(cb => cb !== callback);
  }

  /**
   * Unsubscribe from wildcard events
   * @param {Function} callback - The callback function to remove
   */
  unsubscribeWildcard(callback) {
    this.wildcardSubscribers = this.wildcardSubscribers.filter(cb => cb !== callback);
  }

  /**
   * Publish an event with data
   * @param {string} event - The event name to publish
   * @param {any} data - The data to pass to subscribers
   */
  publish(event, data = {}) {
    // Record in history
    this.recordHistory(event, data);

    // Notify specific subscribers
    if (this.subscribers[event]) {
      this.subscribers[event].forEach(callback => {
        try {
          callback(data);
        } catch (e) {
          console.error(`Error in event subscriber for ${event}:`, e);
        }
      });
    }

    // Notify wildcard subscribers
    this.wildcardSubscribers.forEach(callback => {
      try {
        callback({ event, data });
      } catch (e) {
        console.error(`Error in wildcard subscriber for ${event}:`, e);
      }
    });
  }

  /**
   * Record event in history for debugging purposes
   * @param {string} event - The event name
   * @param {any} data - The event data
   * @private
   */
  recordHistory(event, data) {
    this.history.push({
      event,
      data,
      timestamp: new Date()
    });
    
    // Trim history if it exceeds limit
    if (this.history.length > this.historyLimit) {
      this.history.shift();
    }
  }

  /**
   * Get event history (useful for debugging)
   * @returns {Array} - Event history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Clear all subscribers
   */
  clear() {
    this.subscribers = {};
    this.wildcardSubscribers = [];
  }
}

// Singleton instance to use throughout the application
let instance = null;

/**
 * Get the global EventBus instance
 * @returns {EventBus} - The global EventBus instance
 */
export function getEventBus() {
  if (!instance) {
    instance = new EventBus();
  }
  return instance;
}
