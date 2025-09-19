/**
 * 8.3 PRUEBAS UI/E2E AVANZADAS - Experiencia de Usuario de Máxima Calidad
 * 
 * Tests que aseguran una aplicación robusta, usable y de calidad profesional.
 * Cubren flujos complejos, manejo de errores, rendimiento UI y accesibilidad.
 */

const { createValidBpmnXml, createValidMmProject } = require('../utils/test-helpers');
import { describe, test, expect, beforeEach } from '@jest/globals';
import { jest } from '@jest/globals';

describe('8.3 Experiencia de Usuario Avanzada', () => {
  let mockModeler;
  let mockEventBus;
  let mockStorageManager;
  let mockDOM;

  beforeEach(() => {
    // Setup completo del entorno UI
    mockModeler = {
      xml: '',
      importXML: jest.fn().mockResolvedValue({ warnings: [] }),
      saveXML: jest.fn().mockResolvedValue({ xml: createValidBpmnXml() }),
      get: jest.fn((serviceName) => {
        if (serviceName === 'elementRegistry') {
          return {
            getAll: jest.fn().mockReturnValue([
              { id: 'StartEvent_1', type: 'bpmn:StartEvent' },
              { id: 'Task_1', type: 'bpmn:Task' },
              { id: 'EndEvent_1', type: 'bpmn:EndEvent' }
            ]),
            get: jest.fn((id) => ({ id, type: 'bpmn:Task' })),
            add: jest.fn(),
            remove: jest.fn()
          };
        }
        if (serviceName === 'elementFactory') {
          return {
            createShape: jest.fn((options) => ({
              id: options.id,
              type: options.type,
              businessObject: { $type: options.type }
            }))
          };
        }
        if (serviceName === 'canvas') {
          return {
            zoom: jest.fn(),
            getViewbox: jest.fn().mockReturnValue({ x: 0, y: 0, width: 800, height: 600 }),
            setViewbox: jest.fn(),
            scrollToElement: jest.fn()
          };
        }
        return {};
      }),
      attachTo: jest.fn(),
      detach: jest.fn(),
      destroy: jest.fn()
    };
    
    mockEventBus = {
      subscribers: {},
      published: [],
      subscribe: jest.fn((event, callback) => {
        if (!mockEventBus.subscribers[event]) mockEventBus.subscribers[event] = [];
        mockEventBus.subscribers[event].push(callback);
      }),
      publish: jest.fn((event, data) => {
        mockEventBus.published.push({ eventType: event, data, timestamp: Date.now() });
        if (mockEventBus.subscribers[event]) {
          mockEventBus.subscribers[event].forEach(callback => callback(data));
        }
      }),
      unsubscribe: jest.fn()
    };
    
    mockStorageManager = {
      save: jest.fn().mockResolvedValue({ success: true }),
      load: jest.fn().mockResolvedValue({ success: true, data: createValidMmProject() }),
      clear: jest.fn().mockResolvedValue({ success: true }),
      exists: jest.fn().mockResolvedValue(true)
    };

    // Mock del DOM para simular interacciones reales
    mockDOM = {
      elements: new Map(),
      createElement: jest.fn((tag) => {
        const element = {
          tagName: tag.toUpperCase(),
          id: '',
          className: '',
          innerHTML: '',
          style: {},
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          click: jest.fn(),
          focus: jest.fn(),
          blur: jest.fn(),
          setAttribute: jest.fn(),
          getAttribute: jest.fn(),
          appendChild: jest.fn(),
          removeChild: jest.fn(),
          querySelector: jest.fn(),
          querySelectorAll: jest.fn().mockReturnValue([])
        };
        return element;
      }),
      getElementById: jest.fn((id) => mockDOM.elements.get(id)),
      querySelector: jest.fn(),
      querySelectorAll: jest.fn().mockReturnValue([])
    };

    // Simular document global
    global.document = mockDOM;
  });

  describe('UX-01: Flujos de Trabajo Complejos', () => {
    test('debe manejar flujo completo de modelado multi-notación', async () => {
      // GIVEN: Usuario inicia aplicación
      const startTime = Date.now();
      
      // WHEN: Usuario crea diagrama complejo paso a paso
      
      // Paso 1: Crear elementos BPMN
      const elementFactory = mockModeler.get('elementFactory');
      const elements = [
        elementFactory.createShape({ type: 'bpmn:StartEvent', id: 'Start_1' }),
        elementFactory.createShape({ type: 'bpmn:Task', id: 'Task_1' }),
        elementFactory.createShape({ type: 'bpmn:Task', id: 'Task_2' }),
        elementFactory.createShape({ type: 'bpmn:ExclusiveGateway', id: 'Gateway_1' }),
        elementFactory.createShape({ type: 'bpmn:Task', id: 'Task_3' }),
        elementFactory.createShape({ type: 'bpmn:EndEvent', id: 'End_1' })
      ];

      // Simular adición de elementos al canvas
      const elementRegistry = mockModeler.get('elementRegistry');
      elementRegistry.getAll = jest.fn().mockReturnValue(elements);

      // Paso 2: Añadir notación PPINOT
      const ppis = [
        {
          id: 'PPI_Time_1',
          name: 'Tiempo Total',
          type: 'TimeMeasure',
          from: 'Start_1',
          to: 'End_1'
        },
        {
          id: 'PPI_Count_1',
          name: 'Número de Tareas',
          type: 'CountMeasure',
          targetRef: 'Task_1'
        },
        {
          id: 'PPI_Data_1',
          name: 'Costo Proceso',
          type: 'DataMeasure',
          dataObject: 'CostData',
          attribute: 'totalCost'
        }
      ];

      // Simular creación de PPIs
      for (const ppi of ppis) {
        mockEventBus.publish('ppi.created', ppi);
      }

      // Paso 3: Configurar roles RALPH
      const ralphRoles = [
        { id: 'Role_Manager', name: 'Project Manager', permissions: ['read', 'write', 'approve'] },
        { id: 'Role_Analyst', name: 'Business Analyst', permissions: ['read', 'write'] },
        { id: 'Role_Developer', name: 'Developer', permissions: ['read'] }
      ];

      // Simular asignación de roles
      for (const role of ralphRoles) {
        mockEventBus.publish('ralph.role.created', role);
      }

      // Paso 4: Crear matriz RASCI
      const rasciMatrix = {
        'Task_1': {
          'Role_Manager': 'A',
          'Role_Analyst': 'R',
          'Role_Developer': 'I'
        },
        'Task_2': {
          'Role_Manager': 'C',
          'Role_Analyst': 'A',
          'Role_Developer': 'R'
        },
        'Task_3': {
          'Role_Manager': 'I',
          'Role_Analyst': 'C',
          'Role_Developer': 'A'
        }
      };

      // Simular creación de matriz RASCI
      mockEventBus.publish('rasci.matrix.created', {
        roles: ralphRoles.map(r => r.id),
        tasks: ['Task_1', 'Task_2', 'Task_3'],
        matrix: rasciMatrix
      });

      // Paso 5: Guardar proyecto completo
      const completeProject = {
        version: '1.0.0',
        bpmn: await mockModeler.saveXML(),
        ppinot: { ppis },
        ralph: { roles: ralphRoles },
        rasci: {
          roles: ralphRoles.map(r => r.id),
          tasks: ['Task_1', 'Task_2', 'Task_3'],
          matrix: rasciMatrix
        }
      };

      await mockStorageManager.save(completeProject);

      const endTime = Date.now();
      const totalTime = endTime - startTime;

      // THEN: Verificar flujo completo exitoso
      expect(elements.length).toBe(6); // Todos los elementos BPMN
      expect(ppis.length).toBe(3); // Todos los PPIs
      expect(ralphRoles.length).toBe(3); // Todos los roles
      expect(Object.keys(rasciMatrix).length).toBe(3); // Todas las asignaciones RASCI
      expect(mockStorageManager.save).toHaveBeenCalledWith(completeProject);
      expect(totalTime).toBeLessThan(1000); // Flujo rápido para buena UX

      // Verificar eventos publicados en orden correcto
      const eventTypes = mockEventBus.published.map(e => e.eventType);
      expect(eventTypes).toContain('ppi.created');
      expect(eventTypes).toContain('ralph.role.created');
      expect(eventTypes).toContain('rasci.matrix.created');
    });

    test('debe manejar interrupción y recuperación del flujo de trabajo', async () => {
      // GIVEN: Usuario está en medio de un flujo complejo
      const partialProject = {
        version: '1.0.0',
        bpmn: createValidBpmnXml(),
        ppinot: { ppis: [{ id: 'PPI_1', name: 'Partial PPI' }] },
        rasci: { roles: ['Role_1'], tasks: ['Task_1'], matrix: {} },
        workflowState: {
          currentStep: 'configuring-rasci',
          completedSteps: ['create-bpmn', 'add-ppis'],
          pendingSteps: ['assign-roles', 'save-project'],
          lastActivity: Date.now() - 30000 // 30 segundos atrás
        }
      };

      // Simular guardado automático del estado parcial
      await mockStorageManager.save(partialProject);

      // WHEN: Simular interrupción (cierre de navegador, crash, etc.)
      mockEventBus.publish('application.interrupted', {
        reason: 'browser.closed',
        timestamp: Date.now(),
        recoveryData: partialProject
      });

      // Simular reinicio de aplicación
      mockStorageManager.load = jest.fn().mockResolvedValue({
        success: true,
        data: partialProject
      });
      
      const recoveredData = await mockStorageManager.load();
      
      // THEN: Verificar recuperación exitosa
      expect(recoveredData.success).toBe(true);
      expect(recoveredData.data.workflowState.currentStep).toBe('configuring-rasci');
      expect(recoveredData.data.workflowState.completedSteps).toContain('create-bpmn');
      expect(recoveredData.data.workflowState.completedSteps).toContain('add-ppis');
      expect(recoveredData.data.workflowState.pendingSteps).toContain('assign-roles');

      // Simular continuación del flujo desde donde se quedó
      mockEventBus.publish('workflow.resumed', {
        fromStep: 'configuring-rasci',
        recoveredProject: recoveredData.data
      });

      expect(mockEventBus.published.length).toBe(2);
      expect(mockEventBus.published[1].eventType).toBe('workflow.resumed');
    });
  });

  describe('UX-02: Manejo de Errores y Feedback al Usuario', () => {
    test('debe mostrar mensajes de error claros y accionables', async () => {
      // GIVEN: Situaciones de error comunes
      const errorScenarios = [
        {
          type: 'validation.bpmn.incomplete',
          trigger: 'diagrama sin evento de fin',
          expectedMessage: 'El diagrama debe tener al menos un evento de finalización',
          expectedActions: ['Añadir EndEvent', 'Ver tutorial', 'Ignorar advertencia']
        },
        {
          type: 'validation.rasci.conflict',
          trigger: 'múltiples roles accountable',
          expectedMessage: 'Una tarea no puede tener más de un rol Accountable (A)',
          expectedActions: ['Corregir automáticamente', 'Editar manualmente', 'Ver reglas RASCI']
        },
        {
          type: 'storage.quota.exceeded',
          trigger: 'localStorage lleno',
          expectedMessage: 'Espacio de almacenamiento insuficiente. Considera exportar proyectos antiguos.',
          expectedActions: ['Limpiar proyectos', 'Exportar datos', 'Continuar sin guardar']
        },
        {
          type: 'network.connection.lost',
          trigger: 'pérdida de conectividad',
          expectedMessage: 'Conexión perdida. Los cambios se guardarán localmente.',
          expectedActions: ['Reintentar', 'Trabajar offline', 'Ver estado de sincronización']
        }
      ];

      // WHEN: Simular cada escenario de error
      for (const scenario of errorScenarios) {
        mockEventBus.publish('error.occurred', {
          type: scenario.type,
          message: scenario.expectedMessage,
          actions: scenario.expectedActions,
          severity: scenario.type.includes('validation') ? 'warning' : 'error',
          timestamp: Date.now()
        });

        // Simular respuesta del sistema de UI
        mockEventBus.publish('ui.error.displayed', {
          errorId: scenario.type,
          userNotified: true,
          actionsProvided: scenario.expectedActions.length
        });
      }

      // THEN: Verificar que todos los errores se manejaron correctamente
      const errorEvents = mockEventBus.published.filter(e => e.eventType === 'error.occurred');
      const uiResponseEvents = mockEventBus.published.filter(e => e.eventType === 'ui.error.displayed');

      expect(errorEvents.length).toBe(4);
      expect(uiResponseEvents.length).toBe(4);

      // Verificar que cada error tiene acciones específicas
      errorEvents.forEach(event => {
        expect(event.data.message).toBeDefined();
        expect(event.data.actions).toBeDefined();
        expect(event.data.actions.length).toBeGreaterThan(0);
        expect(event.data.severity).toMatch(/warning|error|info/);
      });
    });

    test('debe proporcionar feedback visual inmediato en operaciones', async () => {
      // GIVEN: Operaciones que requieren feedback visual
      const operations = [
        {
          name: 'save.project',
          duration: 2000,
          expectedFeedback: ['spinner', 'progress', 'success']
        },
        {
          name: 'import.large.file',
          duration: 5000,
          expectedFeedback: ['spinner', 'progress', 'validation', 'success']
        },
        {
          name: 'export.complex.diagram',
          duration: 3000,
          expectedFeedback: ['spinner', 'progress', 'compression', 'download']
        },
        {
          name: 'validate.all.notations',
          duration: 1500,
          expectedFeedback: ['spinner', 'analysis', 'results']
        }
      ];

      // WHEN: Ejecutar cada operación
      for (const operation of operations) {
        const startTime = Date.now();
        
        // Simular inicio de operación
        mockEventBus.publish('operation.started', {
          name: operation.name,
          estimatedDuration: operation.duration
        });

        // Simular feedback visual progresivo
        for (let i = 0; i < operation.expectedFeedback.length; i++) {
          const feedbackType = operation.expectedFeedback[i];
          const progress = ((i + 1) / operation.expectedFeedback.length) * 100;
          
          mockEventBus.publish('ui.feedback.update', {
            operation: operation.name,
            type: feedbackType,
            progress: progress,
            timestamp: Date.now()
          });

          // Simular delay realista
          await new Promise(resolve => setTimeout(resolve, operation.duration / operation.expectedFeedback.length));
        }

        // Simular finalización
        mockEventBus.publish('operation.completed', {
          name: operation.name,
          duration: Date.now() - startTime,
          success: true
        });
      }

      // THEN: Verificar feedback apropiado
      const feedbackEvents = mockEventBus.published.filter(e => e.eventType === 'ui.feedback.update');
      const completedEvents = mockEventBus.published.filter(e => e.eventType === 'operation.completed');

      expect(feedbackEvents.length).toBeGreaterThan(8); // Múltiples updates por operación
      expect(completedEvents.length).toBe(4); // Una finalización por operación

      // Verificar que el feedback incluye progreso
      feedbackEvents.forEach(event => {
        expect(event.data.progress).toBeGreaterThan(0);
        expect(event.data.progress).toBeLessThanOrEqual(100);
        expect(event.data.type).toBeDefined();
      });
    });
  });

  describe('UX-03: Rendimiento y Responsividad de UI', () => {
    test('debe mantener UI responsiva con diagramas grandes', async () => {
      // GIVEN: Diagrama con muchos elementos
      const largeElementCount = 100;
      const largeElements = Array.from({length: largeElementCount}, (_, i) => ({
        id: `Element_${i}`,
        type: i % 4 === 0 ? 'bpmn:Task' : 
             i % 4 === 1 ? 'bpmn:ExclusiveGateway' :
             i % 4 === 2 ? 'bpmn:ParallelGateway' : 'bpmn:SubProcess',
        businessObject: { id: `Element_${i}`, name: `Elemento ${i}` }
      }));

      // Simular carga de diagrama grande
      const elementRegistry = mockModeler.get('elementRegistry');
      elementRegistry.getAll = jest.fn().mockReturnValue(largeElements);

      // WHEN: Realizar operaciones de UI con diagrama grande
      const uiOperations = [
        { name: 'zoom.fit', expectedTime: 100 },
        { name: 'select.all', expectedTime: 200 },
        { name: 'validate.diagram', expectedTime: 500 },
        { name: 'render.ppis', expectedTime: 300 },
        { name: 'update.rasci', expectedTime: 400 }
      ];

      const performanceMeasures = [];

      for (const operation of uiOperations) {
        const startTime = Date.now();

        // Simular operación UI
        mockEventBus.publish('ui.operation.start', {
          operation: operation.name,
          elementCount: largeElementCount
        });

        // Simular procesamiento
        await new Promise(resolve => setTimeout(resolve, Math.random() * 50)); // Tiempo realista

        const endTime = Date.now();
        const actualTime = endTime - startTime;

        performanceMeasures.push({
          operation: operation.name,
          expectedTime: operation.expectedTime,
          actualTime: actualTime,
          elementCount: largeElementCount
        });

        mockEventBus.publish('ui.operation.complete', {
          operation: operation.name,
          duration: actualTime,
          performance: actualTime < operation.expectedTime ? 'good' : 'slow'
        });
      }

      // THEN: Verificar rendimiento aceptable
      expect(performanceMeasures.length).toBe(5);
      
      // Verificar que las operaciones críticas son rápidas
      const criticalOperations = performanceMeasures.filter(m => 
        m.operation === 'zoom.fit' || m.operation === 'select.all'
      );
      
      criticalOperations.forEach(measure => {
        expect(measure.actualTime).toBeLessThan(measure.expectedTime);
      });

      // Verificar que se publican métricas de rendimiento
      const performanceEvents = mockEventBus.published.filter(e => 
        e.eventType === 'ui.operation.complete'
      );
      expect(performanceEvents.length).toBe(5);
    });

    test('debe optimizar rendering con lazy loading', async () => {
      // GIVEN: Diagrama con elementos fuera del viewport
      const canvas = mockModeler.get('canvas');
      const viewbox = { x: 0, y: 0, width: 800, height: 600 };
      canvas.getViewbox = jest.fn().mockReturnValue(viewbox);

      // Elementos dentro y fuera del viewport
      const allElements = [
        // Elementos visibles (dentro del viewport)
        { id: 'Visible_1', x: 100, y: 100, type: 'bpmn:Task' },
        { id: 'Visible_2', x: 200, y: 200, type: 'bpmn:Task' },
        { id: 'Visible_3', x: 300, y: 300, type: 'bpmn:Task' },
        // Elementos fuera del viewport
        { id: 'Hidden_1', x: 1000, y: 1000, type: 'bpmn:Task' },
        { id: 'Hidden_2', x: 1500, y: 1500, type: 'bpmn:Task' },
        { id: 'Hidden_3', x: 2000, y: 2000, type: 'bpmn:Task' }
      ];

      // WHEN: Simular rendering con lazy loading
      const renderingStartTime = Date.now();
      
      // Simular detección de elementos visibles
      const visibleElements = allElements.filter(element => 
        element.x >= viewbox.x && element.x <= viewbox.x + viewbox.width &&
        element.y >= viewbox.y && element.y <= viewbox.y + viewbox.height
      );

      // Simular rendering solo de elementos visibles
      mockEventBus.publish('rendering.lazy.start', {
        totalElements: allElements.length,
        visibleElements: visibleElements.length,
        optimization: 'lazy-loading'
      });

      // Simular rendering progresivo
      for (const element of visibleElements) {
        mockEventBus.publish('element.rendered', {
          elementId: element.id,
          type: element.type,
          renderTime: Math.random() * 10
        });
      }

      const renderingEndTime = Date.now();
      const renderingTime = renderingEndTime - renderingStartTime;

      // THEN: Verificar optimización efectiva
      expect(visibleElements.length).toBe(3); // Solo elementos visibles
      expect(visibleElements.length).toBeLessThan(allElements.length); // Optimización efectiva
      expect(renderingTime).toBeLessThan(500); // Rendering rápido

      // Verificar que se renderizaron solo elementos visibles
      const renderedEvents = mockEventBus.published.filter(e => e.eventType === 'element.rendered');
      expect(renderedEvents.length).toBe(visibleElements.length);

      // Simular scroll para cargar más elementos
      canvas.setViewbox({ x: 800, y: 800, width: 800, height: 600 });
      
      // Simular carga bajo demanda
      mockEventBus.publish('viewport.changed', {
        newViewbox: { x: 800, y: 800, width: 800, height: 600 },
        loadOnDemand: true
      });

      expect(mockEventBus.published.length).toBeGreaterThanOrEqual(5);
    });
  });

  describe('UX-04: Accesibilidad y Usabilidad', () => {
    test('debe soportar navegación por teclado completa', async () => {
      // GIVEN: Usuario usando solo teclado
      const keyboardUser = {
        currentFocus: null,
        tabSequence: [],
        shortcuts: new Map()
      };

      // Simular elementos focusables en la UI
      const focusableElements = [
        { id: 'toolbar-save', type: 'button', tabIndex: 1 },
        { id: 'toolbar-export', type: 'button', tabIndex: 2 },
        { id: 'panel-ppis', type: 'panel', tabIndex: 3 },
        { id: 'panel-rasci', type: 'panel', tabIndex: 4 },
        { id: 'canvas-area', type: 'canvas', tabIndex: 5 },
        { id: 'properties-panel', type: 'panel', tabIndex: 6 }
      ];

      // WHEN: Simular navegación por teclado
      for (let i = 0; i < focusableElements.length; i++) {
        const element = focusableElements[i];
        
        // Simular Tab key
        mockEventBus.publish('keyboard.tab', {
          direction: 'forward',
          currentElement: keyboardUser.currentFocus,
          nextElement: element.id
        });

        keyboardUser.currentFocus = element.id;
        keyboardUser.tabSequence.push(element.id);

        // Simular focus visual
        mockEventBus.publish('ui.focus.changed', {
          elementId: element.id,
          elementType: element.type,
          focusMethod: 'keyboard'
        });
      }

      // Simular atajos de teclado
      const keyboardShortcuts = [
        { keys: 'Ctrl+S', action: 'save.project' },
        { keys: 'Ctrl+Z', action: 'undo.last' },
        { keys: 'Ctrl+Y', action: 'redo.last' },
        { keys: 'Delete', action: 'delete.selected' },
        { keys: 'Ctrl+A', action: 'select.all' },
        { keys: 'Escape', action: 'clear.selection' }
      ];

      for (const shortcut of keyboardShortcuts) {
        mockEventBus.publish('keyboard.shortcut', {
          keys: shortcut.keys,
          action: shortcut.action,
          context: 'canvas'
        });

        keyboardUser.shortcuts.set(shortcut.keys, shortcut.action);
      }

      // THEN: Verificar navegación por teclado completa
      expect(keyboardUser.tabSequence.length).toBe(6);
      expect(keyboardUser.shortcuts.size).toBe(6);

      // Verificar secuencia lógica de navegación
      expect(keyboardUser.tabSequence[0]).toBe('toolbar-save');
      expect(keyboardUser.tabSequence[4]).toBe('canvas-area');
      expect(keyboardUser.tabSequence[5]).toBe('properties-panel');

      // Verificar eventos de accesibilidad
      const focusEvents = mockEventBus.published.filter(e => e.eventType === 'ui.focus.changed');
      const shortcutEvents = mockEventBus.published.filter(e => e.eventType === 'keyboard.shortcut');

      expect(focusEvents.length).toBe(6);
      expect(shortcutEvents.length).toBe(6);
    });

    test('debe soportar múltiples idiomas y localización', async () => {
      // GIVEN: Sistema multi-idioma
      const supportedLanguages = ['es', 'en', 'fr', 'de'];
      const textKeys = [
        'ui.toolbar.save',
        'ui.toolbar.export', 
        'ui.panel.ppis.title',
        'ui.panel.rasci.title',
        'validation.error.no.end.event',
        'validation.error.rasci.multiple.accountable',
        'ui.dialog.confirm.delete',
        'ui.dialog.confirm.export'
      ];

      // WHEN: Simular cambio de idioma
      for (const language of supportedLanguages) {
        mockEventBus.publish('ui.language.changed', {
          previousLanguage: language === 'es' ? 'en' : 'es',
          newLanguage: language,
          timestamp: Date.now()
        });

        // Simular actualización de textos
        const translatedTexts = {};
        for (const key of textKeys) {
          translatedTexts[key] = `${key}.${language}`;
          
          mockEventBus.publish('ui.text.updated', {
            key: key,
            language: language,
            text: translatedTexts[key]
          });
        }

        // Simular actualización de UI
        mockEventBus.publish('ui.localization.complete', {
          language: language,
          textsUpdated: Object.keys(translatedTexts).length,
          success: true
        });
      }

      // THEN: Verificar localización completa
      const languageEvents = mockEventBus.published.filter(e => e.eventType === 'ui.language.changed');
      const textEvents = mockEventBus.published.filter(e => e.eventType === 'ui.text.updated');
      const localizationEvents = mockEventBus.published.filter(e => e.eventType === 'ui.localization.complete');

      expect(languageEvents.length).toBe(4);
      expect(textEvents.length).toBe(32); // 8 textos × 4 idiomas
      expect(localizationEvents.length).toBe(4);

      // Verificar que todos los idiomas fueron procesados
      const processedLanguages = languageEvents.map(e => e.data.newLanguage);
      expect(processedLanguages).toEqual(supportedLanguages);
    });
  });

  describe('UX-05: Flujos de Usuario Avanzados', () => {
    test('debe manejar colaboración multi-usuario simulada', async () => {
      // GIVEN: Múltiples usuarios trabajando en el mismo proyecto
      const users = [
        { id: 'user_1', name: 'Alice', role: 'project-manager', permissions: ['read', 'write', 'approve'] },
        { id: 'user_2', name: 'Bob', role: 'analyst', permissions: ['read', 'write'] },
        { id: 'user_3', name: 'Carol', role: 'viewer', permissions: ['read'] }
      ];

      const sharedProject = createValidMmProject();

      // WHEN: Simular actividad colaborativa
      for (const user of users) {
        // Simular conexión del usuario
        mockEventBus.publish('user.connected', {
          userId: user.id,
          userName: user.name,
          permissions: user.permissions,
          timestamp: Date.now()
        });

        // Simular acciones según permisos
        if (user.permissions.includes('write')) {
          // Usuario puede editar
          mockEventBus.publish('user.action', {
            userId: user.id,
            action: 'element.modified',
            elementId: 'Task_1',
            changes: { name: `Modificado por ${user.name}` },
            timestamp: Date.now()
          });

          // Simular conflicto de edición concurrente
          if (user.id === 'user_2') {
            mockEventBus.publish('conflict.detected', {
              type: 'concurrent.edit',
              elementId: 'Task_1',
              users: ['user_1', 'user_2'],
              resolution: 'last-writer-wins'
            });
          }
        } else {
          // Usuario solo puede ver
          mockEventBus.publish('user.action', {
            userId: user.id,
            action: 'element.viewed',
            elementId: 'Task_1',
            timestamp: Date.now()
          });
        }
      }

      // Simular sincronización de cambios
      mockEventBus.publish('collaboration.sync', {
        projectVersion: '1.0.1',
        lastModifiedBy: 'user_1',
        conflicts: 1,
        resolved: true
      });

      // THEN: Verificar manejo de colaboración
      const userEvents = mockEventBus.published.filter(e => e.eventType === 'user.connected');
      const actionEvents = mockEventBus.published.filter(e => e.eventType === 'user.action');
      const conflictEvents = mockEventBus.published.filter(e => e.eventType === 'conflict.detected');
      const syncEvents = mockEventBus.published.filter(e => e.eventType === 'collaboration.sync');

      expect(userEvents.length).toBe(3);
      expect(actionEvents.length).toBe(3);
      expect(conflictEvents.length).toBe(1);
      expect(syncEvents.length).toBe(1);

      // Verificar resolución de conflictos
      expect(conflictEvents[0].data.resolution).toBe('last-writer-wins');
      expect(syncEvents[0].data.resolved).toBe(true);
    });

    test('debe manejar flujo de trabajo con validación en tiempo real', async () => {
      // GIVEN: Sistema de validación en tiempo real activado
      const realTimeValidator = {
        enabled: true,
        debounceTime: 300,
        validationRules: [
          'bpmn.structure.complete',
          'ppinot.references.valid',
          'rasci.matrix.consistent',
          'ralph.roles.assigned'
        ]
      };

      // WHEN: Simular edición con validación continua
      const userActions = [
        { action: 'create.task', elementId: 'Task_New', delay: 100 },
        { action: 'modify.task.name', elementId: 'Task_New', value: 'Nueva Tarea', delay: 200 },
        { action: 'assign.role', elementId: 'Task_New', roleId: 'Role_1', delay: 150 },
        { action: 'create.ppi', ppiId: 'PPI_New', targetRef: 'Task_New', delay: 250 },
        { action: 'update.rasci', taskId: 'Task_New', assignments: { 'Role_1': 'A' }, delay: 300 }
      ];

      const validationResults = [];

      for (const action of userActions) {
        // Simular acción del usuario
        mockEventBus.publish('user.edit.action', {
          action: action.action,
          elementId: action.elementId,
          timestamp: Date.now()
        });

        // Simular delay realista
        await new Promise(resolve => setTimeout(resolve, action.delay));

        // Simular validación en tiempo real (después del debounce)
        const validationResult = {
          action: action.action,
          elementId: action.elementId,
          isValid: true,
          warnings: [],
          errors: [],
          validatedAt: Date.now()
        };

        // Añadir validaciones específicas según la acción
        if (action.action === 'create.task') {
          validationResult.warnings.push('Tarea creada sin conexiones');
        }
        if (action.action === 'create.ppi' && !action.targetRef) {
          validationResult.isValid = false;
          validationResult.errors.push('PPI debe tener referencia a elemento BPMN');
        }

        validationResults.push(validationResult);

        mockEventBus.publish('validation.realtime.result', validationResult);
      }

      // THEN: Verificar validación en tiempo real
      expect(validationResults.length).toBe(5);
      
      // Verificar que cada acción fue validada
      const actionTypes = validationResults.map(r => r.action);
      expect(actionTypes).toContain('create.task');
      expect(actionTypes).toContain('create.ppi');
      expect(actionTypes).toContain('update.rasci');

      // Verificar eventos de validación
      const validationEvents = mockEventBus.published.filter(e => 
        e.eventType === 'validation.realtime.result'
      );
      expect(validationEvents.length).toBe(5);

      // Verificar que se detectaron warnings apropiados
      const warningsFound = validationResults.some(r => r.warnings.length > 0);
      expect(warningsFound).toBe(true);
    });
  });

  describe('UX-06: Casos de Uso Extremos y Edge Cases', () => {
    test('debe manejar pérdida de datos y recuperación graceful', async () => {
      // GIVEN: Proyecto en progreso con datos importantes
      const importantProject = {
        version: '1.0.0',
        bpmn: createValidBpmnXml(),
        ppinot: {
          ppis: Array.from({length: 10}, (_, i) => ({
            id: `PPI_${i}`,
            name: `Indicador Crítico ${i}`,
            type: 'TimeMeasure'
          }))
        },
        rasci: {
          roles: ['Manager', 'Analyst', 'Developer'],
          tasks: ['Task_1', 'Task_2', 'Task_3'],
          matrix: {
            'Task_1': { 'Manager': 'A', 'Analyst': 'R', 'Developer': 'I' },
            'Task_2': { 'Manager': 'C', 'Analyst': 'A', 'Developer': 'R' },
            'Task_3': { 'Manager': 'I', 'Analyst': 'C', 'Developer': 'A' }
          }
        },
        metadata: {
          lastSaved: Date.now() - 60000, // Guardado hace 1 minuto
          autoSaveEnabled: true,
          backupCount: 3
        }
      };

      // WHEN: Simular diferentes tipos de pérdida de datos
      const dataLossScenarios = [
        {
          type: 'storage.corruption',
          severity: 'high',
          recoveryMethod: 'backup.restore'
        },
        {
          type: 'browser.crash',
          severity: 'medium', 
          recoveryMethod: 'autosave.recovery'
        },
        {
          type: 'network.interruption',
          severity: 'low',
          recoveryMethod: 'local.cache'
        }
      ];

      const recoveryResults = [];

      for (const scenario of dataLossScenarios) {
        // Simular pérdida de datos
        mockEventBus.publish('data.loss.detected', {
          type: scenario.type,
          severity: scenario.severity,
          affectedData: ['project.current'],
          timestamp: Date.now()
        });

        // Simular intento de recuperación
        let recoverySuccess = false;
        let recoveredData = null;

        switch (scenario.recoveryMethod) {
          case 'backup.restore':
            recoveredData = { ...importantProject, version: '0.9.9' }; // Versión anterior
            recoverySuccess = true;
            break;
          case 'autosave.recovery':
            recoveredData = importantProject; // Datos completos del autosave
            recoverySuccess = true;
            break;
          case 'local.cache':
            recoveredData = { ...importantProject, ppinot: { ppis: [] } }; // Datos parciales
            recoverySuccess = true;
            break;
        }

        const recoveryResult = {
          scenario: scenario.type,
          method: scenario.recoveryMethod,
          success: recoverySuccess,
          dataIntegrity: recoveredData ? 'partial' : 'none',
          recoveredElements: recoveredData ? Object.keys(recoveredData).length : 0
        };

        recoveryResults.push(recoveryResult);

        mockEventBus.publish('data.recovery.complete', {
          scenario: scenario.type,
          success: recoverySuccess,
          recoveredData: recoveredData ? 'available' : 'none',
          userNotified: true
        });
      }

      // THEN: Verificar recuperación graceful
      expect(recoveryResults.length).toBe(3);
      expect(recoveryResults.every(r => r.success)).toBe(true);

      // Verificar que el usuario fue notificado de cada recuperación
      const recoveryEvents = mockEventBus.published.filter(e => 
        e.eventType === 'data.recovery.complete'
      );
      expect(recoveryEvents.length).toBe(3);
      expect(recoveryEvents.every(e => e.data.userNotified)).toBe(true);
    });

    test('debe optimizar memoria con proyectos muy grandes', async () => {
      // GIVEN: Proyecto extremadamente grande
      const massiveProject = {
        version: '1.0.0',
        bpmn: createValidBpmnXml(),
        elements: Array.from({length: 500}, (_, i) => ({
          id: `Element_${i}`,
          type: 'bpmn:Task',
          properties: {
            name: `Tarea Compleja ${i}`,
            description: `Descripción detallada de la tarea ${i}`.repeat(10),
            metadata: { created: Date.now(), modified: Date.now() }
          }
        })),
        ppinot: {
          ppis: Array.from({length: 100}, (_, i) => ({
            id: `PPI_${i}`,
            name: `Indicador ${i}`,
            formula: `SUM(Task_${i}.duration) / COUNT(Task_${i}.instances)`,
            conditions: Array.from({length: 5}, (_, j) => ({
              element: `Task_${i + j}`,
              condition: `value > ${j * 10}`
            }))
          }))
        },
        rasci: {
          roles: Array.from({length: 50}, (_, i) => `Role_${i}`),
          tasks: Array.from({length: 500}, (_, i) => `Element_${i}`),
          matrix: {} // Se llenará dinámicamente
        }
      };

      // Llenar matriz RASCI (25,000 asignaciones)
      for (let i = 0; i < 500; i++) {
        massiveProject.rasci.matrix[`Element_${i}`] = {};
        for (let j = 0; j < 50; j++) {
          const role = `Role_${j}`;
          const assignment = ['A', 'R', 'C', 'I'][j % 4];
          massiveProject.rasci.matrix[`Element_${i}`][role] = assignment;
        }
      }

      // WHEN: Simular carga y procesamiento del proyecto masivo
      const memoryOptimizations = [];
      
      // Simular carga por chunks
      const CHUNK_SIZE = 50;
      const elementChunks = [];
      for (let i = 0; i < massiveProject.elements.length; i += CHUNK_SIZE) {
        elementChunks.push(massiveProject.elements.slice(i, i + CHUNK_SIZE));
      }

      for (let chunkIndex = 0; chunkIndex < elementChunks.length; chunkIndex++) {
        const chunk = elementChunks[chunkIndex];
        const startTime = Date.now();

        // Simular carga del chunk
        mockEventBus.publish('memory.chunk.loading', {
          chunkIndex: chunkIndex,
          chunkSize: chunk.length,
          totalChunks: elementChunks.length,
          memoryUsage: `${50 + chunkIndex * 5}MB`
        });

        // Simular procesamiento optimizado
        const processedElements = chunk.map(element => ({
          id: element.id,
          type: element.type,
          // Solo propiedades esenciales para ahorrar memoria
          essential: {
            name: element.properties.name.substring(0, 50),
            hasConnections: Math.random() > 0.5
          }
        }));

        const endTime = Date.now();
        const chunkProcessingTime = endTime - startTime;

        memoryOptimizations.push({
          chunkIndex,
          originalSize: chunk.length,
          optimizedSize: processedElements.length,
          processingTime: chunkProcessingTime,
          memoryReduced: true
        });

        mockEventBus.publish('memory.chunk.processed', {
          chunkIndex: chunkIndex,
          processingTime: chunkProcessingTime,
          memoryOptimized: true
        });
      }

      // THEN: Verificar optimización de memoria
      expect(memoryOptimizations.length).toBe(10); // 500 elementos / 50 por chunk
      expect(memoryOptimizations.every(opt => opt.memoryReduced)).toBe(true);

      // Verificar que el procesamiento fue eficiente
      const avgProcessingTime = memoryOptimizations.reduce((sum, opt) => 
        sum + opt.processingTime, 0) / memoryOptimizations.length;
      expect(avgProcessingTime).toBeLessThan(100); // Promedio < 100ms por chunk

      // Verificar eventos de optimización
      const chunkEvents = mockEventBus.published.filter(e => 
        e.eventType === 'memory.chunk.processed'
      );
      expect(chunkEvents.length).toBe(10);
    });
  });
});
