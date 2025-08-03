# 🎯 Implementación de Detección Automática de PPIs

## ✅ Funcionalidades Implementadas

### 1. **Detección Automática de Elementos PPI**
- **Detección por EventBus BPMN**: Escucha eventos `shape.added` y `element.changed`
- **Detección por DOM Observer**: Observa cambios en el DOM para detectar elementos añadidos
- **Múltiples métodos de identificación**:
  - Por tipo de businessObject (`PPINOT:Ppi`)
  - Por clases CSS (`.ppinot`, `.ppi-element`)
  - Por ID de elemento (contiene 'PPINOT' o 'Ppi')
  - Por nombre de elemento (contiene 'ppi', 'indicador', 'kpi')

### 2. **Generación Automática de Plantillas PPI**
Cuando se detecta un elemento PPI, se genera automáticamente una plantilla con:

```
Proceso: [Inferido del canvas o "Productividad Ajustada por Calidad"]
Objetivo de negocio: Mejorar la eficiencia y la calidad de los entregables del proceso

Definición de medida:
La función (x1 * x2) / 100, donde:
  - x1 es el número de veces que la actividad '[DetectadaAutomáticamente]' cambia a estado 'Completado'
  - x2 es el porcentaje de veces que la actividad '[DetectadaAutomáticamente]' ha finalizado en estado 'Aprobado'

Tipo de medida: derived
Objetivo: Debe ser mayor que 75
Unidad: %
Alcance: mensual
Fuente: Sistema de gestión de proyectos y control de versiones
Responsable: Gerente de Desarrollo
Informados: Director de Tecnología, Jefes de Equipo
```

### 3. **Análisis Inteligente del Canvas**
- **Análisis por ElementRegistry**: Extrae todos los elementos del modeler BPMN
- **Análisis por DOM**: Fallback que analiza directamente el HTML/SVG
- **Categorización automática**:
  - Actividades (Tasks)
  - Eventos (Events)
  - Compuertas (Gateways)
  - Objetos de Datos (DataObjects)
  - Elementos PPINOT

### 4. **Nueva Pestaña "Análisis Canvas"**
- **Resumen visual** con contadores de elementos
- **Listado detallado** de cada tipo de elemento
- **Botón "Generar PPI Automático"** para crear plantillas manualmente

### 5. **Funciones de Gestión**
- **Ver PPIs**: Modal con detalles completos
- **Editar PPIs**: Formulario prellenado
- **Eliminar PPIs**: Con confirmación
- **Exportar PPIs**: Descarga archivo JSON

## 🔧 Métodos de Detección

### EventBus (Automático)
```javascript
eventBus.on('shape.added', (event) => {
  if (this.isPPIElement(event.element)) {
    this.generatePPITemplate(event.element);
  }
});
```

### DOM Observer (Automático)
```javascript
const observer = new MutationObserver((mutations) => {
  // Detecta elementos añadidos al DOM
  // Busca patrones PPI en ID y clases
});
```

### Análisis Manual (Por demanda)
```javascript
// Botón "Generar PPI Automático" en pestaña "Análisis Canvas"
generatePPIFromCanvas() {
  const elements = this.analyzeCanvasElements();
  const template = this.createTemplateFromCanvas(null, elements);
  this.populateFormWithTemplate(template);
}
```

## 📊 Estructura de Datos PPI

```javascript
{
  id: 'ppi_timestamp_random',
  process: 'Nombre del proceso',
  businessObjective: 'Objetivo de negocio',
  measureDefinition: {
    type: 'derived|time|count|state|data|aggregated',
    definition: 'Definición detallada de la medida'
  },
  target: 'Objetivo cuantificable',
  scope: 'daily|weekly|monthly|quarterly|yearly',
  source: 'Fuente de datos',
  responsible: 'Responsable del indicador',
  informed: ['Lista', 'de', 'informados'],
  comments: 'Comentarios adicionales',
  createdAt: 'ISO timestamp',
  updatedAt: 'ISO timestamp'
}
```

## 🎨 Interfaz de Usuario

### Pestañas:
1. **Lista de PPIs**: Vista de todos los PPIs creados
2. **Formulario**: Creación/edición manual de PPIs
3. **Análisis Canvas**: Análisis del canvas y generación automática

### Acciones:
- ➕ **Crear**: Formulario limpio para nuevo PPI
- 👁️ **Ver**: Modal con detalles completos
- ✏️ **Editar**: Formulario prellenado para modificar
- 🗑️ **Eliminar**: Con confirmación
- 📥 **Exportar**: Descarga JSON con todos los PPIs

## 🚀 Flujo de Trabajo

1. **Usuario dibuja elementos en el canvas**
2. **Sistema detecta automáticamente elementos PPI**
3. **Se genera plantilla automáticamente**
4. **Usuario puede revisar y ajustar en el formulario**
5. **PPI se guarda y aparece en la lista**
6. **Usuario puede exportar todos los PPIs**

## 🔄 Integraciones

- **BPMN.js**: EventBus para detectar cambios
- **DOM API**: MutationObserver para cambios en HTML
- **LocalStorage**: Persistencia de datos
- **CSS**: Estilos responsive y profesionales
