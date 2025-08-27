/**
 * Migration Example - Ejemplo de migración gradual
 * Muestra cómo migrar desde window hacia el sistema de comunicación centralizado
 */

import communicationSystem from './CommunicationSystem.js';
import moduleBridge from './ModuleBridge.js';
import ppiAdapter from '../../ppis/PPIAdapter.js';
import rasciAdapter from '../../rasci/RASCIAdapter.js';

/**
 * Ejemplo de migración gradual para PPIs
 */
class PPIMigrationExample {
  constructor() {
    this.oldWay = this.oldWay.bind(this);
    this.newWay = this.newWay.bind(this);
  }

  /**
   * ANTES: Usando window (mala práctica)
   */
  oldWay() {
    console.log('=== ANTES: Usando window (mala práctica) ===');
    
    // ❌ Acceder al modelador BPMN
    const modeler = window.modeler || window.bpmnModeler;
    
    // ❌ Acceder al manager PPI
    const ppiManager = window.ppiManager;
    
    // ❌ Acceder a datos RASCI
    const rasciMatrixData = window.rasciMatrixData;
    const rasciRoles = window.rasciRoles; // eslint-disable-line no-unused-vars
    
    // ❌ Llamar funciones globales
    if (window.updateMatrixFromDiagram) {
      window.updateMatrixFromDiagram();
    }
    
    console.log('Modeler:', !!modeler);
    console.log('PPI Manager:', !!ppiManager);
    console.log('RASCI Data:', !!rasciMatrixData);
  }

  /**
   * DESPUÉS: Usando el sistema de comunicación centralizado
   */
  async newWay() {
    console.log('=== DESPUÉS: Usando sistema centralizado (buena práctica) ===');
    
    // ✅ Inicializar el sistema de comunicación
    await communicationSystem.initialize();
    
    // ✅ Obtener el modelador BPMN a través del adaptador
    const modeler = ppiAdapter.getBpmnModeler();
    
    // ✅ Obtener el manager PPI a través del adaptador
    const ppiManager = ppiAdapter.getPPIManager();
    
    // ✅ Obtener datos RASCI a través del adaptador
    const rasciData = ppiAdapter.getRasciData();
    
    // ✅ Comunicarse con RASCI usando el bridge
    const result = await ppiAdapter.communicateWithRasci('updateMatrix', {});
    
    console.log('Modeler:', !!modeler);
    console.log('PPI Manager:', !!ppiManager);
    console.log('RASCI Data:', !!rasciData);
    console.log('Communication Result:', result);
  }
}

/**
 * Ejemplo de migración gradual para RASCI
 */
class RASCIMigrationExample {
  constructor() {
    this.oldWay = this.oldWay.bind(this);
    this.newWay = this.newWay.bind(this);
  }

  /**
   * ANTES: Usando window (mala práctica)
   */
  oldWay() {
    console.log('=== ANTES: Usando window (mala práctica) ===');
    
    // ❌ Acceder al modelador BPMN
    const modeler = window.bpmnModeler;
    
    // ❌ Acceder a datos de matriz
    const matrixData = window.rasciMatrixData;
    const roles = window.rasciRoles;
    
    // ❌ Llamar funciones globales
    if (window.detectRalphRolesFromCanvas) {
      const detectedRoles = window.detectRalphRolesFromCanvas(); // eslint-disable-line no-unused-vars
    }
    
    // ❌ Actualizar datos globales
    window.rasciMatrixData = matrixData;
    window.rasciRoles = roles;
    
    console.log('Modeler:', !!modeler);
    console.log('Matrix Data:', !!matrixData);
    console.log('Roles:', !!roles);
  }

  /**
   * DESPUÉS: Usando el sistema de comunicación centralizado
   */
  async newWay() {
    console.log('=== DESPUÉS: Usando sistema centralizado (buena práctica) ===');
    
    // ✅ Inicializar el sistema de comunicación
    await communicationSystem.initialize();
    
    // ✅ Obtener el modelador BPMN a través del adaptador
    const modeler = rasciAdapter.getBpmnModeler();
    
    // ✅ Obtener datos de matriz a través del adaptador
    const matrixData = rasciAdapter.getMatrixData();
    const roles = rasciAdapter.getRoles();
    
    // ✅ Detectar roles usando el adaptador
    const detectedRoles = rasciAdapter.detectRalphRoles();
    
    // ✅ Actualizar datos usando el adaptador
    rasciAdapter.updateMatrixData(matrixData);
    rasciAdapter.updateRoles(roles);
    
    // ✅ Comunicarse con PPIs usando el bridge
    const result = await rasciAdapter.communicateWithPPIs('syncRasciData', {
      matrixData: matrixData,
      roles: roles
    });
    
    console.log('Modeler:', !!modeler);
    console.log('Matrix Data:', !!matrixData);
    console.log('Roles:', !!roles);
    console.log('Detected Roles:', detectedRoles);
    console.log('Communication Result:', result);
  }
}

