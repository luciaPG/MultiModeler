import { test, expect } from '@playwright/test';

test('RF-01: Crear Diagrama BPMN - Test Grabado', async ({ page }) => {
  // Navegar a la aplicación
  await page.goto('http://localhost:9000/');
  
  // Esperar a que cargue completamente
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  // Crear nuevo diagrama
  await page.getByRole('button', { name: '+ Crear Nuevo Diagrama' }).click();
  
  // Esperar a que aparezca el canvas
  await page.waitForSelector('.djs-container', { timeout: 15000 });
  await page.waitForSelector('rect', { timeout: 10000 });
  
  // Tu secuencia grabada exacta
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
  
  // Verificar que se crearon elementos
  const elements = page.locator('.djs-element.djs-shape');
  const elementCount = await elements.count();
  expect(elementCount).toBeGreaterThan(0);
  
  console.log(`✅ Test completado - Se crearon ${elementCount} elementos BPMN`);
  
  // Screenshot del resultado
  await page.screenshot({ 
    path: 'tests/e2e-playwright/screenshots/rf-01-resultado.png',
    fullPage: true 
  });
});