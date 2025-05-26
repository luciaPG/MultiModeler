import * as ModelUtil from 'bpmn-js/lib/util/ModelUtil';
import * as LabelUtil from 'bpmn-js/lib/util/LabelUtil';
import { getMid, asTRBL } from 'diagram-js/lib/layout/LayoutUtil';
import * as CustomLabelUtil from './LabelUtil';

/**
 * Funciones de ModelUtil
 */
export const is = ModelUtil.is;
export const isAny = ModelUtil.isAny || function(element, types) {
    if (!element || !element.type) {
        return false;
    }

    if (!Array.isArray(types)) {
        types = [types];
    }

    return types.some(function(type) {
        return element.type === type || 
               (element.businessObject && element.businessObject.$instanceOf(type));
    });
};
export const getBusinessObject = ModelUtil.getBusinessObject;
export const getDi = ModelUtil.getDi;

/**
 * Funciones de LabelUtil
 */
export const isLabel = CustomLabelUtil.isLabel || LabelUtil.isLabel || function(element) {
    return element && element.type === 'label';
};

export const isLabelExternal = CustomLabelUtil.isLabelExternal || LabelUtil.isLabelExternal;
export const getLabel = CustomLabelUtil.getLabel || LabelUtil.getLabel;
export const setLabel = CustomLabelUtil.setLabel || LabelUtil.setLabel;
export const DEFAULT_LABEL_SIZE = LabelUtil.DEFAULT_LABEL_SIZE || { width: 90, height: 20 };
export const FLOW_LABEL_INDENT = LabelUtil.FLOW_LABEL_INDENT || 15;
export const getExternalLabelBounds = LabelUtil.getExternalLabelBounds;
export const getExternalLabelMid = LabelUtil.getExternalLabelMid;
export const getFlowLabelPosition = LabelUtil.getFlowLabelPosition;
export const getWaypointsMid = LabelUtil.getWaypointsMid;
export const hasExternalLabel = LabelUtil.hasExternalLabel;

/**
 * Funciones de LayoutUtil
 */
export { getMid, asTRBL };

/**
 * Función auxiliar para verificar si un elemento cumple ciertas condiciones
 * Útil para implementar reglas personalizadas
 */
export function elementMatchCondition(element, condition) {
    if (!element || !condition) {
        return false;
    }
    
    if (typeof condition === 'string') {
        return is(element, condition);
    }
    
    if (Array.isArray(condition)) {
        return isAny(element, condition);
    }
    
    if (typeof condition === 'function') {
        return condition(element);
    }
    
    return false;
}

/**
 * Versiones compatibles de otras funciones utilizadas en PPINOTConnect
 */
export function canConnect(rules, source, target, connectionType) {
    return rules.allowed('connection.create', {
        source: source,
        target: target,
        type: connectionType
    });
}