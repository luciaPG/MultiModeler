// === PPINOT Storage Manager ===
// Sistema unificado para gestión de elementos PPINOT en localStorage
// Evita conflictos entre múltiples sistemas

import { getServiceRegistry } from '../core/ServiceRegistry.js';
import relationshipManager from '../core/relationship-manager.js';

class PPINOTStorageManager {
  constructor() {
    this.STORAGE_KEYS = {
      ELEMENTS: 'ppinot:elements',
      RELATIONSHIPS: 'ppinot:relationships', 
      METADATA: 'ppinot:metadata'
    };
    
    this.VERSION = '1.0.0';
    this.TTL_MS = 24 * 60 * 60 * 1000; // 24 horas
    
    this.init();
  }

  init() {
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('🎯 Inicializando PPINOT Storage Manager...');
    this.cleanupExpiredData();
  }

  // === GUARDADO UNIFICADO ===

  savePPINOTElements(elements, relationships = []) {
    try {
      // Detectar relaciones automáticamente desde el canvas si no se proporcionan
      if (!relationships || relationships.length === 0) {
        console.log('🔍 Detectando relaciones automáticamente...');
        relationshipManager.detectRelationshipsFromCanvas();
        const serializedRels = relationshipManager.serializeRelationships();
        relationships = serializedRels.relationships || [];
      }
      
      const timestamp = Date.now();
      
      // Validar elementos
      if (!Array.isArray(elements)) {
        console.error('❌ Elementos PPINOT inválidos: debe ser un array');
        return false;
      }

      // Estructura unificada de elementos
      const elementsData = {
        version: this.VERSION,
        timestamp: timestamp,
        ttl: this.TTL_MS,
        elements: elements.map(el => {
          const parentId = (el.businessObject && el.businessObject.$parent && el.businessObject.$parent.id)
                           || el.parent?.id
                           || el.parentId
                           || (el.businessObject && el.businessObject.parent && el.businessObject.parent.id);
          
          // Optimización: Logs eliminados para mejorar rendimiento
          // Debug: log parentId for Target/Scope elements
          // if (el.businessObject && (el.businessObject.$type === 'PPINOT:Target' || el.businessObject.$type === 'PPINOT:Scope')) {
          //   console.log(`🔍 Guardando ${el.businessObject.$type} ${el.id} con parentId: ${parentId}`);
          //   console.log(`  - el.parent?.id: ${el.parent?.id}`);
          //   console.log(`  - el.parentId: ${el.parentId}`);
          //   console.log(`  - el.businessObject.parent?.id: ${el.businessObject.parent?.id}`);
          // }
          
          return {
            id: el.id,
            type: el.type || el.businessObject?.$type,
            name: el.name || el.businessObject?.name || '',
            parentId: parentId,
            position: {
              x: el.x || el.bounds?.x || 0,
              y: el.y || el.bounds?.y || 0,
              width: el.width || el.bounds?.width || 0,
              height: el.height || el.bounds?.height || 0
            },
            businessObject: {
              name: el.businessObject?.name || '',
              $type: el.businessObject?.$type || '',
              id: el.businessObject?.id || el.id
            },
            metadata: {
              isTarget: el.type?.includes('Target') || 
                       el.businessObject?.$type?.includes('Target') ||
                       el.id?.includes('Target') ||
                       (el.businessObject?.name && el.businessObject.name.toLowerCase().includes('target')) ||
                       (el.metadata && el.metadata.isTarget),
              isScope: el.type?.includes('Scope') || 
                       el.businessObject?.$type?.includes('Scope') ||
                       el.id?.includes('Scope') ||
                       (el.businessObject?.name && el.businessObject.name.toLowerCase().includes('scope')) ||
                       (el.metadata && el.metadata.isScope),
              isPPI: el.type?.includes('Ppi') || 
                     el.businessObject?.$type?.includes('Ppi') ||
                     el.id?.includes('Ppi') ||
                     (el.metadata && el.metadata.isPPI)
            }
          };
        })
      };

      // Estructura unificada de relaciones
      const relationshipsData = {
        version: this.VERSION,
        timestamp: timestamp,
        ttl: this.TTL_MS,
        relationships: relationships.map(rel => ({
          childId: rel.childId,
          parentId: rel.parentId,
          childType: rel.childType,
          parentType: rel.parentType,
          childName: rel.childName || '',
          parentName: rel.parentName || '',
          timestamp: rel.timestamp || timestamp
        }))
      };

      // Guardar en localStorage
      localStorage.setItem(this.STORAGE_KEYS.ELEMENTS, JSON.stringify(elementsData));
      localStorage.setItem(this.STORAGE_KEYS.RELATIONSHIPS, JSON.stringify(relationshipsData));
      
      // Metadatos
      const metadata = {
        version: this.VERSION,
        lastSave: timestamp,
        elementCount: elements.length,
        relationshipCount: relationships.length
      };
      localStorage.setItem(this.STORAGE_KEYS.METADATA, JSON.stringify(metadata));

      // Optimización: Reducir logs de debug para mejorar rendimiento
      // console.log(`✅ Guardados ${elements.length} elementos y ${relationships.length} relaciones PPINOT`);
      return true;

    } catch (error) {
      console.error('❌ Error guardando elementos PPINOT:', error);
      return false;
    }
  }

