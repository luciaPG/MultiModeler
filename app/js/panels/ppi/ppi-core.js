// === PPI Core Functionality ===
// Funcionalidad principal del gestor de PPIs

class PPICore {
  constructor() {
    this.ppis = [];
    this.filteredPPIs = [];
    this.processedElements = new Set();
    this.pendingPPINOTRestore = null;
    this.autoSaveEnabled = true; // Explicitly enable auto-save by default
    this.measureTypes = {
      time: { name: 'Medida de Tiempo', icon: 'fas fa-clock' },
      count: { name: 'Medida de Conteo', icon: 'fas fa-hashtag' },
      state: { name: 'Condición de Estado', icon: 'fas fa-toggle-on' },
      data: { name: 'Medida de Datos', icon: 'fas fa-database' },
      derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' },
      aggregated: { name: 'Medida Agregada', icon: 'fas fa-chart-bar' }
    };
    
    // Debounced auto-save mechanism
    this.autoSaveTimeout = null;
    this.autoSaveDelay = 1000; // 1 second delay
    this.lastSaveTime = 0;
    this.minSaveInterval = 2000; // Minimum 2 seconds between saves
    
    // Cache for XML relationships to prevent repeated parsing
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
    this.xmlCacheTimeout = 5000; // 5 seconds cache timeout
    
    // Cargar datos automáticamente al inicializar
    this.loadPPIs();
    this.loadPPINOTElements();
    
  }

