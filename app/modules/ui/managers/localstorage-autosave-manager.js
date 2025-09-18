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
    
    // Estado interno de restauración/avisos
    this.hasRestored = false;
    this.draftNotificationEl = null;
    this.suspended = false; // suspender autoguardado durante restauraciones
    this._autoRestoreDone = false; // restauración automática realizada una vez
    this._ppiRestoredOnce = false; // asegurar restauración PPI única
    this._postRestoreCooldownUntil = 0; // evitar reacciones inmediatas tras restaurar
    this.postRestoreCooldownMs = 2500;
    this._antiFlickerApplied = false;
    
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
    
    
  }
  
  // === VERIFICACIÓN DE BORRADORES EXISTENTES ===
  
  checkForExistingDraft() {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (!stored) {
        
        return;
      }
      
      // No mostrar si ya está restaurado
      if (this.hasRestored) {
        return;
      }

      // Mostrar aviso solo si la welcome screen está visible
      const welcome = document.getElementById('welcome-screen');
      if (welcome && welcome.style && welcome.style.display === 'none') {
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
    
    // Evitar duplicados
    if (this.draftNotificationEl && this.draftNotificationEl.parentNode) {
      return;
    }
    
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
    this.draftNotificationEl = notification;
    
    // Auto-dismiss after 10 seconds
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
        if (this.draftNotificationEl === notification) this.draftNotificationEl = null;
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
      
      // Cargar estado completo
      const success = await this.forceRestore();
      
      if (success) {
        this.hasRestored = true;
        this.dismissDraftNotification();
        this.showNotification('Borrador restaurado exitosamente', 'success');
      } else {
        this.showNotification('Error restaurando borrador', 'error');
      }
      
    } catch (error) {
      console.error('❌ Error restaurando borrador:', error);
      this.showNotification('Error restaurando borrador', 'error');
    }
  }

  dismissDraftNotification() {
    try {
      if (this.draftNotificationEl && this.draftNotificationEl.parentNode) {
        this.draftNotificationEl.remove();
      }
      this.draftNotificationEl = null;
    } catch (e) {
      // noop
    }
  }

  markRestored() {
    this.hasRestored = true;
    this.dismissDraftNotification();
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
        
        return null;
      }
      
      const storageData = JSON.parse(stored);
      
      // Verificar TTL
      if (Date.now() - storageData.savedAt > this.TTL_MS) {
        console.log('⏰ Datos expirados, eliminando del localStorage');
        this.clearStorage();
        return null;
      }
      
      // Validar contenido útil
      const value = storageData && storageData.value;
      const hasContent = value && (
        (value.bpmn && value.bpmn.xml && typeof value.bpmn.xml === 'string' && value.bpmn.xml.trim().length > 0) ||
        (value.ppi && Array.isArray(value.ppi.indicators) && value.ppi.indicators.length > 0) ||
        (value.rasci && Array.isArray(value.rasci.roles) && value.rasci.roles.length > 0)
      );
      if (!hasContent) {
        
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
      
      // No guardar si está suspendido
      if (this.suspended) {
        return false;
      }

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

  // === ESPERAS UTILITARIAS ===
  async waitFor(conditionFn, { attempts = 50, delayMs = 100 } = {}) {
    for (let i = 0; i < attempts; i++) {
      try {
        if (conditionFn()) return true;
      } catch (_) { /* no-op */ }
      // eslint-disable-next-line no-await-in-loop
      await new Promise(r => setTimeout(r, delayMs));
    }
    return false;
  }
  
  loadState() {
    try {
      // Optimización: Log eliminado para mejorar rendimiento
      
      
      const savedState = this.loadFromStorage();
      
      if (savedState && savedState.metadata) {
        this.projectState = { ...this.projectState, ...savedState };
        // Optimización: Log eliminado para mejorar rendimiento
        // 
        // Aplicar estado cargado
        this.applyLoadedState();
        
        return true;
      } else {
        
        return false;
      }
      
    } catch (error) {
      console.error('❌ Error cargando estado:', error);
      return false;
    }
  }

  // === ANTI-FLICKER (transiciones/animaciones) ===
  enableAntiFlicker() {
    try {
      if (this._antiFlickerApplied) return;
      const styleId = 'mm-anti-flicker-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          * { transition: none !important; animation: none !important; }
          html, body { will-change: auto !important; overflow: hidden !important; }
        `;
        document.head.appendChild(style);
      }
      document.documentElement.classList.add('mm-restoring');
      document.body.classList.add('mm-restoring');
      this._antiFlickerApplied = true;
    } catch (_) { /* no-op */ }
  }

  disableAntiFlicker() {
    try {
      document.documentElement.classList.remove('mm-restoring');
      document.body.classList.remove('mm-restoring');
      const style = document.getElementById('mm-anti-flicker-style');
      if (style && style.parentNode) style.parentNode.removeChild(style);
      this._antiFlickerApplied = false;
    } catch (_) { /* no-op */ }
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
        
      }
      
      // Aplicar estado de RASCI
      if (this.projectState.rasci) {
        RasciStore.setRoles(this.projectState.rasci.roles || []);
        RasciStore.setMatrix(this.projectState.rasci.matrixData || {});
      }
      
      // Optimización: Log eliminado para mejorar rendimiento
      // 
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
          // Evitar guardar si no hay diagrama cargado
          const canvas = modeler.get('canvas');
          const root = canvas && typeof canvas.getRootElement === 'function' ? canvas.getRootElement() : null;
          if (!root || !root.businessObject) {
            return;
          }
          // Alinear IDs businessObject <-> shape para PPINOT antes de serializar
          try {
            const elementRegistry = modeler.get('elementRegistry');
            const moddle = modeler.get('moddle');
            const root = canvas.getRootElement();
            const processBo = root && root.businessObject ? root.businessObject : null;
            const all = elementRegistry ? elementRegistry.getAll() : [];
            all.forEach(el => {
              const isPPINOT = (el && (el.type && el.type.startsWith('PPINOT:'))) || (el && el.businessObject && typeof el.businessObject.$type === 'string' && el.businessObject.$type.startsWith('PPINOT:'));
              if (!isPPINOT) return;
              if (el.businessObject && el.id && el.businessObject.id && el.businessObject.id !== el.id) {
                try { el.businessObject.id = el.id; } catch (_) { /* no-op */ }
              }

              // Asegurar que el BO esté en el árbol semántico: garantizar presencia en extensionElements
              if (processBo && el.businessObject) {
                try {
                  // Para evitar pérdidas tras recarga, consolidar TODOS los PPINOT bajo process.extensionElements
                  const containerBo = processBo;

                  if (!containerBo.extensionElements) {
                    containerBo.extensionElements = moddle.create('bpmn:ExtensionElements', { values: [] });
                  }
                  const exists = containerBo.extensionElements.values && containerBo.extensionElements.values.some(v => v.id === el.businessObject.id);
                  if (!exists) {
                    // Crear un clon ligero del BO PPINOT para extensión
                    const ppType = el.businessObject.$type; // ej. 'PPINOT:Target'
                    // Serializar con nombre local en minúsculas (observado en XML de PPI: <PPINOT:ppi>)
                    const parts = typeof ppType === 'string' ? ppType.split(':') : [];
                    const ns = parts[0] || 'PPINOT';
                    const localLower = (parts[1] || '').toLowerCase();
                    const extType = `${ns}:${localLower}`;
                    const ext = moddle.create(extType, {
                      id: el.businessObject.id,
                      name: el.businessObject.name || undefined
                    });
                    containerBo.extensionElements.values.push(ext);
                    // Marcar relación padre
                    ext.$parent = containerBo;
                    // Además, adjuntarlo como hijo directo para asegurar serialización visible
                    if (!Array.isArray(containerBo.$children)) {
                      containerBo.$children = [];
                    }
                    containerBo.$children.push(ext);
                    try {
                      console.log('🧩 Añadido a extensionElements:', extType, 'id:', ext.id, 'under: Process');
                    } catch (_) { /* no-op */ }
                  }
                  // Establecer también el parent del BO de canvas para consistencia si no existe
                  if (!el.businessObject.$parent) {
                    el.businessObject.$parent = containerBo;
                  }
                } catch (_) { /* no-op */ }
              }
            });
          } catch (_) { /* no-op */ }
          // Guardar XML
          const xmlResult = await modeler.saveXML({ format: true });
          if (xmlResult && xmlResult.xml) {
            this.projectState.bpmn.xml = xmlResult.xml;
            // OPTIMIZACIÓN RADICAL: Eliminar verificación XML para máximo rendimiento
            // try {
            //   const hasExt = xmlResult.xml.includes('<bpmn:extensionElements');
            //   const hasTarget = xmlResult.xml.includes('<PPINOT:Target');
            //   const hasScope = xmlResult.xml.includes('<PPINOT:Scope');
            //   console.log('🧪 XML check -> extensionElements:', hasExt, 'Target:', hasTarget, 'Scope:', hasScope);
            // } catch (_) { /* no-op */ }
          }
        } catch (xmlError) {
          console.warn('⚠️ Error guardando XML del diagrama:', xmlError.message);
          this.projectState.bpmn.xml = null;
        }
        
        // Guardar estado del canvas con validación robusta
        try {
          const canvas = modeler.get('canvas');
          if (canvas) {
            // OPTIMIZACIÓN RADICAL: Saltar verificación de salud del canvas para máximo rendimiento
            // El canvas se considera siempre saludable si tiene métodos básicos
            console.log('⚡ Saltando verificación de salud del canvas para máximo rendimiento');
            
            // Validar y guardar zoom con verificación de estado del canvas
            try {
              const zoom = canvas.zoom();
              if (typeof zoom === 'number' && !isNaN(zoom) && zoom > 0 && zoom <= 10) {
                this.projectState.bpmn.zoom = zoom;
              } else {
                console.warn('⚠️ Zoom inválido detectado, usando valor por defecto:', zoom);
                this.projectState.bpmn.zoom = 1;
              }
            } catch (zoomError) {
              console.warn('⚠️ Error obteniendo zoom:', zoomError);
              this.projectState.bpmn.zoom = 1;
            }
            
            // Validar y guardar posición con verificación de estado del canvas
            try {
              const viewbox = canvas.viewbox();
              if (viewbox && 
                  typeof viewbox.x === 'number' && !isNaN(viewbox.x) &&
                  typeof viewbox.y === 'number' && !isNaN(viewbox.y) &&
                  typeof viewbox.width === 'number' && !isNaN(viewbox.width) &&
                  typeof viewbox.height === 'number' && !isNaN(viewbox.height)) {
                // Si width o height son 0, usar valores por defecto pero mantener x, y
                if (viewbox.width <= 0 || viewbox.height <= 0) {
                  this.projectState.bpmn.position = { 
                    x: viewbox.x, 
                    y: viewbox.y, 
                    width: 1000, 
                    height: 1000 
                  };
                } else {
                  this.projectState.bpmn.position = viewbox;
                }
              } else {
                // Solo mostrar warning si realmente es inválido
                if (viewbox && (viewbox.width === 0 || viewbox.height === 0)) {
                  // No mostrar warning para viewbox con dimensiones 0, es normal durante la carga
                } else {
                  console.warn('⚠️ Viewbox inválido detectado, usando valores por defecto:', viewbox);
                }
                this.projectState.bpmn.position = { x: 0, y: 0, width: 1000, height: 1000 };
              }
            } catch (viewboxError) {
              console.warn('⚠️ Error obteniendo viewbox:', viewboxError);
              this.projectState.bpmn.position = { x: 0, y: 0, width: 1000, height: 1000 };
            }
          }
        } catch (error) {
          console.warn('⚠️ No se pudo guardar estado del canvas:', error);
          // Usar valores por defecto en caso de error
          this.projectState.bpmn.zoom = 1;
          this.projectState.bpmn.position = { x: 0, y: 0, width: 1000, height: 1000 };
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
      // Preferir PPICore registrado (fuente única) y fallback a PPIManager.core
      const registry = getServiceRegistry && getServiceRegistry();
      const ppiCore = registry ? registry.get('PPICore') : null;
      const ppiManager = resolve('PPIManagerInstance');
      let ppis = [];
      
      if (ppiCore && typeof ppiCore.getAllPPIs === 'function') {
        ppis = ppiCore.getAllPPIs();
      } else if (ppiManager && ppiManager.core && typeof ppiManager.core.getAllPPIs === 'function') {
        ppis = ppiManager.core.getAllPPIs();
      }
      
      if (Array.isArray(ppis)) {
        // Enriquecer con posiciones actuales de Scope/Target si están en el canvas
        let elementRegistry = null;
        try {
          const modeler = resolve('BpmnModeler') || (registry && registry.get && registry.get('BpmnModeler'));
          elementRegistry = modeler ? modeler.get('elementRegistry') : null;
        } catch (ignored) {
          // no-op
        }

        this.projectState.ppi.indicators = ppis.map(p => {
          const enriched = { ...p };
          if (elementRegistry && p && p.elementId) {
            const ppiShape = elementRegistry.get(p.elementId);
            if (ppiShape) {
              // Buscar elementos Scope y Target asociados al PPI
              const allElements = elementRegistry.getAll();
              const scopeElt = allElements.find(el => 
                el && el.businessObject && 
                el.businessObject.$type === 'PPINOT:Scope' &&
                el.parent === ppiShape
              );
              const targetElt = allElements.find(el => 
                el && el.businessObject && 
                el.businessObject.$type === 'PPINOT:Target' &&
                el.parent === ppiShape
              );
              
              if (scopeElt) {
                enriched.scopePosition = { x: scopeElt.x, y: scopeElt.y };
                enriched.scopeElementId = scopeElt.id;
                enriched.scope = scopeElt.businessObject.name || '';
              }
              if (targetElt) {
                enriched.targetPosition = { x: targetElt.x, y: targetElt.y };
                enriched.targetElementId = targetElt.id;
                enriched.target = targetElt.businessObject.name || '';
              }
            }
          }
          return enriched;
        });
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
      if (this.autoSaveEnabled && !this.suspended) {
        this.saveState();
      }
    }, this.autoSaveFrequency);
    
    
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
        // evitar reacciones tras zoom inicial
        // 'canvas.viewbox.changed',
        // 'canvas.resized',
        'selection.changed'
      ];
      
      autoSaveEvents.forEach(event => {
        eventBus.on(event, () => {
          this.triggerAutoSave();
        });
      });
      
      // Optimización: Log eliminado para mejorar rendimiento
      

      // Asegurar restauración de PPIs justo después de render completo del BPMN
      try {
        eventBus.on('import.done', async () => {
          try {
            // Evitar múltiples ejecuciones simultáneas o repetidas
            if (this._restoringPPI || this._ppiRestoredOnce) return;
            const hasPPIs = this.projectState && this.projectState.ppi && Array.isArray(this.projectState.ppi.indicators) && this.projectState.ppi.indicators.length > 0;
            if (!hasPPIs) return;
            // Esperar a que PPIManager esté listo
            await this.waitFor(() => {
              const mgr = resolve('PPIManagerInstance');
              return mgr && mgr.core && typeof mgr.core.addPPI === 'function';
            }, { attempts: 30, delayMs: 100 });
            // Pequeño delay para asegurar gráficos creados
            await new Promise(r => setTimeout(r, 50));
            const ok = await this.restorePPIState();
            if (ok) this._ppiRestoredOnce = true;
          } catch (_) { /* no-op */ }
        });
      } catch (_) { /* no-op */ }

      // Intentar una restauración automática única cuando el modeler está listo
      try {
        if (!this._autoRestoreDone && !this.hasRestored) {
          const hasXML = this.projectState && this.projectState.bpmn && typeof this.projectState.bpmn.xml === 'string' && this.projectState.bpmn.xml.trim().length > 0;
          const hasPPIs = this.projectState && this.projectState.ppi && Array.isArray(this.projectState.ppi.indicators) && this.projectState.ppi.indicators.length > 0;
          if (hasXML || hasPPIs) {
            this.suspendAutoSave();
            Promise.resolve()
              .then(() => hasXML ? this.restoreBpmnState() : true)
              .then(async () => {
                if (hasPPIs && !this._ppiRestoredOnce && !this._restoringPPI) {
                  console.log('🔄 Esperando a que PPIManager esté listo (auto)...');
                  await this.waitFor(() => {
                    const mgr = resolve('PPIManagerInstance');
                    return mgr && mgr.core && typeof mgr.core.addPPI === 'function';
                  }, { attempts: 50, delayMs: 100 });
                  console.log('🔄 Restaurando elementos PPINOT (auto)...');
                  const ok = await this.restorePPIState();
                  if (ok) this._ppiRestoredOnce = true;
                }
              })
              .then(() => { this.markRestored(); })
              .catch(() => { /* no-op */ })
              .finally(() => { this.resumeAutoSave(); this._autoRestoreDone = true; });
          } else {
            this._autoRestoreDone = true;
          }
        }
      } catch (e) { /* no-op */ }
      
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
        const originalUpdatePPI = ppiManager.core.updatePPI.bind(ppiManager.core);
        
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

        // Guardar cuando se actualizan PPIs (incluye target/scope)
        ppiManager.core.updatePPI = (ppiId, updatedData) => {
          const result = originalUpdatePPI(ppiId, updatedData);
          this.triggerAutoSave();
          return result;
        };
      }
      
      // También engancharse al PPICore registrado directamente (si la UI lo usa)
      const registry = getServiceRegistry && getServiceRegistry();
      const ppiCore = registry ? registry.get('PPICore') : null;
      if (ppiCore) {
        try {
          if (!ppiCore.__autosaveWrapped) {
            const coreAdd = ppiCore.addPPI && ppiCore.addPPI.bind(ppiCore);
            const coreDel = ppiCore.deletePPI && ppiCore.deletePPI.bind(ppiCore);
            const coreUpd = ppiCore.updatePPI && ppiCore.updatePPI.bind(ppiCore);
            
            if (coreAdd) {
              ppiCore.addPPI = (...args) => { const r = coreAdd(...args); this.triggerAutoSave(); return r; };
            }
            if (coreDel) {
              ppiCore.deletePPI = (...args) => { const r = coreDel(...args); this.triggerAutoSave(); return r; };
            }
            if (coreUpd) {
              ppiCore.updatePPI = (...args) => { const r = coreUpd(...args); this.triggerAutoSave(); return r; };
            }
            ppiCore.__autosaveWrapped = true;
          }
        } catch (wrapErr) {
          // noop
        }
      }
      
      // Optimización: Log eliminado para mejorar rendimiento
      
      
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
      // Optimización: Log eliminado para mejorar rendimiento
      
      
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
      // Optimización: Log eliminado para mejorar rendimiento
      
      
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
    
    // Optimización: Log eliminado para mejorar rendimiento
    
  }
  
  // === TRIGGERS CON DEBOUNCE ===
  
  triggerAutoSave() {
    // Evitar autosave durante cooldown post-restauración
    if (Date.now() < this._postRestoreCooldownUntil) {
      return;
    }
    if (this.autoSaveEnabled && !this.suspended) {
      // Debounce para evitar demasiados guardados
      clearTimeout(this.debounceTimeout);
      this.debounceTimeout = setTimeout(() => {
        this.saveState();
      }, this.debounceDelay);
    }
  }

  // === CONTROL EXTERNO ===
  suspendAutoSave() {
    this.suspended = true;
  }
  resumeAutoSave() {
    this.suspended = false;
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
  
  // === UTILIDADES DE CANVAS ===
  
  isCanvasHealthy(canvas) {
    try {
      if (!canvas) return false;
      
      // Verificar que el canvas tiene métodos básicos
      if (typeof canvas.viewbox !== 'function' || typeof canvas.zoom !== 'function') {
        return false;
      }
      
      // OPTIMIZACIÓN RADICAL: Canvas siempre saludable si tiene métodos básicos
      // Esto evita que se marque como no saludable innecesariamente
      
      return true;
      
    } catch (error) {
      console.warn('⚠️ Canvas no saludable:', error);
      return false;
    }
  }
  
  async forceCanvasReset(canvas) {
    try {
      if (!canvas) return false;
      
      // Intentar resetear el viewbox con valores seguros
      try {
        canvas.viewbox({ x: 0, y: 0, width: 1000, height: 1000 });
        
      } catch (viewboxError) {
        console.warn('⚠️ Error reseteando viewbox:', viewboxError);
      }
      
      // Intentar resetear el zoom
      try {
        canvas.zoom(1);
        
      } catch (zoomError) {
        console.warn('⚠️ Error reseteando zoom:', zoomError);
      }
      
      // Esperar más tiempo para que se estabilice
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Verificar si el canvas está saludable ahora (más permisivo)
      const isHealthy = this.isCanvasHealthy(canvas);
      if (isHealthy) {
        
        return true;
      } else {
        // Si aún no está saludable, pero tiene métodos básicos, considerarlo como "reseteado"
        if (canvas && typeof canvas.viewbox === 'function' && typeof canvas.zoom === 'function') {
          console.log('⚠️ Canvas no completamente saludable pero funcional, continuando...');
          return true;
        } else {
          console.warn('⚠️ Canvas aún no saludable después del reset');
          return false;
        }
      }
    } catch (error) {
      console.error('❌ Error en reset del canvas:', error);
      return false;
    }
  }

  // === RESTAURACIÓN DE ESTADO ===
  
  async restoreBpmnState() {
    try {
      // Protección contra ejecución múltiple
      if (this._restoringBpmn) {
        
        return true;
      }
      this._restoringBpmn = true;
      this.enableAntiFlicker();
      
      const modeler = resolve('BpmnModeler');
      if (!this.projectState.bpmn || !this.projectState.bpmn.xml || !modeler) {
        console.warn('⚠️ No hay datos BPMN para restaurar o modeler no disponible');
        this._restoringBpmn = false;
        return false;
      }
      
      
      // Preparar el canvas antes de importar
      try {
        const canvas = modeler.get('canvas');
        if (canvas) {
          // Limpiar elementos existentes
          const rootElement = canvas.getRootElement();
          if (rootElement) {
            const elements = rootElement.children.slice();
            elements.forEach(element => {
              if (element.id !== '__implicitroot_0') {
                try {
                  canvas.removeShape(element);
                } catch (removeError) {
                  console.warn('⚠️ Error removiendo elemento:', removeError);
                }
              }
            });
          }
        }
      } catch (error) {
        console.warn('⚠️ No se pudo preparar el canvas:', error);
      }
      
      // Restaurar XML
      await modeler.importXML(this.projectState.bpmn.xml);
      
      // Esperar un poco para que se procese la importación
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Restaurar zoom y posición
      if (this.projectState.bpmn.zoom && this.projectState.bpmn.position) {
        try {
          const canvas = modeler.get('canvas');
          if (canvas) {
            // Verificación de salud del canvas temporalmente deshabilitada para evitar resets innecesarios
            
            /*
            if (!this.isCanvasHealthy(canvas)) {
              console.warn('⚠️ Canvas no saludable, aplicando reset...');
              const resetSuccess = await this.forceCanvasReset(canvas);
              if (!resetSuccess) {
                console.warn('⚠️ No se pudo resetear el canvas, pero continuando con valores por defecto');
                // No retornar aquí, continuar con valores por defecto
              }
            }
            */
            
            // Validar y aplicar zoom
            const zoom = parseFloat(this.projectState.bpmn.zoom);
            if (!isNaN(zoom) && zoom > 0 && zoom <= 10) {
              try {
                // Verificar el zoom actual antes de aplicar
                const currentZoom = canvas.zoom();
                if (Math.abs(currentZoom - zoom) > 0.01) { // Solo aplicar si hay diferencia significativa
                  canvas.zoom(zoom);
                  console.log('✅ Zoom restaurado:', zoom, '(anterior:', currentZoom, ')');
                } else {
                  
                }
              } catch (zoomError) {
                console.warn('⚠️ Error aplicando zoom:', zoomError);
                // Intentar aplicar zoom por defecto si hay error
                try {
                  canvas.zoom(1);
                  
                } catch (defaultZoomError) {
                  console.warn('⚠️ No se pudo aplicar zoom por defecto:', defaultZoomError);
                }
              }
            }
            
            // Validar y aplicar posición
            const position = this.projectState.bpmn.position;
            if (position && 
                typeof position.x === 'number' && !isNaN(position.x) &&
                typeof position.y === 'number' && !isNaN(position.y) &&
                typeof position.width === 'number' && !isNaN(position.width) && position.width > 0 &&
                typeof position.height === 'number' && !isNaN(position.height) && position.height > 0) {
              try {
                // Verificar la posición actual antes de aplicar
                const currentViewbox = canvas.viewbox();
                const positionDiff = Math.abs(currentViewbox.x - position.x) + 
                                   Math.abs(currentViewbox.y - position.y) + 
                                   Math.abs(currentViewbox.width - position.width) + 
                                   Math.abs(currentViewbox.height - position.height);
                
                if (positionDiff > 1) { // Solo aplicar si hay diferencia significativa
                  canvas.viewbox(position);
                  
                } else {
                  
                }
              } catch (viewboxError) {
                console.warn('⚠️ Error aplicando viewbox:', viewboxError);
                // Intentar aplicar posición por defecto si hay error
                try {
                  canvas.viewbox({ x: 0, y: 0, width: 1000, height: 1000 });
                  
                } catch (defaultViewboxError) {
                  console.warn('⚠️ No se pudo aplicar posición por defecto:', defaultViewboxError);
                }
              }
            }
          }
        } catch (error) {
          console.warn('⚠️ Error en restauración de zoom/posición:', error);
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
      
      
      // Iniciar cooldown post-restauración para evitar reacciones inmediatas
      this._postRestoreCooldownUntil = Date.now() + this.postRestoreCooldownMs;
      this._restoringBpmn = false;
      setTimeout(() => this.disableAntiFlicker(), this.postRestoreCooldownMs);
      return true;
      
    } catch (error) {
      console.error('❌ Error restaurando estado BPMN:', error);
      this._restoringBpmn = false;
      return false;
    }
  }
  
  async restorePPIState() {
    try {
      // Protección contra ejecución múltiple
      if (this._restoringPPI) {
        
        return true;
      }
      this._restoringPPI = true;
      this.enableAntiFlicker();
      
      
      console.log('📊 Project State PPI:', this.projectState.ppi);
      
      const ppiManager = resolve('PPIManagerInstance');
      if (this.projectState.ppi.indicators && ppiManager && ppiManager.core) {
        // Optimización: Reducir logs de debug para mejorar rendimiento
        // 
        // Limpiar PPIs existentes
        ppiManager.core.ppis = [];
        
        // Restaurar PPIs (solo los que todavía existen en el canvas)
        const modelerForCheck = resolve('BpmnModeler') || (typeof getServiceRegistry === 'function' && getServiceRegistry() && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
        const elementRegistryForCheck = modelerForCheck ? modelerForCheck.get('elementRegistry') : null;
        const kept = [];
        const removed = [];
        (this.projectState.ppi.indicators || []).forEach(ppi => {
          if (!ppi || !ppi.elementId) return;
          const exists = elementRegistryForCheck ? !!elementRegistryForCheck.get(ppi.elementId) : true;
          if (exists) {
            kept.push(ppi);
            ppiManager.core.addPPI(ppi);
          } else {
            removed.push(ppi);
          }
        });
        // Si hay PPIs huérfanos (sin elemento en canvas), limpiarlos del estado y persistir
        if (removed.length) {
          this.projectState.ppi.indicators = kept;
          try { this.saveToStorage(this.projectState); } catch (e) { /* no-op */ }
        }

        // Sincronizar nombres de Scope/Target en el canvas BPMN a partir de los PPIs restaurados
        try {
          const modeler = resolve('BpmnModeler') || (typeof getServiceRegistry === 'function' && getServiceRegistry() && getServiceRegistry().get && getServiceRegistry().get('BpmnModeler'));
          if (modeler) {
            const elementRegistry = modeler.get('elementRegistry');
            const modeling = modeler.get('modeling');
            const elementFactory = modeler.get('elementFactory');
            const eventBus = modeler.get('eventBus');

            const indicators = Array.isArray(this.projectState.ppi.indicators) ? this.projectState.ppi.indicators : [];
            for (const ppi of indicators) {
              if (!ppi || !ppi.elementId) return;
              // Esperar hasta 10 intentos a que exista el PPI en el canvas
              let ppiShape = elementRegistry.get(ppi.elementId);
              let attempts = 0;
              while (!ppiShape && attempts < 10) {
                // eslint-disable-next-line no-await-in-loop
                await new Promise(r => setTimeout(r, 50));
                ppiShape = elementRegistry.get(ppi.elementId);
                attempts++;
              }
              if (!ppiShape || !ppiShape.businessObject) return;

              // Esperar de forma estricta al shape del PPI antes de crear hijos
              const waitForElementById = async (id, attempts = 15, delayMs = 100) => {
                for (let i = 0; i < attempts; i++) {
                  const found = elementRegistry.get(id);
                  if (found) return found;
                  await new Promise(r => setTimeout(r, delayMs));
                }
                return null;
              };

              if (!ppiShape) {
                ppiShape = await waitForElementById(ppi.id, 20, 100);
                if (!ppiShape) {
                  // No crear Target/Scope sin el PPI presente para evitar parenting incorrecto
                  continue;
                }
              }

              // Buscar elementos Scope y Target asociados al PPI
              const allElements = elementRegistry.getAll();
              const scopeElt = allElements.find(el => 
                el && el.businessObject && 
                el.businessObject.$type === 'PPINOT:Scope' &&
                el.parent === ppiShape
              );
              const targetElt = allElements.find(el => 
                el && el.businessObject && 
                el.businessObject.$type === 'PPINOT:Target' &&
                el.parent === ppiShape
              );

              // Si aún faltan IDs, buscar en el sistema PPINOT unificado
              if ((!ppi.scopeElementId || !ppi.targetElementId)) {
                try {
                  const ppinotStorageManager = resolve('PPINOTStorageManager');
                  if (ppinotStorageManager) {
                    const ppinotData = ppinotStorageManager.loadPPINOTElements();
                    if (ppinotData && ppinotData.elements) {
                      // Buscar Target/Scope que pertenezcan a este PPI
                      const ppiTargets = ppinotData.elements.filter(el => 
                        el.metadata && el.metadata.isTarget && el.metadata.parentId === ppi.elementId
                      );
                      const ppiScopes = ppinotData.elements.filter(el => 
                        el.metadata && el.metadata.isScope && el.metadata.parentId === ppi.elementId
                      );
                      
                      
                      console.log(`  - Targets encontrados: ${ppiTargets.length}`);
                      console.log(`  - Scopes encontrados: ${ppiScopes.length}`);
                      if (ppiTargets.length > 0) console.log(`  - Target IDs: ${ppiTargets.map(t => t.id).join(', ')}`);
                      if (ppiScopes.length > 0) console.log(`  - Scope IDs: ${ppiScopes.map(s => s.id).join(', ')}`);
                      
                      if (!ppi.scopeElementId && ppiScopes.length === 1) {
                        ppi.scopeElementId = ppiScopes[0].id;
                        
                      }
                      if (!ppi.targetElementId && ppiTargets.length === 1) {
                        ppi.targetElementId = ppiTargets[0].id;
                        
                      }
                    }
                  }
                } catch (_) { /* no-op */ }
              }

              if (typeof ppi.title === 'string' && ppi.title && ppiShape.businessObject.name !== ppi.title) {
                // Actualizar nombre del PPI principal
                try { modeling.updateLabel(ppiShape, ppi.title); } catch (_) { ppiShape.businessObject.name = ppi.title; eventBus.fire('element.changed', { element: ppiShape }); }
              }

              // Crear Scope/Target si faltan (usar IDs guardados si están disponibles)
              const defaultSize = (type) => {
                // tamaños pequeños por defecto si no están en la fábrica
                return type === 'PPINOT:Scope' ? { width: 28, height: 28 } : { width: 25, height: 25 };
              };

              let scopeShape = scopeElt;
              let targetShape = targetElt;

              // Posiciones relativas simples dentro del PPI
              const ppiCenter = { x: ppiShape.x + ppiShape.width / 2, y: ppiShape.y + ppiShape.height / 2 };

              // Obtener el contenedor correcto (root del canvas)
              // canvas disponible si se requiere más adelante
              
              if (!scopeShape) {
                const scopeBOShape = elementFactory.create('shape', { type: 'PPINOT:Scope', ...defaultSize('PPINOT:Scope') });
                const pos = (ppi.scopePosition && typeof ppi.scopePosition.x === 'number' && typeof ppi.scopePosition.y === 'number')
                  ? ppi.scopePosition
                  : { x: ppiCenter.x - 60, y: ppiCenter.y };
                scopeShape = modeling.createShape(scopeBOShape, pos, ppiShape);
                if (ppi.scopeElementId) {
                  try { scopeShape.id = ppi.scopeElementId; } catch(_) { /* ignore id assignment errors */ }
                }
              } else if (ppi.scopePosition && typeof ppi.scopePosition.x === 'number' && typeof ppi.scopePosition.y === 'number') {
                const delta = { x: ppi.scopePosition.x - scopeShape.x, y: ppi.scopePosition.y - scopeShape.y };
                if (delta.x || delta.y) modeling.moveElements([scopeShape], delta, ppiShape);
              }
              if (!targetShape) {
                const targetBOShape = elementFactory.create('shape', { type: 'PPINOT:Target', ...defaultSize('PPINOT:Target') });
                const pos = (ppi.targetPosition && typeof ppi.targetPosition.x === 'number' && typeof ppi.targetPosition.y === 'number')
                  ? ppi.targetPosition
                  : { x: ppiCenter.x + 60, y: ppiCenter.y };
                targetShape = modeling.createShape(targetBOShape, pos, ppiShape);
                if (ppi.targetElementId) {
                  try { targetShape.id = ppi.targetElementId; } catch(_) { /* ignore id assignment errors */ }
                }
              } else if (ppi.targetPosition && typeof ppi.targetPosition.x === 'number' && typeof ppi.targetPosition.y === 'number') {
                const delta = { x: ppi.targetPosition.x - targetShape.x, y: ppi.targetPosition.y - targetShape.y };
                if (delta.x || delta.y) modeling.moveElements([targetShape], delta, ppiShape);
              }

              if (scopeShape && typeof ppi.scope === 'string' && ppi.scope) {
                try { modeling.updateLabel(scopeShape, ppi.scope); } catch (_) { scopeShape.businessObject.name = ppi.scope; eventBus.fire('element.changed', { element: scopeShape }); }
              }

              if (targetShape && typeof ppi.target === 'string' && ppi.target) {
                try { modeling.updateLabel(targetShape, ppi.target); } catch (_) { targetShape.businessObject.name = ppi.target; eventBus.fire('element.changed', { element: targetShape }); }
              }
            }

            // === NUEVO: Restaurar medidas PPINOT (base y agregadas) y reparentar al PPI ===
            try {
              const sr = typeof getServiceRegistry === 'function' ? getServiceRegistry() : null;
              const ppinotStorageManager = (sr && sr.get) ? sr.get('PPINOTStorageManager') : resolve && resolve('PPINOTStorageManager');
              if (ppinotStorageManager && typeof ppinotStorageManager.loadPPINOTElements === 'function') {
                const data = ppinotStorageManager.loadPPINOTElements();
                const allEls = Array.isArray(data.elements) ? data.elements : [];
                const rels = Array.isArray(data.relationships) ? data.relationships : [];

                const isMeasureType = (t) => {
                  if (!t || typeof t !== 'string') return false;
                  return t.startsWith('PPINOT:') && (
                    t.includes('Measure') || t.includes('Aggregated') || t.includes('Derived') || t.includes('Time') || t.includes('Count') || t.includes('Data') || t.includes('State')
                  ) && !t.endsWith('Target') && !t.endsWith('Scope') && !t.endsWith('Ppi');
                };

                // Reparentar todas las medidas conocidas (NO crear nuevas)
                for (const el of allEls) {
                  const type = el.type || (el.businessObject && el.businessObject.$type) || '';
                  if (!isMeasureType(type)) continue;

                  const childId = el.id;
                  // Obtener padre por parentId o por relaciones
                  let parentId = el.parentId || null;
                  if (!parentId) {
                    const r = rels.find(r => r.childId === childId);
                    if (r) parentId = r.parentId;
                  }
                  if (!parentId) continue;

                  const parentShape = elementRegistry.get(parentId);
                  if (!parentShape) continue;

                  const childShape = elementRegistry.get(childId);
                  if (childShape) {
                    // Reparent si no está bajo el PPI esperado
                    try {
                      if (childShape.parent !== parentShape) {
                        const delta = { x: 0, y: 0 };
                        modeling.moveElements([childShape], delta, parentShape);
                        // Mover también su label externo si existe
                        if (childShape.label) {
                          try { modeling.moveElements([childShape.label], { x: 0, y: 0 }, parentShape); } catch (_) { /* no-op */ }
                        }
                      }
                    } catch (_) { /* no-op */ }
                    // Asegurar relación BO
                    try {
                      if (childShape.businessObject && parentShape.businessObject) {
                        childShape.businessObject.$parent = parentShape.businessObject;
                        // Mantener array children en el padre para facilitar futuras detecciones
                        if (!Array.isArray(parentShape.businessObject.children)) parentShape.businessObject.children = [];
                        if (!parentShape.businessObject.children.includes(childShape.businessObject)) parentShape.businessObject.children.push(childShape.businessObject);
                      }
                    } catch (_) { /* no-op */ }
                  }
                }
              }
            } catch (_) { /* no-op */ }
          }
        } catch (e) {
          // no-op: si falla la sincronización de labels, no interrumpir la restauración
        }
        
        // Refrescar UI cuando el contenedor exista, con reintentos
        const tryRefresh = (attempt = 0) => {
          try {
            const hasContainer = typeof document !== 'undefined' && document.getElementById('ppi-list');
            if (hasContainer && ppiManager.ui && typeof ppiManager.ui.refreshPPIList === 'function') {
              ppiManager.ui.refreshPPIList();
            } else if (attempt < 5) {
              setTimeout(() => tryRefresh(attempt + 1), 200);
            }
          } catch (e) {
            // ignore
          }
        };
        tryRefresh(0);
        
        
        // Debug final: verificar estado del canvas después de la restauración
        try {
          const modeler = resolve('BpmnModeler');
          if (modeler) {
            // Optimización: Variables comentadas para evitar warnings de linter y mejorar rendimiento
            // const elementRegistry = modeler.get('elementRegistry');
            // const allElements = elementRegistry.getAll();
            
            // Optimización: Variable comentada para evitar warnings de linter
            // const ppiElements = allElements.filter(el => 
            //   el && el.businessObject && el.businessObject.$type === 'PPINOT:Ppi'
            // );
            // Optimización: Variables comentadas para evitar warnings de linter
            // const targetElements = allElements.filter(el => 
            //   el && el.businessObject && el.businessObject.$type === 'PPINOT:Target'
            // );
            // const scopeElements = allElements.filter(el => 
            //   el && el.businessObject && el.businessObject.$type === 'PPINOT:Scope'
            // );
            
            // Optimización: Reducir logs de debug para mejorar rendimiento
            // 
            
            
            
            
            ppiElements.forEach(ppi => {
              const children = allElements.filter(el => el.parent === ppi);
              console.log(`  PPI ${ppi.id} tiene ${children.length} hijos`);
              children.forEach(child => {
                console.log(`    - ${child.id} (${child.businessObject ? child.businessObject.$type : 'unknown'})`);
              });
            });
          }
        } catch (error) {
          console.warn('⚠️ Error en debug final:', error);
        }
        
        this._restoringPPI = false;
        setTimeout(() => this.disableAntiFlicker(), this.postRestoreCooldownMs);
        return true;
      }
      this._restoringPPI = false;
      return false;
    } catch (error) {
      console.error('❌ Error restaurando PPIs:', error);
      this._restoringPPI = false;
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
    
    // 1) Cargar estado desde localStorage en memoria
    const loaded = this.loadState();
    if (!loaded) {
      console.warn('⚠️ No hay estado para restaurar');
      return false;
    }
    
    // 2) Suspender autoguardado durante la restauración y activar anti-flicker
    this.suspendAutoSave();
    this.enableAntiFlicker();
    
    try {
      // 3) Esperar a que el modeler esté disponible
      const modeler = resolve('BpmnModeler');
      if (!modeler) {
        console.warn('⚠️ Modeler no disponible para restauración');
        return false;
      }
      
      // 4) Importar BPMN primero
      if (this.projectState.bpmn && this.projectState.bpmn.xml) {
        
        await this.restoreBpmnState();
        
        // Esperar un poco para que el modeler procese el XML
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // 5) Restaurar PPIs (Scope/Target incluidos) una sola vez
      if (!this._ppiRestoredOnce && this.projectState.ppi && this.projectState.ppi.indicators && !this._restoringPPI) {
        console.log('🔄 Restaurando elementos PPINOT (manual)...');
        console.log('🔄 Esperando a que PPIManager esté listo (manual)...');
        // Optimización: Reducir intentos y delay para mejor rendimiento
        await this.waitFor(() => {
          const mgr = resolve('PPIManagerInstance');
          return mgr && mgr.core && typeof mgr.core.addPPI === 'function';
        }, { attempts: 10, delayMs: 50 });
        const ok = await this.restorePPIState();
        if (ok) this._ppiRestoredOnce = true;
        // Optimización: Reducir espera para mejor rendimiento
        await new Promise(resolve => setTimeout(resolve, 50));
      } else if (this._restoringPPI) {
        
      }
      // Extender cooldown tras restauración completa
      this._postRestoreCooldownUntil = Date.now() + this.postRestoreCooldownMs;
      
      this.markRestored();
      
      return true;
      
    } catch (e) {
      console.error('❌ Error en restauración completa:', e);
      return false;
    } finally {
      this.resumeAutoSave();
      // Quitar anti-flicker tras cooldown
      setTimeout(() => this.disableAntiFlicker(), this.postRestoreCooldownMs);
      this._forceRestoreInProgress = false; // Limpiar flag
    }
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
    
  }
}

// Exportar la clase
export { LocalStorageAutoSaveManager };

// Register in ServiceRegistry
// DESHABILITADO: El nuevo AutosaveManager limpio se registra en su lugar
// const registry = getServiceRegistry();
// if (registry) {
//   registry.register('LocalStorageAutoSaveManager', LocalStorageAutoSaveManager, { 
//     description: 'Autosave (localStorage)' 
//   });
//   registry.register('localStorageAutoSaveManager', new LocalStorageAutoSaveManager(), { 
//     description: 'Instancia autosave localStorage' 
//   });
// }