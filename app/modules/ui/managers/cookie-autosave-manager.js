// === Cookie AutoSave Manager ===
// Sistema de autoguardado basado en cookies que se integra con el panel manager

class CookieAutoSaveManager {
  constructor() {
    this.cookieName = 'bpmn_autosave_data';
    this.maxCookieSize = 4096; // Tamaño máximo de cookie (4KB)
    this.autoSaveEnabled = true;
    this.autoSaveInterval = null;
    this.autoSaveFrequency = 5000; // 5 segundos
    this.lastSaveTime = 0;
    this.minSaveInterval = 2000; // Mínimo 2 segundos entre guardados
    this.compressionEnabled = true;
    
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
    console.log('🍪 Inicializando Cookie AutoSave Manager...');
    
    // Cargar estado guardado al inicializar
    this.loadState();
    
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
    
    console.log('✅ Cookie AutoSave Manager inicializado');
  }
  
  // === GESTIÓN DE COOKIES ===
  
  setCookie(name, value, days = 7) {
    try {
      const expires = new Date();
      expires.setTime(expires.getTime() + (days * 24 * 60 * 60 * 1000));
      const cookieValue = encodeURIComponent(JSON.stringify(value));
      
      // Verificar tamaño de cookie
      if (cookieValue.length > this.maxCookieSize) {
        console.warn('⚠️ Cookie demasiado grande, comprimiendo...');
        const compressed = this.compressData(value);
        if (compressed.length > this.maxCookieSize) {
          console.error('❌ Cookie demasiado grande incluso comprimida');
          return false;
        }
        document.cookie = `${name}=${encodeURIComponent(compressed)};expires=${expires.toUTCString()};path=/`;
      } else {
        document.cookie = `${name}=${cookieValue};expires=${expires.toUTCString()};path=/`;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Error guardando cookie:', error);
      return false;
    }
  }
  
  getCookie(name) {
    try {
      const nameEQ = name + "=";
      const ca = document.cookie.split(';');
      
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          const value = c.substring(nameEQ.length, c.length);
          const decoded = decodeURIComponent(value);
          
          // Intentar descomprimir si es necesario
          try {
            return JSON.parse(decoded);
          } catch {
            // Si falla JSON.parse, intentar descomprimir
            try {
              return this.decompressData(decoded);
            } catch {
              console.warn('⚠️ No se pudo descomprimir cookie, usando valor raw');
              return decoded;
            }
          }
        }
      }
      return null;
    } catch (error) {
      console.error('❌ Error leyendo cookie:', error);
      return null;
    }
  }
  
  deleteCookie(name) {
    document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/;`;
  }
  
  // === COMPRESIÓN DE DATOS ===
  
  compressData(data) {
    if (!this.compressionEnabled) {
      return JSON.stringify(data);
    }
    
    try {
      const jsonString = JSON.stringify(data);
      // Compresión simple usando LZString si está disponible
      if (typeof LZString !== 'undefined') {
        return LZString.compress(jsonString);
      }
      // Fallback: compresión básica
      return this.basicCompress(jsonString);
    } catch (error) {
      console.warn('⚠️ Error comprimiendo datos, usando JSON sin comprimir');
      return JSON.stringify(data);
    }
  }
  
  decompressData(compressedData) {
    if (!this.compressionEnabled) {
      return JSON.parse(compressedData);
    }
    
    try {
      // Intentar descomprimir con LZString
      if (typeof LZString !== 'undefined') {
        const decompressed = LZString.decompress(compressedData);
        return JSON.parse(decompressed);
      }
      // Fallback: descompresión básica
      const decompressed = this.basicDecompress(compressedData);
      return JSON.parse(decompressed);
    } catch (error) {
      console.warn('⚠️ Error descomprimiendo datos, intentando JSON directo');
      return JSON.parse(compressedData);
    }
  }
  
  basicCompress(str) {
    // Compresión básica: eliminar espacios innecesarios
    return str.replace(/\s+/g, ' ').trim();
  }
  
  basicDecompress(str) {
    // Descompresión básica: no hace nada especial
    return str;
  }
  
  // === GESTIÓN DE ESTADO ===
  
  async saveState() {
    try {
      const now = Date.now();
      
      // Verificar intervalo mínimo entre guardados
      if (now - this.lastSaveTime < this.minSaveInterval) {
        return false;
      }
      
      console.log('💾 Guardando estado en cookies...');
      
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
      
      // Guardar en cookie
      const success = this.setCookie(this.cookieName, this.projectState);
      
      if (success) {
        this.lastSaveTime = now;
        this.showSaveIndicator();
        console.log('✅ Estado guardado en cookies exitosamente');
        return true;
      } else {
        console.warn('⚠️ No se pudo guardar estado en cookies');
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error guardando estado:', error);
      return false;
    }
  }
  
  loadState() {
    try {
      console.log('📂 Cargando estado desde cookies...');
      
      const savedState = this.getCookie(this.cookieName);
      
      if (savedState && savedState.metadata) {
        this.projectState = { ...this.projectState, ...savedState };
        console.log('✅ Estado cargado desde cookies');
        
        // Aplicar estado cargado
        this.applyLoadedState();
        
        return true;
      } else {
        console.log('ℹ️ No hay estado guardado en cookies');
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
      if (this.projectState.panels && window.panelManager) {
        window.panelManager.activePanels = this.projectState.panels.activePanels || ['bpmn'];
        window.panelManager.currentLayout = this.projectState.panels.layout || '2v';
      }
      
      // Aplicar estado de PPIs
      if (this.projectState.ppi && window.ppiManager && window.ppiManager.core) {
        // Los PPIs se restaurarán cuando el modeler esté listo
        console.log('🔄 PPIs marcados para restauración cuando el modeler esté listo');
      }
      
      // Aplicar estado de RASCI
      if (this.projectState.rasci) {
        if (window.rasciRoles) {
          window.rasciRoles = this.projectState.rasci.roles || [];
        }
        if (window.rasciMatrixData) {
          window.rasciMatrixData = this.projectState.rasci.matrixData || {};
        }
      }
      
      console.log('✅ Estado aplicado correctamente');
      
    } catch (error) {
      console.error('❌ Error aplicando estado cargado:', error);
    }
  }
  
  // === ACTUALIZACIÓN DE ESTADOS ===
  
  async updateBpmnState() {
    try {
      if (window.modeler) {
        // Guardar XML
        const xmlResult = await window.modeler.saveXML({ format: true });
        if (xmlResult && xmlResult.xml) {
          this.projectState.bpmn.xml = xmlResult.xml;
        }
        
        // Guardar estado del canvas
        try {
          const canvas = window.modeler.get('canvas');
          if (canvas) {
            this.projectState.bpmn.zoom = canvas.zoom();
            this.projectState.bpmn.position = canvas.viewbox();
          }
        } catch (error) {
          console.warn('⚠️ No se pudo guardar estado del canvas:', error);
        }
        
        // Guardar selección
        try {
          const selection = window.modeler.get('selection');
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
      if (window.ppiManager && window.ppiManager.core) {
        const ppis = window.ppiManager.core.getAllPPIs();
        this.projectState.ppi.indicators = ppis;
        this.projectState.ppi.lastUpdate = Date.now();
      }
    } catch (error) {
      console.error('❌ Error actualizando estado PPI:', error);
    }
  }
  
  updateRasciState() {
    try {
      if (window.rasciRoles) {
        this.projectState.rasci.roles = window.rasciRoles;
      }
      if (window.rasciMatrixData) {
        this.projectState.rasci.matrixData = window.rasciMatrixData;
      }
    } catch (error) {
      console.error('❌ Error actualizando estado RASCI:', error);
    }
  }
  
  updatePanelState() {
    try {
      if (window.panelManager) {
        this.projectState.panels.activePanels = window.panelManager.activePanels || ['bpmn'];
        this.projectState.panels.layout = window.panelManager.currentLayout || '2v';
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
    if (window.modeler) {
      this.attachModelerListeners();
    } else {
      // Esperar a que el modeler esté disponible
      const checkModeler = setInterval(() => {
        if (window.modeler) {
          this.attachModelerListeners();
          clearInterval(checkModeler);
        }
      }, 1000);
    }
  }
  
  attachModelerListeners() {
    try {
      const eventBus = window.modeler.get('eventBus');
      
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
    if (window.ppiManager) {
      this.attachPPIListeners();
    } else {
      const checkPPI = setInterval(() => {
        if (window.ppiManager) {
          this.attachPPIListeners();
          clearInterval(checkPPI);
        }
      }, 1000);
    }
  }
  
  attachPPIListeners() {
    try {
      // Crear un proxy para detectar cambios en PPIs
      if (window.ppiManager.core) {
        const originalAddPPI = window.ppiManager.core.addPPI.bind(window.ppiManager.core);
        const originalDeletePPI = window.ppiManager.core.deletePPI.bind(window.ppiManager.core);
        
        window.ppiManager.core.addPPI = (ppi) => {
          const result = originalAddPPI(ppi);
          this.triggerAutoSave();
          return result;
        };
        
        window.ppiManager.core.deletePPI = (ppiId) => {
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
    if (window.rasciMatrixData) {
      this.attachRasciListeners();
    } else {
      const checkRasci = setInterval(() => {
        if (window.rasciMatrixData) {
          this.attachRasciListeners();
          clearInterval(checkRasci);
        }
      }, 1000);
    }
  }
  
  attachRasciListeners() {
    try {
      // Crear un proxy para detectar cambios en RASCI
      const originalMatrixData = window.rasciMatrixData;
      
      window.rasciMatrixData = new Proxy(originalMatrixData, {
        set: (target, property, value) => {
          target[property] = value;
          this.triggerAutoSave();
          return true;
        }
      });
      
      console.log('🎧 Listeners de RASCI configurados');
      
    } catch (error) {
      console.error('❌ Error configurando listeners de RASCI:', error);
    }
  }
  
  setupPanelListeners() {
    // Los listeners se configurarán cuando el panel manager esté disponible
    if (window.panelManager) {
      this.attachPanelListeners();
    } else {
      const checkPanel = setInterval(() => {
        if (window.panelManager) {
          this.attachPanelListeners();
          clearInterval(checkPanel);
        }
      }, 1000);
    }
  }
  
  attachPanelListeners() {
    try {
      // Interceptar cambios en paneles activos
      const originalActivePanels = window.panelManager.activePanels;
      
      Object.defineProperty(window.panelManager, 'activePanels', {
        get: function() {
          return originalActivePanels;
        },
        set: function(value) {
          originalActivePanels.length = 0;
          originalActivePanels.push(...value);
          if (window.cookieAutoSaveManager) {
            window.cookieAutoSaveManager.triggerAutoSave();
          }
        }
      });
      
      console.log('🎧 Listeners de paneles configurados');
      
    } catch (error) {
      console.error('❌ Error configurando listeners de paneles:', error);
    }
  }
  
  // === TRIGGERS ===
  
  triggerAutoSave() {
    if (this.autoSaveEnabled) {
      // Debounce para evitar demasiados guardados
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = setTimeout(() => {
        this.saveState();
      }, 1000);
    }
  }
  
  // === UI INDICATORS ===
  
  showSaveIndicator() {
    try {
      let indicator = document.getElementById('cookie-save-indicator');
      if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'cookie-save-indicator';
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
            <i class="fas fa-cookie-bite" style="font-size: 10px;"></i>
            <span>Guardado en cookies</span>
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
      if (this.projectState.bpmn.xml && window.modeler) {
        console.log('🔄 Restaurando estado BPMN desde cookies...');
        
        // Restaurar XML
        await window.modeler.importXML(this.projectState.bpmn.xml);
        
        // Restaurar zoom y posición
        if (this.projectState.bpmn.zoom && this.projectState.bpmn.position) {
          try {
            const canvas = window.modeler.get('canvas');
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
            const selection = window.modeler.get('selection');
            if (selection) {
              selection.select(this.projectState.bpmn.selection);
            }
          } catch (error) {
            console.warn('⚠️ No se pudo restaurar selección:', error);
          }
        }
        
        console.log('✅ Estado BPMN restaurado desde cookies');
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
      if (this.projectState.ppi.indicators && window.ppiManager && window.ppiManager.core) {
        console.log('🔄 Restaurando PPIs desde cookies...');
        
        // Limpiar PPIs existentes
        window.ppiManager.core.ppis = [];
        
        // Restaurar PPIs
        this.projectState.ppi.indicators.forEach(ppi => {
          window.ppiManager.core.addPPI(ppi);
        });
        
        // Refrescar UI
        if (window.ppiManager.ui && window.ppiManager.ui.refreshPPIList) {
          window.ppiManager.ui.refreshPPIList();
        }
        
        console.log(`✅ ${this.projectState.ppi.indicators.length} PPIs restaurados desde cookies`);
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
    this.deleteCookie(this.cookieName);
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
    return {
      lastSave: this.projectState.metadata.lastSave,
      bpmnSize: this.projectState.bpmn.xml ? this.projectState.bpmn.xml.length : 0,
      ppiCount: this.projectState.ppi.indicators.length,
      rasciRoles: this.projectState.rasci.roles.length,
      cookieSize: this.getCookie(this.cookieName) ? JSON.stringify(this.getCookie(this.cookieName)).length : 0
    };
  }
}

// Exportar la clase
export { CookieAutoSaveManager };

// Crear instancia global
window.CookieAutoSaveManager = CookieAutoSaveManager;
window.cookieAutoSaveManager = new CookieAutoSaveManager();
