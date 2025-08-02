// === Ejemplos de Uso del Módulo PPI ===

// Ejemplo 1: Crear un PPI básico
function createBasicPPI() {
  const ppi = ppiManager.createPPI({
    process: 'Gestión de Incidencias',
    businessObjective: 'Reducir el tiempo de resolución de incidencias',
    measureDefinition: {
      type: 'time',
      fromEvent: 'ticket abierto',
      toEvent: 'ticket resuelto',
      unit: 'horas'
    },
    target: 'menos de 24h',
    scope: 'mensual',
    source: 'sistema de helpdesk',
    responsible: 'Jefe de soporte',
    informed: ['Responsable TI'],
    comments: 'Indicador SLA'
  });
  
  // console.log('PPI creado:', ppi);
  return ppi;
}

// Ejemplo 2: Procesar texto natural
function processNaturalLanguage() {
  const text = `
    Proceso: Gestión de Pedidos
    Objetivo: Reducir errores en pedidos
    Medida: Contar pedidos con errores por mes
    Objetivo: menos del 2%
    Fuente: sistema ERP
    Responsable: Supervisor de pedidos
  `;
  
  const result = naturalLanguageProcessor.processText(text);
  // console.log('Texto procesado exitosamente:', result.data);
  return result;
}

// Ejemplo 3: Vincular con elementos BPMN
function linkWithBpmnElements() {
  const ppi = ppiManager.ppis[0]; // Obtener primer PPI
  if (ppi && window.bpmnIntegration) {
    // Vincular con elementos específicos del BPMN
    window.bpmnIntegration.linkPPIToElement(ppi.id, 'Activity_1a2b3c');
    window.bpmnIntegration.linkPPIToElement(ppi.id, 'Activity_9z8y7x');
    
    // console.log('PPI vinculado con elementos BPMN');
  }
}

// Ejemplo 4: Exportar PPIs
function exportPPIs() {
  const exportedData = ppiManager.exportPPIs();
  // console.log('PPIs exportados:', exportedData);
  return exportedData;
}

// Ejemplo 5: Importar PPIs
function importPPIs() {
  const data = {
    ppis: [
      {
        id: 'ppi_001',
        process: 'Gestión de Clientes',
        businessObjective: 'Mejorar satisfacción del cliente',
        measureDefinition: {
          type: 'data',
          metric: 'puntuación de satisfacción',
          unit: 'escala 1-10'
        },
        target: 'más de 8.5',
        scope: 'trimestral',
        source: 'encuestas de satisfacción',
        responsible: 'Gerente de Atención al Cliente',
        informed: ['Director Comercial'],
        comments: 'Indicador de calidad del servicio'
      }
    ]
  };
  
  const success = ppiManager.importPPIs(data);
  // console.log('Importación exitosa:', success);
  // console.log('PPIs importados:', ppiManager.ppis);
  return success;
}

// Ejemplo 6: Validar PPI con criterios SMART
function validatePPI() {
  const ppi = ppiManager.ppis[0];
  if (ppi) {
    const result = naturalLanguageProcessor.validateSMART(ppi);
    // console.log('Validación SMART:', result.suggestions);
    return result;
  }
}

// Ejemplo 7: Crear múltiples PPIs de diferentes tipos
function createMultiplePPIs() {
  const ppis = [
    {
      name: 'Tiempo de Respuesta',
      process: 'Atención al Cliente',
      businessObjective: 'Mejorar tiempo de respuesta inicial',
      measureDefinition: {
        type: 'time',
        fromEvent: 'solicitud recibida',
        toEvent: 'primera respuesta',
        unit: 'minutos'
      },
      target: 'menos de 15 minutos',
      scope: 'diario',
      source: 'sistema de tickets',
      responsible: 'Equipo de Soporte',
      informed: ['Supervisor de Soporte'],
      comments: 'SLA crítico para satisfacción del cliente'
    },
    {
      name: 'Tasa de Conversión',
      process: 'Ventas Online',
      businessObjective: 'Aumentar conversión de visitantes a clientes',
      measureDefinition: {
        type: 'derived',
        formula: 'clientes_nuevos / visitantes_totales * 100',
        unit: 'porcentaje'
      },
      target: 'más del 3%',
      scope: 'semanal',
      source: 'analytics web',
      responsible: 'Marketing Manager',
      informed: ['Director de Marketing'],
      comments: 'Indicador clave de rendimiento de marketing'
    },
    {
      name: 'Disponibilidad del Sistema',
      process: 'Operaciones IT',
      businessObjective: 'Mantener alta disponibilidad del sistema',
      measureDefinition: {
        type: 'state',
        condition: 'sistema_operativo',
        unit: 'porcentaje'
      },
      target: 'más del 99.9%',
      scope: 'mensual',
      source: 'monitoreo de sistemas',
      responsible: 'Administrador de Sistemas',
      informed: ['CTO'],
      comments: 'SLA de infraestructura crítica'
    }
  ];
  
  ppis.forEach(ppiData => {
    const ppi = ppiManager.createPPI(ppiData);
    // console.log(`PPI ${ppiData.name} creado:`, ppi);
  });
  
  return ppiManager.ppis;
}

