import {
    assign
} from 'min-dash';

import { is } from 'bpmn-js/lib/util/ModelUtil';
import { isAny } from 'bpmn-js/lib/features/modeling/util/ModelingUtil';
import { isExpanded } from 'bpmn-js/lib/util/DiUtil';

import {
    getLabel,
    getExternalLabelMid,
    isLabelExternal,
    hasExternalLabel,
    isLabel
} from './utils/LabelUtil';

import { directEdit, label} from "./Types";

import LabelEditingProvider from "bpmn-js/lib/features/label-editing/LabelEditingProvider";

//this module defines how the edition of labels works, for instance, adding the possibility to create default labels

export default function RALphLabelEditingProvider(
    eventBus, canvas, directEditing,
    modeling, resizeHandles, textRenderer, elementFactory) {

    // Override the default label editing behavior for RALPH elements
    directEditing.registerProvider(this);
    
    // Private state instead of window globals
    this.activeOverlay = null;
    this.activeOverlayElement = null;

    // Bloqueo global de edición directa para elementos no editables
    eventBus.on('directEditing.activate', 10000, function(event) {
        const element = event && event.element;
        const nonEditableElements = [
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        const isDualLabel = element && element.type && dualLabelElements.includes(element.type);
        const isInstance = element && element.type && element.type.toLowerCase().includes('instance');
        const isGateway = element && element.type && element.type.toLowerCase().includes('gateway');
        const isNonEditable = element && nonEditableElements.includes(element.type);
        if (
            element &&
            !isDualLabel &&
            (
                isNonEditable ||
                isGateway
            ) &&
            !isInstance
        ) {
            event.preventDefault();
            event.stopPropagation();
            setTimeout(() => {
                document.querySelectorAll('input[type="text"]').forEach(input => {
                    if (input.parentElement) {
                        try { input.parentElement.removeChild(input); } catch (e) {}
                    }
                });
            }, 10);
            return false;
        }
    });

    // Handle double-click events for RALPH elements with dual labels
    eventBus.on('element.dblclick', (event) => {
        const element = event.element;
        
        // Define elements that should NOT be editable
        const nonEditableElements = [
            // History elements (except instance)
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            // Gateways (AND/OR)
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        
        // Only handle RALPH elements with dual labels (reports/delegates) and exclude non-editable elements
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        // Check if element should be editable
        const isEditable = element.type && 
                          element.type.startsWith('RALph:') && 
                          dualLabelElements.includes(element.type) &&
                          !nonEditableElements.includes(element.type) &&
                          !element.type.includes('Gateway');
        
        if (isEditable) {
            event.preventDefault();
            event.stopPropagation();
            
            // Verificar que tenemos el contexto correcto
            if (!this || typeof this.activeOverlay === 'undefined') {
                console.warn('RALphLabelEditingProvider: contexto incorrecto, abortando edición');
                return;
            }
            
            // Determine if clicking on internal or external label
            const clickedElement = event.originalEvent.target;
            const isInternalLabel = clickedElement.classList.contains('djs-label') && 
                                  clickedElement.parentElement === element;
            const isExternalLabel = clickedElement.classList.contains('djs-label') && 
                                  clickedElement.parentElement !== element;
            
            if (isInternalLabel || isExternalLabel) {
                this.activateDirectEdit(element, isInternalLabel ? 'internal' : 'external');
            } else {
                // Clicking on the element itself - edit internal label
                this.activateDirectEdit(element, 'internal');
            }
        }
    });

    // Override the activate method to handle dual-label elements
    this.activate = function(element, context) {
        // Define elements that should NOT be editable
        const nonEditableElements = [
            // History elements (except instance)
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            // Gateways (AND/OR)
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        // Check if element should be editable
        const isEditable = element.type && 
                          element.type.startsWith('RALph:') && 
                          dualLabelElements.includes(element.type) &&
                          !nonEditableElements.includes(element.type) &&
                          !element.type.includes('Gateway');
        
        if (isEditable) {
            // For RALPH elements with dual labels, we need to determine which label to edit
            const labelType = context && context.labelType ? context.labelType : 'internal';
            return activateDirectEdit(element, labelType);
        }
        
        // For other elements, don't handle them
        return false;
    };

    // Override the getValue method
    this.getValue = function(element) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            // For internal labels, return the text property
            if (element.businessObject && element.businessObject.text !== undefined) {
                return element.businessObject.text || '';
            }
            // For external labels, return the name property
            if (element.businessObject && element.businessObject.name !== undefined) {
                return element.businessObject.name || '';
            }
            return '';
        }
        
        // Default behavior
        return '';
    };

    // Override the setValue method
    this.setValue = function(element, value) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            // For internal labels, set the text property
            if (element.businessObject) {
                element.businessObject.text = value;
            }
            // For external labels, set the name property
            if (element.businessObject) {
                element.businessObject.name = value;
            }
        }
        // Don't call default behavior to avoid recursion
    };

    // Override the isActive method
    this.isActive = function(element) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            return this.activeOverlay !== null;
        }
        return false;
    };

    // Override the complete method
    this.complete = function(element, context) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            // Use custom completion for RALPH elements with dual labels
            return completeDirectEdit(element, context);
        }
        
        // Default behavior
        return true;
    };

    // Override the cancel method
    this.cancel = function(element) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            // Use custom cancellation for RALPH elements with dual labels
            return cancelDirectEdit(element);
        }
        
        // Default behavior
        return true;
    };

    // Override the getEditingContext method
    this.getEditingContext = function(element) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (element.type && element.type.startsWith('RALph:') && dualLabelElements.includes(element.type)) {
            // Return custom context for RALPH elements with dual labels
            return getRALPHEditingContext(element);
        }
        
        // Default behavior
        return null;
    };

    // Custom activation for RALPH elements with dual labels
    this.activateDirectEdit = function(element, labelType) {
        // Define elements that should NOT be editable
        const nonEditableElements = [
            // History elements (except instance)
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            // Gateways (AND/OR)
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        // Check if element should be editable
        const isEditable = element && 
                          element.businessObject && 
                          element.type && 
                          element.type.startsWith('RALph:') && 
                          dualLabelElements.includes(element.type) &&
                          !nonEditableElements.includes(element.type);
        
        if (!isEditable) {
            return false;
        }

        // Find the existing label element to edit directly
        const graphics = canvas.getGraphics(element);
        let labelElement = null;
        
        if (labelType === 'external') {
            // Find external label
            const externalLabels = graphics.querySelectorAll('.djs-label');
            for (let label of externalLabels) {
                if (label.parentElement !== graphics) {
                    labelElement = label;
                    break;
                }
            }
        } else {
            // Find internal label
            const internalLabels = graphics.querySelectorAll('.djs-label');
            for (let label of internalLabels) {
                if (label.parentElement === graphics) {
                    labelElement = label;
                    break;
                }
            }
        }
        
        if (labelElement) {
            // Edit directly on the existing label
            this.createDirectLabelEditor(element, labelElement, labelType);
            return true;
        } else {
            // Fallback to overlay method
            this.createCustomEditor(element, labelType);
            return true;
        }
    }

    // Create direct editor on existing label
    this.createDirectLabelEditor = function(element, labelElement, labelType) {
        const nonEditableElements = [
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        if (
            nonEditableElements.includes(element.type) ||
            element.type.includes('Gateway')
        ) {
            return;
        }
        // Remove any existing overlay
        if (this.activeOverlay) {
            this.activeOverlay.remove();
        }

        // Store original content and hide it
        const originalContent = labelElement.innerHTML;
        labelElement.style.visibility = 'hidden';
        
        // Create input that overlays exactly on the label
        const input = document.createElement('input');
        input.type = 'text';
        input.style.position = 'absolute';
        input.style.left = (labelElement.getBoundingClientRect().left - canvas.getContainer().getBoundingClientRect().left - 2) + 'px';
        input.style.top = (labelElement.getBoundingClientRect().top - canvas.getContainer().getBoundingClientRect().top - 1) + 'px'; // Ajusta -1 o -2 si hace falta
        input.style.width = labelElement.offsetWidth + 'px';
        input.style.height = labelElement.offsetHeight + 'px';
        input.style.lineHeight = labelElement.offsetHeight + 'px';
        input.style.fontSize = '12px';
        input.style.textAlign = 'center';
        input.style.backgroundColor = 'white';
        input.style.opacity = '1';
        input.style.zIndex = '2000';
        input.style.boxShadow = '0 0 2px #0002';
        input.style.boxSizing = 'border-box';
        input.style.padding = '0';
        input.style.margin = '0';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.borderRadius = '0px';
        input.style.fontFamily = 'inherit';
        input.style.pointerEvents = 'auto';
        
        // Position input exactly over the label
        const labelRect = labelElement.getBoundingClientRect();
        const canvasRect = canvas.getContainer().getBoundingClientRect();
        
        // Set initial value
        let initialValue = '';
        if (labelType === 'external') {
            initialValue = element.businessObject.name || '';
        } else {
            initialValue = element.businessObject.text || '';
        }
        input.value = initialValue;
        
        // Add input to canvas container
        canvas.getContainer().appendChild(input);
        this.activeOverlay = input;
        this.activeOverlayElement = element;
        
        // Focus and select
        input.focus();
        input.select();
        
        // Event handlers
        let hasFinished = false;
        let isFinishing = false;
        let enterPressed = false;
        let processingKeyEvent = false;
        let processingDocumentClick = false;
        let processingFinishCall = false;
        let lastInputValue = '';
        let inputValueHistory = [];
        
        // Input value tracking
        input.addEventListener('input', function(e) {
            const newValue = e.target.value;
            lastInputValue = newValue;
            inputValueHistory.push(newValue);
        });
        
        // Keydown handler
        input.addEventListener('keydown', function(e) {
            processingKeyEvent = true;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                enterPressed = true;
                
                const currentValue = e.target.value;
                const lastValue = lastInputValue;
                const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                const finalValue = currentValue || lastValue || lastHistoryValue || '';
                
                finishDirectEdit(true, finalValue);
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                finishDirectEdit(false);
                return false;
            }
            
            setTimeout(() => {
                processingKeyEvent = false;
            }, 100);
        });
        
        // Document click handler
        const onDocumentClick = (e) => {
            if (!input.contains(e.target)) {
                if (processingDocumentClick || processingFinishCall || hasFinished) {
                    return;
                }

                processingDocumentClick = true;
                
                const currentValue = input && input.value ? input.value : '';
                const lastValue = lastInputValue;
                const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                const finalValue = currentValue || lastValue || lastHistoryValue || '';
                
                finishDirectEdit(true, finalValue);
                document.removeEventListener('click', onDocumentClick);
            }
        };
        
        document.addEventListener('click', onDocumentClick);
        
        // Blur handler
        input.addEventListener('blur', function(e) {
            if (enterPressed) {
                return;
            }

            setTimeout(() => {
                if (this.activeOverlay && !isFinishing && !enterPressed && !processingKeyEvent && !processingDocumentClick && !processingFinishCall && !hasFinished) {
                    const activeElement = document.activeElement;
                    if (!input.contains(activeElement)) {
                        const currentValue = input && input.value ? input.value : '';
                        const lastValue = lastInputValue;
                        const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                        const finalValue = currentValue || lastValue || lastHistoryValue || '';
                        
                        finishDirectEdit(true, finalValue);
                    }
                }
            }, 100);
        });
        
        // Finish editing function
        function finishDirectEdit(save = true, capturedValue = null) {
            if (capturedValue && capturedValue.trim() && !hasFinished && !processingFinishCall) {
                processingFinishCall = true;
            } else if (!this.activeOverlay || isFinishing || hasFinished || processingFinishCall) {
                return;
            } else {
                processingFinishCall = true;
            }
            
            let inputValue = capturedValue;
            
            if (inputValue === null || inputValue === undefined || inputValue === '') {
                if (input && input.value !== undefined) {
                    const inputValue1 = input.value;
                    const inputValue2 = input.getAttribute('value');
                    const inputValue3 = input.defaultValue;
                    inputValue = inputValue1 || inputValue2 || inputValue3 || '';
                } else {
                    inputValue = '';
                }
                
                if (!inputValue && typeof lastInputValue !== 'undefined' && lastInputValue) {
                    inputValue = lastInputValue;
                }
                
                if (!inputValue && typeof inputValueHistory !== 'undefined' && inputValueHistory.length > 0) {
                    inputValue = inputValueHistory[inputValueHistory.length - 1];
                }
            }
            
            function finishEditing(save = true) {
                if (hasFinished || isFinishing) {
                    return;
                }
                
                isFinishing = true;
                hasFinished = true;
                
                // Remove input
                if (this.activeOverlay) {
                    this.activeOverlay.remove();
                    this.activeOverlay = null;
                }
                this.activeOverlayElement = null;
                
                // Restore label visibility
                labelElement.style.visibility = 'visible';
                
                if (save && inputValue !== null && inputValue !== undefined) {
                    // Update the model
                    if (labelType === 'external') {
                        element.businessObject.name = inputValue;
                    } else {
                        element.businessObject.text = inputValue;
                    }
                    
                    // Update the visual label
                    updateVisualText(element, inputValue);
                }
                
                // Trigger modeling update
                modeling.updateProperties(element, {});
            }
            
            finishEditing(save);
        }
    }

    // Custom completion for RALPH elements
    function completeDirectEdit(element, context) {
        // This will be handled by the custom editor
        return true;
    }

    // Custom cancellation for RALPH elements
    function cancelDirectEdit(element) {
        // This will be handled by the custom editor
        return true;
    }

    // Get editing context for RALPH elements with dual labels
    function getRALPHEditingContext(element) {
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        
        if (!dualLabelElements.includes(element.type)) {
            return null;
        }
        
        return {
            element: element,
            labelType: 'internal' // Default to internal label
        };
    }

    // Create a custom editor for RALPH elements with dual labels
    this.createCustomEditor = function(element, labelType) {
        const nonEditableElements = [
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        if (
            nonEditableElements.includes(element.type) ||
            element.type.includes('Gateway')
        ) {
            return;
        }
        // Remove any existing overlay
        if (this.activeOverlay) {
            this.activeOverlay.remove();
        }

        // Create overlay
        const overlay = document.createElement('div');
        overlay.style.position = 'absolute';
        overlay.style.zIndex = '4000';
        overlay.style.backgroundColor = 'white';
        overlay.style.border = 'none';
        overlay.style.fontSize = '12px';
        overlay.style.minWidth = '80px';
        overlay.style.maxWidth = '80px';
        overlay.style.boxShadow = 'none';
        overlay.style.outline = 'none';
        overlay.style.border = '1px solidrgb(184, 184, 184)';
        
        // Create input
        const input = document.createElement('input');
        input.type = 'text';
        input.style.border = 'none';
        input.style.outline = 'none';
        input.style.width = '100%';
        input.style.fontSize = '12px';
        input.style.padding = '0px';
        input.style.margin = '0px';
        input.style.marginLeft = '-15px';
        input.style.backgroundColor = 'white'; // Fondo blanco opaco
        input.style.opacity = '1';
        input.style.zIndex = '2000';
        input.style.boxShadow = '0 0 2px #0002';
        input.style.borderRadius = '0px';
        input.style.fontFamily = 'inherit';
        input.style.textAlign = 'center';
        
        // Set initial value
        let initialValue = '';
        if (labelType === 'external') {
            initialValue = element.businessObject.name || '';
        } else {
            initialValue = element.businessObject.text || '';
        }
        input.value = initialValue;
        
        overlay.appendChild(input);
        document.body.appendChild(overlay);
        
        // Position overlay
        const elementRect = canvas.getGraphics(element).getBoundingClientRect();
        const canvasRect = canvas.getContainer().getBoundingClientRect();
        
        let left, top;
        if (labelType === 'external') {
            // Position for external label - centrado horizontalmente, ligeramente desplazado para evitar overlap
            left = elementRect.left - canvasRect.left + elementRect.width / 2;
            top = elementRect.bottom - canvasRect.top + 8;
        } else {
            // Position for internal label - centrado sobre el elemento, ligeramente ajustado en altura
            left = elementRect.left - canvasRect.left + elementRect.width / 2;
            top = elementRect.top - canvasRect.top + elementRect.height / 2 - 2;
        }
        
        // Centrar el overlay sobre el elemento con dimensiones más pequeñas
        const overlayWidth = 45; // Tamaño fijo más pequeño
        const overlayHeight = 12; // Altura fija más pequeña
        overlay.style.left = (left - overlayWidth / 2) + 'px';
        overlay.style.top = (top - overlayHeight / 2) + 'px';
        overlay.style.width = overlayWidth + 'px';
        overlay.style.height = overlayHeight + 'px';
        
        // Focus input
        input.focus();
        input.select();
        
        // Store overlay reference
        this.activeOverlay = overlay;
        this.activeOverlayElement = element;
        
        // Event handlers
        let hasFinished = false;
        let isFinishing = false;
        let enterPressed = false;
        let processingKeyEvent = false;
        let processingDocumentClick = false;
        let processingFinishCall = false;
        let lastInputValue = '';
        let inputValueHistory = [];
        
        // Input value tracking
        input.addEventListener('input', function(e) {
            const newValue = e.target.value;
            lastInputValue = newValue;
            inputValueHistory.push(newValue);
        });
        
        // Keydown handler
        input.addEventListener('keydown', function(e) {
            processingKeyEvent = true;
            
            if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                enterPressed = true;
                
                const currentValue = e.target.value;
                const lastValue = lastInputValue;
                const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                const finalValue = currentValue || lastValue || lastHistoryValue || '';
                
                finishEditingWithValue(true, finalValue);
                return false;
            } else if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                e.stopImmediatePropagation();
                finishEditing(false);
                return false;
            }
            
            setTimeout(() => {
                processingKeyEvent = false;
            }, 100);
        });
        
        // Document click handler
        const onDocumentClick2 = (e) => {
            if (!overlay.contains(e.target)) {
                if (processingDocumentClick || processingFinishCall || hasFinished) {
            return;
        }

                processingDocumentClick = true;
                
                const currentValue = input && input.value ? input.value : '';
                const lastValue = lastInputValue;
                const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                const finalValue = currentValue || lastValue || lastHistoryValue || '';
                
                finishEditingWithValue(true, finalValue);
                document.removeEventListener('click', onDocumentClick2);
            }
        };
        
        document.addEventListener('click', onDocumentClick2);
        
        // Blur handler
        input.addEventListener('blur', function(e) {
            if (enterPressed) {
            return;
        }

            setTimeout(() => {
                if (this.activeOverlay && !isFinishing && !enterPressed && !processingKeyEvent && !processingDocumentClick && !processingFinishCall && !hasFinished) {
                    const activeElement = document.activeElement;
                    if (!overlay.contains(activeElement)) {
                        const currentValue = input && input.value ? input.value : '';
                        const lastValue = lastInputValue;
                        const lastHistoryValue = inputValueHistory.length > 0 ? inputValueHistory[inputValueHistory.length - 1] : '';
                        const finalValue = currentValue || lastValue || lastHistoryValue || '';
                        
                        finishEditingWithValue(true, finalValue);
                    }
                }
            }, 100);
        });
        
        // Finish editing function
        const finishEditingWithValue = (save = true, capturedValue = null) => {
            if (capturedValue && capturedValue.trim() && !hasFinished && !processingFinishCall) {
                processingFinishCall = true;
            } else if (!this.activeOverlay || isFinishing || hasFinished || processingFinishCall) {
                return;
            } else {
                processingFinishCall = true;
            }
            
            let inputValue = capturedValue;
            
            if (inputValue === null || inputValue === undefined || inputValue === '') {
                if (input && input.value !== undefined) {
                    const inputValue1 = input.value;
                    const inputValue2 = input.getAttribute('value');
                    const inputValue3 = input.defaultValue;
                    inputValue = inputValue1 || inputValue2 || inputValue3 || '';
                } else {
                    inputValue = '';
                }
                
                if (!inputValue && typeof lastInputValue !== 'undefined' && lastInputValue) {
                    inputValue = lastInputValue;
                }
                
                if (!inputValue && typeof inputValueHistory !== 'undefined' && inputValueHistory.length > 0) {
                    inputValue = inputValueHistory[inputValueHistory.length - 1];
                }
            }
            
            const finishEditing = (save = true) => {
                return finishEditingWithValue(save, null);
            };
            
            isFinishing = true;
            enterPressed = false;
            processingKeyEvent = false;
            processingDocumentClick = false;
            
            if (save) {
                const newText = inputValue.trim();
                
                if (labelType === 'external') {
                    if (!element.businessObject) {
                        element.businessObject = { $type: 'bpmn:Label' };
                    }
                    element.businessObject.name = newText;
                    
                    if (element.labelTarget && !element.labelTarget.businessObject) {
                        element.labelTarget.businessObject = {};
                    }
                    if (element.labelTarget) {
                        element.labelTarget.businessObject.name = newText;
                    }
                } else {
                    if (!element.businessObject) {
                        element.businessObject = {};
                    }
                    
                    if (!element.businessObject.$type) {
                        element.businessObject.$type = element.type;
                    }
                    
                    element.businessObject.text = newText;
                    
                    setTimeout(() => {
                        updateVisualText(element, newText);
                    }, 50);
                    
                    if (element.businessObject) {
                        element.businessObject.text = newText;
                    }
                }
                
                try {
                    eventBus.fire('element.changed', { element: element });
                    if (element.labelTarget) {
                        eventBus.fire('element.changed', { element: element.labelTarget });
                    }
                } catch (error) {
                    // Silent error handling
                }
            }
            
            hasFinished = true;
            if (this.activeOverlay) {
                this.activeOverlay.remove();
                this.activeOverlay = null;
            }
            isFinishing = false;
            processingFinishCall = false;
        }
    }

    // Update visual text directly
    function updateVisualText(element, newText) {
        const graphics = canvas.getGraphics(element);
        if (!graphics) {
            return;
        }
        
        const textElements = graphics.querySelectorAll('text');
        
        if (textElements.length > 0) {
            const textElement = textElements[0];
            textElement.textContent = newText;
            
            if (newText) {
                textElement.setAttribute('fill', '#000000');
            } else {
                textElement.setAttribute('fill', '#CCCCCC');
            }
            
            try {
                eventBus.fire('element.changed', { element: element });
            } catch (error) {
                // Silent error handling
            }
        } else {
            if (modeling && modeling.updateProperties) {
                try {
                    modeling.updateProperties(element, { text: newText });
                } catch (error) {
                    // Silent error handling
                }
            }
        }
    }

    // Helper para saber si un elemento es no editable
    function isNonEditable(element) {
        if (!element) {
            return true;
        }
        const nonEditableElements = [
            'RALph:history',
            'RALph:historyStart',
            'RALph:historyEnd',
            'bpmn:ExclusiveGateway',
            'bpmn:InclusiveGateway',
            'bpmn:ParallelGateway',
            'bpmn:ComplexGateway',
            'bpmn:EventBasedGateway'
        ];
        const dualLabelElements = [
            'RALph:reportsDirectly',
            'RALph:reportsTransitively', 
            'RALph:delegatesDirectly',
            'RALph:delegatesTransitively'
        ];
        if (!element || !element.type) return true;
        if (dualLabelElements.includes(element.type)) return false;
        if (element.type.toLowerCase().includes('instance')) return false;
        return nonEditableElements.includes(element.type) || element.type.includes('Gateway');
    }

    // Observador global para eliminar inputs de edición no permitidos SOLO si el elemento es no editable
    const observer = new MutationObserver(() => {
        document.querySelectorAll('input[type="text"]').forEach(input => {
            const activeElement = this.activeOverlayElement;
            
            // Solo eliminar inputs que estén dentro del contexto de RALph/BPMN
            // No afectar inputs de la tabla RASCI u otros paneles
            const isRasciInput = input.classList.contains('role-edit-input') || 
                               input.closest('#matrix-container') ||
                               input.closest('.rasci-matrix') ||
                               input.closest('#rasci-panel') ||
                               input.closest('[id*="rasci"]') ||
                               input.closest('[class*="rasci"]');
            
            // Solo proceder si NO es un input de RASCI y hay un elemento no editable
            if (!isRasciInput && activeElement && isNonEditable(activeElement)) {
                if (input.parentElement) {
                    try { input.parentElement.removeChild(input); } catch (e) {}
                }
            }
        });
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

RALphLabelEditingProvider.$inject = [
    'eventBus',
    'canvas',
    'directEditing',
    'modeling',
    'resizeHandles',
    'textRenderer',
    'elementFactory'
];

// Override the default label editing provider for RALPH elements
RALphLabelEditingProvider.prototype.canActivate = function(element) {
    // Block history elements that should not be editable
    const historyElementsNoEdit = [
        'RALph:History-Same',
        'RALph:History-Any',
        'RALph:History-Any-Red',
        'RALph:History-Any-Green',
        'RALph:History-Same-Green',
        'RALph:History-Same-Red'
    ];
    
    // Allow editing for history instance elements
    const historyInstanceElements = [
        'RALph:History-AnyInstanceInTime-Green',
        'RALph:History-AnyInstanceInTime-Red'
    ];
    
    if (isAny(element, historyElementsNoEdit)) {
        return false;
    }
    
    // Explicitly allow editing for history instance elements
    if (isAny(element, historyInstanceElements)) {
        return true;
    }
    
    // Allow editing for dual label elements
    const dualLabelElements = [
      'RALph:reportsDirectly',
      'RALph:reportsTransitively', 
      'RALph:delegatesDirectly',
      'RALph:delegatesTransitively'
    ];
    
    if (dualLabelElements.includes(element.type)) {
        return true;
    }
    
    // Allow editing for external labels of dual elements
    if (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type)) {
        return true;
    }
    
    // Allow editing for other RALPH elements that should be editable
    return directEdit.includes(element.type);
};

/**
 * Activate direct editing for activities and text annotations.
 *
 * @param  {djs.model.Base} element
 *
 * @return {Object} an object with properties bounds (position and size), text and options
 */
RALphLabelEditingProvider.prototype.activate = function(element) {
    // Block editing for history elements that are not "instance" types
    if (isAny(element, this._historyElementsNoEdit)) {
        return;
    }
    
    // Allow editing for history instance elements
    const historyInstanceElements = [
        'RALph:History-AnyInstanceInTime-Green',
        'RALph:History-AnyInstanceInTime-Red'
    ];
    
    if (isAny(element, historyInstanceElements)) {
        // Continue with activation for these elements
    }

    // Para elementos con dos etiquetas, determinar qué texto mostrar
    const dualLabelElements = [
      'RALph:reportsDirectly',
      'RALph:reportsTransitively', 
      'RALph:delegatesDirectly',
      'RALph:delegatesTransitively'
    ];
    
    let text;
    
    // Si es un label externo de un elemento con dos etiquetas
    if (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type)) {
      text = element.businessObject ? element.businessObject.name || '' : '';
    } 
    // Si es el elemento principal de un elemento con dos etiquetas
    else if (dualLabelElements.includes(element.type)) {
      // Para elementos con dos etiquetas, SIEMPRE editar la etiqueta interna cuando se hace doble click en la forma
      text = element.businessObject ? element.businessObject.text || '' : '';
    }
    // Para otros elementos, usar la función getLabel normal
    else {
      text = getLabel(element);
      
      // CUSTOM
      if(isAny(element, label) && !text)
          text = '';
      //END_CUSTOM
    }

    if (text === undefined) {
        return;
    }

    var context = {
        text: text
    };

    // bounds
    var bounds = this.getEditingBBox(element);

    assign(context, bounds);

    var options = {};

    // tasks
    if (
        isAny(element, [
            'bpmn:Task',
            'bpmn:Participant',
            'bpmn:Lane',
            'bpmn:CallActivity',
            "RALph:ResourceArc"
            //CUSTOM
            //'RALph:resource' // interni?
        ]) ||
        isCollapsedSubProcess(element)
    ) {
        assign(options, {
            centerVertically: true
        });
    }

    // external labels
    if (isLabelExternal(element)) {
        assign(options, {
            autoResize: true
        });
    }

    // text annotations
    if (is(element, 'bpmn:TextAnnotation')) {
        assign(options, {
            resizable: true,
            autoResize: true
        });
    }

    assign(context, {
        options: options
    });

    return context;
};


