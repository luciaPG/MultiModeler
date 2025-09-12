// Claves para localStorage
const STORAGE_KEY_MATRIX = 'rasci_matrix_data';
const STORAGE_KEY_ROLES = 'rasci_roles_data';

// Cargar datos desde localStorage al inicializar
let _matrix = {};
let _roles = [];

try {
  const savedMatrix = localStorage.getItem(STORAGE_KEY_MATRIX);
  if (savedMatrix) {
    _matrix = JSON.parse(savedMatrix);
    console.log('📦 Matriz RASCI cargada desde localStorage:', _matrix);
  }
} catch (error) {
  console.warn('Error al cargar matriz desde localStorage:', error);
}

try {
  const savedRoles = localStorage.getItem(STORAGE_KEY_ROLES);
  if (savedRoles) {
    _roles = JSON.parse(savedRoles);
    console.log('📦 Roles RASCI cargados desde localStorage:', _roles);
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
    } catch (error) {
      console.warn('Error al guardar matriz en localStorage:', error);
    }
  },
  getRoles: () => {
    return _roles;
  },
  setRoles: (r) => { 
    _roles = Array.isArray(r) ? r : []; 
    try {
      localStorage.setItem(STORAGE_KEY_ROLES, JSON.stringify(_roles));
    } catch (error) {
      console.warn('Error al guardar roles en localStorage:', error);
    }
  },
};
