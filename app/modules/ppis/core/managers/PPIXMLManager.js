/**
 * PPIXMLManager
 * 
 * Responsabilidades:
 * - Gestión de serialización XML para relaciones PPINOT
 * - Cache de relaciones XML
 * - Carga y restauración de relaciones desde XML
 * - Persistencia de relaciones en el modelo BPMN
 */

import { getServiceRegistry } from '../../../ui/core/ServiceRegistry.js';
import { PPIUtils } from '../utils/PPIUtils.js';

export class PPIXMLManager {
  constructor() {
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
    this.xmlCacheTimeout = 5000; // 5 segundos
    this.isLoadingRelationships = false;
    this.isRestoringRelationships = false;
  }

  // ==================== GUARDADO EN XML ====================

  savePPINOTRelationshipsToXML(relationships) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return;

      this.clearXmlCache();

      modeler.saveXML({ format: true }).then(result => {
        if (result && result.xml) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(result.xml, 'text/xml');
          
          // Buscar o crear elemento extensionElements
          let extensionsElement = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements')[0];
          if (!extensionsElement) {
            extensionsElement = xmlDoc.createElementNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements');
            const definitions = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'definitions')[0];
            if (definitions) {
              definitions.appendChild(extensionsElement);
            }
          }
          
          // Buscar o crear elemento PPINOTRelationships
          let ppinotElement = extensionsElement.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships')[0];
          if (!ppinotElement) {
            ppinotElement = xmlDoc.createElementNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships');
            extensionsElement.appendChild(ppinotElement);
          }
          
          // Limpiar relaciones existentes
          ppinotElement.innerHTML = '';
          
          // Agregar nuevas relaciones
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

          // Serializar y actualizar el modelo
          const serializer = new XMLSerializer();
          const updatedXml = serializer.serializeToString(xmlDoc);
          
          // Importar el XML actualizado
          modeler.importXML(updatedXml).then(() => {
            console.log(`💾 ${relationships.length} relaciones PPINOT guardadas en XML`);
          }).catch(error => {
            console.warn('⚠️ Error importando XML actualizado:', error);
          });
        }
      }).catch(error => {
        console.error('❌ Error guardando relaciones PPINOT en XML:', error);
      });
      
    } catch (error) {
      console.error('❌ Error en savePPINOTRelationshipsToXML:', error);
    }
  }

  // ==================== CARGA DESDE XML ====================

  loadPPINOTRelationshipsFromXML() {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler) return [];

      if (this.isLoadingRelationships) {
        console.log('⏳ Ya se están cargando relaciones XML...');
        return this.xmlRelationshipsCache || [];
      }

      // Verificar cache
      const now = Date.now();
      if (this.xmlRelationshipsCache && (now - this.lastXmlCacheTime) < this.xmlCacheTimeout) {
        return this.xmlRelationshipsCache;
      }

      this.isLoadingRelationships = true;
      const relationships = [];

      try {
        let currentXML = null;
        
        // Intentar obtener XML del modeler
        if (modeler.getXML) {
          modeler.getXML({ format: true }).then(result => {
            currentXML = result.xml;
          }).catch(() => {
            // Fallback silencioso
          });
        }

        // Método alternativo si getXML no está disponible
        if (!currentXML && modeler.get('canvas')) {
          const rootElement = modeler.get('canvas').getRootElement();
          if (rootElement && rootElement.businessObject && rootElement.businessObject.$model) {
            currentXML = rootElement.businessObject.$model.xml;
          }
        }

        // Otro método alternativo usando moddle
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
          
          // Buscar relaciones PPINOT en el XML
          const relationshipElements = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'relationship');
          
          for (let i = 0; i < relationshipElements.length; i++) {
            const relEl = relationshipElements[i];
            relationships.push({
              childId: relEl.getAttribute('childId'),
              parentId: relEl.getAttribute('parentId'),
              childType: relEl.getAttribute('childType'),
              parentType: relEl.getAttribute('parentType'),
              childBusinessObjectType: relEl.getAttribute('childBusinessObjectType'),
              parentBusinessObjectType: relEl.getAttribute('parentBusinessObjectType'),
              childName: relEl.getAttribute('childName'),
              parentName: relEl.getAttribute('parentName'),
              timestamp: parseInt(relEl.getAttribute('timestamp')) || Date.now()
            });
          }
          
          console.log(`📂 Cargadas ${relationships.length} relaciones PPINOT desde XML`);
        }

        // Actualizar cache
        this.xmlRelationshipsCache = relationships;
        this.lastXmlCacheTime = now;

      } catch (parseError) {
        console.warn('⚠️ Error parseando XML para relaciones PPINOT:', parseError);
      }

      return relationships;

    } catch (error) {
      console.error('❌ Error en loadPPINOTRelationshipsFromXML:', error);
      return [];
    } finally {
      this.isLoadingRelationships = false;
    }
  }

  // ==================== RESTAURACIÓN DESDE XML ====================

  restorePPINOTRelationshipsFromXML(relationships) {
    try {
      const modeler = this.getBpmnModeler();
      if (!modeler || !relationships.length) return;

      if (this.isRestoringRelationships) {
        console.log('⏳ Ya se están restaurando relaciones XML...');
        return;
      }

      this.isRestoringRelationships = true;
      console.log(`🔄 Restaurando ${relationships.length} relaciones PPINOT desde XML...`);

      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');

      const restoreAllRelationships = () => {
        relationships.forEach(rel => {
          try {
            const childElement = elementRegistry.get(rel.childId);
            const parentElement = elementRegistry.get(rel.parentId);
            
            if (childElement && parentElement) {
              if (!childElement.parent || childElement.parent.id !== rel.parentId) {
                try {
                  modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
                  console.log(`✅ Relación XML restaurada: ${rel.childId} → ${rel.parentId}`);
                } catch (error) {
                  console.debug('⚠️ Error en moveElements (normal):', error.message);
                }
              }
            } else {
              console.warn(`⚠️ Elementos no encontrados para relación XML: ${rel.childId} → ${rel.parentId}`);
            }
          } catch (error) {
            console.warn(`⚠️ Error restaurando relación XML ${rel.childId} → ${rel.parentId}:`, error);
          }
        });
      };

      // Ejecutar restauración
      restoreAllRelationships();

    } catch (error) {
      console.error('❌ Error en restorePPINOTRelationshipsFromXML:', error);
    } finally {
      this.isRestoringRelationships = false;
    }
  }

  // ==================== GESTIÓN DE CACHE ====================

  clearXmlCache() {
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
  }

  // ==================== UTILIDADES ====================

  getBpmnModeler() {
    return PPIUtils.getBpmnModeler();
  }
}
