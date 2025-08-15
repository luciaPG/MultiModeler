export class PPINOTNotation {
  // Devuelve el tamaño de cada tipo de elemento PPINOT
  static getElementSize(type) {
    const shapes = {
      __default: { width: 100, height: 80 },
      'PPINOT:AggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:AggregatedMeasureMAX': { width: 120, height: 100 },
      'PPINOT:AggregatedMeasureAVG': { width: 120, height: 100 },
      'PPINOT:AggregatedMeasureMIN': { width: 120, height: 100 },
      'PPINOT:AggregatedMeasureSUM': { width: 120, height: 100 },
      'PPINOT:CountAggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:TimeAggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:CyclicTimeAggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:CyclicTimeAggregatedMeasureMAX': { width: 120, height: 100 },
      'PPINOT:CyclicTimeAggregatedMeasureAVG': { width: 120, height: 100 },
      'PPINOT:CyclicTimeAggregatedMeasureMIN': { width: 120, height: 100 },
      'PPINOT:CyclicTimeAggregatedMeasureSUM': { width: 120, height: 100 },
      'PPINOT:CountMeasure': { width: 110, height: 90 },
      'PPINOT:DataAggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:DataMeasure': { width: 110, height: 90 },
      'PPINOT:DataPropertyConditionAggregatedMeasure': { width: 130, height: 140 },
      'PPINOT:DataPropertyConditionMeasure': { width: 130, height: 130 },
      'PPINOT:DerivedMultiInstanceMeasure': { width: 120, height: 100 },
      'PPINOT:DerivedSingleInstanceMeasure': { width: 110, height: 90 },
      'PPINOT:TimeMeasure': { width: 110, height: 90 },
      'PPINOT:CyclicTimeMeasure': { width: 110, height: 90 },
      'PPINOT:CyclicTimeMeasureSUM': { width: 110, height: 90 },
      'PPINOT:CyclicTimeMeasureMIN': { width: 110, height: 90 },
      'PPINOT:CyclicTimeMeasureMAX': { width: 110, height: 90 },
      'PPINOT:CyclicTimeMeasureAVG': { width: 110, height: 90 },
      'PPINOT:Ppi': { width: 300, height: 250 },
      'PPINOT:StateConditionMeasure': { width: 110, height: 90 },
      'PPINOT:StateConditionAggregatedMeasure': { width: 120, height: 100 },
      'PPINOT:Target': { width: 25, height: 25 },
      'PPINOT:Scope': { width: 28, height: 28 },
      'PPINOT:BaseMeasure': { width: 110, height: 90 },
      'PPINOT:StateCondAggMeasureNumber': { width: 120, height: 100 },
      'PPINOT:StateCondAggMeasurePercentage': { width: 120, height: 100 },
      'PPINOT:StateCondAggMeasureAll': { width: 120, height: 100 },
      'PPINOT:StateCondAggMeasureAtLeastOne': { width: 120, height: 100 },
      'PPINOT:StateCondAggMeasureNo': { width: 120, height: 100 },
      'PPINOT:TimeAggregatedMeasureSUM': { width: 120, height: 100 },
      'PPINOT:TimeAggregatedMeasureMAX': { width: 120, height: 100 },
      'PPINOT:TimeAggregatedMeasureMIN': { width: 120, height: 100 },
      'PPINOT:TimeAggregatedMeasureAVG': { width: 120, height: 100 },
      'PPINOT:CountAggregatedMeasureSUM': { width: 120, height: 100 },
      'PPINOT:CountAggregatedMeasureMAX': { width: 120, height: 100 },
      'PPINOT:CountAggregatedMeasureMIN': { width: 120, height: 100 },
      'PPINOT:CountAggregatedMeasureAVG': { width: 120, height: 100 },
      'PPINOT:DataAggregatedMeasureSUM': { width: 120, height: 100 },
      'PPINOT:DataAggregatedMeasureMAX': { width: 120, height: 100 },
      'PPINOT:DataAggregatedMeasureMIN': { width: 120, height: 100 },
      'PPINOT:DataAggregatedMeasureAVG': { width: 120, height: 100 },
    };
    return shapes[type] || shapes.__default;
  }

  // Crea el businessObject de un elemento PPINOT
  static createBO(elementType, attrs, moddle) {
    const businessObject = moddle.create(elementType, attrs);
    if (!businessObject.$type) {
      businessObject.$type = elementType;
    }
    if (!businessObject.id) {
      const prefix = elementType.replace('PPINOT:', '') + '_';
      businessObject.id = moddle.ids.nextPrefixed(prefix, businessObject);
    }
    
    // Asignar texto por defecto basado en el tipo de elemento
    if (!businessObject.name) {
      businessObject.name = this.getDefaultText(elementType, businessObject.id);
    }
    
    // No agregamos dimensiones al business object, eso se maneja en el factory
    return businessObject;
  }

  /**
   * Obtiene el texto por defecto para un tipo de elemento PPINOT
   */
  static getDefaultText(elementType, elementId = '') {
    const defaultTexts = {
      'PPINOT:Target': 'Target',
      'PPINOT:Scope': 'Scope',
      'PPINOT:BaseMeasure': 'Measure',
      'PPINOT:CountMeasure': 'Count',
      'PPINOT:TimeMeasure': 'Time',
      'PPINOT:DataMeasure': 'Data',
      'PPINOT:DerivedSingleInstanceMeasure': 'Derived',
      'PPINOT:DerivedMultiInstanceMeasure': 'Derived Multi',
      'PPINOT:StateConditionMeasure': 'State Condition',
      'PPINOT:AggregatedMeasure': 'Aggregated',
      'PPINOT:CountAggregatedMeasure': 'Count Aggregated',
      'PPINOT:TimeAggregatedMeasure': 'Time Aggregated',
      'PPINOT:DataAggregatedMeasure': 'Data Aggregated',
      'PPINOT:StateConditionAggregatedMeasure': 'State Aggregated',
      'PPINOT:DataPropertyConditionMeasure': 'Data Property',
      'PPINOT:DataPropertyConditionAggregatedMeasure': 'Data Property Aggregated',
      'PPINOT:CyclicTimeMeasure': 'Cyclic Time',
      'PPINOT:CyclicTimeAggregatedMeasure': 'Cyclic Time Aggregated'
    };

    // Para PPI, usar el ID del elemento en lugar de "PPI"
    if (elementType === 'PPINOT:Ppi') {
      return elementId || elementType.replace('PPINOT:', '');
    }

    // Para scope y target, usar el ID como fallback si no hay texto por defecto
    if (elementType === 'PPINOT:Scope' || elementType === 'PPINOT:Target') {
      return defaultTexts[elementType] || elementId || elementType.replace('PPINOT:', '');
    }

    return defaultTexts[elementType] || '';
  }
}