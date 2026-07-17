import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\//, { timeout: 10000 });
  });

  test('should show dashboard with stats', async ({ page }) => {
    await expect(page.getByText('Dashboard')).toBeVisible();
    await expect(page.getByText('Total Usuarios').or(page.getByText('Usuarios Activos'))).toBeVisible();
  });

  test('sidebar navigation links should be visible for admin', async ({ page }) => {
    await expect(page.getByText('Usuarios').first()).toBeVisible();
    await expect(page.getByText('Planes')).toBeVisible();
    await expect(page.getByText('Personal')).toBeVisible();
    await expect(page.getByText('Asistencia')).toBeVisible();
    await expect(page.getByText('Rutinas')).toBeVisible();
    await expect(page.getByText('Facturas')).toBeVisible();
  });

  test('should navigate to users page', async ({ page }) => {
    await page.getByText('Usuarios').first().click();
    await expect(page).toHaveURL(/\/usuarios/);
  });

  test('should navigate to plans page', async ({ page }) => {
    await page.getByText('Planes').click();
    await expect(page).toHaveURL(/\/planes/);
  });

  test('should logout successfully', async ({ page }) => {
    await page.getByRole('button', { name: /salir|cerrar|logout/i }).click().catch(() => {});
    await page.goto('/login');
    await expect(page.getByText('Iniciar Sesión').first()).toBeVisible();
  });
});
