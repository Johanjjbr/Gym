import { test, expect } from '@playwright/test';

test.describe('Personal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\//, { timeout: 10000 });
  });

  test('should show staff page', async ({ page }) => {
    await page.goto('/personal');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText(/personal|empleados/i)).toBeVisible();
  });

  test('should have staff list table', async ({ page }) => {
    await page.goto('/personal');
    await page.waitForLoadState('networkidle');

    const table = page.locator('table');
    const hasTable = await table.isVisible().catch(() => false);
    const hasCards = await page.locator('[class*="card"]').first().isVisible().catch(() => false);

    expect(hasTable || hasCards).toBe(true);
  });
});
