// panels/rasci.js

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
      table.style = 'border-collapse: collapse; font-size: 13px; min-width: 100%; width: max-content;';
  
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
          select.style = 'font-size: 13px; padding: 4px; width: 100%; border: 1px solid #ced4da; border-radius: 4px; background: #fff; color: #212529;';
  
          select.innerHTML =
            `<option value=""></option>` +
            rasciValues.map(v => `<option value="${v}">${v}</option>`).join('');
  
          select.addEventListener('change', () => {
            matrix[task][role] = select.value;
          });
  
          cell.appendChild(select);
          row.appendChild(cell);
        });
  
        tbody.appendChild(row);
      });
  
      table.appendChild(tbody);
      container.appendChild(table);
  
      // Estilos sticky para primera columna y encabezado
      const style = document.createElement('style');
      style.textContent = `
        .rasci-matrix {
          background: white;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
          border-radius: 6px;
        }
        .rasci-matrix th,
        .rasci-matrix td {
          border: 1px solid #dee2e6;
          padding: 8px 10px;
          text-align: center;
        }
        .rasci-matrix th {
          background: #f1f3f5;
          font-weight: 600;
          color: #343a40;
          white-space: nowrap;
          position: sticky;
          top: 0;
          z-index: 2;
        }
        .rasci-matrix td:first-child,
        .rasci-matrix th:first-child {
          background: #fff;
          position: sticky;
          left: 0;
          z-index: 3;
          text-align: left;
          font-weight: 600;
        }
        .rasci-matrix td select:hover {
          background: #f8f9fa;
        }
      `;
      document.head.appendChild(style);
    }
  
    if (sampleBtn) {
      sampleBtn.addEventListener('click', renderMatrix);
    }
  
    renderMatrix();
  }