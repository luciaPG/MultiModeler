// === app.js limpio ===
// TODO: A TERMINAR EL DESARROLLO - Sistema de guardado automático implementado


import $ from 'jquery';
import MultiNotationModeler from './MultiNotationModeler/index.js';
import BpmnModdle from 'bpmn-moddle';
import PPINOTModdle from './PPINOT-modeler/PPINOT/PPINOTModdle.json';
import RALphModdle from './RALPH-modeler/RALph/RALphModdle.json';
import { PanelLoader } from './js/panel-loader.js';
import { initRasciPanel } from './js/panels/rasci/core/main.js';
// import './js/panel-snap-system.js'; // REMOVIDO - No se necesita desplazamiento de ventanas
import './js/panel-manager.js';

import 'bpmn-js/dist/assets/diagram-js.css';
import 'bpmn-js/dist/assets/bpmn-font/css/bpmn-embedded.css';
import 'diagram-js/assets/diagram-js.css';
import './css/app.css';

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
      console.log('🔒 Estado RASCI bloqueado, esperando...');
      return false;
    }
    this.isLocked = true;
    this.lockTimeout = setTimeout(() => {
      console.log('⏰ Timeout del bloqueo RASCI, liberando...');
      this.unlock();
    }, timeoutMs);
    console.log('🔒 Estado RASCI bloqueado');
    return true;
  },
  unlock: function() {
    this.isLocked = false;
    if (this.lockTimeout) {
      clearTimeout(this.lockTimeout);
      this.lockTimeout = null;
    }
    console.log('🔓 Estado RASCI desbloqueado');
  }
};

// Variables para el sistema de guardado automático BPMN
let bpmnSaveTimeout = null;
let lastBpmnSaveTime = 0;

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
  // Verificar estado del diagrama guardado cuando se muestra la pantalla de bienvenida
  checkSavedDiagram();
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
  const panelManager = new PanelManager();
  window.panelManager = panelManager;
  panelManager.setPanelLoader(panelLoader);

  // Crear paneles iniciales usando el gestor
  panelManager.applyConfiguration();

  // Configurar layout inicial
  panelContainer.classList.add('layout-4');

  setTimeout(() => {
    // El modeler se inicializará automáticamente cuando se aplique la configuración
  }, 300);
}

