/**
 * Open a file from disk (project or BPMN) returning typed metadata.
 * @returns {Promise<{ type: 'project'|'bpmn', data: any, content: string, fileName?: string }>}
 */
export async function openFile() {
  try {
    let file, contents;

    if (typeof window !== 'undefined' && 'showOpenFilePicker' in window) {
      const fileHandle = await window.showOpenFilePicker({
        types: [
          { description: 'Proyectos MultiModeler', accept: { 'application/json': ['.mmproject'] } },
          { description: 'Diagramas BPMN', accept: { 'application/xml': ['.bpmn', '.xml'] } },
        ],
        excludeAcceptAllOption: false,
        multiple: false,
      });

      if (!fileHandle || !fileHandle[0]) {
        throw new Error('No se seleccionó ningún archivo');
      }

      file = await fileHandle[0].getFile();
      contents = await file.text();
    } else {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.mmproject,.bpmn,.xml';

        const fileSelected = new Promise((resolve, reject) => {
          input.onchange = (event) => {
            if (event.target.files && event.target.files[0]) {
              resolve(event.target.files[0]);
            } else {
              reject(new Error('No se seleccionó ningún archivo'));
            }
          };
          input.oncancel = () => reject(new Error('Operación cancelada'));
        });

        input.click();
        file = await fileSelected;

        contents = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error('Error al leer el archivo'));
          reader.readAsText(file);
        });
      }
    }

    if (!contents) {
      throw new Error('No se pudo leer el contenido del archivo');
    }

    const fileExtension = file.name.split('.').pop().toLowerCase();

    if (fileExtension === 'mmproject') {
      try {
        const projectData = JSON.parse(contents);
        return { type: 'project', data: projectData, content: contents, fileName: file && file.name ? file.name : undefined };
      } catch (error) {
        throw new Error('El archivo de proyecto no es válido: ' + error.message);
      }
    } else if (fileExtension === 'bpmn' || fileExtension === 'xml') {
      return { type: 'bpmn', data: null, content: contents, fileName: file && file.name ? file.name : undefined };
    } else {
      throw new Error('Tipo de archivo no soportado. Use archivos .mmproject, .bpmn o .xml');
    }
  } catch (error) {
    if (error.name === 'AbortError' || error.message === 'Operación cancelada') {
      throw new Error('Operación cancelada');
    }
    throw error;
  }
}


