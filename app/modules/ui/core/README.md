# Sistema de Comunicación Centralizado

## 🎯 Objetivo

Reemplazar el uso de variables y funciones globales en `window` con un sistema de comunicación centralizado y modular que mantenga la arquitectura de **monolito modular**.

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────────────────────────┐
│                    Communication System                     │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  EventBus   │  │ServiceRegistry│  │ModuleBridge│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │ PPI Adapter │  │RASCI Adapter│  │Window Adapter│         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │    PPIs     │  │    RASCI    │  │   RALPH     │         │
│  │   Module    │  │   Module    │  │   Module    │         │
│  └─────────────┘  └─────────────┘  └─────────────┘         │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Componentes

### 1. **EventBus** (`event-bus.js`)
- Sistema de eventos centralizado
- Reemplaza la comunicación directa entre módulos
- Maneja suscripciones y publicaciones de eventos

### 2. **ServiceRegistry** (`ServiceRegistry.js`)
- Registro centralizado de servicios
- Permite registrar y obtener servicios por nombre
- Mantiene metadatos y descripciones de servicios

### 3. **ModuleBridge** (`ModuleBridge.js`)
- Puente de comunicación entre módulos
- Gestiona modeladores (BPMN, RALPH)
- Maneja datos compartidos entre módulos

### 4. **Adaptadores Específicos**
- **PPIAdapter**: Para comunicación del módulo PPIs
- **RASCIAdapter**: Para comunicación del módulo RASCI
- **WindowCompatibilityAdapter**: Para migración gradual desde `window`

## 🚀 Uso Básico

### Inicialización

```javascript
import { initializeCommunicationSystem } from './modules/ui/core/CommunicationSystem.js';

// Inicializar el sistema completo
await initializeCommunicationSystem();
```

### Migración Gradual

#### ❌ ANTES (Mala práctica)
```javascript
// Acceder al modelador BPMN
const modeler = window.bpmnModeler;

// Acceder a datos RASCI
const matrixData = window.rasciMatrixData;

// Llamar funciones globales
window.updateMatrixFromDiagram();
```

#### ✅ DESPUÉS (Buena práctica)
```javascript
import rasciAdapter from './modules/rasci/RASCIAdapter.js';

// Obtener el modelador BPMN
const modeler = getServiceRegistry() && getServiceRegistry().get('BPMNModeler');

// Obtener datos RASCI
const matrixData = rasciAdapter.getMatrixData();

// Publicar evento en EventBus
getServiceRegistry() && getServiceRegistry().get('EventBus') && getServiceRegistry().get('EventBus').publish('rasci.matrix.update.fromDiagram', {});
```

## 🔄 Migración por Módulos

### PPIs Module

```javascript
import ppiAdapter from './modules/ppis/PPIAdapter.js';

// Obtener modelador BPMN
const modeler = ppiAdapter.getBpmnModeler();

// Obtener datos RASCI
const rasciData = ppiAdapter.getRasciData();

// Comunicarse con RASCI
const result = await ppiAdapter.communicateWithRasci('updateMatrix', {});
```

### RASCI Module

```javascript
import rasciAdapter from './modules/rasci/RASCIAdapter.js';

// Obtener modelador BPMN
const modeler = rasciAdapter.getBpmnModeler();

// Obtener tareas BPMN
const tasks = rasciAdapter.getBpmnTasks();

// Detectar roles RALPH
const roles = rasciAdapter.detectRalphRoles();

// Actualizar datos
rasciAdapter.updateMatrixData(matrixData);
rasciAdapter.updateRoles(roles);
```

## 🌉 Comunicación entre Módulos

### PPIs → RASCI
```javascript
// PPIs quiere sincronizar con RASCI
const result = await ppiAdapter.syncWithRasci({
  ppiId: 'example-ppi',
  taskName: 'Example Task'
});
```

### RASCI → PPIs
```javascript
// RASCI quiere sincronizar con PPIs
const result = await rasciAdapter.syncWithPPIs({
  matrixData: { 'Task1': { 'Role1': 'R' } },
  roles: ['Role1', 'Role2']
});
```

## 🔧 Servicios Registrados

### Servicios Core
- `communicationSystem`: Sistema de comunicación principal
- `eventBus`: Sistema de eventos
- `serviceRegistry`: Registro de servicios
- `moduleBridge`: Puente entre módulos

### Servicios de Adaptadores
- `ppiAdapter`: Adaptador para PPIs
- `rasciAdapter`: Adaptador para RASCI
- `windowAdapter`: Adaptador de compatibilidad

