import {
    reduce
} from 'min-dash';

import inherits from 'inherits';

import {
    is
} from 'bpmn-js/lib/util/ModelUtil';

import RuleProvider from 'diagram-js/lib/features/rules/RuleProvider';
import { isAny } from "bpmn-js/lib/features/modeling/util/ModelingUtil";
import { isPPINOTResourceArcElement, isPPINOTShape, isPPINOTAggregatedElement, isPPINOTConnection } from "./Types";
import { isLabel } from "bpmn-js/lib/util/LabelUtil";

// This module defines the rules of connection for the different types of connectors and elements created

var HIGH_PRIORITY = 1500;

//To create restrictions of connection you have to use these functions
//this function checks if an element is some of PPINOT elements
function isPPINOT(element) {
    return element && /^PPINOT:/.test(element.type);
}

//this function checks if an element is a task or event
function isDefaultValid(element) {
    return element && (is(element, 'bpmn:Task') || is(element, 'bpmn:Event') || is(element, 'bpmn:Pool') || is(element, 'bpmn:DataObjectReference'))
}


/**
 * Specific rules for PPINOT elements
 */
export default function PPINOTRules(eventBus) {
    RuleProvider.call(this, eventBus);

}

inherits(PPINOTRules, RuleProvider);

PPINOTRules.$inject = ['eventBus'];


// This function defines the connection
// you must define some conditions and check these conditions for the target, the source and the connection type 
// and if all conditions are correct, the connection will be created without problemas 
function connect(source, target, connection) {
    if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
        return null;
    }

    if (connection === 'PPINOT:MyConnection') {
        return { type: connection }
    }

    if (connection === 'PPINOT:RFCStateConnection') {
        return { type: connection }
    } else if (connection === 'PPINOT:DashedLine') {
        if (isDefaultValid(target) && (is(source, 'PPINOT:StateConditionMeasure') ||
                is(source, 'PPINOT:StateConditionAggregatedMeasure') || is(source, 'PPINOT:StateCondAggMeasureNumber') ||
                is(source, 'PPINOT:StateCondAggMeasurePercentage') || is(source, 'PPINOT:StateCondAggMeasureAll') ||
                is(source, 'PPINOT:StateCondAggMeasureAtLeastOne') || is(source, 'PPINOT:StateCondAggMeasureNo') ||
                is(source, 'PPINOT:CountMeasure') || is(source, 'PPINOT:DataMeasure') || is(source, 'PPINOT:TimeMeasure') ||
                is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:DataAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')))
            return { type: connection }
        else
            return false
    } else if (connection === 'PPINOT:ToConnection') {
        if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) &&
            (is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:CyclicTimeMeasure') ||
                is(source, 'PPINOT:CyclicTimeMeasureSUM') || is(source, 'PPINOT:CyclicTimeMeasureMAX') ||
                is(source, 'PPINOT:CyclicTimeMeasureMIN') || is(source, 'PPINOT:CyclicTimeMeasureAVG') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasureSUM') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureMAX') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasureMIN') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureAVG') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')))
            return { type: connection }
        else
            return false
    } else if (connection === 'PPINOT:FromConnection') {
        if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) &&
            (is(source, 'PPINOT:TimeMeasure') || is(source, 'PPINOT:CyclicTimeMeasure') ||
                is(source, 'PPINOT:CyclicTimeMeasureSUM') || is(source, 'PPINOT:CyclicTimeMeasureMAX') ||
                is(source, 'PPINOT:CyclicTimeMeasureMIN') || is(source, 'PPINOT:CyclicTimeMeasureAVG') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasureSUM') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureMAX') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasureMIN') || is(source, 'PPINOT:CyclicTimeAggregatedMeasureAVG') ||
                is(source, 'PPINOT:CyclicTimeAggregatedMeasure') || is(source, 'PPINOT:TimeAggregatedMeasure')))
            return { type: connection }
        else
            return false
    } else if (connection === 'PPINOT:StartConnection') {
        if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') ||
                is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM') ||
                is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN') ||
                is(source, 'PPINOT:CountAggregatedMeasureAVG')))
            return { type: connection }
        else
            return false
    } else if (connection === 'PPINOT:EndConnection') {
        if ((isDefaultValid(target) || is(target, 'bpmn:Participant')) && (is(source, 'PPINOT:CountMeasure') ||
                is(source, 'PPINOT:CountAggregatedMeasure') || is(source, 'PPINOT:CountAggregatedMeasureSUM') ||
                is(source, 'PPINOT:CountAggregatedMeasureMAX') || is(source, 'PPINOT:CountAggregatedMeasureMIN') ||
                is(source, 'PPINOT:CountAggregatedMeasureAVG')))
            return { type: connection }
        else
            return false
    } else {
        if (!isPPINOT(source) && !isPPINOT(target))
            return;
        else if ((isDefaultValid(source) && isPPINOTResourceArcElement(target)) ||
            (isDefaultValid(target) && isPPINOTResourceArcElement(source))) {
            return { type: 'PPINOT:ResourceArc' }
        } else if ((isPPINOTAggregatedElement(source) && isPPINOTShape(target)))
            return {
                type: 'PPINOT:AggregatedConnection'
            }
        else if (isPPINOTAggregatedElement(source) && is(target, 'bpmn:DataObjectReference'))
            return {
                type: 'PPINOT:GroupedBy'
            }
        else
            return
    }
}

