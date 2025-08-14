// === app.js ===
// MultiModeler - Aplicación principal

import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
import './js/panel-manager.js';
import './js/import-export-manager.js';
import './js/storage-manager.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

// Importar funciones RASCI al inicio para hacerlas disponibles globalmente
import { forceReloadMatrix, renderMatrix, detectRalphRolesFromCanvas } from './js/panels/rasci/core/matrix-manager.js';

// Hacer funciones RASCI disponibles globalmente desde el inicio
window.forceReloadMatrix = forceReloadMatrix;
window.renderMatrix = renderMatrix;
window.detectRalphRolesFromCanvas = detectRalphRolesFromCanvas;

// Funciones RASCI están disponibles desde el import

// Variables globales
window.rasciRoles = [];
window.rasciTasks = [];
window.rasciMatrixData = {};
window.initRasciPanel = initRasciPanel;

// Sistema de bloqueo para evitar condiciones de carrera
window.rasciStateLock = {
  isLocked: false,
  lockTimeout: null,
  lock: function(timeoutMs = 5000) {
    if (this.isLocked) {
      return false;
    }
    this.isLocked = true;
    this.lockTimeout = setTimeout(() => {
      this.unlock();
    }, timeoutMs);
    return true;
  },
  unlock: function() {
    this.isLocked = false;
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
  }
};

// Variables para la navegación entre pantallas
let welcomeScreen = null;
let modelerContainer = null;
let isModelerInitialized = false;

// Funciones de navegación entre pantallas
function showWelcomeScreen() {
  if (welcomeScreen) {
    welcomeScreen.classList.remove('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.remove('show');
  }
}

function showModeler() {
  if (welcomeScreen) {
    welcomeScreen.classList.add('hidden');
  }
  if (modelerContainer) {
    modelerContainer.classList.add('show');
  }
  
  // Inicializar el modelador si no se ha hecho antes
  if (!isModelerInitialized) {
    initializeModelerSystem();
    isModelerInitialized = true;
  }
}

function initializeModelerSystem() {
  const panelContainer = document.getElementById('panel-container');
  if (!panelContainer) return;

  const panelLoader = new PanelLoader();
  window.panelLoader = panelLoader;

  // Inicializar gestor de paneles
  const panelManager = new window.PanelManager();
  window.panelManager = panelManager;
  panelManager.setPanelLoader(panelLoader);

  // Crear paneles iniciales usando el gestor
  panelManager.applyConfiguration();

  // Configurar layout inicial
  panelContainer.classList.add('layout-4');

  // Asegurar que las funciones RASCI estén disponibles globalmente
  setTimeout(() => {
    if (typeof window.forceReloadMatrix !== 'function') {
      window.forceReloadMatrix = function() {
        const rasciPanel = document.querySelector('#rasci-panel');
        if (rasciPanel && typeof window.renderMatrix === 'function') {
          window.renderMatrix(rasciPanel, [], null);
        }
      };
    }
  }, 500);

  setTimeout(() => {
    // El modeler se inicializará automáticamente cuando se aplique la configuración
  }, 300);
}

// Funciones de persistencia eliminadas

function loadBpmnState() {
  if (!modeler) {
    setTimeout(loadBpmnState, 500);
    return;
  }
  createNewDiagram();
}

function validateAndSanitizeWaypoints(waypoints) {
  if (!waypoints || !Array.isArray(waypoints)) return [];
  const valid = waypoints.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  const unique = valid.filter((p, i, arr) => i === 0 || p.x !== arr[i-1].x || p.y !== arr[i-1].y);
  return unique.length >= 2 ? unique : [];
}

let modeler = null;
// const moddle = new BpmnModdle({}); // Not used in current implementation
const container = $('.panel:first-child');
const body = $('body');

function initializeModeler() {
  try {
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      return;
    }
    
    const rect = canvasElement.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      canvasElement.style.width = '100%';
      canvasElement.style.height = '100%';
      canvasElement.style.minHeight = '400px';
    }
    
    if (window.modeler && typeof window.modeler.destroy === 'function') {
      try {
        window.modeler.destroy();
      } catch (e) {
        // Silent error handling
      }
    }
    
    // Esperar un frame para asegurar que el DOM esté listo
    requestAnimationFrame(() => {
      try {
        modeler = new MultiNotationModeler({
          container: '#js-canvas',
          moddleExtensions: {
            PPINOT: PPINOTModdle,
            RALph: RALphModdle
          }
        });
        window.bpmnModeler = modeler;

        const eventBus = modeler.get('eventBus');
        if (eventBus) {
          eventBus.on(['connection.create', 'bendpoint.move.end'], event => {
            const wp = event && event.context && event.context.connection && event.context.connection.waypoints;
            if (wp) event.context.connection.waypoints = validateAndSanitizeWaypoints(wp);
          });
        }
        
        // El modeler está listo
        window.modeler = modeler;
        
        // Inicializar integración con PPI si está disponible
        if (window.ppiManager && window.BpmnIntegration) {
          window.bpmnIntegration = new BpmnIntegration(window.ppiManager, modeler);
        }
      } catch (error) {
        // Silent error handling
      }
    });
  } catch (error) {
    // Silent error handling
  }
}

async function createNewDiagram() {
  try {
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();

    setTimeout(() => {
      if (typeof window.reloadRasciState === 'function') {
        window.reloadRasciState();
      }
    }, 1000);

    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');

    elementRegistry.forEach(element => {
      if (element.type === 'bpmn:StartEvent') {
        modeling.moveShape(element, { x: 100, y: 5 });
        return;
      }
    });

    container.removeClass('with-error').addClass('with-diagram');
    body.addClass('shown');
    updateUI('Nuevo diagrama creado.');
  } catch (err) {
    container.removeClass('with-diagram').addClass('with-error');
    container.find('.error pre').text(err.message);
  }
}

// Función para verificar si el modeler está en buen estado
function isModelerHealthy() {
  if (!window.modeler) return false;
  
  try {
    const canvas = window.modeler.get('canvas');
    const canvasElement = document.getElementById('js-canvas');
    
    return canvas && canvasElement && canvasElement.parentNode;
  } catch (e) {
    return false;
  }
}

// Hacer las funciones globales para que el gestor de paneles pueda acceder a ellas
window.initializeModeler = initializeModeler;
window.createNewDiagram = createNewDiagram;
window.isModelerHealthy = isModelerHealthy;
window.loadBpmnState = loadBpmnState;

