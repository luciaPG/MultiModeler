/**
 * Validador de formato .mmproject
 * 
 * Valida la estructura y coherencia de archivos de proyecto multi-notación.
 */

export const mmprojectValidator = {
  /**
   * Valida un proyecto .mmproject completo
   */
  validateProject(projectData) {
    const errors = [];

    if (!projectData || typeof projectData !== 'object') {
      errors.push('El proyecto debe ser un objeto válido');
      return { isValid: false, errors };
    }

    // Detectar tipo de estructura
    const isImportExportFormat = projectData.panels && projectData.connections;
    const isAutosaveFormat = projectData.version && projectData.bpmn && projectData.ppinot && projectData.rasci;

    if (isImportExportFormat) {
      this.validateImportExportFormat(projectData, errors);
    } else if (isAutosaveFormat) {
      this.validateAutosaveFormat(projectData, errors);
    } else {
      errors.push('Formato de proyecto no reconocido');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Valida formato ImportExportManager
   */
  validateImportExportFormat(projectData, errors) {
    // Validar paneles requeridos
    const requiredPanels = ['bpmn', 'ppi', 'rasci'];
    requiredPanels.forEach(panel => {
      if (!projectData.panels[panel]) {
        errors.push(`Panel requerido '${panel}' no encontrado`);
      }
    });

    // Validar conexiones
    this.validateConnections(projectData, errors);

    // Validar matriz RASCI
    if (projectData.panels?.rasci?.matrix) {
      this.validateRasciMatrix(projectData.panels.rasci.matrix, errors);
    }
  },

  /**
   * Valida formato AutosaveManager
   */
  validateAutosaveFormat(projectData, errors) {
    // Validar campos requeridos
    const requiredFields = ['version', 'bpmn', 'ppinot', 'rasci'];
    requiredFields.forEach(field => {
      if (!projectData[field]) {
        errors.push(`Campo requerido '${field}' no encontrado`);
      }
    });

    // Validar PPINOT
    if (projectData.ppinot && !Array.isArray(projectData.ppinot.ppis)) {
      errors.push('PPINOT debe contener un array de PPIs');
    }

    // Validar RASCI
    if (projectData.rasci?.matrix) {
      this.validateRasciMatrix(projectData.rasci.matrix, errors);
    }
  },

  /**
   * Valida las conexiones entre notaciones
   */
  validateConnections(projectData, errors) {
    const { connections, panels } = projectData;

    if (connections.ppiToBpmn) {
      Object.keys(connections.ppiToBpmn).forEach(ppiId => {
        // Verificar que el PPI existe en el panel
        const ppiExists = panels.ppi?.indicators?.some(ppi => ppi.id === ppiId);
        if (!ppiExists) {
          errors.push(`Conexión PPI '${ppiId}' referencia un PPI que no existe en el panel`);
        }
      });
    }

    // Verificar coherencia entre PPIs del panel y conexiones
    if (panels.ppi?.indicators) {
      panels.ppi.indicators.forEach(ppi => {
        if (!connections.ppiToBpmn?.[ppi.id]) {
          errors.push(`PPI '${ppi.id}' no tiene conexiones BPMN definidas`);
        }
      });
    }
  },

  /**
   * Valida la matriz RASCI
   */
  validateRasciMatrix(matrix, errors) {
    Object.entries(matrix).forEach(([taskId, assignments]) => {
      const roles = Object.values(assignments);
      const accountableCount = roles.filter(role => role === 'A').length;
      const responsibleCount = roles.filter(role => role === 'R').length;

      if (accountableCount === 0) {
        errors.push(`Tarea '${taskId}' debe tener al menos un rol 'A' (Accountable)`);
      }

      if (responsibleCount === 0) {
        errors.push(`Tarea '${taskId}' debe tener al menos un rol 'R' (Responsible)`);
      }
    });
  }
};
