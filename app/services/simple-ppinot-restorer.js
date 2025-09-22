/**
 * Sistema Simple de Restauración PPINOT
 * 
 * Reemplaza todos los sistemas de restauración múltiples con uno funcional.                y: (elementData.position && elementData.position.y) || 100, */

export class SimplePPINOTRestorer {
  constructor(modeler) {
    this.modeler = modeler;
  }

  /**
   * Verifica que el canvas esté en un estado válido antes de realizar operaciones
   * @param {Object} canvas - Canvas del modeler
   * @returns {boolean} - true si el canvas está listo para operaciones
   */
  isCanvasReady(canvas) {
    try {
      if (!canvas) {
        return false;
      }
      
      // Verificar métodos esenciales
      if (typeof canvas.getGraphics !== 'function') {
        return false;
      }
      
      // Verificar que el canvas tenga un viewbox válido
      try {
        const viewbox = canvas.viewbox();
        if (!viewbox || typeof viewbox !== 'object') {
          return false;
        }
        
        // Verificar y corregir el scale si es necesario
        if (viewbox.scale === undefined || typeof viewbox.scale !== 'number' || !isFinite(viewbox.scale) || viewbox.scale <= 0) {
          console.log('🔧 Corrigiendo scale inválido en viewbox:', viewbox.scale);
          viewbox.scale = 1;
          try {
            canvas.viewbox(viewbox);
            console.log('✅ Scale corregido a 1');
          } catch (setViewboxError) {
            console.warn('⚠️ Error estableciendo viewbox corregido:', setViewboxError);
            return false;
          }
        }
      } catch (viewboxError) {
        console.warn('⚠️ Error verificando viewbox del canvas:', viewboxError);
        return false;
      }
      
      return true;
    } catch (error) {
      console.warn('⚠️ Error verificando estado del canvas:', error);
      return false;
    }
  }

  /**
   * Inicializa el canvas con valores seguros para prevenir errores de scale
   * @param {Object} canvas - Canvas del modeler
   * @returns {boolean} - true si la inicialización fue exitosa
   */
  initializeCanvasSafely(canvas) {
    try {
      if (!canvas || typeof canvas.viewbox !== 'function') {
        return false;
      }
      
      // Obtener viewbox actual o crear uno por defecto
      let viewbox;
      try {
        viewbox = canvas.viewbox();
      } catch (error) {
        console.log('🔧 Creando viewbox por defecto');
        viewbox = { x: 0, y: 0, width: 1000, height: 1000, scale: 1 };
      }
      
      // Asegurar que el viewbox tenga todas las propiedades necesarias
      if (!viewbox || typeof viewbox !== 'object') {
        viewbox = { x: 0, y: 0, width: 1000, height: 1000, scale: 1 };
      }
      
      // Asegurar propiedades válidas con valores más conservadores
      if (typeof viewbox.x !== 'number' || !isFinite(viewbox.x)) viewbox.x = 0;
      if (typeof viewbox.y !== 'number' || !isFinite(viewbox.y)) viewbox.y = 0;
      if (typeof viewbox.width !== 'number' || !isFinite(viewbox.width) || viewbox.width <= 0) viewbox.width = 1200;
      if (typeof viewbox.height !== 'number' || !isFinite(viewbox.height) || viewbox.height <= 0) viewbox.height = 800;
      if (typeof viewbox.scale !== 'number' || !isFinite(viewbox.scale) || viewbox.scale <= 0) viewbox.scale = 1;
      
      // Asegurar que el viewbox no tenga valores extremos que causen canvas en blanco
      if (Math.abs(viewbox.x) > 10000) viewbox.x = 0;
      if (Math.abs(viewbox.y) > 10000) viewbox.y = 0;
      if (viewbox.scale > 10 || viewbox.scale < 0.1) viewbox.scale = 1;
      
      // Establecer el viewbox corregido
      try {
        canvas.viewbox(viewbox);
        console.log('✅ Canvas inicializado con viewbox seguro:', viewbox);
        return true;
      } catch (setError) {
        console.warn('⚠️ Error estableciendo viewbox seguro:', setError);
        return false;
      }
      
    } catch (error) {
      console.warn('⚠️ Error inicializando canvas:', error);
      return false;
    }
  }

  /**
   * Obtiene los gráficos de un elemento de forma segura
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} element - Elemento del cual obtener gráficos
   * @returns {Object|null} - Gráficos del elemento o null si hay error
   */
  safeGetGraphics(canvas, element) {
    try {
      if (!canvas || !element || typeof canvas.getGraphics !== 'function') {
        return null;
      }
      
      // Verificar que el canvas esté listo antes de obtener gráficos
      if (!this.isCanvasReady(canvas)) {
        console.warn(`⚠️ Canvas no listo para obtener gráficos de ${element.id}`);
        return null;
      }
      
      const graphics = canvas.getGraphics(element);
      return graphics || null;
      
    } catch (error) {
      console.warn(`⚠️ Error obteniendo gráficos de ${element?.id || 'unknown'}:`, error);
      return null;
    }
  }

