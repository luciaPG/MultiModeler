// === Storage Manager ===
// Gestor centralizado de localStorage para MultiModeler

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
    console.log('🔧 Inicializando StorageManager...');
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
    console.log('🧹 RESETEO COMPLETO: Limpiando localStorage y creando diagrama nuevo...');
    
    try {
      // 1. Limpiar localStorage preservando solo preferencias
      this.clearStorage();
      
      // 2. Crear diagrama BPMN limpio
      await this.createCleanBpmnDiagram();
      
      // 3. Resetear variables globales
      this.resetGlobalVariables();
      
      // 4. Configurar estado inicial
      this.setInitialState();
      
      console.log('✅ RESETEO COMPLETO: localStorage reseteado y diagrama nuevo creado');
      return true;
      
    } catch (error) {
      console.error('❌ Error en resetStorage:', error);
      return false;
    }
  }

  // === LIMPIEZA PARA IMPORTACIÓN ===
  // Para "Abrir Diagrama" - Limpiar y preparar para importar
  async prepareForImport() {
    console.log('🧹 PREPARACIÓN PARA IMPORTACIÓN: Limpiando localStorage...');
    
    try {
      // 1. Limpiar localStorage preservando solo preferencias
      this.clearStorage();
      
      // 2. Resetear variables globales
      this.resetGlobalVariables();
      
      // 3. Configurar estado de importación
      this.setImportState();
      
          console.log('✅ PREPARACIÓN PARA IMPORTACIÓN: localStorage listo para importar');
    this.logStorageState(); // Añadido: Log del estado FINAL después de la preparación
    return true;
      
    } catch (error) {
      console.error('❌ Error en prepareForImport:', error);
      return false;
    }
  }

  // === LIMPIEZA BÁSICA ===
  clearStorage() {
    console.log('🧹 Limpiando localStorage...');
    this.logStorageState(); // Añadido: Log del estado ANTES de la limpieza
    
    // Primero limpiar datos PPI específicos
    this.clearPPIData();
    
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
      console.log(`🗑️ Eliminando: ${key}`);
      localStorage.removeItem(key);
    });
    
    console.log(`✅ localStorage limpiado. Elementos restantes: ${localStorage.length}`);
    this.logStorageState();
  }

  // === RESETEO DE VARIABLES GLOBALES ===
  resetGlobalVariables() {
    console.log('🔄 Reseteando variables globales...');
    
    // Variables RASCI
    if (window.rasciRoles) window.rasciRoles = [];
    if (window.rasciTasks) window.rasciTasks = [];
    if (window.rasciMatrixData) window.rasciMatrixData = {};
    
    // Variables PPI - Verificar que el método existe antes de llamarlo
    if (window.ppiManager && window.ppiManager.core && typeof window.ppiManager.core.clearAllPPIs === 'function') {
      try {
        window.ppiManager.core.clearAllPPIs();
      } catch (error) {
        console.warn('⚠️ Error al limpiar PPIs:', error);
      }
    } else {
      console.log('ℹ️ ppiManager.core.clearAllPPIs no disponible, omitiendo limpieza de PPIs');
    }
    
    // Variables BPMN
    if (window.modeler) {
      // El modeler se manejará por separado
      console.log('📊 Modeler detectado, se manejará por separado');
    }
    
    console.log('✅ Variables globales reseteadas');
  }

  // === LIMPIEZA ESPECÍFICA DE DATOS PPI ===
  clearPPIData() {
    console.log('🧹 Limpiando datos PPI específicos...');
    
    // Limpiar claves PPI del localStorage
    this.ppiKeysToClean.forEach(key => {
      if (localStorage.getItem(key)) {
        console.log(`🗑️ Eliminando clave PPI: ${key}`);
        localStorage.removeItem(key);
      }
    });
    
    // Limpiar variables globales PPI
    if (window.ppiIndicators) window.ppiIndicators = [];
    if (window.ppiRelationships) window.ppiRelationships = {};
    if (window.ppis) window.ppis = [];
    if (window.ppinotElements) window.ppinotElements = [];
    
    console.log('✅ Datos PPI limpiados');
  }

  // === CREAR DIAGRAMA BPMN LIMPIO ===
  async createCleanBpmnDiagram() {
    console.log('📊 Creando diagrama BPMN limpio...');
    
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
    
    // Limpiar datos PPI antes de configurar estado inicial
    this.clearPPIData();
    
    // Configurar paneles por defecto
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
    localStorage.setItem('bpmnPPINOTElements', JSON.stringify([]));
    localStorage.setItem('bpmnRALPHElements', JSON.stringify([]));
    localStorage.setItem('bpmnParentChildRelations', JSON.stringify({}));
    localStorage.setItem('bpmnPPINOTRelations', JSON.stringify({}));
    
    // Configuraciones PPI (limpias)
    localStorage.setItem('ppiIndicators', JSON.stringify([]));
    localStorage.setItem('ppiRelationships', JSON.stringify({}));
    localStorage.setItem('ppis', JSON.stringify([]));
    localStorage.setItem('ppinotElements', JSON.stringify([]));
    localStorage.setItem('ppiSettings', JSON.stringify({}));
    
    // Configuraciones RASCI
    localStorage.setItem('rasciRoles', JSON.stringify([]));
    localStorage.setItem('rasciMatrixData', JSON.stringify({}));
    localStorage.setItem('rasciTasks', JSON.stringify([]));
    localStorage.setItem('rasciSettings', JSON.stringify({}));
    
    console.log('✅ Estado inicial configurado');
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
}

// Exportar la clase
window.StorageManager = StorageManager;

// Crear instancia global
window.storageManager = new StorageManager(); 