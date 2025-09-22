/**
 * Display a modal with download options.
 * @returns {Promise<'complete'|'bpmn'|null>}
 */
export function showDownloadOptions() {
  return new Promise((resolve) => {
    const modal = `
      <div id="download-options-modal" class="modal-overlay">
        <div class="modal-content">
            <div class="modal-header">
                <h3 class="modal-title">
                    <i class="fas fa-download"></i>
                    Descarga tu proyecto
                </h3>
                <p class="modal-subtitle">Selecciona el formato de descarga para tu proyecto:</p>
            </div>
            <div class="modal-body">
                <div class="download-option">
                    <button id="download-complete" class="download-btn primary">
                        <div class="download-btn-icon">
                            <i class="fas fa-archive icon-vscode"></i>
                        </div>
                        <div class="download-btn-content">
                            <div class="download-btn-title">Proyecto Completo</div>
                            <div class="download-btn-subtitle">Archivo .mmproject con todos los datos</div>
                            <div class="download-btn-badge recommended">Recomendado</div>
                        </div>
                    </button>
                </div>
                <div class="download-option">
                    <button id="download-bpmn" class="download-btn secondary">
                        <div class="download-btn-icon">
                            <i class="fas fa-file-code icon-vscode"></i>
                        </div>
                        <div class="download-btn-content">
                            <div class="download-btn-title">Solo BPMN</div>
                            <div class="download-btn-subtitle">Diagrama .bpmn con elementos PPINOT integrados</div>
                        </div>
                    </button>
                </div>
            </div>
            <div class="modal-footer">
                <button id="download-cancel" class="btn btn-secondary">
                    <i class="fas fa-times"></i> Cancelar
                </button>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modal);

    document.getElementById('download-complete').onclick = () => {
      document.getElementById('download-options-modal').remove();
      resolve('complete');
    };
    document.getElementById('download-bpmn').onclick = () => {
      document.getElementById('download-options-modal').remove();
      resolve('bpmn');
    };
    document.getElementById('download-cancel').onclick = () => {
      document.getElementById('download-options-modal').remove();
      resolve(null);
    };
  });
}