  /**
   * Encuentra el padre correcto para un elemento basándose en proximidad y tipo
   * @param {Object} elementData - Datos del elemento
   * @param {Array} allElements - Todos los elementos PPINOT
   * @returns {string|null} - ID del padre o null si no se encuentra
   */
  findParentForElement(elementData, allElements) {
    try {
      // Si ya tiene parent_id, usarlo
      if (elementData.parent_id) {
        return elementData.parent_id;
      }
      
      // Para Target, Scope y Medidas, buscar el PPI más cercano
      if (elementData.type === 'PPINOT:Target' || elementData.type === 'PPINOT:Scope' || elementData.type.includes('Measure')) {
        const elementPos = elementData.position || { x: 0, y: 0 };
        let closestPPI = null;
        let closestDistance = Infinity;
        
        // Buscar el PPI principal más cercano
        allElements.forEach(el => {
          if (el.type === 'PPINOT:Ppi' && el.metadata && el.metadata.isMainPPI) {
            const ppiPos = el.position || { x: 0, y: 0 };
            const distance = Math.sqrt(
              Math.pow(elementPos.x - ppiPos.x, 2) + 
              Math.pow(elementPos.y - ppiPos.y, 2)
            );
            
            if (distance < closestDistance) {
              closestDistance = distance;
              closestPPI = el.id;
            }
          }
        });
        
        if (closestPPI && closestDistance < 500) { // Dentro de 500px
          console.log(`🔍 Padre encontrado para ${elementData.id} (${elementData.type}): ${closestPPI} (distancia: ${Math.round(closestDistance)}px)`);
          return closestPPI;
        }
      }
      
      return null;
    } catch (error) {
      console.warn(`⚠️ Error buscando padre para ${elementData.id}:`, error);
      return null;
    }
  }

  /**
   * Asegura que todos los elementos sean visibles ajustando el zoom
   * @param {Object} canvas - Canvas del modeler
   */
  ensureElementsVisible(canvas) {
    try {
      if (!canvas || typeof canvas.zoom !== 'function') {
        return;
      }
      
      console.log('🔍 Asegurando que todos los elementos sean visibles...');
      
      // Intentar zoom fit viewport de forma segura
      try {
        if (typeof canvas.zoom === 'function') {
          // Primero intentar fit-viewport
          canvas.zoom('fit-viewport');
          console.log('✅ Zoom fit-viewport aplicado');
        }
      } catch (fitError) {
        console.warn('⚠️ Error con fit-viewport, intentando zoom manual:', fitError);
        
        // Si fit-viewport falla, establecer zoom conservador
        try {
          canvas.zoom(0.8); // Zoom out un poco para mostrar más contenido
          console.log('✅ Zoom manual aplicado (0.8)');
        } catch (manualZoomError) {
          console.warn('⚠️ Error con zoom manual:', manualZoomError);
        }
      }
      
    } catch (error) {
      console.warn('⚠️ Error asegurando visibilidad de elementos:', error);
    }
  }

  /**
   * Realiza un refresh seguro del canvas sin disparar eventos problemáticos
   * @param {Object} canvas - Canvas del modeler
   * @param {Object} eventBus - EventBus del modeler
   */
  safeRefreshCanvas(canvas, eventBus) {
    try {
      console.log('🔄 Ejecutando refresh seguro del canvas...');
      
      if (!canvas || !eventBus) {
        console.log('⚠️ Canvas o EventBus no disponibles para refresh seguro');
        return;
      }
      
      // Solo asegurar que el viewbox esté bien, pero NO disparar eventos
      try {
        this.initializeCanvasSafely(canvas);
        console.log('✅ Canvas verificado y listo');
      } catch (initError) {
        console.warn('⚠️ Error inicializando canvas para refresh:', initError);
      }
      
      // NO disparar ningún evento que pueda causar problemas con Overlays
      // Simplemente logear que el refresh se completó
      console.log('✅ Refresh seguro completado (sin eventos problemáticos)');
      
    } catch (error) {
      console.warn('⚠️ Error en refresh seguro del canvas:', error);
    }
  }

