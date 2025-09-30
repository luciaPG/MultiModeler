# MultiNotation Modeler

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Version](https://img.shields.io/badge/version-0.5.0-blue.svg)](https://github.com/isa-group/ppinot-visual)
[![BPMN.js](https://img.shields.io/badge/built%20with-bpmn--js-orange.svg)](https://github.com/bpmn-io/bpmn-js)

Una aplicación web avanzada para el modelado visual de procesos de negocio que integra múltiples notaciones: **BPMN**, **PPINOT** (indicadores de rendimiento) y **RALPH** (roles organizativos), con capacidades de gestión de responsabilidades **RASCI**.

## 🚀 Características Principales

### 📊 **Modelado Multi-Notación**
- **BPMN**: Procesos de negocio estándar
- **PPINOT**: Indicadores de rendimiento de procesos (PPIs)
- **RALPH**: Gestión de roles y recursos organizativos
- **RASCI**: Matriz de responsabilidades (Responsible, Accountable, Support, Consulted, Informed)

### 🎯 **Funcionalidades Avanzadas**
- **Sincronización bidireccional** entre paneles y lienzo
- **Autoguardado automático** con restauración de sesiones
- **Validación en tiempo real** de reglas RASCI
- **Mapeo automático** RASCI → RALPH
- **Importación/Exportación** de proyectos completos
- **Interfaz modular** con paneles especializados

### 🏗️ **Arquitectura Robusta**
- **Monolito modular** con composición estática
- **Service Registry** para gestión de dependencias
- **Event Bus** para comunicación desacoplada
- **Panel Manager** para gestión de interfaces
- **Storage Manager** para persistencia unificada

## 🛠️ Instalación y Uso

### Prerrequisitos
- Node.js 16+ 
- npm o yarn

### Instalación
```bash
# Clonar el repositorio
git clone https://github.com/isa-group/ppinot-visual.git
cd ppinot-visual

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

### Scripts Disponibles
```bash
# Desarrollo
npm run dev              # Servidor de desarrollo
npm run start            # Alias para desarrollo

# Construcción
npm run build            # Build de producción
npm run lint             # Linting del código

# Testing
npm run tests            # Ejecutar todos los tests
npm run test:unitarias   # Tests unitarios
npm run test:integracion # Tests de integración
npm run test:nfr         # Tests no funcionales
```

## 📁 Estructura del Proyecto

```
MultiModeler/
├── 📁 app/                          # Aplicación principal
│   ├── 📄 app.js                    # Punto de entrada
│   ├── 📄 index.html                # Interfaz web
│   ├── 📁 modules/                  # Módulos de notación
│   │   ├── 📁 multinotationModeler/ # Núcleo multinotación
│   │   ├── 📁 ppis/                 # Indicadores PPI
│   │   ├── 📁 rasci/                # Matriz RASCI
│   │   └── 📁 ui/                   # Sistema de UI
│   ├── 📁 services/                 # Servicios transversales
│   └── 📁 panels/                   # Paneles de interfaz
├── 📁 tests/                        # Suite de pruebas completa
├── 📁 docs/                         # Documentación técnica
├── 📁 resources/                    # Recursos y ejemplos
└── 📁 scripts/                      # Utilidades y automatización
```

## 🎨 Interfaz de Usuario

### Paneles Especializados
- **Panel PPI**: Gestión de indicadores de rendimiento
- **Panel RASCI**: Matriz de responsabilidades
- **Panel BPMN**: Propiedades y validación de procesos

### Características de UX
- **Autoguardado** cada 5 segundos con debounce de 500ms
- **Restauración automática** de sesiones interrumpidas
- **Validación en tiempo real** con feedback visual
- **Sincronización fluida** entre vistas

## 🔧 Arquitectura Técnica

### Componentes Principales
- **App Shell**: Inicialización y orquestación
- **MultiNotation Modeler**: Coordinador central
- **Service Registry**: Gestión de dependencias
- **Event Bus**: Comunicación entre módulos
- **Panel Manager**: Gestión de interfaces

### Tecnologías
- **Frontend**: JavaScript ES6+, HTML5, CSS3
- **Modelado**: bpmn-js, diagram-js
- **Build**: Webpack 5, Babel
- **Testing**: Jest, Testing Library
- **Persistencia**: LocalStorage

## 📊 Mapeo RASCI → RALPH

El sistema convierte automáticamente las responsabilidades RASCI en elementos BPMN:

| RASCI | Elemento BPMN | Descripción |
|-------|---------------|-------------|
| **R** (Responsible) | Rol RALPH + ResourceArc | Conexión directa tarea-rol |
| **S** (Support) | Rol RALPH + AND Gate | Apoyo a través de compuerta |
| **A** (Accountable) | UserTask "Aprobar X" | Tarea de aprobación |
| **C** (Consulted) | IntermediateThrowEvent "Consultar X" | Evento de consulta |
| **I** (Informed) | IntermediateThrowEvent "Informar X" | Evento de información |

## 🧪 Testing

### Cobertura de Pruebas
- **8.1 Unitarias**: Componentes individuales
- **8.2 Integración**: Interacción entre módulos  
- **8.3 E2E**: Experiencia de usuario completa
- **8.4 No Funcionales**: Rendimiento y usabilidad

### Ejecutar Tests
```bash
# Tests específicos
npm run test:unitarias
npm run test:integracion
npm run test:nfr

# Reportes
npm run test:report
```

## 📚 Documentación

- **Arquitectura**: `docs/arquitectura.puml`
- **Módulos RASCI**: `app/modules/rasci/README.md`
- **Validación**: `app/modules/rasci/validation/README.md`

## 🤝 Contribución

### Cómo Contribuir
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

### Estándares de Código
- **ESLint** para linting
- **Jest** para testing
- **Conventional Commits** para mensajes
- **Modularidad** y separación de responsabilidades

## 📄 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.




- [bpmn-io](https://github.com/bpmn-io) por la librería bpmn-js
- [PPINOT](http://www.isa.us.es/ppinot/) por la metodología de indicadores
- Comunidad open source por las herramientas y librerías utilizadas

---

**MultiNotation Modeler** - Modelado visual avanzado para procesos de negocio modernos 🚀