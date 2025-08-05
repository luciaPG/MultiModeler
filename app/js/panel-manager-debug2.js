// === Advanced Debug Functions for Panel Manager ===

function testModalButtons() {
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  const closeBtn = selector ? selector.querySelector('.close-button') : null;
  const cancelBtn = selector ? selector.querySelector('.cancel-button') : null;
  const applyBtn = selector ? selector.querySelector('.apply-button') : null;
  
  
  // Test close button
  if (closeBtn) {
    try {
      closeBtn.click();
    } catch (error) {
    }
  }
  
  // Test cancel button
  if (cancelBtn) {
    try {
      cancelBtn.click();
    } catch (error) {
    }
  }
  
  // Test apply button
  if (applyBtn) {
    try {
      applyBtn.click();
    } catch (error) {
    }
  }
}

function inspectButtonEventListeners() {
  
  const buttons = [
    { name: 'Close Button', element: document.querySelector('.panel-selector .close-button') },
    { name: 'Cancel Button', element: document.querySelector('.panel-selector .cancel-button') },
    { name: 'Apply Button', element: document.querySelector('.panel-selector .apply-button') }
  ];
  
  buttons.forEach(({ name, element }) => {
    if (!element) {
      return;
    }
    
    
    // Agregar test handler temporal
    const testHandler = () => {
    };
    
    element.addEventListener('click', testHandler, { once: true });
    
    // Remover después de un tiempo
    setTimeout(() => {
      element.removeEventListener('click', testHandler);
    }, 5000);
  });
}

function reconfigureModalEventListeners() {
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  
  if (!overlay || !selector) {
    return;
  }
  
  // Reconfigurar close button
  const closeBtn = selector.querySelector('.close-button');
  if (closeBtn) {
    // Remover listeners existentes
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    // Agregar nuevo listener
    newCloseBtn.addEventListener('click', () => {
      if (overlay) {
        overlay.remove();
      }
    });
    
  }
  
  // Reconfigurar cancel button
  const cancelBtn = selector.querySelector('.cancel-button');
  if (cancelBtn) {
    // Remover listeners existentes
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Agregar nuevo listener
    newCancelBtn.addEventListener('click', () => {
      if (overlay) {
        overlay.remove();
      }
    });
    
  }
  
  // Reconfigurar apply button
  const applyBtn = selector.querySelector('.apply-button');
  if (applyBtn) {
    // Remover listeners existentes
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
    
    // Agregar nuevo listener
    newApplyBtn.addEventListener('click', () => {
      
      // Simular aplicación de configuración
      if (window.panelManager) {
        // Aquí iría la lógica de aplicación
      }
      
      if (overlay) {
        overlay.remove();
      }
    });
    
  }
  
  // Reconfigurar overlay click
  const newOverlay = overlay.cloneNode(true);
  overlay.parentNode.replaceChild(newOverlay, overlay);
  
  newOverlay.addEventListener('click', (e) => {
    if (e.target === newOverlay) {
      newOverlay.remove();
    }
  });
  
}

function debugModalComplete() {
  
  inspectButtonEventListeners();
  
  testModalButtons();
  
  setTimeout(() => {
    reconfigureModalEventListeners();
    
    setTimeout(() => {
      testModalButtons();
    }, 500);
  }, 1000);
}

// Hacer funciones globales
window.testModalButtons = testModalButtons;
window.inspectButtonEventListeners = inspectButtonEventListeners;
window.reconfigureModalEventListeners = reconfigureModalEventListeners;
window.debugModalComplete = debugModalComplete;

