// panels/rasci.js actualizado

export function initRasciPanel(panel) {
    const container = panel.querySelector('#matrix-container');
    const sampleBtn = panel.querySelector('.btn-primary');
  
    container.style.overflowX = 'auto';
    container.style.maxWidth = '100%';
    container.style.paddingBottom = '12px';
  
    const roles = ['PM', 'Dev', 'QA', 'UX', 'UI', 'BA', 'PO','Manager','Analista','Comunicador'];
    const tasks = ['Planificar', 'Desarrollar', 'Testear', 'Documentar', 'Entregar', 'Mantener', 'Analizar', 'Comunicar'];
    const rasciValues = ['R', 'A', 'S', 'C', 'I'];
  
    const matrix = {};
    tasks.forEach(task => {
      matrix[task] = {};
      roles.forEach(role => (matrix[task][role] = ''));
    });
  
    function renderMatrix() {
      container.innerHTML = '';
      const table = document.createElement('table');
      table.className = 'rasci-matrix';
      
      const thead = document.createElement('thead');
      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `<th>Tarea</th>` + roles.map(role => `<th>${role}</th>`).join('');
      thead.appendChild(headerRow);
      table.appendChild(thead);
  
      const tbody = document.createElement('tbody');
      tasks.forEach(task => {
        const row = document.createElement('tr');
        row.innerHTML = `<td>${task}</td>`;
  
        roles.forEach(role => {
          const cell = document.createElement('td');
          const select = document.createElement('select');
          
          select.innerHTML =
            `<option value=""></option>` +
            rasciValues.map(v => `<option value="${v}" class="option-${v.toLowerCase()}">${v}</option>`).join('');
  
          select.addEventListener('change', () => {
            matrix[task][role] = select.value;
            if (select.value) {
              cell.setAttribute('data-value', select.value);
            } else {
              cell.removeAttribute('data-value');
            }
          });
  
          cell.appendChild(select);
          row.appendChild(cell);
        });
  
        tbody.appendChild(row);
      });
  
      table.appendChild(tbody);
      container.appendChild(table);
  
      // Estilos mejorados que no interfieren con el redimensionamiento
      const style = document.createElement('style');
      style.textContent = `
        .rasci-matrix {
          border-collapse: separate;
          border-spacing: 0;
          width: 100%;
          min-width: max-content;
          margin: 16px 0;
          font-family: 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          font-size: 13px;
          color: #333;
          background: #fff;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
          border-radius: 6px;
          overflow: hidden;
        }
        
        .rasci-matrix th,
        .rasci-matrix td {
          padding: 10px 12px;
          text-align: center;
          border-right: 1px solid #eaeaea;
          border-bottom: 1px solid #eaeaea;
          transition: all 0.2s ease;
        }
        
        .rasci-matrix th {
          background: #f8fafc;
          font-weight: 600;
          color: #2d3748;
          position: sticky;
          top: 0;
          z-index: 10;
          border-bottom: 2px solid #e2e8f0;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          font-size: 12px;
        }
        
        .rasci-matrix td:first-child,
        .rasci-matrix th:first-child {
          background: #f8fafc;
          position: sticky;
          left: 0;
          z-index: 20;
          text-align: left;
          font-weight: 500;
          color: #4a5568;
          border-right: 2px solid #e2e8f0;
          min-width: 120px;
        }
        
        .rasci-matrix tr:hover td {
          background-color: #f8fafc;
        }
        
        .rasci-matrix td select {
          font-size: 13px;
          padding: 6px 8px;
          width: 50px;
          height: 30px;
          border: 1px solid #e2e8f0;
          border-radius: 4px;
          background: #fff;
          color: #4a5568;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 14px;
          text-align: center;
          font-weight: bold;
        }
        
        .rasci-matrix td select:focus {
          outline: none;
          border-color: #4299e1;
          box-shadow: 0 0 0 2px rgba(66, 153, 225, 0.2);
        }
        
        .rasci-matrix td select:hover {
          border-color: #cbd5e0;
        }
        
        /* Colores específicos para los valores RASCI según la leyenda */
        .rasci-matrix td select option.option-r { 
          background-color: #e63946; 
          color: white;
        }
        .rasci-matrix td select option.option-a { 
          background-color: #f77f00; 
          color: white;
        }
        .rasci-matrix td select option.option-s { 
          background-color: #43aa8b; 
          color: white;
        }
        .rasci-matrix td select option.option-c { 
          background-color: #3a86ff; 
          color: white;
        }
        .rasci-matrix td select option.option-i { 
          background-color: #6c757d; 
          color: white;
        }
        
        /* Estilo para celdas con valores seleccionados */
        .rasci-matrix td[data-value="R"] { background-color: rgba(230, 57, 70, 0.1); }
        .rasci-matrix td[data-value="A"] { background-color: rgba(247, 127, 0, 0.1); }
        .rasci-matrix td[data-value="S"] { background-color: rgba(67, 170, 139, 0.1); }
        .rasci-matrix td[data-value="C"] { background-color: rgba(58, 134, 255, 0.1); }
        .rasci-matrix td[data-value="I"] { background-color: rgba(108, 117, 125, 0.1); }
        
        /* Asegurar que el contenedor no interfiera con el redimensionamiento */
        #matrix-container {
          border-radius: 8px;
          background: #fff;
          box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
          position: relative;
          z-index: 1;
        }
      `;
      document.head.appendChild(style);
    }
  
    if (sampleBtn) {
      sampleBtn.addEventListener('click', renderMatrix);
    }
  
    renderMatrix();
}