/**
 * Get the editing bounding box based on the element's size and position
 *
 * @param  {djs.model.Base} element
 *
 * @return {Object} an object containing information about position
 *                  and size (fixed or minimum and/or maximum)
 */
RALphLabelEditingProvider.prototype.getEditingBBox = function(element) {
    var canvas = this._canvas;

    var target = element.label || element;

    var bbox = canvas.getAbsoluteBBox(target);
    var mid = {
        x: bbox.x + bbox.width / 2,
        y: bbox.y + bbox.height / 2
    };

    // default position
    var bounds = { x: bbox.x, y: bbox.y };

    var zoom = canvas.zoom();

    var defaultStyle = this._textRenderer.getDefaultStyle(),
        externalStyle = this._textRenderer.getExternalStyle();

    // take zoom into account
    var externalFontSize = externalStyle.fontSize * zoom,
        externalLineHeight = externalStyle.lineHeight,
        defaultFontSize = defaultStyle.fontSize * zoom,
        defaultLineHeight = defaultStyle.lineHeight;

    var style = {
        fontFamily: this._textRenderer.getDefaultStyle().fontFamily,
        fontWeight: this._textRenderer.getDefaultStyle().fontWeight
    };

    // adjust for expanded pools AND lanes
    if (is(element, 'bpmn:Lane') || isExpandedPool(element)) {

        assign(bounds, {
            width: bbox.height,
            height: 30 * zoom,
            x: bbox.x - bbox.height / 2 + (15 * zoom),
            y: mid.y - (30 * zoom) / 2
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px',
            transform: 'rotate(-90deg)'
        });
    }


    // internal labels for tasks and collapsed call activities,
    // sub processes and participants
    if (isAny(element, [ 'bpmn:Task', 'bpmn:CallActivity', 'RALph:TimeSlot','RALph:nyanCat','RALph:Person']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {

        assign(bounds, {
            width: bbox.width,
            height: bbox.height,
            
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px'
        });
    }

    // Para elementos con dos etiquetas (reports/delegates)
    const dualLabelElements = [
      'RALph:reportsDirectly',
      'RALph:reportsTransitively', 
      'RALph:delegatesDirectly',
      'RALph:delegatesTransitively'
    ];
    
    if (isAny(element, dualLabelElements) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {
        
        // Si es un label externo, usar posición externa
        if (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type)) {
            assign(bounds, {
                width: 90 * zoom,
                height: bbox.height + (7 * zoom) + (4 * zoom),
                x: mid.x - (90 * zoom) / 2,
                y: bbox.y - (7 * zoom)
            });
            
            assign(style, {
                fontSize: externalFontSize + 'px',
                lineHeight: externalLineHeight,
                paddingTop: (7 * zoom) + 'px',
                paddingBottom: (4 * zoom) + 'px'
            });
        } 
        else if (dualLabelElements.includes(element.type)) {
            assign(bounds, {
                width: bbox.width * 0.8,
                height: bbox.height * 0.6,
                x: mid.x - (bbox.width * 0.8) / 2,
                y: mid.y - (bbox.height * 0.6) / 2
            });
            
            assign(bounds, {
                width: bbox.width * 0.8,
                height: bbox.height * 0.6,
                x: mid.x - (bbox.width * 0.8) / 2,
                y: mid.y - (bbox.height * 0.6) / 2
            });
            
            assign(style, {
                fontSize: defaultFontSize + 'px',
                lineHeight: defaultLineHeight,
                paddingTop: (7 * zoom) + 'px',
                paddingBottom: (7 * zoom) + 'px',
                paddingLeft: (5 * zoom) + 'px',
                paddingRight: (5 * zoom) + 'px',
                textAlign: 'center'
            });
        }
    }

    if (isAny(element, ['RALph:History-AnyInstanceInTime-Green','RALph:History-AnyInstanceInTime-Red']) ||
        isCollapsedPool(element) ||
        isCollapsedSubProcess(element)) {
           
        assign(bounds, {
            width:50,
            height:30,
            x: (mid.x-25),
            y: (mid.y-10) 
        });

        /*assign(bounds, {
            width:bbox.width/4,//50,
            height:bbox.height/4,
            x: mid.x,
            y: mid.y
        });*/
        
        paddingTop=(7 * zoom);
        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });

       
    }

    // internal labels for expanded sub processes
    if (isExpandedSubProcess(element)) {
        assign(bounds, {
            width: bbox.width,
            x: bbox.x
        });

        assign(style, {
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight,
            paddingTop: (7 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (5 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px'
        });
    }

    var width = 90 * zoom,
        paddingTop = 7 * zoom,
        paddingBottom = 4 * zoom;

    // external labels for events, data elements, gateways and connections
    // EXCLUIR elementos con dos etiquetas de esta lógica
    if (target.labelTarget && !dualLabelElements.includes(element.type)) {
        assign(bounds, {
            width: width,
            height: bbox.height + paddingTop + paddingBottom,
            x: mid.x - width / 2,
            y: bbox.y - paddingTop
        });

        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });
    }

    // external label not yet created
    if (isLabelExternal(target)
        && !hasExternalLabel(target)
        && !isLabel(target) && !isAny(element, dualLabelElements) ) {

        var externalLabelMid = getExternalLabelMid(element);

        var absoluteBBox = canvas.getAbsoluteBBox({
            x: externalLabelMid.x,
            y: externalLabelMid.y,
            width: 0,
            height: 0
        });

        var height = externalFontSize + paddingTop + paddingBottom;

        assign(bounds, {
            width: width,
            height: height,
            x: absoluteBBox.x - width / 2,
            y: absoluteBBox.y - height / 2
        });

        assign(style, {
            fontSize: externalFontSize + 'px',
            lineHeight: externalLineHeight,
            paddingTop: paddingTop + 'px',
            paddingBottom: paddingBottom + 'px'
        });
    }

    // text annotations
    if (is(element, 'bpmn:TextAnnotation')) {
        assign(bounds, {
            width: bbox.width,
            height: bbox.height,
            minWidth: 30 * zoom,
            minHeight: 10 * zoom
        });

        assign(style, {
            textAlign: 'left',
            paddingTop: (5 * zoom) + 'px',
            paddingBottom: (7 * zoom) + 'px',
            paddingLeft: (7 * zoom) + 'px',
            paddingRight: (5 * zoom) + 'px',
            fontSize: defaultFontSize + 'px',
            lineHeight: defaultLineHeight
        });
    }

    return { bounds: bounds, style: style };
};

