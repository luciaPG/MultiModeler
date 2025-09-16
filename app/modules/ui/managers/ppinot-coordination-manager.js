// === PPINOT Coordination Manager ===
// Sistema centralizado para coordinar la restauración de elementos PPINOT
// Evita conflictos y garantiza restauración en el momento correcto

import { getServiceRegistry } from '../core/ServiceRegistry.js';
import ppinotStorageManager from './ppinot-storage-manager.js';

class PPINOTCoordinationManager {
  constructor() {
    this.restorationState = {
      isInitialized: false,
      isRestoring: false,
      hasRestored: false,
      modelerReady: false,
      dataLoaded: false,
      lastRestorationAttempt: 0,
      restorationCount: 0
    };
    
    this.restorationTriggers = new Set();
    this.maxRestorationAttempts = 3;
    this.restorationCooldown = 0; // Optimización INSTANTÁNEA: Sin cooldown entre intentos
    
    this.init();
  }

  init() {
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('🎯 Inicializando PPINOT Coordination Manager...');
    this.setupModelerWatcher();
    this.setupDataWatcher();
    this.setupRestorationTriggers();
    this.setupAutoRestoration();
  }

  // === OBSERVADORES DEL SISTEMA ===

  setupModelerWatcher() {
    const checkModeler = () => {
      const registry = getServiceRegistry && getServiceRegistry();
      const modeler = registry?.get('BpmnModeler');
      
      if (modeler && !this.restorationState.modelerReady) {
        // Verificar que el modeler esté completamente funcional
        try {
          const elementRegistry = modeler.get('elementRegistry');
          const modeling = modeler.get('modeling');
          const canvas = modeler.get('canvas');
          
          if (elementRegistry && modeling && canvas) {
            this.restorationState.modelerReady = true;
            this.attemptRestoration();
          } else {
            setTimeout(checkModeler, 500);
          }
        } catch (error) {
          setTimeout(checkModeler, 500);
        }
      } else if (!modeler) {
        setTimeout(checkModeler, 500);
      }
    };
    
    checkModeler();
  }

  setupDataWatcher() {
    const checkData = () => {
      const ppinotData = ppinotStorageManager.loadPPINOTElements();
      
      if (ppinotData.elements.length > 0 && !this.restorationState.dataLoaded) {
        this.restorationState.dataLoaded = true;
        // Optimización: Log eliminado para mejorar rendimiento
        // console.log(`📊 Datos PPINOT disponibles: ${ppinotData.elements.length} elementos`);
        this.attemptRestoration();
      } else if (ppinotData.elements.length === 0) {
        // Revisar cada 2 segundos si hay datos nuevos
        setTimeout(checkData, 2000);
      }
    };
    
    checkData();
  }

  setupRestorationTriggers() {
    // Escuchar eventos de cambio en el canvas
    const setupCanvasListeners = () => {
      const registry = getServiceRegistry && getServiceRegistry();
      const modeler = registry?.get('BpmnModeler');
      
      if (modeler) {
        const eventBus = modeler.get('eventBus');
        
        // Escuchar cuando se cargan diagramas
        eventBus.on('diagram.loaded', () => {
          console.log('📄 Diagrama cargado, verificando restauración PPINOT...');
          this.triggerRestoration('diagram.loaded');
        });
        
        // Escuchar cuando se importan elementos
        eventBus.on('commandStack.shape.create.postExecute', (event) => {
          if (event.context && event.context.shape && 
              (event.context.shape.type.includes('PPINOT') || 
               event.context.shape.businessObject?.$type?.includes('PPINOT'))) {
            this.triggerRestoration('element.created');
          }
        });
        
      } else {
        setTimeout(setupCanvasListeners, 1000);
      }
    };
    
    setupCanvasListeners();
  }

