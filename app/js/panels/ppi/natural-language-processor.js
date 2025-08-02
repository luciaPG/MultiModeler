// === Natural Language Processor ===
// Módulo para procesar lenguaje natural y extraer información de PPIs
// Utiliza patrones y reglas para analizar texto y generar estructuras PPINOT

class NaturalLanguageProcessor {
  constructor() {
    this.patterns = {
      // Patrones para tipos de medida
      timePatterns: [
        /tiempo\s+(?:de|entre|desde|hasta)/i,
        /duración\s+(?:de|entre|desde|hasta)/i,
        /(?:medir|calcular)\s+el\s+tiempo/i,
        /tiempo\s+(?:total|promedio|máximo|mínimo)/i,
        /(?:horas|minutos|días|semanas)\s+(?:para|de)/i
      ],
      
      countPatterns: [
        /contar\s+(?:el\s+)?(?:número|cantidad)/i,
        /número\s+de\s+(?:veces|ocurrencias)/i,
        /cantidad\s+de\s+(?:elementos|items|registros)/i,
        /(?:total|suma)\s+de\s+(?:elementos|items)/i,
        /frecuencia\s+de\s+(?:ocurrencia|aparición)/i
      ],
      
      statePatterns: [
        /estado\s+(?:de|del|de\s+la)/i,
        /condición\s+(?:de|del|de\s+la)/i,
        /(?:verificar|comprobar)\s+el\s+estado/i,
        /estado\s+(?:actual|final|inicial)/i,
        /(?:si|cuando)\s+(?:el\s+)?estado/i
      ],
      
      dataPatterns: [
        /valor\s+(?:de|del|de\s+la)/i,
        /campo\s+(?:de|del|de\s+la)/i,
        /dato\s+(?:de|del|de\s+la)/i,
        /(?:extraer|obtener)\s+(?:el\s+)?valor/i,
        /(?:leer|consultar)\s+(?:el\s+)?campo/i
      ],
      
      derivedPatterns: [
        /calcular\s+(?:a\s+partir\s+de|basado\s+en)/i,
        /fórmula\s+(?:para|de)/i,
        /(?:derivado|calculado)\s+(?:de|desde)/i,
        /(?:combinar|sumar|restar|multiplicar)/i,
        /(?:promedio|media|máximo|mínimo)\s+de/i
      ],
      
      aggregatedPatterns: [
        /agregar\s+(?:por|según)/i,
        /agrupar\s+(?:por|según)/i,
        /(?:suma|total)\s+(?:por|según)/i,
        /(?:promedio|media)\s+(?:por|según)/i,
        /(?:contar|contabilizar)\s+(?:por|según)/i
      ]
    };
    
    this.keywords = {
      // Palabras clave para extracción de información
      process: ['proceso', 'procedimiento', 'flujo', 'workflow', 'proceso de negocio'],
      objective: ['objetivo', 'meta', 'propósito', 'finalidad', 'intención'],
      target: ['objetivo', 'meta', 'target', 'objetivo esperado', 'valor objetivo'],
      scope: ['alcance', 'período', 'frecuencia', 'intervalo', 'rango temporal'],
      source: ['fuente', 'origen', 'sistema', 'base de datos', 'repositorio'],
      responsible: ['responsable', 'encargado', 'a cargo', 'supervisor', 'manager'],
      informed: ['informado', 'notificado', 'comunicado', 'reportado', 'al tanto']
    };
    
    this.smartCriteria = {
      specific: {
        keywords: ['específico', 'concreto', 'definido', 'claro', 'preciso'],
        patterns: [/definir\s+(?:claramente|específicamente)/i, /ser\s+(?:específico|concreto)/i]
      },
      measurable: {
        keywords: ['medible', 'cuantificable', 'mensurable', 'evaluable'],
        patterns: [/poder\s+(?:medir|cuantificar)/i, /ser\s+(?:medible|cuantificable)/i]
      },
      achievable: {
        keywords: ['alcanzable', 'realizable', 'factible', 'viable', 'posible'],
        patterns: [/ser\s+(?:alcanzable|realizable)/i, /poder\s+(?:lograr|alcanzar)/i]
      },
      relevant: {
        keywords: ['relevante', 'importante', 'significativo', 'pertinente'],
        patterns: [/ser\s+(?:relevante|importante)/i, /tener\s+(?:relevancia|importancia)/i]
      },
      timeBound: {
        keywords: ['temporal', 'limitado', 'acotado', 'con plazo', 'con fecha'],
        patterns: [/tener\s+(?:plazo|fecha|límite)/i, /ser\s+(?:temporal|limitado)/i]
      }
    };
    
    this.init();
  }

