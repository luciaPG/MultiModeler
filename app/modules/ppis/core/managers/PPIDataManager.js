/**
 * PPIDataManager
 * 
 * Responsabilidades:
 * - Gestión CRUD de PPIs (Create, Read, Update, Delete)
 * - Almacenamiento y persistencia de datos
 * - Filtros y búsquedas
 * - Estadísticas y exportación
 */

export class PPIDataManager {
  constructor() {
    this.ppis = [];
    this.filteredPPIs = [];
    
    this.measureTypes = {
      time: { name: 'Medida de Tiempo', icon: 'fas fa-clock' },
      count: { name: 'Medida de Conteo', icon: 'fas fa-hashtag' },
      state: { name: 'Condición de Estado', icon: 'fas fa-toggle-on' },
      data: { name: 'Medida de Datos', icon: 'fas fa-database' },
      derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' },
      aggregated: { name: 'Medida Agregada', icon: 'fas fa-chart-bar' }
    };
    
    this.loadPPIs();
  }

  // ==================== GENERACIÓN Y CREACIÓN ====================

  generatePPIId() {
    return 'ppi_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  createPPI(data) {
    return {
      id: this.generatePPIId(),
      title: data.title || data.process,
      process: data.process,
      businessObjective: data.businessObjective,
      measureDefinition: {
        type: data.measureType,
        definition: data.measureDefinition
      },
      target: data.target || '',
      scope: data.scope || '',
      elementId: data.elementId || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  // ==================== OPERACIONES CRUD ====================

  addPPI(ppi) {
    if (ppi.elementId) {
      const existingIndex = this.ppis.findIndex(p => p.elementId === ppi.elementId);
      if (existingIndex !== -1) {
        this.ppis[existingIndex] = { ...this.ppis[existingIndex], ...ppi, updatedAt: new Date().toISOString() };
        return this.ppis[existingIndex];
      }
    }
    this.ppis.push(ppi);
    this.savePPIs();
    return ppi;
  }

  updatePPI(ppiId, updatedData, __source = null) {
    const index = this.ppis.findIndex(p => p.id === ppiId);
    if (index !== -1) {
      // Limpiar datos undefined/null
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([_, value]) => value !== undefined && value !== null)
      );
      
      this.ppis[index] = {
        ...this.ppis[index],
        ...cleanData,
        updatedAt: new Date().toISOString()
      };
      
      this.savePPIs();
      return this.ppis[index];
    }
    return null;
  }

  deletePPI(ppiId) {
    const index = this.ppis.findIndex(p => p.id === ppiId);
    if (index !== -1) {
      const deletedPPI = this.ppis.splice(index, 1)[0];
      this.savePPIs();
      return deletedPPI;
    }
    return null;
  }

  // ==================== CONSULTAS ====================

  getPPI(ppiId) {
    return this.ppis.find(p => p.id === ppiId);
  }

  getAllPPIs() {
    return [...this.ppis];
  }

  getPPIsForElement(elementId) {
    return this.ppis.filter(p => p.elementId === elementId);
  }

  // ==================== FILTROS Y BÚSQUEDAS ====================

  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    this.filteredPPIs = this.ppis.filter(ppi => {
      const matchesSearch = !searchTerm || 
        (ppi.title && ppi.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (ppi.process && ppi.process.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesType = !typeFilter || 
        (ppi.measureDefinition && ppi.measureDefinition.type === typeFilter);
      
      const matchesStatus = !statusFilter || 
        (statusFilter === 'linked' ? !!ppi.elementId : !ppi.elementId);
      
      return matchesSearch && matchesType && matchesStatus;
    });
    
    return this.filteredPPIs;
  }

  // ==================== ESTADÍSTICAS ====================

  getStatistics() {
    const total = this.ppis.length;
    const linked = this.ppis.filter(p => p.elementId).length;
    const byType = {};
    
    Object.keys(this.measureTypes).forEach(type => {
      byType[type] = this.ppis.filter(p => 
        p.measureDefinition && p.measureDefinition.type === type
      ).length;
    });
    
    return {
      total,
      linked,
      unlinked: total - linked,
      byType
    };
  }

  // ==================== PERSISTENCIA ====================

  savePPIs() {
    // ELIMINADO: No guardar en localStorage - usar solo autosave
    console.log('ℹ️ savePPIs deshabilitado - usar solo autosave');
  }

  loadPPIs() {
    // ELIMINADO: No cargar de localStorage - usar solo autosave  
    console.log('ℹ️ loadPPIs deshabilitado - usar solo autosave');
    this.ppis = [];
  }

  // ==================== EXPORTACIÓN ====================

  exportPPIsToFile() {
    const dataStr = JSON.stringify(this.ppis, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `ppis_export_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // ==================== UTILIDADES ====================

  parseFormData(formData) {
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  }
}
