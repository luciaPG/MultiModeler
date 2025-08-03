// === PPI Core Functionality ===
// Funcionalidad principal del gestor de PPIs

class PPICore {
  constructor() {
    this.ppis = [];
    this.filteredPPIs = [];
    this.processedElements = new Set();
    this.measureTypes = {
      time: { name: 'Medida de Tiempo', icon: 'fas fa-clock' },
      count: { name: 'Medida de Conteo', icon: 'fas fa-hashtag' },
      state: { name: 'Condición de Estado', icon: 'fas fa-toggle-on' },
      data: { name: 'Medida de Datos', icon: 'fas fa-database' },
      derived: { name: 'Medida Derivada', icon: 'fas fa-calculator' },
      aggregated: { name: 'Medida Agregada', icon: 'fas fa-chart-bar' }
    };
  }

  // === CORE DATA MANAGEMENT ===
  
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
      target: data.target,
      scope: data.scope,
      source: data.source,
      responsible: data.responsible,
      informed: data.informed || [],
      comments: data.comments || '',
      elementId: data.elementId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  addPPI(ppi) {
    this.ppis.push(ppi);
    this.savePPIs();
    return ppi;
  }

  updatePPI(ppiId, updatedData) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      this.ppis[index] = { 
        ...this.ppis[index], 
        ...updatedData, 
        updatedAt: new Date().toISOString() 
      };
      this.savePPIs();
      return true;
    }
    return false;
  }

  deletePPI(ppiId) {
    const index = this.ppis.findIndex(ppi => ppi.id === ppiId);
    if (index !== -1) {
      this.ppis.splice(index, 1);
      this.savePPIs();
      return true;
    }
    return false;
  }

  getPPI(ppiId) {
    return this.ppis.find(ppi => ppi.id === ppiId);
  }

  getAllPPIs() {
    return this.ppis;
  }

  getPPIsForElement(elementId) {
    return this.ppis.filter(ppi => ppi.elementId === elementId);
  }

  // === PERSISTENCE ===
  
  savePPIs() {
    try {
      localStorage.setItem('ppis', JSON.stringify(this.ppis));
    } catch (e) {
      console.error('Error al guardar PPIs:', e);
    }
  }

  loadPPIs() {
    try {
      const saved = localStorage.getItem('ppis');
      if (saved) {
        this.ppis = JSON.parse(saved);
      }
    } catch (e) {
      console.error('Error al cargar PPIs:', e);
      this.ppis = [];
    }
  }

  // === FILTERING & SEARCH ===
  
  filterPPIs(searchTerm = '', typeFilter = '', statusFilter = '') {
    this.filteredPPIs = this.ppis.filter(ppi => {
      // Search filter
      const matchesSearch = !searchTerm || 
        ppi.title.toLowerCase().includes(searchTerm) ||
        ppi.process.toLowerCase().includes(searchTerm) ||
        ppi.businessObjective.toLowerCase().includes(searchTerm);

      // Type filter
      const matchesType = !typeFilter || ppi.measureDefinition.type === typeFilter;

      // Status filter
      let matchesStatus = true;
      if (statusFilter === 'linked') {
        matchesStatus = !!ppi.elementId;
      } else if (statusFilter === 'unlinked') {
        matchesStatus = !ppi.elementId;
      }

      return matchesSearch && matchesType && matchesStatus;
    });

    return this.filteredPPIs;
  }

  // === BPMN INTEGRATION ===
  
  isPPIElement(element) {
    if (!element) return false;
    
    if (element.businessObject && element.businessObject.$type) {
      const type = element.businessObject.$type;
      if (type === 'PPINOT:Ppi' || type.includes('Ppi')) {
        return true;
      }
    }
    
    if (element.type && (element.type === 'PPINOT:Ppi' || element.type.includes('Ppi'))) {
      return true;
    }
    
    return false;
  }

  detectMeasureType(elementId, elementType) {
    const id = elementId.toLowerCase();
    const type = elementType.toLowerCase();
    
    if (id.includes('time') || type.includes('time')) return 'time';
    if (id.includes('count') || type.includes('count')) return 'count';
    if (id.includes('data') || type.includes('data')) return 'data';
    if (id.includes('state') || type.includes('state')) return 'state';
    if (id.includes('aggregated') || type.includes('aggregated')) return 'aggregated';
    if (id.includes('derived') || type.includes('derived')) return 'derived';
    
    return 'derived'; // Por defecto
  }

  extractChildElementInfo(childElementId) {
    const info = {};
    
    try {
      if (window.modeler) {
        const elementRegistry = window.modeler.get('elementRegistry');
        const element = elementRegistry.get(childElementId);
        
        if (element && element.businessObject) {
          const name = element.businessObject.name || '';
          const type = element.businessObject.$type || '';
          
          // Clasificar según el tipo o ID del elemento (case-insensitive)
          if (childElementId.toLowerCase().includes('target') || type.toLowerCase().includes('target')) {
            info.target = name || `Target definido en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('scope') || type.toLowerCase().includes('scope')) {
            info.scope = name || `Scope definido en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('measure') || childElementId.toLowerCase().includes('medida') || type.toLowerCase().includes('measure')) {
            info.measureDefinition = {
              type: this.detectMeasureType(childElementId, type),
              definition: name || `Medida definida en ${childElementId}`
            };
          }
          
          if (childElementId.toLowerCase().includes('condition') || type.toLowerCase().includes('condition')) {
            info.businessObjective = name || `Condición definida en ${childElementId}`;
          }
          
          if (childElementId.toLowerCase().includes('data') || type.toLowerCase().includes('data')) {
            info.source = name || `Fuente de datos: ${childElementId}`;
          }
        }
      }
      
    } catch (error) {
      console.warn('❌ Error extrayendo información del elemento hijo:', error);
    }
    
    return info;
  }

  // === STATISTICS ===
  
  getStatistics() {
    const totalPPIs = this.ppis.length;
    const linkedPPIs = this.ppis.filter(ppi => ppi.elementId).length;
    const timeMeasures = this.ppis.filter(ppi => ppi.measureDefinition.type === 'time').length;

    return {
      total: totalPPIs,
      linked: linkedPPIs,
      timeMeasures: timeMeasures
    };
  }

  // === EXPORT/IMPORT ===
  
  exportPPIsToFile() {
    try {
      const dataStr = JSON.stringify(this.ppis, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `ppis_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      return true;
    } catch (error) {
      console.error('Error exportando PPIs:', error);
      return false;
    }
  }

  // === UTILITIES ===
  
  parseFormData(formData) {
    const data = {};
    for (let [key, value] of formData.entries()) {
      data[key] = value.trim();
    }
    
    if (data.informed) {
      data.informed = data.informed.split(',').map(item => item.trim());
    }
    
    return data;
  }

  truncateText(text, maxLength = 40) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }
}

// Exportar para uso global
window.PPICore = PPICore; 