RALphLabelEditingProvider.prototype.update = function(element, text) {
    // Para elementos con dos etiquetas, actualizar el campo correcto
    const dualLabelElements = [
      'RALph:reportsDirectly',
      'RALph:reportsTransitively', 
      'RALph:delegatesDirectly',
      'RALph:delegatesTransitively'
    ];
    
    // Si es un label externo de un elemento con dos etiquetas
    if (element.type === 'label' && element.labelTarget && dualLabelElements.includes(element.labelTarget.type)) {
        // Actualizar el nombre del businessObject del label externo
        if (element.businessObject) {
            element.businessObject.name = text;
        }
    } 
    // Si es el elemento principal de un elemento con dos etiquetas
    else if (dualLabelElements.includes(element.type)) {
        // Actualizar el campo text del businessObject del elemento principal
        if (element.businessObject) {
            element.businessObject.text = text;
        }
    }
    // Para otros elementos, usar el comportamiento por defecto
    else {
        // Llamar al método update original
        LabelEditingProvider.prototype.update.call(this, element, text);
    }
};

// helpers //////////////////////

function isCollapsedSubProcess(element) {
    return is(element, 'bpmn:SubProcess') && !isExpanded(element);
}

function isExpandedSubProcess(element) {
    return is(element, 'bpmn:SubProcess') && isExpanded(element);
}

function isCollapsedPool(element) {
    return is(element, 'bpmn:Participant') && !isExpanded(element);
}

function isExpandedPool(element) {
    return is(element, 'bpmn:Participant') && isExpanded(element);
}

function isEmptyText(label) {
    return !label || !label.trim();
}


