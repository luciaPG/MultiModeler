// === PPI Sync UI Manager ===
// Componente para manejar la UI de sincronización en tiempo real

// Prevent duplicate class declaration
if (typeof window.PPISyncUI === 'undefined') {
class PPISyncUI {
  constructor(ppiManager) {
    this.ppiManager = ppiManager;
    this.syncStatusElement = null;
    this.statusTextElement = null;
    this.updateInterval = null;
    
    this.init();
  }

  init() {
    this.findElements();
    this.startStatusUpdates();
  }

  findElements() {
    this.syncStatusElement = document.getElementById('ppi-sync-status');
    if (this.syncStatusElement) {
      this.statusTextElement = this.syncStatusElement.querySelector('.sync-status-text');
    }
  }

  startStatusUpdates() {
    // Actualizar estado cada 2 segundos
    this.updateInterval = setInterval(() => {
      this.updateSyncStatus();
    }, 2000);

    // Actualización inicial
    this.updateSyncStatus();
  }

  updateSyncStatus() {
    if (!this.syncStatusElement || !this.statusTextElement) {
      return;
    }

    try {
      const status = this.ppiManager.getSyncStatus();
      this.updateStatusDisplay(status);
    } catch (error) {
      this.showErrorStatus('Error de estado');
    }
  }

  updateStatusDisplay(status) {
    // Remover clases anteriores
    this.syncStatusElement.classList.remove('syncing', 'success', 'error');

    if (!status.syncManagerAvailable) {
      this.showWarningStatus('Sistema anterior');
      return;
    }

    if (status.isSyncing) {
      this.showSyncingStatus();
    } else if (status.pendingChanges > 0 || status.queueLength > 0) {
      this.showPendingStatus(status);
    } else if (status.lastSyncTime > 0) {
      this.showSuccessStatus(status);
    } else {
      this.showIdleStatus();
    }
  }

  showSyncingStatus() {
    this.syncStatusElement.classList.add('syncing');
    this.statusTextElement.textContent = 'Sincronizando...';
  }

  showPendingStatus(status) {
    this.syncStatusElement.classList.add('syncing');
    const total = status.pendingChanges + status.queueLength;
    this.statusTextElement.textContent = `${total} cambios pendientes`;
  }

  showSuccessStatus(status) {
    this.syncStatusElement.classList.add('success');
    const timeAgo = this.getTimeAgo(status.lastSyncTime);
    this.statusTextElement.textContent = `Sincronizado ${timeAgo}`;
  }

  showIdleStatus() {
    this.statusTextElement.textContent = 'Esperando cambios';
  }

  showWarningStatus(message) {
    this.syncStatusElement.classList.add('error');
    this.statusTextElement.textContent = message;
  }

  showErrorStatus(message) {
    this.syncStatusElement.classList.add('error');
    this.statusTextElement.textContent = message;
  }

  getTimeAgo(timestamp) {
    if (!timestamp) return 'nunca';
    
    const now = Date.now();
    const diff = now - timestamp;
    
    if (diff < 1000) return 'ahora';
    if (diff < 60000) return 'hace un momento';
    if (diff < 3600000) return `hace ${Math.floor(diff / 60000)}m`;
    if (diff < 86400000) return `hace ${Math.floor(diff / 3600000)}h`;
    return `hace ${Math.floor(diff / 86400000)}d`;
  }

  // Método para mostrar notificación temporal
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `ppi-sync-notification ${type}`;
    notification.innerHTML = `
      <i class="fas fa-${this.getNotificationIcon(type)}"></i>
      <span>${message}</span>
    `;
    
    document.body.appendChild(notification);
    
    // Animar entrada
    setTimeout(() => {
      notification.classList.add('show');
    }, 100);
    
    // Remover después del tiempo especificado
    setTimeout(() => {
      notification.classList.remove('show');
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, duration);
  }

  getNotificationIcon(type) {
    switch (type) {
      case 'success': return 'check-circle';
      case 'error': return 'exclamation-circle';
      case 'warning': return 'exclamation-triangle';
      default: return 'info-circle';
    }
  }

  // Método para actualizar manualmente
  forceUpdate() {
    this.updateSyncStatus();
  }

  // Método para limpiar
  destroy() {
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
  }
}

// Exportar para uso global
window.PPISyncUI = PPISyncUI;
} 