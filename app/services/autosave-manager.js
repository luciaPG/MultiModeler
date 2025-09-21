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
      console.log('🔄 Iniciando performAutosave...');
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

      try {
        localStorage.setItem('draft:multinotation', JSON.stringify(draftData));
      } catch (storageError) {
        // Re-lanzar el error para que sea capturado por el catch principal
        throw new Error(`Storage error: ${storageError.message}`);
      }
      
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
        this.eventBus.publish('autosave.error', {
          error: error,
          timestamp: new Date().toISOString()
        });
        
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
    
    // Obtener datos RALPH
    await this.capturarDatosRALPH(project);
    
    // Obtener datos BPMN (relaciones padre-hijo y elementos RALPH)
    await this.capturarDatosBPMN(project);

    return project;
  }

  async capturarElementosPPINOT(project) {
    try {
      console.log('🔍 Iniciando capturarElementosPPINOT...');
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      
      if (!registry) return;

      // MÉTODO 1: ElementRegistry (elementos reales del canvas)
      if (this.modeler && typeof this.modeler.get === 'function') {
        const elementRegistry = this.modeler.get('elementRegistry');
        if (elementRegistry && typeof elementRegistry.getAll === 'function') {
          const allCanvasElements = elementRegistry.getAll();
          
          // Buscar PPIs principales
          // Obtener SOLO elementos PPINOT:Ppi del canvas (no medidas ni targets)
          const ppiShapes = allCanvasElements.filter(el => {
            const type = el.type || (el.businessObject && el.businessObject.$type) || '';
            // Solo PPIs principales, excluir medidas, targets, scopes, etc.
            const isMainPPI = type === 'PPINOT:Ppi';
            const isNotMeasure = !type.includes('Measure') && !type.includes('Target') && !type.includes('Scope');
            
            if (isMainPPI && isNotMeasure) {
              console.log(`✅ PPI principal detectado: ${el.id} (${type})`);
            } else if (type.includes('PPINOT') && !isMainPPI) {
              console.log(`🚫 Elemento PPINOT excluido de lista de PPIs: ${el.id} (${type})`);
            }
            
            return isMainPPI && isNotMeasure;
          });
          
          // También obtener elementos PPINOT de la parte visual (Target, Scope, Measures)
          const visualPPINOTElements = allCanvasElements.filter(el => {
            const id = el.id || '';
            // Buscar elementos que tengan IDs que empiecen con Target_, Scope_, Measure_, etc.
            // PERO EXCLUIR elementos label (se crean automáticamente)
            const isPPINOTElement = (id.startsWith('Target_') || 
                   id.startsWith('Scope_') || 
                   id.startsWith('Measure_') || 
                   id.startsWith('AggregatedMeasure_') ||
                   id.startsWith('BaseMeasure_') ||
                   id.startsWith('DataMeasure_') ||
                   id.startsWith('TimeMeasure_')) && !id.includes('_label');
                   
            // DEBUG: Mostrar elementos detectados
            if (isPPINOTElement) {
              console.log(`🔍 ELEMENTO VISUAL PPINOT DETECTADO: ${id} - Posición: x=${el.x}, y=${el.y}, w=${el.width}, h=${el.height}`);
            } else if (id.includes('_label') && (id.startsWith('Target_') || id.startsWith('Scope_') || id.startsWith('Measure_') || id.startsWith('AggregatedMeasure_'))) {
              console.log(`🚫 ELEMENTO LABEL EXCLUIDO: ${id}`);
            }
                   
            return isPPINOTElement;
          });
          
          
          console.log(`🔍 AutoSave: ${ppiShapes.length} PPIs principales + ${visualPPINOTElements.length} elementos visuales PPINOT`);
          
          
          const allPPINOTElements = [];
          
          // Primero agregar todos los elementos visuales PPINOT (Target, Scope, Measures)
          visualPPINOTElements.forEach(visualEl => {
            const id = visualEl.id || '';
            let tipoElemento = 'PPINOT:Element';
            
            // Determinar el tipo basado en el ID
            if (id.startsWith('Target_')) tipoElemento = 'PPINOT:Target';
            else if (id.startsWith('Scope_')) tipoElemento = 'PPINOT:Scope';
            else if (id.startsWith('AggregatedMeasure_')) tipoElemento = 'PPINOT:AggregatedMeasure';
            else if (id.startsWith('BaseMeasure_')) tipoElemento = 'PPINOT:BaseMeasure';
            else if (id.startsWith('DataMeasure_')) tipoElemento = 'PPINOT:DataMeasure';
            else if (id.startsWith('TimeMeasure_')) tipoElemento = 'PPINOT:TimeMeasure';
            else if (id.startsWith('Measure_')) tipoElemento = 'PPINOT:Measure';
            
            // Determinar el padre basado en las relaciones reales establecidas por BPMN.js
            let padreId = null;
            
            // MÉTODO 1: Verificar relación parent directa
            if (visualEl.parent && visualEl.parent.id) {
              padreId = visualEl.parent.id;
              console.log(`🔗 Padre encontrado por relación directa: ${visualEl.id} -> ${padreId}`);
            }
            // MÉTODO 2: Verificar businessObject.$parent
            else if (visualEl.businessObject && visualEl.businessObject.$parent && visualEl.businessObject.$parent.id) {
              padreId = visualEl.businessObject.$parent.id;
              console.log(`🔗 Padre encontrado por businessObject.$parent: ${visualEl.id} -> ${padreId}`);
            }
            // MÉTODO 3: Fallback - buscar PPI más cercano (solo si no hay relación directa)
            else {
              let closestPPI = null;
              let closestDistance = Infinity;
              
              ppiShapes.forEach(ppi => {
                const ppiPos = { x: ppi.x || 0, y: ppi.y || 0 };
                const elPos = { x: visualEl.x || 0, y: visualEl.y || 0 };
                
                const distance = Math.sqrt(
                  Math.pow(elPos.x - ppiPos.x, 2) + 
                  Math.pow(elPos.y - ppiPos.y, 2)
                );
                
                if (distance < closestDistance) {
                  closestDistance = distance;
                  closestPPI = ppi.id;
                }
              });
              
              if (closestPPI && closestDistance < 500) { // Dentro de 500px
                padreId = closestPPI;
                console.log(`🔗 Padre encontrado por proximidad: ${visualEl.id} -> ${padreId} (distancia: ${Math.round(closestDistance)}px)`);
              }
            }
            
            // Obtener el nombre original del elemento
            const originalName = visualEl.businessObject?.name || 
                                visualEl.businessObject?.body || 
                                (visualEl.labels && visualEl.labels[0] && visualEl.labels[0].businessObject?.body) ||
                                id;
            
            allPPINOTElements.push({
              id: id,
              type: tipoElemento,
              name: originalName,
              originalName: originalName, // Guardar nombre original por separado
              position: { 
                x: visualEl.x || 0, 
                y: visualEl.y || 0, 
                width: visualEl.width || 0, 
                height: visualEl.height || 0 
              },
              parent_id: padreId,
              metadata: { isVisualElement: true }
            });
            
            console.log(`📋 Elemento visual PPINOT procesado: ${id} (${tipoElemento}) - Padre: ${padreId || 'N/A'}`);
          });
          
          // Para cada PPI, solo agregar el PPI principal (no sus hijos)
          ppiShapes.forEach(ppiShape => {
            // Solo agregar PPIs principales, no medidas ni targets
            allPPINOTElements.push({
              id: ppiShape.id,
              name: ppiShape.businessObject?.name || ppiShape.id,
              type: ppiShape.type,
              position: { x: ppiShape.x || 0, y: ppiShape.y || 0, width: ppiShape.width || 0, height: ppiShape.height || 0 },
              parent_id: null,
              metadata: { isMainPPI: true }
            });
            
            console.log(`📋 PPI principal agregado: ${ppiShape.id}`);
            
            // COMENTADO: Los hijos del PPI (Target, Scope, Measures) ya se capturaron en visualPPINOTElements
            // No los agregamos aquí para evitar duplicados en la lista de PPIs
            /*
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
            */
          });
          
          if (allPPINOTElements.length > 0) {
            // ELIMINAR DUPLICADOS basados en ID
            const uniqueElements = [];
            const seenIds = new Set();
            
            allPPINOTElements.forEach(el => {
              if (!seenIds.has(el.id)) {
                seenIds.add(el.id);
                uniqueElements.push(el);
              } else {
                console.log(`🗑️ Duplicado eliminado: ${el.id} (${el.type})`);
              }
            });
            
            project.ppinot.ppis = uniqueElements;
            project.welcomeScreenFormat.ppi.indicators = uniqueElements;
            
            
            // GUARDAR TAMBIÉN EN LOCALSTORAGE PARA RESTAURACIÓN
            try {
              // DEBUG: Mostrar todos los elementos únicos antes de guardar
              console.log(`📋 ELEMENTOS PPINOT ÚNICOS A GUARDAR (${uniqueElements.length}):`);
              uniqueElements.forEach((el, index) => {
                console.log(`  ${index + 1}. ${el.id} (${el.type}) - Padre: ${el.parent_id || 'N/A'} - Posición: ${JSON.stringify(el.position)}`);
              });
              
              // ELIMINADO: No guardar en localStorage separado - ya está en draft:multinotation
              // localStorage.setItem('ppinotElements', JSON.stringify(uniqueElements));
              // localStorage.setItem('ppinotRelationships', JSON.stringify(relationships));
              console.log(`💾 PPINOT guardado en draft: ${uniqueElements.length} elementos`);
            } catch (error) {
              console.warn('Error guardando PPINOT en localStorage:', error);
            }
            
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
      // 1. Intentar desde RasciStore
      const { RasciStore } = await import('../modules/rasci/store.js');
      let roles = RasciStore.getRoles();
      let matrix = RasciStore.getMatrix();
      
      console.log('🔍 RASCI desde RasciStore:', { roles, matrix });
      
      // 2. Si no hay datos, intentar desde ServiceRegistry
      if ((!roles || roles.length === 0) || (!matrix || Object.keys(matrix).length === 0)) {
        const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
        const registry = serviceRegistry.getServiceRegistry();
        
        const rasciAdapter = registry?.get('RASCIAdapter');
        if (rasciAdapter) {
          if (!roles || roles.length === 0) {
            roles = rasciAdapter.getRoles && rasciAdapter.getRoles() || [];
          }
          if (!matrix || Object.keys(matrix).length === 0) {
            matrix = rasciAdapter.getMatrix && rasciAdapter.getMatrix() || {};
          }
          console.log('🔍 RASCI desde RASCIAdapter:', { roles, matrix });
        }
      }
      
      // 3. Guardar roles si existen
      if (Array.isArray(roles) && roles.length > 0) {
        project.rasci.roles = roles;
        project.welcomeScreenFormat.rasci.roles = roles;
        console.log('✅ RASCI roles guardados:', roles.length);
      } else {
        console.log('⚠️ No se encontraron roles RASCI');
      }
      
      // 4. Guardar matriz si existe
      if (matrix && typeof matrix === 'object' && Object.keys(matrix).length > 0) {
        project.rasci.matrix = matrix;
        project.rasci.tasks = Object.keys(matrix);
        project.welcomeScreenFormat.rasci.matrix = matrix;
        project.welcomeScreenFormat.rasci.tasks = Object.keys(matrix);
        console.log('✅ RASCI matriz guardada:', Object.keys(matrix).length, 'tareas');
      } else {
        console.log('⚠️ No se encontró matriz RASCI');
      }
      
    } catch (error) {
      console.warn('Error capturando datos RASCI:', error);
    }
  }

  async capturarDatosRALPH(project) {
    try {
      // Intentar capturar datos RALPH desde diferentes fuentes
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      
      // Intentar obtener desde ServiceRegistry
      const ralphAdapter = registry?.get('RALPHAdapter');
      if (ralphAdapter && typeof ralphAdapter.getSymbols === 'function') {
        const symbols = ralphAdapter.getSymbols();
        if (symbols && symbols.length > 0) {
          project.ralph.roles = symbols;
          project.welcomeScreenFormat.ralph = { roles: symbols };
          console.log('✅ RALPH símbolos guardados desde adapter:', symbols.length);
          return;
        }
      }
      
      // Intentar obtener desde el modeler (canvas)
      if (this.modeler && typeof this.modeler.get === 'function') {
        const elementRegistry = this.modeler.get('elementRegistry');
        if (elementRegistry && typeof elementRegistry.getAll === 'function') {
          const allElements = elementRegistry.getAll();
          const ralphElements = allElements.filter(el => {
            const type = el.type || (el.businessObject && el.businessObject.$type) || '';
            return type.startsWith('RALPH:') || type.startsWith('ralph:');
          });
          
          if (ralphElements.length > 0) {
            const ralphSymbols = ralphElements.map(el => ({
              id: el.id,
              name: el.businessObject?.name || el.id,
              type: el.type,
              position: { x: el.x || 0, y: el.y || 0, width: el.width || 0, height: el.height || 0 },
              businessObject: el.businessObject
            }));
            
            project.ralph.roles = ralphSymbols;
            project.welcomeScreenFormat.ralph = { roles: ralphSymbols };
            console.log('✅ RALPH símbolos guardados desde canvas:', ralphSymbols.length);
          }
        }
      }
    } catch (error) {
      console.warn('Error capturando datos RALPH:', error);
    }
  }

  async capturarDatosBPMN(project) {
    try {
      console.log('🔄 Capturando datos BPMN incluyendo relaciones padre-hijo...');
      
      // ELIMINADO: No leer relaciones de localStorage separado - usar solo draft
      console.log('ℹ️ Relaciones padre-hijo gestionadas por ImportExportManager');
      
      // ELIMINADO: No capturar elementos RALPH de localStorage separado
      console.log('ℹ️ Elementos RALPH gestionados por ImportExportManager');
      
    } catch (error) {
      console.warn('Error capturando datos BPMN:', error);
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
      
      // Restaurar RALPH
      if (projectData.ralph) {
        await this.restaurarDatosRALPH(projectData.ralph);
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
      console.log(`🔄 Restaurando ${ppis.length} elementos PPINOT usando sistema simple...`);
      
      // Usar el sistema simple de restauración
      const { SimplePPINOTRestorer } = await import('./simple-ppinot-restorer.js');
      const restorer = new SimplePPINOTRestorer(this.modeler);
      
      const success = await restorer.restorePPINOTElements();
      
      if (success) {
        console.log('✅ Restauración PPINOT completada exitosamente');
        return true;
      } else {
        console.warn('⚠️ Restauración PPINOT falló');
        return false;
      }
    } catch (error) {
      console.warn('Error restaurando elementos PPINOT:', error);
    }
  }

  async restaurarDatosRASCI(rasciData) {
    try {
      console.log('🔄 Restaurando datos RASCI:', rasciData);
      
      const { RasciStore } = await import('../modules/rasci/store.js');
      
      if (rasciData.roles && Array.isArray(rasciData.roles) && rasciData.roles.length > 0) {
        RasciStore.setRoles(rasciData.roles);
        console.log('✅ RASCI roles restaurados:', rasciData.roles.length);
      }
      
      if (rasciData.matrix && typeof rasciData.matrix === 'object' && Object.keys(rasciData.matrix).length > 0) {
        RasciStore.setMatrix(rasciData.matrix);
        console.log('✅ RASCI matriz restaurada:', Object.keys(rasciData.matrix).length, 'tareas');
      }
      
      // También intentar restaurar via ServiceRegistry
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      const rasciAdapter = registry?.get('RASCIAdapter');
      
      if (rasciAdapter) {
        if (rasciAdapter.setRoles && rasciData.roles) {
          rasciAdapter.setRoles(rasciData.roles);
        }
        if (rasciAdapter.setMatrix && rasciData.matrix) {
          rasciAdapter.setMatrix(rasciData.matrix);
        }
        console.log('✅ RASCI también restaurado via RASCIAdapter');
      }
      
      // CRÍTICO: Disparar eventos específicos del sistema RASCI para actualización visual
      // TIMING FIX: Esperar un poco para asegurar que la UI esté inicializada
      if (this.eventBus) {
        setTimeout(() => {
          console.log('🔄 Disparando eventos RASCI después de delay para asegurar UI lista...');
          
          // 1. Evento principal de actualización de matriz
          this.eventBus.publish('rasci.matrix.updated', { 
            matrix: rasciData.matrix || {},
            matrixData: rasciData.matrix || {}
          });
          
          // 2. Evento de actualización de roles
          if (rasciData.roles && rasciData.roles.length > 0) {
            this.eventBus.publish('rasci.roles.updated', { roles: rasciData.roles });
          }
          
          // 3. Evento específico para forzar actualización desde diagrama
          this.eventBus.publish('rasci.matrix.update.fromDiagram', {
            source: 'autosave.restore',
            forceUpdate: true
          });
          
          // 4. Evento de restauración completa
          this.eventBus.publish('rasci.restored', {
            roles: rasciData.roles || [],
            matrix: rasciData.matrix || {},
            source: 'autosave'
          });
          
          console.log('✅ Eventos RASCI del sistema disparados para actualización visual (con delay)');
        }, 1000); // Esperar 1 segundo para que la UI esté lista
      }
      
      // CRÍTICO: Llamar funciones directas de actualización del sistema (con delay adicional)
      setTimeout(async () => {
        try {
          const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
          const registry = serviceRegistry.getServiceRegistry();
          
          console.log('🔄 Ejecutando funciones directas de actualización RASCI...');
          
          // ARREGLO BUCLE INFINITO: NO llamar updateMatrixFromDiagram desde autosave
          // updateMatrixFromDiagram puede causar bucles infinitos durante restauración
          console.log('⚠️ Omitiendo updateMatrixFromDiagram() para evitar bucle infinito durante restauración');
          
          // Intentar llamar reloadRasciMatrix
          const reloadRasciMatrix = registry?.getFunction && registry.getFunction('reloadRasciMatrix');
          if (reloadRasciMatrix && typeof reloadRasciMatrix === 'function') {
            console.log('🔄 Llamando reloadRasciMatrix() del sistema...');
            reloadRasciMatrix();
            console.log('✅ reloadRasciMatrix() ejecutado');
          }
          
          // FORZAR re-render directo como último recurso
          const renderMatrix = registry?.getFunction && registry.getFunction('renderMatrix');
          if (renderMatrix && typeof renderMatrix === 'function') {
            const rasciPanel = document.querySelector('#rasci-panel');
            if (rasciPanel) {
              console.log('🔄 Forzando renderMatrix() directo...');
              renderMatrix(rasciPanel, rasciData.roles || [], null);
              console.log('✅ renderMatrix() forzado ejecutado');
            }
          }
          
        } catch (error) {
          console.warn('No se pudieron llamar funciones directas de actualización RASCI:', error);
        }
      }, 1500); // Delay adicional después de los eventos
      
    } catch (error) {
      console.warn('Error restaurando datos RASCI:', error);
    }
  }

  async restaurarDatosRALPH(ralphData) {
    try {
      console.log('🔄 Restaurando datos RALPH:', ralphData);
      
      // Intentar restaurar via ServiceRegistry
      const serviceRegistry = await import('../modules/ui/core/ServiceRegistry.js');
      const registry = serviceRegistry.getServiceRegistry();
      const ralphAdapter = registry?.get('RALPHAdapter');
      
      if (ralphAdapter && ralphData.roles) {
        if (ralphAdapter.setSymbols && Array.isArray(ralphData.roles)) {
          ralphAdapter.setSymbols(ralphData.roles);
          console.log('✅ RALPH símbolos restaurados via adapter:', ralphData.roles.length);
        }
      }
      
      // Si hay elementos RALPH con posiciones, intentar restaurarlos al canvas
      if (this.modeler && ralphData.roles && Array.isArray(ralphData.roles)) {
        const elementFactory = this.modeler.get('elementFactory');
        const modeling = this.modeler.get('modeling');
        
        if (elementFactory && modeling) {
          ralphData.roles.forEach(symbol => {
            if (symbol.position && symbol.type && symbol.type.startsWith('RALPH:')) {
              try {
                const element = elementFactory.createShape({
                  id: symbol.id,
                  type: symbol.type,
                  businessObject: symbol.businessObject
                });
                
                modeling.createShape(element, symbol.position, this.modeler.get('canvas').getRootElement());
                console.log('✅ RALPH símbolo restaurado al canvas:', symbol.id);
              } catch (error) {
                console.warn('Error restaurando símbolo RALPH al canvas:', symbol.id, error);
              }
            }
          });
        }
      }
      
    } catch (error) {
      console.warn('Error restaurando datos RALPH:', error);
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