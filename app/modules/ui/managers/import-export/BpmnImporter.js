/**
 * BpmnImporter - Handles BPMN data import functionality
 * 
 * Responsible for:
 * - Restoring BPMN XML to canvas
 * - Restoring PPINOT elements
 * - Restoring RALPH elements
 * - Managing canvas state restoration
 */

import { resolve } from '../../../../services/global-access.js';

export class BpmnImporter {
  constructor(config) {
    this.config = config;
  }

  async restoreBpmnToCanvas(bpmnData) {
    const modeler = resolve('BpmnModeler');
    if (!modeler) return;

    try {
      // CRITICAL: Verify if elements have BPMNShape
      let missingShapes = [];
      let presentShapes = [];
      
      // 1. Import XML to canvas (official BPMN.js pattern)
      if (bpmnData.diagram) {
        console.log('🔍 DEBUG XML before import:');
        console.log('  - Contains PPINOT?', bpmnData.diagram.includes('ppinot:'));
        console.log('  - Contains Target?', bpmnData.diagram.includes('Target_'));
        console.log('  - Contains AggregatedMeasure?', bpmnData.diagram.includes('AggregatedMeasure_'));
        
        // Search elements in <bpmn:process>
        const processMatch = bpmnData.diagram.match(/<bpmn:process[^>]*>(.*?)<\/bpmn:process>/s);
        if (processMatch) {
          const processContent = processMatch[1];
          const ppinotElements = processContent.match(/<PPINOT:[^>]+id="([^"]+)"/g) || [];
          
          console.log(`🔍 PPINOT elements in <bpmn:process>: ${ppinotElements.length}`);
          
          ppinotElements.forEach(match => {
            const idMatch = match.match(/id="([^"]+)"/);
            if (idMatch) {
              const elementId = idMatch[1];
              const hasShape = bpmnData.diagram.includes(`${elementId}_di`);
              
              if (hasShape) {
                presentShapes.push(elementId);
              } else {
                missingShapes.push(elementId);
              }
            }
          });
        }
        
        console.log(`🔍 Elements WITH BPMNShape: ${presentShapes.join(', ')}`);
        console.log(`❌ Elements WITHOUT BPMNShape: ${missingShapes.join(', ')}`);
        
        await this.waitForModelerReady();
        
        // NEW: Verify moddle extensions before import
        const moddle = modeler.get('moddle');
        console.log('🔍 DEBUG moddle before import:');
        console.log('  - Moddle available?', !!moddle);
        if (moddle) {
          console.log('  - Registry available?', !!moddle.registry);
          const packages = moddle.registry && moddle.registry.packages || {};
          console.log('  - Registered packages:', Object.keys(packages));
          console.log('  - Package details:', packages);
          
          // CRITICAL: Search extensions by index (not by name)
          const ppinotPackage = Object.values(packages).find(pkg => 
            pkg.name === 'PPINOTModdle' || pkg.prefix === 'PPINOT' || pkg.prefix === 'ppinot'
          );
          const ralphPackage = Object.values(packages).find(pkg => 
            pkg.name === 'RALph' || pkg.prefix === 'RALph' || pkg.prefix === 'ralph'
          );
          
          console.log('  - PPINOT package found?', !!ppinotPackage);
          console.log('  - RALPH package found?', !!ralphPackage);
          
          if (ppinotPackage) {
            console.log('  - PPINOT details:', { name: ppinotPackage.name, prefix: ppinotPackage.prefix, uri: ppinotPackage.uri });
          }
          if (ralphPackage) {
            console.log('  - RALPH details:', { name: ralphPackage.name, prefix: ralphPackage.prefix, uri: ralphPackage.uri });
          }
          
          // VERIFICATION: Extensions are already registered
          if (ppinotPackage && ralphPackage) {
            console.log('✅ PPINOT and RALPH extensions are correctly registered');
          } else {
            console.warn('⚠️ Missing extensions - this could cause import problems');
            if (!ppinotPackage) console.warn('  - Missing PPINOT');
            if (!ralphPackage) console.warn('  - Missing RALPH');
          }
        }
        
        await modeler.importXML(bpmnData.diagram);
        console.log('✅ XML restored to canvas');
        
        // NEW: Verify elements after import
        const elementRegistry = modeler.get('elementRegistry');
        const allElements = elementRegistry.getAll();
        console.log('🔍 DEBUG elements after XML import:');
        console.log('  - Total elements:', allElements.length);
        allElements.forEach(el => {
          console.log(`  - ${el.id}: ${el.type} (businessObject: ${el.businessObject && el.businessObject.$type || 'no BO'})`);
        });
      }

