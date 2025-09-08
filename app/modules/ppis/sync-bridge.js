// Conecta con PPISyncManager/PPISyncUI vía ServiceRegistry
export function createSyncBridge({ registry, core, ui }) {
    let syncManager = null;
    let syncUI = null;
  
    function init() {
      const PPISyncManager = registry.get('PPISyncManager');
      if (PPISyncManager && !syncManager) {
        syncManager = new PPISyncManager({ core }); // tu constructor actual acepta manager/core
      }
      const PPISyncUI = registry.get('PPISyncUI');
      if (PPISyncUI && !syncUI) {
        syncUI = new PPISyncUI({ core, managerApi: api });
      }
    }
  
    function forceSync() {
      if (syncManager?.performSmartSync) return syncManager.performSmartSync();
      if (core?.forceSavePPINOTElements) core.forceSavePPINOTElements();
    }
  
    const api = {
      init,
      forceSync,
      enableAutoSync:  () => syncManager?.enableAutoSync?.(),
      disableAutoSync: () => syncManager?.disableAutoSync?.(),
      get status() {
        return syncManager
          ? syncManager.getSyncStatus?.()
          : { isSyncing:false, lastSyncTime:0, pendingChanges:0, queueLength:0, elementCacheSize:0, relationshipCacheSize:0, syncManagerAvailable:false };
      }
    };
  
    return api;
  }
  