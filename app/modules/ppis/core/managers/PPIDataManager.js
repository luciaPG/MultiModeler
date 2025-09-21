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
  constructor(options = {}) {
    this.ppis = [];
    this.filteredPPIs = [];
    this.isSaving = false; // Control de concurrencia para evitar múltiples guardados
    this.isLoading = false; // Control de concurrencia para evitar múltiples cargas
    
    this.measureTypes = {
      time: { name: 'Medida de Tiempo', icon: 'fas fa-clock' },
      count: { name: 'Medida de Conteo', icon: 'fas fa-hashtag' },
      state: { name: 'Condición de Estado', icon: 'fas fa-toggle-on' },
      data: { name: 'Medida de Datos', icon: 'fas fa-database' },
      derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' },
      aggregated: { name: 'Medida Agregada', icon: 'fas fa-chart-bar' }
    };
    
    // No cargar automáticamente en tests para permitir control manual
    if (!options.skipAutoLoad && typeof window !== 'undefined' && !window.jest) {
      this.loadPPIs();
    }
    
    // En tests, inicializar sin carga automática pero resetear flags
    if (options.skipAutoLoad || (typeof window !== 'undefined' && window.jest)) {
      this.isLoading = false;
      this.isSaving = false;
    }
    
    // IMPORTANTE: Aplicar filtro inicial para excluir medidas agregadas
    this.filterPPIs();
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
    try {
      if (ppi.elementId) {
        const existingIndex = this.ppis.findIndex(p => p.elementId === ppi.elementId);
        if (existingIndex !== -1) {
          this.ppis[existingIndex] = { ...this.ppis[existingIndex], ...ppi, updatedAt: new Date().toISOString() };
          await this.savePPIs();
          return { success: true, data: this.ppis[existingIndex] };
        }
      }
      
      // Asegurar que el PPI tenga un ID
      if (!ppi.id) {
        ppi.id = this.generatePPIId();
      }
      
      this.ppis.push(ppi);
      await this.savePPIs();
      return { success: true, data: ppi };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async updatePPI(ppiId, updatedData) {
    try {
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
        return { success: true, data: this.ppis[index] };
      }
      return { success: false, error: 'PPI not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  async deletePPI(ppiId) {
    try {
      const index = this.ppis.findIndex(p => p.id === ppiId);
      if (index !== -1) {
        const deletedPPI = this.ppis.splice(index, 1)[0];
        await this.savePPIs();
        return { success: true, data: deletedPPI };
      }
      return { success: false, error: 'PPI not found' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // ==================== CONSULTAS ====================

  getPPI(ppiId) {
    return this.ppis.find(p => p.id === ppiId);
  }

  getAllPPIs() {
    return [...this.ppis];
  }
  
  /**
   * Obtiene PPIs visibles para el panel (excluye medidas agregadas y solo muestra las que están en canvas)
   */
  getVisiblePPIs() {
    const visiblePPIs = this.ppis.filter(ppi => {
      // Debug: Mostrar información de cada PPI
      console.log(`🔍 [PPIDataManager] Evaluando PPI: ${ppi.name || ppi.id}`, {
        type: ppi.type,
        elementId: ppi.elementId,
        measureType: ppi.measureDefinition?.type,
        parentId: ppi.parentId,
        isChild: ppi.isChild,
        derivedFrom: ppi.derivedFrom,
        measureDefinition: ppi.measureDefinition
      });
      
      // PRIMERA PRIORIDAD: Excluir medidas agregadas Y medidas base (incluso si tienen elementId)
      const isAggregatedOrBaseMeasure = (
        (ppi.type && (ppi.type.includes('Aggregated') || ppi.type === 'aggregated')) ||
        (ppi.measureType && (ppi.measureType.includes('Aggregated') || ppi.measureType === 'aggregated')) ||
        (ppi.measureDefinition?.type && ppi.measureDefinition.type.includes('Aggregated')) ||
        (ppi.elementId && ppi.elementId.includes('AggregatedMeasure')) || // Detectar medidas agregadas por ID
        (ppi.elementId && ppi.elementId.includes('BaseMeasure')) // Detectar medidas base por ID
      );
      
      if (isAggregatedOrBaseMeasure) {
        console.log(`❌ [PPIDataManager] Excluida medida agregada/base: ${ppi.name || ppi.id} (elementId: ${ppi.elementId})`);
        return false;
      }
      
      // SEGUNDA PRIORIDAD: Excluir PPIs hijas/derivadas
      const isChildPPI = (
        ppi.parentId ||                                    // Tiene un PPI padre
        ppi.isChild === true ||                           // Marcada explícitamente como hija
        ppi.derivedFrom ||                                // Deriva de otra PPI
        (ppi.measureDefinition && ppi.measureDefinition.parentMeasure) || // Medida con padre
        (ppi.type && ppi.type.includes('Derived')) ||     // Tipo derivado
        (ppi.measureDefinition?.type && ppi.measureDefinition.type.includes('Derived'))
      );
      
      if (isChildPPI) {
        console.log(`❌ [PPIDataManager] Excluida PPI hija/derivada: ${ppi.name || ppi.id} (parentId: ${ppi.parentId}, derivedFrom: ${ppi.derivedFrom})`);
        return false;
      }
      
      // Solo mostrar PPIs que estén vinculadas a elementos en el canvas
      const isInCanvas = ppi.elementId && ppi.elementId.trim() !== '';
      
      if (!isInCanvas) {
        console.log(`❌ [PPIDataManager] Excluida PPI sin canvas: ${ppi.name || ppi.id}`);
        return false;
      }
      
      console.log(`✅ [PPIDataManager] PPI visible: ${ppi.name || ppi.id}`);
      return true;
    });
    
    console.log(`📊 [PPIDataManager] PPIs filtradas: ${this.ppis.length} total → ${visiblePPIs.length} visibles`);
    return visiblePPIs;
  }

  getPPIsForElement(elementId) {
    return this.ppis.filter(p => p.elementId === elementId);
  }

  // ==================== FILTROS Y BÚSQUEDAS ====================

  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    this.filteredPPIs = this.ppis.filter(ppi => {
      // PRIMERA PRIORIDAD: Excluir medidas agregadas Y medidas base del panel PPI (incluso si tienen elementId)
      const isAggregatedOrBaseMeasure = (
        (ppi.type && (ppi.type.includes('Aggregated') || ppi.type === 'aggregated')) ||
        (ppi.measureType && (ppi.measureType.includes('Aggregated') || ppi.measureType === 'aggregated')) ||
        (ppi.measureDefinition?.type && ppi.measureDefinition.type.includes('Aggregated')) ||
        (ppi.elementId && ppi.elementId.includes('AggregatedMeasure')) || // Detectar medidas agregadas por ID
        (ppi.elementId && ppi.elementId.includes('BaseMeasure')) // Detectar medidas base por ID
      );
      
      if (isAggregatedOrBaseMeasure) {
        return false; // No mostrar medidas agregadas/base en el panel
      }
      
      // SEGUNDA PRIORIDAD: Excluir PPIs hijas/derivadas del panel PPI
      const isChildPPI = (
        ppi.parentId ||                                    // Tiene un PPI padre
        ppi.isChild === true ||                           // Marcada explícitamente como hija
        ppi.derivedFrom ||                                // Deriva de otra PPI
        (ppi.measureDefinition && ppi.measureDefinition.parentMeasure) || // Medida con padre
        (ppi.type && ppi.type.includes('Derived')) ||     // Tipo derivado
        (ppi.measureDefinition?.type && ppi.measureDefinition.type.includes('Derived'))
      );
      
      if (isChildPPI) {
        return false; // No mostrar PPIs hijas/derivadas en el panel
      }
      
      // Solo mostrar PPIs que estén en el canvas
      const isInCanvas = ppi.elementId && ppi.elementId.trim() !== '';
      if (!isInCanvas) {
        return false; // No mostrar PPIs que no estén vinculadas al canvas
      }
      
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
    // Control de concurrencia para evitar múltiples cargas simultáneos
    if (this.isLoading) {
      console.log('⏳ Ya hay una carga en progreso, omitiendo...');
      return { success: true, reason: 'Already loading' };
    }

    this.isLoading = true;
    
    try {
      console.log('📂 Cargando PPIs usando nuevo LocalStorageManager...');
      
      // Usar el nuevo LocalStorageManager para cargar todo el estado del proyecto
      const storageManager = LocalStorageManager;
      
      const result = await storageManager.loadProject();
      
      if (result && result.success) {
        // Actualizar la lista local de PPIs con los datos cargados
        if (result.data && result.data.ppi && result.data.ppi.indicators) {
          this.ppis = result.data.ppi.indicators;
          console.log(`✅ ${this.ppis.length} PPIs cargados desde localStorage`);
          
          // IMPORTANTE: Aplicar filtro automáticamente después de cargar para excluir agregadas
          this.filterPPIs(); // Esto establecerá filteredPPIs sin agregadas
          console.log(`🔍 Filtro aplicado automáticamente: ${this.filteredPPIs.length} PPIs visibles`);
        } else {
          this.ppis = [];
          this.filteredPPIs = [];
          console.log('ℹ️ No hay PPIs guardados, inicializando lista vacía');
        }
        return { success: true, data: this.getVisiblePPIs() };
      } else {
        this.ppis = [];
        console.log('ℹ️ No hay datos guardados o error en carga, inicializando lista vacía');
        // En tests, esto no es un error - es normal no tener datos
        return { success: true, data: this.ppis, reason: 'No data or handled gracefully' };
      }
    } catch (error) {
      console.error('❌ Error en loadPPIs:', error);
      this.ppis = [];
      return { success: false, error: error.message };
    } finally {
      this.isLoading = false;
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
