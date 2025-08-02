# Módulo PPI Indicators

## Descripción

El módulo PPI (Process Performance Indicators) permite definir y gestionar indicadores de rendimiento de procesos utilizando lenguaje natural y formularios dinámicos. Se integra con el modelador BPMN para vincular PPIs con elementos del diagrama de proceso.

## Características Principales

### 1. Interfaz de Entrada Dual
- **Modo Plantilla**: Importación de archivos (.doc, .txt, .json) con PPIs estructurados
- **Modo Formulario**: Formulario dinámico con validación en tiempo real

### 2. Procesamiento de Lenguaje Natural
- Análisis automático de texto para extraer información de PPIs
- Validación de criterios SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Inferencia automática del tipo de medida

### 3. Tipos de Medida Soportados
- **Time Measure**: Medidas de tiempo entre eventos
- **Count Measure**: Conteo de elementos o eventos
- **State Condition**: Condiciones de estado
- **Data Measure**: Medidas basadas en datos específicos
- **Derived Measure**: Medidas calculadas
- **Aggregated Measure**: Medidas agregadas

### 4. Integración con BPMN
- Vinculación visual de PPIs con elementos del diagrama
- Menú contextual en elementos BPMN
- Resaltado de elementos vinculados
- Sincronización automática de cambios

## Estructura de Archivos

```
app/js/panels/ppi/
├── index.js                    # Gestor principal del módulo PPI
├── bpmn-integration.js         # Integración con modelador BPMN
├── natural-language-processor.js # Procesamiento de lenguaje natural
└── README.md                   # Esta documentación
```

## Uso

### 1. Crear un PPI desde Formulario

```javascript
// El formulario se maneja automáticamente
// Los datos se validan y se crea la estructura PPINOT
```

### 2. Importar PPIs desde Archivo

```javascript
// Arrastrar archivo o usar selector
// El sistema procesa automáticamente el contenido
```

### 3. Vincular con Elementos BPMN

```javascript
// Clic derecho en elemento BPMN
// Seleccionar "Vincular PPI"
// Elegir PPI de la lista
```

### 4. Visualizar PPIs

```javascript
// Pestaña "Visualización" muestra todos los PPIs
// Clic en PPI para ver detalles completos
```

## Estructura de Datos PPINOT

```json
{
  "id": "ppi_1234567890_abc123",
  "process": "Gestión de Incidencias",
  "businessObjective": "Reducir tiempo de resolución",
  "measureDefinition": {
    "type": "time",
    "definition": "Tiempo desde apertura hasta cierre",
    "fromEvent": "ticket abierto",
    "toEvent": "ticket resuelto",
    "timeUnit": "hours"
  },
  "target": "menos de 24h",
  "scope": "monthly",
  "source": "sistema de helpdesk",
  "responsible": "Jefe de soporte",
  "informed": ["Responsable TI"],
  "comments": "Indicador SLA crítico",
  "bpmnLink": {
    "fromEventId": "Activity_1a2b3c",
    "toEventId": "Activity_9z8y7x"
  },
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z"
}
```

## API del Módulo

### PPIManager

```javascript
// Crear instancia
const ppiManager = new PPIManager();

// Agregar PPI
ppiManager.addPPI(ppiData);

// Obtener PPIs
const ppis = ppiManager.ppis;

// Vincular con BPMN
ppiManager.linkToBpmnElement(ppiId, elementId, linkType);

// Exportar/Importar
const jsonData = ppiManager.exportPPIs();
ppiManager.importPPIs(jsonData);
```

### BpmnIntegration

```javascript
// Crear instancia
const bpmnIntegration = new BpmnIntegration(ppiManager, bpmnModeler);

// Obtener elementos vinculados
const linkedElements = bpmnIntegration.getLinkedElements(ppiId);

// Obtener información de elemento
const elementInfo = bpmnIntegration.getElementInfo(elementId);

// Exportar con PPIs
const exportData = bpmnIntegration.exportBpmnWithPPIs();
```

### NaturalLanguageProcessor

```javascript
// Crear instancia
const nlp = new NaturalLanguageProcessor();

// Procesar texto
const result = nlp.processText(text);

// Procesar archivo
const result = await nlp.processFile(file);

// Validar estructura
const validation = nlp.validatePPINOTStructure(data);

// Generar estructura PPINOT
const ppinotStructure = nlp.generatePPINOTStructure(processedData);
```

## Validación SMART

El sistema valida automáticamente que los PPIs cumplan con los criterios SMART:

- **S**pecific: Específico y claro
- **M**easurable: Medible y cuantificable
- **A**chievable: Alcanzable y realizable
- **R**elevant: Relevante para el negocio
- **T**ime-bound: Con límites temporales

## Persistencia

Los PPIs se guardan automáticamente en `localStorage` con la clave `'ppis'`. La estructura se mantiene sincronizada con los cambios en el modelo BPMN.

## Integración con el Sistema

El módulo se integra automáticamente con:

1. **Panel Manager**: Registro como panel disponible
2. **BPMN Modeler**: Vinculación de elementos
3. **Sistema de Eventos**: Sincronización de cambios
4. **Interfaz de Usuario**: Pestañas y controles

## Personalización

### Agregar Nuevos Tipos de Medida

```javascript
// En PPIManager.measureTypes
custom: {
  name: 'Custom Measure',
  icon: 'fas fa-cog',
  description: 'Medida personalizada',
  fields: ['customField1', 'customField2']
}
```

### Extender Validación

```javascript
// En NaturalLanguageProcessor
validateCustomCriteria(text) {
  // Lógica de validación personalizada
}
```

## Troubleshooting

### Problemas Comunes

1. **PPI no se guarda**: Verificar que `localStorage` esté disponible
2. **Vinculación BPMN no funciona**: Verificar que el modelador esté inicializado
3. **Procesamiento de texto falla**: Verificar formato del archivo de entrada

### Debug

```javascript
// Habilitar logs detallados
console.log('PPI Manager:', window.ppiManager);
console.log('BPMN Integration:', window.bpmnIntegration);
console.log('NLP Processor:', window.naturalLanguageProcessor);
```

## Contribución

Para contribuir al módulo:

1. Seguir las convenciones de nomenclatura (PascalCase para clases)
2. Mantener la compatibilidad con el sistema existente
3. Documentar nuevas funcionalidades
4. Incluir tests para nuevas características

## Licencia

Este módulo es parte del proyecto VisualPPINOT y sigue la misma licencia del proyecto principal. 