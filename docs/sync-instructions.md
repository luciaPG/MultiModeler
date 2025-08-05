# PPI Synchronization System - Debugging and Testing Guide

## Problema Resuelto

El sistema de sincronización PPI ahora incluye detección automática mejorada para limpiar los campos `target` y `scope` cuando un elemento deja de ser hijo de un PPI.

## Correcciones Implementadas

### 1. Mejoras en `ppi-sync-manager.js`

#### Event Handlers Mejorados
- **`handleDragEnd`** y **`handleDropEnd`**: Ahora actualizan el cache antes de verificar cambios
- **Delay aumentado**: De 50ms a 100ms para asegurar que el DOM se actualice completamente
- **Actualización de cache**: Se ejecuta `updateElementCache()` antes de las verificaciones

#### Métodos de Detección Mejorados
- **`checkElementParentChange`**: Ahora incluye limpieza directa cuando un elemento pierde su padre PPI
- **`checkOrphanedElements`**: **NUEVO** - Ahora itera sobre el `elementCache` para encontrar elementos que *fueron* hijos PPI pero ya no lo son
- **`checkAllParentChanges`**: **NUEVO** - Ahora llama automáticamente a `checkOrphanedElements()` después de verificar cambios de padre
- **`updateElementCache`**: **NUEVO** - Preserva información histórica de elementos que tenían padres PPI pero ya no existen
- **`clearChildInfoFromAllPPIs`**: Corregida la lógica de comparación para elementos target/scope

#### Nuevas Funcionalidades
- **Preservación Histórica**: El cache ahora mantiene información de elementos que ya no existen pero tenían padres PPI
- **Detección de Elementos Eliminados**: Automáticamente limpia referencias a elementos eliminados que tenían padres PPI
- **Cache Inteligente**: Distingue entre elementos actuales (`exists: true`) e históricos (`exists: false`)

### 2. Nuevas Herramientas de Debug

#### `debug-sync.js`
- **`PPISyncDebugger`**: Clase para diagnóstico completo del sistema
- **`forceAutomaticDetection()`**: Fuerza la actualización y verificación automática

#### `test-sync.js`
- **`PPISyncTester`**: Clase para pruebas automatizadas del sistema
- **`testAutomaticDetection()`**: Prueba específica de la detección automática

## Cómo Usar las Herramientas

### Diagnóstico del Problema

1. **Ejecutar diagnóstico completo**:
   ```javascript
   debugPPISync()
   ```

2. **Verificar estado del cache**:
   ```javascript
   // En la consola del navegador
   console.log(window.ppiManager.syncManager.elementCache)
   ```

3. **Forzar detección automática**:
   ```javascript
   forceAutomaticDetection()
   ```

### Pruebas Específicas

```javascript
// Prueba completa del sistema
testPPISync()

// Prueba específica de limpieza
testTargetScopeClearing()

// Prueba de detección automática (NUEVA - incluye verificación de cache histórico)
testAutomaticDetection()

// Prueba de elementos huérfanos
testOrphanedDetection()

// Prueba de cambios de padre
testParentChangeDetection()

// Prueba de actualización de UI
testUIUpdate()
```

## Interpretación de Resultados

### Logs de Debug
- **`🔍 [DEBUG]`**: Información de verificación
- **`🔄 [DEBUG]`**: Cambios detectados
- **`🎯 [DEBUG]`**: Acciones de limpieza
- **`✅`**: Operaciones exitosas
- **`❌`**: Errores

### Estados Esperados
1. **Cache actualizado**: El cache debe reflejar la estructura actual del canvas
2. **Cambios detectados**: Los logs deben mostrar cuando se detectan cambios de padre
3. **Limpieza ejecutada**: Los campos target/scope deben limpiarse cuando corresponda
4. **UI actualizada**: Las cards deben reflejar los cambios

## Comandos de Debug

### Diagnóstico Completo
```javascript
debugPPISync()
```
Ejecuta un diagnóstico completo del sistema de sincronización.

### Pruebas Específicas
```javascript
testPPISync()           // Prueba completa del sistema
testTargetScopeClearing() // Prueba específica de limpieza
testOrphanedDetection()   // Prueba de detección de huérfanos
testParentChangeDetection() // Prueba de detección de cambios de padre
testUIUpdate()          // Prueba de actualización de UI
testAutomaticDetection() // Prueba específica de detección automática
```

### Forzar Detección Automática
```javascript
forceAutomaticDetection()
```
Fuerza la actualización del cache y ejecuta todas las verificaciones automáticas.

## Pasos para Verificar la Solución

1. **Cargar el sistema**: Asegúrate de que todos los scripts estén cargados
2. **Crear un PPI con target/scope**: Coloca elementos target/scope dentro de un PPI
3. **Mover elementos fuera del PPI**: Arrastra los elementos target/scope fuera del PPI
4. **Verificar limpieza automática**: Los campos target/scope deben cambiar a "No definido"
5. **Ejecutar pruebas**: Usa los comandos de debug para verificar el funcionamiento

## Solución de Problemas

### Si la limpieza no funciona automáticamente:
1. Ejecuta `forceAutomaticDetection()`
2. Verifica los logs en la consola
3. Ejecuta `debugPPISync()` para diagnóstico completo

### Si hay errores en la consola:
1. Verifica que todos los scripts estén cargados
2. Ejecuta `testPPISync()` para identificar el problema específico
3. Revisa los logs de debug para más detalles

### Si la UI no se actualiza:
1. Ejecuta `testUIUpdate()`
2. Verifica que el elemento `#ppi-list` exista en el DOM
3. Fuerza una actualización con `window.ppiManager.ui.refreshPPIList()` 