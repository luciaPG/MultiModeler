// === Debug Functions for Panel Manager ===

function testPanelButton() {
  // console.log('🔧 Test del botón de paneles...');
  const button = document.querySelector('.panel-button');
  
  if (button) {
    // console.log('- Botón encontrado:', !!button);
    // console.log('- onclick:', button.onclick);
    // console.log('- innerHTML:', button.innerHTML);
    
    // Test del panelManager
    if (window.panelManager) {
      // console.log('- panelManager existe:', !!window.panelManager);
      // console.log('- showSelector existe:', typeof window.panelManager.showSelector);
      
      // console.log('🎯 Ejecutando showSelector directamente...');
      window.panelManager.showSelector();
    } else {
      // console.log('❌ panelManager no encontrado');
    }
  } else {
    // console.log('❌ Botón de paneles no encontrado');
  }
}

function inspectModalDOM() {
  // console.log('🔍 Inspeccionando DOM del modal...');
  
  const overlay = document.querySelector('.panel-selector-overlay');
  const selector = document.querySelector('.panel-selector');
  
  if (overlay) {
    // console.log('Overlay:', overlay);
    // console.log('- Display:', overlay.style.display);
    // console.log('- Classes:', overlay.className);
    // console.log('- Z-index:', getComputedStyle(overlay).zIndex);
    // console.log('- Estructura DOM:', overlay.outerHTML.substring(0, 200) + '...');
    // console.log('- Hijos del overlay:', overlay.children.length);
  }
  
  if (selector) {
    // console.log('Selector:', selector);
    // console.log('- Classes:', selector.className);
    // console.log('- Z-index:', getComputedStyle(selector).zIndex);
    // console.log('- Padre:', selector.parentElement ? selector.parentElement.id : 'No parent');
    // console.log('- ¿Está dentro del overlay?', overlay && overlay.contains(selector));
    
    if (overlay && overlay.contains(selector)) {
      // console.log('✅ Estructura correcta: selector está dentro del overlay');
    } else {
      // console.log('❌ Error de estructura: selector NO está dentro del overlay');
    }
  }
  
  // Listar todos los elementos del modal
  const modalElements = document.querySelectorAll('.panel-selector-overlay, .panel-selector, .panel-selector *');
  // console.log('Elementos del modal en DOM:', modalElements.length);
  
  for (let i = 0; i < Math.min(modalElements.length, 10); i++) {
    const el = modalElements[i];
    // console.log(`- Elemento ${i}:`, el.id, el.tagName, el.parentElement ? el.parentElement.tagName : 'No parent');
  }
}

function testModalFlow() {
  // console.log('🚀 Test del flujo completo del modal...');
  
  // 1. Estado inicial
  // console.log('1. Estado inicial...');
  const initialOverlay = document.querySelector('.panel-selector-overlay');
  // console.log('- Overlay inicial:', !!initialOverlay);
  
  // 2. Mostrar modal
  // console.log('2. Mostrando modal...');
  if (window.panelManager) {
    window.panelManager.showSelector();
  }
  
  // 3. Estado después de mostrar
  setTimeout(() => {
    // console.log('3. Estado después de mostrar...');
    const overlay = document.querySelector('.panel-selector-overlay');
    const selector = document.querySelector('.panel-selector');
    // console.log('- Overlay después:', !!overlay);
    // console.log('- Selector después:', !!selector);
    
    // 4. Test de interactividad
    // console.log('4. Test de interactividad...');
    const closeBtn = selector ? selector.querySelector('.close-button') : null;
    
    // console.log('- Overlay clickable:', overlay ? getComputedStyle(overlay).pointerEvents : 'N/A');
    // console.log('- Selector clickable:', selector ? getComputedStyle(selector).pointerEvents : 'N/A');
    // console.log('- Close button exists:', !!closeBtn);
    // console.log('- Close button clickable:', closeBtn ? getComputedStyle(closeBtn).pointerEvents : 'N/A');
    
    // Test de event listeners
    // console.log('- Close button event listeners:', closeBtn.onclick ? 'onclick presente' : 'No onclick');
    
    // 5. Auto-cerrar modal
    // console.log('5. Auto-cerrando modal...');
    setTimeout(() => {
      if (window.panelManager) {
        window.panelManager.closeSelector();
      }
      
      // 6. Estado final
      setTimeout(() => {
        // console.log('6. Estado final después de cerrar...');
        const finalOverlay = document.querySelector('.panel-selector-overlay');
        // console.log('- Overlay final:', !!finalOverlay);
      }, 100);
    }, 2000);
  }, 100);
}

function testEventListeners() {
  // console.log('🎯 Test de Event Listeners...');
  
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
    
    // console.log('Elementos encontrados:');
    // console.log('- Overlay:', !!overlay);
    // console.log('- Selector:', !!selector);
    // console.log('- Close button:', !!closeBtn);
    // console.log('- Cancel button:', !!cancelBtn);
    // console.log('- Apply button:', !!applyBtn);
    
    // Simular click en botón cerrar
    // console.log('🔘 Simulando click en botón cerrar...');
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

// console.log('✅ Funciones de debug adicionales cargadas:');
// console.log('- window.testPanelButton() - Test del botón de paneles');
// console.log('- window.inspectModalDOM() - Inspeccionar DOM del modal');
// console.log('- window.testModalFlow() - Test completo del flujo del modal');
// console.log('- window.testEventListeners() - Test específico de event listeners');
