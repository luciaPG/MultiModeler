import * as LabelUtil from './utils/LabelUtil';

function PPINOTLabelProvider(eventBus, injector) {
  console.log('PPINOTLabelProvider: Initializing PPINOT label provider');
  
  // Get the base label provider from the injector
  try {
    var baseLabelProvider = injector.get('baseLabelProvider', false);
    if (baseLabelProvider && baseLabelProvider.registerProvider) {
      baseLabelProvider.registerProvider(this);
      console.log('PPINOTLabelProvider: Registered with BaseLabelProvider');
    }
  } catch (e) {
    console.warn('PPINOTLabelProvider: Could not register with BaseLabelProvider:', e);
  }

  // Listen to element changes
  eventBus.on('element.changed', function(event) {
    const element = event.element;
    if (LabelUtil.isPPINOTElement(element)) {
      LabelUtil.updateLabel(element);
    }
  });

  // Required methods using LabelUtil
  this.canEdit = function(element) {
    return LabelUtil.isPPINOTElement(element);
  };

  this.getLabel = function(element) {
    if (LabelUtil.isPPINOTElement(element)) {
      return LabelUtil.getLabel(element);
    }
    return '';
  };

  this.setLabel = function(element, text) {
    if (LabelUtil.isPPINOTElement(element)) {
      return LabelUtil.setLabel(element, text);
    }
  };

  this.canSetLabel = function(element) {
    return LabelUtil.isPPINOTElement(element);
  };

  this.activate = function(element) {
    if (!LabelUtil.isPPINOTElement(element)) {
      return;
    }

    var text = LabelUtil.getLabel(element);
    if (text === undefined) {
      text = '';
    }

    var context = {
      text: text
    };

    var bounds = this.getEditingBBox(element);
    if (bounds) {
      Object.assign(context, bounds);
    }

    var options = {
      centerVertically: true,
      resizable: false
    };

    context.options = options;
    return context;
  };

  this.getEditingBBox = function(element) {
    if (!LabelUtil.isPPINOTElement(element)) {
      return null;
    }

    var bounds = {
      x: element.x,
      y: element.y,
      width: element.width,
      height: element.height
    };

    var style = {
      fontSize: '12px',
      lineHeight: 1.2,
      paddingTop: '5px',
      paddingBottom: '5px',
      paddingLeft: '5px',
      paddingRight: '5px',
      textAlign: 'center'
    };

    return { bounds: bounds, style: style };
  };

  this.update = function(element, newText) {
    if (LabelUtil.isPPINOTElement(element)) {
      return LabelUtil.setLabel(element, newText);
    }
  };
}

PPINOTLabelProvider.$inject = ['eventBus', 'injector'];

export default PPINOTLabelProvider;
