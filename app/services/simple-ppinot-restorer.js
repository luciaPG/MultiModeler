/**
 * Sistema Simple de Restauración PPINOT
 * 
 * Reemplaza todos los sistemas de restauración múltiples con uno funcional.
 */

export class SimplePPINOTRestorer {
  constructor(modeler) {
    this.modeler = modeler;
  }

  async restorePPINOTElements() {
    try {
      console.log('🔄 Iniciando restauración simple de elementos PPINOT...');
      
      // Obtener elementos PPINOT guardados
      const ppinotElementsData = localStorage.getItem('ppinotElements');
      
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
            console.log(`✅ Elemento PPINOT ${elementData.id} ya existe, saltando...`);
            restoredCount++; // Contar como restaurado
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
              }
              
              // Usar dimensiones guardadas o por defecto
              const width = elementData.position?.width || defaultWidth;
              const height = elementData.position?.height || defaultHeight;
              
              console.log(`   Dimensiones: ${width}x${height} (${elementType})`);
              
              // Crear elemento usando elementFactory.create con el tipo correcto
              const element = elementFactory.create('shape', {
                type: elementData.type,
                width: width,
                height: height,
                id: elementData.id,
                name: elementData.name || elementData.id
              });
              
              // Posicionar el elemento
              const position = {
                x: elementData.position?.x || 100,
                y: elementData.position?.y || 100
              };
              
              console.log(`   Posición: x=${position.x}, y=${position.y}`);
              
              // Crear en canvas usando modeling.createShape
              const createdElement = modeling.createShape(element, position, rootElement);
              
              // Si tiene parent_id, establecer relación de movimiento conjunto usando modeling.moveShape
              if (elementData.parent_id) {
                try {
                  const parentElement = elementRegistry.get(elementData.parent_id);
                  if (parentElement) {
                    console.log(`   Estableciendo relación padre-hijo: ${elementData.id} -> ${elementData.parent_id}`);
                    
                    // Establecer la relación padre-hijo sin cambiar la posición
                    // Primero guardar la posición actual
                    const currentPosition = {
                      x: createdElement.x || position.x,
                      y: createdElement.y || position.y
                    };
                    
                    // Usar modeling.moveShape para establecer la relación correctamente
                    // Esto hace que el elemento se mueva junto con su padre
                    modeling.moveShape(createdElement, { x: 0, y: 0 }, parentElement);
                    
                    // Restaurar la posición original después de establecer la relación
                    setTimeout(() => {
                      try {
                        modeling.moveShape(createdElement, currentPosition, parentElement);
                        console.log(`   📍 Posición restaurada: ${currentPosition.x}, ${currentPosition.y}`);
                      } catch (posError) {
                        console.warn(`   ⚠️ Error restaurando posición:`, posError);
                      }
                    }, 100);
                    
                    // También establecer la relación en el businessObject
                    const businessObject = createdElement.businessObject;
                    const parentBusinessObject = parentElement.businessObject;
                    
                    if (businessObject && parentBusinessObject) {
                      // Establecer $parent para que BPMN.js entienda la relación
                      businessObject.$parent = parentBusinessObject;
                      
                      // Agregar a la lista de children del padre
                      if (!parentBusinessObject.children) {
                        parentBusinessObject.children = [];
                      }
                      if (!parentBusinessObject.children.includes(businessObject)) {
                        parentBusinessObject.children.push(businessObject);
                      }
                      
                      console.log(`   ✅ Relación padre-hijo establecida - se moverán juntos`);
                    }
                  } else {
                    console.log(`   ⚠️ Padre ${elementData.parent_id} no encontrado para establecer relación`);
                  }
                } catch (relationshipError) {
                  console.warn(`   ⚠️ Error estableciendo relación padre-hijo:`, relationshipError);
                }
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
      localStorage.removeItem('ppinotElements');
      localStorage.removeItem('ppinotRelationships');
      
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
      
      const elementRegistry = this.modeler.get('elementRegistry');
      const modeling = this.modeler.get('modeling');
      
      // Obtener todos los elementos PPINOT
      const allElements = elementRegistry.getAll();
      const ppinotElements = allElements.filter(el => {
        const type = el.businessObject?.$type || '';
        return type.includes('PPINOT');
      });
      
      let relationshipsEstablished = 0;
      
      ppinotElements.forEach(element => {
        const businessObject = element.businessObject;
        if (businessObject && businessObject.$parent) {
          const parentElement = elementRegistry.get(businessObject.$parent.id);
          if (parentElement && element.parent !== parentElement) {
            try {
              // Guardar posición actual antes de re-establecer relación
              const currentPosition = {
                x: element.x || 0,
                y: element.y || 0
              };
              
              // Re-establecer la relación si no está correcta
              modeling.moveShape(element, { x: 0, y: 0 }, parentElement);
              
              // Restaurar posición original
              setTimeout(() => {
                try {
                  modeling.moveShape(element, currentPosition, parentElement);
                  console.log(`   📍 Posición preservada: ${element.id} en (${currentPosition.x}, ${currentPosition.y})`);
                } catch (posError) {
                  console.warn(`   ⚠️ Error preservando posición ${element.id}:`, posError);
                }
              }, 50);
              
              relationshipsEstablished++;
              console.log(`   ✅ Relación re-establecida: ${element.id} -> ${parentElement.id}`);
            } catch (error) {
              console.warn(`   ⚠️ Error re-estableciendo relación ${element.id}:`, error);
            }
          }
        }
      });
      
      console.log(`🔗 Relaciones padre-hijo verificadas: ${relationshipsEstablished} re-establecidas`);
      
    } catch (error) {
      console.warn('⚠️ Error verificando relaciones padre-hijo:', error);
    }
  }
}
