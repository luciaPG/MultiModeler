import $ from 'jquery';
import HybridModeler from './hybrid-modeler';

// Variables globales
let hybridModeler;
let currentNotations = new Set(['ppinot', 'ralph']);

/**
 * Inicializa la aplicación híbrida
 */
function initializeHybridApp() {
  console.log('🚀 Inicializando aplicación híbrida...');
  
  try {    // Crear instancia del modeler híbrido
    console.log('🔨 Creando HybridModeler...');
    hybridModeler = new HybridModeler({
      container: '#hybrid-canvas',
      keyboard: {
        bind: true
      }
    });
    
    console.log('✅ HybridModeler creado:', hybridModeler);
    
    // Crear diagrama vacío inicial
    console.log('📄 Creando diagrama inicial...');
    hybridModeler.createNewDiagram()
      .then(() => {
        console.log('✅ Diagrama híbrido inicializado');
        setupUI();
        setupEventListeners();
      })
      .catch(err => {
        console.error('❌ Error inicializando diagrama:', err);
      });
  } catch (error) {
    console.error('❌ Error creando HybridModeler:', error);
  }
}

/**
 * Configura la interfaz de usuario
 */
function setupUI() {
  console.log('🎨 Configurando UI...');
  
  // Verificar que el modeler esté disponible
  if (!hybridModeler) {
    console.error('❌ HybridModeler no está disponible');
    return;
  }
  
  // Verificar que la paleta esté disponible
  try {
    const palette = hybridModeler.get('palette');
    console.log('✅ Palette service disponible:', palette);
  } catch (error) {
    console.error('❌ Error accediendo al servicio de paleta:', error);
  }
  
  // Crear la paleta personalizada
  createCustomPalette();
  
  // Configurar toolbar
  setupToolbar();
  
  // Mostrar estadísticas iniciales
  updateStats();
}

/**
 * Crea la paleta personalizada con switcher de notaciones
 */
function createCustomPalette() {
  console.log('🎨 Creando paleta personalizada...');
  
  const paletteContainer = $('#hybrid-palette-container');
  
  if (!paletteContainer.length) {
    console.error('❌ No se encontró el contenedor de la paleta');
    return;
  }
  
  const paletteHTML = `
    <div class="hybrid-palette">
      <!-- Header con título -->
      <div class="palette-header">
        <h3 class="palette-title">🧩 Hybrid Palette</h3>
        
        <!-- Switcher de notaciones -->
        <div class="notation-switcher">
          <button class="notation-toggle ppinot active" data-notation="ppinot">
            🎯 PPINOT
          </button>
          <button class="notation-toggle ralph active" data-notation="ralph">
            🛫 RALPH
          </button>
          <button class="notation-toggle hybrid active" data-notation="hybrid">
            🔀 Hybrid
          </button>
        </div>
      </div>
      
      <!-- Contenido de la paleta (se llena automáticamente por diagram-js) -->
      <div class="palette-content">
        <div id="palette-placeholder">Loading palette...</div>
      </div>
    </div>
  `;
  
  paletteContainer.html(paletteHTML);
  console.log('✅ HTML de la paleta creado');
  
  // Intentar conectar con la paleta de diagram-js después de un tiempo
  setTimeout(() => {
    try {
      if (hybridModeler) {
        const palette = hybridModeler.get('palette');
        const paletteContainer = palette.getContainer();
        
        console.log('🔗 Conectando con la paleta de diagram-js...', paletteContainer);
        
        if (paletteContainer) {
          // Mover la paleta real al contenedor personalizado
          $(paletteContainer).appendTo('.palette-content');
          $('#palette-placeholder').remove();
          console.log('✅ Paleta conectada exitosamente');
        } else {
          console.warn('⚠️ Contenedor de paleta no encontrado');
        }
      }
    } catch (error) {
      console.error('❌ Error conectando con la paleta:', error);
    }
  }, 500);
}

/**
 * Configura la toolbar superior
 */
function setupToolbar() {
  // Los botones ya están en el HTML, solo agregar funcionalidad
  $('#save-btn').on('click', saveModel);
  $('#load-btn').on('click', loadModel);
  $('#export-btn').on('click', exportModel);
}

/**
 * Configura los event listeners
 */
function setupEventListeners() {
  // Switcher de notaciones
  $(document).on('click', '.notation-toggle', function() {
    const notation = $(this).data('notation');
    toggleNotation(notation, $(this));
  });
  
  // Eventos del canvas
  hybridModeler.on('shape.added', updateStats);
  hybridModeler.on('shape.removed', updateStats);
  hybridModeler.on('connection.added', updateStats);
  hybridModeler.on('connection.removed', updateStats);
  
  // Eventos de teclado
  $(document).on('keydown', handleKeyboard);
}

/**
 * Maneja el toggle de notaciones
 */
