import { isPPINOTShape } from './notations/ppinot/Types';

export default class MultiNotationMenuProvider {
  constructor(popupMenu, injector, replaceMenuProvider, PPINOTReplaceMenuProvider) {
    this._popupMenu = popupMenu;
    this._injector = injector;
    this._bpmnReplace = replaceMenuProvider;
    this._ppinotReplace = PPINOTReplaceMenuProvider;
    popupMenu.registerProvider('replace', this);
  }

  getEntries(element) {
    let entries = [];
    if (this._bpmnReplace && typeof this._bpmnReplace.getEntries === 'function') {
      entries = this._bpmnReplace.getEntries(element) || [];
    }
    if (isPPINOTShape(element) && this._ppinotReplace && typeof this._ppinotReplace.getEntries === 'function') {
      const ppinotEntries = this._ppinotReplace.getEntries(element) || [];
      entries = entries.concat(ppinotEntries);
    }
    return entries;
  }
}

MultiNotationMenuProvider.$inject = [
  'popupMenu',
  'injector',
  'replaceMenuProvider',
  'PPINOTReplaceMenuProvider'
];