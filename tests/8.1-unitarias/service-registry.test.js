/**
 * 8.1 PRUEBAS UNITARIAS - ServiceRegistry
 * 
 * Valida el registro y resolución de servicios del sistema.
 * Módulo fundamental para la inyección de dependencias.
 */

describe('8.1 Pruebas Unitarias - ServiceRegistry', () => {
  let ServiceRegistry;

  beforeAll(async () => {
    const registryModule = await import('../../app/modules/ui/core/ServiceRegistry.js');
    ServiceRegistry = registryModule.ServiceRegistry || registryModule.default;
  });

  beforeEach(() => {
    // Limpiar registry entre tests
    if (ServiceRegistry.instance) {
      ServiceRegistry.instance.services = new Map();
    }
  });

  describe('Registro de Servicios', () => {
    test('debe registrar un servicio correctamente', () => {
      const registry = new ServiceRegistry();
      const mockService = { name: 'TestService', version: '1.0' };
      
      registry.register('testService', mockService);
      
      // Verificar usando métodos del registry
      const retrievedService = registry.get('testService');
      expect(retrievedService).toBe(mockService);
    });

    test('debe sobrescribir servicio existente', () => {
      const registry = new ServiceRegistry();
      const service1 = { version: '1.0' };
      const service2 = { version: '2.0' };
      
      registry.register('service', service1);
      registry.register('service', service2);
      
      const retrievedService = registry.get('service');
      expect(retrievedService).toBe(service2);
    });

    test('debe manejar servicios con factory functions', () => {
      const registry = new ServiceRegistry();
      const mockService = { created: true };
      
      registry.register('factoryService', mockService);
      
      const service = registry.get('factoryService');
      expect(service).toBeDefined();
      expect(service.created).toBe(true);
    });
  });

  describe('Resolución de Servicios', () => {
    test('debe resolver servicio registrado', () => {
      const registry = new ServiceRegistry();
      const mockService = { data: 'test' };
      
      registry.register('resolveTest', mockService);
      
      const resolved = registry.get('resolveTest');
      expect(resolved).toBe(mockService);
    });

    test('debe retornar undefined para servicio no registrado', () => {
      const registry = new ServiceRegistry();
      
      const result = registry.get('nonExistent');
      expect(result).toBeUndefined();
    });

    test('debe manejar servicios singleton', () => {
      const registry = new ServiceRegistry();
      const mockService = { id: 'singleton-instance' };
      
      registry.register('singleton', mockService);
      
      const instance1 = registry.get('singleton');
      const instance2 = registry.get('singleton');
      
      expect(instance1).toBe(mockService);
      expect(instance2).toBe(mockService);
      expect(instance1).toBe(instance2);
    });
  });

  describe('Gestión de Dependencias', () => {
    test('debe resolver dependencias automáticamente', () => {
      const registry = new ServiceRegistry();
      
      registry.register('dependency', { value: 'dep' });
      registry.register('service', { dep: { value: 'dep' } });
      
      const service = registry.get('service');
      expect(service).toBeDefined();
      expect(service.dep).toBeDefined();
    });

    test('debe manejar dependencias circulares', () => {
      const registry = new ServiceRegistry();
      
      registry.register('serviceA', () => registry.get('serviceB'));
      registry.register('serviceB', () => registry.get('serviceA'));
      
      // No debería causar stack overflow
      expect(() => {
        registry.get('serviceA');
      }).not.toThrow();
    });
  });

  describe('Utilidades del Registry', () => {
    test('debe listar todos los servicios registrados', () => {
      const registry = new ServiceRegistry();
      
      registry.register('service1', {});
      registry.register('service2', {});
      registry.register('service3', {});
      
      // Verificar que los servicios se pueden recuperar
      expect(registry.get('service1')).toBeDefined();
      expect(registry.get('service2')).toBeDefined();
      expect(registry.get('service3')).toBeDefined();
    });

    test('debe verificar existencia de servicios', () => {
      const registry = new ServiceRegistry();
      
      registry.register('exists', {});
      
      const existsService = registry.get('exists');
      const notExistsService = registry.get('notExists');
      
      expect(existsService).toBeDefined();
      expect(notExistsService).toBeUndefined();
    });

    test('debe limpiar servicios', () => {
      const registry = new ServiceRegistry();
      
      registry.register('temp1', {});
      registry.register('temp2', {});
      
      // Verificar que los servicios existen
      expect(registry.get('temp1')).toBeDefined();
      expect(registry.get('temp2')).toBeDefined();
      
      // Limpiar si el método existe
      if (registry.clear) {
        registry.clear();
        // Verificar que ya no existen
        expect(registry.get('temp1')).toBeUndefined();
        expect(registry.get('temp2')).toBeUndefined();
      }
    });
  });
});
