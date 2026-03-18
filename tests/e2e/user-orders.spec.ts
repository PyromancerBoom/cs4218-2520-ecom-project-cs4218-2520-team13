// E2E tests for user order history viewing flow.
import { test, expect } from '@playwright/test';
import {
  connectTestDB, disconnectTestDB, clearTestCollections,
  seedUser, seedProduct, seedOrder,
} from '../helpers/e2eDb.js';

// LOW WEI SHENG, A0259272X
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
    const res = await page.request.post('http://localhost:6060/api/v1/auth/login', {
      data: { email: userEmail, password: userPassword },
    });
    const data = await res.json();
    await page.goto('/');
    await page.evaluate((auth) => localStorage.setItem('auth', JSON.stringify(auth)), data);
    await page.reload();
  }

  // LOW WEI SHENG, A0259272X
  test('user navigates to Orders via UserMenu and sees their orders', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user');
    await page.getByRole('link', { name: /orders/i }).click();
    await expect(page).toHaveURL(/orders/);
    // Both of the user's orders are visible
    await expect(page.getByText('Not Process')).toBeVisible();
    await expect(page.getByText('Processing')).toBeVisible();
  });

  // LOW WEI SHENG, A0259272X
  test('user sees exactly their own orders — other user orders are absent', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    const orderRows = page.locator('tbody tr');
    await expect(orderRows).toHaveCount(2);
  });

  // LOW WEI SHENG, A0259272X
  test('payment success shows "Success"', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Success')).toBeVisible();
  });

  // LOW WEI SHENG, A0259272X
  test('payment failure shows "Failed"', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Failed')).toBeVisible();
  });

  // LOW WEI SHENG, A0259272X
  test('product name and price are visible in order card', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    await expect(page.getByText('Order Product Alpha')).toBeVisible();
    await expect(page.getByText(/12\.50|12\.5/)).toBeVisible();
  });

  // LOW WEI SHENG, A0259272X
  test('relative date is displayed as a moment.js relative string', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user/orders');
    // Wait for orders to load before reading date text
    await expect(page.locator('tbody tr').first()).toBeVisible();
    // The date column uses moment().fromNow() — rendered text contains "ago"
    const dateTexts = await page.locator('text=/ago/').allTextContents();
    expect(dateTexts.length).toBeGreaterThan(0);
  });

  // LOW WEI SHENG, A0259272X
  test('user with no orders sees empty state without crash', async ({ page }) => {
    const { user: emptyUser } = await seedUser({ email: 'empty@e2e.test', plainPassword: 'pass123' });
    const res = await page.request.post('http://localhost:6060/api/v1/auth/login', {
      data: { email: 'empty@e2e.test', password: 'pass123' },
    });
    const data = await res.json();
    await page.goto('/');
    await page.evaluate((auth) => localStorage.setItem('auth', JSON.stringify(auth)), data);
    await page.reload();
    await page.goto('/dashboard/user/orders');
    // No crash — page renders
    await expect(page.locator('body')).toBeVisible();
    // No order rows
    const rows = page.locator('tbody tr');
    await expect(rows).toHaveCount(0);
  });

  // LOW WEI SHENG, A0259272X
  test('Dashboard page has UserMenu with a working Orders link', async ({ page }) => {
    await loginAsUser(page);
    await page.goto('/dashboard/user');
    const ordersLink = page.getByRole('link', { name: /orders/i });
    await expect(ordersLink).toBeVisible();
    await ordersLink.click();
    await expect(page).toHaveURL(/\/dashboard\/user\/orders/);
  });

  // LOW WEI SHENG, A0259272X
  test('Authorization header is sent with the orders request', async ({ page }) => {
    let authHeader: string | null = null;
    await page.route('**/api/v1/auth/orders', async route => {
      authHeader = route.request().headers()['authorization'] ?? null;
      await route.continue();
    });
    await loginAsUser(page);
    // Create the promise BEFORE goto to avoid missing a fast response
    const responsePromise = page.waitForResponse(r => r.url().includes('/api/v1/auth/orders'));
    await page.goto('/dashboard/user/orders');
    await responsePromise;
    expect(authHeader).toBeTruthy();
  });
});
