# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: user-registration.spec.ts >> Registro de Usuario >> create user with weight and height
- Location: tests\user-registration.spec.ts:25:3

# Error details

```
SyntaxError: Unexpected end of JSON input
```

```
SyntaxError: Unexpected end of JSON input
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | const TEST_PREFIX = `Test_${Date.now()}`;
  4  | const TEST_EMAIL = `${TEST_PREFIX}@test.com`;
  5  | const TEST_CEDULA = `V-${String(Date.now()).slice(-8)}`;
  6  | 
  7  | test.describe('Registro de Usuario', () => {
  8  |   test.beforeAll(async ({ request }) => {
  9  |     const res = await request.post('http://localhost:5173/server/auth/login', {
  10 |       data: { email: 'admin@gymteques.com', password: 'Admin123!' },
  11 |     });
  12 |     const body = await res.json();
  13 |     test('token_global', { annotation: { type: 'token', description: body.session?.access_token } });
  14 |   });
  15 | 
  16 |   test('login as admin and navigate to users', async ({ page }) => {
  17 |     await page.goto('/login');
  18 |     await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
  19 |     await page.getByPlaceholder('••••••••').fill('Admin123!');
  20 |     await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
  21 |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  22 |     await expect(page.getByText('Dashboard')).toBeVisible();
  23 |   });
  24 | 
  25 |   test('create user with weight and height', async ({ page }) => {
  26 |     await page.goto('/login');
  27 |     await page.getByPlaceholder('usuario@gymteques.com').fill('admin@gymteques.com');
  28 |     await page.getByPlaceholder('••••••••').fill('Admin123!');
  29 |     await page.locator('form').getByRole('button', { name: 'Iniciar Sesión' }).click();
  30 |     await page.waitForURL(/\/dashboard/, { timeout: 10000 });
  31 | 
  32 |     await page.goto('/usuarios');
  33 |     await page.waitForLoadState('networkidle');
  34 | 
  35 |     await page.getByRole('button', { name: 'Nuevo Usuario' }).click();
  36 |     await expect(page.getByText('Nuevo Usuario').first()).toBeVisible({ timeout: 5000 });
  37 | 
  38 |     await page.getByLabel('Cédula').fill(TEST_CEDULA);
  39 |     await page.getByLabel('Nombre Completo').fill(`Test User ${TEST_PREFIX}`);
  40 |     await page.getByLabel('Email').fill(TEST_EMAIL);
  41 |     await page.getByLabel('Teléfono').fill('04121234567');
  42 | 
  43 |     const planSelect = page.locator('select').filter({ has: page.locator('option[value=""]') }).first();
  44 |     const planOptions = await planSelect.locator('option').all();
  45 |     if (planOptions.length > 1) {
  46 |       const value = await planOptions[1].getAttribute('value');
  47 |       if (value) await planSelect.selectOption(value);
  48 |     }
  49 | 
  50 |     await page.getByLabel('Peso (kg)').fill('78.5');
  51 |     await page.getByLabel('Altura (cm)').fill('178');
  52 | 
  53 |     await page.getByRole('button', { name: 'Crear Usuario' }).click();
  54 | 
  55 |     const activationModal = page.getByText('Token de Activación');
  56 |     await expect(activationModal).toBeVisible({ timeout: 10000 });
  57 |   });
  58 | 
  59 |   test('verify user weight and height in user list', async ({ page, request }) => {
  60 |     // Verify via API that the user was created with correct weight/height
  61 |     const loginRes = await request.post('http://localhost:5173/server/auth/login', {
  62 |       data: { email: 'admin@gymteques.com', password: 'Admin123!' },
  63 |     });
  64 |     const loginBody = await loginRes.json();
  65 |     const token = loginBody.session?.access_token;
  66 | 
  67 |     const res = await request.get(`http://localhost:5173/server/users`, {
  68 |       headers: { Authorization: `Bearer ${token}` },
  69 |     });
  70 |     const users = await res.json();
  71 |     const testUser = users.find((u: any) => u.email === TEST_EMAIL);
  72 | 
  73 |     expect(testUser).toBeTruthy();
  74 |     expect(Number(testUser.weight)).toBe(78.5);
  75 |     expect(Number(testUser.height)).toBe(178);
  76 |   });
  77 | 
  78 |   test.afterAll(async ({ request }) => {
  79 |     // Clean up: Delete the test user
  80 |     const loginRes = await request.post('http://localhost:5173/server/auth/login', {
  81 |       data: { email: 'admin@gymteques.com', password: 'Admin123!' },
  82 |     });
> 83 |     const loginBody = await loginRes.json();
     |                       ^ SyntaxError: Unexpected end of JSON input
  84 |     const token = loginBody.session?.access_token;
  85 | 
  86 |     const res = await request.get(`http://localhost:5173/server/users`, {
  87 |       headers: { Authorization: `Bearer ${token}` },
  88 |     });
  89 |     const users = await res.json();
  90 |     const testUser = users.find((u: any) => u.email === TEST_EMAIL);
  91 | 
  92 |     if (testUser) {
  93 |       await request.delete(`http://localhost:5173/server/users/${testUser.id}`, {
  94 |         headers: { Authorization: `Bearer ${token}` },
  95 |       });
  96 |     }
  97 |   });
  98 | });
  99 | 
```