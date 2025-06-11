import { getLabel, setLabel } from './utils/LabelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { directEdit } from "./Types";

export default function PPINOTCustomTextEditor(eventBus, canvas, modeling) {
    this._eventBus = eventBus;
    this._canvas = canvas;
    this._modeling = modeling;
    this._activeEditor = null;
    
    const self = this;
    // High priority (1500) to intercept before bpmn-js DirectEditing
    eventBus.on('element.dblclick', 1500, function(event) {
        if (isAny(event.element, directEdit)) {
            event.stopPropagation();
            event.preventDefault();
            self.activateCustomEditor(event.element);
        }
    });
}

PPINOTCustomTextEditor.$inject = ['eventBus', 'canvas', 'modeling'];

PPINOTCustomTextEditor.prototype.activateCustomEditor = function(element) {
    if (this._activeEditor) {
        this.deactivateCustomEditor();
    }

    const existingText = getLabel(element) || '';
    const position = this._calculatePosition(element);
    const input = this._createInput(existingText, position);
    
    this._setupEventListeners(input);
    this._storeEditor(element, input, existingText);
    this._showInput(input);
};

PPINOTCustomTextEditor.prototype._calculatePosition = function(element) {
    const bbox = this._canvas.getAbsoluteBBox(element);
    const viewport = this._canvas.viewbox();
    const containerRect = this._canvas.getContainer().getBoundingClientRect();
    
    // Position input below element with proper viewport scaling
    return {
        x: (bbox.x - viewport.x) * viewport.scale + containerRect.left + bbox.width / 2 * viewport.scale,
        y: (bbox.y - viewport.y) * viewport.scale + containerRect.top + bbox.height * viewport.scale + 10
    };
};

PPINOTCustomTextEditor.prototype._createInput = function(text, position) {
    const input = document.createElement('input');
    input.type = 'text';
    input.value = text;
    
    const styles = {
        position: 'fixed',
        left: position.x + 'px',
        top: position.y + 'px',
        transform: 'translateX(-50%)',
        zIndex: '1000',
        padding: '6px 12px',
        border: '2px solid #1e90ff',
        borderRadius: '4px',
        fontSize: '13px',
        fontFamily: 'Arial, sans-serif',
        backgroundColor: 'white',
        minWidth: '120px',
        maxWidth: '300px',
        textAlign: 'center',
        outline: 'none',
        boxShadow: '0 2px 8px rgba(30, 144, 255, 0.3)'
    };
    
    Object.assign(input.style, styles);
    return input;
};

PPINOTCustomTextEditor.prototype._setupEventListeners = function(input) {
    const self = this;

    input.addEventListener('focus', () => {
        input.style.border = '2px solid #4169e1';
        input.style.boxShadow = '0 0 0 3px rgba(65, 105, 225, 0.2)';
    });
      input.addEventListener('blur', () => {
        input.style.border = '2px solid #1e90ff';
        input.style.boxShadow = '0 2px 8px rgba(30, 144, 255, 0.3)';
        
        // Delay to prevent conflicts with other events
        setTimeout(() => {
            if (self._activeEditor) {
                self.saveAndDeactivate();
            }
        }, 100);
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            self.saveAndDeactivate();
        } else if (e.key === 'Escape') {
            self.cancelAndDeactivate();
        }
    });
};

PPINOTCustomTextEditor.prototype._storeEditor = function(element, input, originalText) {
    this._activeEditor = { element, input, originalText };
};

PPINOTCustomTextEditor.prototype._showInput = function(input) {
    document.body.appendChild(input);
    input.focus();
    input.select();
};

PPINOTCustomTextEditor.prototype.saveAndDeactivate = function() {
    if (!this._activeEditor) return;
    
    const { element, input, originalText } = this._activeEditor;
    const newText = input.value || '';
    
    if (newText !== originalText) {
        this._updateElementText(element, newText);
    }
    
    this.deactivateCustomEditor();
};

PPINOTCustomTextEditor.prototype.cancelAndDeactivate = function() {
    this.deactivateCustomEditor();
};

PPINOTCustomTextEditor.prototype.deactivateCustomEditor = function() {
    if (!this._activeEditor) return;
    
    if (this._activeEditor.input && this._activeEditor.input.parentNode) {
        this._activeEditor.input.parentNode.removeChild(this._activeEditor.input);
    }
    
    this._activeEditor = null;
};

PPINOTCustomTextEditor.prototype._updateElementText = function(element, newText) {
    try {
        this._modeling.updateLabel(element, newText);
    } catch (error) {
        // Fallback to direct label setting
        setLabel(element, newText);
        this._eventBus.fire('element.changed', { element: element });
    }
};
