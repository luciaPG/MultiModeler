import $ from 'jquery';
import { is } from 'bpmn-js/lib/util/ModelUtil';

export default class SubprocessNavigation {
    constructor(modeler) {
        console.log('=== SubprocessNavigation constructor called ===');
        console.log('Modeler:', modeler);

        this.modeler = modeler;
        this.eventBus = modeler.get('eventBus');
        this.canvas = modeler.get('canvas');
        this.elementRegistry = modeler.get('elementRegistry');

        console.log('Services retrieved:');
        console.log('- EventBus:', this.eventBus);
        console.log('- Canvas:', this.canvas);
        console.log('- ElementRegistry:', this.elementRegistry);

        this.subprocessStack = [];
        this.breadcrumbContainer = null;

        this.init();
        console.log('=== SubprocessNavigation initialization complete ===');
    }

    init() {
        console.log('Setting up event listeners...');

        // Listen for root element changes (when navigating to subprocess views)
        this.eventBus.on('canvas.rootElement.changed', (event) => {
            console.log('Root element changed:', event.element);
            this.handleRootElementChange(event.element);
        });

        // Listen for canvas viewbox changes (alternative detection)
        this.eventBus.on('canvas.viewbox.changed', () => {
            setTimeout(() => {
                this.checkCurrentView();
            }, 100);
        });

        // Listen for double-clicks to detect entering subprocesses
        this.eventBus.on('element.dblclick', (event) => {
            console.log('Double-click detected on:', event.element.type, event.element.id);
            if (is(event.element, 'bpmn:SubProcess')) {
                console.log('Double-clicked on subprocess, will show breadcrumb when navigation completes');
            }
        });

        // Listen for drilldown events (when clicking the arrow button)
        this.eventBus.on('drilldown.init', (event) => {
            console.log('Drilldown init detected:', event);
        });

        this.eventBus.on('drilldown.executed', (event) => {
            console.log('Drilldown executed:', event);
        });

        // Listen for any context pad actions that might trigger subprocess navigation
        this.eventBus.on('contextPad.action', (event) => {
            console.log('Context pad action:', event);
            if (event.action && event.action.id && event.action.id.includes('drilldown')) {
                console.log('Drilldown action detected via context pad');
            }
        });

        // Listen for DOM clicks on drilldown buttons
        $(document).on('click', '.bjs-drilldown', (event) => {
            console.log('Drilldown button clicked directly');
            setTimeout(() => {
                this.checkCurrentView();
            }, 100);
        });

        // Listen for escape key
        $(document).on('keydown.subprocess-nav', (event) => {
            if (event.key === 'Escape' && this.subprocessStack.length > 0) {
                console.log('Escape key pressed');
                event.preventDefault();
                this.goBack();
            }
        });

        // Clean up navigation when switching diagrams
        this.eventBus.on('import.done', () => {
            console.log('Import done, resetting navigation');
            this.reset();
        });

        // Check initial view after a short delay
        setTimeout(() => {
            this.checkCurrentView();
        }, 500);

        console.log('Event listeners set up successfully');
    }

    handleRootElementChange(rootElement) {
        console.log('handleRootElementChange called with:', rootElement);
        if (rootElement) {
            this.updateNavigationForRoot(rootElement);
        }
    }

    checkCurrentView() {
        console.log('checkCurrentView called');
        const currentRoot = this.canvas.getRootElement();

        if (currentRoot) {
            console.log('Current root element:', currentRoot.id, currentRoot.type);
            this.updateNavigationForRoot(currentRoot);
        }
    }

    updateNavigationForRoot(rootElement) {
        console.log('updateNavigationForRoot called with:', rootElement.id);

        // Check if this is a subprocess (not the main process)
        if (this.isSubprocessRoot(rootElement)) {
            console.log('Currently viewing subprocess:', rootElement.id);
            this.buildSubprocessStack(rootElement);
            this.createBreadcrumb();
        } else {
            console.log('Currently viewing main process');
            this.reset();
        }
    }

    isSubprocessRoot(element) {
        // Check if this is a subprocess by looking at its type or ID patterns
        console.log('Checking if subprocess root:', element.id, element.type);
        const isSubprocess = element.type === 'bpmn:SubProcess' ||
            element.id.includes('_plane') ||
            (element.businessObject && element.businessObject.$type === 'bpmn:SubProcess');
        console.log('isSubprocessRoot result:', isSubprocess);
        return isSubprocess;
    }