### Servicios de Modeladores
- `getModeler`: Obtener modelador por tipo
- `getBpmnModeler`: Obtener modelador BPMN
- `getRalphModeler`: Obtener modelador RALPH

## 📊 Eventos del Sistema

### Eventos de Inicialización
- `communication.system.initialized`: Sistema inicializado
- `modeler.available`: Modelador disponible
- `module.available`: Módulo disponible

### Eventos de Datos
- `data.updated`: Datos actualizados
- `data.shared`: Datos compartidos
- `data.requested`: Datos solicitados

### Eventos de Comunicación
- `module.communication`: Comunicación entre módulos
- `module.response`: Respuesta de módulo
- `module.error`: Error en comunicación

## 🐛 Debugging

### Debug del Sistema Completo
```javascript
import communicationSystem from './modules/ui/core/CommunicationSystem.js';

// Debug completo
communicationSystem.debug();

// Obtener estadísticas
const stats = communicationSystem.getStats();
console.log('Stats:', stats);
```

### Debug de Adaptadores
```javascript
import ppiAdapter from './modules/ppis/PPIAdapter.js';
import rasciAdapter from './modules/rasci/RASCIAdapter.js';

// Estado de adaptadores
console.log('PPI Adapter Status:', ppiAdapter.getStatus());
console.log('RASCI Adapter Status:', rasciAdapter.getStatus());
```

## 🔄 Migración Automática

### Migrar Funciones Específicas
```javascript
import communicationSystem from './modules/ui/core/CommunicationSystem.js';

// Migrar función específica
communicationSystem.migrateFunction('updateMatrixFromDiagram', () => {
  return rasciAdapter.updateMatrixData({});
});

// Verificar migración
const isMigrated = communicationSystem.isFunctionMigrated('updateMatrixFromDiagram');
```

### Migración Automática Completa
```javascript
// El sistema migra automáticamente las funciones más comunes
await communicationSystem.initialize();
```

## 📋 Checklist de Migración

### Para PPIs Module
- [ ] Reemplazar `window.modeler` → `ppiAdapter.getBpmnModeler()`
- [ ] Reemplazar `window.ppiManager` → `ppiAdapter.getPPIManager()`
- [ ] Reemplazar `window.rasciMatrixData` → `ppiAdapter.getRasciData()`
- [ ] Usar `ppiAdapter.communicateWithRasci()` para comunicación

### Para RASCI Module
- [ ] Reemplazar `window.bpmnModeler` → `rasciAdapter.getBpmnModeler()`
- [ ] Reemplazar `window.rasciMatrixData` → `rasciAdapter.getMatrixData()`
- [ ] Reemplazar `window.rasciRoles` → `rasciAdapter.getRoles()`
- [ ] Usar `rasciAdapter.updateMatrixData()` para actualizaciones
- [ ] Usar `rasciAdapter.communicateWithPPIs()` para comunicación

### Para RALPH Module
- [ ] Registrar modelador RALPH en ModuleBridge
- [ ] Crear adaptador específico si es necesario
- [ ] Usar eventos para comunicación

## 🎯 Beneficios

### ✅ Ventajas del Nuevo Sistema
1. **Modularidad**: Cada módulo tiene su propio adaptador
2. **Testabilidad**: Fácil de mockear y testear
3. **Mantenibilidad**: Código más limpio y organizado
4. **Escalabilidad**: Fácil agregar nuevos módulos
5. **Debugging**: Mejor trazabilidad de eventos
6. **Compatibilidad**: Migración gradual sin romper funcionalidad

### ❌ Problemas del Sistema Anterior
1. **Acoplamiento**: Dependencias directas en `window`
2. **Testing**: Difícil de testear
3. **Mantenimiento**: Código difícil de mantener
4. **Debugging**: Difícil rastrear problemas
5. **Escalabilidad**: Difícil agregar nuevos módulos

## 🚀 Próximos Pasos

1. **Migrar módulos gradualmente**: Empezar con PPIs y RASCI
2. **Crear adaptadores específicos**: Para RALPH y otros módulos
3. **Agregar tests**: Para el nuevo sistema de comunicación
4. **Documentar APIs**: De cada adaptador y servicio
5. **Optimizar performance**: Si es necesario
6. **Remover window**: Una vez completada la migración

## 📚 Ejemplos

Ver `MigrationExample.js` para ejemplos completos de migración y uso del sistema.

