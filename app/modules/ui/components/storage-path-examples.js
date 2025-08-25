/**
 * Ejemplo de uso del StoragePathManager
 * Demuestra cómo utilizar la gestión multiplataforma de rutas
 */

import StoragePathManager from './storage-path-manager.js';

// Crear una instancia del gestor de rutas
const pathManager = new StoragePathManager();

/**
 * Ejemplo 1: Obtener ruta de configuración con modal
 */
async function ejemploConfiguracion() {
  try {
    console.log('=== Ejemplo: Ruta de Configuración ===');
    
    // Mostrar rutas por defecto
    const defaultPaths = pathManager.getAllDefaultPaths();
    console.log('Rutas por defecto:', defaultPaths);
    
    // Obtener ruta de configuración (mostrará modal)
    const configPath = await pathManager.getStoragePath('config', true);
    
    if (configPath) {
      console.log('✅ Ruta de configuración seleccionada:', configPath);
      
      // Aquí guardarías tu configuración
      // await guardarConfiguracion(configPath);
      
    } else {
      console.log('❌ Usuario canceló la selección de ruta');
    }
    
  } catch (error) {
    console.error('Error obteniendo ruta de configuración:', error);
  }
}

/**
 * Ejemplo 2: Obtener ruta de datos de usuario sin modal
 */
async function ejemploDatosUsuario() {
  try {
    console.log('=== Ejemplo: Datos de Usuario ===');
    
    // Obtener ruta sin mostrar modal (usar por defecto)
    const userPath = await pathManager.getStoragePath('usuario', false);
    
    if (userPath) {
      console.log('✅ Ruta de datos de usuario:', userPath);
      
      // Aquí guardarías archivos del usuario
      // await guardarDatosUsuario(userPath);
      
    } else {
      console.log('❌ No se pudo obtener ruta de datos de usuario');
    }
    
  } catch (error) {
    console.error('Error obteniendo ruta de datos de usuario:', error);
  }
}

/**
 * Ejemplo 3: Obtener ruta temporal
 */
async function ejemploTemp() {
  try {
    console.log('=== Ejemplo: Archivos Temporales ===');
    
    // Obtener ruta temporal sin modal
    const tempPath = await pathManager.getStoragePath('temp', false);
    
    if (tempPath) {
      console.log('✅ Ruta de archivos temporales:', tempPath);
      
      // Aquí guardarías archivos temporales
      // await guardarArchivosTemporales(tempPath);
      
    } else {
      console.log('❌ No se pudo obtener ruta temporal');
    }
    
  } catch (error) {
    console.error('Error obteniendo ruta temporal:', error);
  }
}

/**
 * Ejemplo 4: Manejo de errores y validaciones
 */
async function ejemploValidaciones() {
  try {
    console.log('=== Ejemplo: Validaciones ===');
    
    // Intentar con tipo inválido
    try {
      await pathManager.getStoragePath('invalido');
    } catch (error) {
      console.log('✅ Error esperado para tipo inválido:', error.message);
    }
    
    // Verificar detección del SO
    console.log('Sistema operativo detectado:', pathManager.getOSDisplayName());
    
    // Mostrar información del sistema
    const systemInfo = {
      os: pathManager.os,
      appName: pathManager.appName,
      allPaths: pathManager.getAllDefaultPaths()
    };
    
    console.log('Información del sistema:', systemInfo);
    
  } catch (error) {
    console.error('Error en validaciones:', error);
  }
}

/**
 * Ejemplo 5: Integración con el sistema de archivos de la aplicación
 */
class ConfigManager {
  constructor() {
    this.pathManager = new StoragePathManager();
    this.configPath = null;
  }
  
  async initialize() {
    try {
      // Intentar obtener ruta de configuración
      this.configPath = await this.pathManager.getStoragePath('config', true);
      
      if (this.configPath) {
        console.log('ConfigManager inicializado con ruta:', this.configPath);
        return true;
      } else {
        console.warn('ConfigManager no pudo inicializarse - sin ruta');
        return false;
      }
    } catch (error) {
      console.error('Error inicializando ConfigManager:', error);
      return false;
    }
  }
  
