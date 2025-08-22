# RASCI System

## Estructura de Archivos

```
rasci/
├── core/                     # Funcionalidades básicas del sistema RASCI
│   ├── main.js              # Punto de entrada principal (inicialización del panel)
│   ├── matrix-manager.js    # Gestión de la matriz RASCI (renderizado, edición de roles)
│   └── styles.js            # Estilos CSS para toda la interfaz RASCI
│
└── mapping/                  # Funcionalidades de mapeo BPMN a RALph
    ├── index.js             # Índice de exportaciones principales
    ├── core-functions.js    # Funciones básicas de mapeo (crear roles, buscar elementos)
    ├── main-mapper.js       # Lógica principal de mapeo RASCI → RALph
    ├── auto-mapper.js       # Mapeo automático y gestión de eventos
    ├── element-manager.js   # Gestión de elementos especiales (flujos, reconexiones)
    └── cleanup-utils.js     # Utilidades de limpieza (elementos huérfanos, roles no usados)
```

## Descripción de Módulos

### Core (Sistema Base)
- **main.js**: Inicialización del panel RASCI, gestión de pestañas, eventos globales
- **matrix-manager.js**: Renderizado de la matriz, gestión de roles, eventos de teclado
- **styles.js**: Todos los estilos CSS para la interfaz RASCI

### Mapping (Mapeo BPMN → RALph)
- **index.js**: Punto de entrada que exporta todas las funciones de mapeo
- **core-functions.js**: Funciones básicas (crear roles RALph, buscar elementos BPMN)
- **main-mapper.js**: Algoritmo principal de transformación RASCI → RALph
- **auto-mapper.js**: Sistema de mapeo automático con debouncing
- **element-manager.js**: Gestión de elementos especiales y restauración de flujos
- **cleanup-utils.js**: Limpieza de elementos no utilizados

## Importaciones

Para usar el sistema RASCI desde otros archivos:

```javascript
// Para inicializar el panel principal
import { initRasciPanel } from './rasci/core/main.js';

// Para funciones de mapeo
import { 
  executeSimpleRasciMapping, 
  initRasciMapping 
} from './rasci/mapping/index.js';
```

## Funcionalidades Principales

1. **Gestión de Matriz**: Crear, editar y eliminar roles y responsabilidades
2. **Mapeo Automático**: Conversión automática de matriz RASCI a diagrama RALph
3. **Mapeo Manual**: Control manual del proceso de transformación
4. **Limpieza**: Eliminación automática de elementos no utilizados
5. **Persistencia**: Guardado automático en localStorage

## Archivos Eliminados

Los siguientes archivos fueron reorganizados y ya no se necesitan:
- `rasci-core.js` → `rasci/core/main.js`
- `rasci-matrix.js` → `rasci/core/matrix-manager.js`
- `rasci-styles.js` → `rasci/core/styles.js`
- `rasci-mapping-clean.js` → `rasci/mapping/index.js`
- `rasci-mapping-core.js` → `rasci/mapping/core-functions.js`
- `rasci-mapping-main.js` → `rasci/mapping/main-mapper.js`
- `rasci-mapping-auto.js` → `rasci/mapping/auto-mapper.js`
- `rasci-mapping-elements.js` → `rasci/mapping/element-manager.js`
- `rasci-mapping-cleanup.js` → `rasci/mapping/cleanup-utils.js`