  async restorePPINOTElements() {
    try {
      console.log('🔄 Iniciando restauración simple de elementos PPINOT...');
      
      // Obtener elementos PPINOT guardados
      // ELIMINADO: No leer de localStorage - usar solo autosave
      const ppinotElementsData = null;
      
      if (!ppinotElementsData) {
        console.log('ℹ️ No hay elementos PPINOT guardados para restaurar');
        return false;
      }

      const ppinotElements = JSON.parse(ppinotElementsData);
      console.log(`📋 Elementos PPINOT a restaurar: ${ppinotElements.length}`);
      
             // DEBUG: Mostrar cada elemento que se va a restaurar
             ppinotElements.forEach((el, index) => {
               const isMainPPI = el.metadata && el.metadata.isMainPPI;
               console.log(`  ${index + 1}. ${el.id} (${el.type}) - Padre: ${el.parent_id || 'N/A'}${isMainPPI ? ' - PPI PRINCIPAL' : ' - Elemento hijo'}`);
             });
      
      if (!this.modeler) {
        console.warn('⚠️ Modeler no disponible para restauración PPINOT');
        return false;
      }
      
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      const elementFactory = this.modeler.get('elementFactory');
      
      if (!elementRegistry || !modeling || !elementFactory) {
        console.warn('⚠️ Servicios del modeler no disponibles');
        return false;
      }
      
      let restoredCount = 0;
      
      // Restaurar cada elemento PPINOT
      for (const elementData of ppinotElements) {
        try {
          // Verificar si el elemento ya existe
          const existingElement = elementRegistry.get(elementData.id);
          if (existingElement) {
            console.log(`🔍 Elemento PPINOT ${elementData.id} (${elementData.type}) existe pero verificando estado...`);
            
            // PROTECCIÓN ESPECIAL PARA MEDIDAS
            if (elementData.type.includes('Measure')) {
              console.log(`🔬 Protección especial para medida: ${elementData.id}`);
              
              // Verificar y restaurar relación padre-hijo para medidas
              if (elementData.parent_id && (!existingElement.parent || existingElement.parent.id !== elementData.parent_id)) {
                const parentElement = elementRegistry.get(elementData.parent_id);
                if (parentElement) {
                  console.log(`🔧 Restaurando relación padre-hijo para medida: ${elementData.id} -> ${elementData.parent_id}`);
                  existingElement.parent = parentElement;
                  
                  if (parentElement.children && !parentElement.children.includes(existingElement)) {
                    parentElement.children.push(existingElement);
                  }
                }
              }
              
              // Verificar posición para medidas
              if (elementData.position && (existingElement.x !== elementData.position.x || existingElement.y !== elementData.position.y)) {
                console.log(`🔧 Restaurando posición para medida: ${elementData.id} -> (${elementData.position.x}, ${elementData.position.y})`);
                existingElement.x = elementData.position.x;
                existingElement.y = elementData.position.y;
              }
              
              // Forzar eventos de actualización para medidas
              const eventBus = this.modeler.get('eventBus');
              eventBus.fire('element.changed', { element: existingElement });
            }
            
            // Verificar si el elemento está visible en el canvas
            const canvas = this.modeler.get('canvas');
            const gfx = canvas.getGraphics(existingElement);
            
            if (!gfx || (gfx.style && (gfx.style.display === 'none' || gfx.style.visibility === 'hidden'))) {
              console.log(`⚠️ Elemento ${elementData.id} existe pero NO es visible, forzando visualización...`);
              
              // Forzar actualización visual del elemento
              const eventBus = this.modeler.get('eventBus');
              eventBus.fire('element.changed', { element: existingElement });
              
              // También forzar redibujado del canvas
              eventBus.fire('canvas.resized');
              
              restoredCount++;
              console.log(`✅ Visibilidad forzada para elemento ${elementData.id}`);
            } else {
              console.log(`✅ Elemento PPINOT ${elementData.id} ya existe y es visible, saltando...`);
              restoredCount++; // Contar como restaurado
            }
            continue;
          }
          
          // Solo crear elementos que no sean PPIs principales (ya están en el XML)
          // Los PPIs principales se crean automáticamente desde el XML
          if (elementData.type !== 'PPINOT:Ppi') {
            // Verificar si es un elemento label (estos se crean automáticamente)
            if (elementData.id.includes('_label')) {
              console.log(`⚠️ Saltando elemento label ${elementData.id} - se crea automáticamente`);
              restoredCount++;
              continue;
            }
            
            // Asegurar que se crean Target, Scope y Medidas
            if (elementData.type === 'PPINOT:Target' || elementData.type === 'PPINOT:Scope' || elementData.type.includes('Measure')) {
              console.log(`🎯 Creando elemento ${elementData.type}: ${elementData.id}`);
            }
            
            console.log(`🔄 Creando elemento PPINOT: ${elementData.id} (${elementData.type})`);
            
            // Crear elemento PPINOT usando el método correcto
            try {
              const elementFactory = this.modeler.get('elementFactory');
              const modeling = this.modeler.get('modeling');
              const canvas = this.modeler.get('canvas');
              const rootElement = canvas.getRootElement();
              
              // Determinar el tipo de elemento y dimensiones por defecto
              const elementType = elementData.type.replace('PPINOT:', '');
              let defaultWidth = 120;
              let defaultHeight = 80;
              
              if (elementType === 'Target') {
                defaultWidth = 25;
                defaultHeight = 25;
              } else if (elementType === 'Scope') {
                defaultWidth = 28;
                defaultHeight = 28;
              } else if (elementType.includes('Measure')) {
                // Dimensiones específicas para medidas
                defaultWidth = 120;
                defaultHeight = 100;
              }
              
              // Usar dimensiones guardadas o por defecto
              const width = (elementData.position && elementData.position.width) || defaultWidth;
              const height = (elementData.position && elementData.position.height) || defaultHeight;
              
              console.log(`   Dimensiones: ${width}x${height} (${elementType})`);
              
              // Crear elemento usando elementFactory.create con el tipo correcto
              const element = elementFactory.create('shape', {
                type: elementData.type,
                width: width,
                height: height,
                id: elementData.id
              });
              
              // Establecer el nombre correcto en el businessObject
              if (element.businessObject) {
                element.businessObject.id = elementData.id;
                element.businessObject.name = elementData.name || elementData.id;
                console.log(`   📝 Nombre establecido: "${element.businessObject.name}"`);
              }
              
              // Posicionar el elemento
              const position = {
                x: (elementData.position && elementData.position.x) || 100,
                y: elementData.position?.y || 100
              };
              
              console.log(`   Posición: x=${position.x}, y=${position.y}`);
              
              // Crear en canvas usando modeling.createShape
              const createdElement = modeling.createShape(element, position, rootElement);
              
              // MEJORADO: Establecer relación padre-hijo para movimiento conjunto
              const parentId = elementData.parent_id || this.findParentForElement(elementData, ppinotElements);
              
              if (parentId) {
                // Usar setTimeout para establecer la relación después de que el elemento esté completamente creado
                setTimeout(() => {
                  try {
                    const parentElement = elementRegistry.get(parentId);
                    if (parentElement) {
                      console.log(`   🔗 Estableciendo relación padre-hijo: ${elementData.id} -> ${parentId}`);
                      
                      // Usar modeling.moveShape para establecer relación persistente
                      // Primero mover a posición relativa del padre, luego a posición absoluta
                      const originalPos = { x: position.x, y: position.y };
                      
                      try {
                        // IMPORTANTE: Calcular posición relativa al padre
                        const parentPos = { x: parentElement.x || 0, y: parentElement.y || 0 };
                        const relativePos = {
                          x: originalPos.x - parentPos.x,
                          y: originalPos.y - parentPos.y
                        };
                        
                        console.log(`   📐 Posición absoluta: (${originalPos.x}, ${originalPos.y})`);
                        console.log(`   📐 Posición padre: (${parentPos.x}, ${parentPos.y})`);
                        console.log(`   📐 Posición relativa: (${relativePos.x}, ${relativePos.y})`);
                        
                        // Establecer la relación usando moveShape con posición relativa
                        modeling.moveShape(createdElement, relativePos, parentElement);
                        
                        console.log(`   ✅ Relación establecida con moveShape: ${elementData.id} -> ${parentId}`);
                        console.log(`   📍 Posición relativa establecida: x=${relativePos.x}, y=${relativePos.y}`);
                        
                        // También establecer en businessObject para persistencia
                        const businessObject = createdElement.businessObject;
                        const parentBusinessObject = parentElement.businessObject;
                        
                        if (businessObject && parentBusinessObject) {
                          businessObject.$parent = parentBusinessObject;
                          
                          if (!parentBusinessObject.children) {
                            parentBusinessObject.children = [];
                          }
                          if (!parentBusinessObject.children.includes(businessObject)) {
                            parentBusinessObject.children.push(businessObject);
                          }
                          
                          console.log(`   🔗 Relación también establecida en businessObject`);
                        }
                        
                      } catch (moveError) {
                        console.warn(`   ⚠️ Error con moveShape, usando método alternativo:`, moveError);
                        
                        // Método alternativo si moveShape falla
                        createdElement.parent = parentElement;
                        if (createdElement.businessObject && parentElement.businessObject) {
                          createdElement.businessObject.$parent = parentElement.businessObject;
                        }
                      }
                      
                    } else {
                      console.log(`   ⚠️ Padre ${parentId} no encontrado para ${elementData.id}`);
                    }
                  } catch (relationshipError) {
                    console.warn(`   ⚠️ Error estableciendo relación padre-hijo:`, relationshipError);
                  }
                }, 200); // Delay para asegurar que el elemento esté completamente creado
              } else {
                console.log(`   ⚠️ No se encontró padre para ${elementData.id} - no se moverá junto con otros elementos`);
              }
              
              
              console.log(`✅ Elemento PPINOT ${elementData.id} creado exitosamente`);
              restoredCount++;
              
            } catch (createError) {
              console.warn(`⚠️ Error creando elemento PPINOT ${elementData.id}:`, createError);
              
              // Fallback: solo loguear que se detectó el elemento
              console.log(`📝 Elemento PPINOT detectado para restauración: ${elementData.id} (${elementData.type})`);
              console.log(`   Posición: x=${elementData.position?.x}, y=${elementData.position?.y}`);
              console.log(`   Tamaño: w=${elementData.position?.width}, h=${elementData.position?.height}`);
            }
          }
          
        } catch (elementError) {
          console.warn(`⚠️ Error creando elemento ${elementData.id}:`, elementError);
        }
      }
      
      console.log(`✅ Restauración PPINOT completada: ${restoredCount} elementos restaurados`);
      
      // Limpiar datos temporales después de restaurar
      // ELIMINADO: No manipular localStorage - usar solo autosave
      // localStorage.removeItem('ppinotElements');
      // localStorage.removeItem('ppinotRelationships');
      
      // Asegurar que las relaciones se establezcan correctamente después de un delay
      setTimeout(() => {
        this.ensureParentChildRelationships();
      }, 500);
      
      return true;
      
    } catch (error) {
      console.error('❌ Error en restauración simple PPINOT:', error);
      return false;
    }
  }
  
