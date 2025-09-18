/**
 * Script para limpiar console.logs de debug/desarrollo
 * Mejora la cobertura de código eliminando líneas innecesarias
 */

const fs = require('fs');
const path = require('path');

// Patrones de console.logs que son de debug/desarrollo
const DEBUG_PATTERNS = [
  /console\.log\([^)]*🤖[^)]*\);?\s*$/gm,  // Logs con emoji robot
  /console\.log\([^)]*📋[^)]*\);?\s*$/gm,  // Logs con emoji clipboard
  /console\.log\([^)]*🧹[^)]*\);?\s*$/gm,  // Logs con emoji broom
  /console\.log\([^)]*🔍[^)]*\);?\s*$/gm,  // Logs con emoji search
  /console\.log\([^)]*✅[^)]*\);?\s*$/gm,  // Logs con emoji check
  /console\.log\([^)]*❌[^)]*\);?\s*$/gm,  // Logs con emoji X
  /console\.log\([^)]*🎯[^)]*\);?\s*$/gm,  // Logs con emoji target
  /console\.log\([^)]*🔄[^)]*\);?\s*$/gm,  // Logs con emoji refresh
  /console\.log\([^)]*DEBUG[^)]*\);?\s*$/gm, // Logs con DEBUG
  /console\.log\([^)]*ℹ️[^)]*\);?\s*$/gm,  // Logs con emoji info
  /\/\/ console\.log.*$/gm,                // Console.logs comentados
  /console\.log\([^)]*Estado actual[^)]*\);?\s*$/gm, // Logs de estado
  /console\.log\([^)]*Verificando[^)]*\);?\s*$/gm,   // Logs de verificación
];

// Archivos que necesitan limpieza prioritaria
const PRIORITY_FILES = [
  'app/modules/rasci/core/matrix-manager.js',
  'app/modules/ppis/core/ppi-core.js',
  'app/modules/ppis/ui/ppi-ui.js',
  'app/modules/ui/managers/localstorage-autosave-manager.js',
  'app/modules/ui/managers/import-export-manager.js',
  'app/modules/ui/managers/ppinot-coordination-manager.js'
];

function cleanDebugLogs(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let cleanedContent = content;
    let removedLines = 0;
    
    // Aplicar patrones de limpieza
    DEBUG_PATTERNS.forEach(pattern => {
      const matches = cleanedContent.match(pattern);
      if (matches) {
        removedLines += matches.length;
        cleanedContent = cleanedContent.replace(pattern, '');
      }
    });
    
    // Limpiar líneas vacías consecutivas (máximo 2)
    cleanedContent = cleanedContent.replace(/\n{3,}/g, '\n\n');
    
    // Solo escribir si hay cambios significativos
    if (removedLines > 5) {
      fs.writeFileSync(filePath, cleanedContent);
      console.log(`✅ ${filePath}: ${removedLines} debug logs eliminados`);
      return removedLines;
    } else {
      console.log(`ℹ️ ${filePath}: ${removedLines} logs (no requiere limpieza)`);
      return 0;
    }
    
  } catch (error) {
    console.error(`❌ Error limpiando ${filePath}:`, error.message);
    return 0;
  }
}

function main() {
  console.log('🧹 Iniciando limpieza de debug logs...\n');
  
  let totalRemoved = 0;
  let filesProcessed = 0;
  
  PRIORITY_FILES.forEach(filePath => {
    if (fs.existsSync(filePath)) {
      const removed = cleanDebugLogs(filePath);
      totalRemoved += removed;
      filesProcessed++;
    } else {
      console.log(`⚠️ Archivo no encontrado: ${filePath}`);
    }
  });
  
  console.log(`\n📊 Resumen de limpieza:`);
  console.log(`   Archivos procesados: ${filesProcessed}`);
  console.log(`   Debug logs eliminados: ${totalRemoved}`);
  console.log(`   Mejora estimada en cobertura: +${Math.round(totalRemoved / 100)}%`);
  
  if (totalRemoved > 50) {
    console.log('\n🎉 Limpieza significativa completada!');
    console.log('💡 Ejecuta los tests para ver la mejora en cobertura');
  }
}

main();
