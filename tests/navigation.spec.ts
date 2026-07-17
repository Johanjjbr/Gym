import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should redirect unauthenticated user to login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL('/login');
  });

  test('should show login page when accessing protected route', async ({ page }) => {
    await page.goto('/usuarios');
    await expect(page).toHaveURL('/login');
  });

  test('should show register form fields', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Registrarse').click();

    await expect(page.getByLabel('Nombre Completo')).toBeVisible();
    await expect(page.getByLabel('Cédula')).toBeVisible();
    await expect(page.getByLabel('Correo Electrónico')).toBeVisible();
    await expect(page.getByLabel('Contraseña').first()).toBeVisible();
    await expect(page.getByLabel('Confirmar Contraseña')).toBeVisible();
    await expect(page.getByLabel('Teléfono (opcional)')).toBeVisible();
  });

  test('should validate required fields on register', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Registrarse').click();
    await page.locator('form').getByRole('button', { name: 'Registrarse' }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should validate password match on register', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Registrarse').click();

    await page.getByLabel('Contraseña').first().fill('password123');
    await page.getByLabel('Confirmar Contraseña').fill('differentpass');
    await page.locator('form').getByRole('button', { name: 'Registrarse' }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });
});
