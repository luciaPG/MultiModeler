import svgIcons from './svg/index.js';
import { label, directEdit, connections } from './Types.js';
import { EVENTS as PPI_EVENTS } from '../../../ppis/events.js';

const clone = (value) => Array.isArray(value) ? [...value] : { ...value };

const ICONS = Object.freeze({
  aggregatedMeasure: svgIcons.dataURLaggregatedMeasure,
  countAggregatedMeasure: svgIcons.dataURLcountAggregatedMeasure,
  countMeasure: svgIcons.dataURLcountMeasure,
  dataAggregatedMeasure: svgIcons.dataURLdataAggregatedMeasure,
  dataMeasure: svgIcons.dataURLdataMeasure,
  ppi: svgIcons.dataURLppi,
  ppiMini: svgIcons.dataURLppi2,
  scope: svgIcons.dataURLscope,
  scopeMini: svgIcons.dataURLscopeMini,
  target: svgIcons.dataURLtarget,
  targetMini: svgIcons.dataURLtargetMini,
  timeAggregatedMeasure: svgIcons.dataURLtimeAggregatedMeasure,
  timeMeasure: svgIcons.dataURLtimeMeasure
});

const PALETTE_ENTRIES = [
  {
    id: 'ppinot-base-measure',
    type: 'PPINOT:BaseMeasure',
    iconClass: 'icon-PPINOT-baseMeasure',
    svgIcon: ICONS.timeMeasure,
    title: 'Create Base Measure'
  },
  {
    id: 'ppinot-aggregated-measure',
    type: 'PPINOT:AggregatedMeasure',
    iconClass: 'icon-PPINOT-aggregatedMeasure',
    svgIcon: ICONS.aggregatedMeasure,
    title: 'Create Aggregated Measure'
  },
  {
    id: 'ppinot-ppi',
    type: 'PPINOT:Ppi',
    iconClass: 'icon-PPINOT-ppi',
    svgIcon: ICONS.ppi,
    title: 'Create PPI'
  },
  {
    id: 'ppinot-target',
    type: 'PPINOT:Target',
    iconClass: 'icon-PPINOT-target-mini',
    svgIcon: ICONS.targetMini,
    title: 'Create Target'
  },
  {
    id: 'ppinot-scope',
    type: 'PPINOT:Scope',
    iconClass: 'icon-PPINOT-scope-mini',
    svgIcon: ICONS.scopeMini,
    title: 'Create Scope'
  }
];

export const PPINOT_CONFIG = Object.freeze({
  notation: 'PPINOT',
  version: '1.0.0',
  defaultUnit: 'milliseconds',
  supportedElementTypes: Object.freeze(clone(label)),
  editableElementTypes: Object.freeze(clone(directEdit)),
  connectionTypes: Object.freeze(clone(connections)),
  icons: ICONS,
  paletteEntries: Object.freeze(PALETTE_ENTRIES.map((entry) => Object.freeze(entry))),
  events: Object.freeze({
    ...PPI_EVENTS,
    PPINOT_SYNCHRONIZED: 'ppinot.synchronized'
  })
});

export function getIcon(key) {
  return PPINOT_CONFIG.icons[key] || null;
}

export function isSupportedType(type) {
  return PPINOT_CONFIG.supportedElementTypes.includes(type);
}

export function getPaletteEntry(type) {
  return PPINOT_CONFIG.paletteEntries.find((entry) => entry.type === type) || null;
}

export function publishSynchronization(eventBus, payload = {}) {
  if (!eventBus || typeof eventBus.publish !== 'function') {
    throw new Error('eventBus.publish debe estar definido para emitir eventos PPINOT');
  }

  eventBus.publish(PPINOT_CONFIG.events.PPINOT_SYNCHRONIZED, payload);
}

export default PPINOT_CONFIG;
