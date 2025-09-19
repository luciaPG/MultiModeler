#!/usr/bin/env node
// Script para generar informe completo de tests

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Configuración del informe
const REPORT_DIR = './reports';
const COVERAGE_DIR = './coverage';

// Crear directorios si no existen
function ensureDirectoryExists(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

// Ejecutar tests y generar datos
async function runTestsAndGenerateReport() {
  console.log('🧪 Generando informe completo de tests...\n');
  
  // Crear directorios
  ensureDirectoryExists(REPORT_DIR);
  ensureDirectoryExists(COVERAGE_DIR);
  
  // Obtener información del proyecto
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const projectInfo = {
    name: packageJson.name,
    version: packageJson.version,
    description: packageJson.description,
    timestamp: new Date().toISOString(),
    reportGenerated: new Date().toLocaleString('es-ES', { 
      timeZone: 'Europe/Madrid',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    })
  };

  // Ejecutar tests por sprint
  const sprints = ['sprint1', 'sprint2', 'sprint3', 'sprint4', 'sprint5'];
  const sprintResults = {};
  
  for (const sprint of sprints) {
    console.log(`📋 Ejecutando tests del ${sprint.toUpperCase()}...`);
    
    try {
      // Ejecutar tests del sprint específico
      const testCommand = `npm run test:${sprint} -- --json --outputFile=${REPORT_DIR}/${sprint}-results.json`;
      
      try {
        execSync(testCommand, { stdio: 'inherit' });
        console.log(`✅ ${sprint.toUpperCase()} completado`);
      } catch (error) {
        console.log(`⚠️  ${sprint.toUpperCase()} completado con errores`);
      }
      
      // Leer resultados si existen
      const resultFile = path.join(REPORT_DIR, `${sprint}-results.json`);
      if (fs.existsSync(resultFile)) {
        const results = JSON.parse(fs.readFileSync(resultFile, 'utf8'));
        sprintResults[sprint] = {
          numTotalTests: results.numTotalTests || 0,
          numPassedTests: results.numPassedTests || 0,
          numFailedTests: results.numFailedTests || 0,
          numPendingTests: results.numPendingTests || 0,
          success: results.success || false,
          testResults: results.testResults || []
        };
      } else {
        sprintResults[sprint] = {
          numTotalTests: 0,
          numPassedTests: 0,
          numFailedTests: 0,
          numPendingTests: 0,
          success: false,
          testResults: [],
          error: 'No se encontraron tests para este sprint'
        };
      }
    } catch (error) {
      console.error(`❌ Error ejecutando tests del ${sprint}:`, error.message);
      sprintResults[sprint] = {
        numTotalTests: 0,
        numPassedTests: 0,
        numFailedTests: 0,
        numPendingTests: 0,
        success: false,
        testResults: [],
        error: error.message
      };
    }
  }
  
  console.log('\n📊 Ejecutando tests completos para cobertura...');
  
  // Ejecutar todos los tests para obtener cobertura completa
  try {
    execSync('npm test -- --coverage --json --outputFile=./reports/complete-results.json', { 
      stdio: 'inherit' 
    });
  } catch (error) {
    console.log('⚠️  Tests completados con algunos errores');
  }
  
  // Leer resultados completos
  let completeResults = {};
  const completeResultFile = './reports/complete-results.json';
  if (fs.existsSync(completeResultFile)) {
    completeResults = JSON.parse(fs.readFileSync(completeResultFile, 'utf8'));
  }
  
  // Leer cobertura
  let coverageData = {};
  const coverageFile = './coverage/coverage-final.json';
  if (fs.existsSync(coverageFile)) {
    coverageData = JSON.parse(fs.readFileSync(coverageFile, 'utf8'));
  }
  
  // Generar informe HTML personalizado
  await generateCustomHtmlReport(projectInfo, sprintResults, completeResults, coverageData);
  
  // Generar resumen en consola
  generateConsoleSummary(projectInfo, sprintResults, completeResults);
  
  console.log('\n🎉 Informe completo generado exitosamente!');
  console.log(`📁 Reportes disponibles en: ${path.resolve(REPORT_DIR)}`);
  console.log(`📊 Cobertura disponible en: ${path.resolve(COVERAGE_DIR)}/index.html`);
}

// Generar informe HTML personalizado
async function generateCustomHtmlReport(projectInfo, sprintResults, completeResults, coverageData) {
  const totalTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numTotalTests, 0);
  const passedTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numPassedTests, 0);
  const failedTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numFailedTests, 0);
  
  // Calcular estadísticas de cobertura
  const coverageStats = calculateCoverageStats(coverageData);
  
  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Informe de Tests - ${projectInfo.name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background-color: #f5f5f5;
        }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px; 
            border-radius: 10px; 
            margin-bottom: 30px; 
            text-align: center;
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { font-size: 1.1em; opacity: 0.9; }
        .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin-bottom: 30px; 
        }
        .stat-card { 
            background: white; 
            padding: 25px; 
            border-radius: 10px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            text-align: center;
            transition: transform 0.2s;
        }
        .stat-card:hover { transform: translateY(-2px); }
        .stat-number { font-size: 2.5em; font-weight: bold; margin-bottom: 10px; }
        .stat-label { color: #666; font-size: 1.1em; }
        .success { color: #27ae60; }
        .error { color: #e74c3c; }
        .warning { color: #f39c12; }
        .info { color: #3498db; }
        .section { 
            background: white; 
            margin-bottom: 30px; 
            border-radius: 10px; 
            box-shadow: 0 4px 6px rgba(0,0,0,0.1); 
            overflow: hidden;
        }
        .section-header { 
            background: #f8f9fa; 
            padding: 20px; 
            border-bottom: 1px solid #dee2e6; 
        }
        .section-header h2 { color: #495057; }
        .section-content { padding: 20px; }
        .sprint-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
        }
        .sprint-card { 
            border: 1px solid #dee2e6; 
            border-radius: 8px; 
            overflow: hidden;
        }
        .sprint-header { 
            padding: 15px; 
            font-weight: bold; 
            color: white;
        }
        .sprint-1 { background: #3498db; }
        .sprint-2 { background: #9b59b6; }
        .sprint-3 { background: #e67e22; }
        .sprint-4 { background: #1abc9c; }
        .sprint-5 { background: #34495e; }
        .sprint-body { padding: 15px; background: white; }
        .test-stat { 
            display: flex; 
            justify-content: space-between; 
            margin-bottom: 8px;
            padding: 5px 0;
            border-bottom: 1px solid #eee;
        }
        .progress-bar { 
            width: 100%; 
            height: 20px; 
            background: #ecf0f1; 
            border-radius: 10px; 
            overflow: hidden; 
            margin: 10px 0;
        }
        .progress-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #27ae60, #2ecc71); 
            transition: width 0.3s ease;
        }
        .coverage-section { margin-top: 20px; }
        .coverage-item { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 10px 0; 
            border-bottom: 1px solid #eee;
        }
        .coverage-bar { 
            width: 200px; 
            height: 10px; 
            background: #ecf0f1; 
            border-radius: 5px; 
            overflow: hidden;
        }
        .coverage-fill { 
            height: 100%; 
            background: linear-gradient(90deg, #e74c3c, #f39c12, #27ae60);
        }
        .timestamp { 
            text-align: center; 
            color: #666; 
            margin-top: 30px; 
            padding: 20px;
            background: white;
            border-radius: 10px;
        }
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header { padding: 20px; }
            .header h1 { font-size: 2em; }
            .stats-grid { grid-template-columns: 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📊 Informe de Tests</h1>
            <p>${projectInfo.name} v${projectInfo.version}</p>
            <p>${projectInfo.description}</p>
        </div>

        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-number success">${passedTests}</div>
                <div class="stat-label">Tests Exitosos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number error">${failedTests}</div>
                <div class="stat-label">Tests Fallidos</div>
            </div>
            <div class="stat-card">
                <div class="stat-number info">${totalTests}</div>
                <div class="stat-label">Total Tests</div>
            </div>
            <div class="stat-card">
                <div class="stat-number ${passedTests === totalTests ? 'success' : 'warning'}">
                    ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%
                </div>
                <div class="stat-label">Tasa de Éxito</div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <h2>🚀 Resultados por Sprint</h2>
            </div>
            <div class="section-content">
                <div class="sprint-grid">
                    ${Object.entries(sprintResults).map(([sprint, results], index) => `
                        <div class="sprint-card">
                            <div class="sprint-header sprint-${index + 1}">
                                ${sprint.toUpperCase()}
                            </div>
                            <div class="sprint-body">
                                <div class="test-stat">
                                    <span>Total:</span>
                                    <span><strong>${results.numTotalTests}</strong></span>
                                </div>
                                <div class="test-stat">
                                    <span>Exitosos:</span>
                                    <span class="success"><strong>${results.numPassedTests}</strong></span>
                                </div>
                                <div class="test-stat">
                                    <span>Fallidos:</span>
                                    <span class="error"><strong>${results.numFailedTests}</strong></span>
                                </div>
                                <div class="test-stat">
                                    <span>Pendientes:</span>
                                    <span class="warning"><strong>${results.numPendingTests}</strong></span>
                                </div>
                                <div class="progress-bar">
                                    <div class="progress-fill" style="width: ${results.numTotalTests > 0 ? (results.numPassedTests / results.numTotalTests) * 100 : 0}%"></div>
                                </div>
                                <div style="text-align: center; margin-top: 10px;">
                                    <span class="${results.success ? 'success' : 'error'}">
                                        ${results.success ? '✅ ÉXITO' : '❌ FALLOS'}
                                    </span>
                                </div>
                                ${results.error ? `<div style="color: #e74c3c; margin-top: 10px; font-size: 0.9em;">${results.error}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="section">
            <div class="section-header">
                <h2>📈 Cobertura de Código</h2>
            </div>
            <div class="section-content">
                <div class="coverage-section">
                    ${Object.entries(coverageStats).map(([metric, value]) => `
                        <div class="coverage-item">
                            <span><strong>${metric}:</strong></span>
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <div class="coverage-bar">
                                    <div class="coverage-fill" style="width: ${value}%"></div>
                                </div>
                                <span><strong>${value}%</strong></span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>

        <div class="timestamp">
            <p><strong>Informe generado:</strong> ${projectInfo.reportGenerated}</p>
            <p><strong>Versión del proyecto:</strong> ${projectInfo.version}</p>
        </div>
    </div>
</body>
</html>`;

  fs.writeFileSync(path.join(REPORT_DIR, 'informe-completo.html'), html, 'utf8');
}

// Calcular estadísticas de cobertura desde el formato de Jest
function calculateCoverageStats(coverageData) {
  const stats = {
    'Líneas': 0,
    'Funciones': 0,
    'Ramas': 0,
    'Declaraciones': 0
  };

  if (!coverageData || Object.keys(coverageData).length === 0) {
    return stats;
  }

  let totalStatements = 0, coveredStatements = 0;
  let totalFunctions = 0, coveredFunctions = 0;
  let totalBranches = 0, coveredBranches = 0;

  // Procesar cada archivo en el formato de Jest
  Object.values(coverageData).forEach(fileData => {
    if (fileData.s && fileData.f && fileData.b) {
      // Statements (declaraciones)
      const statements = Object.values(fileData.s);
      totalStatements += statements.length;
      coveredStatements += statements.filter(count => count > 0).length;
      
      // Functions
      const functions = Object.values(fileData.f);
      totalFunctions += functions.length;
      coveredFunctions += functions.filter(count => count > 0).length;
      
      // Branches (ramas)
      const branches = Object.values(fileData.b).flat();
      totalBranches += branches.length;
      coveredBranches += branches.filter(count => count > 0).length;
    }
  });

  // Calcular porcentajes
  stats['Declaraciones'] = totalStatements > 0 ? Math.round((coveredStatements / totalStatements) * 100) : 0;
  stats['Funciones'] = totalFunctions > 0 ? Math.round((coveredFunctions / totalFunctions) * 100) : 0;
  stats['Ramas'] = totalBranches > 0 ? Math.round((coveredBranches / totalBranches) * 100) : 0;
  stats['Líneas'] = stats['Declaraciones']; // Aproximación para líneas

  console.log(`📊 Cobertura calculada: ${coveredStatements}/${totalStatements} declaraciones (${stats['Declaraciones']}%)`);
  console.log(`📊 Funciones: ${coveredFunctions}/${totalFunctions} (${stats['Funciones']}%)`);
  console.log(`📊 Ramas: ${coveredBranches}/${totalBranches} (${stats['Ramas']}%)`);

  return stats;
}

// Generar resumen en consola
function generateConsoleSummary(projectInfo, sprintResults, completeResults) {
  console.log('\n' + '='.repeat(60));
  console.log('📋 RESUMEN DE TESTS - ' + projectInfo.name.toUpperCase());
  console.log('='.repeat(60));
  
  const totalTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numTotalTests, 0);
  const passedTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numPassedTests, 0);
  const failedTests = Object.values(sprintResults).reduce((sum, sprint) => sum + sprint.numFailedTests, 0);
  
  console.log(`📊 ESTADÍSTICAS GENERALES:`);
  console.log(`   Total de tests: ${totalTests}`);
  console.log(`   ✅ Exitosos: ${passedTests}`);
  console.log(`   ❌ Fallidos: ${failedTests}`);
  console.log(`   📈 Tasa de éxito: ${totalTests > 0 ? Math.round((passedTests / totalTests) * 100) : 0}%`);
  
  console.log(`\n🚀 DESGLOSE POR SPRINT:`);
  Object.entries(sprintResults).forEach(([sprint, results]) => {
    const successRate = results.numTotalTests > 0 ? Math.round((results.numPassedTests / results.numTotalTests) * 100) : 0;
    console.log(`   ${sprint.toUpperCase()}: ${results.numPassedTests}/${results.numTotalTests} (${successRate}%) ${results.success ? '✅' : '❌'}`);
  });
  
  console.log('\n' + '='.repeat(60));
}

// Ejecutar el script
if (require.main === module) {
  runTestsAndGenerateReport().catch(console.error);
}

module.exports = { runTestsAndGenerateReport };