  setupAutoRestoration() {
        // Optimización: Log eliminado para mejorar rendimiento
        // console.log('🔄 Configurando auto-restauración...');
    
    // Verificar si hay datos para restaurar al cargar la página
    const checkForData = () => {
      try {
        const ppinotData = ppinotStorageManager.loadPPINOTElements();
        if (ppinotData.elements.length > 0) {
          // Optimización: Reducir logs de debug para mejorar rendimiento
          // console.log(`📊 Datos PPINOT encontrados: ${ppinotData.elements.length} elementos`);
          
          const targetCount = ppinotData.elements.filter(el => el.metadata?.isTarget).length;
          const scopeCount = ppinotData.elements.filter(el => el.metadata?.isScope).length;
          
          if (targetCount > 0 || scopeCount > 0) {
            // Optimización: Reducir logs de debug para mejorar rendimiento
            // console.log(`🎯 Elementos Target/Scope encontrados: ${targetCount} Targets, ${scopeCount} Scopes`);
            // console.log('🔄 Disparando restauración automática...');
            this.triggerRestoration('page.load');
          } else {
            // Optimización: Reducir logs de debug para mejorar rendimiento
            // console.log('ℹ️ No hay elementos Target/Scope para restaurar');
          }
        } else {
          // Optimización: Reducir logs de debug para mejorar rendimiento
          // console.log('ℹ️ No hay datos PPINOT para restaurar');
        }
      } catch (error) {
        console.log('❌ Error verificando datos PPINOT:', error.message);
      }
    };
    
    // Verificar inmediatamente - SIN timeouts adicionales para evitar recargas
    checkForData();
  }

  // === GESTIÓN DE TRIGGERS ===

  triggerRestoration(source) {
    const now = Date.now();
    
    // Verificar cooldown
    if (now - this.restorationState.lastRestorationAttempt < this.restorationCooldown) {
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log(`⏳ Restauración en cooldown, ignorando trigger desde ${source}`);
      return;
    }
    
    // Verificar límite de intentos
    if (this.restorationState.restorationCount >= this.maxRestorationAttempts) {
      console.log(`🚫 Límite de intentos de restauración alcanzado (${this.maxRestorationAttempts})`);
      return;
    }
    
    // Verificar si ya se está restaurando
    if (this.restorationState.isRestoring) {
      console.log(`🔄 Restauración ya en progreso, ignorando trigger desde ${source}`);
      return;
    }
    
    // Verificar si ya existe este trigger
    if (this.restorationTriggers.has(source)) {
      // Trigger ya registrado - silenciar para evitar spam
      return;
    }
    
    this.restorationTriggers.add(source);
      // Optimización: Log eliminado para mejorar rendimiento
      // console.log(`🎯 Trigger de restauración desde: ${source}`);
    
    // Restauración INSTANTÁNEA - sin delay para máxima velocidad
    this.attemptRestoration();
  }

  // === LÓGICA DE RESTAURACIÓN ===

