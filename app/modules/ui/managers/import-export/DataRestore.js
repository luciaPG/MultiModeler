/**
 * DataRestore - Handles restoring PPI and RASCI data
 * 
 * Responsible for:
 * - Restoring PPI data to manager
 * - Restoring RASCI data to stores
 * - Notifying system of state changes
 */

import { resolve } from '../../../../services/global-access.js';
import { RasciStore } from '../../../rasci/store.js';
import { getServiceRegistry } from '../../core/ServiceRegistry.js';

export class DataRestore {
  constructor(config) {
    this.config = config;
  }

  async restorePPIToCanvas(ppiData) {
    const ppiManager = resolve('PPIManagerInstance');
    
    if (ppiData.indicators && ppiManager && ppiManager.core) {
      console.log(`📊 Restoring ${ppiData.indicators.length} PPIs to manager...`);
      
      ppiData.indicators.forEach(ppi => {
        ppiManager.core.addPPI(ppi);
      });
      
      console.log('✅ PPIs restored to manager');
    }
  }

  async restoreRasciToStores(rasciData) {
    if (rasciData.roles) {
      RasciStore.setRoles(rasciData.roles);
      console.log(`✅ ${rasciData.roles.length} RASCI roles restored`);
    }
    
    if (rasciData.matrix) {
      RasciStore.setMatrix(rasciData.matrix);
      console.log(`✅ RASCI matrix restored: ${Object.keys(rasciData.matrix).length} entries`);
    }
    
    // Notify RASCI state reload
    setTimeout(() => {
      const sr = getServiceRegistry();
      const eb = sr && sr.get ? sr.get('EventBus') : null;
      if (eb) eb.publish('rasci.state.ensureLoaded', {});
    }, 500);
  }

  async restoreRalphToCanvas(ralphData) {
    if (!ralphData.elements || ralphData.elements.length === 0) {
      return;
    }

    const modeler = resolve('BpmnModeler');
    if (!modeler) return;

    try {
      console.log(`🎭 Restoring ${ralphData.elements.length} RALPH elements to canvas...`);
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      const elementFactory = modeler.get('elementFactory');
      const canvas = modeler.get('canvas');
      
      if (!elementRegistry || !modeling || !elementFactory) {
        console.warn('⚠️ Modeler services not available for RALPH');
        return;
      }

      const rootElement = canvas.getRootElement();
      let restoredCount = 0;

      for (const ralphEl of ralphData.elements) {
        try {
          // Verify if element already exists
          const existingElement = elementRegistry.get(ralphEl.id);
          if (existingElement) {
            console.log(`✅ RALPH element already exists: ${ralphEl.id}`);
            continue;
          }

          // Create RALPH element (ralph pattern)
          const element = elementFactory.create('shape', {
            type: ralphEl.type,
            id: ralphEl.id,
            width: ralphEl.position.width || 50,
            height: ralphEl.position.height || 50
          });

          // Set businessObject properties
          if (element.businessObject && ralphEl.properties) {
            element.businessObject.name = ralphEl.properties.name || ralphEl.name;
            if (ralphEl.properties.type) {
              element.businessObject.$type = ralphEl.properties.type;
            }
          }

          // Create in canvas
          const position = { 
            x: ralphEl.position.x || 100, 
            y: ralphEl.position.y || 100 
          };
          
          modeling.createShape(element, position, rootElement);
          restoredCount++;
          
          console.log(`🎭 RALPH element restored: ${ralphEl.id} (${ralphEl.type})`);
          
        } catch (error) {
          console.warn(`⚠️ Error restoring RALPH element ${ralphEl.id}:`, error);
        }
      }

      console.log(`✅ RALPH restoration completed: ${restoredCount}/${ralphData.elements.length} elements`);
      
    } catch (error) {
      console.error('❌ Error restoring RALPH to canvas:', error);
    }
  }
}
