import { getLabel, setLabel } from './utils/LabelUtil';

/**
 * A custom replace service for PPINOT elements that handles element replacement
 * with proper label preservation and connection handling.
 */
export default function PPINOTReplace(modeling, elementFactory, eventBus) {
  
  this._modeling = modeling;
  this._elementFactory = elementFactory;
  this._eventBus = eventBus;
}

PPINOTReplace.$inject = ['modeling', 'elementFactory', 'eventBus'];

/**
 * Replace a PPINOT element with another type while preserving labels and connections
 * 
 * @param {Object} element - The element to replace
 * @param {Object} target - The target configuration with type and other properties
 * @return {Object} The new element
 */
PPINOTReplace.prototype.replaceElement = function(element, target) {
  // Preserve the original label text
  var originalText = getLabel(element);
  
  // Preserve connections data
  var incoming = element.incoming ? element.incoming.slice() : [];
  var outgoing = element.outgoing ? element.outgoing.slice() : [];
  
  var incomingData = incoming.map(function(connection) {
    return {
      source: connection.source,
      target: element,
      type: connection.type,
      waypoints: connection.waypoints ? connection.waypoints.slice() : undefined
    };
  });
  
  var outgoingData = outgoing.map(function(connection) {
    return {
      source: element,
      target: connection.target,
      type: connection.type,
      waypoints: connection.waypoints ? connection.waypoints.slice() : undefined
    };
  });
    // Get element position and size for new element
  var elementBounds = {
    x: element.x,
    y: element.y,
    width: element.width,
    height: element.height
  };  
  console.log('Original element bounds:', elementBounds);
  
  // Create the new element with explicit positioning
  var newElement = this._elementFactory.createShape({
    type: target.type,
    x: elementBounds.x,
    y: elementBounds.y,
    width: elementBounds.width,
    height: elementBounds.height
  });
  
  // CRITICAL: Ensure the new element has the correct coordinates
  newElement.x = elementBounds.x;
  newElement.y = elementBounds.y;
  newElement.width = elementBounds.width;
  newElement.height = elementBounds.height;
  


  
  // Remove old connections before replacing the element
  incoming.forEach(function(connection) {
    try {
      this._modeling.removeConnection(connection);
    } catch (error) {
      console.warn('Failed to remove incoming connection:', error);
    }
  }.bind(this));
  
  outgoing.forEach(function(connection) {
    try {
      this._modeling.removeConnection(connection);
    } catch (error) {
      console.warn('Failed to remove outgoing connection:', error);
    }
  }.bind(this));
    // Replace the element using modeling service
  var replacedElement = this._modeling.replaceShape(element, newElement);

  
  // CRITICAL: Force position preservation after replacement
  // Sometimes the modeling service doesn't preserve the exact coordinates
  if (replacedElement && (replacedElement.x !== elementBounds.x || replacedElement.y !== elementBounds.y)) {
    console.log('Position was changed during replacement, correcting...');
    console.log('Before correction:', { x: replacedElement.x, y: replacedElement.y });
    
    try {
      // Use moveShape to ensure the element is at the correct position
      this._modeling.moveShape(replacedElement, { 
        x: elementBounds.x - replacedElement.x, 
        y: elementBounds.y - replacedElement.y 
      });
      console.log('Position corrected to:', { x: replacedElement.x, y: replacedElement.y });
    } catch (error) {
      console.warn('Failed to correct position via moveShape:', error);
      
      // Fallback: Direct assignment
      replacedElement.x = elementBounds.x;
      replacedElement.y = elementBounds.y;
      console.log('Position corrected via direct assignment');
    }
  } else {
    console.log('Position preserved correctly during replacement');
  }// Restore the label text if it existed
  if (originalText && originalText.trim() !== '' && replacedElement) {
    console.log('Restoring label text:', originalText, 'to element:', replacedElement.id);
    
    // Ensure the businessObject exists and is properly initialized
    if (!replacedElement.businessObject) {
      console.warn('No businessObject found, creating one');
      replacedElement.businessObject = {};
    }
    
    // First strategy: Use the modeling service to properly update the label
    try {
      console.log('Using modeling service to update label');
      this._modeling.updateLabel(replacedElement, originalText);
      console.log('Modeling service label update successful');
    } catch (error) {
      console.warn('Modeling service failed, trying direct assignment:', error);
    }
    
    // Second strategy: Direct assignment
    try {
      replacedElement.businessObject.text = originalText;
      setLabel(replacedElement, originalText);
    } catch (error) {
      // Silent fallback
    }
    
    // Third strategy: Multiple timeout backups with different approaches
    setTimeout(function() {
      try {
        this._modeling.updateLabel(replacedElement, originalText);
        
        if (replacedElement.businessObject) {
          replacedElement.businessObject.text = originalText;
          setLabel(replacedElement, originalText);
        }
      } catch (error) {
        // Silent fallback
      }
    }.bind(this), 10);
    
    // Fourth strategy: Extended timeout with force update
    setTimeout(function() {
      try {
        // Ensure businessObject still exists
        if (!replacedElement.businessObject) {
          replacedElement.businessObject = {};
        }
        
        // Try modeling service again
        this._modeling.updateLabel(replacedElement, originalText);
        
        // Force direct assignment
        replacedElement.businessObject.text = originalText;
        setLabel(replacedElement, originalText);
        
        // Trigger a redraw to ensure visual update
        this._eventBus.fire('element.changed', { element: replacedElement });
      } catch (error) {
        // Silent fallback
      }
    }.bind(this), 100);
    
    // Fifth strategy: Ultimate fallback
    setTimeout(function() {
      try {
        var currentLabel = getLabel(replacedElement);
        if (!currentLabel || currentLabel.trim() === '') {
          if (!replacedElement.businessObject) {
            replacedElement.businessObject = {};
          }
          replacedElement.businessObject.text = originalText;
          setLabel(replacedElement, originalText);
          this._eventBus.fire('element.changed', { element: replacedElement });
        }
      } catch (error) {
        // Silent fallback
      }
    }.bind(this), 250);
  }
  
  // Recreate connections
  incomingData.forEach(function(data) {
    try {
      if (data.source && replacedElement) {
        console.log('Recreating incoming connection from', data.source.id, 'to', replacedElement.id);
        
        var connectionData = { type: data.type };
        if (data.waypoints) {
          connectionData.waypoints = data.waypoints;
        }
        
        this._modeling.connect(data.source, replacedElement, connectionData);
      } else {
        console.warn('Invalid source or target for incoming connection');
      }
    } catch (error) {
      console.error('Error recreating incoming connection:', error);
    }
  }.bind(this));
  
  outgoingData.forEach(function(data) {
    try {
      if (replacedElement && data.target) {
        console.log('Recreating outgoing connection from', replacedElement.id, 'to', data.target.id);
        
        var connectionData = { type: data.type };
        if (data.waypoints) {
          connectionData.waypoints = data.waypoints;
        }
        
        this._modeling.connect(replacedElement, data.target, connectionData);
      } else {
        console.warn('Invalid source or target for outgoing connection');
      }
    } catch (error) {
      console.error('Error recreating outgoing connection:', error);
    }
  }.bind(this));
  
  console.log('PPINOTReplace.replaceElement completed for:', replacedElement.id);
  return replacedElement;
};
