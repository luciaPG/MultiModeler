/**
 * Role ID Manager
 * 
 * Gestiona IDs únicos para roles RASCI para evitar conflictos con nombres duplicados
 */

class RoleIdManager {
  constructor() {
    this.roleMap = new Map(); // name -> { id, name, instances }
    this.idCounter = 1;
  }

  /**
   * Genera un ID único para un rol, manejando nombres duplicados
   * @param {string} roleName - Nombre del rol
   * @returns {string} - ID único del rol
   */
  generateRoleId(roleName) {
    if (!roleName || typeof roleName !== 'string') {
      throw new Error('Nombre de rol inválido');
    }

    const cleanName = roleName.trim();
    
    // Si ya existe un rol con este nombre, crear una instancia numerada
    if (this.roleMap.has(cleanName)) {
      const existing = this.roleMap.get(cleanName);
      existing.instances++;
      const newId = `${cleanName}_${existing.instances}`;
      
      console.log(`⚠️ Rol duplicado detectado: "${cleanName}" → ID único: "${newId}"`);
      return newId;
    } else {
      // Primera vez que vemos este nombre
      const id = cleanName; // Usar el nombre como ID si es único
      this.roleMap.set(cleanName, {
        id: id,
        name: cleanName,
        instances: 1
      });
      
      return id;
    }
  }

  /**
   * Obtiene el nombre display de un rol por su ID
   * @param {string} roleId - ID del rol
   * @returns {string} - Nombre para mostrar
   */
  getRoleDisplayName(roleId) {
    if (!roleId) return '';
    
    // Si el ID contiene un sufijo numérico, extraer el nombre base
    const match = roleId.match(/^(.+)_(\d+)$/);
    if (match) {
      return `${match[1]} (${match[2]})`;
    }
    
    return roleId;
  }

  /**
   * Verifica si un nombre de rol ya existe
   * @param {string} roleName - Nombre del rol
   * @returns {boolean} - True si ya existe
   */
  roleNameExists(roleName) {
    return this.roleMap.has(roleName.trim());
  }

  /**
   * Obtiene todos los roles registrados
   * @returns {Array} - Array de objetos { id, name, displayName }
   */
  getAllRoles() {
    const roles = [];
    this.roleMap.forEach((roleData, name) => {
      for (let i = 1; i <= roleData.instances; i++) {
        const id = i === 1 ? name : `${name}_${i}`;
        roles.push({
          id: id,
          name: name,
          displayName: this.getRoleDisplayName(id)
        });
      }
    });
    return roles;
  }

  /**
   * Limpia todos los roles registrados
   */
  clear() {
    this.roleMap.clear();
    this.idCounter = 1;
    console.log('🧹 Role ID Manager limpiado');
  }

  /**
   * Migra roles existentes sin IDs a roles con IDs únicos
   * @param {Array} existingRoles - Array de nombres de roles existentes
   * @returns {Array} - Array de objetos { id, name, displayName }
   */
  migrateExistingRoles(existingRoles) {
    if (!Array.isArray(existingRoles)) return [];
    
    console.log('🔄 Migrando roles existentes a sistema de IDs únicos...');
    
    this.clear(); // Limpiar estado anterior
    
    const migratedRoles = existingRoles.map(roleName => {
      const id = this.generateRoleId(roleName);
      return {
        id: id,
        name: roleName,
        displayName: this.getRoleDisplayName(id)
      };
    });
    
    console.log(`✅ ${migratedRoles.length} roles migrados con IDs únicos`);
    return migratedRoles;
  }
}

// Instancia singleton
const roleIdManager = new RoleIdManager();

export { RoleIdManager, roleIdManager };
export default roleIdManager;
