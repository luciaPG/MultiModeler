/**
 * PPI Core Functionality - Main functionality for PPI management
 */
import { getServiceRegistry } from '../../ui/core/ServiceRegistry.js';

class PPICore {
  constructor(adapter = null) {
    this.ppis = [];
    this.filteredPPIs = [];
    this.processedElements = new Set();
    this.pendingPPINOTRestore = null;
    this.autoSaveEnabled = true;
    this.adapter = adapter;
    this.measureTypes = {
      time: { name: 'Medida de Tiempo', icon: 'fas fa-clock' },
      count: { name: 'Medida de Conteo', icon: 'fas fa-hashtag' },
      state: { name: 'Condición de Estado', icon: 'fas fa-toggle-on' },
      data: { name: 'Medida de Datos', icon: 'fas fa-database' },
      derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' },
      aggregated: { name: 'Medida Agregada', icon: 'fas fa-chart-bar' }
    };
    
    this.autoSaveTimeout = null;
    this.autoSaveDelay = 1000;
    this.lastSaveTime = 0;
    this.minSaveInterval = 2000;
    
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
    this.xmlCacheTimeout = 5000;
    
    this.loadPPIs();
    this.loadPPINOTElements();
    
  }

  
  generatePPIId() {
    return 'ppi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  createPPI(data) {
    return {
      id: this.generatePPIId(),
      title: data.title || data.process,
      process: data.process,
      businessObjective: data.businessObjective,
      measureDefinition: {
        type: data.measureType,
        definition: data.measureDefinition
      },
      target: data.target,
      scope: data.scope,
      source: data.source,
      responsible: data.responsible,
      informed: data.informed || [],
      comments: data.comments || '',
      elementId: data.elementId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  addPPI(ppi) {
    if (ppi.elementId) {
      const existingIndex = this.ppis.findIndex(existing => existing.elementId === ppi.elementId);
      if (existingIndex !== -1) {
        this.ppis.splice(existingIndex, 1);
      }
    }
    
    this.ppis.push(ppi);
    this.savePPIs();
    return ppi;
  }

  updatePPI(ppiId, updatedData) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      const { __source, ...cleanData } = (updatedData || {});
      this.ppis[index] = { 
        ...this.ppis[index], 
        ...cleanData, 
        updatedAt: new Date().toISOString() 
      };
      
      try {
        // Sincronizar cambios del formulario al canvas (evita bucles infinitos)
        const parentElementId = this.ppis[index].elementId;
        if (__source === 'form' && parentElementId && (Object.prototype.hasOwnProperty.call(cleanData, 'target') || Object.prototype.hasOwnProperty.call(cleanData, 'scope'))) {
          const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler')) || null;
          if (modeler) {
            const elementRegistry = modeler.get('elementRegistry');
            const modeling = modeler.get('modeling');
            const eventBus = modeler.get('eventBus');
            const parentElement = elementRegistry && elementRegistry.get(parentElementId);
            if (parentElement && elementRegistry && modeling) {
              const all = elementRegistry.getAll();
              if (Object.prototype.hasOwnProperty.call(cleanData, 'target')) {
                const targetEl = all.find(el => el.parent && el.parent.id === parentElementId && (el.type === 'PPINOT:Target' || (el.businessObject && el.businessObject.$type === 'PPINOT:Target')));
                if (targetEl) {
                  try {
                    modeling.updateProperties(targetEl, { name: cleanData.target || '' });
                    if (targetEl.businessObject) targetEl.businessObject.name = cleanData.target || '';
                    if (eventBus) {
                      eventBus.fire('element.changed', { element: targetEl });
                      eventBus.fire('shape.changed', { element: targetEl });
                    }
                  } catch (e) {
                    console.debug('Event fire error ignored:', e.message);
                  }
                }
              }
              if (Object.prototype.hasOwnProperty.call(cleanData, 'scope')) {
                const scopeEl = all.find(el => el.parent && el.parent.id === parentElementId && (el.type === 'PPINOT:Scope' || (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')));
                if (scopeEl) {
                  try {
                    modeling.updateProperties(scopeEl, { name: cleanData.scope || '' });
                    if (scopeEl.businessObject) scopeEl.businessObject.name = cleanData.scope || '';
                    if (eventBus) {
                      eventBus.fire('element.changed', { element: scopeEl });
                      eventBus.fire('shape.changed', { element: scopeEl });
                    }
                  } catch (e) {
                    console.debug('Event fire error ignored:', e.message);
                  }
                }
              }
            }
          }
        }
      } catch (syncErr) {
        console.debug('Sync error ignored:', syncErr.message);
      }

      this.savePPIs();
      return true;
    }
    return false;
  }

  deletePPI(ppiId) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      const deletedPPI = this.ppis[index];
      const ppiData = { ...deletedPPI };

      // Eliminar primero del canvas para evitar recreaciones
      try {
        this.deletePPIFromCanvas(ppiId, ppiData);
      } catch (e) {
        // ignore sync errors
      }

      this.ppis.splice(index, 1);
      this.savePPIs();

      // Limpiar PPIs huérfanos inmediatamente
      this.purgeOrphanedPPIs();

      return true;
    }
    return false;
  }

  deletePPIFromCanvas(ppiId, ppiData = null) {
    try {
      let modeler = null;
      
      if (this.adapter && typeof this.adapter.getBpmnModeler === 'function') {
        modeler = this.adapter.getBpmnModeler();
      }
      
      if (!modeler) {
        modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler')) || null;
      }
      
      if (!modeler) {
        return false;
      }
      
      let ppi = ppiData;
      if (!ppi) {
        ppi = this.ppis.find(p => p.id === ppiId);
      }
      
      if (!ppi) {
        return false;
      }
      
      const elementId = ppi.elementId;
      if (!elementId) {
        return false;
      }

      try {
        const mgr = this.adapter && typeof this.adapter.getPPIManager === 'function' ? this.adapter.getPPIManager() : null;
        if (mgr && typeof mgr.beginCanvasDeletion === 'function') {
          mgr.beginCanvasDeletion(elementId);
        }
      } catch (e) { /* no-op: coordinación opcional */ }
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        return false;
      }
      
      let ppiElement = elementRegistry.get(elementId);
      
      if (!ppiElement) {
        return false;
      }
      
      if (ppiElement) {
        const allElements = elementRegistry.getAll();
        const childElements = allElements.filter(el => {
          if (el.parent && el.parent.id === ppiElement.id) {
            return el.type === 'PPINOT:Scope' || 
                   el.type === 'PPINOT:Target' || 
                   el.type === 'PPINOT:Measure' || 
                   el.type === 'PPINOT:Condition' ||
                   (el.businessObject && (
                     el.businessObject.$type === 'PPINOT:Scope' ||
                     el.businessObject.$type === 'PPINOT:Target' ||
                     el.businessObject.$type === 'PPINOT:Measure' ||
                     el.businessObject.$type === 'PPINOT:Condition'
                   ));
          }
          return false;
        });
        
        if (childElements.length > 0) {
          try {
            childElements.forEach(childElement => {
              try {
                modeling.removeElements([childElement]);
              } catch (childError) {
                console.warn(`Error eliminando elemento hijo ${childElement.id}:`, childError);
              }
            });
          } catch (error) {
            console.error('Error eliminando elementos hijos:', error);
          }
        }
        
        try {
          modeling.removeElements([ppiElement]);
          
          try {
            const canvas = modeler.get('canvas');
            if (canvas && typeof canvas.resized === 'function') {
              canvas.resized();
            }
          } catch (canvasError) {
            console.warn('Error actualizando canvas:', canvasError);
          }
          
          return true;
        } catch (error) {
          console.error('Error eliminando elemento PPI:', error);
          
          try {
            const commandStack = modeler.get('commandStack');
            if (commandStack) {
              commandStack.execute('element.delete', { elements: [ppiElement] });
              return true;
            }
          } catch (altError) {
            console.error('Error con método alternativo:', altError);
          }
          
          return false;
        } finally {
          try {
            const mgr = this.adapter && typeof this.adapter.getPPIManager === 'function' ? this.adapter.getPPIManager() : null;
            if (mgr && typeof mgr.endCanvasDeletion === 'function') {
              mgr.endCanvasDeletion(elementId);
            }
          } catch (e) { /* no-op: coordinación opcional */ }
        }
      } else {
        return false;
      }
    } catch (error) {
      console.error('Error general en deletePPIFromCanvas:', error);
      return false;
    }
  }

