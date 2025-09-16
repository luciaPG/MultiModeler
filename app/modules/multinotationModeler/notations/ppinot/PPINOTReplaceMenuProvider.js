import { isDifferentType } from 'bpmn-js/lib/features/popup-menu/util/TypeUtil';
import { filter } from 'min-dash';
import * as replaceOptions from './PPINOTReplaceOptions';
import { isPPINOTShape, externalLabel } from './Types';

export default function PPINOTReplaceMenuProvider(
  popupMenu,
  modeling,
  moddle,
  bpmnReplace,
  rules,
  translate,
  elementFactory
) {
  this._popupMenu = popupMenu;
  this._modeling = modeling;
  this._moddle = moddle;
  this._bpmnReplace = bpmnReplace;
  this._rules = rules;
  this._translate = translate;
  this._elementFactory = elementFactory;

  // register this provider under 'replace'
  popupMenu.registerProvider('replace', this);
}

PPINOTReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'moddle',
  'bpmnReplace',
  'rules',
  'translate',
  'elementFactory'
];

PPINOTReplaceMenuProvider.prototype.getEntries = function(element) {
  const businessObject = element.businessObject;

  // only for replaceable shapes
  if (!this._rules.allowed('shape.replace', { element })) {
    return [];
  }

  // only apply to PPINOT shapes
  if (!isPPINOTShape(element)) {
    return [];
  }

  const boType = businessObject.$type || businessObject.type;
  const differentType = isDifferentType(element);

  // Target/Scope swap
  if (boType === 'PPINOT:Target' || boType === 'PPINOT:Scope') {
    const targetType = boType === 'PPINOT:Target' ? 'PPINOT:Scope' : 'PPINOT:Target';
    const label = boType === 'PPINOT:Target' ? '\u00A0\u00A0\u00A0Scope' : '\u00A0\u00A0\u00A0Target'; // espacio antes del texto
    const className = boType === 'PPINOT:Target' ? 'icon-PPINOT-scope-menu' : 'icon-PPINOT-target-menu';
    return this._createEntries(element, [{
      label,
      actionName: `replace-with-${label.trim().toLowerCase()}`,
      className,
      target: { type: targetType }
    }]);
  }

  // Base measure types
  const baseTypes = [
    'PPINOT:BaseMeasure',
    'PPINOT:CountMeasure',
    'PPINOT:TimeMeasure',
    'PPINOT:CyclicTimeMeasure',
    'PPINOT:StateConditionMeasure',
    'PPINOT:DerivedSingleInstanceMeasure',
    'PPINOT:DataMeasure'
  ];
  if (baseTypes.includes(boType) || /^PPINOT:CyclicTimeMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    return this._createEntries(element, filter(replaceOptions.MEASURE, differentType));
  }

  // Aggregated measure types
  const aggPattern = /^PPINOT:(AggregatedMeasure|CountAggregatedMeasure|DataAggregatedMeasure|TimeAggregatedMeasure|CyclicTimeAggregatedMeasure|StateConditionAggregatedMeasure|StateCondAggMeasure(Number|Percentage|AtLeastOne|All|No))(SUM|MAX|MIN|AVG)?$/;
  if (aggPattern.test(boType)) {
    return this._createEntries(element, filter(replaceOptions.AGGREGATED_MEASURE, differentType));
  }

  // Derived multi-instance
  if (boType === 'PPINOT:DerivedMultiInstanceMeasure') {
    return this._createEntries(element, filter(replaceOptions.AGGREGATED_MEASURE, differentType));
  }

  // PPI target/scope/pPI fallback
  const ppiTypes = ['PPINOT:PPITarget', 'PPINOT:PPIScope', 'PPINOT:PPI'];
  if (ppiTypes.includes(boType)) {
    return this._createEntries(element, filter(replaceOptions.MEASURE, differentType));
  }

  return [];
};