function toggleNotation(notation, button) {
  if (notation === 'hybrid') {
    // Modo híbrido: activar ambas notaciones
    currentNotations = new Set(['ppinot', 'ralph']);
    $('.notation-toggle').addClass('active');
  } else {
    // Toggle individual de notación
    if (currentNotations.has(notation)) {
      currentNotations.delete(notation);
      button.removeClass('active');
    } else {
      currentNotations.add(notation);
      button.addClass('active');
    }
    
    // Actualizar estado del botón híbrido
    const hybridButton = $('.notation-toggle[data-notation="hybrid"]');
    if (currentNotations.has('ppinot') && currentNotations.has('ralph')) {
      hybridButton.addClass('active');
    } else {
      hybridButton.removeClass('active');
    }
  }
  
  // Aplicar cambios al modeler
  hybridModeler.setActiveNotations(Array.from(currentNotations));
  
  console.log('🔄 Notaciones activas:', Array.from(currentNotations));
}

/**
 * Actualiza las estadísticas del diagrama
 */
function updateStats() {
  if (!hybridModeler) return;
  
  try {
    const stats = hybridModeler.getDiagramStats();
    
    // Actualizar título con estadísticas
    const title = $('.app-title');
    const badge = title.find('.notation-badge');
    
    let badgeText = '';
    if (stats.ppinot > 0 && stats.ralph > 0) {
      badgeText = `HYBRID (${stats.ppinot}P + ${stats.ralph}R)`;
      badge.attr('class', 'notation-badge hybrid');
    } else if (stats.ppinot > 0) {
      badgeText = `PPINOT (${stats.ppinot})`;
      badge.attr('class', 'notation-badge ppinot');
    } else if (stats.ralph > 0) {
      badgeText = `RALPH (${stats.ralph})`;
      badge.attr('class', 'notation-badge ralph');
    } else {
      badgeText = 'EMPTY';
      badge.attr('class', 'notation-badge');
    }
    
    badge.text(badgeText);
    
  } catch (error) {
    console.warn('Error actualizando estadísticas:', error);
  }
}

/**
 * Guarda el modelo actual
 */
function saveModel() {
  if (!hybridModeler) return;
  
  hybridModeler.saveXML()
    .then(result => {
      console.log('💾 Modelo guardado:', result);
      
      // Guardar en localStorage como backup
      localStorage.setItem('hybrid-model', result.xml);
      
      // Mostrar mensaje de éxito
      showMessage('Modelo guardado exitosamente', 'success');
    })
    .catch(err => {
      console.error('❌ Error guardando modelo:', err);
      showMessage('Error al guardar el modelo', 'error');
    });
}

/**
 * Carga un modelo
 */
function loadModel() {
  // Por ahora, cargar desde localStorage
  const savedModel = localStorage.getItem('hybrid-model');
  
  if (savedModel) {
    hybridModeler.importXML(savedModel)
      .then(() => {
        console.log('📁 Modelo cargado exitosamente');
        showMessage('Modelo cargado exitosamente', 'success');
        updateStats();
      })
      .catch(err => {
        console.error('❌ Error cargando modelo:', err);
        showMessage('Error al cargar el modelo', 'error');
      });
  } else {
    showMessage('No hay modelo guardado', 'warning');
  }
}

/**
 * Exporta el modelo en diferentes formatos
 */
function exportModel() {
  if (!hybridModeler) return;
  
  hybridModeler.saveXML()
    .then(result => {
      // Crear blob con el XML
      const blob = new Blob([result.xml], { type: 'application/xml' });
      const url = URL.createObjectURL(blob);
      
      // Crear link de descarga
      const a = document.createElement('a');
      a.href = url;
      a.download = 'hybrid-model.xml';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      showMessage('Modelo exportado exitosamente', 'success');
    })
    .catch(err => {
      console.error('❌ Error exportando modelo:', err);
      showMessage('Error al exportar el modelo', 'error');
    });
}

/**
 * Maneja eventos de teclado
 */
function handleKeyboard(event) {
  // Ctrl+S: Guardar
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault();
    saveModel();
  }
  
  // Ctrl+O: Abrir
  if (event.ctrlKey && event.key === 'o') {
    event.preventDefault();
    loadModel();
  }
  
  // Ctrl+E: Exportar
  if (event.ctrlKey && event.key === 'e') {
    event.preventDefault();
    exportModel();
  }
}

/**
 * Muestra un mensaje al usuario
 */
function showMessage(text, type = 'info') {
  // Crear elemento de mensaje
  const message = $(`
    <div class="toast-message ${type}">
      ${text}
    </div>
  `);
  
  // Agregar estilos dinámicos si no existen
  if (!$('#toast-styles').length) {
    $('head').append(`
      <style id="toast-styles">
        .toast-message {
          position: fixed;
          top: 20px;
          right: 20px;
          padding: 12px 16px;
          border-radius: 4px;
          color: white;
          font-size: 14px;
          z-index: 1000;
          animation: slideIn 0.3s ease;
        }
        .toast-message.success { background: #4CAF50; }
        .toast-message.error { background: #F44336; }
        .toast-message.warning { background: #FF9800; }
        .toast-message.info { background: #2196F3; }
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
      </style>
    `);
  }
  
  // Mostrar mensaje
  $('body').append(message);
  
  // Remover después de 3 segundos
  setTimeout(() => {
    message.fadeOut(() => message.remove());
  }, 3000);
}

// Inicializar cuando el DOM esté listo
$(document).ready(function() {
  initializeHybridApp();
});

// Exportar para debugging
window.hybridModeler = hybridModeler;
window.toggleNotation = toggleNotation;
