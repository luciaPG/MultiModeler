import {is} from "bpmn-js/lib/util/ModelUtil";
import {
    getLabel as basicGetLabel,
    setLabel as basicSetLabel,
} from "bpmn-js/lib/features/label-editing/LabelUtil";

import * as labelUtils from "bpmn-js/lib/util/LabelUtil"
import {isAny} from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import {assign} from "min-dash";
import {DEFAULT_LABEL_SIZE} from "bpmn-js/lib/util/LabelUtil";
import {getDi} from "bpmn-js/lib/util/ModelUtil";
import {label, externalLabel} from "../Types";

export function getLabel(element) {
    let semantic = element.businessObject;

    // Handle external label elements (type 'label')
    if (element.type === 'label' && semantic && semantic.text) {
        return semantic.text;
    }
    
    if (isAny(semantic, label))
        return semantic.text;
    else
        return basicGetLabel(element);
}

export function setLabel(element, text, isExternal) {
    let semantic = element.businessObject;
    
    // Handle external label elements (type 'label')
    if (element.type === 'label') {
        if (!semantic) {
            semantic = element.businessObject = { $type: 'bpmn:Label' };
        }
        semantic.text = text;
        
        // Mark as edited for persistence
        element._labelWasEdited = true;
        
        // Also mark target element if exists
        if (element.labelTarget) {
            element.labelTarget._labelWasEdited = true;
        }
        
        return element;
    }
    
    if (isAny(semantic, label)) {
        semantic.text = text;
        
        // Mark as edited for persistence
        element._labelWasEdited = true;
        
        return element;
    }
    else
        return basicSetLabel(element, text, isExternal);
}

/**
 * Returns true if the given semantic is an external label
 *
 * @param {BpmnElement} semantic
 * @return {Boolean} true if is label
 */
export function isLabelExternal(semantic) {
    return is(semantic, 'bpmn:Event') ||
        is(semantic, 'bpmn:Gateway') ||
        is(semantic, 'bpmn:DataStoreReference') ||
        is(semantic, 'bpmn:DataObjectReference') ||
        is(semantic, 'bpmn:DataInput') ||
        is(semantic, 'bpmn:DataOutput') ||
        is(semantic, 'bpmn:SequenceFlow') ||
        is(semantic, 'bpmn:MessageFlow') ||
        is(semantic, 'bpmn:Group') ||
        isAny(semantic, externalLabel);
}

/**
 * Check if an element is a label
 */
export function isLabel(element) {
    return element && element.type === 'label';
}

/**
 * Check if an element has an external label
 */
export function hasExternalLabel(element) {
    return element && element.label;
}

/**
 * Get the mid point of an external label relative to its element
 */
export function getExternalLabelMid(element) {
    if (!element) {
        return undefined;
    }
    
    return {
        x: element.x + element.width / 2,
        y: element.y + element.height + 30
    };
}


/**
 * Get the position for sequence flow labels
 *
 * @param  {Array<Point>} waypoints
 * @return {Point} the label position
 */
export function getFlowLabelPosition(waypoints) {
    return labelUtils.getFlowLabelPosition(waypoints)
}


/**
 * Get the middle of a number of waypoints
 *
 * @param  {Array<Point>} waypoints
 * @return {Point} the mid point
 */
export function getWaypointsMid(waypoints) {
    return labelUtils.getWaypointsMid(waypoints)
}


/**
 * Returns the bounds of an elements label, parsed from the elements DI or
 * generated from its bounds.
 *
 * @param {BpmnElement} semantic
 * @param {djs.model.Base} element
 */
export function getExternalLabelBounds(semantic, element) {
    const di= getDi(semantic)
    if(di)
        return labelUtils.getExternalLabelBounds(semantic, element)
    else {
        let mid = getExternalLabelMid(element);
        let size = DEFAULT_LABEL_SIZE;

        return assign({
            x: mid.x - size.width / 2,
            y: mid.y - size.height / 2
        }, size);
    }
}

/**
 * Check if element is a PPINOT element
 */
export function isPPINOTElement(element) {
    return element && element.type && element.type.startsWith('PPINOT:');
}

/**
 * Update label for PPINOT elements
 */
export function updateLabel(element) {
    // For now, just trigger a visual update
    // This can be expanded later if needed
    return element;
}