  // === CARGA UNIFICADA ===

  loadPPINOTElements() {
    try {
      const elementsData = localStorage.getItem(this.STORAGE_KEYS.ELEMENTS);
      if (!elementsData) {
        console.log('ℹ️ No hay elementos PPINOT guardados');
        return { elements: [], relationships: [] };
      }

      const parsed = JSON.parse(elementsData);
      
      // Verificar TTL
      if (this.isExpired(parsed.timestamp, parsed.ttl)) {
        console.log('⏰ Datos PPINOT expirados, limpiando...');
        this.clearPPINOTData();
        return { elements: [], relationships: [] };
      }

      // Cargar relaciones
      const relationshipsData = localStorage.getItem(this.STORAGE_KEYS.RELATIONSHIPS);
      let relationships = [];
      if (relationshipsData) {
        const parsedRel = JSON.parse(relationshipsData);
        if (!this.isExpired(parsedRel.timestamp, parsedRel.ttl)) {
          relationships = parsedRel.relationships || [];
        }
      }

      // Cargar relaciones en el relationship manager para uso posterior
      if (relationships.length > 0) {
        relationshipManager.deserializeRelationships({
          relationships: relationships,
          version: this.VERSION,
          timestamp: Date.now()
        });
      }

      return {
        elements: parsed.elements || [],
        relationships: relationships
      };

    } catch (error) {
      console.error('❌ Error cargando elementos PPINOT:', error);
      return { elements: [], relationships: [] };
    }
  }

  // === VALIDACIÓN Y LIMPIEZA ===

  isExpired(timestamp, ttl) {
    return Date.now() - timestamp > ttl;
  }

