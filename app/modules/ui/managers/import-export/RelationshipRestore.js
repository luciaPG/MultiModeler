/**
 * RelationshipRestore - Handles restoring relationships between elements
 * 
 * Responsible for:
 * - Restoring parent-child relationships
 * - Managing relationship scheduling and retries
 * - Element waiting and validation
 */

export class RelationshipRestore {
  constructor(config) {
    this.config = config;
  }

  async restoreParentChildRelationships(modeler, relationships) {
    try {
      console.log(`🔄 Restoring ${relationships.length} parent-child relationships to canvas...`);
      
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        console.warn('⚠️ Modeler services not available');
        return;
      }

      // Wait for all elements to be available
      await this.waitForElementsReady(elementRegistry, relationships);
      
      let restoredCount = 0;
      let businessObjectCount = 0;
      
      // Restore each relationship using official BPMN.js pattern
      for (const rel of relationships) {
        try {
          const childElement = elementRegistry.get(rel.childId);
          const parentElement = elementRegistry.get(rel.parentId);
          
          if (!childElement || !parentElement) {
            console.warn(`⚠️ Elements not found: ${rel.childId} → ${rel.parentId}`);
            continue;
          }
          
          // Verify if already correctly related
          if (childElement.parent && childElement.parent.id === rel.parentId) {
            console.log(`✅ Relationship already correct: ${rel.childName} → ${rel.parentName}`);
            continue;
          }
          
          // CRITICAL: Use moveElements to keep elements united (official BPMN.js pattern)
          modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
          
          // CRITICAL: Restore businessObject.$parent (ppinot-visual pattern)
          if (childElement.businessObject && parentElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
            businessObjectCount++;
          }
          
          // Also move label if exists (ralph pattern)
          if (childElement.label) {
            try {
              modeling.moveElements([childElement.label], { x: 0, y: 0 }, parentElement);
            } catch (labelError) {
              console.debug('Label move failed (normal):', labelError.message);
            }
          }
          
          restoredCount++;
          console.log(`🔗 Restored: ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
          
        } catch (error) {
          console.warn(`⚠️ Error restoring ${rel.childId} → ${rel.parentId}:`, error.message);
        }
      }
      
      console.log(`✅ Restoration completed: ${restoredCount}/${relationships.length} relationships`);
      console.log(`✅ BusinessObjects updated: ${businessObjectCount}`);
      
    } catch (error) {
      console.error('❌ Error in relationship restoration:', error);
    }
  }

  async waitForElementsReady(elementRegistry, relationships) {
    let attempts = 0;
    const maxAttempts = this.config.maxWaitAttempts; // More time for PPINOT elements
    
    while (attempts < maxAttempts) {
      const missingElements = [];
      
      relationships.forEach(rel => {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);
        if (!childElement || !parentElement) {
          missingElements.push(`${rel.childId} → ${rel.parentId}`);
        }
      });
      
      if (missingElements.length === 0) {
        console.log(`✅ All elements available (attempt ${attempts + 1})`);
        return;
      }
      
      attempts++;
      console.log(`⏳ Waiting for elements (${attempts}/${maxAttempts}): ${missingElements.length} missing`);
      
      const waitTime = Math.min(300 + (attempts * 100), 1500);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
    
    console.warn('⚠️ Some elements still missing after waiting');
  }

  /**
   * Force restore relationships (for debugging/manual use)
   */
  async forceRestoreRelations(modeler, relationships) {
    console.log('🚀 FORCING relationship restoration...');
    
    if (!modeler) {
      console.log('❌ Modeler not available');
      return;
    }

    if (!relationships || relationships.length === 0) {
      console.log('❌ No relationships to restore');
      return;
    }

    console.log(`🔄 Attempting to restore ${relationships.length} relationships FORCEFULLY...`);

    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    let restoredCount = 0;
    
      for (const rel of relationships) {
      try {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);
        
        console.log(`🔍 Searching: ${rel.childId} → ${rel.parentId}`);
        console.log(`  Child found: ${!!childElement}`);
        console.log(`  Parent found: ${!!parentElement}`);
        
        if (childElement && parentElement) {
          // Verify current relationship
          const currentParent = childElement.parent ? childElement.parent.id : 'none';
          console.log(`  Current parent: ${currentParent}`);
          
          if (currentParent !== rel.parentId) {
            console.log(`🔄 FORCING relationship: ${rel.childId} → ${rel.parentId}`);
            
            // FORCE using moveElements
            modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // FORCE businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
            restoredCount++;
            console.log(`✅ FORCED: ${rel.childName} → ${rel.parentName}`);
          } else {
            console.log(`✅ Already correct: ${rel.childName} → ${rel.parentName}`);
          }
        } else {
          console.warn(`❌ Elements not found: ${rel.childId} → ${rel.parentId}`);
        }
        
      } catch (error) {
        console.error(`❌ Error forcing relationship ${rel.childId} → ${rel.parentId}:`, error);
      }
    }
    
    console.log(`🎉 FORCED restoration completed: ${restoredCount}/${relationships.length} relationships`);
    
    // Refresh canvas
    try {
      const canvas = modeler.get('canvas');
      if (canvas && canvas.resized) {
        canvas.resized();
      }
    } catch (error) {
      console.debug('Canvas refresh failed:', error);
    }
    
    return restoredCount;
  }

  /**
   * Simple relationship restoration
   */
  restoreRelationshipsSimple(modeler, relationships) {
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    console.log(`🔗 Restoring ${relationships.length} relationships...`);
    
    let restored = 0;
    
    relationships.forEach(relationship => {
      try {
        const childElement = elementRegistry.get(relationship.childId);
        const parentElement = elementRegistry.get(relationship.parentId);
        
        if (childElement && parentElement) {
          // Move child element to parent using modeling.moveElements
          modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
          
          // Update businessObject if exists
          if (childElement.businessObject && parentElement.businessObject) {
            childElement.businessObject.$parent = parentElement.businessObject;
          }
          
          restored++;
        }
      } catch (error) {
        console.warn(`⚠️ Error restoring relationship ${relationship.childId} → ${relationship.parentId}:`, error.message);
      }
    });
    
    console.log(`✅ ${restored}/${relationships.length} relationships restored`);
  }

  /**
   * Smart relationship restoration scheduling
   */
  scheduleRelationshipRestoration(modeler, relationships) {
    console.log(`📅 Scheduling restoration of ${relationships.length} relationships...`);
    
    // Faster and more frequent attempts
    const attempts = [
      { delay: 500, name: 'Immediate attempt' },
      { delay: 1000, name: 'Quick attempt' },
      { delay: 2000, name: 'Medium attempt' },
      { delay: 3000, name: 'Final attempt' }
    ];
    
    attempts.forEach((attempt, index) => {
      setTimeout(async () => {
        console.log(`🔄 ${attempt.name} (${index + 1}/${attempts.length}) - Restoring relationships...`);
        
        const restoredCount = await this.tryRestoreRelationships(modeler, relationships);
        
        if (restoredCount === relationships.length) {
          console.log(`🎉 All relationships restored in ${attempt.name}!`);
          return; // Success - no need for more attempts
        } else if (restoredCount > 0) {
          console.log(`⚠️ ${attempt.name}: ${restoredCount}/${relationships.length} relationships restored`);
        } else {
          console.log(`❌ ${attempt.name}: 0 relationships restored - elements not ready yet`);
        }
        
        // If last attempt and didn't work, show error
        if (index === attempts.length - 1 && restoredCount < relationships.length) {
          console.error(`❌ Automatic restoration failed. Use: window.forceRestoreRelations(projectData)`);
        }
        
      }, attempt.delay);
    });
  }

  async tryRestoreRelationships(modeler, relationships) {
    try {
      const elementRegistry = modeler.get('elementRegistry');
      const modeling = modeler.get('modeling');
      
      if (!elementRegistry || !modeling) {
        return 0;
    }

    let restoredCount = 0;

    for (const rel of relationships) {
      try {
        const childElement = elementRegistry.get(rel.childId);
        const parentElement = elementRegistry.get(rel.parentId);

          if (childElement && parentElement) {
            // Verify if already correctly related
        if (childElement.parent && childElement.parent.id === rel.parentId) {
              restoredCount++;
          continue;
        }

            // Restore relationship
        modeling.moveElements([childElement], { x: 0, y: 0 }, parentElement);
            
            // Restore businessObject.$parent
            if (childElement.businessObject && parentElement.businessObject) {
              childElement.businessObject.$parent = parentElement.businessObject;
            }
            
        restoredCount++;
            console.log(`✅ Restored: ${rel.childName || rel.childId} → ${rel.parentName || rel.parentId}`);
            
          }
        } catch (error) {
          console.debug(`Relationship ${rel.childId} → ${rel.parentId} failed:`, error.message);
        }
      }
      
      return restoredCount;
      
      } catch (error) {
      console.error('❌ Error in tryRestoreRelationships:', error);
      return 0;
    }
  }

  async waitForPPINOTElementsAndRestore(modeler, relationships) {
    console.log('⏳ Waiting specifically for PPINOT elements...');
    
    const elementRegistry = modeler.get('elementRegistry');
    const modeling = modeler.get('modeling');
    
    if (!elementRegistry || !modeling) {
      console.error('❌ Modeler services not available');
      return;
    }

    // Extract unique IDs of elements we need
    const requiredElementIds = new Set();
    relationships.forEach(rel => {
      requiredElementIds.add(rel.childId);
      requiredElementIds.add(rel.parentId);
    });

    console.log(`🔍 Required elements: ${Array.from(requiredElementIds).join(', ')}`);

    let attempts = 0;
    const maxAttempts = 60; // 30 seconds maximum
    const checkInterval = this.config.checkInterval; // Every 500ms

    const checkElements = () => {
      attempts++;
      
      const availableElements = [];
      const missingElements = [];
      
      requiredElementIds.forEach(id => {
        const element = elementRegistry.get(id);
        if (element) {
          availableElements.push(id);
    } else {
          missingElements.push(id);
        }
      });

      console.log(`🔍 Attempt ${attempts}/${maxAttempts}:`);
      console.log(`  ✅ Available: ${availableElements.length}/${requiredElementIds.size}`);
      console.log(`  ❌ Missing: ${missingElements.join(', ')}`);

      // If all are available, restore immediately
      if (missingElements.length === 0) {
        console.log('🎉 All PPINOT elements are ready! Restoring...');
        
        setTimeout(async () => {
          const restoredCount = await this.tryRestoreRelationships(modeler, relationships);
          console.log(`🎉 SUCCESS: ${restoredCount}/${relationships.length} relationships restored`);
          
          if (restoredCount < relationships.length) {
            console.log('🔄 Some elements failed, retrying in 1s...');
            setTimeout(async () => {
              const retry = await this.tryRestoreRelationships(modeler, relationships);
              console.log(`🔄 Retry: ${retry}/${relationships.length} relationships`);
            }, 1000);
          }
        }, 100);
        
        return;
      }

      // If elements are still missing, continue waiting
      if (attempts < maxAttempts) {
        setTimeout(checkElements, checkInterval);
      } else {
        console.error(`❌ Timeout: Some elements never appeared: ${missingElements.join(', ')}`);
        console.error('💡 Use: window.forceRestoreRelations(projectData)');
      }
    };

    // Start verification
    checkElements();
  }
}
