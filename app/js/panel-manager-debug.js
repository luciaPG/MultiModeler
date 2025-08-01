// Función global de prueba para depurar
window.testPanelButton = function() {
  console.log('🔧 Test del botón de paneles...');
  
  const button = document.querySelector('.header-panel-btn');
  console.log('- Botón encontrado:', !!button);
  
  if (button) {
    console.log('- onclick:', button.onclick);
    console.log('- innerHTML:', button.innerHTML);
    
    // Test directo del panelManager
    if (window.panelManager) {
      console.log('- panelManager existe:', !!window.panelManager);
      console.log('- showSelector existe:', typeof window.panelManager.showSelector);
      
      try {
        console.log('🎯 Ejecutando showSelector directamente...');
        window.panelManager.showSelector();
      } catch (error) {
        console.error('❌ Error al ejecutar showSelector:', error);
      }
    } else {
      console.error('❌ panelManager no está disponible globalmente');
    }
  }
};

// Test automático de elementos DOM
window.inspectModalDOM = function() {
  console.log('🔍 Inspeccionando DOM del modal...');
  
  const overlay = document.getElementById('panel-selector-overlay');
  const selector = document.getElementById('panel-selector');
  
  console.log('Overlay:', overlay);
  if (overlay) {
    console.log('- Display:', overlay.style.display);
    console.log('- Classes:', overlay.className);
    console.log('- Z-index:', getComputedStyle(overlay).zIndex);
    console.log('- Estructura DOM:', overlay.outerHTML.substring(0, 200) + '...');
    console.log('- Hijos del overlay:', overlay.children.length);
  }
  
  console.log('Selector:', selector);
  if (selector) {
    console.log('- Classes:', selector.className);
    console.log('- Z-index:', getComputedStyle(selector).zIndex);
    console.log('- Padre:', selector.parentElement ? selector.parentElement.id : 'No parent');
    console.log('- ¿Está dentro del overlay?', overlay && overlay.contains(selector));
  }
  
  // Verificar la estructura correcta
  if (overlay && selector) {
    if (overlay.contains(selector)) {
      console.log('✅ Estructura correcta: selector está dentro del overlay');
    } else {
      console.log('❌ Error de estructura: selector NO está dentro del overlay');
    }
  }
  
  // Contar todos los elementos del modal en el DOM
  const modalElements = document.querySelectorAll('[id*="panel-selector"]');
  console.log('Elementos del modal en DOM:', modalElements.length);
  modalElements.forEach((el, i) => {
    console.log(`- Elemento ${i}:`, el.id, el.tagName, el.parentElement ? el.parentElement.tagName : 'No parent');
  });
};

// Función de test rápido del flujo completo
window.testModalFlow = function() {
  console.log('🚀 Test del flujo completo del modal...');
  
  // 1. Test inicial
  console.log('1. Estado inicial...');
  window.inspectModalDOM();
  
  // 2. Intentar mostrar modal
  console.log('2. Mostrando modal...');
  if (window.panelManager) {
    window.panelManager.showSelector();
    
    setTimeout(() => {
      console.log('3. Estado después de mostrar...');
      window.inspectModalDOM();
      
      // Test de interactividad
      console.log('4. Test de interactividad...');
      const overlay = document.getElementById('panel-selector-overlay');
      const selector = document.getElementById('panel-selector');
      const closeBtn = document.getElementById('panel-selector-close-btn');
      
      console.log('- Overlay clickable:', overlay ? getComputedStyle(overlay).pointerEvents : 'N/A');
      console.log('- Selector clickable:', selector ? getComputedStyle(selector).pointerEvents : 'N/A');
      console.log('- Close button exists:', !!closeBtn);
      console.log('- Close button clickable:', closeBtn ? getComputedStyle(closeBtn).pointerEvents : 'N/A');
      
      if (closeBtn) {
        console.log('- Close button event listeners:', closeBtn.onclick ? 'onclick presente' : 'No onclick');
      }
      
      // Auto-cerrar después de un tiempo
      setTimeout(() => {
        console.log('5. Auto-cerrando modal...');
        window.panelManager.closeSelector();
        
        setTimeout(() => {
          console.log('6. Estado final después de cerrar...');
          window.inspectModalDOM();
        }, 500);
      }, 2000);
    }, 500);
  }
};

// Test específico de event listeners
window.testEventListeners = function() {
  console.log('🎯 Test de Event Listeners...');
  
  const overlay = document.getElementById('panel-selector-overlay');
  const selector = document.getElementById('panel-selector');
  const closeBtn = document.getElementById('panel-selector-close-btn');
  const cancelBtn = document.getElementById('panel-selector-cancel-btn');
  const applyBtn = document.getElementById('panel-selector-apply-btn');
  
  console.log('Elementos encontrados:');
  console.log('- Overlay:', !!overlay);
  console.log('- Selector:', !!selector);
  console.log('- Close button:', !!closeBtn);
  console.log('- Cancel button:', !!cancelBtn);
  console.log('- Apply button:', !!applyBtn);
  
  if (closeBtn) {
    console.log('🔘 Simulando click en botón cerrar...');
    closeBtn.click();
  }
};

console.log('✅ Funciones de debug adicionales cargadas:');
console.log('- window.testPanelButton() - Test del botón de paneles'); 
console.log('- window.inspectModalDOM() - Inspeccionar DOM del modal');
console.log('- window.testModalFlow() - Test completo del flujo del modal');
console.log('- window.testEventListeners() - Test específico de event listeners');