// Función de prueba XML para cualquier tipo de elemento
window.testElementXML = function(elementType) {
  if (!modeler) {
    console.error('Modeler no disponible');
    return;
  }
  
  console.log(`🔍 PRUEBA COMPLETA XML ${elementType}`);
  
  return new Promise((resolve, reject) => {
    try {
      // 1. Limpiar diagrama
      modeler.createDiagram().then(() => {
        console.log('✅ Diagrama limpio creado');
        
        // 2. Crear elemento
        const elementFactory = modeler.get('elementFactory');
        const modeling = modeler.get('modeling');
        const canvas = modeler.get('canvas');
        const rootElement = canvas.getRootElement();
        
        const element = elementFactory.createShape({
          type: elementType
        });
        
        modeling.createShape(element, { x: 100, y: 100 }, rootElement);
        console.log(`✅ ${elementType} creado y agregado:`, element.id);
        
        // 3. Exportar XML
        modeler.saveXML({ format: true }).then(result => {
          console.log('✅ XML exportado');
          const elementName = elementType.split(':')[1] || elementType;
          console.log(`🔍 XML contiene ${elementName}:`, result.xml.includes(elementName));
          console.log(`🔍 XML contiene ${elementType}:`, result.xml.includes(elementType));
          
          // Mostrar fragmento del XML con el elemento
          const elementMatch = result.xml.match(new RegExp(`<.*${elementName}.*>`, 'g'));
          if (elementMatch) {
            console.log(`🎯 Elementos ${elementName} en XML:`, elementMatch);
          }
          
          // 4. Importar XML de nuevo
          modeler.importXML(result.xml).then(() => {
            console.log('✅ XML reimportado');
            
            // 5. Verificar si el elemento existe después de importar
            const elementRegistry = modeler.get('elementRegistry');
            const allElements = elementRegistry.getAll();
            
            const elementsAfterImport = allElements.filter(el => 
              el.id.includes(elementName) || 
              (el.type && el.type.includes(elementName)) ||
              (el.businessObject && el.businessObject.$type && el.businessObject.$type.includes(elementName))
            );
            
            console.log(`🔍 Elementos ${elementName} después de importar:`, elementsAfterImport.length);
            elementsAfterImport.forEach(el => {
              console.log(`  ${elementName} found:`, {
                id: el.id,
                type: el.type,
                businessObjectType: el.businessObject ? el.businessObject.$type : 'N/A'
              });
            });
            
            if (elementsAfterImport.length === 0) {
              console.error(`❌ PROBLEMA: ${elementName} se perdió durante importación XML`);
            } else {
              console.log(`✅ SUCCESS: ${elementName} sobrevivió el ciclo XML`);
            }
            
            resolve({
              elementType: elementType,
              created: element,
              xml: result.xml,
              afterImport: elementsAfterImport
            });
          }).catch(err => {
            console.error('❌ Error en importación XML:', err);
            reject(err);
          });
        }).catch(err => {
          console.error('❌ Error en exportación XML:', err);
          reject(err);
        });
      });
    } catch (e) {
      console.error(`❌ Error en test${elementType}XML:`, e);
      reject(e);
    }
  });
};

// Funciones específicas de prueba
window.testTargetXML = () => window.testElementXML('PPINOT:Target');
window.testScopeXML = () => window.testElementXML('PPINOT:Scope');
window.testPpiXML = () => window.testElementXML('PPINOT:Ppi');

// Funciones de prueba para elementos RALph (shapes)
window.testPersonXML = () => window.testElementXML('RALph:Person');
window.testRoleRALphXML = () => window.testElementXML('RALph:RoleRALph');
window.testOrgunitXML = () => window.testElementXML('RALph:Orgunit');
window.testPositionXML = () => window.testElementXML('RALph:Position');

// Función de prueba XML para conexiones (connections en lugar de shapes)
window.testConnectionXML = function(connectionType) {
  if (!modeler) {
    console.error('Modeler no disponible');
    return;
  }
  
  console.log(`🔍 PRUEBA COMPLETA XML CONEXIÓN ${connectionType}`);
  
  return new Promise((resolve, reject) => {
    try {
      // 1. Limpiar diagrama
      modeler.createDiagram().then(() => {
        console.log('✅ Diagrama limpio creado');
        
        // 2. Crear dos elementos para conectar
        const elementFactory = modeler.get('elementFactory');
        const modeling = modeler.get('modeling');
        const canvas = modeler.get('canvas');
        const rootElement = canvas.getRootElement();
        
        // Crear elemento fuente
        const sourceElement = elementFactory.createShape({
          type: 'RALph:Person'
        });
        modeling.createShape(sourceElement, { x: 100, y: 100 }, rootElement);
        
        // Crear elemento destino
        const targetElement = elementFactory.createShape({
          type: 'RALph:Person'
        });
        modeling.createShape(targetElement, { x: 300, y: 100 }, rootElement);
        
        console.log('✅ Elementos fuente y destino creados');
        
        // 3. Crear la conexión
        const connection = elementFactory.createConnection({
          type: connectionType,
          source: sourceElement,
          target: targetElement,
          waypoints: [
            { x: sourceElement.x + sourceElement.width / 2, y: sourceElement.y + sourceElement.height / 2 },
            { x: targetElement.x + targetElement.width / 2, y: targetElement.y + targetElement.height / 2 }
          ]
        });
        
        modeling.createConnection(sourceElement, targetElement, connection, rootElement);
        console.log(`✅ ${connectionType} creado:`, connection.id);
        
        // 4. Exportar XML
        modeler.saveXML({ format: true }).then(result => {
          console.log('✅ XML exportado');
          const connectionName = connectionType.split(':')[1] || connectionType;
          console.log(`🔍 XML contiene ${connectionName}:`, result.xml.includes(connectionName));
          console.log(`🔍 XML contiene ${connectionType}:`, result.xml.includes(connectionType));
          
          // Mostrar fragmento del XML con la conexión
          const connectionMatch = result.xml.match(new RegExp(`<.*${connectionName}.*>`, 'g'));
          if (connectionMatch) {
            console.log(`🎯 Conexiones ${connectionName} en XML:`, connectionMatch);
          }
          
          // 5. Importar XML de nuevo
          modeler.importXML(result.xml).then(() => {
            console.log('✅ XML reimportado');
            
            // 6. Verificar si la conexión existe después de importar
            const elementRegistry = modeler.get('elementRegistry');
            const allElements = elementRegistry.getAll();
            
            const connectionsAfterImport = allElements.filter(el => 
              el.id.includes(connectionName) || 
              (el.type && el.type.includes(connectionName)) ||
              (el.businessObject && el.businessObject.$type && el.businessObject.$type.includes(connectionName))
            );
            
            console.log(`🔍 Conexiones ${connectionName} después de importar:`, connectionsAfterImport.length);
            connectionsAfterImport.forEach(el => {
              console.log(`  ${connectionName} encontrada:`, {
                id: el.id,
                type: el.type,
                businessObjectType: el.businessObject ? el.businessObject.$type : 'N/A',
                source: el.source ? el.source.id : 'N/A',
                target: el.target ? el.target.id : 'N/A'
              });
            });
            
            if (connectionsAfterImport.length === 0) {
              console.error(`❌ PROBLEMA: ${connectionName} se perdió durante importación XML`);
            } else {
              console.log(`✅ SUCCESS: ${connectionName} sobrevivió el ciclo XML`);
            }
            
            resolve({
              connectionType: connectionType,
              created: connection,
              xml: result.xml,
              afterImport: connectionsAfterImport
            });
          }).catch(err => {
            console.error('❌ Error en importación XML:', err);
            reject(err);
          });
        }).catch(err => {
          console.error('❌ Error en exportación XML:', err);
          reject(err);
        });
      });
    } catch (e) {
      console.error(`❌ Error en test${connectionType}XML:`, e);
      reject(e);
    }
  });
};

