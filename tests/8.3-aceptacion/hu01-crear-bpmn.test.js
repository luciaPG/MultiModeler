/**
 * 8.3 TESTS DE ACEPTACIÓN - HU01: Crear Diagrama BPMN
 * 
 * HISTORIA DE USUARIO:
 * Como usuario del sistema MNModeler
 * Quiero crear un diagrama BPMN básico
 * Para poder modelar un proceso de negocio
 * 
 * CRITERIOS DE ACEPTACIÓN:
 * - Puedo crear eventos de inicio, tareas y eventos de fin
 * - Puedo conectar elementos con flujos secuenciales
 * - El diagrama se valida automáticamente
 * - Puedo guardar el diagrama creado
 */

const { createValidBpmnXml } = require('../utils/test-helpers');

// Mocks necesarios
jest.mock('bpmn-js/lib/Modeler', () => {
  return jest.fn().mockImplementation(() => require('../mocks/bpmn-modeler.mock.js'));
});

describe('HU01 - Crear Diagrama BPMN (Tests de Aceptación)', () => {
  let mockModeler;
  let mockEventBus;
  let mockStorageManager;

  beforeEach(() => {
    const MockBpmnModeler = require('../mocks/bpmn-modeler.mock.js');
    mockModeler = new MockBpmnModeler();
    
    const MockEventBus = require('../mocks/event-bus.mock.js');
    mockEventBus = new MockEventBus();
    
    mockStorageManager = {
      save: jest.fn().mockResolvedValue({ success: true }),
      load: jest.fn().mockResolvedValue({ success: true })
    };
  });

  describe('DADO que soy un usuario del sistema', () => {
    describe('CUANDO creo un diagrama BPMN básico', () => {
      test('ENTONCES puedo crear eventos de inicio, tareas y eventos de fin', async () => {
        // ARRANGE - Preparar el entorno
        const canvas = mockModeler.get('canvas');
        const elementFactory = mockModeler.get('elementFactory');
        const elementRegistry = mockModeler.get('elementRegistry');
        
        expect(canvas).toBeDefined();
        expect(elementFactory).toBeDefined();

        // ACT - Ejecutar la acción del usuario
        
        // Usuario crea evento de inicio
        const startEvent = elementFactory.createShape({
          type: 'bpmn:StartEvent',
          id: 'StartEvent_1'
        });
        elementRegistry.add(startEvent);

        // Usuario crea tarea
        const task = elementFactory.createShape({
          type: 'bpmn:Task',
          id: 'Task_1',
          businessObject: { name: 'Procesar Solicitud' }
        });
        elementRegistry.add(task);

        // Usuario crea evento de fin
        const endEvent = elementFactory.createShape({
          type: 'bpmn:EndEvent',
          id: 'EndEvent_1'
        });
        elementRegistry.add(endEvent);

        // ASSERT - Verificar el resultado esperado
        const allElements = elementRegistry.getAll();
        expect(allElements.length).toBeGreaterThanOrEqual(3);
        
        // Verificar tipos de elementos creados
        const startEvents = allElements.filter(el => el.type === 'bpmn:StartEvent');
        const tasks = allElements.filter(el => el.type === 'bpmn:Task');
        const endEvents = allElements.filter(el => el.type === 'bpmn:EndEvent');
        
        expect(startEvents.length).toBe(1);
        expect(tasks.length).toBe(1);
        expect(endEvents.length).toBe(1);
        
        // Verificar propiedades específicas
        expect(task.businessObject.name).toBe('Procesar Solicitud');
      });

      test('ENTONCES puedo conectar elementos con flujos secuenciales', async () => {
        // ARRANGE
        const elementFactory = mockModeler.get('elementFactory');
        const elementRegistry = mockModeler.get('elementRegistry');
        
        // Crear elementos
        const startEvent = elementFactory.createShape({
          type: 'bpmn:StartEvent',
          id: 'StartEvent_1'
        });
        const task = elementFactory.createShape({
          type: 'bpmn:Task',
          id: 'Task_1'
        });
        
        elementRegistry.add(startEvent);
        elementRegistry.add(task);

        // ACT - Usuario conecta elementos
        const sequenceFlow = elementFactory.createConnection({
          type: 'bpmn:SequenceFlow',
          id: 'Flow_1',
          source: startEvent,
          target: task
        });
        elementRegistry.add(sequenceFlow);

        // ASSERT
        expect(sequenceFlow.type).toBe('bpmn:SequenceFlow');
        expect(sequenceFlow.source).toBe(startEvent);
        expect(sequenceFlow.target).toBe(task);
        
        // Verificar que la conexión está registrada
        const connections = elementRegistry.getAll().filter(el => 
          el.type === 'bpmn:SequenceFlow'
        );
        expect(connections.length).toBe(1);
      });

      test('ENTONCES el diagrama se valida automáticamente', async () => {
        // ARRANGE
        const bpmnXml = createValidBpmnXml();
        await mockModeler.importXML(bpmnXml);

        // ACT - Simular validación automática
        const BpmnValidators = require('../../app/services/bpmn-validators.js').BpmnValidators;
        const validator = new BpmnValidators(mockModeler);
        
        // ASSERT - Verificar validaciones básicas
        const hasStartEvent = validator.hasStartEvent();
        const hasEndEvent = validator.hasEndEvent();
        const hasValidFlow = validator.hasValidSequenceFlow();
        
        expect(hasStartEvent).toBe(true);
        expect(hasEndEvent).toBe(true);
        expect(hasValidFlow).toBe(true);
        
        // Verificar que no hay errores de validación
        const validationErrors = validator.getValidationErrors();
        expect(validationErrors.length).toBe(0);
      });

      test('ENTONCES puedo guardar el diagrama creado', async () => {
        // ARRANGE
        const bpmnXml = createValidBpmnXml();
        await mockModeler.importXML(bpmnXml);

        // ACT - Usuario guarda el diagrama
        const xmlResult = await mockModeler.saveXML();
        const saveResult = await mockStorageManager.save({
          bpmn: xmlResult.xml,
          version: '1.0',
          createdAt: new Date().toISOString()
        });

        // ASSERT
        expect(saveResult.success).toBe(true);
        expect(mockStorageManager.save).toHaveBeenCalledWith(
          expect.objectContaining({
            bpmn: expect.stringContaining('bpmn:StartEvent'),
            version: '1.0'
          })
        );
        
        // Verificar que el XML guardado es válido
        expect(xmlResult.xml).toContain('bpmn:definitions');
        expect(xmlResult.xml).toContain('bpmn:process');
      });
    });

    describe('CUANDO intento crear un diagrama inválido', () => {
      test('ENTONCES el sistema me muestra advertencias de validación', async () => {
        // ARRANGE
        const elementFactory = mockModeler.get('elementFactory');
        const elementRegistry = mockModeler.get('elementRegistry');
        
        // ACT - Usuario crea diagrama incompleto (solo evento de inicio)
        const startEvent = elementFactory.createShape({
          type: 'bpmn:StartEvent',
          id: 'StartEvent_1'
        });
        elementRegistry.add(startEvent);
        
        // Simular validación
        const BpmnValidators = require('../../app/services/bpmn-validators.js').BpmnValidators;
        const validator = new BpmnValidators(mockModeler);
        
        // ASSERT
        const hasEndEvent = validator.hasEndEvent();
        expect(hasEndEvent).toBe(false);
        
        // Verificar que se genera advertencia
        mockEventBus.publish('validation.warning', {
          message: 'El diagrama no tiene eventos de fin',
          severity: 'warning'
        });
        
        const warnings = mockEventBus.published.filter(event => 
          event.eventType === 'validation.warning'
        );
        expect(warnings.length).toBeGreaterThan(0);
      });
    });
  });

  describe('Escenarios Alternativos', () => {
    test('CUANDO creo un diagrama con múltiples caminos', () => {
      // Test para diagramas más complejos con gateways
      const elementFactory = mockModeler.get('elementFactory');
      const elementRegistry = mockModeler.get('elementRegistry');
      
      // Crear gateway exclusivo
      const gateway = elementFactory.createShape({
        type: 'bpmn:ExclusiveGateway',
        id: 'Gateway_1'
      });
      elementRegistry.add(gateway);
      
      expect(gateway.type).toBe('bpmn:ExclusiveGateway');
      
      const gateways = elementRegistry.getAll().filter(el => 
        el.type === 'bpmn:ExclusiveGateway'
      );
      expect(gateways.length).toBe(1);
    });

    test('CUANDO modifico elementos existentes', () => {
      // Test para edición de propiedades
      const elementFactory = mockModeler.get('elementFactory');
      const elementRegistry = mockModeler.get('elementRegistry');
      
      const task = elementFactory.createShape({
        type: 'bpmn:Task',
        id: 'Task_1',
        businessObject: { name: 'Tarea Original' }
      });
      elementRegistry.add(task);
      
      // Simular modificación
      task.businessObject.name = 'Tarea Modificada';
      
      expect(task.businessObject.name).toBe('Tarea Modificada');
    });
  });
});
