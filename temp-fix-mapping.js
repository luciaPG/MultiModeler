// SOLUCION TEMPORAL PARA MAPEO AUTOMATICO
// Ejecutar en consola del navegador si el mapeo automático no funciona

console.log('🔧 APLICANDO SOLUCION TEMPORAL PARA MAPEO AUTOMATICO...');

// 1. Verificar estado actual
if (typeof window.rasciAutoMapping === 'undefined') {
  console.log('❌ window.rasciAutoMapping no existe - creando...');
  
  window.rasciAutoMapping = {
    enabled: false,
    debounceTimer: null,
    smartTimer: null,
    
    enable() {
      this.enabled = true;
      console.log('✅ Mapeo automático ACTIVADO');
      return this.enabled;
    },
    
    disable() {
      this.enabled = false;
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      if (this.smartTimer) clearTimeout(this.smartTimer);
      console.log('⏸️ Mapeo automático DESACTIVADO');
      return this.enabled;
    },
    
    toggle() {
      if (this.enabled) {
        this.disable();
      } else {
        this.enable();
      }
      return this.enabled;
    },
    
    triggerMapping() {
      if (!this.enabled) return;
      
      if (this.debounceTimer) clearTimeout(this.debounceTimer);
      
      this.debounceTimer = setTimeout(() => {
        if (typeof window.onRasciMatrixUpdated === 'function') {
          window.onRasciMatrixUpdated();
        } else {
          console.warn('⚠️ window.onRasciMatrixUpdated no disponible');
        }
      }, 200);
    }
  };
}

// 2. Verificar funciones principales
if (typeof window.onRasciMatrixUpdated === 'undefined') {
  console.log('❌ window.onRasciMatrixUpdated no existe - creando...');
  
  window.onRasciMatrixUpdated = function() {
    console.log('🔄 Ejecutando mapeo automático...');
    
    if (!window.bpmnModeler) {
      console.warn('⚠️ No hay bpmnModeler disponible');
      return;
    }
    
    if (!window.rasciMatrixData) {
      console.warn('⚠️ No hay rasciMatrixData disponible');
      return;
    }
    
    try {
      if (typeof window.executeSimpleRasciMapping === 'function') {
        window.executeSimpleRasciMapping(window.bpmnModeler, window.rasciMatrixData);
        console.log('✅ Mapeo ejecutado correctamente');
      } else {
        console.error('❌ window.executeSimpleRasciMapping no disponible');
      }
    } catch (error) {
      console.error('❌ Error en mapeo:', error);
    }
  };
}

// 3. Verificar función de mapeo principal
if (typeof window.executeRasciToRalphMapping === 'undefined') {
  console.log('❌ window.executeRasciToRalphMapping no existe - creando...');
  
  window.executeRasciToRalphMapping = function() {
    console.log('🎯 Ejecutando mapeo RASCI to RALPH...');
    window.onRasciMatrixUpdated();
  };
}

// 4. Función de diagnóstico rápido
window.quickDiagnoseMapping = function() {
  console.log('=== DIAGNÓSTICO RÁPIDO MAPEO ===');
  console.log('🔍 window.bpmnModeler:', !!window.bpmnModeler);
  console.log('🔍 window.rasciMatrixData:', !!window.rasciMatrixData);
  console.log('🔍 window.rasciAutoMapping:', !!window.rasciAutoMapping);
  console.log('🔍 window.onRasciMatrixUpdated:', typeof window.onRasciMatrixUpdated);
  console.log('🔍 window.executeSimpleRasciMapping:', typeof window.executeSimpleRasciMapping);
  console.log('🔍 Auto mapping enabled:', window.rasciAutoMapping && window.rasciAutoMapping.enabled);
  
  // Intentar activar auto mapping
  if (window.rasciAutoMapping && !window.rasciAutoMapping.enabled) {
    window.rasciAutoMapping.enable();
  }
  
  console.log('=== FIN DIAGNÓSTICO ===');
};

// 5. Ejecutar diagnóstico automáticamente
window.quickDiagnoseMapping();

console.log('🚀 SOLUCION TEMPORAL APLICADA - Probad el mapeo automático ahora');
console.log('📝 Para más diagnósticos: window.quickDiagnoseMapping()');
