import { is } from 'bpmn-js/lib/util/ModelUtil';
import { filter } from 'min-dash';

export default function RALPHReplaceMenuProvider(
  popupMenu,
  modeling,
  moddle,
  bpmnReplace,
  rules,
  translate
) {
  this._popupMenu = popupMenu;
  this._modeling = modeling;
  this._moddle = moddle;
  this._bpmnReplace = bpmnReplace;
  this._rules = rules;
  this._translate = translate;

  this.register();
}

RALPHReplaceMenuProvider.$inject = [
  'popupMenu',
  'modeling',
  'moddle',
  'bpmnReplace',
  'rules',
  'translate'
];

RALPHReplaceMenuProvider.prototype.register = function() {
  this._popupMenu.registerProvider('ralph-replace', this);
};

RALPHReplaceMenuProvider.prototype.getEntries = function(element) {
  const businessObject = element.businessObject;

  if (!this._rules.allowed('shape.replace', { element: element })) {
    return [];
  }

  const entries = [];

  if (is(businessObject, 'ralph:Resource')) {
    entries.push({
      id: 'replace-with-resource-type',
      label: this._translate('Replace with Resource Type'),
      className: 'bpmn-icon-task',
      action: () => {
        this._bpmnReplace.replaceElement(element, { type: 'ralph:ResourceType' });
      }
    });
  }

  if (is(businessObject, 'ralph:ResourceType')) {
    entries.push({
      id: 'replace-with-resource',
      label: this._translate('Replace with Resource'),
      className: 'bpmn-icon-task',
      action: () => {
        this._bpmnReplace.replaceElement(element, { type: 'ralph:Resource' });
      }
    });
  }

  return entries;
}; 