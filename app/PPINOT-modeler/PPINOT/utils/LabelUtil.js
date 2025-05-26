import { getBusinessObject, isAny } from 'bpmn-js/lib/util/ModelUtil';
import * as LabelUtil from 'bpmn-js/lib/util/LabelUtil';

// Import original functions if available
let basicGetLabel, basicSetLabel;

try {
    // Try to import from label-editing if available
    const labelEditingUtil = require('bpmn-js/lib/features/label-editing/LabelUtil');
    basicGetLabel = labelEditingUtil.getLabel;
    basicSetLabel = labelEditingUtil.setLabel;
} catch (e) {
    // Fallback to default implementations
    basicGetLabel = null;
    basicSetLabel = null;
}

/**
 * Get the label of an element
 *
 * @param {Object} element
 *
 * @return {String}
 */
export function getLabel(element) {
    // Use imported function if available
    if (basicGetLabel) {
        return basicGetLabel(element);
    }
    
    // Fallback implementation
    const businessObject = getBusinessObject(element);
    
    if (!businessObject) {
        return '';
    }

    // Return name if available
    if (businessObject.name !== undefined) {
        return businessObject.name || '';
    }
    
    // Return text if available (for labels)
    if (businessObject.text !== undefined) {
        return businessObject.text || '';
    }
    
    return '';
}

/**
 * Set the label for an element
 *
 * @param {Object} element
 * @param {String} text
 */
export function setLabel(element, text) {
    // Use imported function if available
    if (basicSetLabel) {
        return basicSetLabel(element, text);
    }
    
    // Fallback implementation
    const businessObject = getBusinessObject(element);
    
    if (!businessObject) {
        return;
    }
    
    // Set name if property exists
    if ('name' in businessObject) {
        businessObject.name = text;
    }
    
    // Set text if property exists (for labels)
    if ('text' in businessObject) {
        businessObject.text = text;
    }
    
    return element;
}

/**
 * Check if an element is a label
 *
 * @param {Object} element
 * @return {Boolean}
 */
export function isLabel(element) {
    return element && element.type === 'label';
}

/**
 * Check if an element has an external label
 *
 * @param {Object} element
 * @return {Boolean}
 */
export function isLabelExternal(element) {
    return element && 
           element.waypoints && 
           isAny(element, [
             'bpmn:SequenceFlow',
             'bpmn:MessageFlow',
             'bpmn:Association',
             'bpmn:DataAssociation'
           ]) ||
           LabelUtil.isLabelExternal(element);
}

// Export other label-related utilities
export const DEFAULT_LABEL_SIZE = LabelUtil.DEFAULT_LABEL_SIZE;
export const FLOW_LABEL_INDENT = LabelUtil.FLOW_LABEL_INDENT;
export const getExternalLabelBounds = LabelUtil.getExternalLabelBounds;
export const getExternalLabelMid = LabelUtil.getExternalLabelMid;
export const getFlowLabelPosition = LabelUtil.getFlowLabelPosition;
export const getWaypointsMid = LabelUtil.getWaypointsMid;
export const hasExternalLabel = LabelUtil.hasExternalLabel;