      // 2. Restore PPINOT elements separately (improved CBPMN style)
      if (bpmnData.ppinotElements && bpmnData.ppinotElements.length > 0) {
        console.log(`📊 Restoring ${bpmnData.ppinotElements.length} PPINOT elements separately...`);
        await this.restorePPINOTElements(modeler, bpmnData.ppinotElements);
      }
      
      // 3. Restore RALPH elements separately
      if (bpmnData.ralphElements && bpmnData.ralphElements.length > 0) {
        console.log(`📊 Restoring ${bpmnData.ralphElements.length} RALPH elements separately...`);
        await this.restoreRALPHElements(modeler, bpmnData.ralphElements);
      }

      // 3. Restore canvas state (zoom, pan)
      if (bpmnData.canvas) {
        const canvas = modeler.get('canvas');
        if (canvas && bpmnData.canvas.zoom) {
          try {
            canvas.zoom(bpmnData.canvas.zoom);
            if (bpmnData.canvas.viewbox) {
              canvas.viewbox(bpmnData.canvas.viewbox);
            }
            console.log('✅ Canvas state restored');
          } catch (canvasError) {
            console.debug('Canvas state restore failed (normal):', canvasError.message);
          }
        }
      }

      // 4. CRITICAL: Restore parent-child relationships
      if (bpmnData.relationships && bpmnData.relationships.length > 0) {
        console.log(`🚀 DEBUG relationships to restore:`);
        bpmnData.relationships.forEach((rel, i) => {
          console.log(`  ${i+1}. ${rel.childId} → ${rel.parentId} (${rel.childName} → ${rel.parentName})`);
        });
        
        // NEW: Verify if elements are missing and fix XML
        console.log(`🚀 Verifying missing elements for ${bpmnData.relationships.length} relationships...`);
        
        // If elements are missing, it means the XML is incomplete
        if (missingShapes.length > 0) {
          console.log(`🔧 FIXING XML: Missing ${missingShapes.length} elements with BPMNShape`);
          bpmnData.diagram = this.addMissingBPMNShapes(bpmnData.diagram, bpmnData.relationships);
          
          // Re-import the corrected XML
          console.log('🔄 Re-importing XML with complete elements...');
          await modeler.importXML(bpmnData.diagram);
          console.log('✅ Corrected XML imported');
        }
        
        // Import RelationshipRestore here to avoid circular dependency
        const { RelationshipRestore } = await import('./RelationshipRestore.js');
        const relationshipRestore = new RelationshipRestore(this.config);
        
        // Restore parent-child relationships using modeling.moveElements
        if (bpmnData.relationships && bpmnData.relationships.length > 0) {
          setTimeout(() => {
            relationshipRestore.restoreRelationshipsSimple(modeler, bpmnData.relationships);
          }, 1000); // Wait 1 second for elements to be ready
        }
      }

    } catch (error) {
      console.error('❌ Error restoring BPMN to canvas:', error);
      throw error;
    }
  }

  async waitForModelerReady() {
    const modeler = resolve('BpmnModeler');
    if (!modeler) return;
    
    return new Promise((resolve) => {
      const check = () => {
        try {
          if (modeler.get && modeler.get('canvas') && modeler.get('elementRegistry')) {
          resolve();
        } else {
            setTimeout(check, 100);
          }
        } catch (error) {
          setTimeout(check, 100);
        }
      };
      check();
    });
  }

  async restorePPINOTElements(modeler, ppinotElements) {
    console.log('🔧 Restoring PPINOT elements from separate data...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Modeler services not available');
    }

    let createdCount = 0;
    const createdElements = [];

    // Create elements in order: first PPIs, then children
    const sortedElements = [...ppinotElements].sort((a, b) => {
      if (a.type === 'PPINOT:Ppi' && b.type !== 'PPINOT:Ppi') return -1;
      if (b.type === 'PPINOT:Ppi' && a.type !== 'PPINOT:Ppi') return 1;
      return 0;
    });

    for (const elementData of sortedElements) {
      try {
        // Determine parent
        let parentElement = canvas.getRootElement();
        if (elementData.parent) {
          const foundParent = createdElements.find(el => el.id === elementData.parent);
          if (foundParent) {
            parentElement = foundParent;
          }
        }

        // Create simple and effective element
        const element = elementFactory.create('shape', {
          type: elementData.type,
          id: elementData.id,
          width: elementData.width,
          height: elementData.height
        });

        // Create in canvas with exact position
        const createdElement = modeling.createShape(
          element,
          { x: elementData.x, y: elementData.y },
          parentElement
        );
        
        if (createdElement) {
          createdElements.push(createdElement);
          createdCount++;
        }
        
      } catch (error) {
        console.warn(`⚠️ Error restoring ${elementData.id}:`, error.message);
      }
    }

    console.log(`🎉 ${createdCount}/${ppinotElements.length} PPINOT elements restored`);
  }

  async restoreRALPHElements(modeler, ralphElements) {
    console.log('🔧 Restoring RALPH elements from separate data...');
    
    const elementFactory = modeler.get('elementFactory');
    const canvas = modeler.get('canvas');
    const modeling = modeler.get('modeling');
    
    if (!elementFactory || !canvas || !modeling) {
      throw new Error('Modeler services not available');
    }

    let createdCount = 0;

    for (const elementData of ralphElements) {
      try {
        console.log(`🔧 Restoring: ${elementData.id} (${elementData.type})`);
        console.log(`  📍 Position: x=${elementData.x}, y=${elementData.y}`);
        
        // Create RALPH element
        const element = elementFactory.create('shape', {
          type: elementData.type,
          id: elementData.id,
          width: elementData.width,
          height: elementData.height
        });

        // Create in canvas
        const createdElement = modeling.createShape(element, 
          { x: elementData.x, y: elementData.y }, 
          canvas.getRootElement()
        );
        
        if (createdElement) {
          createdCount++;
          console.log(`✅ ${elementData.id} restored at (${elementData.x}, ${elementData.y})`);
      }
      
    } catch (error) {
        console.warn(`⚠️ Error restoring ${elementData.id}:`, error.message);
    }
    }

    console.log(`🎉 ${createdCount}/${ralphElements.length} RALPH elements restored`);
  }

  /**
   * Adds missing BPMNShapes to XML
   */
  addMissingBPMNShapes(xmlContent, relationships) {
    console.log('🔧 Adding missing BPMNShapes to XML...');
    
    let modifiedXml = xmlContent;
    let addedCount = 0;
    
    // Search BPMNPlane section to add shapes
    const planeMatch = modifiedXml.match(/(<bpmndi:BPMNPlane[^>]*>)(.*?)(<\/bpmndi:BPMNPlane>)/s);
    if (!planeMatch) {
      console.warn('⚠️ BPMNPlane not found in XML');
      return xmlContent;
    }
    
    const planeStart = planeMatch[1];
    const planeContent = planeMatch[2];
    const planeEnd = planeMatch[3];
    
    let newShapes = '';
    
    // For each relationship, verify if child element has BPMNShape
    for (const rel of relationships) {
      const hasShape = xmlContent.includes(`${rel.childId}_di`);
      
      if (!hasShape && rel.position) {
        console.log(`🔧 Adding BPMNShape for: ${rel.childId}`);
        
        // Create BPMNShape based on element type
        const shapeXml = `
      <bpmndi:BPMNShape id="${rel.childId}_di" bpmnElement="${rel.childId}">
        <dc:Bounds x="${rel.position.x}" y="${rel.position.y}" width="${rel.position.width}" height="${rel.position.height}" />
      </bpmndi:BPMNShape>`;
        
        newShapes += shapeXml;
        addedCount++;
      }
    }
    
    if (addedCount > 0) {
      // Insert new shapes in BPMNPlane
      const newPlaneContent = planeContent + newShapes;
      modifiedXml = modifiedXml.replace(
        planeMatch[0], 
        planeStart + newPlaneContent + planeEnd
      );
      
      console.log(`✅ ${addedCount} BPMNShapes added to XML`);
    }
    
    return modifiedXml;
  }
}
