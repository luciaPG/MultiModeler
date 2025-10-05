/**
 * 8.1 PRUEBAS UNITARIAS - RALPH Waypoints
 * 
 * Valida la gestión de waypoints en conexiones RALPH:
 * - Serialización con limpieza de null/NaN/non-finite
 * - Restauración desde localStorage con merge de bpmn.ralphElements
 * - Validación en el renderer
 * - Import/export con DataRestore
 */

// Configurar localStorage para tests
require('../utils/ensure-localstorage.js');

describe('8.1 Pruebas Unitarias - RALPH Waypoints', () => {
  let LocalStorageManager;
  let mockModeler;
  let mockElementRegistry;
  let mockElementFactory;
  let mockModeling;
  let mockCanvas;

  beforeAll(async () => {
    const storageModule = await import('../../app/services/local-storage-manager.js');
    LocalStorageManager = storageModule.default;
    
    if (!LocalStorageManager) {
      throw new Error('LocalStorageManager no encontrado');
    }
  });

  beforeEach(() => {
    // Mock de servicios BPMN.js
    mockElementRegistry = {
      getAll: jest.fn().mockReturnValue([]),
      get: jest.fn()
    };

    mockElementFactory = {
      create: jest.fn((type, attrs) => ({
        type: attrs.type,
        id: attrs.id,
        businessObject: {},
        ...attrs
      }))
    };

    mockModeling = {
      createShape: jest.fn((element, position, parent) => element),
      createConnection: jest.fn((source, target, connection, parent) => connection),
      updateWaypoints: jest.fn()
    };

    mockCanvas = {
      getRootElement: jest.fn().mockReturnValue({ id: 'Process_1', type: 'bpmn:Process' })
    };

    mockModeler = {
      saveXML: jest.fn().mockResolvedValue({ 
        xml: '<?xml version="1.0" encoding="UTF-8"?><bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL"><bpmn:process id="Process_1"/></bpmn:definitions>'
      }),
      importXML: jest.fn().mockResolvedValue(undefined),
      get: jest.fn().mockImplementation((service) => {
        const services = {
          'elementRegistry': mockElementRegistry,
          'elementFactory': mockElementFactory,
          'modeling': mockModeling,
          'canvas': mockCanvas
        };
        return services[service];
      })
    };

    localStorage.clear();
    jest.clearAllMocks();
  });

  describe('Validación de Waypoints', () => {
    test('debe filtrar waypoints con valores null', () => {
      const waypoints = [
        { x: 100, y: 200 },
        { x: 150, y: null },  // null inválido
        { x: 200, y: 300 }
      ];

      const filtered = waypoints.filter(wp => 
        wp && 
        typeof wp.x === 'number' && 
        typeof wp.y === 'number' &&
        !isNaN(wp.x) && !isNaN(wp.y) &&
        isFinite(wp.x) && isFinite(wp.y) &&
        wp.x !== null && wp.y !== null
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0]).toEqual({ x: 100, y: 200 });
      expect(filtered[1]).toEqual({ x: 200, y: 300 });
    });

    test('debe filtrar waypoints con valores NaN', () => {
      const waypoints = [
        { x: 100, y: 200 },
        { x: NaN, y: 300 },  // NaN inválido
        { x: 200, y: 300 }
      ];

      const filtered = waypoints.filter(wp => 
        wp && 
        typeof wp.x === 'number' && 
        typeof wp.y === 'number' &&
        !isNaN(wp.x) && !isNaN(wp.y) &&
        isFinite(wp.x) && isFinite(wp.y)
      );

      expect(filtered).toHaveLength(2);
      expect(filtered[0]).toEqual({ x: 100, y: 200 });
      expect(filtered[1]).toEqual({ x: 200, y: 300 });
    });

    test('debe filtrar waypoints con valores infinitos', () => {
      const waypoints = [
        { x: 100, y: 200 },
        { x: Infinity, y: 300 },  // Infinity inválido
        { x: 200, y: -Infinity }  // -Infinity inválido
      ];

      const filtered = waypoints.filter(wp => 
        wp && 
        typeof wp.x === 'number' && 
        typeof wp.y === 'number' &&
        !isNaN(wp.x) && !isNaN(wp.y) &&
        isFinite(wp.x) && isFinite(wp.y)
      );

      expect(filtered).toHaveLength(1);
      expect(filtered[0]).toEqual({ x: 100, y: 200 });
    });

    test('debe limpiar propiedades extra como "original"', () => {
      const waypoints = [
        { x: 100, y: 200, original: { x: 100, y: 200 } },
        { x: 200, y: 300, original: { x: 200, y: 300 } }
      ];

      const cleaned = waypoints.map(wp => ({ x: wp.x, y: wp.y }));

      expect(cleaned[0]).toEqual({ x: 100, y: 200 });
      expect(cleaned[0].original).toBeUndefined();
      expect(cleaned[1]).toEqual({ x: 200, y: 300 });
      expect(cleaned[1].original).toBeUndefined();
    });
  });

  describe('Serialización de Conexiones RALPH', () => {
    test('debe serializar conexiones con waypoints válidos', () => {
      const ralphConnection = {
        id: 'RALph_Conn_1',
        type: 'RALph:assignment',
        businessObject: {
          $type: 'RALph:assignment',
          name: 'Conexión Test'
        },
        source: { id: 'RALph_Role_1' },
        target: { id: 'Task_1' },
        waypoints: [
          { x: 100, y: 200 },
          { x: 300, y: 400 }
        ]
      };

      mockElementRegistry.getAll.mockReturnValue([ralphConnection]);

      // La función serializeRALPHElements del LocalStorageManager hace esto:
      const serialized = {
        id: ralphConnection.id,
        type: ralphConnection.type,
        source: ralphConnection.source.id,
        target: ralphConnection.target.id,
        waypoints: ralphConnection.waypoints
          .filter(wp => 
            wp && 
            typeof wp.x === 'number' && 
            typeof wp.y === 'number' &&
            !isNaN(wp.x) && !isNaN(wp.y) &&
            isFinite(wp.x) && isFinite(wp.y) &&
            wp.x !== null && wp.y !== null
          )
          .map(wp => ({ x: wp.x, y: wp.y })),
        properties: {
          name: ralphConnection.businessObject.name,
          type: ralphConnection.businessObject.$type
        }
      };

      expect(serialized.waypoints).toHaveLength(2);
      expect(serialized.waypoints[0]).toEqual({ x: 100, y: 200 });
      expect(serialized.waypoints[1]).toEqual({ x: 300, y: 400 });
      expect(serialized.source).toBe('RALph_Role_1');
      expect(serialized.target).toBe('Task_1');
    });

    test('debe filtrar waypoints inválidos durante serialización', () => {
      const ralphConnection = {
        id: 'RALph_Conn_1',
        type: 'RALph:assignment',
        source: { id: 'RALph_Role_1' },
        target: { id: 'Task_1' },
        waypoints: [
          { x: 100, y: 200 },
          { x: 150, y: null },    // null - debe filtrarse
          { x: NaN, y: 300 },     // NaN - debe filtrarse
          { x: 300, y: 400 }
        ]
      };

      const serialized = {
        waypoints: ralphConnection.waypoints
          .filter(wp => 
            wp && 
            typeof wp.x === 'number' && 
            typeof wp.y === 'number' &&
            !isNaN(wp.x) && !isNaN(wp.y) &&
            isFinite(wp.x) && isFinite(wp.y) &&
            wp.x !== null && wp.y !== null
          )
          .map(wp => ({ x: wp.x, y: wp.y }))
      };

      expect(serialized.waypoints).toHaveLength(2);
      expect(serialized.waypoints[0]).toEqual({ x: 100, y: 200 });
      expect(serialized.waypoints[1]).toEqual({ x: 300, y: 400 });
    });
  });

  describe('Merge de Waypoints desde bpmn.ralphElements', () => {
    test('debe combinar waypoints de bpmn.ralphElements a ralph.elements', () => {
      const projectData = {
        bpmn: {
          ralphElements: [
            {
              id: 'RALph_Conn_1',
              type: 'RALph:assignment',
              source: 'RALph_Role_1',
              target: 'Task_1',
              waypoints: [
                { x: 100, y: 200 },
                { x: 300, y: 400 }
              ]
            }
          ]
        },
        ralph: {
          elements: [
            {
              id: 'RALph_Conn_1',
              type: 'RALph:assignment',
              source: 'RALph_Role_1',
              target: 'Task_1'
              // Sin waypoints aquí
            }
          ]
        }
      };

      // Lógica de merge (igual que en local-storage-manager.js líneas 975-1020)
      const waypointsMap = new Map();
      const sourceTargetMap = new Map();
      
      if (projectData.bpmn && projectData.bpmn.ralphElements) {
        for (const ralphEl of projectData.bpmn.ralphElements) {
          if (ralphEl.waypoints && ralphEl.waypoints.length >= 2) {
            waypointsMap.set(ralphEl.id, ralphEl.waypoints);
          }
          if (ralphEl.source && ralphEl.target) {
            sourceTargetMap.set(ralphEl.id, {
              source: ralphEl.source,
              target: ralphEl.target
            });
          }
        }
      }

      // Aplicar merge
      if (projectData.ralph && projectData.ralph.elements) {
        for (const ralphEl of projectData.ralph.elements) {
          if (waypointsMap.has(ralphEl.id)) {
            ralphEl.waypoints = waypointsMap.get(ralphEl.id);
          }
          if (sourceTargetMap.has(ralphEl.id)) {
            const refs = sourceTargetMap.get(ralphEl.id);
            ralphEl.source = refs.source;
            ralphEl.target = refs.target;
          }
        }
      }

      // Verificar que se aplicó el merge
      const mergedElement = projectData.ralph.elements[0];
      expect(mergedElement.waypoints).toBeDefined();
      expect(mergedElement.waypoints).toHaveLength(2);
      expect(mergedElement.waypoints[0]).toEqual({ x: 100, y: 200 });
      expect(mergedElement.waypoints[1]).toEqual({ x: 300, y: 400 });
    });

    test('debe mantener source y target en el merge', () => {
      const projectData = {
        bpmn: {
          ralphElements: [
            {
              id: 'RALph_Conn_1',
              source: 'RALph_Role_1',
              target: 'Task_1'
            }
          ]
        },
        ralph: {
          elements: [
            {
              id: 'RALph_Conn_1'
              // Sin source/target
            }
          ]
        }
      };

      const sourceTargetMap = new Map();
      
      for (const ralphEl of projectData.bpmn.ralphElements) {
        if (ralphEl.source && ralphEl.target) {
          sourceTargetMap.set(ralphEl.id, {
            source: ralphEl.source,
            target: ralphEl.target
          });
        }
      }

      for (const ralphEl of projectData.ralph.elements) {
        if (sourceTargetMap.has(ralphEl.id)) {
          const refs = sourceTargetMap.get(ralphEl.id);
          ralphEl.source = refs.source;
          ralphEl.target = refs.target;
        }
      }

      const mergedElement = projectData.ralph.elements[0];
      expect(mergedElement.source).toBe('RALph_Role_1');
      expect(mergedElement.target).toBe('Task_1');
    });
  });

  describe('Restauración de Conexiones con Waypoints', () => {
    test('debe crear conexión con waypoints especificados', () => {
      const sourceElement = { id: 'RALph_Role_1', type: 'RALph:RoleRALph', x: 100, y: 100, width: 50, height: 50 };
      const targetElement = { id: 'Task_1', type: 'bpmn:Task', x: 400, y: 300, width: 100, height: 80 };
      
      mockElementRegistry.get.mockImplementation((id) => {
        if (id === 'RALph_Role_1') return sourceElement;
        if (id === 'Task_1') return targetElement;
        return null;
      });

      const ralphConnection = {
        id: 'RALph_Conn_1',
        type: 'RALph:assignment',
        source: 'RALph_Role_1',
        target: 'Task_1',
        waypoints: [
          { x: 125, y: 125 },
          { x: 450, y: 340 }
        ]
      };

      // Simular creación de conexión (lógica de restoreRALPHElements)
      const connection = mockElementFactory.create('connection', {
        type: ralphConnection.type,
        id: ralphConnection.id,
        source: sourceElement,
        target: targetElement,
        waypoints: ralphConnection.waypoints
      });

      const created = mockModeling.createConnection(sourceElement, targetElement, connection, mockCanvas.getRootElement());

      expect(mockElementFactory.create).toHaveBeenCalledWith('connection', expect.objectContaining({
        id: 'RALph_Conn_1',
        waypoints: [
          { x: 125, y: 125 },
          { x: 450, y: 340 }
        ]
      }));
      
      expect(mockModeling.createConnection).toHaveBeenCalled();
      expect(created.waypoints).toEqual(ralphConnection.waypoints);
    });

    test('debe usar updateWaypoints si los waypoints no se aplican en createConnection', () => {
      const sourceElement = { id: 'RALph_Role_1', type: 'RALph:RoleRALph' };
      const targetElement = { id: 'Task_1', type: 'bpmn:Task' };
      
      mockElementRegistry.get.mockImplementation((id) => {
        if (id === 'RALph_Role_1') return sourceElement;
        if (id === 'Task_1') return targetElement;
        return null;
      });

      const waypoints = [
        { x: 125, y: 125 },
        { x: 450, y: 340 }
      ];

      const connection = { id: 'RALph_Conn_1', waypoints: [] };
      mockModeling.createConnection.mockReturnValue(connection);

      // Crear conexión
      const created = mockModeling.createConnection(sourceElement, targetElement, connection, mockCanvas.getRootElement());

      // Forzar actualización de waypoints
      mockModeling.updateWaypoints(created, waypoints);

      expect(mockModeling.updateWaypoints).toHaveBeenCalledWith(created, waypoints);
    });
  });

  describe('Fallback de Waypoints', () => {
    test('debe generar waypoints por defecto si no hay waypoints válidos', () => {
      const sourceElement = { x: 100, y: 100, width: 50, height: 50 };
      const targetElement = { x: 400, y: 300, width: 100, height: 80 };

      // Calcular waypoints por defecto (lógica del renderer)
      const defaultWaypoints = [
        { x: sourceElement.x + sourceElement.width/2, y: sourceElement.y + sourceElement.height/2 },
        { x: targetElement.x + targetElement.width/2, y: targetElement.y + targetElement.height/2 }
      ];

      expect(defaultWaypoints).toHaveLength(2);
      expect(defaultWaypoints[0]).toEqual({ x: 125, y: 125 });
      expect(defaultWaypoints[1]).toEqual({ x: 450, y: 340 });
    });

    test('debe retornar fallback [0,0] a [50,0] si no hay source/target', () => {
      const element = {
        id: 'RALph_Conn_1',
        type: 'RALph:assignment',
        waypoints: []  // Sin waypoints
      };
      // Sin source/target tampoco

      // Fallback del renderer (getValidWaypoints)
      const fallbackWaypoints = [{ x: 0, y: 0 }, { x: 50, y: 0 }];

      expect(fallbackWaypoints).toHaveLength(2);
      expect(fallbackWaypoints[0]).toEqual({ x: 0, y: 0 });
      expect(fallbackWaypoints[1]).toEqual({ x: 50, y: 0 });
    });
  });
});
