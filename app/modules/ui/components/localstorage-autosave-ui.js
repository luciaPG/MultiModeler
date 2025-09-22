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
      console.error('❌ No se encontró el contenedor de autosave en el HTML');
      return;
    }
    
    console.log('✅ Usando estructura de autosave existente del HTML');
    
    // Agregar botones de acción al contenedor existente
    this.addActionButtons();
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
