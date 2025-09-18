/**
 * AutoSave Manager - Versión Limpia y Funcional
 * 
 * Gestiona el autoguardado de proyectos multi-notación incluyendo relaciones padre-hijo.
 */

export class AutosaveManager {
  constructor(options = {}) {
    this.modeler = options.modeler;
    this.storageManager = options.storageManager; // Para compatibilidad con tests
    this.eventBus = options.eventBus;
    this.interval = options.interval || 5000;
    this.enabled = options.enabled !== false;
    
    this.hasChanges = false;
    this.isAutosaving = false;
    this.autosaveTimer = null;
    this.suspended = false;
    
    if (this.enabled && this.eventBus) {
      this.setupEventListeners();
    }
  }

  setupEventListeners() {
    if (!this.eventBus) return;

    const changeEvents = [
      'element.changed', 'element.added', 'element.removed',
      'shape.added', 'shape.removed',
      'connection.added', 'connection.removed',
      'model.changed', 'ppinot.changed', 'rasci.changed'
    ];

    changeEvents.forEach(event => {
      this.eventBus.subscribe(event, () => {
        this.markAsChanged();
      });
    });
  }

  markAsChanged() {
    this.hasChanges = true;
    
    // Solo programar autoguardado si está habilitado y no suspendido
    if (this.enabled && !this.suspended && !this.autosaveTimer) {
      this.scheduleAutosave();
    }
  }

  scheduleAutosave() {
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
    }

