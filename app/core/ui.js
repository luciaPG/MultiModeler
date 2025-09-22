import $ from 'jquery';
import { getEventBus } from '../modules/ui/core/event-bus.js';
import { getServiceRegistry } from '../modules/ui/core/ServiceRegistry.js';
import { resolve } from '../services/global-access.js';
import { openDiagramHandler, downloadProjectHandler } from './handlers.js';

/**
 * Determine whether the "Continuar diagrama" button should be visible.
 */
export function checkContinueDiagramButton() {
  try {
    const registry = getServiceRegistry();
    const localStorageIntegration = registry ? registry.get('LocalStorageIntegration') : null;

    let shouldShow = false;

    if (localStorageIntegration && typeof localStorageIntegration.hasSavedData === 'function') {
      shouldShow = localStorageIntegration.hasSavedData();
    } else {
      const stored = localStorage.getItem('draft:multinotation');
      if (stored) {
        const parsed = JSON.parse(stored);
        const savedAt = parsed && parsed.savedAt;
        const value = parsed && parsed.value;
        const notExpired = savedAt && (Date.now() - savedAt <= 3 * 60 * 60 * 1000);
        const hasContent = value && (
          (value.bpmn && value.bpmn.xml && typeof value.bpmn.xml === 'string' && value.bpmn.xml.trim().length > 0) ||
          (value.ppi && Array.isArray(value.ppi.indicators) && value.ppi.indicators.length > 0) ||
          (value.rasci && Array.isArray(value.rasci.roles) && value.rasci.roles.length > 0)
        );
        shouldShow = Boolean(notExpired && hasContent);
      }
    }

    if (shouldShow) {
      $('#continue-diagram-btn').show();
    } else {
      $('#continue-diagram-btn').hide();
    }
  } catch (e) {
    $('#continue-diagram-btn').hide();
  }
}

/**
 * Prepare base UI elements and bind initial UI events.
 * @param {{ onNewDiagram: () => Promise<void>, onContinue: () => Promise<void> }} hooks
 */
export function setupUIElements(hooks) {
  const welcomeScreen = $('#welcome-screen');
  const modelerContainer = $('#modeler-container');

  welcomeScreen.show();
  modelerContainer.hide();

  setupUIEvents(hooks);
}

/**
 * Bind UI events for primary buttons and storage interactions.
 * @param {{ onNewDiagram: () => Promise<void>, onContinue: () => Promise<void> }} hooks
 */
export function setupUIEvents(hooks) {
  $(function() {
    setTimeout(() => {
      checkContinueDiagramButton();
    }, 1000);

    const eventBus = getEventBus();
    if (eventBus) {
      eventBus.subscribe('localStorage.save.success', () => {
        setTimeout(checkContinueDiagramButton, 500);
      });
      eventBus.subscribe('localStorage.clear.success', () => {
        setTimeout(checkContinueDiagramButton, 500);
      });
    }

    $('#new-diagram-btn').on('click', function() {
      (async () => {
        try {
          const registry = getServiceRegistry();
          const manager = registry ? registry.get('LocalStorageIntegration') : null;
          if (manager) {
            if (typeof manager.clearSavedData === 'function') manager.clearSavedData();
            if (typeof manager.resetRestoreState === 'function') manager.resetRestoreState();
            if (typeof manager.dismissDraftNotification === 'function') manager.dismissDraftNotification();
          }

          $('#welcome-screen').hide();
          $('#modeler-container').show();

          // Reset project name via ProjectInfoService
          try {
            const projectInfo = registry ? registry.get('ProjectInfoService') : null;
            if (projectInfo && typeof projectInfo.resetToDefault === 'function') {
              projectInfo.resetToDefault();
            }
          } catch (_) {}

          await hooks.onNewDiagram();
        } catch (e) {
          console.error('Error al iniciar nuevo diagrama:', e);
        }
      })();
    });

    $('#open-diagram-btn').on('click', function() {
      openDiagramHandler();
    });

    $('#download-project-btn').on('click', function() {
      downloadProjectHandler();
    });

    $('#continue-diagram-btn').on('click', async function() {
      try {
        $('#welcome-screen').hide();
        $('#modeler-container').show();
        await hooks.onContinue();
      } catch (e) {
        console.error('Error al cargar borrador:', e);
      }
    });
  });
}