// Funciones de persistencia para el estado del BPMN
function saveBpmnState() {
  try {
    if (modeler) {
      // GUARDAR POSICIÓN Y ZOOM DEL CANVAS
      const canvas = modeler.get('canvas');
      if (canvas) {
        const viewbox = canvas.viewbox();
        const canvasState = {
          x: viewbox.x,
          y: viewbox.y,
          width: viewbox.width,
          height: viewbox.height,
          scale: viewbox.scale
        };
        localStorage.setItem('bpmnCanvasState', JSON.stringify(canvasState));
      }
      
      const xml = modeler.saveXML({ format: true });
      xml.then(result => {
        if (result && result.xml && result.xml.trim().length > 0) {
          localStorage.setItem('bpmnDiagram', result.xml);
          localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
          showBpmnSaveIndicator();
          
          // GUARDAR RELACIONES PADRE-HIJO
          const elementRegistry = modeler.get('elementRegistry');
          const allElements = elementRegistry.getAll();
          
          // Filtrar elementos PPINOT y RALph (shapes y conexiones)
          const ppinotElements = allElements.filter(el => {
            if (el.type && (el.type.includes('PPINOT') || el.type.includes('RALph'))) return true;
            if (el.businessObject && el.businessObject.$type) {
              const type = el.businessObject.$type;
              const ppinotTypes = ['PPINOT', 'Target', 'Scope', 'Ppi', 'Resource', 'Measure', 'Condition'];
              const ralphTypes = [
                'RALph', 'Person', 'RoleRALph', 'Personcap', 'Orgunit', 'Position', 
                'DelegateTo', 'History-Same', 'History-Any', 'History-Any-Red', 
                'History-Any-Green', 'History-Same-Green', 'History-Same-Red', 
                'History-AnyInstanceInTime-Green', 'History-AnyInstanceInTime-Red',
                'Complex-Assignment-AND', 'Complex-Assignment-OR', 
                'HistoryConnectorActivityInstance', 'dataField', 'ResourceArc',
                'negatedAssignment', 'solidLine', 'solidLineWithCircle', 
                'dashedLine', 'dashedLineWithCircle', 'simpleArrow', 'doubleArrow',
                'reportsTo', 'reportsDirectly', 'reportsTransitively', 
                'delegatesDirectly', 'delegatesTransitively'
              ];
              return ppinotTypes.some(t => type.includes(t)) || ralphTypes.some(t => type.includes(t));
            }
            return false;
          });
          
          console.log('💾 Guardando elementos PPINOT/RALph:', ppinotElements.length);
          console.log('  - Target:', ppinotElements.filter(el => el.type.includes('Target')).length);
          console.log('  - Scope:', ppinotElements.filter(el => el.type.includes('Scope')).length);
          console.log('  - Ppi:', ppinotElements.filter(el => el.type.includes('Ppi')).length);
          console.log('  - RALph:', ppinotElements.filter(el => el.type.includes('RALph')).length);
          
          // Guardar relaciones padre-hijo
          const parentChildRelations = {};
          ppinotElements.forEach(el => {
            if (el.parent && el.parent.id) {
              parentChildRelations[el.id] = {
                parentId: el.parent.id,
                parentType: el.parent.type,
                childType: el.type,
                childBusinessObjectType: el.businessObject ? el.businessObject.$type : null,
                parentBusinessObjectType: el.parent.businessObject ? el.parent.businessObject.$type : null,
                // Guardar posición relativa
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height
              };
            }
          });
          
          if (Object.keys(parentChildRelations).length > 0) {
            localStorage.setItem('bpmnParentChildRelations', JSON.stringify(parentChildRelations));
            console.log('👨‍👦 Relaciones padre-hijo guardadas:', Object.keys(parentChildRelations).length);
          }
          
          // NUEVO: Guardar elementos RALPH por separado como en el sistema original
          const ralphElements = allElements.filter(el => 
            el.type && el.type.includes('RALph')
          );
          
          if (ralphElements.length > 0) {
            // Convertir elementos RALPH a formato JSON para guardar por separado (OPTIMIZADO)
            const ralphData = ralphElements.map(el => {
              const data = {
                id: el.id,
                type: el.type,
                x: el.x,
                y: el.y
              };
              
              // Solo agregar propiedades si existen para reducir tamaño
              if (el.width) data.width = el.width;
              if (el.height) data.height = el.height;
              if (el.businessObject && el.businessObject.$type) data.businessObjectType = el.businessObject.$type;
              if (el.businessObject && el.businessObject.name) data.name = el.businessObject.name;
              
              // Solo para conexiones
              if (el.source && el.target) {
                data.source = el.source.id;
                data.target = el.target.id;
                if (el.waypoints && el.waypoints.length > 0) {
                  data.waypoints = el.waypoints.map(wp => ({ x: wp.x, y: wp.y }));
                }
              }
              
              return data;
            });
            
            localStorage.setItem('RALphElements', JSON.stringify(ralphData));
            console.log('🎯 RALPH guardados:', ralphData.length);
          }
          
          // GUARDAR TAMBIÉN LAS RELACIONES PPINOT EN EL XML (si está disponible)
          if (window.ppiManager && window.ppiManager.core) {
            // Filtrar elementos hijos de PPINOT
            const ppiChildren = allElements.filter(element => {
              const isChildOfPPI = element.parent && 
                (element.parent.type === 'PPINOT:Ppi' || 
                 (element.parent.businessObject && element.parent.businessObject.$type === 'PPINOT:Ppi'));
              
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
            
            // Crear relaciones para guardar
            const relationships = ppiChildren.map(el => ({
              childId: el.id,
              parentId: el.parent ? el.parent.id : null,
              childType: el.type,
              parentType: el.parent ? el.parent.type : null,
              childBusinessObjectType: el.businessObject ? el.businessObject.$type : null,
              parentBusinessObjectType: el.parent && el.parent.businessObject ? el.parent.businessObject.$type : null,
              childName: el.businessObject ? el.businessObject.name : '',
              parentName: el.parent && el.parent.businessObject ? el.parent.businessObject.name : '',
              timestamp: Date.now()
            }));
            
            // Guardar relaciones en el XML
            window.ppiManager.core.savePPINOTRelationshipsToXML(relationships);
          }
        }
      }).catch(err => {
        console.error('Error al guardar XML:', err);
      });
    }
  } catch (e) {
    console.error('Error en saveBpmnState:', e);
  }
}

// Función para mostrar indicador de guardado BPMN
function showBpmnSaveIndicator() {
  let saveIndicator = document.getElementById('bpmn-save-indicator');
  if (!saveIndicator) {
    saveIndicator = document.createElement('div');
    saveIndicator.id = 'bpmn-save-indicator';
    saveIndicator.innerHTML = `
      <div style="
        position: fixed;
        top: 20px;
        left: 20px;
        background: #3b82f6;
        color: white;
        padding: 8px 16px;
        border-radius: 6px;
        font-size: 12px;
        font-weight: 500;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        display: flex;
        align-items: center;
        gap: 6px;
        opacity: 0;
        transform: translateY(-10px);
        transition: all 0.3s ease;
      ">
        <i class="fas fa-save" style="font-size: 10px;"></i>
        <span>BPMN guardado</span>
      </div>
    `;
    document.body.appendChild(saveIndicator);
  }

  // Mostrar indicador
  saveIndicator.style.opacity = '1';
  saveIndicator.style.transform = 'translateY(0)';

  // Ocultar después de 2 segundos
  setTimeout(() => {
    saveIndicator.style.opacity = '0';
    saveIndicator.style.transform = 'translateY(-10px)';
  }, 2000);
}

// Función para guardado automático BPMN con debounce
function autoSaveBpmnState() {
  const now = Date.now();
  
  // Evitar guardados muy frecuentes (mínimo 1 segundo entre guardados)
  if (now - lastBpmnSaveTime < 1000) {
    // Cancelar timeout anterior y programar uno nuevo
    if (bpmnSaveTimeout) {
      clearTimeout(bpmnSaveTimeout);
    }
    bpmnSaveTimeout = setTimeout(() => {
      saveBpmnState();
      lastBpmnSaveTime = Date.now();
    }, 1000);
    return;
  }
  
  // Guardar inmediatamente si ha pasado suficiente tiempo
  saveBpmnState();
  lastBpmnSaveTime = now;
}

// Función para forzar guardado inmediato (sin debounce)
function forceSaveBpmnState() {
  if (bpmnSaveTimeout) {
    clearTimeout(bpmnSaveTimeout);
  }
  saveBpmnState();
  lastBpmnSaveTime = Date.now();
}

function loadBpmnState() {
  try {
    console.log('loadBpmnState ejecutándose...');
    const savedDiagram = localStorage.getItem('bpmnDiagram');
    
    if (!modeler) {
      console.log('Modeler no disponible, reintentando en 500ms');
      setTimeout(loadBpmnState, 500);
      return;
    }
    
    if (savedDiagram && savedDiagram.trim().length > 0) {
      console.log('🔄 Cargando diagrama guardado...');
      console.log('📄 XML contiene Scope:', savedDiagram.includes('Scope'));
      console.log('🎯 XML contiene Target:', savedDiagram.includes('Target'));
      console.log('📄 Tamaño del XML:', savedDiagram.length, 'caracteres');
      
      // DIAGNÓSTICO: Verificar moddle antes de importar
      try {
        const moddle = modeler.get('moddle');
        console.log('🔧 Moddle packages disponibles:', Object.keys(moddle.registry.packages));
        console.log('🔧 ¿PPINOT registrado?', !!moddle.registry.packages.PPINOT);
        console.log('🔧 ¿RALph registrado?', !!moddle.registry.packages.RALph);
      } catch (e) {
        console.warn('🚨 Error verificando moddle:', e);
      }
      
      modeler.importXML(savedDiagram).then(() => {
        console.log('✅ Diagrama BPMN restaurado correctamente');
        
        // DIAGNÓSTICO POST-IMPORTACIÓN
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        
        console.log('📊 Total elementos importados:', allElements.length);
        
        // Buscar elementos PPINOT/RALph con el mismo filtro que en testElementXML (incluyendo conexiones)
        const ppinotElements = allElements.filter(el => {
          return (el.type && (el.type.includes('PPINOT') || el.type.includes('RALph'))) ||
                 (el.businessObject && el.businessObject.$type && 
                  (el.businessObject.$type.includes('PPINOT') || el.businessObject.$type.includes('RALph')));
        });
        
        console.log('📊 Elementos PPINOT/RALph restaurados:', ppinotElements.length);
        console.log('  - Target:', ppinotElements.filter(el => el.type.includes('Target')).length);
        console.log('  - Scope:', ppinotElements.filter(el => el.type.includes('Scope')).length);
        console.log('  - Ppi:', ppinotElements.filter(el => el.type.includes('Ppi')).length);
        console.log('  - RALph:', ppinotElements.filter(el => el.type.includes('RALph')).length);
        
        // RESTAURAR POSICIÓN Y ZOOM DEL CANVAS
        const savedCanvasState = localStorage.getItem('bpmnCanvasState');
        if (savedCanvasState) {
          try {
            const canvasState = JSON.parse(savedCanvasState);
            const canvas = modeler.get('canvas');
            if (canvas && canvasState) {
              // Restaurar viewbox con un pequeño delay para asegurar que el diagrama esté listo
              setTimeout(() => {
                canvas.viewbox({
                  x: canvasState.x,
                  y: canvasState.y,
                  width: canvasState.width,
                  height: canvasState.height
                });
                console.log('🎯 Posición del canvas restaurada');
              }, 100);
            }
          } catch (e) {
            console.warn('⚠️ Error restaurando posición del canvas:', e);
          }
        }
        
        // NUEVO: Restaurar elementos RALPH desde almacenamiento separado
        const savedRALphElements = localStorage.getItem('RALphElements');
        if (savedRALphElements) {
          try {
            const ralphData = JSON.parse(savedRALphElements);
            console.log('🔄 Restaurando elementos RALPH:', ralphData.length);
            
            if (ralphData.length > 0) {
              // VERSIÓN OPTIMIZADA: Restaurar elementos RALPH con mejor rendimiento
              const restoreRALphElementsOptimized = () => {
                try {
                  const elementFactory = modeler.get('elementFactory');
                  const modeling = modeler.get('modeling');
                  const canvas = modeler.get('canvas');
                  const elementRegistry = modeler.get('elementRegistry');
                  const rootElement = canvas.getRootElement();
                  
                  if (!elementFactory || !modeling || !canvas) {
                    console.warn('⚠️ Modeler no listo, reintentando en 100ms...');
                    setTimeout(restoreRALphElementsOptimized, 100);
                    return;
                  }
                  
                  // Obtener todos los elementos RALPH que ya están en el diagrama
                  const existingRALphElements = elementRegistry.getAll().filter(el => 
                    el.type && el.type.includes('RALph')
                  );
                  
                  // Filtrar elementos que NO están ya en el diagrama (por tipo, no por ID)
                  const elementsToRestore = ralphData.filter(savedElement => {
                    // Verificar si ya existe un elemento con el mismo ID
                    const existingById = elementRegistry.get(savedElement.id);
                    if (existingById) {
                      return false; // Ya existe con ese ID
                    }
                    
                    // Para conexiones, verificar si ya existe una conexión entre los mismos elementos
                    if (savedElement.source && savedElement.target) {
                      const sourceElement = elementRegistry.get(savedElement.source);
                      const targetElement = elementRegistry.get(savedElement.target);
                      
                      if (sourceElement && targetElement) {
                        const existingConnection = elementRegistry.getAll().find(el => 
                          el.type === savedElement.type && 
                          el.source && el.target &&
                          el.source.id === savedElement.source && 
                          el.target.id === savedElement.target
                        );
                        
                        if (existingConnection) {
                          return false; // Ya existe una conexión entre estos elementos
                        }
                      }
                    }
                    
                    return true; // No existe, restaurar
                  });
                  
                  console.log(`🎯 Elementos RALPH a restaurar: ${elementsToRestore.length} de ${ralphData.length}`);
                  console.log('📋 Tipos de elementos existentes:', existingRALphElements.map(el => el.type));
                  console.log('📋 Tipos de elementos a restaurar:', elementsToRestore.map(el => el.type));
                  
                  if (elementsToRestore.length === 0) {
                    console.log('✅ Todos los elementos RALPH ya están en el diagrama');
                    return;
                  }
                  
                  // Separar elementos y conexiones para procesamiento optimizado
                  const shapes = elementsToRestore.filter(el => !el.source || !el.target);
                  const connections = elementsToRestore.filter(el => el.source && el.target);
                  
                  let successCount = 0;
                  let errorCount = 0;
                  
                  // Función para procesar elementos en chunks para mejor rendimiento
                  const processElementsInChunks = (elements, isConnection = false) => {
                    const chunkSize = 10; // Procesar 10 elementos por frame
                    let currentIndex = 0;
                    
                    const processChunk = () => {
                      const chunk = elements.slice(currentIndex, currentIndex + chunkSize);
                      
                      chunk.forEach(ralphElement => {
                        try {
                          const existingElement = elementRegistry.get(ralphElement.id);
                          if (existingElement) {
                            successCount++;
                            return;
                          }
                          
                          if (isConnection) {
                            // Procesar conexión
                            const sourceElement = elementRegistry.get(ralphElement.source);
                            const targetElement = elementRegistry.get(ralphElement.target);
                            
                            if (sourceElement && targetElement) {
                              const connection = elementFactory.createConnection({
                                type: ralphElement.type,
                                source: sourceElement,
                                target: targetElement,
                                id: ralphElement.id,
                                waypoints: ralphElement.waypoints || [
                                  { x: sourceElement.x + sourceElement.width / 2, y: sourceElement.y + sourceElement.height / 2 },
                                  { x: targetElement.x + targetElement.width / 2, y: targetElement.y + targetElement.height / 2 }
                                ]
                              });
                              
                              modeling.createConnection(sourceElement, targetElement, connection, rootElement);
                              successCount++;
                            } else {
                              errorCount++;
                            }
                          } else {
                            // Procesar shape
                            const element = elementFactory.createShape({
                              type: ralphElement.type,
                              id: ralphElement.id
                            });
                            
                            modeling.createShape(element, { 
                              x: ralphElement.x || 100, 
                              y: ralphElement.y || 100 
                            }, rootElement);
                            
                            successCount++;
                          }
                        } catch (e) {
                          errorCount++;
                        }
                      });
                      
                      currentIndex += chunkSize;
                      
                      if (currentIndex < elements.length) {
                        // Continuar con el siguiente chunk en el siguiente frame
                        requestAnimationFrame(processChunk);
                      } else {
                        // Todos los elementos procesados
                        console.log(`🎯 RALPH restaurado: ${successCount} éxitos, ${errorCount} errores`);
                      }
                    };
                    
                    // Iniciar procesamiento
                    if (elements.length > 0) {
                      requestAnimationFrame(processChunk);
                    }
                  };
                  
                  // Procesar shapes primero, luego conexiones
                  processElementsInChunks(shapes, false);
                  processElementsInChunks(connections, true);
                  
                } catch (e) {
                  console.error('❌ Error en restauración RALPH:', e);
                }
              };
              
              // Iniciar restauración optimizada con delay mínimo
              setTimeout(restoreRALphElementsOptimized, 10);
            }
          } catch (e) {
            console.error('❌ Error parseando elementos RALPH guardados:', e);
          }
        }
        
        // Verificar si hay elementos faltantes en el XML guardado vs importados
        const targetInXML = savedDiagram.includes('Target');
        const scopeInXML = savedDiagram.includes('Scope');
        const targetImported = ppinotElements.some(el => el.type.includes('Target'));
        const scopeImported = ppinotElements.some(el => el.type.includes('Scope'));
        
        if (targetInXML && !targetImported) {
          console.error('❌ PROBLEMA: Target está en XML pero no se importó');
        }
        if (scopeInXML && !scopeImported) {
          console.error('❌ PROBLEMA: Scope está en XML pero no se importó');
        }
        
        // RESTAURAR RELACIONES PADRE-HIJO
        const savedRelations = localStorage.getItem('bpmnParentChildRelations');
        if (savedRelations) {
          try {
            const relations = JSON.parse(savedRelations);
            console.log('🔄 Restaurando relaciones padre-hijo:', Object.keys(relations).length);
            
            const elementRegistry = modeler.get('elementRegistry');
            
            // Verificar qué elementos existen antes de restaurar relaciones
            const existingElements = elementRegistry.getAll();
            const existingIds = existingElements.map(el => el.id);
            console.log('📋 Elementos disponibles para restaurar relaciones:', existingIds);
            
            // Filtrar relaciones donde tanto padre como hijo existen
            const validRelations = Object.entries(relations).filter(([childId, relation]) => {
              const childExists = existingIds.includes(childId);
              const parentExists = existingIds.includes(relation.parentId);
              
              if (!childExists) {
                console.warn(`⚠️ Elemento hijo ${childId} (${relation.childType}) no encontrado en el diagrama importado`);
              }
              if (!parentExists) {
                console.warn(`⚠️ Elemento padre ${relation.parentId} (${relation.parentType}) no encontrado en el diagrama importado`);
              }
              
              return childExists && parentExists;
            });
            
            console.log(`✅ Relaciones válidas para restaurar: ${validRelations.length} de ${Object.keys(relations).length}`);
            
            if (validRelations.length > 0) {
              // Restaurar relaciones con múltiples intentos hasta que el modeler esté listo
              const restoreRelationsWithRetry = (attempts = 0, maxAttempts = 10) => {
                setTimeout(() => {
                  try {
                    const currentElementRegistry = modeler.get('elementRegistry');
                    const currentModeling = modeler.get('modeling');
                    const canvas = modeler.get('canvas');
                    
                    // Verificar que el modeler está completamente listo
                    if (!currentElementRegistry || !currentModeling || !canvas) {
                      if (attempts < maxAttempts) {
                        console.log(`⏳ Modeler no listo, reintentando (${attempts + 1}/${maxAttempts})...`);
                        restoreRelationsWithRetry(attempts + 1, maxAttempts);
                      } else {
                        console.error('❌ Timeout: Modeler no se inicializó completamente');
                      }
                      return;
                    }
                    
                    let successCount = 0;
                    let errorCount = 0;
                    
                    validRelations.forEach(([childId, relation]) => {
                      const childElement = currentElementRegistry.get(childId);
                      const parentElement = currentElementRegistry.get(relation.parentId);
                      
                      if (childElement && parentElement) {
                        console.log('👨‍👦 Restaurando relación:', childId, '->', relation.parentId);
                        try {
                          // Verificar si la relación ya está establecida
                          if (childElement.parent && childElement.parent.id === relation.parentId) {
                            console.log('ℹ️ Relación ya establecida:', childId, '->', relation.parentId);
                            successCount++;
                            return;
                          }
                          
                          // Mover el elemento hijo al padre manteniendo posición relativa
                          currentModeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
                          console.log('✅ Relación restaurada correctamente');
                          successCount++;
                        } catch (e) {
                          console.warn('⚠️ Error restaurando relación:', e);
                          errorCount++;
                        }
                      } else {
                        console.warn(`⚠️ Elementos no encontrados para relación ${childId} -> ${relation.parentId}`);
                        errorCount++;
                      }
                    });
                    
                    console.log(`🎯 Restauración completada: ${successCount} éxitos, ${errorCount} errores`);
                    
                    // Forzar actualización visual múltiple para asegurar que se muestren las relaciones
                    setTimeout(() => {
                      console.log('🎨 Actualizando visualización...');
                      try {
                        const canvas = modeler.get('canvas');
                        if (canvas && canvas.zoom) {
                          // Hacer zoom ligeramente para forzar re-render
                          const currentZoom = canvas.zoom();
                          canvas.zoom(currentZoom * 1.001);
                          setTimeout(() => {
                            canvas.zoom(currentZoom);
                          }, 100);
                        }
                        
                        // También forzar actualización del registro de elementos
                        const eventBus = modeler.get('eventBus');
                        if (eventBus) {
                          eventBus.fire('canvas.viewbox.changed');
                        }
                      } catch (e) {
                        console.warn('⚠️ Error actualizando visualización:', e);
                      }
                    }, 300);
                    
                  } catch (e) {
                    if (attempts < maxAttempts) {
                      console.log(`⏳ Error en intento ${attempts + 1}, reintentando...`, e);
                      restoreRelationsWithRetry(attempts + 1, maxAttempts);
                    } else {
                      console.error('❌ Error final restaurando relaciones:', e);
                    }
                  }
                }, 500 + (attempts * 300)); // Incrementar delay con cada intento
              };
              
              // Iniciar proceso de restauración
              restoreRelationsWithRetry();
            } else {
              console.log('ℹ️ No hay relaciones válidas para restaurar');
            }
            
          } catch (e) {
            console.error('❌ Error parseando relaciones padre-hijo:', e);
          }
        } else {
          console.log('ℹ️ No hay relaciones padre-hijo guardadas');
        }
        
        updateUI('Diagrama BPMN restaurado.');
        
        // Recargar estado RASCI después de cargar el diagrama BPMN
        setTimeout(() => {
          if (typeof window.reloadRasciState === 'function') {
            window.reloadRasciState();
          }
        }, 1000);
        
        // La restauración de relaciones PPINOT se maneja automáticamente en PPIManager
        // No es necesario llamar aquí ya que se ejecuta cuando el modeler está listo
        
      }).catch(err => {
        console.warn('Error al cargar diagrama guardado, creando nuevo:', err);
        createNewDiagram();
      });
    } else {
      console.log('No hay diagrama guardado, creando nuevo...');
      createNewDiagram();
    }
  } catch (e) {
    console.error('Error en loadBpmnState:', e);
    createNewDiagram();
  }
}

function validateAndSanitizeWaypoints(waypoints) {
  if (!waypoints || !Array.isArray(waypoints)) return [];
  const valid = waypoints.filter(p => p && typeof p.x === 'number' && typeof p.y === 'number');
  const unique = valid.filter((p, i, arr) => i === 0 || p.x !== arr[i-1].x || p.y !== arr[i-1].y);
  return unique.length >= 2 ? unique : [];
}

let modeler = null;
const moddle = new BpmnModdle({});
const container = $('.panel:first-child');
const body = $('body');

function initializeModeler() {
  try {
    // Verificar que el elemento canvas existe antes de inicializar
    const canvasElement = document.getElementById('js-canvas');
    if (!canvasElement) {
      console.error('Canvas element #js-canvas not found, cannot initialize modeler');
      return;
    }
    
    // Limpiar modeler anterior si existe
    if (window.modeler && typeof window.modeler.destroy === 'function') {
      try {
        window.modeler.destroy();
      } catch (e) {
        console.warn('Error al destruir modeler anterior:', e);
      }
    }
    
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
      
      // Guardar estado automáticamente cuando hay cambios
      eventBus.on([
        'element.added',
        'element.removed', 
        'element.changed',
        'elements.changed',
        'shape.move.end',
        'shape.resize.end',
        'connection.create',
        'connection.delete'
      ], () => {
        autoSaveBpmnState(); // Usar sistema de guardado automático con debounce
      });
      
      // Guardar antes de que el usuario abandone la página
      window.addEventListener('beforeunload', () => {
        if (modeler) {
          forceSaveBpmnState(); // Guardado inmediato antes de recargar
        }
      });
    }
    
    // El modeler está listo
    window.modeler = modeler;
    
    console.log('Modeler inicializado correctamente');
    
    // Inicializar integración con PPI si está disponible
    if (window.ppiManager && window.BpmnIntegration) {
      window.bpmnIntegration = new BpmnIntegration(window.ppiManager, modeler);
    }
  } catch (error) {
    console.error('Error en initializeModeler:', error);
  }
}

async function createNewDiagram() {
  try {
    console.log('createNewDiagram ejecutándose...');
    if (typeof modeler.clear === 'function') await modeler.clear();
    await modeler.createDiagram();
    console.log('Nuevo diagrama creado con éxito');

    // Recargar estado RASCI después de crear nuevo diagrama
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
    
    // Verificar que existe el elemento canvas y que el modeler puede acceder a él
    return canvas && canvasElement && canvasElement.parentNode;
  } catch (e) {
    return false;
  }
}

// Función de debug para verificar el estado del localStorage
function debugBpmnState() {
  const savedDiagram = localStorage.getItem('bpmnDiagram');
  if (savedDiagram) {
  } else {
  }
  
  if (modeler) {
  } else {
  }
}

// Hacer las funciones globales para que el gestor de paneles pueda acceder a ellas
window.initializeModeler = initializeModeler;
window.createNewDiagram = createNewDiagram;
window.isModelerHealthy = isModelerHealthy;
window.saveBpmnState = saveBpmnState;
window.forceSaveBpmnState = forceSaveBpmnState;
window.loadBpmnState = loadBpmnState;
window.autoSaveBpmnState = autoSaveBpmnState;
window.debugBpmnState = debugBpmnState;

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
  console.log('👨‍👦 Creando diagrama con relaciones padre-hijo');
  
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
      console.log('\n👨‍👦 Relaciones padre-hijo guardadas:', Object.keys(relations).length);
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
function handleNewDiagram() {
  showModeler();
  // Limpiar cualquier diagrama existente
  localStorage.removeItem('bpmnDiagram');
  localStorage.removeItem('bpmnDiagramTimestamp');
  localStorage.removeItem('bpmnCanvasState');
  localStorage.removeItem('RALphElements');
  localStorage.removeItem('bpmnParentChildRelations');
  // Limpiar estado RASCI
  localStorage.removeItem('rasciRoles');
  localStorage.removeItem('rasciMatrixData');
  // Actualizar la UI si se regresa a la pantalla de bienvenida
  checkSavedDiagram();
  // El modeler se inicializará automáticamente
}

function handleContinueDiagram() {
  showModeler();
  // El diagrama guardado se cargará automáticamente cuando se inicialice el modeler
}

function handleOpenDiagram() {
  const fileInput = document.getElementById('file-input');
  if (fileInput) {
    fileInput.click();
  }
}

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) {
    const reader = new FileReader();
    reader.onload = function(e) {
      const content = e.target.result;
      localStorage.setItem('bpmnDiagram', content);
      localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
      showModeler();
      // Actualizar la UI para reflejar que ahora hay un diagrama guardado
      checkSavedDiagram();
      // El diagrama se cargará automáticamente cuando se inicialice el modeler
    };
    reader.readAsText(file);
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
    openBtn.addEventListener('click', handleOpenDiagram);
  }
  
  if (saveBtn) {
    saveBtn.addEventListener('click', () => {
      if (modeler) {
        saveBpmnState();
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
});