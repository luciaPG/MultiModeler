// Claves para localStorage
const STORAGE_KEY_MATRIX = 'rasciMatrixData';
const STORAGE_KEY_ROLES = 'rasciRoles';

// Claves legadas utilizadas antes del refactor de almacenamiento
const LEGACY_STORAGE_KEY_MATRIX = 'rasci_matrix_data';
const LEGACY_STORAGE_KEY_ROLES = 'rasci_roles_data';

// SOLUCIÓN ROLES DUPLICADOS: Importar RoleIdManager
import { roleIdManager } from './core/role-id-manager.js';

// Cargar datos desde localStorage al inicializar
let _matrix = {};
let _roles = [];

try {
  const savedMatrix =
    localStorage.getItem(STORAGE_KEY_MATRIX) ||
    localStorage.getItem(LEGACY_STORAGE_KEY_MATRIX);
  if (savedMatrix) {
    _matrix = JSON.parse(savedMatrix);
    // Migrar datos legados a la nueva clave para evitar inconsistencias futuras
    if (localStorage.getItem(LEGACY_STORAGE_KEY_MATRIX)) {
      localStorage.setItem(STORAGE_KEY_MATRIX, savedMatrix);
      localStorage.removeItem(LEGACY_STORAGE_KEY_MATRIX);
    }
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('📦 Matriz RASCI cargada desde localStorage:', _matrix);
  }
} catch (error) {
  console.warn('Error al cargar matriz desde localStorage:', error);
}

try {
  const savedRoles =
    localStorage.getItem(STORAGE_KEY_ROLES) ||
    localStorage.getItem(LEGACY_STORAGE_KEY_ROLES);
  if (savedRoles) {
    _roles = JSON.parse(savedRoles);
    // Migrar datos legados a la nueva clave
    if (localStorage.getItem(LEGACY_STORAGE_KEY_ROLES)) {
      localStorage.setItem(STORAGE_KEY_ROLES, savedRoles);
      localStorage.removeItem(LEGACY_STORAGE_KEY_ROLES);
    }
    try {
      localStorage.setItem('ralphRoles', JSON.stringify(_roles));
    } catch (legacyError) {
      console.warn('Error al sincronizar roles RALph legacy:', legacyError);
    }
    // Optimización: Log eliminado para mejorar rendimiento
    // console.log('📦 Roles RASCI cargados desde localStorage:', _roles);
  }
} catch (error) {
  console.warn('Error al cargar roles desde localStorage:', error);
}

export const RasciStore = {
  getMatrix: () => {
    return _matrix;
  },
  setMatrix: (m) => { 
    _matrix = m || {}; 
    try {
      localStorage.setItem(STORAGE_KEY_MATRIX, JSON.stringify(_matrix));
      // Asegurar que las claves legadas no conserven datos obsoletos
      if (localStorage.getItem(LEGACY_STORAGE_KEY_MATRIX)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY_MATRIX);
      }
    } catch (error) {
      console.warn('Error al guardar matriz en localStorage:', error);
    }
  },
  getRoles: () => {
    return _roles;
  },
  getRolesWithIds: () => {
    try {
      const rolesWithIds = localStorage.getItem('rasci_roles_with_ids');
      return rolesWithIds ? JSON.parse(rolesWithIds) : [];
    } catch (error) {
      console.warn('Error al cargar roles con IDs:', error);
      return [];
    }
  },
  setRoles: (r) => { 
    const rolesArray = Array.isArray(r) ? r : [];
    
    // SOLUCIÓN ROLES DUPLICADOS: Migrar a IDs únicos
    const rolesMigrados = roleIdManager.migrateExistingRoles(rolesArray);
    
    // Guardar tanto los roles originales como los IDs únicos
    _roles = rolesArray; // Mantener compatibilidad
    
    try {
      localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(_roles));
      localStorage.setItem('rasci_roles_with_ids', JSON.stringify(rolesMigrados));
      // Compatibilidad: exponer roles para integraciones RALph legacy
      try {
        localStorage.setItem('ralphRoles', JSON.stringify(rolesArray));
      } catch (legacyError) {
        console.warn('Error al guardar roles RALph legacy:', legacyError);
      }
      // Limpiar claves legadas para mantener un único origen de verdad
      if (localStorage.getItem(LEGACY_STORAGE_KEY_ROLES)) {
        localStorage.removeItem(LEGACY_STORAGE_KEY_ROLES);
      }

      if (rolesMigrados.length !== rolesArray.length) {
        console.log(`⚠️ Roles duplicados detectados y migrados: ${rolesArray.length} → ${rolesMigrados.length} únicos`);
      }
    } catch (error) {
      console.warn('Error al guardar roles en localStorage:', error);
    }
  },
};
