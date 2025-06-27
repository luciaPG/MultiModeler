import BasePaletteProvider from './BasePaletteProvider';
import BaseRenderer from './BaseRenderer';
import BaseContextPadProvider from './BaseContextPadProvider';
import BaseReplaceMenuProvider from './BaseReplaceMenuProvider';

console.log('BaseModule loading...');

/**
 * Base module that provides common functionality for all notations
 * Extends BPMN.js providers with PPINOT and RALPH support
 */
export default {
  __init__: [
    'basePaletteProvider',
    'baseRenderer',
    'contextPadProvider',
    'replaceMenuProvider'
  ],
  basePaletteProvider: [ 'type', BasePaletteProvider ],
  baseRenderer: [ 'type', BaseRenderer ],
  contextPadProvider: [ 'type', BaseContextPadProvider ],
  replaceMenuProvider: [ 'type', BaseReplaceMenuProvider ]
};

console.log('BaseModule loaded successfully - All base providers configured');