    buildSubprocessStack(subprocessRoot) {
        console.log('buildSubprocessStack called for:', subprocessRoot.id);

        // Clear existing stack
        this.subprocessStack = [];

        // Get the subprocess ID (remove _plane suffix if present)
        const subprocessId = subprocessRoot.id.replace('_plane', '');

        // Get the name from business object or use ID
        let subprocessName = subprocessId;
        if (subprocessRoot.businessObject && subprocessRoot.businessObject.name) {
            subprocessName = subprocessRoot.businessObject.name;
        }

        // Add this subprocess to the stack
        this.subprocessStack.push({
            id: subprocessId,
            name: subprocessName,
            element: subprocessRoot
        });

        console.log('Built subprocess stack:', this.subprocessStack);
    }

    createBreadcrumb() {
        console.log('createBreadcrumb called');
        this.removeBreadcrumb();

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

        console.log('Breadcrumb container created:', this.breadcrumbContainer);

        // Add main process link
        const mainLink = $(`
            <span class="breadcrumb-item main-process" style="
                color: #0066cc;
                cursor: pointer;
                text-decoration: none;
                padding: 4px 8px;
                border-radius: 3px;
                transition: background-color 0.2s;
            ">Main Process</span>
        `);

        mainLink.hover(
            function () { $(this).css('background-color', '#f0f8ff'); },
            function () { $(this).css('background-color', 'transparent'); }
        );

        mainLink.click(() => {
            console.log('Main process link clicked');
            this.navigateToMain();
        });

        this.breadcrumbContainer.append(mainLink);

        // Add subprocess breadcrumbs
        this.subprocessStack.forEach((subprocess, index) => {
            // Add separator
            this.breadcrumbContainer.append($(`
                <span class="breadcrumb-separator" style="color: #666; margin: 0 4px;">></span>
            `));

            // Add subprocess link
            const subprocessLink = $(`
                <span class="breadcrumb-item subprocess" style="
                    color: #0066cc;
                    cursor: pointer;
                    text-decoration: none;
                    padding: 4px 8px;
                    border-radius: 3px;
                    transition: background-color 0.2s;
                    ${index === this.subprocessStack.length - 1 ? 'font-weight: bold; color: #333;' : ''}
                ">${subprocess.name || 'Subprocess'}</span>
            `);

            if (index < this.subprocessStack.length - 1) {
                subprocessLink.hover(
                    function () { $(this).css('background-color', '#f0f8ff'); },
                    function () { $(this).css('background-color', 'transparent'); }
                );

                subprocessLink.click(() => {
                    console.log('Subprocess link clicked for level:', index);
                    this.navigateToLevel(index);
                });
            }

            this.breadcrumbContainer.append(subprocessLink);
        });

        // Add to body instead of canvas to ensure it's visible
        $('body').append(this.breadcrumbContainer);
        console.log('Breadcrumb added successfully to body');
    }

    removeBreadcrumb() {
        if (this.breadcrumbContainer) {
            console.log('Removing breadcrumb');
            this.breadcrumbContainer.remove();
            this.breadcrumbContainer = null;
        }
    }

    navigateToMain() {
        console.log('navigateToMain called');

        // Find the main process
        const rootElements = this.elementRegistry.filter(element => element.type === 'bpmn:Process');
        if (rootElements.length > 0) {
            this.canvas.setRootElement(rootElements[0]);
        }

        this.reset();
    }

    navigateToLevel(levelIndex) {
        console.log('navigateToLevel called for level:', levelIndex);
        this.subprocessStack = this.subprocessStack.slice(0, levelIndex + 1);

        if (this.subprocessStack.length === 0) {
            this.navigateToMain();
        } else {
            this.createBreadcrumb();
        }
    }

    goBack() {
        console.log('goBack called');
        this.navigateToMain();
    }

    reset() {
        console.log('reset called');
        this.subprocessStack = [];
        this.removeBreadcrumb();
    }

    destroy() {
        console.log('destroy called');
        this.reset();
        $(document).off('keydown.subprocess-nav');
    }
}