  async ensureParentChildRelationships() {
    try {
      console.log('🔗 Verificando relaciones padre-hijo...');
      
      // Verificar que el modeler existe
      if (!this.modeler) {
        console.warn('⚠️ Modeler no disponible para verificar relaciones');
        return;
      }
      
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      
      // Verificar que los servicios están disponibles
      if (!elementRegistry || !modeling) {
        console.warn('⚠️ Servicios del modeler no disponibles para verificar relaciones');
        return;
      }
      
      // Obtener todos los elementos PPINOT de forma segura
      let allElements = [];
      try {
        allElements = elementRegistry.getAll() || [];
      } catch (error) {
        console.warn('⚠️ Error obteniendo elementos del registry:', error);
        return;
      }
      
      const ppinotElements = allElements.filter(el => {
        try {
          const type = (el && el.businessObject && el.businessObject.$type) || '';
          return type.includes('PPINOT');
        } catch (error) {
          return false;
        }
      });
      
      let relationshipsEstablished = 0;
      
      ppinotElements.forEach(element => {
        try {
          // Verificar que el elemento es válido
          if (!element || !element.id) {
            return;
          }
          
          const businessObject = element.businessObject;
          if (businessObject && businessObject.$parent && businessObject.$parent.id) {
            const parentElement = elementRegistry.get(businessObject.$parent.id);
            if (parentElement && element.parent !== parentElement) {
              try {
                // Guardar posición actual antes de re-establecer relación
                const currentPosition = {
                  x: element.x || 0,
                  y: element.y || 0
                };
                
                // Re-establecer la relación usando modeling.moveShape para persistencia
                try {
                  // Usar modeling.moveShape para establecer relación persistente
                  if (modeling && typeof modeling.moveShape === 'function') {
                    // Calcular posición relativa al padre
                    const parentPos = { x: parentElement.x || 0, y: parentElement.y || 0 };
                    const relativePos = {
                      x: currentPosition.x - parentPos.x,
                      y: currentPosition.y - parentPos.y
                    };
                    
                    console.log(`   📐 Re-estableciendo con posición relativa: (${relativePos.x}, ${relativePos.y})`);
                    
                    modeling.moveShape(element, relativePos, parentElement);
                    
                    // También establecer en businessObject
                    if (element.businessObject && parentElement.businessObject) {
                      element.businessObject.$parent = parentElement.businessObject;
                      
                      // Agregar a children del padre si no está
                      if (!parentElement.businessObject.children) {
                        parentElement.businessObject.children = [];
                      }
                      if (!parentElement.businessObject.children.includes(element.businessObject)) {
                        parentElement.businessObject.children.push(element.businessObject);
                      }
                    }
                    
                    relationshipsEstablished++;
                    console.log(`   ✅ Relación re-establecida con moveShape: ${element.id} -> ${parentElement.id}`);
                    console.log(`   📍 Posición relativa establecida: (${relativePos.x}, ${relativePos.y})`);
                  } else {
                    // Fallback si modeling no está disponible
                    element.parent = parentElement;
                    if (element.businessObject && parentElement.businessObject) {
                      element.businessObject.$parent = parentElement.businessObject;
                    }
                    console.log(`   ⚠️ Relación establecida sin modeling.moveShape`);
                  }
                } catch (relationError) {
                  console.warn(`   ⚠️ Error re-estableciendo relación:`, relationError);
                }
              } catch (error) {
                console.warn(`   ⚠️ Error re-estableciendo relación ${element.id}:`, error);
              }
            }
          }
        } catch (error) {
          console.warn(`   ⚠️ Error procesando elemento ${element?.id || 'unknown'}:`, error);
        }
      });
      
      console.log(`🔗 Relaciones padre-hijo verificadas: ${relationshipsEstablished} re-establecidas`);
      
      // NUEVA FUNCIONALIDAD: Forzar visualización de todos los elementos PPINOT
      try {
        this.forceVisualizeAllPPINOTElements();
      } catch (visualError) {
        console.warn('⚠️ Error en forzar visualización:', visualError);
      }
      
    } catch (error) {
      console.error('⚠️ Error verificando relaciones padre-hijo:', error);
    }
  }
  
