import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';
import PPINOTContextPadProvider from '../PPINOT-modeler/PPINOT/PPINOTContextPadProvider';

class MultiNotationContextPadProvider extends ContextPadProvider {
  constructor(
    config,
    injector,
    eventBus,
    contextPad,
    modeling,
    elementFactory,
    connect,
    create,
    popupMenu,
    canvas,
    rules,
    translate,
    appendPreview
  ) {
    super(
      config,
      injector,
      eventBus,
      contextPad,
      modeling,
      elementFactory,
      connect,
      create,
      popupMenu,
      canvas,
      rules,
      translate,
      appendPreview
    );

    this._injector = injector;
    this._popupMenu = popupMenu;
    this._translate = translate;

    
    this._ppinotProvider = new PPINOTContextPadProvider(
      config,
      injector,
      contextPad,
      modeling,
      elementFactory,
      connect,
      create,
      popupMenu,
      canvas,
      rules,
      translate
    );


    contextPad.registerProvider(this);
  }

  getContextPadEntries(element) {
    let entries = {};
    if (isPPINOTShape(element)) {
      return this._ppinotProvider.getContextPadEntries(element) || {};
    } else if (!isPPINOTShape(element) && element.type !== 'label') {
      entries = super.getContextPadEntries(element) || {};
      if (!entries.replace) {
        entries.replace = {
          group: 'edit',
          className: 'bpmn-icon-screw-wrench',
          title: this._translate('Replace'),
          action: {
            click: (event, elt) => {
              this._popupMenu.open(elt, 'replace', {
                x: event.x,
                y: event.y
              });
            }
          }
        };
      }
      return entries;
    }
  }
}

MultiNotationContextPadProvider.$inject = [
  'config',
  'injector',
  'eventBus',
  'contextPad',
  'modeling',
  'elementFactory',
  'connect',
  'create',
  'popupMenu',
  'canvas',
  'rules',
  'translate',
  'appendPreview'
];

export default MultiNotationContextPadProvider;
