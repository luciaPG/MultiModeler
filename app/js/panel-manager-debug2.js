// === Advanced Debug Functions for Panel Manager ===

function testModalButtons() {
  // console.log('🧪 === TEST MODAL BUTTONS ===');
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  const closeBtn = selector ? selector.querySelector('.close-button') : null;
  const cancelBtn = selector ? selector.querySelector('.cancel-button') : null;
  const applyBtn = selector ? selector.querySelector('.apply-button') : null;
  
  // console.log('📍 Elementos encontrados:');
  // console.log('- Overlay:', !!overlay, overlay && overlay.style && overlay.style.display);
  // console.log('- Selector:', !!selector);
  // console.log('- Close button:', !!closeBtn);
  // console.log('- Cancel button:', !!cancelBtn);
  // console.log('- Apply button:', !!applyBtn);
  
  // Test close button
  if (closeBtn) {
    // console.log('🔧 Testeando close button...');
    try {
      closeBtn.click();
      // console.log('✅ Close button click ejecutado');
    } catch (error) {
      // console.error('❌ Error en close button:', error);
    }
  }
  
  // Test cancel button
  if (cancelBtn) {
    // console.log('🔧 Testeando cancel button...');
    try {
      cancelBtn.click();
      // console.log('✅ Cancel button click ejecutado');
    } catch (error) {
      // console.error('❌ Error en cancel button:', error);
    }
  }
  
  // Test apply button
  if (applyBtn) {
    // console.log('🔧 Testeando apply button...');
    try {
      applyBtn.click();
      // console.log('✅ Apply button click ejecutado');
    } catch (error) {
      // console.error('❌ Error en apply button:', error);
    }
  }
}

function inspectButtonEventListeners() {
  // console.log('🔍 === INSPECT BUTTON EVENT LISTENERS ===');
  
  const buttons = [
    { name: 'Close Button', element: document.querySelector('.panel-selector .close-button') },
    { name: 'Cancel Button', element: document.querySelector('.panel-selector .cancel-button') },
    { name: 'Apply Button', element: document.querySelector('.panel-selector .apply-button') }
  ];
  
  buttons.forEach(({ name, element }) => {
    if (!element) {
      // console.log(`❌ ${name} no encontrado`);
      return;
    }
    
    // console.log(`🔍 ${name}:`);
    // console.log('- Element:', element);
    // console.log('- onClick attribute:', element.getAttribute('onclick'));
    // console.log('- Event listeners:', getEventListeners ? 'Función no disponible en este contexto' : 'N/A');
    
    // Agregar test handler temporal
    const testHandler = () => {
      // console.log(`✅ ${name} test handler funcionando`);
    };
    
    element.addEventListener('click', testHandler, { once: true });
    // console.log(`- Test handler agregado a ${name}`);
    
    // Remover después de un tiempo
    setTimeout(() => {
      element.removeEventListener('click', testHandler);
    }, 5000);
  });
}

function reconfigureModalEventListeners() {
  // console.log('🔧 === RECONFIGURING MODAL EVENT LISTENERS ===');
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  
  if (!overlay || !selector) {
    // console.log('❌ Modal no encontrado');
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
      // console.log('🔘 Close button clicked (manual)');
      if (overlay) {
        overlay.remove();
      }
      // console.log('✅ Modal cerrado manualmente');
    });
    
    // console.log('✅ Close button reconfigurado');
  }
  
  // Reconfigurar cancel button
  const cancelBtn = selector.querySelector('.cancel-button');
  if (cancelBtn) {
    // Remover listeners existentes
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    // Agregar nuevo listener
    newCancelBtn.addEventListener('click', () => {
      // console.log('🔘 Cancel button clicked (manual)');
      if (overlay) {
        overlay.remove();
      }
      // console.log('✅ Modal cerrado manualmente');
    });
    
    // console.log('✅ Cancel button reconfigurado');
  }
  
  // Reconfigurar apply button
  const applyBtn = selector.querySelector('.apply-button');
  if (applyBtn) {
    // Remover listeners existentes
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
    
    // Agregar nuevo listener
    newApplyBtn.addEventListener('click', () => {
      // console.log('🔘 Apply button clicked (manual)');
      
      // Simular aplicación de configuración
      if (window.panelManager) {
        // Aquí iría la lógica de aplicación
      }
      
      if (overlay) {
        overlay.remove();
      }
      // console.log('✅ Configuración aplicada y modal cerrado');
    });
    
    // console.log('✅ Apply button reconfigurado');
  }
  
  // Reconfigurar overlay click
  const newOverlay = overlay.cloneNode(true);
  overlay.parentNode.replaceChild(newOverlay, overlay);
  
  newOverlay.addEventListener('click', (e) => {
    if (e.target === newOverlay) {
      // console.log('✅ Modal cerrado manualmente (sin panelManager)');
      newOverlay.remove();
    }
  });
  
  // console.log('✅ Apply button reconfigurado');
}

function debugModalComplete() {
  // console.log('🔬 === DEBUG MODAL COMPLETO ===');
  
  // console.log('1. Inspeccionando estructura DOM...');
  inspectButtonEventListeners();
  
  // console.log('\n2. Verificando event listeners...');
  testModalButtons();
  
  // console.log('\n3. Testeando botones...');
  setTimeout(() => {
    // console.log('\n4. Reconfigurando event listeners...');
    reconfigureModalEventListeners();
    
    setTimeout(() => {
      // console.log('\n5. Testeando botones reconfigurados...');
      testModalButtons();
    }, 500);
  }, 1000);
}

// Hacer funciones globales
window.testModalButtons = testModalButtons;
window.inspectButtonEventListeners = inspectButtonEventListeners;
window.reconfigureModalEventListeners = reconfigureModalEventListeners;
window.debugModalComplete = debugModalComplete;

// console.log('✅ Debug avanzado de botones del modal cargado');
// console.log('📋 Funciones disponibles:');
// console.log('- testModalButtons()');
// console.log('- inspectButtonEventListeners()');
// console.log('- reconfigureModalEventListeners()');
// console.log('- debugModalComplete()');
