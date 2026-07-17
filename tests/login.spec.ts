import { test, expect } from '@playwright/test';

test.describe('Login', () => {
  test('should show login page', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText('Gimnasio Los Teques')).toBeVisible();
    await expect(page.getByText('Iniciar Sesión').first()).toBeVisible();
    await expect(page.getByText('Registrarse').first()).toBeVisible();
    await expect(page.getByPlaceholder('usuario@gymteques.com')).toBeVisible();
    await expect(page.getByPlaceholder('••••••••')).toBeVisible();
  });

  test('should switch between login and register modes', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Registrarse').click();
    await expect(page.getByText('Nombre Completo')).toBeVisible();
    await expect(page.getByText('Cédula')).toBeVisible();

    await page.getByText('Iniciar Sesión').click();
    await expect(page.getByText('Nombre Completo')).not.toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('invalid@test.com');
    await page.getByPlaceholder('••••••••').fill('wrongpassword');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();

    await expect(page.locator('[role="alert"]')).toBeVisible();
  });

  test('should show test credentials on toggle', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Mostrar credenciales').click();
    await expect(page.getByText('Usuario Regular')).toBeVisible();
    await expect(page.getByText('Administrador')).toBeVisible();
    await expect(page.getByText('Entrenador')).toBeVisible();
    await expect(page.getByText('Recepción')).toBeVisible();
  });

  test('should fill credentials when clicking test user', async ({ page }) => {
    await page.goto('/login');
    await page.getByText('Mostrar credenciales').click();
    await page.getByText('Usuario Regular').click();

    const emailInput = page.getByPlaceholder('usuario@gymteques.com');
    await expect(emailInput).toHaveValue('usuario@gymteques.com');
  });
});
