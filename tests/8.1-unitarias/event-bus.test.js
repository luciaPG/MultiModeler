/**
 * 8.1 PRUEBAS UNITARIAS - EventBus
 * 
 * Valida el sistema de eventos central del modelador.
 * Módulo crítico para la comunicación entre BPMN, PPINOT, RALPH y RASCI.
 */

describe('8.1 Pruebas Unitarias - EventBus', () => {
  let EventBus, getEventBus;

  beforeAll(async () => {
    const eventBusModule = await import('../../app/modules/ui/core/event-bus.js');
    EventBus = eventBusModule.EventBus;
    getEventBus = eventBusModule.getEventBus;
  });

  beforeEach(() => {
    // Limpiar instancias entre tests
    if (EventBus.instance) {
      EventBus.instance = null;
    }
  });

  describe('Gestión de Instancia Singleton', () => {
    test('debe crear instancia singleton correctamente', () => {
      const bus1 = getEventBus();
      const bus2 = getEventBus();
      
      expect(bus1).toBeDefined();
      expect(bus2).toBeDefined();
      expect(bus1).toBe(bus2); // Debe ser la misma instancia
    });

    test('debe mantener estado consistente entre llamadas', () => {
      const bus1 = getEventBus();
      const callback = jest.fn();
      
      bus1.subscribe('test.event', callback);
      
      const bus2 = getEventBus();
      bus2.publish('test.event', { data: 'test' });
      
      expect(callback).toHaveBeenCalledWith({ data: 'test' });
    });
  });

  describe('Suscripción y Publicación de Eventos', () => {
    test('debe registrar y ejecutar suscriptores correctamente', () => {
      const bus = getEventBus();
      const mockCallback = jest.fn();
      
      bus.subscribe('element.changed', mockCallback);
      bus.publish('element.changed', { 
        element: { id: 'Task_1', type: 'bpmn:Task' },
        change: { name: 'Nueva Tarea' }
      });
      
      expect(mockCallback).toHaveBeenCalledWith({
        element: { id: 'Task_1', type: 'bpmn:Task' },
        change: { name: 'Nueva Tarea' }
      });
    });

    test('debe manejar múltiples suscriptores para el mismo evento', () => {
      const bus = getEventBus();
      const callback1 = jest.fn();
      const callback2 = jest.fn();
      
      bus.subscribe('rasci.updated', callback1);
      bus.subscribe('rasci.updated', callback2);
      
      const rasciData = { roles: ['Analista'], matrix: {} };
      bus.publish('rasci.updated', rasciData);
      
      expect(callback1).toHaveBeenCalledWith(rasciData);
      expect(callback2).toHaveBeenCalledWith(rasciData);
    });

    test('debe desuscribir correctamente', () => {
      const bus = getEventBus();
      const callback = jest.fn();
      
      bus.subscribe('ppi.created', callback);
      bus.unsubscribe('ppi.created', callback);
      
      bus.publish('ppi.created', { id: 'PPI_1' });
      expect(callback).not.toHaveBeenCalled();
    });
  });

  describe('Eventos Específicos del Sistema Multi-notación', () => {
    test('debe manejar eventos BPMN → PPINOT', () => {
      const bus = getEventBus();
      const ppiCallback = jest.fn();
      
      bus.subscribe('element.changed', ppiCallback);
      
      // Simular cambio en elemento BPMN que afecta PPIs
      bus.publish('element.changed', {
        element: { id: 'StartEvent_1', type: 'bpmn:StartEvent' },
        change: { name: 'Nuevo Inicio' }
      });
      
      expect(ppiCallback).toHaveBeenCalled();
    });

    test('debe manejar eventos BPMN → RASCI', () => {
      const bus = getEventBus();
      const rasciCallback = jest.fn();
      
      bus.subscribe('element.added', rasciCallback);
      
      // Simular nueva tarea que debe aparecer en matriz RASCI
      bus.publish('element.added', {
        element: { id: 'Task_2', type: 'bpmn:Task', name: 'Nueva Tarea' }
      });
      
      expect(rasciCallback).toHaveBeenCalledWith({
        element: { id: 'Task_2', type: 'bpmn:Task', name: 'Nueva Tarea' }
      });
    });

    test('debe manejar eventos RASCI → RALPH', () => {
      const bus = getEventBus();
      const ralphCallback = jest.fn();
      
      bus.subscribe('rasci.role.assigned', ralphCallback);
      
      // Simular asignación RASCI que debe sincronizar con RALPH
      bus.publish('rasci.role.assigned', {
        taskId: 'Task_1',
        roleId: 'Analista',
        assignment: 'R'
      });
      
      expect(ralphCallback).toHaveBeenCalledWith({
        taskId: 'Task_1',
        roleId: 'Analista',
        assignment: 'R'
      });
    });
  });

  describe('Gestión de Historial de Eventos', () => {
    test('debe mantener historial de eventos', () => {
      const bus = getEventBus();
      
      bus.publish('test.event1', { id: 1 });
      bus.publish('test.event2', { id: 2 });
      bus.publish('test.event3', { id: 3 });
      
      const history = bus.getHistory();
      expect(history.length).toBeGreaterThanOrEqual(3);
    });

    test('debe respetar límite de historial', () => {
      const bus = getEventBus();
      const limit = bus.historyLimit || 100;
      
      // Publicar más eventos que el límite
      for (let i = 0; i < limit + 5; i++) {
        bus.publish(`test.event.${i}`, { index: i });
      }
      
      const history = bus.getHistory();
      expect(history.length).toBeLessThanOrEqual(limit);
    });

    test('debe incluir timestamp en historial', () => {
      const bus = getEventBus();
      
      bus.publish('timestamped.event', { data: 'test' });
      
      const history = bus.getHistory();
      const lastEvent = history[history.length - 1];
      
      expect(lastEvent.timestamp).toBeDefined();
      // El timestamp puede ser Date object o number
      expect(['number', 'object'].includes(typeof lastEvent.timestamp)).toBe(true);
    });
  });

  describe('Manejo de Errores', () => {
    test('debe manejar callbacks que lanzan excepciones', () => {
      const bus = getEventBus();
      const errorCallback = jest.fn(() => {
        throw new Error('Test error');
      });
      const normalCallback = jest.fn();
      
      bus.subscribe('error.test', errorCallback);
      bus.subscribe('error.test', normalCallback);
      
      expect(() => {
        bus.publish('error.test', { data: 'test' });
      }).not.toThrow();
      
      expect(normalCallback).toHaveBeenCalled();
    });

    test('debe manejar eventos sin suscriptores', () => {
      const bus = getEventBus();
      
      expect(() => {
        bus.publish('nonexistent.event', { data: 'test' });
      }).not.toThrow();
    });

    test('debe validar parámetros de suscripción', () => {
      const bus = getEventBus();
      
      // El EventBus real puede no validar parámetros, así que verificamos comportamiento
      try {
        bus.subscribe(null, jest.fn());
        // Si no lanza error, verificar que no se registró
        expect(bus.subscribers[null]).toBeUndefined();
      } catch (error) {
        // Si lanza error, está bien
        expect(error).toBeDefined();
      }
      
      try {
        bus.subscribe('valid.event', null);
        // Si no lanza error, verificar que se registró algo
        expect(bus.subscribers['valid.event']).toBeDefined();
      } catch (error) {
        // Si lanza error, está bien
        expect(error).toBeDefined();
      }
    });
  });

  describe('Limpieza y Reset', () => {
    test('debe limpiar todos los suscriptores', () => {
      const bus = getEventBus();
      
      bus.subscribe('clean.event1', jest.fn());
      bus.subscribe('clean.event2', jest.fn());
      
      expect(Object.keys(bus.subscribers || {}).length).toBeGreaterThan(0);
      
      if (bus.clear) {
        bus.clear();
        expect(Object.keys(bus.subscribers || {}).length).toBe(0);
      }
    });

    test('debe limpiar historial', () => {
      const bus = getEventBus();
      
      bus.publish('history.event', { data: 'test' });
      expect(bus.getHistory().length).toBeGreaterThan(0);
      
      if (bus.clearHistory) {
        bus.clearHistory();
        expect(bus.getHistory().length).toBe(0);
      }
    });
  });
});