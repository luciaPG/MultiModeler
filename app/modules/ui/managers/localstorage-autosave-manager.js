// === LocalStorage AutoSave Manager ===
// Sistema de autoguardado basado en localStorage con TTL y debouncing

import { resolve } from '../../../services/global-access.js';
import { RasciStore } from '../../rasci/store.js';
import { getServiceRegistry } from '../core/ServiceRegistry.js';

class LocalStorageAutoSaveManager {
  constructor() {
    // Configuración de almacenamiento
    this.STORAGE_KEY = "draft:multinotation";
    this.TTL_MS = 3 * 60 * 60 * 1000; // 3 horas
    
    // Configuración de autoguardado
    this.autoSaveEnabled = true;
    this.autoSaveInterval = null;
    this.autoSaveFrequency = 5000; // 5 segundos
    this.lastSaveTime = 0;
    this.minSaveInterval = 2000; // Mínimo 2 segundos entre guardados
    this.debounceTimeout = null;
    this.debounceDelay = 500; // 500ms debounce
    
    // Estado del proyecto
    this.projectState = {
      bpmn: {
        xml: null,
        canvas: null,
        selection: null,
        zoom: 1,
        position: { x: 0, y: 0 }
      },
      ppi: {
        indicators: [],
        relationships: {},
        lastUpdate: null
      },
      rasci: {
        roles: [],
        matrixData: {},
        tasks: []
      },
      panels: {
        activePanels: ['bpmn'],
        layout: '2v',
        order: ['bpmn']
      },
      metadata: {
        lastSave: null,
        version: '1.0.0',
        projectName: 'Proyecto BPMN'
      }
    };
    
    this.init();
  }
  
  init() {
    console.log('💾 Inicializando LocalStorage AutoSave Manager...');
    
    // Cargar estado guardado al inicializar
    this.loadState();
    
    // Verificar si hay un borrador válido al cargar
    this.checkForExistingDraft();
    
    // Configurar autoguardado automático
    this.startAutoSave();
    
    // Configurar listeners para cambios en el modeler
    this.setupModelerListeners();
    
    // Configurar listeners para cambios en PPIs
    this.setupPPIListeners();
    
    // Configurar listeners para cambios en RASCI
    this.setupRasciListeners();
    
    // Configurar listeners para cambios en paneles
    this.setupPanelListeners();
    
    // Configurar listener para beforeunload
    this.setupBeforeUnloadListener();
    
    console.log('✅ LocalStorage AutoSave Manager inicializado');
  }
  
  // === VERIFICACIÓN DE BORRADORES EXISTENTES ===
  
