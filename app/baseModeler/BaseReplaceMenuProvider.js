import { isPPINOTShape } from '../PPINOT-modeler/PPINOT/Types';

export default class BaseReplaceMenuProvider {
  constructor(popupMenu, injector, replaceMenuProvider, PPINOTReplaceMenuProvider) {
    this._popupMenu = popupMenu;
    this._injector = injector;
    this._bpmnReplace = replaceMenuProvider; // provider base de bpmn-js
    this._ppinotReplace = PPINOTReplaceMenuProvider;
    popupMenu.registerProvider('replace', this);
  }

  getEntries(element) {
    let entries = [];
    // Usa el provider base de bpmn-js para obtener las entries estándar
    if (this._bpmnReplace && typeof this._bpmnReplace.getEntries === 'function') {
      entries = this._bpmnReplace.getEntries(element) || [];
    }
    // Si es PPINOT, añade las entries extra
    if (isPPINOTShape(element) && this._ppinotReplace && typeof this._ppinotReplace.getEntries === 'function') {
      const ppinotEntries = this._ppinotReplace.getEntries(element) || [];
      entries = entries.concat(ppinotEntries);
    }
    return entries;
  }
}

BaseReplaceMenuProvider.$inject = [
  'popupMenu',
  'injector',
  'replaceMenuProvider', // provider base de bpmn-js
  'PPINOTReplaceMenuProvider'
];