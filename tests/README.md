# 📋 Sistema de Testing - MNModeler

Este documento describe el sistema completo de testing implementado para el proyecto MNModeler, organizado por sprints según la metodología de desarrollo.

## 🚀 Comandos Disponibles

### Comandos Básicos
```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage

# Ejecutar tests en modo watch
npm run test:watch
```

### Comandos por Sprint
```bash
# Ejecutar tests de un sprint específico
npm run test:sprint1  # Validadores BPMN y persistencia
npm run test:sprint2  # Sincronización BPMN-PPINOT-RALPH
npm run test:sprint3  # Tests RASCI y detección de conflictos
npm run test:sprint4  # BPMN avanzado y rendimiento
npm run test:sprint5  # Integración y benchmark final
```

### Comando de Informe Completo
```bash
# Generar informe completo con todos los sprints
npm run test:report

# Alias para el informe completo
npm run test:all
```

## 📊 Sistema de Reportes

El sistema genera múltiples tipos de reportes para facilitar el seguimiento del progreso:

### 1. Informe HTML Completo
- **Ubicación**: `reports/informe-completo.html`
- **Contenido**: Resumen visual con estadísticas por sprint, cobertura y gráficos
- **Características**:
  - Diseño responsivo y moderno
  - Estadísticas detalladas por sprint
  - Visualización de cobertura de código
  - Indicadores de progreso y tasas de éxito

### 2. Reportes por Sprint
- **Ubicación**: `reports/sprint[1-5]-results.json`
- **Formato**: JSON con resultados detallados de cada sprint
- **Uso**: Integración con sistemas de CI/CD

### 3. Cobertura de Código
- **Ubicación**: `coverage/index.html`
- **Formatos**: HTML, LCOV, JSON
- **Métricas**: Líneas, funciones, ramas y declaraciones

### 4. Reporte JUnit
- **Ubicación**: `reports/junit.xml`
- **Uso**: Integración con herramientas de CI/CD como Jenkins, GitLab CI, etc.

## 🗂️ Estructura de Tests

```
tests/
├── setup.js                 # Configuración global de tests
├── utils/
│   └── test-helpers.js      # Utilidades comunes
├── mocks/
│   └── bpmn-modeler.mock.js # Mocks para BPMN
├── sprint1/                 # Tests del Sprint 1
│   ├── bpmn-validators.test.js
│   ├── mmproject-validation.test.js
│   ├── storage-manager.test.js
│   └── autosave.test.js
├── sprint2/                 # Tests del Sprint 2
│   └── sync-tests.test.js
├── sprint3/                 # Tests del Sprint 3
│   └── rasci-tests.test.js
├── sprint4/                 # Tests del Sprint 4
│   └── bpmn-advanced.test.js
└── sprint5/                 # Tests del Sprint 5
    └── integration-benchmark.test.js
```

## 🎯 Cobertura de Tests por Sprint

### Sprint 1: Validadores Básicos y Persistencia
- ✅ **Validadores BPMN**: Eventos de inicio/fin, flujos cíclicos
- ✅ **Validación .mmproject**: Estructura XML/JSON, notaciones
- ✅ **StorageManager**: Guardado/recuperación, gestión de sesiones
- ✅ **Autosave**: Detección de cambios, guardado automático

### Sprint 2: Sincronización Multi-Notación
- 🚧 **Sincronización BPMN-PPINOT**: Cambios bidireccionales
- 🚧 **Sincronización BPMN-RALPH**: Actualización de roles
- 🚧 **EventBus**: Comunicación entre módulos
- 🚧 **Validadores**: PPIs asociados, roles RALPH

### Sprint 3: RASCI y Conflictos
- 🚧 **Matriz RASCI**: Validación de roles (A, R, S, C, I)
- 🚧 **Mapeo automático**: RASCI-RALPH
- 🚧 **Detección de conflictos**: Multi-notación
- 🚧 **Tests E2E**: Flujos completos de usuario

