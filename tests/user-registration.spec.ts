import { test, expect } from '@playwright/test';

const TEST_PREFIX = `Test_${Date.now()}`;
const TEST_EMAIL = `${TEST_PREFIX}@test.com`;
const TEST_CEDULA = `V-${String(Date.now()).slice(-8)}`;

test.describe('Registro de Usuario', () => {
  test.beforeAll(async ({ request }) => {
    const res = await request.post('http://localhost:5173/server/auth/login', {
      data: { email: 'admin@gymteques.com', password: 'Admin123!' },
    });
    const body = await res.json();
    test('token_global', { annotation: { type: 'token', description: body.session?.access_token } });
  });

  test('login as admin and navigate to users', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });
    await expect(page.getByText('Dashboard')).toBeVisible();
  });

  test('create user with weight and height', async ({ page }) => {
    await page.goto('/login');
    await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
    await page.getByPlaceholder('••••••••').fill('Admin123!');
    await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
    await page.waitForURL(/\/dashboard/, { timeout: 10000 });

    await page.goto('/usuarios');
    await page.waitForLoadState('networkidle');

    await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
    await expect(page.getByText('Nuevo Usuario').first()).toBeVisible({ timeout: 5000 });

    await page.getByLabel('Cédula').fill(TEST_CEDULA);
    await page.getByLabel('Nombre Completo').fill(`Test User ${TEST_PREFIX}`);
    await page.getByLabel('Email').fill(TEST_EMAIL);
    await page.getByLabel('Teléfono').fill('04121234567');

    const planSelect = page.locator('select').filter({ has: page.locator('option[value=""]') }).first();
    const planOptions = await planSelect.locator('option').all();
    if (planOptions.length > 1) {
      const value = await planOptions[1].getAttribute('value');
      if (value) await planSelect.selectOption(value);
    }

    await page.getByLabel('Peso (kg)').fill('78.5');
    await page.getByLabel('Altura (cm)').fill('178');

    await page.getByRole('button', { name: 'Crear Usuario' }).click();

    const activationModal = page.getByText('Token de Activación');
    await expect(activationModal).toBeVisible({ timeout: 10000 });
  });

  test('verify user weight and height in user list', async ({ page, request }) => {
    // Verify via API that the user was created with correct weight/height
    const loginRes = await request.post('http://localhost:5173/server/auth/login', {
      data: { email: 'admin@gymteques.com', password: 'Admin123!' },
    });
    const loginBody = await loginRes.json();
    const token = loginBody.session?.access_token;

    const res = await request.get(`http://localhost:5173/server/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await res.json();
    const testUser = users.find((u: any) => u.email === TEST_EMAIL);

    expect(testUser).toBeTruthy();
    expect(Number(testUser.weight)).toBe(78.5);
    expect(Number(testUser.height)).toBe(178);
  });

  test.afterAll(async ({ request }) => {
    // Clean up: Delete the test user
    const loginRes = await request.post('http://localhost:5173/server/auth/login', {
      data: { email: 'admin@gymteques.com', password: 'Admin123!' },
    });
    const loginBody = await loginRes.json();
    const token = loginBody.session?.access_token;

    const res = await request.get(`http://localhost:5173/server/users`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const users = await res.json();
    const testUser = users.find((u: any) => u.email === TEST_EMAIL);

    if (testUser) {
      await request.delete(`http://localhost:5173/server/users/${testUser.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
    }
  });
});