/**
 * Ejemplo de comunicación entre módulos
 */
class ModuleCommunicationExample {
  constructor() {
    this.example = this.example.bind(this);
  }

  /**
   * Ejemplo de comunicación entre PPIs y RASCI
   */
  async example() {
    console.log('=== Comunicación entre módulos ===');
    
    // ✅ Inicializar el sistema
    await communicationSystem.initialize();
    
    // ✅ PPIs quiere obtener datos RASCI
    const rasciData = await ppiAdapter.communicateWithRasci('getMatrixData', {});
    console.log('PPIs obtiene datos RASCI:', rasciData);
    
    // ✅ RASCI quiere obtener datos PPIs
    const ppiData = await rasciAdapter.communicateWithPPIs('getPPIData', {});
    console.log('RASCI obtiene datos PPIs:', ppiData);
    
    // ✅ PPIs quiere sincronizar con RASCI
    const syncResult = await ppiAdapter.syncWithRasci({
      ppiId: 'example-ppi',
      taskName: 'Example Task'
    });
    console.log('Sincronización PPIs->RASCI:', syncResult);
    
    // ✅ RASCI quiere sincronizar con PPIs
    const rasciSyncResult = await rasciAdapter.syncWithPPIs({
      matrixData: { 'Task1': { 'Role1': 'R' } },
      roles: ['Role1', 'Role2']
    });
    console.log('Sincronización RASCI->PPIs:', rasciSyncResult);
  }
}

/**
 * Ejemplo de migración automática
 */
class AutomaticMigrationExample {
  constructor() {
    this.migrate = this.migrate.bind(this);
  }

  /**
   * Migración automática de funciones existentes
   */
  async migrate() {
    console.log('=== Migración automática ===');
    
    // ✅ Inicializar el sistema
    await communicationSystem.initialize();
    
    // ✅ Migrar funciones RASCI automáticamente
    communicationSystem.migrateFunction('updateMatrixFromDiagram', () => {
      console.log('Función migrada: updateMatrixFromDiagram');
      return rasciAdapter.updateMatrixData({});
    });
    
    communicationSystem.migrateFunction('detectRalphRolesFromCanvas', () => {
      console.log('Función migrada: detectRalphRolesFromCanvas');
      return rasciAdapter.detectRalphRoles();
    });
    
    // ✅ Migrar funciones PPI automáticamente
    communicationSystem.migrateFunction('getPPIManager', () => {
      console.log('Función migrada: getPPIManager');
      return ppiAdapter.getPPIManager();
    });
    
    // ✅ Verificar migración
    console.log('updateMatrixFromDiagram migrada:', 
      communicationSystem.isFunctionMigrated('updateMatrixFromDiagram'));
    console.log('detectRalphRolesFromCanvas migrada:', 
      communicationSystem.isFunctionMigrated('detectRalphRolesFromCanvas'));
    console.log('getPPIManager migrada:', 
      communicationSystem.isFunctionMigrated('getPPIManager'));
  }
}

/**
 * Ejemplo de debugging del sistema
 */
class DebugExample {
  constructor() {
    this.debug = this.debug.bind(this);
  }

  /**
   * Debug del sistema completo
   */
  async debug() {
    console.log('=== Debug del sistema ===');
    
    // ✅ Inicializar el sistema
    await communicationSystem.initialize();
    
    // ✅ Debug del sistema de comunicación
    console.log('Communication System Stats:', communicationSystem.getStats());
    
    // ✅ Debug del Module Bridge
    console.log('Module Bridge Status:', moduleBridge.getStatus());
    
    // ✅ Debug de los adaptadores
    console.log('PPI Adapter Status:', ppiAdapter.getStatus());
    console.log('RASCI Adapter Status:', rasciAdapter.getStatus());
    
    // ✅ Debug completo
    communicationSystem.debug();
  }
}

// Exportar ejemplos
export {
  PPIMigrationExample,
  RASCIMigrationExample,
  ModuleCommunicationExample,
  AutomaticMigrationExample,
  DebugExample
};

// Función helper para ejecutar todos los ejemplos
export async function runAllExamples() {
  console.log('🚀 Ejecutando ejemplos de migración...\n');
  
  const ppiExample = new PPIMigrationExample();
  const rasciExample = new RASCIMigrationExample();
  const communicationExample = new ModuleCommunicationExample();
  const migrationExample = new AutomaticMigrationExample();
  const debugExample = new DebugExample();
  
  // Ejecutar ejemplos
  await ppiExample.oldWay();
  console.log('\n');
  
  await ppiExample.newWay();
  console.log('\n');
  
  await rasciExample.oldWay();
  console.log('\n');
  
  await rasciExample.newWay();
  console.log('\n');
  
  await communicationExample.example();
  console.log('\n');
  
  await migrationExample.migrate();
  console.log('\n');
  
  await debugExample.debug();
  
  console.log('\n✅ Todos los ejemplos ejecutados correctamente');
}
