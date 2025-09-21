/**
 * DataCapture - Handles capturing PPI and RASCI data
 * 
 * Responsible for:
 * - Capturing PPI data from manager
 * - Capturing RASCI data from stores
 * - Data serialization and formatting
 */

import { resolve } from '../../../../services/global-access.js';
import { RasciStore } from '../../../rasci/store.js';

export class DataCapture {
  constructor(config) {
    this.config = config;
  }

  /**
   * Captures PPI data directly from the manager
   */
  async capturePPIFromCanvas() {
    const ppiManager = resolve('PPIManagerInstance');
    const indicators = this.extractPPIs(ppiManager);
    
    console.log(`✅ ${indicators.length} PPIs captured from manager`);
    
    return {
      indicators,
      captureDate: new Date().toISOString()
    };
  }

  extractPPIs(ppiManager) {
    return (ppiManager && ppiManager.core && ppiManager.core.getAllPPIs) ? ppiManager.core.getAllPPIs() : [];
  }

  /**
   * Captures RASCI data directly from stores
   */
  async captureRasciFromStores() {
    const data = {
      roles: RasciStore.getRoles() || [],
      matrix: RasciStore.getMatrix() || {},
      captureDate: new Date().toISOString()
    };
    
    console.log(`✅ RASCI captured: ${data.roles.length} roles, ${Object.keys(data.matrix).length} matrix entries`);
    
    return data;
  }
}