PPINOTRules.prototype.init = function() {

    /**
     * Can shape be created on target container?
     * This function defines which elements may contain other elements
     */
    function canCreate(shape, target) {

        // only judge about PPINOT elements
        if (!isPPINOT(shape)) {
            return;
        }

        var allowedContainer = is(target, 'bpmn:Process') || is(target, 'bpmn:Participant') || is(target, 'bpmn:Collaboration');

        //In this case, we define that Ppi element can contain any PPINOT element
        if (isPPINOT(shape)) {
            allowedContainer = allowedContainer || is(target, 'PPINOT:Ppi');
        }

        // allow creation on processes
        return allowedContainer;
    }


    this.addRule('elements.move', HIGH_PRIORITY, function(context) {
        const { target, shapes } = context;
        let type;

        // Verificar si todos los elementos son del mismo tipo (PPINOT o BPMN)
        const allowed = reduce(shapes, (result, s) => {
            if (type === undefined) {
                type = isPPINOT(s);
            }

            if (type !== isPPINOT(s) || result === false) {
                return false;
            }

            return canCreate(s, target);
        }, undefined);

        // Rechazar si al menos un elemento no puede moverse
        return allowed;
    });

    this.addRule('shape.create', HIGH_PRIORITY, function(context) {
        const { target, shape } = context;
        return canCreate(shape, target);
    });

    this.addRule('shape.resize', HIGH_PRIORITY, function(context) {
        const { shape } = context;

        // Permitir redimensionar elementos de PPINOT
        if (isPPINOT(shape)) {
            return true;
        }
        return false; // Bloquear otros tipos
    });

    this.addRule('connection.create', HIGH_PRIORITY, function(context) {
        const { source, target, type } = context;
        return connect(source, target, type);
    });

    // Consolidación de reglas de reconexión
    this.addRule('connection.reconnect', HIGH_PRIORITY * 2, function(context) {
        const { connection, hover, source: originalSource, target: originalTarget } = context;

        // Determinar si es una reconexión inicial o final
        const source = hover || originalSource;
        const target = hover || originalTarget;

        return connect(source, target, connection.type);
    });


};

function nonExistingOrLabel(element) {
    return !element || isLabel(element);
}

PPINOTRules.prototype.canConnect = function(source, target, connection) {
    if (nonExistingOrLabel(source) || nonExistingOrLabel(target)) {
        return null;
    }
    return connect(source, target, connection.type)

}