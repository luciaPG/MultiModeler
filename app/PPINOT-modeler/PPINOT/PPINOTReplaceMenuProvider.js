import {
  is
} from "bpmn-js/lib/util/ModelUtil";

import {
  isDifferentType
} from "bpmn-js/lib/features/popup-menu/util/TypeUtil"; 

import {
  forEach,
  filter
} from 'min-dash';

import * as replaceOptions from './PPINOTReplaceOptions';
import { isPPINOTShape } from "./Types";

export default function PPINOTReplaceMenuProvider(
  popupMenu, modeling, moddle,
  bpmnReplace, rules, translate, replace) {
  this._popupMenu = popupMenu;
  this._modeling = modeling;
  this._moddle = moddle;
  this._bpmnReplace = bpmnReplace;
  this._rules = rules;
  this._translate = translate;
  this._replace = replace;
}

PPINOTReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'moddle',
  'bpmnReplace',
  'rules',
  'translate',
  'replace'
];

PPINOTReplaceMenuProvider.prototype.getEntries = function(element) {
  const businessObject = element.businessObject;
  const rules = this._rules;
  if (!rules.allowed('shape.replace', { element })) return [];
  if (!isPPINOTShape(element)) return [];

  const boType = businessObject.$type || businessObject.type;
  const differentType = isDifferentType(element);

  // Target/Scope replacement
  if (boType === 'PPINOT:Target' || boType === 'PPINOT:Scope') {
    const targetType = boType === 'PPINOT:Target' ? 'PPINOT:Scope' : 'PPINOT:Target';
    const label = boType === 'PPINOT:Target' ? '\xa0\xa0\xa0Scope' : '\xa0\xa0\xa0Target';
    const className = boType === 'PPINOT:Target' ? 'icon-scope-mini' : 'icon-target-mini';
    return this._createEntries(element, [{
      label,
      actionName: `replace-with-${label.toLowerCase()}`,
      className,
      target: { type: targetType }
    }]);
  }

  // Medidas base y derivadas (no agregadas)
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

  // Medidas agregadas y variantes (incluyendo state condition)
  if (/^PPINOT:(AggregatedMeasure|CountAggregatedMeasure|DataAggregatedMeasure|TimeAggregatedMeasure|CyclicTimeAggregatedMeasure|StateConditionAggregatedMeasure|StateCondAggMeasure(Number|Percentage|AtLeastOne|All|No))(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    return this._createEntries(element, filter(replaceOptions.AGGREGATED_MEASURE, differentType));
  }

  // DerivedMultiInstanceMeasure: mostrar solo agregadas
  if (boType === 'PPINOT:DerivedMultiInstanceMeasure') {
    return this._createEntries(element, filter(replaceOptions.AGGREGATED_MEASURE, differentType));
  }
  // PPITarget, PPIScope, PPI: mostrar solo base
  if ([
    'PPINOT:PPITarget',
    'PPINOT:PPIScope',
    'PPINOT:PPI'
  ].includes(boType)) {
    return this._createEntries(element, filter(replaceOptions.MEASURE, differentType));
  }

  return [];
};

PPINOTReplaceMenuProvider.prototype.getHeaderEntries = function(element) {
  const businessObject = element.businessObject;
  const boType = businessObject.$type || businessObject.type;
  const translate = this._translate;
  const replace = this._replace;

  // Sin headers para estos tipos
  if ([
    'PPINOT:DerivedMultiInstanceMeasure',
    'PPINOT:DerivedSingleInstanceMeasure',
    'PPINOT:Target',
    'PPINOT:Scope',
    'PPINOT:Ppi'
  ].includes(boType)) return [];

  // StateConditionAggregatedMeasure y variantes
  if (/StateConditionAggregatedMeasure/.test(boType) || boType.startsWith('PPINOT:StateCondAggMeasure')) {
    return this._getStateConditionVariantHeaders(element);
  }

  // TimeAggregatedMeasure y variantes
  if (/^PPINOT:TimeAggregatedMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    const functionHeaders = variants.map(fn => ({
      id: `replace-with-time-agg-${fn.toLowerCase()}`,
      className: '',
      label: translate(fn),
      action: () => replace.replaceElement(element, { type: `PPINOT:TimeAggregatedMeasure${fn}` })
    }));
    functionHeaders.unshift({
      id: 'replace-with-cyclic-time-agg',
      className: 'icon-cyclic-time-menu',
      label: translate('\xa0\xa0\xa0\xa0\xa0Cyclic'),
      action: () => replace.replaceElement(element, { type: 'PPINOT:CyclicTimeAggregatedMeasure' })
    });
    return functionHeaders;
  }

  // CyclicTimeAggregatedMeasure y variantes
  if (/^PPINOT:CyclicTimeAggregatedMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-cyclic-time-agg-${fn.toLowerCase()}`,
      className: 'icon-cyclic-time-menu',
      label: translate(fn),
      action: () => replace.replaceElement(element, { type: `PPINOT:CyclicTimeAggregatedMeasure${fn}` })
    }));
  }

  // Otras agregadas: solo SUM,MAX,MIN,AVG
  if (/^PPINOT:(AggregatedMeasure|CountAggregatedMeasure|DataAggregatedMeasure)(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-agg-${fn.toLowerCase()}`,
      className: '',
      label: translate(fn),
      action: () => replace.replaceElement(element, { type: boType.replace(/(SUM|MAX|MIN|AVG)?$/, fn) })
    }));
  }

  // TimeMeasure base: solo Cyclic
  if (boType === 'PPINOT:TimeMeasure') {
    return [{
      id: 'replace-with-cyclic-time',
      className: 'icon-cyclic-time-menu',
      label: translate('\xa0\xa0\xa0\xa0\xa0Cyclic'),
      action: () => replace.replaceElement(element, { type: 'PPINOT:CyclicTimeMeasure' })
    }];
  }

  // CyclicTimeMeasure y variantes
  if (/^PPINOT:CyclicTimeMeasure(SUM|MAX|MIN|AVG)?$/.test(boType)) {
    const variants = ['SUM', 'MAX', 'MIN', 'AVG'];
    return variants.map(fn => ({
      id: `replace-with-cyclic-time-${fn.toLowerCase()}`,
      className: 'icon-cyclic-time-menu',
      label: translate(fn),
      action: () => replace.replaceElement(element, { type: `PPINOT:CyclicTimeMeasure${fn}` })
    }));
  }

  return [];
};