  // === CORE DATA MANAGEMENT ===
  
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
    this.ppis.push(ppi);
    this.savePPIs();
    return ppi;
  }

  updatePPI(ppiId, updatedData) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      this.ppis[index] = { 
        ...this.ppis[index], 
        ...updatedData, 
        updatedAt: new Date().toISOString() 
      };
      this.savePPIs();
      return true;
    }
    return false;
  }

  deletePPI(ppiId) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      const deletedPPI = this.ppis[index];
      
      // Store the PPI data before removing it from the list
      const ppiData = { ...deletedPPI };
      
      this.ppis.splice(index, 1);
      this.savePPIs();
      
      // Also remove the PPI element and its children from the canvas
      this.deletePPIFromCanvas(ppiId, ppiData);
      
      return true;
    }
    return false;
  }

  deletePPIFromCanvas(ppiId, ppiData = null) {
    try {
      console.log(`🔄 Intentando eliminar PPI del canvas: ${ppiId}`);
      
      if (!window.modeler) {
        console.warn('⚠️ Modeler no disponible para eliminar PPI del canvas');
        return;
      }
      
      // Use provided PPI data or find it in the list
      let ppi = ppiData;
      if (!ppi) {
        ppi = this.ppis.find(p => p.id === ppiId);
      }
      
      if (!ppi) {
        console.log(`ℹ️ PPI no encontrado en la lista: ${ppiId}`);
        return;
      }
      
      const elementId = ppi.elementId;
      if (!elementId) {
        console.log(`ℹ️ PPI ${ppiId} no tiene elementId asociado`);
        return;
      }
      
      console.log(`🔍 Buscando elemento en canvas con elementId: ${elementId}`);
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const modeling = window.modeler.get('modeling');
      
      // Find the PPI element on the canvas using elementId
      const ppiElement = elementRegistry.get(elementId);
      if (ppiElement) {
        console.log(`🗑️ PPI encontrado en canvas: ${elementId} (tipo: ${ppiElement.type})`);
        
        // Find all child elements (scope, target, measure, condition)
        const allElements = elementRegistry.getAll();
        const childElements = allElements.filter(el => 
          el.parent && el.parent.id === elementId && (
            el.type === 'PPINOT:Scope' || 
            el.type === 'PPINOT:Target' || 
            el.type === 'PPINOT:Measure' || 
            el.type === 'PPINOT:Condition' ||
            (el.businessObject && (
              el.businessObject.$type === 'PPINOT:Scope' ||
              el.businessObject.$type === 'PPINOT:Target' ||
              el.businessObject.$type === 'PPINOT:Measure' ||
              el.businessObject.$type === 'PPINOT:Condition'
            ))
          )
        );
        
        console.log(`🎯 Elementos hijo encontrados: ${childElements.length}`);
        
        // Remove child elements first
        childElements.forEach(child => {
          try {
            console.log(`🗑️ Eliminando elemento hijo: ${child.id} (${child.type})`);
            modeling.removeElements([child]);
          } catch (error) {
            console.warn(`⚠️ Error eliminando hijo ${child.id}:`, error);
          }
        });
        
        // Remove the PPI element
        try {
          console.log(`🗑️ Eliminando elemento PPI principal: ${elementId}`);
          modeling.removeElements([ppiElement]);
          console.log(`✅ PPI eliminado exitosamente del canvas: ${elementId}`);
        } catch (error) {
          console.warn(`⚠️ Error eliminando PPI ${elementId}:`, error);
        }
      } else {
        console.log(`ℹ️ PPI no encontrado en canvas con elementId: ${elementId}`);
        
        // Try to find by searching all elements for PPINOT types
        const allElements = elementRegistry.getAll();
        const ppiElements = allElements.filter(el => 
          el.type && el.type.startsWith('PPINOT:') && 
          el.id !== elementId && 
          (el.businessObject && el.businessObject.name === ppi.title)
        );
        
        if (ppiElements.length > 0) {
          console.log(`🔍 Encontrados ${ppiElements.length} elementos PPINOT alternativos, intentando eliminar el primero`);
          try {
            modeling.removeElements([ppiElements[0]]);
            console.log(`✅ PPI alternativo eliminado del canvas: ${ppiElements[0].id}`);
          } catch (error) {
            console.warn(`⚠️ Error eliminando PPI alternativo ${ppiElements[0].id}:`, error);
          }
        }
      }
    } catch (error) {
      console.error('❌ Error eliminando PPI del canvas:', error);
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

  // === PERSISTENCE ===
  
  // Debounced auto-save method
  debouncedSavePPINOTElements() {
    const now = Date.now();
    
    // Clear existing timeout
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    
    // Check if enough time has passed since last save
    if (now - this.lastSaveTime < this.minSaveInterval) {
      // Schedule save for later
      this.autoSaveTimeout = setTimeout(() => {
        this.savePPINOTElements();
      }, this.autoSaveDelay);
    } else {
      // Save immediately
      this.savePPINOTElements();
    }
  }
  
  // Force save immediately (for manual operations)
  forceSavePPINOTElements() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }
    this.savePPINOTElements(true);
  }
  
  // Clear XML cache when needed
  clearXmlCache() {
    this.xmlRelationshipsCache = null;
    this.lastXmlCacheTime = 0;
  }
  
  savePPIs() {
    try {
      if (!this.isAutoSaveEnabled()) {
        return;
      }
      
      localStorage.setItem('ppis', JSON.stringify(this.ppis));
    } catch (e) {
      console.error('Error al guardar PPIs:', e);
    }
  }

  loadPPIs() {
    try {
      const saved = localStorage.getItem('ppis');
      if (saved) {
        this.ppis = JSON.parse(saved);
        console.log('PPIs loaded from localStorage:', this.ppis.length);
      } else {
        console.log('No PPIs found in localStorage');
      }
    } catch (e) {
      console.error('Error al cargar PPIs:', e);
      this.ppis = [];
    }
  }

  // === PPINOT ELEMENTS PERSISTENCE ===
  
  savePPINOTElements(force = false) {
    try {
      if (!this.isAutoSaveEnabled()) {
        return;
      }
      
      if (!window.modeler) return;
      
      // Update last save time
      this.lastSaveTime = Date.now();
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const allElements = elementRegistry.getAll();
      
      // Guardar elementos PPINOT principales (solo información esencial)
      const ppiElements = allElements.filter(element => 
        element.type === 'PPINOT:Ppi' || 
        (element.businessObject && element.businessObject.$type === 'PPINOT:Ppi')
      );
      
      // Guardar elementos hijos de PPINOT (solo información esencial)
      const ppiChildren = allElements.filter(element => {
        // Verificar si es un elemento hijo de PPI
        const isChildOfPPI = element.parent && 
          (element.parent.type === 'PPINOT:Ppi' || 
           (element.parent.businessObject && element.parent.businessObject.$type === 'PPINOT:Ppi'));
        
        // Verificar si es un tipo de elemento hijo válido
        const isValidChildType = element.type === 'PPINOT:Scope' || 
          element.type === 'PPINOT:Target' ||
          element.type === 'PPINOT:Measure' ||
          element.type === 'PPINOT:Condition' ||
          (element.businessObject && (
            element.businessObject.$type === 'PPINOT:Scope' ||
            element.businessObject.$type === 'PPINOT:Target' ||
            element.businessObject.$type === 'PPINOT:Measure' ||
            element.businessObject.$type === 'PPINOT:Condition'
          ));
        
        return isChildOfPPI && isValidChildType;
      });
      
      // Debug: Log what we found
      const scopeElements = ppiChildren.filter(el => 
        el.type === 'PPINOT:Scope' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Scope')
      );
      const targetElements = ppiChildren.filter(el => 
        el.type === 'PPINOT:Target' || 
        (el.businessObject && el.businessObject.$type === 'PPINOT:Target')
      );
      

      
      const ppinotData = {
        ppiElements: ppiElements.map(el => ({
          id: el.id,
          type: el.type,
          parentId: el.parent ? el.parent.id : null,
          businessObject: {
            name: el.businessObject ? el.businessObject.name : '',
            $type: el.businessObject ? el.businessObject.$type : ''
          }
        })),
        ppiChildren: ppiChildren.map(el => ({
          id: el.id,
          type: el.type,
          parentId: el.parent ? el.parent.id : null,
          parentType: el.parent ? el.parent.type : null,
          businessObject: {
            name: el.businessObject ? el.businessObject.name : '',
            $type: el.businessObject ? el.businessObject.$type : ''
          }
        })),
        // Información de relaciones padre-hijo (solo esencial)
        parentChildRelationships: ppiChildren.map(el => ({
          childId: el.id,
          parentId: el.parent ? el.parent.id : null,
          childType: el.type,
          parentType: el.parent ? el.parent.type : null,
          childBusinessObjectType: el.businessObject ? el.businessObject.$type : null,
          parentBusinessObjectType: el.parent && el.parent.businessObject ? el.parent.businessObject.$type : null,
          childName: el.businessObject ? el.businessObject.name : '',
          parentName: el.parent && el.parent.businessObject ? el.parent.businessObject.name : '',
          timestamp: Date.now()
        })),
        timestamp: new Date().toISOString()
      };
      
      localStorage.setItem('ppinotElements', JSON.stringify(ppinotData));

      
      // GUARDAR TAMBIÉN EN EL XML BPMN PARA PERSISTENCIA COMPLETA
      this.savePPINOTRelationshipsToXML(ppinotData.parentChildRelationships);
      
    } catch (e) {
      console.error('Error al guardar elementos PPINOT:', e);
    }
  }

  // Nuevo método para guardar relaciones en el XML BPMN
  savePPINOTRelationshipsToXML(relationships) {
    try {
      if (!window.modeler) return;
      
      // Clear cache before saving
      this.clearXmlCache();

      // Obtener el XML actual
      window.modeler.saveXML({ format: true }).then(result => {
        if (result && result.xml) {
          // Crear un parser para modificar el XML
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(result.xml, 'text/xml');
          
          // Buscar o crear el elemento de extensiones para PPINOT
          let extensionsElement = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements')[0];
          if (!extensionsElement) {
            extensionsElement = xmlDoc.createElementNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'extensionElements');
            const definitions = xmlDoc.getElementsByTagNameNS('http://www.omg.org/spec/BPMN/20100524/MODEL', 'definitions')[0];
            if (definitions) {
              definitions.appendChild(extensionsElement);
            }
          }
          
          // Buscar o crear el elemento PPINOT
          let ppinotElement = extensionsElement.getElementsByTagNameNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships')[0];
          if (!ppinotElement) {
            ppinotElement = xmlDoc.createElementNS('http://www.omg.org/spec/PPINOT/20100524/MODEL', 'PPINOTRelationships');
            extensionsElement.appendChild(ppinotElement);
          }
          
          // Limpiar relaciones existentes
          ppinotElement.innerHTML = '';
          
          // Agregar las relaciones actuales
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
          
          // Convertir de vuelta a string XML
          const serializer = new XMLSerializer();
          const updatedXML = serializer.serializeToString(xmlDoc);
          
          // Guardar el XML actualizado en localStorage
          localStorage.setItem('bpmnDiagram', updatedXML);
    
          
        }
      }).catch(err => {
        console.warn('Error guardando relaciones PPINOT en XML:', err);
      });
      
    } catch (e) {

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
    try {
      const saved = localStorage.getItem('ppinotElements');
      if (!saved) {
  
        return false;
      }
      
      const ppinotData = JSON.parse(saved);

      
      // Marcar para restauración automática cuando el modeler esté listo
      this.pendingPPINOTRestore = ppinotData;
      return true;
    } catch (e) {
      console.error('Error al cargar elementos PPINOT:', e);
      return false;
    }
  }

  // Nuevo método para cargar relaciones desde el XML BPMN
  loadPPINOTRelationshipsFromXML() {
    try {
      if (!window.modeler) return [];
      
      // Prevenir cargas duplicadas
      if (this.isLoadingRelationships) {
  
        return [];
      }
      
      // Check cache first
      const now = Date.now();
      if (this.xmlRelationshipsCache && (now - this.lastXmlCacheTime) < this.xmlCacheTimeout) {
  
        return this.xmlRelationshipsCache;
      }
      
      this.isLoadingRelationships = true;

      
      // Buscar relaciones PPINOT en el XML
      const relationships = [];
      
      // Obtener el XML actual de forma síncrona usando el XML actual del modeler
      try {
        // Intentar obtener el XML de forma más directa
        let currentXML = null;
        
        // Método 1: Intentar obtener desde el modeler directamente
        if (window.modeler.getXML) {
          currentXML = window.modeler.getXML();
        }
        
        // Método 2: Intentar obtener desde el canvas
        if (!currentXML && window.modeler.get('canvas')) {
          const rootElement = window.modeler.get('canvas').getRootElement();
          if (rootElement && rootElement.businessObject && rootElement.businessObject.$model) {
            currentXML = rootElement.businessObject.$model.serialize();
          }
        }
        
        // Método 3: Intentar obtener desde el moddle
        if (!currentXML && window.modeler.get('moddle')) {
          const moddle = window.modeler.get('moddle');
          if (moddle && moddle.serialize) {
            const rootElement = window.modeler.get('canvas').getRootElement();
            if (rootElement && rootElement.businessObject) {
              currentXML = moddle.serialize(rootElement.businessObject);
            }
          }
        }
        
        if (currentXML) {
          const parser = new DOMParser();
          const xmlDoc = parser.parseFromString(currentXML, 'text/xml');
          
                      // Buscar elementos de relaciones PPINOT
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
          
          // Update cache
          this.xmlRelationshipsCache = relationships;
          this.lastXmlCacheTime = now;
          
    
        } else {
          throw new Error('No se pudo obtener XML síncrono');
        }
      } catch (xmlError) {
        console.warn('⚠️ Error obteniendo XML síncrono, intentando método asíncrono:', xmlError);
        
        // Fallback al método asíncrono
        window.modeler.saveXML({ format: true }).then(result => {
          if (result && result.xml) {
            const parser = new DOMParser();
            const xmlDoc = parser.parseFromString(result.xml, 'text/xml');
            
            // Buscar elementos de relaciones PPINOT
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
            
            // Update cache
            this.xmlRelationshipsCache = relationships;
            this.lastXmlCacheTime = now;
            
            console.log('📂 Relaciones PPINOT cargadas desde XML (async):', relationships.length);
          }
          
          this.isLoadingRelationships = false;
        }).catch(err => {
          console.warn('❌ Error cargando relaciones PPINOT desde XML:', err);
          this.isLoadingRelationships = false;
        });
      }
      
      this.isLoadingRelationships = false;
      return relationships;
    } catch (e) {
      console.error('Error cargando relaciones PPINOT desde XML:', e);
      this.isLoadingRelationships = false;
      return [];
    }
  }

  // Método para restaurar relaciones desde XML
  restorePPINOTRelationshipsFromXML(relationships) {
    try {
      if (!window.modeler || !relationships.length) return;
      
      // Prevenir restauraciones duplicadas
      if (this.isRestoringRelationships) {
        console.log('⏳ Restauración ya en progreso, saltando...');
        return;
      }
      
      this.isRestoringRelationships = true;
      console.log('🔄 Restaurando relaciones PPINOT desde XML...');
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const modeling = window.modeler.get('modeling');
      
      // Procesar todas las relaciones de una vez sin delays
      const restoreAllRelationships = () => {
        let restoredCount = 0;
        let skippedCount = 0;
        
        relationships.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            // Verificar si la relación ya existe
            if (!childElement.parent || childElement.parent.id !== rel.parentId) {
              try {
                // Usar modeling service para establecer la relación
                modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
                restoredCount++;
              } catch (error) {
                console.warn(`❌ Error restaurando relación: ${rel.childId} -> ${rel.parentId}`, error);
              }
            } else {
              skippedCount++;
            }
          } else {
            console.warn(`⚠️ Elementos no encontrados: ${rel.childId} -> ${rel.parentId}`);
          }
        });
        
        console.log(`✅ Restauración completada: ${restoredCount} restauradas, ${skippedCount} saltadas`);
        this.isRestoringRelationships = false;
      };
      
      // Ejecutar inmediatamente sin delays
      restoreAllRelationships();
      
    } catch (e) {
      console.error('Error restaurando relaciones PPINOT desde XML:', e);
      this.isRestoringRelationships = false;
    }
  }

  restorePPINOTElements() {
    try {
      if (!window.modeler) {
        return false;
      }
      
      // Prevenir restauraciones duplicadas
      if (this.isRestoringElements) {
        console.log('⏳ Restauración de elementos ya en progreso, saltando...');
        return false;
      }
      
      this.isRestoringElements = true;
      console.log('🔄 Restaurando elementos PPINOT...');
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const modeling = window.modeler.get('modeling');
      
      // PRIMERO: Intentar cargar relaciones desde el XML BPMN (esto ya incluye la restauración)
      const xmlRelationships = this.loadPPINOTRelationshipsFromXML();
      console.log(`📂 Relaciones cargadas desde XML: ${xmlRelationships.length}`);
      
      // SEGUNDO: Cargar datos de localStorage si están disponibles
      if (!this.pendingPPINOTRestore) {
        this.loadPPINOTElements();
      }
      
      if (!this.pendingPPINOTRestore) {
        console.log('📂 No hay datos PPINOT pendientes de localStorage');
        this.isRestoringElements = false;
        return true;
      }
      
      const ppinotData = this.pendingPPINOTRestore;
      console.log(`📂 Datos PPINOT de localStorage: ${ppinotData.ppiElements.length} PPIs, ${ppinotData.ppiChildren.length} hijos`);
      
      // TERCERO: Restaurar todas las relaciones pendientes de una vez
      const allRelationshipsToRestore = [];
      
      // Agregar relaciones del XML si no están ya procesadas
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
      
      // Agregar relaciones de localStorage
      if (ppinotData.parentChildRelationships) {
        ppinotData.parentChildRelationships.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            if (!childElement.parent || childElement.parent.id !== rel.parentId) {
              // Verificar si ya está en la lista de XML
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
      
      // Restaurar todas las relaciones de una vez
      if (allRelationshipsToRestore.length > 0) {
        console.log(`🔄 Restaurando ${allRelationshipsToRestore.length} relaciones pendientes...`);
        
        // Debug: Count scope and target elements
        const scopeRelationships = allRelationshipsToRestore.filter(rel => 
          rel.childData && (
            rel.childData.childType === 'PPINOT:Scope' || 
            rel.childData.childBusinessObjectType === 'PPINOT:Scope'
          )
        );
        const targetRelationships = allRelationshipsToRestore.filter(rel => 
          rel.childData && (
            rel.childData.childType === 'PPINOT:Target' || 
            rel.childData.childBusinessObjectType === 'PPINOT:Target'
          )
        );
        console.log(`🔍 Debug: ${scopeRelationships.length} scope, ${targetRelationships.length} target relationships to restore`);
        
        let restoredCount = 0;
        let skippedCount = 0;
        let scopeRestored = 0;
        let targetRestored = 0;
        
        allRelationshipsToRestore.forEach(rel => {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (childElement && parentElement) {
            try {
              // Verificar si la relación ya existe
              if (!childElement.parent || childElement.parent.id !== rel.parentId) {
                modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
                restoredCount++;
                
                // Track scope and target restorations
                if (rel.childData && (
                  rel.childData.childType === 'PPINOT:Scope' || 
                  rel.childData.childBusinessObjectType === 'PPINOT:Scope'
                )) {
                  scopeRestored++;
                  console.log(`✅ Restaurado SCOPE: ${rel.childId} -> ${rel.parentId} (${rel.source})`);
                } else if (rel.childData && (
                  rel.childData.childType === 'PPINOT:Target' || 
                  rel.childData.childBusinessObjectType === 'PPINOT:Target'
                )) {
                  targetRestored++;
                  console.log(`✅ Restaurado TARGET: ${rel.childId} -> ${rel.parentId} (${rel.source})`);
                } else {
                  console.log(`✅ Restaurada relación: ${rel.childId} -> ${rel.parentId} (${rel.source})`);
                }
              } else {
                skippedCount++;
              }
            } catch (error) {
              console.warn(`❌ Error restaurando relación: ${rel.childId} -> ${rel.parentId}`, error);
            }
          } else {
            console.warn(`⚠️ Elementos no encontrados: ${rel.childId} -> ${rel.parentId}`);
          }
        });
        
        console.log(`✅ Restauración completada: ${restoredCount} restauradas (${scopeRestored} scope, ${targetRestored} target), ${skippedCount} saltadas`);
      } else {
        console.log('✅ No hay relaciones pendientes de restaurar');
      }
      
      // Actualizar PPIs con información de elementos hijos restaurados
      const restoredChildren = new Map();
      ppinotData.ppiChildren.forEach(childData => {
        const existingElement = elementRegistry.get(childData.id);
        if (existingElement) {
          restoredChildren.set(childData.id, existingElement);
        }
      });
      
      this.updatePPIsWithRestoredChildren(restoredChildren);
      
      // Limpiar datos pendientes
      this.pendingPPINOTRestore = null;
      
      console.log('✅ Restauración de elementos PPINOT completada');
      this.isRestoringElements = false;
      return true;
      
    } catch (error) {
      console.error('❌ Error restaurando elementos PPINOT:', error);
      this.isRestoringElements = false;
      return false;
    }
  }

  restoreParentChildRelationship(childId, parentId, childData = null) {
    try {
      if (!window.modeler) return false;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const modeling = window.modeler.get('modeling');
      const eventBus = window.modeler.get('eventBus');
      
      const childElement = elementRegistry.get(childId);
      const parentElement = elementRegistry.get(parentId);
      
      if (!childElement || !parentElement) {
        console.warn('❌ No se pueden restaurar elementos para relación:', childId, '->', parentId);
        return false;
      }
      
      // Verificar si la relación ya existe
      if (childElement.parent && childElement.parent.id === parentId) {
        console.log(`✅ Relación ya existe: ${childId} -> ${parentId}`);
        return true;
      }
      
      // Intentar restaurar la relación padre-hijo usando el servicio de modelado
      try {
        console.log(`🔄 Restaurando relación padre-hijo: ${childId} -> ${parentId}`);
        
        // Usar el servicio de modelado para mover el elemento hijo al padre correcto
        // Esto es la forma correcta de establecer relaciones padre-hijo en BPMN.js
        modeling.moveShape(childElement, { x: 0, y: 0 }, parentElement);
        
        // Verificar que la relación se estableció correctamente
        setTimeout(() => {
          const updatedChildElement = elementRegistry.get(childId);
          if (updatedChildElement && updatedChildElement.parent && updatedChildElement.parent.id === parentId) {
            console.log(`✅ Relación padre-hijo restaurada exitosamente: ${childId} -> ${parentId}`);
            
            // Si tenemos información detallada del elemento hijo, actualizar el PPI
            if (childData) {
              this.updatePPIWithChildInfo(parentId, childId);
            }
          } else {
            console.warn(`⚠️ No se pudo verificar la restauración de la relación: ${childId} -> ${parentId}`);
          }
        }, 100);
        
        return true;
      } catch (error) {
        console.warn('❌ Error restaurando relación padre-hijo con modeling service:', error);
        
        // Fallback: intentar usar el evento element.updateParent directamente
        try {
          console.log(`🔄 Intentando fallback con element.updateParent: ${childId} -> ${parentId}`);
          
          // Disparar evento de actualización de padre
          eventBus.fire('element.updateParent', {
            element: childElement,
            oldParent: childElement.parent,
            newParent: parentElement
          });
          
          return true;
        } catch (fallbackError) {
          console.warn('❌ Error en fallback de element.updateParent:', fallbackError);
          
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
      console.error('Error en restoreParentChildRelationship:', e);
      return false;
    }
  }

  updatePPIsWithRestoredChildren(restoredChildren) {
    try {
      console.log('🔄 Actualizando PPIs con elementos hijos restaurados...');
      
      restoredChildren.forEach((childElement, childId) => {
        if (childElement.parent && childElement.parent.type === 'PPINOT:Ppi') {
          const parentPPIId = childElement.parent.id;
          console.log(`🔄 Actualizando PPI ${parentPPIId} con elemento hijo ${childId}`);
          
          // Actualizar el PPI con la información del elemento hijo
          this.updatePPIWithChildInfo(parentPPIId, childId);
        }
      });
      
      console.log('✅ PPIs actualizados con elementos hijos restaurados');
    } catch (e) {
      console.error('Error actualizando PPIs con elementos hijos:', e);
    }
  }

  updatePPIWithChildInfo(parentPPIId, childElementId) {
    try {
      if (!window.modeler) return;
      
      const elementRegistry = window.modeler.get('elementRegistry');
      const childElement = elementRegistry.get(childElementId);
      
      if (!childElement) {
        console.warn('❌ Elemento hijo no encontrado:', childElementId);
        return;
      }
      
      const existingPPI = this.ppis.find(ppi => ppi.elementId === parentPPIId);
      if (!existingPPI) {
        console.warn('❌ PPI padre no encontrado:', parentPPIId);
        return;
      }
      
      // Extraer información basada en el tipo de elemento
      let updatedData = { updatedAt: new Date().toISOString() };
      
      if (childElement.type === 'PPINOT:Target') {
        const targetName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.target = targetName;
        console.log(`🎯 Actualizando TARGET del PPI ${parentPPIId}:`, targetName);
      } else if (childElement.type === 'PPINOT:Scope') {
        const scopeName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.scope = scopeName;
        console.log(`🎯 Actualizando SCOPE del PPI ${parentPPIId}:`, scopeName);
      } else if (childElement.type === 'PPINOT:Measure') {
        const measureName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.measureDefinition = {
          type: this.detectMeasureType(childElementId, childElement.type),
          definition: measureName
        };
        console.log(`📏 Actualizando MEASURE del PPI ${parentPPIId}:`, measureName);
      } else if (childElement.type === 'PPINOT:Condition') {
        const conditionName = (childElement.businessObject && childElement.businessObject.name) || childElementId;
        updatedData.businessObjective = conditionName;
        console.log(`📋 Actualizando CONDITION del PPI ${parentPPIId}:`, conditionName);
      }
      
      if (this.updatePPI(existingPPI.id, updatedData)) {
        console.log(`✅ PPI ${parentPPIId} actualizado exitosamente`);
        return true;
      }
      
    } catch (error) {
      console.warn('❌ Error actualizando PPI con información del hijo:', error);
    }
    return false;
  }

  clearPPIChildInfo(elementType, parentPPIId = null) {
    try {
      // Find PPIs that need to have their child info cleared
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
          console.log(`🎯 Limpiando TARGET del PPI ${ppi.elementId}`);
        } else if (elementType === 'PPINOT:Scope') {
          updatedData.scope = null;
          console.log(`🎯 Limpiando SCOPE del PPI ${ppi.elementId}`);
        }
        
        this.updatePPI(ppi.id, updatedData);
      });
      
      console.log(`✅ Limpiada información de ${elementType} de ${affectedPPIs.length} PPIs`);
      return affectedPPIs.length;
      
    } catch (error) {
      console.warn('❌ Error limpiando información de hijo PPI:', error);
      return 0;
    }
  }

  processPendingChildElements() {
    try {
      if (!this.pendingChildData || this.pendingChildData.size === 0) {
        return;
      }
      
      console.log('🔄 Procesando elementos hijos pendientes...');
      
      this.pendingChildData.forEach((data, childId) => {
        console.log(`🔄 Procesando elemento hijo pendiente: ${childId} -> ${data.parentId}`);
        
        // Intentar actualizar el PPI padre con la información del hijo
        this.updatePPIWithChildInfo(data.parentId, childId);
        
        // Marcar como procesado
        this.processedElements.add(childId);
      });
      
      // Limpiar datos pendientes
      this.pendingChildData.clear();
      console.log('✅ Elementos hijos pendientes procesados');
    } catch (e) {
      console.error('Error procesando elementos hijos pendientes:', e);
    }
  }

  // === MEMORY MANAGEMENT ===
  
  cleanupOldData() {
    try {
      // Limpiar elementos procesados antiguos
      const currentTime = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 horas
      
      // Limpiar datos PPINOT muy antiguos (más de 7 días)
      const ppinotData = localStorage.getItem('ppinotElements');
      if (ppinotData) {
        try {
          const data = JSON.parse(ppinotData);
          const dataAge = currentTime - new Date(data.timestamp).getTime();
          if (dataAge > 7 * 24 * 60 * 60 * 1000) { // 7 días
            localStorage.removeItem('ppinotElements');
            console.log('🧹 Datos PPINOT antiguos eliminados');
          }
        } catch (e) {
          // Si hay error al parsear, eliminar datos corruptos
          localStorage.removeItem('ppinotElements');
          console.log('🧹 Datos PPINOT corruptos eliminados');
        }
      }
      
      console.log('🧹 Limpieza de datos completada');
    } catch (e) {
      console.error('Error en limpieza de datos:', e);
    }
  }

  // === AUTO-SAVE MANAGEMENT ===
  
  enableAutoSave() {
    this.autoSaveEnabled = true;
    console.log('💾 Auto-guardado habilitado');
  }

  disableAutoSave() {
    this.autoSaveEnabled = false;
    console.log('💾 Auto-guardado deshabilitado');
  }

  isAutoSaveEnabled() {
    return this.autoSaveEnabled !== false; // Por defecto habilitado
  }

  // === FILTERING & SEARCH ===
  
  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    this.filteredPPIs = this.ppis.filter(ppi => {
      // Search filter
      const matchesSearch = !searchTerm || 
        ppi.title.toLowerCase().includes(searchTerm) ||
        ppi.process.toLowerCase().includes(searchTerm) ||
        ppi.businessObjective.toLowerCase().includes(searchTerm);

      // Type filter
      const matchesType = !typeFilter || ppi.measureDefinition.type === typeFilter;

      // Status filter
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

  // === BPMN INTEGRATION ===
  
  isPPIElement(element) {
    if (!element) return false;
    
    if (element.businessObject && element.businessObject.$type) {
      const type = element.businessObject.$type;
      if (type === 'PPINOT:Ppi' || type.includes('Ppi')) {
        return true;
      }
    }
    
    if (element.type && (element.type === 'PPINOT:Ppi' || element.type.includes('Ppi'))) {
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
      if (window.modeler) {
        const elementRegistry = window.modeler.get('elementRegistry');
        const element = elementRegistry.get(childElementId);
        
        if (element && element.businessObject) {
          const name = element.businessObject.name || '';
          const type = element.businessObject.$type || '';
          
          // Clasificar según el tipo o ID del elemento (case-insensitive)
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
      console.warn('❌ Error extrayendo información del elemento hijo:', error);
    }
    
    return info;
  }

  // === STATISTICS ===
  
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

  // === EXPORT/IMPORT ===
  
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
      console.error('Error exportando PPIs:', error);
      return false;
    }
  }

  // === UTILITIES ===
  
  parseFormData(formData) {
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
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

// Exportar para uso global
window.PPICore = PPICore; 