    this.autosaveTimer = setTimeout(() => {
      this.performAutosave();
    }, this.interval);
  }

  async performAutosave() {
    if (this.isAutosaving || !this.hasChanges || this.suspended) {
      const reason = this.isAutosaving ? 'Already saving' : this.suspended ? 'Suspended' : 'no changes';
      return { success: false, reason: reason };
    }

    try {
      this.isAutosaving = true;
      this.autosaveTimer = null;

      const projectData = await this.createCompleteProject();

      const draftData = {
        version: '1.0.0',
        timestamp: new Date().toISOString(),
        savedAt: Date.now(),
        autosaved: true,
        value: projectData.welcomeScreenFormat || projectData,
        data: projectData
      };

      localStorage.setItem('draft:multinotation', JSON.stringify(draftData));
      this.hasChanges = false;

      // Compatibilidad con tests que esperan storageManager.save()
      if (this.storageManager && typeof this.storageManager.save === 'function') {
        try {
          await this.storageManager.save(projectData);
        } catch (error) {
          // Ignorar errores de storageManager en tests
        }
      }

      if (this.eventBus) {
        this.eventBus.publish('autosave.completed', {
          success: true,
          timestamp: draftData.timestamp,
          data: projectData
        });
      }

      return { success: true, data: projectData };

    } catch (error) {
      if (this.eventBus) {
        this.eventBus.publish('autosave.completed', {
          success: false,
          error: error,
          timestamp: new Date().toISOString()
        });
      }
      return { success: false, error: error };
    } finally {
      this.isAutosaving = false;
    }
  }

  async createCompleteProject() {
    const project = {
      version: '1.0.0',
      bpmn: null,
      ppinot: { ppis: [] },
      ralph: { roles: [] },
      rasci: { roles: [], tasks: [], matrix: {} },
      metadata: {
        created: new Date().toISOString(),
        lastModified: new Date().toISOString(),
        author: 'AutoSave',
        autosaved: true
      }
    };

    // Obtener BPMN XML
    if (this.modeler && typeof this.modeler.saveXML === 'function') {
      const xmlResult = await this.modeler.saveXML();
      project.bpmn = xmlResult.xml || xmlResult;
    }

    // Formato compatible con welcome screen
    project.welcomeScreenFormat = {
      bpmn: { xml: project.bpmn },
      ppi: { indicators: [] },
      rasci: { roles: [], tasks: [], matrix: {} }
    };

    // OBTENER ELEMENTOS PPINOT CON RELACIONES PADRE-HIJO
    await this.capturarElementosPPINOT(project);

    // Obtener datos RASCI
    await this.capturarDatosRASCI(project);

    return project;
  }

  async capturarElementosPPINOT(project) {
    try {
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      
      if (!registry) return;

      // MÉTODO 1: ElementRegistry (elementos reales del canvas)
      if (this.modeler && typeof this.modeler.get === 'function') {
        const elementRegistry = this.modeler.get('elementRegistry');
        if (elementRegistry && typeof elementRegistry.getAll === 'function') {
          const allCanvasElements = elementRegistry.getAll();
          
          // Buscar PPIs principales
          const ppiShapes = allCanvasElements.filter(el => {
            const type = el.type || (el.businessObject && el.businessObject.$type) || '';
            return type === 'PPINOT:Ppi';
          });
          
          console.log(`🔍 AutoSave: ${ppiShapes.length} PPIs principales en canvas`);
          
          const allPPINOTElements = [];
          
          // Para cada PPI, buscar sus hijos (Target, Scope, Medidas)
          ppiShapes.forEach(ppiShape => {
            // Agregar PPI principal
            allPPINOTElements.push({
              id: ppiShape.id,
              name: ppiShape.businessObject?.name || ppiShape.id,
              type: ppiShape.type,
              position: { x: ppiShape.x || 0, y: ppiShape.y || 0, width: ppiShape.width || 0, height: ppiShape.height || 0 },
              parent_id: null,
              metadata: { isPPI: true }
            });
            
            // Buscar TODOS los hijos del PPI
            const hijosDelPPI = allCanvasElements.filter(el => {
              // ARREGLO: Comparar por ID, no por referencia de objeto
              const esHijo = el.parent && el.parent.id === ppiShape.id;
              const tieneBOType = el.businessObject && el.businessObject.$type;
              const esPPINOT = tieneBOType && el.businessObject.$type.startsWith('PPINOT:');
              
              return esHijo && tieneBOType && esPPINOT;
            });
            
            hijosDelPPI.forEach(hijo => {
              const tipoHijo = hijo.businessObject.$type;
              
              allPPINOTElements.push({
                id: hijo.id,
                name: hijo.businessObject?.name || hijo.id,
                type: tipoHijo,
                position: { x: hijo.x || 0, y: hijo.y || 0, width: hijo.width || 0, height: hijo.height || 0 },
                parent_id: ppiShape.id,
                metadata: {
                  isTarget: tipoHijo.includes('Target'),
                  isScope: tipoHijo.includes('Scope'),
                  isMeasure: tipoHijo.includes('Measure') || tipoHijo.includes('Aggregated') || tipoHijo.includes('Derived')
                }
              });
            });
          });
          
          if (allPPINOTElements.length > 0) {
            project.ppinot.ppis = allPPINOTElements;
            project.welcomeScreenFormat.ppi.indicators = allPPINOTElements;
            
            // Elementos PPINOT capturados exitosamente
          }
        }
      }
    } catch (error) {
      console.warn('Error capturando elementos PPINOT:', error);
    }
  }

  async capturarDatosRASCI(project) {
    try {
      const { RasciStore } = await import('../modules/rasci/store.js');
      const roles = RasciStore.getRoles();
      const matrix = RasciStore.getMatrix();
      
      if (Array.isArray(roles) && roles.length > 0) {
        project.rasci.roles = roles;
        project.welcomeScreenFormat.rasci.roles = roles;
      }
      
      if (matrix && typeof matrix === 'object' && Object.keys(matrix).length > 0) {
        project.rasci.matrix = matrix;
        project.rasci.tasks = Object.keys(matrix);
        project.welcomeScreenFormat.rasci.matrix = matrix;
        project.welcomeScreenFormat.rasci.tasks = Object.keys(matrix);
      }
    } catch (error) {
      console.warn('Error capturando datos RASCI:', error);
    }
  }

  async forceRestore() {
    try {
      const data = localStorage.getItem('draft:multinotation');
      if (!data) return false;

      const parsed = JSON.parse(data);
      
      // Verificar TTL (3 horas)
      const now = Date.now();
      const saved = new Date(parsed.timestamp).getTime();
      const ttl = 3 * 60 * 60 * 1000;
      
      if (now - saved > ttl) {
        localStorage.removeItem('draft:multinotation');
        return false;
      }

      const projectData = parsed.data || parsed.value;
      if (!projectData) return false;

      this.suspendAutoSave();

      // Restaurar BPMN
      if (projectData.bpmn && this.modeler) {
        const bpmnXml = projectData.bpmn.xml || projectData.bpmn;
        if (typeof bpmnXml === 'string') {
          await this.modeler.importXML(bpmnXml);
          console.log('✅ BPMN restaurado');
        }
      }

      // Restaurar PPINOT con relaciones padre-hijo
      if (projectData.ppinot && projectData.ppinot.ppis) {
        await this.restaurarElementosPPINOT(projectData.ppinot.ppis);
        
        // TAMBIÉN llamar al sistema legacy para reparentar medidas existentes
        try {
          const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
          const registry = serviceRegistry.getServiceRegistry();
          const legacyManager = registry?.get('LocalStorageAutoSaveManager');
          
          if (legacyManager && typeof legacyManager.restorePPIState === 'function') {
            console.log('🔄 Llamando restorePPIState del sistema legacy...');
            await legacyManager.restorePPIState();
          }
        } catch (error) {
          console.warn('No se pudo llamar restorePPIState legacy:', error);
        }
      }

      // Restaurar RASCI
      if (projectData.rasci) {
        await this.restaurarDatosRASCI(projectData.rasci);
      }

      if (this.eventBus) {
        this.eventBus.publish('project.restored', {
          success: true,
          data: projectData,
          timestamp: new Date().toISOString(),
          source: 'autosave'
        });
      }

      this.resumeAutoSave();
      return true;
      
    } catch (error) {
      console.error('Error restaurando proyecto:', error);
      this.resumeAutoSave();
      return false;
    }
  }

  async restaurarElementosPPINOT(ppis) {
    try {
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      
      // Intentar usar PPINOTStorageManager para restaurar elementos con posiciones
      const ppinotStorageManager = registry?.get('PPINOTStorageManager');
      
      if (ppinotStorageManager && typeof ppinotStorageManager.savePPINOTElements === 'function') {
        const elements = [];
        const relationships = [];
        
        ppis.forEach(ppi => {
          const element = {
            id: ppi.id,
            name: ppi.name,
            type: ppi.type,
            position: ppi.position || { x: 0, y: 0, width: 0, height: 0 },
            x: ppi.position?.x || 0,
            y: ppi.position?.y || 0,
            width: ppi.position?.width || 0,
            height: ppi.position?.height || 0,
            businessObject: ppi.businessObject || {
              name: ppi.name,
              $type: ppi.type,
              id: ppi.id
            },
            metadata: ppi.metadata || {}
          };
          
          if (ppi.parent_id) {
            element.parentId = ppi.parent_id;
            relationships.push({
              childId: ppi.id,
              parentId: ppi.parent_id
            });
          }
          
          elements.push(element);
        });
        
        ppinotStorageManager.savePPINOTElements(elements, relationships);
        console.log(`✅ PPINOT restaurado: ${elements.length} elementos, ${relationships.length} relaciones`);
      }

      // Usar PPINOTCoordinationManager para restaurar elementos visuales
      const coordinationManager = registry?.get('PPINOTCoordinationManager');
      if (coordinationManager && typeof coordinationManager.triggerRestoration === 'function') {
        console.log('🔄 Disparando restauración PPINOT via CoordinationManager...');
        console.log(`   - PPIs a restaurar: ${ppis.length}`);
        ppis.forEach(ppi => {
          if (ppi.parent_id) {
            console.log(`     - ${ppi.type}: ${ppi.id} → padre: ${ppi.parent_id}`);
          }
        });
        coordinationManager.triggerRestoration('autosave.restore');
      }

      if (this.eventBus) {
        this.eventBus.publish('ppinot.synchronized', { elements: ppis });
        this.eventBus.publish('ppinot.changed', { source: 'autosave', ppis: ppis });
      }
    } catch (error) {
      console.warn('Error restaurando elementos PPINOT:', error);
    }
  }

  async restaurarDatosRASCI(rasciData) {
    try {
      const { RasciStore } = await import('../modules/rasci/store.js');
      
      if (rasciData.roles && Array.isArray(rasciData.roles)) {
        RasciStore.setRoles(rasciData.roles);
      }
      
      if (rasciData.matrix && typeof rasciData.matrix === 'object') {
        RasciStore.setMatrix(rasciData.matrix);
      }
    } catch (error) {
      console.warn('Error restaurando datos RASCI:', error);
    }
  }

  suspendAutoSave() {
    this.suspended = true;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  resumeAutoSave() {
    this.suspended = false;
    if (this.enabled && this.hasChanges) {
      this.scheduleAutosave();
    }
  }

  // Métodos de compatibilidad
  async forceAutosave() {
    return await this.performAutosave();
  }

  async forceSave() {
    return await this.performAutosave();
  }

  enable() {
    this.enabled = true;
    if (this.eventBus && !this.suspended) {
      this.setupEventListeners();
    }
  }

  disable() {
    this.enabled = false;
    if (this.autosaveTimer) {
      clearTimeout(this.autosaveTimer);
      this.autosaveTimer = null;
    }
  }

  destroy() {
    this.disable();
  }
}

export default AutosaveManager;

// Registro en ServiceRegistry
import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';

const registry = getServiceRegistry();
if (registry) {
  registry.register('AutosaveManager', AutosaveManager, { 
    description: 'Autosave Manager limpio (clase)' 
  });
  
  registry.register('createAutosaveManager', (options = {}) => {
    return new AutosaveManager(options);
  }, { 
    description: 'Factory para crear AutosaveManager con dependencias' 
  });
  
  registry.register('localStorageAutoSaveManager', null, { 
    description: 'Instancia autosave (se inicializará con dependencias)' 
  });
}