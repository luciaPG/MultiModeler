// === Funciones de Debug Avanzadas para Panel Manager ===

// Función para probar específicamente los botones del modal
function testModalButtons() {
  console.log('🧪 === TEST MODAL BUTTONS ===');
  
  const overlay = document.getElementById('panel-selector-overlay');
  const selector = document.getElementById('panel-selector');
  const closeBtn = document.getElementById('panel-selector-close-btn');
  const cancelBtn = document.getElementById('panel-selector-cancel-btn');
  const applyBtn = document.getElementById('panel-selector-apply-btn');
  
  console.log('📍 Elementos encontrados:');
  console.log('- Overlay:', !!overlay, overlay && overlay.style && overlay.style.display);
  console.log('- Selector:', !!selector);
  console.log('- Close button:', !!closeBtn);
  console.log('- Cancel button:', !!cancelBtn);
  console.log('- Apply button:', !!applyBtn);
  
  if (closeBtn) {
    console.log('🔧 Testeando close button...');
    closeBtn.click();
  }
  
  if (cancelBtn) {
    console.log('🔧 Testeando cancel button...');
    cancelBtn.click();
  }
  
  if (applyBtn) {
    console.log('🔧 Testeando apply button...');
    applyBtn.click();
  }
}

// Función para verificar event listeners en los botones
function inspectButtonEventListeners() {
  console.log('🔍 === INSPECT BUTTON EVENT LISTENERS ===');
  
  const closeBtn = document.getElementById('panel-selector-close-btn');
  const cancelBtn = document.getElementById('panel-selector-cancel-btn');
  const applyBtn = document.getElementById('panel-selector-apply-btn');
  
  function getEventListeners(element, name) {
    if (!element) {
      console.log(`❌ ${name} no encontrado`);
      return;
    }
    
    console.log(`🔍 ${name}:`);
    console.log('- Element:', element);
    console.log('- onClick attribute:', element.getAttribute('onclick'));
    console.log('- Event listeners:', getEventListeners ? 'Función no disponible en este contexto' : 'N/A');
    
    // Intentar agregar un event listener de prueba
    const testHandler = () => console.log(`✅ ${name} test handler funcionando`);
    element.addEventListener('click', testHandler);
    console.log(`- Test handler agregado a ${name}`);
  }
  
  getEventListeners(closeBtn, 'Close Button');
  getEventListeners(cancelBtn, 'Cancel Button');
  getEventListeners(applyBtn, 'Apply Button');
}

// Función para reconfigurar event listeners manualmente
function reconfigureModalEventListeners() {
  console.log('🔧 === RECONFIGURING MODAL EVENT LISTENERS ===');
  
  const overlay = document.getElementById('panel-selector-overlay');
  const selector = document.getElementById('panel-selector');
  const closeBtn = document.getElementById('panel-selector-close-btn');
  const cancelBtn = document.getElementById('panel-selector-cancel-btn');
  const applyBtn = document.getElementById('panel-selector-apply-btn');
  
  if (!overlay || !selector) {
    console.log('❌ Modal no encontrado');
    return;
  }
  
  // Reconfigurar botón close
  if (closeBtn) {
    // Limpiar event listeners existentes clonando el elemento
    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);
    
    newCloseBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔘 Close button clicked (manual)');
      
      // Cerrar modal manualmente
      overlay.classList.remove('show');
      overlay.style.display = 'none';
      selector.classList.remove('show');
      console.log('✅ Modal cerrado manualmente');
    });
    
    console.log('✅ Close button reconfigurado');
  }
  
  // Reconfigurar botón cancel
  if (cancelBtn) {
    const newCancelBtn = cancelBtn.cloneNode(true);
    cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
    
    newCancelBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔘 Cancel button clicked (manual)');
      
      // Cerrar modal manualmente
      overlay.classList.remove('show');
      overlay.style.display = 'none';
      selector.classList.remove('show');
      console.log('✅ Modal cerrado manualmente');
    });
    
    console.log('✅ Cancel button reconfigurado');
  }
  
  // Reconfigurar botón apply
  if (applyBtn) {
    const newApplyBtn = applyBtn.cloneNode(true);
    applyBtn.parentNode.replaceChild(newApplyBtn, applyBtn);
    
    newApplyBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      console.log('🔘 Apply button clicked (manual)');
      
      // Aplicar configuración y cerrar
      if (window.panelManager && typeof window.panelManager.applyConfiguration === 'function') {
        window.panelManager.applyConfiguration();
        console.log('✅ Configuración aplicada y modal cerrado');
      } else {
        // Cerrar modal manualmente si no hay panelManager
        overlay.classList.remove('show');
        overlay.style.display = 'none';
        selector.classList.remove('show');
        console.log('✅ Modal cerrado manualmente (sin panelManager)');
      }
    });
    
    console.log('✅ Apply button reconfigurado');
  }
}

// Función para debug completo del modal
function debugModalComplete() {
  console.log('🔬 === DEBUG MODAL COMPLETO ===');
  
  console.log('1. Inspeccionando estructura DOM...');
  // inspectModalDOM() - función ya definida en otro archivo de debug
  
  console.log('\n2. Verificando event listeners...');
  inspectButtonEventListeners();
  
  console.log('\n3. Testeando botones...');
  testModalButtons();
  
  console.log('\n4. Reconfigurando event listeners...');
  reconfigureModalEventListeners();
  
  console.log('\n5. Testeando botones reconfigurados...');
  setTimeout(() => {
    testModalButtons();
  }, 500);
}

// Hacer las funciones disponibles globalmente
window.testModalButtons = testModalButtons;
window.inspectButtonEventListeners = inspectButtonEventListeners;
window.reconfigureModalEventListeners = reconfigureModalEventListeners;
window.debugModalComplete = debugModalComplete;

console.log('✅ Debug avanzado de botones del modal cargado');
console.log('📋 Funciones disponibles:');
console.log('- testModalButtons()');
console.log('- inspectButtonEventListeners()');
console.log('- reconfigureModalEventListeners()');
console.log('- debugModalComplete()');
