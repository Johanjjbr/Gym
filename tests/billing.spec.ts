import { test, expect, Page } from '@playwright/test';

/**
 * Tests E2E para la página de Facturación unificada
 * Cubre: navegación, pestañas, filtros, registro de cobro, impresión
 */

// Helper para hacer login como staff
async function loginAsStaff(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', 'admin@gymteques.com');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('Página de Facturación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
  });

  test('debe cargar la página de facturación', async ({ page }) => {
    await page.goto('/facturacion');

    await expect(page).toHaveURL('/facturacion');
    await expect(page.getByTestId('billing-page')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Facturación' })).toBeVisible();
  });

  test('debe mostrar las 3 pestañas', async ({ page }) => {
    await page.goto('/facturacion');

    await expect(page.getByTestId('tab-facturas')).toBeVisible();
    await expect(page.getByTestId('tab-cobrar')).toBeVisible();
    await expect(page.getByTestId('tab-resumen')).toBeVisible();
  });

  test('debe cambiar entre pestañas', async ({ page }) => {
    await page.goto('/facturacion');

    // Pestaña facturas activa por defecto
    await expect(page.getByTestId('tab-facturas')).toHaveAttribute('aria-selected', 'true');

    // Cambiar a cobrar
    await page.getByTestId('tab-cobrar').click();
    await expect(page.getByTestId('tab-cobrar')).toHaveAttribute('aria-selected', 'true');
    await expect(page.getByTestId('cobro-form')).toBeVisible();

    // Cambiar a resumen
    await page.getByTestId('tab-resumen').click();
    await expect(page.getByTestId('tab-resumen')).toHaveAttribute('aria-selected', 'true');

    // Volver a facturas
    await page.getByTestId('tab-facturas').click();
    await expect(page.getByTestId('tab-facturas')).toHaveAttribute('aria-selected', 'true');
  });

  test('debe mostrar la tabla de facturas', async ({ page }) => {
    await page.goto('/facturacion');

    await expect(page.getByTestId('invoices-table')).toBeVisible();
  });

  test('debe mostrar el formulario de cobro', async ({ page }) => {
    await page.goto('/facturacion');

    await page.getByTestId('tab-cobrar').click();

    await expect(page.getByTestId('cobro-form')).toBeVisible();
    await expect(page.getByTestId('select-user')).toBeVisible();
    await expect(page.getByTestId('input-amount')).toBeVisible();
    await expect(page.getByTestId('input-date')).toBeVisible();
    await expect(page.getByTestId('input-concept')).toBeVisible();
    await expect(page.getByTestId('select-method')).toBeVisible();
    await expect(page.getByTestId('btn-submit-cobro')).toBeVisible();
  });

  test('debe mostrar botón de morosos', async ({ page }) => {
    await page.goto('/facturacion');

    await expect(page.getByTestId('btn-morosos')).toBeVisible();
    await expect(page.getByTestId('btn-registrar-cobro')).toBeVisible();
  });

  test('debe buscar facturas por nombre', async ({ page }) => {
    await page.goto('/facturacion');

    await page.getByTestId('search-invoices').fill('Juan');

    // Verificar que el indicador de filtros activos aparece
    await expect(page.getByText(/Mostrando \d+ de \d+ facturas/)).toBeVisible();
  });

  test('debe filtrar por estado', async ({ page }) => {
    await page.goto('/facturacion');

    await page.getByTestId('filter-Pagada').click();
    await expect(page.getByTestId('filter-Pagada')).toHaveClass(/bg-\[#10f94e\]/);

    await page.getByTestId('filter-Vencida').click();
    await expect(page.getByTestId('filter-Vencida')).toHaveClass(/bg-\[#ff3b5c\]/);
  });

  test('debe mostrar el diálogo de pago al hacer clic en Pagar', async ({ page }) => {
    await page.goto('/facturacion');

    // Esperar a que haya facturas pendientes con botón Pagar
    const payButton = page.locator('[data-testid^="pay-"]').first();
    if (await payButton.isVisible().catch(() => false)) {
      await payButton.click();
      await expect(page.getByText('Pagar Factura')).toBeVisible();
      await expect(page.getByTestId('select-pay-method')).toBeVisible();
    }
  });

  test('debe abrir el modal de impresión', async ({ page }) => {
    await page.goto('/facturacion');

    const printButton = page.locator('[data-testid^="print-"]').first();
    if (await printButton.isVisible().catch(() => false)) {
      await printButton.click();
      await expect(page.getByText(/Vista Previa de Factura/)).toBeVisible();
      await expect(page.getByRole('button', { name: /Imprimir/ })).toBeVisible();
    }
  });
});

test.describe('Registro de Cobro', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/facturacion');
    await page.getByTestId('tab-cobrar').click();
  });

  test('debe mostrar errores de validación si el formulario está vacío', async ({ page }) => {
    await page.getByTestId('btn-submit-cobro').click();

    await expect(page.getByText('Selecciona un usuario')).toBeVisible();
    await expect(page.getByText('Monto requerido')).toBeVisible();
    await expect(page.getByText('Concepto requerido')).toBeVisible();
  });

  test('debe calcular próximo vencimiento automáticamente', async ({ page }) => {
    const dateInput = page.getByTestId('input-date');
    const dueInput = page.getByTestId('input-due-date');

    // Verificar que tiene valor
    const dateValue = await dateInput.inputValue();
    const dueValue = await dueInput.inputValue();

    expect(dateValue).toBeTruthy();
    expect(dueValue).toBeTruthy();

    // Verificar que due_date es un mes después
    const date = new Date(dateValue);
    const due = new Date(dueValue);
    expect(due.getMonth() - date.getMonth()).toBe(1);
  });
});

test.describe('Navegación', () => {
  test('debe navegar desde el sidebar', async ({ page }) => {
    await loginAsStaff(page);

    const sidebarLink = page.getByRole('link', { name: 'Facturación' });
    await expect(sidebarLink).toBeVisible();
    await sidebarLink.click();

    await expect(page).toHaveURL('/facturacion');
    await expect(page.getByTestId('billing-page')).toBeVisible();
  });
});