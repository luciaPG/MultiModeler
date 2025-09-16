import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import {is} from "bpmn-js/lib/util/ModelUtil";
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';

import {label} from "./Types";

import RALphUpdateLabelHandler from "./handlers/RALphUpdateLabelHandler";


//this module defines how to update labels

export default class RALphModeling extends Modeling {
    constructor(eventBus, elementFactory, commandStack,
                bpmnRules) {
        super(eventBus, elementFactory, commandStack, bpmnRules);
    }

    getHandlers() {
        let handlers = super.getHandlers();
        handlers['element.customUpdateLabel'] = RALphUpdateLabelHandler;
       


        return handlers;
    }

    updateLabel(element, newLabel, newBounds, hints) {
        let command = 'element.updateLabel'
        if(isAny(element, label) || element.type === 'label')
            command = 'element.customUpdateLabel'

        this._commandStack.execute(command, {
            element: element,
            newLabel: newLabel,
            newBounds: newBounds,
            hints: hints || {}
        });
    }

   
};

RALphModeling.$inject = [
    'eventBus',
    'elementFactory',
    'commandStack',
    'bpmnRules'
];