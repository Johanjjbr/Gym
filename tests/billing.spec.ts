import { test, expect, Page } from '@playwright/test';

/**
 * Tests E2E de Facturación (estructura nueva):
 * indicadores, vistas Facturas / Socios con deuda, filtros y flujo único "Cobrar".
 * Los tests de cobro NO confirman el pago (no escriben en la base).
 */

async function loginAsStaff(page: Page) {
  await page.goto('/login');
  await page.fill('input[type="email"]', process.env.E2E_EMAIL ?? 'admin@gymteques.com');
  await page.fill('input[type="password"]', process.env.E2E_PASSWORD ?? 'Admin123!');
  await page.click('button[type="submit"]');
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 10000 });
}

test.describe('Facturación', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/facturacion');
    await expect(page.getByTestId('billing-page')).toBeVisible();
  });

  test('muestra cabecera, indicadores y la acción principal', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Facturación' })).toBeVisible();
    await expect(page.getByTestId('billing-kpis')).toContainText('Cobrado este mes');
    await expect(page.getByTestId('billing-kpis')).toContainText('Por cobrar');
    await expect(page.getByTestId('btn-cobrar')).toBeVisible();
  });

  test('cambia entre Facturas y Socios con deuda (y lo refleja en la URL)', async ({ page }) => {
    await expect(page.getByTestId('tab-facturas')).toHaveAttribute('aria-selected', 'true');
    await page.getByTestId('tab-deudores').click();
    await expect(page.getByTestId('tab-deudores')).toHaveAttribute('aria-selected', 'true');
    await expect(page).toHaveURL(/vista=deudores/);
    await page.getByTestId('tab-facturas').click();
    await expect(page).not.toHaveURL(/vista=deudores/);
  });

  test('la vista Por vencer lista a quienes vencen en 3 días con botón para avisar', async ({ page }) => {
    await page.getByTestId('tab-por-vencer').click();
    await expect(page).toHaveURL(/vista=por-vencer/);
    const row = page.getByTestId('renewal-row').first();
    if (await row.isVisible().catch(() => false)) {
      await expect(row.getByRole('link', { name: /Avisar/ }).or(row.getByRole('button', { name: /Copiar aviso/ }))).toBeVisible();
    } else {
      await expect(page.getByText(/Nadie vence en los próximos 3 días/)).toBeVisible();
    }
  });

  test('los indicadores no cambian al filtrar', async ({ page }) => {
    const kpis = page.getByTestId('billing-kpis');
    const before = await kpis.innerText();
    await page.getByTestId('filter-Pagada').click();
    await expect(page.getByTestId('filter-Pagada')).toHaveAttribute('aria-pressed', 'true');
    expect(await kpis.innerText()).toBe(before);
  });

  test('la búsqueda muestra el contador de resultados', async ({ page }) => {
    await page.getByTestId('search-invoices').fill('zzzz-no-existe');
    await expect(page.getByText(/Mostrando 0 de \d+ facturas/)).toBeVisible();
    await page.getByText('Limpiar filtros').click();
    await expect(page.getByTestId('search-invoices')).toHaveValue('');
  });

  test('el menú de una factura permite imprimir', async ({ page }) => {
    const menu = page.locator('[data-testid^="menu-"]').first();
    test.skip(!(await menu.isVisible().catch(() => false)), 'No hay facturas');
    await menu.click();
    await page.locator('[data-testid^="print-"]').first().click();
    await expect(page.getByText(/Vista Previa de Factura/)).toBeVisible();
  });
});

test.describe('Cobrar', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsStaff(page);
    await page.goto('/facturacion');
  });

  test('sin socio elegido no se puede confirmar', async ({ page }) => {
    await page.getByTestId('btn-cobrar').click();
    await expect(page.getByTestId('collect-dialog')).toBeVisible();
    await expect(page.getByTestId('search-member')).toBeFocused();
    await expect(page.getByTestId('btn-confirm-collect')).toBeDisabled();
  });

  test('al elegir un socio muestra la vista previa y el total', async ({ page }) => {
    await page.getByTestId('btn-cobrar').click();
    await page.getByTestId('search-member').press('Enter'); // primer resultado (los que deben van primero)
    const blocked = page.getByRole('alert');
    if (await blocked.isVisible().catch(() => false)) return; // exento o sin plan: no hay vista previa
    await expect(page.getByTestId('payment-preview')).toBeVisible();
    await expect(page.getByTestId('payment-total')).toContainText('Bs');
    await expect(page.getByTestId('btn-confirm-collect')).toBeEnabled();
  });

  test('sumar períodos actualiza la vista previa', async ({ page }) => {
    await page.getByTestId('btn-cobrar').click();
    await page.getByTestId('search-member').press('Enter');
    test.skip(!(await page.getByTestId('payment-preview').isVisible().catch(() => false)), 'Socio sin plan cobrable');
    const rows = page.getByTestId('payment-preview').locator('li');
    const n = await rows.count();
    await page.getByRole('button', { name: 'Más' }).click();
    await expect(rows).toHaveCount(n + 1);
    await expect(page.getByTestId('periods-count')).toHaveText(String(n + 1));
  });

  test('desde Socios con deuda abre el cobro con el socio elegido', async ({ page }) => {
    await page.getByTestId('tab-deudores').click();
    const row = page.getByTestId('debtor-row').first();
    test.skip(!(await row.isVisible().catch(() => false)), 'Nadie tiene deuda');
    await row.getByRole('button', { name: 'Cobrar' }).click();
    await expect(page.getByTestId('selected-member')).toBeVisible();
  });

  test('no permite fecha de pago futura', async ({ page }) => {
    await page.getByTestId('btn-cobrar').click();
    await page.getByTestId('search-member').press('Enter');
    const date = page.getByTestId('input-paid-on');
    test.skip(!(await date.isVisible().catch(() => false)), 'Socio sin plan cobrable');
    const max = await date.getAttribute('max');
    expect(max).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