  getPPI(ppiId) {
    return this.ppis.find(ppi => ppi.id === ppiId);
  }

  getAllPPIs() {
    return this.ppis;
  }

  getPPIsForElement(elementId) {
    return this.ppis.filter(ppi => ppi.elementId === elementId);
  }

  purgeOrphanedPPIs() {
    try {
      // Eliminar PPIs cuyos elementos ya no existen en el canvas
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      if (!modeler) return;

      const elementRegistry = modeler.get('elementRegistry');
      if (!elementRegistry) return;

      const before = this.ppis.length;
      this.ppis = this.ppis.filter(ppi => {
        if (!ppi.elementId) return true; // Mantener PPIs sin elementId
        const element = elementRegistry.get(ppi.elementId);
        return !!element; // Mantener solo si el elemento existe en canvas
      });

      if (this.ppis.length !== before) {
        this.savePPIs();
      }
    } catch (e) {
      // ignore purge errors
      console.debug('Purge error ignored:', e.message);
    }
  }

  
  debouncedSavePPINOTElements() {
    const now = Date.now();
    
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    if (now - this.lastSaveTime < this.minSaveInterval) {
      this.autoSaveTimeout = setTimeout(() => {
        this.savePPINOTElements();
      }, this.autoSaveDelay);
    } else {
      this.savePPINOTElements();
    }
  }
  
