# Implementación de Tests para Criterios de Aceptación NFR

Este documento describe los tests implementados para validar cada uno de los criterios de aceptación de requisitos no funcionales (CA-NFR).

## Resumen de Implementación

| Criterio | Archivo de Test | Estado | Descripción |
|----------|----------------|---------|-------------|
| CA-NFR-01 | `performance-real.test.js` | ✅ Implementado | Carga de 500 elementos con percentil 95 |
| CA-NFR-02 | `performance-real.test.js` | ✅ Implementado | Latencia <150ms y sesión 10min sin bloqueos |
| CA-NFR-03 | `usability-real.test.js` | ✅ Implementado | 80% usuarios novatos exitosos en <5min |
| CA-NFR-04 | `autosave-latency-nfr.test.js` | ✅ Implementado | Autosave ≤2.5s y recuperación tras crash <30s |
| CA-NFR-05 | `e2e-critical-flows-nfr.test.js` | ✅ Implementado | 100% flujos E2E críticos en Chrome |
| CA-NFR-06 | `export-audit-nfr.test.js` | ✅ Implementado | Exports sin credenciales ni datos sensibles |
| CA-NFR-07 | `code-quality-nfr.test.js` | ✅ Implementado | ESLint, sin ciclos, ≥70% documentación |

---

## CA-NFR-01: Rendimiento de Carga (Percentil 95)

**Archivo:** `tests/8.4-non-functional/performance-real.test.js`

**Test:** `CA-NFR-01: debe cargar diagrama de 500 elementos en <8s (p95)`

### Validación
```javascript
- Carga diagrama con 500 elementos
- Ejecuta 20 mediciones para calcular estadísticas
- Calcula percentil 95 de tiempos de carga
- Valida: P95 < 8000ms
```

### Métricas Reportadas
- Percentil 95 (P95)
- Tiempo promedio
- Tiempo mínimo y máximo
- Todos los tiempos de ejecución

### Ejecución
```bash
npm test -- performance-real.test.js -t "CA-NFR-01"
```

---

## CA-NFR-02: Latencia de Interacción y Estabilidad

**Archivo:** `tests/8.4-non-functional/performance-real.test.js`

**Test:** `CA-NFR-02: latencia de interacción <150ms sin bloqueos durante 10min`

### Validación
```javascript
- Simula sesión de usuario de 10 minutos (30s en modo fast)
- Mide latencia de cada interacción (click, drag, zoom, etc.)
- Detecta bloqueos UI (latencia >150ms)
- Valida:
  * Latencia promedio < 150ms
  * Sin bloqueos UI detectados
  * ≥95% interacciones bajo umbral
```

### Métricas Reportadas
- Duración total de sesión
- Total de interacciones
- Latencia promedio y máxima
- Porcentaje bajo umbral
- Número de bloqueos detectados

### Modo Rápido vs Modo Real
- **FAST_MODE = true:** 30 segundos, interacciones cada 500ms (para CI)
- **FAST_MODE = false:** 10 minutos, interacciones cada 5s (test real)

### Ejecución
```bash
npm test -- performance-real.test.js -t "CA-NFR-02"
```

---

## CA-NFR-03: Usabilidad para Usuarios Novatos

**Archivo:** `tests/8.4-non-functional/usability-real.test.js`

**Test:** `CA-NFR-03: 80% usuarios novatos crean diagrama básico en <5min`

### Validación
```javascript
- Simula 10 usuarios novatos independientes
- Cada usuario completa flujo de 8 pasos:
  1. Abrir aplicación
  2. Encontrar panel BPMN
  3. Crear evento inicio
  4. Crear tarea
  5. Conectar elementos
  6. Crear evento fin
  7. Conectar a fin
  8. Guardar diagrama
- Considera variabilidad de habilidad (factor 0.7-1.3)
- Simula probabilidad de abandono
- Valida:
  * Tasa de éxito ≥ 80%
  * Tiempo promedio (exitosos) < 5 minutos
```

### Métricas Reportadas
- Total usuarios simulados
- Usuarios exitosos
- Tasa de éxito (porcentaje)
- Tiempo promedio de usuarios exitosos
- Tiempo promedio global
- Detalle por usuario (pasos, tiempo, éxito/fallo)

