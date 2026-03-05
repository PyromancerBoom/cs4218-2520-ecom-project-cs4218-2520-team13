// tests/e2e/route-guards.spec.ts
// Wei Sheng, A0259272X
// E2E tests for protected and admin route access control.
import { test, expect } from '@playwright/test';
import {
  connectTestDB, disconnectTestDB, clearTestCollections,
  seedUser, seedAdmin,
} from '../helpers/e2eDb.js';

test.describe('Route access control', () => {
  let regularEmail: string;
  let adminEmail: string;
  const password = 'testpass123';

  test.beforeAll(async () => {
    await connectTestDB();
    await clearTestCollections();
    const { user } = await seedUser({ email: 'regular@guard.test', plainPassword: password });
    const { user: admin } = await seedAdmin({ email: 'admin@guard.test', plainPassword: password });
    regularEmail = user.email;
    adminEmail = admin.email;
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  async function login(page, email: string) {
    await page.goto('/login');
    await page.fill('input[type="email"]', email);
    await page.fill('input[type="password"]', password);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  }

  async function logout(page) {
    // Click logout button — adjust selector to match actual UI
    await page.getByRole('button', { name: /logout/i }).click();
    await expect(page).toHaveURL(/\//);
  }

  test('unauthenticated user navigating to /dashboard/user is redirected to /login', async ({ page }) => {
    await page.goto('/dashboard/user');
    await expect(page).toHaveURL('/');  // Spinner redirects to "/" (path="" = login page)
  });

  test('unauthenticated user navigating to /dashboard/admin is redirected', async ({ page }) => {
    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/dashboard\/admin/);
  });

  test('regular user navigating to /dashboard/admin is redirected', async ({ page }) => {
    await login(page, regularEmail);
    await page.goto('/dashboard/admin');
    await expect(page).not.toHaveURL(/\/dashboard\/admin/);
  });

  test('regular user can access /dashboard/user', async ({ page }) => {
    await login(page, regularEmail);
    await page.goto('/dashboard/user');
    await expect(page).toHaveURL(/\/dashboard\/user/);
    // UserMenu should be visible — confirms protected content rendered
    await expect(page.getByRole('link', { name: /profile/i })).toBeVisible();
  });

  test('admin can access /dashboard/admin', async ({ page }) => {
    await login(page, adminEmail);
    await page.goto('/dashboard/admin');
    await expect(page).toHaveURL(/\/dashboard\/admin/);
    // Admin dashboard content is visible
    await expect(page.getByText(/admin/i).first()).toBeVisible();
  });

  test('after logout, navigating to /dashboard/user redirects to login', async ({ page }) => {
    await login(page, regularEmail);
    await page.goto('/dashboard/user');
    await expect(page).toHaveURL(/\/dashboard\/user/);
    await logout(page);
    await page.goto('/dashboard/user');
    await expect(page).toHaveURL('/');
  });

  test('invalid token in localStorage causes redirect from /dashboard/user', async ({ page }) => {
    // Inject a bad token directly — simulates an expired or tampered JWT
    await page.goto('/');
    await page.evaluate(() =>
      localStorage.setItem('auth', JSON.stringify({ user: { name: 'ghost' }, token: 'bad.token.here' }))
    );
    await page.goto('/dashboard/user');
    await expect(page).toHaveURL('/');
  });

  test('/admin-auth endpoint returns { ok: false } for non-admin token', async ({ page }) => {
    let adminAuthResponse: any = null;
    await page.route('**/api/v1/auth/admin-auth', async route => {
      const response = await route.fetch();
      adminAuthResponse = await response.json();
      route.fulfill({ response });
    });
    await login(page, regularEmail);
    await page.goto('/dashboard/admin');
    await page.waitForResponse(r => r.url().includes('/admin-auth'));
    expect(adminAuthResponse?.ok).toBeFalsy();
  });
});