  async attemptRestoration() {
    // Verificar condiciones previas
    if (!this.canRestore()) {
      return false;
    }
    
    // Verificar si ya se restauró exitosamente
    if (this.restorationState.hasRestored) {
      console.log('✅ Elementos PPINOT ya restaurados exitosamente');
      return true;
    }
    
    // Verificar si ya hay una restauración en progreso
    if (this.restorationState.isRestoring) {
      console.log('⏳ Restauración ya en progreso...');
      return false;
    }
    
    this.restorationState.isRestoring = true;
    this.restorationState.lastRestorationAttempt = Date.now();
    this.restorationState.restorationCount++;
    
    // Optimización: Logs eliminados para mejorar rendimiento
    // console.log(`🔄 Intento de restauración #${this.restorationState.restorationCount}`);
    // console.log(`🎯 Triggers activos: ${Array.from(this.restorationTriggers).join(', ')}`);
    
    try {
      // Suspender autoguardado durante la restauración para evitar que sobreescriba storage sin Target/Scope
      const registry = getServiceRegistry && getServiceRegistry();
      const autoSaveMgr = registry?.get('localStorageAutoSaveManager');
      if (autoSaveMgr && typeof autoSaveMgr.suspendAutoSave === 'function') {
        autoSaveMgr.suspendAutoSave();
      }

      const success = await this.performRestoration();
      
      if (success) {
        this.restorationState.hasRestored = true;
        // Optimización: Log eliminado para mejorar rendimiento
        // console.log('✅ Restauración PPINOT completada exitosamente');
        this.clearTriggers();
        return true;
      } else {
        console.log('⚠️ Restauración falló, se reintentará si hay más triggers');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error en restauración PPINOT:', error);
      return false;
    } finally {
      // Reanudar autoguardado tras la restauración
      try {
        const registry2 = getServiceRegistry && getServiceRegistry();
        const autoSaveMgr2 = registry2?.get('localStorageAutoSaveManager');
        if (autoSaveMgr2 && typeof autoSaveMgr2.resumeAutoSave === 'function') {
          autoSaveMgr2.resumeAutoSave();
        }
      } catch (_) { /* no-op */ }
      this.restorationState.isRestoring = false;
    }
  }

  canRestore() {
    const conditions = {
      modelerReady: this.restorationState.modelerReady,
      dataLoaded: this.restorationState.dataLoaded,
      notRestoring: !this.restorationState.isRestoring,
      notAlreadyRestored: !this.restorationState.hasRestored,
      hasTriggers: this.restorationTriggers.size > 0
    };
    
        // Optimización: Log eliminado para mejorar rendimiento
        // console.log('🔍 Condiciones de restauración:', conditions);
    
    return Object.values(conditions).every(condition => condition);
  }

  async performRestoration() {
    try {
      // Delegar restauración al gestor principal de autosave para evitar duplicidad
      const ppinotData = ppinotStorageManager.loadPPINOTElements();
      if (ppinotData.elements.length === 0) {
        console.log('ℹ️ No hay elementos PPINOT para restaurar');
        return true;
      }

      const registry = getServiceRegistry && getServiceRegistry();
      const autoSaveMgr = registry?.get('localStorageAutoSaveManager');
      if (autoSaveMgr && typeof autoSaveMgr.restorePPIState === 'function') {
        console.log('🤝 Delegando restauración PPINOT a LocalStorageAutoSaveManager.restorePPIState()');
        const ok = await autoSaveMgr.restorePPIState();
        if (ok) {
          this.syncWithOtherSystems();
          return true;
        }
        // Fallback si no se restauró nada desde autosave
        console.log('⚠️ Autosave no restauró elementos PPINOT, aplicando fallback directo');
      }

      // Fallback directo: recrear Target/Scope vinculados con PPIs actuales a partir de storage
      const modeler = registry?.get('BpmnModeler');
      if (!modeler) return false;
      const elementRegistry = modeler.get('elementRegistry');
      const ppiOnCanvas = elementRegistry.getAll().filter(el => el && (el.type === 'PPINOT:Ppi' || el.businessObject?.$type === 'PPINOT:Ppi'));
      const currentPpiIds = new Set(ppiOnCanvas.map(p => p.id));

      const isTarget = (el) => (el.metadata && el.metadata.isTarget) || (typeof el.type === 'string' && el.type.indexOf('Target') >= 0) || (el.id && el.id.indexOf('Target') >= 0) || (el.name && /target/i.test(el.name));
      const isScope = (el) => (el.metadata && el.metadata.isScope) || (typeof el.type === 'string' && el.type.indexOf('Scope') >= 0) || (el.id && el.id.indexOf('Scope') >= 0) || (el.name && /scope/i.test(el.name));
      const targets = ppinotData.elements.filter(el => isTarget(el) && currentPpiIds.has(el.parentId));
      const scopes = ppinotData.elements.filter(el => isScope(el) && currentPpiIds.has(el.parentId));

      if (targets.length === 0 && scopes.length === 0) {
        return true; // Nada que restaurar
      }

      await this.restoreElements(modeler, targets, scopes);
      if (ppinotData.relationships && ppinotData.relationships.length) {
        await this.restoreRelationships(modeler, ppinotData.relationships);
      }
      this.syncWithOtherSystems();
      // Guardar estado actualizado inmediatamente (evita perder Target/Scope en la siguiente recarga)
      try {
        const ppiCore = registry?.get('PPICore');
        if (ppiCore && typeof ppiCore.forceSavePPINOTElements === 'function') {
          ppiCore.forceSavePPINOTElements();
        }
      } catch (_) { /* no-op */ }
      return true;
      
    } catch (error) {
      console.error('❌ Error en performRestoration:', error);
      return false;
    }
  }

  // === RESTAURACIÓN DE ELEMENTOS ===

  async restoreElements(modeler, targetElements, scopeElements) {
    try {
      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      const elementRegistry = modeler.get('elementRegistry');
      const rootElement = canvas.getRootElement();
      
      // Buscar PPI principal para posicionamiento
      const ppiElement = elementRegistry.filter(element => 
        element.businessObject && element.businessObject.$type === 'PPINOT:ppi'
      )[0];
      
      let basePosition = { x: 100, y: 100 };
      if (ppiElement) {
        const ppiBounds = ppiElement.bounds;
        basePosition = {
          x: ppiBounds.x + ppiBounds.width + 20,
          y: ppiBounds.y + 50
        };
      }
      
      // Restaurar Targets
      for (let i = 0; i < targetElements.length; i++) {
        const targetData = targetElements[i];
        await this.createElement(modeler, targetData, 'Target', basePosition, 0, i);
      }
      
      // Restaurar Scopes
      for (let i = 0; i < scopeElements.length; i++) {
        const scopeData = scopeElements[i];
        await this.createElement(modeler, scopeData, 'Scope', basePosition, 100, i);
      }
      
    } catch (error) {
      console.error('❌ Error restaurando elementos:', error);
      throw error;
    }
  }

  async createElement(modeler, elementData, type, basePosition, offsetX, index) {
    try {
      // Validar datos de entrada
      if (!elementData || !elementData.id) {
        console.warn(`⚠️ Datos de elemento ${type} inválidos:`, elementData);
        return null;
      }
      
      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      const elementRegistry = modeler.get('elementRegistry');
      const rootElement = canvas.getRootElement();
      
      // Verificar si ya existe
      const existingElement = elementRegistry.get(elementData.id);
      if (existingElement) {
        console.log(`ℹ️ ${type} ya existe: ${elementData.id}`);
        return existingElement;
      }
      
      // Crear elemento con propiedades correctas
      const element = elementFactory.create('shape', {
        type: `PPINOT:${type}`,
        width: type === 'Target' ? 25 : 28,
        height: type === 'Target' ? 25 : 28,
        id: elementData.id,
        name: elementData.name || type
      });
      
      // No modificar businessObject directamente para evitar errores de $type
      
      element._hasExternalLabel = true;
      
      // Posicionar
      const position = { 
        x: basePosition.x + offsetX, 
        y: basePosition.y + index * 60 
      };
      
      // Crear en canvas
      const createdElement = modeling.createShape(element, position, rootElement);
      
      // Crear label
      const labelShape = elementFactory.createLabel({
        businessObject: createdElement.businessObject,
        type: 'label',
        labelTarget: createdElement,
        width: 50,
        height: 20
      });
      
      const labelPosition = {
        x: position.x + (type === 'Target' ? 30 : -30),
        y: position.y
      };
      
      const createdLabel = modeling.createShape(labelShape, labelPosition, rootElement);
      createdElement.label = createdLabel;
      createdLabel.labelTarget = createdElement;
      
      console.log(`✅ ${type} creado: ${createdElement.id}`);
      return createdElement;
      
    } catch (error) {
      console.error(`❌ Error creando ${type} ${elementData?.id || 'unknown'}:`, error);
      // No lanzar el error para evitar interrumpir la restauración de otros elementos
      console.warn(`⚠️ Continuando con la restauración de otros elementos...`);
      return null;
    }
  }

  // === RESTAURACIÓN DE RELACIONES ===

  async restoreRelationships(modeler, relationships) {
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      console.log(`🔗 Restaurando ${relationships.length} relaciones...`);
      
      for (const relationship of relationships) {
        try {
          const childElement = elementRegistry.get(relationship.childId);
          const parentElement = elementRegistry.get(relationship.parentId);
          
          if (!childElement || !parentElement) {
            console.log(`⚠️ Elementos no encontrados para relación: ${relationship.childId} -> ${relationship.parentId}`);
            continue;
          }
          
          // Establecer relación en business object
          if (childElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
            
            if (parentElement.businessObject && parentElement.businessObject.$type === 'PPINOT:ppi') {
              if (!parentElement.businessObject.children) {
                parentElement.businessObject.children = [];
              }
              if (!parentElement.businessObject.children.includes(childElement.businessObject)) {
                parentElement.businessObject.children.push(childElement.businessObject);
              }
            }
          }
          
          console.log(`✅ Relación establecida: ${childElement.id} -> ${parentElement.id}`);
          
        } catch (error) {
          console.error(`❌ Error creando relación ${relationship.childId} -> ${relationship.parentId}:`, error);
        }
      }
      
    } catch (error) {
      console.error('❌ Error restaurando relaciones:', error);
      throw error;
    }
  }