### Ejecución
```bash
npm test -- usability-real.test.js -t "CA-NFR-03"
```

---

## CA-NFR-04: Autosave y Recuperación tras Crash

**Archivo:** `tests/8.4-non-functional/autosave-latency-nfr.test.js`

**Tests:**
1. `autosave completes within <= 2.5s window from first change`
2. `CA-NFR-04: proyecto se recupera completamente en <30s tras crash`

### Validación Test 1: Autosave
```javascript
- Simula cambio en proyecto
- Espera intervalo de autosave (2s)
- Valida que draft se guarda en localStorage
- Valida que saveProject es llamado
```

### Validación Test 2: Recuperación tras Crash
```javascript
- Crea proyecto con datos significativos:
  * 50 elementos BPMN
  * 20 medidas PPINOT
  * 30 asignaciones RASCI
- Guarda vía autosave
- Simula crash (reinicio)
- Recupera desde localStorage
- Mide tiempo de recuperación
- Valida integridad de datos
- Valida: Tiempo recuperación < 30s
```

### Métricas Reportadas
- Tiempo de recuperación
- Elementos recuperados por tipo
- Integridad de datos

### Ejecución
```bash
npm test -- autosave-latency-nfr.test.js
```

---

## CA-NFR-05: Flujos E2E Críticos en Chrome

**Archivo:** `tests/8.4-non-functional/e2e-critical-flows-nfr.test.js`

**Tests:** 5 flujos críticos + validación final

### Flujos Validados
1. **Crear proyecto BPMN completo** (9 pasos)
   - Init, crear diagrama, elementos, conectar, validar, guardar

2. **Agregar y gestionar PPIs** (7 pasos)
   - Abrir panel, crear medidas, asignar, validar, guardar

3. **Crear y validar matriz RASCI** (8 pasos)
   - Abrir panel, roles, asignaciones RACI, validar, guardar

4. **Exportar proyecto completo** (5 pasos)
   - Preparar, exportar XML, SVG, JSON, validar

5. **Cargar proyecto existente** (8 pasos)
   - Seleccionar, parsear, restaurar BPMN/PPINOT/RASCI, validar, renderizar

### Validación Final
```javascript
- Ejecuta los 5 flujos críticos
- Cuenta flujos exitosos vs totales
- Valida: Tasa de éxito = 100%
```

### Métricas Reportadas
- Total flujos ejecutados
- Flujos exitosos
- Tasa de éxito
- Errores por flujo (si los hay)

### Ejecución
```bash
npm test -- e2e-critical-flows-nfr.test.js
```

---

## CA-NFR-06: Seguridad de Exports

**Archivo:** `tests/8.4-non-functional/export-audit-nfr.test.js`

**Test:** `project export (mmproject) does not include sensitive content`

### Validación
```javascript
- Crea proyecto simulado exportable
- Serializa a JSON
- Busca patrones sensibles:
  * password / secret / token
  * Bearer tokens
  * Rutas absolutas Windows (C:\\)
  * Rutas absolutas Unix (/home/, etc.)
- Valida: Sin contenido sensible
```

### Patrones Detectados
```regex
/password\s*[:=]/i
/secret\s*[:=]/i
/token\s*[:=]/i
/Bearer\s+[A-Za-z0-9\-_.]+/i
/C:\\\\/i
/\\\\Users\\/i
/\bHOME=\//i
/\b\/[A-Za-z]+\/[A-Za-z0-9_.\-]+\//
```

### Ejecución
```bash
npm test -- export-audit-nfr.test.js
```

---

## CA-NFR-07: Análisis Estático y Calidad de Código

**Archivo:** `tests/8.4-non-functional/code-quality-nfr.test.js`

**Tests:**
1. `CA-NFR-07.1: No debe haber errores de ESLint`
2. `CA-NFR-07.2: No debe haber ciclos en dependencias de módulos`
3. `CA-NFR-07.3: Al menos 70% del código debe tener documentación JSDoc`

### Validación Test 1: ESLint
```javascript
- Ejecuta: npx eslint app/ --format json
- Cuenta errores y warnings
- Reporta archivos con errores
- Valida: 0 errores (warnings permitidos)
```

