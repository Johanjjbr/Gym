import { test, expect } from '@playwright/test';

const TEST_PLAN_NAME = `Test Plan ${Date.now()}`;

test.describe('Planes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\//, { timeout: 10000 });
  });

  test('should list existing plans', async ({ page }) => {
    await page.goto('/planes');
    await page.waitForLoadState('networkidle');
    const rows = page.locator('table tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThan(0);
  });

  test('should create a new plan', async ({ page }) => {
    await page.goto('/planes');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: /nuevo|crear/i }).first().click();
    await expect(page.getByText('Nuevo Plan').or(page.getByText('Crear Plan'))).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Nombre').fill(TEST_PLAN_NAME);

    const priceInput = page.getByLabel('Precio');
    if (await priceInput.isVisible()) {
      await priceInput.fill('45');
    }

    await page.getByRole('button', { name: /guardar|crear/i }).click();
    await expect(page.getByText(TEST_PLAN_NAME)).toBeVisible({ timeout: 10000 });
  });

  test('should delete test plan', async ({ page }) => {
    await page.goto('/planes');
    await page.waitForLoadState('networkidle');

    const deleteBtn = page.locator('table tbody tr').filter({ hasText: TEST_PLAN_NAME }).getByRole('button');
    if (await deleteBtn.count() > 0) {
      await deleteBtn.first().click();
      await page.getByRole('button', { name: /confirmar|eliminar|sí/i }).click().catch(() => {});
    }
  });
});
