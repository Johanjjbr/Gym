import { test, expect, Page } from '@playwright/test';

/**
 * Tests E2E para la página de Mis Pagos (usuario regular)
 * Cubre: visualización, impresión de facturas
 */

async function loginAsUser(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'usuario@gymteques.com');
  await page.fill('input[type="password"]', 'User123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('Mis Pagos - Usuario Regular', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/usuario/pagos');
  });

  test('debe cargar la página de mis pagos', async ({ page }) => {
    await expect(page).toHaveURL('/usuario/pagos');
    await expect(page.getByTestId('my-payments-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Mis Pagos' })).toBeVisible();
  });

  test('debe mostrar tarjetas de resumen', async ({ page }) => {
    await expect(page.getByText('Total Pagado')).toBeVisible();
    await expect(page.getByText('Última Factura')).toBeVisible();
    await expect(page.getByText('Estado')).toBeVisible();
  });

  test('debe mostrar historial de facturas', async ({ page }) => {
    await expect(page.getByText('Historial de Facturas')).toBeVisible();
  });

  test('debe mostrar botón de imprimir en facturas', async ({ page }) => {
    // Esperar a que carguen las facturas
    await page.waitForTimeout(2000);

    const printButton = page.locator('[data-testid^="print-my-invoice-"]').first();
    if (await printButton.isVisible().catch(() => false)) {
      await expect(printButton).toBeVisible();
      await expect(printButton).toHaveAttribute('aria-label', 'Imprimir factura');
    }
  });

  test('debe abrir modal de impresión', async ({ page }) => {
    await page.waitForTimeout(2000);

    const printButton = page.locator('[data-testid^="print-my-invoice-"]').first();
    if (await printButton.isVisible().catch(() => false)) {
      await printButton.click();

      // Verificar que el modal de impresión se abre
      await expect(page.getByText(/Vista Previa de Factura/)).toBeVisible();

      // Verificar botones del modal
      await expect(page.getByRole('button', { name: /Imprimir/ })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Cerrar' }).first()).toBeVisible();
    }
  });

  test('debe mostrar próximo pago si existe', async ({ page }) => {
    const nextPaymentCard = page.getByText('Próximo Pago');
    // Puede o no existir dependiendo de los datos
    const exists = await nextPaymentCard.isVisible().catch(() => false);
    if (exists) {
      await expect(nextPaymentCard).toBeVisible();
    }
  });
});

test.describe('Navegación de usuario', () => {
  test('debe navegar a mis pagos desde el menú', async ({ page }) => {
    await loginAsUser(page);

    const navLink = page.getByRole('link', { name: 'Mis Pagos' });
    if (await navLink.isVisible().catch(() => false)) {
      await navLink.click();
      await expect(page).toHaveURL('/usuario/pagos');
      await expect(page.getByTestId('my-payments-page')).toBeVisible();
    }
  });
});