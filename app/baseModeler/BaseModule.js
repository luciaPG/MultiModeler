import BasePaletteProvider from './BasePaletteProvider';
import BaseRenderer from './BaseRenderer';

console.log('BaseModule loading...');

/**
 * Base module that provides common functionality for all notations
 * Now includes a unified palette provider for BPMN + PPINOT + RALPH
 */
export default {
  __init__: [
    'basePaletteProvider',
    'baseRenderer'
  ],
  basePaletteProvider: [ 'type', BasePaletteProvider ],
  baseRenderer: [ 'type', BaseRenderer ]
};

console.log('BaseModule loaded successfully - Unified palette provider configured');
