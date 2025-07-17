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

          // Dropdown personalizado
          const dropdown = document.createElement('div');
          dropdown.className = 'rasci-dropdown';
          dropdown.tabIndex = 0;

          const selected = document.createElement('div');
          selected.className = 'rasci-selected';
          selected.textContent = '';
          dropdown.appendChild(selected);

          const menu = document.createElement('div');
          menu.className = 'rasci-menu';
          menu.style.display = 'none';

          const rasciColors = {
            R: '#e63946',
            A: '#f77f00',
            S: '#43aa8b',
            C: '#3a86ff',
            I: '#6c757d'
          };

          rasciValues.forEach(v => {
            const option = document.createElement('div');
            option.className = 'rasci-option';
            // Círculo con letra blanca
            const circle = document.createElement('span');
            circle.className = 'rasci-circle';
            circle.textContent = v;
            circle.style.background = rasciColors[v];
            option.appendChild(circle);
            option.addEventListener('click', e => {
              selected.innerHTML = '';
              const selectedCircle = document.createElement('span');
              selectedCircle.className = 'rasci-circle';
              selectedCircle.textContent = v;
              selectedCircle.style.background = rasciColors[v];
              selected.appendChild(selectedCircle);
              menu.style.display = 'none';
              matrix[task][role] = v;
              cell.setAttribute('data-value', v);
              e.stopPropagation();
            });
            menu.appendChild(option);
          });

          // Opción para limpiar
          const clearOption = document.createElement('div');
          clearOption.className = 'rasci-option rasci-clear';
          clearOption.textContent = '-';
          clearOption.style.color = '#bbb';
          clearOption.addEventListener('click', e => {
            selected.innerHTML = '';
            menu.style.display = 'none';
            matrix[task][role] = '';
            cell.removeAttribute('data-value');
            e.stopPropagation();
          });
          menu.appendChild(clearOption);

          dropdown.appendChild(menu);

          // Mostrar menú al hacer clic
          selected.addEventListener('click', e => {
            menu.style.display = menu.style.display === 'none' ? 'block' : 'none';
            e.stopPropagation();
          });
          dropdown.addEventListener('blur', () => {
            menu.style.display = 'none';
          });

          // Cerrar menú al hacer clic fuera
          document.addEventListener('click', () => {
            menu.style.display = 'none';
          });

          cell.appendChild(dropdown);
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
          position: relative;
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
          padding: 0;
          width: 15px;
          height: 100%;
          border: none;
          border-radius: 0;
          background: rgba(255,255,255,0.7);
          color: transparent;
          cursor: pointer;
          transition: all 0.2s ease;
          appearance: none;
          background-image: url("data:image/svg+xml;charset=UTF-8,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23666' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3e%3cpolyline points='6 9 12 15 18 9'%3e%3c/polyline%3e%3c/svg%3e");
          background-repeat: no-repeat;
          background-position: right 8px center;
          background-size: 14px;
          text-align: center;
          font-weight: bold;
          position: absolute;
          top: 0;
          left: 0;
          box-shadow: none;
        }
       
        
        /* Opciones con círculos de color y letras */
        .rasci-matrix td select option.option-r { 
        
          color: #e63946;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-a {          
          color: #f77f00;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-s { 
        
          color: #43aa8b;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-c { 

          color: #3a86ff;
          font-weight: bold;
        }
        
        .rasci-matrix td select option.option-i { 
      
          color: #6c757d;
          font-weight: bold;
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

        .rasci-dropdown {
          position: relative;
          width: 100%;
          min-width: 40px;
          user-select: none;
          outline: none;
        }
        .rasci-selected {
          width: 100%;
          padding: 4px 0;
          background: rgba(255,255,255,0.7);
          border-radius: 6px;
          text-align: center;
          cursor: pointer;
          font-weight: bold;
          font-size: 15px;
          border: none;
          min-height: 28px;
        }
        .rasci-menu {
          position: absolute;
          left: 50%;
          top: 100%;
          width: 125%;
          min-width: 125%;
          background: rgba(255, 255, 255, 0.9);
          border-radius: 8px;
          box-shadow: none;
          z-index: 50;
          margin-left: -62.5%;
          margin-top: 2px;
          border: none;
        }
        .rasci-option {
          padding: 10px 0;
          text-align: center;
          font-size: 15px;
          font-weight: bold;
          cursor: pointer;
          background: transparent;
          border: none;
          transition: background 0.15s;
          width: 100%;
          min-width: 100%;
        }
        .rasci-option:hover {
          background: rgba(255, 255, 255, 0.95);
        }
        .rasci-clear {
          font-weight: normal;
          font-size: 13px;
        }
        .rasci-circle {
          display: inline-block;
          width: 24px;
          height: 24px;
          line-height: 24px;
          border-radius: 50%;
          background: #eee;
          color: #fff;
          font-weight: bold;
          font-size: 15px;
          text-align: center;
          vertical-align: middle;
          margin: 0 2px;
          box-shadow: 0 1px 2px rgba(0,0,0,0.04);
        }
      `;
      document.head.appendChild(style);
    }
  
    if (sampleBtn) {
      sampleBtn.addEventListener('click', renderMatrix);
    }
  
    renderMatrix();
}