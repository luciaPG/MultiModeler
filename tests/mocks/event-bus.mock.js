// Mock para EventBus
class MockEventBus {
  constructor() {
    this.listeners = new Map();
    this.history = [];
  }

  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event).push(callback);
    return () => this.unsubscribe(event, callback);
  }

  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      const callbacks = this.listeners.get(event);
      const index = callbacks.indexOf(callback);
      if (index > -1) {
        callbacks.splice(index, 1);
      }
    }
  }

  publish(event, data = {}) {
    this.history.push({ event, data, timestamp: new Date() });
    
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

  getHistory() {
    return [...this.history];
  }

  clear() {
    this.listeners.clear();
    this.history = [];
  }
}

// ES6 export
export { MockEventBus };
export default MockEventBus;

// CommonJS compatibility
if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockEventBus;
  module.exports.MockEventBus = MockEventBus;
  module.exports.default = MockEventBus;
}