### Validación Test 2: Ciclos de Dependencias
```javascript
- Construye grafo de dependencias entre módulos
- Extrae imports ES6 de cada archivo
- Detecta ciclos usando DFS (Depth-First Search)
- Reporta ciclos encontrados
- Valida: 0 ciclos
```

### Validación Test 3: Cobertura JSDoc
```javascript
- Escanea todos los archivos .js en app/
- Cuenta funciones y clases
- Detecta bloques JSDoc (/** ... */)
- Calcula cobertura: documentados / totales
- Reporta archivos con <70% cobertura
- Valida: Cobertura global ≥ 70%
```

### Métricas Reportadas
- **ESLint:** Archivos analizados, errores, warnings
- **Ciclos:** Módulos analizados, ciclos detectados, lista de ciclos
- **JSDoc:** Funciones/clases totales y documentadas, cobertura por archivo y global

### Ejecución
```bash
npm test -- code-quality-nfr.test.js
```

---

## Ejecución de Todos los Tests NFR

### Ejecutar todos los tests CA-NFR
```bash
npm test -- tests/8.4-non-functional/
```

### Ejecutar test específico
```bash
# CA-NFR-01
npm test -- performance-real.test.js -t "CA-NFR-01"

# CA-NFR-02
npm test -- performance-real.test.js -t "CA-NFR-02"

# CA-NFR-03
npm test -- usability-real.test.js -t "CA-NFR-03"

# CA-NFR-04
npm test -- autosave-latency-nfr.test.js

# CA-NFR-05
npm test -- e2e-critical-flows-nfr.test.js

# CA-NFR-06
npm test -- export-audit-nfr.test.js

# CA-NFR-07
npm test -- code-quality-nfr.test.js
```

---

## Configuración de Modos de Ejecución

### Modo Rápido (CI/CD)
Para tests de integración continua, algunos tests tienen modo acelerado:

```javascript
// CA-NFR-02
const FAST_MODE = true;  // 30s en lugar de 10min

// CA-NFR-03  
const FAST_MODE = true;  // Acelera 50x las simulaciones
```

### Modo Real (Validación Completa)
Para validación completa antes de release:

```javascript
const FAST_MODE = false; // Duración real de tests
```

---

## Interpretación de Resultados

### ✅ Test Exitoso
```
✅ CA-NFR-XX CUMPLIDO: [descripción del resultado]
```

### ❌ Test Fallido
```
Expected: [valor esperado]
Received: [valor actual]
```

### Logs Detallados
Cada test genera logs con:
- 📊 Métricas numéricas
- ✅ Pasos exitosos
- ⚠️ Advertencias
- ❌ Errores

---

## Mejoras Futuras

### Para Producción Completa
1. **CA-NFR-01/02:** Integrar Puppeteer para mediciones reales en navegador
2. **CA-NFR-03:** Realizar estudios con usuarios reales
3. **CA-NFR-05:** Ejecutar en múltiples navegadores (Chrome, Firefox, Safari, Edge)
4. **CA-NFR-07:** Integrar con herramientas de análisis estático avanzadas

### Automatización CI/CD
```yaml
# .github/workflows/nfr-tests.yml
- name: Run NFR Tests
  run: npm test -- tests/8.4-non-functional/
  
- name: Check Test Coverage
  run: npm run tests -- --coverage
```

---

## Soporte y Mantenimiento

Para modificar umbrales o configuraciones:

1. **Editar constantes en cada test:**
   ```javascript
   const P95_THRESHOLD_MS = 8000;
   const LATENCY_THRESHOLD_MS = 150;
   const SUCCESS_THRESHOLD = 0.80;
   // etc.
   ```

2. **Ajustar modos de ejecución:**
   ```javascript
   const FAST_MODE = true/false;
   ```

3. **Modificar número de muestras:**
   ```javascript
   const SAMPLE_SIZE = 20;
   const NUM_USERS = 10;
   ```

---

**Fecha de implementación:** Octubre 2025  
**Versión:** 1.0.0  
**Autor:** Sistema de Testing Automatizado
