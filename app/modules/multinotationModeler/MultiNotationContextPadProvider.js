import { isPPINOTShape } from './notations/ppinot/Types';
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';
import PPINOTContextPadProvider from './notations/ppinot/PPINOTContextPadProvider';
import { isRalphShape } from './notations/ralph/Types';
import RALphContextPadProvider from './notations/ralph/RALphContextPadProvider';

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
      try {
        console.log('Getting context pad entries for BPMN element:', element.type, element.id);
        entries = super.getContextPadEntries(element) || {};
      } catch (error) {
        console.warn('BPMN ContextPad error caught for element:', element.type, element.id, 'Error:', error.message);
        // Provide minimal fallback entries for BPMN elements
        entries = {};
      }
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
