let _matrix = {};
let _roles = [];

export const RasciStore = {
  getMatrix: () => _matrix,
  setMatrix: (m) => { _matrix = m || {}; },
  getRoles: () => _roles,
  setRoles: (r) => { _roles = Array.isArray(r) ? r : []; },
};
