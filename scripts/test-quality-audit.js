/**
 * AUDITORÍA DE CALIDAD DE TESTS
 * Verifica que los tests realmente validen la funcionalidad del sistema
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

async function auditTestQuality() {
  console.log('🔍 AUDITORÍA DE CALIDAD DE TESTS\n');
  
  const auditResults = {
    realCodeImports: 0,
    mockOnlyTests: 0,
    potentialFalsePositives: [],
    realValidationTests: [],
    recommendations: []
  };

  // 1. Verificar imports reales vs mocks
  console.log('1️⃣ Verificando imports de código real...\n');
  
  const testFiles = [
    'tests/8.1-unitarias/event-bus.test.js',
    'tests/8.1-unitarias/service-registry.test.js',
    'tests/8.1-unitarias/storage-manager.test.js',
    'tests/8.1-unitarias/autosave-manager.test.js',
    'tests/8.1-unitarias/validadores.test.js'
  ];

  for (const testFile of testFiles) {
    if (fs.existsSync(testFile)) {
      const content = fs.readFileSync(testFile, 'utf8');
      
      // Buscar imports reales
      const realImports = content.match(/import.*from.*['"](\.\.\/\.\.\/app\/.*)['"]/g) || [];
      const mockImports = content.match(/jest\.mock|require.*mock/g) || [];
      
      if (realImports.length > 0) {
        auditResults.realCodeImports++;
        auditResults.realValidationTests.push({
          file: testFile,
          realImports: realImports.length,
          mockImports: mockImports.length,
          ratio: realImports.length / (mockImports.length + 1)
        });
        
        console.log(`✅ ${path.basename(testFile)}: ${realImports.length} imports reales`);
        realImports.forEach(imp => console.log(`   ${imp}`));
      } else {
        auditResults.mockOnlyTests++;
        auditResults.potentialFalsePositives.push(testFile);
        console.log(`⚠️ ${path.basename(testFile)}: Solo mocks, sin código real`);
      }
      console.log('');
    }
  }

  // 2. Verificar tests que realmente fallan
  console.log('2️⃣ Verificando que tests fallan cuando deben fallar...\n');
  
  // Crear un test de "mutation" - cambiar código y ver si falla
  const eventBusPath = 'app/modules/ui/core/event-bus.js';
  if (fs.existsSync(eventBusPath)) {
    const originalCode = fs.readFileSync(eventBusPath, 'utf8');
    
    // Crear una mutación que debería hacer fallar el test
    const mutatedCode = originalCode.replace(
      'this.subscribers = {};',
      'this.subscribers = null; // MUTATION TEST'
    );
    
    try {
      // Aplicar mutación
      fs.writeFileSync(eventBusPath, mutatedCode);
      
      // Ejecutar test y ver si falla
      const testResult = execSync('npm run test:unitarias -- --testNamePattern="EventBus" --verbose', {
        encoding: 'utf8',
        stdio: 'pipe'
      });
      
      // Si llega aquí, el test NO falló (malo)
      auditResults.potentialFalsePositives.push('EventBus test no detectó mutación crítica');
      console.log('❌ EventBus test NO falló con mutación crítica');
      
    } catch (error) {
      // Si falla, es bueno - el test SÍ está validando
      auditResults.realValidationTests.push({
        test: 'EventBus mutation test',
        result: 'PASSED - Test detectó mutación'
      });
      console.log('✅ EventBus test SÍ falló con mutación crítica');
    } finally {
      // Restaurar código original
      fs.writeFileSync(eventBusPath, originalCode);
    }
  }

  // 3. Verificar cobertura de casos críticos
  console.log('\n3️⃣ Verificando cobertura de casos críticos...\n');
  
  const criticalCases = [
    {
      module: 'EventBus',
      cases: ['singleton pattern', 'event subscription', 'event publishing', 'error handling']
    },
    {
      module: 'ServiceRegistry', 
      cases: ['service registration', 'dependency injection', 'circular dependency detection']
    },
    {
      module: 'StorageManager',
      cases: ['save/load operations', 'data validation', 'error recovery']
    }
  ];

  for (const module of criticalCases) {
    const testFile = `tests/8.1-unitarias/${module.module.toLowerCase()}.test.js`;
    if (fs.existsSync(testFile)) {
      const content = fs.readFileSync(testFile, 'utf8');
      
      let coveredCases = 0;
      for (const criticalCase of module.cases) {
        const regex = new RegExp(criticalCase.replace(/\s+/g, '.*'), 'i');
        if (regex.test(content)) {
          coveredCases++;
        }
      }
      
      const coverage = (coveredCases / module.cases.length) * 100;
      console.log(`${module.module}: ${coveredCases}/${module.cases.length} casos críticos (${coverage.toFixed(1)}%)`);
      
      if (coverage < 75) {
        auditResults.recommendations.push(`Mejorar cobertura de casos críticos en ${module.module}`);
      }
    }
  }

  // 4. Generar reporte final
  console.log('\n📊 REPORTE DE AUDITORÍA\n');
  console.log(`Tests con código real: ${auditResults.realCodeImports}`);
  console.log(`Tests solo con mocks: ${auditResults.mockOnlyTests}`);
  console.log(`Posibles falsos positivos: ${auditResults.potentialFalsePositives.length}`);
  
  if (auditResults.potentialFalsePositives.length > 0) {
    console.log('\n⚠️ TESTS SOSPECHOSOS:');
    auditResults.potentialFalsePositives.forEach(test => {
      console.log(`   - ${test}`);
    });
  }

  if (auditResults.recommendations.length > 0) {
    console.log('\n💡 RECOMENDACIONES:');
    auditResults.recommendations.forEach(rec => {
      console.log(`   - ${rec}`);
    });
  }

  // Calcular puntuación de calidad
  const qualityScore = (auditResults.realCodeImports / (auditResults.realCodeImports + auditResults.mockOnlyTests)) * 100;
  
  console.log(`\n🎯 PUNTUACIÓN DE CALIDAD: ${qualityScore.toFixed(1)}%`);
  
  if (qualityScore >= 80) {
    console.log('✅ EXCELENTE: Tests están validando código real');
  } else if (qualityScore >= 60) {
    console.log('⚠️ BUENO: Mayoría de tests validan código real, hay margen de mejora');
  } else {
    console.log('❌ MEJORABLE: Muchos tests podrían ser falsos positivos');
  }

  return auditResults;
}

// Ejecutar auditoría
if (require.main === module) {
  auditTestQuality().catch(console.error);
}

module.exports = { auditTestQuality };
