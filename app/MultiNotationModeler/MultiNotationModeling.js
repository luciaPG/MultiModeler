import Modeling from 'bpmn-js/lib/features/modeling/Modeling';
import PPINOTCreateConnectionHandler from '../PPINOT-modeler/PPINOT/handlers/PPINOTCreateConnectionHandler';
import RALphUpdateLabelHandler from '../RALPH-modeler/RALph/handlers/RALphUpdateLabelHandler';
import RALphCreateConnectionHandler from '../RALPH-modeler/RALph/handlers/RALphCreateConnectionHandler';

// Handler unificado para conexiones
class UnifiedCreateConnectionHandler {
  constructor(canvas, layouter) {
    this._canvas = canvas;
    this._layouter = layouter;
    this._ppinot = new PPINOTCreateConnectionHandler(canvas, layouter);
    this._ralph = new RALphCreateConnectionHandler(canvas, layouter);
  }

  execute(context) {
    const connectionType = (context.connection && context.connection.type) || context.type;
    
    // Detectar si es una conexión PPINOT o RALPH
    if (connectionType && connectionType.startsWith('PPINOT:')) {
      return this._ppinot.execute(context);
    } else if (connectionType && connectionType.startsWith('RALph:')) {
      return this._ralph.execute(context);
    } else {
      // Por defecto usar el handler de PPINOT para conexiones BPMN estándar
      return this._ppinot.execute(context);
    }
  }

  revert(context) {
    const connectionType = (context.connection && context.connection.type) || context.type;
    
    if (connectionType && connectionType.startsWith('PPINOT:')) {
      return this._ppinot.revert(context);
    } else if (connectionType && connectionType.startsWith('RALph:')) {
      return this._ralph.revert(context);
    } else {
      return this._ppinot.revert(context);
    }
  }
}

UnifiedCreateConnectionHandler.$inject = ['canvas', 'layouter'];

export default class MultiNotationModeling extends Modeling {
  getHandlers() {
    const handlers = super.getHandlers();

    // Solo añade el handler de labels específico de RALPH
    // PPINOT usa el handler por defecto de BPMN
    handlers['element.RALphUpdateLabel'] = RALphUpdateLabelHandler;

    // Handler unificado para conexiones
    handlers['connection.create'] = UnifiedCreateConnectionHandler;

    return handlers;
  }

  updateLabel(element, newLabel, newBounds, hints) {
    let command = 'element.updateLabel';
    
    // Solo RALPH tiene handler específico, PPINOT usa el por defecto
    if (element.type && element.type.startsWith('RALph:')) {
      command = 'element.RALphUpdateLabel';
    }
    
    this._commandStack.execute(command, {
      element,
      newLabel,
      newBounds,
      hints: hints || {}
    });
  }
}

MultiNotationModeling.$inject = [
  'eventBus',
  'elementFactory',
  'commandStack',
  'bpmnRules'
];