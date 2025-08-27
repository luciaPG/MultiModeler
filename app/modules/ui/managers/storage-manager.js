// === Storage Manager ===
// Gestor centralizado de localStorage para MultiModeler

// Importar funciones RASCI directamente
let forceReloadMatrix = null;
let renderMatrix = null;

// Función para cargar funciones RASCI dinámicamente
async function loadRasciFunctions() {
  try {
    if (!forceReloadMatrix || !renderMatrix) {
      const rasciModule = await import('../../rasci/core/matrix-manager.js');
      forceReloadMatrix = rasciModule.forceReloadMatrix;
      renderMatrix = rasciModule.renderMatrix;
      console.log('✅ Funciones RASCI cargadas dinámicamente');
    }
  } catch (error) {
    console.warn('⚠️ No se pudieron cargar las funciones RASCI:', error);
  }
}

class StorageManager {
  constructor() {
    this.version = '1.0.0';
    this.keysToPreserve = ['userPreferences', 'theme', 'globalSettings'];
    this.ppiKeysToClean = [
      'ppiIndicators',
      'ppiRelationships', 
      'ppis',
      'ppinotElements',
      'bpmnPPINOTElements',
      'bpmnPPINOTRelations',
      'ppiSettings'
    ];
    this.init();
  }

  init() {
    this.setupGlobalMethods();
  }

  setupGlobalMethods() {
    // Hacer disponibles los métodos globalmente
    window.storageManager = this;
    window.resetStorage = () => this.resetStorage();
    window.clearStorage = () => this.clearStorage();
    window.getStorageInfo = () => this.getStorageInfo();
    window.clearPPIData = () => this.clearPPIData();
  }

  // === RESETEO COMPLETO ===
  // Para "Crear Nuevo Diagrama" - Resetear todo y crear diagrama limpio
  async resetStorage() {
    try {
      await this.clearStorage();
      await this.createCleanBpmnDiagram();
      this.resetGlobalVariables();
      this.setInitialState();
      await this.forcePanelReset();
      return true;
    } catch (error) {
      console.error('❌ Error en resetStorage:', error);
      return false;
    }
  }

  // === LIMPIEZA PARA IMPORTACIÓN ===
  // Versión de clearStorage que no marca storageCleared
  async clearStorageForImport() {
    console.log('🧹 Limpiando localStorage para importación...');
    
    this.logStorageState();
    
    // Primero limpiar datos PPI específicos
    this.clearPPIData();
    
    // Limpiar datos RASCI específicos
    this.clearRasciData();
    
    const keysToRemove = [];
    
    // Identificar todas las claves a eliminar
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!this.keysToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Eliminar las claves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // No forzar recarga de datos de paneles aquí para evitar interferencia con importación
    // Los paneles se recargarán después de la importación
  }

  // === LIMPIEZA PARA IMPORTACIÓN ===
  // Para "Abrir Diagrama" - Limpiar y preparar para importar
  async prepareForImport() {
    try {
      // Verificar si se está importando un proyecto
      if (window.isImportingProject === true) {
        console.log('📦 Proyecto en importación detectado, saltando limpieza para importación...');
        return true;
      }
      
      // Limpiar cualquier marca de storageCleared anterior
      window.storageCleared = false;
      
      // Limpiar localStorage sin marcar storageCleared
      await this.clearStorageForImport();
      
      this.resetGlobalVariables();
      this.setImportState();
      await this.forcePanelReset();
      return true;
    } catch (error) {
      console.error('❌ Error en prepareForImport:', error);
      return false;
    }
  }

  // === LIMPIEZA BÁSICA ===
  async clearStorage() {
    console.log('🧹 Limpiando localStorage...');
    
    // Verificar si se está importando un proyecto
    if (window.isImportingProject === true) {
      console.log('📦 Proyecto en importación detectado, saltando limpieza automática...');
      return;
    }
    
    this.logStorageState();
    
    // Marcar que se está haciendo una limpieza
    window.storageCleared = true;
    
    // Primero limpiar datos PPI específicos
    this.clearPPIData();
    
    // Limpiar datos RASCI específicos
    this.clearRasciData();
    
    const keysToRemove = [];
    
    // Identificar todas las claves a eliminar
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!this.keysToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    // Eliminar las claves identificadas
    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Forzar recarga de datos de paneles
    await this.forcePanelDataReload();
    
    // Limpiar la marca después de un tiempo
    setTimeout(() => {
      window.storageCleared = false;
    }, 5000);
  }