  // === SINCRONIZACIÓN ===

  syncWithOtherSystems() {
    try {
      ppinotStorageManager.syncWithImportExport();
      ppinotStorageManager.syncWithAutoSave();
      console.log('🔄 Sincronización con otros sistemas completada');
    } catch (error) {
      console.error('❌ Error sincronizando con otros sistemas:', error);
    }
  }

  // === UTILIDADES ===

  clearTriggers() {
    this.restorationTriggers.clear();
  }

  reset() {
    this.restorationState = {
      isInitialized: false,
      isRestoring: false,
      hasRestored: false,
      modelerReady: false,
      dataLoaded: false,
      lastRestorationAttempt: 0,
      restorationCount: 0
    };
    this.clearTriggers();
    console.log('🔄 PPINOT Coordination Manager reiniciado');
  }

  getStatus() {
    return {
      ...this.restorationState,
      activeTriggers: Array.from(this.restorationTriggers),
      canRestore: this.canRestore()
    };
  }

  // === MÉTODOS PÚBLICOS ===

  forceRestoration() {
    console.log('🚀 Forzando restauración PPINOT...');
    this.restorationState.hasRestored = false;
    this.restorationState.restorationCount = 0;
    this.clearTriggers();
    this.triggerRestoration('manual.force');
  }

