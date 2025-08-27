

/**
 * Test the updated syncPPIChangesToCanvas with error handling and PPI title support
 */
function testUpdatedSyncPPIChangesToCanvas() {
  console.log('🧪 [testUpdatedSyncPPIChangesToCanvas] Testing updated sync method...');
  
  try {
    // Get the first PPI from the list
    const ppiManager = window.ppiManager;
    if (!ppiManager || !ppiManager.core || !ppiManager.core.ppis || ppiManager.core.ppis.length === 0) {
      console.log('❌ [testUpdatedSyncPPIChangesToCanvas] No PPIs found');
      return;
    }
    
    const firstPpi = ppiManager.core.ppis[0];
    console.log('📋 [testUpdatedSyncPPIChangesToCanvas] Testing with PPI:', firstPpi);
    
    // Create test data with title, target, and scope
    const testData = {
      title: 'Test PPI Title ' + Date.now(),
      target: 'Test Target ' + Date.now(),
      scope: 'Test Scope ' + Date.now(),
      process: firstPpi.process || 'Test Process',
      businessObjective: firstPpi.businessObjective || 'Test Objective',
      measureType: firstPpi.measureType || 'Test Measure',
      measureDefinition: firstPpi.measureDefinition || 'Test Definition',
      source: firstPpi.source || 'Test Source',
      responsible: firstPpi.responsible || 'Test Responsible',
      informed: firstPpi.informed || 'Test Informed',
      comments: firstPpi.comments || 'Test Comments'
    };
    
    console.log('📝 [testUpdatedSyncPPIChangesToCanvas] Test data:', testData);
    
    // Call the updated sync method
    ppiManager.syncPPIChangesToCanvas(firstPpi.id, testData);
    
    console.log('✅ [testUpdatedSyncPPIChangesToCanvas] Sync method called successfully');
    
    // Wait a moment and then verify the changes
    setTimeout(() => {
      console.log('🔍 [testUpdatedSyncPPIChangesToCanvas] Verifying changes...');
      
      const modeler = ppiManager.getBpmnModeler();
      if (!modeler) {
        console.log('❌ [testUpdatedSyncPPIChangesToCanvas] No modeler available for verification');
        return;
      }
      
      const elementRegistry = modeler.get('elementRegistry');
      const ppiElement = elementRegistry.get(firstPpi.elementId);
      
      if (ppiElement) {
        console.log('📝 [testUpdatedSyncPPIChangesToCanvas] PPI element name:', ppiElement.businessObject ? ppiElement.businessObject.name : 'no businessObject');
      }
      
      // Check Target and Scope elements
      const allElements = elementRegistry.getAll();
      const targetElements = allElements.filter(el => 
        el.type === 'PPINOT:Target' && el.parent && el.parent.id === firstPpi.elementId
      );
      const scopeElements = allElements.filter(el => 
        el.type === 'PPINOT:Scope' && el.parent && el.parent.id === firstPpi.elementId
      );
      
      targetElements.forEach((targetEl, index) => {
        console.log(`🎯 [testUpdatedSyncPPIChangesToCanvas] Target ${index + 1} name:`, targetEl.businessObject ? targetEl.businessObject.name : 'no businessObject');
      });
      
      scopeElements.forEach((scopeEl, index) => {
        console.log(`🔍 [testUpdatedSyncPPIChangesToCanvas] Scope ${index + 1} name:`, scopeEl.businessObject ? scopeEl.businessObject.name : 'no businessObject');
      });
      
      console.log('✅ [testUpdatedSyncPPIChangesToCanvas] Verification completed');
    }, 500);
    
  } catch (error) {
    console.error('💥 [testUpdatedSyncPPIChangesToCanvas] Error:', error);
  }
}

// Exponer función para testing
window.testUpdatedSyncPPIChangesToCanvas = testUpdatedSyncPPIChangesToCanvas;

console.log('🚀 [test-bidirectional-sync] Script actualizado con función de testing:');
console.log('   - testUpdatedSyncPPIChangesToCanvas(): Prueba la sincronización actualizada con manejo de errores y título PPI');
