import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';
import ContextPadProvider from 'bpmn-js/lib/features/context-pad/ContextPadProvider';
import PPINOTContextPadProvider from '../PPINOT-modeler/PPINOT/PPINOTContextPadProvider';


/**
 * BaseContextPadProvider: preserves BPMN.js context-pad and delegates to PPINOT provider when needed.
 */
class BaseContextPadProvider extends ContextPadProvider {
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

    // Initialize PPINOT context-pad provider
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

    // Register this provider
    contextPad.registerProvider(this);
  }

  /**
   * Return context-pad entries:
   * - For PPINOT shapes: use PPINOT provider
   * - Otherwise: use BPMN entries, adding replace if missing
   */
  getContextPadEntries(element) {
    let entries = {};
    if (isPPINOTShape(element)) {
      console.log('PPINOT ContextPad entries:', this._ppinotProvider.getContextPadEntries(element));
      return this._ppinotProvider.getContextPadEntries(element) || {};
    } else if (!isPPINOTShape(element) && element.type !== 'label') {

      entries = super.getContextPadEntries(element) || {};
      console.log('BPMN ContextPad entries:', entries);
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

// Inject dependencies
BaseContextPadProvider.$inject = [
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

export default BaseContextPadProvider;
