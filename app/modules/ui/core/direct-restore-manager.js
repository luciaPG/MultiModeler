/**
 * Direct Restore Manager
 * 
 * Sistema simplificado para restaurar elementos PPINOT de forma directa
 * sin depender de eventos que pueden causar conflictos.
 */

import { getServiceRegistry } from './ServiceRegistry.js';
import { resolve } from '../../../services/global-access.js';

class DirectRestoreManager {
  constructor() {
    this.isRestoring = false;
    this.restoredElements = new Set();
  }

  /**
   * Restaura elementos PPINOT de forma directa desde localStorage
   */
  async restoreFromLocalStorage() {
    if (this.isRestoring) {
      console.log('⏳ Restauración ya en progreso...');
      return false;
    }

    this.isRestoring = true;
    
    try {
      console.log('🔄 Iniciando restauración directa desde localStorage...');
      
      // Obtener modeler
      const modeler = resolve('BpmnModeler');
      if (!modeler) {
        console.warn('⚠️ Modeler no disponible');
        return false;
      }

      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const elementFactory = modeler.get('elementFactory');
      const canvas = modeler.get('canvas');

      // Cargar datos desde storage
      const registry = getServiceRegistry();
      const storageManager = registry ? registry.get('PPINOTStorageManager') : null;
      
      if (!storageManager) {
        console.warn('⚠️ PPINOTStorageManager no disponible');
        return false;
      }

      const data = storageManager.loadPPINOTElements();
      if (!data || !data.elements || data.elements.length === 0) {
        console.log('ℹ️ No hay elementos PPINOT para restaurar');
        return true; // No es un error, simplemente no hay datos
      }

      console.log(`📂 Datos cargados: ${data.elements.length} elementos, ${data.relationships.length} relaciones`);

      // Restaurar solo los elementos que realmente existen en el XML/canvas
      let restoredCount = 0;
      const rootElement = canvas.getRootElement();

      for (const elementData of data.elements) {
        try {
          // Verificar si el elemento ya existe
          const existingElement = elementRegistry.get(elementData.id);
          if (existingElement) {
            console.log(`ℹ️ Elemento ya existe: ${elementData.id}`);
            this.restoredElements.add(elementData.id);
            continue;
          }

          // Solo restaurar elementos que tienen datos válidos
          if (!elementData.businessObject || !elementData.businessObject.name) {
            console.log(`⚠️ Saltando elemento sin datos válidos: ${elementData.id}`);
            continue;
          }

          // Crear elemento
          const newElement = elementFactory.create('shape', {
            id: elementData.id,
            type: elementData.type,
            width: elementData.position.width || this.getDefaultSize(elementData.type).width,
            height: elementData.position.height || this.getDefaultSize(elementData.type).height
          });

          // Configurar business object
          if (newElement.businessObject) {
            newElement.businessObject.id = elementData.id;
            newElement.businessObject.name = elementData.businessObject.name;
            newElement.businessObject.$type = elementData.businessObject.$type;
          }

          // Determinar posición y padre
          const position = {
            x: elementData.position.x || 100,
            y: elementData.position.y || 100
          };

          let parentElement = rootElement;
          if (elementData.parentId) {
            const parent = elementRegistry.get(elementData.parentId);
            if (parent) {
              parentElement = parent;
            }
          }

          // Crear en el canvas
          const createdElement = modeling.createShape(newElement, position, parentElement);
          
          if (createdElement) {
            this.restoredElements.add(createdElement.id);
            restoredCount++;
            console.log(`✅ Restaurado: ${createdElement.id} (${elementData.type})`);
          }

        } catch (error) {
          console.warn(`⚠️ Error restaurando elemento ${elementData.id}:`, error);
        }
      }

      // Aplicar relaciones después de crear todos los elementos
      if (data.relationships.length > 0) {
        const relationshipManager = registry ? registry.get('CanvasRelationshipManager') : null;
        if (relationshipManager) {
          relationshipManager.deserializeRelationships({
            relationships: data.relationships,
            version: '1.0.0',
            timestamp: Date.now()
          });
          
          await relationshipManager.applyRelationshipsToCanvas();
        }
      }

      console.log(`✅ Restauración directa completada: ${restoredCount} elementos restaurados`);
      return restoredCount > 0;

    } catch (error) {
      console.error('❌ Error en restauración directa:', error);
      return false;
    } finally {
      this.isRestoring = false;
    }
  }

  /**
   * Obtiene el tamaño por defecto para un tipo de elemento
   */
  getDefaultSize(elementType) {
    const sizes = {
      'PPINOT:Ppi': { width: 80, height: 60 },
      'PPINOT:Scope': { width: 28, height: 28 },
      'PPINOT:Target': { width: 25, height: 25 },
      'PPINOT:Measure': { width: 40, height: 30 },
      'PPINOT:Condition': { width: 35, height: 25 }
    };

    return sizes[elementType] || { width: 30, height: 30 };
  }

  /**
   * Limpia el estado de restauración
   */
  reset() {
    this.isRestoring = false;
    this.restoredElements.clear();
  }

  /**
   * Verifica si un elemento fue restaurado
   */
  wasRestored(elementId) {
    return this.restoredElements.has(elementId);
  }
}

// Crear instancia singleton
const directRestoreManager = new DirectRestoreManager();

// Registrar en el service registry
const registry = getServiceRegistry();
if (registry) {
  registry.register('DirectRestoreManager', directRestoreManager, {
    description: 'Restauración directa de elementos PPINOT sin eventos conflictivos'
  });
}

export default directRestoreManager;