  checkForExistingDraft() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('ℹ️ No hay borrador guardado');
        return;
      }
      
      const storageData = JSON.parse(stored);
      
      // Verificar TTL
      if (Date.now() - storageData.savedAt > this.TTL_MS) {
        console.log('⏰ Borrador expirado, eliminando...');
        this.clearStorage();
        return;
      }
      
      // Mostrar notificación de borrador disponible
      this.showDraftNotification(storageData.savedAt);
      
    } catch (error) {
      console.error('❌ Error verificando borrador existente:', error);
    }
  }
  
  showDraftNotification(savedAt) {
    const timeAgo = this.getTimeAgo(savedAt);
    
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: #3b82f6;
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1003;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      align-items: center;
      gap: 12px;
      max-width: 400px;
    `;
    
    notification.innerHTML = `
      <i class="fas fa-file-alt" style="font-size: 16px;"></i>
      <div>
        <div style="font-weight: 600; margin-bottom: 4px;">Borrador disponible</div>
        <div style="font-size: 12px; opacity: 0.9;">Guardado hace ${timeAgo}</div>
      </div>
      <button id="restore-draft-btn" style="
        background: rgba(255, 255, 255, 0.2);
        border: none;
        color: white;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 12px;
        margin-left: 8px;
      ">Restaurar</button>
      <button id="dismiss-draft-btn" style="
        background: none;
        border: none;
        color: white;
        font-size: 18px;
        cursor: pointer;
        opacity: 0.7;
        margin-left: 8px;
      ">&times;</button>
    `;
    
    // Event listeners
    notification.querySelector('#restore-draft-btn').addEventListener('click', () => {
      this.restoreDraft();
      notification.remove();
    });
    
    notification.querySelector('#dismiss-draft-btn').addEventListener('click', () => {
      notification.remove();
    });
    
    document.body.appendChild(notification);
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 10000);
  }
  
  getTimeAgo(timestamp) {
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days} día${days > 1 ? 's' : ''}`;
    } else if (hours > 0) {
      return `${hours} hora${hours > 1 ? 's' : ''}`;
    } else if (minutes > 0) {
      return `${minutes} minuto${minutes > 1 ? 's' : ''}`;
    } else {
      return 'menos de 1 minuto';
    }
  }
  
  async restoreDraft() {
    try {
      console.log('🔄 Restaurando borrador...');
      
      // Cargar estado completo
      const success = await this.forceRestore();
      
      if (success) {
        this.showNotification('Borrador restaurado exitosamente', 'success');
      } else {
        this.showNotification('Error restaurando borrador', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error restaurando borrador:', error);
      this.showNotification('Error restaurando borrador', 'error');
    }
  }
  
  showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 80px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 6px;
      font-size: 14px;
      z-index: 1002;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 100);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
  
  // === GESTIÓN DE LOCALSTORAGE ===
  
  saveToStorage(data) {
    try {
      const storageData = {
        value: data,
        savedAt: Date.now()
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(storageData));
      console.log('💾 Datos guardados en localStorage');
      return true;
    } catch (error) {
      console.error('❌ Error guardando en localStorage:', error);
      return false;
    }
  }
  
  loadFromStorage() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        console.log('ℹ️ No hay datos guardados en localStorage');
        return null;
      }
      
      const storageData = JSON.parse(stored);
      
      // Verificar TTL
      if (Date.now() - storageData.savedAt > this.TTL_MS) {
        console.log('⏰ Datos expirados, eliminando del localStorage');
        this.clearStorage();
        return null;
      }
      
      console.log('📂 Datos cargados desde localStorage');
      return storageData.value;
    } catch (error) {
      console.error('❌ Error cargando desde localStorage:', error);
      return null;
    }
  }
  
  clearStorage() {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('🗑️ Datos eliminados del localStorage');
      return true;
    } catch (error) {
      console.error('❌ Error eliminando del localStorage:', error);
      return false;
    }
  }
  
  // === GESTIÓN DE ESTADO ===
  
  async saveState() {
    try {
      const now = Date.now();
      
      // Verificar intervalo mínimo entre guardados
      if (now - this.lastSaveTime < this.minSaveInterval) {
        return false;
      }
      
      console.log('💾 Guardando estado en localStorage...');
      
      // Actualizar estado del BPMN
      await this.updateBpmnState();
      
      // Actualizar estado de PPIs
      this.updatePPIState();
      
      // Actualizar estado de RASCI
      this.updateRasciState();
      
      // Actualizar estado de paneles
      this.updatePanelState();
      
      // Actualizar metadata
      this.projectState.metadata.lastSave = now;
      
      // Guardar en localStorage
      const success = this.saveToStorage(this.projectState);
      
      if (success) {
        this.lastSaveTime = now;
        this.showSaveIndicator();
        console.log('✅ Estado guardado en localStorage exitosamente');
        return true;
      } else {
        console.warn('⚠️ No se pudo guardar estado en localStorage');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error guardando estado:', error);
      return false;
    }
  }
  
  loadState() {
    try {
      console.log('📂 Cargando estado desde localStorage...');
      
      const savedState = this.loadFromStorage();
      
      if (savedState && savedState.metadata) {
        this.projectState = { ...this.projectState, ...savedState };
        console.log('✅ Estado cargado desde localStorage');
        
        // Aplicar estado cargado
        this.applyLoadedState();
        
        return true;
      } else {
        console.log('ℹ️ No hay estado guardado en localStorage');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error cargando estado:', error);
      return false;
    }
  }
  
  applyLoadedState() {
    try {
      // Aplicar estado de paneles
      const panelManager = resolve('PanelManagerInstance');
      if (this.projectState.panels && panelManager) {
        panelManager.activePanels = this.projectState.panels.activePanels || ['bpmn'];
        panelManager.currentLayout = this.projectState.panels.layout || '2v';
      }
      
      // Aplicar estado de PPIs
      const ppiManager = resolve('PPIManagerInstance');
      if (this.projectState.ppi && ppiManager && ppiManager.core) {
        // Los PPIs se restaurarán cuando el modeler esté listo
        console.log('🔄 PPIs marcados para restauración cuando el modeler esté listo');
      }
      
      // Aplicar estado de RASCI
      if (this.projectState.rasci) {
        RasciStore.setRoles(this.projectState.rasci.roles || []);
        RasciStore.setMatrix(this.projectState.rasci.matrixData || {});
      }
      
      console.log('✅ Estado aplicado correctamente');
      
    } catch (error) {
      console.error('❌ Error aplicando estado cargado:', error);
    }
  }
  
  // === ACTUALIZACIÓN DE ESTADOS ===
  
  async updateBpmnState() {
    try {
      const modeler = resolve('BpmnModeler');
      if (modeler) {
        // Verificar que el modelador esté inicializado antes de guardar XML
        try {
          // Guardar XML
          const xmlResult = await modeler.saveXML({ format: true });
          if (xmlResult && xmlResult.xml) {
            this.projectState.bpmn.xml = xmlResult.xml;
          }
        } catch (xmlError) {
          console.warn('⚠️ Error guardando XML del diagrama:', xmlError.message);
          this.projectState.bpmn.xml = null;
        }
        
        // Guardar estado del canvas
        try {
          const canvas = modeler.get('canvas');
          if (canvas) {
            this.projectState.bpmn.zoom = canvas.zoom();
            this.projectState.bpmn.position = canvas.viewbox();
          }
        } catch (error) {
          console.warn('⚠️ No se pudo guardar estado del canvas:', error);
        }
        
        // Guardar selección
        try {
          const selection = modeler.get('selection');
          if (selection) {
            this.projectState.bpmn.selection = selection.get();
          }
        } catch (error) {
          console.warn('⚠️ No se pudo guardar selección:', error);
        }
      }
    } catch (error) {
      console.error('❌ Error actualizando estado BPMN:', error);
    }
  }
  
  updatePPIState() {
    try {
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && ppiManager.core) {
        const ppis = ppiManager.core.getAllPPIs();
        this.projectState.ppi.indicators = ppis;
        this.projectState.ppi.lastUpdate = Date.now();
      }
    } catch (error) {
      console.error('❌ Error actualizando estado PPI:', error);
    }
  }
  
  updateRasciState() {
    try {
      this.projectState.rasci.roles = RasciStore.getRoles();
      this.projectState.rasci.matrixData = RasciStore.getMatrix();
    } catch (error) {
      console.error('❌ Error actualizando estado RASCI:', error);
    }
  }
  
  updatePanelState() {
    try {
      const panelManager = resolve('PanelManagerInstance');
      if (panelManager) {
        this.projectState.panels.activePanels = panelManager.activePanels || ['bpmn'];
        this.projectState.panels.layout = panelManager.currentLayout || '2v';
      }
    } catch (error) {
      console.error('❌ Error actualizando estado de paneles:', error);
    }
  }
  
  // === AUTOGUARDADO ===
  
  startAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
    }
    
    this.autoSaveInterval = setInterval(() => {
      if (this.autoSaveEnabled) {
        this.saveState();
      }
    }, this.autoSaveFrequency);
    
    console.log(`🔄 Autoguardado iniciado cada ${this.autoSaveFrequency}ms`);
  }
  
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
      console.log('⏹️ Autoguardado detenido');
    }
  }
  
  // === LISTENERS ===
  
  setupModelerListeners() {
    // Los listeners se configurarán cuando el modeler esté disponible
    const modeler = resolve('BpmnModeler');
    if (modeler) {
      this.attachModelerListeners();
    } else {
      // Esperar a que el modeler esté disponible
      const checkModeler = setInterval(() => {
        const modeler = resolve('BpmnModeler');
        if (modeler) {
          this.attachModelerListeners();
          clearInterval(checkModeler);
        }
      }, 1000);
    }
  }
  
  attachModelerListeners() {
    try {
      const modeler = resolve('BpmnModeler');
      const eventBus = modeler.get('eventBus');
      
      // Eventos que disparan autoguardado
      const autoSaveEvents = [
        'element.added',
        'element.changed',
        'element.removed',
        'canvas.viewbox.changed',
        'canvas.resized',
        'selection.changed'
      ];
      
      autoSaveEvents.forEach(event => {
        eventBus.on(event, () => {
          this.triggerAutoSave();
        });
      });
      
      console.log('🎧 Listeners del modeler configurados');
      
    } catch (error) {
      console.error('❌ Error configurando listeners del modeler:', error);
    }
  }
  
  setupPPIListeners() {
    // Los listeners se configurarán cuando el PPI manager esté disponible
    const ppiManager = resolve('PPIManagerInstance');
    if (ppiManager) {
      this.attachPPIListeners();
    } else {
      const checkPPI = setInterval(() => {
        const ppiManager = resolve('PPIManagerInstance');
        if (ppiManager) {
          this.attachPPIListeners();
          clearInterval(checkPPI);
        }
      }, 1000);
    }
  }
  
  attachPPIListeners() {
    try {
      // Crear un proxy para detectar cambios en PPIs
      const ppiManager = resolve('PPIManagerInstance');
      if (ppiManager && ppiManager.core) {
        const originalAddPPI = ppiManager.core.addPPI.bind(ppiManager.core);
        const originalDeletePPI = ppiManager.core.deletePPI.bind(ppiManager.core);
        
        ppiManager.core.addPPI = (ppi) => {
          const result = originalAddPPI(ppi);
          this.triggerAutoSave();
          return result;
        };
        
        ppiManager.core.deletePPI = (ppiId) => {
          const result = originalDeletePPI(ppiId);
          this.triggerAutoSave();
          return result;
        };
      }
      
      console.log('🎧 Listeners de PPI configurados');
      
    } catch (error) {
      console.error('❌ Error configurando listeners de PPI:', error);
    }
  }
  
  setupRasciListeners() {
    // Los listeners se configurarán cuando RASCI esté disponible
    const matrix = RasciStore.getMatrix();
    if (matrix && Object.keys(matrix).length > 0) {
      this.attachRasciListeners();
    } else {
      const checkRasci = setInterval(() => {
        const matrix = RasciStore.getMatrix();
        if (matrix && Object.keys(matrix).length > 0) {
          this.attachRasciListeners();
          clearInterval(checkRasci);
        }
      }, 1000);
    }
  }
  
  attachRasciListeners() {
    try {
      // TODO: Implementar observadores para RasciStore
      // Por ahora, nos basamos en el trigger manual
      console.log('🎧 Listeners de RASCI configurados (basados en triggers manuales)');
      
    } catch (error) {
      console.error('❌ Error configurando listeners de RASCI:', error);
    }
  }
  
  setupPanelListeners() {
    // Los listeners se configurarán cuando el panel manager esté disponible
    const panelManager = resolve('PanelManagerInstance');
    if (panelManager) {
      this.attachPanelListeners();
    } else {
      const checkPanel = setInterval(() => {
        const panelManager = resolve('PanelManagerInstance');
        if (panelManager) {
          this.attachPanelListeners();
          clearInterval(checkPanel);
        }
      }, 1000);
    }
  }
  
  attachPanelListeners() {
    try {
      // TODO: Implementar observadores para PanelManager
      // Por ahora, nos basamos en el trigger manual
      console.log('🎧 Listeners de paneles configurados (basados en triggers manuales)');
      
    } catch (error) {
      console.error('❌ Error configurando listeners de paneles:', error);
    }
  }
  
  setupBeforeUnloadListener() {
    // Guardar justo antes de salir de la página
    window.addEventListener('beforeunload', () => {
      if (this.autoSaveEnabled) {
        console.log('🚪 Guardando antes de salir...');
        this.saveState();
      }
    });
    
    console.log('🎧 Listener beforeunload configurado');
  }
  
  // === TRIGGERS CON DEBOUNCE ===
  
  triggerAutoSave() {
    if (this.autoSaveEnabled) {
      // Debounce para evitar demasiados guardados
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.saveState();
      }, this.debounceDelay);
    }
  }
  
  // === UI INDICATORS ===
  
  showSaveIndicator() {
    try {
      let indicator = document.getElementById('localstorage-save-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'localstorage-save-indicator';
        indicator.innerHTML = `
          <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: #10b981;
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
            <span>Guardado automático</span>
          </div>
        `;
        document.body.appendChild(indicator);
      }
      
      // Mostrar indicador
      indicator.style.opacity = '1';
      indicator.style.transform = 'translateY(0)';
      
      // Ocultar después de 2 segundos
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(-10px)';
      }, 2000);
      
    } catch (error) {
      console.warn('⚠️ Error mostrando indicador de guardado:', error);
    }
  }
  
  // === RESTAURACIÓN DE ESTADO ===
  
  async restoreBpmnState() {
    try {
      const modeler = resolve('BpmnModeler');
      if (this.projectState.bpmn.xml && modeler) {
        console.log('🔄 Restaurando estado BPMN desde localStorage...');
        
        // Restaurar XML
        await modeler.importXML(this.projectState.bpmn.xml);
        
        // Restaurar zoom y posición
        if (this.projectState.bpmn.zoom && this.projectState.bpmn.position) {
          try {
            const canvas = modeler.get('canvas');
            if (canvas) {
              canvas.zoom(this.projectState.bpmn.zoom);
              canvas.viewbox(this.projectState.bpmn.position);
            }
          } catch (error) {
            console.warn('⚠️ No se pudo restaurar zoom/posición:', error);
          }
        }
        
        // Restaurar selección
        if (this.projectState.bpmn.selection) {
          try {
            const selection = modeler.get('selection');
            if (selection) {
              selection.select(this.projectState.bpmn.selection);
            }
          } catch (error) {
            console.warn('⚠️ No se pudo restaurar selección:', error);
          }
        }
        
        console.log('✅ Estado BPMN restaurado desde localStorage');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error restaurando estado BPMN:', error);
      return false;
    }
  }
  
  restorePPIState() {
    try {
      const ppiManager = resolve('PPIManagerInstance');
      if (this.projectState.ppi.indicators && ppiManager && ppiManager.core) {
        console.log('🔄 Restaurando PPIs desde localStorage...');
        
        // Limpiar PPIs existentes
        ppiManager.core.ppis = [];
        
        // Restaurar PPIs
        this.projectState.ppi.indicators.forEach(ppi => {
          ppiManager.core.addPPI(ppi);
        });
        
        // Refrescar UI
        if (ppiManager.ui && ppiManager.ui.refreshPPIList) {
          ppiManager.ui.refreshPPIList();
        }
        
        console.log(`✅ ${this.projectState.ppi.indicators.length} PPIs restaurados desde localStorage`);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Error restaurando PPIs:', error);
      return false;
    }
  }
  
  // === MÉTODOS PÚBLICOS ===
  
  async forceSave() {
    console.log('💾 Forzando guardado manual...');
    return await this.saveState();
  }
  
  async forceRestore() {
    console.log('📂 Forzando restauración manual...');
    return this.loadState();
  }
  
  clearSavedState() {
    console.log('🗑️ Limpiando estado guardado...');
    this.clearStorage();
    this.projectState = {
      bpmn: { xml: null, canvas: null, selection: null, zoom: 1, position: { x: 0, y: 0 } },
      ppi: { indicators: [], relationships: {}, lastUpdate: null },
      rasci: { roles: [], matrixData: {}, tasks: [] },
      panels: { activePanels: ['bpmn'], layout: '2v', order: ['bpmn'] },
      metadata: { lastSave: null, version: '1.0.0', projectName: 'Proyecto BPMN' }
    };
    console.log('✅ Estado guardado limpiado');
  }
  
  getStateInfo() {
    const stored = this.loadFromStorage();
    return {
      lastSave: this.projectState.metadata.lastSave,
      bpmnSize: this.projectState.bpmn.xml ? this.projectState.bpmn.xml.length : 0,
      ppiCount: this.projectState.ppi.indicators.length,
      rasciRoles: this.projectState.rasci.roles.length,
      storageSize: stored ? JSON.stringify(stored).length : 0,
      ttlRemaining: stored ? Math.max(0, this.TTL_MS - (Date.now() - stored.savedAt)) : 0
    };
  }
  
  // === CONFIGURACIÓN ===
  
  setTTL(hours) {
    this.TTL_MS = hours * 60 * 60 * 1000;
    console.log(`⏰ TTL actualizado a ${hours} horas`);
  }
  
  setDebounceDelay(ms) {
    this.debounceDelay = ms;
    console.log(`⏱️ Debounce actualizado a ${ms}ms`);
  }
  
  setAutoSaveFrequency(ms) {
    this.autoSaveFrequency = ms;
    if (this.autoSaveInterval) {
      this.startAutoSave(); // Reiniciar con nueva frecuencia
    }
    console.log(`🔄 Frecuencia de autoguardado actualizada a ${ms}ms`);
  }
}

// Exportar la clase
export { LocalStorageAutoSaveManager };

// Register in ServiceRegistry
const registry = getServiceRegistry();
if (registry) {
  registry.register('LocalStorageAutoSaveManager', LocalStorageAutoSaveManager, { 
    description: 'Autosave (localStorage)' 
  });
  registry.register('localStorageAutoSaveManager', new LocalStorageAutoSaveManager(), { 
    description: 'Instancia autosave localStorage' 
  });
}