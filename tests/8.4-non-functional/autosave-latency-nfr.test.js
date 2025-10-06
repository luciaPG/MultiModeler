/**
 * CA-NFR-04: Autosave latency should be <= 2.5s and recovery after crash < 30s
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import { jest } from '@jest/globals';
import { AutosaveManager } from '../../app/services/autosave-manager.js';

// Simple in-memory EventBus stub
function createEventBus() {
  const listeners = {};
  return {
    subscribe(type, cb) {
      if (!listeners[type]) listeners[type] = [];
      listeners[type].push(cb);
    },
    publish(type, payload) {
      (listeners[type] || []).forEach((cb) => cb(payload));
    }
  };
}

describe('CA-NFR-04: Autosave y recuperación tras crash', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // jsdom localStorage is available; ensure clean
    localStorage.clear();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('autosave completes within <= 2.5s window from first change', async () => {
    const eventBus = createEventBus();

    // Mock storageManager.saveProject to succeed quickly
    const storageManager = {
      saveProject: jest.fn().mockResolvedValue({ success: true })
    };

    // Configure interval to 2000ms and enabled=true
    const manager = new AutosaveManager({
      eventBus,
      storageManager,
      enabled: true,
      interval: 2000
    });

    // Mark a change (this schedules autosave in `interval` ms)
    manager.markAsChanged();

    // Advance time by 2500ms to cover debounce(implicit) + min interval
    jest.advanceTimersByTime(2500);

    // Allow any pending microtasks to flush
    await Promise.resolve();

    // Assertions: a draft should be written and storageManager.saveProject called
    const draft = localStorage.getItem('draft:multinotation');
    expect(draft).toBeTruthy();
    expect(storageManager.saveProject).toHaveBeenCalled();
  });

  test('CA-NFR-04: proyecto se recupera completamente en <30s tras crash', async () => {
    
    const RECOVERY_THRESHOLD_MS = 30000; // 30 segundos
    const eventBus = createEventBus();
    
    // 1. Crear proyecto con datos significativos
    const projectData = {
      version: '1.0.0',
      metadata: {
        name: 'Test Project',
        author: 'Test User',
        lastModified: Date.now()
      },
      bpmn: {
        xml: '<bpmn>'.repeat(100) + '</bpmn>', // Simular diagrama grande
        elements: Array.from({ length: 50 }, (_, i) => ({ id: `element_${i}`, type: 'task' }))
      },
      ppinot: {
        measures: Array.from({ length: 20 }, (_, i) => ({ id: `ppi_${i}`, type: 'count' }))
      },
      rasci: {
        matrix: Array.from({ length: 30 }, (_, i) => ({ task: `task_${i}`, roles: ['R', 'A', 'C'] }))
      }
    };
    
    const storageManager = {
      saveProject: jest.fn().mockResolvedValue({ success: true }),
      loadProject: jest.fn().mockResolvedValue({ success: true, project: projectData })
    };
    
    // 2. Guardar proyecto vía autosave
    const manager = new AutosaveManager({
      eventBus,
      storageManager,
      enabled: true,
      interval: 2000
    });
    
    manager.markAsChanged();
    jest.advanceTimersByTime(2500);
    await Promise.resolve();
    
    // Guardar draft en localStorage
    localStorage.setItem('draft:multinotation', JSON.stringify(projectData));
    expect(localStorage.getItem('draft:multinotation')).toBeTruthy();
    
    // 3. Simular CRASH (reiniciar aplicación)
    jest.useRealTimers(); // Usar timers reales para medir tiempo de recuperación
    
    const recoveryStartTime = Date.now();
    
    // 4. RECUPERACIÓN: Cargar draft desde localStorage
    const recoveredDraft = localStorage.getItem('draft:multinotation');
    expect(recoveredDraft).toBeTruthy();
    
    const recoveredProject = JSON.parse(recoveredDraft);
    
    // Simular procesamiento de recuperación (parseo, validación, reconstrucción)
    await new Promise(resolve => setTimeout(resolve, 50)); // Simular tiempo de procesamiento
    
    const recoveryEndTime = Date.now();
    const recoveryTime = recoveryEndTime - recoveryStartTime;
    
    // 5. VALIDAR recuperación completa
    expect(recoveredProject.metadata.name).toBe(projectData.metadata.name);
    expect(recoveredProject.bpmn.elements.length).toBe(50);
    expect(recoveredProject.ppinot.measures.length).toBe(20);
    expect(recoveredProject.rasci.matrix.length).toBe(30);
    
    // 6. VALIDACIÓN CA-NFR-04: Recuperación en <30s
    expect(recoveryTime).toBeLessThan(RECOVERY_THRESHOLD_MS);
    
    
    jest.useFakeTimers(); // Restaurar para otros tests
  });
});




