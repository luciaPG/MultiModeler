# Mapeo Automático RASCI → RALph

## Descripción

Esta funcionalidad permite convertir automáticamente una matriz RASCI (Responsible, Accountable, Support, Consulted, Informed) en elementos de la notación RALph sobre un diagrama BPMN existente.

## Cómo usar

### 1. Preparar el diagrama BPMN
- Cargar o crear un diagrama BPMN con las tareas del proceso
- Asegurarse de que las tareas tengan nombres descriptivos

### 2. Configurar la matriz RASCI
- Abrir el panel RASCI
- En la pestaña "Matriz", agregar los roles necesarios
- Asignar responsabilidades (R, A, S, C, I) a cada tarea

### 3. Ejecutar el mapeo
- Cambiar a la pestaña "Mapeo RALph"
- Si las tareas no coinciden con el diagrama, usar "Mapear Tareas a Diagrama"
- Configurar las opciones de mapeo según se desee
- Hacer clic en "Ejecutar Mapeo Automático"

## Lógica de Mapeo

### Responsabilidades RASCI

| Letra | Significado | Mapeo a RALph |
|-------|-------------|---------------|
| **R** | Responsable | Asignación simple del rol a la tarea existente |
| **A** | Aprobador | Nueva tarea "Aprobar [X]" después de la original |
| **S** | Soporte | Asignación compuesta AND con el responsable |
| **C** | Consultado | Flujo de mensaje bidireccional |
| **I** | Informado | Evento intermedio de mensaje |

### Elementos RALph generados

- **Roles**: Elementos `RALph:RoleRALph` para cada rol definido
- **Capacidades**: Elementos `RALph:Personcap` para roles de soporte inexistentes
- **Asignaciones simples**: Conexiones `RALph:ResourceArc` directas
- **Asignaciones compuestas**: Nodos `RALph:Complex-Assignment-AND` con conexiones
- **Flujos de mensaje**: Conexiones `RALph:dashedLine` para consultas
- **Eventos informativos**: Eventos BPMN con conexiones `RALph:solidLine`

## Opciones de Configuración

### Mapear Tareas a Diagrama
- **Función**: Actualiza automáticamente los nombres de las tareas en la matriz para que coincidan con las tareas del diagrama BPMN
- **Uso**: Hacer clic en "Mapear Tareas a Diagrama" antes de ejecutar el mapeo si las tareas no coinciden

### Crear tareas de aprobación (A)
- **Activado**: Genera nuevas tareas BPMN para cada responsabilidad de aprobación
- **Desactivado**: No crea tareas adicionales

### Crear flujos de mensaje (C/I)
- **Activado**: Genera conexiones RALph para consultas e informaciones
- **Desactivado**: Omite estos elementos

### Crear capacidades para roles inexistentes (S)
- **Activado**: Crea elementos de capacidad para roles de soporte no definidos
- **Desactivado**: Omite roles de soporte no existentes

## Ejemplo de Uso

### Matriz RASCI de entrada:
```
Tarea           | Coordinador | Director | Analista | Soporte
Validar solicitud| R          | A        | C        | S
Procesar datos   | R          |          | S        | I
Enviar informe   |            | A        | R        |
```

### Resultado del mapeo:
1. **Roles creados**: Coordinador, Director, Analista, Soporte
2. **Asignaciones simples**: 
   - Coordinador → Validar solicitud (R)
   - Coordinador → Procesar datos (R)
   - Analista → Enviar informe (R)
3. **Tareas de aprobación**:
   - "Aprobar Validar solicitud" → Director
   - "Aprobar Enviar informe" → Director
4. **Asignaciones compuestas**:
   - Validar solicitud → Complex-Assignment-AND → Soporte
   - Procesar datos → Complex-Assignment-AND → Analista
5. **Flujos de mensaje**:
   - Validar solicitud ↔ Analista (consulta)
   - Procesar datos → Soporte (información)

## Posicionamiento

Los elementos RALph se posicionan automáticamente:
- **Roles**: Lado derecho del canvas, en columna vertical
- **Nodos de asignación compuesta**: Entre la tarea y el rol
- **Tareas de aprobación**: A la derecha de la tarea original
- **Eventos informativos**: Arriba de la tarea original

## Consideraciones

- Los elementos se crean con IDs únicos basados en los nombres
- Las conexiones mantienen la semántica RALph correcta
- El mapeo es incremental: no elimina elementos existentes
- Se pueden ejecutar múltiples mapeos sobre el mismo diagrama

## Solución de Problemas

### Error: "No se encontró el modelador BPMN"
- Asegurarse de que el diagrama BPMN esté cargado
- Verificar que el modelador esté inicializado

### Error: "No hay datos en la matriz RASCI"
- Completar la matriz RASCI antes de ejecutar el mapeo
- Verificar que haya al menos una responsabilidad asignada

### Tareas no encontradas
- Los nombres de las tareas en la matriz deben coincidir exactamente con los nombres en el diagrama BPMN
- Verificar mayúsculas/minúsculas y espacios
- **Solución**: Usar el botón "Mapear Tareas a Diagrama" para actualizar automáticamente los nombres

## Archivos Relacionados

- `app/panels/rasci-panel.html`: Interfaz de usuario
- `app/js/panels/rasci.js`: Lógica de mapeo
- `app/RALPH-modeler/`: Definiciones de elementos RALph
- `resources/rasci-example.bpmn`: Diagrama de ejemplo 