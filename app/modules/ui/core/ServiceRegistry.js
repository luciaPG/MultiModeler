// Add getFunction for compatibility
ServiceRegistry.prototype.getFunction = function(name) {
  var entry = this.functions[name];
  return entry ? entry.fn : undefined;
};
// ServiceRegistry singleton + shim global (ES5 compatible)

function ServiceRegistry() {
  this.services = {};
  this.functions = {};
}

ServiceRegistry.prototype.register = function(serviceName, service, options) {
  // options is optional
  this.services[serviceName] = {
    instance: service,
    options: options || {},
    registeredAt: Date.now()
  };
  // Optional: notify EventBus
  try {
    var eb = this.get('EventBus');
    if (eb && eb.publish) eb.publish('service.registered', { serviceName: serviceName, service: service, options: options });
  } catch (e) {}
};

ServiceRegistry.prototype.get = function(name) {
  var entry = this.services[name];
  return entry ? entry.instance : undefined;
};

ServiceRegistry.prototype.has = function(name) {
  return Object.prototype.hasOwnProperty.call(this.services, name);
};

ServiceRegistry.prototype.registerFunction = function(name, fn, meta) {
  this.functions[name] = { fn: fn, meta: meta || {} };
  try {
    var eb = this.get('EventBus');
    if (eb && eb.publish) eb.publish('service.registered', { name: name });
  } catch (e) {}
};

ServiceRegistry.prototype.call = function(name) {
  var entry = this.functions[name];
  if (!entry) throw new Error('Function not found: ' + name);
  var args = Array.prototype.slice.call(arguments, 1);
  return entry.fn.apply(null, args);
};

ServiceRegistry.prototype.executeFunction = function(name) {
  return this.call.apply(this, arguments);
};

ServiceRegistry.prototype.debug = function() {
  console.log('[ServiceRegistry] Services:', Object.keys(this.services));
  console.log('[ServiceRegistry] Functions:', Object.keys(this.functions));
};

ServiceRegistry.prototype.getStats = function() {
  return {
    services: Object.keys(this.services).length,
    functions: Object.keys(this.functions).length,
    serviceNames: Object.keys(this.services),
    functionNames: Object.keys(this.functions)
  };
};

ServiceRegistry.prototype.clear = function() {
  this.services = {};
  this.functions = {};
  console.log('[ServiceRegistry] Registry cleared');
};

var _sr = new ServiceRegistry();

function getServiceRegistry() {
  return _sr;
}

// EXPONER GLOBALMENTE para módulos que NO importan nada:
if (typeof window !== 'undefined' && !window.getServiceRegistry) {
  window.getServiceRegistry = getServiceRegistry;
}

// ES6 export for modern modules
export { ServiceRegistry, getServiceRegistry };