// Funciones de prueba para conexiones RALph
window.testReportsDirectlyXML = () => window.testConnectionXML('RALph:reportsDirectly');
window.testReportsTransitivelyXML = () => window.testConnectionXML('RALph:reportsTransitively');
window.testDelegatesDirectlyXML = () => window.testConnectionXML('RALph:delegatesDirectly');
window.testDelegatesTransitivelyXML = () => window.testConnectionXML('RALph:delegatesTransitively');
window.testReportsToXML = () => window.testConnectionXML('RALph:reportsTo');

// Función para crear elementos SIN borrar el diagrama existente
window.addElementToCurrentDiagram = function(elementType) {
  if (!modeler) {
    console.error('Modeler no disponible');
    return;
  }
  
  console.log(`➕ AÑADIENDO ${elementType} al diagrama actual`);
  
  try {
    const elementFactory = modeler.get('elementFactory');
    const modeling = modeler.get('modeling');
    const canvas = modeler.get('canvas');
    const rootElement = canvas.getRootElement();
    
    // Crear elemento sin limpiar el diagrama
    const element = elementFactory.createShape({
      type: elementType
    });
    
    // Posicionar en diferentes ubicaciones para evitar solapamiento
    const elementRegistry = modeler.get('elementRegistry');
    const existingElements = elementRegistry.getAll().filter(el => el.parent === rootElement);
    const yPosition = 100 + (existingElements.length * 80);
    
    modeling.createShape(element, { x: 100, y: yPosition }, rootElement);
    console.log(`✅ ${elementType} añadido:`, element.id);
    
    // Guardar automáticamente
    setTimeout(() => {
      saveBpmnState();
      console.log(`💾 Diagrama guardado con ${elementType}`);
    }, 500);
    
    return element;
  } catch (e) {
    console.error(`❌ Error añadiendo ${elementType}:`, e);
    return null;
  }
};

// Funciones específicas para añadir elementos
window.addTarget = () => window.addElementToCurrentDiagram('PPINOT:Target');
window.addScope = () => window.addElementToCurrentDiagram('PPINOT:Scope');
window.addPpi = () => window.addElementToCurrentDiagram('PPINOT:Ppi');

// Función para crear un diagrama completo con Target, Scope y Ppi
window.createCompleteDiagram = function() {
  console.log('🎯 Creando diagrama completo con Target, Scope y Ppi');
  
  // Crear un nuevo diagrama limpio
  modeler.createDiagram().then(() => {
    console.log('✅ Diagrama limpio creado');
    
    // Añadir elementos uno por uno
    setTimeout(() => {
      const target = window.addElementToCurrentDiagram('PPINOT:Target');
      console.log('Target añadido:', target ? target.id : 'error');
      
      setTimeout(() => {
        const scope = window.addElementToCurrentDiagram('PPINOT:Scope');
        console.log('Scope añadido:', scope ? scope.id : 'error');
        
        setTimeout(() => {
          const ppi = window.addElementToCurrentDiagram('PPINOT:Ppi');
          console.log('Ppi añadido:', ppi ? ppi.id : 'error');
          
          setTimeout(() => {
            saveBpmnState();
            console.log('🎉 ¡Diagrama completo creado y guardado!');
          }, 500);
        }, 300);
      }, 300);
    }, 300);
  });
};

// Función para crear diagrama con relaciones padre-hijo
window.createDiagramWithParentChild = function() {
  
  
  modeler.createDiagram().then(() => {
    console.log('✅ Diagrama limpio creado');
    
    const elementFactory = modeler.get('elementFactory');
    const modeling = modeler.get('modeling');
    const canvas = modeler.get('canvas');
    const rootElement = canvas.getRootElement();
    
    // 1. Crear PPI primero (padre)
    const ppiElement = elementFactory.createShape({
      type: 'PPINOT:Ppi'
    });
    
    modeling.createShape(ppiElement, { x: 200, y: 200 }, rootElement);
    console.log('✅ PPI creado:', ppiElement.id);
    
    setTimeout(() => {
      // 2. Crear Target como hijo de PPI
      const targetElement = elementFactory.createShape({
        type: 'PPINOT:Target'
      });
      
      modeling.createShape(targetElement, { x: 50, y: 50 }, ppiElement);
      console.log('✅ Target creado como hijo de PPI:', targetElement.id);
      
      setTimeout(() => {
        // 3. Crear Scope como hijo de PPI
        const scopeElement = elementFactory.createShape({
          type: 'PPINOT:Scope'
        });
        
        modeling.createShape(scopeElement, { x: 150, y: 50 }, ppiElement);
        console.log('✅ Scope creado como hijo de PPI:', scopeElement.id);
        
        setTimeout(() => {
          saveBpmnState();
          console.log('🎉 ¡Diagrama con relaciones padre-hijo creado y guardado!');
          
          // Mostrar estado actual
          setTimeout(() => {
            const elementRegistry = modeler.get('elementRegistry');
            const allElements = elementRegistry.getAll();
            console.log('📊 Verificación de relaciones:');
            allElements.forEach(el => {
              if (el.parent && el.parent.id !== '__implicitroot') {
                console.log(`  - ${el.id} (${el.type}) -> padre: ${el.parent.id} (${el.parent.type})`);
              }
            });
          }, 500);
        }, 500);
      }, 300);
    }, 300);
  });
};

