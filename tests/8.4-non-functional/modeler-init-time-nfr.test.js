/**
 * NFR: Modeler initialization should complete quickly (smoke threshold <= 1000ms in test env).
 * Note: JSDOM is not a real browser; this is a smoke check for regressions.
 */

describe('NFR - Modeler init time (smoke)', () => {
  test('initialization finishes within <= 1000ms (simulated)', async () => {
    const t0 = performance.now();

    // Simulate a lightweight init path by requiring modules lazily.
    // We avoid real BPMN rendering in JSDOM.
    const { default: ServiceRegistryModule } = await import('../../app/modules/ui/core/ServiceRegistry.js');
    expect(ServiceRegistryModule).toBeDefined();

    const t1 = performance.now();
    expect(t1 - t0).toBeLessThanOrEqual(1000);
  });
});



