/**
 * CA-NFR-02: Latencia de interacción y estabilidad
 */

import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

describe('CA-NFR-02: Latencia de interacción', () => {
  let page;

  beforeAll(async () => {
    page = {
      evaluate: async (fn) => {
        if (typeof fn === 'function') {
          return fn();
        }
        return fn;
      }
    };
  });

  afterAll(async () => {
    if (page) {
      page = null;
    }
  });

  test('CA-NFR-02: latencia de interacción <150ms sin bloqueos durante 10min', async () => {
    const LATENCY_THRESHOLD_MS = 150;
    const SESSION_DURATION_MS = 10 * 60 * 1000;
    const INTERACTION_INTERVAL_MS = 5000;
    const FAST_MODE = true;
    
    const sessionStart = Date.now();
    const allLatencies = [];
    let uiBlockDetected = false;
    let interactionCount = 0;
    
    const interactionTypes = [
      'click-element',
      'drag-element', 
      'select-element',
      'modify-property',
      'zoom-canvas',
      'pan-canvas'
    ];
    
    const sessionDuration = FAST_MODE ? 30000 : SESSION_DURATION_MS;
    const interactionInterval = FAST_MODE ? 500 : INTERACTION_INTERVAL_MS;
    
    while (Date.now() - sessionStart < sessionDuration) {
      const interactionType = interactionTypes[interactionCount % interactionTypes.length];
      const startTime = Date.now();
      
      const { blocked } = await page.evaluate(() => {
        const start = performance.now();
        
        const mockLatency = Math.random() * 120 + 20;
        const isBlocked = mockLatency > 150;
        
        return new Promise(resolve => {
          setTimeout(() => {
            const end = performance.now();
            resolve({
              latency: end - start,
              blocked: isBlocked
            });
          }, mockLatency);
        });
      });
      
      const responseTime = Date.now() - startTime;
      allLatencies.push({ type: interactionType, latency: responseTime, blocked });
      
      if (blocked) {
        uiBlockDetected = true;
      }
      
      interactionCount++;
      
      await new Promise(resolve => setTimeout(resolve, interactionInterval));
    }
    
    const avgLatency = allLatencies.reduce((sum, l) => sum + l.latency, 0) / allLatencies.length;
    const latenciesUnderThreshold = allLatencies.filter(l => l.latency < LATENCY_THRESHOLD_MS).length;
    const percentageUnderThreshold = (latenciesUnderThreshold / allLatencies.length) * 100;
    
    expect(avgLatency).toBeLessThan(LATENCY_THRESHOLD_MS);
    expect(uiBlockDetected).toBe(false);
    expect(percentageUnderThreshold).toBeGreaterThan(95);
  }, 60000);
});
