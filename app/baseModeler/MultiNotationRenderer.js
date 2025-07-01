
import BpmnRenderer from 'bpmn-js/lib/draw/BpmnRenderer';
import PPINOTRenderer from '../PPINOT-modeler/PPINOT/PPINOTRenderer';
import {create as svgCreate, append as svgAppend} from 'tiny-svg';

export default class MultiNotationRenderer extends BpmnRenderer {
  constructor(eventBus, styles, pathMap, canvas, textRenderer, priority = 500) {
    // Use a higher priority than the default BpmnRenderer to ensure our renderer is used first
    super(eventBus, styles, pathMap, canvas, textRenderer, priority);
    
    // Create an instance of PPINOTRenderer with proper dependencies
    this._ppinotRenderer = new PPINOTRenderer(eventBus, styles, canvas, textRenderer);
    
    // Bind label rendering methods so PPINOTRenderer can use them
    var self = this;
    this._ppinotRenderer.renderEmbeddedLabel = function(parentGfx, element, align) {
      return self._renderEmbeddedLabel(parentGfx, element, align);
    };
    
    this._ppinotRenderer.renderEmbeddedDefaultLabel = function(parentGfx, element, align, text, fontSize, fontWeight) {
      return self._renderEmbeddedDefaultLabel(parentGfx, element, align, text, fontSize, fontWeight);
    };
  }

  _renderEmbeddedLabel(parentGfx, element, align) {
    // Get the business object name or use element name
    var text = (element.businessObject && element.businessObject.name) || element.name || '';
    
    if (!text) {
      return null;
    }

    // Calculate text position based on alignment
    var x, y;
    var width = element.width || 50;
    var height = element.height || 50;
    
    if (align === 'center-middle') {
      x = width / 2;
      y = height / 2;
    } else if (align === 'center-top') {
      x = width / 2;
      y = 15;
    } else {
      x = 10;
      y = height / 2;
    }

    // Create text element directly using SVG
    var textElement = svgCreate('text', {
      x: x,
      y: y,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'Arial, sans-serif',
      'font-size': '12px',
      'fill': '#000'
    });

    textElement.textContent = text;
    svgAppend(parentGfx, textElement);

    return textElement;
  }

  _renderEmbeddedDefaultLabel(parentGfx, element, align, text, fontSize, fontWeight) {
    if (!text) {
      return null;
    }

    // Calculate text position based on alignment
    var x, y;
    var width = element.width || 50;
    var height = element.height || 50;
    
    if (align === 'center-middle') {
      x = width / 2;
      y = height / 2;
    } else if (align === 'center-top') {
      x = width / 2;
      y = 15;
    } else {
      x = 10;
      y = height / 2;
    }

    // Create text element directly using SVG
    var textElement = svgCreate('text', {
      x: x,
      y: y,
      'text-anchor': 'middle',
      'dominant-baseline': 'central',
      'font-family': 'Arial, sans-serif',
      'font-size': (fontSize || 12) + 'px',
      'font-weight': fontWeight || 'normal',
      'fill': '#000'
    });

    textElement.textContent = text;
    svgAppend(parentGfx, textElement);

    return textElement;
  }

  canRender(element) {
    console.log('MultiNotationRenderer.canRender called for:', element.type);
    
    // Delegate to PPINOTRenderer for PPINOT types
    if (this._ppinotRenderer.canRender(element)) {
      console.log('  -> Will be handled by PPINOTRenderer');
      return true;
    }
    
    // Otherwise, BPMN
    const canRenderBpmn = super.canRender ? super.canRender(element) : /^bpmn:/.test(element.type);
    console.log('  -> Will be handled by BpmnRenderer:', canRenderBpmn);
    return canRenderBpmn;
  }

  drawShape(parentGfx, element) {
    console.log('MultiNotationRenderer.drawShape called for:', element.type);
    
    if (this._ppinotRenderer.canRender(element)) {
      console.log('  -> Drawing with PPINOTRenderer');
      // Use the inheritance-based PPINOTRenderer method directly
      return this._ppinotRenderer.drawShape(parentGfx, element);
    }
    
    console.log('  -> Drawing with BpmnRenderer');
    return super.drawShape(parentGfx, element);
  }

  getShapePath(shape) {
    if (this._ppinotRenderer.canRender(shape)) {
      return this._ppinotRenderer.getShapePath(shape);
    }
    return super.getShapePath(shape);
  }

  drawConnection(parentGfx, element) {
    if (this._ppinotRenderer.canRender(element)) {
      // Use the inheritance-based PPINOTRenderer method directly
      return this._ppinotRenderer.drawConnection(parentGfx, element);
    }
    return super.drawConnection(parentGfx, element);
  }

  getConnectionPath(connection) {
    if (this._ppinotRenderer.canRender(connection)) {
      return this._ppinotRenderer.getConnectionPath(connection);
    }
    return super.getConnectionPath(connection);
  }
}