  init() {
    // Inicializar el procesador
    this.setupPatterns();
  }

  setupPatterns() {
    // Configurar patrones adicionales si es necesario
    this.compilePatterns();
  }

  compilePatterns() {
    // Compilar expresiones regulares para mejor rendimiento
    Object.keys(this.patterns).forEach(category => {
      this.patterns[category] = this.patterns[category].map(pattern => 
        typeof pattern === 'string' ? new RegExp(pattern, 'i') : pattern
      );
    });
  }

  // Método principal para procesar texto
  processText(text) {
    const result = {
      success: false,
      data: {},
      confidence: 0,
      errors: [],
      suggestions: []
    };

    try {
      // Normalizar texto
      const normalizedText = this.normalizeText(text);
      
      // Extraer información básica
      const extractedData = this.extractBasicInfo(normalizedText);
      
      // Determinar tipo de medida
      const measureType = this.determineMeasureType(normalizedText);
      
      // Validar criterios SMART
      const smartValidation = this.validateSMARTCriteria(normalizedText);
      
      // Calcular confianza
      const confidence = this.calculateConfidence(extractedData, measureType, smartValidation);
      
      // Generar sugerencias
      const suggestions = this.generateSuggestions(extractedData, measureType, smartValidation);
      
      result.success = confidence > 0.5;
      result.data = {
        ...extractedData,
        measureType: measureType.type,
        measureConfidence: measureType.confidence
      };
      result.confidence = confidence;
      result.suggestions = suggestions;
      
      if (!result.success) {
        result.errors.push('Confianza insuficiente en el procesamiento del texto');
      }
      
    } catch (error) {
      result.errors.push(`Error en el procesamiento: ${error.message}`);
    }

    return result;
  }

  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^\w\s:]/g, ' ')
      .trim();
  }

  extractBasicInfo(text) {
    const data = {};
    
    // Extraer información usando patrones de palabras clave
    Object.keys(this.keywords).forEach(field => {
      const value = this.extractFieldValue(text, this.keywords[field]);
      if (value) {
        data[field] = value;
      }
    });
    
    // Extraer información usando patrones de estructura
    const structuredData = this.extractStructuredInfo(text);
    Object.assign(data, structuredData);
    
    return data;
  }

  extractFieldValue(text, keywords) {
    for (const keyword of keywords) {
      const pattern = new RegExp(`${keyword}\\s*:\\s*([^\\n]+)`, 'i');
      const match = text.match(pattern);
      if (match) {
        return match[1].trim();
      }
    }
    return null;
  }

  extractStructuredInfo(text) {
    const data = {};
    
    // Patrones para extraer información estructurada
    const patterns = [
      {
        field: 'process',
        pattern: /proceso\s*:\s*([^\\n]+)/i
      },
      {
        field: 'businessObjective',
        pattern: /objetivo\s+(?:de\s+)?negocio\s*:\s*([^\\n]+)/i
      },
      {
        field: 'measureDefinition',
        pattern: /definición\s+(?:de\s+)?medida\s*:\s*([^\\n]+)/i
      },
      {
        field: 'target',
        pattern: /objetivo\s*:\s*([^\\n]+)/i
      },
      {
        field: 'scope',
        pattern: /alcance\s*:\s*([^\\n]+)/i
      },
      {
        field: 'source',
        pattern: /fuente\s*:\s*([^\\n]+)/i
      },
      {
        field: 'responsible',
        pattern: /responsable\s*:\s*([^\\n]+)/i
      },
      {
        field: 'informed',
        pattern: /informado\s*:\s*([^\\n]+)/i
      },
      {
        field: 'comments',
        pattern: /comentarios\s*:\s*([^\\n]+)/i
      }
    ];
    
    patterns.forEach(({ field, pattern }) => {
      const match = text.match(pattern);
      if (match) {
        data[field] = match[1].trim();
      }
    });
    
    return data;
  }

  determineMeasureType(text) {
    const typeScores = {
      time: 0,
      count: 0,
      state: 0,
      data: 0,
      derived: 0,
      aggregated: 0
    };
    
    // Calcular puntuación para cada tipo
    Object.keys(this.patterns).forEach(type => {
      const categoryPatterns = this.patterns[type];
      categoryPatterns.forEach(pattern => {
        if (pattern.test(text)) {
          typeScores[type] += 1;
        }
      });
    });
    
    // Encontrar el tipo con mayor puntuación
    let maxScore = 0;
    let bestType = 'time'; // Por defecto
    
    Object.keys(typeScores).forEach(type => {
      if (typeScores[type] > maxScore) {
        maxScore = typeScores[type];
        bestType = type;
      }
    });
    
    // Calcular confianza basada en la puntuación
    const totalPatterns = Object.values(this.patterns).flat().length;
    const confidence = maxScore / totalPatterns;
    
    return {
      type: bestType,
      confidence: Math.min(confidence * 2, 1), // Escalar la confianza
      scores: typeScores
    };
  }

  validateSMARTCriteria(text) {
    const validation = {
      specific: { valid: false, score: 0, feedback: '' },
      measurable: { valid: false, score: 0, feedback: '' },
      achievable: { valid: false, score: 0, feedback: '' },
      relevant: { valid: false, score: 0, feedback: '' },
      timeBound: { valid: false, score: 0, feedback: '' }
    };
    
    Object.keys(this.smartCriteria).forEach(criterion => {
      const criteria = this.smartCriteria[criterion];
      const score = this.calculateSMARTScore(text, criteria);
      
      validation[criterion] = {
        valid: score > 0.3,
        score: score,
        feedback: this.generateSMARTFeedback(criterion, score)
      };
    });
    
    return validation;
  }

  calculateSMARTScore(text, criteria) {
    let score = 0;
    
    // Verificar palabras clave
    criteria.keywords.forEach(keyword => {
      if (text.includes(keyword.toLowerCase())) {
        score += 0.2;
      }
    });
    
    // Verificar patrones
    criteria.patterns.forEach(pattern => {
      if (pattern.test(text)) {
        score += 0.3;
      }
    });
    
    return Math.min(score, 1);
  }

  generateSMARTFeedback(criterion, score) {
    const feedbacks = {
      specific: {
        low: 'La definición debe ser más específica y clara',
        medium: 'La definición es algo específica, pero puede mejorarse',
        high: 'La definición es específica y clara'
      },
      measurable: {
        low: 'El objetivo debe ser medible y cuantificable',
        medium: 'El objetivo es parcialmente medible',
        high: 'El objetivo es claramente medible'
      },
      achievable: {
        low: 'El objetivo debe ser alcanzable y realizable',
        medium: 'El objetivo parece alcanzable',
        high: 'El objetivo es claramente alcanzable'
      },
      relevant: {
        low: 'El objetivo debe ser relevante para el negocio',
        medium: 'El objetivo es algo relevante',
        high: 'El objetivo es muy relevante'
      },
      timeBound: {
        low: 'El objetivo debe tener un límite temporal',
        medium: 'El objetivo tiene algún límite temporal',
        high: 'El objetivo tiene límites temporales claros'
      }
    };
    
    if (score < 0.3) return feedbacks[criterion].low;
    if (score < 0.7) return feedbacks[criterion].medium;
    return feedbacks[criterion].high;
  }

  calculateConfidence(extractedData, measureType, smartValidation) {
    let confidence = 0;
    
    // Confianza basada en datos extraídos (40%)
    const dataFields = Object.keys(extractedData).length;
    const requiredFields = ['process', 'businessObjective', 'measureDefinition', 'target'];
    const extractedRequired = requiredFields.filter(field => extractedData[field]);
    const dataConfidence = extractedRequired.length / requiredFields.length * 0.4;
    
    // Confianza basada en tipo de medida (30%)
    const measureConfidence = measureType.confidence * 0.3;
    
    // Confianza basada en criterios SMART (30%)
    const smartScores = Object.values(smartValidation).map(v => v.score);
    const avgSmartScore = smartScores.reduce((a, b) => a + b, 0) / smartScores.length;
    const smartConfidence = avgSmartScore * 0.3;
    
    confidence = dataConfidence + measureConfidence + smartConfidence;
    
    return Math.min(confidence, 1);
  }

  generateSuggestions(extractedData, measureType, smartValidation) {
    const suggestions = [];
    
    // Sugerencias basadas en datos faltantes
    const requiredFields = ['process', 'businessObjective', 'measureDefinition', 'target'];
    requiredFields.forEach(field => {
      if (!extractedData[field]) {
        suggestions.push(`Agregar información de ${this.getFieldDisplayName(field)}`);
      }
    });
    
    // Sugerencias basadas en criterios SMART
    Object.entries(smartValidation).forEach(([criterion, validation]) => {
      if (!validation.valid) {
        suggestions.push(validation.feedback);
      }
    });
    
    // Sugerencias específicas por tipo de medida
    if (measureType.confidence < 0.5) {
      suggestions.push(`Clarificar el tipo de medida (actual: ${measureType.type})`);
    }
    
    return suggestions;
  }

  getFieldDisplayName(field) {
    const names = {
      process: 'proceso',
      businessObjective: 'objetivo de negocio',
      measureDefinition: 'definición de medida',
      target: 'objetivo',
      scope: 'alcance',
      source: 'fuente',
      responsible: 'responsable',
      informed: 'informados'
    };
    
    return names[field] || field;
  }

  // Método para procesar archivos
  async processFile(file) {
    try {
      const content = await this.readFileContent(file);
      return this.processText(content);
    } catch (error) {
      return {
        success: false,
        errors: [`Error al procesar archivo: ${error.message}`]
      };
    }
  }

  readFileContent(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => resolve(e.target.result);
      reader.onerror = (e) => reject(new Error('Error al leer el archivo'));
      
      if (file.name.endsWith('.json')) {
        reader.readAsText(file);
      } else {
        reader.readAsText(file);
      }
    });
  }

  // Método para validar estructura PPINOT
  validatePPINOTStructure(data) {
    const validation = {
      valid: true,
      errors: [],
      warnings: []
    };
    
    // Validar campos requeridos
    const requiredFields = ['process', 'businessObjective', 'measureDefinition', 'target'];
    requiredFields.forEach(field => {
      if (!data[field] || data[field].trim() === '') {
        validation.valid = false;
        validation.errors.push(`Campo requerido faltante: ${this.getFieldDisplayName(field)}`);
      }
    });
    
    // Validar estructura de medida
    if (data.measureDefinition && typeof data.measureDefinition === 'object') {
      if (!data.measureDefinition.type) {
        validation.warnings.push('Tipo de medida no especificado');
      }
    }
    
    // Validar vinculaciones BPMN
    if (data.bpmnLink && typeof data.bpmnLink === 'object') {
      const linkCount = Object.keys(data.bpmnLink).length;
      if (linkCount === 0) {
        validation.warnings.push('No hay elementos BPMN vinculados');
      }
    }
    
    return validation;
  }

  // Método para generar estructura PPINOT completa
  generatePPINOTStructure(processedData) {
    const ppinotStructure = {
      process: processedData.data.process || '',
      businessObjective: processedData.data.businessObjective || '',
      measureDefinition: {
        type: processedData.data.measureType || 'time',
        definition: processedData.data.measureDefinition || '',
        ...this.generateMeasureSpecificData(processedData.data)
      },
      target: processedData.data.target || '',
      scope: processedData.data.scope || 'monthly',
      source: processedData.data.source || '',
      responsible: processedData.data.responsible || '',
      informed: processedData.data.informed ? processedData.data.informed.split(',').map(s => s.trim()) : [],
      comments: processedData.data.comments || '',
      bpmnLink: {},
      metadata: {
        confidence: processedData.confidence,
        processedAt: new Date().toISOString(),
        suggestions: processedData.suggestions
      }
    };
    
    return ppinotStructure;
  }

  generateMeasureSpecificData(data) {
    const specificData = {};
    
    switch (data.measureType) {
      case 'time':
        specificData.fromEvent = data.fromEvent || '';
        specificData.toEvent = data.toEvent || '';
        specificData.timeUnit = data.timeUnit || 'hours';
        break;
      case 'count':
        specificData.countElement = data.countElement || '';
        break;
      case 'state':
        specificData.stateCondition = data.stateCondition || '';
        break;
      case 'data':
        specificData.dataField = data.dataField || '';
        specificData.dataSource = data.dataSource || '';
        break;
      case 'derived':
        specificData.formula = data.formula || '';
        specificData.dependencies = data.dependencies || '';
        break;
      case 'aggregated':
        specificData.aggregationType = data.aggregationType || '';
        specificData.groupBy = data.groupBy || '';
        break;
    }
    
    return specificData;
  }

  // Método para mejorar texto usando IA (simulado)
  enhanceText(text) {
    // Simular mejora de texto usando patrones y reglas
    let enhancedText = text;
    
    // Mejorar claridad
    enhancedText = this.improveClarity(enhancedText);
    
    // Agregar detalles faltantes
    enhancedText = this.addMissingDetails(enhancedText);
    
    // Corregir estructura
    enhancedText = this.correctStructure(enhancedText);
    
    return enhancedText;
  }

  improveClarity(text) {
    // Mejorar claridad del texto
    let improved = text;
    
    // Reemplazar términos vagos
    const vagueTerms = {
      'bueno': 'específico',
      'rápido': 'en menos de X tiempo',
      'mucho': 'cantidad específica',
      'poco': 'cantidad específica'
    };
    
    Object.entries(vagueTerms).forEach(([vague, specific]) => {
      improved = improved.replace(new RegExp(vague, 'gi'), specific);
    });
    
    return improved;
  }

  addMissingDetails(text) {
    // Agregar detalles que puedan faltar
    let enhanced = text;
    
    // Agregar unidad de tiempo si no está especificada
    if (text.includes('tiempo') && !text.includes('horas') && !text.includes('minutos') && !text.includes('días')) {
      enhanced += ' (especificar unidad: horas, minutos, días)';
    }
    
    // Agregar frecuencia si no está especificada
    if (text.includes('medir') && !text.includes('diario') && !text.includes('semanal') && !text.includes('mensual')) {
      enhanced += ' (especificar frecuencia: diario, semanal, mensual)';
    }
    
    return enhanced;
  }

  correctStructure(text) {
    // Corregir estructura del texto
    let corrected = text;
    
    // Asegurar que las definiciones terminen con punto
    if (!corrected.endsWith('.') && !corrected.endsWith('!') && !corrected.endsWith('?')) {
      corrected += '.';
    }
    
    // Capitalizar oraciones
    corrected = corrected.replace(/(^|\.\s+)([a-z])/g, (match, p1, p2) => p1 + p2.toUpperCase());
    
    return corrected;
  }
}

// Exportar para uso global
window.NaturalLanguageProcessor = NaturalLanguageProcessor; 