  isReady() {
    return this.restorationState.modelerReady && this.restorationState.dataLoaded;
  }

  // === MÉTODOS DE DEBUG ===

  createTestElements() {
    try {
      console.log('🧪 Creando elementos Target y Scope de prueba...');
      
      const registry = getServiceRegistry && getServiceRegistry();
      const modeler = registry?.get('BpmnModeler');
      
      if (!modeler) {
        console.error('❌ Modeler no disponible para crear elementos de prueba');
        return false;
      }
      
      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const canvas = modeler.get('canvas');
      const rootElement = canvas.getRootElement();
      
      // Crear Target
      const targetElement = elementFactory.create('shape', {
        type: 'PPINOT:Target',
        width: 25,
        height: 25
      });
      
      if (targetElement.businessObject) {
        // No establecer $type directamente, ya está definido por el tipo
        targetElement.businessObject.id = 'TestTarget_' + Date.now();
        targetElement.businessObject.name = 'Test Target';
      }
      
      const targetPosition = { x: 200, y: 100 };
      const createdTarget = modeling.createShape(targetElement, targetPosition, rootElement);
      
      // Crear Scope
      const scopeElement = elementFactory.create('shape', {
        type: 'PPINOT:Scope',
        width: 28,
        height: 28
      });
      
      if (scopeElement.businessObject) {
        // No establecer $type directamente, ya está definido por el tipo
        scopeElement.businessObject.id = 'TestScope_' + Date.now();
        scopeElement.businessObject.name = 'Test Scope';
      }
      
      const scopePosition = { x: 300, y: 100 };
      const createdScope = modeling.createShape(scopeElement, scopePosition, rootElement);
      
      console.log('✅ Elementos de prueba creados:', {
        target: createdTarget.id,
        scope: createdScope.id
      });
      
      // Forzar restauración después de crear elementos
      setTimeout(() => {
        this.forceRestoration();
      }, 1000);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error creando elementos de prueba:', error);
      return false;
    }
  }

