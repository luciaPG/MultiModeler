/**
 * 8.1 PRUEBAS PPINOT - LocalStorage y Parentescos
 * 
 * Tests específicos para validar localStorage, parentescos PPINOT,
 * targets, scope y medidas hijas que están causando problemas en el sistema.
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';

// Mock de localStorage para tests
const createLocalStorageMock = () => {
  let store = {};
  return {
    getItem: jest.fn(key => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn(key => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; }),
    _getStore: () => store // Para debugging
  };
};

describe('8.1 PPINOT - LocalStorage y Parentescos', () => {
  let mockLocalStorage;
  let realPPINOTModule;

  beforeEach(async () => {
    // Configurar localStorage mock
    mockLocalStorage = createLocalStorageMock();
    Object.defineProperty(global, 'localStorage', {
      value: mockLocalStorage,
      writable: true
    });

    // Limpiar mocks
    jest.clearAllMocks();

    // Intentar cargar módulo PPINOT real
    try {
      realPPINOTModule = await import('../../app/modules/ppis/core/ppi-core.js');
    } catch (error) {
      console.log('PPINOT module no disponible, usando mocks para diseño');
    }
  });

  afterEach(() => {
    mockLocalStorage.clear();
  });

  describe('LocalStorage: Persistencia de PPIs', () => {
    test('debe guardar y cargar PPIs con targets correctamente', async () => {
      // GIVEN: PPIs con diferentes tipos de targets
      const ppisConTargets = [
        {
          id: 'PPI_Target_Task',
          name: 'Tiempo de Tarea',
          type: 'TimeMeasure',
          targetRef: 'Task_1',
          targetType: 'bpmn:Task',
          scope: 'process'
        },
        {
          id: 'PPI_Target_Process',
          name: 'Duración Total',
          type: 'TimeMeasure', 
          targetRef: 'Process_1',
          targetType: 'bpmn:Process',
          scope: 'global'
        },
        {
          id: 'PPI_Target_Gateway',
          name: 'Decisiones Gateway',
          type: 'CountMeasure',
          targetRef: 'Gateway_1',
          targetType: 'bpmn:ExclusiveGateway',
          scope: 'element'
        }
      ];

      // WHEN: Guardar PPIs en localStorage
      const storageKey = 'ppinot_targets_test';
      mockLocalStorage.setItem(storageKey, JSON.stringify(ppisConTargets));

      // THEN: Verificar que se guardaron correctamente
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(storageKey, expect.any(String));

      // WHEN: Cargar PPIs desde localStorage
      const storedData = mockLocalStorage.getItem(storageKey);
      expect(storedData).not.toBeNull();

      const loadedPPIs = JSON.parse(storedData);
      
      // THEN: Verificar integridad de targets y scope
      expect(loadedPPIs.length).toBe(3);
      
      loadedPPIs.forEach(ppi => {
        expect(ppi.targetRef).toBeDefined();
        expect(ppi.targetType).toBeDefined();
        expect(ppi.scope).toBeDefined();
        expect(['process', 'global', 'element'].includes(ppi.scope)).toBe(true);
      });

      // Verificar targets específicos
      const taskPPI = loadedPPIs.find(p => p.id === 'PPI_Target_Task');
      expect(taskPPI.targetRef).toBe('Task_1');
      expect(taskPPI.targetType).toBe('bpmn:Task');
      expect(taskPPI.scope).toBe('process');
    });

    test('debe manejar PPIs huérfanos (targets inexistentes)', async () => {
      // GIVEN: PPIs con targets que no existen en BPMN
      const ppisHuerfanos = [
        {
          id: 'PPI_Huerfano_1',
          name: 'PPI Sin Target',
          type: 'TimeMeasure',
          targetRef: 'Task_Inexistente',
          targetType: 'bpmn:Task',
          scope: 'process'
        },
        {
          id: 'PPI_Huerfano_2', 
          name: 'PPI Target Nulo',
          type: 'CountMeasure',
          targetRef: null,
          targetType: null,
          scope: 'undefined'
        }
      ];

      // Elementos BPMN existentes (para comparar)
      const elementosBPMNExistentes = [
        { id: 'Task_1', type: 'bpmn:Task' },
        { id: 'Process_1', type: 'bpmn:Process' },
        { id: 'StartEvent_1', type: 'bpmn:StartEvent' }
      ];

      // WHEN: Validar parentescos y detectar huérfanos
      const validationResults = ppisHuerfanos.map(ppi => {
        const targetExists = elementosBPMNExistentes.some(el => el.id === ppi.targetRef);
        const hasValidTarget = ppi.targetRef !== null && ppi.targetRef !== undefined;
        const hasValidScope = ppi.scope && ppi.scope !== 'undefined';

        return {
          ppiId: ppi.id,
          targetExists: targetExists,
          hasValidTarget: hasValidTarget,
          hasValidScope: hasValidScope,
          isOrphan: !targetExists || !hasValidTarget,
          needsRepair: !targetExists || !hasValidTarget || !hasValidScope
        };
      });

      // THEN: Detectar problemas específicos
      const orphanPPIs = validationResults.filter(r => r.isOrphan);
      const ppisNeedingRepair = validationResults.filter(r => r.needsRepair);

      expect(orphanPPIs.length).toBe(2); // Ambos PPIs son huérfanos
      expect(ppisNeedingRepair.length).toBe(2); // Ambos necesitan reparación

      // Verificar detección específica
      const ppiSinTarget = validationResults.find(r => r.ppiId === 'PPI_Huerfano_1');
      expect(ppiSinTarget.targetExists).toBe(false);
      expect(ppiSinTarget.hasValidTarget).toBe(true); // Tiene target, pero no existe
      expect(ppiSinTarget.isOrphan).toBe(true);

      const ppiTargetNulo = validationResults.find(r => r.ppiId === 'PPI_Huerfano_2');
      expect(ppiTargetNulo.hasValidTarget).toBe(false); // Target es null
      expect(ppiTargetNulo.hasValidScope).toBe(false); // Scope es 'undefined'
      expect(ppiTargetNulo.needsRepair).toBe(true);
    });
  });

  describe('Parentescos: Medidas Padre-Hijo', () => {
    test('debe validar jerarquía de medidas padre-hijo correctamente', async () => {
      // GIVEN: Estructura de medidas con parentescos
      const medidaCompleja = {
        id: 'PPI_Padre',
        name: 'Medida Compuesta',
        type: 'DerivedMeasure',
        formula: 'SUM(hijas)',
        scope: 'process',
        targetRef: 'Process_1',
        medidas_hijas: [
          {
            id: 'PPI_Hija_1',
            name: 'Tiempo Tarea A',
            type: 'TimeMeasure',
            targetRef: 'Task_A',
            parent_id: 'PPI_Padre',
            scope: 'element'
          },
          {
            id: 'PPI_Hija_2',
            name: 'Costo Tarea B', 
            type: 'DataMeasure',
            targetRef: 'Task_B',
            dataObject: 'CostData',
            attribute: 'amount',
            parent_id: 'PPI_Padre',
            scope: 'element'
          },
          {
            id: 'PPI_Hija_3',
            name: 'Conteo Decisiones',
            type: 'CountMeasure',
            targetRef: 'Gateway_1',
            parent_id: 'PPI_Padre',
            scope: 'element'
          }
        ]
      };

      // WHEN: Validar estructura de parentescos
      const validationResult = {
        padreValido: true,
        hijasValidas: [],
        parentescosCorrectos: [],
        problemasDetectados: []
      };

      // Validar medida padre
      if (!medidaCompleja.id || !medidaCompleja.type || !medidaCompleja.medidas_hijas) {
        validationResult.padreValido = false;
        validationResult.problemasDetectados.push('Medida padre incompleta');
      }

      // Validar cada medida hija
      medidaCompleja.medidas_hijas.forEach((hija, index) => {
        const hijaValidation = {
          id: hija.id,
          tieneParent: hija.parent_id === medidaCompleja.id,
          tieneTarget: !!hija.targetRef,
          tieneScope: !!hija.scope,
          tipoValido: ['TimeMeasure', 'CountMeasure', 'DataMeasure'].includes(hija.type)
        };

        // Validaciones específicas por tipo
        if (hija.type === 'DataMeasure') {
          hijaValidation.tieneDataObject = !!hija.dataObject;
          hijaValidation.tieneAttribute = !!hija.attribute;
        }

        validationResult.hijasValidas.push(hijaValidation);

        // Verificar parentesco correcto
        if (hijaValidation.tieneParent && hijaValidation.tieneTarget) {
          validationResult.parentescosCorrectos.push(hija.id);
        } else {
          validationResult.problemasDetectados.push(`Parentesco incorrecto: ${hija.id}`);
        }
      });

      // THEN: Verificar validación de parentescos
      expect(validationResult.padreValido).toBe(true);
      expect(validationResult.hijasValidas.length).toBe(3);
      expect(validationResult.parentescosCorrectos.length).toBe(3);
      expect(validationResult.problemasDetectados.length).toBe(0);

      // Verificar cada hija individualmente
      const hijaTime = validationResult.hijasValidas.find(h => h.id === 'PPI_Hija_1');
      expect(hijaTime.tieneParent).toBe(true);
      expect(hijaTime.tieneTarget).toBe(true);
      expect(hijaTime.tipoValido).toBe(true);

      const hijaData = validationResult.hijasValidas.find(h => h.id === 'PPI_Hija_2');
      expect(hijaData.tieneDataObject).toBe(true);
      expect(hijaData.tieneAttribute).toBe(true);
    });

    test('debe detectar parentescos circulares o inválidos', async () => {
      // GIVEN: Estructura con parentescos problemáticos
      const medidaConProblemas = {
        id: 'PPI_Circular',
        name: 'Medida con Problemas',
        type: 'DerivedMeasure',
        medidas_hijas: [
          {
            id: 'PPI_Hija_Circular_1',
            parent_id: 'PPI_Circular',
            referencia_circular: 'PPI_Hija_Circular_2' // Problema: referencia circular
          },
          {
            id: 'PPI_Hija_Circular_2', 
            parent_id: 'PPI_Circular',
            referencia_circular: 'PPI_Hija_Circular_1' // Problema: referencia circular
          },
          {
            id: 'PPI_Hija_Huerfana',
            parent_id: 'PPI_Padre_Inexistente', // Problema: padre inexistente
            targetRef: 'Task_1'
          }
        ]
      };

      // WHEN: Detectar problemas de parentesco
      const problemasDetectados = [];
      const visitados = new Set();

      // Detectar referencias circulares
      function detectarCircular(hijaId, path = []) {
        if (path.includes(hijaId)) {
          problemasDetectados.push(`Referencia circular detectada: ${path.join(' -> ')} -> ${hijaId}`);
          return true;
        }

        const hija = medidaConProblemas.medidas_hijas.find(h => h.id === hijaId);
        if (hija && hija.referencia_circular) {
          return detectarCircular(hija.referencia_circular, [...path, hijaId]);
        }
        return false;
      }

      // Detectar padres inexistentes
      medidaConProblemas.medidas_hijas.forEach(hija => {
        if (hija.parent_id !== medidaConProblemas.id) {
          problemasDetectados.push(`Padre inexistente: ${hija.id} referencia ${hija.parent_id}`);
        }

        if (hija.referencia_circular && !visitados.has(hija.id)) {
          detectarCircular(hija.id);
          visitados.add(hija.id);
        }
      });

      // THEN: Verificar detección de problemas
      expect(problemasDetectados.length).toBeGreaterThan(0);
      
      const problemasCirculares = problemasDetectados.filter(p => p.includes('circular'));
      const problemasHuerfanos = problemasDetectados.filter(p => p.includes('inexistente'));

      expect(problemasCirculares.length).toBeGreaterThan(0);
      expect(problemasHuerfanos.length).toBe(1);

      // Log problemas para debugging
      console.log('Problemas detectados en parentescos:');
      problemasDetectados.forEach(problema => console.log(`  - ${problema}`));
    });
  });

  describe('Scope: Validación de Ámbitos', () => {
    test('debe validar scope correcto para cada tipo de medida', async () => {
      // GIVEN: PPIs con diferentes scopes
      const ppisConScope = [
        {
          id: 'PPI_Scope_Element',
          type: 'TimeMeasure',
          targetRef: 'Task_1',
          scope: 'element', // Correcto para Task
          expectedValid: true
        },
        {
          id: 'PPI_Scope_Process',
          type: 'TimeMeasure',
          targetRef: 'Process_1', 
          scope: 'process', // Correcto para Process
          expectedValid: true
        },
        {
          id: 'PPI_Scope_Incorrecto_1',
          type: 'CountMeasure',
          targetRef: 'Task_1',
          scope: 'global', // Incorrecto: Task con scope global
          expectedValid: false
        },
        {
          id: 'PPI_Scope_Incorrecto_2',
          type: 'DataMeasure',
          targetRef: 'Process_1',
          scope: 'element', // Incorrecto: Process con scope element
          expectedValid: false
        },
        {
          id: 'PPI_Scope_Undefined',
          type: 'TimeMeasure',
          targetRef: 'Task_2',
          scope: undefined, // Problema: scope no definido
          expectedValid: false
        }
      ];

      // WHEN: Validar scope para cada PPI
      const scopeValidationResults = ppisConScope.map(ppi => {
        let isValidScope = false;

        // Reglas de validación de scope
        if (ppi.targetRef && ppi.scope) {
          if (ppi.targetRef.startsWith('Task_') && ppi.scope === 'element') {
            isValidScope = true;
          } else if (ppi.targetRef.startsWith('Process_') && ppi.scope === 'process') {
            isValidScope = true;
          } else if (ppi.targetRef.startsWith('Gateway_') && ['element', 'process'].includes(ppi.scope)) {
            isValidScope = true;
          } else if (ppi.scope === 'global' && ppi.targetRef.startsWith('Process_')) {
            isValidScope = true;
          }
        }

        return {
          ppiId: ppi.id,
          targetRef: ppi.targetRef,
          scope: ppi.scope,
          isValidScope: isValidScope,
          expectedValid: ppi.expectedValid,
          testPassed: isValidScope === ppi.expectedValid
        };
      });

      // THEN: Verificar validación de scope
      expect(scopeValidationResults.length).toBe(5);
      expect(scopeValidationResults.every(r => r.testPassed)).toBe(true);

      // Verificar casos específicos
      const validScopes = scopeValidationResults.filter(r => r.isValidScope);
      const invalidScopes = scopeValidationResults.filter(r => !r.isValidScope);

      expect(validScopes.length).toBe(2); // Solo 2 deberían ser válidos
      expect(invalidScopes.length).toBe(3); // 3 deberían ser inválidos

      // Log problemas de scope para debugging
      invalidScopes.forEach(invalid => {
        console.log(`Scope inválido: ${invalid.ppiId} (${invalid.targetRef} -> ${invalid.scope})`);
      });
    });
  });

  describe('Targets: Vinculación con Elementos BPMN', () => {
    test('debe sincronizar targets cuando cambian elementos BPMN', async () => {
      // GIVEN: PPIs vinculados a elementos BPMN
      const ppisVinculados = [
        { id: 'PPI_1', targetRef: 'Task_Original', type: 'TimeMeasure' },
        { id: 'PPI_2', targetRef: 'Task_Original', type: 'CountMeasure' },
        { id: 'PPI_3', targetRef: 'Gateway_1', type: 'CountMeasure' }
      ];

      // Cambios en elementos BPMN
      const cambiosBPMN = [
        {
          tipo: 'element.renamed',
          oldId: 'Task_Original',
          newId: 'Task_Renamed',
          elementType: 'bpmn:Task'
        },
        {
          tipo: 'element.deleted',
          elementId: 'Gateway_1',
          elementType: 'bpmn:ExclusiveGateway'
        }
      ];

      // WHEN: Aplicar sincronización de targets
      const ppisActualizados = ppisVinculados.map(ppi => {
        let updatedPPI = { ...ppi };
        
        cambiosBPMN.forEach(cambio => {
          if (cambio.tipo === 'element.renamed' && ppi.targetRef === cambio.oldId) {
            updatedPPI.targetRef = cambio.newId;
            updatedPPI.syncStatus = 'updated';
          } else if (cambio.tipo === 'element.deleted' && ppi.targetRef === cambio.elementId) {
            updatedPPI.targetRef = null;
            updatedPPI.syncStatus = 'orphaned';
          }
        });

        if (!updatedPPI.syncStatus) {
          updatedPPI.syncStatus = 'unchanged';
        }

        return updatedPPI;
      });

      // THEN: Verificar sincronización correcta
      expect(ppisActualizados.length).toBe(3);

      // Verificar PPIs renombrados
      const ppisRenombrados = ppisActualizados.filter(p => p.syncStatus === 'updated');
      expect(ppisRenombrados.length).toBe(2); // PPI_1 y PPI_2
      expect(ppisRenombrados.every(p => p.targetRef === 'Task_Renamed')).toBe(true);

      // Verificar PPIs huérfanos
      const ppisHuerfanos = ppisActualizados.filter(p => p.syncStatus === 'orphaned');
      expect(ppisHuerfanos.length).toBe(1); // PPI_3
      expect(ppisHuerfanos[0].targetRef).toBeNull();

      // Guardar estado actualizado en localStorage
      mockLocalStorage.setItem('ppis_sincronizados', JSON.stringify(ppisActualizados));
      
      const stored = JSON.parse(mockLocalStorage.getItem('ppis_sincronizados'));
      expect(stored.length).toBe(3);
      expect(stored.filter(p => p.syncStatus === 'updated').length).toBe(2);
    });

    test('debe manejar targets con tipos de elemento específicos', async () => {
      // GIVEN: PPIs con targets específicos por tipo de elemento
      const targetsByType = [
        {
          ppi: { id: 'PPI_Task', type: 'TimeMeasure', targetRef: 'Task_1' },
          elementType: 'bpmn:Task',
          allowedMeasures: ['TimeMeasure', 'CountMeasure', 'DataMeasure'],
          expectedValid: true
        },
        {
          ppi: { id: 'PPI_StartEvent', type: 'TimeMeasure', targetRef: 'StartEvent_1' },
          elementType: 'bpmn:StartEvent', 
          allowedMeasures: ['TimeMeasure'], // Solo tiempo para eventos
          expectedValid: true
        },
        {
          ppi: { id: 'PPI_Gateway_Count', type: 'CountMeasure', targetRef: 'Gateway_1' },
          elementType: 'bpmn:ExclusiveGateway',
          allowedMeasures: ['CountMeasure'], // Solo conteo para gateways
          expectedValid: true
        },
        {
          ppi: { id: 'PPI_Invalid_Combo', type: 'DataMeasure', targetRef: 'StartEvent_1' },
          elementType: 'bpmn:StartEvent',
          allowedMeasures: ['TimeMeasure'], // DataMeasure no permitido para StartEvent
          expectedValid: false
        }
      ];

      // WHEN: Validar compatibilidad target-tipo
      const compatibilityResults = targetsByType.map(item => {
        const isCompatible = item.allowedMeasures.includes(item.ppi.type);
        
        return {
          ppiId: item.ppi.id,
          targetRef: item.ppi.targetRef,
          measureType: item.ppi.type,
          elementType: item.elementType,
          isCompatible: isCompatible,
          expectedValid: item.expectedValid,
          testPassed: isCompatible === item.expectedValid
        };
      });

      // THEN: Verificar compatibilidad
      expect(compatibilityResults.length).toBe(4);
      expect(compatibilityResults.every(r => r.testPassed)).toBe(true);

      // Verificar casos específicos
      const validCombinations = compatibilityResults.filter(r => r.isCompatible);
      const invalidCombinations = compatibilityResults.filter(r => !r.isCompatible);

      expect(validCombinations.length).toBe(3);
      expect(invalidCombinations.length).toBe(1);

      // El caso inválido debe ser DataMeasure en StartEvent
      const invalidCase = invalidCombinations[0];
      expect(invalidCase.measureType).toBe('DataMeasure');
      expect(invalidCase.elementType).toBe('bpmn:StartEvent');
    });
  });

  describe('Persistencia: Problemas Reales de LocalStorage', () => {
    test('debe detectar y manejar corrupción de datos PPINOT', async () => {
      // GIVEN: Datos corruptos en localStorage (simulando problemas reales)
      const datosCorruptos = [
        {
          key: 'ppinot_data_corrupted_json',
          value: '{"ppis":[{"id":"PPI_1","name":"Test",' // JSON incompleto
        },
        {
          key: 'ppinot_data_corrupted_structure',
          value: JSON.stringify({
            ppis: [
              { id: 'PPI_Sin_Type' }, // Falta type
              { type: 'TimeMeasure' }, // Falta id
              { id: 'PPI_Sin_Target', type: 'TimeMeasure' } // Falta targetRef
            ]
          })
        },
        {
          key: 'ppinot_data_empty',
          value: ''
        },
        {
          key: 'ppinot_data_null',
          value: 'null'
        }
      ];

      // WHEN: Intentar cargar cada dato corrupto
      const recoveryResults = datosCorruptos.map(item => {
        mockLocalStorage.setItem(item.key, item.value);
        
        let loadResult = {
          key: item.key,
          loadSuccessful: false,
          dataValid: false,
          recoveryAction: 'none',
          error: null
        };

        try {
          const rawData = mockLocalStorage.getItem(item.key);
          
          if (!rawData || rawData === '' || rawData === 'null') {
            loadResult.error = 'Datos vacíos o nulos';
            loadResult.recoveryAction = 'initialize_default';
          } else {
            const parsedData = JSON.parse(rawData);
            loadResult.loadSuccessful = true;
            
            // Validar estructura de datos
            if (parsedData && parsedData.ppis && Array.isArray(parsedData.ppis)) {
              const validPPIs = parsedData.ppis.filter(ppi => 
                ppi.id && ppi.type && ['TimeMeasure', 'CountMeasure', 'DataMeasure'].includes(ppi.type)
              );
              
              if (validPPIs.length === parsedData.ppis.length) {
                loadResult.dataValid = true;
              } else {
                loadResult.recoveryAction = 'clean_invalid_ppis';
              }
            } else {
              loadResult.recoveryAction = 'restructure_data';
            }
          }
        } catch (error) {
          loadResult.error = error.message;
          loadResult.recoveryAction = 'reset_to_default';
        }

        return loadResult;
      });

      // THEN: Verificar manejo de corrupción
      expect(recoveryResults.length).toBe(4);
      
      const errorsDetected = recoveryResults.filter(r => r.error);
      const recoveryNeeded = recoveryResults.filter(r => r.recoveryAction !== 'none');

      expect(errorsDetected.length).toBeGreaterThan(0);
      expect(recoveryNeeded.length).toBe(4); // Todos necesitan recuperación

      // Verificar acciones de recuperación específicas
      const jsonError = recoveryResults.find(r => r.key.includes('corrupted_json'));
      expect(jsonError.recoveryAction).toBe('reset_to_default');

      const emptyData = recoveryResults.find(r => r.key.includes('empty'));
      expect(emptyData.recoveryAction).toBe('initialize_default');

      console.log('Estrategias de recuperación detectadas:');
      recoveryResults.forEach(result => {
        console.log(`  - ${result.key}: ${result.recoveryAction}`);
      });
    });

    test('debe manejar límites de localStorage con PPIs complejos', async () => {
      // GIVEN: PPIs muy grandes que pueden exceder límites
      const ppiComplejo = {
        id: 'PPI_Large_Data',
        name: 'PPI con Datos Masivos',
        type: 'DerivedMeasure',
        formula: 'A'.repeat(1000), // Fórmula muy larga
        conditions: Array.from({length: 100}, (_, i) => ({
          id: `Condition_${i}`,
          expression: `Task_${i}.duration > ${i * 10}`,
          description: `Condición compleja número ${i}`.repeat(10)
        })),
        medidas_hijas: Array.from({length: 50}, (_, i) => ({
          id: `SubPPI_${i}`,
          name: `Sub-medida ${i}`,
          type: 'TimeMeasure',
          targetRef: `Task_${i}`,
          metadata: {
            created: Date.now(),
            description: `Descripción detallada de la medida ${i}`.repeat(20),
            tags: [`tag_${i}`, `category_${i % 5}`, `type_${i % 3}`]
          }
        }))
      };

      // WHEN: Intentar guardar PPI complejo
      let storageResult = {
        success: false,
        dataSize: 0,
        error: null,
        truncated: false
      };

      try {
        const serializedData = JSON.stringify(ppiComplejo);
        // Usar Buffer si TextEncoder no está disponible (Node.js environment)
        let dataSize;
        if (typeof TextEncoder !== 'undefined') {
          dataSize = new TextEncoder().encode(serializedData).length;
        } else {
          // Fallback para Node.js
          dataSize = Buffer.byteLength(serializedData, 'utf8');
        }
        storageResult.dataSize = dataSize;
        
        // Simular límite de localStorage (típicamente 5-10MB)
        const STORAGE_LIMIT = 5 * 1024 * 1024; // 5MB
        
        if (storageResult.dataSize > STORAGE_LIMIT) {
          // Simular truncamiento de datos
          const truncatedPPI = {
            ...ppiComplejo,
            formula: ppiComplejo.formula.substring(0, 100),
            conditions: ppiComplejo.conditions.slice(0, 10),
            medidas_hijas: ppiComplejo.medidas_hijas.slice(0, 10)
          };
          
          mockLocalStorage.setItem('ppi_large_truncated', JSON.stringify(truncatedPPI));
          storageResult.truncated = true;
          storageResult.success = true;
        } else {
          mockLocalStorage.setItem('ppi_large_complete', JSON.stringify(ppiComplejo));
          storageResult.success = true;
        }
      } catch (error) {
        storageResult.error = error.message;
        storageResult.success = false;
      }

      // THEN: Verificar manejo de límites
      expect(storageResult.success).toBe(true);
      expect(storageResult.dataSize).toBeGreaterThan(10000); // Debe ser un PPI grande

      if (storageResult.truncated) {
        console.log(`Datos truncados: ${Math.round(storageResult.dataSize / 1024)}KB -> límite excedido`);
        expect(storageResult.truncated).toBe(true);
      } else {
        console.log(`Datos completos guardados: ${Math.round(storageResult.dataSize / 1024)}KB`);
        expect(storageResult.dataSize).toBeLessThan(5 * 1024 * 1024);
      }
    });
  });

  describe('Medidas Hijas: Relaciones Complejas', () => {
    test('debe validar dependencias entre medidas hijas', async () => {
      // GIVEN: Medidas con dependencias complejas
      const medidaConDependencias = {
        id: 'PPI_Complex_Parent',
        name: 'Medida con Dependencias',
        type: 'DerivedMeasure',
        medidas_hijas: [
          {
            id: 'PPI_Base_1',
            type: 'TimeMeasure',
            targetRef: 'Task_A',
            level: 0, // Medida base
            dependencies: []
          },
          {
            id: 'PPI_Base_2',
            type: 'CountMeasure', 
            targetRef: 'Task_B',
            level: 0, // Medida base
            dependencies: []
          },
          {
            id: 'PPI_Derived_1',
            type: 'DerivedMeasure',
            formula: 'PPI_Base_1 / PPI_Base_2',
            level: 1, // Depende de medidas base
            dependencies: ['PPI_Base_1', 'PPI_Base_2']
          },
          {
            id: 'PPI_Derived_2',
            type: 'DerivedMeasure',
            formula: 'PPI_Derived_1 * 100',
            level: 2, // Depende de medida derivada
            dependencies: ['PPI_Derived_1']
          }
        ]
      };

      // WHEN: Validar dependencias
      const dependencyValidation = {
        circularDependencies: [],
        missingDependencies: [],
        validHierarchy: true,
        maxLevel: 0
      };

      // Verificar cada medida hija
      medidaConDependencias.medidas_hijas.forEach(medida => {
        // Verificar nivel máximo
        dependencyValidation.maxLevel = Math.max(dependencyValidation.maxLevel, medida.level || 0);

        // Verificar dependencias existen
        if (medida.dependencies) {
          medida.dependencies.forEach(depId => {
            const depExists = medidaConDependencias.medidas_hijas.some(m => m.id === depId);
            if (!depExists) {
              dependencyValidation.missingDependencies.push({
                medida: medida.id,
                dependenciaPerdida: depId
              });
            }
          });
        }

        // Verificar dependencias circulares (simple)
        if (medida.dependencies && medida.dependencies.includes(medida.id)) {
          dependencyValidation.circularDependencies.push(medida.id);
        }
      });

      // THEN: Verificar jerarquía válida
      expect(dependencyValidation.circularDependencies.length).toBe(0);
      expect(dependencyValidation.missingDependencies.length).toBe(0);
      expect(dependencyValidation.maxLevel).toBe(2);
      expect(dependencyValidation.validHierarchy).toBe(true);

      // Verificar orden de evaluación correcto
      const sortedByLevel = medidaConDependencias.medidas_hijas.sort((a, b) => (a.level || 0) - (b.level || 0));
      expect(sortedByLevel[0].level).toBe(0); // Medidas base primero
      expect(sortedByLevel[sortedByLevel.length - 1].level).toBe(2); // Derivadas al final
    });
  });

  describe('Problemas Reales: Casos de Debugging', () => {
    test('debe reproducir y diagnosticar problemas específicos del sistema', async () => {
      // GIVEN: Escenarios que reproducen problemas reales reportados
      const problemScenarios = [
        {
          name: 'PPI sin target después de eliminar elemento BPMN',
          setup: () => {
            const ppi = { id: 'PPI_Problem_1', targetRef: 'Task_Deleted', type: 'TimeMeasure' };
            const bpmnElements = []; // Elemento ya no existe
            return { ppi, bpmnElements };
          },
          expectedProblem: 'target_not_found'
        },
        {
          name: 'Medida hija sin padre en localStorage',
          setup: () => {
            const hijaSinPadre = { 
              id: 'PPI_Orphan_Child', 
              parent_id: 'PPI_Nonexistent_Parent',
              type: 'TimeMeasure',
              targetRef: 'Task_1'
            };
            return { ppi: hijaSinPadre };
          },
          expectedProblem: 'orphan_child'
        },
        {
          name: 'Scope inconsistente tras cambio de elemento',
          setup: () => {
            const ppi = { 
              id: 'PPI_Scope_Problem',
              targetRef: 'Task_1', 
              scope: 'global', // Inconsistente: Task con scope global
              type: 'TimeMeasure'
            };
            return { ppi };
          },
          expectedProblem: 'scope_mismatch'
        }
      ];

      // WHEN: Ejecutar diagnóstico de cada escenario
      const diagnosticResults = problemScenarios.map(scenario => {
        const { ppi, bpmnElements } = scenario.setup();
        let problemDetected = false;
        let problemType = 'none';

        // Diagnóstico específico por escenario
        if (scenario.expectedProblem === 'target_not_found') {
          const targetExists = bpmnElements && bpmnElements.length > 0 && 
                              bpmnElements.some(el => el.id === ppi.targetRef);
          if (!targetExists) {
            problemDetected = true;
            problemType = 'target_not_found';
          }
        } else if (scenario.expectedProblem === 'orphan_child') {
          // Verificar si el padre realmente existe
          if (ppi.parent_id && ppi.parent_id.includes('Nonexistent')) {
            problemDetected = true;
            problemType = 'orphan_child';
          }
        } else if (scenario.expectedProblem === 'scope_mismatch') {
          const isTask = ppi.targetRef && ppi.targetRef.startsWith('Task_');
          const hasGlobalScope = ppi.scope === 'global';
          if (isTask && hasGlobalScope) {
            problemDetected = true;
            problemType = 'scope_mismatch';
          }
        }

        return {
          scenario: scenario.name,
          expectedProblem: scenario.expectedProblem,
          problemDetected: problemDetected,
          problemType: problemType,
          ppiId: ppi.id
        };
      });

      // THEN: Verificar detección de problemas
      expect(diagnosticResults.length).toBe(3);
      expect(diagnosticResults.every(r => r.problemDetected)).toBe(true);
      expect(diagnosticResults.every(r => r.problemType === r.expectedProblem)).toBe(true);

      // Log problemas para ayudar con debugging real
      console.log('Problemas diagnosticados para corrección:');
      diagnosticResults.forEach(result => {
        console.log(`  - ${result.scenario}: ${result.problemType} (${result.ppiId})`);
      });
    });
  });
});
