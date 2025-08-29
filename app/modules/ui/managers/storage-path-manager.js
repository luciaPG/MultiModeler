/**
 * Simplified Storage Path Manager - Solo maneja C:/Users/[username]/Documents/MultiNotation Modeler
 */

import { getServiceRegistry } from '../core/ServiceRegistry.js';

class StoragePathManager {
  constructor() {
    this.defaultFolder = 'MultiNotation Modeler';
  }

  /**
   * Obtiene el nombre del usuario actual
   * @returns {string} Nombre del usuario detectado
   */
  getCurrentUsername() {
    // Intentar obtener del localStorage primero
    let username = localStorage.getItem('detected-username');
    
    if (!username) {
      // Intentar detectar del entorno
      const userProfile = this.getEnvironmentVariable('USERPROFILE');
      if (userProfile) {
        const parts = userProfile.split('\\');
        username = parts[parts.length - 1];
      } else {
        username = 'Usuario'; // Fallback
      }
      
      // Guardar para futuras consultas
      localStorage.setItem('detected-username', username);
    }
    
    return username;
  }

  /**
   * Obtiene la ruta completa para MultiNotation Modeler
   * @returns {string} Ruta completa C:/Users/[username]/Documents/MultiNotation Modeler
   */
  getProjectPath() {
    const username = this.getCurrentUsername();
    return `C:\\Users\\${username}\\Documents\\${this.defaultFolder}`;
  }

  /**
   * Obtiene variable de entorno (simulación para navegador)
   * @param {string} varName - Nombre de la variable
   * @returns {string|null} Valor de la variable o null
   */
  getEnvironmentVariable(varName) {
    // En navegador no podemos acceder a variables de entorno reales
    // Usar estimaciones basadas en patrones comunes
    if (varName === 'USERPROFILE') {
      const stored = localStorage.getItem('detected-username');
      return stored ? `C:\\Users\\${stored}` : null;
    }
    return null;
  }

  /**
   * Configurar manualmente el nombre de usuario
   * @param {string} username - Nombre del usuario
   */
  setUsername(username) {
    localStorage.setItem('detected-username', username);
    console.log(`✅ Usuario configurado: ${username}`);
  }

  /**
   * Obtiene información del sistema simplificada
   * @returns {Object} Información básica del path
   */
  getSystemInfo() {
    const username = this.getCurrentUsername();
    const projectPath = this.getProjectPath();
    
    return {
      os: 'windows',
      username: username,
      projectPath: projectPath,
      documentsPath: `C:\\Users\\${username}\\Documents`
    };
  }
}

// Register in ServiceRegistry

const pathManagerInstance = new StoragePathManager();
const registry = getServiceRegistry();
if (registry) {
  registry.register('StoragePathManager', pathManagerInstance, {
    description: 'Cross-platform storage path manager'
  });
}

// Debug exposure only in development
if (process.env.NODE_ENV !== 'production') {
  globalThis.__debug = { ...(globalThis.__debug || {}), pathManager: pathManagerInstance };
}

// Exportar para uso en módulos
export default StoragePathManager;
