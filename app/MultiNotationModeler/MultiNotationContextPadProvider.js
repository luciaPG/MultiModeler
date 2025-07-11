import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';
import PPINOTContextPadProvider from '../PPINOT-modeler/PPINOT/PPINOTContextPadProvider';
import { isRalphShape } from '../RALPH-modeler/RALph/Types';
import RALphContextPadProvider from '../RALPH-modeler/RALph/RALphContextPadProvider';

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


    this._ppinotProvider = injector.instantiate(PPINOTContextPadProvider);
    this._ralphProvider = injector.instantiate(RALphContextPadProvider);


    contextPad.registerProvider(this);
  }

  getContextPadEntries(element) {
    let entries = {};
    if (isPPINOTShape(element)) {
      return this._ppinotProvider.getContextPadEntries(element) || {};
    } else if (isRalphShape(element)) {
      return this._ralphProvider.getContextPadEntries(element) || {};
    } else {
      entries = super.getContextPadEntries(element) || {};
      // if (!entries.replace) {
      //   entries.replace = {
      //     group: 'edit',
      //     className: 'bpmn-icon-screw-wrench',
      //     title: this._translate('Replace'),
      //     action: {
      //       click: (event, elt) => {
      //         this._popupMenu.open(elt, 'replace', {
      //           x: event.x,
      //           y: event.y
      //         });
      //       }
      //     }
      //   };
      // }
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
