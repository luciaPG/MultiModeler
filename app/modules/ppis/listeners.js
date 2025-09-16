// Encapsula TODOS los listeners BPMN. No usa window ni getServiceRegistry.
import { EVENTS } from './events.js';

export function createBpmnListeners({
  adapter,
  core,
  callbacks // { onCreatePPIFromElement, onUpdatePPIFromElement, onUpdatePPIWithChildInfo, onRemovePPIFromList, onSelectPPI, onSyncAllPPIs }
}) {

  let modeler = null;
  let eventBus = null;
  const registered = []; // [{event, handler}]

  function on(event, handler) {
    eventBus.on(event, handler);
    registered.push({ event, handler });
  }

  function offAll() {
    registered.forEach(({ event, handler }) => {
      try { eventBus.off(event, handler); } catch(error) {
        // Ignore errors when removing listeners
      }
    });
    registered.length = 0;
  }

  function attach() {
    console.log('🔧 [PPI-Listeners] Intentando adjuntar listeners...');
    modeler = adapter && adapter.getBpmnModeler ? adapter.getBpmnModeler() : null;
    if (!modeler) {
      console.warn('[PPI-Listeners] No modeler available yet');
      return false;
    }
    console.log('✅ [PPI-Listeners] Modeler encontrado');
    
    eventBus = modeler.get('eventBus');
    if (!eventBus) {
      console.warn('[PPI-Listeners] No eventBus available');
      return false;
    }
    console.log('✅ [PPI-Listeners] EventBus encontrado');

    // --- Añadir listeners (una sola vez) ---
    on(EVENTS.ELEMENT_REMOVED, (e) => {
      const el = e.element;
      if (!el) return;
      if (core && core.isPPIElement && core.isPPIElement(el)) callbacks.onRemovePPIFromList(el.id);
    });

    const tryCreateFrom = (el) => {
      if (!el) return;
      console.log('🔧 [PPI-Listeners] Elemento creado:', el.type, el.id);
      if (core && core.isPPIElement && core.isPPIElement(el)) {
        console.log('✅ [PPI-Listeners] Elemento PPINOT detectado, creando PPI:', el.id);
        callbacks.onCreatePPIFromElement(el.id);
      } else {
        console.log('ℹ️ [PPI-Listeners] Elemento no es PPINOT:', el.type);
      }
    };

    // Listeners para crear PPIs
    on(EVENTS.ELEMENT_ADDED, (e) => {
      const el = e.element;
      if (!el) return;
      
      // Solo crear PPI si es un elemento PPINOT principal
      if (core && core.isPPIElement && core.isPPIElement(el)) {
        console.log('✅ [PPI-Listeners] Elemento PPINOT detectado, creando PPI:', el.id);
        callbacks.onCreatePPIFromElement(el.id);
      } else if (['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(el.type)) {
        // Si es un elemento hijo, detectar conexión con PPI
        console.log(`🔄 [PPI-Listeners] Elemento hijo agregado: ${el.id}, tipo: ${el.type}`);
        
        // Buscar el PPI más cercano después de un delay
        setTimeout(() => {
          const modeler = adapter && adapter.getBpmnModeler ? adapter.getBpmnModeler() : null;
          if (modeler) {
            const elementRegistry = modeler.get('elementRegistry');
            const updatedElement = elementRegistry.get(el.id);
            
            if (updatedElement && updatedElement.parent && updatedElement.parent.type === 'PPINOT:Ppi') {
              console.log(`✅ [PPI-Listeners] Elemento hijo conectado a PPI por proximidad: ${updatedElement.parent.id}`);
              callbacks.onUpdatePPIWithChildInfo(updatedElement.parent.id, updatedElement.id);
            }
          }
        }, 300); // Delay para asegurar que el elemento esté registrado
      }
    });
    
    on(EVENTS.CREATE_END, (e) => tryCreateFrom(e && e.context && e.context.shape ? e.context.shape : null));
    on(EVENTS.CMD_CREATE_EXECUTED, (e) => tryCreateFrom(e && e.context && e.context.shape ? e.context.shape : null));
    
    // MEJORADO: Detectar cuando se suelta un elemento cerca de un PPI
    on('element.drop', (e) => {
      console.log(`🔄 [PPI-Listeners] Elemento soltado:`, e);
      
      const droppedElement = e && e.element ? e.element : null;
      if (droppedElement && ['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(droppedElement.type)) {
        console.log(`✅ [PPI-Listeners] Elemento hijo soltado: ${droppedElement.id}, tipo: ${droppedElement.type}`);
        
        // Buscar el PPI padre más cercano por proximidad
        setTimeout(() => {
          const modeler = adapter && adapter.getBpmnModeler ? adapter.getBpmnModeler() : null;
          if (modeler) {
            const elementRegistry = modeler.get('elementRegistry');
            const updatedElement = elementRegistry.get(droppedElement.id);
            
            if (updatedElement) {
              // Buscar PPIs cercanos
              const ppiElements = elementRegistry.filter(el => el.type === 'PPINOT:Ppi');
              let closestPPI = null;
              let minDistance = Infinity;
              
              ppiElements.forEach(ppi => {
                if (ppi.x && ppi.y && updatedElement.x && updatedElement.y) {
                  const distance = Math.sqrt(
                    Math.pow(updatedElement.x - ppi.x, 2) + 
                    Math.pow(updatedElement.y - ppi.y, 2)
                  );
                  if (distance < minDistance && distance < 300) { // 300px de proximidad
                    minDistance = distance;
                    closestPPI = ppi;
                  }
                }
              });
              
              if (closestPPI) {
                console.log(`✅ [PPI-Listeners] Elemento hijo conectado a PPI por proximidad: ${closestPPI.id} (distancia: ${minDistance}px)`);
                callbacks.onUpdatePPIWithChildInfo(closestPPI.id, updatedElement.id);
              } else {
                // Si no hay PPI cercano, buscar todos los PPIs y usar el primero
                if (ppiElements.length > 0) {
                  console.log(`✅ [PPI-Listeners] No hay PPI cercano, usando el primer PPI disponible: ${ppiElements[0].id}`);
                  callbacks.onUpdatePPIWithChildInfo(ppiElements[0].id, updatedElement.id);
                }
              }
              
              // Forzar sincronización de todos los PPIs después de un delay
              setTimeout(() => {
                if (callbacks.onSyncAllPPIs) {
                  callbacks.onSyncAllPPIs();
                }
              }, 1000);
            }
          }
        }, 500); // Delay más largo para asegurar que el elemento esté completamente registrado
      }
    });

    on(EVENTS.ELEMENT_CHANGED, (e) => {
      const el = e.element;
      if (!el) return;

      // PPI principal
      if (core && core.isPPIElement && core.isPPIElement(el)) callbacks.onUpdatePPIFromElement(el);

      // Hijos (Target / Scope / Measure / Condition) → actualiza el padre
      const isChild = el.parent && el.parent.type === 'PPINOT:Ppi';
      if (isChild && ['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(el.type)) {
        callbacks.onUpdatePPIWithChildInfo(el.parent.id, el.id);
      }
    });

    on(EVENTS.CMD_UPDATE_PROPS_EXECUTED, (e) => {
      const el = e && e.context && e.context.element ? e.context.element : null;
      if (!el) return;
      if (el.parent && el.parent.type === 'PPINOT:Ppi' && ['PPINOT:Target','PPINOT:Scope'].includes(el.type)) {
        console.log(`🔄 [PPI-Listeners] Propiedades actualizadas: ${el.id}, tipo: ${el.type}`);
        callbacks.onUpdatePPIWithChildInfo(el.parent.id, el.id);
      }
    });
    
    // MEJORADO: Detectar cuando se conectan elementos hijos al PPI
    on(EVENTS.CONNECT_END, (e) => {
      const connection = e && e.context && e.context.connection ? e.context.connection : null;
      if (!connection) return;
      
      console.log(`🔄 [PPI-Listeners] Conexión creada: ${connection.id}, tipo: ${connection.type}`);
      
      // Verificar si es una conexión a un PPI
      const targetElement = connection.target;
      if (targetElement && targetElement.type === 'PPINOT:Ppi') {
        console.log(`✅ [PPI-Listeners] Conexión detectada hacia PPI: ${targetElement.id}`);
        
        // Buscar el elemento fuente (Target, Scope, etc.)
        const sourceElement = connection.source;
        if (sourceElement && ['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(sourceElement.type)) {
          console.log(`✅ [PPI-Listeners] Elemento hijo conectado: ${sourceElement.id}, tipo: ${sourceElement.type}`);
          
          // Actualizar el PPI con la información del hijo
          callbacks.onUpdatePPIWithChildInfo(targetElement.id, sourceElement.id);
        }
      }
    });
    
    // MEJORADO: Detectar cuando se mueven elementos hijos
    on(EVENTS.ELEMENT_MOVED, (e) => {
      const el = e && e.element ? e.element : null;
      if (!el) return;
      
      // Verificar si es un elemento hijo que se movió
      if (el.parent && el.parent.type === 'PPINOT:Ppi' && 
          ['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(el.type)) {
        console.log(`🔄 [PPI-Listeners] Elemento hijo movido: ${el.id}, tipo: ${el.type}`);
        callbacks.onUpdatePPIWithChildInfo(el.parent.id, el.id);
      }
    });
    
    // MEJORADO: Detectar cuando se edita el texto de un elemento directamente en el canvas
    on('directEditing.complete', (e) => {
      const element = e && e.element ? e.element : null;
      if (!element) return;
      
      if (['PPINOT:Target', 'PPINOT:Scope', 'PPINOT:Measure', 'PPINOT:Condition'].includes(element.type)) {
        console.log(`🔄 [PPI-Listeners] Texto editado completado: ${element.id}, tipo: ${element.type}`);
        
        // Verificar si tiene un padre PPI
        if (element.parent && element.parent.type === 'PPINOT:Ppi') {
          console.log(`✅ [PPI-Listeners] Elemento hijo editado conectado a PPI: ${element.parent.id}`);
          callbacks.onUpdatePPIWithChildInfo(element.parent.id, element.id);
        }
      }
    });
    
    on(EVENTS.SHAPE_CHANGED, (e) => {
      const el = e.element;
      if (core && core.isPPIElement && core.isPPIElement(el)) callbacks.onCreatePPIFromElement(el.id); // crea si no existía
    });

    on(EVENTS.SELECTION_CHANGED, (e) => {
      const list = e.newSelection || [];
      if (list.length === 1) {
        const ppi = core && core.ppis ? core.ppis.find(p => p.elementId === list[0].id) : null;
        callbacks.onSelectPPI(ppi && ppi.id ? ppi.id : null);
      } else {
        callbacks.onSelectPPI(null);
      }
    });

    console.log('✅ [PPI-Listeners] Todos los listeners adjuntados exitosamente');
    return true;
  }

  function detach() {
    if (!eventBus) return;
    offAll();
  }

  return { attach, detach };
}
