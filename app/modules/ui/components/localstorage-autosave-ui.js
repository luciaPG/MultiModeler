// === LocalStorage AutoSave UI Component ===
// Componente de interfaz para gestionar el autoguardado en localStorage

import { getServiceRegistry } from '../core/ServiceRegistry.js';

class LocalStorageAutoSaveUI {
  constructor() {
    this.container = null;
    this.manager = null;
    this.updateInterval = null;
    this.init();
  }
  
  init() {
    console.log('🎨 Inicializando LocalStorage AutoSave UI...');
    
    // Esperar a que el ServiceRegistry esté disponible
    const checkRegistry = setInterval(() => {
      const registry = getServiceRegistry();
      if (registry) {
        this.manager = registry.get('localStorageAutoSaveManager');
        if (this.manager) {
          this.setupExistingUI();
          this.setupEventListeners();
          this.startStatusUpdates();
          clearInterval(checkRegistry);
          console.log('✅ LocalStorage AutoSave UI inicializado');
        }
      }
    }, 1000);
  }
  
  setupExistingUI() {
    // Usar la estructura existente en el HTML
    this.container = document.getElementById('autosave-panel');
    if (!this.container) {
      console.warn('⚠️ No se encontró el contenedor de autosave, creando uno nuevo');
      this.createFallbackUI();
      return;
    }
    
    // Agregar botones de acción al contenedor existente
    this.addActionButtons();
    
    // Agregar estilos específicos
    this.addStyles();
  }
  
  createFallbackUI() {
    // Crear contenedor de respaldo si no existe
    this.container = document.createElement('div');
    this.container.id = 'autosave-panel';
    this.container.className = 'autosave-toolbar-toggle';
    this.container.innerHTML = `
      <div class="autosave-toggle-container">
        <label class="autosave-toggle">
          <input type="checkbox" id="autosave-toggle" checked>
          <span class="autosave-slider"></span>
        </label>
        <span class="autosave-label">Autoguardado</span>
      </div>
      <div class="autosave-timestamp" id="autosave-timestamp">
        <i class="fas fa-clock"></i>
        <span>--:--</span>
      </div>
    `;
    
    // Insertar en la toolbar existente
    const toolbar = document.querySelector('.toolbar .tool-group');
    if (toolbar) {
      toolbar.appendChild(this.container);
    } else {
      document.body.appendChild(this.container);
    }
    
    this.addActionButtons();
    this.addStyles();
  }
  
  addActionButtons() {
    // Crear contenedor de acciones
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'autosave-actions';
    actionsContainer.innerHTML = `
      <button id="clear-draft-btn" class="autosave-action-btn" title="Limpiar borrador">
        <i class="fas fa-trash"></i>
      </button>
      <button id="force-save-btn" class="autosave-action-btn" title="Guardar ahora">
        <i class="fas fa-save"></i>
      </button>
      <button id="autosave-info-btn" class="autosave-action-btn" title="Información">
        <i class="fas fa-info-circle"></i>
      </button>
    `;
    
    // Insertar después del timestamp
    const timestamp = this.container.querySelector('.autosave-timestamp');
    if (timestamp) {
      timestamp.parentNode.insertBefore(actionsContainer, timestamp.nextSibling);
    } else {
      this.container.appendChild(actionsContainer);
    }
  }
  
  addStyles() {
    const styleId = 'localstorage-autosave-ui-styles';
    if (document.getElementById(styleId)) return;
    
    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      /* Estilos para la toolbar integrada */
      .autosave-toolbar-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        padding: 6px 12px;
        background: #ffffff;
        border: 1px solid #e5e7eb;
        border-radius: 6px;
        transition: all 0.2s ease;
        min-width: 160px;
      }
      
      .autosave-toolbar-toggle:hover {
        background: #f8fafc;
        border-color: #cbd5e1;
      }
      
      .autosave-toggle-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      
      .autosave-toggle {
        position: relative;
        display: inline-block;
        width: 36px;
        height: 20px;
        cursor: pointer;
      }
      
      .autosave-toggle input {
        opacity: 0;
        width: 0;
        height: 0;
      }
      
      .autosave-slider {
        position: absolute;
        cursor: pointer;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: #cbd5e1;
        transition: 0.3s ease;
        border-radius: 20px;
      }
      
      .autosave-slider:before {
        position: absolute;
        content: "";
        height: 16px;
        width: 16px;
        left: 2px;
        bottom: 2px;
        background-color: white;
        transition: 0.3s ease;
        border-radius: 50%;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
      }
      
      .autosave-toggle input:checked + .autosave-slider {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      }
      