  /**
   * Fuerza la visualización de todos los elementos PPINOT en el canvas
   */
  forceVisualizeAllPPINOTElements() {
    try {
      // Incrementar contador de refreshes
      if (!this._refreshCount) {
        this._refreshCount = 0;
      }
      this._refreshCount++;
      
      console.log(`🎨 REFRESH #${this._refreshCount} - Forzando visualización de todos los elementos PPINOT...`);
      
      // Verificar que el modeler existe y está disponible
      if (!this.modeler) {
        console.warn('⚠️ Modeler no disponible para forzar visualización');
        return;
      }
      
      const elementRegistry = this.modeler.get('elementRegistry');
      const eventBus = this.modeler.get('eventBus');
      const canvas = this.modeler.get('canvas');
      const modeling = this.modeler.get('modeling');
      
      // Verificar que todos los servicios necesarios están disponibles
      if (!elementRegistry || !eventBus || !canvas || !modeling) {
        console.warn('⚠️ Servicios del modeler no disponibles para forzar visualización');
        return;
      }
      
      // Inicializar el canvas de forma segura
      if (!this.initializeCanvasSafely(canvas)) {
        console.warn('⚠️ No se pudo inicializar el canvas de forma segura');
        return;
      }
      
      // Verificar que el canvas esté en un estado válido
      if (!this.isCanvasReady(canvas)) {
        console.warn('⚠️ Canvas no está listo para operaciones de visualización');
        return;
      }
      
      // Obtener todos los elementos PPINOT de forma segura
      let allElements = [];
      try {
        allElements = elementRegistry.getAll() || [];
      } catch (error) {
        console.warn('⚠️ Error obteniendo elementos del registry:', error);
        return;
      }
      
      const ppinotElements = allElements.filter(el => {
        try {
          const type = (el && el.businessObject && el.businessObject.$type) || '';
          return type.includes('PPINOT');
        } catch (error) {
          return false;
        }
      });
      
      console.log(`🎨 Elementos PPINOT en canvas: ${ppinotElements.length}`);
      
      // DIAGNÓSTICO ESPECÍFICO PARA MEDIDAS
      const measures = ppinotElements.filter(el => {
        const type = (el && el.businessObject && el.businessObject.$type) || '';
        return type.includes('Measure');
      });
      console.log(`🔬 Medidas específicamente encontradas: ${measures.length}`);
      measures.forEach(measure => {
        console.log(`🔬 Medida: ${measure.id} (${measure.businessObject.$type}) - Visible: ${canvas.getGraphics(measure) ? 'SÍ' : 'NO'}`);
      });
      
      let forcedCount = 0;
      
      ppinotElements.forEach(element => {
        try {
          // Verificar que el elemento es válido
          if (!element || !element.id) {
            return;
          }
          
          // Verificar si el elemento está visible de forma segura
          const gfx = this.safeGetGraphics(canvas, element);
          
          // Verificar si el elemento necesita ser forzado a visualizarse
          let needsForceVisualization = false;
          
          if (!gfx) {
            needsForceVisualization = true;
            console.log(`🎨 Elemento sin gráficos: ${element.id}`);
          } else if (gfx.style && (gfx.style.display === 'none' || gfx.style.visibility === 'hidden')) {
            needsForceVisualization = true;
            console.log(`🎨 Elemento oculto: ${element.id}`);
          }
          
          if (needsForceVisualization) {
            const elementType = (element.businessObject && element.businessObject.$type) || 'unknown';
            console.log(`🎨 Forzando visualización: ${element.id} (${elementType})`);
            
            // GUARDAR POSICIÓN ORIGINAL Y CONTENIDO DE LABEL antes de cualquier operación
            const originalPosition = {
              x: element.x,
              y: element.y
            };
            
            // GUARDAR CONTENIDO ORIGINAL DE LA LABEL
            const originalLabel = this.getOriginalLabelContent(element);
            console.log(`📍 Elemento ${element.id}: posición=(${originalPosition.x},${originalPosition.y}), label="${originalLabel}"`);
            
            // PRESERVAR RELACIONES PADRE-HIJO para TODAS las medidas (igual que Target/Scope)
            let parentElement = null;
            if (element.parent && element.parent.id) {
              parentElement = element.parent;
              console.log(`👨‍👦 Preservando relación: ${element.id} -> padre: ${parentElement.id}`);
            }
            
            // Forzar varios eventos para asegurar visualización de forma segura
            try {
              if (eventBus && typeof eventBus.fire === 'function') {
                eventBus.fire('element.changed', { element: element });
                eventBus.fire('shape.changed', { element: element });
              }
            } catch (eventError) {
              console.warn(`⚠️ Error disparando eventos para ${element.id}:`, eventError);
            }
            
            // USAR EVENTOS SEGUROS en lugar de moveShape para evitar mover los elementos
            try {
              if (eventBus && typeof eventBus.fire === 'function') {
                // Forzar redibujado sin mover el elemento
                eventBus.fire('render.shape', { element: element, gfx: gfx });
                console.log(`🎨 Redibujado forzado para ${element.id} sin mover`);
              }
            } catch (renderError) {
              console.warn(`⚠️ Error con redibujado para ${element.id}:`, renderError);
            }
            
            // VERIFICAR Y RESTAURAR POSICIÓN si se ha movido
            setTimeout(() => {
              try {
                if (element.x !== originalPosition.x || element.y !== originalPosition.y) {
                  console.log(`🔧 Restaurando posición de ${element.id}: de (${element.x},${element.y}) a (${originalPosition.x},${originalPosition.y})`);
                  
                  // Restaurar posición exacta sin usar moveShape
                  element.x = originalPosition.x;
                  element.y = originalPosition.y;
                  
                  // Actualizar gráficos con la posición correcta
                  if (gfx && gfx.style) {
                    gfx.style.transform = `translate(${originalPosition.x}px, ${originalPosition.y}px)`;
                  }
                  
                  // Forzar actualización visual con la posición correcta
                  eventBus.fire('element.changed', { element: element });
                }
                
                // VERIFICAR Y RESTAURAR RELACIÓN PADRE-HIJO si se ha perdido
                if (parentElement && (!element.parent || element.parent.id !== parentElement.id)) {
                  console.log(`🔧 Restaurando relación padre-hijo: ${element.id} -> ${parentElement.id}`);
                  element.parent = parentElement;
                  
                  // Asegurar que el padre también conoce a este hijo
                  if (parentElement.children && !parentElement.children.includes(element)) {
                    parentElement.children.push(element);
                  }
                }
                
                // INVESTIGAR DÓNDE SE PIERDE LA LABEL - Añadir rastreo detallado
                this.trackLabelChanges(element, parentElement, originalPosition, originalLabel);
                
              } catch (restoreError) {
                console.warn(`⚠️ Error restaurando posición/relación de ${element.id}:`, restoreError);
              }
            }, 50);
            
            forcedCount++;
          }
        } catch (error) {
          console.warn(`⚠️ Error forzando visualización de ${element.id}:`, error);
        }
      });
      
      // En lugar de disparar eventos problemáticos, usar métodos alternativos
      try {
        if (eventBus && typeof eventBus.fire === 'function') {
          console.log('🎨 Usando método alternativo para actualizar canvas (evitando eventos problemáticos)');
          
          // NO disparar canvas.resized ni canvas.viewbox.changed ya que causan errores en Overlays
          // En su lugar, usar eventos más específicos y seguros
          try {
            // Disparar eventos de elementos individuales que no interfieren con Overlays
            eventBus.fire('elements.changed', { elements: [] });
            console.log('✅ Eventos alternativos disparados sin problemas');
          } catch (altEventError) {
            console.warn('⚠️ Error con eventos alternativos:', altEventError);
          }
        }
      } catch (canvasEventError) {
        console.warn('⚠️ Error en método alternativo de canvas:', canvasEventError);
      }
      
      // Como último recurso, usar un método alternativo más seguro
      setTimeout(() => {
        try {
          this.safeRefreshCanvas(canvas, eventBus);
          
          // Intentar hacer zoom fit para asegurar que los elementos sean visibles
          setTimeout(() => {
            try {
              this.ensureElementsVisible(canvas);
            } catch (zoomError) {
              console.warn('⚠️ Error en zoom fit:', zoomError);
            }
          }, 300);
        } catch (error) {
          console.warn('⚠️ Error en refresh seguro:', error);
        }
      }, 100);
      
      console.log(`🎨 Visualización forzada completada: ${forcedCount} elementos actualizados`);
      
    } catch (error) {
      console.error('⚠️ Error forzando visualización de elementos PPINOT:', error);
    }
  }
  