  async saveConfig(configData) {
    if (!this.configPath) {
      throw new Error('ConfigManager no está inicializado');
    }
    
    // Simular guardado de configuración
    const configFile = `${this.configPath}/config.json`;
    console.log('Guardando configuración en:', configFile);
    console.log('Datos:', configData);
    
    // En una aplicación real, aquí escribirías al archivo
    // await fs.writeFile(configFile, JSON.stringify(configData, null, 2));
    
    return true;
  }
  
  async loadConfig() {
    if (!this.configPath) {
      throw new Error('ConfigManager no está inicializado');
    }
    
    // Simular carga de configuración
    const configFile = `${this.configPath}/config.json`;
    console.log('Cargando configuración desde:', configFile);
    
    // En una aplicación real, aquí leerías del archivo
    // const data = await fs.readFile(configFile, 'utf8');
    // return JSON.parse(data);
    
    return { theme: 'dark', language: 'es' }; // Configuración simulada
  }
}

/**
 * Función para ejecutar todos los ejemplos
 */
async function ejecutarEjemplos() {
  console.log('🚀 Iniciando ejemplos de StoragePathManager...\n');
  
  // Ejemplo básico de configuración
  await ejemploConfiguracion();
  console.log('\n');
  
  // Ejemplo de datos de usuario
  await ejemploDatosUsuario();
  console.log('\n');
  
  // Ejemplo de archivos temporales
  await ejemploTemp();
  console.log('\n');
  
  // Ejemplo de validaciones
  await ejemploValidaciones();
  console.log('\n');
  
  // Ejemplo de integración con ConfigManager
  console.log('=== Ejemplo: ConfigManager ===');
  const configManager = new ConfigManager();
  const initialized = await configManager.initialize();
  
  if (initialized) {
    await configManager.saveConfig({
      theme: 'dark',
      language: 'es',
      autoSave: true
    });
    
    const config = await configManager.loadConfig();
    console.log('Configuración cargada:', config);
  }
  
  console.log('\n✅ Todos los ejemplos completados');
}

/**
 * Función para usar en botones de la interfaz
 */
async function configurarAlmacenamiento() {
  const pathManager = new StoragePathManager();
  
  try {
    const configPath = await pathManager.getStoragePath('config');
    if (configPath) {
      alert(`Ruta de configuración configurada: ${configPath}`);
      
      // Guardar la ruta en el localStorage para uso posterior
      localStorage.setItem('app-config-path', configPath);
      
      return configPath;
    }
  } catch (error) {
    alert(`Error configurando almacenamiento: ${error.message}`);
  }
  
  return null;
}

// Exportar funciones para uso en otros módulos
export {
  ejemploConfiguracion,
  ejemploDatosUsuario,
  ejemploTemp,
  ejemploValidaciones,
  ConfigManager,
  ejecutarEjemplos,
  configurarAlmacenamiento
};

// Si se ejecuta directamente, correr los ejemplos
if (typeof window !== 'undefined') {
  // En navegador, exponer funciones globalmente
  window.storageExamples = {
    ejecutarEjemplos,
    configurarAlmacenamiento,
    ConfigManager
  };
  
  // Agregar botones de prueba al DOM si no existen
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.getElementById('storage-test-buttons')) {
      const testContainer = document.createElement('div');
      testContainer.id = 'storage-test-buttons';
      testContainer.style.cssText = `
        position: fixed;
        top: 10px;
        right: 10px;
        z-index: 9999;
        background: white;
        padding: 10px;
        border: 1px solid #ccc;
        border-radius: 4px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      `;
      
      testContainer.innerHTML = `
        <h4 style="margin: 0 0 10px;">Storage Path Tests</h4>
        <button onclick="storageExamples.ejecutarEjemplos()" style="display: block; margin: 5px 0; padding: 5px 10px;">
          Ejecutar Ejemplos
        </button>
        <button onclick="storageExamples.configurarAlmacenamiento()" style="display: block; margin: 5px 0; padding: 5px 10px;">
          Configurar Almacenamiento
        </button>
      `;
      
      document.body.appendChild(testContainer);
    }
  });
}