// Función para probar restauración automática
window.testAutoRestore = function() {
  console.log('🧪 PRUEBA DE RESTAURACIÓN AUTOMÁTICA');
  
  // 1. Crear diagrama con relaciones
  window.createDiagramWithParentChild();
  
  // 2. Esperar un momento y luego simular recarga
  setTimeout(() => {
    console.log('⏳ Esperando 3 segundos antes de simular recarga...');
    
    setTimeout(() => {
      console.log('🔄 Simulando recarga del diagrama...');
      
      // Simular recarga cargando el estado guardado
      window.loadBpmnState();
      
      // Verificar resultado después de un momento
      setTimeout(() => {
        console.log('🔍 Verificando resultado de restauración automática...');
        
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        console.log('📊 Estado después de restauración automática:');
        allElements.forEach(el => {
          if (el.parent && el.parent.id !== '__implicitroot') {
            console.log(`✅ Relación encontrada: ${el.id} (${el.type}) -> padre: ${el.parent.id} (${el.parent.type})`);
          }
        });
        
        // Contar relaciones exitosas
        const successfulRelations = allElements.filter(el => 
          el.parent && 
          el.parent.id !== '__implicitroot' && 
          (el.type.includes('PPINOT') || el.type.includes('RALph'))
        );
        
        if (successfulRelations.length > 0) {
          console.log('🎉 ¡Restauración automática EXITOSA!');
        } else {
          console.log('❌ Restauración automática FALLÓ');
        }
      }, 5000);
    }, 3000);
  }, 2000);
};

// Función para limpiar relaciones huérfanas (donde faltan elementos)
window.cleanOrphanedRelations = function() {
  console.log('🧹 Limpiando relaciones huérfanas...');
  
  const savedRelations = localStorage.getItem('bpmnParentChildRelations');
  if (!savedRelations) {
    console.log('ℹ️ No hay relaciones guardadas');
    return;
  }
  
  if (!modeler) {
    console.log('❌ Modeler no disponible');
    return;
  }
  
  try {
    const relations = JSON.parse(savedRelations);
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    const existingIds = allElements.map(el => el.id);
    
    console.log('📋 Relaciones originales:', Object.keys(relations).length);
    console.log('📋 Elementos existentes:', existingIds.length);
    
    // Filtrar solo relaciones válidas
    const validRelations = {};
    const orphanedRelations = {};
    
    Object.entries(relations).forEach(([childId, relation]) => {
      const childExists = existingIds.includes(childId);
      const parentExists = existingIds.includes(relation.parentId);
      
      if (childExists && parentExists) {
        validRelations[childId] = relation;
      } else {
        orphanedRelations[childId] = relation;
        console.log(`🗑️ Relación huérfana: ${childId} -> ${relation.parentId} (child: ${childExists}, parent: ${parentExists})`);
      }
    });
    
    console.log('✅ Relaciones válidas:', Object.keys(validRelations).length);
    console.log('🗑️ Relaciones huérfanas:', Object.keys(orphanedRelations).length);
    
    // Guardar solo las relaciones válidas
    if (Object.keys(validRelations).length > 0) {
      localStorage.setItem('bpmnParentChildRelations', JSON.stringify(validRelations));
      console.log('💾 Relaciones limpias guardadas');
    } else {
      localStorage.removeItem('bpmnParentChildRelations');
      console.log('🧹 Todas las relaciones eran huérfanas, storage limpiado');
    }
    
    return {
      original: Object.keys(relations).length,
      valid: Object.keys(validRelations).length,
      orphaned: Object.keys(orphanedRelations).length,
      validRelations,
      orphanedRelations
    };
  } catch (e) {
    console.error('❌ Error limpiando relaciones:', e);
    return null;
  }
};

// Función para diagnosticar diferencia entre loadBpmnState y testElementXML
window.debugLoadVsTest = function() {
  console.log('🔍 DIAGNÓSTICO: Comparando loadBpmnState vs testElementXML');
  
  // 1. Guardar estado actual
  const currentXML = localStorage.getItem('bpmnDiagram');
  const currentRelations = localStorage.getItem('bpmnParentChildRelations');
  
  if (!currentXML) {
    console.log('❌ No hay XML guardado en localStorage');
    return;
  }
  
  console.log('📄 XML guardado contiene:');
  console.log('  - Target:', currentXML.includes('Target'));
  console.log('  - Scope:', currentXML.includes('Scope'));
  console.log('  - Ppi:', currentXML.includes('Ppi'));
  console.log('  - PPINOT namespace:', currentXML.includes('xmlns:PPINOT=') || currentXML.includes('xmlns:ppinot='));
  console.log('  - RALph namespace:', currentXML.includes('xmlns:RALph=') || currentXML.includes('xmlns:ralph='));
  
  // Mostrar relaciones guardadas
  if (currentRelations) {
    try {
      const relations = JSON.parse(currentRelations);
      
      Object.entries(relations).forEach(([childId, relation]) => {
        console.log(`  - ${childId} (${relation.childType}) -> ${relation.parentId} (${relation.parentType})`);
      });
    } catch (e) {
      console.error('❌ Error parseando relaciones:', e);
    }
  }
  
  // Mostrar fragmento del XML para ver la estructura
  console.log('\n📋 FRAGMENTO XML guardado:');
  const lines = currentXML.split('\n');
  lines.forEach((line, i) => {
    if (line.includes('Scope') || line.includes('Target') || line.includes('Ppi') || line.includes('PPINOT') || line.includes('xmlns')) {
      console.log(`${i+1}: ${line.trim()}`);
    }
  });
  
  // 2. Probar importación directa (como en loadBpmnState)
  console.log('\n🧪 PRUEBA 1: Importación directa (método loadBpmnState)');
  modeler.importXML(currentXML).then(() => {
    const elementRegistry = modeler.get('elementRegistry');
    const allElements = elementRegistry.getAll();
    
    console.log('📊 RESULTADO importación directa:');
    console.log('  - Total elementos:', allElements.length);
    
    // Mostrar TODOS los elementos para diagnóstico
    console.log('\n🔍 TODOS los elementos importados:');
    allElements.forEach(el => {
      console.log(`  - ${el.id}: ${el.type} (businessObject: ${el.businessObject ? el.businessObject.$type : 'N/A'})`);
    });
    
    const ppinotElements = allElements.filter(el => {
      return (el.type && (el.type.includes('PPINOT') || el.type.includes('RALph'))) ||
             (el.businessObject && el.businessObject.$type && 
              (el.businessObject.$type.includes('PPINOT') || el.businessObject.$type.includes('RALph')));
    });
    
    console.log('\n📊 Elementos PPINOT/RALph encontrados:', ppinotElements.length);
    console.log('  - Target:', ppinotElements.filter(el => el.type && el.type.includes('Target')).length);
    console.log('  - Scope:', ppinotElements.filter(el => el.type && el.type.includes('Scope')).length);
    console.log('  - Ppi:', ppinotElements.filter(el => el.type && el.type.includes('Ppi')).length);
    
    // Diagnóstico detallado de elementos específicos
    ppinotElements.forEach(el => {
      console.log(`🔍 Elemento PPINOT/RALph: ${el.id}`);
      console.log(`  - Tipo: ${el.type}`);
      console.log(`  - BusinessObject tipo: ${el.businessObject ? el.businessObject.$type : 'N/A'}`);
      console.log(`  - Padre: ${el.parent ? el.parent.id : 'N/A'} (${el.parent ? el.parent.type : 'N/A'})`);
      console.log(`  - Posición: x=${el.x}, y=${el.y}`);
    });
    
    // Verificar qué relaciones se pueden restaurar
    if (currentRelations) {
      try {
        const relations = JSON.parse(currentRelations);
        const existingIds = allElements.map(el => el.id);
        
        console.log('\n🔍 ANÁLISIS DE RELACIONES:');
        Object.entries(relations).forEach(([childId, relation]) => {
          const childExists = existingIds.includes(childId);
          const parentExists = existingIds.includes(relation.parentId);
          const status = childExists && parentExists ? '✅' : '❌';
          
          console.log(`${status} ${childId} -> ${relation.parentId}`);
          console.log(`    Hijo existe: ${childExists ? '✅' : '❌'}`);
          console.log(`    Padre existe: ${parentExists ? '✅' : '❌'}`);
        });
      } catch (e) {
        console.error('❌ Error analizando relaciones:', e);
      }
    }
    
    // 3. Ahora hacer la prueba testElementXML para comparar
    console.log('\n🧪 PRUEBA 2: Creación + exportación + importación (método testElementXML)');
    console.log('Ejecuta manualmente: testTargetXML() y testScopeXML() para comparar');
    
  }).catch(err => {
    console.error('❌ Error en importación directa:', err);
  });
};