### Sprint 4: BPMN Avanzado y Rendimiento
- 🚧 **Subprocesos**: Colapso/expansión, redistribución
- 🚧 **Conectores**: Preservación de conexiones
- 🚧 **Rendimiento**: Carga/guardado de diagramas grandes
- 🚧 **Stress testing**: 150+ elementos

### Sprint 5: Integración y Benchmark
- 🚧 **Integración completa**: Todas las notaciones
- 🚧 **Benchmark**: Métricas de rendimiento
- 🚧 **Tests de aceptación**: Flujos de usuario final

**Leyenda**: ✅ Implementado | 🚧 En desarrollo | ❌ Pendiente

## 🔧 Configuración

### Jest Configuration
El archivo `jest.config.js` incluye:
- Entorno jsdom para simulación de DOM
- Configuración de cobertura completa
- Reportes HTML y JUnit
- Timeouts optimizados para tests async
- Mocks para localStorage y canvas

### Mocks y Utilidades
- **BPMN Modeler Mock**: Simulación completa de bpmn-js
- **Test Helpers**: Funciones para crear XMLs válidos/inválidos
- **Storage Mocks**: localStorage y sessionStorage
- **Event Simulation**: Eventos de usuario y sistema

## 📈 Métricas y KPIs

### Objetivos de Cobertura
- **Líneas**: >80%
- **Funciones**: >75%
- **Ramas**: >70%
- **Declaraciones**: >80%

### Objetivos de Calidad
- **Tasa de éxito**: >90% en producción
- **Tiempo de ejecución**: <2 minutos para suite completa
- **Estabilidad**: <5% de tests flaky

## 🐛 Debugging y Troubleshooting

### Problemas Comunes

1. **Timeouts en tests async**
   ```javascript
   test('mi test', async () => {
     // código
   }, 15000); // Aumentar timeout
   ```

2. **Problemas con mocks**
   ```javascript
   beforeEach(() => {
     jest.clearAllMocks();
   });
   ```

3. **Problemas de memoria en tests largos**
   ```javascript
   afterEach(() => {
     // Limpiar recursos
     if (modeler && modeler.destroy) {
       modeler.destroy();
     }
   });
   ```

### Variables de Entorno

```bash
# Ejecutar solo tests específicos
npm test -- --testNamePattern="debe validar"

# Ejecutar con más detalle
npm test -- --verbose

# Ejecutar sin cobertura para mayor velocidad
npm test -- --no-coverage
```

## 🔄 Integración Continua

### GitHub Actions (ejemplo)
```yaml
- name: Run Tests
  run: npm run test:report
  
- name: Upload Coverage
  uses: codecov/codecov-action@v1
  with:
    file: ./coverage/lcov.info
    
- name: Archive Test Results
  uses: actions/upload-artifact@v2
  with:
    name: test-results
    path: reports/
```

### GitLab CI (ejemplo)
```yaml
test:
  script:
    - npm run test:report
  artifacts:
    reports:
      junit: reports/junit.xml
    paths:
      - coverage/
      - reports/
```

## 📝 Contribuir

### Añadir Nuevos Tests

1. Crear el archivo en el sprint correspondiente
2. Seguir la estructura de naming: `feature.test.js`
3. Usar los helpers y mocks existentes
4. Documentar casos edge y requisitos especiales
5. Actualizar este README si es necesario

### Convenciones

- **Nombres descriptivos**: `debe validar que el diagrama tenga eventos`
- **Estructura AAA**: Arrange, Act, Assert
- **Mocks mínimos**: Solo lo necesario para el test
- **Cleanup**: Siempre limpiar recursos en afterEach
- **Async/Await**: Preferir sobre Promises

---

## 📞 Soporte

Para problemas con los tests:
1. Revisar logs en `reports/`
2. Verificar configuración en `jest.config.js`
3. Comprobar mocks en `tests/mocks/`
4. Ejecutar tests individuales para debugging

**¡Happy Testing!** 🧪✨



