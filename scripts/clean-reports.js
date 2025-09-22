/**
 * Script para limpiar reportes innecesarios y mantener solo los esenciales para el TFG
 */

const fs = require('fs');
const path = require('path');

function cleanReports() {
  console.log('🧹 Limpiando reportes innecesarios...\n');

  const reportsDir = path.join(process.cwd(), 'reports');
  
  // Directorios a eliminar (reportes HTML masivos)
  const dirsToDelete = [
    'coverage-real',
    'coverage-tfg/app',
    'coverage-tfg/lcov-report',
    'tfg-test-results'
  ];

  // Archivos a eliminar (reportes antiguos)
  const filesToDelete = [
    'junit.xml',
    'sprint1-results.json',
    'sprint2-results.json', 
    'sprint3-results.json',
    'sprint4-results.json',
    'sprint5-results.json',
    'complete-results.json'
  ];

  let deletedDirs = 0;
  let deletedFiles = 0;

  // Eliminar directorios
  dirsToDelete.forEach(dir => {
    const fullPath = path.join(reportsDir, dir);
    if (fs.existsSync(fullPath)) {
      try {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`✅ Eliminado directorio: ${dir}`);
        deletedDirs++;
      } catch (error) {
        console.log(`⚠️ No se pudo eliminar: ${dir} (${error.message})`);
      }
    }
  });

  // Eliminar archivos
  filesToDelete.forEach(file => {
    const fullPath = path.join(reportsDir, file);
    if (fs.existsSync(fullPath)) {
      try {
        fs.unlinkSync(fullPath);
        console.log(`✅ Eliminado archivo: ${file}`);
        deletedFiles++;
      } catch (error) {
        console.log(`⚠️ No se pudo eliminar: ${file} (${error.message})`);
      }
    }
  });

  console.log(`\n📊 Resumen de limpieza:`);
  console.log(`   - Directorios eliminados: ${deletedDirs}`);
  console.log(`   - Archivos eliminados: ${deletedFiles}`);

  // Mostrar reportes que se mantienen (esenciales para TFG)
  console.log(`\n📋 Reportes mantenidos (esenciales para TFG):`);
  
  const essentialReports = [
    'diagnostico-sistema-real.md',
    'evaluacion-tests-integracion.md', 
    'resumen-tests-calidad-maxima.md',
    'unit-tests/informe-unitarios-tfg.html',
    'unit-tests/resumen-unitarios.json',
    'coverage-tfg/coverage-final.json',
    'coverage-tfg/index.html'
  ];

  essentialReports.forEach(report => {
    const fullPath = path.join(reportsDir, report);
    if (fs.existsSync(fullPath)) {
      console.log(`   ✅ ${report}`);
    } else {
      console.log(`   ❌ ${report} (no encontrado)`);
    }
  });

  console.log(`\n🎯 Solo se mantienen los reportes esenciales para documentación del TFG.`);
  console.log(`💡 Para generar reportes HTML completos cuando los necesites:`);
  console.log(`   npm run test:coverage-html`);
}

cleanReports();