  debugElements() {
    try {
      console.log('🔍 Debug de elementos PPINOT...');
      
      const registry = getServiceRegistry && getServiceRegistry();
      const modeler = registry?.get('BpmnModeler');
      
      if (!modeler) {
        console.error('❌ Modeler no disponible para debug');
        return;
      }
      
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      console.log(`📊 Total de elementos en el canvas: ${allElements.length}`);
      
      // Buscar elementos PPINOT
      const ppiElements = allElements.filter(el => 
        el.type === 'PPINOT:Ppi' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
      );
      
      const targetElements = allElements.filter(el => 
        el.type === 'PPINOT:Target' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Target') ||
        el.id.includes('Target') ||
        (el.businessObject && el.businessObject.name && 
         el.businessObject.name.toLowerCase().includes('target'))
      );
      
      const scopeElements = allElements.filter(el => 
        el.type === 'PPINOT:Scope' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Scope') ||
        el.id.includes('Scope') ||
        (el.businessObject && el.businessObject.name && 
         el.businessObject.name.toLowerCase().includes('scope'))
      );
      
      console.log(`🎯 PPI Elements: ${ppiElements.length}`);
      ppiElements.forEach(el => console.log(`  - ${el.id} (${el.type})`));
      
      console.log(`🎯 Target Elements: ${targetElements.length}`);
      targetElements.forEach(el => console.log(`  - ${el.id} (${el.type}) - Name: ${el.businessObject?.name || 'N/A'}`));
      
      console.log(`🎯 Scope Elements: ${scopeElements.length}`);
      scopeElements.forEach(el => console.log(`  - ${el.id} (${el.type}) - Name: ${el.businessObject?.name || 'N/A'}`));
      
      // Verificar datos en localStorage
      const ppinotData = ppinotStorageManager.loadPPINOTElements();
      console.log(`💾 Datos en localStorage: ${ppinotData.elements.length} elementos, ${ppinotData.relationships.length} relaciones`);
      
      return {
        totalElements: allElements.length,
        ppiElements: ppiElements.length,
        targetElements: targetElements.length,
        scopeElements: scopeElements.length,
        localStorageElements: ppinotData.elements.length,
        localStorageRelationships: ppinotData.relationships.length
      };
      
    } catch (error) {
      console.error('❌ Error en debug de elementos:', error);
      return null;
    }
  }
}

// Crear instancia singleton
const ppinotCoordinationManager = new PPINOTCoordinationManager();

// Registrar en ServiceRegistry
if (typeof getServiceRegistry === 'function') {
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('PPINOTCoordinationManager', ppinotCoordinationManager, {
      description: 'Coordinación centralizada para restauración de elementos PPINOT'
    });
  }
}

// Exponer funciones de debug globalmente
if (typeof window !== 'undefined') {
  window.debugPPINOT = {
    forceRestoration: () => ppinotCoordinationManager.forceRestoration(),
    getStatus: () => ppinotCoordinationManager.getStatus(),
    reset: () => ppinotCoordinationManager.reset(),
    triggerRestoration: (source) => ppinotCoordinationManager.triggerRestoration(source),
    createTestElements: () => ppinotCoordinationManager.createTestElements(),
    debugElements: () => ppinotCoordinationManager.debugElements()
  };
  
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('🔧 Funciones de debug PPINOT disponibles: window.debugPPINOT');
}

// === FUNCIONES DE DEBUG ADICIONALES ===

function debugPPINOTData() {
  const ppinotData = ppinotStorageManager.loadPPINOTElements();
  console.log('🔍 Datos PPINOT disponibles:');
  console.log(`  - Total elementos: ${ppinotData.elements.length}`);
  console.log(`  - Total relaciones: ${ppinotData.relationships.length}`);
  
  const ppiElements = ppinotData.elements.filter(el => el.metadata?.isPPI);
  const targetElements = ppinotData.elements.filter(el => el.metadata?.isTarget);
  const scopeElements = ppinotData.elements.filter(el => el.metadata?.isScope);
  
  console.log(`  - PPIs: ${ppiElements.length}`);
  console.log(`  - Targets: ${targetElements.length}`);
  console.log(`  - Scopes: ${scopeElements.length}`);
  
  ppinotData.elements.forEach(el => {
    console.log(`    - ${el.id} (${el.type}) - isPPI: ${el.metadata?.isPPI}, isTarget: ${el.metadata?.isTarget}, isScope: ${el.metadata?.isScope}`);
  });
}

