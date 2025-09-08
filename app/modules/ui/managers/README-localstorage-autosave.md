# LocalStorage AutoSave Manager

## Descripción

El `LocalStorageAutoSaveManager` es un sistema de autoguardado basado en localStorage que reemplaza el sistema anterior basado en cookies. Proporciona funcionalidad de autoguardado temporal con TTL (Time To Live) y debouncing para optimizar el rendimiento.

## Características

### ✅ Funcionalidades Implementadas

1. **Almacenamiento en localStorage**
   - Clave: `"draft:multinotation"`
   - Estructura: `{ value: data, savedAt: timestamp }`

2. **TTL (Time To Live)**
   - Duración por defecto: 3 horas
   - Configurable: `setTTL(hours)`
   - Limpieza automática de datos expirados

3. **Debouncing**
   - Delay por defecto: 500ms
   - Configurable: `setDebounceDelay(ms)`
   - Evita guardados excesivos

4. **Verificación de borradores existentes**
   - Al cargar la página, verifica si hay un borrador válido
   - Muestra notificación si encuentra un borrador
   - Opción de restaurar o descartar

5. **Autoguardado automático**
   - Frecuencia por defecto: 5 segundos
   - Configurable: `setAutoSaveFrequency(ms)`
   - Mínimo 2 segundos entre guardados

6. **Guardado antes de salir**
   - Listener `beforeunload`
   - Guarda automáticamente al cerrar la página

7. **Estado completo del proyecto**
   - BPMN: XML, canvas, selección, zoom, posición
   - PPIs: Indicadores y relaciones
   - RASCI: Roles y matriz de datos
   - Paneles: Configuración y layout

## Uso

### Inicialización Automática

El manager se inicializa automáticamente al cargar la aplicación:

```javascript
// Se registra en ServiceRegistry automáticamente
const manager = getServiceRegistry().get('localStorageAutoSaveManager');
```

### Métodos Públicos

```javascript
// Forzar guardado manual
await manager.forceSave();

// Forzar restauración manual
await manager.forceRestore();

// Limpiar estado guardado
manager.clearSavedState();

// Obtener información del estado
const info = manager.getStateInfo();

// Configurar TTL (en horas)
manager.setTTL(6); // 6 horas

// Configurar delay de debounce (en ms)
manager.setDebounceDelay(1000); // 1 segundo

// Configurar frecuencia de autoguardado (en ms)
manager.setAutoSaveFrequency(10000); // 10 segundos
```

### Información del Estado

```javascript
const info = manager.getStateInfo();
// Retorna:
{
  lastSave: timestamp,        // Último guardado
  bpmnSize: number,          // Tamaño del XML BPMN
  ppiCount: number,          // Número de PPIs
  rasciRoles: number,        // Número de roles RASCI
  storageSize: number,       // Tamaño total en localStorage
  ttlRemaining: number       // Tiempo restante hasta expiración
}
```

## UI Component

### LocalStorageAutoSaveUI

Componente de interfaz que proporciona controles visuales para el autoguardado:

- **Toggle**: Activar/desactivar autoguardado
- **Timestamp**: Último guardado (formato relativo)
- **Botón limpiar**: Eliminar borrador guardado
- **Botón guardar**: Forzar guardado manual
- **Botón información**: Mostrar detalles del estado

### Posición

El componente se posiciona en la esquina superior derecha de la pantalla.

### Notificaciones

- **Borrador disponible**: Al cargar página con borrador válido
- **Guardado exitoso**: Al completar guardado manual
- **Error**: Al fallar operaciones
- **Borrador eliminado**: Al limpiar estado

## Configuración

### Valores por Defecto

```javascript
{
  STORAGE_KEY: "draft:multinotation",
  TTL_MS: 3 * 60 * 60 * 1000,        // 3 horas
  autoSaveFrequency: 5000,           // 5 segundos
  minSaveInterval: 2000,             // 2 segundos mínimo
  debounceDelay: 500                 // 500ms debounce
}
```

### Eventos que Disparan Autoguardado

- `element.added`
- `element.changed`
- `element.removed`
- `canvas.viewbox.changed`
- `canvas.resized`
- `selection.changed`

## Ventajas sobre Cookies

1. **Mayor capacidad**: localStorage tiene ~5-10MB vs 4KB de cookies
2. **Mejor rendimiento**: No se envían en cada request HTTP
3. **Más control**: TTL configurable y gestión manual
4. **Mejor UX**: Notificaciones y controles visuales
5. **Privacidad**: Se borra automáticamente después del TTL

## Migración desde Cookies

El sistema reemplaza completamente el `CookieAutoSaveManager`:

1. ✅ Import actualizado en `app.js`
2. ✅ Referencias actualizadas en `panel-manager.js`
3. ✅ UI component integrado
4. ✅ ServiceRegistry actualizado

## Debugging

### Logs de Consola

```javascript
// Habilitar logs detallados
console.log('💾 Inicializando LocalStorage AutoSave Manager...');
console.log('📂 Cargando estado desde localStorage...');
console.log('✅ Estado guardado en localStorage exitosamente');
console.log('⏰ Datos expirados, eliminando del localStorage');
```

### Verificar Estado

```javascript
// En consola del navegador
const manager = getServiceRegistry().get('localStorageAutoSaveManager');
console.log(manager.getStateInfo());
console.log(localStorage.getItem('draft:multinotation'));
```

## Consideraciones de Seguridad

1. **TTL automático**: Los datos se borran automáticamente después de 3 horas
2. **Solo datos del proyecto**: No se almacena información sensible
3. **localStorage local**: Los datos no se envían al servidor
4. **Limpieza manual**: Opción de limpiar borradores manualmente

## Compatibilidad

- ✅ Chrome/Chromium
- ✅ Firefox
- ✅ Safari
- ✅ Edge
- ⚠️ IE11 (limitado)

## Troubleshooting

### Problemas Comunes

1. **No se guarda automáticamente**
   - Verificar que `autoSaveEnabled = true`
   - Revisar logs de consola para errores

2. **No se restaura al cargar**
   - Verificar TTL (datos pueden haber expirado)
   - Comprobar que localStorage esté habilitado

3. **UI no aparece**
   - Verificar que el componente se importe correctamente
   - Revisar ServiceRegistry

4. **Errores de localStorage**
   - Verificar espacio disponible
   - Comprobar permisos del navegador
