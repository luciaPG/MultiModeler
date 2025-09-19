/**
 * HU-01: CREACIÓN DE DIAGRAMA BPMN
 * 
 * Test basado en tu grabación real que funciona con la aplicación
 */

import { test, expect } from '@playwright/test';

test.describe('HU-01: Crear Diagrama BPMN', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navegar a la aplicación
    await page.goto('http://localhost:9000/');
    
    // Esperar a que cargue completamente
    await page.waitForLoadState('networkidle');
    
    // Esperar un poco más para asegurar que todo esté listo
    await page.waitForTimeout(2000);
  });

  test('Debe crear un diagrama BPMN completo - Grabación Real', async ({ page }) => {
    // PASO 1: Crear nuevo diagrama
    await test.step('Crear nuevo diagrama', async () => {
      await page.getByRole('button', { name: '+ Crear Nuevo Diagrama' }).click();
      
      // Esperar a que aparezca el canvas
      await page.waitForSelector('.djs-container', { timeout: 10000 });
    });

    // PASO 2: Seguir exactamente tu grabación que funciona
    await test.step('Crear elementos BPMN (secuencia grabada)', async () => {
      // Tu secuencia exacta que funciona
      await page.locator('rect').click();
      await page.getByTitle('Append end event').click();
      await page.locator('.djs-element.djs-shape.hover > .djs-hit').click();
      await page.getByTitle('Append intermediate/boundary').click();
      await page.getByTitle('Append gateway').click();
      await page.getByTitle('Append task').click();
      await page.locator('.djs-element.djs-shape.hover > .djs-hit').click();
      await page.getByTitle('Append task').click();
      await page.locator('.djs-element.djs-shape.hover > .djs-hit').click();
      await page.getByTitle('Append end event').click();
      await page.locator('.djs-element.djs-shape.hover > .djs-hit').click();
      await page.getByTitle('Append end event').click();
      await page.getByRole('img').first().click();
    });

    // PASO 3: Verificaciones básicas
    await test.step('Verificar que se crearon elementos', async () => {
      // Verificar que hay elementos en el canvas
      const elements = page.locator('.djs-element.djs-shape');
      const elementCount = await elements.count();
      expect(elementCount).toBeGreaterThan(0);
      
      console.log(`✅ Se crearon ${elementCount} elementos BPMN`);
    });

    // PASO 4: Screenshot del resultado
    await page.screenshot({ 
      path: 'tests/e2e-playwright/screenshots/diagrama-bpmn-completo.png',
      fullPage: true 
    });
  });

  test('Debe verificar que el canvas funciona correctamente', async ({ page }) => {
    // Test simple para verificar que el canvas está disponible
    
    // Crear nuevo diagrama
    await page.getByRole('button', { name: '+ Crear Nuevo Diagrama' }).click();
    
    // Esperar a que aparezca el canvas
    await page.waitForSelector('.djs-container', { timeout: 10000 });
    
    // Verificar que el canvas está disponible
    await expect(page.locator('.djs-container')).toBeVisible();
    
    // Verificar que hay elementos básicos
    await expect(page.locator('rect')).toBeVisible();
    
    console.log('✅ Canvas BPMN está funcionando correctamente');
    
    await page.screenshot({ 
      path: 'tests/e2e-playwright/screenshots/canvas-listo.png'
    });
  });
});
