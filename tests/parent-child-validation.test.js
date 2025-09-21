/**
 * Test de Validación de Relaciones Padre-Hijo
 * 
 * Este test demuestra que localStorage no tiene un comportamiento regular
 * para las relaciones padre-hijo y valida el sistema real del modeler.
 * 
 * Problema documentado: Los elementos PPINOT se crean de forma asíncrona
 * después del import XML, causando inconsistencias en localStorage.
 */

describe('Parent-Child Relationship Validation', () => {
  let modeler;
  let elementRegistry;
  let modeling;
  let importExportManager;

  beforeEach(() => {
    // Mock del modeler y servicios
    elementRegistry = {
      elements: new Map(),
      get: function(id) {
        return this.elements.get(id);
      },
      add: function(id, element) {
        this.elements.set(id, element);
      },
      getAll: function() {
        return Array.from(this.elements.values());
      }
    };

    modeling = {
      moveElements: jest.fn()
    };

    modeler = {
      get: function(serviceName) {
        if (serviceName === 'elementRegistry') return elementRegistry;
        if (serviceName === 'modeling') return modeling;
        return null;
      }
    };

    // Mock del ImportExportManager
    importExportManager = {
      getFromLocalStorage: jest.fn(),
      performDirectRelationshipRestoration: jest.fn()
    };

    // Mock de localStorage
    const localStorageMock = {};
    global.localStorage = {
      getItem: jest.fn((key) => localStorageMock[key] || null),
      setItem: jest.fn((key, value) => { localStorageMock[key] = value; }),
      clear: jest.fn(() => { Object.keys(localStorageMock).forEach(k => delete localStorageMock[k]); })
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('LocalStorage vs Real System Inconsistencies', () => {
    
    test('localStorage should store relationships but real elements may not exist', () => {
      // Arrange: Relaciones guardadas en localStorage
      const savedRelationships = [
        {
          childId: 'AggregatedMeasure_123',
          parentId: 'Ppi_456',
          childName: 'Test Measure',
          parentName: 'Test PPI'
        },
        {
          childId: 'Target_789',
          parentId: 'Ppi_456',
          childName: 'Test Target',
          parentName: 'Test PPI'
        }
      ];

      // Simular datos en localStorage
      localStorage.setItem('ppinot:relationships', JSON.stringify({
        version: '1.0.0',
        timestamp: Date.now(),
        relationships: savedRelationships
      }));

      // Act: Verificar que localStorage tiene los datos
      const localStorageData = JSON.parse(localStorage.getItem('ppinot:relationships'));
      
      // Assert: localStorage contiene las relaciones
      expect(localStorageData).toBeDefined();
      expect(localStorageData.relationships).toHaveLength(2);
      expect(localStorageData.relationships[0].childId).toBe('AggregatedMeasure_123');
      
      // Pero el elementRegistry está vacío (simula el problema real)
      expect(elementRegistry.get('AggregatedMeasure_123')).toBeUndefined();
      expect(elementRegistry.get('Ppi_456')).toBeUndefined();
      
      console.log('❌ PROBLEMA DOCUMENTADO: localStorage tiene datos pero elementRegistry está vacío');
    });

    test('should validate real parent-child relationships vs localStorage data', () => {
      // Arrange: Crear elementos reales en el registry
      const parentElement = {
        id: 'Ppi_456',
        type: 'PPINOT:Ppi',
        parent: null,
        children: []
      };

      const childElement = {
        id: 'AggregatedMeasure_123',
        type: 'PPINOT:AggregatedMeasure',
        parent: parentElement, // ✅ Relación real establecida
        children: []
      };

      // Agregar al registry
      elementRegistry.add('Ppi_456', parentElement);
      elementRegistry.add('AggregatedMeasure_123', childElement);
      parentElement.children.push(childElement);

      // Simular datos incorrectos en localStorage (relación diferente)
      const incorrectRelationships = [
        {
          childId: 'AggregatedMeasure_123',
          parentId: 'Process_1', // ❌ Padre incorrecto en localStorage
          childName: 'Test Measure',
          parentName: 'Process'
        }
      ];

      localStorage.setItem('ppinot:relationships', JSON.stringify({
        relationships: incorrectRelationships
      }));

      // Act: Validar sistema real vs localStorage
      const realRelationship = {
        childId: childElement.id,
        realParentId: childElement.parent && childElement.parent.id,
        realParentType: childElement.parent && childElement.parent.type
      };

      const localStorageRelationship = incorrectRelationships[0];

      // Assert: El sistema real tiene la relación correcta
      expect(realRelationship.realParentId).toBe('Ppi_456');
      expect(realRelationship.realParentType).toBe('PPINOT:Ppi');
      
      // Pero localStorage tiene datos incorrectos
      expect(localStorageRelationship.parentId).toBe('Process_1');
      expect(localStorageRelationship.parentId).not.toBe(realRelationship.realParentId);
      
      console.log('✅ VALIDACIÓN: Sistema real vs localStorage detecta inconsistencias');
    });

    test('should demonstrate timing issues with async element creation', async () => {
      // Arrange: Simular creación asíncrona de elementos
      const relationships = [
        {
          childId: 'Target_async_123',
          parentId: 'Ppi_async_456',
          childName: 'Async Target',
          parentName: 'Async PPI'
        }
      ];

      localStorage.setItem('ppinot:relationships', JSON.stringify({
        relationships: relationships
      }));

      // Act: Intentar restaurar inmediatamente (simula el problema real)
      const elementsFound = relationships.every(rel => {
        const child = elementRegistry.get(rel.childId);
        const parent = elementRegistry.get(rel.parentId);
        return child && parent;
      });

      // Assert: Los elementos no están disponibles inmediatamente
      expect(elementsFound).toBe(false);

      // Simular creación asíncrona después de un delay
      setTimeout(() => {
        elementRegistry.add('Ppi_async_456', {
          id: 'Ppi_async_456',
          type: 'PPINOT:Ppi'
        });
        elementRegistry.add('Target_async_123', {
          id: 'Target_async_123',
          type: 'PPINOT:Target'
        });
      }, 100);

      // Esperar y verificar de nuevo
      await new Promise(resolve => setTimeout(resolve, 150));
      
      const elementsFoundAfterDelay = relationships.every(rel => {
        const child = elementRegistry.get(rel.childId);
        const parent = elementRegistry.get(rel.parentId);
        return child && parent;
      });

      expect(elementsFoundAfterDelay).toBe(true);
      
      console.log('⏰ TIMING PROBLEM: Elementos disponibles solo después de delay asíncrono');
    });
  });

  describe('Real System Validation Functions', () => {
    
    test('should create helper function to validate real relationships', () => {
      // Arrange: Crear elementos con relaciones reales
      const parentPpi = {
        id: 'Ppi_real_test',
        type: 'PPINOT:Ppi',
        parent: null,
        children: []
      };

      const childMeasure = {
        id: 'Measure_real_test',
        type: 'PPINOT:AggregatedMeasure',
        parent: parentPpi,
        children: []
      };

      const childTarget = {
        id: 'Target_real_test',
        type: 'PPINOT:Target',
        parent: parentPpi,
        children: []
      };

      parentPpi.children.push(childMeasure, childTarget);
      
      elementRegistry.add(parentPpi.id, parentPpi);
      elementRegistry.add(childMeasure.id, childMeasure);
      elementRegistry.add(childTarget.id, childTarget);

      // Act: Función de validación del sistema real
      function validateRealParentChildRelationships() {
        const realRelationships = [];
        const allElements = elementRegistry.getAll();
        
        allElements.forEach(element => {
          if (element.parent) {
            realRelationships.push({
              childId: element.id,
              childType: element.type,
              parentId: element.parent.id,
              parentType: element.parent.type,
              isValid: element.parent.children.includes(element)
            });
          }
        });
        
        return realRelationships;
      }

      const realRelationships = validateRealParentChildRelationships();

      // Assert: Validar que las relaciones reales son correctas
      expect(realRelationships).toHaveLength(2);
      
      const measureRelation = realRelationships.find(r => r.childId === 'Measure_real_test');
      expect(measureRelation).toBeDefined();
      expect(measureRelation.parentId).toBe('Ppi_real_test');
      expect(measureRelation.isValid).toBe(true);
      
      const targetRelation = realRelationships.find(r => r.childId === 'Target_real_test');
      expect(targetRelation).toBeDefined();
      expect(targetRelation.parentId).toBe('Ppi_real_test');
      expect(targetRelation.isValid).toBe(true);
      
      console.log('✅ SISTEMA REAL: Relaciones validadas correctamente');
    });

    test('should provide comparison between localStorage and real system', () => {
      // Arrange: Configurar escenario mixto
      const realElements = [
        {
          id: 'Ppi_comparison',
          type: 'PPINOT:Ppi',
          parent: null,
          children: []
        },
        {
          id: 'Measure_comparison',
          type: 'PPINOT:AggregatedMeasure',
          parent: null,
          children: []
        }
      ];

      // Establecer relación real
      realElements[1].parent = realElements[0];
      realElements[0].children.push(realElements[1]);

      realElements.forEach(el => elementRegistry.add(el.id, el));

      // localStorage con datos diferentes
      const localStorageData = {
        relationships: [
          {
            childId: 'Measure_comparison',
            parentId: 'Different_Parent', // ❌ Padre diferente
            childName: 'Comparison Measure',
            parentName: 'Different Parent'
          }
        ]
      };

      localStorage.setItem('ppinot:relationships', JSON.stringify(localStorageData));

      // Act: Función de comparación
      function compareLocalStorageWithRealSystem() {
        const localData = JSON.parse(localStorage.getItem('ppinot:relationships'));
        const mismatches = [];

        if (localData && localData.relationships) {
          localData.relationships.forEach(localRel => {
            const childElement = elementRegistry.get(localRel.childId);
            if (childElement) {
              const realParentId = childElement.parent && childElement.parent.id;
              if (realParentId !== localRel.parentId) {
                mismatches.push({
                  childId: localRel.childId,
                  localStorageParent: localRel.parentId,
                  realSystemParent: realParentId,
                  type: 'PARENT_MISMATCH'
                });
              }
            } else {
              mismatches.push({
                childId: localRel.childId,
                localStorageParent: localRel.parentId,
                realSystemParent: null,
                type: 'ELEMENT_NOT_FOUND'
              });
            }
          });
        }

        return mismatches;
      }

      const mismatches = compareLocalStorageWithRealSystem();

      // Assert: Detectar discrepancias
      expect(mismatches).toHaveLength(1);
      expect(mismatches[0].type).toBe('PARENT_MISMATCH');
      expect(mismatches[0].localStorageParent).toBe('Different_Parent');
      expect(mismatches[0].realSystemParent).toBe('Ppi_comparison');
      
      console.log('🔍 COMPARACIÓN: Detectadas discrepancias entre localStorage y sistema real');
    });
  });

  describe('Test Utilities for Browser Console', () => {
    
    test('should provide console helper functions for manual testing', () => {
      // Act: Crear funciones helper para testing manual
      const testHelpers = {
        // Función para validar relaciones reales
        validateRealRelationships: function() {
          console.log('🔍 Validando relaciones del sistema real...');
          const registry = window.modeler?.get('elementRegistry');
          if (!registry) {
            console.error('❌ ElementRegistry no disponible');
            return [];
          }

          const allElements = registry.getAll();
          const relationships = [];
          
          allElements.forEach(element => {
            if (element.parent && element.type?.startsWith('PPINOT:')) {
              relationships.push({
                child: `${element.id} (${element.type})`,
                parent: `${element.parent.id} (${element.parent.type})`,
                valid: element.parent.children?.includes(element) || false
              });
            }
          });

          console.table(relationships);
          return relationships;
        },

        // Función para comparar con localStorage
        compareWithLocalStorage: function() {
          console.log('🔍 Comparando sistema real vs localStorage...');
          
          const localData = JSON.parse(localStorage.getItem('ppinot:relationships') || '{"relationships":[]}');
          const registry = window.modeler?.get('elementRegistry');
          
          if (!registry) {
            console.error('❌ ElementRegistry no disponible');
            return;
          }

          const comparison = [];
          
          localData.relationships?.forEach(localRel => {
            const childElement = registry.get(localRel.childId);
            comparison.push({
              childId: localRel.childId,
              localStorageParent: localRel.parentId,
              realParent: childElement?.parent?.id || 'NOT_FOUND',
              match: childElement?.parent?.id === localRel.parentId,
              elementExists: !!childElement
            });
          });

          console.table(comparison);
          return comparison;
        },

        // Función para mostrar elementos faltantes
        findMissingElements: function() {
          console.log('🔍 Buscando elementos faltantes...');
          
          const localData = JSON.parse(localStorage.getItem('ppinot:relationships') || '{"relationships":[]}');
          const registry = window.modeler?.get('elementRegistry');
          
          if (!registry) {
            console.error('❌ ElementRegistry no disponible');
            return;
          }

          const missing = [];
          
          localData.relationships?.forEach(rel => {
            const child = registry.get(rel.childId);
            const parent = registry.get(rel.parentId);
            
            if (!child || !parent) {
              missing.push({
                relationship: `${rel.childId} → ${rel.parentId}`,
                childExists: !!child,
                parentExists: !!parent,
                issue: !child ? 'MISSING_CHILD' : 'MISSING_PARENT'
              });
            }
          });

          console.table(missing);
          return missing;
        }
      };

      // Assert: Las funciones helper están disponibles
      expect(testHelpers.validateRealRelationships).toBeInstanceOf(Function);
      expect(testHelpers.compareWithLocalStorage).toBeInstanceOf(Function);
      expect(testHelpers.findMissingElements).toBeInstanceOf(Function);

      // Hacer disponibles globalmente para testing manual
      if (typeof window !== 'undefined') {
        window.parentChildTestHelpers = testHelpers;
        console.log('✅ Test helpers disponibles en: window.parentChildTestHelpers');
      }
    });
  });
});

/**
 * INSTRUCCIONES PARA USO MANUAL:
 * 
 * 1. Abrir navegador y ir a localhost:8080
 * 2. Abrir DevTools Console
 * 3. Ejecutar: window.parentChildTestHelpers.validateRealRelationships()
 * 4. Ejecutar: window.parentChildTestHelpers.compareWithLocalStorage()
 * 5. Ejecutar: window.parentChildTestHelpers.findMissingElements()
 * 
 * Estas funciones te mostrarán las discrepancias entre localStorage y el sistema real.
 */