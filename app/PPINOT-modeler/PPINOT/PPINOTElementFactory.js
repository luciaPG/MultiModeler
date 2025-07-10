export class PPINOTNotation {
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
      'PPINOT:Target': { width: 120, height: 60 },
      'PPINOT:Scope': { width: 120, height: 60 },
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

  // Crea el businessObject de un elemento PPINOT (dimensiones se gestionan en el factory)
  static createBO(elementType, attrs, moddle) {
    const businessObject = moddle.create(elementType, attrs);
    if (!businessObject.$type) businessObject.$type = elementType;
    if (!businessObject.id) {
      const prefix = elementType.replace('PPINOT:', '') + '_';
      businessObject.id = moddle.ids.nextPrefixed(prefix, businessObject);
    }
    return businessObject;
  }
}