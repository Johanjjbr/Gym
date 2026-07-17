import { test, expect } from '@playwright/test';

test.describe('Rutinas', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\//, { timeout: 10000 });
  });

  test('should show routines list', async ({ page }) => {
    await page.goto('/rutinas');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Rutinas')).toBeVisible();
  });

  test('should have create routine button', async ({ page }) => {
    await page.goto('/rutinas');
    await page.waitForLoadState('networkidle');

    const createBtn = page.getByRole('button', { name: /nueva rutina|crear/i });
    await expect(createBtn.first()).toBeVisible({ timeout: 5000 });
  });

  test('should navigate to routine builder', async ({ page }) => {
    await page.goto('/rutinas');

    const createBtn = page.getByRole('button', { name: /nueva rutina|crear/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForURL(/\/rutinas\/crear/, { timeout: 5000 });
    }
  });
});
