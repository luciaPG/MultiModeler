/**
 * Modal personalizado para solicitar nombre de archivo
 */
class FileNameModal {
    constructor() {
        this.modal = null;
        this.input = null;
        this.errorElement = null;
        this.saveButton = null;
        this.directoryHandle = null;
        this.resolve = null;
        this.reject = null;
    }

    async show(defaultName = 'diagrama.bpmn', directoryHandle = null) {
        this.directoryHandle = directoryHandle;
        
        return new Promise((resolve, reject) => {
            this.resolve = resolve;
            this.reject = reject;
            this.createModal(defaultName);
        });
    }

    createModal(defaultName) {
        // Crear estructura del modal
        this.modal = document.createElement('div');
        this.modal.className = 'file-name-modal';
        
        this.modal.innerHTML = `
            <div class="file-name-modal-content">
                <h3>Nombre del Archivo</h3>
                <div class="file-name-input-group">
                    <label for="fileName">Introduce el nombre del archivo:</label>
                    <input type="text" id="fileName" class="file-name-input" value="${defaultName}" placeholder="ejemplo.bpmn">
                    <div class="file-name-error" id="fileNameError"></div>
                </div>
                <div class="file-name-modal-buttons">
                    <button type="button" class="file-name-btn file-name-btn-cancel">Cancelar</button>
                    <button type="button" class="file-name-btn file-name-btn-save">Guardar</button>
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Referencias a elementos
        this.input = this.modal.querySelector('#fileName');
        this.errorElement = this.modal.querySelector('#fileNameError');
        this.saveButton = this.modal.querySelector('.file-name-btn-save');
        const cancelButton = this.modal.querySelector('.file-name-btn-cancel');

        // Event listeners
        this.input.addEventListener('input', () => this.validateInput());
        this.input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.handleSave();
            } else if (e.key === 'Escape') {
                this.handleCancel();
            }
        });

        this.saveButton.addEventListener('click', () => this.handleSave());
        cancelButton.addEventListener('click', () => this.handleCancel());

        // Cerrar al hacer clic fuera del modal
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.handleCancel();
            }
        });

        // Enfocar el input y seleccionar el texto (sin extensión)
        setTimeout(() => {
            this.input.focus();
            const nameWithoutExt = defaultName.replace('.bpmn', '');
            this.input.setSelectionRange(0, nameWithoutExt.length);
        }, 100);
    }

    validateInput() {
        const fileName = this.input.value.trim();
        this.clearError();

        if (!fileName) {
            this.showError('El nombre del archivo es requerido');
            return false;
        }

        // Validar caracteres no permitidos
        const invalidChars = /[<>:"/\\|?*]/;
        if (invalidChars.test(fileName)) {
            this.showError('El nombre contiene caracteres no válidos: < > : " / \\ | ? *');
            return false;
        }

        // Validar longitud
        if (fileName.length > 255) {
            this.showError('El nombre es demasiado largo (máximo 255 caracteres)');
            return false;
        }

        return true;
    }

    async checkFileExists(fileName) {
        if (!this.directoryHandle) return false;
        
        try {
            await this.directoryHandle.getFileHandle(fileName);
            return true;
        } catch (error) {
            return false;
        }
    }

    showError(message) {
        this.errorElement.textContent = message;
        this.errorElement.classList.add('show');
        this.saveButton.disabled = true;
    }

    clearError() {
        this.errorElement.classList.remove('show');
        this.saveButton.disabled = false;
    }

    async handleSave() {
        let fileName = this.input.value.trim();

        if (!this.validateInput()) {
            return;
        }

        // Asegurar extensión .bpmn
        if (!fileName.endsWith('.bpmn')) {
            fileName += '.bpmn';
        }

        // Verificar si el archivo ya existe
        if (await this.checkFileExists(fileName)) {
            const confirmed = await this.showConfirmOverwrite(fileName);
            if (!confirmed) {
                return;
            }
        }

        this.close();
        this.resolve(fileName);
    }

    async showConfirmOverwrite(fileName) {
        return new Promise((resolve) => {
            // No ocultar el modal principal, simplemente reemplazar su contenido
            const originalContent = this.modal.querySelector('.file-name-modal-content');
            const originalHTML = originalContent.innerHTML;
            
            // Reemplazar el contenido del modal existente
            originalContent.innerHTML = `
                <h3>⚠️ Archivo existente</h3>
                <p>El archivo "<strong>${fileName}</strong>" ya existe.<br>
                ¿Deseas sobrescribirlo?</p>
                <div class="file-name-modal-buttons">
                    <button type="button" class="file-name-btn">Cancelar</button>
                    <button type="button" class="file-name-btn file-name-btn-save">Sobrescribir</button>
                </div>
            `;

            const cancelBtn = originalContent.querySelector('.file-name-btn:not(.file-name-btn-save)');
            const confirmBtn = originalContent.querySelector('.file-name-btn-save');

            const restoreOriginalContent = () => {
                originalContent.innerHTML = originalHTML;
                // Reconectar los eventos del modal original
                this.input = this.modal.querySelector('#fileName');
                this.errorElement = this.modal.querySelector('#fileNameError');
                this.saveButton = this.modal.querySelector('.file-name-btn-save');
                
                // Reconectar eventos
                this.input.addEventListener('input', () => this.validateInput());
                this.input.addEventListener('keypress', (e) => {
                    if (e.key === 'Enter') {
                        this.handleSave();
                    } else if (e.key === 'Escape') {
                        this.handleCancel();
                    }
                });
                this.saveButton.addEventListener('click', () => this.handleSave());
                
                // Enfocar el input
                setTimeout(() => this.input.focus(), 100);
            };

            cancelBtn.addEventListener('click', () => {
                restoreOriginalContent();
                resolve(false);
            });

            confirmBtn.addEventListener('click', () => {
                // No restaurar contenido, cerrar modal
                resolve(true);
            });

            // Cerrar con Escape
            const handleKeyPress = (e) => {
                if (e.key === 'Escape') {
                    restoreOriginalContent();
                    resolve(false);
                    document.removeEventListener('keydown', handleKeyPress);
                }
            };
            document.addEventListener('keydown', handleKeyPress);
        });
    }

    handleCancel() {
        this.close();
        this.reject(new Error('Cancelado por el usuario'));
    }

    close() {
        if (this.modal && this.modal.parentNode) {
            document.body.removeChild(this.modal);
        }
    }
}

// Register helper function in service registry
import { getServiceRegistry } from '../core/ServiceRegistry.js';

const showFileNameModal = async function(defaultName = 'diagrama.bpmn', directoryHandle = null) {
    const modal = new FileNameModal();
    return await modal.show(defaultName, directoryHandle);
};

const serviceRegistry = getServiceRegistry();
if (serviceRegistry) {
    serviceRegistry.registerFunction('showFileNameModal', showFileNameModal);
}
