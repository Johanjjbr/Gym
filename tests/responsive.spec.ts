import { test, expect } from '@playwright/test';

test.describe('Responsive Design', () => {
  test('login page should be usable on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');

    await expect(page.getByText('Gimnasio Los Teques')).toBeVisible();
    await expect(page.getByPlaceholder('usuario@gymteques.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
    await page.getByText('Registrarse').click();
    await expect(page.getByLabel('Nombre Completo')).toBeVisible();
  });

  test('register form should scroll properly on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/login');
    await page.getByText('Registrarse').click();

    await page.getByLabel('Nombre Completo').fill('Test User');
    await page.getByLabel('Cédula').fill('V-12345678');
    await page.getByLabel('Contraseña').first().fill('password123');
    await page.getByLabel('Confirmar Contraseña').fill('password123');

    await expect(page.locator('form').getByRole('button', { name: 'Registrarse' })).toBeVisible();
  });

  test('login page layout adapts to tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/login');

    const card = page.locator('.w-full.max-w-md');
    await expect(card).toBeVisible();
  });
});