  forceSavePPINOTElements() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.savePPINOTElements(true);
  }
  
  clearXmlCache() {
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
  }
  
  savePPIs() {
  }

  loadPPIs() {
    this.ppis = [];
  }

  
  savePPINOTElements() {
    const startTime = performance.now();
    try {
      // Optimización: Reducir logs de debug para mejorar rendimiento
      if (!this.isAutoSaveEnabled()) {
        return;
      }
      
      // Optimización: Prevenir ejecución demasiado frecuente
      const now = Date.now();
      if (now - this.lastSaveTime < 1000) { // Mínimo 1 segundo entre ejecuciones
        return;
      }
      
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) {
        return;
      }
      
      this.lastSaveTime = now;
      
      const elementRegistry = modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log(`🔍 Elementos PPI encontrados: ${ppiElements.length}`);
      
      // Optimización: Detectar hijos PPINOT (Target, Scope, Medidas, Condition, etc.) de forma robusta
      const ppiChildren = [];
      for (const element of allElements) {
        // Ignorar labels
        if (element.type === 'label' || (element.businessObject && element.businessObject.$type === 'label')) {
          continue;
        }
        const type = element.type || '';
        const boType = (element.businessObject && element.businessObject.$type) || '';

        // Cualquier elemento PPINOT que no sea el propio PPI se considera candidato
        const isPPINOTAny = (type.startsWith('PPINOT:') || boType.startsWith('PPINOT:')) && (type !== 'PPINOT:Ppi' && boType !== 'PPINOT:Ppi');

        // Señales adicionales (IDs o metadata) para Target/Scope
        const isTargetOrScopeById = element.id && (element.id.includes('Target') || element.id.includes('Scope'));
        const isTargetOrScopeByMeta = element.metadata && (element.metadata.isTarget || element.metadata.isScope);

        if (isPPINOTAny || isTargetOrScopeById || isTargetOrScopeByMeta) {
          ppiChildren.push(element);
          continue;
        }
      }
      
      // Optimización: Reducir logs de debug
      // console.log(`🔍 Elementos Target/Scope encontrados: ${ppiChildren.length}`);
      
      // Optimización: Buscar elementos Target/Scope asociados de forma más eficiente
      const associatedTargetScope = new Set();
      for (const ppi of ppiElements) {
        const ppiBounds = ppi.bounds || { x: ppi.x || 0, y: ppi.y || 0, width: ppi.width || 0, height: ppi.height || 0 };
        
        for (const element of allElements) {
          // Verificar si ya está en ppiChildren para evitar duplicados
          if (ppiChildren.includes(element)) continue;
          
          // Verificar si es un elemento que podría ser Target/Scope
          const couldBeTargetScope = element.type && (
            element.type.includes('Target') || 
            element.type.includes('Scope') ||
            (element.businessObject && element.businessObject.$type && (
              element.businessObject.$type.includes('Target') ||
              element.businessObject.$type.includes('Scope')
            ))
          );
          
          if (couldBeTargetScope) {
            const elementBounds = element.bounds || { x: element.x || 0, y: element.y || 0, width: element.width || 0, height: element.height || 0 };
            const distance = Math.sqrt(
              Math.pow(elementBounds.x - ppiBounds.x, 2) + 
              Math.pow(elementBounds.y - ppiBounds.y, 2)
            );
            
            // Si está cerca (dentro de 200px)
            if (distance < 200) {
              associatedTargetScope.add(element);
            }
          }
        }
      }
      
      const uniqueAssociated = Array.from(associatedTargetScope);
      
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log(`🔍 Elementos Target/Scope asociados encontrados: ${uniqueAssociated.length}`);
      // uniqueAssociated.forEach(el => console.log(`  - Associated: ${el.id} (${el.type})`));
      
      // Combinar todos los elementos PPINOT (excluyendo labels por seguridad)
      const allPPINOTElements = [...ppiElements, ...ppiChildren, ...uniqueAssociated]
        .filter(e => e && e.type !== 'label' && (!e.businessObject || e.businessObject.$type !== 'label'));
      
      // Crear relaciones padre-hijo
      const relationships = [];
      
      // Restaurar Target/Scope solo si existen guardados y están vinculados a PPIs actuales
      if (ppiElements.length > 0 && ppiChildren.length === 0) {
        try {
          const registry = getServiceRegistry && getServiceRegistry();
          const ppinotStorageManager = registry && registry.get ? registry.get('PPINOTStorageManager') : null;
          if (ppinotStorageManager) {
            const savedData = ppinotStorageManager.loadPPINOTElements();
            const currentPpiIds = new Set(ppiElements.map(p => p.id));
            const savedTargets = savedData.elements.filter(el => el.metadata && el.metadata.isTarget && currentPpiIds.has(el.parentId));
            const savedScopes = savedData.elements.filter(el => el.metadata && el.metadata.isScope && currentPpiIds.has(el.parentId));
            if (savedTargets.length > 0 || savedScopes.length > 0) {
              // Restauración directa desde datos guardados (sin coordinación externa)
              try {
            const modeler = registry && registry.get ? registry.get('BpmnModeler') : null;
            if (modeler) {
                  const elementRegistry = modeler.get('elementRegistry');
              const modeling = modeler.get('modeling');
              const elementFactory = modeler.get('elementFactory');
                  const createFromSaved = (savedEl) => {
                    const parent = elementRegistry && elementRegistry.get(savedEl.parentId);
                    if (!parent || !modeling || !elementFactory) return null;
                    const type = savedEl.metadata && savedEl.metadata.isTarget ? 'PPINOT:Target' : 'PPINOT:Scope';
                    const size = type === 'PPINOT:Target' ? { width: 25, height: 25 } : { width: 28, height: 28 };
                    const shape = elementFactory.create('shape', { id: savedEl.id, type, ...size });
                    const pos = savedEl.position || {};
                    const parentBounds = parent.bounds || { x: parent.x || 0, y: parent.y || 0 };
                    const x = typeof pos.x === 'number' ? pos.x : parentBounds.x + 150;
                    const y = typeof pos.y === 'number' ? pos.y : parentBounds.y + (type === 'PPINOT:Target' ? 0 : 60);
                    const created = modeling.createShape(shape, { x, y }, parent);
                    // Aplicar nombre guardado si existe
                    const savedName = (savedEl.businessObject && savedEl.businessObject.name) || savedEl.name || '';
                    if (savedName) {
                      try { modeling.updateProperties(created, { name: savedName }); } catch (_) { /* no-op */ }
                      if (created.businessObject) created.businessObject.name = savedName;
                    }
                    return created;
                  };
                  savedTargets.forEach(t => { const created = createFromSaved(t); if (created) ppiChildren.push(created); });
                  savedScopes.forEach(s => { const created = createFromSaved(s); if (created) ppiChildren.push(created); });
                  // Continuar para guardar estado actualizado sin crear por defecto
                }
              } catch (_) { /* no-op */ }
            }
          }
        } catch (_) { /* no-op */ }
      }
      
      // Optimización: Crear relaciones de forma más eficiente
      for (const childEl of ppiChildren) {
        // Determinar el tipo de elemento hijo de forma más eficiente y generalizada
        const boType = (childEl.businessObject && childEl.businessObject.$type) || '';
        const elType = childEl.type || '';
        let childType = boType || elType || 'unknown';
        let isTarget = false;
        let isScope = false;

        if (childType.includes('Target') || (childEl.id && childEl.id.includes('Target'))) {
          childType = 'PPINOT:Target';
          isTarget = true;
        } else if (childType.includes('Scope') || (childEl.id && childEl.id.includes('Scope'))) {
          childType = 'PPINOT:Scope';
          isScope = true;
        }

        // Determinar padre: usar primero el $parent del BO, luego el shape.parent, luego fallback al primer PPI
        let parentId = null;
        let parentType = null;
        let parentName = '';

        if (childEl.businessObject && childEl.businessObject.$parent && childEl.businessObject.$parent.id) {
          parentId = childEl.businessObject.$parent.id;
          parentType = (childEl.businessObject.$parent.$type) || (childEl.parent && childEl.parent.type) || null;
          parentName = childEl.businessObject.$parent.name || '';
        } else if (childEl.parent && childEl.parent.id) {
          parentId = childEl.parent.id;
          parentType = childEl.parent.type;
          parentName = childEl.parent.businessObject ? childEl.parent.businessObject.name : '';
        } else if (ppiElements.length > 0) {
          // Buscar PPI contenedor o más cercano por geometría
          const childBounds = childEl.bounds || { x: childEl.x || 0, y: childEl.y || 0, width: childEl.width || 0, height: childEl.height || 0 };
          const childCenter = { x: childBounds.x + childBounds.width / 2, y: childBounds.y + childBounds.height / 2 };

          let bestPpi = null;
          let bestDist = Infinity;

          for (const ppi of ppiElements) {
            const ppiBounds = ppi.bounds || { x: ppi.x || 0, y: ppi.y || 0, width: ppi.width || 0, height: ppi.height || 0 };
            const ppiCenter = { x: ppiBounds.x + ppiBounds.width / 2, y: ppiBounds.y + ppiBounds.height / 2 };

            const inside = (childCenter.x >= ppiBounds.x && childCenter.x <= ppiBounds.x + ppiBounds.width &&
                            childCenter.y >= ppiBounds.y && childCenter.y <= ppiBounds.y + ppiBounds.height);
            const dist = Math.hypot(childCenter.x - ppiCenter.x, childCenter.y - ppiCenter.y);

            // Priorizar contención; si no, usar la distancia mínima
            if (inside) {
              bestPpi = ppi;
              bestDist = -1; // mejor posible
              break;
            }
            if (dist < bestDist) {
              bestDist = dist;
              bestPpi = ppi;
            }
          }

          // Umbral de proximidad razonable para considerar pertenencia si no hay contención
          const proximityThreshold = 400;
          if (bestPpi && (bestDist < 0 || bestDist <= proximityThreshold)) {
            parentId = bestPpi.id;
            parentType = bestPpi.type;
            parentName = bestPpi.businessObject ? bestPpi.businessObject.name : '';
          }
        }
        
        if (parentId) {
          relationships.push({
            childId: childEl.id,
            parentId: parentId,
            childType: childType,
            parentType: parentType,
            childBusinessObjectType: childEl.businessObject ? childEl.businessObject.$type : null,
            parentBusinessObjectType: parentType,
            childName: childEl.businessObject ? childEl.businessObject.name : childEl.id,
            parentName: parentName,
            isTarget: isTarget,
            isScope: isScope,
            timestamp: Date.now()
          });
        }
      }
      
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log(`🔗 Relaciones creadas: ${relationships.length}`);
      // relationships.forEach(rel => console.log(`  - ${rel.childName} (${rel.childType}) -> ${rel.parentName} (${rel.parentType})`));
      
      // Usar el sistema unificado para guardar
      const registry = getServiceRegistry && getServiceRegistry();
      // Optimización: Reducir logs de debug
      // console.log('🔍 [DEBUG] Service registry disponible:', !!registry);
      
      const ppinotStorageManager = registry && registry.get ? registry.get('PPINOTStorageManager') : null;
      // console.log('🔍 [DEBUG] PPINOTStorageManager disponible:', !!ppinotStorageManager);
      // console.log('🔍 [DEBUG] Elementos a guardar:', allPPINOTElements.length);
      // console.log('🔍 [DEBUG] Relaciones a guardar:', relationships.length);
      
      if (ppinotStorageManager) {
        // console.log('🔍 [DEBUG] Llamando ppinotStorageManager.savePPINOTElements...');
        ppinotStorageManager.savePPINOTElements(allPPINOTElements, relationships);
        // console.log('🔍 [DEBUG] Resultado del guardado:', saveResult);
        
        // Si se crearon elementos Target/Scope por defecto, disparar restauración
        if (ppiElements.length > 0 && ppiChildren.length > 0) {
          // Optimización: Reducir logs de debug
          // console.log('🎯 Disparando restauración de elementos Target/Scope...');
          // Deshabilitado para evitar regeneración automática
          // setTimeout(() => {
          //   const coordinationManager = registry && registry.get ? registry.get('PPINOTCoordinationManager') : null;
          //   if (coordinationManager) {
          //     coordinationManager.triggerRestoration('ppi.detection');
          //   }
          // }, 1000);
        }
        
        // También disparar restauración si hay elementos Target/Scope existentes - DESHABILITADO
        if (ppiElements.length > 0 && (ppiChildren.length > 0)) {
          // Optimización: Reducir logs de debug para mejorar rendimiento
          // console.log('🎯 Disparando restauración de elementos Target/Scope existentes...');
          // Deshabilitado para evitar regeneración automática
          // setTimeout(() => {
          //   const coordinationManager = registry && registry.get ? registry.get('PPINOTCoordinationManager') : null;
          //   if (coordinationManager) {
          //     coordinationManager.triggerRestoration('ppi.existing');
          //   }
          // }, 1500);
        }
      } else {
        // Fallback al sistema anterior
        // Optimización: Reducir logs de debug para mejorar rendimiento
        // console.log('⚠️ [DEBUG] PPINOTStorageManager no disponible, usando fallback');
        this.savePPINOTRelationshipsToXML(relationships);
      }
      
    } catch (error) {
      console.error('Error guardando elementos PPINOT:', error);
    } finally {
      // Performance monitoring
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 100) { // Log only if it takes more than 100ms
        console.warn(`⚠️ savePPINOTElements took ${duration.toFixed(2)}ms`);
      }
    }
  }

  savePPINOTRelationshipsToXML(relationships) {
    try {
      // Guardar relaciones PPINOT en el XML BPMN para persistencia completa
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) return;
      
      this.clearXmlCache();

      modeler.saveXML({ format: true }).then(result => {
        if (result && result.xml) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(result.xml, 'text/xml');
          
          let extensionsElement = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements')[0];
          if (!extensionsElement) {
            extensionsElement = xmlDoc.createElementNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements');
            const definitions = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'definitions')[0];
            if (definitions) {
              definitions.appendChild(extensionsElement);
            }
          }
          
          let ppinotElement = extensionsElement.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships')[0];
          if (!ppinotElement) {
            ppinotElement = xmlDoc.createElementNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships');
            extensionsElement.appendChild(ppinotElement);
          }
          
          ppinotElement.innerHTML = '';
          
          relationships.forEach(rel => {
            const relationshipElement = xmlDoc.createElementNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'ppinot:relationship');
            relationshipElement.setAttribute('childId', rel.childId);
            relationshipElement.setAttribute('parentId', rel.parentId);
            relationshipElement.setAttribute('childType', rel.childType);
            relationshipElement.setAttribute('parentType', rel.parentType);
            relationshipElement.setAttribute('childBusinessObjectType', rel.childBusinessObjectType || '');
            relationshipElement.setAttribute('parentBusinessObjectType', rel.parentBusinessObjectType || '');
            relationshipElement.setAttribute('childName', rel.childName || '');
            relationshipElement.setAttribute('parentName', rel.parentName || '');
            relationshipElement.setAttribute('timestamp', rel.timestamp);
            
            ppinotElement.appendChild(relationshipElement);
          });
          
          const serializer = new XMLSerializer();
          const updatedXML = serializer.serializeToString(xmlDoc);
          
          localStorage.setItem('bpmnDiagram', updatedXML);
        }
              }).catch(() => {
        });
      
    } catch (e) {
      // ignore purge errors
      console.debug('Purge error ignored:', e.message);
    }
  }

  getChildElements(parentId, allElements) {
    return allElements
      .filter(el => el.parent && el.parent.id === parentId)
      .map(el => ({
        id: el.id,
        type: el.type,
        name: el.businessObject ? el.businessObject.name : ''
      }));
  }

  calculateRelativePosition(childElement, parentElement) {
    if (!childElement || !parentElement) return null;
    
    try {
      return {
        x: childElement.x - parentElement.x,
        y: childElement.y - parentElement.y
      };
    } catch (e) {
      return null;
    }
  }

  loadPPINOTElements() {
    const startTime = performance.now();
    try {
      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log('🔄 Cargando elementos PPINOT desde localStorage...');
      
      // Usar el sistema unificado para cargar datos
      const registry = getServiceRegistry && getServiceRegistry();
      const ppinotStorageManager = registry && registry.get ? registry.get('PPINOTStorageManager') : null;
      
      if (ppinotStorageManager) {
        const ppinotData = ppinotStorageManager.loadPPINOTElements();
        
        if (ppinotData.elements.length === 0) {
          // Optimización: Reducir logs de debug para mejorar rendimiento
          // console.log('ℹ️ No hay elementos PPINOT guardados');
          return false;
        }

        // Optimización: Reducir logs de debug para mejorar rendimiento
        // console.log(`🔍 Cargados ${ppinotData.elements.length} elementos PPINOT desde sistema unificado`);

        // Guardar para restauración posterior
        this.pendingPPINOTRestore = ppinotData.elements;
        this.pendingPPINOTRelationships = ppinotData.relationships;

        // Optimización: Reducir logs de debug para mejorar rendimiento
        // console.log('✅ Elementos PPINOT cargados correctamente desde sistema unificado');
        return true;
      } else {
        // Fallback al sistema anterior
        const ppinotElementsData = localStorage.getItem('ppinotElements');
        if (!ppinotElementsData) {
          // Optimización: Reducir logs de debug para mejorar rendimiento
          // console.log('ℹ️ No hay elementos PPINOT guardados en localStorage');
          return false;
        }

        const ppinotElements = JSON.parse(ppinotElementsData);
        // Optimización: Reducir logs de debug para mejorar rendimiento
        // console.log(`🔍 Cargados ${ppinotElements.length} elementos PPINOT desde localStorage (fallback)`);

        if (!Array.isArray(ppinotElements)) {
          console.error('❌ Datos PPINOT inválidos: no es un array');
          return false;
        }

        this.pendingPPINOTRestore = ppinotElements;
        
        const ppinotRelationshipsData = localStorage.getItem('ppinotRelationships');
        if (ppinotRelationshipsData) {
          try {
            const ppinotRelationships = JSON.parse(ppinotRelationshipsData);
            if (Array.isArray(ppinotRelationships)) {
              this.pendingPPINOTRelationships = ppinotRelationships;
              // Optimización: Reducir logs de debug para mejorar rendimiento
              // console.log(`🔗 Cargadas ${ppinotRelationships.length} relaciones PPINOT desde localStorage`);
            }
          } catch (error) {
            console.error('❌ Error cargando relaciones PPINOT:', error);
          }
        }

        return true;
      }
      
    } catch (error) {
      console.error('❌ Error cargando elementos PPINOT desde localStorage:', error);
      return false;
    } finally {
      // Performance monitoring
      const endTime = performance.now();
      const duration = endTime - startTime;
      if (duration > 50) { // Log only if it takes more than 50ms
        console.warn(`⚠️ loadPPINOTElements took ${duration.toFixed(2)}ms`);
      }
    }
  }

  loadPPINOTRelationshipsFromXML() {
    try {
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) return [];
      
      if (this.isLoadingRelationships) {
        return [];
      }
      
      const now = Date.now();
      if (this.xmlRelationshipsCache && (now - this.lastXmlCacheTime) < this.xmlCacheTimeout) {
        return this.xmlRelationshipsCache;
      }
      
      this.isLoadingRelationships = true;
      
      const relationships = [];
      
      try {
        let currentXML = null;
        
        if (modeler.getXML) {
          currentXML = modeler.getXML();
        }
        
        if (!currentXML && modeler.get('canvas')) {
          const rootElement = modeler.get('canvas').getRootElement();
          if (rootElement && rootElement.businessObject && rootElement.businessObject.$model) {
            currentXML = rootElement.businessObject.$model.serialize();
          }
        }
        
        if (!currentXML && modeler.get('moddle')) {
          const moddle = modeler.get('moddle');
          if (moddle && moddle.serialize) {
            const rootElement = modeler.get('canvas').getRootElement();
            if (rootElement && rootElement.businessObject) {
              currentXML = moddle.serialize(rootElement.businessObject);
            }
          }
        }
        
        if (currentXML) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(currentXML, 'text/xml');
          
          const ppinotRelationships = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'relationship');
          
          ppinotRelationships.forEach(relElement => {
            const relationship = {
              childId: relElement.getAttribute('childId'),
              parentId: relElement.getAttribute('parentId'),
              childType: relElement.getAttribute('childType'),
              parentType: relElement.getAttribute('parentType'),
              childBusinessObjectType: relElement.getAttribute('childBusinessObjectType'),
              parentBusinessObjectType: relElement.getAttribute('parentBusinessObjectType'),
              childName: relElement.getAttribute('childName'),
              parentName: relElement.getAttribute('parentName'),
              timestamp: parseInt(relElement.getAttribute('timestamp')) || Date.now()
            };
            
            relationships.push(relationship);
          });
          
          this.xmlRelationshipsCache = relationships;
          this.lastXmlCacheTime = now;
        } else {
          throw new Error('No se pudo obtener XML síncrono');
        }
      } catch (xmlError) {
        modeler.saveXML({ format: true }).then(result => {
          if (result && result.xml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(result.xml, 'text/xml');
            
            const ppinotRelationships = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'relationship');
            
            ppinotRelationships.forEach(relElement => {
              const relationship = {
                childId: relElement.getAttribute('childId'),
                parentId: relElement.getAttribute('parentId'),
                childType: relElement.getAttribute('childType'),
                parentType: relElement.getAttribute('parentType'),
                childBusinessObjectType: relElement.getAttribute('childBusinessObjectType'),
                parentBusinessObjectType: relElement.getAttribute('parentBusinessObjectType'),
                childName: relElement.getAttribute('childName'),
                parentName: relElement.getAttribute('parentName'),
                timestamp: parseInt(relElement.getAttribute('timestamp')) || Date.now()
              };
              
              relationships.push(relationship);
            });
            
            this.xmlRelationshipsCache = relationships;
            this.lastXmlCacheTime = now;
          }
          
          this.isLoadingRelationships = false;
        }).catch(() => {
          this.isLoadingRelationships = false;
        });
      }
      
      this.isLoadingRelationships = false;
      return relationships;
    } catch (e) {
      this.isLoadingRelationships = false;
      return [];
    }
  }

  restorePPINOTRelationshipsFromXML(relationships) {
    try {
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler || !relationships.length) return;
      
      if (this.isRestoringRelationships) {
        return;
      }
      
      this.isRestoringRelationships = true;
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
        const restoreAllRelationships = () => {
          relationships.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            if (!childElement.parent || childElement.parent.id !== rel.parentId) {
                              try {
                  modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
                } catch (error) {
                  console.debug('Move shape error ignored:', error.message);
                }
              }
          }
        });
        
        this.isRestoringRelationships = false;
      };
      
      restoreAllRelationships();
      
    } catch (e) {
      this.isRestoringRelationships = false;
    }
  }

  restorePPINOTElements() {
    try {
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) {
        return false;
      }
      
      if (this.isRestoringElements) {
        return false;
      }
      
      this.isRestoringElements = true;
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      const xmlRelationships = this.loadPPINOTRelationshipsFromXML();
      
      if (!this.pendingPPINOTRestore) {
        this.loadPPINOTElements();
      }
      
      if (!this.pendingPPINOTRestore) {
        this.isRestoringElements = false;
        return true;
      }
      
      const ppinotData = this.pendingPPINOTRestore;
      
      const allRelationshipsToRestore = [];
      
      xmlRelationships.forEach(rel => {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);
        
        if (childElement && parentElement) {
          if (!childElement.parent || childElement.parent.id !== rel.parentId) {
            allRelationshipsToRestore.push({
              childId: rel.childId,
              parentId: rel.parentId,
              childData: rel,
              source: 'xml'
            });
          }
        }
      });
      
      if (ppinotData.parentChildRelationships) {
        ppinotData.parentChildRelationships.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            if (!childElement.parent || childElement.parent.id !== rel.parentId) {
              const alreadyInList = allRelationshipsToRestore.some(existing => 
                existing.childId === rel.childId && existing.parentId === rel.parentId
              );
              
              if (!alreadyInList) {
                allRelationshipsToRestore.push({
                  childId: rel.childId,
                  parentId: rel.parentId,
                  childData: rel,
                  source: 'localStorage'
                });
              }
            }
          }
        });
      }
      
      if (allRelationshipsToRestore.length > 0) {
        
        allRelationshipsToRestore.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            try {
                              if (!childElement.parent || childElement.parent.id !== rel.parentId) {
                  modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
                }
            } catch (error) {
              console.debug('Move shape error ignored:', error.message);
            }
          }
        });
      }
      
      const restoredChildren = new Map();
      ppinotData.ppiChildren.forEach(childData => {
        const existingElement = elementRegistry.get(childData.id);
        if (existingElement) {
          restoredChildren.set(childData.id, existingElement);
        }
      });
      
      this.updatePPIsWithRestoredChildren(restoredChildren);
      
      this.pendingPPINOTRestore = null;
      
      this.isRestoringElements = false;
      return true;
      
    } catch (error) {
      this.isRestoringElements = false;
      return false;
    }
  }

  restoreParentChildRelationship(childId, parentId, childData = null) {
    try {
      // Restaurar relación padre-hijo usando el servicio de modelado de BPMN.js
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) return false;
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const eventBus = modeler.get('eventBus');
      
      const childElement = elementRegistry.get(childId);
      const parentElement = elementRegistry.get(parentId);
      
      if (!childElement || !parentElement) {
        return false;
      }
      
      if (childElement.parent && childElement.parent.id === parentId) {
        return true;
      }
      
      try {
        // Usar modeling.moveShape para establecer la relación correctamente
        modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
        
        setTimeout(() => {
          const updatedChildElement = elementRegistry.get(childId);
          if (updatedChildElement && updatedChildElement.parent && updatedChildElement.parent.id === parentId) {
            
            if (childData) {
              this.updatePPIWithChildInfo(parentId, childId);
            }
          }
        }, 100);
        
        return true;
      } catch (error) {
        
        try {
          
          eventBus.fire('element.updateParent', {
            element: childElement,
            oldParent: childElement.parent,
            newParent: parentElement
          });
          
          return true;
        } catch (fallbackError) {
          
          // Último recurso: marcar para reprocesamiento
          this.processedElements.delete(childId);
          if (childData) {
            this.pendingChildData = this.pendingChildData || new Map();
            this.pendingChildData.set(childId, {
              parentId: parentId,
              childData: childData,
              timestamp: Date.now()
            });
          }
          return false;
        }
      }
    } catch (e) {
      return false;
    }
  }

  updatePPIsWithRestoredChildren(restoredChildren) {
    try {
      
      restoredChildren.forEach((childElement, childId) => {
        if (childElement.parent && childElement.parent.type === 'PPINOT:Ppi') {
          const parentPPIId = childElement.parent.id;
          
          this.updatePPIWithChildInfo(parentPPIId, childId);
        }
      });
      
    } catch (e) {
      // ignore purge errors
      console.debug('Purge error ignored:', e.message);
    }
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    try {
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (!modeler) return;
      
      const elementRegistry = modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        return;
      }
      
      const existingPPI = this.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
        return;
      }
      
      let updatedData = { updatedAt: new Date().toISOString() };
      
      if (childElement.type === 'PPINOT:Target') {
        const targetName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.target = targetName;
      } else if (childElement.type === 'PPINOT:Scope') {
        const scopeName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.scope = scopeName;
      } else if (childElement.type === 'PPINOT:Measure') {
        const measureName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.measureDefinition = {
          type: this.detectMeasureType(childElementId, childElement.type),
          definition: measureName
        };
      } else if (childElement.type === 'PPINOT:Condition') {
        const conditionName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.businessObjective = conditionName;
      }
      
      if (this.updatePPI(existingPPI.id, updatedData)) {
        return true;
      }
      
    } catch (error) {
      console.debug('Error ignored:', error.message);
    }
    return false;
  }

  clearPPIChildInfo(elementType, parentPPIId = null) {
    try {
      const affectedPPIs = this.ppis.filter(ppi => {
        if (parentPPIId) {
          return ppi.elementId === parentPPIId;
        }
        return true; // Clear from all PPIs if no specific parent
      });
      
      affectedPPIs.forEach(ppi => {
        let updatedData = { updatedAt: new Date().toISOString() };
        
        if (elementType === 'PPINOT:Target') {
          updatedData.target = null;
        } else if (elementType === 'PPINOT:Scope') {
          updatedData.scope = null;
        }
        
        this.updatePPI(ppi.id, updatedData);
      });
      
      return affectedPPIs.length;
      
    } catch (error) {
      return 0;
    }
  }

  processPendingChildElements() {
    try {
      if (!this.pendingChildData || this.pendingChildData.size === 0) {
        return;
      }
      
      
      this.pendingChildData.forEach((data, childId) => {
        
        this.updatePPIWithChildInfo(data.parentId, childId);
        
        this.processedElements.add(childId);
      });
      
      this.pendingChildData.clear();
    } catch (e) {
      // ignore purge errors
      console.debug('Purge error ignored:', e.message);
    }
  }

  
  cleanupOldData() {
    try {
      // Cleanup logic can be added here if needed
    } catch (e) {
      // ignore purge errors
      console.debug('Purge error ignored:', e.message);
    }
  }

  
  enableAutoSave() {
    this.autoSaveEnabled = true;
  }

  disableAutoSave() {
    this.autoSaveEnabled = false;
  }

  isAutoSaveEnabled() {
    return this.autoSaveEnabled !== false; // Por defecto habilitado
  }

  
  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    this.filteredPPIs = this.ppis.filter(ppi => {
      const matchesSearch = !searchTerm || 
        ppi.title.toLowerCase().includes(searchTerm) ||
        ppi.process.toLowerCase().includes(searchTerm) ||
        ppi.businessObjective.toLowerCase().includes(searchTerm);

      const matchesType = !typeFilter || ppi.measureDefinition.type === typeFilter;

      let matchesStatus = true;
      if (statusFilter === 'linked') {
        matchesStatus = !!ppi.elementId;
      } else if (statusFilter === 'unlinked') {
        matchesStatus = !ppi.elementId;
      }

      return matchesSearch && matchesType && matchesStatus;
    });

    return this.filteredPPIs;
  }

  
  isPPIElement(element) {
    if (!element) return false;
    
    if (element.businessObject && element.businessObject.$type) {
      const type = element.businessObject.$type;
      if (type === 'PPINOT:Ppi') {
        return true;
      }
    }
    
    if (element.type === 'PPINOT:Ppi') {
      return true;
    }
    
    if (element.type && element.type.includes('PPINOT') && element.type.includes('Ppi')) {
      return true;
    }
    
    return false;
  }

  detectMeasureType(elementId, elementType) {
    const id = elementId.toLowerCase();
    const type = elementType.toLowerCase();
    
    if (id.includes('time') || type.includes('time')) return 'time';
    if (id.includes('count') || type.includes('count')) return 'count';
    if (id.includes('data') || type.includes('data')) return 'data';
    if (id.includes('state') || type.includes('state')) return 'state';
    if (id.includes('aggregated') || type.includes('aggregated')) return 'aggregated';
    if (id.includes('derived') || type.includes('derived')) return 'derived';
    
    return 'derived'; // Por defecto
  }

  extractChildElementInfo(childElementId) {
    const info = {};
    
    try {
      const modeler = (this.adapter && this.adapter.getBpmnModeler && this.adapter.getBpmnModeler()) || (getServiceRegistry && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
      
      if (modeler) {
        const elementRegistry = modeler.get('elementRegistry');
        const element = elementRegistry.get(childElementId);
        
        if (element && element.businessObject) {
          const name = element.businessObject.name || '';
          const type = element.businessObject.$type || '';
          
          if (childElementId.toLowerCase().includes('target') || type.toLowerCase().includes('target')) {
            info.target = name || `Target definido en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('scope') || type.toLowerCase().includes('scope')) {
            info.scope = name || `Scope definido en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('measure') || childElementId.toLowerCase().includes('medida') || type.toLowerCase().includes('measure')) {
            info.measureDefinition = {
              type: this.detectMeasureType(childElementId, type),
              definition: name || `Medida definida en ${childElementId}`
            };
          }
          
          if (childElementId.toLowerCase().includes('condition') || type.toLowerCase().includes('condition')) {
            info.businessObjective = name || `Condición definida en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('data') || type.toLowerCase().includes('data')) {
            info.source = name || `Fuente de datos: ${childElementId}`;
          }
        }
      }
      
    } catch (error) {
      console.debug('Error ignored:', error.message);
    }
    
    return info;
  }

  
  getStatistics() {
    const totalPPIs = this.ppis.length;
    const linkedPPIs = this.ppis.filter(ppi => ppi.elementId).length;
    const timeMeasures = this.ppis.filter(ppi => ppi.measureDefinition.type === 'time').length;

    return {
      total: totalPPIs,
      linked: linkedPPIs,
      timeMeasures: timeMeasures
    };
  }

  
  exportPPIsToFile() {
    try {
      const dataStr = JSON.stringify(this.ppis, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ppis_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      return false;
    }
  }

  
  parseFormData(formData) {
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    if (data.measureType && data.measureDefinition) {
      data.measureDefinition = {
        type: data.measureType,
        definition: data.measureDefinition
      };
      delete data.measureType; // Remover el campo temporal
    }
    
    if (data.informed) {
      data.informed = data.informed.split(',').map(item => item.trim());
    }
    
    return data;
  }

  truncateText(text, maxLength = 40) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

const registry = getServiceRegistry();
if (registry) {
  registry.register('PPICore', PPICore, { 
    description: 'Core de PPIs' 
  });
  
  const isDevelopment = true;
  if (isDevelopment) {
    if (typeof window !== 'undefined' && window) {
      try {
        window.__debug = { ...(window.__debug || {}), PPICore };
      } catch (e) {
        console.debug('Debug setup error ignored:', e.message);
      }
    }
  }
}

export default PPICore;