function updateUI(message = '') {
  if (message) $('.status-item:first-child span').text(message);
  $('.status-item:nth-child(2) span').text('Modo: Edición');
}

// Funciones para manejo de archivos
async function handleNewDiagram() {
  console.log('🆕 Creando nuevo diagrama...');
  
  try {
    // Usar StorageManager para reset completo
    if (window.storageManager) {
      const success = await window.storageManager.resetStorage();
      if (success) {
        console.log('✅ Reset completo exitoso');
      } else {
        console.error('❌ Error en reset completo');
        // Fallback: limpieza básica
        if (window.storageManager) {
          await window.storageManager.clearStorage();
        }
      }
    } else {
      console.warn('⚠️ StorageManager no disponible, usando limpieza manual');
      // Fallback: limpieza manual
      const keysToKeep = ['userPreferences', 'theme', 'globalSettings'];
      const keysToRemove = [];
      
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (!keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }
      
      keysToRemove.forEach(key => {
        console.log(`🗑️ Eliminando: ${key}`);
        localStorage.removeItem(key);
      });
      
      // Limpiar variables globales
      if (window.rasciRoles) window.rasciRoles = [];
      if (window.rasciTasks) window.rasciTasks = [];
      if (window.rasciMatrixData) window.rasciMatrixData = {};
    }
    
    // Forzar recarga de datos de paneles después de limpiar
    if (window.storageManager && typeof window.storageManager.forcePanelDataReload === 'function') {
      await window.storageManager.forcePanelDataReload();
    }
    
    showModeler();
    // Actualizar la UI si se regresa a la pantalla de bienvenida
    checkSavedDiagram();
    // El modeler se inicializará automáticamente
    
  } catch (error) {
    console.error('❌ Error en handleNewDiagram:', error);
    // Continuar con el flujo normal incluso si hay error
    showModeler();
    checkSavedDiagram();
  }
}

function handleContinueDiagram() {
  showModeler();
  // El diagrama guardado se cargará automáticamente cuando se inicialice el modeler
  
  // RECARGAS AUTOMÁTICAS DESHABILITADAS TEMPORALMENTE PARA EVITAR BUCLE
  console.log('ℹ️ Recarga automática RASCI en handleContinueDiagram deshabilitada - usar botón manual');
  
  /*
  // ASEGURAR que se recarga el estado RASCI después de mostrar el modelador
  setTimeout(() => {
    if (typeof window.ensureRasciMatrixLoaded === 'function') {
      console.log('🔄 Usando función robusta para recargar RASCI después de continuar diagrama...');
      window.ensureRasciMatrixLoaded();
    } else if (typeof window.reloadRasciState === 'function') {
      console.log('🔄 Recargando estado RASCI después de continuar diagrama...');
      window.reloadRasciState();
    }
  }, 1500); // Un poco más de delay para asegurar que el modeler esté listo
  */
}

