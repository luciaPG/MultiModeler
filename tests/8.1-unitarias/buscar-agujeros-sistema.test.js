/**
 * TESTS AGRESIVOS - Buscando Agujeros Reales en el Sistema
 * 
 * Estos tests intentan romper el sistema de todas las formas posibles
 * para encontrar problemas reales que otros tests no detectan.
 */

describe('🕳️ Tests Agresivos - Buscando Agujeros del Sistema', () => {
  let realEventBus, realServiceRegistry;

  beforeAll(async () => {
    // Importar código REAL
    const eventBusModule = await import('../../app/modules/ui/core/event-bus.js');
    const registryModule = await import('../../app/modules/ui/core/ServiceRegistry.js');
    
    realEventBus = eventBusModule.getEventBus();
    realServiceRegistry = new registryModule.ServiceRegistry();
  });

  describe('🔥 Tests de Sobrecarga - ¿Se Rompe el Sistema?', () => {
    test('debe manejar 1000 eventos publicados rápidamente', () => {
      const startTime = Date.now();
      let errorsFound = [];
      
      try {
        // Bombardear con 1000 eventos
        for (let i = 0; i < 1000; i++) {
          realEventBus.publish(`stress.test.${i}`, { 
            index: i, 
            data: `Evento número ${i}`,
            timestamp: Date.now()
          });
        }
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // ¿El sistema se mantiene rápido?
        if (duration > 5000) { // Más de 5 segundos es problemático
          errorsFound.push(`Sistema lento: ${duration}ms para 1000 eventos`);
        }
        
        // ¿El historial se mantiene manejable?
        const history = realEventBus.getHistory();
        if (history.length > 200) { // Debería limitar historial
          errorsFound.push(`Historial no se limita: ${history.length} eventos`);
        }
        
      } catch (error) {
        errorsFound.push(`Sistema se rompió: ${error.message}`);
      }
      
      // Si no hay errores, el sistema es robusto
      if (errorsFound.length === 0) {
        expect(true).toBe(true); // Sistema robusto
      } else {
        // ¡AGUJERO ENCONTRADO!
        console.log('🕳️ AGUJEROS ENCONTRADOS:', errorsFound);
        expect(errorsFound.length).toBe(0); // Esto fallará y mostrará los problemas
      }
    });

    test('debe manejar 100 servicios registrados simultáneamente', () => {
      const errorsFound = [];
      
      try {
        // Registrar muchos servicios
        for (let i = 0; i < 100; i++) {
          const service = {
            id: `service_${i}`,
            name: `TestService${i}`,
            data: new Array(1000).fill(`data_${i}`), // Datos grandes
            process: function() { return this.data.length; }
          };
          
          realServiceRegistry.register(`service_${i}`, service);
        }
        
        // ¿Todos se registraron correctamente?
        for (let i = 0; i < 100; i++) {
          const retrieved = realServiceRegistry.get(`service_${i}`);
          if (!retrieved) {
            errorsFound.push(`Servicio ${i} no se registró correctamente`);
          }
          if (!retrieved.process || retrieved.process() !== 1000) {
            errorsFound.push(`Servicio ${i} perdió funcionalidad`);
          }
        }
        
      } catch (error) {
        errorsFound.push(`Sistema se rompió con muchos servicios: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ AGUJEROS EN REGISTRO DE SERVICIOS:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe manejar callbacks que fallan constantemente', () => {
      const errorsFound = [];
      let systemStillWorking = true;
      
      try {
        // Suscribir callbacks que siempre fallan
        for (let i = 0; i < 50; i++) {
          realEventBus.subscribe(`failing.event.${i}`, () => {
            throw new Error(`Callback ${i} always fails`);
          });
        }
        
        // Publicar eventos que harán fallar todos los callbacks
        for (let i = 0; i < 50; i++) {
          try {
            realEventBus.publish(`failing.event.${i}`, { test: true });
          } catch (error) {
            errorsFound.push(`Sistema se rompió en evento ${i}: ${error.message}`);
            systemStillWorking = false;
            break;
          }
        }
        
        // ¿El sistema sigue funcionando después de tantos errores?
        try {
          realEventBus.publish('test.after.failures', { data: 'test' });
          let callbackExecuted = false;
          realEventBus.subscribe('test.after.failures.response', () => {
            callbackExecuted = true;
          });
          realEventBus.publish('test.after.failures.response', {});
          
          if (!callbackExecuted) {
            errorsFound.push('Sistema dejó de responder después de errores masivos');
          }
        } catch (error) {
          errorsFound.push(`Sistema completamente roto: ${error.message}`);
        }
        
      } catch (error) {
        errorsFound.push(`Error en setup de test de estrés: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ AGUJEROS EN MANEJO DE ERRORES:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });

  describe('💣 Tests de Datos Maliciosos - ¿Se Puede Romper?', () => {
    test('debe manejar datos extremadamente grandes', async () => {
      const errorsFound = [];
      
      try {
        // Crear proyecto con datos masivos
        const hugeProject = {
          version: '1.0.0',
          bpmn: '<bpmn:definitions>' + 'x'.repeat(100000) + '</bpmn:definitions>', // 100KB de XML
          ppinot: {
            ppis: Array.from({ length: 1000 }, (_, i) => ({
              id: `PPI_${i}`,
              targetRef: `Task_${i}`,
              type: 'TimeMeasure',
              data: new Array(1000).fill(`huge_data_${i}`)
            }))
          },
          rasci: {
            roles: Array.from({ length: 200 }, (_, i) => `Role_${i}`),
            matrix: Object.fromEntries(
              Array.from({ length: 500 }, (_, i) => [
                `Task_${i}`,
                Object.fromEntries(
                  Array.from({ length: 50 }, (_, j) => [`Role_${j}`, 'R'])
                )
              ])
            )
          }
        };
        
        // ¿El sistema puede manejar estos datos?
        const serialized = JSON.stringify(hugeProject);
        if (serialized.length > 10000000) { // Más de 10MB
          errorsFound.push(`Datos demasiado grandes: ${(serialized.length / 1000000).toFixed(1)}MB`);
        }
        
        // ¿Se puede parsear de vuelta?
        const parsed = JSON.parse(serialized);
        if (!parsed.version || !parsed.bpmn) {
          errorsFound.push('Datos se corrompieron en serialización');
        }
        
      } catch (error) {
        errorsFound.push(`Sistema no maneja datos grandes: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ AGUJEROS CON DATOS GRANDES:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe rechazar datos maliciosos de inyección', () => {
      const errorsFound = [];
      
      // Datos maliciosos comunes
      const maliciousInputs = [
        '<script>alert("XSS")</script>',
        '"; DROP TABLE users; --',
        '${process.env.SECRET_KEY}',
        '../../../etc/passwd',
        'javascript:alert(1)',
        '{{constructor.constructor("return process")().env}}',
        '<img src=x onerror=alert(1)>',
        'null\x00byte',
        '\u0000\u0001\u0002',
        '🕳️💣🔥' // Unicode extremo
      ];
      
      maliciousInputs.forEach((maliciousInput, index) => {
        try {
          // Intentar inyectar en diferentes partes del sistema
          const maliciousProject = {
            version: maliciousInput,
            bpmn: `<bpmn:definitions><bpmn:task name="${maliciousInput}"/></bpmn:definitions>`,
            ppinot: {
              ppis: [{ id: maliciousInput, targetRef: maliciousInput }]
            },
            rasci: {
              roles: [maliciousInput],
              matrix: { [maliciousInput]: { [maliciousInput]: 'A' } }
            }
          };
          
          // ¿El sistema valida correctamente?
          const serialized = JSON.stringify(maliciousProject);
          
          // Verificar que no se ejecutó código malicioso
          if (serialized.includes('<script>') || serialized.includes('javascript:')) {
            errorsFound.push(`Input malicioso ${index} no fue sanitizado`);
          }
          
        } catch (error) {
          // Si falla, podría ser bueno (rechaza datos maliciosos)
          // o malo (el sistema se rompe)
          if (error.message.includes('Maximum call stack') || 
              error.message.includes('out of memory')) {
            errorsFound.push(`Input malicioso ${index} causó crash: ${error.message}`);
          }
        }
      });
      
      if (errorsFound.length > 0) {
        console.log('🕳️ VULNERABILIDADES DE SEGURIDAD:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });

  describe('🔍 Tests de Casos Extremos - Límites del Sistema', () => {
    test('debe manejar referencias circulares infinitas', () => {
      const errorsFound = [];
      
      try {
        // Crear referencias circulares extremas
        const circularA = { name: 'A' };
        const circularB = { name: 'B' };
        const circularC = { name: 'C' };
        
        circularA.ref = circularB;
        circularB.ref = circularC;
        circularC.ref = circularA; // A → B → C → A (infinito)
        
        // Intentar serializar (debería fallar o manejar)
        let serializationFailed = false;
        try {
          JSON.stringify(circularA);
        } catch (error) {
          serializationFailed = true;
        }
        
        if (!serializationFailed) {
          errorsFound.push('Sistema no detecta referencias circulares');
        }
        
        // Intentar usar en servicios
        try {
          realServiceRegistry.register('circular', circularA);
          const retrieved = realServiceRegistry.get('circular');
          
          // ¿El sistema puede manejar esto sin crash?
          if (retrieved && retrieved.ref && retrieved.ref.ref && retrieved.ref.ref.ref) {
            // Si llega aquí sin error, verificar que no cause problemas
            const depth = 0;
            function checkDepth(obj, currentDepth = 0) {
              if (currentDepth > 100) return currentDepth; // Evitar infinito
              if (obj && obj.ref) {
                return checkDepth(obj.ref, currentDepth + 1);
              }
              return currentDepth;
            }
            
            const maxDepth = checkDepth(retrieved);
            if (maxDepth > 50) {
              errorsFound.push(`Referencias circulares demasiado profundas: ${maxDepth}`);
            }
          }
        } catch (error) {
          // Si falla aquí, podría ser bueno (detecta el problema)
          if (!error.message.includes('circular') && !error.message.includes('Converting circular')) {
            errorsFound.push(`Error inesperado con referencias circulares: ${error.message}`);
          }
        }
        
      } catch (error) {
        errorsFound.push(`Sistema no maneja referencias circulares: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS CON REFERENCIAS CIRCULARES:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe manejar memoria insuficiente simulada', () => {
      const errorsFound = [];
      
      try {
        // Simular condiciones de memoria baja
        const memoryHoggers = [];
        
        // Crear muchos objetos grandes
        for (let i = 0; i < 50; i++) {
          const bigObject = {
            id: i,
            data: new Array(10000).fill(`memory_hog_${i}`),
            nested: {
              moreData: new Array(5000).fill(`nested_${i}`),
              evenMore: new Array(5000).fill(`more_nested_${i}`)
            }
          };
          memoryHoggers.push(bigObject);
          
          // Registrar en el sistema
          realServiceRegistry.register(`memoryHog_${i}`, bigObject);
        }
        
        // ¿El sistema sigue funcionando?
        const testService = realServiceRegistry.get('memoryHog_25');
        if (!testService || !testService.data) {
          errorsFound.push('Sistema perdió datos bajo presión de memoria');
        }
        
        // ¿Puede crear nuevos servicios?
        realServiceRegistry.register('afterMemoryTest', { test: true });
        const afterTest = realServiceRegistry.get('afterMemoryTest');
        if (!afterTest) {
          errorsFound.push('Sistema no puede registrar servicios después de presión de memoria');
        }
        
        // Limpiar para no afectar otros tests
        memoryHoggers.length = 0;
        
      } catch (error) {
        if (error.message.includes('out of memory') || error.message.includes('Maximum call stack')) {
          errorsFound.push(`Sistema tiene límites de memoria: ${error.message}`);
        } else {
          errorsFound.push(`Error inesperado de memoria: ${error.message}`);
        }
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS DE MEMORIA:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe manejar concurrencia simulada', async () => {
      const errorsFound = [];
      const results = [];
      
      try {
        // Simular operaciones concurrentes
        const concurrentOperations = [];
        
        for (let i = 0; i < 20; i++) {
          const operation = new Promise((resolve) => {
            setTimeout(() => {
              try {
                // Operación 1: Registrar servicio
                realServiceRegistry.register(`concurrent_${i}`, { id: i });
                
                // Operación 2: Publicar evento
                realEventBus.publish(`concurrent.event.${i}`, { id: i });
                
                // Operación 3: Recuperar servicio
                const retrieved = realServiceRegistry.get(`concurrent_${i}`);
                
                resolve({
                  success: true,
                  serviceRegistered: !!retrieved,
                  serviceId: retrieved?.id
                });
              } catch (error) {
                resolve({
                  success: false,
                  error: error.message
                });
              }
            }, Math.random() * 100); // Timing aleatorio
          });
          
          concurrentOperations.push(operation);
        }
        
        // Esperar todas las operaciones
        const allResults = await Promise.all(concurrentOperations);
        
        // Analizar resultados
        const failures = allResults.filter(r => !r.success);
        const successes = allResults.filter(r => r.success);
        
        if (failures.length > 0) {
          errorsFound.push(`${failures.length} operaciones concurrentes fallaron`);
          failures.forEach(f => errorsFound.push(`Fallo: ${f.error}`));
        }
        
        if (successes.length < 15) { // Al menos 75% deben funcionar
          errorsFound.push(`Solo ${successes.length}/20 operaciones concurrentes exitosas`);
        }
        
      } catch (error) {
        errorsFound.push(`Sistema no maneja concurrencia: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS DE CONCURRENCIA:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });

  describe('🧨 Tests de Corrupción de Datos - ¿Qué Pasa si...?', () => {
    test('debe detectar cuando se corrompe el estado interno', () => {
      const errorsFound = [];
      
      try {
        // Corromper directamente el estado interno
        if (realEventBus.subscribers) {
          realEventBus.subscribers = 'corrupted string instead of object';
        }
        
        // ¿El sistema detecta la corrupción?
        let detectedCorruption = false;
        try {
          realEventBus.publish('test.corruption', { data: 'test' });
        } catch (error) {
          detectedCorruption = true;
        }
        
        if (!detectedCorruption) {
          errorsFound.push('Sistema no detecta corrupción de estado interno');
        }
        
      } catch (error) {
        // Si falla aquí, podría ser bueno (detecta corrupción)
        if (!error.message.includes('subscribers')) {
          errorsFound.push(`Error inesperado en test de corrupción: ${error.message}`);
        }
      }
      
      // Restaurar estado para otros tests
      if (typeof realEventBus.subscribers === 'string') {
        realEventBus.subscribers = {};
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS DE CORRUPCIÓN:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe manejar tipos de datos inesperados', () => {
      const errorsFound = [];
      
      // Tipos de datos extraños que podrían romper el sistema
      const weirdInputs = [
        undefined,
        null,
        NaN,
        Infinity,
        -Infinity,
        Symbol('test'),
        new Date(),
        new RegExp('.*'),
        new Error('test error'),
        function() { return 'function as data'; },
        new Promise(() => {}),
        new WeakMap(),
        new WeakSet()
      ];
      
      weirdInputs.forEach((input, index) => {
        try {
          // Intentar usar cada tipo extraño
          realServiceRegistry.register(`weird_${index}`, input);
          realEventBus.publish(`weird.event.${index}`, input);
          
          // ¿El sistema maneja estos tipos?
          const retrieved = realServiceRegistry.get(`weird_${index}`);
          if (retrieved !== input && typeof input !== 'function' && typeof input !== 'symbol') {
            errorsFound.push(`Tipo ${typeof input} no se maneja correctamente`);
          }
          
        } catch (error) {
          // Algunos errores son esperables
          if (!error.message.includes('JSON') && 
              !error.message.includes('serialize') &&
              !error.message.includes('convert')) {
            errorsFound.push(`Error inesperado con tipo ${typeof input}: ${error.message}`);
          }
        }
      });
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS CON TIPOS DE DATOS:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });

  describe('⚡ Tests de Condiciones de Carrera - Timing Issues', () => {
    test('debe manejar eventos publicados antes de suscriptores', () => {
      const errorsFound = [];
      
      try {
        // Publicar evento ANTES de suscribirse
        realEventBus.publish('early.event', { data: 'published first' });
        
        let eventReceived = false;
        realEventBus.subscribe('early.event', (data) => {
          eventReceived = true;
        });
        
        // Publicar el mismo evento después de suscribirse
        realEventBus.publish('early.event', { data: 'published second' });
        
        // ¿Se recibió solo el segundo evento?
        if (!eventReceived) {
          errorsFound.push('Sistema no maneja suscripciones tardías');
        }
        
        // ¿El historial contiene ambos eventos?
        const history = realEventBus.getHistory();
        const earlyEvents = history.filter(h => h.eventType === 'early.event');
        if (earlyEvents.length !== 2) {
          errorsFound.push(`Historial incorrecto: esperaba 2 eventos, encontró ${earlyEvents.length}`);
        }
        
      } catch (error) {
        errorsFound.push(`Error en test de timing: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS DE TIMING:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });

    test('debe manejar modificaciones durante iteración', () => {
      const errorsFound = [];
      
      try {
        // Configurar suscriptores que se modifican a sí mismos
        realEventBus.subscribe('self.modifying', () => {
          // Durante la ejecución, agregar más suscriptores
          realEventBus.subscribe('self.modifying', () => {
            console.log('Suscriptor agregado durante ejecución');
          });
        });
        
        realEventBus.subscribe('self.modifying', () => {
          // Durante la ejecución, intentar desuscribirse
          realEventBus.unsubscribe('self.modifying', () => {});
        });
        
        // Publicar evento que causará modificaciones durante iteración
        try {
          realEventBus.publish('self.modifying', { test: true });
        } catch (error) {
          errorsFound.push(`Sistema no maneja modificaciones durante iteración: ${error.message}`);
        }
        
      } catch (error) {
        errorsFound.push(`Error en test de auto-modificación: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS DE AUTO-MODIFICACIÓN:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });

  describe('🎯 Tests de Integración Extrema - ¿Funciona Todo Junto?', () => {
    test('debe manejar flujo completo bajo estrés', async () => {
      const errorsFound = [];
      const startTime = Date.now();
      
      try {
        // Flujo completo bajo estrés: 100 diagramas simultáneos
        for (let diagramId = 0; diagramId < 100; diagramId++) {
          // 1. Crear diagrama BPMN
          const bpmnElements = [`StartEvent_${diagramId}`, `Task_${diagramId}`, `EndEvent_${diagramId}`];
          
          // 2. Crear PPIs para cada elemento
          bpmnElements.forEach((elementId, index) => {
            realEventBus.publish('ppinot.ppi.created', {
              id: `PPI_${diagramId}_${index}`,
              targetRef: elementId,
              diagramId: diagramId
            });
          });
          
          // 3. Crear matriz RASCI
          realEventBus.publish('rasci.matrix.created', {
            diagramId: diagramId,
            matrix: {
              [`Task_${diagramId}`]: {
                [`Role_${diagramId}`]: 'A'
              }
            }
          });
          
          // 4. Validar consistencia
          realEventBus.publish('validation.requested', {
            diagramId: diagramId,
            type: 'full'
          });
        }
        
        const endTime = Date.now();
        const totalTime = endTime - startTime;
        
        // ¿El sistema se mantiene responsivo?
        if (totalTime > 10000) { // Más de 10 segundos es problemático
          errorsFound.push(`Sistema muy lento bajo estrés: ${totalTime}ms`);
        }
        
        // ¿El historial se mantiene manejable?
        const history = realEventBus.getHistory();
        if (history.length > 500) { // Debería limitar
          errorsFound.push(`Historial descontrolado bajo estrés: ${history.length} eventos`);
        }
        
        // ¿Los servicios siguen funcionando?
        realServiceRegistry.register('afterStress', { test: true });
        const afterStress = realServiceRegistry.get('afterStress');
        if (!afterStress) {
          errorsFound.push('ServiceRegistry dejó de funcionar después de estrés');
        }
        
      } catch (error) {
        errorsFound.push(`Sistema se rompió bajo estrés: ${error.message}`);
      }
      
      if (errorsFound.length > 0) {
        console.log('🕳️ PROBLEMAS BAJO ESTRÉS:', errorsFound);
        expect(errorsFound.length).toBe(0);
      }
    });
  });
});