PPINOTReplaceMenuProvider.prototype.getHeaderEntries = function(element) {
  const boType = element.businessObject.$type || element.businessObject.type;

  // skip headers for these types
  const skipHeader = [
    'PPINOT:DerivedMultiInstanceMeasure',
    'PPINOT:DerivedSingleInstanceMeasure',
    'PPINOT:Target',
    'PPINOT:Scope',
    'PPINOT:Ppi'
  ];
  if (skipHeader.includes(boType)) {
    return [];
  }

  // state condition variants
  if (/StateConditionAggregatedMeasure/.test(boType) || boType.startsWith('PPINOT:StateCondAggMeasure')) {
    return this._getStateConditionVariantHeaders(element);
  }

  // time aggregated variants
  if (/^PPINOT:TimeAggregatedMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    const headers = variants.map(fn => ({
      id: `replace-with-time-agg-${fn.toLowerCase()}`,
      label: this._translate(fn),
      action: () => this._replacePPINOTElement(element, { type: `PPINOT:TimeAggregatedMeasure${fn}` })
    }));
    headers.unshift({
      id: 'replace-with-cyclic-time-agg',
      className: 'icon-cyclic-time-menu',
      label: this._translate('\u00A0\u00A0\u00A0\u00A0\u00A0Cyclic'),
      action: () => this._replacePPINOTElement(element, { type: 'PPINOT:CyclicTimeAggregatedMeasure' })
    });
    return headers;
  }

  // cyclic time aggregated variants
  if (/^PPINOT:CyclicTimeAggregatedMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-cyclic-time-agg-${fn.toLowerCase()}`,
      className: 'icon-cyclic-time-menu',
      label: this._translate(fn),
      action: () => this._replacePPINOTElement(element, { type: `PPINOT:CyclicTimeAggregatedMeasure${fn}` })
    }));
  }

  // other aggregated (SUM,MAX,MIN,AVG)
  if (/^PPINOT:(AggregatedMeasure|CountAggregatedMeasure|DataAggregatedMeasure)(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-agg-${fn.toLowerCase()}`,
      label: this._translate(fn),
      action: () => this._replacePPINOTElement(element, { type: boType.replace(/(SUM|MAX|MIN|AVG)?$/, fn) })
    }));
  }

  // time measure cyclic header
  if (boType === 'PPINOT:TimeMeasure') {
    return [{
      id: 'replace-with-cyclic-time',
      className: 'icon-cyclic-time-menu',
      label: this._translate('\u00A0\u00A0\u00A0\u00A0\u00A0Cyclic'),
      action: () => this._replacePPINOTElement(element, { type: 'PPINOT:CyclicTimeMeasure' })
    }];
  }

  // cyclic time measure variants
  if (/^PPINOT:CyclicTimeMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-cyclic-time-${fn.toLowerCase()}`,
      className: 'icon-cyclic-time-menu',
      label: this._translate(fn),
      action: () => this._replacePPINOTElement(element, { type: `PPINOT:CyclicTimeMeasure${fn}` })
    }));
  }

  return [];
};

PPINOTReplaceMenuProvider.prototype._createEntries = function(element, replaceOptions) {
  return replaceOptions.map(definition => this._createMenuEntry(definition, element)).filter(Boolean);
};

PPINOTReplaceMenuProvider.prototype._createMenuEntry = function(def, element) {
  return {
    label: this._translate(def.label),
    className: def.className || '',
    id: def.actionName,
    action: () => this._replacePPINOTElement(element, def.target)
  };
};

PPINOTReplaceMenuProvider.prototype._getStateConditionVariantHeaders = function(element) {
  const variants = [
    { type: 'PPINOT:StateCondAggMeasureNumber', label: '#' },
    { type: 'PPINOT:StateCondAggMeasurePercentage', label: '%' },
    { type: 'PPINOT:StateCondAggMeasureAll', label: '∀' },
    { type: 'PPINOT:StateCondAggMeasureAtLeastOne', label: '∃' },
    { type: 'PPINOT:StateCondAggMeasureNo', label: '∄' }
  ];
  return variants.map(rt => ({
    id: `replace-with-state-cond-${rt.label.toLowerCase()}`,
    label: this._translate(rt.label),
    action: () => this._replacePPINOTElement(element, { type: rt.type })
  }));
};

// Custom replacement method for PPINOT elements that avoids BPMN property system
PPINOTReplaceMenuProvider.prototype._replacePPINOTElement = function(element, newTarget) {
  const oldBusinessObject = element.businessObject;
  
  // Ensure we have valid coordinates and dimensions
  const x = isFinite(element.x) ? element.x : 0;
  const y = isFinite(element.y) ? element.y : 0;
  const width = isFinite(element.width) && element.width > 0 ? element.width : 100;
  const height = isFinite(element.height) && element.height > 0 ? element.height : 80;
  
  // Get the parent
  const parent = element.parent;
  
  // Store the name before removing the element
  const preservedName = oldBusinessObject.name || '';
  
  // Store external label information if it exists
  const oldLabel = element.label;
  let labelData = null;
  
  if (oldLabel) {
    // Store exact position and dimensions of the old label
    labelData = {
      x: oldLabel.x,
      y: oldLabel.y,
      width: oldLabel.width,
      height: oldLabel.height,
      text: oldLabel.businessObject ? oldLabel.businessObject.name || '' : ''
    };
  }
  
  // Create new element using elementFactory to ensure proper structure
  const newElement = this._elementFactory.create('shape', {
    type: newTarget.type,
    width: width,
    height: height
  });
  
  // Preserve the name if it exists
  if (preservedName && newElement.businessObject) {
    newElement.businessObject.name = preservedName;
  }
  
  // Add the _hasExternalLabel property if the new element type should have an external label
  if (this._shouldHaveExternalLabel(newTarget.type)) {
    newElement._hasExternalLabel = true;
  }
  
  // Remove the old element first
  this._modeling.removeShape(element);
  
  // Add the new element at the exact same position - use center coordinates
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const newShape = this._modeling.createShape(newElement, { x: centerX, y: centerY }, parent);
  
  // Create external label if needed and we have the old label data
  if (labelData && this._shouldHaveExternalLabel(newTarget.type)) {
    const labelShape = this._elementFactory.createLabel({
      businessObject: newShape.businessObject,
      type: 'label',
      labelTarget: newShape,
      width: labelData.width,
      height: labelData.height
    });
    
    // Use the exact position of the old label
    const position = {
      x: labelData.x + labelData.width / 2, // centerX of label
      y: labelData.y + labelData.height / 2  // centerY of label
    };
    
    // Create the label at the exact same position
    const createdLabel = this._modeling.createShape(labelShape, position, parent);
    
    // Ensure the label is linked to the new shape
    newShape.label = createdLabel;
    createdLabel.labelTarget = newShape;
    
    // Preserve the label text if it exists
    if (labelData.text && createdLabel.businessObject) {
      createdLabel.businessObject.name = labelData.text;
    }
  }
  
  return newShape;
};

// Helper method to check if an element type should have an external label
PPINOTReplaceMenuProvider.prototype._shouldHaveExternalLabel = function(type) {
  // Import the external label types array
  return externalLabel.includes(type);
};
