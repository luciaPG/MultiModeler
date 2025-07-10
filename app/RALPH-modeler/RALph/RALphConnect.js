import {
    getMid
} from 'diagram-js/lib/layout/LayoutUtil';

//this module allows to define connections

export default function RALphConnect(eventBus, dragging, modeling, rules) {

    // rules

    function canConnect(source, target, type) {
        return rules.allowed('connection.create', {
            source: source,
            target: target,
            type: type
        });
    }

    // event handlers

    eventBus.on('connect.hover', function(event) {
        var context = event.context,
            source = context.source,
            type = context.type,
            hover = event.hover,
            canExecute;

        canExecute = context.canExecute = canConnect(source, hover, type);

        // simply ignore hover
        if (canExecute === null) {
            return;
        }

        context.target = hover;
    });

    eventBus.on([ 'connect.out', 'connect.cleanup' ], function(event) {
        var context = event.context;

        context.target = null;
        context.canExecute = false;
    });

    eventBus.on('connect.end', function(event) {
        var context = event.context,
            source = context.source,
            sourcePosition = context.sourcePosition,
            elementFactory = context.elementFactory,
            target = context.target,
            targetPosition = {
                x: event.x,
                y: event.y
            },
            canExecute = context.canExecute || canConnect(source, target, context.type);

        if (!canExecute) {
            return false;
        }

        var attrs = null,
            hints = {
                connectionStart: sourcePosition,
                connectionEnd: targetPosition
            };

        if (typeof canExecute === 'object') {//here we define the connections that require to create automatically an element and one or two connections
            
             if(canExecute.type3){//if the return has type3 
                let shape = elementFactory.createShape({ type: 'RALph:DelegateTo' });//it is created the shape RALph:DelegateTo
                let pos = {
                    x: (sourcePosition.x + targetPosition.x)/2,
                    y: (sourcePosition.y + targetPosition.y)/2,
                }
                let newShape = modeling.appendShape(source, shape, pos, source.parent, {//the connection of type3 is linked to the previous shape
                    connection: { type: canExecute.type3}
                });

                hints = {
                    connectionStart: pos,
                    connectionEnd: targetPosition
                }
                attrs = { type: canExecute.type4}//the connection of type4 is also created
                modeling.connect(newShape, target, attrs, hints);
                return;

        }else
                attrs = canExecute;
        }
        if(!canExecute.type1)
            modeling.connect(source, target, attrs, hints);
    });


    // API

    /**
     * Start connect operation.
     *
     * @param {DOMEvent} event
     * @param {djs.model.Base} source
     * @param {Point} [sourcePosition]
     * @param {Boolean} [autoActivate=false]
     */
    this.start = function(event, source, sourcePosition, autoActivate) {
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        }

        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition
                }
            }
        });
    };

    this.RALphStart = function(event, source, type, elementFactory, autoActivate) {
        let sourcePosition = getMid(source);
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;

        }

        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition,
                    type: type,
                    elementFactory: elementFactory
                }
            }
        });
    };

    this.RALphStart2 = function(event, source, type, elementFactory, sourcePosition, autoActivate) {
        if (typeof sourcePosition !== 'object') {
            autoActivate = sourcePosition;
            sourcePosition = getMid(source);
        }
        dragging.init(event, 'connect', {
            autoActivate: autoActivate,
            data: {
                shape: source,
                context: {
                    source: source,
                    sourcePosition: sourcePosition,
                    type: type,
                    elementFactory: elementFactory
                }
            }
        });
    };
}

RALphConnect.$inject = [
    'eventBus',
    'dragging',
    'modeling',
    'rules'
];