  cleanupExpiredData() {
    try {
      const keys = Object.values(this.STORAGE_KEYS);
      keys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          const parsed = JSON.parse(data);
          if (this.isExpired(parsed.timestamp, parsed.ttl)) {
            localStorage.removeItem(key);
            console.log(`🧹 Limpiado dato expirado: ${key}`);
          }
        }
      });
    } catch (error) {
      console.error('❌ Error limpiando datos expirados:', error);
    }
  }

  clearPPINOTData() {
    try {
      Object.values(this.STORAGE_KEYS).forEach(key => {
        localStorage.removeItem(key);
      });
      console.log('🧹 Datos PPINOT limpiados');
    } catch (error) {
      console.error('❌ Error limpiando datos PPINOT:', error);
    }
  }

  // === MIGRACIÓN DE DATOS LEGACY ===

  migrateLegacyData() {
    try {
      console.log('🔄 Migrando datos legacy de PPINOT...');
      
      // Migrar desde claves antiguas
      const legacyKeys = [
        'ppinotElements',
        'ppinotRelationships', 
        'bpmnPPINOTElements',
        'bpmnPPINOTRelations'
      ];

      let migratedElements = [];
      let migratedRelationships = [];

      legacyKeys.forEach(key => {
        const data = localStorage.getItem(key);
        if (data) {
          try {
            const parsed = JSON.parse(data);
            if (Array.isArray(parsed)) {
              if (key.includes('Element')) {
                migratedElements = [...migratedElements, ...parsed];
              } else if (key.includes('Relation')) {
                migratedRelationships = [...migratedRelationships, ...parsed];
              }
            }
            // Limpiar clave legacy
            localStorage.removeItem(key);
          } catch (e) {
            console.warn(`⚠️ Error migrando ${key}:`, e);
          }
        }
      });

      if (migratedElements.length > 0 || migratedRelationships.length > 0) {
        this.savePPINOTElements(migratedElements, migratedRelationships);
        console.log(`✅ Migrados ${migratedElements.length} elementos y ${migratedRelationships.length} relaciones`);
      }

    } catch (error) {
      console.error('❌ Error migrando datos legacy:', error);
    }
  }

  // === INFORMACIÓN DE ESTADO ===

  getStorageInfo() {
    try {
      const metadata = localStorage.getItem(this.STORAGE_KEYS.METADATA);
      if (metadata) {
        return JSON.parse(metadata);
      }
      return null;
    } catch (error) {
      console.error('❌ Error obteniendo información de almacenamiento:', error);
      return null;
    }
  }

  // === INTEGRACIÓN CON OTROS SISTEMAS ===

  syncWithImportExport() {
    try {
      const data = this.loadPPINOTElements();
      
      // Sincronizar con ImportExportManager
      if (data.elements.length > 0) {
        localStorage.setItem('ppinotElements', JSON.stringify(data.elements));
      }
      if (data.relationships.length > 0) {
        localStorage.setItem('ppinotRelationships', JSON.stringify(data.relationships));
      }
      
      console.log('🔄 Sincronizado con ImportExportManager');
    } catch (error) {
      console.error('❌ Error sincronizando con ImportExport:', error);
    }
  }

  syncWithAutoSave() {
    try {
      const data = this.loadPPINOTElements();
      
      // Sincronizar con LocalStorageAutoSaveManager
      const registry = getServiceRegistry();
      const autoSaveManager = registry?.get('localStorageAutoSaveManager');
      
      if (autoSaveManager && data.elements.length > 0) {
        // Convertir elementos PPINOT a formato de indicadores PPI
        const indicators = data.elements
          .filter(el => el.metadata?.isPPI)
          .map(el => {
            // Validar timestamp antes de crear fecha
            let timestamp = el.timestamp;
            if (!timestamp || typeof timestamp !== 'number' || isNaN(timestamp)) {
              timestamp = Date.now();
            }
            
            const createdAt = new Date(timestamp);
            const isValidDate = !isNaN(createdAt.getTime()) && createdAt.getTime() > 0;
            
            return {
              id: el.id,
              title: el.name,
              elementId: el.id,
              target: data.elements.find(e => e.metadata?.isTarget && e.parentId === el.id)?.name || '',
              scope: data.elements.find(e => e.metadata?.isScope && e.parentId === el.id)?.name || '',
              createdAt: isValidDate ? createdAt.toISOString() : new Date().toISOString(),
              updatedAt: new Date().toISOString()
            };
          });
        
        if (autoSaveManager.projectState) {
          autoSaveManager.projectState.ppi.indicators = indicators;
          autoSaveManager.projectState.ppi.lastUpdate = Date.now();
        }
      }
      
      console.log('🔄 Sincronizado con LocalStorageAutoSaveManager');
    } catch (error) {
      console.error('❌ Error sincronizando con AutoSave:', error);
    }
  }
}

// Crear instancia singleton
const ppinotStorageManager = new PPINOTStorageManager();

// Registrar en ServiceRegistry
if (typeof getServiceRegistry === 'function') {
  const registry = getServiceRegistry();
  if (registry) {
    registry.register('PPINOTStorageManager', ppinotStorageManager, {
      description: 'Gestión unificada de elementos PPINOT en localStorage'
    });
  }
}

export default ppinotStorageManager;
