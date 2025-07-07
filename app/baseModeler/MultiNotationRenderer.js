import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import inherits from 'inherits';

export default function MultiNotationRenderer(config, eventBus, styles, pathMap, canvas, textRenderer) {
  // Validate parameters
  if (!eventBus) {
    throw new Error('MultiNotationRenderer requires eventBus');
  }
  if (typeof eventBus.on !== 'function') {
    throw new Error('MultiNotationRenderer requires a proper EventBus object with .on method');
  }
  if (!styles) {
    throw new Error('MultiNotationRenderer requires styles');
  }
  if (!canvas) {
    throw new Error('MultiNotationRenderer requires canvas');
  }
  if (!textRenderer) {
    throw new Error('MultiNotationRenderer requires textRenderer');
  }
  
  // Call the parent constructor with the correct parameter order
  BpmnRenderer.call(this, config, eventBus, styles, pathMap, canvas, textRenderer);
  
  // Store references for later use
  this._textRenderer = textRenderer;
  this._canvas = canvas;
  
  // Create an instance of PPINOTRenderer with proper dependencies
  this._ppinotRenderer = new PPINOTRenderer(eventBus, styles, canvas, textRenderer);
  
  // Don't override label rendering - let PPINOTRenderer handle it natively
}

inherits(MultiNotationRenderer, BpmnRenderer);

MultiNotationRenderer.$inject = [
  'config.bpmnRenderer',
  'eventBus',
  'styles',
  'pathMap',
  'canvas',
  'textRenderer'
];

MultiNotationRenderer.prototype.canRender = function(element) {
  // Let BPMN renderer handle all labels for consistency and proper movement behavior
  if (element.type === 'label') {
    return BpmnRenderer.prototype.canRender.call(this, element);
  }
  
  // First check if PPINOT renderer can handle it
  if (this._ppinotRenderer.canRender(element)) {
    return true;
  }
  // Otherwise, defer to parent BpmnRenderer
  return BpmnRenderer.prototype.canRender.call(this, element);
};

MultiNotationRenderer.prototype.drawShape = function(parentGfx, element) {
  console.log('MultiNotationRenderer.drawShape called for:', element.type, element);
  
  // Let BPMN renderer handle all labels for consistency and proper movement behavior
  if (element.type === 'label') {
    console.log('Drawing label using BPMN renderer');
    return BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);
  }
  
  if (this._ppinotRenderer.canRender(element)) {
    console.log('Drawing PPINOT element using PPINOT renderer');
    // Use the inheritance-based PPINOTRenderer method directly
    return this._ppinotRenderer.drawShape(parentGfx, element);
  }
  
  console.log('Drawing BPMN element using BPMN renderer');
  return BpmnRenderer.prototype.drawShape.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getShapePath = function(shape) {
  if (this._ppinotRenderer.canRender(shape)) {
    return this._ppinotRenderer.getShapePath(shape);
  }
  return BpmnRenderer.prototype.getShapePath.call(this, shape);
};

MultiNotationRenderer.prototype.drawConnection = function(parentGfx, element) {
  if (this._ppinotRenderer.canRender(element)) {
    // Use the inheritance-based PPINOTRenderer method directly
    return this._ppinotRenderer.drawConnection(parentGfx, element);
  }
  return BpmnRenderer.prototype.drawConnection.call(this, parentGfx, element);
};

MultiNotationRenderer.prototype.getConnectionPath = function(connection) {
  if (this._ppinotRenderer.canRender(connection)) {
    return this._ppinotRenderer.getConnectionPath(connection);
  }
  return BpmnRenderer.prototype.getConnectionPath.call(this, connection);
};

MultiNotationRenderer.prototype.drawLabel = function(parentGfx, element) {
  // Always ensure label is rendered by parent BpmnRenderer first
  const labelGfx = BpmnRenderer.prototype.drawLabel.call(this, parentGfx, element);
  
  // Apply immediate visibility fix for all labels
  if (labelGfx) {
    // Force visibility immediately
    labelGfx.style.visibility = 'visible';
    labelGfx.style.display = 'block';
    labelGfx.style.opacity = '1';
    labelGfx.style.zIndex = '1000';
    
    // Find text and tspan elements
    const textElement = labelGfx.querySelector('text');
    if (textElement) {
      textElement.style.visibility = 'visible';
      textElement.style.display = 'block';
      textElement.style.opacity = '1';
      textElement.style.fill = '#000000';
      
      const tspanElement = textElement.querySelector('tspan');
      if (tspanElement) {
        tspanElement.style.visibility = 'visible';
        tspanElement.style.display = 'block';
        tspanElement.style.opacity = '1';
        tspanElement.style.fill = '#000000';
        
        // Ensure text content exists
        if (!tspanElement.textContent || tspanElement.textContent.trim() === '') {
          const fallbackText = element.id ? 
            element.id.replace('_label', '').replace(/([A-Z])/g, ' $1').trim() || 'PPINOT Element' :
            'PPINOT Element';
          tspanElement.textContent = fallbackText;
        }
      }
    }
    
    // Add mutation observer to prevent changes
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && 
            (mutation.attributeName === 'style' || mutation.attributeName === 'visibility')) {
          // Re-force visibility if it was changed
          const target = mutation.target;
          if (target.style.visibility !== 'visible' || 
              target.style.display === 'none' || 
              target.style.opacity === '0') {
            target.style.visibility = 'visible';
            target.style.display = 'block';
            target.style.opacity = '1';
          }
        }
      });
    });
    
    observer.observe(labelGfx, {
      attributes: true,
      attributeFilter: ['style', 'visibility', 'display', 'opacity'],
      subtree: true
    });
    
    // Store observer reference for cleanup
    labelGfx._visibilityObserver = observer;
  }
  
  return labelGfx;
};
