// === Debug Functions for Panel Manager ===

function testPanelButton() {
  const button = document.querySelector('.panel-button');
  
  if (button) {
    
    // Test del panelManager
    if (window.panelManager) {
      
      window.panelManager.showSelector();
    } else {
    }
  } else {
  }
}

function inspectModalDOM() {
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  
  if (overlay) {
  }
  
  if (selector) {
    
    if (overlay && overlay.contains(selector)) {
    } else {
    }
  }
  
  // Listar todos los elementos del modal
  const modalElements = document.querySelectorAll('.panel-selector-overlay, .panel-selector, .panel-selector *');
  
  for (let i = 0; i < Math.min(modalElements.length, 10); i++) {
    const el = modalElements[i];
  }
}

function testModalFlow() {
  
  // 1. Estado inicial
  const initialOverlay = document.querySelector('.panel-selector-overlay');
  
  // 2. Mostrar modal
  if (window.panelManager) {
    window.panelManager.showSelector();
  }
  
  // 3. Estado después de mostrar
  setTimeout(() => {
    const overlay = document.querySelector('.panel-selector-overlay');
    const selector = document.querySelector('.panel-selector');
    
    // 4. Test de interactividad
    const closeBtn = selector ? selector.querySelector('.close-button') : null;
    
    
    // Test de event listeners
    
    // 5. Auto-cerrar modal
    setTimeout(() => {
      if (window.panelManager) {
        window.panelManager.closeSelector();
      }
      
      // 6. Estado final
      setTimeout(() => {
        const finalOverlay = document.querySelector('.panel-selector-overlay');
      }, 100);
    }, 2000);
  }, 100);
}

function testEventListeners() {
  
  // Simular click en botón de paneles
  const button = document.querySelector('.panel-button');
  if (button) {
    button.click();
  }
  
  setTimeout(() => {
    const overlay = document.querySelector('.panel-selector-overlay');
    const selector = document.querySelector('.panel-selector');
    const closeBtn = selector ? selector.querySelector('.close-button') : null;
    const cancelBtn = selector ? selector.querySelector('.cancel-button') : null;
    const applyBtn = selector ? selector.querySelector('.apply-button') : null;
    
    
    // Simular click en botón cerrar
    if (closeBtn) {
      closeBtn.click();
    }
  }, 100);
}

// Hacer funciones globales
window.testPanelButton = testPanelButton;
window.inspectModalDOM = inspectModalDOM;
window.testModalFlow = testModalFlow;
window.testEventListeners = testEventListeners;

