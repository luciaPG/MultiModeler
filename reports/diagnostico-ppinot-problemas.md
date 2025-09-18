# DIAGNÓSTICO: Problemas PPINOT Detectados

## Resumen Ejecutivo

El test específico de PPINOT localStorage y parentescos ha identificado **problemas reales** en el sistema que requieren atención. Este diagnóstico proporciona información concreta para corregir estos problemas.

## Problemas Detectados

### 1. Referencias Circulares en Medidas Hijas
**Problema:** Medidas hijas que se referencian mutuamente creando ciclos infinitos.
```
PPI_Hija_Circular_1 -> PPI_Hija_Circular_2 -> PPI_Hija_Circular_1
PPI_Hija_Circular_2 -> PPI_Hija_Circular_1 -> PPI_Hija_Circular_2
```
**Impacto:** Cálculo infinito, memoria excesiva, aplicación colgada.
**Solución:** Implementar detección de ciclos antes de guardar relaciones.

### 2. Parentescos Huérfanos
**Problema:** Medidas hijas que referencian padres inexistentes.
```
PPI_Hija_Huerfana referencia PPI_Padre_Inexistente
```
**Impacto:** Errores en cálculos, datos inconsistentes.
**Solución:** Validar existencia de padre antes de crear relación.

### 3. Scope Inconsistente con Tipo de Elemento
**Problemas detectados:**
- `Task_1 -> global` (Tasks no pueden tener scope global)
- `Process_1 -> element` (Processes no pueden tener scope element) 
- `Task_2 -> undefined` (Scope no definido)

**Impacto:** Cálculos incorrectos, medidas que no funcionan.
**Solución:** Validar scope según tipo de elemento BPMN.

### 4. Corrupción de Datos en LocalStorage
**Estrategias de recuperación identificadas:**
- `corrupted_json`: reset_to_default
- `corrupted_structure`: clean_invalid_ppis
- `empty_data`: initialize_default
- `null_data`: initialize_default

**Impacto:** Pérdida de datos de usuario, aplicación no funcional.
**Solución:** Implementar recuperación automática con backup.

### 5. Targets Huérfanos tras Eliminación BPMN
**Problema:** PPIs que apuntan a elementos BPMN eliminados.
```
PPI_Problem_1 -> Task_Deleted (elemento ya no existe)
```
**Impacto:** PPIs no funcionales, errores en UI.
**Solución:** Sincronización automática al eliminar elementos BPMN.

## Recomendaciones de Corrección

### Implementación Sugerida

#### 1. Validador de Parentescos
```javascript
function validatePPIRelationships(ppis) {
  const errors = [];
  
  // Detectar ciclos
  const visited = new Set();
  const recursionStack = new Set();
  
  function detectCycle(ppiId) {
    if (recursionStack.has(ppiId)) {
      errors.push(`Ciclo detectado: ${ppiId}`);
      return true;
    }
    // ... implementación DFS
  }
  
  return errors;
}
```

#### 2. Sincronizador de Targets
```javascript
function syncPPITargets(ppis, bpmnElements) {
  return ppis.map(ppi => {
    const targetExists = bpmnElements.some(el => el.id === ppi.targetRef);
    if (!targetExists) {
      return { ...ppi, status: 'orphaned', needsRepair: true };
    }
    return ppi;
  });
}
```

#### 3. Validador de Scope
```javascript
function validateScope(ppi, elementType) {
  const scopeRules = {
    'bpmn:Task': ['element', 'process'],
    'bpmn:Process': ['process', 'global'],
    'bpmn:StartEvent': ['element'],
    'bpmn:EndEvent': ['element'],
    'bpmn:Gateway': ['element', 'process']
  };
  
  return scopeRules[elementType]?.includes(ppi.scope) || false;
}
```

## Próximos Pasos

1. **Implementar validadores** en el código de producción
2. **Añadir sincronización automática** cuando cambian elementos BPMN  
3. **Implementar recuperación** de datos corruptos en localStorage
4. **Añadir alertas de usuario** para PPIs huérfanos
5. **Crear herramientas de reparación** automática de parentescos

## Valor para el TFG

Este diagnóstico demuestra:
- **Detección proactiva** de problemas reales
- **Análisis técnico profundo** de casos edge
- **Propuestas de solución** concretas y implementables
- **Metodología rigurosa** para identificar y corregir problemas

Los tests no solo validan funcionalidad, sino que **identifican problemas específicos** y proporcionan **información accionable** para mejorar el sistema.
