import PaletteProvider from 'bpmn-js/lib/features/palette/PaletteProvider';
import { assign } from 'min-dash';

/**
 * A unified palette provider that extends the standard BPMN palette
 * and adds notation-specific elements based on enabled notations
 */
export default function BasePaletteProvider(
    palette, create, elementFactory,
    spaceTool, lassoTool, handTool,
    globalConnect, translate, bpmnFactory) {

  // Call parent constructor
  PaletteProvider.call(this, palette, create, elementFactory, spaceTool, lassoTool, handTool, globalConnect, translate, bpmnFactory);

  console.log('🎨 BasePaletteProvider constructor called (extending BPMN PaletteProvider)');
}

// Set up prototype chain
BasePaletteProvider.prototype = Object.create(PaletteProvider.prototype);
BasePaletteProvider.prototype.constructor = BasePaletteProvider;

BasePaletteProvider.$inject = [
  'palette',
  'create',
  'elementFactory',
  'spaceTool',
  'lassoTool',
  'handTool',
  'globalConnect',
  'translate',
  'bpmnFactory'
];

BasePaletteProvider.prototype.getPaletteEntries = function() {
  console.log('🎨 BasePaletteProvider.getPaletteEntries called');
  
  // Get the standard BPMN palette entries from parent
  var parentEntries = PaletteProvider.prototype.getPaletteEntries.call(this);
  console.log('📋 Parent BPMN palette entries:', Object.keys(parentEntries));
  
  // Add our custom test entry
  var customEntries = {
    'test-entry': {
      group: 'tools',
      className: 'bpmn-icon-hand-tool',
      title: 'Test Custom Entry',
      action: {
        click: function() {
          console.log('Test custom entry clicked!');
        }
      }
    }
  };
  
  // Merge parent entries with our custom entries
  var allEntries = assign({}, parentEntries, customEntries);
  
  console.log('🎨 BasePaletteProvider returning merged entries:', Object.keys(allEntries));
  return allEntries;
};