// Ejemplo 8: Integración completa
function completeIntegration() {
  // 1. Crear PPIs
  const ppis = createMultiplePPIs();
  
  // 2. Procesar texto natural
  const processedText = processNaturalLanguage();
  
  // 3. Vincular con BPMN
  linkWithBpmnElements();
  
  // 4. Validar
  validatePPI();
  
  // 5. Exportar
  const exportData = exportPPIs();
  
  // console.log('Integración completa completada. PPIs exportados:', exportData);
  return exportData;
}

// Ejemplo 9: Validación avanzada
function advancedValidation() {
  const ppi = {
    process: 'Proceso de Prueba',
    businessObjective: 'Este objetivo es muy vago y no específico',
    measureDefinition: {
      type: 'count',
      metric: 'elementos procesados'
    },
    target: 'mejorar',
    scope: 'cuando sea posible',
    source: 'algún sistema',
    responsible: 'alguien',
    informed: ['todos'],
    comments: 'PPI mal definido para pruebas'
  };
  
  const result = naturalLanguageProcessor.validateSMART(ppi);
  // console.log('Errores de validación:', result.errors);
  // console.log('Sugerencias:', result.suggestions);
  return result;
}

// Ejemplo 10: PPI personalizado con validación
function customPPIWithValidation() {
  const customPPI = ppiManager.createPPI({
    process: 'Gestión de Inventario',
    businessObjective: 'Optimizar niveles de stock para reducir costos de almacenamiento',
    measureDefinition: {
      type: 'aggregated',
      metric: 'rotación de inventario',
      aggregation: 'promedio',
      period: 'mensual'
    },
    target: 'más de 12 rotaciones por año',
    scope: 'trimestral',
    source: 'sistema ERP de inventario',
    responsible: 'Gerente de Logística',
    informed: ['Director de Operaciones', 'CFO'],
    comments: 'Indicador de eficiencia operativa'
  });
  
  // console.log('PPI personalizado creado:', customPPI);
  
  // Validar el PPI creado
  const validation = naturalLanguageProcessor.validateSMART(customPPI);
  return { ppi: customPPI, validation };
}

// Ejemplo 11: Análisis de PPIs existentes
function analyzeExistingPPIs() {
  const analysis = {
    total: ppiManager.ppis.length,
    byType: {},
    byProcess: {},
    byResponsible: {}
  };
  
  ppiManager.ppis.forEach(ppi => {
    // Contar por tipo de medida
    const type = ppi.measureDefinition.type;
    analysis.byType[type] = (analysis.byType[type] || 0) + 1;
    
    // Contar por proceso
    const process = ppi.process;
    analysis.byProcess[process] = (analysis.byProcess[process] || 0) + 1;
    
    // Contar por responsable
    const responsible = ppi.responsible;
    analysis.byResponsible[responsible] = (analysis.byResponsible[responsible] || 0) + 1;
  });
  
  // console.log('Análisis de PPIs:', analysis);
  return analysis;
}

// Función principal para ejecutar todos los ejemplos
function runAllExamples() {
  // console.log('🚀 Iniciando ejemplos del módulo PPI...');
  
  try {
    // Ejemplos básicos
    createBasicPPI();
    processNaturalLanguage();
    
    // Ejemplos de integración
    linkWithBpmnElements();
    exportPPIs();
    importPPIs();
    
    // Ejemplos avanzados
    validatePPI();
    createMultiplePPIs();
    completeIntegration();
    advancedValidation();
    customPPIWithValidation();
    analyzeExistingPPIs();
    
    // console.log('✅ Todos los ejemplos ejecutados correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error ejecutando ejemplos:', error);
    return false;
  }
}

// Exportar funciones para uso global
window.ppiExamples = {
  createBasicPPI,
  processNaturalLanguage,
  linkWithBpmnElements,
  exportPPIs,
  importPPIs,
  validatePPI,
  createMultiplePPIs,
  completeIntegration,
  advancedValidation,
  customPPIWithValidation,
  analyzeExistingPPIs,
  runAllExamples
};

// console.log('📚 Ejemplos del módulo PPI cargados. Usa window.ppiExamples.runAllExamples() para ejecutar todos los ejemplos.'); 