async function handleOpenWithConfirmation() {
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal-content">
      <h3 class="modal-title">Abrir Nuevo Proyecto</h3>
      <p class="modal-message">¿Estás seguro de que quieres abrir un nuevo proyecto?<br><br>Esto sobrescribirá todos los datos actuales y se perderá el trabajo no guardado.</p>
      <div class="modal-actions">
        <button class="modal-btn" id="cancel-open">Cancelar</button>
        <button class="modal-btn danger" id="confirm-open">Abrir</button>
      </div>
    </div>
  `;

  document.body.appendChild(modal);

  function closeModal() {
    if (modal.parentNode) {
      modal.parentNode.removeChild(modal);
    }
  }

  function confirmOpen() {
    if (window.importExportManager) {
      window.importExportManager.importProject();
    } else {
      handleOpenDiagram();
    }
    closeModal();
  }

  modal.querySelector('#cancel-open').addEventListener('click', closeModal);
  modal.querySelector('#confirm-open').addEventListener('click', confirmOpen);

  document.addEventListener('keydown', function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  });

  modal.addEventListener('click', function handleOutsideClick(e) {
    if (e.target === modal) {
      closeModal();
      modal.removeEventListener('click', handleOutsideClick);
    }
  });
}

async function handleOpenDiagram() {
  try {
    // NOTA: NO limpiar la marca de importación aquí ya que el usuario puede importar un proyecto
    // La marca se configurará apropiadamente en handleFileSelect según el tipo de archivo
    
    if (window.storageManager) {
      await window.storageManager.prepareForImport();
      // Forzar recarga de datos de paneles después de limpiar
      if (typeof window.storageManager.forcePanelDataReload === 'function') {
        await window.storageManager.forcePanelDataReload();
      }
    } else {
      if (window.importExportManager && window.importExportManager.clearAllProjectData) {
        window.importExportManager.clearAllProjectData();
      }
    }
    
    showModeler();
    
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.click();
    }
    
  } catch (error) {
    console.error('❌ Error en handleOpenDiagram:', error);
    const fileInput = document.getElementById('file-input');
    if (fileInput) {
      fileInput.click();
    }
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    console.log('📁 Archivo seleccionado:', file.name, 'Tipo:', file.type);
    
    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      
      // Detectar tipo de archivo basado en extensión y contenido
      const isProjectFile = file.name.endsWith('.mmproject') || 
                           file.name.endsWith('.json') ||
                           content.trim().startsWith('{');
      
      if (isProjectFile) {
        // ESTABLECER MARCA ANTES DE IMPORTAR PROYECTO
        window.isImportingProject = true;
        console.log('📦 Archivo de proyecto detectado, importando proyecto completo...');
        handleProjectImport(content);
      } else {
        // LIMPIAR MARCA PARA ARCHIVOS BPMN REGULARES
        window.isImportingProject = false;
        console.log('📄 Archivo BPMN detectado, importando diagrama...');
        handleBpmnImport(content);
      }
    };
    reader.readAsText(file);
  }
  
  // Limpiar el input para permitir reseleccionar el mismo archivo
  event.target.value = '';
}

function handleBpmnImport(content) {
  console.log('📁 Archivo BPMN leído, guardando en localStorage...');
  localStorage.setItem('bpmnDiagram', content);
  localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
  console.log('✅ Diagrama BPMN guardado en localStorage');
  
  showModeler();
  checkSavedDiagram();
  
  // Cargar el diagrama después de que el modeler esté inicializado
  const loadDiagramWithRetry = (attempts = 0, maxAttempts = 15) => {
    console.log(`🔄 Intento ${attempts + 1} de cargar diagrama BPMN...`);
    
    if (window.modeler && typeof window.loadBpmnState === 'function') {
      console.log('✅ Modeler listo, cargando diagrama BPMN...');
      window.loadBpmnState();
      
      // Si se está importando un proyecto, forzar recarga de la matriz RASCI
      if (window.isImportingProject === true) {
        setTimeout(() => {
          if (typeof window.forceReloadMatrix === 'function') {
            console.log('🔄 Forzando recarga de matriz RASCI después de importación...');
            window.forceReloadMatrix();
          }
        }, 1500);
        
        // Segunda recarga después de más tiempo para asegurar que se cargan los datos
        setTimeout(() => {
          if (typeof window.forceReloadMatrix === 'function') {
            console.log('🔄 Segunda recarga de matriz RASCI para asegurar datos...');
            window.forceReloadMatrix();
          }
        }, 3000);
      }
      
      // Ejecutar diagnóstico después de cargar
      setTimeout(() => {
        if (typeof window.debugDiagramLoading === 'function') {
          window.debugDiagramLoading();
        }
      }, 2000);
    } else if (attempts < maxAttempts) {
      console.log('⏳ Modeler no listo, reintentando en 500ms...');
      setTimeout(() => loadDiagramWithRetry(attempts + 1, maxAttempts), 500);
    } else {
      console.error('❌ No se pudo cargar el diagrama después de múltiples intentos');
      
      // Limpiar la marca de importación si falla
      if (window.isImportingProject === true) {
        window.isImportingProject = false;
        console.log('⚠️ Limpiando marca de importación debido a fallo en carga');
      }
    }
  };
  
  // Iniciar el proceso de carga con reintentos
  setTimeout(() => loadDiagramWithRetry(), 500);
}

function handleProjectImport(content) {
  try {
    // La marca isImportingProject ya está establecida en handleFileSelect
    console.log('📦 Iniciando importación de proyecto...');
    
    const projectData = JSON.parse(content);
    const projectName = projectData.metadata && projectData.metadata.name ? projectData.metadata.name : 'Sin nombre';
    console.log('📦 Proyecto importado:', projectName);
    
    // Buscar el diagrama BPMN en diferentes ubicaciones posibles
    let bpmnDiagram = null;
    
    // 1. Buscar en la ubicación estándar
    if (projectData.bpmnDiagram) {
      bpmnDiagram = projectData.bpmnDiagram;
      console.log('✅ Diagrama BPMN encontrado en bpmnDiagram');
    }
    // 2. Buscar en panels.bpmn.diagram (estructura actual)
    else if (projectData.panels && projectData.panels.bpmn && projectData.panels.bpmn.diagram) {
      bpmnDiagram = projectData.panels.bpmn.diagram;
      console.log('✅ Diagrama BPMN encontrado en panels.bpmn.diagram');
      console.log('📄 Diagrama completo extraído del proyecto:');
      console.log(bpmnDiagram);
    }
    // 3. Buscar en cualquier otra ubicación posible
    else if (projectData.diagram) {
      bpmnDiagram = projectData.diagram;
      console.log('✅ Diagrama BPMN encontrado en diagram');
    }
    
    if (bpmnDiagram) {
      console.log('📄 Longitud del diagrama BPMN:', bpmnDiagram.length);
      console.log('📄 Primeras 100 caracteres del diagrama:', bpmnDiagram.substring(0, 100));
      
      // Importar datos adicionales del proyecto si están disponibles
      if (projectData.panels) {
        console.log('📦 Importando datos adicionales del proyecto...');
        
        // Importar datos RASCI
        if (projectData.panels.rasci) {
          console.log('📊 Importando datos RASCI...');
          if (projectData.panels.rasci.roles) {
            localStorage.setItem('rasciRoles', JSON.stringify(projectData.panels.rasci.roles));
            console.log('✅ Roles RASCI importados:', projectData.panels.rasci.roles);
          }
          if (projectData.panels.rasci.matrix) {
            localStorage.setItem('rasciMatrixData', JSON.stringify(projectData.panels.rasci.matrix));
            console.log('✅ Matriz RASCI importada:', projectData.panels.rasci.matrix);
          }
          if (projectData.panels.rasci.tasks) {
            localStorage.setItem('rasciTasks', JSON.stringify(projectData.panels.rasci.tasks));
            console.log('✅ Tareas RASCI importadas:', projectData.panels.rasci.tasks);
          }
        }
        
        // Importar datos PPI
        if (projectData.panels.ppi) {
          console.log('📊 Importando datos PPI...');
          if (projectData.panels.ppi.indicators) {
            localStorage.setItem('ppiIndicators', JSON.stringify(projectData.panels.ppi.indicators));
          }
          if (projectData.panels.ppi.relationships) {
            localStorage.setItem('ppiRelationships', JSON.stringify(projectData.panels.ppi.relationships));
          }
        }
        
        // Importar datos BPMN adicionales (relaciones de parentesco, etc.)
        if (projectData.panels.bpmn) {
          console.log('📊 Importando datos BPMN adicionales...');
          if (projectData.panels.bpmn.relationships) {
            if (projectData.panels.bpmn.relationships.parentChild) {
              localStorage.setItem('bpmnParentChildRelations', JSON.stringify(projectData.panels.bpmn.relationships.parentChild));
              console.log('✅ Relaciones padre-hijo importadas');
            }
            if (projectData.panels.bpmn.relationships.ppinot) {
              localStorage.setItem('bpmnPPINOTRelations', JSON.stringify(projectData.panels.bpmn.relationships.ppinot));
              console.log('✅ Relaciones PPINOT importadas');
            }
          }
          if (projectData.panels.bpmn.elements) {
            if (projectData.panels.bpmn.elements.ppinot) {
              localStorage.setItem('bpmnPPINOTElements', JSON.stringify(projectData.panels.bpmn.elements.ppinot));
              console.log('✅ Elementos PPINOT importados');
            }
            if (projectData.panels.bpmn.elements.ralph) {
              localStorage.setItem('bpmnRALPHElements', JSON.stringify(projectData.panels.bpmn.elements.ralph));
              console.log('✅ Elementos RALPH importados');
            }
          }
          if (projectData.panels.bpmn.canvas) {
            localStorage.setItem('bpmnCanvasState', JSON.stringify(projectData.panels.bpmn.canvas));
            console.log('✅ Estado del canvas importado');
          }
        }
        
        // Importar configuración de paneles
        if (projectData.panels.configuration) {
          console.log('📊 Importando configuración de paneles...');
          if (projectData.panels.configuration.activePanels) {
            localStorage.setItem('activePanels', JSON.stringify(projectData.panels.configuration.activePanels));
          }
          if (projectData.panels.configuration.layout) {
            localStorage.setItem('panelLayout', projectData.panels.configuration.layout);
          }
        }
      }
      
      // Para proyectos, guardar el diagrama directamente sin pasar por handleBpmnImport
      // para evitar conflictos con la inicialización del panel manager
      console.log('📁 Guardando diagrama BPMN del proyecto en localStorage...');
      localStorage.setItem('bpmnDiagram', bpmnDiagram);
      localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
      console.log('✅ Diagrama BPMN guardado en localStorage');
      
      // Mostrar el modeler si no está visible
      showModeler();
      
      // Cargar el diagrama después de que el modeler esté inicializado
      const loadDiagramWithRetry = (attempts = 0, maxAttempts = 15) => {
        console.log(`🔄 Intento ${attempts + 1} de cargar diagrama BPMN...`);
        
        if (window.modeler && typeof window.loadBpmnState === 'function') {
          console.log('✅ Modeler listo, cargando diagrama BPMN...');
          window.loadBpmnState();
          
          // Forzar recarga de la matriz RASCI después de la importación
          setTimeout(() => {
            console.log('🔄 Forzando recarga de matriz RASCI después de importación...');
            if (typeof window.forceReloadMatrix === 'function') {
              window.forceReloadMatrix();
            }
          }, 100);
          
          // Segunda recarga para asegurar que los datos se mantienen
          setTimeout(() => {
            console.log('🔄 Segunda recarga de matriz RASCI para asegurar datos...');
            if (typeof window.forceReloadMatrix === 'function') {
              window.forceReloadMatrix();
            }
          }, 300);
          
        } else if (attempts < maxAttempts) {
          console.log('⏳ Modeler no listo, reintentando en 500ms...');
          setTimeout(() => loadDiagramWithRetry(attempts + 1, maxAttempts), 500);
        } else {
          console.error('❌ No se pudo cargar el diagrama después de múltiples intentos');
        }
      };
      
      // Pequeña pausa para asegurar que los datos se guardan antes de cargar el diagrama
      setTimeout(() => {
        loadDiagramWithRetry();
      }, 200);
      
    } else {
      console.error('❌ No se encontró diagrama BPMN en el proyecto');
      console.log('📊 Estructura del proyecto:', Object.keys(projectData));
      if (projectData.panels) {
        console.log('📊 Paneles disponibles:', Object.keys(projectData.panels));
      }
      alert('El archivo de proyecto no contiene un diagrama BPMN válido');
      
      // Limpiar la marca de importación en caso de error
      window.isImportingProject = false;
    }
    
    // Limpiar la marca de importación después de completar
    setTimeout(() => {
      window.isImportingProject = false;
      console.log('✅ Marca de importación limpiada');
    }, 3000);
    
  } catch (error) {
    console.error('❌ Error al parsear archivo de proyecto:', error);
    alert('Error al leer el archivo de proyecto');
    
    // Limpiar la marca de importación en caso de error
    window.isImportingProject = false;
  }
}

// Función para verificar si hay un diagrama guardado y actualizar la UI
function checkSavedDiagram() {
  const savedDiagram = localStorage.getItem('bpmnDiagram');
  const savedTimestamp = localStorage.getItem('bpmnDiagramTimestamp');
  const continueBtn = document.getElementById('continue-diagram-btn');
  const newBtn = document.getElementById('new-diagram-btn');
  const savedInfo = document.getElementById('saved-diagram-info');
  const savedDate = document.getElementById('saved-diagram-date');
  
  if (savedDiagram && savedDiagram.trim().length > 0) {
    // Hay un diagrama guardado, mostrar botón de continuar e información
    if (continueBtn) {
      continueBtn.classList.remove('hidden');
    }
    if (savedInfo) {
      savedInfo.classList.remove('hidden');
    }
    
    // Mostrar fecha de última modificación si está disponible
    if (savedDate && savedTimestamp) {
      const date = new Date(parseInt(savedTimestamp));
      const now = new Date();
      const diffMs = now - date;
      const diffMins = Math.floor(diffMs / (1000 * 60));
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      
      let timeText = '';
      if (diffMins < 1) {
        timeText = 'Hace menos de un minuto';
      } else if (diffMins < 60) {
        timeText = `Hace ${diffMins} minuto${diffMins > 1 ? 's' : ''}`;
      } else if (diffHours < 24) {
        timeText = `Hace ${diffHours} hora${diffHours > 1 ? 's' : ''}`;
      } else if (diffDays < 7) {
        timeText = `Hace ${diffDays} día${diffDays > 1 ? 's' : ''}`;
      } else {
        timeText = date.toLocaleDateString('es-ES', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      
      savedDate.textContent = `Última modificación: ${timeText}`;
    } else if (savedDate) {
      savedDate.textContent = 'Diagrama disponible';
    }
    
    // Cambiar el botón "Nuevo" a secundario
    if (newBtn) {
      newBtn.classList.remove('primary');
      newBtn.classList.add('secondary');
    }
  } else {
    // No hay diagrama guardado, ocultar botón de continuar e información
    if (continueBtn) {
      continueBtn.classList.add('hidden');
    }
    if (savedInfo) {
      savedInfo.classList.add('hidden');
    }
    // Mantener el botón "Nuevo" como primario
    if (newBtn) {
      newBtn.classList.add('primary');
      newBtn.classList.remove('secondary');
    }
  }
}

// Función de utilidad para verificar el estado de importación
function checkImportStatus() {
  const status = {
    isImporting: window.isImportingProject === true,
    storageCleared: window.storageCleared === true,
    hasRasciRoles: localStorage.getItem('rasciRoles') !== null,
    hasRasciMatrix: localStorage.getItem('rasciMatrixData') !== null,
    rasciRoles: localStorage.getItem('rasciRoles'),
    rasciMatrix: localStorage.getItem('rasciMatrixData'),
    modelerReady: window.modeler !== undefined,
    forceReloadMatrixAvailable: typeof window.forceReloadMatrix === 'function'
  };
  
  console.log('🔍 Estado de importación:', status);
  return status;
}

// Hacer la función disponible globalmente para debugging
window.checkImportStatus = checkImportStatus;

// Panel y modeler init principal
$(function () {
  // Obtener referencias a los elementos de navegación
  welcomeScreen = document.getElementById('welcome-screen');
  modelerContainer = document.getElementById('modeler-container');
  
  // Verificar si hay un diagrama guardado y actualizar la UI
  checkSavedDiagram();
  
  // Configurar event listeners para la pantalla de bienvenida
  const newDiagramBtn = document.getElementById('new-diagram-btn');
  const openDiagramBtn = document.getElementById('open-diagram-btn');
  const continueDiagramBtn = document.getElementById('continue-diagram-btn');
  
  if (newDiagramBtn) {
    newDiagramBtn.addEventListener('click', handleNewDiagram);
  }
  
  if (openDiagramBtn) {
    openDiagramBtn.addEventListener('click', handleOpenDiagram);
  }
  
  if (continueDiagramBtn) {
    continueDiagramBtn.addEventListener('click', handleContinueDiagram);
  }
  

  
  // Configurar event listeners para el modelador
  const newBtn = document.getElementById('new-btn');
  const openBtn = document.getElementById('open-btn');
  const saveBtn = document.getElementById('save-btn');
  const backToWelcomeBtn = document.getElementById('back-to-welcome-btn');
  const fileInput = document.getElementById('file-input');
  
  if (newBtn) {
    newBtn.addEventListener('click', handleNewDiagram);
  }
  
  if (openBtn) {
    openBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleOpenWithConfirmation();
    });
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.importExportManager) {
        console.log('🎯 Botón Guardar clickeado (app.js) - llamando a ImportExportManager');
        window.importExportManager.exportProject();
      } else {
        console.error('❌ ImportExportManager no está disponible');
        if (modeler) {
          saveBpmnState();
        }
      }
    });
  }
  
  if (backToWelcomeBtn) {
    backToWelcomeBtn.addEventListener('click', () => {
      showWelcomeScreen();
    });
  }
  
  if (fileInput) {
    fileInput.addEventListener('change', handleFileSelect);
  }
  
  // Mostrar pantalla de bienvenida por defecto
  showWelcomeScreen();
  
  // Inicializar el gestor de importación/exportación
  if (window.ImportExportManager) {
    window.importExportManager = new window.ImportExportManager();
  }
  

});

// Función global para forzar recarga de matriz RASCI (para debugging)
window.forceRasciReload = function() {
  console.log('🔧 Forzando recarga de matriz RASCI manualmente...');
  
  // Primero verificar y asegurar que las funciones estén disponibles
  const status = window.ensureRasciFunctions();
  
  if (typeof window.forceReloadMatrix === 'function') {
    window.forceReloadMatrix();
  } else {
    console.warn('⚠️ forceReloadMatrix no está disponible, intentando métodos alternativos...');
    
    // Intentar usar renderMatrix directamente
    const rasciPanel = document.querySelector('#rasci-panel');
    if (rasciPanel && typeof window.renderMatrix === 'function') {
      console.log('🔄 Usando renderMatrix como fallback...');
      window.renderMatrix(rasciPanel, [], null);
    } else {
      console.error('❌ No se pudo encontrar panel RASCI o renderMatrix no está disponible');
      
      // Intentar forzar la inicialización del panel RASCI
      if (window.panelManager && typeof window.panelManager.applyConfiguration === 'function') {
        console.log('🔄 Intentando reinicializar paneles...');
        window.panelManager.applyConfiguration();
        
        // Esperar un poco y volver a intentar
        setTimeout(() => {
          const rasciPanel2 = document.querySelector('#rasci-panel');
          if (rasciPanel2 && typeof window.renderMatrix === 'function') {
            console.log('🔄 Reintentando renderMatrix después de reinicialización...');
            window.renderMatrix(rasciPanel2, [], null);
          }
        }, 1000);
      }
    }
  }
};

// Función global para limpiar marca de importación (para debugging)
window.clearImportFlag = function() {
  console.log('🔧 Limpiando marca de importación manualmente...');
  window.isImportingProject = false;
  window.storageCleared = false;
};

// Función de utilidad para verificar el estado de importación

// Función para verificar y forzar disponibilidad de funciones RASCI
window.ensureRasciFunctions = function() {
  console.log('🔧 Verificando disponibilidad de funciones RASCI...');
  
  const status = {
    forceReloadMatrix: typeof window.forceReloadMatrix === 'function',
    renderMatrix: typeof window.renderMatrix === 'function',
    rasciPanel: document.querySelector('#rasci-panel') !== null,
    panelManager: window.panelManager !== undefined
  };
  
  console.log('📊 Estado de funciones RASCI:', status);
  
  // Si forceReloadMatrix no está disponible, intentar crearlo
  if (!status.forceReloadMatrix) {
    console.log('⚠️ forceReloadMatrix no disponible, intentando crear...');
    
    // Intentar importar desde el módulo RASCI
    if (typeof window.initRasciPanel === 'function') {
      console.log('✅ initRasciPanel disponible, intentando inicializar panel...');
      const rasciPanel = document.querySelector('#rasci-panel');
      if (rasciPanel) {
        try {
          window.initRasciPanel(rasciPanel);
          console.log('✅ Panel RASCI inicializado manualmente');
        } catch (e) {
          console.error('❌ Error inicializando panel RASCI:', e);
        }
      }
    }
  }
  
  return status;
};

// Función global para forzar recarga de matriz RASCI (para debugging)

// Función para forzar inicialización completa del sistema
window.forceSystemInit = function() {
  console.log('🔧 Forzando inicialización completa del sistema...');
  
  // Limpiar marcas de importación
  window.isImportingProject = false;
  window.storageCleared = false;
  
  // Reinicializar el sistema de paneles
  if (window.panelManager && typeof window.panelManager.applyConfiguration === 'function') {
    console.log('🔄 Reinicializando configuración de paneles...');
    window.panelManager.applyConfiguration();
  }
  
  // Esperar y verificar funciones RASCI
  setTimeout(() => {
    window.ensureRasciFunctions();
    
    // Intentar recarga de matriz
    setTimeout(() => {
      if (typeof window.forceReloadMatrix === 'function') {
        console.log('🔄 Forzando recarga de matriz después de inicialización...');
        window.forceReloadMatrix();
      }
    }, 500);
  }, 1000);
  
  console.log('✅ Inicialización completa del sistema completada');
};

// Función para verificar y forzar disponibilidad de funciones RASCI