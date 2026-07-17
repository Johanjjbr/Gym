import { test, expect } from '@playwright/test';

test.describe('Asistencia', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\//, { timeout: 10000 });
  });

  test('should show attendance page', async ({ page }) => {
    await page.goto('/asistencia');
    await page.waitForLoadState('networkidle');
    await expect(page.getByText('Asistencia')).toBeVisible();
  });

  test('should have attendance registration form', async ({ page }) => {
    await page.goto('/asistencia');
    await page.waitForLoadState('networkidle');

    const hasForm = await page.getByPlaceholder(/usuario|nombre|cédula/i).first().isVisible().catch(() => false);
    const hasRegisterBtn = await page.getByRole('button', { name: /registrar|entrada|marcar/i }).first().isVisible().catch(() => false);

    expect(hasForm || hasRegisterBtn).toBe(true);
  });
});