PPINOTReplaceMenuProvider.prototype._createEntries = function(element, replaceOptions) {
  const self = this;
  return replaceOptions.map(definition => self._createMenuEntry(definition, element)).filter(Boolean);
};

PPINOTReplaceMenuProvider.prototype._createMenuEntry = function(definition, element, action) {
  const translate = this._translate;
  const replace = this._replace;
  const popupMenu = this._popupMenu;
  const replaceAction = function() {
    const newElement = replace.replaceElement(element, definition.target);
    if (popupMenu && typeof popupMenu.close === 'function') {
      setTimeout(() => popupMenu.close(), 50);
    }
    setTimeout(() => {
      if (newElement && newElement.businessObject) {
        // Opcional: log para depuración
      }
    }, 100);
    return newElement;
  };
  action = action || replaceAction;
  return {
    label: translate(definition.label),
    className: definition.className || '',
    id: definition.actionName,
    action
  };
};

// Headers para variantes de state condition
PPINOTReplaceMenuProvider.prototype._getStateConditionVariantHeaders = function(element) {
  const self = this;
  const translate = this._translate;
  const replaceTypes = [
    { type: 'PPINOT:StateCondAggMeasureNumber', label: '#' },
    { type: 'PPINOT:StateCondAggMeasurePercentage', label: '%' },
    { type: 'PPINOT:StateCondAggMeasureAll', label: '∀' },
    { type: 'PPINOT:StateCondAggMeasureAtLeastOne', label: '∃' },
    { type: 'PPINOT:StateCondAggMeasureNo', label: '∄' }
  ];
  return replaceTypes.map(rt => ({
    id: `replace-with-state-cond-${rt.label.toLowerCase()}`,
    label: translate(rt.label),
    action: () => self._replace.replaceElement(element, { type: rt.type })
  }));
};