function debugElementDetection() {
  const modeler = resolve('BpmnModeler');
  if (!modeler) {
    console.log('❌ Modeler no disponible');
    return;
  }
  
  const elementRegistry = modeler.get('elementRegistry');
  const allElements = elementRegistry.getAll();
  
  console.log('🔍 Análisis de detección de elementos:');
  console.log(`  - Total elementos en canvas: ${allElements.length}`);
  
  const ppiElements = allElements.filter(el => 
    el.type === 'PPINOT:Ppi' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
  );
  
  const targetElements = allElements.filter(el => 
    el.type === 'PPINOT:Target' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Target') ||
    el.id?.includes('Target')
  );
  
  const scopeElements = allElements.filter(el => 
    el.type === 'PPINOT:Scope' || 
    (el.businessObject && el.businessObject.$type === 'PPINOT:Scope') ||
    el.id?.includes('Scope')
  );
  
  console.log(`  - PPIs detectados: ${ppiElements.length}`);
  console.log(`  - Targets detectados: ${targetElements.length}`);
  console.log(`  - Scopes detectados: ${scopeElements.length}`);
  
  ppiElements.forEach(el => console.log(`    - PPI: ${el.id} (${el.type})`));
  targetElements.forEach(el => console.log(`    - Target: ${el.id} (${el.type})`));
  scopeElements.forEach(el => console.log(`    - Scope: ${el.id} (${el.type})`));
}

// Función para forzar la creación de elementos Target/Scope
function forceCreateTargetScope() {
  console.log('🔧 Forzando creación de elementos Target/Scope...');
  
  if (typeof resolve !== 'undefined') {
    const modeler = resolve('BpmnModeler');
    if (modeler) {
      const elementFactory = modeler.get('elementFactory');
      const modeling = modeler.get('modeling');
      const elementRegistry = modeler.get('elementRegistry');
      const canvas = modeler.get('canvas');
      const rootElement = canvas.getRootElement();
      
      // Buscar PPIs existentes
      const ppiElements = elementRegistry.getAll().filter(el => 
        el.type === 'PPINOT:Ppi' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Ppi')
      );
      
      if (ppiElements.length === 0) {
        console.log('❌ No se encontraron PPIs para asociar Target/Scope');
        return false;
      }
      
      console.log(`🔍 Encontrados ${ppiElements.length} PPIs`);
      
      let createdCount = 0;
      ppiElements.forEach((ppi, index) => {
        const ppiBounds = ppi.bounds || { x: 100, y: 100 };
        
        // Crear Target
        const targetElement = elementFactory.create('shape', {
          type: 'PPINOT:Target',
          width: 25,
          height: 25
        });
        
        if (targetElement.businessObject) {
          // No establecer $type directamente, ya está definido por el tipo
          targetElement.businessObject.id = `ForceTarget_${ppi.id}_${Date.now()}`;
          targetElement.businessObject.name = `Target for ${ppi.businessObject?.name || ppi.id}`;
        }
        
        targetElement._hasExternalLabel = true;
        
        const targetPosition = { 
          x: ppiBounds.x + 150, 
          y: ppiBounds.y + (index * 80)
        };
        
        const createdTarget = modeling.createShape(targetElement, targetPosition, rootElement);
        console.log(`✅ Target creado: ${createdTarget.id}`);
        createdCount++;
        
        // Crear Scope
        const scopeElement = elementFactory.create('shape', {
          type: 'PPINOT:Scope',
          width: 28,
          height: 28
        });
        
        if (scopeElement.businessObject) {
          // No establecer $type directamente, ya está definido por el tipo
          scopeElement.businessObject.id = `ForceScope_${ppi.id}_${Date.now()}`;
          scopeElement.businessObject.name = `Scope for ${ppi.businessObject?.name || ppi.id}`;
        }
        
        scopeElement._hasExternalLabel = true;
        
        const scopePosition = { 
          x: ppiBounds.x + 150, 
          y: ppiBounds.y + (index * 80) + 40
        };
        
        const createdScope = modeling.createShape(scopeElement, scopePosition, rootElement);
        console.log(`✅ Scope creado: ${createdScope.id}`);
        createdCount++;
      });
      
      console.log(`🎉 Creados ${createdCount} elementos Target/Scope`);
      
      // Disparar sincronización
      setTimeout(() => {
        if (typeof ppinotCoordinationManager !== 'undefined') {
          ppinotCoordinationManager.triggerRestoration('manual.creation');
        }
      }, 500);
      
      return true;
    } else {
      console.log('❌ Modeler no disponible');
      return false;
    }
  } else {
    console.log('❌ resolve no disponible');
    return false;
  }
}

// Hacer las funciones disponibles globalmente
if (typeof window !== 'undefined') {
  window.debugPPINOTData = debugPPINOTData;
  window.debugElementDetection = debugElementDetection;
  window.forceCreateTargetScope = forceCreateTargetScope;
}

export default ppinotCoordinationManager;