  /**
   * Función para obtener el contenido original de la label
   */
  getOriginalLabelContent(element) {
    try {
      // Intentar obtener la label desde diferentes fuentes
      if (element.businessObject) {
        // Buscar en businessObject
        if (element.businessObject.name) {
          return element.businessObject.name;
        }
        if (element.businessObject.label) {
          return element.businessObject.label;
        }
        if (element.businessObject.text) {
          return element.businessObject.text;
        }
      }
      
      // Buscar en las labels de los elementos hijo
      if (element.labels && element.labels.length > 0) {
        const label = element.labels[0];
        if (label.businessObject && label.businessObject.body) {
          return label.businessObject.body;
        }
      }
      
      // Buscar en el registro de elementos
      if (this.modeler) {
        const elementRegistry = this.modeler.get('elementRegistry');
        const labelElement = elementRegistry.get(`${element.id}_label`);
        if (labelElement && labelElement.businessObject && labelElement.businessObject.body) {
          return labelElement.businessObject.body;
        }
      }
      
      return element.id; // Fallback al ID si no se encuentra contenido
    } catch (error) {
      console.warn(`⚠️ Error obteniendo label original de ${element.id}:`, error);
      return element.id;
    }
  }
  
  /**
   * Rastrea exactamente dónde y cuándo se pierden las labels
   */
  trackLabelChanges(element, parentElement, originalPosition, originalLabel) {
    try {
      if (!element || !this.modeler) return;
      
      const eventBus = this.modeler.get('eventBus');
      if (!eventBus) return;
      
      console.log(`� INICIANDO RASTREO para ${element.id} - Label actual: "${originalLabel}"`);
      
      // Función para verificar el estado actual
      const checkCurrentState = (source) => {
        const currentLabel = this.getOriginalLabelContent(element);
        const currentParent = element.parent ? element.parent.id : 'ninguno';
        const currentPos = `(${element.x},${element.y})`;
        
        console.log(`� [${source}] ${element.id}: label="${currentLabel}", padre=${currentParent}, pos=${currentPos}`);
        
        // Detectar cuándo la label cambia a ID
        if (currentLabel === element.id && originalLabel !== element.id) {
          console.log(`🚨 ¡LABEL PERDIDA DETECTADA en ${source}! ${element.id}: "${originalLabel}" → "${currentLabel}"`);
          console.trace('Stack trace del cambio de label:');
        }
        
        // Detectar cuándo se pierde el parentesco
        const expectedParent = parentElement ? parentElement.id : 'ninguno';
        if (currentParent !== expectedParent) {
          console.log(`🚨 ¡PARENTESCO PERDIDO DETECTADO en ${source}! ${element.id}: esperado=${expectedParent}, actual=${currentParent}`);
          console.trace('Stack trace del cambio de parentesco:');
        }
        
        // Detectar cuándo cambia de posición
        if (element.x !== originalPosition.x || element.y !== originalPosition.y) {
          console.log(`� ¡POSICIÓN CAMBIADA DETECTADA en ${source}! ${element.id}: original=(${originalPosition.x},${originalPosition.y}), actual=${currentPos}`);
        }
      };
      
      // Rastrear TODOS los eventos posibles que pueden afectar al elemento
      const eventsToTrack = [
        'element.changed',
        'shape.changed',
        'element.updateLabel',
        'directEditing.complete',
        'commandStack.changed',
        'commandStack.element.updateLabel.executed',
        'commandStack.shape.move.executed',
        'commandStack.element.move.executed',
        'canvas.viewbox.changed',
        'import.parse.complete',
        'import.done',
        'diagram.clear'
      ];
      
      // Configurar listeners de rastreo
      eventsToTrack.forEach(eventName => {
        eventBus.on(eventName, (event) => {
          try {
            // Solo rastrear si el evento afecta a nuestro elemento
            if (event.element && 
                (event.element.id === element.id || 
                 event.element.id === `${element.id}_label` ||
                 (event.elements && event.elements.some(el => el.id === element.id)))) {
              
              checkCurrentState(`EVENT: ${eventName}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error en rastreo de evento ${eventName}:`, error);
          }
        });
      });
      
      // Verificación periódica cada 500ms durante 10 segundos
      let checkCount = 0;
      const periodicCheck = setInterval(() => {
        checkCount++;
        checkCurrentState(`PERIODIC CHECK #${checkCount}`);
        
        if (checkCount >= 20) { // 10 segundos
          clearInterval(periodicCheck);
          console.log(`🔍 Rastreo completado para ${element.id}`);
        }
      }, 500);
      
      // Verificación inicial
      setTimeout(() => checkCurrentState('INITIAL CHECK'), 10);
      
    } catch (error) {
      console.warn(`⚠️ Error configurando rastreo para ${element.id}:`, error);
    }
  }
}
