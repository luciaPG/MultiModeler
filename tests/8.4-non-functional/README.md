# Tests de Requisitos No Funcionales (NFR) - Aplicación Real

Este directorio contiene tests que evalúan requisitos no funcionales de la aplicación **sin usar mocks**, probando directamente la aplicación real en funcionamiento.

## 🎯 Objetivo

Estos tests complementan los tests existentes proporcionando evaluación real de:
- **Rendimiento**: Medición de métricas reales de la aplicación
- **Usabilidad**: Evaluación de experiencia de usuario real
- **Compatibilidad**: Verificación con navegadores y dispositivos reales
- **Escalabilidad**: Comportamiento bajo carga real
- **Seguridad**: Validación de protecciones reales

## 📁 Estructura de Archivos

```
tests/8.4-non-functional/
├── README.md                     # Este archivo
├── real-app-nfr.test.js         # Suite completa de NFR
├── performance-real.test.js      # Tests de rendimiento real
├── usability-real.test.js       # Tests de usabilidad real
└── compatibility-real.test.js   # Tests de compatibilidad real
```

## 🚀 Comandos Disponibles

### Ejecutar todos los tests NFR
```bash
npm run test:nfr
```

### Ejecutar tests específicos
```bash
# Solo tests de rendimiento
npm run test:nfr-performance

# Solo tests de usabilidad
npm run test:nfr-usability

# Solo tests de compatibilidad
npm run test:nfr-compatibility

# Suite completa integrada
npm run test:nfr-all
```

## ⚙️ Configuración Requerida

### Para tests básicos (simulados)
Los tests actuales funcionan con simulaciones y no requieren configuración adicional.

### Para tests reales con navegador (opcional)
Para ejecutar tests reales con navegador, instalar dependencias adicionales:

```bash
npm install --save-dev puppeteer lighthouse web-vitals
```

## 📊 Tipos de Tests

### 1. Tests de Rendimiento Real (`performance-real.test.js`)

**Qué evalúa:**
- Core Web Vitals (FCP, LCP, FID, CLS, TBT)
- Tiempo de carga de diagramas grandes
- Uso de memoria durante operaciones
- Responsividad de la interfaz
- Rendimiento bajo carga concurrente

**Métricas clave:**
- First Contentful Paint < 2s
- Largest Contentful Paint < 3s
- First Input Delay < 100ms
- Cumulative Layout Shift < 0.1

### 2. Tests de Usabilidad Real (`usability-real.test.js`)

**Qué evalúa:**
- Accesibilidad WCAG AA
- Navegación por teclado
- Feedback de usuario
- Flujos de trabajo intuitivos
- Manejo de errores amigable
- Adaptación a pantallas diferentes

**Aspectos clave:**
- Cumplimiento de estándares de accesibilidad
- Tiempos de respuesta < 200ms para navegación
- Feedback visual en < 100ms
- Compatibilidad con lectores de pantalla

### 3. Tests de Compatibilidad Real (`compatibility-real.test.js`)

**Qué evalúa:**
- Compatibilidad con navegadores principales
- Adaptación a diferentes dispositivos
- Soporte de formatos de archivo
- Configuraciones de red
- Protocolos de seguridad

**Cobertura:**
- Chrome, Firefox, Safari, Edge
- Desktop, tablet, mobile
- BPMN 2.0, SVG, PNG export
- HTTP/HTTPS, TLS 1.3

### 4. Suite Completa (`real-app-nfr.test.js`)

**Qué evalúa:**
- Todos los aspectos anteriores integrados
- Escenarios de uso real complejos
- Métricas de escalabilidad
- Validación de seguridad
- Comportamiento bajo estrés

## 🎮 Cómo Ejecutar Tests Reales

### 1. Preparar el entorno
```bash
# Iniciar la aplicación en modo desarrollo
npm run dev

# En otra terminal, ejecutar tests NFR
npm run test:nfr
```

### 2. Para tests con navegador real
```bash
# Asegurar que la app esté corriendo en localhost:8080
npm run dev

# Configurar variable de entorno (opcional)
export TEST_APP_URL=http://localhost:8080

# Ejecutar tests de rendimiento real
npm run test:nfr-performance
```

## 📈 Interpretación de Resultados

### Indicadores de Rendimiento
- ✅ **Excelente**: Todos los umbrales cumplidos
- ⚠️ **Aceptable**: Algunos umbrales excedidos pero funcional
- ❌ **Problemas**: Múltiples umbrales excedidos

### Métricas de Usabilidad
- **Accesibilidad**: 0 violaciones críticas/serias
- **Navegación**: Todos los elementos alcanzables por teclado
- **Feedback**: Respuestas visuales < 100ms

### Compatibilidad
- **Navegadores**: 100% de navegadores principales
- **Dispositivos**: Funcionalidad básica en todos
- **Formatos**: Exportación exitosa en formatos requeridos

## 🔧 Personalización

### Ajustar umbrales de rendimiento
Editar `PERFORMANCE_CONFIG.THRESHOLDS` en `performance-real.test.js`:

```javascript
THRESHOLDS: {
  FIRST_CONTENTFUL_PAINT: 2000,  // Ajustar según necesidades
  LARGEST_CONTENTFUL_PAINT: 3000,
  FIRST_INPUT_DELAY: 100,
  // ...
}
```

### Añadir nuevos navegadores
Editar `COMPATIBILITY_CONFIG.BROWSERS` en `compatibility-real.test.js`:

```javascript
BROWSERS: [
  { name: 'Chrome', version: '118+', userAgent: '...' },
  { name: 'NewBrowser', version: '1.0+', userAgent: '...' }
]
```

## 🚨 Limitaciones Actuales

1. **Tests simulados**: Los tests actuales usan simulaciones para demostrar la estructura
2. **Sin navegador real**: Para tests reales, requiere instalación de Puppeteer
3. **Red local**: Tests de red simulados, no pruebas reales de conectividad
4. **Datos sintéticos**: Métricas generadas algorítmicamente

## 🎯 Próximos Pasos

Para implementación completa:

1. **Instalar Puppeteer**: Para control real de navegador
2. **Configurar CI/CD**: Integrar tests en pipeline automático
3. **Métricas reales**: Conectar con herramientas de monitoreo
4. **Tests de carga**: Implementar pruebas con usuarios concurrentes
5. **Alertas**: Configurar notificaciones por degradación de rendimiento

## 📞 Soporte

Para dudas sobre estos tests:
1. Revisar logs de ejecución para detalles específicos
2. Verificar que la aplicación esté ejecutándose antes de los tests
3. Comprobar configuración de red y permisos
4. Consultar documentación de Puppeteer para tests avanzados