      .autosave-toggle input:checked + .autosave-slider:before {
        transform: translateX(16px);
      }
      
      .autosave-label {
        font-size: 13px;
        font-weight: 500;
        color: #374151;
        white-space: nowrap;
      }
      
      .autosave-timestamp {
        display: flex;
        align-items: center;
        gap: 4px;
        font-size: 11px;
        color: #6b7280;
        padding-left: 8px;
        border-left: 1px solid #e5e7eb;
        white-space: nowrap;
        min-width: 45px;
      }
      
      .autosave-actions {
        display: flex;
        gap: 4px;
        margin-left: auto;
      }
      
      .autosave-action-btn {
        background: none;
        border: none;
        padding: 4px 6px;
        border-radius: 4px;
        cursor: pointer;
        color: #6b7280;
        transition: all 0.2s ease;
        font-size: 12px;
      }
      
      .autosave-action-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }
      
      .autosave-action-btn:active {
        transform: scale(0.95);
      }
      
      /* Estados */
      .autosave-toolbar-toggle.active {
        border-color: #059669;
        background: rgba(5, 150, 105, 0.05);
      }
      
      .autosave-toolbar-toggle.active .autosave-label {
        color: #059669;
        font-weight: 600;
      }
      
      .autosave-toolbar-toggle.saving {
        border-color: #f59e0b;
        background: rgba(245, 158, 11, 0.05);
      }
      
      .autosave-toolbar-toggle.saving .autosave-label {
        color: #f59e0b;
      }
      
      .autosave-toolbar-toggle.error {
        border-color: #ef4444;
        background: rgba(239, 68, 68, 0.05);
      }
      
      .autosave-toolbar-toggle.error .autosave-label {
        color: #ef4444;
      }
      
      /* Modal de información */
      .autosave-info-modal {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        border-radius: 8px;
        padding: 24px;
        box-shadow: 0 10px 25px rgba(0, 0, 0, 0.2);
        z-index: 1001;
        max-width: 400px;
        width: 90%;
      }
      
      .autosave-info-modal h3 {
        margin: 0 0 16px 0;
        color: #374151;
        font-size: 18px;
      }
      
      .autosave-info-modal .info-item {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        padding: 8px 0;
        border-bottom: 1px solid #f3f4f6;
      }
      
      .autosave-info-modal .info-label {
        font-weight: 500;
        color: #6b7280;
      }
      
      .autosave-info-modal .info-value {
        color: #374151;
      }
      
      .autosave-info-modal .close-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        background: none;
        border: none;
        font-size: 18px;
        cursor: pointer;
        color: #6b7280;
      }
      
      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        z-index: 1000;
      }
    `;
    
    document.head.appendChild(style);
  }
  
  setupEventListeners() {
    if (!this.container) return;
    
    // Toggle de autoguardado
    const toggle = this.container.querySelector('#autosave-checkbox') || this.container.querySelector('#autosave-toggle');
    if (toggle) {
      toggle.addEventListener('change', (e) => {
        this.manager.autoSaveEnabled = e.target.checked;
        this.updateUI();
        console.log(`Autoguardado ${e.target.checked ? 'activado' : 'desactivado'}`);
      });
    }
    
    // Botón limpiar borrador
    const clearBtn = this.container.querySelector('#clear-draft-btn');
    if (clearBtn) {
      clearBtn.addEventListener('click', () => {
        this.clearDraft();
      });
    }
    
    // Botón guardar ahora
    const saveBtn = this.container.querySelector('#force-save-btn');
    if (saveBtn) {
      saveBtn.addEventListener('click', () => {
        this.forceSave();
      });
    }
    
    // Botón información
    const infoBtn = this.container.querySelector('#autosave-info-btn');
    if (infoBtn) {
      infoBtn.addEventListener('click', () => {
        this.showInfo();
      });
    }
  }
  
  async clearDraft() {
    if (!this.manager) return;
    
    try {
      this.container.classList.add('saving');
      
      // Mostrar confirmación
      const confirmed = confirm('¿Estás seguro de que quieres eliminar el borrador guardado? Esta acción no se puede deshacer.');
      
      if (confirmed) {
        this.manager.clearSavedState();
        this.updateUI();
        this.showNotification('Borrador eliminado', 'success');
      }
    } catch (error) {
      console.error('Error eliminando borrador:', error);
      this.showNotification('Error eliminando borrador', 'error');
    } finally {
      this.container.classList.remove('saving');
    }
  }
  
  async forceSave() {
    if (!this.manager) return;
    
    try {
      this.container.classList.add('saving');
      
      const success = await this.manager.forceSave();
      
      if (success) {
        this.showNotification('Guardado manual exitoso', 'success');
      } else {
        this.showNotification('Error en guardado manual', 'error');
      }
      
      this.updateUI();
    } catch (error) {
      console.error('Error en guardado manual:', error);
      this.showNotification('Error en guardado manual', 'error');
    } finally {
      this.container.classList.remove('saving');
    }
  }
  
  showInfo() {
    if (!this.manager) return;
    
    const info = this.manager.getStateInfo();
    const ttlHours = Math.floor(this.manager.TTL_MS / (1000 * 60 * 60));
    const ttlRemainingHours = Math.floor(info.ttlRemaining / (1000 * 60 * 60));
    const ttlRemainingMinutes = Math.floor((info.ttlRemaining % (1000 * 60 * 60)) / (1000 * 60));
    
    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="autosave-info-modal">
        <button class="close-btn">&times;</button>
        <h3>Información de Autoguardado</h3>
        <div class="info-item">
          <span class="info-label">Estado:</span>
          <span class="info-value">${this.manager.autoSaveEnabled ? 'Activo' : 'Inactivo'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Último guardado:</span>
          <span class="info-value">${info.lastSave ? new Date(info.lastSave).toLocaleString() : 'Nunca'}</span>
        </div>
        <div class="info-item">
          <span class="info-label">TTL:</span>
          <span class="info-value">${ttlHours} horas</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tiempo restante:</span>
          <span class="info-value">${ttlRemainingHours}h ${ttlRemainingMinutes}m</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tamaño BPMN:</span>
          <span class="info-value">${(info.bpmnSize / 1024).toFixed(1)} KB</span>
        </div>
        <div class="info-item">
          <span class="info-label">PPIs guardados:</span>
          <span class="info-value">${info.ppiCount}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Roles RASCI:</span>
          <span class="info-value">${info.rasciRoles}</span>
        </div>
        <div class="info-item">
          <span class="info-label">Tamaño total:</span>
          <span class="info-value">${(info.storageSize / 1024).toFixed(1)} KB</span>
        </div>
      </div>
    `;
    
    // Cerrar modal
    modal.addEventListener('click', (e) => {
      if (e.target === modal || e.target.classList.contains('close-btn')) {
        modal.remove();
      }
    });
    
    document.body.appendChild(modal);
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
  
  updateUI() {
    if (!this.container || !this.manager) return;
    
    const toggle = this.container.querySelector('#autosave-checkbox') || this.container.querySelector('#autosave-toggle');
    const timestamp = this.container.querySelector('#autosave-timestamp span') || this.container.querySelector('#timestamp-text');
    
    // Actualizar toggle
    if (toggle) {
      toggle.checked = this.manager.autoSaveEnabled;
    }
    
    // Actualizar timestamp
    if (timestamp) {
      const info = this.manager.getStateInfo();
      if (info.lastSave) {
        const lastSave = new Date(info.lastSave);
        const now = new Date();
        const diffMs = now - lastSave;
        const diffMinutes = Math.floor(diffMs / (1000 * 60));
        
        if (diffMinutes < 1) {
          timestamp.textContent = 'Ahora';
        } else if (diffMinutes < 60) {
          timestamp.textContent = `${diffMinutes}m`;
        } else {
          const diffHours = Math.floor(diffMinutes / 60);
          timestamp.textContent = `${diffHours}h`;
        }
      } else {
        timestamp.textContent = '--:--';
      }
    }
    
    // Actualizar clases CSS
    this.container.classList.remove('active', 'saving', 'error');
    
    if (this.manager.autoSaveEnabled) {
      this.container.classList.add('active');
    }
  }
  
  startStatusUpdates() {
    // Actualizar UI cada 30 segundos
    this.updateInterval = setInterval(() => {
      this.updateUI();
    }, 30000);
    
    // Actualización inicial
    this.updateUI();
  }
  
  stopStatusUpdates() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
  
  destroy() {
    this.stopStatusUpdates();
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

// Exportar la clase
export { LocalStorageAutoSaveUI };

// Crear instancia global
const autoSaveUI = new LocalStorageAutoSaveUI();

// Registrar en ServiceRegistry
const registry = getServiceRegistry();
if (registry) {
  registry.register('LocalStorageAutoSaveUI', LocalStorageAutoSaveUI, { 
    description: 'UI para autosave localStorage' 
  });
  registry.register('localStorageAutoSaveUI', autoSaveUI, { 
    description: 'Instancia UI autosave' 
  });
}
