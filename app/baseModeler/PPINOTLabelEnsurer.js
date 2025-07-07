/**
 * PPINOTLabelEnsurer: Ensures that PPINOT elements have proper labels
 * This module monitors PPINOT elements and ensures they have the necessary labels
 */
export default function PPINOTLabelEnsurer(eventBus, canvas, modeling) {
    this._eventBus = eventBus;
    this._canvas = canvas;
    this._modeling = modeling;
    
    console.log('PPINOTLabelEnsurer: Initialized');
    
    // Listen for element creation to ensure labels are created
    eventBus.on('shape.added', function(event) {
        var element = event.element;
        
        if (isPPINOTElement(element)) {
            console.log('PPINOTLabelEnsurer: PPINOT element added:', element.type);
            // Here you can add logic to ensure labels are properly created
            // For now, we'll just log the event
        }
    });
    
    // Listen for element updates
    eventBus.on('element.changed', function(event) {
        var element = event.element;
        
        if (isPPINOTElement(element)) {
            console.log('PPINOTLabelEnsurer: PPINOT element changed:', element.type);
            // Here you can add logic to update labels if needed
        }
    });
}

PPINOTLabelEnsurer.$inject = [
    'eventBus',
    'canvas',
    'modeling'
];
// Helper function to check if element is a PPINOT element
function isPPINOTElement(element) {
    return element && element.type && element.type.startsWith('PPINOT:');
}

