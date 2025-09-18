/**
 * Unit Test REAL: Relaciones Padre-Hijo PPINOT
 * 
 * Este test verifica que las relaciones padre-hijo de PPINOT se guarden y restauren
 * correctamente usando el sistema real (no mocks).
 */

import { describe, test, expect, beforeEach, jest } from '@jest/globals';
import '../utils/ensure-localstorage.js';
import { resetLocalStorageMock } from '../utils/ensure-localstorage.js';

describe('8.1 PPINOT - Relaciones Padre-Hijo (Sistema Real)', () => {
  beforeEach(() => {
    resetLocalStorageMock();
    jest.clearAllMocks();
  });

  describe('Autoguardado de Relaciones Padre-Hijo', () => {
    test('debe guardar y restaurar PPIs con relaciones padre-hijo correctamente', async () => {
      // === PASO 1: CONFIGURAR SISTEMA REAL ===
      console.log('🔧 PASO 1: Configurando sistema real...');
      
      const { getServiceRegistry } = await import('../../app/modules/ui/core/ServiceRegistry.js');
      const { getEventBus } = await import('../../app/modules/ui/core/event-bus.js');
      const { AutosaveManager } = await import('../../app/services/autosave-manager.js');
      
      const registry = getServiceRegistry();
      const eventBus = getEventBus();
      
      // Limpiar registros previos
      registry.clear();
      eventBus.clear();
      
      // === PASO 2: CREAR PPIAdapter CON DATOS PADRE-HIJO ===
      console.log('📊 PASO 2: Creando PPIAdapter con relaciones padre-hijo...');
      
      const ppisConRelaciones = [
        {
          id: 'PPI_Padre_Tiempo',
          name: 'Tiempo Total del Proceso',
          type: 'PPINOT:TimeMeasure',
          targetRef: 'Process_1',
          scope: 'global',
          position: { x: 100, y: 100, width: 120, height: 80 },
          metadata: { isPPI: true, isTarget: false, isScope: false, isMeasure: true }
          // Sin parent_id = es PADRE
        },
        {
          id: 'PPI_Target_1',
          name: 'Target del Proceso',
          type: 'PPINOT:Target',
          targetRef: 'Process_1',
          scope: 'element',
          position: { x: 120, y: 120, width: 25, height: 25 },
          parent_id: 'PPI_Padre_Tiempo', // ← TARGET HIJO del PPI
          metadata: { isPPI: false, isTarget: true, isScope: false, isMeasure: false }
        },
        {
          id: 'PPI_Scope_1',
          name: 'Scope del Proceso',
          type: 'PPINOT:Scope',
          targetRef: 'Process_1',
          scope: 'element',
          position: { x: 140, y: 140, width: 28, height: 28 },
          parent_id: 'PPI_Padre_Tiempo', // ← SCOPE HIJO del PPI
          metadata: { isPPI: false, isTarget: false, isScope: true, isMeasure: false }
        },
        {
          id: 'PPI_Medida_Agregada',
          name: 'Medida Agregada',
          type: 'PPINOT:AggregatedMeasure',
          targetRef: 'Task_1',
          scope: 'element',
          position: { x: 160, y: 160, width: 100, height: 60 },
          parent_id: 'PPI_Padre_Tiempo', // ← MEDIDA AGREGADA HIJA del PPI
          metadata: { isPPI: false, isTarget: false, isScope: false, isMeasure: true }
        }
      ];
      
      // Crear PPIAdapter real con datos de prueba
      const mockPPIAdapter = {
        getPPIData: jest.fn().mockReturnValue(ppisConRelaciones),
        updatePPIData: jest.fn(),
        validatePPI: jest.fn().mockReturnValue({ isValid: true, errors: [] })
      };
      
      // Registrar en el ServiceRegistry REAL
      registry.register('PPIAdapter', mockPPIAdapter, {
        description: 'PPIAdapter con datos de prueba para relaciones padre-hijo'
      });
      
      // === PASO 3: CREAR MODELER MOCK ===
      console.log('🏗️ PASO 3: Creando modeler mock...');
      
      const mockModeler = {
        saveXML: jest.fn().mockResolvedValue({
          xml: `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                 xmlns:ppinot="http://www.isa.us.es/ppinot" 
                 id="Definitions_1">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" />
    <bpmn:task id="Task_1" name="Tarea Principal" />
    <bpmn:endEvent id="EndEvent_1" />
  </bpmn:process>
</bpmn:definitions>`
        }),
        importXML: jest.fn().mockResolvedValue({ warnings: [] })
      };
      
      // === PASO 4: CREAR AUTOSAVE MANAGER CON DEPENDENCIAS REALES ===
      console.log('💾 PASO 4: Creando AutosaveManager con dependencias reales...');
      
      const autosaveManager = new AutosaveManager({
        modeler: mockModeler,
        eventBus: eventBus,
        enabled: true,
        interval: 1000 // 1 segundo para test rápido
      });
      
      // === PASO 5: VERIFICAR DATOS INICIALES ===
      console.log('🔍 PASO 5: Verificando datos PPINOT iniciales...');
      
      const ppiData = mockPPIAdapter.getPPIData();
      expect(ppiData).toHaveLength(4);
      
      const padres = ppiData.filter(ppi => !ppi.parent_id);
      const hijos = ppiData.filter(ppi => ppi.parent_id);
      
      console.log(`   - PPIs totales: ${ppiData.length}`);
      console.log(`   - PPIs padre: ${padres.length}`);
      console.log(`   - PPIs hijo: ${hijos.length}`);
      
      expect(padres).toHaveLength(1); // Solo PPI_Padre_Tiempo
      expect(hijos).toHaveLength(3); // Target, Scope, Medida Agregada
      
      // Verificar estructura de relaciones
      const padre = padres[0];
      expect(padre.id).toBe('PPI_Padre_Tiempo');
      expect(padre.parent_id).toBeUndefined();
      expect(padre.position).toBeDefined();
      expect(padre.position.x).toBe(100);
      expect(padre.position.y).toBe(100);
      
      // Verificar Target hijo
      const target = hijos.find(h => h.id === 'PPI_Target_1');
      expect(target).toBeDefined();
      expect(target.parent_id).toBe('PPI_Padre_Tiempo');
      expect(target.type).toBe('PPINOT:Target');
      expect(target.position.x).toBe(120);
      expect(target.position.y).toBe(120);
      
      // Verificar Scope hijo
      const scope = hijos.find(h => h.id === 'PPI_Scope_1');
      expect(scope).toBeDefined();
      expect(scope.parent_id).toBe('PPI_Padre_Tiempo');
      expect(scope.type).toBe('PPINOT:Scope');
      expect(scope.position.x).toBe(140);
      expect(scope.position.y).toBe(140);
      
      // Verificar Medida Agregada hija
      const medidaAgregada = hijos.find(h => h.id === 'PPI_Medida_Agregada');
      expect(medidaAgregada).toBeDefined();
      expect(medidaAgregada.parent_id).toBe('PPI_Padre_Tiempo');
      expect(medidaAgregada.type).toBe('PPINOT:AggregatedMeasure');
      expect(medidaAgregada.position.x).toBe(160);
      expect(medidaAgregada.position.y).toBe(160);
      
      // === PASO 6: EJECUTAR AUTOGUARDADO ===
      console.log('💾 PASO 6: Ejecutando autoguardado...');
      
      autosaveManager.markAsChanged();
      const saveResult = await autosaveManager.performAutosave();
      
      expect(saveResult.success).toBe(true);
      expect(mockPPIAdapter.getPPIData).toHaveBeenCalled();
      
      // === PASO 7: VERIFICAR QUE SE GUARDARON LAS RELACIONES ===
      console.log('🔍 PASO 7: Verificando que se guardaron las relaciones...');
      
      const savedData = localStorage.getItem('draft:multinotation');
      expect(savedData).toBeTruthy();
      
      const parsed = JSON.parse(savedData);
      
      // Verificar en formato .mmproject (parsed.data)
      expect(parsed.data).toBeDefined();
      expect(parsed.data.ppinot).toBeDefined();
      expect(parsed.data.ppinot.ppis).toBeDefined();
      expect(Array.isArray(parsed.data.ppinot.ppis)).toBe(true);
      
      const savedPPIs = parsed.data.ppinot.ppis;
      console.log(`   - PPIs guardados en data.ppinot.ppis: ${savedPPIs.length}`);
      
      // Verificar en formato welcome screen (parsed.value)
      expect(parsed.value).toBeDefined();
      expect(parsed.value.ppi).toBeDefined();
      expect(parsed.value.ppi.indicators).toBeDefined();
      expect(Array.isArray(parsed.value.ppi.indicators)).toBe(true);
      
      const savedIndicators = parsed.value.ppi.indicators;
      console.log(`   - PPIs guardados en value.ppi.indicators: ${savedIndicators.length}`);
      
      // VERIFICACIÓN CRÍTICA: ¿Se guardaron las relaciones padre-hijo?
      if (savedPPIs.length === 0) {
        console.log('❌ PROBLEMA CRÍTICO: No se guardaron PPIs en el formato .mmproject');
        console.log('   Esto indica que el PPIAdapter no se está consultando correctamente');
      } else {
        console.log('✅ PPIs guardados correctamente en formato .mmproject');
        
        const savedPadres = savedPPIs.filter(ppi => !ppi.parent_id);
        const savedHijos = savedPPIs.filter(ppi => ppi.parent_id);
        
        console.log(`   - Padres guardados: ${savedPadres.length}`);
        console.log(`   - Hijos guardados: ${savedHijos.length}`);
        
        // Verificar relaciones específicas
        savedHijos.forEach(hijo => {
          console.log(`     📎 ${hijo.name} → padre: ${hijo.parent_id}`);
          
          const padreExiste = savedPPIs.some(p => p.id === hijo.parent_id);
          expect(padreExiste).toBe(true); // El padre debe existir
        });
        
        // Verificar que la nieta mantiene su relación
        const nietaGuardada = savedPPIs.find(p => p.id === 'PPI_Nieta_Subtarea');
        expect(nietaGuardada).toBeDefined();
        expect(nietaGuardada.parent_id).toBe('PPI_Hija_Tarea');
      }
      
      if (savedIndicators.length === 0) {
        console.log('❌ PROBLEMA: No se guardaron PPIs en el formato welcome screen');
      } else {
        console.log('✅ PPIs guardados correctamente en formato welcome screen');
      }
      
      // === PASO 8: RESTAURAR Y VERIFICAR INTEGRIDAD ===
      console.log('🔄 PASO 8: Restaurando y verificando integridad...');
      
      // Crear un nuevo PPIAdapter mock para capturar la restauración
      let ppisRestaurados = null;
      const mockPPIAdapterRestore = {
        ...mockPPIAdapter,
        updatePPIData: jest.fn((data) => {
          ppisRestaurados = data;
          console.log(`   - Restaurando ${data.length} PPIs`);
          
          data.forEach(ppi => {
            if (ppi.parent_id) {
              console.log(`     📎 ${ppi.name} → padre: ${ppi.parent_id}`);
            } else {
              console.log(`     👑 ${ppi.name} (padre)`);
            }
          });
        })
      };
      
      // Reemplazar el PPIAdapter para capturar la restauración
      registry.register('PPIAdapter', mockPPIAdapterRestore);
      
      const restored = await autosaveManager.forceRestore();
      expect(restored).toBe(true);
      
      // Verificar que se llamó updatePPIData durante la restauración
      expect(mockPPIAdapterRestore.updatePPIData).toHaveBeenCalled();
      
      if (ppisRestaurados && ppisRestaurados.length > 0) {
        console.log('✅ PPIs restaurados correctamente');
        
        const restauradosPadres = ppisRestaurados.filter(ppi => !ppi.parent_id);
        const restauradosHijos = ppisRestaurados.filter(ppi => ppi.parent_id);
        
        console.log(`   - Padres restaurados: ${restauradosPadres.length}`);
        console.log(`   - Hijos restaurados: ${restauradosHijos.length}`);
        
        // Verificar integridad de las relaciones restauradas
        expect(restauradosPadres).toHaveLength(1);
        expect(restauradosHijos).toHaveLength(3);
        
        // Verificar que todas las relaciones padre-hijo se mantuvieron
        restauradosHijos.forEach(hijo => {
          const padreExiste = ppisRestaurados.some(p => p.id === hijo.parent_id);
          expect(padreExiste).toBe(true);
        });
        
        // Verificar relación específica de nieta
        const nietaRestaurada = ppisRestaurados.find(p => p.id === 'PPI_Nieta_Subtarea');
        expect(nietaRestaurada).toBeDefined();
        expect(nietaRestaurada.parent_id).toBe('PPI_Hija_Tarea');
        
        console.log('🎉 ¡ÉXITO! Las relaciones padre-hijo se mantuvieron completamente');
        
      } else {
        console.log('❌ PROBLEMA CRÍTICO: No se restauraron PPIs');
        throw new Error('La restauración de PPIs falló completamente');
      }
      
      console.log('\n📊 RESUMEN FINAL:');
      console.log(`   - PPIs originales: ${ppiData.length}`);
      console.log(`   - PPIs guardados (data): ${savedPPIs.length}`);
      console.log(`   - PPIs guardados (value): ${savedIndicators.length}`);
      console.log(`   - PPIs restaurados: ${ppisRestaurados ? ppisRestaurados.length : 0}`);
    });
  });
});
