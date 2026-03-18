// LOW WEI SHENG, A0259272X
// tests/e2e/user-orders.spec.ts
// LOW WEI SHENG, A0259272X
// E2E tests for user order history viewing flow.
import { test, expect } from '@playwright/test';
import {
  connectTestDB, disconnectTestDB, clearTestCollections,
  seedUser, seedProduct, seedOrder,
} from '../helpers/e2eDb.js';

test.describe('User order history', () => {
  const userPassword = 'userpass123';
  let userEmail: string;

  test.beforeAll(async () => {
    await connectTestDB();
    await clearTestCollections();

    const { user } = await seedUser({ email: 'orders-user@e2e.test', plainPassword: userPassword });
    userEmail = user.email;
    const { user: otherUser } = await seedUser({ email: 'other-user@e2e.test' });

    const product1 = await seedProduct({ name: 'Order Product Alpha', price: 12.50 });
    const product2 = await seedProduct({ name: 'Order Product Beta', price: 34.99 });

    const oneDayAgo = new Date(Date.now() - 86_400_000);

    // User's orders: one paid, one unpaid
    await seedOrder({
      buyer: user._id,
      products: [product1._id],
      payment: { success: true },
      status: 'Not Process',
      createAt: oneDayAgo,
    });
    await seedOrder({
      buyer: user._id,
      products: [product2._id],
      payment: { success: false },
      status: 'Processing',
      createAt: oneDayAgo,
    });

    // Other user's order — must NOT appear for our test user
    await seedOrder({
      buyer: otherUser._id,
      products: [product1._id],
      payment: { success: true },
    });
  });

  test.afterAll(async () => {
    await clearTestCollections();
    await disconnectTestDB();
  });

  async function loginAsUser(page) {
    await page.goto('/login');
    await page.fill('input[type="email"]', userEmail);
    await page.fill('input[type="password"]', userPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
  }

  test('user navigates to Orders via UserMenu and sees their orders', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user');
    await page.getByRole('link', { name: /orders/i }).click();
    await expect(page).toHaveURL(/orders/);
    // Both of the user's orders are visible
    await expect(page.getByText('Not Process')).toBeVisible();
    await expect(page.getByText('Processing')).toBeVisible();
  });

  test('user sees exactly their own orders — other user orders are absent', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    const orderRows = page.locator('tbody tr');
    await expect(orderRows).toHaveCount(2);
  });

  test('payment success shows "Success"', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Success')).toBeVisible();
  });

  test('payment failure shows "Failed"', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Failed')).toBeVisible();
  });

  test('product name and price are visible in order card', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Order Product Alpha')).toBeVisible();
    await expect(page.getByText(/12\.50|12\.5/)).toBeVisible();
  });

  test('relative date contains "day" for orders seeded 1 day ago', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    // moment("1 day ago") renders text containing "day"
    const dateTexts = await page.locator('text=/day/').allTextContents();
    expect(dateTexts.length).toBeGreaterThan(0);
  });

  test('user with no orders sees empty state without crash', async ({ page }) => {
    const { user: emptyUser } = await seedUser({ email: 'empty@e2e.test', plainPassword: 'pass123' });
    await page.goto('/login');
    await page.fill('input[type="email"]', 'empty@e2e.test');
    await page.fill('input[type="password"]', 'pass123');
    await page.click('button[type="submit"]');
    await page.waitForURL(/dashboard/);
    await page.goto('/dashboard/user/orders');
    // No crash — page renders
    await expect(page.locator('body')).toBeVisible();
    // No order rows
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(0);
  });

  test('Dashboard page has UserMenu with a working Orders link', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user');
    const ordersLink = page.getByRole('link', { name: /orders/i });
    await expect(ordersLink).toBeVisible();
    await ordersLink.click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders/);
  });

  test('Authorization header is sent with the orders request', async ({ page }) => {
    let authHeader: string | null = null;
    await page.route('**/api/v1/auth/orders', route => {
      authHeader = route.request().headers()['authorization'] ?? null;
      route.continue();
    });
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await page.waitForResponse(r => r.url().includes('/api/v1/auth/orders'));
    expect(authHeader).toBeTruthy();
  });
});