  // === LIMPIEZA ESPECÍFICA DE DATOS RASCI ===
  clearRasciData() {
    // Limpiar claves RASCI del localStorage
    const rasciKeysToClean = [
      'rasciRoles',
      'rasciTasks', 
      'rasciMatrixData',
      'rasciSettings'
    ];
    
    rasciKeysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        localStorage.removeItem(key);
      }
    });
    
    // Limpiar variables globales RASCI
    if (window.rasciRoles) window.rasciRoles = [];
    if (window.rasciTasks) window.rasciTasks = [];
    if (window.rasciMatrixData) window.rasciMatrixData = {};
  }

  // === LIMPIEZA ESPECÍFICA DE DATOS PPI === (ELIMINADO)
  clearPPIData() {
    // Función eliminada por solicitud del usuario - PPI localStorage ya no se usa
    console.log('🗑️ clearPPIData eliminado - PPI localStorage deshabilitado');
  }

  // === FORZAR RECARGA DE DATOS DE PANELES ===
  async forcePanelDataReload() {
    // Cargar funciones RASCI si no están disponibles
    await loadRasciFunctions();
    
    // Solo limpiar datos si no se está importando un proyecto
    if (!window.isImportingProject) {
      // Forzar recarga de datos RASCI
      if (window.rasciRoles) {
        window.rasciRoles = [];
      }
      if (window.rasciTasks) {
        window.rasciTasks = [];
      }
      if (window.rasciMatrixData) {
        window.rasciMatrixData = {};
      }
      
      // Forzar recarga de datos PPI
      if (window.ppiManager && window.ppiManager.core) {
        try {
          // Limpiar arrays internos
          if (window.ppiManager.core.ppis) {
            window.ppiManager.core.ppis = [];
          }
          if (window.ppiManager.core.filteredPPIs) {
            window.ppiManager.core.filteredPPIs = [];
          }
          if (window.ppiManager.core.processedElements) {
            window.ppiManager.core.processedElements.clear();
          }
          
          // Forzar recarga de la interfaz PPI
          if (typeof window.ppiManager.refreshPPIList === 'function') {
            setTimeout(() => {
              window.ppiManager.refreshPPIList();
            }, 100);
          }
        } catch (error) {
          // Silenciar error
        }
      }
    }
    
    // Forzar recarga completa de la matriz RASCI
    setTimeout(async () => {
      try {
        // Usar funciones cargadas dinámicamente
        if (forceReloadMatrix && typeof forceReloadMatrix === 'function') {
          forceReloadMatrix();
        } else if (renderMatrix && typeof renderMatrix === 'function') {
          // Fallback a renderMatrix si forceReloadMatrix no está disponible
          const rasciPanel = document.querySelector('#rasci-panel');
          if (rasciPanel) {
            renderMatrix(rasciPanel, [], null);
          }
        } else {
          console.warn('⚠️ Funciones RASCI no disponibles para recarga');
        }
      } catch (error) {
        console.warn('Error en recarga de matriz RASCI:', error);
      }
    }, 200);
  }

  // === RESETEO DE VARIABLES GLOBALES ===
  resetGlobalVariables() {
    // Variables RASCI
    if (window.rasciRoles) window.rasciRoles = [];
    if (window.rasciTasks) window.rasciTasks = [];
    if (window.rasciMatrixData) window.rasciMatrixData = {};
    
    // Variables PPI
    if (window.ppiManager && window.ppiManager.core && typeof window.ppiManager.core.clearAllPPIs === 'function') {
      try {
        window.ppiManager.core.clearAllPPIs();
      } catch (error) {
        // Silenciar error
      }
    }
  }

  // === CREAR DIAGRAMA BPMN LIMPIO ===
  async createCleanBpmnDiagram() {
    try {
      if (window.modeler) {
        // Crear diagrama BPMN básico
        const cleanXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI" 
                  xmlns:dc="http://www.omg.org/spec/DD/20100524/DC" 
                  xmlns:di="http://www.omg.org/spec/DD/20100524/DI" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio">
      <bpmn:outgoing>Flow_1</bpmn:outgoing>
    </bpmn:startEvent>
    <bpmn:task id="Task_1" name="Tarea 1">
      <bpmn:incoming>Flow_1</bpmn:incoming>
      <bpmn:outgoing>Flow_2</bpmn:outgoing>
    </bpmn:task>
    <bpmn:endEvent id="EndEvent_1" name="Fin">
      <bpmn:incoming>Flow_2</bpmn:incoming>
    </bpmn:endEvent>
    <bpmn:sequenceFlow id="Flow_1" sourceRef="StartEvent_1" targetRef="Task_1" />
    <bpmn:sequenceFlow id="Flow_2" sourceRef="Task_1" targetRef="EndEvent_1" />
  </bpmn:process>
  <bpmndi:BPMNDiagram id="BPMNDiagram_1">
    <bpmndi:BPMNPlane id="BPMNPlane_1" bpmnElement="Process_1">
      <bpmndi:BPMNShape id="_BPMNShape_StartEvent_2" bpmnElement="StartEvent_1">
        <dc:Bounds x="152" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="158" y="145" width="24" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="Task_1_di" bpmnElement="Task_1">
        <dc:Bounds x="240" y="80" width="100" height="80" />
        <bpmndi:BPMNLabel />
      </bpmndi:BPMNShape>
      <bpmndi:BPMNShape id="EndEvent_1_di" bpmnElement="EndEvent_1">
        <dc:Bounds x="392" y="102" width="36" height="36" />
        <bpmndi:BPMNLabel>
          <dc:Bounds x="400" y="145" width="20" height="14" />
        </bpmndi:BPMNLabel>
      </bpmndi:BPMNShape>
      <bpmndi:BPMNEdge id="Flow_1_di" bpmnElement="Flow_1">
        <di:waypoint x="188" y="120" />
        <di:waypoint x="240" y="120" />
      </bpmndi:BPMNEdge>
      <bpmndi:BPMNEdge id="Flow_2_di" bpmnElement="Flow_2">
        <di:waypoint x="340" y="120" />
        <di:waypoint x="392" y="120" />
      </bpmndi:BPMNEdge>
    </bpmndi:BPMNPlane>
  </bpmndi:BPMNDiagram>
</bpmn:definitions>`;
        
        // Importar el diagrama limpio
        await window.modeler.importXML(cleanXml);
        
        // Guardar el diagrama limpio en localStorage
        localStorage.setItem('bpmnDiagram', cleanXml);
        localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
        
        console.log('✅ Diagrama BPMN limpio creado y guardado');
      } else {
        console.warn('⚠️ Modeler no disponible, creando diagrama básico en localStorage');
        // Crear un diagrama básico en localStorage
        const basicXml = `<?xml version="1.0" encoding="UTF-8"?>
<bpmn:definitions xmlns:bpmn="http://www.omg.org/spec/BPMN/20100524/MODEL" 
                  id="Definitions_1" 
                  targetNamespace="http://bpmn.io/schema/bpmn">
  <bpmn:process id="Process_1" isExecutable="false">
    <bpmn:startEvent id="StartEvent_1" name="Inicio" />
  </bpmn:process>
</bpmn:definitions>`;
        
        localStorage.setItem('bpmnDiagram', basicXml);
        localStorage.setItem('bpmnDiagramTimestamp', Date.now().toString());
      }
      
    } catch (error) {
      console.error('❌ Error creando diagrama BPMN limpio:', error);
      throw error;
    }
  }

  // === CONFIGURAR ESTADO INICIAL ===
  setInitialState() {
    console.log('⚙️ Configurando estado inicial...');
    
    // Limpiar datos PPM antes de configurar estado inicial
    this.clearPPIData();
    
    // Limpiar datos RASCI antes de configurar estado inicial
    this.clearRasciData();
    
    // Configurar paneles por defecto - SOLO BPMN activo
    localStorage.setItem('activePanels', JSON.stringify(['bpmn']));
    localStorage.setItem('panelLayout', '2v');
    localStorage.setItem('panelOrder', JSON.stringify(['bpmn']));
    
    // Configurar estado del canvas
    const canvasState = {
      zoom: 1,
      position: { x: 0, y: 0 },
      timestamp: Date.now()
    };
    localStorage.setItem('bpmnCanvasState', JSON.stringify(canvasState));
    
    // Configuraciones por defecto
    localStorage.setItem('bpmnRALPHElements', JSON.stringify([]));
    localStorage.setItem('bpmnParentChildRelations', JSON.stringify({}));
    
    // Configuraciones RASCI
    localStorage.setItem('rasciRoles', JSON.stringify([]));
    localStorage.setItem('rasciMatrixData', JSON.stringify({}));
    localStorage.setItem('rasciTasks', JSON.stringify([]));
    localStorage.setItem('rasciSettings', JSON.stringify({}));
    
    console.log('✅ Estado inicial configurado - Solo panel BPMN activo por defecto');
  }

  // === CONFIGURAR ESTADO DE IMPORTACIÓN ===
  setImportState() {
    console.log('⚙️ Configurando estado para importación...');
    
    // Solo limpiar, no configurar nada
    // Los datos se importarán después
    console.log('✅ Estado preparado para importación');
  }

  // === VERIFICACIÓN Y LOGGING ===
  getStorageInfo() {
    const info = {
      totalItems: localStorage.length,
      preservedKeys: [],
      projectKeys: [],
      timestamp: new Date().toISOString()
    };
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (this.keysToPreserve.includes(key)) {
        info.preservedKeys.push(key);
      } else {
        info.projectKeys.push(key);
      }
    }
    
    return info;
  }

  logStorageState() {
    const info = this.getStorageInfo();
    console.log('📊 Estado actual del localStorage:');
    console.log(`   Total elementos: ${info.totalItems}`);
    console.log(`   Claves preservadas: ${info.preservedKeys.length}`);
    console.log(`   Claves del proyecto: ${info.projectKeys.length}`);
    
    if (info.projectKeys.length > 0) {
      console.log('   Claves del proyecto:', info.projectKeys);
    }
  }

  // === VERIFICACIÓN DE INTEGRIDAD ===
  verifyStorageIntegrity() {
    console.log('🔍 Verificando integridad del localStorage...');
    
    const info = this.getStorageInfo();
    const hasBpmnDiagram = localStorage.getItem('bpmnDiagram') !== null;
    const hasTimestamp = localStorage.getItem('bpmnDiagramTimestamp') !== null;
    
    const integrity = {
      hasBpmnDiagram,
      hasTimestamp,
      totalItems: info.totalItems,
      isValid: hasBpmnDiagram && hasTimestamp
    };
    
    console.log('📋 Resultado de verificación:', integrity);
    return integrity;
  }

  // === MÉTODOS DE UTILIDAD ===
  
  // Forzar limpieza completa (incluyendo preferencias)
  forceCompleteClear() {
    console.log('🧹 FORZANDO LIMPIEZA COMPLETA del localStorage...');
    localStorage.clear();
    this.resetGlobalVariables();
    console.log('✅ Limpieza completa forzada');
    return localStorage.length === 0;
  }

  // Restaurar desde backup (si existe)
  restoreFromBackup() {
    console.log('🔄 Intentando restaurar desde backup...');
    
    const backup = localStorage.getItem('storageBackup');
    if (backup) {
      try {
        const backupData = JSON.parse(backup);
        Object.entries(backupData).forEach(([key, value]) => {
          localStorage.setItem(key, value);
        });
        console.log('✅ Restauración desde backup completada');
        return true;
      } catch (error) {
        console.error('❌ Error restaurando desde backup:', error);
        return false;
      }
    } else {
      console.log('⚠️ No hay backup disponible');
      return false;
    }
  }

  // Crear backup del estado actual
  createBackup() {
    console.log('💾 Creando backup del estado actual...');
    
    const backup = {};
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      backup[key] = localStorage.getItem(key);
    }
    
    localStorage.setItem('storageBackup', JSON.stringify(backup));
    console.log('✅ Backup creado');
    return true;
  }

  // === FORZAR RESET DE PANELES ===
  async forcePanelReset() {
    // Cargar funciones RASCI si no están disponibles
    await loadRasciFunctions();
    
    // Solo resetear datos si no se está importando un proyecto
    if (!window.isImportingProject) {
      // Forzar reset de datos RASCI
      if (window.rasciRoles) {
        window.rasciRoles = [];
      }
      if (window.rasciTasks) {
        window.rasciTasks = [];
      }
      if (window.rasciMatrixData) {
        window.rasciMatrixData = {};
      }
      
      // Forzar reset de datos PPI
      if (window.ppiManager && window.ppiManager.core) {
        try {
          // Limpiar arrays internos
          if (window.ppiManager.core.ppis) {
            window.ppiManager.core.ppis = [];
          }
          if (window.ppiManager.core.filteredPPIs) {
            window.ppiManager.core.filteredPPIs = [];
          }
          if (window.ppiManager.core.processedElements) {
            window.ppiManager.core.processedElements.clear();
          }
          if (window.ppiManager.core.pendingPPINOTRestore) {
            window.ppiManager.core.pendingPPINOTRestore = null;
          }
          
          // Forzar recarga de la interfaz PPI
          if (typeof window.ppiManager.refreshPPIList === 'function') {
            setTimeout(() => {
              window.ppiManager.refreshPPIList();
            }, 100);
          }
        } catch (error) {
          // Silenciar error
        }
      }
    }
    
    // Forzar recarga completa de la matriz RASCI
    setTimeout(async () => {
      try {
        // Usar funciones cargadas dinámicamente
        if (forceReloadMatrix && typeof forceReloadMatrix === 'function') {
          forceReloadMatrix();
        } else if (renderMatrix && typeof renderMatrix === 'function') {
          // Fallback a renderMatrix si forceReloadMatrix no está disponible
          const rasciPanel = document.querySelector('#rasci-panel');
          if (rasciPanel) {
            renderMatrix(rasciPanel, [], null);
          }
        } else {
          console.warn('⚠️ Funciones RASCI no disponibles para reset');
        }
      } catch (error) {
        console.warn('Error en reset de matriz RASCI:', error);
      }
    }, 200);
  }
}

// Exportar la clase
export { StorageManager };

// Crear instancia global
window.storageManager = new StorageManager(); 