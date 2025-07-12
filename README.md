# Visual PPINOT & RALPH Modeler – Arquitectura y Mejora

## Descripción General

Este proyecto es una extensión de [bpmn.io](https://github.com/bpmn-io) que permite modelar visualmente PPINOT y RALPH, dos notaciones para procesos y roles organizativos. Cada notación está completamente modularizada, permitiendo su mantenimiento y evolución independiente.

---

## **Arquitectura del Proyecto**

```
VisualPPINOT/
│
├── app/
│   ├── PPINOT-modeler/      # Módulo completo para PPINOT
│   │   └── PPINOT/          # Renderers, Providers, Rules, Types, etc.
│   ├── RALPH-modeler/       # Módulo completo para RALPH
│   │   └── RALph/           # Renderers, Providers, Rules, Types, etc.
│   └── MultiNotationModeler/ # Infraestructura para integración multi-notación
│
├── resources/               # Ejemplos y recursos de diagramas
├── decode/                  # Scripts de decodificación SVG
├── public/                  # Archivos estáticos
├── docs/                    # Documentación y capturas
├── package.json             # Dependencias y scripts
└── README.md                # Este archivo
```

### **Componentes Clave**

- **Renderer**: Dibuja los elementos y etiquetas de cada notación.
- **LabelProvider**: Gestiona la creación, edición y renderizado de etiquetas externas.
- **Rules**: Define las reglas de conexión y manipulación de elementos.
- **ElementFactory**: Crea instancias de los elementos de cada notación.
- **ContextPad/Palette**: Gestionan los menús contextuales y la paleta de herramientas.
- **Types.js**: Define los tipos y utilidades para clasificar elementos y conexiones.

Cada notación (PPINOT, RALPH) tiene su propio set de estos componentes, lo que permite independencia y claridad.

---

## **Buenas Prácticas y Clean Code**

- **Separación de responsabilidades**: Cada módulo es responsable solo de su notación.
- **Nombres claros y consistentes**: Se sigue PascalCase para clases y camelCase para funciones/variables.
- **Sin debugging ni logs innecesarios**: El código está limpio para producción.
- **Helpers reutilizables**: Funciones como `isExternalLabel` o `isRALPHConnection` evitan duplicación.
- **Eventos desacoplados**: El uso de `eventBus` mantiene la lógica modular.

---

## **Recomendaciones para Mejorar la Arquitectura**

1. **Resolver Warnings de Linter**
   - Hay algunos warnings por variables duplicadas o no usadas en los renderers. Limpiarlos mejorará la mantenibilidad.

2. **Eliminar Comentarios de Debugging**
   - Hay líneas comentadas de debugging (`//console.log(...)`). Limpiarlas dejará el código más profesional.

3. **Documentación Interna**
   - Añadir comentarios explicativos en funciones complejas o poco intuitivas.
   - Documentar la relación entre los módulos de integración multi-notación y los módulos individuales.

4. **Unificación de Estilos**
   - Unificar los estilos visuales de las etiquetas externas entre PPINOT y RALPH para una experiencia más homogénea.

5. **Validación Defensiva**
   - Añadir validaciones en funciones que asumen la existencia de ciertas propiedades en los objetos.

6. **Automatización de Pruebas**
   - Incluir tests automáticos para los providers y renderers principales.

7. **Documentar el Proceso de Extensión**
   - Crear una guía para añadir nuevas notaciones o extender las existentes, siguiendo el patrón modular actual.

---

## **¿Cómo Extender o Mejorar el Proyecto?**

- **Para añadir una nueva notación**:  
  Crea una carpeta similar a `PPINOT/` o `RALph/` con sus propios renderer, provider, rules, etc. Regístrala en el sistema multi-notación.
- **Para modificar reglas, render o etiquetas**:  
  Edita el archivo correspondiente en el módulo de la notación deseada.
- **Para mejorar la experiencia de usuario**:  
  Unifica estilos, añade validaciones y mejora la documentación interna.

---

## **Contacto y Contribución**

Si tienes sugerencias o quieres contribuir, abre un issue o pull request.  
¡Tu feedback es bienvenido para seguir mejorando la arquitectura y la experiencia de desarrollo!

