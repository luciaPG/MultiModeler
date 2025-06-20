import BasePaletteProvider from './BasePaletteProvider';
import BaseRenderer from './BaseRenderer';

console.log('BaseModule loading...');
console.log('BasePaletteProvider:', BasePaletteProvider);

/**
 * Base module that provides common functionality for all notations
 */
export default {
  __init__: [
    'basePaletteProvider',
    'baseRenderer'
  ],
  basePaletteProvider: [ 'type', BasePaletteProvider ],
  baseRenderer: [ 'type', BaseRenderer ]
};

console.log('BaseModule loaded successfully');
