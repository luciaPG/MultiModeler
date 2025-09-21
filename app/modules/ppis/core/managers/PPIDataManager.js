/**
 * PPIDataManager
 * 
 * Responsabilidades:
 * - Gestión CRUD de PPIs (Create, Read, Update, Delete)
 * - Almacenamiento y persistencia de datos
 * - Filtros y búsquedas
 * - Estadísticas y exportación
 */

// Importar el LocalStorageManager
import LocalStorageManager from '../../../../services/local-storage-manager.js';

export class PPIDataManager {
  constructor() {
    this.ppis = [];
    this.filteredPPIs = [];
    this.isSaving = false; // Control de concurrencia para evitar múltiples guardados
    
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

  async addPPI(ppi) {
    if (ppi.elementId) {
      const existingIndex = this.ppis.findIndex(p => p.elementId === ppi.elementId);
      if (existingIndex !== -1) {
        this.ppis[existingIndex] = { ...this.ppis[existingIndex], ...ppi, updatedAt: new Date().toISOString() };
        await this.savePPIs();
        return this.ppis[existingIndex];
      }
    }
    this.ppis.push(ppi);
    await this.savePPIs();
    return ppi;
  }

  async updatePPI(ppiId, updatedData) {
    const index = this.ppis.findIndex(p => p.id === ppiId);
    if (index !== -1) {
      // Limpiar datos undefined/null
      const cleanData = Object.fromEntries(
        Object.entries(updatedData).filter(([, value]) => value !== undefined && value !== null)
      );
      
      this.ppis[index] = {
        ...this.ppis[index],
        ...cleanData,
        updatedAt: new Date().toISOString()
      };
      
      await this.savePPIs();
      return this.ppis[index];
    }
    return null;
  }

  async deletePPI(ppiId) {
    const index = this.ppis.findIndex(p => p.id === ppiId);
    if (index !== -1) {
      const deletedPPI = this.ppis.splice(index, 1)[0];
      await this.savePPIs();
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

  async savePPIs() {
    // Control de concurrencia para evitar múltiples guardados simultáneos
    if (this.isSaving) {
      console.log('⏳ Ya hay un guardado en progreso, omitiendo...');
      return { success: true, reason: 'Already saving' };
    }

    this.isSaving = true;
    
    try {
      console.log('💾 Guardando PPIs usando nuevo LocalStorageManager...');
      
      // Usar el nuevo LocalStorageManager para guardar todo el estado del proyecto
      const storageManager = LocalStorageManager;
      
      const result = await storageManager.saveProject();
      
      if (result.success) {
        console.log('✅ PPIs guardados exitosamente');
      } else {
        console.warn('⚠️ Error guardando PPIs:', result.error || result.reason);
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error en savePPIs:', error);
      return { success: false, error: error.message };
    } finally {
      this.isSaving = false;
    }
  }

  async loadPPIs() {
    try {
      console.log('📂 Cargando PPIs usando nuevo LocalStorageManager...');
      
      // Usar el nuevo LocalStorageManager para cargar todo el estado del proyecto
      const storageManager = LocalStorageManager;
      
      const result = await storageManager.loadProject();
      
      if (result.success) {
        // Actualizar la lista local de PPIs con los datos cargados
        if (result.data && result.data.ppi && result.data.ppi.indicators) {
          this.ppis = result.data.ppi.indicators;
          console.log(`✅ ${this.ppis.length} PPIs cargados desde localStorage`);
        } else {
          this.ppis = [];
          console.log('ℹ️ No hay PPIs guardados, inicializando lista vacía');
        }
      } else {
        console.warn('⚠️ Error cargando PPIs:', result.error || result.reason);
        this.ppis = [];
      }
      
      return result;
    } catch (error) {
      console.error('❌ Error en loadPPIs:', error);
      this.ppis = [];
      return { success: false, error: error.message };
    }
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
