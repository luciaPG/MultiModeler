import $ from 'jquery';
import { is } from 'bpmn-js/lib/util/ModelUtil';

/**
 * Provides breadcrumb navigation for BPMN subprocesses.
 * Automatically detects when entering/exiting subprocesses and shows navigation bar.
 * Allows navigation back to main process via breadcrumb links or Escape key.
 */

export default class SubprocessNavigation {
    constructor(modeler) {
        this.modeler = modeler;
        this.eventBus = modeler.get('eventBus');
        this.canvas = modeler.get('canvas');
        this.elementRegistry = modeler.get('elementRegistry');
        
        this.subprocessStack = [];
        this.breadcrumbContainer = null;
        
        this._setupEventListeners();
    }

    _setupEventListeners() {
        this.eventBus.on('canvas.rootElement.changed', (event) => {
            this._updateNavigation(event.element);
        });

        this.eventBus.on('canvas.viewbox.changed', () => {
            setTimeout(() => this._checkCurrentView(), 100);
        });

        $(document).on('click', '.bjs-drilldown', () => {
            setTimeout(() => this._checkCurrentView(), 100);
        });

        $(document).on('keydown.subprocess-nav', (event) => {
            if (event.key === 'Escape' && this.subprocessStack.length > 0) {
                event.preventDefault();
                this.navigateToMain();
            }
        });

        this.eventBus.on('import.done', () => this.reset());
        setTimeout(() => this._checkCurrentView(), 500);
    }

    _checkCurrentView() {
        const currentRoot = this.canvas.getRootElement();
        if (currentRoot) {
            this._updateNavigation(currentRoot);
        }
    }

    _updateNavigation(rootElement) {
        if (this._isSubprocessRoot(rootElement)) {
            this._buildSubprocessStack(rootElement);
            this._showBreadcrumb();
        } else {
            this.reset();
        }
    }

    _isSubprocessRoot(element) {
        return element.type === 'bpmn:SubProcess' || 
               element.id.includes('_plane') ||
               (element.businessObject && element.businessObject.$type === 'bpmn:SubProcess');
    }

    
    _buildSubprocessStack(subprocessRoot) {
        this.subprocessStack = [];
        const id = subprocessRoot.id.replace('_plane', '');
        const name = subprocessRoot.businessObject?.name || 'Subprocess';
        
        this.subprocessStack.push({ id, name, element: subprocessRoot });
    }

    _showBreadcrumb() {
        this._removeBreadcrumb();
        
        this.breadcrumbContainer = $(`
            <div class="subprocess-breadcrumb" style="
                position: fixed;
                top: 10px;
                left: 150px;
                background: white;
                padding: 8px 16px;
                border: 1px solid #ddd;
                border-radius: 4px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.15);
                z-index: 10000;
                font-family: Arial, sans-serif;
                font-size: 13px;
                display: flex;
                align-items: center;
                gap: 8px;
            "></div>
        `);

        const mainLink = this._createLink('Main Process', () => this.navigateToMain());
        this.breadcrumbContainer.append(mainLink);

        this.subprocessStack.forEach((subprocess, index) => {
            this.breadcrumbContainer.append($('<span style="color: #666; margin: 0 4px;">></span>'));
            
            const isCurrentLevel = index === this.subprocessStack.length - 1;
            const link = this._createLink(
                subprocess.name, 
                isCurrentLevel ? null : () => this.navigateToLevel(index),
                isCurrentLevel
            );
            this.breadcrumbContainer.append(link);
        });

        $('body').append(this.breadcrumbContainer);
    }

    _createLink(text, clickHandler, isCurrent = false) {
        const link = $(`
            <span style="
                color: ${isCurrent ? '#333' : '#0066cc'};
                cursor: ${clickHandler ? 'pointer' : 'default'};
                padding: 4px 8px;
                border-radius: 3px;
                transition: background-color 0.2s;
                ${isCurrent ? 'font-weight: bold;' : ''}
            ">${text}</span>
        `);

        if (clickHandler) {
            link.hover(
                function() { $(this).css('background-color', '#f0f8ff'); },
                function() { $(this).css('background-color', 'transparent'); }
            );
            link.click(clickHandler);
        }

        return link;
    }

    _removeBreadcrumb() {
        if (this.breadcrumbContainer) {
            this.breadcrumbContainer.remove();
            this.breadcrumbContainer = null;
        }
    }

    navigateToMain() {
        const mainProcess = this.elementRegistry.filter(el => el.type === 'bpmn:Process')[0];
        if (mainProcess) {
            this.canvas.setRootElement(mainProcess);
        }
        this.reset();
    }

    navigateToLevel(levelIndex) {
        this.subprocessStack = this.subprocessStack.slice(0, levelIndex + 1);
        this.subprocessStack.length === 0 ? this.navigateToMain() : this._showBreadcrumb();
    }

    reset() {
        this.subprocessStack = [];
        this._removeBreadcrumb();
    }

    destroy() {
        this.reset();
        $(document).off('keydown.subprocess-nav');
    }
}